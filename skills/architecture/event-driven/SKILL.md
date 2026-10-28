---
name: architecture-event-driven
description: >
  Use this skill when the user says 'event-driven architecture', 'EDA', 'pub/sub between services', 'domain events', 'Kafka vs RabbitMQ vs SQS', 'dual write', 'transactional outbox', 'event schema', 'eventual consistency', 'choreography'. Designs asynchronous service integration: event vs command semantics, broker choice, delivery guarantees, outbox/inbox, ordering and partitioning, schema evolution, and tracing. Do NOT use for: implementation recipes inside one backend stack (backend/universal/event-driven, backend/universal/transactional-outbox), event sourcing as a persistence model (backend/universal/event-sourcing), or stream analytics (data/streaming).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [architecture, event-driven, kafka, messaging, outbox, eventual-consistency, cloudevents]
---

# Event-Driven Architecture

## Purpose
In EDA, services publish facts ("OrderPlaced") and other services react, so producers do not depend on consumers being available or even known. The price is eventual consistency, harder debugging, and the need for reliable publishing and idempotent consumption. This skill covers the architectural decisions that make EDA correct, not just decoupled.

## Agent Protocol

### Trigger
"event-driven", "EDA", "domain events", "pub/sub", "message broker choice", "dual-write problem", "outbox", "at-least-once", "event ordering", "event versioning", "choreography".

### Input Context
- Business flows and which steps must be synchronous for the user.
- Throughput, ordering needs (per entity?), retention/replay needs.
- Existing infra (Kafka, RabbitMQ, cloud queues) and team experience.
- Consistency requirements and failure tolerance.

### Output Artifact
Event catalog, broker/topology choice, delivery and idempotency design, schema/versioning policy, observability plan.

### Response Format
```
Event: {Name}(past tense) v{n}  Producer: {service}  Consumers: {services}
Key (ordering): {aggregate id}  Topic/queue: {name}  Retention: {duration}
Publish: outbox -> {relay: CDC|poller}  Delivery: at-least-once
Consumer: idempotent via {inbox table|natural upsert}; DLQ: {name}
Schema: {Avro|Protobuf|JSON Schema} compatibility={BACKWARD}
```

### Completion Criteria
- [ ] Each message classified as event (fact) or command (request).
- [ ] No dual writes: outbox or CDC for publishing.
- [ ] Consumers idempotent; DLQ and retry policy defined.
- [ ] Ordering key chosen per aggregate where order matters.
- [ ] Trace context propagated in message headers.

## Events vs Commands vs Queries
| Kind | Meaning | Addressed to | Can be rejected? | Transport |
|---|---|---|---|---|
| Event | "OrderPlaced" happened | Anyone interested | No (it is a fact) | Topic / pub-sub |
| Command | "ReserveStock" please | One owner | Yes | Queue or RPC |
| Query | "What is the stock?" | One owner | n/a | Sync RPC |

**Event payload style**: thin events (id + type; consumers call back for details) couple consumers to the producer API at read time; fat/event-carried state transfer (include the relevant data) lets consumers build local read models. Prefer fat events for integration, scoped to what consumers need.

## Broker Choice
| Broker | Model | Strengths | Watch out |
|---|---|---|---|
| Kafka (or Redpanda) | Partitioned replicated log | Replay, high throughput, per-partition order, many consumer groups | Ops complexity; ordering only within a partition |
| RabbitMQ | Queues with exchanges/routing | Flexible routing, per-message acks, priorities | Replay limited (streams feature helps) |
| AWS SNS + SQS | Fan-out topic → queues | Managed, simple | Standard queues unordered; FIFO queues have lower throughput |
| Google Pub/Sub, Azure Service Bus/Event Hubs | Managed pub/sub / log | Managed scaling | Provider-specific semantics |
| NATS JetStream | Streams + consumers | Lightweight, low latency | Smaller ecosystem |

## Reliable Publishing: Transactional Outbox
Writing to the database and the broker separately can lose or invent events when one write fails. Write the event to an outbox table in the same transaction as the state change, then relay it.

```sql
CREATE TABLE outbox (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id      UUID NOT NULL UNIQUE,          -- consumers dedupe on this
  aggregate_id  TEXT NOT NULL,                 -- becomes the message key
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);

BEGIN;
INSERT INTO orders (id, customer_id, total_cents) VALUES ($1, $2, $3);
INSERT INTO outbox (event_id, aggregate_id, event_type, payload)
VALUES ($4, $1, 'OrderPlaced.v1', $5);
COMMIT;
```

Relay options:
- **CDC** (Debezium reading the WAL, with its outbox event router): low latency, no polling load.
- **Poller**: `SELECT ... WHERE published_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`, publish, then mark published. Simple; a crash between publish and mark causes a duplicate, which consumers must tolerate.

Either way delivery is **at-least-once**, never exactly-once end to end.

## Idempotent Consumers (Inbox)

```python
def handle(message, conn) -> None:
    event_id = message.headers["event_id"]
    with conn.transaction():
        inserted = conn.execute(
            "INSERT INTO inbox (event_id, received_at) VALUES (%s, now()) ON CONFLICT DO NOTHING",
            (event_id,),
        ).rowcount
        if inserted == 0:
            return                      # duplicate: already processed
        apply_business_change(conn, message.value)
    # commit offset / ack only after the transaction commits
```

Retry transient failures with bounded backoff; route poison messages to a dead-letter queue with the error attached; alert on DLQ depth.

## Ordering and Partitioning
- Order is only guaranteed within a partition/queue; use the aggregate id as the key so all events for one order land in order.
- Consumers must not assume global order across aggregates.
- Carry a per-aggregate version/sequence number so consumers can detect gaps or stale events.

## Schema and Versioning
- Use a schema registry (Avro/Protobuf/JSON Schema) with compatibility checks in CI.
- Additive changes only (new optional fields); breaking change = new event type/version (`OrderPlaced.v2`), dual-publish during migration.
- Standard envelope: CloudEvents attributes (`id`, `source`, `type`, `specversion`, `time`, `subject`) plus W3C `traceparent` header.

## Observability
Propagate trace context through message headers (OpenTelemetry messaging conventions) so one trace links the HTTP request, the outbox relay, and every consumer. Track consumer lag, DLQ depth, and end-to-end latency (event time → processed time).

## Hazards
| Hazard | Mitigation |
|---|---|
| Event pinball (chains across many services) | Distributed tracing; prefer an orchestrated saga for multi-step business processes |
| Eventual consistency surprises in UI | Optimistic UI, read-your-writes from the owning service, status polling or push |
| Consumer coupling to producer internals | Publish integration events, not table-row changes |
| Unbounded retries blocking a partition | Retry topics / DLQ with backoff |
| Lost events from dual writes | Outbox or CDC only |

## Checklist
- [ ] Event catalog with owners, keys, schemas, consumers.
- [ ] Outbox/CDC publishing; no direct broker write inside business transactions.
- [ ] Inbox or natural idempotency on every consumer.
- [ ] DLQ + alerting; replay procedure documented.
- [ ] Schema registry and compatibility gate.
- [ ] Tracing headers and lag dashboards.

## References
- [CQRS & Event Sourcing](references/cqrs-event-sourcing.md) — read models and event-sourced aggregates.
- Richardson, "Microservices Patterns" — transactional outbox, saga.
- Debezium documentation: outbox event router; CloudEvents specification (CNCF).
