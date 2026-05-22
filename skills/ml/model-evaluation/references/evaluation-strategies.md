# Evaluation Strategies

## Cross-Validation Methods

### K-Fold Variants
```
from sklearn.model_selection import (KFold, StratifiedKFold, GroupKFold,
    TimeSeriesSplit, RepeatedKFold, cross_val_score)

cv = KFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(model, X, y, cv=cv, scoring="f1")

# Repeated — reduce estimate variance
cv = RepeatedKFold(n_splits=5, n_repeats=10, random_state=42)

# Stratified — preserve class proportions per fold
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# Group — all same-group samples stay together
cv = GroupKFold(n_splits=5)
```

### Nested Cross-Validation
```
inner_cv = KFold(n_splits=3, shuffle=True, random_state=42)
outer_cv = KFold(n_splits=5, shuffle=True, random_state=42)
clf = GridSearchCV(estimator=SVC(), param_grid=param_grid, cv=inner_cv)
nested_scores = cross_val_score(clf, X, y, cv=outer_cv, scoring="accuracy")
```

| CV Strategy | Data Structure | When to Use |
|------------|---------------|-------------|
| K-Fold | Random iid | General purpose |
| Stratified K-Fold | Imbalanced classification | Preserve class ratios |
| Group K-Fold | Grouped/clustered | Medical per-patient, user data |
| Repeated K-Fold | Small dataset | Reduce estimate variance |
| Leave-One-Out | Very small (<100) | Max data utilization |
| Time Series Split | Temporal data | No future leakage |
| Nested CV | Tuning + evaluation | Unbiased performance estimate |

### Time Series CV
```
tscv = TimeSeriesSplit(n_splits=5, max_train_size=1000)
for train_idx, val_idx in tscv.split(X):
    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]
```

Expanding window: train on all past, test on next block. Sliding window: fixed training size, slides forward. Gap: introduce gap between train and test to prevent autocorrelation leakage.

## Learning Curves
```
from sklearn.model_selection import learning_curve
train_sizes_abs, train_scores, val_scores = learning_curve(
    model, X, y, train_sizes=[0.1, 0.2, 0.4, 0.6, 0.8, 1.0], cv=5, scoring="f1", n_jobs=-1)
train_mean, val_mean = train_scores.mean(axis=1), val_scores.mean(axis=1)
```

High bias: train and val curves converge but at poor performance. Fix: increase capacity, add features. High variance: large gap between train and val. Fix: add data, reduce complexity, early stopping. Good fit: curves converge at acceptable performance with small gap.

## Statistical Significance

### Paired T-Test
```
from scipy import stats
scores_a = [0.85, 0.87, 0.86, 0.84, 0.88]
scores_b = [0.83, 0.84, 0.85, 0.82, 0.86]
t_stat, p_value = stats.ttest_rel(scores_a, scores_b)
```

### McNemar Test
```
from statsmodels.stats.contingency_tables import mcnemar
table = [[100, 10], [15, 75]]
result = mcnemar(table, exact=False, correction=True)
```

### Bayesian Comparison
```
diffs = np.array(scores_a) - np.array(scores_b)
prob_a_better = np.sum(diffs > 0) / len(diffs)
```

### Multiple Comparison Correction
```
from statsmodels.stats.multitest import multipletests
p_values = [0.01, 0.04, 0.03, 0.20, 0.06]
reject, corrected, _, _ = multipletests(p_values, method="bonferroni")
```

## Backtesting for Time Series
```
def backtest(model, X, y, n_splits=5, gap=0):
    fold_size = len(X) // (n_splits + 1); scores = []
    for i in range(n_splits):
        train_end = (i + 1) * fold_size
        test_start = train_end + gap
        test_end = min(test_start + fold_size, len(X))
        model.fit(X[:train_end], y[:train_end])
        scores.append(evaluate(model, X[test_start:test_end], y[test_start:test_end]))
    return np.mean(scores), np.std(scores)
```

## Best Practices
- Report mean +- std across CV folds: 0.87 +- 0.02.
- Use same CV splits for fair model comparison.
- Set random seed for all splits for reproducibility.
- Never use test data for decision-making during development.
- Monitor prediction distribution shift between CV and production.
