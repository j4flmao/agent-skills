---
name: backend-data-streaming
description: >
  Use this skill when designing Kafka-based event streaming, stream processing, or topic architectures. This skill enforces: topic naming conventions, schema registry, idempotent producers, consumer group rebalance handling, and exactly-once semantics. Applies to Kafka, Kinesis, Pulsar, or any streaming platform. Do NOT use for: background job queues, synchronous message passing, or AMQP-style message brokers.
version: "2.0.0"
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
# Stream processing topology
# Exactly-once setup
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Topic design with naming convention, partition count, and retention
- [ ] Producer pattern with idempotency, acks, and schema registry
- [ ] Consumer group configuration with rebalance listener
- [ ] Stream processing topology with state stores or windowed joins
- [ ] Exactly-once semantics configured (transactional producer, EOS consumer)
- [ ] Operations: lag monitoring, partition reassignment, cross-DC mirroring

### Max Response Length
300 lines of configuration and code.

## Architecture Decision Tree

### Which Streaming Platform?

```
What is the primary processing model?
  ├── Durable log with stream-table duality → Kafka + Kafka Streams
  ├── True stream processing with complex event processing → Apache Flink
  ├── SQL-friendly stream queries → ksqlDB
  ├── Serverless, AWS ecosystem → Kinesis Data Analytics
  └── Multi-tenancy, geo-replication → Pulsar
```

### Processing Semantics Decision

```
Can the system tolerate duplicate events?
  ├── Yes → At-most-once (fastest, highest throughput)
  └── No → Can the consumer handle duplicates?
            ├── Yes → At-least-once (standard, idempotent consumers)
            └── No → Exactly-once (transactional, highest overhead)
```

### Partition Count Decision

```
How many partitions?
  partitions = max(expected throughput) / per-partition throughput
  └── Single partition handles ~10MB/s
  └── More partitions = more parallelism but more rebalancing overhead
  └── Rule of thumb: 3× max expected consumer instances
  └── Max recommended: 1000 partitions per broker
```

## Workflow

### Step 1: Topic Design
Naming convention: `{domain}.{event-type}.{version}` — e.g., `order.created.v1`, `payment.processed.v1`.

| Config | Default | Production | Description |
|--------|---------|------------|-------------|
| `cleanup.policy` | delete | delete or compact | Compact for keyed state/logs |
| `retention.ms` | 604800000 (7d) | 604800000 | Time-based retention |
| `retention.bytes` | -1 (unltd) | 107374182400 (100GB) | Size-based retention |
| `min.insync.replicas` | 1 | 2 | Min ISR for durability |
| `max.message.bytes` | 1048576 (1MB) | 1048576 | Max message size |

### Step 2: Producer Patterns
Idempotent producer: `enable.idempotence=true`, `acks=all`, `max.in.flight.requests=5`.

```typescript
import { Kafka, CompressionTypes } from 'kafkajs';

const kafka = new Kafka({ clientId: 'order-service', brokers: ['kafka:9092'] });
const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 5 });

await producer.connect();
await producer.send({
  topic: 'order.created.v1',
  messages: [{
    key: order.id,
    value: JSON.stringify(order),
    headers: { 'event-type': 'order.created', 'version': '1' },
  }],
  compression: CompressionTypes.Snappy,
});
```

```python
from kafka import KafkaProducer
import json, snappy

producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    acks='all',
    compression_type='snappy',
    value_serializer=lambda v: json.dumps(v).encode(),
    enable_idempotence=True,
)

producer.send(
    topic='order.created.v1',
    key=order.id.encode(),
    value=order.to_dict(),
    headers=[('event-type', b'order.created'), ('version', b'1')],
)
```

### Step 3: Consumer Patterns
Consumer group: one group per logical consumer application.

```typescript
const consumer = kafka.consumer({
  groupId: 'order-processor',
  sessionTimeout: 45000,
  heartbeatInterval: 15000,
  maxWaitTimeInMs: 5000,
  maxBytesPerPartition: 10485760,
  rebalanceTimeout: 60000,
});

await consumer.subscribe({ topic: /order\..*\.v1/, fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value!.toString());
    await processEvent(topic, event);
    await consumer.commitOffsets([
      { topic, partition, offset: String(Number(message.offset) + 1) },
    ]);
  },
});
```

### Step 4: Stream Processing
Kafka Streams DSL for stateless (map, filter, branch). Processor API for stateful (windowed joins, aggregations).

```typescript
// Kafka Streams (TypeScript via kafka-streams)
const stream = kafkaStreams.getKStream('orders');
stream
  .filter(({ value }) => JSON.parse(value).status === 'pending')
  .map(({ value }) => {
    const order = JSON.parse(value);
    return { ...order, processedAt: new Date().toISOString() };
  })
  .to('processed-orders');
```

### Step 5: Exactly-Once Semantics
| Component | Configuration | Purpose |
|-----------|--------------|---------|
| Producer | `enable.idempotence=true`, `transactional.id` | No duplicates from retries |
| Consumer | `isolation.level=read_committed` | Don't read aborted messages |
| Kafka Streams | `processing.guarantee=exactly_once_v2` | End-to-end EOS |
| Sink | UPSERT with idempotency key | Idempotent DB writes |

```typescript
// Transactional producer
const producer = kafka.producer({
  idempotent: true,
  transactionalId: 'order-service-producer',
  maxInFlightRequests: 5,
});

await producer.connect();
await producer.initTransactions();

try {
  await producer.beginTransaction();
  await producer.send({ topic: 'order.created.v1', messages: [...] });
  await producer.send({ topic: 'inventory.v1', messages: [...] });
  await producer.commitTransaction();
} catch (error) {
  await producer.abortTransaction();
  throw error;
}
```

## Schema Management

### Schema Registry Integration
```typescript
// Avro schema with Schema Registry
const schema = {
  type: 'record',
  name: 'OrderCreated',
  namespace: 'com.example.order',
  fields: [
    { name: 'orderId', type: 'string' },
    { name: 'customerId', type: 'string' },
    { name: 'total', type: 'double' },
    { name: 'items', type: { type: 'array', items: 'OrderItem' } },
  ],
};

const producer = new KafkaAvroProducer({
  schemaRegistry: 'http://schema-registry:8081',
  producerConfig: { ... },
});
```

### Schema Evolution Rules
- **Backward compatible**: New schema can read data written with old schema (add optional fields, set defaults)
- **Forward compatible**: Old schema can read data written with new schema (never delete fields)
- **Full compatible**: Both backward and forward
- **Transitive compatibility**: Compatibility chain through all versions

## Consumer Group Rebalance

### Cooperative Sticky Rebalance
```typescript
const consumer = kafka.consumer({
  groupId: 'stateful-processor',
  partitionAssigners: [PartitionAssigners.cooperativeSticky()],
});

consumer.on('consumer.rebalance', async ({ type }) => {
  if (type === 'revoke') {
    // Stop processing, commit offsets, close state stores
    await this.store.close();
  }
  if (type === 'assign') {
    // Rebuild state for assigned partitions
    await this.store.initialize();
  }
});
```

### Rebalance Optimization
- Use `cooperative.sticky` to minimize full rebalances
- Set `session.timeout.ms` appropriately (45000ms default)
- Set `heartbeat.interval.ms` to 1/3 of session timeout
- Monitor rebalance duration and frequency

## Operations and Monitoring

### Lag Monitoring
```bash
# Kafka CLI
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group order-processor --describe

# Output:
# TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# order.created   0          1500            1520            20
# order.created   1          3200            3210            10
```

### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Consumer lag | 10000 | 50000 | Scale consumers, check processing |
| Rebalance duration | 30s | 60s | Check rebalance listeners |
| Failed deliveries | 10/min | 50/min | Check consumer health |
| Under-replicated partitions | 0 | 1+ | Check broker health |

## Security

### Kafka Security Configuration
```yaml
# SSL + SASL authentication
security.protocol: SASL_SSL
sasl.mechanism: SCRAM-SHA-512
ssl.truststore.location: /etc/kafka/secrets/truststore.jks
ssl.keystore.location: /etc/kafka/secrets/keystore.jks

# ACL-based authorization
# Topic-level read/write permissions per principal
```

### Producer/Consumer Authorization
```typescript
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka:9092'],
  ssl: { rejectUnauthorized: true },
  sasl: {
    mechanism: 'scram-sha-512',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});
```

## Anti-Patterns

1. **Schema-less messages**: Producing messages without Schema Registry leads to deserialization failures and data corruption.
2. **Too many partitions**: More partitions means more rebalancing, more files, more memory. 3× max consumer instances is a good rule.
3. **Auto-commit enable**: Never use `enable.auto.commit=true` in production — you lose control and may lose data.
4. **Synchronous processing**: Processing messages one-at-a-time in the consumer callback without batching hurts throughput.
5. **Ignoring rebalance**: Not handling rebalance events in stateful consumers leads to data loss or duplication.
6. **Large messages**: Messages over 1MB hurt performance. Store large payloads externally and reference by key.

## Rules
- Topic name = `{domain}.{event-type}.{version}`
- Partitions = max expected throughput / per-partition throughput
- Key-based partitioning for order guarantees
- Schema registry enforced for all topics
- Consumer lag alerts at threshold (e.g., 10000 messages)
- Never produce without schema
- Replication factor >= 3 in production
- Use `read_committed` isolation for exactly-once consumers
- Monitor lag, rebalance duration, and consumer group health
- Never auto-commit offsets

## References
  - references/exactly-once.md — Exactly-Once Semantics
  - references/streaming-architecture.md — Streaming Architecture
  - references/streaming-fundamentals.md — Data Streaming Fundamentals
  - references/streaming-advanced.md — Data Streaming Advanced Patterns
  - references/streaming-operations.md — Streaming Operations
  - references/streaming-patterns.md — Streaming Patterns
  - references/streaming-security.md — Streaming Security
  - references/streaming-testing.md — Streaming Testing
## Handoff
`backend-event-driven` for domain event design and event sourcing patterns
