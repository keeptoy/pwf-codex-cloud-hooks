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
Begin Phase 3 Round 3's inactive exact-v1 `owned-plan.py` implementation using the four frozen production policies. The Cloud single-link gate is closed after Fresh and Resume both passed (40/40 stable regular-file observations with `st_nlink=1`). Keep adapter dispatch and alpha.2 Release/bootstrap bytes unchanged until Round 4 activation.

## Current Phase
Phase 3 Rounds 1–2 and the Round 3 production-policy/Cloud compatibility gate are complete; inactive Round 3 implementation is next, no production path is active, and alpha.2 remains the rollback baseline

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

#### Round tracking
| Round | Scope | Status |
|---|---|---|
| 1 | Contract and ledger freeze: allowlist, dependency graph, overlay ledger, adapter/runtime request, diagnostics, artifact boundary | complete |
| 2 | Reproducible import/check, manifest implementation, overlays, license provenance | complete |
| 3 | Golden/Cloud fixtures, multi-file installer lifecycle, behavior-compatibility proof, alpha.1 candidate | complete; Cloud PASS |

- [x] Define the minimal upstream runtime allowlist and direct dependency graph.
- [x] Define a compatibility-overlay ledger for downstream deltas: reason, upstream anchor, input/output hashes, Cloud fixture, owner, and explicit retirement condition.
- [x] Enter the four v0.2.2 deltas in that ledger: explicit Codex runtime, `$CODEX_HOME/sessions`, scoped planning state, and bounded long-wrapper user context.
- [x] Extend the upstream manifest schema to record archive identity, source paths, per-file SHA-256, executable mode, and license provenance.
- [x] Add a deterministic import/check command that extracts only allowlisted files from the pinned archive and never follows a moving branch.
- [x] Decide whether imported source files live in the package or are generated for release; Round 2 generates the frozen `runtime/upstream/` package paths before release.
- [x] Define the release artifact allowlist and keep the checksum-pinning bootstrap outside the bytes whose checksum it pins.
- [x] Add `THIRD_PARTY_NOTICES.md` or equivalent MIT attribution before distributing substantial upstream code.
- [x] Capture golden fixtures for current `SessionStart`, `UserPromptSubmit`, no-plan, scoped-plan, newest-plan, and legacy-root output.
- [x] Add Cloud-shaped catch-up fixtures for `.agents`, `/opt/codex/sessions`, absent initialization-stage and present runtime/Hook-stage `CODEX_HOME` plus a missing-variable compatibility case, real SessionStart/UserPromptSubmit stdin schemas, stable `session_id`, distinct `turn_id`, Host-provided `transcript_path`, structured `patch_apply_end`, duplicate transcript record families, and a long wrapper with a tail sentinel.
- [x] Define a versioned adapter-to-runtime request contract containing runtime, project root, event/source, session identity, validated transcript path, session-store fallback/override, resolved plan state, and output budget.
- [x] Define machine-readable catch-up diagnostic outcomes such as `no_plan`, `no_session_store`, `no_matching_session`, `no_planning_update`, `no_unsynced_context`, `report_emitted`, and `runtime_error`.
- [x] Extend installed-manifest/runtime inventory checks so missing, changed, and unknown files fail closed.
- [x] Test install, doctor, repair, uninstall, and backup restoration with a multi-file runtime.
- **Exit criteria:** A reviewed runtime bundle can be reproduced from the pinned upstream archive, every downstream delta and executed file is verified, the release boundary is reproducible, and current Hook behavior is unchanged.
- **Status:** complete; `v0.3.0-alpha.1` Cloud acceptance PASS

### Phase 2: Owned catch-up runtime and safety foundation

#### Round tracking
| Round | Scope | Status |
|---|---|---|
| 1 | Structured owned-runtime entrypoint, request/result validation, Host transcript preference and explicit fallback; remain inactive | complete |
| 2 | Shared canonical plan resolution, containment, opt-out, and backward-compatible session attachment/isolation | complete |
| 3 | Codex JSONL normalization/deduplication, bounded rendering, diagnostic surface, malformed-input/timeout/failure semantics | complete |
| 4 | Adapter activation, pristine global Skill, installer/manifest/permission matrix, alpha.2 packaging and Cloud hard acceptance | complete; Cloud PASS |

- [x] Install catch-up and its allowlisted dependencies beneath the owned managed runtime; stop executing `session-catchup.py` from a mutable global Skill directory.
- [x] Apply any still-required compatibility overlay only to the owned imported copy, leaving the global upstream Skill pristine.
- [x] Pass runtime/session/transcript/project/event data through the explicit host contract instead of inferring Codex from a script path, scanning before using a valid Host transcript, or relying on setup-shell environment persistence.
- [x] Make catch-up and prompt injection share one canonical scoped/root plan resolver so one path cannot see a plan that the other rejects.
- [x] Normalize real Codex JSONL record families defensively because transcript format is not a stable Host interface, deduplicate logically repeated user/assistant messages where safe, preserve structured planning updates, and enforce per-message plus total-report budgets.
- [x] Add a non-injecting diagnostic command that reports reason codes and selected paths without exposing transcript content by default.
- [x] Add `PLANNING_DISABLED=1` as an explicit one-shot opt-out.
- [x] Use canonical path containment so scoped-plan symlinks cannot escape the project root.
- [x] Add backward-compatible session isolation using `session_id` and `.planning/sessions/<id>.attached`.
- [x] Define malformed stdin, missing files, invalid UTF-8, timeout, and child-process failure behavior.
- [x] Keep the Codex loop fail-open for advisory runtime failures while failing closed for unsafe context injection.
- [x] Test the observed root/root Cloud identity and a synthetic install-user/Hook-user split with explicit readability and session-store expectations.
- [x] Add Linux Cloud tests and document Windows as unsupported unless a separate managed Windows runtime is designed.
- **Exit criteria:** Catch-up executes only owned verified files, current Cloud behavior remains compatible, diagnostic skips are explainable, opted-out/unattached sessions stay silent, and external-path plan content is never injected.
- **Status:** complete; all P2-A through P2-E lifecycle gates PASS in Cloud, including post-resume doctor (`healthy=true`, `repairable=false`, empty errors/blockers)

### Phase 3: Canonical user-prompt injection

#### Round tracking
| Round | Scope | Status |
|---|---|---|
| 1 | Audit local/upstream semantics; freeze migration, output, supervision, inventory, and test contracts | complete |
| 2 | Build/review isolated controlled-snapshot feasibility spike; prove hard Linux/Cloud primitives without entering trusted graph | complete; conditional GO |
| 3 | Freeze production policies; implement/install inactive exact-v1 owned plan-context path and prove golden/safety/trusted-graph compatibility | policy freeze and Cloud single-link gate complete; implementation pending |
| 4 | Activate canonical UserPrompt injection, retire parallel adapter rendering, package beta.1, and complete Cloud acceptance | pending |

- [ ] Reduce the local Python adapter to Codex payload parsing, explicit request construction, event dispatch, subprocess supervision, canary emission, and Codex JSON output conversion.
- [ ] Dispatch both lifecycle events through `owned-plan.py`, which must call the verified standalone resolver, finalize one canonical contained project state, and invoke the managed-legacy upstream injector.
- [ ] Keep the upstream injector pristine: invoke it only inside a private `0700` legacy snapshot containing `0600` task/progress inputs and a scrubbed environment; treat multi-target overlay as a documented fallback rather than the Phase 3 default.
- [ ] Pass the exact canonical project state returned by `owned-plan.py` to `owned-catchup.py` on SessionStart; do not resolve the plan independently in the adapter or catch-up child.
- [ ] Preserve current legacy-mode output semantics through golden tests or document and approve each intentional difference.
- [ ] Normalize diagnostics so upstream stderr cannot corrupt Hook JSON stdout.
- [ ] Measure Hook latency and output size in plan/no-plan cases.
- [ ] Prove prompt injection runs exclusively from the owned runtime bundle and no mutable global Skill script executes; retain the pristine global Skill for model discovery/instructions and deployment governance.
- **Exit criteria:** Planning behavior has one canonical implementation and the adapter contains no parallel plan-resolution or injection algorithm.
- **Status:** Rounds 1–2 complete; the four Round 3 policies and their Cloud single-link gate are frozen/closed; inactive production implementation is next

### Phase 4: Attestation and opt-in v3 injection modes

#### Provisional round shape — re-audit before Phase 4 starts
| Round | Scope | Status |
|---|---|---|
| 1 | Re-audit upstream attestation/mode/nonce/ledger semantics; freeze projection, protocol, fallback, and Cloud gates | pending |
| 2 | Implement and install the inactive opt-in extension with legacy mode unchanged | pending |
| 3 | Activate opt-in modes only; complete tamper/cache/rollback and fresh-Cloud acceptance | pending |

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
| Keep selected Phase 3 contract filenames stable | The architecture and v1 protocol identities are selected. Staged versus active state belongs in metadata, trusted-graph membership, and regression assertions; a rename/version bump is reserved for incompatible change. |
| Preserve legacy behavior by default | Existing plans must not be forced into attestation, ledger, or gating without an explicit migration/mode. |
| Roll out lifecycle events incrementally | Managed Hooks are globally trusted, can coexist and run concurrently with other sources, and are harder for users to disable. |
| Add hard Stop gating last | It has the greatest recursion, concurrency, and runaway risk and requires real host verification. |
| Treat test count as a dated inventory, not a feature count | The Phase 0 suite had nine cases; compatibility work raised it to twelve, Phase 1 Round 1 to thirteen, Round 2 to sixteen, Round 3 to twenty-five, Phase 2 Round 1 to thirty, Round 2 to thirty-five, Round 3 to forty, and Round 4 to forty-five registered cases. Phase 3 Round 1 added one inactive-contract case for forty-six; the reviewed Round 2 handoff adds eight feasibility cases plus one parent isolation case for fifty-five. Several cases cover multiple guarantees. Linux/Cloud runs all 55; Windows honestly runs 45 and skips ten production-POSIX cases. |
| Treat the v0.2.2 catch-up patch as a temporary compatibility overlay | It is valuable Cloud-proven behavior, but mutating and executing a global Skill conflicts with the owned-runtime trust boundary. |
| Make the host/runtime contract explicit | `.agents` placement, initialization/runtime environment differences, absent Hook-time `CODEX_THREAD_ID`, and the Host-provided transcript path prove that script-path and setup-shell inference are not stable Cloud interfaces. |
| Add reason-coded diagnostics without injecting them by default | Silent early returns made black-box failures expensive to localize, while stderr or debug text must not contaminate Hook JSON/context. |
| Preserve bounded head and tail with an overall report budget | Real Cloud wrappers can move the user request to the end; head-only truncation loses meaning, but unbounded transcript injection is unsafe and costly. |
| Keep final archive construction separate from checksum pinning | Documentation and bootstrap edits change bytes; an explicit artifact boundary prevents stale or self-referential release hashes. |

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| Local Phase 3 upstream-output comparison could not start `sh` from PowerShell PATH | 1 | Located the Git for Windows shell explicitly instead of repeating the PATH lookup. |
| Git Bash failed inside the managed Windows sandbox with `couldn't create signal pipe, Win32 error 5` | 2 | Retried the read-only comparison outside the sandbox; it completed successfully and confirmed the expected canonical wording/output delta. |
| `npm test` reported 11 file-level failures because Node test-runner child creation returned `spawn EPERM` inside the managed Windows sandbox | 1 | Re-ran the unchanged suite outside the sandbox; all real tests completed with 42 PASS, 3 expected Linux-only SKIP, and 0 FAIL. |
| Initial Phase 3 contract test expected the phrase `invoked for both` while the guide says `runs for both` | 1 | Corrected the test to assert the actual stable wording; no contract or design behavior changed. |
| Second focused contract run expected `not yet part` on one line while the Markdown wraps before `trusted artifact graph` | 2 | Made the assertion newline-aware; schema and runtime boundaries were unchanged. |
| Snapshot probe used `New-Item -LiteralPath`, unsupported by this PowerShell version | 1 | Switched to an already validated absolute `-Path`; no workspace file was created. |
| Snapshot probe assumed Git Bash under `C:\Program Files`, but the user installation is on `D:` | 2 | Read the user-provided shortcut target and used `D:\Program Files\Git\bin\bash.exe`; the shortcut itself was not executed or modified. |
| Initial Bash probe command lost nested `cygpath` quoting and exited 2 before running the injector | 3 | Converted absolute Windows paths to MSYS paths in PowerShell before invoking Bash; direct/snapshot and marker-isolation probes then passed. |
| Broad read-only Bash location scan reached its 30-second command timeout | 1 | Stopped scanning and used the explicit user-provided Git installation target. |
| Documentation consistency command used Bash-style `{a,b}` path expansion in PowerShell | 1 | Replaced it with an explicit PowerShell file array before running any checks. |
| Tracked-file size audit used quoted `git ls-files` output as literal Windows paths and failed on the Chinese filename | 1 | Kept the successful file inventory and switched subsequent path handling to unquoted/UTF-8-safe enumeration; no file decision depended on the failed row. |
| Combined prototype/schema inspection command used a double-quoted PowerShell regex containing nested quotes and failed before reading files | 1 | Split the read and changed the regex to PowerShell single-quoted form; the subsequent inspection completed without changing files. |

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
| First Windows interpreter-seam run passed 3/6 installer tests; repeat install/repair reported reconstructed requirements drift | Retained fixtures proved Windows backslash escaping defeated the Linux raw ownership marker. A second path-normalized test-only seam passed 6/6; production and test files were restored and hash-verified. |
| PowerShell `rg` received a Unix-style wildcard for active planning Markdown | Used explicit file paths/native PowerShell selection; no source result was relied upon from the failed command. |
| Optional Python `jsonschema` package is not installed | Kept Round 1 dependency-free: JSON parsing, schema structure, hashes, anchors, evidence, and boundary invariants are checked by the built-in Node test. Round 2 may add schema-instance validation without making runtime depend on `jsonschema`. |
| Final Round 1 hygiene assertion found two intentional Markdown hard-break spaces | Replaced them with blank blockquote lines so the documentation also satisfies the repository's zero-trailing-whitespace rule. |
| The inherited upstream archive SHA did not match the official tag download | Kept the importer fail-closed, verified Release metadata and alternate endpoints, then bound the contract to the explicit canonical tag URL and its twice-observed SHA; per-file hashes remain independently enforced. |
| The real archive contained eleven paths ending in the canonical catch-up suffix | Required exactly one archive root plus the complete canonical source path, excluding all IDE and distribution mirrors. |
| Static `py_compile` created `__pycache__` inside the exact runtime inventory | Confirmed `check` rejected the unknown entry, removed only the verified workspace cache paths, and switched final syntax validation to in-memory `compile()`. |
| Initial Cloud JSONL fixture produced no catch-up report | Its 4,297 bytes were below upstream's 5,000-byte substantial-session threshold; added an ignored `world_state` padding record without changing message indices or the seven extracted compatibility messages. |
| A non-escalated inline Python diagnostic could not create its temporary project under the managed Windows Temp sandbox | The preceding file-size evidence already identified the cause; retained tests use the approved Node/Python test execution path instead of retrying the blocked diagnostic. |
| Final candidate preflight found `runtime/upstream/__pycache__` | It was left by the earlier `importlib` fixture diagnostic; exact inventory correctly blocked packaging. Remove only that verified cache and rerun the preflight before building any candidate. |
| Final static test-count assertion reported 19 instead of the executed 25 | The line-based count intentionally missed six tests registered from the golden fixture loop. Count 19 direct declarations plus six fixture scenarios, and retain `npm test` 25/25 as execution evidence. |
| First final-status patch used the terminal's mojibake rendering of the phase title and did not match the UTF-8 file | Re-read the file explicitly as UTF-8 and applied the status update against the real em-dash text. |
| Initial Phase 2 symbol scan referenced obsolete root `hook_adapter.py` and made the combined `rg` command exit 1 | Located the packaged source with `rg --files` and inspected the actual `hooks/hook_adapter.py`; no conclusion relied on the failed path. |
| First Round 1 narrow regression passed 12/13 and failed only because the deterministic Release test still expected the Phase 1 count of 18 entries | Updated the assertion to the new exact 19-entry Round 1 allowlist; retained Phase 1 alpha.1 counts as historical acceptance evidence. |
| Post-suite importer check found `runtime/__pycache__` and `runtime/upstream/__pycache__` created by the new dynamic import | Set `sys.dont_write_bytecode=true` inside the owned runtime, added a zero-cache regression, removed only the two verified workspace cache directories, and reran exact inventory checks. |
| First zero-cache regression still found `runtime/__pycache__/owned-catchup...pyc` | The Windows native-path harness imports the entrypoint as a module, unlike production's script execution. Set `PYTHONDONTWRITEBYTECODE=1` only on that test harness; retain the normal CLI test to prove the production path does not cache its upstream import. |
| Initial Round 2 planning updates failed first against a stale directory and then against an outdated combined-patch anchor | Resolved `.planning/.active_plan`, re-read the active UTF-8 files, recorded both failures, and switched to narrow patches against the actual active plan. |
| The first opt-out short-circuit patch mixed adapter and runtime anchors under the adapter file | Split the change by file and applied the adapter marker-scan short circuit and runtime parser-load short circuit independently. |
| The first upstream-load short-circuit regression returned `invalid_request` on Windows | Its special harness requested native-path validation while passing a POSIX fixture root. Restored production `require_posix=true`; the product short circuit itself was unchanged. |
| The first harness fix matched the identical native-harness line instead of the short-circuit harness line | Reapplied with named-array context: native fixtures retain Windows path validation and only the POSIX short-circuit fixture uses production validation. |
| Final cache hygiene failed after all 35 functional cases passed | A manual `importlib` diagnostic had created one verified `runtime/__pycache__/owned-catchup...pyc`. Removed only that workspace cache and retained the regression that prevents production/test harness cache creation. |
| First Round 3 supervisor regression failed on invalid child UTF-8 | Python text-mode capture raised inside its reader thread and left `stdout=None`. Switched the inactive supervisor to bounded binary capture followed by strict main-thread UTF-8 decoding, which deterministically maps invalid bytes to `runtime_error`. |
| Initial Round 3 documentation sync used an English `current resolver` anchor where the UTF-8 source said `当前 resolver` | Split the combined patch by file and reapplied the project-understanding update against its exact text. |
| A timeout inventory used Unix wildcard path arguments under PowerShell, so the second `rg` invocation exited 1 after the first search had already returned useful matches | Re-ran the inventory with `--glob` and explicit directories, then inspected the adapter's exact supervisor lines; no conclusion relies on the failed wildcard invocation. |
| Two inline `python -c` attempts to extract the README Cloud probe were parsed incorrectly by PowerShell (`<` redirection parsing, then stripped nested quotes) | Switched to a PowerShell here-string piped to Python stdin for read-only validation; the exact embedded probe compiled and executed successfully without workspace writes. |
| The first README-prompt assertion embedded Chinese headings in a PowerShell-to-Python here-string and the console code page converted them to `???` | Verified the UTF-8 headings directly with `rg`, then reran the structural assertion using stable ASCII anchors; 20 Markdown fences are balanced and both prompts are present. |
