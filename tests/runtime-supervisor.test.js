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
  "spec=importlib.util.spec_from_file_location('hook_adapter',sys.argv[1])",
  "module=importlib.util.module_from_spec(spec)",
  "spec.loader.exec_module(module)",
  "value=json.loads(sys.stdin.read())",
  "result=module.invoke_owned_runtime(pathlib.Path(value['runtime']),{},timeout_seconds=value['timeout'])",
  "print(json.dumps(result,separators=(',',':')))"
].join(";");

function supervise(runtime, timeout = 1) {
  const result = spawnSync(python, ["-c", harness, adapter], {
    encoding: "utf8",
    input: JSON.stringify({ runtime, timeout }),
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
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

    const oversized = write("oversized.py", "print('x' * 100001)\n");
    assert.deepEqual(supervise(oversized), [null, "runtime_error"]);

    assert.deepEqual(supervise(path.join(directory, "missing.py")), [null, "runtime_error"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
