# Go Backend Developer

**Who this is for:** You build services and tooling in Go.

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
| [`go`](../../skills/languages/go/SKILL.md) | `languages/go` | Guide for Go build tools, module management, concurrency patterns, interface design, error handling, testing, and production deployment. |
| [`golang-architecture`](../../skills/backend/go/architecture/SKILL.md) | `backend/go/architecture` | Structure Go applications with standard project layout. |
| [`golang-patterns`](../../skills/backend/go/patterns/SKILL.md) | `backend/go/patterns` | Implement Go concurrency, error handling, and HTTP server patterns correctly. |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-grpc-patterns`](../../skills/backend/universal/grpc-patterns/SKILL.md) | `backend/universal/grpc-patterns` | Design consistent, production-grade gRPC services. |
| [`backend-concurrency-mechanics`](../../skills/backend/universal/concurrency/SKILL.md) | `backend/universal/concurrency` | Pick the right concurrency model for a workload and write shared-state code that is correct under the language's memory model. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`backend-structured-logging`](../../skills/backend/universal/structured-logging/SKILL.md) | `backend/universal/structured-logging` | Design structured JSON logging with consistent schema, context propagation, and sampling. |
| [`backend-resilience-patterns`](../../skills/backend/universal/resilience-patterns/SKILL.md) | `backend/universal/resilience-patterns` | Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-kubernetes-operators`](../../skills/devops/kubernetes-operators/SKILL.md) | `devops/kubernetes-operators` | Build Kubernetes operators and custom controllers using Kubebuilder, Operator SDK, or raw controller-runtime to automate application management on… |
| [`network-protocols`](../../skills/low-level/network-protocols/SKILL.md) | `low-level/network-protocols` | Latency spikes, stalled transfers, connection exhaustion and "slow on mobile" problems usually trace back to transport behaviour: handshakes,… |
| [`backend-distributed-locking`](../../skills/backend/universal/distributed-locking/SKILL.md) | `backend/universal/distributed-locking` | Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill go --skill golang-architecture --skill golang-patterns --skill backend-api-design --skill security-api-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill go --skill golang-architecture --skill golang-patterns --skill backend-api-design --skill backend-grpc-patterns --skill backend-concurrency-mechanics --skill backend-database-patterns --skill backend-structured-logging --skill backend-resilience-patterns --skill security-api-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-golang-vue`](../bundles.md#fullstack-golang-vue) | 218 | Full stack: Go backend + Vue frontend |
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |

## Combine with

- [Backend Engineer](backend.md)
- [DevOps & Platform Engineer](devops-platform.md)

## Watch out

Go services often become Kubernetes controllers; add the DevOps & Platform track for that.
