---
name: ml-hyperparameter-tuning
description: >
  Use this skill when performing hyperparameter tuning, optimizing model performance via search strategies, or configuring tuning frameworks (Optuna, Ray Tune, Hyperopt).
  This skill enforces: search space definition, strategy selection (grid/random/Bayesian), framework configuration, pruning/early stopping, distributed execution, multi-objective optimization.
  Do NOT use for: model architecture search (NAS), feature selection, threshold tuning for classification, experiment tracking (use ml-experiment-tracking).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, hyperparameter, optimization, phase-11]
---

# ML Hyperparameter Tuning

## Purpose
Design hyperparameter tuning pipelines with structured search spaces, optimal strategy selection, and production-ready framework configuration.

## Architecture/Decision Trees

### Strategy Selection Decision Tree
```
How long does each trial take?
  ├── <10 seconds
  │   ├── <4 hyperparameters → Grid Search (exhaustive)
  │   └── >4 hyperparameters → Random Search (better coverage)
  ├── 10 seconds - 1 minute
  │   └── Bayesian Optimization (TPE or GP)
  ├── 1 minute - 1 hour
  │   ├── Bayesian + ASHA Pruning (aggressive early stopping)
  │   └── Hyperband (adaptive resource allocation)
  └── >1 hour
      ├── Population-Based Training (evolve HP + weights)
      └── Bayesian with aggressive pruning + checkpoint reuse
```

### Search Space Scale Decision Tree
```
How many trials can you afford?
  ├── <20 trials → Manual tuning or grid on 2-3 key params
  ├── 20-100 trials → Random Search or Bayesian (TPE)
  ├── 100-1000 trials → Bayesian (GP/SMAC) + Median Pruner
  ├── 1000-10000 trials → Hyperband + Distributed (Ray)
  └── >10000 trials → Population-Based Training
```

### Parameter Scale Decision Tree
```
What type of hyperparameter?
  ├── Learning rate, regularization, weight decay
  │   └── Log-uniform scale (trial.suggest_float(..., log=True))
  ├── Tree depth, number of layers, batch size, hidden units
  │   └── Integer uniform (trial.suggest_int)
  ├── Optimizer, activation, pooling type
  │   └── Categorical (trial.suggest_categorical)
  └── Conditional (momentum only when optimizer==sgd)
      └── if/else branching in objective function
```

### Pruning Strategy Decision Tree
```
├── <10 trials budget → No pruning (too few to prune reliably)
├── 10-100 trials → MedianPruner (n_warmup_steps=10)
├── 100-1000 trials → ASHA (async, distributed-friendly)
└── >1000 trials → Hyperband (multi-bracket resource allocation)
```

## Agent Protocol

### Trigger
User request includes: hyperparameter tuning, Optuna, Ray Tune, Hyperopt, grid search, random search, Bayesian optimization, pruning, early stopping.

### Input Context
Before activating, verify:
- Model type and training pipeline.
- Approximate training time per trial.
- Available compute resources (single machine, multi-core, multi-GPU, cluster).
- Which hyperparameters are known to matter.
- Whether cross-validation is needed inside each trial.
- Whether the objective function is deterministic or stochastic.

### Output Artifact
Hyperparameter tuning setup with search space design, strategy selection, framework configuration, pruning policy, and distributed execution plan.

### Response Format
```
## Tuning Config
### Search Space
Param: {name} | Type: {float/int/categorical} | Range: [{min}, {max}] | Scale: {linear/log}

### Strategy
Method: {grid / random / Bayesian / TPE / CMA-ES}
Budget: {N trials} | Parallel: {N workers} | Timeout: {duration}

### Framework
Tool: {Optuna / Ray Tune / Hyperopt}
Study: {name} | Direction: {minimize / maximize}
Metric: {metric_name} | Pruning: {none / median / Hyperband / ASHA}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Search space defined with all tunable parameters, distributions, and scales.
- [ ] Search strategy selected based on trial budget and dimensionality.
- [ ] Tuning framework configured with study/trial lifecycle.
- [ ] Pruning policy set with minimum budget checks.
- [ ] Distributed execution configured with fault tolerance.
- [ ] Result persistence configured.
- [ ] Random seed set for reproducibility.
- [ ] Parameter importance analysis planned after tuning.

## Workflow

### Step 1: Search Space Definition
Use log-uniform for positive-valued parameters spanning orders of magnitude (learning rate 1e-5 to 1e-1, regularization 1e-4 to 1e-1). Use uniform for bounded additive parameters (depth 3-15, units 32-512). Use categorical for discrete options (optimizer, activation). Define conditional spaces where parameters depend on other choices.

```python
import optuna

def create_search_space(trial, model_type="xgboost"):
    if model_type == "xgboost":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 50, 1000),
            "max_depth": trial.suggest_int("max_depth", 3, 15),
            "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.3, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-4, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-4, 10.0, log=True),
        }
    elif model_type == "neural_network":
        n_layers = trial.suggest_int("n_layers", 1, 5)
        params = {
            "learning_rate": trial.suggest_float("learning_rate", 1e-5, 1e-1, log=True),
            "batch_size": trial.suggest_categorical("batch_size", [16, 32, 64, 128, 256]),
            "dropout": trial.suggest_float("dropout", 0.0, 0.5),
            "weight_decay": trial.suggest_float("weight_decay", 1e-6, 1e-2, log=True),
            "optimizer": trial.suggest_categorical("optimizer", ["Adam", "AdamW", "SGD"]),
        }
        params["hidden_units"] = [
            trial.suggest_int(f"hidden_units_{i}", 32, 512, log=True)
            for i in range(n_layers)
        ]
        return params
```

### Step 2: Strategy Selection
Grid search: only for <4 dims AND budget covers full grid. Random search: always prefer over grid when >4 dims. Bayesian optimization: GP for <10 continuous params, TPE for mixed/categorical/high-dim. CMA-ES: for 5-20 continuous parameters, non-convex landscapes.

```python
def select_strategy(n_params, trial_time_seconds, budget):
    dims_continuous = sum(1 for p in n_params if p["type"] in ("float", "int") and p.get("log", False))
    dims_discrete = len(n_params) - dims_continuous

    if trial_time_seconds < 10:
        if dims_discrete < 4:
            return "grid"
        return "random"
    elif budget < 100:
        return "random" if dims_discrete > 0 else "bayesian_gp"
    elif trial_time_seconds < 300:
        return "bayesian_tpe"
    else:
        return "bayesian_tpe_with_pruning"
```

### Step 3: Framework Configuration
Optuna: trial.suggest_float/log/int/categorical. Study with TPE sampler + MedianPruner. Storage for persistence. Ray Tune: tune.{loguniform/uniform/randint/choice} with ASHA scheduler. Hyperopt: hp.{loguniform/uniform/quniform/choice}.

```python
# Optuna complete example
import optuna
from optuna.samplers import TPESampler
from optuna.pruners import MedianPruner
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import cross_val_score

def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
        "max_depth": trial.suggest_int("max_depth", 3, 12),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-4, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-4, 10.0, log=True),
        "eval_metric": "logloss",
        "random_state": 42 + trial.number,
    }
    model = xgb.XGBClassifier(**params, use_label_encoder=False)

    score = cross_val_score(model, X_train, y_train, cv=3, scoring="roc_auc", n_jobs=-1).mean()

    for epoch in range(10):
        trial.report(score, epoch)
        if trial.should_prune():
            raise optuna.TrialPruned()

    return score

study = optuna.create_study(
    direction="maximize",
    sampler=TPESampler(n_startup_trials=10, seed=42),
    pruner=MedianPruner(n_startup_trials=10, n_warmup_steps=5, n_min_trials=3),
    storage="sqlite:///optimization.db",
    study_name="xgboost_tuning",
    load_if_exists=True,
)
study.optimize(objective, n_trials=100, timeout=3600, n_jobs=4)

print(f"Best value: {study.best_value}")
print(f"Best params: {study.best_params}")

# Visualization
optuna.visualization.plot_param_importances(study)
optuna.visualization.plot_parallel_coordinate(study)
optuna.visualization.plot_optimization_history(study)
```

### Step 4: Pruning & Early Stopping
Median pruner: stop if intermediate value falls below median of completed trials at same step. Requires n_startup_trials, n_warmup_steps. Hyperband: adaptive resource allocation. ASHA: distributed variant for parallel settings.

```python
# Ray Tune with ASHA pruning
from ray import tune
from ray.tune.schedulers import ASHAScheduler

def train_fn(config):
    model = xgb.XGBClassifier(**config)
    for epoch in range(100):
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=0)
        preds = model.predict_proba(X_val)[:, 1]
        score = roc_auc_score(y_val, preds)
        tune.report(metrics={"auc": score, "epoch": epoch})

scheduler = ASHAScheduler(
    max_t=100,
    grace_period=10,
    reduction_factor=3,
    brackets=1,
)

tuner = tune.Tuner(
    train_fn,
    param_space={
        "learning_rate": tune.loguniform(1e-3, 0.3),
        "max_depth": tune.randint(3, 12),
        "subsample": tune.uniform(0.5, 1.0),
    },
    tune_config=tune.TuneConfig(
        metric="auc",
        mode="max",
        num_samples=100,
        scheduler=scheduler,
    ),
)
results = tuner.fit()
```

### Step 5: Distributed Execution
Local multi-core: n_jobs=-1. Dask distributed: wrap Optuna with DaskStorage. Ray distributed: tune.run(resources_per_trial). Kubernetes: each trial as K8s job. Fault tolerance: checkpoint to shared filesystem.

```python
# Optuna distributed with PostgreSQL
study = optuna.create_study(
    storage="postgresql://user:pass@host/db",
    study_name="distributed_tuning",
    load_if_exists=True,
)
# Each worker runs: study.optimize(objective, n_trials=100)
```

### Step 6: Post-Tuning Analysis
Parameter importance (fANOVA-based), parallel coordinate plot, contour plot (top 2 params interaction), optimization history, failure analysis.

```python
def analyze_study(study):
    importances = optuna.visualization.plot_param_importances(study)
    parallel = optuna.visualization.plot_parallel_coordinate(study)
    history = optuna.visualization.plot_optimization_history(study)

    df = study.trials_dataframe()
    failed = df[df["state"] == "FAIL"]
    print(f"Total trials: {len(df)}, Failed: {len(failed)}")
    if len(failed) > 0:
        print(f"Failure reasons: {failed['user_attrs'].value_counts()}")

    return importances, parallel, history
```

## Anti-Patterns

- **Grid search for >4 dimensions**: exponential cost, random search covers more distinct values per parameter.
- **No pruning for expensive trials**: wastes budget on clearly bad configurations.
- **Pruning too aggressively**: stopping before minimum budget leads to incorrect early termination.
- **Learning rate too high**: loss diverges to NaN. Too low: training stalls.
- **Not fixing CV splits**: high variance in objective values, misleading comparisons.
- **Overly narrow search space**: best optimum outside bounds.
- **Overly wide search space**: wasted budget exploring irrelevant regions.
- **Ignoring conditional params**: momentum sampled even for Adam, wasting budget.
- **Not setting random seed per trial**: non-deterministic results, can't reproduce best trial.

## Production Considerations

### Monitoring
- Track objective value trend — if new runs produce worse results, data may have drifted.
- Monitor trial failure rate (>10% indicates pipeline issues).
- Track search space utilization — best params at boundary means space too narrow.
- Log study metadata: number of trials, best params, optimization history.
- Track compute cost (GPU hours, wall time) for budget forecasting.

### Deployment
- Embed best HP configuration in model artifact metadata.
- Store study database durably for future warm-starting.
- Automate retuning when dataset grows >2x or new features added.
- Pin random seed per trial for exact reproduction.
- Archive best configs for each deployment target (accuracy, speed, size).
- Validate best config with 3-5 different seeds before production.

## Rules
- Random search beats grid when >4 dims.
- Bayesian optimization needs 10-20 initial random trials.
- Pruning needs minimum budget (e.g., 10% of total epochs).
- Log-scale learning rate, regularization, and all positive params spanning OoM.
- Use conditional search spaces for hierarchical params.
- Each trial must be deterministic given its seed.
- Never prune too aggressively: min 5-10 trials before pruning.
- Distributed tuning requires shared filesystem for checkpoints.
- Multi-objective: always show Pareto front, not single point.
- Store study database durably.

## References
  - references/automl-tuning.md — AutoML Tuning
  - references/hyperparameter-tuning-advanced.md — Hyperparameter Tuning Advanced Topics
  - references/hyperparameter-tuning-fundamentals.md — Hyperparameter Tuning Fundamentals
  - references/multi-fidelity.md — Multi-Fidelity Optimization
  - references/optimization-methods.md — Hyperparameter Optimization
  - references/search-strategies.md — Search Strategies
  - references/tuning-at-scale.md — Distributed Tuning
  - references/tuning-frameworks.md — Tuning Frameworks
## Handoff
Pass tuned hyperparameters to ml-experiment-tracking for logging. Hand off to ml-model-evaluation for evaluating tuned model.
