# 项目理解：pwf-codex-cloud-hooks

> 最后更新：2026-08-04
> 当前迭代：`v0.3.0` 开发版  
> 已发布基线：`v0.2.2`
> 当前 Phase 3 回滚基线：Cloud-accepted `v0.3.0-alpha.2`

## 1. 这份文档的用途

这是一份面向维护者和后续 Codex 会话的项目心智模型，用来在 `/clear`、
`resume`、context compaction 或换人维护后快速恢复背景。

它记录稳定事实、已确认的设计决策和仍待验证的问题，不代替具体执行计划：

- 当前行为和操作说明看 `README.md`；
- Cloud 验收步骤看 `黑盒验证.md`；
- 长期 Phase 路线、发布路标和 Cloud 验收摘要看 `work_plan.md`；
- 当前授权范围、下一步、不变量和退出条件看活动 `.planning/<slug>/task_plan.md`；
- 历史研究和实施证据看同目录的 `findings.md`、`progress.md`。

推荐恢复上下文顺序：

1. 读根级 `AGENTS.md`，确认阅读顺序、权威关系和稳定工作边界；
2. 读本文件；
3. 读 `work_plan.md` 和 `.planning/.active_plan`；
4. 读活动计划的 `task_plan.md`、`progress.md`、`findings.md`；
5. 读 `git status --short --branch`；
6. 开始改动前再核对 README、黑盒手册、当前专项设计和相关源码。

### 1.1 探路门槛（Discovery Gate）

本项目采用“先探路、再实施”的动态轮次治理。后续 Codex 会话恢复上下文时，除确认当前
Phase/轮次外，还必须判断是否需要暂停实施并进入探路门槛。

以下情况必须先探路：

1. **进入全新 Phase**：第一轮默认是恢复背景、扫描当前实现与证据、复核旧假设、重估
   轮次并冻结退出条件；原则上不直接修改生产行为。
2. **进入关键轮**：激活、迁移、删除旧实现、修改 schema/Host ABI/trusted graph、Release、
   回滚或安全边界前，必须先做设计检查点。
3. **实施中出现实质偏差**：Cloud 与本地证据冲突、测试揭示设计假设错误、存在两条以上
   代价明显不同的路线，或 timeout、权限、进程、数据安全模型发生变化时，应主动停止当前
   实施并追加探路。

是否“正式增加一轮”按影响判断：如果变化会修改架构、契约、Phase 范围、信任边界、
Release 边界或回滚方式，就新增可独立审查的探路轮；如果架构不变，只是把既定方案拆成
安全的实施顺序，则可使用当前 Round 内的 A/B/C 子门槛。普通测试补漏、文档同步和已冻结
方案内的局部 bug 修复不单独增加探路轮。

探路期间应把实现状态明确标记为暂停，且不得提前修改生产 dispatch、发布哈希或外部环境。
探路至少产出：

- 新证据与旧计划的差异；
- 可选路线、代价和最终选择；
- 不变量、非目标、实施边界和停止条件；
- 本地测试、Cloud 验收与回滚方案；
- 明确的 `GO`、`CONDITIONAL_GO` 或 `NO_GO` 结论。

判断口诀是：**如果继续写代码可能出现“实现正确，但架构方向错了”，就先停下来探路。**
Codex 可以依据上述触发条件主动暂停；若路线选择需要维护者授权，应先给出证据和选项再询问，
不能用代码实现代替架构决策。

## 2. 一句话定位

上游 `planning-with-files` 负责规划工作流和规划文件语义；本仓库负责把上游面向
本地 Codex 的 Hook/runtime 安全地部署到 Codex Cloud 的 system-managed Hook
环境，并提供 Cloud 兼容、来源校验、安装治理、诊断、修复、回滚和黑盒验收。

本仓库不是第二套 planning 方法，也不是因为上游没有 Hook 才创建 Hook。

## 3. 为什么上游 Hook 不能直接用于当前 Cloud

上游 `planning-with-files v3.8.2` 已包含 Codex 集成：

- `.codex/hooks.json`；
- `.codex/hooks/*`；
- `.codex/skills/planning-with-files/*`；
- `skills/planning-with-files/scripts/*` 中的 canonical runtime。

它主要面向本地 workspace 或个人安装，默认使用：

- 项目 `.codex/hooks.json` 或用户 `~/.codex/hooks.json`；
- 项目相对命令或 `$HOME/.codex` fallback；
- `~/.codex/sessions` 作为 Codex session store；
- 脚本安装路径中的 `/.codex/` 来推断 Runtime。

当前 Codex Cloud 的部署模型不同：

- 系统策略由 `/etc/codex/requirements.toml` 管理；
- managed Hook 命令需要绝对路径并位于受控 `managed_dir`；
- 当前已验证的安装根目录是 `/opt/codex`；
- Skill 通过 skills CLI 安装到 `/root/.agents/skills/planning-with-files`；
- session 实际位于 `/opt/codex/sessions`；
- 后续 Hook 进程不能依赖初始化 Shell 中的环境变量继续存在。

因此本仓库同时需要 Cloud 部署适配层和仅位于 owned copy 的临时上游兼容 overlay。

## 4. 当前已验收的 v0.3.0-alpha.2 运行链

```text
init-cloud-sandbox-v0.3.0.bash
  |-- 准备 Debian/Ubuntu amd64 Cloud 沙箱依赖
  |-- 安装上游 planning-with-files v3.8.2 Skill
  |-- 下载并校验本仓库 GitHub Release ZIP
  |-- 保持全局 Skill 为 pristine upstream v3.8.2
  `-- 调用 install.js 安装、doctor 并验证 owned Managed Hooks

/etc/codex/requirements.toml
  `-- /usr/bin/python3 /opt/codex/hooks/planning-with-files/hook_adapter.py <event>
        |-- 解析 Codex Hook stdin JSON
        |-- UserPromptSubmit 仍本地解析并注入 active plan 和 recent progress
        `-- SessionStart 时监督 sibling owned-catchup.py
              `-- 只导入 owned upstream/session-catchup.py
```

当前只启用两个 Managed Hook：

| Event | 当前行为 |
|---|---|
| `SessionStart` | 输出 canary；运行 catch-up；注入 planning context |
| `UserPromptSubmit` | 输出 canary；注入 planning context |

当前两条路径都是只读的。其他上游 Hook 暂未作为 Managed Hook 启用。

## 5. 初始化脚本与 Release 的边界

维护者已确认长期发布两个独立的 GitHub Release Asset：

```text
GitHub Release
|-- pwf-codex-cloud-hooks-vX.Y.Z.zip
`-- init-cloud-sandbox-vX.Y.Z.bash
```

正式契约：

- 初始化 Bash 位于 Release ZIP 外部；
- ZIP 不包含负责校验该 ZIP 的 Bash；
- Bash 下载并校验 ZIP；
- 先冻结和构建 ZIP，再计算 SHA-256，最后把哈希写入 Bash；
- 这样不会形成“脚本内容改变 ZIP、ZIP 哈希又改变脚本”的自引用问题。

`init-cloud-sandbox-v0.3.0.bash` 是 Cloud 沙箱初始化入口，不是 Hook Runtime。
它当前默认把 Codex 安装根目录视为 `/opt/codex`，但允许显式覆盖。

## 6. `CODEX_HOME` 的准确语义

不要把下面三个概念混在一起：

1. **当前已验证的安装根目录**：`/opt/codex`；
2. **Cloud 沙箱初始化阶段**：实测 `CODEX_HOME` 不存在；
3. **本仓库初始化脚本内的兼容变量**：脚本会执行
   `export CODEX_HOME="${CODEX_HOME:-/opt/codex}"`，只保证当前安装流程有明确根目录；
4. **Codex agent/对话运行阶段**：实测 `CODEX_HOME=/opt/codex`；
5. **Managed Hook 进程环境**：实测同样包含 `CODEX_HOME=/opt/codex`，但跨版本、
   跨镜像不能把它当作必需条件。

Cloud 沙箱生命周期背景：

- 每个冷启动沙箱都会运行仓库配置的初始化脚本；
- 在同一对话中继续工作时，Cloud 可能复用已有沙箱缓存；
- 因此在已初始化或缓存沙箱中观察到的文件、进程环境和工具链，可能是默认镜像与
  初始化脚本共同作用的结果，不能直接归因于 Cloud 默认镜像；
- 默认 agent runtime 契约已经在一个空 GitHub 仓库、无仓库初始化脚本的新冷沙箱中
  执行只读探针验证。

2026-08-02 的无仓库初始化脚本冷沙箱，在 Codex Runtime 启动后的 agent Shell 中观察到：

```text
uid=0(root)
HOME=/root
CODEX_HOME=/opt/codex
CODEX_SESSIONS_DIR=UNSET
/opt/codex/sessions exists
/root/.codex missing
```

随后用同一只读判断脚本对比生命周期阶段，结论已经收敛：Cloud 沙箱初始化脚本执行时
`CODEX_HOME` 不存在；沙箱完成启动、进入第一轮提示词对话后，agent Shell 中出现
`CODEX_HOME=/opt/codex`；真实 Managed Hook 进程环境中也存在相同值。临时探针和空仓库
初始化脚本都没有设置该变量，因此平台在初始化阶段结束与 Codex Runtime 启动之间使其
可用，而不是本仓库 bootstrap 把 export 持久化给后续进程。

这仍不能把未来镜像固定为同一路径。设计上必须把环境变量视为有用提示而非 Runtime
必需条件；显式 Hook stdin、installer 配置和 owned installed path 才是可靠边界。

当前 adapter 的兼容措施是：若 Hook 进程没有 `CODEX_HOME`，就根据自身安装路径
`/opt/codex/hooks/planning-with-files/hook_adapter.py` 向上推导 `/opt/codex`，并只把
这个值传给 catch-up 子进程。

长期设计原则：

- `/opt/codex` 是当前 Cloud 默认值和测试 fixture，不是硬编码平台常量；
- installer 必须接收明确的绝对安装根目录；
- Hook 不依赖初始化 Shell 环境持久化；
- adapter/runtime 请求应显式携带 runtime、project root、validated transcript path、
  session identity、session-store fallback、event/source 和输出预算；
- session store 默认可由已安装的 managed root 推导，但允许显式覆盖。

## 7. v0.2.2 历史兼容 overlay

补丁 ID：`PWF_CODEX_CLOUD_COMPAT_PATCH`。

历史目标文件：全局 Skill 的 `scripts/session-catchup.py`。从 alpha.2 起，全局 Skill 保持
pristine；相同四项兼容行为只存在于哈希固定的 owned
`runtime/upstream/session-catchup.py`，生产 bootstrap 不再运行补丁器。

| Delta | Cloud 事实 | v0.2.2 overlay / alpha.2 owned 等价行为 |
|---|---|---|
| Runtime 选择 | Skill 位于 `.agents/skills`，路径中没有 `/.codex/` | adapter 显式传 `PWF_RUNTIME=codex` |
| Session store | `/root/.codex/sessions` 不存在，实际在 `/opt/codex/sessions` | 优先 `CODEX_SESSIONS_DIR`，再 `$CODEX_HOME/sessions`，最后 `~/.codex/sessions` |
| Scoped plan | planning context 支持 `.planning/<slug>`，原 catch-up 入口只检查根目录 | catch-up existence guard 同时识别 scoped planning state |
| 长 Cloud wrapper | 真正用户指令可能位于长 PR/反馈 wrapper 尾部 | 长用户消息有界保留头 350 字和尾 650 字 |

历史复现补丁器只接受两个已知状态：

- pristine upstream SHA-256；
- 当前 patched SHA-256。

任何第三种内容都拒绝修改。它现在只用于复现和审计历史 overlay，不是安装或运行依赖。

## 8. 上游源码与历史 overlay 输入边界

仓库附带但忽略提交的 `planning-with-files-3.8.2/` 是开发参考树，不进入生产包。

历史 overlay 复现输入来自上游 canonical Skill 分发文件：

```text
planning-with-files-3.8.2/skills/planning-with-files/scripts/session-catchup.py
```

它与以下文件哈希相同：

- `.agents/skills/planning-with-files/scripts/session-catchup.py`；
- `.codex/skills/planning-with-files/scripts/session-catchup.py`；
- `tests/fixtures/planning-with-files/scripts/session-catchup.py`。

pristine SHA-256：

```text
6476fd9024d0cbb9bfb850119fd0beff7fb7cfab9c6683ce10e4cc8d830ce6de
```

patched SHA-256：

```text
fc765590dc32b3949027de97e33dad6a049daf148719ba1822598a6c146461e2
```

上游仓库根目录的 `scripts/session-catchup.py` 是另一分发实现，哈希不同，不能当作
历史 overlay 输入。当前生产运行时从 manifest/allowlist 生成 owned copy，不读取该仓库根文件。

## 9. Cloud 实证

### 环境与直接诊断

已观察到：

- install/诊断用户为 `root`；
- `HOME=/root`；
- Skill 实际路径为 `/root/.agents/skills/planning-with-files`；
- `/root/.codex/sessions` 不存在；
- `/opt/codex/sessions` 存在真实 `rollout-*.jsonl`；
- 项目存在 planning state；
- 直接执行 `.agents` 下的上游 catch-up 返回 0 但没有报告。

这个“退出 0、静默无输出”与 Runtime 误分类一致：脚本不在 `/.codex/`，未显式传
`PWF_RUNTIME=codex` 时会进入 Claude 分支，因此即使 `/opt/codex/sessions` 存在也
不会读取它。

### 无初始化脚本的默认镜像基线

2026-08-02 在空仓库、无初始化脚本、全新冷沙箱中观察到：

- 用户为 `root`，`PWD=/workspace/unit-test`，`HOME=/root`，`USER` 未设置；
- `CODEX_HOME=/opt/codex`，`CODEX_SESSIONS_DIR` 未设置；
- Codex CLI 为 `0.144.0-alpha.4`，`hooks` feature 为 stable/true；
- `/opt/codex/bin/codex` 与 `/opt/codex/sessions` 存在；
- `/etc/codex/requirements.toml`、`/root/.codex`、`/root/.agents` 均不存在；
- 因此当前镜像原生提供 Hook 能力和 `/opt/codex` session store，但没有本仓库负责的
  managed requirements，也没有预装 planning-with-files Skill；
- `CODEX_THREAD_ID` 存在；该样本的 `session_meta.id`、`session_meta.session_id` 与它
  长度和脱敏哈希完全相同，三者是同一个 UUID；
- session JSONL 的 `session_meta.source` 为 `vscode`，项目可通过 `cwd` 匹配；
- 成功的 `apply_patch` 产生结构化 `event_msg.payload.type=patch_apply_end`，包含
  `success=true`、相对项目路径的 `changes` 和 `call_id/turn_id/status/stdout/stderr` 等键；
- 同一用户或助手消息会同时出现在 `response_item` 与 `event_msg`，角色、长度和文本
  哈希完全一致，证明 catch-up 必须做跨 record-family 的保守逻辑去重；
- 本次 JSONL 共 56 条、无无效 JSON 行，已取得 `session_meta`、`patch_apply_end`、
  `response_item`、`event_msg` 的脱敏结构；这些样本已进入 Phase 1 Cloud fixture。

CLI 版本、feature 状态和镜像文件布局是带日期的观察样本，不是永恒平台契约。

### 真实 Managed Hook stdin 契约

同日使用最小、只记录 schema 的临时 Managed Hook，已观察 startup、resume 和两次
UserPromptSubmit：

| Event | stdin 字段 |
|---|---|
| `SessionStart` | `cwd`, `hook_event_name`, `model`, `permission_mode`, `session_id`, `source`, `transcript_path` |
| `UserPromptSubmit` | `cwd`, `hook_event_name`, `model`, `permission_mode`, `prompt`, `session_id`, `transcript_path`, `turn_id` |

已证实的语义：

- 两个 event 都收到 36 字符的 `session_id`；startup、resume 与两次 prompt 的脱敏哈希
  完全相同，说明同一会话内稳定；
- 每次 `UserPromptSubmit` 收到独立的 36 字符 `turn_id`；两次哈希不同；
- `SessionStart.source` 分别真实观察到 `startup` 和 `resume`；
- Host 直接传入 `transcript_path`，因此新 runtime 应优先校验并使用它，而不是先扫描
  session store 猜测当前 rollout；扫描只应作为显式兼容 fallback；
- Hook 环境包含 `CODEX_HOME=/opt/codex`，但不包含 `CODEX_THREAD_ID`、
  `CODEX_SESSIONS_DIR` 或 `PWF_SESSION_ID`；
- 临时探针初始化脚本没有赋值或 `export CODEX_HOME`；探针中的
  `equals_opt_codex = value == "/opt/codex"` 只比较 `os.environ.get("CODEX_HOME")`
  已读取到的值，不会设置环境变量；
- 单独的生命周期对照又证明初始化脚本阶段没有该变量，而 Codex Runtime 启动后有；
  因此可确认变量由平台在两个阶段之间提供，不是仓库初始化脚本的持久化副作用；
- agent Shell 中的 `CODEX_THREAD_ID` 不能作为 Hook contract；Hook 应使用 stdin 的
  `session_id`；
- `prompt` 只在 UserPromptSubmit stdin 出现，必须视为敏感内容，正常诊断不得记录原文；
- startup/resume 与 UserPromptSubmit canary 都被 Runtime 实际注入，临时 managed
  requirements 的加载时序得到验证。

`transcript_path` 虽由 Host 明确提供，runtime 仍必须做绝对路径、文件类型、允许的
session root containment 和 session identity 一致性校验，不能无条件信任字符串。
同时，官方 Hooks 契约明确说明 transcript JSONL 格式不是稳定接口；当前探针取得的
`session_meta`、`patch_apply_end`、`response_item` 和 `event_msg` 只能作为带版本/日期
的兼容 fixture，runtime 必须对未知记录和字段变化做防御性处理，不能把样本结构当作
永久平台 schema。

### Resume 黑盒失败证据

一次真实 resume 已观察到：

- `SessionStart source=resume`；
- `SESSION CATCHUP DETECTED`；
- `Runtime: codex`；
- `Last planning update: task_plan.md at message #82`；
- `Unsynced messages: 6`；
- Planning context 正常注入。

但 USER 内容停在长 PR wrapper 的开头，唯一尾部 sentinel 未出现。这是“只保留
前 300 字”问题的直接失败证据，也是第四项 head/tail 补丁的来源。

### v0.2.2 最终基线

维护者已补充应用最终补丁后的原始脱敏 Cloud 输出。完整证据保存在：

```text
.planning/2026-08-01-managed-runtime-modernization/evidence/v0.2.2-session-catchup-success.md
```

该次真实 resume 明确观察到：

- `SessionStart source=resume`；
- `SESSION CATCHUP DETECTED`；
- previous session 为 `rollout-2026-08-01T13-45-21-019fbd92-7cc2-7813-85d1-54144d4cf649`；
- `Runtime: codex`；
- scoped `task_plan.md` 更新位于 message 25；
- `Unsynced messages: 7`；
- 长 PR wrapper 中间出现有界 `...[truncated]...`；
- wrapper 尾部 `PWF_CATCHUP_UNSYNCED_SENTINEL_82C4` 仍位于 `UNSYNCED CONTEXT`；
- Planning context；

因此 `session-catchup.py` 的 `.agents` runtime、`/opt/codex/sessions`、scoped plan 与
head/tail 长 wrapper 四项 Cloud 兼容链路均有成功原始证据。`Unsynced messages: 7` 是
v0.2.2 报告的观测计数，不代表底层 JSONL 已归一化成 7 条去重逻辑消息。

完整 A-F 验收还包括：

- startup canary；
- owned repair；
- unknown runtime drift fail-closed；
- 最终 `doctor healthy=true`。

已发布 v0.2.2 ZIP SHA-256：

```text
71d2ac8e073c49a6a75e4b649f1d9687b6eb9c5c51e525db72c505e69c353d84
```

v0.3.0 不能继承该验收结论，最终包必须重新验证。

## 10. 当前组件职责

### `init-cloud-sandbox-v0.3.0.bash`

- 初始化 Cloud 沙箱依赖；
- 安装 pinned upstream Skill；
- 下载、校验和解压本仓库 Release ZIP；
- 保持全局 Skill pristine，再调用 installer；
- 执行 filesystem、TOML、Codex feature、adapter protocol 和 doctor 检查；
- 提示操作者在全新 Cloud 任务中做黑盒验收。

### `install.js`

- 接收明确的 Codex home、Skill root 和 managed requirements 路径；
- 校验选定的 Skill 文件哈希；
- 合并 `/etc/codex/requirements.toml` 并保留非 owned 内容；
- 安装绝对 managed Hook 命令；
- 维护锁、备份、schema-v3 manifest、doctor、repair 和 uninstall；
- 区分可修复 owned drift 与必须人工处理的 unknown/unowned drift。

### `hooks/hook_adapter.py`

- 解析 Hook stdin JSON 和 `cwd`；
- 输出 Codex `hookSpecificOutput.additionalContext` JSON；
- 输出 rollout canary；
- 当前 R4-B 开发路径不再解析或读取 plan 文件；
- 两个事件先监督 sibling `owned-plan.py`，SessionStart 再把 exact project 交给 `owned-catchup.py`；
- 只保留 Host payload/request、共享监督器、严格结果校验、上下文组合与 Codex JSON；
- Runtime advisory 失败时保持 Codex loop 可继续。

### `runtime/owned-catchup.py`

- Phase 2 起作为 active SessionStart child；
- 验证 Host transcript/session roots 与 canonical project state；
- 归一化 Codex JSONL、保守跨 record-family 去重、识别 planning update；
- 有界渲染 unsynced context，并返回严格 runtime-result-v1；
- 不解析或读取 plan body，不执行 global Skill。

### `runtime/owned-plan.py`

- Phase 3 Round 3 已安装、哈希和打包，R4-B 开发路径现已 dispatch；
- 拥有 opt-out、session attachment、canonical plan resolution 和 fd-rooted safe reads；
- 在私有 `0700` snapshot/`0600` 文件中调用 pristine resolver/injector；
- 返回 exact-v1 plan context 和唯一 canonical project state；
- 当前是两个 event 的唯一 active plan owner；Linux/Cloud R4-B gate 已以 69/69 PASS 关闭。

### `runtime/upstream/` 与 `contracts/`

- 四个 upstream 文件来自 pinned v3.8.2 allowlist；只有 `session-catchup.py` 带 managed overlay；
- `resolve-plan-dir.sh`、`inject-plan.sh`、`ledger-summary.sh` 保持 pristine；
- 两个 installed plan schema 冻结 adapter ↔ owned-plan exact-v1；
- overlay ledger、runtime bundle、catch-up schemas 和 Release allowlist 负责来源与边界治理；
- deferred Phase 4+ 脚本不能因上游版本中存在就自动成为 Managed Runtime。

### `patches/patch_planning_skill.py`（历史 overlay 复现工具）

- 对 pinned pristine v3.8.2 输入做四处确定性转换；
- 校验 exact anchors、输入/输出 SHA；
- 原子替换并保留文件 mode；
- 重复执行幂等；
- 未知内容 fail-closed；
- alpha.2 Release 与 bootstrap 不再包含或调用它。

## 11. 当前长期缺口

- R4-B 已在开发工作区原子激活 `owned-plan.py`、删除 adapter 的平行 plan
  resolution/rendering，并通过 69/69 Linux/Cloud 激活 gate；
- R4-A 的共享 deadline supervisor 与 typed seam 已通过 66/66 Linux/Cloud；R4-C beta.1
  封板和 Fresh/Resume Cloud 验收仍未授权；
- attestation、nonce、smart/structured-ledger 模式与 compact/tool/permission/Stop Managed Hooks
  仍按 Phase 4～8 延后，不能从 upstream allowlist 推断为已实现；
- normal install 失败可通过备份恢复，但尚不是跨全部外部文件的自动事务回滚；
- `/opt/codex`、Hook schema 和 transcript JSONL 都是带日期的 Cloud 事实，仍需保持显式 Host
  契约和兼容失败语义；
- 当前只有 PWF 这一项垂直集成；通用 Host/Driver 抽象必须等第二个只读插件验证后再提取。

## 12. v0.3.0 目标架构

```text
/etc/codex/requirements.toml
  `-- /usr/bin/python3 <managed_dir>/hook_adapter.py <event>
        `-- $CODEX_HOME/hooks/planning-with-files/
              |-- hook_adapter.py                         # 唯一 Host command
              |-- owned-catchup.py                        # active SessionStart child
              |-- owned-plan.py                           # canonical plan-context child
              |-- contracts/
              |     |-- adapter-plan-context-request-v1.schema.json
              |     `-- plan-context-result-v1.schema.json
              |-- upstream/
              |     |-- session-catchup.py                # owned overlay
              |     |-- resolve-plan-dir.sh               # pristine
              |     |-- inject-plan.sh                    # pristine
              |     `-- ledger-summary.sh                 # pristine/deferred mode
              |-- compatibility-overlays-v1.json
              |-- THIRD_PARTY_NOTICES.md
              `-- installed-manifest.json
```

该树表示 v0.3.0 目标职责与安装边界。当前 R4-B 开发 adapter 已调用两个 child，且激活已通过
Linux/Cloud gate；但 R4-C 封板和 Fresh/Resume Managed Hook 黑盒尚未授权，不能提前当作已发布
beta 行为。

Phase 3 目标职责边界：

- adapter 只负责 Codex Host 协议、显式请求、共享 deadline/子进程监督、严格结果校验、
  canary、上下文组合和输出转换；
- `owned-plan.py` 负责 plan/session policy、safe reads、pristine injection 和 canonical project；
- `owned-catchup.py` 负责 transcript trust/normalization 和 unsynced report；
- pinned upstream 文件负责其 canonical 语义，任何 managed overlay 都必须有 ledger 和退休条件；
- installer 负责 provenance、allowlist、受管安装、backup、doctor、repair、uninstall 和 rollout；
- global Skill 最终保持 pristine，只负责 Skill discovery 和使用说明；
- Phase 4～8 的 attestation、ledger mutation、compaction/tool/Stop 能力必须各自重新探路，
  不能提前耦合到 Phase 3 legacy path。

长期可复用边界是 Host ABI + 受管 runner + Integration Driver request/result；受控 snapshot
只是当前 PWF Driver 的实现选择，不是“任意 Skill 自动转换器”的通用承诺。

## 13. 当前进度和下一步

本节只提供恢复上下文的路由和带日期快照，不再复制逐轮实施历史：

| 需要回答的问题 | 读取位置 |
|---|---|
| 长期 Phase、发布路标、已完成 Cloud 验收和阶段摘要 | `work_plan.md` |
| 当前授权范围、唯一 Next Step、不变量和退出条件 | 活动 `.planning/<slug>/task_plan.md` |
| 当前 Round 的详细研究、试错和测试证据 | 活动计划的 `findings.md`、`progress.md` |
| Round 4 A/B/C 激活、超时、失败和回滚设计 | `docs/phase-3-round-4-activation-plan.md` |
| Cloud 可复制操作 | `黑盒验证.md` 及版本/Phase 专项验收文档 |

2026-08-04 状态快照：

- Phase 1 与 Phase 2 已完成并通过各自 Cloud 验收；alpha.2 是当前 Phase 3 回滚基线；
- Phase 3 Round 1～3 已完成，inactive owned-plan 的完整 Linux/Cloud gate 为 63/63 PASS；
- Round 4 入口分析与 R4-A 已完成；Windows 48 PASS / 18 honest SKIP，Cloud/Linux 66/66 PASS；
- R4-B 已完成原子激活/adapter thinning；Windows 69 registered / 51 PASS / 18 honest SKIP /
  0 FAIL，Linux/Cloud 69/69 PASS，并通过真实双 child/跨用户、隔离升级、doctor、11/21、预算和
  零残留门槛；R4-C beta.1/Fresh+Resume Cloud 尚未授权；
- requirements 仍只注册 adapter；发布过的 alpha.2 ZIP/bootstrap 保持不可变。

若本节快照与活动 `task_plan.md` 冲突，以活动计划为准。本节只在架构基线、Phase、Cloud
验收或 Release 状态变化时更新；轮内 next step 和测试计数留在 planning/work plan，避免
这里再次演化成第三份执行计划。

## 14. 本仓库可能退役的条件

路径改变不等于整个仓库必须退役。

- 如果上游只解决 Runtime/session/scoped/wrapper 差异，可以退休兼容补丁，但仍保留
  本仓库的 managed deployment 和治理能力；
- 只有当 Codex Cloud 同时能够直接、安全、可运维地使用上游本地 Hook 模型，且
  不再需要 system-managed policy、pinned runtime、doctor、repair、backup、drift
  protection、Cloud rollout 和 rollback 时，本仓库才可以整体弃用或归档。

## 15. 已确认决策

1. **版本基线**：v0.2.2 是已发布、Cloud 验证的稳定 fallback；Cloud-accepted alpha.2
   是当前 Phase 3 rollback baseline；v0.3.0 仍是未正式发布的 modernization 迭代。
2. **路径不是契约**：`/opt/codex` 是当前默认和已验证路径，不是不可变平台常量。
   沙箱初始化阶段可以没有 `CODEX_HOME`，Codex Runtime 当前会向 agent/Hook 提供
   `/opt/codex`；实现必须同时支持显式参数、运行时变量和安全探测。
3. **发布边界**：初始化 Bash 长期作为 ZIP 外部的独立 Release Asset；先冻结 ZIP
   版本与 SHA-256，再封板脚本中的版本和摘要。
4. **上游所有权**：全局 PWF Skill 保持 pristine upstream v3.8.2；历史兼容 patch
   只允许作为可重现的 owned-runtime overlay，不得演化成对全局 Skill 的永久 fork。
5. **托管入口**：Managed Hook policy 只注册 adapter；owned child runtimes 与 adapter
   同目录安装，不各自成为平台 Hook handler。
6. **会话定位**：Hook stdin `session_id` 是首选 identity，`transcript_path` 是首选
   locator；路径必须通过 containment、类型和 identity 校验，session-store 扫描仅作
   兼容 fallback。`CODEX_THREAD_ID` 不得成为 Hook runtime 依赖。
7. **Phase 3 路线**：canonical plan context 采用“不修改上游文件的受控私有快照调用”；
   多目标 overlay 只保留为快照路线无法满足上游语义时的后备方案。
8. **稳定协议**：`adapter-plan-context-request-v1` 和 `plan-context-result-v1` 是 exact-v1
   合同名；不存在不兼容变更时不添加 `candidate` 后缀或另立近义合同。
9. **时间预算**：Host 30 秒上限内冻结共享 27 秒 deadline：plan 8 秒、catch-up 15 秒、
   adapter 收尾 4 秒；具体 grace、kill 和 JSON 收尾规则由 Round 4 激活设计文档约束。
10. **失败边界**：输出注入必须 fail-closed；单个 child 的运行失败对 Hook 生命周期
    fail-open，不能抑制 canary 或其他健康上下文，并须返回有界诊断。
11. **抽象边界**：当前唯一受支持集成仍是 PWF。Host/runner 可提取技能无关能力；
    PWF 语义留在 Driver。至少用第二个只读插件验证抽象后，才承诺通用转换能力。
12. **演进顺序**：新 Phase 和关键轮先过 Discovery Gate；先稳定 ownership、诊断和
    只读生命周期，再增加 lifecycle events；hard Stop 最后实现且必须显式 opt-in、
    可封顶、可逃生。

## 16. 仍待补充或验证

这里仅列尚未闭合的证据或架构假设；当前轮的实现清单不在本节维护。

1. **可选 Host 证据**：独立证明 Hook stdin `transcript_path` 所指 JSONL 的
   `session_meta.id` / `session_meta.session_id` 与 stdin `session_id` 一致。现有 runtime
   已执行 identity 校验；该证据增强未阻塞已经完成的 R4-A，也不是 R4-B 的前置条件。
2. **Phase 4 入口复核**：开始 hard Stop 前重新审计上游 modes、attestation 与 ledger
   语义，不能沿用 Phase 3 的只读假设直接外推。
3. **长期泛化证据**：第二个只读插件尚未验证 Host/runner/Driver 抽象；完成前不得把本仓库
   描述为通用技能转换器。

当前实施 gate 不在本节复制，以活动 `task_plan.md` 和相应设计/验收文档为准。目前没有需要
用户或平台先补充、从而阻塞当前 Next Step 的外部信息缺口。
