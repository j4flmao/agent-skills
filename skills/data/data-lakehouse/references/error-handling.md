# Error Handling in Lakehouse Pipelines

Failure modes specific to table-format writes (commit conflicts, unknown commit state, schema mismatches, bad records) and how to handle them so pipelines are retry-safe and never corrupt tables.

## 1. Failure Classes

| Class | Examples | Handling |
|---|---|---|
| Commit conflict | Iceberg `CommitFailedException`, `ValidationException` (conflicting files); Delta `ConcurrentAppendException`, `ConcurrentDeleteReadException`, `ConcurrentDeleteDeleteException`, `MetadataChangedException` | Retry the whole read-transform-write unit with backoff; reduce conflict surface |
| Unknown commit outcome | Iceberg `CommitStateUnknownException` | Do not clean up files or blindly retry; check whether the snapshot landed |
| Schema mismatch | Delta `AnalysisException: A schema mismatch detected`; Iceberg field not found | Fail fast; evolve schema deliberately |
| Bad records | Unparseable JSON, type cast failures, constraint violations | Quarantine, do not drop silently |
| Infrastructure | Throttling (S3 503 SlowDown), executor loss, catalog unavailable | Engine-level retries; job-level retry with backoff |
| Missing files | `FileNotFoundException` after `VACUUM`/orphan cleanup | Fix retention; re-run reader from a valid version |

## 2. Commit Conflicts

Both formats use optimistic concurrency: a writer reads table state, writes files, then tries to commit. The commit fails if a concurrent commit changed something the writer depended on.

Reduce conflicts:
- Partition writers so concurrent jobs touch disjoint partitions, and include partition predicates in `MERGE`/`DELETE` conditions so the engine can prove non-overlap.
- Iceberg: set the isolation level per operation (`write.delete.isolation-level`, `write.update.isolation-level`, `write.merge.isolation-level`: `serializable` default, `snapshot` is less strict) and raise `commit.retry.num-retries` for many concurrent appenders.
- Delta: use `WriteSerializable` isolation (default) rather than `Serializable` unless required; enable row-level concurrency features where the platform supports them.
- Schedule compaction away from heavy MERGE windows or restrict it to cold partitions.

Retry wrapper at the job level (engine-internal retries only cover metadata refresh, not re-running your logic):

```python
import logging, random, time
from py4j.protocol import Py4JJavaError

log = logging.getLogger(__name__)
RETRYABLE = ("CommitFailedException", "ConcurrentAppendException",
             "ConcurrentDeleteReadException", "MetadataChangedException")

def run_with_commit_retry(unit, *, table: str, attempts: int = 5, base: float = 2.0):
    for attempt in range(1, attempts + 1):
        try:
            return unit()
        except Py4JJavaError as e:
            msg = str(e.java_exception)
            if "CommitStateUnknownException" in msg:
                log.error("commit state unknown for %s; manual verification required", table)
                raise
            if not any(name in msg for name in RETRYABLE) or attempt == attempts:
                log.error("write to %s failed on attempt %d: %s", table, attempt, msg)
                raise
            sleep = min(60.0, base ** attempt) * random.uniform(0.5, 1.0)
            log.warning("commit conflict on %s attempt %d, retrying in %.1fs", table, attempt, sleep)
            time.sleep(sleep)
```

`unit` must re-read source and target inside the function so the retry sees the new table state.

## 3. Unknown Commit State

`CommitStateUnknownException` means the catalog may or may not have accepted the commit (e.g. network failure during the swap). Iceberg leaves data files in place deliberately. Handling:

1. Look up recent snapshots: `SELECT snapshot_id, committed_at, summary FROM t.snapshots ORDER BY committed_at DESC LIMIT 5`.
2. If a snapshot with your job's identifying summary property (set `snapshot-property.job_run_id`) exists, treat the write as successful.
3. Otherwise retry; orphan files from the failed attempt are later removed by `remove_orphan_files`.

```python
(df.writeTo("lake.silver.orders")
   .option("snapshot-property.job_run_id", run_id)
   .append())
```

## 4. Bad Record Quarantine

```python
from pyspark.sql import functions as F

parsed = raw.withColumn("data", F.from_json("value", schema)) \
            .withColumn("_error", F.when(F.col("data").isNull(), F.lit("unparseable_json")))

valid = parsed.filter("_error IS NULL").select("data.*")
invalid = parsed.filter("_error IS NOT NULL") \
                .select("value", "_error", F.current_timestamp().alias("quarantined_at"),
                        F.lit(run_id).alias("run_id"))

invalid.writeTo("lake.quarantine.orders").append()
valid.writeTo("lake.bronze.orders").append()

bad_ratio = invalid.count() / max(parsed.count(), 1)
if bad_ratio > 0.01:
    raise RuntimeError(f"bronze.orders run {run_id}: {bad_ratio:.2%} records quarantined, above 1% threshold")
```

- Quarantine tables keep the raw payload, error reason, and run ID for replay.
- A threshold turns a systemic upstream break into a failed run instead of a silently shrinking table.
- Spark file sources also support `mode=PERMISSIVE` with `columnNameOfCorruptRecord`, and Databricks offers `badRecordsPath`.

## 5. Schema Mismatch

- Delta rejects writes with unknown columns unless `mergeSchema=true` (or `spark.databricks.delta.schema.autoMerge.enabled` for MERGE). Iceberg rejects unless the table has `write.spark.accept-any-schema=true` and the writer uses `mergeSchema`.
- Enable automatic merge only in bronze, where capturing new upstream fields matters; in silver/gold, schema changes go through migrations.
- Type changes that are not widening fail; cast explicitly in the transform and log the decision.

## 6. Recovering From a Bad Write

| Situation | Action |
|---|---|
| Bad batch just committed, nothing downstream ran | Roll back: Iceberg `rollback_to_snapshot`, Delta `RESTORE` |
| Downstream already consumed | Roll back source, then re-run downstream for affected partitions |
| Only some rows bad | Targeted `DELETE`/`MERGE` fix; keep an audit record of the correction |
| Data deleted by mistake, snapshot expired | Restore from object-storage versioning or backups; time travel cannot help |

## Pitfalls

- Catching all exceptions and marking the run successful: tables silently stop updating.
- Retrying only the final `write` call instead of the whole unit: the retry commits stale results.
- Running `remove_orphan_files` with a short `older_than` while writes are in progress: deletes files of in-flight commits.
- Turning on schema auto-merge everywhere: typos in upstream fields become permanent columns.

## Checklist

- [ ] Job-level retry for commit conflicts with backoff and a cap.
- [ ] `CommitStateUnknownException` handled by verification, not blind retry.
- [ ] Quarantine table and bad-record threshold per ingestion job.
- [ ] Schema auto-merge limited to bronze.
- [ ] Rollback runbook tested per format.
