#!/usr/bin/env node
// Suggest skills for a request: node scripts/route.js "set up canary releases on kubernetes"
// Ranks skills by BM25 over name, path and description; prints the top matches as paths under skills/.
const { loadSkills, buildIndex } = require("./skill-retriever");

const args = process.argv.slice(2);
const json = args.includes("--json");
const kArg = args.indexOf("-k");
const k = kArg >= 0 ? Number(args[kArg + 1]) : 5;
const prompt = args.filter((a, i) => a !== "--json" && a !== "-k" && (kArg < 0 || i !== kArg + 1)).join(" ").trim();
if (!prompt || !Number.isInteger(k) || k < 1) {
  console.error('Usage: node scripts/route.js [-k 5] [--json] "<request>"');
  process.exit(1);
}
const results = buildIndex(loadSkills()).retrieve(prompt, k).filter((r) => r.score > 0);
if (json) console.log(JSON.stringify(results.map((r) => ({ path: `skills/${r.path}/SKILL.md`, name: r.name, score: Number(r.score.toFixed(2)) }))));
else if (!results.length) console.log("No matching skill. Use skills/core/master-orchestrator/SKILL.md.");
else results.forEach((r, i) => console.log(`${i + 1}. skills/${r.path}/SKILL.md  (${r.name}, score ${r.score.toFixed(1)})`));
