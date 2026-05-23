# ClickHouse for Real-Time Analytics

## Architecture

### Columnar Storage with Vectorized Execution
ClickHouse stores data column-by-column. Each column is a contiguous memory region enabling SIMD (Single Instruction, Multiple Data) CPU instructions. Queries that scan millions of rows execute in milliseconds because entire columns fit in CPU cache.

### MergeTree Engine Family
All ClickHouse tables are built on the MergeTree engine, providing:
- **Partitioning by expression** (typically month/day)
- **Primary index** (sparse index — every N rows indexed, not every row)
- **Order by key** (controls data layout for range scans)
- **TTL** (automatic data expiration at row level)

## Table Engine Patterns

### MergeTree (Default)
```sql
CREATE TABLE events (
    event_date Date,
    event_time DateTime,
    event_type String,
    user_id UInt64,
    value Float64,
    metadata String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, event_time)
TTL event_date + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;
```

### ReplacingMergeTree (Deduplication)
```sql
CREATE TABLE orders (
    order_id String,
    status String,
    total_amount Decimal(18,2),
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY order_id;
-- Duplicate order_ids are collapsed on merge (keeps latest by updated_at)
```

### SummingMergeTree (Pre-Aggregated)
```sql
CREATE TABLE daily_sales (
    product_id UInt32,
    sale_date Date,
    quantity UInt32,
    revenue Decimal(18,2)
) ENGINE = SummingMergeTree()
ORDER BY (product_id, sale_date);
-- Rows with same product_id + sale_date are auto-summed on merge
```

## Query Patterns

### Real-Time Dashboard Queries
```sql
-- Sub-second aggregation on 1B rows
SELECT
    toStartOfMinute(created_at) AS minute,
    count() AS events,
    quantile(0.99)(latency_ms) AS p99_latency
FROM events
WHERE created_at > now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute DESC;

-- Retention analysis (array functions)
SELECT
    user_id,
    groupArray(event_type) AS events_sequence
FROM events
WHERE event_date >= '2024-01-01'
GROUP BY user_id
HAVING has(events_sequence, 'signup');
```

## Materialized Views (Incremental)
```sql
-- Target table for pre-aggregated data
CREATE TABLE hourly_metrics (
    event_date Date,
    hour UInt8,
    event_type String,
    events_count UInt64,
    avg_value Float64
) ENGINE = SummingMergeTree()
ORDER BY (event_date, hour, event_type);

-- Materialized view: transforms on insert
CREATE MATERIALIZED VIEW hourly_metrics_mv
TO hourly_metrics
AS SELECT
    toDate(event_time) AS event_date,
    toHour(event_time) AS hour,
    event_type,
    count() AS events_count,
    avg(value) AS avg_value
FROM events
GROUP BY event_date, hour, event_type;
```

## Distributed Queries
```sql
-- Distributed table over 4 shards
CREATE TABLE events_distributed AS events
ENGINE = Distributed(cluster_name, default, events, rand());
```

## Performance Tuning

### Key Settings
```xml
<max_threads>8</max_threads>
<max_memory_usage>10000000000</max_memory_usage>  <!-- 10 GB -->
<optimize_aggregation_in_order>1</optimize_aggregation_in_order>
<merge_tree_min_rows_for_concurrent_read>1000000</merge_tree_min_rows_for_concurrent_read>
```

### Schema Design Tips
- **ORDER BY** columns = filters used in WHERE (cardinality low → high)
- **PARTITION BY** = time granularity (monthly for most cases)
- **Skip indexes**: `CREATE INDEX idx_metadata ON events(metadata) TYPE bloom_filter(0.01) GRANULARITY 4`
- **LowCardinality** type for strings with < 10k unique values: `event_type LowCardinality(String)`
