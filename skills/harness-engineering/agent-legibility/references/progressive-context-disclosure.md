# Progressive Context Disclosure for Agents

Agents work within a finite context window, and irrelevant instructions dilute attention to relevant ones. Progressive disclosure means giving an agent a small, always-loaded core and letting it pull detail only when a task needs it. This reference covers layering, loading mechanisms in common tools, and how to write each layer.

## The Layers

| Layer | Loaded | Size target | Content |
|-------|--------|-------------|---------|
| 0. Always-on core | Every session | Short (tens of lines to a few hundred) | Project purpose, commands, hard constraints, where to look next |
| 1. Scoped rules | When working in a path or file type | Short per file | Language/framework conventions, directory-specific rules |
| 2. Task skills/playbooks | When a task matches a trigger | Medium | Step-by-step procedures (release, migration, incident) |
| 3. Reference material | On explicit read | Any | Architecture docs, API specs, ADRs, runbooks |

The core says what exists and when to read it; it does not inline layers 2-3.

## Mechanisms by Tool

| Mechanism | Example tools | Behavior |
|-----------|---------------|----------|
| Root instruction file | `AGENTS.md` (many tools), `CLAUDE.md`, `.github/copilot-instructions.md`, `GEMINI.md` | Loaded at session start |
| Nested instruction files | Nested `AGENTS.md`/`CLAUDE.md` in subdirectories | Loaded or preferred when working in that subtree (tool-dependent) |
| Path-scoped rules | Cursor `.cursor/rules/*.mdc` with `globs`; Copilot `.github/instructions/*.instructions.md` with `applyTo` | Attached when matching files are in play |
| Skills | Claude Code / Agent SDK skills (`SKILL.md` with name + description frontmatter) | Only name/description loaded up front; body loaded when invoked or relevant |
| Imports/links | `@path/to/file` imports in CLAUDE.md; Markdown links | Imported files load with the parent; links are read on demand |
| Subagents | Claude Code subagents, other agent delegations | Separate context; return only a summary |

Check each tool's documentation for exact precedence and loading rules; they differ and evolve. Imports load content eagerly, so use plain links for material that should be read only on demand.

## Writing the Core (Layer 0)

```markdown
# AGENTS.md

Orders platform: NestJS API + React admin, Postgres.

## Commands
- Test: `pnpm test` (single file: `pnpm test path/to/file.spec.ts`)
- Lint/typecheck: `pnpm lint && pnpm typecheck`

## Hard rules
- Never edit files under `src/generated/`; run `pnpm codegen`.
- Database changes require a migration in `prisma/migrations/`.

## Where to look
- Architecture and module boundaries: `docs/architecture.md`
- Release procedure: `docs/runbooks/release.md` (read before tagging)
- Payments code has extra rules: `src/payments/AGENTS.md`
```

Each pointer says when to read it. Without a trigger condition, agents either read everything or nothing.

## Writing Scoped Rules (Layer 1)

```markdown
---
description: React component conventions
globs: ["web/src/**/*.tsx"]
---
- Function components only; hooks for state.
- Data fetching via TanStack Query hooks in `web/src/api/`.
- Tests with Testing Library; query by role, not test IDs.
```

Keep each rule file focused on one scope. If a rule applies everywhere, it belongs in the core; if it applies only during a procedure, it belongs in a skill.

## Writing Skills (Layer 2)

A skill's description is the routing signal; it must say what the skill does and when to use it.

```markdown
---
name: db-migration
description: Create and verify a Prisma database migration. Use when changing prisma/schema.prisma or when asked to add/alter tables or columns.
---
1. Edit `prisma/schema.prisma`.
2. Run `pnpm prisma migrate dev --name <change>`; inspect the generated SQL.
3. For column renames or drops, use expand/contract: see `docs/migrations.md`.
4. Run `pnpm test:integration`.
```

Bodies can link to further references (layer 3), keeping the skill itself concise.

## Reference Material (Layer 3)

- Optimize for retrieval: descriptive filenames, headings matching likely search terms, a short summary at the top.
- Split large docs by topic so an agent can read one section's file instead of a monolith.
- Include "last verified" dates or owners for operational docs.

## Deciding Where Content Goes

| Question | If yes |
|----------|--------|
| Would violating it cause damage in any task? | Core (hard rule) |
| Needed in most sessions? | Core |
| Only relevant for certain files? | Scoped rule |
| A multi-step procedure for a specific task? | Skill/runbook |
| Background knowledge or detailed spec? | Reference doc, linked |
| Enforceable by tooling? | Linter/CI/hook, with a one-line mention |

Prefer enforcement over instructions: a lint rule or pre-commit hook is cheaper in context and more reliable than prose.

## Context Hygiene During Sessions

- Delegate wide searches to subagents so only conclusions enter the main context.
- Summarize long tool outputs; avoid pasting entire logs.
- Restart or compact sessions when switching to unrelated tasks.

## Measuring

- Track instruction file sizes in CI; flag growth beyond a budget.
- Review agent transcripts: which docs were read, which were ignored, which instructions were violated. Move frequently needed content up a layer and rarely used content down.
- Evaluate with representative tasks after restructuring.

## Anti-Patterns

- Inlining the whole architecture doc into the root instruction file.
- Pointers without triggers ("See docs/ for more").
- The same rule in several layers with different wording.
- Eager `@imports` of large files that are only occasionally relevant.
- Rules for things a formatter already enforces.

## Checklist

- [ ] Core file small, with commands, hard rules and conditional pointers
- [ ] Path-scoped rules for language/directory conventions
- [ ] Procedures packaged as skills with precise descriptions
- [ ] Reference docs split by topic with clear titles
- [ ] Enforceable rules moved into tooling
- [ ] Size budgets and periodic transcript reviews
