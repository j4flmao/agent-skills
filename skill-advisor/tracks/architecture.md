# Software & Solution Architect

**Who this is for:** You design systems, write ADRs and govern architecture.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`threat-modeling`](../../skills/security/threat-modeling/SKILL.md) | `security/threat-modeling` | Identify and mitigate architectural security flaws during the design phase, before any code is written. |
| [`zero-trust-identity`](../../skills/cybersecurity/zero-trust-identity/SKILL.md) | `cybersecurity/zero-trust-identity` | Explain Zero Trust identity mechanics — OIDC/OAuth2 flows (Authorization Code + PKCE), JWT signature validation (RS256 vs HS256 and… |

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`create-tech-spec`](../../skills/planning/create-tech-spec/SKILL.md) | `planning/create-tech-spec` | Produce a detailed, actionable technical specification that a developer can implement without ambiguity. |
| [`system-design-database-sharding`](../../skills/system-design/database-sharding/SKILL.md) | `system-design/database-sharding` | Sharding splits one logical dataset across independent database servers so writes and storage scale horizontally. |
| [`distributed-consensus`](../../skills/system-design/distributed-consensus/SKILL.md) | `system-design/distributed-consensus` | Consensus lets a group of machines agree on a sequence of values (a replicated log) despite crashes and network partitions, which is how etcd,… |
| [`microservices`](../../skills/backend/universal/microservices/SKILL.md) | `backend/universal/microservices` | Guide microservices decomposition, communication patterns, data ownership, and migration strategies. |
| [`backend-event-driven`](../../skills/backend/universal/event-driven/SKILL.md) | `backend/universal/event-driven` | Design event-driven systems with clear event boundaries, reliable delivery, observable flows, and error recovery. |
| [`architecture-domain-driven-design`](../../skills/architecture/system-design/domain-driven-design/SKILL.md) | `architecture/system-design/domain-driven-design` | DDD aligns software structure with the business: a shared language inside explicit boundaries, models that enforce business invariants, and… |

## Level 2 — Professional (10 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`architecture-microservices-patterns`](../../skills/architecture/system-design/microservices-patterns/SKILL.md) | `architecture/system-design/microservices-patterns` | Microservices buy independent deployment and scaling per business capability at the cost of distributed-systems complexity: partial failure,… |
| [`architecture-event-driven`](../../skills/architecture/event-driven/SKILL.md) | `architecture/event-driven` | In EDA, services publish facts ("OrderPlaced") and other services react, so producers do not depend on consumers being available or even known. |
| [`architecture-crdts`](../../skills/architecture/crdts/SKILL.md) | `architecture/crdts` | CRDTs let replicas accept writes independently (offline, peer-to-peer, multi-region) and still converge to the same state once they have seen the… |
| [`architecture-postgresql-internals`](../../skills/architecture/databases/postgresql-internals/SKILL.md) | `architecture/databases/postgresql-internals` | Most PostgreSQL production issues (bloat, sudden slowdowns, replication lag, wraparound emergencies, bad plans) are direct consequences of how… |
| [`architecture-database-scaling`](../../skills/architecture/databases/scaling-and-sharding/SKILL.md) | `architecture/databases/scaling-and-sharding` | Sharding is the most expensive scaling step: it complicates queries, transactions, schema changes, and operations forever. |
| [`backend-cqrs-patterns`](../../skills/backend/universal/cqrs-patterns/SKILL.md) | `backend/universal/cqrs-patterns` | Separate read and write models so each can be optimized independently — write side for consistency and validation, read side for query performance… |
| [`backend-event-sourcing`](../../skills/backend/universal/event-sourcing/SKILL.md) | `backend/universal/event-sourcing` | Store state changes as an append-only sequence of events. |
| [`backend-resilience-patterns`](../../skills/backend/universal/resilience-patterns/SKILL.md) | `backend/universal/resilience-patterns` | Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks. |
| [`cloud-architecture`](../../skills/devops/cloud-architecture/SKILL.md) | `devops/cloud-architecture` | Design cloud architectures following the Well-Architected Framework, landing zone patterns, multi-cloud strategies, and resilience patterns for… |
| [`enterprise-integration-patterns`](../../skills/enterprise/integration-patterns/SKILL.md) | `enterprise/integration-patterns` | Designs enterprise integration systems with message routing, protocol transformation, and error handling. |

## Level 3 — Specialist (6 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-architecture-governance`](../../skills/enterprise/architecture-governance/SKILL.md) | `enterprise/architecture-governance` | Guides establishment and operation of architecture governance including Architecture Review Board operations, decision rights frameworks,… |
| [`enterprise-togaf-zachman`](../../skills/enterprise/togaf-zachman/SKILL.md) | `enterprise/togaf-zachman` | Guides enterprise architecture practice using TOGAF Architecture Development Method (ADM) and Zachman Framework for holistic architecture… |
| [`enterprise-legacy-migration`](../../skills/enterprise/legacy-migration/SKILL.md) | `enterprise/legacy-migration` | Plans and executes legacy system migrations with safe cutover and rollback strategies. |
| [`enterprise-multi-tenant`](../../skills/enterprise/multi-tenant/SKILL.md) | `enterprise/multi-tenant` | Designs and enforces tenant isolation, lifecycle management, and cross-tenant operational patterns. |
| [`architecture-micro-frontends`](../../skills/architecture/micro-frontends/SKILL.md) | `architecture/micro-frontends` | Micro-frontends let independent teams build, test, and deploy parts of one web UI separately. |
| [`system-architect`](../../skills/personas/system-architect/SKILL.md) | `personas/system-architect` | Adopt the mindset of a Staff System Architect: assume failure, make explicit CAP trade-offs, favor event-driven/async decoupling, engineer HA with… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill create-tech-spec --skill system-design-database-sharding --skill distributed-consensus --skill microservices --skill backend-event-driven --skill architecture-domain-driven-design --skill threat-modeling --skill zero-trust-identity
```

**Level 1 + 2 + security baseline (18 skills):**

```bash
npx skills add j4flmao/agent-skills --skill create-tech-spec --skill system-design-database-sharding --skill distributed-consensus --skill microservices --skill backend-event-driven --skill architecture-domain-driven-design --skill architecture-microservices-patterns --skill architecture-event-driven --skill architecture-crdts --skill architecture-postgresql-internals --skill architecture-database-scaling --skill backend-cqrs-patterns --skill backend-event-sourcing --skill backend-resilience-patterns --skill cloud-architecture --skill enterprise-integration-patterns --skill threat-modeling --skill zero-trust-identity
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`architecture-system-design`](../bundles.md#architecture-system-design) | 23 | Software and solution architecture: system design, DDD, microservices, event-driven, CQRS/ES, sagas, CRDTs, sharding, consensus, ADRs |
| [`enterprise`](../bundles.md#enterprise) | 18 | Enterprise: governance, compliance, identity, multi-tenancy, legacy migration, ITIL, vendors, FinOps, release engineering |
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |

## Combine with

- [Backend Engineer](backend.md)
- [DevOps & Platform Engineer](devops-platform.md)

## Watch out

Pair with `.claude/rules/solution-architecture.md` for the pattern catalog and ADR template.
