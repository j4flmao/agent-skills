# Elixir & Phoenix Developer

**Who this is for:** You build fault-tolerant services and real-time apps on the BEAM.

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
| [`lang-elixir`](../../skills/languages/elixir/SKILL.md) | `languages/elixir` | Guide for Elixir build tools (Mix), OTP supervision trees, Phoenix framework, Ecto database layer, concurrency patterns, testing, and production… |
| [`backend-elixir`](../../skills/backend/elixir/SKILL.md) | `backend/elixir` | Build fault-tolerant, concurrent applications with Elixir/OTP — Phoenix web layer, LiveView interactivity, Ecto persistence, supervision trees,… |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-websocket-patterns`](../../skills/backend/universal/websocket-patterns/SKILL.md) | `backend/universal/websocket-patterns` | Design consistent, production-grade WebSocket services. |
| [`backend-web-real-time`](../../skills/backend/web-real-time/SKILL.md) | `backend/web-real-time` | Build real-time communication systems: WebRTC signaling, media server architecture (SFU/MCU), TURN/STUN infrastructure, live streaming, and… |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-distributed-locking`](../../skills/backend/universal/distributed-locking/SKILL.md) | `backend/universal/distributed-locking` | Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties. |
| [`backend-event-sourcing`](../../skills/backend/universal/event-sourcing/SKILL.md) | `backend/universal/event-sourcing` | Store state changes as an append-only sequence of events. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-elixir --skill backend-elixir --skill backend-api-design --skill security-api-security
```

**Level 1 + 2 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-elixir --skill backend-elixir --skill backend-api-design --skill backend-websocket-patterns --skill backend-web-real-time --skill backend-background-jobs --skill backend-database-patterns --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`backend-stacks`](../bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |

## Combine with

- [Real-Time Apps Developer](realtime.md)
- [Backend Engineer](backend.md)

## Watch out

`languages/elixir` covers the language and OTP; `backend/elixir` covers Phoenix and Ecto. Install both.
