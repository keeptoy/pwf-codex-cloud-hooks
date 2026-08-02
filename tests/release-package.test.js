"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const builder = path.join(root, "tools", "build_release.py");
const contract = path.join(root, "contracts", "release-artifact-v1.json");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function run(command, archive) {
  const flag = command === "build" ? "--output" : "--archive";
  return spawnSync(python, [builder, command, "--contract", contract, flag, archive], { encoding: "utf8" });
}

test("Release ZIP build is deterministic, exact, and keeps bootstrap external", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-release-build-"));
  const first = path.join(workspace, "first.zip"), second = path.join(workspace, "second.zip");
  try {
    let result = run("build", first); assert.equal(result.status, 0, result.stderr);
    const firstResult = JSON.parse(result.stdout);
    result = run("build", second); assert.equal(result.status, 0, result.stderr);
    const secondResult = JSON.parse(result.stdout);
    assert.equal(sha256(first), sha256(second));
    assert.equal(firstResult.sha256, secondResult.sha256);
    assert.equal(firstResult.entries, 18);
    assert.ok(firstResult.size > 0);
    result = run("check", first); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).healthy, true);

    const artifact = JSON.parse(fs.readFileSync(contract, "utf8"));
    assert.equal(artifact.entries.some(entry => entry.path === "init-cloud-sandbox-v0.3.0.bash"), false);
    assert.deepEqual(artifact.external_release_assets.map(entry => entry.path), ["init-cloud-sandbox-v0.3.0.bash"]);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
