# Lakehouse Table Health Monitoring

What to measure on lakehouse tables (freshness, volume, file health, metadata growth, maintenance status), where to get the numbers, and which alerts are worth having. Data-quality rule design is in `testing-strategies.md`.

## 1. Metrics Catalogue

| Area | Metric | Source |
|---|---|---|
| Freshness | Time since last commit; max event timestamp vs now | Iceberg `snapshots`, Delta `DESCRIBE HISTORY`, `max(event_ts)` |
| Volume | Rows added per commit / per day | Snapshot summary (`added-records`), Delta `operationMetrics` |
| File health | File count, average and small-file ratio per partition | Iceberg `files`/`partitions`, Delta `DESCRIBE DETAIL` |
| Delete backlog | Delete files / deletion vectors outstanding | Iceberg `files` (`content` = 1 or 2), Delta `numDeletionVectorsAdded` metrics |
| Metadata growth | Snapshot count, manifest count, `_delta_log` size | Iceberg `snapshots`, `manifests`; object storage listing |
| Maintenance | Last compaction, last expiry, last vacuum | Snapshot operations (`replace`), Delta history (`OPTIMIZE`, `VACUUM END`) |
| Pipeline | Job duration, retries, commit conflicts | Orchestrator, job logs/metrics |
| Streaming | Input rate, processing rate, batch duration, source lag | Spark `StreamingQueryListener`, Kafka consumer lag |
| Quality | Failed checks, quarantined rows | Quality tool results tables |

## 2. Iceberg Metadata Queries

```sql
-- freshness and volume per commit
SELECT committed_at, operation,
       summary['added-records']      AS added_records,
       summary['added-data-files']   AS added_files,
       summary['total-records']      AS total_records
FROM lake.silver.orders.snapshots
ORDER BY committed_at DESC LIMIT 20;

-- small files per partition (content = 0 means data files)
SELECT partition, count(*) AS files,
       avg(file_size_in_bytes) / 1048576 AS avg_mb,
       sum(CASE WHEN file_size_in_bytes < 32 * 1048576 THEN 1 ELSE 0 END) AS small_files
FROM lake.silver.orders.files
WHERE content = 0
GROUP BY partition
ORDER BY small_files DESC LIMIT 20;

-- delete-file backlog
SELECT content, count(*) AS files, sum(record_count) AS records
FROM lake.silver.orders.files
WHERE content IN (1, 2)          -- 1 = position deletes, 2 = equality deletes
GROUP BY content;

-- metadata growth
SELECT count(*) AS snapshots FROM lake.silver.orders.snapshots;
SELECT count(*) AS manifests, sum(length) / 1048576 AS manifest_mb FROM lake.silver.orders.manifests;
```

Iceberg also emits `ScanReport` and `CommitReport` through a pluggable `MetricsReporter` (`metrics-reporter-impl` catalog property) for per-scan and per-commit metrics.

## 3. Delta Queries

```sql
DESCRIBE DETAIL gold.daily_revenue;     -- numFiles, sizeInBytes, clusteringColumns, properties

SELECT version, timestamp, operation,
       operationMetrics['numOutputRows']   AS rows_written,
       operationMetrics['numAddedFiles']   AS files_added,
       operationMetrics['numRemovedFiles'] AS files_removed
FROM (DESCRIBE HISTORY gold.daily_revenue)
ORDER BY version DESC LIMIT 20;
```

On Databricks, system tables (`system.access.audit`, `system.lakeflow.*`, `system.storage.predictive_optimization_operations_history`) and Lakehouse Monitoring add audit, job, and profile metrics.

## 4. Collecting Metrics

```python
from datetime import datetime, timezone

def table_health(spark, table: str) -> dict:
    snaps = spark.sql(f"SELECT committed_at FROM {table}.snapshots ORDER BY committed_at DESC LIMIT 1").collect()
    files = spark.sql(f"""
        SELECT count(*) AS files,
               sum(CASE WHEN file_size_in_bytes < 33554432 THEN 1 ELSE 0 END) AS small_files
        FROM {table}.files WHERE content = 0""").collect()[0]
    snapshot_count = spark.sql(f"SELECT count(*) AS n FROM {table}.snapshots").collect()[0].n
    if not snaps:
        raise RuntimeError(f"table {table} has no snapshots; cannot compute freshness")
    age_min = (datetime.now(timezone.utc) - snaps[0].committed_at.replace(tzinfo=timezone.utc)).total_seconds() / 60
    return {"table": table, "minutes_since_commit": age_min, "files": files.files,
            "small_file_ratio": (files.small_files or 0) / max(files.files, 1),
            "snapshots": snapshot_count}
```

Run per table on a schedule, write results to an `ops.table_health` table, and export to Prometheus/Datadog/CloudWatch for alerting. Spark session timezone affects `committed_at`; set `spark.sql.session.timeZone=UTC` for monitoring jobs.

## 5. Alerts Worth Having

| Alert | Condition (tune per table) | Action |
|---|---|---|
| Stale table | No commit within 2× expected interval | Check upstream job / stream |
| Volume anomaly | Rows added outside historical band | Check source and filters |
| Small-file buildup | Small-file ratio high on recent partitions | Run or fix compaction |
| Delete backlog | Delete files growing across several runs | Schedule delete-file rewrite / purge |
| Snapshot growth | Snapshot count keeps rising | Expiry job failing |
| Maintenance stale | No compaction/expiry within its schedule | Investigate maintenance job |
| Stream lag | Source lag rising for N minutes | Scale or fix stream |
| Commit conflicts | Retry rate rising | Rebalance schedules / partitions |

Base thresholds on each table's SLA and history, not on global constants.

## 6. Dashboards

- Per domain: table freshness vs SLA, last successful run, quality pass rate.
- Platform: total storage by layer, small-file ratio, maintenance success, catalog/API errors.
- Cost: compute per pipeline, storage growth (including snapshots retained for time travel).

## Pitfalls

- Monitoring jobs only (success/failure) and not the tables: a "successful" job that writes zero rows goes unnoticed.
- Querying `files`/`all_files` metadata tables on very large tables at high frequency; they can be expensive. Sample or use snapshot summaries.
- Alert fatigue from uniform thresholds.

## Checklist

- [ ] Freshness and volume tracked for every silver/gold table.
- [ ] File-health and metadata-growth metrics per table.
- [ ] Maintenance jobs monitored like pipelines.
- [ ] Alerts tied to table SLAs, routed to owning teams.
