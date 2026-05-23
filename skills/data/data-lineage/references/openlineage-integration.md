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
```bash
pip install openlineage-airflow
```
```ini
[openlineage]
transport = {"type": "http", "url": "http://marquez:5000", "endpoint": "/api/v1/lineage", "timeout_in_s": 5}
namespace = prod_warehouse
```
```python
from openlineage.airflow import DAG
dag = DAG(dag_id='orders_pipeline', description='Orders with lineage')
with dag:
    extract = PostgresOperator(task_id='extract_orders', sql='SELECT * FROM orders')
```

## dbt Integration
```bash
pip install dbt-openlineage
```
```yaml
# dbt_project.yml
vars:
  openlineage:
    enabled: true
    transport: {type: http, url: http://marquez:5000, endpoint: /api/v1/lineage}
    namespace: prod_dbt
```

## Spark Integration
```xml
<!-- spark-defaults.conf -->
spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener
spark.openlineage.host=http://marquez:5000
spark.openlineage.namespace=prod_spark
spark.openlineage.capturedColumnLineage=true
```

## Custom Python Client
```python
from openlineage.client import OpenLineageClient
from openlineage.client.run import RunEvent, RunState, Run, Job

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
