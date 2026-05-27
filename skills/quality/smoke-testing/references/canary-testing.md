# Canary Testing

## Overview

Canary testing gradually exposes a new version of software to a small subset of users before full deployment. This reduces blast radius by detecting issues early, enables automated rollback, and provides real-world validation before full rollout.

## Canary Deployment Strategy

### What is a Canary?

A canary release routes a small percentage of traffic (typically 1-5%) to a new version while the rest continues using the stable version. Metrics are compared between the canary and baseline to determine whether to proceed with full rollout or rollback.

```
                     ┌──────────────┐
User Traffic ──────→│  Load Balancer │
                     └──────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        ┌─────▼──────┐            ┌──────▼──────┐
        │  Stable v1  │  95%       │   Canary v2  │  5%
        │ (baseline)  │            │   (new)      │
        └─────────────┘            └──────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                      ┌─────▼──────┐
                      │  Metrics    │
                      │  Comparison │
                      └────────────┘
```

### Canary vs Blue-Green vs Rolling

| Aspect | Canary | Blue-Green | Rolling |
|--------|--------|------------|---------|
| Traffic shift | Gradual (1% → 5% → 50% → 100%) | Instant (100% switch) | Gradual (instance by instance) |
| Rollback speed | Instant (remove canary) | Instant (switch back) | Slow (wait for deployment) |
| Risk exposure | Low (small % of users) | Medium (100% on new version) | Medium (per-instance) |
| Cost | Normal + canary capacity | 2x capacity | Normal |
| Duration | Hours to days | Minutes | Minutes to hours |
| Real user validation | Yes | Limited | Limited |

## Canary Analysis

### Metrics Comparison

```typescript
interface CanaryMetrics {
  // Request metrics
  requestRate: number           // Requests per second
  errorRate: number             // % of requests returning errors
  latencyP50: number            // Milliseconds
  latencyP95: number
  latencyP99: number

  // Business metrics
  conversionRate: number        // % of users completing goal
  revenuePerUser: number        // Average revenue
  bounceRate: number            // % of single-page sessions
  sessionDuration: number       // Average seconds

  // System metrics
  cpuUsage: number              // % CPU utilization
  memoryUsage: number           // % memory utilization
  gcPauseTime: number           // Milliseconds
  activeConnections: number
}
```

### Statistical Comparison

```typescript
function analyzeCanary(
  baseline: CanaryMetrics[],
  canary: CanaryMetrics[],
  windowMinutes: number
): AnalysisResult {
  const results: AnalysisResult = {
    isHealthy: true,
    anomalies: [],
    metrics: {},
  }

  for (const [metric, threshold] of Object.entries(METRIC_THRESHOLDS)) {
    const baselineAvg = average(baseline.map((m) => m[metric]))
    const canaryAvg = average(canary.map((m) => m[metric]))
    const deviation = Math.abs(canaryAvg - baselineAvg) / baselineAvg

    if (deviation > threshold.maxDeviation) {
      results.anomalies.push({
        metric,
        baseline: baselineAvg,
        canary: canaryAvg,
        deviation,
        threshold: threshold.maxDeviation,
      })
      results.isHealthy = false
    }

    results.metrics[metric] = {
      baseline: baselineAvg,
      canary: canaryAvg,
      deviation,
      isAnomaly: deviation > threshold.maxDeviation,
    }
  }

  return results
}
```

### Metric Thresholds

| Metric | Max Deviation | Action if Exceeded |
|--------|---------------|--------------------|
| Error rate | +0.5% (absolute) | Immediate rollback |
| Latency P99 | +20% | Investigate, warn |
| Latency P95 | +30% | Warn |
| CPU usage | +30% | Investigate |
| Memory usage | +30% | Investigate |
| Conversion rate | -10% | Consider rollback |
| Revenue per user | -10% | Consider rollback |
| Bounce rate | +20% | Investigate |

### Anomaly Detection

```typescript
// Statistical methods for canary analysis
function detectAnomalies(
  baseline: number[],
  canary: number[]
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Method 1: Z-score
  const baselineMean = mean(baseline)
  const baselineStd = stddev(baseline)
  const canaryMean = mean(canary)
  const zScore = (canaryMean - baselineMean) / baselineStd

  if (Math.abs(zScore) > 3) {
    anomalies.push({
      method: 'z-score',
      score: zScore,
      severity: Math.abs(zScore) > 5 ? 'critical' : 'warning',
    })
  }

  // Method 2: Percentage-based (for non-normal distributions)
  const deviation = Math.abs(canaryMean - baselineMean) / baselineMean
  if (deviation > 0.2) { // 20% deviation threshold
    anomalies.push({
      method: 'percentage',
      score: deviation,
      severity: deviation > 0.5 ? 'critical' : 'warning',
    })
  }

  return anomalies
}
```

## Automated Rollback

### Rollback Triggers

```yaml
# Canary rollback policy
rollback:
  conditions:
    # Critical — immediate rollback
    - metric: error_rate
      operator: ">"
      threshold: 0.5 # percentage points above baseline
      window: 2 minutes

    # High — rollback if sustained
    - metric: latency_p99
      operator: ">"
      threshold: 1.5 # 50% above baseline
      window: 5 minutes

    # Medium — alert only
    - metric: cpu_usage
      operator: ">"
      threshold: 1.3 # 30% above baseline
      window: 10 minutes

  cooldown: 30 seconds # Wait between rollback checks
  autoRollback: true
```

### Rollback Script

```bash
#!/bin/bash
# Automated canary rollback
set -e

CANARY_DEPLOYMENT="myapp-canary"
STABLE_DEPLOYMENT="myapp-stable"

echo "Initiating rollback of canary: $CANARY_DEPLOYMENT"

# Step 1: Drain traffic from canary
kubectl scale deployment $CANARY_DEPLOYMENT --replicas=0
echo "Canary traffic drained"

# Step 2: Verify stable is handling all traffic
STABLE_REPLICAS=$(kubectl get deployment $STABLE_DEPLOYMENT -o jsonpath='{.status.readyReplicas}')
if [ "$STABLE_REPLICAS" -lt "3" ]; then
  echo "WARNING: Stable deployment has fewer than 3 replicas"
  kubectl scale deployment $STABLE_DEPLOYMENT --replicas=5
fi

# Step 3: Update ingress/route to point 100% to stable
kubectl apply -f ingress-stable-only.yaml
echo "Routing updated to stable only"

# Step 4: Send notification
curl -X POST -H "Content-Type: application/json" \
  -d '{"text":"Canary rolled back due to anomaly detection"}' \
  $SLACK_WEBHOOK_URL

echo "Rollback complete"
```

### Rollback Automation

```yaml
# GitHub Actions workflow for canary rollback
name: Canary Rollback
on:
  workflow_dispatch:
  repository_dispatch:
    types: [canary-rollback]

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Rollback canary
        run: |
          ./scripts/canary-rollback.sh
      - name: Notify team
        run: |
          ./scripts/notify-slack.sh "Canary rolled back"
```

## Canary Release Process

### Step-by-Step Workflow

```yaml
# canary-pipeline.yml
stages:
  - name: Deploy Canary
    actions:
      - Deploy new version to canary infrastructure
      - Configure traffic split (5% canary, 95% stable)
      - Start metric collection

  - name: Observe (Short)
    duration: 10 minutes
    actions:
      - Compare error rates
      - Compare latency metrics
      - Check for crash loops
      - Auto-rollback if critical threshold breached

  - name: Scale Up
    actions:
      - Increase canary to 25%
      - Notify team of canary progression
    duration: 30 minutes
    actions:
      - Deep metric analysis
      - Business metric comparison
      - Manual review if suspicious

  - name: Full Rollout
    actions:
      - Increase canary to 100%
      - Promote canary to stable
      - Decommission old version
      - Send success notification
```

### Canary Manifest Example (Kubernetes)

```yaml
# canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  labels:
    app: myapp
    track: canary
spec:
  replicas: 2  # Small footprint
  selector:
    matchLabels:
      app: myapp
      track: canary
  template:
    metadata:
      labels:
        app: myapp
        track: canary
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0-canary
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 3
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
---
# Service with traffic splitting
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

### Traffic Shifting with Service Mesh (Istio)

```yaml
# istio-virtualservice.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: myapp
            subset: canary
    - route:
        - destination:
            host: myapp
            subset: stable
          weight: 95
        - destination:
            host: myapp
            subset: canary
          weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  subsets:
    - name: stable
      labels:
        track: stable
    - name: canary
      labels:
        track: canary
```

## Canary Duration

### Duration Guidelines

| Canary Type | Duration | Use Case |
|-------------|----------|----------|
| Quick canary | 10-30 minutes | Minor changes, config updates |
| Standard canary | 1-4 hours | Feature releases, bug fixes |
| Extended canary | 24-72 hours | Major changes, infrastructure updates |
| Long-running canary | 1-2 weeks | Performance changes, gradual rollouts |

### Decision Gates

```
Gate 1 (5 minutes): Error rates must not exceed baseline by >0.5%
↓ Pass → Continue
↓ Fail → Rollback

Gate 2 (30 minutes): Latency P99 must not exceed baseline by >20%
↓ Pass → Scale canary to 25%
↓ Fail → Investigate, consider rollback

Gate 3 (2 hours): Business metrics (conversion, revenue) stable
↓ Pass → Continue to full rollout
↓ Fail → Investigate, consider rollback

Gate 4 (Post-rollout): Monitor for 30 minutes after full rollout
↓ Pass → Declare success
↓ Fail → Rollback entire deployment
```

## Observability During Canary

### Dashboard Setup

```yaml
# Grafana canary dashboard
panels:
  - title: Error Rate Comparison
    metrics:
      - query: 'sum(rate(http_requests_total{status=~"5..",track="stable"}[5m]))'
        alias: Baseline
      - query: 'sum(rate(http_requests_total{status=~"5..",track="canary"}[5m]))'
        alias: Canary
    type: timeseries

  - title: Latency P99
    metrics:
      - query: 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{track="stable"}[5m])) by (le))'
        alias: Baseline
      - query: 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{track="canary"}[5m])) by (le))'
        alias: Canary
    type: timeseries

  - title: Traffic Split
    metrics:
      - query: 'sum(rate(http_requests_total{track="stable"}[5m]))'
        alias: Stable
      - query: 'sum(rate(http_requests_total{track="canary"}[5m]))'
        alias: Canary
    type: stat
```

### Alert Rules

```yaml
# Prometheus alert rules for canary
groups:
  - name: canary
    rules:
      - alert: CanaryErrorRateSpike
        expr: |
          (
            sum(rate(http_requests_total{status=~"5..",track="canary"}[2m]))
            /
            sum(rate(http_requests_total{track="canary"}[2m]))
          )
          -
          (
            sum(rate(http_requests_total{status=~"5..",track="stable"}[2m]))
            /
            sum(rate(http_requests_total{track="stable"}[2m]))
          )
          > 0.005
        for: 1m
        annotations:
          summary: "Canary error rate exceeds baseline by >0.5%"

      - alert: CanaryLatencyDegradation
        expr: |
          (
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{track="canary"}[5m])) by (le))
            /
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{track="stable"}[5m])) by (le))
          )
          > 1.2
        for: 5m
        annotations:
          summary: "Canary P99 latency exceeds baseline by >20%"
```

## Smoke Tests in Canary Pipeline

### Canary Smoke Test Suite

```typescript
// canary-smoke-tests.ts
import { test, expect } from '@playwright/test'

const CANARY_BASE_URL = process.env.CANARY_URL!
const STABLE_BASE_URL = process.env.STABLE_URL!

test.describe('Canary Smoke Tests', () => {
  test('canary health endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${CANARY_BASE_URL}/health`)
    expect(response.status()).toBe(200)
  })

  test('canary responds within latency budget', async ({ request }) => {
    const start = Date.now()
    await request.get(`${CANARY_BASE_URL}/api/health`)
    const duration = Date.now() - start
    expect(duration).toBeLessThan(500) // 500ms max
  })

  test('canary and stable return consistent API responses', async ({ request }) => {
    const [canaryResponse, stableResponse] = await Promise.all([
      request.get(`${CANARY_BASE_URL}/api/config`),
      request.get(`${STABLE_BASE_URL}/api/config`),
    ])

    const canaryData = await canaryResponse.json()
    const stableData = await stableResponse.json()

    // Core configuration should match
    expect(canaryData.features).toEqual(stableData.features)
  })
})
```

### Pipeline Integration

```yaml
# Jenkins pipeline with canary smoke tests
pipeline {
  stage('Deploy Canary') {
    steps {
      sh 'kubectl apply -f canary-deployment.yaml'
    }
  }

  stage('Wait for Canary Ready') {
    steps {
      sh 'kubectl wait --for=condition=available deployment/myapp-canary --timeout=120s'
    }
  }

  stage('Run Canary Smoke Tests') {
    steps {
      sh 'npx playwright test canary-smoke-tests.ts'
    }
  }

  stage('Analyze Canary Metrics') {
    steps {
      sh 'node scripts/analyze-canary-metrics.js'
    }
  }

  stage('Promote Canary') {
    when {
      expression: { currentBuild.result == null }
    }
    steps {
      sh 'kubectl apply -f promote-canary.yaml'
    }
  }
}
```

## Canary Configuration Examples

### Feature Flags for Canary

```typescript
// LaunchDarkly canary configuration
const canaryConfig = {
  'new-checkout': {
    // 5% of users get the new version
    variations: [
      { value: 'stable', weight: 95 },
      { value: 'canary', weight: 5 },
    ],
    // Canary users are consistent (same user always gets same version)
    salt: 'new-checkout-experiment',
  },
}

// Application code
const checkoutVersion = ldClient.variation('new-checkout', { key: user.id })
if (checkoutVersion === 'canary') {
  render(<NewCheckout />)
} else {
  render(<LegacyCheckout />)
}
```

### Nginx Traffic Splitting

```nginx
# nginx canary config
upstream myapp_stable {
    server 10.0.1.1:8080 weight=95;
}

upstream myapp_canary {
    server 10.0.2.1:8080 weight=5;
}

server {
    listen 80;

    location / {
        # 5% of requests to canary
        split_clients "${remote_addr}${http_user_agent}" $variant {
            5%     canary;
            *      stable;
        }

        if ($variant = canary) {
            proxy_pass http://myapp_canary;
        }

        proxy_pass http://myapp_stable;
    }
}
```

## Best Practices

1. **Start small**: Begin with 1-5% of traffic
2. **Compare correctly**: Use the same time window for baseline and canary
3. **Set clear thresholds**: Define rollback conditions before launching
4. **Automate rollback**: Manual rollback is too slow for critical issues
5. **Monitor business metrics**: Technical metrics alone miss user-facing issues
6. **Use consistent routing**: Ensure the same user consistently gets canary or stable
7. **Log canary participation**: Tag logs with canary ID for debugging
8. **Run smoke tests**: Automated validation before and during canary
9. **Communicate canary status**: Team should know a canary is active
10. **Plan for extended canaries**: Some changes need days of observation

## Key Points

- Canary releases expose new versions to a small traffic percentage for real-world validation
- Canary vs blue-green vs rolling deployments trade off speed, risk, and cost
- Statistical comparison of metrics (error rate, latency, business metrics) determines canary health
- Automated rollback triggers on predefined metric thresholds
- Canary duration varies from 30 minutes (quick) to 2 weeks (extended)
- Traffic splitting can be done via load balancers, service mesh (Istio), or feature flags
- Smoke tests validate canary health immediately after deployment
- Observability during canary requires dashboards comparing canary vs baseline
- Canary analysis uses z-score and percentage-based anomaly detection
- Consistent routing (sticky sessions) ensures users have a stable experience
