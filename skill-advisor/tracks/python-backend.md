# Python Backend Developer

**Who this is for:** You build services with FastAPI, Django or Flask.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`python`](../../skills/languages/python/SKILL.md) | `languages/python` | Guide for Python build tools, package management, virtual environments, type annotations, async patterns, testing, and production deployment. |
| [`python-fastapi-architecture`](../../skills/backend/python/fastapi/SKILL.md) | `backend/python/fastapi` | Structure FastAPI applications with Clean Architecture. |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`python-django-architecture`](../../skills/backend/python/django/SKILL.md) | `backend/python/django` | Structure Django applications with one app per bounded context, service layer for business logic, thin views, DRF serializers as DTOs, and clean… |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-auth-patterns`](../../skills/backend/universal/auth-patterns/SKILL.md) | `backend/universal/auth-patterns` | Implement authentication and authorization that is secure by default. |
| [`quality-unit-testing`](../../skills/quality/unit-testing/SKILL.md) | `quality/unit-testing` | Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. |
| [`quality-integration-testing`](../../skills/quality/integration-testing/SKILL.md) | `quality/integration-testing` | Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`flask-backend`](../../skills/backend/python/flask/SKILL.md) | `backend/python/flask` | Define Flask backend application architecture: lightweight server setup, blueprint organization, extension integration, and WSGI deployment. |
| [`backend-concurrency-mechanics`](../../skills/backend/universal/concurrency/SKILL.md) | `backend/universal/concurrency` | Pick the right concurrency model for a workload and write shared-state code that is correct under the language's memory model. |
| [`data-vector-databases`](../../skills/data/vector-databases/SKILL.md) | `data/vector-databases` | Store embedding vectors with metadata and return the nearest neighbors of a query vector fast enough for interactive use. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill python --skill python-fastapi-architecture --skill backend-api-design --skill backend-database-patterns --skill security-api-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill python --skill python-fastapi-architecture --skill backend-api-design --skill backend-database-patterns --skill python-django-architecture --skill backend-background-jobs --skill backend-caching --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill security-api-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |

## Combine with

- [Backend Engineer](backend.md)
- [ML & AI Engineer](ml-ai.md)
- [LLM Application Developer](llm-app.md)

## Watch out

Read `.claude/rules/python-uv-standards.md`: the repo standard is uv for environments and dependencies.
