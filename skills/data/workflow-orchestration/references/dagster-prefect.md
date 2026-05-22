# Dagster and Prefect Reference

## Dagster Software-Defined Assets

### Asset Definition
```python
from dagster import asset, AssetIn, MaterializeResult, DataVersion, Definitions
import pandas as pd

@asset(key_prefix=["bronze"], group_name="ingestion")
def raw_orders(context) -> pd.DataFrame:
    """Raw orders ingested from source API."""
    df = pd.read_csv("s3://source/orders/orders.csv")
    context.log.info(f"Ingested {len(df)} raw orders")
    return df

@asset(
    key_prefix=["silver"],
    group_name="cleaning",
    ins={"raw_orders": AssetIn(key_prefix=["bronze"])},
    deps=[raw_orders],
)
def cleaned_orders(raw_orders: pd.DataFrame) -> pd.DataFrame:
    """Orders cleaned and validated."""
    df = raw_orders.dropna(subset=["order_id", "amount"])
    df = df[df["amount"] > 0]
    df = df.drop_duplicates(subset=["order_id"])
    return df

@asset(key_prefix=["gold"], group_name="analytics")
def daily_revenue(cleaned_orders: pd.DataFrame) -> pd.DataFrame:
    """Aggregated daily revenue."""
    return cleaned_orders.groupby("order_date")["amount"].sum().reset_index()

defs = Definitions(assets=[raw_orders, cleaned_orders, daily_revenue])
```

### Sensors
```python
from dagster import sensor, RunRequest, SkipReason, SensorEvaluationContext

@sensor(target=[raw_orders])
def new_file_sensor(context: SensorEvaluationContext):
    """Check S3 for new files every 30 seconds."""
    import boto3
    s3 = boto3.client("s3")
    last_key = context.cursor or ""

    response = s3.list_objects_v2(Bucket="source", Prefix="orders/")
    files = [obj["Key"] for obj in response.get("Contents", [])]
    new_files = [f for f in files if f > last_key]

    if not new_files:
        return SkipReason("No new files found")

    for f in new_files:
        yield RunRequest(
            run_key=f"s3_file_{f}",
            partition_key=f.split("/")[-1],
        )
    context.update_cursor(new_files[-1])

@sensor(job=daily_revenue_job, minimum_interval_seconds=60)
def slack_on_failure(context):
    """Send slack alert when gold asset fails to materialize."""
    ...
```

### Dagster Config
```yaml
# workspace.yaml
load_from:
  - python_module: my_dagster_project
    attribute: defs

# dagster.yaml
scheduler:
  module: dagster.core.scheduler
  class: DagsterDaemonScheduler

run_launcher:
  module: dagster_k8s
  class: K8sRunLauncher
  config:
    image: myrepo/dagster:latest
    namespace: dagster
    service_account: dagster-run

storage:
  postgres:
    postgres_db:
      username: dagster
      password: "****"
      hostname: postgres
      db_name: dagster
      port: 5432
```

## Prefect Flows and Tasks

### Flow Definition
```python
from prefect import flow, task
from prefect.tasks import task_input_hash
from prefect.logging import get_run_logger
from datetime import timedelta
import pandas as pd

@task(retries=3, cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=1))
def extract(source_url: str) -> bytes:
    """Fetch data from API."""
    import requests
    response = requests.get(source_url, timeout=30)
    response.raise_for_status()
    return response.content

@task(retries=2, retry_delay_seconds=30, timeout_seconds=300)
def transform(data: bytes) -> pd.DataFrame:
    """Transform raw data."""
    import json
    records = json.loads(data)
    df = pd.DataFrame(records)
    df = df.dropna(subset=["id"])
    return df

@task
def load(df: pd.DataFrame, target: str):
    """Load to warehouse."""
    df.to_parquet(target, index=False)

@flow(
    name="orders-ingestion",
    description="Daily ingestion pipeline",
    version="1.0.0",
    retries=1,
    retry_delay_seconds=60,
    log_prints=True,
)
def orders_pipeline(sources: list[str], target_base: str):
    logger = get_run_logger()
    logger.info(f"Processing {len(sources)} sources")

    extracted = extract.map(sources)
    transformed = transform.map(extracted)
    for i, df in enumerate(transformed):
        target_path = f"{target_base}/orders_{i}.parquet"
        load(df, target_path)

if __name__ == "__main__":
    orders_pipeline(
        sources=["https://api.example.com/orders"],
        target_base="s3://warehouse/orders",
    )
```

### Prefect Deployments
```python
from prefect.deployments import Deployment
from prefect.filesystems import S3
from prefect.infrastructure import DockerContainer

# S3 storage for flow code
storage = S3(bucket="prefect-flows", bucket_folder="prod")
storage.save("prod-storage")

# Docker infrastructure
infra = DockerContainer(
    image="myrepo/prefect:latest",
    env={"WAREHOUSE_URL": "postgresql://..."},
    networks=["prefect-network"],
)
infra.save("prod-infra")

# Deployment
Deployment(
    flow=orders_pipeline,
    name="orders-ingestion-prod",
    cron="0 6 * * *",
    parameters={"sources": ["source_a", "source_b"], "target_base": "s3://warehouse/orders"},
    tags=["sales", "daily"],
    storage=storage,
    infrastructure=infra,
).apply()
```

### Prefect Config
```yaml
# prefect.yaml (CLI-based)
deployments:
  - name: orders-ingestion-prod
    entrypoint: flows/orders.py:orders_pipeline
    parameters: {sources: [source_a], target_base: "s3://warehouse/orders"}
    schedule:
      cron: "0 6 * * *"
      timezone: UTC
    tags: [sales, prod]
    work_pool:
      name: k8s-prod
      job_variables:
        image: myrepo/prefect:latest
        cpu: 2
        memory: 4Gi
```

## CI/CD Testing Patterns

```python
# test_dag.py (Airflow)
from airflow.models import DagBag
import pytest

@pytest.fixture
def dagbag():
    return DagBag(dag_folder='dags/', include_examples=False)

def test_dag_import(dagbag):
    assert len(dagbag.import_errors) == 0, f"Import errors: {dagbag.import_errors}"

def test_dag_structure(dagbag):
    for dag_id, dag in dagbag.dags.items():
        assert len(dag.tasks) > 0, f"DAG {dag_id} has no tasks"
        assert len(dag.tasks) <= 30, f"DAG {dag_id} has >30 tasks"

def test_task_retries(dagbag):
    for dag_id, dag in dagbag.dags.items():
        for task in dag.tasks:
            if hasattr(task, 'retries'):
                assert task.retries >= 2, f"{task.task_id} has <2 retries"

# test_gold_revenue.py (Dagster)
from dagster import build_asset_context
from dagster_aws.s3 import S3Resource
import pandas as pd

def test_daily_revenue():
    orders = pd.DataFrame({
        "order_date": ["2024-01-15", "2024-01-15", "2024-01-16"],
        "amount": [100.0, 200.0, 300.0],
    })
    result = daily_revenue(orders)
    assert result.iloc[0]["amount"] == 300.0
    assert result.iloc[1]["amount"] == 300.0

# test_orders_flow.py (Prefect)
import pytest
from prefect.testing.utilities import prefect_test_harness

def test_orders_pipeline():
    with prefect_test_harness():
        result = orders_pipeline(["test-source"], "/tmp/test-output")
        assert result is not None
```
