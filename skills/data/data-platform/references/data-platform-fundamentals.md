# Data Platform Fundamentals: Capabilities and Reference Stack

What a data platform must provide, how the pieces fit together, and the baseline decisions to make before choosing tools. Detailed architecture comparisons are in `data-platform-architecture.md` and `platform-decision-tree.md`; tool comparisons in `platform-tools-comparison.md`.

## Capability Map

| Capability | Purpose | Typical options |
|-----------|---------|-----------------|
| Ingestion (batch) | Load from SaaS, databases, files | Fivetran, Airbyte, dlt, Meltano, custom Spark/Python |
| Ingestion (streaming/CDC) | Low-latency events and row changes | Kafka + Debezium, Kinesis, Pub/Sub, Flink |
| Storage | Durable, cheap, scalable | Object storage (S3, ADLS, GCS), warehouse-native storage |
| Table format | ACID tables on object storage | Apache Iceberg, Delta Lake, Apache Hudi |
| Catalog | Table metadata and discovery | Iceberg REST catalogs (Polaris/Open Catalog, Unity Catalog, Glue, Nessie, Lakekeeper), Hive Metastore (legacy) |
| Compute | Transform and query | Spark, Trino, Flink, DuckDB, warehouse engines (Snowflake, BigQuery, Databricks SQL, Redshift) |
| Transformation | Versioned business logic | dbt, SQLMesh, Spark jobs |
| Orchestration | Schedule and coordinate | Airflow, Dagster, Prefect, cloud-native schedulers |
| Quality and observability | Trust in data | dbt tests, GX, Soda, Monte Carlo, Elementary |
| Governance and security | Access, lineage, classification | Unity Catalog, Lake Formation, Ranger, DataHub, OpenMetadata |
| Serving | BI, ML, APIs, reverse ETL | BI tools, feature stores, semantic layers, Hightouch/Census |

A platform is the integration of these capabilities with paved paths, not the list of tools.

## Reference Flow

```
Sources ─► Ingestion ─► Raw/bronze (immutable) ─► Cleaned/silver ─► Curated/gold ─► Consumers
                 │               │                       │                │
             contracts      table format +           tests, lineage   semantic layer,
             & schemas      catalog                  & ownership      access policies
                         ◄────────── Orchestration + observability across all stages ──────────►
```

## Baseline Decisions

| Decision | Questions to answer |
|----------|-------------------|
| Warehouse-first vs lakehouse | Do multiple engines need the same data? ML on raw files? Team SQL vs Spark skills? |
| Open table format | Engine support you need (Iceberg has the broadest multi-engine support today) |
| Catalog | Which engines must read/write; access control model; vendor neutrality |
| Batch vs streaming | Latency requirements per use case; streaming only where it pays off |
| Orchestrator | Asset-oriented (Dagster) vs task-oriented (Airflow); existing skills |
| Environments | How dev/staging/prod are isolated (separate accounts, catalogs, branches) |
| Ownership | Central team vs domain teams (data mesh) and platform responsibilities |

Record each decision in an ADR with rejected alternatives.

## File and Table Formats

- Columnar files (Parquet; ORC in Hive-centric estates) for analytics; Avro for row-oriented streaming payloads.
- Table formats add ACID commits, schema evolution, time travel, and partition evolution on top of files; never let multiple writers modify raw Parquet directories without one.
- Target file sizes in the hundreds of MB range for analytical tables; many tiny files slow every engine (see compaction in `data-platform-advanced.md`).

## Ingestion Patterns

| Pattern | Use | Note |
|---------|-----|------|
| Full extract | Small reference tables | Simple, idempotent |
| Incremental by cursor (`updated_at`) | Mutable tables without CDC | Misses hard deletes |
| CDC from transaction log | Mutable tables needing deletes and low latency | Requires DB configuration |
| Event streams | Application events | Schema registry and contracts |
| File drops (SFTP, buckets) | Partners | Validate on arrival; quarantine bad files |

Land raw data unchanged with ingestion metadata (`_ingested_at`, source file, batch ID) so it can be replayed.

## Orchestration Basics

```python
# Dagster: software-defined assets with dependencies
from dagster import asset

@asset
def raw_orders() -> None:
    load_orders_from_source()

@asset(deps=[raw_orders])
def orders_clean() -> None:
    run_dbt(select="stg_orders+")
```

- Prefer data-aware scheduling (asset materializations, dataset/asset triggers in Airflow) over fixed time chains.
- Make every task idempotent and parameterized by partition/date for safe retries and backfills.
- Keep business logic out of DAG files; DAGs call versioned code.

## Platform Non-Functional Requirements

| Area | Example target to define |
|------|-------------------------|
| Freshness | Gold tables updated within N hours of source changes |
| Availability | Query engine and catalog uptime |
| Recovery | RPO/RTO for raw and curated data; backup of catalog metadata |
| Cost | Budget per domain with showback |
| Security | Encryption, least privilege, PII handling, audit |
| Discoverability | Every production table has owner, description, lineage |

## Teams and Operating Model

- Platform team: provides infrastructure, paved paths (templates, CI, access workflows), and SLOs for shared services.
- Domain/data product teams: own pipelines and datasets, their quality and contracts.
- Governance: shared standards for naming, classification, retention, and access approvals.

## Anti-Patterns

- Tool-first design ("we bought X, now find use cases").
- A swamp: raw files without table formats, catalog entries, or owners.
- Streaming everything by default.
- Analysts querying raw zones directly.
- No dev environment, so changes are tested in production.

## Checklist

- [ ] Capability map with chosen tool per capability and owner
- [ ] ADRs for warehouse/lakehouse, table format, catalog, orchestrator
- [ ] Raw zone immutable and replayable
- [ ] Idempotent, partitioned pipelines with data-aware scheduling
- [ ] Platform SLOs, cost showback, and governance standards defined
