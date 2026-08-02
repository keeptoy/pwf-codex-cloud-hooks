# pwf-codex-cloud-hooks

System-managed lifecycle Hooks that connect a global
[`OthmanAdi/planning-with-files`](https://github.com/OthmanAdi/planning-with-files)
Skill installation to Codex Cloud sessions.

> **Status:** `v0.2.2` is the published, Cloud-validated baseline. `v0.3.0` is
> the active development iteration for Managed Runtime Modernization and is not
> published yet. Its bootstrap checksum remains a guarded placeholder until the
> final v0.3.0 archive is built.

## Start here

This repository answers a deployment problem, not a planning-method problem:

- **planning-with-files** defines the planning workflow and stores project state
  in `task_plan.md`, `findings.md`, `progress.md`, and `.planning/`;
- **Codex Skill discovery** makes the workflow instructions available to the
  model;
- **this repository** installs trusted lifecycle Hooks so a Cloud session sees
  the relevant planning state at session start and on each user prompt.

If you are operating the current release, read [Current behavior](#current-behavior),
[Install and operate](#install-and-operate), and [Failure and repair model](#failure-and-repair-model).
If you are continuing the modernization, read [Target architecture](#target-architecture)
and [How to continue the work](#how-to-continue-the-work) before changing code.

## Why this repository exists

Codex can discover a standalone Skill from locations such as
`$HOME/.agents/skills/planning-with-files`, but Skill discovery alone does not
install global lifecycle Hooks. Copying upstream `.codex/` files into every
product repository would duplicate configuration, while a user-level
`~/.codex/hooks.json` installation would require separate trust and merge
management.

Codex Cloud instead needs a centrally reviewed deployment that:

1. installs the Hook runtime once under the active `$CODEX_HOME`;
2. registers absolute commands through `/etc/codex/requirements.toml`;
3. preserves unrelated administrator configuration;
4. pins and verifies the upstream Skill identity;
5. supports dry-run, diagnosis, guarded repair, backup, and uninstall;
6. provides a visible canary for black-box lifecycle verification.

That managed deployment and governance layer is the purpose of this repository.
It does not replace the planning-with-files Skill and does not create a second
project-memory format.

## Current behavior

### Published `v0.2.2` behavior inherited by `v0.3.0`

Until a reviewed modernization phase changes the runtime, the `v0.3.0` worktree
preserves the two managed events proven by `v0.2.2`:

| Event | Matcher | Current action | Verification state |
|---|---|---|---|
| `SessionStart` | `startup\|resume\|clear\|compact` | Runs the patched upstream `session-catchup.py` when resumable context exists, then injects the active plan and recent progress | automated and fresh-Cloud `resume` regressions passed |
| `UserPromptSubmit` | none | Injects the active plan and recent progress | Cloud-observed |

Both handlers are read-only and emit `PWF_GLOBAL_HOOK_CANARY_V1` as an owned
diagnostic marker.

The `v0.3.0` bootstrap initially installs the pristine upstream `v3.8.2` Skill and
then applies `PWF_CODEX_CLOUD_COMPAT_PATCH` to
`scripts/session-catchup.py`. The patch makes four narrow compatibility fixes:

1. the adapter explicitly launches catch-up with `PWF_RUNTIME=codex` instead of
   relying on the Skill's installation path to identify the runtime;
2. Codex sessions resolve in the order `CODEX_SESSIONS_DIR`,
   `$CODEX_HOME/sessions`, then `~/.codex/sessions`;
3. catch-up recognizes scoped `.planning/<slug>/task_plan.md` state as well as
   legacy root planning files;
4. long Cloud-wrapped user messages keep a bounded head and tail, so a trailing
   user instruction or regression sentinel is not hidden by the wrapper.

This is a downstream bridge, not a fork. Each disposable Cloud sandbox starts
from the pinned pristine upstream Skill, so there is no downstream patch-upgrade
chain. The patcher accepts only the recorded pristine or current patched
SHA-256, is idempotent, and blocks unknown content. It should be removed when a
pinned upstream release provides equivalent behavior.

For later Hook processes where `CODEX_HOME` is absent, the owned adapter derives
it from its installed path under `$CODEX_HOME/hooks/planning-with-files/` before
starting catch-up. The setup-shell export is therefore not a hidden runtime
dependency.

The adapter resolves project planning state in this order:

1. `.planning/.active_plan` when it names a valid scoped plan;
2. the most recently modified valid plan under `.planning/`;
3. legacy root-level `task_plan.md`.

When a plan exists, the current legacy-style implementation injects the first
50 lines of `task_plan.md`, the last 20 lines of `progress.md`, and a reminder to
read `findings.md`. When no plan exists, it emits only the event canary.

### What is not implemented yet

The following upstream capabilities are intentionally absent from the current
managed runtime:

- `PLANNING_DISABLED=1` one-shot opt-out;
- session attachment/isolation;
- canonical path-containment enforcement for plan directories;
- plan attestation and nonce framing;
- smart injection and structured ledger summaries;
- `PreCompact`, `PostCompact`, `PreToolUse`, `PostToolUse`, and
  `PermissionRequest`;
- advisory Stop completion messages and hard completion gating.

Do not infer these features from the pinned upstream Skill version. They become
managed behavior only after this repository explicitly imports, tests, installs,
and registers them.

## Current architecture

```text
Codex Cloud setup/maintenance
  |
  | downloads a pinned installer archive and verifies its checksum
  v
install.js
  |-- requires the hash-pinned compatibility patch in the global Skill
  |-- installs $CODEX_HOME/hooks/planning-with-files/hook_adapter.py
  |-- records $CODEX_HOME/hooks/planning-with-files/installed-manifest.json
  `-- merges managed Hook definitions into /etc/codex/requirements.toml
          |
          v
     /usr/bin/python3 <absolute-managed-path>/hook_adapter.py <event>
          |
          |-- parses Codex stdin JSON
          |-- optionally calls pinned Skill session-catchup.py
          `-- returns Codex hookSpecificOutput.additionalContext JSON
```

The current Python adapter still contains plan resolution and injection logic.
That was useful for establishing a small Cloud baseline, but it must not grow
into a long-lived parallel implementation of the upstream runtime.

## Trust and ownership boundaries

### This repository owns

- rendering and merging the managed Hook policy;
- absolute runtime paths and file permissions;
- installer locking and atomic writes;
- backup, doctor, guarded repair, and uninstall;
- installed-runtime inventory and drift classification;
- Codex Hook stdin/stdout protocol adaptation;
- Cloud rollout and canary verification;
- the temporary, deterministic Codex Cloud compatibility transformation.

### The upstream Skill currently owns

- planning instructions and file conventions;
- the canonical `resolve-plan-dir.sh` and `session-catchup.py` files whose hashes
  are checked by this release;
- planning-with-files behavior outside the two managed events implemented here.

### Ownership rule

Install and integrity checks fail closed. Runtime advisory failures should not
terminate the Codex loop, but unsafe or unverifiable content must not be injected.
Unknown or unrelated administrator drift is never silently absorbed by repair.

## Upstream pin

The current package approves:

- repository: `OthmanAdi/planning-with-files`;
- release: `v3.8.2`;
- commit: `b04ffd9c8f9f93919649d197e5d4ec1bfc06fa14`;
- release archive SHA-256:
  `aabc0781a5625b493d1291ab9b403babc7934ac6f0dcac5d90000087599ce894`.

`upstream-manifest.json` records both the pristine upstream input hash and the
managed post-patch hash of `session-catchup.py`. The patcher refuses any third
state, and `install.js` refuses installation unless the managed hash is present.
The modernization will expand this from selected Skill validation to a complete
allowlist of every upstream runtime file that the managed adapter can execute.

## Repository map

| Path | Purpose |
|---|---|
| `install.js` | Managed installer CLI: install, doctor, repair, and uninstall |
| `hooks/hook_adapter.py` | Current read-only Codex protocol adapter and legacy injection implementation |
| `patches/patch_planning_skill.py` | Atomic, idempotent, fail-closed `v3.8.2` Cloud compatibility patcher |
| `upstream-manifest.json` | Pinned upstream release identity and approved Skill-file hashes |
| `init-cloud-sandbox-v0.3.0.bash` | Development bootstrap for the active modernization iteration |
| `黑盒验证.md` | Beginner-oriented Cloud runbook for health, lifecycle, catch-up, repair, and fail-closed tests |
| `tests/hook-adapter.test.js` | Hook payload and no-plan behavior tests |
| `tests/installer.test.js` | Managed-policy ownership, drift, repair, backup, and uninstall tests |
| `tests/fixtures/planning-with-files/` | Self-contained pinned Skill fixture; not a second production Skill |
| `planning-with-files-3.8.2/` | Ignored local upstream reference tree supplied for development; never package it |
| `.planning/.active_plan` | Pointer to the current Managed Runtime Modernization plan |
| `.planning/2026-08-01-v0.2.2-cloud-catchup-compatibility/` | Completed implementation, Cloud-acceptance, and published-release record |
| `.planning/2026-08-01-managed-runtime-modernization/` | Active long-term managed-runtime modernization roadmap and audit history |

## Install and operate

### Prerequisites

- Linux Codex Cloud runtime with an absolute non-root `$CODEX_HOME`;
- `/usr/bin/python3`;
- Node.js 18 or newer;
- authorization to modify `/etc/codex/requirements.toml` for production install;
- the pinned planning-with-files Skill installed in an approved location.

By default the installer searches for the Skill in:

1. `$HOME/.agents/skills/planning-with-files`;
2. `$CODEX_HOME/skills/planning-with-files`;
3. `$HOME/.codex/skills/planning-with-files`.

Use `--skill-root PATH` to select an explicit installation.

### Local development and tests

```bash
npm test
python3 -m py_compile hooks/hook_adapter.py
node --check install.js
bash -n init-cloud-sandbox-v0.3.0.bash
git diff --check
```

The Node suite currently contains twelve **test cases**, not twelve atomic product
features. Several cases cover multiple related guarantees. Together they cover:

- both current Hook payloads and the no-plan canary;
- read-only dry-run;
- incompatible `managed_dir` rejection;
- merge preservation and idempotence;
- doctor and owned uninstall;
- repairable owned drift;
- rejection of unowned, manifest, and unknown-runtime drift;
- byte-for-byte restoration from installation backups;
- deterministic/idempotent patching and rejection of unknown Skill drift;
- guarded v0.3.0 checksum and patch-before-installer bootstrap ordering;
- `.agents` installation, `$CODEX_HOME/sessions`, scoped-plan, resume-adapter,
  and unsynced-sentinel catch-up behavior, including a sentinel after a long
  Cloud wrapper.

Tests use temporary Codex homes and projects and do not write the live
`$CODEX_HOME` or `/etc/codex/requirements.toml`.

### Installer CLI

For a non-production preview or test location, override both destination paths:

```bash
node install.js install --dry-run --json \
  --codex-home /absolute/test/codex \
  --skill-root /absolute/planning-with-files \
  --managed-requirements /absolute/test/requirements.toml
```

Production examples:

```bash
node install.js install --dry-run --json --codex-home /opt/codex
sudo node install.js install --json --codex-home /opt/codex
node install.js doctor --json --codex-home /opt/codex
sudo node install.js install --repair --json --codex-home /opt/codex
sudo node install.js uninstall --json --codex-home /opt/codex
```

`--managed-requirements PATH` defaults to `/etc/codex/requirements.toml`.
Production installation normally requires root. If an existing
`hooks.managed_dir` does not contain this package's adapter, installation fails
instead of replacing the administrator's managed Hook root.

### Cloud bootstrap

`init-cloud-sandbox-v0.3.0.bash` is the Debian/Ubuntu amd64 development
bootstrap. It can install prerequisites, PowerShell, Node.js, the Skill, and the managed Hook
package, then validate the filesystem, TOML, Codex feature state, adapter
protocol, and canaries.

Codex Cloud does not need to provide `CODEX_HOME` before setup. The bootstrap
exports `/opt/codex` as its default; an explicitly supplied value still wins.
Current Cloud evidence shows the variable is absent while the sandbox
initialization script runs, then is available as `/opt/codex` after the Codex
runtime starts, including in the observed managed Hook processes. The bootstrap
default is therefore an installation-stage fallback, not the source of the
later runtime variable.

```bash
sudo bash init-cloud-sandbox-v0.3.0.bash all
bash init-cloud-sandbox-v0.3.0.bash help
bash init-cloud-sandbox-v0.3.0.bash verify
```

The checked-in `v0.3.0` script deliberately keeps an all-zero `HOOKS_SHA256`
placeholder and fails before download while it remains unset. Documentation is
part of the ZIP, so its final SHA-256 can be calculated only after these release
files stop changing and the archive is rebuilt. Replace the placeholder manually
with that final archive hash immediately before publication. The published
`v0.2.2` release remains the Cloud-validated rollback baseline; v0.3.0 does not
require a local copy of the v0.2.2 bootstrap.

Component commands do not install their dependencies automatically. Use `all`
for the complete ordered workflow or follow the dependency notes printed by
`help`.

After setup succeeds, start a completely new Cloud task and perform the
black-box verification in [`黑盒验证.md`](黑盒验证.md). Seeing a canary by
manually reading files is not proof that the lifecycle Hook ran; the canary must
already be present in the new session's runtime context.

## Failure and repair model

Every write operation first backs up affected managed files. Normal `install`
can establish or upgrade owned state. `install --repair` is deliberately
narrower:

- it requires an intact schema-v3 owned manifest;
- the upstream pin, installation paths, and unowned requirements fingerprint
  must still match;
- it repairs only the owned adapter or owned managed-Hook definitions;
- unknown drift returns `REPAIR_BLOCKED_UNKNOWN_DRIFT` and requires Human review.

Upgrade once from `v0.2.0` with normal `install` before using repair. Repair does
not treat an older manifest as proof of ownership.

Operational response:

1. run `doctor`;
2. if `repairable` is true, preview `install --repair --dry-run` and then repair;
3. if blockers or `REPAIR_BLOCKED_UNKNOWN_DRIFT` appear, stop automation;
4. inspect requirements, runtime inventory, manifest, and backups;
5. use normal install only after the unexpected state is understood and approved.

## Target architecture

The approved modernization direction is a **fixed upstream source snapshot
packaged as a managed runtime bundle**:

```text
Codex
  |
  v
/etc/codex/requirements.toml
  |  absolute commands beneath managed_dir only
  v
$CODEX_HOME/hooks/planning-with-files/
  |-- hook_adapter.py                 # owned here: Codex protocol only
  |-- upstream/                       # exact allowlisted files from pinned release
  |   |-- resolve-plan-dir.sh
  |   |-- inject-plan.sh
  |   |-- session-catchup.py
  |   |-- attest-plan.sh
  |   |-- check-complete.sh
  |   |-- gate-stop.sh
  |   `-- ledger-summary.sh
  |-- compatibility-overlays.json     # temporary downstream deltas + retirement rules
  |-- installed-manifest.json
  `-- THIRD_PARTY_NOTICES.md
```

This is a target, not the current filesystem layout.

### Target responsibilities

`hook_adapter.py` will be intentionally thin and limited to:

- stdin JSON and event validation;
- `cwd` and `session_id` extraction;
- explicit Codex runtime, session-store, event/source, and output-budget request fields;
- supervised subprocess execution and timeout handling;
- stdout/stderr isolation;
- Codex `additionalContext`, `systemMessage`, and decision JSON;
- rollout canaries.

The pinned upstream runtime will own planning semantics:

- plan resolution and containment;
- opt-out and session isolation;
- injection shape;
- attestation and nonce framing;
- smart injection and ledger summaries;
- compact reminders and completion semantics.
- catch-up transcript normalization, diagnostic reason codes, and bounded reports.

`install.js` will continue to own deployment and governance:

- absolute managed commands;
- atomic install, backup, doctor, repair, and uninstall;
- upstream archive provenance and per-file hashes;
- deterministic compatibility overlays with pristine/patched hashes and retirement conditions;
- exact runtime allowlist and unknown-file rejection;
- staged event registration, rollout, rollback, and canaries.

### Why this design

- It avoids maintaining a second implementation of upstream planning behavior.
- It does not execute mutable scripts directly from a user's Skill directory.
- It keeps the actual managed runtime reproducible and reversible.
- It preserves this repository's stricter Cloud ownership and drift model.
- It imports only reviewed dependencies instead of copying all upstream `.codex/` files.
- It moves the Cloud-proven catch-up path out of the mutable global Skill and into
  the same owned inventory as the adapter.

### Modernization invariants

- preserve existing legacy-plan behavior unless a migration is explicit;
- add tests before enabling each new lifecycle event;
- keep managed commands beneath `managed_dir`;
- fail closed on runtime integrity and unsafe context injection;
- keep advisory runtime failures non-fatal to the Codex loop;
- make Runtime identity and session location explicit rather than inferring them
  from a Skill path or transient setup environment;
- keep injected catch-up output bounded while exposing detailed skip/failure
  reasons only through a non-injecting diagnostic surface;
- add hard Stop gating last and only behind an explicit mode.

## How to continue the work

The roadmap is intentionally stored as planning-with-files state so it survives
resume, clear, and context compaction.

### Restore context

From the repository root:

```bash
cat .planning/.active_plan
cat .planning/2026-08-01-managed-runtime-modernization/task_plan.md
cat .planning/2026-08-01-managed-runtime-modernization/progress.md
cat .planning/2026-08-01-managed-runtime-modernization/findings.md
git status --short --branch
```

Treat `task_plan.md` as the execution contract, `findings.md` as durable research
and decisions, and `progress.md` as the chronological implementation log.

### Published v0.2.2 baseline

- Patch, adapter/installer/bootstrap integration, automated regression coverage,
  Cloud acceptance, final packaging, and publication are complete.
- The complete A—F Cloud matrix in [`黑盒验证.md`](黑盒验证.md) passed on
  2026-08-01, including the long-wrapper unsynced sentinel and final doctor.
- Published Release ZIP SHA-256:
  `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84`.
- `.planning/2026-08-01-v0.2.2-cloud-catchup-compatibility/` retains the
  implementation, acceptance evidence, and release history.

### Active v0.3.0 modernization

`.planning/2026-08-01-managed-runtime-modernization/` is active again. The
v0.2.2 patch is now an explicit temporary compatibility-overlay milestone:
Phase 1 records its four Cloud-proven deltas and retirement rules; Phase 2 moves
catch-up into the owned verified runtime; Phase 3 removes global Skill discovery
and bootstrap patching after canonical prompt injection also migrates. New
lifecycle events remain deferred until this runtime boundary and its diagnostic
contract are complete.

### Working rules

1. Re-read the active plan before making architectural decisions.
2. Record research in `findings.md`, not in `task_plan.md`.
3. Update `progress.md` after implementation and test work.
4. Update phase status and `Next Step` together.
5. Preserve upstream files byte-for-byte where possible; put host translation in
   the local adapter.
6. Never point production at a moving branch or `latest` artifact.
7. Keep each lifecycle expansion in a separate, reviewable rollout.

The detailed phases, exit criteria, decisions, and verification matrix live in
`.planning/2026-08-01-managed-runtime-modernization/task_plan.md`. Audit evidence
and architectural rationale live in the sibling `findings.md`.

## Release workflow

1. Review and merge changes in this repository.
2. Run the full local and installer test matrix.
3. Build an immutable archive rooted at `pwf-codex-cloud-hooks/`. It must include
   `install.js`, `package.json`, `upstream-manifest.json`,
   `hooks/hook_adapter.py`, and `patches/patch_planning_skill.py`. Do not include
   the local `planning-with-files-3.8.2/` reference tree.
4. Inspect the final ZIP contents, then publish that exact archive.
5. Record the archive SHA-256 in `init-cloud-sandbox-v0.3.0.bash`; do not bypass
   its placeholder guard.
6. Run bootstrap install and doctor in a fresh environment.
7. Follow the `v0.3.0` regression procedure in
   [`黑盒验证.md`](黑盒验证.md) and require the
   resume canary, `Runtime: codex`, unsynced count, and sentinel.
8. Keep canaries until every newly enabled lifecycle path is proven.
9. Remove canaries in a separately reviewed change and recompute production hashes.

Never configure Cloud setup to download a moving branch or an unchecksummed
`latest` release.

## Safety summary

- preserve unrelated requirements and Hook handlers;
- install only owned runtime and remove only owned state;
- use atomic writes and an exclusive installer lock;
- verify pinned upstream identity and installed runtime;
- record full and unowned requirements hashes;
- block repair on unknown drift;
- use the system-managed Hook channel without
  `--dangerously-bypass-hook-trust` or private trust-state keys;
- require Human review for managed commands and unexpected policy state.

## License

This repository is MIT licensed. Before distributing substantial upstream
runtime code, Phase 1 requires preservation of the upstream MIT copyright and
permission notice in `THIRD_PARTY_NOTICES.md` or an equivalent reviewed notice.
