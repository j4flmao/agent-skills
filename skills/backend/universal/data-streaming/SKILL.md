---
name: backend-data-streaming
description: >
  Use this skill when designing Kafka-based event streaming, stream processing, or topic architectures. This skill enforces: topic naming conventions, schema registry, idempotent producers, consumer group rebalance handling, and exactly-once semantics. Applies to Kafka, Kinesis, Pulsar, or any streaming platform. Do NOT use for: background job queues, synchronous message passing, or AMQP-style message brokers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, streaming, phase-6, universal]
---

# Backend Data Streaming

## Purpose
Design reliable event streaming topologies with Kafka, producers, consumers, and stream processing.

## Agent Protocol

### Trigger
Exact user phrases: "Kafka", "data streaming", "event stream", "stream processing", "Kafka topic", "Kafka consumer", "Kafka producer", "stream consumer", "partition", "consumer group", "exactly-once", "at-least-once", "Kafka Streams", "ksqlDB", "Apache Flink", "message broker streaming", "event log".

### Input Context
Before activating, verify:
- Event volume (messages per second, peak throughput, average message size)
- Retention requirements (time-based, size-based, compacted topics)
- Processing semantics (at-least-once, exactly-once, at-most-once)
- Number of consumers and consumer groups per topic

### Output Artifact
Stream topology design as formatted text.

### Response Format
```yaml
# Topic configuration
# Producer config
# Consumer config
```
```typescript
// Stream processing topology
// Exactly-once setup
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Topic design with naming convention, partition count, and retention
- [ ] Producer pattern with idempotency, acks, and schema registry
- [ ] Consumer group configuration with rebalance listener
- [ ] Stream processing topology with state stores or windowed joins
- [ ] Exactly-once semantics configured (transactional producer, EOS consumer)
- [ ] Operations: lag monitoring, partition reassignment, cross-DC mirroring

### Max Response Length
300 lines of configuration and code.

## Workflow

### Step 1: Topic Design
Naming: `{domain}.{event-type}.{version}` — e.g., `order.created.v1`, `payment.processed.v1`. Partition count: max expected throughput / per-partition throughput (a single partition handles ~10MB/s). Retention: time-based (7 days default), size-based (100GB default), compacted for keyed state (infinite retention, keep latest per key). Replication factor: 3 in production, 1 for dev. Cleanup policy: `delete` for regular events, `compact` for state/log tables.

### Step 2: Producer Patterns
Idempotent producer: `enable.idempotence=true`, `acks=all`, `max.in.flight.requests.per.connection=5`. Key-based partitioning for ordering guarantees by entity ID. Schema registry: register Avro/Protobuf/JSON schema, producer validates on produce. Retry: `retries=MAX_INT`, `delivery.timeout.ms=120000`. Async send with callback for error logging.

### Step 3: Consumer Patterns
Consumer group: one group per logical consumer application. Subscribe with rebalance listener: `onPartitionsRevoked` → commit offsets, close state stores; `onPartitionsAssigned` → rebuild state. Seek on failure: `seek(partition, offset)` for reprocessing. Pause/resume for backpressure: `pause(partitions)` when processing lags, `resume(partitions)` when caught up.

### Step 4: Stream Processing
Kafka Streams DSL for stateless transformations (map, filter, branch). Processor API for stateful operations (windowed joins, aggregations). State stores: RocksDB for large state, in-memory for small state. Windowed joins: join streams within time windows (e.g., 5-minute join window for order-payment). Changelog topics for state store fault tolerance.

### Step 5: Exactly-Once Semantics
Producer: `enable.idempotence=true`, transactional producer with `transactional.id`. Consumer: `isolation.level=read_committed`. Streams: `processing.guarantee=exactly_once_v2`. Sink: idempotent writes with upsert to database. EOS ensures messages are produced exactly once and consumed exactly once within a transaction boundary.

### Step 6: Operations
Lag monitoring: consumer lag per partition via `kafka-consumer-groups.sh` or JMX metrics. Alert threshold: 10000 messages behind or 5 minutes behind current time. Partition reassignment: `kafka-reassign-partitions.sh` for rebalancing. Cross-DC: MirrorMaker 2 for active-passive replication, or Confluent Cluster Linking for active-active. Monitoring: broker health, ISR count, under-replicated partitions, request metrics.

## Rules
- Topic name = `{domain}-{event-type}-{version}`
- Partitions = max expected throughput / per-partition throughput
- Key-based partitioning for order guarantees
- Schema registry enforced for all topics
- Consumer lag alerts at threshold (e.g., 10000 messages)
- Never produce without schema
- Replication factor >= 3 in production

## References
- `references/kafka-patterns.md` — Topic design, producer/consumer patterns, streams, exactly-once
- `references/stream-processing.md` — Windowed joins, state stores, Flink integration

## Handoff
`backend-event-driven` for domain event design and event sourcing patterns
