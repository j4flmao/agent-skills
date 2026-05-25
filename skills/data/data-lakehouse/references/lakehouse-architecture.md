# Lakehouse Architecture Reference

## Medallion Architecture (Bronze/Silver/Gold)

| Layer | Characteristics | Storage | Operations |
|-------|----------------|---------|-----------|
| **Bronze** | Raw ingested, schema-on-read, append-only, preserves original format | Parquet/JSON/AVRO | Append, dead-letter on parse fail |
| **Silver** | Cleaned, deduplicated, validated, partitioned, CDC applied | Parquet (ZSTD) | Upserts, ACID enforced, constraints |
| **Gold** | Aggregated, joined, business KPIs, consumption-ready | Parquet (ZSTD) | Read-optimized, denormalized, columnar |

Quality gates at each boundary: Bronze → dead-letter on failure, Silver → alert on failure, Gold → block dashboard refresh.

## Delta Lake

ACID on object storage via `_delta_log/` transaction log. Key features: optimistic concurrency, `VERSION AS OF` time travel, schema enforcement + evolution (`mergeSchema`), caching, change data feed.

```sql
OPTIMIZE silver.orders ZORDER BY (customer_id, order_date);
VACUUM silver.orders RETAIN 168 HOURS;
ALTER TABLE silver.orders SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true');
```

## Apache Iceberg

Manages snapshots via catalog metadata files. Hidden partitioning (values computed, not stored), partition evolution without rewrite, multi-engine (Spark/Flink/Trino/Dremio/Presto).

```sql
CALL prod.system.expire_snapshots('analytics.orders', TIMESTAMP '2026-04-25 00:00:00');
CALL prod.system.rewrite_data_files(table => 'analytics.orders', strategy => 'sort',
                                    sort_order => 'order_date');
```

## Apache Hudi

Specializes in near-real-time upserts on object storage.

| Type | Write Amp | Read | Use Case |
|------|-----------|------|----------|
| **COW** | Higher (rewrites files) | Faster | Read-heavy |
| **MOR** | Lower (appends deltas) | Slower (needs merge) | Write-heavy |

## Format Comparison

| Capability | Delta | Iceberg | Hudi |
|-----------|-------|---------|------|
| ACID | Yes | Yes | Yes |
| Time travel | Yes | Yes | Yes |
| Schema evolution | Yes | Yes | Yes |
| Partition evolution | No (rewrite) | Yes | Yes |
| Upsert perf | Good | Good (v2) | Best |
| Multi-engine | Spark/Trino | Spark/Flink/Trino/Dremio | Spark/Flink/Presto |
| Best for | Databricks | Multi-engine | CDC upserts |

## Storage Design

**Compression**: ZSTD (default, ~4x), Snappy (~2.5x, interactive), GZIP (~6x, cold), LZ4 (~2x, streaming). **Partitioning**: date column for time-range, Z-order for high-cardinality filter columns, single partition if <1 GB.

### Partition Evolution

Iceberg supports changing partition specs without rewriting: `ALTER TABLE orders SET PARTITION SPEC (bucket(customer_id, 16))`. Delta requires full rewrite for partition changes. Hudi supports dynamic partitioning.

## Catalog Integration

| Catalog | Protocol | Best For |
|---------|----------|----------|
| Hive Metastore | Thrift | Legacy compat |
| AWS Glue | API | AWS-native |
| Unity Catalog | REST | Databricks |
| Nessie | REST (Iceberg) | Git-like versioning |
| Polaris | REST (Iceberg) | Open-source |

### Performance Optimization

Vacuum (7-day min retention), OPTIMIZE/Z-order for clustering, auto-compaction to 256MB-1GB files, liquid clustering in Delta for adaptive partitioning without explicit management.

## ACID on Object Stores

Object stores lack native transactions. Table formats implement ACID via: (1) write immutable data files to temp, (2) atomically commit metadata (compare-and-swap on `_delta_log` or catalog), (3) readers see latest committed snapshot only. Concurrency: Delta uses optimistic retry, Iceberg uses catalog CAS with deterministic resolution, Hudi uses timeline server.
