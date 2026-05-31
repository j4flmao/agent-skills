# Smoke Testing: Architecture and System Design

## Overview

Smoke testing (also called Build Verification Testing or BVT) validates that the most critical functionality of an application works after a deployment, build, or environment change. Unlike full regression suites, smoke tests are intentionally small, fast, and focused on core system health. This reference covers the architectural patterns, decision frameworks, and system design considerations for building effective smoke test suites.

## Core Architecture Concepts

### Smoke Testing System Architecture

A smoke testing system is designed for rapid health verification:

```
Deployment Trigger
    │
    ▼
Smoke Test Orchestrator
    ├── Environment health check
    ├── Core service status
    ├── Critical user journey 1
    ├── Critical user journey 2
    ├── Data integrity check
    └── Rollback decision
    │
    ▼
Result: Pass / Fail / Partial
    │
    ├── Pass → Continue deployment (full regression, traffic routing)
    ├── Fail → Rollback or block pipeline
    └── Partial → Investigate degraded functionality
```

### The Smoke Test as a Gate

Smoke tests serve as the first gate after deployment:

```
Deploy → Health Check → Smoke Tests → Regression → Traffic Route
                              ↓
                          Gate Decision
                      ├── Pass: Continue
                      └── Fail: Rollback
```

The gate must be:
- **Fast**: Complete in under 5 minutes
- **Reliable**: Zero flakiness — always passes if the system is healthy
- **Comprehensive**: Covers all critical paths
- **Actionable**: Clear pass/fail with specific failure information

### Smoke Test Suite Architecture

```
Smoke Suite Structure:

Layer 1: Infrastructure Health (< 30 seconds)
  - Service endpoints respond (HTTP 200)
  - Database connection active
  - Message queue reachable
  - Cache service responsive
  - DNS resolution works

Layer 2: Core Service Health (< 1 minute)
  - Authentication service works
  - Main API gateway responds
  - Core CRUD operations work
  - Search/index service responds

Layer 3: Critical User Journeys (< 3 minutes)
  - User login flow
  - Main transaction flow (create order, process payment)
  - Data retrieval flow (load dashboard, search results)
  - Essential write flow (submit form, save data)

Layer 4: Integration Health (< 30 seconds)
  - External service integrations responsive
  - Background job runner active
  - Webhook endpoints working
  - Scheduled tasks initialized
```

## Architecture Decision Trees

### Decision 1: What Belongs in Smoke Tests

| Criterion | Include in Smoke? | Rationale |
|-----------|-------------------|-----------|
| Fails on every deployment if broken | Yes | Core requirement for gate |
| Fails rarely but critically | Yes | Shows system is fundamentally broken |
| Fails only under specific conditions | No | Edge cases belong in regression |
| Slow to execute (> 30 seconds each) | No | Smoke must be fast |
| Non-deterministic | No | Smoke must be 100% reliable |
| Tests a minor feature | No | Smoke covers critical paths only |

**Decision rule:** Include a test in smoke if and only if: (1) it tests a truly critical path, (2) it runs in under 30 seconds, (3) it is 100% deterministic, and (4) its failure would block deployment.

### Decision 2: Environment Scope

| Environment | Smoke Tests | Rationale |
|-------------|-------------|-----------|
| Development | Limited (infrastructure health) | Fast feedback, pre-commit |
| Staging | Full smoke suite | Compatibility validation |
| Canary | Core smoke (10-30%) | Verify before full rollout |
| Production | Read-only smoke | No data mutation |
| DR/Backup | Infrastructure health only | Verify failover works |

**Decision rule:** Run full smoke on staging, read-only smoke on production, infrastructure-only smoke in DR. Development smoke is optional but recommended for fast feedback.

### Decision 3: Rollback Threshold

| Smoke Result | Action | Threshold |
|-------------|--------|-----------|
| All pass | Continue deployment | 100% pass rate |
| 1 critical failure | Immediate rollback | Any critical failure |
| 2+ non-critical failures | Block promotion | < 95% pass rate |
| Infrastructure failure | Stop all pipelines | Any infrastructure failure |

**Decision rule:** A single critical test failure triggers automatic rollback. Non-critical failures below 95% pass rate block promotion but don't trigger rollback.

## Implementation Strategies

### Smoke Test Implementation Patterns

**Pattern 1: Health Check Endpoint**
```typescript
async function checkHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5_000)
    })
    return response.status === 200
  } catch {
    return false
  }
}
```

**Pattern 2: Critical User Journey**
```typescript
async function verifyLoginFlow(baseUrl: string): Promise<boolean> {
  try {
    // Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'smoke-test-user',
        password: process.env.SMOKE_TEST_PASSWORD
      })
    })
    if (!loginRes.ok) return false
    const { token } = await loginRes.json()

    // Verify authenticated access
    const profileRes = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return profileRes.status === 200
  } catch {
    return false
  }
}
```

**Pattern 3: Database Connectivity Check**
```typescript
async function verifyDatabase(): Promise<boolean> {
  try {
    const result = await db.query('SELECT 1 as health_check')
    return result.rows[0].health_check === 1
  } catch {
    return false
  }
}
```

### Smoke Test Configuration

```yaml
# smoke-test-config.yaml
smoke_test:
  timeout: 300  # 5 minutes total
  critical_threshold: 100  # % pass required for critical tests
  non_critical_threshold: 95  # % pass required for non-critical
  
  tests:
    - name: infrastructure-health
      type: health_check
      critical: true
      timeout: 30
      targets:
        - url: "https://${ENVIRONMENT}/health"
        - url: "https://${ENVIRONMENT}/api/health/db"
        - url: "https://${ENVIRONMENT}/api/health/cache"
    
    - name: auth-service
      type: critical_journey
      critical: true
      timeout: 60
      endpoint: "https://${ENVIRONMENT}/api/auth"
    
    - name: main-transaction-flow
      type: critical_journey
      critical: true
      timeout: 120
      endpoint: "https://${ENVIRONMENT}/api/orders"
    
    - name: search-service
      type: integration_check
      critical: false
      timeout: 30
      endpoint: "https://${ENVIRONMENT}/api/search"
```

## Integration Patterns

### CI/CD Pipeline Integration

```yaml
stages:
  - build
  - deploy-staging
  - smoke-test           # ← Smoke tests here
  - regression           # ← Full regression here
  - deploy-production
  - smoke-prod           # ← Production smoke (read-only)

smoke-test-staging:
  stage: smoke-test
  script:
    - npm run smoke-tests -- --env=staging
  after_script:
    - node scripts/check-smoke-results.js
  variables:
    CRITICAL_THRESHOLD: "100"
    NON_CRITICAL_THRESHOLD: "95"
```

### Canary Deployment Integration

For canary deployments, smoke tests run on the canary instance:

```
1. Deploy v2 to 10% of instances
2. Route 5% of traffic to v2
3. Run smoke tests against v2
4. Monitor for 5 minutes (health checks)
5. If smoke pass + metrics OK → increase to 50%
6. Run extended smoke tests
7. If all pass → 100% rollout
8. If any fail → roll back canary to 0%
```

### Post-Deployment Monitoring

After smoke tests pass, continuous monitoring takes over:

```
Smoke Test Pass → Begin monitoring window (N minutes)
  ├── Every 30 seconds: health check
  ├── Every 60 seconds: critical journey
  ├── Monitor error rates
  ├── Monitor latency metrics
  └── If threshold violated → auto-rollback
```

## Performance Optimization

### Smoke Test Speed

| Optimization | Typical Improvement | Implementation |
|-------------|-------------------|----------------|
| Parallel test execution | N-tests speedup | Run all tests concurrently |
| Connection pooling | 2-5x per test | Reuse HTTP connections |
| Minimal assertions | 2-3x per test | Check status codes only |
| Pre-warm connections | 5-10s saved | Keep-alive between tests |
| Lightweight test data | 2-5s saved | Use default/seed data |

### Target Execution Times

| Smoke Suite Size | Target Time | Max Time |
|-----------------|-------------|----------|
| Infrastructure only | 30 seconds | 60 seconds |
| Core (10 tests) | 60 seconds | 2 minutes |
| Standard (25 tests) | 3 minutes | 5 minutes |
| Extended (50 tests) | 5 minutes | 8 minutes |

## Security Considerations

### Read-Only Tests on Production

Production smoke tests must never modify data:
- Use read-only API endpoints
- Use test accounts with read-only permissions
- Verify no write operations happen unintentionally
- Use separate smoke test credentials
- Audit smoke test access logs

### Credential Management

- Use dedicated smoke test service accounts with limited permissions
- Rotate smoke test credentials regularly
- Store credentials in secrets manager, not code
- Use different credentials per environment
- Never log credentials in smoke test output

## Operational Excellence

### Smoke Test Health

Monitor smoke test infrastructure health:
- Smoke test runner availability
- Smoke test execution time trend
- False positive rate (test fails but system is healthy)
- False negative rate (test passes but system is unhealthy)
- Infrastructure dependency health

### Smoke Test Maintenance

```
Weekly:
  - Review smoke test results from the week
  - Update critical paths if features changed
  - Verify all smoke tests still relevant

Monthly:
  - Audit smoke test suite for bloat
  - Remove tests that are no longer critical
  - Add tests for new critical paths

Quarterly:
  - Full smoke suite review with stakeholders
  - Update rollback thresholds
  - Review and rotate credentials
  - Test DR smoke test execution
```

## Testing Strategy

### Smoke Test Quality Gates

| Gate | Criterion | Action |
|------|-----------|--------|
| Determinism | 100% pass rate over 50 runs | Remove non-deterministic tests |
| Speed | < 30 seconds per test | Split or optimize slow tests |
| Relevance | Tests a critical path | Move non-critical to regression |
| Independence | No test depends on another | Refactor to parallel execution |
| Accuracy | Failure always = real problem | Fix false positives |

### Smoke Test vs Health Check

| Aspect | Health Check | Smoke Test |
|--------|-------------|------------|
| Scope | Single component | End-to-end critical path |
| Depth | Basic connectivity | Business logic |
| Frequency | Continuous (every 30s) | Per deployment |
| Duration | < 1 second | < 5 minutes |
| Action on failure | Alert | Rollback |
| Data requirements | None | Test data may be needed |

## Common Pitfalls

1. **Suite bloat**: Over time, smoke suites accumulate non-critical tests and become slow. Prune regularly
2. **Non-deterministic tests**: Tests that fail intermittently erode trust. Zero tolerance for flakiness
3. **Environment-specific failures**: Tests that pass in staging but fail in production (or vice versa) need fixing
4. **Test data dependencies**: Smoke tests that require complex data setup are fragile. Use defaults or existing data
5. **Too many tests**: More than 25 smoke tests is usually too many. Focus on truly critical paths
6. **Ignoring rollback decisions**: Smoke test results must be acted on automatically, not reviewed manually
7. **No production smoke testing**: Deploying to production without verification is risky. Run read-only smoke tests
8. **Stale tests**: Smoke tests that haven't been reviewed become obsolete as features change
9. **Slow tests**: Tests that take > 30 seconds each slow down the deployment pipeline
10. **Shared state**: Smoke tests that depend on each other's results are unreliable

## Key Takeaways

- Smoke tests are gates, not comprehensive validators: 10-25 tests, under 5 minutes, focused on critical paths
- Every smoke test must be 100% deterministic — zero flakiness tolerance
- Infrastructure health + core services + critical user journeys = complete smoke coverage
- A single critical failure triggers automatic rollback. Non-critical failures below 95% block promotion
- Smoke tests run on every deployment to every environment (staging, canary, production)
- Production smoke tests must be read-only — never modify production data
- Use dedicated test accounts with limited permissions for smoke tests
- Review and update the smoke suite regularly to reflect current critical paths
- Smoke tests complement health checks: health checks monitor continuously, smoke tests verify deployments
- Connect smoke test results to automated rollback and alerting systems for instant response
