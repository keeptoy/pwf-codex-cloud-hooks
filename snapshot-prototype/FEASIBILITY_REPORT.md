# Phase 3 Controlled-Snapshot Feasibility Spike

> Timebox: started 2026-08-02 17:16:52Z; hard deadline 18:16:52Z;
> completed early at 17:24:32Z
>
> Status: prototype evidence only; not trusted, installed, packaged, or
> dispatched
>
> Historical outcome: the production translation and activation later passed
> Phase 3 Rounds 3–4 and shipped in Cloud-accepted beta.1. Future-tense Round 3
> requirements below are preserved as the original handoff record, not current authorization.

## Question and decision

The spike asks whether the hardest parts of the controlled-pristine-snapshot
route can be overcome on the current Linux/Cloud-shaped environment before the
repository commits to production `runtime/owned-plan.py`.

**Result: conditional GO for the snapshot route.** The prototype demonstrates
that the current environment can safely select/read bounded regular files,
isolate upstream legacy rendering, enforce private permissions, detect a
deterministic replacement race, bound/kill the injector, clean normal and
timeout paths, and execute as a synthetic non-root Hook user. No fallback gate
for a multi-target injector overlay fired.

This is not production approval. The prototype deliberately remains under
`snapshot-prototype/`, is absent from every trusted inventory, and is unreachable from
`hook_adapter.py`. Round 3 must translate the evidence into the frozen v1
request/result envelopes and a more complete adversarial test matrix.

## Prototype shape

`prototype_snapshot_runner.py` implements the narrow vertical slice. The two
pristine upstream scripts it executes are copied into this handoff folder under
`upstream/`, so the prototype has no runtime dependency on the parent project:

```text
project root
  -> pristine resolve-plan-dir.sh (2 s internal timeout)
  -> canonical relative plan selection
  -> fd-rooted component walk with O_NOFOLLOW
  -> regular-file/type/1 MB checks
  -> read + pre/post/reopen fstat identity checks
  -> TemporaryDirectory, forced 0700
  -> O_EXCL/O_NOFOLLOW task/progress writes, forced 0600
  -> allowlist-built PATH/locale/TMPDIR environment
  -> pristine inject-plan.sh (3 s internal timeout)
  -> strict exit/stderr/UTF-8/nonempty/20,000-character checks
  -> structured injecting or non-injecting prototype result
  -> context-manager cleanup
```

The prototype is intentionally not a near-production copy of `owned-plan.py`:
it does not implement the complete v1 schema, session attachment, full warning
vocabulary, diagnostic envelope, adapter supervision, stale cleanup, or shared
timeout budget. Keeping it unshipped prevents a feasibility spike from silently
becoming the trusted runtime.

## Simulated managed-dialogue scenarios

The focused regression simulates a project with an active scoped dialogue plan
and progress tail, then exercises these scenarios:

| Scenario | Expected safety property | Result |
|---|---|---|
| Normal active user dialogue | Pristine legacy context contains plan/progress | PASS |
| Ambient `PLAN_ID`, `PLANNING_DISABLED`, `PWF_INJECT=smart` | Child sees allowlisted policy, not ambient mode | PASS |
| Real plan contains `.mode` and `.nonce` | Snapshot does not project Phase 4 markers | PASS |
| Symlinked task points outside project | No external content is injected | PASS: `plan_unreadable` |
| Progress is a FIFO | Non-regular input is rejected without blocking | PASS: `plan_unreadable` |
| Task exceeds 1 MB | No snapshot/injector execution | PASS: `plan_unreadable` |
| Rendered context exceeds 20,000 characters | Whole context is suppressed | PASS: `output_budget_exceeded` |
| Task pathname is replaced after read | Reopen identity differs | PASS: `plan_state_changed` |
| Snapshot mode probe | Root is 0700; task/progress are 0600 | PASS |
| Injector exceeds its internal timeout | Child is killed; snapshot is removed | PASS: `timeout` |
| Synthetic `nobody` Hook user | User creates/reads/removes its own projection | PASS |
| Inventory/dispatch isolation | Prototype is absent from runtime, Release, adapter | PASS |

The focused suite has eight cases. Seven execute the POSIX/Linux runner and are
explicitly skipped on non-Linux hosts; the static bundle-boundary case remains
portable. Parent-repository handoff coverage imports all eight and adds one
production-graph isolation case. Non-Linux development must not pretend to
validate production POSIX semantics.

An additional live-project comparison ran the pristine injector directly in
the current repository and through the prototype snapshot under the same
allowlisted environment. Both results were 6,113 characters and had SHA-256
`227b30d2fa5406363f668b59fcec30f9b376db84d50271cd8527566c14fb1303`.
This reconfirms byte equality after the planning files changed since the Round
1 probe; it is evidence for legacy behavior, not a universal upstream promise.

## What the spike learned about the hard parts

### Safe open and path races are tractable, but need precise semantics

Python exposes `os.open(..., dir_fd=...)`, `O_DIRECTORY`, and `O_NOFOLLOW`, so a
component-by-component walk can stay rooted at an already-open directory. A
regular-file `fstat` before and after reading detects writes to the opened
inode. Reopening the same name from the retained parent fd detects pathname
replacement. Once these checks pass, later changes do not mutate the captured
bytes already copied to the snapshot.

Production should keep `plan_state_changed` distinct from `plan_unreadable` and
should test truncate, append, atomic rename, directory replacement, symlink,
hard-link, FIFO, device, deleted-file, and permission-change cases. A hard link
to an outside file is not prevented by `O_NOFOLLOW`, and `openat2` hardens path
resolution rather than distinguishing hard-link names. Production must either
accept “read a regular inode selected beneath the contained plan pathname” as
its explicit trust claim, or reject any file whose observed `st_nlink` is not
one across the pre-read/post-read/reopen identity checks. Mount/isolation policy
may complement that decision but cannot be replaced by the `openat2` choice.

### Environment allowlisting works better than deleting known variables

The test deliberately passes hostile ambient PWF/plan variables while the real
plan contains Phase 4 markers. The child receives a newly constructed
environment containing only controlled `PATH`, `LC_ALL=C`, `LANG=C`, and
snapshot `TMPDIR`. It therefore renders the plain legacy snapshot. Production
must add a variable only when an explicit dependency test justifies it.

### Timeout cleanup works for the parent, not for arbitrary descendants

`subprocess.run(..., timeout=...)` kills and waits for the direct shell child;
the context manager then removes the snapshot. The spike proves this path for
the current injector, which does not daemonize. A production supervisor should
still start a process group/session and kill the group on timeout, because a
future dependency could fork a descendant that retains cwd or open files.
SIGKILL of the Python parent itself still bypasses `finally`; 0700/0600 limits
exposure, but stale-directory cleanup needs a separately owned policy if Cloud
containers can outlive the Hook process.

### Cross-user access is feasible when ownership is local to the Hook user

The synthetic `nobody` run succeeds when managed runtime/project inputs are
traversable/readable and that user creates the snapshot beneath a writable
sticky temporary parent. This validates the intended ownership model: the
installer need not pre-create per-call content owned by another user. Round 3
must repeat the gate against the installed layout and the actual Cloud Hook
identity.

## Relevant industry/standard patterns

The design follows established primitives rather than inventing a filesystem
security model:

- Linux [`openat2(2)`](https://man7.org/linux/man-pages/man2/openat2.2.html)
  documents `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS`, and other resolution
  constraints for confining untrusted path traversal. The portable prototype
  uses directory fds plus `O_NOFOLLOW`; production may use `openat2` as a Linux
  hardening path only if syscall/kernel availability has a tested fallback.
- Python's [`tempfile`](https://docs.python.org/3/library/tempfile.html)
  provides securely created temporary directories and context-managed cleanup;
  this prototype additionally forces and verifies 0700/0600 modes.
- Python's [`subprocess`](https://docs.python.org/3/library/subprocess.html)
  defines timeout/kill/wait behavior. The production design should extend it
  with process-group termination rather than assuming direct-child kill covers
  descendants.
- Bazel's official
  [sandboxing documentation](https://bazel.build/docs/sandboxing) describes the
  same higher-level pattern: construct a restricted input view so tools cannot
  observe undeclared inputs and use sandboxing to expose non-hermetic behavior.
  The PWF snapshot is smaller in scope but uses the same declared-input idea.
- systemd's
  [`PrivateTmp=` and runtime-directory controls](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
  show the operational pattern of private temporary namespaces/directories and
  explicit directory modes. Codex Cloud does not currently promise systemd
  unit controls, so the repository implements user-owned directories rather
  than depending on that facility.

These sources support the primitives and operating model; they do not prove
this repository's exact composition. The focused tests and Cloud acceptance
remain the evidence for that composition.

## Route-decision record carried with the handoff

The prototype exists because Phase 3 compared two practical invocation routes:

| Route | Advantage | Cost | Decision |
|---|---|---|---|
| Multi-target managed overlay | Direct managed-input protocol inside the owned injector; patch anchors and final hash are auditable | Adds a second upstream fork point and expands patcher, importer, overlay ledger, manifest, Release identity, upgrade, drift, and retirement work | Fallback only |
| Controlled pristine snapshot | Keeps resolver/injector pristine and expresses declared inputs through a private filesystem projection | Secure open, races, modes, environment, supervision, cleanup, and budgets become Host responsibilities | Selected and prototype-validated |

Other routes were considered: a future upstream structured protocol is the
preferred retirement path; a Host-native IR/reimplementation would overfit one
Skill and inherit shell/filesystem semantics; OS-level namespace/FUSE
projection depends on Cloud capabilities not currently contracted; future
native Codex Cloud Skill-Hook support should shrink or retire this integration.

The copied scripts are pinned pristine planning-with-files v3.8.2 artifacts:

| File | SHA-256 |
|---|---|
| `upstream/resolve-plan-dir.sh` | `38a1c5effb35f9506e2e371ccabb6be6e4f4170acc18f1811f08d634f5f0e9bd` |
| `upstream/inject-plan.sh` | `72c7904ec9a03f994d349ac1b9b3cfe484b417e738b25c0545d9ae11a2cc0364` |

For the parent project their provenance remains `origin = upstream_pristine`
and `pristine_sha256 == managed_sha256`. The controlled-snapshot decision means
Round 3 need not modify the injector, add a managed injector hash/overlay
anchor, or upgrade the importer into a multi-target patcher.

The intended production chain has eleven steps: validate the v1 request; apply
opt-out/session attachment; run the pristine resolver in the real project;
validate containment; safely read task/progress; create a 0700 temporary root;
write 0600 raw-byte inputs; run the pristine injector with an allowlisted
environment; validate process/output failure semantics; return context plus the
canonical project state; and clean in `finally`. Both managed events must use
the same future `owned-plan.py`; SessionStart then passes that exact state to
`owned-catchup.py`.

Round 1 also recorded an earlier 9,628-character direct-versus-snapshot capture
with SHA-256
`00fd3288926b8ae25d30475f44cf90f2b5e96b351a5a531dcc92d5491b6af6b8`.
Environment scrubbing suppressed ambient smart mode, and task/progress-only
projection isolated `.mode` and nonce. The later 6,113-character equality in
this report reconfirmed the same property after planning content changed.

The difficult production matrix remains explicit: `openat`/`O_NOFOLLOW` and
symlink races; inode/dev/size/mtime/ctime comparison; hard input limits; raw
byte preservation for upstream head/tail semantics; empty output despite the
injector's exit-zero bias; segmented budgets beneath the 30-second Hook;
SIGKILL residual directories; and honest Windows-versus-Linux/Cloud gates.

## Gaps before production Round 3 can close

1. Replace the prototype result with exact validation of both staged v1 schemas.
2. Integrate session attachment and opt-out ordering without filesystem scans
   on disabled/detached requests.
3. Decide whether Linux production uses portable `openat` walking only or an
   optional `openat2` hardening fast path with explicit fallback evidence.
4. Add process-group timeout termination and verify no descendant holds the
   snapshot.
5. Freeze separate task/progress input limits and resolver/injector/adapter
   timeout allocations in a machine-readable contract.
6. Add deterministic races for mutation, truncate, delete, parent-directory
   replacement, and permission changes—not only atomic file replacement.
7. Define stale snapshot naming/cleanup policy for parent SIGKILL, or explicitly
   accept container lifecycle cleanup with documented residual-risk bounds.
8. Run installed-layout root/root and synthetic cross-user gates, then a real
   Cloud probe before activation.
9. Add exact beta golden output and latency/size measurements for plan/no-plan
   and long-input cases.
10. Atomically promote the schemas/owned child into manifest, installer,
    inventory, attribution/LF rules, and Release contract while proving adapter
    dispatch remains unchanged.

## Recommendation and remaining questions

Proceed with inactive Round 3 implementation using the snapshot route. Do not
open the multi-target overlay fallback based on this spike: all four previously
defined fallback gates remain untriggered in the local Linux/Cloud-shaped
environment.

Questions for maintainer review before production freeze:

1. Is “regular file reached through a contained, no-symlink pathname” the
   intended trust claim, or must files with observed `st_nlink != 1` be rejected
   and covered by Cloud-filesystem compatibility tests?
2. Should parent-SIGKILL stale snapshots be handled by a bounded preflight
   cleanup on each `owned-plan` invocation, or is 0700/0600 plus ephemeral
   Cloud-container disposal an accepted residual risk?
3. Is an optional Linux `openat2` hardening path desirable, or should Round 3
   minimize kernel/version branches and keep the tested portable `openat`
   component walk?
4. What internal timeout split should be frozen beneath the 30-second Host
   limit—for example resolver 2 s, injector 5 s, catch-up 15 s, and at least
   5 s reserved for supervision/cleanup/JSON?
