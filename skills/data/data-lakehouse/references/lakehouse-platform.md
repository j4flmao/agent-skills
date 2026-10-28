# Lakehouse Platform Selection

Comparison of managed and self-assembled lakehouse platforms and the questions that decide between them. Prices and feature availability change frequently; confirm against current vendor documentation before committing.

## 1. Platform Options

| Platform | Native format / catalog | Strengths | Watch for |
|---|---|---|---|
| Databricks | Delta (+ managed Iceberg), Unity Catalog | Integrated ETL, SQL, ML, streaming; Delta Sharing; predictive optimization | DBU pricing model; best features tied to the platform |
| Snowflake | Iceberg tables (Snowflake-managed or external catalog), Open Catalog (Polaris) | Mature SQL warehouse, governance, data sharing | Spark-style workloads via Snowpark; external-catalog tables have feature limits |
| AWS native | Iceberg on S3 / S3 Tables, Glue Data Catalog, Lake Formation | Athena (serverless SQL), EMR / EMR Serverless, Glue ETL, Redshift | Many services to integrate; Lake Formation permission model complexity |
| Google Cloud | BigLake Iceberg tables, BigQuery, Dataproc, BigLake metastore | BigQuery as engine over open tables; serverless | Feature parity between BigQuery-managed and external Iceberg tables |
| Microsoft Fabric / Azure | OneLake with Delta, shortcuts; Azure Databricks | Delta everywhere in Fabric, Power BI integration | Capacity-based pricing; Fabric feature maturity per workload |
| Open-source stack | Iceberg + REST catalog (Polaris/Lakekeeper/Nessie) + Spark/Flink + Trino | No license fees, full control, portability | Operations, upgrades, security integration are your job |
| Managed OSS engines | Starburst (Trino), Dremio, Onehouse (Hudi/XTable) | Managed engines on open formats | Vendor maturity, catalog coupling |

## 2. Decision Questions

| Question | Leans toward |
|---|---|
| Heavy Spark ETL + ML + streaming, one vendor acceptable | Databricks |
| SQL-first analytics team with an existing warehouse | Snowflake or BigQuery with Iceberg tables |
| All-in on one cloud, serverless preference | Cloud-native stack (AWS/GCP/Azure) |
| Multi-engine, avoid vendor lock-in, strong platform team | Open-source stack on Iceberg + REST catalog |
| Power BI-centric enterprise on Microsoft | Fabric / Azure Databricks |
| Multi-cloud or sovereignty requirements | Open formats + portable catalog; per-region deployment |

## 3. Total Cost Components

- Storage: object storage plus retained snapshots/versions (time-travel retention multiplies storage for frequently rewritten tables).
- Compute: per-second clusters/warehouses, serverless per-query or per-DPU pricing.
- Data transfer: cross-region and egress for multi-cloud or external sharing.
- Maintenance compute: compaction and optimization jobs.
- People: platform engineering for self-managed components.

Model costs with your own workload shape (data volume, query concurrency, freshness), not vendor examples.

## 4. Portability Checklist

Keep exit costs low regardless of platform:
- Store data in an open table format in storage you own.
- Prefer catalogs exposing the Iceberg REST API or Delta Sharing for external reads.
- Keep transformation logic in portable SQL/dbt or Spark code, not proprietary visual tools only.
- Export governance definitions (grants, masks) as code.
- Avoid features that make tables unreadable outside the platform unless the benefit is clear and recorded.

## 5. Multi-Cloud and Multi-Region

| Pattern | Description | Trade-off |
|---|---|---|
| Single primary region, read replicas | Replicate gold tables to other regions | Replication lag, duplicate storage |
| Per-region lakehouse, federated catalog | Data stays in region (sovereignty) | Cross-region analytics harder |
| Share instead of copy | Delta Sharing / Iceberg REST across clouds | Egress cost per query |

Replicating Iceberg tables by copying files requires rewriting absolute paths in metadata (or using relative-path tooling); Delta tables can be deep-cloned (`CREATE TABLE ... DEEP CLONE`) on Databricks.

## 6. Reference Stacks

AWS:
```
S3 (or S3 Tables) ─ Glue Data Catalog + Lake Formation
   ├─ ingestion: DMS / MSK + Iceberg sink / Glue jobs
   ├─ transform: EMR Serverless (Spark) or Glue ETL, dbt-athena
   └─ serve: Athena, Redshift (Spectrum), QuickSight
```

Databricks:
```
ADLS / S3 / GCS ─ Unity Catalog
   ├─ ingestion: Auto Loader, Lakeflow Connect
   ├─ transform: Lakeflow Declarative Pipelines (formerly DLT), Jobs, dbt-databricks
   └─ serve: Databricks SQL, Delta Sharing, Power BI/Tableau
```

Open source:
```
S3-compatible storage ─ Polaris / Lakekeeper (Iceberg REST)
   ├─ ingestion: Debezium + Kafka + Iceberg Kafka Connect sink
   ├─ transform: Spark on Kubernetes, dbt-spark/dbt-trino, Airflow or Dagster
   └─ serve: Trino, DuckDB, Superset
```

## Pitfalls

- Choosing on list price without modelling the workload.
- Adopting proprietary table features that strand data on one platform.
- Underestimating self-managed operations (catalog HA, engine upgrades, security patches).
- Ignoring identity integration: SSO, service principals, and SCIM provisioning drive governance quality.

## Checklist

- [ ] Workload profile written down (ETL, BI concurrency, streaming, ML).
- [ ] Platform shortlisted against decision questions; proof of concept on real data.
- [ ] Cost model includes storage retention, maintenance, and people.
- [ ] Portability requirements recorded in an ADR.
