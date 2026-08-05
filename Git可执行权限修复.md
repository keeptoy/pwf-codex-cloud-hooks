# Git 可执行权限修复说明

本文用于修复备份、迁移或重建 Git 仓库后，脚本被错误提交为 `100644` 的问题。它特别适用于以下报错：

```text
runtime mode mismatch for session_catchup
```

以及提交输出中出现：

```text
create mode 100644 runtime/upstream/inject-plan.sh
create mode 100644 runtime/upstream/ledger-summary.sh
create mode 100644 runtime/upstream/resolve-plan-dir.sh
create mode 100644 runtime/upstream/session-catchup.py
```

## 1. 原因

Git 不只保存文件内容，还保存一个简化的文件模式：普通文件通常是 `100644`，可执行文件是
`100755`。

在 Windows 上复制文件到新仓库、重新执行 `git init` 和 `git add` 时，Git 通常会把这些文件作为
`100644` 加入索引。此时文件内容和 SHA-256 可以完全正确，但 Linux/Cloud checkout 后没有可执行位，
严格的 runtime importer 会按契约拒绝它们。

这不是 CRLF 问题，也不是使用 CMD、PowerShell 或 Git Bash 的区别。`core.filemode=false` 只表示 Git
不根据 Windows 工作树权限自动推断 mode；仍可用 `git update-index --chmod=+x` 明确写入正确的 Git
索引模式。

## 2. 先检查 Git 记录的模式

在仓库根目录执行：

```bash
git ls-files --stage -- \
  runtime/upstream/session-catchup.py \
  runtime/upstream/resolve-plan-dir.sh \
  runtime/upstream/inject-plan.sh \
  runtime/upstream/ledger-summary.sh
```

四行开头都必须是：

```text
100755
```

如果显示 `100644`，继续下一步。不要通过修改脚本内容来制造新的 blob，也不要把整个仓库的文件
全部设为可执行。

## 3. 跨平台修复命令

下面的 Git 命令在 CMD、PowerShell、Git Bash 和 Linux shell 中都适用。为方便直接复制，命令写成
单行：

```bash
git update-index --chmod=+x -- runtime/upstream/session-catchup.py runtime/upstream/resolve-plan-dir.sh runtime/upstream/inject-plan.sh runtime/upstream/ledger-summary.sh
```

这条命令修改的是 Git 索引元数据，不修改四个文件的内容。

本修复只针对上述四个 `runtime/upstream/*` 导入产物。不要顺手修改 README、contracts、
`runtime/owned-*.py` 或其他文件的 Git mode。

## 4. 提交前验证

```bash
git status --short
git diff --cached --summary
git ls-files --stage -- runtime/upstream/session-catchup.py runtime/upstream/resolve-plan-dir.sh runtime/upstream/inject-plan.sh runtime/upstream/ledger-summary.sh
```

预期结果：

- `git status --short` 把四个文件显示为已暂存修改；
- `git diff --cached --summary` 显示 `mode change 100644 => 100755`；如果它们是新文件，最终提交摘要应显示 `create mode 100755`；
- `git ls-files --stage` 的四行都以 `100755` 开头；
- 不应出现文件内容变化。

然后运行仓库检查：

```bash
python3 tools/import_upstream_runtime.py check
git diff --check
```

在 Windows 上，importer 不会用本地 inode 权限替代 Linux mode 验收，因此 `git ls-files --stage`
仍是提交前必须检查的权威证据。完整 POSIX mode 验收应在 Linux/Cloud 中进行。

## 5. 提交并推送

确认暂存区只有预期变更后：

```bash
git commit -m "fix: restore executable modes for imported runtime"
git push
```

提交后验证当前 commit 的树对象，而不只是工作树：

```bash
git ls-tree HEAD -- runtime/upstream/session-catchup.py runtime/upstream/resolve-plan-dir.sh runtime/upstream/inject-plan.sh runtime/upstream/ledger-summary.sh
```

四行必须全部是 `100755 blob ...`。如果使用 GitHub 网页或另一台机器，再确认远端目标分支指向这个
commit，避免 Cloud 启动了旧 checkpoint。

## 6. Cloud 复验

推送修复 commit 后，使用全新 Cloud sandbox 或确认没有复用旧 checkout。先运行：

```bash
git rev-parse HEAD
git ls-files --stage -- runtime/upstream/session-catchup.py runtime/upstream/resolve-plan-dir.sh runtime/upstream/inject-plan.sh runtime/upstream/ledger-summary.sh
stat -c '%a %n' runtime/upstream/session-catchup.py runtime/upstream/resolve-plan-dir.sh runtime/upstream/inject-plan.sh runtime/upstream/ledger-summary.sh
python3 tools/import_upstream_runtime.py check
```

预期结果：

- Cloud HEAD 是刚推送的修复 commit；
- Git index 四项均为 `100755`；
- Linux `stat` 四项均为 `755`；
- importer 输出 `"healthy": true` 并退出 `0`。

通过后再运行对应版本的完整 Cloud seal/acceptance 脚本。不要用手工 `chmod` 后的一次性通过代替
远端 Git tree 和全新 checkout 的证明。

## 7. 避免下次备份再次丢失 mode

- 首选向远端推送完整 branch/tag，或使用 Git 自身的 clone/bundle/mirror 方式备份。
- 不要只复制工作树文件后重新 `git init`，这会丢失 Git index 中的 executable bit。
- 如果必须重建仓库，在第一次提交前运行本文第 2 节的 mode 检查。
- `LF will be replaced by CRLF` 警告属于行尾策略，不能用于判断 `100644/100755` 是否正确。
- Release ZIP 的内部 mode 由 Release contract/builder 固定；但仓库级 importer 和 Cloud 源码验收仍会
  检查 checkout 的真实 POSIX mode，因此两层检查都不能省略。

