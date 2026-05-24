# Online Anomaly Detection

## Streaming Anomaly Detection

| Method | Type | Memory | Update | Use Case |
|--------|------|--------|--------|----------|
| Streaming Z-score | Univariate | O(1) | Incremental mean/std | Sensor metrics |
| ADWIN | Univariate | O(log n) | Adaptive window | Concept drift detection |
| Half-Space Trees | Multivariate | O(tree) | Incremental | High-dimensional streams |
| Online Isolation Forest | Multivariate | O(trees) | Incremental | General purpose |
| RS-Stream | Multivariate | O(window) | Sliding window | Time-series outlier |
| HTM (Hierarchical Temp Memory) | Time-series | O(network) | Continuous | Pattern prediction |

```python
# Streaming Z-score anomaly detection
class StreamingZScore:
    def __init__(self, window_size=100, threshold=3.0):
        self.window = deque(maxlen=window_size)
        self.mean = 0.0
        self.M2 = 0.0  # Sum of squared differences
        self.count = 0
        self.threshold = threshold

    def update(self, value):
        self.window.append(value)
        self.count += 1
        delta = value - self.mean
        self.mean += delta / self.count
        delta2 = value - self.mean
        self.M2 += delta * delta2
        if self.count < 2:
            return False
        variance = self.M2 / (self.count - 1)
        std = sqrt(variance)
        z_score = abs(value - self.mean) / std if std > 0 else 0
        return z_score > self.threshold
```

## Real-Time Alerting

```yaml
# Alert fatigue prevention
anomaly_detection:
  threshold: dynamic  # Rolling quantile (99.5th percentile)
  cooldown: 300s     # Min time between alerts for same metric
  escalation:
    - 1st alert: Slack #monitoring
    - 3rd alert in 1h: PagerDuty low urgency
    - 5th alert in 1h: PagerDuty high urgency
  dedup:
    window: 15m
    group_by: [metric_name, host]
```

## Evaluation Metrics for Anomaly Detection

| Metric | Formula | Notes |
|--------|---------|-------|
| Precision@k | TP@k / k | How many of top k alerts are real |
| Recall@k | TP@k / total_positives | How many real anomalies found in top k |
| Fβ | (1+β²)·P·R / (β²·P+R) | Weight recall higher (β>1) for rare events |
| Hit Rate | TP / (TP+FN) | Per-window or per-sequence |
| Alert Fatigue | FP / total_alerts | Lower is better (< 0.3 target) |
| Detection Delay | alert_time - event_start | Mean and p95 |

## Production Deployment

| Challenge | Solution |
|-----------|----------|
| Concept drift | ADWIN or DDM for drift detection, model refresh |
| Seasonal patterns | Remove trend/seasonality before detection |
| Missing values | KNF (K-Nearest Fill) or interpolation before scoring |
| High cardinality | Hierarchical detection per entity, aggregate at group level |
| Cold start | Train on synthetic or historical, update as data arrives |
| Scalability | Sketch-based methods (Count-Min Sketch, HyperLogLog) |
