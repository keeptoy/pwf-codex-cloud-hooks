# pwf-codex-cloud-hooks

Personal Codex Cloud installer for the global lifecycle Hooks used by [`OthmanAdi/planning-with-files`](https://github.com/OthmanAdi/planning-with-files).

## Why this exists

Codex can discover the standalone Skill from `$HOME/.agents/skills/planning-with-files`, while project state remains in `AGENTS.md` and `.planning/`. That does **not** install lifecycle Hooks. This package installs the Hook runtime into the active `$CODEX_HOME` and registers it as a system-managed Hook in `/etc/codex/requirements.toml`, without vendoring it into every product repository or relying on interactive `/hooks` approval.

The target deployment model is:

```text
Cloud setup/maintenance
  -> pinned installer artifact + checksum
  -> $CODEX_HOME/hooks/planning-with-files/
  -> managed Hook policy in /etc/codex/requirements.toml
  -> new-session runtime canary
```

## Current phase

Version `0.2.0` is a managed-Hook implementation candidate. It installs only:

- `SessionStart`: optional upstream session catchup followed by active-plan injection;
- `UserPromptSubmit`: active-plan and recent-progress injection.

Both are read-only and emit `PWF_GLOBAL_HOOK_CANARY_V1` during the verification phase.

Configured and verified for `startup` and `resume`, but still awaiting a forced-compaction Cloud test:

- `SessionStart(source=clear|compact)`.

Deferred lifecycle events:

- `PreCompact` and `PostCompact`;
- `PreToolUse`, `PostToolUse`, and `PermissionRequest`;
- `Stop` and completion gating.

## Upstream pin

- release: `v3.8.2`
- commit: `b04ffd9c8f9f93919649d197e5d4ec1bfc06fa14`
- release archive SHA-256: `aabc0781a5625b493d1291ab9b403babc7934ac6f0dcac5d90000087599ce894`

The installer refuses to trust a global Skill whose canonical files do not match `upstream-manifest.json`.

## Commands

```bash
node install.js install --dry-run --json --codex-home /opt/codex
sudo node install.js install --json --codex-home /opt/codex
node install.js doctor --json --codex-home /opt/codex
sudo node install.js uninstall --json --codex-home /opt/codex
```

Optional `--skill-root PATH` selects an explicit global Skill root. Otherwise the installer checks `$HOME/.agents/skills`, `$CODEX_HOME/skills`, then `$HOME/.codex/skills`.

`--managed-requirements PATH` overrides the managed-policy destination for tests or nonstandard deployments. It defaults to `/etc/codex/requirements.toml`. Production installation therefore requires root access. If an existing `hooks.managed_dir` does not contain this package's adapter, installation fails closed instead of replacing an administrator's managed Hook root.

## Safety properties

- backs up affected configuration before writes;
- merges and preserves unrelated requirements and managed Hook handlers;
- uses atomic writes and an exclusive installer lock;
- installs only owned handlers and removes only owned handlers/trust entries;
- validates pinned Skill hashes and installed adapter/managed-Hook definitions;
- supports read-only dry-run and drift-detecting doctor;
- uses the documented system-managed Hook channel and never uses `--dangerously-bypass-hook-trust` or private trust-state keys;
- never installs a second memory system.

The system-managed route is suitable only after Human review of the pinned source and installed commands. The setup account must be authorized to administer `/etc/codex/requirements.toml`.

## Tests

```bash
npm test
```

Tests create both a temporary Codex home and self-contained temporary projects. They verify dry-run immutability, config/Hook merge preservation, idempotence, trust state, doctor drift detection, uninstall ownership, both Hook payloads, and the no-plan canary path. They do not depend on an enclosing OODA checkout and do not write the live `$CODEX_HOME`.

## Cloud deployment sequence

1. Manually move this folder into its dedicated repository.
2. Review and merge the installer implementation.
3. Publish a pinned release archive and record its SHA-256.
4. Put the pinned download/check/install/doctor commands in the Codex Cloud environment setup script.
5. Put doctor/repair in the maintenance script.
6. Reset the environment cache or create a fresh task.
7. Observe the exact canaries before any manual file reads.
8. Remove canaries and recompute/re-review the production Hook hashes after verification.

A release is recommended because setup must consume an immutable, checksummed artifact. During development, a pinned commit archive can be used instead; the sandbox should not download a moving branch or `latest` and auto-trust it.

## Temporary staging boundary

This directory is temporarily staged inside OODA-Cloud because the current Cloud task cannot push directly to the dedicated repository. After Human transfer to `keeptoy/pwf-codex-cloud-hooks`, verification, and acceptance of the external repository PR/release, delete this entire directory from OODA-Cloud in a separate cleanup PR. Keep only the planning evidence and the pinned external release identity.
