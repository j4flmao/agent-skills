# Canary Analysis

Canary analysis monitors metrics during progressive delivery to decide whether to promote or rollback a release.

## Key Metrics

### Success Rate

Percentage of HTTP requests that return successful (non-5xx) responses:

```
success_rate = 1 - (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])))
```

Threshold: >= 99% (or 99.9% for critical services)

### Latency

Request duration percentiles comparing canary vs baseline:

```
latency_p99 = histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

Threshold: canary p99 <= baseline p99 * 1.2 (20% degradation allowed)

### Error Rate

Ratio of error responses to total requests:

```
error_rate = sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))
```

Threshold: < 0.01 (1% error rate)

## Analysis Templates

### Argo Rollouts AnalysisTemplate

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: comprehensive
spec:
  metrics:
    - name: success-rate
      initialDelay: 30s
      successCondition: result >= 0.99
      failureCondition: result < 0.95
      failureLimit: 3
      count: 10
      interval: 60s
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            1 - (
              sum(rate(http_requests_total{app="myapp",namespace="prod",status=~"5.*"}[5m]))
              /
              sum(rate(http_requests_total{app="myapp",namespace="prod"}[5m]))
            )
    - name: latency-p99
      successCondition: result < 200
      failureLimit: 5
      count: 10
      interval: 60s
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket{app="myapp",namespace="prod"}[5m])) by (le)
            )
    - name: cpu-usage
      successCondition: result < 0.8
      failureLimit: 3
      count: 5
      interval: 60s
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            avg(rate(container_cpu_usage_seconds_total{pod=~"myapp-canary-.*",namespace="prod"}[2m]))
    - name: memory-leak
      successCondition: result < 500
      failureLimit: 3
      count: 10
      interval: 30s
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            avg(container_memory_working_set_bytes{pod=~"myapp-canary-.*",namespace="prod"}) / 1e6
```

## Threshold Configuration

### Argo Rollouts

```yaml
spec:
  analysis:
    - name: success-rate
      successCondition: result >= 0.99
      failureCondition: result < 0.95
      failureLimit: 3
      count: 10
      interval: 60s
      dryRun:
        - metricName: cpu-usage
          dryRun: true  # log only, don't fail
```

### Flagger

```yaml
analysis:
  interval: 30s
  threshold: 10  # max failed checks before rollback
  maxWeight: 50
  stepWeight: 10
  metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
```

## Baseline vs Canary Comparison

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: baseline-comparison
spec:
  metrics:
    - name: latency-baseline-comparison
      successCondition: result < 1.2  # canary within 20% of baseline
      count: 10
      interval: 60s
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            (
              histogram_quantile(0.99,
                sum(rate(http_request_duration_seconds_bucket{revision="canary"}[5m])) by (le)
              )
              /
              histogram_quantile(0.99,
                sum(rate(http_request_duration_seconds_bucket{revision="baseline"}[5m])) by (le)
              )
            )
```

## Manual Judgment

### Argo Rollouts

```bash
# Promote
kubectl argo rollouts promote myapp

# Skip current step
kubectl argo rollouts promote --skip-step myapp

# Abort/rollback
kubectl argo rollouts abort myapp
```

### Flagger

Set `confirm-promotion` webhook for manual approval:

```yaml
analysis:
  webhooks:
    - name: gate
      type: confirm-promotion
      url: http://gate-service.approval/confirm
```

## Rollback Triggers

| Condition | Action | Automation |
|-----------|--------|------------|
| Success rate < 99% | Immediate rollback | Automatic |
| Latency p99 > 500ms | Rollback after N failures | Automatic (configurable) |
| Error rate > 1% | Immediate rollback | Automatic |
| Manual abort | Immediate rollback | Manual |
| Analysis timeout | Rollback | Automatic |
| Memory leak detected | Rollback after threshold | Automatic |

## Custom Metric Providers

```yaml
metrics:
  - name: datadog-error-rate
    provider:
      datadog:
        address: https://api.datadoghq.com
        apiKeyRef:
          key: api-key
          name: datadog-secret
        query: |
          sum:http.requests.errors{service:myapp,env:prod}.as_rate() /
          sum:http.requests{service:myapp,env:prod}.as_rate() * 100
  - name: newrelic-apdex
    provider:
      newrelic:
        address: https://api.newrelic.com
        profile: prod
        query: |
          SELECT percentile(duration, 99) FROM Transaction WHERE appName = 'myapp'
  - name: cloudwatch-errors
    provider:
      cloudwatch:
        region: us-east-1
        metricName: Errors
        namespace: MyApp
        dimensions:
          - name: Environment
            value: Production
```

## Dry Run Mode

Test analysis without affecting the rollout:

```yaml
metrics:
  - name: success-rate
    successCondition: result >= 0.99
    failureLimit: 3
    count: 5
    interval: 30s
    dryRun: true  # observe only
```

Effective canary analysis is the cornerstone of safe progressive delivery — measure what matters, set appropriate thresholds, and always have a rollback plan.
