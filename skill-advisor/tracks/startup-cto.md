# Startup CTO & Solo Founder

**Who this is for:** You build the first version of a product with a tiny team and little time.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`master-orchestrator`](../../skills/core/master-orchestrator/SKILL.md) | `core/master-orchestrator` | Inspect project state and route to the correct skill. |
| [`project-init`](../../skills/core/project-init/SKILL.md) | `core/project-init` | Scaffold a complete, production-ready project folder structure with AGENTS.md, .gitignore, and docs/ skeleton. |
| [`create-prd`](../../skills/planning/create-prd/SKILL.md) | `planning/create-prd` | Expand a Product Brief into a comprehensive Product Requirements Document with epics, user stories (Gherkin), non-functional requirements, and… |
| [`create-tech-spec`](../../skills/planning/create-tech-spec/SKILL.md) | `planning/create-tech-spec` | Produce a detailed, actionable technical specification that a developer can implement without ambiguity. |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`docker-patterns`](../../skills/devops/docker-patterns/SKILL.md) | `devops/docker-patterns` | Containerize applications following Docker best practices for development and production. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`github-actions`](../../skills/devops/github-actions/SKILL.md) | `devops/github-actions` | Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions. |
| [`supabase`](../../skills/backend/universal/supabase/SKILL.md) | `backend/universal/supabase` | Build production backends on Supabase — PostgreSQL schema design, Row Level Security policies, Auth providers, Realtime subscriptions, Storage… |
| [`firebase`](../../skills/backend/universal/firebase/SKILL.md) | `backend/universal/firebase` | Architect serverless backends on Firebase — Firestore document modeling, Authentication providers, Cloud Functions triggers, Storage security,… |
| [`ecommerce-payment-processing`](../../skills/ecommerce/payment-processing/SKILL.md) | `ecommerce/payment-processing` | Implement payment processing: gateway integration, subscription management, PCI DSS compliance, payment orchestration, fraud detection, and… |
| [`product-analytics`](../../skills/product/analytics/SKILL.md) | `product/analytics` | Turn user behaviour into decisions: pick a small set of metrics tied to value, instrument a consistent event taxonomy that answers them, and… |
| [`product-pricing-strategy`](../../skills/product/pricing-strategy/SKILL.md) | `product/pricing-strategy` | Designs product pricing strategy including value metric identification, model selection, packaging, and willingness-to-pay research. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ai-saas-playbook`](../../skills/playbooks/ai-saas/SKILL.md) | `playbooks/ai-saas` | Reference architecture for a full-stack AI SaaS platform: LLM orchestration (LangChain/LlamaIndex) with guardrails, event-driven processing… |
| [`high-scale-ecommerce`](../../skills/playbooks/high-scale-ecommerce/SKILL.md) | `playbooks/high-scale-ecommerce` | Reference architecture for a high-scale e-commerce platform: edge-rendered programmatic SEO, headless API-first checkout, resilient payment flow,… |
| [`devops-finops`](../../skills/devops/finops/SKILL.md) | `devops/finops` | Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance -- covering compute, storage, Kubernetes, and… |
| [`planning-create-pitch-deck`](../../skills/planning/create-pitch-deck/SKILL.md) | `planning/create-pitch-deck` | Craft compelling investor pitch decks following storytelling best practices. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-prd --skill create-tech-spec --skill backend-api-design --skill docker-patterns --skill security-secrets-management --skill security-api-security
```

**Level 1 + 2 + security baseline (14 skills):**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-prd --skill create-tech-spec --skill backend-api-design --skill docker-patterns --skill github-actions --skill supabase --skill firebase --skill ecommerce-payment-processing --skill product-analytics --skill product-pricing-strategy --skill security-secrets-management --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`starter-playbooks`](../bundles.md#starter-playbooks) | 7 | End-to-end playbooks: AI SaaS, high-scale e-commerce, web3 dApp, with the core planning and orchestration skills |
| [`fullstack-nodejs-react`](../bundles.md#fullstack-nodejs-react) | 223 | Full stack: Node.js backend + React frontend |

## Combine with

- [Full-Stack Product Team](fullstack.md)
- [SaaS Product Builder](saas.md)
- [Product Manager & Planner](product.md)

## Watch out

Supabase and Firebase are alternatives; pick one managed backend.
