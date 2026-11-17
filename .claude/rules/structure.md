# Structure
```
agent-skills/
├── AGENTS.md        Repository-wide agent reliability rules (normative entry point)
├── .claude/         Claude Code (CLAUDE.md + INSTRUCTIONS.md + rules/ + skills/ + hooks/ + settings.json)
│   ├── skills/      Claude Code skills (commit, deploy, deep-research, fix-issue)
│   ├── backend/ (83)  devops/ (62)  frontend/ (56)  data/ (36)  mobile/ (28)
│   ├── game/ (27)  security/ (23)  ml/ (17)  personas/ (17)  blockchain/ (16)
│   ├── enterprise/ (16)  management/ (16)  cloud-native/ (14)  languages/ (14)  planning/ (13)
│   ├── ai/ (12)  dev-loop/ (12)  hardware-acceleration/ (11)  desktop/ (10)  quality/ (10)
│   ├── product/ (9)  quantum-computing/ (8)  design/ (7)  niche/ (7)  cybersecurity/ (6)
│   ├── rnd/ (6)  embedded-systems/ (5)  low-level/ (5)  architecture/ (4)  core/ (4)
│   ├── data-science/ (4)  prompt-engineering/ (4)  seo/ (4)  ecommerce/ (3)  fundamental-truths/ (3)
│   ├── playbooks/ (3)  tools/ (3)  harness-engineering/ (2)  site-reliability-engineering/ (2)  system-design/ (2)
│   └── web/ (2)  aspirational/ (1)
├── .opencode/       OpenCode (AGENTS.md + INSTRUCTIONS.md + commands/ + rules/)
├── .amp/            Amp (AGENTS.md + agent-skills.md + subagents.md + rules/)
├── .github/         GitHub Copilot (copilot-instructions.md + rules/)
├── .gemini/         Gemini (INSTRUCTIONS.md + rules/)
├── .cursor/         Cursor (INSTRUCTIONS.md + rules/*.mdc)
├── .windsurf/       Windsurf (INSTRUCTIONS.md + rules/)
├── .codex/          Codex CLI (AGENTS.md + INSTRUCTIONS.md + rules/ + hooks/ + skills/)
├── skills/          587 SKILL.md in 42 categories (each may have references/*.md)
│   ├── backend/ (83)  devops/ (62)  frontend/ (56)  data/ (36)  mobile/ (28)
│   ├── game/ (27)  security/ (23)  ml/ (17)  personas/ (17)  blockchain/ (16)
│   ├── enterprise/ (16)  management/ (16)  cloud-native/ (14)  languages/ (14)  planning/ (13)
│   ├── ai/ (12)  dev-loop/ (12)  hardware-acceleration/ (11)  desktop/ (10)  quality/ (10)
│   ├── product/ (9)  quantum-computing/ (8)  design/ (7)  niche/ (7)  cybersecurity/ (6)
│   ├── rnd/ (6)  embedded-systems/ (5)  low-level/ (5)  architecture/ (4)  core/ (4)
│   ├── data-science/ (4)  prompt-engineering/ (4)  seo/ (4)  ecommerce/ (3)  fundamental-truths/ (3)
│   ├── playbooks/ (3)  tools/ (3)  harness-engineering/ (2)  site-reliability-engineering/ (2)  system-design/ (2)
│   └── web/ (2)  aspirational/ (1)
├── skill-advisor/   Skill Combination Advisor: README (index), bundles.md, custom-bundles.md, recipes.md, recommendations.md, tracks.json + tracks/*.md (78 tracks in 10 groups, 20 recommended combinations; most tracks carry a security baseline)
├── bundles/         bundle-definitions.json — single source of truth for all bundles
├── docs/            agent-reliability-spec.md, agent-governance-matrix.md, skills-master-summary.md
├── reports/         research reports (English)
└── scripts/         validators (npm run validate), generate-docs.js (npm run docs), pack-skills.js
```
Total: 587 SKILL.md + 4,036 reference files + 4 Claude Code skills + 3 hook scripts | 8 agent configs.
Full per-category skill list: see the Quick Map in `routing.md`.
