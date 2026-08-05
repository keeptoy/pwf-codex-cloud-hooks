# beta.2 精简仓库迁移探路方案

> 状态：`M1 COMPLETE / M2 COMPLETE / M3 DISCOVERY COMPLETE / M3-A TRANSPORT PASS / CLOUD PENDING`
> 基线：已发布并验收的 `v0.3.0-beta.2`  
> 当前执行权威：successor 仓库 `keeptoy/pwf-codex-cloud-hooks-next` 的 `docs/beta3-dev-m3-cloud-equivalence.md` 与活动 planning；本文保留迁移路线、归档边界和回滚背景，不复制 M3 可执行脚本。
> 本文不授权 push、Cloud 执行、live `/opt/codex` 安装、创建 public `main`、Release、cutover、修改 production behavior，也不授权进入产品 Phase 4。

## 1. 目标与非目标

本次迁移的目标不是把旧目录机械复制到一个新位置，而是建立一个以 beta.2 为行为和回滚基线、面向后续开发的精简源码仓库：

- 保持 beta.2 已验收的安装、Hook、doctor、Release 和 Cloud 行为；
- 保留从固定上游来源重建并审计 owned runtime 的能力；
- 保留能够证明当前安全边界的测试和 fixtures；
- 把 Phase/Round 流水账、原型交割和旧版发布记录留在当前仓库作为历史档案；
- 让新仓库只描述“现在是什么、下一步去哪里”，不要求维护者先理解 v0.2.2 到 beta.2 的完整演进过程。

本次迁移不做以下事情：

- 不重新发布或改写 beta.2 的 ZIP/bootstrap 字节；
- 不把项目宣称为通用 Skill 转换器；
- 不顺便实施 Phase 4、改变 schema/Host ABI 或扩展 trusted graph；
- 不用删测试、改断言或抹掉来源记录来换取表面上的“干净”；
- 不把当前仓库删除、重写历史或立即设为只读。

## 2. 冻结基线

新仓库必须能够回指并验证以下不可变基线：

| 项目 | beta.2 冻结值 |
|---|---|
| Release | `v0.3.0-beta.2` |
| Release ZIP entries | 22 |
| Release ZIP size | 84,572 bytes |
| Release ZIP SHA-256 | `812cc9cdcafa93b5fcc47cc763fd743f11be77958b75eea1fa4cf0508dd391ab` |
| 外部 bootstrap size | 17,425 bytes |
| 外部 bootstrap SHA-256 | `d572b77d920b34c34c7912ba364376ae3668216f00ce350251bd7c8b336abcd6` |
| Cloud 验收 | Fresh/Resume A–F PASS |
| Linux suite | 69/69/0/0 |
| Managed payload | 11 个 payload，加独立 `installed-manifest.json` |
| Release 权威记录 | `docs/v0.3.0-beta.2-cloud-hard-acceptance.md` |

beta.2 资产继续由当前仓库和原 Release 页面保存。新仓库只能引用它们作为来源/回滚证据；只要新仓库的打包输入发生任何变化，就不得把新产物继续叫作同一 beta.2 字节。

## 3. `new-space/` 的正确定位

`new-space/pwf-codex-cloud-hooks/` 目前为空，适合作为本机的短期迁移演练目录：路径直观，便于在同一工作区比较旧树和候选树，也没有遗留内容需要清理。

它不适合成为长期的嵌套 Git 仓库：

- 父仓库执行 `git add .` 时容易误纳入候选树或嵌套仓库指针；
- `rg`、测试发现、包管理器和文档检查可能递归扫描两套同名源码；
- 根级 `AGENTS.md`、`.gitignore` 和工具工作目录容易产生权威关系歧义；
- 将来独立发布、归档和 CI 时，嵌套位置没有实际收益。

因此建议：

1. Discovery 阶段保留空目录，不初始化 Git、不复制文件；
2. 获得迁移实施授权后，可先在这里做一次短期、可删除的候选树演练；
3. 正式初始化新 Git 仓库前，把候选树放到旧仓库之外的同级目录，或直接 clone 到独立工作区；
4. 当前仓库在整个迁移验收期内保持生产源码和证据权威。

## 4. 三层迁移边界

### A. 产品与安装闭包：必须原样保留

当前 Release allowlist 的 22 个文件加 ZIP 外部 bootstrap 构成可安装产品闭包。它们必须先以 beta.2 原字节进入等价性演练：

- `LICENSE`、`THIRD_PARTY_NOTICES.md`；
- `package.json`、`install.js`、`upstream-manifest.json`；
- `hooks/hook_adapter.py`；
- `runtime/owned-catchup.py`、`runtime/owned-plan.py`；
- `runtime/upstream/` 下四个固定文件；
- `contracts/` 下当前七个 Release contracts/schemas；
- `tools/build_release.py`、`tools/import_upstream_runtime.py`；
- `README.md`；
- ZIP 外部的 `init-cloud-sandbox-v0.3.0.bash`。

这只是“能安装”的闭包，不是完整、可维护的源码闭包。

### B. 源码复现与维护闭包：必须保留或先完成等价替换

以下内容没有全部进入 Release ZIP，但承担供应链复现和回归职责：

- `patches/patch_planning_skill.py`；
- `contracts/compatibility-overlays-v1.json` 中的 overlay 来源、锚点、输入/输出 hash 和 retirement 条件；
- `tests/` 中 production、installer、contract、import、Release、Cloud-shaped 和安全边界测试；
- `tests/fixtures/planning-with-files/` 的 pinned upstream fixture；
- Cloud schema/JSONL fixtures 与 canonical/managed-legacy golden outputs；
- Git executable modes、LF 规则、确定性 ZIP 构建和外部 bootstrap 边界；
- 一份精简后的当前架构说明、基线来源说明和完整 beta.2 Cloud 验收文档。

这里最容易误删的是 patcher 和 compatibility overlay。它们虽然源于 v0.2.2 时期，但当前 importer、manifest 和 contract tests 仍用它们证明 owned `session-catchup.py` 如何从固定上游产生。可以删除旧版叙事，不能先删除这条复现链。

### C. 历史与原型档案：默认不迁入新仓库主分支

以下内容继续由当前仓库保存，原则上不进入新仓库的公开主分支：

- 现有 `.planning/` 的 Phase 0～3 过程账本；
- `docs/phase-*`、alpha.1、alpha.2、beta.1 的逐轮设计与验收记录；
- 主要描述 v0.2.2 时代操作的通用 `黑盒验证.md`；
- `snapshot-prototype/` 及其 handoff test；
- 被 Git 忽略的 `planning-with-files-3.8.2/` 开发参考树；
- 已被 beta.2 独立验收文档覆盖的重复发布流水账。

“不迁入”表示不进入新仓库的日常源码/文档权威，不表示删除。当前仓库应继续作为可追溯历史档案和 beta.2 Release 来源。

## 5. 保留、改写、归档矩阵

| 当前内容 | 新仓库处理 | 条件或说明 |
|---|---|---|
| Release 22 文件 | 原样导入后再按新版本演进 | 第一阶段必须验证 beta.2 exact bytes |
| 外部 bootstrap | 保留为基线参考；新发布时生成新版本 | 不得修改后仍冒充 beta.2 |
| importer + patcher + overlay ledger | 保留，随后去历史化命名/说明 | 必须继续从 pinned upstream 确定性重建 |
| upstream manifest / license provenance | 保留 | 属于当前供应链合同，不是历史包袱 |
| production/installer/contract/Release tests | 保留 | 不以 test count 为目标，以覆盖映射为目标 |
| owned-plan/owned-catchup 安全测试 | 保留 | containment、identity、race、timeout、cleanup 不得降级 |
| Cloud schema/JSONL fixtures | 保留并重命名 | 版本名改为行为名，fixture bytes/语义先不变 |
| managed-legacy/canonical goldens | 保留并重命名 | 仍保护当前兼容输出与两项 canonical 差异 |
| snapshot prototype 的 8+1 tests | 默认归档 | 先确认其安全结论已由 production owned-plan tests 覆盖 |
| Phase 3 文档驱动的测试断言 | 迁到 machine contracts 或新架构文档 | 完成替换前不能删除对应 Phase 文档 |
| README / PROJECT_UNDERSTANDING | 合并、压缩并改写为当前态 | 不复制逐轮流水账 |
| work_plan | 新建只从 beta.2 之后开始的 roadmap | Phase 0～3 只保留一句基线来源 |
| AGENTS.md | 新建精简入口 | 指向新仓库自己的文档权威与 fresh planning |
| 当前 `.planning/` | 不迁移 | 新仓库创建新的 migration/next-phase scoped plan |
| 旧版本验收、Round 文档、旧 runbook | 留在当前仓库 | 用 baseline provenance 链接回查 |
| `Git可执行权限修复.md` | 改写为 `docs/git-file-modes.md` | 保留四个 `100755` 文件的恢复和检查方法 |

建议在不改变 fixture 语义的前提下，把三个容易误判为“只服务旧版本”的名字改成行为名：

- `adapter-output-v0.2.2.json` → `adapter-output-managed-legacy.json`；
- `adapter-output-v0.3.0-beta.1.json` → `adapter-output-canonical-plan.json`；
- `session-catchup-v0.2.2.jsonl` → `session-catchup-cloud-wrapper.jsonl`。

这是后续精简实施，不属于 beta.2 exact mirror 阶段。

## 6. 新仓库建议文档架构

建议只保留六类权威入口：

| 文件 | 作用 |
|---|---|
| `README.md` | 当前行为、安装、doctor/repair、Release 使用方法 |
| `AGENTS.md` | 阅读顺序、权威关系、安全/Release 边界 |
| `ARCHITECTURE.md` | 当前心智模型、组件职责、Host/runtime/trust 边界 |
| `ROADMAP.md` | 从 beta.2 之后开始的 Phase 路线与 Cloud gates |
| `BASELINE_PROVENANCE.md` | 旧仓库 commit/tag、beta.2 两个资产 hash、上游与 overlay 复现链 |
| `docs/v0.3.0-beta.2-cloud-hard-acceptance.md` | 冻结基线的独立 A–F 验收权威 |

此外只创建一套新的 `.planning/<slug>/task_plan.md`、`findings.md`、`progress.md`。专项设计在新 Phase 确实需要时再增加，不预先复制旧 Round 文档。

## 7. 路线比较

| 路线 | 优点 | 主要问题 | 判断 |
|---|---|---|---|
| 直接文件系统复制 | 最直观 | 已有丢失四个 executable modes 的实际先例；难证明 blob 来源；易漏隐藏依赖 | `NO_GO` |
| 只从 beta.2 ZIP 起步 | 内容最少 | 没有 patcher、完整 tests、fixtures 和供应链复现链；只能安装，不能可靠维护 | `NO_GO` |
| 完整 clone 后 filter/rewrite history | Git modes 与历史都在 | 仍携带大部分包袱；history rewrite 工具和审计成本高 | 非默认备选 |
| Git-tree-aware 选择性导入到新 root commit | 保留 blob 与 index mode；可精确控制新仓库内容；旧仓库仍保留完整历史 | 需要显式路径清单、hash/mode gate 和两阶段验收 | **推荐** |

推荐路线不是用资源管理器复制，而是让新仓库获取当前冻结 source commit，在临时分支/工作树中通过 Git tree 选择文件，再建立新的 root commit。无论具体使用 orphan branch、临时 bundle 还是本地 fetch，都必须以 `git ls-files --stage`、逐文件 hash 和测试结果证明迁移，而不能依赖“看起来一样”。

## 8. 推荐迁移阶段

### M0 — Discovery（已完成）

- 冻结本文的范围、路线、停止条件和待决策项；
- 不建立候选仓库，不改变产品和 Release；
- 结论：`CONDITIONAL_GO`。

### M1 — beta.2 exact mirror（已完成）

- 记录旧仓库冻结 commit、tree、tag 和两个 Release asset hashes；
- 通过 Git tree 构造一次完整的 beta.2 镜像候选，不做精简或改名；
- 验证 69/69 Linux、ZIP/bootstrap exact hash、四个 `100755`、LF、installer/doctor 和 clean workspace；
- 这棵完整镜像建议只留作本地/临时审计分支，不作为新仓库公开 `main`。

M1 已完成：候选 `audit/beta2-exact` 与冻结源共享 exact commit/tree/83 个 index entries/四个 `100755`，Windows 为 69 registered / 51 PASS / 18 honest POSIX skips / 0 FAIL。修正 reporter parser 后，Fresh Cloud V2 完整得到 Linux 69/69/0/0、22-entry / 84,572-byte ZIP、17,425-byte 外部 bootstrap、双资产 exact SHA、零缓存和 clean workspace，并输出 `M1_EXACT_MIRROR_CLOUD_ACCEPTANCE=PASS`。候选 GitHub remote 与 audit branch 已建立；这只关闭 exact-mirror gate，不自动授权 M2、slim `main`、cutover、Release 或 Phase 4。

### M2 — slim transformation（已完成）

- 根据本矩阵移除历史 planning、Round 文档和 prototype；
- 建立精简文档入口与新的 planning 状态；
- 把版本型 fixtures 改成行为型名称；
- 把 overlay 叙事改写为当前 runtime provenance，但保留机器可验证字段；
- 把文档断言从旧 Phase 文档迁到 machine contract 或新架构文档；
- 在任何新产物构建前确定新仓库 identity 与开发版本。

M2 已完成：successor 建立了唯一无父 root commit `3234e4e02090c838f5ee260cd8f2d99daf358d65`，冻结 59-path 精简边界、四个 `100755`、仓库级 LF、行为型 fixture 名称、beta.3-dev 身份、供应链复现链和新的文档/planning 权威。Windows fresh-clone 与本地 suite 为 63 registered / 52 PASS / 11 honest POSIX skips / 0 FAIL；该 root commit 保持为不可变 M2 基线。

### M3 — behavior-equivalence gate（Discovery 已完成；M3-A Cloud 待验收）

- 完整源码复现、unit/integration、安全、installer、doctor、upgrade、repair、uninstall 回归；
- 从 pinned upstream 重新 import 并得到 exact owned runtime；
- 构建新版本确定性 ZIP，验证精确 inventory/modes/LF/bootstrap separation；
- 在隔离 Cloud 中完成等价性 A–F，重点验证 startup/UserPrompt、canonical plan、real resume catch-up、post-resume doctor 和零 snapshot residue；
- 任何行为差异都必须分类为预期的新版本变化或迁移缺陷。

M3 Discovery 已在 successor 中完成并提交。独立协议 `docs/beta3-dev-m3-cloud-equivalence.md` 将后续工作拆为互不自动授权的 M3-A（精确 development commit 的 push 与 no-live Linux/Cloud seal）、M3-B（一次性 Cloud setup、Fresh、Resume 生命周期）和 M3-C（证据闭合）。维护者已授权 M3-A；审核 commit `f54fb78633d22af5c8f0f225fc8c44ad046aa9c1` 已非强制推送到远端同名 `migration/slim-beta3-dev`，local/remote HEAD 精确相等，工作区 clean。M3-A Cloud seal 尚未执行；此前本地开发 ZIP 证据为 22 entries / 75,323 bytes / SHA-256 `82770964b938b14eea74394a4e99957e0b3f63e0a4477fbea49fd3730a31e508`，外部 bootstrap 仍以全零 ZIP hash fail closed。这些是 Cloud gate 的预期输入，不是 Release 资产或 Cloud PASS 证据。

### M4 — repository cutover

- 新仓库只有在 M3 PASS 后才成为后续开发权威；
- 当前仓库保留 beta.2 Release、完整历史证据和回滚说明，并在 README 顶部指向新仓库；
- 新仓库的 `BASELINE_PROVENANCE.md` 反向指向当前仓库的冻结 commit/tag/asset；
- Phase 4 仍需独立 Discovery Gate，不能因为仓库迁移完成而自动开始。

## 9. 仓库身份与版本策略

仓库名不是纯文档字符串。当前 identity 出现在 npm/bin 名称、installer owner/lock、runtime snapshot 前缀、ZIP root、bootstrap URL、schema `$id`、overlay owner、测试和文档中。改名会触及契约、安装升级和 Release，不应和“删除历史文档”混成一次机械替换。

低风险默认方案：

- 迁移期使用一个独立的临时 successor repository slug；
- beta.2 Release 继续留在旧仓库，不在新仓库重复发布同名但来源不清的资产；
- 新仓库精简完成后先使用开发身份，例如 `0.3.0-beta.3-dev`；
- 是否沿用最终 GitHub slug、npm/bin/installer owner 和 schema namespace，在 M2 开始前单独冻结；
- 只有新字节完成 M3 后才建立新的 pre-release/tag。

如果未来希望新仓库接管当前 GitHub slug，应单独设计 rename/redirect/Release URL/rollback 方案。直接删除旧仓库再占用原 slug 会削弱 beta.2 的不可变来源证据，不建议作为首选。

## 10. 验收矩阵与停止条件

| Gate | 必须证明 |
|---|---|
| Source identity | 冻结旧 commit/tree；选择性导入清单完整；无未说明文件 |
| Git metadata | 四个 upstream runtime 文件保持 `100755`；其余预期 mode、LF 和 `.gitattributes` 正确 |
| Provenance | pinned upstream、archive SHA、source/output hashes、patcher/overlay 可复现 |
| Product | adapter、两个 owned child、installer、doctor 与 managed policy 行为等价 |
| Safety | containment、session identity、invalid UTF-8、race、hard-link、timeout、process group、cleanup、budget 不降级 |
| Release | exact allowlist、顺序、mode、metadata、ZIP 外 bootstrap 和新版本 SHA 流程完整 |
| Cloud | Fresh + UserPrompt + real Resume catch-up + post-resume doctor + zero residue PASS |
| Documentation | 每个问题只有一个当前权威；历史只通过 provenance 链接回查 |
| Rollback | 可直接回到旧仓库已发布 beta.2，无需依赖新仓库修复 |

遇到以下任一情况必须停止迁移并回到探路：

- 选择性导入后 beta.2 exact mirror hash、Git mode 或行为不一致；
- 删除某个“历史”文件后 importer、contract 或测试失去可复现来源；
- 新旧仓库 identity 导致 installer upgrade、lock、managed ownership 或 schema 信任关系变化；
- Windows 与 Linux/Cloud 对 mode、LF、process 或安全断言给出不同结论；
- 为保持测试绿色必须弱化 production 安全断言；
- 新仓库需要修改 production behavior 才能通过所谓“迁移等价”验收。

## 11. 当前判断与实施前待决策

当前判断为 `CONDITIONAL_GO`：可以进入一个独立的迁移项目，但不能把空目录直接视为已确定的新仓库，也不能以 beta.2 ZIP 作为唯一源码种子。

推荐默认选择：

1. `new-space` 只作为短期演练区，正式 Git 仓库放到旧仓库之外；
2. 使用 Git-tree-aware 选择性导入，新公开 `main` 从精简 root commit 开始；
3. 完整 beta.2 mirror 只作为本地/临时审计阶段，不把全部旧树先推上新仓库主分支；
4. 当前仓库长期保留为 beta.2 Release 与历史证据档案；
5. 新仓库保留供应链复现链和行为测试，归档 Phase/Round 流水账与 prototype；
6. 新产物从 `0.3.0-beta.3-dev` 或另行冻结的新身份开始，不修改或重发 beta.2。

维护者已经冻结以下选择：

- 迁移期 GitHub slug 使用 `keeptoy/pwf-codex-cloud-hooks-next`；候选 remote 与只读 `audit/beta2-exact` 已建立，public `main` 仍须等 M3 完整关闭并在 M4 另行授权；
- 当前 successor 工作树位于 `new-space/pwf-codex-cloud-hooks-next-slim`；路径只是本地迁移载体，仓库内权威文件不依赖该父目录名；
- beta.2 完整镜像保留为本地/只读 audit ref，不进入未来公开 `main`；
- 第一阶段沿用现有 product/schema/installer identity，不把仓库精简与产品改名合并；
- 精简后的开发版本暂定 `0.3.0-beta.3-dev`；
- M2 新增 `MAINTAINER_HANDOFF.md`，作为新人维护交割入口。

M1、M2 和 M3 Discovery 已完成。M2 的精确 59-path allowlist、prototype 覆盖、文档权威、beta.3-dev、secondary orphan worktree 和停止/回滚合同见 `docs/beta2-slim-repository-m2-transformation-plan.md`；M3 的可执行协议只由 successor 的 `docs/beta3-dev-m3-cloud-equivalence.md` 维护。successor 已在不可变 M2 root 之上形成 60-path M3 governance descendant，审核 HEAD `f54fb78633d22af5c8f0f225fc8c44ad046aa9c1` 已推送到同名 development branch。当前只等待 M3-A no-live Cloud seal 原始结果；M3-B、M3-C、public `main`、M4、Release、cutover、production behavior 和产品 Phase 4 均未获权。
