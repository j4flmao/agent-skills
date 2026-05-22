# Experiment Tracking Platforms

## Weights & Biases (W&B)

### Setup
```python
import wandb

wandb.init(
    project="recommendation-engine",
    entity="your-team",
    config={
        "learning_rate": 0.01,
        "batch_size": 32,
        "architecture": "xgboost",
        "seed": 42,
    },
    tags=["experiment", "v2"],
)

# Step-wise logging
for epoch in range(10):
    train_loss, val_loss, val_auc = train_one_epoch()
    wandb.log({
        "train/loss": train_loss,
        "val/loss": val_loss,
        "val/auc": val_auc,
        "learning_rate": optimizer.param_groups[0]["lr"],
        "epoch": epoch,
    })

# Artifacts
wandb.log_artifact("model.pkl", type="model")
wandb.log({
    "confusion_matrix": wandb.plot.confusion_matrix(y_true=y_test, preds=y_pred, class_names=["neg", "pos"]),
    "roc_curve": wandb.plot.roc_curve(y_test, y_proba, labels=["neg", "pos"]),
})
wandb.finish()
```

### Sweeps (Hyperparameter Search)
```yaml
# sweep.yaml
program: train.py
method: bayes
metric: { name: val/auc, goal: maximize }
parameters:
  learning_rate: { min: 0.001, max: 0.1 }
  max_depth: { values: [4, 6, 8, 10] }
  subsample: { min: 0.6, max: 1.0 }
early_terminate: { type: hyperband, min_iter: 3 }
```

```bash
wandb sweep sweep.yaml
wandb agent <sweep_id>
```

## Neptune

```python
import neptune

run = neptune.init_run(
    project="your-team/recommendation",
    name="xgboost-v2",
    tags=["xgboost", "feature-engineering-v3"],
)
run["model/hyperparameters"] = {"learning_rate": 0.01, "max_depth": 6}
for epoch in range(10):
    run["train/loss"].append(epoch * 0.1)
    run["val/auc"].append(0.8 + epoch * 0.01)
run["model/artifact"].upload("model.pkl")
run.stop()
```

## Platform Comparison

| Feature | MLflow | W&B | Neptune |
|---------|--------|-----|---------|
| Open source | Yes | No | No |
| Self-hosted | Yes | Yes (paid) | Yes (paid) |
| Model registry | Yes | Yes | Yes |
| Hyperparameter sweeps | Limited | Native | Native |
| Collaboration | Basic | Excellent | Excellent |
| Reports | No | Yes | Yes |

### Unified Logger (Portability)
```python
class ExperimentTracker:
    def __init__(self, platform="mlflow"):
        self.platform = platform
    def init(self, project, name, config):
        if self.platform == "mlflow":
            mlflow.set_experiment(project)
            self.run = mlflow.start_run(run_name=name)
            mlflow.log_params(config)
        elif self.platform == "wandb":
            self.run = wandb.init(project=project, name=name, config=config)
    def log_metrics(self, metrics, step=None):
        if self.platform == "mlflow": mlflow.log_metrics(metrics, step=step)
        elif self.platform == "wandb": wandb.log(metrics, step=step)
    def finish(self):
        if self.platform == "mlflow": mlflow.end_run()
        elif self.platform == "wandb": wandb.finish()
```

## References
- W&B docs: https://docs.wandb.ai/
- Neptune docs: https://docs.neptune.ai/
