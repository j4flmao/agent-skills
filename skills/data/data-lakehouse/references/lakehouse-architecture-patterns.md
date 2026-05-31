# Lakehouse Architecture Patterns

## Overview

The lakehouse merges data lake flexibility with warehouse reliability, enabling ACID transactions, schema enforcement, and efficient BI queries on open data formats stored in object storage. This reference covers architectural patterns, medallion design, catalog integration, and deployment strategies across cloud providers.

## Core Lakehouse Architecture

### Architecture Components

A lakehouse consists of three core layers:

```
┌──────────────────────────────────────────────────────────┐
│                    Consumption Layer                       │
│  BI Tools (Tableau, PowerBI) │ ML (Databricks, SageMaker) │
├──────────────────────────────────────────────────────────┤
│                     Query Engine Layer                     │
│  Spark │ Trino │ Presto │ Dremio │ Athena │ Redshift Spec │
├──────────────────────────────────────────────────────────┤
│                  Table Format Layer                        │
│              Delta Lake │ Iceberg │ Hudi │ Paimon          │
├──────────────────────────────────────────────────────────┤
│                   Storage Layer                            │
│            S3 │ ADLS │ GCS │ MinIO │ EBS                  │
└──────────────────────────────────────────────────────────┘
```

Each layer is independently scalable and pluggable. The key innovation of the lakehouse is the table format layer: open file formats (Parquet) wrapped with transactional metadata.

### Key Capabilities

| Capability | Data Lake | Data Warehouse | Lakehouse |
|---|---|---|---|
| ACID Transactions | No | Yes | Yes |
| Schema enforcement | No | Yes | Yes |
| BI tool support | Limited | Native | Native |
| ML/AI support | Native | Limited | Native |
| Open formats | Yes | No | Yes |
| Streaming/batch | Separate | Separate | Unified |
| Cost (storage) | Low | High | Low |
| Cost (compute) | Low | High | Variable |
| Data versioning | Limited | No | Yes |
| Concurrency | Poor | Good | Good |

## Medallion Architecture

The medallion architecture organizes data into progressively refined layers: Bronze (raw), Silver (cleaned), Gold (aggregated).

### Bronze Layer

Properties:
- Append-only (no updates, no deletes)
- Schema-on-read (preserve original structure)
- Preserves raw data in its original format
- Partitioned by ingest date
- Retains data for 30-90 days (configurable)
- Dead-letter queue for failed records

```sql
CREATE TABLE bronze.events (
    event_id STRING,
    event_type STRING,
    payload STRING,
    source_file STRING,
    ingest_time TIMESTAMP,
    raw_data STRING
)
USING DELTA
PARTITIONED BY (ingest_date STRING)
TBLPROPERTIES (
    'delta.appendOnly' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.logRetentionDuration' = 'interval 30 days'
);
```

### Silver Layer

Properties:
- Cleaned, deduplicated, validated
- CDC applied (inserts, updates, deletes)
- Schema enforced (no schema-on-read)
- Partitioned by business date
- Data quality checks enforced
- Retains data for 90-365 days

```sql
CREATE TABLE silver.events (
    event_id STRING NOT NULL,
    event_type STRING NOT NULL,
    user_id STRING,
    event_timestamp TIMESTAMP,
    processed_time TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP
)
USING DELTA
PARTITIONED BY (event_date STRING)
TBLPROPERTIES (
    'delta.feature.allowColumnDefaults' = 'true',
    'delta.minReaderVersion' = '2',
    'delta.minWriterVersion' = '5'
);

-- Add quality constraints
ALTER TABLE silver.events ADD CONSTRAINT valid_event CHECK (event_id IS NOT NULL);
```

### Gold Layer

Properties:
- Aggregated, joined, business-level KPIs
- Read-optimized for BI and ML
- Denormalized for query performance
- Column-level security for PII
- SLA-backed with owner and freshness guarantees
- Retains data for 365+ days

```sql
CREATE TABLE gold.daily_revenue (
    date DATE NOT NULL,
    revenue DECIMAL(18,2),
    orders_count BIGINT,
    avg_order_value DECIMAL(18,2),
    customer_count BIGINT,
    mrr DECIMAL(18,2)
)
USING DELTA
PARTITIONED BY (date);
```

### Medallion Data Flow

```
Raw Sources (Kafka, S3, API)
  ↓
Bronze (raw, append-only, schema-on-read)
  │  └── Dead-letter queue for failures
  ↓
Silver (cleaned, deduplicated, validated, CDC)
  │  └── Quality gate: null rate, uniqueness, referential integrity
  ↓
Gold (aggregated, joined, business KPIs)
  │  └── Quality gate: cross-dimension reconciliation
  ↓
Consumption (BI dashboards, ML features, data sharing)
```

### Data Quality Gates

Bronze gate:
- Files readable (valid Parquet/JSON)
- Schema matches expected structure
- No empty payloads
- Minimum record count per batch

Silver gate:
- Null rate < 5% on key columns
- Referential integrity (foreign key checks)
- Deduplicated by business key
- Data type compliance

Gold gate:
- Aggregate totals match across dimensions
- Historical trend consistency
- SLA freshness met
- Row count within expected range

## Unity Catalog Integration

### Metastore Hierarchy

```
Metastore (region-scoped, maps to cloud storage)
  └── Catalog (e.g., prod, dev, analytics)
       └── Schema (e.g., bronze, silver, gold, shared)
            └── Tables, Views, Functions, Models
```

### Unity Catalog Security Model

```sql
-- Grant permissions at any level
GRANT USAGE ON CATALOG retail TO `domain-commerce`;
GRANT SELECT ON SCHEMA retail.silver TO `analytics-engineers`;
GRANT MODIFY ON SCHEMA retail.bronze TO `data-engineering`;

-- Column-level security
ALTER TABLE retail.silver.customers
ALTER COLUMN email MASK email_mask();

-- Row-level security
CREATE FUNCTION retail.region_filter()
RETURN filter_condition AS "region = current_user_region()";

ALTER TABLE retail.silver.orders
SET ROW FILTER retail.region_filter ON (region);
```

### Unity Catalog Lineage

Unity Catalog automatically captures column-level lineage for all operations through Databricks. Lineage is queryable:

```sql
-- Query lineage from system tables
SELECT * FROM system.lineage.tables
WHERE table_name = 'gold.daily_revenue';

-- Or via Catalog API
-- GET /api/2.1/unity-catalog/lineage/table/
--   urn:table:retail.gold.daily_revenue?direction=UPSTREAM
```

## Table Format Selection

### Delta Lake

Best for: Databricks ecosystem, SQL-heavy workloads, streaming + batch

Strengths:
- Mature and feature-rich (CDF, liquid clustering, deletion vectors)
- Strong Databricks integration (Photon, DLT)
- Open source with large community
- ANSI SQL interface

Weaknesses:
- Multi-engine support lags Iceberg (Trino, Flink support exists but less mature)
- Protocol versioning can cause compatibility issues

### Apache Iceberg

Best for: Multi-engine environments, open-source ecosystems, Trino-heavy

Strengths:
- Native Trino, Spark, Flink, Hive support
- Catalog-agnostic (Hive, Glue, Nessie, JDBC, REST)
- Nessie integration for Git-like versioning
- Partition evolution (no rewrite needed)

Weaknesses:
- No change data feed (CDF) equivalent
- Vacuum/compaction requires more manual management
- Slightly less mature than Delta for streaming

### Apache Hudi

Best for: Large-scale streaming ingestion, heavy UPSERT workloads

Strengths:
- Best UPSERT performance (Merge-on-Read mode)
- Built-in incremental query support
- MOR vs COW table type flexibility
- Record-level indexing for fast updates

Weaknesses:
- Smaller community than Delta/Iceberg
- More complex configuration
- Less SQL standard compliance

### Apache Paimon

Best for: Flink-centric architectures, streaming lakehouse

Strengths:
- Native Flink integration (source, sink, catalog)
- LSM-tree for high-throughput writes
- Primary key support with merge engines
- Changelog generation

Weaknesses:
- Newest format, smallest community
- Primarily Flink-focused
- Less BI tool integration

### Selection Decision Matrix

```
Workload profile:
  ├── Databricks + SQL + Streaming → Delta Lake
  ├── Multi-engine (Spark, Trino, Flink) → Iceberg
  ├── Heavy UPSERT + Streaming → Hudi
  ├── Flink-native → Paimon
  └── Need format interoperability → XTable (expose as multiple formats)

Format migration:
  - No easy path to convert between formats
  - Use XTable for multi-format access without migration
  - Plan format choice carefully — migration is expensive
```

## Multi-Cloud Lakehouse

### Architecture Patterns

#### Active-Passive

Primary cloud handles writes; secondary cloud is read-only replica. Best for DR.

```yaml
primary: aws (us-east-1)
secondary: azure (eastus2)
replication: delta-sharing
failover: manual
rto: 30 minutes
rpo: 1 hour
```

#### Active-Active (Primary/Standby)

Both clouds can serve reads; primary handles writes with standbys ready.

```yaml
primary: aws
standby: gcp
sync: object storage replication (S3 → GCS)
write_path: aws only
read_path: both clouds
consistency: eventual (5-30 min lag)
```

#### Multi-Region Active

Reads and writes in multiple regions with conflict resolution. Complex but supports global presence.

```yaml
regions:
  - aws: us-east-1, eu-west-1, ap-southeast-1
  - azure: eastus2, westeurope, southeastasia
replication: delta sharing + storage sync
consistency: eventual
conflict: last-write-wins
```

### Cloud-Specific Configurations

AWS Lakehouse:
```yaml
storage: S3 (with lifecycle policies)
catalog: AWS Glue / Unity Catalog
compute: EMR / Databricks / Athena / Redshift Spectrum
networking: S3 VPC endpoints, PrivateLink
security: IAM roles, S3 bucket policies, KMS encryption
```

Azure Lakehouse:
```yaml
storage: ADLS Gen2 (hierarchical namespace)
catalog: Purview / Unity Catalog
compute: Azure Databricks / Synapse / Azure Data Explorer
networking: Private Link, VNET integration
security: AAD RBAC, managed identities
```

GCP Lakehouse:
```yaml
storage: GCS (object versioning)
catalog: Dataproc Metastore / Unity Catalog
compute: Dataproc / Databricks / BigQuery Omni
networking: VPC-SC, Private Service Connect
security: IAM, CMEK encryption
```

## Data Sharing Patterns

### Delta Sharing

```sql
-- Producer side
CREATE SHARE quarterly_report;
ALTER SHARE quarterly_report ADD TABLE gold.daily_revenue;
ALTER SHARE quarterly_report ADD TABLE gold.top_products;
GRANT SELECT ON SHARE quarterly_report TO RECIPIENT partner_analytics;

-- Recipient side (read-only access)
SELECT * FROM delta.`s3://presigned-url/quarterly_report.delta`;
```

Delta Sharing is open: recipients use Delta Lake reader library without needing Databricks. Supported in Python (delta-sharing), Spark, Pandas, PowerBI, and Tableau.

### Iceberg REST Catalog Sharing

```python
# Recipient configures REST catalog
spark.conf.set("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
spark.conf.set("spark.sql.catalog.iceberg.type", "rest")
spark.conf.set("spark.sql.catalog.iceberg.uri", "https://partner.iceberg:443/api/catalog")
spark.conf.set("spark.sql.catalog.iceberg.credential", "<token>")
```

## Deployment Patterns

### Databricks Deployments

```yaml
# Databricks workspace structure
workspace:
  name: retail-lakehouse
  regions: [us-east-1, eu-west-1]
  metastore: retail-metastore (global)
  catalogs:
    - name: prod
      storage: s3://retail-prod/
    - name: dev
      storage: s3://retail-dev/
    - name: analytics
      storage: s3://retail-analytics/
  clusters:
    - name: etl-cluster
      type: job
      runtime: 15.4 LTS
      autoscale: {min: 2, max: 10}
      node_type: i3.xlarge
    - name: analyst-cluster
      type: all-purpose
      runtime: 15.4 LTS
      autoscale: {min: 1, max: 5}
      node_type: i3.xlarge
```

### Open Source Deployments

```yaml
# Trino + Iceberg + Hive Metastore
services:
  trino:
    image: trinodb/trino:latest
    config:
      connector: iceberg
      iceberg.catalog.type: hive
      hive.metastore.uri: thrift://metastore:9083
  metastore:
    image: apache/hive:latest
    backend: postgres
  minio:
    image: minio/minio:latest
    buckets: [raw, processed, analytics]
```

## Lakehouse Pipeline Patterns

### Batch ELT Pattern

```yaml
sources:
  - type: JDBC (PostgreSQL)
    frequency: hourly
    destination: bronze.raw_sync
  - type: S3 (files)
    frequency: daily
    destination: bronze.file_ingest

transforms:
  - from: bronze.raw_sync
    to: silver.cleaned_sync
    logic: dedup + validate + apply CDC
    schedule: hourly, 1 hour after source
  - from: silver.cleaned_sync
    to: gold.aggregated
    logic: join + aggregate + calculate KPIs
    schedule: daily at 3 AM
```

### Streaming + Batch Pattern

```python
# Stream to bronze
bronze_stream = spark.readStream \
    .format("kafka") \
    .option("subscribe", "events") \
    .load() \
    .writeStream \
    .format("delta") \
    .option("checkpointLocation", "/checkpoints/bronze_events") \
    .table("bronze.events")

# Micro-batch: silver update
spark.readStream \
    .format("delta") \
    .option("readChangeFeed", "true") \
    .table("bronze.events") \
    .writeStream \
    .foreachBatch(upsert_to_silver) \
    .option("checkpointLocation", "/checkpoints/silver_events") \
    .start()

# Batch: gold aggregation
@dlt.table
def gold_daily_revenue():
    return spark.sql("""
        SELECT event_date,
               SUM(revenue) as daily_revenue,
               COUNT(DISTINCT user_id) as active_users
        FROM silver.events
        GROUP BY event_date
    """)
```

### CDC Ingestion Pattern

```sql
-- Bronze: capture raw CDC
CREATE TABLE bronze.cdc_orders (
    cdc_operation STRING,   -- I, U, D
    order_id STRING,
    customer_id STRING,
    total DECIMAL(18,2),
    cdc_timestamp TIMESTAMP
) USING DELTA;

-- Silver: apply CDC
MERGE INTO silver.orders AS target
USING (
    SELECT order_id, customer_id, total
    FROM bronze.cdc_orders
    WHERE cdc_operation IN ('I', 'U')
) AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

DELETE FROM silver.orders
WHERE order_id IN (
    SELECT order_id FROM bronze.cdc_orders WHERE cdc_operation = 'D'
);
```

## Monitoring and Observability

### Key Metrics

| Layer | Metric | Alert Threshold | Action |
|---|---|---|---|
| Bronze | Ingestion lag | > 15 min | Page ingestion team |
| Bronze | Zero records per batch | Any | Check source system |
| Silver | Null rate on key columns | > 5% | Alert domain owner |
| Silver | Dedup rate | < 99% | Check CDC logic |
| Gold | Freshness SLA | > SLA max | Page gold owner |
| Gold | Row count deviation | > 20% from avg | Investigate pipeline |
| Cross-layer | Storage cost per GB | > budget | Review partitions |
| Cross-layer | File count | > 1M per table | Schedule OPTIMIZE |

## References
- Armbrust et al. "Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics" (CIDR 2021)
- Databricks Lakehouse Documentation: https://docs.databricks.com/lakehouse/
- Delta Lake Documentation: https://docs.delta.io/
- Apache Iceberg Documentation: https://iceberg.apache.org/
- Apache Hudi Documentation: https://hudi.apache.org/
- Apache Paimon Documentation: https://paimon.apache.org/
- Unity Catalog Documentation: https://docs.databricks.com/data-governance/unity-catalog/
- Delta Sharing Documentation: https://delta.io/sharing/
