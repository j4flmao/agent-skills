# Error Handling for Lake Writes: Conflicts, Retries and Idempotency

How lake writes fail, which failures are safe to retry, and how to make batch and streaming writes idempotent so retries never duplicate data.

## Failure Classes

| Failure | Example | Retry? |
|---|---|---|
| Commit conflict (retryable) | Delta `ConcurrentAppendException`, Iceberg `CommitFailedException` | Yes, bounded, with backoff |
| Logical conflict | Delta `ConcurrentDeleteDeleteException`, Iceberg validation failure under serializable isolation | Re-run whole operation on fresh state, or fix scheduling |
| Commit state unknown | Iceberg `CommitStateUnknownException` (timeout during commit) | Do not blindly retry; check table history first |
| Schema mismatch | `AnalysisException` / schema validation errors | No; fix data or migrate schema |
| Protocol/feature unsupported | Delta `DeltaUnsupportedTableFeatureException` / reader version errors | No; upgrade engine |
| Storage throttling | S3 `503 SlowDown` | SDK retries; reduce request rate (fewer, larger files) |
| Bad records | parse failures, constraint violations | Quarantine, not retry |

## Bounded Retry for Conflicts

```python
from __future__ import annotations

import logging
import random
import time

from delta.exceptions import ConcurrentAppendException, ConcurrentDeleteReadException

log = logging.getLogger(__name__)
RETRYABLE = (ConcurrentAppendException, ConcurrentDeleteReadException)


def run_with_retry(op, *, table: str, attempts: int = 4, base: float = 2.0, cap: float = 60.0) -> None:
    for attempt in range(1, attempts + 1):
        try:
            op()
            return
        except RETRYABLE as exc:
            if attempt == attempts:
                log.error("commit failed after %d attempts table=%s error=%s", attempt, table, exc)
                raise
            sleep = random.uniform(0, min(cap, base * 2 ** attempt))   # full jitter
            log.warning("commit conflict table=%s attempt=%d sleep=%.1fs", table, attempt, sleep)
            time.sleep(sleep)
```

Iceberg already retries `CommitFailedException` internally (`commit.retry.num-retries`, `commit.retry.min-wait-ms`, `commit.retry.max-wait-ms`); add an outer retry only for whole-operation validation failures.

## Idempotent Batch Writes

Pick one per table:

| Technique | How |
|---|---|
| Deterministic overwrite | Job for date D always replaces partition D (`INSERT OVERWRITE` dynamic mode) |
| Keyed MERGE with version guard | `WHEN MATCHED AND s.version > t.version THEN UPDATE` |
| Delta idempotent writes | `txnAppId` + `txnVersion` options; Delta skips a write whose version was already committed for that app ID |
| Batch ID recorded in commit | Store batch ID in commit metadata / control table; skip if present |

```python
(df.write.format("delta")
   .option("txnAppId", "orders_loader")
   .option("txnVersion", batch_number)        # monotonically increasing per app
   .mode("append")
   .saveAsTable("lake.bronze.orders"))
```

Iceberg: record `snapshot-property.<key>` on commit (e.g. `.option("snapshot-property.batch-id", batch_id)`) and check `SELECT summary['batch-id'] FROM lake.db.t.snapshots` before writing.

## Idempotent Streaming Writes

- Structured Streaming with a checkpoint gives exactly-once into Delta/Iceberg sinks; `foreachBatch` does not by itself, because the function may run again for the same `batch_id`.
- In `foreachBatch`, use `txnAppId=<query id>`/`txnVersion=batch_id` (Delta) or a MERGE that is naturally idempotent.
- Flink sinks commit on checkpoint completion (two-phase); restart from the last checkpoint does not duplicate.

## Handling Commit State Unknown (Iceberg)

1. Do not delete the written data files.
2. Reload the table and look for a snapshot with your batch ID in its summary.
3. If present: success. If absent: retry the commit; orphaned files are cleaned later by `remove_orphan_files`.

## Bad Record Quarantine

```python
parsed = raw.withColumn("rec", F.from_json("json", schema, {"mode": "PERMISSIVE",
                                                             "columnNameOfCorruptRecord": "_corrupt"}))
good = parsed.filter("rec._corrupt IS NULL").select("rec.*")
bad = parsed.filter("rec._corrupt IS NOT NULL") \
            .withColumn("_error", F.lit("json_parse")) \
            .withColumn("_quarantined_at", F.current_timestamp())
bad.writeTo("lake.ops.quarantine_orders").append()
```

The corrupt-record column must be part of the supplied schema for `from_json` to populate it. Alert when the quarantine rate exceeds a threshold, and keep quarantine tables queryable for reprocessing.

## Constraint Violations

Delta `CHECK` constraints and `NOT NULL` fail the whole commit (`DeltaInvariantViolationException`). Validate before writing so one bad row does not fail the batch silently in a retry loop; send violators to quarantine.

## Logging

Log table, operation, batch/snapshot ID, attempt, rows written and exception class on every failure. Emit metrics: commit conflicts, retries, quarantine rows, commit latency.

## Checklist
- [ ] Retryable vs non-retryable exceptions classified per format
- [ ] Retries bounded with jittered backoff
- [ ] Every write idempotent (overwrite, guarded MERGE, txnAppId, or batch ID check)
- [ ] Commit-state-unknown handled by checking history
- [ ] Bad records quarantined with reason and alerting
