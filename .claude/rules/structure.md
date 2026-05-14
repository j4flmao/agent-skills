# Structure
```
agent-skills/
├── .claude/         Claude Code (CLAUDE.md + rules/ + skills/ + hooks/ + settings.json)
│   ├── skills/      Claude Code skills (commit, deploy, deep-research, fix-issue)
│   ├── hooks/       Hook scripts (.sh + .ps1) + README
│   └── logs/        Runtime hook logs (gitignored)
├── .opencode/       OpenCode (AGENTS.md + commands/)
├── .amp/            Amp (agent-skills.md + AGENTS.md + subagents.md + plugins/)
├── .github/         GitHub Copilot (copilot-instructions.md)
├── .gemini/         Gemini (INSTRUCTIONS.md)
├── .cursor/         Cursor (rules/*.mdc)
├── .codex/          Codex CLI (AGENTS.md + config.md + rules/ + hooks/ + skills/)
├── skills/
│   ├── core/         (2)
│   ├── planning/     (5)
│   ├── backend/      (20)
│   ├── frontend/     (13)
│   ├── mobile/       (3)
│   ├── dev-loop/     (8)
│   ├── devops/       (10)
│   └── management/   (8)
└── bundles/          bundle-definitions.json
```
Total: 76 SKILL.md + 128 refs + 4 Claude Code skills + 6 hook scripts | 7 agent configs
