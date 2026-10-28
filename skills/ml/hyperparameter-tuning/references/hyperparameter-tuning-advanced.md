# Advanced Hyperparameter Tuning: Pruning, Multi-Objective, Conditional Spaces, Deep Learning, Analysis

Advanced techniques for making tuning efficient and trustworthy: pruning and multi-fidelity schedules, conditional and hierarchical search spaces, multi-objective optimization, transfer and warm-starting, deep-learning-specific strategies, constraint handling and post-hoc analysis. Distributed execution is covered in `tuning-at-scale.md`.

## Pruning with Intermediate Results

Report intermediate scores so bad trials stop early.

```python
import optuna
import torch

def objective(trial: optuna.Trial) -> float:
    lr = trial.suggest_float("lr", 1e-5, 1e-2, log=True)
    wd = trial.suggest_float("weight_decay", 1e-6, 1e-1, log=True)
    model, opt = build(lr=lr, weight_decay=wd)
    best = 0.0
    for epoch in range(30):
        train_one_epoch(model, opt)
        acc = evaluate(model)
        best = max(best, acc)
        trial.report(acc, step=epoch)
        if trial.should_prune():
            raise optuna.TrialPruned()
    return best

study = optuna.create_study(
    direction="maximize",
    sampler=optuna.samplers.TPESampler(seed=0, multivariate=True),
    pruner=optuna.pruners.HyperbandPruner(min_resource=2, max_resource=30, reduction_factor=3),
)
```

| Pruner / scheduler | Behavior |
|--------------------|----------|
| Median pruner | Stop if below the median of previous trials at the same step |
| Successive halving / ASHA | Promote top fraction at each rung; ASHA is asynchronous for parallel workers |
| Hyperband | Runs several successive-halving brackets with different aggressiveness |
| BOHB | Bayesian sampling combined with Hyperband |

Caveat: early performance can mislead (e.g. high learning rates look good early, low ones win later). Use a sufficient minimum resource and check rank correlation between early and final scores.

## Conditional and Hierarchical Spaces

```python
def objective(trial):
    model_type = trial.suggest_categorical("model", ["lgbm", "logreg"])
    if model_type == "lgbm":
        params = {
            "num_leaves": trial.suggest_int("num_leaves", 15, 255, log=True),
            "learning_rate": trial.suggest_float("lgbm_lr", 1e-3, 0.2, log=True),
        }
    else:
        params = {"C": trial.suggest_float("C", 1e-4, 1e2, log=True)}
    return cv_score(model_type, params)
```

Tree-structured Parzen Estimators handle conditional spaces naturally. Keep parameter names unique per branch.

## Multi-Objective Optimization

Real decisions trade accuracy against latency, model size or fairness metrics.

```python
study = optuna.create_study(directions=["maximize", "minimize"],
                            sampler=optuna.samplers.NSGAIISampler(seed=0))

def objective(trial):
    params = sample(trial)
    model = train(params)
    return evaluate_auc(model), measure_p95_latency_ms(model)

study.optimize(objective, n_trials=200)
pareto = study.best_trials   # non-dominated trials
```

Pick from the Pareto front using business constraints (e.g. best AUC with p95 latency under the budget). Alternatively optimize one objective with constraints (Optuna supports `constraints_func` in several samplers).

## Warm-Starting and Transfer

- Enqueue known good configurations first: `study.enqueue_trial({...})`.
- Reuse prior studies on similar datasets to narrow ranges.
- Meta-learned defaults (from AutoML systems) as starting points.
- When data drifts modestly, re-tune around the previous optimum with a smaller budget instead of from scratch.

## Deep Learning Specifics

| Practice | Rationale |
|----------|-----------|
| Learning-rate range test before search | Quickly finds a sensible LR order of magnitude |
| Tune LR and schedule jointly with batch size | They interact; when changing batch size, re-tune LR |
| Fix architecture, tune optimization first | Optimization settings dominate early gains |
| Use smaller proxies (fewer epochs, subset of data, smaller model) for exploration | Multi-fidelity; validate top configs at full scale |
| Population Based Training (PBT) | Adapts hyperparameters (LR, augmentation) during training across a population |
| Multiple seeds for final candidates | Variance between seeds can exceed differences between configs |

For large-model fine-tuning, typical tuned knobs are learning rate, number of epochs, warmup, and LoRA rank/alpha; full search is often too expensive, so use small sweeps around published recipes.

## Noise and Statistical Care

- Evaluate top candidates over repeated CV or seeds; compare with confidence intervals.
- Beware "winner's curse": the best of many noisy trials overstates true performance.
- A difference smaller than seed-to-seed variance is not meaningful.

## Analysis of Results

```python
from optuna.visualization import (plot_optimization_history, plot_param_importances,
                                  plot_parallel_coordinate, plot_slice, plot_contour)
plot_param_importances(study).show()     # fANOVA-based importance by default
plot_slice(study, params=["learning_rate", "num_leaves"]).show()
```

Use analysis to:
- Drop unimportant parameters from future searches.
- Detect best values at range boundaries (expand range).
- Spot interactions (contour plots).

## Cost-Aware Tuning

- Set budgets in wall-clock and money, not only trial counts.
- Track cost per trial (GPU hours) and prefer cheaper fidelities.
- Stop when the improvement curve flattens; diminishing returns are typical after a modest number of well-chosen trials.

## Integrating with ML Platforms

- Log every trial to an experiment tracker (MLflow, W&B) with parameters, metrics, code version and data version.
- Register only the final retrained model, linked to the study.
- Make tuning a pipeline step with fixed inputs so it is reproducible and auditable.

## Checklist

- [ ] Pruning/multi-fidelity with validated early-stopping assumptions
- [ ] Conditional spaces for model or architecture choices
- [ ] Multi-objective or constrained search where trade-offs exist
- [ ] Warm starts from prior knowledge
- [ ] Top candidates re-evaluated across seeds/folds
- [ ] Importance and slice analysis used to refine spaces
- [ ] Cost budgets and experiment tracking in place
