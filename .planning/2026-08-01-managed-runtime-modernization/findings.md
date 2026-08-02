# Findings & Decisions: Managed Runtime Modernization

## Requirements
- Confirm whether repository behavior and README claims are synchronized.
- Explain the meaning of the current nine tests without equating test cases to product features.
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

## Test Interpretation

The suite has nine Node test cases:

1. `SessionStart` emits scoped plan context and a source canary.
2. `UserPromptSubmit` emits plan/progress context and a canary.
3. A project without planning files emits only the event canary.
4. Installer dry-run is read-only and reports exactly two events.
5. An incompatible existing `managed_dir` fails closed.
6. Managed install preserves unrelated config, is idempotent, passes doctor, and uninstalls only owned state.
7. Repair restores an owned adapter or managed-definition drift.
8. Repair refuses unowned requirements, manifest ownership, and unknown runtime drift.
9. Installation backups can restore all pre-existing managed files byte-for-byte.

These are nine test cases, not nine atomic features. Cases 6–8 each cover several behaviors, while some product claims share one test or are verified by static inspection rather than a standalone test.

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
- The observed install and Hook users were both root. That sample rules out a user mismatch only for that environment; it does not prove a general cross-user deployment contract.

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

## Resources
- Local README and installer implementation.
- Local upstream pin: `OthmanAdi/planning-with-files` release `v3.8.2`, commit `b04ffd9c8f9f93919649d197e5d4ec1bfc06fa14`.
- Upstream Codex adapter and canonical Skill scripts inspected at the pinned commit.
- Official Codex Hooks documentation: `https://learn.chatgpt.com/docs/hooks`.
