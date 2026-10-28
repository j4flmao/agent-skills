# Progressive Delivery Advanced Topics

Techniques for progressive delivery in demanding environments: statistically sound automated analysis, header/cohort-based routing, Gateway API traffic splitting, schema and data changes during rollouts, non-HTTP workloads, coupling with feature flags (OpenFeature), and organizational guardrails.

## Comparative Analysis

Absolute thresholds ("error rate < 1%") fail when baseline behaviour varies with time of day. Compare canary to a baseline that receives equivalent traffic.

| Approach | How | Notes |
|----------|-----|-------|
| Canary vs stable | Compare metrics of new pods to existing pods | Stable pods have warm caches and longer uptime: bias |
| Canary vs baseline | Deploy a fresh copy of the *old* version alongside the canary with equal traffic | Removes warm-up bias; used by Kayenta-style analysis |
| Ratio query | `canary_error_rate / stable_error_rate <= 1.2` | Simple, robust when traffic is sufficient |
| Statistical tests | Mann-Whitney U per metric with significance scores (Kayenta) | Needs enough samples per interval |

```yaml
# Argo Rollouts: ratio-based analysis with the canary/stable pod hash
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-ratio-vs-stable
spec:
  args:
    - name: canary-hash
    - name: stable-hash
  metrics:
    - name: error-ratio
      interval: 2m
      count: 5
      failureLimit: 1
      successCondition: result[0] <= 1.2
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            (
              sum(rate(http_requests_total{rollouts_pod_template_hash="{{args.canary-hash}}",code=~"5.."}[4m]))
              / sum(rate(http_requests_total{rollouts_pod_template_hash="{{args.canary-hash}}"}[4m]))
            )
            /
            clamp_min(
              sum(rate(http_requests_total{rollouts_pod_template_hash="{{args.stable-hash}}",code=~"5.."}[4m]))
              / sum(rate(http_requests_total{rollouts_pod_template_hash="{{args.stable-hash}}"}[4m])),
              0.001
            )
```

Pass hashes from the Rollout step:

```yaml
- analysis:
    templates: [{ templateName: error-ratio-vs-stable }]
    args:
      - name: canary-hash
        valueFrom: { podTemplateHashValue: Latest }
      - name: stable-hash
        valueFrom: { podTemplateHashValue: Stable }
```

Requires the pod-template-hash label to reach your metrics (relabel in Prometheus scrape config). `clamp_min` avoids division by zero when stable has no errors.

### Sample size
At 1% canary weight and 100 requests/s, the canary sees about 1 request/s: one error swings the rate wildly. Rules of thumb: hold each step long enough to collect hundreds of requests to the canary, or start at a higher weight for low-traffic services, or use synthetic traffic.

## Cohort and Header Routing

Route specific users first (employees, beta testers, one region) before percentage traffic:

```yaml
strategy:
  canary:
    trafficRouting:
      managedRoutes:
        - name: internal-users
      istio:
        virtualService: { name: checkout-vs, routes: [primary] }
    steps:
      - setHeaderRoute:
          name: internal-users
          match:
            - headerName: x-user-cohort
              headerValue: { exact: internal }
      - pause: { duration: 30m }
      - setWeight: 5
      - pause: { duration: 15m }
```

The header must be set by a trusted edge component (gateway after authentication), never accepted from clients directly.

## Gateway API Traffic Splitting

Kubernetes Gateway API expresses weights portably:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: checkout
spec:
  parentRefs: [{ name: public-gateway }]
  rules:
    - backendRefs:
        - { name: checkout-stable, port: 80, weight: 90 }
        - { name: checkout-canary, port: 80, weight: 10 }
```

Argo Rollouts (Gateway API plugin) and Flagger can manage these weights. Confirm your Gateway implementation supports weighted backends and the matches you need.

## Data and Schema Changes

Old and new versions run concurrently during a rollout, so data changes use expand/contract:

| Phase | Change | Safe with |
|-------|--------|-----------|
| Expand | Add new column/table (nullable or defaulted), new topic/event version | Old and new code |
| Migrate | New code writes both, backfill old rows | Old and new code |
| Switch | New code reads new structure | New code (old still tolerated) |
| Contract | Remove old column/field after all old versions are gone and rollback window passed | New code only |

Never pair a destructive migration with the canary that depends on it; ship it in a later release. Message consumers must accept both old and new event versions during the rollout.

## Non-HTTP Workloads

| Workload | Approach |
|----------|----------|
| Queue consumers | Run a small number of new-version consumers (partition/consumer-group share); compare processing errors, DLQ rate, lag |
| Batch jobs | Run new version on a subset of tenants/partitions; diff outputs against old version |
| gRPC | Mesh-level weighted routing works per request; watch for long-lived streams pinning clients to one version |
| Stateful services | Canary one replica/shard; verify replication compatibility both ways |
| Mobile/desktop clients | Store staged rollouts + server-side feature flags + remote kill switches |

## Feature Flags at Scale (OpenFeature)

Use a vendor-neutral API so flag providers can change without code changes:

```ts
import { OpenFeature } from '@openfeature/server-sdk'

await OpenFeature.setProviderAndWait(new MyProvider())   // e.g. flagd, LaunchDarkly, Unleash, Flipt provider
const client = OpenFeature.getClient('checkout')

const useNewPricing = await client.getBooleanValue('new-pricing-engine', false, {
  targetingKey: user.id,
  country: user.country,
  plan: user.plan,
})
```

Practices:
- Default values must be the safe/old behaviour (used when the provider is unavailable).
- Flags have owners and expiry; remove release flags after full rollout to avoid combinatorial debt.
- Emit flag evaluation as telemetry (OpenTelemetry semantic conventions for feature flags) so metrics can be sliced by variant.
- Kill switches for risky dependencies are permanent operational flags, documented as such.

## Rollback Engineering

- Abort must be faster than detection: shift traffic first, investigate later.
- Keep the previous ReplicaSet scaled (Argo Rollouts `scaleDownDelaySeconds`) for instant rollback after promotion.
- Rollbacks of config and flags are tracked like deploys (GitOps history).
- Practice: run game days where a deliberately bad canary must be auto-aborted.

## Organizational Guardrails

- Change policy by risk tier: low-risk services may use shorter steps; payment/identity services require longer analysis and business metrics.
- Freeze windows enforced by tooling (admission policy or pipeline gate), with an emergency override that is logged.
- Rollout ownership: the deployer watches until full promotion or hands off explicitly.
- Post-rollout review for every automated abort to tune metrics and thresholds.

## Checklist

- [ ] Analysis compares canary against stable/baseline with enough samples
- [ ] Pod hash or version labels flow into metrics
- [ ] Cohort routing based on trusted headers only
- [ ] Expand/contract for every data change shipped with a canary
- [ ] Non-HTTP workloads have a defined canary mechanism
- [ ] Feature flags via OpenFeature with safe defaults, owners and expiry
- [ ] Rollback paths exercised; aborts reviewed
