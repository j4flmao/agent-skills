# Data Lake Fundamentals: Object Storage and Table Format Metadata

What a table format adds on top of files in object storage, how each format tracks table state, and the core operations (ACID commits, schema evolution, time travel) that follow from that design.

## Why Table Formats

Plain Parquet directories (Hive-style tables) have no atomic commits, no safe concurrent writes, expensive directory listing for planning, and no row-level updates. A table format adds a metadata layer that records exactly which files make up each table version.

| Problem with raw files | Table format answer |
|---|---|
| Readers see half-written jobs | Commit is a single atomic metadata change |
| Listing millions of objects | File lists and column stats in metadata |
| Updates require rewriting partitions | Row-level MERGE/UPDATE/DELETE |
| Schema changes break readers | Column IDs / column mapping enable safe evolution |
| No history | Snapshots/versions enable time travel and rollback |

## Metadata Structures

Delta Lake:
```
table/
  _delta_log/
    00000000000000000000.json   # actions: add/remove file, metaData, protocol, commitInfo
    00000000000000000001.json
    00000000000000000010.checkpoint.parquet   # periodic state snapshot of the log
    _last_checkpoint
  part-....parquet
```
Table state = latest checkpoint + subsequent JSON commits.

Apache Iceberg:
```
catalog pointer --> metadata/v12.metadata.json   (schemas, partition specs, snapshots, refs)
                      --> snap-....avro          (manifest list per snapshot)
                            --> ....avro         (manifests: data/delete files + column stats)
                                  --> data/*.parquet
```
The catalog stores only the current metadata file location; swapping it is the commit.

Apache Hudi:
```
table/.hoodie/   timeline of instants (commit, deltacommit, compaction, clean, rollback)
                 metadata table (file listings, column stats, record index)
table/<partition>/  base files (parquet) + log files (MoR)
```

## ACID Properties in Practice

- Atomicity: a commit is visible fully or not at all.
- Consistency: schema and constraints enforced on write (Delta `CHECK`/`NOT NULL`; Iceberg required fields).
- Isolation: readers use a snapshot; writers use optimistic concurrency (serializable or snapshot isolation).
- Durability: data and metadata live in object storage.

## Schema Evolution

| Operation | Delta | Iceberg | Hudi |
|---|---|---|---|
| Add column | yes | yes | yes |
| Rename / drop | with column mapping (`delta.columnMapping.mode=name`) | yes (field IDs) | yes (schema on read in newer versions) |
| Reorder | yes | yes | limited |
| Widen type (int→long, float→double) | type widening feature in newer Delta | yes | yes |

```sql
ALTER TABLE lake.silver.orders ADD COLUMNS (channel STRING);
ALTER TABLE lake.silver.orders RENAME COLUMN amount TO amount_gross;   -- Iceberg / Delta with column mapping
```

Automatic merge on write: Delta `.option("mergeSchema", "true")`; Iceberg `write.spark.accept-any-schema=true` plus `.option("merge-schema", "true")`.

## Partitioning

- Partition only on low-cardinality columns used in most filters (usually a date).
- Iceberg hidden partitioning: `PARTITIONED BY (days(event_ts), bucket(16, id))`; queries filter on `event_ts` and get pruning without a derived column.
- Delta: explicit partition columns, or liquid clustering for new tables.
- Target partitions of at least ~1 GB; many tiny partitions produce small files.

## Time Travel

```sql
-- Delta
SELECT * FROM orders VERSION AS OF 120;
SELECT * FROM orders TIMESTAMP AS OF '2026-10-20';
RESTORE TABLE orders TO VERSION AS OF 118;

-- Iceberg
SELECT * FROM lake.db.orders FOR SYSTEM_TIME AS OF '2026-10-20 00:00:00';  -- Trino syntax
CALL lake.system.rollback_to_snapshot('db.orders', 5512340987);
```

Time travel works only as far back as files have not been removed by VACUUM / snapshot expiration / cleaner.

## Storage Basics

| Concern | Guidance |
|---|---|
| File format | Parquet (default); ORC supported by Iceberg/Hudi |
| File size | 128 MB–1 GB per data file |
| Compression | zstd or snappy |
| Object store consistency | S3, GCS and ADLS are strongly consistent for reads after writes |
| Cost | Request-heavy small files cost more than storage; compact |

## Format Choice in One Paragraph

Iceberg has the broadest multi-engine and catalog support (REST spec, Snowflake, BigQuery, Trino, Flink, Spark, DuckDB). Delta is the native format of Databricks with strong Spark integration and UniForm for Iceberg-compatible reads. Hudi is strongest for high-volume upserts with indexing and incremental pulls. See `table-formats.md` for the full comparison.

## Checklist
- [ ] Every table accessed through a catalog, not raw paths
- [ ] Partitioning or clustering chosen from real query filters
- [ ] Schema evolution mode decided (column mapping / field IDs)
- [ ] Time-travel horizon aligned with retention jobs
