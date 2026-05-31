# Lakehouse Performance Optimization

## Overview

Performance optimization in a lakehouse involves tuning storage layout, file sizing, compaction, indexing, query planning, and compute configuration. Unlike traditional warehouses, lakehouse performance depends heavily on file-level decisions and metadata management. This reference provides patterns, configurations, and operational guidance for optimizing lakehouse workloads.

## File-Level Optimization

### Optimal File Size

File size is the single most important performance factor in a lakehouse. Small files (< 64MB) cause excessive metadata overhead and slow query planning. Large files (> 2GB) cause long scan times for small queries.

| Workload | File Size Target | Reason |
|---|---|---|
| BI queries (sub-second) | 128-256 MB | Fast scan, good parallelism |
| Batch ETL | 256-512 MB | Balance read/write efficiency |
| ML feature extraction | 512 MB - 1 GB | Sequential scan dominant |
| Streaming append | 64-128 MB | Lower latency (compromise) |
| Archival (cold data) | 1-4 GB | Minimize file count |

### Auto-Compaction

```sql
-- Delta Lake auto-compact
ALTER TABLE table_name SET TBLPROPERTIES (
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.targetFileSize' = '256mb'
);

-- Iceberg rewrite
CALL catalog.system.rewrite_data_files(
    table => 'table_name',
    strategy => 'sort',
    sort_order => 'event_date DESC NULLS LAST',
    options => map(
        'target-file-size-bytes', '268435456',
        'rewrite-all', 'false'
    )
);
```

### OPTIMIZE Command

```sql
-- Standard optimize
OPTIMIZE table_name;

-- With file size target
OPTIMIZE table_name WHERE date >= '2025-01-01';

-- With Z-order
OPTIMIZE table_name ZORDER BY (customer_id, order_date);

-- With partition filter
OPTIMIZE table_name FOR ALL PARTITIONS;
```

OPTIMIZE best practices:
- Run after large data loads (> 100GB)
- Run during low-traffic windows
- Use Z-order on columns used in WHERE clauses
- Run on partitions, not the full table (for partitioned tables)
- Monitor the history to track optimization effectiveness

## Partitioning Strategies

### Partition Granularity

| Partition Level | Partitions (1 year data) | Best For |
|---|---|---|
| Daily | 365 | High-write, time-range queries |
| Weekly | 52 | Balanced writes/queries |
| Monthly | 12 | Low-write, monthly reporting |
| Yearly | 1 | Append-only archives |

### Partitioning Decision Matrix

```
Partition key:
  ├── Time-series queries (WHERE date > X)?
  │   ├── High volume (> 100GB/day) → Daily
  │   ├── Medium volume (10-100GB/day) → Weekly
  │   └── Low volume (< 10GB/day) → Monthly
  ├── High-cardinality categorical filter?
  │   └── Partition by category/region (if low cardinality)
  └── No clear partition key?
      └── Use liquid clustering (Delta 3.0+) or skip partitioning
```

### Partitioning Anti-Patterns

1. **Too many partitions**: partition count > 10,000 causes metadata performance issues. Keep partitions < 1,000 for most tables.
2. **High-cardinality partition keys**: partitioning by `customer_id` creates too many small partitions. Use Z-order instead.
3. **Deep partition nesting**: `date/category/region` creates directory explosion. Use single-level partitions with Z-order.
4. **Partition columns not in queries**: partitions only help if queries filter on partition key.

### Liquid Clustering (Delta 3.0+)

```sql
ALTER TABLE table_name CLUSTER BY (customer_id, order_date);

-- Automatically maintained on all writes
-- No manual OPTIMIZE needed for layout
-- Adaptive file sizing
```

Liquid clustering advantages:
- No partition management
- Automatic layout optimization
- Self-tuning to query patterns
- No partition explosion risk

Liquid clustering disadvantages:
- Slightly higher write overhead
- Delta Lake 3.0+ only
- Less control over file layout

## File Skipping

### Statistics-Based Skipping

Delta Lake and Iceberg store min/max statistics per file in the metadata. When a query filters on a column, the engine skips files whose statistics don't match.

```sql
-- Z-order clustering improves file skipping
OPTIMIZE events ZORDER BY (event_date);

-- Query that benefits from file skipping
SELECT * FROM events
WHERE event_date >= '2025-06-01'    -- Date range prunes files
  AND user_id = 'abc123';            -- Z-order clusters user_id values
```

### Statistics Collection

```sql
-- Delta: control stats collection per column
ALTER TABLE events SET TBLPROPERTIES (
    'delta.dataSkippingNumIndexedCols' = '32',  -- Columns with stats (default 32)
    'delta.dataSkippingStatsColumns' =
        'event_date,user_id,event_type'           -- Specific columns for stats
);

-- Iceberg: stats are collected for all columns by default
-- Control via write properties
CALL catalog.system.set_table_properties(
    'events',
    map('write.metadata.metrics.default', 'full',
        'write.metadata.metrics.column.event_date', 'counts')
);
```

### Bloom Filters

For high-cardinality columns without clear ordering, bloom filters provide fast negative lookups.

```sql
-- Delta: no native bloom filter (relies on Z-order + stats)
-- Iceberg: bloom filter via column properties
ALTER TABLE events SET TBLPROPERTIES (
    'write.metadata.metrics.column.user_id' = 'full'
);
```

## Caching Strategies

### Delta Cache (Databricks)

Databricks clusters have local SSDs that cache remote data. Cache is transparent and automatic.

```python
# Cache frequently used tables
spark.sql("CACHE SELECT * FROM gold.daily_revenue")

# With partitioning
spark.sql("""
    CACHE SELECT * FROM silver.events
    WHERE event_date >= '2025-06-01'
""")

# Check cache hit ratio
spark.sql("DESCRIBE HISTORY gold.daily_revenue")
# Look for CacheHitRatio in query metrics
```

Cache configuration:
```yaml
# Spark config for Delta cache
spark.databricks.io.cache.enabled: true
spark.databricks.io.cache.maxDiskUsage: "500g"
spark.databricks.io.cache.maxMetaDataCache: "100m"
```

### Iceberg Caching

```yaml
# Iceberg metadata caching
spark.sql.extensions: org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions
spark.sql.catalog.iceberg: org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.iceberg.cache-enabled: true
spark.sql.catalog.iceberg.cache.expiration-interval-ms: 300000  # 5 min
```

### Result Cache

```sql
-- Databricks result cache
SET spark.databricks.sql.queryResultCache.enabled = true;
SET spark.databricks.sql.queryResultCache.ttlSecs = 300;

-- Trino result cache
SET session exchange_compression = true;
```

## Compute Optimization

### Cluster Sizing

```yaml
# General guidelines
ETL cluster:
  min_workers: 2
  max_workers: 20
  instance: i3.xlarge (NVMe SSD) or i3.2xlarge
  autoscale: true
  use_spot: true (for non-critical)

BI cluster:
  min_workers: 2
  max_workers: 10
  instance: i3.4xlarge (memory-optimized)
  autoscale: true
  use_spot: false (consistency)

ML cluster:
  min_workers: 1
  max_workers: 8
  instance: g4dn.xlarge or p3.2xlarge (GPU)
  autoscale: true
  use_spot: true
```

### Spark Configuration

```yaml
# Spark tuning for lakehouse
spark.sql.shuffle.partitions: "auto"  # defaults to spark.sql.adaptive.enabled
spark.sql.adaptive.enabled: true
spark.sql.adaptive.coalescePartitions.enabled: true
spark.sql.adaptive.coalescePartitions.minPartitionSize: "64mb"
spark.sql.adaptive.skewJoin.enabled: true
spark.sql.adaptive.skewJoin.skewedPartitionFactor: 5

# Memory
spark.memory.fraction: 0.8
spark.memory.storageFraction: 0.5
spark.sql.inMemoryColumnarStorage.compressed: true
spark.sql.inMemoryColumnarStorage.batchSize: 20000
```

### Photon (Databricks)

Photon is a native vectorized query engine that accelerates SQL workloads. Enable for gold layer queries.

```yaml
# Enable Photon on cluster
runtime_engine: PHOTON

# Best for
# - SQL analytics on gold tables
# - Aggregation-heavy queries
# - Filter-intensive workloads

# Not for
# - ML workloads
# - Python UDFs
# - Streaming
```

## Query Optimization

### Predicate Pushdown

Ensure filters are pushed down to file scanning:

```sql
-- Good: predicate pushdown
SELECT * FROM events
WHERE event_date >= '2025-06-01'
  AND user_id = 'abc123';

-- Bad: no pushdown (function wraps column)
SELECT * FROM events
WHERE DATE(event_date) >= '2025-06-01';

-- Workaround for function wrapping
SELECT * FROM events
WHERE event_date >= DATE '2025-06-01';
```

### Join Optimization

```sql
-- Broadcast small dimension tables (< 10GB)
SELECT /*+ BROADCAST(d) */
    f.order_id, d.customer_name, f.total
FROM gold.fct_orders f
JOIN gold.dim_customers d ON f.customer_id = d.customer_id;

-- Sort merge join for large tables (default)
SELECT /*+ MERGE(f, o) */
    f.date, o.order_id
FROM bronze.events f
JOIN bronze.orders o ON f.event_id = o.event_id;
```

### File Pruning with Partitioning

```sql
-- Query that prunes partitions effectively
SELECT * FROM events
WHERE event_date = '2025-06-15'
  AND event_type = 'purchase';

-- Query that cannot prune
SELECT * FROM events
WHERE event_date >= '2025-01-01'  -- Good (scan multiple partitions)
  AND event_type = 'purchase';
```

## Vacuum and Maintenance

### Delta VACUUM

```sql
-- Dry run to see what would be deleted
VACUUM events DRY RUN;
VACUUM events DRY RUN RETAIN 168 HOURS;

-- Actual vacuum
VACUUM events;
VACUUM events RETAIN 168 HOURS;

-- Aggressive vacuum (for storage-constrained)
VACUUM events RETAIN 0 HOURS;  -- Breaks time travel for files > 0 hours
```

VACUUM scheduling:
- Run daily for high-churn tables
- Run weekly for stable tables
- Always use RETAIN >= 168 hours for production
- Run after OPTIMIZE (to clean up old files from compaction)
- Monitor for VACUUM duration on large tables

### Iceberg Expire Snapshots

```sql
-- Iceberg snapshot expiration
CALL catalog.system.expire_snapshots(
    table => 'events',
    older_than => TIMESTAMP '2025-05-15',
    retain_last => 10
);
```

### Iceberg Rewrite Manifests

```sql
-- Rewrite metadata for better scan planning
CALL catalog.system.rewrite_manifests('events');
```

## Monitoring Performance

### Query Profile Analysis

```python
def analyze_query_plan(query):
    explained = spark.sql(f"EXPLAIN COST {query}").collect()[0][0]
    analysis = {}

    if "Scan parquet" in explained:
        analysis['scan'] = 'Parquet scan found'
    else:
        analysis['scan'] = 'WARNING: No parquet scan'

    if "Filter" in explained.replace("Scan", ""):
        analysis['filter_pushdown'] = 'Filters not pushed to scan'
    else:
        analysis['filter_pushdown'] = 'Filters pushed to scan'

    if "Exchange" in explained:
        analysis['shuffle'] = 'Shuffle required (expensive)'
    else:
        analysis['shuffle'] = 'No shuffle (efficient)'

    if "Broadcast" in explained:
        analysis['join'] = 'Broadcast join (efficient)'
    elif "SortMergeJoin" in explained:
        analysis['join'] = 'Sort merge join (expensive for large data)'
    elif "ShuffledHashJoin" in explained:
        analysis['join'] = 'Hash join (medium cost)'

    return analysis
```

### Performance Metrics

```sql
-- Query execution metrics (Databricks)
SELECT query_id, execution_time_ms, scan_bytes, shuffle_bytes
FROM system.query.history
WHERE query_text LIKE '%gold.daily_revenue%'
ORDER BY execution_time_ms DESC
LIMIT 20;

-- Table metrics
SELECT table_name, total_size_bytes, total_file_count,
       partition_count, last_optimized_time
FROM system.table_metrics;

-- Cluster utilization
SELECT cluster_id, vcore_hours, gpu_hours, total_cost
FROM system.cluster.history
WHERE date >= current_date - 7;
```

## Performance Comparison

| Optimization | Speedup | Effort | Risk | Applicability |
|---|---|---|---|---|
| File size tuning | 2-5x | Low | Low | All tables |
| Partitioning | 5-50x | Medium | Medium | Filtered queries |
| Z-order clustering | 2-10x | Medium | Low | Filtered queries |
| Liquid clustering | 2-5x | Low | Low | Delta 3.0+ |
| Delta cache | 2-10x | Low | Low | Databricks only |
| Photon engine | 2-5x | Low | Low | SQL workloads |
| Column pruning | 1.5-3x | Low | Low | Wide tables |
| Broadcast joins | 2-10x | Medium | Low | Dim + fact joins |
| Auto-compaction | 2-4x | Low | Low | Streaming tables |
| Partition pruning | 10-100x | Medium | Medium | Time-range queries |

## Performance Anti-Patterns

1. **Small files everywhere**: caused by streaming without compaction. Fix: enable auto-compaction.
2. **Over-partitioning**: too many partitions causing metadata overhead. Fix: use coarser granularity or liquid clustering.
3. **Reading unnecessary columns**: SELECT * on a 200-column table when only 5 needed. Fix: select specific columns.
4. **No filtering on partition key**: full table scan when partition pruning possible. Fix: add partition column to WHERE.
5. **Cross-join without broadcast**: large table cross-joins spill to disk. Fix: redesign or broadcast small side.
6. **Delta table without VACUUM strategy**: transaction log grows unbounded. Fix: schedule regular VACUUM.
7. **Iceberg without snapshot expiration**: old metadata retained forever. Fix: expire old snapshots.
8. **Uniform data distribution across files**: no file skipping possible. Fix: Z-order or liquid clustering.
9. **High file rewrite rate**: too many OPTIMIZE operations. Fix: reduce OPTIMIZE frequency.
10. **Using managed tables for shared data**: managed tables in Databricks have different lifecycle. Fix: use external tables.

## Cost-Performance Trade-Offs

### Storage vs Compute

| Strategy | Storage Cost | Compute Cost | Latency |
|---|---|---|---|
| High compaction, few large files | Lower | Lower read, higher write | Fast reads |
| Low compaction, many small files | Higher | Higher read, lower write | Slow reads |
| Z-order clustered | Higher write cost | Lower read cost | Fast filtered reads |
| Delta Cache (SSD) | Higher (SSD cost) | Lower compute | Very fast reads |

### Instance Selection

| Instance Type | Best For | Cost/Performance |
|---|---|---|
| i3/i4i (NVMe SSD) | ETL, heavy I/O workloads | Best I/O per $ |
| r5/r6i (memory-optimized) | BI, large joins | Best memory per $ |
| c5/c6i (compute-optimized) | Light ETL, small data | Best CPU per $ |
| g4dn/p3/p4d (GPU) | ML training, inference | GPU workloads |
| Graviton (ARM) | General workloads | 20-40% cost savings |

## References
- Databricks Performance Optimization: https://docs.databricks.com/optimizations/
- Delta Lake Tuning Guide: https://docs.delta.io/latest/best-practices.html
- Iceberg Performance: https://iceberg.apache.org/docs/latest/performance/
- Spark Tuning Guide: https://spark.apache.org/docs/latest/tuning.html
- Photon Engine: https://www.databricks.com/product/photon
- Liquid Clustering: https://docs.delta.io/latest/delta-liquid-clustering.html
