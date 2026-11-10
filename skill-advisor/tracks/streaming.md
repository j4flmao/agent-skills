# Streaming & Event Data Engineer

**Who this is for:** You build Kafka, Flink and CDC pipelines.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-streaming`](../../skills/data/streaming/SKILL.md) | `data/streaming` | Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees. |
| [`data-kafka-event-streaming`](../../skills/data/data-engineering/kafka-event-streaming/SKILL.md) | `data/data-engineering/kafka-event-streaming` | Kafka is a distributed, partitioned, replicated append-only log. |
| [`backend-data-streaming`](../../skills/backend/universal/data-streaming/SKILL.md) | `backend/universal/data-streaming` | Build pipelines that process continuous event streams with predictable latency and correct results under failures, late data and redelivery. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-schema-registry`](../../skills/data/schema-registry/SKILL.md) | `data/schema-registry` | Design and deploy a schema registry with Avro/Protobuf/JSON Schema, compatibility enforcement, SerDe patterns, CI/CD integration, and governance… |
| [`backend-event-sourcing`](../../skills/backend/universal/event-sourcing/SKILL.md) | `backend/universal/event-sourcing` | Store state changes as an append-only sequence of events. |
| [`backend-transactional-outbox`](../../skills/backend/universal/transactional-outbox/SKILL.md) | `backend/universal/transactional-outbox` | Guarantee reliable event publication by writing events to an outbox table within the same database transaction as the business operation, then… |
| [`cloud-native-event-driven-scaling`](../../skills/cloud-native/event-driven-scaling/SKILL.md) | `cloud-native/event-driven-scaling` | CPU-based HPA reacts late to queue backlogs and cannot scale from zero. |
| [`backend-idempotency`](../../skills/backend/universal/idempotency/SKILL.md) | `backend/universal/idempotency` | Guarantee exactly-once execution for mutating operations using idempotency keys, enabling safe retries without duplicate side effects. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-data-lakehouse`](../../skills/data/data-lakehouse/SKILL.md) | `data/data-lakehouse` | Design lakehouse architectures that merge data lake flexibility with warehouse reliability. |
| [`data-data-observability`](../../skills/data/data-observability/SKILL.md) | `data/data-observability` | Design comprehensive data observability across pipelines: freshness, volume, schema, quality, lineage, and incident management. |
| [`architecture-event-driven`](../../skills/architecture/event-driven/SKILL.md) | `architecture/event-driven` | In EDA, services publish facts ("OrderPlaced") and other services react, so producers do not depend on consumers being available or even known. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-streaming --skill data-kafka-event-streaming --skill backend-data-streaming --skill security-data-security
```

**Level 1 + 2 + security baseline (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-streaming --skill data-kafka-event-streaming --skill backend-data-streaming --skill data-schema-registry --skill backend-event-sourcing --skill backend-transactional-outbox --skill cloud-native-event-driven-scaling --skill backend-idempotency --skill security-data-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`data-engineering`](../bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |

## Combine with

- [Data Engineer](data-engineering.md)
- [Microservices Engineer](microservices.md)

## Watch out

Kafka 4.x is KRaft-only; drop ZooKeeper-based examples you find elsewhere.
