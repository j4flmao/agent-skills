# Feast Setup Guide

Open-source feature store for ML feature management: central registry, offline serving (training), online serving (inference), point-in-time correctness.

## Architecture
```
Feature Repo (definitions.yaml)
    │
    ▼ Feast Server (gRPC/HTTP) → Registry (SQLite/GCS/S3)
    │
    ├── Offline Store (BigQuery/Redshift/Snowflake) → Training datasets
    └── Online Store (Redis/DynamoDB) → Real-time inference
```

## Installation
```bash
pip install feast feast-redis feast-gcp feast-aws
feast init my_feature_repo
cd my_feature_repo
```

## Configuration
```yaml
# feature_store.yaml
project: ml_features
provider: gcp
registry:
  path: gs://ml-feature-registry/registry.db
  cache_ttl_seconds: 3600
online_store:
  type: redis
  connection_string: redis://redis-feast:6379
  key_ttl_seconds: 86400
offline_store:
  type: bigquery
  dataset: feast_offline
```

## Feature Definitions
```python
from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int32, String, Bool

user = Entity(name="user_id", value_type=ValueType.INT64, description="Customer")

user_batch = FeatureView(
    name="user_batch_features",
    entities=["user_id"],
    ttl=timedelta(days=30),
    schema=[
        Field(name="user_id", dtype=Int32),
        Field(name="total_orders_30d", dtype=Int32),
        Field(name="avg_order_value_30d", dtype=Float32),
        Field(name="days_since_last_order", dtype=Int32),
        Field(name="customer_tenure_days", dtype=Int32),
        Field(name="is_active_7d", dtype=Bool),
        Field(name="preferred_category", dtype=String),
    ],
    source=FileSource(
        path="gs://ml-features/user_batch/*.parquet",
        timestamp_field="event_timestamp",
    ),
)
```

## Registry Operations
```bash
feast apply                       # Register all features
feast feature-views list           # List registered views
feast entities list                # List entities
feast materialize-incremental "2026-05-23T00:00:00"  # Push to online store
```

## Materialization (Airflow DAG)
```python
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG('feast_materialize', schedule='0 6 * * *', catchup=False) as dag:
    BashOperator(task_id='materialize', bash_command='feast materialize-incremental "$(date -u +%%Y-%%m-%%dT00:00:00)"', cwd='/repo')
```

## Offline Serving (Training)
```python
import pandas as pd
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")
entity_df = pd.DataFrame.from_dict({
    "user_id": [1001, 1002, 1003],
    "event_timestamp": ["2026-05-01 12:00:00"] * 3,
})

training_data = store.get_historical_features(
    entity_df=entity_df,
    features=["user_batch_features:total_orders_30d",
              "user_batch_features:avg_order_value_30d",
              "user_batch_features:days_since_last_order"],
).to_df()
```

## Online Serving (Inference)
```python
from feast import FeatureStore
store = FeatureStore(repo_path="./feature_repo")

def get_features(user_ids):
    return store.get_online_features(
        features=["user_batch_features:total_orders_30d",
                  "user_batch_features:avg_order_value_30d"],
        entity_rows=[{"user_id": uid} for uid in user_ids],
    ).to_dict()

# FastAPI endpoint
@app.post("/features")
async def serve(request):
    return {"features": get_features(request["user_ids"])}
```

## Docker Deployment
```yaml
version: '3.8'
services:
  feast-server:
    image: feastdev/feature-server:0.38
    ports: ["6566:6566"]
    volumes: ["./feature_repo:/etc/feast"]
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
  feast-ui:
    image: feastdev/feast-ui:0.38
    ports: ["8888:80"]
    environment: [FEAST_UI_REGISTRY_URL=gs://ml-feature-registry/registry.db]
```

## Troubleshooting
- Registry not found: ensure `registry.path` accessible from all components
- Online store timeout: check Redis connectivity
- Point-in-time mismatch: verify `event_timestamp` column in source data
- Slow materialization: batch smaller windows, increase parallelism
- After adding features: always run `feast apply`
