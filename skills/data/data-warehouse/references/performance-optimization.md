# Warehouse Query Performance Optimization

Platform-specific techniques to make warehouse queries faster and cheaper on Snowflake, BigQuery, and Redshift: data layout (partitioning, clustering, sort/dist keys), pruning, materialization, and diagnosing slow queries. Cost governance is in `warehouse-cost-optimization.md`.

## General Principles

1. Scan less: prune partitions/micro-partitions with selective filters on layout columns.
2. Move less: avoid large shuffles/redistributions in joins.
3. Compute once: precompute expensive aggregations that many queries share.
4. Read only needed columns: columnar engines charge for each column read.
5. Measure with the query profile, not intuition.

## Diagnose First

| Platform | Tool | Look for |
|----------|------|----------|
| Snowflake | Query Profile, `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` | Partitions scanned vs total, bytes spilled to local/remote storage, exploding joins, queueing time |
| BigQuery | Execution details, `INFORMATION_SCHEMA.JOBS` | Bytes processed, slot milliseconds, stage with most shuffle, skew (max vs avg) |
| Redshift | `EXPLAIN`, `SYS_QUERY_HISTORY`, `SYS_QUERY_DETAIL`, `SVV_TABLE_INFO` | `DS_BCAST_INNER`/`DS_DIST_BOTH` redistribution, disk-based steps, unsorted %, skew |

```sql
-- Snowflake: heaviest queries in the last 7 days
SELECT query_id, warehouse_name, total_elapsed_time/1000 AS seconds,
       partitions_scanned, partitions_total, bytes_spilled_to_remote_storage
FROM snowflake.account_usage.query_history
WHERE start_time > DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY total_elapsed_time DESC
LIMIT 20;
```

## Snowflake

| Technique | When |
|-----------|------|
| Natural ingestion order | Tables loaded in time order already prune well on time filters |
| Clustering keys (`CLUSTER BY (event_date, tenant_id)`) | Multi-TB tables with poor pruning on common filters; automatic reclustering costs credits |
| Search Optimization Service | Selective point lookups/equality and substring searches on large tables |
| Materialized views | Repeated aggregations on a single table (Enterprise edition; limited SQL support) |
| Dynamic tables | Declarative incremental pipelines with target lag |
| Query Acceleration Service | Outlier queries with large scans on a warehouse |
| Warehouse sizing | Larger size for big single queries (spilling); multi-cluster for concurrency |

```sql
ALTER TABLE events CLUSTER BY (event_date, tenant_id);
SELECT SYSTEM$CLUSTERING_INFORMATION('events', '(event_date, tenant_id)');
ALTER TABLE customers ADD SEARCH OPTIMIZATION ON EQUALITY(email);
```

- Spilling to remote storage means the warehouse is too small for the query or the join explodes.
- Result cache returns identical queries for free if underlying data has not changed; avoid non-deterministic functions in dashboard queries when you want cache hits.

## BigQuery

| Technique | Notes |
|-----------|-------|
| Partitioning | By ingestion time, a `DATE`/`TIMESTAMP` column, or integer range; set `require_partition_filter = TRUE` on large tables |
| Clustering | Up to 4 columns; improves pruning within partitions and is maintained automatically |
| Materialized views | Incremental refresh; smart tuning rewrites queries to use them |
| BI Engine | In-memory acceleration for dashboard queries |
| Search indexes | `CREATE SEARCH INDEX` for text/point lookups with `SEARCH()` |
| Avoid `SELECT *` | Bytes billed by columns read; `LIMIT` does not reduce bytes on non-clustered tables |

```sql
CREATE TABLE analytics.events
PARTITION BY DATE(event_ts)
CLUSTER BY tenant_id, event_type
OPTIONS (require_partition_filter = TRUE, partition_expiration_days = 400)
AS SELECT * FROM staging.events;
```

- Filters must be on the partition column directly; wrapping it in functions or comparing to subquery results can prevent pruning.
- Partition counts are limited per table (on the order of thousands); prefer daily or monthly granularity accordingly.
- Use `APPROX_COUNT_DISTINCT` and HyperLogLog++ sketches for large distinct counts when exactness is not required.

## Redshift

| Technique | Notes |
|-----------|-------|
| Distribution style | `AUTO` (default) adapts; `KEY` on the common join column for large fact-to-fact joins; `ALL` for small dimensions; `EVEN` for no joins |
| Sort keys | `AUTO` or compound sort key on the most common range filter (usually date) |
| Automatic table optimization | Lets Redshift choose dist/sort keys from workload |
| Materialized views | With auto refresh and automatic query rewrite |
| Concurrency scaling / Serverless RPUs | Burst capacity for concurrent workloads |
| VACUUM / ANALYZE | Mostly automatic; check unsorted % and stats staleness on heavily updated tables |

```sql
CREATE TABLE marts.fct_orders (
  order_id BIGINT, customer_id BIGINT, order_date DATE, amount NUMERIC(12,2)
)
DISTSTYLE KEY DISTKEY (customer_id)
SORTKEY (order_date);
```

Check skew and stats:

```sql
SELECT "table", diststyle, skew_rows, unsorted, stats_off
FROM svv_table_info ORDER BY size DESC LIMIT 20;
```

## SQL Patterns That Matter Everywhere

| Pattern | Better alternative |
|---------|-------------------|
| `SELECT *` in models and dashboards | Explicit columns |
| Filtering after joins | Filter (and pre-aggregate) before joining |
| `DISTINCT` to hide join fan-out | Fix join keys/grain |
| Correlated subqueries | Joins or window functions |
| `OR` across different columns in join conditions | `UNION ALL` of separate joins |
| Functions on filter columns (`DATE(ts) = ...`) | Range predicates on the raw column, or partition on the derived column |
| Repeated CTE evaluation | Materialize intermediate results when reused heavily (engines may re-evaluate CTEs) |
| Large `ORDER BY` without `LIMIT` | Sort only in the final presentation step |

## Materialization Strategy (dbt)

| Materialization | Use |
|-----------------|-----|
| `view` | Light staging logic, low query volume |
| `table` | Heavily queried marts, full rebuild cheap enough |
| `incremental` | Large facts; `merge`/`insert_overwrite`/`microbatch` strategies with partition pruning |
| Materialized view / dynamic table | Platform-managed incremental refresh |

```sql
{{ config(materialized='incremental', unique_key='event_id',
          incremental_strategy='merge', cluster_by=['event_date']) }}
select * from {{ ref('stg_events') }}
{% if is_incremental() %}
where event_date >= (select dateadd(day, -3, max(event_date)) from {{ this }})
{% endif %}
```

The lookback window handles late-arriving data; the merge key prevents duplicates.

## Concurrency and Dashboards

- Pre-aggregate dashboard tables at the grain the dashboard needs.
- Use BI extracts/caches or acceleration (BI Engine, result cache) for high-traffic dashboards.
- Separate dashboard compute from ELT compute.

## Pitfalls

- Clustering small tables (no benefit, ongoing cost).
- Over-partitioning (hourly partitions on small BigQuery tables).
- `DISTKEY` on a low-cardinality column causing skew.
- Scaling up the warehouse to hide an exploding join.

## Checklist

- [ ] Top expensive queries reviewed monthly with profiles
- [ ] Large tables partitioned/clustered/sorted on real filter columns
- [ ] Partition filters required on very large BigQuery tables
- [ ] Incremental models with lookback windows
- [ ] Join fan-out and spilling eliminated, not masked
- [ ] Dashboard workloads pre-aggregated and isolated
