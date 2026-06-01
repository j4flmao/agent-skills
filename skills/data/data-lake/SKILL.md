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

### Max Response Length
250 lines of config.

## Workflow

### Step 1: Select Table Format

#### Format Comparison Matrix

| Feature | Delta Lake | Apache Iceberg | Apache Hudi |
|---|---|---|---|
| Primary sponsor | Databricks | Apache (Netflix) | Apache (Uber) |
| ACID | Optimistic concurrency | MVCC + optimistic | MVCC |
| Multi-engine | Spark, some Trino | Spark, Trino, Flink, Hive | Spark, Flink, Hive |
| Schema evolution | Add/drop/rename/comment | Add/drop/rename/reorder | Add/drop/rename |
| Partition evolution | No (re-write) | Yes (hidden partitioning) | No |
| Time travel | Delta log (max 30 days default) | Snapshot metadata | Timeline |
| Incremental query | Spark streaming source | Spark + Flink + Trino | Incremental queries |
| CDC support | CDC via merge into | Row-level delete + merge | Native CDC (MOR) |
| Table maintenance | OPTIMIZE, VACUUM | rewrite_data_files, expire_snapshots | clustering, compaction |
| File compaction | Bin-packing | Rewrite data files | Inline or async |

#### Format Selection Decision Tree

```
Primary query engine?
├── Spark (only), Databricks ecosystem → Delta Lake
├── Multi-engine (Spark + Trino + Flink)
│   ├── Partition evolution needed → Apache Iceberg
│   └── No partition evolution → Delta Lake or Iceberg
├── Heavy CDC / update workloads
│   ├── Need native CDC → Apache Hudi (MOR)
│   └── General CDC → Apache Iceberg with merge
└── Hive/Presto/Trino only
    ├── Iceberg (best Hive/Trino support)
    └── Hudi (older Hive support)

Write pattern?
├── Append-heavy (logs, events) → Any format
├── Update-heavy (CDC, GDPR deletions) → Hudi (MOR) or Iceberg
└── Deletes (GDPR right to erasure) → Iceberg or Delta
```

### Step 2: Configure ACID Guarantees

#### Delta Lake Concurrency

```yaml
# Delta Lake ACID config
delta.autoOptimize.autoCompact: true
delta.autoOptimize.optimizeWrite: true
delta.maxRetryCommitAttempts: 10000000  # Retry on conflict
delta.tuneFileSizesForRewrites: true

# Concurrent write conflict handling
# Delta uses optimistic concurrency — retries on conflict
# For high-contention tables, use partition-level writes
# Avoid writing to same partition from multiple jobs simultaneously

# Isolation level
delta.isolationLevel: Serializable  # Default (most strict)
# delta.isolationLevel: WriteSerializable  # Less strict, better concurrency
```

#### Iceberg Concurrency

```yaml
# Iceberg catalog-level conflict handling
# Iceberg uses optimistic concurrency at catalog level
# Retry mechanism built into Spark/Flink Iceberg integrations
# For high-contention scenarios, use:
  1. Partition-level writes
  2. Retry with exponential backoff (built-in)
  3. Serializable isolation (default)

# Iceberg catalog properties
iceberg:
  catalog:
    type: hive  # or nessie, glue, jdbc, rest
    lock-impl: in-memory  # For testing only
    # Production: use catalog-native locking (HMS Lock, DynamoDB)
    warehouse: s3://data-lake/warehouse
```

### Step 3: Write Mode Selection

#### Copy-on-Write (CoW)
Writes rewrite entire Parquet files. Best for: read-heavy workloads, append-only tables, smaller tables, OLAP queries. Pros: no merge at read time, simple file layout, compact storage. Cons: write amplification (rewrite whole file on single row update).

#### Merge-on-Read (MoR)
Writes append delta logs (Avro/Parquet), compacted later. Best for: update-heavy workloads, CDC ingestion, large tables with frequent updates, tables where write speed matters more than read speed. Pros: fast writes, no write amplification. Cons: read overhead merging base + delta files.

```yaml
# Hudi MOR configuration
hoodie.datasource.write.table.type: MERGE_ON_READ
hoodie.table.type: MERGE_ON_READ
hoodie.compact.inline: true  # Inline compaction
hoodie.compact.inline.max.delta.commits: 5  # Compact every 5 commits

# Iceberg: use merge-in-read (not separate write mode)
# Iceberg handles all updates via merge-on-read automatically
```

### Step 4: Partition Strategy

#### Partition Design Rules
Partition by: low-to-medium cardinality columns (< 1000 partitions for daily, < 365 for daily year). Prefer: date-based partitioning (event_date, year/month/day) for time-series data. Avoid: high-cardinality columns as partition keys (customer_id, order_id). Iceberg hidden partitioning: define partition transforms and Iceberg manages partition layout transparently.

```sql
-- Delta Lake
CREATE TABLE events (
    event_id STRING,
    event_type STRING,
    event_date DATE,
    payload STRUCT<
        user_id: STRING,
        page: STRING,
        duration: INT
    >
)
USING DELTA
PARTITIONED BY (event_date)
LOCATION 's3://data-lake/events/';

-- Apache Iceberg with hidden partitioning
CREATE TABLE events (
    event_id STRING,
    event_type STRING,
    event_date DATE,
    payload STRUCT<user_id: STRING, page: STRING, duration: INT>
)
USING ICEBERG
PARTITIONED BY (days(event_date))
LOCATION 's3://data-lake/events/';

-- Hudi
CREATE TABLE events (
    event_id STRING,
    event_type STRING,
    event_date DATE,
    payload STRING  -- JSON
)
USING HUDI
PARTITIONED BY (event_date)
OPTIONS (
    primaryKey = 'event_id',
    preCombineField = 'event_date',
    hoodie.datasource.write.table.type = 'COPY_ON_WRITE'
)
LOCATION 's3://data-lake/events/';
```

### Step 5: File Layout Optimization

#### Target File Size

```yaml
# Target: 128MB - 1GB files (balance parallelism with overhead)
# For Delta:
delta.targetFileSize: 256mb
delta.tuneFileSizesForRewrites: true

# For Iceberg:
write.target-file-size-bytes: 268435456  # 256MB

# For Hudi:
hoodie.parquet.max.file.size: 268435456
hoodie.parquet.small.file.limit: 134217728  # 128MB - files below this merged
```

#### Compaction

```sql
-- Delta Lake compact
OPTIMIZE events ZORDER BY (event_type, user_id);

-- Iceberg compact
CALL catalog.system.rewrite_data_files(
    table => 'events',
    strategy => 'binpack',
    options => map('target-file-size-bytes', '268435456')
);

-- Iceberg expire snapshots
CALL catalog.system.expire_snapshots('events', TIMESTAMP '2026-01-01 00:00:00');

-- Hudi compaction (inline)
-- Configured at write time:
hoodie.compact.inline: true
hoodie.compact.inline.max.delta.commits: 5
hoodie.compact.inline.max.delta.seconds: 3600
```

#### Z-Order / Hilbert Clustering

```sql
-- Delta Z-order: reduces data scanned for queries filtering on clustered columns
OPTIMIZE events ZORDER BY (event_type, user_id);
-- Z-order effect: queries on event_type or user_id scan fewer files
-- Best for: 2-4 columns frequently used in WHERE clauses together

-- Iceberg sort order (v2+)
CREATE TABLE events (
    ...
) USING ICEBERG
PARTITIONED BY (days(event_date))
ORDER BY (event_type, user_id);

-- Hudi clustering
CALL run_clustering(
    table => 'events',
    order => 'event_type,user_id',
    target_file_max_size => 268435456
);
```

### Step 6: Vacuum / Snapshot Expiration

```yaml
# Delta VACUUM default retention: 7 days
# Keep enough for concurrent read isolation + time travel queries
vacuum:
  retention_hours: 168  # 7 days
  # For compliance: extend based on audit requirements
  # For testing environments: reduce to 24h
  # NEVER vacuum concurrently with active write operations

# Iceberg snapshot expiration
expire_snapshots:
  retain_last_n: 10     # Keep 10 most recent
  older_than: 7 days    # Delete snapshots older than 7 days
  # Run daily as maintenance job
  # Spark SQL: CALL catalog.system.expire_snapshots('table', older_than => 7)

# Hudi cleaner
hoodie.cleaner.policy: KEEP_LATEST_COMMITS
hoodie.cleaner.commits.retained: 10  # Keep last 10 commits
```

### Step 7: Schema Evolution

#### Evolution Allowed Operations

| Operation | Delta Lake | Iceberg | Hudi |
|---|---|---|---|
| Add column | Yes (nullable) | Yes | Yes |
| Drop column | Yes | Yes | Yes |
| Rename column | Yes (no references) | Yes | Yes |
| Reorder columns | No | Yes | No |
| Widen type | Yes (safe casts) | Yes (safe casts) | Limited |
| Narrow type | No | No | No |
| Add comment | Yes | Yes | Via Hive |

```sql
-- Delta Lake schema evolution
ALTER TABLE events ADD COLUMN new_field STRING;
ALTER TABLE events ALTER COLUMN old_field DROP;
ALTER TABLE events RENAME COLUMN old_field TO new_field;

-- Iceberg schema evolution
ALTER TABLE events ADD COLUMN new_field STRING;
ALTER TABLE events DROP COLUMN old_field;
ALTER TABLE events RENAME COLUMN old_field TO new_field;
-- Iceberg reorders columns:
ALTER TABLE events ALTER COLUMN col2 FIRST;
ALTER TABLE events ALTER COLUMN col3 AFTER col1;

-- Hudi schema evolution (Spark SQL)
ALTER TABLE events ADD COLUMNS (new_field STRING);
```

### Step 8: Time Travel

```sql
-- Delta Lake time travel
SELECT * FROM events VERSION AS OF 12345;        -- By version number
SELECT * FROM events TIMESTAMP AS OF '2026-05-01'; -- By timestamp

-- Restore to previous version
RESTORE TABLE events TO VERSION AS OF 12345;

-- Iceberg time travel
SELECT * FROM events FOR SYSTEM_TIME AS OF '2026-05-01 12:00:00';  -- By timestamp
SELECT * FROM events FOR SYSTEM_VERSION AS OF 12345;                -- By snapshot ID

-- Hudi time travel
SELECT * FROM events TIMESTAMP AS OF '2026-05-01 12:00:00';
```

### Step 9: Incremental Queries

```sql
-- Delta incremental query (Spark Streaming source)
spark.readStream.format("delta")
    .option("startingVersion", "100")
    .table("events")

-- Delta change data feed
ALTER TABLE events SET TBLPROPERTIES (delta.enableChangeDataFeed = true);
SELECT * FROM table_changes('events', 12345, 12350);

-- Iceberg incremental read
SELECT * FROM events.incremental(100)  -- Spark incremental query

-- Hudi incremental pull
SELECT * FROM events WHERE _hoodie_commit_time > '20260101000000';
```

### Step 10: Performance Optimization

#### Read Optimization

```yaml
# Parallelism and file scanning
spark.sql.files.maxPartitionBytes: 256MB     # Max bytes per partition
spark.sql.files.openCostInBytes: 4MB          # Cost of opening a file
spark.sql.files.minPartitionNum: 1            # Min partitions

# Iceberg read optimizations
read.split.target-size: 268435456             # 256MB split target
read.split.planning-lookback: 10              # Planned splits count
read.split.open-file-cost: 4194304            # 4MB open cost
```

#### Write Optimization

```yaml
# Parallel writes
spark.sql.shuffle.partitions: 400            # Adjust for data volume
spark.sql.hive.convertMetastoreParquet: true

# Iceberg write optimizations
write.distribution-mode: hash                 # hash, range, none
write.wap.enabled: false                      # Write-Audit-Publish
write.merge.mode: merge-on-read               # Default for Iceberg updates

# Delta write optimizations
delta.autoOptimize.autoCompact: true
delta.autoOptimize.optimizeWrite: true
```

## Rules
- Always use open table formats — never raw Parquet/ORC on object stores
- Partition by date for time-series data — enable partition pruning
- Compaction target: 128MB-1GB files for optimal read parallelism
- Vacuum retention: 7 days minimum for time travel and concurrent reads
- Enable Z-order/Hilbert clustering for multi-column filter patterns
- Use hidden partitioning (Iceberg) for transparent partition management
- Monitor small files — run compaction when avg file size < 64MB
- Run vacuum/snapshot expiration as scheduled maintenance jobs
- Enable change data feed for incremental downstream consumers
- Test schema changes on staging before production rollout
- Use column-level statistics for CBO on query engines

### Lake Maintenance Jobs

```yaml
# Recommended maintenance schedule for lake tables
maintenance_jobs:
  - name: compact_small_files
    schedule: "0 2 * * *"  # Daily at 2 AM
    tables:
      - pattern: "prod.*"  # All production tables
      - except: ["prod.ref.*"]  # Skip reference tables
    target_file_size: 256MB
  
  - name: expire_snapshots
    schedule: "0 3 * * *"  # Daily at 3 AM
    retention: 7 days
    tables:
      - pattern: "*"
  
  - name: remove_orphan_files
    schedule: "0 4 * * 0"  # Weekly on Sunday
    tables:
      - pattern: "*"
  
  - name: update_statistics
    schedule: "0 5 * * *"  # Daily at 5 AM
    tables:
      - pattern: "prod.*"
    compute_stats: true
    compute_column_stats: true
```

## Rules
- Always use open table formats — never raw Parquet/ORC on object stores
- Partition by date for time-series data — enable partition pruning
- Compaction target: 128MB-1GB files for optimal read parallelism
- Vacuum retention: 7 days minimum for time travel and concurrent reads
- Enable Z-order/Hilbert clustering for multi-column filter patterns
- Use hidden partitioning (Iceberg) for transparent partition management
- Monitor small files — run compaction when avg file size < 64MB
- Run vacuum/snapshot expiration as scheduled maintenance jobs
- Enable change data feed for incremental downstream consumers
- Test schema changes on staging before production rollout
- Use column-level statistics for CBO on query engines
- Never run vacuum concurrently with active write operations
- Document table format decision in ADR with specific rationale
- Monitor write amplification for update-heavy tables (prefer MoR)
- Use version catalog (Nessie) for Git-like branching on the lake

## References
Coming soon.

## Handoff
`data-data-platform` for overall lake architecture
`data-data-warehouse` for warehouse layer on top of lake
`data-distributed-storage` for storage infrastructure details
