# Flag Strategies

## Canary Release Plan

```
Phase 0: 0%   — internal QA validation          (hours)
Phase 1: 1%   — internal users + dogfooders      (1 hour)
Phase 2: 5%   — beta users segment               (1 day)
Phase 3: 20%  — production users (low risk)      (2 days)
Phase 4: 50%  — production users (mid risk)      (3 days)
Phase 5: 100% — all users                        (1 week hold)
Phase 6:      — stabilize, remove flag           (cleanup)
```

Each phase has a minimum observation period. Never skip phases. If any phase triggers rollback conditions, revert to 0% immediately and investigate.

## Auto-Rollback Triggers

| Metric | Threshold | Evaluation Window |
|--------|-----------|-------------------|
| Error rate increase | >5% vs baseline | 1 minute |
| p95 latency increase | >20% vs baseline | 5 minutes |
| Success rate drop | <99.5% | 1 minute |
| 5xx spike | >2x baseline | 30 seconds |
| Business metric degradation | Statistically significant decline | 1 hour |
| CPU/Memory increase | >15% vs baseline | 5 minutes |

```typescript
// Auto-rollback monitoring
async function monitorCanary(flagKey: string, baseline: Metrics) {
  const interval = setInterval(async () => {
    const current = await collectMetrics();
    const errorDelta = (current.errorRate - baseline.errorRate) / baseline.errorRate;
    if (errorDelta > 0.05) {
      await flagClient.variation(flagKey, { key: 'global' }, false);
      await alertPagerDuty(`Auto-rollback triggered for ${flagKey}: error rate +${(errorDelta*100).toFixed(1)}%`);
      clearInterval(interval);
    }
  }, 30_000);
}
```

## Gradual Rollout via Flag Configuration

```yaml
rollout:
  strategy: percentage
  phases:
    - percentage: 1
      observation: 1h
      evaluation_period: 30s
    - percentage: 5
      observation: 24h
      evaluation_period: 60s
    - percentage: 20
      observation: 48h
      evaluation_period: 120s
    - percentage: 50
      observation: 72h
      evaluation_period: 300s
    - percentage: 100
      observation: 168h
      evaluation_period: 600s
  rollback:
    error_rate_threshold: 5
    latency_p95_threshold: 20
    cooldown: 300
```

## Kill Switch Strategy

```yaml
kill_switches:
  - name: kill-payment-v2
    description: "Globally disable payment-v2 if critical failures detected"
    owner: team-payment
    criticality: P0
    evaluation_cache_ttl: 5s
    targets:
      - service: payment-service
        feature: payment-v2-flow
    override: always_off_when_disabled
```

Every kill switch must pass a chaos engineering test quarterly: enable the kill switch, verify feature is disabled globally, verify system degrades gracefully, re-enable kill switch, verify feature resumes. Document the expected graceful degradation behavior for each kill switch.

## A/B Test Design Template

| Element | Recommendation |
|---------|---------------|
| Minimum sample size | 10,000 per variant for 5% MDE |
| Significance level | 95% (p < 0.05) |
| Power | 80% (beta = 0.2) |
| Maximum duration | 2 weeks (avoid time effects) |
| Minimum duration | 1 week (capture full weekly cycle) |
| Guardrail metrics | Error rate, latency, bounce rate |
| Primary metric | 1 per experiment (avoid multiplicity) |
| Variants | 2-5 (more = larger sample needed) |

```python
# Minimum sample size calculation
import math
def min_sample_size(p1, p2, alpha=0.05, beta=0.2):
    z_alpha = 1.96  # for 95% confidence
    z_beta = 0.84   # for 80% power
    p_bar = (p1 + p2) / 2
    numerator = (z_alpha * math.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * math.sqrt(p1*(1-p1) + p2*(1-p2)))**2
    denominator = (p2 - p1)**2
    return math.ceil(numerator / denominator)
```

## Metrics Comparison

```
Baseline (control): users without flag or served control variant
Treatment (canary): users with flag enabled or served treatment variant

Compare:
  - Error rate (HTTP 5xx, unhandled exceptions)
  - Latency p50/p95/p99 (milliseconds)
  - Throughput (requests per second per instance)
  - Business metrics (conversion rate, signup rate, revenue per user)
  - Infrastructure metrics (CPU, memory, GC pauses, connection pool usage)
```

## Flag Lifecycle During Canary

1. Create flag with 0% rollout and kill switch companion
2. Enable for internal testing (1%) — monitor infrastructure metrics
3. Gradual increase with monitoring at each step (5% → 20% → 50% → 100%)
4. Stabilize: hold at 100% for 1 week with continued monitoring
5. Cleanup: remove flag references from code, delete flag from management system
6. Post-mortem: document rollout timeline, issues encountered, lessons learned

## Common Pitfalls

- **Skipping phases**: Jumping from 5% to 100% bypasses risk detection windows. Always follow the phased plan.
- **Insufficient baseline**: Starting rollout without 24h+ baseline metrics makes it impossible to detect regressions. Establish baseline before phase 0.
- **No kill switch**: Without a kill switch, you must redeploy to disable the feature. This takes 10-30 minutes vs 5 seconds for a flag change.
- **Confounding deployments**: Rolling out flag change simultaneously with a code deployment confuses cause and effect. Stagger by at least 1 hour.
- **Not checking all rollback metrics**: Latency degradation can occur without error rate increase. Monitor all rollback signals, not just error rate.
