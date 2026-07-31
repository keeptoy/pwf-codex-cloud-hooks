#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = __dirname;
const VERSION = require("./package.json").version;
const UPSTREAM = require("./upstream-manifest.json");
const OWNER = "pwf-codex-cloud-hooks";
const OWNED_SEGMENT = `${path.sep}hooks${path.sep}planning-with-files${path.sep}hook_adapter.py`;

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function fileHash(file) { return sha256(fs.readFileSync(file)); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function quoteCommand(value) { return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`; }
function tomlEscape(value) { return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
function atomicWrite(file, content, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, content, { encoding: "utf8", mode });
  fs.renameSync(temp, file);
  fs.chmodSync(file, mode);
}
function atomicJson(file, value) { atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`); }
function parseJson(file, fallback) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; }
function pathsFor(codexHome) {
  const home = path.resolve(codexHome);
  if (!path.isAbsolute(codexHome) || home === path.parse(home).root) throw new Error("--codex-home must be an absolute non-root path");
  return {
    home,
    config: path.join(home, "config.toml"),
    hooks: path.join(home, "hooks.json"),
    runtime: path.join(home, "hooks", "planning-with-files"),
    adapter: path.join(home, "hooks", "planning-with-files", "hook_adapter.py"),
    manifest: path.join(home, "hooks", "planning-with-files", "installed-manifest.json"),
    lock: path.join(home, ".pwf-codex-cloud-hooks.lock"),
    backups: path.join(home, "backups", "planning-with-files-hooks"),
  };
}
function resolveSkill(explicit, codexHome) {
  const candidates = explicit ? [path.resolve(explicit)] : [
    path.join(os.homedir(), ".agents", "skills", "planning-with-files"),
    path.join(codexHome, "skills", "planning-with-files"),
    path.join(os.homedir(), ".codex", "skills", "planning-with-files"),
  ];
  const skill = candidates.find(p => fs.existsSync(path.join(p, "SKILL.md")));
  if (!skill) throw new Error("planning-with-files SKILL.md was not found in an approved global location");
  for (const [relative, expected] of Object.entries(UPSTREAM.required_skill_files)) {
    const file = path.join(skill, relative);
    if (!fs.existsSync(file) || fileHash(file) !== expected) throw new Error(`BLOCKED_UPSTREAM_OR_INSTALL_DRIFT: ${relative}`);
  }
  return skill;
}
function requiredHooks(adapter) {
  const command = event => `python3 ${quoteCommand(adapter)} ${event}`;
  return {
    SessionStart: [{ matcher: "startup|resume|clear|compact", hooks: [{ type: "command", command: command("SessionStart"), timeout: 30, statusMessage: "Loading planning context" }] }],
    UserPromptSubmit: [{ hooks: [{ type: "command", command: command("UserPromptSubmit"), timeout: 30, statusMessage: "Refreshing planning context" }] }],
  };
}
function owned(handler) { return handler && handler.type === "command" && String(handler.command || "").includes(OWNED_SEGMENT); }
function removeOwned(hooksConfig) {
  const value = structuredClone(hooksConfig || {}); value.hooks = value.hooks && typeof value.hooks === "object" ? value.hooks : {};
  for (const event of Object.keys(value.hooks)) {
    value.hooks[event] = (Array.isArray(value.hooks[event]) ? value.hooks[event] : []).map(group => ({ ...group, hooks: (Array.isArray(group.hooks) ? group.hooks : []).filter(h => !owned(h)) })).filter(group => group.hooks.length);
    if (!value.hooks[event].length) delete value.hooks[event];
  }
  return value;
}
function mergeHooks(current, required) {
  const value = removeOwned(current); value.hooks ||= {};
  for (const [event, groups] of Object.entries(required)) value.hooks[event] = [...(value.hooks[event] || []), ...groups];
  return value;
}
function hookHash(event, group, handler) {
  const normalized = { type: "command", command: String(handler.command), timeout: Math.max(1, Number.parseInt(handler.timeout || 600, 10)), async: Boolean(handler.async || false) };
  if (handler.statusMessage != null) normalized.statusMessage = String(handler.statusMessage);
  const identity = { event_name: event, hooks: [normalized] };
  if (group.matcher) identity.matcher = String(group.matcher);
  return `sha256:${sha256(canonical(identity))}`;
}
function ownedEntries(hooksPath, config) {
  const result = [];
  for (const [event, groups] of Object.entries(config.hooks || {})) (groups || []).forEach((group, gi) => (group.hooks || []).forEach((handler, hi) => {
    if (!owned(handler)) return;
    const rawKey = `${hooksPath}:${event}:${gi}:${hi}`;
    result.push({ event, groupIndex: gi, handlerIndex: hi, rawKey, fileKey: `file:${rawKey}`, hash: hookHash(event, group, handler), command: handler.command });
  }));
  return result;
}
function stripTrustToml(text, entries = []) {
  const names = new Set(entries.flatMap(entry => [entry.rawKey, entry.fileKey]).map(key => `hooks.state."${tomlEscape(key)}"`));
  const lines = String(text || "").split("\n"), output = []; let skip = false;
  for (const line of lines) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (section) skip = names.has(section[1]);
    if (!skip) output.push(line);
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}
function enableHooks(text) {
  let lines = String(text || "").split("\n"), start = lines.findIndex(x => x.trim() === "[features]");
  if (start < 0) return `${lines.join("\n").trimEnd()}${lines.join("\n").trim() ? "\n\n" : ""}[features]\nhooks = true\n`;
  let end = lines.length; for (let i = start + 1; i < lines.length; i++) if (/^\s*\[/.test(lines[i])) { end = i; break; }
  const index = lines.slice(start + 1, end).findIndex(x => /^\s*hooks\s*=/.test(x));
  if (index >= 0) lines[start + 1 + index] = "hooks = true"; else lines.splice(start + 1, 0, "hooks = true");
  return `${lines.join("\n").trimEnd()}\n`;
}
function trustToml(text, entries, previousEntries = []) {
  let result = enableHooks(stripTrustToml(text, [...previousEntries, ...entries])); const blocks = [];
  for (const entry of entries) for (const key of [entry.rawKey, entry.fileKey]) blocks.push(`[hooks.state."${tomlEscape(key)}"]\nenabled = true\ntrusted_hash = "${entry.hash}"`);
  return `${result.trimEnd()}\n\n${blocks.join("\n\n")}\n`;
}
function acquire(paths) { fs.mkdirSync(paths.home, { recursive: true, mode: 0o700 }); fs.mkdirSync(paths.lock, { mode: 0o700 }); return () => fs.rmSync(paths.lock, { recursive: true, force: true }); }
function timestamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }
function backup(paths) {
  const dir = path.join(paths.backups, timestamp()); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const file of [paths.config, paths.hooks, paths.runtime]) if (fs.existsSync(file)) fs.cpSync(file, path.join(dir, path.relative(paths.home, file)), { recursive: true, force: true });
  return dir;
}
function buildManifest(paths, skill, entries) {
  return { schema_version: 1, owner: OWNER, installer_version: VERSION, upstream: UPSTREAM, skill_root: skill, adapter_sha256: fileHash(paths.adapter), hooks_file: paths.hooks, entries };
}
function install(options) {
  const paths = pathsFor(options.codexHome), skill = resolveSkill(options.skillRoot, paths.home);
  const current = parseJson(paths.hooks, { hooks: {} }), proposed = mergeHooks(current, requiredHooks(paths.adapter));
  const previousEntries = fs.existsSync(paths.manifest) ? parseJson(paths.manifest, {}).entries || [] : [];
  const previewEntries = ownedEntries(paths.hooks, proposed);
  if (previewEntries.length !== 2) throw new Error(`expected 2 owned handlers, found ${previewEntries.length}`);
  if (options.dryRun) return { action: "dry-run", codex_home: paths.home, skill_root: skill, entries: previewEntries, changed: true };
  const release = acquire(paths); try {
    const backupDir = backup(paths);
    fs.mkdirSync(paths.runtime, { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(ROOT, "hooks", "hook_adapter.py"), paths.adapter); fs.chmodSync(paths.adapter, 0o755);
    const hooks = mergeHooks(current, requiredHooks(paths.adapter)), entries = ownedEntries(paths.hooks, hooks);
    atomicJson(paths.hooks, hooks);
    atomicWrite(paths.config, trustToml(fs.existsSync(paths.config) ? fs.readFileSync(paths.config, "utf8") : "", entries, previousEntries));
    atomicJson(paths.manifest, buildManifest(paths, skill, entries));
    const checked = doctor({ codexHome: paths.home, skillRoot: skill });
    return { ...checked, action: "install", backup: backupDir };
  } finally { release(); }
}
function doctor(options) {
  const paths = pathsFor(options.codexHome), skill = resolveSkill(options.skillRoot, paths.home);
  const errors = [];
  const adapterExists = fs.existsSync(paths.adapter);
  if (!adapterExists) errors.push("adapter missing");
  const hooks = parseJson(paths.hooks, { hooks: {} }), entries = ownedEntries(paths.hooks, hooks);
  if (entries.length !== 2) errors.push(`owned handler count ${entries.length}, expected 2`);
  if (!fs.existsSync(paths.manifest)) errors.push("installed manifest missing");
  else {
    const manifest = parseJson(paths.manifest, {});
    if (adapterExists && manifest.adapter_sha256 !== fileHash(paths.adapter)) errors.push("adapter hash drift");
    if (canonical(manifest.entries || []) !== canonical(entries)) errors.push("Hook definition/trust hash drift");
  }
  const config = fs.existsSync(paths.config) ? fs.readFileSync(paths.config, "utf8") : "";
  if (!/\[features\][\s\S]*?\bhooks\s*=\s*true/.test(config)) errors.push("features.hooks is not true");
  for (const entry of entries) if (!config.includes(`trusted_hash = "${entry.hash}"`)) errors.push(`trust hash missing for ${entry.event}`);
  return { action: "doctor", healthy: errors.length === 0, codex_home: paths.home, skill_root: skill, entries, errors };
}
function uninstall(options) {
  const paths = pathsFor(options.codexHome), release = acquire(paths); try {
    const backupDir = backup(paths), hooks = removeOwned(parseJson(paths.hooks, { hooks: {} }));
    const entries = fs.existsSync(paths.manifest) ? parseJson(paths.manifest, {}).entries || [] : [];
    atomicJson(paths.hooks, hooks); atomicWrite(paths.config, `${stripTrustToml(fs.existsSync(paths.config) ? fs.readFileSync(paths.config, "utf8") : "", entries)}\n`);
    fs.rmSync(paths.runtime, { recursive: true, force: true });
    return { action: "uninstall", codex_home: paths.home, backup: backupDir, healthy: true };
  } finally { release(); }
}
function parseArgs(argv) {
  const command = argv[0], options = { json: false, dryRun: false, codexHome: process.env.CODEX_HOME || path.join(os.homedir(), ".codex") };
  if (!new Set(["install", "doctor", "uninstall"]).has(command)) throw new Error("usage: install.js <install|doctor|uninstall> [--codex-home PATH] [--skill-root PATH] [--dry-run] [--json]");
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--json") options.json = true;
    else if (argv[i] === "--dry-run") options.dryRun = true;
    else if (argv[i] === "--codex-home") options.codexHome = argv[++i];
    else if (argv[i] === "--skill-root") options.skillRoot = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return { command, options };
}
function main() {
  try {
    const { command, options } = parseArgs(process.argv.slice(2));
    const result = command === "install" ? install(options) : command === "doctor" ? doctor(options) : uninstall(options);
    console.log(options.json ? JSON.stringify(result) : JSON.stringify(result, null, 2));
    if (result.healthy === false) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ healthy: false, error: error.message })); process.exitCode = 1; }
}
if (require.main === module) main();
module.exports = { canonical, hookHash, mergeHooks, removeOwned, ownedEntries, pathsFor, stripTrustToml, trustToml };
