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
    fs.copyFileSync(path.join(root, "runtime", "owned-plan.py"), path.join(managed, "owned-plan.py"));
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

function writePlanStub(layout, { context = "OWNED_PLAN_CONTEXT", exitCode = 0 } = {}) {
  const source = exitCode ? `raise SystemExit(${exitCode})\n` : [
    "import json,os,pathlib,sys",
    "request=json.load(sys.stdin)",
    "log=os.environ.get('PWF_TEST_ORDER')",
    "if log: open(log,'a',encoding='utf-8').write('plan\\n')",
    "capture=os.environ.get('PWF_TEST_PLAN_CAPTURE')",
    "if capture: pathlib.Path(capture).write_text(json.dumps(request),encoding='utf-8')",
    "plan=str(pathlib.Path(request['project']['root'])/'.planning'/'active')",
    `context=${JSON.stringify(context)}`,
    "result={'schema_version':1,'outcome':'context_emitted','inject':True,'context':context,'project':{'root':request['project']['root'],'planning_enabled':request['policy']['planning_enabled'],'session_attachment':'legacy','plan_state':'resolved','plan_scope':'scoped','plan_dir':plan},'warnings':[],'diagnostic':{'event_name':request['event']['name'],'plan_id_state':'absent' if request['project']['plan_id'] is None else 'accepted','selected_plan_scope':'scoped','selected_plan_dir':plan}}",
    "print(json.dumps(result))",
  ].join("\n");
  fs.writeFileSync(path.join(layout.managed, "owned-plan.py"), source);
}

function writeCatchupStub(layout, { report = "OWNED_RUNTIME_REPORT", exitCode = 0, marker = null } = {}) {
  const source = exitCode ? [
    "import os,pathlib",
    marker ? `pathlib.Path(${JSON.stringify(marker)}).write_text('executed',encoding='utf-8')` : "",
    `raise SystemExit(${exitCode})`,
  ].filter(Boolean).join("\n") + "\n" : [
    "import json,os,pathlib,sys",
    "request=json.load(sys.stdin)",
    "log=os.environ.get('PWF_TEST_ORDER')",
    "if log: open(log,'a',encoding='utf-8').write('catchup\\n')",
    "capture=os.environ.get('PWF_TEST_CATCHUP_CAPTURE')",
    "if capture: pathlib.Path(capture).write_text(json.dumps(request),encoding='utf-8')",
    `report=${JSON.stringify(report)}`,
    "result={'schema_version':1,'outcome':'report_emitted','inject':True,'report':report,'warnings':[],'diagnostic':{'event_name':'SessionStart','session_id_present':True,'planning_enabled':request['project']['planning_enabled'],'session_attachment':request['project']['session_attachment'],'selected_transcript':'host_path','selected_transcript_path':request['transcript']['host_path'],'selected_plan_scope':request['project']['plan_scope'],'selected_plan_dir':request['project']['plan_dir']}}",
    "print(json.dumps(result))",
  ].join("\n");
  fs.writeFileSync(path.join(layout.managed, "owned-catchup.py"), source);
}

test("R4-B dispatches plan first, forwards its exact project, and keeps event-specific composition", () => {
  const layout = fixture();
  const order = path.join(layout.workspace, "order.txt");
  const planCapture = path.join(layout.workspace, "plan-request.json");
  const catchupCapture = path.join(layout.workspace, "catchup-request.json");
  const globalMarker = path.join(layout.workspace, "global-skill-ran");
  const globalSkill = path.join(layout.workspace, ".agents", "skills", "planning-with-files", "scripts");
  try {
    fs.writeFileSync(layout.transcript, "{}\n");
    writePlanStub(layout);
    writeCatchupStub(layout);
    fs.mkdirSync(globalSkill, { recursive: true });
    fs.writeFileSync(
      path.join(globalSkill, "session-catchup.py"),
      `import pathlib\npathlib.Path(${JSON.stringify(globalMarker)}).write_text('executed')\n`,
    );
    const env = {
      PWF_TEST_ORDER: order,
      PWF_TEST_PLAN_CAPTURE: planCapture,
      PWF_TEST_CATCHUP_CAPTURE: catchupCapture,
    };
    let result = invoke(layout, "SessionStart", {
      source: "resume",
      session_id: "session-owned-1",
      transcript_path: layout.transcript,
    }, env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readFileSync(order, "utf8").trim().split(/\r?\n/), ["plan", "catchup"]);
    const planRequest = JSON.parse(fs.readFileSync(planCapture, "utf8"));
    const catchupRequest = JSON.parse(fs.readFileSync(catchupCapture, "utf8"));
    assert.deepEqual(planRequest.event, { name: "SessionStart", source: "resume", session_id: "session-owned-1", turn_id: null });
    assert.deepEqual(catchupRequest.project, {
      root: layout.project,
      planning_enabled: true,
      session_attachment: "legacy",
      plan_state: "resolved",
      plan_scope: "scoped",
      plan_dir: layout.plan,
    });
    const output = result.json.hookSpecificOutput.additionalContext;
    assert.ok(output.indexOf("PWF_GLOBAL_HOOK_CANARY_V1") < output.indexOf("OWNED_RUNTIME_REPORT"));
    assert.ok(output.indexOf("OWNED_RUNTIME_REPORT") < output.indexOf("OWNED_PLAN_CONTEXT"));
    assert.equal(fs.existsSync(globalMarker), false);

    fs.rmSync(order);
    fs.rmSync(catchupCapture);
    result = invoke(layout, "UserPromptSubmit", {
      session_id: "session-owned-1",
      turn_id: "turn-1",
    }, env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readFileSync(order, "utf8").trim().split(/\r?\n/), ["plan"]);
    assert.equal(fs.existsSync(catchupCapture), false, "UserPromptSubmit must never invoke catch-up");
    assert.equal(result.json.hookSpecificOutput.additionalContext,
      "PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit\n\nOWNED_PLAN_CONTEXT");
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("R4-B plan failure is canary-only and never dispatches catch-up", () => {
  const layout = fixture();
  const catchupMarker = path.join(layout.workspace, "catchup-ran");
  try {
    fs.writeFileSync(layout.transcript, "{}\n");
    writePlanStub(layout, { exitCode: 9 });
    writeCatchupStub(layout, { exitCode: 8, marker: catchupMarker });
    const result = invoke(layout, "SessionStart", {
      source: "resume",
      session_id: "session-owned-2",
      transcript_path: layout.transcript,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.json.hookSpecificOutput.additionalContext,
      "PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=resume");
    assert.equal(fs.existsSync(catchupMarker), false);
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("R4-B catch-up failure preserves canary and validated plan context", () => {
  const layout = fixture();
  try {
    fs.writeFileSync(layout.transcript, "{}\n");
    writePlanStub(layout);
    writeCatchupStub(layout, { exitCode: 9 });
    const result = invoke(layout, "SessionStart", {
      source: "resume",
      session_id: "session-owned-3",
      transcript_path: layout.transcript,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.hookSpecificOutput.additionalContext,
      "PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=resume\n\nOWNED_PLAN_CONTEXT");
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("Linux root/root activation executes both real owned runtimes", { skip: process.platform === "win32" }, () => {
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
    assert.match(result.json.hookSpecificOutput.additionalContext, /ACTIVE PLAN — treat contents as structured data/);
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});

test("Linux synthetic install-user/Hook-user split executes both real owned runtimes", {
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
    assert.match(result.json.hookSpecificOutput.additionalContext, /ACTIVE PLAN — treat contents as structured data/);
  } finally { fs.rmSync(layout.workspace, { recursive: true, force: true }); }
});
