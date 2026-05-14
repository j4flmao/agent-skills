# Agent Skills — Amp

## Locations (first wins)

1. `~/.config/agents/skills/` — user-wide
2. `~/.config/amp/skills/` — user-wide legacy
3. `.agents/skills/` — project (commit to git)
4. `.claude/skills/` — Claude Code compat
5. `~/.claude/skills/` — Claude Code user compat
6. Plugins, toolboxes, built-in

## Format

```
my-skill/
├── SKILL.md        # required: name + description in frontmatter
├── mcp.json        # optional: bundle MCP servers
├── scripts/        # optional: helpers
└── templates/      # optional: templates
```

### SKILL.md

```markdown
---
name: my-skill
description: What it does and when Amp should use it
---

Instructions...
```

Only `name` + `description` always visible. Rest loads on demand.

### MCP servers in skills (mcp.json)

Bundle MCP tools — hidden until skill loads. Recommended over global MCP config.

**Local server:**
```json
{
  "chrome-devtools": {
    "command": "npx",
    "args": ["-y", "chrome-devtools-mcp@latest"],
    "includeTools": ["navigate_*", "take_screenshot", "click"]
  }
}
```

**Remote server:**
```json
{
  "linear": {
    "url": "https://mcp.linear.app/sse",
    "includeTools": ["list_issues", "create_issue", "update_issue"]
  }
}
```

**Fields:**
- Local: `command` (req), `args` (opt), `env` (opt)
- Remote: `url` (req), `headers` (opt)
- Common: `includeTools` (opt) — glob patterns to filter exposed tools

## View

CLI: Ctrl+O → `skill: list`

## Precedence notes

- `.agents/skills/` overrides `.claude/skills/` if same name
- Project skills > built-in
- User skills > project skills
- MCP server in settings > skill's mcp.json (same name)
