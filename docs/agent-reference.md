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

## SKILL.md Standard Format

Every skill in the repository follows a standardized template (`SKILL.md`). This ensures skills are parseable by agents across all platforms.

### Frontmatter (YAML)

```yaml
---
name: <category>-<skill-name>
description: >
  Use this skill when... <trigger keywords>. This skill enforces: <rules>.
  Do NOT use for: <exclusions>.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [<category>, <domain>, <phase-N>]
---
```

Fields:
- `name` — unique identifier, prefixed by category (`ml-`, `ai-`, `security-`, etc.)
- `description` — single paragraph: trigger keywords, enforced rules, exclusions
- `version` — semver string
- `compatibility` — agent platforms the skill supports
- `tags` — routing tags including the pipeline phase (`phase-11`)

### Agent Protocol

Each skill defines a protocol section with:

1. **Trigger** — Exact user phrases that activate the skill (agent should match before routing)
2. **Input Context** — Information the skill needs before activating (framework, scale, constraints)
3. **Protocol / Steps** — Ordered procedure the agent follows
4. **Output** — What the skill produces (code, config, plan, report)
5. **Handoffs** — Skills to invoke after this one completes

### Workflow / Response Format

Skills specify a response convention:
- **Workflow** — Multi-step process if the skill involves a sequence of operations
- **Response Format** — Rules for formatting output (code blocks, sections, diagrams)
- **Validation** — Checkpoints to verify correctness before presenting results

### References Section

Every skill links to reference files:

```markdown
## References
- [Reference File 1](references/filename-1.md) — brief description
- [Reference File 2](references/filename-2.md) — brief description
```

## Reference Files Pattern

Each skill directory contains exactly **2 reference files** in `references/`:

```
skills/<category>/<skill-name>/
  SKILL.md
  references/
    <topic-1>.md
    <topic-2>.md
```

**Convention:** Two references per skill — one covering **core concepts / architecture**, the other covering **implementation patterns / operations**. For example:

| Skill | Reference 1 | Reference 2 |
|---|---|---|
| `ai/ai-agents` | `agent-architectures.md` | `orchestration.md` |
| `ai/embeddings` | `embedding-models.md` | `embedding-training.md` |
| `ai/ai-safety` | `bias-alignment.md` | `red-teaming-guardrails.md` |
| `security/sast-dast` | (static analysis patterns) | (dynamic analysis patterns) |

Reference files are depth-technical — they contain detailed guidelines, code snippets, configuration templates, and decision trees. They are loaded by the agent when the SKILL.md references section is followed.

## Bundle System

Bundles define **pre-configured skill collections** for specific project archetypes. They live in `bundles/*.json`:

| Bundle | Description |
|---|---|
| `fullstack-nestjs-react` | NestJS backend + React frontend |
| `fullstack-nestjs-react-complete` | Full-stack with all supporting skills |
| `fullstack-golang-vue` | Go backend + Vue frontend |
| `fullstack-rust-angular` | Rust backend + Angular frontend |
| `backend-only` | Backend skills only |
| `frontend-only` | Frontend skills only |
| `devops-only` | DevOps & infrastructure skills |
| `management-only` | Management & planning skills |

Each bundle is defined in `bundles/bundle-definitions.json` with:

```json
{
  "name": "fullstack-nestjs-react",
  "description": "Full stack: NestJS backend + React frontend",
  "skills": ["master-orchestrator", "project-init", "create-brief", ...]
}
```

During setup the user selects a bundle, and skill files are copied from `skills/` into the project. Bundles compose with kits (see `kits/` directory) for domain-specific add-ons.

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
