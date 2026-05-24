# ML Model Retraining

## Automated Retraining Pipeline

```
Data Source → Feature Engineering → Training → Evaluation → Registry → Deployment
      ↑                                                                        │
      └────────────────────── Monitoring (drift detection) ────────────────────┘
```

```yaml
# Airflow DAG for retraining
dag:
  schedule: "0 6 * * 0"  # Weekly, Sunday 6 AM
  tasks:
  - name: extract_training_data
    operator: BigQueryOperator
    params:
      query: "SELECT * FROM training_data WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)"

  - name: feature_engineering
    operator: PythonOperator
    params:
      function: generate_features
      requirements:
        cpu: 4
        memory: 8Gi

  - name: train_model
    operator: KubernetesPodOperator
    params:
      image: ml-training:latest
      resources:
        cpu: 8
        memory: 32Gi
        gpu: 1
      cmds: ["python", "train.py"]

  - name: evaluate_model
    operator: PythonOperator
    params:
      function: compare_with_production
      criteria:
        accuracy: "> 0.95"
        precision: "> 0.93"
        recall: "> 0.90"
  - name: promote_to_staging:
    operator: PythonOperator
    depends_on: [evaluate_model]
  - name: validate_staging
    operator: KubernetesPodOperator
    params:
      image: ml-serving:latest
      cmds: ["python", "shadow_test.py"]
  - name: promote_to_production
    operator: PythonOperator
    depends_on: [validate_staging]
```

## Data Drift Detection

| Drift Type | Detection Method | Threshold | Action |
|------------|-----------------|-----------|--------|
| Data drift | Distribution comparison (KS-test, PSI) | PSI > 0.2 | Retrain |
| Label drift | Actual vs expected distribution | PSI > 0.2 | Investigate label source |
| Feature drift | Feature importance change | Top-3 features change | Feature engineering |
| Prediction drift | Prediction distribution shift | PSI > 0.15 | Alert, shadow deploy |

```python
# Population Stability Index (PSI)
import numpy as np

def calculate_psi(expected, actual, bins=10):
    """Calculate PSI between expected and actual distributions."""
    expected_percentiles = np.percentile(expected, np.linspace(0, 100, bins+1))
    
    expected_counts = np.histogram(expected, bins=expected_percentiles)[0]
    actual_counts = np.histogram(actual, bins=expected_percentiles)[0]
    
    expected_pct = expected_counts / len(expected)
    actual_pct = actual_counts / len(actual)
    
    psi = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return psi
```

## Model Refresh Strategies

| Strategy | Trigger | Data | Downtime | Rollback |
|----------|---------|------|----------|----------|
| Scheduled retraining | Calendar (weekly/monthly) | Full training set | None (blue-green) | Previous model |
| Triggered retraining | Drift detection | Recent data + historical | None (canary) | Revert deployment |
| Online learning | Every batch | Stream data | None | N/A |
| Champion/challenger | Monitored comparison | Full training set | None (A/B) | Shadow challenger |

## Canary Deployment

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation
spec:
  canary:
    trafficPercent: 10
    predictor:
      model:
        modelFormat:
          name: pytorch
        storageUri: s3://models/recommendation/v3/
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: s3://models/recommendation/v2/
```

## Rollback Procedure

```bash
# 1. Revert model registry stage
mlflow_transition_model_version_stage(
    name="recommendation-model",
    version=2,  # Previous version
    stage="Production"
)

# 2. Re-deploy previous model
kubectl set image deployment/recommendation \
  model=registry.example.com/recommendation:v2

# 3. Verify rollback
python scripts/validate_serving.py \
  --endpoint https://recommendation.example.com/predict

# 4. Alert team
curl -X POST https://hooks.slack.com/services/... \
  -H "Content-Type: application/json" \
  -d '{"text": "Rolled back recommendation model to v2 due to accuracy degradation"}'
```

## Performance Decay Monitoring

```promql
# ML model performance over time
avg by (model_version) (
  model_accuracy{model="recommendation", environment="production"}
)

# Alert when accuracy drops below threshold
avg(model_accuracy{model="recommendation"}) < 0.90
```

| Metric | Target | Alert | Action |
|--------|--------|-------|--------|
| AUC-ROC | > 0.85 | < 0.80 | Retrain |
| Precision | > 0.90 | < 0.85 | Investigate features |
| Recall | > 0.85 | < 0.80 | Retrain with more data |
| Latency p99 | < 100ms | > 200ms | Optimize model/serving |
| Prediction drift PSI | < 0.1 | > 0.15 | Review data pipeline |
