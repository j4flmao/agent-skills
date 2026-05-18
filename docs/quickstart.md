# Quickstart

## Prerequisites

- Git
- An AI agent that supports codebase context (Claude Code, OpenCode, Cursor, Codex CLI, Copilot, Gemini, Amp)

## Setup

```bash
git clone https://github.com/j4flmao/agent-skills
cd agent-skills
```

Open this directory in your agent. Agent configs auto-load:

| Agent | Auto-loaded config |
|-------|--------------------|
| Claude Code | `.claude/CLAUDE.md` + `.claude/rules/` |
| OpenCode | `.opencode/AGENTS.md` |
| Cursor | `.cursor/rules/` |
| Codex CLI | `.codex/AGENTS.md` + `.codex/rules/` |
| Copilot | `.github/copilot-instructions.md` |
| Gemini | `.gemini/INSTRUCTIONS.md` |
| Amp | `.amp/AGENTS.md` + `.amp/agent-skills.md` |

## Your First Skill Trigger

Skills activate by keyword. No need to remember skill names.

```
User: "write a brief for a chat app"       -> create-brief
User: "design the database schema"          -> database-patterns
User: "review this code for bugs"           -> code-review
User: "set up Docker for my project"        -> docker-patterns
User: "build an iOS login screen"           -> ios
User: "how do I cache API responses?"       -> caching
User: "set up GitHub Actions CI"            -> github-actions
User: "implement push notifications"        -> push-notifications
```

## Using in Your Own Project

Copy the agent config into any project:

```bash
# Copy config for your agent
cp -r .claude /path/to/your/project/     # Claude Code
cp -r .opencode /path/to/your/project/   # OpenCode
cp -r .cursor /path/to/your/project/     # Cursor
```

Or cherry-pick individual skills:

```bash
cp -r skills/backend/dotnet /path/to/project/skills/
cp -r skills/devops/docker-patterns /path/to/project/skills/
```

## Next Steps

- Browse `skills/` directories to explore available skills
- Each skill has a `SKILL.md` with trigger keywords and rules
- Reference files in `skills/*/references/` provide deep technical content
- See `docs/team-guide.md` for team setup
- See `docs/agent-reference.md` for per-agent configuration details

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Agent not triggering any skill | Check your agent config is in the project root |
| Wrong skill triggered | Be more specific with keywords in your prompt |
| Skill has no effect | Verify the `SKILL.md` frontmatter has correct `name` |
| Reference file not found | Check the link in SKILL.md references section |
