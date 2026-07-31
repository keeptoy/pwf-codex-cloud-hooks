"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const adapter = path.resolve(__dirname, "../hooks/hook_adapter.py");
const repo = path.resolve(__dirname, "../..");
function invoke(event, extra = {}) {
  const payload = JSON.stringify({ cwd: repo, hook_event_name: event, ...extra });
  const result = spawnSync("python3", [adapter, event], { input: payload, encoding: "utf8", env: process.env });
  return { ...result, json: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}
test("SessionStart emits read-only scoped planning context and source canary", () => {
  const result = invoke("SessionStart", { source: "startup" }); assert.equal(result.status, 0, result.stderr);
  const output = result.json.hookSpecificOutput; assert.equal(output.hookEventName, "SessionStart");
  assert.match(output.additionalContext, /PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=startup/);
  assert.match(output.additionalContext, /Task Plan: 首个场景闭合 L2 Profile/);
});
test("UserPromptSubmit emits event canary and active plan", () => {
  const result = invoke("UserPromptSubmit"); assert.equal(result.status, 0, result.stderr);
  const output = result.json.hookSpecificOutput; assert.equal(output.hookEventName, "UserPromptSubmit");
  assert.match(output.additionalContext, /PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit/);
  assert.match(output.additionalContext, /===BEGIN PLAN DATA===/);
});
