# ML Experiment Tracking

## MLflow

### Setup

```bash
# Install
pip install mlflow

# Start tracking server
mlflow server \
  --backend-store-uri postgresql://user:pass@host/mlflow \
  --default-artifact-root s3://mlflow-artifacts/ \
  --host 0.0.0.0 \
  --port 5000
```

### Experiment Tracking

```python
import mlflow

mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("recommendation-model")

with mlflow.start_run(run_name="v2-2024-01-15"):
    # Log parameters
    mlflow.log_param("learning_rate", 0.001)
    mlflow.log_param("embedding_dim", 128)
    mlflow.log_param("num_layers", 4)

    # Log metrics
    for epoch in range(20):
        train_loss = train_step()
        val_loss = validate()
        mlflow.log_metric("train_loss", train_loss, step=epoch)
        mlflow.log_metric("val_loss", val_loss, step=epoch)

    # Log model
    mlflow.pytorch.log_model(model, artifact_path="model")

    # Log artifacts
    mlflow.log_artifact("config.yaml")
    mlflow.log_artifact("feature_importance.png")
```

### Model Registry

```python
# Register model from run
mlflow.register_model(
    model_uri="runs:/<run-id>/model",
    name="recommendation-model"
)

# Transition stage
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name="recommendation-model",
    version=3,
    stage="Production"
)
```

## Experiment Organization

| Schema | Structure | Best For |
|--------|-----------|----------|
| By project | `experiment-name` / `<project>` | Small teams, few projects |
| By team | `<team>/<project>` | Medium teams |
| By model | `<model-type>/<dataset>` | Multiple models per dataset |
| By environment | `<env>_<model>` | Clear stage progression |

## Artifact Storage

| Backend | Pros | Cons |
|---------|------|------|
| Local filesystem | Simple, no infra | Not shared across team |
| S3 / GCS / Azure Blob | Scalable, shared, cheap | Network overhead |
| NFS | Shared, low latency | Scaling limits |
| DBFS | Databricks-native | Tied to Databricks |

## Comparison with Alternatives

| Tool | Strengths | Weaknesses |
|------|-----------|------------|
| MLflow | Lightweight, wide framework support, model registry | Limited pipeline orchestration |
| Weights & Biases | Rich UI, collaboration, report generation | Vendor lock-in, cost at scale |
| Neptune | Metadata store, comparison UI | Cost for large teams |
| DVC | Git-based, data versioning, pipelines | Not real-time tracking |
| SageMaker Experiments | AWS-native, deep integration | AWS lock-in |

## CI/CD for Experiments

```yaml
# GitHub Actions — track every commit
name: Train and Track
on:
  push:
    branches: [main]
    paths: ['models/**']

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
    - name: Train model
      run: |
        mlflow run . \
          --experiment-name "ci-training" \
          --env-manager local
    - name: Compare with production
      run: |
        python scripts/compare_metrics.py \
          --production "prod-model" \
          --candidate "$(mlflow.latest_run_id)"
```
