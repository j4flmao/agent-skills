# Dagster Deep Guide

## Core Concepts

### Software-Defined Assets (SDAs)
SDAs explicitly define what assets (tables, files, ML models) a pipeline produces, rather than just the tasks that run. This makes data dependencies explicit.

```python
from dagster import asset, AssetOut, AssetsDefinition, multi_asset
import pandas as pd

@asset(key_prefix=["bronze"])
def raw_orders() -> pd.DataFrame:
    """Raw orders ingested from source system."""
    return pd.read_csv("s3://data-lake/landing/orders.csv")

@asset(key_prefix=["silver"], deps=[raw_orders])
def cleaned_orders() -> pd.DataFrame:
    """Orders with nulls removed and types validated."""
    orders = raw_orders()  # Dagster knows this is a dependency
    return orders.dropna(subset=["order_id", "amount"])
```

### Auto-Materialization
Dagster automatically runs assets when freshness policies are violated or upstream dependencies change:
```python
from dagster import FreshnessPolicy, AutoMaterializePolicy

@asset(
    freshness_policy=FreshnessPolicy(maximum_lag_minutes=60),
    auto_materialize_policy=AutoMaterializePolicy.eager(),
    key_prefix=["gold"]
)
def daily_revenue(silver__cleaned_orders: pd.DataFrame) -> pd.DataFrame:
    return silver__cleaned_orders.groupby("order_date").agg({"amount": "sum"})
```

### Asset Sensors
Trigger runs when upstream data or external events change:
```python
from dagster import AssetKey, asset_sensor, RunRequest, SensorEvaluationContext

@asset_sensor(asset_key=AssetKey(["bronze", "raw_orders"]))
def new_orders_sensor(context: SensorEvaluationContext, asset_event):
    yield RunRequest(
        run_key=context.cursor,
        asset_selection=[AssetKey(["silver", "cleaned_orders"])]
    )
```

## dbt Integration

Dagster's dbt integration loads dbt models as Dagster assets with full lineage:

```python
from dagster_dbt import DbtCliResource, dbt_assets
from pathlib import Path

@dbt_assets(manifest=Path("target/manifest.json"))
def my_dbt_assets(context, dbt: DbtCliResource):
    yield from dbt.cli(["build"], context=context).stream()

defs = Definitions(
    assets=[my_dbt_assets],
    resources={"dbt": DbtCliResource(project_dir="/path/to/dbt")},
)
```

Each dbt model becomes a Dagster asset with:
- Column-level lineage visible in the UI
- dbt test results shown as asset checks
- Freshness policies evaluated automatically

### Asset Checks (Data Quality)
```python
from dagster import asset_check, AssetCheckResult

@asset_check(asset=cleaned_orders)
def orders_have_valid_amounts():
    orders = cleaned_orders()
    invalid = orders[orders["amount"] <= 0]
    return AssetCheckResult(
        passed=len(invalid) == 0,
        metadata={"invalid_rows": len(invalid)}
    )
```

## Multi-Environment with Code Locations

```python
# definitions.py
defs = Definitions.merge(
    Definitions(
        assets=[raw_orders],
        resources={"io_manager": S3PickleIOManager(bucket="dev-bucket")},
    ),
    Definitions(
        assets=[cleaned_orders, daily_revenue],
        resources={"io_manager": S3PickleIOManager(bucket="prod-bucket")},
    ),
)
```

Code locations allow deploying multiple repositories to the same Dagster instance:
```yaml
# dagster.yaml
code_locations:
  - python_file: etl/definitions.py
    location_name: etl-pipelines
  - python_file: ml/definitions.py
    location_name: ml-pipelines
```

## Performance Patterns

- **I/O Managers**: control where asset data is stored (S3, GCS, DB, local) — one per environment
- **Partitioned assets**: use `@asset(partitions_def=...)` for time-partitioned pipelines
- **Backfills**: Dagster can backfill individual partitions without reprocessing the entire dataset
- **Concurrency**: default per-asset, configurable per-code-location via `DagsterInstance`
