# Data Warehouse Architecture Patterns

Structural patterns for modern cloud warehouses (Snowflake, BigQuery, Redshift, Databricks SQL): layer design, ELT flow, environment isolation, workload separation, and warehouse-vs-lakehouse decisions. Dimensional modeling details live in `modeling-optimization.md`; platform comparison in `warehouse-platforms.md`.

## Layered (Medallion-Style) Design

| Layer | Also called | Contents | Rules |
|-------|-------------|----------|-------|
| Raw | Landing, bronze | Source data as loaded, append-only, with load metadata | No transformations; retain for replay |
| Staging | Silver (part) | One model per source table: renamed, typed, deduplicated | 1:1 with sources; no joins across sources |
| Intermediate | Silver | Reusable joins and business logic building blocks | Not exposed to BI |
| Marts | Gold | Facts and dimensions per domain, wide tables for BI | Contracts, tests, documentation |
| Serving | Semantic layer, aggregates | Metrics definitions, aggregates, extracts | Consumer-facing SLAs |

```
sources → raw (EL tools: Fivetran, Airbyte, dlt, CDC) → staging → intermediate → marts → BI / ML / reverse ETL
                                                (dbt / SQLMesh / Dataform transformations)
```

## ELT over ETL

- Load raw data first; transform inside the warehouse with SQL under version control.
- Raw retention enables reprocessing when logic changes, without re-extracting from sources.
- Keep heavy non-SQL processing (ML feature generation, complex parsing) in Spark/Python jobs that write back to the warehouse or lake.

## Schema and Naming Conventions

| Object | Convention |
|--------|-----------|
| Raw schemas | `raw_<source>` (e.g. `raw_stripe`) |
| Staging models | `stg_<source>__<entity>` |
| Intermediate | `int_<entity>__<verb>` |
| Facts / dimensions | `fct_<process>`, `dim_<entity>` |
| Timestamps | `<event>_at` in UTC; dates `<event>_date` |
| Booleans | `is_` / `has_` prefixes |

Consistent conventions let tooling (lineage, access policies, tests) apply by pattern.

## Environment Isolation

| Approach | Snowflake | BigQuery | Redshift |
|----------|-----------|----------|----------|
| Separate databases/projects per env | `ANALYTICS_DEV`, `ANALYTICS_PROD` | Separate GCP projects | Separate databases or clusters/workgroups |
| Per-developer schemas | `DBT_<user>` schemas in dev database | Per-user datasets | Per-user schemas |
| Zero-copy dev data | `CREATE DATABASE dev CLONE prod` | Table snapshots/clones | Data sharing to a dev workgroup |

- Production writes only from CI/CD service identities.
- dbt `defer` lets development builds reference production upstream models instead of rebuilding everything.

## Workload Isolation

Separate compute by workload so ETL spikes do not slow dashboards:

| Workload | Snowflake | BigQuery | Redshift |
|----------|-----------|----------|----------|
| Ingestion / ELT | Dedicated warehouse | Reservation/assignment for ELT project | Separate workgroup or WLM queue |
| BI dashboards | Multi-cluster warehouse (scale out on concurrency) | Reservation with baseline + autoscale | Concurrency scaling |
| Ad hoc / data science | Separate warehouse with resource monitor | On-demand project with byte quotas | Separate queue with limits |

Attribute cost per workload via tags/labels and separate compute.

## Warehouse vs Lakehouse

| Factor | Warehouse-native storage | Lakehouse (Iceberg/Delta on object storage) |
|--------|-------------------------|---------------------------------------------|
| Simplicity | High; one engine | More components (catalog, engines) |
| Engine choice | Single vendor engine | Multiple engines (Spark, Trino, Flink, DuckDB, warehouses) on the same tables |
| ML / unstructured data | Limited | Strong |
| Governance | Built-in | Via catalog (Unity Catalog, Polaris/Open Catalog, Glue, Nessie) |
| Lock-in | Higher | Lower with open table formats |

Many platforms now read and write Apache Iceberg tables natively (Snowflake Iceberg tables, BigQuery tables for Apache Iceberg, Redshift querying Iceberg), so a hybrid is common: open tables for shared/raw data, native tables for high-concurrency serving.

## Loading Patterns

| Pattern | Use | Notes |
|---------|-----|-------|
| Full refresh | Small dimensions | Simple, idempotent |
| Incremental append | Immutable events | Watermark on ingestion time; dedupe late duplicates |
| Incremental merge (upsert) | Mutable entities | `MERGE` on business key; handle deletes (soft-delete flags from CDC) |
| Snapshot (SCD2) | History of changing attributes | dbt snapshots or CDC-driven SCD2 |
| Micro-batch / streaming | Near-real-time | Snowpipe Streaming, BigQuery Storage Write API, Redshift streaming ingestion from Kinesis/MSK |

```sql
MERGE INTO marts.dim_customer t
USING staging.stg_crm__customers s
  ON t.customer_id = s.customer_id
WHEN MATCHED AND s.is_deleted THEN DELETE
WHEN MATCHED THEN UPDATE SET email = s.email, segment = s.segment, updated_at = s.updated_at
WHEN NOT MATCHED AND NOT s.is_deleted THEN
  INSERT (customer_id, email, segment, updated_at) VALUES (s.customer_id, s.email, s.segment, s.updated_at);
```

## Semantic Layer

Define metrics once (dbt Semantic Layer/MetricFlow, Cube, LookML, AtScale) so dashboards and notebooks compute "revenue" identically. Store metric definitions in Git with owners.

## Data Sharing and Reverse ETL

- Share governed datasets via native sharing (Snowflake Secure Data Sharing, BigQuery Analytics Hub, Redshift data sharing) instead of exporting copies; see `warehouse-data-sharing.md`.
- Reverse ETL (Hightouch, Census, custom) pushes modeled data to SaaS tools; treat those syncs as production consumers with contracts.

## Anti-Patterns

- BI tools querying raw/staging tables directly.
- One giant transformation job without layers, impossible to test incrementally.
- Shared compute for ELT and dashboards, causing morning dashboard slowness.
- Developers with write access to production schemas.
- Copying data between environments instead of cloning/deferring.

## Checklist

- [ ] Raw → staging → intermediate → marts layering with naming conventions
- [ ] Raw data retained for replay
- [ ] Environments isolated; production writes only from CI/CD
- [ ] Compute separated per workload with cost attribution
- [ ] Incremental strategies chosen per table type
- [ ] Metrics defined in a semantic layer
