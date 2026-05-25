---
name: quality-load-testing
description: >
  Use this skill when setting up load testing, performance testing, stress tests, k6, Locust, artillery, JMeter, or benchmarking throughput and latency. This skill enforces: scenario design (load, stress, spike, soak), metric collection (latency p50/p95/p99, throughput, error rate), distributed execution, and CI integration. Do NOT use for: frontend performance testing (Lighthouse), database query optimization, or unit-level benchmarks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, performance, phase-10]
---

# Quality Load Testing

## Purpose
Design and execute load tests with realistic scenarios, meaningful metrics, and reliable CI-integrated execution.

## Agent Protocol

### Trigger
Exact user phrases: "load testing", "performance testing", "stress test", "k6", "Locust", "artillery", "JMeter", "benchmark", "throughput", "latency", "spike test", "soak test".

### Input Context
Before activating, verify:
- Service under test (API, web app, streaming pipeline)
- Expected traffic baseline (RPS, concurrent users)
- Infrastructure (cloud provider, auto-scaling config)
- Existing performance baselines if any

### Output Artifact
Load testing plan with scenarios, metric targets, and execution strategy.

### Response Format
```yaml
# Test scenarios: load, stress, spike, soak
# Metric targets: p50, p95, p99, throughput, error rate
```
```javascript
// k6 test script
// CI pipeline configuration
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Test scenarios defined (load, stress, spike, soak)
- [ ] Metric targets set (p50 < 200ms, p95 < 500ms, p99 < 1s, error rate < 1%)
- [ ] Ramp-up profile designed per scenario
- [ ] Test script written for chosen tool (k6 preferred)
- [ ] CI pipeline with load test stage
- [ ] Results reporting configured (dashboard, threshold assertion)
- [ ] Distributed execution strategy for high throughput

### Max Response Length
200 lines of specification and scripts.

## Workflow

### Step 1: Scenario Design
Load test: expected traffic × 1.5 for 15 min — verify normal performance. Stress test: ramp up until failure — find the breaking point. Spike test: double traffic in 30 seconds — verify recovery. Soak test: sustained load at 80% capacity for 2+ hours — detect memory leaks and degradation. Each scenario specifies: target RPS, concurrent users, ramp-up profile, and duration.

### Step 2: Metric Targets
Latency: p50 < 200ms, p95 < 500ms, p99 < 1s. Throughput: >= expected peak RPS × 1.5. Error rate: < 1% for load tests, < 5% for stress tests (until failure). Resource utilization: CPU < 80%, memory < 80%, no connection pool exhaustion. Set thresholds in test script to fail CI when violated.

### Step 3: Ramp-Up Profile
Gradual ramp-up to avoid cold-start spikes: 1 min warm-up at 10% load, 2 min ramp to target, sustained for duration, 30 sec ramp-down. For spike tests: 0 to target in 5 seconds, sustain 1 min, observe recovery 2 min. Sleep/think time (100–500ms between requests) simulates real user behavior.

### Step 4: Test Script (k6)
```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 100 },  // ramp-up
    { duration: "10m", target: 100 }, // sustain
    { duration: "1m", target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/orders`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.3);
}
```

### Step 5: CI Integration
```yaml
- name: Load test
  run: k6 run script.js
  env:
    BASE_URL: ${{ secrets.LOAD_TEST_URL }}
    K6_OUT: influxdb=http://influxdb:8086/k6
```

### Step 6: Distributed Execution
For >10,000 RPS: k6 operator on Kubernetes (k6-operator), Locust with master/worker mode, artillery with multiple workers. Monitor aggregate metrics centrally.

## Rules
- Ramp-up gradually — never start at full load
- Think time between requests (mean 300ms, vary ±100ms)
- Threshold assertions in test script — fail CI on metric violations
- Soak tests run minimum 2 hours — catches memory leaks
- Metrics always include p50, p95, p99 — never average alone
- Test in pre-production environment with production-like data
- Run load tests on a schedule, not just ad-hoc
- Document test conditions (environment, data volume, network)

## References
- `references/execution.md` — Execution
- `references/k6-scripts.md` — K6 Scripts
- `references/locust-guide.md` — Locust Guide
- `references/test-design.md` — Test Design

## Handoff
`devops-observability` for monitoring setup based on load test findings.
`quality-e2e-testing` for functional validation of performance-critical flows.
Carry forward: test scenarios, metric baselines, threshold config.
