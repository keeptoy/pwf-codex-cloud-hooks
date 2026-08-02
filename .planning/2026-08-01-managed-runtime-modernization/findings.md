# Findings & Decisions: Managed Runtime Modernization

## Requirements
- Confirm whether repository behavior and README claims are synchronized.
- Explain the meaning of the current twenty-five tests, while preserving historical nine-, twelve-, thirteen-, and sixteen-test snapshots and without equating test cases to product features.
- Persist the agreed modernization design so it survives context compaction, clear, resume, and later sessions.
- Keep future work staged, auditable, reversible, and compatible with the current Cloud deployment.
- Incorporate the v0.2.2 Cloud catch-up investigation as design evidence rather than leaving its patch as an isolated release workaround.
- Give every downstream compatibility delta a retirement condition so the managed runtime converges toward upstream instead of accumulating a fork.

> The repository-audit sections below describe the historical v0.2.1 baseline that
> produced this roadmap. The current accepted implementation and Cloud evidence
> are recorded in the v0.2.2 evidence section later in this file.

Current release/iteration boundary as of 2026-08-02:
- `v0.2.2` is published and Cloud validated; Release ZIP SHA-256 is `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84`.
- `v0.3.0` is the active unpublished modernization worktree. Its bootstrap intentionally uses the all-zero archive checksum placeholder until final packaging.

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

The suite now has twenty-five Node test cases. Cases 1–9 are the original audit inventory, cases 10–12 were added with the v0.2.2 Cloud compatibility work, case 13 froze Phase 1 Round 1, cases 14–16 implement the Round 2 importer boundary, and cases 17–25 close Round 3:

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
25. The Release ZIP is deterministic, contains exactly 18 allowlisted entries with fixed metadata/modes, and excludes the external bootstrap.

These are twenty-five test cases, not twenty-five atomic features. Cases 6–8, 10–16, and 23–25 each cover several behaviors, while some product claims share one test or are verified by static inspection rather than a standalone test. Historical progress entries reporting nine, twelve, thirteen, or sixteen passing tests remain dated audit evidence, not the current suite count.

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
- Confirmed version/release boundaries remain coherent: package and development bootstrap are v0.3.0, the bootstrap checksum is intentionally all zero until packaging, and v0.2.2 plus its recorded SHA remains the published rollback baseline.
- Phase 1 remains pending; this regression changed documentation and planning context only, not installed Hook behavior.

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
