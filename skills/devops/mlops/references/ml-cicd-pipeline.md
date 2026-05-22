# ML CI/CD Pipeline

## Pipeline Stages

### 1. Data Validation
Validate input data before training. Check schema, statistics, missing values, distribution against baseline.

```yaml
# CI stage: data-validate
scripts:
  - great_expectations checkpoint run training_data
  - python scripts/validate_data_schema.py
  - python scripts/detect_data_drift.py --baseline prod
```

### 2. Training
Run training job with experiment tracking. Log hyperparameters, metrics, model artifacts.

```bash
# CI stage: train
mlflow run . --env-manager local \
  -P data_path=./data/training.parquet \
  -P model_type=xgboost \
  -P hyperparameters='{"n_estimators": 100, "max_depth": 6}'
```

### 3. Evaluation
Compare against baseline model. Must exceed thresholds to proceed.

```python
# Evaluation script
metrics = evaluate_model(model, test_data)
baseline_metrics = load_baseline("production")

assert metrics["accuracy"] >= baseline_metrics["accuracy"] * 0.98
assert metrics["precision"] >= 0.85
assert metrics["recall"] >= 0.80
assert metrics["latency_ms"] <= 100
```

### 4. Registry Promotion

```bash
# Promote to Staging
mlflow models stage -m runs:/$RUN_ID/model --stage Staging

# Manual gate: validate staging metrics
# Promote to Production
mlflow models stage -m runs:/$RUN_ID/model --stage Production
```

## Model Registry

### MLflow Registry

```python
import mlflow

client = mlflow.tracking.MlflowClient()

# Register model
result = mlflow.register_model(
    model_uri=f"runs:/{run_id}/model",
    name="my_model"
)

# Stage transitions
client.transition_model_version_stage(
    name="my_model",
    version=result.version,
    stage="Staging"  # None, Staging, Production, Archived
)

# Load production model
model = mlflow.pyfunc.load_model(
    model_uri=f"models:/my_model/Production"
)
```

### Registry Stages
- **None**: Initial registration, untested
- **Staging**: Passed CI, ready for canary deployment
- **Production**: Serving live traffic
- **Archived**: Retired versions

### CI/CD with DVC
```bash
dvc repro          # Run pipeline
dvc push           # Push data and models to remote
git tag v1.2.3     # Tag pipeline version
```

## CI Pipeline Example (GitLab)

```yaml
stages:
  - data-validate
  - train
  - evaluate
  - register

data-validate:
  stage: data-validate
  script:
    - great_expectations checkpoint run training_data
    - python scripts/detect_data_drift.py

train:
  stage: train
  script:
    - mlflow run . --env-manager local
  artifacts:
    paths:
      - mlruns/

evaluate:
  stage: evaluate
  script:
    - python scripts/evaluate.py --threshold 0.85
  needs: [train]

register:
  stage: register
  script:
    - python scripts/register_model.py --stage Staging
  only:
    - main
```

## Feature Pipeline CI/CD

Separate feature pipeline from model pipeline:

```yaml
feature-pipeline:
  script:
    - python features/validate_transforms.py  # Check transform consistency
    - python features/run_feature_job.py      # Compute features
    - python features/validate_output.py      # Check feature distributions
```

Version feature definitions alongside code. Ensure training-time and serving-time features match.

## Monitoring Stage

After deployment, continuous monitoring:
- **Data drift**: Feature distribution shifts (PSI, KL divergence)
- **Concept drift**: Accuracy decay over time
- **Performance**: Latency, throughput, error rate
- **Cost**: Inference cost per prediction
