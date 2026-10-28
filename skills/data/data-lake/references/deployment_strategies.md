# Data Release Strategies: Write-Audit-Publish, Shadow Tables and Rollback

How to release new data and new pipeline logic without exposing bad data to consumers. Code CI/CD is in `deployment-pipelines.md`; this file is about the data side of a release.

## Strategy Overview

| Strategy | Mechanism | Use when |
|---|---|---|
| Write-Audit-Publish (WAP) | Write to an unpublished branch/snapshot, validate, then publish atomically | Every high-value table |
| Shadow / parallel run | New logic writes to `<table>_v2`; compare with current | Changing transformation logic |
| Blue/green tables + view swap | Consumers read a view; swap view target | Full rebuilds, backfills |
| Clone-based testing | Zero-copy clone of prod for test runs | Testing migrations on real data |
| Rollback | Restore previous version/snapshot | Bad data already published |

## WAP with Iceberg Branches

```sql
ALTER TABLE lake.gold.revenue SET TBLPROPERTIES ('write.wap.enabled' = 'true');
ALTER TABLE lake.gold.revenue CREATE BRANCH IF NOT EXISTS etl_20261027;
```

```python
spark.conf.set("spark.wap.branch", "etl_20261027")
build_revenue(spark).writeTo("lake.gold.revenue").overwritePartitions()

# Audit on the branch only
audit = spark.read.option("branch", "etl_20261027").table("lake.gold.revenue")
assert_quality(audit)              # raises on failure; main is untouched

spark.conf.unset("spark.wap.branch")
spark.sql("CALL lake.system.fast_forward('gold.revenue', 'main', 'etl_20261027')")
spark.sql("ALTER TABLE lake.gold.revenue DROP BRANCH etl_20261027")
```

Fast-forward requires `main` not to have moved since the branch was created; otherwise rebuild on a fresh branch.

Older WAP style (still supported): set `spark.wap.id`, the snapshot is staged but not current, then `CALL system.cherrypick_snapshot('db.t', <snapshot_id>)`.

## WAP with Delta Lake

Delta has no branches; common equivalents:
- Write to a staging table, validate, then `INSERT OVERWRITE`/`MERGE` into the target in one commit.
- Validate the new version after write and `RESTORE` on failure (consumers may briefly see bad data; acceptable only for low-risk tables).
- Use shallow clone (`CREATE TABLE stage SHALLOW CLONE prod`) to test a job against prod-shaped data cheaply.

```sql
CREATE OR REPLACE TABLE lake.stage.revenue_candidate SHALLOW CLONE lake.gold.revenue;
-- run new logic against the clone, compare, then promote
```

## WAP with Nessie

Create a branch for the whole catalog, run all jobs of a pipeline on it, validate, then merge: gives multi-table atomic publish. See `nessie-catalog.md`.

## Shadow Runs for Logic Changes

1. Deploy new job writing to `lake.gold.revenue_v2` alongside the current job.
2. Run both for N cycles on identical inputs (same snapshot IDs).
3. Compare: row counts, key coverage, aggregates per dimension, sample row diffs.

```sql
SELECT coalesce(a.region, b.region) AS region,
       a.revenue AS current_rev, b.revenue AS new_rev,
       b.revenue - a.revenue AS diff
FROM lake.gold.revenue a
FULL OUTER JOIN lake.gold.revenue_v2 b USING (order_date, region)
WHERE a.revenue IS DISTINCT FROM b.revenue;
```

4. Cut over by repointing the consumer view, keep `_v1` for a rollback window, then drop it.

## Blue/Green via Views

```sql
CREATE OR REPLACE VIEW lake.gold.customer_360 AS SELECT * FROM lake.gold.customer_360_green;
-- rebuild blue, validate, then:
CREATE OR REPLACE VIEW lake.gold.customer_360 AS SELECT * FROM lake.gold.customer_360_blue;
```

Views must be defined in a catalog every consumer engine understands; engine-specific view SQL limits portability (Iceberg views help with multi-dialect representations).

## Rollback

| Format | Command |
|---|---|
| Delta | `RESTORE TABLE t TO VERSION AS OF 118` (creates a new commit) |
| Iceberg | `CALL lake.system.rollback_to_snapshot('db.t', 5512340987)` or `set_current_snapshot` |
| Hudi | `CALL rollback_to_instant(table => 'db.t', instant_time => '...')` (Spark SQL procedure) or `savepoint` + restore |

Rollback limits: the target version's files must still exist (not vacuumed/expired). Downstream tables built from bad data need their own rollback or recompute; track lineage by snapshot ID.

## Backfills

- Run backfills into a branch or separate table, never directly over live partitions during business hours.
- Process partition ranges in bounded chunks, each one commit, recorded in a control table so restarts resume.
- Pause compaction on affected partitions to avoid commit conflicts.

## Checklist
- [ ] High-value tables published only through WAP or view swap
- [ ] Audit checks defined and failing closed
- [ ] Logic changes shadow-run and diffed before cutover
- [ ] Retention long enough to roll back to the last known-good version
- [ ] Downstream lineage known for coordinated rollback
