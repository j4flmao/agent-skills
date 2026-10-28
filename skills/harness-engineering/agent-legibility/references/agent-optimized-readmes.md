# Agent-Optimized READMEs

A README is often the first file a coding agent reads. Written well, it lets an agent set up, build, test and locate code without guessing; written poorly, it causes wrong commands, invented scripts and wasted context. This reference covers README structure and wording for both humans and agents. Agent-only instruction files (AGENTS.md, CLAUDE.md) are covered in `agents-md-design.md` and `repo-native-instructions.md`.

## README vs Agent Instruction Files

| File | Audience | Content |
|------|----------|---------|
| `README.md` | Humans first, agents second | What the project is, how to install, run, test, contribute |
| `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` | Agents | Conventions, constraints, never-do rules, workflow expectations |
| `CONTRIBUTING.md` | Contributors | Branching, review, commit rules |
| `docs/` | Deep dives | Architecture, ADRs, runbooks |

Do not duplicate long content across these; link instead. Duplicates drift and agents then see contradictory instructions.

## Recommended Section Order

```markdown
# project-name

One-sentence description of what it does and for whom.

## Quick start
## Requirements
## Commands
## Project layout
## Configuration
## Testing
## Architecture (link)
## Contributing (link)
```

Put the commands section near the top: it is what an agent most needs.

## Commands: Exact and Copy-Pasteable

```markdown
## Commands

| Task | Command | Notes |
|------|---------|-------|
| Install | `pnpm install --frozen-lockfile` | Node 22 (see `.nvmrc`) |
| Dev server | `pnpm dev` | http://localhost:3000 |
| Unit tests | `pnpm test` | Vitest, no network needed |
| Single test file | `pnpm test src/orders/orders.spec.ts` | |
| Lint + typecheck | `pnpm lint && pnpm typecheck` | Must pass before commit |
| E2E tests | `pnpm test:e2e` | Requires `docker compose up -d db` first |
| DB migration | `pnpm db:migrate` | Uses `DATABASE_URL` |
```

Rules:
- Each command must actually exist (in `package.json`, `Makefile`, `justfile`, `pyproject.toml`). Agents run them literally.
- State prerequisites and side effects (needs Docker, writes to DB, hits network).
- Show how to run a single test; agents iterate on one test far more than on the suite.
- Mark destructive commands clearly (`pnpm db:reset` drops local database).

## Requirements: Pin Versions with Files

Reference the files tools read rather than prose:

```markdown
## Requirements
- Node version: `.nvmrc` (22.x)
- Python: `.python-version`, managed with `uv`
- Services: `compose.yaml` (Postgres 17, Redis 7)
```

## Project Layout

A short annotated tree beats paragraphs:

```markdown
## Project layout
src/
  api/          HTTP handlers (thin; no business logic)
  domain/       Business rules; no framework imports
  infra/        DB, queues, external clients
  jobs/         Background workers
tests/          Integration tests (unit tests sit next to source)
scripts/        One-off maintenance scripts; not imported by app code
```

Include only directories that matter; annotate responsibilities and boundaries.

## Configuration

- List required environment variables with meaning and an example-config pointer (`.env.example`), never real values.
- Say which variables are required at startup versus optional.

```markdown
| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | yes | `postgres://app:app@localhost:5432/app` | Primary DB |
| `REDIS_URL` | no | `redis://localhost:6379` | Cache; falls back to in-memory in dev |
```

## Writing Style for Agent Legibility

| Do | Avoid |
|----|-------|
| Imperative, specific statements ("Run `pnpm lint` before committing") | Vague guidance ("Make sure code is clean") |
| Concrete file paths and names | "The config file" without a path |
| Tables for commands and env vars | Commands buried in paragraphs |
| One canonical way to do each task | Several alternatives without a recommendation |
| Current information only | Outdated instructions left "for reference" |
| Explicit "do not" statements for real hazards | Long lists of trivial rules |

Headings should be descriptive so agents can jump to sections by name; avoid clever titles.

## Keeping It True

- CI check that every command in the README table exists (a small script parsing the table and checking `package.json` scripts or Make targets).
- Update the README in the same PR that changes scripts or layout.
- Link-check docs (`lychee`, `markdown-link-check`).
- Date or version sections that describe migrations in progress, and remove them when done.

## Monorepos

- Root README: overview, workspace tool commands (`pnpm -F <pkg> test`, `nx affected -t test`), and a table of packages with one-line purposes and owners.
- Each package README: package-specific commands and layout.
- Agents should be able to find the nearest README from any file; keep one per deployable/package.

## Length

Aim for a README an agent can read cheaply: overview and commands within the first screen; move deep architecture and history to `docs/` with links. Long READMEs consume context and bury the commands.

## Anti-Patterns

- Badges and marketing above the commands.
- Commands that only work on the author's machine (absolute paths, global installs).
- "See Slack/wiki" without a link, or links to private systems agents cannot access, with no summary.
- Instructions that contradict CI configuration.
- Hidden setup steps (manual DB creation) not written down.

## Checklist

- [ ] One-line description at top
- [ ] Commands table with install, run, test, single test, lint, typecheck
- [ ] Every listed command exists and is verified in CI
- [ ] Version files referenced (`.nvmrc`, `.python-version`, toolchain files)
- [ ] Annotated layout of key directories
- [ ] Env vars table pointing to `.env.example`
- [ ] Links to AGENTS.md/CONTRIBUTING/docs instead of duplication
