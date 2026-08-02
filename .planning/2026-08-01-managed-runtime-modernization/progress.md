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

## Session: 2026-08-02 — Phase 1 Round 1 contracts

### Implemented
- Added the versioned owned-runtime allowlist and direct dependency graph.
- Added the four-entry compatibility-overlay ledger with anchor hashes, evidence,
  ownership, regression references, target disposition, and retirement criteria.
- Added adapter-to-runtime request and runtime-result JSON Schemas, including
  bounded output policy and machine-readable diagnostic outcomes.
- Added the exact future Release ZIP boundary with the checksum-pinning bootstrap
  explicitly external; Round 2 files remain marked `planned`, not falsely present.
- Added sanitized request/result contract fixtures and a contract regression test.
- Documented ownership classes, transcript selection, diagnostics, and round boundaries.

### Verification
- `npm test`: 13 passed, 0 failed.
- `python3 -m py_compile hooks/hook_adapter.py`: passed.
- `node --check install.js`: passed.
- `bash -n init-cloud-sandbox-v0.3.0.bash`: passed.
- `git diff --check`: passed.

### Outcome
- Phase 1 Round 1 is complete without changing installed Hook behavior.
- Round 2 remains responsible for importer/check implementation, actual upstream
  runtime artifacts, manifest expansion, and third-party attribution.
