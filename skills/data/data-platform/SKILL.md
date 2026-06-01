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
- [ ] Security model defined (RBAC, encryption, network isolation).

## Workflow

### Step 1: Architecture Selection

#### Architecture Type Decision Tree
```
What is the primary workload?
├── Raw data storage with flexible compute
│   └── Data lake (S3/ADLS/GCS + open table format)
├── ACID transactions on the lake, BI workloads
│   ├── Databricks shop → Delta Lake
│   ├── Multi-engine (Trino + Flink) → Apache Iceberg
│   └── Upsert-heavy CDC → Apache Hudi
├── Domain-owned data products with federated governance
│   └── Data mesh (domains + platform team)
├── Structured reporting, schema-on-write
│   └── Data warehouse (Snowflake, BigQuery, Redshift)
└── Query across multiple sources without moving data
    └── Data virtualization (Trino, Dremio, Starburst)
```

#### Architecture Characteristics

| Feature | Data Lake | Lakehouse | Data Mesh | Warehouse |
|---|---|---|---|---|
| Schema | Schema-on-read | Schema-on-read/write | Domain-defined | Schema-on-write |
| ACID | No (raw) | Yes (table format) | Per domain | Yes |
| Governance | Minimal | Centralized | Federated | Centralized |
| Compute | Separate | Separate | Per domain | Coupled (most) |
| Use case | Data science, ML | BI + ML + streaming | Large enterprises | BI, reporting |
| Maturity | Level 1-2 | Level 3-4 | Level 4-5 | Level 2-3 |

#### Object Store Comparison

| Feature | AWS S3 | ADLS Gen2 | GCS | MinIO |
|---|---|---|---|---|
| Consistency | Read-after-write | Strong | Strong | Strong |
| Auth | IAM roles, bucket policies | RBAC, SAS tokens | IAM, service accounts | JWT, OIDC, LDAP |
| Encryption | SSE-S3/KMS/CSE | SSE-AES/KMS/CMK | Google-managed/CMEK/CSE | KMS, auto-encryption |
| Lifecycle | Transition, expiry, versioning | Tiering, soft-delete | Nearline/Coldline/Archive | Bucket lifecycle |
| Limit (per obj) | 5 TB | 4.75 TB | 5 TB | 100 TB (config) |
| S3 Compatible | Native | Yes (via gateway) | Yes (XML API) | Native |
| Cost (per TB/mo) | ~$23 | ~$20 | ~$20 | Hardware + ops |

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

#### Open Table Format Comparison

| Feature | Delta Lake | Apache Iceberg | Apache Hudi |
|---|---|---|---|
| Primary sponsor | Databricks | Community (Netflix) | Apache (Uber) |
| ACID transactions | Yes (optimistic concurrency) | Yes (MVCC, optimistic) | Yes (MVCC) |
| Time travel | Yes (Delta log) | Yes (snapshot metadata) | Yes (timeline) |
| Schema evolution | Add/drop/rename/comment | Add/drop/rename/reorder | Add/drop/rename |
| Partition evolution | No (re-write needed) | Yes (hidden partitioning) | No |
| Multi-engine | Spark, some Trino | Spark, Trino, Flink, Hive | Spark, Flink, Hive |
| Compression | Parquet + ZSTD (default) | Parquet + ZSTD (default) | Parquet + ZSTD (default) |
| Upsert/Delete | Merge into | Row-level delete + merge | Merge into, bootstrap |

#### Partitioning Strategy
Partition by date or categorical column with moderate cardinality. Partition granularity: daily for high-volume tables, monthly for moderate volume, yearly for archival data. Avoid: high-cardinality columns (>1000 partitions), frequently changing columns as partition keys. Iceberg hidden partitioning: define partition transforms (day(created_at)), and partitioning is managed transparently.

```yaml
partitioning:
  fact_tables:
    strategy: "daily"  # Range partition by date
    column: "event_date"
    granularity: "day"
  dimension_tables:
    strategy: "single_partition"  # No partitioning
  intermediate_tables:
    strategy: "monthly"
    column: "batch_date"
```

#### File Format Configuration
```yaml
compression:
  codec: "ZSTD"
  level: 3  # Balance speed/ratio (1=fast, 22=best)
  parquet_config:
    row_group_size: 128MB
    page_size: 8KB
    dictionary_encoding: true
    dictionary_page_size: 2MB
  orc_config:
    stripe_size: 256MB
    index_stride: 10000
```

### Step 3: Compute Engine

#### Engine Selection Decision Tree
```
Primary workload?
├── Batch ETL, large-scale transformations
│   └── Apache Spark
│       ├── Databricks platform → Delta + Photon
│       ├── Kubernetes → Spark Operator
│       └── EMR → Spark + Hive Metastore
├── Interactive SQL, ad-hoc analytics
│   ├── Open-source → Trino
│   ├── Enterprise with caching → Starburst
│   └── BI-heavy with reflections → Dremio
├── Streaming, real-time processing
│   └── Apache Flink (or Kafka Streams for simpler)
└── ML training, feature engineering
    └── Spark for feature engineering, dedicated ML framework for training
```

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

#### Catalog Selection Decision Tree
```
Team size and primary need?
├── < 50 data users, need basic search + discovery
│   └── Amundsen (lightweight, easy setup)
├── 50-500 data users, need lineage + quality
│   ├── OpenMetadata (open-source, active community)
│   └── Datahub (LinkedIn lineage, broader metadata)
├── > 500 users, enterprise compliance
│   ├── Alation (commercial, best-in-class catalog)
│   ├── Atlan (collaboration-first, modern UI)
│   └── Collibra (governance-heavy, regulated)
└── Need data lineage + orchestration visibility
    ├── Marquez + OpenLineage (lightweight lineage)
    └── Datahub (full lineage + catalog)
```

#### Catalog Ingestion Configuration

```yaml
catalog:
  engine: datahub
  ingestion_sources:
    - type: snowflake
      source: snowflake-prod
      warehouse: ANALYTICS_WH
    - type: kafka
      source: kafka-cluster
      topic_patterns: ["*.v1", "*.v2"]
    - type: dbt
      source: dbt-project
      manifest_path: s3://dbt-artifacts/manifest.json
      catalog_path: s3://dbt-artifacts/catalog.json
    - type: tableau
      source: tableau-prod
      site: data-platform
  lineage:
    column_level: true
    parsing: sql_parser
    extraction: dbt_run_results
  automation:
    schedule: "0 */6 * * *"  # Every 6 hours
    incremental: true
```

#### Metadata Management
Business metadata: table descriptions, column descriptions, domain tags, ownership, certification status. Technical metadata: schema, data types, partitioning, file formats, row count. Operational metadata: freshness, last updated, data quality scores, pipeline status. Lineage: column-level provenance from source to dashboard.

### Step 5: Data Versioning

#### Versioning Tool Comparison

| Tool | Approach | Use Case | Branching | Storage Impact |
|---|---|---|---|---|
| LakeFS | Git-like operations on object store | Data lake, CI/CD for data | Zero-copy branches | Minimal (metadata only) |
| DVC | Git-based ML data versioning | ML experiments, model data | Via Git branches | Full copy per version |
| Delta Lake | Time travel via transaction log | ACID on lake | No branches | Log only |
| Apache Iceberg | Snapshot metadata | Multi-engine lakehouse | Branches + tags | Metadata only |
| Nessie | Git-like catalog versioning | Catalog-level isolation | Full git semantics | Metadata only |

#### LakeFS Branching Strategy

```yaml
lakefs:
  repository: data-lake-prod
  branching_model:
    main: "Production data — read-only for consumers"
    dev: "Feature development, ETL testing"
    staging: "Pre-production validation"
    feature/xxx: "Individual feature branches"
    release/x.y: "Release branches for rollback"
  hooks:
    pre_commit:
      - type: webhook
        url: http://data-quality:8080/validate
        timeout: 30s
    pre_merge:
      - type: airflow_dag
        dag_id: staging_validation_pipeline
  ci_cd:
    - "Feature branch → run ETL on 1% sample"
    - "Merge to staging → run full validation suite"
    - "Merge to main → deploy to production"
```

### Step 6: Data Mesh

#### Domain Definition Template

| Domain | Data Products | Owner | Consumers |
|---|---|---|---|
| Customer | Customer 360, profiles, segments, interactions | CMO | Sales, Marketing, Product, Finance |
| Product | Catalog, inventory, pricing, recommendations | CPO | Sales, Marketing, Supply Chain |
| Finance | P&L, budgets, forecasts, cost allocations | CFO | Exec, All domains |
| Supply Chain | Suppliers, purchase orders, shipments, inventory | COO | Finance, Sales |
| Sales | Opportunities, pipeline, quotas, commissions | VP Sales | Exec, Finance, Marketing |
| Marketing | Campaigns, attribution, leads, segments | CMO | Sales, Product |
| HR | Employee data, payroll, performance, hiring | CHRO | Exec, Finance |

#### Data-as-a-Product Contract Template

```yaml
data_product:
  domain: customer
  name: "customer_360"
  version: "2.1.0"
  owner: data-platform@company.com
  sla:
    freshness: "1 hour"
    availability: "99.9%"
    accuracy: "> 99%"
  schema:
    format: avro
    registry: schema-registry:8081
    compatibility: backward
  access:
    auth: "service-account or OAuth2"
    rls: true
    rate_limit: "10000 req/min per consumer"
  quality:
    rules:
      - "customer_id is unique"
      - "email is valid format"
      - "segment in (premium, standard, basic)"
    freshness_check: "last_updated within 1 hour"
  documentation:
    owner: customer-domain@company.com
    desc: "Unified customer view across CRM, support, and web"
```

### Step 7: Data Virtualization

Layer that queries across sources without moving data. Dremio, Starburst (Trino), Presto. Best for federated queries across lake, warehouse, and external sources. See the Data Virtualization skill for detailed implementation.

#### When to Virtualize vs Move Data

| Factor | Virtualize | Move/ETL |
|---|---|---|
| Source system load | Low (pushdown queries) | High (full extracts) |
| Data freshness | Real-time (query source) | Delayed (schedule-driven) |
| Query complexity | Limited (source capabilities) | Unlimited (transformed) |
| Performance | Variable (depends on source) | Predictable (optimized) |
| Use case | Exploration, infrequent queries | Production reporting, ML |

## Platform Security

### Network Security
Private networking for all inter-component communication. VPC/subnet isolation: data plane in private subnets, control plane in private with limited egress. S3 VPC Endpoints or Gateway Endpoints for accessing object stores without public internet. K8s network policies for pod-to-pod traffic. TLS termination at ingress.

### Authentication and Authorization
Service accounts for cross-component auth (Spark → S3, Trino → Hive Metastore). OAuth2/OIDC for user authentication to query engines and catalogs. RBAC: roles with least-privilege access to data assets. Row-level security: apply in query engine (Trino view security, Spark column masking). Audit all data access via catalog lineage.

### Data Encryption
Encryption at rest: SSE-S3/KMS for object stores, envelope encryption for sensitive columns. Encryption in transit: TLS 1.3 for all component communication. Key management: KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault). Bring Your Own Key (BYOK) for compliance.

## Platform Monitoring

### Infrastructure Monitoring
Object store: request rates, error rates (4xx/5xx), latency p99, data transfer. Compute: CPU/memory/disk utilization, query concurrency, queue depth, job duration. Networking: bandwidth, connection counts, TLS handshake failures.

### Data Pipeline Monitoring
Pipeline health: success rate, duration, rows processed. Data quality: row count anomalies, freshness lag, schema changes. Cost tracking: storage costs (per bucket), compute costs (per job/query), data transfer costs.

### Observability Stack
Metrics: Prometheus + Grafana dashboards. Logs: ELK/Loki + structured logging. Tracing: OpenTelemetry for pipeline traces. Alerts: Alertmanager with PagerDuty/Slack integration.

## Rules
- Open table formats are mandatory for data lakes — no raw Parquet.
- Storage and compute must be decoupled for elasticity.
- Data catalog is the single source of truth for metadata.
- Every dataset must have an owner.
- Data versioning is required for any production-consumed dataset.
- Data mesh domains must publish contracts (schemas, SLAs).
- Data virtualization is a complement to, not a replacement for, the warehouse.
- Security is shared responsibility: platform provides tools, domains enforce policies.
- Monitor cost by team/workload for chargeback/showback.
- Prefer managed services unless clear operational advantage to self-managed.
- Document all architecture decisions as ADRs.
- Automate platform provisioning with Infrastructure as Code.

## References
  - references/cross-cloud-setup.md — Cross-Cloud Data Platform Setup
  - references/data-catalog-virtualization.md — Data Catalog & Virtualization
  - references/data-platform-advanced.md — Data Platform Advanced Topics
  - references/data-platform-architecture.md — Data Platform Architecture
  - references/data-platform-fundamentals.md — Data Platform Fundamentals
  - references/k8s-for-data.md — Kubernetes for Data Workloads
  - references/platform-architecture.md — Data Platform Architecture
  - references/platform-decision-tree.md — Platform Decision Tree
  - references/platform-tools-comparison.md — Platform Tools Comparison
## Handoff
For ETL pipeline implementation, hand off to `etl-pipeline`. For data warehouse modeling, hand off to `data-warehouse`. For streaming, hand off to `streaming`.
