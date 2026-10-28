# Lakehouse File Layout Optimization: Compaction, Clustering, Sorting

Storage layout is the biggest lever on lakehouse query performance and cost. This reference covers file sizing, compaction, sort orders, Z-order, liquid clustering, and partition evolution. Query-engine settings are in `performance-optimization.md`; write-job tuning in `performance_tuning.md`.

## 1. Why Layout Matters

Engines skip data at three levels: partitions, files (column min/max stats), and Parquet row groups/pages. Skipping works only when values that are queried together are stored together, and file counts stay manageable. Many tiny files mean more metadata, more object-store requests, and more task overhead.

## 2. File Size Targets

| Table type | Target file size |
|---|---|
| Large batch fact tables | 256 MB – 1 GB (Iceberg default target 512 MB) |
| Frequently merged tables | 64 – 256 MB (less rewrite per update) |
| Streaming bronze | Accept small files at write; compact to the target later |

Iceberg: `write.target-file-size-bytes`. Delta: `delta.targetFileSize` (where supported) or `OPTIMIZE` defaults; Databricks can autotune by table size.

## 3. Compaction

Iceberg:

```sql
-- bin-pack recent partitions only
CALL lake.system.rewrite_data_files(
  table => 'silver.orders',
  where => 'order_ts >= current_date() - INTERVAL 2 DAYS',
  options => map(
    'min-input-files', '5',
    'target-file-size-bytes', '268435456',
    'partial-progress.enabled', 'true',
    'max-concurrent-file-group-rewrites', '10'));

-- remove applied position deletes
CALL lake.system.rewrite_position_delete_files(table => 'silver.orders');
-- merge small manifests
CALL lake.system.rewrite_manifests('silver.orders');
```

`partial-progress.enabled` commits file groups as they finish, so a failure does not lose all work and conflicts are smaller.

Delta:

```sql
OPTIMIZE silver.orders WHERE order_date >= current_date() - INTERVAL 2 DAYS;
```

Trino (Iceberg): `ALTER TABLE silver.orders EXECUTE optimize(file_size_threshold => '128MB')`.

Managed options: Databricks predictive optimization, S3 Tables automatic compaction, Snowflake-managed Iceberg tables.

## 4. Sorting and Z-Ordering

Sorting by a frequently filtered column makes per-file min/max ranges narrow, so filters skip most files.

```sql
-- Iceberg: declare table sort order (used by writers and sort compaction)
ALTER TABLE lake.silver.events WRITE ORDERED BY event_type, user_id;

CALL lake.system.rewrite_data_files(table => 'silver.events', strategy => 'sort');

-- Multi-column filters: Z-order interleaves columns
CALL lake.system.rewrite_data_files(
  table => 'silver.events', strategy => 'sort', sort_order => 'zorder(user_id, device_id)');
```

```sql
-- Delta without liquid clustering
OPTIMIZE silver.events ZORDER BY (user_id, device_id);
```

Guidance:
- Sort/Z-order on 1–4 columns used in selective filters; effectiveness drops with more columns.
- Partition column first in thought: sorting within a date partition by `user_id` is common.
- Z-order is not incremental in Delta: re-running rewrites clustered files again; prefer liquid clustering on Delta.

## 5. Liquid Clustering (Delta)

```sql
CREATE TABLE silver.events (...) USING delta CLUSTER BY (event_date, user_id);
ALTER TABLE silver.events CLUSTER BY (event_date, tenant_id);   -- change keys, no immediate rewrite
OPTIMIZE silver.events;                                          -- incrementally clusters new data
OPTIMIZE silver.events FULL;                                     -- recluster all data after key change
```

Replaces both Hive partitioning and Z-order for most new Delta tables. Not compatible with Hive-style partitioning on the same table. `CLUSTER BY AUTO` on Databricks lets the platform choose keys from query history.

## 6. Partition Evolution (Iceberg)

```sql
ALTER TABLE lake.silver.events REPLACE PARTITION FIELD days(event_ts) WITH hours(event_ts);
```

Old data stays in the old layout; queries span both specs transparently. Rewrite historical data only if old partitions are hot and the old layout hurts.

## 7. Column Statistics and Bloom Filters

```sql
ALTER TABLE lake.silver.events SET TBLPROPERTIES (
  'write.metadata.metrics.default' = 'none',
  'write.metadata.metrics.column.event_ts' = 'full',
  'write.metadata.metrics.column.user_id' = 'full',
  'write.metadata.metrics.column.event_type' = 'counts',
  'write.parquet.bloom-filter-enabled.column.session_id' = 'true'
);
```

- Wide tables: limit stats to filtered columns to keep manifests small.
- Delta: put filtered columns within the first `delta.dataSkippingNumIndexedCols` columns or list them in `delta.dataSkippingStatsColumns`.
- Bloom filters help point lookups on high-cardinality columns that sorting cannot cluster.

## 8. Maintenance Schedule Template

| Task | Frequency | Scope |
|---|---|---|
| Bin-pack compaction | Hourly–daily | Recent partitions |
| Sort/cluster compaction | Daily–weekly | Partitions finished receiving late data |
| Delete-file rewrite / purge | Daily on MoR tables | Partitions with deletes |
| Manifest rewrite | Weekly | Whole table |
| Snapshot expiry / log cleanup | Daily | Whole table |
| Orphan file removal / VACUUM | Weekly | Whole table, retention ≥ longest job |

## Pitfalls

- Compacting the whole table every run: rewrites cold data repeatedly and conflicts with writers.
- Z-ordering on low-cardinality columns or columns never filtered.
- Changing clustering keys and expecting old data to change without a full optimize.
- Collecting stats on hundreds of columns: manifest bloat slows planning.

## Checklist

- [ ] Target file size set per table.
- [ ] Compaction scoped to recent/changed partitions and scheduled.
- [ ] Sort order or clustering keys chosen from real query filters.
- [ ] Stats collection configured for filtered columns.
- [ ] Layout effectiveness checked (files scanned vs total) after changes.
