结论：未来工作确实是 Phase 1～9，共 9 个阶段；Phase 0、0.5、0.6 已完成。Phase 1 最适合拆成 3 轮。

但 Phase 1 完成后建议发布 v0.3.0-alpha.1 预发行包用于远程安装验证，不要直接把它当正式 v0.3.0。因为 Phase 1 的目标是把契约和测试地基建好，原则上不改变 Hook 行为。

这里的“一轮”指：完成一组关联修改、本地测试通过、文档和 planning 状态同步，形成一个可以单独审查的闭环。估算不包含发现问题后的额外返修轮次。

## Phase 1 拆成 3 轮

### 第 1 轮：冻结契约和台账（已完成）

完成：

- owned runtime 文件 allowlist
- 运行依赖图
- v0.2.2 四项 Cloud 补丁的 overlay 台账
- 每项补丁的原因、输入/输出哈希、上游锚点、移除条件
- adapter → runtime 请求结构，包括 stdin `session_id`、validated `transcript_path`、
  session-store fallback、event/source、project root 和输出预算
- diagnostic reason codes
- Release ZIP 的收录边界
- 明确哪些是上游原文件、哪些是 overlay、哪些是本项目代码

这一轮主要产出规范、schema 和契约测试，不改线上行为。

验收重点：后续任何人都能回答“这个文件从哪里来、为什么被修改、什么时候可以删除”。

### 第 2 轮：实现可复现的导入与校验（已完成）

完成：

- 固定上游 planning-with-files 3.8.2 来源
- allowlist 导入器
- overlay 应用器
- manifest 生成及校验
- pristine input hash / managed output hash
- license 和 THIRD_PARTY_NOTICES
- 非 allowlist 文件不得进入运行包
- 修改上游输入后必须触发漂移失败
- 同一输入重复构建结果一致

验收重点：运行包不能再靠人工复制拼装。

### 第 3 轮：Cloud fixtures 与安装生命周期（本地已完成）

完成：

- 冻结 v0.2.2 当前输出作为 golden fixtures
- 加入真实 Cloud 形态：
  - Skill 位于 .agents/skills
  - Session 位于 /opt/codex/sessions
  - 初始化阶段 CODEX_HOME 缺失，Codex Runtime/Hook 阶段为 /opt/codex；兼容 fixture
    覆盖阶段差异与未来缺失
  - SessionStart/UserPromptSubmit 的真实 stdin schema
  - 稳定 session_id、逐 prompt 变化的 turn_id、Host 提供的 transcript_path
  - patch_apply_end
  - response_item / event_msg 重复记录
  - 长 PR wrapper
  - 位于消息尾部的 sentinel
  - scoped .planning/.active_plan
- 补齐多文件安装、doctor、repair、backup、unknown drift 测试
- 验证 Phase 1 前后 Hook 输出完全兼容
- 生成 v0.3.0-alpha.1 候选包及 SHA-256

验收重点：Phase 1 只增加可信供应链和测试地基，不改变当前 Cloud 行为。

## Phase 1 发布验证怎么做

推荐流程：

- 发布 GitHub Pre-release：v0.3.0-alpha.1
- 计算真实 ZIP SHA-256
- 在云端用环境参数覆盖版本和哈希，不把 alpha 哈希写成正式 v0.3.0 默认值
- 验证：
  - Release ZIP 下载
  - SHA-256 校验
  - Setup verify
  - doctor healthy=true
  - 安装清单完整
  - repair / backup / unknown drift
  - 卸载或新建沙箱后的重复安装
- 可选跑一次 v0.2.2 的简化黑盒回归，确认没有行为倒退

Phase 1 不强制重新做完整 Session catch-up 黑盒，因为它尚未切换运行实现。这里只需要证明“新的打包和契约没有破坏旧行为”。

## 9 个 Phase 的轮次评估

| Phase | 建议轮数 | 核心工作 | 云端模型验证 |
| --- | --- | --- | --- |
| 1. 契约与来源治理 | 3 | allowlist、overlay、manifest、fixtures | 不强制模型黑盒；做预发行安装冒烟 |
| 2. Owned catch-up runtime | 4 | 安装 owned runtime、显式契约、解析与安全边界 | 必须，完整 catch-up 专项回归 |
| 3. Canonical prompt injection | 3 | 接入上游注入逻辑、瘦身 adapter、删除全局 Skill 补丁 | 必须，完整 SessionStart/UserPrompt/Planning 回归 |
| 4. Attestation 与 v3 模式 | 4 | 证明链、nonce、smart/legacy 模式、tamper 处理 | 必须，但仅在隔离任务中 opt-in 验证 |
| 5. Compaction 生命周期 | 3～4 | clear/compact、PreCompact、PostCompact | 必须，而且实现前后都要测 |
| 6. Tool 与 Permission Hooks | 4 | PostToolUse、去重节流、PermissionRequest、最后才是 PreToolUse | 必须，每种事件独立 canary |
| 7. Advisory completion | 2 | 完成状态解析、非阻断 Stop 提示 | 必须，确认不递归、不误继续 |
| 8. Optional hard gating | 4～5 | Stop 强制续跑、次数上限、逃生与回滚 | 必须，最高风险，隔离沙箱验证 |
| 9. Release 与 canary 退役 | 3 | 全矩阵、RC、固定哈希、移除 canary、正式发布 | 必须，RC 和最终包各测一次 |

理想情况是 30～32 轮。把真实 Cloud 反馈及返修算进去，比较现实的是 35～40 轮。这里不是说一定要拖这么久，而是不要把生命周期切换、安全控制和正式发布硬塞进同一轮。

## 必须停下来做 Cloud 验证的节点

### Phase 2 后：第一次硬验收

因为此时 catch-up 从“修改全局 Skill”切换为“执行 owned runtime”。需要验证：

- /opt/codex Cloud 路径
- .agents/skills 保持原样
- SessionStart startup/resume
- UserPromptSubmit
- scoped planning context
- wrapper 尾部 sentinel
- 安装用户与 Hook 用户不同的模拟/实际权限
- adapter 确实没有再执行全局 Skill 文件

这是 v0.3.0-alpha.2 比较合理的节点。

### Phase 3 后：第二次完整验收

此时 planning context 也切换为 canonical runtime。需要重跑完整 A～D 黑盒，并证明：

- adapter 已经足够薄
- 全局 Skill 没有被 patch
- catch-up 与 prompt injection 来自同一 owned runtime
- 输出与 v0.2.2 golden fixture 兼容

这是 v0.3.0-beta.1 比较合理的节点。

### Phase 5：实现前后各测一次

官方当前契约中，SessionStart 的来源包含 startup、resume、clear、compact；自动 compact 后的 SessionStart context 还可能直接进入同一轮的后续模型请求。因此不能只靠本地模拟判断时序。[OpenAI Codex Hooks 文档](https://learn.chatgpt.com/docs/hooks)

先用 observation-only canary 确认 Cloud 实际事件，再实现 PreCompact/PostCompact，之后验证：

- 手动 compact
- 自动 compact
- clear
- compact 后立即恢复
- 没有重复 planning context
- 没有丢失最后进度

另外，PreCompact/PostCompact 的普通 stdout 会被忽略，需要按正式 JSON 输出契约实现，这也是必须真实验证的原因。[OpenAI Codex Hooks 文档](https://learn.chatgpt.com/docs/hooks)

### Phase 6：每种 Hook 单独测

不要一次开启全部 Tool Hooks。官方说明多个匹配的 command hooks 会并发启动；而且工具 Hook 不是完整安全边界，PostToolUse 发生时工具副作用已经产生。[OpenAI Codex Hooks 文档](https://learn.chatgpt.com/docs/hooks)

顺序建议：

- PostToolUse observation-only
- 去重、节流和输出预算
- PermissionRequest
- 最后才是 PreToolUse

PermissionRequest 只在 Codex 准备请求授权时触发，普通无需授权的工具调用不会触发，因此必须设计专门的 Cloud 授权场景。OpenAI Hooks 文档

### Phase 7 和 Phase 8：Stop 必须分开

Phase 7 只做 advisory，不阻断。

Phase 8 才测试 hard gating。官方当前 Stop 契约中，decision: "block" 实际含义是让 Codex继续，并自动创建新的 continuation prompt；输入还包含 stop_hook_active 用于识别已经由 Stop 继续过的轮次。

所以 Phase 8 必须验证：

- 不无限递归
- 最大续跑次数
- 卡死检测
- 无 plan 时静默
- 用户 opt-out
- compact/resume 后状态
- kill switch
- 一条命令恢复到 advisory 模式

### Phase 9：两次发行验证

- v0.3.0-rc.1：完整云端回归
- 移除 canary、重新打包、重新计算 SHA-256
- 正式 v0.3.0：至少做新沙箱安装、doctor、startup、prompt、resume、catch-up 冒烟

不能因为 RC 已通过，就跳过最终 ZIP 的测试——移除 canary 和重新打包都会改变最终 SHA-256。

## 建议的发布路标

- Phase 1：v0.3.0-alpha.1，验证供应链和安装包
- Phase 2：v0.3.0-alpha.2，验证 owned catch-up
- Phase 3：v0.3.0-beta.1，验证完整 canonical runtime
- Phase 4～8：按功能生成内部 canary/pre-release，不必每个 Phase 都正式发布
- Phase 9：v0.3.0-rc.1 → v0.3.0

Phase 1 三轮本地工作和 `v0.3.0-alpha.1` Cloud 验收均已完成：下载/SHA、安装、doctor、精确清单、逐文件哈希、adapter-only Hook 命令边界、startup/UserPrompt canary、scoped context、resume catch-up、长 wrapper 尾部 sentinel 和 resume 后 doctor 全部通过。alpha.1 继续作为 Phase 2 的 Cloud 回滚点。

Phase 2 第 1 轮完成 structured owned runtime；第 2 轮完成 canonical plan/file containment、opt-out 和 session isolation；第 3 轮完成严格 transcript normalization、保守 cross-family deduplication、content-free diagnostic、损坏/预算 reason codes 和 supervisor timeout/runtime-error 矩阵；第 4 轮已切换 SessionStart catch-up、停止 global Skill mutation、补齐 fail-open 与 Linux 权限门槛，并封板 18-entry alpha.2。requirements 仍只注册 adapter，UserPromptSubmit 仍本地实现。当前 45 个测试登记在 Windows 为 42 PASS/3 个 Linux-only SKIP；新 Cloud 容器已经补验 ZIP SHA、bootstrap、doctor、精确 inventory、pristine Skill、adapter-only policy、实际 owned root/root、synthetic nobody Hook 用户和 UserPrompt local-only，全部 PASS。下一步只剩自动 fresh-task lifecycle、真实 resume catch-up 与 resume 后 doctor；通过前不进入 Phase 3。

后续每个 Release 的封板顺序固定为：先冻结版本与 ZIP 内容，构建并计算 ZIP SHA-256；再把版本、包名和 ZIP SHA 写入 ZIP 外部的初始化 Bash；然后计算封板后 Bash 的 SHA-256；最后发布并核验两个独立资产。Bash SHA 不能在 ZIP 版本和哈希确定前得到最终值。
