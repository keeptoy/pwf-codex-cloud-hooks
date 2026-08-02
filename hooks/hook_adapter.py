#!/usr/bin/env python3
"""Read-only SessionStart/UserPromptSubmit adapter for planning-with-files."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

CANARY = "PWF_GLOBAL_HOOK_CANARY_V1"
EVENTS = {"SessionStart", "UserPromptSubmit"}
SESSION_SOURCES = {"startup", "resume", "clear", "compact"}
SLUG = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]*$")
SESSION_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
MAX_RUNTIME_STDOUT_BYTES = 100_000
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


def owned_runtime_path() -> Path | None:
    candidate = Path(__file__).resolve().with_name("owned-catchup.py")
    try:
        info = candidate.lstat()
        return candidate if stat.S_ISREG(info.st_mode) and not stat.S_ISLNK(info.st_mode) else None
    except OSError:
        return None


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


def _valid_runtime_result(value: object) -> bool:
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


def invoke_owned_runtime(
    runtime: Path, request: dict, *, timeout_seconds: float = 30
) -> tuple[dict | None, str | None]:
    """Run the managed child with bounded stdout and a strict result envelope."""
    try:
        result = subprocess.run(
            [sys.executable, str(runtime)],
            input=json.dumps(request, ensure_ascii=True, separators=(",", ":")).encode("utf-8"),
            capture_output=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return None, "timeout"
    except (OSError, TypeError, UnicodeError, ValueError):
        return None, "runtime_error"
    if result.returncode != 0 or len(result.stdout) > MAX_RUNTIME_STDOUT_BYTES:
        return None, "runtime_error"
    try:
        value = json.loads(result.stdout.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError):
        return None, "runtime_error"
    return (value, None) if _valid_runtime_result(value) else (None, "runtime_error")


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
    payload = load_payload()
    root = project_root(payload)
    state = resolve_project_state(root, payload)
    visible = state["planning_enabled"] and state["session_attachment"] != "detached"
    plan = Path(state["plan_dir"]) if state["plan_dir"] is not None else None
    catchup_report = ""
    if event == "SessionStart" and visible:
        request = build_runtime_request(event, payload, state)
        runtime = owned_runtime_path()
        if request is not None and runtime is not None:
            runtime_result, _failure = invoke_owned_runtime(runtime, request)
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
