---
name: backend-message-queue
description: >
  Use this skill when the user says 'message queue', 'Kafka', 'RabbitMQ', 'SQS', 'pub-sub', 'event bus', 'consumer group', 'topic', 'queue', 'at-least-once', 'exactly-once', 'idempotent consumer', 'event sourcing', 'dead letter queue', 'DLQ', 'message broker', 'producer', 'consumer', 'event-driven', 'async processing', or when designing asynchronous messaging. This skill enforces consistent messaging patterns: broker selection, topic/queue topology, message schema, consumer groups, retry, DLQ, and idempotency. Applies to any backend stack. Do NOT use for: gRPC streaming, WebSocket real-time, REST API design, or database CDC.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, messaging, phase-2, universal]
---

# Backend Message Queue

## Purpose
Design consistent, production-grade message-driven systems. Every message flow must follow the same conventions for broker selection, topic/queue topology, message schema, delivery guarantees, consumer idempotency, retry, and dead-letter handling.

## Agent Protocol

### Trigger
Exact user phrases: "message queue", "Kafka", "RabbitMQ", "SQS", "pub-sub", "event bus", "consumer group", "topic", "queue", "at-least-once", "exactly-once", "idempotent consumer", "event sourcing", "dead letter queue", "DLQ", "message broker", "producer", "consumer", "event-driven", "async processing", "design a message flow".

### Input Context
Before activating, verify:
- The business event or asynchronous task is known.
- The delivery guarantee requirement (at-most-once / at-least-once / exactly-once) is known. If not, ask: "What delivery guarantee do you need?"
- The throughput requirement is known.
- The broker preference (Kafka / RabbitMQ / SQS) is known. If not, ask: "Which broker? Kafka (high throughput, replay), RabbitMQ (routing, flexibility), or SQS (managed, simple)?"

### Output Artifact
No file output unless the user requests it. Produces messaging topology specs as text.

### Response Format
For each topic/queue:
```
Broker: {Kafka | RabbitMQ | SQS}
Name: {topic or queue name}
Type: {topic | queue | exchange + queue}
Partitions: {number} / Shards: {number}
Retention: {TTL or size limit}
Consumers: {consumer group or worker pool}
Dead-letter: {DLQ name}
```

For each message type:
```
Schema: {event_name} v{version}
Key: {partition key field}
Payload: {field list}
Guarantee: {at-most-once | at-least-once | exactly-once}
Idempotency key: {field name}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Broker is selected with justification.
- [ ] Every topic/queue has: name, type, partitions, retention, consumers, DLQ.
- [ ] Every message has: schema with version, key, payload, delivery guarantee, idempotency key.
- [ ] Consumer failure handling (retry policy, DLQ routing) is defined.
- [ ] Ordering requirements are documented (key-based partitioning).
- [ ] Schema evolution strategy is defined.

### Max Response Length
Per topic/queue: 8 lines. Per message type: 6 lines.

## Workflow

### Step 1: Select Broker
```
Kafka:      high throughput (100k+ msg/s), replay, log compaction, multi-consumer
            Best for: event sourcing, analytics pipelines, audit logs, CDC

RabbitMQ:   flexible routing (exchanges, bindings), low latency, per-message ack
            Best for: task queues, RPC, complex routing, lower throughput

SQS:        fully managed, no ops, auto-scaled, simple
            Best for: AWS-native, simple queues, Lambda triggers, small teams
```

### Step 2: Define Topic / Queue Topology
```
Kafka:
  topic: user.events.v1 (partitions: 6, replication: 3, retention: 7d)
  consumer group: user-service-group (6 consumers = 1 per partition)

RabbitMQ:
  exchange: user.events (type: topic)
  queue: user.created (bind key: user.created.*)
  queue: user.updated (bind key: user.updated.*)
  dead-letter exchange: user.events.dlx

SQS:
  queue: user-events-queue (visibility timeout: 30s, retention: 4d)
  DLQ: user-events-dlq (max receives: 3)
```

### Step 3: Define Message Schema
Every message has a consistent envelope:
```json
{
  "id": "uuid",
  "type": "UserCreated",
  "version": 1,
  "timestamp": "2026-05-18T10:00:00Z",
  "producer": "user-service",
  "key": "user_abc123",
  "data": {
    "user_id": "abc123",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### Step 4: Delivery Guarantees
```
At-most-once:     fire and forget. Lowest overhead, possible data loss.
                  Use: metrics, non-critical logs.

At-least-once:    retry on failure. Lower overhead, no data loss, possible duplicates.
                  Use: order processing, notifications, data sync.
                  Required: idempotent consumer.

Exactly-once:     transactional producers + idempotent consumers + dedup.
                  High overhead. Only when mandated by compliance.
                  Use: financial transactions, inventory deduction.
```

### Step 5: Idempotent Consumer Pattern
```
On receive message:
  1. Check if idempotency_key exists in processed set (Redis / DB).
  2. If exists → ack and skip (duplicate).
  3. If not exists → process, store idempotency_key, commit offset / ack.

Idempotency key = message.id or business_key + event_type
Processed set TTL: match broker retention period
```

### Step 6: Retry and Dead-Letter Queue
```
Kafka:
  - Retry topic: user.events.v1.retry (consumers reprocess after delay)
  - DLQ topic: user.events.v1.dlq (after 3 retries)
  - Alert on DLQ message production

RabbitMQ:
  - Retry policy: reject → DLX → retry queue (with TTL) → requeue
  - Max retries: 3 with exponential backoff (10s, 30s, 60s)
  - After max: route to DLQ permanently

SQS:
  - redrive policy: maxReceiveCount = 3
  - DLQ for failed messages
  - Lambda DLQ destinations for async invocation failures
```

## Rules
- Never consume from production topics without a consumer group id.
- Always set a retention limit (time or size). Never use infinite retention.
- Every message must have a unique id and timestamp.
- Always use key-based partitioning when message ordering matters.
- Schema evolve via new version — never mutate existing message schemas.
- DLQ must have monitoring and alerting. Unattended DLQ = silent data loss.
- Consumer lag must be monitored. Set alerts for lag > threshold.
- Never commit offsets before processing is complete (at-least-once).

## References
- `references/broker-comparison.md` — Kafka vs RabbitMQ vs SQS
- `references/kafka-patterns.md` — Apache Kafka patterns
- `references/rabbitmq-patterns.md` — RabbitMQ patterns
- `references/message-design.md` — Message schema design

## Handoff
No artifact produced unless requested.
Next skill: backend-caching — if the event-driven system needs to cache materialized views or read models.
Carry forward: topic/queue topology, message schemas, consumer group configs, retry/DLQ policies.
