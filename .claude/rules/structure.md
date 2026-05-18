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
│   ├── mobile/       (4 stacks: ios, android, flutter, react-native + 7 universal)
│   ├── dev-loop/     (8)
│   ├── devops/       (10)
│   └── management/   (8)
└── bundles/          bundle-definitions.json
```
Total: 84 SKILL.md + 154 refs + 4 Claude Code skills + 6 hook scripts | 7 agent configs
