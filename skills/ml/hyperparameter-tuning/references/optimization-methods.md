# Hyperparameter Optimization

## Grid Search

```python
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier
import numpy as np

def grid_search_example(X, y):
    """Perform grid search for hyperparameter tuning."""
    param_grid = {
        'n_estimators': [100, 200, 300],
        'max_depth': [10, 20, 30, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4],
        'max_features': ['sqrt', 'log2'],
    }

    model = RandomForestClassifier(random_state=42)

    grid_search = GridSearchCV(
        estimator=model,
        param_grid=param_grid,
        cv=5,
        scoring='f1_macro',
        n_jobs=-1,
        verbose=1,
    )

    grid_search.fit(X, y)

    print(f"Best parameters: {grid_search.best_params_}")
    print(f"Best cross-validation score: {grid_search.best_score_:.4f}")

    return grid_search.best_estimator_
```

## Bayesian Optimization

```python
from skopt import gp_minimize
from skopt.space import Integer, Real, Categorical
from skopt.utils import use_named_args
import lightgbm as lgb

def bayesian_optimization_example(X_train, y_train, X_val, y_val):
    """Optimize hyperparameters using Bayesian optimization."""

    space = [
        Integer(50, 500, name='num_leaves'),
        Integer(5, 50, name='max_depth'),
        Real(0.01, 0.3, name='learning_rate'),
        Integer(10, 200, name='min_data_in_leaf'),
        Real(0.5, 0.9, name='subsample'),
        Real(0.5, 0.9, name='colsample_bytree'),
    ]

    @use_named_args(space)
    def objective(**params):
        model = lgb.LGBMClassifier(
            num_leaves=params['num_leaves'],
            max_depth=params['max_depth'],
            learning_rate=params['learning_rate'],
            min_data_in_leaf=params['min_data_in_leaf'],
            subsample=params['subsample'],
            colsample_bytree=params['colsample_bytree'],
            random_state=42,
            n_jobs=-1,
            verbose=-1,
        )

        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            eval_metric='logloss',
            callbacks=[lgb.early_stopping(10)],
        )

        preds = model.predict_proba(X_val)
        log_loss = -np.mean([
            np.log(preds[i, int(y_val[i])])
            for i in range(len(y_val))
        ])

        return log_loss

    result = gp_minimize(
        func=objective,
        dimensions=space,
        n_calls=30,
        n_initial_points=10,
        random_state=42,
    )

    print(f"Best loss: {result.fun:.4f}")
    print(f"Best params: {dict(zip([s.name for s in space], result.x))}")

    return result
```

## Optuna Framework

```python
import optuna
from optuna.trial import Trial

def optuna_optimization(X_train, y_train, X_val, y_val):
    """Optimize hyperparameters using Optuna."""

    def objective(trial: Trial) -> float:
        params = {
            'num_leaves': trial.suggest_int('num_leaves', 20, 300),
            'max_depth': trial.suggest_int('max_depth', 3, 30),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
            'subsample': trial.suggest_float('subsample', 0.5, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 10.0, log=True),
            'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 10.0, log=True),
            'min_child_samples': trial.suggest_int('min_child_samples', 5, 100),
        }

        model = lgb.LGBMClassifier(**params, random_state=42, n_jobs=-1, verbose=-1)
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            eval_metric='logloss',
            callbacks=[lgb.early_stopping(10)],
        )

        preds = model.predict_proba(X_val)
        return -np.mean([
            np.log(preds[i, int(y_val[i])])
            for i in range(len(y_val))
        ])

    study = optuna.create_study(
        direction='minimize',
        sampler=optuna.samplers.TPESampler(seed=42),
        pruner=optuna.pruners.MedianPruner(),
    )

    study.optimize(objective, n_trials=50)

    print(f"Best trial: {study.best_trial.params}")
    print(f"Best value: {study.best_value:.4f}")

    optuna.visualization.plot_optimization_history(study)
    optuna.visualization.plot_param_importances(study)

    return study
```

## Hyperband Pruning

```python
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import GradientBoostingClassifier

def hyperband_optimization(X, y, max_iter=81, eta=3):
    """Hyperband algorithm for hyperparameter optimization."""
    def get_random_config():
        return {
            'n_estimators': np.random.randint(50, 500),
            'max_depth': np.random.randint(3, 30),
            'learning_rate': np.random.uniform(0.01, 0.3),
            'subsample': np.random.uniform(0.5, 1.0),
        }

    def compute_score(config, n_iter):
        model = GradientBoostingClassifier(
            **config,
            n_iter_no_change=5,
            validation_fraction=0.1,
            random_state=42,
        )
        scores = cross_val_score(model, X, y, cv=3, scoring='accuracy')
        return np.mean(scores)

    s_max = int(np.log(max_iter) / np.log(eta))
    B = (s_max + 1) * max_iter

    for s in range(s_max, -1, -1):
        n = int(np.ceil(B / (eta**s * (s + 1))))
        r = max_iter * eta**(-s)

        configs = [get_random_config() for _ in range(n)]
        scores = []

        for i, config in enumerate(configs):
            score = compute_score(config, int(r))
            scores.append((score, config))

        scores.sort(reverse=True, key=lambda x: x[0])

        n_keep = int(np.ceil(n / eta))
        configs = [config for _, config in scores[:n_keep]]

    best_config = configs[0]
    print(f"Best config from Hyperband: {best_config}")
    return best_config
```

## Key Points

- Use grid search for small parameter spaces
- Use Bayesian optimization for expensive evaluations
- Use Optuna for advanced pruning and visualization
- Use Hyperband for resource-efficient search
- Use cross-validation to prevent overfitting
- Set appropriate search ranges for each parameter
- Use log scale for learning rate and regularization
- Early stop unpromising trials to save compute
- Visualize hyperparameter importance
- Track experiments with MLflow or W&B
- Reproduce results with fixed random seeds
- Test best parameters on hold-out test set
