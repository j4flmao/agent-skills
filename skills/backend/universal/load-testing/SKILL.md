---
name: backend-load-testing
description: >
  Use this skill when the user says 'load test', 'stress test', 'soak test', 'spike test', 'k6', 'Locust', 'Artillery', 'performance test', 'benchmark', 'throughput', 'RPS', 'latency p99', 'CI performance', 'regression test', 'load test results', or when planning performance verification. This skill enforces consistent load testing patterns: tool selection, test type selection, scenario design, results analysis, CI integration, and thresholds. Applies to any backend stack. Do NOT use for: rate limiting design, caching strategy, API design, or database indexing.
version: "2.0.0"
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

## Decision Tree

### Which Load Test Type?

```
What do you need to validate?
  ├── Script works, no config issues
  │   └── Smoke test — 1-2 min, 1-5 VUs
  ├── Handles expected traffic within SLOs
  │   └── Load test — 10-30 min, target concurrent users
  ├── Find breaking point and bottleneck
  │   └── Stress test — 10-20 min, ramp until failure
  ├── Memory leaks / degradation over time
  │   └── Soak test — 2-24 hours, 80% of peak
  └── Auto-scaling / burst handling
      └── Spike test — 5-10 min, sudden 2-10x increase
```

### Which Tool?

```
What stack do you use?
  ├── Any / no preference
  │   └── k6 — JS scripting, high perf, Go engine, CI-friendly
  ├── Python team
  │   └── Locust — Python scripting, distributed, real-time Web UI
  ├── Node.js team, WebSocket testing
  │   └── Artillery — YAML/JS, WS/Socket.io, Lambda support
  └── Need protocol-level (not HTTP)
      └── ghz (gRPC) / wrk / hey (raw HTTP) / JMeter (complex scenarios)
```

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

### Step 4: Multi-Scenario Test (k6)
Test multiple user journeys in one script:

```javascript
import { group } from 'k6';

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      exec: 'browseScenario',
      startTime: '0s',
    },
    checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      exec: 'checkoutScenario',
      startTime: '30s',
    },
  },
};

export function browseScenario() {
  group('browse products', () => {
    http.get(`${BASE_URL}/api/products`);
    sleep(3);
    http.get(`${BASE_URL}/api/products/123`);
    sleep(2);
  });
}

export function checkoutScenario() {
  group('complete purchase', () => {
    const token = login();
    const cart = addToCart(token);
    const order = checkout(token, cart);
    check(order, { 'order confirmed': (r) => r.status === 200 });
    sleep(5);
  });
}
```

### Step 5: Locust Test Script (Python)
```python
from locust import HttpUser, task, between
from uuid import uuid4

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        """Login on start and store token"""
        resp = self.client.post("/api/v1/auth/login", json={
            "email": f"user-{uuid4()}@test.com",
            "password": "test123"
        })
        self.token = resp.json().get("token", "")

    @task(3)
    def browse_products(self):
        self.client.get("/api/v1/products",
            headers={"Authorization": f"Bearer {self.token}"})

    @task(1)
    def create_order(self):
        self.client.post("/api/v1/orders",
            json={"productId": "p1", "quantity": 1},
            headers={"Authorization": f"Bearer {self.token}"})

    @task(1)
    def view_profile(self):
        self.client.get("/api/v1/users/me",
            headers={"Authorization": f"Bearer {self.token}"})
```

### Step 6: Define Metrics and Thresholds
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

### Step 7: Manage Test Data
```
Static data:     pre-generated CSV of users, products, etc.
  k6: SharedArray or CSV import for realistic data per VU

Dynamic data:    create resources during setup phase (setup() function)
  Tear down after test (teardown() function)

Data isolation:  use unique prefixes per test run to avoid collisions
  e.g., "test-user-{runId}-{vuId}"
```

```javascript
// k6 — CSV data loading
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const users = new SharedArray('users', function () {
  return papaparse.parse(open('./test-users.csv'), { header: true }).data;
});

export default function () {
  const user = users[__VU % users.length];
  http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(user), params);
}
```

### Step 8: Analyze Results
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

### Step 9: CI Integration
```yaml
# GitHub Actions — k6 load test
name: Load Test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      app:
        image: ghcr.io/myorg/app:latest
        ports: [3000:3000]
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/smoke-test.js
          flags: --env BASE_URL=http://localhost:3000
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: k6-report
          path: k6-report.html
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Production vs staging | Never load test production directly. Use dedicated staging or preview env. Exception: canary with 1-2% traffic |
| Data isolation | Generate unique test data per run. Never reuse or share data between runs |
| Monitoring | Watch server-side metrics: CPU, memory, DB pool, GC, network I/O |
| Environment parity | Same instance size, same replicas, same DB config as production |
| Warm-up | Allow 1-2 min ramp-up before measuring steady state (JIT compilation, connection pools) |
| Tear-down | Clean up test data after completion (or use ephemeral environments) |

## Security

| Concern | Practice |
|---------|----------|
| Data contamination | Never use real user data in load tests. Generate synthetic data |
| Credential rotation | Rotate test credentials before production-facing exposure |
| Rate limit bypass | Get explicit exemption from rate limiting for load test accounts/IPs |
| Network isolation | Run load tests in isolated VPC/network segment |
| DoS concern | Coordinate with infra team before high-volume tests (>10K RPS) |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Testing only the health endpoint | Does not reflect real traffic patterns | Test critical user journeys |
| No ramp-up period | Cold start skews results (JIT, connection pools) | Include 1-2 min ramp-up |
| No think time | Overestimates system load (no real user is that fast) | Add realistic sleep/wait times |
| Ignoring server-side metrics | Client metrics alone miss root cause | Watch CPU, memory, DB, GC |
| Single-user test data | Lock contention, cache effects unrealistic | Use unique data per VU |
| Running once, trusting results | Variance due to GC, cache warmup | Run 3+ times, take median |
| No thresholds | A test without pass/fail criteria is a benchmark, not a test | Always set thresholds |

## k6 Advanced Patterns

```javascript
// Custom metrics
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

const businessErrors = new Rate('business_errors');
const checkoutLatency = new Trend('checkout_latency');

// Checks vs thresholds
export default function () {
  const res = http.get('http://test.k6.io');
  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });
  if (!passed) businessErrors.add(1);
}

// gRPC testing with k6
import grpc from 'k6/net/grpc';

const client = new grpc.Client();
client.load(['definitions'], 'user_service.proto');

export default function () {
  client.connect('localhost:50051', { plaintext: true });
  const response = client.invoke('users.UserService/GetUser', { userId: '123' });
  check(response, { 'status is OK': (r) => r.status === grpc.StatusOK });
  client.close();
}
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
- Run at least 3 iterations of each test and report the median.
- Always warm up the system (1-2 min) before measuring steady state.
- Never hardcode secrets in test scripts — use environment variables.
- Set fail-fast criteria: abort test if error rate exceeds 10% for more than 30 seconds.

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
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.