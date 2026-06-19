---
name: ml-ml-pipeline
description: >
  Use this skill when building ML pipelines: Kubeflow Pipelines, TFX, SageMaker Pipelines, Vertex AI Pipelines, ML CI/CD, model training pipeline, data validation, model validation, pipeline orchestration.
  This skill enforces: pipeline component decomposition, data validation gates, model validation thresholds, CI/CD integration, artifact tracking, pipeline versioning.
  Do NOT use for: model training hyperparameter tuning, feature store configuration, model serving deployment.
version: "2.0.0"
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

## Architecture/Decision Trees

### Pipeline Orchestrator Selection
```
Infrastructure and scale
  ├── Kubernetes available
  │   ├── Google Cloud → Vertex AI Pipelines (managed Kubeflow)
  │   ├── AWS → SageMaker Pipelines (native integration)
  │   ├── Open-source K8s → Kubeflow Pipelines (self-managed)
  │   └── Multi-cloud → Argo Workflows + ML metadata
  ├── No Kubernetes
  │   ├── Python-native → Prefect / Airflow (DAG-based)
  │   ├── Lightweight → Flyte (K8s optional, Python SDK)
  │   └── Simple → GitHub Actions / GitLab CI (for basic pipelines)
  └── Cloud-managed
      ├── GCP → Vertex AI Pipelines (serverless)
      ├── AWS → SageMaker Pipelines (serverless)
      └── Azure → Azure ML Pipelines (serverless)
```

### Component Decomposition
```
Standard ML Pipeline Components
  ├── Data Ingestion
  │   ├── Extract from source (S3/BQ/Kafka/API)
  │   ├── Partition strategy (date, region)
  │   └── Validate schema
  ├── Data Validation
  │   ├── Schema compliance (TFDV / Great Expectations)
  │   ├── Data quality (null %, distribution shift)
  │   └── Anomaly detection (data drift)
  ├── Data Transformation
  │   ├── Feature engineering
  │   ├── Scaling / encoding / imputation
  │   └── Train/val/test split
  ├── Model Training
  │   ├── Hyperparameter tuning (Optuna/Ray Tune)
  │   ├── Experiment tracking (MLflow)
  │   └── Model checkpointing
  ├── Model Evaluation
  │   ├── Metrics computation
  │   ├── Baseline comparison
  │   ├── Fairness audit
  │   └── Threshold enforcement
  └── Model Deployment
      ├── Push to model registry
      ├── Deploy to staging
      └── Promote to production
```

### Validation Gates
```
Gate placement and actions
  ├── Gate 1: Data Validation
  │   Check: Schema compliance, data quality, distribution shift
  │   Action on FAIL: Block pipeline, alert data team
  ├── Gate 2: Model Validation
  │   Check: Metric thresholds, fairness constraints, latency budget
  │   Action on FAIL: Block deployment, auto-rollback
  ├── Gate 3: Staging Validation
  │   Check: Shadow traffic metrics, canary health
  │   Action on FAIL: Halt promotion, roll back to previous
  └── Gate 4: Production Monitoring
      Check: Real-time metric degradation, data drift
      Action on FAIL: Auto-rollback, trigger retraining
```

## Agent Protocol

### Trigger
User request includes: ML pipeline, Kubeflow, TFX, SageMaker Pipelines, Vertex AI Pipelines, ML CI/CD, model training pipeline, data validation, model validation, pipeline orchestration.

### Protocol
1. Clarify ML task type, data source, training frequency, and deployment target.
2. Decompose pipeline into components: data ingestion, validation, transformation, training, evaluation, deployment.
3. Configure data validation gates with schema enforcement and anomaly detection.
4. Set model validation thresholds for accuracy, fairness, and performance.
5. Design CI/CD integration with staged promotion and rollback.
6. Specify artifact tracking and pipeline versioning strategy.

### Output
ML pipeline architecture with component design, validation gates, CI/CD integration.

### Response Format
```
## ML Pipeline Configuration
### Components
- Data Ingestion: {source} | {schedule} | {partition strategy}
- Data Validation: {framework} | {schema source} | {anomaly threshold}
- Data Transformation: {framework} | {features in/out}
- Model Training: {framework} | {algorithm} | {hyperparameter source}
- Model Evaluation: {metrics} | {thresholds}
- Model Deployment: {target} | {strategy} | {rollback condition}

### Validation Gates
| Gate | Check | Action on Fail |

### CI/CD Pipeline
- Trigger: {commit / schedule / manual}
- Staging: {dev → staging → prod}
- Promotion Gate: {validation + approval}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Pipeline decomposed into discrete components with single responsibility.
- [ ] Data validation gate configured with schema and quality checks.
- [ ] Model validation thresholds set for accuracy and fairness.
- [ ] CI/CD integration defined with staging environments.
- [ ] Artifact tracking configured for all pipeline outputs.
- [ ] Rollback strategy documented.

## Workflow

### Step 1: Pipeline Decomposition
Break ML workflow into components: Data Ingestion (poll sources, partition), Data Validation (schema, null check, distribution), Data Transformation (feature engineering, scaling), Model Training (algorithm, tuning), Model Evaluation (metrics, baseline, fairness), Model Deployment (registry, staging, production).

```python
# Kubeflow Pipeline definition
from kfp import dsl

@dsl.component(base_image="python:3.10")
def validate_data(input_data: str) -> str:
    """Validate data schema and quality."""
    import tensorflow_data_validation as tfdv
    stats = tfdv.generate_statistics_from_csv(input_data)
    schema = tfdv.infer_schema(stats)
    anomalies = tfdv.validate_statistics(stats, schema)
    assert len(anomalies.anomaly_info) == 0, f"Anomalies: {anomalies}"
    return input_data

@dsl.component(base_image="python:3.10")
def transform_data(input_data: str) -> str:
    """Feature engineering and transformation."""
    import pandas as pd
    df = pd.read_csv(input_data)
    # Feature engineering steps
    df.to_parquet("/data/transformed.parquet")
    return "/data/transformed.parquet"

@dsl.component(base_image="python:3.10")
def train_model(data_path: str, hp_path: str) -> str:
    """Model training with tracked hyperparameters."""
    import mlflow
    with mlflow.start_run():
        model = train(data_path, hp_path)
        mlflow.sklearn.log_model(model, "model")
        return mlflow.active_run().info.run_id

@dsl.pipeline(name="training-pipeline")
def ml_pipeline(data_url: str):
    validate = validate_data(input_data=data_url)
    transform = transform_data(input_data=validate.output)
    train = train_model(
        data_path=transform.output,
        hp_path="/hps/best_params.json",
    )
```

### Step 2: Configure Data Validation
Use TensorFlow Data Validation or Great Expectations:
```python
import tensorflow_data_validation as tfdv

stats = tfdv.generate_statistics_from_csv(data_location='train.csv')
schema = tfdv.infer_schema(statistics=stats)
tfdv.display_schema(schema=schema)

new_stats = tfdv.generate_statistics_from_csv(data_location='new_data.csv')
anomalies = tfdv.validate_statistics(statistics=new_stats, schema=schema)
tfdv.display_anomalies(anomalies=anomalies)
```

### Step 3: Configure Model Validation
```python
evaluation_config = {
    'accuracy': {'min_threshold': 0.85},
    'precision': {'min_threshold': 0.80},
    'recall': {'min_threshold': 0.80},
    'f1_score': {'min_threshold': 0.82},
    'fairness': {
        'demographic_parity': {'max_diff': 0.05},
        'equal_opportunity': {'max_diff': 0.05},
    },
    'latency': {'p99_ms': 100},
}
```

### Step 4: Design CI/CD Pipeline
```yaml
name: ML Pipeline
on:
  push:
    branches: [main]
    paths: ['pipelines/**', 'components/**']
  schedule:
    - cron: '0 6 * * 1'

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
import mlflow

mlflow.set_experiment('ml-pipeline')
with mlflow.start_run():
    mlflow.log_params({'learning_rate': 0.001, 'epochs': 50})
    mlflow.log_metrics({'accuracy': 0.92, 'f1': 0.89})
    mlflow.log_artifact('model.pkl')
    mlflow.register_model('runs:/<run_id>/model', 'production-model')
```

### Step 6: Pipeline Orchestration (TFX)
```python
import tfx.v1 as tfx

pipeline = tfx.dag_runner.Pipeline(
    pipeline_name="churn-prediction",
    pipeline_root="gs://ml-pipeline-artifacts/",
    components=[
        tfx.components.CsvExampleGen(input_base="gs://data/churn/"),
        tfx.components.StatisticsGen(examples=example_gen.outputs['examples']),
        tfx.components.SchemaGen(statistics=statistics_gen.outputs['statistics']),
        tfx.components.ExampleValidator(
            statistics=statistics_gen.outputs['statistics'],
            schema=schema_gen.outputs['schema'],
        ),
        tfx.components.Transform(
            examples=example_gen.outputs['examples'],
            schema=schema_gen.outputs['schema'],
            module_file="transform.py",
        ),
        tfx.components.Trainer(
            module_file="trainer.py",
            examples=transform.outputs['transformed_examples'],
            schema=schema_gen.outputs['schema'],
        ),
        tfx.components.Evaluator(
            examples=transform.outputs['transformed_examples'],
            model=trainer.outputs['model'],
        ),
        tfx.components.Pusher(
            model=trainer.outputs['model'],
            push_destination=tfx.proto.PushDestination(
                filesystem=tfx.proto.PushDestination.Filesystem(
                    base_directory="gs://models/churn/"
                )
            ),
        ),
    ],
)
```

## Anti-Patterns

- **Monolithic pipeline component**: Single component does everything → hard to debug, cannot retry individual steps.
- **No data validation gate**: Training on corrupted data → wasted GPU hours, bad model.
- **Tuning hyperparameters on test set**: Leaks test data into training decisions.
- **No model validation gate**: Deploying models below minimum quality threshold.
- **Manual promotion without CI/CD**: Human error in deployment process.
- **No artifact tracking**: Cannot reproduce any pipeline run.
- **No rollback plan**: Stuck with bad model in production.
- **Training pipeline coupled to serving code**: Changes to training break serving.
- **Not containerizing components**: Inconsistent environments across runs.

## Production Considerations

### Monitoring
- Track pipeline execution time per component.
- Monitor data quality metrics over time.
- Alert on data drift or schema violations.
- Track model performance degradation.
- Monitor resource utilization per component.

### Scaling
- Parallel component execution where dependencies allow.
- GPU for training, CPU for validation/transformation.
- Distributed training for large models (DDP/FSDP).
- Preemptible instances for non-critical components.

### Cost Optimization
- Use spot instances for training.
- Cache intermediate artifacts.
- Skip re-running unchanged components.
- Right-size compute per component type.

## CI/CD Patterns for ML Pipelines

### Pattern: CI — Validation on Data Change
```yaml
# .github/workflows/data-validation.yml
name: Data Validation
on:
  pull_request:
    paths:
      - "data/**"
      - "features/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate schema
        run: python validate_schema.py --data data/ --schema schemas/
      - name: Check data quality
        run: python data_quality_checks.py --data data/ --threshold 0.95
      - name: Validate feature definitions
        run: python validate_features.py --features features/
      - name: Run integration tests
        run: python -m pytest tests/test_data_pipeline.py -v
```

### Pattern: CI — Validation on Code Change
```yaml
name: Model CI
on:
  pull_request:
    paths:
      - "src/**"
      - "models/**"
      - "requirements.txt"

jobs:
  model-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Unit tests
        run: python -m pytest tests/ -v --cov=src/ --cov-fail-under=80
      - name: Lint and type check
        run: |
          ruff check src/
          mypy src/
      - name: Test training (small sample)
        run: python train.py --sample 1000 --epochs 1
      - name: Test evaluation
        run: python evaluate.py --model outputs/model.pt --sample 500
```

### Pattern: CD — Staged Promotion
```yaml
name: Model CD
on:
  push:
    branches: [main]

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - name: Full training
        run: python train.py --config configs/prod.yaml
      - name: Evaluate
        run: python evaluate.py --model outputs/model.pt --output metrics.json
      - name: Check gates
        run: python check_gates.py --metrics metrics.json --thresholds configs/thresholds.yaml
      - name: Register model (if gates pass)
        run: python register_model.py --model-path outputs/model.pt --metrics metrics.json

  promote-to-staging:
    needs: [train]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: kubectl apply -f deploy/staging-deployment.yaml
      - name: Smoke tests
        run: python smoke_tests.py --endpoint https://staging.model-api.com
      - name: Shadow traffic test
        run: python shadow_test.py --live-endpoint prod --shadow-endpoint staging

  promote-to-prod:
    needs: [promote-to-staging]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Canary deploy (5%)
        run: python deploy_canary.py --percent 5
      - name: Monitor canary
        run: python monitor_canary.py --duration 30m --metric error_rate --threshold 0.01
      - name: Rollout to 100%
        run: python deploy_full_rollout.py
      - name: Verify
        run: python verify_deployment.py --endpoint https://model-api.com
```

## Component Decomposition Templates

### Template: Standard ML Pipeline Components
```
pipeline/
├── data_ingestion/
│   ├── Dockerfile
│   ├── connector.py        # source-specific (S3, BigQuery, Kafka)
│   └── config.yaml         # source, schema, partition config
├── data_validation/
│   ├── schema.py           # Great Expectations / Pandera schema
│   ├── quality.py          # null rate, distribution, freshness checks
│   └── config.yaml         # thresholds per check
├── feature_engineering/
│   ├── transformations.py  # feature computation logic
│   ├── features.yaml       # feature definitions and dependencies
│   └── config.yaml         # window sizes, aggregation config
├── training/
│   ├── model.py            # model architecture definition
│   ├── train.py            # training loop with logging
│   ├── config.yaml         # hyperparameters, data splits
│   └── Dockerfile
├── evaluation/
│   ├── evaluate.py         # compute all metrics
│   ├── gates.py            # pass/fail logic for model promotion
│   └── config.yaml         # metric thresholds
├── deployment/
│   ├── serve.py            # model serving code
│   ├── Dockerfile
│   └── k8s.yaml            # Kubernetes deployment config
└── monitoring/
    ├── drift.py             # data drift detection
    ├── performance.py       # online metric computation
    └── alerts.yaml          # alert rules and thresholds
```

### Template: Component Interface Contract
```python
# Each pipeline component must implement this contract
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class ComponentInput:
    data_path: str
    config_path: str
    artifact_store: str
    metadata: dict

@dataclass
class ComponentOutput:
    artifact_path: str
    metrics: dict
    metadata: dict

class PipelineComponent(ABC):
    @abstractmethod
    def run(self, input_data: ComponentInput) -> ComponentOutput:
        """Execute the component and return output artifacts."""
        pass

    @abstractmethod
    def validate(self, input_data: ComponentInput) -> bool:
        """Validate input before execution."""
        pass
```

## Pipeline Orchestration Comparison

| Framework | Abstraction | UI | Schedule | Retry | DAG Dependencies | Best For |
|-----------|-------------|----|----------|-------|------------------|----------|
| Kubeflow Pipelines | KFP SDK | Yes | Cron | Yes | Explicit | K8s-native teams |
| TFX | TFX SDK | Yes | Metadata | Yes | Automatic | TensorFlow teams |
| Airflow | Python DAGs | Yes | Cron/Sensor | Yes | Explicit | General orchestration |
| Prefect | Python flows | Yes | Cron/Events | Yes | Explicit | Python-heavy teams |
| Flyte | Python tasks | Yes | Cron | Yes | Automatic + explicit | ML-focused teams |
| MLflow Pipelines | YAML/CLI | No | Manual | No | Sequential | Small teams |

## Pipeline Anti-Patterns

1. **Monolithic pipeline**: One giant script doing ingestion -> training -> deployment
   Fix: Break into single-responsibility components with explicit I/O contracts
2. **No artifact caching**: Re-running entire pipeline for every change
   Fix: Cache intermediate artifacts; skip unchanged components
3. **Mixing dev/prod config**: Same pipeline config for development and production
   Fix: Separate config files per environment with validation
4. **No data validation**: Training on corrupted data without detection
   Fix: Data validation gate as first component in every pipeline run
5. **No rollback capability**: Cannot revert to previous model version
   Fix: Keep last 3 models, auto-rollback on metric degradation
6. **Manual promotion**: Human clicks "deploy to prod" every time
   Fix: Automated staged promotion with gating at each stage

## Rules
- Every pipeline component has single responsibility and explicit I/O.
- Data validation runs before transformation.
- Model validation gates block deployment if thresholds not met.
- All pipeline artifacts versioned and tracked.
- CI/CD includes validation, training, evaluation, promotion.
- Staged promotion (dev to staging to prod) with auto-rollback.
- Pipeline metadata stored in experiment tracker.
- Data drift detection triggers pipeline re-execution.
- Components are containerized and versioned.
- Rollback restores previous model version.

## References
  - references/kubeflow-tfx.md — Kubeflow Pipelines & TFX
  - references/ml-cicd.md — CI/CD for ML Pipelines
  - references/ml-pipeline-advanced.md — ML Pipeline Advanced Topics
  - references/ml-pipeline-fundamentals.md — ML Pipeline Fundamentals
  - references/pipeline-monitoring.md — ML Pipeline Monitoring
  - references/pipeline-orchestration.md — ML Pipeline Orchestration
## Handoff
For model serving deployment, hand off to `ml-model-serving`. For feature store configuration, hand off to `ml-feature-store`.
