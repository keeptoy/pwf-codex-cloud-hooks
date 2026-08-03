"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

process.env.PYTHONDONTWRITEBYTECODE = "1";

const BUNDLE = path.resolve(__dirname, "..");
const PROTOTYPE = path.join(BUNDLE, "prototype_snapshot_runner.py");

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-snapshot-prototype-"));
  const plan = path.join(root, ".planning", "dialogue");
  fs.mkdirSync(plan, { recursive: true });
  fs.writeFileSync(path.join(root, ".planning", ".active_plan"), "dialogue\n");
  fs.writeFileSync(path.join(plan, "task_plan.md"), "# User dialogue plan\n\n## Goal\nKeep the tail visible.\n");
  fs.writeFileSync(path.join(plan, "progress.md"), "2026-08-02T17:00:00Z user prompt received\n");
  const temporary = path.join(root, "private-tmp");
  fs.mkdirSync(temporary, { mode: 0o700 });
  return { root, plan, temporary };
}

function run(root, temporary, env = {}) {
  const result = spawnSync("python3", [PROTOTYPE, root], {
    cwd: BUNDLE,
    env: { ...process.env, TMPDIR: temporary, ...env },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("prototype emits pristine legacy context from a private scoped-plan snapshot", {
  skip: process.platform !== "linux",
}, () => {
  const fixture = project();
  try {
    fs.writeFileSync(path.join(fixture.plan, ".mode"), "autonomous gate inject-smart\n");
    fs.writeFileSync(path.join(fixture.plan, ".nonce"), "SHOULD_NOT_LEAK\n");
    const value = run(fixture.root, fixture.temporary, {
      PWF_INJECT: "smart",
      PLANNING_DISABLED: "1",
      PLAN_ID: "attacker-controlled",
    });
    assert.equal(value.outcome, "context_emitted");
    assert.equal(value.plan_scope, "scoped");
    assert.match(value.context, /ACTIVE PLAN/);
    assert.match(value.context, /# User dialogue plan/);
    assert.match(value.context, /recent progress/);
    assert.doesNotMatch(value.context, /phases:/);
    assert.doesNotMatch(value.context, /SHOULD_NOT_LEAK/);
    assert.deepEqual(fs.readdirSync(fixture.temporary), []);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("prototype rejects symlinked plans and non-regular progress inputs", { skip: process.platform !== "linux" }, () => {
  const fixture = project();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-snapshot-outside-"));
  try {
    fs.rmSync(path.join(fixture.plan, "task_plan.md"));
    fs.symlinkSync(path.join(outside, "secret"), path.join(fixture.plan, "task_plan.md"));
    fs.writeFileSync(path.join(outside, "secret"), "DO NOT INJECT\n");
    const symlink = run(fixture.root, fixture.temporary);
    assert.equal(symlink.inject, false);
    assert.equal(symlink.outcome, "plan_unreadable");

    fs.rmSync(path.join(fixture.plan, "task_plan.md"));
    fs.writeFileSync(path.join(fixture.plan, "task_plan.md"), "# Safe\n");
    fs.rmSync(path.join(fixture.plan, "progress.md"));
    const fifoPath = path.join(fixture.plan, "progress.md");
    const mkfifo = spawnSync("/usr/bin/mkfifo", [fifoPath]);
    assert.equal(mkfifo.status, 0, mkfifo.stderr?.toString());
    const fifo = run(fixture.root, fixture.temporary);
    assert.equal(fifo.inject, false);
    assert.equal(fifo.outcome, "plan_unreadable");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("prototype suppresses oversized input and leaves no snapshot", {
  skip: process.platform !== "linux",
}, () => {
  const fixture = project();
  try {
    fs.writeFileSync(path.join(fixture.plan, "task_plan.md"), Buffer.alloc(1_000_001, 65));
    const value = run(fixture.root, fixture.temporary);
    assert.equal(value.inject, false);
    assert.equal(value.outcome, "plan_unreadable");
    assert.deepEqual(fs.readdirSync(fixture.temporary), []);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("prototype suppresses whole context above the output budget", {
  skip: process.platform !== "linux",
}, () => {
  const fixture = project();
  try {
    const lines = Array.from({ length: 50 }, (_, index) => `${index} ${"X".repeat(500)}`).join("\n");
    fs.writeFileSync(path.join(fixture.plan, "task_plan.md"), `${lines}\n`);
    const value = run(fixture.root, fixture.temporary);
    assert.equal(value.inject, false);
    assert.equal(value.outcome, "output_budget_exceeded");
    assert.deepEqual(fs.readdirSync(fixture.temporary), []);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("safe read detects a path replacement race", { skip: process.platform !== "linux" }, () => {
  const fixture = project();
  try {
    const source = String.raw`
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location("prototype", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
root = pathlib.Path(sys.argv[2]); target = root / ".planning/dialogue/task_plan.md"
def replace():
    replacement = target.with_suffix(".replacement")
    replacement.write_text("# Replaced\n", encoding="utf-8")
    replacement.replace(target)
try:
    m.safe_read(root, pathlib.Path(".planning/dialogue/task_plan.md"), required=True, race_probe=replace)
    print(json.dumps({"outcome": "unexpected_success"}))
except m.SnapshotFailure as error:
    print(json.dumps({"outcome": error.outcome}))
`;
    const result = spawnSync("python3", ["-c", source, PROTOTYPE, fixture.root], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).outcome, "plan_state_changed");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("snapshot is 0700/0600 and injector timeout cleans it", { skip: process.platform !== "linux" }, () => {
  const fixture = project();
  const modeProbe = path.join(fixture.root, "mode-probe.sh");
  const sleeper = path.join(fixture.root, "sleep.sh");
  fs.writeFileSync(modeProbe, "#!/bin/sh\nstat -c '%a %n' . task_plan.md progress.md\n", { mode: 0o700 });
  fs.writeFileSync(sleeper, "#!/bin/sh\nsleep 5\n", { mode: 0o700 });
  const source = String.raw`
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location("prototype", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
value = m.snapshot_context(pathlib.Path(sys.argv[2]), injector=pathlib.Path(sys.argv[3]), injector_timeout=float(sys.argv[4]))
print(json.dumps(value))
`;
  try {
    const modes = spawnSync("python3", ["-c", source, PROTOTYPE, fixture.root, modeProbe, "2"], {
      env: { ...process.env, TMPDIR: fixture.temporary }, encoding: "utf8",
    });
    assert.equal(modes.status, 0, modes.stderr);
    assert.match(JSON.parse(modes.stdout).context, /^700 \.\n600 task_plan\.md\n600 progress\.md\n$/);

    const timeout = spawnSync("python3", ["-c", source, PROTOTYPE, fixture.root, sleeper, "0.1"], {
      env: { ...process.env, TMPDIR: fixture.temporary }, encoding: "utf8",
    });
    assert.equal(timeout.status, 0, timeout.stderr);
    assert.equal(JSON.parse(timeout.stdout).outcome, "timeout");
    assert.deepEqual(fs.readdirSync(fixture.temporary), []);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("synthetic Hook user can create and clean its own snapshot", {
  skip: process.platform !== "linux" || process.getuid?.() !== 0,
}, () => {
  const fixture = project();
  try {
    // Stage the bundle under the traversable fixture so this test also works
    // when the handoff itself was unpacked beneath a caller-private 0700 dir.
    const stagedBundle = path.join(fixture.root, "runner");
    fs.mkdirSync(path.join(stagedBundle, "upstream"), { recursive: true });
    fs.copyFileSync(PROTOTYPE, path.join(stagedBundle, "prototype_snapshot_runner.py"));
    for (const name of ["resolve-plan-dir.sh", "inject-plan.sh"]) {
      fs.copyFileSync(path.join(BUNDLE, "upstream", name), path.join(stagedBundle, "upstream", name));
      fs.chmodSync(path.join(stagedBundle, "upstream", name), 0o755);
    }
    fs.chmodSync(fixture.root, 0o755);
    fs.chmodSync(stagedBundle, 0o755);
    fs.chmodSync(path.join(stagedBundle, "upstream"), 0o755);
    fs.chmodSync(path.join(stagedBundle, "prototype_snapshot_runner.py"), 0o644);
    fs.chmodSync(path.join(fixture.root, ".planning"), 0o755);
    fs.chmodSync(fixture.plan, 0o755);
    fs.chmodSync(path.join(fixture.root, ".planning", ".active_plan"), 0o644);
    fs.chmodSync(path.join(fixture.plan, "task_plan.md"), 0o644);
    fs.chmodSync(path.join(fixture.plan, "progress.md"), 0o644);
    fs.chmodSync(fixture.temporary, 0o1777);
    const command = `TMPDIR=${JSON.stringify(fixture.temporary)} python3 ${JSON.stringify(path.join(stagedBundle, "prototype_snapshot_runner.py"))} ${JSON.stringify(fixture.root)}`;
    const result = spawnSync("runuser", ["-u", "nobody", "--", "/bin/sh", "-c", command], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const value = JSON.parse(result.stdout);
    assert.equal(value.outcome, "context_emitted");
    assert.deepEqual(fs.readdirSync(fixture.temporary), []);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("handoff bundle has no runtime dependency outside its directory", () => {
  const source = fs.readFileSync(PROTOTYPE, "utf8");
  assert.doesNotMatch(source, /runtime\/upstream/);
  assert.doesNotMatch(source, /\.parents\[1\]/);
  assert.equal(fs.existsSync(path.join(BUNDLE, "upstream", "resolve-plan-dir.sh")), true);
  assert.equal(fs.existsSync(path.join(BUNDLE, "upstream", "inject-plan.sh")), true);
  const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  assert.equal(sha256(path.join(BUNDLE, "upstream", "resolve-plan-dir.sh")), "38a1c5effb35f9506e2e371ccabb6be6e4f4170acc18f1811f08d634f5f0e9bd");
  assert.equal(sha256(path.join(BUNDLE, "upstream", "inject-plan.sh")), "72c7904ec9a03f994d349ac1b9b3cfe484b417e738b25c0545d9ae11a2cc0364");
  for (const name of ["README.md", "FEASIBILITY_REPORT.md", "LICENSE", "package.json"]) {
    assert.equal(fs.existsSync(path.join(BUNDLE, name)), true, name);
  }
});
