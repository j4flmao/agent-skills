# Model Evaluation Fundamentals: Evaluation Design, Metric Choice and Honest Estimates

The foundations of evaluating machine learning models so offline numbers predict real-world performance: aligning evaluation with the decision, data splitting and validation schemes, choosing metrics, reading confusion matrices and curves, baselines, uncertainty in estimates, and slice analysis. Detailed metric catalogs, statistical comparison tests and ranking metrics are in sibling references.

## Evaluation Starts From the Decision

| Question | Evaluation consequence |
|----------|------------------------|
| What action does the prediction trigger? | Metric at the operating point (precision at k, recall at a threshold), not only global metrics |
| What do different errors cost? | Weighted costs or asymmetric metrics |
| Who is affected? | Slice metrics across user groups |
| What does "good enough" mean? | Acceptance criteria set before training |
| How does the world change after deployment? | Temporal validation, monitoring plan |

Write acceptance criteria up front, for example: "Recall at least 0.80 at precision at least 0.60 on the most recent quarter, no region below recall 0.70."

## Validation Schemes

| Scheme | Use | Caveat |
|--------|-----|--------|
| Holdout (train/validation/test) | Large datasets | Single split estimate is noisy for small data |
| k-fold cross-validation | Small to medium i.i.d. data | Must keep preprocessing inside folds |
| Stratified k-fold | Classification, especially imbalanced | Preserves class ratios |
| Group k-fold | Multiple rows per entity | Prevents entity leakage |
| Time series split / rolling origin | Temporal data | Train strictly before test; add a gap if labels mature over time |
| Nested cross-validation | Tuning and estimating on small data | Outer loop estimates, inner loop tunes |

The final test set should resemble production: same population, same time period structure, same label definition.

## Classification Metrics in Context

```text
                Predicted positive   Predicted negative
Actual positive        TP                   FN
Actual negative        FP                   TN
```

| Metric | Formula | Use when |
|--------|---------|----------|
| Accuracy | (TP+TN)/N | Balanced classes and symmetric costs only |
| Precision | TP/(TP+FP) | False positives are costly (alerts, interventions) |
| Recall (sensitivity) | TP/(TP+FN) | Missing positives is costly (fraud, disease) |
| Specificity | TN/(TN+FP) | Correctly clearing negatives matters |
| F1 / F-beta | Harmonic mean (beta weights recall) | Single number at a threshold |
| Balanced accuracy | Mean of recall per class | Imbalanced data, quick summary |
| ROC AUC | Ranking quality across thresholds | Comparing rankers; can look good under heavy imbalance |
| PR AUC (average precision) | Precision-recall trade-off | Rare positive class |
| Log loss, Brier score | Probability quality | Probabilities are consumed directly |
| Matthews correlation coefficient | Correlation of predictions and truth | Imbalanced binary summary |

Threshold-free metrics (AUCs) compare models; threshold-dependent metrics describe what happens in operation. Report both.

```python
from sklearn.metrics import (classification_report, roc_auc_score, average_precision_score,
                             brier_score_loss, confusion_matrix)

proba = model.predict_proba(X_test)[:, 1]
pred = (proba >= threshold).astype(int)

print(confusion_matrix(y_test, pred))
print(classification_report(y_test, pred, digits=3))
print("ROC AUC", roc_auc_score(y_test, proba))
print("PR AUC ", average_precision_score(y_test, proba))
print("Brier  ", brier_score_loss(y_test, proba))
```

## Regression Metrics in Context

| Metric | Properties |
|--------|------------|
| MAE | In target units; robust to outliers; median-optimal |
| RMSE | Penalizes large errors; mean-optimal |
| MAPE | Percentage; undefined at zero, asymmetric; prefer sMAPE or MASE for forecasting |
| R2 | Variance explained relative to predicting the mean; can be negative; not comparable across datasets |
| Quantile (pinball) loss | Evaluates quantile predictions |
| Interval coverage and width | For prediction intervals |

Report errors in business units ("average error of 3.2 days") alongside statistical metrics.

## Baselines

Every evaluation includes:
- A trivial baseline (majority class, mean, last value for time series, seasonal naive).
- The current production model or rule, if any.
- A simple model (linear) to justify complexity.

## Uncertainty of the Estimate

A metric computed on a finite test set is an estimate with variance.

```python
import numpy as np
from sklearn.metrics import roc_auc_score

rng = np.random.default_rng(42)
y_true, scores = np.asarray(y_test), np.asarray(proba)
boot = []
for _ in range(1000):
    idx = rng.integers(0, len(y_true), len(y_true))
    if len(np.unique(y_true[idx])) < 2:
        continue
    boot.append(roc_auc_score(y_true[idx], scores[idx]))
low, high = np.percentile(boot, [2.5, 97.5])
print(f"ROC AUC 95% CI: [{low:.3f}, {high:.3f}]")
```

- Report confidence intervals or cross-validation spread, not just a point value.
- Small differences between models (within the interval) are not evidence of improvement; use paired comparisons (see `model-comparison.md`).
- Rare-positive problems need enough positives in the test set; the number of positives, not total rows, drives uncertainty of recall.

## Slice Analysis

Aggregate metrics hide failures:
- Compute metrics per segment (region, device, customer tier, new vs returning, time period).
- Check performance on rare but important slices.
- For people-affecting models, compare error rates across protected groups (for example false positive rate and false negative rate parity) as required by policy and regulation.

```python
import pandas as pd
from sklearn.metrics import recall_score, precision_score

df = pd.DataFrame({"y": y_test, "pred": pred, "segment": segment_test})
summary = df.groupby("segment").apply(
    lambda g: pd.Series({
        "n": len(g),
        "positives": int(g.y.sum()),
        "recall": recall_score(g.y, g.pred, zero_division=0),
        "precision": precision_score(g.y, g.pred, zero_division=0),
    })
)
```

## Error Analysis

1. Sample false positives and false negatives; read them.
2. Group errors by hypothesized cause (label noise, missing feature, rare pattern).
3. Fix the biggest group (data, features, labels) and re-evaluate.

Error analysis often finds label errors; consider cleaning the evaluation set (and documenting it) before chasing metric gains.

## Offline vs Online Evaluation

Offline metrics are proxies. Confirm with online evaluation where possible:
- Shadow deployment (compare predictions without acting).
- A/B tests on business metrics.
- Monitoring of prediction distribution and delayed labels after launch.

## Common Pitfalls

| Pitfall | Consequence |
|---------|-------------|
| Leakage through preprocessing or features | Inflated metrics |
| Random split on temporal data | Overly optimistic estimates |
| Choosing threshold on the test set | Biased final estimate |
| Accuracy on imbalanced data | Misleadingly high score |
| Single global metric only | Hidden failures on slices |
| No confidence interval | Overinterpreting noise |
| Evaluation set not representative of production | Surprises after launch |

## Checklist

- [ ] Acceptance criteria defined before modeling
- [ ] Validation scheme matches data structure (stratified, grouped, temporal)
- [ ] Threshold-free and operating-point metrics reported
- [ ] Baselines and current production model included
- [ ] Confidence intervals or fold variability reported
- [ ] Slice metrics and error analysis done
- [ ] Plan for online validation and monitoring
