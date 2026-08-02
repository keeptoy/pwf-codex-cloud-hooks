# Phase 1 Runtime Contracts

> Contract version: 1
>
> Phase status: Phase 1 complete; `v0.3.0-alpha.1` Cloud acceptance PASS
>
> Behavior status: runtime installed as an inactive verified inventory, but not executed; current Hook behavior is unchanged

## Purpose

Round 1 froze the trust boundary, Round 2 implemented reproducible import, and
Round 3 added inactive installation, lifecycle checks, fixtures, compatibility
goldens, and deterministic packaging. Together they answer five questions:

1. Which upstream files may enter the managed package?
2. Which files are pristine, overlaid upstream, or locally owned?
3. What exact request crosses from the Codex adapter to the owned runtime?
4. Which diagnostic outcomes are safe and machine-readable?
5. Which bytes belong to the Release ZIP, and which bootstrap stays outside it?

The machine-readable sources of truth are:

- `contracts/runtime-bundle-v1.json`;
- `contracts/compatibility-overlays-v1.json`;
- `contracts/adapter-runtime-request-v1.schema.json`;
- `contracts/runtime-result-v1.schema.json`;
- `contracts/release-artifact-v1.json`.

## Runtime ownership

| Class | Files | Rule |
|---|---|---|
| Upstream pristine | resolver, injection, ledger summary | Imported byte-for-byte from the pinned canonical Skill path |
| Upstream with managed overlay | session catch-up | Pristine hash must match, overlays apply in fixed order, managed hash must match |
| Local | adapter, installer, importer, overlay application and policy | Reviewed and released by this repository |
| Deferred | attestation, ledger mutation, phase mutation, completion and Stop gating | Not admitted until the phase that enables the behavior |

IDE mirrors such as `.codex/`, `.agents/`, `.cursor/`, and top-level distribution
copies are not valid import sources. The only canonical source root for v1 is
`skills/planning-with-files/` inside the pinned upstream v3.8.2 archive.

## Staged dependency graph

```text
Phase 2
  adapter (local)
    -> session-catchup.py (upstream + four managed overlays)
    -> resolve-plan-dir.sh (upstream pristine; shared resolution contract)

Phase 3
  adapter (local)
    -> inject-plan.sh (upstream pristine)
         `-> ledger-summary.sh (conditional: autonomous or gated mode)
               `-> resolve-plan-dir.sh (required)
```

The Phase 3 files may be imported and verified in Round 2, but they are not
registered or executed until Phase 3. Deferred candidates are not allowed into
the artifact merely because the long-term architecture may eventually use them.

## Compatibility-overlay policy

The old `PWF_CODEX_CLOUD_COMPAT_PATCH` remains one physical transformation for
the v0.2.2-compatible path. The v1 ledger splits it into four logical deltas:

- explicit Codex runtime identity;
- Codex-home session-store fallback;
- scoped planning-state recognition;
- bounded head/tail Cloud-wrapper rendering.

Every entry records its own pristine anchor hash, rationale, Cloud evidence,
regression test, planned target design, and retirement condition. Sharing one
file input/output hash does not merge their lifecycles. A future upstream release
may retire one delta without retiring the other three.

## Adapter to runtime request

The adapter parses Host stdin, validates it, and sends only the fields the owned
runtime needs. The request does not contain raw `prompt` text.

```text
Codex Hook stdin
  -> local validation and path containment
  -> adapter-runtime-request-v1
       runtime = codex
       event = name/source/session_id/turn_id
       project = root/resolved plan state
       transcript = validated Host path or explicit fallback roots
       output_budget = fixed compatibility and total-report limits
  -> owned runtime
```

`SessionStart` requires a lifecycle source and no `turn_id`.
`UserPromptSubmit` requires a `turn_id` and has no lifecycle source. The observed
Host `session_id` is the primary session identity; environment-only
`CODEX_THREAD_ID` is not part of this contract.

### Transcript selection

1. Canonicalize a supplied Host `transcript_path`.
2. Require an absolute regular file beneath an explicitly allowed session root.
3. Require the expected rollout shape and matching `session_meta` identity/cwd
   before reading message content.
4. If the Host path is absent, scan only the ordered explicit fallback roots.
5. If the Host path is rejected, fallback is permitted only when
   `allow_scan_fallback=true`, and the result must carry a
   `transcript_path_rejected` warning.
6. Never infer a store solely from the Skill or adapter installation path.

Codex transcript JSONL is changeable Host data, not a stable schema owned by
this repository. Unknown records are ignored or warning-coded; unsafe paths and
identity mismatches never inject content.

## Output and diagnostics

The request freezes the Cloud-proven v0.2.2 per-message behavior and adds a
20,000-character whole-report ceiling. A runtime result contains one primary
outcome, zero or more bounded warning codes, safe selection metadata, and either
a report or `null`.

Only `report_emitted` may set `inject=true`. Skip and failure diagnostics are
not added to normal Hook context. They are available to a separate diagnostic
surface without raw prompt or transcript content.

Advisory runtime errors remain fail-open for the Codex loop. Unsafe context
selection remains fail-closed for injection.

## Release artifact boundary

The ZIP is built from the exact paths in `contracts/release-artifact-v1.json`.
No wildcard or repository-wide archive command is allowed.

The initialization Bash is a separate Release asset:

```text
init-cloud-sandbox-v0.3.0.bash
  -> downloads immutable pwf-codex-cloud-hooks ZIP
  -> verifies ZIP SHA-256
  -> extracts and installs
```

The Bash cannot be inside the ZIP whose checksum it pins. Planning history,
tests, development docs, the local upstream reference tree, and Git metadata are
also outside the installer artifact. README and license material remain inside
for operator and redistribution context.

Round 2 added the importer, four verified runtime files, and the complete
third-party notice. Round 3 proved the expanded package lifecycle and current
Hook output locally. The alpha.1 Release download/SHA, install, doctor, exact
inventory, per-file hashes, adapter-only command boundary, and simplified
behavior-compatibility smoke through resume have all passed in Cloud.

## Reproducible import and check

`tools/import_upstream_runtime.py` consumes the archive URL and SHA pinned in
the bundle contract. It accepts only `LICENSE` and the four canonical paths
beneath `skills/planning-with-files/`, rejects unsafe ZIP paths and mirrors,
verifies pristine hashes and overlay anchors, then verifies every managed
output hash before an atomic directory rename.

```bash
python3 tools/import_upstream_runtime.py import --archive /path/to/v3.8.2.zip
python3 tools/import_upstream_runtime.py check
```

An exact existing directory is an idempotent no-op. Missing, changed, unknown,
or symlinked runtime entries fail closed and are never silently overwritten.
Executable mode is checked on POSIX; Release packaging must encode `0755`
regardless of the development host filesystem.

## Round boundaries

- Round 1: freeze these contracts and tests; no Hook behavior change.
- Round 2: deterministic import/check, overlay application, manifest v3, and MIT
  attribution are complete; no Hook behavior changed.
- Round 3: freeze Cloud/golden fixtures, extend installer lifecycle tests, prove
  compatibility, and build the alpha.1 candidate — complete locally and accepted
  in Cloud.
