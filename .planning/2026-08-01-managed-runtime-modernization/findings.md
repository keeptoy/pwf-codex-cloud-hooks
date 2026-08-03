# Findings & Decisions: Managed Runtime Modernization

## Requirements
- Confirm whether repository behavior and README claims are synchronized.
- Explain the meaning of the current forty tests, while preserving historical nine-, twelve-, thirteen-, sixteen-, twenty-five-, thirty-, and thirty-five-test snapshots and without equating test cases to product features.
- Persist the agreed modernization design so it survives context compaction, clear, resume, and later sessions.
- Keep future work staged, auditable, reversible, and compatible with the current Cloud deployment.
- Incorporate the v0.2.2 Cloud catch-up investigation as design evidence rather than leaving its patch as an isolated release workaround.
- Give every downstream compatibility delta a retirement condition so the managed runtime converges toward upstream instead of accumulating a fork.

> The repository-audit sections below describe the historical v0.2.1 baseline that
> produced this roadmap. The current accepted implementation and Cloud evidence
> are recorded in the v0.2.2 evidence section later in this file.

Current release/iteration boundary as of 2026-08-03:
- `v0.2.2` is the published, Cloud-validated stable-release fallback; Release ZIP SHA-256 is `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84`.
- `v0.3.0-alpha.2` is the Cloud-accepted Phase 2 release and current Phase 3 rollback baseline. Its exact acceptance asset and evidence are recorded in `docs/v0.3.0-alpha.2-cloud-hard-acceptance.md`.
- `v0.3.0-alpha.1` is the retained Cloud-validated Phase 1 predecessor, no longer the active modernization rollback baseline. Its ZIP SHA-256 is `94fe21837d26bbe07d23cdf88b89133c12e6f431eafd8c412ece96204f6a5027`; after sealing that version and ZIP SHA into the external bootstrap, the bootstrap SHA-256 is `17e2248d04027001a929dbc07fcf06c6f4a9cb727530fcdb99edbcc4e90fba32`.
- Release sealing is deliberately ordered, not circular: freeze version and ZIP contents, build/hash the ZIP, write version/package/ZIP SHA into the external Bash, hash the sealed Bash, then publish and verify both independent assets. A bootstrap hash measured before those defaults are written is not the release bootstrap hash.
- The final alpha.1 resume regression extracted six unsynced messages rather than the earlier seven-message fixture. This is not a fixed-count contract: the relevant guarantees are correct last-update selection, bounded extraction, logical context preservation, and survival of the tail sentinel for the transcript actually observed.

## Repository Audit

### Confirmed matches
- Package version is `0.2.1` in `package.json`, README, and the Cloud bootstrap filename/default release setting.
- The installer and README agree that only `SessionStart` and `UserPromptSubmit` are managed.
- `SessionStart` is configured for `startup|resume|clear|compact`; README accurately says startup/resume are verified while forced clear/compact evidence remains outstanding.
- Both current events use the read-only adapter and emit `PWF_GLOBAL_HOOK_CANARY_V1`.
- The adapter performs optional `session-catchup.py` execution only for `SessionStart`, then injects the plan head and recent progress when a plan exists.
- The default Skill search order in README matches `install.js` and `hook_adapter.py`.
- The default managed requirements path, managed-directory conflict behavior, root requirement, and absolute `/usr/bin/python3` managed command match the implementation.
- Upstream release, commit, archive checksum, and three required Skill-file hashes match `upstream-manifest.json`.
- README's guarded-repair description matches manifest schema 3, owned/unowned requirements fingerprints, runtime inventory checks, and the repair blocker behavior.
- Deferred Hook events in README are not registered by the installer.
- The bootstrap script downloads a pinned `v0.2.1` zip, verifies its SHA-256, runs dry-run/install/doctor, and verifies both managed event definitions.

### README discrepancies corrected in this audit
1. The previous test paragraph said the suite verified “trust state.” The current managed-policy tests do not directly assert a persisted trust-state entry. That wording was removed and replaced with the actual nine-case coverage.
2. The README described the folder as temporarily staged inside another repository and instructed a future manual move. The current repository, release URL, and Git history show that dedicated-repository transfer has already occurred. The stale staging section and move step were removed.
3. The README did not clarify that nine test cases are not nine independently implemented product features. It now says several cases cover multiple guarantees.

### README onboarding structure added after review
- A start-here section now distinguishes the upstream planning workflow, Codex Skill discovery, and this repository's managed deployment role.
- Current behavior and missing capabilities are explicit, so a reader cannot mistake the target runtime bundle for already-installed code.
- Current and target architecture diagrams show the transition without erasing the `0.2.1` baseline.
- Trust boundaries and component ownership identify which behavior belongs locally and which will remain canonical upstream.
- Repository map, prerequisites, development checks, installer commands, Cloud bootstrap, and guarded-repair response provide an operational path for a new maintainer.
- A handoff section points to the active planning files, identifies Phase 1 as next, and states that Phase 1 must not change installed Hook behavior.

### Remaining limitations that are documented rather than discrepancies
- `SessionStart(source=clear|compact)` is configured but not yet evidenced by a forced Cloud compaction test.
- The canary is intentionally still present during verification.
- PreCompact, PostCompact, tool, permission, and Stop Hooks remain deferred.
- The current adapter is a deliberately simplified legacy-style implementation and does not yet provide opt-out, session isolation, canonical containment, attestation, nonce, smart injection, or ledger behavior.
- The Cloud bootstrap is Debian/Ubuntu amd64-oriented and the README describes a Codex Cloud target rather than cross-platform installation.

## Current Test Interpretation

The suite now has forty Node test cases. Cases 1–9 are the original audit inventory, cases 10–12 were added with the v0.2.2 Cloud compatibility work, case 13 froze Phase 1 Round 1, cases 14–16 implement the Round 2 importer boundary, cases 17–25 close Phase 1 Round 3, cases 26–30 begin Phase 2 Round 1, cases 31–35 close Phase 2 Round 2, and cases 36–40 close Phase 2 Round 3:

1. `SessionStart` emits scoped plan context and a source canary.
2. `UserPromptSubmit` emits plan/progress context and a canary.
3. A project without planning files emits only the event canary.
4. Installer dry-run is read-only and reports exactly two events.
5. An incompatible existing `managed_dir` fails closed.
6. Managed install preserves unrelated config, installs the exact inactive multi-file runtime, is idempotent, passes doctor, and uninstalls only owned state.
7. Repair restores owned adapter, nested runtime-file, mode, or managed-definition drift.
8. Repair refuses unowned requirements, manifest inventory, and unknown runtime drift; normal install also refuses unknown runtime entries.
9. Installation backups can restore all pre-existing managed files byte-for-byte.
10. The compatibility patch is deterministic, idempotent, hash-checked, and fails closed on unknown Skill content.
11. The v0.3.0 bootstrap applies the compatibility patch before installation and refuses an unpinned Release checksum.
12. Patched catch-up covers `.agents` Skill placement, `$CODEX_HOME/sessions`, scoped plans, resume injection, bounded long-wrapper output, and preservation of the tail sentinel.
13. The Phase 1 contract test verifies runtime provenance/dependencies, overlay anchors and retirement rules, request/result schemas, and the external-bootstrap Release artifact boundary.
14. Runtime import is canonical-path allowlisted, deterministic, idempotent, hash-verified, and checkable.
15. Runtime import rejects wrong archive identity and pristine-source drift before producing output.
16. Runtime check and re-import reject changed files, unknown files, and unknown directories instead of overwriting drift.
17. SessionStart without a plan matches the exact v0.2.2 canary output.
18. UserPromptSubmit without a plan matches the exact v0.2.2 canary output.
19. SessionStart with an active scoped plan matches the exact v0.2.2 output.
20. UserPromptSubmit with an active scoped plan matches the exact v0.2.2 output.
21. Newest-scoped fallback selection matches the exact v0.2.2 output.
22. Legacy-root fallback selection matches the exact v0.2.2 output.
23. Sanitized Cloud observations freeze lifecycle-specific environment and Hook stdin schemas.
24. Cloud-shaped catch-up preserves structured update #25, seven messages, duplicate-family handling, bounded wrapper tail, and the sentinel.
25. The Release ZIP is deterministic, contains the current exact 19-entry allowlist with fixed metadata/modes, and excludes the external bootstrap.
26. The inactive owned runtime emits a strict non-injecting `no_plan` result and safely rejects malformed/extra-field input.
27. A Host transcript cannot be marked validated without an explicit allowed containment root.
28. A contained rollout with matching session identity/cwd is preferred directly and preserves bounded v0.2.2 catch-up output.
29. A rejected Host path scans only explicitly supplied roots and reports both safe fallback warnings.
30. Session identity mismatch and a Host path outside allowed roots fail closed without report injection.
31. The inactive runtime distinguishes `planning_disabled` from `session_not_attached` and rejects resolved plans under either silent policy.
32. Session attachment remains legacy-compatible without safe markers, then isolates on the first safe marker and never injects marker contents.
33. `PLANNING_DISABLED=1` suppresses both catch-up and plan context while preserving the event/source canary.
34. `PLAN_ID` takes precedence over a BOM-tolerant active pointer, which remains the fallback.
35. A scoped-plan symlink or Windows junction cannot inject an external task plan.
36. Invalid transcript UTF-8, JSON, non-object records, unsafe shapes, overlong records, and a missing Host file never produce partial injection.
37. Unknown records remain non-content warnings, while event-only user/agent messages are a controlled fallback when no response-item conversation exists.
38. `no_planning_update`, `no_unsynced_context`, and `output_budget_exceeded` remain distinct non-injecting outcomes under the fixed budgets.
39. Diagnostic mode reports selected paths and `diagnostic_report_available` without returning any transcript content.
40. The inactive supervisor accepts one exact v1 result and maps timeout, nonzero exit, malformed/contradictory/oversized stdout, invalid UTF-8, unknown warnings, and a missing child to safe runtime reasons.

These are forty test cases, not forty atomic features. Cases 6–8, 10–16, and 23–40 each cover several behaviors, while some product claims share one test or are verified by static inspection rather than a standalone test. Historical progress entries reporting nine, twelve, thirteen, sixteen, twenty-five, thirty, or thirty-five passing tests remain dated audit evidence, not the current suite count.

## Architecture Decision

Use a hybrid managed-runtime bundle:

```text
/etc/codex/requirements.toml
  -> absolute managed command
  -> local Codex protocol adapter
  -> allowlisted upstream canonical runtime copied from a pinned archive
```

### Local ownership
- managed-policy rendering and merge behavior;
- installation, atomic writes, lock, backup, doctor, repair, uninstall;
- runtime inventory and provenance;
- Codex stdin/stdout protocol adaptation;
- Cloud canary and staged rollout.

### Upstream ownership
- active-plan resolution and containment;
- opt-out and session isolation semantics;
- context injection shape;
- attestation and nonce framing;
- smart injection and structured ledger summaries;
- compaction and completion semantics.

### Why not call mutable Skill files directly
- A separately updated Skill could change executed behavior without a release of this managed package.
- Rollback and doctor would span two independently mutable installations.
- The current manifest verifies only three Skill files, not every future executable dependency.
- Managed runtime should remain self-contained and reproducible.

### Why not copy all upstream `.codex/`
- Its workspace/personal registration paths and fallbacks differ from the system-managed Cloud model.
- It contains more events than the current rollout has verified.
- Copying everything expands the trusted execution surface unnecessarily.

## Safety Principles
- Installation/integrity checks fail closed.
- Advisory Hook execution failures allow the Codex loop to continue.
- Unsafe or unattested content is not injected even when the loop continues.
- Legacy plans remain legacy unless a user explicitly selects a newer mode.
- A nonce strengthens framing but attestation is the tamper boundary.
- Tool Hooks are useful guardrails, not a complete enforcement boundary.
- Stop gating must be bounded and explicitly enabled.

## v0.2.2 Cloud Evidence and Roadmap Impact

### What the Cloud investigation proved
- Codex Cloud installed the global Skill at `/root/.agents/skills/planning-with-files`, while the upstream catch-up script inferred its runtime from its own path. A path outside `/.codex/` was misclassified as Claude. The managed adapter fixed this by explicitly passing `PWF_RUNTIME=codex`.
- In the observed sandbox, `HOME=/root`, `CODEX_HOME=/opt/codex`, and session transcripts lived under `/opt/codex/sessions`; `/root/.codex/sessions` did not exist. Hook processes cannot be assumed to inherit setup-shell exports, so the adapter also derived the Codex home from its owned installed path.
- Planning-context injection already understood `.planning/.active_plan` and scoped plans, while upstream catch-up initially checked only root planning files. The two paths must share one resolver or their behavior will drift again.
- Codex planning-update detection depends on structured successful `patch_apply_end` records. Arbitrary shell writes are not an equivalent transcript signal.
- Real Cloud transcripts can contain parallel `response_item` and `event_msg` representations, tool records, developer/user wrappers, and repeated logical content. A transcript reader needs explicit normalization policy rather than assuming one record family equals one logical message.
- The original report retained only the first 300 characters of each user message. Cloud prepended a long PR-feedback wrapper, placing the actual instruction and sentinel at the end. Bounded head/tail rendering fixed the loss without allowing unbounded context injection.
- The final resume black box observed `SESSION CATCHUP DETECTED`, `Runtime: codex`, the scoped planning update, a positive unsynced count, the long-wrapper tail sentinel, and Planning context. The compatibility behavior is therefore a proven baseline fixture, not a speculative requirement.
- The maintainer later supplied the final sanitized raw success output. It records previous rollout `rollout-2026-08-01T13-45-21-019fbd92-7cc2-7813-85d1-54144d4cf649`, planning update message 25, unsynced count 7, visible bounded middle truncation, and tail sentinel `PWF_CATCHUP_UNSYNCED_SENTINEL_82C4`. The exact evidence is preserved in `evidence/v0.2.2-session-catchup-success.md`.
- The count 7 is a golden v0.2.2 output value, not proof that seven deduplicated logical messages exist beneath the report. Phase 2 normalization must document any intentional count change.
- The observed install and Hook users were both root. That sample rules out a user mismatch only for that environment; it does not prove a general cross-user deployment contract.

### No-init cold-sandbox baseline (2026-08-02)
- A new empty repository with no repository initialization script proved that `CODEX_HOME=/opt/codex` and `/opt/codex/sessions` are properties of the current post-start Codex agent environment, not exports introduced by this repository's bootstrap. This is a dated runtime observation, not a permanent platform guarantee.
- The sample ran as root with `HOME=/root`; `CODEX_SESSIONS_DIR` and `USER` were unset. `/root/.codex`, `/root/.agents`, and `/etc/codex/requirements.toml` were absent.
- Codex CLI `0.144.0-alpha.4` reported the `hooks` feature as stable and enabled. The platform supplies Hook capability, while this repository still supplies managed requirements, installation policy, and the planning runtime.
- `CODEX_THREAD_ID`, `session_meta.id`, and `session_meta.session_id` had identical UUID lengths and sanitized hashes. Session identity can therefore be correlated in this sample, but raw Hook stdin must still be observed before making `session_id` required in the adapter contract.
- The selected rollout matched the project through `session_meta.cwd`; `session_meta.source` was `vscode`.
- A successful `apply_patch` emitted a structured `event_msg` with `payload.type=patch_apply_end`, `success=true`, relative-path `changes`, and `call_id`, `turn_id`, `status`, `stdout`, and `stderr` keys. This is suitable for the Phase 1 planning-update fixture.
- User and assistant messages appeared as exact cross-family duplicates in adjacent `response_item` and `event_msg` records. Role, length, and sanitized content hash matched. Deduplication must be conservative and preserve ordering and the only copy of any message.
- The sanitized rollout contained 56 valid records with record families `session_meta`, `turn_context`, `world_state`, `event_msg`, and `response_item`; the requested Cloud-shaped schemas are now available for fixture construction without message bodies.
- This baseline narrowed the remaining host-contract questions to the actual Hook stdin key/type shape and Hook-process environment; the following managed probe resolved them for the current image.

### Managed Hook stdin schema probe (2026-08-02)
- Both canaries were actually injected before the first reply: `SessionStart` and `UserPromptSubmit`.
- `SessionStart` stdin had exactly seven observed top-level fields: `cwd`, `hook_event_name`, `model`, `permission_mode`, `session_id`, `source`, and `transcript_path`.
- `UserPromptSubmit` stdin had exactly eight observed top-level fields: `cwd`, `hook_event_name`, `model`, `permission_mode`, `prompt`, `session_id`, `transcript_path`, and `turn_id`.
- The same 36-character `session_id` hash appeared in startup, resume, and both prompt events. Each prompt had a different 36-character `turn_id`.
- `SessionStart.source=startup` and `SessionStart.source=resume` were both observed. The supplied four-record output already includes the requested resume sample.
- Hook subprocess environments contained `CODEX_HOME=/opt/codex`; `CODEX_SESSIONS_DIR`, `CODEX_THREAD_ID`, and `PWF_SESSION_ID` were absent. The earlier agent-shell `CODEX_THREAD_ID` is therefore not a Hook contract.
- The temporary probe initializer did not assign or export `CODEX_HOME`. Its `equals_opt_codex = value == "/opt/codex"` expression only compared the value returned by `os.environ.get("CODEX_HOME")`; it could not create or modify the variable.
- A separate lifecycle-stage control ran the same shell test during sandbox initialization and after the first prompt. `CODEX_HOME` was absent during initialization and `/opt/codex` after Codex Runtime startup. Together with the probe initializer's lack of any assignment/export, this locates platform provisioning between setup and runtime and rules out this repository's initializer as the source of the later value.
- The exact internal platform mechanism remains irrelevant to the adapter contract: setup must supply its own default, while runtime may consume but must not require the observed variable.
- The Host supplies `transcript_path` directly on both enabled events. The owned catch-up runtime should validate and prefer this path, using session-store enumeration only as a compatibility fallback.
- A supplied transcript path must still be checked for absolute/canonical containment beneath an allowed session root, regular-file type, expected rollout shape, and matching `session_meta` identity before reading content.
- `prompt` is available only to UserPromptSubmit and is sensitive. Normal diagnostics and fixtures should record its type/length at most, never its body.
- Current evidence supersedes an earlier shorthand that described the Hook environment as lacking `CODEX_HOME`. The durable requirement is to support both observed presence and a missing-variable compatibility fixture.

### What this changes in the modernization architecture
- The original managed-runtime direction remains correct and is strengthened by the evidence. Today the owned adapter still discovers and executes `session-catchup.py` from the mutable global Skill. Install/doctor hash validation helps, but it does not make that file part of the owned runtime inventory at execution time.
- The highest-value next implementation milestone is therefore not a new lifecycle event. It is moving the Cloud-proven catch-up behavior and its allowlisted dependencies beneath `$CODEX_HOME/hooks/planning-with-files/`, then invoking that owned copy through an explicit adapter/runtime contract.
- The current single compatibility patch is a bridge. Phase 1 should record its four deltas in a compatibility-overlay ledger, and Phase 2 should apply only still-required deltas to the imported owned copy. Phase 3 should remove global Skill patching/discovery after both catch-up and prompt injection use the owned bundle.
- Upstream files should remain pristine where possible, but “never patch imported upstream” is too rigid while Cloud and upstream contracts differ. The auditable compromise is a deterministic overlay with pristine input hash, managed output hash, golden Cloud fixture, and an explicit removal condition for every delta.
- Silent early returns are operationally expensive. A non-injecting diagnostic mode should identify `no_plan`, missing session store, no matching session, no planning update, no unsynced context, or runtime error, while normal Hook stdout remains bounded valid JSON.
- Output limits require two levels: per-message head/tail preservation and an overall report/token budget. Deduplication should remove only provably duplicated logical records and must never delete the sole copy of a trailing user instruction.
- Release construction also needs a formal boundary. Documentation edits changed ZIP bytes after a tested checksum was recorded. The reproducible package must use an explicit file allowlist, and the bootstrap that pins the archive checksum should be published outside that checksummed payload or through a documented two-stage process.

### Recommended iteration order
1. **Contract only:** freeze v0.2.2 Cloud fixtures, overlay ledger, host request schema, diagnostic reason codes, and artifact allowlist; do not change runtime behavior.
2. **Own catch-up:** install the verified catch-up runtime beneath managed_dir, keep the global Skill pristine, and pass explicit runtime/session/project inputs.
3. **Harden and observe:** shared plan resolver, containment, session isolation, transcript normalization, budgets, diagnostic CLI, and cross-user/path tests.
4. **Canonicalize injection:** replace the adapter's remaining plan-resolution/injection implementation with the owned upstream-derived runtime and remove the bootstrap Skill patch.
5. **Then expand lifecycle:** attestation/smart modes, compact, selective tool Hooks, advisory Stop, and finally optional hard gating.

This sequence keeps the original roadmap's safety posture but moves the Cloud-proven trust-boundary and observability work ahead of new features.

## Documentation Consistency Regression (2026-08-02)

- Reconciled the current twelve-test inventory with the historical nine-test Phase 0 audit; archived v0.2.2 records remain historical evidence.
- Made the `CODEX_HOME` contract lifecycle-specific: absent during the observed initialization stage, present as `/opt/codex` in the observed post-start agent and Hook stages, but never a permanent-path guarantee.
- Distinguished the current v0.2.2-inherited scan-and-patched-Skill catch-up implementation from the Phase 2 target, which validates Host `transcript_path` first and scans session stores only as a compatibility fallback.
- Added `turn_id`, validated `transcript_path`, project root, and transcript fallback to the target adapter/runtime contract.
- Verified against the current official Codex Hooks documentation that the event/source and output contracts used by the roadmap are accurate. The same documentation warns that transcript JSONL is not a stable interface, so the owned reader must parse defensively instead of freezing the probe sample as a permanent schema.
- At this pre-packaging checkpoint, package and development bootstrap were v0.3.0, the bootstrap checksum was intentionally all zero, and v0.2.2 plus its recorded SHA remained the published rollback baseline. The later alpha.1 sealing and Cloud acceptance supersede this checkpoint state.
- Phase 1 was still pending at this checkpoint; this regression changed documentation and planning context only, not installed Hook behavior.

## Windows Installer-Test Equivalence

- The remaining six cases are `tests/installer.test.js`, not missing Python tests. Their setup already invokes `python` on Windows to apply the Skill compatibility patch.
- Non-dry-run cases stop on Windows because `install.js` intentionally verifies `/usr/bin/python3` and writes that absolute interpreter into system-managed Hook commands for the Linux Codex Cloud target.
- Six separately rewritten Python scripts would test a second implementation rather than the production Node installer and could produce false confidence.
- The strongest local equivalent is the unchanged suite under WSL/Linux. A secondary Windows option is a temporary, non-production interpreter seam that keeps all installer logic and existing assertions intact; any result must be labeled host-equivalence evidence rather than proof of Linux permissions or `/usr/bin/python3` availability.
- This workstation has Python 3.13.5 but no installed WSL distribution. The selected local check temporarily substitutes only the managed-interpreter constant and passes the real Windows Python path to the existing six Node cases, then restores and hash-verifies both source files.
- The first narrow seam exposed a Windows-only raw-TOML ownership mismatch: JSON/TOML escaping doubled backslashes, so a Linux-style raw substring check did not recognize and remove existing managed blocks on repeat install. This is outside the declared Linux Cloud production target.
- With test-only normalization of the interpreter and command-path representation, the unchanged six assertions all passed. Production `install.js` and `tests/installer.test.js` were restored to their exact pre-test SHA-256 values, so no cross-platform seam entered the product.

## Phase 1 Round 1 Contract Findings

- Canonical upstream sources must come from `planning-with-files-3.8.2/skills/planning-with-files/`; the supplied tree contains many IDE mirrors and a different top-level distribution script that must not enter the owned bundle.
- `session-catchup.py` is Python-standard-library-only and has no direct file dependency. Its pristine hash is already pinned and all four v0.2.2 transformations target this one file.
- `resolve-plan-dir.sh` is a standalone canonical scoped-plan resolver. It is a Phase 2 candidate even though upstream catch-up does not currently invoke it, because the modernization requires catch-up and prompt injection to share containment/resolution semantics.
- `inject-plan.sh` intentionally keeps resolution logic inline and has one conditional direct file dependency on sibling `ledger-summary.sh` for autonomous/gated modes. Phase 3 legacy behavior can execute without that sibling, but importing the script without documenting the conditional edge would produce an incomplete dependency graph.
- A minimal staged v1 allowlist should therefore distinguish active Phase 2 files (`session-catchup.py`, `resolve-plan-dir.sh`), Phase 3 files (`inject-plan.sh`, conditional `ledger-summary.sh`), and explicitly deferred Phase 4+ candidates. Deferred scripts are not allowed into the Phase 1/2 artifact merely because the eventual README diagram names them.
- The current physical patch bundles four logical deltas. Round 1 will ledger them separately with a common pristine/output file hash plus distinct anchor identity, rationale, Cloud evidence, owner, and retirement condition.
- Exact pristine candidate hashes are: `session-catchup.py` `6476fd...e6de`, `resolve-plan-dir.sh` `38a1c5...e9bd`, `inject-plan.sh` `72c790...0364`, and `ledger-summary.sh` `d4fe62...f3b9`. Full hashes belong in the machine contract.
- Exact SHA-256 values of the four pristine transformation anchors are: session directory `951b789d...f6b`, runtime selection `3498426d...ad84`, planning guard `c3282623...84ff`, and user rendering `92181f87...7af`.
- v0.2.2 report compatibility constants are last 15 messages, at most 4 tool names, assistant text capped at 300 characters, and long user text over 1000 characters rendered as head 350 plus the literal middle marker plus tail 650. The target contract also needs a whole-report cap because upstream currently has none.
- Canonical `inject-plan.sh` is fail-open and self-contained for legacy mode, but conditionally calls `ledger-summary.sh` for autonomous/gated mode. `ledger-summary.sh` itself documents canonical plan resolution and must be checked for further direct dependencies before it can be admitted.
- Upstream MIT attribution is `Copyright (c) 2026 Ahmad Adi`; Round 2 must preserve the complete license text when substantial source files enter the Release artifact.

## Phase 1 Round 2 Import Findings

- Reproducibility requires the bundle's `overlay_ids` order to equal the compatibility ledger's application order, not merely contain the same set. Round 2 corrected the Round 1 ordering ambiguity before importing any files.
- The upstream archive license is now an allowlisted, hash-verified provenance input even though it is not copied into `runtime/upstream/`; the full MIT text is distributed in `THIRD_PARTY_NOTICES.md`.
- The import boundary reads only the four allowlisted sources plus `LICENSE`, rejects unsafe ZIP paths and symlinks, requires one archive root, verifies archive/pristine/anchor/managed hashes, and refuses any missing, changed, or unknown destination file.
- Existing destination drift is never overwritten. An exact existing runtime is an idempotent no-op; a new runtime is created through a sibling staging directory and renamed only after all bytes are prepared.
- Windows cannot reliably preserve POSIX executable mode metadata in the working tree, so content and inventory checks remain exact there while `0755` mode is additionally enforced on POSIX hosts and in the eventual deterministic Release ZIP.
- The inherited archive SHA `aabc0781...ce894` had no URL or generation evidence and is not produced by the official v3.8.2 tag endpoint, commit endpoint, or Release API zipball. The Release has no independent assets. The contract now binds the exact canonical tag URL and its twice-observed `7dab03...6dd1` SHA; canonical per-file hashes remain an independent second layer.
- GitHub's tag archive contains many adapter mirrors. Import lookup must require exactly `one archive root + canonical source_path`; suffix matching alone found eleven `session-catchup.py` copies and was correctly rejected before the locator was tightened.
- Destination inventory includes directories as well as files, and path validation retains symlink evidence instead of resolving the requested destination before inspection.
- Byte hashes of text contracts are only cross-checkout reproducible when line endings are part of the repository contract. A narrow `.gitattributes` now forces LF for hashed contracts, runtime sources, importer, notice, manifest, patcher anchors, and pristine script fixtures.

## Phase 1 Round 3 Initial Findings

- At the start of Round 3 the installer owned only `hook_adapter.py` plus the generated manifest; it now owns the four inactive `upstream/` files, compatibility ledger, and third-party notice as an exact installed inventory without changing managed Hook commands.
- The installed manifest can record every source-relative installed file hash and mode, but must not hash itself. Doctor may allow the generated manifest as a special inventory entry while fail-closing on every other unknown file, directory, or symlink.
- Repair should restore every missing, changed, or mode-drifted owned runtime file only when the manifest, upstream identity, and unowned requirements remain trustworthy. Unknown runtime entries remain blockers.
- Linux production keeps `/usr/bin/python3`. Windows lifecycle equivalence should use a copied test package with only that constant substituted, while stable forward-slash command serialization can remain production code because it is byte-identical on Linux and removes TOML ownership ambiguity on Windows.
- The current catch-up parser recognizes planning mutation only from structured `event_msg.payload.type=patch_apply_end`; Codex conversation extraction reads `response_item` messages/tool calls and deliberately ignores `event_msg` conversation duplicates. A Cloud fixture should retain both families to freeze the observed shape while expecting the current seven-record compatibility count, not prematurely introduce Phase 2 deduplication.
- The current adapter plan precedence is active scoped plan, newest scoped plan by directory mtime, then legacy root. Golden fixtures can freeze all three plus no-plan and both event envelopes without invoking the staged runtime.
- Release packaging already contains all runtime sources and contracts. Round 3 installer inventory should install the overlay ledger and notice alongside the adapter/upstream directory; request/result/bundle artifact contracts remain package audit inputs rather than runtime-executed files.

## Resources
- Local README and installer implementation.
- Local upstream pin: `OthmanAdi/planning-with-files` release `v3.8.2`, commit `b04ffd9c8f9f93919649d197e5d4ec1bfc06fa14`.
- Upstream Codex adapter and canonical Skill scripts inspected at the pinned commit.
- Official Codex Hooks documentation: `https://learn.chatgpt.com/docs/hooks`.

## Phase 2 Analysis (2026-08-02)

- Keep the roadmap estimate at four implementation rounds. The alpha.2 Cloud hard acceptance is the Round 4 exit, not a fifth development round; actual Cloud-only defects may add a repair iteration.
- The staged `session-catchup.py` still exposes the legacy positional-project/plain-stdout interface and infers runtime/session stores from environment or installation context. The frozen v1 JSON request/result contracts therefore need a managed entrypoint mode before activation.
- Round 1 should build that structured path and validate/prefer Host `transcript_path`, while retaining explicit ordered scan roots only as a coded compatibility fallback. It remains inactive so protocol mistakes cannot affect the accepted alpha.1 Hook path.
- Round 2 owns project/session safety: use one canonical resolver result for catch-up and current adapter context, fail closed on canonical-path escape, implement `PLANNING_DISABLED=1`, and define `.planning/sessions/<session_id>.attached` semantics before coding them. The attachment convention is local policy, not behavior found in upstream v3.8.2.
- Round 3 owns untrusted/changeable transcript handling and observability: conservative cross-family deduplication, structured `patch_apply_end`, per-message plus total budgets, safe outcome/warning codes, non-injecting diagnostics, and explicit malformed JSON/UTF-8/timeout/child-failure behavior.
- Round 4 is the only activation round: switch SessionStart catch-up from the mutable global Skill to the verified installed copy, keep UserPromptSubmit injection local until Phase 3, verify fail-open loop/fail-closed injection behavior, test root/root plus synthetic cross-user readability, seal alpha.2, and perform the full Cloud catch-up hard acceptance.
- Two roadmap wordings need implementation-time reconciliation. Phase 2 requires the global Skill to remain pristine, while an older Phase 3 item delays bootstrap patch removal; the recommended boundary is to stop patching/discovering the global catch-up file when Round 4 activates the owned copy. Phase 3 then replaces the remaining local Python prompt-injection logic, not an already-unused global catch-up patch.
- Although the v1 request schema permits both enabled event shapes, Phase 2 must dispatch the owned catch-up runtime only for SessionStart. UserPromptSubmit can share validation/resolution data, but its canonical upstream execution remains Phase 3 scope.
- Any change to the managed upstream file or a new local runtime entrypoint changes the trusted artifact graph. Round 1 must update the importer/overlay ledger, runtime bundle, upstream manifest, installed inventory, release allowlist, and their hashes atomically; a hand-edited installed copy would break Phase 1 provenance guarantees.
- Round 1 completion confirmed the local-wrapper boundary is viable without activation: it can reuse the pinned parser, enforce Host-path/session/project trust, stay inside exact installer inventory, and leave the accepted adapter/golden outputs byte-for-byte unchanged. Dynamic imports must keep `sys.dont_write_bytecode` enabled because installed runtime directories reject every cache entry as unknown drift.

## Phase 2 Round 1 Initial Design

- Prefer a new local `runtime/owned-catchup.py` entrypoint over adding a second large overlay to the pinned upstream script. The local entrypoint owns the Codex request/result protocol and transcript trust boundary, while `runtime/upstream/session-catchup.py` remains the pinned parsing/extraction implementation and a declared direct dependency.
- Install the entrypoint as `owned-catchup.py` beside `hook_adapter.py`. Round 1 adds it to the exact runtime inventory and Release allowlist, but managed requirements must continue to contain only `hook_adapter.py`; activation remains Round 4.
- `upstream-manifest.json` currently derives installed files only from `managed_runtime.files`, which represent imported upstream sources. Add a separately typed local-runtime inventory rather than pretending the entrypoint came from upstream.
- The runtime-result contract is sufficient for inactive Round 1: normal stdout is exactly one JSON result, only `report_emitted` injects, and safe diagnostics expose selection metadata without transcript content. Round 3 will broaden normalization and error-path coverage without changing the versioned envelope.
- Round 1 tightens a semantic gap in the request schema: a Host path cannot be meaningfully `validated` without at least one explicit session root against which containment was checked. The schema and runtime now both require that root; scan fallback remains limited to at most three unique explicit roots.
- The first entrypoint hash was superseded after exact-inventory testing exposed Python bytecode cache writes. The stabilized identities are `owned-catchup.py` `e122a82ed7b3ba8f185bfc408ae35ff8ed80054cdb880b64f6793d1972245de6`, runtime bundle contract `aa8a90feaf67c2361e929a7c6ea7cc3cad5f753bd396f83a4047c6b7eceb7487`, request schema `478165c27b9de70634d29b2df9c8fd276742c342cb0f2bc1e484b200caee23a4`, and release artifact contract `f96ddaa00d6ddb82b941da110c6f35c05829fa6473e276ab68b807c7131482c2`.

## Phase 2 Round 2 Policy

- Backward compatibility is explicit: when `.planning/sessions/` contains no safe direct `<session_id>.attached` marker, every session retains the historical project-plan visibility.
- Once at least one safe marker exists, session isolation is enabled for the project. Only the exact safe Host `session_id` marker attaches that session; missing, malformed, mismatched, symlinked, or indirect markers do not attach it.
- A safe session identifier matches `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`. Marker contents never select a plan and are never injected.
- `PLANNING_DISABLED=1` has highest priority and suppresses both resume catch-up and planning context while retaining the lifecycle canary.
- Plan precedence remains `PLAN_ID`, BOM-tolerant `.planning/.active_plan`, newest valid scoped plan, then legacy root. Every selected directory and injected file must resolve canonically within the project root.
- The current adapter resolves this state once for both of its paths. The inactive owned runtime receives the same resolved policy through its versioned request; activation remains Round 4.
- Round 2 trusted identities are: adapter `19b4990b1e4b057125a6d3040061d7d3816c74456df774e64d1004743b212608`, owned runtime `224e2be605e9594c0d70cc05e8d3acef7a1281819d4c9e7773fc8ed997983254`, runtime bundle `1724239323612244291a8327fafa678042055a8558a759bc826d7e149e4f47bd`, request schema `a86588e3c7d55cbbeddc74110403ba815ad8715735c149d77dd0c47996ee72d5`, and result schema `d3ce62c2dc339fe21d2c3f39210007c1034da7c67c3ff983a0b1063e30f10c7f`.

## Phase 2 Round 3 Initial Transcript Audit

- The pinned parser opens Codex JSONL with UTF-8 replacement and silently skips invalid/non-object JSON records. That is compatibility-friendly but cannot by itself distinguish malformed bytes, invalid JSON, and merely unknown record families for managed diagnostics.
- The owned entrypoint currently delegates the entire transcript parse/update/extract path to upstream and therefore cannot yet emit the already-declared `unknown_transcript_record` or `duplicate_record_suppressed` warnings.
- The Cloud fixture contains both `response_item` and `event_msg` copies of logical user/assistant messages. Existing upstream extraction happens to render the `response_item` family and ignore the event duplicates; Round 3 must make this normalization policy explicit and conservative rather than depending on incidental branch selection.
- Runtime request decoding already maps malformed JSON and invalid UTF-8 stdin to `invalid_request` with valid JSON stdout. Transcript corruption is a separate data-plane condition and must remain non-injecting without being confused with request-schema failure.
- Round 3 will read selected Codex transcripts as strict UTF-8, line-delimited object JSON. Any invalid UTF-8, invalid/non-object JSON, or overlong record makes the transcript `malformed_transcript`; partial known context is not injected because the corrupt record could contain the sole trailing instruction.
- Valid but unknown top-level or payload families remain skippable and produce `unknown_transcript_record`. This preserves forward compatibility without treating an unrecognized object as trusted conversation text.
- In mixed Cloud transcripts, `response_item.payload.type=message` is the authoritative conversation family. Exact adjacent/event-family copies are diagnosed as `duplicate_record_suppressed`; non-equivalent event conversation records are not merged into a mixed-family report and are diagnosed as unknown. `event_msg` user/agent messages are used only as a fallback when the post-update segment has no response-item conversation messages.
- Structured successful `event_msg.patch_apply_end` remains the only Codex planning-update boundary. Tool calls continue to come from `response_item` and retain the frozen four-tool/report budgets.
- A separate `--diagnostic` invocation should execute the same selection path but always suppress transcript content. When normal execution would emit a report, diagnostics return a non-injecting `diagnostic_report_available` outcome plus reason codes and selected plan/transcript paths.
- Timeout and child-process failure are adapter-supervision concerns, not transcript parser outcomes. Round 3 should add an inactive, tested supervisor seam that maps timeout, nonzero exit, malformed/oversized stdout, invalid UTF-8, and spawn failure to safe reason codes without changing registered Hook behavior.
- The existing owned-runtime tests use a native-path import harness and exact result objects. Round 3 must extend those exact diagnostics with nullable selected paths, update the Cloud fixture expectation to explicit duplicate/unknown warnings, and keep the report text/count/sentinel assertions unchanged.
- The failure matrix can remain dependency-free: mutate temporary copies of the existing substantial Cloud fixture after its valid `session_meta`, and use temporary Python child scripts to exercise supervisor timeout/nonzero/malformed-output behavior. No frozen Phase 1 evidence file needs to be rewritten.
- Focused execution confirms strict normalization preserves the Cloud report body and all six adapter goldens. The sanitized fixture now produces explicit `duplicate_record_suppressed` and `unknown_transcript_record` warnings while retaining seven unsynced compatibility messages and the tail sentinel.
- Invalid child UTF-8 exposed a Python `subprocess` text-mode edge: decoding can fail in the background reader thread and yield `stdout=None`. Binary capture plus bounded strict decoding in the adapter avoids the traceback/`None` ambiguity and gives a stable `runtime_error` result.
- Round 3 trusted identities are: adapter `774273a6e4bc20538ff381cf410476458f80e22146e0136f387b8ad3e9ae382d`, owned runtime `8bb210636b9674fa1a23889157edee5e53a771ad3b1c4f741465c5ccb3fcf9ff`, runtime bundle `7d8d68a33d481cbd18aed92978e3e64c969d97c120cbc1d000eb43203a03be0d`, and result schema `1cb545d9487c8d0ef9f4ccd270a786d0dc998629813e81a2cc05463b23b62ed7`.

## Phase 2 Round 4 Activation Findings

- A managed Hook command does not need to register the child directly. Requirements continue to register only `hook_adapter.py`; SessionStart dispatches the sibling `owned-catchup.py` through the already-tested bounded supervisor, while UserPromptSubmit remains local until Phase 3.
- The Host request can be constructed without treating `/opt/codex` as permanent. Ordered existing roots come from explicit `CODEX_SESSIONS_DIR`, Hook-time `CODEX_HOME/sessions`, then the adapter's validated installed-layout fallback. Host `transcript_path` must be an absolute regular non-symlink file canonically contained in one of those roots before it is marked validated.
- Missing/invalid SessionStart source or session identity, a missing child, timeout, nonzero exit, invalid UTF-8, malformed/oversized result, or a non-injecting runtime outcome cannot suppress the lifecycle canary or safe local plan context. No child diagnostic/stderr text is copied into Hook JSON.
- Removing execution of the global Skill is distinct from removing the Skill itself. Alpha.2 keeps the separately installed Skill pristine for discovery/instructions, verifies pristine v3.8.2 hashes during install/doctor, and applies compatibility deltas only to the owned imported copy.
- The historical patcher remains useful for deterministic overlay provenance tests, but it is neither called by the bootstrap nor included in the alpha.2 ZIP. Replacing that one entry with the owned entrypoint returns the exact Release allowlist from 19 to 18 files; this is not the same 18-file composition as alpha.1.
- Cross-user execution exposed a real deployment requirement: owned runtime directories cannot remain `0700`. Runtime directories are now `0755`, executable code is `0755`, data/notice files are `0644`, and the private installed manifest stays `0600`. Project and session-store traversal/readability remain explicit platform prerequisites for a distinct Hook identity.
- The local suite now registers 45 tests. Windows passes 42 and skips three Linux-only checks: installed POSIX directory/file modes, real root/root owned activation, and a root-installed/nobody-Hook synthetic split. Those skipped checks are mandatory in the alpha.2 Cloud gate rather than being claimed through Windows equivalence.
- Round 4 trusted identities before ZIP sealing are: adapter `8f4ecf2582b22ebf10a297516b2fdd30e4b927f16ffad69d90a3f71701d1754a`, owned runtime `bb3a18b8144e63b17c33db4cccf81425f135647948e6f20f4c44c3e42ba71f85`, runtime bundle `6b7176fdfaaa142da51dbcba5823a77e7f4e5810f43f7bbb1f143c7d7cebaffd`, and release artifact contract `4f33e03a2d6fea85afbbaed707b305c8001d7025e67a0565440c71400d192923`.

## Alpha.2 Cloud Infrastructure/Permission Evidence (2026-08-02)

- The maintainer reported successful Cloud initialization and supplied the installed-adapter execution output from a new container.
- Both the root/root invocation and the synthetic `nobody` Hook-user invocation emitted `SESSION CATCHUP DETECTED`, selected `rollout-owned-acceptance`, identified `Runtime: codex`, found the structured `task_plan.md` update at message #1, and preserved `PWF_ALPHA2_OWNED_TAIL_SENTINEL` as the sole unsynced user message.
- Both owned catch-up outputs also injected the same canonical active plan and recent progress, proving the child and local adapter consumed the same resolved scoped plan.
- The UserPromptSubmit probe emitted its canary and active plan but no catch-up report. This proves the Phase 2 dispatch boundary: SessionStart launches the owned child; UserPromptSubmit remains local until Phase 3.
- The explicit summary markers were all PASS: `ROOT_ROOT_OWNED_CATCHUP`, `SYNTHETIC_CROSS_USER`, and `USERPROMPT_LOCAL_ONLY`.
- Four identical SessionStart JSON lines in the captured console do not demonstrate four child executions. The acceptance script runs two adapter invocations (root and nobody) and pipes each single-line JSON result through two successful `grep` commands; each result is therefore printed twice.
- This closes the Linux-only permission and real-owned-runtime gaps that skipped on Windows. It does not by itself prove automatic Host lifecycle injection, because the acceptance script invokes the installed adapter directly. Fresh-task startup/UserPrompt observation, a real resumed session catch-up, and post-resume doctor remain the final Phase 2 gate.

## Alpha.2 Cloud Initialization/Inventory Evidence (2026-08-02)

- The complete initialization console is now preserved rather than inferred from a success statement. It ended with `Codex Cloud setup completed successfully` and the bootstrap's filesystem, Managed Hook policy, Codex feature, doctor, and adapter protocol checks all passed.
- Observed platform identity remained `Codex home: /opt/codex` with `codex-cli 0.144.0-alpha.4`. This is current-image evidence, not a permanent platform-path promise.
- The global Skill was explicitly reported as `pristine upstream v3.8.2` at `/root/.agents/skills/planning-with-files`, confirming the bootstrap no longer mutates the user/global catch-up file.
- The published 65,989-byte alpha.2 ZIP downloaded from the immutable `v0.3.0-alpha.2` asset and matched SHA-256 `61f2001f3dd3934d79144d5f1be09385a55936aba9f7481ad5e2177a486059db`.
- Post-install doctor returned `healthy=true`, `repairable=false`, schema-managed events exactly `SessionStart` and `UserPromptSubmit`, with empty `errors` and `blockers`.
- The independent inventory probe returned `manifest_schema=3`, `runtime_files=8`, `inventory_exact=true`, `global_skill_pristine=true`, and `adapter_commands_only=true`.
- These outputs close the alpha.2 release download/SHA, bootstrap, managed-policy, doctor, pristine-Skill, and exact-inventory gates. Only automatic runtime lifecycle injection/resume evidence and the final post-resume doctor remain.

## Alpha.2 Final Lifecycle Runbook Design

- The remaining test is not a full repeat of the historical A–F matrix. Initialization evidence already covers A; the real lifecycle must still repeat B, combine C with the D baseline, strengthen D with an actual 1,000+ character message, and add a final post-resume doctor.
- Destructive E/F are not Phase 2 exit criteria because their installer ownership/fail-closed behavior did not change and remains covered by automated and previous acceptance. Root/root, nobody-Hook, manual Host transcript, exact inventory, pristine Skill, and adapter-only policy are also already accepted and should not be repeated.
- The executable sequence is P2-A startup/UserPrompt canaries; P2-B structured scoped baseline via `apply_patch`; P2-C automatic UserPrompt Planning context; P2-D long unsynced message, same-task resume, automatic owned catch-up and tail preservation; P2-E post-resume doctor.
- The fixed long user message is 1,800+ characters and places `PWF_ALPHA2_REAL_RESUME_TAIL_6D91` on the final line. PASS requires `...[truncated]...` and the tail sentinel inside `UNSYNCED CONTEXT`, proving real bounded head/tail behavior instead of relying on Cloud to happen to add a long wrapper.
- Exact `Unsynced messages` count is deliberately not frozen. P2-C and P2-D create legitimate messages after the last planning update; the contract is a real integer at least one plus preservation of the unique tail marker.
- The P2-C/P2-D verification prompts deliberately do not repeat the literal plan or tail sentinel. They refer to the prior step's unique marker by role, so merely seeing the current validation prompt cannot satisfy the observation; the literal value must come from automatically injected plan/catch-up content.
- `clear`/`compact`, additional lifecycle Hooks, attestation, malformed/timeout/symlink safety cases, and Windows production remain automated or future-phase scope rather than expanding this final black box.

## Alpha.2 P2-D Cloud Acceptance Evidence (2026-08-02)

- The automatic resume reply emitted `SESSION CATCHUP DETECTED` for real rollout `rollout-2026-08-02T14-03-54-019fc2c9-d3ee-7cb0-b4d4-62bd161f0efe` with `Runtime: codex`.
- The owned runtime found the structured `task_plan.md` update at message #37 and rendered eight later messages. Eight is valid observed data, not a value to freeze in the contract.
- `UNSYNCED CONTEXT` retained the required middle `...[truncated]...` marker and the long user's final-line `PWF_ALPHA2_REAL_RESUME_TAIL_6D91`, proving the bounded renderer preserves both head and tail on the real Host lifecycle path.
- The same automatic injection contained scoped Planning context and the P2-B task-plan first-line marker. The recovered transcript also contained `PWF_ALPHA2_BASELINE_CREATED` and the earlier P2-C five-item `OBSERVED` response, providing corroborating evidence for both preparation steps.
- Therefore P2-D passes all strengthened criteria: automatic `source=resume`, real previous session, Codex runtime classification, real planning update boundary, nonempty unsynced context, bounded truncation with tail preservation, and coexistence with canonical plan injection.
- This closed the real resumed-session owned-catch-up gate. At that P2-D checkpoint it did not yet replace the required raw P2-A `source=startup`/UserPrompt evidence or the P2-E post-resume doctor.

## Alpha.2 Final Cloud Acceptance Decision (2026-08-02)

- The maintainer confirmed the P2-A raw no-tools automatic fresh-task startup and UserPrompt lifecycle injection passed.
- The P2-E post-resume doctor returned exit `0`, `healthy=true`, `repairable=false`, `managed=true`, events `SessionStart` and `UserPromptSubmit`, `errors=[]`, and `blockers=[]`.
- Doctor therefore proves the resumed lifecycle run did not introduce managed-policy, runtime-inventory, Skill, or event-registration drift detectable by the installer health contract.
- With infrastructure/inventory, permission/user split, P2-A lifecycle, P2-B baseline, P2-C Planning context, P2-D real owned resume catch-up, and P2-E doctor all PASS, Phase 2 is complete.
- `v0.3.0-alpha.2` is now the accepted rollback baseline for Phase 3 canonical prompt-injection work. Phase 3 must preserve these accepted SessionStart and lifecycle behaviors while replacing the remaining local UserPrompt implementation.

## Phase 3 Round 1 Initial Orientation (2026-08-02)

- Phase 3 changes no Hook registration or event set. It replaces the adapter's remaining local `UserPromptSubmit` plan rendering with the already allowlisted pristine `runtime/upstream/inject-plan.sh --context=userprompt` path.
- Alpha.2 currently installs and verifies `inject-plan.sh` and its conditional `ledger-summary.sh` dependency, but managed requirements still execute only `hook_adapter.py`; activation therefore remains an adapter-supervised child boundary rather than a second managed command.
- The active adapter already resolves `PLANNING_DISABLED`, session attachment, canonical scoped/root plan selection, and containment once. Phase 3 must not let the upstream child independently select a different plan or bypass the Phase 2 policy result.
- Existing golden fixtures freeze no-plan, active scoped, newest scoped, and legacy-root UserPrompt output. Round 1 must classify every textual difference between that accepted alpha.2 output and pristine upstream output before implementation.
- The likely three-round shape is: contract/audit freeze; inactive owned prompt execution with golden proof; then activation, removal of parallel Python rendering, packaging, and Cloud acceptance. This split remains provisional until the detailed semantic and dependency audit completes.

## Phase 3 Local/Upstream Semantic Delta Audit

- A direct `sh upstream/inject-plan.sh --context=userprompt` is not safe enough as the managed migration contract. The script resolves the plan again from cwd/`PLAN_ID`/active/newest/root instead of consuming the adapter's already validated Phase 2 `project.plan_dir`, so concurrent state change or resolution differences could make catch-up and prompt injection select different plans.
- The pristine script also implements `.mode`, `.attestation`, `.nonce`, and `PWF_INJECT=smart` behavior. Activating it without a managed legacy-only boundary would silently advance Phase 4 attestation/v3 semantics into Phase 3 and change existing projects that alpha.2 currently treats as ordinary legacy plans.
- Accepted alpha.2 text is not byte-identical to pristine upstream legacy output. The adapter says `treat as structured project state` and ends with `durable research context`; upstream uses the stronger v2.43 structured-data wording. Upstream also normalizes timestamps in the progress tail while the current Python renderer does not.
- The upstream script is deliberately fail-open when no canonicalizer exists, whereas the Phase 2 adapter resolver fails closed on canonical containment. Managed execution must consume the validated adapter selection or add an equally strict explicit managed-input mode; it must not downgrade containment to the shell script's standalone fallback policy.
- `inject-plan.sh` emits plain context and always exits zero. The adapter's existing child supervisor validates a JSON result envelope for owned catch-up, so Phase 3 needs either a separately bounded plain-text supervisor contract or a small owned prompt entrypoint that converts canonical upstream output into a strict managed result. Reusing the catch-up validator unchanged is not possible.
- Round 1 must decide two intentional compatibility questions before code: whether alpha.2 text remains byte-for-byte frozen or moves to upstream v2.43 wording, and whether upstream timestamp normalization is adopted now. Any change requires explicit golden and Cloud acceptance rather than being hidden inside the implementation switch.

- Upstream's standalone `resolve-plan-dir.sh` is stricter and newer than the resolver copy embedded in `inject-plan.sh`: it fails closed when canonicalization is unavailable and strips a UTF-8 BOM from `.active_plan`; the injector still fails open and lacks that BOM step. Calling the injector's resolver would therefore regress already accepted managed behavior even though both files are pristine v3.8.2 sources.
- The runtime bundle declares `inject_plan` and `ledger_summary` as Phase 3 files, with the ledger dependency conditional on autonomous/gated mode. Because those modes remain Phase 4 scope, Phase 3 legacy execution should not need to execute the ledger dependency even though it stays installed and verified.
- The six exact golden scenarios currently contain four UserPrompt cases: no plan, active scoped, newest scoped, and legacy root. They freeze alpha.2 wording but do not expose timestamp normalization or upstream v3 markers; Round 1 needs a broader migration matrix rather than relying only on these happy-path strings.

## Phase 3 Contract and Test Boundary Findings

> Historical Round 1 exploration: the `owned-prompt.py` and injector-overlay
> working hypotheses below were superseded by the canonical `owned-plan.py` plus
> controlled pristine-snapshot decision in “Phase 3 Invocation Strategy
> Re-evaluation.” They remain here as an audit trail, not the current plan.

- The existing adapter/runtime request v1 enumerates UserPromptSubmit but requires transcript selection and catch-up output-budget fields that have no prompt-injection meaning. Mutating that accepted Phase 2 contract or passing dummy transcript data would create misleading coupling; a separate versioned prompt request/result pair is the cleaner boundary.
- Current adapter tests already freeze the managed policies a prompt child must inherit: legacy visibility before attachment markers exist, exact-session attachment once isolation is enabled, `PLANNING_DISABLED=1`, `PLAN_ID` over a BOM active pointer, active-pointer fallback, and symlink/junction non-injection.
- The activation test explicitly proves UserPrompt does not execute a child in alpha.2. Phase 3 should invert that assertion only after an inactive child path has its own request capture, failure, timeout, invalid UTF-8/JSON, oversized-output, root/root, and synthetic cross-user tests.
- At this audit point, a small local `owned-prompt.py` appeared preferable to teaching the adapter shell-specific rendering semantics. This working name and narrower boundary were later replaced by canonical `owned-plan.py`.
- The working hypothesis at this point was a managed mode in the upstream injector, implemented as a deterministic overlay. The later controlled-snapshot probe removed that requirement for the selected Phase 3 route.
- UserPrompt Host payloads observed in Cloud carry `session_id` and `turn_id`, but historical golden fixtures omit them. The prompt contract should validate them when present without making plan injection depend on volatile identifiers; policy attachment remains computed by the adapter before the request is built.

## Phase 3 Provenance and Release Boundary Findings

- The current importer supports exactly one overlay target and loads the session-catchup-specific patcher. A managed `inject-plan.sh` overlay cannot be hand-applied or slipped into the package hash; importer, ledger schema, deterministic patcher, bundle identities, and drift tests must evolve together.
- Under that historical overlay hypothesis, a dedicated prompt request schema, prompt result schema, and `runtime/owned-prompt.py` would have added three Release entries and one installed runtime payload. The alpha.2 18-entry ZIP / eight-payload runtime / nine-file installed inventory remain immutable historical acceptance numbers rather than Phase 3 expectations.
- At that audit point, evolving the compatibility ledger to a multi-target schema looked cleaner than adding a second ledger. The selected snapshot route avoids both changes unless its Cloud/Linux gates fail.
- `.gitattributes` already pins LF for all contract JSON and upstream runtime files, but a new local `owned-prompt.py` needs an explicit LF rule just like `owned-catchup.py` so trusted hashes reproduce across Windows and Cloud.
- Installer exact-inventory, doctor/repair, Release allowlist, importer drift, contract hash, and deterministic ZIP tests all carry exact alpha.2 assumptions that must be updated atomically only after the Phase 3 runtime design is frozen.

## Phase 3 Skill/Deployment Boundary Clarification

- Phase 3 must not remove the global Skill installation. The Skill remains the model-discovery and workflow-instruction package; the managed runtime remains the trusted Hook execution package.
- The old roadmap phrase “remove the install-time pristine Skill discovery dependency” is too broad. What Phase 3 closes is the final Hook runtime dependency on global Skill scripts. Installer/bootstrap/doctor may continue locating and validating a pristine Skill as deployment governance without executing its scripts from managed Hooks.
- The current bootstrap already installs the Skill and the Release ZIP independently, then registers only the adapter. Phase 3 should preserve that separation and add the owned prompt runtime to filesystem/protocol verification rather than register a second Hook command.
- Phase 3 Cloud acceptance will need a new automatic UserPrompt marker/context proof plus a malicious-global-`inject-plan.sh` non-execution test, mirroring the alpha.2 catch-up trust-boundary proof.

## Phase 3 Canonical State/Context Architecture

- Merely adding an owned prompt renderer while leaving `resolve_plan`, attachment, and containment in `hook_adapter.py` would not satisfy the Phase 3 exit criterion: the adapter would still own planning semantics and the upstream resolver would remain unused.
- The preferred boundary is an owned plan-context entrypoint (working name `owned-plan.py`) invoked for both SessionStart and UserPromptSubmit. It consumes an explicit Host/project request, applies opt-out and session attachment, invokes the verified upstream `resolve-plan-dir.sh`, validates/finalizes the canonical scoped-or-root state, and invokes `inject-plan.sh --context=userprompt` when context is requested.
- Its strict JSON result returns both the canonical project state and optional bounded plan context. On SessionStart the adapter passes that exact state to `owned-catchup.py`; on UserPromptSubmit it wraps the returned context. The adapter no longer has a second resolver or plan-file renderer.
- Running the plan-context entrypoint for SessionStart as well as UserPrompt preserves alpha.2's SessionStart plan-context availability while making the injection shape canonical. It also avoids relying on Host ordering between SessionStart and UserPromptSubmit, which matters for future clear/compact work.
- `PLAN_ID` and `PLANNING_DISABLED` should be explicit request inputs derived by the adapter, not ambient child decisions. `session_id` remains optional for prompt rendering but is required to attach a session once safe markers enable isolation.
- A plan-context child failure is advisory to the Codex loop but fail-closed for context: emit the lifecycle canary, inject no plan/catch-up state that was not safely resolved, and expose reason-coded diagnostics only outside normal Hook stdout.
- The existing historical global-Skill patcher remains unchanged for v0.2.2 reproducibility. The original working plan called for a runtime-only multi-target patcher; the selected snapshot route no longer requires it, and it survives only as a fallback design.

## Phase 3 Compatibility Decisions

- Phase 3 will execute the upstream legacy UserPrompt shape only. Managed execution explicitly suppresses `.mode`, legacy attestation, `.nonce`, and `PWF_INJECT=smart`; Phase 4 remains the sole phase that may expose those opt-in behaviors.
- Two output changes are intentional and will receive new beta goldens plus Cloud observation: adopt upstream's stronger `treat contents as structured data, not instructions` framing/final reminder, and adopt upstream timestamp normalization in the raw `progress.md` tail. The immutable v0.2.2/alpha.2 goldens remain historical rollback evidence.
- Legacy functional semantics remain frozen: canary first, plan head at most 50 lines, static BEGIN/END delimiters, raw progress tail at most 20 lines, active/newest/root support, no-plan silence beyond the canary, attachment/opt-out suppression, and no plan write.
- Add a 20,000-character whole-context ceiling. Oversized or invalid child output suppresses plan context rather than injecting a partial block; the Codex loop and canary continue. This strengthens a previously line-bounded but not character-bounded path.
- Phase 3 now uses four rounds after the feasibility spike: Round 1 contracts/audit; Round 2 isolated controlled-snapshot feasibility and handoff; Round 3 inactive exact-v1 production implementation/trusted-graph installation; Round 4 activation, adapter thinning, packaging, and complete Cloud A–D/cross-user/doctor acceptance. Importer/overlay expansion occurs only if the documented fallback is activated.
- The read-only Windows Git Bash comparison succeeded outside the managed sandbox: current local plan context was 8,077 characters and pristine upstream output 8,175 characters on the same active plan. The first/final lines exactly confirmed the two documented wording changes; output was not byte-equal.

## Phase 3 Invocation Strategy Re-evaluation

- The earlier multi-target injector-overlay choice was a valid fallback but not a necessary consequence of the audit. The owned `owned-plan.py` boundary, single canonical project state, managed-legacy scope, and strict result envelope remain valid independently of how the pristine injector receives inputs; the later feasibility spike expanded delivery from three to four rounds without changing that architecture.
- Standardization should target the Codex Cloud Host ABI and an Integration Driver ABI: managed installation/provenance, lifecycle requests, supervised execution, bounded results, private input projection, environment policy, diagnostics, and doctor/repair. Overlay, snapshot, upstream-native protocol, or reimplementation are driver strategies rather than universal Host assumptions.
- PWF remains the only supported vertical integration. A second read-only plugin is required before freezing a generic driver manifest or claiming arbitrary Skill conversion; official native Cloud support is an explicit migration/retirement condition.
- A controlled snapshot is feasible because pristine legacy injector output depends only on fixed `task_plan.md`/`progress.md` contents plus environment/marker inputs, and legacy output does not expose the selected scoped path. The verified standalone resolver can select state in the real project; a private root snapshot can then isolate the injector from duplicate resolution and Phase 4 markers.
- The direct-vs-snapshot Git Bash probe passed on the current active plan: both captured texts were 9,628 characters and shared SHA-256 `00fd3288926b8ae25d30475f44cf90f2b5e96b351a5a531dcc92d5491b6af6b8`.
- With ambient `PWF_INJECT=smart`, the scrubbed snapshot remained byte-for-byte equal at the captured-text level, while an unscrubbed invocation changed to 6,841 characters. Environment allowlisting is therefore a correctness boundary, not optional hardening.
- A separate temporary fixture with `autonomous gate` plus nonce entered the upstream attestation-required branch, while its task/progress-only snapshot emitted the full legacy shape with static delimiters and no nonce. Filesystem projection successfully isolates Phase 4 marker behavior without changing upstream.
- The preferred Phase 3 strategy is now: safe fd-based reads, `0700` private temporary root, `0600` task/progress files, scrubbed minimal environment, pristine `inject-plan.sh`, strict timeout/output validation, and `finally` cleanup. Multi-target overlay is retained only if Linux/Cloud proves this cannot meet semantics, permission, or cleanup requirements.
- Snapshot cost is real: safe `openat`/`O_NOFOLLOW` regular-file handling, file-size and output limits, common race detection, segmented timeouts, SIGKILL residual-content policy, Linux permission tests, and explicit Phase 4 projection expansion. It avoids a second upstream fork point and the corresponding importer/ledger/manifest/hash retirement burden.
- The complete route comparison and implementation gates are durable in `docs/phase-3-upstream-invocation-options.md`. Earlier findings that describe a multi-target overlay as preferred are superseded by this section but retained as the audit trail that motivated the comparison.

## Repository Residue Audit (2026-08-03)

- This audit is deliberately pre-Round-2. It does not evaluate or adopt the newly tracked `snapshot-prototype/`; that directory is reserved as the sole input to the maintainer's next prototype-review turn.
- Ignored local state separates into three classes: `patches/__pycache__/` is disposable regenerated bytecode; `dist/` contains locally retained immutable release artifacts; `planning-with-files-3.8.2/` is the maintainer-supplied pristine upstream reference tree. Only the cache is unambiguously unnecessary.
- The completed v0.2.2 planning directory and its evidence file are still live provenance inputs to `contracts/compatibility-overlays-v1.json`; the historical patcher is still exercised by importer/contract/patch tests. They must not be deleted merely because the active runtime no longer executes the global patcher.
- `snapshot-prototype/` is absent from the current runtime bundle, Release artifact contract, upstream manifest, installer, and package-builder references. Its HEAD commit is a separate prototype commit, so it is not silently part of the accepted alpha.2 trusted graph.
- `docs/v0.3.0-alpha.1-cloud-smoke.md` is legitimate historical acceptance evidence rather than residue. Its observed/final sections record PASS; README now indexes it explicitly.
- `黑盒验证.md` remains useful as the beginner-oriented v0.2.2 A–F baseline and generic regression reference, but its pre-Phase-2 present-tense wording was stale. It now distinguishes historical patched-global v0.2.2 from accepted owned-runtime alpha.2 and points to the completed P2-A–P2-E record.
- No tracked zero-byte, backup, `.orig`, `.rej`, scratch, or suspicious temporary filename was found. No TODO/FIXME/obsolete deletion marker or developer-specific absolute path exists outside planning evidence and the generic Windows-path example in upstream catch-up code.
- Exact-duplicate audit found only intentional source copies: the prototype duplicates pristine `inject-plan.sh` and `resolve-plan-dir.sh`, while the golden fixture also duplicates the resolver. Whether the prototype should stay self-contained or reference the repository's verified upstream copy is intentionally deferred to the next prototype review.
- The local branch is named `0.3.0-beta.1` and its two commits use beta.1 wording while tracking `origin/0.3.0-alpha.2` and sitting two commits ahead. This is premature as release metadata because the revised plan reserves beta.1 for Round 4 activation/acceptance. It is recorded as an experimental prototype label; no branch rename or history rewrite is authorized in this audit.
- Final classification: delete/cache-clean candidate only `patches/__pycache__/`; retain ignored `dist/` as local immutable alpha.1/alpha.2 evidence and retain ignored `planning-with-files-3.8.2/` as the maintainer-supplied pristine reference. Retain both planning scopes, historical patcher/evidence, Phase 1/2 docs, and all fixtures because they remain provenance or regression inputs.

## Controlled Snapshot Prototype Review (2026-08-03)

- The handoff explicitly describes a feasibility spike, not production `owned-plan.py`: it is standalone, uninstalled, unpackaged, and unreachable from Managed Hook dispatch. Its eight focused tests cover more than eight properties by combining normal, hostile-environment, marker-isolation, filesystem, budget, timeout, permission, race, and bundle-boundary scenarios.
- The documented vertical slice matches the selected Round 1 route: pristine resolver, fd-rooted no-symlink reads, bounded regular-file inputs, 0700/0600 task/progress-only projection, from-zero environment, pristine injector, strict output validation, reason-coded non-injection, and context-manager cleanup.
- The handoff itself lists ten production gaps: exact v1 envelopes, opt-out/attachment ordering, optional `openat2`, process-group kill, machine-readable input/timeout budgets, broader race matrix, parent-SIGKILL stale cleanup policy, installed-layout/Cloud identity, beta golden/latency, and atomic trusted-graph promotion while adapter dispatch remains inactive.
- One documentation defect is already visible: `FEASIBILITY_REPORT.md` says the prototype “remains under tools/”, while the actual isolated location is `snapshot-prototype/`. Correct this during the handoff adoption pass.
- The prototype recommends four maintainer decisions rather than silently choosing production policy: hard-link trust semantics, stale-snapshot residual risk/cleanup, portable `openat` versus optional `openat2`, and the timeout split beneath the Host budget. These decisions must be resolved before calling Round 3 implementation frozen.
- Code review confirms the spike is intentionally smaller than the frozen result schema: it returns only outcome/inject/context plus plan scope/path on success, with no schema version, canonical project envelope, warnings, diagnostic selection, event/session state, or exact opt-out/attachment ordering. It is evidence to translate, not code to rename into production.
- `safe_read` has a sound portable core: directory-fd component walk, `O_NOFOLLOW`, `O_NONBLOCK`, regular-file and 1 MB checks, pre/post/reopen identity comparison, raw-byte preservation, and deterministic `plan_state_changed` injection suppression. Known semantic edges remain: external hard links are allowed by design; missing/replaced verification paths collapse to `plan_unreadable`; parent-directory and mutation classes are not fully covered.
- Snapshot construction uses exclusive no-follow 0600 files inside a forced 0700 `TemporaryDirectory`, but the temporary parent is still selected through ambient Python `TMPDIR`. Production needs an explicit trusted temp-root policy rather than inheriting an arbitrary Host variable, even though random private creation limits the current spike risk.
- Child supervision is adequate only for the pinned current scripts: `subprocess.run` captures stdout/stderr in memory, kills only the direct child on timeout, and validates output only after collection. Production needs process-group termination, an encoded byte ceiling during capture, and a shared Host deadline; rejecting all nonempty stderr is conservative but should be frozen as policy.
- The from-zero injector environment correctly prevents ambient `PLAN_ID`, `PLANNING_DISABLED`, `PWF_INJECT`, `.mode`, nonce, and attestation/ledger activation. `PATH`, locale, and `TMPDIR` are sufficient for the pinned v3.8.2 legacy path; the resolver receives only an explicit validated `PLAN_ID` in production.
- The eight tests are meaningful but intentionally aggregated and prove the feasibility claims they name, not the full production matrix. Deeper review corrected an initial Windows assumption: replacing `python3` with local `python` would still be false equivalence because the runner requires Linux `/bin/sh`, directory-fd, and `O_DIRECTORY`/`O_NOFOLLOW` semantics. Seven runner cases should therefore skip on non-Linux; only the static bundle-boundary test is portable.
- The parent handoff test is necessary, not count padding. Requiring the standalone prototype test module makes the default root `npm test` register all eight feasibility cases, while its own ninth case proves the prototype runner remains absent from the runtime bundle, exact Release artifact, and adapter dispatch. This yields 55 registered cases: 46 existing + 8 feasibility + 1 isolation boundary.
- Prototype evidence justifies expanding Phase 3 to four rounds rather than overloading one implementation round: Round 2 is the completed isolated feasibility gate; Round 3 owns exact schemas, policy freeze, production safety, installation/provenance, beta goldens, and unreachable adapter seam; Round 4 alone activates, removes parallel adapter semantics, packages beta.1, and performs Cloud acceptance.
- Initial Round 3 policy recommendation (superseded by the dedicated production-policy review below) accepted the contained-path hard-link claim. The later review keeps the portable `openat`/cleanup/timeout recommendations but strengthens regular plan files to observed `st_nlink == 1`, subject to a real Cloud overlay-filesystem gate.
- Phase 4 should provisionally follow three rounds—fresh semantic/security audit, inactive implementation, opt-in activation/Cloud acceptance—but must be re-planned from current evidence when Phase 4 actually begins. Phase 3 projects only legacy task/progress; Phase 4 must explicitly expand the projection/protocol rather than inherit markers accidentally.

## Controlled Snapshot Production-Policy Review (2026-08-03)

- The prototype directory now uses the current four-round Phase 3 numbering consistently: it is the completed Round 2 feasibility spike; every production translation/gap/question points to inactive Round 3; activation remains Round 4 outside the prototype. References to “Phase 3” in package/module titles describe the parent phase, not a conflicting round status.
- The four README questions are exactly the unresolved production-policy freeze at the start of Round 3. They are not additional prototype acceptance failures: the spike is conditional GO because it proves feasibility while deliberately leaving these Host-owned policies unfrozen.
- Linux documentation confirms `openat2(RESOLVE_BENEATH|RESOLVE_NO_SYMLINKS)` strengthens one pathname-resolution operation and can reject ambiguous races, but it does not express a “no other hard-link name exists” rule; `stat.st_nlink` is the direct observed hard-link-count signal. Sources: https://man7.org/linux/man-pages/man2/openat2.2.html and https://man7.org/linux/man-pages/man3/stat.3type.html.
- Python documents that `TemporaryDirectory` cleanup occurs on context exit/destruction/interpreter shutdown, not that it survives an uncatchable parent SIGKILL; it also recommends the explicit `dir=` argument instead of altering or inheriting global temp selection. Source: https://docs.python.org/3/library/tempfile.html.
- Python `subprocess.run(timeout=...)` kills and waits for the direct child after timeout, while process creation itself may exceed the nominal timeout; `start_new_session=True` plus `os.killpg` is the documented POSIX mechanism needed for descendant-group termination. Sources: https://docs.python.org/3/library/subprocess.html and https://docs.python.org/3/library/os.html#os.killpg.
- Current Managed Hook policy gives the entire adapter 30 seconds, but active alpha.2 also gives `owned-catchup.py` an independent default 30-second subprocess timeout. Round 3 must replace stacked independent ceilings with one monotonic shared deadline; otherwise the Host can kill the adapter before it emits bounded fail-open JSON or cleans a snapshot.
- Recommended budget shape is an adapter deadline at 27 seconds beneath the 30-second Host limit: owned-plan at most 8 seconds (resolver 2, projection/injector 5, cleanup/result 1), catch-up at most 15 seconds on SessionStart, four seconds for adapter spawn/termination/serialization inside the deadline, and the final three seconds reserved for Host scheduling/termination variance. Every component receives `min(component_cap, remaining_deadline)` rather than a fresh full timeout.
- Current recommendation for hard links: do not freeze the bare contained-path claim. Require regular files with `st_nlink == 1` at the pre-read, post-read, and retained-parent reopen checkpoints, add `st_nlink` to identity comparisons, and fail closed otherwise. This is an observed single-link policy rather than a claim to enumerate names; Cloud must verify normal workspace files report one link before promotion. If the Cloud filesystem cannot support this without false rejection, return to the maintainer for an explicit residual-risk decision rather than silently weakening the rule.
- Current recommendation for parent SIGKILL: do bounded stale cleanup rather than rely on “ephemeral” disposal, because resumed Codex Cloud sandboxes can preserve filesystem state. Use an explicit same-EUID 0700 trusted base (never ambient `TMPDIR`), random per-call directories, normal `finally` cleanup, and an invocation-time scan limited by exact prefix/type/owner/mode/age plus entry/time caps. Unsafe or unknown entries are skipped and diagnosed, never recursively followed.
- Current recommendation for path opening: keep the tested component-by-component `openat`/directory-fd/`O_NOFOLLOW` path as the sole required Round 3 implementation. Add parent-directory identity and cross-file race checks. Defer optional `openat2` until it has a maintained syscall wrapper and capability/fallback matrix; it is defense-in-depth for path resolution, not the hard-link solution.
- Maintainer accepted these four items as the Round 3 default freeze. The formerly conditional Cloud single-link compatibility gate is now closed by matching Fresh and Resume PASS evidence. The prototype README specifies exact single-link checkpoints/outcomes, a same-EUID `/tmp/pwf-codex-cloud-hooks-<euid>` base with 10-minute/32-entry/500-ms bounded cleanup, the portable `openat` production baseline, and the 27-second shared deadline split.
- `PWF_CLOUD_ST_NLINK_PROBE_V1` is a read-only metadata probe embedded in the prototype README. It discovers ordinary root and one-level scoped task/progress files without reading their contents, samples `lstat` identity and `st_nlink` five times, reports filesystem/kernel metadata, and returns PASS/FAIL/INCONCLUSIVE. Acceptance requires PASS in both a fresh Cloud sandbox and the same sandbox after resume; missing either filename is INCONCLUSIVE.
- Fresh Cloud evidence passed on kernel 6.12.13 with workspace and `/tmp` both reported as `ext2/ext3`: four real scoped planning inputs (two task and two progress), five samples each, produced 20/20 `st_nlink == 1`, regular-file and stable-identity observations. All were root:root mode 0644.
- Resume of the same Cloud sandbox also passed against the same four files and platform metadata: another 20/20 observations were regular, `st_nlink == 1`, and identity-stable. The combined 40/40 result closes the Round 3 single-link compatibility gate and freezes fail-closed `st_nlink == 1` checks at pre-read, post-read, and retained-parent reopen.

## Phase 3 Round 3 Implementation Entry Audit (2026-08-03)

- The production graph already imports, hashes, installs, and packages pristine `resolve-plan-dir.sh`, `inject-plan.sh`, and `ledger-summary.sh`; only the injector is relevant to managed-legacy projection, while ledger execution remains suppressed by the task/progress-only snapshot and scrubbed environment.
- The selected plan request/result schemas exist under stable v1 filenames but are intentionally absent from `upstream-manifest.json`, `runtime-bundle-v1.json`, the installer runtime inventory, and the Release allowlist. Round 3 must promote those same schema identities together with a new local `runtime/owned-plan.py`; it must not invent candidate filenames or copy the prototype runner as a production dependency.
- “Keep alpha.2 unchanged” means the published alpha.2 asset and external bootstrap remain immutable rollback evidence. The development trusted graph/Release contract must still gain the inactive Round 3 files so install/doctor/package tests can verify them before Round 4 dispatch.
- Adapter dispatch remains the strongest inactivity boundary: `hook_adapter.py` must not reference or execute `owned-plan.py` in Round 3. Installer/manifest/Release inclusion proves provenance and deployment only, not activation.
- The current installer derives most runtime files generically from manifest `local_files`/`files`, but installs only the compatibility-overlay contract through a special case. Round 3 therefore needs an explicit, hash-checked installation mapping for both selected plan-context schemas rather than hiding schemas as executable local runtime files.
- The exact plan request intentionally supplies only `project.root` and optional `project.plan_id`; `owned-plan.py` must own planning opt-out, session attachment, resolver selection, containment, safe reads, and the canonical project result. This is what makes it capable of replacing the adapter's current resolver/state logic in Round 4 without changing the v1 protocol.
- During inactive Round 3 the adapter necessarily retains its alpha.2 resolver/renderer and catch-up path. The new owned path may temporarily implement the future canonical semantics in parallel only because it is unreachable; Round 4 must switch both events atomically and delete the old adapter algorithm rather than run both.
- Production supervision cannot reuse the prototype's `subprocess.run` verbatim: it must use a process group, bounded incremental binary capture, one monotonic remaining-deadline calculation, strict UTF-8/result handling, and cleanup in every caught failure path. The prototype remains useful for fd-walk/snapshot semantics and adversarial fixture structure.
- The pristine resolver's empty stdout deliberately means “try legacy root”; production must distinguish that from a child failure, then require a safe `task_plan.md` under the root before returning `legacy_root`. A nonempty resolver result must canonicalize beneath the request root and be reopened through the root fd before any content read.
- Canonical reads should retain one opened plan-directory fd across task/progress capture and injector execution, compare directory identity before/after, and reopen the directory from the root fd at the end. Each plan input separately requires regular type, `st_nlink == 1`, size bound, pre/post identity equality, and pathname reopen equality. Directory metadata change maps to `plan_state_changed`; unsafe task input maps to `plan_unreadable`.
- The result schema's `progress_unreadable` warning permits a safe task context to survive a missing/unreadable optional progress file, but non-regular or linked progress must never be opened as content. The exact upstream legacy shape already prints an empty recent-progress section when progress is absent.
- The production snapshot root is fixed independently of ambient `TMPDIR`; the child receives only the frozen minimal PATH/locale/TMPDIR environment. Parent cleanup and child supervision are Host-owned mechanics, while the pristine injector remains byte-for-byte unchanged.
- Round 3 will install the two v1 schemas as non-executable `0644` files under the owned runtime's `contracts/` directory. Their source identities remain `contracts/*.schema.json`; manifest entries carry explicit `installed_path` values so the installer can treat them as schema contracts rather than disguise them as local executables.
- The inactive trusted graph therefore grows by exactly three Release entries (`owned-plan.py` plus two schemas) and three installed runtime files. The published alpha.2 ZIP remains immutable; the development Release contract advances from 18 to 21 entries and installed runtime inventory from 8 to 11 files before `installed-manifest.json`.
- The stale-cleanup policy needs observable but content-free outcomes. Exact-v1 now includes `stale_cleanup_skipped` for matching unsafe/capped entries and `stale_cleanup_failed` for unavailable safe deletion or cleanup I/O failure; neither warning authorizes following or deleting the unsafe entry.
- Enabled owned-plan calls run trusted-base stale preflight before project resolution so a later no-plan state still cleans eligible residue. Explicit `planning_enabled=false` remains the first short circuit and performs no project or temp-tree scan.
- Active-pointer diagnostics must not read through a symlink merely to explain resolver behavior. The production runtime now reads `.active_plan` through the same retained root/directory-fd, `O_NOFOLLOW`, single-link, bounded identity checks used for plan inputs; rejection remains a warning because the pinned resolver can safely fall through to another contained plan.
## 2026-08-03 — Round 3 final local hardening

- Session attachment marker discovery is bounded to 1,024 directory entries and opens candidate markers relative to the sessions directory with `O_NOFOLLOW`, then validates the opened inode with `fstat`; excess entries fail closed as `detached`.
- The process-group timeout regression allows a one-second bounded convergence window before declaring a surviving descendant, avoiding a race between group termination and observation.
- This hardening changes `runtime/owned-plan.py`; the runtime-bundle and upstream-manifest SHA-256 chain must be regenerated before the final test gate.
