#!/usr/bin/env python3
"""Inactive managed plan-context runtime using the exact v1 JSON protocol.

The adapter does not dispatch this child until Phase 3 Round 4. Round 3 installs
and verifies it so the production trust graph can be tested before activation.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import selectors
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple


sys.dont_write_bytecode = True


SCHEMA_VERSION = 1
EVENTS = {"SessionStart", "UserPromptSubmit"}
SESSION_SOURCES = {"startup", "resume", "clear", "compact"}
SESSION_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
PLAN_ID = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]*$")
EXPECTED_BUDGET = {
    "max_context_chars": 20_000,
    "max_plan_lines": 50,
    "max_progress_lines": 20,
}
WARNINGS = {
    "plan_id_rejected",
    "active_plan_rejected",
    "candidate_escape_rejected",
    "progress_unreadable",
    "stale_cleanup_skipped",
    "stale_cleanup_failed",
}

RUNTIME_ROOT = Path(__file__).resolve().parent
RESOLVER = RUNTIME_ROOT / "upstream" / "resolve-plan-dir.sh"
INJECTOR = RUNTIME_ROOT / "upstream" / "inject-plan.sh"
SAFE_PATH = "/usr/local/bin:/usr/bin:/bin"
MAX_REQUEST_BYTES = 100_000
MAX_INPUT_BYTES = 1_000_000
MAX_ATTACHMENT_ENTRIES = 1024
MAX_CHILD_OUTPUT_BYTES = 100_000
OWNED_PLAN_SECONDS = 8.0
RESOLVER_SECONDS = 2.0
INJECTOR_SECONDS = 5.0
CLEANUP_RESERVE_SECONDS = 1.0
STALE_AGE_SECONDS = 600.0
STALE_ENTRY_LIMIT = 32
STALE_CLEANUP_SECONDS = 0.5
SNAPSHOT_PREFIX = "pwf-snapshot-"
TRUSTED_BASE_PREFIX = "pwf-codex-cloud-hooks-"


class InvalidRequest(ValueError):
    """Raised when adapter input does not satisfy the exact v1 contract."""


class PlanFailure(Exception):
    """A reason-coded, non-injecting runtime failure."""

    def __init__(self, outcome: str, warnings: Optional[List[str]] = None):
        super().__init__(outcome)
        self.outcome = outcome
        self.warnings = warnings or []


def _exact_object(value: Any, keys: Iterable[str], label: str) -> Dict[str, Any]:
    if not isinstance(value, dict) or set(value) != set(keys):
        raise InvalidRequest(f"{label} fields are invalid")
    return value


def _bounded_string(value: Any, label: str, *, nullable: bool = False) -> Optional[str]:
    if nullable and value is None:
        return None
    if not isinstance(value, str) or not 1 <= len(value) <= 128 or "\x00" in value:
        raise InvalidRequest(f"{label} is invalid")
    return value


def _absolute_posix_path(value: Any, label: str) -> str:
    if (
        not isinstance(value, str)
        or not value.startswith("/")
        or not 2 <= len(value) <= 4096
        or "\x00" in value
    ):
        raise InvalidRequest(f"{label} must be an absolute POSIX path")
    return value


def validate_request(value: Any) -> Dict[str, Any]:
    request = _exact_object(
        value,
        {"schema_version", "runtime", "event", "project", "policy", "output_budget"},
        "request",
    )
    if request["schema_version"] != SCHEMA_VERSION or request["runtime"] != "codex":
        raise InvalidRequest("request identity is invalid")

    event = _exact_object(request["event"], {"name", "source", "session_id", "turn_id"}, "event")
    if event["name"] not in EVENTS:
        raise InvalidRequest("event.name is invalid")
    session_id = _bounded_string(event["session_id"], "event.session_id", nullable=True)
    if session_id is not None and SESSION_ID.fullmatch(session_id) is None:
        raise InvalidRequest("event.session_id is invalid")
    if event["name"] == "SessionStart":
        if event["source"] not in SESSION_SOURCES or event["turn_id"] is not None:
            raise InvalidRequest("SessionStart event fields are invalid")
    else:
        if event["source"] is not None:
            raise InvalidRequest("UserPromptSubmit source must be null")
        _bounded_string(event["turn_id"], "event.turn_id", nullable=True)

    project = _exact_object(request["project"], {"root", "plan_id"}, "project")
    _absolute_posix_path(project["root"], "project.root")
    plan_id = _bounded_string(project["plan_id"], "project.plan_id", nullable=True)
    if plan_id is not None and PLAN_ID.fullmatch(plan_id) is None:
        raise InvalidRequest("project.plan_id is invalid")

    policy = _exact_object(request["policy"], {"planning_enabled", "behavior_profile"}, "policy")
    if not isinstance(policy["planning_enabled"], bool) or policy["behavior_profile"] != "managed_legacy":
        raise InvalidRequest("policy is invalid")
    if request["output_budget"] != EXPECTED_BUDGET:
        raise InvalidRequest("output_budget does not match contract v1")
    return request


def _safe_event_name(value: Any) -> Optional[str]:
    try:
        name = value.get("event", {}).get("name")
        return name if name in EVENTS else None
    except (AttributeError, TypeError):
        return None


def _safe_root(value: Any) -> Optional[str]:
    try:
        root = value.get("project", {}).get("root")
        return (
            root
            if isinstance(root, str)
            and root.startswith("/")
            and 2 <= len(root) <= 4096
            and "\x00" not in root
            else None
        )
    except (AttributeError, TypeError):
        return None


def _safe_planning_enabled(value: Any) -> bool:
    try:
        enabled = value.get("policy", {}).get("planning_enabled")
        return enabled if isinstance(enabled, bool) else False
    except (AttributeError, TypeError):
        return False


def _safe_plan_id_state(value: Any) -> str:
    try:
        plan_id = value.get("project", {}).get("plan_id")
        return (
            "absent"
            if plan_id is None
            else "accepted"
            if isinstance(plan_id, str) and PLAN_ID.fullmatch(plan_id) is not None
            else "rejected"
        )
    except (AttributeError, TypeError):
        return "rejected"


def empty_project(request: Any, *, root: Optional[str] = None, attachment: str = "legacy") -> Dict[str, Any]:
    return {
        "root": root if root is not None else _safe_root(request),
        "planning_enabled": _safe_planning_enabled(request),
        "session_attachment": attachment,
        "plan_state": "none",
        "plan_scope": "none",
        "plan_dir": None,
    }


def plan_result(
    outcome: str,
    request: Any,
    *,
    context: Optional[str] = None,
    project: Optional[Dict[str, Any]] = None,
    warnings: Optional[List[str]] = None,
    plan_id_state: Optional[str] = None,
) -> Dict[str, Any]:
    project = project or empty_project(request)
    unique_warnings = [item for item in dict.fromkeys(warnings or []) if item in WARNINGS]
    inject = outcome == "context_emitted"
    return {
        "schema_version": SCHEMA_VERSION,
        "outcome": outcome,
        "inject": inject,
        "context": context if inject else None,
        "project": project,
        "warnings": unique_warnings,
        "diagnostic": {
            "event_name": _safe_event_name(request),
            "plan_id_state": plan_id_state or _safe_plan_id_state(request),
            "selected_plan_scope": project["plan_scope"],
            "selected_plan_dir": project["plan_dir"],
        },
    }


def minimal_env(*, temp_root: Optional[str] = None, plan_id: Optional[str] = None) -> Dict[str, str]:
    env = {"PATH": SAFE_PATH, "LC_ALL": "C", "LANG": "C"}
    if temp_root is not None:
        env["TMPDIR"] = temp_root
    if plan_id is not None:
        env["PLAN_ID"] = plan_id
    return env


def _kill_process_group(process: subprocess.Popen[bytes]) -> None:
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except (OSError, ProcessLookupError):
        try:
            process.kill()
        except OSError:
            pass
    try:
        process.wait(timeout=0.5)
    except (OSError, subprocess.TimeoutExpired):
        pass


def run_child(
    command: List[str],
    *,
    cwd: Path,
    env: Dict[str, str],
    deadline: float,
    max_output_bytes: int = MAX_CHILD_OUTPUT_BYTES,
    overflow_outcome: str = "output_budget_exceeded",
) -> bytes:
    if time.monotonic() >= deadline:
        raise PlanFailure("timeout")
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
            close_fds=True,
        )
    except (OSError, TypeError, ValueError):
        raise PlanFailure("runtime_error") from None

    selector = selectors.DefaultSelector()
    stdout = bytearray()
    stderr = bytearray()
    streams = [(process.stdout, stdout), (process.stderr, stderr)]
    try:
        for stream, target in streams:
            if stream is None:
                raise PlanFailure("runtime_error")
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, target)
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise PlanFailure("timeout")
            for key, _ in selector.select(min(remaining, 0.05)):
                try:
                    chunk = os.read(key.fileobj.fileno(), 65_536)
                except BlockingIOError:
                    continue
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                key.data.extend(chunk)
                if len(stdout) + len(stderr) > max_output_bytes:
                    raise PlanFailure(overflow_outcome)
            if process.poll() is not None and not selector.get_map():
                break
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise PlanFailure("timeout")
        try:
            returncode = process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            raise PlanFailure("timeout") from None
        if returncode != 0 or stderr:
            raise PlanFailure("runtime_error")
        return bytes(stdout)
    except PlanFailure:
        _kill_process_group(process)
        raise
    finally:
        selector.close()
        for stream, _ in streams:
            if stream is not None:
                stream.close()


def _directory_flags() -> int:
    return os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW


def _file_flags() -> int:
    return os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK


def _open_directory_chain(root_fd: int, parts: Tuple[str, ...]) -> int:
    current = os.dup(root_fd)
    try:
        for part in parts:
            if part in {"", ".", ".."}:
                raise PlanFailure("plan_unreadable")
            next_fd = os.open(part, _directory_flags(), dir_fd=current)
            os.close(current)
            current = next_fd
        return current
    except (OSError, PlanFailure):
        os.close(current)
        raise PlanFailure("plan_unreadable") from None


def _file_identity(info: os.stat_result) -> Tuple[int, ...]:
    return (
        info.st_dev,
        info.st_ino,
        info.st_size,
        info.st_mtime_ns,
        info.st_ctime_ns,
        stat.S_IFMT(info.st_mode),
        info.st_nlink,
        info.st_uid,
        info.st_gid,
    )


def _directory_identity(info: os.stat_result) -> Tuple[int, ...]:
    return (
        info.st_dev,
        info.st_ino,
        info.st_size,
        info.st_mtime_ns,
        info.st_ctime_ns,
        stat.S_IFMT(info.st_mode),
        info.st_nlink,
        info.st_uid,
        info.st_gid,
    )


def safe_read_file(
    parent_fd: int,
    name: str,
    *,
    required: bool,
    race_probe: Optional[Callable[[], None]] = None,
) -> Optional[bytes]:
    file_fd: Optional[int] = None
    verify_fd: Optional[int] = None
    try:
        try:
            file_fd = os.open(name, _file_flags(), dir_fd=parent_fd)
        except FileNotFoundError:
            if required:
                raise PlanFailure("plan_unreadable")
            return None
        before = os.fstat(file_fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_INPUT_BYTES:
            raise PlanFailure("plan_unreadable")
        if before.st_nlink != 1:
            raise PlanFailure("plan_unreadable")
        chunks: List[bytes] = []
        total = 0
        while True:
            chunk = os.read(file_fd, min(65_536, MAX_INPUT_BYTES + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_INPUT_BYTES:
                raise PlanFailure("plan_unreadable")
        after = os.fstat(file_fd)
        if race_probe is not None:
            race_probe()
        verify_fd = os.open(name, _file_flags(), dir_fd=parent_fd)
        current = os.fstat(verify_fd)
        if not all(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 for info in (after, current)):
            raise PlanFailure("plan_unreadable")
        if _file_identity(before) != _file_identity(after) or _file_identity(after) != _file_identity(current):
            raise PlanFailure("plan_state_changed")
        content = b"".join(chunks)
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            raise PlanFailure("plan_unreadable") from None
        return content
    except PlanFailure:
        raise
    except OSError:
        raise PlanFailure("plan_unreadable") from None
    finally:
        if file_fd is not None:
            os.close(file_fd)
        if verify_fd is not None:
            os.close(verify_fd)


def _marker_attachment(root_fd: int, session_id: Optional[str]) -> str:
    planning_fd: Optional[int] = None
    sessions_fd: Optional[int] = None
    try:
        try:
            planning_fd = os.open(".planning", _directory_flags(), dir_fd=root_fd)
        except FileNotFoundError:
            return "legacy"
        try:
            sessions_fd = os.open("sessions", _directory_flags(), dir_fd=planning_fd)
        except FileNotFoundError:
            return "legacy"
        markers: List[str] = []
        unsafe = False
        try:
            with os.scandir(sessions_fd) as entries:
                for index, entry in enumerate(entries):
                    if index >= MAX_ATTACHMENT_ENTRIES:
                        return "detached"
                    if not entry.name.endswith(".attached"):
                        continue
                    marker_id = entry.name[:-len(".attached")]
                    marker_fd: Optional[int] = None
                    try:
                        marker_fd = os.open(entry.name, _file_flags(), dir_fd=sessions_fd)
                        info = os.fstat(marker_fd)
                    except OSError:
                        unsafe = True
                        continue
                    finally:
                        if marker_fd is not None:
                            os.close(marker_fd)
                    if SESSION_ID.fullmatch(marker_id) and stat.S_ISREG(info.st_mode) and info.st_nlink == 1:
                        markers.append(marker_id)
                    else:
                        unsafe = True
        except OSError:
            return "detached"
        if unsafe and not markers:
            return "detached"
        if not markers:
            return "legacy"
        return "attached" if session_id is not None and session_id in markers else "detached"
    except OSError:
        return "detached"
    finally:
        if sessions_fd is not None:
            os.close(sessions_fd)
        if planning_fd is not None:
            os.close(planning_fd)


def _candidate_warning(root: Path, plan_id: Optional[str]) -> List[str]:
    if plan_id is None:
        return []
    candidate = root / ".planning" / plan_id
    try:
        info = candidate.lstat()
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            return ["plan_id_rejected", "candidate_escape_rejected"]
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root)
    except FileNotFoundError:
        return ["plan_id_rejected"]
    except (OSError, RuntimeError, ValueError):
        return ["plan_id_rejected", "candidate_escape_rejected"]
    return []


def _active_warning(root_fd: int, root: Path) -> List[str]:
    planning_fd: Optional[int] = None
    try:
        planning_fd = os.open(".planning", _directory_flags(), dir_fd=root_fd)
    except FileNotFoundError:
        return []
    except OSError:
        return ["active_plan_rejected"]
    try:
        try:
            content = safe_read_file(planning_fd, ".active_plan", required=False)
        except PlanFailure:
            return ["active_plan_rejected"]
    finally:
        os.close(planning_fd)
    if content is None:
        return []
    if len(content) > 512:
        return ["active_plan_rejected"]
    try:
        plan_id = "".join(content.decode("utf-8-sig").split())
    except UnicodeError:
        return ["active_plan_rejected"]
    if PLAN_ID.fullmatch(plan_id) is None:
        return ["active_plan_rejected"]
    candidate = root / ".planning" / plan_id
    try:
        candidate_info = candidate.lstat()
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root)
    except (OSError, RuntimeError, ValueError):
        return ["active_plan_rejected"]
    if stat.S_ISLNK(candidate_info.st_mode) or not stat.S_ISDIR(candidate_info.st_mode):
        return ["active_plan_rejected", "candidate_escape_rejected"]
    return []


def resolve_plan(
    root: Path,
    plan_id: Optional[str],
    deadline: float,
    *,
    resolver: Path = RESOLVER,
    root_fd: Optional[int] = None,
) -> Tuple[Optional[Path], str, List[str], str]:
    warnings = _candidate_warning(root, plan_id)
    if root_fd is not None and (plan_id is None or warnings):
        warnings.extend(_active_warning(root_fd, root))
    child_deadline = min(deadline - CLEANUP_RESERVE_SECONDS, time.monotonic() + RESOLVER_SECONDS)
    output = run_child(
        ["/bin/sh", str(resolver)],
        cwd=root,
        env=minimal_env(plan_id=plan_id),
        deadline=child_deadline,
        max_output_bytes=8192,
        overflow_outcome="runtime_error",
    )
    try:
        text = output.decode("utf-8").strip()
    except UnicodeDecodeError:
        raise PlanFailure("runtime_error", warnings) from None
    if "\x00" in text or "\n" in text or "\r" in text:
        raise PlanFailure("runtime_error", warnings)
    if not text:
        candidate = root
        scope = "legacy_root"
    else:
        candidate = Path(text)
        if not candidate.is_absolute():
            raise PlanFailure("runtime_error", warnings)
        try:
            candidate = candidate.resolve(strict=True)
            relative = candidate.relative_to(root)
        except (OSError, RuntimeError, ValueError):
            warnings.append("candidate_escape_rejected")
            raise PlanFailure("plan_unreadable", warnings) from None
        if len(relative.parts) != 2 or relative.parts[0] != ".planning" or PLAN_ID.fullmatch(relative.parts[1]) is None:
            warnings.append("candidate_escape_rejected")
            raise PlanFailure("plan_unreadable", warnings)
        scope = "scoped"
    if plan_id is not None:
        expected = root / ".planning" / plan_id
        try:
            selected_requested = candidate == expected.resolve(strict=True)
        except (OSError, RuntimeError):
            selected_requested = False
        if not selected_requested:
            warnings.append("plan_id_rejected")
    task = candidate / "task_plan.md"
    try:
        info = task.lstat()
    except FileNotFoundError:
        if scope == "legacy_root":
            return None, "none", list(dict.fromkeys(warnings)), "rejected" if plan_id is not None else "absent"
        raise PlanFailure("plan_unreadable", warnings) from None
    except OSError:
        raise PlanFailure("plan_unreadable", warnings) from None
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
        raise PlanFailure("plan_unreadable", warnings)
    plan_id_state = "absent" if plan_id is None else "rejected" if "plan_id_rejected" in warnings else "accepted"
    return candidate, scope, list(dict.fromkeys(warnings)), plan_id_state


def _trusted_temp_base(temp_parent: Path = Path("/tmp")) -> Path:
    base = temp_parent / f"{TRUSTED_BASE_PREFIX}{os.geteuid()}"
    try:
        os.mkdir(base, 0o700)
    except FileExistsError:
        pass
    try:
        info = base.lstat()
    except OSError:
        raise PlanFailure("runtime_error") from None
    if (
        stat.S_ISLNK(info.st_mode)
        or not stat.S_ISDIR(info.st_mode)
        or info.st_uid != os.geteuid()
        or stat.S_IMODE(info.st_mode) != 0o700
    ):
        raise PlanFailure("runtime_error")
    return base


def _stale_snapshot_safe(path: Path, now: float) -> bool:
    try:
        info = path.lstat()
        if (
            stat.S_ISLNK(info.st_mode)
            or not stat.S_ISDIR(info.st_mode)
            or info.st_uid != os.geteuid()
            or stat.S_IMODE(info.st_mode) != 0o700
            or now - max(info.st_mtime, info.st_ctime) < STALE_AGE_SECONDS
        ):
            return False
        entries = list(os.scandir(path))
    except OSError:
        return False
    if not entries:
        return True
    for entry in entries:
        if entry.name not in {"task_plan.md", "progress.md"}:
            return False
        try:
            child = entry.stat(follow_symlinks=False)
        except OSError:
            return False
        if (
            not stat.S_ISREG(child.st_mode)
            or child.st_nlink != 1
            or child.st_uid != os.geteuid()
            or stat.S_IMODE(child.st_mode) != 0o600
        ):
            return False
    return True


def cleanup_stale_snapshots(base: Path) -> List[str]:
    warnings: List[str] = []
    if not getattr(shutil.rmtree, "avoids_symlink_attacks", False):
        return ["stale_cleanup_failed"]
    deadline = time.monotonic() + STALE_CLEANUP_SECONDS
    now = time.time()
    checked = 0
    try:
        entries = list(os.scandir(base))
    except OSError:
        return ["stale_cleanup_failed"]
    for index, entry in enumerate(entries):
        if checked >= STALE_ENTRY_LIMIT or time.monotonic() >= deadline:
            if any(item.name.startswith(SNAPSHOT_PREFIX) for item in entries[index:]):
                warnings.append("stale_cleanup_skipped")
            break
        if not entry.name.startswith(SNAPSHOT_PREFIX):
            continue
        checked += 1
        path = base / entry.name
        if not _stale_snapshot_safe(path, now):
            warnings.append("stale_cleanup_skipped")
            continue
        try:
            shutil.rmtree(path)
        except OSError:
            warnings.append("stale_cleanup_failed")
            continue
    return list(dict.fromkeys(warnings))


def write_private_file(directory_fd: int, name: str, content: bytes) -> None:
    try:
        file_fd = os.open(
            name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o600,
            dir_fd=directory_fd,
        )
    except OSError:
        raise PlanFailure("runtime_error") from None
    try:
        view = memoryview(content)
        while view:
            written = os.write(file_fd, view)
            if written <= 0:
                raise PlanFailure("runtime_error")
            view = view[written:]
        os.fsync(file_fd)
        info = os.fstat(file_fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or stat.S_IMODE(info.st_mode) != 0o600:
            raise PlanFailure("runtime_error")
    finally:
        os.close(file_fd)


def _remove_owned_snapshot(snapshot: Optional[Path], base: Path) -> None:
    if snapshot is None:
        return
    try:
        snapshot.relative_to(base)
    except ValueError:
        return
    if not snapshot.name.startswith(SNAPSHOT_PREFIX):
        return
    try:
        shutil.rmtree(snapshot)
    except OSError:
        pass


def _revalidate_plan_directory(root_fd: int, parts: Tuple[str, ...], expected: Tuple[int, ...]) -> None:
    reopened = _open_directory_chain(root_fd, parts)
    try:
        current = os.fstat(reopened)
        if not stat.S_ISDIR(current.st_mode) or _directory_identity(current) != expected:
            raise PlanFailure("plan_state_changed")
    finally:
        os.close(reopened)


def execute(
    request: Dict[str, Any],
    *,
    resolver: Path = RESOLVER,
    injector: Path = INJECTOR,
    temp_parent: Path = Path("/tmp"),
    deadline: Optional[float] = None,
) -> Dict[str, Any]:
    return _execute(
        request,
        resolver=resolver,
        injector=injector,
        temp_parent=temp_parent,
        deadline=deadline,
    )


def _execute(
    request: Dict[str, Any],
    *,
    resolver: Path,
    injector: Path,
    temp_parent: Path,
    deadline: Optional[float],
) -> Dict[str, Any]:
    if os.name != "posix" or not all(hasattr(os, name) for name in ("O_DIRECTORY", "O_NOFOLLOW", "geteuid")):
        return plan_result("runtime_error", request)
    deadline = deadline if deadline is not None else time.monotonic() + OWNED_PLAN_SECONDS
    if not request["policy"]["planning_enabled"]:
        return plan_result("planning_disabled", request, project=empty_project(request, attachment="legacy"))

    try:
        base = _trusted_temp_base(temp_parent)
        preflight_warnings = cleanup_stale_snapshots(base)
    except PlanFailure as failure:
        return plan_result(failure.outcome, request, warnings=failure.warnings)

    supplied_root = Path(request["project"]["root"])
    canonical_root = Path(os.path.realpath(supplied_root))
    if supplied_root != canonical_root:
        return plan_result("plan_unreadable", request, warnings=preflight_warnings)
    try:
        root_fd = os.open(canonical_root, _directory_flags())
    except OSError:
        return plan_result("plan_unreadable", request, warnings=preflight_warnings)
    snapshot: Optional[Path] = None
    plan_fd: Optional[int] = None
    try:
        attachment = _marker_attachment(root_fd, request["event"]["session_id"])
        base_project = empty_project(request, root=str(canonical_root), attachment=attachment)
        if attachment == "detached":
            return plan_result(
                "session_not_attached", request, project=base_project, warnings=preflight_warnings
            )
        try:
            plan_dir, scope, warnings, plan_id_state = resolve_plan(
                canonical_root,
                request["project"]["plan_id"],
                deadline,
                resolver=resolver,
                root_fd=root_fd,
            )
            if plan_dir is None:
                return plan_result(
                    "no_plan",
                    request,
                    project=base_project,
                    warnings=preflight_warnings + warnings,
                    plan_id_state=plan_id_state,
                )
            warnings = list(dict.fromkeys(preflight_warnings + warnings))
            relative = plan_dir.relative_to(canonical_root)
            parts = tuple(relative.parts) if relative != Path(".") else ()
            plan_fd = _open_directory_chain(root_fd, parts)
            directory_before = os.fstat(plan_fd)
            if not stat.S_ISDIR(directory_before.st_mode):
                raise PlanFailure("plan_unreadable", warnings)
            expected_directory = _directory_identity(directory_before)
            task = safe_read_file(plan_fd, "task_plan.md", required=True)
            progress = safe_read_file(plan_fd, "progress.md", required=False)
            directory_after_reads = os.fstat(plan_fd)
            if _directory_identity(directory_after_reads) != expected_directory:
                raise PlanFailure("plan_state_changed", warnings)
            _revalidate_plan_directory(root_fd, parts, expected_directory)

            project = {
                "root": str(canonical_root),
                "planning_enabled": True,
                "session_attachment": attachment,
                "plan_state": "resolved",
                "plan_scope": scope,
                "plan_dir": str(plan_dir),
            }

            snapshot = Path(tempfile.mkdtemp(prefix=SNAPSHOT_PREFIX, dir=base))
            os.chmod(snapshot, 0o700)
            snapshot_info = snapshot.lstat()
            if (
                not stat.S_ISDIR(snapshot_info.st_mode)
                or snapshot_info.st_uid != os.geteuid()
                or stat.S_IMODE(snapshot_info.st_mode) != 0o700
            ):
                raise PlanFailure("runtime_error", warnings)
            snapshot_fd = os.open(snapshot, _directory_flags())
            try:
                write_private_file(snapshot_fd, "task_plan.md", task or b"")
                if progress is not None:
                    write_private_file(snapshot_fd, "progress.md", progress)
            finally:
                os.close(snapshot_fd)

            child_deadline = min(
                deadline - CLEANUP_RESERVE_SECONDS,
                time.monotonic() + INJECTOR_SECONDS,
            )
            output = run_child(
                ["/bin/sh", str(injector), "--context=userprompt"],
                cwd=snapshot,
                env=minimal_env(temp_root=str(snapshot)),
                deadline=child_deadline,
            )
            try:
                context = output.decode("utf-8")
            except UnicodeDecodeError:
                raise PlanFailure("runtime_error", warnings) from None
            if not context:
                raise PlanFailure("runtime_error", warnings)
            if len(context) > request["output_budget"]["max_context_chars"]:
                raise PlanFailure("output_budget_exceeded", warnings)

            directory_after_child = os.fstat(plan_fd)
            if _directory_identity(directory_after_child) != expected_directory:
                raise PlanFailure("plan_state_changed", warnings)
            _revalidate_plan_directory(root_fd, parts, expected_directory)
            return plan_result(
                "context_emitted",
                request,
                context=context,
                project=project,
                warnings=warnings,
                plan_id_state=plan_id_state,
            )
        except PlanFailure as failure:
            return plan_result(
                failure.outcome,
                request,
                project=base_project,
                warnings=preflight_warnings + failure.warnings,
            )
    finally:
        if plan_fd is not None:
            os.close(plan_fd)
        _remove_owned_snapshot(snapshot, base)
        os.close(root_fd)


def run_request(
    value: Any,
    *,
    resolver: Path = RESOLVER,
    injector: Path = INJECTOR,
    temp_parent: Path = Path("/tmp"),
    deadline: Optional[float] = None,
) -> Dict[str, Any]:
    try:
        request = validate_request(value)
    except InvalidRequest:
        return plan_result("invalid_request", value)
    if not request["policy"]["planning_enabled"]:
        return plan_result("planning_disabled", request, project=empty_project(request, attachment="legacy"))
    try:
        return execute(
            request,
            resolver=resolver,
            injector=injector,
            temp_parent=temp_parent,
            deadline=deadline,
        )
    except (AttributeError, KeyError, OSError, TypeError, UnicodeError, ValueError, RuntimeError):
        return plan_result("runtime_error", request)


def main() -> int:
    invalid_arguments = bool(sys.argv[1:])
    try:
        raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
        value = None if invalid_arguments or len(raw) > MAX_REQUEST_BYTES else json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, OSError):
        value = None
    result = run_request(value)
    sys.stdout.write(json.dumps(result, ensure_ascii=True, separators=(",", ":")) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
