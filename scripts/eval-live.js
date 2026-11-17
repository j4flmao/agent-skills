#!/usr/bin/env node
// Live routing eval: asks a real model to pick a skill from a shortlist, the way an agent picks from its listing.
// Costs model usage, so it is never part of `npm run validate` or CI.
//
//   node scripts/eval-live.js --limit 20                 sample 20 cases (default 10)
//   node scripts/eval-live.js --limit 0                  all cases
//   node scripts/eval-live.js --model <model> --shortlist 15 --seed 7
//
// For each case the retriever proposes a shortlist (default 15 skills: name + description). The model must answer
// with one skill path or NONE. Scores: accuracy on skill prompts, correct abstention on no-skill prompts, and
// how often the expected skill was missing from the shortlist (a retriever miss, not a model miss).
// Requires the `claude` CLI on PATH. Results are written to evals/routing/live-report.md.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { root, loadSkills, buildIndex } = require("./skill-retriever");

const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const limit = Number(arg("limit", 10));
const shortlistSize = Number(arg("shortlist", 15));
const model = arg("model", "");
let seed = Number(arg("seed", 1));
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

const skills = loadSkills();
const byPath = new Map(skills.map((s) => [s.path, s]));
const { retrieve } = buildIndex(skills);
let cases = fs.readFileSync(path.join(root, "evals/routing/cases.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
if (limit > 0) cases = cases.map((c) => [random(), c]).sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);

function ask(prompt, shortlist) {
  const listing = shortlist.map((p) => `- ${p}: ${byPath.get(p).description.slice(0, 400)}`).join("\n");
  const question = [
    "You are choosing which skill document to load for a user request.",
    "Reply with exactly one line: the path of the single best skill from the list, or NONE if no skill fits.",
    "Do not use tools. Do not explain.",
    "", "Skills:", listing, "", "User request: " + prompt,
  ].join("\n");
  // The prompt goes through stdin: multi-line arguments do not survive Windows shell quoting.
  const args = ["-p", "--output-format", "json"];
  if (model) args.push("--model", model);
  const run = spawnSync("claude", args, { input: question, encoding: "utf8", shell: process.platform === "win32", timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  if (run.error || run.status !== 0) throw new Error("claude CLI failed: " + (run.error ? run.error.message : (run.stderr || run.stdout).slice(0, 300)));
  let parsed;
  try { parsed = JSON.parse(run.stdout); } catch (error) { throw new Error("claude CLI returned non-JSON output: " + run.stdout.slice(0, 300)); }
  return { answer: String(parsed.result || "").trim().split(/\r?\n/).pop().replace(/[`'"]/g, "").trim(), cost: parsed.total_cost_usd || 0 };
}

const rows = [];
let cost = 0;
for (const [index, c] of cases.entries()) {
  const shortlist = retrieve(c.prompt, shortlistSize).filter((r) => r.score > 0).map((r) => r.path);
  const inShortlist = c.expect.some((e) => shortlist.includes(e));
  const { answer, cost: spent } = ask(c.prompt, shortlist);
  cost += spent;
  const picked = answer.replace(/^skills\//, "").replace(/\/SKILL\.md$/, "");
  const correct = c.expect.length ? c.expect.includes(picked) : /^none$/i.test(picked);
  rows.push({ prompt: c.prompt, expect: c.expect, picked, correct, inShortlist });
  console.log(`${index + 1}/${cases.length} ${correct ? "ok  " : "MISS"} ${picked}  <- ${c.prompt}`);
}

const positives = rows.filter((r) => r.expect.length);
const negatives = rows.filter((r) => !r.expect.length);
const count = (list, f) => list.filter(f).length;
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + "%" : "n/a");
const report = [
  "# Live Routing Eval Report", "",
  `Model: ${model || "CLI default"}. Cases: ${rows.length} (seed ${arg("seed", 1)}), shortlist ${shortlistSize}. Reported cost: $${cost.toFixed(4)}.`, "",
  "| Metric | Value |", "|--------|-------|",
  `| Skill prompts answered with an expected skill | ${count(positives, (r) => r.correct)}/${positives.length} (${pct(count(positives, (r) => r.correct), positives.length)}) |`,
  `| Expected skill missing from the shortlist (retriever miss) | ${count(positives, (r) => !r.inShortlist)}/${positives.length} |`,
  `| Model chose NONE although a skill was expected | ${count(positives, (r) => /^none$/i.test(r.picked))}/${positives.length} |`,
  `| No-skill prompts correctly answered NONE | ${count(negatives, (r) => r.correct)}/${negatives.length} |`, "",
  "With fewer than ~100 cases the percentages have wide confidence intervals; use `--limit 0` before drawing conclusions.", "",
  "## Misses", "",
  ...rows.filter((r) => !r.correct).map((r) => `- picked \`${r.picked}\`, expected ${r.expect.length ? r.expect.map((e) => "`" + e + "`").join(" or ") : "NONE"} | ${r.prompt}`), "",
];
fs.writeFileSync(path.join(root, "evals/routing/live-report.md"), report.join("\n"));
console.log(report.slice(4, 9).join("\n"));
