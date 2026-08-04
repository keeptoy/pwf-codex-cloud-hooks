"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const adapter = path.resolve(__dirname, "../hooks/hook_adapter.py");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const harness = [
  "import importlib.util,json,pathlib,sys",
  "value=json.loads(sys.stdin.read())",
  "spec=importlib.util.spec_from_file_location('hook_adapter',value.get('adapter',sys.argv[1]))",
  "module=importlib.util.module_from_spec(spec)",
  "spec.loader.exec_module(module)",
  "op=value.get('op','catchup')",
  "result=module.invoke_owned_runtime(pathlib.Path(value['runtime']),{},timeout_seconds=value['timeout']) if op=='catchup' else (module.build_plan_context_request(value['event'],value['payload'],pathlib.Path(value['root'])) if op=='plan_request' else (module.invoke_plan_runtime(pathlib.Path(value['runtime']),value['request'],timeout_seconds=value['timeout']) if op=='plan_invoke' else (str(module.sibling_runtime_path(value['identity'])) if module.sibling_runtime_path(value['identity']) is not None else None) if op=='sibling' else module._valid_plan_context_result(value['result'],value['request'])))",
  "print(json.dumps(result,separators=(',',':')))"
].join(";");

function callHarness(value) {
  const result = spawnSync(python, ["-c", harness, adapter], {
    encoding: "utf8",
    input: JSON.stringify(value),
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function supervise(runtime, timeout = 1) {
  return callHarness({ op: "catchup", runtime, timeout });
}

function readLinuxProcStat(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = raw.lastIndexOf(")");
    const fields = raw.slice(close + 2).trim().split(/\s+/);
    return { state: fields[0], starttime: Number(fields[19]) };
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

test("runtime supervisor accepts one valid result and bounds every child failure", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-runtime-supervisor-"));
  const write = (name, source) => {
    const target = path.join(directory, name);
    fs.writeFileSync(target, source);
    return target;
  };
  try {
    const validResult = {
      schema_version: 1,
      outcome: "no_plan",
      inject: false,
      report: null,
      warnings: [],
      diagnostic: {
        event_name: "SessionStart",
        session_id_present: true,
        planning_enabled: true,
        session_attachment: "legacy",
        selected_transcript: "none",
        selected_transcript_path: null,
        selected_plan_scope: "none",
        selected_plan_dir: null,
      },
    };
    const serialized = JSON.stringify(validResult);
    const valid = write("valid.py", `import json\nprint(json.dumps(json.loads(${JSON.stringify(serialized)})))\n`);
    assert.deepEqual(supervise(valid), [validResult, null]);

    const timeout = write("timeout.py", "import time\ntime.sleep(2)\n");
    assert.deepEqual(supervise(timeout, 0.05), [null, "timeout"]);

    const nonzero = write("nonzero.py", "raise SystemExit(7)\n");
    assert.deepEqual(supervise(nonzero), [null, "runtime_error"]);

    const malformed = write("malformed.py", "print('not-json')\n");
    assert.deepEqual(supervise(malformed), [null, "runtime_error"]);

    const contradictoryResult = { ...validResult, inject: true, report: "unexpected" };
    const contradictorySerialized = JSON.stringify(contradictoryResult);
    const contradictory = write("contradictory.py", `import json\nprint(json.dumps(json.loads(${JSON.stringify(contradictorySerialized)})))\n`);
    assert.deepEqual(supervise(contradictory), [null, "runtime_error"]);

    const unknownWarningResult = { ...validResult, warnings: ["not_in_contract"] };
    const warningSerialized = JSON.stringify(unknownWarningResult);
    const unknownWarning = write("unknown-warning.py", `import json\nprint(json.dumps(json.loads(${JSON.stringify(warningSerialized)})))\n`);
    assert.deepEqual(supervise(unknownWarning), [null, "runtime_error"]);

    const nonStringWarningResult = { ...validResult, warnings: [[]] };
    const nonStringWarningSerialized = JSON.stringify(nonStringWarningResult);
    const nonStringWarning = write("non-string-warning.py", `import json\nprint(json.dumps(json.loads(${JSON.stringify(nonStringWarningSerialized)})))\n`);
    assert.deepEqual(supervise(nonStringWarning), [null, "runtime_error"]);

    const invalidUtf8 = write("invalid-utf8.py", "import sys\nsys.stdout.buffer.write(bytes([255]))\n");
    assert.deepEqual(supervise(invalidUtf8), [null, "runtime_error"]);

    const oversized = write("oversized.py", "import sys,time\nsys.stdout.write('x' * 100001)\nsys.stdout.flush()\ntime.sleep(30)\n");
    assert.deepEqual(supervise(oversized), [null, "runtime_error"]);

    const oversizedStderr = write(
      "oversized-stderr.py",
      `import json,sys,time\nsys.stderr.write('x' * 100001)\nsys.stderr.flush()\nprint(json.dumps(json.loads(${JSON.stringify(serialized)})))\ntime.sleep(30)\n`,
    );
    assert.deepEqual(supervise(oversizedStderr), [null, "runtime_error"]);

    assert.deepEqual(supervise(path.join(directory, "missing.py")), [null, "runtime_error"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("plan request/result seam is exact and relational across R4-B activation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-plan-seam-"));
  try {
    const request = callHarness({
      op: "plan_request",
      event: "UserPromptSubmit",
      payload: { session_id: "session-plan-seam", turn_id: "turn-plan-seam" },
      root,
    });
    assert.deepEqual(Object.keys(request).sort(), ["event", "output_budget", "policy", "project", "runtime", "schema_version"]);
    assert.deepEqual(request.event, {
      name: "UserPromptSubmit",
      source: null,
      session_id: "session-plan-seam",
      turn_id: "turn-plan-seam",
    });
    assert.deepEqual(request.project, { root, plan_id: null });
    assert.deepEqual(request.policy, { planning_enabled: true, behavior_profile: "managed_legacy" });

    const nullableTurnRequest = callHarness({
      op: "plan_request",
      event: "UserPromptSubmit",
      payload: { session_id: null },
      root,
    });
    assert.equal(nullableTurnRequest.event.turn_id, null);
    assert.equal(callHarness({
      op: "plan_request",
      event: "UserPromptSubmit",
      payload: { session_id: null, turn_id: "bad\u0000turn" },
      root,
    }), null);

    const sessionRequest = callHarness({
      op: "plan_request",
      event: "SessionStart",
      payload: { source: "resume", session_id: "session-plan-seam", turn_id: "ignored" },
      root,
    });
    assert.deepEqual(sessionRequest.event, {
      name: "SessionStart",
      source: "resume",
      session_id: "session-plan-seam",
      turn_id: null,
    });

    const plan = path.join(root, ".planning", "active");
    const result = {
      schema_version: 1,
      outcome: "context_emitted",
      inject: true,
      context: "OWNED_PLAN_CONTEXT",
      project: {
        root,
        planning_enabled: true,
        session_attachment: "legacy",
        plan_state: "resolved",
        plan_scope: "scoped",
        plan_dir: plan,
      },
      warnings: [],
      diagnostic: {
        event_name: "UserPromptSubmit",
        plan_id_state: "absent",
        selected_plan_scope: "scoped",
        selected_plan_dir: plan,
      },
    };
    assert.equal(callHarness({ op: "plan_validate", request, result }), true);
    const runtime = path.join(root, "valid-plan.py");
    fs.writeFileSync(runtime, `import json\nprint(json.dumps(json.loads(${JSON.stringify(JSON.stringify(result))})))\n`);
    assert.deepEqual(callHarness({ op: "plan_invoke", runtime, request, timeout: 1 }), [result, null]);
    assert.equal(callHarness({
      op: "plan_validate",
      request,
      result: { ...result, diagnostic: { ...result.diagnostic, event_name: "SessionStart" } },
    }), false);
    assert.equal(callHarness({
      op: "plan_validate",
      request,
      result: { ...result, project: { ...result.project, plan_dir: path.resolve(root, "..", "outside") } },
    }), false);
    assert.equal(callHarness({
      op: "plan_validate",
      request,
      result: { ...result, inject: false },
    }), false);
    assert.equal(callHarness({
      op: "plan_validate",
      request,
      result: { ...result, diagnostic: { ...result.diagnostic, plan_id_state: "accepted" } },
    }), false);
    const requestedPlan = {
      ...request,
      project: { ...request.project, plan_id: "missing-plan" },
    };
    const rejectedPlan = {
      ...result,
      warnings: ["plan_id_rejected"],
      diagnostic: { ...result.diagnostic, plan_id_state: "rejected" },
    };
    assert.equal(callHarness({ op: "plan_validate", request: requestedPlan, result: rejectedPlan }), true);
    assert.equal(callHarness({
      op: "plan_validate",
      request: requestedPlan,
      result: { ...rejectedPlan, warnings: [] },
    }), false);
    assert.equal(callHarness({
      op: "plan_validate",
      request,
      result: {
        ...result,
        outcome: "session_not_attached",
        inject: false,
        context: null,
        project: { ...result.project, session_attachment: "legacy" },
      },
    }), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("R4-A sibling identities accept only regular non-symlink adapter siblings", () => {
  const managed = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-sibling-runtime-"));
  const copiedAdapter = path.join(managed, "hook_adapter.py");
  const catchup = path.join(managed, "owned-catchup.py");
  const plan = path.join(managed, "owned-plan.py");
  try {
    fs.copyFileSync(adapter, copiedAdapter);
    fs.writeFileSync(catchup, "# regular catch-up\n");
    fs.writeFileSync(plan, "# regular plan\n");
    assert.equal(path.resolve(callHarness({ op: "sibling", adapter: copiedAdapter, identity: "catchup" })), path.resolve(catchup));
    assert.equal(path.resolve(callHarness({ op: "sibling", adapter: copiedAdapter, identity: "plan" })), path.resolve(plan));
    assert.equal(callHarness({ op: "sibling", adapter: copiedAdapter, identity: "unknown" }), null);

    fs.rmSync(plan);
    fs.mkdirSync(plan);
    assert.equal(callHarness({ op: "sibling", adapter: copiedAdapter, identity: "plan" }), null);

    if (process.platform !== "win32") {
      fs.rmSync(plan, { recursive: true });
      const outside = path.join(managed, "outside.py");
      fs.writeFileSync(outside, "# symlink target\n");
      fs.symlinkSync(outside, plan);
      assert.equal(callHarness({ op: "sibling", adapter: copiedAdapter, identity: "plan" }), null);
    }
  } finally {
    fs.rmSync(managed, { recursive: true, force: true });
  }
});

test("POSIX timeout terminates the runtime process group", { skip: process.platform !== "linux" }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-adapter-pgrp-"));
  const pidFile = path.join(directory, "descendant.json");
  const runtime = path.join(directory, "process-group.py");
  fs.writeFileSync(runtime, [
    "import json,os,subprocess,sys,time",
    "child=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)'])",
    "raw=open(f'/proc/{child.pid}/stat',encoding='utf-8').read()",
    "fields=raw[raw.rfind(')')+2:].split()",
    `open(${JSON.stringify(pidFile)},'w',encoding='utf-8').write(json.dumps({'pid':child.pid,'starttime':int(fields[19])}))`,
    "time.sleep(30)",
  ].join("\n"));
  try {
    assert.deepEqual(supervise(runtime, 0.5), [null, "timeout"]);
    const identity = JSON.parse(fs.readFileSync(pidFile, "utf8"));
    let executable = true;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const current = readLinuxProcStat(identity.pid);
      executable = Boolean(
        current
        && current.starttime === identity.starttime
        && !["Z", "X", "x"].includes(current.state),
      );
      if (!executable) break;
      sleep(50);
    }
    assert.equal(executable, false, "runtime descendant remained executable after timeout");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
