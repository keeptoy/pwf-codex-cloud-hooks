"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const adapter = path.join(root, "hooks", "hook_adapter.py");
const alphaPath = path.join(root, "tests", "fixtures", "golden", "adapter-output-v0.2.2.json");
const betaPath = path.join(root, "tests", "fixtures", "golden", "adapter-output-v0.3.0-beta.1.json");
const alphaBytes = fs.readFileSync(alphaPath);
const alphaFixture = JSON.parse(alphaBytes.toString("utf8"));
const betaFixture = JSON.parse(fs.readFileSync(betaPath, "utf8"));
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

assert.equal(crypto.createHash("sha256").update(alphaBytes).digest("hex"),
  "b39361dcde9c412ed7e4a1b4e8d3060ff92b45894a327a6509a9c7eff368718a");
assert.equal(alphaFixture.schema_version, 1);
assert.equal(alphaFixture.scenarios.length, 6);
assert.equal(betaFixture.schema_version, 1);
assert.equal(betaFixture.scenarios.length, 2);

function planResult(rootPath, event, scope, relative, context) {
  if (!context) {
    return {
      schema_version: 1,
      outcome: "no_plan",
      inject: false,
      context: null,
      project: {
        root: rootPath,
        planning_enabled: true,
        session_attachment: "legacy",
        plan_state: "none",
        plan_scope: "none",
        plan_dir: null,
      },
      warnings: [],
      diagnostic: {
        event_name: event,
        plan_id_state: "absent",
        selected_plan_scope: "none",
        selected_plan_dir: null,
      },
    };
  }
  const planDir = scope === "legacy_root" ? rootPath : path.join(rootPath, ...relative.split("/"));
  return {
    schema_version: 1,
    outcome: "context_emitted",
    inject: true,
    context,
    project: {
      root: rootPath,
      planning_enabled: true,
      session_attachment: "legacy",
      plan_state: "resolved",
      plan_scope: scope,
      plan_dir: planDir,
    },
    warnings: [],
    diagnostic: {
      event_name: event,
      plan_id_state: "absent",
      selected_plan_scope: scope,
      selected_plan_dir: planDir,
    },
  };
}

function runScenario(scenario, expected, label) {
  test(`${label}: ${scenario.id}`, () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-adapter-golden-"));
    const project = path.join(workspace, "project");
    const codexHome = path.join(workspace, "codex");
    const managed = path.join(codexHome, "hooks", "planning-with-files");
    const sessions = path.join(codexHome, "sessions");
    const transcript = path.join(sessions, "rollout-golden.jsonl");
    try {
      fs.mkdirSync(project);
      fs.mkdirSync(managed, { recursive: true });
      fs.mkdirSync(sessions, { recursive: true });
      fs.copyFileSync(adapter, path.join(managed, "hook_adapter.py"));
      for (const [relative, content] of Object.entries(scenario.files || {})) {
        const target = path.join(project, ...relative.split("/"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
      for (const [relative, seconds] of Object.entries(scenario.directory_mtimes || {})) {
        fs.utimesSync(path.join(project, ...relative.split("/")), seconds, seconds);
      }
      const marker = expected.split("\n\n", 1)[0];
      const historicalContext = expected.length > marker.length ? expected.slice(marker.length + 2) : "";
      let scope = scenario.plan_scope;
      let relative = scenario.plan_relative;
      if (!scope && historicalContext) {
        scope = scenario.id === "user_prompt_legacy_root" ? "legacy_root" : "scoped";
        relative = scenario.id === "user_prompt_newest_scoped" ? ".planning/newest" : ".planning/active";
      }
      const resultValue = planResult(project, scenario.event, scope || "none", relative || ".", scenario.plan_context ?? historicalContext);
      fs.writeFileSync(path.join(managed, "owned-plan.py"), [
        "import json,os",
        "print(json.dumps(json.loads(os.environ['PWF_TEST_PLAN_RESULT'])))",
      ].join("\n"));
      if (scenario.catchup_report) {
        fs.writeFileSync(transcript, "{}\n");
        fs.writeFileSync(path.join(managed, "owned-catchup.py"), [
          "import json,os,sys",
          "request=json.load(sys.stdin)",
          "report=os.environ['PWF_TEST_CATCHUP_REPORT']",
          "result={'schema_version':1,'outcome':'report_emitted','inject':True,'report':report,'warnings':[],'diagnostic':{'event_name':'SessionStart','session_id_present':True,'planning_enabled':request['project']['planning_enabled'],'session_attachment':request['project']['session_attachment'],'selected_transcript':'host_path','selected_transcript_path':request['transcript']['host_path'],'selected_plan_scope':request['project']['plan_scope'],'selected_plan_dir':request['project']['plan_dir']}}",
          "print(json.dumps(result))",
        ].join("\n"));
      }
      const payload = { cwd: project, hook_event_name: scenario.event };
      if (scenario.source) payload.source = scenario.source;
      if (scenario.session_id) {
        payload.session_id = scenario.session_id;
        payload.transcript_path = transcript;
      }
      const env = {
        ...process.env,
        HOME: workspace,
        USERPROFILE: workspace,
        CODEX_HOME: codexHome,
        PWF_TEST_PLAN_RESULT: JSON.stringify(resultValue),
        PWF_TEST_CATCHUP_REPORT: scenario.catchup_report || "",
      };
      const result = spawnSync(python, [path.join(managed, "hook_adapter.py"), scenario.event], {
        input: JSON.stringify(payload), encoding: "utf8", env,
      });
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout).hookSpecificOutput;
      assert.equal(output.hookEventName, scenario.event);
      assert.equal(output.additionalContext, expected);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
}

for (const scenario of alphaFixture.scenarios) {
  runScenario(scenario, scenario.expected_additional_context, "immutable v0.2.2 composition golden");
}
for (const scenario of betaFixture.scenarios) {
  runScenario(scenario, scenario.expected_additional_context, "R4-B beta owned-plan golden");
}
