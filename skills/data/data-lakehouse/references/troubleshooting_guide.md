# Lakehouse Troubleshooting Guide

Symptom → cause → fix for common lakehouse problems with Iceberg, Delta, and the engines around them.

## 1. Quick Triage

```
Is the problem a failure or slowness?
├── Failure
│   ├── At commit → §2 commit conflicts / §3 unknown state
│   ├── At read  → §4 missing files / §5 schema or protocol
│   └── At startup → §8 configuration / dependency
└── Slowness
    ├── Planning slow → §6 metadata bloat
    ├── Scan heavy → §7 small files / poor clustering
    └── Shuffle/skew → performance_tuning.md
```

## 2. Commit Conflicts

| Error | Cause | Fix |
|---|---|---|
| Iceberg `CommitFailedException: ... metadata location has changed` | Another writer committed first and retries were exhausted | Raise `commit.retry.num-retries`; reduce concurrent writers; retry the whole unit |
| Iceberg `ValidationException: Found conflicting files` | Concurrent writes touched the same data under serializable isolation | Partition the work; add partition predicates; consider `snapshot` isolation where semantics allow |
| Delta `ConcurrentAppendException` | Concurrent append to a partition the transaction read | Disjoint partitions; explicit partition predicates in MERGE/DELETE |
| Delta `ConcurrentDeleteReadException` / `ConcurrentDeleteDeleteException` | Concurrent operation removed files this transaction read/deleted (often compaction) | Schedule OPTIMIZE away from writers or limit it to cold partitions |
| Delta `MetadataChangedException` | Schema or properties changed concurrently | Serialize DDL with writes |

## 3. Commit State Unknown

`CommitStateUnknownException` (Iceberg): the catalog may have accepted the commit. Do not delete written files. Check recent snapshots for the job's `snapshot-property` marker; if present, treat as success; otherwise retry. Remaining files are cleaned by orphan removal later.

## 4. Missing Files

| Symptom | Cause | Fix |
|---|---|---|
| `FileNotFoundException` reading a Delta table | `VACUUM` removed files a long query or stream still needed | Restart reader from current version; raise retention above max reader duration |
| Iceberg reader fails on a data file | `remove_orphan_files` with too-short `older_than` deleted in-flight files, or manual deletion | Roll back to a snapshot whose files exist; restore from storage versioning; never use short orphan thresholds |
| Stream fails: version/snapshot no longer available | Source expired history beyond consumer lag | Restart with new checkpoint from an available position; reprocess gap from bronze |
| Time travel fails for old version | Snapshot expired / log cleaned | Expected; use tags for versions that must be kept |

## 5. Schema and Protocol Errors

| Error | Cause | Fix |
|---|---|---|
| Delta `A schema mismatch detected when writing` | New/changed columns in source | Fix transform or enable `mergeSchema` deliberately (bronze only) |
| Delta reader: `requires reader version` / unsupported table feature | Table feature enabled (deletion vectors, column mapping) that the reader does not support | Upgrade reader; or avoid enabling the feature on shared tables |
| Iceberg: cannot read format version 3 | Engine lacks v3 support | Keep v2 until all readers support v3 |
| Type change rejected | Non-widening type change | Add a new column and migrate (expand/contract) |
| Spark `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE` | Duplicate keys in MERGE source | Deduplicate source by key and ordering column |

## 6. Slow Planning / Metadata Bloat

Symptoms: queries spend seconds to minutes before tasks start; driver memory pressure.

Checks:

```sql
SELECT count(*) FROM lake.silver.orders.snapshots;
SELECT count(*), sum(length) FROM lake.silver.orders.manifests;
```

Fixes: `expire_snapshots`, `rewrite_manifests`, limit per-column metrics on wide tables, compact small files. Delta: ensure checkpoints are being written; reduce commit frequency; clean up log with retention settings.

## 7. Too Many Small Files

Causes: streaming with short triggers, `distribution-mode=none` on partitioned tables, over-partitioning, many small MERGE commits.

Diagnose:

```sql
SELECT partition, count(*) files, avg(file_size_in_bytes)/1048576 avg_mb
FROM lake.silver.orders.files GROUP BY partition ORDER BY files DESC LIMIT 10;
```

Fix: set `write.distribution-mode=hash`, lengthen triggers, coarser partitioning, scheduled compaction on recent partitions, Delta optimized writes / auto compaction where available.

## 8. Startup and Configuration

| Symptom | Cause | Fix |
|---|---|---|
| `ClassNotFoundException` for Iceberg/Delta classes | Runtime JAR missing or wrong Scala/Spark version | Use the runtime artifact built for your Spark and Scala versions |
| `NoSuchMethodError` at runtime | Conflicting library versions (Hadoop, AWS SDK, Parquet) | Use shaded runtime bundles; align versions |
| `Table not found` but files exist | Wrong catalog name or `spark.sql.defaultCatalog`; table registered in a different catalog | Fully qualify names; check catalog config |
| 403 from object storage | Credentials not vended or wrong role | Check catalog credential vending, IAM role, KMS key permissions |
| `MERGE INTO TABLE is not supported temporarily` (Spark) | SQL extensions not configured | Set `spark.sql.extensions` for Iceberg/Delta |

## 9. Data Correctness Issues

| Symptom | Likely cause |
|---|---|
| Duplicates in silver | MERGE source not deduplicated; append used where upsert needed; replay without idempotency |
| Rows "disappear" | Static `INSERT OVERWRITE` replaced the table; filter bug; quarantine threshold silently exceeded |
| Old values overwrite new | CDC applied without ordering guard |
| Counts differ between engines | Engines reading different snapshots/branches, or one ignores delete files it does not support |
| Time shifts by hours | Session time-zone differences; `TIMESTAMP` vs `TIMESTAMP_NTZ` mixing |

## 10. Useful Commands

```sql
-- Iceberg
SELECT * FROM t.history;            SELECT * FROM t.snapshots;
SELECT * FROM t.refs;               SELECT * FROM t.metadata_log_entries;
CALL cat.system.rollback_to_snapshot('db.t', <snapshot_id>);
-- Delta
DESCRIBE HISTORY t;  DESCRIBE DETAIL t;  RESTORE TABLE t TO VERSION AS OF <n>;
VACUUM t DRY RUN;
```

## Checklist for Incident Write-ups

- [ ] Table, snapshot/version range, and jobs involved identified.
- [ ] Root cause classified (concurrency, retention, schema, config, logic).
- [ ] Data repaired (rollback, re-run, targeted fix) and downstream rebuilt.
- [ ] Preventive change: retention, schedules, tests, or alerts.
