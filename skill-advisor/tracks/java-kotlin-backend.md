# Java & Kotlin Backend Developer

**Who this is for:** You build JVM services with Spring Boot, Quarkus, Micronaut or Ktor.

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
| [`java`](../../skills/languages/java/SKILL.md) | `languages/java` | Guide for Java build tools (Maven/Gradle), module system, modern language features (records, sealed classes, pattern matching), streams,… |
| [`spring-boot-architecture`](../../skills/backend/spring-boot/architecture/SKILL.md) | `backend/spring-boot/architecture` | Structure Spring Boot applications with package-by-feature and hexagonal architecture. |
| [`spring-boot-patterns`](../../skills/backend/spring-boot/patterns/SKILL.md) | `backend/spring-boot/patterns` | Implement production-grade Spring Boot patterns — dependency injection, aspect-oriented programming, data access, security, transaction… |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`lang-kotlin`](../../skills/languages/kotlin/SKILL.md) | `languages/kotlin` | Kotlin removes most null-pointer bugs at compile time and makes asynchronous code sequential-looking with coroutines. |
| [`kotlin-architecture`](../../skills/backend/kotlin/architecture/SKILL.md) | `backend/kotlin/architecture` | Define and enforce Kotlin backend architecture, framework selection, coroutine pipeline conventions, and project structure. |
| [`kotlin-backend-patterns`](../../skills/backend/kotlin/patterns/SKILL.md) | `backend/kotlin/patterns` | Standardize common Kotlin backend implementation patterns: repository, service, DTO mapping, dependency injection, and testing. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`backend-message-queue`](../../skills/backend/universal/message-queue/SKILL.md) | `backend/universal/message-queue` | Design consistent, production-grade message-driven systems. |
| [`backend-resilience-patterns`](../../skills/backend/universal/resilience-patterns/SKILL.md) | `backend/universal/resilience-patterns` | Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quarkus-backend`](../../skills/backend/java/quarkus/SKILL.md) | `backend/java/quarkus` | Define Quarkus backend application architecture: supersonic startup, live reload, native executables, reactive messaging, and extension ecosystem. |
| [`micronaut`](../../skills/backend/java/micronaut/SKILL.md) | `backend/java/micronaut` | Build Micronaut applications with compile-time dependency injection, reactive HTTP servers, AOT compilation, GraalVM native image support, and… |
| [`scala-play`](../../skills/backend/scala/play/SKILL.md) | `backend/scala/play` | Build Play Framework applications with clean MVC architecture, Slick database access, Play JSON serialization, async actions, and comprehensive… |
| [`lang-scala`](../../skills/languages/scala/SKILL.md) | `languages/scala` | Scala blends object-oriented and functional programming on the JVM with an expressive type system. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill java --skill spring-boot-architecture --skill spring-boot-patterns --skill backend-api-design --skill security-api-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill java --skill spring-boot-architecture --skill spring-boot-patterns --skill backend-api-design --skill lang-kotlin --skill kotlin-architecture --skill kotlin-backend-patterns --skill backend-database-patterns --skill backend-message-queue --skill backend-resilience-patterns --skill security-api-security --skill security-secrets-management
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
- [Software & Solution Architect](architecture.md)

## Watch out

Spring Boot and Quarkus/Micronaut solve the same problem; install the one you run.
