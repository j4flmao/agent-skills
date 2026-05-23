# Version Sync — N / N+1 Compatibility, Rollout Strategies

## The Core Invariant

> During any rolling deploy, **two adjacent versions run simultaneously** against the same database,
> same cache, same message queue, same downstream APIs. The system MUST work in that mixed state.

Break this invariant and you have downtime, even with perfect orchestration.

## Compatibility Matrix Per Layer

| Layer            | N + N+1 rule                                                          |
|------------------|-----------------------------------------------------------------------|
| HTTP API         | additive only; no removal/rename in same release                      |
| gRPC / protobuf  | reserve removed field tags; never reuse tag numbers                   |
| JSON wire format | ignore unknown fields on read; new fields optional on write           |
| DB schema        | expand → dual-write → cutover → contract (over ≥ 2 releases)          |
| Queue payload    | versioned envelope `{v: 2, data: {...}}`; consumer handles all live v |
| Config keys      | new keys default-to-old-behavior; remove keys ≥ 1 release later       |
| Feature flag     | ship dark, flip after 100% rollout, remove flag after bake            |
| Background jobs  | idempotent; consumers tolerate jobs enqueued by older producers       |

## Deprecation Cadence (the 3-release rule)

```
Release N      add new behavior alongside old (both work)
Release N+1    make new behavior default; old still functional + deprecated log
Release N+2    remove old behavior + tests
```

Never compress this to 1 release. The cost of a hot revert spike at 3 a.m. exceeds
the cost of carrying duplicate code for 6 weeks.

## Rolling Update (default for stateless apps)

```
maxSurge: 25%        # +25% over desired during rollout
maxUnavailable: 0    # never drop below desired
minReadySeconds: 20  # wait after Ready before marking complete
```

Timing budget per pod:
- start → ready: ≤ 60s (page if longer)
- drain: ≥ 15s (≥ 2× LB health-check interval)
- terminationGracePeriodSeconds: 60s

Mixed-version window = (replicas / batch_size) × per-pod-time.
At 30 replicas, batch 6, 90s/pod → ~7.5 min of mixed state.

## Blue-Green

```
                        Router (LB / DNS / Service)
                                │
                ┌───────────────┼───────────────┐
                ▼                               ▼
             BLUE (v1)                       GREEN (v2)
          live traffic 100%                pre-prod, smoke tested
                ▲
                │  cutover: flip selector / weight 0/100
                ▼
                                              GREEN (v2)
                                            live traffic 100%
```

- Pros: instant rollback (flip back), full pre-prod soak before cutover, no mixed-version DB writes
- Cons: 2× infra cost during cutover, DB still shared (still needs N/N+1 schema)
- Use when: regulated environments, monolithic apps, infrequent releases

## Canary (recommended for ≥99.99%)

```
Phase   Traffic %   Bake time   Auto-gate metric
0       0%          —           build + unit
1       1%          10m         error rate ≤ baseline + 0.1%, p99 ≤ baseline × 1.1
2       5%          15m         same
3       25%         30m         same
4       50%         30m         same
5       100%        —           bake 2h before deploy next service
```

Argo Rollouts AnalysisTemplate:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: {name: success-rate}
spec:
  metrics:
  - name: success-rate
    interval: 1m
    successCondition: result[0] >= 0.995
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring:9090
        query: |
          sum(rate(http_requests_total{job="api",status!~"5.."}[2m]))
          / sum(rate(http_requests_total{job="api"}[2m]))
```

## Shadow / Mirror (zero user impact, max insight)

```
Production traffic
        │
        ├──────▶  v1 (response returned to user)
        │
        └──────▶  v2 (response discarded, metrics + diff captured)
```
- Use for risky behavior changes (algorithm rewrite, DB engine swap)
- Compare v1 vs v2 responses → flag drift before full rollout
- Limitations: cannot test writes safely (use idempotency key + skip downstream)

## Feature Flag Discipline

```ts
// Bad — branch in critical path with no flag
if (newAlgorithm) doNew() else doOld()

// Good — typed flag, default-off, observable, removable
const variant = flags.get('order.algo.v2', { default: 'v1' })
metrics.inc('order.algo.variant', { variant })
return variant === 'v2' ? doNew() : doOld()
```

Lifecycle:
1. Add flag (default off) → ship code in release N
2. Enable for 1% internal → 10% → 50% → 100% over ≥ 1 week
3. Bake at 100% for ≥ 1 release
4. Delete flag + old branch in release N+2
5. Track flag debt: alert if a flag is at 100% for > 30 days without removal

## Pre-Deploy CI Gates (enforce compatibility)

```
1. Lint + unit tests (must pass)
2. API contract test: new server vs old client SDK
3. DB migration dry-run on prod-shape schema (shadow DB)
4. Run old version + new version side-by-side in integration env:
     - old → DB → new (both reads work)
     - new → DB → old (both reads work)
5. Load test new version at 1.5× peak prod TPS
6. Security scan + dependency audit
7. Manual approval for ≥99.99% tier production deploy
```

## Rollback Strategy by Tier

| Tier      | Trigger                        | Method                              | RTO    |
|-----------|--------------------------------|-------------------------------------|--------|
| 99%       | Manual call                    | Redeploy previous tag               | 30 min |
| 99.9%     | Error rate breach (alert)      | `kubectl rollout undo`              | 5 min  |
| 99.99%    | Auto-gate failure mid-canary   | Argo rollout abort + traffic to v1  | 60 sec |
| 99.999%   | Burn-rate 14× in 5 min         | Automatic flag-flip + traffic shift | 10 sec |

## Database-Aware Version Sync

When app v2 introduces a schema change, the **schema migration MUST be deployed before app v2**:
```
T0   schema migration runs (expand: add column)              ← release N-1
T1   app v1 still writes old columns only                    ← currently live
T2   app v2 deployed (canary 5%) writes BOTH columns          ← release N
T3   app v2 at 100%, all writes dual                          ← release N
T4   backfill job fills historical rows                       ← release N
T5   app v3 reads new column, writes new only                 ← release N+1
T6   contract migration drops old column                      ← release N+2
```

Never deploy "app + breaking schema" in one shot. That is downtime by design.
