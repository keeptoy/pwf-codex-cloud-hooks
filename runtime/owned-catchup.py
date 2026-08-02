#!/usr/bin/env python3
"""Managed Codex SessionStart catch-up runtime using the v1 JSON protocol."""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys
from typing import Any, Dict, Iterable, List, Optional, Tuple


# The installed runtime has an exact fail-closed inventory. Importing the
# pinned parser must not create unowned __pycache__ entries beside trusted code.
sys.dont_write_bytecode = True


SCHEMA_VERSION = 1
EVENTS = {"SessionStart", "UserPromptSubmit"}
SESSION_SOURCES = {"startup", "resume", "clear", "compact"}
PLAN_SCOPES = {"none", "scoped", "legacy_root"}
SESSION_ATTACHMENTS = {"legacy", "attached", "detached"}
SESSION_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
HOST_PATH_STATES = {"absent", "validated", "rejected"}
MAX_RECORD_BYTES = 1_000_000
KNOWN_RECORD_TYPES = {"session_meta", "turn_context", "world_state", "event_msg", "response_item", "user", "assistant"}
KNOWN_EVENT_TYPES = {
    "agent_message", "agent_reasoning", "mcp_tool_call_end", "patch_apply_end",
    "task_complete", "task_started", "thread_settings_applied", "token_count", "user_message",
}
KNOWN_RESPONSE_TYPES = {"custom_tool_call", "custom_tool_call_output", "function_call", "message", "reasoning"}
EXPECTED_BUDGET = {
    "max_report_chars": 20000,
    "max_messages": 15,
    "max_tools_per_message": 4,
    "assistant_chars": 300,
    "user_untruncated_chars": 1000,
    "user_head_chars": 350,
    "user_tail_chars": 650,
    "truncation_marker": "...[truncated]...",
}
UPSTREAM_PATH = Path(__file__).resolve().parent / "upstream" / "session-catchup.py"


class InvalidRequest(ValueError):
    """Raised when input does not satisfy the v1 managed runtime contract."""


def _load_upstream() -> Any:
    spec = importlib.util.spec_from_file_location("pwf_owned_upstream_catchup", UPSTREAM_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("owned upstream catch-up module is unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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


def _absolute_path(value: Any, label: str, *, require_posix: bool) -> str:
    if not isinstance(value, str) or not value or "\x00" in value:
        raise InvalidRequest(f"{label} is invalid")
    if require_posix:
        if not value.startswith("/"):
            raise InvalidRequest(f"{label} must be an absolute POSIX path")
    elif not Path(value).is_absolute():
        raise InvalidRequest(f"{label} must be absolute")
    return value


def validate_request(value: Any, *, require_posix: bool = True) -> Dict[str, Any]:
    request = _exact_object(
        value,
        {"schema_version", "runtime", "event", "project", "transcript", "output_budget"},
        "request",
    )
    if request["schema_version"] != SCHEMA_VERSION or request["runtime"] != "codex":
        raise InvalidRequest("request identity is invalid")

    event = _exact_object(request["event"], {"name", "source", "session_id", "turn_id"}, "event")
    if event["name"] not in EVENTS:
        raise InvalidRequest("event.name is invalid")
    session_id = _bounded_string(event["session_id"], "event.session_id")
    if SESSION_ID.fullmatch(session_id) is None:
        raise InvalidRequest("event.session_id is invalid")
    if event["name"] == "SessionStart":
        if event["source"] not in SESSION_SOURCES or event["turn_id"] is not None:
            raise InvalidRequest("SessionStart event fields are invalid")
    else:
        if event["source"] is not None:
            raise InvalidRequest("UserPromptSubmit source must be null")
        _bounded_string(event["turn_id"], "event.turn_id")

    project = _exact_object(
        request["project"],
        {"root", "planning_enabled", "session_attachment", "plan_state", "plan_scope", "plan_dir"},
        "project",
    )
    _absolute_path(project["root"], "project.root", require_posix=require_posix)
    if not isinstance(project["planning_enabled"], bool):
        raise InvalidRequest("project.planning_enabled is invalid")
    if project["session_attachment"] not in SESSION_ATTACHMENTS:
        raise InvalidRequest("project.session_attachment is invalid")
    if project["plan_state"] == "none":
        if project["plan_scope"] != "none" or project["plan_dir"] is not None:
            raise InvalidRequest("unresolved project fields are invalid")
    elif project["plan_state"] == "resolved":
        if project["plan_scope"] not in PLAN_SCOPES - {"none"}:
            raise InvalidRequest("project.plan_scope is invalid")
        _absolute_path(project["plan_dir"], "project.plan_dir", require_posix=require_posix)
    else:
        raise InvalidRequest("project.plan_state is invalid")
    if (not project["planning_enabled"] or project["session_attachment"] == "detached") and project["plan_state"] != "none":
        raise InvalidRequest("disabled or detached project must not resolve a plan")

    transcript = _exact_object(
        request["transcript"],
        {"host_path_state", "host_path", "session_store_roots", "allow_scan_fallback"},
        "transcript",
    )
    if transcript["host_path_state"] not in HOST_PATH_STATES:
        raise InvalidRequest("transcript.host_path_state is invalid")
    roots = transcript["session_store_roots"]
    if not isinstance(roots, list) or len(roots) > 3 or len(roots) != len(set(roots)):
        raise InvalidRequest("transcript.session_store_roots is invalid")
    for index, root in enumerate(roots):
        _absolute_path(root, f"transcript.session_store_roots[{index}]", require_posix=require_posix)
    if not isinstance(transcript["allow_scan_fallback"], bool):
        raise InvalidRequest("transcript.allow_scan_fallback is invalid")
    if transcript["host_path_state"] == "validated":
        _absolute_path(transcript["host_path"], "transcript.host_path", require_posix=require_posix)
        if not roots:
            raise InvalidRequest("validated Host transcript requires an allowed session root")
    elif transcript["host_path"] is not None:
        raise InvalidRequest("non-validated Host transcript path must be null")
    if transcript["allow_scan_fallback"] and not roots:
        raise InvalidRequest("scan fallback requires an explicit session root")

    if request["output_budget"] != EXPECTED_BUDGET:
        raise InvalidRequest("output_budget does not match contract v1")
    return request


def _safe_event_name(value: Any) -> str:
    try:
        event = value.get("event", {}) if isinstance(value, dict) else {}
        return event.get("name") if event.get("name") in EVENTS else "SessionStart"
    except (AttributeError, TypeError):
        return "SessionStart"


def _safe_session_present(value: Any) -> bool:
    try:
        session_id = value.get("event", {}).get("session_id")
        return isinstance(session_id, str) and bool(session_id)
    except (AttributeError, TypeError):
        return False


def _safe_plan_scope(value: Any) -> str:
    try:
        scope = value.get("project", {}).get("plan_scope")
        return scope if scope in PLAN_SCOPES else "none"
    except (AttributeError, TypeError):
        return "none"


def _safe_plan_dir(value: Any) -> Optional[str]:
    try:
        project = value.get("project", {})
        plan_dir = project.get("plan_dir")
        return plan_dir if project.get("plan_state") == "resolved" and isinstance(plan_dir, str) else None
    except (AttributeError, TypeError):
        return None


def _safe_planning_enabled(value: Any) -> bool:
    try:
        enabled = value.get("project", {}).get("planning_enabled")
        return enabled if isinstance(enabled, bool) else False
    except (AttributeError, TypeError):
        return False


def _safe_session_attachment(value: Any) -> str:
    try:
        attachment = value.get("project", {}).get("session_attachment")
        return attachment if attachment in SESSION_ATTACHMENTS else "detached"
    except (AttributeError, TypeError):
        return "detached"


def runtime_result(
    outcome: str,
    request: Any,
    *,
    selected_transcript: str = "none",
    selected_transcript_path: Optional[str] = None,
    report: Optional[str] = None,
    warnings: Optional[List[str]] = None,
) -> Dict[str, Any]:
    inject = outcome == "report_emitted"
    return {
        "schema_version": SCHEMA_VERSION,
        "outcome": outcome,
        "inject": inject,
        "report": report if inject else None,
        "warnings": list(dict.fromkeys(warnings or [])),
        "diagnostic": {
            "event_name": _safe_event_name(request),
            "session_id_present": _safe_session_present(request),
            "planning_enabled": _safe_planning_enabled(request),
            "session_attachment": _safe_session_attachment(request),
            "selected_transcript": selected_transcript,
            "selected_transcript_path": selected_transcript_path,
            "selected_plan_scope": _safe_plan_scope(request),
            "selected_plan_dir": _safe_plan_dir(request),
        },
    }


def _canonical_directory(value: str) -> Optional[Path]:
    path = Path(value)
    try:
        if path.is_symlink() or not path.is_dir():
            return None
        return path.resolve(strict=True)
    except OSError:
        return None


def _contained_regular_file(value: str, roots: List[Path]) -> Optional[Path]:
    path = Path(value)
    try:
        info = path.lstat()
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
            return None
        resolved = path.resolve(strict=True)
    except OSError:
        return None
    for root in roots:
        try:
            resolved.relative_to(root)
            return resolved
        except ValueError:
            continue
    return None


def _decode_record(raw: bytes) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    if len(raw) > MAX_RECORD_BYTES:
        return None, "record_too_large"
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None, "invalid_utf8_record"
    if not text.strip():
        return {}, None
    try:
        value = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None, "invalid_json_record"
    return (value, None) if isinstance(value, dict) else (None, "invalid_json_record")


def _session_meta(path: Path) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    try:
        with path.open("rb") as stream:
            for raw in stream:
                record, warning = _decode_record(raw)
                if warning:
                    return None, warning
                if not record or record.get("type") != "session_meta":
                    continue
                payload = record.get("payload")
                return (payload, None) if isinstance(payload, dict) else (None, "invalid_json_record")
    except OSError:
        return None, "transcript_unreadable"
    return None, None


def _matches_identity(meta: Dict[str, Any], session_id: str) -> bool:
    identifiers = [meta.get("id"), meta.get("session_id")]
    present = [item for item in identifiers if isinstance(item, str) and item]
    return bool(present) and all(item == session_id for item in present)


def _matches_project(meta: Dict[str, Any], project_root: str, upstream: Any) -> bool:
    source = meta.get("source")
    if isinstance(source, dict) and "subagent" in source:
        return False
    cwd = meta.get("cwd")
    return isinstance(cwd, str) and upstream.same_project_path(cwd, project_root)


def _candidate_state(path: Path, request: Dict[str, Any], upstream: Any) -> Tuple[str, Optional[str]]:
    if path.name.startswith("rollout-") is False or path.suffix != ".jsonl":
        return "rejected", None
    meta, warning = _session_meta(path)
    if warning:
        return "malformed", warning
    if not meta:
        return "rejected", None
    if not _matches_identity(meta, request["event"]["session_id"]):
        return "identity_mismatch", None
    if not _matches_project(meta, request["project"]["root"], upstream):
        return "rejected", None
    return "accepted", None


def _fallback_candidates(roots: List[Path]) -> Tuple[bool, List[Path]]:
    candidates: List[Path] = []
    any_store = False
    for root in roots:
        any_store = True
        try:
            for candidate in root.rglob("rollout-*.jsonl"):
                contained = _contained_regular_file(str(candidate), [root])
                if contained is not None:
                    candidates.append(contained)
        except OSError:
            continue
    candidates.sort(key=lambda item: _mtime(item), reverse=True)
    return any_store, candidates


def _mtime(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


def select_transcript(request: Dict[str, Any], upstream: Any) -> Tuple[Optional[Path], str, str, List[str]]:
    transcript = request["transcript"]
    roots = [root for value in transcript["session_store_roots"] if (root := _canonical_directory(value))]
    warnings: List[str] = []

    if transcript["host_path_state"] == "validated":
        host = _contained_regular_file(transcript["host_path"], roots)
        if host is not None:
            state, warning = _candidate_state(host, request, upstream)
            if state == "accepted":
                return host, "host_path", "", warnings
            if state == "identity_mismatch":
                return None, "none", "session_identity_mismatch", warnings
            if state == "malformed":
                if warning:
                    warnings.append(warning)
                return None, "none", "transcript_unreadable" if warning == "transcript_unreadable" else "malformed_transcript", warnings
        warnings.append("transcript_path_rejected")
        if not transcript["allow_scan_fallback"]:
            return None, "none", "transcript_path_rejected", warnings
    elif transcript["host_path_state"] == "rejected":
        warnings.append("transcript_path_rejected")
        if not transcript["allow_scan_fallback"]:
            return None, "none", "transcript_path_rejected", warnings
    elif not transcript["allow_scan_fallback"]:
        return None, "none", "no_session_store", warnings

    if not roots:
        return None, "none", "no_session_store", warnings
    warnings.append("scan_fallback_used")
    any_store, candidates = _fallback_candidates(roots)
    if not any_store:
        return None, "none", "no_session_store", warnings
    malformed_outcome = ""
    for candidate in candidates:
        state, warning = _candidate_state(candidate, request, upstream)
        if state == "accepted":
            return candidate, "session_store_fallback", "", warnings
        if state == "malformed":
            if warning:
                warnings.append(warning)
            malformed_outcome = "transcript_unreadable" if warning == "transcript_unreadable" else "malformed_transcript"
    if malformed_outcome:
        return None, "none", malformed_outcome, list(dict.fromkeys(warnings))
    return None, "none", "no_matching_session", warnings


def _record_warning(record: Dict[str, Any]) -> Optional[str]:
    record_type = record.get("type")
    if not isinstance(record_type, str):
        return "invalid_json_record"
    if record_type not in KNOWN_RECORD_TYPES:
        return "unknown_transcript_record"
    if record_type in {"event_msg", "response_item"}:
        payload = record.get("payload")
        if not isinstance(payload, dict):
            return "invalid_json_record"
        payload_type = payload.get("type")
        if not isinstance(payload_type, str):
            return "invalid_json_record"
        known = KNOWN_EVENT_TYPES if record_type == "event_msg" else KNOWN_RESPONSE_TYPES
        if payload_type not in known:
            return "unknown_transcript_record"
    if record_type in {"user", "assistant"} and not isinstance(record.get("message"), dict):
        return "invalid_json_record"
    if record_type == "response_item" and record.get("payload", {}).get("type") == "message":
        role = record["payload"].get("role")
        if not isinstance(role, str):
            return "invalid_json_record"
    return None


def _parse_transcript(path: Path) -> Tuple[Optional[List[Dict[str, Any]]], List[str], Optional[str]]:
    records: List[Dict[str, Any]] = []
    warnings: List[str] = []
    try:
        with path.open("rb") as stream:
            for line_number, raw in enumerate(stream):
                record, warning = _decode_record(raw)
                if warning:
                    warnings.append(warning)
                    return None, list(dict.fromkeys(warnings)), "malformed_transcript"
                if not record:
                    continue
                shape_warning = _record_warning(record)
                if shape_warning == "invalid_json_record":
                    warnings.append(shape_warning)
                    return None, list(dict.fromkeys(warnings)), "malformed_transcript"
                if shape_warning:
                    warnings.append(shape_warning)
                record["_line_num"] = line_number
                records.append(record)
    except OSError:
        return None, warnings, "transcript_unreadable"
    return records, list(dict.fromkeys(warnings)), None


def _response_message_fingerprints(records: List[Dict[str, Any]], after_line: int, upstream: Any) -> List[Tuple[str, str, int]]:
    fingerprints: List[Tuple[str, str, int]] = []
    for record in records:
        line = record.get("_line_num")
        payload = record.get("payload")
        if (
            isinstance(line, int) and line > after_line
            and record.get("type") == "response_item" and isinstance(payload, dict)
            and payload.get("type") == "message" and payload.get("role") in {"user", "assistant"}
        ):
            content = upstream.text_content(payload.get("content"))
            if content:
                fingerprints.append((payload["role"], content, line))
    return fingerprints


def _event_conversation(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = record.get("payload")
    if record.get("type") != "event_msg" or not isinstance(payload, dict):
        return None
    payload_type = payload.get("type")
    role = "user" if payload_type == "user_message" else "assistant" if payload_type == "agent_message" else None
    content = payload.get("message")
    line = record.get("_line_num")
    if role is None or not isinstance(content, str) or not isinstance(line, int) or not content:
        return None
    if role == "user":
        if content.startswith(("<local-command", "<command-", "<task-notification")) or len(content) <= 20:
            return None
        return {"role": role, "content": content, "line": line}
    return {"role": role, "content": content, "tools": [], "line": line}


def _normalize_messages(
    records: List[Dict[str, Any]], after_line: int, upstream: Any
) -> Tuple[List[Dict[str, Any]], List[str]]:
    normalized = upstream.extract_messages_after(records, after_line)
    response_messages = _response_message_fingerprints(records, after_line, upstream)
    warnings: List[str] = []
    events = []
    for record in records:
        line = record.get("_line_num")
        if not isinstance(line, int) or line <= after_line:
            continue
        event = _event_conversation(record)
        if event is None:
            continue
        exact_pair = any(
            role == event["role"] and content == event["content"] and abs(response_line - line) <= 1
            for role, content, response_line in response_messages
        )
        if exact_pair:
            warnings.append("duplicate_record_suppressed")
        elif response_messages:
            warnings.append("unknown_transcript_record")
        else:
            if event["role"] == "assistant":
                event["content"] = event["content"][:600]
            events.append(event)
    normalized.extend(events)
    normalized.sort(key=lambda item: item.get("line", -1))
    return normalized, list(dict.fromkeys(warnings))


def _render_report(
    session: Path,
    last_update_file: str,
    last_update_line: int,
    messages: List[Dict[str, Any]],
    budget: Dict[str, Any],
) -> Optional[str]:
    lines = [
        "[planning-with-files] SESSION CATCHUP DETECTED",
        f"Previous session: {session.stem}",
        "Runtime: codex",
        f"Last planning update: {last_update_file} at message #{last_update_line}",
        f"Unsynced messages: {len(messages)}",
        "",
        "--- UNSYNCED CONTEXT ---",
    ]
    for message in messages[-budget["max_messages"]:]:
        if message["role"] == "user":
            content = message["content"]
            if len(content) > budget["user_untruncated_chars"]:
                content = (
                    content[:budget["user_head_chars"]]
                    + "\n" + budget["truncation_marker"] + "\n"
                    + content[-budget["user_tail_chars"]:]
                )
            lines.append(f"USER: {content}")
        else:
            content = message.get("content")
            if content:
                lines.append(f"CODEX: {content[:budget['assistant_chars']]}")
            tools = message.get("tools")
            if tools:
                lines.append(f"  Tools: {', '.join(tools[:budget['max_tools_per_message']])}")
    lines.extend([
        "",
        "--- RECOMMENDED ---",
        "1. Run: git diff --stat",
        "2. Read: task_plan.md, progress.md, findings.md",
        "3. Update planning files based on above context",
        "4. Continue with task",
    ])
    report = "\n".join(lines)
    return report if len(report) <= budget["max_report_chars"] else None


def execute(request: Dict[str, Any], upstream: Any) -> Dict[str, Any]:
    if not request["project"]["planning_enabled"]:
        return runtime_result("planning_disabled", request)
    if request["project"]["session_attachment"] == "detached":
        return runtime_result("session_not_attached", request)
    if request["event"]["name"] != "SessionStart":
        return runtime_result("invalid_request", request)
    if request["project"]["plan_state"] == "none":
        return runtime_result("no_plan", request)

    session, selected, outcome, warnings = select_transcript(request, upstream)
    if session is None:
        return runtime_result(outcome, request, warnings=warnings)

    records, parse_warnings, parse_outcome = _parse_transcript(session)
    warnings.extend(parse_warnings)
    warnings = list(dict.fromkeys(warnings))
    if records is None:
        return runtime_result(
            parse_outcome or "runtime_error",
            request,
            selected_transcript=selected,
            selected_transcript_path=str(session),
            warnings=warnings,
        )
    last_update_line, last_update_file = upstream.find_last_planning_update(records)
    if last_update_line < 0 or last_update_file is None:
        return runtime_result(
            "no_planning_update", request, selected_transcript=selected,
            selected_transcript_path=str(session), warnings=warnings,
        )
    messages_after, normalization_warnings = _normalize_messages(records, last_update_line, upstream)
    warnings = list(dict.fromkeys(warnings + normalization_warnings))
    if not messages_after:
        return runtime_result(
            "no_unsynced_context", request, selected_transcript=selected,
            selected_transcript_path=str(session), warnings=warnings,
        )
    report = _render_report(session, last_update_file, last_update_line, messages_after, request["output_budget"])
    if report is None:
        return runtime_result(
            "output_budget_exceeded", request, selected_transcript=selected,
            selected_transcript_path=str(session), warnings=warnings,
        )
    return runtime_result(
        "report_emitted", request, selected_transcript=selected,
        selected_transcript_path=str(session), report=report, warnings=warnings,
    )


def run_request(value: Any, *, require_posix: bool = True) -> Dict[str, Any]:
    try:
        request = validate_request(value, require_posix=require_posix)
    except InvalidRequest:
        return runtime_result("invalid_request", value)
    if not request["project"]["planning_enabled"]:
        return runtime_result("planning_disabled", request)
    if request["project"]["session_attachment"] == "detached":
        return runtime_result("session_not_attached", request)
    try:
        return execute(request, _load_upstream())
    except (AttributeError, KeyError, OSError, TypeError, UnicodeError, ValueError, RuntimeError):
        return runtime_result("runtime_error", request)


def diagnostic_result(result: Dict[str, Any]) -> Dict[str, Any]:
    diagnostic = dict(result)
    if diagnostic.get("inject") is True:
        diagnostic["outcome"] = "diagnostic_report_available"
    diagnostic["inject"] = False
    diagnostic["report"] = None
    return diagnostic


def main() -> int:
    diagnostic_only = sys.argv[1:] == ["--diagnostic"]
    invalid_arguments = bool(sys.argv[1:]) and not diagnostic_only
    try:
        raw = sys.stdin.buffer.read()
        value = None if invalid_arguments else json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, OSError):
        value = None
    result = run_request(value)
    if diagnostic_only:
        result = diagnostic_result(result)
    sys.stdout.write(json.dumps(result, ensure_ascii=True, separators=(",", ":")) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
