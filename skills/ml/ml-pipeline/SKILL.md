---
name: ml-ml-pipeline
description: >
  Use this skill when building ML pipelines: Kubeflow Pipelines, TFX, SageMaker Pipelines, Vertex AI Pipelines, ML CI/CD, model training pipeline, data validation, model validation, pipeline orchestration.
  This skill enforces: pipeline component decomposition, data validation gates, model validation thresholds, CI/CD integration, artifact tracking, pipeline versioning.
  Do NOT use for: model training hyperparameter tuning, feature store configuration, model serving deployment.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, pipeline, mlops, phase-11]
---

# ML Pipeline Agent

## Purpose
Design production ML pipelines with component decomposition, validation gates, artifact tracking, and CI/CD integration for reliable model training and deployment.

## Agent Protocol

### Trigger
User request includes: ML pipeline, Kubeflow, TFX, SageMaker Pipelines, Vertex AI Pipelines, ML CI/CD, model training pipeline, data validation, model validation, pipeline orchestration, pipeline component.

### Protocol
1. Clarify ML task type, data source, training frequency, and deployment target.
2. Decompose pipeline into components: data ingestion, validation, transformation, training, evaluation, deployment.
3. Configure data validation gates with schema enforcement and anomaly detection.
4. Set model validation thresholds for accuracy, fairness, and performance.
5. Design CI/CD integration with staged promotion and rollback.
6. Specify artifact tracking and pipeline versioning strategy.

## Output
ML pipeline architecture with component design, validation gates, CI/CD integration.

### Response Format
```
## ML Pipeline Configuration
### Components
- Data Ingestion: {source} | {schedule} | {partition strategy}
- Data Validation: {framework} | {schema source} | {anomaly threshold}
- Data Transformation: {framework} | {features in/out} | {stats computed}
- Model Training: {framework} | {algorithm} | {hyperparameter source}
- Model Evaluation: {metrics} | {thresholds} | {fairness constraints}
- Model Deployment: {target} | {strategy} | {rollback condition}

### Validation Gates
| Gate | Check | Action on Fail |
|---|---|---|
| Data schema | {schema compliance %} | {block/skip/alert} |
| Data quality | {null ratio, distribution shift} | {block/skip/alert} |
| Model accuracy | {metric >= threshold} | {block/rollback} |
| Model fairness | {demographic parity, equal opportunity} | {block/warn} |

### CI/CD Pipeline
- Trigger: {commit / schedule / manual}
- Staging: {dev → staging → prod}
- Promotion Gate: {validation + approval}
- Rollback: {automatic on metric degradation}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Pipeline decomposed into discrete components with single responsibility.
- [ ] Data validation gate configured with schema and quality checks.
- [ ] Model validation thresholds set for accuracy and fairness.
- [ ] CI/CD integration defined with staging environments.
- [ ] Artifact tracking configured for all pipeline outputs.
- [ ] Rollback strategy documented.

## Workflow

### Step 1: Pipeline Decomposition
Break ML workflow into components:
- **Data Ingestion**: Poll data sources, partition strategy, incremental vs full load.
- **Data Validation**: Schema enforcement, null check, distribution comparison.
- **Data Transformation**: Feature engineering, scaling, encoding, imputation.
- **Model Training**: Algorithm selection, hyperparameter tuning, experiment tracking.
- **Model Evaluation**: Metric computation, baseline comparison, fairness audit.
- **Model Deployment**: Push to registry, deploy to staging, promote to production.

### Step 2: Configure Data Validation
Use TensorFlow Data Validation or Great Expectations:
```python
# TFDV example
import tensorflow_data_validation as tfdv

stats = tfdv.generate_statistics_from_csv(data_location='train.csv')
schema = tfdv.infer_schema(statistics=stats)
tfdv.display_schema(schema=schema)

# Validate new data
new_stats = tfdv.generate_statistics_from_csv(data_location='new_data.csv')
anomalies = tfdv.validate_statistics(statistics=new_stats, schema=schema)
tfdv.display_anomalies(anomalies=anomalies)
```

### Step 3: Configure Model Validation
```python
# Model evaluation with threshold enforcement
evaluation_config = {
    'accuracy': {'min_threshold': 0.85},
    'precision': {'min_threshold': 0.80},
    'recall': {'min_threshold': 0.80},
    'f1_score': {'min_threshold': 0.82},
    'fairness': {
        'demographic_parity': {'max_diff': 0.05},
        'equal_opportunity': {'max_diff': 0.05}
    }
}
```

### Step 4: Design CI/CD Pipeline
```yaml
# .github/workflows/ml-pipeline.yml
name: ML Pipeline
on:
  push:
    branches: [main]
    paths: ['pipelines/**', 'components/**']
  schedule:
    - cron: '0 6 * * 1'  # weekly retrain

jobs:
  validate-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python components/data_validation.py

  train:
    needs: validate-data
    runs-on: [self-hosted, gpu]
    steps:
      - run: python components/train.py
      - run: python components/evaluate.py

  promote:
    needs: train
    if: success()
    runs-on: ubuntu-latest
    steps:
      - run: python components/promote.py
```

### Step 5: Artifact Tracking
```python
# MLflow tracking
import mlflow

mlflow.set_experiment('ml-pipeline')
with mlflow.start_run():
    mlflow.log_params({'learning_rate': 0.001, 'epochs': 50})
    mlflow.log_metrics({'accuracy': 0.92, 'f1': 0.89})
    mlflow.log_artifact('model.pkl')
    mlflow.register_model('runs:/<run_id>/model', 'production-model')
```

### Step 6: Pipeline Orchestration
```python
# Kubeflow Pipeline component
from kfp import dsl

@dsl.component
def validate_data_op(input_data: str) -> str:
    """Validate data schema and quality."""
    stats = tfdv.generate_statistics_from_csv(input_data)
    schema = tfdv.infer_schema(stats)
    tfdv.validate_statistics(stats, schema)
    return input_data

@dsl.pipeline
def training_pipeline(data_url: str):
    validate = validate_data_op(data=data_url)
    transform = transform_op(data=validate.output)
    train = train_op(data=transform.output)
    evaluate = evaluate_op(model=train.output, data=transform.output)
```

## Rules
- Every pipeline component has single responsibility and explicit inputs/outputs.
- Data validation runs before transformation — never train on unvalidated data.
- Model validation gates block deployment if thresholds not met.
- All pipeline artifacts versioned and tracked with run metadata.
- CI/CD pipeline includes data validation, training, evaluation, and promotion stages.
- Staged promotion (dev → staging → prod) with automatic rollback on metric degradation.
- Pipeline metadata stored in MLflow or similar experiment tracker.
- Data drift detection triggers pipeline re-execution.
- Pipeline components are containerized and versioned.
- Rollback restores previous model version and triggers retraining.

## References
- `references/kubeflow-tfx.md` — Kubeflow Pipelines components, TFX pipeline, component patterns
- `references/ml-cicd.md` — CI/CD for ML pipelines, validation gates, staging, rollback
- `references/pipeline-monitoring.md` — Pipeline observability, drift detection, alerting, retraining triggers, data quality monitoring
- `references/pipeline-orchestration.md` — Workflow orchestrators (Airflow, Prefect, Dagster), DAG design, scheduling, dependency management

## Handoff
For model serving deployment, hand off to `ml-model-serving`. For feature store configuration, hand off to `ml-feature-store`. For experiment tracking setup, hand off to `ai-model-training`.
