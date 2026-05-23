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

## Kafka Architecture

### Brokers and Clusters
A Kafka cluster consists of multiple brokers. Each broker is a server that stores topic partitions and serves produce/consume requests. Brokers are identified by a unique ID. A cluster typically has 3-7 brokers for production. Controller broker handles partition leadership and cluster metadata. Brokers should have sufficient disk (RAID 10, SSDs) and network bandwidth for the expected throughput.

### Topics and Partitions
A topic is a logical stream of messages. Each topic has multiple partitions for parallelism. Messages within a partition are ordered and assigned an offset. Partitions are distributed across brokers for fault tolerance. Partition count determines the maximum parallelism for consumers. Keyed messages go to the same partition (hash(key) % partition_count). Partitions are the unit of parallelism and replication.

### Replication and ISR
Each partition has a leader (handles all reads/writes) and followers (replicate from leader). In-Sync Replicas (ISR) are followers that are fully caught up with the leader. The `min.insync.replicas` config sets the minimum number of replicas that must acknowledge a write. `acks=all` means the leader waits for all in-sync replicas to acknowledge. If a follower falls behind (replication lag > `replica.lag.time.max.ms`), it is removed from the ISR.

### Consumer Group Rebalancing
A consumer group divides topic partitions among its members. When a consumer joins, leaves, or fails, the group rebalances. Eager rebalancing stops all consumers and reassigns all partitions (causes a pause). Cooperative rebalancing reassigns incrementally (minimal pause). Static group membership (`group.instance.id`) provides stable assignment across restarts. Monitor rebalance frequency — >10 rebalances per hour indicates instability.

## Kafka Streams/ksqlDB

### Kafka Streams
Kafka Streams is a lightweight library for stream processing within a Java application. It processes one record at a time. State stores provide fault-tolerant key-value state. Streams topology defines the processing DAG. Exactly-once semantics via `processing.guarantee=exactly_once_v2`. Kafka Streams is best for simple transformations, filtering, enrichment, and KTable joins within a single application.

### ksqlDB
ksqlDB provides a SQL interface to Kafka Streams. Create STREAM and TABLE definitions on Kafka topics. Use SQL to filter, join, aggregate, and materialize streams. Pull queries return a single result (like traditional SQL). Push queries continuously stream results. ksqlDB is best for teams that prefer SQL, rapid prototyping, and simple streaming ETL.

## Flink Streaming

### Event Time and Watermarks
Flink processes events based on event time (the time the event occurred) rather than processing time. Watermarks track the progress of event time — a watermark with timestamp T means no more events with event time < T will arrive. Watermarks handle out-of-order events. Set the watermark based on the maximum observed event latency. Lateness beyond the watermark is handled via allowed lateness and side outputs.

### Windowing
Tumbling windows are fixed-size, non-overlapping (hourly aggregates). Hopping windows are fixed-size, overlapping (rolling 10-min averages). Sliding windows are gap-less continuous windows (trending detection). Session windows group events by activity gap (user sessions). Each window type has specific use cases and performance characteristics.

### Checkpointing
Flink checkpoints save the job state for failure recovery. Checkpoints are triggered periodically (every 60s recommended). State is stored in a durable backend (RocksDB for large state, Heap for low-latency). Checkpoints enable exactly-once semantics by restoring to the last successful checkpoint on failure. Savepoints are manually triggered checkpoints used for job upgrades, scaling, and maintenance.

### Partitioning Strategy
Choose partition count based on desired throughput: partitions = desired_throughput / single_partition_throughput. Key-based partitioning ensures order per key. Round-robin distributes load evenly. Partition count affects parallelism — each partition is consumed by at most one consumer in a group. Too few partitions limits parallelism; too many increases overhead.

## Schema Registry

### Avro/Protobuf Schemas
Schema Registry stores and validates schemas for Kafka topics. Producers register schemas; consumers fetch schemas to deserialize. Schema ID is included in the message header for efficient wire format. Compatibility modes: BACKWARD (new schema reads old data), FORWARD (old schema reads new data), FULL (both directions), NONE (no checks). Default is BACKWARD compatibility.

### Schema Evolution Rules
Never remove fields. New fields must have defaults for backward compatibility. Use union types for optional fields. Document schema changes in the schema metadata. Evolve schemas in the registry before updating producers/consumers. Test schema changes against existing data before deploying.

## Streaming vs Batch Decision Guide

| Requirement | Use Streaming | Use Batch |
|---|---|---|
| Latency | Sub-second to minutes | Hours to days |
| Data volume | Continuous, unbounded | Fixed, bounded |
| Processing model | Event-at-a-time or micro-batch | Full dataset |
| State management | Required (windowed, keyed) | Not needed |
| Failure recovery | Checkpoint/savepoint | Re-run from start |
| Cost | Higher (always-on infra) | Lower (scheduled compute) |
| Use case | Real-time dashboards, alerts, CDC | Reports, ML training, backfill |

## Common Streaming Topology Patterns

### CDC Pipeline Pattern
```
Source DB → Debezium → Kafka Topic (raw CDC events) → Flink Transform → 
  Kafka Topic (cleaned events) → ksqlDB Materialized View → Sink (warehouse, cache, search)
```

### Event Sourcing Pattern
```
Producer → Kafka Topic (domain events) → Multiple Consumer Groups:
  ├── Group A: Flink → State Store → Materialized View
  ├── Group B: Kafka Streams → KTable → Join with other streams
  └── Group C: ksqlDB → Push Query → Real-time Dashboard
```

### Microservices Communication Pattern
```
Service A → Kafka Topic (command/event) → Service B
  ├── Service B processes event → Publishes result event
  └── Service A subscribes to result event → Reacts accordingly
```

### Log Aggregation Pattern
```
Application Instances → Kafka Topic (logs) → Flink → 
  ├── Elasticsearch (indexed logs)
  ├── S3 (archived logs)
  └── Alert System (error threshold detection)
```

## Kafka Topic Naming Convention Details

| Convention | Example | Description |
|---|---|---|
| Domain events | `orders.created.v1` | Business event |
| CDC events | `postgres.orders.orders` | Raw CDC from Debezium |
| Commands | `cmd.ship-order.v1` | Command request |
| DLQ | `orders.created.v1.dlq` | Failed messages |
| Compacted | `customer.profile.v1` | Latest state per key |
| Internal | `_orders-aggregation-state` | Application state store |

## Retention Policy Decision Guide

| Topic Type | Cleanup Policy | Retention | Example |
|---|---|---|---|
| Business events | delete | 7 days | `orders.created.v1` |
| CDC events | delete | 30 days | `postgres.orders.orders` |
| Audit events | delete | 365 days | `audit.access.v1` |
| Keyed state | compact | N/A (keep latest per key) | `customer.profile.v1` |
| DLQ | delete | 90 days | `orders.created.v1.dlq` |
| Logs | delete | 3 days | `app.logs.v1` |

## Partition Count Calculation Examples

| Scenario | Throughput/Sec | Msg Size | Recommended Partitions | Rationale |
|---|---|---|---|---|
| Order events | 500 msg/s | 2 KB | 6 | 500 * 2KB = 1MB/s, 3 partitions for headroom |
| Clickstream | 50000 msg/s | 500 B | 24 | 50000 * 500B = 25MB/s, need parallelism |
| IoT sensor data | 100000 msg/s | 100 B | 48 | 100000 * 100B = 10MB/s, high consumer parallelism |
| CDC from Postgres | 100 msg/s | 5 KB | 3 | Low volume, simple topology |
| Audit log | 2000 msg/s | 1 KB | 12 | Moderate volume, needs replay capability |

## Streaming SLA Targets

| Metric | Target | Alert Threshold | Measurement |
|---|---|---|---|
| End-to-end latency | < 1 second | > 5 seconds | Event creation to sink arrival |
| Consumer lag | < 100 | > 1000 | Difference between LEO and current offset |
| Checkpoint duration | < 30 seconds | > 60 seconds | Flink checkpoint metrics |
| Throughput per partition | < 5 MB/s | > 10 MB/s | JMX broker metrics |
| Error rate | < 0.1% | > 1% | Application metrics |
| Uptime | 99.99% | < 99.9% | Cluster and job health |

## Monitoring

### Consumer Lag
Consumer lag is the difference between the latest produced offset and the consumer's committed offset. High lag means the consumer is falling behind. Lag is the most critical streaming metric. Monitor lag every 60 seconds. Alert on lag > 1000 messages or lag growing steadily (indicates consumer cannot keep up).

### Key Metrics
Producer metrics: request rate, error rate, compression ratio, batch size. Consumer metrics: lag, poll rate, processing time, commit rate. Broker metrics: request rate, disk usage, network throughput, ISR count, under-replicated partitions. Flink metrics: checkpoint duration, state size, records processed per second, latency. All metrics should feed into a monitoring dashboard with alerts for anomalous values.

### Streaming Health Dashboard
```
Orders Streaming Pipeline
  ┌──────────────────────────────────────────┐
  │ Status: ✅ Healthy                        │
  │ End-to-end latency: 245ms                │
  │ Consumer lag: 23 (max 100)              │
  │ Throughput: 1,420 msg/s                  │
  │ Checkpoint: 12s (last successful: 12s ago)│
  │ Error rate: 0.02%                        │
  │ State size: 4.2 GB                       │
  └──────────────────────────────────────────┘
```

## Streaming Platform Ecosystem

### Apache Pulsar
Pulsar is a multi-tenant, high-throughput messaging platform with native geo-replication. Unlike Kafka, Pulsar separates serving (Brokers) from storage (Bookies via Apache BookKeeper), enabling elastic scaling without data rebalancing. Key features: segment-centric storage for unlimited log retention, tiered storage (offload to S3/GCS), built-in Pulsar Functions for lightweight processing, and native multi-tenancy. Topics are virtual and scale transparently. Use Pulsar for geo-distributed deployments, unlimited retention, or multi-tenant streaming.

### Redpanda
Redpanda is a Kafka-compatible streaming platform in C++ with a single binary (no ZooKeeper, no JVM). Achieves 10x lower latency and 6x higher throughput per node. Uses Raft-based consensus for HA, full Kafka API compatibility, and includes built-in Schema Registry, REST Proxy, and Connectors. Best for teams wanting Kafka compatibility with reduced ops overhead and lower TCO.

### Streaming Databases (Materialize, RisingWave)
Both provide incremental materialized views on streaming data using PostgreSQL-compatible SQL. Materialize updates results incrementally as new data arrives without re-running queries, with persistent storage and exactly-once semantics. RisingWave is cloud-native with decoupled compute-storage and object store persistence. Both support `CREATE MATERIALIZED VIEW` on streams, window functions, stream-table joins, and JDBC/PostgreSQL wire protocol. Choose Materialize for Kafka-native SQL with strong consistency; RisingWave for large-scale persistence with PG compatibility.

## Rules
- Exactly-once semantics for all critical streams
- Schema Registry with Avro, backward compatibility
- Partition count based on throughput, not convenience
- Consumer group lag monitored every 60 seconds
- DLQ for every processing step
- No production schema change without compatibility check
- Compacted topics for keyed state, delete retention for events
- Watermarks account for out-of-order events
- Alert on lag > 1000 or lag growing for 5+ minutes
- Set retention based on replay and audit requirements

## References
- `references/kafka-architecture.md` — Kafka topics, partitions, replication, Schema Registry, Avro/Protobuf, consumer groups, rebalancing, monitoring
- `references/flink-streaming.md` — Flink job structure, event time, watermarks, windowing, state management, checkpointing, exactly-once semantics, ksqlDB, CDC, monitoring
- `references/pulsar-patterns.md` — Pulsar broker/bookie separation, subscription types, geo-replication, tiered storage, Functions
- `references/streaming-databases.md` — Materialize incremental views, RisingWave cloud-native streaming SQL, stream-table joins

## Handoff
`data-data-warehouse` for streaming data landing in the warehouse
`data-etl-pipeline` for batch processing of streamed data
