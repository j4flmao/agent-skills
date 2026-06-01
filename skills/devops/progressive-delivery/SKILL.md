---
name: devops-progressive-delivery
description: >
  Use when the user asks about progressive delivery, canary deployments,
  blue-green deployments, feature flags in production, traffic shifting, A/B
  testing in production, Flagger, Argo Rollouts, deployment strategies, or
  gradual rollouts. Covers: canary analysis (Prometheus metrics, Datadog, manual
  judgement), traffic management (Istio, Linkerd, NGINX, SMI), feature flag
  systems (LaunchDarkly, Flagsmith, ConfigCat), deployment automation, and
  automated rollback based on metrics.
  Do NOT use for: basic CI/CD (cicd-pipeline), general Kubernetes
  (kubernetes-patterns), or feature flag development (backend-feature-flags).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, progressive-delivery, canary, blue-green, phase-3]
---

# Progressive Delivery

## Purpose
Implement progressive delivery strategies: canary releases, blue-green deployments, feature flags in production, traffic mirroring, and automated rollback based on metrics. Progressive delivery reduces deployment risk by exposing changes to a subset of users before full rollout.

## Agent Protocol

### Trigger
Exact user phrases: "progressive delivery", "canary", "canary deployment", "canary release", "blue-green", "blue/green", "feature flag", "feature toggle", "traffic shifting", "traffic split", "A/B testing", "production testing", "Flagger", "Argo Rollouts", "rollout strategy", "gradual rollout", "percentage rollout", "automated rollback", "metrics-based promotion", "traffic mirroring", "shadow traffic".

### Input Context
- Current deployment strategy (rolling update, recreate, manual)
- Service mesh or ingress controller (Istio, Linkerd, NGINX, Traefik)
- Metrics platform (Prometheus, Datadog, New Relic, CloudWatch)
- Feature flag platform (LaunchDarkly, Flagsmith, ConfigCat, Unleash)
- Application architecture (monolith, microservices, serverless)
- Deployment frequency and team size

### Output Artifact
Progressive delivery strategy document with deployment configuration (Argo Rollouts/Flagger), feature flag setup, canary analysis rules, traffic management config, and rollback automation.

### Response Format
YAML manifests for Rollout/Canary resources, feature flag configuration, Prometheus rules, and traffic split configuration with no extraneous explanation. No preamble. No postamble.

### Completion Criteria
- [ ] Deployment strategy selected with justification (canary, blue-green, feature flag)
- [ ] Traffic management configured (service mesh, ingress, or multi-service)
- [ ] Canary analysis rules defined (metrics, thresholds, duration)
- [ ] Automated rollback configured for metric degradation
- [ ] Feature flag system integrated (if applicable)
- [ ] Monitoring and observability for deployment verification

## Architecture / Decision Trees

### Deployment Strategy Decision Tree
```
Zero-downtime required?
  YES → Continue below
  NO → Rolling update (simplest, for internal/background services)

Stateful workload?
  YES → Blue-green (statefulset requires careful handling) or Rolling with maxUnavailable=0
  NO → Continue below

Metrics-driven automation needed?
  YES → Canary via Argo Rollouts or Flagger
  NO → Blue-green (simpler with quick rollback)

Multi-service dependencies?
  YES → Feature flags (decouple frontend from backend releases)
  NO → Canary or Blue-green (single service changes)

User segmentation needed?
  YES → Feature flags or A/B testing with traffic split
  NO → Canary with percentage-based traffic shift

Compliance/audit requirements?
  YES → Feature flags (audit trail, gradual enablement) + Blue-green (instant rollback)
  NO → Canary (fastest iteration)
```

### Comparison Table

| Strategy | Risk | Rollback Speed | Complexity | Metrics Check | User Segmentation | Traffic Cost |
|----------|------|---------------|------------|---------------|-------------------|--------------|
| Rolling Update | Medium | Slow (reversion) | Low | No | No | None |
| Blue-Green | Low | Instant (LB switch) | Medium | Manual | No | 2x (dual env) |
| Canary | Low | Gradual | High | Automated | Percentage | Partial (N%) |
| A/B Testing | Low | Instant (flag off) | High | Statistical | Yes | Full (split) |
| Feature Flag | Minimal | Instant | Medium | Per-flag | Granular | None |
| Traffic Mirroring | None | N/A (no user impact) | High | Comparison | No | 2x (copy) |

## Core Workflow

### Step 1: Argo Rollouts — Canary Deployment

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: app-rollout
spec:
  replicas: 10
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: myapp:v2.0.0
          ports:
            - containerPort: 8080
  strategy:
    canary:
      canaryService: app-canary    # Service for canary traffic
      stableService: app-stable    # Service for stable traffic
      trafficRouting:
        smi:                       # Service Mesh Interface (Linkerd)
          rootService: app-root    # Service that splits traffic
        # istio:                   # Alternative: Istio VirtualService
        #   virtualService:
        #     name: app-vsvc
        #     routes:
        #     - primary
        # nginx:                   # Alternative: NGINX ingress
        #   stableIngress: app-ingress
      steps:
        - setWeight: 10
        - pause:
            duration: 5m           # Observe 10% traffic for 5m
        - setWeight: 25
        - pause:
            duration: 10m          # Observe 25% for 10m
        - setWeight: 50
        - pause:
            duration: 10m          # Observe 50% for 10m
        - setWeight: 75
        - pause:
            duration: 5m           # Observe 75% for 5m
        - setWeight: 100           # Full rollout
      analysis:
        templates:
          - templateName: success-rate  # Automatic promotion/rollback
        startingStep: 1            # Start analysis after 10% weight
        args:
          - name: canary-hash
            valueFrom:
              podTemplateHashValue: Latest
```

### Step 2: Canary Analysis Template

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: canary-hash
  metrics:
    - name: success-rate
      count: 12                     # 12 measurements
      interval: 1m                  # Every 1 minute = 12 minute window
      successCondition: result >= 0.95  # 95% success rate required
      failureLimit: 3               # 3 failures = rollback
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(
              istio_requests_total{
                reporter="destination",
                destination_workload=~"app-rollout-{{args.canary-hash}}",
                response_code!~"5.*"
              }[1m]
            ))
            /
            sum(rate(
              istio_requests_total{
                reporter="destination",
                destination_workload=~"app-rollout-{{args.canary-hash}}"
              }[1m]
            ))

    - name: latency-p99
      count: 12
      interval: 1m
      successCondition: result <= 500  # p99 < 500ms
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99, sum(rate(
              istio_request_duration_milliseconds_bucket{
                reporter="destination",
                destination_workload=~"app-rollout-{{args.canary-hash}}"
              }[1m]
            )) by (le))

    - name: cpu-spike
      count: 6
      interval: 2m
      successCondition: result <= 80  # CPU < 80%
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            avg(rate(
              container_cpu_usage_seconds_total{
                pod=~"app-rollout-{{args.canary-hash}}-.*"
              }[2m]
            )) * 100

    - name: manual-judgement
      count: 1
      interval: 30m
      successCondition: "true"
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: sleep
                    image: alpine:latest
                    command: ["sleep", "1800"]  # Wait for manual approval
                restartPolicy: Never
            backoffLimit: 0
```

### Step 3: Flagger — Automated Canary with Istio

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: app-canary
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  service:
    port: 80
    targetPort: 8080
    gateways:
      - app-gateway.istio-system.svc.cluster.local
    hosts:
      - app.example.com
    match:
      - uri:
          prefix: /
    timeout: 15s
  analysis:
    interval: 1m                  # Analysis interval
    threshold: 5                  # Max failed checks before rollback
    maxWeight: 50                 # Max canary traffic percentage
    stepWeight: 10                # Traffic increase per step
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 95                 # Require 95% success rate
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500                # p99 < 500ms
        interval: 1m
      - name: cpu-usage
        thresholdRange:
          max: 80                 # CPU < 80%
        interval: 5m
    webhooks:
      - name: load-test
        url: http://load-tester.default.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 10m -q 10 -c 2 http://app-canary.default.svc.cluster.local/"
```

### Step 4: Feature Flag Integration

```yaml
# LaunchDarkly flag configuration (flags.json)
{
  "flags": {
    "new-checkout-flow": {
      "on": true,
      "targeting": {
        "rules": [
          {
            "clauses": [
              {
                "attribute": "email",
                "op": "endsWith",
                "values": ["@testcorp.com"]
              }
            ],
            "variation": 1  // Internal users see new flow
          }
        ]
      },
      "variations": [
        { "name": "old-checkout", "weight": 90 },
        { "name": "new-checkout", "weight": 10 }
      ]
    },
    "payment-v2": {
      "on": true,
      "targeting": {
        "prerequisites": [
          { "key": "new-checkout-flow", "variation": 1 }
        ]
      },
      "rules": [
        {
          "clauses": [
            {
              "attribute": "country",
              "op": "in",
              "values": ["US", "CA"]
            }
          ],
          "variation": 1
        }
      ]
    }
  }
}
```

```typescript
// Application code — feature flag check
import { LDClient } from 'launchdarkly-node-server-sdk';

const ldClient = await LDClient.init('sdk-key-abc123');

// Flag evaluation with user context
const user = { key: userId, email: userEmail, country: userCountry };
const useNewCheckout = await ldClient.variation('new-checkout-flow', user, false);
const usePaymentV2 = await ldClient.variation('payment-v2', user, false);

// Kill switch pattern
const allowTraffic = await ldClient.variation('allow-new-checkout-traffic', user, true);
if (!allowTraffic) {
  // Redirect to fallback — emergency kill switch
  return handleFallback();
}
```

### Step 5: Traffic Mirroring (Shadow Deployment)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-mirror
spec:
  hosts:
    - app
  http:
    - route:
        - destination:
            host: app
            subset: v1
          weight: 100
      mirror:
        host: app
        subset: v2
      mirrorPercentage:
        value: 100.0  # Mirror all traffic to v2
      # Or mirror only a percentage:
      # mirrorPercentage:
      #   value: 10.0
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: app-destination
spec:
  host: app
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Step 6: Blue-Green Deployment (Argo Rollouts)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: app-bluegreen
spec:
  replicas: 5
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: myapp:v2.0.0
  strategy:
    blueGreen:
      activeService: app-active    # Serves live traffic
      previewService: app-preview  # Preview for smoke tests
      previewReplicaCount: 3       # Full scale preview
      autoPromotionEnabled: false  # Manual promotion
      scaleDownDelaySeconds: 300   # Keep old replicas for rollback window
      postPromotionAnalysis:
        templates:
          - templateName: smoke-test
      antiAffinity:
        required: true
```

### Step 7: Automated Rollback Triggers

```yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: on-call
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-secret
---
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
spec:
  provider:
    type: prometheus
    address: http://prometheus:9090
  query: |
    sum(rate(http_requests_total{namespace="{{namespace}}",role="canary",status=~"5.."}[1m]))
    /
    sum(rate(http_requests_total{namespace="{{namespace}}",role="canary"}[1m]))
  alert:
    name: canary-error-rate
    severity: critical
    summary: "Canary error rate exceeded threshold for {{namespace}}"
    description: "Canary for {{namespace}} has error rate {{value}}%"
```

## Production Considerations

### Canary Strategy Parameters
```
Team size / deployment frequency:
  1-2 devs, weekly deploys → 3 steps (10%, 50%, 100%), 10m each
  5+ devs, daily deploys → 5 steps (5%, 10%, 25%, 50%, 100%), 5m each
  10+ devs, multiple deploys/day → 5+ steps, 2-3m each + feature flags

Service criticality:
  User-facing, revenue-critical → 6+ steps, 10m+ each, manual go/no-go
  Internal API → 3-4 steps, 5m each, fully automated
  Background job → Rolling update (simplest)

Traffic volume needed for significance:
  <100 req/min → Canary analysis takes too long. Use blue-green or feature flags.
  100-1000 req/min → 10% canary, 10m analysis (100-1000 samples)
  1000+ req/min → 5% canary, 5m analysis is sufficient
```

### Rollback Automation Rules
```
Always rollback when:
  - Error rate increase > 2x baseline for 2+ minutes
  - p99 latency increase > 2x baseline for 2+ minutes
  - Any 5xx rate > 1% for canary vs 0% for stable
  - CPU/Memory spike > 90% for 5+ minutes
  - Custom business metric drop > 5%

Never rollback automatically for:
  - Transient spikes (<30s)
  - Metrics without baseline comparison (cold start effects)
  - Known non-deterministic behavior (batch jobs, cache warmup)
```

### Feature Flag Lifecycle
```
Flag types:
  Release toggle: temporary (days-weeks). Remove after full rollout.
  Experiment toggle: temporary (weeks-months). Remove after analysis.
  Ops toggle: semi-permanent (kill switches, circuit breakers). Review quarterly.
  Permission toggle: permanent (user tiers, feature tiers). Manage in user service.

Flag cleanup:
  - Remove release toggles within 2 weeks of full rollout
  - Schedule cleanup in the ticket/task for the feature
  - Dead code detection: scan for unused flags quarterly
  - Flag debt is worse than code debt — old flags rot the codebase
```

### Monitoring During Progressive Delivery

```yaml
# Prometheus recording rules for canary comparison
groups:
  - name: canary_comparison
    interval: 30s
    rules:
      - record: canary:error_rate:ratio
        expr: |
          (rate(http_requests_total{role="canary",status=~"5.."}[1m])
          /
          rate(http_requests_total{role="canary"}[1m]))
          /
          (rate(http_requests_total{role="stable",status=~"5.."}[1m])
          /
          rate(http_requests_total{role="stable"}[1m]))
      - record: canary:latency_p99:difference_ms
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{role="canary"}[1m]))
          -
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{role="stable"}[1m]))
```

## Anti-Patterns

1. **Canary too small for statistical significance**: 1% canary on low-traffic service never reaches significance. Ensure minimum traffic (500+ req/min for analysis).

2. **Canary too large causing availability impact**: 50% canary on a new database migration could corrupt 50% of data. Start at 1-5% for storage changes.

3. **Feature flag permanence**: "Temporary" flags that live for years. Each flag adds code complexity. Set expiration dates and automate flag removal.

4. **No rollback plan**: Deploy without knowing how to revert. Always test rollback procedure before the deployment.

5. **Blue-green database compatibility**: Schema changes that break backward compatibility. Green must be able to read/write old schema until rollback window expires.

6. **Skipping load tests during canary**: Without synthetic traffic, canary analysis has no signal during low-traffic periods. Run load generators alongside canaries.

7. **Inconsistent traffic routing**: L7 vs L4 canary routing inconsistency. Ensure the same routing rules apply at all levels (LB, mesh, ingress).

8. **Silent canary failure**: Canary fails analysis but nobody notices because alerts are misconfigured. Canary failures should page immediately.

9. **Feature flag testing gaps**: Production-only flag combinations not tested in staging. Every flag combination must be tested before production.

10. **Ignoring cold starts in serverless**: Canary on Lambda functions causes cold start errors that trigger false rollbacks. Tune thresholds for cold start effects.

## Compared With

| Tool | Strategy | Traffic Management | Analysis | Complexity |
|------|----------|-------------------|----------|------------|
| **Argo Rollouts** | Canary, Blue-Green | SMI, Istio, NGINX, Ambassador, ALB | Prometheus, Datadog, NewRelic, Webhook, Job | Medium |
| **Flagger** | Canary, Blue-Green, A/B Testing | Istio, Linkerd, App Mesh, NGINX, Contour, Gloo, Traefik, SMI | Prometheus, Datadog, Graphite, CloudWatch | Medium |
| **LaunchDarkly** | Feature Flags | Application-level | Built-in analytics | Low |
| **Flagsmith** | Feature Flags | Application-level | Built-in analytics | Low |
| **AWS CodeDeploy** | Canary, Blue-Green, Linear, All-at-once | ALB/NLB | CloudWatch metrics | Low |
| **Spinnaker** | Canary, Blue-Green, Red/Black | Multiple providers | Kayenta (ML-based) | Very High |

## References
- references/argo-rollouts.md — Argo Rollouts
- references/canary-analysis.md — Canary Analysis
- references/deployment-strategies.md — Deployment Strategy Comparison
- references/flagger-config.md — Flagger Configuration
- references/progressive-delivery-advanced.md — Progressive Delivery Advanced Topics
- references/progressive-delivery-fundamentals.md — Progressive Delivery Fundamentals
- references/traffic-mirroring.md — Traffic Mirroring / Shadowing
- references/feature-flag-patterns.md — Feature Flag Design Patterns
- references/rollback-strategies.md — Automated Rollback Strategies
- references/canary-metrics.md — Canary Metrics and Thresholds
- references/flagger-metrics.md — Flagger Metric Templates and Alerting

## Handoff
Related skills: gitops-advanced (ArgoCD + Rollouts integration), service-mesh (Istio traffic management), sre-practices (SLO-based canary promotion), platform-engineering (IDP deployment templates), cicd-pipeline (CI/CD + deployment pipeline).
