# Lakehouse Query Performance Optimization

Read-side optimization: getting engines to scan less data and execute joins and aggregations efficiently over lakehouse tables. File layout (compaction, clustering) is in `lakehouse-performance-optimization.md`; write-job tuning in `performance_tuning.md`.

## 1. Diagnose First

1. Get the plan: `EXPLAIN FORMATTED` (Spark), `EXPLAIN ANALYZE` (Trino), query profile (Databricks SQL, Snowflake).
2. Compare files/bytes scanned with table size. If a selective query reads most files, skipping is failing.
3. Look for skewed tasks, spills, and large shuffles.
4. Check planning time separately from execution; slow planning points to metadata (manifests, log size).

## 2. Skipping Hierarchy

| Level | Mechanism | Requirement |
|---|---|---|
| Partition pruning | Partition values in metadata | Filter on the partition source column (Iceberg) or partition column (Delta/Hive) |
| File skipping | Min/max/null stats per file | Data clustered on the filter column; stats collected |
| Row-group skipping | Parquet footer stats, page indexes | Sorted data within files |
| Bloom filters | Parquet bloom filters | Enabled for the column; equality predicates |
| Dynamic pruning | Runtime filters from joins | Engine support (Spark DPP, Trino dynamic filtering) |

## 3. Write Filters That Prune

```sql
-- Good: direct predicate on the source column; Iceberg prunes days(event_ts) partitions
SELECT count(*) FROM lake.silver.events
WHERE event_ts >= TIMESTAMP '2026-10-01' AND event_ts < TIMESTAMP '2026-10-02';

-- Bad: function on the column defeats pruning in many engines
SELECT count(*) FROM lake.silver.events
WHERE date_format(event_ts, 'yyyy-MM-dd') = '2026-10-01';

-- Bad: implicit cast from string comparison on a timestamp column
SELECT count(*) FROM lake.silver.events WHERE CAST(event_ts AS STRING) LIKE '2026-10-01%';
```

- Use half-open ranges on timestamps rather than wrapping columns in functions.
- Match literal types to column types.
- Push filters into subqueries/CTEs that feed joins; most engines do this, but views with UDFs may block it.

## 4. Projection

- Select only needed columns; columnar formats read only the referenced columns.
- `SELECT *` on wide tables in views used by BI multiplies I/O.
- Nested structs: engines with nested-column pruning read only accessed fields (`spark.sql.optimizer.nestedSchemaPruning.enabled`, default true).

## 5. Joins

| Situation | Approach |
|---|---|
| Large fact × small dimension | Broadcast the dimension (`/*+ BROADCAST(d) */`, raise `spark.sql.autoBroadcastJoinThreshold` if the dim is slightly larger) |
| Fact × fact on a key | Sort-merge join; bucket/cluster both on the join key if repeated often |
| Selective dimension filter | Rely on dynamic partition pruning (`spark.sql.optimizer.dynamicPartitionPruning.enabled`, default true) |
| Skewed key | AQE skew join (`spark.sql.adaptive.skewJoin.enabled`), or salt the key |

Iceberg storage-partitioned joins avoid shuffles when both tables share compatible bucket partitioning (`spark.sql.sources.v2.bucketing.enabled=true` plus related Iceberg settings).

## 6. Aggregations and Pre-Computation

- Pre-aggregate hot dashboard queries into gold tables or materialized views (Databricks materialized views, Trino/Starburst materialized views, StarRocks async MVs, Dremio reflections).
- Approximate functions (`approx_count_distinct`, HyperLogLog sketches) for large distinct counts where exactness is not required.
- Partition aggregates by period so refresh rewrites only changed periods.

## 7. Caching

| Cache | Scope |
|---|---|
| Engine result cache (Databricks SQL, Snowflake) | Identical queries over unchanged data |
| Local disk/file cache (Databricks disk cache, Trino file system cache, StarRocks data cache) | Hot Parquet files near compute |
| Spark `CACHE TABLE` / `.cache()` | Reuse within one job; avoid in long-lived shared clusters |

Snapshot-based formats make caches safe: a new commit produces new files, so stale files are not served for the new version.

## 8. Metadata and Planning Speed

- Compact manifests (`rewrite_manifests`) and expire snapshots; planning reads manifest lists and manifests.
- Delta: checkpoints every `delta.checkpointInterval` commits; very frequent small commits increase log replay.
- Limit per-column stats on wide tables.
- Iceberg distributed planning (`read.planning-mode` / Spark `spark.sql.iceberg.planning-mode`) helps very large tables in recent releases.

## 9. Example: Investigating a Slow Query

```sql
EXPLAIN FORMATTED
SELECT c.segment, sum(o.amount)
FROM lake.silver.orders o JOIN lake.gold.dim_customer c ON o.customer_id = c.customer_id
WHERE o.order_ts >= TIMESTAMP '2026-10-01' AND c.is_current
GROUP BY c.segment;
```

Check in the plan: `PushedFilters`/runtime filters on `orders`, the number of files selected by the scan, a `BroadcastHashJoin` for `dim_customer`, and whether AQE coalesced shuffle partitions. Then compare scan metrics in the Spark UI (files read, bytes, pruning).

## Pitfalls

- Optimizing SQL when the real problem is unclustered data.
- Forcing broadcast of a table that grows over time; it eventually OOMs the driver/executors.
- Caching large DataFrames on shared clusters, starving other jobs.
- Views with UDFs or casts that block pushdown, hidden from BI users.

## Checklist

- [ ] Plans checked for pruning, pushed filters, and join strategy.
- [ ] Filters written on raw columns with matching types.
- [ ] Hot queries served from pre-aggregates or materialized views.
- [ ] Metadata kept compact (manifests, snapshots, checkpoints).
- [ ] Query performance tracked over time for key dashboards.
