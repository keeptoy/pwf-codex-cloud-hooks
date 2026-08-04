# Progress Log: Managed Runtime Modernization

## Session: 2026-08-04 — R4-C downloaded-asset self-audit repair

- Diagnosed the first post-resume F discrepancy: the live directory correctly contains 12 physical files, while the integrity manifest owns 11 payloads and is the twelfth metadata file. Doctor exit 0 / healthy / non-repairable / empty errors and blockers, beta.1 version, the exact known 12-path directory, and zero residues rule out production drift. Classified this as acceptance-script counting drift.
- Updated only the ZIP-external beta.1 F runbook to match R3/R4-A/R4-B: exclude `installed-manifest.json` from the filesystem payload list, assert exactly 11 paths, and compare that sorted list exactly with `manifest.runtime_files`. The manifest remains separately loaded and version-checked. No installer, runtime, Release input, ZIP, bootstrap, or checksum changed; corrected F rerun is pending.
- Received the replacement Fresh Cloud seal result. The exact runbook script exited 0 with Linux 69/69/0/0, Python 3.14.4 / zlib 1.3, imported runtime modes PASS, Release LF PASS, ZIP 22 / 84,316 / `c9dd8b...66f91`, bootstrap 17,425 / `0c9d57...1f2a`, placeholders absent, and clean workspace. No live `/opt/codex` install or GitHub Release occurred.
- Promoted the replacement pre-publication seal to PASS across the R4-C seal record, beta.1 hard-acceptance status, Round 4 design, programme roadmap, project understanding, and active execution plan. README remains byte-frozen inside the accepted ZIP; changing its pre-seal status snapshot now would invalidate the exact candidate and is intentionally avoided.
- The maintainer corrected the next validation label from white-box to black-box and reported that A1 fails because the downloaded ZIP lacks `tools/build_release.py` while the acceptance script invokes it from the extracted package root.
- Audited the exact 21-entry contract, builder executable list, README packaging text, A1 command, and inventory/hash references. Confirmed a real contract/runbook mismatch rather than an upload or Cloud filesystem failure.
- Entered a bounded Release repair gate. Chose a 22-entry self-auditable archive because README tutorial changes already require new candidate bytes, the builder is a non-runtime audit tool, installed inventory remains 11, and the package-root A1 verification becomes internally coherent. Old beta.1 SHA values are now superseded-before-publication evidence, not upload candidates.
- Added a test-first assertion for the 22-entry self-auditable boundary. The focused Release test failed as expected with `21 !== 22`, proving the existing contract omission before the product change.
- Added the builder to the Release contract and its executable metadata, synchronized the contract attestation in `upstream-manifest.json`, and added copyable PowerShell plus Linux/Git Bash build/check/hash instructions to README. The focused Release test then passed 1/1. A wider contract run exposed one expected stale exact-count assertion in `phase3-contracts.test.js` (`22 !== 21`); it is inventory fixture drift, not a runtime defect, and is updated to the new authorized Release boundary.
- The first 22-entry build produced an intermediate candidate, but the post-build documentation audit found that README (itself a ZIP entry) still described R4-C as only beginning its seal. That stale public status must not ship. The README status was corrected before final sealing, so the intermediate ZIP/bootstrap identities are deliberately discarded and will not be published or recorded as final candidates.
- Final ZIP-first/bootstrap-second reseal completed after the README audit: ZIP 22 entries / 84,316 bytes / SHA `c9dd8bf5dea0f50662df0a15d653584b7d9a6f1f0329dfc3c2d55fe33a366f91`; bootstrap 17,425 bytes / SHA `0c9d57f53ff980d9d207bc8291b1f055058000e45258732b19156ec93b8b1f2a`. Current beta.1/R4-C docs and regressions now freeze only these identities; old and intermediate values are excluded from the current surface.
- Full Windows suite passes 69 registered / 51 PASS / 18 honest POSIX/Linux SKIP / 0 FAIL. Python compilation, Node syntax, importer exact check, builder check, and `git diff --check` pass. Local Bash/WSL is unavailable, so the target syntax/full 69/69/exact-byte proof remains correctly assigned to the new Fresh Cloud seal.
- Extracted-package self-audit passes: the final ZIP contains 22 files, contains `tools/build_release.py`, excludes the external bootstrap, and the packaged builder/contract verify the original archive as healthy with the final exact size/SHA. No live `/opt/codex` install or publication occurred.

## Session: 2026-08-04 — beta.1 local packaging handoff

- The maintainer checkpointed the Cloud-PASS documentation at commit `d86b9845179f47e6aba328a5f28845c494edb0a4` and requested a local ZIP rebuild plus Bootstrap checksum review before the next Cloud white-box test.
- Recovery found a clean branch tracking `origin/0.3.0-beta.1`. The authoritative plan still requires publication of the already-sealed byte identities, so the safe implementation is to rebuild to a separate probe path, compare exact size/SHA with the accepted ZIP, and replace/update nothing unless the deterministic result proves why a new seal is required.
- README names `tools/build_release.py` and describes deterministic Release guarantees, but the initial scan found no obvious step-by-step local packaging recipe. This documentation gap will be confirmed against the surrounding Release/development sections before deciding whether README can be edited without invalidating the frozen ZIP.
- Confirmed the exact documentation boundary: README has the high-level ten-step Release process but no literal local builder/check/SHA command recipe. Because README is a frozen ZIP entry, it remains unchanged for beta.1; the maintainer handoff will carry the exact commands.
- The first separate-probe rebuild command failed at PowerShell parse time on invalid generic static-call syntax for `SequenceEqual[byte]`; no command in the script executed and no probe file was created. The retry will compare exact length plus SHA-256 after the builder's own full content/metadata check, which is simpler and sufficient for this immutable artifact.
- The corrected separate-probe build/check passes and reproduces the accepted ZIP exactly at 21 entries / 81,084 bytes / SHA `154eea...d528`. The probe was removed after comparison; the existing ignored `dist/pwf-codex-cloud-hooks-v0.3.0-beta.1.zip` remains ready for upload.
- Release/Bootstrap focused tests pass 4/4. Bootstrap already contains the rebuilt ZIP SHA, so no source edit was made and its accepted external-asset SHA remains unchanged.
- Final handoff check confirms ZIP 81,084 / `154eea...d528`, Bootstrap pin exact-match, Bootstrap 17,425 / `a75c...2edc`, zero rebuild-probe leftovers, and clean diff syntax. Only this session's `findings.md` and `progress.md` records are uncommitted; Release assets and source remain unchanged.

## Session: 2026-08-04 — R4-C pre-publication Cloud seal PASS

- Received the complete repaired Fresh Cloud output for `PWF_PHASE3_ROUND4_R4C_CLOUD_SEAL_V1`. Python 3.14.4 / zlib 1.3 compiled all Python sources; the four imported runtime Git paths reported `100755`; importer returned `healthy=true` with the four exact managed hashes.
- Linux suite passed 69/69 with zero failures/skips. All 22 Release paths were LF-bound. The Linux build reproduced the exact 21-entry, 81,084-byte ZIP at SHA `154eea0641f454a1e6c05a55ef7998eb0442656b1e632595442af4d16365d528`; bootstrap reproduced 17,425 bytes at SHA `a75c333cb5d11d7c084582d026d2fcbdbbcd3f65085b83d10c031c32cdf52edc`.
- Placeholder check passed, the Cloud checkout remained clean, and the script ended with `R4C_PREPUBLICATION_CLOUD_SEAL=PASS`. No live `/opt/codex` install or GitHub Release was performed. The exact sealed assets are now authorized for publication; published-download verification and live Fresh/Resume A–F remain pending.
- Synchronized the programme roadmap, project understanding, Round 4 activation design, pre-publication seal record, beta.1 A–F runbook status, and active plan. README remains intentionally untouched because it is one of the frozen ZIP entries; no candidate byte or checksum changed.
- Final post-record audit passes: all eight changed paths are outside the 21-entry ZIP, overlap count is zero, `git diff --check` passes, and the local sealed assets still match 81,084 / `154eea...d528` and 17,425 / `a75c...2edc`. Stopped before external publication as required.

## Session: 2026-08-04 — R4-C Cloud seal mode-mismatch diagnosis

- The first fresh no-setup Cloud seal attempt correctly stopped at `python3 tools/import_upstream_runtime.py check` with `{"error":"runtime mode mismatch for session_catchup","healthy":false}`. Python 3.14.4 static compilation passed; the suite and all later Release gates were not run; the Cloud workspace remained clean; no live install or publication occurred.
- This failure is not yet attributed to CMD, Git Bash, or line endings. The reported boundary is a POSIX runtime mode comparison. Windows checkout warnings about LF being replaced by CRLF describe worktree content conversion and do not by themselves prove an executable-bit change. The next step is an evidence-based four-way mode comparison before modifying any frozen candidate byte.
- Git-index inspection identifies the mismatch: all four files in the default importer destination `runtime/upstream/` are committed as `100644` while their imported-runtime contract is `0755`. The importer checks that directory on POSIX and stops at the first mismatch. `.gitattributes` confirms LF for `session-catchup.py`; shell choice is not causal. Classified as latent repository source/index-mode drift plus a Windows test-coverage gap. The two local owned-runtime source modes are outside this importer boundary and are not broadened into the repair.
- Added a cross-platform Git-index assertion to the existing importer test and a matching pre-import check/summary field to the R4-C Cloud runbook. Updated only the four `runtime/upstream/*` index modes from `100644` to `100755`; their blob identities and bytes are unchanged.
- The first sandboxed `git update-index` attempt failed with `.git/index.lock: Permission denied` because this workspace grants normal writes outside `.git`; the narrowly escalated identical metadata command then succeeded. The first focused Node test launch subsequently hit the known Windows sandbox `spawn EPERM` before any test body ran; rerun must use the previously established out-of-sandbox test boundary rather than treating it as a product failure.
- Out-of-sandbox focused importer tests pass 3/3. The full Windows suite remains 69 registered / 51 PASS / 18 honest POSIX/Linux SKIP / 0 FAIL.
- Independent post-repair Release build and check reproduce the exact sealed ZIP at 21 entries / 81,084 bytes / SHA `154eea0641f454a1e6c05a55ef7998eb0442656b1e632595442af4d16365d528`; the preserved local ZIP matches it byte-for-byte. Bootstrap remains 17,425 bytes / SHA `a75c333cb5d11d7c084582d026d2fcbdbbcd3f65085b83d10c031c32cdf52edc`. Importer content check, changed-JS parse, and `git diff --check` pass. No asset rebuild or hash update is authorized.
- The first final runbook syntax command invoked bare `bash`, which is not on this PowerShell PATH; PowerShell continued to later read-only checks, so its trailing custom PASS marker is not evidence for Bash syntax. Re-run must use the Git installation's resolved `bash.exe` path and explicitly inspect its exit code.
- The resolved Git `bash.exe` syntax attempt then hit the known sandbox-only `couldn't create signal pipe, Win32 error 5` boundary and returned `-1073741502`; no script statement executed because this was `bash -n`. Re-run the same extracted block outside the Windows process sandbox, matching prior Release-script validation practice.
- The out-of-sandbox Git Bash syntax rerun passes. Added a concise incident explanation to the Cloud runbook so future operators know the new `100755` precheck addresses Git metadata rather than line endings or shell choice.

## Session: 2026-08-04 — R4-C entry audit

- The maintainer confirmed the R4-B closure checkpoint and explicitly authorized R4-C.
- Recovery found a clean `0.3.0-beta.1` branch at commit `848b4f39d0a7a3cde093606c216d5bab67195cf4`, 16 commits ahead of the alpha.2 remote baseline, with no unsynced session-catchup report.
- Entered the mandatory critical-round sealing audit before modifying candidate bytes. External publication remains behind a final exact-byte/hash review; alpha.2 remains the rollback baseline.
- Read the R4-C activation/rollback design, README release workflow, programme road map, release contract, deterministic ZIP builder, bootstrap defaults, and version-bearing tests. The audit found no runtime/schema/inventory conflict and is preliminarily GO.
- One broad version inventory included a nonexistent `package-lock.json` argument; `rg` reported that missing path while all existing-file results remained usable and the command made no change. The repository intentionally has only `package.json`; subsequent searches use enumerated existing paths.
- Audited version references, Release tests, ignored `dist/`, manifest version flow, current remote branches, and prior release history. No local alpha prerelease tags are present; R4-C will use explicit beta.1 identity rather than branch-upstream inference.
- A tracked-file-wide `rg` reused quoted `git ls-files` output and failed only on the Chinese `黑盒验证.md` path after returning the relevant version matches. No conclusion depends on that failed path; subsequent inventories use `rg` directory/glob selection or native PowerShell file enumeration.
- The first combined findings/progress update used the wrong shorthand `.planning/progress.md` path and failed atomically before changing either file. Reapplied against the resolved active planning directory.
- Compared the prior alpha.2 release commit and current release layout, then audited `.gitattributes` against all 21 ZIP entries. Current bytes are LF-clean, but five package inputs lack an explicit LF attribute under a `core.autocrlf=true` Windows configuration.
- Paused candidate version/hash work and introduced the bounded R4-C-A deterministic-source sub-gate. This is a Release reproducibility hardening step; it does not change runtime behavior, trusted inventory, or Cloud semantics.
- The first sandboxed local-clone probe hit the known Git-for-Windows `sh.exe` signal-pipe access error and stopped before a clone existed. Re-ran the same bounded temporary probe outside that process restriction, verified the temp path before cleanup, and removed the probe directory afterward.
- Fresh `core.autocrlf=true` clone reproduced five CRLF Release inputs and a different deterministic-ZIP SHA. Classified this as a Release-source test gap, not a runtime defect, and froze a `.gitattributes` plus Release-test-only repair boundary.
- Added explicit LF attributes for all previously uncovered ZIP paths and the ZIP-external bootstrap. Extended the Release test so every contract entry and external asset must resolve to Git `eol=lf`; focused test passes 1/1.
- The first post-fix probe tried to replace `.gitattributes` only in an existing clone and then run `checkout-index`; Git correctly continued using the clone's old index attributes, so it reproduced CRLF again. Replaced that invalid model with a temporary committed-attribute source followed by a true fresh clone.
- Corrected fresh-clone proof passes: zero CRLF Release assets and identical `3d59e108...` ZIP SHA in autocrlf/current checkouts. Temporary repositories and archives were removed after verified bounded cleanup. Closed R4-C-A without changing runtime or inventory.
- Began beta ZIP-input freeze: changed package identity to `0.3.0-beta.1`, tightened the checksum workflow to hash both assets before publication, and synchronized README/architecture/roadmap/design to candidate-sealing-in-progress while preserving alpha.2 as rollback.
- Removed one stale README `adapter no-dispatch` description and added an explicit beta.1 acceptance-document navigation entry. The bootstrap itself remains byte-for-byte alpha.2 at this stage, as required by ZIP-first sealing.
- Inspected owned-plan temp naming and installer/runtime inventory structures to make the eventual post-resume zero-snapshot and 11-file checks use real implementation boundaries.
- Added the beta.1 A～F Cloud hard-acceptance runbook with explicit dual-asset placeholders, download/setup verification, Fresh startup/UserPrompt canaries, structured planning baseline, canonical UserPrompt context, long-tail resume catch-up, post-resume doctor/11-file inventory, and `/tmp/pwf-codex-cloud-hooks-<uid>/pwf-snapshot-*` residue check.
- The first focused ZIP-input test run passed Release, bootstrap, and overlay tests but failed the contract test on the expected fail-closed consequence of editing `release-artifact-v1.json`: its frozen SHA in `upstream-manifest.json` was stale. Updated only that exact contract hash; no runtime or schema hash changed.
- Focused beta ZIP-input rerun passes 5/5 after synchronizing the Release-contract hash.
- Full Windows beta.1 suite passes: 69 registered / 51 PASS / 18 honest POSIX/Linux SKIP / 0 FAIL. The npm package identity is now `pwf-codex-cloud-hooks@0.3.0-beta.1`; R4-B behavior/goldens, installer lifecycle, provenance, deterministic Release, supervisor, owned runtimes, and prototype isolation remain green.
- Static/provenance gate passes: all Python compiles in memory, `install.js` and changed Release test parse, every JSON parses, importer exact check is healthy, and `git diff --check` has no error beyond expected non-Release Windows line-ending notices.
- Git Bash syntax gate passes outside the known signal-pipe sandbox for both the external bootstrap and the beta.1 runbook's executable Bash block.
- Froze the deterministic beta.1 ZIP: 21 entries, 81,084 bytes, SHA-256 `154eea0641f454a1e6c05a55ef7998eb0442656b1e632595442af4d16365d528`. Independent second build and builder check both match. Recorded the ZIP SHA in the beta acceptance runbook; did not modify bootstrap yet.
- Sealed the ZIP-external bootstrap defaults to `v0.3.0-beta.1` and the frozen ZIP SHA, then migrated its regression from alpha.2 defaults while preserving the placeholder guard and pristine-global-Skill/no-patcher assertions.
- Post-seal focused tests pass 4/4, bootstrap `bash -n` passes, and the already-frozen ZIP still checks at 21 entries / 81,084 bytes / SHA `154eea...` without rebuild.
- Final post-bootstrap Windows suite remains 69 registered / 51 PASS / 18 honest POSIX/Linux SKIP / 0 FAIL.
- Computed the sealed bootstrap identity after all bootstrap changes and tests: 17,425 bytes, LF-only, SHA-256 `a75c333cb5d11d7c084582d026d2fcbdbbcd3f65085b83d10c031c32cdf52edc`. Reverified the ZIP hash remained `154eea...d528`.
- Replaced every beta asset placeholder in the acceptance runbook with the exact ZIP/bootstrap SHA values. No external publication or live `/opt/codex` installation has occurred.
- Added `phase-3-round-4-r4c-cloud-seal-check.md`: a no-live-install, no-publication Fresh Cloud gate that reruns all 69 Linux tests and requires exact cross-platform ZIP bytes, exact bootstrap bytes/defaults, all 22 LF attributes, no placeholders, and a clean checkout before publication.
- Final syntax review passes for all three executable Bash sources: sealed bootstrap, beta.1 published-download block, and pre-publication Cloud seal script.
- Added automated final-asset assertions: bootstrap SHA must equal `a75c...2edc`, acceptance docs must contain both exact asset hashes and no placeholder, and all ZIP/external paths must remain Git `eol=lf`.
- Final local full suite after those assertions remains 69 registered / 51 PASS / 18 honest POSIX/Linux SKIP / 0 FAIL.
- Final local seal audit passes: frozen ZIP still matches current 21 source entries and exact 81,084-byte SHA; bootstrap matches exact 17,425-byte LF-only SHA/defaults; all 22 release paths are LF-bound; acceptance placeholders are absent; document structure/links and `git diff --check` pass.
- Full diff review found only post-seal documentation-state lag: the beta runbook still said to replace placeholders and the roadmap still said assets were being frozen. Corrected those ZIP-external documents to assets-sealed / pre-publication-Cloud-pending without changing either asset.
- The first final placeholder audit included the Cloud seal runbook itself and found the literal search pattern embedded in its own command. This exposed a real test-only self-match: the Cloud script would always fail its placeholder check even when no placeholder remained. Split the marker across adjacent Bash literals so runtime search semantics stay identical without a static self-match; both sealed assets remained unchanged.
- Final post-fix verification passes: the corrected Cloud-seal Bash block and dual-asset checks report PASS, acceptance placeholders remain zero, the deterministic builder confirms the exact frozen archive, and the complete local R4-C seal reports PASS. No candidate byte changed. The only authorized next action is to checkpoint/push this exact state and run the fresh no-setup Cloud seal gate before publication.

## Session: 2026-08-04 — R4-B Cloud closure

- Received the exact R4-B Fresh Cloud acceptance result. The unmodified runbook completed successfully with static PASS and 69/69 Linux tests, including real both-child root/root and synthetic cross-user execution plus both process-group cleanup layers.
- The isolated alpha.2-to-current upgrade passed; doctor reported healthy, Managed policy remained adapter-only, installed/runtime inventories stayed 11/21, direct plan/no-plan/SessionStart latency and output measurements stayed within their frozen budgets, snapshot leftovers were zero, and the Cloud workspace remained clean.
- Closed R4-B and moved the activity plan to an intentional stop at the R4-C authorization boundary. No executable, schema, manifest, installer, bootstrap, version, checksum, live `/opt/codex`, or Release asset was changed by this evidence-recording step.
- Two combined planning patches failed because the terminal rendered a valid UTF-8 en dash in the Phase 3 status line as mojibake, so the attempted literal anchor did not match. The stable fields were updated separately; an ASCII-escaped byte inspection confirmed the actual `U+2013`, and the whole status line was then corrected successfully. No product file changed in either failed attempt.
- A later stale-wording scan again passed a Unix-style wildcard as a PowerShell path. The explicit-file results before that argument were useful, but the combined command exited 1 on the invalid Windows path. Kept the historical R4-A count lines, updated the dated R4-B test inventory separately, and used enumerated files for subsequent checks.
- Post-closure consistency checks pass: the nine changed paths are documentation/planning only, executable diff is empty, `git diff --check` exits 0, and the current-authority stale R4-B-pending scan is empty. The focused Phase 3 lifecycle contract test passes 1/1 outside the known Windows worker-spawn restriction.
- Final documentation structure review passes for all nine changed files: UTF-8 has zero replacement characters, Markdown fences are balanced, and every relative link resolves. Full diff review confirms the closure preserves alpha.2 as rollback, distinguishes R4-B isolated Cloud acceptance from R4-C Fresh/Resume Managed Hook acceptance, and makes no product or Release claim.

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
- Built and verified the final local `dist/pwf-codex-cloud-hooks-v0.3.0-alpha.1.zip` after runtime-root symlink hardening: 18 entries, 59,097 bytes, SHA-256 `94fe21837d26bbe07d23cdf88b89133c12e6f431eafd8c412ece96204f6a5027`. The initially measured external-bootstrap hash `5fda25beb397affe8e47b2e27e5bec7fa15180dbfb3d57feb9f6e508876e306f` was pre-seal and was superseded once the alpha version and ZIP SHA defaults were written.
- Added `docs/v0.3.0-alpha.1-cloud-smoke.md` with the two-asset publication contract, checksum-verified fresh setup command, exact installed-inventory probe, and simplified compatibility smoke. The document and planning log are excluded from the ZIP, so recording the candidate hash is non-self-referential.
- Local Bash is unavailable; no new Bash syntax PASS is claimed. Candidate ZIP check, Node syntax, Python compilation, runtime inventory, and `git diff --check` pass.
- Final installer audit now rejects symlinked `hooks/` or runtime roots before recursive traversal and covers unknown empty directories. The complete suite was rerun after this hardening and remains 25/25 PASS; the candidate was then rebuilt and the smoke document updated to the final SHA above.
- Post-interruption recovery audit confirmed that the working tree, deterministic candidate, runbook SHA pins, exact four-file source runtime, and planning state all remain consistent. Candidate and external bootstrap hashes were recomputed from disk and match the recorded values; `git diff --check` remains clean.
- The complete suite was rerun after recovery outside the Windows worker sandbox because the first attempt hit the known `spawn EPERM` restriction: 25 passed, 0 failed. Release check reports 18 exact entries/59,097 bytes, importer check is healthy, and the production adapter, compatibility patcher, and bootstrap remain unchanged from the branch baseline.
- Phase 1 is complete locally across all three rounds. The only remaining Phase 1 acceptance step is external: publish the ZIP and bootstrap as separate `v0.3.0-alpha.1` pre-release assets and run the documented fresh Codex Cloud smoke. No asset, commit, tag, or Hook execution switch was made locally.

# Phase 1 alpha.1 Cloud smoke (2026-08-02)

- The published 59,097-byte candidate downloaded successfully in a fresh Cloud task and matched SHA-256 `94fe21837d26bbe07d23cdf88b89133c12e6f431eafd8c412ece96204f6a5027`.
- Post-start doctor passed with `healthy=true`, `repairable=false`, managed requirements enabled, and exactly `SessionStart` plus `UserPromptSubmit` registered.
- Installed manifest/inventory passed: schema 3, seven payload records, exact eight-file installed inventory, no unknown or missing entries, and all seven payload hashes matched.
- Managed requirements still contain only adapter commands (`adapter_commands_only=True`); none of the newly staged `upstream/` scripts is registered for execution.
- This closes the release/SHA/install/doctor/inventory portion of the alpha.1 smoke. Remaining evidence is the simplified behavior-compatibility portion: startup/user-prompt canaries and scoped context, resume catch-up/runtime, bounded wrapper tail sentinel, and doctor healthy after resume.

## Phase 1 alpha.1 compatibility acceptance (2026-08-02)

- User reported all compatibility checks A through F PASS, including the startup/UserPrompt canaries, scoped planning context, resume catch-up, bounded wrapper tail sentinel, and doctor remaining healthy after resume.
- The captured resume report selected `rollout-2026-08-02T09-23-56-019fc1c9-839a-7533-8d8e-0b2cf9296b85`, reported `Runtime: codex`, found `task_plan.md` at message #79, and extracted six unsynced messages.
- `SESSION CATCHUP DETECTED`, the resume canary/source, previous session, planning context, three tool records, `PLANNING_BASELINE_CREATED`, `UNSYNCED_CONTEXT_ACKNOWLEDGED`, and the tail sentinel `PWF_CATCHUP_UNSYNCED_SENTINEL_82C4` were all observed.
- Phase 1 Cloud acceptance is complete. The newly staged upstream runtime remained inactive throughout; current adapter behavior is the accepted `v0.3.0-alpha.1` rollback point for Phase 2.
- Release sealing order was clarified: the bootstrap SHA cannot be finalized before the release version and ZIP SHA are known. The alpha bootstrap is now sealed with `v0.3.0-alpha.1` and ZIP SHA `94fe2183...`; its resulting SHA-256 is `17e2248d04027001a929dbc07fcf06c6f4a9cb727530fcdb99edbcc4e90fba32`.
- Synchronized the bootstrap regression to assert the sealed alpha.1 version and exact accepted ZIP SHA while retaining the all-zero placeholder rejection guard. Full regression after Cloud evidence/document synchronization passes 25/25; the accepted ZIP was not rebuilt or mutated.

# Phase 2 analysis (2026-08-02)

- Re-read the accepted Phase 1 plan/contracts and inspected the current adapter, staged upstream catch-up/resolver, compatibility ledger, runtime bundle, and existing test coverage.
- Confirmed the roadmap's four-round estimate remains appropriate: inactive structured runtime; plan/session safety; transcript/diagnostic failure handling; then activation/deployment and alpha.2 Cloud hard acceptance.
- Identified two scope clarifications before implementation: global Skill patching should retire when the owned catch-up activates at the end of Phase 2, and the generic request contract must not pull UserPromptSubmit runtime execution forward from Phase 3.
- No production behavior was changed during this analysis. Phase 2 Round 1 is the next implementation step.

# Phase 2 Round 1 implementation (2026-08-02)

- Started the inactive owned-catch-up protocol implementation from the Cloud-accepted alpha.1 baseline. Existing Hook commands and adapter behavior remain frozen for this round.
- Selected a local `runtime/owned-catchup.py` entrypoint with a declared dependency on the pinned upstream parser. This avoids disguising local Codex trust-boundary code as upstream source and keeps the four existing compatibility overlays independently auditable.
- Added the inactive entrypoint with strict v1 request validation, safe result envelopes, Host transcript containment/identity/project checks, explicit ordered scan fallback, reuse of the pinned upstream parser, and compatibility rendering under the frozen budgets. It has not been added to Hook commands.
- Added the entrypoint to the runtime bundle's separately typed local inventory, deterministic Release allowlist/mode table, LF contract, and installer-derived exact inventory. Tightened the request schema so a `validated` Host path must carry at least one explicit allowed session root; Hook registration remains adapter-only.
- Added five owned-runtime regressions for strict/no-plan envelopes, malformed input, required containment roots, Host-path preference, explicit fallback, session identity mismatch, bounded compatibility output, and outside-root rejection. Extended contract and installer lifecycle assertions for the new inactive file, including doctor/repair and proof that requirements do not register it.
- First narrow regression passed 12/13. The sole failure was the expected Phase 1 Release entry count (18 versus the new exact 19); no runtime, contract, or installer assertion failed. Updated only that dated count assertion before rerunning.
- Corrected the Release count and the narrow suite passed 13/13. Updated README, project understanding, work plan, and a new Phase 2 owned-runtime guide to distinguish the current 30-test/19-entry inactive development state from the immutable alpha.1 25-test/18-entry acceptance snapshot.
- Full suite passed 30/30, but the following exact importer check correctly rejected bytecode caches created by dynamic module loading. Added a production fix to disable bytecode writes and a regression requiring both trusted runtime directories to remain cache-free.
- The first cache regression isolated a test-only wrapper cache: the native-path harness imports the entrypoint as a module, whereas production executes it as a script. The upstream cache was already absent. Disabled bytecode only for that import harness while keeping the production CLI path responsible for proving upstream imports stay cache-free.
- Final Round 1 verification: full suite 30/30 PASS; five owned-runtime cases PASS; importer exact inventory healthy; Python/Node syntax and `git diff --check` pass; runtime remains cache-free; Release contract has 19 exact entries; installed requirements still contain only adapter commands; and `hooks/hook_adapter.py` has zero diff.
- Stabilized owned entrypoint SHA-256 is `e122a82ed7b3ba8f185bfc408ae35ff8ed80054cdb880b64f6793d1972245de6`. The runtime bundle, request schema, Release contract, upstream manifest, installer inventory, and tests carry the corresponding trusted identities.
- Phase 2 Round 1 is complete. No production Hook behavior changed and no Cloud run is required for this inactive round; Round 2 plan/session safety is next.

# Phase 2 Round 2 implementation (2026-08-02)

- Began the shared plan/session safety work from the verified inactive Round 1 runtime.
- Froze backward-compatible attachment semantics, safe session identifiers, canonical containment, resolver precedence, and the highest-priority `PLANNING_DISABLED=1` behavior before modifying production code.
- Round 2 keeps the owned catch-up entrypoint inactive and requires all six alpha.1 golden scenarios to remain byte-for-byte unchanged.
- Implemented one contract-shaped adapter project state with `planning_enabled`, `session_attachment`, `plan_state`, `plan_scope`, and canonical `plan_dir`; it is ready to become the Round 4 owned-runtime request without a second resolver.
- Added safe direct marker semantics, explicit opt-out gating, `PLAN_ID` plus BOM active-pointer precedence, canonical directory/task/progress containment, and fail-closed runtime policy outcomes.
- Tightened opt-out ordering after review: the adapter no longer scans attachment markers and the owned runtime no longer loads the upstream parser when planning is explicitly disabled; detached runtime requests also short-circuit before parser loading.
- Added five regressions. The focused adapter/runtime/golden run passed 19/19; contract/importer/installer/Release regression passed 11/11; full suite passed 35/35 with all six alpha.1 golden outputs unchanged.
- Synchronized owned runtime, request/result schemas, runtime bundle, upstream manifest, Release documentation, project understanding, work plan, and active planning records. The current Release allowlist remains 19 entries and the owned runtime remains unregistered.
- Final checks pass: importer exact inventory healthy, trusted runtime caches absent, Python in-memory compilation, contract JSON parsing, and `git diff --check`.
- Phase 2 Round 2 is complete. No Cloud run is required while the owned entrypoint remains inactive; Round 3 transcript normalization, diagnostics, and failure semantics are next.

# Phase 2 Round 3 implementation (2026-08-02)

- Resumed from the verified 35-case Round 2 baseline and began defensive Codex JSONL normalization, diagnostics, and explicit failure-semantics work.
- Guardrail remains unchanged: the owned runtime stays inactive, the six alpha.1 golden outputs remain exact, and activation/deployment remain Round 4 scope.
- Added strict binary JSONL record decoding, explicit malformed/unknown record classifications, mixed-family normalization with conservative event fallback, selected-path diagnostics, and a content-free diagnostic transformation.
- Added an inactive adapter supervisor seam with bounded/validated stdout and reason-coded timeout/runtime failure handling; no registered Hook path calls it yet.
- Added initial regressions for transcript corruption, unknown/event-only records, diagnostic redaction, and supervisor failure modes. Trusted hashes remain intentionally unsynchronized until the implementation stabilizes under focused tests.
- Tightened result-envelope validation after review: outcomes, warnings, diagnostics, path lengths, inject/report consistency, and strict binary UTF-8 child output must all match the v1 contract.
- Focused adapter/runtime/golden regression passed 23/23; the expanded owned-runtime/supervisor failure matrix passed 11/11; importer/contracts/installer/Release regression passed 11/11.
- Synchronized the owned-runtime, result-schema, runtime-bundle, and upstream-manifest hashes without changing the exact 19-entry Release allowlist.
- Final full regression passed 40/40. All six alpha.1 golden outputs remain exact, the owned entrypoint remains inactive, and no alpha.2 artifact was built or deployed.
- Final hygiene also passes: Python in-memory compilation, importer exact inventory, zero trusted-runtime bytecode caches, documentation consistency scan, and `git diff --check`.
- Phase 2 Round 3 is complete. Round 4 owns activation, global Skill patch/discovery retirement, permission/user matrices, alpha.2 packaging, and Cloud hard acceptance.

# Phase 2 Round 4 implementation (2026-08-02)

- Resumed from the verified 40-case inactive baseline and activated only SessionStart catch-up through the owned v1 request/result supervisor. UserPromptSubmit still uses the local adapter implementation and does not launch the child.
- Added explicit adapter construction of event/session/project/output-budget fields, ordered existing session roots, regular-file/canonical Host transcript validation, and the installed-layout fallback for missing Hook-time `CODEX_HOME`.
- Removed global Skill discovery/execution from the adapter. The bootstrap no longer patches or verifies patched global catch-up, and the installer now requires pristine upstream Skill hashes. The historical patcher remains only as a source provenance regression and was removed from the alpha.2 Release allowlist.
- Changed installed runtime directories from `0700` to `0755`, retained executable/data modes, added doctor detection/repair for directory-mode drift, and added Linux root/root plus synthetic install-user/Hook-user activation gates.
- Added activation regressions proving the exact Host request, owned sibling selection, non-execution of a malicious global Skill script, UserPrompt local-only dispatch, and advisory child failure behavior.
- First focused activation/installer run passed 19/19 with three Linux-only cases skipped on Windows. The first full run had one expected contract-hash failure after the Release allowlist changed; synchronizing the exact release artifact hash resolved it.
- Full Windows regression then registered 45 tests: 42 passed, 0 failed, and the three explicit Linux-only permission/real-runtime checks skipped. The six alpha.1 golden outputs remain byte-for-byte unchanged.
- Documentation and persistent planning state now describe active owned catch-up, pristine global Skill, the 18-entry alpha.2 boundary, Windows/Linux evidence split, and alpha.1 rollback. ZIP build/seal and external Cloud hard acceptance remain.
- Froze the deterministic `dist/pwf-codex-cloud-hooks-v0.3.0-alpha.2.zip`: 18 entries, 65,989 bytes, SHA-256 `61f2001f3dd3934d79144d5f1be09385a55936aba9f7481ad5e2177a486059db`. The historical global-Skill patcher is excluded; the active owned runtime is included.
- Sealed the external `init-cloud-sandbox-v0.3.0.bash` only after the ZIP hash was final. Its SHA-256 is `9328748023b401df8d4cbf98c48b2885978ba074654c94a09a46cae264c2869d`; the bootstrap remains outside the ZIP, avoiding self-reference.
- Added `docs/v0.3.0-alpha.2-cloud-hard-acceptance.md` with immutable-asset verification, exact eight-payload/nine-installed-file inventory, pristine global Skill proof, root/root actual owned execution, synthetic nobody-Hook execution, UserPrompt local-only proof, and fresh-task resume/tail-sentinel acceptance.
- Final local verification after sealing: full suite 45 registered / 42 PASS / 3 explicit Linux-only SKIP / 0 FAIL; deterministic Release check PASS; importer exact check PASS; Python in-memory compilation PASS; Node syntax PASS; `git diff --check` has no errors; ZIP and external Bash hashes match the acceptance runbook.
- At the Round 4 local-seal checkpoint, Phase 2 remained open only for publication and fresh Codex Cloud hard acceptance; alpha.1 was still the rollback point and no tag, asset, commit, or external deployment had been created from this workspace.

## Phase 2 alpha.2 Cloud partial acceptance (2026-08-02)

- Maintainer reported successful initialization in a new Cloud container and ran the installed-runtime root/root plus synthetic cross-user acceptance fixture.
- Root/root owned catch-up PASS: real installed adapter/child selected the Host fixture transcript, detected the structured plan update, preserved the tail sentinel, and injected the resolved active plan.
- Synthetic install-user/Hook-user split PASS with the same owned report and planning context, closing the Windows-skipped traversal/readability gate.
- UserPrompt local-only PASS: canary and plan were present, while `SESSION CATCHUP DETECTED` was absent.
- Interpreted the four printed SessionStart JSON lines correctly as two invocations printed twice by two `grep` assertions per output, not unexpected quadruple Hook execution.
- Updated the Phase 2 permission checklist to complete. At that checkpoint, the actual automatic fresh-task lifecycle/resume path and post-resume doctor evidence still remained.

## Phase 2 alpha.2 Cloud initialization acceptance (2026-08-02)

- Received the complete initialization console. Bootstrap reported successful Cloud setup with `/opt/codex`, Codex CLI `0.144.0-alpha.4`, pristine upstream Skill v3.8.2, managed requirements, owned Hook runtime, adapter, and installed manifest paths.
- Published alpha.2 ZIP download completed at 65,989 bytes and SHA-256 verification returned `OK` for the sealed `61f200...59db` identity.
- Independent doctor returned healthy/non-repairable with no errors or blockers and exactly the two intended managed events.
- Independent manifest probe passed schema 3, eight exact runtime payloads, pristine global Skill, and adapter-only Hook commands.
- Initialization/inventory acceptance is complete. No code or artifact bytes changed; the remaining Phase 2 work is the automatic fresh-task lifecycle/resume black box and post-resume doctor.

## Phase 2 final lifecycle runbook clarification (2026-08-02)

- Replaced the short Section 3 summary with copy/paste P2-A through P2-E instructions, exact prompts, ordered task/resume operations, raw-evidence requirements, and per-step PASS criteria.
- Added a comparison table against `黑盒验证.md` A–F: initialization A is already covered except post-resume doctor; B/C/D remain; destructive E/F are not repeated for this Phase 2 activation gate.
- Added an explicit 1,793+ character unsynced user prompt with a unique final-line sentinel, plus required truncation-marker and tail-marker observations after resume.
- Added a warning in the main A–F manual so alpha.2 operators do not run the obsolete patched-global-Skill SHA expectation.
- Removed literal plan/tail sentinel values from the later no-tools verification prompts, so the current prompt cannot itself satisfy the observation; only injected context can reveal them.
- No runtime, Release ZIP, bootstrap, or trusted hash changed. Markdown fences are balanced, the real long prompt is 1,825 characters, and `git diff --check` passes with line-ending warnings only.

## Phase 2 P2-D real resume acceptance (2026-08-02)

- Received and reviewed the raw no-tools P2-D Cloud reply. Automatic SessionStart resume injection, the complete owned catch-up report, and scoped Planning context were present together.
- The report selected real previous session `rollout-2026-08-02T14-03-54-019fc2c9-d3ee-7cb0-b4d4-62bd161f0efe`, identified `Runtime: codex`, found `task_plan.md` at message #37, and reported eight unsynced messages.
- The long Cloud wrapper contained the required `...[truncated]...` marker while preserving the unique final-line tail marker `PWF_ALPHA2_REAL_RESUME_TAIL_6D91` inside `UNSYNCED CONTEXT`.
- Planning context and the P2-B task-plan first-line marker were observed. The embedded transcript also preserves `PWF_ALPHA2_BASELINE_CREATED` and the P2-C reply with all five checks `OBSERVED`, corroborating P2-B and P2-C.
- P2-D is PASS. The exact unsynced count remains observational rather than contractual; the criterion is an integer at least one plus the required content evidence.
- At the P2-D checkpoint, Phase 2 remained open only for preserved/provided P2-A raw fresh-task startup evidence and the read-only P2-E post-resume doctor. No code, ZIP, bootstrap, or trusted hash changed.

## Phase 2 alpha.2 Cloud acceptance closure (2026-08-02)

- The maintainer confirmed the P2-A raw no-tools automatic fresh-task startup/UserPrompt lifecycle behavior passed.
- Received the complete P2-E post-resume result: exit `0`, `healthy=true`, `repairable=false`, `managed=true`, events exactly `SessionStart` and `UserPromptSubmit`, with `errors=[]` and `blockers=[]`.
- P2-E is PASS. Together with the previously recorded P2-B/P2-C/P2-D evidence, all final P2-A through P2-E gates are accepted.
- Phase 2 and `v0.3.0-alpha.2` Cloud hard acceptance are complete. Alpha.2 becomes the rollback baseline for Phase 3; alpha.1 remains an older retained release asset, not the active modernization baseline.
- This closure changes documentation and planning state only. No runtime code, ZIP, external bootstrap, release asset, or trusted hash changed.

## Phase 3 Round 1 analysis start (2026-08-02)

- Recovered the active planning state and confirmed the worktree starts clean on the Cloud-accepted alpha.2 branch.
- Began the local/upstream UserPrompt audit. Confirmed that `inject-plan.sh` is already pinned, packaged, installed, and hash-verified but is not yet dispatched by the adapter.
- Marked Phase 3 Round 1 in progress and recorded a provisional three-round implementation/acceptance split. No runtime behavior changed.
- Completed the first line-by-line adapter/upstream comparison. Identified duplicate resolution, premature v3-mode activation, fail-open containment, text/timestamp compatibility differences, and the plain-text child supervision gap as explicit Round 1 contract decisions.
- Compared the standalone upstream resolver, runtime-bundle dependency metadata, and exact golden harness. Confirmed the injector's embedded resolver is not equivalent to the stricter BOM-aware managed resolver and identified missing migration fixtures.
- Audited adapter/activation tests and the existing v1 request/result schemas. Chose a separate prompt protocol plus an owned prompt entrypoint as the working design, subject to overlay/inventory verification in the remainder of Round 1.
- Audited the overlay ledger, importer, upstream manifest, installer-derived inventory, Release contract, line-ending rules, and exact-count tests. Confirmed that Phase 3 adds a new trusted artifact graph and requires deterministic multi-target overlay support if the upstream script receives a managed-input mode.
- Audited installer/bootstrap/global-Skill responsibilities and corrected the Phase 3 checklist: retire global-Skill script execution, not the independently installed pristine Skill used for discovery and instructions.
- Audited the historical patcher/import tests and refined the design from a renderer-only child to one owned plan-context entrypoint. It will return the single canonical project state consumed by both prompt injection and SessionStart catch-up, allowing the adapter's resolver/renderer to be removed.
- Reviewed upstream Skill promises and existing Phase 1/2 design docs. Froze managed-legacy scope, two explicit canonical wording/timestamp changes, a 20,000-character context ceiling, and the three-round Phase 3 delivery shape.
- Attempted a local current-vs-upstream output probe. PowerShell lacked `sh`; the explicit Git Bash executable was then blocked by the managed Windows sandbox's signal-pipe permission. Logged both attempts and kept the failure separate from project behavior.
- Retried that read-only probe outside the sandbox successfully. It empirically confirmed non-equal output and the exact upstream first/final wording that the Phase 3 beta golden will adopt.
- Baseline `npm test` was initially blocked before test execution by sandbox-wide Node `spawn EPERM`. The approved outside-sandbox rerun completed 45 registered cases with 42 PASS, 3 explicit Linux-only SKIP, and 0 FAIL, confirming a clean alpha.2 behavior baseline for Round 1.
- Added the Round 1 human contract, staged prompt request/result JSON schemas, and a contract regression that proves their exact managed-legacy/budget boundary while also proving they are not yet part of the alpha.2 trusted runtime or Release graph.
- Corrected the stale Phase 2 owned-runtime guide to record completed alpha.2 Cloud acceptance and the new Phase 3 rollback baseline.
- The first focused contract run reached the new test and failed only on a test/document wording mismatch (`invoked` versus `runs`). Updated the assertion to the actual guide wording without changing the contract.
- The second focused run advanced to the inactive-artifact assertion and exposed only a Markdown line-wrap mismatch. Made that exact assertion newline-aware; no product or contract behavior changed.
- The third focused Phase 3 contract run passed 1/1, proving both staged schemas, the human contract, fixed budgets/profile, and the explicit exclusion from the alpha.2 runtime/Release graph.
- The full development regression now registers 46 cases: 43 PASS, 3 explicit Linux-only SKIP, and 0 FAIL. The original alpha.2 snapshot remains 45 registered / 42 PASS / 3 SKIP; the additional test covers only inactive Phase 3 contracts.
- Phase 3 Round 1 is complete. It changed only staged contracts, documentation, planning state, and their regression; adapter dispatch, runtime bundle, installer inventory, Release ZIP, external bootstrap, and trusted alpha.2 hashes remain unchanged. Round 2 will implement the owned prompt path without activating it.
- Final Round 1 consistency validation passed: both JSON contracts parse, Markdown fences are balanced, stale current-status wording is absent, `git diff --check` reports no errors, and the outside-sandbox full suite remains 46 registered / 43 PASS / 3 SKIP / 0 FAIL. The sandbox-only retry again hit the already documented Node `spawn EPERM` before test execution.

## Phase 3 invocation-strategy review (2026-08-02)

- Reopened only the upstream invocation mechanism after maintainer review; kept the owned plan-context boundary, managed-legacy profile, staged schemas, budgets, three rounds, and alpha.2 rollback boundary intact.
- Read the complete pristine resolver/injector control flow and upstream behavior tests. Confirmed there is no existing managed-input switch and that upstream itself validates legacy root fixtures through temporary directories.
- Compared multi-target managed overlay, controlled pristine snapshot, upstream-native protocol, Host-native IR/reimplementation, OS-level virtual projection, and future official support. Selected the controlled snapshot for Phase 3, retained multi-target overlay as a documented fallback, and recorded upstream/official protocols as long-term retirement paths.
- Empirically proved current scoped-project and root-snapshot captured output equality (9,628 characters, identical SHA-256), ambient smart-mode suppression after environment scrubbing, and `.mode`/nonce isolation through task/progress-only projection.
- Added `docs/phase-3-upstream-invocation-options.md` with costs, difficulties, applicability, standardization value, empirical evidence, and implementation gates. Updated the canonical Phase 3 guide, README, project understanding, work plan, task plan, and contract regression to make the pristine snapshot decision authoritative.
- No adapter/runtime/installer/importer/overlay/Release/bootstrap code or trusted alpha.2 artifact changed. All disposable probe directories were path-checked and removed.
- Final documentation regression passed outside the Windows sandbox: 46 registered / 43 PASS / 3 explicit Linux-only SKIP / 0 FAIL. The Phase 3 contract case now requires the pristine-snapshot decision, route-comparison record, and Host/Driver boundary while still proving exclusion from the alpha.2 trusted graph.

## Phase 3 status and naming consistency audit (2026-08-03)

- Reconfirmed the selected implementation route: canonical `owned-plan.py` plus a private, scrubbed legacy snapshot around pristine upstream resolver/injector; multi-target overlay remains fallback only.
- Kept the Phase 3 guide, two v1 schemas, and contract regression filenames stable. They are selected protocol/design identities, not disposable candidates; staged/inactive status is now explicit in the guide, schema `$comment` metadata, trusted-graph exclusions, and tests.
- Synchronized README, work plan, project understanding, Phase 2 acceptance guide, task plan, and historical findings. Alpha.2 is unambiguously the current Phase 3 rollback baseline; alpha.1 is a retained predecessor; v0.2.2 is the stable-release fallback.
- No adapter/runtime/installer/importer/overlay/Release/bootstrap file or accepted alpha.2 artifact changed during this audit.
- Final validation passed outside the Windows sandbox: both staged schemas parse, the focused lifecycle assertions are included in the complete suite, and all 46 cases finish as 43 PASS / 3 explicit Linux-only SKIP / 0 FAIL. `git diff --check` reports no errors; the sandbox-only Node runner still hits the known `spawn EPERM` before executing tests.

## Pre-Round-2 repository residue audit (2026-08-03)

- Paused the previously recorded Round 2 next step at maintainer direction. The next turn is an isolated review of `snapshot-prototype/` followed by Phase 3/4 round-count replanning; no prototype implementation was read, adopted, or integrated in this audit.
- Inventoried tracked, untracked, ignored, generated, historical, and planning files. Found no tracked temp/backup/zero-byte residue. The only unambiguous disposable local state is ignored Python bytecode under `patches/__pycache__/`; it was not deleted because this turn was an audit rather than a cleanup authorization.
- Confirmed the ignored alpha.1/alpha.2 ZIPs match their recorded accepted SHA-256 values and remain useful local evidence. The ignored full v3.8.2 source is the explicitly supplied upstream reference and remains excluded from packaging.
- Proved the historical v0.2.2 planning/evidence and patcher are still referenced by the overlay ledger and regression tests. Retained and indexed the alpha.1 smoke record; corrected stale pre-Phase-2 wording in the main black-box manual.
- Confirmed `snapshot-prototype/` is a separate tracked commit with no references from the current runtime manifest, installer, Release contract, or builder. Its duplicated pristine upstream scripts and premature beta.1 branch/commit labels are review inputs, not accepted product state.
- Final consistency checks found no stale current-state phrases and no prototype reference in the trusted runtime/Release graph. JSON contracts parse, `git diff --check` passes, and the complete outside-sandbox regression remains 46 registered / 43 PASS / 3 explicit Linux-only SKIP / 0 FAIL.

## Phase 3 Round 2 controlled-snapshot feasibility review (2026-08-03)

- Read the complete standalone handoff: runner, eight-case suite, README, feasibility report, package/license, and pristine resolver/injector copies. Verified the copied upstream hashes exactly match the parent runtime copies.
- Compared the spike line-by-line with the frozen request/result schemas, adapter/catch-up ownership, trusted bundle, Release allowlist, and Phase 3 verification matrix. Confirmed conditional GO for the selected snapshot route while preserving the prototype/production boundary and all listed production gaps.
- Added `tests/snapshot-prototype-handoff.test.js` so the parent suite imports all eight feasibility cases and adds one explicit runtime/Release/adapter-isolation invariant.
- Corrected non-Linux test semantics: seven cases that execute the POSIX/Linux runner now skip honestly outside Linux; the static bundle-boundary and parent isolation cases remain portable. Corrected the feasibility report's stale `tools/` location.
- Parent Windows regression now registers 55 cases: 45 PASS / 10 explicit production-POSIX SKIP / 0 FAIL. The prototype standalone entry registers 8: 1 PASS / 7 SKIP / 0 FAIL. Maintainer-provided Cloud/Linux evidence remains 55 PASS / 0 SKIP.
- Expanded Phase 3 from three to four rounds: completed Round 2 feasibility; Round 3 inactive production/policy/trusted-graph work; Round 4 activation/beta.1/Cloud acceptance. Added a provisional three-round Phase 4 shape subject to mandatory re-audit at entry.
- No adapter/runtime/installer/importer/Release/bootstrap file or accepted alpha.2 artifact was activated or changed by the prototype review.
- Final consistency scan corrected the prototype/report and route-comparison remnants that still called inactive production “Round 2” or activation “Round 3”; the current Phase 3 four-round numbering is now uniform.
- Final validation passed: both staged schemas parse, changed JavaScript and Python sources compile, `git diff --check` is clean, the parent suite is 55 registered / 45 PASS / 10 explicit POSIX/Linux SKIP / 0 FAIL on Windows, and the standalone prototype is 8 registered / 1 PASS / 7 SKIP / 0 FAIL. Maintainer-provided Cloud/Linux evidence remains the authoritative execution of all 55 without skips.

## Phase 3 Round 3 production-policy review (2026-08-03)

- Re-read the complete prototype README, runner, feasibility report, staged schemas, current adapter supervisor, and all prototype Round/production references. The directory is consistent with the current four-round plan: completed Round 2 feasibility, inactive Round 3 production, Round 4 activation; “Round 1” appears only as historical output-equality evidence.
- Corrected one security ambiguity: `openat2` hardens path resolution but does not distinguish hard-link names. The prototype documentation now presents observed `st_nlink == 1` as the strict alternative and requires a Cloud-filesystem compatibility gate.
- Replaced ambiguous “startup cleanup” wording with bounded preflight cleanup on every `owned-plan` invocation; container disposal remains only a secondary residual bound because resumed Cloud sandboxes can retain filesystem state.
- Recorded the recommended policy freeze: single-link checkpoints; explicit same-EUID 0700 temp base plus bounded stale cleanup; portable fd-rooted `openat` for Round 3 with `openat2` deferred; shared 27-second adapter deadline with owned-plan 8 seconds, catch-up 15 seconds, four seconds adapter reserve, and three seconds Host reserve.
- Primary-source calibration used Linux `openat2`/`stat` documentation and Python `tempfile`/`subprocess`/`os.killpg` documentation. Static consistency checks, Markdown fence checks, and `git diff --check` passed. Full Windows regression remains 55 registered / 45 PASS / 10 explicit Linux-only SKIP / 0 FAIL.

## Round 3 default-policy README and Cloud gate handoff (2026-08-03)

- Added the accepted four-part default freeze immediately after the prototype README's original four questions, preserving the question-to-decision audit trail.
- Added a self-contained, read-only `PWF_CLOUD_ST_NLINK_PROBE_V1` and exact fresh/resume PASS criteria. The probe does not read planning contents, create files, create links, or mutate planning state.
- Extracted the exact embedded Python from Markdown, compiled it, and executed it locally as a harness check. It found four scoped task/progress files and reported five stable `st_nlink=1` samples for each with `OVERALL=PASS`; this is syntax/logic evidence only, not a substitute for the required Cloud fresh/resume gate.
- Final checks passed: no stale Round 2/old-confirmation wording remains in the prototype folder, Markdown fences are balanced, the embedded Cloud probe compiles, `git diff --check` is clean, and the complete Windows suite remains 55 registered / 45 PASS / 10 explicit Linux-only SKIP / 0 FAIL.

## Cloud single-link gate — fresh sandbox evidence (2026-08-03)

- Maintainer supplied the complete output from an actual cold-start Cloud execution of the embedded `PWF_CLOUD_ST_NLINK_PROBE_V1`.
- Result: Fresh PASS on kernel 6.12.13; workspace and `/tmp` reported `ext2/ext3`; four real scoped task/progress files each produced five stable regular-file samples with `st_nlink=1`, root:root ownership, mode 0644, and no errors. `HAS_TASK_AND_PROGRESS=true`; `OVERALL=PASS`.
- The probe was read-only and the Cloud repository remained clean. Resume of the same sandbox is still required and is now the sole remaining single-link compatibility gate before Round 3 implementation.
- Appended reusable Fresh and Resume black-box prompt blocks to the end of `snapshot-prototype/README.md`. They preserve the exact no-mutation/no-content-read rules, require execution of the embedded probe, and distinguish PASS/FAIL/INCONCLUSIVE. Markdown structure and `git diff --check` pass.

## Cloud single-link gate — resume evidence and closure (2026-08-03)

- Maintainer supplied the complete Resume output from the same Cloud sandbox, with the probe run as the first Shell action after resume.
- Result: Resume PASS on the same kernel/filesystem and the same four scoped task/progress files. Each file again produced five stable regular-file samples with `st_nlink=1`, root:root ownership, mode 0644, and no errors; `HAS_TASK_AND_PROGRESS=true` and `OVERALL=PASS`.
- Fresh + Resume therefore provide 40/40 matching observations. The Cloud single-link gate is **CLOSED / PASS**, and the four Round 3 production defaults are frozen.
- Updated the prototype README and authoritative planning/project documents so no current-state text still describes Resume or the policy freeze as pending. The next step is inactive exact-v1 implementation; adapter dispatch and the alpha.2 Release/bootstrap remain unchanged.
- Post-sync validation passed: no stale pending-gate wording was found, `git diff --check` is clean, and the complete Windows suite reports 55 registered / 45 PASS / 10 explicit POSIX/Linux SKIP / 0 FAIL.

## Phase 3 Round 3 — inactive implementation started (2026-08-03)

- Reconfirmed the prototype's role as isolated Round 2 feasibility evidence rather than production code to copy or activate directly.
- Started the implementation round with four frozen policies and a strict boundary: build/install the exact-v1 owned path and its tests, while leaving adapter dispatch and alpha.2 Release/bootstrap bytes unchanged.
- Added the first production `runtime/owned-plan.py`: exact request/result validation, opt-out/attachment ordering, pristine resolver selection, fd-rooted single-link reads, retained-directory revalidation, trusted fixed temp base, bounded stale cleanup, 0700/0600 projection, scrubbed pristine injector invocation, process-group supervision, monotonic component deadlines, bounded UTF-8 output, and normal cleanup. It remains unreferenced by the adapter.
- Added eight production-runtime cases covering the portable protocol seam plus seven Linux/POSIX execution groups: managed-legacy isolation, resolver precedence, attachment policy, linked/nonregular/oversized/UTF-8 rejection, file races, process-group timeout/output budget, and safe stale cleanup.
- The focused Windows run passed as designed: 8 registered / 1 portable PASS / 7 explicit Linux-only SKIP / 0 FAIL. Full Linux execution remains required after trusted-graph integration and local static/installer checks.
- Began atomic inactive trusted-graph promotion: updated the two schema lifecycle comments, LF policy, 21-entry development Release allowlist, runtime-bundle owned-plan/dependency metadata, and generic installer support for explicitly installed schema contracts. Hash synchronization and exact-count test updates are being performed as one unit before any full-suite claim.
- The first 27-case focused trusted-graph regression passed 26 and failed one lifecycle-document assertion because the canonical guide still said `staged only; not installed`. Updated the guide to the actual inactive installed/packaged state while preserving explicit adapter-dispatch exclusion; no code or safety assertion was weakened.
- Hardened stale preflight and diagnostics after static review: enabled invocations clean before plan resolution, unsafe/capped entries produce `stale_cleanup_skipped`, cleanup failures produce `stale_cleanup_failed`, active pointers are read through fd-rooted single-link checks, and resolver output overflow maps to `runtime_error` rather than a context-budget outcome.
- Re-synchronized owned-plan/schema/runtime-bundle hashes. The post-hardening focused set passes 18 registered / 10 PASS / 8 explicit Windows platform SKIP / 0 FAIL; the first execution request timed out in approval review before command start, and its one permitted identical retry completed successfully.
- Final local full-suite rerun after hardening and hash synchronization passed: 63 registered / 46 PASS / 17 explicit POSIX/Linux SKIP / 0 FAIL. Existing alpha.2 behavior, installer/repair, importer, historical goldens, prototype isolation, the 21-entry development ZIP, and inactive adapter boundary all remain green.
- Added `docs/phase-3-round-3-cloud-acceptance.md` with one non-activating Fresh Cloud script. It requires Linux 63/63 with zero skips, isolated source install/doctor, exact 11-file runtime inventory, installed owned-plan direct exact-v1 output, adapter no-dispatch, 21-entry development ZIP verification, zero snapshot residue, and a clean workspace. It explicitly excludes live `/opt/codex` mutation, lifecycle activation, beta sealing, and redundant resume black-box work.
- Final consistency pass found no stale current-state wording, verified every managed contract/local-file SHA against `upstream-manifest.json`, compiled owned-plan in memory, confirmed balanced Markdown fences and required probe markers, passed `git diff --check`, and validated the exact embedded Cloud block with Git Bash `bash -n` outside the Windows signal-pipe sandbox.
- Final marker hardening landed before handoff: attachment discovery is capped at 1,024 entries and candidate markers are opened relative to the sessions directory with `O_NOFOLLOW` plus `fstat`; the timeout regression now polls for at most one second for process-group teardown.
- Rebuilt the resulting SHA-256 chain (`owned-plan.py` → runtime bundle → upstream manifest). The corrected verifier parsed all contract JSON, compiled the runtime in memory, and matched all 13 selected manifest/bundle hashes.
- Post-change focused regression: 18 registered / 10 PASS / 8 explicit Windows platform SKIP / 0 FAIL. Post-change complete regression: 63 registered / 46 PASS / 17 explicit POSIX/Linux SKIP / 0 FAIL.
- Round 3 remains intentionally open only at the non-activating Linux/Codex Cloud gate documented in `docs/phase-3-round-3-cloud-acceptance.md`; Round 4 has not started.
- Final handoff audit: `git diff --check` passes, the explicit current-document scan finds no stale Round 3 staged/pending-gate wording, and the Cloud runbook still enforces a clean checkout after its isolated test. The worktree changes are intentionally uncommitted for maintainer review/push.

## Phase 3 Round 3 — first inactive Cloud gate (2026-08-03)

- Maintainer supplied the complete Fresh Cloud output from `PWF_PHASE3_ROUND3_INACTIVE_CLOUD_V1`: Python 3.14.4, Node 22.22.2, 63 tests executed, 62 PASS, 1 FAIL, 0 SKIP.
- The sole failure is test 37, `owned plan kills the injector process group, bounds output, and cleans snapshots`; the timeout outcome and snapshot cleanup assertions passed before the test found that the recorded descendant PID still answered `kill -0` for one second.
- Because the runbook uses `set -Eeuo pipefail` and requires 63 PASS, it correctly stopped before isolated install, doctor, direct installed-runtime invocation, and development ZIP checks. Those stages remain **not executed**, not product failures.
- Repository status remained clean in Cloud. Round 3 stays open; no adapter activation or Round 4 work is authorized. Next action is a read-only Linux `/proc` diagnostic that distinguishes a live descendant from an unreaped zombie.
- Added `docs/phase-3-round-3-process-group-diagnostic.md` with a no-product-edit Cloud prompt, exact `/proc` probe, five-way classification, and evidence-dependent modification boundary. Markdown structure and embedded Python compile locally; Git Bash syntax validation requires the already established outside-sandbox path because the managed Windows sandbox blocked its signal pipe.
- Outside-sandbox `bash -n` subsequently passed. The original inactive Cloud acceptance guide now routes an isolated test-37 failure to this diagnostic instead of recommending another full run or a longer `kill -0` wait. Final Markdown/link checks and `git diff --check` pass.

## Phase 3 Round 3 — process-group Cloud diagnosis (2026-08-03)

- Maintainer supplied the exact diagnostic output and structured handoff. Result: supervisor timeout observed, group membership PASS, same process identity YES, classification `TERMINATED_UNREAPED`, live executable descendant NO, production supervisor defect NO, test assertion defect YES, recommended boundary TEST_ONLY, workspace clean.
- The descendant remained `Z` with `ppid=1` and zero file descriptors for all 31 samples; Cloud PID 1 was `tail -f /dev/null`. The previous `kill -0` loop therefore measured process-table entry existence, not executable liveness.
- Started the evidence-authorized test-only correction. Production runtime and trusted artifact hashes remain frozen.
- Replaced test 37's `kill -0` loop with a strict `/proc/<pid>/stat` assertion. The fixture records the descendant before timeout, proves its PGID and SID equal the supervised shell, locks identity with `starttime`, accepts only disappearance/PID reuse/terminal `Z|X|x`, and fails if the same identity remains live. A terminal entry must have zero descriptors when still observable.
- No production runtime, contract, manifest, installer, Release allowlist, or hash changed. JavaScript syntax passes; Windows focused result is 8 registered / 1 PASS / 7 Linux-only SKIP / 0 FAIL, and the complete Windows result is 63 registered / 46 PASS / 17 POSIX/Linux SKIP / 0 FAIL.
- Added a portable synthetic `/proc/<pid>/stat` parser assertion to the existing always-run case, including a command name with whitespace, so field indexing and `starttime` extraction are covered on Windows as well. The final post-change reruns remain 8 registered / 1 PASS / 7 SKIP and 63 registered / 46 PASS / 17 SKIP, both with 0 FAIL.
- Updated both Cloud documents with the observed diagnostic closure and a focused Linux preflight. The final Round 3 gate still requires the original complete script to reach 63 PASS / 0 SKIP and then execute its previously blocked isolated install, doctor, direct-runtime, ZIP, and clean-workspace stages.

## Phase 3 Round 3 — inactive Cloud acceptance closure (2026-08-03)

- Maintainer supplied the complete rerun from `PWF_PHASE3_ROUND3_INACTIVE_CLOUD_V1`. Linux suite: 63 registered / 63 PASS / 0 FAIL / 0 SKIP; corrected test 37 PASS.
- Remaining gates all executed and passed: isolated install, exact 11-file runtime inventory, doctor healthy, installed owned-plan direct exact-v1, adapter dispatch unchanged, zero snapshot leftovers, 21-entry development ZIP check, and clean workspace.
- Phase 3 Round 3 is formally complete. Round 4 remains pending and has not started; per maintainer process, its first action must be a fresh analysis/replanning pass rather than immediate activation work.
- The first broad documentation closure patch stopped on a `PROJECT_UNDERSTANDING.md` line-wrap mismatch. No conclusion depends on it; synchronization continues with narrow per-file patches against exact current text.
- README and both Phase 3 design documents are now synchronized. The first narrow project-understanding retry still missed its rendered anchor, so the next attempt will use exact UTF-8 line representations rather than repeating the same visual match.
- Exact-line retries completed the remaining project-understanding and work-plan synchronization. README, canonical Phase 3 design, route comparison, project understanding, work plan, Cloud acceptance record, and active task plan now uniformly state Round 3 CLOSED/PASS and Round 4 not started; the explicit stale-current-wording scan returns no matches.
- Closure-document static validation passes: Markdown fences are balanced and `git diff --check` reports no errors. Existing Phase 3 contract assertions target the inactive trusted graph/no-dispatch boundary rather than the retired pending-status wording.
- Complete post-closure Windows regression passes: 63 registered / 46 PASS / 17 explicit POSIX/Linux SKIP / 0 FAIL. Together with the maintainer-supplied Linux/Cloud 63/63 result, Round 3 has both local cross-platform registration evidence and full target-platform execution evidence.

## Phase 3 Round 4 — entry analysis started (2026-08-03)

- Release audit confirmed that the external bootstrap is still correctly pinned to the immutable alpha.2 rollback asset; beta.1 version/SHA must remain unset until its ZIP is frozen and hashed.
- Timeout audit found an important supervision seam: `owned-plan.py` owns an internal 8-second deadline and starts resolver/injector in their own sessions. The adapter therefore needs a shared 27-second deadline plus a distinct outer supervision grace; an outer kill must not normally pre-empt the child's one-second cleanup reserve.
- Contract inspection confirmed that the plan result's exact six-field `project` object is the intended catch-up handoff. No plan schema v2 is currently justified.
- One read-only audit command guessed a nonexistent catch-up request filename (`contracts/adapter-owned-runtime-request-v1.schema.json`). No file was changed; inventory lookup identified the actual file as `contracts/adapter-runtime-request-v1.schema.json`.
- Two planning saves initially missed exact dated headings and then succeeded using the discovered headings. No content was lost.
- Located the actual catch-up request contract (`contracts/adapter-runtime-request-v1.schema.json`) and confirmed structural compatibility with the exact plan result. A later read also guessed an obsolete golden-fixture path; inventory/search found the real immutable alpha.2 fixture under `tests/fixtures/golden/`.
- Windows cannot execute the real POSIX owned-plan path. Round 4 must preserve honest platform separation: portable adapter protocol/sequencing/golden tests use strict sibling stubs on Windows, while real snapshot, resolver/injector, process-group, root/root, and cross-user behavior remains Linux/Cloud acceptance evidence.
- Completed the Round 4 entry analysis and added `docs/phase-3-round-4-activation-plan.md`. Phase 3 remains four rounds, with its final round gated as R4-A supervisor/type seam, R4-B atomic activation/adapter thinning, and R4-C beta.1 seal/Cloud acceptance.
- Synchronized README, canonical Phase 3 design, work plan, project understanding, and active task plan. Current status is uniformly: entry analysis complete, R4-A next, owned-plan dispatch still inactive, alpha.2 still the rollback baseline.
- A consistency command used Bash `||` syntax in Windows PowerShell and failed before searching. It was rerun with an explicit `$LASTEXITCODE` check; current-status phrases are consistent. One remaining “Round 4 has not started” sentence is dated historical progress from before the inactive Cloud gate and is not current status.
- The first `git diff --check` flagged the newly edited project-understanding date because it retained a Markdown hard-break's trailing spaces. Removed those spaces and reran the full document/status check successfully: `ROUND4_DOC_CONSISTENCY=PASS`.
- No production/runtime/test/contract/bootstrap bytes were changed in this entry-analysis pass. The only new non-planning artifact is the Round 4 activation plan; tests were not rerun because executable behavior is unchanged and the accepted Windows/Cloud Round 3 baselines remain the current evidence.
- Persisted the maintainer-approved Discovery Gate policy. The full recovery-time rule is in `PROJECT_UNDERSTANDING.md`; roadmap governance is in `work_plan.md`; README and the active plan contain concise triggers. No executable or release artifact changed.
- Began the requested roadmap/active-plan separation audit. Initial full-file comparison confirmed that `work_plan.md` should own release roadmarks, acceptance checkpoints, and concise Phase progress summaries, while the scoped `task_plan.md` remains the current execution authority. The combined console read was truncated, so the remaining audit uses targeted headings/sections before editing.
- Targeted heading/status comparison found stale Phase 3/4 round estimates in the roadmap, one dense combined Phase 2/3 summary, and duplicate `Errors Encountered` headings in the active plan. The intended edit preserves all unique acceptance evidence while making file ownership and navigation explicit.
- Rebuilt `work_plan.md` as a programme/release roadmap: explicit file ownership, dynamic round table, release milestones, separate Phase 1/2/3 acceptance summaries, future Cloud checkpoints, current handoff, and sealing order. Corrected Phase 3 to four rounds and Phase 4 to provisional three.
- Added a `Document Role` section to the active task plan and renamed its duplicate error headings without deleting evidence. Updated `PROJECT_UNDERSTANDING.md` so recovery-time routing distinguishes roadmap/acceptance from current execution authority.
- The first structural assertion searched `work_plan.md` for an English phrase that exists only in the active plan; no file failed. Replaced it with the actual bilingual roadmap phrase and reran successfully: `PLAN_ROLE_CONSISTENCY=PASS` and `git diff --check` PASS.
- Final targeted review confirmed readable section/table layout, corrected round estimates, referenced-file existence, removal of stale roadmap wording, and zero executable/runtime/test/bootstrap diffs: `WORK_PLAN_REFORMAT=PASS`, `EXECUTABLE_DIFF=NONE`.
- Began the full `PROJECT_UNDERSTANDING.md` coupling audit. Heading/section review found Sections 10–12 incomplete for the inactive owned-plan graph, Section 13 duplicating roadmap/execution history, Section 15 missing post-alpha.2 decisions, and Section 16 carrying stale Phase 1 wording. The planned compaction keeps stable Cloud facts while routing mutable progress to `work_plan.md` and the active task plan.
- Completed the first-half review. Sections 1–6 remain the stable onboarding core; Sections 7–8 need historical labeling, and Section 9 can retain the proven Cloud contract while moving raw rollout/message details behind its existing evidence links.
- Verified the actual runtime/release contracts before rewriting architecture sections. This exposed one additional stale README architecture diagram that still describes global-Skill patch/runtime execution; it will be corrected to the owned installed bundle while preserving alpha.2 versus inactive Round 3 status.
- Confirmed the exact installer inventory and adapter-only requirements topology from `install.js`, manifest contracts, and installer tests. No runtime/schema decision is needed for this documentation compaction.

- Began the mandatory fresh analysis/replanning pass from the Cloud-proven inactive Round 3 graph. This pass is documentation and read-only architecture work; it does not authorize adapter dispatch, runtime/hash changes, beta.1 sealing, or live Cloud installation.
- Audit targets are canonical-state transport between `owned-plan.py` and `owned-catchup.py`, one shared Host deadline, advisory/fail-closed outcome composition, removal of parallel adapter resolution/rendering, alpha.2 rollback compatibility, and exact fresh/resume lifecycle gates.
- The first source-inventory command used a POSIX-separator regex against Windows `rg --files` output and returned no matches. The audit will use native PowerShell path filtering rather than repeat that lookup.
- Mapped the current production ownership by function inventory: adapter 382 lines, inactive owned-plan 929, active owned-catchup 645. The architectural deletion target is the adapter's plan resolution/rendering block, while transcript/session handling remains in owned-catchup and Host JSON conversion remains in the adapter.
- Read the complete adapter. Identified the exact cutover: owned-plan must run first for both events; SessionStart then feeds its returned project object to owned-catchup; final order remains canary/catch-up/plan. The adapter must not retain fallback resolution or rendering, and its current independent 30-second `capture_output` supervisor is not acceptable for two-child activation.
- Compared both exact-v1 schema pairs and runtime validators. No schema v2 is needed: plan-result.project exactly matches catch-up-request.project. The adapter retains Host transcript validation/request assembly, but project state must be forwarded from the plan child without reconstruction. Existing adapter tests will need seam and golden updates while preserving their behavioral coverage.
- Audited installer/requirements references: Host policy remains adapter-only with 30 seconds; both children and plan schemas are already installed. A guessed activation-test filename caused one search error and will be replaced by inventory-based lookup; no source conclusion relies on that missing path.
- Read the actual activation and supervisor suites. Round 4 needs two-child fixture installation, plan-first sequencing and exact project forwarding, canary-only owned-plan failure, plan-preserving catch-up failure, both-child Linux/cross-user evidence, and a generic bounded supervisor with separate typed validators. Inventory counts should remain 11 installed / 21 ZIP.
- Compacted `PROJECT_UNDERSTANDING.md` Sections 10–16 into a durable architecture/recovery document. Removed the duplicated implementation transcript from Section 13, refreshed the stable decision set and open evidence list, and corrected historical global-Skill wording in both the project understanding and README.
- Cross-document status scan found no remaining stale “Phase 1 next” or “Round 4 not started” claim. Rephrased owned-plan state so architecture documents record “not dispatched until gates pass” while the exact R4-A/R4-B/R4-C authorization remains in the active plan and activation design.
- Final documentation assertions passed: every recovery-router target exists; README, roadmap, active plan, and project understanding agree on R4-A next / owned-plan not dispatched / alpha.2 rollback; obsolete future-tense Phase 1 fixture wording is gone; `git diff --check` passes; executable/runtime/schema/manifest/bootstrap diff is `NONE`.
- Started the maintainer-approved full Chinese README migration. Loaded the planning-with-files recovery rules, confirmed there is no unsynced catch-up report, inventoried 639 lines / 22 headings, and froze a no-drift rule for commands, identifiers, contracts, hashes, links, and canaries.
- Rewrote the complete README in Chinese and compacted duplicated modernization history. Updated the suite/inventory claims to the accepted Round 3 evidence and added the missing owned-plan/schema target-tree entries; commands, paths, keys, protocol names, hashes, links, and canaries remain unchanged.
- A first Markdown assertion incorrectly counted ASCII tree branch markers (backticks inside fenced `text` diagrams) as unbalanced inline code. Replaced that invalid check with a fenced-block-aware structural check instead of editing valid diagrams. README structure, relative links, required status facts, stale-English assertions, and `git diff --check` now pass.
- The first `npm test` attempt was blocked before loading any test files because the managed Windows sandbox denied Node test-runner worker creation (`spawn EPERM`, 14 file-level failures). Re-ran the identical approved `npm test` outside that process restriction: 63 tests / 46 pass / 17 honest POSIX/Linux skips / 0 fail in 3.6 seconds, exactly matching the Chinese README.
- Final Chinese-README cross-document gate passed: headings and explanatory prose are Chinese, internal links resolve, R4-A/no-dispatch/pristine-global/alpha.2/63-test facts agree with the project understanding, roadmap, and active plan, `git diff --check` passes, and executable/config diff remains `NONE`.
- Added root `AGENTS.md` as the repository-wide agent entry. It defines mandatory recovery order, the documentation authority table, conflict/synchronization rules, stable security and Release boundaries, Discovery Gate behavior, test expectations, and Chinese/English policy without duplicating volatile Round status. Linked it from the README repository map and made it first in the project-understanding recovery sequence.
- Completed the navigation loop by adding `cat AGENTS.md` as the first README recovery command and documenting its role before the project-understanding/roadmap/active-plan layers.
- Checkpoint was confirmed clean and R4-A began under the active plan. Re-read the current/target architecture, Phase 3 roadmap/handoff, active task plan, prior findings/progress, and the complete Round 4 activation design; no contract conflict or external blocker was found. R4-A remains strictly inactive for owned-plan dispatch.
- Read the full adapter, current activation/supervisor tests, both exact-v1 schema pairs, owned-plan validator/function inventory, and Phase 3 no-dispatch contract test. Froze the R4-A implementation shape: generic bounded Popen supervisor, typed catch-up/plan seams, explicit sibling identities, shared deadline in main, and test migration from “plan filename absent” to actual no-dispatch evidence.
- Implemented the R4-A bounded supervisor and typed protocol seams in `hooks/hook_adapter.py` without activating `owned-plan.py`. Added explicit catch-up/plan sibling identities, request/stdout/stderr bounds, absolute deadlines, POSIX process-group termination, strict per-result validators, and the inactive exact-v1 plan builder/invoker.
- Extended activation, contract, and supervisor regressions. The active adapter now proves an installed hostile plan stub is never executed; plan relation validation, regular/non-symlink siblings, streaming stdout/stderr overflow, and Linux zombie-aware process-group cleanup have dedicated coverage.
- The first focused Node test attempt inside the managed Windows sandbox was blocked by worker `spawn EPERM`; this is the known sandbox process restriction, not a loaded test failure. The approved full runner outside that restriction passed twice: 66 tests / 48 pass / 18 honest Linux-only skips / 0 fail. Python/Node syntax and `git diff --check` also passed.
- WSL could not supply a local Linux gate because no distribution is installed. Added `docs/phase-3-round-4-r4a-cloud-acceptance.md` with a fresh-Cloud, temporary-install-only 66/66 procedure covering static checks, both process-group layers, doctor, 11-file inventory, direct inactive plan seam, no production plan dispatch, zero snapshots, 21-entry ZIP, and clean workspace.
- Synchronized README, project understanding, programme roadmap, Round 4 design, and the active plan to the exact state: R4-A implementation/Windows PASS, Linux/Cloud pending, owned-plan production dispatch inactive, R4-B/R4-C unauthorized, alpha.2 rollback unchanged.
- Received and assessed the exact Fresh Cloud R4-A result: static PASS; Linux 66/66 with zero skips/failures; both process-group cleanup tests PASS; isolated install/doctor PASS; installed inventory 11; catch-up dispatch active; plan typed seam PASS but production dispatch inactive; zero snapshots; development ZIP 21 and healthy; workspace clean.
- Closed R4-A and synchronized its accepted Cloud evidence across the dedicated acceptance record, Round 4 activation design, README, project understanding, work plan, task plan, findings, and progress. No executable, contract, manifest, installer, bootstrap, Release, or production-dispatch byte changed in this closure update.
- Current stop point is intentional: await explicit user authorization before R4-B atomic activation. R4-C and beta.1 sealing remain unauthorized; alpha.2 remains the rollback baseline.
- The first closure consistency assertion required the literal contiguous phrase `plan production dispatch inactive`; valid documents instead used a line break, `owned-plan production dispatch`, or the machine marker `PLAN_PRODUCTION_DISPATCH=INACTIVE`. No repository state was wrong. Replaced the brittle literal check with semantic regex assertions before rerunning the gate.
- The maintainer explicitly authorized R4-B on 2026-08-04. Began the required critical-round recovery and activation-boundary audit; R4-A closure documentation remains as eight known uncommitted files, production dispatch is still unchanged, and R4-C remains out of scope.
- Re-read the first 360 lines of the durable progress ledger. No historical Phase 1/2 acceptance condition conflicts with R4-B: adapter-only Managed Hook registration, immutable published artifacts, exact inventories, and honest Windows/Linux evidence remain mandatory.
- Completed the remaining progress-ledger review through R4-A Cloud closure. The recorded sequence confirms that R4-B is the first authorized point for plan dispatch and local-plan deletion; no skipped inactive, policy, Linux, inventory, or supervision gate needs to be reopened.
- Completed the R4-B critical-round entry audit with GO. Exact-v1 remains sufficient; implementation is limited to tests, plan-first orchestration, exact project forwarding, local-plan deletion, trusted adapter hash synchronization, documentation, and isolated local/Linux gates. R4-C/Release/live Cloud installation remain excluded.
- Added the first R4-B activation tests before production changes. The in-sandbox Node runner hit the known worker `spawn EPERM`; the approved outer run registered 5 cases and produced the expected red state: 0 PASS / 3 activation-semantic FAIL / 2 Linux SKIP. Failures precisely show catch-up-before-plan and the still-active local renderer, validating that the tests detect the intended cutover rather than an unrelated regression.
- Implemented the first atomic adapter cutover: both events invoke the typed plan sibling first; only an injecting validated result can supply context; SessionStart forwards its exact project object to catch-up; output remains canary/catch-up/plan; plan failure is canary-only and catch-up failure preserves plan. Removed the adapter's plan selection, marker interpretation, task/progress reads, and local renderer while retaining Host transcript containment.
- Corrected the plan-result relational validator for the contract-valid case where an explicit `PLAN_ID` is rejected with `plan_id_rejected` and resolution safely falls through. The focused outer Windows activation run is now 5 registered / 3 PASS / 2 Linux SKIP / 0 FAIL.
- Reworked the seven portable adapter cases around the R4-B ownership boundary: exact owned context, authoritative no-plan/attachment results, planning opt-out and PLAN_ID request forwarding, and rejection of an out-of-root result without filesystem fallback. Real resolver/marker/link semantics remain in the Linux owned-plan suite.
- Preserved the historical six-scenario golden JSON byte-for-byte and pinned its existing SHA-256 in the migrated composition harness. Added a separate two-scenario beta.1 development golden for pristine owned-plan framing, timestamp-normalized progress text, and SessionStart canary/catch-up/plan order.
- Updated the Phase 3 lifecycle contract test and exact-v1 schema comments for active R4-B state, and added a validator regression for a safely rejected explicit PLAN_ID. The first 25-case focused run reached all behavior paths: 21 PASS / 3 honest Linux SKIP / 1 test-only FAIL. The failure is a source-order assertion scanning the entire file and seeing the backward-compatible catch-up helper before `main()`; production behavior tests passed. Narrow the assertion to `main()` rather than changing runtime order.
- Narrowed the source-order assertion to production `main()` and renamed the seam test to its active lifecycle. Focused R4-B regression is now 25 registered / 22 PASS / 3 honest Linux SKIP / 0 FAIL.
- First complete R4-B Windows run registered 69 cases: 46 PASS / 18 honest Linux SKIP / 5 FAIL. All five failures are the expected unsynchronized trusted-contract hash chain (two schema comments first detected at `adapter_plan_context_request`), causing one contract and four installer fail-closed results. No behavior, golden, Release-builder, importer, supervisor, or owned-runtime assertion failed.
- Synchronized the two lifecycle-comment-only schema hashes into `runtime-bundle-v1.json` and `upstream-manifest.json`, then synchronized the resulting runtime-bundle hash. No schema fields, installed paths, runtime file counts, or Release entry counts changed.
- Contract/installer focused rerun is green: 9 registered / 8 PASS / 1 honest Linux permission SKIP / 0 FAIL. This confirms fail-closed package drift, install/repair/backup lifecycle, and the active exact-v1 graph after hash synchronization.
- Synchronized README, project understanding, programme roadmap, and canonical Phase 3 design to the precise development state: R4-B active locally, alpha.2 immutable rollback, Linux/Cloud gate pending, and R4-C unauthorized. Historical alpha.2/Round 3/R4-A evidence remains labeled rather than rewritten as current behavior.
- The post-sync full suite reached 69 registered / 50 PASS / 18 Linux SKIP / 1 FAIL. The sole failure is test-only documentation lifecycle drift: `phase3-contracts.test.js` still required the now-retired phrase `inactive Round 3 trusted graph`. Updated that assertion to the current install/package/dispatch lifecycle; no product byte or safety rule changed.
- Final complete Windows R4-B suite is green: 69 registered / 51 PASS / 18 honest POSIX/Linux SKIP / 0 FAIL. This includes immutable alpha composition goldens, separate beta goldens, both failure directions, plan-first exact forwarding, installer/repair/backup, deterministic 21-entry Release construction, and retired-adapter source assertions.
- Static and provenance checks pass after the full suite: adapter/owned Python sources compile in memory, installer and changed JavaScript parse, importer exact inventory is healthy, and `git diff --check` reports no errors (only expected Windows LF/CRLF notices).
- Deterministic development build/check passes at the unchanged 21-entry boundary. The temporary ZIP was 80,769 bytes with development SHA-256 `9f698b128b5f4c272e7b0861a222a4bc31dc29df636574eaff208b0688b8aa2a`; it was removed after verification and is not a sealed or published beta artifact.
- Added `docs/phase-3-round-4-r4b-cloud-acceptance.md` with a single non-live script covering 69/69 Linux, both real children/users, process groups, alpha.2-to-current isolated upgrade, doctor/11/21, real latency/output measurements, snapshots, and clean workspace. It explicitly excludes R4-C/bootstrap/version/SHA/release work.
- Local `bash -n` validation could not start because this Windows environment has no `bash` executable. The attempted pipeline made no file change. Validate Markdown structure and embedded Python locally; the exact Bash block must pass `bash -n` as the first Cloud gate step.
- Runbook structural validation passes: both embedded Python heredocs compile and all four Markdown fences are balanced. The ignored local alpha.2 ZIP is present at the exact accepted 65,989-byte / `61f200...59db` identity, enabling a separate local upgrade rehearsal without network or live installation.
- Updated the active plan and Round 4 design to show R4-B local PASS / Cloud pending, checked completed local checklist items, and made the exact Cloud runbook the sole Next Step. Diff review confirms the production deletion target and plan-first orchestration are isolated; untracked additions are the beta golden and R4-B Cloud runbook.
- Current-status scan found one stale README handoff sentence still waiting for R4-B authorization. Replaced it with local PASS / Linux-Cloud pending and linked the new R4-B runbook; historical inactive Round 3 and R4-A evidence remains intentionally unchanged.
- Final R4-B static/status gate passes: current-authority stale scan is empty, contract/manifest/beta fixture JSON parses, changed Python/JavaScript compiles, and `git diff --check` is clean apart from expected Windows line-ending notices.
- Final post-documentation full Windows suite remains 69 registered / 51 PASS / 18 honest Linux-only SKIP / 0 FAIL. Local R4-B is complete; the only remaining R4-B acceptance step is the exact isolated Linux/Cloud runbook. R4-C remains unauthorized.
- A combined PowerShell status/source scan printed the correct 651-line adapter count and worktree inventory but misparsed an unescaped regex alternation as a pipeline command. No file changed from the error; repeat the no-parallel source scan with `Select-String` or single-quoted arguments.
