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

## Load Testing Script Examples

### k6 — Comprehensive Load Test
```javascript
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");

export const options = {
  stages: [
    { duration: "2m", target: 50 },   // ramp-up
    { duration: "10m", target: 50 },  // sustain
    { duration: "5m", target: 100 },  // ramp to peak
    { duration: "10m", target: 100 }, // peak load
    { duration: "2m", target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
    errors: ["rate<0.05"],
    login_duration: ["p(95)<2000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("user_login", function () {
    const payload = JSON.stringify({
      email: `user_${__VU}@example.com`,
      password: "test123",
    });
    const res = http.post(`${BASE_URL}/api/login`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    loginDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      "login status 200": (r) => r.status === 200,
      "login under 2s": (r) => r.timings.duration < 2000,
    });
    sleep(Math.random() * 0.5 + 0.3);
  });

  group("browse_products", function () {
    const res = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
    check(res, { "products status 200": (r) => r.status === 200 });
    sleep(Math.random() * 0.3 + 0.2);
  });
}
```

### Locust — Python Load Test
```python
from locust import HttpUser, task, between, events
import json

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        response = self.client.post("/api/login", json={
            "email": "loadtest@example.com",
            "password": "test123"
        })
        self.token = response.json().get("token")
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    @task(3)
    def browse_products(self):
        self.client.get("/api/products?page=1")
    
    @task(2)
    def view_product_detail(self):
        self.client.get("/api/products/42")
    
    @task(1)
    def add_to_cart(self):
        self.client.post("/api/cart/items", json={
            "product_id": 42, "quantity": 1
        })
```

### k6 — Spike Test
```javascript
export const options = {
  stages: [
    { duration: "2m", target: 50 },   // normal load
    { duration: "30s", target: 500 },  // spike
    { duration: "1m", target: 500 },   // sustain spike
    { duration: "2m", target: 50 },    // recovery
    { duration: "3m", target: 50 },    // observe recovery
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.02"],
  },
};
```

### k6 — Soak Test
```javascript
export const options = {
  stages: [
    { duration: "5m", target: 100 },   // ramp-up
    { duration: "120m", target: 100 }, // 2-hour soak
    { duration: "5m", target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};
```

## CI/CD Pipeline Integration

### GitHub Actions — Load Test Stage
```yaml
name: Load Test
on:
  schedule:
    - cron: "0 6 * * 1-5"  # Weekdays at 6 AM
  workflow_dispatch:
    inputs:
      scenario:
        description: "Test scenario"
        required: true
        default: "load"
        type: choice
        options: [load, stress, spike, soak]

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      influxdb:
        image: influxdb:1.8
        ports:
          - 8086:8086
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/k6/${{ github.event.inputs.scenario }}.js
          flags: --out influxdb=http://localhost:8086/k6
        env:
          BASE_URL: ${{ secrets.LOAD_TEST_URL }}
      - name: Check thresholds
        run: |
          # Parse k6 output for threshold violations
          if grep -q "thresholds on metrics have been breached" results.txt; then
            echo "Thresholds breached! Check Grafana dashboard."
            exit 1
          fi
```

## Load Testing Anti-Patterns

### Anti-Pattern: Testing Only Happy Paths
Load testing only the most common API endpoint (e.g., GET /api/products) misses system behavior under mixed workloads. Real users perform a variety of operations: login, browse, search, add to cart, checkout. Mix read and write operations proportionally to real traffic patterns.

### Anti-Pattern: No Think Time
Sending requests back-to-back without delays creates unrealistic load. Real users pause between actions (reading, typing, thinking). Apply think time of 100-500ms between requests. Vary think time randomly to avoid thundering herd patterns.

### Anti-Pattern: Testing Against Production
Running load tests against production risks degrading real user experience. Use staging environment with production-scale infrastructure. If production testing is unavoidable (capacity validation), run during off-peak hours with automatic abort on error rate spikes.

### Anti-Pattern: Ignoring Resource Utilization
Focusing only on response times while ignoring CPU, memory, disk I/O, and connection pool utilization. A system with acceptable latency but 95% CPU usage will fail under any additional load. Monitor server-side metrics alongside client-side response times.

### Anti-Pattern: Short Durations
Running load tests for 5-10 minutes misses memory leaks, connection pool exhaustion, garbage collection degradation, and slow resource leaks. Load tests should sustain peak load for minimum 10 minutes. Soak tests for minimum 2 hours.

### Anti-Pattern: No Baseline Comparison
Running load tests without comparing against previous runs makes it impossible to detect performance regressions. Store historical results. Alert on any significant deviation. Use statistical comparison (not single-run pass/fail).

## Load Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | Ad-hoc performance checks | Manual testing, no script versioning, no baselines |
| 2: Defined | Scripted load tests | k6/Locust scripts in version control, basic thresholds, scheduled runs |
| 3: Managed | Multi-scenario testing | Load, stress, spike, soak scenarios; CI integration; dashboards (Grafana); regression alerts |
| 4: Measured | Performance as quality gate | Thresholds in CI pipeline, automatic rollback on regression, trend analysis, resource monitoring correlation |
| 5: Optimized | Predictive performance engineering | Chaos + load testing combined, auto-scaling validation, capacity forecasting, SLA-driven performance budgets |

## Load Test Results Analysis

```yaml
load_test_report:
  scenario: "Peak Load - 100 concurrent users"
  environment: "staging-us-east-1 (8x t3.large)"
  duration: "15 minutes"
  results:
    throughput:
      avg_rps: 450
      peak_rps: 623
    latency:
      p50: 145ms
      p95: 380ms
      p99: 890ms
      max: 2100ms
    errors:
      rate: 0.3%
      http_500: 12
      timeouts: 3
    resources:
      cpu_avg: 62%
      memory_avg: 71%
      db_connections: 42/100
  thresholds:
    - metric: "p95 latency"
      threshold: "< 500ms"
      actual: "380ms"
      status: "PASS"
    - metric: "error rate"
      threshold: "< 1%"
      actual: "0.3%"
      status: "PASS"
    - metric: "cpu utilization"
      threshold: "< 80%"
      actual: "62%"
      status: "PASS"
  recommendations:
    - "Increase DB connection pool from 100 to 150 for headroom"
    - "Investigate p99 spike correlated with GC pause at 12 min mark"
```

## Performance Metrics Decision Tree

```
What performance characteristic are you validating?
├── Normal operation → Load test
│   ├── Target: expected peak traffic × 1.5
│   └── Duration: 15 minutes sustained
├── Breaking point → Stress test
│   ├── Ramp up until error rate exceeds 5% or latency exceeds SLA
│   └── Document the breaking point
├── Recovery behavior → Spike test
│   ├── Double traffic in 30 seconds
│   └── Measure recovery time to normal latency
├── Long-term stability → Soak test
│   ├── 80% of peak capacity for 2+ hours
│   └── Monitor memory, connection pools, GC
└── Scalability → Ramp test
    ├── Increase load stepwise every 5 minutes
    └── Verify linear scalability
```

## Load Testing Results Analysis (Additional)

```yaml
custom_metrics:
  - name: "Checkout Flow Latency"
    p50: 320ms
    p95: 890ms
    p99: 2100ms
    trend: "+12% from last week — investigate"
  - name: "Database Connection Pool"
    active_connections: 72
    max_connections: 100
    wait_count: 3
    trend: "Stable, within limits"
  - name: "CPU Utilization"
    avg: 68%
    max: 91%
    trend: "Peak correlates with payment API calls"
  - name: "Memory"
    avg_heap: "1.2GB"
    max_heap: "2.8GB"
    gc_pause_avg: "45ms"
    trend: "GC pauses increased 30% — investigate memory leak in payment module"
```

## Common Load Testing Tools Comparison

| Feature | k6 | Locust | Artillery | JMeter |
|---|---|---|---|---|
| Language | JavaScript | Python | YAML + JS | GUI + Java |
| Protocol support | HTTP, gRPC, WebSocket, browser | HTTP | HTTP, WebSocket, Socket.io | Extensive (HTTP, JDBC, JMS, FTP, etc.) |
| Distributed mode | k6-operator (K8s) | Master/worker | Built-in | Master/worker |
| Threshold assertions | Built-in | Custom | Built-in | Plugins |
| CI integration | Native | Docker/CLI | CLI | CLI + plugins |
| Scripting complexity | Low-Medium | Low | Very Low | Medium-High |
| Performance (RPS per instance) | 30K+ | 10K+ | 5K+ | 3K+ |
| Best for | Modern cloud-native teams | Python teams | Simple API testing | Enterprise, complex protocols |

## Rules
- Ramp-up gradually — never start at full load
- Think time between requests (mean 300ms, vary ±100ms)
- Threshold assertions in test script — fail CI on metric violations
- Soak tests run minimum 2 hours — catches memory leaks
- Metrics always include p50, p95, p99 — never average alone
- Test in pre-production environment with production-like data
- Run load tests on a schedule, not just ad-hoc
- Document test conditions (environment, data volume, network)
- Store historical results for trend analysis — 90 days minimum
- Alert on p95 latency increase >20% from baseline
- Never run destructive load tests against production
- Monitor server-side metrics alongside client-side metrics
- Mix read and write operations proportionally to real traffic
- Abort test automatically if error rate exceeds 5%
- Version control load test scripts alongside application code
- Use dedicated test accounts and data — never production credentials in load tests
- Target test environment must be isolated from production traffic
- Each test scenario must have documented goal and intended analysis

## References
  - references/execution.md — Execution
  - references/k6-scripts.md — k6 Scripts
  - references/load-testing-advanced.md — Load Testing Advanced Topics
  - references/load-testing-fundamentals.md — Load Testing Fundamentals
  - references/locust-guide.md — Locust Guide
  - references/test-design.md — Test Design
## Handoff
`devops-observability` for monitoring setup based on load test findings.
`quality-e2e-testing` for functional validation of performance-critical flows.
Carry forward: test scenarios, metric baselines, threshold config.
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
## Architecture Decision Trees

### Load Test Type Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Test goal | Capacity planning (max throughput) | Latency validation (p99 SLA) | Business requirement, SLO definition |
| Load pattern | Constant load (steady state) | Spike test (burst traffic) | Expected traffic pattern, scaling behavior |
| Test tool | k6 (JS, lightweight) | Locust (Python, distributed) | Team language, existing monitoring stack |
| Execution location | Cloud/distributed (realistic geo) | Single node (simpler, cheaper) | Global user distribution, cost |

### Threshold Definition
- Latency → p50 < 200ms, p95 < 500ms, p99 < 1s
- Error rate → < 0.1% for 2xx, < 1% for 5xx
- Throughput → target RPS based on production peak + headroom
- Resource usage → CPU < 80%, memory < 80%, no OOM