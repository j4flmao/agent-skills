---
name: backend-load-testing
description: >
  Use this skill when the user says 'load test', 'stress test', 'soak test', 'spike test', 'k6', 'Locust', 'Artillery', 'performance test', 'benchmark', 'throughput', 'RPS', 'latency p99', 'CI performance', 'regression test', 'load test results', or when planning performance verification. This skill enforces consistent load testing patterns: tool selection, test type selection, scenario design, results analysis, CI integration, and thresholds. Applies to any backend stack. Do NOT use for: rate limiting design, caching strategy, API design, or database indexing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, testing, phase-2, universal]
---

# Backend Load Testing

## Purpose
Design consistent, production-grade load testing plans. Every test must follow the same conventions for test type selection, scenario design, metrics collection, threshold definition, results analysis, and CI regression detection.

## Agent Protocol

### Trigger
Exact user phrases: "load test", "stress test", "soak test", "spike test", "k6", "Locust", "Artillery", "performance test", "benchmark", "throughput", "RPS", "latency p99", "CI performance", "regression test", "load test results", "run a load test", "design a load test".

### Input Context
Before activating, verify:
- The system or endpoint being tested is known.
- The test type (stress / soak / spike / smoke) is known. If not, ask: "What type of test? Smoke (quick validation), Load (normal traffic), Stress (breaking point), Soak (long duration), or Spike (sudden surge)?"
- The target throughput and latency SLOs are known.
- The CI integration requirement is known.

### Output Artifact
No file output unless the user requests it. Produces load test specifications and scripts as text.

### Response Format
For each test:
```
Test: {name}
Type: {smoke | load | stress | soak | spike}
Tool: {k6 | Locust | Artillery}
Target: {endpoint or system under test}
Duration: {time}
VUs: {number} / RPS: {target}
Thresholds:
  p95 < {ms}
  p99 < {ms}
  error_rate < {%}
```

For a full test plan:
```
## {test suite name}
{list of tests with scenarios}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Test type is selected with justification.
- [ ] Tool is selected (k6 for most cases, Locust for Python teams, Artillery for Node.js).
- [ ] Test scenarios cover critical user journeys, not just health endpoints.
- [ ] Thresholds are defined for all metrics (latency, error rate, throughput).
- [ ] Test data strategy is defined (static vs dynamic data).
- [ ] CI integration is configured.
- [ ] Results analysis format is defined.

### Max Response Length
Per test scenario: 10 lines. Per test plan: unlimited.

## Workflow

### Step 1: Choose Tool
```
k6:         JS scripting, high performance, Go engine, built-in metrics, Grafana Cloud
            Best for: most projects, CI/CD, threshold assertions

Locust:     Python scripting, distributed by default, web UI
            Best for: Python teams, complex workflows, real-time monitoring

Artillery:  YAML/JS, Node.js, Lambda support, HTTP/WebSocket/Socket.io
            Best for: Node.js teams, WebSocket testing, serverless deployments
```

### Step 2: Choose Test Type
```
Smoke test:
  Duration: 1-2 min. VUs: 1-5.
  Purpose: verify test script works, no config issues.

Load test:
  Duration: 10-30 min. VUs: target concurrent users.
  Purpose: verify system handles expected traffic within SLOs.

Stress test:
  Duration: 10-20 min. VUs: ramp up until failure.
  Purpose: find breaking point, identify bottlenecks.

Soak test:
  Duration: 2-24 hours. VUs: 80% of expected peak.
  Purpose: detect memory leaks, DB connection leaks, degradation over time.

Spike test:
  Duration: 5-10 min. VUs: sudden 2-10x increase.
  Purpose: test auto-scaling, burst handling, queue draining.
```

### Step 3: Design k6 Test Script
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failures = new Rate('failed_requests');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up
    { duration: '5m', target: 100 },   // steady
    { duration: '2m', target: 200 },   // ramp up
    { duration: '5m', target: 200 },   // steady
    { duration: '1m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({ email: 'test@test.com', password: '123456' });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

  check(res, { 'status is 200': (r) => r.status === 200 });
  failures.add(res.status !== 200);
  loginDuration.add(res.timings.duration);

  sleep(1);
}
```

### Step 4: Define Metrics and Thresholds
```
Essential metrics:
  - http_req_duration (p50, p95, p99, max)
  - http_req_failed (error rate %)
  - http_reqs (throughput — RPS)
  - vus (concurrent virtual users)
  - iteration_duration (full scenario time)

Typical thresholds:
  p95 < 500ms       → Good
  p95 < 1000ms      → Acceptable
  p99 < 2000ms      → SLO boundary
  error_rate < 1%   → Acceptable failure rate

Resource metrics (track alongside):
  - CPU utilization
  - Memory usage
  - DB connection pool usage
  - GC pauses (for JVM/Go/Erlang)
```

### Step 5: Manage Test Data
```
Static data:     pre-generated CSV of users, products, etc.
  k6: SharedArray or CSV import for realistic data per VU

Dynamic data:    create resources during setup phase (setup() function)
  Tear down after test (teardown() function)

Data isolation:  use unique prefixes per test run to avoid collisions
  e.g., "test-user-{runId}-{vuId}"
```

### Step 6: Analyze Results
```
Summary output:
  - Pass/fail per threshold
  - p50, p95, p99, max latency
  - RPS average and peak
  - Error count and rate
  - Checks passed/failed

Interpretation:
  - Latency increases with VUs → scaling issue (blocked on DB, CPU, or lock)
  - Error rate increases → system reaching capacity
  - p99 >> p95 → tail latency outliers (GC pauses, queue buildup)
  - Decreasing RPS at high VUs → contention or resource exhaustion
```

## Rules
- Always ramp VUs gradually. Never start at full load.
- Never load test against production without explicit approval and a canary strategy.
- Always set thresholds. A test without thresholds is a benchmark, not a load test.
- Always isolate test data. Reusing data between runs creates false results.
- Always run soak tests before major releases. Memory leaks are the most common production bug.
- Include think time (sleep) in scripts to simulate realistic user behavior.
- Monitor server-side metrics (CPU, memory, DB, network) during the test, not just client metrics.
- Run in an environment that mirrors production (same instance size, same replicas, same DB config).

## References
  - references/ci-integration.md — CI Integration
  - references/k6-guide.md — k6 Guide
  - references/k6-scripting.md — k6 Scripting Guide
  - references/load-testing-infrastructure.md — Load Test Infrastructure
  - references/load-testing-scenarios.md — Load Test Scenarios
  - references/results-analysis.md — Load Test Results Analysis
  - references/test-types.md — Load Test Types
## Handoff
No artifact produced unless requested.
Next skill: backend-caching — if the load test reveals cache-related bottlenecks.
Next skill: backend-rate-limiting — if the load test needs traffic shaping.
Carry forward: test scenarios, thresholds, data strategy, CI config.
