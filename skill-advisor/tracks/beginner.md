# Beginner Learning Path

**Who this is for:** You are learning software development and want solid habits from day one.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`python`](../../skills/languages/python/SKILL.md) | `languages/python` | Guide for Python build tools, package management, virtual environments, type annotations, async patterns, testing, and production deployment. |
| [`typescript`](../../skills/languages/typescript/SKILL.md) | `languages/typescript` | Guide for TypeScript build tools, tsconfig configuration, module resolution, advanced type system (generics, conditional types, template… |
| [`dev-loop-git-workflow`](../../skills/dev-loop/git-workflow/SKILL.md) | `dev-loop/git-workflow` | Establish and maintain effective Git workflows — branching strategy, commit conventions, merge patterns, and history management — that enable team… |
| [`dev-loop-debugging-strategy`](../../skills/dev-loop/debugging-strategy/SKILL.md) | `dev-loop/debugging-strategy` | Apply systematic debugging methodologies — root cause analysis, scientific method for debugging, log analysis, and tool-assisted tracing — to… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-unit-testing`](../../skills/quality/unit-testing/SKILL.md) | `quality/unit-testing` | Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. |
| [`frontend-patterns`](../../skills/frontend/universal/patterns/SKILL.md) | `frontend/universal/patterns` | Select and implement frontend component patterns that solve specific architectural problems with idiomatic framework code. |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`core-algorithms-system-design`](../../skills/system-design/core-algorithms/SKILL.md) | `system-design/core-algorithms` | A handful of algorithms keep appearing inside caches, databases and stream processors: ways to spread keys over changing node sets, and compact… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`design-patterns`](../../skills/backend/universal/design-patterns/SKILL.md) | `backend/universal/design-patterns` | Guide pattern selection across all categories — GoF, enterprise, integration, concurrency, architectural — with decision trees, applicability… |
| [`code-review`](../../skills/dev-loop/code-review/SKILL.md) | `dev-loop/code-review` | Provide systematic, structured code reviews covering correctness, architecture, clarity, performance, security, and tests. |
| [`docker-patterns`](../../skills/devops/docker-patterns/SKILL.md) | `devops/docker-patterns` | Containerize applications following Docker best practices for development and production. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill python --skill typescript --skill dev-loop-git-workflow --skill dev-loop-debugging-strategy --skill security-secrets-management
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill python --skill typescript --skill dev-loop-git-workflow --skill dev-loop-debugging-strategy --skill quality-unit-testing --skill frontend-patterns --skill backend-api-design --skill backend-database-patterns --skill core-algorithms-system-design --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`languages`](../bundles.md#languages) | 14 | Programming language deep dives: TypeScript, Python, Go, Rust, Java, Kotlin, Swift, C#, C, C++, Scala, Elixir, Dart, Assembly |
| [`dev-workflow`](../bundles.md#dev-workflow) | 23 | Developer workflow: code review, debugging, refactoring, git, PRs, changelogs, dev containers, CI, monorepos, dependencies |

## Combine with

- [Frontend Engineer](frontend.md)
- [Backend Engineer](backend.md)

## Watch out

Learn one language well before adding a second; install Level 2 only after you have built a small project.
