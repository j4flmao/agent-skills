# ETL Orchestration API Reference (Airflow 3, Dagster, dbt)

The programming and HTTP interfaces used to define, trigger and observe ETL pipelines: the Airflow 3 Task SDK and REST API v2, Dagster's asset API and GraphQL, and dbt's CLI/programmatic invocation. Use this to automate pipeline operations from CI, other services or runbooks.

## Airflow 3: Task SDK (DAG Authoring)

Airflow 3.0 (April 2025) moved authoring imports to `airflow.sdk`, removed `schedule_interval` (use `schedule`), renamed Datasets to **Assets**, and runs tasks through the Task Execution API instead of direct metadata-DB access.

```python
from __future__ import annotations

import pendulum
from airflow.sdk import Asset, dag, task

raw_orders = Asset("s3://lake/raw/orders/")
clean_orders = Asset("s3://lake/clean/orders/")


@dag(
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 1, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 3, "retry_delay": pendulum.duration(minutes=5)},
    tags=["orders"],
)
def orders_daily():
    @task(outlets=[raw_orders])
    def extract(data_interval_start=None, data_interval_end=None) -> str:
        from pipelines.orders import extract_window
        return extract_window(data_interval_start, data_interval_end)   # returns object key

    @task(outlets=[clean_orders])
    def transform(key: str) -> int:
        from pipelines.orders import transform_file
        return transform_file(key)                                       # returns row count

    transform(extract())


orders_daily()
```
Asset-triggered DAG: `@dag(schedule=[clean_orders])` runs when the upstream task updates the asset.

Key concepts:
| Concept | Notes |
|---|---|
| `data_interval_start/end` | The logical window a run processes; use for idempotent extraction |
| XCom | Small values only (keys, counts); large data goes to object storage |
| Pools / `max_active_tis_per_dag` | Limit concurrency against fragile sources |
| Deferrable operators / triggers | Wait on external events without occupying worker slots |

## Airflow 3: REST API v2

Base path `/api/v2`. Authenticate by obtaining a JWT from the API server (`POST /auth/token` with the configured auth manager) and send `Authorization: Bearer <token>`.

| Operation | Method and path |
|---|---|
| List DAGs | `GET /api/v2/dags` |
| Pause/unpause | `PATCH /api/v2/dags/{dag_id}` body `{"is_paused": true}` |
| Trigger run | `POST /api/v2/dags/{dag_id}/dagRuns` |
| Get run | `GET /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}` |
| Task instances | `GET /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances` |
| Clear tasks | `POST /api/v2/dags/{dag_id}/clearTaskInstances` |
| Task logs | `GET /api/v2/dags/{dag_id}/dagRuns/{run_id}/taskInstances/{task_id}/logs/{try_number}` |
| Asset events | `GET /api/v2/assets/events`, `POST /api/v2/assets/events` (external producers) |

```bash
TOKEN=$(curl -s -X POST "$AIRFLOW_URL/auth/token" -H 'content-type: application/json' \
  -d "{\"username\":\"$AIRFLOW_USER\",\"password\":\"$AIRFLOW_PASSWORD\"}" | jq -r .access_token)

curl -s -X POST "$AIRFLOW_URL/api/v2/dags/orders_daily/dagRuns" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"logical_date":"2026-10-26T00:00:00Z","conf":{"reprocess":true}}'
```
Credentials come from the environment or a secret manager. In Airflow 3, `logical_date` may be null for manually triggered runs that do not represent a time window.

### Python client
```python
import airflow_client.client as af
from airflow_client.client.api import dag_run_api

cfg = af.Configuration(host=f"{os.environ['AIRFLOW_URL']}/api/v2", access_token=os.environ["AIRFLOW_TOKEN"])
with af.ApiClient(cfg) as api:
    runs = dag_run_api.DagRunApi(api).get_dag_runs("orders_daily", limit=10)
```
Use the `apache-airflow-client` major version matching your Airflow server.

## Airflow CLI (operations)
```bash
airflow dags list
airflow dags test orders_daily 2026-10-26          # run once locally without scheduler
airflow tasks test orders_daily extract 2026-10-26
airflow backfill create --dag-id orders_daily --from-date 2026-10-01 --to-date 2026-10-07   # Airflow 3: scheduler-managed backfill
airflow connections add warehouse --conn-uri "$WAREHOUSE_CONN_URI"
```

## Dagster: Asset API

```python
import dagster as dg

@dg.asset(partitions_def=dg.DailyPartitionsDefinition(start_date="2026-01-01"), group_name="orders")
def raw_orders(context: dg.AssetExecutionContext) -> None:
    day = context.partition_key
    context.log.info(f"Extracting orders for {day}")
    extract_day(day)

@dg.asset(deps=[raw_orders], partitions_def=raw_orders.partitions_def)
def clean_orders(context: dg.AssetExecutionContext) -> dg.MaterializeResult:
    rows = transform_day(context.partition_key)
    return dg.MaterializeResult(metadata={"row_count": rows})

@dg.asset_check(asset=clean_orders)
def no_null_ids() -> dg.AssetCheckResult:
    nulls = count_null_order_ids()
    return dg.AssetCheckResult(passed=nulls == 0, metadata={"nulls": nulls})

defs = dg.Definitions(assets=[raw_orders, clean_orders], asset_checks=[no_null_ids])
```
Operations: `dagster asset materialize --select clean_orders --partition 2026-10-26 -m pipelines`; external automation uses the Dagster GraphQL API (`launchRun`, `launchPartitionBackfill`) or the `dagster-graphql` Python client.

## dbt: CLI and Programmatic Invocation

```bash
dbt build --select state:modified+ --defer --state ./prod-artifacts   # slim CI
dbt run --select tag:orders --vars '{"run_date": "2026-10-26"}'
dbt test --select source:shop
dbt source freshness
```
```python
from dbt.cli.main import dbtRunner

res = dbtRunner().invoke(["build", "--select", "orders+", "--target", "prod"])
if not res.success:
    raise RuntimeError(f"dbt build failed: {res.exception}")
```
Artifacts (`target/manifest.json`, `run_results.json`, `sources.json`) are the machine-readable API for lineage, results and freshness; dbt Cloud exposes jobs via its Administrative API and metadata via the Discovery API.

## Integration Patterns
| Need | Approach |
|---|---|
| Upstream system signals data ready | Post an Airflow asset event or trigger a run; or Dagster sensor |
| CI deploys new pipeline code | Sync DAG bundle / code location, then call API to unpause |
| Reprocess a date range | Backfill via CLI/API, never ad-hoc scripts against prod tables |
| Alerting | Callbacks (`on_failure_callback`), Dagster run failure sensors, dbt `run_results.json` parsing |

## Checklist
- [ ] Airflow DAGs use `airflow.sdk` imports and `schedule`
- [ ] Runs are parameterized by data interval/partition, not wall clock
- [ ] API access via short-lived tokens from a secret store
- [ ] Backfills executed through the orchestrator
- [ ] dbt artifacts stored for state-based CI and lineage
