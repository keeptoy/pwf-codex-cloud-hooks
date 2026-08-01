# Task Plan: v0.2.2 Codex Cloud Catch-up Compatibility Patch

## Goal
Implement an auditable, idempotent compatibility patch for upstream planning-with-files v3.8.2 so Codex Cloud SessionStart catch-up uses the explicit Codex runtime, resolves `$CODEX_HOME/sessions`, and recognizes scoped `.planning` state without weakening installer drift protection.

## Next Step
Publish the immutable v0.2.2 ZIP, record its SHA-256 in the bootstrap, then run the Linux installer suite and tests A—D from the new Markdown runbook.

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
- [ ] Verify the final immutable ZIP layout and SHA-256 after publication
- [x] Provide Cloud release and black-box validation steps
- **Status:** pending

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
