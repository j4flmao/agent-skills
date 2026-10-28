# Physical Layout Tuning: Partitioning, Clustering and File Sizes

How to lay out lake table data so queries read as little as possible: partition design, sort/cluster keys, file sizing and statistics. Query-engine settings are in `performance-optimization.md`; write-path throughput is in `performance_tuning.md`.

## How Engines Skip Data

1. Partition pruning: skip whole partitions from predicates on partition columns (or Iceberg partition transforms).
2. File skipping: min/max (and null count) column stats per file in metadata.
3. Row-group skipping: Parquet footer stats and optional bloom filters.
4. Page skipping: Parquet column/offset indexes (engine-dependent).

Layout work aims to make steps 1–3 effective for the most common filters.

## Partitioning

| Guideline | Reason |
|---|---|
| Partition on the column in most WHERE clauses, usually event date | Pruning at planning |
| Keep partition count modest, aim for ≥ 1 GB per partition | Avoid tiny files and huge metadata |
| Avoid high-cardinality keys (user_id) as partitions | Millions of partitions and small files |
| Use transforms (Iceberg `days`, `hours`, `bucket`, `truncate`) | No derived columns, evolvable |

```sql
-- Iceberg
CREATE TABLE lake.silver.events (
  event_id BIGINT, tenant_id STRING, event_ts TIMESTAMP, kind STRING, payload STRING)
USING iceberg
PARTITIONED BY (days(event_ts));

-- Delta (new tables): prefer liquid clustering over partitions for multi-column filters
CREATE TABLE lake.silver.events_d (event_id BIGINT, tenant_id STRING, event_ts TIMESTAMP, kind STRING)
USING delta CLUSTER BY (event_ts, tenant_id);
```

## Clustering Within Partitions

Partition pruning picks partitions; clustering makes file-level min/max ranges narrow for secondary filters.

| Technique | Format | Good for |
|---|---|---|
| Linear sort | Iceberg sort order, Delta/Hudi sort on write | One dominant secondary filter |
| Z-order | Delta `ZORDER BY`, Iceberg `zorder(...)`, Hudi clustering | 2–4 filter columns of similar importance |
| Hilbert curve | Hudi clustering (`hoodie.layout.optimize.curve.build.method=hilbert`), Delta liquid clustering internals | Multi-dimensional locality |
| Liquid clustering | Delta | Changing access patterns, incremental clustering |

```sql
ALTER TABLE lake.silver.events WRITE ORDERED BY tenant_id, event_ts;          -- Iceberg
CALL lake.system.rewrite_data_files(table => 'silver.events', strategy => 'sort',
     sort_order => 'zorder(tenant_id, kind)');
OPTIMIZE lake.silver.events_z ZORDER BY (tenant_id, kind);                     -- Delta (non-liquid)
```

Z-ordering more than ~4 columns dilutes locality for each; pick columns from query logs, not from intuition.

## File Size Targets

| Workload | Target data file size |
|---|---|
| Large scans / BI | 256 MB – 1 GB |
| Selective lookups, frequent MERGE | 64 – 256 MB |
| Streaming tables before compaction | whatever arrives; compact to the above |

Settings: Iceberg `write.target-file-size-bytes`; Delta `delta.targetFileSize` (and auto-tuning on Databricks); Hudi `hoodie.parquet.max.file.size`.

## Column Statistics

- Iceberg collects stats for all columns by default with truncation; limit wide tables: `write.metadata.metrics.default=none` and enable `full` for filter columns via `write.metadata.metrics.column.<col>`.
- Delta collects stats on the first `delta.dataSkippingNumIndexedCols` (32) columns, or the explicit `delta.dataSkippingStatsColumns` list — put filter columns early or list them.
- Stats on long strings are truncated; filters on such columns skip poorly.

## Bloom Filters

For high-cardinality equality filters (IDs) where min/max ranges overlap:

```sql
ALTER TABLE lake.silver.events SET TBLPROPERTIES (
  'write.parquet.bloom-filter-enabled.column.event_id' = 'true',
  'write.parquet.bloom-filter-fpp.column.event_id' = '0.01');
```

Only new files get bloom filters; rewrite to backfill. They help point lookups, not range scans.

## Measuring

```sql
-- Iceberg: how many files a query plans (Spark UI "number of files read"), and table layout
SELECT partition, count(*) files, sum(record_count) rows, avg(file_size_in_bytes) avg_bytes
FROM lake.silver.events.files GROUP BY partition ORDER BY files DESC LIMIT 20;
```

Compare "files read / files total" and bytes scanned before and after a layout change on representative queries.

## Pitfalls
- Partitioning by a column queries do not filter on.
- Re-partitioning by rewriting a huge Delta table when liquid clustering or Iceberg partition evolution would avoid it.
- Z-ordering on a column that is already the partition key.
- Expecting clustering to persist: new writes are unclustered until the next OPTIMIZE/rewrite.

## Checklist
- [ ] Partition and cluster keys derived from query logs
- [ ] Partition sizes ≥ ~1 GB, no high-cardinality partitions
- [ ] File size target set per workload, compaction keeps it
- [ ] Stats enabled on filter columns
- [ ] Bloom filters only for selective equality lookups
- [ ] Layout changes validated by files/bytes scanned
