# Table Formats Reference

## Delta Lake

### Transaction Log
```
Delta table layout:
  /table/
    _delta_log/
      00000000000000000001.json
      00000000000000000002.json
      00000000000000000003.checkpoint.parquet
      _last_checkpoint
    order_date=2024-01-15/
      part-00000-xxx.snappy.parquet
    order_date=2024-01-16/
      part-00001-yyy.snappy.parquet
```

### Commits
```json
// 00000000000000000001.json (commit info)
{
  "commitInfo": {
    "timestamp": 1705334400000,
    "operation": "WRITE",
    "operationParameters": {"mode": "Append"},
    "readVersion": -1  // -1 = no previous commit (new table)
  }
}
// Actions:
// {"add":{"path":"order_date=2024-01-15/part-00000.snappy.parquet","size":1024,"partitionValues":{"order_date":"2024-01-15"},"modificationTime":1705334400000,"dataChange":true,"stats":"{\"numRecords\":1000,\"minValues\":{\"amount\":10},\"maxValues\":{\"amount\":5000},\"nullCount\":{\"amount\":0}}"}}
```

### ACID Guarantees
- Optimistic concurrency: multiple writers attempt, conflict detection on readVersion
- Conflict resolution: readVersion mismatch = retry entire commit
- Serializable isolation for concurrent reads/writes
- Snapshot isolation for readers (no locking)

### Delta Features
```sql
-- Generated columns
CREATE TABLE events (
  event_id BIGINT,
  event_ts TIMESTAMP,
  event_date DATE GENERATED ALWAYS AS (CAST(event_ts AS DATE))
) USING DELTA;

-- Liquid clustering (Delta 3.0+)
ALTER TABLE events CLUSTER BY (event_date, event_type);
```

## Apache Iceberg

### Metadata Tree
```
Iceberg table:
  /table/metadata/
    00001-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.metadata.json
    snap-1337-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.avro  (manifest list)
    00003-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.metadata.json
  /table/data/
    partition_date=2024-01-15/
      00000-0-xxx.parquet
      00001-0-xxx.parquet
```

### Table Metadata Structure
```
metadata.json:
  -> format-version: 2
  -> table-uuid: uuid
  -> location: /table
  -> last-sequence-number: 3
  -> current-snapshot-id: 1337
  -> snapshots: [
       {snapshot-id: 1337, parent-snapshot-id: 1336,
        sequence-number: 3, manifest-list: "snap-1337-xxx.avro"}
     ]
  -> partition-spec: [{"name": "order_date", "transform": "day", "source-id": 3}]
  -> schema: {columns: [order_id, amount, order_date, customer_id]}
  -> properties: {read.split.target-size: "268435456"}
```

### ACID Guarantees
- Atomic commit: rename metadata.json with optimistic concurrency (catalog-specific)
- Catalog manages current metadata pointer (Hive, Nessie, REST, JDBC, DynamoDB)
- Multiple concurrent writers via catalog's atomic compare-and-swap
- Readers always see consistent snapshot (immutable committed data)

### Hidden Partitioning
```sql
-- Partition by event_ts day, no need to specify in query
CREATE TABLE events (
  event_id BIGINT,
  event_ts TIMESTAMP,
  amount DECIMAL(10,2)
) USING ICEBERG
PARTITIONED BY (days(event_ts));

-- Partition evolution: add year partition without rewrite
ALTER TABLE events ADD PARTITION FIELD years(event_ts);
```

## Apache Hudi

### File Layout
```
Hudi CoW table:
  /table/.hoodie/
    hoodie.properties   (.hoodie/, not .hudi/)
    .commits_.commit.001
    .inflight_.commit.001
  /table/order_date=2024-01-15/
    00000-xxx.parquet
    00001-xxx.parquet

Hudi MoR table:
  /table/.hoodie/  (same commit metadata)
  /table/order_date=2024-01-15/
    00000-xxx.parquet          (base file)
    .00000-xxx.log.1_0-0-1    (delta log)
```

### Write Modes

| Write Mode | Operation    | Read Performance | Write Performance | Use Case                 |
|-----------|-------------|------------------|-------------------|--------------------------|
| CoW       | Overwrite    | Fast (compact)   | Slow (rewrite)    | Read-heavy BI            |
| MoR       | Log + base   | Slow (merge)     | Fast (append)     | Write-heavy CDC          |

### Index Types
- Bloom: memory-efficient index for upserts (default)
- HBase: external HBase index for high-write volume
- Simple: record key range index (small tables)
- Bucket: hash-based, simple but requires no external deps

## Format Comparison

| Feature               | Delta Lake 3.x  | Iceberg 1.5+     | Hudi 0.15+     |
|-----------------------|----------------|------------------|----------------|
| ACID transactions     | Yes (OCC)      | Yes (catalog)    | Yes            |
| Schema evolution      | Add/rename/drop| Add/drop/rename/ | Add/drop/modify|
| Time travel           | Version + TS   | Snapshot + TS    | Commit TS      |
| Partition evolution   | No (requires   | Yes              | No (requires   |
|                       |  rewrite)      |                  |  clustering)   |
| Z-order/Hilbert       | Yes            | Sort-order       | Clustering     |
| Incremental queries   | CDF            | Incremental read | Yes (native)   |
| CDC (merge-on-read)   | No             | Merge-on-read    | Yes (MoR)      |
| Best engine           | Spark/Databricks| All (Spark,Fl    | Spark/Flink    |
|                       |                | ink,Trino,Dr     |                |
|                       |                | emio)           |                |
| Deletion              | DELETE         | DELETE + merge   | DELETE (CoW)   |
| Compaction            | OPTIMIZE       | rewrite_data_f   | inline/async   |
|                       |                | iles             | clustering     |
