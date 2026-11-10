# Real-Time Apps Developer

**Who this is for:** You build chat, collaboration, live dashboards or streaming features.

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
| [`backend-websocket-patterns`](../../skills/backend/universal/websocket-patterns/SKILL.md) | `backend/universal/websocket-patterns` | Design consistent, production-grade WebSocket services. |
| [`backend-web-real-time`](../../skills/backend/web-real-time/SKILL.md) | `backend/web-real-time` | Build real-time communication systems: WebRTC signaling, media server architecture (SFU/MCU), TURN/STUN infrastructure, live streaming, and… |
| [`backend-message-queue`](../../skills/backend/universal/message-queue/SKILL.md) | `backend/universal/message-queue` | Design consistent, production-grade message-driven systems. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-data-streaming`](../../skills/backend/universal/data-streaming/SKILL.md) | `backend/universal/data-streaming` | Build pipelines that process continuous event streams with predictable latency and correct results under failures, late data and redelivery. |
| [`data-streaming`](../../skills/data/streaming/SKILL.md) | `data/streaming` | Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees. |
| [`architecture-crdts`](../../skills/architecture/crdts/SKILL.md) | `architecture/crdts` | CRDTs let replicas accept writes independently (offline, peer-to-peer, multi-region) and still converge to the same state once they have seen the… |
| [`mobile-push-notifications`](../../skills/mobile/universal/push-notifications/SKILL.md) | `mobile/universal/push-notifications` | Implement push notifications with correct permission flow, token management, payload design, and foreground/background handling across all mobile… |
| [`backend-sms-messaging`](../../skills/backend/sms-messaging/SKILL.md) | `backend/sms-messaging` | Build reliable, compliant SMS and messaging systems supporting transactional messages, 2FA delivery, WhatsApp integration, and comprehensive… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-kafka-event-streaming`](../../skills/data/data-engineering/kafka-event-streaming/SKILL.md) | `data/data-engineering/kafka-event-streaming` | Kafka is a distributed, partitioned, replicated append-only log. |
| [`backend-distributed-locking`](../../skills/backend/universal/distributed-locking/SKILL.md) | `backend/universal/distributed-locking` | Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties. |
| [`multiplayer-netcode`](../../skills/game/multiplayer-netcode/SKILL.md) | `game/multiplayer-netcode` | Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-websocket-patterns --skill backend-web-real-time --skill backend-message-queue --skill security-api-security
```

**Level 1 + 2 + security baseline (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-websocket-patterns --skill backend-web-real-time --skill backend-message-queue --skill backend-data-streaming --skill data-streaming --skill architecture-crdts --skill mobile-push-notifications --skill backend-sms-messaging --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`backend-capabilities`](../bundles.md#backend-capabilities) | 10 | Backend product capabilities: caching, event-driven, GraphQL, bulk import, email, SMS, reports, real-time |

## Combine with

- [Backend Engineer](backend.md)
- [Game Developer](game.md)

## Watch out

WebSockets vs SSE vs WebRTC: `backend/web-real-time` has the decision table; start there.
