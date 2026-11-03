#!/usr/bin/env node
// Phase 0 static evals for skills/: structure, descriptions, routing targets,
// reference links and deprecated-pattern checks. Free, deterministic, offline.

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const skillsDir = path.join(root, "skills");
const MAX_DESCRIPTION_CHARS = 1024; // Agent Skills spec limit
const REQUIRED_SECTIONS = [/^##\s+Purpose\b/m, /Trigger/, /Response Format/];
const ROUTING_FILES = [".claude/rules/routing.md", ".codex/rules/routing.md"];
// Deprecated or removed technology presented as current. Each entry must stay
// precise enough to produce zero false positives on the current corpus.
const DEPRECATED_PATTERNS = [
  [/apiVersion:\s*(extensions\/v1beta1|apps\/v1beta[12]|policy\/v1beta1|batch\/v1beta1|networking\.k8s\.io\/v1beta1|autoscaling\/v2beta[12])\b/, "removed Kubernetes API version"],
  [/karpenter\.sh\/v1(alpha5|beta1)\b/, "pre-v1 Karpenter API"],
  [/external-secrets\.io\/v1beta1\b/, "External Secrets v1beta1 (use v1)"],
  [/::set-output\b/, "GitHub Actions ::set-output (use $GITHUB_OUTPUT)"],
  [/actions\/checkout@v[123]\b/, "outdated actions/checkout (use v4+)"],
  [/\btorch\.cuda\.amp\b/, "torch.cuda.amp (use torch.amp)"],
  [/@tauri-apps\/api\/tauri\b/, "Tauri v1 import (use @tauri-apps/api/core)"],
  [/fcm\.googleapis\.com\/fcm\/send\b/, "legacy FCM HTTP API (use HTTP v1)"],
  [/\btillerNamespace\b|\bhelm init\b/, "Helm 2 / Tiller"],
];
// A line that names the old API to explain a migration is documentation, not a defect.
const MIGRATION_NOTE = /deprecat|removed|legacy|replaced|instead|migrat|\bv\d+ used\b|\bin v\d+\b|→|->/i;
const PLACEHOLDER = /\bTODO\b|\bFIXME\b|lorem ipsum/i;

const errors = [];
const warnings = [];
const linkedReferences = new Set();
const referenceFiles = [];
const toPosix = (p) => path.relative(root, p).split(path.sep).join("/");

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full, entry.name);
  }
}

function hasSkillBelow(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  let found = false;
  walk(dir, (_, name) => { if (name === "SKILL.md") found = true; });
  return found;
}

function parseDescription(frontmatter) {
  const match = /^description:[ \t]*(?:[>|][-+]?[ \t]*\r?\n((?:[ \t]+.*(?:\r?\n|$))+)|(.*))/m.exec(frontmatter);
  if (!match) return null;
  const raw = match[1] !== undefined ? match[1] : match[2];
  return raw.replace(/\s+/g, " ").trim().replace(/^["']|["']$/g, "");
}

function stripCodeFences(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

function checkReferenceLinks(file, text) {
  const dir = path.dirname(file);
  const pattern = /`?((?:skills\/|\.\.\/|\.\/)?[\w./-]*references\/[\w.-]+\.md)`?/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const ref = match[1];
    const target = ref.startsWith("skills/") ? path.join(root, ref) : path.resolve(dir, ref);
    if (!fs.existsSync(target)) errors.push(toPosix(file) + ": broken reference link '" + ref + "'");
    else linkedReferences.add(path.normalize(target));
  }
}

function checkSkill(file) {
  const rel = toPosix(file);
  const text = fs.readFileSync(file, "utf8");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) { errors.push(rel + ": missing YAML frontmatter"); return; }
  const description = parseDescription(fm[1]);
  if (!description) errors.push(rel + ": missing description");
  else if (description.length > MAX_DESCRIPTION_CHARS) errors.push(rel + ": description is " + description.length + " chars (max " + MAX_DESCRIPTION_CHARS + ")");
  for (const section of REQUIRED_SECTIONS) {
    if (!section.test(text)) errors.push(rel + ": missing section matching " + section);
  }
  checkReferenceLinks(file, text);
}

// CommonMark: a fence is ``` or ~~~ indented at most 3 spaces; it closes on the same
// character with at least the same length and no info string.
function unclosedFenceLine(lines) {
  let open = null;
  let openedAt = -1;
  lines.forEach((line, index) => {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) return;
    const [, fence, info] = match;
    if (open === null) { open = fence; openedAt = index; }
    else if (fence[0] === open[0] && fence.length >= open.length && info.trim() === "") open = null;
  });
  return open === null ? -1 : openedAt;
}

function checkContent(file) {
  const rel = toPosix(file);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const fenceLine = unclosedFenceLine(lines);
  if (fenceLine >= 0) errors.push(rel + ":" + (fenceLine + 1) + ": unclosed code fence");
  for (const [pattern, label] of DEPRECATED_PATTERNS) {
    const lineIndex = lines.findIndex((line) => pattern.test(line) && !MIGRATION_NOTE.test(line));
    if (lineIndex >= 0) errors.push(rel + ":" + (lineIndex + 1) + ": " + label);
  }
  if (PLACEHOLDER.test(stripCodeFences(text))) warnings.push(rel + ": placeholder marker (TODO/FIXME/lorem ipsum) outside code");
}

function checkRouting(relFile) {
  const file = path.join(root, relFile);
  if (!fs.existsSync(file)) { errors.push(relFile + ": routing file is missing"); return 0; }
  let targets = 0;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const arrow = line.indexOf("→");
    if (arrow < 0 || line.startsWith("`") || line.startsWith("- `") || /^\s*planning\s*→/.test(line)) continue;
    for (const part of line.slice(arrow + 1).split(",")) {
      const target = part.trim().replace(/`/g, "").replace(/\/$/, "");
      if (!target.includes("/") || target.includes("{") || /\s/.test(target)) continue;
      targets += 1;
      if (!hasSkillBelow(path.join(skillsDir, target))) errors.push(relFile + ": route target '" + target + "' has no SKILL.md");
    }
  }
  return targets;
}

let skillCount = 0;
let referenceCount = 0;
walk(skillsDir, (file, name) => {
  if (!name.endsWith(".md")) return;
  if (name === "SKILL.md") { skillCount += 1; checkSkill(file); }
  else if (path.basename(path.dirname(file)) === "references") { referenceCount += 1; referenceFiles.push(file); }
  checkContent(file);
});
const routeCount = ROUTING_FILES.reduce((sum, file) => sum + checkRouting(file), 0);
const lockFile = path.join(root, "skills-lock.json");
if (fs.existsSync(lockFile)) {
  const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  if (lock.total_skills !== skillCount) errors.push("skills-lock.json: total_skills is " + lock.total_skills + " but skills/ has " + skillCount + " SKILL.md files (regenerate the lock file)");
}
// A reference is reachable when its parent folder is a skill or some SKILL.md links to it.
for (const file of referenceFiles) {
  const ownedBySkill = fs.existsSync(path.join(path.dirname(path.dirname(file)), "SKILL.md"));
  if (!ownedBySkill && !linkedReferences.has(path.normalize(file))) errors.push(toPosix(file) + ": orphan reference (no parent SKILL.md and not linked from any SKILL.md)");
}

if (warnings.length) console.warn(warnings.map((w) => "WARN: " + w).join("\n"));
if (errors.length) {
  console.error(errors.map((e) => "FAIL: " + e).join("\n"));
  console.error(errors.length + " error(s) in " + skillCount + " skills / " + referenceCount + " references.");
  process.exit(1);
}
console.log("Skill validation passed (" + skillCount + " skills, " + referenceCount + " references, " + routeCount + " route targets, " + warnings.length + " warnings).");
