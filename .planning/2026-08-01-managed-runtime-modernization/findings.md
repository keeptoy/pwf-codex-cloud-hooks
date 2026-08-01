# Findings & Decisions: Managed Runtime Modernization

## Requirements
- Confirm whether repository behavior and README claims are synchronized.
- Explain the meaning of the current nine tests without equating test cases to product features.
- Persist the agreed modernization design so it survives context compaction, clear, resume, and later sessions.
- Keep future work staged, auditable, reversible, and compatible with the current Cloud deployment.

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

## Resources
- Local README and installer implementation.
- Local upstream pin: `OthmanAdi/planning-with-files` release `v3.8.2`, commit `b04ffd9c8f9f93919649d197e5d4ec1bfc06fa14`.
- Upstream Codex adapter and canonical Skill scripts inspected at the pinned commit.
- Official Codex Hooks documentation: `https://learn.chatgpt.com/docs/hooks`.
