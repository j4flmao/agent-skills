# ML Deployment & Monitoring

## Deployment Strategies

### Canary Deployment
Gradually shift traffic from old model version to new version.

```yaml
# Canary configuration
canary:
  initial_traffic: 5%
  increment: 10%
  observation_period: 15m
  metrics:
    - accuracy
    - latency_p95
    - error_rate
  auto_rollback:
    condition: "accuracy_drop > 2% OR error_rate > 1%"
    action: "route all traffic back to previous version"
```

Implementation: service mesh (Istio) traffic splitting, or load balancer weight adjustment.

### Blue-Green Deployment
Maintain two full environments. Instant cutover. Fast rollback.

```yaml
blue-green:
  blue: existing version (live)
  green: new version (staging)
  validation:
    - smoke_tests
    - shadow_traffic_compare
  cutover: dns_swap_or_lb_update
  rollback: revert_dns_or_lb
```

Best for: stateless model serving, batch inference endpoints.

## A/B Testing Infrastructure

### Traffic Routing
Route traffic by user_id hash: even → control (A), odd → treatment (B).

```python
def get_treatment(user_id: str) -> str:
    hash_val = hash(user_id) % 100
    if hash_val < 50:
        return "control"  # Model A
    return "treatment"    # Model B
```

### Metrics Collection
Log prediction, treatment arm, outcome per event. Compare:
- CTR (click-through rate)
- Conversion rate
- Revenue per user
- Latency and error rate

### Statistical Significance
Use chi-squared or t-test. Minimum sample size = 1000 per arm. Run for at least one full business cycle. Declare winner at p < 0.05.

## Model Monitoring

### Data Drift Detection
Monitor feature distributions between training and production.

```python
import scipy.stats as stats

def detect_drift(train_dist, prod_dist, metric="ks"):
    if metric == "ks":
        stat, p_value = stats.ks_2samp(train_dist, prod_dist)
        return {"drifted": p_value < 0.05, "statistic": stat, "p_value": p_value}
    elif metric == "psi":
        psi = sum((p_i - q_i) * math.log(p_i / q_i) for p_i, q_i in zip(train_dist, prod_dist))
        return {"drifted": psi > 0.2, "psi": psi}
```

Alert thresholds:
- PSI > 0.2: warning
- PSI > 0.5: critical drift

### Concept Drift Detection
Monitor prediction distribution shift and accuracy decay. Track actuals vs predictions over time.

```python
def check_concept_drift(y_true, y_pred, window=1000):
    recent_accuracy = accuracy_score(y_true[-window:], y_pred[-window:])
    baseline_accuracy = accuracy_score(y_true[:window], y_pred[:window])
    drift = baseline_accuracy - recent_accuracy
    return drift > 0.05  # Alert if accuracy drops > 5%
```

### Performance Decay
Schedule periodic evaluation against labeled data. Monitor precision, recall, F1, AUC over time. Retrain trigger: performance drops below threshold.

## Rollback Strategy

### Automatic Rollback Triggers
- Drift alert (data or concept)
- Error rate > 1%
- Latency P95 > threshold
- Accuracy drop > 2% (when ground truth available)
- Resource exhaustion (memory, GPU)

```yaml
rollback:
  automatic:
    - metric: error_rate > 1%
      action: "route 100% traffic to previous model version"
      cool_down: 10m
    - metric: latency_p95 > 500ms
      action: "route 50% traffic to previous version"
      cool_down: 5m
  manual:
    - trigger: "any drift alert"
    - action: "stakeholder review before re-deploy"
```

### Rollback Procedure
1. Identify failing metric and model version
2. Route traffic to previous production version (registry archive)
3. Verify rollback with health checks
4. Investigate root cause
5. Update CI/CD pipeline if needed

## Shadow Deployment

Route copy of traffic to new model while keeping old model serving. Compare outputs without user impact. Collect performance metrics. Promote when shadow model consistently outperforms.

```yaml
shadow:
  traffic_copy: 100%
  comparison_metrics:
    - prediction_difference
    - confidence_scores
    - latency
  promotion:
    condition: "shadow model outperforms for 24h"
```
