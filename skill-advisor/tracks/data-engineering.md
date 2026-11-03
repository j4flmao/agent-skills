# Data Engineer

**Who this is for:** You build pipelines, warehouses, lakes and streaming systems.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-etl-pipeline`](../../skills/data/etl-pipeline/SKILL.md) | `data/etl-pipeline` | Design reliable ETL/ELT pipelines with Airflow orchestration, dbt transformations, incremental strategies, error handling, and data validation. |
| [`data-data-warehouse`](../../skills/data/data-warehouse/SKILL.md) | `data/data-warehouse` | Design data warehouse schemas with dimensional modeling, platform-specific optimization, materialized views, and cost controls. |
| [`data-dimensional-modeling`](../../skills/data/dimensional-modeling/SKILL.md) | `data/dimensional-modeling` | Design robust dimensional data models for analytical workloads following Kimball methodology, star schema best practices, slowly changing… |
| [`data-data-quality`](../../skills/data/data-quality/SKILL.md) | `data/data-quality` | Build a data quality framework covering quality dimensions (completeness, accuracy, timeliness, consistency, uniqueness, integrity), automated… |
| [`data-relational-database`](../../skills/data/relational-database/SKILL.md) | `data/relational-database` | Design relational database schemas with proper indexing, partitioning, replication, connection pooling, and query optimization strategies. |
| [`data-streaming`](../../skills/data/streaming/SKILL.md) | `data/streaming` | Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees. |

## Level 2 — Professional (11 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-data-lakehouse`](../../skills/data/data-lakehouse/SKILL.md) | `data/data-lakehouse` | Design lakehouse architectures that merge data lake flexibility with warehouse reliability. |
| [`data-data-lake`](../../skills/data/data-lake/SKILL.md) | `data/data-lake` | Design and operate ACID-compliant data lakes on object storage using Delta Lake, Apache Iceberg, or Apache Hudi. |
| [`data-batch-processing`](../../skills/data/batch-processing/SKILL.md) | `data/batch-processing` | Design efficient batch processing architectures using Hive, Spark SQL, and optimized file formats. |
| [`data-distributed-compute`](../../skills/data/distributed-compute/SKILL.md) | `data/distributed-compute` | Design and tune distributed compute systems for large-scale data processing. |
| [`data-formats`](../../skills/data/data-formats/SKILL.md) | `data/data-formats` | Design efficient data storage and transfer using Apache Arrow, Parquet, Avro, and ORC formats with appropriate compression, schema evolution… |
| [`data-schema-registry`](../../skills/data/schema-registry/SKILL.md) | `data/schema-registry` | Design and deploy a schema registry with Avro/Protobuf/JSON Schema, compatibility enforcement, SerDe patterns, CI/CD integration, and governance… |
| [`data-data-contracts`](../../skills/data/data-contracts/SKILL.md) | `data/data-contracts` | Design and enforce data contracts between producers and consumers covering schema, semantics, SLA, ownership, versioning, and compatibility — with… |
| [`data-data-observability`](../../skills/data/data-observability/SKILL.md) | `data/data-observability` | Design comprehensive data observability across pipelines: freshness, volume, schema, quality, lineage, and incident management. |
| [`data-lineage`](../../skills/data/data-lineage/SKILL.md) | `data/data-lineage` | Capture, store, query, and visualize end-to-end data lineage from source systems through transformations to dashboards, supporting impact… |
| [`data-testing`](../../skills/data/data-testing/SKILL.md) | `data/data-testing` | Implement automated data testing across the data platform: unit tests for dbt models, regression detection between environments, data quality… |
| [`data-pipeline-cicd`](../../skills/data/data-pipeline-cicd/SKILL.md) | `data/data-pipeline-cicd` | Establish continuous integration and delivery for data pipelines covering SQL code quality, dbt model testing, schema change management, and… |

## Level 3 — Specialist (12 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-data-mesh`](../../skills/data/data-mesh/SKILL.md) | `data/data-mesh` | Design data mesh architecture with domain-owned data products, self-serve platform capabilities, and federated governance — enabling decentralized… |
| [`data-data-platform`](../../skills/data/data-platform/SKILL.md) | `data/data-platform` | Designs end-to-end data platform architectures: lake, lakehouse, mesh, with cataloging, versioning, and virtualization across the full data lifecycle. |
| [`data-data-catalog`](../../skills/data/data-catalog/SKILL.md) | `data/data-catalog` | Design and deploy a data catalog platform with metadata ingestion, column-level lineage, business glossary, data discovery, ownership model, and… |
| [`data-data-strategy`](../../skills/data/data-strategy/SKILL.md) | `data/data-strategy` | Define and execute a comprehensive data strategy covering maturity assessment, vision and strategic pillars, operating model design, data culture… |
| [`data-data-virtualization`](../../skills/data/data-virtualization/SKILL.md) | `data/data-virtualization` | Design and deploy data virtualization with Trino/Presto for federated queries across data sources, with connector configuration, pushdown… |
| [`data-reverse-etl`](../../skills/data/reverse-etl/SKILL.md) | `data/reverse-etl` | Sync aggregated, transformed data from a data warehouse to operational SaaS tools (CRM, marketing, support) to power customer-facing and internal… |
| [`data-clean-room`](../../skills/data/data-clean-room/SKILL.md) | `data/data-clean-room` | Enable privacy-preserving data collaboration between multiple parties using clean room architectures, private set intersection, differential… |
| [`data-cost-optimization`](../../skills/data/data-cost-optimization/SKILL.md) | `data/data-cost-optimization` | Analyze, optimize, and manage cloud data platform costs across Snowflake, BigQuery, and S3, implementing FinOps practices for cost allocation,… |
| [`data-lake-architecture`](../../skills/data/data-engineering/data-lake-architecture/SKILL.md) | `data/data-engineering/data-lake-architecture` | Decide where analytical data lives and how it is laid out so that it stays cheap, queryable by several engines, governed, and does not turn into a… |
| [`data-kafka-event-streaming`](../../skills/data/data-engineering/kafka-event-streaming/SKILL.md) | `data/data-engineering/kafka-event-streaming` | Kafka is a distributed, partitioned, replicated append-only log. |
| [`architecture-postgresql-internals`](../../skills/architecture/databases/postgresql-internals/SKILL.md) | `architecture/databases/postgresql-internals` | Most PostgreSQL production issues (bloat, sudden slowdowns, replication lag, wraparound emergencies, bad plans) are direct consequences of how… |
| [`architecture-database-scaling`](../../skills/architecture/databases/scaling-and-sharding/SKILL.md) | `architecture/databases/scaling-and-sharding` | Sharding is the most expensive scaling step: it complicates queries, transactions, schema changes, and operations forever. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-etl-pipeline --skill data-data-warehouse --skill data-dimensional-modeling --skill data-data-quality --skill data-relational-database --skill data-streaming
```

**Level 1 + 2 (17 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-etl-pipeline --skill data-data-warehouse --skill data-dimensional-modeling --skill data-data-quality --skill data-relational-database --skill data-streaming --skill data-data-lakehouse --skill data-data-lake --skill data-batch-processing --skill data-distributed-compute --skill data-formats --skill data-schema-registry --skill data-data-contracts --skill data-data-observability --skill data-lineage --skill data-testing --skill data-pipeline-cicd
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`data-engineering`](../bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |
| [`data-platform`](../bundles.md#data-platform) | 39 | Data platform: ETL, warehouse, streaming, BI, quality, storage, compute, lake, lakehouse, batch, orchestration, CDC, replication, catalog, observability, contracts, mesh, versioning, API, virtualization, schema registry, relational, NoSQL, graph, search, clean-room, cost-optimization, formats, lineage, pipeline-CI/CD, testing, reverse-ETL |

## Combine with

- [ML & AI Engineer](ml-ai.md)
- [Backend Engineer](backend.md)

## Watch out

`data/etl-pipeline` (Airflow/dbt general) and `data/etl-pipelines` (orchestration focus) overlap; start with the first.
