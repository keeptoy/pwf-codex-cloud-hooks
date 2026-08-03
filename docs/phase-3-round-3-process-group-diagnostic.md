# Phase 3 Round 3 Process-group Cloud Diagnostic

> Status: complete — Cloud classified the descendant as `TERMINATED_UNREAPED`
>
> Scope: read-only diagnosis of the existing `run_child()` / `_kill_process_group()` path
>
> Product boundary: TEST_ONLY; production runtime changes are not supported by the evidence

## Why this diagnostic exists

The first Linux/Cloud run executed all 63 tests and failed only this assertion:

```text
injector descendant survived process-group timeout
```

The runtime had already returned `timeout` and removed its snapshot. The test then polled
`kill -0 <pid>` for one second. On Linux, `kill -0` proves that a PID still exists, but it
does not distinguish a running process from a terminated zombie waiting for its parent or
container PID 1 to reap it. Do not weaken the assertion or expand the supervisor until the
Cloud process state is observed directly.

## Observed Cloud result

The exact diagnostic ran on Linux 6.12.13 with Python 3.14.4. Cloud PID 1 was
`tail -f /dev/null`. The descendant belonged to the killed group/session, changed from live
state `S` to zombie state `Z`, retained the same `/proc` start time, was reparented to PID 1,
and had zero file descriptors throughout 31 samples over three seconds. The direct shell was
already gone and the supervisor outcome was `timeout`.

Final classification: `TERMINATED_UNREAPED`; live executable descendant: no; production
supervisor defect: no; test liveness assertion defect: yes. The authorized correction is to
replace PID-existence polling with `/proc` identity/state checks in test 37 only.

## Classification contract

- `GONE`: the original descendant PID no longer exists. The existing assertion should have
  passed; investigate timing or PID capture.
- `TERMINATED_UNREAPED`: the same process identity remains only in state `Z`, `X`, or `x`.
  It cannot execute or retain open file descriptors. Treat `kill -0` as an unsuitable liveness
  assertion; retain proof that the child originally joined the killed process group.
- `LIVE_SAME_PROCESS`: the same start time remains in a live state such as `S`, `R`, or `D`.
  This is a supervisor defect or an unexpected process-group topology; do not change only the
  test.
- `PID_REUSED`: the PID exists with a different `/proc` start time. The original process is
  gone, and PID-only polling is racy.
- `INCONCLUSIVE`: required fields could not be captured. Improve the probe; do not infer a fix.

## Cloud prompt

Run this against the exact commit that produced the 62/63 result. Do not edit production or
test files and do not install anything into `/opt/codex`.

```text
这是 Phase 3 Round 3 test 37 的只读进程组诊断。

严格限制：
1. 不要修改 runtime、tests、contracts、manifest、installer 或 planning 文件；
2. 不要安装到 /opt/codex；
3. 不要先提出修复，也不要仅凭 kill -0 判断进程存活；
4. 执行 docs/phase-3-round-3-process-group-diagnostic.md 中“唯一诊断脚本”的
   完整 Bash 代码块；
5. 返回完整 stdout，然后生成一份 Markdown 交割内容，必须包含：环境、GROUP_MEMBERSHIP、
   SUPERVISOR_OUTCOME、CLASSIFICATION、before/after 的 state/ppid/pgrp/session/starttime、
   fd_count、是否属于生产缺陷、最小修改边界；
6. 不实施修改，不创建 commit 或 PR。

严格汇总：
Supervisor timeout: OBSERVED 或 NOT_OBSERVED
Group membership: PASS 或 FAIL
Descendant classification: 实际分类
Same process identity: YES、NO 或 INCONCLUSIVE
Live executable descendant after timeout: YES、NO 或 INCONCLUSIVE
Production supervisor defect: YES、NO 或 INCONCLUSIVE
Test liveness assertion defect: YES、NO 或 INCONCLUSIVE
Recommended next boundary: TEST_ONLY、RUNTIME_AND_TEST 或 MORE_DIAGNOSTICS
Workspace clean: YES 或 NO
```

## 唯一诊断脚本

```bash
set -Eeuo pipefail

REPO_ROOT="$(pwd -P)"
PROBE_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$PROBE_ROOT"' EXIT

printf 'PROBE_VERSION=PWF_PHASE3_R3_PROCESS_GROUP_DIAGNOSTIC_V1\n'
printf 'REPO_ROOT=%s\n' "$REPO_ROOT"
printf 'KERNEL=%s\n' "$(uname -srmo)"
printf 'PYTHON=%s\n' "$(python3 --version 2>&1)"
printf 'PID1_BEGIN\n'
ps -o pid=,ppid=,pgid=,sid=,stat=,comm=,args= -p 1 || true
printf 'PID1_END\n'

cat > "$PROBE_ROOT/worker.sh" <<'SH'
#!/bin/sh
sleep 10 &
child=$!
printf '%s %s\n' "$$" "$child" > "$1"
IFS= read -r child_stat < "/proc/$child/stat"
printf '%s\n' "$child_stat" > "$2"
wait
SH
chmod 0700 "$PROBE_ROOT/worker.sh"

python3 - "$REPO_ROOT" "$PROBE_ROOT" <<'PY'
import importlib.util
import json
import os
from pathlib import Path
import signal
import sys
import time

repo = Path(sys.argv[1])
probe = Path(sys.argv[2])
runtime = repo / "runtime/owned-plan.py"
worker = probe / "worker.sh"
meta_path = probe / "worker.meta"
before_path = probe / "child.before.stat"

spec = importlib.util.spec_from_file_location("owned_plan_diagnostic", runtime)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


def parse_stat(raw):
    if raw is None:
        return None
    close = raw.rfind(")")
    if close < 0:
        return {"parse_error": True, "raw_length": len(raw)}
    pid_text = raw[: raw.find(" ")]
    fields = raw[close + 2 :].split()
    if len(fields) < 20:
        return {"parse_error": True, "raw_length": len(raw)}
    return {
        "pid": int(pid_text),
        "state": fields[0],
        "ppid": int(fields[1]),
        "pgrp": int(fields[2]),
        "session": int(fields[3]),
        "starttime": int(fields[19]),
    }


def read_stat(pid):
    try:
        return parse_stat(Path(f"/proc/{pid}/stat").read_text(encoding="utf-8"))
    except (FileNotFoundError, ProcessLookupError):
        return None
    except OSError as exc:
        return {"read_error": type(exc).__name__, "errno": exc.errno}


def fd_count(pid):
    try:
        return len(list(Path(f"/proc/{pid}/fd").iterdir()))
    except (FileNotFoundError, ProcessLookupError):
        return None
    except OSError as exc:
        return f"{type(exc).__name__}:{exc.errno}"


trace = {}
original_kill = module._kill_process_group


def traced_kill(process):
    trace["kill_target_pgid"] = process.pid
    trace["shell_before_signal"] = read_stat(process.pid)
    try:
        shell_pid, child_pid = [int(value) for value in meta_path.read_text().split()]
    except (OSError, ValueError):
        shell_pid = process.pid
        child_pid = None
    trace["shell_pid_from_worker"] = shell_pid
    trace["child_pid"] = child_pid
    trace["child_before_signal"] = read_stat(child_pid) if child_pid else None
    original_kill(process)
    trace["shell_after_direct_wait"] = read_stat(process.pid)
    trace["child_after_direct_wait"] = read_stat(child_pid) if child_pid else None
    trace["child_fd_count_after_direct_wait"] = fd_count(child_pid) if child_pid else None


module._kill_process_group = traced_kill
outcome = None
try:
    module.run_child(
        ["/bin/sh", str(worker), str(meta_path), str(before_path)],
        cwd=probe,
        env=module.minimal_env(temp_root=str(probe)),
        deadline=time.monotonic() + 0.5,
    )
    outcome = "unexpected_success"
except module.PlanFailure as failure:
    outcome = failure.outcome

shell_pid, child_pid = [int(value) for value in meta_path.read_text().split()]
child_before = parse_stat(before_path.read_text(encoding="utf-8"))
samples = []
for index in range(31):
    current = read_stat(child_pid)
    samples.append({
        "elapsed_ms": index * 100,
        "stat": current,
        "fd_count": fd_count(child_pid),
    })
    if current is None:
        break
    time.sleep(0.1)

existing = [sample["stat"] for sample in samples if sample["stat"] is not None]
final = existing[-1] if existing else None
saw_zombie = any(
    isinstance(item, dict) and item.get("state") in {"Z", "X", "x"}
    for item in existing
)
same_identity = bool(
    isinstance(final, dict)
    and final.get("starttime") == child_before.get("starttime")
)
if final is None:
    classification = "GONE"
elif not same_identity:
    classification = "PID_REUSED"
elif final.get("state") in {"Z", "X", "x"}:
    classification = "TERMINATED_UNREAPED"
elif final.get("state") in {"R", "S", "D", "T", "t", "I", "W", "P"}:
    classification = "LIVE_SAME_PROCESS"
else:
    classification = "INCONCLUSIVE"

group_membership = (
    child_before.get("pgrp") == shell_pid
    and child_before.get("session") == shell_pid
)

result = {
    "supervisor_outcome": outcome,
    "shell_pid": shell_pid,
    "child_pid": child_pid,
    "child_before": child_before,
    "group_membership": group_membership,
    "trace": trace,
    "samples": samples,
    "saw_zombie": saw_zombie,
    "same_identity_at_final_sample": same_identity if final is not None else None,
    "classification": classification,
}
print(json.dumps(result, sort_keys=True))
print(f"SUPERVISOR_OUTCOME={outcome}")
print(f"GROUP_MEMBERSHIP={'PASS' if group_membership else 'FAIL'}")
print(f"CLASSIFICATION={classification}")

if classification == "LIVE_SAME_PROCESS" and same_identity:
    try:
        os.killpg(shell_pid, signal.SIGKILL)
    except ProcessLookupError:
        pass

if outcome != "timeout" or not group_membership:
    raise SystemExit(2)
PY

test -z "$(git status --short)"
printf 'WORKSPACE_CLEAN=YES\n'
```

## Modification boundary after evidence

- `TERMINATED_UNREAPED`, correct group membership, same start time, and zero descendant
  file descriptors: change only the Linux regression to use `/proc` identity/state semantics;
  keep production `SIGKILL` process-group behavior unchanged.
- `LIVE_SAME_PROCESS`: inspect the observed PGID/SID and repair the supervisor plus its test.
- `PID_REUSED`: change the test to compare start time as well as PID; production behavior is not
  implicated by PID reuse alone.
- Any other result: collect more evidence. Do not add Linux-only subreaper behavior, double-fork
  machinery, or broader privileges without a separate architecture decision.
