---
name: data-data-lakehouse
description: >
  Use this skill when designing lakehouse architectures with medallion layers (bronze/silver/gold), Databricks Unity Catalog, Delta Sharing, Apache Paimon, or multi-cloud lakehouse. This skill enforces: medallion architecture layers and data flow, Unity Catalog metastore and RBAC, Delta Sharing for data mesh, Apache Paimon table format, multi-cloud replication strategy, open format commitment. Do NOT use for: single-layer data lakes without tiering, streaming-only pipelines, or BI dashboard design.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, lakehouse, architecture, phase-11]
---

# Data Data Lakehouse

## Purpose
Design lakehouse architectures that merge data lake flexibility with warehouse reliability. Implement medallion architecture for data quality progression, Unity Catalog for governance, Delta Sharing for data collaboration, and multi-cloud deployment patterns.

## Agent Protocol

### Trigger
Exact user phrases: "lakehouse", "medallion architecture", "bronze", "silver", "gold", "Databricks", "Unity Catalog", "Delta Sharing", "Apache Paimon", "multi-cloud lakehouse", "open formats", "lakehouse governance", "data mesh lakehouse".

### Input Context
Before activating, verify:
- Cloud provider (AWS, Azure, GCP, multi-cloud)
- Lakehouse platform (Databricks, AWS EMR, Azure Synapse, GCP Dataproc)
- Table format (Delta, Iceberg, Paimon)
- Data sources volume and types
- Number of data producers and consumers
- Security requirements (RBAC, column mask, row filter)
- Data sharing requirements (internal teams, external partners)

### Output Artifact
Lakehouse architecture with medallion layers, Unity Catalog configuration, and platform deployment specs.

### Response Format
```
Lakehouse Platform: {Databricks | EMR + Iceberg | Synapse + Delta | Dataproc + Iceberg}
Catalog: {Unity Catalog | Hive Metastore | AWS Glue | Nessie}
Table Format: {Delta | Iceberg | Paimon}
Medallion Layers: Bronze (raw), Silver (cleaned), Gold (aggregated)
Sharing: {Delta Sharing | open | proprietary}
```
```yaml
# Unity Catalog metastore config
# Medallion pipeline YAML
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Medallion layers defined with data flow and transformations
- [ ] Unity Catalog or equivalent metastore configured
- [ ] RBAC and column-level security defined
- [ ] Delta Sharing setup for cross-team/partner data access
- [ ] Table format selected with interoperability plan
- [ ] Multi-cloud or cross-region replication strategy
- [ ] Data quality checks at each medallion layer
- [ ] Platform deployment topology (compute, storage, catalog)

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Medallion Architecture
Bronze: raw ingested data, schema-on-read, append-only, preserves original format. Silver: cleaned, deduplicated, validated, partitioned, CDC applied. Gold: aggregated, joined, business-level KPIs, consumption-ready for BI and ML.

Bronze fails are quarantined (dead-letter). Silver fails are logged and alerted. Gold fails block dashboard refresh.

Define retention per layer: Bronze 30-90 days raw, Silver 90-365 days cleaned, Gold 365+ days aggregated. Use different storage classes per layer (Bronze on standard, Gold on SSD-accelerated).

```sql
-- Bronze table (append-only)
CREATE TABLE bronze.events (
  event_id STRING, event_type STRING, payload STRUCT<...>,
  ingest_time TIMESTAMP, source_file STRING
) USING DELTA
TBLPROPERTIES ('delta.appendOnly' = 'true');

-- Silver table (deduplicated)
CREATE TABLE silver.events (
  event_id STRING, event_type STRING, ...,
  valid_from TIMESTAMP, valid_to TIMESTAMP, is_current BOOLEAN
) USING DELTA
TBLPROPERTIES ('delta.feature.timestampNtz' = 'true');
```

### Step 2: Unity Catalog
Metastore: top-level container for metadata, maps to cloud storage location. Catalog: logical database grouping (e.g., prod, dev, analytics). Schema: namespace within catalog (e.g., bronze, silver, gold). Tables, views, functions, models.

```sql
-- Unity Catalog DDL
CREATE CATALOG IF NOT EXISTS retail;
USE CATALOG retail;

CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- Grant permissions
GRANT USAGE ON CATALOG retail TO `domain-commerce`;
GRANT SELECT ON SCHEMA retail.silver TO `domain-analytics`;
GRANT MODIFY ON SCHEMA retail.bronze TO `data-engineers`;

-- Row filter
CREATE OR REPLACE FUNCTION retail.filter_pii()
  RETURN filter_condition AS "region = current_user_region()";

ALTER TABLE silver.customers SET ROW FILTER retail.filter_pii ON (region);
```

### Step 3: Delta Sharing
Open protocol for secure data sharing between Delta Lake tables. No data copy — recipient gets read-only access to pre-signed URLs.

```sql
-- Create a share
CREATE SHARE IF NOT EXISTS retail_share;
ALTER SHARE retail_share ADD TABLE retail.gold.daily_revenue;
ALTER SHARE retail_share ADD TABLE retail.gold.top_products;

-- Create recipient
CREATE RECIPIENT IF NOT EXISTS partner_analytics
  USING AUTHENTICATION TYPE DATABRICKS;
GRANT SELECT ON SHARE retail_share TO RECIPIENT partner_analytics;
```

Delta Sharing protocol is open and implemented by Databricks, OSS Delta Lake, Apache Spark, Pandas, and PowerBI. Recipients do not need Databricks — they only need the Delta Sharing client library.

### Step 4: Apache Paimon
Unified streaming and batch lake format built for Flink. Uses LSM tree for high-throughput writes. Supports primary keys, partial updates, sequence groups.

```sql
-- Paimon table with primary key
CREATE TABLE paimon.orders (
  order_id STRING, status STRING, total DOUBLE, ts TIMESTAMP(3)
) WITH (
  'bucket' = '4',
  'bucket-key' = 'order_id',
  'merge-engine' = 'deduplicate',
  'changelog-producer' = 'input',
  'snapshot.time-retained' = '72h'
);
```

Paimon bucket count should be a factor of the parallelism. Bucket = max(parallelism / 2, 1). For append-only tables, use no bucket key and higher bucket count for write parallelism.

### Step 5: Multi-Cloud Lakehouse
Single pane of glass across AWS, Azure, GCP. Delta as universal format, Unity Catalog as centralized metadata, object store replication (S3 -> ADLS -> GCS).

```yaml
multi_cloud_setup:
  primary_cloud: aws
  secondary_clouds: [azure, gcp]
  replication_mode: active_passive
  replication_tool: delta-sharing
  catalog: unity_catalog
  table_format: delta
  sync_frequency: hourly
  failover_rto: 30_minutes
  failover_rpo: 1_hour
```

Replication strategies: Delta Sharing for cross-cloud reads, cloud-native tools (S3 replication, AzCopy, gsutil) for storage-level sync, and Delta Live Tables for active-active replication. Prefer Delta Sharing for simplicity — it gives recipients direct read access without data movement.

### Step 6: Data Quality Gates
Bronze: ensure files readable, schema matches, no empty payloads. Silver: null rate <5% on key columns, referential integrity, dedup by business key. Gold: aggregate totals match across dimensions, historical trend consistent.

```python
# Quality gate at silver layer
from pyspark.sql import functions as F

silver_checks = {
    "null_rate": df.filter(F.col("order_id").isNull()).count() == 0,
    "dup_rate": df.count() == df.select("order_id").distinct().count(),
    "freshness": df.agg(F.max("created_at")).collect()[0][0] > cutoff,
    "volume": df.count() > expected_min_rows,
}
```

Quality gate failures: Bronze → dead-letter queue for replay. Silver → alert domain owner, block downstream. Gold → rollback to previous snapshot, page on-call.

### Step 7: Performance Optimization
Vacuum: remove old files not in transaction log (7-day retention). Optimize: Z-order on high-cardinality filter columns. Partitioning: date columns for time-range queries. Liquid clustering: adaptive clustering without explicit partition management.

```sql
OPTIMIZE silver.orders ZORDER BY (customer_id, order_date);
VACUUM silver.orders RETAIN 168 HOURS;
ALTER TABLE silver.orders CLUSTER BY (customer_id, order_date);

-- Auto-compaction (Delta)
ALTER TABLE silver.orders SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);
```

### Step 8: XTable and Nessie in the Lakehouse
Apache XTable enables format interoperability — keep a single data copy while exposing it as Delta, Iceberg, or Hudi. Nessie adds Git-like version control to Iceberg tables for catalog-level branching, tagging, and time travel.

XTable syncs metadata across formats without copying data. Use when you have multi-engine environments: Spark on Delta, Trino on Iceberg, Flink on Hudi. Nessie enables atomic multi-table commits and branch-based development workflows for data engineering teams.

### Step 9: Apache Paimon Deep Dive
LSM flow: MemTable -> flush to L0 -> compaction into sorted L1+ runs. Merge engines: deduplicate, partial-update, aggregation, first-row. Changelog producers track row-level changes.

Paimon's LSM compaction is configurable: num-sorted-run-stop-trigger (default 5), num-sorted-run-max-size (default 50), max-compacted-files (default 50). Tune for write-heavy vs read-heavy workloads. Write-heavy: increase stop-trigger, reduce max-compacted-files. Read-heavy: decrease stop-trigger, increase max-compacted-files.

### Step 10: Lakehouse Monitoring
Track bronze ingestion lag, silver dedup rate, gold freshness compliance, query latency per engine, storage cost per layer, and Unity Catalog access patterns.

```sql
-- Monitor table size and file count
DESCRIBE EXTENDED silver.orders;

-- Check Delta history
DESCRIBE HISTORY silver.orders LIMIT 10;

-- Vacuum and optimize stats (Databricks)
SELECT * FROM system.table_metrics
WHERE table_name = 'silver.orders';
```

### Step 11: Unity Catalog Lineage and Discovery
Unity Catalog automatically captures column-level lineage when using Databricks. Lineage is visible in Catalog Explorer and queryable via system tables. Enable lineage tracking on all production catalogs. Use system tables for access audit: `system.access.databricks_access` and `system.access.table_lineage`.

### Step 12: Lakehouse Federation
Federate queries across multiple lakehouse instances using Trino or Databricks Lakehouse Federation. Register external data sources (PostgreSQL, Snowflake, MySQL, SQL Server) as foreign catalogs in Unity Catalog. This enables queries that join lakehouse data with operational databases without data movement.

## Architecture / Decision Trees

### Table Format Selection

```
New lakehouse table
  ├── Databricks ecosystem? → Delta Lake
  ├── Multi-engine (Trino, Spark, Flink)? → Iceberg
  ├── Streaming + batch on Flink? → Apache Paimon
  ├── Existing Hive/Hadoop? → Hudi
  └── Need format interoperability? → XTable to expose as multiple formats
```

### Medallion Layer Decision

```
Raw data arrives
  ├── Append-only log, no transformation? → Bronze only
  ├── Needs dedup + validation? → Bronze → Silver
  ├── Needs aggregation + business logic? → Bronze → Silver → Gold
  └── Direct consumption from source? → Skip bronze, use Silver
```

### Cloud Provider Decision

```
Deploy lakehouse
  ├── Already on AWS
  │   ├── Need managed Spark? → AWS EMR + Iceberg
  │   └── Need simplicity? → Databricks on AWS
  ├── Already on Azure
  │   ├── Microsoft stack? → Azure Synapse + Delta
  │   └── Open-source? → Databricks on Azure
  ├── Already on GCP
  │   ├── Need managed? → Databricks on GCP
  │   └── Prefer native? → Dataproc + Iceberg
  └── Multi-cloud → Databricks + Delta + Unity Catalog
```

## Common Pitfalls

1. **Bronze table modifications**: bronze is append-only. Never update or delete rows in bronze.
2. **Too many small files**: streaming micro-batches create many small Parquet files. Enable auto-compaction.
3. **Unity Catalog metastore single region**: UC metastore is region-scoped. Plan cross-region catalog strategy.
4. **Delta Sharing permission over-sharing**: share tokens grant access to all tables in a share. Scope shares carefully.
5. **No vacuum policy**: transaction log never shrinks. Set VACUUM retention and schedule.
6. **Cross-cloud replication latency**: expect 5-30min lag. Design applications to tolerate eventual consistency.
7. **Paimon bucket misconfiguration**: too few buckets limit parallelism, too many cause small files. Test with production data volume.
8. **No liquid clustering on large tables**: static partitioning causes partition explosion. Use liquid clustering for adaptive performance.
9. **Unity Catalog permissions not audited**: stale grants accumulate security risk. Review quarterly.
10. **Bronze data not partitioned**: raw data accumulates as single large directory. Partition bronze by ingest_date.
11. **Auto-compaction disabled on streaming tables**: micro-batches create 10,000+ small files per day. Enable auto-optimize.
12. **Cross-cloud Delta Sharing without pre-signed URL TTL**: expired tokens cause consumer failures. Set TTL to 7 days, auto-refresh.
13. **Schema evolution on bronze**: changing bronze schema breaks downstream Silver ingestion. Freeze bronze schema; evolve Silver instead.
14. **Insufficient IAM permissions for Unity Catalog**: UC needs specific S3/ADLS/GCS permissions. Use credential vending, not direct access.

## Best Practices

- Keep bronze in original format with schema-on-read. Silver converts to optimized Parquet.
- Each medallion transition is a quality gate with alerting.
- Unity Catalog secures at catalog/schema/table/column level. Grant minimum permissions.
- Delta Sharing recipients get pre-signed URLs valid for 7 days, auto-refreshed.
- Vacuum with 7-day minimum to preserve time travel capability.
- Use liquid clustering over manual partitioning for adaptive performance.
- Run OPTIMIZE on tables after large data loads.
- Monitor file sizes: target 256MB-1GB per file for optimal read performance.
- Multi-cloud lakehouse requires consistent cloud permissions and network connectivity.
- Enable Unity Catalog system tables for monitoring and auditing.
- Use Delta Lake change data feed for streaming consumers instead of re-reading full tables.
- Set bronze retention to match SLA of longest-running pipeline that reads it.
- Use column mapping with Delta Lake to rename or drop columns without rewriting data.
- Deploy staging catalog for CI/CD validation before promoting to production catalog.
- Pin Spark/Databricks runtime versions to prevent compatibility breaks from auto-upgrades.
- Set cost budgets per catalog/schema in Unity Catalog for cost attribution.

## Compared With

| Feature | Databricks Lakehouse | AWS Lake Formation | Azure Synapse | GCP Dataproc + Iceberg |
|---|---|---|---|---|
| Table format | Delta Lake | Parquet + Glue | Delta | Iceberg |
| Catalog | Unity Catalog | AWS Glue | Purview | Hive Metastore / Dataproc |
| Sharing | Delta Sharing | LF-Tagged | Azure Data Share | BigQuery Analytics Hub |
| Multi-cloud | Yes | No | No | No |
| Streaming | Structured Streaming | Kinesis | Stream Analytics | Dataflow |
| ML integration | MLflow, Feature Store | SageMaker | Azure ML | Vertex AI |
| RBAC | Catalog-level | Lake Formation | AAD RBAC | IAM + Dataproc |
| Open format | Delta (OSS) | Parquet | Delta | Iceberg (OSS) |
| Self-hosted | No | No | No | Yes |

Lakehouse vs data warehouse: lakehouse uses open formats and object storage, warehouse uses proprietary storage engines. Lakehouse is更适合 for ML and data science; warehouse excels at BI and SQL analytics. Many organizations run both.

Lakehouse vs data lake: lakehouse adds ACID transactions, schema enforcement, and performance optimization (indexing, caching, clustering). A data lake is just storage — a lakehouse is storage + table format + catalog + compute.

## Performance

- Bronze ingestion: 10-50MB/s per Spark core for Parquet/JSON.
- Silver transformation: checkpoint every 1000 partitions, shuffle partitions = cores * 3.
- Gold aggregation: broadcast small dimension tables < 100MB.
- Vacuum: run during low-traffic windows. Large tables can take hours.
- Z-order: run on tables with > 1M rows and high-cardinality filter columns.
- Liquid clustering: automatic, no manual partition management. Adds metadata overhead.
- Auto-compaction: runtime overhead ~5%, reduces small file count by 10-100x.
- Delta cache: enable on frequently queried gold tables (Databricks only). Caches up to 60-70% of working set in local SSD.
- Photon engine: Databricks vectorized query engine. 2-5x faster on SQL workloads. Enable on gold tables.
- File skipping: Delta/iceberg partition pruning + min/max stats skip files without relevant data. Z-order improves file skipping by clustering similar values.

Scalability considerations: Bronze layer scales horizontally with object storage (no compute bottleneck). Silver and Gold are compute-bound — provision auto-scaling clusters. For petabyte-scale bronze, partition by source + date and use batch ingestion windows. For Unity Catalog, each metastore supports up to 10,000 tables. Use multiple metastores for larger deployments.

## Tooling

| Tool | Purpose |
|---|---|
| Databricks | Unified lakehouse platform |
| Apache Spark | Batch and streaming compute |
| Delta Lake | Table format with ACID |
| Apache Iceberg | Open table format, multi-engine |
| Apache Paimon | Streaming + batch lake format |
| Unity Catalog | Centralized governance |
| Delta Sharing | Inter-org data sharing |
| Apache XTable | Format interoperability |
| Nessie | Catalog-level version control |
| AWS Glue / Hive Metastore | External catalog |
| Apache Flink | Streaming engine for Paimon |
| Trino / Starburst | Federated SQL query engine |
| dbt | Data transformation, contract enforcement |
| Soda / Monte Carlo | Data observability and quality |
| Delta Live Tables (DLT) | Declarative ETL pipelines |

## Rules
- Bronze is append-only, never modified in place
- Silver enforces schema, deduplicates, and validates
- Gold is read-optimized for BI and ML consumption
- Unity Catalog is the single source of truth for metadata
- Delta Sharing for external sharing — never share credentials or bucket paths
- Quality gates at each medallion layer boundary
- Vacuum with 7-day minimum retention for time travel
- Every gold table must have a documented owner and SLA
- Enable auto-compaction on all streaming tables
- Use liquid clustering over manual partitioning for new tables
- Set bronze retention to match longest pipeline SLA
- Column-level permissions for PII data in silver and gold
- Audit Unity Catalog permissions quarterly
- Deploy across at least two availability zones for HA
- Monitor file sizes — target 256MB-1GB per file
- Enable change data feed for gold tables consumed by streaming
- Test disaster recovery quarterly with full restore playbook

## References
  - references/lakehouse-architecture.md — Lakehouse Architecture Reference
  - references/lakehouse-catalog-integration.md — Lakehouse Catalog Integration
  - references/lakehouse-ecosystem-tools.md — Lakehouse Ecosystem Tools
  - references/lakehouse-format-deep-dive.md — Lakehouse Format Deep Dive
  - references/lakehouse-monitoring.md — Lakehouse Monitoring
  - references/lakehouse-platform.md — Lakehouse Platform Reference
  - references/lakehouse-query-engines.md — Lakehouse Query Engines
  - references/medallion-architecture.md — Medallion Architecture Reference
  - references/lakehouse-architecture-patterns.md — Lakehouse Architecture Patterns
  - references/lakehouse-performance-optimization.md — Performance Optimization Reference
## Handoff
`data-data-lake` for underlying table format operations (compaction, vacuum, Z-order)
`data-distributed-storage` for S3-compatible storage backend configuration
`data-data-quality` for validation rules and data contract enforcement
