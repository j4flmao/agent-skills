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
for (const file of fs.readdirSync(path.join(root, "bundles")).filter((name) => name.endsWith(".json"))) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(root, "bundles", file), "utf8"));
    const definitions = Array.isArray(value) ? value : [value];
    for (const definition of definitions) {
      if (!definition.name || !Array.isArray(definition.skills)) failures.push("bundles/" + file + ": invalid shape");
      if (Array.isArray(definition.skills) && new Set(definition.skills).size !== definition.skills.length) failures.push("bundles/" + file + ": duplicate skill");
    }
  } catch (error) { failures.push("bundles/" + file + ": invalid JSON (" + error.message + ")"); }
}
if (failures.length) { console.error(failures.map((x) => "FAIL: " + x).join("\n")); process.exit(1); }
console.log("Agent governance validation passed (" + profiles.length + " profiles, bundle JSON validated).");
