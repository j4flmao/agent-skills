# ML Pipeline Fundamentals

An ML pipeline turns raw data into a deployed, monitored model through repeatable, versioned steps. This reference covers the standard stages, the artifacts each produces, reproducibility requirements, and a minimal working pipeline with scikit-learn and MLflow. Orchestrators are covered in `pipeline-orchestration.md` and `kubeflow-tfx.md`; CI/CD in `ml-cicd.md`; monitoring in `pipeline-monitoring.md`.

## 1. Stages and Artifacts

| Stage | Input | Output artifact | Gate |
|---|---|---|---|
| Ingest | Source tables/files | Raw snapshot (versioned) | Schema and freshness checks |
| Validate | Raw snapshot | Validation report | Fails on schema/distribution violations |
| Prepare features | Raw snapshot | Feature dataset + transform code version | Row counts, null rates |
| Split | Features | Train/validation/test sets (time-aware if temporal) | No leakage across splits |
| Train | Train set + config | Model artifact, metrics, params | Training completes, loss sane |
| Evaluate | Model + test set | Metrics, slices, comparison vs baseline/champion | Meets thresholds; no slice regressions |
| Register | Model + metadata | Registry version with lineage | Approval (automatic or human) |
| Deploy | Registered model | Endpoint or batch job | Smoke tests, canary |
| Monitor | Predictions + outcomes | Drift and performance metrics | Alerts / retraining triggers |

Every artifact is immutable and addressable by version so any model can be traced to its exact data, code, and configuration.

## 2. Reproducibility Requirements

- Code: git commit SHA recorded with each run.
- Data: dataset version (snapshot ID, table version, DVC/lakeFS commit, or Delta/Iceberg version).
- Environment: locked dependencies (`uv.lock`, container image digest).
- Configuration: hyperparameters and feature lists in versioned config, not notebook cells.
- Randomness: fixed seeds; note that GPU nondeterminism may still cause small differences.

## 3. Minimal Pipeline (scikit-learn + MLflow)

```python
from __future__ import annotations
import logging
import mlflow
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

log = logging.getLogger(__name__)
NUMERIC = ["tenure_days", "monthly_spend", "tickets_90d"]
CATEGORICAL = ["plan", "region"]

def validate(df: pd.DataFrame) -> None:
    missing = set(NUMERIC + CATEGORICAL + ["churned"]) - set(df.columns)
    if missing:
        raise ValueError(f"input missing columns: {sorted(missing)}")
    if df["churned"].isna().any():
        raise ValueError("label column 'churned' contains nulls")

def build_model(params: dict) -> Pipeline:
    pre = ColumnTransformer([
        ("num", "passthrough", NUMERIC),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
    ])
    return Pipeline([("pre", pre), ("clf", HistGradientBoostingClassifier(**params, random_state=7))])

def run(train: pd.DataFrame, test: pd.DataFrame, params: dict, data_version: str) -> str:
    validate(train); validate(test)
    mlflow.set_experiment("churn")
    with mlflow.start_run() as run:
        mlflow.log_params(params)
        mlflow.set_tags({"data_version": data_version})
        model = build_model(params).fit(train[NUMERIC + CATEGORICAL], train["churned"])
        proba = model.predict_proba(test[NUMERIC + CATEGORICAL])[:, 1]
        metrics = {"roc_auc": roc_auc_score(test["churned"], proba),
                   "pr_auc": average_precision_score(test["churned"], proba)}
        mlflow.log_metrics(metrics)
        mlflow.sklearn.log_model(model, name="model",            # MLflow 3; older versions use artifact_path=
                                 input_example=test[NUMERIC + CATEGORICAL].head(5))
        log.info("run=%s metrics=%s", run.info.run_id, metrics)
        return run.info.run_id
```

Bundling preprocessing and model in one `Pipeline` guarantees the same transformations at training and inference time.

## 4. Splitting Correctly

| Data | Split |
|---|---|
| i.i.d. records | Random stratified split |
| Time-dependent (churn, demand, fraud) | Train on past, validate/test on later periods |
| Grouped (multiple rows per user/patient) | Group split so one entity does not appear in both sets |

Fit preprocessing (scalers, encoders, imputers) only on training data; doing it on the full dataset leaks information.

## 5. Model Registry

```python
from mlflow import MlflowClient

client = MlflowClient()
mv = mlflow.register_model(f"runs:/{run_id}/model", "churn-classifier")
client.set_registered_model_alias("churn-classifier", "challenger", mv.version)
# after evaluation and approval
client.set_registered_model_alias("churn-classifier", "champion", mv.version)

model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
```

Aliases (`champion`, `challenger`) replace the older stage transitions (Staging/Production), which MLflow has deprecated.

## 6. Batch vs Online Inference

| | Batch | Online |
|---|---|---|
| Pattern | Scheduled scoring writes predictions to a table | Request/response API |
| Latency | Minutes–hours | Milliseconds |
| Infrastructure | Same orchestrator as training | Model server (MLflow serving, BentoML, KServe, Ray Serve, managed endpoints) |
| Start with | Most business use cases | Only when decisions need real-time features or responses |

## 7. Pipeline Orchestration Choices

| Tool | Fit |
|---|---|
| Airflow, Dagster, Prefect | General orchestration; Dagster/Prefect have strong asset/data awareness |
| Kubeflow Pipelines, Vertex AI Pipelines | Kubernetes-native ML steps |
| SageMaker Pipelines, Azure ML pipelines | Managed cloud ML |
| Metaflow, ZenML | ML-focused developer experience over multiple backends |

Pick one per organization; consistency matters more than features.

## Pitfalls

- Notebook-only training: no reproducibility or review.
- Preprocessing implemented separately for training and serving.
- Random splits on temporal data, inflating metrics.
- Models promoted without comparing against the current champion.

## Checklist

- [ ] Stages defined with immutable, versioned artifacts.
- [ ] Code SHA, data version, environment, and config logged per run.
- [ ] Preprocessing inside the model pipeline.
- [ ] Split strategy matches data structure; no leakage.
- [ ] Registry with aliases and champion comparison before promotion.
