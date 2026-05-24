# Feature Engineering Validation

## Data Leakage Prevention

| Leakage Type | Example | Detection | Prevention |
|-------------|---------|-----------|------------|
| Target leakage | Using future data to predict past | Feature-target correlation > 0.95 | Temporal train/test split |
| Train-test contamination | Scaling before split | Identical statistics in train/test | Fit scaler on train only |
| Feature leakage | Using label-derived features | Feature highly correlated with target | Remove derived features |
| Group leakage | Same entity in train AND test | Duplicate user IDs | GroupKFold by entity ID |
| Causal leakage | Feature caused by target (reverse causality) | Feature timestamp after target | Only use pre-event features |

```python
# Temporal split to prevent leakage
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5, test_size=1000, gap=100)
for train_idx, test_idx in tscv.split(X):
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    # Fit preprocessing on train ONLY
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
```

## Feature Selection Bias

| Bias Source | Effect | Mitigation |
|-------------|--------|------------|
| Pre-screening | Features selected on full data overfit | Nested cross-validation |
| Correlation-based drop | Removes features predictive only in combination | Model-based selection (L1) |
| Missing value threshold | May remove informative features with missing | Use missingness as a feature |
| Variance threshold | Removes low-variance features that could be predictive | Use task-relevance criterion |
| P-value based | Correlation in sample ≠ correlation in population | Use regularized models (LASSO, Ridge) |

```python
# Nested cross-validation for unbiased feature selection
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.model_selection import cross_val_score, KFold

# Inner loop: feature selection
inner_cv = KFold(5)
# Outer loop: performance estimation
outer_cv = KFold(5)

scores = []
for train_idx, test_idx in outer_cv.split(X, y):
    X_outer_train, X_outer_test = X[train_idx], X[test_idx]
    y_outer_train, y_outer_test = y[train_idx], y[test_idx]

    # Feature selection on outer training fold
    selector = SelectKBest(f_classif, k=20)
    X_selected = selector.fit_transform(X_outer_train, y_outer_train)

    # Evaluate on outer test fold
    model = LogisticRegression()
    model.fit(X_selected, y_outer_train)
    score = model.score(
        selector.transform(X_outer_test), y_outer_test
    )
    scores.append(score)
```

## Validation Strategies

| Strategy | When | Bias |
|----------|------|------|
| Random K-Fold | IID data | Low |
| Stratified K-Fold | Imbalanced classification | Low |
| Group K-Fold | Grouped data (user, session) | Low (correct) |
| Time Series Split | Temporal data | Correct for time |
| Purged K-Fold | Financial data (purge overlapping) | Correct for auto-correlation |
| Leave-One-Out | Very small datasets | High variance |

## Feature Validation Checklist

```yaml
validation:
  - name: correlation_check
    description: "Ensure no feature correlates > 0.99 with another"
    action: drop_correlated
  - name: target_leakage
    description: "Check no feature has > 0.9 correlation with target"
    action: investigate_and_remove
  - name: missing_value_check
    description: "Flag features with > 50% missing values"
    action: consider_removal
  - name: distribution_shift
    description: "Compare train/test distributions (KS test, p < 0.01)"
    action: flag_for_review
  - name: cardinality_check
    description: "High-cardinality categorical features > 1000 unique"
    action: consider_target_encoding
  - name: timestamp_ordering
    description: "No feature timestamp after target timestamp"
    action: remove_leaked_features
```
