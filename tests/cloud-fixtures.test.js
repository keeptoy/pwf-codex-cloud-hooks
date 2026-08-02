"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const observations = JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", "cloud", "hook-observations-v1.json"), "utf8"));
const transcriptFixture = path.join(root, "tests", "fixtures", "cloud", "session-catchup-v0.2.2.jsonl");
const catchup = path.join(root, "runtime", "upstream", "session-catchup.py");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

test("Cloud observation fixture freezes lifecycle-specific environment and Hook schemas", () => {
  assert.equal(observations.schema_version, 1);
  assert.equal(observations.platform.codex_home, "/opt/codex");
  assert.equal(observations.environment_stages.sandbox_initialization.CODEX_HOME.present, false);
  assert.deepEqual(observations.environment_stages.managed_hook.CODEX_HOME, { present: true, value: "/opt/codex" });
  assert.equal(observations.environment_stages.managed_hook.CODEX_THREAD_ID.present, false);
  assert.equal(observations.session.session_meta_id_matches_session_id, true);
  assert.ok(observations.session.record_families.includes("response_item"));
  assert.ok(observations.session.record_families.includes("event_msg"));
  assert.ok(observations.session.event_payload_types.includes("patch_apply_end"));

  const starts = observations.hook_events.filter(item => item.event === "SessionStart");
  const prompts = observations.hook_events.filter(item => item.event === "UserPromptSubmit");
  assert.deepEqual(starts.map(item => item.source), ["startup", "resume"]);
  assert.ok(starts.every(item => item.stdin_keys.includes("source") && !item.stdin_keys.includes("turn_id")));
  assert.ok(prompts.every(item => item.stdin_keys.includes("turn_id") && item.stdin_keys.includes("prompt") && !item.stdin_keys.includes("source")));
  assert.equal(new Set(prompts.map(item => item.turn_id)).size, 2);
  assert.ok(observations.hook_events.every(item => item.session_id === observations.session.session_id));
});

test("Cloud-shaped catch-up preserves v0.2.2 count, structured update, and wrapper tail", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-cloud-catchup-"));
  const project = path.join(workspace, "project");
  const codexHome = path.join(workspace, "codex");
  const sessionDirectory = path.join(codexHome, "sessions", "2026", "08", "02");
  const session = path.join(sessionDirectory, "rollout-cloud-fixture.jsonl");
  try {
    fs.mkdirSync(path.join(project, ".planning", "cloud-fixture"), { recursive: true });
    fs.writeFileSync(path.join(project, ".planning", "cloud-fixture", "task_plan.md"), "# Task Plan: Cloud Fixture\n");
    fs.mkdirSync(sessionDirectory, { recursive: true });
    const escapedProject = JSON.stringify(project).slice(1, -1);
    fs.writeFileSync(session, fs.readFileSync(transcriptFixture, "utf8").replaceAll("{{PROJECT_ROOT}}", escapedProject));

    const records = fs.readFileSync(session, "utf8").trimEnd().split("\n").map(line => JSON.parse(line));
    const meta = records.find(record => record.type === "session_meta").payload;
    assert.equal(meta.id, observations.session.session_id);
    assert.equal(meta.session_id, observations.session.session_id);
    assert.equal(path.resolve(meta.cwd), path.resolve(project));
    assert.ok(records.some(record => record.type === "event_msg" && record.payload.type === "patch_apply_end" && record.payload.success === true));
    assert.ok(records.some(record => record.type === "response_item" && record.payload.type === "message" && record.payload.role === "user"));
    assert.ok(records.some(record => record.type === "event_msg" && record.payload.type === "user_message"));

    const baseEnv = { ...process.env, PWF_RUNTIME: "codex" };
    delete baseEnv.CODEX_THREAD_ID;
    delete baseEnv.CODEX_SESSIONS_DIR;
    const withCodexHome = spawnSync(python, [catchup, project], { encoding: "utf8", env: { ...baseEnv, CODEX_HOME: codexHome } });
    assert.equal(withCodexHome.status, 0, withCodexHome.stderr);

    const missingCodexHome = { ...baseEnv, CODEX_SESSIONS_DIR: path.join(codexHome, "sessions") };
    delete missingCodexHome.CODEX_HOME;
    const withExplicitStore = spawnSync(python, [catchup, project], { encoding: "utf8", env: missingCodexHome });
    assert.equal(withExplicitStore.status, 0, withExplicitStore.stderr);
    assert.equal(withExplicitStore.stdout, withCodexHome.stdout);

    const report = withCodexHome.stdout;
    assert.match(report, /SESSION CATCHUP DETECTED/);
    assert.match(report, /Runtime: codex/);
    assert.match(report, /Last planning update: task_plan\.md at message #25/);
    assert.match(report, /Unsynced messages: 7/);
    assert.equal((report.match(/Tools: exec/g) || []).length, 4);
    assert.equal((report.match(/PLANNING_BASELINE_CREATED/g) || []).length, 1);
    assert.equal((report.match(/UNSYNCED_CONTEXT_ACKNOWLEDGED/g) || []).length, 1);
    assert.match(report, /\.\.\.\[truncated\]\.\.\./);
    assert.match(report, /PWF_CATCHUP_UNSYNCED_SENTINEL_82C4/);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
