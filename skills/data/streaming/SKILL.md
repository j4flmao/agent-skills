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
- Data volume and retention requirements
- Security and compliance needs
- Team expertise with streaming technologies

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
- [ ] Security configured (TLS, auth, ACLs)
- [ ] Data retention and compaction strategy defined

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

### Exactly-Once Semantics in Kafka

#### Producer Semantics
acks=0: fire-and-forget, no acknowledgment, possible data loss. acks=1: leader acknowledges, possible leader failover loss. acks=all (with min.insync.replicas): leader + ISR acknowledge, no loss. Enable `enable.idempotence=true` to prevent duplicate produces within a session. Set `transactional.id` for exactly-once across partitions.

#### Consumer Semantics
At-most-once: commit offset before processing (message may be lost on failure). At-least-once: commit offset after processing (message may be reprocessed on failure). Exactly-once: process and commit offset atomically via transactional API. Use `isolation.level=read_committed` to only read committed messages. Combine with idempotent sinks (upsert, idempotent operations) for pragmatic exactly-once.

#### Transactional API
```java
producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(record1);
    producer.send(record2);
    producer.sendOffsetsToTransaction(offsets, consumerGroup);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

## Kafka Streams / ksqlDB

### Kafka Streams
Kafka Streams is a lightweight library for stream processing within a Java application. It processes one record at a time. State stores provide fault-tolerant key-value state. Streams topology defines the processing DAG. Exactly-once semantics via `processing.guarantee=exactly_once_v2`. Kafka Streams is best for simple transformations, filtering, enrichment, and KTable joins within a single application.

#### Kafka Streams Topology Components
Source processor: reads from input topics. Stream processor: transforms, filters, maps data. Stateful processor: maintains state (aggregations, joins, windowing). Sink processor: writes to output topics. GlobalKTable broadcast tables: for enrichment with reference data that fits in memory. KTable changelog topics: for materialized state backed by compacted topics.

```java
StreamsBuilder builder = new StreamsBuilder();
KStream<String, Order> orders = builder.stream("orders", Consumed.with(Serdes.String(), orderSerde));

KTable<String, Customer> customers = builder.table("customers", Consumed.with(Serdes.String(), customerSerde));

orders.join(customers, (order, customer) -> {
    order.setCustomerName(customer.getName());
    return order;
}).filter((key, order) -> order.getAmount() > 100)
  .to("enriched-orders", Produced.with(Serdes.String(), orderSerde));
```

### ksqlDB
ksqlDB provides a SQL interface to Kafka Streams. Create STREAM and TABLE definitions on Kafka topics. Use SQL to filter, join, aggregate, and materialize streams. Pull queries return a single result (like traditional SQL). Push queries continuously stream results. ksqlDB is best for teams that prefer SQL, rapid prototyping, and simple streaming ETL.

```sql
-- Define streams and tables
CREATE STREAM orders (
    order_id VARCHAR KEY,
    customer_id VARCHAR,
    amount DOUBLE,
    product VARCHAR
) WITH (KAFKA_TOPIC='orders', VALUE_FORMAT='AVRO');

CREATE TABLE customers (
    customer_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    email VARCHAR
) WITH (KAFKA_TOPIC='customers', VALUE_FORMAT='AVRO', KEY='customer_id');

-- Enrich and aggregate
CREATE STREAM enriched_orders AS
    SELECT o.order_id, c.name, o.amount, o.product
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id;

CREATE TABLE daily_sales AS
    SELECT product, SUM(amount) AS total_sales, COUNT(*) AS order_count
    FROM orders WINDOW TUMBLING (SIZE 1 DAY)
    GROUP BY product
    EMIT CHANGES;
```

## Flink Streaming

### Event Time and Watermarks
Flink processes events based on event time (the time the event occurred) rather than processing time. Watermarks track the progress of event time — a watermark with timestamp T means no more events with event time < T will arrive. Watermarks handle out-of-order events. Set the watermark based on the maximum observed event latency. Lateness beyond the watermark is handled via allowed lateness and side outputs.

#### Watermark Strategies
Periodic watermarks: emitted at configurable intervals based on observed event timestamps (BoundedOutOfOrdernessTimestampExtractor). Punctuated watermarks: emitted per event when certain conditions are met. Ideal watermark strategy: watermark = max_observed_timestamp - expected_lateness. Set expected_lateness based on source-system SLAs and observed behavior.

```java
DataStream<Order> orders = env
    .addSource(kafkaConsumer)
    .assignTimestampsAndWatermarks(
        WatermarkStrategy.<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
            .withTimestampAssigner((event, timestamp) -> event.getEventTime())
    );
```

### Windowing
Tumbling windows: fixed-size, non-overlapping — `window(TumblingProcessingTimeWindows.of(Time.hours(1)))`. Hopping windows: fixed-size, overlapping — `window(SlidingProcessingTimeWindows.of(Time.minutes(10), Time.minutes(5)))` (window size 10 min, slide 5 min). Session windows: group events by activity gap — `window(ProcessingTimeSessionWindows.withGap(Time.minutes(30)))`. Sliding windows: gap-less continuous windows for trending. Each window type has specific use cases and performance characteristics.

### Checkpointing
Flink checkpoints save the job state for failure recovery. Checkpoints are triggered periodically (every 60s recommended). State is stored in a durable backend (RocksDB for large state, Heap for low-latency). Checkpoints enable exactly-once semantics by restoring to the last successful checkpoint on failure. Savepoints are manually triggered checkpoints used for job upgrades, scaling, and maintenance.

```yaml
# Flink config for exactly-once with checkpointing
state.backend: rocksdb
state.checkpoints.dir: s3://flink-checkpoints/job-name
state.checkpoints.num-retained: 5
execution.checkpointing.interval: 60s
execution.checkpointing.min-pause: 30s
execution.checkpointing.tolerable-failed-checkpoints: 3
execution.checkpointing.timeout: 10min
execution.checkpointing.mode: EXACTLY_ONCE

# Unaligned checkpoints for high-throughput jobs
execution.checkpointing.unaligned: true
execution.checkpointing.unaligned.max-buffers: 100
```

### Partitioning Strategy
Choose partition count based on desired throughput: partitions = desired_throughput / single_partition_throughput. Key-based partitioning ensures order per key. Round-robin distributes load evenly. Partition count affects parallelism — each partition is consumed by at most one consumer in a group. Too few partitions limits parallelism; too many increases overhead. Rebalancing partitions later is operationally expensive — plan upfront.

## Schema Registry

### Avro / Protobuf Schemas
Schema Registry stores and validates schemas for Kafka topics. Producers register schemas; consumers fetch schemas to deserialize. Schema ID is included in the message header for efficient wire format. Compatibility modes: BACKWARD (new schema reads old data — default), FORWARD (old schema reads new data), FULL (both directions), NONE (no checks).

```json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.events",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "total_amount", "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "OrderItem",
      "fields": [
        {"name": "product_id", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "unit_price", "type": "double"}
      ]
    }}}
  ]
}
```

### Schema Evolution Rules
Never remove fields. New fields must have defaults for backward compatibility. Use union types for optional fields: `["null", "string"]`. Document schema changes in the schema metadata. Evolve schemas in the registry before updating producers/consumers. Test schema changes against existing data before deploying. Use logical types for precise semantics (decimal, date, timestamp-millis).

## Streaming Sources and Sinks

### Source Connectors

| Source Type | Tool | Configuration Key |
|---|---|---|
| Database CDC | Debezium | `connector.class=io.debezium.connector.postgresql.PostgresConnector` |
| Application events | Kafka Producer | Direct API |
| Log files | Filebeat/Logstash → Kafka | Filebeat Kafka output |
| IoT/MQTT | MQTT Proxy → Kafka | Custom connector or bridge |
| HTTP webhooks | Kafka Connect HTTP source | HTTP source connector |
| Change tracking | JDBC Source Connector | `mode=incrementing` or `timestamp` |

### Sink Connectors

| Sink Type | Tool | Configuration Key |
|---|---|---|
| Data warehouse | JDBC Sink, Snowflake Kafka Connector | Auto-create tables |
| Object storage | S3 Sink Connector | `format.class=io.confluent.connect.s3.format.parquet.ParquetFormat` |
| Search index | Elasticsearch Sink Connector | `transforms=ExtractTopic` |
| Cache | Redis Sink | Custom processor |
| Lakehouse | Delta/Iceberg Sink | `upsert=true` for CDC |

## CDC with Debezium

### Debezium Architecture
Debezium connects to database transaction logs (WAL for PostgreSQL, binlog for MySQL, redo log for Oracle, change feed for SQL Server). Emits each row change as a separate Kafka message. Handles schema changes, snapshots, and continuous streaming.

#### Debezium Message Structure
```json
{
  "op": "c",         // c=create, u=update, d=delete, r=snapshot
  "before": null,
  "after": {
    "id": 123,
    "name": "Alice",
    "email": "alice@example.com"
  },
  "source": {
    "db": "postgres",
    "table": "customers",
    "lsn": 12345678,
    "ts_ms": 1717200000000
  },
  "ts_ms": 1717200000100
}
```

#### Debezium Configuration

```json
{
  "name": "postgres-orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres-prod",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${POSTGRES_PASSWORD}",
    "database.dbname": "orders_db",
    "database.server.name": "postgres",
    "table.include.list": "public.orders,public.customers",
    "plugin.name": "pgoutput",
    "publication.name": "debezium_pub",
    "publication.autocreate.mode": "filtered",
    "slot.name": "debezium_slot",
    "tombstones.on.delete": "false",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "schema.registry.url": "http://schema-registry:8081",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState"
  }
}
```

## Error Handling Patterns

### Dead Letter Queue (DLQ)
Every processing step routes failures to a DLQ. DLQ topics named `{source-topic}.dlq`. DLQ messages include original payload, error message, stack trace, and processing timestamp. DLQ monitored for growth and reviewed weekly. Backfill script reprocesses DLQ records after schema fix.

```yaml
topics:
  dlq: "orders.created.v1.dlq"
  dlq_config:
    partitions: 3
    replication: 3
    retention: 90d
    cleanup.policy: delete
```

### Deserialization Error Handling
```java
// Flink: side output for deserialization errors
OutputTag<String> deserializationErrors = new OutputTag<String>("deserialization-errors") {};

DataStream<Order> validOrders = kafkaSource
    .process(new DeserializeWithErrorHandling(deserializationErrors));

validOrders.getSideOutput(deserializationErrors)
    .addSink(new KafkaSink<String>(dlqTopic));
```

### Retry Strategy
Retryable: connection timeout, rate limit, lock wait, temporary error. Non-retryable: schema mismatch, data validation, permission denied. Retry strategy: exponential backoff (1s, 2s, 4s, 8s, 16s) up to 5 attempts. Circuit breaker after 5 consecutive failures on same partition. Use Flink's built-in restart strategy: fixed delay or exponential delay.

## Ordering Guarantees

### Partition-Level Ordering
Messages within a partition are strictly ordered by offset. Key-based partitioning ensures related messages (same key) go to the same partition — guaranteeing order for that key. Without key, round-robin distribution provides no ordering guarantee across partitions. Consumer processes partitions in offset order.

### Global Ordering
Single partition topic = total ordering (but limits parallelism to 1). Partition key on all messages with same constant value = all messages in one partition (defeats parallelism). Practical approach: accept per-partition ordering, design consumers to handle out-of-order events by using event timestamps.

### Handling Out-of-Order Events in Processing
Buffer events in state store with configured grace period. Use event time processing with watermarks instead of processing time. Deduplicate by event ID with sliding window state. Handle late events via side outputs for offline reconciliation.

## State Management

### State Store Types

| Store | Description | Best For |
|---|---|---|
| HashMapStateBackend | In-memory, fast, limited heap | Small state (< 1 GB), low-latency |
| RocksDBStateBackend | Disk-backed, large state | Large state (> 1 GB), moderate latency |
| FileSystemStateBackend | Checkpoints to FS | Development, testing |

### State TTL Configuration
```yaml
# Flink state TTL configuration
table.exec.state.ttl: 1h  # SQL API
# DataStream API
stateTtlConfig = StateTtlConfig
    .newBuilder(Time.hours(24))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .build();
```

### State Migration
State schema changes (e.g., adding a field to state) require savepoint-to-savepoint migration. Options: (1) stop job, apply migration on state, restart; (2) write migration logic in `ProcessFunction`; (3) start new job with fresh state and dual-read source. Prefer savepoint-based upgrade with schema evolution where possible.

## Testing Strategies

### Unit Testing
Test individual operators and functions with mock Kafka records. Use `TopologyTestDriver` for Kafka Streams, `TestHarness` for Flink processors. Verify: correct outputs for given inputs, side outputs for errors, state updates, watermark behavior.

### Integration Testing
Spin up Kafka + Schema Registry + processing engine via Testcontainers or docker-compose. Produce test events, consume results, assert correctness. Test: consumer group rebalancing, checkpointing and recovery (kill job, verify resume), schema evolution compatibility, exactly-once delivery.

### Performance Testing
Define throughput targets (msg/s, MB/s), latency SLAs (p50, p95, p99), and data loss tolerance. Test with production-scale data volume and partition count. Identify bottlenecks: CPU-bound (serialization, compression), memory-bound (state size, buffering), IO-bound (network, disk). Run for minimum 24 hours to detect long-term drift.

## Security

### Encryption
In-transit: TLS between all components (brokers, clients, ZooKeeper, Schema Registry). In-rest: disk encryption on broker storage. End-to-end: application-level encryption for sensitive fields using envelope encryption.

### Authentication
SSL client authentication: mutual TLS between clients and brokers. SASL/PLAIN: username/password (simple, needs TLS). SASL/SCRAM: salt-challenge authentication (recommended). SASL/GSSAPI (Kerberos): enterprise integration. SASL/OAUTHBEARER: OAuth2 token-based.

### Authorization
Kafka ACLs: `--allow-principal User:app1 --operation read --topic orders`. Topic-level: read, write, create, describe, alter. Consumer group-level: read, describe. Cluster-level: create topics, describe configs. Use prefix ACLs for topic patterns: `--topic orders.*`. Prefer RBAC via Apache Ranger for multi-team clusters.

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

### Fan-Out Pattern
```
Input Topic → Kafka Streams / Flink
  ├── Transform A → Topic A → Consumer Group A
  ├── Transform B → Topic B → Consumer Group B
  └── Transform C → Topic C → Consumer Group C
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
| Order events | 500 msg/s | 2 KB | 6 | 500 * 2KB = 1MB/s |
| Clickstream | 50000 msg/s | 500 B | 24 | 50000 * 500B = 25MB/s |
| IoT sensor data | 100000 msg/s | 100 B | 48 | 100000 * 100B = 10MB/s |
| CDC from Postgres | 100 msg/s | 5 KB | 3 | Low volume |
| Audit log | 2000 msg/s | 1 KB | 12 | Moderate volume |

## Streaming SLA Targets

| Metric | Target | Alert Threshold | Measurement |
|---|---|---|---|
| End-to-end latency | < 1 second | > 5 seconds | Event creation to sink arrival |
| Consumer lag | < 100 | > 1000 | Difference between LEO and current offset |
| Checkpoint duration | < 30 seconds | > 60 seconds | Flink checkpoint metrics |
| Throughput per partition | < 5 MB/s | > 10 MB/s | JMX broker metrics |
| Error rate | < 0.1% | > 1% | Application metrics |
| Uptime | 99.99% | < 99.9% | Cluster and job health |

## Streaming Anti-Patterns

### Topic Explosion
Creating a topic per event type per entity (hundreds of topics). Leads to ZK overhead, management chaos, partition imbalance. Fix: group related events into logical topics with type discriminator field.

### Missing Schema Validation
Producing/consuming raw JSON without Schema Registry. Inevitably leads to deserialization failures when schema changes. Fix: enforce Schema Registry with Avro/Protobuf and BACKWARD compatibility.

### Ignoring Offset Management
Auto-committing offsets with `enable.auto.commit=true` means processing state may not match committed offset. Fix: manual offset commits after processing complete, or use transactional API.

### Synchronous Processing in Consumers
Calling external APIs synchronously in consumer poll loop blocks the thread and causes rebalance timeouts. Fix: async processing with callbacks, or use a separate processing thread pool.

### Static Partition Count
Setting partition count once and never reviewing it. As throughput grows, partitions become a bottleneck. Fix: design for growth (start with 3x current needs) or use tiered storage (Pulsar) that abstracts partitions.

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
- Never auto-commit offsets in production
- Test checkpointing by simulating broker failures
- Monitor rebalance frequency as cluster health indicator
- Use TLS for all inter-component communication
- Every topic must have documented owner and retention policy

## References
  - references/flink-streaming.md — Flink Streaming
  - references/kafka-architecture.md — Kafka Architecture
  - references/pulsar-patterns.md — Apache Pulsar Patterns
  - references/streaming-architecture.md — Streaming Architecture
  - references/streaming-databases.md — Streaming Databases
  - references/streaming-monitoring.md — Streaming Monitoring
## Handoff
`data-data-warehouse` for streaming data landing in the warehouse
`data-etl-pipeline` for batch processing of streamed data
