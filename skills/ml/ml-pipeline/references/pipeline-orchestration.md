# ML Pipeline Orchestration

## Workflow Orchestrators

| Tool | Type | DAG | ML Natives | Scaling |
|------|------|-----|------------|---------|
| Airflow | Batch | Yes | Limited | Celery/K8s Executor |
| Prefect | Batch/Event | Yes | Medium | K8s, serverless |
| Dagster | Batch/Asset | Yes | High (assets) | K8s |
| Metaflow | Batch | Yes | Very High (step functions) | AWS Batch, K8s |
| Kubeflow Pipelines | K8s-native | Yes | High | K8s |
| Flyte | K8s-native | Yes | Very High | K8s, Spark |
| ZenML | Orchestrator-agnostic | Yes | High | Multiple backends |

```python
# Dagster ML pipeline with software-defined assets
from dagster import asset, AssetExecutionContext, MaterializeResult
import pandas as pd

@asset
def raw_data() -> pd.DataFrame:
    return load_from_source("s3://data/raw/orders.parquet")

@asset
def features(context: AssetExecutionContext, raw_data: pd.DataFrame) -> pd.DataFrame:
    context.log.info(f"Processing {len(raw_data)} rows")
    features = compute_features(raw_data)
    return features

@asset
def model(context: AssetExecutionContext, features: pd.DataFrame):
    X, y = split(features)
    model = train_model(X, y)
    save_model(model, "s3://models/prod/model.pkl")
    return MaterializeResult(metadata={"accuracy": model.score(X, y)})
```

## DAG Design

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Linear | Sequential steps | Simple training pipeline |
| Branch | Parallel processing | Feature engineering for multiple groups |
| Conditional | Dynamic routing based on data | Quality gate pass/fail |
| Loop | Iterative processing | Active learning, retraining loop |
| Fan-in/Fan-out | Parallel + merge | Distributed training |

```python
# Prefect ML pipeline
from prefect import flow, task
from prefect.tasks import task_input_hash

@task(cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=1))
def extract_data(source: str) -> pd.DataFrame:
    return pd.read_parquet(source)

@task
def validate_data(df: pd.DataFrame) -> bool:
    checks = [
        len(df) > 0,
        df.isnull().sum().sum() < 100,
        df['label'].std() > 0,
    ]
    return all(checks)

@task
def train_model(X, y) -> float:
    model = RandomForestClassifier()
    score = cross_val_score(model, X, y, cv=3).mean()
    return score

@flow(retries=2, retry_delay_seconds=300)
def ml_pipeline(source: str):
    data = extract_data(source)
    if not validate_data(data):
        raise ValueError("Data quality checks failed")
    X, y = prepare_features(data)
    accuracy = train_model(X, y)
    log_metric("accuracy", accuracy)
```

## Failure Recovery

| Strategy | When | Implementation |
|----------|------|----------------|
| Retry with backoff | Transient errors | `@task(retries=3, retry_delay=60)` |
| Checkpoint restart | Long-running tasks | Save partial results to S3 |
| Idempotent tasks | Any task | Same input = same output |
| Downstream skip | Non-critical failures | Conditional DAG edges |
| Alert and halt | Data quality issues | Validation gates |

## Metadata Tracking

```python
# Dagster run metadata
@asset
def training_data(context, raw: pd.DataFrame):
    context.add_output_metadata({
        "row_count": len(raw),
        "columns": list(raw.columns),
        "source": "s3://data/raw/orders.parquet",
        "dagster/row_count": len(raw),  # Auto-indexed
    })
    return preprocess(raw)
```
