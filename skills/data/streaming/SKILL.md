---
name: data-streaming
description: >
  Use this skill when asked about streaming, Kafka, Flink, Kinesis, stream processing, event stream, real-time, CDC, change data capture, message queue, or stream architecture. This skill enforces: Kafka topic design with partitioning strategy, Flink/ksqlDB stream processing with exactly-once semantics, Schema Registry with Avro/Protobuf, CDC integration with Debezium, and reliability guarantees. Do NOT use for: batch ETL pipelines, API design, or standard message queues (RabbitMQ task queues).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, streaming, phase-10]
---

# Data Streaming

## Purpose
Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees.

## Agent Protocol

### Trigger
Exact user phrases: "streaming", "Kafka", "Flink", "Kinesis", "stream processing", "event stream", "real-time", "CDC", "change data capture", "message queue", "stream architecture", "Kafka topic", "Kafka consumer", "stream processing pipeline", "exactly-once", "schema registry", "Avro", "Debezium", "ksqlDB".

### Input Context
Before activating, verify:
- Streaming platform (Kafka, Kinesis, Pulsar)
- Processing framework (Flink, Kafka Streams, ksqlDB, Spark Streaming)
- Source systems (database CDC, application events, IoT, logs)
- Target systems (warehouse, lake, search index, cache)
- Throughput and latency requirements

### Output Artifact
Streaming pipeline design with topic model, processing logic, reliability config as YAML and SQL.

### Response Format
```yaml
# Topic topology
# Partition strategy
# Consumer group config
```
```sql
-- ksqlDB query
```
```java
// Flink job skeleton
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Topic model defined with partition count and retention
- [ ] Schema Registry configured with evolution rules
- [ ] Stream processing job with exactly-once semantics
- [ ] CDC pipeline from source database configured
- [ ] Error handling with DLQ defined
- [ ] Monitoring and lag alerting configured

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Topic Architecture
Naming: `<source>.<event-type>.<version>` — `orders.created.v1`. Partition count: N * (desired throughput / single partition throughput). Partitions per topic: 6-12 per broker for balance. Replication factor: 3 for production, 1 for dev. Retention: 7 days default, 30 days for audit events, infinite for compacted topics. Compacted topics for keyed state (customer profile, inventory counts).

### Step 2: Schema Registry
Avro: default schema format — rich type system, schema evolution, compatibility checks. Protobuf: for gRPC integration, cross-language. Schema evolution: backward (default — new schema can read old data), forward (old schema can read new data), full (both). Compatibility rules: never remove fields, add optional fields for backward, use default values. Schema ID in message header for wire efficiency.

### Step 3: Stream Processing
Flink: for complex stateful processing, windowing, multi-stream joins. Kafka Streams: for simple transformations, KTable joins, state stores. ksqlDB: for SQL-based streaming, materialized views. Exactly-once semantics: set `processing.guarantee=exactly_once_v2` (Flink), `enable.idempotence=true` + `isolation.level=read_committed` (Kafka consumer). State: RocksDB for large state, Heap for low-latency.

### Step 4: Windowing and Joins
Tumbling: fixed non-overlapping windows (hourly aggregates). Hopping: overlapping windows (rolling 10-min averages). Sliding: gap-less continuous windows (trending detection). Session: activity-based windows (user sessionization). Joins: stream-stream (KStream-KStream), stream-table (KStream-KTable for enrichment), table-table (KTable-KTable for materialized views). Grace period: allow late events up to watermark + 5 min.

### Step 5: CDC Integration
Debezium: capture row-level changes from PostgreSQL, MySQL, MongoDB, SQL Server. Architecture: DB → Debezium connector → Kafka topic → Flink/ksqlDB → target. Snapshot: initial snapshot + continuous streaming. Transformations: extract new/old state, convert to Avro, route to domain topics. Handling: schema changes (Debezium evolves with DB), large transactions (chunked), DDL events (separate topic).

### Step 6: Monitoring and Reliability
Metrics: consumer lag (critical — lag > 1000 messages), record processing rate, error rate, state size. Alerts: lag > threshold for >5 min, consumer group rebalance count > 10/hour, error rate > 1%. DLQ: unprocessable records sent to `<topic>.dlq` with original payload and error. Recovery: reprocess from earliest offset, reset to specific timestamp, skip bad records.

## Rules
- Exactly-once semantics for all critical streams
- Schema Registry with Avro, backward compatibility
- Partition count based on throughput, not convenience
- Consumer group lag monitored every 60 seconds
- DLQ for every processing step
- No production schema change without compatibility check
- Compacted topics for keyed state, delete retention for events
- Watermarks account for out-of-order events

## References
- `references/stream-architecture.md` — Kafka topics, partitions, replication, Schema Registry, Avro
- `references/stream-processing.md` — Flink, ksqlDB, exactly-once semantics, windowing, state management

## Handoff
`data-data-warehouse` for streaming data landing in the warehouse
`data-etl-pipeline` for batch processing of streamed data
