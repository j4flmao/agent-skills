# MLOps Fundamentals: Lifecycle, Artifacts, Reproducibility and Maturity

MLOps applies DevOps practices to machine learning systems, where behavior depends on code, data and trained parameters together. This reference covers the ML lifecycle, the artifacts that must be versioned, reproducibility, the main platform components, maturity levels and common failure modes. Pipeline automation, deployment, retraining and governance are covered in sibling references.

## Why ML Systems Need More Than DevOps

| Aspect | Traditional software | ML system |
|--------|---------------------|-----------|
| Behavior defined by | Code | Code + data + hyperparameters + random seeds |
| Testing | Unit/integration tests on logic | Plus data validation, model quality metrics, fairness, robustness |
| Failure mode | Errors, crashes | Silent degradation (drift) with no errors |
| Release artifact | Binary / image | Model artifact + serving code + feature definitions |
| Change trigger | Code change | Code change, new data, drift, schedule |

## Lifecycle

```text
Problem framing -> Data collection & labeling -> Data validation -> Feature engineering
  -> Training & tuning -> Evaluation (offline) -> Registration & approval
  -> Deployment (batch / online / edge) -> Monitoring (data, predictions, outcomes)
  -> Retraining or rollback -> (loop)
```

Each arrow is a handoff that should be automated and recorded as the system matures.

## Artifacts to Version

| Artifact | Tooling examples | Why |
|----------|------------------|-----|
| Code | Git | Reproducibility, review |
| Data snapshots / dataset versions | DVC, lakeFS, Delta/Iceberg time travel, dataset hashes | Retrain the exact model; audit |
| Features (definitions) | Feature store (Feast, Tecton, Databricks), dbt models | Training/serving consistency |
| Environment | Lock files (`uv.lock`, `poetry.lock`), container images | Same libraries in training and serving |
| Hyperparameters and configs | Config files (Hydra, YAML) tracked with runs | Explain results |
| Experiments | MLflow, Weights & Biases, Neptune, Comet | Compare runs, lineage |
| Models | Model registry (MLflow Model Registry, SageMaker, Vertex AI, Azure ML) | Promotion, rollback |
| Evaluation reports | Stored with the model version | Approval evidence |

Lineage target: from any prediction in production you can identify model version, training run, code commit, data version and feature definitions.

## Reproducibility Basics

```python
import random
import numpy as np
import torch

def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
```

- Seeds reduce but do not eliminate nondeterminism (GPU kernels, parallel data loading). For strict determinism in PyTorch, set `torch.use_deterministic_algorithms(True)` and accept the performance cost.
- Record library versions and hardware type with each run.
- Read training data through versioned references, never "latest" paths.

## Experiment Tracking Minimal Example (MLflow)

```python
import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score

mlflow.set_experiment("churn")

with mlflow.start_run(run_name="rf-baseline") as run:
    params = {"n_estimators": 300, "max_depth": 8, "random_state": 42}
    mlflow.log_params(params)
    mlflow.set_tag("data_version", data_version)          # e.g. DVC rev or table snapshot id

    model = RandomForestClassifier(**params).fit(X_train, y_train)
    auc = roc_auc_score(y_valid, model.predict_proba(X_valid)[:, 1])
    mlflow.log_metric("valid_auc", auc)

    mlflow.sklearn.log_model(model, name="model", input_example=X_train.head(5),
                             registered_model_name="churn-classifier")
```

The `name=` argument is the MLflow 3 form; MLflow 2.x uses `artifact_path=`. Registry promotion in recent MLflow versions uses **aliases** (for example `champion`, `challenger`) instead of the deprecated stages (`Staging`, `Production`).

## Platform Components

| Component | Purpose | Examples |
|-----------|---------|----------|
| Data/feature layer | Versioned training data and online features | Lakehouse tables, Feast |
| Orchestration | Pipelines for training, evaluation, batch inference | Airflow, Kubeflow Pipelines, Vertex AI Pipelines, SageMaker Pipelines, Dagster, Prefect, Metaflow, ZenML |
| Compute | CPUs/GPUs for training and serving | Kubernetes, managed training jobs, Ray |
| Tracking and registry | Experiments, model versions, approvals | MLflow, W&B, cloud registries |
| Serving | Online/batch inference | KServe, Seldon Core, BentoML, Ray Serve, Triton, managed endpoints; vLLM/SGLang for LLMs |
| Monitoring | Data drift, prediction quality, service health | Evidently, WhyLabs, Arize, NannyML, Prometheus |

Start with the smallest set that solves your current pain; many teams run well with Git + DVC/lakehouse + MLflow + one orchestrator + container serving.

## Training-Serving Skew

The most common production bug in ML: features computed differently at training time and serving time.

| Cause | Prevention |
|-------|------------|
| Separate code paths for offline and online features | Shared feature definitions (feature store or shared library) |
| Point-in-time leakage in training data | Point-in-time correct joins (features as of the label timestamp) |
| Different preprocessing libraries/versions | Package preprocessing with the model (scikit-learn `Pipeline`, model signature) |
| Default values for missing data differ | Explicit schema and validation at serving time |

## Data Validation

Validate data before training and at inference:

- Schema: columns, types, allowed categories.
- Distributions: ranges, null rates, cardinality compared with a reference.
- Freshness and volume.

Tools: Great Expectations, Pandera, TensorFlow Data Validation, Deequ, or dbt tests for upstream tables.

## Maturity Levels

| Level | Characteristics |
|-------|-----------------|
| 0: Manual | Notebooks, manual training and handoff, no monitoring |
| 1: Pipeline automation | Automated training pipeline, experiment tracking, registry, continuous training on new data |
| 2: CI/CD for pipelines | Pipeline code tested and deployed through CI/CD, automated evaluation gates, monitoring-driven retraining, full lineage |

Progress is driven by need: a model retrained yearly may not need level 2.

## Roles

| Role | Focus |
|------|-------|
| Data scientist | Problem framing, features, modeling, evaluation |
| ML engineer | Pipelines, serving, performance, reliability |
| Data engineer | Data pipelines, quality, feature data |
| Platform / MLOps engineer | Shared tooling, compute, security, standards |
| Product owner / domain expert | Success metrics, acceptance, risk |

## Common Pitfalls

| Pitfall | Consequence |
|---------|-------------|
| Notebook-only training | Not reproducible, no review |
| Evaluating on leaked or non-representative data | Offline metrics overstate production performance |
| No baseline model | Cannot tell if complexity pays off |
| Monitoring only latency/errors | Silent accuracy decay goes unnoticed |
| Model shipped without its preprocessing | Training-serving skew |
| No owner after launch | Degradation without response |

## Checklist

- [ ] Code, data version, environment, config and model linked for every run
- [ ] Experiments tracked; models registered with aliases and evaluation evidence
- [ ] Preprocessing packaged with the model; feature definitions shared
- [ ] Data validation before training and at serving
- [ ] Baseline and offline evaluation on a representative holdout
- [ ] Production monitoring covers data drift, prediction quality and service health
- [ ] Named owner for each production model
