# Chaos Principles

## Steady State Hypothesis

Define measurable metrics before experiment:

| Metric | Target | Measurement Source |
|--------|--------|-------------------|
| p99 latency | <500ms | Prometheus / Grafana |
| Error rate | <0.1% | Prometheus / Datadog |
| CPU utilization | <80% | Node exporter |
| Memory utilization | <85% | Node exporter |
| Request throughput | >100 req/s | Service metrics |

```yaml
# Steady state hypothesis document
steadyState:
  metrics:
  - name: p99_latency
    query: 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
    targetMax: 0.5
  - name: error_rate
    query: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))'
    targetMax: 0.001
  - name: cpu_usage
    query: 'avg(container_cpu_usage_seconds_total{namespace="myapp"}[5m])'
    targetMax: 0.8
  duration: 300
```

## Experiment Lifecycle

1. **Hypothesis**: "When pod in myapp is killed, system maintains p99 <500ms"
2. **Experiment Definition**: Tool-specific YAML defining fault and targets
3. **Steady State Validation**: Pre-experiment metrics collected and verified
4. **Blast Radius**: Namespace=myapp, Target=single pod, Max duration=5min
5. **Execution**: Fault injected, metrics observed in real-time
6. **Analysis**: Compare post-experiment metrics vs steady state baseline
7. **Remediation**: Auto-rollback via ArgoCD if SLOs breached

## Blast Radius Control

```
Experiment scope progression:
  Single pod ──> Deployment ──> Node ──> Availability Zone

Controls:
  - Namespace isolation (no cross-namespace experiments initially)
  - Label selectors (target only pods with app=myapp-worker)
  - Duration limits (escalating: 1min, 5min, 15min)
  - Time-based schedule (outside business hours only)
  - Abort on SLO breach (automated via tool webhooks or Prometheus alerts)
```

```yaml
# Blast radius config
blastRadius:
  maxNamespaces: 1
  maxTargets: 1
  maxDuration: "5m"
  allowedTimes: ["02:00-05:00 UTC"]
  abortConditions:
  - metric: p99_latency
    operator: ">"
    threshold: 1.0
    duration: "30s"
```

## Emergency Kill Switch

```bash
# Litmus
litmusctl abort experiment <experiment-id>

# Chaos Mesh
kubectl annotate chaosexperiment my-experiment chaos-mesh.org/pause=true

# Gremlin
# Click "Halt" in UI or use API:
curl -X POST https://api.gremlin.com/v1/halt \
  -H "Authorization: Bearer $GREMLIN_API_KEY"
```

## Post-Experiment Report

```markdown
## Experiment Report: pod-kill-myapp-worker
- **Date**: 2026-05-22 03:00 UTC
- **Duration**: 5 minutes
- **Fault**: Pod kill (2 replicas terminated at 30s interval)
- **Blast Radius**: namespace=myapp, deployment=myapp-worker
- **Steady State**: p99=320ms, errors=0.02%, CPU=45%
- **During Experiment**: p99=890ms, errors=0.5%, CPU=72%
- **SLO Breach**: p99 exceeded 500ms for 45s
- **Auto-Abort**: Yes (triggered at 30s breach)
- **Remediation**: HPA scaled from 3→5 replicas
- **Recommendation**: Increase minReplicas from 3→5
```
