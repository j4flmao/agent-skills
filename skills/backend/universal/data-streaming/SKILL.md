---
name: backend-data-streaming
description: >
  Use this skill when the user says 'data streaming', 'kafka architecture', 'stream processing', 'flink job', 'kafka streams', 'exactly once', 'watermarks', 'windowed aggregation', 'consumer lag', 'log compaction'. Designs backend streaming pipelines on Kafka (or compatible logs) with Flink or Kafka Streams: partitioning, consumer groups, offset/commit strategy, stateful processing, event time and watermarks, and exactly-once configuration. Do NOT use for: simple pub/sub between services (backend-event-driven-architecture), broker selection for task queues (backend-message-queue), analytics warehouse/lakehouse pipelines (data-streaming in skills/data).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [backend, streaming, kafka, flink, kafka-streams, exactly-once]
---

# Data Streaming Architecture

## Purpose
Build pipelines that process continuous event streams with predictable latency and correct results under failures, late data and redelivery. Covers Kafka topic design, consumer scaling, processing semantics, and stateful stream processing with Flink or Kafka Streams.

## Agent Protocol

### Trigger
Exact user phrases: "data streaming", "kafka architecture", "stream processing", "flink job", "kafka streams", "exactly once", "watermarks", "windowed aggregation", "consumer lag", "log compaction".

### Input Context
- Event sources, volume (events/s, bytes/s), and latency target.
- Ordering and correctness needs (approximate OK vs exact counts, money).
- Processing engine in use or allowed (Flink, Kafka Streams, Spark Structured Streaming, plain consumers).
- Sinks (DB, search index, another topic, warehouse).

### Output Artifact
Pipeline diagram, topic/partition plan, producer/consumer/processor config, and processing code. No files unless requested.

### Response Format
```
Pipeline: {source} -> {topic(partitions, RF)} -> {processor} -> {sink}
Key: {partition key}   Ordering: per key
Semantics: {at-least-once + idempotent sink | exactly-once (transactions)}
Time: {event time, watermark = max_ts - {lateness}} Window: {tumbling/sliding/session, size}
State: {store/backend, TTL}   Checkpoint: {interval}
```

## Kafka Fundamentals That Drive Design

| Concept | Rule |
|---|---|
| Partition | Unit of ordering and parallelism. Order is only guaranteed within a partition |
| Key | Same key -> same partition (default hash partitioner), so key by the entity whose order matters |
| Consumer group | Each partition is consumed by at most one member of a group; members beyond the partition count sit idle |
| Partition count | Can be increased but not decreased; increasing remaps keys, breaking per-key order for in-flight data. Size for future peak |
| Retention | Time/size-based delete, or `cleanup.policy=compact` to keep the latest value per key (changelogs, state rebuild). Tombstone = null value deletes a key |
| Replication | `replication.factor=3` with `min.insync.replicas=2` and producer `acks=all` survives one broker loss without data loss |
| Metadata | Kafka 4.x runs only in KRaft mode; ZooKeeper is gone |

## Offset Commit Strategy

| Strategy | Config | Result |
|---|---|---|
| Auto commit | `enable.auto.commit=true` (periodic, `auto.commit.interval.ms`) | Commits on a timer regardless of processing: crash can lose (committed but unprocessed) or duplicate messages |
| Commit after processing | auto commit off, commit after handler succeeds | At-least-once: duplicates on crash/rebalance, no loss |
| Transactional read-process-write | Kafka transactions, consumer `isolation.level=read_committed` | Exactly-once for Kafka-to-Kafka |
| Store offsets with results | Save offset in the sink DB in the same transaction; seek on startup | Exactly-once into that DB |

Default recommendation: at-least-once plus an idempotent sink (upsert by key, dedupe table on event ID). Reach for transactions only for Kafka-to-Kafka processing where duplicates matter.

## Exactly-Once Configuration

Producer side (transactional):
```properties
enable.idempotence=true
acks=all
transactional.id=orders-enricher-0   # stable per producer instance
```
Consumer side:
```properties
isolation.level=read_committed
enable.auto.commit=false
```
Kafka Streams: `processing.guarantee=exactly_once_v2` (requires brokers 2.5+). Flink: checkpointing enabled plus `KafkaSink` with `DeliveryGuarantee.EXACTLY_ONCE` and a `transactionalIdPrefix`; downstream consumers must read with `read_committed`, and output becomes visible only when a checkpoint completes (latency is at least the checkpoint interval).

Exactly-once never extends to external side effects (emails, HTTP calls) automatically; those need idempotency keys.

## Event Time, Watermarks and Windows
- **Event time** = when it happened (timestamp in the event); **processing time** = when the operator sees it. Use event time for correctness under replay and lag.
- A **watermark** asserts "no more events with timestamp < T are expected". Bounded-out-of-orderness watermark: `max_seen_ts - allowed_lateness`.
- Windows fire when the watermark passes the window end. Late events beyond allowed lateness are dropped or sent to a side output.
- Idle partitions hold back watermarks; configure idleness (`WatermarkStrategy.withIdleness`) in Flink.

```java
// Flink DataStream API: 1-minute tumbling revenue per merchant, event time.
WatermarkStrategy<Order> wm = WatermarkStrategy
    .<Order>forBoundedOutOfOrderness(Duration.ofSeconds(30))
    .withTimestampAssigner((order, ts) -> order.occurredAtMillis())
    .withIdleness(Duration.ofMinutes(1));

DataStream<Order> orders = env.fromSource(kafkaSource, wm, "orders");

orders
    .keyBy(Order::merchantId)
    .window(TumblingEventTimeWindows.of(Duration.ofMinutes(1)))
    .allowedLateness(Duration.ofMinutes(5))
    .sideOutputLateData(lateTag)
    .aggregate(new SumRevenue())
    .sinkTo(revenueSink);
```

## Stateful Processing

| Engine | State store | Fault tolerance | Fits when |
|---|---|---|---|
| Kafka Streams | Local RocksDB per task, backed by compacted changelog topics | Changelog restore; standby replicas speed recovery | Kafka-in/Kafka-out logic embedded in a JVM service |
| Flink | Heap or RocksDB state backend | Periodic checkpoints / savepoints to object storage | Complex event-time logic, large state, multiple sources/sinks |
| Spark Structured Streaming | State store in executors, checkpoint to storage | Micro-batch checkpoints | Teams already on Spark; seconds-level latency acceptable |

Rules:
- Set state TTL for keyed state that would otherwise grow forever (e.g. per-user sessions).
- Joins between two streams need a time bound (interval join) or state grows without limit.
- Take a savepoint before changing job topology; assign stable operator UIDs in Flink so state maps across versions.

## Throughput vs Latency Knobs

| Setting | Higher value gives |
|---|---|
| `linger.ms` | Bigger batches, better throughput, more latency |
| `batch.size` | Larger batches per partition |
| `compression.type` (`lz4`, `zstd`) | Less network/disk, some CPU |
| `fetch.min.bytes` / `fetch.max.wait.ms` | Fewer, larger fetches |
| `max.poll.records` | More records per poll; keep processing time under `max.poll.interval.ms` |
| Checkpoint interval (Flink) | Less overhead, longer replay on failure and higher EOS output latency |

## Operations
- Monitor consumer lag per partition (records and time), not only total.
- Alert on under-replicated partitions, ISR shrink, and rebalance frequency.
- Use cooperative rebalancing (`partition.assignment.strategy=CooperativeStickyAssignor`) or the new consumer group protocol (`group.protocol=consumer`, KIP-848) to avoid stop-the-world rebalances.
- Schema registry with BACKWARD compatibility for every topic.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Processing time windows for business metrics | Event time + watermarks |
| Unkeyed messages where order matters | Key by entity ID |
| One partition "to keep order" for the whole topic | Order per key; partition for parallelism |
| Long blocking calls in poll loop -> rebalances | Async with bounded in-flight, or raise `max.poll.interval.ms` deliberately |
| Unbounded state in joins | Interval joins, TTL |
| Claiming exactly-once with a non-transactional sink | Idempotent upserts or two-phase commit sink |

## Checklist
- [ ] Partition key and count sized for peak and ordering.
- [ ] RF=3, `min.insync.replicas=2`, `acks=all` for critical topics.
- [ ] Commit strategy and sink idempotency documented.
- [ ] Event-time watermarks, allowed lateness and late-data handling defined.
- [ ] State TTL and checkpoint/savepoint procedure in place.
- [ ] Lag, throughput and DLQ/late-data metrics alerting.

## References
- [Streaming fundamentals](references/streaming-fundamentals.md)
- [Streaming architecture](references/streaming-architecture.md)
- [Streaming patterns](references/streaming-patterns.md)
- [Exactly-once semantics](references/exactly-once.md)
- [Streaming operations](references/streaming-operations.md)
- [Streaming security](references/streaming-security.md)
- [Streaming testing](references/streaming-testing.md)
