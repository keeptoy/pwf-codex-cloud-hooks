# Findings & Decisions

## Requirements
- Deeply read and understand the current workspace project.
- Focus on the Codex Cloud sandbox initialization flow.
- Explain the role of `init-cloud-sandbox-v0.2.1.bash`, whose default path downloads a GitHub Release archive of this project and invokes its installer.
- Implement a small v0.2.2 compatibility patch after bootstrap installs upstream Skill v3.8.2.
- Patch must explicitly select Codex runtime, resolve Cloud sessions under `$CODEX_HOME/sessions`, recognize scoped `.planning`, be documented, and remain hash-controlled.

## Research Findings
- The repository is intentionally small: `init-cloud-sandbox-v0.2.1.bash`, `install.js`, `hooks/hook_adapter.py`, two Node test files, fixtures, README, package metadata, and an upstream pin manifest.
- `package.json` identifies version `0.2.1`, requires Node >=18, exposes `install.js` as the `pwf-codex-cloud-hooks` bin, and runs tests with Node's built-in test runner.
- `upstream-manifest.json` pins `OthmanAdi/planning-with-files` release `v3.8.2`, a specific commit/archive SHA-256, and hashes for three required skill files.
- The Bash entrypoint contains separate stages for prerequisites, PowerShell, Node.js, upstream planning skill, managed hooks installation, filesystem/TOML/hook protocol verification, and black-box test instructions.
- `install.js` has explicit code for atomic writes, lock acquisition, backup/manifest creation, managed TOML blocks, hook config merge/trust hashes, install/repair/doctor/uninstall commands.
- `hooks/hook_adapter.py` resolves the project/plan/skill, optionally runs session catch-up, and emits hook context.
- A pre-existing scoped plan exists under `.planning/2026-08-01-managed-runtime-modernization`; it may contain relevant historical analysis and must not be overwritten.
- Historical analysis reports nine passing test cases and a deliberate future modernization roadmap; the current `0.2.1` baseline installs only `SessionStart` and `UserPromptSubmit` and retains a temporary canary.
- Bash is strict (`set -Eeuo pipefail`) and environment-overridable. Defaults target `/opt/codex` on Debian/Ubuntu amd64, Node 24 via NVM, PowerShell 7.5.9, planning-with-files v3.8.2 via `skills@1.5.21`, and hooks v0.2.1.
- The default hooks asset is `https://github.com/keeptoy/pwf-codex-cloud-hooks/releases/download/v0.2.1/pwf-codex-cloud-hooks-v0.2.1.zip`, protected by a hard-coded SHA-256; its expected root directory is `pwf-codex-cloud-hooks/`.
- Hooks bootstrap sequence: temp dir -> curl download with retries/redirects -> SHA-256 check -> unzip -> require `pwf-codex-cloud-hooks/install.js` -> installer dry-run -> install -> doctor -> independent filesystem/TOML/Codex-feature/protocol checks.
- Installer calls always append JSON output plus explicit Codex home, Skill root, and managed-requirements paths.
- The upstream Skill is installed separately first from the pinned v3.8.2 GitHub tree. Bash checks three files exist but does not validate them against `upstream-manifest.json`.
- Verification demands an executable adapter and manifest, TOML-parses policy, requires exactly one handler for each managed event, checks the Codex Hooks feature, and directly exercises both event adapters for canaries.
- A fresh Codex Cloud task remains necessary for host-level black-box evidence; direct adapter tests cannot prove that Codex invoked the policy.
- `install.js` validates the pinned upstream Skill hashes before any lifecycle operation, closing the integrity gap left by Bash's existence-only check. Explicit and auto-discovered Skill roots share this validation.
- Managed runtime paths are derived under an absolute, non-root Codex home. Runtime is `<CODEX_HOME>/hooks/planning-with-files`, containing only executable `hook_adapter.py` and `installed-manifest.json`; unknown sibling entries make doctor non-repairably unhealthy.
- Managed requirements editing is ownership-scoped: existing hook array blocks referencing the owned adapter path are removed/replaced, unrelated blocks/text are preserved, `[features].hooks` is enabled, and `[hooks].managed_dir` is created only if absent. An existing managed directory must contain the adapter path or install fails closed.
- The installed commands deliberately use absolute `/usr/bin/python3`; the installer refuses to proceed if it does not exist. Its legacy JSON/config cleanup uses `python3` without `/usr/bin` only in the non-managed representation returned by exported helpers, not in the final managed TOML.
- Installation uses a directory lock, timestamped backup of config/hooks/requirements/runtime, adapter copy+chmod 0755, atomic requirements write mode 0644, manifest schema 3 write, then doctor. The lock is always released, but changes are not transactionally rolled back if a later write or doctor fails; the backup is the recovery artifact.
- Manifest fingerprints package version, upstream pin, Skill root, source adapter, managed requirements full content, unowned requirements projection, and event list. This enables repair to distinguish owned drift (repairable) from unowned/provenance/manifest/unknown-runtime drift (blocked).
- Repair reconstructs managed blocks only when the unowned base is unchanged and requires the reconstructed full hash to equal the manifest. It repairs adapter/owned policy, backs up first, and does not rewrite the manifest.
- Uninstall also backs up first, removes owned TOML hook blocks, cleans legacy JSON/trust entries if present in an old manifest, deletes the managed runtime recursively, and leaves unrelated state intact.
- Adapter behavior is advisory/read-only: tolerate malformed/empty stdin, resolve cwd, find Skill by approved search order, resolve active/newest/root plan, run catch-up only at SessionStart, inject first 50 plan lines plus last 20 progress lines, and always emit an event canary inside `hookSpecificOutput.additionalContext`.
- The adapter does not validate realpath containment for scoped plan directories and reads plan files without catching decoding/I/O errors. These are documented future hardening items, not current guarantees.
- Both the Bash file and adapter are valid UTF-8 at the byte level, but some source strings appear already mojibaked when rendered; exact code points still need confirmation.
- Tests use self-contained temporary Codex homes/projects and do not touch live `/opt/codex` or `/etc/codex/requirements.toml`.
- Three adapter tests cover scoped SessionStart, active-plan UserPromptSubmit, and no-plan canary-only output. They do not cover malformed stdin, invalid event, newest/root fallback, catch-up failures, timeouts, symlinks, or read errors.
- Six installer tests cover dry-run, incompatible managed-dir rejection, preservation/idempotency/doctor/uninstall, repairable owned drift, blocked unknown drift, and byte-for-byte backup restoration.
- Backup restoration is performed manually by test code; the CLI has no restore command and failed installs do not auto-restore.
- README distinguishes the global Skill, Codex Skill discovery, and this repository's managed deployment/governance layer. It labels the larger runtime-bundle architecture as future work, not current `0.2.1` behavior.
- Release packaging is an implicit external workflow: there is no package/build script. The zip must place `install.js`, `package.json`, `upstream-manifest.json`, and `hooks/hook_adapter.py` beneath the configured archive root.
- ASCII-safe source inspection confirms the apparent mojibake was only terminal decoding: the Bash black-box prompt contains valid Chinese and the adapter marker contains a true Unicode em dash.
- All three fixture hashes exactly match `upstream-manifest.json`; the tests therefore exercise the same approved Skill-file identity required in production.
- Local Node 24.14.1/npm 11.11.0/Python 3.13.5 are available. Bash is absent from this Windows environment, so native Bash syntax/execution checks are unavailable here.
- Direct remote-page fetch for the GitHub v0.2.1 release failed with a cache miss; use a search query or GitHub API fallback rather than repeating the same request.
- Web search did not index the small repository/release, and direct GitHub API opening was rejected by the browser safety layer. Remote asset metadata is therefore not yet independently verified.
- A read-only GitHub API check confirmed `v0.2.1` is a non-draft, non-prerelease release published 2026-08-01T04:09:54Z. Its sole named package asset is 41,031 bytes and GitHub reports the exact SHA-256 embedded in the bootstrap.
- Direct zip inspection independently reproduced that SHA-256 and found 19 entries rooted exactly at `pwf-codex-cloud-hooks/`. It includes installer, package metadata, upstream manifest, adapter, tests/fixtures, README, LICENSE, and `.gitignore`.
- The release zip intentionally does not contain `init-cloud-sandbox-v0.2.1.bash`; the bootstrap is the external/pinned setup artifact that downloads the package, not a file recursively distributed inside the package.
- Local hashes of `install.js`, `package.json`, `upstream-manifest.json`, and `hook_adapter.py` exactly match their v0.2.1 release-archive entries. The workspace therefore represents the released installer payload for these authoritative files.
- Release zip audit used an isolated OS temp directory, did not execute archive content, verified cleanup containment, and removed the temporary download afterward.
- `resolve-plan-dir.sh` is hash-validated but never executed by the current managed adapter. The adapter reimplements a smaller resolver and omits upstream `PLAN_ID`, BOM handling, canonical containment, and portability fallbacks.
- Upstream resolver order is `PLAN_ID` -> active pointer -> newest scoped plan, with slug and canonical containment checks; legacy root fallback belongs to callers.
- `session-catchup.py` selects runtime from its own installed path: `/.codex/` selects Codex, `/.opencode/` selects OpenCode, otherwise it falls back to Claude discovery.
- Likely integration gap (inference): the default Skill root is `$HOME/.agents/skills/planning-with-files`, so catch-up normally sees neither marker and chooses the Claude branch inside Codex Cloud. The subprocess is invoked, but useful Codex catch-up output is not guaranteed unless installation path/runtime details alter this routing.
- In Codex mode, catch-up scans `~/.codex/sessions` (or `CODEX_SESSIONS_DIR`), filters substantial non-subagent sessions by cwd, finds the last planning-file update, and reports up to 15 later unsynced messages/actions.
- Runtime flow: managed TOML -> absolute `/usr/bin/python3` adapter -> Codex JSON stdin -> plan resolution plus optional catch-up -> ASCII-escaped JSON stdout with `hookSpecificOutput.additionalContext` -> model context.
- `node --check install.js` and an in-memory Python `compile()` of the adapter both pass in the current workspace.
- First sandboxed `npm test` was blocked at Node test-worker spawn (`EPERM`). With child-process permission, all nine cases started but failed for expected platform contracts: adapter tests call absent `python3` (Windows status 9009), installer tests require absent `/usr/bin/python3`.
- WSL is not installed, so there is no local Linux compatibility layer available to rerun the production-oriented suite.
- A first manual adapter smoke test attempted to build a nested fixture under the Windows user temp path, but the managed filesystem sandbox denied nested writes/cleanup. Use existing workspace directories for a read-only smoke test instead.
- Read-only manual adapter checks using the workspace passed: SessionStart active scoped plan, UserPromptSubmit active scoped plan, no-plan canary-only output, and invalid-event exit code 2.
- The current local `.codex/skills/.../session-catchup.py` emitted a Codex catch-up report (451 characters), while the byte-identical fixture script at a neutral/non-`.codex` path emitted nothing for the same project. This experimentally supports the path-based runtime-routing concern.
- Additional catch-up limitation: its initial “has planning files” guard checks only root-level `task_plan.md`, `progress.md`, or `findings.md`, not scoped `.planning/...` files. A scoped-only project can therefore skip catch-up before session discovery, even though the local adapter later resolves and injects that scoped plan.
- The installer records `skill_root` in the manifest, but the runtime adapter does not read the manifest or receive that explicit path; it re-discovers the Skill from the hook process user's home/CODEX_HOME. Installation-time and runtime user/environment differences can silently disable catch-up while leaving plan injection/canaries functional.
- Cloud black-box diagnostics established the actual runtime: root user, `HOME=/root`, `CODEX_HOME=/opt/codex`, real Skill path under `/root/.agents`, root planning files present, no `/root/.codex/sessions`, and real sessions under `/opt/codex/sessions`.
- The supplied `planning-with-files-3.8.2` tree is complete. Its production Skill copy `skills/planning-with-files/scripts/session-catchup.py` exactly matches the repository fixture SHA-256 `6476fd...e6de`; the top-level upstream script is a different distribution variant and must not be used as the patch input.
- Because `install.js` validates `required_skill_files`, bootstrap must apply the compatibility patch before invoking the installer, and the manifest must distinguish pristine upstream input from the accepted patched output.
- A direct `sed` append is unsuitable: the patch changes existing runtime selection/session resolution/control flow and must be exact, atomic, idempotent, and hash verified.
- The upstream production script has three stable transformation anchors: `get_codex_sessions`, `get_session_candidates`, and the root-only planning guard in `main`.
- The single deterministic transformation compiles and produces patched SHA-256 `fc765590dc32b3949027de97e33dad6a049daf148719ba1822598a6c146461e2` from pristine SHA-256 `6476fd9024d0cbb9bfb850119fd0beff7fb7cfab9c6683ce10e4cc8d830ce6de`.
- `upstream-manifest.json` schema 2 now separates pristine `required_skill_files` from accepted post-patch `managed_skill_files` and records the compatibility patch contract.
- The adapter now passes `PWF_RUNTIME=codex` only to the catch-up subprocess; other Hook behavior and the parent environment are unchanged.
- Contract testing confirms: pristine input is patched once, repeated apply is a no-op, check-only accepts the patched state, and an unknown modified hash is rejected.
- A synthetic Cloud-shaped regression passed with the Skill under a neutral `.agents` path, `PWF_RUNTIME=codex`, sessions available only through `$CODEX_HOME/sessions`, a scoped-only `.planning` plan, and an unsynced sentinel after a planning update.
- The new bootstrap should preserve `init-cloud-sandbox-v0.2.1.bash` and introduce a separate v0.2.2 artifact; its release checksum must remain a placeholder until the immutable v0.2.2 zip exists.
- `init-cloud-sandbox-v0.2.2.bash` now applies the release-bundled patcher after the pristine Skill install and before `install.js`; standalone `verify` also requires the patched hash.
- Direct adapter regression proves the adapter supplies `PWF_RUNTIME=codex` itself: the test removes that variable from the parent environment yet receives `Runtime: codex` and the unsynced sentinel.
- The supplied upstream source tree remains untouched and serves only as a reference; production tests copy the pristine checked-in fixture and patch the temporary copy.
- The Windows test harness is now portable for Python command discovery. Five cases pass locally; the six installer cases still stop at the intentional Linux production preflight for `/usr/bin/python3`.
- The Cloud sample's `uid=0`, `HOME=/root`, and successful Managed Hook execution rule out an install-user/Hook-user mismatch for that sample only. A future non-root Hook deployment needs its own readable-Skill/session-store check.
- `v0.2.2` packaging is not yet releasable: its bootstrap intentionally rejects the all-zero `HOOKS_SHA256` until the immutable asset is published and hashed.
- The locally supplied `planning-with-files-3.8.2/` source tree is now explicitly ignored and excluded from the Release ZIP contract; only the small owned patcher is packaged.
- A bootstrap `export CODEX_HOME=/opt/codex` is process-scoped and cannot by itself guarantee the variable in later Hook sessions. The installed adapter can safely derive the home from its owned `$CODEX_HOME/hooks/planning-with-files/hook_adapter.py` path and supplies that fallback only to catch-up.
- The legacy black-box draft mixed duplicate ad-hoc prompts, v0.2.1 names, read-only checks, and two state-changing drift tests without a reader-oriented sequence or risk labels.
- The v0.2.1 third-party catch-up recipe's root-only requirement is obsolete for v0.2.2: the compatibility patch recognizes scoped `.planning/<slug>/task_plan.md`, and update detection accepts any changed path ending in a planning filename.
- Its requirement to use `apply_patch` remains essential because Codex catch-up recognizes a successful structured `patch_apply_end` record rather than arbitrary shell file writes.
- Sentinel text alone is weak evidence because it also appears in prior conversation. A valid catch-up pass must show the Runtime-injected report framing, `Runtime: codex`, a planning update line, a positive unsynced count, the unsynced context block, and the sentinel.
- The Markdown runbook should order tests by risk: read-only health, no-tool lifecycle, planning context creation, resume catch-up, owned repair, then unknown-drift fail-closed.
- The root planning artifacts belong to the v0.2.2 Cloud catch-up compatibility delivery, not the older managed-runtime-modernization roadmap; keep both as separate scoped plans and activate the v0.2.2 plan until its external release gates finish.
- The Cloud `npm test` failure on `init-cloud-sandbox-v0.2.1.bash` was caused by a repository-history assertion inside `skill-patch.test.js`. v0.2.1 is not an input to the v0.2.2 patch/runtime contract and is intentionally absent from the current Release workspace, so the test must validate v0.2.2 in isolation.
- Cloud transcript diagnostics proved the missing sentinel was present in a standard post-update `response_item/message/user` record. `extract_messages_after` retained the full content, but report rendering used `msg['content'][:300]`, so a long Cloud PR-feedback wrapper hid the trailing user instruction.
- Final Cloud acceptance passed the complete A—F runbook against the pinned v0.2.2 package. The accepted resume report observed the full catch-up framing, `Runtime: codex`, scoped planning update, positive unsynced count, long-wrapper tail sentinel, and Planning context; repair, unknown drift fail-closed, backup restoration, and final healthy doctor also passed.
- Published v0.2.2 Release ZIP SHA-256: `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84`. This closes the final packaging gate; later work belongs to v0.3.0 Managed Runtime Modernization.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Build a call/data-flow map from shell entrypoint through installed runtime assets | This exposes the actual cross-file contract and failure boundaries. |
| Treat the `.agents` catch-up mismatch as an inference | Code proves routing, but the real Cloud filesystem/session behavior was not executed here. |
| Package a deterministic patcher rather than embed brittle text edits in Bash | Keeps transformation logic testable while bootstrap remains the orchestrator. |
| Installer accepts only the patched catch-up hash for v0.2.2 | Prevents an unpatched installation from reporting healthy. |
| Preserve the original upstream hashes in the manifest | Maintains verifiable provenance rather than relabeling patched content as upstream. |
| Apply the patch after extracting the hooks release but before invoking install.js | The release supplies the versioned patcher and manifest contract that installer validation then enforces. |
| Keep the `/usr/bin/python3` installer preflight unchanged | It is a production Cloud safety contract; weakening it solely for native Windows tests would reduce assurance. |
| Require a real resume black box after publishing v0.2.2 | Direct scripts and adapter subprocess tests prove components, but only a new Cloud session proves host lifecycle invocation. |
| Preserve bounded user-message head and tail in the compatibility patch | Keeps catch-up injection bounded while retaining trailing user instructions that Cloud wrappers can push beyond the first 300 characters. |
| Collapse provisional multi-stage logic into one pre-release patch | There are no published installations to migrate, and disposable Cloud sandboxes always begin with the pinned pristine upstream Skill. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| The planning skill's catch-up helper returned exit code 1 without details | No prior planning files existed, so a clean analysis session was initialized. |
| PowerShell passed `tests/*.test.js` literally to `rg`, producing Windows error 123 | Use `rg` against the directory or enumerate matching files in PowerShell instead. |
| Chinese black-box instructions rendered as mojibake in default PowerShell output | ASCII-safe decoding proved the source text is correct UTF-8 Chinese; no source corruption. |
| A combined planning patch failed due to mismatched context ordering | Retried with exact local context and recorded the error. |
| Combined README/fixture output exceeded the terminal token limit | README was captured; large fixtures will be inspected in bounded chunks. |
| `bash` is not installed in the current Windows execution environment | Use available Node/Python checks and report Bash syntax as historically verified but not reproducible here. |
| Direct GitHub release-page open returned a web cache miss | Switch to search/API-based discovery. |
| Web search found no target release and browser rejected the GitHub API URL | Resolved via approved read-only GitHub API and asset download checks. |
| Sandboxed Node test runner could not spawn workers (`EPERM`) | Re-ran with approved child-process permission. |
| All nine tests fail on Windows after spawning | Expected Linux assumptions: `python3` command and `/usr/bin/python3` path are absent; not evidence of a Linux regression. |
| Manual temp fixture could not create nested files under the managed Windows temp directory | Avoid temp writes and use existing workspace/no-plan directories for smoke checks. |
| First new adapter regression expected an obsolete canary phrase | The actual output showed the entire catch-up chain succeeded; assert the stable `PWF_GLOBAL_HOOK_CANARY_V1` marker. |
| Full 11-case suite reports six installer failures on Windows | They all stop at missing `/usr/bin/python3`; retain the production check and rerun those cases on Linux/Cloud. |

## Resources
- `init-cloud-sandbox-v0.2.2.bash` (current Cloud bootstrap release candidate)
- `install.js` (managed installer and lifecycle CLI)
- `hooks/hook_adapter.py` (runtime adapter)
- `upstream-manifest.json` (pinned upstream provenance)
- `.planning/2026-08-01-managed-runtime-modernization/` (historical project analysis)
