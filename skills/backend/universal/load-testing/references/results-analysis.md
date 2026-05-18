# Load Test Results Analysis

## Key Metrics

### Latency (Response Time)
```
Metric:       http_req_duration
Unit:         milliseconds (ms)
Key values:   p50, p95, p99, max, avg

Interpretation:
  p50:    median experience. Typical user waits this long.
  p95:    95th percentile. Slow requests that affect 1 in 20 users.
  p99:    99th percentile. The worst legitimate requests. SLO boundary.
  max:    outlier. Often noise (GC pause, network hiccup). Don't optimize for it.
  avg:    useful only for cost estimation, not user experience.

Healthy:
  p95 < 500ms    → good
  p95 < 1000ms   → acceptable
  p99 < 2000ms   → SLO boundary
```

### Throughput
```
Metric:       http_reqs
Unit:         requests per second (RPS)
Key values:   max, avg

Interpretation:
  Average RPS: sustained throughput.
  Peak RPS:    maximum achieved during test.
  Throughput curve vs VUs: linear scaling is good, plateau means bottleneck.

Healthy:
  Throughput scales linearly with VUs (until saturation point).
```

### Error Rate
```
Metric:       http_req_failed
Unit:         percentage (%)
Key values:   rate, count

Interpretation:
  rate:   fraction of all requests that errored.
  count:  absolute number (helps distinguish 0.1% of 1000 vs 0.1% of 1M).

Healthy:
  < 1%   → excellent (transient errors only)
  1-5%   → acceptable (if retries recover)
  > 5%   → problematic (investigate)
```

### Resource Utilization (Server-Side)
```
Track alongside load test:
  CPU:        % utilization
  Memory:     total, used, GC rate
  Disk I/O:   read/write KB/s, IOPS, await time
  Network:    bytes in/out, packet loss
  DB:         connection count, query latency, lock wait time
  App:        thread pool, connection pool, queue depth
```

## Analyzing Common Patterns

### Pattern 1: Latency Increases with VUs
```
Chart: VUs (x-axis) vs p95 latency (y-axis)
  VUs=100: p95=200ms
  VUs=200: p95=200ms
  VUs=400: p95=500ms
  VUs=800: p95=2000ms
  VUs=1600: p95=8000ms

Diagnosis: System reaches a tipping point.
  - Check CPU → hitting max? → compute-bound, need more instances.
  - Check DB → query latency increasing? → DB is bottleneck, need indexing or read replicas.
  - Check connection pool → exhausted? → increase pool size or tune queries.
  - Check lock contention → DB row/table locks? → optimize queries, add indexes.
```

### Pattern 2: Error Rate Spikes
```
Chart: VUs (x-axis) vs error rate (y-axis)
  VUs=100: errors=0%
  VUs=200: errors=0%
  VUs=400: errors=0.5%
  VUs=800: errors=15%

Diagnosis: Resource exhaustion.
  - Check response codes:
    429 → rate limited (configuration issue or intentional)
    500 → internal errors (OOM, unhandled exception)
    503 → service unavailable (connection pool empty, thread pool full)
    504 → gateway timeout (upstream slow)
```

### Pattern 3: p99 >> p95 (High Tail Latency)
```
Chart: p95=300ms, p99=3000ms (10x gap)

Diagnosis: Occasional slow operations affect tail.
  - GC pauses (Java, Go, .NET) → tune GC, reduce allocations, increase heap.
  - Queue buildup → requests waiting for worker threads.
  - Lock contention → serialized access to shared resource.
  - Kernel activity → scheduling, context switching.
```

### Pattern 4: Throughput Plateau
```
Chart: VUs (x-axis) vs RPS (y-axis)
  VUs=100: RPS=500
  VUs=200: RPS=1000
  VUs=400: RPS=1000  ← plateau / bottleneck
  VUs=800: RPS=800   ← degradation (throughput decreases)

Diagnosis: System at capacity.
  - What component is at 100% utilization?
    - CPU → compute-bound
    - Network bandwidth → I/O-bound
    - DB connections → connection-limited
    - Disk I/O → storage-bound
```

### Pattern 5: Memory Creep (Soak Test)
```
Chart: time (x-axis) vs memory usage (y-axis)
  t=0:   256 MB
  t=1h:  512 MB
  t=2h:  768 MB
  t=3h:  1024 MB (OOM)

Diagnosis: Memory leak.
  - Heap dump / profiling → identify objects not being freed.
  - Check: goroutine leak, unbounded caches, unclosed connections, event listeners.
```

## Summary Report Template

```
## Load Test Summary
Date: 2026-05-18
Test: load-test-user-service
Environment: staging (2 instances, 2 vCPU / 4 GB each)

### Results
| Metric | Value | SLO | Pass/Fail |
|--------|-------|-----|-----------|
| Throughput (avg) | 450 RPS | > 400 RPS | ✅ Pass |
| p95 latency | 320 ms | < 500 ms | ✅ Pass |
| p99 latency | 890 ms | < 1000 ms | ✅ Pass |
| Error rate | 0.3% | < 1% | ✅ Pass |

### Resource Utilization (avg/peak)
| Resource | Value | Limit | Notes |
|----------|-------|-------|-------|
| CPU | 65% / 92% | 100% | Peak at test start |
| Memory | 1.2 GB / 1.8 GB | 4 GB | Stable |
| DB connections | 12 / 20 | 50 | Healthy |

### Observations
- Throughput scales linearly up to 400 RPS, plateaus at 600 RPS.
- Bottleneck: CPU on app instances (add 1 more instance).
- P99 spikes at plateau point (contention during full CPU).
- No errors below 400 RPS.

### Recommendations
- Scale to 3 instances for expected peak of 500 RPS.
- Review query performance (N+1 observed on user orders endpoint).
```

## Automated Summary with k6
```bash
k6 run script.js --summary-export=results.json
```

```json
{
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "contains": "time",
      "values": {
        "avg": 245.3,
        "min": 12.1,
        "med": 180.4,
        "max": 4500.2,
        "p(90)": 420.1,
        "p(95)": 510.8,
        "p(99)": 1200.5
      }
    },
    "http_req_failed": {
      "type": "rate",
      "contains": "default",
      "values": {
        "rate": 0.003
      }
    },
    "http_reqs": {
      "type": "counter",
      "contains": "default",
      "values": {
        "count": 180000,
        "rate": 500.5
      }
    }
  }
}
```
