# Kafka Patterns

## Core Concepts
```
Topic:                    Named log of events
Partition:                Ordered, immutable sequence of records
Offset:                   Unique position within a partition
Consumer group:           Set of consumers sharing work
Broker:                   Kafka server node
Replication factor:       Number of copies per partition
```

## Topic Design
```yaml
Topic: user.events.v1
Partitions:    6          (at least = max expected consumers)
Replication:   3          (min 2 for production, 3 for HA)
Retention:     7 days     (or: 10 GB per partition)
Cleanup policy: delete    (or: compact for last-value semantics)
```

### Partition Count Rules
```
partition_count = max(throughput_needed / single_partition_throughput, max_consumers)
single_partition_throughput ~ 10-20 MB/s (baseline, varies with hardware)

Example:
  Expected throughput: 50 MB/s
  Single partition: 10 MB/s
  Partitions needed: 5
  Max consumers: 10
  => partition_count = max(5, 10) = 10
```

### Key-Based Partitioning
```
Messages with same key → same partition → ordered processing.

Keys:
  user_id       → all events for a user are ordered
  order_id      → all events for an order are ordered
  null          → round-robin (no ordering guarantee)

Key design principle:
  Partition by the entity that needs ordering.
  Too many unique keys → too many partitions → overhead.
```

## Producer Patterns

### Idempotent Producer
```properties
enable.idempotence=true
acks=all
max.in.flight.requests.per.connection=5
```
Eliminates duplicates from producer retries. Required for exactly-once.

### Transactional Producer
```properties
enable.idempotence=true
transactional.id=user-service-${instanceId}
```
Used for exactly-once semantics across partitions.

### Async Producer with Callback
```java
producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        log.error("Failed to send", exception);
        // retry or DLQ
    }
});
```

## Consumer Patterns

### Consumer Group
```
topic: user.events.v1 (6 partitions)

Consumer group: user-processor
  3 consumers  → each handles 2 partitions (even distribution)
  6 consumers  → each handles 1 partition (1:1)
  10 consumers → 6 active, 4 idle (can't exceed partition count)
```

### Committing Offsets
```java
// At-least-once (recommended)
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        process(record);  // process BEFORE committing
    }
    consumer.commitSync();  // commit after successful batch
}

// Never commit before processing — message loss on crash.
```

### Seek / Replay
```java
// Rewind to beginning
consumer.seekToBeginning(partition);

// Rewind to specific offset
consumer.seek(partition, offset);

// Rewind by time
Map<TopicPartition, OffsetAndTimestamp> timestamps = consumer.offsetsForTimes(...);
```

### Error Handling with Retry Topic
```
Main topic: user.events.v1
Retry topic: user.events.v1.retry (delay: 10s, 30s, 60s)
DLQ topic: user.events.v1.dlq

Flow:
  1. Consumer reads from main topic
  2. On processing failure → produce to retry topic with delay
  3. Retry consumer reads from retry topic after delay
  4. On retry failure → produce to next retry topic or DLQ
  5. DLQ messages: manual intervention or alert
```

## Exactly-Once Semantics

### Kafka Streams - Exactly Once
```properties
processing.guarantee=exactly_once_v2
```
Kafka Streams handles the transaction coordination automatically.

### Producer → Consumer
```
Idempotent producer + transactional producer + read_committed consumer.

Consumer config:
  isolation.level=read_committed
```

## Monitoring
```
Key metrics:
  - request-latency-avg
  - consumer-lag (by consumer group)
  - under-replicated-partitions
  - offline-partitions-count
  - produce-request-rate
  - bytes-in / bytes-out
```
