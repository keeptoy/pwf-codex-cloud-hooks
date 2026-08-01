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
const EVENTS = ["SessionStart", "UserPromptSubmit"];
const MANIFEST_SCHEMA = 3;

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
function pathsFor(codexHome, requirementsPath = "/etc/codex/requirements.toml") {
  const home = path.resolve(codexHome);
  if (!path.isAbsolute(codexHome) || home === path.parse(home).root) throw new Error("--codex-home must be an absolute non-root path");
  if (!path.isAbsolute(requirementsPath)) throw new Error("--managed-requirements must be an absolute path");
  return {
    home,
    config: path.join(home, "config.toml"),
    hooks: path.join(home, "hooks.json"),
    requirements: path.resolve(requirementsPath),
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

function removeOwnedRequirements(text) {
  const lines = String(text || "").split("\n"), output = [];
  for (let i = 0; i < lines.length;) {
    if (!/^\s*\[\[hooks\.[^.\]]+\]\]\s*(?:#.*)?$/.test(lines[i])) {
      output.push(lines[i++]);
      continue;
    }
    let end = i + 1;
    while (end < lines.length && !/^\s*\[\[hooks\.[^.\]]+\]\]\s*(?:#.*)?$/.test(lines[end]) && !/^\s*\[(?!\[)/.test(lines[end])) end++;
    const block = lines.slice(i, end);
    if (!block.join("\n").includes(OWNED_SEGMENT)) output.push(...block);
    i = end;
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function setTableKey(text, table, key, value) {
  const lines = String(text || "").split("\n"), header = `[${table}]`;
  let start = lines.findIndex(line => line.trim() === header);
  if (start < 0) {
    const prefix = lines.join("\n").trimEnd();
    return `${prefix}${prefix ? "\n\n" : ""}${header}\n${key} = ${value}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^\s*\[/.test(lines[i])) { end = i; break; }
  const keyPattern = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`);
  const index = lines.slice(start + 1, end).findIndex(line => keyPattern.test(line));
  if (index >= 0) lines[start + 1 + index] = `${key} = ${value}`;
  else lines.splice(start + 1, 0, `${key} = ${value}`);
  return `${lines.join("\n").trimEnd()}\n`;
}

function tableStringValue(text, table, key) {
  const lines = String(text || "").split("\n");
  const start = lines.findIndex(line => line.trim() === `[${table}]`);
  if (start < 0) return null;
  for (let i = start + 1; i < lines.length && !/^\s*\[/.test(lines[i]); i++) {
    const match = lines[i].match(new RegExp(`^\\s*${key}\\s*=\\s*(["'])(.*?)\\1\\s*(?:#.*)?$`));
    if (match) return match[2];
  }
  return null;
}

function pathContains(directory, file) {
  const relative = path.relative(path.resolve(directory), path.resolve(file));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function managedRequirements(text, paths) {
  let result = removeOwnedRequirements(text);
  const existingManagedDir = tableStringValue(result, "hooks", "managed_dir");
  if (existingManagedDir && !pathContains(existingManagedDir, paths.adapter)) throw new Error(`existing hooks.managed_dir does not contain adapter: ${existingManagedDir}`);
  result = setTableKey(result, "features", "hooks", "true");
  if (!existingManagedDir) result = setTableKey(result, "hooks", "managed_dir", JSON.stringify(paths.runtime));
  const command = event => `/usr/bin/python3 ${quoteCommand(paths.adapter)} ${event}`;
  const blocks = [
    `[[hooks.SessionStart]]\nmatcher = "startup|resume|clear|compact"\n\n[[hooks.SessionStart.hooks]]\ntype = "command"\ncommand = ${JSON.stringify(command("SessionStart"))}\ntimeout = 30\nstatusMessage = "Loading planning context"`,
    `[[hooks.UserPromptSubmit]]\n\n[[hooks.UserPromptSubmit.hooks]]\ntype = "command"\ncommand = ${JSON.stringify(command("UserPromptSubmit"))}\ntimeout = 30\nstatusMessage = "Refreshing planning context"`,
  ];
  return `${result.trimEnd()}\n\n${blocks.join("\n\n")}\n`;
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
  for (const file of [paths.config, paths.hooks, paths.requirements, paths.runtime]) if (fs.existsSync(file)) {
    const destination = file === paths.requirements ? path.join(dir, "system-requirements.toml") : path.join(dir, path.relative(paths.home, file));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(file, destination, { recursive: true, force: true });
  }
  return dir;
}
function buildManifest(paths, skill) {
  return { schema_version: 2, owner: OWNER, installer_version: VERSION, upstream: UPSTREAM, skill_root: skill, adapter_sha256: fileHash(paths.adapter), requirements_file: paths.requirements, events: ["SessionStart", "UserPromptSubmit"] };
}
function install(options) {
  const paths = pathsFor(options.codexHome, options.managedRequirements), skill = resolveSkill(options.skillRoot, paths.home);
  if (!fs.existsSync("/usr/bin/python3")) throw new Error("managed Hook interpreter not found: /usr/bin/python3");
  const currentRequirements = fs.existsSync(paths.requirements) ? fs.readFileSync(paths.requirements, "utf8") : "";
  const proposedRequirements = managedRequirements(currentRequirements, paths);
  if (options.dryRun) return { action: "dry-run", codex_home: paths.home, skill_root: skill, requirements_file: paths.requirements, events: ["SessionStart", "UserPromptSubmit"], changed: proposedRequirements !== currentRequirements };
  const release = acquire(paths); try {
    const backupDir = backup(paths);
    fs.mkdirSync(paths.runtime, { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(ROOT, "hooks", "hook_adapter.py"), paths.adapter); fs.chmodSync(paths.adapter, 0o755);
    atomicWrite(paths.requirements, proposedRequirements, 0o644);
    // Remove handlers and trust entries left by the v0.1 non-managed installation.
    const previousManifest = fs.existsSync(paths.manifest) ? parseJson(paths.manifest, {}) : {};
    const previousEntries = previousManifest.entries || [];
    if (fs.existsSync(paths.hooks)) atomicJson(paths.hooks, removeOwned(parseJson(paths.hooks, { hooks: {} })));
    if (fs.existsSync(paths.config) && previousEntries.length) atomicWrite(paths.config, `${stripTrustToml(fs.readFileSync(paths.config, "utf8"), previousEntries)}\n`);
    atomicJson(paths.manifest, buildManifest(paths, skill));
    const checked = doctor({ codexHome: paths.home, skillRoot: skill, managedRequirements: paths.requirements });
    return { ...checked, action: "install", backup: backupDir };
  } finally { release(); }
}
function repair(options) {
  const { paths, skill } = options;
  const before = inspectInstallation(paths, skill);
  if (before.healthy) return { action: options.dryRun ? "repair-dry-run" : "repair", healthy: true, changed: false, repairable: false, codex_home: paths.home, skill_root: skill, requirements_file: paths.requirements, events: EVENTS, errors: [] };
  if (!before.repairable) throw new Error(`REPAIR_BLOCKED_UNKNOWN_DRIFT: ${before.blockers.join("; ")}`);
  const repairedRequirements = managedRequirements(removeOwnedRequirements(before.requirements), paths);
  if (sha256(repairedRequirements) !== before.manifest.requirements_sha256) throw new Error("REPAIR_BLOCKED_UNKNOWN_DRIFT: reconstructed requirements do not match manifest");
  if (options.dryRun) return { action: "repair-dry-run", healthy: false, changed: true, repairable: true, codex_home: paths.home, skill_root: skill, requirements_file: paths.requirements, events: EVENTS, errors: before.errors };
  const release = acquire(paths); try {
    const backupDir = backup(paths);
    fs.mkdirSync(paths.runtime, { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(ROOT, "hooks", "hook_adapter.py"), paths.adapter); fs.chmodSync(paths.adapter, 0o755);
    atomicWrite(paths.requirements, repairedRequirements, 0o644);
    const checked = doctor({ codexHome: paths.home, skillRoot: skill, managedRequirements: paths.requirements });
    return { ...checked, action: "repair", changed: true, backup: backupDir };
  } finally { release(); }
}
function doctor(options) {
  const paths = pathsFor(options.codexHome, options.managedRequirements), skill = resolveSkill(options.skillRoot, paths.home);
  const errors = [];
  const adapterExists = fs.existsSync(paths.adapter);
  if (!adapterExists) errors.push("adapter missing");
  const requirements = fs.existsSync(paths.requirements) ? fs.readFileSync(paths.requirements, "utf8") : "";
  if (!fs.existsSync(paths.requirements)) errors.push("managed requirements missing");
  if (!/^\s*hooks\s*=\s*true\s*(?:#.*)?$/m.test(requirements)) errors.push("managed features.hooks is not true");
  const managedDir = tableStringValue(requirements, "hooks", "managed_dir");
  if (!managedDir || !pathContains(managedDir, paths.adapter)) errors.push("hooks.managed_dir does not contain adapter");
  for (const event of ["SessionStart", "UserPromptSubmit"]) {
    const command = `/usr/bin/python3 ${quoteCommand(paths.adapter)} ${event}`;
    if (requirements.split(`command = ${JSON.stringify(command)}`).length - 1 !== 1) errors.push(`managed ${event} handler count is not 1`);
  }
  if (!fs.existsSync(paths.manifest)) errors.push("installed manifest missing");
  else {
    const manifest = parseJson(paths.manifest, {});
    if (adapterExists && manifest.adapter_sha256 !== fileHash(paths.adapter)) errors.push("adapter hash drift");
    if (manifest.requirements_file !== paths.requirements) errors.push("managed requirements path drift");
  }
  return { action: "doctor", healthy: errors.length === 0, codex_home: paths.home, skill_root: skill, requirements_file: paths.requirements, managed: true, events: ["SessionStart", "UserPromptSubmit"], errors };
}
function uninstall(options) {
  const paths = pathsFor(options.codexHome, options.managedRequirements), release = acquire(paths); try {
    const backupDir = backup(paths);
    const manifest = fs.existsSync(paths.manifest) ? parseJson(paths.manifest, {}) : {};
    if (fs.existsSync(paths.requirements)) atomicWrite(paths.requirements, `${removeOwnedRequirements(fs.readFileSync(paths.requirements, "utf8"))}\n`, 0o644);
    if (fs.existsSync(paths.hooks)) atomicJson(paths.hooks, removeOwned(parseJson(paths.hooks, { hooks: {} })));
    if (fs.existsSync(paths.config) && (manifest.entries || []).length) atomicWrite(paths.config, `${stripTrustToml(fs.readFileSync(paths.config, "utf8"), manifest.entries)}\n`);
    fs.rmSync(paths.runtime, { recursive: true, force: true });
    return { action: "uninstall", codex_home: paths.home, requirements_file: paths.requirements, backup: backupDir, healthy: true };
  } finally { release(); }
}
function parseArgs(argv) {
  const command = argv[0], options = { json: false, dryRun: false, codexHome: process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), managedRequirements: "/etc/codex/requirements.toml" };
  if (!new Set(["install", "doctor", "uninstall"]).has(command)) throw new Error("usage: install.js <install|doctor|uninstall> [--codex-home PATH] [--skill-root PATH] [--managed-requirements PATH] [--dry-run] [--json]");
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--json") options.json = true;
    else if (argv[i] === "--dry-run") options.dryRun = true;
    else if (argv[i] === "--repair") options.repair = true;
    else if (argv[i] === "--codex-home") options.codexHome = argv[++i];
    else if (argv[i] === "--skill-root") options.skillRoot = argv[++i];
    else if (argv[i] === "--managed-requirements") options.managedRequirements = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (options.repair && command !== "install") throw new Error("--repair is valid only with install");
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
module.exports = { canonical, hookHash, managedRequirements, mergeHooks, removeOwned, removeOwnedRequirements, ownedEntries, pathsFor, setTableKey, stripTrustToml, trustToml };
