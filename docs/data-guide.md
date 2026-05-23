# Data Skills Guide

34 skills covering the complete data lifecycle: ingestion, storage, compute, orchestration, governance, quality, security, cost optimization, lineage, testing, clean room, reverse ETL, formats, and feature stores.

## Skills Overview

### Data Platform Foundation
| Skill | Directory | Focus |
|-------|-----------|-------|
| ETL Pipeline | `skills/data/etl-pipeline/` | Extract, transform, load workflows with Airflow, dbt, custom pipelines |
| Data Warehouse | `skills/data/data-warehouse/` | Dimensional modeling, Snowflake, BigQuery, Redshift schema design |
| Streaming | `skills/data/streaming/` | Real-time data with Kafka, Flink, Kinesis, stream processing |
| Data Quality | `skills/data/data-quality/` | Great Expectations, data contracts, validation, monitoring |
| BI Tools | `skills/data/bi-tools/` | Dashboards, Metabase, Superset, Looker, reporting |
| Data Platform | `skills/data/data-platform/` | Lake/lakehouse/mesh architecture, cataloging, versioning, virtualization |

### AI & ML
| Skill | Directory | Focus |
|-------|-----------|-------|
| RAG Patterns | `skills/ai/rag-patterns/` | Chunking, embeddings, retrieval, re-ranking, context assembly |
| LangChain Patterns | `skills/ai/langchain-patterns/` | LCEL, retrievers, agents, memory, document pipelines |
| MCP Patterns | `skills/ai/mcp-patterns/` | MCP servers, transports, tools/resources, agent integration |
| AI Observability | `skills/ai/ai-observability/` | LLM tracing, token tracking, cost, latency, feedback |
| MLOps | `skills/devops/mlops/` | ML CI/CD, model registry, canary deploy, drift monitoring |

### DevOps & Infrastructure
| Skill | Directory | Focus |
|-------|-----------|-------|
| Docker Patterns | `skills/devops/docker-patterns/` | Multi-stage builds, layer caching, compose, non-root |
| DataOps | `skills/devops/dataops/` | Data CI/CD, dbt slim CI, data testing, contract validation |
| Kubernetes for Data | `skills/devops/kubernetes-for-data/` | Spark/Airflow/Kafka on K8s, GPU, node pools, storage |
| Cloud Cost Optimization | `skills/devops/cloud-cost-optimization/` | FinOps, tagging, compute/storage optimization, waste |

### Security
| Skill | Directory | Focus |
|-------|-----------|-------|
| Data Security | `skills/security/data-security/` | Encryption, key management, masking, column security, anonymization |

## Decision Flow

```
Need to move data?
  ├─ Batch, scheduled, transform-heavy        → ETL Pipeline
  ├─ Real-time, sub-second latency            → Streaming
  ├─ CDC from databases                       → Streaming + CDC Patterns
  └─ One-time migration                       → ETL Pipeline

Need to store data?
  ├─ Raw object storage, flexible schema      → Data Platform (Lake)
  ├─ Lake + ACID + BI                         → Data Platform (Lakehouse)
  ├─ Analytical queries, large volumes        → Data Warehouse
  ├─ Relational, operational OLTP             → Relational Database
  ├─ Document, key-value, wide-column         → NoSQL Database
  ├─ Graph relationships                      → Graph Database
  ├─ Full-text search                         → Search Engine
  └─ Federation across sources                → Data Virtualization

Need to compute?
  ├─ ETL, ML training                         → Distributed Compute (Spark)
  ├─ Interactive SQL                          → Distributed Compute (Trino/Presto)
  ├─ Streaming                                → Streaming (Flink)
  └─ GPU-accelerated                          → Kubernetes for Data (GPU)

Need to orchestrate?
  ├─ DAG-based, task dependencies             → Workflow Orchestration
  ├─ Container-native                         → Kubernetes for Data
  └─ Event-driven, real-time                  → Streaming

Need to govern data?
  ├─ Discovery, metadata                      → Data Catalog
  ├─ Lineage, impact analysis                 → Data Catalog
  ├─ Version control for data                 → Data Versioning
  ├─ Data-as-a-product, domains               → Data Mesh
  ├─ Schema enforcement, evolution            → Schema Registry
  └─ Virtualization, federated queries        → Data Virtualization

Need to trust data?
  ├─ Validation, quality checks               → Data Quality
  ├─ Contract enforcement                     → Data Contracts
  ├─ Monitoring, freshness, observability     → Data Observability
  ├─ Encryption, masking, anonymization       → Data Security
  ├─ Data classification, compliance          → Data Security
  └─ Cost tracking, optimization              → Cloud Cost Optimization

Need to deploy/manage data pipelines?
  ├─ CI/CD for models/data                    → DataOps + MLOps
  ├─ CI/CD for data pipelines                 → Data Pipeline CI/CD
  ├─ Containerize data apps                   → Docker Patterns
  ├─ Deploy on Kubernetes                     → Kubernetes for Data
  └─ LLM chain observability                  → AI Observability

Need to serve data?
  ├─ BI dashboards                            → BI Tools
  ├─ API endpoints                            → Data API
  ├─ Data products for domains                → Data Mesh
  ├─ Sync warehouse to SaaS tools             → Reverse ETL
  └─ Replica/sync across systems              → Data Replication

Need to understand data?
  ├─ Column-level lineage, impact analysis    → Data Lineage
  ├─ Metadata discovery                       → Data Catalog
  └─ Data observability, freshness            → Data Observability

Need to test or verify data?
  ├─ dbt tests, data comparison               → Data Testing
  ├─ Feature engineering for ML               → Feature Store
  └─ Data contract enforcement                → Data Contracts

Need advanced data collaboration?
  ├─ Privacy-preserving joins                 → Data Clean Room
  └─ Cross-org data sharing                   → Data Clean Room

Need to optimize data formats?
  ├─ Columnar formats (Parquet, Arrow)        → Data Formats
  └─ In-memory analytics                      → Data Formats (Arrow Flight)
```

## Complete Data Stack Reference

```
INGESTION ─────────────────────────────────────────────────────
  Batch ETL           → ETL Pipeline, DataOps
  Streaming/CDC       → Streaming, CDC Patterns
  Data Replication    → Data Replication

STORAGE ───────────────────────────────────────────────────────
  Object Store        → Data Platform (S3/ADLS/GCS)
  Open Table Formats  → Data Platform (Delta/Iceberg/Hudi)
  Data Lake           → Data Platform
  Data Lakehouse      → Data Platform
  Data Warehouse      → Data Warehouse
  Distributed Storage → Data Platform
  Relational Database → Relational Database
  NoSQL Database      → NoSQL Database
  Graph Database      → Graph Database
  Search Engine       → Search Engine

COMPUTE ───────────────────────────────────────────────────────
  Distributed Compute → Data Platform, Kubernetes for Data
  Batch Processing    → ETL Pipeline, Distributed Compute
  Streaming Compute   → Streaming
  Interactive SQL     → Data Virtualization, Distributed Compute
  ML Training         → MLOps, Kubernetes for Data (GPU)

ORCHESTRATION ────────────────────────────────────────────────
  Workflow Orchestration → Workflow Orchestration, ETL Pipeline
  K8s-native scheduling  → Kubernetes for Data (Volcano)
  Data Pipeline CI/CD    → DataOps, MLOps

GOVERNANCE ──────────────────────────────────────────────────
  Data Catalog        → Data Catalog
  Data Lineage        → Data Catalog
  Schema Registry     → Schema Registry
  Data Versioning     → Data Versioning
  Data Contracts      → Data Contracts
  Data Mesh           → Data Mesh
  Data Virtualization → Data Virtualization

QUALITY & OBSERVABILITY ───────────────────────────────────
  Data Quality        → Data Quality
  Data Contracts      → Data Contracts
  Data Observability  → Data Observability
  AI/LLM Observability → AI Observability
  Cloud Cost Tracking  → Cloud Cost Optimization

SECURITY ────────────────────────────────────────────────────
  Data Encryption     → Data Security
  Key Management      → Data Security
  Data Masking        → Data Security
  Anonymization       → Data Security
  Access Control      → Data Security

ACCESS ──────────────────────────────────────────────────────
  BI / Dashboards     → BI Tools
  Data API            → Data API
  Virtualization      → Data Virtualization
  Search              → Search Engine
```

## End-to-End Data Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│  SaaS APIs │ OLTP DBs │ Logs │ Files │ IoT │ Third-party Feeds  │
└──────────┬────────────────────┬──────────────┬──────────────────┘
           │                    │              │
           ▼                    ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                             │
│  Batch: Airflow / dbt / Spark / Fivetran                        │
│  Streaming: Kafka / Kinesis / Flink / Pulsar                    │
│  CDC: Debezium / Kafka Connect / Airbyte                        │
│  Orchestration: Airflow / Dagster / Prefect / K8s               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                               │
│  Object Store: S3 / ADLS / GCS                                  │
│  Lake Formats: Delta Lake / Apache Iceberg / Apache Hudi        │
│  Warehouse: Snowflake / BigQuery / Redshift / Databricks        │
│  Cache/Virtualization: Dremio / Starburst / AlloyDB             │
│  Search: Elasticsearch / Algolia / Meilisearch                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPUTE LAYER                               │
│  Batch: Spark / Trino / Presto / Dask / Ray                     │
│  Interactive: Trino / Dremio / Starburst / Athena               │
│  Streaming: Flink / Kafka Streams / Spark Streaming             │
│  ML: MLflow / Sagemaker / Kubeflow / Volcano + GPU              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE & CATALOG LAYER                    │
│  Catalog: Datahub / Amundsen / OpenMetadata / Marquez           │
│  Versioning: LakeFS / DVC / Delta Time Travel / Nessie          │
│  Schema: Schema Registry / dbt Contracts / Protobuf / Avro      │
│  Mesh: Domain Ownership / Data Products / Federated Governance  │
│  Virtualization: Dremio / Starburst / Trino Federation          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  QUALITY & OBSERVABILITY LAYER                   │
│  Quality: Great Expectations / dbt tests / Soda / Deequ         │
│  Contracts: Data Contracts / Schema Enforcement / SLAs          │
│  Observability: Monte Carlo / Sifflet / Datafold / Datadog      │
│  AI Observability: LangSmith / LangFuse / Arize / Helicone      │
│  Cost: Cloud Cost Optimization / FinOps / Budgets / Anomalies   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYER                              │
│  Encryption: AES-256 / KMS / HSM / Envelope / TLS 1.2+          │
│  Masking: Static / Dynamic / Tokenization / Format-preserving   │
│  Access Control: RLS / Column ACLs / IAM / ABAC                 │
│  Anonymization: k-anonymity / l-diversity / Differential Privacy│
│  Compliance: GDPR / CCPA / SOC 2 / HIPAA / PCI DSS              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ACCESS LAYER                                │
│  BI: Metabase / Superset / Looker / Power BI / Tableau          │
│  APIs: GraphQL / REST / gRPC / Data API                         │
│  Search: Elasticsearch / Algolia / Meilisearch / Typesense      │
│  Notebooks: Jupyter / Hex / Deepnote / Databricks Notebooks     │
│  Data Products: Domain-owned / Documented / SLA-backed          │
└─────────────────────────────────────────────────────────────────┘
```

## How They Compose

```
Sources → Ingestion (ETL/Streaming/CDC) → Storage (Lake/Warehouse)
→ Compute (Spark/Trino/Flink) → Governance (Catalog/Versions)
→ Quality & Observability → Security → Access (BI/API/Products)
```

The canonical end-to-end flow: each layer validates against contracts, encrypts per classification, and reports observability metrics.

## When to Use Each

**ETL Pipeline**: Data needs transformation, multiple sources, scheduled batch processing, backfill capability.

**Data Warehouse**: Analytical reporting, business intelligence, historical trends, SQL-based exploration.

**Streaming**: Real-time dashboards, event-driven pipelines, monitoring/alerting, low-latency requirements.

**Data Quality**: Trust is critical, data drives decisions, regulatory compliance, ML data pipelines.

**BI Tools**: Stakeholder dashboards, ad-hoc analysis, embedded analytics, self-service reporting.

**Data Platform**: Greenfield data architecture, lake/lakehouse/mesh design, multi-engine environments.

**DataOps**: CI/CD for data pipelines, dbt versioning, environment promotion, data contract enforcement.

**MLOps**: Model CI/CD, canary deployment, drift monitoring, feature pipeline automation.

**Kubernetes for Data**: Spark/Airflow/Kafka on K8s, GPU training, cost-effective elastic compute.

**Cloud Cost Optimization**: FinOps adoption, cloud spend reduction, waste elimination.

**Data Security**: Encryption, key management, masking, anonymization, GDPR/CCPA compliance.

**AI Observability**: LLM monitoring, token cost tracking, latency budgets, guardrail effectiveness.
