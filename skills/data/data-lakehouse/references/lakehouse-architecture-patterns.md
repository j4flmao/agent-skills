# Lakehouse Data Modeling Patterns

Table design patterns that work well on open table formats: fact and dimension tables, snapshot tables, SCD2, wide denormalized tables, aggregates, and how to choose partitioning and clustering for each. Write mechanics are in `architecture-patterns.md`.

## 1. Pattern Summary

| Pattern | Grain | Write mode | Layout |
|---|---|---|---|
| Event fact | One row per event | Append | Partition by event day; cluster by common filter key |
| Transaction fact | One row per business transaction | MERGE on business key | Partition by transaction date |
| Periodic snapshot | One row per entity per period | Overwrite partition | Partition by snapshot date |
| Accumulating snapshot | One row per process instance, updated through milestones | MERGE | Cluster by instance key |
| SCD Type 1 dimension | Current state per key | MERGE (update in place) | Small: no partitioning |
| SCD Type 2 dimension | One row per key per version | MERGE (close + insert) | Cluster by key, filter `is_current` |
| Aggregate / mart | Pre-computed metrics | Overwrite partitions | Partition by period |
| One Big Table (OBT) | Denormalized fact + dims | Rebuild or MERGE | Cluster by top filter columns |

## 2. Partitioning Rules

- Partition only on columns used in most filters and with bounded cardinality (dates, region). Aim for partitions of at least several hundred MB to a few GB.
- Iceberg hidden partitioning: partition on `days(event_ts)`; queries filter on `event_ts` and still prune. No separate `event_date` column needed.
- Delta: prefer liquid clustering (`CLUSTER BY`) over Hive-style partitioning for most new tables; it adapts to skew and lets you change keys without rewriting.
- Do not partition small tables (< ~1 GB): one partition, rely on file stats.

```sql
-- Iceberg event fact
CREATE TABLE lake.gold.fct_page_view (
  view_id STRING, user_id BIGINT, page STRING, country STRING, viewed_at TIMESTAMP
) USING iceberg
PARTITIONED BY (days(viewed_at))
TBLPROPERTIES ('write.distribution-mode' = 'hash');
ALTER TABLE lake.gold.fct_page_view WRITE ORDERED BY country, user_id;

-- Delta transaction fact with liquid clustering
CREATE TABLE gold.fct_order (order_id BIGINT, customer_id BIGINT, order_date DATE, amount DECIMAL(18,2))
USING delta CLUSTER BY (order_date, customer_id);
```

## 3. Periodic Snapshot Tables

Daily balance or inventory snapshots are cheap to rebuild and easy to reason about:

```python
snapshot = compute_balances(spark, as_of=day).withColumn("snapshot_date", F.lit(day))
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
snapshot.writeTo("lake.gold.account_balance_daily").overwritePartitions()
```

Alternative: keep only the current table and use time travel or tags for history. That depends on snapshot retention and is unsuitable for long-term history; materialize snapshots when history must outlive retention.

## 4. SCD Type 2 Dimensions

Columns: business key, attributes, `row_hash`, `valid_from`, `valid_to` (NULL when current), `is_current`. The MERGE pattern is in `architecture-patterns.md` §7.

Query patterns:

```sql
-- current view
CREATE OR REPLACE VIEW lake.gold.dim_customer_current AS
SELECT * FROM lake.gold.dim_customer WHERE is_current;

-- point-in-time join
SELECT f.order_id, d.segment
FROM lake.gold.fct_order f
JOIN lake.gold.dim_customer d
  ON f.customer_id = d.customer_id
 AND f.order_ts >= d.valid_from
 AND (d.valid_to IS NULL OR f.order_ts < d.valid_to);
```

## 5. Change Feeds as a Modeling Input

Instead of diffing full tables, downstream models read changes:
- Delta Change Data Feed: `_change_type` (`insert`, `update_preimage`, `update_postimage`, `delete`), `_commit_version`, `_commit_timestamp`.
- Iceberg `create_changelog_view` procedure produces a view with `_change_type` and `_change_ordinal`.
- Paimon changelog via `changelog-producer`.

Use them to keep aggregates and SCD2 dimensions incremental.

## 6. Denormalized / One Big Table

Pros: simple BI, fewer joins, good with columnar pruning. Cons: wide rewrites when a dimension attribute changes, duplicated storage.

Use OBT for read-heavy dashboards over stable dimensions. Keep the normalized fact and dimension tables as the source and rebuild OBT from them.

## 7. Keys and Constraints

- Table formats do not enforce primary or foreign keys (Paimon primary keys define merge behaviour, not uniqueness across all writers). Enforce uniqueness in the pipeline (dedupe before MERGE) and verify with tests.
- Delta supports `NOT NULL` and `CHECK` constraints enforced on write; Unity Catalog accepts informational `PRIMARY KEY`/`FOREIGN KEY` constraints used by the optimizer and tools.
- Use surrogate keys for SCD2 dimensions (`xxhash64(customer_id, valid_from)` or an identity column on Delta: `GENERATED ALWAYS AS IDENTITY`).

## Pitfalls

- Partitioning by a high-cardinality column (user ID): millions of tiny files.
- Over-partitioning by hour on modest data volumes.
- Relying on time travel as the history mechanism for compliance or analytics beyond retention.
- SCD2 without a `row_hash`: every load creates new versions for unchanged rows.

## Checklist

- [ ] Each table's grain and pattern documented.
- [ ] Partitioning/clustering justified by query filters and data volume.
- [ ] Uniqueness enforced in pipelines and tested.
- [ ] Incremental models consume change feeds where available.
- [ ] Long-term history materialized, not dependent on snapshot retention.
