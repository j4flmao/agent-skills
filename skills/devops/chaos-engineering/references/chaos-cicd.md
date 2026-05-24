# Chaos Engineering CI/CD Integration

## Pipeline Integration

### GitLab CI

```yaml
chaos-test:
  stage: test
  script:
    - kubectl apply -f chaos/pod-kill.yaml
    - sleep 30
    - kubectl wait --for=condition=available --timeout=120s deployment/myapp
    - kubectl delete -f chaos/pod-kill.yaml
  only:
    - main
  environment: staging
```

### GitHub Actions

```yaml
name: Chaos Test
on:
  deployment_status:
jobs:
  chaos:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
    - name: Run pod kill experiment
      run: |
        kubectl apply -f chaos/pod-kill.yaml
        sleep 60
        kubectl wait --for=condition=available --timeout=120s deployment/myapp
```

## Blast Radius Progression

| Stage | Scope | Fault | Passing Criteria |
|-------|-------|-------|-----------------|
| 1 — Merge gate | Single pod in staging | Pod kill | p99 < 500ms, error < 0.1% |
| 2 — Pre-prod | 2 pods in staging | Pod kill + 100ms delay | p99 < 800ms, error < 0.5% |
| 3 — Canary | 1 pod in prod (5% traffic) | Pod kill | p99 < 500ms, error < 0.1% |
| 4 — Full prod | Full suite in prod | All fault types | SLOs met, auto-recovery < 5min |

## Automated Rollback on Failure

```yaml
name: Deploy with Chaos Gate
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
    - uses: actions/checkout@v4
    - name: Deploy canary
      run: kubectl apply -f deploy/canary.yaml
    - name: Run chaos gate
      run: |
        kubectl apply -f chaos/pod-kill.yaml
        kubectl wait --for=condition=Ready pods --all --timeout=120s
    - name: Check SLOs
      run: |
        ERROR_RATE=$(curl prometheus/api/v1/query --data 'query=rate(errors[5m])')
        if [[ $ERROR_RATE > 0.1 ]]; then
          echo "SLO breached — rolling back"
          kubectl apply -f deploy/previous-version.yaml
          exit 1
        fi
    - name: Promote to full
      if: success()
      run: kubectl apply -f deploy/production.yaml
```

## Chaos Experiment as Code

```yaml
# .chaos/experiments.yaml
experiments:
- name: weekly-pod-kill
  schedule: "0 14 * * 3"  # Every Wednesday 2PM
  target:
    namespace: production
    label: app=myapp
  fault: pod-kill
  blastRadius: 1 pod
  abortOnErrorBreach: 0.5%
  notification:
    slack: "#chaos-results"
- name: monthly-network-chaos
  schedule: "0 10 1 * *"  # 1st of month 10AM
  target: production
  fault: network-delay
  latency: 200ms
  duration: 5min
  blastRadius: 1 service
```

## Metrics and Validation

### SLO Checks During Chaos

```promql
# Error rate during experiment
sum(rate(http_requests_total{status=~"5.."}[1m])) /
sum(rate(http_requests_total[1m])) * 100

# p99 latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))

# Recovery time
time when (error_rate < 0.1) - time when (experiment_started)
```

| Metric | Passing Threshold |
|--------|------------------|
| Error rate | < 0.5% during experiment |
| p99 latency | < 2x baseline |
| Recovery time | < 5 minutes |
| Pod restart count | < 3 during experiment |
