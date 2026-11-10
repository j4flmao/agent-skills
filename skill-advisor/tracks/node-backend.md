# Node.js & TypeScript Backend

**Who this is for:** You build APIs with Node.js, NestJS, Express, Fastify or Hono.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`nodejs-architecture`](../../skills/backend/nodejs/architecture/SKILL.md) | `backend/nodejs/architecture` | Define and enforce Node.js backend architecture, framework selection, and middleware pipeline conventions. |
| [`nodejs-patterns`](../../skills/backend/nodejs/patterns/SKILL.md) | `backend/nodejs/patterns` | Implement production-grade Node.js patterns — streams with backpressure, typed event emitters, worker threads for CPU-bound work, DI containers,… |
| [`typescript`](../../skills/languages/typescript/SKILL.md) | `languages/typescript` | Guide for TypeScript build tools, tsconfig configuration, module resolution, advanced type system (generics, conditional types, template… |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |

## Level 2 — Professional (7 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`nestjs-architecture`](../../skills/backend/nestjs/architecture/SKILL.md) | `backend/nestjs/architecture` | Structure NestJS applications with module-based architecture — domain modules, shared modules, dynamic modules, monorepo projects, and provider… |
| [`nestjs-patterns`](../../skills/backend/nestjs/patterns/SKILL.md) | `backend/nestjs/patterns` | Implement NestJS-specific patterns — CQRS, guards/interceptors, event sourcing, custom decorators, microservices transport, and advanced provider… |
| [`nodejs-prisma`](../../skills/backend/nodejs/prisma/SKILL.md) | `backend/nodejs/prisma` | Design database schemas, write performant queries, manage migrations, implement middleware, and optimize Prisma Client for production. |
| [`nodejs-drizzle`](../../skills/backend/nodejs/drizzle/SKILL.md) | `backend/nodejs/drizzle` | Design database schemas, write SQL-like queries, manage migrations, define relations, and optimize Drizzle ORM for production and edge deployment. |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-structured-logging`](../../skills/backend/universal/structured-logging/SKILL.md) | `backend/universal/structured-logging` | Design structured JSON logging with consistent schema, context propagation, and sampling. |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`nodejs-express-skill`](../../skills/backend/nodejs/express/SKILL.md) | `backend/nodejs/express` | Structure Express.js applications with clean middleware pipeline, error handling, route separation, and validation. |
| [`nodejs-fastify`](../../skills/backend/nodejs/fastify/SKILL.md) | `backend/nodejs/fastify` | Build Fastify applications with schema-first validation, plugin encapsulation, request/response serialization, and lifecycle hooks. |
| [`nodejs-hono`](../../skills/backend/nodejs/hono/SKILL.md) | `backend/nodejs/hono` | Build Hono applications — lightweight, edge-ready web framework with Zod validation, RPC client, and cross-runtime (Node, Bun, Deno, Cloudflare… |
| [`bun`](../../skills/backend/bun/SKILL.md) | `backend/bun` | Build TypeScript/JavaScript services and tooling on Bun, using its built-in server, SQLite driver, file APIs, shell, test runner and bundler where… |
| [`deno`](../../skills/backend/deno/SKILL.md) | `backend/deno` | Build TypeScript services on Deno 2 with least-privilege permissions, JSR-first dependencies, built-in tooling (fmt, lint, test, check, compile)… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill nodejs-architecture --skill nodejs-patterns --skill typescript --skill backend-api-design --skill backend-database-patterns --skill security-api-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (14 skills):**

```bash
npx skills add j4flmao/agent-skills --skill nodejs-architecture --skill nodejs-patterns --skill typescript --skill backend-api-design --skill backend-database-patterns --skill nestjs-architecture --skill nestjs-patterns --skill nodejs-prisma --skill nodejs-drizzle --skill backend-background-jobs --skill backend-caching --skill backend-structured-logging --skill security-api-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-nodejs-react`](../bundles.md#fullstack-nodejs-react) | 223 | Full stack: Node.js backend + React frontend |
| [`fullstack-nestjs-react`](../bundles.md#fullstack-nestjs-react) | 225 | Full stack: NestJS backend + React frontend |
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |

## Combine with

- [Backend Engineer](backend.md)
- [React & Next.js Developer](react.md)

## Watch out

Pick one framework (NestJS, Express, Fastify or Hono) and one ORM (Prisma or Drizzle).
