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

## Metric Catalog — When to Use Which

### Classification Metrics

| Metric | Formula | Range | Best For | Caution |
|--------|---------|-------|----------|---------|
| Accuracy | (TP + TN) / (TP+TN+FP+FN) | [0,1] | Balanced classes | Misleading on imbalanced data |
| Precision | TP / (TP + FP) | [0,1] | Minimizing false positives | Ignores false negatives |
| Recall | TP / (TP + FN) | [0,1] | Minimizing false negatives | Ignores false positives |
| F1 Score | 2 * P * R / (P + R) | [0,1] | Balancing P and R | Equal weight to both |
| F-beta | (1+b^2)*P*R/(b^2*P+R) | [0,1] | Asymmetric cost | Need to choose beta |
| ROC AUC | Area under TPR vs FPR curve | [0.5, 1] | Overall ranking quality | Misleading on imbalanced |
| PR AUC | Area under P vs R curve | [0, 1] | Imbalanced classes | Harder to interpret |
| Log Loss | -sum(y*log(p)+(1-y)*log(1-p)) | [0, inf) | Probabilistic calibration | Punishes confident errors |
| MCC | Matthew's correlation coefficient | [-1, 1] | Single metric for binary | Hard to interpret intuitively |
| Cohen's Kappa | (P_obs - P_exp) / (1 - P_exp) | [-1, 1] | Inter-rater agreement | Assumes random baseline |

### Regression Metrics

| Metric | Formula | Range | Best For | Caution |
|--------|---------|-------|----------|---------|
| MSE | (1/n)*sum(y - y_hat)^2 | [0, inf) | Gaussian errors | Sensitive to outliers |
| RMSE | sqrt(MSE) | [0, inf) | Same unit as target | Same as MSE |
| MAE | (1/n)*sum(|y - y_hat|) | [0, inf) | Robust to outliers | Not differentiable at 0 |
| MAPE | (100/n)*sum(|y-y_hat|/|y|) | [0, inf) | Relative error | Undefined when y=0 |
| SMAPE | (200/n)*sum(|y-y_hat|/(|y|+|y_hat|)) | [0, 200] | Symmetric relative | Biased when y or y_hat near 0 |
| R-squared | 1 - SS_res / SS_tot | (-inf, 1] | Variance explained | Increases with features |
| Adjusted R2 | 1 - (1-R^2)*(n-1)/(n-p-1) | (-inf, 1] | Penalized R-squared | More complex selection |
| Explained Variance | 1 - Var(y-y_hat)/Var(y) | (-inf, 1] | Variance explained | Different from R2 |

### Ranking Metrics

| Metric | Range | Best For | Key Property |
|--------|-------|----------|-------------|
| NDCG@k | [0, 1] | Graded relevance | Discounts rank position |
| MRR | [0, 1] | First relevant position | Only cares about rank 1 |
| Hit Rate@k | [0, 1] | Binary relevance | Simple, interpretable |
| MAP@k | [0, 1] | Multiple relevant items | Average precision at k |
| AUC | [0.5, 1] | Overall ranking quality | P(positive ranked above negative) |

## Cross-Validation Strategies — When to Use

| Strategy | Data Pattern | When to Use | Pitfall |
|----------|-------------|-------------|---------|
| K-Fold (k=5 or 10) | IID data | Default for most tasks | Not for time series or groups |
| Stratified K-Fold | Imbalanced | Classification on imbalanced | Preserves class proportion |
| Group K-Fold | Grouped data | Multiple rows per user/hospital | Test group seen in train -> leakage |
| Time Series Split | Temporal | Forecasting, time-dependent | Shuffling leaks future into past |
| Leave-One-Out | Very small data (n < 100) | Maximize training data | Expensive (n models), high variance |
| Repeated K-Fold | Small data | Reduce variance of estimate | Correlated runs |
| Purged CV | Financial time series | Prevent leakage from adjacent points | Requires gap between train/test |
| Stratified Group K-Fold | Grouped + imbalanced | Medical, user-level classification | Rare combinations hard to find |

### CV Implementation — Time Series Split
```python
from sklearn.model_selection import TimeSeriesSplit

def evaluate_timeseries(X, y, model_fn, n_splits=5):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    scores = []
    for train_idx, test_idx in tscv.split(X):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        # IMPORTANT: no standardization fitted on future data
        model = model_fn()
        model.fit(X_train, y_train)
        scores.append(model.score(X_test, y_test))

    return {"mean_score": np.mean(scores), "scores": scores,
            "std": np.std(scores)}
```

## Statistical Significance for Model Comparison

### McNemar's Test (paired, classification)
```python
from scipy.stats import chi2

def mcnemar_test(y_true, y_model_a, y_model_b):
    # Contingency table
    n01 = sum((y_model_a == y_true) & (y_model_b != y_true))
    n10 = sum((y_model_a != y_true) & (y_model_b == y_true))

    # McNemar's chi-squared (with continuity correction)
    chi2_stat = (abs(n01 - n10) - 1)**2 / (n01 + n10 + 1e-10)
    p_value = 1 - chi2.cdf(chi2_stat, df=1)

    return {"statistic": chi2_stat, "p_value": p_value,
            "model_a_better": n10 < n01}
```

### Paired Bootstrap (any metric)
```python
def paired_bootstrap_test(y_true, pred_a, pred_b, metric_fn,
                          n_bootstrap=10000, alpha=0.05):
    """Test if model A is significantly different from model B."""
    n = len(y_true)
    diffs = []
    for _ in range(n_bootstrap):
        idx = np.random.choice(n, n, replace=True)
        score_a = metric_fn(y_true[idx], pred_a[idx])
        score_b = metric_fn(y_true[idx], pred_b[idx])
        diffs.append(score_a - score_b)

    # Confidence interval of the difference
    ci = np.percentile(diffs, [alpha/2*100, (1-alpha/2)*100])
    significant = (ci[0] > 0) or (ci[1] < 0)

    return {
        "mean_diff": np.mean(diffs),
        "ci": ci,
        "significant": significant,
        "p_value": np.mean(np.array(diffs) <= 0),
    }
```

## Learning Curve Template

```python
import matplotlib.pyplot as plt
from sklearn.model_selection import learning_curve

def plot_learning_curve(model, X, y, train_sizes=np.linspace(0.1, 1.0, 10)):
    train_sizes, train_scores, test_scores = learning_curve(
        model, X, y, cv=5, train_sizes=train_sizes,
        scoring="f1", n_jobs=-1,
    )

    train_mean = np.mean(train_scores, axis=1)
    train_std = np.std(train_scores, axis=1)
    test_mean = np.mean(test_scores, axis=1)
    test_std = np.std(test_scores, axis=1)

    plt.plot(train_sizes, train_mean, label="Training score")
    plt.fill_between(train_sizes, train_mean - train_std,
                     train_mean + train_std, alpha=0.2)
    plt.plot(train_sizes, test_mean, label="Cross-validation score")
    plt.fill_between(train_sizes, test_mean - test_std,
                     test_mean + test_std, alpha=0.2)

    # Interpretation:
    # High train, low test = high variance (overfitting) -> more data or regularization
    # Low train, low test = high bias (underfitting) -> more complex model
    # Gap closing with more data = model benefits from more data
```

## Model Evaluation Anti-Patterns

1. **Accuracy on imbalanced data**: 99% accuracy when 99% of samples are class A
   Fix: Use PR AUC, F1, MCC, or balanced accuracy
2. **Leaky CV**: Random instead of grouped or temporal splits
   Fix: Match CV strategy to data dependencies
3. **Peeking at test set**: Selecting model based on test set performance
   Fix: Hold-out test set until final evaluation only
4. **Multiple comparisons**: Testing 100 models, declaring the best significant
   Fix: Bonferroni correction or hold-out set for final comparison
5. **No confidence intervals**: Reporting single metric without uncertainty
   Fix: Bootstrap confidence intervals for all reported metrics

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
