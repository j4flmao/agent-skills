# Smoke Testing Strategies

## Purpose

Smoke tests verify that the most critical functionality works after a deployment. They catch catastrophic failures early — before full regression suites run.

## Test Selection

### Criteria for Smoke Tests
- Covers the most critical user journeys
- Can run in under 5 minutes
- High business impact if broken
- Tests deployment health, not feature details
- Stable (low flakiness)
- Tests the integrated system, not isolated components

### Sample Smoke Test Suite
| Test | Duration | Business Criticality |
|------|----------|---------------------|
| User can log in | 30s | Critical |
| Main page loads | 15s | Critical |
| API health endpoint returns 200 | 5s | Critical |
| Database connection works | 10s | Critical |
| User can view dashboard | 45s | High |
| User can create resource | 60s | High |
| Payment flow completes | 120s | Critical |

## Implementation

### Smoke Test Automation
```typescript
describe('Production Smoke Tests', () => {
  test('application responds on health endpoint', async () => {
    const response = await fetch(`${BASE_URL}/health`)
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('healthy')
  })

  test('user authentication works', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: { email: testUser.email, password: testUser.password },
    })
    expect(response.status).toBe(200)
    expect(response.body.token).toBeDefined()
  })
})
```

### CI Integration
```yaml
smoke-tests:
  if: github.event.deployment_status.state == 'success'
  steps:
    - run: npm run test:smoke
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: smoke-test-results
        path: test-results/
```

## Deployment Pipeline Integration

### Pipeline Stages
```
Build → Deploy to Staging → Smoke Tests → Deploy to Prod → Smoke Tests → Regression
                                ↓                              ↓
                           Rollback if fail                Rollback if fail
```

### Canary Deployment Checks
```yaml
# v1.0.0 → v1.0.1 deployment
Stage 1: 10% traffic → Smoke tests pass → 50% traffic → Smoke tests pass → 100%
Stage 2: Rollback immediately if any smoke test fails
Stage 3: Auto-rollback within 30 seconds of failure detection
```

## Reporting

### Smoke Test Dashboard
| Metric | Target |
|--------|--------|
| Pass rate | 100% |
| Execution time | < 5 min |
| False positive rate | < 1% |
| MTTR for failed smoke tests | < 15 min |

### Failure Alerting
- Notify on-call engineer immediately
- Include deployment details and error logs
- Trigger rollback procedure
- Create incident ticket for root cause analysis
