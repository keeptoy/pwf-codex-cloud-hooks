# beta.2 精简仓库 M1 exact-mirror Linux/Cloud 验收

> 状态：可复制验收门槛；不属于新 Release，也不安装到 live `/opt/codex`。  
> 目标：证明候选 audit ref 是已验收 beta.2 的同一 Git tree，并在 Linux/Cloud 中完成 69/69、Git mode、LF、importer 和双资产字节复核。  
> 非目标：不创建未来 `main`，不做 M2 精简，不修改 product/schema/installer identity，不运行 live A–F，不进入 Phase 4。

## 1. 固定身份

| 项目 | M1 冻结值 |
|---|---|
| 候选 slug | `keeptoy/pwf-codex-cloud-hooks-next` |
| audit ref | `audit/beta2-exact` |
| source commit | `bbad3703fe2bc3f34bda6ec350f8cfea6f7a159b` |
| source tree | `ff49c3c6656386e94450ccb24437a1c2d1c50e95` |
| tracked files | 83 |
| Git `100755` files | 4 |
| ZIP | 22 entries / 84,572 bytes |
| ZIP SHA-256 | `812cc9cdcafa93b5fcc47cc763fd743f11be77958b75eea1fa4cf0508dd391ab` |
| bootstrap | 17,425 bytes |
| bootstrap SHA-256 | `d572b77d920b34c34c7912ba364376ae3668216f00ce350251bd7c8b336abcd6` |

本地 M1 已证明旧仓库与候选仓库具有相同 commit、tree 和 83 个 index mode/blob/path，并在修正候选仓库本地 checkout 配置后通过 Windows 69 registered / 51 PASS / 18 honest POSIX skips / 0 FAIL。

## 2. 执行前提

在全新 Linux/Cloud clone 中 checkout `audit/beta2-exact`。如果候选 GitHub 仓库尚未创建，可以把本脚本保留到 audit ref 可访问时再执行；M1 的既有 beta.2 Cloud 69/69 和 A–F 证据通过 exact tree/asset identity 继续有效。

执行期间：

- 不运行 bootstrap；
- 不安装到 `/opt/codex`；
- 不修改、commit 或 push 仓库；
- 不自动 checkout 其他 commit；
- 任一断言失败立即停止，并把完整 stdout/stderr 交回旧仓库的 M1 planning 记录。

## 3. 唯一执行脚本

```bash
set -Eeuo pipefail

EXPECTED_COMMIT="bbad3703fe2bc3f34bda6ec350f8cfea6f7a159b"
EXPECTED_TREE="ff49c3c6656386e94450ccb24437a1c2d1c50e95"
EXPECTED_ZIP_SHA256="812cc9cdcafa93b5fcc47cc763fd743f11be77958b75eea1fa4cf0508dd391ab"
EXPECTED_BOOTSTRAP_SHA256="d572b77d920b34c34c7912ba364376ae3668216f00ce350251bd7c8b336abcd6"
PROBE_DIR="$(mktemp -d)"
trap 'rm -rf -- "$PROBE_DIR"' EXIT
ZIP="$PROBE_DIR/pwf-codex-cloud-hooks-v0.3.0-beta.2.zip"

printf 'PROBE_VERSION=PWF_BETA2_SLIM_M1_EXACT_MIRROR_CLOUD_V1\n'
printf 'REPO_ROOT=%s\n' "$(pwd)"
python3 --version
node --version

test -z "$(git status --short)"
test "$(git rev-parse HEAD)" = "$EXPECTED_COMMIT"
test "$(git rev-parse 'HEAD^{tree}')" = "$EXPECTED_TREE"
test "$(git ls-files | wc -l)" -eq 83

EXPECTED_EXECUTABLES="$PROBE_DIR/expected-executables.txt"
ACTUAL_EXECUTABLES="$PROBE_DIR/actual-executables.txt"
cat > "$EXPECTED_EXECUTABLES" <<'EOF'
runtime/upstream/inject-plan.sh
runtime/upstream/ledger-summary.sh
runtime/upstream/resolve-plan-dir.sh
runtime/upstream/session-catchup.py
EOF
git ls-tree -r HEAD | awk '$1 == "100755" {sub(/^.*\t/, ""); print}' | sort > "$ACTUAL_EXECUTABLES"
cmp "$EXPECTED_EXECUTABLES" "$ACTUAL_EXECUTABLES"
test "$(wc -l < "$ACTUAL_EXECUTABLES")" -eq 4
while IFS= read -r path; do
  test -x "$path"
done < "$ACTUAL_EXECUTABLES"
printf 'GIT_MODES=PASS files=4 mode=100755\n'

printf '%s  %s\n' \
  'bfcdbbbf883bc0db95f84d095d58021fc1a6b97eeeab23cd373f6261779fb232' \
  'tests/fixtures/planning-with-files/SKILL.md' | sha256sum --check -
printf '%s  %s\n' \
  '38a1c5effb35f9506e2e371ccabb6be6e4f4170acc18f1811f08d634f5f0e9bd' \
  'snapshot-prototype/upstream/resolve-plan-dir.sh' | sha256sum --check -
printf '%s  %s\n' \
  '72c7904ec9a03f994d349ac1b9b3cfe484b417e738b25c0545d9ae11a2cc0364' \
  'snapshot-prototype/upstream/inject-plan.sh' | sha256sum --check -
printf 'HASH_SENSITIVE_LF=PASS\n'

export PYTHONDONTWRITEBYTECODE=1
python3 tools/import_upstream_runtime.py check
python3 - <<'PY'
from pathlib import Path

for name in (
    "hooks/hook_adapter.py",
    "runtime/owned-catchup.py",
    "runtime/owned-plan.py",
    "tools/build_release.py",
    "tools/import_upstream_runtime.py",
):
    compile(Path(name).read_text(encoding="utf-8"), name, "exec")
print("PYTHON_STATIC=PASS")
PY
node --check install.js

TEST_OUTPUT="$PROBE_DIR/npm-test.tap"
npm test 2>&1 | tee "$TEST_OUTPUT"
grep -Eq '^# tests 69$' "$TEST_OUTPUT"
grep -Eq '^# pass 69$' "$TEST_OUTPUT"
grep -Eq '^# fail 0$' "$TEST_OUTPUT"
grep -Eq '^# skipped 0$' "$TEST_OUTPUT"
printf 'LINUX_SUITE=PASS tests=69 pass=69 fail=0 skipped=0\n'

python3 tools/build_release.py build --output "$ZIP"
python3 tools/build_release.py check --archive "$ZIP"
test "$(unzip -Z1 "$ZIP" | wc -l)" -eq 22
test "$(wc -c < "$ZIP")" -eq 84572
printf '%s  %s\n' "$EXPECTED_ZIP_SHA256" "$ZIP" | sha256sum --check -
test "$(wc -c < init-cloud-sandbox-v0.3.0.bash)" -eq 17425
printf '%s  %s\n' "$EXPECTED_BOOTSTRAP_SHA256" \
  'init-cloud-sandbox-v0.3.0.bash' | sha256sum --check -

test -z "$(find . -type d -name __pycache__ -print -quit)"
test -z "$(git status --short)"

printf 'ZIP_ENTRIES=22\n'
printf 'ZIP_SIZE=84572\n'
printf 'ZIP_SHA256=%s\n' "$EXPECTED_ZIP_SHA256"
printf 'BOOTSTRAP_SIZE=17425\n'
printf 'BOOTSTRAP_SHA256=%s\n' "$EXPECTED_BOOTSTRAP_SHA256"
printf 'WORKSPACE_CLEAN=YES\n'
printf 'M1_EXACT_MIRROR_CLOUD_ACCEPTANCE=PASS\n'
```

## 4. 严格汇总口径

Cloud 模型必须按以下字段汇总：

```text
Commit identity: PASS 或 FAIL
Tree identity: PASS 或 FAIL
Tracked files: 实际数字
Git modes: PASS 或 FAIL
Hash-sensitive LF: PASS 或 FAIL
Importer healthy: true 或 false
Linux suite: PASS 或 FAIL
Tests: tests/pass/fail/skipped
ZIP entries: 实际数字
ZIP size: 实际数字
ZIP SHA-256: 实际值
Bootstrap size: 实际数字
Bootstrap SHA-256: 实际值
Workspace clean: YES 或 NO
M1 exact-mirror Cloud acceptance: PASS 或 FAIL
```

只有最后一行输出 `M1_EXACT_MIRROR_CLOUD_ACCEPTANCE=PASS` 才算完整通过。Windows 的 18 个诚实 SKIP 不能替代 Linux 69/69；反过来，Linux PASS 也不能掩盖 fresh Windows checkout 的 LF 合同缺口，该缺口必须在 M2 的 `.gitattributes` 中修复。

## 5. 结论边界

本门槛通过只说明 M1 audit ref 与 beta.2 冻结树等价。它不代表：

- M2 精简已经开始或完成；
- 新仓库 `main` 已建立；
- `0.3.0-beta.3-dev` 已产生；
- GitHub cutover、Release 或 live Cloud 安装已获授权；
- Phase 4 已获授权。

M1 关闭后，下一轮必须先建立 M2 精简清单和 root-commit 边界，再改任何候选文件。
