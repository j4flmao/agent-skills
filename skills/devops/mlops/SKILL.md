---
name: devops-mlops
description: >
  Use this skill when implementing MLOps: ML CI/CD pipelines, model deployment pipelines, model registry CI/CD, canary deploy ML, A/B testing ML, model monitoring, model drift, model rollback, feature store CI/CD.
  This skill enforces: CI/CD for model pipeline, registry promotion, canary/blue-green deployment, drift monitoring, rollback strategy.
  Do NOT use for: model training (use ml-training), feature engineering (use feature-engineering), data pipeline CI/CD (use devops-dataops).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, mlops, ml, phase-11]
---

# MLOps Agent

## Purpose
Implements ML CI/CD pipelines with model registry, canary deployment, monitoring, and rollback for production ML systems. MLOps applies DevOps principles to machine learning, adding data and model versioning, experiment tracking, model registry, deployment strategies, and monitoring for drift and performance decay.

## Architecture/Decision Trees

### Deployment Strategy Decision Tree
```
Is this a real-time inference service (< 100ms latency)?
  |-- YES --> Does the model serve critical user-facing traffic?
  |     |-- YES --> Canary deployment (gradual rollout, auto-rollback)
  |     |-- NO  --> Blue-green (fast rollback with full cutover)
  |-- NO --> Is this a batch inference job?
        |-- YES --> Shadow deployment (run new model in parallel, compare results)
        |-- NO --> Rolling update (gradual pod replacement)

Do you have A/B testing infrastructure for model comparison?
  |-- YES --> Canary with traffic splitting (by user_id or experiment flag)
  |-- NO --> Blue-green (simpler deployment without experiment infrastructure)
```

### Monitoring Strategy Decision Tree
```
Is the input data distribution stable or changing?
  |-- Stable --> Focus on concept drift (prediction accuracy over time)
  |-- Changing --> Focus on data drift (feature distribution changes)

Do you have ground truth labels available in near real-time?
  |-- YES --> Monitor accuracy metrics directly (precision, recall, RMSE)
  |-- NO --> Monitor prediction distribution shift as proxy for performance

Do you have business KPIs correlated with model performance?
  |-- YES --> Monitor business metrics (conversion rate, revenue per user)
  |-- NO --> Monitor model metrics only (latency, error rate, drift)
```

## Agent Protocol

### Trigger
User request includes: MLOps, ML pipeline CI/CD, model deployment pipeline, model registry CI/CD, canary deploy ML, A/B testing ML, model monitoring, model drift, model rollback, feature store CI/CD.

### Protocol
1. Design CI pipeline: data validation -> training -> evaluation -> registry promotion.
2. Configure model registry (MLflow, DVC, custom).
3. Design CD pipeline: deployment strategy (canary, blue-green).
4. Set up A/B testing infrastructure.
5. Configure model monitoring (data drift, concept drift, performance decay).
6. Implement rollback strategy.
7. Set up feature pipeline CI/CD.

## Output
MLOps pipeline with CI/CD config, model registry, deployment strategy, monitoring.

### Response Format
```
## MLOps Pipeline
### CI Pipeline
Stages: [data-validate -> train -> evaluate -> register]
Validation: {data schema / statistics / anomaly detection}
Evaluation Thresholds: {metric >= N}
Registry Promotion: {staging -> prod gate}

### Model Registry
Platform: {MLflow / DVC / custom}
Registry Stages: [none, staging, production, archived]
Artifacts: [{model binary, metadata, metrics, plots}]

### Deployment
Strategy: {canary / blue-green / rolling}
Canary Traffic: {N%} | Observation: {duration}
Auto-rollback: {metric drop >= X%}

### Monitoring
Drift Detection: {data / concept / both}
Frequency: {per batch / real-time}
Alerts: {metric name: threshold}
Performance Decay: {monitor accuracy every N days}

### Rollback
Trigger: {drift alert / error rate / performance decay}
Strategy: {revert to previous prod version / shadow traffic}
```

### Completion Criteria
- [ ] CI pipeline validates data, trains model, evaluates against thresholds.
- [ ] Model registry stages mapped to environments.
- [ ] Deployment strategy selected with traffic management.
- [ ] A/B testing infrastructure configured.
- [ ] Drift monitoring active for data and concept drift.
- [ ] Rollback strategy tested and automated.
- [ ] Feature pipeline has separate CI/CD.

## Workflow

### Step 1: CI Pipeline with GitHub Actions
```yaml
name: ML Pipeline
on:
  push:
    branches: [main]
    paths: ['models/**', 'features/**']
  schedule:
    - cron: '0 6 * * 1'  # Weekly retrain

jobs:
  data-validation:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Validate data schema
      run: |
        great_expectations checkpoint run data_validation
    - name: Check for data drift
      run: |
        python -m mlops.monitoring.drift_detection \
          --reference data/train.parquet \
          --current data/latest.parquet

  train-and-evaluate:
    needs: data-validation
    runs-on: [self-hosted, gpu]
    steps:
    - name: Train model
      run: python models/classifier/train.py
    - name: Evaluate against thresholds
      run: |
        python -m mlops.evaluate \
          --model models/classifier/output/model.pkl \
          --threshold accuracy=0.85 \
          --threshold f1=0.80
    - name: Register model (staging)
      run: |
        mlflow models register \
          --model-name classifier \
          --version ${{ github.run_number }} \
          --stage Staging
```

### Step 2: Model Registry — MLflow Configuration
```python
import mlflow
from mlflow.tracking import MlflowClient

mlflow.set_tracking_uri("http://mlflow:5000")
mlflow.set_experiment("classifier")

with mlflow.start_run() as run:
    # Log params, metrics, and model
    mlflow.log_param("learning_rate", 0.01)
    mlflow.log_param("max_depth", 7)
    mlflow.log_metric("accuracy", 0.91)
    mlflow.log_metric("f1_score", 0.88)
    mlflow.log_artifact("confusion_matrix.png")
    mlflow.sklearn.log_model(model, "model")

    # Register model
    client = MlflowClient()
    result = mlflow.register_model(
        f"runs:/{run.info.run_id}/model",
        "classifier"
    )
    client.transition_model_version_stage(
        name="classifier",
        version=result.version,
        stage="Staging"
    )
```

### Step 3: KServe InferenceService
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: classifier
spec:
  predictor:
    canary:
      trafficPercent: 10
    model:
      modelFormat:
        name: sklearn
      storageUri: s3://mlflow-models/classifier/3/model
    minReplicas: 2
    maxReplicas: 10
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2
        memory: 4Gi
  transformer:
    containers:
    - name: transformer
      image: registry/feature-transformer:latest
      env:
      - name: FEATURE_STORE_URL
        value: http://feast:6565
```

### Step 4: Seldon Core Deployment with Canary
```yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: classifier
spec:
  name: classifier
  predictors:
  - name: default
    traffic: 90
    componentSpecs:
    - spec:
        containers:
        - name: classifier
          image: registry/model:1
          env:
          - name: MODEL_VERSION
            value: "1"
  - name: canary
    traffic: 10
    componentSpecs:
    - spec:
        containers:
        - name: classifier
          image: registry/model:2
          env:
          - name: MODEL_VERSION
            value: "2"
```

### Step 5: A/B Testing Infrastructure
```python
import hashlib
import random

def get_treatment(user_id: str, experiment: str) -> str:
    """Consistent hashing-based treatment assignment."""
    hash_val = int(hashlib.md5(
        f"{user_id}:{experiment}".encode()
    ).hexdigest(), 16) % 100

    if hash_val < 10:
        return "treatment"  # 10% of users
    return "control"

# Log prediction with experiment context
def predict(user_id: str, features: dict):
    treatment = get_treatment(user_id, "model_v2_test")
    model_version = "v2" if treatment == "treatment" else "v1"
    prediction = model_service.predict(features, version=model_version)
    log_prediction({
        "user_id": user_id,
        "treatment": treatment,
        "model_version": model_version,
        "prediction": prediction,
        "timestamp": datetime.utcnow().isoformat()
    })
    return prediction
```

### Step 6: Drift Monitoring with Evidently AI
```python
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, RegressionPreset
from evidently.ui.workspace import Workspace

workspace = Workspace("http://evidently:8080")

report = Report(metrics=[
    DataDriftPreset(),
    RegressionPreset(),
])
report.run(
    reference_data=train_df,
    current_data=current_batch,
    column_mapping=column_mapping
)

# Check drift thresholds
drift_score = report.as_dict()["metrics"][0]["result"]["drift_score"]
if drift_score > 0.15:  # PSI > 0.15 triggers alert
    alert_service.send_drift_alert(
        model_name="classifier",
        drift_score=drift_score,
        drifted_features=report.as_dict()["metrics"][0]["result"]["drifted_features"]
    )

# Save report
workspace.add_report(report)
report.save_html("monitoring_reports/drift_report.html")
```

### Step 7: Feature Store with Feast
```yaml
# feature_store.yaml
project: mlops
registry: gs://feature-registry/registry.db
provider: gcp

online_store:
  type: redis
  connection_string: redis://redis:6379

offline_store:
  type: bigquery
  dataset: feature_store
```

```python
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")

# Feature retrieval for training
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "user_features:age",
        "user_features:signup_days",
        "transaction_features:avg_amount_7d",
        "transaction_features:tx_count_30d",
    ]
).to_df()

# Feature retrieval for inference
feature_vector = store.get_online_features(
    features=[
        "user_features:age",
        "user_features:signup_days",
    ],
    entity_rows=[{"user_id": user_id}]
).to_dict()
```

### Step 8: Automated Retraining Pipeline
```python
# scheduler: Airflow DAG for weekly retraining
from airflow import DAG
from airflow.operators.python import PythonOperator

dag = DAG(
    "model_retraining",
    schedule_interval="@weekly",
    catchup=False,
)

def retrain_if_drift_detected():
    drift_score = check_data_drift()
    if drift_score > 0.15:
        train_new_model()
        evaluate_and_promote()
    else:
        logger.info("No significant drift — skipping retrain")

retrain = PythonOperator(
    task_id="retrain_if_drift",
    python_callable=retrain_if_drift_detected,
    dag=dag,
)
```

### Step 9: Model Card Template
```markdown
# Model Card: classifier

## Model Details
- **Version**: 3
- **Type**: Gradient Boosted Decision Tree (XGBoost)
- **Date**: 2026-05-14
- **Training dataset**: user_transactions_2026-04 (2.1M rows, 45 features)

## Intended Use
- Fraud detection for payment transactions
- Not for: Credit scoring, loan approval

## Performance
| Metric | Value |
|--------|-------|
| Accuracy | 0.91 |
| Precision | 0.88 |
| Recall | 0.85 |
| F1 | 0.86 |

## Fairness Evaluation
| Segment | Sample Size | Accuracy |
|---------|-------------|----------|
| Overall | 500K | 0.91 |
| Segment A | 50K | 0.90 |
| Segment B | 50K | 0.91 |

## Limitations
- Degrades when transaction patterns shift (seasonal events)
- Requires retraining every 30 days minimum
- Not calibrated for out-of-distribution inputs

## Monitoring
- Data drift: PSI on 10 key features, alert at >0.15
- Concept drift: weekly accuracy eval on labeled data
- Performance: hourly latency p99, throughput, error rate
```

### Step 10: Training-Serving Skew Prevention
```python
# Feature transformation must be identical

# BAD: different logic in training vs serving
def transform_training(df):
    df["amount_log"] = np.log1p(df["amount"].clip(lower=0))

def transform_serving(row):
    return {"amount_log": math.log1p(max(row["amount"], 0))}

# GOOD: shared transformation function
def transform_amount(amount):
    return np.log1p(max(amount, 0))

def transform_for_training(df):
    df["amount_log"] = df["amount"].apply(transform_amount)

def transform_for_serving(row):
    return {"amount_log": transform_amount(row["amount"])}
```

### Step 11: Model Explainability (SHAP) in Pipeline
```python
import shap
import pickle

# Generate explanations as part of CI pipeline
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Save explanation artifacts
with open("artifacts/shap_values.pkl", "wb") as f:
    pickle.dump(shap_values, f)

# Log feature importance plot
shap.summary_plot(shap_values, X_test, show=False)
plt.savefig("artifacts/shap_summary.png")

mlflow.log_artifact("artifacts/shap_summary.png")
mlflow.log_artifact("artifacts/shap_values.pkl")
```

## Rules
- Never promote to production without passing evaluation thresholds.
- Canary period minimum: N complete business cycles (e.g., 24h).
- Every model deployment must have a rollback plan.
- Monitor drift on every inference batch — not just on schedule.
- Feature consistency: training and serving must use identical transformations.
- Registry stages must be immutable — no overwrites.
- A/B tests must reach statistical significance before declaring winner.
- Log all prediction requests and responses for audit and debugging.
- Version training data alongside model artifacts for full reproducibility.

## Best Practices
- Automate model retraining on data drift detection.
- Use feature stores to ensure training-serving consistency.
- Implement model explainability (SHAP, LIME) in evaluation pipeline.
- Monitor infrastructure metrics (GPU utilization, memory, latency) alongside model metrics.
- Run model evaluation against a holdout test set that is never used in training.
- Document model cards for every registered model.

## Common Pitfalls
- **Training-serving skew**: Feature transformations differ between training and inference pipelines. Use a feature store to guarantee consistency.
- **Silent model degradation**: Model accuracy decays gradually without automated monitoring. Schedule periodic evaluation.
- **Canary blindness**: Insufficient traffic routed to canary means metrics never reach statistical significance. Ensure minimum 5-10% traffic.
- **Rollback breaks backward compatibility**: New model changes prediction schema; rolling back means clients receive incompatible format. Version the prediction schema.
- **Data drift threshold tuning**: Too sensitive causes false alarms; too insensitive misses real drift. Tune on historical data.

## Comparison: Traditional DevOps vs MLOps
| Aspect | Traditional DevOps | MLOps |
|--------|-------------------|-------|
| Artifact versioning | Code only | Code + Data + Model |
| CI trigger | Code change | Code change + Data change + Retrain trigger |
| Test scope | Unit + Integration + E2E | + Data validation + Model evaluation |
| Deployment | Traffic shift | Traffic shift + Model registry promotion |
| Monitoring | System metrics (CPU, memory) | + Data drift + Concept drift + Model accuracy |
| Rollback | Code revert | Model version revert + Data version revert |

## Performance
- Model evaluation latency: 1-10 minutes for tabular models, 10-60 minutes for deep learning.
- Canary observation period: 24-72 hours minimum for business cycle coverage.
- Drift detection latency: near real-time for data drift, 1-7 days for concept drift.
- Model registry operations: sub-second for version lookup, seconds for artifact download.

## Tooling
- **ML platforms**: MLflow, Kubeflow, SageMaker, Vertex AI, Azure ML.
- **Orchestration**: Airflow, Prefect, Dagster, Argo Workflows, Kubeflow Pipelines.
- **Deployment**: KServe, Seldon Core, BentoML, TF Serving, TorchServe.
- **Monitoring**: Evidently AI, WhyLabs, Arize AI, NannyML, Alibi Detect.
- **Registry**: MLflow Model Registry, DVC, Hugging Face Hub.
- **Feature store**: Feast, Tecton, SageMaker Feature Store.

## References
  - references/ml-cicd-pipeline.md — ML CI/CD Pipeline
  - references/ml-deployment.md — ML Deployment & Monitoring
  - references/ml-experiment-tracking.md — ML Experiment Tracking
  - references/ml-retraining.md — ML Model Retraining
  - references/mlops-advanced.md — Mlops Advanced Topics
  - references/mlops-fundamentals.md — Mlops Fundamentals
  - references/mlops-pipeline-automation.md — MLOps Pipeline Automation
  - references/mlops-model-governance.md — MLOps Model Governance
## Handoff
For data pipeline CI/CD: `devops-dataops`. For Kubernetes deployment: `devops-kubernetes-for-data`.
