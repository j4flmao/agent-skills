---
name: ml-experiment-tracking
description: >
  Use this skill when asked about MLflow, W&B, Neptune, DVC, experiment tracking, run logging, metric logging, artifact store, model registry, hyperparameter logging, or experiment comparison. This skill enforces: experiment tracking platform setup (MLflow, W&B, Neptune), run logging conventions (params, metrics, artifacts), model registry versioning with stage promotion, experiment comparison using parallel coordinates, and full reproducibility through code + data + environment tracking. Do NOT use for: model training itself, feature engineering pipelines, or production deployment.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, experiment, tracking, phase-11]
---

# ML Experiment Tracking

## Purpose
Track machine learning experiments with full reproducibility: log parameters, metrics, artifacts, and environment. Use the model registry to version, compare, and promote models through staging. Experiment tracking is the foundation of disciplined ML development — it transforms ad-hoc model building into a systematic, comparable, and repeatable process.

## Architecture/Decision Trees

### Platform Selection Decision Tree
```
Is your team size 1-3 data scientists working locally?
  |-- YES --> MLflow (local mode, simple setup)
  |-- NO --> Do you need rich collaboration features with non-ML stakeholders?
        |-- YES --> W&B (rich UI, reports, dashboards)
        |-- NO --> Do you have strict data sovereignty requirements?
              |-- YES --> MLflow (self-hosted, full control)
              |-- NO --> Do you need structured metadata with nested runs?
                    |-- YES --> Neptune (structured logging, comparison)
                    |-- NO --> MLflow (open standard, broad ecosystem)

Do you need experiment tracking for deep learning specifically?
  |-- YES --> W&B (tight PyTorch/HuggingFace integration) or Neptune
  |-- NO --> MLflow (sufficient for sklearn, XGBoost, lightGBM)

Do you need model registry with CI/CD integration?
  |-- YES --> MLflow Model Registry (stages, API, deployment)
  |-- NO --> Platform-specific registry is sufficient

Is cost a primary constraint?
  |-- YES --> MLflow (free, open-source), DVC (free, git-based)
  |-- NO --> W&B or Neptune (paid, more features)
```

### MLflow Tracking Server Deployment
```
Self-hosted MLflow
  ├── Local development → sqlite:///mlflow.db + local artifact dir
  ├── Team (on-premise) → PostgreSQL + S3/MinIO + Gunicorn
  │   Deployment: docker-compose with MLflow, Postgres, MinIO, Nginx
  │   Scaling: multi-worker Gunicorn (>4 workers for >5 team members)
  └── Enterprise → PostgreSQL (RDS/Aurora) + S3 + Load Balancer + ECS/K8s
      Auth: OAuth proxy (OAuth2 Proxy, Cloudflare Access)
      HA: Multi-AZ database, multi-replica MLflow, S3 replication
```

### Model Registry Stage Flow
```
Training → Register Model (None)
  → Validate → Transition to Staging
    → A/B Test → OK? → Transition to Production
      → Monitor → Degraded? → Transition to Archived → Retrain
    → FAIL → Transition to Archived → Debug and Retrain
```

## Agent Protocol

### Trigger
Exact user phrases: "experiment tracking", "MLflow", "WandB", "Weights and Biases", "Neptune", "DVC", "run logging", "metric logging", "artifact store", "model registry", "hyperparameter logging", "experiment comparison", "model versioning", "run comparison".

### Input Context
Before activating, verify:
- Experiment tracking platform (MLflow, W&B, Neptune) or greenfield
- ML framework (PyTorch, TensorFlow, scikit-learn, XGBoost)
- Team size and collaboration model
- Infrastructure (local, on-premise server, cloud-managed)
- Artifact storage requirements (model files, datasets, plots)
- Model registry needs (manual vs automated promotion)

### Output Artifact
Experiment tracking configuration with logging setup, artifact structure, and model registry workflow.

### Response Format
```python
# Experiment tracking setup
# Training loop with logging
# Model registry operations
```
```yaml
# MLflow tracking server config
# Artifact store configuration
# Model registry stage rules
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Experiment tracking platform selected and configured
- [ ] Run logging conventions established (params, metrics, tags)
- [ ] Artifact store configured with structure (models, plots, datasets)
- [ ] Model registry set up with versioning and stage promotion
- [ ] Reproducibility ensured (code version, data version, environment)
- [ ] Experiment comparison setup (parallel coordinates, scatter plots)
- [ ] Alerting or regression detection for metric degradation

### Max Response Length
300 lines of configuration and code.

## Workflow

### Step 1: Platform Selection
MLflow: open-source, self-hosted, language-agnostic, tracking + registry + projects + models. W&B: cloud-hosted, rich UI, collaboration, tight PyTorch/HuggingFace integration. Neptune: cloud-hosted, structured logging, rich comparison views. Local development: MLflow. Team collaboration: W&B or Neptune. Enterprise compliance: MLflow self-hosted on Kubernetes.

```yaml
tracking_uri: http://mlflow-server:5000
default_artifact_root: s3://mlflow-artifacts/
experiment_defaults:
  lifecycle_stage: active
  tags:
    team: ml-platform
    project: recommendation-engine
```

### Step 2: Run Logging Conventions
Structured parameter names: `model.learning_rate`, `model.architecture.n_layers`, `data.train_size`. Metric logging: log after every epoch and at the end. Use dictionary logging for grouped metrics. Tags for searchability: `status`, `dataset`, `model_type`, `git_branch`, `gpu_id`.

```python
import mlflow

mlflow.set_experiment("recommendation-v2")
with mlflow.start_run(run_name="xgboost-baseline") as run:
    mlflow.log_params({
        "model.type": "XGBoost",
        "model.n_estimators": 500,
        "model.max_depth": 8,
        "model.learning_rate": 0.05,
        "data.source": "s3://data/features/v3/",
        "data.n_samples": 150000,
        "data.n_features": 45,
    })
    for epoch in range(10):
        train_metric, val_metric = train_one_epoch()
        mlflow.log_metrics({
            "train/log_loss": train_metric,
            "val/log_loss": val_metric,
        }, step=epoch)
    mlflow.log_metrics({
        "val/auc": 0.89,
        "val/f1": 0.72,
        "val/precision": 0.74,
        "val/recall": 0.70,
    })
    mlflow.set_tags({
        "git_branch": "feature/ensemble-v2",
        "git_commit": "a1b2c3d",
        "dataset_version": "2025-03-15",
        "model_type": "gradient_boosting",
        "status": "completed",
    })
    mlflow.log_artifact("confusion_matrix.png")
    mlflow.log_artifact("feature_importance.png")
    mlflow.sklearn.log_model(model, "model")
```

### Step 3: Artifact Storage
Log model files with signature and conda/pip environment. Log plots as PNG/HTML. Log dataset samples and preprocessing config. Structure: `models/`, `plots/`, `data/`, `configs/`, `code/`.

```
artifacts/
├── models/
│   ├── model.pkl                    # Serialized model
│   ├── MLmodel                      # MLflow metadata
│   ├── conda.yaml                   # Conda environment
│   └── requirements.txt             # Pip requirements
├── plots/
│   ├── confusion_matrix.png
│   ├── learning_curves.png
│   ├── feature_importance.png
│   ├── roc_curve.png
│   └── calibration_curve.png
├── data/
│   ├── sample_predictions.csv
│   ├── train_sample.csv
│   └── data_profile.html
├── configs/
│   ├── preprocessing_config.yaml
│   ├── hyperparameters.json
│   └── data_schema.yaml
└── code/
    └── training_snapshot.py
```

### Step 4: Model Registry
Model versioning: each logged model creates a new version. Stage promotion: None -> Staging -> Production -> Archived. Transition rules: automated via metric thresholds, manual approval for production.

```python
# Register model with signature
from mlflow.models import infer_signature

signature = infer_signature(X_train, model.predict(X_train))
mlflow.sklearn.log_model(
    model,
    "model",
    signature=signature,
    input_example=X_train[:5],
    registered_model_name="recommendation_xgb",
)

# Programmatic stage transitions
from mlflow.tracking import MlflowClient

client = MlflowClient()
client.transition_model_version_stage(
    name="recommendation_xgb",
    version=3,
    stage="Staging",
)

# Query by stage
latest_staging = client.get_latest_versions("recommendation_xgb", stages=["Staging"])

# Archive old versions
client.transition_model_version_stage(
    name="recommendation_xgb",
    version=2,
    stage="Archived",
)
```

### Step 5: Experiment Comparison
Parallel coordinates: compare hyperparameters across runs. Scatter plots: metric vs metric. Table view: sortable columns for params and metrics. Regression detection: compare against baseline, alert on degradation.

```python
# Compare runs programmatically
import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient()
experiment = client.get_experiment_by_name("recommendation-v2")
runs = client.search_runs(
    experiment_ids=[experiment.experiment_id],
    filter_string="metrics.val_auc > 0.85",
    order_by=["metrics.val_auc DESC"],
    max_results=20,
)

for run in runs:
    print(f"Run: {run.info.run_name}, AUC: {run.data.metrics['val_auc']}")

# Load best model
best_run = runs[0]
best_model = mlflow.sklearn.load_model(f"runs:/{best_run.info.run_id}/model")
```

### Step 6: Reproducibility
Code: log git commit hash. Data: log dataset hash or DVC version. Environment: log conda/pip environment files. Random seeds: log and control all seeds. Source code: log snapshot of training script.

```python
import subprocess

def log_reproducibility_info():
    # Git commit
    git_hash = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip()
    mlflow.set_tag("git_commit", git_hash)

    # Git branch
    git_branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()
    mlflow.set_tag("git_branch", git_branch)

    # DVC data version
    try:
        dvc_hash = subprocess.check_output(["dvc", "status", "--sha"]).decode().strip()
        mlflow.set_tag("dvc_data_version", dvc_hash)
    except:
        pass

    # Random seed
    import random, torch, numpy as np
    SEED = 42
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    mlflow.log_param("seed", SEED)

# Snapshot training code
mlflow.log_artifact("train.py")
mlflow.log_artifact("requirements.txt")
```

### Step 7: W&B Deep Learning Integration
```python
import wandb

wandb.init(
    project="recommendation-dl",
    name="transformer-v1",
    config={
        "learning_rate": 1e-4,
        "batch_size": 64,
        "n_layers": 6,
        "n_heads": 8,
        "d_model": 256,
        "dropout": 0.1,
        "optimizer": "AdamW",
        "scheduler": "cosine",
        "dataset": "user_interactions_v3",
    },
)

config = wandb.config
model = TransformerModel(
    n_layers=config.n_layers,
    n_heads=config.n_heads,
    d_model=config.d_model,
    dropout=config.dropout,
)

wandb.watch(model, log_freq=100)

for epoch in range(50):
    train_loss = train_one_epoch(model, config.batch_size, config.learning_rate)
    val_loss, val_metrics = validate(model)

    wandb.log({
        "epoch": epoch,
        "train/loss": train_loss,
        "val/loss": val_loss,
        "val/auc": val_metrics["auc"],
        "val/ndcg@10": val_metrics["ndcg@10"],
        "learning_rate": optimizer.param_groups[0]["lr"],
    })

wandb.log_artifact("model.pt", type="model")
wandb.finish()
```

## Anti-Patterns

- **Missing data version**: A model without a data version reference cannot be reproduced.
- **Environment drift**: Pinning Python version but not package versions → unreproducible runs.
- **Inconsistent metric names**: Different team members use "val_accuracy" vs "validation_accuracy".
- **Forgetting to log test metrics**: Logging only training metrics → no overfitting detection.
- **Not setting random seeds**: Same parameters produce different results across runs.
- **Overwriting model registry versions**: Registry versions must be immutable; always create a new version.
- **Logging too many hyperparameters**: Log only what varies between runs, not every environment variable.
- **Not logging intermediate metrics**: Only logging final metrics loses learning curve data.
- **Coupled training and tracking code**: Use auto_logging (mlflow.autolog(), wandb.init(autolog=True)) instead.
- **No tag taxonomy**: Team members use different tag names, making search impossible.

## Production Considerations

### MLflow Server Sizing
```yaml
# docker-compose.yml for team MLflow
version: "3.8"
services:
  mlflow:
    image: mlflow
    build: .
    command: >
      mlflow server
      --host 0.0.0.0
      --port 5000
      --backend-store-uri postgresql://mlflow:password@postgres/mlflow
      --default-artifact-root s3://mlflow-artifacts/
      --workers 4
    ports:
      - "5000:5000"
    depends_on:
      - postgres
    environment:
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - MLFLOW_S3_ENDPOINT_URL=http://minio:9000

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mlflow
      POSTGRES_USER: mlflow
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
```

### Cost Optimization
- MLflow: self-hosted → infrastructure cost only (EC2/ECS + RDS)
- W&B: free tier for individuals, paid for teams (per seat pricing)
- Neptune: free tier (limited), paid for teams
- DVC: free (git-based, no server needed)
- Artifact storage: S3/GS lifecycle policies to archive old artifacts after 90 days
- Database cleanup: periodic deletion of old runs (>1 year) via MLflow API

### Monitoring
- Track experiment count per week as team velocity metric
- Monitor tracking server latency (p99 < 500ms for log calls)
- Alert on model registry promotion failures
- Track disk usage for artifact store; set lifecycle policies

## Rules
- Every run logs params, metrics, tags, and artifacts.
- Parameter names use dot notation for grouping (`model.lr`, `data.size`).
- Metrics logged per-epoch (step) and final.
- Model signature logged with every model artifact.
- Git commit hash always logged as a tag.
- Dataset hash or version always logged as a tag.
- Environment pinned at the package level.
- Model registry stages: None -> Staging -> Production -> Archived.
- Automated promotion only to Staging, manual approval for Production.
- Never delete runs — archive them instead.

## Best Practices
- Use consistent naming conventions for experiments and runs across the team.
- Log intermediate metrics during training, not just final values.
- Tag runs with meaningful attributes (dataset version, branch name, model architecture).
- Create dashboards for frequently compared experiments.
- Set up alerts for metric regression after each new run.
- Use auto-logging where available (mlflow.autolog(), wandb.init(autolog=True)).

## Common Pitfalls
- **Missing data version**: A model without a data version reference cannot be reproduced.
- **Environment drift**: Pinning Python version but not package versions leads to unreproducible runs.
- **Inconsistent metric names**: Different team members use different names for the same metric.
- **Forgetting to log test metrics**: Logging only training metrics makes it impossible to detect overfitting.
- **Not setting random seeds**: Without fixed seeds, the exact same parameters produce different results.
- **Overwriting model registry versions**: Registry versions must be immutable; always create a new version.

## Compared With
| Feature | MLflow | W&B | Neptune | DVC |
|---------|--------|-----|---------|-----|
| Self-hosted | Yes | Optional | No | Yes |
| Model Registry | Yes | Yes | Yes | Limited |
| Experiment Comparison | Basic | Rich | Rich | None |
| Nested Runs | No | Yes | Yes | No |
| Reports/Dashboards | Limited | Yes | Yes | No |
| Pipeline versioning | Projects | Limited | Limited | Full |
| Cost | Free | Freemium | Freemium | Free |

## Performance
- MLflow tracking server overhead: < 1ms per log call (local), 5-20ms (remote).
- Artifact storage: depends on network speed to artifact store.
- Parallel coordinates rendering: 500+ runs may cause lag in UI.
- Registry lookup: sub-second for stage-based queries, seconds for full history.

## Tooling/Methodology
- **MLflow**: Tracking Server, Model Registry, Projects, Models (serving).
- **W&B**: Experiments, Artifacts, Sweeps, Reports, Tables.
- **Neptune**: Runs, Metadata, Artifacts, Monitoring, Model Registry.
- **DVC**: Data versioning, pipeline versioning, experiment tracking (git-based).
- **Integration libraries**: PyTorch Lightning, HuggingFace Transformers, Keras, XGBoost.

## References
  - references/data-versioning.md — Data Versioning
  - references/experiment-collaboration.md — Experiment Collaboration
  - references/experiment-platforms.md — Experiment Tracking Platforms
  - references/experiment-tracking-advanced.md — Experiment Tracking Advanced Topics
  - references/experiment-tracking-fundamentals.md — Experiment Tracking Fundamentals
  - references/mlflow-setup.md — MLflow Setup and Configuration
  - references/experiment-tracking-tools.md — Experiment Tracking Tools
  - references/experiment-reproducibility.md — Experiment Reproducibility
## Handoff
`ml-classical-ml` for model training workflows. `ml-deep-learning` for deep learning experiment tracking.

## Architecture Decision Trees

### Tracking Platform Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Hosting | MLflow (self-hosted, open source) | Weights & Biases (SaaS) | Data privacy, team size, budget |
| Integration depth | Lightweight (log params + metrics) | Full pipeline (data + model registry) | MLOps maturity, regulatory needs |
| Artifact storage | Local filesystem (simple) | S3/GCS (scalable, shareable) | Team distribution, data size |

### Logging Granularity
- Rapid iteration → Log only final metrics per run
- Research/debugging → Log per-epoch metrics and gradients
- Production → Log per-batch metrics, system resources, predictions
- Compliance → Log all of the above with full data lineage

## Implementation Patterns

### MLflow Experiment Tracking
`python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestRegressor

mlflow.set_experiment("house_price_prediction")

with mlflow.start_run(run_name="rf_v3") as run:
    params = {
        "n_estimators": 200,
        "max_depth": 15,
        "min_samples_split": 5,
        "random_state": 42
    }
    mlflow.log_params(params)

    model = RandomForestRegressor(**params)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    mlflow.log_metrics({"mse": mse, "r2": r2})
    mlflow.log_artifact("feature_importance.png")
    mlflow.sklearn.log_model(model, "model")

    print(f"Run ID: {run.info.run_id}")
`

### Hyperparameter Sweep with MLflow
`python
import optuna
import mlflow

def objective(trial):
    params = {
        "learning_rate": trial.suggest_float("lr", 1e-4, 1e-1, log=True),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0)
    }
    with mlflow.start_run(nested=True):
        mlflow.log_params(params)
        score = train_and_evaluate(params)
        mlflow.log_metric("val_score", score)
    return score

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)
`

## Performance Optimization

### Storage Efficiency
- **Artifact pruning**: Delete failed/aborted runs artifacts after 30 days. Keep only best run per parameter combination.
- **Metric aggregation**: Log aggregated metrics (epoch-level) instead of per-batch for long runs. Sample per-batch metrics at intervals.
- **Compression**: Compress logged artifacts (Parquet over CSV, gzip over plain). Use lossless compression for metrics parquet files.

### Query Performance
- **Tag-based filtering**: Tag runs with meaningful labels (dataset version, branch name). Use tags for efficient filtering in UI.
- **Metric indexing**: Log commonly queried metrics as top-level keys. Avoid nested structures for frequently compared metrics.
- **Separation of environments**: Separate dev/test/prod experiments into different experiments. Archive experiments older than 6 months.

## Security Considerations

### Access Control
- **Run visibility**: Restrict experiment access by team/project. Use MLflow's permission model or reverse proxy auth.
- **Artifact encryption**: Encrypt artifacts at rest in blob storage. Use server-side encryption with KMS.
- **API tokens**: Use service accounts for CI/CD experiment tracking. Rotate tokens quarterly.

### Data Governance
- **Dataset versioning**: Log dataset hash/version with every run. Enable reproducibility and audit trail.
- **PII in logs**: Never log raw data containing PII. Log aggregated statistics only, use anonymized sample data.
- **Retention policy**: Define data retention policy for experiments. Auto-delete artifacts after compliance period expires.
