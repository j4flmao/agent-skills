---
name: ml-model-evaluation
description: >
  Use this skill when evaluating model performance, selecting metrics, designing cross-validation strategies, diagnosing bias-variance tradeoffs, or performing statistical significance testing.
  This skill enforces: metric selection by task type, cross-validation strategy by data structure, bias-variance diagnosis, learning curve analysis, statistical significance protocol.
  Do NOT use for: hyperparameter tuning (use ml-hyperparameter-tuning), experiment tracking (use ml-experiment-tracking), model explainability (use ml-model-interpretability).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, evaluation, metrics, phase-11]
---

# ML Model Evaluation

## Purpose
Design comprehensive model evaluation frameworks with appropriate metrics, cross-validation strategies, bias-variance diagnosis, and statistical significance testing.

## Architecture/Decision Trees

### Metric Selection Decision Tree
```
Task type
  ├── Classification
  │   ├── Balanced classes → Accuracy, Log Loss, ROC AUC
  │   ├── Imbalanced (<20% minority)
  │   │   ├── Binary → PR AUC, F1, Balanced Accuracy
  │   │   └── Multi-class → Macro F1, Weighted F1
  │   ├── Probabilistic output → Brier Score, Calibration Error
  │   └── Cost-sensitive → Expected Profit, Cost per Error Type
  ├── Regression
  │   ├── Want interpretability → RMSE (same units as target)
  │   ├── Robust to outliers → MAE (median-focused)
  │   ├── Relative error → MAPE (when no zeros in target)
  │   ├── Scale-independent → MASE (compares to naive baseline)
  │   └── Distributional → CRPS (full predictive distribution)
  ├── Ranking
  │   ├── Multi-level relevance → NDCG (graded, position-discounted)
  │   ├── Binary relevance → MAP, MRR
  │   └── Top-k → Precision@k, Recall@k, Hit Rate@k
  ├── Forecasting
  │   ├── Scale-independent → MASE
  │   ├── Symmetric relative → sMAPE
  │   └── Quantile → Pinball Loss, Quantile Loss
  └── Recommendation
      ├── Ranking quality → NDCG@k, MAP@k
      ├── Diversity → Intra-list similarity, Coverage
      └── Serendipity → Unexpectedness, Novelty
```

### Cross-Validation Strategy Decision Tree
```
Data structure
  ├── IID samples
  │   ├── <1000 samples → Repeated K-Fold (5x5=25 fits) or LOO
  │   ├── 1000-100K samples → K-Fold (5-10 folds)
  │   ├── >100K samples → ShuffleSplit (fewer iterations, faster)
  │   └── Classification → StratifiedKFold (preserve class proportions)
  ├── Grouped data (same entity, multiple rows)
  │   └── GroupKFold (all rows of entity stay together)
  ├── Time series
  │   └── TimeSeriesSplit (expanding or sliding window, never shuffle)
  ├── Imbalanced classification
  │   └── StratifiedKFold + StratifiedShuffleSplit
  └── Hyperparameter tuning needed
      └── Nested CV (outer=5-fold for evaluation, inner=3-fold for tuning)
```

### Bias-Variance Diagnosis
```
Train vs Validation performance
  ├── Train low, Val low (similar) → High Bias (Underfitting)
  │   Fix: more complex model, more features, reduce regularization
  │   Learning curve: both curves plateau at poor performance, gap small
  ├── Train high, Val low (large gap) → High Variance (Overfitting)
  │   Fix: more data, simpler model, more regularization, early stopping
  │   Learning curve: large gap, val curve may still improve with more data
  └── Train high, Val high (similar) → Good Fit
      └── Ideal scenario, model generalizes well
```

## Agent Protocol

### Trigger
User request includes: model evaluation, cross-validation, metrics, confusion matrix, ROC AUC, precision, recall, F1, RMSE, MAE, R-squared, bias-variance, overfitting, learning curve, validation curve, statistical significance.

### Input Context
Before activating, verify:
- Task type (classification, regression, ranking, forecasting, recommendation).
- Dataset size and structure (iid, grouped, time-series, imbalanced).
- Business objective and which errors are most costly (FP vs FN).
- Available compute for cross-validation.
- Whether hyperparameter tuning has been done (nested CV needed).

### Output Artifact
Model evaluation framework with metric selection, CV strategy, significance testing protocol.

### Response Format
```
## Evaluation Framework
### Task Type
{classification / regression / ranking / forecasting / recommendation}

### Metrics
Primary: {name} | Target: {> value}
Secondary: {name} | Target: {> or < value}

### Cross-Validation
Strategy: {k-fold / stratified / grouped / time-series / leave-one-out}
N Folds: {N} | Repeats: {N} | Shuffle: {true/false}

### Statistical Significance
Test: {t-test / McNemar / Wilcoxon / Bayesian}
Alpha: {0.05} | Correction: {Bonferroni / FDR}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Primary metric selected based on task type and business goal.
- [ ] Cross-validation strategy appropriate for data dependence structure.
- [ ] Learning curves generated to diagnose bias-variance.
- [ ] Statistical significance test performed between candidate models.
- [ ] Minimum performance thresholds defined for production.
- [ ] Confidence intervals reported alongside point estimates.

## Workflow

### Step 1: Metric Selection
```python
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score,
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score,
    mean_squared_error, mean_absolute_error, r2_score,
    ndcg_score, label_ranking_average_precision_score,
)

def select_metrics(y_true, y_pred, y_prob, task_type, imbalance_ratio=None):
    metrics = {}
    if task_type == "binary_classification":
        metrics["accuracy"] = accuracy_score(y_true, y_pred)
        metrics["balanced_accuracy"] = balanced_accuracy_score(y_true, y_pred)
        metrics["precision"] = precision_score(y_true, y_pred)
        metrics["recall"] = recall_score(y_true, y_pred)
        metrics["f1"] = f1_score(y_true, y_pred)
        if y_prob is not None:
            metrics["roc_auc"] = roc_auc_score(y_true, y_prob)
            metrics["pr_auc"] = average_precision_score(y_true, y_prob)
        if imbalance_ratio and imbalance_ratio < 0.2:
            metrics["recommended"] = "pr_auc"  # Imbalanced: prefer PR AUC
    elif task_type == "regression":
        metrics["rmse"] = np.sqrt(mean_squared_error(y_true, y_pred))
        metrics["mae"] = mean_absolute_error(y_true, y_pred)
        metrics["r2"] = r2_score(y_true, y_pred)
    return metrics
```

### Step 2: Cross-Validation Strategy
```python
from sklearn.model_selection import (
    KFold, StratifiedKFold, GroupKFold,
    TimeSeriesSplit, RepeatedKFold, cross_validate,
)

def get_cv_strategy(data_type, n_splits=5, n_repeats=3):
    if data_type == "iid":
        return KFold(n_splits=n_splits, shuffle=True, random_state=42)
    elif data_type == "classification":
        return StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    elif data_type == "grouped":
        return GroupKFold(n_splits=n_splits)
    elif data_type == "time_series":
        return TimeSeriesSplit(n_splits=n_splits, gap=0)
    elif data_type == "small":
        return RepeatedKFold(n_splits=n_splits, n_repeats=n_repeats, random_state=42)
```

### Step 3: Bias-Variance Diagnosis
```python
def diagnose_bias_variance(train_scores, val_scores, metric_name="accuracy"):
    train_mean = np.mean(train_scores)
    val_mean = np.mean(val_scores)
    gap = train_mean - val_mean

    if train_mean < 0.7 and val_mean < 0.7:
        diagnosis = "High Bias (Underfitting)"
        recommendations = [
            "Increase model capacity (more layers/trees)",
            "Add more or better features",
            "Reduce regularization (lower C, lower lambda)",
            "Try a different algorithm",
        ]
    elif gap > 0.15:
        diagnosis = "High Variance (Overfitting)"
        recommendations = [
            "Add more training data",
            "Reduce model complexity",
            "Increase regularization (higher C, higher lambda)",
            "Add dropout, early stopping",
        ]
    else:
        diagnosis = "Good Fit"
        recommendations = ["Model generalizes well"]

    return {"diagnosis": diagnosis, "gap": gap, "recommendations": recommendations}
```

### Step 4: Confidence Intervals
```python
def bootstrap_ci(scores, n_bootstrap=10000, ci=0.95):
    """Bootstrap confidence interval for metric."""
    bootstrapped = np.random.choice(scores, (n_bootstrap, len(scores)), replace=True)
    bootstrapped_means = np.mean(bootstrapped, axis=1)
    lower = np.percentile(bootstrapped_means, (1 - ci) / 2 * 100)
    upper = np.percentile(bootstrapped_means, (1 + ci) / 2 * 100)
    return lower, upper
```

### Step 5: Statistical Significance
```python
from scipy import stats

def compare_models(scores_a, scores_b, paired=True):
    """Compare two models with statistical test."""
    if paired and len(scores_a) == len(scores_b):
        # Paired t-test (assumes normal differences)
        t_stat, p_value = stats.ttest_rel(scores_a, scores_b)
        # Wilcoxon signed-rank (non-parametric)
        w_stat, w_p = stats.wilcoxon(scores_a, scores_b)
    else:
        # Independent t-test
        t_stat, p_value = stats.ttest_ind(scores_a, scores_b)
        w_p = None

    return {
        "mean_diff": np.mean(scores_a) - np.mean(scores_b),
        "t_stat": t_stat,
        "p_value": p_value,
        "wilcoxon_p": w_p,
        "significant_005": p_value < 0.05,
    }

def mcnemar_test(y_true, pred_a, pred_b):
    """McNemar test for paired classification predictions."""
    from mlxtend.evaluate import mcnemar
    table = np.zeros((2, 2))
    for i in range(len(y_true)):
        table[pred_a[i] == y_true[i], pred_b[i] == y_true[i]] += 1
    chi2, p = mcnemar(table, corrected=True)
    return {"chi2": chi2, "p_value": p, "significant_005": p < 0.05}
```

### Step 6: Learning Curves
```python
from sklearn.model_selection import learning_curve

def plot_learning_curve(model, X, y, cv, train_sizes):
    train_sizes, train_scores, val_scores = learning_curve(
        model, X, y, cv=cv, train_sizes=train_sizes,
        scoring="accuracy", n_jobs=-1,
    )
    train_mean = np.mean(train_scores, axis=1)
    val_mean = np.mean(val_scores, axis=1)
    train_std = np.std(train_scores, axis=1)
    val_std = np.std(val_scores, axis=1)
    return {
        "train_sizes": train_sizes,
        "train_mean": train_mean,
        "val_mean": val_mean,
        "train_std": train_std,
        "val_std": val_std,
    }
```

## Anti-Patterns

- **Accuracy on imbalanced data**: 99% accuracy on 99:1 imbalance is misleading.
- **Single train/test split**: Too high variance. Always use cross-validation.
- **Shuffling time-series**: Leaks future information. Use temporal CV.
- **Tuning on test set**: Optimistic bias, loss of generalization estimate.
- **Point estimate without CI**: Hides performance variability.
- **ROC AUC when positives <10%**: Over-optimistic. Use PR AUC.
- **No multiple comparison correction**: Inflated false discovery rate.
- **Ignoring data leakage in features**: CV splits must occur before feature computation.
- **Comparing models on single metric**: Need to consider multiple aspects (accuracy, fairness, latency).

## Production Considerations

### Threshold Tuning
```python
def find_optimal_threshold(y_val, y_prob, metric="f1"):
    precision, recall, thresholds = precision_recall_curve(y_val, y_prob)
    if metric == "f1":
        f1 = 2 * precision * recall / (precision + recall + 1e-10)
        best_idx = np.argmax(f1)
        return thresholds[best_idx]
```

### Monitoring
- Track primary metric over time, alert on >5% degradation.
- Monitor data drift (PSI, KS test, population stability index).
- Track prediction distribution shift.
- Monitor per-class metrics separately.
- Compare new models against production baseline with significance tests.
- Set up automated evaluation gates in CI/CD.

## Rules
- ROC AUC misleading on highly imbalanced data → prefer PR AUC.
- Never use accuracy on imbalanced datasets.
- CV must respect data dependencies (grouped, time-series).
- Statistical significance requires multiple evaluations.
- Report confidence intervals with all metrics.
- Learning curves need at least 5 train sizes.
- Always set random seed for splits.
- Separate tuning, validation, and test sets.
- Metric selection before seeing model results.

## References
  - references/evaluation-metrics.md — Model Evaluation Metrics
  - references/evaluation-strategies.md — Evaluation Strategies
  - references/evaluation-techniques.md — Model Evaluation Techniques
  - references/metrics-guide.md — Metrics Guide
  - references/model-comparison.md — Model Comparison
  - references/model-evaluation-advanced.md — Model Evaluation Advanced Topics
  - references/model-evaluation-fundamentals.md — Model Evaluation Fundamentals
  - references/ranking-metrics.md — Ranking & Recommendation Evaluation
## Handoff
Hand off to ml-experiment-tracking for logging evaluation results. Hand off to ml-hyperparameter-tuning if optimization needed.
