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
const betaZipSha256 = "812cc9cdcafa93b5fcc47cc763fd743f11be77958b75eea1fa4cf0508dd391ab";
const betaBootstrapSha256 = "d572b77d920b34c34c7912ba364376ae3668216f00ce350251bd7c8b336abcd6";

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
    assert.equal(firstResult.entries, 22);
    assert.ok(firstResult.size > 0);
    result = run("check", first); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).healthy, true);

    const artifact = JSON.parse(fs.readFileSync(contract, "utf8"));
    const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.equal(packageMetadata.version, "0.3.0-beta.2");
    assert.equal(artifact.entries.some(entry => entry.path === "tools/build_release.py"), true);
    assert.equal(artifact.entries.some(entry => entry.path === "init-cloud-sandbox-v0.3.0.bash"), false);
    assert.deepEqual(artifact.external_release_assets.map(entry => entry.path), ["init-cloud-sandbox-v0.3.0.bash"]);
    assert.deepEqual(artifact.checksum_workflow, [
      "freeze all required entries",
      "import and verify allowlisted upstream files",
      "build deterministic ZIP from this exact entry list",
      "inspect entry list and compute ZIP SHA-256",
      "write the exact version, package name, and ZIP SHA-256 into the external bootstrap",
      "compute the sealed external bootstrap SHA-256",
      "publish both immutable assets",
      "download both published assets and verify their SHA-256 values",
    ]);
    assert.equal(
      sha256(path.join(root, "init-cloud-sandbox-v0.3.0.bash")),
      betaBootstrapSha256,
    );
    const betaAcceptance = fs.readFileSync(
      path.join(root, "docs", "v0.3.0-beta.2-cloud-hard-acceptance.md"),
      "utf8",
    );
    assert.doesNotMatch(betaAcceptance, /__PWF_BETA2_/);
    assert.match(betaAcceptance, new RegExp(betaZipSha256, "g"));
    assert.match(betaAcceptance, new RegExp(betaBootstrapSha256, "g"));

    const releasePaths = [
      ...artifact.entries.map(entry => entry.path),
      ...artifact.external_release_assets.map(entry => entry.path),
    ];
    const attributes = spawnSync("git", ["check-attr", "eol", "--", ...releasePaths], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(attributes.status, 0, attributes.stderr);
    const eolByPath = new Map(attributes.stdout.trim().split(/\r?\n/).map(line => {
      const match = line.match(/^(.*): eol: (.*)$/);
      assert.ok(match, `unexpected git check-attr output: ${line}`);
      return [match[1].replaceAll("\\", "/"), match[2]];
    }));
    assert.deepEqual([...eolByPath.keys()].sort(), [...releasePaths].sort());
    for (const releasePath of releasePaths) assert.equal(eolByPath.get(releasePath), "lf", releasePath);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
