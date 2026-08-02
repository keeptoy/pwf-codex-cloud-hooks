"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, test } = require("node:test");

const root = path.resolve(__dirname, "..");
const runtime = path.join(root, "runtime", "owned-catchup.py");
const transcriptFixture = path.join(root, "tests", "fixtures", "cloud", "session-catchup-v0.2.2.jsonl");
const observations = JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", "cloud", "hook-observations-v1.json"), "utf8"));
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const budget = {
  max_report_chars: 20000,
  max_messages: 15,
  max_tools_per_message: 4,
  assistant_chars: 300,
  user_untruncated_chars: 1000,
  user_head_chars: 350,
  user_tail_chars: 650,
  truncation_marker: "...[truncated]...",
};

after(() => {
  assert.equal(fs.existsSync(path.join(root, "runtime", "__pycache__")), false, "owned runtime created bytecode cache");
  assert.equal(fs.existsSync(path.join(root, "runtime", "upstream", "__pycache__")), false, "upstream runtime created bytecode cache");
});

function request(overrides = {}) {
  const value = {
    schema_version: 1,
    runtime: "codex",
    event: { name: "SessionStart", source: "resume", session_id: observations.session.session_id, turn_id: null },
    project: { root: "/workspace/project", planning_enabled: true, session_attachment: "legacy", plan_state: "resolved", plan_scope: "scoped", plan_dir: "/workspace/project/.planning/cloud-fixture" },
    transcript: { host_path_state: "absent", host_path: null, session_store_roots: [], allow_scan_fallback: false },
    output_budget: budget,
  };
  return { ...value, ...overrides };
}

function runCli(value, raw = null, args = []) {
  const result = spawnSync(python, [runtime, ...args], {
    encoding: "utf8",
    input: raw === null ? JSON.stringify(value) : raw,
  });
  return { ...result, json: JSON.parse(result.stdout) };
}

const nativeHarness = [
  "import importlib.util,json,sys",
  "spec=importlib.util.spec_from_file_location('owned_catchup',sys.argv[1])",
  "module=importlib.util.module_from_spec(spec)",
  "spec.loader.exec_module(module)",
  "value=json.loads(sys.stdin.read())",
  "print(json.dumps(module.run_request(value,require_posix=False),separators=(',',':')))"
].join(";");

const shortCircuitHarness = [
  "import importlib.util,json,sys",
  "spec=importlib.util.spec_from_file_location('owned_catchup',sys.argv[1])",
  "module=importlib.util.module_from_spec(spec)",
  "spec.loader.exec_module(module)",
  "module._load_upstream=lambda: (_ for _ in ()).throw(RuntimeError('upstream parser was loaded'))",
  "value=json.loads(sys.stdin.read())",
  "print(json.dumps(module.run_request(value,require_posix=True),separators=(',',':')))"
].join(";");

const nativeDiagnosticHarness = [
  "import importlib.util,json,sys",
  "spec=importlib.util.spec_from_file_location('owned_catchup',sys.argv[1])",
  "module=importlib.util.module_from_spec(spec)",
  "spec.loader.exec_module(module)",
  "value=json.loads(sys.stdin.read())",
  "result=module.run_request(value,require_posix=False)",
  "print(json.dumps(module.diagnostic_result(result),separators=(',',':')))"
].join(";");

function runNative(value) {
  const result = spawnSync(python, ["-c", nativeHarness, runtime], {
    encoding: "utf8",
    input: JSON.stringify(value),
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  return { ...result, json: JSON.parse(result.stdout) };
}

function runWithoutUpstream(value) {
  const result = spawnSync(python, ["-c", shortCircuitHarness, runtime], {
    encoding: "utf8",
    input: JSON.stringify(value),
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  return { ...result, json: JSON.parse(result.stdout) };
}

function runNativeDiagnostic(value) {
  const result = spawnSync(python, ["-c", nativeDiagnosticHarness, runtime], {
    encoding: "utf8",
    input: JSON.stringify(value),
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  return { ...result, json: JSON.parse(result.stdout) };
}

function nativeFixture() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-owned-runtime-"));
  const project = path.join(workspace, "project");
  const plan = path.join(project, ".planning", "cloud-fixture");
  const store = path.join(workspace, "codex", "sessions");
  const sessionDirectory = path.join(store, "2026", "08", "02");
  const session = path.join(sessionDirectory, "rollout-owned-fixture.jsonl");
  fs.mkdirSync(plan, { recursive: true });
  fs.writeFileSync(path.join(plan, "task_plan.md"), "# Task Plan: Cloud Fixture\n");
  fs.mkdirSync(sessionDirectory, { recursive: true });
  const escapedProject = JSON.stringify(project).slice(1, -1);
  fs.writeFileSync(session, fs.readFileSync(transcriptFixture, "utf8").replaceAll("{{PROJECT_ROOT}}", escapedProject));
  const value = {
    schema_version: 1,
    runtime: "codex",
    event: { name: "SessionStart", source: "resume", session_id: observations.session.session_id, turn_id: null },
    project: { root: project, planning_enabled: true, session_attachment: "legacy", plan_state: "resolved", plan_scope: "scoped", plan_dir: plan },
    transcript: { host_path_state: "validated", host_path: session, session_store_roots: [store], allow_scan_fallback: false },
    output_budget: budget,
  };
  return { workspace, project, plan, store, session, value };
}

test("owned runtime emits a strict non-injecting result for no plan and malformed input", () => {
  let result = runCli(request({ project: { root: "/workspace/project", planning_enabled: true, session_attachment: "legacy", plan_state: "none", plan_scope: "none", plan_dir: null } }));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.json, {
    schema_version: 1,
    outcome: "no_plan",
    inject: false,
    report: null,
    warnings: [],
    diagnostic: {
      event_name: "SessionStart", session_id_present: true, planning_enabled: true,
      session_attachment: "legacy", selected_transcript: "none", selected_transcript_path: null,
      selected_plan_scope: "none", selected_plan_dir: null,
    },
  });

  result = runCli(null, "{not-json");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.outcome, "invalid_request");
  assert.equal(result.json.inject, false);
  assert.equal(result.json.report, null);

  const extra = request();
  extra.unexpected = true;
  result = runCli(extra);
  assert.equal(result.json.outcome, "invalid_request");
});

test("owned runtime requires an allowed root for a validated Host transcript", () => {
  const value = request({
    transcript: { host_path_state: "validated", host_path: "/opt/codex/sessions/rollout-test.jsonl", session_store_roots: [], allow_scan_fallback: false },
  });
  const result = runCli(value);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.outcome, "invalid_request");
  assert.equal(result.json.diagnostic.selected_transcript, "none");
});

test("owned runtime distinguishes explicit opt-out from an unattached session", () => {
  let result = runWithoutUpstream(request({
    project: { root: "/workspace/project", planning_enabled: false, session_attachment: "legacy", plan_state: "none", plan_scope: "none", plan_dir: null },
  }));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.outcome, "planning_disabled");
  assert.equal(result.json.diagnostic.planning_enabled, false);
  assert.equal(result.json.diagnostic.session_attachment, "legacy");

  result = runWithoutUpstream(request({
    project: { root: "/workspace/project", planning_enabled: true, session_attachment: "detached", plan_state: "none", plan_scope: "none", plan_dir: null },
  }));
  assert.equal(result.json.outcome, "session_not_attached");
  assert.equal(result.json.diagnostic.planning_enabled, true);
  assert.equal(result.json.diagnostic.session_attachment, "detached");

  result = runCli(request({
    project: { root: "/workspace/project", planning_enabled: false, session_attachment: "legacy", plan_state: "resolved", plan_scope: "scoped", plan_dir: "/workspace/project/.planning/unsafe" },
  }));
  assert.equal(result.json.outcome, "invalid_request");
});

test("owned runtime prefers a contained Host transcript with matching session identity", () => {
  const fixture = nativeFixture();
  try {
    const result = runNative(fixture.value);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.outcome, "report_emitted");
    assert.equal(result.json.inject, true);
    assert.equal(result.json.diagnostic.selected_transcript, "host_path");
    assert.deepEqual(result.json.warnings, ["duplicate_record_suppressed", "unknown_transcript_record"]);
    assert.equal(result.json.diagnostic.selected_transcript_path, fixture.session);
    assert.equal(result.json.diagnostic.selected_plan_dir, fixture.plan);
    assert.match(result.json.report, /Runtime: codex/);
    assert.match(result.json.report, /Last planning update: task_plan\.md at message #25/);
    assert.match(result.json.report, /Unsynced messages: 7/);
    assert.match(result.json.report, /\.\.\.\[truncated\]\.\.\./);
    assert.match(result.json.report, /PWF_CATCHUP_UNSYNCED_SENTINEL_82C4/);
    assert.ok(result.json.report.length <= budget.max_report_chars);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("owned runtime uses only explicit fallback roots after a rejected Host path", () => {
  const fixture = nativeFixture();
  try {
    fixture.value.transcript = { host_path_state: "rejected", host_path: null, session_store_roots: [fixture.store], allow_scan_fallback: true };
    const result = runNative(fixture.value);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.outcome, "report_emitted");
    assert.equal(result.json.diagnostic.selected_transcript, "session_store_fallback");
    assert.deepEqual(result.json.warnings, [
      "transcript_path_rejected", "scan_fallback_used",
      "duplicate_record_suppressed", "unknown_transcript_record",
    ]);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("owned runtime rejects corrupt transcript records without partial injection", () => {
  const fixture = nativeFixture();
  const original = fs.readFileSync(fixture.session);
  try {
    for (const [suffix, warning] of [
      [Buffer.from([0xff, 0x0a]), "invalid_utf8_record"],
      [Buffer.from("{not-json\n"), "invalid_json_record"],
      [Buffer.from("[]\n"), "invalid_json_record"],
      [Buffer.from('{"type":[]}\n'), "invalid_json_record"],
      [Buffer.concat([Buffer.alloc(1_000_001, 0x78), Buffer.from("\n")]), "record_too_large"],
    ]) {
      fs.writeFileSync(fixture.session, Buffer.concat([original, suffix]));
      const result = runNative(fixture.value);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.json.outcome, "malformed_transcript");
      assert.equal(result.json.inject, false);
      assert.equal(result.json.report, null);
      assert.ok(result.json.warnings.includes(warning));
    }

    fs.rmSync(fixture.session);
    const missing = runNative(fixture.value);
    assert.equal(missing.json.outcome, "transcript_path_rejected");
    assert.equal(missing.json.inject, false);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("owned runtime diagnoses unknown records and falls back to event-only conversation", () => {
  const fixture = nativeFixture();
  try {
    fs.appendFileSync(fixture.session, '{"type":"future_record","payload":{"safe":true}}\n');
    let result = runNative(fixture.value);
    assert.equal(result.json.outcome, "report_emitted");
    assert.ok(result.json.warnings.includes("unknown_transcript_record"));
    assert.doesNotMatch(result.json.report, /future_record/);

    const records = [
      { type: "session_meta", payload: { id: observations.session.session_id, session_id: observations.session.session_id, cwd: fixture.project, source: "vscode" } },
      { type: "event_msg", payload: { type: "patch_apply_end", success: true, changes: { "task_plan.md": null } } },
      { type: "event_msg", payload: { type: "user_message", message: "EVENT_ONLY_USER_MESSAGE_12345" } },
      { type: "event_msg", payload: { type: "agent_message", message: "EVENT_ONLY_ASSISTANT" } },
    ];
    fs.writeFileSync(fixture.session, records.map(item => JSON.stringify(item)).join("\n") + "\n");
    result = runNative(fixture.value);
    assert.equal(result.json.outcome, "report_emitted");
    assert.match(result.json.report, /USER: EVENT_ONLY_USER_MESSAGE_12345/);
    assert.match(result.json.report, /CODEX: EVENT_ONLY_ASSISTANT/);
    assert.deepEqual(result.json.warnings, []);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("owned runtime distinguishes planning/update/output-budget skip reasons", () => {
  const fixture = nativeFixture();
  const meta = { type: "session_meta", payload: { id: observations.session.session_id, session_id: observations.session.session_id, cwd: fixture.project, source: "vscode" } };
  const patch = { type: "event_msg", payload: { type: "patch_apply_end", success: true, changes: { "task_plan.md": null } } };
  try {
    fs.writeFileSync(fixture.session, JSON.stringify(meta) + "\n");
    let result = runNative(fixture.value);
    assert.equal(result.json.outcome, "no_planning_update");
    assert.equal(result.json.inject, false);

    fs.writeFileSync(fixture.session, [meta, patch].map(item => JSON.stringify(item)).join("\n") + "\n");
    result = runNative(fixture.value);
    assert.equal(result.json.outcome, "no_unsynced_context");
    assert.equal(result.json.inject, false);

    const oversizedTool = { type: "response_item", payload: { type: "custom_tool_call", name: "X".repeat(21_000), arguments: "{}" } };
    fs.writeFileSync(fixture.session, [meta, patch, oversizedTool].map(item => JSON.stringify(item)).join("\n") + "\n");
    result = runNative(fixture.value);
    assert.equal(result.json.outcome, "output_budget_exceeded");
    assert.equal(result.json.inject, false);
    assert.equal(result.json.report, null);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("diagnostic mode reports selection without transcript content", () => {
  const fixture = nativeFixture();
  try {
    const result = runNativeDiagnostic(fixture.value);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.outcome, "diagnostic_report_available");
    assert.equal(result.json.inject, false);
    assert.equal(result.json.report, null);
    assert.equal(result.json.diagnostic.selected_transcript_path, fixture.session);
    assert.equal(result.json.diagnostic.selected_plan_dir, fixture.plan);
    assert.equal(JSON.stringify(result.json).includes("PWF_CATCHUP_UNSYNCED_SENTINEL_82C4"), false);

    const invalidArgs = runCli(request(), null, ["--not-a-command"]);
    assert.equal(invalidArgs.json.outcome, "invalid_request");
    const diagnosticCli = runCli(request({
      project: { root: "/workspace/project", planning_enabled: false, session_attachment: "legacy", plan_state: "none", plan_scope: "none", plan_dir: null },
    }), null, ["--diagnostic"]);
    assert.equal(diagnosticCli.json.outcome, "planning_disabled");
    assert.equal(diagnosticCli.json.inject, false);
    assert.equal(diagnosticCli.json.report, null);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("owned runtime rejects identity mismatch and paths outside allowed roots", () => {
  const fixture = nativeFixture();
  try {
    fixture.value.event.session_id = "different-session-id";
    let result = runNative(fixture.value);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.outcome, "session_identity_mismatch");
    assert.equal(result.json.inject, false);

    fixture.value.event.session_id = observations.session.session_id;
    fixture.value.transcript.session_store_roots = [path.join(fixture.workspace, "allowed-empty")];
    fs.mkdirSync(fixture.value.transcript.session_store_roots[0]);
    result = runNative(fixture.value);
    assert.equal(result.json.outcome, "transcript_path_rejected");
    assert.equal(result.json.inject, false);
    assert.deepEqual(result.json.warnings, ["transcript_path_rejected"]);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});
