---
name: data-data-lake
description: >
  Use this skill when building or operating data lakes with Delta Lake, Apache Iceberg, or Apache Hudi. This skill enforces: table format selection, ACID transactions on object storage, time travel, schema evolution, compaction and vacuum, Z-order/Hilbert clustering, incremental queries, CDC with merge-on-read vs copy-on-write. Do NOT use for: legacy Hive-style external tables (no ACID), raw file ingestion without table format, or data warehouse design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, lake, storage, phase-11]
---

# Data Lake

## Purpose
Design and operate ACID-compliant data lakes on object storage using Delta Lake, Apache Iceberg, or Apache Hudi. Manage table formats, optimize storage layout, enforce schema evolution, and implement time-travel and CDC patterns.

## Agent Protocol

### Trigger
Exact user phrases: "Delta Lake", "Apache Iceberg", "Apache Hudi", "Lakehouse", "ACID on lake", "time travel", "table format", "compaction", "Z-order", "Hilbert curve", "vacuum", "CDC", "merge-on-read", "copy-on-write", "manifest file", "metadata layer", "schema evolution", "optimize table", "incremental query".

### Input Context
Before activating, verify:
- Object storage backend (S3, ADLS, GCS, MinIO)
- Table format preference (Delta, Iceberg, Hudi)
- Compute engine (Spark, Flink, Trino, Presto, Hive)
- Write pattern (append-heavy, update-heavy, CDC stream)
- Query pattern (OLAP, incremental, point lookup, full scan)
- Partition strategy (date, categorical, Z-order dimensions)

### Output Artifact
Lake architecture with table format selection, compaction strategy, optimization plan.

### Response Format
```
Table Format: {Delta Lake | Apache Iceberg | Apache Hudi}
Storage: {S3 | ADLS | GCS | MinIO}
Write Mode: {copy-on-write | merge-on-read}
Partition: {column, granularity}
Optimize: {Z-order by columns, compaction interval}
Vacuum: {retention hours}
```
```sql
-- DDL / optimization commands
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Table format selected with trade-off analysis
- [ ] ACID guarantees documented (concurrent readers/writers)
- [ ] Write mode (CoW vs MoR) selected per table
- [ ] Partition strategy defined
- [ ] Compaction policy set (file size target, interval)
- [ ] Vacuum retention period configured
- [ ] Schema evolution rules defined
- [ ] Time travel retention configured
- [ ] Incremental query plan for CDC tables

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose Table Format
```
Delta Lake (Databricks, open source):
  - Transaction log in _delta_log/ as JSON + checkpoint Parquet
  - ACID via optimistic concurrency control on commit
  - Native Spark integration, great for Databricks/Spark workloads
  - Z-order clustering, generated columns, liquid clustering
  - Ingest: COPY INTO, streaming, batch
  - Query: Spark, Trino (connector), Presto, Athena (since 2023)

Apache Iceberg (community, Apache):
  - Catalog-based (Hive, Nessie, JDBC, REST, DynamoDB)
  - Table metadata tree: metadata -> manifest list -> manifest -> data files
  - Hidden partitioning, partition evolution (change partition spec without rewrite)
  - Best engine interoperability: Spark, Flink, Trino, Presto, Hive, Dremio
  - S3 tables, object stores as first-class citizens
  - Compaction: Spark or Flink procedure

Apache Hudi (community, Apache):
  - Designed for CDC and near-real-time ingestion
  - Record-level upserts/deletes, incremental pull (commit metadata)
  - Two write modes: Copy-On-Write (CoW) and Merge-On-Read (MoR)
  - Index: Bloom filter, HBase, bucket, simple
  - Clustering: replace/append data layout after writes
  - Best for: streaming ingestion with upserts, CDC pipelines
```

### Step 2: Transaction Log and Metadata
Delta Lake transaction log: _delta_log/00000000000000000001.json. Each commit is an atomic JSON file with add/remove actions. Checkpoint: periodic Parquet snapshot of all commits for faster replay. Iceberg metadata: /metadata/v1.metadata.json -> manifest list -> manifests -> data files in /data.

```
Delta Lake table layout:
  /table/
    _delta_log/
      00000000000000000001.json  (add file A, add file B)
      00000000000000000002.json  (remove file A, add file C)
      _last_checkpoint            (pointer to latest checkpoint)
    partition=2024/
      part-00001.snappy.parquet
      part-00002.snappy.parquet

Iceberg table layout:
  /table/
    metadata/
      00001-xxxxxxxx.metadata.json   (table schema, partition spec, snapshot)
      snap-xxxxxxxx.avro             (manifest list for snapshot)
    data/
      partition=2024/
        00000-0.parquet              (data file, with partition in path)
```

### Step 3: Write Modes
Copy-On-Write (CoW): write whole Parquet files on every change (merge/update/delete). Best for: read-heavy, fewer updates, OLAP queries. Merge-On-Read (MoR): write deltas (log files) + compact lazily. Best for: write-heavy, CDC, frequent updates. Hudi calls these CoW (Snapshot query) and MoR (Read-optimized / Snapshot queries).

```
Comparison:
                     CoW          MoR
  Write speed:      Slow         Fast
  Read speed:       Fast         Slow (merge deltas)
  File count:       Low          High (deltas + base)
  Latency:          Higher write  Lower write
  Use case:         BI queries   Streaming ingest
```

### Step 4: Compaction
CoW: implicitly compacted on every write (full files rewritten). MoR: need explicit compaction to merge delta logs into base files. Delta Lake: OPTIMIZE command with Z-order. Iceberg: rewrite_data_files Spark procedure. Hudi: inline or async clustering.

```sql
-- Delta Lake optimize (compact small files + Z-order)
OPTIMIZE sales_data
ZORDER BY (customer_id, product_id);

-- Iceberg rewrite data files (compact to target size)
CALL catalog.system.rewrite_data_files(
  table => 'sales.sales_data',
  options => map('target-file-size-bytes', '536870912')
);

-- Hudi clustering (reorganize data layout)
CALL run_clustering(
  table => 'sales_data',
  order => 'customer_id'
);
```

### Step 5: Vacuum and Retention
Vacuum removes old files no longer referenced by the transaction log. Delta: vacuum retention default 7 days (must be > time travel queries need). Iceberg: expire_snapshots removes old snapshots + orphan files. Hudi: clean and archive commands.

```sql
-- Delta vacuum (dry run first, then actual)
VACUUM sales_data RETAIN 168 HOURS;  -- 7 days

-- Iceberg expire snapshots
CALL catalog.system.expire_snapshots(
  table => 'sales.sales_data',
  retain_last => 10,
  older_than => TIMESTAMP '2024-01-01 00:00:00'
);

-- Hudi clean (remove old file versions)
CALL run_clean(table => 'sales_data', retain_commits => 10);
```

### Step 6: Schema Evolution
Delta: column add, rename, drop (needs explicit), nullable change. Iceberg: add, drop, rename, reorder, widen type (int->long). Hudi: add, drop, modify. All three support: ADD COLUMN, DROP COLUMN, CHANGE COLUMN type (restricted).

```sql
-- Delta schema evolution
ALTER TABLE sales_data ADD COLUMN discount DECIMAL(5,2) AFTER price;
ALTER TABLE sales_data ALTER COLUMN customer_id DROP NOT NULL;

-- Iceberg schema evolution
ALTER TABLE sales_data ADD COLUMN discount DECIMAL(5,2);
ALTER TABLE sales_data RENAME COLUMN product_id TO sku_id;
ALTER TABLE sales_data ALTER COLUMN price TYPE DOUBLE;
```

### Step 7: Time Travel
Delta: VERSION AS OF or TIMESTAMP AS OF. Iceberg: snapshot_id or AS OF TIMESTAMP. Hudi: begin/end commit time or instant time.

```sql
-- Delta time travel
SELECT * FROM sales_data VERSION AS OF 42;
SELECT * FROM sales_data TIMESTAMP AS OF '2024-01-15 10:00:00';

-- Iceberg time travel
SELECT * FROM sales_data FOR SYSTEM_VERSION AS OF 391184759034827;
SELECT * FROM sales_data FOR SYSTEM_TIME AS OF '2024-01-15 10:00:00';

-- Hudi time travel
SELECT * FROM sales_data TIMESTAMP AS OF '20240115100000';
```

### Step 8: Z-order / Hilbert Clustering
Z-order: maps multi-dimensional data to 1D space for colocation. Clustering: reorganize files so similar values cluster together. Benefits: better data skipping in queries with filters on Z-order columns. Hilbert: newer, better locality preservation than Z-order.

```sql
-- Delta Z-order
OPTIMIZE sales_data ZORDER BY (customer_id, order_date);

-- Iceberg sort-order
CALL catalog.system.rewrite_data_files(
  table => 'sales.sales_data',
  strategy => 'sort',
  sort_order => 'customer_id ASC NULLS LAST, order_date DESC'
);

-- Hudi clustering
CALL run_clustering(table => 'sales_data', order => 'customer_id');

-- Liquid clustering (Delta, Databricks)
ALTER TABLE sales_data CLUSTER BY (customer_id, order_date);
```

### Step 9: CDC and Incremental Queries
Hudi: designed for CDC — upsert on primary key, incremental query between commits. Delta: CDC with Change Data Feed (CDF) enabled. Iceberg: incremental read with Spark or Flink.

```sql
-- Delta CDF (enable on table)
ALTER TABLE sales_data SET TBLPROPERTIES (delta.enableChangeDataFeed = true);
-- Read changes between versions
SELECT * FROM table_changes('sales_data', 42, 45);

-- Hudi incremental query
SELECT * FROM sales_data
WHERE _hoodie_commit_time > '20240115100000'
  AND _hoodie_commit_time <= '20240116120000';
```

### Step 10: Apache XTable (OneTable)
Apache XTable provides multi-format table interoperability across Delta Lake, Iceberg, and Hudi. It maintains a primary table format and synchronizes metadata to secondary formats, enabling cross-engine querying without data duplication. For example, maintain as Delta Lake (Databricks) and auto-sync to Iceberg (Trino/Athena). XTable runs as a Spark application or standalone via API. Sync can be incremental (sourcing only changed files from primary format). Use XTable when different teams use different engines requiring different formats, during format migration, or when building a multi-engine data platform.

### Step 11: Nessie Catalog
Nessie provides Git-like version control for Iceberg tables (and others via REST Catalog API). Branches, tags, commits, and merges operate on catalog metadata — schemas, partitions, table snapshots. A Nessie commit captures the state of all tables atomically, enabling multi-table atomic operations. Integrates as an Iceberg REST catalog. Features: multi-branch development (dev branch for experiments, main for production), zero-copy environment isolation (branching clones catalog state without data duplication), and cross-table time travel. Use Nessie for multi-environment Iceberg tables, CI/CD for data, and consistent multi-table snapshots for ML training.

## Rules
- Always enable ACID (Delta, Iceberg, or Hudi) for any production lake table
- CoW for BI/analytics tables; MoR for high-ingestion CDC tables
- Set target file size: 256MB-1GB (avoid megabytes or gigabytes+ files)
- Vacuum retention = max expected time travel window + 24h
- Partition granularity: day for event data, month/year for historical
- Z-order on high-cardinality filter columns (customer_id, device_id)
- Enable file skipping statistics for all Iceberg tables
- Test schema evolution on staging before production

## References
  - references/data-lake-advanced.md — Data Lake Advanced Topics
  - references/data-lake-fundamentals.md — Data Lake Fundamentals
  - references/lake-gov-access.md — Data Lake Governance and Access Control
  - references/lake-operations.md — Lake Operations Reference
  - references/lake-performance-tuning.md — Data Lake Performance Tuning
  - references/nessie-catalog.md — Nessie Catalog — Git for Iceberg
  - references/table-formats.md — Table Formats Reference
  - references/xtable-multi-format.md — Apache XTable Multi-Format Interoperability
## Handoff
`data-distributed-storage` for S3-compatible object store configuration
`data-batch-processing` for Spark SQL optimization on lake tables
`data-data-lakehouse` for medallion architecture on top of lake
