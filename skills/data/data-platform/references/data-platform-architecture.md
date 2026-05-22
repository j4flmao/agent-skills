# Data Platform Architecture

## Architecture Comparison

| Aspect | Data Lake | Data Lakehouse | Data Warehouse | Data Mesh |
|--------|-----------|---------------|---------------|-----------|
| Storage Format | Raw files (JSON, CSV, Parquet) | Open table formats (Delta, Iceberg, Hudi) | Schema-on-write, proprietary | Domain-owned, any format |
| ACID Transactions | No (with table format: yes) | Yes | Yes | Per domain |
| Schema | Schema-on-read | Schema enforcement | Schema-on-write | Domain-defined |
| Compute | Decoupled | Decoupled | Coupled | Decoupled per domain |
| Use Case | Data science, ML | BI + ML + data science | BI, reporting | Large orgs, many domains |

## Storage Formats

### Apache Parquet
Columnar storage format. Best for analytical queries. Use ZSTD compression. Partition by date or high-cardinality categorical. Row group size: 128MB-1GB.

### Open Table Formats

| Feature | Delta Lake | Apache Iceberg | Apache Hudi |
|---------|-----------|---------------|-------------|
| ACID | Yes | Yes | Yes |
| Time Travel | Yes | Yes | Yes |
| Schema Evolution | Yes | Yes | Yes |
| Optimized for | Databricks/Spark | Trino, Flink, Spark | Upsert-heavy workloads |
| File Format | Parquet | Parquet, Avro, ORC | Parquet, Avro |

## Compute Engines

### Apache Spark
Batch ETL, ML training. Python/Scala/Java/SQL. DataFrame API for transformations. Tungsten optimizer for performance.

### Trino / Presto
Distributed SQL query engine. Interactive queries on data lake. Federation: query across sources. Supports Iceberg, Delta, Hive tables.

### Dremio / Starburst
Data virtualization layers built on Trino/Presto. Add: source reflections (acceleration), semantic layer (views), lakehouse management.

## Partitioning Strategy

```sql
-- Partition by date for time-series data
PARTITIONED BY (year INT, month INT, day INT)

-- Or use a single date column
PARTITIONED BY (event_date DATE)
```

Choose partition granularity so each partition is 100MB-1GB. Too many small partitions hurts performance.

## Compression

| Codec | Ratio | Speed | Use Case |
|-------|-------|-------|----------|
| ZSTD | 2.5-3x | Fast | Best all-around |
| Snappy | 2x | Very fast | Write-heavy workloads |
| GZIP | 3-4x | Slow | Archive/backup |
| LZ4 | 1.5x | Fastest | Streaming |

## Lake Architecture Example

```
S3 Bucket
├── bronze/           -- Raw ingested data, no transformations
│   └── {source}/{table}/{date}/
├── silver/           -- Cleaned, validated data
│   └── {domain}/{table}/
└── gold/             -- Aggregated, business-ready
    └── {domain}/{mart}/
```

## Design Principles

1. **Storage-compute separation**: Scale independently. Object store for storage, ephemeral compute clusters.
2. **Open formats**: No vendor lock-in. Delta/Iceberg/Hudi as standard.
3. **Immutable data**: Append-only. Time travel for point-in-time queries.
4. **Schema evolution**: Add/drop columns without rewriting.
5. **Partition pruning**: Right-size partitions for query pattern.
6. **Data catalog**: Single source of truth for metadata.
7. **Least privilege**: IAM policies scoped to data domains.
