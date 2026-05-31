# Experiment Tracking Tools

## Overview

Experiment tracking tools form the backbone of reproducible ML development. They record what was tried, with what parameters, on what data, and with what results. This reference provides a comprehensive comparison of the major experiment tracking platforms — MLflow, Weights & Biases, Neptune, DVC, and others — covering setup, configuration, integration patterns, migration, and advanced usage for each.

## Platform Comparison Matrix

| Feature | MLflow | Weights & Biases | Neptune | DVC | Comet | SageMaker Experiments |
|---------|--------|------------------|---------|-----|-------|----------------------|
| Open source | Yes | Client only | Client only | Yes | Client only | No |
| Self-hosted | Yes | Optional | No | Yes | No | No |
| Cloud-managed | Databricks | Yes | Yes | No | Yes | Yes |
| Experiment tracking | Yes | Yes | Yes | Yes | Yes | Yes |
| Model registry | Yes | Yes | Yes | Limited | Yes | Yes |
| Artifact store | Yes | Yes | Yes | Yes | Yes | Yes |
| Hyperparameter sweeps | Limited | Yes | Yes | No | Yes | Yes |
| Pipeline tracking | Limited | Limited | Limited | Yes | No | Yes |
| Nested runs | No | Yes | Yes | No | Yes | Yes |
| Collaboration features | Limited | Rich | Rich | Limited | Rich | Team-only |
| Reporting/dashboards | Limited | Rich | Rich | No | Rich | Limited |
| Cost | Free | Freemium | Freemium | Free | Freemium | Pay-per-use |
| Community size | Large | Large | Medium | Large | Medium | AWS ecosystem |
| Framework integrations | Many | Many | Many | Limited | Many | AWS-focused |

## MLflow (Open Standard)

### Architecture

MLflow has four components that can be deployed together or independently:

```
┌──────────────────────────────────────────────────────────────┐
│                      MLflow Platform                          │
├──────────────┬───────────┬──────────────────┬────────────────┤
│  Tracking    │  Projects │   Models         │   Registry     │
│  Server      │  (CLI)    │   (Serving)      │   (API/UI)     │
├──────────────┼───────────┼──────────────────┼────────────────┤
│  - Log params│ - Package │ - Package model  │ - Register     │
│  - Log       │   ML code │   for deployment │   model        │
│    metrics   │   as      │ - Run as REST    │ - Stage        │
│  - Log       │   reusable│   endpoint       │   promotion    │
│    artifacts │   project │ - Docker/MLflow  │ - Versioning   │
│  - Compare   │           │   Serving        │ - Deployment   │
│    runs      │           │                  │                │
└──────────────┴───────────┴──────────────────┴────────────────┘
```

### Deployment Options

```yaml
deployment_options:
  local_file_store:
    description: "Single user, local development"
    tracking_uri: "./mlruns"
    artifact_root: "./mlartifacts"
    pros:
      - "Zero infrastructure setup"
      - "Good for personal exploration"
    cons:
      - "Cannot share runs with team"
      - "No model registry (needs SQL backend)"

  sqlite_file_store:
    description: "Small team, local SQL backend"
    tracking_uri: "sqlite:///mlflow.db"
    artifact_root: "./mlartifacts"
    pros:
      - "Model registry enabled"
      - "Simple setup"
    cons:
      - "SQLite concurrency limited"
      - "Not suitable for > 5 concurrent users"

  postgresql_remote:
    description: "Production deployment, multi-user"
    tracking_uri: "postgresql://user:pass@host:5432/mlflow"
    artifact_root: "s3://mlflow-artifacts/"
    pros:
      - "Concurrent access"
      - "Scalable to hundreds of users"
      - "Full model registry"
    cons:
      - "Requires PostgreSQL and S3 administration"
      - "Network latency for log calls"

  kubernetes_deployment:
    description: "Enterprise, high availability"
    tracking_uri: "http://mlflow-tracking-service:5000"
    artifact_root: "s3://mlflow-artifacts-prod/"
    execution:
      image: "ghcr.io/mlflow/mlflow:v2.10.0"
      command: >
        mlflow server
        --backend-store-uri postgresql://...
        --default-artifact-root s3://...
        --host 0.0.0.0
    pros:
      - "High availability, auto-scaling"
      - "Easy to manage with Helm chart"
    cons:
      - "Kubernetes expertise required"
      - "Higher operational cost"
```

### Advanced MLflow Configuration

```python
# advanced_mlflow_setup.py
import mlflow
from mlflow.tracking import MlflowClient
from mlflow.models import infer_signature
from mlflow.exceptions import MlflowException

class MLflowExperimentManager:
    def __init__(self, tracking_uri: str, experiment_name: str):
        mlflow.set_tracking_uri(tracking_uri)
        self.client = MlflowClient()

        # Create experiment if it does not exist
        try:
            self.experiment_id = mlflow.create_experiment(
                experiment_name,
                artifact_location=f"s3://mlflow-artifacts/{experiment_name}",
                tags={"team": "ml-platform", "project_type": "classification"},
            )
        except MlflowException:
            self.experiment_id = mlflow.get_experiment_by_name(
                experiment_name
            ).experiment_id

        mlflow.set_experiment(experiment_name)

    def create_run_with_tags(self, run_name: str, tags: dict[str, str]):
        run = self.client.create_run(
            self.experiment_id,
            run_name=run_name,
            tags=tags,
        )
        return run.info.run_id

    def log_model_with_lineage(self, model, run_id: str, model_name: str,
                                X_test, artifact_path: str = "model"):
        # Infer model signature
        predictions = model.predict(X_test[:5])
        signature = infer_signature(X_test[:5], predictions[:5])

        with mlflow.start_run(run_id=run_id):
            mlflow.sklearn.log_model(
                sk_model=model,
                artifact_path=artifact_path,
                signature=signature,
                registered_model_name=model_name,
                pip_requirements=[
                    "scikit-learn==1.4.0",
                    "pandas==2.1.4",
                    "numpy==1.26.0",
                ],
                extra_pip_requirements=["mlflow==2.10.0"],
            )

    def search_best_runs(self, experiment_name: str, metric: str,
                          max_results: int = 10) -> list[dict]:
        experiment = mlflow.get_experiment_by_name(experiment_name)
        runs = self.client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=[f"metrics.{metric} DESC"],
            max_results=max_results,
        )
        return [
            {
                'run_id': run.info.run_id,
                'run_name': run.info.run_name,
                'params': run.data.params,
                'metrics': run.data.metrics,
                'tags': run.data.tags,
            }
            for run in runs
        ]
```

## Weights & Biases (Collaboration-First)

### W&B Setup and Configuration

```python
# wandb_setup.py
import wandb
import yaml

# Initialize W&B configuration
wandb_config = {
    'project': 'recommendation-engine',
    'entity': 'your-team',
    'api_key': os.environ.get('WANDB_API_KEY'),
}

# Initialize run
run = wandb.init(
    project='recommendation-engine',
    config={
        'model': {
            'type': 'xgboost',
            'max_depth': 8,
            'learning_rate': 0.01,
            'n_estimators': 1000,
        },
        'data': {
            'train_size': 100000,
            'validation_split': 0.2,
            'features': ['user_emb', 'item_emb', 'context'],
        },
        'training': {
            'random_seed': 42,
            'early_stopping_rounds': 50,
        },
    },
    tags=['baseline', 'xgboost', 'feature_engineering_v3'],
    notes='Baseline XGBoost model with feature engineering v3',
)

# Log metrics during training
for epoch in range(10):
    train_metrics = {'train/loss': 0.5 - epoch * 0.05, 'train/accuracy': 0.7 + epoch * 0.03}
    val_metrics = {'val/loss': 0.55 - epoch * 0.04, 'val/accuracy': 0.68 + epoch * 0.025}

    wandb.log({**train_metrics, **val_metrics, 'epoch': epoch})

# Log model artifact
artifact = wandb.Artifact('recommendation-model', type='model')
artifact.add_file('model.xgb')
artifact.add_file('feature_importance.png')
wandb.log_artifact(artifact)

# Log tables for analysis
wandb.log({
    'predictions': wandb.Table(
        dataframe=pd.DataFrame({
            'actual': y_test,
            'predicted': y_pred,
            'confidence': confidence_scores,
        })
    )
})

# Log media
wandb.log({
    'confusion_matrix': wandb.plot.confusion_matrix(
        y_true=y_test, preds=y_pred, class_names=['class_0', 'class_1']
    ),
    'feature_importance': wandb.plot.bar(
        wandb.Table(
            dataframe=pd.DataFrame({
                'feature': feature_names,
                'importance': model.feature_importances_,
            })
        ), 'feature', 'importance', title='Feature Importance'
    ),
})

# Log dataset version
wandb.log({'dataset_version': 'v3', 'dataset_hash': 'sha256:abc123'})

run.finish()
```

### W&B Sweeps (Hyperparameter Optimization)

```yaml
# sweep_config.yaml
program: train.py
method: bayes
metric:
  name: val/auc
  goal: maximize
parameters:
  model:
    parameters:
      max_depth:
        distribution: int_uniform
        min: 4
        max: 12
      learning_rate:
        distribution: log_uniform
        min: -4.6  # e^-4.6 = 0.01
        max: -2.3  # e^-2.3 = 0.1
      n_estimators:
        distribution: int_uniform
        min: 100
        max: 2000
      subsample:
        distribution: uniform
        min: 0.6
        max: 1.0
      colsample_bytree:
        distribution: uniform
        min: 0.5
        max: 1.0
  data:
    parameters:
      validation_split:
        values: [0.15, 0.2, 0.25]
early_terminate:
  type: hyperband
  min_iter: 5
  s: 2
```

## Neptune (Structured Metadata)

### Neptune Configuration

```python
# neptune_setup.py
import neptune
from neptune.types import File

run = neptune.init_run(
    project='your-team/recommendation',
    api_token=os.environ['NEPTUNE_API_TOKEN'],
    tags=['xgboost', 'baseline', 'feature-v3'],
)

# Log parameters with structured hierarchy
run['model/type'] = 'XGBoost'
run['model/hyperparameters'] = {
    'max_depth': 8,
    'learning_rate': 0.01,
    'n_estimators': 1000,
    'subsample': 0.8,
}
run['data/train/size'] = 100000
run['data/features'] = ['user_emb', 'item_emb', 'context']
run['training/random_seed'] = 42

# Log metrics per epoch
for epoch in range(10):
    run['metrics/train/loss'].append(0.5 - epoch * 0.05)
    run['metrics/train/accuracy'].append(0.7 + epoch * 0.03)
    run['metrics/val/loss'].append(0.55 - epoch * 0.04)

# Log final metrics
run['metrics/test/auc'] = 0.892
run['metrics/test/precision@10'] = 0.45

# Log artifacts
run['artifacts/model'].upload('model.xgb')
run['artifacts/plots/confusion_matrix'].upload('confusion_matrix.png')
run['artifacts/reports'].upload(File.as_html(html_report))

# Log code and environment
run['source_code/git_commit'] = 'a1b2c3d4e5f6'
run['source_code/git_branch'] = 'feature/experiment-v2'
run['monitoring/gpu/name'] = 'A100-80GB'
run['monitoring/gpu/memory_used_gb'] = 72.4

run.stop()
```

### Neptune Comparison Queries

```python
# neptune_comparison.py
import neptune

project = neptune.init_project(
    project='your-team/recommendation',
    api_token=os.environ['NEPTUNE_API_TOKEN'],
)

# Query runs with specific criteria
best_runs = project.fetch_runs_table(
    columns=['model/hyperparameters', 'metrics/test/auc', 'source_code/git_commit'],
    query='tags:["xgboost"] AND metrics/test/auc > 0.88',
    sort_by='metrics/test/auc',
    descending=True,
    limit=10,
).to_pandas()

# Compare runs side by side
run_ids = ['RUN-1', 'RUN-2', 'RUN-3']
comparison = project.compare_runs(
    run_ids,
    column_names=[
        'model/hyperparameters/max_depth',
        'model/hyperparameters/learning_rate',
        'metrics/test/auc',
        'metrics/test/precision@10',
    ],
)
```

## DVC (Git-Based Data and Pipeline Versioning)

### DVC Setup

```bash
# Initialize DVC
dvc init

# Add remote storage
dvc remote add myremote s3://mybucket/dvc-store
dvc remote default myremote

# Track data directory
dvc add data/training/
dvc add data/test/

# Track pipeline
dvc stage add -n train \
    -d src/train.py \
    -d data/training/ \
    -o models/model.pkl \
    -M metrics/accuracy.json \
    python src/train.py

dvc stage add -n evaluate \
    -d src/evaluate.py \
    -d models/model.pkl \
    -d data/test/ \
    -M metrics/eval.json \
    python src/evaluate.py

# Run pipeline
dvc repro

# Track experiments
dvc exp run --set-param train.max_depth=10
dvc exp run --set-param train.learning_rate=0.05
dvc exp show

# Push data to remote
dvc push
```

### DVC Experiment Tracking

```yaml
# dvc.yaml pipeline definition
stages:
  data_validation:
    cmd: python src/data_validation.py --data data/raw/
    deps:
      - data/raw/
      - src/data_validation.py
    outs:
      - data/validated/
    metrics:
      - metrics/data_quality.json:
          cache: false

  feature_engineering:
    cmd: python src/feature_engineering.py --input data/validated/ --output data/features/
    deps:
      - data/validated/
      - src/feature_engineering.py
    outs:
      - data/features/
      - artifacts/feature_encoder.pkl
    params:
      - fe_config.yaml:
          - max_features
          - normalize
    metrics:
      - metrics/feature_stats.json:
          cache: false

  train:
    cmd: python src/train.py --features data/features/ --model models/model.pkl
    deps:
      - data/features/
      - src/train.py
    outs:
      - models/model.pkl
    params:
      - params.yaml:
          - train.max_depth
          - train.learning_rate
          - train.n_estimators
    metrics:
      - metrics/train_metrics.json:
          cache: false
    plots:
      - plots/confusion_matrix.png
      - plots/feature_importance.png

  evaluate:
    cmd: python src/evaluate.py --model models/model.pkl --test data/test/ --metrics metrics/eval.json
    deps:
      - models/model.pkl
      - data/test/
      - src/evaluate.py
    metrics:
      - metrics/eval.json:
          cache: false
    plots:
      - plots/roc_curve.png
```

## Tool Integration Patterns

### Multi-Tool Strategy

Many teams use multiple tools together for different purposes:

```yaml
recommended_stack:
  data_versioning:
    tool: DVC
    purpose: "Version datasets, track data lineage in Git"
  experiment_tracking:
    tool: MLflow
    purpose: "Log experiments, compare runs, register models"
  model_deployment:
    tool: MLflow Models + KServe
    purpose: "Package and deploy registered models"
  pipeline_orchestration:
    tool: Airflow or Prefect
    purpose: "Schedule and monitor ML pipelines"
  monitoring:
    tool: Evidently AI or WhyLabs
    purpose: "Monitor data drift and model performance"
```

### Migration Between Platforms

```python
# migrate_from_mlflow_to_wandb.py
"""Migrate experiment history from MLflow to W&B."""

class ExperimentMigration:
    def __init__(self, mlflow_tracking_uri: str, wandb_project: str):
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        self.mlflow_client = MlflowClient()
        self.wandb_project = wandb_project

    def migrate_experiment(self, experiment_name: str):
        experiment = mlflow.get_experiment_by_name(experiment_name)
        runs = self.mlflow_client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=1000,
        )

        for run in runs:
            wandb_run = wandb.init(
                project=self.wandb_project,
                name=run.info.run_name,
                config=run.data.params,
                tags=list(run.data.tags.values()),
            )

            wandb_run.log(run.data.metrics)

            # Log artifacts
            artifacts_path = os.path.join(run.info.artifact_uri, 'artifacts')
            if os.path.exists(artifacts_path):
                for root, dirs, files in os.walk(artifacts_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        artifact = wandb.Artifact(
                            run.info.run_name + '_' + file,
                            type='artifact',
                        )
                        artifact.add_file(file_path)
                        wandb_run.log_artifact(artifact)

                    wandb_run.finish()
```

## Platform Selection Criteria

### Decision Matrix with Weights

```yaml
selection_criteria:
  team_size:
    single_data_scientist:
      recommendation: "MLflow local or DVC"
      rationale: "Simplest setup, no collaboration features needed"
    small_team_2_5:
      recommendation: "MLflow with SQL backend"
      rationale: "Shared tracking, model registry, low cost"
    team_5_20:
      recommendation: "W&B or Neptune"
      rationale: "Collaboration features, rich UI, stakeholder reports"
    large_org_20_plus:
      recommendation: "MLflow self-hosted on K8s or W&B Enterprise"
      rationale: "Governance, compliance, centralized management"

  infrastructure:
    on_premise:
      recommendation: "MLflow or DVC"
      rationale: "Self-hosted, no cloud dependency"
    cloud_native:
      recommendation: "W&B, Neptune, or SageMaker Experiments"
      rationale: "Managed services, less operational overhead"
    hybrid:
      recommendation: "MLflow self-hosted"
      rationale: "Consistent API across environments"

  regulatory:
    none:
      recommendation: "Any platform"
    gdpr_soc2:
      recommendation: "MLflow self-hosted or W&B Enterprise"
      rationale: "Data sovereignty, audit logging, access controls"
    hipaa:
      recommendation: "MLflow self-hosted on compliant infrastructure"
      rationale: "Full control over data storage and access"
```

## References
- references/experiment-reproducibility.md — Experiment Reproducibility
- references/experiment-platforms.md — Experiment Tracking Platforms
- references/mlflow-setup.md — MLflow Setup and Configuration
- references/data-versioning.md — Data Versioning
- references/experiment-collaboration.md — Experiment Collaboration
- references/experiment-tracking-advanced.md — Experiment Tracking Advanced Topics
