# Metrics Guide

## Classification Metrics

### Threshold-Dependent Metrics

```
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
)

y_true = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0]
y_pred = [1, 0, 1, 0, 0, 1, 0, 0, 1, 1]

acc = accuracy_score(y_true, y_pred)
prec = precision_score(y_true, y_pred)
rec = recall_score(y_true, y_pred)
f1 = f1_score(y_true, y_pred)
cm = confusion_matrix(y_true, y_pred)
```

| Metric | Formula | Use Case | Limitation |
|--------|---------|----------|------------|
| Accuracy | (TP+TN)/(TP+TN+FP+FN) | Balanced classes | Misleading when imbalanced |
| Precision | TP/(TP+FP) | Minimize false positives | Ignores FN |
| Recall | TP/(TP+FN) | Minimize false negatives | Ignores FP |
| F1 | 2*P*R/(P+R) | Balance P and R | Equal weight on P and R |
| F-beta | (1+b2)*P*R/(b2*P+R) | Unequal weight on P vs R | Requires beta selection |
| Specificity | TN/(TN+FP) | True negative rate | Not used alone |
| Balanced Acc | (Recall+Specificity)/2 | Imbalanced classes | Assumes equal class importance |

### Threshold-Free Metrics

```
from sklearn.metrics import roc_auc_score, average_precision_score

# ROC AUC — ranking quality across all thresholds
roc_auc = roc_auc_score(y_true, y_scores)

# PR AUC (Average Precision) — better for imbalanced
pr_auc = average_precision_score(y_true, y_scores)
```

ROC AUC: probability that a random positive ranks above a random negative. Range [0, 1], 0.5 = random. AUC = 1 means perfect separation. Misleading on highly imbalanced data because FP rate stays low (many true negatives in denominator). PR AUC: precision at different recall levels. More sensitive to class imbalance. Always prefer PR AUC when positives < 10%.

### Probability Metrics

```
from sklearn.metrics import log_loss, brier_score_loss

# Log Loss (Cross-Entropy)
logloss = log_loss(y_true, y_proba)
# Range: [0, inf). Lower is better. Heavily penalizes confident wrong predictions.

# Brier Score
brier = brier_score_loss(y_true, y_proba[:, 1])
# Range: [0, 1]. Lower is better. Measures calibration.
```

Log Loss: heavily penalizes predictions that are confident and wrong. A score of 0.693 = random classifier. Can be infinite if model predicts P=0 or P=1 for wrong class. Brier Score: mean squared error between predicted probabilities and binary outcomes. Decomposable into refinement + calibration + uncertainty. Use for calibration evaluation.

### Multi-Class Metrics

```
from sklearn.metrics import (
    f1_score, roc_auc_score, log_loss,
)

# Macro: average per-class (unweighted). Treats all classes equally.
f1_macro = f1_score(y_true, y_pred, average="macro")

# Weighted: average per-class weighted by support. Handles imbalance.
f1_weighted = f1_score(y_true, y_pred, average="weighted")

# Micro: global average. Equivalent to accuracy for multi-class.
f1_micro = f1_score(y_true, y_pred, average="micro")
```

## Regression Metrics

```
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    mean_absolute_percentage_error,
)

mse = mean_squared_error(y_true, y_pred)
rmse = mean_squared_error(y_true, y_pred, squared=False)
mae = mean_absolute_error(y_true, y_pred)
r2 = r2_score(y_true, y_pred)
mape = mean_absolute_percentage_error(y_true, y_pred)
```

| Metric | Range | Best For | Limitation |
|--------|-------|----------|------------|
| MSE | [0, inf) | Differentiable loss | Sensitive to outliers |
| RMSE | [0, inf) | Same scale as target | Sensitive to outliers |
| MAE | [0, inf) | Robust to outliers | Not differentiable at 0 |
| R-squared | (-inf, 1] | Variance explained | Increases with features |
| MAPE | [0, inf) | Relative error | Undefined if actual=0 |
| MASE | [0, inf) | Scale-independent | Needs naive forecast |

## Ranking Metrics

```
from sklearn.metrics import ndcg_score, label_ranking_average_precision_score

# NDCG: Normalized Discounted Cumulative Gain
ndcg = ndcg_score(y_true, y_scores, k=10)  # top-10 only

# MRR: Mean Reciprocal Rank (for first relevant)
# Implement manually
```

## Metric Selection Matrix

| Data Characteristic | Metric | Reason |
|--------------------|--------|--------|
| Balanced classes | Accuracy, ROC AUC | Threshold and ranking quality |
| Imbalanced <10% | PR AUC, F1, Balanced Acc | Sensitive to minority performance |
| Multi-label | Mean F1, Hamming Loss | Per-label or per-sample metrics |
| High class count | Macro F1, Top-k Accuracy | Unweighted average, partial credit |
| Probabilistic output | Log Loss, Brier Score | Calibration assessment |
| Low tolerance FP | Precision, F-beta(0.5) | Penalize false positives |
| Low tolerance FN | Recall, F-beta(2) | Penalize false negatives |
