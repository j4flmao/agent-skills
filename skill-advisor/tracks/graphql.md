# GraphQL API Engineer

**Who this is for:** You design, federate and optimize GraphQL APIs.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-graphql-patterns`](../../skills/backend/universal/graphql-patterns/SKILL.md) | `backend/universal/graphql-patterns` | Design production GraphQL schemas with resolvers, DataLoader batching, and auth. |
| [`backend-graphql-optimization`](../../skills/backend/graphql-optimization/SKILL.md) | `backend/graphql-optimization` | GraphQL resolvers run per field, so a naive implementation issues one database query per parent object (N+1) and lets clients send arbitrarily… |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`api-graphql-federation`](../../skills/backend/universal/api/graphql-federation/SKILL.md) | `backend/universal/api/graphql-federation` | Compose multiple team-owned GraphQL services (subgraphs) into one supergraph served by a router, so each team ships its part of the graph… |
| [`frontend-data-fetching`](../../skills/frontend/universal/data-fetching/SKILL.md) | `frontend/universal/data-fetching` | Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic… |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-authorization`](../../skills/backend/universal/authorization/SKILL.md) | `backend/universal/authorization` | Design and implement authorization that is correct, auditable, and maintainable. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`api-product-management`](../../skills/backend/universal/api/product-management/SKILL.md) | `backend/universal/api/product-management` | Manage APIs as products: define API product strategy, design developer experience, manage API lifecycle, implement API monetization, build… |
| [`rate-limiting`](../../skills/backend/universal/rate-limiting/SKILL.md) | `backend/universal/rate-limiting` | Protect services and enforce fair use by bounding how many requests (or how much cost) a client can consume per unit of time. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-graphql-patterns --skill backend-graphql-optimization --skill backend-api-design --skill security-api-security
```

**Level 1 + 2 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-graphql-patterns --skill backend-graphql-optimization --skill backend-api-design --skill api-graphql-federation --skill frontend-data-fetching --skill backend-caching --skill backend-authorization --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`api-all`](../bundles.md#api-all) | 9 | API ecosystem: GraphQL Federation, API product management, API design, API gateway |
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |

## Combine with

- [Backend Engineer](backend.md)
- [React & Next.js Developer](react.md)

## Watch out

Add query depth and cost limits before exposing a public GraphQL endpoint.
