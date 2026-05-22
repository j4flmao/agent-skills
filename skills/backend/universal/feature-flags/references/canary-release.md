# Canary Release

## Gradual Rollout Plan
```
Phase 1: 1% — internal users           (1 hour)
Phase 2: 5% — beta users               (1 day)
Phase 3: 20% — production users        (2 days)
Phase 4: 50% — production users        (3 days)
Phase 5: 100% — all users              (remove flag)
```

## Auto-Rollback Triggers
- Error rate increase > 5% compared to baseline
- p95 latency increase > 20%
- Success rate drops below 99.5%
- Any 5xx spike > 2x baseline
- Business metric degradation (conversion, revenue)

## Metrics Comparison
```
Baseline (control): users without flag
Treatment (canary): users with flag enabled

Compare:
  - Error rate (HTTP 5xx, exceptions)
  - Latency p50/p95/p99
  - Throughput (requests per second)
  - Business metrics (conversion, signup, purchase)
```

## Flag Lifecycle During Canary
1. Create flag with 0% rollout
2. Enable for internal testing (1%)
3. Gradual increase with monitoring (5% → 20% → 50% → 100%)
4. Stabilize: hold at 100% for 1 week
5. Cleanup: remove flag, keep only released code path
