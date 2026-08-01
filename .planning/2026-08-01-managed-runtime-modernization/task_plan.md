# Task Plan: Managed Runtime Modernization

## Goal
Replace the long-term parallel planning implementation in `hook_adapter.py` with a minimal, pinned, hash-verified upstream runtime bundle while preserving the repository's Codex Cloud managed-policy, rollout, recovery, and compatibility guarantees.

## Non-goals
- Do not copy the upstream `.codex/hooks.json` registration model into production.
- Do not execute mutable, unverified scripts directly from a user's Skill directory.
- Do not enable every upstream lifecycle event in one release.
- Do not enable hard Stop gating before advisory behavior and host semantics are proven in Cloud.
- Do not change existing legacy-plan behavior without an explicit mode or migration contract.

## Invariants
1. Managed Hook commands use absolute paths beneath the configured `managed_dir`.
2. Install and doctor fail closed on missing, changed, or unknown trusted-runtime files.
3. Runtime advisory failures do not terminate the Codex loop; containment or attestation failures do prevent untrusted plan text from being injected.
4. Existing non-owned requirements and Hooks are preserved byte-for-byte where the current ownership model promises preservation.
5. `SessionStart` and `UserPromptSubmit` remain read-only until a separately reviewed phase says otherwise.
6. Canary output remains available throughout rollout and is removed only after fresh-session verification.
7. Every phase adds tests before its behavior is enabled in the Cloud setup artifact.

## Next Step
Begin Phase 1 by defining the upstream runtime allowlist, provenance schema, exact legacy-output compatibility fixtures, and import/check workflow without changing installed Hook behavior.

## Current Phase
Phase 1 — Runtime provenance and compatibility contract

## Phases

### Phase 0: Repository audit and roadmap capture
- [x] Compare README claims with `install.js`, `hook_adapter.py`, the Cloud bootstrap script, and all tests.
- [x] Run all nine test cases and static syntax checks.
- [x] Correct stale README staging text and inaccurate test-suite wording.
- [x] Expand README into a context-free What/Why/How onboarding and handoff guide.
- [x] Record architectural findings and decisions in persistent planning files.
- **Exit criteria:** Audit results, discrepancies, scope boundaries, and staged roadmap are reviewable in Git.
- **Status:** complete

### Phase 1: Runtime provenance and compatibility contract
- [ ] Define the minimal upstream runtime allowlist and direct dependency graph.
- [ ] Extend the upstream manifest schema to record archive identity, source paths, per-file SHA-256, executable mode, and license provenance.
- [ ] Add a deterministic import/check command that extracts only allowlisted files from the pinned archive and never follows a moving branch.
- [ ] Decide whether imported source files live in the package or are generated for release; document the reproducible-build procedure.
- [ ] Add `THIRD_PARTY_NOTICES.md` or equivalent MIT attribution before distributing substantial upstream code.
- [ ] Capture golden fixtures for current `SessionStart`, `UserPromptSubmit`, no-plan, scoped-plan, newest-plan, and legacy-root output.
- [ ] Extend installed-manifest/runtime inventory checks so missing, changed, and unknown files fail closed.
- [ ] Test install, doctor, repair, uninstall, and backup restoration with a multi-file runtime.
- **Exit criteria:** A reviewed runtime bundle can be reproduced from the pinned upstream archive, every executed file is verified, and current Hook behavior is unchanged.
- **Status:** pending

### Phase 2: Safety foundation behind the existing two events
- [ ] Add `PLANNING_DISABLED=1` as an explicit one-shot opt-out.
- [ ] Use canonical path containment so scoped-plan symlinks cannot escape the project root.
- [ ] Add backward-compatible session isolation using `session_id` and `.planning/sessions/<id>.attached`.
- [ ] Define malformed stdin, missing files, invalid UTF-8, timeout, and child-process failure behavior.
- [ ] Keep the Codex loop fail-open for advisory runtime failures while failing closed for unsafe context injection.
- [ ] Add Linux Cloud tests and document Windows as unsupported unless a separate managed Windows runtime is designed.
- **Exit criteria:** Existing users retain legacy behavior, opted-out/unattached sessions stay silent, and external-path plan content is never injected.
- **Status:** pending

### Phase 3: Canonical user-prompt injection
- [ ] Reduce the local Python adapter to Codex payload parsing, event dispatch, subprocess supervision, canary emission, and Codex JSON output conversion.
- [ ] Dispatch user-prompt plan behavior to the pinned upstream `inject-plan.sh --context=userprompt` implementation.
- [ ] Preserve current legacy-mode output semantics through golden tests or document and approve each intentional difference.
- [ ] Normalize diagnostics so upstream stderr cannot corrupt Hook JSON stdout.
- [ ] Measure Hook latency and output size in plan/no-plan cases.
- **Exit criteria:** Planning behavior has one canonical implementation and the adapter contains no parallel plan-resolution or injection algorithm.
- **Status:** pending

### Phase 4: Attestation and opt-in v3 injection modes
- [ ] Import and verify attestation, nonce, smart-injection, and ledger dependencies.
- [ ] Keep unattested legacy mode backward compatible.
- [ ] Make autonomous/gated plan-body injection require a valid attestation.
- [ ] Verify tampered plans produce a short warning but no plan body.
- [ ] Verify nonce framing and explain that attestation, not nonce secrecy, is the security boundary.
- [ ] Replace raw progress injection with structured ledger summaries only in the applicable opt-in modes.
- [ ] Test cache location, project-key separation, stale-cache behavior, and rollback.
- **Exit criteria:** v3 modes are opt-in, tamper-safe, reproducible, and do not silently alter legacy projects.
- **Status:** pending

### Phase 5: Compaction lifecycle rollout
- [ ] First verify `SessionStart(source=clear|compact)` in fresh Cloud sessions.
- [ ] Add read-only `PreCompact` for `manual|auto` with no-plan silence and attestation reporting.
- [ ] Verify manual compact, automatic compact, post-compact session restart, resume, and clear behavior.
- [ ] Evaluate `PostCompact` separately; add it only if it provides behavior not already covered by `SessionStart(source=compact)`.
- [ ] Preserve canaries until all compact paths have been observed before any manual plan read.
- **Exit criteria:** Context is durably flushed and restored across compact without duplicate or conflicting reminders.
- **Status:** pending

### Phase 6: Selective tool and permission hooks
- [ ] Add `PostToolUse` first as a measured advisory experiment.
- [ ] Choose matchers from observed needs rather than matching every supported local tool by default.
- [ ] Add deduplication or throttling if a single user action produces repeated reminders.
- [ ] Evaluate `PermissionRequest` after PostToolUse behavior is stable.
- [ ] Add `PreToolUse` last, and suppress repeated plan recitation in autonomous/gated modes.
- [ ] Treat tool Hooks as guardrails, not a complete security boundary.
- **Exit criteria:** Added Hooks improve progress durability without unacceptable latency, token cost, or repeated messages.
- **Status:** pending

### Phase 7: Advisory completion semantics
- [ ] Import and verify canonical completion parsing.
- [ ] Add a non-blocking Stop advisory only.
- [ ] Test no plan, unstructured plan, zero phases, complete, pending-only, and in-progress states.
- [ ] Test coexistence with user, project, and plugin Stop Hooks because matching command Hooks can run concurrently.
- **Exit criteria:** Stop messages are accurate, non-recursive, non-blocking, and quiet when no meaningful phase state exists.
- **Status:** pending

### Phase 8: Optional hard gating
- [ ] Confirm the deployed Codex Cloud host's current Stop decision contract with an isolated canary.
- [ ] Require explicit gated mode, valid attestation, structured ledger, and an in-progress phase.
- [ ] Implement and test recursion protection, block cap, stall detection, emergency opt-out, and cap reset.
- [ ] Test malformed input, timeout, concurrent Stop Hooks, resume, compact, and rollback.
- [ ] Ship hard gating behind an explicit rollout flag; never make it the legacy default.
- **Exit criteria:** Human-reviewed Cloud evidence demonstrates bounded enforcement with deterministic escape paths.
- **Status:** pending

### Phase 9: Release and canary retirement
- [ ] Run the complete test matrix and reproducible-import verification.
- [ ] Exercise dry-run, clean install, upgrade, repair, doctor, backup restore, uninstall, and reinstall.
- [ ] Publish an immutable release artifact and record its checksum in the Cloud setup script.
- [ ] Reset Cloud cache/create fresh tasks and observe exact lifecycle canaries.
- [ ] Remove temporary canaries only after all enabled lifecycle paths are proven.
- [ ] Recompute and review production hashes after canary removal.
- **Exit criteria:** The pinned release is reproducible, observable, reversible, and documented.
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Keep the managed installer and policy layer local | It supplies absolute paths, ownership, backup, doctor, repair, uninstall, and Cloud rollout behavior not provided by upstream workspace installation. |
| Bundle an allowlisted upstream runtime from a pinned archive | This avoids both a long-lived local fork and runtime dependence on mutable user Skill files. |
| Keep upstream canonical files unmodified where possible | Local edits make provenance and upstream security-fix adoption harder to audit. Host-specific translation belongs in the adapter. |
| Preserve legacy behavior by default | Existing plans must not be forced into attestation, ledger, or gating without an explicit migration/mode. |
| Roll out lifecycle events incrementally | Managed Hooks are globally trusted, can coexist and run concurrently with other sources, and are harder for users to disable. |
| Add hard Stop gating last | It has the greatest recursion, concurrency, and runaway risk and requires real host verification. |
| Treat nine tests as nine test cases, not nine features | Several tests cover multiple guarantees and several README claims are integration properties rather than separate product features. |

## Verification Matrix
| Area | Required checks |
|------|-----------------|
| Source integrity | Archive checksum, allowlist, per-file hashes, modes, license notice, reproducible import |
| Adapter protocol | Empty/malformed stdin, cwd, session_id, event name, stdout JSON, stderr isolation, timeout |
| Plan resolution | PLAN_ID, active pointer, newest scoped plan, legacy root, invalid slug, symlink escape |
| Injection | no plan, legacy, smart, attested, unattested v3, tampered, nonce, output limits |
| Installer | dry-run, merge, conflict, idempotence, clean install, upgrade, backup, uninstall |
| Doctor/repair | missing/changed/unknown runtime, owned requirements drift, unowned drift, manifest drift |
| Lifecycle | startup, resume, clear, compact, manual/auto PreCompact, tool matchers, Stop coexistence |
| Rollback | old manifest, failed partial install, restore backup, reinstall previous pinned release |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Initial broad repository output was truncated by the terminal output limit | Re-ran targeted searches and numbered excerpts for the claims used in the audit. |
| Earlier web search API returned HTTP 401 | Used direct HTTPS access to the official documentation and a pinned Git clone for primary-source inspection. |
