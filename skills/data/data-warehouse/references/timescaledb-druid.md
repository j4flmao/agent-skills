# TimescaleDB and Apache Druid

## TimescaleDB

### Hypertable Architecture
TimescaleDB extends PostgreSQL with hypertables — automatically partitioned tables by time and optionally by space (e.g., device_id). Each chunk is a standard PostgreSQL table covering a time interval.

```sql
-- Create hypertable: auto-partitions by time
CREATE TABLE sensor_data (
    time TIMESTAMPTZ NOT NULL,
    device_id INT NOT NULL,
    temperature FLOAT8,
    humidity FLOAT8,
    pressure FLOAT8
);
SELECT create_hypertable(
    'sensor_data',
    'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Add space partitioning for parallelism
SELECT add_dimension(
    'sensor_data',
    'device_id',
    number_partitions => 4
);
```

### Native Compression
Compression reduces storage 90%+ using columnar compression per chunk:

```sql
-- Enable compression
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id',
    timescaledb.compress_orderby = 'time DESC'
);

-- Compress chunks older than 7 days
SELECT add_compression_policy('sensor_data', INTERVAL '7 days');

-- Query compressed data transparently (no SQL changes)
SELECT device_id, avg(temperature)
FROM sensor_data
WHERE time > now() - INTERVAL '30 days'
GROUP BY device_id;
```

### Continuous Aggregates
```sql
-- Auto-refreshing materialized view
CREATE MATERIALIZED VIEW hourly_sensor_avg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    device_id,
    avg(temperature) AS avg_temp,
    max(temperature) AS max_temp,
    min(temperature) AS min_temp
FROM sensor_data
GROUP BY bucket, device_id;

-- Refresh policy: re-aggregates only new/changed data
SELECT add_continuous_aggregate_policy(
    'hourly_sensor_avg',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes'
);
```

## Apache Druid

### Segment-Centric Architecture
Druid ingests streaming and batch data into **segments** — immutable, time-partitioned, columnar files with bitmap indexes.
```
Druid cluster roles:
  Coordinator:  manages segments, rules, load balancing
  Overlord:     ingestion task management
  Broker:       query routing, merges partial results
  Historical:   serves cached segments from deep storage
  MiddleManager:ingestion workers (Peons)
```

### Ingestion Spec
```json
{
  "type": "index_parallel",
  "spec": {
    "dataSchema": {
      "dataSource": "orders",
      "timestampSpec": { "column": "created_at", "format": "auto" },
      "dimensionsSpec": {
        "dimensions": ["order_id", "customer_id", "status", "product_id"]
      },
      "metricsSpec": [
        { "type": "count", "name": "order_count" },
        { "type": "doubleSum", "name": "revenue", "fieldName": "amount" },
        { "type": "hyperUnique", "name": "unique_customers", "fieldName": "customer_id" }
      ],
      "granularitySpec": {
        "segmentGranularity": "HOUR",
        "queryGranularity": "MINUTE",
        "rollup": true
      }
    },
    "ioConfig": {
      "type": "kafka",
      "consumerProperties": { "bootstrap.servers": "kafka:9092" },
      "topic": "orders",
      "useEarliestOffset": true
    }
  }
}
```

### Query Patterns
```sql
-- Druid SQL (native or SQL API)
SELECT
  FLOOR(__time TO HOUR) AS hour,
  status,
  COUNT(*) AS order_count,
  SUM(revenue) AS total_revenue,
  APPROX_COUNT_DISTINCT(customer_id) AS unique_customers
FROM "orders"
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '7' DAY
GROUP BY 1, 2
ORDER BY 1 DESC
```

### Key Druid Features
- **Rollup**: pre-aggregate at ingestion time (reduces row count 10-100x)
- **Bitmap indexes**: fast `WHERE` filtering on dimension columns
- **Sub-second queries**: on petabyte-scale datasets for time-range, filtered, aggregated queries
- **Tiered storage**: hot (local SSD) → warm (deep storage S3) → cold (archival)

## Comparison

| Feature | TimescaleDB | Druid |
|---------|-------------|-------|
| Engine | PostgreSQL extension | Custom columnar + bitmap |
| Query language | Full PostgreSQL SQL | Limited SQL (analytics only) |
| Ingestion | Copy, stream (via PG) | Kafka, batch, streaming native |
| Latency | Row insert → millisecond | Streaming → second latency |
| Compression | Columnar per-chunk (90%+) | Rollup + columnar (90-99%) |
| Rollup | Via continuous aggregates | Native at ingestion |
| Updates | Full SQL UPDATE | Append-only (replace via re-ingest) |
| Joins | Full SQL JOIN | Limited (lookup, join via subquery) |
