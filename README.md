# pwf-codex-cloud-hooks

通过系统托管的生命周期 Hooks，把全局安装的
[`OthmanAdi/planning-with-files`](https://github.com/OthmanAdi/planning-with-files)
Skill 接入 Codex Cloud 会话。

> **状态：**Phase 1～3 已完成。`v0.3.0-beta.1` 的 22-entry 自校验 ZIP 与 ZIP 外部
> bootstrap 已发布，并通过发布后下载复核和完整 Fresh/Resume Cloud A～F；它是 Phase 4～8
> 当前回滚基线。`v0.3.0-alpha.2` 保留为不可变历史 fallback。Phase 4 尚未开始，等待维护者
> 明确授权后才能进入 Round 1 Discovery Gate。

## 从这里开始

本仓库解决的是部署问题，不是 planning 方法本身的问题：

- **planning-with-files** 定义 planning 工作流，并把项目状态保存在 `task_plan.md`、
  `findings.md`、`progress.md` 和 `.planning/`；
- **Codex Skill discovery** 让模型能够读取这套工作流说明；
- **本仓库** 安装可信的生命周期 Hooks，使 Cloud 会话在启动和每次用户提示时自动获得相关
  planning 状态。

如果你在操作当前版本，请先读[当前行为](#当前行为)、[安装与运维](#安装与运维)和
[故障与修复模型](#故障与修复模型)。如果你要继续 modernization，请在修改代码前阅读
[当前已落地架构与后续边界](#当前已落地架构与后续边界)和[如何继续开发](#如何继续开发)。

## 为什么需要这个仓库

Codex 可以从 `$HOME/.agents/skills/planning-with-files` 等位置发现独立 Skill，但 Skill
discovery 本身不会安装全局生命周期 Hooks。把上游 `.codex/` 文件复制到每个产品仓库会造成
重复配置；安装到用户级 `~/.codex/hooks.json` 又需要单独处理信任与合并。

Codex Cloud 需要一套经过集中审查的部署方式：

1. 在当前 `$CODEX_HOME` 下只安装一次 Hook runtime；
2. 通过 `/etc/codex/requirements.toml` 注册绝对路径命令；
3. 保留无关的管理员配置；
4. 固定并验证上游 Skill 身份；
5. 支持 dry-run、诊断、受控修复、备份和卸载；
6. 提供可见 canary，用于生命周期黑盒验证。

本仓库负责这层托管部署和治理。它不会取代 planning-with-files Skill，也不会创建第二套项目
记忆格式。

## 当前行为

### 已发布并通过 Cloud 验收的 `v0.3.0-beta.1` 行为

Managed requirements 仍只注册一个 adapter 命令。两个事件先调用 sibling `owned-plan.py`；
只有严格校验通过且 `inject=true` 的结果才能提供 planning context。SessionStart 随后把该结果的
六字段 `project` 原样交给 `owned-catchup.py`，最终输出顺序固定为 canary、可选 catch-up、plan。
plan 失败或非注入结果只保留 canary；catch-up 失败不抑制已经验证的 plan context。

这条路径已通过 Windows、Linux/Cloud R4-B gate，以及 beta.1 发布下载与完整 live A～F。
安装清单包含 11 个 managed payload，另有单独校验的 `installed-manifest.json`；Release ZIP
包含 22 个 entries。精确资产和验收记录见
[`docs/v0.3.0-beta.1-cloud-hard-acceptance.md`](docs/v0.3.0-beta.1-cloud-hard-acceptance.md)。

### 已验收的 `v0.3.0-alpha.2` 回滚行为

工作区保留 v0.2.2 已证明的两个事件；Phase 2 已接管 SessionStart catch-up 的执行边界：

| Event | Matcher | 当前动作 | 验证状态 |
|---|---|---|---|
| `SessionStart` | `startup\|resume\|clear\|compact` | 校验 Host/session/project 输入，监督已安装的 `owned-catchup.py`，然后注入 active plan 和 recent progress | 自动激活与完整 alpha.2 Cloud 验收已通过 |
| `UserPromptSubmit` | 无 | 注入 active plan 和 recent progress | Cloud 已观察 |

两个 handler 都是只读的，并输出 owned 诊断标记 `PWF_GLOBAL_HOOK_CANARY_V1`。

`v0.3.0` bootstrap 保持全局 upstream v3.8.2 Skill pristine。四项 Cloud 兼容 delta 只应用于
哈希固定的 `runtime/upstream/session-catchup.py` owned copy：

1. adapter/runtime contract 显式把 runtime 标识为 `codex`；
2. adapter 优先校验 Host 提供的 `transcript_path`，之后只允许在
   `CODEX_SESSIONS_DIR`、`$CODEX_HOME/sessions` 或已安装 managed path 推导出的显式 root
   下扫描；
3. catch-up 同时识别 scoped `.planning/<slug>/task_plan.md` 和 legacy root planning 文件；
4. 长 Cloud wrapper 用户消息有界保留头部和尾部，使末尾用户指令或回归 sentinel 不会被遮蔽。

这是 downstream bridge，不是可变的 global-Skill fork。历史 patcher 只保留在源码树中，用于
复现和审计 owned overlay；alpha.2 Release ZIP 不包含它，bootstrap 也不会调用它。

Hook 进程缺少 `CODEX_HOME` 时，adapter 可以从自身位于
`$CODEX_HOME/hooks/planning-with-files/` 下的安装路径推导 session-store root。因此 setup
shell 的 export 不是隐藏的 runtime 依赖，`/opt/codex` 也不被视为永久平台常量。

alpha.2 adapter 曾按以下顺序解析项目 planning state；beta.1 已把这项职责移入
`owned-plan.py`：

1. `.planning/.active_plan` 指向的有效 scoped plan；
2. `.planning/` 下修改时间最新的有效 plan；
3. legacy root-level `task_plan.md`。

存在 plan 时，beta.1 的 managed-legacy 路径注入 `task_plan.md` 前 50 行、`progress.md` 后 20 行，
并提示读取 `findings.md`。不存在 plan 时，只输出 event canary。

### Phase 4 及后续尚未实现或激活

Phase 3 的 exact-v1 `owned-plan.py`、canonical project forwarding、beta.1 封板与完整 Cloud
验收已经关闭。Phase 4 尚未获得进入授权；其第一轮只能执行 Discovery Gate，不能直接修改
production behavior。

当前 managed runtime 还没有启用以下上游能力：

- plan attestation 和 nonce framing；
- smart injection 和 structured ledger summary；
- `PreCompact`、`PostCompact`、`PreToolUse`、`PostToolUse` 和
  `PermissionRequest`；
- advisory Stop completion message 和 hard completion gating。

不能因为 pinned upstream Skill 中存在这些能力，就推断本仓库已经支持。只有在本仓库显式
导入、测试、安装并注册后，它们才属于 managed behavior。

## 当前架构

```text
Codex Cloud setup/maintenance
  |
  | 下载固定版本的 installer archive 并校验 checksum
  v
install.js
  |-- 验证 pristine global Skill 和 hash-pinned owned bundle
  |-- 安装 adapter、owned-catchup、owned-plan、schemas 和 upstream files
  |-- 记录 $CODEX_HOME/hooks/planning-with-files/installed-manifest.json
  `-- 把 owned Hook definitions 合并到 /etc/codex/requirements.toml
          |
          v
     /usr/bin/python3 <absolute-managed-path>/hook_adapter.py <event>
          |
          |-- 解析 Codex stdin JSON
          |-- 两个事件先调用 sibling owned-plan.py
          |-- SessionStart 再把 exact project 交给 sibling owned-catchup.py
          |-- 不再解析或渲染 plan 文件
          `-- 返回 Codex hookSpecificOutput.additionalContext JSON
```

beta.1 Python adapter 已删除平行 plan resolution 和 injection 逻辑，只保留 Host request、
两个 typed child 的共享监督、严格结果校验、canary、上下文组合和 Codex JSON 转换。

## 信任与所有权边界

### 本仓库负责

- 渲染和合并 managed Hook policy；
- 绝对 runtime 路径和文件权限；
- installer locking 和原子写入；
- backup、doctor、受控 repair 和 uninstall；
- installed-runtime inventory 和 drift 分类；
- Codex Hook stdin/stdout 协议适配；
- Cloud rollout 和 canary 验证；
- 临时、确定性的 Codex Cloud 兼容转换。

### 上游 Skill 当前负责

- planning 指令和文件约定；
- 本仓库校验哈希的 canonical `resolve-plan-dir.sh`、`inject-plan.sh`、
  `session-catchup.py` 和 `ledger-summary.sh`；
- 本仓库当前两个 managed events 之外的 planning-with-files 行为。

### 所有权规则

安装和完整性检查 fail-closed。Runtime advisory failure 不应终止 Codex loop，但不安全或无法
验证的内容不得注入。repair 永远不能静默吸收未知 drift 或无关管理员变更。

## 上游版本固定

当前 package 批准：

- repository：`OthmanAdi/planning-with-files`；
- release：`v3.8.2`；
- commit：`b04ffd9c8f9f93919649d197e5d4ec1bfc06fa14`；
- archive：`https://github.com/OthmanAdi/planning-with-files/archive/refs/tags/v3.8.2.zip`；
- release archive SHA-256：
  `7dab03ae283da38d33b9d551c7ec621d1818b9f0f17cf9ced566d4accbfc6dd1`。

`upstream-manifest.json` 分别记录 pristine global-Skill hashes 和 managed
`session-catchup.py` owned-copy hash。`install.js` 要求 global Skill 保持 pristine，并且只把
精确 allowlist 中的 owned runtime 文件安装到 `managed_dir` 下。

## 仓库地图

| 路径 | 用途 |
|---|---|
| `AGENTS.md` | 智能体进入仓库后的阅读顺序、文档权威关系、稳定边界和验证规则 |
| `install.js` | Managed installer CLI：install、doctor、repair、uninstall |
| `hooks/hook_adapter.py` | 只读 Codex 协议 adapter、两个 typed child 的共享 supervisor、严格结果校验与上下文组合 |
| `patches/patch_planning_skill.py` | 历史 overlay 复现/审计工具；alpha.2 不发布、不执行 |
| `tools/import_upstream_runtime.py` | 固定 archive、仅 allowlist 的 runtime 导入与 drift 检查 |
| `tools/build_release.py` | 确定性、精确 allowlist 的 Release ZIP 构建与验证 |
| `runtime/owned-catchup.py` | Active Phase 2 SessionStart catch-up 入口和 transcript trust boundary |
| `runtime/owned-plan.py` | R4-B active exact-v1 canonical plan-context runtime 和 controlled-snapshot boundary |
| `runtime/upstream/` | 四个已验证 runtime 文件；catch-up active，prompt/ledger 文件按阶段使用 |
| `THIRD_PARTY_NOTICES.md` | 再分发 runtime code 的完整 upstream MIT attribution |
| `upstream-manifest.json` | Manifest v3：archive、contracts、importer、license、source paths、modes 和 hashes |
| `contracts/` | Versioned runtime allowlist、overlay ledger、adapter/runtime schemas 和 Release ZIP boundary |
| `docs/phase-1-runtime-contracts.md` | Phase 1 contract 和 ownership 的可读说明 |
| `docs/phase-2-owned-catchup.md` | Active SessionStart owned-runtime boundary 和安全策略 |
| `docs/phase-3-canonical-plan-context.md` | Phase 3 已选架构、exact-v1 lifecycle、兼容决策、预算和 round gates |
| `docs/phase-3-round-4-activation-plan.md` | Round 4 A/B/C 激活顺序、共享 deadline、failure matrix、rollback boundary 和 beta.1 Cloud exit gate |
| `docs/phase-3-round-4-r4a-cloud-acceptance.md` | R4-A bounded supervisor/type seam 的 Linux/Cloud 可复制验收；明确保持 plan dispatch inactive |
| `docs/phase-3-round-4-r4b-cloud-acceptance.md` | R4-B plan-first、adapter thinning、isolated upgrade、latency/output 和 69/69 Linux/Cloud gate |
| `docs/v0.3.0-beta.1-cloud-hard-acceptance.md` | R4-C beta.1 双资产、Fresh/Resume lifecycle、零 snapshot 与 post-resume doctor 验收 |
| `docs/phase-3-upstream-invocation-options.md` | overlay/snapshot/其他路线比较、实证和长期 Host/Driver 标准化边界 |
| `docs/phase-3-round-3-cloud-acceptance.md` | Inactive Round 3 Linux/Cloud、隔离安装、inventory、direct runtime 和 no-dispatch gate |
| `docs/v0.3.0-alpha.1-cloud-smoke.md` | Phase 1 预发行发布与 Cloud smoke 验收记录 |
| `docs/v0.3.0-alpha.2-cloud-hard-acceptance.md` | Alpha.2 SHA、inventory、权限、owned runtime 和 resume 验收门槛 |
| `snapshot-prototype/` | 已审查且自包含的 Round 2 snapshot feasibility handoff；只作为 conditional GO 证据，不是 runtime/Release 输入 |
| `init-cloud-sandbox-v0.3.0.bash` | 当前 modernization 迭代的开发 bootstrap |
| `PROJECT_UNDERSTANDING.md` | 持久心智模型、Cloud 事实、组件边界、决策和恢复时文档路由 |
| `work_plan.md` | Programme/Release 层 Phase 路线、Cloud 验收和发布路标 |
| `黑盒验证.md` | 面向初学者的 Cloud health、lifecycle、catch-up、repair 和 fail-closed runbook |
| `tests/hook-adapter.test.js` | Hook payload、当前 plan behavior 和 no-plan 测试 |
| `tests/installer.test.js` | Managed-policy ownership、drift、repair、backup 和 uninstall 测试 |
| `tests/skill-patch.test.js` | 历史 compatibility patch、bootstrap guard 和 Cloud-shaped catch-up 回归 |
| `tests/contracts.test.js` | Phase 1 provenance、overlay、protocol 和 artifact-boundary contract 测试 |
| `tests/import-runtime.test.js` | 确定性导入、幂等、checksum、source drift 和 inventory fail-closed 测试 |
| `tests/golden-output.test.js` | 六个 exact v0.2.2 Hook output 兼容场景 |
| `tests/cloud-fixtures.test.js` | 脱敏 Cloud Hook schema、environment stage 和 catch-up JSONL 回归 |
| `tests/release-package.test.js` | 确定性 ZIP inventory、metadata、mode 和 bootstrap separation 测试 |
| `tests/owned-runtime.test.js` | Owned catch-up request/result、Host transcript、fallback、identity 和 containment 测试 |
| `tests/owned-plan-runtime.test.js` | Owned plan exact-v1、snapshot、safe-read、timeout 和 cleanup 测试 |
| `tests/phase3-contracts.test.js` | Phase 3 exact-v1 trusted graph、R4-B dispatch 和旧 adapter 算法删除测试 |
| `tests/snapshot-prototype-handoff.test.js` | 把八个独立 feasibility cases 纳入父 suite，并证明 production-graph isolation |
| `tests/fixtures/planning-with-files/` | 自包含 pinned Skill fixture；不是第二套 production Skill |
| `planning-with-files-3.8.2/` | 开发用、Git 忽略的上游参考树；不得打包 |
| `.planning/.active_plan` | 指向当前 Managed Runtime Modernization plan |
| `.planning/2026-08-01-v0.2.2-cloud-catchup-compatibility/` | 已完成的实现、Cloud 验收和发布记录 |
| `.planning/2026-08-01-managed-runtime-modernization/` | 当前长期 managed-runtime modernization 计划与审计历史 |

## 安装与运维

### 前置条件

- Linux Codex Cloud runtime，并且 `$CODEX_HOME` 是绝对、非根目录路径；
- `/usr/bin/python3`；
- Node.js 18 或更新版本；
- production install 时有权修改 `/etc/codex/requirements.toml`；
- pinned planning-with-files Skill 已安装在获准位置。

installer 默认按以下顺序查找 Skill：

1. `$HOME/.agents/skills/planning-with-files`；
2. `$CODEX_HOME/skills/planning-with-files`；
3. `$HOME/.codex/skills/planning-with-files`。

使用 `--skill-root PATH` 可以显式选择安装位置。

### 本地开发与测试

```bash
npm test
python3 -m py_compile hooks/hook_adapter.py
node --check install.js
bash -n init-cloud-sandbox-v0.3.0.bash
git diff --check
```

当前 beta.1 Node suite 注册 69 个**测试案例**，不等于 69 个原子产品功能：

- Windows beta.1：51 PASS、18 个如实标记的 POSIX/Linux-only SKIP、0 FAIL；
- R4-B Linux/Cloud：69 PASS、0 SKIP、0 FAIL；真实双 child/跨用户、process-group、隔离升级、
  doctor、11/21 inventory、延迟/输出预算和零 snapshot 残留全部通过；
- R4-C/beta.1：22-entry ZIP、外部 bootstrap、发布下载、Fresh/Resume A～F、11 个 managed
  payload + 单独 manifest，以及零 snapshot residue 全部通过；
- Cloud/Linux R4-A：66 PASS、0 SKIP、0 FAIL；process-group、inactive typed seam、隔离安装、
  doctor、11/21 inventory、no-dispatch 和 clean-workspace gate 全部通过；
- 已封板 alpha.2 快照仍是 45 registered、42 PASS、3 Linux-only SKIP。

这些案例覆盖：

- 当前两个 Hook payload、no-plan canary 和 read-only dry-run；
- managed policy 合并、幂等、所有权、doctor、repair、backup、uninstall 和 unknown drift；
- upstream archive/source hashes、确定性 allowlist import 和 exact runtime inventory；
- v0.2.2 golden output、Cloud Hook schema 和 Cloud-shaped JSONL fixture；
- SessionStart owned-catchup、transcript identity/containment/fallback、bounded output 和诊断；
- adapter activation/fail-open、global Skill 不执行，以及 Linux root/root 和 synthetic cross-user；
- canonical plan resolution、opt-out、session attachment/isolation、PLAN_ID/BOM precedence；
- owned-plan exact-v1、fd-rooted safe read、single-link policy、race detection、private snapshot、
  process-group timeout、stale cleanup 和 output budget；
- snapshot prototype handoff 与 production graph/Release/dispatch isolation；
- deterministic Release ZIP、固定 metadata/mode、external bootstrap separation；
- Phase 3 exact-v1 schemas、11-file installed graph、22-entry ZIP、plan-first dispatch 和旧 adapter
  plan 算法删除。

测试只使用临时 Codex homes 和 projects，不会写入 live `$CODEX_HOME` 或
`/etc/codex/requirements.toml`。

### 安装程序 CLI

非 production 预览或测试位置必须同时覆盖 destination paths：

```bash
node install.js install --dry-run --json \
  --codex-home /absolute/test/codex \
  --skill-root /absolute/planning-with-files \
  --managed-requirements /absolute/test/requirements.toml
```

生产环境示例：

```bash
node install.js install --dry-run --json --codex-home /opt/codex
sudo node install.js install --json --codex-home /opt/codex
node install.js doctor --json --codex-home /opt/codex
sudo node install.js install --repair --json --codex-home /opt/codex
sudo node install.js uninstall --json --codex-home /opt/codex
```

`--managed-requirements PATH` 默认是 `/etc/codex/requirements.toml`。Production install
通常需要 root。如果现有 `hooks.managed_dir` 不包含本 package 的 adapter，安装会失败，而不是
替换管理员的 managed Hook root。

### Cloud 初始化脚本

`init-cloud-sandbox-v0.3.0.bash` 是 Debian/Ubuntu amd64 开发 bootstrap。它可以安装依赖、
PowerShell、Node.js、Skill 和 managed Hook package，然后检查 filesystem、TOML、Codex
feature state、adapter protocol 和 canary。

Codex Cloud 不需要在 setup 前提供 `CODEX_HOME`。bootstrap 默认导出 `/opt/codex`，显式传入
的值仍优先。当前 Cloud 证据表明：sandbox initialization script 运行时该变量不存在；Codex
runtime 启动后，包括实际 managed Hook process 中，该变量为 `/opt/codex`。所以 bootstrap
默认值只是 installation-stage fallback，不是后续 runtime 变量的来源。

```bash
sudo bash init-cloud-sandbox-v0.3.0.bash all
bash init-cloud-sandbox-v0.3.0.bash help
bash init-cloud-sandbox-v0.3.0.bash verify
```

beta.1 已按以下顺序封板并通过发布后验收；后续版本继续使用同一顺序：

1. 冻结目标版本和 ZIP 内容；
2. 构建 ZIP 并计算 SHA；
3. 把版本、package name 和 ZIP SHA 写入外部 bootstrap；
4. 计算封板后 bootstrap SHA；
5. 发布并重新下载验证两个独立资产。

### 本地构建和校验 Release ZIP

`contracts/release-artifact-v1.json` 决定允许进入 ZIP 的精确文件清单；不能用整个仓库的通配符
代替它。`tools/build_release.py build` 按固定路径顺序、时间戳、权限和压缩参数生成 ZIP；
`tools/build_release.py check` 再检查 ZIP 的内容、顺序、权限、元数据和源文件字节是否完全一致。
打包工具本身也在 ZIP 中，因此下载后的候选包可以使用包内同一工具和合同完成自校验；它只是
Release 审计工具，不会被 `install.js` 安装到 Hook runtime。

Windows PowerShell 开发构建可直接复制。输出使用 `next`，避免覆盖已发布且不可变的 beta.1
本地证据：

```powershell
$zip = "dist/pwf-codex-cloud-hooks-next.zip"

npm test
python tools/import_upstream_runtime.py check
python tools/build_release.py build --output $zip
python tools/build_release.py check --archive $zip

(Get-Item $zip).Length
(Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
```

Linux 或 Git Bash：

```bash
set -Eeuo pipefail
ZIP="dist/pwf-codex-cloud-hooks-next.zip"

npm test
python3 tools/import_upstream_runtime.py check
python3 tools/build_release.py build --output "$ZIP"
python3 tools/build_release.py check --archive "$ZIP"

wc -c < "$ZIP"
sha256sum "$ZIP"
```

`build --output` 会原子替换指定的目标 ZIP；不得用已发布版本的文件名承载新字节。
ZIP 内容全部冻结并得到最终 SHA-256 后，才能把版本、包名和 ZIP SHA 写入 ZIP 外部的
`init-cloud-sandbox-v0.3.0.bash`；随后再计算 Bash 自身的 SHA-256。任何 ZIP entry 再次变化，
都必须从 ZIP 构建开始重新封板，并使用新的版本/资产身份。当前工作区 README 属于 beta.1
发布后的文档前进，不会也不能反向改变已经上传的 beta.1 ZIP。

已发布 v0.2.2 是稳定历史 fallback，alpha.2 是较新的历史 fallback；published / Cloud-accepted
beta.1 是 Phase 4～8 当前 rollback baseline。

component command 不会自动安装其依赖。完整有序流程使用 `all`，或遵循 `help` 输出的依赖说明。

setup 成功后，必须启动一个全新的 Cloud task。beta.1 使用
[`docs/v0.3.0-beta.1-cloud-hard-acceptance.md`](docs/v0.3.0-beta.1-cloud-hard-acceptance.md)；
[`黑盒验证.md`](黑盒验证.md)保留通用与历史回归参考。手动读取文件看到 canary 不能证明
lifecycle Hook 已执行；canary 必须在新 session 的 runtime context 中已经存在。

## 故障与修复模型

每次写操作都会先备份受影响的 managed files。普通 `install` 可以建立或升级 owned state；
`install --repair` 的边界刻意更窄：

- 必须存在完整的 schema-v3 owned manifest；
- upstream pin、安装路径和 unowned requirements fingerprint 必须仍然匹配；
- 只修复 owned adapter/runtime payload 或 owned managed-Hook definitions；
- unknown drift 返回 `REPAIR_BLOCKED_UNKNOWN_DRIFT`，需要人工审查。

从 `v0.2.0` 升级时，先执行一次普通 `install`，之后才能使用 repair。repair 不会把旧 manifest
当成所有权证明。

运维处理顺序：

1. 运行 `doctor`；
2. 如果 `repairable=true`，先预览 `install --repair --dry-run`，再执行 repair；
3. 如果出现 blocker 或 `REPAIR_BLOCKED_UNKNOWN_DRIFT`，停止自动化；
4. 检查 requirements、runtime inventory、manifest 和 backups；
5. 只有理解并批准异常状态后，才允许普通 install。

## 当前已落地架构与后续边界

Phase 3 已把固定的 upstream source snapshot 与本仓库 owned children 打包成受管 runtime
bundle；Phase 4+ 只能在该边界上逐项扩展。

```text
Codex
  |
  v
/etc/codex/requirements.toml
  |  只注册 managed_dir 下的绝对 adapter 命令
  v
$CODEX_HOME/hooks/planning-with-files/
  |-- hook_adapter.py                 # 唯一 Host command
  |-- owned-catchup.py                # active SessionStart child
  |-- owned-plan.py                   # active canonical plan-context child
  |-- contracts/
  |   |-- adapter-plan-context-request-v1.schema.json
  |   `-- plan-context-result-v1.schema.json
  |-- upstream/
  |   |-- resolve-plan-dir.sh         # pristine
  |   |-- inject-plan.sh              # pristine
  |   |-- session-catchup.py          # owned overlay
  |   `-- ledger-summary.sh           # pristine/deferred mode
  |-- compatibility-overlays-v1.json  # 临时 downstream delta + retirement rules
  |-- installed-manifest.json
  `-- THIRD_PARTY_NOTICES.md
```

Managed Hook 命令仍只注册 `hook_adapter.py`。两个事件先监督 sibling `owned-plan.py`；
SessionStart 再把 exact canonical project 交给 `owned-catchup.py`。global Skill 保持 pristine，
两个 child 都不从可变 Skill 目录执行脚本。

Phase 3 Round 1 冻结 managed-legacy prompt request/result boundary、20,000 字符总 context 上限
和两项有意输出差异。Round 2 用 pristine resolver/injector 完成隔离的 controlled-snapshot
feasibility spike：8 个 focused Linux/Cloud cases 加 1 个父仓库 isolation case 支持
`CONDITIONAL_GO`，multi-target overlay 只作为 fallback。prototype 永远不进入 production graph。

Round 3 把 exact-v1 schemas 和 `owned-plan.py` 纳入 trusted graph 并完成 inactive Cloud gate；
Round 4 随后通过 R4-A/R4-B/R4-C 分段 gate 激活该路径、删除 adapter 的平行 resolver/renderer、
封板 beta.1 并完成发布后 Fresh/Resume A～F。Phase 3 已关闭。

Phase 3 文档、v1 schemas 和 contract regression 刻意不使用 `candidate` filename suffix。
它们的 identity 已选定且稳定；inactive/active 状态由 schema/document metadata、trusted-graph
membership 和对应 gate 表达。除非 contract 发生不兼容变化，后续 Phase 继续使用同一组
exact-v1 identity。

Phase 1 v1 allowlist 只包含上述四个 upstream files。Attestation、ledger mutation、phase
mutation、completion 和 Stop-gating scripts 必须等各自 Phase；早期 runtime artifact 不允许
包含它们。

### 目标职责

`hook_adapter.py` 应保持薄，只负责：

- stdin JSON 和 event 校验；
- 提取 `cwd`、`session_id`、event-scoped `turn_id` 和已校验 Host `transcript_path`；
- 构造显式 Codex runtime、transcript/session-store fallback、event/source、project root 和
  output budget request；
- 共享 deadline、受监督 subprocess execution 和 timeout handling；
- stdout/stderr isolation 和严格 typed result validation；
- Codex `additionalContext`、`systemMessage`、decision JSON 和 rollout canary。

PWF Integration Driver/owned runtime 负责 planning 语义：

- plan resolution、containment、opt-out 和 session isolation；
- controlled private snapshot、pristine injection shape 和 canonical project state；
- catch-up transcript normalization、diagnostic reason codes 和 bounded reports；
- 后续 Phase 显式批准后才加入的 attestation、ledger、compact 和 completion 语义。

Host 提供的 `transcript_path` 是首选 transcript selector。active owned-catchup 在读取前独立
要求 canonical containment、rollout shape、matching session identity/cwd 和显式 allowed root；
只有显式 session-store roots 可以作为 compatibility fallback。Codex transcript JSONL 不是稳定
公共接口。runtime 会归一化已观察 record families，拒绝 malformed UTF-8/JSON 且不做 partial
injection，并在不信任其为 conversation text 的前提下诊断 unknown/duplicate families。

`install.js` 继续负责部署和治理：

- absolute managed commands；
- atomic install、backup、doctor、repair 和 uninstall；
- upstream archive provenance 和 per-file hashes；
- deterministic overlay、pristine/patched hashes 和 retirement conditions；
- exact runtime allowlist 和 unknown-file rejection；
- staged event registration、rollout、rollback 和 canary。

长期可复用边界是 Host ABI + managed runner + Integration Driver request/result。当前唯一正式
支持的集成仍是 PWF；在第二个只读插件验证前，本仓库不是通用 Skill 转换器。

### 为什么选择这套设计

- 避免维护第二套 upstream planning behavior；
- 不从用户 Skill 目录直接执行可变脚本；
- managed runtime 可复现、可诊断、可回滚；
- 保留本仓库更严格的 Cloud ownership 和 drift model；
- 只导入经过审查的依赖，不复制完整 upstream `.codex/`；
- 把 Cloud 已证明的 catch-up 路径从可变 global Skill 移入 adapter 同一 owned inventory。

### 现代化不变量

- 没有显式 migration 时，保留现有 legacy-plan behavior；
- 每个新 lifecycle event 激活前先增加测试；
- managed command 必须位于 `managed_dir` 下；
- runtime integrity 和 unsafe context injection 必须 fail-closed；
- runtime advisory failure 对 Codex loop 保持 non-fatal；
- Runtime identity 和已校验 Host transcript path 必须显式传入，不能只从 Skill path 或临时
  setup environment 推断；session-store scanning 只作 compatibility fallback；
- transcript JSONL record shape 是可变化的 Host data，不是本仓库拥有的稳定 schema；
- catch-up 注入有总预算，详细 skip/failure reason 只进入 non-injecting diagnostic surface；
- hard Stop gating 最后实现，并且只在显式模式下启用。

## 如何继续开发

路线以 planning-with-files 状态持久化，因此可以跨 resume、clear 和 context compaction 恢复。

### 恢复上下文

从仓库根目录开始：

```bash
cat AGENTS.md
cat PROJECT_UNDERSTANDING.md
cat work_plan.md
cat .planning/.active_plan
cat .planning/2026-08-01-managed-runtime-modernization/task_plan.md
cat .planning/2026-08-01-managed-runtime-modernization/progress.md
cat .planning/2026-08-01-managed-runtime-modernization/findings.md
git status --short --branch
```

文档职责：

- `AGENTS.md`：智能体阅读顺序、文档权威关系、稳定边界和验证规则；
- `PROJECT_UNDERSTANDING.md`：长期心智模型、稳定事实、决策和恢复路由；
- `work_plan.md`：programme/Release 层路线、Cloud 验收和发布路标；
- `task_plan.md`：当前执行契约、唯一 Next Step、不变量和退出条件；
- `findings.md`：持久研究与决策依据；
- `progress.md`：按时间记录实施和测试证据。

状态或下一步冲突时，以活动 `task_plan.md` 为准。

### 已发布 v0.2.2 基线

- patch、adapter/installer/bootstrap 集成、自动回归、Cloud 验收、最终打包和发布均已完成；
- [`黑盒验证.md`](黑盒验证.md) 的完整 A—F Cloud matrix 于 2026-08-01 通过，包括长
  wrapper unsynced sentinel 和最终 doctor；
- 已发布 Release ZIP SHA-256：
  `71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84`；
- `.planning/2026-08-01-v0.2.2-cloud-catchup-compatibility/` 保留实现、验收和发布历史。

### 当前 v0.3.0 modernization

- Phase 1 complete：来源、contracts、overlay ledger、deterministic import、manifest/license、
  installer lifecycle 和 alpha.1 Cloud smoke 均已关闭；
- Phase 2 complete：owned-catchup、transcript/session safety、diagnostic、supervisor、权限边界和
  alpha.2 Fresh/Resume Cloud hard acceptance 均已通过；alpha.2 现为历史 fallback；
- Phase 3 Round 1～3 complete：canonical owned-plan contracts、controlled snapshot、safe reads、
  single-link policy、inactive trusted graph 和 63/63 Linux/Cloud gate 已关闭；
- Round 4 入口分析 complete：R4-A 是 bounded supervisor/type seam，R4-B 是 atomic activation
  与 adapter thinning，R4-C 是 beta.1 seal 和 Fresh/Resume Cloud acceptance；
- R4-A 与 R4-B 均已完成并通过 Windows 与 Linux/Cloud gate；R4-B 的 plan-first activation、
  adapter thinning、exact project forwarding、69/69 Linux 和隔离 alpha.2 upgrade/doctor 均
  PASS；
- R4-C 已完成 22-entry 自校验 ZIP/外部 bootstrap 的精确字节 seal、发布下载复核和完整
  Fresh/Resume A～F。Phase 3 已关闭，beta.1 是 Phase 4～8 当前 rollback baseline；
- Phase 4 尚未开始，等待维护者明确授权后进入 Round 1 Discovery Gate；不得从 Phase 3 完成
  自动推导 implementation authorization。

更详细的阶段摘要和发布路标见 `work_plan.md`；Round 4 gate 见
`docs/phase-3-round-4-activation-plan.md`；R4-A Cloud gate 见
`docs/phase-3-round-4-r4a-cloud-acceptance.md`，R4-B Cloud gate 见
`docs/phase-3-round-4-r4b-cloud-acceptance.md`；beta.1 最终资产与 A～F 见
`docs/v0.3.0-beta.1-cloud-hard-acceptance.md`。新的 lifecycle events 继续延后到各自 Phase 的
Discovery Gate、独立实现和 Cloud 验收。

### 工作规则

1. 做架构决策前重读活动 plan；
2. 研究写入 `findings.md`，不要堆入 `task_plan.md`；
3. 实施和测试后更新 `progress.md`；
4. phase status 和 `Next Step` 一起更新；
5. upstream files 能保持 byte-for-byte 就不修改，Host translation 放在本地 adapter/Driver；
6. production 永远不能指向 moving branch 或 `latest` artifact；
7. 每次 lifecycle expansion 都必须是独立、可审查的 rollout；
8. 遵守 `PROJECT_UNDERSTANDING.md` 的 Discovery Gate：新 Phase 必须重新审计/规划；架构、
   contract、trust、Release、rollback 或 Cloud evidence 发生实质分歧时，先暂停实施。

## Release 发布流程

1. 审查并合并本仓库变更；
2. 运行完整本地和 installer test matrix；
3. 使用 `contracts/release-artifact-v1.json` 的精确 entry list 和 deterministic settings，构建
   根目录为 `pwf-codex-cloud-hooks/` 的 immutable archive；不得使用 repository-wide wildcard，
   不得包含本地 `planning-with-files-3.8.2/` 参考树；
4. 检查最终 ZIP 内容并计算 SHA-256，此后不得再修改 ZIP；
5. 把最终 version、package name 和 ZIP SHA-256 写入
   `init-cloud-sandbox-v0.3.0.bash`，再计算封板后 Bash SHA-256；
6. 发布两个 immutable assets，并核对上传后的 hashes；
7. 在 fresh environment 运行 bootstrap install 和 doctor；
8. 按[`黑盒验证.md`](黑盒验证.md)的 v0.3.0 流程回归，必须看到 resume canary、
   `Runtime: codex`、unsynced count 和 sentinel；
9. 每条新 lifecycle path 全部证明前，保留 canary；
10. 在独立审查的变更中移除 canary，并重新计算 production hashes。

Cloud setup 永远不能下载 moving branch 或没有 checksum 的 `latest` release。

## 安全摘要

- 保留无关 requirements 和 Hook handlers；
- 只安装 owned runtime，只删除 owned state；
- 使用原子写入和 exclusive installer lock；
- 校验 pinned upstream identity 和 installed runtime；
- 记录完整 requirements hash 和 unowned requirements hash；
- unknown drift 时阻止 repair；
- 使用 system-managed Hook channel，不依赖 `--dangerously-bypass-hook-trust` 或私有 trust-state keys；
- managed commands 和异常 policy state 必须人工审查。

## 许可证

本仓库采用 MIT License。再分发的 upstream runtime code 在 `THIRD_PARTY_NOTICES.md` 中保留
完整的 upstream MIT copyright 和 permission notice。
