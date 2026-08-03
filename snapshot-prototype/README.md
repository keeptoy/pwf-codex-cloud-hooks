# Controlled Snapshot Prototype 独立交接包

这个目录是 Phase 3“受控 pristine snapshot”路线的**独立、未发布原型交接包**。
第三方只读本目录即可理解设计、运行测试和复现实验；不需要先理解父仓库。它不是生产
`owned-plan.py`，不会被安装、打包或由 Managed Hook 调用。

## 目录内容

```text
snapshot-prototype/
|-- README.md                       # 本交接入口
|-- FEASIBILITY_REPORT.md           # 完整实验、工业实践、风险与问题
|-- prototype_snapshot_runner.py    # 未发布原型
|-- package.json                    # 独立测试/静态检查入口
|-- LICENSE                         # 随附上游脚本的 MIT License
|-- upstream/
|   |-- resolve-plan-dir.sh         # pristine planning-with-files v3.8.2
|   `-- inject-plan.sh              # pristine planning-with-files v3.8.2
`-- tests/
    `-- snapshot-prototype.test.js  # 8 个对话/攻击/边界测试
```

## 快速运行

依赖：Linux、Python 3、POSIX `/bin/sh`、Node.js 18+；cross-user 测试在 root 下还会
使用 `runuser` 和现有 `nobody` 用户。

```bash
cd snapshot-prototype
npm test
npm run check

# 对任意带 task_plan.md 或 .planning/ 的项目运行原型
python3 prototype_snapshot_runner.py /absolute/project/path
```

在非 Linux 平台，Linux 专属的 FIFO、权限、race 和 cross-user 测试会按声明跳过；
不能把这种跳过当成生产 POSIX 证据。

## 实际做出的原型

原型实现了一条最小但真实的纵向链路：

1. 调用本目录内 pristine `resolve-plan-dir.sh`；
2. 得到真实项目中的 plan；
3. 从 project directory fd 开始逐级打开路径；
4. 使用 `O_DIRECTORY`、`O_NOFOLLOW`，拒绝空组件、`.`、`..` 和 symlink；
5. 只接受 regular file，并设置单文件 1 MB 上限；
6. 读取前后执行 `fstat`；
7. 从保留的 parent fd 再次打开同名文件，检测 pathname replacement；
8. 创建 `0700` 私有 snapshot；
9. 通过 `O_EXCL | O_NOFOLLOW` 以 `0600` 写入 task/progress 原始字节；
10. 使用从零构造的最小环境调用本目录内 pristine `inject-plan.sh`；
11. 检查退出码、stderr、timeout、UTF-8、空输出和 20,000 字符总预算；
12. 返回 injecting/non-injecting reason-coded 结果；
13. 通过 context manager 清理 snapshot。

### 安全读取

目录路径不是拼接字符串后普通 `open()`，而是从 project root fd 开始，逐组件使用
`dir_fd` 和 `O_NOFOLLOW`。文件用 `O_NOFOLLOW | O_NONBLOCK` 打开，先验证 regular
file，再在读取前、读取后和重新打开后比较 device、inode、size、mtime、ctime 和
file type。路径被原子替换时返回 `plan_state_changed`，绝不注入混合状态。

`O_NONBLOCK` 使 FIFO 不会把 Hook 卡死，随后 regular-file 检查会拒绝它。

### 最小环境

Injector 环境不是 Host 环境的删减版，而是从零构造，只包含：

```text
PATH
LC_ALL=C
LANG=C
TMPDIR
```

只有 resolver 需要且调用者明确给出时才加入 `PLAN_ID`。Injector 看不到 ambient
`PWF_INJECT`、`PLANNING_DISABLED` 或未来其他 `PWF_*`，snapshot 也不复制
`.planning`、`.mode`、attestation、nonce 或 ledger。

### Snapshot 与 supervision

`TemporaryDirectory` 创建的目录被强制为 `0700`，输入文件强制为 `0600`。Injector
受到内部 timeout、非零退出、stderr、UTF-8、非空输出和 20,000 字符预算约束；失败
返回 non-injecting outcome，正常路径和 timeout 路径都会清理 snapshot。

## 模拟用户对话和攻击场景

8 个 focused tests 覆盖下列能力（一个 test 可以覆盖多行场景）：

| 场景 | 结果 |
|---|---|
| 正常 scoped 用户对话 | 成功产生 pristine legacy context |
| Hostile ambient `PLAN_ID`、`PLANNING_DISABLED`、`PWF_INJECT=smart` | 不影响受控 injector |
| 真实 plan 带 `.mode`、nonce | 不投影、不提前激活 Phase 4 |
| Task symlink 指向项目外 | `plan_unreadable`，不注入 |
| Progress 是 FIFO | 不阻塞，`plan_unreadable` |
| Task 大于 1 MB | 不执行有效注入 |
| 渲染结果大于 20,000 字符 | 整体抑制，不做部分注入 |
| 读取后 pathname 被原子替换 | `plan_state_changed` |
| Snapshot mode probe | 目录 `0700`，文件 `0600` |
| Injector timeout | `timeout`，snapshot 清理 |
| Synthetic `nobody` Hook user | 创建、读取、清理自己的 snapshot |
| Bundle boundary | 运行时代码和上游脚本全部在本目录内 |

测试实际构造 hostile ambient variables、`.mode`、nonce、symlink、FIFO、超限输入/
输出和 pathname replacement；权限、timeout cleanup 与 synthetic `nobody` 也是真实
Linux 行为，不是 mock。

## 输出等价性证据

Round 1 的真实 scoped plan 与 root snapshot 捕获均为 9,628 字符，SHA-256 都是：

```text
00fd3288926b8ae25d30475f44cf90f2b5e96b351a5a531dcc92d5491b6af6b8
```

后续 active plan 变化后再次验证，两边均为 6,113 字符，SHA-256 都是：

```text
227b30d2fa5406363f668b59fcec30f9b376db84d50271cd8527566c14fb1303
```

两次都是 byte-for-byte equal。这是 managed-legacy 的实证，不是所有上游模式的
永久保证。

## 路线之争与当前选择

| 方案 | 优点 | 代价 | 当前结论 |
|---|---|---|---|
| 多目标 managed overlay | managed 输入直观；补丁 anchor、分支和 managed hash 可审计 | 扩大 patcher、importer、overlay ledger、manifest、Release、漂移、升级和退休成本；形成第二个 upstream fork 点 | 后备 |
| 受控 pristine snapshot | resolver/injector 保持 pristine；供应链和退休逻辑更小 | secure-open、竞态、权限、环境、supervision、清理和预算由 Host 承担 | 首选，原型 conditional GO |

还评估了上游正式协议、Host-native IR、OS namespace/FUSE 和未来 Codex Cloud 原生
支持。上游正式协议是长期理想退休路线；IR 当前会从一个 Skill 过拟合；OS 投影缺少
Cloud capability 契约；官方原生支持出现时应缩小或退役本集成。

本目录附带脚本与 pinned upstream planning-with-files v3.8.2 完全一致：

| 文件 | SHA-256 |
|---|---|
| `upstream/resolve-plan-dir.sh` | `38a1c5effb35f9506e2e371ccabb6be6e4f4170acc18f1811f08d634f5f0e9bd` |
| `upstream/inject-plan.sh` | `72c7904ec9a03f994d349ac1b9b3cfe484b417e738b25c0545d9ae11a2cc0364` |

其父项目 provenance 保持 `origin = upstream_pristine`、
`pristine_sha256 == managed_sha256`。

## 生产推荐调用链

未来生产实现不是直接安装本原型，而是：

```text
Codex Managed Hook
  -> hook_adapter.py
       -> owned-plan.py
            1. 校验 v1 request
            2. 处理 PLANNING_DISABLED 和 session attachment
            3. 在真实 project cwd 调用 pristine resolver
            4. 校验 resolver 输出与 canonical containment
            5. 安全读取 task_plan.md/progress.md 原始字节
            6. 创建 0700 私有临时目录
            7. 写入 0600 task/progress-only snapshot
            8. 用 allowlisted 最小环境调用 pristine injector
            9. 校验 timeout、退出码、stderr、UTF-8、framing 和长度
           10. 返回 context 与 canonical project state
           11. finally 清理临时目录
       -> SessionStart 把同一份 state 传给 owned-catchup.py
```

SessionStart 与 UserPromptSubmit 必须经过同一个 `owned-plan.py`，防止 adapter、
injector 和 catch-up 各自解析出不同状态。

## 工业界做法

本路线组合的是成熟模式：Linux `openat2` 的 `RESOLVE_BENEATH`/
`RESOLVE_NO_SYMLINKS`；Python `tempfile` 的安全临时目录；Python `subprocess` 的
timeout/kill/wait；Bazel sandbox 的 declared-input view；systemd `PrivateTmp=` 和
runtime-directory mode。详细链接与适用边界见 `FEASIBILITY_REPORT.md`。

原型先采用 portable `openat`/`dir_fd`/`O_NOFOLLOW`。生产可选用 `openat2` hardening，
但必须有经过测试的 fallback，不能因内核版本差异静默失效。

## 已证实可克服与仍需生产化

已证实可克服：symlink escape、FIFO 阻塞、普通超限输入、输出总预算、atomic
pathname replacement、ambient mode/environment 污染、0700/0600 权限、direct-child
timeout/正常清理、synthetic cross-user、legacy 输出等价和 bundle 边界隔离。

仍需生产化：完整两个 v1 schema、session attachment/opt-out ordering、是否增加
`openat2`、process-group kill、固定输入上限/timeout split、更多 truncate/append/
delete/parent replacement/permission races、parent SIGKILL stale cleanup、真实 installed
layout/Cloud identity、beta golden/latency/size，以及原子更新 manifest/installer/
inventory/Release 同时保持 Round 2 adapter 不可达。

## 最终判断与四个问题

四个 overlay fallback gate 都没有触发：继续 controlled snapshot，进入 inactive
production Round 2；现在不要扩展 multi-target overlay。

维护者仍需确认：

1. 是否接受“contained/no-symlink pathname 到达的 regular inode”这一信任声明？
   `O_NOFOLLOW` 无法排除该 inode 在项目外还有 hard-link 名称。
2. Python parent 遭 SIGKILL 后，是做有界 stale-snapshot startup cleanup，还是接受
   `0700/0600 + ephemeral Cloud container` 的残余风险？
3. Round 2 使用单一 portable `openat` walk，还是加入 optional `openat2` hardening？
4. 30 秒 Host timeout 如何冻结？初始建议：resolver 2 秒、injector 5 秒、catch-up
   15 秒，至少 5 秒留给 supervision、kill、cleanup 和 JSON。

更完整的实验限制、工业来源和生产 gap 见 `FEASIBILITY_REPORT.md`。
