# beta.2 精简仓库 M2 transformation plan

> 状态：`DISCOVERY COMPLETE / M2-A COMPLETE / M2-B COMPLETE / M2-C CHECKPOINT REQUIRED`
>
> 基线：M1 exact mirror `bbad3703fe2bc3f34bda6ec350f8cfea6f7a159b` / tree
> `ff49c3c6656386e94450ccb24437a1c2d1c50e95`，Windows 69/51/0/18、Cloud/Linux
> 69/69/0/0、冻结双资产和 clean workspace 全部 PASS。
>
> 当前授权：M2-B 已完成 authority/identity/provenance rewrite 与本地验证。该结果不授权 M2-C、
> root commit、slim `main`、push、发布资产、cutover、M3/M4 或 Phase 4。

## 1. M2 要解决什么

M1 证明新 GitHub 仓库的 audit branch 与已验收 beta.2 完全相同。M2 不再证明“复制是否准确”，
而是把这棵 83-path 历史树转换成一棵可长期维护、仍能重建 runtime 和证明安全边界的开发树：

- 去掉 Phase 0～3 planning 流水账、逐 Round 文档和 snapshot feasibility handoff；
- 保留 production、installer、contracts、importer、patcher、fixtures 和安全回归闭包；
- 把仍然有效但带旧版本名的 fixtures/tests 改成行为名；
- 把历史 planning 中仍被 overlay 使用的证据提升到稳定 provenance；
- 从无父提交开始新的公开历史，但不移动或改写 M1 audit ref；
- 新开发身份使用 `0.3.0-beta.3-dev`，不覆盖或冒充 beta.2 资产。

## 2. 不变量与非目标

### 必须保持

1. `hooks/hook_adapter.py`、两个 owned child、四个 managed upstream 文件和 exact-v1 schemas 的
   production 语义不变。
2. global PWF Skill 继续 pristine；importer 仍从 pinned v3.8.2 archive 确定性生成 exact owned
   runtime。
3. Managed policy 仍只注册 adapter；installer owner、lock、archive root、schema IDs 和 installed
   inventory 不因仓库精简而改名。
4. 四个 runtime/upstream 文件继续是唯一 `100755`；所有受支持平台 checkout 的 tracked text
   必须稳定为 LF。
5. beta.2 Release、bootstrap、tag/URL/hash 和 `audit/beta2-exact` 保持不可变；当前档案仓库继续
   保存完整历史和回滚证据。

### 本轮不做

- 不改 Hook behavior、Host ABI、schemas、timeout、trust graph 或 fail-open/fail-closed 语义；
- 不实现 Phase 4 attestation/opt-in；
- 不创建或推送未来 `main`；
- 不生成可发布 hash，不把 development ZIP 当成 Release；
- 不删除旧仓库或 GitHub 上的 beta.2 资产。

## 3. 新 root commit 的精确目标树

目标为 **59 个 tracked paths**。实现时必须由 M1 audit tree 选择性 checkout，不能通过资源管理器
复制。以下清单同时是允许集；未列出的旧路径不得进入 slim root commit。

### 3.1 Root 与治理（14）

```text
.gitattributes
.gitignore
AGENTS.md
ARCHITECTURE.md
BASELINE_PROVENANCE.md
LICENSE
MAINTAINER_HANDOFF.md
README.md
ROADMAP.md
THIRD_PARTY_NOTICES.md
init-cloud-sandbox-v0.3.0.bash
install.js
package.json
upstream-manifest.json
```

### 3.2 Production、contracts 与复现工具（17）

```text
contracts/adapter-plan-context-request-v1.schema.json
contracts/adapter-runtime-request-v1.schema.json
contracts/compatibility-overlays-v1.json
contracts/plan-context-result-v1.schema.json
contracts/release-artifact-v1.json
contracts/runtime-bundle-v1.json
contracts/runtime-result-v1.schema.json
hooks/hook_adapter.py
patches/patch_planning_skill.py
runtime/owned-catchup.py
runtime/owned-plan.py
runtime/upstream/inject-plan.sh
runtime/upstream/ledger-summary.sh
runtime/upstream/resolve-plan-dir.sh
runtime/upstream/session-catchup.py
tools/build_release.py
tools/import_upstream_runtime.py
```

### 3.3 Tests 与 fixtures（22）

```text
tests/activation.test.js
tests/architecture-contracts.test.js
tests/cloud-fixtures.test.js
tests/contracts.test.js
tests/fixtures/cloud/hook-observations-v1.json
tests/fixtures/cloud/session-catchup-cloud-wrapper.jsonl
tests/fixtures/golden/adapter-output-canonical-plan.json
tests/fixtures/golden/adapter-output-managed-legacy.json
tests/fixtures/planning-with-files/README.md
tests/fixtures/planning-with-files/SKILL.md
tests/fixtures/planning-with-files/scripts/resolve-plan-dir.sh
tests/fixtures/planning-with-files/scripts/session-catchup.py
tests/golden-output.test.js
tests/hook-adapter.test.js
tests/import-runtime.test.js
tests/installer.test.js
tests/owned-plan-runtime.test.js
tests/owned-runtime.test.js
tests/release-package.test.js
tests/repository-boundary.test.js
tests/runtime-supervisor.test.js
tests/skill-patch.test.js
```

### 3.4 当前文档与 fresh planning（6）

```text
.planning/.active_plan
.planning/2026-08-05-slim-repository-migration/findings.md
.planning/2026-08-05-slim-repository-migration/progress.md
.planning/2026-08-05-slim-repository-migration/task_plan.md
docs/git-file-modes.md
docs/v0.3.0-beta.2-cloud-hard-acceptance.md
```

计数：14 + 17 + 22 + 6 = 59。

## 4. 重命名、替换和归档矩阵

| M1 path | M2 处理 | 理由/替代 |
|---|---|---|
| `tests/fixtures/golden/adapter-output-v0.2.2.json` | rename | `adapter-output-managed-legacy.json`，bytes 不变 |
| `tests/fixtures/golden/adapter-output-v0.3.0-beta.1.json` | rename | `adapter-output-canonical-plan.json`，bytes 不变 |
| `tests/fixtures/cloud/session-catchup-v0.2.2.jsonl` | rename | `session-catchup-cloud-wrapper.jsonl`，bytes 不变 |
| `tests/phase3-contracts.test.js` | rewrite/rename | `architecture-contracts.test.js`，断言稳定架构和 machine contracts |
| `tests/snapshot-prototype-handoff.test.js` | rewrite/rename | `repository-boundary.test.js`，覆盖 slim/provenance/prototype-retirement |
| `Git可执行权限修复.md` | rewrite/rename | `docs/git-file-modes.md` |
| `PROJECT_UNDERSTANDING.md` | synthesize then archive | 当前职责进入 `ARCHITECTURE.md`；历史留旧仓库 |
| `work_plan.md` | synthesize then archive | beta.2 之后路线进入 `ROADMAP.md` |
| `黑盒验证.md` | archive | 当前冻结验收只保留独立 beta.2 文档；新版本门槛后建 |
| 其他 13 个 Phase/alpha/beta.1 docs | archive | 当前 machine contracts、architecture 和 beta.2 provenance 已承接 |
| 两套旧 `.planning` | archive | 新仓库只创建 M2 fresh planning |
| `snapshot-prototype/` 八个文件 | archive | production owned-plan 覆盖已落地；见第 5 节 |
| ignored `planning-with-files-3.8.2/` | 不迁入 | importer archive test + committed fixture 是权威来源 |

“archive”只表示不进入新 root commit；文件继续保留在当前旧仓库和 M1 audit ref，不执行物理删除。

## 5. Prototype 退役覆盖映射

| Prototype conclusion | Production replacement |
|---|---|
| pristine context from private snapshot | `owned plan emits pristine managed-legacy context from a private snapshot` |
| symlink/non-regular rejection | `owned plan rejects linked, non-regular, oversized, and invalid UTF-8 inputs` |
| oversized input suppression | 同上 |
| whole-context output budget | exact-v1 validation + owned plan output-budget case；边界继续由 result schema 固定 |
| replacement race detection | `owned plan safe reads detect replacement, truncation, append, and hard-link races` |
| 0700/0600 + timeout cleanup | `owned plan kills the injector process group, bounds output, and cleans snapshots` |
| synthetic Hook user ownership | existing real/synthetic cross-user activation tests |
| handoff self-containment | 不再是 production requirement；由 selective tree 和 source dependency test 取代 |
| prototype absent from production graph | 移入 `repository-boundary.test.js` |

不得为了移除 prototype 而删减 production safe-read、hard-link、timeout、process-group、permission
或 cleanup 断言。若映射中的任一 production case 不存在或必须弱化，M2 立即停止。

## 6. 新文档权威

| 文件 | 唯一职责 |
|---|---|
| `README.md` | 当前行为、安装、doctor/repair、开发和 Release 使用 |
| `AGENTS.md` | 阅读顺序、权威关系、稳定安全/Release/Discovery 规则 |
| `ARCHITECTURE.md` | Host/adapter/owned runtime/trust/component 心智模型 |
| `ROADMAP.md` | 从 beta.2 之后开始的 Phase 4～9 与 Cloud gates |
| `BASELINE_PROVENANCE.md` | 旧仓库 commit/tree/Release assets、M1、upstream/overlay 复现链 |
| `MAINTAINER_HANDOFF.md` | 新人接手、日常检查、变更分类、测试/发布/回滚入口 |
| `docs/git-file-modes.md` | Windows/Linux Git mode 与 LF 检查/恢复 |
| `docs/v0.3.0-beta.2-cloud-hard-acceptance.md` | 不可变 beta.2 A～F 和资产基线 |
| fresh `.planning` | 当前 M2/M3 执行状态，不携带 Phase 0～3 流水账 |

`compatibility-overlays-v1.json.cloud_evidence` 改指 `BASELINE_PROVENANCE.md` 和行为型 Cloud fixtures，
不得继续依赖旧 `.planning`。Phase 3 文档字符串断言迁到 `ARCHITECTURE.md` 和 machine contracts。

## 7. 版本、repository 与 Release 身份

- package version：`0.3.0-beta.3-dev`；
- product/bin/installer owner/schema namespace/archive root：仍为 `pwf-codex-cloud-hooks`；
- successor repository：`keeptoy/pwf-codex-cloud-hooks-next`；
- development bootstrap 默认 version：`v0.3.0-beta.3-dev`；默认 URL 使用 successor slug；
- development bootstrap ZIP SHA：64 个 `0`，必须 fail closed；
- Release contract entry 数仍为 22，bootstrap 仍在 ZIP 外；
- beta.2 hash 只存在于 baseline provenance/acceptance，不再由当前 bootstrap 冒充。

M2-B 源码核查纠正了 Discovery 假设：当前 patcher 仍要求
`upstream-manifest.json.historical_patched_skill_files` 与
`compatibility_patches[PATCH_ID].patched_sha256` 一致，并不存在可直接替代该字段的 fallback。
因此 slim baseline 保留这个兼容字段与稳定 patch ID；删除或改名须留给未来独立 contract gate，
不能作为本轮文档精简的一部分。

## 8. Git root-commit 与 worktree 协议

1. M1 audit worktree 必须 clean 且仍在 frozen commit；禁止在其上 switch orphan。
2. 在已解析并验证位于 `new-space/` 下的专用 sibling 路径创建 secondary worktree。
3. secondary worktree 创建本地 orphan branch `migration/slim-beta3-dev`；不得命名为 `main`。
4. 从 `audit/beta2-exact` 只 checkout 第 3 节已有的源路径；重命名必须用 Git 操作保留 blob/mode。
5. 应用第 4～7 节 rewrite 后先运行 pre-commit gates；只在通过后创建单一 root commit。
6. root commit 后验证无 parent、59 tracked paths、四个且仅四个 `100755`、worktree clean。
7. M2 不 push 该 branch。M3 需要 Cloud 时再由维护者授权 push development branch。

这样可以让 audit checkout 始终是可比较/可回滚 oracle；M2 失败时只移除已验证路径的 secondary
worktree 和未发布 local branch，不需要 reset audit ref。

## 9. 分批实施

### M2-A — orphan skeleton 与 path boundary

- 创建 secondary orphan worktree；
- 只导入允许源路径并完成六项 rename；
- 创建 fresh planning 和空的稳定文档入口；
- 验证禁止路径缺失、允许路径无遗漏、Git modes 正确；
- 不改 production/runtime bytes，不提交。

### M2-B — authority、identity 与 provenance rewrite

- 重写 README/AGENTS/ARCHITECTURE/ROADMAP/BASELINE/HANDOFF/git-mode 文档；
- 扩展 `.gitattributes` 为 repository-wide `text=auto eol=lf`，为二进制显式 `-text`；
- 更新行为型 fixture/test names、overlay evidence/status、manifest contract hash；
- package 进入 beta.3-dev；bootstrap 进入 successor URL + zero-hash fail-closed；
- 更新 release/bootstrap/baseline tests，不修改 production implementation。

### M2-C — root commit 与本地关闭

- importer check 和 managed runtime exact hash；
- Windows full suite：预计 63 registered / 52 PASS / 11 honest POSIX skips / 0 FAIL；
- 两次 development ZIP build 字节一致、22 entries、bootstrap external/placeholder；
- 创建单一 root commit并验证无 parent、59 paths、四个 `100755`、LF、clean；
- fresh Windows clone 再跑 importer/static/suite，防止 M1 的 clean-but-CRLF 问题复发。

测试数是当前映射的预测值，不是安全目标。实际 count 不同必须先解释新增/减少的 case，不能为匹配
数字弱化断言。Linux/Cloud 63/63 与行为等价属于 M3，不在 M2 本地证据中冒充完成。

## 10. M2 exit、停止和回滚

### Exit criteria

- root commit 无 parent，exact 59-path allowlist；
- audit ref/old Release 未变化；
- production implementation、exact schemas 和 managed runtime bytes 除批准 metadata 无行为差异；
- importer/patcher/installer/doctor/repair/uninstall/Release tests 全绿；
- prototype 每项结论都有 production replacement；
- docs 每个当前问题只有一个权威；
- broad LF 在 fresh Windows clone 和 Git mode gate 中成立；
- development ZIP deterministic，但 bootstrap 因 zero hash 不可发布；
- M3 Cloud gate 和 M4 cutover 仍明确未授权。

### Stop conditions

出现以下任一情况立即 `NO_GO` 并保留 audit oracle：

- 需要改 adapter、owned runtime、upstream runtime 或 schema 才能完成所谓精简；
- importer 输出 hash、installed inventory 或 exact-v1 行为漂移；
- 删除历史文件后无法用稳定 provenance/fixture 替代 active dependency；
- prototype 移除要求弱化 race/hard-link/timeout/cross-user/cleanup 断言；
- root commit 意外带 parent、audit ref 移动、分支被提前 push 或 beta.2 资产被改写；
- Windows 与 Linux 对 LF/mode/security semantics 产生无法解释的冲突。

### Rollback

M2 未发布，回滚只针对 secondary worktree/local orphan branch。先只读验证实际路径属于预期
`new-space` sibling、audit worktree clean 且 ref 未移动，再移除 secondary worktree/ref。不得使用
`git reset --hard`，不得删除当前档案仓库或 remote audit branch。

## 11. Discovery 结论

结论：`CONDITIONAL_GO`。

M2-A 与 M2-B 均已在 secondary orphan worktree 完成。当前树仍为 exact 59 paths、四个且仅四个
`100755`，宏观权威、行为命名、overlay/provenance、beta.3-dev 与 successor zero-hash bootstrap
已经统一；Windows suite 为 63/52/0/11，production bytes、renamed fixture blobs、manifest hashes、
LF/UTF-8 和 M1 audit oracle 均通过验证。当前等待维护者 checkpoint 和 M2-C 明确授权；不得提前
创建 root commit、push、Release、cutover、进入 M3/M4 或 Phase 4。若后续实际依赖图与本文不同，
先暂停并回到 Discovery，而不是扩大允许列表。
