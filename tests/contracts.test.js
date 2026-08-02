"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function tripleQuotedConstant(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped} = \"\"\"([\\s\\S]*?)\"\"\"`));
  assert.ok(match, `${name} was not found in the compatibility patcher`);
  return match[1];
}

test("Phase 1 Round 1 freezes provenance, overlays, host protocol, fixtures, and artifact boundary", () => {
  const bundle = readJson("contracts/runtime-bundle-v1.json");
  const overlays = readJson("contracts/compatibility-overlays-v1.json");
  const request = readJson("contracts/adapter-runtime-request-v1.schema.json");
  const result = readJson("contracts/runtime-result-v1.schema.json");
  const artifact = readJson("contracts/release-artifact-v1.json");
  const upstream = readJson("upstream-manifest.json");
  const requestFixture = readJson("tests/fixtures/contracts/adapter-runtime-request-v1.json");
  const resultFixture = readJson("tests/fixtures/contracts/runtime-results-v1.json");

  assert.equal(bundle.schema_version, 1);
  assert.equal(bundle.upstream.repository, upstream.upstream);
  assert.equal(bundle.upstream.release, upstream.release);
  assert.equal(bundle.upstream.commit, upstream.commit);
  assert.equal(bundle.upstream.release_archive_sha256, upstream.release_archive_sha256);

  const files = new Map(bundle.files.map(file => [file.id, file]));
  assert.deepEqual([...files.keys()], ["session_catchup", "resolve_plan_dir", "inject_plan", "ledger_summary"]);
  for (const file of files.values()) {
    assert.match(file.source_path, /^skills\/planning-with-files\/scripts\/[A-Za-z0-9._-]+$/);
    assert.match(file.package_path, /^runtime\/upstream\/[A-Za-z0-9._-]+$/);
    assert.match(file.pristine_sha256, /^[a-f0-9]{64}$/);
    assert.match(file.managed_sha256, /^[a-f0-9]{64}$/);
    for (const dependency of file.direct_file_dependencies) {
      assert.ok(files.has(dependency.id), `${file.id} has unknown dependency ${dependency.id}`);
    }
  }
  assert.equal(files.get("ledger_summary").direct_file_dependencies[0].id, "resolve_plan_dir");
  assert.equal(files.get("inject_plan").direct_file_dependencies[0].condition, "mode=autonomous|gated");
  assert.ok(bundle.deferred_upstream_candidates.every(item => item.earliest_phase >= 4));

  assert.equal(overlays.overlays.length, 4);
  assert.deepEqual(new Set(overlays.application_order), new Set(overlays.overlays.map(item => item.id)));
  assert.deepEqual(new Set(files.get("session_catchup").overlay_ids), new Set(overlays.application_order));
  const patcher = fs.readFileSync(path.join(root, "patches/patch_planning_skill.py"), "utf8");
  for (const overlay of overlays.overlays) {
    assert.equal(overlay.owner, "pwf-codex-cloud-hooks");
    assert.ok(overlay.reason.length > 20);
    assert.ok(overlay.retirement_condition.length > 40);
    assert.ok(overlay.cloud_evidence.every(relative => fs.existsSync(path.join(root, relative))));
    assert.equal(sha256(tripleQuotedConstant(patcher, overlay.anchor.patcher_constant)), overlay.anchor.pristine_anchor_sha256);
  }

  assert.equal(request.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(request.additionalProperties, false);
  assert.equal(requestFixture.schema_version, 1);
  assert.equal(requestFixture.runtime, "codex");
  assert.equal(requestFixture.event.name, "SessionStart");
  assert.equal(requestFixture.transcript.host_path_state, "validated");
  assert.equal(requestFixture.output_budget.max_report_chars, 20000);
  assert.equal(Object.hasOwn(requestFixture, "prompt"), false);

  assert.equal(result.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.ok(result.$defs.outcome.enum.includes("report_emitted"));
  assert.ok(result.$defs.outcome.enum.includes("no_plan"));
  assert.ok(result.$defs.outcome.enum.includes("runtime_error"));
  assert.deepEqual(resultFixture.map(item => item.outcome), ["report_emitted", "no_plan", "runtime_error"]);
  assert.equal(resultFixture[0].inject, true);
  assert.ok(resultFixture.slice(1).every(item => item.inject === false && item.report === null));

  assert.equal(artifact.archive_root, "pwf-codex-cloud-hooks/");
  assert.equal(artifact.external_release_assets[0].path, "init-cloud-sandbox-v0.3.0.bash");
  const artifactPaths = artifact.entries.map(entry => entry.path);
  assert.equal(new Set(artifactPaths).size, artifactPaths.length);
  assert.equal(artifactPaths.includes("init-cloud-sandbox-v0.3.0.bash"), false);
  for (const entry of artifact.entries.filter(entry => entry.state === "present")) {
    assert.equal(fs.existsSync(path.join(root, entry.path)), true, entry.path);
  }
  for (const entry of artifact.entries.filter(entry => entry.state === "planned")) {
    assert.equal(entry.activation_round >= 2, true, entry.path);
  }
});
