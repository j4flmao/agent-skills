---
name: data-data-lakehouse
description: >
  Use this skill when designing lakehouse architectures with medallion layers (bronze/silver/gold), Databricks Unity Catalog, Delta Sharing, Apache Paimon, or multi-cloud lakehouse. This skill enforces: medallion architecture layers and data flow, Unity Catalog metastore and RBAC, Delta Sharing for data mesh, Apache Paimon table format, multi-cloud replication strategy, open format commitment. Do NOT use for: single-layer data lakes without tiering, streaming-only pipelines, or BI dashboard design.
version: "1.0.0"
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

```
                  Bronze                     Silver                      Gold
Source ---> +-------------+  clean,    +-------------+  agg,       +-------------+
DB          | bronze.     |  dedup,    | silver.     |  join,     | gold.       |
API  -----> | orders      |  validate  | orders      |  marts     | daily_sales |
Files ----> | raw_json    +----------->| validated   +----------->| customer360 |
Stream ---> | bronze_logs |            | enriched    |            | kpi_mart    |
            +-------------+            +-------------+            +-------------+
               Append-only              Upserts allowed            Read-optimized
               Schema-on-read           ACID enforced               Denormalized
               No constraints           Constraints                 Business names
               Original format          Parquet (optimized)         Aggregated

Data flows left to right. Quality gates at each boundary.
Bronze fails are quarantined (dead-letter). Silver fails are logged and alerted.
Gold fails block dashboard refresh.
```

### Step 2: Unity Catalog
Metastore: top-level container for metadata, maps to cloud storage location. Catalog: logical database grouping (e.g., prod, dev, analytics). Schema: namespace within catalog (e.g., bronze, silver, gold). Tables, views, functions, models. Securable objects: metastore -> catalog -> schema -> table/column.

```
Unity Catalog hierarchy:
  Metastore (us-east-1)
    ├── Catalog: production
    │   ├── Schema: bronze
    │   │   ├── Table: orders_raw
    │   │   └── Table: clickstream_raw
    │   ├── Schema: silver
    │   │   ├── Table: orders_cleaned
    │   │   ├── View: active_customers
    │   │   └── Foreign Table: external_ref
    │   └── Schema: gold
    │       ├── Table: daily_revenue
    │       └── Table: customer_360
    ├── Catalog: dev (same metastore)
    └── Catalog: analytics (external data sharing)

Permissions: SELECT, MODIFY, CREATE, READ_METADATA, MANAGE
Grant patterns:
  GRANT SELECT ON CATALOG production TO analysts;
  GRANT SELECT ON SCHEMA production.gold TO bi_group;
  GRANT SELECT ON TABLE production.gold.customer_360 (masked_ssn) TO support;
```

### Step 3: Delta Sharing
Open protocol for secure data sharing between Delta Lake tables. No data copy — recipient gets read-only access to pre-signed URLs. Recipient can be any Delta Sharing client (Databricks, Spark, pandas, Rust). Sharing server: creates share (logical group), adds schemas and tables, generates recipient tokens.

```yaml
# Delta Sharing server config (sharing.yaml)
shares:
  - name: "marketing_share"
    schemas:
      - name: "gold"
        tables:
          - name: "customer_360"
          - name: "campaign_performance"
          - name: "product_attribution"
  - name: "finance_share"
    schemas:
      - name: "gold"
        tables:
          - name: "daily_revenue"
          - name: "cost_breakdown"

recipients:
  - name: "partner_analytics"
    tokens:
      - "partner-token-xxx"
    shares: ["marketing_share"]
```

### Step 4: Apache Paimon
Unified streaming and batch lake format built for Flink. Uses LSM tree for high-throughput writes. Supports primary keys, partial updates, sequence groups. Best for streaming ingestion with Flink, Table API, SQL.

```
Paimon table types:
  - Append-only: for event logs, no primary key
  - Primary key: for CDC upserts
    - Merge engine: deduplicate, partial-update, aggregation

Paimon LSM tree:
  MemTable -> flush -> L0 files -> compaction -> L1+ sorted runs
  Write ahead log (WAL) for recovery
  Snapshots for time travel and rollback

Config:
  CREATE TABLE paimon_db.sales (
    order_id BIGINT,
    product_id INT,
    amount DECIMAL(10,2),
    dt STRING,
    PRIMARY KEY (order_id, dt) NOT ENFORCED
  ) WITH (
    'bucket' = '4',
    'bucket-key' = 'order_id',
    'changelog-producer' = 'input',
    'snapshot.time-retained' = '7d'
  );
```

### Step 5: Multi-Cloud Lakehouse
Objective: single pane of glass across AWS, Azure, GCP. Approaches: Delta as universal format, Unity Catalog as centralized metadata, object store replication (S3 -> ADLS -> GCS). Cross-cloud replication: Delta clone or copy-on-write across clouds. Latency: accept 5-30min replication lag for cross-cloud.

```
AWS (us-east-1)     Azure (europe-2)      GCP (asia-1)
+-----------+       +-----------+         +-----------+
| S3 + Delta | <--> | ADLS + Delta|  <--> | GCS + Delta|
| Unity Cat  |  r   | UC sec     |  r    | UC sec     |
| (primary)  |  e   | ondary     |  e    | ondary     |
+-----------+  p   +-----------+  p     +-----------+
   |           l                    l
   |           i                    i
   +---- c ---- a                    a
         r     t                    t
         o     i                    i
         s     o                    o
         s     n                    n
        -r                      -r
        eg                      eg
        ion                     ion

Strategy: primary cloud writes Delta, secondary clouds read replica.
Use Delta Sharing for cross-cloud queries (no data move).
Schedule Delta clone for local copy if latency-critical.
```

### Step 6: Data Quality Gates
Bronze: ensure files readable, schema matches expected format, no empty payloads. Silver: null rate <5% on key columns, referential integrity, dedup by business key. Gold: aggregate totals match across dimensions, historical trend consistent, no negative measures.

```python
# Quality gate implementation pattern
def bronze_quality_check(df):
    checks = [
        (df.count() > 0, "Empty batch"),
        (df.schema == expected_schema, "Schema mismatch"),
        (df.filter(col("_corrupt_record").isNotNull()).count() == 0, "Corrupt records")
    ]
    return all(check for condition, msg in checks)

def silver_quality_check(df):
    checks = [
        (df.filter(col("order_id").isNull()).count() == 0, "Null order_id"),
        (df.filter(col("amount") < 0).count() == 0, "Negative amounts"),
        (df.dropDuplicates(["order_id"]).count() == df.count(), "Duplicate order_id")
    ]
    return all(check for condition, msg in checks)
```

### Step 7: Performance Optimization
Vacuum: remove old files not in transaction log (7-day retention). Optimize: Z-order on high-cardinality filter columns. Partitioning: date columns for time-range queries. Auto-compaction: merge small files to target size (256MB-1GB). Liquid clustering (Delta): adaptive clustering without explicit partition management.

```sql
-- Table optimization commands
OPTIMIZE silver.orders ZORDER BY (customer_id, order_date);
VACUUM silver.orders RETAIN 168 HOURS;

-- Prediction on optimizing
ANALYZE TABLE silver.orders COMPUTE STATISTICS FOR ALL COLUMNS;

-- Enable liquid clustering (Delta)
ALTER TABLE silver.orders CLUSTER BY (customer_id, order_date);
```

### Step 8: XTable and Nessie in the Lakehouse
Apache XTable enables format interoperability — keep a single data copy while exposing it as Delta Lake (Databricks), Iceberg (Trino/Athena), or Hudi (streaming). XTable syncs metadata between formats, eliminating duplication for multi-engine lakehouses. Nessie adds Git-like version control to Iceberg tables for catalog-level branching, tagging, and time travel. In a lakehouse: dev/prod isolation (transform on a branch, merge to main), CI/CD for pipelines (test on branch, validate, merge), and reproducible ML training (tag exact catalog state). Deploy Nessie as the Iceberg REST catalog alongside Unity Catalog for a hybrid governance model.

### Step 9: Apache Paimon Deep Dive
Paimon is a unified streaming and batch lake format built for Flink using LSM-Tree architecture for high-throughput primary key upserts. LSM flow: MemTable → flush to L0 → compaction into sorted L1+ runs. Four merge engines: deduplicate (latest per key), partial-update (merge columns), aggregation (pre-aggregate metrics), first-row (earliest value). Changelog producers track row-level changes. Bucketing controls parallelism. Integrates with Flink SQL (Table API, Flink CDC), Spark (reads), and Trino. Use Paimon for streaming CDC ingestion into the lakehouse, real-time upserts on object storage, or replacing Kafka topic materialization with persistent, queryable tables.

```sql
CREATE TABLE paimon_db.sales (
  order_id BIGINT, product_id INT,
  amount DECIMAL(10,2), dt STRING,
  PRIMARY KEY (order_id, dt) NOT ENFORCED
) WITH (
  'bucket' = '4',
  'changelog-producer' = 'input',
  'snapshot.time-retained' = '7d',
  'merge-engine' = 'deduplicate'
);
```

## Rules
- Bronze is append-only, never modified in place
- Silver enforces schema, deduplicates, and validates
- Gold is read-optimized for BI and ML consumption
- Unity Catalog is the single source of truth for metadata
- Delta Sharing for external sharing — never share credentials or bucket paths
- Quality gates at each medallion layer boundary
- Vacuum with 7-day minimum retention for time travel
- Every gold table must have a documented owner and SLA

## References
- `references/medallion-architecture.md` — Bronze/silver/gold layers, data flow, quality gates, use cases
- `references/lakehouse-platform.md` — Databricks, Unity Catalog, Delta Sharing, Apache Paimon, multi-cloud
- `references/lakehouse-ecosystem-tools.md` — XTable format bridge, Nessie catalog versioning, Paimon LSM streaming, tool selection

## Handoff
`data-data-lake` for underlying table format operations (compaction, vacuum, Z-order)
`data-distributed-storage` for S3-compatible storage backend configuration
`data-data-quality` for validation rules and data contract enforcement
