"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const pristineSkill = path.join(root, "tests", "fixtures", "planning-with-files");
const patcher = path.join(root, "patches", "patch_planning_skill.py");
const manifestPath = path.join(root, "upstream-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const patchContract = manifest.compatibility_patches.PWF_CODEX_CLOUD_COMPAT_PATCH;
assert.deepEqual(Object.keys(manifest.compatibility_patches), ["PWF_CODEX_CLOUD_COMPAT_PATCH"]);
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

function fixture(prefix = "pwf-skill-patch-") {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const skill = path.join(workspace, ".agents", "skills", "planning-with-files");
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.cpSync(pristineSkill, skill, { recursive: true });
  return { workspace, skill };
}

function runPatcher(skill, command = "apply") {
  return spawnSync(python, [
    patcher,
    command,
    "--skill-root", skill,
    "--manifest", manifestPath,
  ], { encoding: "utf8" });
}

test("compatibility patch is deterministic, idempotent, and fail-closed", () => {
  const { workspace, skill } = fixture();
  const target = path.join(skill, "scripts", "session-catchup.py");
  try {
    assert.equal(fs.existsSync(target), true);
    let result = runPatcher(skill);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).changed, true);
    assert.equal(require("node:crypto").createHash("sha256").update(fs.readFileSync(target)).digest("hex"), patchContract.patched_sha256);

    result = runPatcher(skill);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).changed, false);

    result = runPatcher(skill, "check");
    assert.equal(result.status, 0, result.stderr);

    fs.appendFileSync(target, "# unknown drift\n");
    result = runPatcher(skill);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refusing unknown Skill content/);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("alpha.2 bootstrap keeps the ZIP guard and leaves the global Skill pristine", () => {
  const bootstrap = fs.readFileSync(path.join(root, "init-cloud-sandbox-v0.3.0.bash"), "utf8");
  const workflow = bootstrap.match(/install_hooks_component\(\) \{([\s\S]*?)\n\}/);
  assert.ok(workflow, "install_hooks_component was not found");
  assert.match(bootstrap, /HOOKS_VERSION="\$\{HOOKS_VERSION:-v0\.3\.0-alpha\.2\}"/);
  assert.match(bootstrap, /HOOKS_SHA256="\$\{HOOKS_SHA256:-61f2001f3dd3934d79144d5f1be09385a55936aba9f7481ad5e2177a486059db\}"/);
  assert.match(bootstrap, /HOOKS_SHA256 is still a placeholder/);
  assert.doesNotMatch(bootstrap, /apply_planning_skill_compat_patch|verify_patched_planning_skill|PLANNING_SKILL_PATCHED_SHA256/);
  assert.match(workflow[1], /install_managed_hooks/);
  assert.match(bootstrap, /run_verification\(\) \{[\s\S]*verify_planning_skill/);
});

test("historical compatibility overlay remains reproducible for the owned imported copy", () => {
  const { workspace, skill } = fixture("pwf-catchup-runtime-");
  const project = path.join(workspace, "project");
  const scoped = path.join(project, ".planning", "catchup-regression");
  const codexHome = path.join(workspace, "codex");
  const sessions = path.join(codexHome, "sessions", "2026", "08", "01");
  const rollout = path.join(sessions, "rollout-2026-08-01T00-00-00-catchup-thread.jsonl");
  try {
    const patched = runPatcher(skill);
    assert.equal(patched.status, 0, patched.stderr);
    fs.mkdirSync(scoped, { recursive: true });
    fs.writeFileSync(path.join(project, ".planning", ".active_plan"), "catchup-regression\n");
    fs.writeFileSync(path.join(scoped, "task_plan.md"), "# scoped-only plan\n");
    fs.mkdirSync(sessions, { recursive: true });
    const sentinel = "PWF_CATCHUP_UNSYNCED_SENTINEL_82C4";
    const wrappedUserMessage = `The user was unsatisfied with the code.\n<PREVIOUS_PR_DESCRIPTION>\n${"w".repeat(1500)}\n</PREVIOUS_PR_DESCRIPTION>\n${sentinel}`;
    const records = [
      { type: "session_meta", payload: { cwd: project, source: "codex" } },
      { type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "x".repeat(6000) }] } },
      { type: "event_msg", payload: { type: "patch_apply_end", success: true, changes: { [path.join(scoped, "task_plan.md")]: { operation: "modified" } } } },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: wrappedUserMessage }] } },
    ];
    fs.writeFileSync(rollout, records.map(record => JSON.stringify(record)).join("\n") + "\n");
    const env = { ...process.env, PWF_RUNTIME: "codex", CODEX_HOME: codexHome };
    delete env.CODEX_SESSIONS_DIR;
    delete env.CODEX_THREAD_ID;
    const result = spawnSync(python, [path.join(skill, "scripts", "session-catchup.py"), project], { encoding: "utf8", env });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SESSION CATCHUP DETECTED/);
    assert.match(result.stdout, /Runtime: codex/);
    assert.match(result.stdout, /Last planning update: task_plan\.md/);
    assert.match(result.stdout, /Unsynced messages: 1/);
    assert.match(result.stdout, /The user was unsatisfied with the code/);
    assert.match(result.stdout, /\.\.\.\[truncated\]\.\.\./);
    assert.match(result.stdout, new RegExp(sentinel));

  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
