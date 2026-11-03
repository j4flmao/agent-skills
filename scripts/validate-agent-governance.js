#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const failures = [];
const profiles = [
  [".amp/rules/agent-reliability.md", "Amp"],
  [".claude/rules/agent-reliability.md", "Claude Code"],
  [".codex/rules/agent-reliability.md", "Codex"],
  [".cursor/rules/agent-reliability.mdc", "Cursor"],
  [".gemini/rules/agent-reliability.md", "Gemini"],
  [".github/rules/agent-reliability.md", "GitHub Copilot"],
  [".opencode/rules/agent-reliability.md", "OpenCode"],
  [".windsurf/rules/agent-reliability.md", "Windsurf"],
];
function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) { failures.push(relative + ": file is missing"); return ""; }
  return fs.readFileSync(file, "utf8");
}
const rules = read("AGENTS.md");
const spec = read("docs/agent-reliability-spec.md");
if (!rules.includes("Completion gate")) failures.push("AGENTS.md: missing completion gate");
if (!rules.includes("Deterministic mode")) failures.push("AGENTS.md: missing deterministic mode");
if (!rules.includes("Multi-agent coordination")) failures.push("AGENTS.md: missing multi-agent rules");
for (const [file, name] of profiles) {
  const content = read(file);
  if (content && !content.includes("agent-reliability-spec.md")) failures.push(file + ": missing normative link");
  if (content && !content.toLowerCase().includes(name.toLowerCase())) failures.push(file + ": missing agent identity");
}
if (spec && !spec.includes("Truthfulness contract")) failures.push("spec: missing truthfulness contract");
if (spec && !spec.includes("Cost and loop control")) failures.push("spec: missing loop control");
const skillNames = new Map();
function collectSkills(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { collectSkills(full); continue; }
    if (entry.name !== "SKILL.md") continue;
    const relative = path.relative(root, full).split(path.sep).join("/");
    const match = /^---\r?\n[\s\S]*?^name:\s*"?([^"\r\n]+)"?/m.exec(fs.readFileSync(full, "utf8"));
    if (!match) { failures.push(relative + ": missing frontmatter name"); continue; }
    const name = match[1].trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) failures.push(relative + ": name '" + name + "' is not kebab-case");
    if (skillNames.has(name)) failures.push(relative + ": duplicate skill name '" + name + "' (also " + skillNames.get(name) + ")");
    else skillNames.set(name, relative);
  }
}
collectSkills(path.join(root, "skills"));
// bundles/bundle-definitions.json is the single source of truth for bundles.
const bundled = new Set();
for (const file of fs.readdirSync(path.join(root, "bundles")).filter((name) => name !== "bundle-definitions.json")) {
  failures.push("bundles/" + file + ": unexpected file; define every bundle in bundles/bundle-definitions.json");
}
try {
  const definitions = JSON.parse(read("bundles/bundle-definitions.json") || "[]");
  if (!Array.isArray(definitions)) throw new Error("expected an array of bundles");
  const bundleNames = new Set();
  for (const definition of definitions) {
    if (!definition.name || !definition.description || !Array.isArray(definition.skills)) { failures.push("bundles/bundle-definitions.json: invalid bundle shape"); continue; }
    if (bundleNames.has(definition.name)) failures.push("bundles/bundle-definitions.json: duplicate bundle '" + definition.name + "'");
    bundleNames.add(definition.name);
    if (new Set(definition.skills).size !== definition.skills.length) failures.push("bundles/bundle-definitions.json: " + definition.name + " lists a skill twice");
    for (const skill of definition.skills) {
      if (!skillNames.has(skill)) failures.push("bundles/bundle-definitions.json: " + definition.name + " references unknown skill '" + skill + "'");
      bundled.add(skill);
    }
  }
} catch (error) { failures.push("bundles/bundle-definitions.json: invalid JSON (" + error.message + ")"); }
for (const [name, relative] of skillNames) {
  if (!bundled.has(name)) failures.push(relative + ": skill '" + name + "' is not in any bundle");
}
if (failures.length) { console.error(failures.map((x) => "FAIL: " + x).join("\n")); process.exit(1); }
console.log("Agent governance validation passed (" + profiles.length + " profiles, " + skillNames.size + " skills, bundle JSON and skill names validated).");
