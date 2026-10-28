# Hyperparameter Tuning Fundamentals

Hyperparameters are settings chosen before training (learning rate, tree depth, regularization strength) rather than learned from data. This reference covers what to tune, validation design to avoid overfitting the tuning process, basic search methods, search space definition, and a minimal Optuna workflow. Algorithms in depth: `optimization-methods.md`, `search-strategies.md`, `multi-fidelity.md`; frameworks: `tuning-frameworks.md`.

## Parameters vs Hyperparameters

| Learned parameters | Hyperparameters |
|--------------------|-----------------|
| Neural network weights, tree split thresholds, regression coefficients | Learning rate, batch size, number of trees, max depth, regularization, architecture choices |
| Optimized by the training algorithm | Optimized by an outer search loop |

## Which Hyperparameters Matter

| Model family | High impact | Usually secondary |
|--------------|-------------|-------------------|
| Gradient boosting (XGBoost, LightGBM, CatBoost) | Learning rate with number of rounds (early stopping), max depth / num leaves, min child weight / min data in leaf, subsampling, L1/L2 regularization | Many minor flags |
| Random forest | Number of features per split, min samples leaf, max depth | Number of trees beyond a point (more is rarely worse, just slower) |
| Linear/logistic models | Regularization strength (C, alpha), penalty type | Solver |
| SVM | C, kernel, gamma | |
| Neural networks | Learning rate (most important), schedule, batch size, weight decay, warmup | Optimizer betas, epsilon |
| Fine-tuning pretrained transformers | Learning rate, epochs, warmup ratio, weight decay, LoRA rank | |

Tune the few that matter most first; fix the rest at sensible defaults.

## Validation Design

The tuning loop selects the configuration with the best validation score, which biases that score upward. Protect against this:

```
data ──► train / validation (used during tuning) / test (touched once, at the end)
```

- Use k-fold cross-validation for small datasets; a single holdout for large ones.
- Respect structure: `GroupKFold` when samples share an entity (patients, users), `TimeSeriesSplit` or forward-chaining for temporal data, stratification for imbalanced classes.
- Fit preprocessing (scalers, encoders, imputers) inside the CV loop via pipelines to avoid leakage.
- For an unbiased estimate of the whole procedure on small data, use nested cross-validation.

## Search Methods Overview

| Method | Idea | When |
|--------|------|------|
| Manual / heuristic | Expert adjustment | Early exploration, tiny budgets |
| Grid search | All combinations of listed values | 1-3 hyperparameters with few values |
| Random search | Sample configurations randomly | Strong baseline; better than grid when only some parameters matter |
| Bayesian optimization (TPE, Gaussian processes) | Model the objective, sample promising regions | Expensive evaluations, moderate dimensions |
| Multi-fidelity (successive halving, Hyperband, ASHA) | Stop poor trials early | Iterative training (epochs, boosting rounds) |
| Evolutionary / population-based | Mutate and select configurations | Large parallel budgets, schedules (PBT) |

Random search with the same budget often matches or beats grid search because it explores more distinct values of the important dimensions.

## Defining Search Spaces

| Hyperparameter | Scale | Example range |
|----------------|-------|---------------|
| Learning rate | Log | 1e-5 to 1e-1 |
| Regularization strength (C, alpha, weight decay) | Log | 1e-6 to 1e1 |
| Max depth / num leaves | Integer, linear | 3 to 12 / 15 to 255 |
| Subsample / colsample | Linear | 0.5 to 1.0 |
| Dropout | Linear | 0.0 to 0.5 |
| Batch size | Categorical/powers of two | 16, 32, 64, 128 |

Use log scales for parameters spanning orders of magnitude. Start wide, then narrow around good regions; check whether best values sit on the boundary (expand the range if so).

## Minimal Optuna Workflow

```python
import optuna
from sklearn.model_selection import StratifiedKFold, cross_val_score
from lightgbm import LGBMClassifier

def objective(trial: optuna.Trial) -> float:
    params = {
        "n_estimators": 2000,
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.2, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 15, 255, log=True),
        "min_child_samples": trial.suggest_int("min_child_samples", 5, 200, log=True),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
        "subsample_freq": 1,
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
        "verbose": -1,
    }
    model = LGBMClassifier(**params)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    return cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc").mean()

study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
study.optimize(objective, n_trials=100, timeout=3600)
print(study.best_params, study.best_value)
```

After tuning, retrain on the full training data with the best parameters and evaluate once on the test set. For boosting, prefer early stopping on a validation fold to tuning the number of rounds directly.

## Reproducibility

- Fix seeds for samplers, data splits and models; record library versions.
- Persist studies (Optuna RDB storage, MLflow/W&B logging) with parameters, metrics and artifacts.
- Report variance across seeds/folds; a small improvement within noise is not real.

## Common Mistakes

- Tuning on the test set or reusing it repeatedly.
- Preprocessing fitted on all data before splitting.
- Linear ranges for learning rates.
- Tuning dozens of parameters with a tiny budget.
- Ignoring cost: a configuration 0.1% better but 5 times slower to serve may be worse overall.

## Checklist

- [ ] Untouched test set; CV respecting groups/time
- [ ] Preprocessing inside pipelines
- [ ] Few high-impact hyperparameters with appropriate scales
- [ ] Random or Bayesian search with a fixed budget; early stopping where possible
- [ ] Results logged with seeds and versions
- [ ] Final model evaluated once on the test set
