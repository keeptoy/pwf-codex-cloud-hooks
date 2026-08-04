# Phase 3 Round 4 R4-A Linux/Cloud 验收

> 状态：complete；精确 R4-A commit 的 Linux/Cloud gate PASS
>
> 范围：bounded supervisor、typed protocol seam、inactive plan dispatch
>
> 禁止：不得安装到 live `/opt/codex`，不得激活 `owned-plan.py`，不得进入 R4-B/R4-C 或发布 beta.1

## 已接受结果

2026-08-03 的 Fresh Cloud 执行完整通过：static checks PASS；Linux suite 为
66 tests / 66 PASS / 0 FAIL / 0 SKIP；两层 POSIX process-group cleanup PASS；isolated install
与 doctor PASS；installed inventory 11、development ZIP 21；catch-up production dispatch active；
plan typed seam PASS 但 production dispatch inactive；snapshot leftovers 0；workspace clean。
最终标记为 `R4A_CLOUD_ACCEPTANCE=PASS`。

R4-A 因此关闭。该结果仍不授权 R4-B、live `/opt/codex` 安装或 beta.1 Release。

## 这轮验证什么

R4-A 只替换 adapter 的 child supervision，并建立两条彼此独立的 typed seam：

- catch-up 继续是唯一被生产路径调用的 owned child；
- plan request builder、result validator 和 bounded invocation seam 可被直接测试，但 adapter lifecycle
  不得调用它；
- stdout/stderr 在读取时受限，timeout/overflow 会终止 POSIX process group；
- Linux liveness 使用 `/proc/<pid>/stat` 的 `state + starttime`，zombie 视为已终止，不用
  `kill -0` 误判；
- alpha.2 的六个 golden output 保持 byte-exact；
- Managed Hook policy 仍只注册 adapter，installed inventory 仍为 11，development ZIP 仍为 21。

这轮不验证 R4-B 的 plan-first lifecycle、canonical project forwarding、adapter thinning 或新 beta
golden，也不执行 fresh/resume runtime 黑盒；这些都需要 R4-A 关闭后另行授权。

## Fresh Cloud 提示词

把包含 R4-A 修改的精确 commit 推送后，在一个未运行仓库初始化脚本的全新 Codex Cloud sandbox
中检出该 commit。不要安装到 `/opt/codex`。然后让云端模型执行：

```text
这是 pwf-codex-cloud-hooks Phase 3 Round 4 R4-A Linux/Cloud acceptance。

请在当前仓库执行 docs/phase-3-round-4-r4a-cloud-acceptance.md 中“唯一执行脚本”的完整
Bash 代码块，不要删改命令，不要安装到 live /opt/codex。完成后逐字返回脚本完整 stdout，
并严格汇总：

Linux suite: PASS 或 FAIL
Tests: 实际 tests/pass/fail/skipped 数字
Static checks: PASS 或 FAIL
Isolated install: PASS 或 FAIL
Installed runtime files: 实际数字
Doctor healthy: true 或 false
Catch-up production dispatch: ACTIVE 或 NOT_ACTIVE
Plan typed seam: PASS 或 FAIL
Plan production dispatch: INACTIVE 或 ACTIVE
POSIX process-group cleanup: PASS 或 FAIL
Development ZIP entries: 实际数字
Workspace clean after test: YES 或 NO
R4-A Cloud acceptance: PASS 或 FAIL

任何检查失败都停止并返回实际失败，不要为了得到 PASS 修改仓库、弱化断言或进入 R4-B。
```

## 唯一执行脚本

```bash
set -Eeuo pipefail

REPO_ROOT="$(pwd -P)"
PROBE_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$PROBE_ROOT"' EXIT

printf 'PROBE_VERSION=PWF_PHASE3_ROUND4_R4A_CLOUD_V1\n'
printf 'REPO_ROOT=%s\n' "$REPO_ROOT"
python3 --version
node --version

python3 -m py_compile hooks/hook_adapter.py
node --check install.js
node --check tests/runtime-supervisor.test.js
bash -n init-cloud-sandbox-v0.3.0.bash
git diff --check
printf 'STATIC_CHECKS=PASS\n'

node --test --test-reporter=tap tests/*.test.js | tee "$PROBE_ROOT/tests.tap"
grep -Eq '^# tests 66$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# pass 66$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# fail 0$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# skipped 0$' "$PROBE_ROOT/tests.tap"
grep -Fq 'ok 37 - owned plan kills the injector process group, bounds output, and cleans snapshots' "$PROBE_ROOT/tests.tap"
grep -Fq 'ok 54 - POSIX timeout terminates the runtime process group' "$PROBE_ROOT/tests.tap"
printf 'LINUX_SUITE=PASS tests=66 pass=66 fail=0 skipped=0\n'
printf 'POSIX_PROCESS_GROUP_CLEANUP=PASS\n'

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
import ast
import importlib.util
import json
import os
from pathlib import Path
import stat
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

adapter_path = runtime / "hook_adapter.py"
adapter_source = adapter_path.read_text(encoding="utf-8")
adapter_tree = ast.parse(adapter_source)
assert "subprocess.run(" not in adapter_source
assert 'sibling_runtime_path("catchup")' in adapter_source
assert 'sibling_runtime_path("plan")' not in adapter_source
assert any(isinstance(node, ast.FunctionDef) and node.name == "invoke_plan_runtime" for node in ast.walk(adapter_tree))
assert not any(
    isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "invoke_plan_runtime"
    for node in ast.walk(adapter_tree)
)

assert stat.S_IMODE((runtime / "hook_adapter.py").stat().st_mode) == 0o755
assert stat.S_IMODE((runtime / "owned-plan.py").stat().st_mode) == 0o755

project = probe_root / "project"
plan = project / ".planning/cloud-r4a"
plan.mkdir(parents=True)
(project / ".planning/.active_plan").write_text("cloud-r4a\n", encoding="utf-8")
(plan / "task_plan.md").write_text("# PWF R4-A Cloud\n", encoding="utf-8")
(plan / "progress.md").write_text("- inactive seam ready\n", encoding="utf-8")

spec = importlib.util.spec_from_file_location("installed_hook_adapter", adapter_path)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)
request = module.build_plan_context_request(
    "UserPromptSubmit",
    {"session_id": "r4a-cloud", "turn_id": None},
    project,
)
assert request is not None
result, failure = module.invoke_plan_runtime(runtime / "owned-plan.py", request)
assert failure is None, failure
assert result is not None
assert result["outcome"] == "context_emitted"
assert result["inject"] is True
assert result["project"]["root"] == str(project)
assert result["project"]["plan_scope"] == "scoped"
assert result["project"]["plan_dir"] == str(plan)
assert "# PWF R4-A Cloud" in result["context"]

snapshot_base = Path("/tmp") / f"pwf-codex-cloud-hooks-{os.geteuid()}"
leftovers = [] if not snapshot_base.exists() else sorted(
    item.name for item in snapshot_base.iterdir() if item.name.startswith("pwf-snapshot-")
)
assert leftovers == [], leftovers

print("ISOLATED_INSTALL=PASS")
print("INSTALLED_RUNTIME_FILES=11")
print("DOCTOR_HEALTHY=true")
print("CATCHUP_PRODUCTION_DISPATCH=ACTIVE")
print("PLAN_TYPED_SEAM=PASS")
print("PLAN_PRODUCTION_DISPATCH=INACTIVE")
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
printf 'R4A_CLOUD_ACCEPTANCE=PASS\n'
```

## PASS 条件与后续边界

只有以下条件全部成立，才能把 R4-A 标为 complete：

- Linux 为 `66 tests / 66 pass / 0 fail / 0 skipped`；
- 两层 process-group cleanup 测试都 PASS，没有 executable descendant；
- isolated install、doctor、11-file inventory 和 21-entry ZIP 全部 PASS；
- installed adapter 的 catch-up production dispatch 仍 active；
- installed plan typed seam 直接调用 PASS，但 production dispatch 仍 inactive；
- snapshot leftovers 为 0，测试后仓库 clean。

通过后只关闭 R4-A。进入 R4-B 前仍需用户明确继续；本文件不是激活授权，也不是 beta.1
Release 验收。
