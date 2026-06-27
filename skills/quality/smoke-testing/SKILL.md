---
name: quality-smoke-testing
description: >
  Use when the user asks about smoke testing, build verification testing (BVT), deployment health checks, canary testing, sanity testing, or CI/CD pipeline health checks. Do NOT use for: full regression testing (quality-regression-testing), acceptance testing (quality-acceptance-testing), or end-to-end testing (quality-e2e-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, smoke-testing, phase-6]
---

# Smoke Testing

## Purpose
Validate that the most critical functionality of an application works after a deployment, build, or environment change. Smoke tests provide fast, reliable feedback that the system is stable enough for further testing or production release. This skill covers smoke suite design, CI/CD gate integration, rollback automation, and environment-specific strategies.

## Agent Protocol

### Trigger
User mentions smoke test, BVT, build verification, deployment health check, canary test, sanity check, or asks "is the build stable?"

### Input Context
- Deployment target (staging, production, canary)
- Changes included in the build
- Critical user journeys for the application
- Health endpoint specifications
- CI/CD pipeline stage and rollback capabilities

### Output Artifact
- Smoke test suite definition with pass/fail thresholds
- Deployment health report
- Rollback recommendation if critical failures found
- CI/CD pipeline configuration with smoke stage

### Response Format
Structured report with:
1. Build/version under test and environment details
2. Test results per smoke scenario (pass/fail/skip)
3. Overall verdict: PASS / FAIL / PARTIAL
4. Rollback recommendation and trigger if applicable
5. Execution time and threshold compliance

### Completion Criteria
- All smoke tests executed within time budget
- Results recorded with evidence (logs, screenshots)
- Verdict communicated to deployment pipeline
- Rollback triggered automatically if pass rate < threshold

## Workflow

1. **Define smoke suite**: Identify critical-path tests (infrastructure health, core services, critical user journeys). Keep under 25 tests
2. **Classify criticality**: Mark tests as critical (100% pass required) or non-critical (95% threshold). Critical failures trigger rollback
3. **Configure thresholds**: Set critical threshold to 100%, non-critical to 95%. Infrastructure failures stop the pipeline
4. **Execute on deploy**: Run automatically as first CI/CD stage after deployment. Complete in under 5 minutes
5. **Evaluate results**: Critical failure → automatic rollback. Non-critical failure below 95% → block promotion. All pass → continue
6. **Monitor post-deployment**: Continue health checks for 15-30 minutes after deployment. Auto-rollback on sustained degradation
7. **Maintain suite**: Review smoke tests monthly. Add tests for new critical paths. Remove obsolete tests. Verify determinism

## Architecture / Decision Trees

### Test Inclusion Decision Tree

```
Is this a critical business path?
├── YES → Can the system function without it?
│   ├── NO → Include as critical smoke test
│   └── YES → Include as non-critical smoke test
└── NO → Move to regression suite

Can it run in under 30 seconds?
├── YES → Keep in smoke suite
└── NO → Can it be split/optimized?
    ├── YES → Optimize and keep
    └── NO → Move to regression suite

Is it 100% deterministic?
├── YES → Keep in smoke suite
└── NO → Fix flakiness or remove
```

### Environment Configuration Decision Tree

```
Deployment target?
├── Staging → Full smoke suite (write operations OK)
│   ├── Threshold: 100% critical, 95% non-critical
│   └── Rollback: Automatic
├── Canary → Core smoke (read-only + limited write)
│   ├── Threshold: 100% all tests
│   └── Rollback: Canary drain
└── Production → Read-only smoke suite
    ├── Threshold: 100% all tests
    └── Rollback: Automatic full rollback
```

## Common Pitfalls

1. **Suite bloat**: More than 25 tests becomes slow. Prune aggressively — smoke tests are gates, not comprehensive validators
2. **Non-deterministic tests**: Zero tolerance for flakiness. Fix or remove immediately
3. **Complex test data**: Smoke tests requiring complex setup are fragile. Use defaults or existing seed data
4. **Environment-specific failures**: Tests passing in staging but failing in production have configuration issues
5. **No rollback automation**: Smoke failures must trigger automatic rollback, not manual review
6. **Write operations in production**: Production smoke tests must be read-only — never modify production data
7. **Stale credentials**: Expired smoke test credentials cause false failures. Rotate regularly
8. **Overlapping coverage**: Multiple tests verifying the same path waste time. Deduplicate
9. **Missing production verification**: Deploying to production without running smoke tests is risky
10. **No monitoring integration**: Smoke test results must feed into metrics and alerting systems

## Best Practices

1. Keep smoke suite small: 10-25 tests, under 5 minutes, focused on critical paths
2. Every smoke test must be 100% deterministic — non-deterministic tests erode trust
3. Classify tests as critical (100% pass required) or non-critical (95% threshold)
4. Run full smoke suite in staging, read-only smoke in production
5. Connect smoke results to automatic rollback and alerting systems
6. Use dedicated smoke test service accounts with limited permissions
7. Review and update smoke suite monthly to reflect current critical paths
8. Run smoke tests in parallel for speed, but each test must be independent
9. Use infrastructure health checks + core service checks + critical user journeys for complete coverage
10. Continue monitoring after deployment — initial smoke pass doesn't guarantee long-term health

## Compared With

| Aspect | Smoke Testing | Regression Testing | Health Checks |
|--------|--------------|-------------------|---------------|
| Scope | Critical paths | Complete suite | Single component |
| Duration | < 5 minutes | Minutes to hours | < 1 second |
| Frequency | Per deployment | Per change + scheduled | Continuous |
| Tests | 10-25 | 100-10000+ | 1-3 per service |
| Action on fail | Rollback | Block merge | Alert |
| Determinism | 100% required | < 1% flakiness OK | OK to be intermittent |
| Data | Defaults/seed | Complex setup | None |

## Performance Considerations

- Target: 5 minutes maximum for the entire smoke suite
- Each test: under 30 seconds. If slower, optimize or move to regression
- Use parallel execution for concurrent tests
- Reuse HTTP connections and auth tokens across tests in the same suite
- Pre-warm containers and connections before smoke test execution
- Allocate 15-20% buffer time for network latency and intermittent slowdowns
- Monitor execution time trend — growing suite execution time indicates bloat

## Smoke Test Examples

### Playwright — Critical Path Smoke Tests
```typescript
// e2e/smoke/critical-paths.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Smoke: Infrastructure", () => {
  test("homepage returns 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("health endpoint is healthy", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("healthy");
  });
});

test.describe("Smoke: Authentication", () => {
  test("login page loads with form elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("password-input")).toBeVisible();
    await expect(page.getByTestId("submit-button")).toBeVisible();
  });

  test("login with valid credentials succeeds", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("email-input").fill("smoke@example.com");
    await page.getByTestId("password-input").fill(process.env.SMOKE_PASSWORD!);
    await page.getByTestId("submit-button").click();
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe("Smoke: Core Business Flow", () => {
  test("product listing page loads", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByTestId("product-grid")).toBeVisible();
    await expect(page.getByTestId("product-card")).toHaveCount({ gte: 1 });
  });

  test("search returns results", async ({ page }) => {
    await page.goto("/products");
    await page.getByTestId("search-input").fill("wireless");
    await page.getByTestId("search-submit").click();
    await expect(page.getByTestId("search-results")).toBeVisible();
  });
});
```

### Python — API Health Smoke Tests
```python
# smoke/test_api_health.py
import requests
import sys

SMOKE_TESTS = [
    {"name": "homepage", "url": "/", "expected_status": 200},
    {"name": "health endpoint", "url": "/api/health", "expected_status": 200},
    {"name": "login page", "url": "/login", "expected_status": 200},
    {"name": "products API", "url": "/api/products", "expected_status": 200},
]

def test_all():
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    failures = []
    for test in SMOKE_TESTS:
        try:
            resp = requests.get(f"{base_url}{test['url']}", timeout=10)
            if resp.status_code != test["expected_status"]:
                failures.append(f"FAIL: {test['name']} - expected {test['expected_status']}, got {resp.status_code}")
            else:
                print(f"PASS: {test['name']}")
        except Exception as e:
            failures.append(f"FAIL: {test['name']} - {e}")
    
    if failures:
        print("\n".join(failures))
        sys.exit(1)
    print(f"\nAll {len(SMOKE_TESTS)} smoke tests passed")

if __name__ == "__main__":
    test_all()
```

## CI/CD Pipeline Integration

### GitHub Actions — Smoke Test Stage with Rollback
```yaml
name: Deploy with Smoke Tests
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      status: ${{ steps.smoke.outputs.status }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: ./deploy.sh staging
      - name: Smoke tests
        id: smoke
        run: |
          npx playwright test --grep @smoke --reporter=json > smoke-results.json
          if grep -q '"status":"failed"' smoke-results.json; then
            echo "status=failed" >> $GITHUB_OUTPUT
          else
            echo "status=passed" >> $GITHUB_OUTPUT
          fi
      - name: Rollback on smoke failure
        if: steps.smoke.outputs.status == 'failed'
        run: ./rollback.sh staging
  promote:
    needs: deploy
    if: needs.deploy.outputs.status == 'passed'
    runs-on: ubuntu-latest
    steps:
      - name: Promote to production
        run: ./promote.sh staging production
```

### ArgoCD Health Check Integration
```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    repoURL: https://github.com/example/app
  syncPolicy:
    automated:
      selfHeal: true
      allowEmpty: false
    retry:
      limit: 3
  health:
    - test: "smoke-test"
      commands:
        - "curl -f http://app:3000/api/health"
        - "curl -f http://app:3000/api/products | jq '. | length > 0'"
```

## Smoke Test Anti-Patterns

### Anti-Pattern: Suite Bloat
Smoke suites that exceed 25 tests become slow and lose their purpose as a fast health check. Prune aggressively. Smoke tests are gates, not comprehensive validators. Move detailed tests to regression.

### Anti-Pattern: Non-Deterministic Tests
Smoke tests must be 100% deterministic. Zero tolerance for flakiness. If a smoke test fails intermittently, fix it immediately or remove it from the smoke suite. Flaky smoke tests erode trust in the entire deployment pipeline.

### Anti-Pattern: Complex Test Data Setup
Smoke tests requiring complex data setup (API seeding, database migrations, multiple test accounts) are fragile and slow. Smoke tests should work with minimal or default data. Use existing seed data.

### Anti-Pattern: Write Operations in Production
Production smoke tests that create test orders, register test users, or modify data cause data pollution and may trigger real downstream effects. Production smoke tests must be read-only. Use GET requests only.

### Anti-Pattern: No Automatic Rollback
Smoke test failures that only notify humans instead of triggering automatic rollback introduce delay in incident response. Critical smoke test failures must trigger automatic rollback. Test the rollback automation quarterly.

### Anti-Pattern: Ignoring Infrastructure Health
Starting functional smoke tests before verifying infrastructure is healthy wastes time debugging false failures. Infrastructure checks (health endpoints, database connectivity, cache connectivity) must run first. If infrastructure is down, skip functional tests and fail fast.

## Smoke Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | Manual smoke | Manual checks after deployment, inconsistent execution, no automation |
| 2: Defined | Automated basic smoke | Scripted health checks, CI/CD integration, manual rollback on failure |
| 3: Managed | Comprehensive smoke suite | Infrastructure + critical path smoke, automatic rollback, 100% deterministic, reviewed every sprint |
| 4: Measured | Smoke as deployment gate | Automatic rollback on critical failure, post-deployment monitoring, layered smoke (staging vs production), execution time trend tracked |
| 5: Optimized | Predictive smoke | Canary analysis combines with smoke results, progressive delivery based on smoke + metrics, self-healing smoke suite automatically updates baseline expectations |

## Canary Testing Strategy

```yaml
canary_test:
  deployment:
    strategy: "10% canary → 50% → 100% rollout"
    interval: "10 minutes between stages"
  health_metrics:
    - "Error rate: < 1% (compare to baseline)"
    - "P95 latency: < 120% of baseline"
    - "CPU utilization: < 80%"
  smoke_tests:
    pre_rollout:
      - "Health endpoint returns 200"
      - "Authentication works"
      - "Core read API returns data"
      - "Core write API succeeds"
    during_rollout:
      - "Monitor same metrics in real-time"
      - "Auto-abort canary if any metric exceeds threshold"
```

## Smoke Test Metrics Dashboard

```yaml
smoke_metrics:
  reliability:
    pass_rate_last_30_days: 99.7%
    consecutive_passes: 187
    last_failure: "2026-05-12 (DB connection pool exhausted)"
  performance:
    avg_execution_time: "2m 43s"
    p95_execution_time: "4m 12s"
    max_execution_time: "5m 01s"
  coverage:
    infrastructure_checks: 4
    auth_checks: 3
    core_business_checks: 8
    total_tests: 15
  rollback:
    auto_rollbacks_triggered: 2
    avg_rollback_time: "45s"
    rollback_success_rate: 100%
```

## Rules
1. Smoke tests must complete in under 5 minutes — 300 seconds total maximum
2. Every deployment must pass smoke tests before reaching users — no exceptions
3. Smoke tests must be 100% deterministic — zero tolerance for flakiness. Fix immediate removal
4. A single critical smoke test failure triggers automatic rollback or pipeline block
5. Smoke suite must be reviewed and updated every sprint to reflect current critical paths
6. Smoke tests must not require complex test data setup — use defaults or existing seed data
7. Production smoke tests must be read-only — never create, update, or delete production data
8. Each smoke test must be independent — no shared state or ordering dependencies
9. Infrastructure tests must run first — if infrastructure is down, skip functional tests
10. Smoke test results must be recorded with evidence (response times, status codes, logs)
11. Smoke test credentials must be rotated every 90 days and stored in secrets management
12. Non-critical failure rate below 95% blocks promotion but does not trigger rollback
13. Post-deployment health monitoring must continue for at least 15 minutes after smoke pass
14. Smoke tests must be version-controlled alongside application code and pipeline config
15. No more than 25 tests in the smoke suite — exceeding this requires pruning
16. Rollback from smoke failure must be tested quarterly to verify automation works
17. Smoke tests for staging may include write operations; production smoke is read-only
18. Each smoke test must produce a clear pass/fail signal — no ambiguous results
19. Canary deployments require smoke tests to pass before traffic shifting
20. Smoke test results must feed into deployment health dashboards automatically

## References
- references/bvt-strategy.md — Build Verification Testing (BVT)
- references/canary-testing.md — Canary Testing
- references/deployment-health.md — Deployment Health Checks
- references/health-check-patterns.md — Health Check Patterns
- references/smoke-automation.md — Smoke Test Automation
- references/smoke-testing-advanced.md — Smoke Testing Advanced Topics
- references/smoke-testing-architecture.md — Smoke Testing Architecture and System Design
- references/smoke-testing-fundamentals.md — Smoke Testing Fundamentals
- references/smoke-testing-strategies.md — Smoke Testing Strategies
- references/smoke-testing-strategy.md — Smoke Testing Strategy and Decision Frameworks

## Handoff
After smoke testing, hand off to:
- `quality-regression-testing` — if smoke passes, run targeted regression on affected areas
- `quality-acceptance-testing` — if smoke passes and UAT is scheduled
- `quality-e2e-testing` — for deeper end-to-end verification of critical journeys
- `quality-load-testing` — if smoke reveals performance concerns
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

### Smoke Test Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Environment | Deployed staging (post-deploy) | CI preview (pre-deploy) | Deployment complexity, rollback speed |
| Selection criteria | Critical user journeys (business-focused) | All available endpoints (tech-focused) | Test execution time, coverage needs |
| Trigger | Automated post-deploy (always) | Manual (on demand) | Release frequency, risk tolerance |
| Pass/fail action | Block deployment (mandatory) | Alert only (advisory) | Service criticality, deployment speed |

### Smoke Test Categories
- Health check → Service responds, returns 200 OK
- Database connectivity → Read/write works, migrations applied
- Auth flow → Login/logout/token refresh works
- Critical transaction → Core business operation succeeds
- External dependency → Integrated services reachable