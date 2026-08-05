# Phase 3 上游调用路线与长期标准化边界

> 决策状态：Phase 3 首选受控快照调用；多目标 overlay 为后备方案
>
> 当前集成：`OthmanAdi/planning-with-files` v3.8.2
>
> 当前发布基线：published / Cloud-accepted `v0.3.0-beta.1`；alpha.2 为历史 fallback

## 1. 项目定位

本仓库当前是一个垂直原型：把原本面向本地 Codex/Claude Skill 目录和用户级
Hook 的 PWF 运行时，适配成 Codex Cloud 系统管理的 Hook。它承担的工作类似
兼容层：一侧是 Skill 自己的文件、环境和脚本约定，另一侧是 Cloud Host 的
Managed Hook、安装路径、权限、生命周期 stdin/stdout 和 Release 治理。

这不等于“任意 Skill 自动转换器”。PWF 是目前唯一支持的集成。只有将来第二个
只读插件证明一组接口确实可以复用后，才能把这些接口称为通用能力。如果 Codex
Cloud 后续原生支持相同的 Skill Hook 运行模型，本仓库也可能缩小为迁移工具或直接
退役。

长期应标准化的是边界，而不是某一种改造技巧：

```text
Codex Cloud Host ABI
  - Managed Hook 注册、生命周期 payload、权限、超时、JSON 输出
  - owned artifact 安装、doctor/repair、provenance、Release
             |
             v
Integration Driver ABI
  - 声明支持的事件和能力
  - Host request -> integration result
  - 输入投影、环境策略、上游命令、输出验证
             |
             v
Integration-specific payload
  - 当前为 pristine/managed PWF runtime
  - 未来可以是第二个只读插件
```

overlay、受控快照、上游原生协议和本地重实现都只是 Driver 内部策略，不应成为
Host ABI 的固定假设。

## 2. 评价维度

每条路线按以下维度评价：

1. 上游文件是否保持 pristine；
2. 是否能保证 canonical state、containment 和 fail-closed；
3. 是否会提前启用 Phase 4 的 `.mode`、attestation、nonce 或 smart injection；
4. importer、ledger、manifest、installer 和 Release 的扩张程度；
5. 上游升级时的漂移和退休成本；
6. root/root 与跨用户 Hook 权限可行性；
7. 是否有助于验证未来的技能无关 Host/Driver 抽象；
8. 发生失败时能否给出有界、content-free、不会污染 Hook JSON 的诊断。

## 3. 路线 A：多目标 managed overlay

### 做法

对 owned copy 的 `inject-plan.sh` 应用第二套确定性补丁，增加 managed-input 模式，
例如显式接收已经验证的 project root、plan dir、scope 和 `managed_legacy` profile。
同时把当前单目标 importer/overlay ledger 升级为多目标补丁系统。

### 优点

- 调用关系直观：owned entrypoint 把 canonical state 直接交给 managed injector；
- managed 输入、分支和最终脚本内容都能通过补丁、anchor 和哈希审计；
- 不需要临时复制 plan/progress，也没有 SIGKILL 后临时内容残留问题；
- 如果上游未来接受同类参数，现有 overlay 可以用明确退休条件移除。

### 缺点和难点

- importer、overlay schema、patcher、bundle identity、manifest 和 drift tests 必须
  一起升级；不能只手工改一个脚本；
- Release 必须同时记录 pristine injector 和 managed injector 身份；
- 每次上游升级都要重新验证 patch anchor、语义和 managed hash；
- 项目会维护第二个上游 fork 点，长期容易把临时兼容层变成永久分叉；
- 它标准化的是“怎样维护补丁”，不是“怎样适配不同 Skill”；第二个插件未必需要
  overlay，因此通用性有限。

### 适用条件

- 无法通过受控输入视图隔离上游副作用；
- 上游必须在真实项目目录运行；
- 需要把真实 marker、锁、inode 或其他文件系统状态原样交给上游；
- 上游短期不会提供正式调用协议，但补丁范围足够小且稳定。

## 4. 路线 B：不修改上游的受控快照调用

### 做法

`owned-plan.py` 先在真实项目中调用 pristine `resolve-plan-dir.sh`，完成 session policy
和 canonical containment；随后安全读取选中的 `task_plan.md`/`progress.md`，在私有
临时目录构造只含这两个文件的 legacy root 快照，并用最小环境调用 pristine
`inject-plan.sh --context=userprompt`。

快照不包含 `.planning`、`.mode`、attestation、nonce 或 ledger。子进程环境清除
`PLAN_ID`、`PLANNING_DISABLED`、`PWF_INJECT` 及其他可能改变 Phase 3 行为的变量。
这种文件系统投影和环境清洗共同 force `managed_legacy`。

### 已有实证

2026-08-02 使用当前 active scoped plan 和 pristine v3.8.2 injector 完成临时探针：

- 真实 scoped 项目与 root 快照的捕获文本均为 9,628 字符；
- 两者捕获文本完全一致，SHA-256 均为
  `00fd3288926b8ae25d30475f44cf90f2b5e96b351a5a531dcc92d5491b6af6b8`；
- 父环境设置 `PWF_INJECT=smart` 后，清洗变量的快照仍与 legacy 基线一致；未清洗
  时输出变成 6,841 字符；
- 带 `autonomous gate` 和 nonce 的原始临时项目进入 v3 attestation 分支，而只复制
  plan/progress 的快照继续输出 legacy context，nonce 没有泄漏；
- injector 没有在快照中创建其他文件，所有探针临时目录均已清理。

后续独立 `snapshot-prototype/` feasibility spike 又完成了更强的纵向验证：8 个 focused
cases 覆盖 fd-rooted safe read、symlink/FIFO、1 MB 输入上限、20,000 字符输出上限、
pathname replacement、0700/0600、timeout cleanup、synthetic `nobody` 和 bundle
边界；父仓库 handoff 再增加 1 个 runtime/Release/adapter 隔离 case。Cloud/Linux
父套件 55 PASS/0 SKIP；Windows 只执行平台无关部分，45 PASS/10 个明确 POSIX/Linux
SKIP/0 FAIL。结论仍是 conditional GO：证明难点可克服，但不把 prototype 当成
`owned-plan.py` 生产实现。

这些结果证明 legacy 输出不依赖原始 scoped 路径；把选中内容压平为 root plan 不会
改变当前 UserPrompt 输出。Cloud/Linux 下的实际 Hook 用户、权限、超时和异常清理
已有 feasibility 证据，仍需在生产 installed layout 和真实激活前重新验证。

### 优点

- `inject-plan.sh` 与 `resolve-plan-dir.sh` 保持 pristine，现有 upstream hash 不变；
- 不需要把 importer 和 compatibility ledger 扩展成多目标补丁系统；
- Phase 3 marker 隔离通过文件系统视图表达，而不是在上游脚本里增加长期分支；
- snapshot runner、环境 allowlist、超时和结果 envelope 有机会成为未来 Host/Driver
  的可复用能力；
- 上游升级主要做行为/golden 验证，不必重新移植 injector patch。

### 缺点和难点

- 成本转移到安全快照：需要 directory fd、`openat`、`O_NOFOLLOW`、regular-file
  校验、输入大小上限和常见竞态检测；
- 临时目录必须是 `0700`、文件 `0600`，并在 `finally` 清理；进程被 SIGKILL 时仍
  可能留下当前用户可读的临时内容，需接受容器回收或设计受控 stale cleanup；
- 必须构造最小且稳定的子进程环境，否则 `PWF_INJECT` 等变量会改变输出；
- resolver、injector、catch-up 和外层 30 秒 Hook 之间需要分段超时预算；
- Windows 开发机可能没有 production POSIX sh，因此真实命令、权限和跨用户行为
  仍是 Linux/Cloud gate；
- Phase 4 要启用 marker 时，需要明确扩大投影内容和协议，不能偷偷复制整个计划目录。

### 适用条件

- 上游行为主要由少量只读输入文件决定；
- legacy 输出不依赖原始绝对路径或 scoped 目录名；
- Host 允许 Hook 用户创建私有临时目录；
- 项目希望优先保留 pristine upstream 和较小的供应链边界。

## 5. 其他路线

### 路线 C：推动上游提供正式 Host 调用协议

理想形态是上游自身提供结构化入口，例如 JSON request/result 或稳定参数，显式接受
已解析 plan、profile、预算和 Host policy。这样无需 overlay，也无需快照欺骗文件系统
视图。

这是长期最标准、维护成本最低的方案，但当前 v3.8.2 不提供该协议；本仓库不能把
尚未存在或尚未被上游接受的接口当作 Phase 3 前提。可以把受控快照视为过渡实现，
并把“上游正式支持后退休快照”写成长期条件。

### 路线 D：Host-native 重实现或中间表示（IR）

解析 Skill Hook/脚本，转换为一个技能无关的中间表示，再由 Cloud-native runtime
执行。这最接近完整“技能翻译器”或 Rosetta 式愿景。

它能提供最强的统一接口，但必须重新实现 shell、文件系统、副作用、环境、并发和
错误语义；对任意脚本做到可靠等价接近构建新运行时。当前只有一个 PWF 集成，没有
第二个样本证明 IR 边界，因此现在采用会过度承诺，也会把 PWF 语义漂移风险永久留在
本仓库。当前不选。

### 路线 E：OS 级虚拟文件系统或进程沙箱

使用 mount namespace、bind mount、bubblewrap、容器或 FUSE 给 pristine 上游构造
只读投影视图，可以避免复制内容，并比普通临时目录更强地隔离文件系统。

它在自管 Linux 平台很有吸引力，但 Codex Cloud 当前没有承诺相应二进制、mount
capability 或 namespace 权限。它也显著扩大平台依赖和 doctor 范围。除非 Host 后续
正式提供 sandbox API，否则不作为当前路线。

### 路线 F：等待或直接采用官方原生支持

如果 Codex Cloud 将来原生执行 Skill 声明的 Hook，并解决安装位置、权限、session
store 和协议差异，本仓库应优先迁移、缩小或退役，而不是维持重复兼容层。这是明确的
产品退休路线，不是当前 Phase 3 的实现方案。

## 6. 横向比较

| 路线 | pristine upstream | 当前可落地 | 供应链扩张 | 运行时复杂度 | 标准化价值 | 当前结论 |
|---|---|---|---|---|---|---|
| A. 多目标 overlay | 否，owned copy 被补丁 | 是 | 高 | 中 | 中低；主要标准化补丁治理 | 后备 |
| B. 受控快照 | 是 | 是，核心假设已实测 | 中低 | 中高 | 中高；可提炼投影/runner 能力 | Phase 3 首选 |
| C. 上游正式协议 | 是 | 当前不可用 | 低 | 低 | 最高 | 长期理想/退休条件 |
| D. Host-native IR | 不执行或仅作来源 | 理论可行 | 很高 | 很高 | 潜在高，但样本不足 | 当前拒绝 |
| E. OS 虚拟化 | 是 | 平台能力未确认 | 中 | 高 | 中；平台依赖强 | 暂缓 |
| F. 官方原生支持 | 是 | 尚未出现 | 最低 | 最低 | 由官方承担 | 未来迁移/退役 |

## 7. 当前决策

1. Phase 3 使用路线 B：受控 legacy 快照 + pristine resolver/injector。
2. `owned-plan.py` 保持 PWF integration driver 身份，不宣传为通用转换器。
3. Host 层只提炼已经被 PWF 证明的能力：安装/provenance、Hook ABI、受管子进程、
   私有输入投影、环境 allowlist、超时、结果 envelope 和 doctor。
4. 路线 A 保留为失败后备：如果 Cloud/Linux 证明快照无法满足文件语义、权限或清理
   要求，再重新打开多目标 overlay 的契约和 Release 评估。
5. 第二个只读插件出现前，不冻结通用 Driver manifest 或 IR；先记录候选字段和实际
   差异，避免从一个样本过拟合。
6. 如果上游或 Codex Cloud 提供正式协议，优先迁移并删除本仓库中对应的兼容层。

## 8. Phase 3 实现前门槛

- 明确“read-only”指不修改项目、Skill、Managed policy 或 session store；允许受控
  私有临时投影；
- 输入/输出和 timeout 已冻结：完整 context 上限 20,000 字符，30 秒 Host 上限内使用
  27 秒共享 deadline（owned-plan 8、catch-up 15、adapter 4，保留 3 秒 Host margin）；
- Linux 路径策略已冻结为 portable fd-rooted `openat` walk，拒绝 symlink/device/FIFO；
  `openat2` 只作未来可选 hardening；
- single-link Cloud gate 已由 Fresh + Resume 共 40/40 次 stable regular-file、
  `st_nlink=1` 观测关闭；生产读取在 pre/post/reopen 三处 fail-closed 检查该条件；
- stale cleanup 已冻结为同 EUID trusted `/tmp` base 下的 10 分钟/32 entry/500 ms
  有界扫描；
- 证明 root/root 与 synthetic cross-user 都能创建、读取和清理自己的投影；
- 证明项目 `.mode`、nonce、attestation、ledger 和 ambient `PWF_*` 不进入 Phase 3；
- 证明超时、kill、非零退出、空输出、stderr、无效 UTF-8 和超限输出都 fail-closed；
- alpha.2 的 adapter dispatch、ZIP 和 bootstrap 在 inactive Round 3 保持不变；
- Round 4 激活后完成新的 beta golden、fresh Cloud lifecycle/resume 和 post-resume doctor。

## 9. Round 3 落地历史状态

受控快照已经从 Round 2 原型翻译为独立的 production `runtime/owned-plan.py`，并与两个
exact-v1 schema 一起进入开发版 manifest、installer、11-file installed inventory 和
21-entry Release contract。实现采用冻结的 single-link、bounded stale cleanup、portable
`openat` 与共享 deadline 策略；adapter 当时仍无任何 owned-plan 引用，因此该 checkpoint 的
Hook 行为仍是 alpha.2 基线。

Windows 完整回归为 63 registered / 46 PASS / 17 明确 POSIX/Linux SKIP / 0 FAIL。
`docs/phase-3-round-3-cloud-acceptance.md` 的 Linux/Codex Cloud 门槛也已完整通过：63/63、
隔离安装/doctor、11-file inventory、direct exact-v1、21-entry ZIP、零 snapshot 残留与
adapter no-dispatch 全部 PASS。Round 3 已关闭；该证据没有激活 lifecycle，也没有发布
beta.1。

后续 Round 4 已按本路线完成 canonical activation、beta.1 封板、发布下载复核和 live A～F；
受控快照因此成为当前 beta.1 PWF Driver 的已验收实现。Phase 4+ 仍须重新经过 Discovery Gate。
