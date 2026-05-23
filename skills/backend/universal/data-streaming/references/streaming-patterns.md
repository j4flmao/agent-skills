# Streaming Patterns

## Topic Naming Convention

```
{domain}.{event-type}.{version}

Examples:
order.created.v1
order.cancelled.v1
payment.processed.v1
payment.refunded.v2
inventory.updated.v1
shipping.delivered.v1
```

Evolution: version is bumped when schema changes break backward compatibility (remove field, change type). Additive changes (new optional fields) do not require version bump. Event type uses past tense verb — the event has already happened.

## Topic Configuration Reference

```yaml
topics:
  order.created.v1:
    partitions: 6
    replication_factor: 3
    configs:
      cleanup.policy: delete
      retention.ms: 604800000        # 7 days
      retention.bytes: 107374182400  # 100GB
      min.insync.replicas: 2
      max.message.bytes: 1048576     # 1MB
      compression.type: snappy
  payment.processed.v1:
    partitions: 6
    replication_factor: 3
    configs:
      cleanup.policy: compact       # Keep latest per key for state
      min.cleanable.dirty.ratio: 0.5
      delete.retention.ms: 86400000 # 24h tombstone retention
      min.insync.replicas: 2
  user.profile.v1:
    partitions: 3
    replication_factor: 3
    configs:
      cleanup.policy: compact       # Keyed state — keep latest
      min.insync.replicas: 2
```

## Producer Configuration

```typescript
// Node.js — KafkaJS producer with idempotency
import { Kafka, CompressionTypes, CompressionCodecs } from 'kafkajs';
import SnappyCodec from 'kafkajs-snappy';
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-1:9092', 'kafka-2:9092', 'kafka-3:9092'],
  retry: { retries: 10, initialRetryTime: 100, multiplier: 2 },
});

const producer = kafka.producer({
  idempotent: true,                   // Exactly-once per partition
  maxInFlightRequests: 5,             // Max concurrent sends
  transactionalId: 'order-service-1', // For EOS transactions
});

await producer.connect();

// Produce with key for ordering
async function emitOrderCreated(order: Order): Promise<void> {
  await producer.send({
    topic: 'order.created.v1',
    messages: [{
      key: order.id,                    // Partition by order ID (ordering guarantee)
      value: JSON.stringify({
        orderId: order.id,
        userId: order.userId,
        amount: order.total,
        items: order.items,
        timestamp: new Date().toISOString(),
      }),
      headers: { 'event-type': 'order.created', 'version': '1' },
    }],
    compression: CompressionTypes.Snappy,
  });
}
```

```java
// Java Kafka producer with Avro schema
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;

Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "io.confluent.kafka.serializers.KafkaAvroSerializer");
props.put("schema.registry.url", "http://schema-registry:8081");

KafkaProducer<String, Order> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("order.created.v1", order.getId(), order));
```

## Consumer Configuration

```typescript
// Node.js consumer with rebalance handling
import { Kafka } from 'kafkajs';

const consumer = kafka.consumer({
  groupId: 'order-processor',
  sessionTimeout: 45000,
  heartbeatInterval: 15000,
  maxBytesPerPartition: 10485760, // 10MB per poll
  minBytes: 1,
  maxBytes: 52428800,             // 50MB per poll
  maxWaitTimeInMs: 5000,
  retry: { retries: 5 },
});

await consumer.subscribe({ topic: /order\..*\.v1/, fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value!.toString());
    const key = message.key!.toString();
    const offset = message.offset;

    await processEvent(topic, event);

    // Manual offset commit
    await consumer.commitOffsets([{ topic, partition, offset: String(Number(offset) + 1) }]);
  },
});

// Backpressure handling
async function handleBackpressure(consumer: Consumer, threshold = 10000) {
  const lag = await consumer.fetchLag();
  if (lag > threshold) {
    await consumer.pause(consumer.assignedPartitions());
    setTimeout(async () => {
      await consumer.resume(consumer.assignedPartitions());
    }, 30_000);
  }
}
```

## Schema Registry Integration

```json
// Avro schema registered in Schema Registry
{
  "namespace": "com.example.events",
  "type": "record",
  "name": "OrderCreated",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "userId", "type": "string" },
    { "name": "amount", "type": "double" },
    { "name": "items", "type": { "type": "array", "items": "string" } },
    { "name": "timestamp", "type": { "type": "long", "logicalType": "timestamp-millis" } },
    { "name": "metadata", "type": ["null", { "type": "map", "values": "string" }], "default": null }
  ]
}
```

## Consumer Group Rebalance Strategy

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Range | Assign contiguous partition ranges per topic | Default, simple assignment |
| RoundRobin | Distribute partitions evenly across consumers | Balanced load, many topics |
| Sticky | Minimize partition movement on rebalance | Stateful processing |
| CooperativeSticky | Incremental rebalance (no stop-the-world) | Kafka >= 2.4, recommended |

Implement rebalance listener: on `PARTITIONS_REVOKED`, commit all offsets and flush state stores. On `PARTITIONS_ASSIGNED`, rebuild any partition-specific state. Use `cooperative.sticky` for stateful consumers to avoid full rebalance.

## Backpressure Handling Strategies

| Strategy | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| Pause/Resume | Consumer pauses partition when lag > threshold | Simple, built-in API | Cannot prioritize specific partitions |
| Rate limiting | Throttle `eachMessage` processing rate | Predictable resource usage | May increase lag |
| Dynamic prefetch | Adjust `maxBytes` based on processing speed | Adaptive | Complex to implement |
| Shed load | Drop lower-priority messages | Protects critical flow | Data loss risk |
| Backpressure to producer | Throttle produce via acknowledgments | End-to-end flow control | Requires custom protocol |

## Stream-Table Duality

```
Stream: append-only log of facts (all events)
  → events never change, only append
  → immutable, insert-only
  → "all changes over time"

Table: current state (latest value per key)
  → updates in place
  → mutable, upsert-only
  → "current state, last write wins"

Transform: stream → table via aggregation (KTable)
  → count, reduce, aggregate over stream
  → materialized as state store

Transform: table → stream via changelog
  → log each table update as event
  → source of truth for state synchronization
```

## Common Pitfalls

- **Too few partitions**: Under-partitioned topics limit parallelism. Rule of thumb: partition count = max consumer throughput / single consumer throughput.
- **Missing keys for ordering**: Partitioning by null key gives round-robin — no ordering guarantee. Always provide a meaningful key when order matters per entity.
- **Schema evolution without compatibility checking**: Changing required fields or renaming fields breaks consumers. Always check backward/forward compatibility via Schema Registry.
- **Consumer group rebalance storm**: Frequent rebalances (consumer joins/leaves) disrupt processing. Use static group membership and `session.timeout.ms` high enough to avoid false positives.
- **Unbounded memory from unflushed state stores**: Kafka Streams state stores accumulate in memory (RocksDB) and can grow unboundedly. Configure state store cleanup and use windowed stores where applicable.
