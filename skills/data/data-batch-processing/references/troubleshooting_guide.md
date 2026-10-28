# Troubleshooting Spark Batch Jobs

A symptom-driven guide for failing or misbehaving batch jobs: out-of-memory errors, lost executors, slow stages, wrong or duplicated results, and storage-related errors. For tuning a job that works but is slow, see `performance_tuning.md`.

## First Steps for Any Failure

1. Find the **first** error, not the last: the driver log's final exception is often a consequence (`SparkException: Job aborted due to stage failure`). Open the failed stage in the Spark UI and read the task error.
2. Note where it failed: driver or executor, which stage, which operation (scan, shuffle, join, write).
3. Check whether it is deterministic: rerun on the same input; transient errors (spot loss, network) differ from data or logic errors.
4. Compare with the last successful run: input volume, code version, configuration, platform version.

## Out of Memory

| Error text | Where | Usual causes | Fixes |
|------------|-------|-------------|-------|
| `java.lang.OutOfMemoryError: Java heap space` on driver | Driver | `collect()`, `toPandas()`, large broadcast built on driver, huge query plans, listing millions of files | Avoid collecting; lower broadcast threshold; increase driver memory; compact small files |
| `OutOfMemoryError` on executor | Executor | Large partitions, skew, wide rows, explode on big arrays | More partitions, handle skew, increase executor memory |
| `Container killed by YARN for exceeding memory limits` / `exit code 137` / `OOMKilled` (Kubernetes) | Executor container | Off-heap use exceeded overhead: PySpark workers, Arrow, native libraries | Increase `spark.executor.memoryOverhead`; reduce Arrow batch size; fewer cores per executor |
| `Total size of serialized results ... is bigger than spark.driver.maxResultSize` | Driver | Collecting too much | Write results to storage instead of collecting |
| `Not enough memory to build and broadcast the table` | Driver/executors | Broadcast side too large | Lower or disable auto broadcast; remove broadcast hint |

PySpark note: Python workers run outside the JVM heap; their memory counts against overhead (or `spark.executor.pyspark.memory` if set).

## Lost Executors and Fetch Failures

| Symptom | Causes | Fixes |
|---------|--------|-------|
| `ExecutorLostFailure` | OOM kill, spot/preemptible reclaim, node failure | Check container exit reason; overhead; decommissioning for spot |
| `FetchFailedException` / `MetadataFetchFailedException` | Executor holding shuffle data died; shuffle service issues | Fix root cause of executor loss; enable decommission/shuffle migration; external shuffle service on YARN |
| Stage retried repeatedly then aborted | Repeated executor loss in the same stage | Usually a memory problem in that stage |
| Heartbeat timeouts | Long GC pauses, overloaded nodes | Reduce memory pressure; check GC time |

## Slow or Stuck Jobs

| Symptom | Check | Fix |
|---------|-------|-----|
| One task runs far longer than others | Task duration distribution | Skew handling (AQE, broadcast, salting) |
| Job idle with no running tasks | Driver thread dump; is it listing files or planning? | Reduce file count; avoid driver-side loops |
| Tasks waiting for executors | Cluster capacity, dynamic allocation max, quotas | Raise limits or reduce parallel jobs |
| Very many short tasks | Task count vs data size | Fewer partitions; combine small files |
| Write stage slow on object storage | Committer type, file count | S3A magic/directory committer, EMRFS optimized committer, or table format; fewer files |
| JDBC read in a single task | Missing partition options | `partitionColumn`, bounds, `numPartitions` |

## Wrong Results

| Symptom | Cause | Fix |
|---------|-------|-----|
| Duplicate rows after rerun | `append` writes | Partition overwrite or MERGE |
| Whole table replaced instead of one partition | Static partition overwrite mode | `spark.sql.sources.partitionOverwriteMode=dynamic` or `overwritePartitions()` |
| Rows disappear after join | Inner join with missing keys, or type mismatch producing nulls | Check key types; use left join and count unmatched rows |
| Row explosion after join | Non-unique key on the "one" side | Deduplicate dimension; assert uniqueness |
| Off-by-one day in dates | Session time zone differs from data time zone | Set `spark.sql.session.timeZone=UTC`; convert explicitly |
| Nulls after reading CSV/JSON | Schema mismatch with permissive mode | Explicit schema; inspect `_corrupt_record` column |
| Results differ between runs | Non-deterministic ordering with `first()`, `row_number()` without total order, `rand()` | Deterministic ordering with tie-breakers; seeded randomness |
| Decimal values rounded or null | Precision overflow | Wider decimal type; check `spark.sql.ansi.enabled` behavior |

Spark 4.0 enables ANSI SQL mode by default: invalid casts and arithmetic overflows raise errors instead of returning null. Jobs migrated from 3.x may start failing on dirty data; fix the data handling (`try_cast`, validation) rather than disabling ANSI mode globally.

## Schema and Format Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `AnalysisException: [UNRESOLVED_COLUMN]` | Column renamed or missing upstream | Data contracts; schema checks before transform |
| `Parquet column cannot be converted` | Same column written with different types across files | Rewrite offending partitions; enforce schema at write |
| Delta `Schema mismatch detected` | Write with new columns | Intentional: `mergeSchema` option; unintentional: fix upstream |
| `ConcurrentAppendException` / commit conflicts (Delta, Iceberg) | Concurrent writers to the same partitions | Partition-disjoint writers, retries, or serialize jobs |
| `FileNotFoundException` during read | Files removed by vacuum/overwrite while reading, or stale cache | Use table formats with snapshot isolation; `REFRESH TABLE`; avoid vacuum retention below reader duration |

## Storage and Permissions

| Error | Fix |
|-------|-----|
| `AccessDenied` / `403` on object storage | Check job identity, bucket policy, KMS key policy (decrypt permission is often missing) |
| `SlowDown` / `503` from S3 | Too many requests to one prefix; spread keys, reduce small files, enable retries with backoff |
| Throttling from catalogs (Glue, Hive Metastore) | Batch partition operations; cache metadata; reduce partition count |

## Data Debugging Techniques

```python
from pyspark.sql import functions as F

# Find skewed keys
df.groupBy("customer_id").count().orderBy(F.desc("count")).show(20)

# Check key uniqueness before a join
dim.groupBy("customer_id").count().filter("count > 1").count()

# Unmatched rows in a join
facts.join(dim, "customer_id", "left_anti").count()

# Reproduce on one partition
spark.read.table("silver.orders").where("order_date = '2026-10-26'")
```

Reproduce locally with a sample (`df.sample(0.01, seed=1)`) and unit tests on small DataFrames; most logic errors do not need a cluster to debug.

## Escalation Data to Collect

- Job/run ID, code version, configuration, platform runtime version
- Spark event log and driver log
- Failed stage ID and task error
- Input partitions and their sizes
- Whether the failure is reproducible

## Checklist

- [ ] Root error identified from the failed stage, not only the driver exception
- [ ] Memory errors classified as heap vs overhead vs driver
- [ ] Executor loss reason determined (OOM, spot, node)
- [ ] Rerun behavior checked for determinism
- [ ] Fix verified on the same input; regression test or data check added
