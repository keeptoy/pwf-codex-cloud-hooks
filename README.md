# pwf-codex-cloud-hooks

System-managed lifecycle Hooks that connect a global
[`OthmanAdi/planning-with-files`](https://github.com/OthmanAdi/planning-with-files)
Skill installation to Codex Cloud sessions.

> **Status:** `v0.2.2` remains the published stable baseline and
> `v0.3.0-alpha.1` the retained Phase 1 pre-release. `v0.3.0-alpha.2` activates
> the owned SessionStart catch-up runtime and has passed its complete
> fresh-Cloud Phase 2 hard acceptance. Alpha.2 is the rollback baseline for
> the next Phase 3 canonical UserPrompt-injection work.

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

### Accepted `v0.3.0-alpha.2` behavior

The worktree preserves the two events proven by `v0.2.2`, but Phase 2 now owns
the SessionStart catch-up execution boundary:

| Event | Matcher | Current action | Verification state |
|---|---|---|---|
| `SessionStart` | `startup\|resume\|clear\|compact` | Validates Host/session/project inputs, supervises the installed `owned-catchup.py`, then injects the active plan and recent progress | automated activation and complete alpha.2 Cloud acceptance passed |
| `UserPromptSubmit` | none | Injects the active plan and recent progress | Cloud-observed |

Both handlers are read-only and emit `PWF_GLOBAL_HOOK_CANARY_V1` as an owned
diagnostic marker.

The `v0.3.0` bootstrap leaves the global upstream `v3.8.2` Skill pristine.
The four Cloud compatibility deltas are applied only to the hash-pinned copy at
`runtime/upstream/session-catchup.py`:

1. the adapter/runtime contract identifies the runtime explicitly as `codex`;
2. the adapter validates the Host `transcript_path` first, then permits scanning
   only under explicit roots from `CODEX_SESSIONS_DIR`, `$CODEX_HOME/sessions`,
   or the installed managed-path fallback;
3. catch-up recognizes scoped `.planning/<slug>/task_plan.md` state as well as
   legacy root planning files;
4. long Cloud-wrapped user messages keep a bounded head and tail, so a trailing
   user instruction or regression sentinel is not hidden by the wrapper.

This is a downstream bridge, not a mutable global-Skill fork. The historical
patcher remains in the source tree only to reproduce and audit the owned overlay;
it is no longer included in the alpha.2 Release ZIP or called by the bootstrap.

For Hook processes where `CODEX_HOME` is absent, the adapter may derive the
session-store root from its installed path under
`$CODEX_HOME/hooks/planning-with-files/`. The setup-shell export is therefore
not a hidden runtime dependency and `/opt/codex` is not treated as permanent.

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
- archive: `https://github.com/OthmanAdi/planning-with-files/archive/refs/tags/v3.8.2.zip`;
- release archive SHA-256:
  `7dab03ae283da38d33b9d551c7ec621d1818b9f0f17cf9ced566d4accbfc6dd1`.

`upstream-manifest.json` records the pristine global-Skill hashes separately
from the managed owned-copy hash of `session-catchup.py`. `install.js` requires
the global Skill to remain pristine and installs only the exact allowlisted
owned runtime files beneath managed_dir.

## Repository map

| Path | Purpose |
|---|---|
| `install.js` | Managed installer CLI: install, doctor, repair, and uninstall |
| `hooks/hook_adapter.py` | Read-only Codex protocol adapter, SessionStart supervisor, and still-local UserPrompt injection |
| `patches/patch_planning_skill.py` | Historical overlay reproduction/audit tool; not shipped or run by alpha.2 |
| `tools/import_upstream_runtime.py` | Pinned-archive, allowlist-only runtime import and drift check |
| `tools/build_release.py` | Deterministic exact-allowlist Release ZIP builder and verifier |
| `runtime/owned-catchup.py` | Active Phase 2 SessionStart catch-up entrypoint and transcript trust boundary |
| `runtime/upstream/` | Four verified runtime files; catch-up is active, prompt/ledger files remain deferred |
| `THIRD_PARTY_NOTICES.md` | Complete upstream MIT attribution for redistributed runtime code |
| `upstream-manifest.json` | Manifest v3: archive, contracts, importer, license, source paths, modes, and file hashes |
| `contracts/` | Versioned runtime allowlist, overlay ledger, adapter/runtime schemas, and Release ZIP boundary |
| `docs/phase-1-runtime-contracts.md` | Human-readable Phase 1 contract and ownership guide |
| `docs/phase-2-owned-catchup.md` | Active SessionStart owned-runtime boundary and safety policy |
| `docs/phase-3-canonical-plan-context.md` | Selected Phase 3 prompt-context architecture, staged-contract lifecycle, compatibility decisions, budgets, and round gates |
| `docs/phase-3-upstream-invocation-options.md` | Overlay/snapshot/other route comparison, empirical evidence, and long-term Host/Driver standardization boundary |
| `docs/v0.3.0-alpha.1-cloud-smoke.md` | Retained Phase 1 pre-release publication and Cloud-smoke acceptance record |
| `docs/v0.3.0-alpha.2-cloud-hard-acceptance.md` | Alpha.2 SHA, inventory, permission, owned-runtime, and resume acceptance gate |
| `snapshot-prototype/` | Unreviewed, isolated Cloud-produced snapshot-route prototype reserved for the next architecture review; not current runtime or Release input |
| `init-cloud-sandbox-v0.3.0.bash` | Development bootstrap for the active modernization iteration |
| `PROJECT_UNDERSTANDING.md` | Durable current-state model, Cloud evidence, boundaries, and next-step context |
| `黑盒验证.md` | Beginner-oriented Cloud runbook for health, lifecycle, catch-up, repair, and fail-closed tests |
| `tests/hook-adapter.test.js` | Hook payload and no-plan behavior tests |
| `tests/installer.test.js` | Managed-policy ownership, drift, repair, backup, and uninstall tests |
| `tests/skill-patch.test.js` | Compatibility patch, guarded bootstrap, and Cloud-shaped catch-up regressions |
| `tests/contracts.test.js` | Phase 1 provenance, overlay, protocol, and artifact-boundary contract test |
| `tests/import-runtime.test.js` | Deterministic import, idempotence, checksum, source-drift, and inventory fail-closed tests |
| `tests/golden-output.test.js` | Six exact v0.2.2 Hook-output compatibility scenarios |
| `tests/cloud-fixtures.test.js` | Sanitized Cloud Hook schema, environment-stage, and catch-up JSONL regressions |
| `tests/release-package.test.js` | Deterministic ZIP inventory, metadata, mode, and bootstrap-separation test |
| `tests/owned-runtime.test.js` | Inactive request/result, Host transcript, fallback, identity, and containment tests |
| `tests/phase3-contracts.test.js` | Inactive Phase 3 prompt contracts and alpha.2 trusted-graph exclusion test |
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

The development Node suite currently registers forty-six **test cases**, not
forty-six atomic product features. On Windows, forty-three pass and three
Linux-only permission/runtime cases skip. The sealed alpha.2 snapshot remains
forty-five registered / forty-two pass / three skip; the additional case covers
only inactive Phase 3 contracts. Several cases cover multiple related
guarantees. Together they cover:

- both current Hook payloads and the no-plan canary;
- read-only dry-run;
- incompatible `managed_dir` rejection;
- merge preservation and idempotence;
- doctor and owned uninstall;
- repairable owned drift;
- rejection of unowned, manifest, and unknown-runtime drift;
- byte-for-byte restoration from installation backups;
- deterministic/idempotent patching and rejection of unknown Skill drift;
- guarded v0.3.0 checksum and pristine-Skill bootstrap ordering;
- `.agents` installation, `$CODEX_HOME/sessions`, scoped-plan, resume-adapter,
  and unsynced-sentinel catch-up behavior, including a sentinel after a long
  Cloud wrapper;
- Phase 1 runtime provenance, overlay anchors and retirement rules,
  adapter/runtime schemas, and the external-bootstrap Release boundary;
- deterministic allowlist import, archive/source hash rejection, exact managed
  output hashes, idempotence, and changed/unknown runtime rejection;
- six exact v0.2.2 Hook output goldens and two Cloud-shaped evidence contracts;
- multi-file install/doctor/repair/backup/uninstall inventory behavior;
- owned-runtime request/result, Host-path preference, explicit fallback,
  session identity, containment, and bounded compatibility output;
- backward-compatible session attachment/isolation, explicit opt-out, canonical
  plan/file containment, `PLAN_ID`/BOM precedence, and safe runtime outcomes;
- strict Codex JSONL normalization, conservative cross-family deduplication,
  content-free diagnostics, corruption/budget reason codes, and bounded
  child-process supervision;
- adapter activation/fail-open behavior, proof that mutable global catch-up is
  not executed, and Linux root/root plus synthetic cross-user gates;
- deterministic 18-entry alpha.2 ZIP construction with fixed metadata and external Bash.

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

The alpha.2 workflow targets `v0.3.0-alpha.2` and uses two stages: the external
bootstrap keeps an all-zero guard while ZIP bytes are being frozen, then only
that external bootstrap is sealed with the final ZIP SHA. Release sealing must
always be ordered: freeze the target version and ZIP contents, build and hash
the ZIP, write that version/package/SHA into the external bootstrap, hash the
sealed bootstrap, then publish and verify both assets. The published `v0.2.2`
release remains the stable-release fallback; the narrower modernization/Phase 3
rollback baseline is the Cloud-accepted alpha.2 release.

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
- it repairs only the owned adapter/runtime payload or owned managed-Hook definitions;
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
  |-- owned-catchup.py                # active SessionStart child runtime
  |-- upstream/                       # exact allowlisted files from pinned release
  |   |-- resolve-plan-dir.sh
  |   |-- inject-plan.sh
  |   |-- session-catchup.py
  |   `-- ledger-summary.sh
  |-- compatibility-overlays-v1.json  # temporary downstream deltas + retirement rules
  |-- installed-manifest.json
  `-- THIRD_PARTY_NOTICES.md
```

Managed Hook commands still register only `hook_adapter.py`. For SessionStart,
that adapter now validates an explicit v1 Host request and supervises the sibling
`owned-catchup.py`, which imports only the installed verified upstream copy.
UserPromptSubmit plan injection remains local until Phase 3. The global Skill is
pristine and is never executed for catch-up.

Phase 3 Round 1 selected and froze a separate managed-legacy prompt request/result
boundary and a 20,000-character whole-context ceiling. A post-freeze architecture
review selected a private legacy snapshot around the pristine resolver/injector;
multi-target overlay remains only a fallback. Those schemas are staged only:
they are intentionally absent from the alpha.2 runtime bundle, installer
inventory, Release allowlist, and bootstrap. Round 2 implements the owned path
without dispatching it; Round 3 activates it and removes the adapter's parallel
resolver/renderer.

The Phase 3 document, v1 schemas, and contract regression intentionally omit a
`candidate` filename suffix. Their identities are selected and stable; staged
versus active status is expressed by schema/document metadata and trusted-graph
membership. Round 2 promotes those same identities atomically unless the
contract itself changes incompatibly.

The Phase 1 v1 allowlist contains only those four upstream files. Attestation,
ledger mutation, phase mutation, completion, and Stop-gating scripts remain
explicitly deferred until their owning phases; they are not allowed into the
early runtime artifact.

### Target responsibilities

`hook_adapter.py` will be intentionally thin and limited to:

- stdin JSON and event validation;
- `cwd`, `session_id`, event-scoped `turn_id`, and validated Host
  `transcript_path` extraction;
- explicit Codex runtime, transcript/session-store fallback, event/source,
  project-root, and output-budget request fields;
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
- compact reminders and completion semantics;
- catch-up transcript normalization, diagnostic reason codes, and bounded reports.

The Host-provided `transcript_path` is the primary transcript selector. The
active Phase 2 entrypoint independently requires canonical containment,
rollout shape, matching session identity/cwd, and an explicit allowed root
before reading it, then uses only explicitly supplied session-store roots as a
compatibility fallback. Codex transcript JSONL is not a stable public interface.
The runtime normalizes the
observed families, rejects malformed UTF-8/JSON without partial injection, and
reports unknown or duplicate families without trusting them as conversation text.

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
- make Runtime identity and the validated Host transcript path explicit rather
  than inferring them from a Skill path or transient setup environment; retain
  session-store scanning only as a compatibility fallback;
- treat transcript JSONL record shapes as changeable Host data, not a stable
  schema owned by this repository;
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
All three Phase 1 rounds are complete locally: contracts and overlays are
frozen, the runtime is reproducibly imported, manifest/license provenance is
verified, exact inactive installation is fail-closed, Cloud/golden fixtures pass,
and the alpha.1 ZIP is deterministic. The pre-release download/SHA, install,
doctor, exact inventory, per-file hashes, adapter-only command boundary, and
compatibility smoke through resume have passed in Cloud. Phase 1 is complete;
Phase 2 Rounds 1–3 added and hardened the structured owned-catch-up path,
plan/session policy, transcript normalization, diagnostics, and supervisor
failure semantics. Round 4 activated catch-up, retired bootstrap/global Skill
mutation, and passed the complete alpha.2 fresh-Cloud hard acceptance. Alpha.2
is now the Phase 3 rollback baseline. Phase 3 Round 1 has completed the canonical
prompt-injection audit and frozen the owned-plan contracts, managed-legacy
compatibility boundary, two intentional output changes, and three-round rollout.
The selected PWF invocation strategy keeps upstream pristine and runs it against
a private, scrubbed legacy snapshot; the broader reusable target is a Host/Driver
ABI, not a claim that every Skill can use the same conversion technique. Round 2
remains pending, but implementation is paused for a separate review of the
tracked `snapshot-prototype/` and a re-evaluation of the Phase 3/4 round split.
The prototype commit/branch label is experimental metadata, not a beta release
or proof that the project has entered Round 2. New lifecycle events remain
deferred until this review and the runtime boundary/diagnostic contract are
complete.

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
3. Build an immutable archive rooted at `pwf-codex-cloud-hooks/` from the exact
   entry list and deterministic settings in
   `contracts/release-artifact-v1.json`. Do not use a repository-wide wildcard
   and do not include the local `planning-with-files-3.8.2/` reference tree.
4. Inspect the final ZIP contents and compute its SHA-256, but do not mutate the
   ZIP after this point.
5. Seal `init-cloud-sandbox-v0.3.0.bash` with the final version, package name,
   and ZIP SHA-256, then compute the sealed Bash SHA-256.
6. Publish both immutable assets and verify their uploaded hashes.
7. Run bootstrap install and doctor in a fresh environment.
8. Follow the `v0.3.0` regression procedure in
   [`黑盒验证.md`](黑盒验证.md) and require the
   resume canary, `Runtime: codex`, unsynced count, and sentinel.
9. Keep canaries until every newly enabled lifecycle path is proven.
10. Remove canaries in a separately reviewed change and recompute production hashes.

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

This repository is MIT licensed. Redistributed upstream runtime code retains
the complete upstream MIT copyright and permission notice in
`THIRD_PARTY_NOTICES.md`.
