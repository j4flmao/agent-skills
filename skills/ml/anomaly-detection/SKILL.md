---
name: ml-anomaly-detection
description: >
  Use this skill when detecting anomalies or outliers in data, building unsupervised anomaly detection systems, applying statistical methods (Z-score/IQR), proximity-based (LOF), ensemble (Isolation Forest), deep learning (autoencoder/VAE), or time-series anomaly detection.
  This skill enforces: method selection by data characteristics (tabular/time-series/high-dim), statistical baseline (Z-score/IQR), model configuration (contamination rate, threshold), evaluation with precision/recall at k, real-time pipeline design.
  Do NOT use for: supervised fraud detection with labeled data (use classification skill), data quality checks (use data-validation skill), root cause analysis of detected anomalies, or forecasting (use ml-time-series).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, anomaly, detection, phase-11]
---

# ML Anomaly Detection

## Quick Start
```python
from sklearn.ensemble import IsolationForest
model = IsolationForest(contamination=0.05).fit(X_train)
predictions = model.predict(X_test)
anomalies = X_test[predictions == -1]
```

## Purpose
Design anomaly detection systems with appropriate statistical, proximity-based, ensemble, and deep learning methods, including evaluation protocols and real-time deployment pipelines.

## Architecture/Decision Trees

### Method Selection Decision Tree
```
Data characteristics
  ├── Low-dimensional tabular (< 50 features)
  │   ├── Need interpretability, fast baseline
  │   │   ├── Normal distribution → Z-score / Modified Z-score (MAD)
  │   │   └── Any distribution → IQR (non-parametric)
  │   ├── Varying density clusters → LOF (Local Outlier Factor)
  │   ├── Best general purpose → Isolation Forest
  │   ├── Clean training data, novelty detection → One-Class SVM
  │   └── Mixed feature types → HBOS (Histogram-based, fast)
  ├── High-dimensional tabular (> 50 features)
  │   ├── Scales well → Isolation Forest (O(n log n))
  │   ├── Non-linear compression → Autoencoder (needs >1000 normal samples)
  │   ├── Probabilistic separation → VAE
  │   └── Very fast → HBOS (feature-independent histograms)
  ├── Time-series
  │   ├── Regular seasonality → STL decomposition + residual Z-score
  │   ├── Known pattern → Twitter AnomalyDetection / Prophet
  │   ├── Complex temporal dependencies → LSTM Autoencoder
  │   └── Real-time → Moving average + deviation bands
  └── Image/Video
      ├── Reconstruction-based → Autoencoder / VAE
      ├── Feature-based → DeepSVDD (hypersphere around normal)
      └── Patch-based → PatchCore (memory bank of normal patches)
```

### Anomaly Type Decision Tree
```
What kind of anomaly?
  ├── Point anomaly (single value far from norm)
  │   └── Z-score, IQR, Isolation Forest, Autoencoder
  ├── Contextual anomaly (normal value, wrong context)
  │   ├── Time context (e.g., high spending at 3 AM)
  │   │   └── Time-series decomposition + contextual Z-score
  │   └── Spatial context (e.g., high temp in antarctica)
  │       └── Conditional anomaly detection with context features
  └── Collective anomaly (unusual sequence)
      ├── Fixed-length window → LSTM Autoencoder
      └── Variable-length sequence → Sequence matching, DTW
```

### Threshold Selection Decision Tree
```
Do you have labeled validation data?
  ├── YES (partially labeled)
  │   └── Tune threshold to maximize F1 or precision@k
  ├── NO
  │   ├── Statistical approach
  │   │   ├── Z-score threshold 3 (99.7% CI) or 2.5 (99%)
  │   │   └── IQR multiplier 1.5 (moderate) or 3 (extreme)
  │   ├── Percentile approach
  │   │   ├── 99th percentile of anomaly scores
  │   │   └── 95th percentile for more sensitivity
  │   ├── Elbow method → knee in sorted anomaly score curve
  │   └── Domain-driven
  │       └── Acceptable false positive rate determines threshold
```

## Agent Protocol

### Trigger
User request includes: anomaly detection, outlier detection, Isolation Forest, LOF, autoencoder, one-class SVM, statistical methods, Z-score, IQR, real-time anomaly, time-series anomaly, novelty detection, fraud detection, outlier removal.

### Input Context
Before activating, verify:
- Data characteristics: dimensionality, number of samples, feature types (continuous, categorical, mixed).
- Expected anomaly rate (rare <1%, moderate 1-5%, frequent >5%).
- Anomaly type: point anomaly, contextual anomaly, collective anomaly.
- Whether training data contains anomalies (outlier detection) or is clean (novelty detection).
- Label availability: fully labeled, partially labeled, or completely unlabeled.
- Time dependence: independent (iid) or time-ordered (time series).

### Output Artifact
Anomaly detection framework with method selection, model config, evaluation, real-time pipeline.

### Response Format
```
## Anomaly Detection Framework
### Data Profile
Dimensions: {N} | Samples: {N} | Type: {tabular / time-series / high-dim}
Expected Anomaly Rate: {value}%
Anomaly Type: {point / contextual / collective / novelty}

### Method
Primary: {Z-score / IQR / LOF / Isolation Forest / Autoencoder / VAE / DeepSVDD}
Contamination: {auto / value}
Threshold: {N std / percentile / reconstruction error}
Interpretability: {high / medium / low}

### Evaluation
Labels Available: {true / false}
Method: {precision@k / AUC / F1 / expert review}
Target: {precision > value / recall > value}

### Pipeline
Frequency: {batch / streaming / real-time}
Window: {N seconds / N rows}
Alert: {threshold / anomaly score spike / ensemble vote}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Data characteristics documented: dimensions, anomaly rate, type, time dependence.
- [ ] Statistical baseline method applied (Z-score or IQR) as first pass.
- [ ] Primary detection method selected matching data type and interpretability needs.
- [ ] Model parameters configured with contamination rate and threshold.
- [ ] Evaluation approach defined for labeled or unlabeled protocol.
- [ ] Real-time pipeline designed if streaming is required.
- [ ] Alert fatigue mitigation strategy (severity levels, rate limiting).

### Max Response Length
300 lines of configuration and code.

## Workflow

### Step 1: Data Characterization
Low-dimensional tabular (<50 features): statistical methods (Z-score, IQR), LOF (local outlier detection), Isolation Forest (ensemble). High-dimensional tabular (>50 features): Isolation Forest (scales well), autoencoders (non-linear compression), HBOS (fast feature-independent). Time-series data: STL decomposition + detect anomalies in residuals, Twitter's AnomalyDetection approach, LSTM autoencoder for sequential patterns.

```python
def characterize_data(df):
    profile = {
        "n_samples": len(df),
        "n_features": df.shape[1],
        "n_numeric": len(df.select_dtypes(include=[np.number]).columns),
        "n_categorical": len(df.select_dtypes(include=["object", "category"]).columns),
        "n_missing": df.isnull().sum().sum(),
        "missing_pct": df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) * 100,
        "memory_mb": df.memory_usage(deep=True).sum() / 1024 / 1024,
    }
    return profile
```

### Step 2: Statistical Baselines
Z-score: assumes normal distribution. Flag if |Z| > 3 (99.7% confidence threshold). Modified Z-score uses median and MAD — robust to extreme outliers. Threshold 3.5 is standard. IQR: flag if value outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. Non-parametric. Grubbs' test: for univariate data, test one outlier at a time. Generalized ESD for sequential detection.

```python
from scipy import stats
import numpy as np

def z_score_outliers(data, threshold=3):
    z = np.abs(stats.zscore(data))
    return np.where(z > threshold)[0]

def modified_z_score_outliers(data, threshold=3.5):
    median = np.median(data)
    mad = np.median(np.abs(data - median))
    modified_z = 0.6745 * (data - median) / (mad + 1e-10)
    return np.where(np.abs(modified_z) > threshold)[0]

def iqr_outliers(data, multiplier=1.5):
    q1, q3 = np.percentile(data, [25, 75])
    iqr = q3 - q1
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    return np.where((data < lower) | (data > upper))[0]

def mahalanobis_outliers(X, threshold=None):
    """Multivariate outlier detection."""
    cov = np.cov(X, rowvar=False)
    try:
        inv_cov = np.linalg.inv(cov)
    except np.linalg.LinAlgError:
        inv_cov = np.linalg.pinv(cov)
    mean = np.mean(X, axis=0)
    d2 = np.array([np.dot(np.dot((x - mean), inv_cov), (x - mean)) for x in X])
    if threshold is None:
        threshold = stats.chi2.ppf(0.975, df=X.shape[1])
    return np.where(d2 > threshold)[0], d2
```

### Step 3: Method Selection and Implementation
Isolation Forest: best general-purpose default. Ensemble of random trees — anomalies require fewer partitions. Fast (O(n log n)), scalable to high dimensions. LOF: compares local density to neighbors. Best for datasets with varying densities. One-class SVM: maximal margin boundary, best for novelty detection. Autoencoder: learn compressed representation, anomalies have high reconstruction error.

```python
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM

def isolation_forest_detection(X, contamination=0.05, n_estimators=100):
    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    predictions = model.fit_predict(X)
    scores = model.score_samples(X)
    anomalies = np.where(predictions == -1)[0]
    return anomalies, scores, model

def lof_detection(X, contamination=0.05, n_neighbors=20):
    model = LocalOutlierFactor(
        n_neighbors=n_neighbors,
        contamination=contamination,
        novelty=False,
    )
    predictions = model.fit_predict(X)
    scores = model.negative_outlier_factor_
    anomalies = np.where(predictions == -1)[0]
    return anomalies, scores, model

def autoencoder_detection(X, encoding_dim=0.2, epochs=50, contamination=0.05):
    from sklearn.preprocessing import StandardScaler
    import tensorflow as tf

    input_dim = X.shape[1]
    encoding_dim = max(1, int(input_dim * encoding_dim))

    model = tf.keras.Sequential([
        tf.keras.layers.Dense(encoding_dim * 4, activation="relu"),
        tf.keras.layers.Dense(encoding_dim, activation="relu"),
        tf.keras.layers.Dense(encoding_dim * 4, activation="relu"),
        tf.keras.layers.Dense(input_dim, activation="linear"),
    ])
    model.compile(optimizer="adam", loss="mse")
    model.fit(X, X, epochs=epochs, batch_size=64, validation_split=0.1, verbose=0)

    reconstructions = model.predict(X, verbose=0)
    reconstruction_errors = np.mean((X - reconstructions) ** 2, axis=1)
    threshold = np.percentile(reconstruction_errors, (1 - contamination) * 100)
    anomalies = np.where(reconstruction_errors > threshold)[0]
    return anomalies, reconstruction_errors, model
```

### Step 4: Ensemble Anomaly Detection
Combine multiple detectors for robustness. Average scores, use majority voting, or require consensus (2 of 3 agree):
```python
def ensemble_anomaly_detection(X, contamination=0.05):
    results = {}

    # Multiple detectors
    _, scores_if, _ = isolation_forest_detection(X, contamination)
    _, scores_lof, _ = lof_detection(X, contamination)

    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler()
    scores_if_norm = scaler.fit_transform(scores_if.reshape(-1, 1)).ravel()
    scores_lof_norm = scaler.fit_transform(-scores_lof.reshape(-1, 1)).ravel()

    ensemble_score = (scores_if_norm + scores_lof_norm) / 2
    threshold = np.percentile(ensemble_score, (1 - contamination) * 100)
    anomalies = np.where(ensemble_score > threshold)[0]

    # Consensus: anomaly if at least 2 detectors agree
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor

    pred_if = IsolationForest(contamination=contamination, random_state=42).fit_predict(X)
    pred_lof = LocalOutlierFactor(contamination=contamination).fit_predict(X)

    consensus = np.sum([pred_if == -1, pred_lof == -1], axis=0)
    consensus_anomalies = np.where(consensus >= 2)[0]

    return anomalies, consensus_anomalies, ensemble_score
```

### Step 5: Parameter Configuration
Contamination rate (nu): expected proportion of anomalies. If unknown: set auto, set 0.01-0.05 for most real-world systems. Threshold selection: statistical (3 std for Z-score), percentile (99th or 99.5th), elbow method, domain expertise.

```python
def estimate_contamination(scores, method="elbow"):
    """Estimate contamination rate from anomaly scores."""
    sorted_scores = np.sort(scores)
    if method == "elbow":
        # Find knee point in sorted scores
        n = len(sorted_scores)
        x = np.arange(n)
        y = sorted_scores
        # Fit line from first to last point
        line = np.poly1d(np.polyfit([0, n - 1], [y[0], y[-1]], 1))
        deviation = y - line(x)
        elbow = np.argmax(np.abs(deviation))
        return 1 - (elbow / n)
    elif method == "percentile":
        return 0.05  # default 5th percentile
    return 0.05
```

### Step 6: Evaluation
Labeled data: precision, recall, F1, PR curve, ROC AUC. Partially labeled: evaluate on labeled subset, track precision@k. Unlabeled: precision at k (manual inspect top-k), overlap between methods.

```python
from sklearn.metrics import precision_recall_curve, auc, average_precision_score

def evaluate_anomaly_detection(y_true, anomaly_scores):
    """Evaluate anomaly detection with PR curve."""
    precision, recall, thresholds = precision_recall_curve(y_true, anomaly_scores)
    pr_auc = auc(recall, precision)
    avg_precision = average_precision_score(y_true, anomaly_scores)

    # F1 at each threshold
    f1_scores = 2 * precision * recall / (precision + recall + 1e-10)
    best_idx = np.argmax(f1_scores)
    best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5

    return {
        "pr_auc": pr_auc,
        "avg_precision": avg_precision,
        "best_f1": f1_scores[best_idx],
        "best_threshold": best_threshold,
    }

def precision_at_k(y_true, anomaly_scores, k):
    """Precision of top-k scoring items."""
    top_k_idx = np.argsort(anomaly_scores)[-k:]
    return np.mean(y_true[top_k_idx])
```

### Step 7: Real-Time Pipeline
Batch mode: run detection every N minutes. Streaming: sliding window with incremental update. Buffer: maintain sliding window of recent N data points.

```python
import pandas as pd
from collections import deque

class RealTimeAnomalyDetector:
    def __init__(self, window_size=1000, contamination=0.05):
        self.window_size = window_size
        self.contamination = contamination
        self.buffer = deque(maxlen=window_size)
        self.model = None

    def update(self, new_point):
        self.buffer.append(new_point)
        if len(self.buffer) == self.window_size:
            self._retrain()

    def _retrain(self):
        X = np.array(self.buffer)
        self.model = IsolationForest(contamination=self.contamination, random_state=42)
        self.model.fit(X)

    def predict(self, point):
        if self.model is None:
            return 0
        return self.model.predict([point])[0] == -1
```

## Anti-Patterns

- **Using Z-score on non-normal data**: Z-score assumes normality. Use IQR for non-parametric.
- **Setting contamination too high (>10%)**: Most real-world systems have <5% anomalies. Start low.
- **LOF on high-dimensional data**: Distance concentration degrades LOF in high dimensions. Use PCA first.
- **Training autoencoder on contaminated data**: Model learns to reconstruct anomalies too well. Use robust loss or novelty detection.
- **Not removing trend/seasonality**: Seasonal patterns flagged as anomalies in time series.
- **Alert fatigue**: Too-sensitive threshold. Aim for 1-5 actionable alerts per day, not dozens.
- **One-class SVM on large datasets**: O(n²) complexity makes it impractical above 10K samples.
- **Only evaluating on labeled anomalies**: Also requires false positive rate monitoring.

## Production Considerations

### Monitoring
- Track anomaly detection rate over time — sudden spike may indicate pipeline issue or real event.
- Monitor false positive rate (>5% FPR → threshold too aggressive).
- Track anomaly score distribution drift.
- Alert fatigue tracking: daily alert volume per severity level.
- Log all detected anomalies with feature values, anomaly score, and model version.

### Deployment Checklist
- Define alert severity levels (critical, warning, info) with SLAs.
- Set up alert routing (PagerDuty for critical, Slack for warning).
- Implement alert deduplication (same type within T minutes).
- Establish feedback loop: confirmed anomalies labeled for supervised training.
- Version training data and model parameters.
- Periodic retraining with automatic rollback.
- Create runbooks per severity level.

### Scaling
- Statistical methods: O(n) per feature, can scale to millions of rows.
- Isolation Forest: O(n log n), well-suited for >1M rows.
- LOF: O(n²), use sampling for large datasets.
- Deep learning: GPU batch inference, monitor throughput = batch_size / inference_time.

## Rules
- Statistical methods (Z-score, IQR) are first-pass baseline.
- Isolation Forest is best default for tabular anomaly detection.
- Autoencoders require >1000 normal samples.
- Never set contamination >10% without strong prior evidence.
- Remove trend/seasonality before time-series anomaly detection.
- Evaluate with precision@k when labels unavailable.
- Ensemble voting across methods reduces FPR by 30-50%.
- Real-time anomaly detection target <100ms inference.
- Alert fatigue is #1 failure mode: tune for 1-5 actionable alerts/day.
- Document expected anomaly rate and threshold methodology.

## References
  - references/anomaly-detection-advanced.md — Anomaly Detection Advanced Topics
  - references/anomaly-detection-fundamentals.md — Anomaly Detection Fundamentals
  - references/anomaly-evaluation.md — Anomaly Detection Evaluation
  - references/classical-anomaly.md — Classical Anomaly Detection
  - references/deep-learning-anomaly.md — Deep Learning Anomaly Detection
  - references/ml-based-detection.md — ML-Based Anomaly Detection
  - references/online-anomaly.md — Online Anomaly Detection
  - references/statistical-methods.md — Statistical Anomaly Detection
## Handoff
Hand off to devops-observability for alerting and monitoring infrastructure. For time-series forecasting to model normal behavior first, hand off to ml-time-series.
