# Agent Reference

## Agent Config Matrix

| Agent | Config File | Auto-loaded | Hooks | Skills |
|-------|-------------|-------------|-------|--------|
| Claude Code | `.claude/CLAUDE.md` | Yes | 6 (Bash + PowerShell) | 4 |
| OpenCode | `.opencode/AGENTS.md` | Yes | - | - |
| Amp | `.amp/AGENTS.md` | Yes | - | - |
| Copilot | `.github/copilot-instructions.md` | Yes | - | - |
| Gemini | `.gemini/INSTRUCTIONS.md` | Yes | - | - |
| Cursor | `.cursor/rules/agent-skills.mdc` | Yes | - | - |
| Codex CLI | `.codex/AGENTS.md` | Yes | 5 (Python) | - |
| Windsurf | `.windsurf/rules/*.md` | Yes | - | - |

## Claude Code

Config: `.claude/CLAUDE.md` + `.claude/rules/`

Skills (`.claude/skills/`):
- `commit` — Stage and commit with conventional format. Trigger: `/commit`
- `deep-research` — Forked Explore agent deep-dive. Trigger: `/deep-research`
- `deploy` — Production deploy checklist. Trigger: `/deploy`
- `fix-issue` — GitHub issue fix by number. Trigger: `/fix-issue 123`

Hooks (`.claude/hooks/`):
- `PreToolUse` — Blocks `rm -rf` in Bash commands
- `PostToolUse` — Logs all Write/Edit changes to `.claude/hooks/logs/`
- `SessionStart` — Creates session timestamp log on startup
- Scripts in `.claude/hooks/scripts/` (`.sh` + `.ps1`)

## OpenCode

Config: `.opencode/AGENTS.md`

Commands (`.opencode/commands/`):
- `routes.md` — Lists all 105 skills grouped by phase
- `add-skill.md` — Creates a new skill scaffold
- `help.md` — OpenCode usage guide

Compression optimized for local models (qwen2.5-coder:14b).

## Amp

Config: `.amp/AGENTS.md` + `.amp/agent-skills.md` + `.amp/subagents.md`

Subagents defined in `.amp/subagents.md` for specialized routing.

## Codex CLI

Config: `.codex/AGENTS.md` + `.codex/rules/`

Rules:
- `compression.md` — Output compression directives
- `routing.md` — All 105 skills with trigger keywords and full skill table
- `exec-policy.md` — Execution safety policies

Hooks (`.codex/hooks/`):
- `readme.py` — README generation hook
- `session-start.py` — Session initialization
- `pre-tool-use.py` — Pre-execution validation
- `post-tool-use.py` — Change logging
- `stop.py` — Cleanup on session end

Skills mapped in `.codex/skills/skill-map.json`.

## Cursor

Config: `.cursor/rules/agent-skills.mdc` + `.cursor/rules/compression.mdc`

Rules loaded by glob scope for all files.

## Windsurf

Config: `.windsurf/rules/*.md`

Rules:
- `compression.md` — Output compression directives
- `routing.md` — Skill routing keywords

Auto-loaded by Windsurf Cascade agent.

## Copying Config to Another Project

```bash
# Claude Code
cp -r .claude /path/to/project/

# OpenCode
cp -r .opencode /path/to/project/

# Cursor
cp -r .cursor /path/to/project/

# Amp
cp -r .amp /path/to/project/

# Codex CLI
cp -r .codex /path/to/project/

# Copilot (copy to .github/ in project root)
cp .github/copilot-instructions.md /path/to/project/.github/

# Gemini (copy to .gemini/ in project root)
cp -r .gemini /path/to/project/

# Windsurf
cp -r .windsurf /path/to/project/
```
