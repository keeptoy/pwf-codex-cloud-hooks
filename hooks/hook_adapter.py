#!/usr/bin/env python3
"""Read-only SessionStart/UserPromptSubmit adapter for planning-with-files."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import sys

CANARY = "PWF_GLOBAL_HOOK_CANARY_V1"
EVENTS = {"SessionStart", "UserPromptSubmit"}
SLUG = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]*$")


def load_payload() -> dict:
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, OSError):
        return {}


def project_root(payload: dict) -> Path:
    candidate = payload.get("cwd")
    return Path(candidate).resolve() if isinstance(candidate, str) and candidate else Path.cwd().resolve()


def skill_root() -> Path | None:
    home = Path.home()
    codex_home = Path(os.environ.get("CODEX_HOME", home / ".codex"))
    for candidate in (
        home / ".agents/skills/planning-with-files",
        codex_home / "skills/planning-with-files",
        home / ".codex/skills/planning-with-files",
    ):
        if (candidate / "SKILL.md").is_file():
            return candidate.resolve()
    return None


def resolve_plan(root: Path) -> Path | None:
    planning = root / ".planning"
    active = planning / ".active_plan"
    if active.is_file():
        slug = active.read_text(encoding="utf-8").strip()
        candidate = planning / slug
        if SLUG.fullmatch(slug) and candidate.is_dir() and (candidate / "task_plan.md").is_file():
            return candidate
    scoped = [p for p in planning.iterdir()] if planning.is_dir() else []
    scoped = [p for p in scoped if p.is_dir() and not p.name.startswith(".") and SLUG.fullmatch(p.name) and (p / "task_plan.md").is_file()]
    if scoped:
        return max(scoped, key=lambda p: p.stat().st_mtime)
    if (root / "task_plan.md").is_file():
        return root
    return None


def catchup(root: Path, skill: Path | None) -> str:
    if skill is None:
        return ""
    script = skill / "scripts/session-catchup.py"
    if not script.is_file():
        return ""
    result = subprocess.run(
        [sys.executable, str(script), str(root)],
        cwd=root,
        text=True,
        encoding="utf-8",
        capture_output=True,
        timeout=30,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def context(event: str, payload: dict, root: Path, plan: Path | None, skill: Path | None) -> str:
    source = payload.get("source", "unknown") if event == "SessionStart" else None
    marker = f"{CANARY} event={event}" + (f" source={source}" if source is not None else "")
    blocks = [marker]
    if event == "SessionStart":
        report = catchup(root, skill)
        if report:
            blocks.append(report)
    if plan is not None:
        task = (plan / "task_plan.md").read_text(encoding="utf-8").splitlines()[:50]
        progress_file = plan / "progress.md"
        progress = progress_file.read_text(encoding="utf-8").splitlines()[-20:] if progress_file.is_file() else []
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
    output = context(event, payload, root, resolve_plan(root), skill_root())
    result = {"hookSpecificOutput": {"hookEventName": event, "additionalContext": output}}
    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
