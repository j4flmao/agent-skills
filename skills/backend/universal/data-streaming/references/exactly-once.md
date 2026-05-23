# Exactly-Once Semantics

## Delivery Guarantees Comparison

| Guarantee | Description | Duplicates | Data Loss | Use Case |
|-----------|-------------|------------|-----------|----------|
| At-most-once | Message sent once, no retry | No | Yes | Metrics, logging, fire-and-forget |
| At-least-once | Message retried until acked | Yes | No | Most applications — default |
| Exactly-once | Message processed exactly once, no duplicates | No | No | Financial transactions, inventory |

Exactly-once in Kafka is not a single feature but a combination of: idempotent producers, transactional producers, and read-committed consumers. Together they prevent duplicates from producer retries and ensure atomic writes to multiple topics.

## Exactly-Once Configuration

```yaml
producer:
  enable.idempotence: true    # Required for EOS
  acks: all                   # Wait for all in-sync replicas
  max.in.flight.requests.per.connection: 5  # ≤5 for idempotence
  retries: 2147483647         # Infinite retries within timeout
  delivery.timeout.ms: 120000 # 2 minutes max delivery time
  transactional.id: "${service}-${instance-id}"  # Unique per producer instance

consumer:
  isolation.level: read_committed  # Don't read uncommitted messages
  enable.auto.commit: false        # Manual commit for transactional batches
  auto.offset.reset: earliest      # Start from beginning on new group

streams:
  processing.guarantee: exactly_once_v2  # EOS for Kafka Streams
  commit.interval.ms: 100
  transactional.id.prefix: "${app}-"
```

## Idempotent Producer Implementation

```typescript
// KafkaJS — idempotent producer
const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 5,
  transactionalId: `order-service-${instanceId}`,
});

await producer.connect();

// Within a transaction
async function transferOrderToPayment(orderId: string): Promise<void> {
  await producer.transaction(async ({ send }) => {
    // Both sends succeed or both fail atomically
    await send({
      topic: 'order.processed.v1',
      messages: [{ key: orderId, value: JSON.stringify({ orderId, status: 'processing' }) }],
    });
    await send({
      topic: 'payment.pending.v1',
      messages: [{ key: orderId, value: JSON.stringify({ orderId, amount: 99.99 }) }],
    });
  });
}
```

```java
// Java — transactional producer
import org.apache.kafka.clients.producer.KafkaProducer;

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
producer.initTransactions();

try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>("order.processed.v1", orderId, orderJson));
    producer.send(new ProducerRecord<>("payment.pending.v1", orderId, paymentJson));
    producer.commitTransaction();
} catch (ProducerFencedException e) {
    producer.abortTransaction();
    // Re-create producer with new transactional.id
}
```

## Read-Committed Consumer

```typescript
// Consumer reads only committed messages
const consumer = kafka.consumer({
  groupId: 'order-processor',
  isolationLevel: 'read_committed',  // Don't read uncommitted (aborted) messages
  readUncommitted: false,
});

await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
    const processedMessages: ProcessedMessage[] = [];

    for (const message of batch.messages) {
      const result = await processMessage(message);
      processedMessages.push({ partition: batch.partition, offset: message.offset, result });
    }

    // Commit offsets after batch is fully processed
    await commitOffsetsIfNecessary(batch.lastOffset());
  },
});
```

## Checkpointing and Offset Management

```typescript
// Manual offset checkpointing with exactly-once semantics
interface Checkpoint {
  topic: string;
  partition: number;
  offset: string;
  metadata: Record<string, unknown>;
}

async function checkpointAndCommit(consumer: Consumer, checkpoints: Checkpoint[]): Promise<void> {
  // Store checkpoint in transactional storage (same DB transaction as business logic)
  await db.transaction(async (tx) => {
    for (const cp of checkpoints) {
      await tx.execute(
        'INSERT INTO stream_checkpoints (topic, partition, offset, processed_at) VALUES ($1, $2, $3, NOW())',
        [cp.topic, cp.partition, cp.offset]
      );
    }
  });

  // Commit Kafka offset
  await consumer.commitOffsets(
    checkpoints.map(cp => ({ topic: cp.topic, partition: cp.partition, offset: cp.offset }))
  );
}
```

## Watermark and Windowing

```typescript
// Kafka Streams windowed aggregation
import { StreamsBuilder, WindowedSerdes } from 'kafka-streams';

const builder = new StreamsBuilder();
const ordersStream = builder.stream<string, Order>('order.created.v1');

// Tumbling window — 1-hour non-overlapping windows
const hourlyRevenue = ordersStream
  .groupByKey()
  .windowedBy(TimeWindows.of(Duration.ofHours(1)).grace(Duration.ofMinutes(5)))
  .aggregate(
    () => ({ revenue: 0, count: 0 }),
    (key: string, order: Order, agg: RevenueAgg, window) => {
      agg.revenue += order.amount;
      agg.count += 1;
      return agg;
    },
    Materialized.as('hourly-revenue-store')
  );

// Grace period: 5 minutes — allows late-arriving events
// Watermark: automatically tracks event time progress
// Late events within grace period are included
// Late events after grace period are discarded
```

## Exactly-Once Sink Pattern

```typescript
// Idempotent write to sink (PostgreSQL upsert)
interface SinkRecord {
  idempotencyKey: string;
  orderId: string;
  status: string;
  amount: number;
  processedAt: string;
}

async function writeToSink(record: SinkRecord): Promise<void> {
  // UPSERT guarantees idempotency — same key = no duplicate
  await pool.query(`
    INSERT INTO orders (idempotency_key, order_id, status, amount, processed_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (idempotency_key) DO NOTHING
  `, [record.idempotencyKey, record.orderId, record.status, record.amount, record.processedAt]);
}

// Processing loop
async function processStreamRecord(message: KafkaMessage): Promise<void> {
  const idempotencyKey = `${message.topic}:${message.partition}:${message.offset}`;
  await writeToSink({
    idempotencyKey,
    orderId: message.value.orderId,
    status: message.value.status,
    amount: message.value.amount,
    processedAt: new Date().toISOString(),
  });
}
```

## Kappa Architecture

```
Kappa: single data pipeline for both real-time and batch processing
All data flows through streaming platform (Kafka)
Batch = replay of historical stream data

vs

Lambda: separate batch and streaming pipelines
Batch: accurate, late data (e.g., nightly Hadoop job)
Streaming: low-latency, approximate (e.g., Kafka Streams)

Choose Kappa when:
  - Stream reprocessing is fast enough for batch use cases
  - Operational simplicity is preferred over separate systems
  - Event-time processing handles late data adequately

Choose Lambda when:
  - Batch processing requires significantly different computation
  - Historical reprocessing needs full dataset scans
  - Real-time approximation is acceptable with daily correction
```

## Common Pitfalls

- **Producer fencing**: Two producer instances with the same `transactional.id` cause fencing (older instance is killed). Always use unique transactional IDs or ensure graceful startup/shutdown.
- **Read-uncommitted consumer**: Consumer with default isolation level reads aborted (rolled-back) transactions. Set `isolation.level=read_committed` to prevent this.
- **Non-idempotent sinks**: Even with EOS stream processing, if the sink database insert is not idempotent, duplicates can still occur. Always use UPSERT with idempotency key.
- **State store corruption**: RocksDB state store corruption can cause incorrect aggregations. Configure state store backup to a durable location and monitor for corruption errors.
- **Transaction timeout**: Long-running transactions abort after `transaction.timeout.ms` (default 60000ms). Increase for long window operations, but keep reasonably bounded.
- **Mixed delivery semantics in same pipeline**: Combining at-least-once and exactly-once consumers in the same consumer group can cause offset conflicts. Keep all consumers in a group at the same semantic level.
