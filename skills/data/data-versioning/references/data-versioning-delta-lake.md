# Data Versioning Delta Lake

## Overview

Delta Lake is an open-source storage layer that brings ACID transactions, scalable metadata handling, and unified batch/streaming to data lakes. It provides time travel, schema enforcement, and versioned data through a transaction log. This reference covers advanced Delta Lake patterns: time travel mechanics, optimization strategies, versioning at scale, and integration with data versioning workflows.

## Delta Lake Architecture

### Transaction Log (Delta Log)

The Delta transaction log records every change to a Delta table in sequence. The log lives in `_delta_log/` directory as JSON files. Each file represents a version/commit.

```
table/
  _delta_log/
    00000000000000000000.json  -- Initial table creation
    00000000000000000001.json  -- INSERT 1000 rows
    00000000000000000002.json  -- DELETE 500 rows
    00000000000000000003.json  -- UPDATE 200 rows
    00000000000000000004.json  -- OPTIMIZE (compact small files)
    ...
    00000000000000001000.json  -- Current version
```

Each Delta log entry contains:
- `protocol`: minimum reader/writer protocol version
- `metaData`: schema, partition columns, table properties
- `add`: list of added files with stats (min/max values, null count)
- `remove`: list of removed files
- `txn`: application-specific transaction identifiers
- `commitInfo`: commit timestamp, operation type, user, operation parameters

### ACID Transactions

Delta Lake provides ACID guarantees:
- **Atomicity**: all changes in a commit succeed or fail together
- **Consistency**: schema and constraints are always valid
- **Isolation**: concurrent readers see a consistent snapshot (serializable)
- **Durability**: once committed, data persists in object storage

Concurrent write conflicts are handled by optimistic concurrency control:
1. Reader acquires table version
2. Writer tries to commit new version
3. If another writer committed first (conflict), one writer retries
4. Automatic conflict resolution for non-conflicting operations (e.g., appending to different partitions)

## Time Travel

Time travel allows querying previous versions of a Delta table. This is the foundation of data versioning in Delta Lake.

### Time Travel Syntax

```sql
-- By version number
SELECT * FROM events VERSION AS OF 42;
SELECT * FROM events FOR SYSTEM_VERSION AS OF 42;

-- By timestamp
SELECT * FROM events TIMESTAMP AS OF '2025-05-15';
SELECT * FROM events FOR SYSTEM_TIMESTAMP AS OF '2025-05-15T10:30:00';

-- Using DataFrame API (PySpark)
df = spark.read.format("delta") \
    .option("versionAsOf", "42") \
    .table("events")

df = spark.read.format("delta") \
    .option("timestampAsOf", "2025-05-15") \
    .table("events")
```

### Time Travel Mechanics

Time travel is purely a metadata operation. When reading a previous version, Delta:
1. Reads the Delta log up to the specified version
2. Constructs the file list for that version (which files to read)
3. Reads only the files that were active at that version
4. No data copying or rewriting involved

This means time travel is:
- **Fast**: O(number of versions) metadata lookup, not data movement
- **Efficient**: no additional storage for snapshots (uses existing Parquet files)
- **Limited by retention**: old file versions are removed by VACUUM

### Time Travel Retention

```sql
-- Default: files retained for 7 days for time travel
-- Configure via table property
ALTER TABLE events SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 30 days',
  'delta.deletedFileRetentionDuration' = 'interval 30 days',
  'delta.enableChangeDataFeed' = 'true'
);
```

- `delta.logRetentionDuration`: how long the Delta log retains entries (default 30 days). Older entries can be cleaned by checkpointing.
- `delta.deletedFileRetentionDuration`: how long removed files are preserved for time travel (default 7 days). VACUUM removes files older than this.
- For compliance requiring 7-year time travel: set retention to 7 years. Storage cost increases proportionally (data kept as Parquet).

## Version History

### Inspecting Table History

```sql
-- Show last 10 versions
DESCRIBE HISTORY events LIMIT 10;

-- Output:
-- version | timestamp | operation | operationParameters | readVersion | ...
-- 42      | ...       | WRITE     | {mode: Overwrite}  | 41          | ...
-- 41      | ...       | DELETE    | {predicate: [...]} | 40          | ...
```

### Restoring to Previous Version

```sql
-- RESTORE (Delta Lake 2.0+)
RESTORE TABLE events TO VERSION AS OF 42;
RESTORE TABLE events TO TIMESTAMP AS OF '2025-05-15';

-- RESTORE creates a new version that returns the table to the previous state
-- It does NOT modify previous version history
-- After RESTORE, the current version points to the restored state
```

RESTORE is not a simple rollback — it creates a new commit that replicates the file list from the target version. This preserves the full version history (the old versions and the restore are all recorded in the log).

## Data Versioning Patterns

### Snapshot Pattern

Take periodic snapshots of datasets for reproducibility:

```python
from delta.tables import DeltaTable

dt = DeltaTable.forPath(spark, "/data/events")

# Create snapshot version
dt.toDF().write \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .save("/data/events_snapshot_20250515")

# Or use Delta clone
spark.sql("""
    CREATE OR REPLACE TABLE events_snapshot_20250515
    SHALLOW CLONE events
""")
```

### Versioned Table Pattern

Maintain explicit version columns in the table:

```python
from pyspark.sql.functions import lit, current_timestamp

# Add version column on write
df = df.withColumn("version", lit(42))
df = df.withColumn("valid_from", current_timestamp())
df = df.withColumn("valid_to", lit(None))

# Add new version rows without modifying old ones
df.write.mode("append").saveAsTable("events_versioned")
```

### SCD Type 2 with Delta

```python
from pyspark.sql.functions import col, current_timestamp, when, coalesce
from delta.tables import DeltaTable

def upsert_scd2(delta_table, updates, merge_key):
    updates = updates.withColumn("valid_from", current_timestamp())
    updates = updates.withColumn("valid_to", lit(None))

    delta_table.alias("target") \
        .merge(updates.alias("source"), merge_key) \
        .whenMatchedUpdate(condition="target.is_current = true") \
        .set({
            "valid_to": current_timestamp(),
            "is_current": lit(False),
        }) \
        .whenNotMatchedInsert(values={
            "valid_from": current_timestamp(),
            "valid_to": lit(None),
            "is_current": lit(True),
        }) \
        .execute()
```

## Change Data Feed (CDF)

Delta CDF enables row-level change tracking between versions. Each CDF record indicates whether the row was inserted, deleted, or updated.

```sql
-- Enable CDF on a table
ALTER TABLE events SET TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Query changes between versions
SELECT * FROM table_changes('events', 42, 45);

-- Query changes by timestamp
SELECT * FROM table_changes('events', '2025-05-15', '2025-05-16');
```

CDF output columns:
- `_change_type`: `insert`, `delete`, `update_preimage`, `update_postimage`
- `_commit_version`: Delta version where the change occurred
- `_commit_timestamp`: when the change was committed
- Original table columns

### CDF Use Cases

1. **Streaming ingestion**: read only changed rows instead of full table scans
2. **Downstream sync**: push changes to other systems (e.g., Elasticsearch, Redis)
3. **Audit trail**: track all changes for compliance
4. **Materialized view maintenance**: update derived tables incrementally

```python
# Read CDF stream
df = spark.readStream.format("delta") \
    .option("readChangeFeed", "true") \
    .table("events")

df = spark.readStream.format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingVersion", "42") \
    .table("events")
```

## Optimization for Versioned Data

### Vacuum

VACUUM removes old files no longer referenced by the transaction log beyond the retention period.

```sql
-- Dry run (list files that would be deleted)
VACUUM events DRY RUN;
VACUUM events DRY RUN RETAIN 168 HOURS;

-- Actual removal
VACUUM events;
VACUUM events RETAIN 168 HOURS;  -- 7 days (default)
VACUUM events RETAIN 0 HOURS;    -- Remove all old files (breaks time travel!)
```

VACUUM best practices:
- Always run with DRY RUN first
- Use 168 hours (7 days) minimum for time travel
- Larger retention increases storage but preserves versioning capability
- Schedule VACUUM during low-traffic periods
- Run VACUUM at most once per day for most tables

### OPTIMIZE

OPTIMIZE compacts small files into larger ones, improving read performance.

```sql
-- Compact all files
OPTIMIZE events;

-- Compact with file size threshold
OPTIMIZE events WHERE date >= '2025-05-01';
```

OPTIMIZE and versioning:
- OPTIMIZE creates new files and removes old ones (new version in log)
- Previous versions still reference the original (pre-OPTIMIZE) files
- VACUUM after OPTIMIZE removes old files after retention period
- OPTIMIZE does not change data, only physical layout

### Z-Order Clustering

```sql
-- Cluster by high-cardinality filter columns
OPTIMIZE events ZORDER BY (event_id, user_id);
```

Z-Order improves file skipping by colocating similar values. For versioned tables where queries filter by version or timestamp, Z-order on the version column helps prune files.

### Liquid Clustering

```sql
-- Delta Lake 3.0+
ALTER TABLE events CLUSTER BY (event_type, event_date);

-- Automatically maintained on writes
INSERT INTO events VALUES (...);
```

Liquid clustering provides automatic data layout optimization without manual OPTIMIZE management.

## Delta Sharing for Versioned Data

Delta Sharing enables sharing versioned data with external parties without copying.

```sql
-- Share a specific version
CREATE SHARE events_share;
ALTER SHARE events_share ADD TABLE events;
GRANT SELECT ON SHARE events_share TO RECIPIENT partner;

-- Recipient queries with time travel
SELECT * FROM events FOR VERSION AS OF 42;
```

When sharing versioned data, the recipient can independently navigate versions. The producer controls access at the share level, not per version.

## Concurrency and Conflict Resolution

### Optimistic Concurrency

Delta Lake uses optimistic concurrency control. Writers attempt to commit; if a conflict is detected, one writer retries.

```python
# Retry logic for concurrent writes
from delta.tables import DeltaTable
from pyspark.sql.utils import AnalysisException

def write_with_retry(df, path, max_retries=3):
    for attempt in range(max_retries):
        try:
            df.write.format("delta").mode("append").save(path)
            return
        except AnalysisException as e:
            if "concurrent" in str(e).lower():
                if attempt < max_retries - 1:
                    continue
            raise
```

### Conflict Types

| Conflict | Resolution |
|---|---|
| Append to different partitions | Automatic — no conflict |
| Append with path partition overlap | Automatic — no conflict |
| Delete vs delete of same data | One retries |
| Update vs update of same row | One retries |
| Schema change vs concurrent write | One fails (schema lock) |

## Integration with DVC and LakeFS

### Delta + DVC

Delta tables can be tracked in DVC like any dataset:

```bash
# Track Delta table directory
dvc add data/events_delta/

# The .dvc file records the hash of the Delta table
# Note: Delta tables contain multiple files; DVC tracks the directory

# Version with experiments
dvc exp run --set-param data.version=42
```

### Delta + LakeFS

Delta tables work transparently on LakeFS branches:

```bash
# Create branch for data development
lakectl branch create lakefs://data-lake/refs/heads/etl-dev

# Read Delta table on branch
spark.read.format("delta").load("s3://data-lake/events")

# Commit changes
lakectl commit lakefs://data-lake/etl-dev -m "update events table"

# Time travel with LakeFS + Delta
# LakeFS handles object-level versioning
# Delta handles table-level time travel within a branch
```

### Delta + Nessie

Nessie provides catalog-level versioning for Delta tables (via Iceberg REST catalog):

```python
# Nessie manages catalog versions
# Delta manages data versions within each catalog version

client = NessieClient('http://nessie:19120/api/v2')
client.create_branch('dev', 'main')

# On dev branch, Delta operations work normally
# On merge to main, all table changes become visible atomically
client.merge('dev', 'main')
```

## Time Travel Performance

### Query Performance by Version

| Version Lookup | Metadata Time | Data Read |
|---|---|---|
| Latest version | O(1) — direct to latest checkpoint | All active files |
| Recent version (< 100 versions ago) | O(n) — replay from last checkpoint | Active files at that version |
| Old version (100-10000 versions ago) | O(n) — replay from checkpoint | Files active at old version |
| Very old version (> 10000 versions) | O(n) — many checkpoint reads | May be slow due to file age |

Performance degradation for old time travel queries is usually due to:
1. Long checkpoint replay for old versions
2. Files may be small (written before compaction)
3. File skipping stats may be stale

Mitigation:
- Generate checkpoints every 10 versions (default)
- Run OPTIMIZE periodically to maintain file quality
- Use RESTORE to create fresh versions for frequently-queried snapshots

### Checkpoint Management

```sql
-- Default: checkpoint every 10 versions
ALTER TABLE events SET TBLPROPERTIES (
  'delta.checkpointInterval' = 10
);
```

Checkpoints aggregate all previous Delta log entries into a single Parquet file, dramatically reducing replay time. The trade-off is compute time to generate checkpoints and storage for checkpoint files.

## Operational Considerations

### Storage Costs

Versioned Delta tables consume more storage due to retained files. Estimate:

```
storage_per_version = data_size + delta_log_size
total_storage = data_size * retention_versions + delta_log_size * num_versions

Example:
  100GB table, 1000 versions, 7-day retention
  Each version writes ~50MB new data (append-only)
  Total: 100GB (latest) + 50MB * 1000 * 7 = 100GB + 350GB = 450GB
```

Use VACUUM and compaction to balance versioning capability with storage cost. For append-only tables, file count grows faster than data size — compaction helps.

### Monitoring Version Health

```python
def check_delta_health(table_path):
    dt = DeltaTable.forPath(spark, table_path)
    history = dt.history(100)

    return {
        'current_version': history.select('version').first()[0],
        'total_commits': history.count(),
        'total_files': spark.read.format("delta").load(table_path) \
            .inputFiles().size(),
        'last_optimize': history \
            .filter("operation = 'OPTIMIZE'") \
            .select('timestamp').first(),
        'last_vacuum': history \
            .filter("operation = 'VACUUM'") \
            .select('timestamp').first(),
    }
```

### Versioning Best Practices

1. **Set retention based on compliance needs**: 7 days default, 30 days for most, 7 years for regulated.
2. **Use VACUUM sparingly**: only after OPTIMIZE, and only when retention policy allows.
3. **Enable CDF for streaming consumers**: avoids full table scans for downstream sync.
4. **Use SHALLOW CLONE for instant snapshots**: no data copy, metadata-only.
5. **Generate checkpoints frequently for active tables**: reduces time travel replay time.
6. **Monitor table size and file count**: growing file count signals need for OPTIMIZE.
7. **Partition large tables**: improves time travel performance for partition-pruned queries.
8. **Use Z-order on version/timestamp columns**: faster version-range queries.

## Delta Lake Protocol Evolution

| Protocol Version | Key Features | Delta Lake Version |
|---|---|---|
| 1 | ACID transactions, time travel | 0.4+ |
| 2 | CHECK constraints, generated columns | 1.0+ |
| 3 | Column mapping, identity columns | 2.0+ |
| 4 | Deletion vectors, liquid clustering | 3.0+ |
| 5 (current) | Row tracking, variant type | 3.2+ |

Protocol versions are forward-compatible: newer readers can read old tables, but old readers cannot read new protocol tables. Always update reader/writer protocol versions in coordination.

## Delta Lake vs Other Versioning Approaches

| Feature | Delta Time Travel | DVC | LakeFS | Nessie |
|---|---|---|---|---|
| Scope | Single Delta table | Files + pipelines | Object store | Iceberg catalog |
| Version granularity | Row-level (via CDF) | File-level | Object-level | Table-level |
| Time travel cost | Metadata only | Full file pull | Metadata only | Metadata only |
| Retention control | VACUUM + log retention | dvc gc | Branch GC | Nessie GC |
| Multi-table atomic | No | No | Yes (commit) | Yes (commit) |
| Branching | No | Git-based | Yes | Yes |
| ML experiment tracking | No | Built-in | No | No |
| Storage overhead | File retention | Cache only | Branch storage | Metadata only |

## References
- Delta Lake Documentation: https://docs.delta.io/
- Delta Lake GitHub: https://github.com/delta-io/delta
- Delta Sharing Specification: https://github.com/delta-io/delta-sharing
- Armbrust et al. "Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics" (2021)
- Delta Lake Transaction Log Protocol: https://github.com/delta-io/delta/blob/master/PROTOCOL.md
