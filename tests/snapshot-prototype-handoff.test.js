"use strict";

// Keep the repository-wide suite aware of the independently runnable handoff
// without making the handoff depend on the parent repository.
require("../snapshot-prototype/tests/snapshot-prototype.test.js");

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

test("snapshot handoff remains outside production runtime, Release, and adapter dispatch", () => {
  const runtime = fs.readFileSync(path.join(ROOT, "contracts", "runtime-bundle-v1.json"), "utf8");
  const release = fs.readFileSync(path.join(ROOT, "contracts", "release-artifact-v1.json"), "utf8");
  const adapter = fs.readFileSync(path.join(ROOT, "hooks", "hook_adapter.py"), "utf8");
  for (const content of [runtime, release, adapter]) {
    assert.doesNotMatch(content, /snapshot-prototype|prototype_snapshot_runner/);
  }
});
