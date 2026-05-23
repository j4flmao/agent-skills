# Platform Decision Tree

## Architecture Selection Flow

```
Data volume > 1 TB?
├── Yes → Multi-engine support needed?
│   ├── Yes (Spark, Trino, Flink) → Iceberg or Delta Lake
│   ├── No, pure SQL → Trino + Hive or native warehouse
│   └── Mostly batch, some ML → Delta Lake (Databricks ecosystem)
├── No → Cloud-native managed?
│   ├── Yes → Snowflake, BigQuery, Redshift
│   └── No → Open-source: Trino + Iceberg on K8s
│
Compliance requirements (HIPAA/SOC2)?
├── Yes → S3 with Object Lock, KMS, CloudTrail audit
├── Partially → ADLS with Azure Policy, Purview
└── No → GCS with nearline/archive lifecycle

Existing team skills?
├── Python/SQL → Spark + Trino (universal)
├── Java/Scala → Spark (native API), Kafka Streams
├── SQL-only → Trino + views, dbt transformations
└── ML-heavy → Databricks, SageMaker integrated lakehouse
```

## Decision Matrix

| Scenario | Storage | Table Format | Compute | Catalog |
|---|---|---|---|---|
| Ad-hoc analytics | S3/GCS | Iceberg | Trino | DataHub |
| ML pipeline heavy | S3 | Delta Lake | Spark + MLflow | DataHub |
| Real-time lake | ADLS | Iceberg | Flink + Trino | OpenMetadata |
| Cost-sensitive | MinIO | Delta Lake | Spark K8s | Amundsen |
| Hybrid/multi-cloud | GCS | Iceberg | Trino + Dremio | DataHub |
| Regulated (finance) | S3 Object Lock | Iceberg | Spark (IAM roles) | OpenMetadata |

## Detailed Scenario Walkthroughs

### Scenario A: Startup (10 TB, lean team, AWS)

```yaml
context:
  - "Seed-stage SaaS company with 5 data engineers"
  - "10 TB event data growing 20% monthly"
  - "Team proficient in Python + SQL"
  - "No compliance requirements yet"
decision:
  storage: S3
  rationale: "Low cost, no upfront, mature SDK"
  table_format: Iceberg
  rationale: "Multi-engine flexibility, partition evolution"
  compute: "Trino (interactive) + Spark (batch ETL)"
  rationale: "Trino for ad-hoc SQL, Spark for Python transforms"
  catalog: DataHub
  rationale: "Easy setup via Docker, column lineage, community"
  deployment: "EMR for Spark, ECS for Trino"
  monthly_cost_estimate: "$2,500-4,000"
```

### Scenario B: Enterprise (500 TB, hybrid, regulated)

```yaml
context:
  - "Financial services company with 50+ data engineers"
  - "500 TB across on-prem + GCP"
  - "Strict SOX, GDPR, PCI compliance"
  - "Mix of SQL analysts, Python/Java engineers, ML team"
  - "Existing investment in GCP"
decision:
  storage: GCS
  rationale: "Dual-region for DR, object holds for compliance"
  table_format: Iceberg
  rationale: "GCS native + REST catalog for cross-region queries"
  compute:
    batch: Spark on Dataproc
    interactive: Trino on GKE
    streaming: Flink on Dataflow
  catalog: OpenMetadata
  rationale: "RBAC + SSO, data quality integration, audit logs"
  versioning: LakeFS
  rationale: "Git-like branching for compliance audits"
  cost_estimate_mo: "$25,000-40,000"
```

### Scenario C: Migrating from On-Prem Hive

```yaml
context:
  - "Existing 200 TB Hive + HDFS deployment on bare metal"
  - "Goal: migrate to cloud over 12 months"
  - "Must maintain read access during migration"
  - "50 Hive tables, 3,000+ daily ETL jobs"
phases:
  phase_1: "Lift-and-shift with S3 + Hive Metastore"
    tools: [EMR, Hive on S3, Hive Metastore in RDS]
    duration: "months 1-3"
  phase_2: "Convert top 20 tables to Iceberg"
    tools: [Spark migration, Iceberg, Trino for reads]
    duration: "months 4-8"
  phase_3: "Cut over remaining 30 tables, retire Hive"
    tools: [Trino native, Iceberg catalog, DataHub]
    duration: "months 9-12"
```

## Cost Comparison (Monthly, 100 TB)

| Scenario | Storage | Compute | Total | Notes |
|---|---|---|---|---|
| S3 + Spark EMR + DataHub | $2,300 | $8,000-15,000 | $10,300-17,300 | EMR spot instances |
| ADLS + Databricks + Unity | $2,000 | $12,000-20,000 | $14,000-22,000 | DBU costs dominate |
| GCS + Dataproc + OpenMetadata | $2,000 | $7,000-13,000 | $9,000-15,000 | Sustained-use discounts |
| MinIO + Spark K8s + Amundsen | $600 | $4,000-8,000 | $4,600-8,600 | Hardware + ops staff |

## Migration Decision Tree

```
Current state: On-premise HDFS?
├── Yes → Cloud migration planned?
│   ├── Yes within 6 months → S3/GCS + Iceberg (new catalog)
│   ├── Yes within 12-24 months → Hybrid (S3 as cold tier, HDFS active)
│   └── No → Modernize on-prem: MinIO + Spark K8s
├── No → Cloud-native (Snowflake/BigQuery)?
│   ├── Yes, happy → Stay, add catalog + observability
│   └── Yes, unhappy → Evaluate Iceberg on S3/GCS for portability
│
Current format: Delta Lake?
├── Yes → Stick with Delta, add Trino/Starburst for multi-engine
├── Yes, but want portability → Migrate to Iceberg (Delta→Iceberg bridge)
└── No, raw Parquet → Add Iceberg immediately (minimal migration)
```

## Decision Record Template

```yaml
decision_id: ADR-{year}-{seq}
title: "Data platform architecture for {project}"
status: accepted | proposed | superseded
date: {YYYY-MM-DD}
context: |
  {Business drivers, constraints, requirements}
decision:
  storage: S3 | ADLS | GCS | MinIO
  table_format: Iceberg | Delta Lake | Hudi
  compute_batch: Spark | Trino
  compute_interactive: Trino | Dremio | Starburst
  compute_streaming: Flink | Kafka Streams
  catalog: DataHub | OpenMetadata | Amundsen | Atlas
  versioning: LakeFS | DVC | Nessie
  deployment: K8s | EMR | Dataproc | self-hosted
consequences:
  positive:
    - "{Benefit 1}"
    - "{Benefit 2}"
  negative:
    - "{Trade-off 1}"
    - "{Trade-off 2}"
```
