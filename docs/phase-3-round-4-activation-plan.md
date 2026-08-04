# Phase 3 Round 4 Activation Plan

> Status: R4-A and R4-B complete / Linux Cloud PASS; R4-C pre-publication Cloud seal PASS, publish and live A–F pending
>
> Rollback baseline: Cloud-accepted `v0.3.0-alpha.2`
>
> Target candidate: `v0.3.0-beta.1`, only after local/Linux gates pass

## Conclusion

Round 4 is feasible without changing either exact-v1 schema and without adding
another runtime artifact. The safe implementation is not one large edit. Keep
Phase 3 as four rounds, but execute its final round through three ordered gates:

1. **R4-A — supervisor and protocol seam:** make child execution bounded and
   type-aware while plan dispatch remains inactive;
2. **R4-B — atomic canonical activation:** run owned-plan first for both events,
   forward its exact project state to SessionStart catch-up, and delete the
   adapter's parallel resolver/renderer in the same change; and
3. **R4-C — beta seal and Cloud acceptance:** freeze the beta artifact, publish
   immutable assets, run fresh/resume acceptance, and close Phase 3 only after
   post-resume doctor remains healthy.

This subdivision is a risk-control sequence, not three new project phases and
not a change to the four-round Phase 3 architecture.

## Fixed boundaries

- Managed requirements continue to register one command only:
  `hook_adapter.py` for each lifecycle event.
- `owned-plan.py` is the sole owner of opt-out, session attachment, plan
  resolution, safe task/progress reads, private snapshot creation, pristine
  injector execution, and canonical project state.
- `owned-catchup.py` remains the sole owner of transcript selection,
  normalization, update detection, bounded unsynced context, and catch-up
  rendering.
- The adapter owns Host payload normalization, explicit request construction,
  sibling child selection, bounded supervision, strict result validation,
  composition order, canary emission, and Codex Hook JSON.
- There is no fallback to the old adapter plan resolver or renderer. An owned
  plan failure is fail-closed for context injection and fail-open for the Codex
  loop: emit valid JSON containing the canary only.
- The global planning-with-files Skill remains pristine and is never a runtime
  dependency. The controlled-snapshot prototype remains outside the trusted
  graph; production uses the already-installed Round 3 implementation.
- Installed inventory remains 11 files and the development ZIP remains 21
  entries unless a contract change is separately approved.

## Canonical event flow

```text
Host stdin
  -> adapter validates event and bounded Host fields
  -> adapter emits/retains lifecycle canary
  -> adapter invokes owned-plan.py (SessionStart and UserPromptSubmit)
       -> invalid/non-injecting result: stop, canary only
       -> valid context_emitted: retain exact context + exact project object
  -> SessionStart only, after a valid resolved plan:
       adapter validates transcript/session roots
       adapter invokes owned-catchup.py with the exact returned project object
  -> compose additionalContext in this stable order:
       canary
       optional catch-up report
       optional plan context
  -> emit one Codex hookSpecificOutput JSON object
```

UserPromptSubmit never invokes catch-up. SessionStart never invokes catch-up
before a valid plan result. The adapter must not reconstruct the project object
from diagnostic fields or resolve its paths again.

## Strict validation and failure matrix

The byte supervisor is generic; result validation is not. Plan and catch-up
must have separate exact-key/type/outcome validators.

In addition to the JSON-schema invariants, plan-result validation must bind the
result to its request: event identity and planning state must agree, the result
root must equal the requested canonical root, diagnostic selection must agree
with the project object, and a resolved plan directory must be lexically
contained by that root with scope-consistent shape. These are relational checks,
not a second filesystem resolver.

| Condition | Catch-up runs | Injected context |
|---|---:|---|
| Invalid/missing Host fields needed for a plan request | no | canary only |
| Plan child missing, timeout, nonzero, oversized, invalid UTF-8/JSON, or invalid envelope | no | canary only |
| Valid plan result with `inject=false` | no | canary only |
| UserPromptSubmit with valid `context_emitted` | no | canary, then plan |
| SessionStart with valid plan and valid injecting catch-up | yes | canary, catch-up, then plan |
| SessionStart with valid plan and non-injecting/failed catch-up | yes | canary, then plan |
| Unexpected adapter composition error | no further child | valid canary-only Hook JSON |

Child stderr is bounded diagnostic material and never enters stdout or model
context. There is no retry inside one Hook invocation.

## One deadline under the Host timeout

The Host policy remains 30 seconds. The adapter creates one monotonic internal
deadline 27 seconds after invocation, preserving at least three seconds of Host
margin.

- `owned-plan.py` retains its internal 8-second work-and-cleanup budget:
  resolver 2 seconds, injector 5 seconds, and one second reserved for cleanup.
- The outer supervisor allows a small bounded grace (initially 0.5 seconds)
  after that internal budget so it does not kill the plan parent at the same
  instant the child is cleaning its private snapshot.
- Catch-up receives at most 15 seconds and always receives no more than the
  remaining shared deadline after the adapter reserve.
- Process spawn, streaming stdout/stderr bounds, process-group termination,
  result validation, JSON serialization, and the plan-child outer grace consume
  the existing four-second adapter reserve.
- Every actual wait is `min(component hard cap, remaining shared time after the
  required final serialization/termination reserve)`. A component is skipped
  when that value is non-positive.

The supervisor must bound bytes while reading, not only after `communicate` or
`subprocess.run` has captured unbounded output. On POSIX it starts each direct
child in a new session and kills/waits that process group on timeout or overflow.
A zombie with the same PID is terminated, not executable; Linux liveness tests
must inspect `/proc/<pid>/stat` state and start time rather than use `kill -0`
alone.

`owned-plan.py` already supervises resolver/injector sessions and owns snapshot
cleanup. Adapter-level termination of a pathologically hung plan parent is an
emergency outer boundary, not a replacement for that nested cleanup. Tests must
cover both the ordinary internal timeout/cleanup path and outer parent timeout.

## R4-A — bounded supervisor and typed seam

R4-A may change the development adapter's supervision internals, but must not
dispatch `owned-plan.py` yet.

- Replace the current catch-up-only `subprocess.run(capture_output=True,
  timeout=30)` shape with a bounded byte supervisor under an absolute deadline.
- Keep a catch-up-specific exact result validator and add a separate exact plan
  result validator/request builder.
- Give both sibling runtime paths explicit identities; accept only regular,
  non-symlink sibling files.
- Preserve alpha.2 observable behavior and output order for the still-active
  catch-up/local-renderer path.
- Extend supervisor tests for stdout/stderr overflow, timeout group cleanup,
  spawn/nonzero, malformed UTF-8/JSON, and Windows test fallback where the real
  POSIX child cannot execute.

Gate: the full local suite passes, existing alpha.2 goldens remain byte-exact,
adapter dispatch still excludes owned-plan, and installed/ZIP counts remain
11/21.

Accepted evidence: Windows completed 66 registered / 48 PASS / 18 honest Linux-only
SKIP / 0 FAIL. The copyable Linux/Cloud gate in
[`phase-3-round-4-r4a-cloud-acceptance.md`](phase-3-round-4-r4a-cloud-acceptance.md)
completed 66 PASS / 0 SKIP / 0 FAIL with both process-group layers, isolated install,
doctor, 11/21 inventories, inactive plan dispatch, zero snapshots, and a clean workspace.
R4-A is closed. That acceptance does not authorize R4-B.

## R4-B — atomic activation and adapter thinning

- Invoke owned-plan first for both lifecycle events.
- On SessionStart, build catch-up input only from a validated plan result and
  forward its exact six-field project object.
- Preserve `canary -> catch-up -> plan` composition order.
- Delete adapter containment, plan-candidate selection, active-pointer/newest
  fallback, session-marker interpretation, task/progress reads, and plan-context
  rendering in the same activation change.
- Do not retain a hidden compatibility fallback. Alpha.2 is the external release
  rollback path.
- Update activation tests to install/stub both siblings and prove invocation
  order, exact project forwarding, UserPrompt plan-only behavior, plan-failure
  canary-only behavior, and catch-up-failure plan preservation.
- Execute the real owned path for Linux root/root and synthetic cross-user cases.
- Add a separate beta golden fixture for the two already-approved pristine
  differences; never rewrite the v0.2.2/alpha.2 fixture.

Gate: no parallel plan algorithm remains in the adapter; full Windows tests pass
with honest POSIX skips; full Linux tests pass with zero skips/failures; direct
adapter latency and output-size measurements fit the frozen budgets; doctor is
healthy after an isolated install and upgrade rehearsal.

Accepted evidence: Windows completed 69 registered / 51 PASS / 18 honest
Linux-only SKIP / 0 FAIL. The exact Linux/Cloud procedure completed 69 PASS /
0 SKIP / 0 FAIL; real both-child root/root and synthetic cross-user execution,
both process-group layers, plan-first/exact-project ordering, isolated alpha.2
upgrade, healthy doctor, adapter-only policy, 11/21 inventories, latency/output
budgets, zero snapshots, and a clean workspace all passed. In particular,
the adapter's parallel plan algorithm is absent, immutable alpha composition
goldens and separate beta goldens pass, trusted hashes are synchronized, and the
development ZIP remains 21 entries. The accepted procedure is recorded in
[`phase-3-round-4-r4b-cloud-acceptance.md`](phase-3-round-4-r4b-cloud-acceptance.md).
R4-B is closed. That acceptance alone did not authorize R4-C; the maintainer later authorized the separately gated beta seal.

## R4-C — beta.1 sealing and Cloud acceptance

1. Freeze `0.3.0-beta.1`, exact ZIP inventory, hashes, tests, and documentation.
2. Build the deterministic 21-entry ZIP and record its SHA-256.
3. Only then write beta version/package/ZIP SHA into the ZIP-external
   `init-cloud-sandbox-v0.3.0.bash` and hash the final Bash asset.
4. Publish immutable beta.1 ZIP and Bash assets; verify both downloads and
   checksums.
5. Use a completely fresh Cloud task for install/startup/UserPrompt evidence.
6. Create a real planning update and long tail sentinel, resume the same task,
   verify automatic catch-up plus canonical plan context, then run doctor.

Steps 1–3 and the pre-publication Cloud byte gate are complete. The repaired Fresh Cloud run reproduced
the exact 21-entry ZIP and external bootstrap, and passed importer mode/health, Linux 69/69, LF,
placeholder, and clean-workspace checks. Step 4 publication/download verification and steps 5–6 live
lifecycle evidence remain pending; therefore R4-C and Phase 3 are not yet closed.

Cloud acceptance includes the existing A–F installation/lifecycle checks plus
Round 4-specific proof:

- adapter-only managed policy and pristine global Skill;
- installed inventory 11 and Release inventory 21;
- automatic startup and UserPrompt canaries before any manual file read;
- pristine owned-plan wording for scoped and legacy context;
- no-plan, opt-out, and detached-session canary-only behavior;
- real resume catch-up retaining the wrapper tail and the same selected plan;
- no mutable global Skill script execution;
- no leftover private snapshots;
- measured plan/no-plan Hook latency below the shared deadline; and
- post-resume doctor `healthy=true`, `repairable=false`, with empty errors and
  blockers.

Phase 3 closes only after all of those are PASS. Until then, alpha.2 remains the
documented Cloud rollback asset and the beta candidate must not be described as
accepted current behavior.

Pre-publication sealing adds one final target-Linux checkpoint: the exact commit
must pass 69/69 and rebuild the 21-entry ZIP byte-for-byte at the locally sealed
size/SHA while the external bootstrap hash, LF attributes, placeholders, and
workspace cleanliness remain exact. The copyable gate is
[`phase-3-round-4-r4c-cloud-seal-check.md`](phase-3-round-4-r4c-cloud-seal-check.md).
It does not authorize a substitute Cloud-built artifact; any cross-platform
deflate mismatch pauses publication for an explicit reproducibility decision.

## Rollback and stop conditions

Stop the active Round 4 gate and do not publish or accept beta.1 if any of the following occurs:

- a schema change appears necessary;
- adapter plan resolution/rendering must remain as a runtime fallback;
- output order or any difference beyond the two approved beta changes appears;
- the shared deadline cannot preserve cleanup and Host margin;
- installed/ZIP inventory changes unexpectedly;
- global Skill bytes execute or are mutated; or
- Linux/Cloud leaves an executable descendant or private snapshot behind.

Rollback does not mean rewriting history or mutating the published alpha.2
asset. Before beta publication, revert only the reviewed Round 4 development
change. After beta publication, reinstall the immutable alpha.2 ZIP/bootstrap;
installer backups remain available for restoration of pre-existing managed
files but are not the versioned release rollback mechanism.
