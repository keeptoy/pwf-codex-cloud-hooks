"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const fileHash = file => sha256(fs.readFileSync(file));

function tripleQuotedConstant(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped} = \"\"\"([\\s\\S]*?)\"\"\"`));
  assert.ok(match, `${name} was not found in the compatibility patcher`);
  return match[1];
}

test("Phase 1 contracts and Round 2 manifest freeze provenance, overlays, host protocol, and artifact boundary", () => {
  const bundle = readJson("contracts/runtime-bundle-v1.json");
  const overlays = readJson("contracts/compatibility-overlays-v1.json");
  const request = readJson("contracts/adapter-runtime-request-v1.schema.json");
  const result = readJson("contracts/runtime-result-v1.schema.json");
  const artifact = readJson("contracts/release-artifact-v1.json");
  const upstream = readJson("upstream-manifest.json");

  assert.equal(bundle.schema_version, 1);
  assert.equal(upstream.schema_version, 3);
  assert.equal(bundle.upstream.repository, upstream.upstream);
  assert.equal(bundle.upstream.release, upstream.release);
  assert.equal(bundle.upstream.commit, upstream.commit);
  assert.equal(bundle.upstream.release_archive_sha256, upstream.release_archive_sha256);
  assert.equal(bundle.upstream.release_archive_url, upstream.release_archive_url);
  assert.equal(bundle.upstream.license_sha256, upstream.managed_runtime.license_provenance.upstream_sha256);
  assert.equal(bundle.upstream.canonical_source_root, "skills/planning-with-files");

  const files = new Map(bundle.files.map(file => [file.id, file]));
  assert.equal(files.size, bundle.files.length);
  assert.deepEqual([...files.keys()], ["session_catchup", "resolve_plan_dir", "inject_plan", "ledger_summary"]);
  for (const file of files.values()) {
    assert.match(file.source_path, /^skills\/planning-with-files\/scripts\/[A-Za-z0-9._-]+$/);
    assert.match(file.package_path, /^runtime\/upstream\/[A-Za-z0-9._-]+$/);
    assert.match(file.installed_path, /^hooks\/planning-with-files\/upstream\/[A-Za-z0-9._-]+$/);
    assert.match(file.pristine_sha256, /^[a-f0-9]{64}$/);
    assert.match(file.managed_sha256, /^[a-f0-9]{64}$/);
    assert.equal(file.mode, "0755");
    for (const dependency of file.direct_file_dependencies) {
      assert.ok(files.has(dependency.id), `${file.id} has unknown dependency ${dependency.id}`);
    }
  }
  assert.equal(files.get("ledger_summary").direct_file_dependencies[0].id, "resolve_plan_dir");
  assert.equal(files.get("inject_plan").direct_file_dependencies[0].condition, "mode=autonomous|gated");

  const fixtureRoot = path.join(root, "tests", "fixtures", "planning-with-files");
  assert.equal(fileHash(path.join(fixtureRoot, "scripts", "session-catchup.py")), files.get("session_catchup").pristine_sha256);
  assert.equal(fileHash(path.join(fixtureRoot, "scripts", "resolve-plan-dir.sh")), files.get("resolve_plan_dir").pristine_sha256);
  const referenceRoot = path.join(root, "planning-with-files-3.8.2");
  if (fs.existsSync(referenceRoot)) {
    for (const file of files.values()) {
      assert.equal(fileHash(path.join(referenceRoot, file.source_path)), file.pristine_sha256, file.id);
    }
  }
  const admittedSources = new Set(bundle.files.map(file => file.source_path));
  for (const deferred of bundle.deferred_upstream_candidates) {
    assert.equal(admittedSources.has(deferred.source_path), false, deferred.source_path);
    assert.ok(deferred.earliest_phase >= 4);
  }

  assert.equal(overlays.schema_version, 1);
  assert.equal(overlays.combined_legacy_patch_id, "PWF_CODEX_CLOUD_COMPAT_PATCH");
  assert.equal(overlays.pristine_sha256, files.get("session_catchup").pristine_sha256);
  assert.equal(overlays.managed_sha256, files.get("session_catchup").managed_sha256);
  assert.equal(overlays.overlays.length, 4);
  assert.deepEqual(new Set(overlays.application_order), new Set(overlays.overlays.map(item => item.id)));
  assert.deepEqual(new Set(files.get("session_catchup").overlay_ids), new Set(overlays.application_order));

  const patcher = fs.readFileSync(path.join(root, "patches", "patch_planning_skill.py"), "utf8");
  for (const overlay of overlays.overlays) {
    assert.equal(overlay.owner, "pwf-codex-cloud-hooks");
    assert.ok(overlay.retirement_condition.length > 40);
    assert.ok(overlay.cloud_evidence.every(relative => fs.existsSync(path.join(root, relative))));
    const anchor = tripleQuotedConstant(patcher, overlay.anchor.patcher_constant);
    assert.equal(sha256(anchor), overlay.anchor.pristine_anchor_sha256);
  }
  assert.equal(upstream.compatibility_patches[overlays.combined_legacy_patch_id].upstream_sha256, overlays.pristine_sha256);
  assert.equal(upstream.compatibility_patches[overlays.combined_legacy_patch_id].patched_sha256, overlays.managed_sha256);

  assert.equal(upstream.managed_runtime.schema_version, 1);
  assert.equal(upstream.managed_runtime.package_root, bundle.package_root);
  assert.deepEqual(
    upstream.managed_runtime.files.map(item => item.id),
    bundle.files.map(item => item.id),
  );
  for (const managed of upstream.managed_runtime.files) {
    const frozen = files.get(managed.id);
    for (const key of ["source_path", "package_path", "mode", "origin", "pristine_sha256", "managed_sha256"]) {
      assert.equal(managed[key], frozen[key], `${managed.id}.${key}`);
    }
    assert.equal(fileHash(path.join(root, managed.package_path)), managed.managed_sha256, managed.id);
  }
  for (const contract of Object.values(upstream.managed_runtime.contracts)) {
    assert.equal(fileHash(path.join(root, contract.path)), contract.sha256, contract.path);
  }
  assert.equal(bundle.local_files.length, 1);
  assert.equal(bundle.local_files[0].id, "owned_catchup");
  assert.equal(bundle.local_files[0].activation_phase, 2);
  assert.deepEqual(bundle.local_files[0].direct_file_dependencies, [{ id: "session_catchup", condition: "always", required: true }]);
  assert.equal(fileHash(path.join(root, bundle.local_files[0].package_path)), bundle.local_files[0].sha256);
  assert.deepEqual(upstream.managed_runtime.local_files, [{
    id: "owned_catchup",
    package_path: "runtime/owned-catchup.py",
    mode: "0755",
    origin: "local_managed_runtime",
    sha256: bundle.local_files[0].sha256,
  }]);
  assert.equal(fileHash(path.join(root, upstream.managed_runtime.importer.path)), upstream.managed_runtime.importer.sha256);
  assert.equal(fileHash(path.join(root, upstream.managed_runtime.license_provenance.notice_path)), upstream.managed_runtime.license_provenance.notice_sha256);

  assert.equal(request.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(request.additionalProperties, false);
  assert.deepEqual(request.required, ["schema_version", "runtime", "event", "project", "transcript", "output_budget"]);
  assert.deepEqual(request.properties.project.required, ["root", "planning_enabled", "session_attachment", "plan_state", "plan_scope", "plan_dir"]);
  assert.deepEqual(request.properties.project.properties.session_attachment.enum, ["legacy", "attached", "detached"]);
  assert.equal(request.properties.event.properties.session_id.pattern, "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");
  assert.equal(request.properties.output_budget.properties.max_report_chars.const, 20000);
  assert.equal(request.properties.output_budget.properties.max_messages.const, 15);
  assert.equal(request.properties.output_budget.properties.user_head_chars.const, 350);
  assert.equal(request.properties.output_budget.properties.user_tail_chars.const, 650);
  assert.equal(request.properties.output_budget.properties.truncation_marker.const, "...[truncated]...");
  assert.equal(Object.hasOwn(request.properties, "prompt"), false);

  assert.equal(result.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(result.additionalProperties, false);
  assert.ok(result.$defs.outcome.enum.includes("report_emitted"));
  assert.ok(result.$defs.outcome.enum.includes("diagnostic_report_available"));
  assert.ok(result.$defs.outcome.enum.includes("planning_disabled"));
  assert.ok(result.$defs.outcome.enum.includes("session_not_attached"));
  assert.ok(result.$defs.outcome.enum.includes("no_plan"));
  assert.ok(result.$defs.outcome.enum.includes("runtime_error"));
  assert.ok(result.$defs.outcome.enum.includes("malformed_transcript"));
  assert.ok(result.$defs.outcome.enum.includes("transcript_unreadable"));
  assert.ok(result.properties.diagnostic.required.includes("planning_enabled"));
  assert.ok(result.properties.diagnostic.required.includes("session_attachment"));
  assert.ok(result.properties.diagnostic.required.includes("selected_transcript_path"));
  assert.ok(result.properties.diagnostic.required.includes("selected_plan_dir"));
  assert.ok(result.properties.warnings.items.enum.includes("invalid_utf8_record"));
  assert.ok(result.properties.warnings.items.enum.includes("invalid_json_record"));
  assert.ok(result.properties.warnings.items.enum.includes("record_too_large"));
  assert.equal(result.properties.report.maxLength, 20000);

  assert.equal(artifact.archive_root, "pwf-codex-cloud-hooks/");
  assert.equal(artifact.ordering, "lexicographic_by_utf8_path");
  assert.equal(artifact.external_release_assets.length, 1);
  assert.equal(artifact.external_release_assets[0].path, "init-cloud-sandbox-v0.3.0.bash");
  const artifactPaths = artifact.entries.map(entry => entry.path);
  assert.equal(new Set(artifactPaths).size, artifactPaths.length);
  assert.equal(artifactPaths.includes("init-cloud-sandbox-v0.3.0.bash"), false);
  for (const entry of artifact.entries.filter(entry => entry.state === "present")) {
    assert.equal(fs.existsSync(path.join(root, entry.path)), true, entry.path);
  }
  for (const forbidden of artifact.excluded_prefixes) {
    assert.equal(artifactPaths.some(entry => entry === forbidden.slice(0, -1) || entry.startsWith(forbidden)), false, forbidden);
  }
});
