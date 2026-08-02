"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const adapter = path.join(root, "hooks", "hook_adapter.py");
const fixture = JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", "golden", "adapter-output-v0.2.2.json"), "utf8"));
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

assert.equal(fixture.schema_version, 1);
assert.equal(fixture.scenarios.length, 6);

for (const scenario of fixture.scenarios) {
  test(`v0.2.2 golden output: ${scenario.id}`, () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-adapter-golden-"));
    const isolatedHome = path.join(project, ".isolated-home");
    try {
      fs.mkdirSync(isolatedHome);
      for (const [relative, content] of Object.entries(scenario.files)) {
        const target = path.join(project, ...relative.split("/"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
      for (const [relative, seconds] of Object.entries(scenario.directory_mtimes || {})) {
        fs.utimesSync(path.join(project, ...relative.split("/")), seconds, seconds);
      }
      const payload = { cwd: project, hook_event_name: scenario.event };
      if (scenario.source) payload.source = scenario.source;
      const env = {
        ...process.env,
        HOME: isolatedHome,
        USERPROFILE: isolatedHome,
        CODEX_HOME: path.join(isolatedHome, ".codex"),
      };
      const result = spawnSync(python, [adapter, scenario.event], { input: JSON.stringify(payload), encoding: "utf8", env });
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout).hookSpecificOutput;
      assert.equal(output.hookEventName, scenario.event);
      assert.equal(output.additionalContext, scenario.expected_additional_context);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
}
