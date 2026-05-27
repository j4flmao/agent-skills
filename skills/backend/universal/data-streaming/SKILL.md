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
Naming convention: `{domain}.{event-type}.{version}` — e.g., `order.created.v1`, `payment.processed.v1`. Partition count: `max_expected_throughput / per_partition_throughput` (single partition handles ~10MB/s). Retention: time-based (7 days default), size-based (100GB default), compacted for keyed state (infinite retention, keep latest per key). Replication factor: 3 in production, 1 for dev, 2 for staging.

| Config | Default | Production | Description |
|--------|---------|------------|-------------|
| `cleanup.policy` | delete | delete or compact | Compact for keyed state/logs |
| `retention.ms` | 604800000 (7d) | 604800000 | Time-based retention |
| `retention.bytes` | -1 (unltd) | 107374182400 (100GB) | Size-based retention |
| `min.insync.replicas` | 1 | 2 | Min ISR for durability |
| `max.message.bytes` | 1048576 (1MB) | 1048576 | Max message size |

### Step 2: Streaming Platform Selection
| Platform | Type | Processing Model | State Management | Best For |
|----------|------|-----------------|-----------------|----------|
| Kafka + Kafka Streams | Durable log | Stream-table duality | RocksDB/local | Java/Streams applications |
| Apache Flink | Stream processor | True streaming | Managed state + checkpoint | Complex event processing |
| ksqlDB | SQL on Kafka | Declarative streams | Kafka-backed | SQL-friendly teams |
| Kinesis Data Analytics | Serverless | SQL or Flink | Managed | AWS ecosystem |
| Pulsar | Durable log + queue | Multi-model | BookKeeper | Multi-tenancy, geo-replication |

### Step 3: Producer Patterns
Idempotent producer: `enable.idempotence=true`, `acks=all`, `max.in.flight.requests=5` (must be ≤5 for idempotence). Key-based partitioning for ordering guarantees by entity ID. Schema registry: register Avro/Protobuf/JSON schema, producer validates on produce, schema evolution with backward/forward compatibility. Retry: `retries=MAX_INT`, `delivery.timeout.ms=120000`. Async send with callback for logging.

```typescript
// KafkaJS producer with idempotency and schema
import { Kafka, CompressionTypes } from 'kafkajs';

const kafka = new Kafka({ clientId: 'order-service', brokers: ['kafka:9092'] });
const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 5 });

await producer.connect();
await producer.send({
  topic: 'order.created.v1',
  messages: [{
    key: order.id,  // Partition key for ordering
    value: JSON.stringify(order),
    headers: { 'event-type': 'order.created', 'version': '1' },
  }],
  compression: CompressionTypes.Snappy,
});
```

```java
// Java producer with Avro schema
Properties props = new Properties();
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-service-1");
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
props.put("schema.registry.url", "http://schema-registry:8081");
KafkaProducer<String, Order> producer = new KafkaProducer<>(props);
producer.initTransactions();
```

### Step 4: Consumer Patterns
Consumer group: one group per logical consumer application. Subscribe with rebalance listener: `onPartitionsRevoked` → commit offsets, close state stores; `onPartitionsAssigned` → rebuild partition state. Seek on failure: `seek(partition, offset)` for reprocessing. Backpressure: `pause(partitions)` when lag exceeds threshold (e.g., 10000 messages), `resume(partitions)` when caught up. Use `cooperative.sticky` rebalance strategy for stateful consumers.

```typescript
const consumer = kafka.consumer({
  groupId: 'order-processor',
  sessionTimeout: 45000,
  heartbeatInterval: 15000,
  maxWaitTimeInMs: 5000,
  maxBytesPerPartition: 10485760,
});

await consumer.subscribe({ topic: /order\..*\.v1/, fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value!.toString());
    await processEvent(topic, event);
    await consumer.commitOffsets([{ topic, partition, offset: String(Number(message.offset) + 1) }]);
  },
});
```

### Step 5: Stream Processing
Kafka Streams DSL for stateless (map, filter, branch). Processor API for stateful (windowed joins, aggregations). State stores: RocksDB for large state (disk-backed, slower), in-memory for small state (<1GB, faster). Windowed joins: join streams within time windows (5-minute join window for order-payment). Changelog topics for state store fault tolerance. Grace period allows late events within window.

### Step 6: Exactly-Once Semantics
| Component | Configuration | Purpose |
|-----------|--------------|---------|
| Producer | `enable.idempotence=true`, `transactional.id` | No duplicates from retries |
| Consumer | `isolation.level=read_committed` | Don't read aborted messages |
| Kafka Streams | `processing.guarantee=exactly_once_v2` | End-to-end EOS |
| Sink | UPSERT with idempotency key | Idempotent DB writes |

### Step 7: Operations and Monitoring
Lag monitoring: `kafka-consumer-groups.sh --describe` or JMX metrics. Alert at 10000 messages or 5 minutes behind. Partition reassignment: `kafka-reassign-partitions.sh` for cluster rebalancing. Cross-DC: MirrorMaker 2 for active-passive, Cluster Linking for active-active. Monitor: broker health, ISR count, under-replicated partitions, request metrics, GC pauses.

## Configuration Reference

```yaml
producer:
  enable.idempotence: true
  acks: all
  max.in.flight.requests.per.connection: 5
  compression.type: snappy
  batch.size: 16384
  linger.ms: 5
  delivery.timeout.ms: 120000
consumer:
  enable.auto.commit: false
  auto.offset.reset: earliest
  max.poll.records: 500
  session.timeout.ms: 45000
  heartbeat.interval.ms: 15000
  max.partition.fetch.bytes: 10485760
streams:
  processing.guarantee: exactly_once_v2
  commit.interval.ms: 100
  cache.max.bytes.buffering: 10485760
  num.stream.threads: 4
```

## Rules
- Topic name = `{domain}.{event-type}.{version}`
- Partitions = max expected throughput / per-partition throughput
- Key-based partitioning for order guarantees
- Schema registry enforced for all topics
- Consumer lag alerts at threshold (e.g., 10000 messages)
- Never produce without schema
- Replication factor >= 3 in production
- Use `read_committed` isolation for exactly-once consumers

## References
  - references/exactly-once.md — Exactly-Once Semantics
  - references/streaming-architecture.md — Streaming Architecture
  - references/streaming-operations.md — Streaming Operations
  - references/streaming-patterns.md — Streaming Patterns
  - references/streaming-security.md — Streaming Security
  - references/streaming-testing.md — Streaming Testing
## Handoff
`backend-event-driven` for domain event design and event sourcing patterns
