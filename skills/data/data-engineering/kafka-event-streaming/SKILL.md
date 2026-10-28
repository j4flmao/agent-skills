---
name: data-kafka-event-streaming
description: >
  Use this skill when the user says 'kafka topic design', 'kafka partitions', 'kafka producer config', 'kafka consumer group', 'consumer lag', 'rebalance', 'kraft', 'kafka 4', 'exactly-once kafka', 'kafka retention', 'log compaction', 'kafka ordering'. Designs and operates Apache Kafka itself: topics, partitions and keys, producer durability, consumer groups and offsets, delivery semantics, retention/compaction and cluster sizing on KRaft. Do NOT use for: stream processing jobs with Flink/Kafka Streams/ksqlDB and CDC pipelines (data-streaming), Avro/Protobuf schema governance (data-schema-registry), RabbitMQ-style task queues (backend message-queue).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [data, kafka, event-streaming, kraft, consumer-groups, partitions]
---

# Apache Kafka Event Streaming

## Purpose
Kafka is a distributed, partitioned, replicated append-only log. Producers append records to topic partitions; consumers read at their own pace by offset; data is retained by time/size or compacted by key. Getting partitioning, durability settings and consumer offset handling right up front prevents most ordering bugs, data loss and lag incidents.

## Agent Protocol

### Trigger
"kafka", "topic design", "partitions", "partition key", "producer acks", "idempotent producer", "consumer group", "consumer lag", "rebalance", "offset commit", "kraft", "log compaction", "retention", "exactly-once".

### Input Context
- Event types, throughput (MB/s, msgs/s), message size, ordering requirements, retention needs.
- Kafka distribution and version (Apache Kafka, Confluent Platform/Cloud, Amazon MSK, Redpanda as API-compatible alternative), client languages.

### Output Artifact
Topic spec + producer/consumer configuration + operational checks. No file unless requested.

### Response Format
```
Topic: {name} partitions={n} RF={3} min.insync.replicas={2}
Key: {field} (ordering scope: {per entity})
Retention: {time/size | compact}
Producer: acks=all, idempotence on, {batching}
Consumer: group={id}, commit={strategy}, processing={idempotent how}
```

### Completion Criteria
- [ ] Ordering requirement mapped to a partition key.
- [ ] `replication.factor=3`, `min.insync.replicas=2`, `acks=all` for data that must not be lost.
- [ ] Consumers idempotent (at-least-once delivery assumed).
- [ ] Consumer lag monitored with alerts.

## Core Model
| Concept | Facts |
|---------|-------|
| Partition | Unit of ordering, parallelism and replication. Order is guaranteed only within a partition. |
| Key | Default partitioner hashes the key (murmur2) → same key, same partition (while partition count is unchanged). Null key → sticky batching across partitions. |
| Offset | Position of a record in a partition. Consumers commit offsets to the internal `__consumer_offsets` topic. |
| Replication | Each partition has a leader and followers; ISR = in-sync replicas. |
| Consumer group | Each partition is assigned to exactly one consumer in the group; consumers beyond the partition count sit idle. |
| KRaft | Kafka's built-in Raft metadata quorum. Kafka 4.0 (March 2025) removed ZooKeeper entirely; clusters must migrate to KRaft on 3.x first. |

## Topic Design
- Partition count: target throughput / per-partition throughput measured on your hardware, with headroom; also ≥ max consumer parallelism. Adding partitions later changes key→partition mapping (breaks per-key ordering for existing keys) and partitions cannot be reduced.
- Key by the entity whose events must stay ordered (`order_id`, `account_id`). Avoid low-cardinality or skewed keys (hot partitions).
- One event type per topic is the simplest default; group several types in one topic only when they need a shared order per key.
- Retention: `cleanup.policy=delete` with `retention.ms` for event streams; `cleanup.policy=compact` for changelog/"latest value per key" topics (tombstone = null value deletes a key).
- Name topics consistently, e.g. `<domain>.<entity>.<event>.v1`; disable `auto.create.topics.enable` in production.

```bash
kafka-topics.sh --bootstrap-server broker:9092 --create --topic payments.order.created.v1 \
  --partitions 12 --replication-factor 3 \
  --config min.insync.replicas=2 --config retention.ms=604800000
```

## Producer Durability
| Setting | Recommended | Why |
|---------|-------------|-----|
| `acks` | `all` (default since 3.0) | Leader waits for all in-sync replicas |
| `enable.idempotence` | `true` (default since 3.0) | Broker de-duplicates producer retries per partition |
| `delivery.timeout.ms` | default 120000 or per SLO | Upper bound for retries |
| `linger.ms` / `batch.size` | e.g. 5-20 ms / 64-256 KB | Larger batches, better throughput and compression |
| `compression.type` | `zstd` or `lz4` | Less network and disk |
With `min.insync.replicas=2` and RF 3, a write succeeds only when at least 2 replicas have it; one broker can fail without data loss or unavailability.

```java
Properties p = new Properties();
p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, System.getenv("KAFKA_BOOTSTRAP"));
p.put(ProducerConfig.ACKS_CONFIG, "all");
p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
p.put(ProducerConfig.LINGER_MS_CONFIG, 10);
p.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd");
p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
try (KafkaProducer<String, String> producer = new KafkaProducer<>(p)) {
    producer.send(new ProducerRecord<>("payments.order.created.v1", orderId, json), (meta, ex) -> {
        if (ex != null) {
            log.error("Failed to publish order {} to payments.order.created.v1", orderId, ex);
        }
    });
}
```

## Consumers and Delivery Semantics
- **At-most-once**: commit before processing (data loss on crash). Rarely acceptable.
- **At-least-once** (default choice): process, then commit (`enable.auto.commit=false`, commit after the batch). Duplicates on retry/rebalance → make processing idempotent (upsert by key, dedupe table of event ids).
- **Exactly-once within Kafka**: transactional producer (`transactional.id`) + consumers with `isolation.level=read_committed`, used by Kafka Streams with `processing.guarantee=exactly_once_v2`. It covers read-process-write from Kafka to Kafka; side effects in external systems still need idempotency or an outbox.

```python
import os

from confluent_kafka import Consumer, KafkaException

consumer = Consumer({
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "group.id": "billing-service",
    "enable.auto.commit": False,
    "auto.offset.reset": "earliest",
})
consumer.subscribe(["payments.order.created.v1"])
try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            raise KafkaException(msg.error())
        handle_idempotently(msg.key(), msg.value())   # upsert / dedupe by event id
        consumer.commit(message=msg, asynchronous=False)
finally:
    consumer.close()
```
Commit per message is simple but slow; commit per batch in high-throughput consumers.

## Rebalancing
- Kafka 4.0 made the new consumer group protocol (KIP-848, `group.protocol=consumer`) generally available: the broker computes assignments incrementally, avoiding stop-the-world rebalances. With the classic protocol, use the cooperative-sticky assignor.
- Keep processing per poll shorter than `max.poll.interval.ms`, or the consumer is removed from the group.
- Use static membership (`group.instance.id`) to avoid rebalances on rolling restarts.
- Share groups ("queues for Kafka", KIP-932) add queue-style consumption where multiple consumers share a partition; check feature status in your Kafka version before relying on it.

## Dead Letters and Retries
Kafka has no built-in DLQ for plain consumers. Pattern: on non-retryable errors, publish the record plus error metadata to `<topic>.dlq` and commit; for retryable errors, retry with backoff in place or via delayed retry topics. Kafka Connect has built-in `errors.deadletterqueue.topic.name`.

## Operations
```bash
kafka-consumer-groups.sh --bootstrap-server broker:9092 --describe --group billing-service   # lag per partition
kafka-topics.sh --bootstrap-server broker:9092 --describe --under-replicated-partitions
```
Alert on: consumer lag (growing, not absolute), under-replicated partitions, offline partitions, ISR shrink rate, request latency, disk usage per broker.

## Anti-Patterns
- `acks=1` or `min.insync.replicas=1` for financial or order data.
- Assuming global ordering across partitions.
- Auto-commit with slow processing (commits records not yet processed → loss on crash).
- Very large messages (> ~1 MB): store the payload in object storage and send a reference.
- Thousands of tiny topics/partitions per broker without capacity testing.
- Using Kafka as a request/response RPC transport.

## References
- Related skills: `../../streaming/SKILL.md` (stream processing, CDC), `../../schema-registry/SKILL.md`, `../data-lake-architecture/SKILL.md`.
- Apache Kafka documentation (producer/consumer configs, KRaft, upgrade notes for 4.x); KIP-848; KIP-932.
