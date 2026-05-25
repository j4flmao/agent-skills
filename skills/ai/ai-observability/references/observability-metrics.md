# Observability Metrics for AI Systems

## Latency Tracking

| Metric | Definition | Target | Alert Threshold |
|--------|------------|--------|-----------------|
| TTFT | Time to first token | < 500ms | > 2s |
| E2E latency | Total request to response | < 3s | > 10s |
| Per-step latency | Each chain/agent step | < 1s | > 5s |
| Queue time | Time in request queue | < 100ms | > 1s |
| Token generation rate | Tokens/second | > 30 t/s | < 10 t/s |

### Latency Breakdown
```python
import time
from contextlib import contextmanager

class LatencyTracker:
    def __init__(self):
        self.metrics = {}

    @contextmanager
    def track(self, step_name):
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed = time.perf_counter() - start
            self.record(step_name, elapsed)

    def record(self, name, duration):
        if name not in self.metrics:
            self.metrics[name] = {"count": 0, "total": 0, "max": 0}
        self.metrics[name]["count"] += 1
        self.metrics[name]["total"] += duration
        self.metrics[name]["max"] = max(self.metrics[name]["max"], duration)
```

## Quality Metrics

| Metric | Measurement | Good | Poor |
|--------|-------------|------|------|
| Response relevance | User rating (1-5) | > 4.0 | < 3.0 |
| Factual accuracy | Automated eval | > 95% | < 85% |
| Hallucination rate | Grounding check | < 3% | > 10% |
| Task completion rate | Success/total | > 90% | < 70% |
| User satisfaction | NPS survey | > 50 | < 20 |

## Drift Monitoring

```python
class DriftDetector:
    def __init__(self, baseline_distribution, threshold=0.1):
        self.baseline = baseline_distribution
        self.threshold = threshold
        self.window = []

    def add_sample(self, embedding):
        self.window.append(embedding)
        if len(self.window) >= 100:
            drift_score = self.compute_drift()
            if drift_score > self.threshold:
                self.alert(drift_score)
            self.window = []

    def compute_drift(self):
        current_mean = np.mean(self.window, axis=0)
        baseline_mean = np.mean(self.baseline, axis=0)
        return np.linalg.norm(current_mean - baseline_mean)
```

## Dashboard Layout

| Panel | Metrics | Refresh |
|-------|---------|---------|
| Request volume | Requests/min, active users | 1m |
| Latency heatmap | P50/P95/P99 by model and step | 1m |
| Cost breakdown | $/day by model, user, feature | 1h |
| Quality score | Avg rating, satisfaction trend | 1h |
| Drift alerts | Drift score by model, feature | 5m |
| Error rates | Error % by type, model | 1m |

## Alerting Rules

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| High latency | P95 > 2s for 5 min | Critical | PagerDuty |
| Error spike | Error rate > 5% for 2 min | Critical | PagerDuty |
| Budget depletion | > 50% daily budget used by noon | Warning | Slack |
| Drift detected | Drift score > 0.1 | Warning | Slack + Ticket |
| Low quality | Avg rating < 3.0 over 1h | Warning | Slack |
| Cache miss spike | Hit rate < 20% for 5 min | Info | Dashboard |

## Custom Metrics Collection
```python
class MetricsCollector:
    def __init__(self):
        self.metrics = defaultdict(lambda: {"count": 0, "total_latency": 0, "errors": 0})

    def record(self, model, latency_ms, tokens_in, tokens_out, success):
        m = self.metrics[model]
        m["count"] += 1
        m["total_latency"] += latency_ms
        m["total_tokens_in"] = m.get("total_tokens_in", 0) + tokens_in
        m["total_tokens_out"] = m.get("total_tokens_out", 0) + tokens_out
        if not success:
            m["errors"] += 1

    def report(self):
        return {
            model: {
                "avg_latency": m["total_latency"] / m["count"],
                "error_rate": m["errors"] / m["count"] * 100,
                "total_tokens": m.get("total_tokens_in", 0) + m.get("total_tokens_out", 0),
            }
            for model, m in self.metrics.items()
        }
```
