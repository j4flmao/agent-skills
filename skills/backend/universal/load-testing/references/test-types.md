# Load Test Types

## Smoke Test

### Purpose
Verify that the test script works correctly and the system responds to basic requests. Validate that test data is set up and configurations (thresholds, stages) are correct.

### Characteristics
- Duration: 1-2 minutes
- VUs: 1-5
- RPS: minimal (1-10)
- Frequency: every script change, before any other test type

### k6 Script
```javascript
export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // just checking it works
    http_req_failed: ['rate<0.1'],
  },
};
```

### Expected Outcome
- All checks pass
- No script errors
- System returns valid responses
- Thresholds loosely enforced (2s is very lenient)

## Load Test

### Purpose
Verify system handles expected production traffic within latency and error SLOs.

### Characteristics
- Duration: 10-30 minutes
- VUs: expected peak concurrent users
- RPS: expected peak throughput
- Frequency: per release, after infrastructure changes

### k6 Script
```javascript
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // gradual ramp-up
    { duration: '10m', target: 100 },  // sustained peak
    { duration: '5m', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>50'],            // sustain 50+ RPS
  },
};
```

### Expected Outcome
- p95 < SLO (e.g., 500ms)
- p99 < SLO (e.g., 1000ms)
- Error rate < threshold (e.g., 1%)
- Throughput meets target
- No memory leaks or connection pool exhaustion (monitor server-side)

## Stress Test

### Purpose
Find the breaking point. Determine how much load the system can handle before performance degrades or errors appear.

### Characteristics
- Duration: 10-20 minutes
- VUs: ramp up until failure (often 2-10x expected peak)
- RPS: increasing until saturation
- Frequency: before major releases, capacity planning

### k6 Script
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 400 },
    { duration: '2m', target: 800 },
    { duration: '2m', target: 1600 },
    { duration: '2m', target: 200 },   // recover
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};
```

### Expected Outcome
- Identify the maximum throughput before degradation.
- Identify which component fails first (DB, memory, CPU, network).
- Document the breaking point and its bottleneck.

## Soak Test (Endurance Test)

### Purpose
Detect issues that only appear over extended periods: memory leaks, slow resource leaks (DB connections, file handles), garbage collection degradation, disk space growth.

### Characteristics
- Duration: 2-24 hours (or more)
- VUs: 60-80% of expected peak
- RPS: steady, below peak
- Frequency: before major releases, at least quarterly

### k6 Script
```javascript
export const options = {
  stages: [
    { duration: '10m', target: 80 },   // slow ramp-up
    { duration: '12h', target: 80 },   // long steady state
    { duration: '10m', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

### Expected Outcome
- Performance does not degrade over time.
- No memory growth (steady after warm-up).
- No connection pool exhaustion.
- Response time and throughput remain stable.

### Watch for
```
Monotonic memory growth → memory leak
Increasing p99 latency  → GC pressure or slow resource accumulation
Error rate increasing   → resource exhaustion (file handles, connections)
Logs increasing         → log volume growth (disk space concern)
```

## Spike Test

### Purpose
Verify the system handles sudden, dramatic increases in traffic. Tests auto-scaling, queue draining, and burst handling.

### Characteristics
- Duration: 5-10 minutes
- VUs: sudden 2-10x increase in seconds
- Frequency: after auto-scaling configuration changes

### k6 Script
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },     // normal load
    { duration: '10s', target: 500 },   // spike!
    { duration: '3m', target: 500 },    // sustain spike
    { duration: '10s', target: 50 },    // drop
    { duration: '2m', target: 50 },     // recover
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};
```

### Expected Outcome
- System survives the spike (no crash).
- Auto-scaling triggers and stabilizes.
- Queue drains after spike subsides.
- Some requests may be rate-limited during spike (acceptable).

## Test Selection Guide

| Test Type | When to Run | Duration | Goal |
|-----------|-------------|----------|------|
| Smoke | Every script change | 1-2 min | Script works |
| Load | Every release | 10-30 min | SLOs under expected traffic |
| Stress | Capacity planning, major releases | 10-20 min | Find breaking point |
| Soak | Quarterly, before major releases | 2-24 hours | Memory leaks, degradation |
| Spike | After auto-scaling config changes | 5-10 min | Burst handling |

## Execution Order for a Release
```
1. Smoke test → validate script and environment
2. Load test → verify SLOs at expected peak
3. Stress test → identify headroom and breaking point
4. Soak test (if major release) → verify long-term stability
5. Spike test → verify auto-scaling
```
