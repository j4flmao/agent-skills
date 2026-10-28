# Lake Table Maintenance Operations

The recurring jobs every lake table needs: compaction, delete-file cleanup, snapshot/log expiration, orphan file removal, manifest/metadata maintenance and statistics. Includes commands per format and a scheduling model.

## Why Maintenance Is Mandatory

Every commit adds metadata, and streaming or MERGE-heavy writes add small files and delete files. Without maintenance: planning slows, queries read more files, storage holds data that should be deleted, and time-travel metadata grows without bound.

## Operations by Format

| Operation | Delta | Iceberg (Spark) | Hudi |
|---|---|---|---|
| Compaction | `OPTIMIZE t [WHERE ...]` | `CALL sys.rewrite_data_files(...)` | clustering (`run_clustering`) |
| Clustering / sort | `OPTIMIZE t ZORDER BY (...)` or liquid `OPTIMIZE t` | `rewrite_data_files(strategy => 'sort', ...)` | clustering with sort columns |
| Apply deletes | `REORG TABLE t APPLY (PURGE)` (deletion vectors) | `rewrite_position_delete_files`; data-file rewrite applies equality deletes | MoR compaction (`run_compaction`) |
| Remove old versions | `VACUUM t RETAIN 168 HOURS` | `expire_snapshots(...)` | cleaner (`hoodie.cleaner.*`, `run_clean`) |
| Remove failed-write files | `VACUUM` (unreferenced files) | `remove_orphan_files(...)` | cleaner/rollback |
| Metadata compaction | log checkpoints (automatic) | `rewrite_manifests`, `write.metadata.delete-after-commit.enabled` | metadata table compaction (automatic) |
| Statistics | `ANALYZE TABLE t COMPUTE STATISTICS` / stats collection | `compute_table_stats` (Puffin NDV, newer versions) | column stats index in metadata table |

## Iceberg Maintenance Job (Spark SQL)

```sql
-- 1. Compact recent partitions that received many small files
CALL lake.system.rewrite_data_files(
  table => 'silver.orders',
  where => 'order_ts >= current_date() - INTERVAL 7 DAYS',
  options => map(
    'target-file-size-bytes', '268435456',
    'min-input-files', '5',
    'partial-progress.enabled', 'true',
    'max-concurrent-file-group-rewrites', '10'));

-- 2. Rewrite position delete files (merge-on-read tables)
CALL lake.system.rewrite_position_delete_files(table => 'silver.orders');

-- 3. Expire snapshots older than 7 days but keep at least 50
CALL lake.system.expire_snapshots(
  table => 'silver.orders',
  older_than => TIMESTAMP '2026-10-20 00:00:00',
  retain_last => 50);

-- 4. Remove orphan files older than 3 days (must exceed the longest write duration)
CALL lake.system.remove_orphan_files(
  table => 'silver.orders',
  older_than => TIMESTAMP '2026-10-24 00:00:00');

-- 5. Recluster manifests when planning gets slow
CALL lake.system.rewrite_manifests('silver.orders');
```

Compute the timestamps in the scheduler, not hard-coded.

## Delta Maintenance Job

```sql
OPTIMIZE lake.silver.orders WHERE order_date >= current_date() - INTERVAL 7 DAYS;
REORG TABLE lake.silver.orders APPLY (PURGE);          -- only when deletion vectors are used
VACUUM lake.silver.orders RETAIN 168 HOURS;            -- dry run first: VACUUM ... DRY RUN
```

VACUUM refuses retention below `delta.deletedFileRetentionDuration` unless `spark.databricks.delta.retentionDurationCheck.enabled=false`; do not disable this check in production.

## Hudi Maintenance

- Inline vs async table services: `hoodie.compact.inline`, `hoodie.clustering.inline`, `hoodie.clean.automatic`, or run via `HoodieCompactor` / Spark SQL procedures (`CALL run_compaction(op => 'run', table => 't')`).
- Cleaner retention: `hoodie.cleaner.policy=KEEP_LATEST_COMMITS`, `hoodie.cleaner.commits.retained=N` — bounds incremental query and time-travel horizon.

## Scheduling Model

| Table type | Compaction | Expire / vacuum | Orphan cleanup |
|---|---|---|---|
| Streaming append | hourly to daily on recent partitions | daily | weekly |
| Streaming upsert (MoR) | hourly + delete-file rewrite | daily | weekly |
| Daily batch | weekly or after large loads | daily/weekly | weekly |
| Rarely written | on demand | weekly | monthly |

Run maintenance as its own orchestrated job per table (or table group), with locking so two maintenance runs never overlap on one table.

## Retention Settings Must Agree

```
time-travel promise to users  <=  snapshot/version retention
streaming consumer max lag    <   snapshot/version retention
longest write job duration    <   orphan file age threshold
```

Violating the last rule deletes files of in-progress writes.

## Monitoring Table Health

```sql
-- Iceberg: small files per partition
SELECT partition, count(*) AS files, avg(file_size_in_bytes)/1048576 AS avg_mb
FROM lake.silver.orders.files GROUP BY partition ORDER BY files DESC LIMIT 20;

-- Iceberg: snapshot count and delete files
SELECT count(*) FROM lake.silver.orders.snapshots;
SELECT content, count(*) FROM lake.silver.orders.files GROUP BY content;  -- 0 data, 1 pos deletes, 2 eq deletes
```

Delta: `DESCRIBE DETAIL t` (numFiles, sizeInBytes), `DESCRIBE HISTORY t`.

Alert on: average file size below target, delete-file count rising, snapshot count above budget, maintenance job failures.

## Checklist
- [ ] Every table has compaction, expiration and orphan cleanup scheduled
- [ ] Retention thresholds consistent with time travel, consumers and job durations
- [ ] Maintenance scoped to avoid conflicts with active writers
- [ ] Table health metrics collected and alerted
- [ ] Dry runs used before first VACUUM/orphan cleanup on a table
