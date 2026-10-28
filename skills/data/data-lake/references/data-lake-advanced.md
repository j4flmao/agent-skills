# Advanced Lake Topics: Concurrency, Row-Level Deletes, Clustering and Branching

Covers how concurrent writers commit safely, how row-level changes are physically stored, modern clustering (liquid clustering, sort orders), Iceberg branches/tags, and newer spec features. Fundamentals are in `data-lake-fundamentals.md`.

## Optimistic Concurrency on Object Storage

All three formats commit by atomically publishing new metadata:

| Format | Atomic step | Requirement |
|---|---|---|
| Delta | Write `_delta_log/<version>.json` only if absent | Put-if-absent storage (S3 conditional writes, or a LogStore such as DynamoDB-based multi-cluster writes on older setups) |
| Iceberg | Swap catalog pointer to new `metadata.json` | Catalog with atomic compare-and-swap (REST, Glue, Hive lock, JDBC, Nessie) |
| Hudi | Complete instant on the timeline | Lock provider for multi-writer (`hoodie.write.concurrency.mode=optimistic_concurrency_control` + lock provider) |

On conflict the writer re-reads the latest state, checks whether its changes overlap, and retries or fails.

Delta conflict exceptions (`io.delta.exceptions.*`): `ConcurrentAppendException`, `ConcurrentDeleteReadException`, `ConcurrentDeleteDeleteException`, `MetadataChangedException`, `ProtocolChangedException`. Reduce them by making operations touch disjoint partitions and putting partition predicates in the MERGE condition.

Iceberg: `CommitFailedException` triggers retry (`commit.retry.num-retries`); validation failures (e.g. conflicting deletes under serializable isolation) fail the operation. Isolation level per operation: `write.merge.isolation-level` / `write.delete.isolation-level` = `serializable` (default) or `snapshot`.

## Row-Level Changes

| Mechanism | Format | Write cost | Read cost |
|---|---|---|---|
| Copy-on-write | all | rewrite whole files touched | none extra |
| Position deletes | Iceberg v2 | small delete files (file + row position) | merge at read; compact periodically |
| Equality deletes | Iceberg v2 (mostly Flink upserts) | very cheap | expensive at read; compact quickly |
| Deletion vectors | Delta (table feature), Iceberg v3 | bitmap per data file | cheap bitmap filter |
| Log files (MoR) | Hudi | append to log | merge at read; async compaction |

Guidance: CoW for read-heavy tables with batch updates; MoR/deletion vectors for frequent small updates; always pair MoR with scheduled compaction (`rewrite_position_delete_files`, Delta `OPTIMIZE`/`REORG TABLE ... APPLY (PURGE)`, Hudi compaction).

## Clustering and Layout

Delta liquid clustering (replaces partitioning + Z-order for new tables):

```sql
CREATE TABLE lake.silver.events (event_id BIGINT, tenant_id STRING, event_ts TIMESTAMP, payload STRING)
USING delta CLUSTER BY (tenant_id, event_ts);

ALTER TABLE lake.silver.events CLUSTER BY (tenant_id);   -- change keys without rewrite
OPTIMIZE lake.silver.events;                             -- clusters incrementally
```

Liquid clustering is not compatible with `PARTITIONED BY` or `ZORDER BY` on the same table.

Iceberg sort orders and partition evolution:

```sql
ALTER TABLE lake.silver.events WRITE ORDERED BY tenant_id, event_ts;
ALTER TABLE lake.silver.events ADD PARTITION FIELD bucket(16, tenant_id);
ALTER TABLE lake.silver.events REPLACE PARTITION FIELD days(event_ts) WITH hours(event_ts);
CALL lake.system.rewrite_data_files(table => 'silver.events', strategy => 'sort',
     sort_order => 'zorder(tenant_id, event_ts)');
```

Partition evolution is metadata-only: old files keep the old spec, new writes use the new one, and queries prune across both.

## Iceberg Branches and Tags

```sql
ALTER TABLE lake.gold.revenue CREATE TAG `eom_2026_09` AS OF VERSION 7712 RETAIN 365 DAYS;
ALTER TABLE lake.gold.revenue CREATE BRANCH `audit_20261027` RETAIN 7 DAYS;

-- write-audit-publish
SET spark.wap.branch = audit_20261027;
INSERT INTO lake.gold.revenue SELECT ...;
-- run checks against lake.gold.revenue.branch_audit_20261027
CALL lake.system.fast_forward('gold.revenue', 'main', 'audit_20261027');
```

Tags pin snapshots past normal expiry (e.g. regulatory month-end states).

## Iceberg Format v3 (spec)

Adds deletion vectors (replacing position delete files), row lineage (row IDs and sequence numbers), default column values, `variant`, geospatial and nanosecond timestamp types. Engine support arrives at different times; upgrade `format-version` only when every reader/writer supports v3.

## Multi-Table Consistency

Formats commit per table. For several tables that must change together:
- Nessie or catalog-level multi-table transactions where supported.
- Write-audit-publish per table, publish in a controlled order, and let consumers read pinned snapshots/tags.
- Single-writer orchestration with a manifest of produced snapshot IDs.

## Pitfalls
- Hadoop catalog or Delta on S3 without conditional-write support with multiple writers: lost commits.
- Equality deletes left uncompacted: read latency grows with every commit.
- Enabling table features/v3 before all engines (BI tools, Trino, older Spark) support them.
- Liquid clustering keys chosen by cardinality alone instead of actual filter columns.

## Checklist
- [ ] Commit mechanism verified safe for concurrent writers on the chosen storage/catalog
- [ ] CoW vs MoR decided per table with compaction scheduled for MoR
- [ ] Clustering keys match dominant filters
- [ ] WAP or branches used for high-risk publishes
- [ ] Feature upgrades gated on reader compatibility
