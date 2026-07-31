"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const cli = path.join(root, "install.js");
const skill = path.join(root, "tests", "fixtures", "planning-with-files");
function run(home, ...args) {
  const requirements = path.join(home, "etc", "codex", "requirements.toml");
  const result = spawnSync(process.execPath, [cli, ...args, "--codex-home", home, "--skill-root", skill, "--managed-requirements", requirements, "--json"], { encoding: "utf8" });
  return { ...result, json: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}
function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-hooks-test-"));
  fs.mkdirSync(path.join(home, "etc", "codex"), { recursive: true });
  fs.writeFileSync(path.join(home, "config.toml"), 'personality = "pragmatic"\n\n[mcp_servers.keep]\ncommand = "keep"\n');
  fs.writeFileSync(path.join(home, "hooks.json"), JSON.stringify({ description: "keep", hooks: { Stop: [{ hooks: [{ type: "command", command: "echo keep" }] }] } }, null, 2) + "\n");
  fs.writeFileSync(path.join(home, "etc", "codex", "requirements.toml"), `enforce_residency = "us"\n\n[features]\nbrowser_use = false\n\n[hooks]\nmanaged_dir = ${JSON.stringify(path.join(home, "hooks"))}\n\n[[hooks.Stop]]\n[[hooks.Stop.hooks]]\ntype = "command"\ncommand = "/usr/bin/keep"\n`);
  return home;
}

test("dry-run is read-only and reports two handlers", () => {
  const home = fixture(), requirements = path.join(home, "etc", "codex", "requirements.toml"), beforeRequirements = fs.readFileSync(requirements, "utf8");
  const result = run(home, "install", "--dry-run");
  assert.equal(result.status, 0, result.stderr); assert.deepEqual(result.json.events, ["SessionStart", "UserPromptSubmit"]);
  assert.equal(fs.readFileSync(requirements, "utf8"), beforeRequirements);
  assert.equal(fs.existsSync(path.join(home, "hooks", "planning-with-files")), false);
});

test("managed install fails closed when an existing managed_dir excludes the adapter", () => {
  const home = fixture(), requirements = path.join(home, "etc", "codex", "requirements.toml");
  fs.writeFileSync(requirements, '[hooks]\nmanaged_dir = "/enterprise/hooks"\n');
  const result = run(home, "install", "--dry-run");
  assert.equal(result.status, 1); assert.match(result.stderr, /existing hooks\.managed_dir does not contain adapter/);
  fs.rmSync(home, { recursive: true, force: true });
});

test("managed install is merge-preserving, idempotent, diagnosable and uninstallable", () => {
  const home = fixture();
  let result = run(home, "install"); assert.equal(result.status, 0, result.stderr); assert.equal(result.json.action, "install"); assert.equal(result.json.healthy, true);
  const requirementsPath = path.join(home, "etc", "codex", "requirements.toml");
  let requirements = fs.readFileSync(requirementsPath, "utf8");
  assert.match(requirements, /enforce_residency = "us"/); assert.match(requirements, /browser_use = false/); assert.match(requirements, /command = "\\\/usr\\\/bin\\\/keep"|command = "\/usr\/bin\/keep"/);
  assert.match(requirements, /hooks = true/); assert.equal((requirements.match(/hook_adapter\.py/g) || []).length, 2);
  result = run(home, "install"); assert.equal(result.status, 0, result.stderr);
  requirements = fs.readFileSync(requirementsPath, "utf8"); assert.equal((requirements.match(/hook_adapter\.py/g) || []).length, 2);
  result = run(home, "doctor"); assert.equal(result.status, 0, result.stderr); assert.equal(result.json.healthy, true);
  fs.appendFileSync(path.join(home, "hooks", "planning-with-files", "hook_adapter.py"), "# drift\n");
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.match(result.json.errors.join(" "), /adapter hash drift/);
  result = run(home, "install"); assert.equal(result.status, 0, result.stderr);
  fs.rmSync(path.join(home, "hooks", "planning-with-files", "hook_adapter.py"));
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.match(result.json.errors.join(" "), /adapter missing/);
  result = run(home, "install"); assert.equal(result.status, 0, result.stderr);
  result = run(home, "uninstall"); assert.equal(result.status, 0, result.stderr);
  requirements = fs.readFileSync(requirementsPath, "utf8");
  assert.match(requirements, /command = "\/usr\/bin\/keep"/); assert.doesNotMatch(requirements, /hook_adapter\.py/);
  assert.equal(fs.existsSync(path.join(home, "hooks", "planning-with-files")), false);
});
