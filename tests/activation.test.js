"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const sourceAdapter = path.join(root, "hooks", "hook_adapter.py");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

function fixture({ actualRuntime = false } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-activation-"));
  const codexHome = path.join(workspace, "codex");
  const managed = path.join(codexHome, "hooks", "planning-with-files");
  const project = path.join(workspace, "project");
  const plan = path.join(project, ".planning", "active");
  const sessions = path.join(codexHome, "sessions", "2026", "08", "02");
  const transcript = path.join(sessions, "rollout-owned-runtime.jsonl");
  fs.mkdirSync(managed, { recursive: true });
  fs.mkdirSync(plan, { recursive: true });
  fs.mkdirSync(sessions, { recursive: true });
  fs.copyFileSync(sourceAdapter, path.join(managed, "hook_adapter.py"));
  if (actualRuntime) {
    fs.copyFileSync(path.join(root, "runtime", "owned-catchup.py"), path.join(managed, "owned-catchup.py"));
    fs.cpSync(path.join(root, "runtime", "upstream"), path.join(managed, "upstream"), { recursive: true });
  }
  fs.writeFileSync(path.join(project, ".planning", ".active_plan"), "active\n");
  fs.writeFileSync(path.join(plan, "task_plan.md"), "# Task Plan: Owned Activation\n");
  fs.writeFileSync(path.join(plan, "progress.md"), "# Progress\n\n- activation fixture\n");
  fs.writeFileSync(path.join(plan, "findings.md"), "# Findings\n");
  return { workspace, codexHome, managed, project, plan, sessions, transcript };
}

function invoke(layout, event, payload, envOverrides = {}, identity = {}) {
  const env = {
    ...process.env,
    HOME: layout.workspace,
    USERPROFILE: layout.workspace,
    CODEX_HOME: layout.codexHome,
    ...envOverrides,
  };
  delete env.CODEX_SESSIONS_DIR;
  const result = spawnSync(
    python,
    [path.join(layout.managed, "hook_adapter.py"), event],
    { input: JSON.stringify({ cwd: layout.project, hook_event_name: event, ...payload }), encoding: "utf8", env, ...identity },
  );
  return { ...result, json: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}

test("SessionStart activates only the sibling owned runtime with an explicit Host request", () => {
  const layout = fixture();
  const capture = path.join(layout.workspace, "request.json");
  const globalMarker = path.join(layout.workspace, "global-skill-ran");
  const globalSkill = path.join(layout.workspace, ".agents", "skills", "planning-with-files", "scripts");
  const stub = [
    "import json,os,pathlib,sys",
    "request=json.load(sys.stdin)",
    "pathlib.Path(os.environ['PWF_TEST_CAPTURE']).write_text(json.dumps(request),encoding='utf-8')",
    "result={'schema_version':1,'outcome':'report_emitted','inject':True,'report':'OWNED_RUNTIME_REPORT','warnings':[],'diagnostic':{'event_name':'SessionStart','session_id_present':True,'planning_enabled':True,'session_attachment':'legacy','selected_transcript':'host_path','selected_transcript_path':request['transcript']['host_path'],'selected_plan_scope':request['project']['plan_scope'],'selected_plan_dir':request['project']['plan_dir']}}",
    "print(json.dumps(result))",
  ].join("\n");
  try {
    fs.writeFileSync(layout.transcript, "{}\n");
    fs.writeFileSync(path.join(layout.managed, "owned-catchup.py"), stub);
    fs.mkdirSync(globalSkill, { recursive: true });
    fs.writeFileSync(
      path.join(globalSkill, "session-catchup.py"),
      `import pathlib\npathlib.Path(${JSON.stringify(globalMarker)}).write_text('executed')\nprint('MUTABLE_GLOBAL_SKILL_EXECUTED')\n`,
    );

    let result = invoke(layout, "SessionStart", {
      source: "resume",
      session_id: "session-owned-1",
      transcript_path: layout.transcript,
    }, { PWF_TEST_CAPTURE: capture });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.json.hookSpecificOutput.additionalContext, /OWNED_RUNTIME_REPORT/);
    assert.match(result.json.hookSpecificOutput.additionalContext, /Task Plan: Owned Activation/);
    assert.doesNotMatch(result.json.hookSpecificOutput.additionalContext, /MUTABLE_GLOBAL_SKILL_EXECUTED/);
    assert.equal(fs.existsSync(globalMarker), false);

    const request = JSON.parse(fs.readFileSync(capture, "utf8"));
    assert.equal(request.schema_version, 1);
    assert.equal(request.runtime, "codex");
    assert.deepEqual(request.event, { name: "SessionStart", source: "resume", session_id: "session-owned-1", turn_id: null });
    assert.equal(request.project.plan_state, "resolved");
    assert.equal(request.transcript.host_path_state, "validated");
    assert.equal(path.resolve(request.transcript.host_path), path.resolve(layout.transcript));
    assert.deepEqual(request.transcript.session_store_roots.map(value => path.resolve(value)), [path.resolve(layout.codexHome, "sessions")]);

    fs.rmSync(capture);
    result = invoke(layout, "UserPromptSubmit", { session_id: "session-owned-1", turn_id: "turn-1" }, { PWF_TEST_CAPTURE: capture });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.json.hookSpecificOutput.additionalContext, /Task Plan: Owned Activation/);
    assert.equal(fs.existsSync(capture), false, "UserPromptSubmit must remain local until Phase 3");
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("owned runtime process failure is advisory and cannot suppress canary or plan context", () => {
  const layout = fixture();
  try {
    fs.writeFileSync(path.join(layout.managed, "owned-catchup.py"), "raise SystemExit(9)\n");
    fs.writeFileSync(layout.transcript, "{}\n");
    const result = invoke(layout, "SessionStart", {
      source: "resume",
      session_id: "session-owned-2",
      transcript_path: layout.transcript,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.json.hookSpecificOutput.additionalContext, /PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=resume/);
    assert.match(result.json.hookSpecificOutput.additionalContext, /Task Plan: Owned Activation/);
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("Linux root/root activation executes the real owned runtime", { skip: process.platform === "win32" }, () => {
  const layout = fixture({ actualRuntime: true });
  const sessionId = "session-owned-linux-root";
  try {
    const records = [
      { type: "session_meta", payload: { id: sessionId, session_id: sessionId, cwd: layout.project, source: "vscode" } },
      { type: "event_msg", payload: { type: "patch_apply_end", success: true, changes: { [path.join(layout.plan, "task_plan.md")]: null } } },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "OWNED_ACTIVATION_SENTINEL" }] } },
    ];
    fs.writeFileSync(layout.transcript, records.map(record => JSON.stringify(record)).join("\n") + "\n");
    const result = invoke(layout, "SessionStart", { source: "resume", session_id: sessionId, transcript_path: layout.transcript });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.json.hookSpecificOutput.additionalContext, /SESSION CATCHUP DETECTED/);
    assert.match(result.json.hookSpecificOutput.additionalContext, /OWNED_ACTIVATION_SENTINEL/);
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("Linux synthetic install-user/Hook-user split can read the owned runtime and transcript", {
  skip: process.platform === "win32" || typeof process.getuid !== "function" || process.getuid() !== 0,
}, () => {
  const layout = fixture({ actualRuntime: true });
  const sessionId = "session-owned-linux-split";
  try {
    const records = [
      { type: "session_meta", payload: { id: sessionId, session_id: sessionId, cwd: layout.project, source: "vscode" } },
      { type: "event_msg", payload: { type: "patch_apply_end", success: true, changes: { [path.join(layout.plan, "task_plan.md")]: null } } },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "CROSS_USER_ACTIVATION_SENTINEL" }] } },
    ];
    fs.writeFileSync(layout.transcript, records.map(record => JSON.stringify(record)).join("\n") + "\n");
    const makeReadable = directory => {
      fs.chmodSync(directory, 0o755);
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) makeReadable(target);
        else fs.chmodSync(target, entry.name.endsWith(".py") || entry.name.endsWith(".sh") ? 0o755 : 0o644);
      }
    };
    makeReadable(layout.workspace);
    const result = invoke(
      layout,
      "SessionStart",
      { source: "resume", session_id: sessionId, transcript_path: layout.transcript },
      {},
      { uid: 65534, gid: 65534 },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.json.hookSpecificOutput.additionalContext, /CROSS_USER_ACTIVATION_SENTINEL/);
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});
