"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

test("Phase 3 Round 1 records the selected staged canonical plan-context boundary", () => {
  const request = readJson("contracts/adapter-plan-context-request-v1.schema.json");
  const result = readJson("contracts/plan-context-result-v1.schema.json");
  const bundle = readJson("contracts/runtime-bundle-v1.json");
  const artifact = readJson("contracts/release-artifact-v1.json");
  const upstream = readJson("upstream-manifest.json");
  const guide = fs.readFileSync(path.join(root, "docs", "phase-3-canonical-plan-context.md"), "utf8");
  const options = fs.readFileSync(path.join(root, "docs", "phase-3-upstream-invocation-options.md"), "utf8");

  assert.equal(request.properties.schema_version.const, 1);
  assert.equal(request.properties.runtime.const, "codex");
  assert.deepEqual(request.properties.event.properties.name.enum, ["SessionStart", "UserPromptSubmit"]);
  assert.equal(request.properties.policy.properties.behavior_profile.const, "managed_legacy");
  assert.equal(request.properties.output_budget.properties.max_context_chars.const, 20000);
  assert.equal(request.properties.output_budget.properties.max_plan_lines.const, 50);
  assert.equal(request.properties.output_budget.properties.max_progress_lines.const, 20);
  assert.equal(Object.hasOwn(request.properties, "transcript"), false);
  assert.equal(JSON.stringify(request).includes('"prompt"'), false);
  assert.match(request.$comment, /selected contract, staged and inactive/);
  assert.match(request.$comment, /excluded from the v0\.3\.0-alpha\.2 runtime/);

  assert.equal(result.properties.schema_version.const, 1);
  assert.ok(result.properties.outcome.enum.includes("context_emitted"));
  assert.ok(result.properties.outcome.enum.includes("plan_state_changed"));
  assert.ok(result.properties.outcome.enum.includes("output_budget_exceeded"));
  assert.equal(result.properties.context.maxLength, 20000);
  assert.deepEqual(result.properties.project.properties.session_attachment.enum, ["legacy", "attached", "detached"]);
  assert.match(result.$comment, /selected contract, staged and inactive/);

  assert.match(guide, /runs for both SessionStart and UserPromptSubmit/);
  assert.match(guide, /forces? `managed_legacy`/);
  assert.match(guide, /upstream scripts remain pristine/);
  assert.match(guide, /does not require a multi-target importer\/ledger upgrade/);
  assert.match(guide, /filenames intentionally do not carry a `candidate` suffix/);
  assert.match(guide, /not yet part of the alpha\.2\ntrusted artifact graph/);
  assert.match(options, /Phase 3 使用路线 B/);
  assert.match(options, /Integration Driver ABI/);

  assert.equal((bundle.local_files || []).some(item => item.id === "owned_plan"), false);
  assert.equal((upstream.managed_runtime.local_files || []).some(item => item.id === "owned_plan"), false);
  assert.equal(artifact.entries.some(item => item.path === "runtime/owned-plan.py"), false);
  assert.equal(artifact.entries.some(item => item.path === "contracts/adapter-plan-context-request-v1.schema.json"), false);
  assert.equal(artifact.entries.length, 18);
});
