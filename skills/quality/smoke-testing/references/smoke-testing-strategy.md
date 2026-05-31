# Smoke Testing: Strategy and Decision Frameworks

## Overview

This reference provides tactical guidance on smoke test strategy, including test selection decision frameworks, rollback threshold models, environment-specific configurations, and maintenance workflows. It complements the architecture reference by focusing on practical day-to-day decisions for smoke test management.

## Core Architecture Concepts

### Smoke Test Decision Flow

Every smoke test decision follows a structured flow:

```
New Deployment or Environment Change
    │
    ├── What are the critical paths?
    │   ├── Core user journeys (login, purchase, search)
    │   ├── Infrastructure dependencies (DB, cache, queue)
    │   └── Integration points (external APIs, webhooks)
    │
    ├── What is the deployment target?
    │   ├── Staging → Full smoke suite + mutation tests
    │   ├── Canary → Core smoke suite (read-only + limited write)
    │   └── Production → Read-only smoke suite
    │
    ├── What are the pass/fail thresholds?
    │   ├── Critical tests: 100% pass required
    │   └── Non-critical: 95% pass threshold
    │
    └── What happens on failure?
        ├── Critical failure → Automatic rollback
        ├── Non-critical failure → Block promotion, manual review
        └── Infrastructure failure → Stop pipeline, page on-call
```

### Critical Path Identification Architecture

Identifying critical paths for smoke tests:

```
Business Impact Analysis:
  ┌─────────────────────────────────────────┐
  │ Path                        | Impact    │
  ├─────────────────────────────────────────┤
  │ User Registration            | Critical  │
  │ User Login                   | Critical  │
  │ Product Search               | Critical  │
  │ Add to Cart                  | Critical  │
  │ Checkout                     | Critical  │
  │ Payment Processing           | Critical  │
  │ Order History                | High      │
  │ User Profile Update          | Medium    │
  │ Product Reviews              | Medium    │
  │ Admin Dashboard              | Low       │
  │ Reporting                    | Low       │
  └─────────────────────────────────────────┘

Infrastructure Dependency Analysis:
  ┌─────────────────────────────────────────┐
  │ Dependency       | Failure Impact        │
  ├─────────────────────────────────────────┤
  │ Database         | Complete outage       │
  │ Authentication   | No user access        │
  │ Payment Gateway  | No revenue            │
  │ Search Service   | Degraded UX           │
  │ Cache            | Performance impact    │
  │ Message Queue    | Delayed processing    │
  │ CDN              | Slow page loads       │
  └─────────────────────────────────────────┘
```

### Rollback Decision Architecture

The rollback decision process must be automated:

```
Smoke Test Results
    │
    ├── All tests pass
    │   └── Continue deployment
    │
    ├── Critical test fails
    │   ├── Is it an infrastructure failure?
    │   │   ├── YES → Stop pipeline, page on-call
    │   │   └── NO → Trigger automatic rollback
    │   └── Log failure details for debugging
    │
    ├── Non-critical test fails (< 95%)
    │   ├── Block promotion
    │   ├── Notify team
    │   └── Manual review required
    │
    └── Mixed results
        ├── Critical pass + non-critical fail → Block + notify
        ├── Critical fail + non-critical pass → Rollback
        └── Infrastructure fail + functional pass → Stop + page
```

## Architecture Decision Trees

### Decision Tree 1: Test Inclusion

```
Is this functionality critical to the business?
├── YES → Can the system function without it?
│   ├── NO → Include in smoke suite (critical)
│   └── YES → Include in smoke suite (non-critical) or regression
└── NO → Would its failure block a deployment?
    ├── YES → Include in smoke suite (non-critical)
    └── NO → Move to regression suite

Can the test be executed in under 30 seconds?
├── YES → Keep in smoke suite
└── NO → Can it be split?
    ├── YES → Split and reassess
    └── NO → Move to regression suite

Is the test 100% deterministic?
├── YES → Keep in smoke suite
└── NO → Fix flakiness or remove from smoke
```

### Decision Tree 2: Environment Configuration

```
Where is the deployment going?
├── Development/Feature branch
│   ├── Run: Infrastructure health only
│   ├── Threshold: 100% critical, 90% non-critical
│   └── Rollback: Notify developer only
├── Staging
│   ├── Run: Full smoke suite (including mutations)
│   ├── Threshold: 100% critical, 95% non-critical
│   └── Rollback: Automatic rollback + notify team
├── Canary (5-10% traffic)
│   ├── Run: Core smoke (read-only + limited write)
│   ├── Threshold: 100% all tests
│   └── Rollback: Automatic canary drain
└── Production (full rollout)
    ├── Run: Read-only smoke + health checks
    ├── Threshold: 100% all tests
    └── Rollback: Automatic full rollback
```

### Decision Tree 3: Failure Response

```
What type of failure was detected?
├── Critical test failure
│   ├── Is the failure in the deployment target?
│   │   ├── YES → Rollback immediately
│   │   └── NO → Is it environmental?
│   │       ├── YES → Investigate environment, re-deploy
│   │       └── NO → Rollback and investigate
│   └── Is auto-rollback enabled?
│       ├── YES → Rollback proceeding
│       └── NO → Manual rollback required — page on-call
├── Non-critical test failure
│   └── Block deployment, notify team, manual review
└── Infrastructure failure
    └── Stop all deployments, page infrastructure team
```

## Implementation Strategies

### Smoke Test Execution Strategy

```typescript
// Smoke test runner with parallel execution and timeouts
interface SmokeTestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  critical: boolean
}

async function runSmokeSuite(
  config: SmokeConfig
): Promise<SmokeTestResult[]> {
  const results: SmokeTestResult[] = []

  // Run all tests in parallel with individual timeouts
  const testPromises = config.tests.map(async (test) => {
    const start = Date.now()
    try {
      const passed = await runTest(test)
      return {
        name: test.name,
        passed,
        duration: Date.now() - start,
        critical: test.critical
      }
    } catch (error) {
      return {
        name: test.name,
        passed: false,
        duration: Date.now() - start,
        error: error.message,
        critical: test.critical
      }
    }
  })

  // Wait for all tests with overall timeout
  const overallTimeout = setTimeout(() => {
    // Cancel remaining tests
    throw new Error('Smoke suite exceeded overall timeout')
  }, config.overallTimeout)

  try {
    results.push(...await Promise.all(testPromises))
  } finally {
    clearTimeout(overallTimeout)
  }

  return results
}
```

### Rollback Decision Implementation

```typescript
interface RollbackDecision {
  shouldRollback: boolean
  reason: string
  criticalFailures: string[]
  nonCriticalFailures: string[]
}

function decideRollback(results: SmokeTestResult[]): RollbackDecision {
  const criticalFailures = results
    .filter(r => !r.passed && r.critical)
    .map(r => r.name)

  const nonCriticalFailures = results
    .filter(r => !r.passed && !r.critical)
    .map(r => r.name)

  const totalNonCritical = results.filter(r => !r.critical).length
  const passedNonCritical = totalNonCritical - nonCriticalFailures.length
  const nonCriticalPassRate = totalNonCritical > 0
    ? (passedNonCritical / totalNonCritical) * 100
    : 100

  if (criticalFailures.length > 0) {
    return {
      shouldRollback: true,
      reason: `${criticalFailures.length} critical test(s) failed`,
      criticalFailures,
      nonCriticalFailures
    }
  }

  if (nonCriticalPassRate < 95) {
    return {
      shouldRollback: false, // Don't rollback, but block promotion
      reason: `Non-critical pass rate ${nonCriticalPassRate.toFixed(1)}% < 95%`,
      criticalFailures,
      nonCriticalFailures
    }
  }

  return {
    shouldRollback: false,
    reason: 'All smoke tests passed',
    criticalFailures: [],
    nonCriticalFailures: []
  }
}
```

## Integration Patterns

### CI/CD Pipeline Integration

```yaml
smoke-test:
  stage: smoke
  parallel:
    matrix:
      - TEST_GROUP: [infrastructure, core-journeys, integrations]
  script:
    - npm run smoke-tests -- --group=$TEST_GROUP
  artifacts:
    paths:
      - smoke-results/
  after_script:
    - node scripts/evaluate-smoke-results.js

rollback:
  stage: rollback
  needs: ["smoke-test"]
  script:
    - node scripts/trigger-rollback.js
  when: on_failure
```

### Monitoring Integration

Smoke test results should feed into monitoring systems:

```typescript
// Record smoke test metrics
function recordSmokeMetrics(results: SmokeTestResult[]) {
  const passed = results.filter(r => r.passed).length
  const total = results.length
  const passRate = (passed / total) * 100

  // Push to metrics system
  metrics.gauge('smoke.pass_rate', passRate)
  metrics.gauge('smoke.critical_failures',
    results.filter(r => !r.passed && r.critical).length)

  // Alert on failures
  if (passRate < 95) {
    alerting.sendAlert({
      severity: 'critical',
      message: `Smoke test pass rate: ${passRate.toFixed(1)}%`,
      details: results.filter(r => !r.passed).map(r => r.name)
    })
  }
}
```

## Performance Optimization

### Smoke Test Execution Optimization

| Technique | Speedup | Complexity |
|-----------|---------|------------|
| Parallel execution | 10-50x | Low |
| Connection reuse | 2-3x | Low |
| Pre-warm containers | 5-10s | Medium |
| Lightweight assertions | 2-5x | Low |
| Cached auth tokens | 5-10s | Low |
| Skip non-critical on retry | Variable | Medium |

### Time Budget Allocation

For a 5-minute smoke test window:

```
Total: 300 seconds
├── Infrastructure health: 30 seconds (10%)
│   ├── Service endpoints: 10s
│   ├── Database: 5s
│   ├── Cache: 5s
│   └── Message queue: 10s
├── Core services: 60 seconds (20%)
│   ├── Auth service: 20s
│   ├── API gateway: 15s
│   └── Search: 25s
├── Critical user journeys: 160 seconds (53%)
│   ├── Login flow: 30s
│   ├── Product browsing: 30s
│   ├── Cart/Checkout: 60s
│   └── Order confirmation: 40s
└── Buffer: 50 seconds (17%)
```

## Security Considerations

### Production Smoke Testing Security

- Use read-only API tokens with minimal permissions
- Never use production user accounts for smoke tests
- Create dedicated smoke test entities with identifiable naming (prefix: smoke-test-)
- Clean up any data created during smoke testing (rollback or delete)
- Audit smoke test access and results regularly

### Credential Rotation

- Rotate smoke test credentials every 90 days minimum
- Use CI/CD secrets management, never hardcoded values
- Different credentials per environment
- Immediately rotate on suspected compromise
- Log credential usage for audit

## Operational Excellence

### Smoke Test Dashboard

Key metrics for smoke test monitoring:
- Pass rate over time (per environment)
- Execution time trend (per environment)
- Test flakiness score (target: 0%)
- Rollback frequency triggered by smoke tests
- False positive rate (test fails, system OK)
- False negative rate (test passes, system broken)

### Incident Response Integration

Smoke test failures should trigger incident response:
1. Smoke test fails in production
2. Automatic rollback initiated
3. On-call engineer notified via PagerDuty/OpsGenie
4. Incident created with smoke test results
5. Rollback completed notification
6. Post-mortem scheduled

## Testing Strategy

### Smoke Test Review Checklist

Use this checklist when reviewing smoke tests:

```
□ Test validates a truly critical path
□ Test runs in under 30 seconds
□ Test is 100% deterministic
□ Test has no dependencies on other tests
□ Test has clear failure output
□ Test is readable and maintainable
□ Test credentials are valid and rotated
□ Test is configured for the correct environment
□ Test has appropriate timeout settings
□ Test has documented rollback threshold
```

### Smoke Test Lifecycle

```
Creation:
  - Identify critical path
  - Write test (under 30 seconds, deterministic)
  - Add to smoke suite configuration
  - Set criticality level

Validation:
  - Run 50 times to verify determinism
  - Run in all environments
  - Validate rollback threshold

Maintenance:
  - Review monthly for relevance
  - Update when critical path changes
  - Remove when no longer critical

Retirement:
  - Verify no longer a critical path
  - Move to regression suite if still useful
  - Remove from smoke configuration
  - Document rationale
```

## Common Pitfalls

1. **Too many tests**: Suite grows beyond 25 tests and slows the pipeline. Prune aggressively
2. **Non-deterministic tests**: Flaky smoke tests erode trust faster than any other test type
3. **Environment-specific data**: Tests that rely on environment-specific seed data fail in different environments
4. **Complex assertions**: Smoke tests should check basic functionality, not detailed business logic
5. **No rollback automation**: Smoke failures must trigger automatic rollback, not just notification
6. **Missing production smoke**: Deploying to production without verification is risky
7. **Stale test credentials**: Expired credentials cause false failures
8. **Overlapping coverage**: Multiple smoke tests for the same path waste time
9. **Ignoring env configuration**: Smoke tests that pass in staging but fail in production have env-specific issues
10. **No monitoring integration**: Smoke results must feed into monitoring and alerting systems

## Key Takeaways

- Smoke tests are deployment gates: 10-25 tests, under 5 minutes, 100% deterministic
- Classify tests as critical (100% required) or non-critical (95% threshold)
- A single critical failure triggers automatic rollback — no manual review needed
- Run read-only smoke tests in production, full smoke tests in staging
- Use dedicated credentials rotated every 90 days
- Integrate smoke test results with monitoring, alerting, and incident response
- Review the smoke suite monthly for relevance and determinism
- Each smoke test: < 30 seconds, deterministic, independent, tests a critical path
- Production smoke tests must never modify data
- Connect smoke results to automated rollback for zero-touch incident response
