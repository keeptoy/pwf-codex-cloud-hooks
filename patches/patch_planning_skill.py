#!/usr/bin/env python3
"""Apply the pinned Codex Cloud compatibility patch to Skill v3.8.2."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys


PATCH_ID = "PWF_CODEX_CLOUD_COMPAT_PATCH_V1"
TARGET = "scripts/session-catchup.py"


SESSION_DIR_ORIGINAL = """def get_codex_sessions(project_path: str) -> Iterable[Path]:
    sessions_dir = Path(os.path.expanduser(os.getenv('CODEX_SESSIONS_DIR', '~/.codex/sessions')))
    if not sessions_dir.exists():
"""

SESSION_DIR_PATCHED = """def get_codex_sessions(project_path: str) -> Iterable[Path]:
    # PWF_CODEX_CLOUD_COMPAT_PATCH_V1: Codex Cloud installs the runtime under
    # CODEX_HOME=/opt/codex while HOME remains /root. Prefer an explicit store,
    # then the configured Codex home, and retain the upstream user-home fallback.
    sessions_override = os.getenv('CODEX_SESSIONS_DIR', '').strip()
    codex_home = os.getenv('CODEX_HOME', '').strip()
    if sessions_override:
        sessions_dir = Path(os.path.expanduser(sessions_override))
    elif codex_home:
        sessions_dir = Path(os.path.expanduser(codex_home)) / 'sessions'
    else:
        sessions_dir = Path.home() / '.codex' / 'sessions'
    if not sessions_dir.exists():
"""

RUNTIME_ORIGINAL = """def get_session_candidates(project_path: str) -> Tuple[str, Iterable[Path]]:
    script_path = Path(__file__).resolve().as_posix().lower()
    if '/.codex/' in script_path:
        return 'codex', get_codex_sessions(project_path)
    if '/.opencode/' in script_path:
        # OpenCode dispatch is handled separately via SQLite (v2.38.0+).
        return 'opencode', []

    claude_project_dir = get_claude_project_dir(project_path)
"""

RUNTIME_PATCHED = """def get_session_candidates(project_path: str) -> Tuple[str, Iterable[Path]]:
    # PWF_CODEX_CLOUD_COMPAT_PATCH_V1: the Agent Skills standard installs under
    # ~/.agents, so script-path inference alone misclassifies Codex as Claude.
    # A managed adapter can select its known host explicitly; path inference
    # remains the backward-compatible fallback for other installations.
    runtime_override = os.getenv('PWF_RUNTIME', '').strip().lower()
    if runtime_override == 'codex':
        return 'codex', get_codex_sessions(project_path)
    if runtime_override == 'opencode':
        return 'opencode', []

    script_path = Path(__file__).resolve().as_posix().lower()
    if '/.codex/' in script_path:
        return 'codex', get_codex_sessions(project_path)
    if '/.opencode/' in script_path:
        # OpenCode dispatch is handled separately via SQLite (v2.38.0+).
        return 'opencode', []

    claude_project_dir = get_claude_project_dir(project_path)
"""

PLANNING_GUARD_ORIGINAL = """def main():
    project_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()

    # Check if planning files exist (indicates active task)
    has_planning_files = any(
        Path(project_path, f).exists() for f in PLANNING_FILES
    )
    if not has_planning_files:
        # No planning files in this project; skip catchup to avoid noise.
        return
"""

PLANNING_GUARD_PATCHED = """def has_planning_state(project_path: str) -> bool:
    root = Path(project_path)
    if any((root / filename).is_file() for filename in PLANNING_FILES):
        return True

    # PWF_CODEX_CLOUD_COMPAT_PATCH_V1: the managed adapter supports scoped
    # plans under .planning, so catch-up must not return early for scoped-only
    # projects. This is only an existence guard; plan content is not read here.
    planning_root = root / '.planning'
    if not planning_root.is_dir():
        return False
    try:
        return any(
            candidate.is_dir()
            and not candidate.name.startswith('.')
            and (candidate / 'task_plan.md').is_file()
            for candidate in planning_root.iterdir()
        )
    except OSError:
        return False


def main():
    project_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()

    if not has_planning_state(project_path):
        # No planning files in this project; skip catchup to avoid noise.
        return
"""


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def transform_source(source: str) -> str:
    replacements = (
        (SESSION_DIR_ORIGINAL, SESSION_DIR_PATCHED, "Codex session directory"),
        (RUNTIME_ORIGINAL, RUNTIME_PATCHED, "explicit runtime"),
        (PLANNING_GUARD_ORIGINAL, PLANNING_GUARD_PATCHED, "scoped planning state"),
    )
    result = source
    for original, patched, label in replacements:
        if result.count(original) != 1:
            raise ValueError(f"expected exactly one {label} patch anchor")
        result = result.replace(original, patched, 1)
    return result


def load_contract(manifest_path: Path) -> tuple[str, str]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    patches = manifest.get("compatibility_patches", {})
    contract = patches.get(PATCH_ID)
    if not isinstance(contract, dict) or contract.get("target") != TARGET:
        raise ValueError(f"{PATCH_ID} contract missing or invalid")
    pristine = contract.get("upstream_sha256")
    patched = contract.get("patched_sha256")
    if not isinstance(pristine, str) or not isinstance(patched, str):
        raise ValueError(f"{PATCH_ID} hashes missing")
    managed = manifest.get("managed_skill_files", {}).get(TARGET)
    if managed != patched:
        raise ValueError("managed Skill hash does not match compatibility patch")
    return pristine, patched


def atomic_replace(target: Path, content: bytes) -> None:
    target_stat = target.stat()
    temporary = target.with_name(f".{target.name}.pwf-patch-{os.getpid()}")
    try:
        with temporary.open("xb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, stat.S_IMODE(target_stat.st_mode))
        os.replace(temporary, target)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def patch_skill(skill_root: Path, manifest_path: Path, check_only: bool) -> dict:
    skill = skill_root.resolve(strict=True)
    target = (skill / TARGET).resolve(strict=True)
    try:
        target.relative_to(skill)
    except ValueError as error:
        raise ValueError(f"patch target escapes Skill root: {target}") from error

    pristine_hash, patched_hash = load_contract(manifest_path)
    current = target.read_bytes()
    current_hash = sha256_bytes(current)
    if current_hash == patched_hash:
        return {
            "patch_id": PATCH_ID,
            "target": str(target),
            "changed": False,
            "sha256": current_hash,
        }
    if check_only:
        raise ValueError(f"compatibility patch missing: {current_hash}")
    if current_hash != pristine_hash:
        raise ValueError(f"refusing unknown Skill content: {current_hash}")

    patched_source = transform_source(current.decode("utf-8"))
    patched_bytes = patched_source.encode("utf-8")
    actual_patched_hash = sha256_bytes(patched_bytes)
    if actual_patched_hash != patched_hash:
        raise ValueError(
            f"patched hash mismatch: {actual_patched_hash}, expected {patched_hash}"
        )
    atomic_replace(target, patched_bytes)
    if sha256_bytes(target.read_bytes()) != patched_hash:
        raise ValueError("post-write compatibility patch verification failed")
    return {
        "patch_id": PATCH_ID,
        "target": str(target),
        "changed": True,
        "sha256": patched_hash,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("apply", "check"))
    parser.add_argument("--skill-root", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    return parser.parse_args()


def main() -> int:
    try:
        args = parse_args()
        result = patch_skill(
            args.skill_root,
            args.manifest.resolve(strict=True),
            check_only=args.command == "check",
        )
        print(json.dumps(result, sort_keys=True))
        return 0
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"healthy": False, "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
