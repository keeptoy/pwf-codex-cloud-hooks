# Task Plan: v0.3.0 Managed Runtime Modernization

## Goal
Deliver v0.3.0 by replacing the long-term parallel planning implementation and mutable global-Skill execution in `hook_adapter.py` with a minimal, pinned, hash-verified upstream runtime bundle while preserving the repository's Codex Cloud managed-policy, rollout, recovery, and compatibility guarantees. Retire the v0.2.2 catch-up compatibility patch as a global-Skill mutation by absorbing only its still-needed behavior into the owned runtime or dropping each delta when upstream provides it.

## Non-goals
- Do not copy the upstream `.codex/hooks.json` registration model into production.
- Do not execute mutable, unverified scripts directly from a user's Skill directory.
- Do not enable every upstream lifecycle event in one release.
- Do not enable hard Stop gating before advisory behavior and host semantics are proven in Cloud.
- Do not change existing legacy-plan behavior without an explicit mode or migration contract.
- Do not preserve the v0.2.2 downstream patch as a permanent fork or add patch-version migration machinery before public deployment requires it.

## Invariants
1. Managed Hook commands use absolute paths beneath the configured `managed_dir`.
2. Install and doctor fail closed on missing, changed, or unknown trusted-runtime files.
3. Runtime advisory failures do not terminate the Codex loop; containment or attestation failures do prevent untrusted plan text from being injected.
4. Existing non-owned requirements and Hooks are preserved byte-for-byte where the current ownership model promises preservation.
5. `SessionStart` and `UserPromptSubmit` remain read-only until a separately reviewed phase says otherwise.
6. Canary output remains available throughout rollout and is removed only after fresh-session verification.
7. Every phase adds tests before its behavior is enabled in the Cloud setup artifact.
8. Runtime identity, validated Host transcript path, session-store fallback, project root, event source, and output limits are explicit host contracts; they are never inferred solely from an installed script path. Transcript JSONL record shapes are treated as changeable Host data rather than a stable repository-owned schema.
9. Hook stdout remains valid, bounded Codex JSON. Detailed skip/failure reasons go to a separate diagnostic surface and never corrupt injected context.
10. The checksummed installer payload has an explicit allowlist and reproducible boundary; the bootstrap that pins its checksum must not create a self-referential archive workflow.

## Next Step
Begin Phase 1 Round 2 by implementing deterministic allowlist import/check and overlay application from the pinned upstream archive. Keep installed Hook behavior unchanged until the imported inventory is independently verified.

## Current Phase
Phase 1 — Runtime provenance and compatibility contract

## Phases

### Phase 0: Repository audit and roadmap capture
- [x] Compare README claims with `install.js`, `hook_adapter.py`, the Cloud bootstrap script, and all tests.
- [x] Run all then-current nine test cases and static syntax checks; later compatibility work increased the current suite to twelve.
- [x] Correct stale README staging text and inaccurate test-suite wording.
- [x] Expand README into a context-free What/Why/How onboarding and handoff guide.
- [x] Record architectural findings and decisions in persistent planning files.
- **Exit criteria:** Audit results, discrepancies, scope boundaries, and staged roadmap are reviewable in Git.
- **Status:** complete

### Phase 0.5: v0.2.2 Cloud evidence integration
- [x] Record the `.agents` runtime-misclassification failure and explicit `PWF_RUNTIME=codex` fix.
- [x] Record `/opt/codex/sessions`, the initialization/runtime/Hook `CODEX_HOME` stage split, missing-variable portability, and adapter installed-path fallback behavior.
- [x] Record scoped-plan catch-up parity and structured `patch_apply_end` requirements.
- [x] Record real Cloud wrapper truncation, bounded head/tail preservation, and the successful resume sentinel regression.
- [x] Mark the single v0.2.2 compatibility patch as a temporary bridge and modernization input, not a long-term runtime architecture.
- **Exit criteria:** The long-term roadmap incorporates all deployment and transcript facts proven by the v0.2.2 Cloud investigation.
- **Status:** complete

### Phase 0.6: v0.3.0 iteration initialization
- [x] Preserve v0.2.2 as the published Cloud-validated baseline.
- [x] Bump package metadata to `0.3.0`.
- [x] Rename the development bootstrap to `init-cloud-sandbox-v0.3.0.bash`.
- [x] Reset the v0.3.0 Release ZIP checksum to the guarded all-zero placeholder.
- [x] Point tests, README, and the reusable Cloud runbook at the v0.3.0 development iteration while retaining v0.2.2 evidence.
- **Exit criteria:** The worktree cannot be mistaken for the published v0.2.2 release, and no v0.3.0 artifact is treated as published.
- **Status:** complete

### Phase 1: Runtime provenance and compatibility contract
- [x] Define the minimal upstream runtime allowlist and direct dependency graph.
- [x] Define a compatibility-overlay ledger for downstream deltas: reason, upstream anchor, input/output hashes, Cloud fixture, owner, and explicit retirement condition.
- [x] Enter the four v0.2.2 deltas in that ledger: explicit Codex runtime, `$CODEX_HOME/sessions`, scoped planning state, and bounded long-wrapper user context.
- [ ] Extend the upstream manifest schema to record archive identity, source paths, per-file SHA-256, executable mode, and license provenance.
- [ ] Add a deterministic import/check command that extracts only allowlisted files from the pinned archive and never follows a moving branch.
- [ ] Decide whether imported source files live in the package or are generated for release; document the reproducible-build procedure.
- [x] Define the release artifact allowlist and keep the checksum-pinning bootstrap outside the bytes whose checksum it pins, or document an equivalent two-stage publication procedure.
- [ ] Add `THIRD_PARTY_NOTICES.md` or equivalent MIT attribution before distributing substantial upstream code.
- [ ] Capture golden fixtures for current `SessionStart`, `UserPromptSubmit`, no-plan, scoped-plan, newest-plan, and legacy-root output.
- [ ] Add Cloud-shaped catch-up fixtures for `.agents`, `/opt/codex/sessions`, absent initialization-stage and present runtime/Hook-stage `CODEX_HOME` plus a missing-variable compatibility case, real SessionStart/UserPromptSubmit stdin schemas, stable `session_id`, distinct `turn_id`, Host-provided `transcript_path`, structured `patch_apply_end`, duplicate transcript record families, and a long wrapper with a tail sentinel.
- [x] Define a versioned adapter-to-runtime request contract containing runtime, project root, event/source, session identity, validated transcript path, session-store fallback/override, resolved plan state, and output budget.
- [x] Define machine-readable catch-up diagnostic outcomes such as `no_plan`, `no_session_store`, `no_matching_session`, `no_planning_update`, `no_unsynced_context`, `report_emitted`, and `runtime_error`.
- [ ] Extend installed-manifest/runtime inventory checks so missing, changed, and unknown files fail closed.
- [ ] Test install, doctor, repair, uninstall, and backup restoration with a multi-file runtime.
- **Exit criteria:** A reviewed runtime bundle can be reproduced from the pinned upstream archive, every downstream delta and executed file is verified, the release boundary is reproducible, and current Hook behavior is unchanged.
- **Status:** Round 1 complete; Rounds 2 and 3 pending

### Phase 2: Owned catch-up runtime and safety foundation
- [ ] Install catch-up and its allowlisted dependencies beneath the owned managed runtime; stop executing `session-catchup.py` from a mutable global Skill directory.
- [ ] Apply any still-required compatibility overlay only to the owned imported copy, leaving the global upstream Skill pristine.
- [ ] Pass runtime/session/transcript/project/event data through the explicit host contract instead of inferring Codex from a script path, scanning before using a valid Host transcript, or relying on setup-shell environment persistence.
- [ ] Make catch-up and prompt injection share one canonical scoped/root plan resolver so one path cannot see a plan that the other rejects.
- [ ] Normalize real Codex JSONL record families defensively because transcript format is not a stable Host interface, deduplicate logically repeated user/assistant messages where safe, preserve structured planning updates, and enforce per-message plus total-report budgets.
- [ ] Add a non-injecting diagnostic command that reports reason codes and selected paths without exposing transcript content by default.
- [ ] Add `PLANNING_DISABLED=1` as an explicit one-shot opt-out.
- [ ] Use canonical path containment so scoped-plan symlinks cannot escape the project root.
- [ ] Add backward-compatible session isolation using `session_id` and `.planning/sessions/<id>.attached`.
- [ ] Define malformed stdin, missing files, invalid UTF-8, timeout, and child-process failure behavior.
- [ ] Keep the Codex loop fail-open for advisory runtime failures while failing closed for unsafe context injection.
- [ ] Test the observed root/root Cloud identity and a synthetic install-user/Hook-user split with explicit readability and session-store expectations.
- [ ] Add Linux Cloud tests and document Windows as unsupported unless a separate managed Windows runtime is designed.
- **Exit criteria:** Catch-up executes only owned verified files, current Cloud behavior remains compatible, diagnostic skips are explainable, opted-out/unattached sessions stay silent, and external-path plan content is never injected.
- **Status:** pending

### Phase 3: Canonical user-prompt injection
- [ ] Reduce the local Python adapter to Codex payload parsing, event dispatch, subprocess supervision, canary emission, and Codex JSON output conversion.
- [ ] Dispatch user-prompt plan behavior to the pinned upstream `inject-plan.sh --context=userprompt` implementation.
- [ ] Preserve current legacy-mode output semantics through golden tests or document and approve each intentional difference.
- [ ] Normalize diagnostics so upstream stderr cannot corrupt Hook JSON stdout.
- [ ] Measure Hook latency and output size in plan/no-plan cases.
- [ ] Remove global Skill discovery and the v0.2.2 bootstrap patch step once both catch-up and prompt injection run exclusively from the owned runtime bundle.
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
- [ ] Prove the packaged-file allowlist, archive root, and bootstrap/checksummed-payload separation so documentation or checksum pinning cannot silently invalidate the artifact.
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
| Treat test count as a dated inventory, not a feature count | The Phase 0 suite had nine cases; compatibility work raised the current count to twelve. Several cases cover multiple guarantees and several README claims are integration properties rather than separate product features. |
| Treat the v0.2.2 catch-up patch as a temporary compatibility overlay | It is valuable Cloud-proven behavior, but mutating and executing a global Skill conflicts with the owned-runtime trust boundary. |
| Make the host/runtime contract explicit | `.agents` placement, initialization/runtime environment differences, absent Hook-time `CODEX_THREAD_ID`, and the Host-provided transcript path prove that script-path and setup-shell inference are not stable Cloud interfaces. |
| Add reason-coded diagnostics without injecting them by default | Silent early returns made black-box failures expensive to localize, while stderr or debug text must not contaminate Hook JSON/context. |
| Preserve bounded head and tail with an overall report budget | Real Cloud wrappers can move the user request to the end; head-only truncation loses meaning, but unbounded transcript injection is unsafe and costly. |
| Keep final archive construction separate from checksum pinning | Documentation and bootstrap edits change bytes; an explicit artifact boundary prevents stale or self-referential release hashes. |

## Verification Matrix
| Area | Required checks |
|------|-----------------|
| Source integrity | Archive checksum, allowlist, per-file hashes, modes, license notice, reproducible import |
| Adapter protocol | Empty/malformed stdin, real event-specific schemas, cwd, session_id, turn_id, transcript_path, event/source, stdout JSON, stderr isolation, timeout |
| Host/runtime contract | Explicit Codex identity, initialization/runtime CODEX_HOME stage split, missing-variable compatibility, absent Hook-time CODEX_THREAD_ID, validated transcript path, `/opt/codex/sessions` fallback, session override, install/Hook user matrix |
| Plan resolution | PLAN_ID, active pointer, newest scoped plan, legacy root, invalid slug, symlink escape |
| Catch-up transcript | response/event record families, structured patch update, duplicate normalization, wrapper tail, per-message/total budgets, reason codes |
| Injection | no plan, legacy, smart, attested, unattested v3, tampered, nonce, output limits |
| Installer | dry-run, merge, conflict, idempotence, clean install, upgrade, backup, uninstall |
| Doctor/repair | missing/changed/unknown runtime, owned requirements drift, unowned drift, manifest drift |
| Lifecycle | startup, resume, clear, compact, manual/auto PreCompact, tool matchers, Stop coexistence |
| Rollback | old manifest, failed partial install, restore backup, reinstall previous pinned release |
| Packaging | explicit file allowlist, deterministic ZIP root/order/modes, bootstrap separation, final SHA pin |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Initial broad repository output was truncated by the terminal output limit | Re-ran targeted searches and numbered excerpts for the claims used in the audit. |
| Earlier web search API returned HTTP 401 | Used direct HTTPS access to the official documentation and a pinned Git clone for primary-source inspection. |
| Final roadmap assertion used a case-sensitive phrase that differed only by capitalization | Keep the roadmap unchanged and rerun the consistency check with case-insensitive matching. |
| Environment-declared workspace path no longer existed after the earlier directory rename | Located the unique `pwf-codex-cloud-hooks` directory and used a verified temporary Junction only for edits. |
| Initial version-reference `rg` pattern lost quoting in PowerShell and produced an unclosed group | Reran with a single-quoted regular expression before deciding the version migration scope. |
| Python stdin verification received the Chinese runbook filename as `????.md` on Windows | Keep the successful Node tests, rerun document assertions with native PowerShell `-LiteralPath`, and explicitly inspect each external command exit code. |
| A combined status command returned exit 1 after `rg` correctly found no stale v0.2.2 current-entry references | Treat `rg` exit 1 as the expected no-match result and verify the rename with explicit file-existence assertions. |
| PowerShell parsed a concatenated expected SHA line inside an array as separate expression fragments | Build the expected all-zero line in a named scalar before constructing the assertion array. |
| The local Codex manual helper returned HTTP 403 both sandboxed and escalated | Used the official OpenAI documentation connector to verify the current Hooks contract and recorded the primary-source URL. |
| The Windows sandbox blocked Node test workers with `spawn EPERM` | Reran the six relevant adapter/compatibility tests outside the process-spawn sandbox; all passed. |
| The first document assertion searched for a phrase split by a deliberate Markdown line wrap | Changed the assertion to a stable semantic fragment and reran the full document contract successfully. |
