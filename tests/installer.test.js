"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const cli = path.join(root, "install.js");
const skill = path.join(os.homedir(), ".agents", "skills", "planning-with-files");
function run(home, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args, "--codex-home", home, "--skill-root", skill, "--json"], { encoding: "utf8" });
  return { ...result, json: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}
function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-hooks-test-"));
  fs.writeFileSync(path.join(home, "config.toml"), 'personality = "pragmatic"\n\n[mcp_servers.keep]\ncommand = "keep"\n');
  fs.writeFileSync(path.join(home, "hooks.json"), JSON.stringify({ description: "keep", hooks: { Stop: [{ hooks: [{ type: "command", command: "echo keep" }] }] } }, null, 2) + "\n");
  return home;
}

test("dry-run is read-only and reports two handlers", () => {
  const home = fixture(), beforeConfig = fs.readFileSync(path.join(home, "config.toml"), "utf8"), beforeHooks = fs.readFileSync(path.join(home, "hooks.json"), "utf8");
  const result = run(home, "install", "--dry-run");
  assert.equal(result.status, 0, result.stderr); assert.equal(result.json.entries.length, 2);
  assert.equal(fs.readFileSync(path.join(home, "config.toml"), "utf8"), beforeConfig);
  assert.equal(fs.readFileSync(path.join(home, "hooks.json"), "utf8"), beforeHooks);
  assert.equal(fs.existsSync(path.join(home, "hooks", "planning-with-files")), false);
});

test("install is merge-preserving, trusted, idempotent, diagnosable and uninstallable", () => {
  const home = fixture();
  let result = run(home, "install"); assert.equal(result.status, 0, result.stderr); assert.equal(result.json.action, "install"); assert.equal(result.json.healthy, true);
  let hooks = JSON.parse(fs.readFileSync(path.join(home, "hooks.json"), "utf8"));
  assert.equal(hooks.description, "keep"); assert.equal(hooks.hooks.Stop[0].hooks[0].command, "echo keep");
  assert.equal(hooks.hooks.SessionStart.length, 1); assert.equal(hooks.hooks.UserPromptSubmit.length, 1);
  let config = fs.readFileSync(path.join(home, "config.toml"), "utf8");
  assert.match(config, /\[mcp_servers\.keep\]/); assert.match(config, /hooks = true/); assert.equal((config.match(/trusted_hash/g) || []).length, 4);
  result = run(home, "install"); assert.equal(result.status, 0, result.stderr);
  hooks = JSON.parse(fs.readFileSync(path.join(home, "hooks.json"), "utf8"));
  assert.equal(hooks.hooks.SessionStart.length, 1); assert.equal(hooks.hooks.UserPromptSubmit.length, 1);
  result = run(home, "doctor"); assert.equal(result.status, 0, result.stderr); assert.equal(result.json.healthy, true);
  fs.appendFileSync(path.join(home, "hooks", "planning-with-files", "hook_adapter.py"), "# drift\n");
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.match(result.json.errors.join(" "), /adapter hash drift/);
  result = run(home, "install"); assert.equal(result.status, 0, result.stderr);
  fs.rmSync(path.join(home, "hooks", "planning-with-files", "hook_adapter.py"));
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.match(result.json.errors.join(" "), /adapter missing/);
  result = run(home, "install"); assert.equal(result.status, 0, result.stderr);
  result = run(home, "uninstall"); assert.equal(result.status, 0, result.stderr);
  hooks = JSON.parse(fs.readFileSync(path.join(home, "hooks.json"), "utf8"));
  assert.equal(hooks.hooks.Stop[0].hooks[0].command, "echo keep"); assert.equal(hooks.hooks.SessionStart, undefined); assert.equal(hooks.hooks.UserPromptSubmit, undefined);
  config = fs.readFileSync(path.join(home, "config.toml"), "utf8"); assert.match(config, /\[mcp_servers\.keep\]/); assert.doesNotMatch(config, /trusted_hash/);
  assert.equal(fs.existsSync(path.join(home, "hooks", "planning-with-files")), false);
});
