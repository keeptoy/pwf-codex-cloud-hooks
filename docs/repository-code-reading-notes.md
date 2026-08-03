# Repository Code-Reading Notes

> Date: 2026-08-02
>
> Scope: maintainer-oriented reading of the accepted `v0.3.0-alpha.2`
> implementation and the staged Phase 3 contracts. This is an explanatory
> map, not a new runtime contract. When it conflicts with a machine contract,
> the machine contract and executable tests win.

## 1. What the repository actually owns

The upstream `planning-with-files` project owns the planning workflow, file
conventions, and canonical shell implementations. This repository owns the
Codex Cloud deployment and trust boundary around a small subset of that
runtime:

- installation beneath an explicit `CODEX_HOME`;
- system-managed Hook registration in `/etc/codex/requirements.toml`;
- absolute commands constrained by `hooks.managed_dir`;
- pinned upstream provenance and an exact installed-file inventory;
- Codex Hook JSON adaptation, child-process supervision, and bounded output;
- doctor, repair, backup, uninstall, deterministic packaging, and Cloud
  black-box acceptance.

This distinction explains why the repository cannot simply copy upstream
`.codex/hooks.json`: the Cloud policy, ownership, preservation, and repair
contracts are the product here.

## 2. Current accepted execution path

The accepted alpha.2 chain is:

```text
init-cloud-sandbox-v0.3.0.bash
  -> install pristine global planning-with-files Skill
  -> download and checksum the deterministic Release ZIP
  -> install.js install/doctor
  -> /etc/codex/requirements.toml
  -> /usr/bin/python3 <managed_dir>/hook_adapter.py <event>
```

Only `SessionStart` and `UserPromptSubmit` are registered. Both remain
read-only and both emit `PWF_GLOBAL_HOOK_CANARY_V1`.

The two event paths currently diverge after adapter parsing:

- `SessionStart` resolves project state locally, constructs a strict v1
  adapter/runtime request, and supervises sibling `owned-catchup.py`. A valid
  catch-up report is placed before the plan context. Advisory child failure is
  fail-open for the Codex turn, while malformed or unverifiable child output is
  not injected.
- `UserPromptSubmit` still resolves and renders the plan inside
  `hook_adapter.py`. It does not execute the global Skill or the owned catch-up
  child.

This remaining local UserPrompt implementation is the specific parallel path
that Phase 3 is designed to remove.

## 3. `hook_adapter.py`: Host boundary and remaining debt

The adapter currently performs five jobs:

1. parse Hook stdin and select the project root;
2. resolve planning visibility, scope, and session attachment;
3. validate Host transcript/session inputs and construct the v1 catch-up
   request;
4. supervise the owned child with timeout, output-size, UTF-8, JSON, and exact
   result-envelope checks;
5. convert accepted content into Codex
   `hookSpecificOutput.additionalContext` JSON.

Its resolution order is `PLAN_ID`, `.planning/.active_plan`, newest valid
scoped plan, then legacy root. Canonical containment and regular-file checks
prevent scoped-plan symlinks from escaping the project. `PLANNING_DISABLED=1`
short-circuits visibility, while `.planning/sessions/*.attached` enables
backward-compatible session isolation.

The adapter also still contains the legacy renderer: canary, up to 50 plan
lines, static plan-data delimiters, up to 20 progress lines, and a findings
reminder. That renderer and the duplicate resolver are intentional temporary
debt, not the target architecture.

## 4. `owned-catchup.py`: active transcript trust boundary

`runtime/owned-catchup.py` is the active Phase 2 child. It accepts an exact v1
request rather than inferring runtime identity from an installed Skill path.
The request makes the following Host contracts explicit:

- runtime and lifecycle event;
- project root and already-resolved project state;
- stable session identity;
- validated Host transcript status;
- up to three explicit session-store roots and whether fallback scanning is
  permitted;
- fixed rendering budgets.

The child prefers a validated Host transcript, verifies containment and
session/project identity, and only then uses an explicitly allowed rollout
scan fallback. JSONL parsing is defensive because Host transcript record
families are observed compatibility data, not a stable repository-owned
schema. The normalizer handles duplicate message families, structured planning
updates, unknown/malformed records, bounded user head/tail preservation, and a
total report ceiling.

The result is a strict reason-coded envelope. Detailed, content-free selection
metadata is available for diagnostics; only `report_emitted` can inject report
text. The child disables bytecode writes so importing the pinned parser cannot
create an unknown trusted-runtime file.

## 5. Installer and integrity model

`install.js` derives its installed runtime from `upstream-manifest.json` rather
than copying a directory recursively. Every source file has an expected hash,
installed relative path, and mode. Installation uses atomic writes, an
installation lock, backups, and an `installed-manifest.json` containing the
exact runtime inventory and requirements hashes.

Managed policy merging removes only this repository's owned Hook blocks and
preserves unrelated requirements. It refuses an existing `managed_dir` that
does not contain the adapter. Doctor distinguishes repairable owned drift from
blocking unowned, manifest, upstream, or unknown-runtime drift. Repair is
therefore intentionally narrower than “make the machine match this checkout.”

The global Skill remains pristine and independently installed for discovery
and instructions. Alpha.2 executes only files copied beneath the managed
runtime; the historical patcher is retained for provenance regression but is
not packaged or called.

## 6. Provenance and Release boundary

The trust graph has several complementary records:

- `upstream-manifest.json` pins upstream v3.8.2, archive identity, pristine and
  managed hashes, file dependencies, modes, and license provenance;
- `contracts/runtime-bundle-v1.json` describes the runtime allowlist and
  activation phase of imported/local files;
- `contracts/compatibility-overlays-v1.json` records the four temporary Cloud
  deltas and their retirement conditions;
- `contracts/release-artifact-v1.json` defines the exact deterministic ZIP
  entries and excludes tests, docs, planning state, and the bootstrap;
- `tools/import_upstream_runtime.py` reproduces/checks the pinned import;
- `tools/build_release.py` constructs and verifies the exact ZIP boundary.

The bootstrap stays outside the ZIP because it embeds the ZIP checksum. The
workflow is deliberately one-way: freeze payload bytes, build ZIP, calculate
its checksum, then seal the external bootstrap. This avoids a self-referential
archive.

## 7. Tests as executable architecture

The suite is organized by boundary rather than by source file alone:

- adapter output and exact legacy goldens;
- managed-policy preservation, lifecycle, drift, backup, repair, and uninstall;
- upstream patch provenance and deterministic import;
- request/result and artifact contracts;
- Cloud-shaped Hook/transcript fixtures;
- owned-runtime containment, normalization, and diagnostics;
- supervisor timeout/malformed-output behavior;
- deterministic Release packaging;
- Linux permission and synthetic cross-user execution;
- staged Phase 3 contracts and their deliberate exclusion from alpha.2.

The black-box runbook is not redundant with the automated suite. It verifies
Host behavior that local tests cannot promise: actual lifecycle firing,
fresh-task/resume ordering, real transcript placement, wrapper truncation with
tail preservation, and post-resume doctor health.

## 8. Phase 3 route decision: overlay versus controlled invocation

Phase 3 Round 1 did not jump directly from “duplicate adapter renderer” to one
implementation. It explicitly reopened how an owned driver should invoke an
upstream injector that has no managed-input protocol. The two practical routes
were:

| Route | Method | Advantage | Cost |
|---|---|---|---|
| Multi-target managed overlay | Add a managed argument or environment protocol to the owned copy of `inject-plan.sh` | Direct invocation; patch anchors, branches, and the final managed hash are fully auditable | Expands importer, overlay ledger/schema, patcher, manifest, Release identity, drift tests, upgrade work, and downstream patch retirement |
| Controlled pristine invocation | Resolve and safely read the canonical files, create a private legacy snapshot containing only plan/progress, then invoke the pristine injector | Keeps upstream files pristine; avoids a second overlay; simpler supply-chain and retirement story | Moves complexity into secure file opening, race detection, permissions, environment scrubbing, cleanup, supervision, and budgets |

The broader comparison also considered an upstream-native structured protocol,
a Host-native IR/reimplementation, OS-level virtual projection, and future
official Cloud support. An upstream protocol is the preferred long-term
retirement path but does not exist in v3.8.2. A generic IR would overfit one
Skill while taking ownership of shell/filesystem semantics. Namespace/FUSE
projection depends on Cloud capabilities that are not currently contracted.

The selected Phase 3 route is **controlled pristine invocation**. Multi-target
overlay remains an explicit fallback if Linux/Cloud testing proves that the
snapshot cannot satisfy semantics, permissions, or cleanup requirements. This
is a route decision, not a claim that snapshots are intrinsically simpler:
their acceptable security and failure behavior is the hardest part of Round 2.

Both repository runtime files remain byte-identical to their pinned upstream
v3.8.2 sources:

| File | Pinned pristine/managed SHA-256 |
|---|---|
| `runtime/upstream/resolve-plan-dir.sh` | `38a1c5effb35f9506e2e371ccabb6be6e4f4170acc18f1811f08d634f5f0e9bd` |
| `runtime/upstream/inject-plan.sh` | `72c7904ec9a03f994d349ac1b9b3cfe484b417e738b25c0545d9ae11a2cc0364` |

For both files, `origin` remains `upstream_pristine` and
`pristine_sha256 == managed_sha256`. Phase 3 must preserve that property unless
the documented fallback is deliberately reopened with an atomic provenance and
Release-contract change.

### 8.1 Recommended owned-plan call chain

Phase 3 Round 1 has frozen two staged v1 schemas, but alpha.2 does not install,
package, or dispatch them. Round 2 adds an inactive sibling `owned-plan.py`;
Round 3 activates it. The complete intended call chain is:

```text
Codex Managed Hook
  -> hook_adapter.py
       -> owned-plan.py
            1. validate the request and fixed managed_legacy profile
            2. apply PLANNING_DISABLED and session-attachment policy
            3. invoke pristine resolve-plan-dir.sh in the real project cwd
            4. validate resolver output and canonical project containment
            5. safely read task_plan.md and optional progress.md
            6. create a private 0700 temporary root
            7. write a task/progress-only legacy snapshot as 0600 files
            8. invoke pristine inject-plan.sh with a minimal environment
            9. validate timeout, exit status, stderr, UTF-8, framing, and size
           10. return bounded context plus the canonical project state
           11. remove the temporary directory in finally
       -> SessionStart only: pass that exact state to owned-catchup.py
```

The same `owned-plan.py` boundary runs for both managed events. This prevents
the adapter and catch-up runtime from resolving independently and avoids
depending on Host ordering between SessionStart and UserPromptSubmit. The
adapter remains the only registered Hook command and retains Codex payload
parsing, child supervision, canary emission, and final Codex JSON conversion.

### 8.2 Minimal child environment and Phase 4 isolation

The injector subprocess must receive an allowlisted environment rather than a
copy of the ambient Hook environment:

- keep only a controlled `PATH`, locale variables, and the necessary temporary
  directory settings;
- remove `PLAN_ID`, because canonical selection has already happened;
- remove `PLANNING_DISABLED`, because opt-out has already been enforced;
- remove `PWF_INJECT` and every other ambient `PWF_*` capable of selecting an
  upstream mode;
- do not project `.planning`, `.mode`, attestation, nonce, ledger, or other
  Phase 4 state into the snapshot.

From the injector's point of view the private workspace is therefore an
ordinary legacy-root plan. Filesystem projection and environment scrubbing are
both correctness boundaries: either one alone can allow smart/autonomous/gated
behavior to activate before Phase 4 review.

The Round 1 probe substantiated this choice. Direct scoped-project and
root-snapshot captures were both 9,628 characters with SHA-256
`00fd3288926b8ae25d30475f44cf90f2b5e96b351a5a531dcc92d5491b6af6b8`.
With ambient `PWF_INJECT=smart`, the scrubbed snapshot remained equal to the
legacy baseline while the unscrubbed invocation changed to 6,841 characters.
A separate `.mode`/nonce fixture entered the attestation branch in the real
project but remained legacy-shaped in the task/progress-only snapshot.

### 8.3 The hard implementation problems

Calling a shell script is not the difficult part. Safely projecting mutable
project files, bounding execution, and preserving fail-closed semantics are:

| Problem | Required treatment |
|---|---|
| Path substitution and symlink races | On Linux, use directory descriptors plus `openat`/`O_NOFOLLOW`; accept regular files only and retain canonical containment checks |
| Concurrent modification during reads | Compare `dev`, inode, size, mtime, and ctime before/after the read; return a reason such as `plan_state_changed` instead of injecting a mixed snapshot |
| Oversized plan/progress input | Enforce separate hard file limits before snapshot creation or injector execution, in addition to the 20,000-character result ceiling |
| Preserve upstream head/tail semantics | Copy validated raw bytes; do not normalize lines, line endings, or timestamps in Python before the pristine injector sees them |
| Injector tends to exit zero | Once a task file was safely selected, empty/malformed output is a runtime failure, not a normal no-plan result |
| Outer Hook timeout is 30 seconds | Allocate segmented resolver, injector, and catch-up budgets while reserving time for kill, cleanup, envelope validation, and Codex JSON emission |
| SIGKILL can bypass `finally` | `0700`/`0600` limits residual disclosure; normal exits always clean up; Cloud container disposal is only a second recovery layer, not the primary cleanup mechanism |
| Windows lacks the production POSIX runtime | Test protocol, snapshot logic, and fake runners on Windows; gate the real injector, permissions, cleanup, and cross-user behavior on Linux/Cloud |

An ordinary prototype is medium difficulty. An implementation that satisfies
the repository's security, supervision, and diagnostic contracts is
medium-high difficulty. It is still a smaller long-term maintenance burden than
turning the current single-target compatibility tooling into a permanent
multi-target upstream patch system.

### 8.4 Release and provenance consequences

The controlled-snapshot route still requires Round 2 to add atomically:

- `runtime/owned-plan.py`;
- the request/result schemas to the trusted graph;
- installer, runtime-manifest, and Release inventory entries;
- snapshot/supervisor, exact beta-golden, Linux permission, and provenance
  tests.

It deliberately does **not** require:

- modifying `runtime/upstream/inject-plan.sh`;
- computing a downstream managed injector hash;
- adding another overlay anchor or ledger entry;
- upgrading the importer/patcher for multiple patched targets;
- carrying injector-overlay drift and retirement obligations into future
  upstream upgrades.

Round 2 must remain inactive: it adds and verifies the owned child without
changing adapter dispatch or accepted alpha.2 Release/bootstrap bytes. Round 3
alone removes adapter resolution/rendering, activates both events through the
owned boundary, packages a beta, and performs complete Cloud acceptance.

### 8.5 Recommendation: choose the controlled snapshot, with a hard fallback gate

My recommendation is to proceed with the **controlled pristine snapshot** for
Phase 3 Round 2. I would not implement the multi-target injector overlay now.
The reason is not that snapshot code is trivial—it is the most security-sensitive
part of this phase—but that its complexity is concentrated in one repository-owned
Host/Driver boundary and can be tested without creating another long-lived fork
of upstream behavior.

The decision rests on four points:

1. **The semantic assumption has evidence.** The selected legacy output depends
   on task/progress bytes and controlled environment/marker inputs, and the
   direct-versus-snapshot probe is byte-equal. We are not choosing the route on
   architectural taste alone.
2. **The trust graph stays smaller.** Resolver and injector remain independently
   recognizable upstream artifacts. Import, manifest, doctor, Release, upgrade,
   and retirement logic do not gain a second patched target.
3. **The difficult work is reusable Host work.** Safe file projection,
   environment allowlisting, segmented supervision, bounded result envelopes,
   and content-free diagnostics are useful managed-runtime capabilities even
   if a later upstream protocol removes the temporary snapshot.
4. **Rollback and retirement are clearer.** Alpha.2 remains untouched through
   inactive Round 2; Round 3 has one activation seam; an upstream structured
   API can later replace the projection without first unpicking an injector
   fork.

I would implement Round 2 in this order:

1. strict request/result validation and reason-code vocabulary;
2. pristine resolver supervision with a dedicated short timeout;
3. Linux safe-open helper rooted at project/plan directory descriptors,
   component walking with `O_NOFOLLOW`, regular-file checks, independent byte
   limits, and pre/post `fstat` identity comparison;
4. private snapshot creation and unconditional normal-path cleanup;
5. minimal environment construction from an allowlist, not ambient-variable
   deletion alone;
6. pristine injector supervision, where nonzero exit, stderr, timeout, invalid
   UTF-8, empty output after a resolved task, malformed framing, or output above
   budget all return a non-injecting result;
7. beta golden, adversarial race/symlink/FIFO/device/oversize tests, Linux
   permission and cross-user gates, then atomic inventory/provenance updates;
8. prove the child is installed but unreachable from adapter dispatch before
   declaring Round 2 complete.

The fallback gate should be objective. Reopen the multi-target overlay only if
at least one of these is demonstrated in Linux/Cloud tests:

- pristine legacy output depends on real scoped-path metadata that cannot be
  represented by the bounded projection;
- the Hook user cannot securely create, execute from, and clean the private
  snapshot under supported Cloud permissions;
- safe file-race handling cannot provide deterministic fail-closed behavior;
- segmented resolver/injector/catch-up execution cannot fit under the Host
  timeout with adequate cleanup margin.

If none of those failures occurs, adding an overlay would buy little while
permanently enlarging provenance and upstream-upgrade obligations. Conversely,
if one does occur, the overlay must be reopened as a reviewed contract change,
not introduced as a local shortcut inside `inject-plan.sh`.

## 9. Safety invariants to preserve while changing code

1. Registered commands stay absolute and below the configured managed root.
2. Installation and doctor fail closed for missing, changed, or unknown trusted
   files.
3. Advisory runtime failure does not terminate the Codex loop, but unsafe text
   is never injected.
4. Existing unowned policy/configuration is preserved at the byte ownership
   boundary promised by the installer.
5. Enabled lifecycle events remain read-only.
6. Canary output survives until fresh-session verification permits removal.
7. Tests precede activation in the Cloud artifact.
8. Host identity/path/budget inputs remain explicit; installed path and JSONL
   samples are not promoted into undocumented platform contracts.
9. Hook stdout stays valid, bounded Codex JSON; diagnostics never contaminate
   injected context.
10. Release inputs remain allowlisted and the checksum bootstrap remains
    outside the archive it verifies.

## 10. Recommended reading order for the next implementation turn

1. active `task_plan.md`, then its `findings.md` and `progress.md`;
2. `docs/phase-3-canonical-plan-context.md` and
   `docs/phase-3-upstream-invocation-options.md`;
3. the two staged plan-context schemas;
4. `hook_adapter.py`, `owned-catchup.py`, and pristine resolver/injector end to
   end;
5. `tests/phase3-contracts.test.js`, adapter/activation/golden/supervisor tests;
6. runtime bundle, upstream manifest, installer inventory, Release contract,
   importer, and builder before changing any trusted artifact;
7. the alpha.2 Cloud hard-acceptance guide before proposing activation.

The next code change should begin Phase 3 Round 2 only. It must not casually
fold Round 3 dispatch, Release resealing, or bootstrap changes into the same
step.
