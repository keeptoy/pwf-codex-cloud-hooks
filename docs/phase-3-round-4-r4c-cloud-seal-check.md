# Phase 3 Round 4 R4-C pre-publication Cloud seal check

> 状态：PASS；22-entry 自校验候选已于 2026-08-04 通过新的 Fresh Linux/Cloud 精确字节复验
>
> 范围：最终 69/69 Linux、22-entry ZIP 跨平台重建、bootstrap SHA、LF 属性、无占位符、clean workspace
>
> 禁止：本步骤不得发布资产、不得安装到 live `/opt/codex`、不得提前执行 beta.1 lifecycle A～F
>
> 后续状态：上述精确资产已发布，下载复核与 live A～F 已 PASS；本文件保留 pre-publication gate 的历史边界

## 已验收的新候选与已作废证据

唯一执行脚本以退出码 0 和 `R4C_PREPUBLICATION_CLOUD_SEAL=PASS` 完整结束。实际证据为：

- Python 3.14.4，zlib build/runtime 1.3；
- imported runtime Git modes PASS；Linux suite 69/69，0 fail，0 skipped；
- 23 个 Release 路径 LF 属性 PASS；placeholders absent，workspace clean；
- ZIP 22 entries / 84,316 bytes / SHA `c9dd8bf5dea0f50662df0a15d653584b7d9a6f1f0329dfc3c2d55fe33a366f91`；
- bootstrap 17,425 bytes / SHA `0c9d57f53ff980d9d207bc8291b1f055058000e45258732b19156ec93b8b1f2a`；
- ZIP 新增 `tools/build_release.py`，使发布下载 A1 能在解压包内按同一合同自校验；该工具不进入
  installed runtime 或 adapter dispatch。

先前 21-entry ZIP 的 Fresh Cloud seal 曾完整 PASS，但发布下载 A1 暴露 package-local verifier 缺失，
因此旧 ZIP/bootstrap SHA 和旧 PASS 已作废，不再授权发布。本次 PASS 只授权发布上述两个精确资产；
它不替代发布后下载复核，也不替代
[`v0.3.0-beta.1-cloud-hard-acceptance.md`](v0.3.0-beta.1-cloud-hard-acceptance.md) 的 live 黑盒 A～F。

## 为什么在发布前增加这一关

R4-C-A 已证明没有显式 LF 属性时，Windows autocrlf checkout 会改变五个 ZIP 输入和最终 SHA。
修复后，Windows fresh checkout 与当前 checkout 已构建出相同 ZIP。本次又在目标 Linux/Cloud
Python/zlib 环境重建并证明最终 commit 得到以下精确资产：

| Asset | Size | SHA-256 |
|---|---:|---|
| `pwf-codex-cloud-hooks-v0.3.0-beta.1.zip` | 84,316 | `c9dd8bf5dea0f50662df0a15d653584b7d9a6f1f0329dfc3c2d55fe33a366f91` |
| `init-cloud-sandbox-v0.3.0.bash` | 17,425 | `0c9d57f53ff980d9d207bc8291b1f055058000e45258732b19156ec93b8b1f2a` |

第一次 Fresh Cloud 执行在 importer exact check 处发现 `runtime/upstream/` 四个文件的 Git index mode
是 `100644`，而冻结合同要求 `0755`。这是提交元数据漂移，不是 CRLF、CMD 或 Git Bash 差异。
当前脚本在 importer 前显式要求四个 package path 都是 `100755`，防止 Windows 因
`core.filemode=false` 再次漏检。旧轮中该修复没有改变候选字节；本轮新增 Release 审计工具和
README 教程则明确改变了 ZIP，并已按 ZIP-first / bootstrap-second 顺序重新计算摘要。

如果 Linux 重建 ZIP 的 inventory/content check PASS 但 SHA 不同，停止发布并保存 Python/zlib、
size 和 SHA；不得把新 SHA 直接写回 bootstrap。先区分 source drift 与 deflate 实现差异，再决定
canonical build environment 或调整可复现压缩合同。

## Fresh Cloud 提示词

把包含 R4-C 本地封板修改和本文件的精确 checkpoint 推送到 beta.1 branch 后，在一个没有运行
仓库初始化脚本的全新 Codex Cloud sandbox 中检出该 checkpoint。然后发送：

```text
这是 pwf-codex-cloud-hooks Phase 3 Round 4 R4-C pre-publication Cloud seal check。

请在当前仓库执行 docs/phase-3-round-4-r4c-cloud-seal-check.md 中“唯一执行脚本”的完整 Bash
代码块，不要删改命令，不要安装到 live /opt/codex，不要发布 GitHub Release。完成后逐字返回
脚本完整 stdout，并严格汇总：

Linux suite: PASS 或 FAIL
Tests: tests/pass/fail/skipped
Python/zlib: 实际值
Imported runtime Git modes: PASS 或 FAIL
Release LF attributes: PASS 或 FAIL
ZIP entries: 实际数字
ZIP size: 实际数字
ZIP SHA-256: 实际值
ZIP exact cross-platform match: PASS 或 FAIL
Bootstrap size: 实际数字
Bootstrap SHA-256: 实际值
Bootstrap exact match: PASS 或 FAIL
Placeholders absent: PASS 或 FAIL
Workspace clean after test: YES 或 NO
R4-C pre-publication Cloud seal: PASS 或 FAIL

任何检查失败都停止并返回真实结果，不要修改仓库、bootstrap、hash 或测试来获得 PASS。
```

## 唯一执行脚本

```bash
set -Eeuo pipefail

REPO_ROOT="$(pwd -P)"
PROBE_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$PROBE_ROOT"' EXIT

EXPECTED_ZIP_SHA256="c9dd8bf5dea0f50662df0a15d653584b7d9a6f1f0329dfc3c2d55fe33a366f91"
EXPECTED_ZIP_SIZE=84316
EXPECTED_BOOTSTRAP_SHA256="0c9d57f53ff980d9d207bc8291b1f055058000e45258732b19156ec93b8b1f2a"
EXPECTED_BOOTSTRAP_SIZE=17425
ZIP="$PROBE_ROOT/pwf-codex-cloud-hooks-v0.3.0-beta.1.zip"
BOOTSTRAP="$REPO_ROOT/init-cloud-sandbox-v0.3.0.bash"

printf 'PROBE_VERSION=PWF_PHASE3_ROUND4_R4C_CLOUD_SEAL_V1\n'
printf 'REPO_ROOT=%s\n' "$REPO_ROOT"
python3 --version
python3 - <<'PY'
import sys, zlib
print(f'PYTHON_FULL={sys.version.splitlines()[0]}')
print(f'ZLIB_BUILD={zlib.ZLIB_VERSION}')
print(f'ZLIB_RUNTIME={zlib.ZLIB_RUNTIME_VERSION}')
PY
node --version

test -z "$(git status --short)"
bash -n init-cloud-sandbox-v0.3.0.bash
node --check install.js
python3 - <<'PY'
from pathlib import Path
for root in ('hooks', 'runtime', 'tools'):
    for path in Path(root).rglob('*.py'):
        compile(path.read_text(encoding='utf-8'), str(path), 'exec')
print('PYTHON_STATIC=PASS')
PY
python3 - <<'PY'
import json
import subprocess
from pathlib import Path

bundle = json.loads(Path('contracts/runtime-bundle-v1.json').read_text(encoding='utf-8'))
paths = [item['package_path'] for item in bundle['files']]
result = subprocess.run(
    ['git', 'ls-files', '--stage', '--', *paths],
    check=True,
    text=True,
    capture_output=True,
)
observed = {}
for line in result.stdout.splitlines():
    metadata, path = line.split('\t', 1)
    observed[path] = metadata.split()[0]
assert set(observed) == set(paths), (observed.keys(), paths)
assert all(observed[path] == '100755' for path in paths), observed
print('IMPORTED_RUNTIME_GIT_MODES=PASS files=4 mode=100755')
PY
python3 tools/import_upstream_runtime.py check

node --test --test-reporter=tap tests/*.test.js | tee "$PROBE_ROOT/tests.tap"
grep -Eq '^# tests 69$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# pass 69$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# fail 0$' "$PROBE_ROOT/tests.tap"
grep -Eq '^# skipped 0$' "$PROBE_ROOT/tests.tap"
printf 'LINUX_SUITE=PASS tests=69 pass=69 fail=0 skipped=0\n'

python3 - <<'PY'
import json
import subprocess
from pathlib import Path

contract = json.loads(Path('contracts/release-artifact-v1.json').read_text(encoding='utf-8'))
paths = [item['path'] for item in contract['entries']]
paths += [item['path'] for item in contract['external_release_assets']]
result = subprocess.run(
    ['git', 'check-attr', 'eol', '--', *paths],
    check=True,
    text=True,
    capture_output=True,
)
observed = {}
for line in result.stdout.splitlines():
    path, _, value = line.rpartition(': eol: ')
    observed[path] = value
assert set(observed) == set(paths), (observed.keys(), paths)
assert all(observed[path] == 'lf' for path in paths), observed
assert all(b'\r\n' not in Path(path).read_bytes() for path in paths), 'CRLF release input'
print('RELEASE_LF_ATTRIBUTES=PASS paths=23')
PY

python3 tools/build_release.py build --output "$ZIP" > "$PROBE_ROOT/build.json"
python3 tools/build_release.py check --archive "$ZIP" > "$PROBE_ROOT/check.json"
python3 - "$PROBE_ROOT" "$ZIP" <<'PY'
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
archive = Path(sys.argv[2])
build = json.loads((root / 'build.json').read_text(encoding='utf-8'))
check = json.loads((root / 'check.json').read_text(encoding='utf-8'))
assert build['healthy'] is True and check['healthy'] is True
assert build['entries'] == check['entries'] == 22
content = archive.read_bytes()
digest = hashlib.sha256(content).hexdigest()
assert len(content) == 84316, len(content)
assert digest == 'c9dd8bf5dea0f50662df0a15d653584b7d9a6f1f0329dfc3c2d55fe33a366f91', digest
print('ZIP_ENTRIES=22')
print(f'ZIP_SIZE={len(content)}')
print(f'ZIP_SHA256={digest}')
print('ZIP_EXACT_CROSS_PLATFORM_MATCH=PASS')
PY

ACTUAL_BOOTSTRAP_SHA256="$(sha256sum "$BOOTSTRAP" | awk '{print $1}')"
ACTUAL_BOOTSTRAP_SIZE="$(wc -c < "$BOOTSTRAP" | tr -d '[:space:]')"
test "$ACTUAL_BOOTSTRAP_SHA256" = "$EXPECTED_BOOTSTRAP_SHA256"
test "$ACTUAL_BOOTSTRAP_SIZE" -eq "$EXPECTED_BOOTSTRAP_SIZE"
grep -Fq 'HOOKS_VERSION="${HOOKS_VERSION:-v0.3.0-beta.1}"' "$BOOTSTRAP"
grep -Fq "HOOKS_SHA256=\"\${HOOKS_SHA256:-${EXPECTED_ZIP_SHA256}}\"" "$BOOTSTRAP"
printf 'BOOTSTRAP_SIZE=%s\n' "$ACTUAL_BOOTSTRAP_SIZE"
printf 'BOOTSTRAP_SHA256=%s\n' "$ACTUAL_BOOTSTRAP_SHA256"
printf 'BOOTSTRAP_EXACT_MATCH=PASS\n'

test "$(wc -c < "$ZIP" | tr -d '[:space:]')" -eq "$EXPECTED_ZIP_SIZE"
PLACEHOLDER_PATTERN='__PWF''_BETA1_'
test -z "$(rg -l "$PLACEHOLDER_PATTERN" docs README.md PROJECT_UNDERSTANDING.md work_plan.md || true)"
printf 'PLACEHOLDERS_ABSENT=PASS\n'

git diff --check
git diff --exit-code
test -z "$(git status --short)"
printf 'WORKSPACE_CLEAN_AFTER_TEST=YES\n'
printf 'R4C_PREPUBLICATION_CLOUD_SEAL=PASS\n'
```

## PASS 后的唯一下一步

只有脚本完整 PASS，才发布两个已封板资产。不要使用 Cloud 重建的临时 ZIP 替代本地封板 ZIP；
两者必须已经 byte-exact。发布后按
[`v0.3.0-beta.1-cloud-hard-acceptance.md`](v0.3.0-beta.1-cloud-hard-acceptance.md)
执行下载/setup/Fresh/Resume A～F。
