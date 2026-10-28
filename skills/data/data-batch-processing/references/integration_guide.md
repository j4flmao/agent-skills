# Integrating Batch Jobs with Orchestrators, Catalogs and Downstream Tools

A batch job is one node in a larger system: an orchestrator triggers it, a catalog describes its inputs and outputs, quality tools gate it, and BI or applications consume the result. This reference covers integration with Apache Airflow, dbt, table catalogs, lineage (OpenLineage) and data quality frameworks.

## Orchestration with Apache Airflow

Airflow 3 (released 2025) introduced assets (the renamed datasets), a new task SDK and DAG versioning; Airflow 2.x DAGs mostly port with import changes. Examples below use the Airflow 3 `airflow.sdk` imports; on Airflow 2 use `airflow.decorators` and `Dataset`.

```python
from datetime import datetime, timedelta
from airflow.sdk import dag, task, Asset
from airflow.providers.cncf.kubernetes.operators.spark_kubernetes import SparkKubernetesOperator

raw_orders = Asset("s3://lake/raw/orders")
daily_revenue = Asset("s3://lake/gold/daily_revenue")

@dag(
    schedule="0 3 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=3,
    default_args={"retries": 2, "retry_delay": timedelta(minutes=10)},
    tags=["orders"],
)
def orders_daily():
    run_spark = SparkKubernetesOperator(
        task_id="transform_orders",
        namespace="data-jobs",
        application_file="spark/daily_orders.yaml",   # templated with {{ ds }}
        inlets=[raw_orders],
        outlets=[daily_revenue],
    )

    @task
    def check_row_count(ds=None):
        # query the output partition and raise if empty
        from my_pipeline.checks import assert_partition_not_empty
        assert_partition_not_empty("gold.daily_revenue", ds)

    run_spark >> check_row_count()

orders_daily()
```

Integration rules:
- Pass the logical date (`{{ ds }}`, `data_interval_start`/`data_interval_end`) into the job; never let the job compute "yesterday" from the wall clock.
- Retries in one layer only: either the orchestrator retries the task or the platform retries the job, not both with high counts.
- Use asset/data-aware scheduling (`schedule=[raw_orders]`) for downstream DAGs instead of guessing completion times.
- Backfill with `airflow backfill create` (Airflow 3) or `airflow dags backfill` (Airflow 2) over date ranges; jobs must be idempotent for this to be safe.
- Keep heavy computation out of the Airflow worker; Airflow triggers and monitors, the engine computes.

Other orchestrators map the same concepts: Dagster (software-defined assets, partitions), Prefect (flows, deployments), AWS Step Functions, Argo Workflows, Databricks Workflows.

## dbt for SQL Transformations

Run SQL transformations in the warehouse or lakehouse with dbt; use Spark jobs for ingestion and non-SQL processing.

```yaml
# models/marts/daily_revenue.yml
version: 2
models:
  - name: daily_revenue
    config:
      materialized: incremental
      incremental_strategy: insert_overwrite   # adapter-dependent: merge, insert_overwrite, delete+insert
      partition_by: {field: order_date, data_type: date}
    columns:
      - name: order_date
        data_tests: [not_null]
      - name: segment
        data_tests:
          - accepted_values:
              arguments:
                values: ['enterprise', 'smb', 'consumer']
```

```sql
-- models/marts/daily_revenue.sql
select order_date, segment, count(*) as orders, sum(amount) as revenue
from {{ ref('orders_enriched') }}
{% if is_incremental() %}
where order_date >= date_sub(current_date(), 3)   -- lookback for late data
{% endif %}
group by 1, 2
```

Trigger dbt from Airflow with Astronomer Cosmos (renders dbt models as Airflow tasks) or a `dbt build --select tag:daily` task. Use `dbt build` so tests run between models and failures stop downstream models. Check your dbt version for test argument syntax; older versions use `tests:` and put `values` directly under the test name.

## Catalog Integration

| Catalog | Typical use | Spark integration |
|---------|-------------|-------------------|
| Hive Metastore | Legacy Hadoop | `enableHiveSupport()` |
| AWS Glue Data Catalog | AWS lakes | EMR/Glue native; Iceberg `GlueCatalog` |
| Unity Catalog | Databricks (open-sourced core) | Native on Databricks |
| Iceberg REST catalogs (Polaris, Nessie, Gravitino, vendor catalogs) | Multi-engine Iceberg | `spark.sql.catalog.<name>.type=rest` |

Register every output as a catalog table rather than handing out raw paths: consumers get schemas, permissions and discovery, and multiple engines (Spark, Trino, Flink, warehouses) read the same table.

## Lineage with OpenLineage

OpenLineage is an open standard for emitting lineage events (job, run, input and output datasets).

```bash
spark-submit \
  --packages io.openlineage:openlineage-spark_2.12:<version> \
  --conf spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener \
  --conf spark.openlineage.transport.type=http \
  --conf spark.openlineage.transport.url=http://marquez:5000 \
  --conf spark.openlineage.namespace=prod-batch \
  jobs/daily_orders.py
```

Airflow has a built-in OpenLineage provider (`apache-airflow-providers-openlineage`); dbt can emit via `dbt-ol`. Backends include Marquez, DataHub, OpenMetadata and several commercial catalogs. Column-level lineage is available for many Spark plans.

## Data Quality Gates

| Tool | Style |
|------|-------|
| dbt tests | SQL assertions in the transformation project |
| Great Expectations (GX) | Expectation suites, validation results and data docs |
| Soda Core | YAML checks (SodaCL) |
| Deequ / PyDeequ | Spark-native constraint verification and profiling |
| Table-format constraints | Delta `CHECK` constraints and `NOT NULL`; Iceberg identifier fields |

Run checks after write and before publish (write-audit-publish). Define severity: blocking checks stop publication; warning checks alert owners.

## Downstream Consumers

- **BI**: publish curated tables with stable names, documented grain and freshness SLA. Refresh BI extracts after the publish step, triggered by the orchestrator, not on a separate fixed schedule.
- **Reverse ETL / applications**: export via dedicated jobs with idempotent upserts into operational systems.
- **ML features**: write to a feature store or feature tables with point-in-time correctness for training.

## Contracts Between Producers and Consumers

Document per output table: schema, grain, partitioning, freshness SLA, owner, allowed values, and change policy (how breaking changes are announced). Enforce schemas at write time (dbt model contracts, table-format schema enforcement) so incompatible changes fail in CI rather than in consumers' dashboards.

## Checklist

- [ ] Jobs parameterized by logical date from the orchestrator
- [ ] Retries configured in exactly one layer
- [ ] Data-aware triggers between producer and consumer pipelines
- [ ] Outputs registered in a catalog with owners and descriptions
- [ ] Lineage emitted from Spark, Airflow and dbt
- [ ] Quality gates block publication on critical failures
- [ ] Data contracts documented for shared tables
