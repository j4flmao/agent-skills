# Online Game Backend Engineer

**Who this is for:** You run game servers, matchmaking and live-ops backends.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`anti-cheat-server`](../../skills/game/game-server/anti-cheat-server/SKILL.md) | `game/game-server/anti-cheat-server` | The server is the only place that can prove cheating. |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`authoritative-server`](../../skills/game/game-server/authoritative-server/SKILL.md) | `game/game-server/authoritative-server` | The server is the single source of truth. |
| [`multiplayer-netcode`](../../skills/game/multiplayer-netcode/SKILL.md) | `game/multiplayer-netcode` | Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. |
| [`matchmaking-lobby`](../../skills/game/game-server/matchmaking-lobby/SKILL.md) | `game/game-server/matchmaking-lobby` | Matchmaking turns "players waiting" into "a fair game started fast." The lobby keeps a group of players synced until the match host is assigned. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`interest-management`](../../skills/game/game-server/interest-management/SKILL.md) | `game/game-server/interest-management` | Nobody needs everything. |
| [`scaling-architecture`](../../skills/game/game-server/scaling-architecture/SKILL.md) | `game/game-server/scaling-architecture` | From "hundreds playing" to "a million in a weekend": how the server fleet grows without breaking determinism, latency or cost. |
| [`game-engine-multiplayer-netcode`](../../skills/game/game-engine/multiplayer-netcode/SKILL.md) | `game/game-engine/multiplayer-netcode` | Building netcode that is fast, fair, and stable requires decisions at the transport, protocol, simulation, and presentation layers. |
| [`backend-websocket-patterns`](../../skills/backend/universal/websocket-patterns/SKILL.md) | `backend/universal/websocket-patterns` | Design consistent, production-grade WebSocket services. |
| [`devops-kubernetes-autoscaling`](../../skills/devops/kubernetes-autoscaling/SKILL.md) | `devops/kubernetes-autoscaling` | Design, implement, and optimize Kubernetes autoscaling strategies using HPA, VPA, Keda, and Cluster Autoscaler to achieve cost-efficient,… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`rate-limiting`](../../skills/backend/universal/rate-limiting/SKILL.md) | `backend/universal/rate-limiting` | Protect services and enforce fair use by bounding how many requests (or how much cost) a client can consume per unit of time. |
| [`observability`](../../skills/devops/observability/SKILL.md) | `devops/observability` | Set up structured logging, metrics, and distributed tracing to understand system behavior in production. |
| [`data-streaming`](../../skills/data/streaming/SKILL.md) | `data/streaming` | Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill authoritative-server --skill multiplayer-netcode --skill matchmaking-lobby --skill anti-cheat-server --skill security-api-security
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill authoritative-server --skill multiplayer-netcode --skill matchmaking-lobby --skill interest-management --skill scaling-architecture --skill game-engine-multiplayer-netcode --skill backend-websocket-patterns --skill devops-kubernetes-autoscaling --skill anti-cheat-server --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`game-server`](../bundles.md#game-server) | 9 | Online game backends: authoritative servers, netcode, interest management, matchmaking, anti-cheat, scaling |
| [`game-development`](../bundles.md#game-development) | 32 | Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers |

## Combine with

- [Game Developer](game.md)
- [Site Reliability Engineer](sre.md)
- [Real-Time Apps Developer](realtime.md)

## Watch out

`game/multiplayer-netcode` and `game/game-engine/multiplayer-netcode` overlap; start with the first.
