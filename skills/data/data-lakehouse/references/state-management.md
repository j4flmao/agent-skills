# Lakehouse Table State: Snapshots, Retention, Branches, Checkpoints

Lakehouse tables are versioned state machines. This reference covers managing that state: snapshot/version retention, time travel windows, expiry and vacuum, branches and tags, orphan files, and streaming checkpoints that track progress through table versions.

## 1. State Objects

| Object | Iceberg | Delta | Lives in |
|---|---|---|---|
| Table version | Snapshot (`snapshot_id`) | Version number | Metadata JSON / `_delta_log` |
| Current pointer | Catalog → metadata file | Latest log entry | Catalog / storage |
| Named refs | Branches, tags | n/a (use version numbers) | Table metadata |
| Unreferenced files | Orphan files | Files removed from log, awaiting VACUUM | Storage |
| Consumer progress | Streaming checkpoint (last snapshot ID) | Streaming checkpoint (last version) | Checkpoint location |

## 2. Retention Settings

Iceberg:

```sql
ALTER TABLE lake.silver.orders SET TBLPROPERTIES (
  'history.expire.max-snapshot-age-ms' = '604800000',     -- 7 days
  'history.expire.min-snapshots-to-keep' = '10',
  'write.metadata.delete-after-commit.enabled' = 'true',
  'write.metadata.previous-versions-max' = '50'
);
CALL lake.system.expire_snapshots(table => 'silver.orders');   -- uses table properties
```

Delta:

```sql
ALTER TABLE silver.orders SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 30 days',
  'delta.deletedFileRetentionDuration' = 'interval 7 days'
);
VACUUM silver.orders;   -- deletes unreferenced files older than deletedFileRetentionDuration
```

Effective time-travel window: Iceberg = snapshots not yet expired; Delta = min(log retention, files not vacuumed). Delta refuses `VACUUM` with retention under 7 days unless `spark.databricks.delta.retentionDurationCheck.enabled=false`; keep the check on.

## 3. Choosing Retention

| Factor | Pushes retention |
|---|---|
| Rollback after bad deploys | Longer (cover time to detect issues) |
| Downstream streaming/incremental lag | Longer than max consumer lag |
| Long-running queries | Longer than the longest query |
| Storage cost on frequently rewritten tables | Shorter |
| Privacy erasure deadlines | Shorter (deleted data persists until expiry/vacuum) |

A common baseline is 7 days, adjusted per table. Use tags for anything that must be kept longer.

## 4. Branches and Tags (Iceberg)

```sql
ALTER TABLE lake.gold.revenue CREATE TAG `fy2026-close` RETAIN 2555 DAYS;       -- audit snapshot
ALTER TABLE lake.gold.revenue CREATE BRANCH experiment RETAIN 14 DAYS
  WITH SNAPSHOT RETENTION 5 SNAPSHOTS;
ALTER TABLE lake.gold.revenue DROP BRANCH experiment;
SELECT * FROM lake.gold.revenue.refs;
```

- Tags pin a snapshot (and its files) beyond normal expiry: use for period closes, model training sets, regulatory reporting.
- Branches carry independent history: use for write-audit-publish and experiments.
- Expired-but-tagged snapshots keep their files; account for the storage.

Catalog-level versioning (Nessie) adds branches/tags across many tables, with its own garbage collection.

## 5. Orphan Files

Files not referenced by any snapshot, left by failed writes or aborted jobs.

```sql
CALL lake.system.remove_orphan_files(
  table => 'silver.orders',
  older_than => TIMESTAMP '2026-10-24 00:00:00',   -- well beyond any in-flight write
  dry_run => true);
```

Run with `dry_run => true` first. Do not use a short `older_than`: files of commits in progress look orphaned. Delta's `VACUUM` covers this case for Delta tables (`VACUUM ... DRY RUN` lists candidates).

## 6. Streaming Checkpoints

A streaming query's checkpoint records source offsets (Kafka offsets, table versions), state store data, and committed batch IDs.

| Rule | Reason |
|---|---|
| One checkpoint per query, durable storage | Exactly-once depends on it |
| Back up checkpoint path with the job definition | Lost checkpoint means reprocessing |
| Retention of source table ≥ max lag of reader | Otherwise the stream fails on missing files/versions |
| Changing query semantics → new checkpoint + planned start position | Old state may be incompatible |

Restarting a Delta stream from a specific point: `.option("startingVersion", n)` (with a new checkpoint). Iceberg: `.option("stream-from-timestamp", millis)`.

## 7. Job State and Watermarks for Batch Incrementals

Batch jobs processing increments need their own state:

```sql
CREATE TABLE IF NOT EXISTS lake.ops.job_watermarks (
  job STRING, source_table STRING, last_snapshot_id BIGINT, updated_at TIMESTAMP
) USING iceberg;
```

```python
last = get_watermark("gold_revenue", "lake.silver.orders")
current = spark.sql("SELECT snapshot_id FROM lake.silver.orders.snapshots ORDER BY committed_at DESC LIMIT 1").first().snapshot_id
changes = (spark.read.format("iceberg")
           .option("start-snapshot-id", last)        # exclusive
           .option("end-snapshot-id", current)        # inclusive
           .load("lake.silver.orders"))              # appended data only
process(changes)
set_watermark("gold_revenue", "lake.silver.orders", current)   # after successful write
```

Iceberg incremental reads cover appends only; for updates/deletes use the changelog view or Delta CDF. Update the watermark only after the output commit succeeds; with WAP, after publishing.

## 8. Maintenance Ordering

```
1. compaction (rewrite_data_files / OPTIMIZE)
2. expire_snapshots / log cleanup
3. remove_orphan_files / VACUUM
```

Compaction first so the replaced files become unreferenced and are removed in the same cycle.

## Pitfalls

- Expiry/vacuum shorter than the slowest downstream consumer.
- Turning off Delta's retention safety check.
- Snapshot expiry never run on streaming tables: thousands of snapshots, slow planning.
- Watermark updated before the write commits: data skipped on failure.
- Tags created casually with no retention, pinning storage indefinitely.

## Checklist

- [ ] Retention set per table and documented with its rationale.
- [ ] Expiry, orphan cleanup/vacuum scheduled in the correct order.
- [ ] Long-term needs met with tags or materialized snapshots.
- [ ] Streaming checkpoints durable, unique, and backed up.
- [ ] Incremental batch jobs track watermarks transactionally after commit.
