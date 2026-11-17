# OpenLineage Integration

OpenLineage is an open standard for lineage metadata collection. Defines JSON event model with facets for cross-tool lineage visibility.

## Event Structure
```json
{
  "eventType": "COMPLETE",
  "eventTime": "2026-05-01T03:00:00Z",
  "run": {"runId": "uuid", "facets": {"nominalTime": {}}},
  "job": {"namespace": "airflow", "name": "orders_pipeline.extract_orders"},
  "inputs": [{"namespace": "pg://source:5432", "name": "public.orders", "facets": {"schema": {"fields": [{"name": "order_id", "type": "INTEGER"}]}}}],
  "outputs": [{"namespace": "s3://data-lake", "name": "landing/orders/orders.parquet"}]
}
```

## Airflow Integration
Airflow 2.7+ and 3.x ship lineage through the official provider; the old standalone
`openlineage-airflow` package is deprecated. Operators that implement OpenLineage
methods (SQL, Spark, dbt Cloud, ...) emit events automatically; no special DAG class is needed.
```bash
uv add apache-airflow-providers-openlineage
```
```ini
# airflow.cfg (or AIRFLOW__OPENLINEAGE__TRANSPORT / AIRFLOW__OPENLINEAGE__NAMESPACE env vars)
[openlineage]
transport = {"type": "http", "url": "https://marquez.internal:5000", "endpoint": "api/v1/lineage", "timeout": 5}
namespace = prod_warehouse
```

## dbt Integration
Use the `openlineage-dbt` package, which provides the `dbt-ol` wrapper around the dbt CLI.
```bash
uv add openlineage-dbt
export OPENLINEAGE_URL=https://marquez.internal:5000
export OPENLINEAGE_NAMESPACE=prod_dbt
uv run dbt-ol run          # runs dbt, then emits lineage from manifest.json and run_results.json
```

## Spark Integration
```properties
# spark-defaults.conf (openlineage-spark 1.x)
spark.jars.packages=io.openlineage:openlineage-spark_2.12:<version>
spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener
spark.openlineage.transport.type=http
spark.openlineage.transport.url=https://marquez.internal:5000
spark.openlineage.namespace=prod_spark
```
Column-level lineage is collected by default for supported plans.

## Custom Python Client
```python
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Job, Run, RunEvent, RunState  # `openlineage.client.run` is deprecated

client = OpenLineageClient(url="http://marquez:5000")
run = Run(runId="run-uuid")
client.emit(RunEvent(eventType=RunState.START, eventTime="2026-05-01T03:00:00Z",
    run=run, job=Job(namespace="custom", name="my_job"),
    producer="https://github.com/OpenLineage/OpenLineage"))
```

## Marquez API
```bash
# List namespaces
curl http://localhost:5000/api/v1/namespaces
# Get lineage graph
curl "http://localhost:5000/api/v1/lineage?nodeId=pg://warehouse/prod.public.orders&depth=3"
# Search
curl "http://localhost:5000/api/v1/search?q=orders"
```

## Facets Reference
- `columnLineage`: input/output column mappings per transformation
- `dataSource`: connection details (JDBC URI, S3 bucket, Kafka topic)
- `schema`: field names, types, descriptions
- `ownership`: responsible team
- `documentation`: markdown descriptions

## Dataset FQN Convention
```
{namespace}.{database}.{schema}.{table}
postgresql://warehouse:5432.prod.analytics.fct_orders
bigquery://my-project.prod.mart.daily_summary
s3://data-lake.prod.staging.orders
```

## Troubleshooting
- Missing events: verify transport URL reachable, check worker logs
- Incomplete column lineage: set `capturedColumnLineage=true` in Spark
- Duplicate names: use consistent namespace URIs
