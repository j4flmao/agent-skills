#!/usr/bin/env node
// Generate the guides that are derived from repository data:
//   skill-advisor/README.md, skill-advisor/bundles.md, skill-advisor/tracks/*.md,
//   README.md, docs/skills-master-summary.md
// Inputs: skills/**/SKILL.md, bundles/bundle-definitions.json, skill-advisor/tracks.json,
// and the git file list (gitignored paths are never counted).
//
//   node scripts/generate-docs.js           write the files      (npm run docs)
//   node scripts/generate-docs.js --check   fail if any is stale (npm run docs:check)
//
// skill-advisor/recipes.md and skill-advisor/custom-bundles.md are hand-written.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
const REPO = "j4flmao/agent-skills";
const FOCUSED_MAX = 60;
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const fmt = (n) => n.toLocaleString("en-US");
const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------- data
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root })
  .toString("utf8").split("\0").filter((f) => f && fs.existsSync(path.join(root, f))).sort(byKey);
const lineCount = (rel) => (read(rel).match(/\n/g) || []).length;

const skillFiles = files.filter((f) => f.startsWith("skills/") && f.endsWith("/SKILL.md"));
const refFiles = files.filter((f) => f.startsWith("skills/") && f.includes("/references/") && f.endsWith(".md"));
const looseMd = files.filter((f) => f.startsWith("skills/") && f.endsWith(".md") && !skillFiles.includes(f) && !refFiles.includes(f));

function summarize(text) {
  const match = /^## Purpose\s*\n+([\s\S]+?)(?:\n\s*\n|\n#)/m.exec(text);
  let summary = match ? match[1].replace(/\s+/g, " ").trim() : "";
  summary = summary.replace(/[*`_]/g, "");
  let first = summary.split(/(?<=[.!?])\s/)[0];
  if (first.length > 150) {
    const cut = first.slice(0, 147);
    const space = cut.lastIndexOf(" ");
    first = (space >= 0 ? cut.slice(0, space) : cut) + "…";
  }
  return first.replace(/\|/g, "/");
}

const skills = new Map(); // path under skills/ -> { name, summary }
for (const file of skillFiles) {
  const text = read(file);
  const name = /^name:\s*"?([^"\n]+)"?/m.exec(text)[1].trim();
  const rel = file.slice("skills/".length, -"/SKILL.md".length) || ".";
  skills.set(rel, { name, summary: summarize(text) });
}
const sortedPaths = [...skills.keys()].sort(byKey);
const nameToPath = new Map([...skills].map(([p, s]) => [s.name, p]));
const bundles = JSON.parse(read("bundles/bundle-definitions.json"));
const bundleOf = new Map(bundles.map((b) => [b.name, b]));
const focused = bundles.filter((b) => b.skills.length < FOCUSED_MAX).sort((a, b) => byKey(a.name, b.name));
const broad = bundles.filter((b) => b.skills.length >= FOCUSED_MAX);
const advisor = JSON.parse(read("skill-advisor/tracks.json"));

function pick(...globs) {
  const out = [];
  for (const glob of globs) {
    const re = new RegExp("^" + glob.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    const hits = sortedPaths.filter((p) => re.test(p));
    if (!hits.length) throw new Error("skill-advisor/tracks.json: pattern matched no skill: " + glob);
    hits.forEach((h) => { if (!out.includes(h)) out.push(h); });
  }
  return out;
}
const plural = (n) => `${n} skill${n === 1 ? "" : "s"}`;
const npx = (names) => `npx skills add ${REPO} ` + names.map((n) => `--skill ${n}`).join(" ");
const namesOf = (paths) => paths.map((p) => skills.get(p).name);

const trackIds = new Set(advisor.tracks.map((t) => t.id));
for (const track of advisor.tracks) {
  track.bundles.forEach((b) => { if (!bundleOf.has(b)) throw new Error(`tracks.json: ${track.id} names unknown bundle ${b}`); });
  track.combineWith.forEach((t) => { if (!trackIds.has(t)) throw new Error(`tracks.json: ${track.id} names unknown track ${t}`); });
}

const outputs = new Map();

// ---------------------------------------------------------------- tracks/*.md
const trackStats = new Map();
const covered = new Set();
for (const track of advisor.tracks) {
  const lines = [`# ${track.title}`, "", `**Who this is for:** ${track.who}`, "",
    "[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)", ""];
  const skillRow = (p) => `| [\`${skills.get(p).name}\`](../../skills/${p}/SKILL.md) | \`${p}\` | ${skills.get(p).summary} |`;
  const security = (track.security || []).length ? pick(...track.security) : [];
  if (security.length) {
    lines.push(`## Security baseline (${plural(security.length)}, installed with every level)`, "",
      "These skills make the agent apply this domain's security practices by default. They are included in every install command below; " +
      "the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).", "",
      "| Skill | Path | What it covers |", "|-------|------|----------------|", ...security.map(skillRow), "");
  }
  const seen = [...security];
  const levelPaths = {};
  for (const level of ["1", "2", "3"]) {
    const paths = pick(...track.levels[level]).filter((p) => !seen.includes(p));
    levelPaths[level] = paths;
    seen.push(...paths);
    lines.push(`## ${advisor.levels[level].title} (${plural(paths.length)})`, "", advisor.levels[level].hint, "",
      "| Skill | Path | What it covers |", "|-------|------|----------------|", ...paths.map(skillRow), "");
  }
  seen.forEach((p) => covered.add(skills.get(p).name));
  const level1 = [...levelPaths["1"], ...security];
  const level12 = [...levelPaths["1"], ...levelPaths["2"], ...security];
  lines.push("## Install", "",
    "Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.", "",
    `**Level 1${security.length ? " + security baseline" : " only"} (${level1.length} skills):**`, "", "```bash", npx(namesOf(level1)), "```", "",
    `**Level 1 + 2${security.length ? " + security baseline" : ""} (${level12.length} skills):**`, "", "```bash", npx(namesOf(level12)), "```", "",
    "Level 3: add single skills with `--skill <name>` when you need them.", "",
    "## Ready-made bundles", "",
    "Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).", "",
    "| Bundle | Skills | Description |", "|--------|--------|-------------|",
    ...track.bundles.map((b) => `| [\`${b}\`](../bundles.md#${b}) | ${bundleOf.get(b).skills.length} | ${bundleOf.get(b).description} |`),
    "", "## Combine with", "",
    ...track.combineWith.map((id) => `- [${advisor.tracks.find((t) => t.id === id).title}](${id}.md)`),
    "", "## Watch out", "", track.watchOut, "");
  outputs.set(`skill-advisor/tracks/${track.id}.md`, lines.join("\n"));
  trackStats.set(track.id, { ...track, count: seen.length, sets: { 1: level1, 2: level12 } });
}

// ---------------------------------------------------------------- recommendations.md
const profiles = advisor.profiles || [];
const recLines = ["# Recommended Combinations", "",
  "Ready-made combinations of tracks for common situations. Each one merges the chosen level of every track (security baselines included), removes duplicates, and gives one install command.", "",
  "[← Advisor home](README.md) · [Bundles](bundles.md) · [Recipes](recipes.md)", "",
  "| Situation | Tracks | Skills |", "|-----------|--------|--------|"];
const recSections = [];
for (const profile of profiles) {
  const paths = [];
  profile.tracks.forEach(({ track, level }) => {
    if (!trackStats.has(track)) throw new Error(`tracks.json: profile ${profile.id} names unknown track ${track}`);
    trackStats.get(track).sets[level].forEach((p) => { if (!paths.includes(p)) paths.push(p); });
  });
  const trackList = profile.tracks.map(({ track, level }) => `[${trackStats.get(track).title}](tracks/${track}.md) L${level === 1 ? "1" : "1–2"}`).join(" + ");
  recLines.push(`| [${profile.title}](#${profile.id}) | ${trackList} | ${paths.length} |`);
  recSections.push(`<a id="${profile.id}"></a>`, `## ${profile.title}`, "", `**Situation:** ${profile.situation}`, "",
    `**Combines:** ${trackList} — **${paths.length} skills**${paths.length > 60 ? " (large: trim Level 2 skills you do not need)" : ""}`, "",
    "```bash", npx(namesOf(paths)), "```", "", `**Next:** ${profile.notes}`, "");
}
outputs.set("skill-advisor/recommendations.md", [...recLines, "", ...recSections].join("\n"));

// ---------------------------------------------------------------- bundles.md
function bundleSection(b) {
  const out = [`### ${b.name}`, "", `${b.description} — **${b.skills.length} skills**`, ""];
  const cmd = npx(b.skills);
  if (b.skills.length > 40) out.push("<details><summary>Install command</summary>", "", "```bash", cmd, "```", "", "</details>", "");
  else out.push("```bash", cmd, "```", "");
  const links = b.skills.map((n) => `[\`${n}\`](../skills/${nameToPath.get(n)}/SKILL.md)`).join(", ");
  if (b.skills.length <= 40) {
    out.push("<details><summary>Skills and team skill pack (package.json)</summary>", "", links, "",
      "```json", JSON.stringify({ skills: b.skills.map((n) => `${REPO}@${n}`) }, null, 2), "```", "", "</details>", "");
  } else out.push("<details><summary>Skills</summary>", "", links, "", "</details>", "");
  return out;
}
const bundleLines = ["# Bundles", "",
  "Every bundle is a named list of skills from [`bundles/bundle-definitions.json`](../bundles/bundle-definitions.json). " +
  "The `skills` CLI installs skills by name, so each bundle below comes with the exact command that installs it.", "",
  "[← Advisor home](README.md) · [Build a custom bundle](custom-bundles.md) · [Recipes](recipes.md)", "",
  "Add `-a <agent>` (for example `-a claude-code`), `-g` (global) or `-y` (no prompts) to any command. " +
  "Prefer a focused bundle: every installed skill takes listing space in the agent's context.", "",
  "## Index", "", "| Bundle | Skills | Kind |", "|--------|--------|------|",
  ...focused.map((b) => `| [${b.name}](#${b.name}) | ${b.skills.length} | focused |`),
  ...broad.map((b) => `| [${b.name}](#${b.name}) | ${b.skills.length} | broad |`), "",
  "## Focused bundles", "", ...focused.flatMap(bundleSection),
  "## Broad bundles", "", "Stack or role bundles with 60+ skills. Good for exploring; for daily work start from a [track](README.md#pick-your-track) instead.", "",
  ...broad.flatMap(bundleSection)];
outputs.set("skill-advisor/bundles.md", bundleLines.join("\n"));

// ---------------------------------------------------------------- skill-advisor/README.md
const tracksByGroup = advisor.groups.flatMap((g) => g.tracks);
const advisorIndex = ["# Skill Combination Advisor", "",
  `This repository ships **${skills.size} skills** and **${bundles.length} bundles**. Installing everything makes agents slower and less precise, ` +
  "so this advisor helps you pick a small, well-matched set for your role and project.", "",
  "## How to choose in 3 steps", "",
  "1. **Pick your track** below — the role or direction closest to your work.",
  "2. **Pick a level** — start at Level 1, add Level 2 when the project needs it, add Level 3 skills one by one.",
  "3. **Combine** — add a second track or a recipe only for what the first one does not cover; remove overlapping skills.", "",
  "| Level | Size | Use it when |", "|-------|------|-------------|",
  "| **Level 1 — Essentials** | 2–9 skills | Everyday work of the role; safe default for any project |",
  "| **Level 2 — Professional** | +6–12 skills | Production concerns: scaling, security, delivery, team workflow |",
  "| **Level 3 — Specialist** | add one at a time | Deep, narrow problems you actually have right now |", "",
  "**Security is built in.** Most tracks have a *security baseline*: the security skills for that domain (API security, secrets, " +
  "container security, AI prompt-injection defense, …). They are part of every install command on the track page, so the agent " +
  "applies those practices whenever it uses the track's skills, even after the skills are copied into another project.", "",
  "## Pick your track", "",
  ...advisor.groups.flatMap((g) => [`### ${g.title}`, "", "| Track | Who it is for | Skills in track | Closest bundle |", "|-------|---------------|-----------------|----------------|",
    ...g.tracks.map((id) => { const t = trackStats.get(id); return `| [${t.title}](tracks/${id}.md) | ${t.who} | ${t.count} | [\`${t.bundles[0]}\`](bundles.md#${t.bundles[0]}) |`; }), ""]),
  "## I want to…", "",
  "| Goal | Start here |", "|------|-----------|",
  "| Ship a SaaS MVP fast | [Recipe 1](recipes.md#1-saas-mvp-web) |",
  "| Build an LLM / RAG product | [Recipe 2](recipes.md#2-ai-saas-with-rag), then [ML & AI](tracks/ml-ai.md) |",
  "| Build AI agents | [AI Agent Builder](tracks/ai-agents.md) |",
  "| Stop agents producing generic \"AI-looking\" UI | [Recipe 4](recipes.md#4-ui-that-does-not-look-ai-generated) |",
  "| Launch a mobile app | [Recipe 3](recipes.md#3-mobile-app-with-a-managed-backend), then [Mobile](tracks/mobile.md) |",
  "| Run Kubernetes for many teams | [Recipe 5](recipes.md#5-kubernetes-platform-team) |",
  "| Pass a security review | [Recipe 6](recipes.md#6-security-review-before-launch) |",
  "| Install a whole bundle | [Bundles](bundles.md) |",
  "| Make my own team bundle | [Build a custom bundle](custom-bundles.md) |", "",
  "## Install", "",
  "The [`skills` CLI](https://github.com/vercel-labs/skills) installs skills by name; repeat `--skill` for each one:", "",
  "```bash", `npx skills add ${REPO} --list`, npx(["backend-api-design", "backend-idempotency"]) + " -a claude-code", "```", "",
  "Every track page has ready commands for Level 1 and Level 1 + 2, and every bundle has its command on the [bundles page](bundles.md).", "",
  "## Pages", "",
  "- [Bundles](bundles.md) — every bundle with its install command and team skill pack",
  "- [Build a custom bundle](custom-bundles.md) — combine bundles, pick single skills, share a set with your team",
  "- [Recommended combinations](recommendations.md) — ready multi-track sets for common situations, one command each",
  "- [Recipes](recipes.md) — small combinations for common situations",
  "- Tracks: " + tracksByGroup.map((id) => `[${trackStats.get(id).title}](tracks/${id}.md)`).join(", "), "",
  `Tracks list ${covered.size} hand-picked skills. The rest are reachable through [bundles](bundles.md) and the full catalog in the [master summary](../docs/skills-master-summary.md#skills-by-category).`, ""];
outputs.set("skill-advisor/README.md", advisorIndex.join("\n"));

// ---------------------------------------------------------------- README.md + master summary
const category = (p) => p.split("/")[0];
const catCount = new Map();
sortedPaths.forEach((p) => catCount.set(category(p), (catCount.get(category(p)) || 0) + 1));
const refCat = new Map();
refFiles.forEach((f) => { const c = f.split("/")[1]; refCat.set(c, (refCat.get(c) || 0) + 1); });
const catsBySize = [...catCount.keys()].sort((a, b) => catCount.get(b) - catCount.get(a) || byKey(a, b));
const trackFiles = files.filter((f) => f.startsWith("skill-advisor/tracks/") && f.endsWith(".md"));
const trackCount = Math.max(trackFiles.length, advisor.tracks.length);
const ruleFiles = files.filter((f) => f.startsWith(".claude/rules/") && f.endsWith(".md"));
const reportFiles = files.filter((f) => f.startsWith("reports/"));
const bundleRow = (b) => `| [\`${b.name}\`](skill-advisor/bundles.md#${b.name}) | ${b.skills.length} | ${b.description} |`;

const readme = `# @j4flmao/agent-skills

${skills.size} agent skills for software development, from planning and architecture to backend, frontend, mobile, desktop, DevOps, data, AI/ML, security, blockchain, games, low-level systems and quantum computing. Each skill is a \`SKILL.md\` with triggers, rules and a response format, plus optional deep-dive \`references/\`.

| | Count |
|---|---|
| Skills (\`SKILL.md\`) | ${skills.size} in ${catCount.size} categories |
| Reference files | ${fmt(refFiles.length)} |
| Bundles | ${bundles.length} (${focused.length} focused, ${broad.length} broad) |
| Advisor tracks | ${trackCount} |
| Agent integrations | 8 (Claude Code, Codex CLI, OpenCode, Amp, Cursor, Gemini, GitHub Copilot, Windsurf) |

## Not sure what to install? Start with the advisor

**[Skill Combination Advisor →](skill-advisor/README.md)** — pick a track for your role, choose a level (Essentials → Professional → Specialist), and copy one install command.

| Area | Tracks |
|------|--------|
${advisor.groups.map((g) => `| ${g.title} | ` + g.tracks.map((id) => `[${trackStats.get(id).title}](skill-advisor/tracks/${id}.md)`).join(" · ") + " |").join("\n")}

Also: [all bundles with install commands](skill-advisor/bundles.md) · [build your own bundle](skill-advisor/custom-bundles.md) · [recipes for common situations](skill-advisor/recipes.md).

## Installation

### Option 1 — \`npx skills\` (recommended)

The [\`skills\` CLI](https://github.com/vercel-labs/skills) installs skills by name. Repeat \`--skill\` for each one:

\`\`\`bash
npx skills add ${REPO} --list                      # list every skill name
npx skills add ${REPO} --skill backend-api-design --skill backend-idempotency
npx skills add ${REPO} --skill backend-api-design -a claude-code -g   # one agent, global
\`\`\`

There is no \`--bundle\` flag in the CLI: a bundle is a list of \`--skill\` options. Every bundle's full command is on the [bundles page](skill-advisor/bundles.md); teams can also pin a set in \`package.json\` (see [Build your own bundle](skill-advisor/custom-bundles.md#option-4--share-a-fixed-set-with-your-team-skill-pack)).

### Option 2 — Use this repository directly

Agent configs are already in the repo. Clone it and open it in your agent:

\`\`\`bash
git clone https://github.com/${REPO}
cd agent-skills
\`\`\`

| Agent | Auto-loaded files |
|-------|-------------------|
| Claude Code | \`.claude/CLAUDE.md\` + \`.claude/rules/\` + \`.claude/skills/\` + \`.claude/hooks/\` + \`.claude/settings.json\` |
| OpenCode | \`.opencode/AGENTS.md\` + \`.opencode/commands/*.md\` |
| Amp | \`.amp/AGENTS.md\` + \`.amp/agent-skills.md\` + \`.amp/subagents.md\` |
| GitHub Copilot | \`.github/copilot-instructions.md\` |
| Gemini | \`.gemini/INSTRUCTIONS.md\` |
| Cursor | \`.cursor/rules/agent-skills.mdc\` + \`.cursor/rules/compression.mdc\` |
| Codex CLI | \`.codex/AGENTS.md\` + \`.codex/rules/\` + \`.codex/hooks/\` + \`.codex/skills/\` |
| Windsurf | \`.windsurf/rules/*.md\` |

### Option 3 — Copy from a local clone (offline)

\`\`\`bash
git clone https://github.com/${REPO} ~/agent-skills
cd ~/agent-skills
node scripts/pack-skills.js --out /path/to/project/.claude/skills --bundle ai-agents
node scripts/pack-skills.js --out /path/to/project/.claude/skills backend-api-design backend-idempotency
\`\`\`

\`pack-skills.js\` also copies the shared reference files a skill links to, so links keep working.

## Bundles

${bundles.length} bundles, defined in [\`bundles/bundle-definitions.json\`](bundles/bundle-definitions.json); every skill belongs to at least one. Prefer a focused bundle: agents list every installed skill in their context, so smaller sets route more precisely.

**Focused bundles** (under ${FOCUSED_MAX} skills)

| Bundle | Skills | Description |
|--------|--------|-------------|
${focused.map(bundleRow).join("\n")}

**Broad bundles** (stack or role, ${FOCUSED_MAX}+ skills)

| Bundle | Skills | Description |
|--------|--------|-------------|
${broad.map(bundleRow).join("\n")}

## How skills work

1. You describe the problem in plain words.
2. The agent matches trigger phrases in the installed skills' descriptions.
3. It loads the matching \`SKILL.md\`, and its \`references/\` only when it needs depth.
4. It answers in that skill's response format.

\`\`\`
"write a brief for a chat app"          → create-brief
"design the order database schema"       → backend-database-patterns
"review this PR for security issues"     → code-review
"set up Docker for this project"         → docker-patterns
"build an iOS order list screen"         → ios
\`\`\`

No match? The agent routes through \`master-orchestrator\`, detects the stack, and picks a skill.

## Skills by category

| Category | Skills | Reference files |
|----------|--------|-----------------|
${catsBySize.map((c) => `| \`${c}\` | ${catCount.get(c)} | ${refCat.get(c) || 0} |`).join("\n")}

The full list of skill names per category is in [docs/skills-master-summary.md](docs/skills-master-summary.md); the routing keywords are in [.claude/rules/routing.md](.claude/rules/routing.md).

## Repository layout

\`\`\`
agent-skills/
├── skills/            ${skills.size} skills in ${catCount.size} categories (+ references/)
├── skill-advisor/     Skill Combination Advisor: ${trackCount} tracks, bundles, recipes, custom bundles
├── bundles/           bundle-definitions.json (single source of truth for bundles)
├── docs/              reliability spec, governance matrix, master summary
├── reports/           research reports (evaluation architecture, visual testing)
├── scripts/           validators, generate-docs.js, pack-skills.js
├── AGENTS.md          repository-wide agent reliability rules
└── .claude/ .codex/ .opencode/ .amp/ .cursor/ .gemini/ .github/ .windsurf/   agent configs
\`\`\`

## Maintaining

\`\`\`bash
npm run docs       # regenerate README, docs/skills-master-summary.md and skill-advisor/ from the data
npm run validate   # names, bundles, routing, links, fences, deprecated APIs, and stale generated docs
\`\`\`

Edit skills, \`bundles/bundle-definitions.json\` or \`skill-advisor/tracks.json\`, then run both. CI runs the same checks plus an external link check on every push and pull request (\`.github/workflows/pr-static.yml\`).

## Output compression

Every skill enforces: **no filler, no preamble, no postamble**. The rules live in \`.claude/rules/compression.md\` and the matching files of each agent config.

## License

MIT © j4flmao
`;
outputs.set("README.md", readme);

const summary = ["# Skills Master Summary", "",
  "Generated by `npm run docs`. Counts include only files tracked by git (paths in `.gitignore` are excluded).", "",
  "## Totals", "",
  "| Metric | Count |", "|--------|-------|",
  `| Skills (\`SKILL.md\`) | ${skills.size} |`,
  `| Categories | ${catCount.size} |`,
  `| \`SKILL.md\` lines | ${fmt(skillFiles.reduce((s, f) => s + lineCount(f), 0))} |`,
  `| Reference files (\`references/*.md\`) | ${fmt(refFiles.length)} |`,
  `| Reference lines | ${fmt(refFiles.reduce((s, f) => s + lineCount(f), 0))} |`,
  `| Standalone notes in \`skills/\` (not a skill or reference) | ${looseMd.length} |`,
  `| Bundles | ${bundles.length} (${focused.length} focused, ${broad.length} broad) |`,
  `| Advisor tracks | ${trackCount} |`,
  `| Claude Code rules (\`.claude/rules/*.md\`) | ${ruleFiles.length} |`,
  `| Research reports | ${reportFiles.length} |`,
  `| Tracked files in repository | ${fmt(new Set([...files, ...outputs.keys(), "docs/skills-master-summary.md"]).size)} |`, "",
  "## Skills by category", "",
  "| Category | Skills | Reference files | Skill names |", "|----------|--------|-----------------|-------------|",
  ...catsBySize.map((c) => `| \`${c}\` | ${catCount.get(c)} | ${refCat.get(c) || 0} | ` +
    sortedPaths.filter((p) => category(p) === c).map((p) => `\`${skills.get(p).name}\``).join(", ") + " |"),
  "", "## Bundles", "", "| Bundle | Skills | Kind |", "|--------|--------|------|",
  ...bundles.map((b) => `| \`${b.name}\` | ${b.skills.length} | ${b.skills.length < FOCUSED_MAX ? "focused" : "broad"} |`),
  "", "## Standalone notes", "",
  "Markdown files under `skills/` that are neither a `SKILL.md` nor inside a `references/` folder. Agents do not load them automatically.", "",
  ...looseMd.map((f) => `- \`${f}\``),
  "", "## How these numbers are produced", "",
  "`git ls-files --cached --others --exclude-standard` lists the files; a skill is a `SKILL.md`, a reference is any `.md` inside a `references/` folder. " +
  "`npm run validate` checks names, bundles, routing targets, links and code fences against the same data.", ""];
outputs.set("docs/skills-master-summary.md", summary.join("\n"));

// ---------------------------------------------------------------- write or check
const generatedTracks = new Set([...outputs.keys()].filter((f) => f.startsWith("skill-advisor/tracks/")));
const extraTracks = fs.readdirSync(path.join(root, "skill-advisor", "tracks"))
  .map((f) => `skill-advisor/tracks/${f}`).filter((f) => f.endsWith(".md") && !generatedTracks.has(f));

if (check) {
  const stale = [...outputs].filter(([rel, content]) => !fs.existsSync(path.join(root, rel)) || read(rel) !== content).map(([rel]) => rel);
  stale.push(...extraTracks.map((f) => f + " (no longer in tracks.json)"));
  if (stale.length) {
    console.error("FAIL: generated docs are out of date — run `npm run docs`:\n" + stale.map((f) => "  " + f).join("\n"));
    process.exit(1);
  }
  console.log(`Generated docs are up to date (${outputs.size} files).`);
} else {
  for (const [rel, content] of outputs) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  extraTracks.forEach((f) => fs.unlinkSync(path.join(root, f)));
  console.log(`Wrote ${outputs.size} files` + (extraTracks.length ? `, removed ${extraTracks.length} stale track file(s)` : "") + ".");
}
