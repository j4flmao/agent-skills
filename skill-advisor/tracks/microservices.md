# Microservices Engineer

**Who this is for:** You split systems into services and keep them reliable in production.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`zero-trust-identity`](../../skills/cybersecurity/zero-trust-identity/SKILL.md) | `cybersecurity/zero-trust-identity` | Explain Zero Trust identity mechanics — OIDC/OAuth2 flows (Authorization Code + PKCE), JWT signature validation (RS256 vs HS256 and… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`microservices`](../../skills/backend/universal/microservices/SKILL.md) | `backend/universal/microservices` | Guide microservices decomposition, communication patterns, data ownership, and migration strategies. |
| [`microservice-design-patterns`](../../skills/backend/universal/design-patterns/microservices/SKILL.md) | `backend/universal/design-patterns/microservices` | With a database per service, one business operation spans several local transactions. |
| [`backend-event-driven`](../../skills/backend/universal/event-driven/SKILL.md) | `backend/universal/event-driven` | Design event-driven systems with clear event boundaries, reliable delivery, observable flows, and error recovery. |
| [`backend-resilience-patterns`](../../skills/backend/universal/resilience-patterns/SKILL.md) | `backend/universal/resilience-patterns` | Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-transactional-outbox`](../../skills/backend/universal/transactional-outbox/SKILL.md) | `backend/universal/transactional-outbox` | Guarantee reliable event publication by writing events to an outbox table within the same database transaction as the business operation, then… |
| [`backend-idempotency`](../../skills/backend/universal/idempotency/SKILL.md) | `backend/universal/idempotency` | Guarantee exactly-once execution for mutating operations using idempotency keys, enabling safe retries without duplicate side effects. |
| [`backend-message-queue`](../../skills/backend/universal/message-queue/SKILL.md) | `backend/universal/message-queue` | Design consistent, production-grade message-driven systems. |
| [`devops-service-mesh`](../../skills/devops/service-mesh/SKILL.md) | `devops/service-mesh` | Install, configure, and operate a service mesh (Istio or Linkerd) for traffic management, mTLS security, observability, and resilience patterns in… |
| [`cloud-native-distributed-tracing`](../../skills/cloud-native/distributed-tracing/SKILL.md) | `cloud-native/distributed-tracing` | Make every request traceable across services, queues, and async jobs without unbounded cost. |
| [`backend-api-versioning`](../../skills/backend/universal/api-versioning/SKILL.md) | `backend/universal/api-versioning` | Manage API version transitions without breaking existing clients. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-cqrs-patterns`](../../skills/backend/universal/cqrs-patterns/SKILL.md) | `backend/universal/cqrs-patterns` | Separate read and write models so each can be optimized independently — write side for consistency and validation, read side for query performance… |
| [`backend-event-sourcing`](../../skills/backend/universal/event-sourcing/SKILL.md) | `backend/universal/event-sourcing` | Store state changes as an append-only sequence of events. |
| [`backend-distributed-locking`](../../skills/backend/universal/distributed-locking/SKILL.md) | `backend/universal/distributed-locking` | Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties. |
| [`backend-contract-testing`](../../skills/backend/universal/contract-testing/SKILL.md) | `backend/universal/contract-testing` | Use consumer-driven contract (CDC) testing with Pact to verify that provider services satisfy consumer expectations, replacing brittle end-to-end… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill microservices --skill microservice-design-patterns --skill backend-event-driven --skill backend-resilience-patterns --skill security-api-security --skill zero-trust-identity
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill microservices --skill microservice-design-patterns --skill backend-event-driven --skill backend-resilience-patterns --skill backend-transactional-outbox --skill backend-idempotency --skill backend-message-queue --skill devops-service-mesh --skill cloud-native-distributed-tracing --skill backend-api-versioning --skill security-api-security --skill zero-trust-identity
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |
| [`architecture-system-design`](../bundles.md#architecture-system-design) | 23 | Software and solution architecture: system design, DDD, microservices, event-driven, CQRS/ES, sagas, CRDTs, sharding, consensus, ADRs |

## Combine with

- [Software & Solution Architect](architecture.md)
- [Observability Engineer](observability.md)

## Watch out

Start with a modular monolith if the domain boundaries are not clear yet; `backend/universal/microservices` explains when to split.
