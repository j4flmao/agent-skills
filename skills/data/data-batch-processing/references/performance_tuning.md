# Spark Batch Performance Tuning

A diagnosis-first workflow for slow or expensive Spark batch jobs: read the Spark UI, find the bottleneck stage, and apply the matching fix (partitioning, skew handling, join strategy, file layout, caching). Property defaults are listed in `configuration_guide.md`.

## Workflow

1. **Measure**: job duration, cost, input/output size. Keep a baseline.
2. **Find the slowest stage** in the Spark UI (Stages tab sorted by duration).
3. **Classify** the problem using task metrics (below).
4. **Change one thing**, rerun on the same input, compare.
5. **Record** the change and result.

## Reading the Spark UI

| Observation | Meaning |
|-------------|---------|
| Max task duration far above median in a stage | Data skew |
| Many tasks of a few milliseconds | Too many partitions / small files |
| Few long tasks, cluster idle | Too few partitions |
| High "Shuffle Spill (Disk)" | Partitions too large for execution memory |
| High GC time (above roughly 10% of task time) | Memory pressure, too many objects, oversized executors |
| Large "Shuffle Read" between stages | Wide transformation; check if a broadcast or pre-aggregation avoids it |
| Scan reads far more data than needed | Missing partition pruning or predicate pushdown |
| Long gaps between jobs | Driver-side work (Python loops, `collect`, planning large plans, listing many files) |

Use `df.explain("formatted")` and the SQL tab to see the physical plan, pushed filters and join strategies; AQE shows the final adapted plan after execution.

## Reduce Data Read

- Partition tables by the most common filter (usually date) and always filter on it.
- Select only needed columns early; Parquet/ORC read only selected columns.
- Sort or cluster data within files by frequently filtered columns (Delta Z-order or liquid clustering, Iceberg sort orders) so min/max statistics skip files.
- Avoid functions on partition columns in filters (`to_date(dt) = ...`) that can prevent pruning; compare the raw column.

## Partition Sizing

Target post-shuffle partitions of roughly 100 to 200 MB of data in memory (AQE's advisory default is 64 MB, a reasonable starting point).

```python
spark.conf.set("spark.sql.shuffle.partitions", 2000)   # upper bound; AQE coalesces
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", str(128 * 1024 * 1024))
```

- `repartition(n, col)` triggers a shuffle; use it to increase parallelism or co-partition by a key.
- `coalesce(n)` reduces partitions without a full shuffle; use before writing to reduce file count, but it can reduce upstream parallelism.

## Data Skew

Symptoms: one or a few tasks take most of the stage time.

| Fix | When |
|-----|------|
| AQE skew join (`spark.sql.adaptive.skewJoin.enabled`) | Sort-merge joins with a few skewed partitions |
| Broadcast the smaller side | Smaller side fits in memory |
| Filter or handle null / default keys separately | Skew from nulls or sentinel default values ("unknown", 0) |
| Salting | Extreme skew in aggregations or joins AQE cannot split |
| Two-phase aggregation | Skewed `groupBy`: partial aggregate on salted key, then final aggregate |

```python
from pyspark.sql import functions as F

SALT = 16
facts = facts.withColumn("salt", (F.rand(seed=42) * SALT).cast("int"))
dim_salted = dim.crossJoin(spark.range(SALT).withColumnRenamed("id", "salt"))
joined = facts.join(dim_salted, ["customer_id", "salt"]).drop("salt")
```

Salting multiplies the dimension side; apply it only to the hot keys when the dimension is large.

## Join Strategy

| Strategy | Chosen when | Notes |
|----------|-------------|-------|
| Broadcast hash join | One side under the broadcast threshold | No shuffle of the large side |
| Sort-merge join | Both sides large | Shuffle and sort both sides |
| Shuffle hash join | One side moderately small per partition | Enabled by AQE or hint `SHUFFLE_HASH` |
| Storage-partitioned join / bucketed join | Both tables bucketed or partitioned compatibly | Avoids shuffle; Iceberg supports storage-partitioned joins |

Hints: `df.hint("broadcast")`, `/*+ BROADCAST(d) */`, `/*+ SHUFFLE_HASH(t) */`. Use hints when statistics are missing or wrong; prefer collecting statistics (`ANALYZE TABLE ... COMPUTE STATISTICS`) so the optimizer decides.

## Python-Specific

- Replace row-wise Python UDFs with built-in functions; if not possible, use pandas UDFs (vectorized via Arrow).
- Avoid driver-side loops issuing many small Spark jobs; express logic as one DataFrame pipeline.
- `toPandas()` only on small results with Arrow enabled.

## Caching

Cache only DataFrames reused by multiple actions, and only when recomputation is expensive.

```python
enriched = enriched.persist()      # MEMORY_AND_DISK by default for DataFrames
enriched.count()                   # materialize
daily = enriched.groupBy("order_date").count()   # reuse 1
by_customer = enriched.groupBy("customer_id").count()   # reuse 2
enriched.unpersist()
```

Caching data used once wastes memory and can cause spills elsewhere. For reuse across jobs, write an intermediate table instead.

## Output File Layout

- Aim for files of roughly 128 MB to 1 GB. Too many small files slow every reader; too few large files limit parallelism.
- Use `repartition` by the partition column before `partitionBy` writes to avoid each task writing a small file into every partition.
- Table formats: enable optimized writes / auto compaction where available, and schedule compaction.

```python
(df.repartition("order_date")
   .write.mode("overwrite")
   .partitionBy("order_date")
   .parquet("s3://lake/gold/daily_revenue/"))
```

## Cluster Sizing and Cost

- More executors help only if the stage has enough partitions; check task count vs total cores.
- Memory-bound jobs benefit from memory-optimized instances; shuffle-heavy jobs from local NVMe disks.
- Use spot executors with on-demand drivers; enable decommissioning to migrate shuffle blocks on spot loss.
- Compare cost per run, not only runtime: a 20% faster run on twice the nodes is more expensive.

## Common Fixes Summary

| Problem | First fix |
|---------|-----------|
| Full table scans | Partition filter, column pruning |
| Skewed stage | AQE skew join, broadcast, salting |
| Spill to disk | More partitions, larger executor memory, fewer cores per executor |
| Thousands of tiny tasks | Coalesce input (`openCostInBytes`), compact files |
| Slow Python logic | Built-in functions, pandas UDFs |
| Slow writes to object storage | Proper committer or table format, fewer larger files |

## Checklist

- [ ] Baseline recorded before tuning
- [ ] Bottleneck stage identified from task metrics
- [ ] Partition pruning and column pruning confirmed in the plan
- [ ] Skew handled; broadcast used where appropriate
- [ ] Output file sizes in the target range
- [ ] Cost per run tracked alongside duration
