#!/usr/bin/env python3
"""Unshipped Phase 3 controlled-snapshot feasibility prototype.

This self-contained handoff bundle is deliberately outside the trusted
runtime/Release graph. It validates Linux primitives and failure semantics
before `runtime/owned-plan.py` exists; it is not a production entrypoint.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
from typing import Callable


sys.dont_write_bytecode = True


BUNDLE_ROOT = Path(__file__).resolve().parent
RESOLVER = BUNDLE_ROOT / "upstream/resolve-plan-dir.sh"
INJECTOR = BUNDLE_ROOT / "upstream/inject-plan.sh"
MAX_INPUT_BYTES = 1_000_000
MAX_CONTEXT_CHARS = 20_000
SAFE_PATH = "/usr/local/bin:/usr/bin:/bin"


class SnapshotFailure(Exception):
    """A reason-coded, non-injecting prototype failure."""

    def __init__(self, outcome: str):
        super().__init__(outcome)
        self.outcome = outcome


def minimal_env(*, temp_root: str | None = None, plan_id: str | None = None) -> dict[str, str]:
    env = {"PATH": SAFE_PATH, "LC_ALL": "C", "LANG": "C"}
    if temp_root is not None:
        env["TMPDIR"] = temp_root
    if plan_id is not None:
        env["PLAN_ID"] = plan_id
    return env


def _identity(info: os.stat_result) -> tuple[int, int, int, int, int, int]:
    return (
        info.st_dev,
        info.st_ino,
        info.st_size,
        info.st_mtime_ns,
        info.st_ctime_ns,
        stat.S_IFMT(info.st_mode),
    )


def _open_directory_chain(root_fd: int, parts: tuple[str, ...]) -> int:
    current = os.dup(root_fd)
    try:
        for part in parts:
            if part in {"", ".", ".."}:
                raise SnapshotFailure("plan_unreadable")
            next_fd = os.open(
                part,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=current,
            )
            os.close(current)
            current = next_fd
        return current
    except (OSError, SnapshotFailure):
        os.close(current)
        raise SnapshotFailure("plan_unreadable") from None


def safe_read(
    project_root: Path,
    relative: Path,
    *,
    required: bool,
    race_probe: Callable[[], None] | None = None,
) -> bytes | None:
    """Read one regular file beneath root without following path symlinks.

    A second open verifies that the path still names the inode read. Metadata
    before/after the read detects writes to that inode. `race_probe` exists only
    to make replacement races deterministic in the prototype tests.
    """
    if relative.is_absolute() or ".." in relative.parts or not relative.parts:
        raise SnapshotFailure("plan_unreadable")
    root_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    try:
        root_fd = os.open(project_root, root_flags)
        parent_fd = _open_directory_chain(root_fd, relative.parts[:-1])
    except (OSError, SnapshotFailure):
        raise SnapshotFailure("plan_unreadable") from None
    finally:
        if "root_fd" in locals():
            os.close(root_fd)

    file_fd = None
    verify_fd = None
    try:
        flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
        try:
            file_fd = os.open(relative.name, flags, dir_fd=parent_fd)
        except FileNotFoundError:
            if required:
                raise SnapshotFailure("plan_unreadable")
            return None
        before = os.fstat(file_fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_INPUT_BYTES:
            raise SnapshotFailure("plan_unreadable")
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = os.read(file_fd, min(65_536, MAX_INPUT_BYTES + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_INPUT_BYTES:
                raise SnapshotFailure("plan_unreadable")
        after = os.fstat(file_fd)
        if race_probe is not None:
            race_probe()
        verify_fd = os.open(relative.name, flags, dir_fd=parent_fd)
        current = os.fstat(verify_fd)
        if _identity(before) != _identity(after) or _identity(after) != _identity(current):
            raise SnapshotFailure("plan_state_changed")
        return b"".join(chunks)
    except SnapshotFailure:
        raise
    except OSError:
        raise SnapshotFailure("plan_unreadable") from None
    finally:
        if file_fd is not None:
            os.close(file_fd)
        if verify_fd is not None:
            os.close(verify_fd)
        os.close(parent_fd)


def run_child(command: list[str], *, cwd: Path, env: dict[str, str], timeout: float) -> bytes:
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise SnapshotFailure("timeout") from None
    except OSError:
        raise SnapshotFailure("runtime_error") from None
    if result.returncode != 0 or result.stderr:
        raise SnapshotFailure("runtime_error")
    return result.stdout


def resolve_plan(project_root: Path, plan_id: str | None) -> tuple[Path | None, str]:
    output = run_child(
        ["/bin/sh", str(RESOLVER)],
        cwd=project_root,
        env=minimal_env(plan_id=plan_id),
        timeout=2.0,
    )
    try:
        text = output.decode("utf-8").strip()
    except UnicodeDecodeError:
        raise SnapshotFailure("runtime_error") from None
    candidate = Path(text) if text else project_root
    task = candidate / "task_plan.md"
    if not task.is_file():
        return None, "none"
    try:
        relative = candidate.relative_to(project_root)
    except ValueError:
        raise SnapshotFailure("plan_unreadable") from None
    return candidate, "legacy_root" if relative == Path(".") else "scoped"


def write_private_file(directory_fd: int, name: str, content: bytes) -> None:
    fd = os.open(
        name,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        0o600,
        dir_fd=directory_fd,
    )
    try:
        view = memoryview(content)
        while view:
            written = os.write(fd, view)
            view = view[written:]
        os.fsync(fd)
    finally:
        os.close(fd)


def snapshot_context(
    project_root: Path,
    plan_id: str | None = None,
    *,
    injector: Path = INJECTOR,
    injector_timeout: float = 3.0,
) -> dict[str, object]:
    canonical_root = Path(os.path.realpath(project_root))
    try:
        plan_dir, scope = resolve_plan(canonical_root, plan_id)
        if plan_dir is None:
            return {"outcome": "no_plan", "inject": False, "context": None}
        relative_dir = plan_dir.relative_to(canonical_root)
        task_relative = relative_dir / "task_plan.md"
        progress_relative = relative_dir / "progress.md"
        task = safe_read(canonical_root, task_relative, required=True)
        progress = safe_read(canonical_root, progress_relative, required=False)

        with tempfile.TemporaryDirectory(prefix="pwf-snapshot-") as temporary:
            snapshot = Path(temporary)
            os.chmod(snapshot, 0o700)
            directory_fd = os.open(snapshot, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
            try:
                write_private_file(directory_fd, "task_plan.md", task or b"")
                if progress is not None:
                    write_private_file(directory_fd, "progress.md", progress)
            finally:
                os.close(directory_fd)
            output = run_child(
                ["/bin/sh", str(injector), "--context=userprompt"],
                cwd=snapshot,
                env=minimal_env(temp_root=temporary),
                timeout=injector_timeout,
            )
            try:
                context = output.decode("utf-8")
            except UnicodeDecodeError:
                raise SnapshotFailure("runtime_error") from None
            if not context or len(context) > MAX_CONTEXT_CHARS:
                raise SnapshotFailure("output_budget_exceeded" if context else "runtime_error")
        if snapshot.exists():
            raise SnapshotFailure("runtime_error")
        return {
            "outcome": "context_emitted",
            "inject": True,
            "context": context,
            "plan_scope": scope,
            "plan_dir": str(plan_dir),
        }
    except SnapshotFailure as failure:
        return {"outcome": failure.outcome, "inject": False, "context": None}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root")
    parser.add_argument("--plan-id")
    args = parser.parse_args()
    result = snapshot_context(Path(args.project_root), args.plan_id)
    print(json.dumps(result, ensure_ascii=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
