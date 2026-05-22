---
name: ml-experiment-tracking
description: >
  Use this skill when asked about MLflow, W&B, Neptune, DVC, experiment tracking, run logging, metric logging, artifact store, model registry, hyperparameter logging, or experiment comparison. This skill enforces: experiment tracking platform setup (MLflow, W&B, Neptune), run logging conventions (params, metrics, artifacts), model registry versioning with stage promotion, experiment comparison using parallel coordinates, and full reproducibility through code + data + environment tracking. Do NOT use for: model training itself, feature engineering pipelines, or production deployment.
version: "1.0.0"
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
Track machine learning experiments with full reproducibility: log parameters, metrics, artifacts, and environment. Use the model registry to version, compare, and promote models through staging.

## Agent Protocol

### Trigger
Exact user phrases: "experiment tracking", "MLflow", "WandB", "Weights and Biases", "Neptune", "DVC", "run logging", "metric logging", "artifact store", "model registry", "hyperparameter logging", "experiment comparison", "model versioning", "run comparison".

### Input Context
Before activating, verify:
- Experiment tracking platform (MLflow, W&B, Neptune) or greenfield
- ML framework (PyTorch, TensorFlow, scikit-learn, XGBoost)
- Team size and collaboration model (single data scientist, team, org)
- Infrastructure (local, on-premise server, cloud-managed)
- Artifact storage requirements (model files, datasets, plots)
- Model registry needs (manual vs automated promotion)

### Output Artifact
Experiment tracking configuration with logging setup, artifact structure, and model registry workflow as YAML and Python.

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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
MLflow: open-source, self-hosted, language-agnostic (Python, R, Java, REST), tracking server + registry + projects + models. W&B: cloud-hosted (or self-hosted), rich UI, collaboration features, tight PyTorch/HuggingFace integration, reporting and dashboards. Neptune: cloud-hosted, structured logging, metadata organization, rich comparison views. Local development: MLflow for simplicity. Team collaboration: W&B or Neptune for UI. Enterprise compliance: MLflow self-hosted on Kubernetes.

```yaml
# MLflow tracking server configuration
tracking_uri: http://mlflow-server:5000
default_artifact_root: s3://mlflow-artifacts/
experiment_defaults:
  lifecycle_stage: active
  tags:
    team: ml-platform
    project: recommendation-engine
```

### Step 2: Run Logging Conventions
Structured parameter names: `model.learning_rate`, `model.architecture.n_layers`, `data.train_size`. Metric logging: log after every epoch (step-based) and at the end (final). Use dictionary logging for grouped metrics. Tags for searchability: `status`, `dataset`, `model_type`, `git_branch`, `gpu_id`. Automated logging: MLflow autolog for scikit-learn/XGBoost/PyTorch.

```python
import mlflow
from mlflow.models import infer_signature

mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("recommendation-engine")

with mlflow.start_run(run_name="xgboost-v2") as run:
    # Parameters
    mlflow.log_params({
        "model.type": "XGBoost",
        "model.max_depth": 6,
        "model.learning_rate": 0.01,
        "model.n_estimators": 500,
        "model.subsample": 0.8,
        "data.train_size": 100000,
        "data.features": ["user_emb", "item_emb", "context_features"],
        "data.validation_split": 0.2,
        "training.random_seed": 42,
    })

    # Metrics (per epoch)
    for epoch in range(10):
        train_loss, val_loss = train_one_epoch()
        mlflow.log_metrics({
            "train.loss": train_loss,
            "val.loss": val_loss,
            "val.auc": compute_auc(val_loss),
        }, step=epoch)

    # Final metrics
    mlflow.log_metrics({
        "test.auc": 0.892,
        "test.precision@10": 0.45,
        "test.recall@10": 0.38,
        "test.accuracy": 0.85,
    })

    # Tags
    mlflow.set_tags({
        "git_branch": "feature/experiment-v2",
        "git_commit": "a1b2c3d",
        "dataset_hash": "sha256:abc123",
        "gpu_type": "A100-80GB",
        "status": "completed",
    })
```

### Step 3: Artifact Storage
Log model files with signature (input/output schema) and conda/pip environment. Log plots and visualizations as PNG/HTML artifacts. Log dataset samples and preprocessing config. Log source code snapshot for reproducibility. Structure: `models/`, `plots/`, `data/`, `configs/`, `code/`.

```python
# Log model with signature and environment
signature = infer_signature(X_test, y_pred)
mlflow.xgboost.log_model(
    xgb_model,
    artifact_path="models/xgboost",
    signature=signature,
    registered_model_name="recommendation-xgb",
    pip_requirements=["xgboost==2.0.0", "pandas==2.1.0"],
)

# Log plots
plt.figure()
plot_confusion_matrix(y_test, y_pred)
mlflow.log_figure(plt.gcf(), "plots/confusion_matrix.png")

# Log arbitrary files
mlflow.log_artifact("configs/hyperparameters.yaml", artifact_path="configs")
mlflow.log_artifact("data/validation_samples.csv", artifact_path="data")
```

### Step 4: Model Registry
Model versioning: each logged model creates a new version. Stage promotion: None -> Staging -> Production -> Archived. Transition rules: automated via metric thresholds, manual approval for production. Model lineage: link to source run, dataset version, training code. Deployment: fetch model by stage, not by version.

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register model version
client.create_registered_model("recommendation-xgb")
client.create_model_version(
    name="recommendation-xgb",
    source=f"runs:/{run_id}/models/xgboost",
    run_id=run_id,
    description="XGBoost v2 with feature engineering v3"
)

# Promote to staging
client.transition_model_version_stage(
    name="recommendation-xgb",
    version=5,
    stage="Staging",
    archive_existing_versions=True
)

# Promote to production (requires metrics check)
latest_staging = client.get_latest_versions("recommendation-xgb", stages=["Staging"])
if latest_staging[0].metrics["test.auc"] > 0.88:
    client.transition_model_version_stage(
        name="recommendation-xgb",
        version=latest_staging[0].version,
        stage="Production"
    )

# Production deployment fetches by stage
model = mlflow.xgboost.load_model("models:/recommendation-xgb/Production")
```

### Step 5: Experiment Comparison
Parallel coordinates: compare hyperparameters across runs to find correlations. Scatter plots: metric vs metric (e.g., latency vs accuracy). Table view: sortable columns for all params and metrics. Regression detection: compare new run metrics against baseline, alert on degradation. Custom dashboards: pin important runs and visualizations.

```python
# Programmatic comparison of experiments
from mlflow.tracking import MlflowClient

client = MlflowClient()
runs = client.search_runs(
    experiment_ids=["1"],
    filter_string="metrics.test.auc > 0.85",
    order_by=["metrics.test.auc DESC"],
    max_results=10
)

for run in runs:
    print(f"Run {run.info.run_name}: AUC={run.data.metrics['test.auc']:.4f}, "
          f"depth={run.data.params['model.max_depth']}, "
          f"lr={run.data.params['model.learning_rate']}")
```

### Step 6: Reproducibility
Code: log git commit hash. Data: log dataset hash or DVC version. Environment: log conda/pip environment files. Random seeds: log and control all seeds (Python, NumPy, PyTorch, Python hash). Source code: log snapshot of training script. Deterministic algorithms: enable deterministic flags for GPU training.

```yaml
# reproducibility checklist
git_commit: a1b2c3d4e5f6  # logged as tag
dataset:
  source: s3://datasets/users-v3.parquet
  hash: sha256:abc123def456
  row_count: 2500000
features:
  config_hash: sha256:789abc
  engineered_count: 45
environment:
  python: "3.10.12"
  cuda: "12.1"
  mlflow: "2.8.0"
  xgboost: "2.0.0"
random_seeds:
  python: 42
  numpy: 42
  pytorch: 42
```

## Rules
- Every run logs params, metrics, tags, and artifacts
- Parameter names use dot notation for grouping (`model.lr`, `data.size`)
- Metrics logged per-epoch (step) and final
- Model signature logged with every model artifact
- Git commit hash always logged as a tag
- Dataset hash or version always logged as a tag
- Environment pinned at the package level (not just Python version)
- Model registry stages: None -> Staging -> Production -> Archived
- Automated promotion only to Staging, manual approval for Production
- Never delete runs — archive them instead

## References
- `references/mlflow-setup.md` — MLflow tracking server, experiment/run, artifact store, model registry, stage promotion, projects
- `references/experiment-platforms.md` — W&B, Neptune comparison, metric logging, artifact tracking, collaboration, reporting

## Handoff
`ml-classical-ml` for model training workflows
`ml-deep-learning` for deep learning experiment tracking
