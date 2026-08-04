# 仓库智能体入口

本文件适用于整个仓库。它只定义智能体的阅读顺序、文档权威关系、稳定工作边界和验证规则，
不复制当前 Round 的状态、测试计数或临时 Next Step。若子目录以后增加更具体的 `AGENTS.md`，
该文件只覆盖对应子树，且不得绕过根级安全与 Release 边界。

## 进入仓库后的必读顺序

1. 读 `README.md`，确认当前公开行为、安装、运维和故障处理方式。
2. 读 `PROJECT_UNDERSTANDING.md`，恢复项目定位、Cloud 事实、组件职责和长期决策。
3. 读 `work_plan.md`，了解 Phase 路线、Cloud 验收节点、Release 路标和当前阶段摘要。
4. 读 `.planning/.active_plan`，解析当前 scoped planning 目录。
5. 读活动计划的 `task_plan.md`、`findings.md`、`progress.md`。
6. 只读当前任务直接相关的 `docs/` 专项设计、contracts、源码和测试。
7. 修改前运行 `git status --short --branch` 和必要的只读基线检查，保留用户已有改动。

恢复、`resume`、`/clear` 或 context compaction 后重复上述流程。不要凭历史对话猜测当前授权范围。

## 文档分层与权威定位

| 层级 | 权威文件 | 回答的问题 |
|---|---|---|
| 使用与运维 | `README.md` | 当前怎么工作、怎么安装、怎么修复 |
| 项目心智模型 | `PROJECT_UNDERSTANDING.md` | 为什么这样设计、组件边界是什么 |
| 长期路线 | `work_plan.md` | 后续 Phase、Cloud 门槛、Release 路标 |
| 当前执行权威 | 活动 `.planning/<slug>/task_plan.md` | 现在允许做什么、唯一 Next Step、退出和停止条件 |
| 研究与历史 | 活动计划的 `findings.md` / `progress.md` | 为什么这么决定、做过什么、遇到什么问题 |
| 最近完成专项设计 | `docs/phase-3-round-4-activation-plan.md` | 已关闭的 Phase 3 R4-A/B/C 技术门槛；Phase 4 Discovery Gate 必须先建立下一专项入口 |
| 可复制 Cloud 操作 | `黑盒验证.md` 及版本/Phase 专项验收文档 | 在 Cloud 中如何执行和判定验收 |

仓库内文档发生冲突时：

1. 当前用户指令优先，但不能被理解为自动扩大破坏性、发布或外部部署权限。
2. 活动 `task_plan.md` 决定当前授权、Next Step、禁止事项和 gate 状态。
3. 已获授权的当前专项设计决定该 gate 内的技术合同；专项设计不能自行授权下一 gate。
4. `work_plan.md` 决定 programme/Release 路线，但不覆盖活动计划的当前执行状态。
5. `PROJECT_UNDERSTANDING.md` 提供稳定架构和背景；带日期状态快照不是执行授权。
6. `README.md` 是用户操作说明，不作为未实施能力已经可用的证据。
7. `findings.md`、`progress.md` 和历史验收是证据，不是新的需求来源。

若冲突会改变架构、信任、Release、rollback、安全或 production dispatch，先停止实现，明确差异并
同步权威文件；不要选择对当前修改最方便的说法。

## 文档同步规则

| 变化类型 | 必须同步的位置 |
|---|---|
| 用户可观察行为、安装或修复命令 | `README.md`；必要时同步黑盒文档 |
| 稳定架构、Cloud 事实、职责或长期决策 | `PROJECT_UNDERSTANDING.md` 和活动 `findings.md` |
| Phase、Cloud 验收、Release 或 rollback 状态 | `work_plan.md` 和活动 `task_plan.md` |
| 当前 Next Step、gate、禁止事项或退出条件 | 活动 `task_plan.md` |
| 研究结论、路线比较和技术取舍 | 活动 `findings.md`；稳定后再提升到架构/专项文档 |
| 实施、测试、错误和恢复结果 | 活动 `progress.md`；必要时同步 task status |
| 某个 Round 的严格协议或 failure matrix | 对应 `docs/` 专项设计与 contracts/tests |
| 文档治理、阅读入口或稳定工作规则 | 本 `AGENTS.md` 及相关导航表 |

不要在 README、项目理解、work plan 和 task plan 中复制同一份逐轮流水账。变更完成后应能从
上表唯一找到权威答案。

## 稳定架构与安全边界

- 当前唯一正式支持的集成是 `OthmanAdi/planning-with-files`；不要把本仓库描述为通用 Skill
  转换器。Host/runner/Driver 抽象必须经过第二个只读插件验证后才能泛化。
- global PWF Skill 必须保持 pristine。生产 Hook 只能执行 installer 管理、manifest/allowlist
  固定并校验的 owned runtime；不得从用户 Skill 目录执行可变脚本。
- Managed Hook policy 只注册 absolute managed adapter 命令。owned child runtimes 是 adapter
  的 sibling，不是独立平台 handler。
- 不得因为 pinned upstream 中存在某个 lifecycle script，就推断该能力已导入、安装或启用。
- `/opt/codex` 是带日期的 Cloud 默认事实，不是永久常量。优先使用显式 Host contract、配置和
  受控探测，并定义变量缺失时的兼容行为。
- `session_id` 和已校验的 `transcript_path` 是首选 Host 输入。读取前必须验证 containment、
  文件类型和 session identity；session-store 扫描只作显式 compatibility fallback。
- transcript JSONL 是可变化的 Host data。未知、损坏或无法验证的数据不得造成 partial injection。
- integrity 和内容注入 fail-closed；单个 advisory child failure 对 Codex loop fail-open，且不能
  抑制 canary 或其他已经验证的健康上下文。
- `snapshot-prototype/` 只保存 feasibility evidence，不进入 production runtime、adapter dispatch
  或 Release。`planning-with-files-3.8.2/` 是忽略提交的开发参考树，也不得打包。
- 发布过的 ZIP/bootstrap 字节保持不可变。开发中的原型、branch 或 filename 出现版本名，不代表
  Release 已晋级。

## Discovery Gate 与实施边界

- 每个新 Phase 的第一轮必须重新恢复证据、扫描代码/文档/Cloud 事实、复核假设、估算轮次并冻结
  退出条件，原则上不直接修改 production behavior。
- 激活、迁移、删除旧路径、修改 schema/Host ABI/trusted graph、Release、rollback 或安全边界
  属于关键轮，必须先通过专项设计检查点。
- 实施中出现 Cloud/本地证据冲突、架构分歧、timeout/权限/进程/数据安全模型变化时，应暂停并
  增加正式探路轮或 Round 内子 gate。
- 只实施活动 `task_plan.md` 明确授权的最小 gate。前一 gate 未通过时，不得顺手进入下一 gate、
  production dispatch、外部安装或 Release 封板。

## 代码、测试与验证

- 修改前先检查 dirty worktree；用户已有改动不得覆盖、重置或混入无关重写。
- 优先补充或修改离变更边界最近的测试，再运行与风险相称的完整回归。
- 基础检查通常包括：

```bash
npm test
python3 -m py_compile hooks/hook_adapter.py
node --check install.js
bash -n init-cloud-sandbox-v0.3.0.bash
git diff --check
```

- Windows 中真实 POSIX/Linux-only 测试应诚实 SKIP，不能用弱化断言伪造 PASS；对应安全边界必须
  在 Linux/Cloud gate 中通过。
- 测试数量会随 Phase 演进；从实际 test runner 获取统计，不以本文件中的历史数字为准。
- 文档-only 变更至少运行结构/引用检查和 `git diff --check`。runtime、installer、contract、
  manifest 或 Release 边界变化必须运行完整 suite 和相应平台验收。
- 任何测试失败都要区分 production defect、test defect、平台限制和 fixture drift；记录原因后才
  选择修改边界，不能只为了绿色结果弱化安全断言。

## Release 规则

- 禁止指向 moving branch、`latest` 或无 checksum artifact。
- Release ZIP 必须从精确 allowlist、固定顺序/mode/metadata 构建，bootstrap 永远作为 ZIP 外部
  的独立 Release Asset。
- 封板顺序固定：冻结版本和 ZIP 内容 → 构建并计算 ZIP SHA-256 → 把版本/包名/SHA 写入外部
  bootstrap → 计算 bootstrap SHA-256 → 发布并重新下载验证两个资产。
- RC/canary 通过不能替代最终字节验收；任何重新打包或移除 canary 都要求重新计算 hash 并冒烟。

## 文档语言

- 面向维护者的宏观入口、行为、架构、路线和 Cloud 操作文档优先使用中文。
- `task_plan.md`、`findings.md`、`progress.md` 和精确专项设计可以保留英文；稳定标识、函数名、
  schema、reason code、命令和原始输出不要为了中文化而改名。
- 优先保证单一含义和可交叉验证，不追求所有文件机械地使用同一种语言。
