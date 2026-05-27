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
- [ ] Dynamic partition pruning configured
- [ ] Table statistics computed

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose Engine
```
Hive on Tez:  Batch SQL, mature DAG engine, ACID (full/inc), best for HiveQL-heavy orgs
              Pros: HiveQL backward-compat, LLAP caching, ACID tables (INSERT/UPDATE/DELETE)
              Cons: Slower than Spark SQL for iterative, less ecosystem support

Spark SQL:    Batch SQL + DataFrame API, Catalyst optimizer, Tungsten execution
              Pros: Unified batch/streaming/ML, in-memory speed, rich API (SQL + DataFrame)
              Cons: Higher memory overhead, no native ACID tables (Delta/Iceberg layer)

Presto/Trino: ANSI SQL, federated queries, interactive speed (sub-second)
              Pros: Fast queries across multiple sources, connector ecosystem
              Cons: No ACID, no UPDATE/DELETE, memory-bound, not for heavy ETL
```

### Step 2: Choose File Format
```
Parquet:
  - Columnar storage, nested types (struct, array, map), schema evolution
  - Compression: snappy (fast), zstd (balanced), gzip (high ratio)
  - Best for: Spark SQL, Presto/Trino, general analytics
  - Statistics: min/max/nulls per column group, predicate pushdown
  - Encoding: dictionary, RLE, delta, plain

ORC:
  - Columnar, built-in indexes (stripe-level, row-level)
  - Compression: zlib (default), snappy, zstd
  - Best for: Hive, ACID tables (Hive transactional)
  - Performance: faster reads than Parquet on Hive (native reader)
  - Stripe size: 250MB default, configurable

Avro:
  - Row-oriented, schema in file header (self-describing)
  - Best for: write-heavy, Kafka, streaming, data exchange
  - Compression: snappy, deflate
  - Splittable across records (good for MapReduce)
  - Not good for: analytical queries (reads whole row)
```

### Step 3: Partition Strategy
Physical partitioning divides data into directory hierarchies for partition pruning. Choose partition column with: low-to-medium cardinality (hundreds to low thousands of distinct values), used in WHERE clauses, evenly distributed.

```
Good partitions:
  date:         daily partition = 365/yr, even distribution
  dt:           string '2024-01-15', 365 partitions/year
  year/month:   year=2024/month=01, 12 partitions/year nested
  country:      <200 values, varies in size
  event_type:   <50 values, good if queried

Bad partitions:
  user_id:       millions of partitions -> NN pressure, slow listing
  product_id:    hundreds of thousands -> too many small files
  timestamp_ms:  unique per row -> every file own directory
  status:        3-5 values -> too few partitions, not pruning

Partition layout:
  table/dt=2024-01-15/
    00001.parquet
    00002.parquet
  table/dt=2024-01-16/
    00001.parquet
```

### Step 4: Bucketing
Bucketing: fixed number of files per partition, clustered by hash of bucketing column. Enables: bucket pruning (faster joins on same bucket key), sampling, more even file sizes.

```sql
-- Partitioned + bucketed table
CREATE TABLE orders (
  order_id STRING,
  customer_id STRING,
  order_date DATE,
  amount DECIMAL(10,2)
)
PARTITIONED BY (order_month STRING)
CLUSTERED BY (customer_id) INTO 16 BUCKETS
STORED AS PARQUET;

-- Theoretical join on bucketed column — no shuffle
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id
-- Both tables bucketed by customer_id into 16 buckets
-- Each bucket pair can join locally (no shuffle needed)
```

### Step 5: Catalyst Optimizer (Spark SQL)
Catalyst phases: Analysis (resolve columns) -> Logical Optimization (predicate pushdown, constant folding) -> Physical Planning (join selection, cost model) -> Code Generation (Tungsten generate bytecode). Key optimizations: predicate pushdown (filter before scan), projection pushdown (read only needed columns), join reorder (smallest first), broadcast join (small table hint), constant folding.

```
SQL: SELECT c.name, SUM(o.amount)
     FROM orders o JOIN customers c ON o.customer_id = c.id
     WHERE o.order_date = '2024-01-15'
     GROUP BY c.name

AST -> Analyzed Plan -> Logical Plan -> Optimized Plan -> Physical Plan -> Executed

Optimizations applied:
  1. Predicate pushdown: filter by order_date before join
  2. Projection pushdown: only read customer_id, amount from orders; id, name from customers
  3. Broadcast: if customers < spark.sql.autoBroadcastJoinThreshold (10MB default)
  4. Join reorder: smaller table customers broadcasted, orders shuffled
  5. Code gen: whole-stage code generation on Tungsten
```

### Step 6: Tungsten Execution
Whole-stage code generation: generates optimized Java bytecode for query stages, eliminates virtual function calls. Off-heap memory: unsafe rows for shuffle, avoids serialization/deserialization. Cache-aware computation: hand-optimized loops for CPU cache.

```properties
# Spark SQL tuning
spark.sql.codegen.wholeStage            true    (default, always on)
spark.sql.codegen.maxFields             100     (increase for wide schemas)
spark.sql.adaptive.enabled              true    (Spark 3.x, AQE)
spark.sql.adaptive.coalescePartitions.enabled true (merge small shuffle partitions)
spark.sql.files.maxPartitionBytes       134217728 (128MB default, increase for large files)
spark.sql.broadcastTimeout              300     (increase for slow broadcast builds)
```

### Step 7: Adaptive Query Execution (AQE)
Spark 3.x AQE: dynamic coalescing of shuffle partitions, dynamic join strategy switching, dynamic skew join optimization. Coalesce: reduce partition count after shuffle if data is small. Skew: split skewed partitions into sub-partitions for even distribution.

```properties
spark.sql.adaptive.enabled              true
spark.sql.adaptive.coalescePartitions.enabled      true
spark.sql.adaptive.coalescePartitions.initialPartitionNum   200
spark.sql.adaptive.coalescePartitions.minPartitionNum       10
spark.sql.adaptive.advisoryPartitionSizeInBytes   67108864  (64MB target)
spark.sql.adaptive.skewJoin.enabled              true
spark.sql.adaptive.skewJoin.skewedPartitionFactor 10        (10x median = skewed)
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes 268435456 (256MB)
```

### Step 8: Dynamic Partition Pruning (DPP)
DPP: if fact table is partitioned and dimension table filter is applied, Spark reads only relevant partitions. Works with broadcast or shuffle hash join. Automatic in Spark 3.x with AQE.

```sql
-- DPP example: Spark automatically prunes orders partitions
-- based on the filtered dimension table
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'EMEA';
-- If orders is partitioned by order_date, DPP creates a dynamic filter:
-- orders.order_date IN (SELECT DISTINCT order_date ... pre-filtered)
-- This prunes partitions at scan time.
```

### Step 9: Statistics and CBO (Cost-Based Optimizer)
Hive: ANALYZE TABLE COMPUTE STATISTICS. Spark SQL: ANALYZE TABLE COMPUTE STATISTICS FOR ALL COLUMNS. Statistics include: row count, total size, column min/max/ndv/null count. CBO uses stats for: join ordering, join type selection, partition pruning estimation.

```sql
-- Collect statistics
ANALYZE TABLE orders COMPUTE STATISTICS;
ANALYZE TABLE orders COMPUTE STATISTICS FOR COLUMNS;
ANALYZE TABLE orders COMPUTE STATISTICS FOR ALL COLUMNS;

-- Show collected stats
DESCRIBE FORMATTED orders;
SHOW COLUMN STATISTICS orders;

-- Spark SQL analyze
ANALYZE TABLE orders COMPUTE STATISTICS;
ANALYZE TABLE orders COMPUTE STATISTICS FOR ALL COLUMNS;
```

### Step 10: Vectorized Read
Processes batches of rows (1024-4096) instead of one-at-a-time. Reduces CPU overhead, enables SIMD-like processing. Parquet: native vectorized reader. ORC: built-in vectorized reader for Hive/Tez. Spark SQL uses whole-stage codegen which achieves similar benefits.

```properties
# Hive vectorized read
set hive.vectorized.execution.enabled = true;
set hive.vectorized.execution.reduce.enabled = true;
set hive.vectorized.execution.reduce.groupby.enabled = true;

# Spark SQL (whole-stage codegen, always on)
spark.sql.codegen.wholeStage = true; (default)

# Presto/Trino vectorized
# Always on for Presto/Trino (page-at-a-time processing)
```

## Rules
- Parquet for Spark SQL/Presto; ORC for Hive; Avro for streaming/write-heavy
- Partition on date/dimension with <10K partitions per table
- Bucket on join key (same bucket count on both sides) for shuffle-free joins
- Enable AQE in Spark 3.x+ for dynamic optimization
- Collect statistics regularly (schedule ANALYZE after major loads)
- Use ZSTD compression for best ratio-speed trade-off
- Avoid dynamic partitioning inserts (INSERT OVERWRITE) with many small files
- Set spark.sql.files.maxPartitionBytes = 128MB for balanced parallelism

## References
  - references/batch-error-handling.md — Batch Processing Error Handling
  - references/batch-job-scheduling.md — Batch Job Scheduling Reference
  - references/batch-monitoring.md — Batch Pipeline Monitoring
  - references/batch-optimization.md — Batch Optimization Reference
  - references/batch-processing-patterns.md — Batch Processing Patterns
  - references/batch-vs-streaming.md — Batch vs Streaming Decision Framework
  - references/hive-spark-sql.md — Hive and Spark SQL Reference
  - references/incremental-loading.md — Incremental Loading Strategies
## Handoff
`data-distributed-compute` for Spark cluster tuning and resource management
`data-data-lake` for lake table formats (Delta/Iceberg/Hudi) on batch data
`data-workflow-orchestration` for scheduling batch pipelines
