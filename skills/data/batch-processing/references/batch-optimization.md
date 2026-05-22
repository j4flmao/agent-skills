# Batch Optimization Reference

## Partitioning Strategies

### Static Partitioning
```sql
-- Daily partition
CREATE TABLE orders (
  order_id BIGINT,
  customer_id STRING,
  amount DECIMAL(10,2),
  order_date DATE
) PARTITIONED BY (order_date)
STORED AS PARQUET;

-- Multi-level partitioning
CREATE TABLE events (
  event_id BIGINT,
  user_id STRING,
  country STRING,
  event_ts TIMESTAMP
) PARTITIONED BY (event_date DATE, country STRING)
STORED AS PARQUET;

-- Partition pruning: query only reads matching directories
SELECT * FROM orders WHERE order_date = '2024-01-15';
-- Reads only: table/order_date=2024-01-15/ (not all directories)
```

### Dynamic Partitioning (INSERT)
```sql
-- Dynamic partitioning write
SET hive.exec.dynamic.partition = true;
SET hive.exec.dynamic.partition.mode = nonstrict;  -- all partitions dynamic
SET hive.exec.max.dynamic.partitions = 10000;
SET hive.exec.max.dynamic.partitions.pernode = 1000;

INSERT OVERWRITE TABLE orders PARTITION (order_date)
SELECT order_id, customer_id, amount, order_date
FROM staging_orders;

-- Risk: too many small files if not managed
-- Mitigation: hive.merge.tezfiles = true, hive.merge.size.per.task = 256MB
```

## Bucketing

```sql
-- Bucketed table for shuffle-free joins
CREATE TABLE orders_bucketed (
  order_id BIGINT,
  customer_id STRING,
  amount DECIMAL(10,2)
) CLUSTERED BY (customer_id) INTO 16 BUCKETS
STORED AS PARQUET;

-- Join both tables bucketed by same key, same bucket count
SELECT *
FROM orders_bucketed o
JOIN customers_bucketed c ON o.customer_id = c.id
-- no shuffle needed: each bucket pair joins locally

-- Bucket pruning: if filter is on bucket column, only read relevant buckets
SELECT * FROM orders_bucketed WHERE customer_id = 'abc123';
-- Reads only 1 of 16 buckets (hash('abc123') % 16)
```

```
Bucket count calculation:
  Buckets = MAX(sizeGB / targetGB, cores * 2)
  For 500GB table, 64 cores: 500 / 1 = 500 -> cap at 128 buckets
  Target: 50-100MB per bucket file after optimization
```

## File Format Selection

```
Selection criteria:
  Query pattern: columnar (Parquet/ORC) for SELECT few columns, Avro for whole-row
  Compression ratio: ZSTD > GZIP > Snappy (ratio); Snappy > ZSTD > GZIP (speed)
  Engine compatibility: Parquet for Spark/Presto, ORC for Hive, Avro for Kafka/writes

Format comparison (TPC-H 10GB):
  Parquet (snappy):  2.1GB, query time 15s
  Parquet (zstd):    1.4GB, query time 16s
  ORC (zlib):        1.2GB, query time 12s (Hive)
  ORC (snappy):      1.6GB, query time 13s (Hive)
  Avro (snappy):     4.8GB, query time 45s (columns scan all)
```

## Vectorized Read

```sql
-- Hive vectorized execution
SET hive.vectorized.execution.enabled = true;
SET hive.vectorized.execution.reduce.enabled = true;
SET hive.vectorized.execution.reduce.groupby.enabled = true;

-- What it does: processes 1024 rows at a time in columnar batches
-- Instead of: for each row { deserialize -> process -> serialize }
-- Does: for each batch { vectorized deserialize -> vectorized compute -> serialize }
-- Benefit: 2-5x CPU efficiency for scan+filter queries
```

## Dynamic Partition Pruning (Spark)

```sql
-- Enable DPP
SET spark.sql.optimizer.dynamicPartitionPruning.enabled = true;
SET spark.sql.optimizer.dynamicPartitionPruning.useStats = true;
SET spark.sql.optimizer.dynamicPartitionPruning.fallbackFilterRatio = 0.5;

-- Example: Spark automatically prunes fact partitions
SELECT *
FROM orders o
JOIN stores s ON o.store_id = s.id
WHERE s.region = 'EMEA';
-- Spark pushes down: o.store_id IN (SELECT id FROM stores WHERE region = 'EMEA')
-- Then prunes partitions using o.store_id -> partition mapping
```

## Statistics Collection

```sql
-- Hive statistics
ANALYZE TABLE orders COMPUTE STATISTICS;
ANALYZE TABLE orders PARTITION (order_date) COMPUTE STATISTICS;
ANALYZE TABLE orders COMPUTE STATISTICS FOR COLUMNS;

-- Spark SQL statistics
ANALYZE TABLE orders COMPUTE STATISTICS;
ANALYZE TABLE orders COMPUTE STATISTICS FOR ALL COLUMNS;

-- Check statistics
DESCRIBE EXTENDED orders;
SHOW TABLE STATISTICS orders;
SHOW COLUMN STATISTICS orders;

-- Stats stored in metastore:
-- numRows, totalSize, rawDataSize, colStats (ndv, nullCount, avgLen, maxLen, min, max)
```

## Configuration Reference

```properties
# General optimization properties
spark.sql.adaptive.enabled = true
spark.sql.adaptive.coalescePartitions.enabled = true
spark.sql.adaptive.coalescePartitions.initialPartitionNum = 200
spark.sql.adaptive.advisoryPartitionSizeInBytes = 67108864
spark.sql.adaptive.skewJoin.enabled = true
spark.sql.adaptive.skewJoin.skewedPartitionFactor = 5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes = 268435456
spark.sql.adaptive.broadcastHashJoin.enabled = true
spark.sql.adaptive.autoBroadcastJoinThreshold = 10485760
spark.sql.sources.bucketing.enabled = true
spark.sql.sources.bucketing.autoBucketedScan.enabled = true

# File compaction
spark.sql.files.maxPartitionBytes = 268435456
spark.sql.files.openCostInBytes = 4194304
spark.sql.files.minPartitionNum = 1

# Code generation
spark.sql.codegen.wholeStage = true
spark.sql.codegen.maxFields = 100
spark.sql.codegen.fallback = false

# Join hints
spark.sql.autoBroadcastJoinThreshold = 10485760  # 10MB, increase to 100MB (104857600)
```
