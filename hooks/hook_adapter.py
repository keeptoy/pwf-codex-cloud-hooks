#!/usr/bin/env python3
"""Read-only SessionStart/UserPromptSubmit adapter for planning-with-files."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import threading
import time
from typing import Callable

CANARY = "PWF_GLOBAL_HOOK_CANARY_V1"
EVENTS = {"SessionStart", "UserPromptSubmit"}
SESSION_SOURCES = {"startup", "resume", "clear", "compact"}
SLUG = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]*$")
SESSION_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
MAX_RUNTIME_STDOUT_BYTES = 100_000
MAX_RUNTIME_STDERR_BYTES = 100_000
MAX_RUNTIME_REQUEST_BYTES = 100_000
ADAPTER_DEADLINE_SECONDS = 27.0
CATCHUP_SECONDS = 15.0
FINALIZATION_RESERVE_SECONDS = 1.0
RUNTIME_FILES = {
    "catchup": "owned-catchup.py",
    "plan": "owned-plan.py",
}
PLAN_OUTPUT_BUDGET = {
    "max_context_chars": 20_000,
    "max_plan_lines": 50,
    "max_progress_lines": 20,
}
OUTPUT_BUDGET = {
    "max_report_chars": 20_000,
    "max_messages": 15,
    "max_tools_per_message": 4,
    "assistant_chars": 300,
    "user_untruncated_chars": 1_000,
    "user_head_chars": 350,
    "user_tail_chars": 650,
    "truncation_marker": "...[truncated]...",
}
RUNTIME_OUTCOMES = {
    "report_emitted", "diagnostic_report_available", "planning_disabled",
    "session_not_attached", "no_plan", "invalid_request", "transcript_path_rejected",
    "no_session_store", "no_matching_session", "session_identity_mismatch",
    "no_planning_update", "no_unsynced_context", "output_budget_exceeded",
    "malformed_transcript", "transcript_unreadable", "timeout", "runtime_error",
}
RUNTIME_DIAGNOSTIC_FIELDS = {
    "event_name", "session_id_present", "planning_enabled", "session_attachment",
    "selected_transcript", "selected_transcript_path", "selected_plan_scope", "selected_plan_dir",
}
RUNTIME_WARNINGS = {
    "transcript_path_rejected", "scan_fallback_used", "unknown_transcript_record",
    "duplicate_record_suppressed", "invalid_utf8_record", "invalid_json_record",
    "record_too_large", "report_truncated",
}
PLAN_OUTCOMES = {
    "context_emitted", "planning_disabled", "session_not_attached", "no_plan",
    "invalid_request", "plan_state_changed", "plan_unreadable",
    "output_budget_exceeded", "timeout", "runtime_error",
}
PLAN_WARNINGS = {
    "plan_id_rejected", "active_plan_rejected", "candidate_escape_rejected",
    "progress_unreadable", "stale_cleanup_skipped", "stale_cleanup_failed",
}
PLAN_DIAGNOSTIC_FIELDS = {
    "event_name", "plan_id_state", "selected_plan_scope", "selected_plan_dir",
}


def load_payload() -> dict:
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, OSError):
        return {}


def project_root(payload: dict) -> Path:
    candidate = payload.get("cwd")
    return Path(candidate).resolve() if isinstance(candidate, str) and candidate else Path.cwd().resolve()


def _contained(root: Path, path: Path, *, kind: str) -> Path | None:
    try:
        resolved_root = root.resolve(strict=True)
        resolved = path.resolve(strict=True)
        resolved.relative_to(resolved_root)
        if kind == "directory" and not resolved.is_dir():
            return None
        if kind == "file" and not resolved.is_file():
            return None
        return resolved
    except (OSError, RuntimeError, ValueError):
        return None


def _plan_candidate(root: Path, candidate: Path) -> Path | None:
    plan = _contained(root, candidate, kind="directory")
    if plan is None or _contained(root, plan / "task_plan.md", kind="file") is None:
        return None
    return plan


def _active_slug(active: Path) -> str:
    try:
        if active.is_symlink() or not active.is_file():
            return ""
        return "".join(active.read_text(encoding="utf-8-sig").split())
    except (OSError, UnicodeError):
        return ""


def resolve_plan(root: Path) -> Path | None:
    planning = root / ".planning"
    plan_id = os.environ.get("PLAN_ID", "")
    if SLUG.fullmatch(plan_id):
        candidate = _plan_candidate(root, planning / plan_id)
        if candidate is not None:
            return candidate
    active = planning / ".active_plan"
    slug = _active_slug(active)
    if SLUG.fullmatch(slug):
        candidate = _plan_candidate(root, planning / slug)
        if candidate is not None:
            return candidate
    try:
        entries = list(planning.iterdir()) if planning.is_dir() else []
    except OSError:
        entries = []
    scoped = []
    for entry in entries:
        if entry.name.startswith(".") or entry.name == "sessions" or not SLUG.fullmatch(entry.name):
            continue
        candidate = _plan_candidate(root, entry)
        if candidate is not None:
            scoped.append(candidate)
    if scoped:
        try:
            return max(scoped, key=lambda path: path.stat().st_mtime)
        except OSError:
            pass
    return _plan_candidate(root, root)


def session_attachment(root: Path, payload: dict) -> str:
    sessions = root / ".planning" / "sessions"
    try:
        if sessions.is_symlink() or not sessions.is_dir():
            return "legacy"
        entries = list(sessions.iterdir())
    except OSError:
        return "detached"
    markers = []
    marker_error = False
    for marker in entries:
        try:
            if not marker.name.endswith(".attached"):
                continue
            session_id = marker.name[:-len(".attached")]
            info = marker.lstat()
            if SESSION_ID.fullmatch(session_id) and stat.S_ISREG(info.st_mode) and not marker.is_symlink():
                if _contained(root, marker, kind="file") is not None:
                    markers.append(session_id)
        except OSError:
            marker_error = True
    if not markers:
        return "detached" if marker_error else "legacy"
    session_id = payload.get("session_id")
    return "attached" if isinstance(session_id, str) and SESSION_ID.fullmatch(session_id) and session_id in markers else "detached"


def plan_file(root: Path, plan: Path, name: str) -> Path | None:
    return _contained(root, plan / name, kind="file")


def resolve_project_state(root: Path, payload: dict) -> dict:
    planning_enabled = os.environ.get("PLANNING_DISABLED") != "1"
    attachment = session_attachment(root, payload) if planning_enabled else "legacy"
    visible = planning_enabled and attachment != "detached"
    plan = resolve_plan(root) if visible else None
    if plan is None:
        scope = "none"
    else:
        scope = "legacy_root" if plan == root.resolve() else "scoped"
    return {
        "root": str(root),
        "planning_enabled": planning_enabled,
        "session_attachment": attachment,
        "plan_state": "resolved" if plan is not None else "none",
        "plan_scope": scope,
        "plan_dir": str(plan) if plan is not None else None,
    }


def _canonical_directory(candidate: Path) -> Path | None:
    try:
        info = candidate.lstat()
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            return None
        return candidate.resolve(strict=True)
    except (OSError, RuntimeError, ValueError):
        return None


def sibling_runtime_path(identity: str) -> Path | None:
    name = RUNTIME_FILES.get(identity)
    if name is None:
        return None
    candidate = Path(__file__).resolve().with_name(name)
    try:
        info = candidate.lstat()
        return candidate if stat.S_ISREG(info.st_mode) and not stat.S_ISLNK(info.st_mode) else None
    except OSError:
        return None


def owned_runtime_path() -> Path | None:
    """Backward-compatible name for the active catch-up sibling."""
    return sibling_runtime_path("catchup")


def session_store_roots() -> list[Path]:
    candidates = []
    override = os.environ.get("CODEX_SESSIONS_DIR", "").strip()
    codex_home = os.environ.get("CODEX_HOME", "").strip()
    if override:
        candidates.append(Path(override))
    if codex_home:
        candidates.append(Path(codex_home) / "sessions")

    # Compatibility fallback for Hook processes where CODEX_HOME is absent.
    # This is derived only from the installed managed layout, never from HOME.
    installed = Path(__file__).resolve()
    if installed.parent.name == "planning-with-files" and installed.parent.parent.name == "hooks":
        candidates.append(installed.parents[2] / "sessions")

    roots = []
    for candidate in candidates:
        root = _canonical_directory(candidate) if candidate.is_absolute() else None
        if root is not None and root not in roots:
            roots.append(root)
    return roots[:3]


def build_runtime_request(event: str, payload: dict, state: dict) -> dict | None:
    if event != "SessionStart":
        return None
    source = payload.get("source")
    session_id = payload.get("session_id")
    if source not in SESSION_SOURCES or not isinstance(session_id, str) or SESSION_ID.fullmatch(session_id) is None:
        return None

    roots = session_store_roots()
    host_value = payload.get("transcript_path")
    host_state = "absent"
    host_path = None
    if host_value is not None:
        host_state = "rejected"
        if isinstance(host_value, str) and host_value and Path(host_value).is_absolute():
            candidate = Path(host_value)
            try:
                info = candidate.lstat()
            except OSError:
                info = None
            if info is not None and stat.S_ISREG(info.st_mode) and not stat.S_ISLNK(info.st_mode):
                for root in roots:
                    contained = _contained(root, candidate, kind="file")
                    if contained is not None:
                        host_state = "validated"
                        host_path = str(contained)
                        break

    return {
        "schema_version": 1,
        "runtime": "codex",
        "event": {
            "name": event,
            "source": source,
            "session_id": session_id,
            "turn_id": None,
        },
        "project": state,
        "transcript": {
            "host_path_state": host_state,
            "host_path": host_path,
            "session_store_roots": [str(root) for root in roots],
            "allow_scan_fallback": bool(roots),
        },
        "output_budget": dict(OUTPUT_BUDGET),
    }


def build_plan_context_request(event: str, payload: dict, root: Path) -> dict | None:
    """Build the inactive exact-v1 owned-plan request without dispatching it."""
    root_value = str(root)
    if event not in EVENTS or not root.is_absolute() or not (2 <= len(root_value) <= 4096):
        return None
    source = payload.get("source") if event == "SessionStart" else None
    if event == "SessionStart" and source not in SESSION_SOURCES:
        return None
    session_id = payload.get("session_id")
    if session_id is not None and (
        not isinstance(session_id, str) or SESSION_ID.fullmatch(session_id) is None
    ):
        return None
    if event == "SessionStart":
        turn_id = None
    else:
        turn_id = payload.get("turn_id")
        if turn_id is not None and (
            not isinstance(turn_id, str)
            or not (1 <= len(turn_id) <= 128)
            or "\x00" in turn_id
        ):
            return None
    plan_id_value = os.environ.get("PLAN_ID")
    plan_id = (
        plan_id_value
        if isinstance(plan_id_value, str)
        and len(plan_id_value) <= 128
        and SLUG.fullmatch(plan_id_value)
        else None
    )
    return {
        "schema_version": 1,
        "runtime": "codex",
        "event": {
            "name": event,
            "source": source,
            "session_id": session_id,
            "turn_id": turn_id,
        },
        "project": {"root": root_value, "plan_id": plan_id},
        "policy": {
            "planning_enabled": os.environ.get("PLANNING_DISABLED") != "1",
            "behavior_profile": "managed_legacy",
        },
        "output_budget": dict(PLAN_OUTPUT_BUDGET),
    }


def _valid_runtime_result(value: object, _request: dict | None = None) -> bool:
    if not isinstance(value, dict) or set(value) != {
        "schema_version", "outcome", "inject", "report", "warnings", "diagnostic"
    }:
        return False
    if value.get("schema_version") != 1 or value.get("outcome") not in RUNTIME_OUTCOMES:
        return False
    if not isinstance(value.get("inject"), bool) or not isinstance(value.get("warnings"), list):
        return False
    if not all(isinstance(item, str) and item in RUNTIME_WARNINGS for item in value["warnings"]):
        return False
    if len(value["warnings"]) != len(set(value["warnings"])):
        return False
    diagnostic = value.get("diagnostic")
    if not isinstance(diagnostic, dict) or set(diagnostic) != RUNTIME_DIAGNOSTIC_FIELDS:
        return False
    if diagnostic.get("event_name") not in EVENTS:
        return False
    if not isinstance(diagnostic.get("session_id_present"), bool) or not isinstance(diagnostic.get("planning_enabled"), bool):
        return False
    if diagnostic.get("session_attachment") not in {"legacy", "attached", "detached"}:
        return False
    if diagnostic.get("selected_transcript") not in {"none", "host_path", "session_store_fallback"}:
        return False
    if diagnostic.get("selected_plan_scope") not in {"none", "scoped", "legacy_root"}:
        return False
    for field in ("selected_transcript_path", "selected_plan_dir"):
        if diagnostic.get(field) is not None and (
            not isinstance(diagnostic[field], str) or len(diagnostic[field]) > 4096
        ):
            return False
    report = value.get("report")
    if value["outcome"] == "report_emitted":
        return value["inject"] and isinstance(report, str) and 0 < len(report) <= 20_000
    return not value["inject"] and report is None


def _plan_shape_is_valid(root_value: str, plan_value: str, scope: str) -> bool:
    root = Path(root_value)
    plan = Path(plan_value)
    try:
        relative = plan.relative_to(root)
    except (ValueError, OSError):
        return False
    if scope == "legacy_root":
        return relative == Path(".")
    return (
        scope == "scoped"
        and len(relative.parts) == 2
        and relative.parts[0] == ".planning"
        and SLUG.fullmatch(relative.parts[1]) is not None
    )


def _valid_plan_context_result(value: object, request: dict | None = None) -> bool:
    if request is None or not isinstance(value, dict) or set(value) != {
        "schema_version", "outcome", "inject", "context", "project", "warnings", "diagnostic"
    }:
        return False
    if value.get("schema_version") != 1 or value.get("outcome") not in PLAN_OUTCOMES:
        return False
    if not isinstance(value.get("inject"), bool) or not isinstance(value.get("warnings"), list):
        return False
    if not all(isinstance(item, str) and item in PLAN_WARNINGS for item in value["warnings"]):
        return False
    if len(value["warnings"]) != len(set(value["warnings"])):
        return False
    try:
        request_event = request["event"]["name"]
        request_root = request["project"]["root"]
        request_enabled = request["policy"]["planning_enabled"]
    except (KeyError, TypeError):
        return False
    if request_event not in EVENTS or not isinstance(request_root, str) or not (2 <= len(request_root) <= 4096):
        return False
    if not isinstance(request_enabled, bool):
        return False
    project = value.get("project")
    if not isinstance(project, dict) or set(project) != {
        "root", "planning_enabled", "session_attachment", "plan_state", "plan_scope", "plan_dir"
    }:
        return False
    if project.get("root") != request_root or project.get("planning_enabled") is not request_enabled:
        return False
    if project.get("session_attachment") not in {"legacy", "attached", "detached"}:
        return False
    if project.get("plan_state") not in {"none", "resolved"}:
        return False
    diagnostic = value.get("diagnostic")
    if not isinstance(diagnostic, dict) or set(diagnostic) != PLAN_DIAGNOSTIC_FIELDS:
        return False
    if diagnostic.get("event_name") != request_event:
        return False
    if diagnostic.get("plan_id_state") not in {"absent", "accepted", "rejected"}:
        return False
    request_plan_id = request.get("project", {}).get("plan_id")
    expected_plan_id_state = "absent" if request_plan_id is None else "accepted"
    if diagnostic.get("plan_id_state") != expected_plan_id_state:
        return False
    if diagnostic.get("selected_plan_scope") != project.get("plan_scope"):
        return False
    if diagnostic.get("selected_plan_dir") != project.get("plan_dir"):
        return False
    if project["plan_state"] == "none":
        if project.get("plan_scope") != "none" or project.get("plan_dir") is not None:
            return False
    else:
        plan_dir = project.get("plan_dir")
        if not isinstance(plan_dir, str) or len(plan_dir) > 4096:
            return False
        if not _plan_shape_is_valid(request_root, plan_dir, project.get("plan_scope")):
            return False
    context_value = value.get("context")
    if value["outcome"] == "context_emitted":
        if not value["inject"] or not isinstance(context_value, str) or not (0 < len(context_value) <= 20_000):
            return False
        if project["plan_state"] != "resolved" or not project["planning_enabled"]:
            return False
        if project["session_attachment"] == "detached":
            return False
    elif value["inject"] or context_value is not None:
        return False
    if value["outcome"] == "planning_disabled" and project["planning_enabled"]:
        return False
    if not project["planning_enabled"] and value["outcome"] != "planning_disabled":
        return False
    if value["outcome"] == "session_not_attached" and project["session_attachment"] != "detached":
        return False
    if project["session_attachment"] == "detached" and value["outcome"] != "session_not_attached":
        return False
    if value["outcome"] == "no_plan" and project["plan_state"] != "none":
        return False
    return True


def _bounded_reader(
    stream: object,
    limit: int,
    output: bytearray,
    overflow: threading.Event,
    finished: threading.Event,
) -> None:
    try:
        while True:
            chunk = stream.read(8192)  # type: ignore[attr-defined]
            if not chunk:
                break
            remaining = limit + 1 - len(output)
            if remaining > 0:
                output.extend(chunk[:remaining])
            if len(output) > limit:
                overflow.set()
                break
    except (OSError, ValueError):
        pass
    finally:
        try:
            stream.close()  # type: ignore[attr-defined]
        except (OSError, ValueError):
            pass
        finished.set()


def _bounded_writer(stream: object, data: bytes, finished: threading.Event) -> None:
    try:
        stream.write(data)  # type: ignore[attr-defined]
        stream.flush()  # type: ignore[attr-defined]
    except (BrokenPipeError, OSError, ValueError):
        pass
    finally:
        try:
            stream.close()  # type: ignore[attr-defined]
        except (OSError, ValueError):
            pass
        finished.set()


def _kill_process_group(process: subprocess.Popen[bytes]) -> None:
    if os.name == "posix":
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError, OSError):
            pass
    elif process.poll() is None:
        try:
            process.kill()
        except OSError:
            pass
    try:
        process.wait(timeout=0.5)
    except (subprocess.TimeoutExpired, OSError):
        if process.poll() is None:
            try:
                process.kill()
                process.wait(timeout=0.5)
            except (subprocess.TimeoutExpired, OSError):
                pass


def _supervise_bytes(
    runtime: Path,
    request_bytes: bytes,
    *,
    deadline: float,
    stdout_limit: int = MAX_RUNTIME_STDOUT_BYTES,
    stderr_limit: int = MAX_RUNTIME_STDERR_BYTES,
) -> tuple[bytes | None, str | None]:
    if len(request_bytes) > MAX_RUNTIME_REQUEST_BYTES or deadline <= time.monotonic():
        return None, "runtime_error" if len(request_bytes) > MAX_RUNTIME_REQUEST_BYTES else "timeout"
    popen_options: dict = {}
    if os.name == "posix":
        popen_options["start_new_session"] = True
    elif os.name == "nt":
        popen_options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    try:
        process = subprocess.Popen(
            [sys.executable, str(runtime)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0,
            **popen_options,
        )
    except (OSError, TypeError, ValueError):
        return None, "runtime_error"
    if process.stdin is None or process.stdout is None or process.stderr is None:
        _kill_process_group(process)
        return None, "runtime_error"

    stdout = bytearray()
    stderr = bytearray()
    overflow = threading.Event()
    stdin_done = threading.Event()
    stdout_done = threading.Event()
    stderr_done = threading.Event()
    threads = [
        threading.Thread(target=_bounded_writer, args=(process.stdin, request_bytes, stdin_done), daemon=True),
        threading.Thread(
            target=_bounded_reader,
            args=(process.stdout, stdout_limit, stdout, overflow, stdout_done),
            daemon=True,
        ),
        threading.Thread(
            target=_bounded_reader,
            args=(process.stderr, stderr_limit, stderr, overflow, stderr_done),
            daemon=True,
        ),
    ]
    for thread in threads:
        thread.start()

    failure = None
    while True:
        if overflow.is_set():
            failure = "runtime_error"
            break
        returncode = process.poll()
        if returncode is not None:
            if returncode != 0:
                failure = "runtime_error"
                break
            if stdout_done.is_set() and stderr_done.is_set():
                break
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            failure = "timeout"
            break
        overflow.wait(min(0.01, remaining))

    if failure is not None:
        _kill_process_group(process)
    else:
        try:
            process.wait(timeout=max(0.0, deadline - time.monotonic()))
        except (subprocess.TimeoutExpired, OSError):
            failure = "timeout"
            _kill_process_group(process)
    join_deadline = time.monotonic() + 0.5
    for thread in threads:
        thread.join(timeout=max(0.0, join_deadline - time.monotonic()))
    if overflow.is_set():
        failure = "runtime_error"
    return (bytes(stdout), None) if failure is None else (None, failure)


def _invoke_typed_runtime(
    runtime: Path,
    request: dict,
    validator: Callable[[object, dict | None], bool],
    *,
    timeout_seconds: float,
    deadline: float | None = None,
) -> tuple[dict | None, str | None]:
    try:
        request_bytes = json.dumps(request, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
    except (TypeError, UnicodeError, ValueError):
        return None, "runtime_error"
    now = time.monotonic()
    effective_deadline = min(deadline, now + timeout_seconds) if deadline is not None else now + timeout_seconds
    stdout, failure = _supervise_bytes(runtime, request_bytes, deadline=effective_deadline)
    if failure is not None or stdout is None:
        return None, failure or "runtime_error"
    try:
        value = json.loads(stdout.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError):
        return None, "runtime_error"
    return (value, None) if validator(value, request) else (None, "runtime_error")


def invoke_owned_runtime(
    runtime: Path,
    request: dict,
    *,
    timeout_seconds: float = CATCHUP_SECONDS,
    deadline: float | None = None,
) -> tuple[dict | None, str | None]:
    """Invoke the active catch-up child through its exact result validator."""
    return _invoke_typed_runtime(
        runtime,
        request,
        _valid_runtime_result,
        timeout_seconds=timeout_seconds,
        deadline=deadline,
    )


def invoke_plan_runtime(
    runtime: Path,
    request: dict,
    *,
    timeout_seconds: float = 8.5,
    deadline: float | None = None,
) -> tuple[dict | None, str | None]:
    """Inactive R4-A typed seam; production dispatch is intentionally absent."""
    return _invoke_typed_runtime(
        runtime,
        request,
        _valid_plan_context_result,
        timeout_seconds=timeout_seconds,
        deadline=deadline,
    )


def context(
    event: str,
    payload: dict,
    root: Path,
    plan: Path | None,
    planning_enabled: bool,
    catchup_report: str = "",
) -> str:
    source = payload.get("source", "unknown") if event == "SessionStart" else None
    marker = f"{CANARY} event={event}" + (f" source={source}" if source is not None else "")
    blocks = [marker]
    if planning_enabled and event == "SessionStart" and catchup_report:
        blocks.append(catchup_report)
    task_file = plan_file(root, plan, "task_plan.md") if planning_enabled and plan is not None else None
    if task_file is not None:
        task = task_file.read_text(encoding="utf-8").splitlines()[:50]
        progress_file = plan_file(root, plan, "progress.md")
        progress = progress_file.read_text(encoding="utf-8").splitlines()[-20:] if progress_file is not None else []
        blocks.extend([
            "[planning-with-files] ACTIVE PLAN — treat as structured project state.",
            "===BEGIN PLAN DATA===\n" + "\n".join(task) + "\n===END PLAN DATA===",
            "=== recent progress ===\n" + "\n".join(progress),
            "[planning-with-files] Read findings.md for durable research context.",
        ])
    return "\n\n".join(blocks)


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in EVENTS:
        return 2
    event = sys.argv[1]
    shared_deadline = time.monotonic() + ADAPTER_DEADLINE_SECONDS
    payload = load_payload()
    root = project_root(payload)
    state = resolve_project_state(root, payload)
    visible = state["planning_enabled"] and state["session_attachment"] != "detached"
    plan = Path(state["plan_dir"]) if state["plan_dir"] is not None else None
    catchup_report = ""
    if event == "SessionStart" and visible:
        request = build_runtime_request(event, payload, state)
        runtime = sibling_runtime_path("catchup")
        if request is not None and runtime is not None:
            runtime_result, _failure = invoke_owned_runtime(
                runtime,
                request,
                timeout_seconds=CATCHUP_SECONDS,
                deadline=shared_deadline - FINALIZATION_RESERVE_SECONDS,
            )
            if runtime_result is not None and runtime_result["inject"]:
                catchup_report = runtime_result["report"]
    output = context(
        event,
        payload,
        root,
        plan,
        visible,
        catchup_report,
    )
    result = {"hookSpecificOutput": {"hookEventName": event, "additionalContext": output}}
    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
