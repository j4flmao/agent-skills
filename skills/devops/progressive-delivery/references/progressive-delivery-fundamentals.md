# Progressive Delivery Fundamentals

Progressive delivery releases a change to a small, controlled slice of users or traffic first, measures it, and expands or rolls back based on evidence. This reference covers the core concepts, strategy comparison, prerequisites, a minimal Argo Rollouts canary, and the decision guide. Tool-specific depth is in `argo-rollouts.md`, `flagger-config.md` and `canary-analysis.md`.

## Core Ideas

| Idea | Meaning |
|------|---------|
| Deploy ≠ release | Code can be deployed (running) without being released (receiving users) |
| Blast radius | Fraction of users exposed to a change at any moment |
| Guardrail metrics | Signals that must stay healthy to continue (error rate, latency, saturation, business KPIs) |
| Automated promotion/abort | Analysis decides; humans handle exceptions |
| Fast rollback | Returning to the previous version is quick and routine |

## Strategies

| Strategy | Mechanism | Rollback speed | Resource cost | Good for |
|----------|-----------|----------------|---------------|----------|
| Rolling update | Replace pods gradually (Kubernetes default) | Medium (roll forward/back) | Low | Low-risk changes |
| Blue-green | Full new environment; switch traffic at once | Instant (switch back) | 2× during switch | Changes that must flip atomically, easy verification |
| Canary | Shift a percentage of traffic in steps with analysis | Fast (shift weight to 0) | Low–medium | Most service changes |
| Feature flag rollout | New code path enabled for % of users/segments | Instant (toggle) | None extra | User-facing behaviour, independent of deploy |
| Traffic mirroring (shadow) | Copy requests to the new version, discard responses | N/A (no user impact) | Extra compute | Validating read paths and performance |
| A/B test | Split users to compare outcomes | N/A | Low | Product decisions, not safety |

Canary and feature flags complement each other: canary protects against bad builds (crashes, latency), flags protect against bad features (logic, UX).

## Prerequisites

1. **Observability per version**: metrics labelled by version/revision (e.g. pod template hash, `version` label) so canary and stable can be compared.
2. **Traffic control**: service mesh (Istio, Linkerd), ingress controller (NGINX, Traefik), Gateway API implementation, or cloud load balancer weights. Without it, canary weight equals replica ratio, which is coarse.
3. **Backward-compatible changes**: old and new versions run at the same time, so APIs, message formats and database schemas must work with both (expand/contract migrations).
4. **Fast, tested rollback** and a clear owner for each rollout.
5. **Enough traffic** for metrics to be meaningful at small percentages; low-traffic services need longer steps or synthetic load.

## Minimal Argo Rollouts Canary

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout
spec:
  replicas: 10
  revisionHistoryLimit: 3
  selector:
    matchLabels: { app: checkout }
  template:
    metadata:
      labels: { app: checkout }
    spec:
      containers:
        - name: checkout
          image: registry.example.com/checkout:1.42.0
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /healthz/ready, port: 8080 }
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - analysis:
            templates: [{ templateName: success-rate }]
            args: [{ name: service, value: checkout }]
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service
  metrics:
    - name: success-rate
      interval: 1m
      count: 5
      failureLimit: 1
      successCondition: result[0] >= 0.99
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service}}",code!~"5.."}[2m]))
            /
            sum(rate(http_requests_total{service="{{args.service}}"}[2m]))
```

Without a `trafficRouting` block, Argo Rollouts approximates weights by scaling canary and stable ReplicaSets. Add `trafficRouting` (Istio, NGINX, ALB, SMI, Gateway API plugin, ...) for precise percentages.

```bash
kubectl argo rollouts get rollout checkout --watch
kubectl argo rollouts promote checkout          # skip current pause
kubectl argo rollouts abort checkout            # shift traffic back to stable
kubectl argo rollouts undo checkout             # roll back to previous revision
```

## Choosing Metrics

| Category | Example | Notes |
|----------|---------|-------|
| Errors | 5xx ratio, exception rate | Compare to stable, not only to an absolute threshold |
| Latency | p95/p99 latency | Use histograms; averages hide tail regressions |
| Saturation | CPU throttling, memory, queue depth | Catches leaks and resource regressions |
| Business | Checkout completion, sign-ups | Slower to move; use for longer steps |
| Logs/crashes | Crash loops, new error signatures | Kubernetes restarts are a strong abort signal |

Start with error rate and latency; add business metrics once traffic is large enough.

## Decision Guide

```text
Is the change user-visible behaviour?        → feature flag rollout (+ normal deploy)
Is it infrastructure/runtime risk (new build, dependency, config)? → canary with automated analysis
Must all users switch at the same instant (protocol change)?      → blue-green (with compatibility plan)
Need to test against production traffic without user impact?     → traffic mirroring first
Low traffic service?                                               → longer canary steps or blue-green with smoke tests
```

## Common Mistakes

- Canarying a database migration that is not backward compatible.
- Analysis comparing against a fixed threshold that stable itself fails at peak times.
- Steps too short for metrics windows to fill (a 2-minute rate window needs more than 1 minute of data).
- Sticky sessions or caches making some users flip between versions mid-session.
- No alert or owner when a rollout pauses indefinitely.

## Checklist

- [ ] Metrics labelled per version; dashboards compare canary vs stable
- [ ] Traffic routing integrated for precise weights
- [ ] Changes backward compatible across versions
- [ ] Analysis templates with guardrail metrics and failure limits
- [ ] Rollback/abort commands tested and documented
- [ ] Feature flags for behaviour changes, canary for build risk
