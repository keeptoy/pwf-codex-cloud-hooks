"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const importer = path.join(root, "tools", "import_upstream_runtime.py");
const bundlePath = path.join(root, "contracts", "runtime-bundle-v1.json");
const overlaysPath = path.join(root, "contracts", "compatibility-overlays-v1.json");
const fixtureSkill = path.join(root, "tests", "fixtures", "planning-with-files");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

const license = `MIT License

Copyright (c) 2026 Ahmad Adi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function writeFile(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function makeZip(source, archive) {
  const script = [
    "import pathlib, sys, zipfile",
    "source = pathlib.Path(sys.argv[1])",
    "archive = pathlib.Path(sys.argv[2])",
    "with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:",
    "    for item in sorted(source.rglob('*')):",
    "        if item.is_file():",
    "            output.write(item, 'planning-with-files-3.8.2/' + item.relative_to(source).as_posix())",
  ].join("\n");
  const result = spawnSync(python, ["-c", script, source, archive], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return sha256(fs.readFileSync(archive));
}

function createFixture() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "pwf-runtime-import-"));
  const source = path.join(workspace, "source");
  const scripts = path.join(source, "skills", "planning-with-files", "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  fs.copyFileSync(path.join(fixtureSkill, "scripts", "session-catchup.py"), path.join(scripts, "session-catchup.py"));
  fs.copyFileSync(path.join(fixtureSkill, "scripts", "resolve-plan-dir.sh"), path.join(scripts, "resolve-plan-dir.sh"));
  writeFile(path.join(scripts, "inject-plan.sh"), "#!/bin/sh\necho synthetic-inject\n");
  writeFile(path.join(scripts, "ledger-summary.sh"), "#!/bin/sh\necho synthetic-ledger\n");
  writeFile(path.join(source, "LICENSE"), license);

  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  bundle.upstream.license_sha256 = sha256(Buffer.from(license));
  for (const item of bundle.files) {
    const pristine = fs.readFileSync(path.join(source, item.source_path));
    if (item.id !== "session_catchup") {
      item.pristine_sha256 = sha256(pristine);
      item.managed_sha256 = item.pristine_sha256;
    }
  }
  const archive = path.join(workspace, "upstream.zip");
  bundle.upstream.release_archive_sha256 = makeZip(source, archive);
  const contract = path.join(workspace, "runtime-bundle.json");
  fs.writeFileSync(contract, `${JSON.stringify(bundle, null, 2)}\n`);
  return { workspace, source, archive, contract, destination: path.join(workspace, "runtime", "upstream") };
}

function runImporter(fixture, command, extra = []) {
  const args = [
    importer,
    command,
    "--destination", fixture.destination,
    "--bundle", fixture.contract,
    "--overlays", overlaysPath,
    ...extra,
  ];
  if (command === "import") args.push("--archive", fixture.archive);
  return spawnSync(python, args, { encoding: "utf8" });
}

test("runtime import is allowlisted, deterministic, idempotent, and checkable", () => {
  const repositoryBundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  const importedPaths = repositoryBundle.files.map(item => item.package_path);
  const index = spawnSync("git", ["ls-files", "--stage", "--", ...importedPaths], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(index.status, 0, index.stderr);
  const indexedModes = new Map(index.stdout.trim().split(/\r?\n/).map(line => {
    const match = line.match(/^(\d{6}) [0-9a-f]+ \d+\t(.+)$/);
    assert.ok(match, `unexpected git ls-files output: ${line}`);
    return [match[2].replaceAll("\\", "/"), match[1]];
  }));
  assert.deepEqual([...indexedModes.keys()].sort(), [...importedPaths].sort());
  for (const importedPath of importedPaths) {
    assert.equal(indexedModes.get(importedPath), "100755", importedPath);
  }

  const fixture = createFixture();
  try {
    let result = runImporter(fixture, "import");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).changed, true);

    const bundle = JSON.parse(fs.readFileSync(fixture.contract, "utf8"));
    const actual = fs.readdirSync(fixture.destination).sort();
    assert.deepEqual(actual, bundle.files.map(item => path.basename(item.package_path)).sort());
    for (const item of bundle.files) {
      const target = path.join(fixture.destination, path.basename(item.package_path));
      assert.equal(sha256(fs.readFileSync(target)), item.managed_sha256, item.id);
    }

    result = runImporter(fixture, "import");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).changed, false);
    result = runImporter(fixture, "check");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).healthy, true);

    const second = path.join(fixture.workspace, "upstream-second.zip");
    assert.equal(makeZip(fixture.source, second), sha256(fs.readFileSync(fixture.archive)));
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("runtime import rejects archive checksum and pristine source drift", () => {
  const fixture = createFixture();
  try {
    let bundle = JSON.parse(fs.readFileSync(fixture.contract, "utf8"));
    bundle.upstream.release_archive_sha256 = "0".repeat(64);
    fs.writeFileSync(fixture.contract, `${JSON.stringify(bundle, null, 2)}\n`);
    let result = runImporter(fixture, "import");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /release archive SHA-256 mismatch/);

    fs.appendFileSync(path.join(fixture.source, "skills", "planning-with-files", "scripts", "session-catchup.py"), "# drift\n");
    bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
    const prior = JSON.parse(fs.readFileSync(fixture.contract, "utf8"));
    bundle.upstream.license_sha256 = prior.upstream.license_sha256;
    bundle.upstream.release_archive_sha256 = makeZip(fixture.source, fixture.archive);
    for (const item of bundle.files) {
      if (item.id !== "session_catchup") {
        const content = fs.readFileSync(path.join(fixture.source, item.source_path));
        item.pristine_sha256 = sha256(content);
        item.managed_sha256 = item.pristine_sha256;
      }
    }
    fs.writeFileSync(fixture.contract, `${JSON.stringify(bundle, null, 2)}\n`);
    result = runImporter(fixture, "import");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pristine SHA-256 mismatch for session_catchup/);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("runtime check and re-import reject changed or unknown destination content", () => {
  const fixture = createFixture();
  try {
    let result = runImporter(fixture, "import");
    assert.equal(result.status, 0, result.stderr);
    fs.writeFileSync(path.join(fixture.destination, "unknown.sh"), "unknown\n");
    result = runImporter(fixture, "check");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown=.*unknown\.sh/);
    result = runImporter(fixture, "import");
    assert.equal(result.status, 1);

    fs.rmSync(path.join(fixture.destination, "unknown.sh"));
    fs.mkdirSync(path.join(fixture.destination, "unknown-directory"));
    result = runImporter(fixture, "check");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown=.*unknown-directory/);
    fs.rmdirSync(path.join(fixture.destination, "unknown-directory"));
    fs.appendFileSync(path.join(fixture.destination, "inject-plan.sh"), "drift\n");
    result = runImporter(fixture, "check");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /runtime SHA-256 mismatch for inject_plan/);
    result = runImporter(fixture, "import");
    assert.equal(result.status, 1);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});
