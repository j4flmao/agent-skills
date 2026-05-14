# CLAUDE.md — j4flmao/skills

Project: 76 agent skills. Each `skills/<area>/<name>/SKILL.md` defines Trigger + Rules + Response Format.

## Use
- Match user request to skill trigger keywords
- No match → `skills/core/master-orchestrator/SKILL.md`
- Detect stack: read package.json, go.mod, Cargo.toml, etc.

Rules in `rules/` are auto-loaded. Reference them from memory.
