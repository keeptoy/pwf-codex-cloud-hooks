# Phase 3 Canonical Plan Context

> Phase status: complete; Rounds 1–4 and beta.1 live A–F PASS
>
> Runtime status: exact-v1 owned path active in published / accepted `v0.3.0-beta.2`; behavior unchanged from beta.1
>
> Current rollback baseline: published / accepted `v0.3.0-beta.2`; beta.1 and alpha.2 are historical fallbacks
>
> Prototype gate: Round 2 feasibility spike reviewed; controlled snapshot is conditional GO
>
> Cloud single-link gate: Fresh + Resume PASS; 40/40 stable regular-file observations with `st_nlink=1`
>
> Next product gate: Phase 4 Round 1 Discovery Gate, awaiting explicit maintainer authorization

## Purpose

Phase 3 removes the remaining parallel plan-resolution and plan-rendering logic
from `hook_adapter.py`. The managed adapter remains the only registered Hook
command, but planning state and context move behind one owned, versioned child
boundary that consumes the pinned upstream resolver and injector.

This phase does not add a lifecycle event and does not enable upstream v3
attestation, nonce, autonomous, gated, smart-injection, or ledger behavior.
Those remain Phase 4 scope.

## Naming and lifecycle

The Round 1 filenames intentionally do not carry a `candidate` suffix. The
architecture is selected, and the two schemas already have stable versioned
protocol identities. Their lifecycle is now **implemented/installed and active in
published beta.1**: the published alpha.2 asset does not contain them,
while the current trusted graph installs, packages, and dispatches the same v1 identities through beta.1.
A filename or schema-version change is reserved for an incompatible
contract change, not for ordinary inactive-to-active promotion.

`tests/phase3-contracts.test.js` is likewise a permanent lifecycle regression,
not a disposable candidate test: it proves trusted-graph inclusion, R4-B
plan-first dispatch, and deletion of the adapter's parallel plan algorithm.

## Target flow

```text
Codex Hook stdin
  -> hook_adapter.py
       - parse event/cwd and bounded Host identifiers
       - read PLAN_ID / PLANNING_DISABLED as explicit request inputs
       - supervise owned children and emit Codex JSON/canary
  -> owned-plan.py
       - validate adapter-plan-context-request-v1
       - apply opt-out and session attachment
       - call verified upstream/resolve-plan-dir.sh
       - finalize one canonical contained project state
       - materialize a private legacy task/progress snapshot
       - call pristine upstream/inject-plan.sh --context=userprompt
       - return plan-context-result-v1
  -> SessionStart only: owned-catchup.py
       - consume the exact project state returned by owned-plan.py
```

The plan-context child runs for both SessionStart and UserPromptSubmit. This
preserves SessionStart plan availability without relying on Host ordering and
ensures catch-up and prompt injection consume one state. Managed requirements
continue to register only `hook_adapter.py`.

## Request contract

The installed beta.1 machine contract is
`contracts/adapter-plan-context-request-v1.schema.json`.

The request contains:

- runtime and lifecycle event identity;
- canonical project root;
- optional validated `PLAN_ID` override;
- explicit planning-enabled state;
- a required `managed_legacy` behavior profile; and
- fixed plan-line, progress-line, and whole-context budgets.

The request never contains the user's prompt, transcript content, plan text, or
progress text. Session and turn identifiers are optional for backward-compatible
fixtures, but real Host values are bounded and passed when valid. A missing
session id remains visible in legacy projects; once safe attachment markers
enable isolation, it cannot attach the session.

## Result contract

The installed beta.1 machine contract is
`contracts/plan-context-result-v1.schema.json`.

The result carries:

- one outcome and zero or more bounded warning codes;
- `inject` plus either a bounded context string or `null`;
- the canonical project state used for this invocation; and
- content-free diagnostic selection metadata.

Only `context_emitted` may inject. Invalid request, disabled planning,
unattached session, no plan, plan race/unreadability, oversized output, child
failure, timeout, or malformed output inject no plan context. They remain
advisory to the Codex loop: the adapter still emits the lifecycle canary and
valid Codex JSON.

## Controlled pristine invocation

Pristine v3.8.2 `inject-plan.sh` cannot be called directly because it resolves
the plan again, fails open if no canonicalizer is available, and reads Phase 4
markers. The Round 3 owned runtime therefore invokes it through a private, bounded filesystem
projection instead of modifying the upstream file:

1. resolve and revalidate the selected plan in the real project using the
   verified standalone resolver and safe file-descriptor reads;
2. copy only the selected `task_plan.md` and optional `progress.md` into a
   `0700` temporary root workspace with `0600` files;
3. scrub `PLAN_ID`, `PLANNING_DISABLED`, `PWF_INJECT`, and other ambient mode
   inputs before invoking the pristine injector in that workspace; and
4. validate timeout, stderr isolation, UTF-8, framing, and the whole-context
   budget before returning a structured result.

The projection contains no `.planning`, `.mode`, attestation, nonce, or ledger.
Together with the scrubbed environment this forces `managed_legacy` while both
upstream scripts remain pristine. The historical `patch_planning_skill.py` and
single-target catch-up overlay remain unchanged for v0.2.2 reproduction; Phase
3 does not require a multi-target importer/ledger upgrade.

The alternatives, empirical probe, long-term Driver boundary, and fallback
conditions are recorded in `docs/phase-3-upstream-invocation-options.md`.

## Intentional output changes

Phase 3 adopts two pristine-upstream legacy details rather than copying the
alpha.2 Python wording:

- the stronger structured-data framing and final findings reminder;
- timestamp normalization in the raw `progress.md` tail.

Everything else in legacy shape remains stable: canary first, at most 50 plan
lines, static BEGIN/END delimiters, at most 20 raw progress lines, no-plan
silence beyond the canary, and read-only behavior. Context above 20,000
characters is suppressed whole; it is never partially injected.

The v0.2.2/alpha.2 golden remains immutable rollback evidence. R4-B adds a
separate beta golden fixture that records the intentional textual differences.

## Four-round delivery

### Round 1: contract and audit freeze

- Compare local adapter, upstream resolver/injector, contracts, provenance,
  installer, and tests.
- Freeze request/result schemas, managed-legacy behavior, output differences,
  failure semantics, artifact impact, and Cloud acceptance scope.
- Do not alter registered or packaged runtime behavior.

### Round 2: controlled-snapshot feasibility gate — complete

- Build a standalone, untrusted spike around pristine resolver/injector copies.
- Prove fd-rooted safe reads, private modes, environment isolation, bounded
  output, timeout cleanup, replacement-race detection, cross-user execution,
  output equivalence, and trusted-graph exclusion on Linux/Cloud.
- Keep the spike self-contained and outside runtime, installer, Release, and
  adapter dispatch.

The reviewed result is conditional GO. The eight focused cases plus one parent
handoff isolation case are feasibility evidence, not production implementation.

### Round 3: inactive production owned plan-context runtime

Implementation status: the child, exact schemas, manifest/installer/Release
inventory, and safety regressions are present. The complete inactive Cloud gate
passed 63/63 with isolated install, doctor, direct exact-v1, 11-file inventory,
21-entry ZIP, zero snapshot residue, and adapter no-dispatch. Round 3 is closed;
adapter dispatch remains unchanged.

- Enforce regular files with `st_nlink == 1` at pre-read, post-read, and
  retained-parent reopen. The Fresh and Resume Cloud gate is closed with 40/40
  stable observations across four real scoped planning files.
- Use the same-EUID trusted `/tmp/pwf-codex-cloud-hooks-<euid>` base and bounded
  10-minute/32-entry/500-ms stale cleanup.
- Require the portable fd-rooted `openat` walk; defer optional `openat2`
  hardening rather than making it a production dependency.
- Use one 27-second monotonic internal deadline under the Host's 30-second
  timeout: owned-plan 8 seconds, catch-up 15 seconds, adapter supervision/JSON
  4 seconds, leaving 3 seconds of Host margin.
- Add `owned-plan.py` and strict request/result validation.
- Add a safe private snapshot runner around the pristine resolver/injector.
- Add resolver, attachment, opt-out, race, output-budget, timeout, malformed
  output, and exact beta-golden tests.
- Install and hash the new child but keep adapter dispatch unchanged.

### Round 4: activation and beta acceptance

- Execute the final round through three ordered gates: R4-A bounded supervisor
  and typed protocols while plan dispatch stays inactive; R4-B atomic
  activation plus deletion of the adapter's parallel resolver/renderer; and
  R4-C beta.1 sealing plus fresh/resume Cloud acceptance.
- Dispatch both events through the owned plan-context child.
- Pass its exact SessionStart project state to owned catch-up.
- Remove adapter plan resolution and file rendering.
- Prove no mutable global Skill script executes.
- Update exact installer/manifest/Release inventories, seal beta.1, and perform
  complete Cloud acceptance before Phase 4.

Round 4 is complete: R4-A/R4-B Linux gates, beta.1 exact-byte sealing, publication/download verification,
and live Fresh/Resume A–F all passed. This closure does not authorize Phase 4 implementation.

The detailed sequence, relational result validation, failure matrix, shared
27-second deadline interpretation, rollback boundary, and stop conditions are
frozen in `docs/phase-3-round-4-activation-plan.md`.

## Verification matrix

| Area | Required proof |
|---|---|
| Resolution | PLAN_ID, BOM active pointer, newest scoped, legacy root, no plan, ties/races, canonical containment |
| Session policy | legacy visibility, exact attachment, missing/invalid id, opt-out before filesystem scans |
| Injection | upstream framing, 50/20 line limits, timestamp normalization, missing progress, UTF-8, 20,000-character ceiling |
| Phase isolation | `.mode`, attestation, nonce, and smart markers do not alter Phase 3 managed-legacy output |
| Supervision | timeout, spawn/nonzero, stderr isolation, invalid UTF-8/JSON, oversized/malformed result, canary survival |
| Trust | sibling owned runtime only, pristine upstream hashes, private `0700`/`0600` projection, malicious global injector not executed, root/root and synthetic cross-user |
| Compatibility | SessionStart catch-up remains Cloud-compatible; UserPrompt no-plan/scoped/newest/root behavior remains semantically compatible |
| Cloud | download/SHA, install/doctor, automatic startup and prompt, scoped context, real resume catch-up/tail, post-resume doctor |

## Release boundary

The published alpha.2 asset remains immutable and does not contain the Round 3 files. Published beta.1
includes and dispatches the approved schemas, `owned-plan.py`, its controlled-snapshot contract, and the
existing pristine resolver/injector dependencies. Its installed inventory is 11 managed payloads plus the
separately validated `installed-manifest.json`; its self-auditable Release ZIP has 22 entries. The injector
hash and compatibility-overlay ledger remain unchanged. Exact beta.1 assets and final A–F evidence are in
`docs/v0.3.0-beta.1-cloud-hard-acceptance.md`; future working-tree changes require a new asset identity and
do not mutate either published alpha.2 or beta.1 bytes.
