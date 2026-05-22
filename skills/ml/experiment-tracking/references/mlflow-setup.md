# MLflow Setup and Configuration

## Tracking Server

### Local SQLite
```bash
mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns --host 0.0.0.0 --port 5000
```

### PostgreSQL Production
```yaml
# docker-compose.yml
services:
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.8.0
    ports: ["5000:5000"]
    command: >
      mlflow server
      --backend-store-uri postgresql://mlflow:password@postgres/mlflow
      --default-artifact-root s3://mlflow-artifacts/
    depends_on: [postgres]
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: mlflow
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mlflow
```

### S3 Artifact Store
```python
import os
os.environ["MLFLOW_S3_ENDPOINT_URL"] = "https://s3.us-east-1.amazonaws.com"
os.environ["AWS_ACCESS_KEY_ID"] = "your-key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "your-secret"
mlflow.set_tracking_uri("http://mlflow-server:5000")
```

## Experiments and Runs

```python
import mlflow
from mlflow.tracking import MlflowClient

mlflow.set_experiment("recommendation-engine")

with mlflow.start_run(run_name="xgboost-v2") as run:
    mlflow.log_params({
        "model.type": "XGBoost",
        "model.max_depth": 6,
        "model.learning_rate": 0.01,
        "model.n_estimators": 500,
        "data.train_size": 100000,
        "training.random_seed": 42,
    })
    for epoch in range(10):
        mlflow.log_metrics({"train.loss": epoch * 0.1, "val.auc": 0.8 + epoch * 0.01}, step=epoch)
    mlflow.log_metrics({"test.auc": 0.892, "test.precision@10": 0.45})
    mlflow.set_tags({"git_branch": "feature/experiment-v2", "git_commit": "a1b2c3d"})

# Nested runs (parent + child trials)
with mlflow.start_run(run_name="hyperparameter-search") as parent:
    mlflow.log_param("strategy", "random-search")
    for trial in range(5):
        with mlflow.start_run(run_name=f"trial-{trial}", nested=True):
            mlflow.log_params({"lr": 0.01 * trial})
```

## Artifact Store

```python
from mlflow.models import infer_signature

signature = infer_signature(X_test, y_pred)
mlflow.xgboost.log_model(
    xgb_model, artifact_path="models/xgboost",
    signature=signature, registered_model_name="recommendation-xgb",
    pip_requirements=["xgboost==2.0.0", "pandas==2.1.0"],
)
mlflow.log_figure(plt.gcf(), "plots/confusion_matrix.png")
mlflow.log_artifact("configs/hyperparameters.yaml", artifact_path="configs")
```

## Model Registry

```python
client = MlflowClient()

# Register and promote
client.create_registered_model("recommendation-xgb")
client.create_model_version(name="recommendation-xgb", source=f"runs:/{run_id}/models/xgboost", run_id=run_id)

client.transition_model_version_stage(name="recommendation-xgb", version=5, stage="Staging")

# Auto-promote to production if metrics pass
latest = client.get_latest_versions("recommendation-xgb", stages=["Staging"])
if latest[0].metrics["test.auc"] > 0.88:
    client.transition_model_version_stage(
        name="recommendation-xgb", version=latest[0].version, stage="Production"
    )

# Load by stage
model = mlflow.xgboost.load_model("models:/recommendation-xgb/Production")
```

## MLflow Projects

```yaml
# MLproject
name: recommendation-engine
conda_env: conda.yaml
entry_points:
  main:
    parameters:
      learning_rate: { type: float, default: 0.01 }
      max_depth: { type: int, default: 6 }
    command: "python train.py --learning_rate {learning_rate} --max_depth {max_depth}"
```

```yaml
# conda.yaml
dependencies:
  - python=3.10
  - pip
  - pip:
    - mlflow>=2.8
    - xgboost>=2.0
    - pandas>=2.1
```

## References
- MLflow docs: https://mlflow.org/docs/latest/
- MLflow REST API: https://mlflow.org/docs/latest/rest-api.html
