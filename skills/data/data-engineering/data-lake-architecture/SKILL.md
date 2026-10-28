---
name: data-lake-architecture
description: >
  Use this skill when the user says 'data lake architecture', 'lake vs warehouse', 'lakehouse or warehouse', 'object storage layout', 's3 data lake design', 'bronze silver gold', 'partitioning strategy', 'small files problem', 'open table format choice', 'separate storage and compute'. Designs the overall analytical storage architecture: lake vs warehouse vs lakehouse decision, zones/layers, object-storage layout, file formats and sizing, partitioning, catalog, governance and compute engines. Do NOT use for: operating a specific table format (time travel, compaction, MERGE) (data-data-lake), Databricks/Unity Catalog medallion specifics (data-data-lakehouse), warehouse schema design (data-dimensional-modeling), Kafka itself (data-kafka-event-streaming).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [data, data-lake, lakehouse, object-storage, iceberg, delta-lake, architecture]
---

# Data Lake Architecture

## Purpose
Decide where analytical data lives and how it is laid out so that it stays cheap, queryable by several engines, governed, and does not turn into a "data swamp". Modern designs keep data in open formats (Parquet + an open table format) on object storage, with a catalog and access control, and attach compute engines as needed.

## Agent Protocol

### Trigger
"data lake", "lake vs warehouse", "lakehouse", "s3/gcs/adls layout", "bronze/silver/gold", "medallion", "partitioning", "small files", "iceberg vs delta vs hudi", "storage-compute separation".

### Input Context
- Sources (OLTP/CDC, events, files, SaaS), volumes and growth, latency needs (batch, hourly, near real time).
- Consumers: BI, data science/ML, reverse ETL, external sharing.
- Cloud/vendor constraints, existing warehouse, governance/compliance (PII, residency, deletion requests).

### Output Artifact
Architecture decision + layer definitions + layout conventions + engine/catalog choice. No file unless requested.

### Response Format
```
Pattern: {warehouse|lake|lakehouse} because {reason}
Storage: {bucket layout} format={Parquet + Iceberg/Delta/Hudi}
Layers: bronze={...} silver={...} gold={...}
Catalog/governance: {catalog, access control, PII handling}
Engines: {Spark/Trino/Flink/warehouse}
```

### Completion Criteria
- [ ] Decision recorded with alternatives (ADR).
- [ ] Every table has an owner, layer, partition spec and retention.
- [ ] PII identified and access-controlled; deletion path exists (GDPR/CCPA).
- [ ] File sizing/compaction plan to avoid small files.

## Warehouse vs Lake vs Lakehouse
| | Warehouse | Data lake (files only) | Lakehouse (open table format) |
|--|-----------|------------------------|-------------------------------|
| Storage | Managed, proprietary | Object storage, raw files | Object storage, Parquet + table metadata |
| Schema | On write | On read | On write with schema evolution |
| Transactions / updates | Yes | No (rewrite files) | Yes: ACID commits, MERGE/UPDATE/DELETE, time travel |
| Engines | The warehouse | Many, inconsistent | Many engines on the same tables |
| Best for | BI-centric teams, SQL-only, low ops | Raw archive, ML on unstructured data | Mixed BI + ML + streaming at scale, avoiding lock-in |
Many organizations combine them: lakehouse for raw/curated layers, warehouse (which now often reads Iceberg/Delta directly) for serving.

## Table Formats
| Format | Strengths | Notes |
|--------|-----------|-------|
| Apache Iceberg | Engine-neutral (Spark, Trino, Flink, Snowflake, BigQuery, Athena...), hidden partitioning, partition evolution, REST catalog spec | Strong default for multi-engine setups |
| Delta Lake | Tight Spark/Databricks integration, mature tooling | UniForm can expose Iceberg metadata |
| Apache Hudi | Record-level upserts, incremental pulls, merge-on-read | Common for CDC-heavy ingestion |
All three store data as Parquet (or ORC/Avro) plus a metadata/transaction log; the catalog points to the current table state.

## Layers (Medallion)
| Layer | Content | Rules |
|-------|---------|-------|
| Bronze / raw | Source data as received (+ ingestion metadata) | Append-only, immutable, replayable; restricted access (raw PII) |
| Silver / cleaned | Typed, deduplicated, conformed, joined to reference data | Data quality checks gate promotion; PII masked or tokenized |
| Gold / curated | Business aggregates, dimensional models, feature tables | Owned data products with SLAs and documentation |

## Layout Conventions
```
s3://acme-lake-prod/
  bronze/<source_system>/<entity>/            # e.g. bronze/postgres_orders/orders/
  silver/<domain>/<entity>/
  gold/<domain>/<data_product>/
```
- Separate buckets or prefixes per environment and per sensitivity level; IAM by prefix/catalog grants.
- Partition by a low-to-medium cardinality column used in filters (event date); avoid partitioning by user id or other high-cardinality keys. Iceberg hidden partitioning (`days(event_ts)`) avoids exposing partition columns to users.
- Target data files of roughly 128 MB-1 GB; schedule compaction for streaming/CDC tables that produce many small files.
- Use Parquet with zstd or snappy compression; sort/cluster by common filter columns for min/max skipping.

## Example: Iceberg Table with Spark SQL
```sql
CREATE TABLE lake.silver.orders (
    order_id     BIGINT,
    customer_id  BIGINT,
    status       STRING,
    amount       DECIMAL(12, 2),
    updated_at   TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(updated_at))
TBLPROPERTIES ('write.target-file-size-bytes' = '536870912');

MERGE INTO lake.silver.orders t
USING staged_orders s
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

## Ingestion Patterns
- Databases: CDC (Debezium/Kafka Connect or managed CDC) → bronze append → MERGE into silver.
- Events: Kafka → Flink/Spark Structured Streaming → bronze/silver tables with checkpointing.
- Files/SaaS: managed connectors or batch loaders; keep original files in bronze for replay.

## Governance
- Catalog: Iceberg REST catalog implementations (e.g. Apache Polaris), AWS Glue, Unity Catalog, Hive Metastore (legacy). One catalog of record per table.
- Access control in the catalog/engine layer (table, column, row level), not by sharing bucket credentials.
- Lineage and documentation (OpenLineage, DataHub/OpenMetadata); data contracts at source boundaries.
- Deletion requests: table formats support row-level DELETE, but old snapshots still contain the data until snapshots are expired and files removed.

## Anti-Patterns
- Dumping files into a bucket with no catalog, owners or schemas (data swamp).
- Querying raw JSON/CSV directly for production dashboards.
- Over-partitioning (thousands of tiny partitions/files).
- Several catalogs writing the same table.
- Never expiring snapshots (storage cost, undeleted PII).

## References
- Related skills: `../../data-lake/SKILL.md` (table-format operations), `../../data-lakehouse/SKILL.md`, `../../data-formats/SKILL.md`, `../kafka-event-streaming/SKILL.md`.
- Apache Iceberg, Delta Lake and Apache Hudi documentation.
