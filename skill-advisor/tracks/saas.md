# SaaS Product Builder

**Who this is for:** You build multi-tenant B2B or B2C SaaS.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (3 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-multi-tenancy`](../../skills/backend/universal/multi-tenancy/SKILL.md) | `backend/universal/multi-tenancy` | Implement tenant isolation in a SaaS application using row-level, schema-per-tenant, or DB-per-tenant strategies with automated provisioning and… |
| [`backend-authorization`](../../skills/backend/universal/authorization/SKILL.md) | `backend/universal/authorization` | Design and implement authorization that is correct, auditable, and maintainable. |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`ecommerce-payment-processing`](../../skills/ecommerce/payment-processing/SKILL.md) | `ecommerce/payment-processing` | Implement payment processing: gateway integration, subscription management, PCI DSS compliance, payment orchestration, fraud detection, and… |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-multi-tenant`](../../skills/enterprise/multi-tenant/SKILL.md) | `enterprise/multi-tenant` | Designs and enforces tenant isolation, lifecycle management, and cross-tenant operational patterns. |
| [`backend-feature-flags`](../../skills/backend/universal/feature-flags/SKILL.md) | `backend/universal/feature-flags` | Design feature flag systems with lifecycle management, targeting, and risk controls. |
| [`product-pricing-strategy`](../../skills/product/pricing-strategy/SKILL.md) | `product/pricing-strategy` | Designs product pricing strategy including value metric identification, model selection, packaging, and willingness-to-pay research. |
| [`product-onboarding-flow`](../../skills/product/onboarding-flow/SKILL.md) | `product/onboarding-flow` | Designs and optimizes user onboarding flows including activation milestones, funnel mapping, progressive disclosure, and experimentation. |
| [`rate-limiting`](../../skills/backend/universal/rate-limiting/SKILL.md) | `backend/universal/rate-limiting` | Protect services and enforce fair use by bounding how many requests (or how much cost) a client can consume per unit of time. |
| [`backend-webhooks`](../../skills/backend/universal/webhooks/SKILL.md) | `backend/universal/webhooks` | Securely receive, verify, retry, and deliver webhooks between services with guaranteed delivery and tamper-proof signatures. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-identity-provider`](../../skills/enterprise/identity-provider/SKILL.md) | `enterprise/identity-provider` | Designs and implements identity provider solutions including SSO, federation, directory sync, and access governance. |
| [`backend-audit-logging`](../../skills/backend/universal/audit-logging/SKILL.md) | `backend/universal/audit-logging` | Record every sensitive data access and state change in an immutable, tamper-evident audit trail for regulatory compliance (SOC 2, SOX, HIPAA, GDPR). |
| [`ai-saas-playbook`](../../skills/playbooks/ai-saas/SKILL.md) | `playbooks/ai-saas` | Reference architecture for a full-stack AI SaaS platform: LLM orchestration (LangChain/LlamaIndex) with guardrails, event-driven processing… |
| [`product-growth-engineering`](../../skills/product/growth-engineering/SKILL.md) | `product/growth-engineering` | Designs and executes growth engineering initiatives including growth loops, activation optimization, viral mechanics, and experimentation pipelines. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-multi-tenancy --skill backend-authorization --skill backend-api-design --skill ecommerce-payment-processing --skill security-api-security --skill security-data-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (13 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-multi-tenancy --skill backend-authorization --skill backend-api-design --skill ecommerce-payment-processing --skill enterprise-multi-tenant --skill backend-feature-flags --skill product-pricing-strategy --skill product-onboarding-flow --skill rate-limiting --skill backend-webhooks --skill security-api-security --skill security-data-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |
| [`access-control`](../bundles.md#access-control) | 7 | Authentication and authorization: auth patterns, RBAC, ABAC, fine-grained policies, identity providers, zero trust identity |
| [`fintech-payments`](../bundles.md#fintech-payments) | 13 | Fintech and payments: ledgers, payment processing, checkout, idempotency, audit trails, data masking, compliance |

## Combine with

- [Full-Stack Product Team](fullstack.md)
- [Product Manager & Planner](product.md)

## Watch out

Tenant isolation is the top risk: check every query and cache key for the tenant id.
