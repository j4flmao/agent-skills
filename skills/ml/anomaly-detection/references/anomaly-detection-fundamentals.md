# Anomaly Detection Fundamentals

How to frame an anomaly detection problem, choose a first method, set thresholds, and evaluate results. Method deep dives are in `statistical-methods.md`, `classical-anomaly.md`, `deep-learning-anomaly.md`, `online-anomaly.md`; evaluation details in `anomaly-evaluation.md`.

## 1. Problem Framing

| Question | Options |
|---|---|
| What is an anomaly? | Point (single unusual value), contextual (unusual for its time/segment), collective (unusual sequence or group) |
| Labels available? | None (unsupervised), only normal data (semi-supervised / novelty detection), labelled anomalies (supervised, often imbalanced classification) |
| Data shape | Tabular, univariate time series, multivariate time series, logs/events, images, graphs |
| Latency | Batch (daily review), near real-time (minutes), streaming (per event) |
| Action | Alert a human, block a transaction, open a ticket, annotate a dashboard |
| Cost of errors | False positive (wasted investigation, user friction) vs false negative (missed fraud/outage) |

Write the answers down; they determine the method and the threshold far more than model choice does.

## 2. Outlier vs Novelty Detection

| | Outlier detection | Novelty detection |
|---|---|---|
| Training data | Contains anomalies | Clean, normal-only |
| scikit-learn usage | `IsolationForest`, `LocalOutlierFactor()` fit/predict on same data | `OneClassSVM`, `LocalOutlierFactor(novelty=True)` fit on normal, predict on new |

## 3. Method Selection Starting Points

| Situation | First method |
|---|---|
| Univariate metric, roughly stable | Robust z-score (median and MAD) or IQR fences |
| Univariate with trend/seasonality | Decompose (STL) and threshold the residual; or forecast and threshold the error |
| Tabular, unlabelled, mixed features | Isolation Forest |
| Tabular, local density matters | Local Outlier Factor |
| Many labelled anomalies | Gradient-boosted classifier with class weighting |
| High-dimensional (images, sequences) | Autoencoder reconstruction error, or embeddings + kNN distance |
| Streaming | Online statistics (EWMA), streaming trees (e.g. river's HalfSpaceTrees) |

Start simple, establish a baseline, and only add complexity when evaluation shows a gap.

## 4. Robust Z-Score Baseline

```python
import numpy as np

def robust_z(x: np.ndarray) -> np.ndarray:
    median = np.median(x)
    mad = np.median(np.abs(x - median))
    if mad == 0:
        raise ValueError("MAD is zero; series is constant or nearly constant")
    return 0.6745 * (x - median) / mad          # 0.6745 scales MAD to sigma for normal data

values = np.array([102, 99, 101, 98, 100, 250, 97, 103])
flags = np.abs(robust_z(values)) > 3.5          # common cutoff (Iglewicz & Hoaglin)
```

Mean/standard-deviation z-scores are distorted by the very outliers you want to find; median/MAD is robust.

## 5. Isolation Forest Baseline

```python
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import make_column_transformer

pre = make_column_transformer(
    (StandardScaler(), ["amount", "items", "minutes_since_last"]),
    (OneHotEncoder(handle_unknown="ignore"), ["country", "channel"]),
)
model = make_pipeline(pre, IsolationForest(n_estimators=300, contamination="auto", random_state=42))
model.fit(train_df)

scores = -model.score_samples(new_df)           # higher = more anomalous
threshold = np.quantile(scores, 0.995)           # alert on top 0.5% (budget-based threshold)
alerts = new_df[scores > threshold]
```

Isolation Forest needs no scaling in principle (tree-based), but encoding categoricals is required. `contamination` only affects `predict()` labels; for alerting, derive thresholds from scores explicitly.

## 6. Thresholding Strategies

| Strategy | When |
|---|---|
| Fixed statistical cutoff (e.g. robust z > 3.5) | Simple univariate metrics |
| Alert budget (top N or top q% per period) | Investigation capacity is the constraint |
| Precision target on labelled validation data | Labels available |
| Dynamic per segment/time (per customer, hour-of-week) | Strong contextual differences |
| Cost-based | Known costs of false positives and false negatives |

Persist the threshold with the model version; re-evaluate it when data drifts.

## 7. Evaluation Basics

- Anomalies are rare: accuracy is meaningless. Use precision, recall, F1 at the operating threshold, and PR-AUC across thresholds.
- Precision@k matches alert-budget workflows ("of the top 50 alerts, how many were real?").
- For time series, count detected anomaly *events* (with tolerance windows) rather than individual points.
- Without labels: inject synthetic anomalies to estimate recall, and have reviewers label a sample of alerts to estimate precision.

## 8. Workflow

```
Define anomaly + action → collect normal history → baseline method
→ threshold by budget/target → offline evaluation (labels or injected anomalies)
→ shadow mode (log, do not alert) → review samples → go live → feedback labels → retrain
```

## Pitfalls

- Training on data that contains the anomalies you want to detect, then calling them normal (for novelty methods).
- Ignoring seasonality: every Monday morning looks anomalous.
- Leakage: features computed using future data.
- Shipping without a feedback loop; precision silently decays.

## Checklist

- [ ] Anomaly type, label situation, latency, and action documented.
- [ ] Simple baseline implemented and evaluated before complex models.
- [ ] Threshold chosen by budget, precision target, or cost, and versioned.
- [ ] Evaluation with PR metrics, event-level matching, or labelled samples.
- [ ] Shadow period and feedback loop before alerting goes live.
