# Experiment Tracking Fundamentals

What to record for every ML training run, how tracking tools organize it, and the minimum workflow that makes results comparable and reproducible. Examples use MLflow (open source, self-hostable) and Weights & Biases; concepts carry over to Neptune, Comet, ClearML and Vertex AI Experiments.

## What to Track

| Category | Examples | Why |
|----------|----------|-----|
| Parameters | learning rate, batch size, model architecture, feature set version | Explain differences between runs |
| Metrics | train/val loss per epoch, accuracy, F1, AUC, latency | Compare and select models |
| Code version | Git commit SHA, dirty-tree flag | Reproduce training code |
| Data version | Dataset path + hash/version (DVC, lakeFS, table snapshot ID) | Same code on different data gives different models |
| Environment | Python and library versions, CUDA/driver, container image digest | Reproduce numerics |
| Artifacts | Model weights, preprocessing objects, plots, confusion matrices, sample predictions | Inspect and deploy |
| Context | Author, purpose/hypothesis, tags (`baseline`, `ablation`) | Find and interpret runs later |

If a run cannot be traced to code + data + config, its metric is an anecdote.

## Core Concepts

| Concept | MLflow | W&B |
|---------|--------|-----|
| Grouping | Experiment | Project |
| Single training execution | Run | Run |
| Configuration | Params (immutable per run) | `config` |
| Time series values | Metrics with `step` | `wandb.log({...}, step=...)` |
| Files | Artifacts | Artifacts (versioned) |
| Labels | Tags | Tags, groups, job types |
| Model catalog | Model Registry with versions and aliases | Model Registry / registry collections |

## MLflow Basics

```python
import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, roc_auc_score

mlflow.set_tracking_uri("http://mlflow.internal:5000")   # or MLFLOW_TRACKING_URI env var
mlflow.set_experiment("churn-model")

params = {"n_estimators": 300, "max_depth": 12, "min_samples_leaf": 5, "random_state": 42}

with mlflow.start_run(run_name="rf-baseline") as run:
    mlflow.set_tags({"git_sha": git_sha(), "data_version": "churn_features@v14", "purpose": "baseline"})
    mlflow.log_params(params)

    model = RandomForestClassifier(**params).fit(X_train, y_train)
    proba = model.predict_proba(X_val)[:, 1]
    mlflow.log_metrics({
        "val_f1": f1_score(y_val, proba > 0.5),
        "val_auc": roc_auc_score(y_val, proba),
    })

    mlflow.sklearn.log_model(model, name="model", input_example=X_val.iloc[:5])
```

- `input_example` lets MLflow infer and store a model signature (input/output schema).
- `mlflow.autolog()` captures parameters, metrics and models for supported libraries (scikit-learn, PyTorch Lightning, XGBoost, LightGBM, Transformers and others); still add tags for data version and purpose.
- MLflow 3 uses `name=` for `log_model`; older code passes `artifact_path=`, which is deprecated.

## Weights & Biases Basics

```python
import wandb

run = wandb.init(
    project="churn-model",
    config=params,
    tags=["baseline"],
    notes="RF baseline on churn_features v14",
)
for epoch in range(epochs):
    train_loss, val_loss = train_one_epoch(...)
    wandb.log({"train/loss": train_loss, "val/loss": val_loss}, step=epoch)

artifact = wandb.Artifact("churn-rf", type="model")
artifact.add_file("model.joblib")
run.log_artifact(artifact)
run.finish()
```

W&B captures Git state and system metrics (GPU utilization, memory) automatically when available.

## Logging Metrics Well

- Log per step/epoch for learning curves, plus final summary metrics for comparison tables.
- Use consistent names with prefixes (`train/loss`, `val/loss`, `test/f1`); never compare a metric named differently across runs.
- Log the evaluation set identity with the metric; "val_auc" on a different split is a different metric.
- Record the decision threshold if metrics depend on one.
- Log uncertainty where possible (cross-validation mean and std, bootstrap confidence intervals).

## Reproducibility Minimum

```python
import random, numpy as np, torch

def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

seed_everything(params["random_state"])
mlflow.log_param("seed", params["random_state"])
mlflow.log_artifact("requirements.lock")          # or uv.lock / conda env export
```

Full GPU determinism may require `torch.use_deterministic_algorithms(True)` and costs speed; document whether runs are expected to be bit-reproducible or only statistically reproducible.

## Organizing Experiments

| Practice | Example |
|----------|---------|
| One experiment/project per modelling problem | `churn-model`, not per person |
| Run names describe the change | `rf-depth12-featv14` |
| Tags for filtering | `baseline`, `ablation:no-tenure`, `candidate` |
| Parent/child runs for sweeps | Parent = sweep, children = trials |
| Notes record the hypothesis and conclusion | "Hypothesis: tenure buckets help. Result: +0.4 AUC, keep." |

## Comparing Runs

- Compare in the UI (parallel coordinates, metric charts) or programmatically:

```python
runs = mlflow.search_runs(
    experiment_names=["churn-model"],
    filter_string="tags.data_version = 'churn_features@v14' and metrics.val_auc > 0.8",
    order_by=["metrics.val_auc DESC"],
    max_results=10,
)
print(runs[["run_id", "params.max_depth", "metrics.val_auc", "metrics.val_f1"]])
```

- Compare only runs evaluated on the same data and split.
- Prefer differences larger than run-to-run noise (rerun the best config with different seeds).

## From Run to Registry

```python
mv = mlflow.register_model(f"runs:/{run.info.run_id}/model", "churn-classifier")
client = mlflow.MlflowClient()
client.set_registered_model_alias("churn-classifier", "challenger", mv.version)
```

Registry aliases (`champion`, `challenger`) replaced the older fixed stages (Staging/Production), which are deprecated. Deployments load by alias: `models:/churn-classifier@champion`.

## Checklist

- [ ] Every run records params, metrics, Git SHA, data version, environment
- [ ] Consistent metric names and evaluation sets
- [ ] Seeds logged; reproducibility level documented
- [ ] Experiments organized by problem with descriptive run names and tags
- [ ] Models logged with signatures; promotion via registry aliases
