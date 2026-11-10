# Legacy Modernization Lead

**Who this is for:** You move monoliths and old platforms to modern architecture without stopping the business.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`threat-modeling`](../../skills/security/threat-modeling/SKILL.md) | `security/threat-modeling` | Identify and mitigate architectural security flaws during the design phase, before any code is written. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-legacy-migration`](../../skills/enterprise/legacy-migration/SKILL.md) | `enterprise/legacy-migration` | Plans and executes legacy system migrations with safe cutover and rollback strategies. |
| [`dev-loop-refactor-guide`](../../skills/dev-loop/refactor-guide/SKILL.md) | `dev-loop/refactor-guide` | Systematically improve code structure, readability, maintainability, and extensibility without changing external behavior — applying proven… |
| [`enterprise-integration-patterns`](../../skills/enterprise/integration-patterns/SKILL.md) | `enterprise/integration-patterns` | Designs enterprise integration systems with message routing, protocol transformation, and error handling. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`cloud-migration`](../../skills/devops/cloud-migration/SKILL.md) | `devops/cloud-migration` | Plan and execute cloud migrations using the 7 Rs strategy framework, with tools, testing, cutover planning, and post-migration optimization. |
| [`microservices`](../../skills/backend/universal/microservices/SKILL.md) | `backend/universal/microservices` | Guide microservices decomposition, communication patterns, data ownership, and migration strategies. |
| [`architecture-domain-driven-design`](../../skills/architecture/system-design/domain-driven-design/SKILL.md) | `architecture/system-design/domain-driven-design` | DDD aligns software structure with the business: a shared language inside explicit boundaries, models that enforce business invariants, and… |
| [`backend-transactional-outbox`](../../skills/backend/universal/transactional-outbox/SKILL.md) | `backend/universal/transactional-outbox` | Guarantee reliable event publication by writing events to an outbox table within the same database transaction as the business operation, then… |
| [`database-migration`](../../skills/devops/database-migration/SKILL.md) | `devops/database-migration` | Plan and execute database migrations including schema changes, cross-engine migration, zero-downtime deployments, and rollback strategies. |
| [`quality-regression-testing`](../../skills/quality/regression-testing/SKILL.md) | `quality/regression-testing` | Ensure that new code changes do not break existing functionality through effective test selection, suite design, automation maintenance, and… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-api-versioning`](../../skills/backend/universal/api-versioning/SKILL.md) | `backend/universal/api-versioning` | Manage API version transitions without breaking existing clients. |
| [`backend-feature-flags`](../../skills/backend/universal/feature-flags/SKILL.md) | `backend/universal/feature-flags` | Design feature flag systems with lifecycle management, targeting, and risk controls. |
| [`enterprise-architecture-governance`](../../skills/enterprise/architecture-governance/SKILL.md) | `enterprise/architecture-governance` | Guides establishment and operation of architecture governance including Architecture Review Board operations, decision rights frameworks,… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill enterprise-legacy-migration --skill dev-loop-refactor-guide --skill enterprise-integration-patterns --skill threat-modeling --skill security-secrets-management
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill enterprise-legacy-migration --skill dev-loop-refactor-guide --skill enterprise-integration-patterns --skill cloud-migration --skill microservices --skill architecture-domain-driven-design --skill backend-transactional-outbox --skill database-migration --skill quality-regression-testing --skill threat-modeling --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`enterprise`](../bundles.md#enterprise) | 18 | Enterprise: governance, compliance, identity, multi-tenancy, legacy migration, ITIL, vendors, FinOps, release engineering |
| [`architecture-system-design`](../bundles.md#architecture-system-design) | 23 | Software and solution architecture: system design, DDD, microservices, event-driven, CQRS/ES, sagas, CRDTs, sharding, consensus, ADRs |

## Combine with

- [Software & Solution Architect](architecture.md)
- [Microservices Engineer](microservices.md)

## Watch out

Strangler-fig migrations need regression tests around the old behavior before the first cut-over.
