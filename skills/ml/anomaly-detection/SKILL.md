---
name: ml-anomaly-detection
description: >
  Use this skill when detecting anomalies or outliers in data, building unsupervised anomaly detection systems, applying statistical methods (Z-score/IQR), proximity-based (LOF), ensemble (Isolation Forest), deep learning (autoencoder/VAE), or time-series anomaly detection.
  This skill enforces: method selection by data characteristics (tabular/time-series/high-dim), statistical baseline (Z-score/IQR), model configuration (contamination rate, threshold), evaluation with precision/recall at k, real-time pipeline design.
  Do NOT use for: supervised fraud detection with labeled data (use classification skill), data quality checks (use data-validation skill), root cause analysis of detected anomalies, or forecasting (use ml-time-series).
version: "1.0.0"
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

## Agent Protocol

### Trigger
User request includes: anomaly detection, outlier detection, Isolation Forest, LOF, autoencoder, one-class SVM, statistical methods, Z-score, IQR, real-time anomaly, time-series anomaly, novelty detection, fraud detection, outlier removal.

### Input Context
Before activating, verify:
- Data characteristics: dimensionality, number of samples, feature types (continuous, categorical, mixed).
- Expected anomaly rate (rare <1%, moderate 1-5%, frequent >5%).
- Anomaly type: point anomaly (single unusual point), contextual anomaly (unusual given context like time), collective anomaly (unusual sequence or group).
- Whether training data contains anomalies (outlier detection) or is clean (novelty detection).
- Label availability: fully labeled, partially labeled, or completely unlabeled.
- Time dependence: are observations independent (iid) or time-ordered (time series).

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data characteristics documented: dimensions, anomaly rate, type, time dependence.
- [ ] Statistical baseline method applied (Z-score or IQR) as first pass.
- [ ] Primary detection method selected matching data type and interpretability needs.
- [ ] Model parameters configured with contamination rate and threshold.
- [ ] Evaluation approach defined for labeled or unlabeled protocol.
- [ ] Real-time pipeline designed if streaming is required.
- [ ] Alert fatigue mitigation strategy (severity levels, rate limiting).

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Data Characterization
Low-dimensional tabular (<50 features): statistical methods (Z-score, IQR), LOF (local outlier detection), Isolation Forest (ensemble). High-dimensional tabular (>50 features): Isolation Forest (scales well), autoencoders (non-linear compression), HBOS (fast feature-independent). Time-series data: STL decomposition + detect anomalies in residuals, Twitter's AnomalyDetection approach, LSTM autoencoder for sequential patterns. Anomaly types: point outlier (single value outside expected range), contextual outlier (e.g., spending $500 on dinner is normal at dinner time but anomalous at 3 AM), collective outlier (e.g., sequence of keystrokes that doesn't match user's typing pattern). Outlier detection vs novelty detection: outlier detection assumes training data contains anomalies — model learns to separate anomalies from normal. Novelty detection assumes training data is clean — model learns boundary of normal region. Use novelty detection when you can guarantee clean training data (e.g., from controlled environment). Mixed feature types: encode categorical features with target encoding or entity embeddings. Scale numerical features before distance-based methods.

### Step 2: Statistical Baselines
Z-score: assumes normal distribution. Flag if |Z| > 3 (99.7% confidence threshold). Modified Z-score uses median and MAD (Median Absolute Deviation) instead of mean and std — robust to extreme outliers. Threshold 3.5 is standard. IQR: flag if value outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. Non-parametric, works with any distribution, no normality assumption. Multiplier 1.5 flags ~0.7% of normal data. Multiplier 3.0 for extreme outliers (<0.01%). Grubbs' test: for univariate data, test one outlier at a time. Better than Z-score for small samples because critical value adjusts for sample size. Use Generalized ESD for sequential detection of multiple outliers. Multivariate extension: Mahalanobis distance detects multivariate outliers. D^2 follows chi-squared distribution with p degrees of freedom. Flag if D^2 > chi2.ppf(0.975, p). Statistical methods are fast, interpretable, require no training — always use them as first pass before complex models.

### Step 3: Method Selection
Isolation Forest: best general-purpose default. Ensemble of random trees — anomalies require fewer partitions. Fast (O(n log n)), scalable to high dimensions (>100), minimal tuning. Works well with 10-30% of features being informative. LOF (Local Outlier Factor): compares local density to neighbors. Best for datasets with varying densities (clusters of different tightness). Struggles with high dimensions (curse of dimensionality — neighbors become equidistant). n_neighbors: 10-20 for most datasets. One-class SVM: finds maximal margin boundary around normal data. Sensitive to kernel and nu parameter. Best for novelty detection (clean training set). Kernel RBF for non-linear boundaries. Nu ~ 0.01-0.1 (upper bound on training error fraction). Slow for n > 10000. Autoencoder: learns compressed representation of normal data. Anomalies have high reconstruction error. Best for high-dimensional data with non-linear relationships. Requires >1000 normal samples. Encoding dimension 5-25% of input. VAE: probabilistic version of autoencoder. Anomaly score = reconstruction error + KL divergence. More robust separation than deterministic autoencoder. DeepSVDD: learn hypersphere around normal representations. Pre-train with autoencoder to avoid collapse. LSTM-AD: for time series with complex temporal dependencies. Predict or reconstruct sequences.

### Step 4: Parameter Configuration
Contamination rate (nu): expected proportion of anomalies. If unknown: set auto (estimates from data using score distribution methods), set 0.01-0.05 for most real-world systems, or use validation set if partially labeled. Threshold selection: statistical (3 std for Z-score, 1.5*IQR for IQR), percentile (99th or 99.5th percentile of anomaly scores on normal data), elbow method (find elbow in sorted anomaly score curve), domain expertise (acceptable false positive rate determines threshold). For autoencoder: compute reconstruction error on validation set, set threshold at 95th-99th percentile. For ensemble methods: combine scores from multiple detectors using average, max, or weighted combination. Standardize scores to [0,1] before combining. Isolation Forest parameters: n_estimators=100 (more is better but diminishing returns), max_samples=min(256, n_samples) for speed or auto for full data, contamination=0.05 or auto.

### Integration with Monitoring and Alerting
Connect anomaly detector to monitoring system (Prometheus, Datadog, Grafana) for real-time visibility.
Expose anomaly score as a metric for dashboard visualization and alert routing.
Define alert severity levels based on anomaly score magnitude and persistence duration.
Set up automated incident response for critical anomalies via PagerDuty or Slack.
Log all detected anomalies with feature values and model explanation for root cause analysis.
Implement drift monitoring on the anomaly score distribution — score inflation indicates model degradation.
Periodically retrain anomaly detection model on recent normal data to adapt to concept drift.
Maintain a feedback loop: confirmed anomalies are added to labeled dataset for supervised retraining.

### Step 5: Evaluation
Labeled data (ground truth available): precision, recall, F1, precision-recall curve, ROC AUC (if balanced), confusion matrix. Classification metrics directly apply. Labeled data is ideal but often unavailable for anomaly detection. Partially labeled: evaluate on labeled subset. Compute precision/recall on known anomalies. Track precision@k on full dataset (assume unlabeled points are normal). Unlabeled data (most common): precision at k (manually inspect top-k scoring anomalies, count true positives among them). Track overlap between methods (concordance of top-k across detectors). Use silhouette score for cluster-based methods. Business validation: domain expert reviews top anomalies weekly. Track detection rate (fraction of alerts confirmed as anomalies). Evaluate stability: run detection on different time periods, check if same types of anomalies appear. False positive rate monitoring: if >5% alerts are false, tighten threshold or improve model. Expected value: cost of false positive * FP rate < cost of missed anomaly * anomaly rate.

### Step 6: Real-Time Pipeline
Batch mode: run detection every N minutes/hours on recent data window. Simpler, less resource-intensive. Best for monitoring applications where minutes latency is acceptable. Streaming: sliding window with incremental model update. Process each data point as it arrives. Statistical methods (Z-score, IQR) can be updated incrementally without recomputation. Isolation Forest and LOF require periodic retraining. Buffer: maintain sliding window of recent N data points. Update model when window has enough new data. Alerting: single point above threshold (high sensitivity, many false positives), N consecutive points above threshold (reduces false positives, use N=3-5), aggregated anomaly score spike (mean score over window exceeds threshold), ensemble consensus (at least 2 of 3 detectors agree). Alert fatigue mitigation: max N alerts per hour per service, severity levels (critical, warning, info) with different thresholds, deduplication (same type of anomaly within T minutes), escalation path: alert -> investigate -> ticket -> incident. Model retraining: retrain on schedule (daily/weekly) or when data distribution changes (detected via drift monitoring).

### Common Pitfalls
Using Z-score on non-normal data without transformation — Z-score assumes normality.
Setting contamination too high (>10%) without evidence — most real-world systems have <5% anomalies.
Applying LOF on high-dimensional data without dimensionality reduction — distance concentration degrades LOF.
Training autoencoder on contaminated data without robust loss — model learns to reconstruct anomalies too.
Not removing trend and seasonality before time-series anomaly detection — seasonal patterns flagged as anomalies.
Alert fatigue from too-sensitive threshold — tune for 1-5 actionable alerts per day.
Using one-class SVM on large datasets — O(n^2) complexity makes it impractical above 10K samples.
Evaluating only on labeled anomalies without false positive rate monitoring — missing the operational impact.

## Rules
- Statistical methods (Z-score, IQR) are the baseline — always run them first as screening.
- Isolation Forest is the best default for tabular anomaly detection — fast, scalable, minimal tuning.
- Autoencoders require sufficient normal data to learn reconstruction (minimum 1000 normal samples).
- Never set contamination rate higher than 10% without strong prior evidence.
- For time-series anomaly, always remove trend and seasonality before applying detection.
- Evaluate with precision at k (inspect top-k) when labels are not available — manual review scales to ~100 per batch.
- Contamination in training data biases unsupervised methods — consider novelty detection if training is clean.
- Ensemble voting across multiple detection methods reduces false positive rate by 30-50%.
- Real-time anomaly detection requires bounded inference latency (target < 100ms, alert within 1 minute).
- Document the expected anomaly rate and how the threshold was chosen — decisions degrade without documentation.
- Monitor anomaly score distribution drift — scores change as data evolves, thresholds need periodic recalibration.
- Alert fatigue is the #1 failure mode: tune for 1-5 actionable alerts per day, not dozens of noisy ones.

### Production Monitoring
Track anomaly detection rate over time — sudden spike may indicate data pipeline issue or real event.
Monitor false positive rate using confirmed alerts — >5% false positive rate indicates threshold too aggressive.
Track anomaly score distribution statistics (mean, std, percentiles) for drift detection.
Monitor model retraining frequency and performance improvement per retraining cycle.
Log all detected anomalies with feature values, anomaly score, and model version for root cause analysis.
Alert fatigue tracking: daily alert volume per severity level, time-to-acknowledge, time-to-resolve.
Set up dashboards comparing detection rate, FPR, and alert volume across model versions.

### Troubleshooting Guide
Too many false positives → increase threshold, reduce contamination, use ensemble consensus requiring multiple detectors.
Missing known anomalies → decrease threshold, switch to more sensitive method (autoencoder > isolation forest > LOF).
Anomaly scores drifting over time → data distribution has shifted; retrain model on recent normal data.
Autoencoder reconstructing anomalies too well → model trained on contaminated data; use novelty detection with clean training.
Isolation Forest isolating everything → contamination set too high; reduce to expected anomaly rate (0.01-0.05).
DeepSVDD collapsing to trivial solution → pretrain with autoencoder; increase encoding dimension; adjust center initialization.
Real-time detection too slow → switch to lighter model (HBOS, statistical methods), reduce feature dimensions.
Model not adapting to new normal patterns → periodic retraining insufficient; implement online learning for statistical methods.

### Deployment Checklist
Define alert severity levels (critical, warning, info) with corresponding thresholds and response SLAs.
Set up alert routing to appropriate channels (PagerDuty for critical, Slack for warning, dashboard for info).
Implement alert deduplication to prevent alert storms from correlated anomalies.
Establish feedback loop: confirmed anomalies labeled and stored for future supervised training.
Document the anomaly threshold selection methodology and expected anomaly rate.
Version the training data and model parameters for reproducibility of detection results.
Set up periodic retraining on schedule (daily/weekly) with automatic rollback on performance degradation.
Create runbooks for each alert severity level defining investigation and resolution steps.

## References
- references/classical-anomaly.md — Statistical Z-score/IQR/Grubbs, LOF, Isolation Forest, HBOS, one-class SVM, evaluation
- references/deep-learning-anomaly.md — Autoencoder, VAE, DeepSVDD, LSTM-AD, time-series anomaly, Twitter AD, Prophet, real-time deployment

### Edge Cases and Special Domains
Extreme rare anomalies (<0.1%): use one-class learning (DeepSVDD, OCSVM), self-supervised learning (rotation prediction, contrastive).
Adversarial anomalies (trying to evade detection): use robust training, adversarial training, ensemble diversification.
Multi-modal data (text + image + numeric): use joint embedding models, separate detectors per modality + fusion layer.
High-frequency streaming (millions per second): use online methods (EWMA, CUSUM), sketch-based algorithms, lightweight HBOS.
Semi-supervised (few labeled anomalies): use PU learning (Positive-Unlabeled), label propagation, anomaly-informed contrastive learning.
Contextual anomalies (e.g., purchase amount normal but unusual for this user): use residual from prediction model, autoencoder of conditional normal behavior.
Group/collective anomalies (unusual set of transactions rather than individual): use scan statistics (Kulldorff), frequent subgraph mining, community detection on graph representations.

### Framework Integration
PyOD: 40+ anomaly detection algorithms (Isolation Forest, LOF, HBOS, AutoEncoder, VAE, DeepSVDD, SO_GAAL).
Scikit-learn: IsolationForest, LocalOutlierFactor, OneClassSVM, EllipticEnvelope with consistent API.
PyTorch: custom autoencoders, VAEs, DeepSVDD for deep learning anomaly detection.
TensorFlow: Keras autoencoders, KNN for reconstruction-based anomaly detection.
ADTK (Anomaly Detection Toolkit): time series anomaly detection with seasonal decomposition and rule-based methods.
Merlion: auto-encoders, isolation forest, statistical methods, explainability, and evaluation in unified API.
TODS (Time-series Outlier Detection): automated machine learning for time series anomaly detection.

### Advanced Anomaly Detection Tips
Use feature bagging: train multiple detectors on random feature subsets and aggregate for robust scoring.
For categorical features with many levels, use frequency encoding or target encoding before detection.
Implement online statistical methods (EWMA, CUSUM) for real-time univariate anomaly detection.
Use spectral methods (PCA reconstruction error, robust PCA) for high-dimensional correlated data.
For graph anomaly detection, use Graph Neural Networks on relational/network data.
Implement seasonal-trend decomposition with LOESS (STL) before detecting anomalies in residuals.
Use extreme value theory (EVT) for setting statistically principled thresholds on anomaly scores.
For interpretable autoencoders, use feature-wise reconstruction error to identify which features are anomalous.

## Handoff
Hand off to devops-observability for alerting and monitoring infrastructure. For time-series forecasting to model normal behavior first, hand off to ml-time-series.
