# v0.3.0 Work Plan：路线、验收与发布路标

> 文档职责：维护 v0.3.0 的长期 Phase 路线、建议轮数、Cloud 验收节点、发布路标和阶段工作摘要。
>
> 当前状态：Phase 1～3 已完成。`v0.3.0-beta.2` 不改变 beta.1 已通过 live Fresh/Resume A～F
> 的 runtime 行为，已完成发布同步、封板和验收。Phase 4 尚未开始，也未因本次发布维护获得授权。
>
> 当前回滚基线：published / accepted `v0.3.0-beta.2`；beta.1 与 alpha.2 保留为历史 fallback。

## 与活动 `task_plan.md` 的分工

| 问题 | 权威文件 |
|---|---|
| 项目将经过哪些 Phase、每个 Release 要证明什么 | `work_plan.md` |
| 哪些阶段/发布节点已通过 Cloud 验收 | `work_plan.md` |
| 当前允许做什么、下一步是什么 | `.planning/2026-08-01-managed-runtime-modernization/task_plan.md` |
| 当前实现必须遵守哪些不变量、退出条件和停止条件 | 活动 `task_plan.md` |
| 研究结论、试错和完整实施证据 | 活动计划的 `findings.md`、`progress.md` |
| 稳定项目背景和新会话恢复顺序 | `PROJECT_UNDERSTANDING.md` |
| 可复制执行的 Cloud 提示词/脚本 | `黑盒验证.md` 及各专项验收文档 |

两份计划形成互补，不互相复制完整内容：

- `work_plan.md` 是 programme/release 层的地图，回答“去哪里、何时验收、何时发布”；
- 活动 `task_plan.md` 是当前执行权威，回答“现在做什么、按什么契约做、怎样才算完成”；
- 当前状态或下一步发生冲突时，以活动 `task_plan.md` 为准，并在跨 Phase、Cloud 验收或 Release
  状态变化时同步更新本文件；
- 轮内实现细节、错误台账和测试命令不再堆入本文件。

## 全局探路与动态加轮规则

- 每个新 Phase 的第一轮强制用于探路：恢复前序证据、扫描当前代码/文档/Cloud 事实、复核
  假设、重新估算轮次并冻结退出条件，原则上不直接切换生产行为。
- 激活、迁移、删除旧路径、schema/Host ABI、trusted graph、Release、回滚和安全边界属于
  关键轮；即使不跨 Phase，也必须先设置设计检查点。
- 实施中如果发现 Cloud/本地证据冲突、设计假设错误、多条实质路线，或 timeout、权限、
  进程与数据安全模型变化，应主动暂停，不能为了维持原轮次数字而把风险硬塞进当前实现。
- 变化涉及架构、契约、Phase 范围、信任/Release/回滚边界时，正式增加一轮探路轮；仅涉及
  已选架构内的安全拆分时，使用 Round 内 A/B/C 子门槛。
- 探路轮必须给出差异、选项与代价、不变量、实施/停止边界、测试/Cloud/回滚计划，以及
  `GO`、`CONDITIONAL_GO` 或 `NO_GO`。结论未冻结前，生产 dispatch、发布哈希和外部部署
  保持不变。

完整触发条件和新会话恢复规则以 `PROJECT_UNDERSTANDING.md` 的“探路门槛”为准。

## 总体路线与建议轮数

Phase 0、0.5、0.6 是已完成的前置阶段；正式交付路线为 Phase 1～9。轮数是动态估算，
Discovery Gate 和真实 Cloud 返修优先于维持原数字。

| Phase | 建议轮数 | 核心目标 | Cloud 门槛 | 当前状态 |
|---|---:|---|---|---|
| 0 / 0.5 / 0.6 | 已完成 | 仓库审计、Cloud 证据、v0.3.0 迭代初始化 | 历史证据整合 | complete |
| 1. 契约与来源治理 | 3 | allowlist、overlay、manifest、fixtures、安装治理 | 预发行安装与兼容冒烟 | complete；alpha.1 PASS |
| 2. Owned catch-up runtime | 4 | owned catch-up、显式 Host 契约、session/transcript 安全边界 | 完整 catch-up 专项回归 | complete；alpha.2 PASS |
| 3. Canonical prompt injection | 4 | owned-plan、pristine snapshot invocation、瘦身 adapter、统一 project state | 完整 SessionStart/UserPrompt/Planning/Resume 回归 | complete；beta.1 published / Cloud A～F PASS |
| 4. Attestation 与 opt-in v3 模式 | 暂定 3 | 重新审计；inactive extension；opt-in activation | 隔离任务中的 tamper/cache/rollback | pending；Round 1 Discovery Gate 待明确授权 |
| 5. Compaction 生命周期 | 3～4 | clear/compact、PreCompact、必要时 PostCompact | 实现前后各测一次 | pending |
| 6. Tool 与 Permission Hooks | 4 | PostToolUse、去重节流、PermissionRequest、最后 PreToolUse | 每种事件单独 canary | pending |
| 7. Advisory completion | 2 | 非阻断 Stop 提示 | 不递归、不误继续 | pending |
| 8. Optional hard gating | 4～5 | Stop 强制续跑、上限、逃生和回滚 | 最高风险隔离验证 | pending |
| 9. Release 与 canary 退役 | 3 | 全矩阵、RC、移除 canary、正式发布 | RC 与最终包各测一次 | pending |

早期估算为理想 30～32 轮、包含 Cloud 返修约 35～40 轮；它只表达工作规模，不是固定承诺。

## 建议的发布路标

| Release | 对应阶段 | 要证明的能力 | 状态 | 之后的回滚角色 |
|---|---|---|---|---|
| `v0.2.2` | 兼容基线 | 已发布 Cloud catch-up 兼容行为 | published / Cloud validated | 稳定历史 fallback |
| `v0.3.0-alpha.1` | Phase 1 | 可信来源、确定性打包、安装与 doctor，不改变 Hook 语义 | complete / Cloud PASS | Phase 2 实施期历史回滚点 |
| `v0.3.0-alpha.2` | Phase 2 | owned catch-up、pristine global Skill、真实 resume 和权限边界 | complete / Cloud PASS | 历史 fallback |
| `v0.3.0-beta.1` | Phase 3 | 完整 canonical plan runtime、薄 adapter、统一 owned project state | published / Cloud A～F PASS | 历史 fallback |
| `v0.3.0-beta.2` | Phase 3 发布维护 | 同一 runtime 行为、最新 README/文档治理、独立不可变资产 | published / accepted | 当前 Phase 4～8 回滚基线 |
| 内部 canary/pre-release | Phase 4～8 | 每项高风险能力独立验证 | pending | 不要求每个 Phase 正式发布 |
| `v0.3.0-rc.1` | Phase 9 | 完整候选回归 | pending | 正式版前候选 |
| `v0.3.0` | Phase 9 | 移除临时 canary 后重新构建并验收最终字节 | pending | 正式发布 |

版本名出现在分支、源码或包内不代表 Release 已成立；beta.2 按维护者授权以不变 runtime 行为
继承 beta.1 的行为验收，但使用自己独立的不可变 ZIP/bootstrap 和 SHA，不能复用 beta.1 资产。

## 已完成与当前 Phase 工作摘要

### Phase 1：Runtime provenance and compatibility contract

| 项目 | 摘要 |
|---|---|
| 三轮交付 | 契约/overlay 台账；可复现导入与 manifest；Cloud fixtures、安装生命周期和 alpha.1 候选 |
| 本地证明 | allowlist、逐文件哈希、pristine/managed hash、license、确定性构建、drift/repair/backup/uninstall |
| Cloud 验收 | Release 下载/SHA、安装、doctor、精确 inventory、adapter-only 命令边界、startup/UserPrompt canary、scoped context、resume catch-up、长 wrapper 尾部 sentinel、resume 后 doctor |
| 结论 | Phase 1 complete；alpha.1 只保留为历史前序资产 |

Phase 1 只增加可信供应链和测试地基，不改变当时已验收的 Hook 行为。

### Phase 2：Owned catch-up runtime and safety foundation

| Round | 交付 | 状态 |
|---|---|---|
| 1 | structured owned runtime 与显式 Host/transcript request/result | complete |
| 2 | canonical plan/file containment、opt-out、session attachment/isolation | complete |
| 3 | JSONL normalization、cross-family dedup、bounded rendering、diagnostic、supervisor failure matrix | complete |
| 4 | SessionStart 激活 owned catch-up、停止 global Skill mutation、权限门槛、18-entry alpha.2 | complete / Cloud PASS |

Cloud P2-A～P2-E 全部通过：自动 lifecycle、planning baseline/context、真实 resume 截断保尾、
root/root、synthetic cross-user，以及 resume 后 doctor
`healthy=true`、`repairable=false`、errors/blockers 为空。Phase 2 关闭后 alpha.2 成为当时的
Phase 3 回滚基线；现保留为历史 fallback。

### Phase 3：Canonical user-prompt injection

| Round | 交付/门槛 | 状态 |
|---|---|---|
| 1 | 审计 adapter 与 pristine resolver/injector；冻结 exact-v1、managed-legacy、20,000 字符上限和两项有意输出变化 | complete |
| 2 | 独立 controlled-snapshot feasibility spike；8 focused + 1 handoff isolation case | complete / `CONDITIONAL_GO` |
| 3 | 冻结 hard-link、stale cleanup、portable openat、27/30 秒策略；实现/install/package inactive owned-plan | complete / Cloud PASS |
| 4 | R4-A supervisor/type seam；R4-B 原子激活并删除平行 resolver/renderer；R4-C beta.1 + Cloud | complete；published / Cloud A～F PASS |

Round 3 关闭证据：

- Fresh + Resume single-link gate 共 40/40 次 regular、`st_nlink=1`、identity stable；
- Windows：63 registered / 46 PASS / 17 honest POSIX/Linux SKIP / 0 FAIL；
- Cloud/Linux：63 PASS / 0 SKIP / 0 FAIL；
- isolated install、doctor、direct exact-v1、11-file installed inventory、21-entry development ZIP、
  zero snapshot leftovers、clean workspace 全部 PASS；
- adapter 仍未 dispatch `owned-plan.py`，发布过的 alpha.2 ZIP 和外部 bootstrap 未改变。

Round 4 入口分析已冻结在 `docs/phase-3-round-4-activation-plan.md`。R4-A 已完成：Windows 为
66 registered / 48 PASS / 18 honest Linux SKIP / 0 FAIL；Cloud/Linux 为 66 PASS / 0 SKIP /
0 FAIL，隔离安装、doctor、11/21 inventory、process-group cleanup、inactive typed seam、
zero snapshot 和 clean workspace 全部 PASS。R4-B 已完成 plan-first dispatch、exact project
转交、旧 resolver/renderer 删除和独立 beta golden；Windows 为 69 registered / 51 PASS /
18 honest SKIP / 0 FAIL，Linux/Cloud 为 69 PASS / 0 SKIP / 0 FAIL。真实双 child/跨用户、
process-group、alpha.2 隔离升级、doctor、11/21、延迟/输出预算、零 snapshot 和 clean workspace
全部 PASS。R4-C beta.1 已重封板为 22-entry 自校验 ZIP 和外部 bootstrap，并在 Fresh Cloud
以 Linux 69/69、跨平台精确 ZIP/bootstrap、LF、Git modes、无占位符和 clean workspace 完整
通过 pre-publication seal；随后发布、发布后下载复核和 live Fresh/Resume A～F 全部 PASS。

## 必须停下来做 Cloud 验证的节点

### Phase 1：供应链/安装验收（已完成）

验证 ZIP 下载与 SHA、Setup、doctor、精确 inventory、repair/backup/unknown drift 和行为兼容；
不要求因纯供应链变化重跑所有 catch-up 场景。结果：alpha.1 PASS。

### Phase 2：第一次运行时硬验收（已完成）

验证 `/opt/codex`、pristine `.agents/skills`、startup/resume、UserPrompt、scoped planning、wrapper
尾部、安装/Hook 用户分离，以及 adapter 不执行 global Skill 文件。结果：alpha.2 P2-A～P2-E PASS。

### Phase 3：第二次完整验收（已完成）

重跑现有 A～F 安装/生命周期黑盒，并额外证明：

- adapter 只保留 Host translation、supervision 和 JSON composition；
- global Skill 未被 patch、未被执行；
- catch-up 与 prompt injection 使用同一个 validated canonical project state 和同一受管 bundle；
- v0.2.2/alpha.2 golden 保持为不可变回滚证据，beta 只包含已批准的两项输出差异；
- no-plan、opt-out、detached session、计划失败和 catch-up 失败符合冻结的 canary/fail-open 语义；
- 27 秒共享 deadline、进程清理、零 snapshot 残留和 plan/no-plan latency 通过；
- Fresh startup/UserPrompt、真实 planning update、长尾 sentinel、Resume catch-up、post-resume doctor 全部通过。

结果：全部门槛 PASS；`v0.3.0-beta.1` 完成 Phase 3 行为验收，随后同 runtime 行为的
`v0.3.0-beta.2` 完成发布同步并成为 Phase 4～8 当前回滚基线。

### Phase 5：实现前后各测一次

先用 observation-only canary 确认 Cloud 的 `SessionStart(source=clear|compact)`、手动/自动 compact
和恢复时序，再实现 PreCompact/PostCompact。之后验证没有重复 planning context、没有丢失最后进度，
并使用正式 JSON 输出契约。[OpenAI Codex Hooks 文档](https://learn.chatgpt.com/docs/hooks)

### Phase 6：每种 Hook 单独测

按 PostToolUse observation-only → 去重/节流 → PermissionRequest → PreToolUse 的顺序推进；
不得一次启用全部 Tool Hooks。工具 Hook 是 guardrail，不是完整安全边界。
[OpenAI Codex Hooks 文档](https://learn.chatgpt.com/docs/hooks)

### Phase 7 / Phase 8：Stop 必须分开

- Phase 7 只做 advisory，不阻断；
- Phase 8 才测试 hard gating，并验证最大续跑次数、卡死检测、no-plan 静默、opt-out、
  compact/resume 状态、kill switch 和一条命令回到 advisory；
- `decision: "block"` 的 continuation 行为与 `stop_hook_active` 必须在当时 Cloud Host 上重新探路验证。

### Phase 9：RC 与最终包分别验收

`v0.3.0-rc.1` 运行完整 Cloud 回归；移除 canary 后必须重新打包、重新计算 SHA，正式
`v0.3.0` 至少重新执行 Fresh 安装、doctor、startup、prompt、resume 和 catch-up 冒烟。
不能用 RC 的通过结果替代最终 ZIP 字节的验收。

## 当前交接

- 当前执行权威：`.planning/2026-08-01-managed-runtime-modernization/task_plan.md`；
- 当前 Phase：Phase 3 已关闭；Phase 4 尚未开始；
- 独立仓库迁移：beta.2 slim-repository M1/M2 COMPLETE，M3 Discovery COMPLETE；M3-A transport PASS，审核 commit `f54fb78633d22af5c8f0f225fc8c44ad046aa9c1` 已非强制推送到同名 development branch，M1 audit oracle 仍 clean 且未移动；M3-A no-live Cloud seal 待执行；
- 下一步：在 Fresh Cloud 精确 checkout 已推送 commit，并原样执行 successor M3 runbook 的唯一 no-live Linux/Cloud seal；M3-B、M3-C、M4 与 Phase 4 仍需各自门槛；
- 当前禁止：在 Discovery Gate 关闭前实施 Phase 4 production behavior、扩展 trusted graph 或激活 opt-in 模式；
- 当前回滚：published / accepted beta.2；beta.1 与 alpha.2 为历史 fallback。

## Release 封板顺序

每个 Release 固定按以下顺序封板：

1. 冻结目标版本和 ZIP 精确内容；
2. 构建 ZIP 并计算 ZIP SHA-256；
3. 把版本、包名和 ZIP SHA 写入 ZIP 外部的初始化 Bash；
4. 计算封板后 Bash 的 SHA-256；
5. 发布两个独立资产并重新下载核验。

Bash SHA 不能在 ZIP 版本、内容和哈希确定前得到最终值，也不能把校验 ZIP 的 Bash 放入该 ZIP。
