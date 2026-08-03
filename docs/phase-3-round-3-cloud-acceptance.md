# Phase 3 Round 3 Inactive Cloud Acceptance

> Status: pending execution against the exact pushed Round 3 commit
>
> Scope: Linux/Cloud execution of the inactive owned-plan trusted graph
>
> Activation: forbidden; `hook_adapter.py` and live `/opt/codex` Hooks remain unchanged

## 这轮比 alpha.2 黑盒多测什么

- 在 Linux 上执行全部 63 项测试，尤其是 Windows 会跳过的 8 项 production
  `owned-plan.py` 测试；
- 验证 single-link fd read、task/progress race、FIFO/hard-link、0700/0600 snapshot、
  process-group timeout、stale cleanup 与 scrubbed managed-legacy 输出；
- 把当前源码安装到隔离的临时 Codex home，验证 11 个受管 runtime 文件及其哈希、
  mode、doctor/repair 边界；
- 直接调用“已安装但未激活”的 `owned-plan.py`，验证 exact-v1 result；
- 构建并检查 21-entry development ZIP，同时证明外部 bootstrap 仍不进入 ZIP；
- 证明 adapter 与 Managed Hook command 仍只指向 `hook_adapter.py`。

## 这轮不测什么

- 不修改或重装 live `/opt/codex`；
- 不运行新的 startup/UserPrompt automatic lifecycle 黑盒，因为 owned-plan 尚未 dispatch；
- 不重复 P2-A–P2-E 的真实 resume catch-up 验收；alpha.2 仍是回滚基线；
- 不发布 beta.1，不写 ZIP SHA 到外部 bootstrap；
- 不测试 Phase 4 的 `.mode`、attestation、nonce、smart injection 或 ledger 行为。

## Fresh Cloud 执行提示词

把待验收的 Round 3 commit 推送后，在全新 Codex Cloud sandbox 中检出该 commit。不要设置
本仓库初始化脚本，也不要先安装到 `/opt/codex`。然后让云端模型执行：

```text
这是 pwf-codex-cloud-hooks Phase 3 Round 3 inactive Cloud acceptance。

请在当前仓库执行 docs/phase-3-round-3-cloud-acceptance.md 中
“唯一执行脚本”的完整 Bash 代码块，不要删改命令，也不要把测试安装到 live
/opt/codex。完成后逐字返回脚本完整 stdout，并严格汇总：

Linux suite: PASS 或 FAIL
Tests: 实际 tests/pass/fail/skipped 数字
Isolated install: PASS 或 FAIL
Installed runtime files: 实际数字
Doctor healthy: true 或 false
Owned-plan direct exact-v1: PASS 或 FAIL
Adapter dispatch unchanged: PASS 或 FAIL
Development ZIP entries: 实际数字
Workspace clean after test: YES 或 NO
Round 3 inactive Cloud acceptance: PASS 或 FAIL
```

## 唯一执行脚本

```bash
set -Eeuo pipefail

REPO_ROOT="$(pwd -P)"
PROBE_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$PROBE_ROOT"' EXIT

printf 'PROBE_VERSION=PWF_PHASE3_ROUND3_INACTIVE_CLOUD_V1\n'
printf 'REPO_ROOT=%s\n' "$REPO_ROOT"
python3 --version
node --version

node --test --test-reporter=tap tests/*.test.js | tee "$PROBE_ROOT/tests.tap"
grep -Eq '^# tests 63$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# pass 63$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# fail 0$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# skipped 0$' "$PROBE_ROOT/tests.tap"
printf 'LINUX_SUITE=PASS tests=63 pass=63 fail=0 skipped=0\n'

ISOLATED_HOME="$PROBE_ROOT/codex"
ISOLATED_REQUIREMENTS="$PROBE_ROOT/etc/codex/requirements.toml"
mkdir -p "$(dirname "$ISOLATED_REQUIREMENTS")"

node install.js install --json \
  --codex-home "$ISOLATED_HOME" \
  --skill-root "$REPO_ROOT/tests/fixtures/planning-with-files" \
  --managed-requirements "$ISOLATED_REQUIREMENTS" \
  > "$PROBE_ROOT/install.json"

node install.js doctor --json \
  --codex-home "$ISOLATED_HOME" \
  --skill-root "$REPO_ROOT/tests/fixtures/planning-with-files" \
  --managed-requirements "$ISOLATED_REQUIREMENTS" \
  > "$PROBE_ROOT/doctor.json"

python3 - "$ISOLATED_HOME" "$ISOLATED_REQUIREMENTS" "$PROBE_ROOT" <<'PY'
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

codex_home = Path(sys.argv[1])
requirements_path = Path(sys.argv[2])
probe_root = Path(sys.argv[3])
runtime = codex_home / "hooks/planning-with-files"

expected = {
    "THIRD_PARTY_NOTICES.md",
    "compatibility-overlays-v1.json",
    "contracts/adapter-plan-context-request-v1.schema.json",
    "contracts/plan-context-result-v1.schema.json",
    "hook_adapter.py",
    "owned-catchup.py",
    "owned-plan.py",
    "upstream/inject-plan.sh",
    "upstream/ledger-summary.sh",
    "upstream/resolve-plan-dir.sh",
    "upstream/session-catchup.py",
}
actual = {
    path.relative_to(runtime).as_posix()
    for path in runtime.rglob("*")
    if path.is_file() and path.name != "installed-manifest.json"
}
assert actual == expected, (sorted(actual), sorted(expected))

manifest = json.loads((runtime / "installed-manifest.json").read_text(encoding="utf-8"))
assert len(manifest["runtime_files"]) == 11
assert {item["path"] for item in manifest["runtime_files"]} == expected

doctor = json.loads((probe_root / "doctor.json").read_text(encoding="utf-8"))
assert doctor["healthy"] is True
assert doctor["repairable"] is False
assert doctor["errors"] == []
assert doctor["blockers"] == []

requirements = requirements_path.read_text(encoding="utf-8")
assert requirements.count("hook_adapter.py") == 2
assert "owned-plan.py" not in requirements
adapter = (runtime / "hook_adapter.py").read_text(encoding="utf-8")
assert "owned-plan.py" not in adapter
assert "adapter-plan-context-request-v1" not in adapter
assert "plan-context-result-v1" not in adapter

assert stat.S_IMODE((runtime / "owned-plan.py").stat().st_mode) == 0o755
for name in (
    "adapter-plan-context-request-v1.schema.json",
    "plan-context-result-v1.schema.json",
):
    assert stat.S_IMODE((runtime / "contracts" / name).stat().st_mode) == 0o644

project = probe_root / "project"
plan = project / ".planning/cloud-round3"
plan.mkdir(parents=True)
(project / ".planning/.active_plan").write_text("cloud-round3\n", encoding="utf-8")
(plan / "task_plan.md").write_text("# PWF Round 3 Cloud\n", encoding="utf-8")
(plan / "progress.md").write_text("2026-08-03T12:34:56Z ready\n", encoding="utf-8")
request = {
    "schema_version": 1,
    "runtime": "codex",
    "event": {
        "name": "UserPromptSubmit",
        "source": None,
        "session_id": None,
        "turn_id": None,
    },
    "project": {"root": str(project), "plan_id": None},
    "policy": {"planning_enabled": True, "behavior_profile": "managed_legacy"},
    "output_budget": {
        "max_context_chars": 20000,
        "max_plan_lines": 50,
        "max_progress_lines": 20,
    },
}
completed = subprocess.run(
    ["python3", str(runtime / "owned-plan.py")],
    input=json.dumps(request).encode("utf-8"),
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    timeout=10,
    check=False,
)
assert completed.returncode == 0, completed.stderr.decode("utf-8", "replace")
assert completed.stderr == b""
result = json.loads(completed.stdout.decode("utf-8"))
assert result["outcome"] == "context_emitted"
assert result["inject"] is True
assert result["project"]["plan_scope"] == "scoped"
assert result["project"]["plan_dir"] == str(plan)
assert "# PWF Round 3 Cloud" in result["context"]
assert "2026-08-03T00:00:00Z ready" in result["context"]
assert result["warnings"] == []

snapshot_base = Path("/tmp") / f"pwf-codex-cloud-hooks-{os.geteuid()}"
leftovers = [] if not snapshot_base.exists() else sorted(
    item.name for item in snapshot_base.iterdir() if item.name.startswith("pwf-snapshot-")
)
assert leftovers == [], leftovers

print("ISOLATED_INSTALL=PASS")
print("INSTALLED_RUNTIME_FILES=11")
print("DOCTOR_HEALTHY=true")
print("OWNED_PLAN_DIRECT_EXACT_V1=PASS")
print("ADAPTER_DISPATCH_UNCHANGED=PASS")
print("SNAPSHOT_LEFTOVERS=0")
PY

python3 tools/build_release.py build --output "$PROBE_ROOT/candidate.zip" \
  > "$PROBE_ROOT/build.json"
python3 tools/build_release.py check --archive "$PROBE_ROOT/candidate.zip" \
  > "$PROBE_ROOT/check.json"

python3 - "$PROBE_ROOT" <<'PY'
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
build = json.loads((root / "build.json").read_text(encoding="utf-8"))
check = json.loads((root / "check.json").read_text(encoding="utf-8"))
assert build["entries"] == 21
assert check["healthy"] is True
print("DEVELOPMENT_ZIP_ENTRIES=21")
print("DEVELOPMENT_ZIP_CHECK=PASS")
PY

git diff --exit-code
test -z "$(git status --short)"
printf 'WORKSPACE_CLEAN_AFTER_TEST=YES\n'
printf 'ROUND3_INACTIVE_CLOUD_ACCEPTANCE=PASS\n'
```

## 判定

只有以下条件全部成立才关闭 Round 3：

- `tests=63 pass=63 fail=0 skipped=0`；
- isolated install 与 doctor PASS，runtime files 恰好 11；
- installed `owned-plan.py` direct exact-v1 PASS；
- adapter/requirements 均未 dispatch `owned-plan.py`；
- development ZIP 恰好 21 entries 且 check PASS；
- snapshot leftovers 为 0；
- 测试后工作区 clean。

任何 FAIL 都留在 Round 3；不得因此启用 adapter 或进入 Round 4。这里不要求 Resume：
single-link Fresh/Resume gate 已独立通过，而本轮 runtime 仍未接入自动 lifecycle。

如果唯一失败是 test 37 的 `injector descendant survived process-group timeout`，不要直接
修改 supervisor 或把 `kill -0` 重试时间继续加长。先执行
[`phase-3-round-3-process-group-diagnostic.md`](phase-3-round-3-process-group-diagnostic.md)
中的只读 Cloud 诊断，区分 live descendant、terminated zombie 和 PID reuse，再按证据选择
test-only 或 runtime-and-test 修复边界。
