# Orchestrator Configuration per Agent Host

Where the orchestrator's routing rules are configured for each supported agent host, which keys those files use, and how to keep them consistent. The routing logic is the same everywhere; only the file that loads it differs.

## Configuration Inventory

| File | Purpose | Loaded |
|------|---------|--------|
| `AGENTS.md` (repo root) | Reliability contract shared by all hosts | By hosts that read AGENTS.md; referenced by others |
| `.claude/CLAUDE.md` | Claude Code entry: skill usage, hooks, pointers | Every Claude Code session in the repo |
| `.claude/rules/*.md` | Topic rules incl. `routing.md`, `structure.md` | Auto-loaded with CLAUDE.md |
| `.claude/skills/<name>/SKILL.md` | Claude Code slash skills (`/commit`, `/deploy`, ...) | On invocation or by description match |
| `.claude/settings.json` | Hooks and permissions | Claude Code startup |
| `.cursor/rules/*.mdc` | Cursor project rules | By `alwaysApply`, `globs`, or description |
| `.codex/AGENTS.md`, `.codex/rules/` | Codex CLI instructions | Codex sessions |
| `.opencode/AGENTS.md`, `.opencode/commands/` | OpenCode instructions and commands | OpenCode sessions |
| `.amp/AGENTS.md`, `.amp/subagents.md` | Amp instructions and subagents | Amp sessions |
| `.github/copilot-instructions.md`, `.github/rules/` | Copilot repository instructions | Copilot Chat / agent |
| `.gemini/INSTRUCTIONS.md`, `.windsurf/INSTRUCTIONS.md` | Gemini / Windsurf instructions | Per host settings |
| `bundles/*.json` | Which skills a packaged distribution contains | Install time |

## Claude Code

### Slash-skill frontmatter
```yaml
---
name: fix-issue
description: Fix a GitHub issue by number. Read the issue, implement the fix, write tests, commit.
disable-model-invocation: true      # only the user can trigger it
allowed-tools: Bash(gh *) Bash(git *) Read Write Edit Grep Glob
argument-hint: [issue-number]
---
```

| Key | Effect |
|-----|--------|
| `name` | Slash command name |
| `description` | Used by the model to decide when the skill applies |
| `disable-model-invocation` | `true` = user-only; use for side-effecting skills (deploy, commit) |
| `allowed-tools` | Tools pre-approved while the skill runs |
| `argument-hint` | Shown in the command picker |
| `context: fork` + `agent` | Run in a forked subagent (e.g. `agent: Explore` for read-only research) |

Routing skills in `skills/` are plain Markdown read on demand; only `.claude/skills/` entries become slash commands.

### Hooks (`.claude/settings.json`)
The repo wires `PreToolUse` (block `rm -rf`), `PostToolUse` (change log) and `SessionStart` (session log). Hooks enforce guardrails; they do not route.

## Cursor

```markdown
---
description: Route requests to j4flmao skills; use when no specific skill rule matches
globs:
alwaysApply: true
---
```

| Key | Effect |
|-----|--------|
| `alwaysApply: true` | Rule included in every request |
| `globs` | Comma-separated patterns; rule auto-attaches when matching files are in context |
| `description` | Lets the agent pull the rule in when relevant (when not always-applied) |

The key is `globs` (plural). A misspelled key is silently ignored and the rule never auto-attaches.

## GitHub Copilot

- `.github/copilot-instructions.md`: repository-wide instructions, always applied.
- `.github/instructions/*.instructions.md`: path-scoped instructions with frontmatter `applyTo: "src/**/*.ts"`.
- Keep the routing summary short; Copilot instructions share the context window with code.

## AGENTS.md-based hosts (Codex, OpenCode, Amp)

`AGENTS.md` is plain Markdown with no required schema. Nested `AGENTS.md` files in subdirectories apply to that subtree; the closest file to the edited path takes precedence. Put routing pointers (`skills/core/master-orchestrator/SKILL.md`, `routing.md`) near the top.

## Routing Table Placement

The canonical routing table is `.claude/rules/routing.md`. Hosts that cannot auto-load a rules directory get a copy or a pointer in their entry file. Rules for keeping copies aligned:

1. Edit the canonical file first.
2. Propagate to every host directory in the same commit.
3. Run `npm run validate:governance` (`scripts/validate-agent-governance.js`) to detect drift.
4. Never let one host's copy list a skill path that does not exist.

## Bundles

`bundles/bundle-definitions.json` is an array of `{ name, description, skills[] }`; each published bundle also has `bundles/<name>.json`. When a bundle omits a skill, the orchestrator must not route to it. Fall back to the nearest included skill in the same category or use Template C.

## Environment-Specific Notes

| Situation | Configuration |
|-----------|---------------|
| Windows | Hook scripts need a POSIX shell (Git Bash); PowerShell globbing uses `-Path`, not `-LiteralPath` |
| Monorepo | Nested `AGENTS.md` per package for package-specific stacks |
| Restricted environments | Remove side-effecting slash skills or set `disable-model-invocation: true` |

## Checklist

- [ ] Canonical routing in `.claude/rules/routing.md`; copies in sync
- [ ] Cursor rules use `alwaysApply` / `globs` / `description` keys exactly
- [ ] Side-effecting Claude skills are `disable-model-invocation: true`
- [ ] Bundled installs route only to included skills
- [ ] `validate:governance` passes after every config change
