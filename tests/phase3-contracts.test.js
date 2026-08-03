"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

test("Phase 3 Round 3 installs the exact-v1 canonical plan-context path without dispatching it", () => {
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
  assert.match(request.$comment, /implemented and installed by inactive Round 3/);
  assert.match(request.$comment, /excluded from adapter dispatch/);

  assert.equal(result.properties.schema_version.const, 1);
  assert.ok(result.properties.outcome.enum.includes("context_emitted"));
  assert.ok(result.properties.outcome.enum.includes("plan_state_changed"));
  assert.ok(result.properties.outcome.enum.includes("output_budget_exceeded"));
  assert.equal(result.properties.context.maxLength, 20000);
  assert.deepEqual(result.properties.project.properties.session_attachment.enum, ["legacy", "attached", "detached"]);
  assert.match(result.$comment, /implemented and installed by inactive Round 3/);

  assert.match(guide, /runs for both SessionStart and UserPromptSubmit/);
  assert.match(guide, /forces? `managed_legacy`/);
  assert.match(guide, /upstream scripts remain pristine/);
  assert.match(guide, /does not require a multi-target importer\/ledger upgrade/);
  assert.match(guide, /filenames intentionally do not carry a `candidate` suffix/);
  assert.match(guide, /inactive Round 3 trusted graph/);
  assert.match(options, /Phase 3 使用路线 B/);
  assert.match(options, /Integration Driver ABI/);

  assert.equal((bundle.local_files || []).some(item => item.id === "owned_plan"), true);
  assert.equal((upstream.managed_runtime.local_files || []).some(item => item.id === "owned_plan"), true);
  assert.equal(artifact.entries.some(item => item.path === "runtime/owned-plan.py"), true);
  assert.equal(artifact.entries.some(item => item.path === "contracts/adapter-plan-context-request-v1.schema.json"), true);
  assert.equal(artifact.entries.some(item => item.path === "contracts/plan-context-result-v1.schema.json"), true);
  assert.equal(artifact.entries.length, 21);
  const adapter = fs.readFileSync(path.join(root, "hooks", "hook_adapter.py"), "utf8");
  assert.match(adapter, /"plan": "owned-plan\.py"/);
  assert.match(adapter, /def build_plan_context_request\(/);
  assert.match(adapter, /def _valid_plan_context_result\(/);
  assert.match(adapter, /def invoke_plan_runtime\(/);
  assert.match(adapter, /ADAPTER_DEADLINE_SECONDS = 27\.0/);
  assert.match(adapter, /CATCHUP_SECONDS = 15\.0/);
  assert.match(adapter, /FINALIZATION_RESERVE_SECONDS = 1\.0/);
  assert.doesNotMatch(adapter, /subprocess\.run\(/);
  assert.match(adapter, /sibling_runtime_path\("catchup"\)/);
  assert.doesNotMatch(adapter, /sibling_runtime_path\("plan"\)/);
});
