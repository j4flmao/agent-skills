#!/usr/bin/env node
// Offline routing evals (free, deterministic). Two routers are scored against evals/routing/cases.jsonl:
//   1. keyword router  — any "keyword → path" lines left in .claude/rules/routing.md (skipped when there are none)
//   2. description retriever — BM25 over each skill's name, path and description (what agents see in the listing)
// Also reports the most confusable skill pairs by description similarity.
//
//   node scripts/eval-routing.js            print the report and write evals/routing/report.md
//   node scripts/eval-routing.js --check    also fail when a metric drops below evals/routing/thresholds.json

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const { loadSkills, buildIndex } = require("./skill-retriever");
const skills = loadSkills();
const skillPaths = new Set(skills.map((s) => s.path));

const cases = read("evals/routing/cases.jsonl").split("\n").filter(Boolean).map((l) => JSON.parse(l));
for (const c of cases) for (const e of c.expect) if (!skillPaths.has(e)) throw new Error("cases.jsonl: unknown skill path " + e);
const positives = cases.filter((c) => c.expect.length);
const negatives = cases.filter((c) => !c.expect.length);

// ---------------------------------------------------------------- 1. keyword router
const rules = [];
for (const line of read(".claude/rules/routing.md").split("\n")) {
  const arrow = line.indexOf("→");
  if (arrow < 0 || line.startsWith("`") || line.startsWith("- `") || /^\s*planning\s*→/.test(line)) continue;
  const targets = line.slice(arrow + 1).split(",").map((t) => t.trim().replace(/`/g, "").replace(/\/$/, "")).filter((t) => t && !t.includes("{") && !/\s/.test(t));
  const keywords = line.slice(0, arrow).trim().split("/").map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (targets.length && keywords.length) rules.push({ keywords, targets });
}
function keywordRoute(prompt) {
  const text = " " + prompt.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ") + " ";
  let best = null;
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const phrase = " " + keyword.replace(/-/g, " ") + " ";
      const compact = " " + keyword + " ";
      if (text.includes(phrase) || text.includes(compact)) {
        const score = keyword.length;
        if (!best || score > best.score) best = { score, targets: rule.targets, keyword };
      }
    }
  }
  return best;
}
const hasKeywordTable = rules.length >= 50; // a real keyword table, not stray arrows
const kw = { exact: 0, category: 0, wrong: 0, none: 0, falseTrigger: 0 };
const kwMisses = [];
for (const c of positives) {
  const hit = keywordRoute(c.prompt);
  if (!hit) { kw.none += 1; kwMisses.push(`no match | ${c.prompt}`); continue; }
  if (hit.targets.some((t) => c.expect.includes(t))) kw.exact += 1;
  else if (hit.targets.some((t) => c.expect.some((e) => e.startsWith(t + "/")))) kw.category += 1;
  else { kw.wrong += 1; kwMisses.push(`"${hit.keyword}" → ${hit.targets.join(", ")} | ${c.prompt}`); }
}
for (const c of negatives) if (keywordRoute(c.prompt)) kw.falseTrigger += 1;

// ---------------------------------------------------------------- 2. description retriever (BM25)
const { docs, idf, retrieve } = buildIndex(skills);
const bm = { top1: 0, top3: 0, top5: 0, mrr: 0 };
const bmMisses = [];
for (const c of positives) {
  const ranked = retrieve(c.prompt, 10).map((r) => r.path);
  const rank = ranked.findIndex((p) => c.expect.includes(p));
  if (rank === 0) bm.top1 += 1;
  if (rank >= 0 && rank < 3) bm.top3 += 1;
  if (rank >= 0 && rank < 5) bm.top5 += 1;
  if (rank >= 0) bm.mrr += 1 / (rank + 1);
  if (rank < 0 || rank >= 5) bmMisses.push(`got ${ranked.slice(0, 3).join(", ")} | ${c.prompt}`);
}
// A no-skill prompt should score low; report how often it would beat the weakest correct top-1 score.
const positiveTopScores = positives.map((c) => retrieve(c.prompt, 1)[0].score).sort((a, b) => a - b);
const abstainThreshold = positiveTopScores[Math.floor(positiveTopScores.length * 0.1)];
const bmFalseTrigger = negatives.filter((c) => retrieve(c.prompt, 1)[0].score >= abstainThreshold).length;

// ---------------------------------------------------------------- 3. confusable pairs (cosine over TF-IDF)
const vectors = docs.map((d) => {
  const v = new Map();
  let norm = 0;
  d.tf.forEach((f, w) => { const x = (1 + Math.log(f)) * idf(w); v.set(w, x); norm += x * x; });
  return { skill: d.skill, v, norm: Math.sqrt(norm) };
});
const pairs = [];
for (let i = 0; i < vectors.length; i += 1) {
  for (let j = i + 1; j < vectors.length; j += 1) {
    const [a, b] = vectors[i].v.size < vectors[j].v.size ? [vectors[i], vectors[j]] : [vectors[j], vectors[i]];
    let dot = 0;
    a.v.forEach((x, w) => { const y = b.v.get(w); if (y) dot += x * y; });
    const cosine = dot / (a.norm * b.norm);
    if (cosine >= 0.45) pairs.push({ a: vectors[i].skill.path, b: vectors[j].skill.path, cosine });
  }
}
pairs.sort((x, y) => y.cosine - x.cosine);

// ---------------------------------------------------------------- listing budget
const listingChars = skills.reduce((s, x) => s + x.name.length + x.description.length, 0);
const lengths = skills.map((s) => s.description.length).sort((a, b) => a - b);

// ---------------------------------------------------------------- report
const pct = (n, d) => (100 * n / d).toFixed(1) + "%";
const P = positives.length;
const metrics = {
  ...(hasKeywordTable ? { keyword_exact: kw.exact / P, keyword_false_trigger: kw.falseTrigger / negatives.length } : {}),
  description_false_trigger: bmFalseTrigger / negatives.length,
  description_top1: bm.top1 / P,
  description_top5: bm.top5 / P,
  description_mrr: bm.mrr / P,
};
const report = [
  "# Routing Eval Report", "",
  "Generated by `npm run eval:routing` from `evals/routing/cases.jsonl` " + `(${P} skill prompts, ${negatives.length} no-skill prompts, ${skills.length} skills). Offline and deterministic: no model calls.`, "",
  ...(hasKeywordTable ? [
  "## Keyword router (`.claude/rules/routing.md`)", "",
  "| Metric | Value |", "|--------|-------|",
  `| Routed to an expected skill | ${kw.exact}/${P} (${pct(kw.exact, P)}) |`,
  `| Routed to the right category folder only | ${kw.category}/${P} (${pct(kw.category, P)}) |`,
  `| Routed to a wrong skill | ${kw.wrong}/${P} (${pct(kw.wrong, P)}) |`,
  `| No keyword matched (falls back to master-orchestrator) | ${kw.none}/${P} (${pct(kw.none, P)}) |`,
  `| No-skill prompts that still triggered a route | ${kw.falseTrigger}/${negatives.length} |`, ""] : []),
  "## Description retriever (BM25 over name + path + description)", "",
  "| Metric | Value |", "|--------|-------|",
  `| Top-1 accuracy | ${bm.top1}/${P} (${pct(bm.top1, P)}) |`,
  `| Top-3 accuracy | ${bm.top3}/${P} (${pct(bm.top3, P)}) |`,
  `| Top-5 accuracy | ${bm.top5}/${P} (${pct(bm.top5, P)}) |`,
  `| Mean reciprocal rank | ${(bm.mrr / P).toFixed(3)} |`,
  `| No-skill prompts scoring above the abstain threshold | ${bmFalseTrigger}/${negatives.length} |`, "",
  "A lexical retriever is a floor, not a model: it shows whether descriptions contain the words users actually type.", "",
  "## Skill listing size", "",
  "| Metric | Value |", "|--------|-------|",
  `| Skills | ${skills.length} |`,
  `| Name + description characters (all skills) | ${listingChars.toLocaleString("en-US")} |`,
  `| Description length: median / p90 / max | ${lengths[Math.floor(lengths.length / 2)]} / ${lengths[Math.floor(lengths.length * 0.9)]} / ${lengths[lengths.length - 1]} |`, "",
  `## Most confusable skill pairs (description cosine ≥ 0.45: ${pairs.length} pairs)`, "",
  "| Similarity | Skill A | Skill B |", "|-----------|---------|---------|",
  ...pairs.slice(0, 40).map((p) => `| ${p.cosine.toFixed(2)} | \`${p.a}\` | \`${p.b}\` |`), "",
  ...(hasKeywordTable ? ["## Keyword router misses", "", ...kwMisses.map((m) => `- ${m}`), ""] : []),
  "## Description retriever misses (expected skill not in top 5)", "", ...bmMisses.map((m) => `- ${m}`), "",
];
fs.writeFileSync(path.join(root, "evals/routing/report.md"), report.join("\n"));
console.log(Object.entries(metrics).map(([k, v]) => `${k}=${v.toFixed(3)}`).join("  "));
console.log(`confusable_pairs=${pairs.length}  listing_chars=${listingChars}`);

if (process.argv.includes("--check")) {
  const thresholds = JSON.parse(read("evals/routing/thresholds.json"));
  const failures = [];
  for (const [key, limit] of Object.entries(thresholds.min || {})) if (metrics[key] < limit) failures.push(`${key} ${metrics[key].toFixed(3)} < ${limit}`);
  for (const [key, limit] of Object.entries(thresholds.max || {})) if (metrics[key] > limit) failures.push(`${key} ${metrics[key].toFixed(3)} > ${limit}`);
  if (failures.length) { console.error("FAIL: routing eval regressed:\n  " + failures.join("\n  ")); process.exit(1); }
  console.log("Routing eval within thresholds.");
}
