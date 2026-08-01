"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, before, test } = require("node:test");

const root = path.resolve(__dirname, "..");
const cli = path.join(root, "install.js");
const pristineSkill = path.join(root, "tests", "fixtures", "planning-with-files");
const patcher = path.join(root, "patches", "patch_planning_skill.py");
const upstreamManifest = path.join(root, "upstream-manifest.json");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
let skillWorkspace;
let skill;

before(() => {
  skillWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-patched-skill-"));
  skill = path.join(skillWorkspace, "planning-with-files");
  fs.cpSync(pristineSkill, skill, { recursive: true });
  const result = spawnSync(python, [patcher, "apply", "--skill-root", skill, "--manifest", upstreamManifest], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

after(() => {
  if (skillWorkspace) fs.rmSync(skillWorkspace, { recursive: true, force: true });
});
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
function snapshot(paths) {
  return paths.map(file => [file, fs.existsSync(file) ? fs.readFileSync(file) : null]);
}
function assertSnapshot(expected) {
  for (const [file, content] of expected) {
    if (content === null) assert.equal(fs.existsSync(file), false, file);
    else assert.deepEqual(fs.readFileSync(file), content, file);
  }
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
  result = run(home, "uninstall"); assert.equal(result.status, 0, result.stderr);
  requirements = fs.readFileSync(requirementsPath, "utf8");
  assert.match(requirements, /command = "\/usr\/bin\/keep"/); assert.doesNotMatch(requirements, /hook_adapter\.py/);
  assert.equal(fs.existsSync(path.join(home, "hooks", "planning-with-files")), false);
});

test("repair fixes only owned adapter and managed definition drift", () => {
  const home = fixture(), adapter = path.join(home, "hooks", "planning-with-files", "hook_adapter.py"), requirements = path.join(home, "etc", "codex", "requirements.toml");
  let result = run(home, "install"); assert.equal(result.status, 0, result.stderr);

  fs.appendFileSync(adapter, "# drift\n");
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.equal(result.json.repairable, true); assert.match(result.json.errors.join(" "), /adapter hash drift/);
  result = run(home, "install", "--repair"); assert.equal(result.status, 0, result.stderr); assert.equal(result.json.action, "repair");

  fs.rmSync(adapter);
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.equal(result.json.repairable, true); assert.match(result.json.errors.join(" "), /adapter missing/);
  result = run(home, "install", "--repair"); assert.equal(result.status, 0, result.stderr);

  fs.writeFileSync(requirements, fs.readFileSync(requirements, "utf8").replace('statusMessage = "Refreshing planning context"', 'statusMessage = "changed"'));
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.equal(result.json.repairable, true); assert.match(result.json.errors.join(" "), /owned managed requirements drift/);
  result = run(home, "install", "--repair"); assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(requirements, "utf8"), /statusMessage = "Refreshing planning context"/);
  fs.rmSync(home, { recursive: true, force: true });
});

test("repair fails closed for unowned requirements, manifest, and runtime drift", () => {
  const home = fixture(), requirements = path.join(home, "etc", "codex", "requirements.toml"), manifest = path.join(home, "hooks", "planning-with-files", "installed-manifest.json"), runtime = path.dirname(manifest);
  let result = run(home, "install"); assert.equal(result.status, 0, result.stderr);

  const installedRequirements = fs.readFileSync(requirements, "utf8");
  fs.appendFileSync(requirements, '\n[permissions.audit]\nnetwork = "deny"\n');
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.equal(result.json.repairable, false); assert.match(result.json.blockers.join(" "), /unowned managed requirements drift/);
  result = run(home, "install", "--repair"); assert.equal(result.status, 1); assert.match(result.stderr, /REPAIR_BLOCKED_UNKNOWN_DRIFT/);

  fs.writeFileSync(requirements, installedRequirements);
  result = run(home, "doctor"); assert.equal(result.status, 0, result.stderr);
  const changedManifest = JSON.parse(fs.readFileSync(manifest, "utf8")); changedManifest.owner = "unknown"; fs.writeFileSync(manifest, JSON.stringify(changedManifest));
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.equal(result.json.repairable, false); assert.match(result.json.blockers.join(" "), /manifest owner mismatch/);
  result = run(home, "install", "--repair"); assert.equal(result.status, 1); assert.match(result.stderr, /REPAIR_BLOCKED_UNKNOWN_DRIFT/);

  result = run(home, "install"); assert.equal(result.status, 0, result.stderr); fs.writeFileSync(path.join(runtime, "unknown.sh"), "exit 0\n");
  result = run(home, "doctor"); assert.equal(result.status, 1); assert.equal(result.json.repairable, false); assert.match(result.json.blockers.join(" "), /unknown runtime files/);
  fs.rmSync(home, { recursive: true, force: true });
});

test("installation backup can restore every pre-existing managed file byte-for-byte", () => {
  const home = fixture(), requirements = path.join(home, "etc", "codex", "requirements.toml"), runtime = path.join(home, "hooks", "planning-with-files");
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(runtime, "hook_adapter.py"), "# previous adapter\n");
  fs.writeFileSync(path.join(runtime, "installed-manifest.json"), '{"schema_version":2,"entries":[]}\n');
  const files = [path.join(home, "config.toml"), path.join(home, "hooks.json"), requirements, path.join(runtime, "hook_adapter.py"), path.join(runtime, "installed-manifest.json")];
  const before = snapshot(files);
  const result = run(home, "install"); assert.equal(result.status, 0, result.stderr);

  fs.rmSync(runtime, { recursive: true, force: true }); fs.mkdirSync(runtime, { recursive: true });
  fs.copyFileSync(path.join(result.json.backup, "config.toml"), path.join(home, "config.toml"));
  fs.copyFileSync(path.join(result.json.backup, "hooks.json"), path.join(home, "hooks.json"));
  fs.copyFileSync(path.join(result.json.backup, "system-requirements.toml"), requirements);
  fs.cpSync(path.join(result.json.backup, "hooks", "planning-with-files"), runtime, { recursive: true });
  assertSnapshot(before);
  fs.rmSync(home, { recursive: true, force: true });
});
