# Metadata Ingestion Patterns

## Ingestion Architecture

```
┌────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Source     │───▶│ Ingestion Runner │───▶│ Catalog API  │
│ Systems    │    │ (K8s CronJob)    │    │ (DataHub/OM) │
├────────────┤    ├──────────────────┤    ├──────────────┤
│ Snowflake  │    │ datahub-ingest   │    │ Metadata DB  │
│ Redshift   │    │ openmetadata-ingest│   │ Elasticsearch│
│ BigQuery   │    │ custom-python    │    │ GraphQL API  │
│ Postgres   │    │                  │    │              │
│ MSSQL      │    │                  │    │              │
├────────────┤    └──────────────────┘    └──────────────┘
│ Kafka (SR) │              │
│ Airflow    │          emit lineage
│ dbt        │          events via
│ Spark      │          OpenLineage
│ Tableau    │
└────────────┘
```

## Ingestion Configuration by Source

### Snowflake → DataHub

```yaml
source:
  type: snowflake
  config:
    account_id: xy12345.us-east-1
    warehouse: COMPUTE_WH
    role: DATAHUB_INGESTION_ROLE
    include_views: true
    include_tables: true
    include_table_lineage: true
    include_column_lineage: true
    database_pattern:
      allow: ["PROD_DB", "ANALYTICS_DB"]
    profiling:
      enabled: true
      profile_table_level_only: false
      profile_pattern:
        allow: ["PROD_DB.analytics.fct_*"]
sink:
  type: datahub-rest
  config:
    server: "http://datahub-gms:8080"
    retry_max_times: 3
```

### dbt → DataHub (Artifact-based)

```yaml
source:
  type: dbt
  config:
    manifest_path: ./target/manifest.json
    catalog_path: ./target/catalog.json
    sources_path: ./target/sources.json
    test_results_path: ./target/run_results.json
    target_platform: snowflake
    node_type_pattern:
      allow: ["model", "source", "test", "snapshot"]
    enable_meta_mapping: true
    owners:
      - name: data-eng@org.com
        type: DATAOWNER
sink:
  type: datahub-rest
  config:
    server: "http://datahub-gms:8080"
```

### OpenLineage for Airflow + Spark

```yaml
# airflow.cfg
[openlineage]
transport:
  type: http
  url: http://openlineage-server:5000/api/v1/lineage
  api_key: ${OPENLINEAGE_API_KEY}
namespace: production
# SPARK_CONF_DIR/spark-defaults.conf
spark.openlineage.transport.type=http
spark.openlineage.transport.url=http://openlineage-server:5000/api/v1/lineage
spark.openlineage.namespace=prod-spark
spark.openlineage.parentJobName=airflow_dag_id
spark.openlineage.parentRunId=airflow_run_id
```

### Kafka Schema Registry Poll

```yaml
source:
  type: kafka
  config:
    connection:
      bootstrap: kafka-cluster:9092
      consumer_config:
        security.protocol: SASL_SSL
        sasl.mechanism: SCRAM-SHA-512
    schema_registry_url: http://schema-registry:8081
    topic_patterns:
      allow: ["orders.*", "payments.*"]
    topic_categorization:
      message_type: AVRO
sink:
  type: datahub-rest
```

## Batch Ingestion Pipeline (Airflow DAG)

```python
from datetime import datetime, timedelta
from airflow.decorators import dag, task

@dag(schedule="0 6 * * *", start_date=datetime(2026, 1, 1),
     catchup=False, tags=["metadata", "ingestion"])
def metadata_ingestion():
    @task.bash
    def ingest_snowflake():
        return "datahub ingest -c recipes/snowflake-prod.yml"

    @task.bash
    def ingest_dbt():
        return "datahub ingest -c recipes/dbt-prod.yml"

    @task.bash
    def ingest_tableau():
        return "datahub ingest -c recipes/tableau-prod.yml"

    @task
    def validate_ingestion():
        import requests
        r = requests.get("http://datahub-gms:8080/openapi/v3/health")
        assert r.status_code == 200, "DataHub GMS unhealthy"
        datasets = requests.get("http://datahub-gms:8080/entities/v1/latest")
        assert datasets.status_code == 200

    ingest_snowflake() >> ingest_dbt() >> ingest_tableau() >> validate_ingestion()

metadata_ingestion()
```

## Staleness Detection

```sql
-- Detect tables not refreshed in catalog
SELECT
  e.urn,
  e.last_ingested,
  CURRENT_TIMESTAMP - e.last_ingested AS stale_days,
  CASE
    WHEN CURRENT_TIMESTAMP - e.last_ingested > INTERVAL '7 days' THEN 'STALE'
    WHEN CURRENT_TIMESTAMP - e.last_ingested > INTERVAL '30 days' THEN 'ABANDONED'
    ELSE 'ACTIVE'
  END AS status
FROM metadata_entity e
WHERE e.entity_type = 'dataset'
  AND e.last_ingested IS NOT NULL
ORDER BY stale_days DESC;
```
