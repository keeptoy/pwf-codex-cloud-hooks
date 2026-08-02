# Progress Log: Managed Runtime Modernization

## Session: 2026-08-01

### Current Status
- **Iteration:** v0.3.0 development; v0.2.2 published baseline.
- **Completed:** Phase 0 — repository audit and roadmap capture.
- **Completed:** Phase 0.5 — v0.2.2 Cloud evidence integration.
- **Next:** Phase 1 — runtime provenance, compatibility-overlay, host-contract, diagnostics, and artifact-boundary contract.
- **Active plan:** `2026-08-01-managed-runtime-modernization`.

### Actions Taken
- Inspected all tracked source, documentation, bootstrap, manifest, fixture, and test files.
- Compared the current tree with the initial `0.2.0` managed-Hook commit and the `0.2.1` evolution.
- Confirmed the package currently installs exactly two managed lifecycle events.
- Confirmed the suite contains nine passing test cases and catalogued what each case actually covers.
- Identified and corrected two stale/inaccurate README areas: trust-state coverage and temporary staging/move instructions.
- Clarified in README that test-case count is not feature count.
- Created this isolated planning-with-files plan and made it active through `.planning/.active_plan`.
- Captured a nine-phase modernization roadmap, invariants, decisions, exit criteria, and verification matrix.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `npm test` | All current tests pass | 9 passed, 0 failed | pass |
| `python3 -m py_compile hooks/hook_adapter.py` | Adapter compiles | Exit 0 | pass |
| `node --check install.js` | Installer parses | Exit 0 | pass |
| `bash -n init-cloud-sandbox-v0.2.1.bash` | Bootstrap parses | Exit 0 | pass |
| `git diff --check` | No whitespace errors | Exit 0 before planning edits | pass |

### Audit Outcome
- Implementation and README were substantially aligned on version, enabled events, managed deployment, upstream pin, repair, and deferred work.
- They were not perfectly synchronized: the README overstated trust-state test coverage and retained obsolete staging instructions.
- Both discrepancies have been corrected as documentation changes in this branch.
- Nine tests should be described as nine test cases covering a larger set of related guarantees, not as exactly nine small product features.

### Errors
| Error | Resolution |
|-------|------------|
| Broad audit command output exceeded the terminal display limit | Used targeted file searches, commit inspection, and numbered excerpts for final verification. |

### Finalization Note
- The first staged `git diff --cached --check` detected extra blank lines at EOF in the three generated planning documents; they were normalized to one trailing newline before commit.

## Follow-up: README onboarding review

### Actions Taken
- Reworked README around a context-free What/Why/How path for a new maintainer.
- Clearly separated the then-current `0.2.1` runtime from the approved future architecture.
- Added current behavior, absent-feature, architecture, ownership, repository-map, installation, operations, repair, handoff, release, and safety sections.
- Embedded the exact managed runtime bundle direction and linked it to the durable planning artifacts.
- Preserved Phase 1 as the next implementation step and stated that it must not change installed Hook behavior.

### Verification
- `npm test`: 9 passed, 0 failed.
- Python adapter, Node installer, and Bash bootstrap syntax checks passed.
- `git diff --check` passed.
- Required README onboarding headings and active-plan pointer checks passed.

## Follow-up: v0.2.2 Cloud evidence integration

### Actions Taken
- Switched `.planning/.active_plan` from the nearly completed v0.2.2 catch-up delivery back to this modernization roadmap.
- Reviewed the complete v0.2.2 compatibility plan, Cloud transcript diagnostics, final resume evidence, current adapter, installer inventory model, bootstrap flow, and original modernization phases.
- Confirmed the original owned-runtime bundle direction remains sound.
- Promoted the four Cloud-proven catch-up deltas into an explicit compatibility-overlay/retirement roadmap.
- Expanded Phase 1 with the adapter/runtime request contract, diagnostic reason codes, Cloud-shaped transcript fixtures, overlay ledger, and reproducible artifact boundary.
- Expanded Phase 2 so the next runtime change moves catch-up beneath the owned managed runtime, stops executing mutable global Skill scripts, normalizes transcript records, shares plan resolution, bounds output, and tests the install/Hook user matrix.
- Added the explicit Phase 3 exit step that removes global Skill discovery and the v0.2.2 bootstrap patch after owned catch-up and prompt injection are complete.
- Updated release verification to prevent stale or self-referential ZIP checksum workflows.

### Outcome
- No wholesale redesign is needed.
- Priority changes from “add more upstream capabilities” to “first own and diagnose the already Cloud-proven catch-up path.”
- Advanced attestation, compact, tool, permission, and Stop work remains staged in the original order after the runtime boundary is corrected.

## Session: 2026-08-02 — v0.3.0 iteration initialization

### Actions Taken
- Confirmed the worktree was clean after the maintainer published and backed up v0.2.2.
- Recorded published v0.2.2 Release ZIP SHA-256 `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84` in the historical acceptance plan and runbook.
- Bumped `package.json` from `0.2.2` to `0.3.0`.
- Renamed the active development bootstrap from `init-cloud-sandbox-v0.2.2.bash` to `init-cloud-sandbox-v0.3.0.bash`, changed its default Release tag to `v0.3.0`, and reset its archive SHA-256 to the guarded all-zero placeholder.
- Updated the bootstrap contract test, README, and Cloud regression runbook for v0.3.0 while preserving v0.2.2 as the published rollback and acceptance baseline.
- Kept Phase 1 as the first behavioral modernization phase; this version initialization changes identity and documentation only.

### Verification
- Package/bootstrap/test/document version contract: v0.3.0 consistent.
- Development bootstrap Release ZIP checksum: guarded 64-zero placeholder.
- Published v0.2.2 SHA retained only as historical baseline evidence.
- `node --test tests/hook-adapter.test.js tests/skill-patch.test.js`: 6 passed, 0 failed.
- Node syntax checks for installer and all tests: passed.
- v0.3.0 bootstrap contains zero CR bytes; `git diff --check`: passed.

## Session: 2026-08-02 — project understanding consolidation

### Actions Taken
- Re-read the repository runtime, installer, bootstrap, compatibility patch, tests, active roadmap, and the relevant upstream v3.8.2 Codex Hook/runtime sources.
- Reconciled the maintainer's Cloud deployment facts with the v0.2.2 black-box failure and diagnostic evidence.
- Created `PROJECT_UNDERSTANDING.md` as the durable project mental model for future resume, clear, and compaction recovery.
- Recorded the confirmed two-asset Release boundary: the initialization Bash remains outside the ZIP that it downloads and verifies.
- Recorded `/opt/codex` as the current default/verified Cloud root while retaining an explicit fallback rather than treating the Hook environment as a permanent platform guarantee.
- Kept Phase 1 and its Next Step unchanged; no runtime behavior or implementation code changed.

### Verification
- `node --test tests/hook-adapter.test.js tests/skill-patch.test.js`: 6 passed, 0 failed during the preceding read-only code audit.
- Documentation-only update; no full Linux installer or Cloud black-box run was attempted.

### Cloud lifecycle clarification
- Maintainer confirmed that every cold sandbox start runs the configured initialization script, while continued conversations may reuse a cached sandbox.
- Recorded that observations from an initialized/cached sandbox cannot be treated as default-image facts without a no-init control sandbox.
- Agreed to collect a read-only default-image baseline first, then a sanitized transcript-shape probe; raw Hook stdin observation remains a later, separately designed step.

## Session: 2026-08-02 — no-init Cloud baseline and transcript schema probe

### Evidence Received
- Ran the agreed probe in a new empty GitHub repository with no sandbox initialization script.
- Confirmed the post-start default agent environment has `CODEX_HOME=/opt/codex`, an existing `/opt/codex/sessions`, and no `CODEX_SESSIONS_DIR` override.
- Confirmed `/etc/codex/requirements.toml`, `/root/.codex`, and `/root/.agents` are absent before this repository or the upstream Skill is installed.
- Captured the dated platform sample: root user, Ubuntu 24.04.4, Codex CLI `0.144.0-alpha.4`, and stable enabled Hooks.
- Confirmed `CODEX_THREAD_ID`, `session_meta.id`, and `session_meta.session_id` identify the same session in this sample.
- Captured sanitized `session_meta`, successful `patch_apply_end`, `response_item`, and `event_msg` shapes.
- Proved exact cross-family duplication of user and assistant message text between `response_item` and `event_msg`.

### Outcome
- Default-image facts are now separated from bootstrap/cache effects.
- Phase 1 has sufficient sanitized JSONL structure to create Cloud-shaped identity, patch-update, and duplicate-record fixtures.
- The next observation task was a minimal reversible Hook canary recording stdin keys/types and selected environment-variable presence without prompt or transcript bodies; the following session completed it.
- Phase 1 status remains pending; no installed Hook behavior or production code changed.

## Session: 2026-08-02 — real Managed Hook stdin probe

### Evidence Received
- Installed the temporary schema-only Managed Hook in a disposable Cloud sandbox and observed both `SessionStart` and `UserPromptSubmit` canaries.
- Captured four sanitized records: startup SessionStart, first UserPromptSubmit, resume SessionStart, and resume UserPromptSubmit.
- Confirmed the exact event-specific top-level stdin fields without recording prompt or transcript bodies.
- Confirmed a stable stdin `session_id` across startup, resume, and prompts, plus a distinct `turn_id` for each prompt.
- Confirmed both events receive `transcript_path` directly from the Host.
- Confirmed current Hook subprocess environments contain `CODEX_HOME=/opt/codex` while `CODEX_THREAD_ID`, `CODEX_SESSIONS_DIR`, and `PWF_SESSION_ID` are absent.

### Planning Impact
- Added `validated transcript path` to the Phase 1 adapter/runtime request contract and verification matrix.
- Changed session-store enumeration from the implicit primary selection method to an explicit compatibility fallback when no valid Host transcript is supplied.
- Corrected the roadmap shorthand from “Hook-time CODEX_HOME missing” to fixtures covering both current presence and compatible absence.
- After maintainer review, corrected “Hook inherited CODEX_HOME” to the evidence-bounded statement “Hook environment contained CODEX_HOME”; the probe compared but never set this variable.
- Kept Phase 1 pending and current production behavior unchanged.

## Session: 2026-08-02 — CODEX_HOME lifecycle provenance resolved

### Evidence Received
- Ran the same minimal shell presence check during Cloud sandbox initialization: `CODEX_HOME` was absent.
- Re-ran it after sandbox startup during the first prompt conversation: `CODEX_HOME=/opt/codex`.
- Combined this with the managed Hook probe, where the Hook environment also contained `/opt/codex`.
- Confirmed neither the empty-repository initializer nor the Hook probe initializer assigned or exported `CODEX_HOME`.

### Outcome
- The current lifecycle contract is stage-specific: setup has no `CODEX_HOME`; Codex agent and managed Hook runtime environments have `/opt/codex`.
- The platform makes the variable available between sandbox initialization and Codex Runtime startup; it is not a persistent export from this repository's bootstrap.
- The bootstrap's `${CODEX_HOME:-/opt/codex}` remains necessary as an installation-stage default, while adapter/runtime fallback remains necessary for portability and future image changes.
- Phase 1 remains pending; this was evidence and documentation refinement only.

## Session: 2026-08-02 — final v0.2.2 catch-up success output recovered

### Evidence Received
- Received the maintainer's historical sanitized raw output from the successful v0.2.2 Cloud resume regression.
- Confirmed `SessionStart source=resume`, `SESSION CATCHUP DETECTED`, `Runtime: codex`, previous rollout selection, scoped planning update at message 25, and `Unsynced messages: 7`.
- Confirmed the long PR wrapper was visibly bounded with `...[truncated]...` while its tail sentinel `PWF_CATCHUP_UNSYNCED_SENTINEL_82C4` remained inside `UNSYNCED CONTEXT`.
- Confirmed Planning context was observed in the same response.

### Actions Taken
- Preserved the sanitized raw output and interpretation in `evidence/v0.2.2-session-catchup-success.md` for later conversion into a Phase 1 golden fixture.
- Updated `PROJECT_UNDERSTANDING.md` and findings so the final success is based on direct evidence rather than only historical planning summaries.
- Removed the successful head/tail black-box output from the outstanding-information list.

### Outcome
- The v0.2.2 session-catchup Cloud compatibility baseline is fully evidenced.
- No external information now blocks Phase 1 Round 1.
- Phase 1 remains pending because contracts, ledgers, fixtures, and implementation artifacts have not yet been created.

## Session: 2026-08-02 — documentation consistency regression

### Scope
- Cross-check README, Cloud black-box runbook, work plan, project understanding, active planning files, package metadata, bootstrap identity, and current implementation contracts.
- Reconcile lifecycle-stage `CODEX_HOME`, real Hook stdin, transcript selection, v0.2.2 success/failure evidence, v0.3.0 release state, and Phase 1 status.
- Treat archived v0.2.2 planning records as historical evidence rather than current-state documentation.

### Initial State
- Package and active development identity are `0.3.0`; published rollback baseline remains `v0.2.2`.
- Active plan is `2026-08-01-managed-runtime-modernization`, with Phase 1 pending.
- Current uncommitted changes are documentation/evidence only; production Hook behavior has not changed.

### Findings and Corrections
- Corrected the current test inventory from the historical nine-case audit count to twelve cases; retained dated nine-case progress entries as history.
- Added `turn_id`, validated Host `transcript_path`, project root, and session-store fallback to the target adapter/runtime contract.
- Distinguished the current v0.2.2-inherited patched-Skill/session-scan chain from the Phase 2 owned-runtime transcript-path-first target in the Cloud runbook.
- Clarified in both onboarding and runbook that `CODEX_HOME` was absent at initialization but present as `/opt/codex` after Codex startup and in observed Hooks; neither the variable nor the path is a permanent platform guarantee.
- Verified current SessionStart, compaction, concurrent-Hook, and output contract statements against the official Codex Hooks documentation.
- Added the official warning that transcript JSONL is not a stable interface and must be parsed defensively.
- Added `PROJECT_UNDERSTANDING.md` and the compatibility regression test file to the README repository map.

### Verification
- Package and bootstrap development identity remain `0.3.0`; bootstrap Release SHA remains the guarded 64-zero placeholder.
- Published baseline remains `v0.2.2` with recorded Release ZIP SHA-256 `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84`.
- Active plan remains Phase 1 pending; no implementation or Hook registration was changed.
- Document assertions passed for version identity, checksum state, active-plan pointer, twelve-test inventory, lifecycle wording, transcript contract, and official-document link.
- `node --test tests/hook-adapter.test.js tests/skill-patch.test.js`: 6 passed, 0 failed when rerun outside the Windows process-spawn sandbox.
- `git diff --check`: passed; only expected Git line-ending conversion warnings were emitted.

## Session: 2026-08-02 — Windows equivalence review for the remaining installer tests

### Scope and Initial Finding
- Reviewed all six `tests/installer.test.js` cases and their platform dependencies after confirming local Windows Python is available to the test design.
- The six cases are already cross-platform Node assertions and already select `python` on Windows for the compatibility patch setup.
- Their actual Windows blocker is the production installer's intentional Cloud contract: non-dry-run install requires `/usr/bin/python3` and emits absolute `/usr/bin/python3` Managed Hook commands.
- Reimplementing the six cases as standalone Python tests would not exercise the real Node installer, TOML merge, manifest, doctor, repair, uninstall, and backup code and therefore would not be equivalent evidence.

### Next Check
- Prefer running the unchanged six tests in WSL/Linux if available.
- If WSL is unavailable, use a temporary test-only copy/fixture that parameterizes only the managed interpreter contract while preserving the same installer code paths and assertions; do not change the production `/usr/bin/python3` default merely to make Windows tests green.

### Environment Result
- Local interpreter: Python 3.13.5 at `D:\Program Files\Python\Python313\python.exe`.
- WSL has no installed distribution, so the unchanged Linux execution path is unavailable locally.
- Selected a reversible test-only environment seam in the existing installer/tests, with pre-change SHA-256 recorded for both files and mandatory hash verification after restoration.

### First Windows-Equivalence Run
- Temporarily substituted only the managed Python interpreter constant, passed the real Python 3.13.5 executable, and ran the unchanged six installer cases outside the process-spawn sandbox.
- Result: 3 passed and 3 failed. Dry-run, incompatible `managed_dir` fail-closed, and byte-for-byte backup restoration passed.
- The failures occurred on repeat install/repair health checks with requirements/manifest reconstruction drift, not while invoking Python.
- Immediately restored `install.js`; its SHA-256 returned to `656B36D17661FC945FBCF920C4623CFF9E95FFC38FCC2DDB5C2F10B052DC303E`. `tests/installer.test.js` remained at `4185A34FAA304E1FE525395339721E127253C532EB9DC73C2504BDD3691B91BA`.
- Production and test source therefore contain no temporary interpreter seam. Next step is to diagnose Windows path/TOML canonicalization from the retained failed-test temp fixtures before deciding whether a stronger equivalent harness is possible.

### Root Cause and Final Windows-Equivalence Result
- Retained fixtures showed TOML escaping Windows backslashes in managed commands. The production Linux ownership marker searches the raw TOML for an unescaped platform path segment, so the first narrow seam could not remove an existing Windows-form managed block and duplicated it on repeat install.
- A second reversible seam normalized only the test interpreter and Hook command path representation while leaving the six installer assertions and all installer state transitions intact.
- Final result: all 6 installer cases passed (6 passed, 0 failed), covering dry-run, managed-dir conflict, merge/idempotence/doctor/uninstall, owned repair, unknown-drift fail-closed, and byte-for-byte backup restore.
- Restored `install.js` again and verified its original SHA-256. `tests/installer.test.js` was never edited and also matches its original SHA-256; neither file appears in `git status`.
- This is valid Windows host-equivalence evidence for installer logic, but not evidence for Linux mode bits, real `/usr/bin/python3`, or Cloud execution. Those remain covered by Linux/Cloud release verification.
- Removed exactly the six `pwf-hooks-test-*` directories created by the two current runs after validating their resolved paths were inside the system Temp directory. Older unrelated temp fixtures were preserved.
- Combined regression evidence is now 12/12 at the assertion level: 6 adapter/compatibility cases passed unchanged, and 6 installer cases passed through the reversible Windows-equivalence seam.

## Session: 2026-08-02 — Phase 1 Round 1 started

### Scope
- Re-read `work_plan.md` and the active modernization plan after restoring session context.
- Confirmed Phase 1 remains a three-round phase and started Round 1 only.
- Round 1 deliverables: owned-runtime allowlist, direct dependency graph, four-delta compatibility-overlay ledger, versioned adapter/runtime request and diagnostic contracts, and Release ZIP/source-ownership boundary.
- Round 2 remains responsible for reproducible import/check, manifest implementation, overlay application, and license artifacts.
- Round 3 remains responsible for golden/Cloud fixtures, multi-file installation lifecycle tests, behavior compatibility, and the alpha.1 candidate.

### Guardrails
- No production Hook behavior, installer registration, global Skill patching, or bootstrap checksum changes in Round 1.
- Preserve the existing uncommitted planning-only updates and do not rewrite archived v0.2.2 evidence as current implementation state.

### History Review — Initial Pass
- Confirmed the active branch and remote are both `0.3.0`; recent history cleanly separates the published v0.2.2 commits from four v0.3.0 baseline/context commits.
- Confirmed the archived v0.2.2 plan is complete through release, Cloud A—F acceptance, scoped-plan migration, long-wrapper preservation, and single-patch simplification.
- Confirmed the current evidence file preserves the exact successful resume report needed to anchor the Round 1 overlay ledger and later Round 3 golden fixture.
- A combined archive read exceeded terminal output limits; continue with bounded per-file reads before freezing contracts.

### History Review — Completed
- Read the complete archived v0.2.2 task plan, findings, progress log, and final sanitized success evidence using bounded per-file reads.
- Historical contract is unambiguous: pristine Skill input SHA-256 `6476fd9024d0cbb9bfb850119fd0beff7fb7cfab9c6683ce10e4cc8d830ce6de`, current patched output SHA-256 `fc765590dc32b3949027de97e33dad6a049daf148719ba1822598a6c146461e2`, and one disposable-sandbox patch ID `PWF_CODEX_CLOUD_COMPAT_PATCH`.
- The four ledger deltas must remain atomic audit entries even though v0.2.2 implemented them in one physical patch: explicit Codex runtime, `$CODEX_HOME/sessions`, scoped planning-state guard, and bounded head/tail wrapper rendering.
- The final raw PASS anchors compatibility to `source=resume`, `Runtime: codex`, scoped planning update message 25, unsynced count 7, visible middle truncation, preserved tail sentinel, and simultaneous Planning context.
- Historical test/package counts and pre-release hashes remain dated evidence; the published rollback artifact is the final v0.2.2 ZIP SHA already recorded elsewhere.

### Upstream Review — Instructions and Scope
- Located and read the complete upstream `planning-with-files-3.8.2/AGENTS.md`; its commit/release rules apply to the supplied upstream tree, which remains read-only reference input in this repository.
- The upstream source contains many IDE/distribution mirrors. Round 1 must select canonical `skills/planning-with-files/` sources only and must not import duplicate `.codex`, `.agents`, `.cursor`, or top-level distribution copies.
- A broad dependency search exceeded terminal output limits and is not being used as contract evidence. Continue with exact candidate scripts and direct-reference inspection.

### Upstream Review — Candidate Contracts
- Read the exact patcher, current upstream manifest, current adapter, relevant catch-up functions/rendering, resolver/inject headers, inject-to-ledger edge, ledger summary header, and upstream MIT license.
- Computed candidate source hashes and the exact pristine hash of each of the four transformation anchors.
- Confirmed current adapter ignores Host `session_id`, `turn_id`, and `transcript_path`; Round 1 schemas describe the future versioned boundary only and must not be wired into production in this round.
- Confirmed the current catch-up whole report has no total output cap; the Round 1 target budget must add one while preserving all v0.2.2 per-message compatibility constants.

### Round 1 Contract Artifacts — Initial Write
- Added `contracts/runtime-bundle-v1.json` with the canonical upstream identity, four-file staged allowlist, direct/host dependency graph, hashes, modes, installed paths, and explicit deferred candidates.
- Added `contracts/compatibility-overlays-v1.json` with four logical v0.2.2 ledger entries, exact anchor hashes, common input/output hashes, evidence, tests, planned disposition, and retirement conditions.
- Added versioned JSON Schemas for adapter-to-runtime requests and runtime results/diagnostics. Raw prompt text is deliberately absent; Host transcript selection state and all fallback roots are explicit.
- Frozen compatibility output constants at 15 messages, 4 tools, 300 assistant characters, 1000-character user threshold, 350/650 head-tail preservation, and a new 20,000-character whole-report ceiling.
- Added `contracts/release-artifact-v1.json` with an exact deterministic ZIP entry list, Round 2 generated entries, exclusions, and the external-bootstrap checksum workflow.

### Initial Contract Verification
- All five contract JSON files parse successfully.
- `tests/contracts.test.js` passes and verifies upstream identity, the staged dependency graph, fixture hashes, the four patch-anchor hashes, overlay evidence/retirement fields, request/result schema invariants, and the external-bootstrap artifact boundary.
- `node --check tests/contracts.test.js` and `git diff --check` pass.

### Documentation and Plan Synchronization
- Updated README repository map, test count, target runtime tree, active Phase 1 status, and Release workflow to point at the frozen contracts.
- Updated `PROJECT_UNDERSTANDING.md` and `work_plan.md` to mark Round 1 complete and Round 2 next.
- Updated the active plan checklist, round table, status, and Next Step without marking the overall Phase 1 complete.
- The optional Python `jsonschema` library is absent; the repository remains dependency-free and uses the built-in Node contract test for Round 1 structural/provenance enforcement.
- The first final hygiene assertion caught two Markdown hard-break spaces in the new guide; replaced them with blank blockquote lines before final verification.

### Round 1 Final Verification and Outcome
- `node --test tests/contracts.test.js tests/hook-adapter.test.js tests/skill-patch.test.js`: 7 passed, 0 failed. This includes the new contract case plus all unchanged adapter and Cloud compatibility cases.
- The six installer cases already passed through the reversible Windows host-equivalence seam recorded in the preceding session; production files remain unchanged. The repository now contains 13 tracked Node test cases in total.
- Final assertions passed for JSON parsing, Node syntax, exact test count, v0.3.0 identity, zero production-file diffs, README/project/plan synchronization, zero trailing whitespace in new untracked files, and `git diff --check`.
- Phase 1 Round 1 is complete. Phase 1 remains in progress; Round 2 is next and must implement the importer/manifest/license work without registering or executing the owned runtime.
# Phase 1 Round 2 implementation (2026-08-02)

- Resumed from the completed Round 1 contracts and began the reproducible import/check, managed runtime staging, manifest provenance, and MIT attribution work.
- Guardrail remains unchanged: Round 2 may package and verify the frozen runtime, but must not register or execute it from production Hooks.
- Added the import/check implementation, full upstream MIT notice, license hash contract, exact overlay-order validation, and three importer regressions.
- Importer regressions pass: deterministic/idempotent allowlist import, archive and pristine-source drift rejection, and changed/unknown destination rejection.
- Replaced the unsupported inherited archive hash with an explicit official tag URL plus the twice-observed archive SHA after confirming the upstream Release has no separate asset. Commit and API zipball downloads were deliberately not treated as equivalent bytes.
- Imported the official archive into `runtime/upstream/`: three pristine scripts retain their upstream hashes and `session-catchup.py` matches the frozen managed-overlay hash.
- Extended `upstream-manifest.json` to schema 3 with contract/importer/license provenance and per-file source, package, mode, pristine, and managed identity. Marked every Round 2 Release entry present.
- Tightened canonical archive selection after the real ZIP exposed eleven mirrored catch-up copies; tightened destination validation to reject symlink components and unknown directories as well as files.
- Final Round 2 verification: 10/10 related Node cases passed, all four Python sources compile without filesystem output, importer `check` is healthy, Node syntax and `git diff --check` pass. The six existing installer cases remain the previously recorded Windows host-equivalence evidence; Round 3 owns the new multi-file lifecycle matrix.
- Production Hook adapter, installer, bootstrap, and global-Skill patcher behavior remain unchanged; the imported runtime is packaged but not registered or executed.
- Added narrow LF attributes for every text file whose byte hash participates in provenance, preventing Windows checkout normalization from invalidating the manifest.
- Phase 1 Round 2 is complete. Phase 1 remains in progress; Round 3 is next.
# Phase 1 Round 3 implementation (2026-08-02)

- Resumed from the verified Round 2 runtime and began the fixture, multi-file installer lifecycle, compatibility, and alpha.1-boundary work.
- Round 3 guardrail: the installer may own and verify inactive runtime files, but current Hook commands must continue to execute `hook_adapter.py`, and that adapter must retain the v0.2.2-compatible behavior until Phase 2.
- Extended the installer to atomically copy and manifest seven owned payload files: adapter, four inactive upstream runtime files, overlay ledger, and MIT notice. Recursive doctor/repair inventory now verifies every file/hash and POSIX mode and blocks unknown files, directories, symlinks, and manifest inventory drift.
- Added a copied-package Windows test seam that changes only the managed interpreter constant in the temporary package. All six existing install/dry-run/doctor/repair/backup/uninstall cases pass with multi-file assertions.
- Added six exact v0.2.2 adapter golden scenarios covering both events, no plan, active scoped selection, newest scoped fallback, and legacy root. All six pass without allowing a global Skill or catch-up store into the isolated test environment.
- Added a sanitized Cloud observation fixture for initialization/agent/Hook environment stages and real event-specific stdin keys, plus a substantial Cloud-shaped JSONL retaining `session_meta`, structured `patch_apply_end`, response/event duplicate families, four tool records, long wrapper, and tail sentinel.
- Cloud fixture verification passes with both observed Hook-time `CODEX_HOME` resolution and the missing-variable compatibility path using an explicit session-store override. It preserves update message #25, seven extracted messages, bounded wrapper tail, and single logical assistant/user renderings.
- Added a deterministic Release builder/checker with exact 18-entry ordering, 1980 timestamp, deflate settings, POSIX modes, byte-for-byte source verification, and explicit external-bootstrap exclusion. The reproducibility test builds two identical ZIPs and passes.
- Full `npm test` regression passes 25/25 with no failures, covering contracts, import, current adapter, golden output, Cloud fixtures, multi-file lifecycle, Release packaging, and the legacy compatibility patch path.
- Built and verified the final local `dist/pwf-codex-cloud-hooks-v0.3.0-alpha.1.zip` after runtime-root symlink hardening: 18 entries, 59,097 bytes, SHA-256 `94fe21837d26bbe07d23cdf88b89133c12e6f431eafd8c412ece96204f6a5027`. External `init-cloud-sandbox-v0.3.0.bash` SHA-256 is `5fda25beb397affe8e47b2e27e5bec7fa15180dbfb3d57feb9f6e508876e306f`.
- Added `docs/v0.3.0-alpha.1-cloud-smoke.md` with the two-asset publication contract, checksum-verified fresh setup command, exact installed-inventory probe, and simplified compatibility smoke. The document and planning log are excluded from the ZIP, so recording the candidate hash is non-self-referential.
- Local Bash is unavailable; no new Bash syntax PASS is claimed. Candidate ZIP check, Node syntax, Python compilation, runtime inventory, and `git diff --check` pass.
- Final installer audit now rejects symlinked `hooks/` or runtime roots before recursive traversal and covers unknown empty directories. The complete suite was rerun after this hardening and remains 25/25 PASS; the candidate was then rebuilt and the smoke document updated to the final SHA above.
- Post-interruption recovery audit confirmed that the working tree, deterministic candidate, runbook SHA pins, exact four-file source runtime, and planning state all remain consistent. Candidate and external bootstrap hashes were recomputed from disk and match the recorded values; `git diff --check` remains clean.
- The complete suite was rerun after recovery outside the Windows worker sandbox because the first attempt hit the known `spawn EPERM` restriction: 25 passed, 0 failed. Release check reports 18 exact entries/59,097 bytes, importer check is healthy, and the production adapter, compatibility patcher, and bootstrap remain unchanged from the branch baseline.
- Phase 1 is complete locally across all three rounds. The only remaining Phase 1 acceptance step is external: publish the ZIP and bootstrap as separate `v0.3.0-alpha.1` pre-release assets and run the documented fresh Codex Cloud smoke. No asset, commit, tag, or Hook execution switch was made locally.
