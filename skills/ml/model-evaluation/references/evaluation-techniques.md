# Model Evaluation Techniques

## Holdout Validation

```python
from sklearn.model_selection import train_test_split, StratifiedShuffleSplit
import numpy as np
import pandas as pd

def stratified_split(X, y, test_size=0.2, val_size=0.2, random_state=42):
    """
    Create train/validation/test splits with stratification.
    """
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=test_size,
        stratify=y, random_state=random_state,
    )

    val_relative = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_relative,
        stratify=y_temp, random_state=random_state,
    )

    return {
        'X_train': X_train, 'X_val': X_val, 'X_test': X_test,
        'y_train': y_train, 'y_val': y_val, 'y_test': y_test,
        'sizes': {
            'train': len(X_train), 'val': len(X_val), 'test': len(X_test),
        }
    }
```

## Confidence Intervals

```python
from scipy import stats

def bootstrap_confidence_interval(y_true, y_pred, metric_fn, n_bootstrap=1000, ci=95):
    """
    Compute confidence intervals using bootstrap sampling.
    """
    n = len(y_true)
    scores = []

    for _ in range(n_bootstrap):
        indices = np.random.choice(n, n, replace=True)
        y_true_boot = y_true[indices]
        y_pred_boot = y_pred[indices]

        try:
            score = metric_fn(y_true_boot, y_pred_boot)
            scores.append(score)
        except:
            continue

    scores = np.array(scores)
    lower = np.percentile(scores, (100 - ci) / 2)
    upper = np.percentile(scores, 100 - (100 - ci) / 2)

    return {
        'metric': float(np.mean(scores)),
        'ci_lower': float(lower),
        'ci_upper': float(upper),
        'ci_level': ci,
        'std': float(np.std(scores)),
    }

def statistical_comparison(model1_scores, model2_scores, alpha=0.05):
    """
    Compare two models using paired statistical tests.
    """
    from scipy.stats import wilcoxon, ttest_rel

    if len(model1_scores) == len(model2_scores):
        _, wilcoxon_p = wilcoxon(model1_scores, model2_scores)
        _, ttest_p = ttest_rel(model1_scores, model2_scores)

        return {
            'model1_mean': float(np.mean(model1_scores)),
            'model2_mean': float(np.mean(model2_scores)),
            'wilcoxon_p': float(wilcoxon_p),
            'ttest_p': float(ttest_p),
            'significant_wilcoxon': wilcoxon_p < alpha,
            'significant_ttest': ttest_p < alpha,
            'alpha': alpha,
        }
    return None
```

## Threshold Tuning

```python
from sklearn.metrics import precision_recall_curve, f1_score
import numpy as np

def find_optimal_threshold(y_true, y_proba, metric='f1'):
    """
    Find optimal decision threshold for binary classification.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_proba)

    if metric == 'f1':
        scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
    elif metric == 'youden':
        scores = recalls - (1 - precisions)
    else:
        raise ValueError(f"Unknown metric: {metric}")

    best_idx = np.argmax(scores[:-1])
    best_threshold = thresholds[best_idx]

    return {
        'best_threshold': float(best_threshold),
        'best_score': float(scores[best_idx]),
        'precision': float(precisions[best_idx]),
        'recall': float(recalls[best_idx]),
    }

def evaluate_at_thresholds(y_true, y_proba, thresholds):
    """Evaluate model at multiple thresholds."""
    results = []
    for threshold in thresholds:
        y_pred = (y_proba >= threshold).astype(int)
        results.append({
            'threshold': threshold,
            'f1': f1_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred),
            'recall': recall_score(y_true, y_pred),
        })
    return results
```

## Model Drift Detection

```python
from scipy.stats import ks_2samp, chi2_contingency

def detect_data_drift(reference_data, current_data, categorical_features=None):
    """
    Detect data drift between reference and current datasets.
    """
    drift_report = {}

    for column in reference_data.columns:
        if categorical_features and column in categorical_features:
            ref_counts = reference_data[column].value_counts(normalize=True)
            curr_counts = current_data[column].value_counts(normalize=True)

            contingency = pd.crosstab(
                pd.concat([reference_data[column], current_data[column]]),
                pd.concat([pd.Series(['ref']*len(reference_data),
                                      ['curr']*len(current_data))]),
            )

            _, p_value, _, _ = chi2_contingency(contingency)
            drift_detected = p_value < 0.05

        else:
            statistic, p_value = ks_2samp(reference_data[column], current_data[column])
            drift_detected = p_value < 0.05

        drift_report[column] = {
            'test': 'chi2' if (categorical_features and column in categorical_features) else 'ks',
            'p_value': float(p_value),
            'drift_detected': bool(drift_detected),
        }

    return drift_report
```

## Key Points

- Create stratified splits for imbalanced datasets
- Use bootstrap for confidence interval estimation
- Compare models with statistical significance tests
- Tune decision thresholds for production requirements
- Monitor data drift for model degradation
- Track prediction drift for production models
- Evaluate on representative test data
- Use temporal validation for time series data
- Implement A/B testing for model comparison
- Log all evaluation results for reproducibility
- Automate drift detection monitoring
- Set alert thresholds based on business impact
