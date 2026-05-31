# Classical ML Model Selection

## Overview

Model selection is the process of choosing the best machine learning model for a given problem, dataset, and constraints. This reference covers model comparison frameworks, cross-validation strategies, hyperparameter optimization, ensemble methods, and selection criteria for production deployment.

## Model Selection Framework

### Decision Framework

```
Problem Type → Metric → Candidate Models → Cross-Validation → Selection → Final Evaluation
```

### Evaluation by Problem Type

```yaml
regression:
  primary_metric: RMSE
  secondary_metrics: [MAE, R-squared, MAPE]
  models: [LinearRegression, Ridge, Lasso, RandomForest, XGBoost, LightGBM]

binary_classification:
  primary_metric: AUC-ROC (balanced) or AUC-PR (imbalanced)
  secondary_metrics: [F1, Precision, Recall, LogLoss]
  models: [LogisticRegression, RandomForest, XGBoost, LightGBM, CatBoost, SVC]

multiclass_classification:
  primary_metric: Weighted F1
  secondary_metrics: [Macro F1, Micro F1, Accuracy, LogLoss]
  models: [LogisticRegression, RandomForest, XGBoost, LightGBM, CatBoost]

clustering:
  metrics: [Silhouette Score, Davies-Bouldin Index, Inertia (Elbow)]
  models: [KMeans, DBSCAN, Hierarchical, Gaussian Mixture]

ranking:
  metrics: [NDCG, MAP, MRR]
  models: [LambdaMART (LightGBM), XGBoost ranker]
```

## Candidate Model Selection

### Model Characteristics

```python
import time
import numpy as np
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, mean_squared_error

def evaluate_candidates(X_train, y_train, X_val, y_val, problem_type: str, models: dict) -> pd.DataFrame:
    """Evaluate candidate models on validation set."""
    results = []

    for name, model in models.items():
        start = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - start

        start = time.time()
        y_pred = model.predict(X_val)
        infer_time = time.time() - start

        if problem_type == "regression":
            metric = np.sqrt(mean_squared_error(y_val, y_pred))
            metric_name = "RMSE"
        elif problem_type == "binary":
            y_proba = model.predict_proba(X_val)[:, 1] if hasattr(model, "predict_proba") else y_pred
            metric = roc_auc_score(y_val, y_proba)
            metric_name = "AUC"
        elif problem_type == "multiclass":
            metric = f1_score(y_val, y_pred, average="weighted")
            metric_name = "Weighted F1"

        results.append({
            "model": name,
            metric_name: metric,
            "train_time_s": round(train_time, 2),
            "infer_time_ms": round(infer_time * 1000, 2),
            "model_size_mb": 0,
        })

    return pd.DataFrame(results).sort_values(metric_name, ascending=(problem_type == "regression"))
```

### Quick Model Assessment

```python
def quick_assess(X: pd.DataFrame, y: pd.Series, problem_type: str) -> dict:
    """Quick assessment of multiple model families on a sample."""
    from sklearn.model_selection import train_test_split
    from sklearn.linear_model import LogisticRegression, LinearRegression
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

    X_sample, _, y_sample, _ = train_test_split(X, y, train_size=5000, random_state=42)

    if problem_type in ("binary", "multiclass"):
        candidates = {
            "LogisticRegression": LogisticRegression(max_iter=1000),
            "RandomForest": RandomForestClassifier(n_estimators=100, n_jobs=-1),
        }
    else:
        candidates = {
            "LinearRegression": LinearRegression(),
            "RandomForest": RandomForestRegressor(n_estimators=100, n_jobs=-1),
        }

    results = evaluate_candidates(X_sample, y_sample, X_sample, y_sample, problem_type, candidates)
    return results.to_dict("records")
```

## Cross-Validation Strategy

### Strategy Selection

```python
from sklearn.model_selection import (
    KFold, StratifiedKFold, GroupKFold, TimeSeriesSplit,
    RepeatedKFold, LeaveOneOut, cross_val_score
)

def get_cv_strategy(X, y, groups=None, cv_type: str = "auto") -> object:
    """Select appropriate cross-validation strategy."""
    n = len(X)

    if cv_type != "auto":
        return {
            "kfold": KFold(n_splits=5, shuffle=True, random_state=42),
            "stratified": StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
            "group": GroupKFold(n_splits=5),
            "timeseries": TimeSeriesSplit(n_splits=5),
            "repeated": RepeatedKFold(n_splits=5, n_repeats=3, random_state=42),
            "loo": LeaveOneOut(),
        }[cv_type]

    # Auto-detect best strategy
    if groups is not None:
        return GroupKFold(n_splits=5)

    is_classification = y.dtype == object or y.nunique() < 20
    if is_classification:
        if y.value_counts().min() / len(y) < 0.1:
            return StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        return StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # Regression
    return KFold(n_splits=5, shuffle=True, random_state=42)


def cv_evaluate(model, X, y, cv, scoring: str) -> dict:
    """Evaluate model with cross-validation."""
    scores = cross_val_score(model, X, y, cv=cv, scoring=scoring, n_jobs=-1)
    return {
        "mean_score": scores.mean(),
        "std_score": scores.std(),
        "scores": scores.tolist(),
        "cv_variance": scores.std() / scores.mean(),
    }
```

## Hyperparameter Optimization

### Search Space Definition

```python
from scipy.stats import uniform, randint, loguniform

def get_xgboost_space():
    """XGBoost hyperparameter search space."""
    return {
        "n_estimators": randint(100, 1000),
        "max_depth": randint(3, 12),
        "learning_rate": uniform(0.01, 0.3),
        "subsample": uniform(0.6, 0.4),
        "colsample_bytree": uniform(0.5, 0.5),
        "reg_alpha": loguniform(1e-5, 10),
        "reg_lambda": loguniform(1e-5, 10),
        "min_child_weight": randint(1, 10),
        "gamma": loguniform(1e-5, 1),
    }

def get_lightgbm_space():
    """LightGBM hyperparameter search space."""
    return {
        "n_estimators": randint(100, 1000),
        "num_leaves": randint(15, 127),
        "max_depth": randint(-1, 15),
        "learning_rate": uniform(0.01, 0.3),
        "subsample": uniform(0.6, 0.4),
        "colsample_bytree": uniform(0.5, 0.5),
        "reg_alpha": loguniform(1e-5, 10),
        "reg_lambda": loguniform(1e-5, 10),
        "min_child_samples": randint(5, 50),
    }

def get_random_forest_space():
    """Random Forest hyperparameter search space."""
    return {
        "n_estimators": randint(100, 500),
        "max_depth": randint(5, 30),
        "min_samples_split": randint(2, 50),
        "min_samples_leaf": randint(1, 20),
        "max_features": uniform(0.3, 0.7),
    }
```

### Optuna Bayesian Optimization

```python
import optuna
from optuna.samplers import TPESampler
from sklearn.model_selection import cross_val_score

def optimize_xgboost_optuna(X_train, y_train, n_trials: int = 100, cv=5) -> dict:
    """Hyperparameter optimization with Optuna (XGBoost)."""
    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-5, 10, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-5, 10, log=True),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "gamma": trial.suggest_float("gamma", 1e-5, 1, log=True),
            "random_state": 42,
        }

        model = XGBClassifier(**params, use_label_encoder=False, eval_metric="logloss")
        scores = cross_val_score(model, X_train, y_train, cv=cv,
                                 scoring="roc_auc", n_jobs=-1)
        return scores.mean()

    study = optuna.create_study(direction="maximize", sampler=TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    return {
        "best_params": study.best_params,
        "best_score": study.best_value,
        "study": study,
    }
```

### Randomized Search

```python
from sklearn.model_selection import RandomizedSearchCV

def randomized_search(model, param_dist: dict, X_train, y_train, n_iter: int = 100,
                       cv=5, scoring: str = "roc_auc", n_jobs: int = -1) -> dict:
    """Randomized hyperparameter search."""
    search = RandomizedSearchCV(
        model, param_distributions=param_dist,
        n_iter=n_iter, cv=cv, scoring=scoring,
        n_jobs=n_jobs, random_state=42, verbose=1,
    )
    search.fit(X_train, y_train)

    return {
        "best_params": search.best_params_,
        "best_score": search.best_score_,
        "cv_results": search.cv_results_,
        "best_estimator": search.best_estimator_,
    }
```

## Ensemble Methods

### Voting Ensemble

```python
from sklearn.ensemble import VotingClassifier, VotingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier

def create_voting_ensemble(problem_type: str):
    """Create a voting ensemble of diverse models."""
    if problem_type == "classification":
        return VotingClassifier(
            estimators=[
                ("lr", LogisticRegression(max_iter=1000, C=0.1)),
                ("rf", RandomForestClassifier(n_estimators=200, max_depth=10, n_jobs=-1)),
                ("xgb", XGBClassifier(n_estimators=200, learning_rate=0.1, max_depth=6)),
            ],
            voting="soft",  # use predicted probabilities
            weights=[1, 1, 2],  # weight by expected performance
            n_jobs=-1,
        )
    else:
        return VotingRegressor(
            estimators=[
                ("rf", RandomForestRegressor(n_estimators=200, n_jobs=-1)),
                ("xgb", XGBRegressor(n_estimators=200, learning_rate=0.1)),
                ("gb", GradientBoostingRegressor(n_estimators=200, max_depth=4)),
            ],
            weights=[1, 2, 1],
            n_jobs=-1,
        )
```

### Stacking Ensemble

```python
from sklearn.ensemble import StackingClassifier, StackingRegressor
from sklearn.linear_model import LogisticRegression, Ridge

def create_stacking_ensemble(problem_type: str):
    """Create a stacking ensemble with meta-learner."""
    base_models = [
        ("rf", RandomForestClassifier(n_estimators=200, max_depth=10, n_jobs=-1)),
        ("xgb", XGBClassifier(n_estimators=200, learning_rate=0.1, max_depth=6)),
        ("gb", GradientBoostingClassifier(n_estimators=200, max_depth=4)),
    ]

    if problem_type == "classification":
        meta_learner = LogisticRegression(C=1.0, max_iter=1000)
        return StackingClassifier(
            estimators=base_models,
            final_estimator=meta_learner,
            cv=5,
            stack_method="predict_proba",
            n_jobs=-1,
        )
    else:
        meta_learner = Ridge(alpha=1.0)
        return StackingRegressor(
            estimators=[
                (name, est) for name, est in base_models
                if not name == "gb" or isinstance(est, GradientBoostingRegressor)
            ],
            final_estimator=meta_learner,
            cv=5,
            n_jobs=-1,
        )
```

## Model Comparison Report

```python
def compare_models(X_train, y_train, X_test, y_test, models: dict,
                   cv=5, scoring: str = "roc_auc") -> pd.DataFrame:
    """Comprehensive model comparison with CV + test set."""
    results = []

    for name, model in models.items():
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring=scoring, n_jobs=-1)

        # Train and test
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred

        test_score = {
            "roc_auc": roc_auc_score(y_test, y_proba),
            "f1": f1_score(y_test, y_pred > 0.5 if hasattr(y_pred, "__len__") else y_pred),
        }.get(scoring, roc_auc_score(y_test, y_proba))

        results.append({
            "model": name,
            "cv_mean": cv_scores.mean(),
            "cv_std": cv_scores.std(),
            "test_score": test_score,
            "cv_test_gap": cv_scores.mean() - test_score,
            "fit_time": 0,  # track with time module
        })

    df = pd.DataFrame(results).sort_values("cv_mean", ascending=False)
    df["rank"] = range(1, len(df) + 1)
    return df
```

## Production Selection Criteria

### Decision Matrix

```python
def select_production_model(cv_results: pd.DataFrame, constraints: dict) -> dict:
    """Select best model for production given constraints."""
    candidates = cv_results.copy()

    # Apply constraints
    if constraints.get("max_inference_time_ms"):
        candidates = candidates[candidates["infer_time_ms"] <= constraints["max_inference_time_ms"]]

    if constraints.get("max_model_size_mb"):
        candidates = candidates[candidates["model_size_mb"] <= constraints["max_model_size_mb"]]

    if constraints.get("min_interpretability", "low") == "high":
        candidates = candidates[candidates["model"].isin([
            "LogisticRegression", "LinearRegression", "DecisionTree"
        ])]

    if constraints.get("max_training_time_min"):
        candidates = candidates[candidates["train_time_s"] <= constraints["max_training_time_min"] * 60]

    if candidates.empty:
        return {"error": "No model satisfies all constraints"}

    # Score remaining candidates
    best = candidates.iloc[0]
    return {
        "selected_model": best["model"],
        "cv_score": best["cv_mean"],
        "test_score": best["test_score"],
        "inference_time_ms": best.get("infer_time_ms", "N/A"),
        "rationale": (
            f"Best cross-validated {best.get('metric_name', 'score')} "
            f"within production constraints"
        ),
    }
```

## References

- Classical ML fundamentals
- Supervised learning reference
- Unsupervised learning and pipelines
- Feature engineering techniques
- Interpretable classical ML
- Handling imbalanced data
- Classical ML advanced topics
