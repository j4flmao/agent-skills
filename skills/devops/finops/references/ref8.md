# Database and Analytics Cost Optimization

Managed databases and data warehouses combine several billing dimensions (instance hours, storage, I/O, backups, replicas, queries scanned or compute credits), and the expensive dimension differs per service. This reference covers the cost model and main levers for relational databases, DynamoDB and other NoSQL, and analytics engines (BigQuery, Snowflake, Redshift, Athena).

## Relational Databases (RDS, Aurora, Azure SQL / Flexible Server, Cloud SQL)

### Cost dimensions

| Dimension | Lever |
|-----------|-------|
| Instance class x hours | Rightsize on p95 CPU/memory; newer generations; ARM (Graviton) classes |
| Multi-AZ / HA standby | Keep for prod; single-AZ for dev/test |
| Read replicas | Replace with caching where reads are cacheable; remove unused replicas |
| Storage (GB-month) and provisioned IOPS | gp3 with IOPS sized to measured need; delete unused tablespaces |
| I/O requests (Aurora Standard) | Aurora I/O-Optimized when I/O is a large share of the Aurora bill |
| Backups and snapshots | Retention matched to recovery policy; delete manual snapshots after expiry |
| Licensing (SQL Server, Oracle) | License-included vs BYOL, edition choice, Azure Hybrid Benefit |

### Serverless and auto-pause options

- **Aurora Serverless v2** scales in fine-grained capacity units (ACUs) and can scale to zero ACUs with automatic pause on supported engine versions; set min and max ACUs explicitly.
- **Azure SQL Database serverless** auto-pauses after a configurable delay and bills per vCore-second while active.
- Serverless suits spiky and intermittent workloads; for steady high load, provisioned instances with commitments are usually cheaper.

### Query efficiency is cost efficiency

```sql
-- PostgreSQL: top statements by total execution time (pg_stat_statements)
SELECT queryid, calls, round(total_exec_time) AS total_ms,
       round(mean_exec_time, 2) AS mean_ms, rows
FROM   pg_stat_statements
ORDER  BY total_exec_time DESC
LIMIT  20;
```

Missing indexes and N+1 queries force larger instances. Fix the top statements before scaling up.

## DynamoDB and Other Key-Value Stores

| Mode | Billed on | Best for |
|------|-----------|----------|
| On-demand | Per read/write request unit | Unpredictable or spiky traffic, new tables |
| Provisioned + auto scaling | RCU/WCU per hour | Steady, predictable traffic; can add reserved capacity |

Other levers:
- **Table class**: Standard-IA lowers storage price and raises request price; use for large, rarely accessed tables.
- **Item size**: read/write units are consumed in size increments (4 KB reads, 1 KB writes); compress large attributes or move blobs to S3.
- **TTL** deletes expired items without consuming write capacity.
- **Eventually consistent reads** cost half of strongly consistent reads.
- **GSIs** replicate writes; every GSI adds write cost and storage. Project only needed attributes.

Cosmos DB has a similar model (RU/s provisioned, autoscale, serverless); Firestore and Bigtable bill on operations and nodes respectively.

## BigQuery

| Model | Billed on | Choose when |
|-------|-----------|-------------|
| On-demand | Bytes scanned per query | Light or unpredictable usage |
| Capacity (Editions: Standard / Enterprise / Enterprise Plus) | Slot-hours with autoscaling, optional commitments | Heavy steady usage, need for cost predictability |

Levers:
- **Partition** tables by date and **cluster** by common filter columns; require partition filters (`require_partition_filter = TRUE`).
- Never `SELECT *` on wide tables; columnar storage bills only the columns read.
- Dry-run queries to see bytes before running: `bq query --dry_run --use_legacy_sql=false '<query>'`.
- Cap per-query cost with `maximum_bytes_billed` and per-user/project custom quotas.
- Materialized views and BI Engine for repeated dashboard queries.
- Storage: long-term storage price applies automatically to unmodified partitions after 90 days; consider physical (compressed) storage billing for well-compressed datasets.

```sql
-- Most expensive queries in the last 7 days (on-demand bytes)
SELECT user_email, query, total_bytes_billed / POW(1024, 4) AS tib_billed
FROM   `region-eu`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND  job_type = 'QUERY'
ORDER  BY total_bytes_billed DESC
LIMIT  20;
```

## Snowflake

- Compute is billed in credits per second while a virtual warehouse runs (60-second minimum on resume).
- Set `AUTO_SUSPEND` low (for example 60 seconds) for interactive warehouses and `AUTO_RESUME = TRUE`.
- Size warehouses per workload; scaling up helps large queries, multi-cluster scaling helps concurrency.
- Resource monitors cap credits per warehouse or account:

```sql
CREATE RESOURCE MONITOR analytics_monthly WITH CREDIT_QUOTA = 500
  FREQUENCY = MONTHLY START_TIMESTAMP = IMMEDIATELY
  TRIGGERS ON 80 PERCENT DO NOTIFY
           ON 100 PERCENT DO SUSPEND;
ALTER WAREHOUSE analytics_wh SET RESOURCE_MONITOR = analytics_monthly;
ALTER WAREHOUSE analytics_wh SET AUTO_SUSPEND = 60;
```

- Review `SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY` and `QUERY_HISTORY` for the costliest warehouses and queries. Serverless features (Snowpipe, automatic clustering, materialized view maintenance, search optimization) bill separately; monitor them too.

## Redshift and Athena

- Redshift provisioned: RA3 nodes separate compute and managed storage; pause/resume clusters for non-prod; reserved nodes for steady clusters. Redshift Serverless bills RPU-hours; set a base capacity and usage limits.
- Athena bills per TB scanned (with a per-query minimum): store data as partitioned, compressed Parquet/ORC; use partition projection; set workgroup data scan limits.

## Cross-Cutting Practices

| Practice | Why |
|----------|-----|
| Separate warehouses/workgroups per team | Attribution and caps |
| Query cost shown to users (dry run, query profile) | Behavior change |
| Data retention and tiering policies | Storage grows forever otherwise |
| Dev/test with sampled or smaller datasets | Avoid full-size scans in development |
| Scheduled report de-duplication | Many dashboards run the same heavy query |

## Checklist

- [ ] Top queries by cost reviewed monthly and optimized
- [ ] Pricing mode (on-demand vs provisioned/capacity) chosen from usage data
- [ ] Partitioning/clustering and partition filters enforced
- [ ] Auto-suspend / auto-pause configured for interactive and non-prod engines
- [ ] Per-query and per-team caps (maximum bytes billed, resource monitors, workgroup limits)
- [ ] Backup and snapshot retention aligned to recovery requirements
- [ ] Commitments considered only for the steady baseline
