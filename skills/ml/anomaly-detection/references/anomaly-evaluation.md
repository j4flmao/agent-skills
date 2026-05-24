# Anomaly Detection Evaluation

## Threshold Selection

| Method | How It Works | When |
|--------|-------------|------|
| Fixed percentile | Top k% of scores are anomalies | Known expected rate |
| Elbow method | Find knee in score distribution | No labeled data |
| EVT (Extreme Value Theory) | Model tail distribution with Peaks-over-Threshold | Fat-tailed data |
| Label-driven | Maximize Fβ on validation set | Labeled anomalies |
| Statistical process control | CUSUM, Shewhart control charts | Manufacturing, monitoring |

```python
# Elbow-based threshold using score distribution
def find_elbow_threshold(scores):
    sorted_scores = sorted(scores)
    n = len(sorted_scores)
    # Line from first to last point
    x1, y1 = 0, min(scores)
    x2, y2 = n, max(scores)
    
    # Find point with max perpendicular distance
    max_dist = -1
    elbow_idx = 0
    for i in range(n):
        dist = abs((x2 - x1) * (y1 - sorted_scores[i]) - 
                   (x1 - i) * (y2 - y1)) / sqrt((x2 - x1)**2 + (y2 - y1)**2)
        if dist > max_dist:
            max_dist = dist
            elbow_idx = i
    return sorted_scores[elbow_idx]
```

## Evaluation Scenarios

| Scenario | Best Metric | Pitfall |
|----------|------------|---------|
| Known anomalies, imbalanced (1%) | Precision/Recall@k, F2 | Accuracy is misleading (99% non-anomaly) |
| Unknown distribution | AUC-ROC, Average Precision | May not reflect operational cost |
| Time-series streaming | Lag-adjusted precision, delay cost | Must account for detection delay |
| Cost-sensitive | Cost@k (TP cost - FP cost - FN cost) | Requires cost matrix |
| Group/segment anomalies | Hit rate per group, macro metrics | Can mask small group failures |

## Statistical Validation

```python
from scipy import stats

def evaluate_detection_method(anomaly_scores, labels):
    # Standard metrics
    ap = average_precision_score(labels, anomaly_scores)
    roc_auc = roc_auc_score(labels, anomaly_scores)
    
    # Threshold-dependent
    for thresh in [0.95, 0.99, 0.995]:
        pred = anomaly_scores > np.quantile(anomaly_scores, thresh)
        precision = precision_score(labels, pred)
        recall = recall_score(labels, pred)
    
    # Statistical test: are anomalies truly extreme?
    normal_scores = anomaly_scores[labels == 0]
    anomaly_scores_val = anomaly_scores[labels == 1]
    ks_stat, p_value = stats.ks_2samp(normal_scores, anomaly_scores_val)
    return {'ap': ap, 'roc_auc': roc_auc, 'ks_pvalue': p_value}
```

## Alert Fatigue

| Fatigue Level | FP/Hour | Actions |
|---------------|---------|---------|
| Optimal | < 1 | Maintain |
| Moderate | 1-5 | Raise threshold, tune cooldown |
| High | 5-20 | Investigate model, tune drastically |
| Critical | > 20 | Disable alert, fix root cause |

## Production Monitoring

```yaml
anomaly_model_health:
  precision_24h: { warn: < 0.3, crit: < 0.1 }
  recall_24h: { warn: < 0.5, crit: < 0.2 }
  alert_rate_1h: { warn: "> 10", crit: "> 50" }
  score_distribution_shift: { warn: "KS > 0.1", crit: "KS > 0.3" }
  detection_delay_p95: { warn: "> 5min", crit: "> 15min" }
```
