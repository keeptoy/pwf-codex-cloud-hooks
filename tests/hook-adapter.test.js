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
function invoke(root, event, extra = {}) {
  const payload = JSON.stringify({ cwd: root, hook_event_name: event, ...extra });
  const result = spawnSync(python, [adapter, event], { input: payload, encoding: "utf8", env: process.env });
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
