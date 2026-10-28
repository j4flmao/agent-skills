# Structure
```
agent-skills/
├── AGENTS.md        Repository-wide agent reliability rules (normative entry point)
├── .claude/         Claude Code (CLAUDE.md + INSTRUCTIONS.md + rules/ + skills/ + hooks/ + settings.json)
│   ├── skills/      Claude Code skills (commit, deploy, deep-research, fix-issue)
│   ├── hooks/       README + scripts/ (block-destructive.sh, log-changes.sh, session-start.sh)
│   └── logs/        Runtime hook logs (gitignored)
├── .opencode/       OpenCode (AGENTS.md + INSTRUCTIONS.md + commands/ + rules/)
├── .amp/            Amp (AGENTS.md + agent-skills.md + subagents.md + rules/)
├── .github/         GitHub Copilot (copilot-instructions.md + rules/)
├── .gemini/         Gemini (INSTRUCTIONS.md + rules/)
├── .cursor/         Cursor (INSTRUCTIONS.md + rules/*.mdc)
├── .windsurf/       Windsurf (INSTRUCTIONS.md + rules/)
├── .codex/          Codex CLI (AGENTS.md + INSTRUCTIONS.md + rules/ + hooks/ + skills/)
├── skills/          641 SKILL.md in 43 categories (each may have references/*.md)
│   ├── backend/ (91)  devops/ (70)  frontend/ (60)  data/ (39)  game/ (29)  mobile/ (28)
│   ├── security/ (23)  blockchain/ (19)  cloud-native/ (18)  enterprise/ (18)  management/ (18)
│   ├── ml/ (17)  personas/ (17)  languages/ (14)  planning/ (13)  ai/ (12)  dev-loop/ (12)
│   ├── quality/ (11)  hardware-acceleration/ (11)  desktop/ (10)  product/ (9)  niche/ (8)
│   ├── quantum-computing/ (8)  architecture/ (7)  cybersecurity/ (7)  design/ (7)
│   ├── embedded-systems/ (6)  rnd/ (6)  ecommerce/ (5)  low-level/ (5)  core/ (4)
│   ├── data-science/ (4)  fundamental-truths/ (4)  prompt-engineering/ (4)  seo/ (4)
│   ├── site-reliability-engineering/ (4)  system-design/ (4)  web/ (4)  playbooks/ (3)
│   └── tools/ (3)  harness-engineering/ (2)  quality-assurance/ (2)  aspirational/ (1)
├── bundles/         bundle-definitions.json (all bundles) + one <bundle>.json per published bundle
├── docs/            agent-reliability-spec.md, agent-governance-matrix.md, skills-master-summary.md
└── scripts/         validate-agent-governance.js (npm run validate:governance)
```
Total: 641 SKILL.md + 3,942 reference files + 4 Claude Code skills + 3 hook scripts | 8 agent configs.
Full per-category skill list: see the Quick Map in `routing.md`.
