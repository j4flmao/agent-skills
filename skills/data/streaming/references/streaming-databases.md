# Streaming Databases

## Materialize

### Architecture
Materialize is a streaming SQL database that maintains materialized views incrementally. It uses:
- **Timely Dataflow** (Rust) for incremental computation
- **Differential Dataflow** for efficient incremental updates (set-based)
- **Persistent storage** via PostgreSQL-backed catalog + object store for data

### Key Concepts
- **Source**: streaming data from Kafka, Postgres CDC, or file
- **Materialized View**: maintained incrementally as new data arrives
- **Sink**: send changes from a materialized view back to Kafka
- **Cluster**: compute resources running dataflows (can scale independently)
- **Index**: in-memory arrangement for fast point lookups (materialize an index for sub-ms queries)

### Setup and Usage
```sql
-- Create a Kafka source
CREATE SOURCE orders_source
FROM KAFKA BROKER 'kafka:9092' TOPIC 'orders'
FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:8081';

-- Non-materialized (for streaming SQL exploration)
CREATE VIEW recent_orders AS
SELECT order_id, customer_id, total_amount, created_at
FROM orders_source
WHERE created_at > mz_now() - INTERVAL '1 hour';

-- Materialized (maintained incrementally)
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
  date_trunc('day', created_at) AS day,
  count(*) AS order_count,
  sum(total_amount) AS revenue
FROM orders_source
GROUP BY 1;

-- Query (always up-to-date)
SELECT * FROM daily_revenue ORDER BY day DESC;

-- Sink changes back to Kafka
CREATE SINK revenue_sink
FROM daily_revenue
INTO KAFKA BROKER 'kafka:9092' TOPIC 'daily-revenue'
FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://schema-registry:8081';
```

### Performance Patterns
- Use indexes on materialized views queried by primary key (sub-millisecond lookups)
- Cluster per workload: isolate production queries from ad-hoc exploration
- Enable `WITH (RETAIN HISTORY FOR ...)` on sources to control retention
- Monitor dataflow progress via `mz_internal.mz_dataflow_operator_reachability`

---

## RisingWave

### Architecture
RisingWave is a cloud-native streaming database with:
- **Compute nodes**: stateless query processing, auto-scaling
- **Compactor nodes**: LSM compaction of persisted streaming state
- **Meta node**: catalog and cluster management
- **Object store**: S3/GCS/Azure Blob for persistent data storage
- **PG wire protocol**: compatible with standard PostgreSQL clients

### Key Concepts
- **Source**: external streaming or batch data
- **Table**: persisted data with primary key (supports updates/upserts)
- **Materialized View**: incrementally maintained SQL query result
- **Sink**: downstream delivery to Kafka/Databases
- **Connector**: built-in source/sink implementations (Kafka, Pulsar, JDBC, Iceberg)

### Setup and Usage
```sql
-- Create source from Kafka
CREATE SOURCE orders_source (
  order_id BIGINT,
  customer_id VARCHAR,
  total_amount DECIMAL,
  created_at TIMESTAMP
) WITH (
  connector = 'kafka',
  topic = 'orders',
  properties.bootstrap.server = 'kafka:9092',
  scan.startup.mode = 'earliest'
) FORMAT PLAIN ENCODE JSON;

-- Create table for mutable state
CREATE TABLE customer_profiles (
  customer_id VARCHAR PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  segment VARCHAR
) WITH (
  connector = 'kafka',
  topic = 'customer-profile',
  properties.bootstrap.server = 'kafka:9092'
) FORMAT UPSERT ENCODE JSON;

-- Materialized view with stream-table join
CREATE MATERIALIZED VIEW customer_orders AS
SELECT
  c.customer_id, c.name, c.segment,
  o.order_id, o.total_amount, o.created_at
FROM orders_source o
JOIN customer_profiles c ON o.customer_id = c.customer_id;

-- Windowed aggregation
CREATE MATERIALIZED VIEW hourly_metrics AS
SELECT
  window_start, window_end,
  segment,
  count(*) AS order_count,
  sum(total_amount) AS revenue
FROM TUMBLE(customer_orders, created_at, INTERVAL '1 HOUR')
GROUP BY window_start, window_end, segment;

-- Sink to Iceberg for long-term storage
CREATE SINK iceberg_metrics
FROM hourly_metrics
WITH (
  connector = 'iceberg',
  location = 's3://data-lake/analytics/hourly_metrics'
);
```

### Watermark and Late Data
```sql
-- Enable watermark for out-of-order handling
CREATE MATERIALIZED VIEW late_aware AS
SELECT
  window_start, window_end,
  count(*) AS event_count
FROM TUMBLE(
  orders_source,
  created_at,
  INTERVAL '5 MINUTES'
) WITH (watermark = INTERVAL '30 SECONDS')
GROUP BY window_start, window_end;
```

## Comparison

| Feature | Materialize | RisingWave |
|---------|-------------|------------|
| Engine | Timely/Differential Dataflow | Streaming + LSM storage |
| Storage | Persistent (object store) | Object store (S3/GCS) |
| SQL compatibility | PostgreSQL wire protocol | PostgreSQL wire protocol |
| Kafka Connect | Built-in | Built-in + JDBC |
| Sinks | Kafka only | Kafka, Iceberg, JDBC, etc. |
| Scaling | Clusters | Compute nodes |
| Indexes | In-memory arrangements | PG-like indexes |
| Best for | Low-latency views on Kafka | Large state, multi-sink |
