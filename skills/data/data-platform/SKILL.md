---
name: data-data-platform
description: >
  Use this skill when designing end-to-end data platforms: data lake architecture, data lakehouse architecture, distributed storage (S3, ADLS, GCS), distributed compute (Spark, Trino, Presto), data catalog (Datahub, Amundsen, Marquez), data mesh, data versioning (LakeFS, DVC), data virtualization (Dremio, Starburst).
  This skill enforces: platform architecture selection, storage/compute separation, catalog implementation, data mesh boundaries, version control for data.
  Do NOT use for: individual ETL pipelines (use etl-pipeline), streaming infrastructure (use streaming), BI tools (use bi-tools), data warehouse modeling (use data-warehouse).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, platform, architecture, phase-11]
---

# Data Platform Agent

## Purpose
Designs end-to-end data platform architectures: lake, lakehouse, mesh, with cataloging, versioning, and virtualization across the full data lifecycle.

## Agent Protocol

### Trigger
User request includes: data platform, data lake, data lakehouse, data mesh, distributed storage, distributed compute, data catalog, data versioning, data virtualization, data-as-a-product, data domain, data platform architecture.

### Protocol
1. Assess data volume, variety, velocity, and user personas.
2. Select platform architecture (lake, lakehouse, mesh, warehouse).
3. Design storage layer (object store format, partitioning, compression).
4. Choose compute engine (Spark, Trino, Presto, Dremio).
5. Implement data catalog (Datahub, Amundsen, OpenMetadata, Marquez).
6. Configure data versioning (LakeFS, DVC, Delta time travel).
7. Define data mesh boundaries if applicable.

## Output
Data platform architecture with storage/compute strategy, catalog setup, versioning, mesh/domain design.

### Response Format
```
## Data Platform Architecture
### Architecture Type
Paradigm: {data lake / lakehouse / data mesh / warehouse}
Storage-Compute Separation: {enabled/disabled}

### Storage Layer
Format: {Parquet / ORC / Delta / Iceberg / Hudi}
Partitioning: {column, granularity}
Compression: {ZSTD / Snappy / GZIP}
Object Store: {S3 / ADLS / GCS}

### Compute Engine
Batch: {Spark / Trino / Presto}
Interactive: {Trino / Dremio / Starburst}
Streaming: {Flink / Kafka Streams}

### Data Catalog
Platform: {Datahub / Amundsen / OpenMetadata / Marquez}
Ingestion Sources: [{source type}]
Lineage: {column-level / table-level}

### Data Versioning
Tool: {LakeFS / DVC / Delta time travel / Nessie}
Branching: {main / dev / feature branches}
Isolation: {full copy / zero-copy branching}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Architecture type selected based on use case and maturity.
- [ ] Storage layer format and partitioning documented.
- [ ] Compute engines assigned to workload types.
- [ ] Data catalog configured with ingestion and lineage.
- [ ] Versioning strategy selected with branching model.
- [ ] Data mesh domain boundaries defined (if applicable).
- [ ] Data virtualization layer designed (if needed).

## Workflow

### Step 1: Architecture Selection
- **Data Lake**: Raw object store (S3/ADLS/GCS) + open table formats (Delta/Iceberg/Hudi). Best for cost-effective storage with flexible compute.
- **Data Lakehouse**: Lake + warehouse features (ACID, schema enforcement, time travel). Delta Lake, Apache Iceberg, Apache Hudi.
- **Data Mesh**: Domain-oriented data products with federated governance. Each domain owns its data product.
- **Data Warehouse**: Schema-on-write, highly structured. Best for BI and reporting.

#### Object Store Comparison

| Feature | AWS S3 | ADLS Gen2 | GCS | MinIO |
|---|---|---|---|---|
| **Consistency** | Read-after-write | Strong | Strong | Strong |
| **Auth** | IAM roles, bucket policies | RBAC, SAS tokens | IAM, service accounts | JWT, OIDC, LDAP |
| **Encryption** | SSE-S3/KMS/CSE | SSE-AES/KMS/CMK | Google-managed/CMEK/CSE | KMS, auto-encryption |
| **Lifecycle** | Transition, expiry, versioning | Tiering, soft-delete | Nearline/Coldline/Archive | Bucket lifecycle |
| **Limit (per obj)** | 5 TB | 4.75 TB | 5 TB | 100 TB (config) |
| **S3 Compatible** | Native | Yes (via gateway) | Yes (XML API) | Native |
| **Cost (per TB/mo)** | ~$23 | ~$20 | ~$20 | Hardware + ops |

#### Architecture Decision

```yaml
architecture_decision:
  scenario: "ISO 27001-compliant analytics platform, 50 TB, hybrid cloud"
  choice:
    storage: S3
    table_format: Apache Iceberg
    reasons:
      - "S3: mature IAM policies for compliance, lifecycle transitions for cost"
      - "Iceberg: multi-engine support (Spark, Trino, Flink), partition evolution"
  alternatives_considered:
    - storage: MinIO
      rejected: "Operational overhead of self-managed, no compliance certs"
    - table_format: Delta Lake
      rejected: "Primary engine is Trino/Flink, Databricks dependency"
  decision_log: "ADR-2026-004 — S3 + Iceberg for compliant lakehouse"
```

### Step 2: Storage Layer
Use Parquet for columnar storage with ZSTD compression. Partition by date or categorical column. Use open table formats: Delta Lake for Databricks/Spark, Iceberg for Trino/Flink, Hudi for upsert-heavy.

### Step 3: Compute Engine
Spark for ETL and ML training. Trino/Presto for interactive SQL. Dremio/Starburst for data virtualization (query across sources without moving data). Flink for streaming.

#### Spark Deployment Config (Kubernetes)

```yaml
# spark-operator config
apiVersion: spark.apache.org/v1beta2
kind: SparkApplication
metadata:
  name: etl-fct-orders
  namespace: data-platform
spec:
  type: Scala
  mode: cluster
  image: ghcr.io/org/spark-iceberg:3.5.0
  mainClass: com.org.etl.OrdersProcessor
  sparkVersion: 3.5.0
  driver:
    cores: 4
    memory: 16g
    serviceAccount: spark-driver
  executor:
    instances: 12
    cores: 8
    memory: 32g
    instances: 12
  hadoopConf:
    fs.s3a.iam.role: arn:aws:iam::123456:role/SparkExecRole
  sparkConf:
    spark.sql.extensions: org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions
    spark.sql.catalog.prod: org.apache.iceberg.spark.SparkCatalog
    spark.sql.catalog.prod.type: hive
    spark.sql.catalog.prod.warehouse: s3a://data-lake/warehouse
    spark.sql.catalog.prod.io-impl: org.apache.iceberg.aws.s3.S3FileIO
```

#### Trino Deployment Config

```yaml
# trino-helm-values.yaml
server:
  workers: 4
  worker:
    resources:
      requests:
        cpu: 8
        memory: 32Gi
      limits:
        cpu: 12
        memory: 48Gi
  coordinator:
    resources:
      requests:
        cpu: 4
        memory: 16Gi
config:
  query:
    max-memory-per-node: 24GB
    max-total-memory-per-node: 40GB
    max-memory: 120GB
  catalogs:
    iceberg:
      - connector.name: iceberg
        iceberg.catalog.type: hive
        iceberg.file-format: PARQUET
        hive.metastore.uri: thrift://hive-metastore:9083
    postgresql:
      - connector.name: postgresql
        connection-url: jdbc:postgresql://prod-db:5432/analytics
        connection-user: trino
        connection-password: ${TRINO_PG_PASSWORD}
additionalCatalogs:
  delta-lake:
    connector.name: delta_lake
    delta.catalog-type: hive
    hive.metastore.uri: thrift://hive-metastore:9083
```

### Step 4: Data Catalog
Ingest metadata from all sources via crawlers or API. Enable column-level lineage. Support data discovery (search, tags, descriptions). Track ownership and certification status.

### Step 5: Data Versioning
Use LakeFS for Git-like operations on data lakes (branch, commit, merge, revert). Use DVC for ML data versioning. Use Delta/Iceberg time travel for point-in-time queries.

### Step 6: Data Mesh
Define domains: each owns its data products. Federated governance: global standards (catalog, security) + local autonomy (schema, transformations). Data-as-a-product: documented, discoverable, trustworthy.

### Step 7: Data Virtualization
Layer that queries across sources without moving data. Dremio, Starburst (Trino), Presto. Best for federated queries across lake, warehouse, and external sources.

## Rules
- Open table formats are mandatory for data lakes — no raw Parquet.
- Storage and compute must be decoupled for elasticity.
- Data catalog is the single source of truth for metadata.
- Every dataset must have an owner.
- Data versioning is required for any production- consumed dataset.
- Data mesh domains must publish contracts (schemas, SLAs).
- Data virtualization is a complement to, not a replacement for, the warehouse.

## References
- `references/cross-cloud-setup.md` — Multi-cloud data platform setup, cross-cloud replication, S3/ADLS/GCS integration, unified catalog, data residency
- `references/data-catalog-virtualization.md` — Datahub/Amundsen/OpenMetadata, LakeFS/DVC, data mesh, Dremio/Starburst
- `references/data-platform-architecture.md` — Lake, lakehouse, mesh, warehouse comparison, storage formats, compute engines
- `references/k8s-for-data.md` — Kubernetes for data platforms, Spark operator, Trino on K8s, storage classes, node pools, resource management
- `references/platform-architecture.md` — End-to-end data platform architecture, component interaction, network topology, security boundaries
- `references/platform-decision-tree.md` — Architecture selection decision tree, workload-based recommendations, trade-off analysis
- `references/platform-tools-comparison.md` — Comprehensive tool comparison for storage, compute, catalog, versioning, virtualization

## Handoff
For ETL pipeline implementation, hand off to `etl-pipeline`. For data warehouse modeling, hand off to `data-warehouse`. For streaming, hand off to `streaming`.
