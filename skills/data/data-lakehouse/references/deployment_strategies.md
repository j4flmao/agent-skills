# Data Release Strategies: Write-Audit-Publish, Branching, Backfills, Schema Rollouts

Shipping code is half of a lakehouse release; the other half is changing data that consumers read. This reference covers how to publish new or rebuilt data safely. CI/CD for code is in `deployment-pipelines.md`.

## 1. Strategy Overview

| Strategy | Use when | Mechanism |
|---|---|---|
| Write-Audit-Publish (WAP) | Every production batch must pass checks before readers see it | Iceberg branch or `spark.wap.id`; Nessie branch |
| Shadow table | Validating a rewritten pipeline against the current one | Write `*_v2` in parallel, compare, then swap |
| Blue/green table swap | Full rebuilds of a table | Build new table, switch a view or rename |
| Partition-scoped backfill | Re-processing a date range | `overwritePartitions` / `replaceWhere` per range |
| Expand/contract schema change | Renames, type changes, column removal | Add new, dual-write, migrate readers, remove old |

## 2. Write-Audit-Publish with Iceberg Branches

```sql
-- once
ALTER TABLE lake.gold.daily_revenue CREATE BRANCH IF NOT EXISTS audit;
```

```python
spark.conf.set("spark.wap.branch", "audit")          # writes go to the audit branch
daily.writeTo("lake.gold.daily_revenue").overwritePartitions()
spark.conf.unset("spark.wap.branch")

audit = spark.read.option("branch", "audit").table("lake.gold.daily_revenue")
problems = run_checks(audit)                           # nulls, row counts, reconciliation
if problems:
    raise RuntimeError(f"audit failed for daily_revenue: {problems}")

spark.sql("CALL lake.system.fast_forward('gold.daily_revenue', 'main', 'audit')")
```

- Readers of `main` never see unaudited data.
- `fast_forward` only works if `main` has not moved since the branch was created; otherwise rebuild from current `main`.
- Branch writes require `write.wap.enabled=true` when using `spark.wap.id` (staged snapshot + `cherrypick_snapshot`) rather than branches.

## 3. Catalog-Level Branching (Nessie)

Nessie versions the whole catalog, so a multi-table change can be published atomically:

```sql
CREATE BRANCH IF NOT EXISTS etl_20261027 IN nessie FROM main;
USE REFERENCE etl_20261027 IN nessie;
-- run all silver/gold jobs here
MERGE BRANCH etl_20261027 INTO main IN nessie;
```

Use it when consumers must see several tables change together (fact plus its dimensions).

## 4. Blue/Green Table Swap

```sql
CREATE TABLE lake.gold.customer_ltv_v2 USING iceberg AS SELECT ...;
-- validate v2 against v1
CREATE OR REPLACE VIEW lake.gold.customer_ltv AS SELECT * FROM lake.gold.customer_ltv_v2;
```

Consumers read the view; swapping is a metadata change and rollback means repointing the view. Keep v1 until the retention window for rollback passes, then drop it.

## 5. Backfills

```python
for day in date_range("2026-01-01", "2026-03-31"):
    df = build_daily(spark, day)
    (df.write.format("delta").mode("overwrite")
       .option("replaceWhere", f"day = '{day}'")
       .saveAsTable("gold.daily_revenue"))
    log.info("backfilled gold.daily_revenue day=%s rows=%d", day, df.count())
```

Rules:
- Idempotent per unit (one partition per commit) so a failed backfill resumes where it stopped.
- Run on separate compute from production jobs; throttle concurrency to avoid commit conflicts with live writers.
- Tag the table before starting (`CREATE TAG pre_backfill_2026q1`, or note the Delta version) to roll back quickly.
- Downstream incremental consumers (CDF readers, streaming queries) will see the backfill as changes; warn them or pause them.

## 6. Schema Change Rollout (Expand/Contract)

| Step | Action |
|---|---|
| 1. Expand | `ADD COLUMN new_col` (metadata-only) |
| 2. Dual-write | Jobs populate both old and new columns |
| 3. Backfill | Fill `new_col` for historical partitions |
| 4. Migrate readers | Dashboards, dbt models, exports move to `new_col` |
| 5. Contract | Drop `old_col` after readers confirm |

Safe without this process: adding nullable columns, widening numeric types (`int`→`bigint`, `float`→`double`, decimal precision increase). Unsafe: rename (breaks readers using names), narrowing types, changing partition keys without a plan for existing data.

## 7. Rollback Options

| Format | Rollback | Constraint |
|---|---|---|
| Iceberg | `rollback_to_snapshot`, `rollback_to_timestamp`, `set_current_snapshot` | Target snapshot not yet expired |
| Delta | `RESTORE TABLE t TO VERSION AS OF n` | Files not yet vacuumed; log entry within `logRetentionDuration` |
| Nessie | Reassign branch to a previous commit hash | Within GC policy |

Rollback restores table state, not side effects: downstream tables built from bad data need their own rollback or rebuild.

## Pitfalls

- Publishing by overwriting the production table in place with no audit step.
- Branch audits that check only row counts; include business reconciliation (sums vs source).
- Long-lived branches that diverge from `main`; fast-forward fails and merges become manual.
- Backfills that rewrite the entire table in one commit: huge rewrite, long conflicts, painful rollback.

## Checklist

- [ ] Critical gold tables use WAP or blue/green publishing.
- [ ] Backfills partition-scoped, idempotent, throttled, preceded by a tag.
- [ ] Schema changes follow expand/contract; consumers notified.
- [ ] Rollback procedure tested and within retention windows.
