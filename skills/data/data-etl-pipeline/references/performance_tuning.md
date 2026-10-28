# ETL Performance Tuning

Making pipelines faster and cheaper: measure first, then fix data layout (file sizes, partitioning, clustering), processing (incremental logic, joins, shuffles in Spark), warehouse SQL, and orchestration overhead.

## Measure Before Tuning

| Layer | Where to look |
|---|---|
| Orchestrator | Task durations and queue time (Airflow Gantt, Dagster run timeline) |
| Spark | Spark UI: stages, shuffle read/write, spill, skewed tasks, GC time |
| Warehouse | Query profile (Snowflake Query Profile, BigQuery execution details, Databricks query history): bytes scanned, partitions pruned, spill, join explosion |
| Storage | File count and size per table/partition |
| dbt | `run_results.json` timings per model |

Optimize the top few jobs by cost or critical-path time; ignore the long tail.

## Data Layout

### File sizes
- Many small files cause metadata overhead and slow scans. Target roughly 128 MB–1 GB Parquet files for lakehouse tables (engine docs give specific targets).
- Compact regularly: Delta `OPTIMIZE`, Iceberg `rewrite_data_files`, Hudi clustering; enable optimized writes/auto-compaction where available.

```sql
-- Delta Lake
OPTIMIZE silver.orders ZORDER BY (customer_id);       -- or liquid clustering: ALTER TABLE ... CLUSTER BY (customer_id)
-- Iceberg (Spark procedure)
CALL catalog.system.rewrite_data_files(table => 'silver.orders', strategy => 'sort', sort_order => 'customer_id');
CALL catalog.system.expire_snapshots(table => 'silver.orders', older_than => TIMESTAMP '2026-10-20 00:00:00');
```

### Partitioning and clustering
| Guideline | Reason |
|---|---|
| Partition by a low-cardinality column used in most filters (usually date) | Partition pruning |
| Avoid partitions smaller than about 1 GB of data per partition on lakehouses | Small-file problem |
| Cluster/sort by high-cardinality filter or join keys | Data skipping via min/max statistics |
| Iceberg hidden partitioning (`days(ts)`, `bucket(16, id)`) | Queries need not reference partition columns |
| BigQuery: partition + cluster; require partition filter on big tables | Bytes scanned = cost |
| Snowflake: clustering keys only for very large tables with selective filters | Automatic clustering costs credits |

### Formats
Columnar formats (Parquet/ORC) with ZSTD or Snappy compression; avoid CSV/JSON beyond the raw landing layer.

## Incremental Processing
- Process only new/changed data (watermarks, CDC, partitions) instead of full rebuilds.
- dbt: `incremental` models with `merge`, `delete+insert`, `insert_overwrite` (partition-level) strategies; `microbatch` strategy (dbt 1.9+) for time-series models processing bounded batches.
- Restrict MERGE target scans with predicates (`incremental_predicates` in dbt) so only recent partitions are rewritten.

```sql
{{ config(materialized='incremental', incremental_strategy='merge', unique_key='event_id',
          incremental_predicates=["DBT_INTERNAL_DEST.event_date >= dateadd(day, -3, current_date)"]) }}
```

## Spark Tuning

| Problem | Symptom in Spark UI | Fix |
|---|---|---|
| Too many/few shuffle partitions | Tiny tasks or huge spilling tasks | AQE (`spark.sql.adaptive.enabled=true`, coalesce partitions); set `spark.sql.shuffle.partitions` to match data size |
| Skewed join key | One task much longer than others | AQE skew join (`spark.sql.adaptive.skewJoin.enabled`), salting, isolate hot keys |
| Large-small join shuffling | Big shuffle for a small dimension | Broadcast join (`broadcast(df)`, `spark.sql.autoBroadcastJoinThreshold`) |
| Spill to disk | Spill metrics in stages | More memory per core, fewer cores per executor, more partitions |
| Python UDF overhead | Slow stages with Python workers | Built-in functions; pandas UDFs (Arrow) if needed |
| Repeated recomputation | Same lineage in several actions | `cache()`/`persist()` then `unpersist()`; or write intermediate table |
| Reading too much | Large input size | Column pruning, predicate pushdown, partition filters |

```python
from pyspark.sql import functions as F

orders = spark.read.table("silver.orders").where(F.col("order_date") >= "2026-10-01")
countries = spark.read.table("ref.countries")
result = orders.join(F.broadcast(countries), "country_code")
```

## Warehouse SQL Tuning
- Select only needed columns; avoid `SELECT *` in models.
- Filter early on partition/cluster keys; avoid wrapping them in functions (`WHERE DATE(ts) = ...` can block pruning on some engines; use ranges).
- Pre-aggregate before joining large fact tables.
- Watch for join fan-out (many-to-many) inflating row counts; validate key uniqueness with tests.
- Use `QUALIFY ROW_NUMBER()` for dedup instead of self-joins.
- Materialize expensive intermediate results that several models reuse (table instead of view/ephemeral).
- Right-size compute: Snowflake warehouse size and multi-cluster for concurrency; BigQuery reservations vs. on-demand; Databricks SQL warehouse sizing and serverless.

## Orchestration Overhead
- Avoid thousands of tiny tasks; group work per partition or per model selection.
- Use deferrable sensors (Airflow) or sensors with long intervals to avoid occupying slots.
- Parallelize independent branches; cap concurrency against shared sources.
- Keep DAG files cheap to parse.

## Cost Controls
| Control | Example |
|---|---|
| Auto-suspend compute | Snowflake `AUTO_SUSPEND = 60` |
| Query/job timeouts | `STATEMENT_TIMEOUT_IN_SECONDS`, BigQuery `maximum_bytes_billed` |
| Spot/preemptible workers for batch | With retries and checkpointing |
| Tagging | Query tags / labels per pipeline for chargeback |
| Retention | Expire snapshots and old partitions |

## Tuning Workflow
1. Pick the most expensive or critical-path job.
2. Read its profile: scan size, shuffle, spill, skew.
3. Apply one change (layout, join strategy, incremental logic).
4. Re-run on the same input; compare duration and cost.
5. Keep the change only if it helps; record the result.

## Checklist
- [ ] Top jobs by cost and duration identified from metrics
- [ ] Tables compacted with sensible file sizes
- [ ] Partitioning/clustering matches query filters
- [ ] Incremental models limit target scans
- [ ] Spark AQE on; skew and broadcast handled
- [ ] Timeouts, auto-suspend and cost tags configured
