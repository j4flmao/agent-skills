# AutoML Tuning

## AutoGluon

```python
from autogluon.tabular import TabularDataset, TabularPredictor
import pandas as pd

def autogluon_example(train_data: pd.DataFrame, label: str):
    """Automated hyperparameter tuning with AutoGluon."""
    train_dataset = TabularDataset(train_data)

    predictor = TabularPredictor(
        label=label,
        problem_type='binary',
        eval_metric='roc_auc',
    )

    predictor.fit(
        train_data=train_dataset,
        time_limit=3600,
        presets='best_quality',
        hyperparameters={
            'GBM': {'num_boost_round': 100},
            'CAT': {'iterations': 500},
            'XGB': {'n_estimators': 100},
            'RF': {'n_estimators': 300},
        },
        num_bag_folds=5,
        num_stack_levels=1,
        verbosity=2,
    )

    print(predictor.leaderboard())
    print(f"Best model: {predictor.get_model_best()}")

    return predictor
```

## TPOT

```python
from tpot import TPOTClassifier
from sklearn.model_selection import train_test_split

def tpot_optimization(X, y):
    """Genetic programming-based AutoML with TPOT."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    tpot = TPOTClassifier(
        generations=10,
        population_size=50,
        scoring='f1_macro',
        cv=5,
        verbosity=2,
        random_state=42,
        n_jobs=-1,
        max_time_mins=30,
        early_stop=3,
    )

    tpot.fit(X_train, y_train)
    score = tpot.score(X_test, y_test)

    print(f"Test accuracy: {score:.4f}")
    tpot.export('tpot_pipeline.py')

    return tpot
```

## H2O AutoML

```python
import h2o
from h2o.automl import H2OAutoML

def h2o_automl_example(train_path: str, test_path: str, target: str):
    """Automated ML with H2O AutoML."""
    h2o.init()

    train = h2o.import_file(train_path)
    test = h2o.import_file(test_path)

    x = train.columns
    y = target
    x.remove(y)

    train[y] = train[y].asfactor()

    aml = H2OAutoML(
        max_models=20,
        max_runtime_secs=300,
        seed=42,
        stopping_metric='logloss',
        sort_metric='auc',
        balance_classes=True,
    )

    aml.train(x=x, y=y, training_frame=train)

    leaderboard = aml.leaderboard
    print(leaderboard)

    predictions = aml.leader.predict(test)
    return aml
```

## FLAML

```python
from flaml import AutoML
from sklearn.model_selection import train_test_split

def flaml_optimization(X, y, time_budget=60):
    """Fast and lightweight AutoML with FLAML."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    automl = AutoML()

    automl.fit(
        X_train=X_train,
        y_train=y_train,
        task='classification',
        time_budget=time_budget,
        estimator_list=['lgbm', 'xgboost', 'catboost', 'rf'],
        eval_method='cv',
        n_splits=5,
        metric='log_loss',
        verbose=2,
    )

    print(f"Best estimator: {automl.best_estimator}")
    print(f"Best configuration: {automl.best_config}")
    print(f"Best loss: {automl.best_loss}")

    y_pred = automl.predict(X_test)
    accuracy = (y_pred == y_test).mean()
    print(f"Test accuracy: {accuracy:.4f}")

    return automl
```

## Key Points

- Use AutoGluon for high-quality ensemble models
- Use TPOT for genetic pipeline optimization
- Use H2O AutoML for enterprise-grade automation
- Use FLAML for fast, lightweight AutoML
- Set time limits to control computational cost
- Use early stopping to prevent overfitting
- Ensemble multiple models for better performance
- Evaluate on hold-out test set after tuning
- Export optimized pipelines for reproducibility
- Monitor resource usage during AutoML runs
- Use cross-validation for robust evaluation
- Compare AutoML results with manual tuning baselines
