# Lakehouse Ecosystem Tools Map

A categorized map of tools around open-table-format lakehouses, with what each is for and when to choose it. Use it to fill gaps in a platform design; deeper comparisons of engines and catalogs live in `lakehouse-query-engines.md` and `lakehouse-catalog-integration.md`.

## 1. Table Formats

| Tool | Strengths | Typical home |
|---|---|---|
| Apache Iceberg | Broadest engine and vendor support, hidden partitioning, partition evolution, REST catalog spec | Multi-engine and multi-vendor platforms |
| Delta Lake | Mature on Spark/Databricks, CDF, liquid clustering, deletion vectors, Delta Sharing | Databricks-centric platforms |
| Apache Hudi | Record-level indexes, incremental pulls, MoR tables | Existing Hudi estates, upsert-heavy Spark |
| Apache Paimon | LSM-based primary-key tables, streaming changelog | Flink streaming lakehouse |
| Interop: Delta UniForm, Apache XTable | Expose one table's metadata in other formats | Mixed-reader environments |

## 2. Catalogs and Governance

| Tool | Role |
|---|---|
| Unity Catalog | Governance, lineage, sharing on Databricks; OSS version available |
| Apache Polaris / Snowflake Open Catalog | Iceberg REST catalog with RBAC and credential vending |
| AWS Glue + Lake Formation, S3 Tables | AWS-native catalog, permissions, managed Iceberg |
| Nessie | Git-like versioning across tables |
| Lakekeeper, Apache Gravitino | Self-hosted REST catalog / metadata federation |
| DataHub, OpenMetadata | Discovery, lineage, ownership across systems |
| Apache Ranger | Policy enforcement for Hadoop-ecosystem engines (Trino, Hive, Spark via plugins) |

## 3. Compute Engines

| Engine | Best at |
|---|---|
| Apache Spark | Batch ETL, large MERGE, ML feature pipelines, streaming |
| Apache Flink | Low-latency streaming, CDC, Paimon |
| Trino / Starburst | Interactive federated SQL |
| Databricks SQL, Snowflake, BigQuery (BigLake), Athena, Redshift | Managed SQL over lakehouse tables |
| DuckDB, Polars, DataFusion | Single-node analytics, local dev, embedded |
| StarRocks, Dremio, ClickHouse | Low-latency BI over Iceberg/Delta |

## 4. Ingestion

| Tool | Use |
|---|---|
| Debezium, Flink CDC | Open-source database CDC |
| Kafka Connect + Iceberg sink | Topic-to-table without custom code |
| Fivetran, Airbyte, dlt | SaaS/API sources; Fivetran and Airbyte have Iceberg/Delta destinations |
| Databricks Auto Loader / Lakeflow Connect | Incremental file and managed source ingestion on Databricks |
| AWS DMS, Azure Data Factory, GCP Datastream | Cloud-native replication |

## 5. Transformation and Orchestration

| Tool | Use |
|---|---|
| dbt (Core / platform) | SQL models, tests, docs on Spark, Databricks, Trino, Snowflake, Athena |
| SQLMesh | SQL modelling with virtual environments and column-level lineage |
| Apache Airflow | General DAG orchestration |
| Dagster | Asset-based orchestration with lineage and partitions |
| Databricks Workflows / Lakeflow Jobs, AWS Step Functions | Platform-native orchestration |

## 6. Data Quality and Observability

| Tool | Use |
|---|---|
| Great Expectations (GX) | Expectation suites in Python pipelines |
| Soda Core | YAML checks (SodaCL) run by pipelines |
| dbt tests / dbt-expectations | Tests alongside models |
| Databricks Lakehouse Monitoring / DLT expectations | Platform-native quality metrics |
| Monte Carlo, Elementary, Anomalo | Observability: freshness, volume, schema, anomaly detection |

## 7. Table Maintenance

| Need | Tool |
|---|---|
| Compaction, snapshot expiry, orphan cleanup | Engine procedures (Spark, Trino), Databricks predictive optimization, S3 Tables managed maintenance |
| Scheduling maintenance | Orchestrator job per table or a maintenance service (e.g. Amoro for Iceberg) |

## 8. Local Development Stack

```yaml
# compose.yaml: local Iceberg stack
services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports: ["9000:9000", "9001:9001"]
  rest:
    image: apache/iceberg-rest-fixture
    environment:
      CATALOG_WAREHOUSE: s3://warehouse/
      CATALOG_IO__IMPL: org.apache.iceberg.aws.s3.S3FileIO
      CATALOG_S3_ENDPOINT: http://minio:9000
      AWS_ACCESS_KEY_ID: ${MINIO_ROOT_USER}
      AWS_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD}
      AWS_REGION: us-east-1
    ports: ["8181:8181"]
    depends_on: [minio]
```

Point Spark, PyIceberg, or DuckDB at `http://localhost:8181`. The REST fixture is for tests, not production.

## Selection Heuristics

- Start from the catalog and table format; engines and tools follow from what they support.
- Prefer tools that speak the Iceberg REST spec or Delta protocol directly over ones needing custom connectors.
- Count operational burden: every self-hosted component (catalog, Trino, Kafka Connect) needs upgrades, monitoring, and on-call.

## Pitfalls

- Picking an engine that cannot read the table features you enable.
- Several overlapping orchestration or quality tools with no clear owner.
- Using test fixtures (REST fixture, single-node MinIO) as production components.

## Checklist

- [ ] Each category has one primary tool and an owner.
- [ ] Reader/writer compatibility matrix maintained per table format version.
- [ ] Local development stack mirrors production catalog type.
- [ ] Maintenance tooling chosen and scheduled.
