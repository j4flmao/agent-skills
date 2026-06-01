---
name: data-batch-processing
description: >
  Use this skill when designing batch processing with Hive, Spark SQL, Pig, or HQL. This skill enforces: Hive metastore management, Spark SQL Catalyst optimization, file format selection (Parquet, ORC, Avro), partitioning and bucketing strategies, query tuning with statistics and dynamic partition pruning. Do NOT use for: real-time streaming, CDC pipelines, distributed compute framework selection (see data-distributed-compute), or lake table format design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, batch, processing, phase-11]
---

# Data Batch Processing

## Purpose
Design efficient batch processing architectures using Hive, Spark SQL, and optimized file formats. Master partitioning, bucketing, Catalyst optimizer tuning, vectorized reads, file format selection, and dynamic partition pruning for large-scale analytical workloads.

## Agent Protocol

### Trigger
Exact user phrases: "batch processing", "Hive", "Spark SQL", "Pig", "HQL", "Hive partition", "Spark partition", "bucketing", "query optimization", "ORC", "Parquet", "Avro", "vectorized read", "dynamic partition pruning", "Catalyst optimizer", "Tungsten", "Hive metastore", "reduce tasks".

### Input Context
Before activating, verify:
- Query engine (Hive on Tez, Hive on MR, Spark SQL, Presto, Trino)
- File format currently used (text, Parquet, ORC, Avro, JSON)
- Table volume (row count, size in TB, partition count)
- Partition column(s) and cardinality
- Common query patterns (full scan, filtered, aggregated, joined)
- Cluster resources (cores, memory, number of nodes)

### Output Artifact
Batch processing configuration with engine selection, partition strategy, and optimization parameters.

### Response Format
```
Engine: {Hive on Tez | Spark SQL | Presto | Trino}
File Format: {Parquet | ORC | Avro}
Partition: {column: type, granularity: daily/hourly/monthly}
Bucketing: {column: cluster count}
Optimizations: {vectorized, CBO, DPP, broadcast join}
Tuning: {executor/container config, parallelism}
```
```sql
-- DDL with partition/bucket spec
-- Query with optimization hints
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Query engine selected with justification
- [ ] File format selected and configured
- [ ] Partition strategy defined (column, granularity, layout)
- [ ] Bucketing strategy defined if applicable
- [ ] Catalyst/BE optimizer settings configured
- [ ] Vectorized read enabled

### Max Response Length
250 lines of config.

## Workflow

### Step 1: Engine Selection

#### Engine Comparison

| Feature | Hive on Tez | Spark SQL | Presto/Trino | Dask SQL |
|---|---|---|---|---|
| Execution | DAG (Tez) | DAG (Spark) | MPP (parallel) | Task graph |
| In-memory | No (disk via Tez) | Yes (RDD/DF) | In-memory pipeline | Yes (dataframes) |
| Latency | Minutes | Seconds-minutes | Sub-second | Seconds |
| SQL standard | HQL (limited) | ANSI SQL | ANSI SQL | SQL via Dask |
| UDF support | Java UDF | Python/Scala/Java | Java/Python | Python |
| Cost-based | Yes (CBO) | Yes (CBO + AQE) | Yes (cost-based) | No |
| Best for | Legacy Hive | Complex ETL, ML | Interactive SQL | Python pipelines |

#### Decision Tree

```
Query interactivity requirement?
├── Sub-second interactive SQL
│   └── Presto/Trino (MPP, in-memory)
├── Minutes: Complex ETL, joins, aggregations
│   ├── Large datasets, DataFrame API → Spark SQL
│   └── Legacy Hive environment → Hive on Tez
├── Hours: Massive batch, large shuffles
│   └── Spark SQL (best resilience, shuffle handling)
└── Ad-hoc Python analytics
    └── Dask SQL (Python-native)
```

### Step 2: File Format Selection

#### Format Comparison

| Feature | Parquet | ORC | Avro | JSON | CSV |
|---|---|---|---|---|---|
| Columnar | Yes | Yes | Row-based | Semi-structured | Row-based |
| Compression | ZSTD/Snappy/GZIP | ZSTD/Snappy/GZIP | Snappy/Deflate | None/GZIP | None/GZIP |
| Schema | Required | Required | Required | Implicit | None |
| Evolution | No | No | Yes (best) | Natural | N/A |
| Splittable | Yes | Yes | Yes | Limited | No (unless compressed) |
| Read performance | Fast (projection) | Fast (projection) | Moderate | Slow | Slow |
| Write speed | Moderate | Moderate | Fast | Fast | Fast |
| Vectorized read | Yes (Spark) | Yes (Hive) | No | No | No |
| Best for | Analytics, Spark | Analytics, Hive | Streaming, Kafka | Ingestion, logs | Export, exchange |

#### Format Selection

```
Primary query engine?
├── Spark SQL → Parquet (best Spark integration)
├── Hive on Tez → ORC (ACID, vectorized, best compression)
├── Streaming, Kafka, CDC → Avro (schema evolution, row-based)
├── Semi-structured, schema-on-read → JSON (flexible)
└── Data export, external exchange → CSV (universal)
```

### Step 3: Partitioning Strategy

#### Partition Design Rules

| Factor | Recommendation |
|---|---|
| Column cardinality | < 1000 partitions ideal, < 10000 acceptable |
| Partition frequency | Daily for time-series, monthly for low-volume |
| Column type | Date, categorical (country, status), ingestion time |
| Avoid | High-cardinality (customer_id), frequently changing |
| Iceberg/Delta | Use hidden partitioning (managed) |

#### Partition Examples

```sql
-- Daily partitioning
CREATE TABLE orders (
    order_id STRING,
    customer_id STRING,
    total_amount DECIMAL(10,2),
    status STRING
)
PARTITIONED BY (order_date DATE)
STORED AS PARQUET;

-- Multi-level partitioning (use cautiously — directory explosion)
CREATE TABLE events (
    event_id STRING,
    user_id STRING,
    page STRING,
    duration INT
)
PARTITIONED BY (year INT, month INT, day INT)
STORED AS PARQUET;

-- Hive bucketed (reduces joins) AND partitioned
CREATE TABLE sales (
    sale_id BIGINT,
    product_id INT,
    quantity INT,
    amount DECIMAL(10,2)
)
PARTITIONED BY (sale_date DATE)
CLUSTERED BY (product_id) INTO 100 BUCKETS
STORED AS PARQUET;
```

#### Partition Pruning

```sql
-- Best case: partition filter predicates
SELECT COUNT(*) FROM orders
WHERE order_date = '2026-05-01';  -- Reads 1 partition only

SELECT COUNT(*) FROM orders
WHERE order_date >= '2026-01-01' AND order_date < '2026-02-01';  -- Range scan

-- Worst case: function on partition column
SELECT COUNT(*) FROM orders
WHERE YEAR(order_date) = 2026;  -- Full scan! Use range instead

-- Dynamic Partition Pruning (Spark 3+)
-- Enabled by default: spark.sql.optimizer.dynamicPartitionPruning.enabled=true
-- Joins can push filter from one side to prune partitions on the other
```

### Step 4: Bucketing Strategy

#### Bucketing Benefits
Splits data into a fixed number of buckets (files) by hash of bucketing column. Enables: efficient joins between bucketed tables (no shuffle), sampling, sort-merge join optimization. Bucket count should be close to Spark shuffle partitions for best performance.

```sql
-- Create bucketed table
CREATE TABLE customers_bucketed (
    customer_id INT,
    name STRING,
    email STRING,
    segment STRING
)
CLUSTERED BY (customer_id) INTO 100 BUCKETS
SORTED BY (customer_id)
STORED AS PARQUET;

-- Joining two bucketed tables on the same column:
-- No shuffle needed if both have same bucket count
CREATE TABLE orders_bucketed (
    order_id INT,
    customer_id INT,
    total_amount DECIMAL(10,2)
)
CLUSTERED BY (customer_id) INTO 100 BUCKETS
SORTED BY (customer_id)
STORED AS PARQUET;

-- This join avoids shuffle entirely:
SELECT * FROM orders_bucketed o
JOIN customers_bucketed c ON o.customer_id = c.customer_id;
```

#### Bucketing Guidelines

| Scenario | Bucket Count | Bucket Column | Sort Column |
|---|---|---|---|
| Small dimension | < 10 | Join key | Join key |
| Medium dimension | 50-200 | Join key | Join or filter column |
| Large fact table | 200-500 | Join key | Filter column |
| Star schema joins | Equal to dimension | Same as dimension | Filter column |

### Step 5: Query Optimization

#### Catalyst Optimizer (Spark SQL)

```yaml
# Cost-Based Optimization (CBO)
spark.sql.cbo.enabled: true
spark.sql.cbo.planStats.enabled: true
spark.sql.cbo.joinReorder.enabled: true
spark.sql.cbo.joinReorder.dp.threshold: 12

# Adaptive Query Execution (Spark 3+)
spark.sql.adaptive.enabled: true
spark.sql.adaptive.coalescePartitions.enabled: true
spark.sql.adaptive.coalescePartitions.parallelismFirst: false
spark.sql.adaptive.coalescePartitions.minPartitionSize: 64MB
spark.sql.adaptive.advisoryPartitionSizeInBytes: 128MB
spark.sql.adaptive.skewJoin.enabled: true
spark.sql.adaptive.skewJoin.skewedPartitionFactor: 5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes: 256MB
spark.sql.adaptive.maxSplitsGroupingParallelism: 10

# Dynamic Partition Pruning
spark.sql.optimizer.dynamicPartitionPruning.enabled: true
spark.sql.optimizer.dynamicPartitionPruning.useStats: true
spark.sql.optimizer.dynamicPartitionPruning.fallbackFilterRatio: 0.5

# Broadcast join threshold
spark.sql.autoBroadcastJoinThreshold: 100MB
```

#### Hive Optimizer

```yaml
# Hive on Tez optimization
hive.cbo.enable: true
hive.compute.query.using.stats: true
hive.stats.fetch.column.stats: true
hive.stats.fetch.partition.stats: true
hive.tez.auto.reducer.parallelism: true
hive.tez.max.partition.factor: 2
hive.tez.min.partition.factor: 0.25
hive.optimize.reducededuplication: true
hive.optimize.reducededuplication.min.reducer: 4
hive.optimize.dynamic.partition.hashjoin: true

# CBO statistics collection
# ANALYZE TABLE orders COMPUTE STATISTICS;
# ANALYZE TABLE orders COMPUTE STATISTICS FOR COLUMNS customer_id, status;
```

### Step 6: Vectorized Read

```yaml
# Spark SQL vectorized reads
spark.sql.parquet.enableVectorizedReader: true  # Default true
spark.sql.parquet.columnarReaderBatchSize: 4096  # Rows per batch
spark.sql.orc.enableVectorizedReader: true
spark.sql.inMemoryColumnarStorage.enableVectorizedReader: true

# Hive vectorized reads
hive.vectorized.execution.enabled: true
hive.vectorized.execution.reduce.enabled: true
hive.vectorized.execution.mapjoin.native.enabled: true
hive.vectorized.execution.groupby.enabled: true
hive.vectorized.execution.partition.pruning: true
hive.vectorized.execution.filter.enabled: true
```

### Step 7: Join Patterns

#### Broadcast Join
Small table (dimension) broadcast to all executors — no shuffle on the small side. Use for: dimension-to-fact joins, reference table joins, small data (default < 100MB).

```sql
-- Explicit broadcast hint
SELECT /*+ BROADCAST(d) */ f.*, d.name
FROM fact_orders f
JOIN dim_customer d ON f.customer_id = d.customer_id;
```

#### Sort-Merge Join
Both sides sorted on join key, merged. Default for large tables. No shuffle if both tables bucketed and sorted on join key.

```sql
-- Disable broadcast for large joins
SET spark.sql.autoBroadcastJoinThreshold = -1;
SELECT f.*, p.*
FROM fact_orders f
JOIN fact_payments p ON f.order_id = p.order_id;
```

#### Skew Join
AQE detects skewed partitions and splits them. Handle extreme skew with salt key.

```sql
-- Salting for extreme skew (e.g., NULL joins)
SELECT *
FROM fact_orders f
JOIN dim_customer d ON
  d.customer_id = f.customer_id OR
  (f.customer_id IS NULL AND d.customer_id = 0);
```

### Step 8: Partition Tuning

#### Spark Partition Settings

```yaml
# Shuffle partitions (default 200, tune for data size)
spark.sql.shuffle.partitions: 400  # ~128-256MB per partition
# Formula: total_shuffle_data / 128MB

# File scan parallelism
spark.sql.files.maxPartitionBytes: 256MB
spark.sql.files.openCostInBytes: 4MB
spark.sql.files.minPartitionNum: 1

# Reduce-side partition coalescing (AQE)
spark.sql.adaptive.coalescePartitions.parallelismFirst: false
spark.sql.adaptive.coalescePartitions.minPartitionSize: 64MB
```

#### Hive Partition Tuning

```yaml
# Hive partition settings
hive.exec.dynamic.partition: true
hive.exec.dynamic.partition.mode: nonstrict
hive.exec.max.dynamic.partitions: 10000
hive.exec.max.dynamic.partitions.pernode: 1000
hive.exec.max.created.files: 100000
hive.load.dynamic.partitions.thread: 8
```

### Step 9: Resource Tuning

#### Spark Resource Config

```yaml
# Memory allocation (example: 16-node, 64GB, 32-core cluster)
spark.executor.memory: 16g
spark.executor.memoryOverhead: 2g
spark.executor.cores: 4
spark.executor.instances: 32
spark.memory.fraction: 0.6
spark.memory.storageFraction: 0.5

# Off-heap config
spark.memory.offHeap.enabled: false  # Enable only if JVM GC issues

# Shuffle memory
spark.reducer.maxSizeInFlight: 96m
spark.shuffle.file.buffer: 64k

# Kryo serialization
spark.serializer: org.apache.spark.serializer.KryoSerializer
spark.kryoserializer.buffer.max: 256m
```

#### Hive on Tez Config

```yaml
# Tez container sizing
hive.tez.container.size: 16384  # MB
hive.tez.java.opts: "-Xmx14336m"
tez.task.resource.memory.mb: 16384
tez.task.resource.cpu.vcores: 4

# Tez session config
hive.tez.session.max.events: 1000000
tez.grouping.min-size: 16777216  # 16MB
tez.grouping.max-size: 1073741824  # 1GB
```

### Step 10: Common Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| Full table scan | Query reads all partitions | Add partition filter, check WHERE clause |
| Cartesian join | Join without condition | Add join condition |
| UDF filtering | Custom UDF in WHERE causes full scan | Push filter before UDF |
| Data skew | Some tasks run much longer | Enable AQE skew join, use salt key |
| Too many partitions | Millions of small files | Coalesce/repartition, reduce partition count |
| No stats | CBO can't optimize | Run ANALYZE TABLE |
| Serialized bottleneck | Single task processes all data | Increase parallelism, shuffle partitions |

## Rules
- Use columnar formats (Parquet/ORC) for analytical workloads — never text/CSV
- Partition by date/region for query pruning — avoid high-cardinality partition keys
- Enable CBO and collect table statistics for optimal query planning
- Enable AQE (Spark 3+) for automatic partition coalescing and skew handling
- Enable vectorized reads for 3-5x query speedup
- Bucket tables on join keys to enable shuffle-free joins
- Use broadcast join for small dimension tables (< 100MB)
- Set shuffle partitions based on data size (128-256MB per partition)
- Monitor small files — coalesce when needed
- Test queries with EXPLAIN to verify plan (partition pruning, join types)
- Use explicit join hints (BROADCAST, MERGE, SHUFFLE_HASH) when CBO gets it wrong

### Windowing and Analytical Functions

```sql
-- Use window functions instead of self-joins
-- Good: Window function
SELECT
    order_id,
    customer_id,
    total_amount,
    order_date,
    SUM(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total,
    LAG(total_amount, 1) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
    ) AS prev_order_amount,
    LEAD(total_amount, 1) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
    ) AS next_order_amount
FROM orders;

-- Bad: Self-join for running total
-- SELECT o1.*, SUM(o2.total_amount)
-- FROM orders o1 JOIN orders o2 ON o1.customer_id = o2.customer_id AND o2.order_date <= o1.order_date
-- GROUP BY o1.order_id;
```

### Skew Handling

```yaml
# AQE skew join (Spark 3+)
spark.sql.adaptive.skewJoin.enabled: true
spark.sql.adaptive.skewJoin.skewedPartitionFactor: 5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes: 256MB

# Manual skew handling with salt key
# For a join where one key value dominates:
# 1. Add salt column: FLOOR(RAND(0) * N) as salt
# 2. Join on original key + salt
# 3. Skewed partition gets split into N sub-partitions

# Example: customer_id 123 has 50% of orders
WITH salted_orders AS (
    SELECT *, FLOOR(RAND(0) * 10) AS salt
    FROM orders
),
salted_customers AS (
    SELECT *, FLOOR(IF(customer_id = 123, RAND(0) * 10, 0)) AS salt
    FROM customers
)
SELECT *
FROM salted_orders o
JOIN salted_customers c ON o.customer_id = c.customer_id AND o.salt = c.salt;
```

### Full Query Tuning Workflow

1. **Profile** with `EXPLAIN` and `EXPLAIN ANALYZE` to identify bottlenecks
2. **Check** if partition pruning works — verify partition filter in physical plan
3. **Check** join type — is CBO picking broadcast, sort-merge, or shuffled hash?
4. **Check** shuffle partition count — too many small partitions or too few large?
5. **Check** data skew — do some tasks take much longer than others?
6. **Enable** AQE — let Spark automatically coalesce partitions and handle skew
7. **Tune** specific knobs: broadcast join threshold, shuffle partitions, memory fraction
8. **Retest** with EXPLAIN ANALYZE — verify improvements
9. **Document** tuning decisions in code comments or ADR

## Rules
- Use columnar formats (Parquet/ORC) for analytical workloads — never text/CSV
- Partition by date/region for query pruning — avoid high-cardinality partition keys
- Enable CBO and collect table statistics for optimal query planning
- Enable AQE (Spark 3+) for automatic partition coalescing and skew handling
- Enable vectorized reads for 3-5x query speedup
- Bucket tables on join keys to enable shuffle-free joins
- Use broadcast join for small dimension tables (< 100MB)
- Set shuffle partitions based on data size (128-256MB per partition)
- Monitor small files — coalesce when needed
- Test queries with EXPLAIN to verify plan (partition pruning, join types)
- Use explicit join hints (BROADCAST, MERGE, SHUFFLE_HASH) when CBO gets it wrong
- Handle data skew with AQE or salt keys — skewed tasks kill performance
- Use window functions over self-joins for analytical queries
- Document tuning decisions — revert to defaults when not beneficial

## References
Coming soon.

## Handoff
`data-distributed-compute` for Spark/Ray/Dask cluster tuning
`data-data-catalog` for registering batch tables and lineage
`data-data-warehouse` for warehouse integration with batch pipelines
