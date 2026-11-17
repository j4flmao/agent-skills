#!/usr/bin/env node
// Extract fenced shell snippets from skills and run shellcheck on them (errors only).
// Report-only helper for CI: examples are fragments, so findings are advisory, not a gate.
//
//   node scripts/lint-snippets.js            needs `shellcheck` on PATH
//   node scripts/lint-snippets.js --list     only count snippets

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const snippets = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.name.endsWith(".md")) continue;
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    let start = -1;
    lines.forEach((line, i) => {
      if (start < 0 && /^ {0,3}```(bash|sh|shell)\s*$/.test(line)) start = i;
      else if (start >= 0 && /^ {0,3}```\s*$/.test(line)) {
        snippets.push({ file: path.relative(root, full).split(path.sep).join("/"), line: start + 2, code: lines.slice(start + 1, i).join("\n") });
        start = -1;
      }
    });
  }
})(path.join(root, "skills"));

if (process.argv.includes("--list")) { console.log(snippets.length + " shell snippets"); process.exit(0); }
if (spawnSync("shellcheck", ["--version"], { encoding: "utf8" }).status !== 0) {
  console.error("shellcheck not found on PATH; install it or run with --list");
  process.exit(2);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-snippets-"));
let findings = 0;
snippets.forEach((snippet, index) => {
  const file = path.join(dir, index + ".sh");
  fs.writeFileSync(file, "#!/usr/bin/env bash\n" + snippet.code + "\n");
  // SC2148/SC1091: fragments have no shebang or sourced files; errors only.
  const run = spawnSync("shellcheck", ["--severity=error", "--format=gcc", "--exclude=SC2148,SC1091", file], { encoding: "utf8" });
  for (const out of run.stdout.split("\n").filter(Boolean)) {
    const match = /:(\d+):\d+: (.*)$/.exec(out);
    if (!match) continue;
    findings += 1;
    console.log(`${snippet.file}:${snippet.line + Number(match[1]) - 2}: ${match[2]}`);
  }
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(`${snippets.length} shell snippets checked, ${findings} error-level finding(s).`);
