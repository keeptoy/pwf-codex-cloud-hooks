# Task Plan: v0.2.2 Codex Cloud Catch-up Compatibility Patch

## Goal
Implement one auditable, idempotent compatibility patch for upstream planning-with-files v3.8.2 so Codex Cloud SessionStart catch-up uses the explicit Codex runtime, resolves `$CODEX_HOME/sessions`, recognizes scoped `.planning` state, and preserves trailing user context without weakening installer drift protection.

## Next Step
After documentation is final, rebuild the v0.2.2 ZIP, calculate its new SHA-256, manually replace the bootstrap placeholder, and publish that exact archive.

## Current Phase
Phase 4

## Phases

### Phase 1: Patch contract and source transformation
- [x] Define original/patched hashes, patch ID, and fail-closed states
- [x] Implement an atomic, idempotent Skill patcher
- [x] Validate transformation against supplied upstream v3.8.2 source
- **Status:** complete

### Phase 2: Runtime and installer integration
- [x] Make adapter explicitly select Codex runtime
- [x] Make installer require the patched Skill state
- [x] Integrate patch application into the Cloud bootstrap workflow
- **Status:** complete

### Phase 3: Tests and documentation
- [x] Add patcher and synthetic catch-up tests
- [x] Preserve existing installer test coverage using patched temporary fixtures
- [x] Document the temporary compatibility patch in README and black-box workflow
- **Status:** complete

### Phase 4: Verification and handoff
- [x] Run available Node/Python/upstream checks
- [x] Verify hashes, idempotence, and corruption blocking
- [x] Verify the source release contract and required payload files
- [ ] Verify the final immutable ZIP layout and SHA-256 after documentation freeze
- [x] Provide Cloud release and black-box validation steps
- **Status:** pending final packaging

### Phase 5: Black-box runbook modernization
- [x] Read and classify every scenario in the legacy TXT
- [x] Rewrite it as a structured beginner-friendly Markdown runbook
- [x] Reconcile the old v0.2.1 catch-up recipe with current v0.2.2 behavior
- [x] Rename references in README and verify links/content
- **Status:** complete

### Phase 6: Planning state organization
- [x] Create a dedicated scoped plan for the complete v0.2.2 compatibility task
- [x] Move task plan, findings, and progress out of the repository root
- [x] Point `.planning/.active_plan` at the new scoped task
- **Status:** complete

### Phase 7: v0.2.2 Release-test self-containment
- [x] Remove the test-only dependency on the absent v0.2.1 bootstrap
- [x] Preserve every v0.2.2 bootstrap ordering and checksum assertion
- [x] Correct README rollback wording and repository map
- [x] Rerun the targeted Node suite and verify dependency removal
- **Status:** complete

### Phase 8: Cloud-wrapped user-context preservation
- [x] Add a bounded head-and-tail user-message renderer
- [x] Integrate it into the provisional compatibility patch
- [x] Update manifest/bootstrap managed hash and patch identity
- [x] Add long-wrapper sentinel regression coverage
- [x] Update README and black-box diagnostics
- [x] Run targeted and available full verification
- **Status:** complete

### Phase 9: Pre-release single-patch simplification
- [x] Collapse the provisional multi-stage chain into one patch contract
- [x] Accept only pristine upstream or the current patched result
- [x] Remove legacy-upgrade test and versioned-patch wording
- [x] Recompute the single patched hash and synchronize all consumers
- [x] Run targeted and available full verification
- **Status:** complete

### Phase 10: Cloud acceptance and documentation sync
- [x] Record the tested package SHA-256 as non-final evidence
- [x] Record full A—F Cloud black-box acceptance
- [x] Mark README and runbook as functionally accepted with packaging pending
- [x] Keep the scoped delivery plan open only for the manual packaging gate
- **Status:** complete

## Key Questions
1. How can bootstrap patch the global Skill before install.js validates it?
2. How should provenance record both pristine upstream and managed patched hashes?
3. How can direct installer tests remain self-contained without mutating the pristine fixture?
4. How should v0.2.1 remain immutable while v0.2.2 setup is introduced?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Keep the checked-in Skill fixture pristine | It remains evidence of the exact upstream v3.8.2 input. |
| Patch only after matching the pristine SHA-256 and verify the output SHA-256 | Makes the transformation idempotent and fail-closed. |
| Treat scoped-plan support as part of the same compatibility patch | It closes a known early-return gap while touching the same upstream script. |
| Do not edit the supplied upstream source tree | It is a reference/test input, not production-owned code. |
| Use `2026-08-01-v0.2.2-cloud-catchup-compatibility` as the scoped plan slug | It covers the whole compatibility delivery—patch, integration, tests, runbook, release, and Cloud acceptance—without conflating it with the broader modernization roadmap. |
| Use one unversioned compatibility patch contract before public release | Cloud sandboxes install from pristine upstream into disposable state, so migration between provisional patch revisions adds complexity without serving a real deployment path. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Workspace is not a Git checkout | 1 | Preserve files carefully and use explicit file/hash comparisons instead of Git diff. |
| PowerShell `New-Item` rejected `-LiteralPath` in the patch-contract harness | 1 | No test directory was created; retry with validated explicit `-Path`. |
| Python `TemporaryDirectory` created an inaccessible Windows ACL during the synthetic catch-up test | 1 | Removed the generated directory and switched to a PowerShell-created workspace temp root. |
| Normal cleanup and ACL reset could not access the generated temp directory | 2 | Scoped elevated ownership/ACL recovery removed only `.tmp-pwf-catchup-2w_yrml2`. |
| A multi-file planning update failed despite apparently matching context | 1 | Read the current plan and applied smaller exact-context updates. |
| New adapter regression expected an obsolete canary phrase | 1 | Test output proved catch-up worked; updated the assertion to the owned `PWF_GLOBAL_HOOK_CANARY_V1` marker. |
| Native Windows full suite cannot satisfy the production `/usr/bin/python3` preflight | 1 | Kept the Linux Cloud safety contract intact; new patch/catch-up and adapter cases pass locally, installer cases remain for Linux/Cloud CI. |
| Final-check summary mislabeled Node syntax after `rg` returned “no matches” | 1 | Saved command results separately and reran: Node syntax PASS, zero trailing-whitespace matches. |
| Original workspace path became invalid after the directory was renamed | 1 | Located the uniquely matching `pwf-codex-cloud-hooks` directory on Desktop and continued there. |
| `apply_patch` inherited the invalid old workspace path | 1 | Created a temporary verified junction from the old path to the renamed workspace; remove it after all patches. |
| PowerShell `Remove-Item` threw a null-reference error for the temporary Junction | 1 | Junction and target remained intact; switch to same-process non-recursive `.NET Directory.Delete(path, false)` after revalidation. |
| Cloud `skill-patch.test.js` tried to read absent `init-cloud-sandbox-v0.2.1.bash` | 1 | Remove the repository-history assertion; v0.2.2 tests now depend only on v0.2.2 artifacts. |
| Bootstrap contract test required the pre-release all-zero checksum after the real v0.2.2 SHA was recorded | 1 | Accept any pinned 64-character lowercase SHA-256 while retaining the explicit all-zero rejection guard assertion. |
| Full 12-case suite reports six installer failures on native Windows | 1 | All six stop at the intentional `/usr/bin/python3` Cloud preflight; targeted patch and adapter tests pass, and installer cases remain a Linux/Cloud release gate. |
| Release-status grep flagged the accurate all-zero rejection-guard documentation as stale | 1 | Narrow the check to obsolete “contains an all-zero placeholder” wording while retaining documentation of the active safety guard. |
| Documentation changes invalidated the previously tested ZIP hash | 1 | Restore the all-zero bootstrap placeholder, relabel the old hash as test-package evidence, and leave final repack/hash pinning as a manual release step. |
