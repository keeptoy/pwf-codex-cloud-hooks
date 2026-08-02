# 项目理解：pwf-codex-cloud-hooks

> 最后更新：2026-08-02  
> 当前迭代：`v0.3.0` 开发版  
> 已发布基线：`v0.2.2`

## 1. 这份文档的用途

这是一份面向维护者和后续 Codex 会话的项目心智模型，用来在 `/clear`、
`resume`、context compaction 或换人维护后快速恢复背景。

它记录稳定事实、已确认的设计决策和仍待验证的问题，不代替具体执行计划：

- 当前行为和操作说明看 `README.md`；
- Cloud 验收步骤看 `黑盒验证.md`；
- 后续阶段和轮次看 `work_plan.md`；
- 具体执行契约看活动 `.planning/<slug>/task_plan.md`；
- 历史研究和实施证据看同目录的 `findings.md`、`progress.md`。

推荐恢复上下文顺序：

1. 读本文件；
2. 读 `.planning/.active_plan`；
3. 读活动计划的 `task_plan.md`、`progress.md`、`findings.md`；
4. 读 `git status --short --branch`；
5. 开始改动前再核对 README、黑盒手册和相关源码。

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

因此本仓库同时需要 Cloud 部署适配层和临时上游兼容补丁。

## 4. 当前 v0.2.2/v0.3.0 继承的运行链

```text
init-cloud-sandbox-v0.3.0.bash
  |-- 准备 Debian/Ubuntu amd64 Cloud 沙箱依赖
  |-- 安装上游 planning-with-files v3.8.2 Skill
  |-- 下载并校验本仓库 GitHub Release ZIP
  |-- 对全局 Skill 的 session-catchup.py 应用受哈希保护的兼容补丁
  `-- 调用 install.js 安装、doctor 并验证 Managed Hooks

/etc/codex/requirements.toml
  `-- /usr/bin/python3 /opt/codex/hooks/planning-with-files/hook_adapter.py <event>
        |-- 解析 Codex Hook stdin JSON
        |-- 自己解析并注入 active plan 和 recent progress
        `-- SessionStart 时调用全局 Skill 中已打补丁的 session-catchup.py
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

## 7. v0.2.2 的四项 Cloud 兼容补丁

补丁 ID：`PWF_CODEX_CLOUD_COMPAT_PATCH`。

目标文件：全局 Skill 的 `scripts/session-catchup.py`。

| Delta | Cloud 事实 | 当前兼容行为 |
|---|---|---|
| Runtime 选择 | Skill 位于 `.agents/skills`，路径中没有 `/.codex/` | adapter 显式传 `PWF_RUNTIME=codex` |
| Session store | `/root/.codex/sessions` 不存在，实际在 `/opt/codex/sessions` | 优先 `CODEX_SESSIONS_DIR`，再 `$CODEX_HOME/sessions`，最后 `~/.codex/sessions` |
| Scoped plan | planning context 支持 `.planning/<slug>`，原 catch-up 入口只检查根目录 | catch-up existence guard 同时识别 scoped planning state |
| 长 Cloud wrapper | 真正用户指令可能位于长 PR/反馈 wrapper 尾部 | 长用户消息有界保留头 350 字和尾 650 字 |

补丁器只接受两个已知状态：

- pristine upstream SHA-256；
- 当前 patched SHA-256。

任何第三种内容都拒绝修改。补丁是临时 bridge，不是永久 fork。

## 8. 上游源码与补丁输入边界

仓库附带但忽略提交的 `planning-with-files-3.8.2/` 是开发参考树，不进入生产包。

当前补丁输入来自上游 canonical Skill 分发文件：

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
当前生产补丁输入。

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
  `response_item`、`event_msg` 的脱敏结构，可直接转成 Phase 1 Cloud fixture。

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
- 先打 Skill 兼容补丁，再调用 installer；
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
- 当前自行解析 active/newest/root plan；
- 当前自行读取 plan head 和 progress tail；
- SessionStart 时监督运行全局 Skill 中的 patched catch-up；
- Runtime advisory 失败时保持 Codex loop 可继续。

### `patches/patch_planning_skill.py`

- 对 pinned pristine v3.8.2 输入做四处确定性转换；
- 校验 exact anchors、输入/输出 SHA；
- 原子替换并保留文件 mode；
- 重复执行幂等；
- 未知内容 fail-closed。

## 11. 当前长期缺口

- Runtime 仍执行用户全局 Skill 目录中的可变文件；
- owned runtime 当前只有 adapter 和 installed manifest；
- adapter 仍维护一套平行的 plan resolution/injection 实现；
- 当前 resolver 缺少上游的 `PLAN_ID`、BOM 和 canonical containment；
- scoped symlink 可能逃逸项目根目录；
- installer 校验的 `resolve-plan-dir.sh` 当前没有被 Managed Hook 执行；
- 安装时记录的 `skill_root` 没有成为 Hook 运行时显式输入；
- 当前 catch-up 忽略 Host 已提供的 `transcript_path`，仍扫描 session store 选择 rollout；
- catch-up 静默跳过，没有机器可读 reason code；
- 已证明 transcript 存在跨 `response_item`/`event_msg` 的逐字重复，但 runtime 尚未实现
  完整归一化和安全去重；
- per-message 截断存在，但缺少明确的完整报告预算；
- 当前没有 opt-out、可靠 session isolation、attestation、nonce、smart injection、
  structured ledger、compact/tool/permission/Stop Managed Hooks；
- normal install 中途失败依赖备份人工恢复，不是自动事务回滚；
- 当前没有可复现的 upstream allowlist 导入器和正式 Release artifact builder。

## 12. v0.3.0 目标架构

```text
/etc/codex/requirements.toml
  `-- absolute command beneath managed_dir
        `-- $CODEX_ROOT/hooks/planning-with-files/
              |-- hook_adapter.py
              |-- upstream/                     # pinned + allowlisted
              |-- compatibility-overlays.json   # 每项有退休条件
              |-- installed-manifest.json
              `-- THIRD_PARTY_NOTICES.md
```

目标职责边界：

- adapter 只负责 Codex 协议、显式请求、子进程监督、预算和输出转换；
- owned upstream runtime 负责 plan resolution、injection、catch-up、attestation、
  ledger 和 completion semantics；
- installer 负责 provenance、allowlist、atomic install、backup、doctor、repair、
  uninstall、rollout 和 rollback；
- global Skill 最终保持 pristine，只负责 Skill discovery 和使用说明；
- 每项 Cloud overlay 都必须记录来源、哈希、fixture、负责人和明确退休条件。

## 13. 当前进度和下一步

当前活动计划：

```text
.planning/2026-08-01-managed-runtime-modernization/
```

已完成：

- Phase 0：仓库审计与路线图；
- Phase 0.5：吸收 v0.2.2 Cloud 实证；
- Phase 0.6：初始化 v0.3.0 迭代身份。

当前阶段：Phase 1；Round 1 契约与台账已完成，尚未开始行为变更。

Round 1 已完成：

- owned runtime allowlist；
- 直接依赖图；
- 四项 compatibility overlay ledger 和退休条件；
- adapter -> runtime versioned request schema；
- diagnostic reason codes；
- Release ZIP 文件边界；
- upstream/import/manifest schema 和契约测试。

下一轮是可复现导入与校验；仍不得改变已经通过 v0.2.2 Cloud 验收的 Hook 行为。

## 14. 本仓库可能退役的条件

路径改变不等于整个仓库必须退役。

- 如果上游只解决 Runtime/session/scoped/wrapper 差异，可以退休兼容补丁，但仍保留
  本仓库的 managed deployment 和治理能力；
- 只有当 Codex Cloud 同时能够直接、安全、可运维地使用上游本地 Hook 模型，且
  不再需要 system-managed policy、pinned runtime、doctor、repair、backup、drift
  protection、Cloud rollout 和 rollback 时，本仓库才可以整体弃用或归档。

## 15. 已确认决策

1. v0.2.2 是已发布、Cloud 验证的 rollback baseline。
2. v0.3.0 是未发布的 Managed Runtime Modernization 迭代。
3. `/opt/codex` 是当前默认和已验证路径，不是不可变平台常量。
4. 当前平台在沙箱初始化阶段不提供 `CODEX_HOME`，进入 Codex Runtime 后向 agent 和
   Hook 环境提供 `/opt/codex`；实现仍须兼容阶段差异和未来缺失，不能当作永久常量。
5. 初始化 Bash 作为 ZIP 外部的独立 Release Asset。
6. compat patch 是临时 overlay，不能演化成永久 fork。
7. 先修正 runtime ownership 和 diagnostics，再增加新 lifecycle events。
8. hard Stop gating 最后实现，并且必须显式 opt-in、可封顶和可逃生。
9. Hook stdin 的 `session_id` 是当前首选 session identity；`CODEX_THREAD_ID` 在 agent
   Shell 存在但在 Hook 环境缺失，不得作为 Hook runtime 依赖。
10. Hook stdin 的 `transcript_path` 是当前首选 transcript locator；使用前必须做
    containment、文件类型和 session identity 校验，session-store 扫描保留为兼容 fallback。

## 16. 仍待补充或验证

1. 可选增强证据：验证 Hook stdin `transcript_path` 指向的 JSONL，其 `session_meta.id` /
   `session_meta.session_id` 与 stdin `session_id` 一致；这不阻塞 Phase 1 契约编写。

Cloud 环境变量继续作为 non-authoritative input。`session_id` 和 `transcript_path` 已有
真实 Hook 证据，可以进入 versioned host contract；runtime 对字段缺失、错误类型和越界
路径仍须定义兼容失败行为。当前已无阻塞 Phase 1 第一轮的外部信息缺口。
