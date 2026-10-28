# Apache Iceberg (Open Table Format)

## 1. Skill Context
**Focus**: An open table format that adds ACID commits, schema/partition evolution, and snapshot isolation to Parquet/ORC/Avro files on object storage (S3, GCS, ADLS). Many engines can query the same tables: Spark, Trino, Flink, Snowflake, BigQuery, DuckDB.
**Triggers**: apache-iceberg, data-lakehouse, parquet, open-table-format.
**Deep dive**: `skills/data/data-lakehouse/SKILL.md`, `skills/data/data-formats/SKILL.md`.

## 2. The Hive-Table Problem
Hive-style tables are defined by directories (`s3://bucket/events/dt=2023-10-01/`). The metastore knows the partitions, but engines still list the files inside each partition, which is slow on object storage. There are no atomic multi-file commits, so readers can see half-written data. Changing the partition scheme means rewriting the whole table.

## 3. Iceberg's Metadata Tree
1. **Catalog** (REST catalog, AWS Glue, Hive Metastore, Nessie, Polaris): stores the pointer to the current metadata file. A commit atomically swaps this pointer (optimistic concurrency).
2. **Metadata file**: schema, partition specs, snapshots, table properties.
3. **Manifest list**: one per snapshot; lists the manifests along with partition-range summaries.
4. **Manifest files**: list data files and delete files with per-column statistics (min/max, null counts).
- **Result**: For `WHERE id = 5`, query planning prunes manifests and files using the partition summaries and column stats, without listing directories. How much data gets skipped depends on how well the data is clustered or sorted on `id`.

## 4. Features
- **Time travel**: Spark `SELECT ... FROM t TIMESTAMP AS OF '2024-01-02 00:00:00'` or `VERSION AS OF <snapshot_id>`; Trino `FOR TIMESTAMP AS OF` / `FOR VERSION AS OF`.
- **Hidden partitioning**: Partition by transforms such as `days(ts)` or `bucket(16, id)`. Queries filter on `ts` directly and are pruned automatically.
- **Partition evolution**: Change the partition spec without rewriting old data. Old files keep their original spec.
- **Schema evolution**: Columns are tracked by ID, so add, drop, rename, and reorder are safe.
- **Row-level updates**: Copy-on-write or merge-on-read (delete files).

## 5. Required Maintenance
- Run `expire_snapshots`, `remove_orphan_files`, `rewrite_data_files` (compacts small files), and `rewrite_manifests` regularly.
- Streaming writers produce many tiny commits. Batch commits or compact frequently.
