#!/usr/bin/env node
// Copy selected skills (by name or bundle) into another project, keeping their paths
// relative to skills/ so cross-skill reference links keep working.
//
//   node scripts/pack-skills.js --out ../my-app/skills backend-api-design backend-caching
//   node scripts/pack-skills.js --out ../my-app/skills --bundle ai-agents --bundle quality-testing
//   node scripts/pack-skills.js --dry-run --bundle design-ux

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const skillsDir = path.join(root, "skills");

function usage(message) {
  if (message) console.error("Error: " + message);
  console.error("Usage: node scripts/pack-skills.js [--out <dir>] [--dry-run] [--bundle <name>]... [skill-name]...");
  process.exit(1);
}

const args = process.argv.slice(2);
let outDir = null;
let dryRun = false;
const bundleNames = [];
const requested = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--out") outDir = args[++i];
  else if (args[i] === "--dry-run") dryRun = true;
  else if (args[i] === "--bundle") bundleNames.push(args[++i]);
  else if (args[i].startsWith("--")) usage("unknown option " + args[i]);
  else requested.push(args[i]);
}
if (!dryRun && !outDir) usage("--out is required unless --dry-run is set");
if (!bundleNames.length && !requested.length) usage("name at least one skill or --bundle");

// name -> absolute skill directory
const skillDirs = new Map();
(function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.name === "SKILL.md") {
      const match = /^name:\s*"?([^"\r\n]+)"?/m.exec(fs.readFileSync(full, "utf8"));
      if (match) skillDirs.set(match[1].trim(), dir);
    }
  }
})(skillsDir);

const definitions = JSON.parse(fs.readFileSync(path.join(root, "bundles", "bundle-definitions.json"), "utf8"));
const names = new Set(requested);
for (const bundle of bundleNames) {
  const definition = definitions.find((d) => d.name === bundle);
  if (!definition) usage("unknown bundle '" + bundle + "'. Available: " + definitions.map((d) => d.name).join(", "));
  definition.skills.forEach((name) => names.add(name));
}
const unknown = [...names].filter((name) => !skillDirs.has(name));
if (unknown.length) usage("unknown skill(s): " + unknown.join(", "));

const skillRoots = new Set(skillDirs.values());
const files = new Set();

function addSkillFolder(dir, isTop) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skillRoots.has(full)) addSkillFolder(full, false); // nested skills are separate skills
    } else files.add(full);
  }
  if (isTop) {
    // shared references linked from SKILL.md that live outside this folder
    const text = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
    const pattern = /`?((?:skills\/|\.\.\/|\.\/)?[\w./-]*references\/[\w.-]+\.md)`?/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1];
      const target = ref.startsWith("skills/") ? path.join(root, ref) : path.resolve(dir, ref);
      if (target.startsWith(skillsDir) && fs.existsSync(target)) files.add(target);
    }
  }
}
for (const name of names) addSkillFolder(skillDirs.get(name), true);

const sorted = [...files].sort();
if (dryRun) {
  sorted.forEach((file) => console.log(path.relative(skillsDir, file).split(path.sep).join("/")));
  console.log(names.size + " skills, " + sorted.length + " files (dry run, nothing copied).");
  process.exit(0);
}
const destination = path.resolve(outDir);
for (const file of sorted) {
  const target = path.join(destination, path.relative(skillsDir, file));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
}
console.log("Copied " + names.size + " skills (" + sorted.length + " files) to " + destination);
