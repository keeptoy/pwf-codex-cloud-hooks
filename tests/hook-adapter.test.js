"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const adapter = path.resolve(__dirname, "../hooks/hook_adapter.py");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
function projectFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-hook-project-"));
  const plan = path.join(root, ".planning", "portable-test");
  fs.mkdirSync(plan, { recursive: true });
  fs.writeFileSync(path.join(root, ".planning", ".active_plan"), "portable-test\n");
  fs.writeFileSync(path.join(plan, "task_plan.md"), "# Task Plan: Portable Hook Fixture\n\n### Phase 1\n- **Status:** in_progress\n");
  fs.writeFileSync(path.join(plan, "findings.md"), "# Findings\n\n- Fixture is repository-independent.\n");
  fs.writeFileSync(path.join(plan, "progress.md"), "# Progress\n\n- Fixture created.\n");
  return root;
}
function invoke(root, event, extra = {}, envOverrides = {}) {
  const payload = JSON.stringify({ cwd: root, hook_event_name: event, ...extra });
  const env = { ...process.env };
  delete env.PLAN_ID;
  delete env.PLANNING_DISABLED;
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === null) delete env[key];
    else env[key] = value;
  }
  const result = spawnSync(python, [adapter, event], { input: payload, encoding: "utf8", env });
  return { ...result, json: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}
test("SessionStart emits read-only scoped planning context and source canary", () => {
  const root = projectFixture();
  try {
    const result = invoke(root, "SessionStart", { source: "startup" }); assert.equal(result.status, 0, result.stderr);
    const output = result.json.hookSpecificOutput; assert.equal(output.hookEventName, "SessionStart");
    assert.match(output.additionalContext, /PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=startup/);
    assert.match(output.additionalContext, /Task Plan: Portable Hook Fixture/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("UserPromptSubmit emits event canary and active plan", () => {
  const root = projectFixture();
  try {
    const result = invoke(root, "UserPromptSubmit"); assert.equal(result.status, 0, result.stderr);
    const output = result.json.hookSpecificOutput; assert.equal(output.hookEventName, "UserPromptSubmit");
    assert.match(output.additionalContext, /PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit/);
    assert.match(output.additionalContext, /===BEGIN PLAN DATA===/);
    assert.match(output.additionalContext, /Fixture created\./);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("a project without planning files emits only the event canary", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-hook-empty-"));
  try {
    const result = invoke(root, "UserPromptSubmit"); assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.hookSpecificOutput.additionalContext, "PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("session attachment is legacy-compatible until a safe marker enables isolation", () => {
  const root = projectFixture();
  try {
    let result = invoke(root, "UserPromptSubmit", { session_id: "session-a" });
    assert.match(result.json.hookSpecificOutput.additionalContext, /Portable Hook Fixture/);

    const sessions = path.join(root, ".planning", "sessions");
    fs.mkdirSync(sessions);
    fs.mkdirSync(path.join(sessions, "not-a-file.attached"));
    result = invoke(root, "UserPromptSubmit", { session_id: "session-a" });
    assert.match(result.json.hookSpecificOutput.additionalContext, /Portable Hook Fixture/);

    fs.writeFileSync(path.join(sessions, "session-b.attached"), "marker contents are ignored\n");
    result = invoke(root, "UserPromptSubmit", { session_id: "session-a" });
    assert.equal(result.json.hookSpecificOutput.additionalContext, "PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit");

    fs.writeFileSync(path.join(sessions, "session-a.attached"), "");
    result = invoke(root, "UserPromptSubmit", { session_id: "session-a" });
    assert.match(result.json.hookSpecificOutput.additionalContext, /Portable Hook Fixture/);
    assert.doesNotMatch(result.json.hookSpecificOutput.additionalContext, /marker contents/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("PLANNING_DISABLED=1 suppresses catch-up and plan context but preserves the canary", () => {
  const root = projectFixture();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-hook-home-"));
  try {
    const skill = path.join(home, ".agents", "skills", "planning-with-files");
    fs.mkdirSync(path.join(skill, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(skill, "SKILL.md"), "# fixture\n");
    fs.writeFileSync(path.join(skill, "scripts", "session-catchup.py"), "print('SHOULD_NOT_RUN')\n");
    const result = invoke(root, "SessionStart", { source: "resume", session_id: "session-a" }, {
      PLANNING_DISABLED: "1",
      HOME: home,
      USERPROFILE: home,
      CODEX_HOME: path.join(home, ".codex"),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json.hookSpecificOutput.additionalContext, "PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=resume");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("PLAN_ID precedes a BOM active pointer and the active pointer remains the fallback", () => {
  const root = projectFixture();
  try {
    const selected = path.join(root, ".planning", "selected");
    fs.mkdirSync(selected);
    fs.writeFileSync(path.join(selected, "task_plan.md"), "# Task Plan: Selected By Override\n");
    fs.writeFileSync(path.join(root, ".planning", ".active_plan"), "\uFEFFportable-test\r\n");

    let result = invoke(root, "UserPromptSubmit", { session_id: "session-a" }, { PLAN_ID: "selected" });
    assert.match(result.json.hookSpecificOutput.additionalContext, /Selected By Override/);
    assert.doesNotMatch(result.json.hookSpecificOutput.additionalContext, /Portable Hook Fixture/);

    result = invoke(root, "UserPromptSubmit", { session_id: "session-a" });
    assert.match(result.json.hookSpecificOutput.additionalContext, /Portable Hook Fixture/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a scoped-plan symlink or junction cannot inject files outside the project", (t) => {
  const root = projectFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-hook-outside-"));
  try {
    fs.writeFileSync(path.join(outside, "task_plan.md"), "# EXTERNAL_PLAN_SECRET\n");
    const link = path.join(root, ".planning", "escape");
    try {
      fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
        t.skip(`directory links unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    fs.writeFileSync(path.join(root, ".planning", ".active_plan"), "escape\n");
    const result = invoke(root, "UserPromptSubmit", { session_id: "session-a" });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.json.hookSpecificOutput.additionalContext, /EXTERNAL_PLAN_SECRET/);
    assert.match(result.json.hookSpecificOutput.additionalContext, /Portable Hook Fixture/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
