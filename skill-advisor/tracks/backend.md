# Backend Engineer

**Who this is for:** You build APIs and services in any language.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (3 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |
| [`owasp-web-security`](../../skills/cybersecurity/owasp-web-security/SKILL.md) | `cybersecurity/owasp-web-security` | Explain the root-cause mechanics of common OWASP web vulnerability classes (injection, SSRF, XSS) and the secure-coding controls that eliminate them. |

## Level 1 — Essentials (8 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-api-response`](../../skills/backend/universal/api-response/SKILL.md) | `backend/universal/api-response` | Define and enforce a universal API response contract with standardized envelopes, error codes, and pagination. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`backend-auth-patterns`](../../skills/backend/universal/auth-patterns/SKILL.md) | `backend/universal/auth-patterns` | Implement authentication and authorization that is secure by default. |
| [`backend-structured-logging`](../../skills/backend/universal/structured-logging/SKILL.md) | `backend/universal/structured-logging` | Design structured JSON logging with consistent schema, context propagation, and sampling. |
| [`backend-clean-architecture`](../../skills/backend/universal/clean-architecture/SKILL.md) | `backend/universal/clean-architecture` | Enforce strict layer separation in backend code. |
| [`quality-unit-testing`](../../skills/quality/unit-testing/SKILL.md) | `quality/unit-testing` | Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. |
| [`quality-integration-testing`](../../skills/quality/integration-testing/SKILL.md) | `quality/integration-testing` | Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and… |

## Level 2 — Professional (12 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`backend-message-queue`](../../skills/backend/universal/message-queue/SKILL.md) | `backend/universal/message-queue` | Design consistent, production-grade message-driven systems. |
| [`backend-idempotency`](../../skills/backend/universal/idempotency/SKILL.md) | `backend/universal/idempotency` | Guarantee exactly-once execution for mutating operations using idempotency keys, enabling safe retries without duplicate side effects. |
| [`rate-limiting`](../../skills/backend/universal/rate-limiting/SKILL.md) | `backend/universal/rate-limiting` | Protect services and enforce fair use by bounding how many requests (or how much cost) a client can consume per unit of time. |
| [`backend-resilience-patterns`](../../skills/backend/universal/resilience-patterns/SKILL.md) | `backend/universal/resilience-patterns` | Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks. |
| [`backend-authorization`](../../skills/backend/universal/authorization/SKILL.md) | `backend/universal/authorization` | Design and implement authorization that is correct, auditable, and maintainable. |
| [`backend-api-versioning`](../../skills/backend/universal/api-versioning/SKILL.md) | `backend/universal/api-versioning` | Manage API version transitions without breaking existing clients. |
| [`backend-openapi-documentation`](../../skills/backend/universal/openapi-documentation/SKILL.md) | `backend/universal/openapi-documentation` | Drive all API development with an OpenAPI 3.x spec-first workflow: spec defines the contract, code is generated from it, and the spec is versioned… |
| [`backend-file-storage`](../../skills/backend/universal/file-storage/SKILL.md) | `backend/universal/file-storage` | Design secure file storage architecture with upload flows, CDN delivery, and processing. |
| [`backend-webhooks`](../../skills/backend/universal/webhooks/SKILL.md) | `backend/universal/webhooks` | Securely receive, verify, retry, and deliver webhooks between services with guaranteed delivery and tamper-proof signatures. |
| [`backend-multi-tenancy`](../../skills/backend/universal/multi-tenancy/SKILL.md) | `backend/universal/multi-tenancy` | Implement tenant isolation in a SaaS application using row-level, schema-per-tenant, or DB-per-tenant strategies with automated provisioning and… |

## Level 3 — Specialist (10 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`microservices`](../../skills/backend/universal/microservices/SKILL.md) | `backend/universal/microservices` | Guide microservices decomposition, communication patterns, data ownership, and migration strategies. |
| [`backend-event-driven`](../../skills/backend/universal/event-driven/SKILL.md) | `backend/universal/event-driven` | Design event-driven systems with clear event boundaries, reliable delivery, observable flows, and error recovery. |
| [`backend-cqrs-patterns`](../../skills/backend/universal/cqrs-patterns/SKILL.md) | `backend/universal/cqrs-patterns` | Separate read and write models so each can be optimized independently — write side for consistency and validation, read side for query performance… |
| [`backend-event-sourcing`](../../skills/backend/universal/event-sourcing/SKILL.md) | `backend/universal/event-sourcing` | Store state changes as an append-only sequence of events. |
| [`backend-transactional-outbox`](../../skills/backend/universal/transactional-outbox/SKILL.md) | `backend/universal/transactional-outbox` | Guarantee reliable event publication by writing events to an outbox table within the same database transaction as the business operation, then… |
| [`backend-distributed-locking`](../../skills/backend/universal/distributed-locking/SKILL.md) | `backend/universal/distributed-locking` | Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties. |
| [`backend-grpc-patterns`](../../skills/backend/universal/grpc-patterns/SKILL.md) | `backend/universal/grpc-patterns` | Design consistent, production-grade gRPC services. |
| [`backend-graphql-patterns`](../../skills/backend/universal/graphql-patterns/SKILL.md) | `backend/universal/graphql-patterns` | Design production GraphQL schemas with resolvers, DataLoader batching, and auth. |
| [`api-graphql-federation`](../../skills/backend/universal/api/graphql-federation/SKILL.md) | `backend/universal/api/graphql-federation` | Compose multiple team-owned GraphQL services (subgraphs) into one supergraph served by a router, so each team ships its part of the graph… |
| [`backend-concurrency-mechanics`](../../skills/backend/universal/concurrency/SKILL.md) | `backend/universal/concurrency` | Pick the right concurrency model for a workload and write shared-state code that is correct under the language's memory model. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill backend-structured-logging --skill backend-clean-architecture --skill quality-unit-testing --skill quality-integration-testing --skill security-api-security --skill security-secrets-management --skill owasp-web-security
```

**Level 1 + 2 + security baseline (23 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill backend-structured-logging --skill backend-clean-architecture --skill quality-unit-testing --skill quality-integration-testing --skill backend-caching --skill backend-background-jobs --skill backend-message-queue --skill backend-idempotency --skill rate-limiting --skill backend-resilience-patterns --skill backend-authorization --skill backend-api-versioning --skill backend-openapi-documentation --skill backend-file-storage --skill backend-webhooks --skill backend-multi-tenancy --skill security-api-security --skill security-secrets-management --skill owasp-web-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |
| [`backend-capabilities`](../bundles.md#backend-capabilities) | 10 | Backend product capabilities: caching, event-driven, GraphQL, bulk import, email, SMS, reports, real-time |
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |
| [`access-control`](../bundles.md#access-control) | 7 | Authentication and authorization: auth patterns, RBAC, ABAC, fine-grained policies, identity providers, zero trust identity |
| [`backend-only`](../bundles.md#backend-only) | 184 | Backend-only: OOP, design patterns, microservices, clean architecture, API, DB, auth, testing, all stacks |

## Combine with

- [DevOps & Platform Engineer](devops-platform.md)
- [Data Engineer](data-engineering.md)
- [Software & Solution Architect](architecture.md)

## Watch out

Add one stack folder only (for example `backend/nestjs/*` or `backend/go/*`). `backend-stacks` holds every framework and is meant for polyglot teams.
