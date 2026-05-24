# Smoke Test Automation

## Overview

Smoke test automation focuses on speed, reliability, and seamless CI/CD pipeline integration. Every deployment must pass smoke tests automatically before reaching users.

## CI/CD Pipeline Integration

### Pipeline Stage Placement

```
Source → Build → Unit Tests → Deploy → SMOKE TESTS → Regression → Release

                               Rollback ← FAIL ← SMOKE TESTS
                                               → PASS → Continue
```

### Pipeline Configuration (GitHub Actions)

```yaml
# .github/workflows/smoke.yml
name: Smoke Tests
on:
  deployment_status:
    states: [success]

jobs:
  smoke:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: ${{ github.event.deployment.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Run Smoke Tests
        run: |
          npm ci
          npm run test:smoke
        env:
          BASE_URL: ${{ github.event.deployment_status.environment_url }}
          SMOKE_USER_EMAIL: ${{ secrets.SMOKE_USER_EMAIL }}
          SMOKE_USER_PASSWORD: ${{ secrets.SMOKE_USER_PASSWORD }}

      - name: Report Results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const verdict = '${{ job.status }}';
            if (verdict === 'failure' && '${{ github.event.deployment.environment }}' === 'production') {
              await github.rest.repos.createDeploymentStatus({
                ...context.repo,
                deployment_id: context.payload.deployment.id,
                state: 'failure',
                description: 'Smoke tests failed — rollback triggered',
              });
            }
```

### Pipeline Integration Patterns

| Pattern | When to Run | Rollback On Failure |
|---------|-------------|---------------------|
| Post-deploy gate | Immediately after deploy | Automatic |
| Pre-promotion | Before promoting to next env | Block promotion |
| Canary smoke | After canary deploy | Automatic rollback |
| Scheduled smoke | Every N minutes in production | Alert only (no auto-rollback) |

## Parallel Execution

### Worker Strategy for Smoke Tests

```javascript
// playwright.config.ts — Smoke Test Configuration
export default defineConfig({
  testDir: './smoke',
  timeout: 30000,    // 30s per test
  expect: {
    timeout: 10000,  // 10s per assertion
  },
  fullyParallel: true,
  workers: 4,        // 4 parallel workers
  retries: 0,        // NO RETRIES — zero flakiness
  reporter: [
    ['list'],
    ['junit', { outputFile: 'smoke-results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: {
      'x-smoke-test': 'true',  // Identify traffic as smoke test
    },
  },
});
```

### Test Distribution

```
Smoke Suite (8 tests, ~300s total, 5 min budget)
4 workers → ~75s wall-clock time

Worker 1: health-check.spec.ts, auth.spec.ts
Worker 2: product-read.spec.ts, cart-write.spec.ts
Worker 3: search.spec.ts, checkout-basic.spec.ts
Worker 4: notification.spec.ts, api-version.spec.ts
```

## Quick Feedback Loops

### Timing Targets

| Pipeline Stage | Max Duration | Feedback To |
|---------------|--------------|-------------|
| Build | 5 min | Developer |
| Unit tests | 3 min | Developer |
| Deploy | 2 min | DevOps |
| Smoke tests | 5 min | Developer + DevOps |
| → Total deploy-to-verification | 15 min | Team |

### Webhook Notifications

```javascript
// smoke-notifier.js
async function notifySlack(results) {
  const { passed, failed, total, duration } = results;
  const verdict = failed === 0 ? '✅ PASS' : '❌ FAIL';
  const color = failed === 0 ? '#36a64f' : '#ff0000';

  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      attachments: [{
        color,
        title: `Smoke Tests ${verdict}`,
        fields: [
          { title: 'Environment', value: process.env.ENV, short: true },
          { title: 'Version', value: process.env.VERSION, short: true },
          { title: 'Results', value: `${passed}/${total} passed`, short: true },
          { title: 'Duration', value: `${duration}s`, short: true },
        ],
        footer: 'Auto-rollback enabled' + (failed > 0 ? ' — triggered' : ''),
      }],
    }),
  });
}
```

## Smoke vs Sanity Testing

| Dimension | Smoke | Sanity |
|-----------|-------|--------|
| Purpose | Verify build is testable | Verify specific fix/feature works |
| When | Every deployment | After specific fix or change |
| Scope | Critical path, broad | Narrow, focused on changed area |
| Automation | Fully automated | Often manual or semi-automated |
| Frequency | Every build/deploy | After regression test failure fix |
| Duration | < 5 min | < 30 min |
| Depth | Shallow (core working) | Moderate (specific area) |
| Audience | CI/CD pipeline | QA engineer |

### Decision Tree

```
New deployment arrives
  ├── Smoke test (automated)
  │   ├── PASS → Release or continue testing
  │   │          If specific fix: Sanity test
  │   │          If new feature: Regression test
  │   │          If maintenance: Monitor
  │   └── FAIL → Rollback, fix, retry
```

## Test Data Setup

### Minimal Data Strategy

Smoke tests should require minimal test data. Prefer:
1. **Existing production data** (read-only tests): Use existing products, users
2. **Static test data** (seeded once): Data that persists across deployments
3. **API-seeded on demand**: Create minimal data at test start, clean up after

```javascript
// smoke-data.js
const SMOKE_DATA = {
  // Static — created once, used by all smoke runs
  user: {
    email: 'smoke-test@example.com',
    password: process.env.SMOKE_USER_PASSWORD,
    id: 'smoke-user-001',
  },
  product: {
    id: 'smoke-product-001',
    sku: 'SMOKE-TEST-SKU',
    name: 'Smoke Test Product',
    price: 9.99,
  },
};

// API-seeded — fresh data per smoke run
async function seedSmokeData(baseUrl) {
  const response = await fetch(`${baseUrl}/api/test/smoke-seed`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SMOKE_ADMIN_TOKEN}` },
  });
  return response.json();
}

async function cleanupSmokeData(baseUrl) {
  await fetch(`${baseUrl}/api/test/smoke-cleanup`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.SMOKE_ADMIN_TOKEN}` },
  });
}
```

### Test Data Isolation

| Data Type | Isolation Strategy |
|-----------|-------------------|
| Read-only | Shared (any user can see) |
| Auth test | Dedicated smoke user account |
| Write test | Clean up after test |
| Transactional | Test-specific data, delete after |

## Common Smoke Automation Pitfalls

| Pitfall | Impact | Solution |
|---------|--------|----------|
| Tests depend on other tests | Cascading failures | Make each test fully independent |
| Hardcoded environment URLs | Fail when environment changes | Use env variables |
| Complex assertions | Slower, more brittle | Assert only what matters (status, key fields) |
| External API dependencies | Flaky when external API is down | Mock external APIs in smoke |
| UI-only tests | Slow, browser-dependent | Use API tests where possible |
| Tests that modify shared data | Test pollution | Use isolated data or clean up |
| No timeout on assertions | Suite can hang indefinitely | Set timeouts on every assertion |
