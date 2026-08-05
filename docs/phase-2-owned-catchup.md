# Phase 2 Owned Catch-up Runtime

> Phase status: complete; active through the SessionStart adapter supervisor
>
> Accepted release: `v0.3.0-alpha.2` fresh-Cloud hard acceptance PASS
>
> Historical role: `v0.3.0-alpha.2` was the accepted Phase 3 rollback baseline; published / Cloud-accepted beta.1 is current
>
> Historical predecessor: retained `v0.3.0-alpha.1`, no longer the active baseline

This document freezes the Phase 2/alpha.2 boundary. Present-tense lifecycle statements below describe that
accepted version at its Phase 2 checkpoint; the current beta.1 chain is documented in the root README and
the Phase 3 canonical plan-context guide.

## Owned-runtime boundary

`runtime/owned-catchup.py` is local managed-runtime code. It reads one
`adapter-runtime-request-v1` object from stdin and writes one
`runtime-result-v1` object to stdout. It reuses the pinned
`runtime/upstream/session-catchup.py` parsing and extraction functions; it does
not discover or execute a mutable global Skill file.

The file is installed, hashed, doctor-checked, repairable, and packaged. Managed
requirements still register only `hook_adapter.py`; for SessionStart the adapter
now builds the strict v1 request and supervises the sibling owned child. A child
timeout, crash, malformed result, or unsafe transcript remains advisory to the
Codex loop: canary and safe local plan context survive, but catch-up text does
not inject. UserPromptSubmit remains local until Phase 3.

## Plan and session policy

The adapter now resolves one project state with this plan precedence:

1. safe `PLAN_ID`;
2. BOM-tolerant `.planning/.active_plan`;
3. newest valid scoped plan; and
4. a legacy root `task_plan.md`.

The selected directory, `task_plan.md`, and optional `progress.md` must each
canonicalize inside the project root. A symlink or junction may not turn a
safe-looking scoped plan into external injected content.

Session isolation is backward-compatible. With no safe direct
`.planning/sessions/<session_id>.attached` files, the adapter preserves legacy
visibility for every session. Once any safe regular marker exists, only the
exact matching Host session is attached. Marker contents are ignored and
never injected; unsafe identifiers, directories, symlinks, and indirect
markers do not enable isolation or attach a session.

`PLANNING_DISABLED=1` takes priority over both paths: it keeps the lifecycle
canary but suppresses planning context and SessionStart catch-up. The v1
runtime request carries `planning_enabled`, `session_attachment`, and the one
resolved plan state. Its safe results distinguish `planning_disabled`,
`session_not_attached`, and `no_plan` without exposing plan or transcript text.

## Transcript selection

For `host_path_state=validated`, the runtime independently requires:

1. at least one explicit allowed session-store root;
2. canonical containment beneath one of those roots;
3. a regular non-symlink `rollout-*.jsonl` file;
4. a `session_meta.id` / `session_meta.session_id` matching request
   `event.session_id`; and
5. `session_meta.cwd` matching the requested project root.

An identity mismatch fails closed with `session_identity_mismatch`. Other Host
path rejection uses scan fallback only when the request explicitly permits it.
Fallback enumerates only the supplied roots and reports
`scan_fallback_used`; installation paths and ambient `CODEX_HOME` are not used
to invent a store.

## Output boundary

Only `outcome=report_emitted` sets `inject=true`. Every other result has a null
report and safe selection metadata only. The compatibility renderer retains
the frozen 15-message, four-tool, assistant-300, user-head/tail limits and
rejects a report beyond 20,000 characters.

## Transcript normalization and diagnostics

Selected transcripts are read as strict UTF-8 line-delimited object JSON. An
invalid UTF-8, invalid/non-object JSON, or record beyond 1,000,000 bytes yields
`malformed_transcript` and never injects partial context. Valid unknown record
families are ignored with `unknown_transcript_record`.

In mixed Cloud transcripts, `response_item` is the authoritative conversation
family. Exact adjacent event-family copies produce
`duplicate_record_suppressed`; event user/agent messages are conversation
fallback only when the post-update segment contains no response-item messages.
Successful structured `patch_apply_end` remains the planning-update boundary.

`owned-catchup.py --diagnostic` follows the same selection path but always sets
`inject=false` and `report=null`. If a normal run would emit context, the safe
outcome is `diagnostic_report_available`; diagnostics include selected plan and
transcript paths but no transcript content.

The adapter contains the active SessionStart supervisor. It captures child output
as bounded bytes, decodes strict UTF-8, validates the exact v1 result envelope,
and maps timeout, nonzero exit, malformed/oversized stdout, invalid UTF-8, and
spawn errors to safe failure reasons.

## Global Skill and installation boundary

The bootstrap no longer applies `PWF_CODEX_CLOUD_COMPAT_PATCH` to the global
Skill, and the adapter no longer discovers or executes global
`scripts/session-catchup.py`. The installer requires the separately installed
Skill to match pristine upstream v3.8.2 hashes. Compatibility overlays remain
only in the owned imported copy and its provenance ledger; the historical
patcher stays in the repository for reproduction but is excluded from alpha.2.

Owned runtime directories are installed as `0755`; executable runtime files are
`0755`, data/notice files are `0644`, and the installation manifest remains
private. This permits a distinct Hook user to traverse and read the owned code
without making writable state public. Project and session-store directories must
independently be readable by that Hook identity. Windows is development-test
equivalence only, not a supported managed target.

## Round 4 acceptance result

The sealed alpha.2 acceptance snapshot registers 45 cases. On Windows, 42 pass
and three Linux-only runtime/permission cases skip. The then-current development tree
added one inactive Phase 3 contract regression and tracked it separately. Fresh
Linux Codex Cloud acceptance proved the
exact ZIP SHA and inventory, pristine global Skill, healthy doctor, real owned
catch-up under root/root, synthetic install-user / Hook-user readability, Host
transcript selection, tail-sentinel preservation, UserPrompt remaining local,
automatic P2-A through P2-D lifecycle behavior, and healthy P2-E doctor after
resume. Phase 2 is complete, and alpha.2 became the Phase 3 rollback baseline; beta.1 later superseded that
current-role assignment without changing the immutable alpha.2 evidence.
