# PHP & Ruby Web Developer

**Who this is for:** You build web apps with Laravel, Symfony or Rails.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`owasp-web-security`](../../skills/cybersecurity/owasp-web-security/SKILL.md) | `cybersecurity/owasp-web-security` | Explain the root-cause mechanics of common OWASP web vulnerability classes (injection, SSRF, XSS) and the secure-coding controls that eliminate them. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`php-laravel`](../../skills/backend/php/laravel/SKILL.md) | `backend/php/laravel` | Build Laravel applications with clean MVC structure, service layer separation, Eloquent ORM best practices, form request validation, queue jobs,… |
| [`ruby-rails`](../../skills/backend/ruby/rails/SKILL.md) | `backend/ruby/rails` | Build Rails applications with clean MVC separation, service objects, ActiveRecord optimization, API mode conventions, Sidekiq background jobs, and… |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`symfony-backend`](../../skills/backend/php/symfony/SKILL.md) | `backend/php/symfony` | Define Symfony backend application architecture: service container, Doctrine ORM, Twig templating, Messenger queue processing, and Flex recipe… |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-auth-patterns`](../../skills/backend/universal/auth-patterns/SKILL.md) | `backend/universal/auth-patterns` | Implement authentication and authorization that is secure by default. |
| [`quality-integration-testing`](../../skills/quality/integration-testing/SKILL.md) | `quality/integration-testing` | Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`php-pure`](../../skills/backend/php/pure/SKILL.md) | `backend/php/pure` | Build PHP applications without a framework — PSR standards-based architecture, routing, middleware, database access, type-safe with PHP 8.x… |
| [`php-zend`](../../skills/backend/php/zend/SKILL.md) | `backend/php/zend` | Build enterprise PHP applications with Laminas (formerly Zend Framework). |
| [`htmx`](../../skills/frontend/htmx/SKILL.md) | `frontend/htmx` | Build hypermedia-driven web applications where the server sends HTML fragments in response to AJAX requests triggered by HTML attributes — no… |
| [`alpinejs`](../../skills/frontend/alpinejs/SKILL.md) | `frontend/alpinejs` | Add interactivity to HTML pages using Alpine.js directives — a lightweight, declarative framework that works directly in the DOM without a build step. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill php-laravel --skill ruby-rails --skill backend-api-design --skill backend-database-patterns --skill security-api-security --skill owasp-web-security
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill php-laravel --skill ruby-rails --skill backend-api-design --skill backend-database-patterns --skill symfony-backend --skill backend-background-jobs --skill backend-caching --skill backend-auth-patterns --skill quality-integration-testing --skill security-api-security --skill owasp-web-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-rails-svelte`](../bundles.md#fullstack-rails-svelte) | 216 | Full stack: Ruby on Rails backend + SvelteKit frontend |
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |

## Combine with

- [Backend Engineer](backend.md)
- [Frontend Engineer](frontend.md)

## Watch out

Laravel and Rails are alternatives; keep the one your project uses.
