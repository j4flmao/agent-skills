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

## Choosing Your Bundles

Instead of cherry-picking individual skills, choose a **bundle** matching your project type:

```bash
# List available bundles
ls bundles/*.json

# Apply a bundle (copies skills into your project)
# Bundles define skill collections for specific stacks:
#   fullstack-nestjs-react   — NestJS + React
#   fullstack-golang-vue     — Go + Vue
#   fullstack-rust-angular   — Rust + Angular
#   backend-only             — Backend skills only
#   frontend-only            — Frontend skills only
#   devops-only              — DevOps & infrastructure
#   management-only          — Planning & management
```

See `docs/agent-reference.md#bundle-system` for details on each bundle.

## Basic Workflow Example

```
1. User says: "build a task management app"
2. Agent matches → skills/core/master-orchestrator/SKILL.md
3. Master orchestrator routes to:
   a. create-brief → product brief
   b. create-tech-spec → technical specification
   c. create-story → sprint stories
4. For each story, agent routes to domain skills:
   - backend-api-design + database-patterns
   - react-architecture + state-management
   - docker-patterns + github-actions
5. Each skill follows its SKILL.md protocol, loads reference files,
   and produces output → next skill picks up handoff
```

The master orchestrator (`skills/core/master-orchestrator/`) manages the full lifecycle. Individual skills activate by trigger keywords and hand off results to downstream skills.

## Multi-Agent Coordination

When using multi-agent setups (Amp subagents, Codex CLI routing, Claude Code projects), skills coordinate across agents:

```
User query
  ├── Router agent (master-orchestrator)
  │   ├── Frontend agent → frontend skills
  │   ├── Backend agent → backend skills
  │   ├── ML agent → ml/ + ai/ skills
  │   └── DevOps agent → devops skills
  └── Output assembled by orchestrator
```

Each agent loads a subset of skills relevant to its domain. The orchestrator agent holds the full skill map and delegates based on trigger keyword matching. For **single-agent setups**, all skills load into one context — the agent self-routes by matching trigger phrases in SKILL.md frontmatter.

**Key distinction:** Bundles define _which skills_ are available; agent configuration defines _how_ they are distributed across agents.

## Next Steps

- Browse `skills/` directories to explore available skills
- Each skill has a `SKILL.md` with trigger keywords and rules
- Reference files in `skills/*/references/` provide deep technical content
- Choose a bundle in `bundles/` to get started quickly
- See `docs/agent-reference.md` for per-agent configuration details
- See `docs/team-guide.md` for team setup
- See `docs/skills/README.md` for the full skill index

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Agent not triggering any skill | Check your agent config is in the project root |
| Wrong skill triggered | Be more specific with keywords in your prompt |
| Skill has no effect | Verify the `SKILL.md` frontmatter has correct `name` |
| Reference file not found | Check the link in SKILL.md references section |
