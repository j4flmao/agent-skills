# CLAUDE.md — j4flmao/skills

Project: 76 agent skills. Each `skills/<area>/<name>/SKILL.md` defines Trigger + Rules + Response Format.

## Use
- Match user request to skill trigger keywords
- No match → `skills/core/master-orchestrator/SKILL.md`
- Detect stack: read package.json, go.mod, Cargo.toml, etc.

Rules in `rules/` are auto-loaded. Reference them from memory.

## Skills
`.claude/skills/<name>/SKILL.md` — Claude Code-specific skills with frontmatter:
- `commit` — stage & commit with conventional format. `/commit`
- `deep-research` — forked Explore agent deep-dive. `/deep-research`
- `deploy` — production deploy checklist. `/deploy`
- `fix-issue` — GitHub issue fix by number. `/fix-issue 123`

## Hooks
`.claude/hooks/` — lifecycle automation:
- `PreToolUse` (Bash → `rm -rf` block)
- `PostToolUse` (Write|Edit → change log)
- `SessionStart` (startup → session log)

Hooks wired in `.claude/settings.json`. Scripts in `.claude/hooks/scripts/` (.sh + .ps1).
