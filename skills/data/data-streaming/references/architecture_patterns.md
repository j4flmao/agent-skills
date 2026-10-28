# Streaming Architecture Patterns

Reference architectures and design patterns for event streaming systems built on Kafka (or compatible logs such as Redpanda, Amazon MSK, Confluent Cloud) with processing in Kafka Streams, Flink, or Spark Structured Streaming.

## Kappa vs Lambda

| Aspect | Lambda | Kappa |
|--------|--------|-------|
| Paths | Batch + speed layers merged at query time | Single streaming path; reprocess by replaying the log |
| Code | Two implementations of the same logic | One implementation |
| Reprocessing | Rerun batch | Replay from retained or tiered log into a new job/version |
| Fit | Legacy batch estates, very large historical recomputes | Most new event-driven platforms |

Kappa requires log retention (or tiered storage / lakehouse copy) long enough to rebuild state.

## Core Building Blocks

```
Sources (apps, CDC, IoT)
   → Ingestion (producers, Kafka Connect, Debezium)
   → Event log (Kafka topics, schema registry)
   → Processing (Flink / Kafka Streams / Spark)
   → Serving (OLAP stores, search, caches, lakehouse tables, downstream topics)
```

## Pattern: Change Data Capture (CDC)

Capture row-level changes from a database's transaction log (Debezium for PostgreSQL, MySQL, SQL Server, Oracle, MongoDB) into Kafka.

- No dual writes from application code; the DB log is the source of truth.
- Combine with the transactional outbox: the app writes business rows plus an `outbox` row in one transaction; Debezium's outbox event router publishes clean domain events.
- Initial snapshot + streaming changes; plan snapshot load on the source DB.

## Pattern: Stream-Table Duality

- A stream of changes keyed by ID materializes into a table (latest value per key).
- A table's changelog is a stream.
- Use compacted topics (`cleanup.policy=compact`) for entity state topics so the latest value per key is retained indefinitely.

## Pattern: Enrichment Joins

| Join | Use | State |
|------|-----|-------|
| Stream–table (KStream–KTable, Flink lookup/temporal join) | Enrich events with current reference data | Table state |
| Stream–stream (windowed) | Correlate two event streams within a time window (order ↔ payment) | Both sides buffered for the window |
| Temporal (versioned) join | Enrich with the value valid at event time | Versioned table state |
| Lookup to external DB | Rarely changing data too large for state | Cache + async I/O |

Co-partition join inputs (same key, same partition count) in Kafka Streams; repartition otherwise.

## Pattern: Windowed Aggregation

| Window | Definition | Example |
|--------|-----------|---------|
| Tumbling | Fixed, non-overlapping | Per-minute counts |
| Hopping/sliding | Fixed size, overlapping | 5-minute window every 1 minute |
| Session | Gap-based per key | User sessions with 30-minute inactivity |
| Cumulative | Growing within a period | Daily running totals updated every minute |

Use event time with watermarks; define allowed lateness and what to do with late events (drop, side output, correction records).

```sql
-- Flink SQL: per-minute revenue with event-time watermark
CREATE TABLE orders (
  order_id STRING, amount DECIMAL(12,2), ts TIMESTAMP(3),
  WATERMARK FOR ts AS ts - INTERVAL '30' SECOND
) WITH ('connector' = 'kafka', 'topic' = 'orders', 'format' = 'avro-confluent',
        'properties.bootstrap.servers' = 'kafka:9092',
        'avro-confluent.url' = 'http://schema-registry:8081',
        'scan.startup.mode' = 'earliest-offset');

SELECT window_start, window_end, SUM(amount) AS revenue
FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(ts), INTERVAL '1' MINUTE))
GROUP BY window_start, window_end;
```

## Pattern: Event Sourcing with a Log

- Aggregates persisted as event sequences; Kafka can distribute events but is not ideal as the primary event store for per-aggregate reads (no efficient read-by-aggregate-ID, no optimistic concurrency per stream).
- Common hybrid: event store or DB as source of truth, Kafka for distribution and projections.

## Pattern: Dead-Letter and Retry Topics

```
orders → processor ──fail (retriable)──► orders.retry.1m → orders.retry.10m
                   └─fail (poison)─────► orders.dlq (with error headers)
```

- Do not block a partition forever on one bad record.
- Retry topics break per-key ordering; use only when ordering for that key does not matter, or pause the key.
- Record original topic, partition, offset, exception class, and message in headers.

## Pattern: Streaming into the Lakehouse

- Sink topics to Apache Iceberg/Delta/Hudi tables via Kafka Connect sinks, Flink, or Spark; commit at checkpoint boundaries for exactly-once file commits.
- Compact small files regularly; streaming writes create many small files.
- Some platforms expose topics directly as tables (e.g. Iceberg-backed topic features in managed services); verify maturity before relying on them.

## Topic Design

| Decision | Guidance |
|----------|----------|
| Granularity | One topic per event type or per aggregate type; avoid one mega-topic of mixed schemas unless using schema references deliberately |
| Key | Entity ID that needs ordering (order ID, account ID) |
| Partitions | Sized for target consumer parallelism and throughput; increasing later changes key→partition mapping |
| Naming | `<domain>.<entity>.<event>.v<n>`, e.g. `billing.invoice.issued.v1` |
| Retention | Time-based for events; compaction for state; tiered storage for long replay windows |
| Schema | Avro/Protobuf/JSON Schema with registry and compatibility mode (BACKWARD typical) |

## Delivery Semantics End to End

| Hop | How to get effectively-once |
|-----|----------------------------|
| Producer → Kafka | Idempotent producer |
| Kafka → Kafka processing | Transactions / EOS v2, Flink two-phase commit sink |
| Kafka → DB | Upsert by natural key, or store processed offsets in the same DB transaction |
| Kafka → external API | Idempotency keys on the API |

## Anti-Patterns

- Using Kafka as a request/response RPC bus with tight latency requirements.
- Huge messages (MBs) instead of claim-check (store payload in object storage, send a reference).
- Global ordering requirements forcing a single partition.
- Processing-time windows for business metrics that must be correct under replay.
- Consumers sharing a group ID across unrelated applications.

## Checklist

- [ ] Event log as the integration backbone; CDC/outbox instead of dual writes
- [ ] Keys chosen for ordering; partition counts planned
- [ ] Event-time processing with watermarks and late-data policy
- [ ] DLQ and retry strategy defined per consumer
- [ ] End-to-end delivery semantics documented per sink
- [ ] Retention long enough for reprocessing
