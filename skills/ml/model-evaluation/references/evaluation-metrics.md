# Model Evaluation Metrics

## Classification Metrics

```python
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    precision_recall_curve, average_precision_score,
)
import numpy as np

def evaluate_classification(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray = None):
    """Comprehensive classification evaluation."""
    metrics = {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision_macro': precision_score(y_true, y_pred, average='macro'),
        'recall_macro': recall_score(y_true, y_pred, average='macro'),
        'f1_macro': f1_score(y_true, y_pred, average='macro'),
        'precision_weighted': precision_score(y_true, y_pred, average='weighted'),
        'recall_weighted': recall_score(y_true, y_pred, average='weighted'),
        'f1_weighted': f1_score(y_true, y_pred, average='weighted'),
    }

    if y_proba is not None:
        if y_proba.shape[1] == 2:
            metrics['roc_auc'] = roc_auc_score(y_true, y_proba[:, 1])
            metrics['average_precision'] = average_precision_score(y_true, y_proba[:, 1])
        else:
            metrics['roc_auc_ovr'] = roc_auc_score(y_true, y_proba, multi_class='ovr')
            metrics['roc_auc_ovo'] = roc_auc_score(y_true, y_proba, multi_class='ovo')

    cm = confusion_matrix(y_true, y_pred)
    metrics['confusion_matrix'] = cm.tolist()

    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    metrics['true_positive'] = int(tp)
    metrics['true_negative'] = int(tn)
    metrics['false_positive'] = int(fp)
    metrics['false_negative'] = int(fn)

    if tp + fp > 0:
        metrics['precision'] = tp / (tp + fp)
    if tp + fn > 0:
        metrics['recall'] = tp / (tp + fn)
    if tp > 0:
        metrics['f1'] = 2 * metrics['precision'] * metrics['recall'] / (metrics['precision'] + metrics['recall'])
    if tp + fp > 0:
        metrics['specificity'] = tn / (tn + fp)

    return metrics
```

## Regression Metrics

```python
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    mean_absolute_percentage_error, explained_variance_score,
)

def evaluate_regression(y_true: np.ndarray, y_pred: np.ndarray):
    """Comprehensive regression evaluation."""
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred)

    metrics = {
        'mse': float(mse),
        'rmse': float(rmse),
        'mae': float(mae),
        'mape': float(mape),
        'r2': float(r2_score(y_true, y_pred)),
        'explained_variance': float(explained_variance_score(y_true, y_pred)),
        'max_error': float(np.max(np.abs(y_true - y_pred))),
        'median_absolute_error': float(np.median(np.abs(y_true - y_pred))),
    }

    residuals = y_true - y_pred
    metrics['residual_mean'] = float(np.mean(residuals))
    metrics['residual_std'] = float(np.std(residuals))
    metrics['residual_skew'] = float(pd.Series(residuals).skew())
    metrics['residual_kurtosis'] = float(pd.Series(residuals).kurtosis())

    return metrics
```

## Cross-Validation

```python
from sklearn.model_selection import (
    cross_val_score, cross_validate, StratifiedKFold,
    KFold, TimeSeriesSplit,
)

def evaluate_with_cross_validation(model, X, y, cv_strategy='stratified', n_folds=5):
    """Evaluate model with cross-validation."""
    if cv_strategy == 'stratified':
        cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    elif cv_strategy == 'kfold':
        cv = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    elif cv_strategy == 'timeseries':
        cv = TimeSeriesSplit(n_splits=n_folds)
    else:
        raise ValueError(f"Unknown CV strategy: {cv_strategy}")

    scoring = ['accuracy', 'precision_macro', 'recall_macro', 'f1_macro', 'roc_auc_ovr']
    scores = cross_validate(model, X, y, cv=cv, scoring=scoring, return_train_score=True)

    results = {}
    for metric in scoring:
        test_key = f'test_{metric}'
        train_key = f'train_{metric}'
        results[metric] = {
            'mean': float(scores[test_key].mean()),
            'std': float(scores[test_key].std()),
            'train_mean': float(scores[train_key].mean()),
            'train_std': float(scores[train_key].std()),
        }

    return results
```

## Learning Curves

```python
from sklearn.model_selection import learning_curve
import matplotlib.pyplot as plt

def plot_learning_curve(model, X, y, cv=5, train_sizes=np.linspace(0.1, 1.0, 10)):
    """Generate learning curve data for model diagnostics."""
    train_sizes, train_scores, test_scores = learning_curve(
        model, X, y, cv=cv,
        train_sizes=train_sizes,
        scoring='f1_macro',
        n_jobs=-1,
        shuffle=True,
        random_state=42,
    )

    return {
        'train_sizes': train_sizes.tolist(),
        'train_mean': train_scores.mean(axis=1).tolist(),
        'train_std': train_scores.std(axis=1).tolist(),
        'test_mean': test_scores.mean(axis=1).tolist(),
        'test_std': test_scores.std(axis=1).tolist(),
    }
```

## Key Points

- Use multiple metrics for comprehensive evaluation
- Report both macro and weighted averages for imbalanced data
- Use cross-validation for robust performance estimates
- Monitor overfitting by comparing train and test scores
- Use learning curves to diagnose bias-variance tradeoff
- Calculate confidence intervals for performance metrics
- Use stratified sampling for classification CV
- Use time series split for temporal data
- Analyze residuals for regression diagnostics
- Compute confusion matrix for error analysis
- Report AUC-ROC and Average Precision for ranking
- Use bootstrap for uncertainty estimation
