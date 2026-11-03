# Build Your Own Bundle

How to install a ready-made bundle, combine several, pick single skills, or share a fixed set with your team — all with `npx`, nothing to publish.

[← Advisor home](README.md) · [Bundles](bundles.md) · [Recipes](recipes.md)

## Why bundle size matters

Agents keep a short entry (name + description) for **every installed skill** in their context so they can decide which one to load. Claude Code, for example, reserves a small share of the context window for this listing and drops descriptions when it overflows, so the agent then has to choose by name alone. More skills means a larger listing and more look-alike skills competing for the same request.

| Installed skills | Typical result |
|------------------|----------------|
| up to ~30 | Precise routing; recommended for a single project |
| ~30–80 | Fine for a team bundle; remove overlapping pairs |
| 100+ | Exploration only; expect generic or wrong-skill answers |

These are working guidelines, not measured thresholds. [Agent Skills Evaluation Architecture](../reports/Agent%20skills%20evaluation%20architecture.md) explains how to measure routing accuracy on your own setup.

## How the `skills` CLI selects skills

The [`skills` CLI](https://github.com/vercel-labs/skills) installs skills **by name**. It has no bundle flag, so a bundle is simply a list of `--skill` options:

```bash
# see every skill name in this repository
npx skills add j4flmao/agent-skills --list

# install two skills for Claude Code only
npx skills add j4flmao/agent-skills --skill backend-api-design --skill backend-idempotency -a claude-code
```

Useful options: `-a <agent>` target agent(s), `-g` install globally, `-y` skip prompts (CI), `--copy` copy files instead of symlinking.

## Option 1 — Install a ready-made bundle

Open [Bundles](bundles.md), find the bundle, copy its command:

```bash
npx skills add j4flmao/agent-skills --skill agent-observability --skill ai-agent-architectures --skill ...
```

The commands are generated from [`bundles/bundle-definitions.json`](../bundles/bundle-definitions.json), and `npm run validate` checks that every name in them exists.

## Option 2 — Combine bundles or levels

Concatenate the `--skill` options of two focused bundles (or two track levels) into one command. Duplicate names are harmless. Prefer two focused bundles, for example `backend-patterns` + `access-control` + `quality-testing`, over one broad bundle such as `backend-only`.

## Option 3 — Pick single skills from a track

Each [track guide](README.md#pick-your-track) lists skills by level with their name and path, and gives commands for Level 1 and Level 1 + 2. Add a Level 3 skill when you meet the problem it solves:

```bash
npx skills add j4flmao/agent-skills --skill backend-distributed-locking
```

## Option 4 — Share a fixed set with your team (skill pack)

Declare the skills in your project's `package.json` and sync them. Every teammate and CI job then gets the same set:

```json
{
  "skills": [
    "j4flmao/agent-skills@backend-api-design",
    "j4flmao/agent-skills@backend-idempotency",
    "j4flmao/agent-skills@backend-audit-logging",
    "j4flmao/agent-skills@ecommerce-payment-processing",
    "j4flmao/agent-skills@security-sast-dast"
  ]
}
```

```bash
npx skills experimental_sync
```

Notes:

- `experimental_sync` (alias `sync`) is **experimental** in the `skills` CLI; its name and behavior may change.
- Sync records installed skills in a `skills-lock.json` in your project; pin a Git ref when you need reproducible content.
- Each focused bundle on the [bundles page](bundles.md) includes a ready `package.json` snippet.

## Option 5 — Propose a new bundle for this repository

Add an entry to `bundles/bundle-definitions.json`, then run the checks; they fail when a bundle names a skill that does not exist or a skill belongs to no bundle:

```json
{
  "name": "payments-api",
  "description": "Payments API: API design, idempotency, ledgers, audit, security",
  "skills": ["backend-api-design", "backend-idempotency", "backend-audit-logging", "ecommerce-payment-processing", "security-sast-dast"]
}
```

```bash
npm run validate
```

## Offline alternative

Without network access, copy skills from a local clone. `node scripts/pack-skills.js` copies skills by name or bundle and also brings the shared reference files a skill links to elsewhere in `skills/`:

```bash
node scripts/pack-skills.js --out ../my-app/.claude/skills --bundle ai-agents
```

## Checklist before you settle on a set

- [ ] One framework per layer (backend, frontend, mobile, desktop, game engine).
- [ ] Overlapping pairs removed (each track's "Watch out" section lists them).
- [ ] Repository rules read for your domain (`.claude/rules/`: crypto, database, distributed systems, RAG, ML, eBPF, MISRA-C, ZK, game engine, MCP servers).
- [ ] Ask the agent three real questions from your project and confirm it picks the skills you expect.
