# Operating Open Table Formats at Scale (Iceberg-Focused)

Advanced lakehouse operations: table maintenance (compaction, snapshot expiry, orphan cleanup), catalogs and concurrency, schema and partition evolution, branching and time travel, and governance. Examples use Apache Iceberg with Spark SQL; Delta Lake equivalents are noted.

## Why Maintenance Matters

Every commit creates new metadata and data files. Without maintenance:
- Small files from streaming or frequent micro-batches slow every query.
- Old snapshots keep deleted data and grow storage cost (and may violate retention/erasure requirements).
- Failed jobs leave orphan files that nothing references.
- Manifest lists grow, slowing query planning.

## Iceberg Maintenance Procedures (Spark)

```sql
-- 1. Compact small data files (bin-pack or sort)
CALL lake.system.rewrite_data_files(
  table => 'sales.orders',
  strategy => 'sort',
  sort_order => 'zorder(customer_id, order_date)',
  options => map('target-file-size-bytes', '536870912', 'min-input-files', '5')
);

-- 2. Expire old snapshots (time travel window = 7 days here)
CALL lake.system.expire_snapshots(
  table => 'sales.orders',
  older_than => TIMESTAMP '2026-10-20 00:00:00',
  retain_last => 20
);

-- 3. Remove files not referenced by any snapshot (keep a safe margin above the longest job runtime)
CALL lake.system.remove_orphan_files(
  table => 'sales.orders',
  older_than => TIMESTAMP '2026-10-24 00:00:00'
);

-- 4. Rewrite manifests for faster planning
CALL lake.system.rewrite_manifests('sales.orders');

-- 5. Merge-on-read tables: compact position/equality delete files
CALL lake.system.rewrite_position_delete_files('sales.orders');
```

| Task | Frequency (typical) | Caution |
|------|--------------------|---------|
| Compaction | Hourly to daily for hot partitions | Run on recent partitions only; conflicts with concurrent writers on the same partitions |
| Snapshot expiry | Daily | Defines how far back time travel and rollback work |
| Orphan removal | Weekly | `older_than` must exceed the longest-running write job, or in-flight files are deleted |
| Manifest rewrite | Weekly or when planning slows | Cheap metadata-only operation |

Managed services (e.g. AWS S3 Tables, Glue automatic compaction, Databricks predictive optimization, catalog-driven maintenance) can run these for you; know which ones are active to avoid double work.

Delta Lake equivalents: `OPTIMIZE ... ZORDER BY` (or liquid clustering), `VACUUM` (removes unreferenced files older than the retention threshold, default 7 days), and log checkpointing.

## Copy-on-Write vs Merge-on-Read

| Mode | Writes | Reads | Use |
|------|--------|-------|-----|
| Copy-on-write | Rewrite affected files on update/delete | Fast, no delete files | Read-heavy, infrequent updates |
| Merge-on-read | Write delete files (position/equality); deletion vectors in Iceberg v3 | Must merge deletes; needs compaction | Frequent updates (CDC upserts) |

```sql
ALTER TABLE sales.orders SET TBLPROPERTIES (
  'write.delete.mode' = 'merge-on-read',
  'write.update.mode' = 'merge-on-read',
  'write.merge.mode'  = 'merge-on-read'
);
```

## Catalogs and Concurrency

- Iceberg commits are optimistic: writers create new metadata and atomically swap the table pointer in the catalog. Conflicting commits retry (`commit.retry.num-retries`) and fail if changes overlap.
- Use a catalog with atomic swaps: Iceberg REST catalogs (Apache Polaris, Unity Catalog, Lakekeeper, Gravitino, AWS Glue's Iceberg REST endpoint, Nessie), or JDBC/Hive catalogs. Plain filesystem (Hadoop) catalogs on object storage are unsafe for concurrent writers.
- Avoid multiple jobs writing the same partitions concurrently (e.g. streaming append + compaction on the same hot partition); schedule compaction on closed partitions.
- REST catalogs can vend short-lived storage credentials per table, centralizing access control instead of granting engines broad bucket access.

## Schema Evolution

Iceberg tracks columns by ID, so these are safe metadata-only operations:

```sql
ALTER TABLE sales.orders ADD COLUMN channel STRING AFTER status;
ALTER TABLE sales.orders RENAME COLUMN amount TO amount_gross;
ALTER TABLE sales.orders ALTER COLUMN quantity TYPE BIGINT;   -- int → bigint widening allowed
ALTER TABLE sales.orders DROP COLUMN legacy_flag;
```

- Renames do not break readers that resolve by ID, but they do break downstream SQL; coordinate with contracts.
- Only safe type promotions are allowed (e.g. int→long, float→double, decimal precision widening).

## Partition Evolution and Hidden Partitioning

```sql
CREATE TABLE sales.events (event_id STRING, ts TIMESTAMP, tenant STRING, payload STRING)
USING iceberg PARTITIONED BY (days(ts), bucket(16, tenant));

-- Later: switch to hourly partitions for new data without rewriting old data
ALTER TABLE sales.events REPLACE PARTITION FIELD days(ts) WITH hours(ts);
```

- Queries filter on `ts`; Iceberg maps predicates to partition values (hidden partitioning), so users do not need to know the layout.
- Old data keeps its old spec; rewrite it only if queries need the new layout.

## Time Travel, Rollback, Branches, and Tags

```sql
SELECT * FROM sales.orders TIMESTAMP AS OF '2026-10-26 08:00:00';
SELECT * FROM sales.orders VERSION AS OF 4893274923749;

CALL lake.system.rollback_to_snapshot('sales.orders', 4893274923749);

ALTER TABLE sales.orders CREATE TAG `eom-2026-09` RETAIN 365 DAYS;      -- keep month-end state
ALTER TABLE sales.orders CREATE BRANCH etl_audit;                       -- write-audit-publish
```

- Tags pin snapshots beyond normal expiry (audits, ML training reproducibility).
- Branches enable write-audit-publish: write to a branch, validate, fast-forward `main`.
- Catalog-level branching across many tables: Nessie, lakeFS.

## Format Versions

- Iceberg spec v2 added row-level deletes; v3 (adopted by engines through 2025–2026) adds deletion vectors, row lineage, default values, and new types (variant, geospatial, nanosecond timestamps). Upgrade a table's `format-version` only when every engine that reads it supports that version.
- Delta Lake features are enabled per table via table features; check reader/writer protocol compatibility across engines before enabling.

## Interoperability

- Apache XTable and Delta UniForm expose metadata in multiple formats so Iceberg readers can read Delta tables and vice versa; treat them as read compatibility layers, with one primary writer format.
- Pin engine versions per environment; mismatched Iceberg library versions across Spark, Trino, and Flink are a common source of commit failures.

## Governance and Retention

- Erasure requests (GDPR/CCPA): delete rows, then expire snapshots and remove orphans so the data is physically gone; document the end-to-end deletion SLA.
- Fine-grained access (row filters, column masks) is enforced by catalogs/engines (Unity Catalog, Lake Formation, Ranger, Polaris policies); raw bucket access bypasses them, so restrict direct storage access.

## Monitoring

| Metric | Source |
|--------|--------|
| Files per partition, average file size | `SELECT * FROM sales.orders.files` metadata table |
| Snapshot count and age | `sales.orders.snapshots` |
| Delete file ratio | `sales.orders.delete_files` / `files` |
| Commit conflicts / retries | Engine logs, catalog metrics |
| Storage cost per table | Storage inventory + tags |

```sql
SELECT partition, COUNT(*) AS files, AVG(file_size_in_bytes)/1048576 AS avg_mb
FROM sales.orders.files GROUP BY partition ORDER BY files DESC LIMIT 20;
```

## Checklist

- [ ] Scheduled compaction, snapshot expiry, orphan removal, manifest rewrite (or managed equivalents)
- [ ] Orphan cleanup window longer than the longest write job
- [ ] Catalog with atomic commits; no concurrent writers on the same partitions without coordination
- [ ] Write modes (CoW/MoR) chosen per table
- [ ] Schema/partition evolution coordinated with data contracts
- [ ] Tags for audit snapshots; branches for write-audit-publish
- [ ] Format version upgrades gated on engine support
- [ ] Erasure process includes snapshot expiry
