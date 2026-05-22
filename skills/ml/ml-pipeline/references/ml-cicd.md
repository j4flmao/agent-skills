# CI/CD for ML Pipelines

## Pipeline Stages

```yaml
# .github/workflows/ml-cicd.yml
name: ML CI/CD Pipeline
on:
  push:
    branches: [main]
    paths:
      - 'pipelines/**'
      - 'components/**'
      - 'config/**'
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'  # weekly retrain

env:
  MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_URI }}
  MODEL_REGISTRY: gs://models-registry

jobs:
  validate-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - name: Validate data schema
        run: |
          python pipelines/validate_data.py \
            --data-path data/current/ \
            --schema-path schemas/latest.json
      - name: Check data quality
        run: |
          python pipelines/check_quality.py \
            --null-threshold 0.05 \
            --distribution-threshold 0.1

  train-and-evaluate:
    needs: validate-data
    runs-on: [self-hosted, gpu]
    steps:
      - name: Train model
        run: |
          python pipelines/train.py \
            --experiment-name ${{ github.sha }} \
            --config config/train_config.yaml
      - name: Evaluate model
        run: |
          python pipelines/evaluate.py \
            --run-id $(mlflow runs list --experiment ${{ github.sha }})
      - name: Check validation gates
        run: |
          python pipelines/check_gates.py \
            --accuracy-min 0.85 \
            --f1-min 0.80 \
            --fairness-disparity-max 0.05

  register-model:
    needs: train-and-evaluate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Register model in MLflow
        run: |
          mlflow models:register \
            --model-name "production-model" \
            --run-id $(cat run_id.txt)
      - name: Push to staging
        run: |
          python pipelines/promote.py \
            --model-version $(mlflow model-versions latest) \
            --stage staging

  deploy-staging:
    needs: register-model
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging endpoint
        run: |
          python pipelines/deploy.py \
            --model-version $(mlflow model-versions latest) \
            --target staging \
            --endpoint staging.api.example.com
      - name: Smoke test staging
        run: |
          python pipelines/smoke_test.py \
            --endpoint staging.api.example.com \
            --samples 50
      - name: A/B validation
        run: |
          python pipelines/ab_test.py \
            --baseline production \
            --candidate staging \
            --metric accuracy \
            --threshold 0.01

  promote-to-prod:
    needs: deploy-staging
    if: success()
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Canary deploy (10% traffic)
        run: |
          python pipelines/canary.py \
            --model-version $(mlflow model-versions latest) \
            --traffic 10
      - name: Monitor canary (30 min)
        run: sleep 1800
      - name: Rollback if needed
        run: |
          python pipelines/check_canary_health.py \
            --error-rate-threshold 0.01 || \
            python pipelines/rollback.py
      - name: Full rollout
        run: |
          python pipelines/rollout.py \
            --traffic 100
```

## Data & Model Validation Gates

| Gate | Check | Tool | Action |
|---|---|---|---|
| Schema compliance | Column types match schema | TFDV / Great Expectations | Block pipeline |
| Null ratio | Max nulls < 5% | TFDV | Block pipeline |
| Distribution shift | KL divergence < 0.1 | TFDV | Alert + block |
| Accuracy | > 85% | sklearn / TFMA | Block promotion |
| Fairness | Demographic disparity < 5% | TFMA / Fairness Indicators | Block promotion |
| Latency | p99 < 500ms | Custom benchmark | Warn |
| Data drift | PSI < 0.2 | Evidently AI | Trigger retraining |

## Model Staging

```
                 ┌──────────┐
                 │   Dev    │
                 │ (unittest)│
                 └────┬─────┘
                      │ validate & train
                 ┌────▼─────┐
                 │ Staging  │
                 │ (A/B test)│
                 └────┬─────┘
                      │ canary
                 ┌────▼─────┐
                 │  Prod    │
                 │ (100%)   │
                 └────┬─────┘
                      │ monitor
                 ┌────▼─────┐
                 │ Rollback │
                 │ (v-1)    │
                 └──────────┘
```

## Rollback Procedure

```python
class ModelRollback:
    def __init__(self, registry):
        self.registry = registry

    def rollback(self, current_version, reason):
        prev_version = current_version - 1
        self.registry.set_alias(
            model_name="production-model",
            version=prev_version,
            alias="production"
        )
        metrics = self.registry.get_run(prev_version)
        return {
            "status": "rolled_back",
            "previous_version": prev_version,
            "reason": reason,
            "previous_metrics": metrics
        }

    def auto_rollback_if_degraded(self, new_model_metrics, threshold=0.02):
        prod_metrics = self.registry.get_production_metrics()
        for metric in new_model_metrics:
            diff = new_model_metrics[metric] - prod_metrics[metric]
            if diff < -threshold:
                return self.rollback(
                    new_model_metrics["version"],
                    f"{metric} degraded by {abs(diff):.3f}"
                )
        return {"status": "promoted"}
```

## A/B Testing Infrastructure

```yaml
# A/B test configuration
ab_test:
  baseline:
    model: production-model:v3
    traffic: 50
    endpoint: api.example.com/v1/predict
  candidate:
    model: production-model:v4
    traffic: 50
    endpoint: api.example.com/v2/predict
  evaluation:
    duration: 48h
    metrics:
      - accuracy
      - latency_p99
      - user_satisfaction
    significance_level: 0.05
  decision:
    promote_if: candidate better on >= 2/3 metrics
    rollback_if: candidate worse on any critical metric
```
