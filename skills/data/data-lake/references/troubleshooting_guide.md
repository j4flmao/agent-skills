# Lake Table Troubleshooting Guide

Symptom-driven diagnosis for common Delta Lake, Iceberg and Hudi problems: failed commits, slow queries, missing or duplicated data, storage growth and reader incompatibility.

## Quick Triage

| Symptom | First check |
|---|---|
| Job fails at commit | Exception class; concurrent writers/maintenance on the same table |
| Query suddenly slow | File count, delete files, snapshot count, planning time |
| Rows missing | Recent overwrite/DELETE in history; filter/pruning bug; retention cleanup |
| Rows duplicated | Non-idempotent retry; MERGE source duplicates; append replay |
| Storage keeps growing | Expiration/vacuum/orphan jobs running? Retention too long? |
| Reader error after upgrade | Table features / format version vs reader version |

## Commit Failures

| Error | Cause | Fix |
|---|---|---|
| Delta `ConcurrentAppendException` | Another writer added files to partitions this operation read | Partition-disjoint predicates; serialize writers; retry with backoff |
| Delta `ConcurrentDeleteReadException` / `ConcurrentDeleteDeleteException` | Concurrent operation removed files this one read/deleted (often OPTIMIZE vs MERGE) | Schedule compaction away from writers; scope OPTIMIZE to cold partitions |
| Delta `ProtocolChangedException` | Table protocol upgraded during the write | Retry after upgrade; coordinate feature enablement |
| Iceberg `CommitFailedException: ... metadata location ... has changed` | Lost the optimistic race | Retries exhausted: raise `commit.retry.num-retries` or reduce concurrency |
| Iceberg `ValidationException: Found conflicting files` | Serializable isolation detected overlapping changes | Re-run on fresh state; avoid concurrent rewrites of same partitions |
| Iceberg `CommitStateUnknownException` | Timeout talking to catalog during commit | Check snapshots for your batch ID before retrying |
| Hudi `HoodieWriteConflictException` | OCC conflict between writers | Lock provider configured? Disjoint file groups? |

## Slow Queries

1. Count files and average size:

```sql
SELECT count(*) files, avg(file_size_in_bytes)/1048576 avg_mb FROM lake.silver.orders.files;   -- Iceberg
DESCRIBE DETAIL lake.silver.orders;                                                            -- Delta
```

2. Count delete files (Iceberg `content` 1/2 in `.files`) or deletion vectors (Delta history `numDeletionVectorsAdded`).
3. Check the plan for pruning: are partition filters and `PushedFilters` present?
4. Check planning time: many snapshots/manifests → expire snapshots, rewrite manifests.

Fixes: compaction, delete-file rewrite, layout/clustering, rewrite filters for pushdown (`performance-optimization.md`).

## Missing Data

- Inspect history for the table around the time data vanished:

```sql
DESCRIBE HISTORY lake.gold.revenue;                                 -- look for WRITE mode=Overwrite, DELETE, RESTORE
SELECT * FROM lake.gold.revenue.snapshots ORDER BY committed_at DESC; -- operation=overwrite/delete
```

- Common causes: static (not dynamic) partition overwrite replaced the whole table; `replaceWhere` predicate too broad; `whenNotMatchedBySourceDelete` with a partial source; retention delete with wrong date math.
- Recover with time travel/rollback if within retention.
- Streaming reader skipped data: Delta streaming source with `ignoreChanges`/`skipChangeCommits`, or Iceberg incremental read skipping non-append snapshots.

## Duplicate Data

- Appends retried after a reported failure that actually committed (check for two commits with same batch).
- `foreachBatch` without idempotency (batch re-executed after restart).
- MERGE source containing duplicate keys (Delta errors; other engines may insert twice in `WHEN NOT MATCHED` paths).
- Streaming checkpoint deleted or reset while the table kept old data.

Fix: dedupe with a MERGE/`INSERT OVERWRITE` of affected partitions; add idempotency (`error-handling.md`).

## Files Not Found

| Error | Cause |
|---|---|
| `FileNotFoundException` reading Delta | VACUUM removed files still needed by a long-running query or a lagging stream; retention too short |
| Iceberg `NotFoundException` for data/manifest file | Orphan cleanup with too-short `older_than`, or manual deletion; files removed while still referenced |
| Time travel fails | Version older than retention; expected after VACUUM/expire |

Restore from bucket versioning if enabled; otherwise roll back to a snapshot whose files exist.

## Storage Growth

- Verify maintenance jobs ran: Delta `VACUUM` history entries; Iceberg snapshot count over time.
- Orphan files from failed jobs: Iceberg `remove_orphan_files` (dry run with `dry_run => true`).
- Bucket versioning keeping noncurrent versions without lifecycle expiry.
- Streaming checkpoints and staging prefixes never cleaned.

## Reader and Version Incompatibility

| Message pattern | Meaning |
|---|---|
| Delta: unsupported reader/writer features (e.g. `deletionVectors`, `columnMapping`) | Reader too old for enabled table features |
| Iceberg: unsupported format version | Table on v3 (or v2) read by older library |
| Hudi: table version mismatch | Hudi 1.x table read by 0.x reader (or upgrade not completed) |

Fix: upgrade readers; avoid enabling features until all readers support them; Delta features cannot always be disabled without rewriting.

## Schema Errors

- `A schema mismatch detected when writing` (Delta): new columns without `mergeSchema`; decide whether to evolve or reject.
- Type changes not allowed: widen explicitly (if supported) or add a new column and backfill.
- Case sensitivity differences between engines: standardize on lowercase column names.

## Collect Before Escalating

- Table identifier, format and library versions of all writers/readers.
- Failing operation's full exception and stack trace.
- History/snapshots for the time window.
- Concurrent jobs (orchestrator logs) touching the table.

## Checklist
- [ ] Exception class identified and mapped to cause
- [ ] Table history/snapshots inspected for the incident window
- [ ] Maintenance job status verified
- [ ] Engine/library versions checked against table features
- [ ] Fix includes a preventive change (idempotency, scheduling, retention)
