# MLOps Pipeline Automation

## Overview

MLOps pipeline automation is the practice of building CI/CD pipelines specifically designed for machine learning systems. Unlike traditional software CI/CD, ML pipelines must handle data versioning, model training, experiment tracking, model evaluation, registry promotion, and deployment strategies. This reference covers the architecture of automated ML pipelines, tooling choices, pipeline stages, and implementation patterns for reliable, reproducible ML workflows.

## Pipeline Architecture

### High-Level Pipeline Flow

```
[Data Sources] → [Validation] → [Feature Engineering] → [Training]
    → [Evaluation] → [Registry] → [Deployment] → [Monitoring]
         ↑                              ↓
    [Retrain Trigger] ←─── [Drift Detection]
```

### Multi-Pipeline Architecture

ML systems typically require multiple interconnected pipelines:

```yaml
pipelines:
  data_pipeline:
    description: "Ingests, validates, and processes raw data"
    frequency: "Daily or event-driven"
    stages:
      - "Data ingestion from sources"
      - "Data validation (schema, stats, quality checks)"
      - "Feature computation and materialization"
      - "Data versioning (DVC, lakeFS)"
    output: "Versioned feature dataset"

  training_pipeline:
    description: "Trains and evaluates model candidates"
    frequency: "On-demand, triggered by data change or schedule"
    stages:
      - "Feature retrieval from feature store"
      - "Training/validation/test split"
      - "Model training (single or parallel candidates)"
      - "Model evaluation against thresholds"
      - "Model registration"
    output: "Registered model in registry"

  deployment_pipeline:
    description: "Promotes models through environments"
    frequency: "On registry stage change"
    stages:
      - "Model validation (signature, compatibility)"
      - "Deploy to staging (shadow mode)"
      - "Integration tests in staging"
      - "Promote to production (canary/blue-green)"
      - "Production validation"
    output: "Deployed model serving endpoint"

  monitoring_pipeline:
    description: "Monitors deployed models for drift and decay"
    frequency: "Continuous (streaming) or scheduled (batch)"
    stages:
      - "Metric collection (latency, error rate, throughput)"
      - "Drift detection (data drift, concept drift)"
      - "Performance evaluation (if labels available)"
      - "Alert generation"
      - "Retrain trigger (if drift threshold exceeded)"
    output: "Health status, drift alerts, retrain triggers"
```

## CI Pipeline Implementation

### Pipeline Stages with Code

#### Stage 1: Data Validation

```python
# data_validation.py
import pandera as pa
from great_expectations.dataset import PandasDataset

# Schema validation with Pandera
class FeatureSchema(pa.DataFrameModel):
    user_id: pa.typing.Int64 = pa.Field(ge=0)
    feature_embedding: pa.typing.Float64 = pa.Field(nullable=True)
    days_since_last_login: pa.typing.Int64 = pa.Field(ge=0, le=365)
    total_purchases: pa.typing.Int64 = pa.Field(ge=0)
    is_active: pa.typing.Bool = pa.Field()

    class Config:
        strict = True
        coerce = True

def validate_features(df) -> pa.typing.Series:
    schema = FeatureSchema
    validated_df = pa.validate(df, schema, lazy=True)
    return validated_df

# Statistical validation with Great Expectations
def run_statistical_validation(df):
    ge_df = PandasDataset(df)
    results = {
        'missing_values': ge_df.expect_column_values_to_not_be_null('user_id'),
        'feature_range': ge_df.expect_column_values_to_be_between(
            'days_since_last_login', 0, 365
        ),
        'distribution': ge_df.expect_column_kl_divergence_to_be_less_than(
            'total_purchases',
            partition_object={'values': [0, 1, 2, 3, 4, 5, '6+']},
            threshold=0.1
        ),
    }
    return results
```

#### Stage 2: Training Pipeline with Parallel Candidates

```python
# training_pipeline.py
import mlflow
from concurrent.futures import ThreadPoolExecutor, as_completed

class TrainingPipeline:
    def __init__(self, tracking_uri: str, experiment_name: str):
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(experiment_name)

    def train_candidate(self, config: dict) -> dict:
        with mlflow.start_run(run_name=config['name']) as run:
            mlflow.log_params(config['params'])
            model = self._train_model(config)
            metrics = self._evaluate_model(model, config['test_data'])
            mlflow.log_metrics(metrics)

            if metrics[config['primary_metric']] >= config['threshold']:
                mlflow.sklearn.log_model(
                    model,
                    artifact_path="model",
                    registered_model_name=config['model_name'],
                )
            return {
                'run_id': run.info.run_id,
                'metrics': metrics,
                'passed_threshold': metrics[config['primary_metric']] >= config['threshold'],
            }

    def train_candidates_parallel(self, candidates: list[dict]) -> list[dict]:
        results = []
        with ThreadPoolExecutor(max_workers=len(candidates)) as executor:
            futures = {executor.submit(self.train_candidate, c): c for c in candidates}
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        return results
```

#### Stage 3: Model Evaluation and Promotion

```python
# evaluation_pipeline.py
class ModelEvaluator:
    def __init__(self, baseline_model_uri: str):
        self.baseline = mlflow.pyfunc.load_model(baseline_model_uri)

    def evaluate_candidate(self, candidate_uri: str, test_data) -> EvaluationResult:
        candidate = mlflow.pyfunc.load_model(candidate_uri)

        baseline_predictions = self.baseline.predict(test_data.features)
        candidate_predictions = candidate.predict(test_data.features)

        metrics = {
            'baseline_accuracy': accuracy_score(test_data.labels, baseline_predictions),
            'candidate_accuracy': accuracy_score(test_data.labels, candidate_predictions),
            'accuracy_delta': accuracy_score(test_data.labels, candidate_predictions) -
                              accuracy_score(test_data.labels, baseline_predictions),
            'baseline_latency_ms': self._measure_latency(self.baseline, test_data.features),
            'candidate_latency_ms': self._measure_latency(candidate, test_data.features),
        }

        promoted = metrics['candidate_accuracy'] >= metrics['baseline_accuracy'] * 1.01

        return EvaluationResult(
            metrics=metrics,
            promoted=promoted,
            promotion_gate=metrics['candidate_accuracy'] > 0.85,
        )

    def _measure_latency(self, model, features, n_iterations=100):
        import time
        start = time.perf_counter()
        for _ in range(n_iterations):
            model.predict(features[:1])
        return ((time.perf_counter() - start) / n_iterations) * 1000
```

## CI/CD Configuration

### GitHub Actions for ML Pipeline

```yaml
# .github/workflows/ml-training-pipeline.yml
name: ML Training Pipeline

on:
  push:
    branches: [main, staging]
    paths:
      - 'models/**'
      - 'features/**'
  schedule:
    - cron: '0 6 * * 1'  # Weekly retrain
  workflow_dispatch:
    inputs:
      force_retrain:
        description: 'Force retrain all models'
        required: false
        default: false

env:
  MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_TRACKING_URI }}
  FEATURE_STORE_URI: ${{ secrets.FEATURE_STORE_URI }}
  DATA_VERSION: ${{ github.sha }}

jobs:
  data-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r models/requirements.txt
      - name: Validate training data
        run: python models/pipelines/data_validation.py
      - name: Upload validation report
        uses: actions/upload-artifact@v4
        with:
          name: validation-report
          path: reports/validation/
        if: always()

  training:
    needs: [data-validation]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        candidate: [xgboost-v1, lightgbm-v1, catboost-v1]
    steps:
      - uses: actions/checkout@v4
      - name: Train model candidate
        run: python models/pipelines/train.py --candidate ${{ matrix.candidate }}
      - name: Upload model artifact
        uses: actions/upload-artifact@v4
        with:
          name: model-${{ matrix.candidate }}
          path: artifacts/models/${{ matrix.candidate }}/

  evaluation:
    needs: [training]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download all model artifacts
        uses: actions/download-artifact@v4
      - name: Evaluate candidates
        run: python models/pipelines/evaluate.py
      - name: Compare with baseline
        run: python models/pipelines/compare_baseline.py
      - name: Promote best model to staging
        if: github.ref == 'refs/heads/main'
        run: python models/pipelines/promote.py --stage staging

  deploy-staging:
    needs: [evaluation]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy model to staging endpoint
        run: |
          python models/pipelines/deploy.py \
            --environment staging \
            --model-uri models:/${{ env.MODEL_NAME }}/Staging
      - name: Run integration tests
        run: python models/tests/test_staging.py
      - name: Promote to production
        if: success()
        run: python models/pipelines/promote.py --stage production --approval required

  deploy-production:
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production canary
        run: |
          python models/pipelines/deploy.py \
            --environment production \
            --strategy canary \
            --canary-percentage 5
      - name: Monitor canary (30 min observation)
        run: python models/pipelines/monitor_canary.py --duration 30
      - name: Roll forward to 100%
        if: success()
        run: python models/pipelines/roll_forward.py
      - name: Roll back if monitoring fails
        if: failure()
        run: python models/pipelines/rollback.py
```

### Docker-based Model Serving

```dockerfile
# Dockerfile.model-serving
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ .

# Download model from registry at container start
ENV MLFLOW_TRACKING_URI=${MLFLOW_TRACKING_URI}
ENV MODEL_NAME=${MODEL_NAME}
ENV MODEL_STAGE=Production

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8080"]
```

```python
# entrypoint.sh
#!/bin/bash
# Download model from registry at container startup
python -c "
import mlflow
import os

model_name = os.environ['MODEL_NAME']
model_stage = os.environ.get('MODEL_STAGE', 'Production')
model_uri = f'models:/{model_name}/{model_stage}'

print(f'Loading model from {model_uri}')
model = mlflow.pyfunc.load_model(model_uri)
mlflow.pyfunc.save_model('model_cache', python_model=model)
print('Model loaded and cached successfully')
"

exec "$@"
```

```python
# serve.py
import mlflow
import numpy as np
from fastapi import FastAPI, Request
from pydantic import BaseModel

app = FastAPI()

# Load model from local cache
model = mlflow.pyfunc.load_model('model_cache')

class PredictionRequest(BaseModel):
    features: list[float]

class PredictionResponse(BaseModel):
    prediction: float
    confidence: float

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest, req: Request):
    features = np.array(request.features).reshape(1, -1)
    prediction = model.predict(features)[0]

    return PredictionResponse(
        prediction=float(prediction),
        confidence=0.95,
    )

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}
```

## Deployment Strategies

### Canary Deployment

```python
# canary_deploy.py
class CanaryDeployer:
    def __init__(self, k8s_client, monitoring_client):
        self.k8s = k8s_client
        self.monitoring = monitoring_client

    def deploy_canary(self, model_uri: str, deployment_name: str, namespace: str,
                      canary_percentage: int = 5, observation_minutes: int = 30):
        # Deploy canary with small traffic share
        canary_replicas = max(1, int(10 * canary_percentage / 100))
        self._update_deployment(deployment_name + '-canary', namespace, model_uri, canary_replicas)

        # Wait for observation period
        import time
        time.sleep(observation_minutes * 60)

        # Evaluate canary metrics
        metrics = self.monitoring.get_recent_metrics(
            deployment=deployment_name + '-canary',
            duration_minutes=observation_minutes,
        )

        if self._should_roll_forward(metrics):
            # Roll forward: increase canary, decrease stable
            self._roll_forward(deployment_name, namespace)
        else:
            # Roll back: remove canary
            self._rollback(deployment_name, namespace)

    def _should_roll_forward(self, metrics: dict) -> bool:
        thresholds = {
            'error_rate': 0.01,     # < 1% errors
            'p95_latency_ms': 500,  # < 500ms
            'prediction_drift': 0.05,  # < 5% prediction distribution shift
        }
        for metric, threshold in thresholds.items():
            if metrics.get(metric, 0) > threshold:
                return False
        return True

    def _roll_forward(self, deployment_name: str, namespace: str):
        # Gradually increase canary to 100% over multiple steps
        percentages = [25, 50, 75, 100]
        for pct in percentages:
            self._update_traffic_split(deployment_name, namespace, pct)
            time.sleep(300)  # 5 min observation per step
            if not self._should_roll_forward(self.monitoring.get_recent_metrics(
                deployment=deployment_name, duration_minutes=5
            )):
                self._rollback(deployment_name, namespace)
                return
        # Promote canary to stable
        self._promote_canary(deployment_name, namespace)
```

### Blue-Green Deployment

```yaml
# blue-green-deploy.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation-model
spec:
  predictor:
    canary:
      trafficPercent: 0  # Blue (existing) handles 100%
    containers:
      - image: model-server:blue
        name: kserve-container
        env:
          - name: MODEL_URI
            value: models:/recommendation-v2/Production
---
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: recommendation-model-green
spec:
  predictor:
    containers:
      - image: model-server:green
        name: kserve-container
        env:
          - name: MODEL_URI
            value: models:/recommendation-v3/Staging
```

## Pipeline Automation Patterns

### Pattern 1: Conditional Retraining

```python
class RetrainTrigger:
    def __init__(self, monitor_client, pipeline_client):
        self.monitor = monitor_client
        self.pipeline = pipeline_client

    async def check_and_trigger_retrain(self, model_name: str):
        drift_metrics = await self.monitor.get_drift_metrics(model_name)
        performance_metrics = await self.monitor.get_performance_metrics(model_name)

        triggers = []

        # Data drift trigger
        if drift_metrics['feature_drift_score'] > 0.15:
            triggers.append('data_drift')

        # Concept drift trigger
        if performance_metrics['accuracy_delta'] < -0.05:
            triggers.append('concept_drift')

        # Schedule-based trigger
        days_since_training = await self.monitor.get_days_since_training(model_name)
        if days_since_training > 30:
            triggers.append('schedule')

        if triggers:
            await self.pipeline.trigger_training(
                model_name=model_name,
                reason=triggers,
                urgency='high' if 'concept_drift' in triggers else 'normal',
            )
            return {'triggered': True, 'reasons': triggers}

        return {'triggered': False}
```

### Pattern 2: Automated Shadow Deployment

```python
class ShadowDeployer:
    def __init__(self, production_client, shadow_client):
        self.prod = production_client
        self.shadow = shadow_client

    def deploy_shadow(self, model_uri: str, shadow_name: str, observation_days: int):
        # Deploy shadow that receives copy of production traffic
        self.shadow.deploy(shadow_name, model_uri, mode='shadow')

        # Collect comparison data
        results = []
        for day in range(observation_days):
            daily_comparison = self._compare_predictions(shadow_name, day)
            results.append(daily_comparison)

        # Analyze results
        final_analysis = self._analyze_shadow_results(results)
        return final_analysis

    def _compare_predictions(self, shadow_name: str, day: int):
        prod_predictions = self.prod.get_predictions(date_offset=day)
        shadow_predictions = self.shadow.get_predictions(shadow_name, date_offset=day)

        return {
            'agreement_rate': np.mean(prod_predictions == shadow_predictions),
            'prod_label_distribution': self._distribution(prod_predictions),
            'shadow_label_distribution': self._distribution(shadow_predictions),
            'prod_avg_confidence': np.mean(prod_predictions.confidence),
            'shadow_avg_confidence': np.mean(shadow_predictions.confidence),
        }
```

## Pipeline Testing

```python
# test_training_pipeline.py
import pytest
import pandas as pd
import numpy as np
from datetime import datetime

class TestTrainingPipeline:
    @pytest.fixture
    def sample_data(self):
        return pd.DataFrame({
            'feature_1': np.random.randn(1000),
            'feature_2': np.random.randn(1000),
            'target': np.random.randint(0, 2, 1000),
        })

    def test_data_validation_passes(self, sample_data):
        result = validate_features(sample_data)
        assert result is not None
        assert len(result) == len(sample_data)

    def test_training_produces_artifact(self, tmp_path):
        pipeline = TrainingPipeline(
            tracking_uri=f'sqlite:///{tmp_path}/mlflow.db',
            experiment_name='test',
        )
        result = pipeline.train_candidate({
            'name': 'test-model',
            'params': {'max_depth': 3, 'learning_rate': 0.1},
            'test_data': None,
            'model_name': 'test-model',
            'primary_metric': 'accuracy',
            'threshold': 0.5,
        })
        assert result['passed_threshold'] == True
        assert result['run_id'] is not None

    def test_evaluation_compares_to_baseline(self, tmp_path):
        evaluator = ModelEvaluator(baseline_model_uri='tests/fixtures/baseline_model')
        test_data = load_test_data('tests/fixtures/test_data.parquet')
        result = evaluator.evaluate_candidate(
            'tests/fixtures/candidate_model',
            test_data,
        )
        assert 'accuracy_delta' in result.metrics
        assert 'candidate_latency_ms' in result.metrics

    def test_canary_rollback_on_bad_metrics(self):
        deployer = CanaryDeployer(mock_k8s, mock_monitor)
        mock_monitor.set_metrics({'error_rate': 0.05, 'p95_latency_ms': 1000})
        assert deployer._should_roll_forward(mock_monitor.get_recent_metrics('test', 5)) == False
```

## Pipeline Observability

### Metrics to Track

```prometheus
# Pipeline metrics
ml_pipeline_duration_seconds{pipeline="training", status="success"}
ml_pipeline_duration_seconds{pipeline="training", status="failure"}
ml_pipeline_run_total{pipeline="training", status="success"}
ml_pipeline_run_total{pipeline="training", status="failure"}

# Model metrics
ml_model_accuracy{model="recommendation-v3", stage="production"}
ml_model_latency_p95{model="recommendation-v3", stage="production"}
ml_model_error_rate{model="recommendation-v3", stage="production"}

# Drift metrics
ml_data_drift_score{model="recommendation-v3", feature="user_embedding"}
ml_concept_drift_score{model="recommendation-v3"}

# Registry metrics
ml_registry_version_count{model="recommendation", stage="production"}
ml_registry_promotion_total{model="recommendation", from_stage="staging", to_stage="production"}
```

## References
- references/ml-cicd-pipeline.md — ML CI/CD Pipeline
- references/ml-deployment.md — ML Deployment & Monitoring
- references/ml-experiment-tracking.md — ML Experiment Tracking
- references/ml-retraining.md — ML Model Retraining
- references/mlops-model-governance.md — MLOps Model Governance
- references/mlops-advanced.md — MLOps Advanced Topics
