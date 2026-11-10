# E-commerce Engineer

**Who this is for:** You build stores, carts, checkout and order systems.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ecommerce-checkout-cart`](../../skills/ecommerce/checkout-cart/SKILL.md) | `ecommerce/checkout-cart` | Design shopping cart and checkout systems: cart management, order lifecycle, discount/promotion engine, tax calculation, shipping integration, and… |
| [`ecommerce-payment-processing`](../../skills/ecommerce/payment-processing/SKILL.md) | `ecommerce/payment-processing` | Implement payment processing: gateway integration, subscription management, PCI DSS compliance, payment orchestration, fraud detection, and… |
| [`backend-idempotency`](../../skills/backend/universal/idempotency/SKILL.md) | `backend/universal/idempotency` | Guarantee exactly-once execution for mutating operations using idempotency keys, enabling safe retries without duplicate side effects. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`checkout-optimization`](../../skills/ecommerce/checkout-optimization/SKILL.md) | `ecommerce/checkout-optimization` | Increase checkout completion by removing friction (fields, forced accounts, surprise costs), adding express wallets, and keeping the checkout fast… |
| [`headless-ecommerce`](../../skills/ecommerce/headless/SKILL.md) | `ecommerce/headless` | Build a custom storefront on top of a commerce backend (Shopify, commercetools, BigCommerce, Saleor, Medusa) while keeping catalog pages fast and… |
| [`backend-search-patterns`](../../skills/backend/universal/search-patterns/SKILL.md) | `backend/universal/search-patterns` | Design search architecture with indexing strategy, query design, and relevance tuning. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-transactional-outbox`](../../skills/backend/universal/transactional-outbox/SKILL.md) | `backend/universal/transactional-outbox` | Guarantee reliable event publication by writing events to an outbox table within the same database transaction as the business operation, then… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`high-scale-ecommerce`](../../skills/playbooks/high-scale-ecommerce/SKILL.md) | `playbooks/high-scale-ecommerce` | Reference architecture for a high-scale e-commerce platform: edge-rendered programmatic SEO, headless API-first checkout, resilient payment flow,… |
| [`stripe-payments`](../../skills/ecommerce/payments/SKILL.md) | `ecommerce/payments` | Implement Stripe Billing subscriptions whose local state stays correct under retries, duplicate deliveries and out-of-order webhooks. |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`web-performance`](../../skills/web/performance/SKILL.md) | `web/performance` | Core Web Vitals are Google's user-centric metrics, evaluated at the 75th percentile of real-user (field) page loads: LCP (loading), INP… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill ecommerce-checkout-cart --skill ecommerce-payment-processing --skill backend-idempotency --skill security-api-security --skill security-data-security
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill ecommerce-checkout-cart --skill ecommerce-payment-processing --skill backend-idempotency --skill checkout-optimization --skill headless-ecommerce --skill backend-search-patterns --skill backend-caching --skill backend-transactional-outbox --skill security-api-security --skill security-data-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ecommerce-all`](../bundles.md#ecommerce-all) | 13 | E-commerce: payment processing, checkout and cart, order management |
| [`fintech-payments`](../bundles.md#fintech-payments) | 13 | Fintech and payments: ledgers, payment processing, checkout, idempotency, audit trails, data masking, compliance |

## Combine with

- [SaaS Product Builder](saas.md)
- [Performance Engineer](performance.md)

## Watch out

`ecommerce/payment-processing` and `ecommerce/payments` overlap; start with `payment-processing`.
