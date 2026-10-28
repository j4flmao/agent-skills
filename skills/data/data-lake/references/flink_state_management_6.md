# Flink to Iceberg Sink: Upserts, Equality Deletes and Small Files

Writing streams into Apache Iceberg with Flink: append vs upsert mode, how upserts become equality deletes, distribution modes, and the maintenance a streaming Iceberg table needs. Part 6 of the Flink series (index in `flink_state_management_1.md`).

## Sink Implementations

| API | Notes |
|---|---|
| `FlinkSink` (DataStream, legacy SinkFunction-based internals) | Long-standing builder API |
| `IcebergSink` (Sink V2, Iceberg 1.7+) | New implementation on Flink's Sink V2 API; same builder style |
| Flink SQL `INSERT INTO` an Iceberg catalog table | Simplest; options via table properties or hints |

Use the Iceberg Flink runtime artifact matching your Flink minor version (`iceberg-flink-runtime-<flink-version>`).

## Append Mode (DataStream)

```java
TableLoader loader = TableLoader.fromCatalog(
    CatalogLoader.rest("lake", hadoopConf, Map.of(
        "uri", "https://catalog.internal/api/catalog",
        "warehouse", "prod")),
    TableIdentifier.of("bronze", "events"));

FlinkSink.forRowData(rowDataStream)
    .tableLoader(loader)
    .distributionMode(DistributionMode.HASH)   // cluster rows by partition before writing
    .writeParallelism(8)
    .uidPrefix("iceberg-sink-events")
    .append();
```

## Upsert Mode

Requires format v2 and identifier fields (primary key). Each upsert writes an equality delete for the key plus the new row.

```sql
CREATE TABLE lake.silver.accounts (
  id BIGINT,
  balance DECIMAL(18,2),
  updated_at TIMESTAMP(6),
  PRIMARY KEY (id) NOT ENFORCED
) WITH (
  'format-version' = '2',
  'write.upsert.enabled' = 'true'
);

INSERT INTO lake.silver.accounts SELECT id, balance, updated_at FROM accounts_cdc;
```

Or per statement: `INSERT INTO t /*+ OPTIONS('upsert-enabled'='true') */ SELECT ...`.

DataStream: `.upsert(true).equalityFieldColumns(List.of("id"))`.

Rules:
- For partitioned upsert tables, the partition source columns must be part of the identifier fields, otherwise the same key can exist in two partitions.
- Upsert mode does not check row ordering; feed it a stream already ordered per key (CDC sources preserve per-key order) or compact out-of-order updates first (see `flink_state_management_5.md`).

## Distribution Modes

| `write.distribution-mode` | Effect | Use |
|---|---|---|
| `none` | Each writer writes any partition | Unpartitioned, max throughput; many files per partition |
| `hash` | Shuffle by partition key | Default choice for partitioned tables |
| `range` | Range-partition by sort order/partition (newer Iceberg versions for Flink) | Skewed partitions, sorted output |

## Small Files and Delete Files

Every checkpoint produces at least one data file per writer per touched partition, plus delete files for upserts. A job with 8 writers, 10 hot partitions and 1-minute checkpoints can produce up to 80 files per minute.

Mitigations:
- Longer checkpoint interval (see part 2).
- `hash` distribution to reduce partitions per writer.
- Scheduled compaction with Spark:

```sql
CALL lake.system.rewrite_data_files(
  table => 'silver.accounts',
  options => map('min-input-files', '5', 'delete-file-threshold', '1',
                 'partial-progress.enabled', 'true'),
  where => 'updated_at < current_timestamp() - INTERVAL 1 HOUR');
CALL lake.system.rewrite_position_delete_files(table => 'silver.accounts');
CALL lake.system.expire_snapshots(table => 'silver.accounts', older_than => TIMESTAMP '2026-10-25 00:00:00', retain_last => 100);
CALL lake.system.remove_orphan_files(table => 'silver.accounts', older_than => TIMESTAMP '2026-10-24 00:00:00');
```

- Iceberg also ships Flink-native table maintenance (`TableMaintenance` in recent releases) that can run compaction/expiration inside a Flink job; check your Iceberg version.

## Avoiding Commit Conflicts with Compaction

- Restrict compaction to partitions the stream no longer writes (`where` clause on older data).
- Enable `partial-progress.enabled` so compaction commits in groups and a conflict loses less work.
- Equality deletes are applied by compaction; position deletes from streaming are rewritten by `rewrite_position_delete_files`.

## Reading Upsert Tables

- Batch engines (Spark, Trino) apply equality deletes at read time; read cost grows until compaction.
- Flink streaming reads of tables with deletes: incremental streaming reads historically only support append snapshots; plan downstream consumers accordingly (or use changelog views in Spark).

## Pitfalls
- Upsert without identifier fields or on format v1: rejected or wrong results.
- Partition column not in the primary key for upsert tables.
- No compaction: equality deletes make queries progressively slower.
- Multiple Flink jobs writing the same Iceberg table without coordination: frequent commit retries.

## Checklist
- [ ] Sink artifact matches Flink version; `uidPrefix` set
- [ ] Upsert tables are v2 with identifier fields including partition sources
- [ ] Distribution mode chosen per partitioning
- [ ] Compaction, delete-file rewrite, snapshot expiry and orphan cleanup scheduled
- [ ] Compaction scoped to avoid conflicts with the streaming writer
