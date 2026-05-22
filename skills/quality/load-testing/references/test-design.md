# Test Design

## Scenario Comparison

| Scenario | Purpose | Load Profile | Duration | Metric Targets |
|----------|---------|-------------|----------|----------------|
| Load | Verify normal traffic | Gradually ramp to 1.5× expected peak | 15 min | p95 < 500ms, errors < 1% |
| Stress | Find breaking point | Ramp up until failure | Until failure | Identify max capacity |
| Spike | Verify recovery | 0 → 2× in 30s, observe | 5 min total | Recovery < 30s |
| Soak | Detect degradation | 80% of expected peak | 2+ hours | No degradation over time |

## Metric Targets

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| p50 latency | < 200ms | 200–500ms | > 500ms |
| p95 latency | < 500ms | 500ms–1s | > 1s |
| p99 latency | < 1s | 1–2s | > 2s |
| Throughput | ≥ expected peak | 80–99% of expected | < 80% |
| Error rate | < 1% | 1–5% | > 5% |
| CPU usage | < 60% | 60–80% | > 80% |
| Memory usage | < 60% | 60–80% | > 80% |

## Ramp-Up Profiles

### Load Test
```
2min ramp → 10min sustain → 1min ramp-down
```
```
users
 100 ┤      ┌─────────────────┐
  50 ┤  ┌───┘                 └───┐
   0 ┤──┘                         └──
     └──┬──┬──┬──┬──┬──┬──┬──┬──┬──
        2  4  6  8 10 12 14 16 18 minutes
```

### Stress Test
```
Step ramp: 50 → 100 → 200 → 400 → 800 → fail
```
Steps of 2 min each, increase by 2× until error rate exceeds threshold.

### Spike Test
```
30s ramp to 2× → 1min hold → observe 2min
```
```
users
 200 ┤      ┌──┐
 100 ┤      │  │
   0 ┤──────┘  └──────────────────
     └──┬──┬──┬──┬──┬──┬──┬──┬──
        0  1  2  3  4  5  6  7 minutes
```

### Soak Test
```
10min ramp → 2+ hours sustain → 5min ramp-down
```

## Sign-off Criteria

| Scenario | Pass | Fail |
|----------|------|------|
| Load | All metric targets met | Any metric in Critical |
| Stress | Known breaking point identified | Unexpected early failure |
| Spike | Recovery within 30s with < 5% errors | Service unavailable > 30s |
| Soak | < 10% degradation over 2 hours | > 10% degradation or OOM |
