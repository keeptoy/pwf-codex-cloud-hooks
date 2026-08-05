# Controlled Snapshot Prototype 独立交接包

> **当前角色：历史 feasibility evidence。**本目录记录 Phase 3 Round 2 交接时的决策现场；
> 后续 Round 3 已把受控快照翻译为 production `runtime/owned-plan.py`，Round 4 已完成激活、
> beta.1 发布和 Cloud A～F。下文“Round 3 应当/待决”的措辞按历史原貌保留，不是当前 Next Step。

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

在非 Linux 平台，7 个实际执行 snapshot runner 的 POSIX/Linux 测试会按声明跳过，
只运行不依赖生产 OS 语义的静态 bundle-boundary 测试；不能把这种跳过当成生产
POSIX 证据。父仓库通过 `tests/snapshot-prototype-handoff.test.js` 自动纳入这 8 项，
并额外验证原型没有进入正式 runtime、Release 或 adapter dispatch。

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

原型先采用 portable `openat`/`dir_fd`/`O_NOFOLLOW`，Round 3 生产基线保持这条路线。
未来只有在具备受维护的 syscall wrapper、capability matrix 和语义等价 fallback 后，
才重新评估 optional `openat2` hardening；不能因内核版本差异静默失效。

## 已证实可克服与仍需生产化

已证实可克服：symlink escape、FIFO 阻塞、普通超限输入、输出总预算、atomic
pathname replacement、ambient mode/environment 污染、0700/0600 权限、direct-child
timeout/正常清理、synthetic cross-user、legacy 输出等价和 bundle 边界隔离。

仍需生产化：完整两个 v1 schema、session attachment/opt-out ordering、portable `openat`
的 parent/cross-file consistency、process-group kill、固定输入上限/timeout split、更多
truncate/append/delete/parent replacement/permission races、parent SIGKILL stale cleanup、
真实 installed layout/Cloud identity、beta golden/latency/size，以及原子更新 manifest/
installer/inventory/Release 同时保持 Round 3 adapter 不可达。

## 最终判断与四个问题

四个 overlay fallback gate 都没有触发：继续 controlled snapshot，进入 inactive
production Round 3；现在不要扩展 multi-target overlay。

原型交接时留下四个待决问题：

1. 是否接受“contained/no-symlink pathname 到达的 regular inode”这一信任声明？
   `O_NOFOLLOW`/`openat2` 都无法区分 hard-link 名称；更严格的选择是对读取前、读取后
   和重新打开得到的 `st_nlink != 1` 一律 fail-closed，并补 Cloud 文件系统兼容测试。
2. Python parent 遭 SIGKILL 后，是在每次 `owned-plan` 调用前做有界 stale-snapshot
   cleanup，还是接受
   `0700/0600 + ephemeral Cloud container` 的残余风险？
3. Round 3 使用单一 portable `openat` walk，还是加入 optional `openat2` hardening？
4. 30 秒 Host timeout 如何冻结？初始建议：resolver 2 秒、injector 5 秒、catch-up
   15 秒，至少 5 秒留给 supervision、kill、cleanup 和 JSON。

### Round 3 默认冻结方案

除非下面的 Cloud single-link gate 暴露不兼容，Round 3 按以下四项实现；出现不兼容时
必须回到维护者重新决策，不能静默放宽安全条件：

1. **Plan 输入采用 observed single-link 策略。** `task_plan.md` 和可选
   `progress.md` 必须是由 contained/no-symlink pathname 到达的 regular file；读取前、
   读取后和从 retained parent fd 重新打开后三次都必须观察到 `st_nlink == 1`，并把
   `st_nlink` 纳入 device/inode/size/mtime/ctime/type identity comparison。稳定的
   `st_nlink != 1` 映射为 `plan_unreadable`；检查期间 identity 变化映射为
   `plan_state_changed`。`openat2` 不作为 hard-link 证明。
2. **Parent SIGKILL 使用有界 stale cleanup。** 不依赖容器必然立即销毁，也不继承
   ambient `TMPDIR`。每个 Hook EUID 使用显式的 `/tmp/pwf-codex-cloud-hooks-<euid>`
   目录；创建或复用前验证它是当前 EUID 拥有、非 symlink、mode `0700` 的目录。
   每次 `owned-plan` 调用前只扫描精确 `pwf-snapshot-*` 子目录，只删除当前 EUID
   拥有、mode `0700`、至少 10 分钟未变化且内部只有预期 `0600` regular inputs 的
   条目；最多检查 32 项并受 500 ms 清理预算约束。未知/不安全条目只诊断、不跟随、
   不递归删除。每次调用仍创建随机私有子目录并以 `finally` 做正常清理。
3. **Round 3 只要求 portable fd-rooted `openat` walk。** 保留逐组件 directory fd、
   `O_DIRECTORY`、`O_NOFOLLOW` 和 final-file `O_NONBLOCK`；补齐 parent-directory
   identity、task/progress cross-file consistency 及 truncate/append/delete/rename/
   permission race。`openat2` 延后为可选 defense-in-depth，只有具备受维护的 syscall
   wrapper、capability matrix 和语义等价 fallback 后才重新评估；它不承担 hard-link
   策略。
4. **所有子阶段共享 monotonic deadline。** Codex Host Hook 保持 30 秒，adapter
   自身必须在第 27 秒前完成：`owned-plan` 总计最多 8 秒（resolver 2 秒、safe-read/
   snapshot/injector 共用 5 秒、cleanup/result 1 秒），SessionStart 的
   `owned-catchup` 最多 15 秒，adapter spawn/process-group termination/JSON 保留
   4 秒，最后 3 秒留给 Host 调度和强制终止波动。每次调用实际 timeout 为
   `min(component_cap, shared_deadline - now - required_cleanup_reserve)`，不能为每个
   child 重新发一份完整预算；timeout 必须有 bounded process-group kill/wait。

### Round 3 前置 Cloud single-link gate

目的不是测试 hard-link 攻击，而是确认 Codex Cloud 普通 workspace/OverlayFS 上的真实
planning 文件可以兼容上面的 `st_nlink == 1` fail-closed 策略。探针只读取文件元数据，
不读取 `task_plan.md`/`progress.md` 内容，不创建文件或 hard link，也不修改 planning
状态。应在包含正常 root 或 scoped planning 文件的全新 Cloud sandbox 中运行一次，
并在同一沙箱 resume 后再运行一次；两次都必须 PASS。缺少任一文件名时结果是
`INCONCLUSIVE`，需要换到同时存在 task/progress 的普通项目重测。

```bash
set -Eeuo pipefail

python3 - <<'PY'
import json
import os
from pathlib import Path
import platform
import stat
import subprocess
import time

PROBE_VERSION = "PWF_CLOUD_ST_NLINK_PROBE_V1"
SAMPLES = 5
INTERVAL_SECONDS = 0.10

root = Path.cwd().resolve()
targets: list[Path] = []

for name in ("task_plan.md", "progress.md"):
    candidate = root / name
    if os.path.lexists(candidate):
        targets.append(candidate)

planning = root / ".planning"
if planning.is_dir() and not planning.is_symlink():
    for directory in sorted(planning.iterdir(), key=lambda value: value.name):
        try:
            directory_info = os.lstat(directory)
        except OSError:
            continue
        if directory.name.startswith(".") or not stat.S_ISDIR(directory_info.st_mode):
            continue
        for name in ("task_plan.md", "progress.md"):
            candidate = directory / name
            if os.path.lexists(candidate):
                targets.append(candidate)

def filesystem_type(path: Path) -> str:
    try:
        return subprocess.check_output(
            ["stat", "-f", "-c", "%T", "--", str(path)],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        return "UNKNOWN"

print(f"PROBE_VERSION={PROBE_VERSION}")
print(f"KERNEL={platform.release()}")
print(f"WORKSPACE_FS={filesystem_type(root)}")
print(f"TMP_FS={filesystem_type(Path('/tmp'))}")
print(f"TARGET_COUNT={len(targets)}")

results: list[dict[str, object]] = []
seen_names: set[str] = set()

for target in targets:
    relative = os.path.relpath(target, root)
    seen_names.add(target.name)
    samples: list[dict[str, object]] = []
    error = None
    for sample_index in range(SAMPLES):
        try:
            info = os.lstat(target)
        except OSError as exc:
            error = f"{type(exc).__name__}:{exc.errno}"
            break
        samples.append({
            "dev": info.st_dev,
            "ino": info.st_ino,
            "nlink": info.st_nlink,
            "type": stat.S_IFMT(info.st_mode),
            "regular": stat.S_ISREG(info.st_mode),
            "symlink": stat.S_ISLNK(info.st_mode),
            "uid": info.st_uid,
            "gid": info.st_gid,
            "mode": format(stat.S_IMODE(info.st_mode), "04o"),
            "size": info.st_size,
            "mtime_ns": info.st_mtime_ns,
            "ctime_ns": info.st_ctime_ns,
        })
        if sample_index + 1 < SAMPLES:
            time.sleep(INTERVAL_SECONDS)

    identities = {
        (
            item["dev"], item["ino"], item["nlink"], item["type"], item["size"],
            item["mtime_ns"], item["ctime_ns"],
        )
        for item in samples
    }
    regular = len(samples) == SAMPLES and all(item["regular"] for item in samples)
    single_link = len(samples) == SAMPLES and all(item["nlink"] == 1 for item in samples)
    stable = len(samples) == SAMPLES and len(identities) == 1
    passed = error is None and regular and single_link and stable
    result = {
        "path": relative,
        "sample_count": len(samples),
        "nlinks": [item["nlink"] for item in samples],
        "regular": regular,
        "single_link": single_link,
        "identity_stable": stable,
        "uid": samples[0]["uid"] if samples else None,
        "gid": samples[0]["gid"] if samples else None,
        "mode": samples[0]["mode"] if samples else None,
        "error": error,
        "result": "PASS" if passed else "FAIL",
    }
    results.append(result)
    print(json.dumps(result, ensure_ascii=True, separators=(",", ":")))

has_both_names = {"task_plan.md", "progress.md"}.issubset(seen_names)
if any(item["result"] == "FAIL" for item in results):
    overall = "FAIL"
elif not targets or not has_both_names:
    overall = "INCONCLUSIVE"
else:
    overall = "PASS"

print(f"HAS_TASK_AND_PROGRESS={str(has_both_names).lower()}")
print(f"OVERALL={overall}")
PY
```

Cloud 模型应逐字返回完整输出，并额外汇总：

```text
Fresh sandbox: PASS / FAIL / INCONCLUSIVE
Resume same sandbox: PASS / FAIL / INCONCLUSIVE
All observed task_plan.md nlink samples are 1: YES / NO
All observed progress.md nlink samples are 1: YES / NO
All observed identities are stable: YES / NO
Round 3 single-link gate: PASS / FAIL / INCONCLUSIVE
```

只有 fresh 与 resume 都为 PASS，且两类文件的全部样本均为 1、identity 均稳定，才可
关闭该 Cloud gate。任何 `FAIL` 都暂停 single-link 策略并带回完整元数据分析；
`INCONCLUSIVE` 只表示测试前置文件不足，不能当成通过。

#### Cloud gate 当前状态

- Fresh sandbox（2026-08-03）：**PASS**。Cloud kernel `6.12.13`，workspace 与
  `/tmp` 均报告 `ext2/ext3`；两个 scoped plan 中共 4 个真实 task/progress 文件，
  每个文件 5 次采样，合计 20 次均为 regular、`st_nlink=1`、identity stable；文件
  owner 为 `root:root`、mode `0644`，`HAS_TASK_AND_PROGRESS=true`、`OVERALL=PASS`。
- Resume same sandbox（2026-08-03）：**PASS**。恢复同一个 sandbox 后首次 Shell 操作
  再次命中相同 4 个文件；每个文件 5 次采样，合计 20 次仍全部为 regular、
  `st_nlink=1`、identity stable，kernel/filesystem/owner/mode 与 Fresh 结果一致，
  `HAS_TASK_AND_PROGRESS=true`、`OVERALL=PASS`。
- 最终结论：**CLOSED / PASS**。Fresh + Resume 共 40/40 次真实 Cloud 样本满足
  single-link 策略，因此 Round 3 可以冻结 `st_nlink == 1` 的 pre-read、post-read、
  retained-parent reopen 三检查点要求；后续异常仍按 fail-closed 处理。

更完整的实验限制、工业来源和生产 gap 见 `FEASIBILITY_REPORT.md`。

## Cloud single-link 黑盒验证流程提示词

下面两段提示词用于重复执行和审计 Cloud single-link gate。Fresh 提示词在全新 Codex
Cloud sandbox 启动后使用；Resume 提示词必须在恢复同一个 sandbox 后作为第一次
Shell 操作使用。提示词本身不是测试证据，只有模型实际执行
`PWF_CLOUD_ST_NLINK_PROBE_V1` 后返回的完整 stdout 才是证据。

### Fresh sandbox 提示词

```text
这是 Phase 3 Round 3 controlled-snapshot single-link Cloud compatibility gate。

当前方案：

1. 生产 owned-plan 将只接受 contained/no-symlink pathname 下的 regular planning file；
2. task_plan.md 和 progress.md 在读取前、读取后、重新打开后三次都必须满足 st_nlink == 1；
3. openat2 不负责解决 hard-link 问题；
4. 本次测试只验证普通 Codex Cloud workspace 是否兼容 single-link 策略，不测试攻击场景。

请把本次探针作为全新 Cloud sandbox 启动后的第一个 Shell 测试执行。

严格限制：

1. 不修改、创建或删除任何 planning 文件；
2. 不创建 hard link 或 symlink；
3. 不读取 task_plan.md 或 progress.md 的正文；
4. 不根据 README 猜测结果；
5. 必须实际运行 snapshot-prototype/README.md 中
   “Round 3 前置 Cloud single-link gate”下面的完整
   PWF_CLOUD_ST_NLINK_PROBE_V1 Bash 脚本；
6. 逐字返回脚本的完整 stdout；
7. 如果不存在正常的 task_plan.md 和 progress.md，必须报告 INCONCLUSIVE，
   不要自行创建测试文件。

然后严格汇总：

Fresh sandbox: PASS / FAIL / INCONCLUSIVE
All observed task_plan.md nlink samples are 1: YES / NO
All observed progress.md nlink samples are 1: YES / NO
All observed identities are stable: YES / NO
Workspace filesystem type: 实际值
Round 3 single-link gate fresh result: PASS / FAIL / INCONCLUSIVE
```

### Resume 后提示词

```text
这是 PWF_CLOUD_ST_NLINK_PROBE_V1 的 resume 稳定性复验。

请恢复执行 Fresh 探针的同一个 Cloud sandbox，并把本次复验作为恢复后的第一次 Shell 操作。

严格限制：

1. 不修改、创建或删除任何 planning 文件；
2. 不创建 hard link 或 symlink；
3. 不读取 task_plan.md 或 progress.md 的正文；
4. 必须重新运行 snapshot-prototype/README.md 中
   “Round 3 前置 Cloud single-link gate”下面完全相同的脚本；
5. 逐字返回完整 stdout；
6. 不得使用 Fresh sandbox 的旧输出代替本次执行；
7. 如果恢复后缺少正常的 task_plan.md 或 progress.md，必须报告 INCONCLUSIVE，
   不要自行创建测试文件。

然后严格汇总：

Resume same sandbox: PASS / FAIL / INCONCLUSIVE
All observed task_plan.md nlink samples are 1: YES / NO
All observed progress.md nlink samples are 1: YES / NO
All observed identities are stable: YES / NO
Workspace filesystem type: 实际值
Round 3 single-link gate resume result: PASS / FAIL / INCONCLUSIVE
```
