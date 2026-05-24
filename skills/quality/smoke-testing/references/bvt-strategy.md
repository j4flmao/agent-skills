# Build Verification Testing (BVT)

## Overview

Build Verification Testing (BVT), also known as smoke testing, is a set of automated tests that verify the most critical functionality of an application immediately after a deployment. BVT determines whether the build is stable enough for further testing or promotion to production.

## BVT Principles

| Principle | Description |
|-----------|-------------|
| Fast | Complete in < 5 minutes |
| Critical | Test only what would cause immediate rollback |
| Deterministic | Zero flakiness — same result every time |
| Independent | No dependencies on other tests |
| Self-validating | Binary pass/fail, no manual interpretation |

## Smoke Suite Design

### Selection Criteria

A test qualifies for the smoke suite if it validates:

1. **Core availability**: Is the app reachable and responding?
2. **Critical authentication**: Can users log in?
3. **Revenue-critical flow**: Can the primary transaction complete?
4. **Core read path**: Can users view/load primary content?
5. **Core write path**: Can users create/save primary data?

### What NOT to Include

- Edge cases (reserved for regression)
- Performance tests (separate pipeline stage)
- Visual regression (separate stage)
- Complex multi-step workflows with many prerequisites
- Tests requiring extensive test data setup
- Tests with external dependency calls that might be slow/unavailable

### Sample Smoke Suite

```javascript
// smoke-tests.spec.js
describe('Build Verification Tests', () => {
  test('BE-001: Health endpoint returns 200', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBeDefined();
  });

  test('BE-002: Main page loads successfully', async () => {
    const response = await fetch(BASE_URL);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('<title>');
    expect(text).toContain('root');
  });

  test('BE-003: User authentication works', async () => {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SMOKE_USER.email,
        password: SMOKE_USER.password,
      }),
    });
    expect(loginResponse.status).toBe(200);
    const { token } = await loginResponse.json();
    expect(token).toBeDefined();

    // Verify authenticated access
    const profileResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(profileResponse.status).toBe(200);
  });

  test('BE-004: Core read operation works', async () => {
    const response = await fetch(`${BASE_URL}/api/products?limit=1`);
    expect(response.status).toBe(200);
    const { products } = await response.json();
    expect(Array.isArray(products)).toBe(true);
  });

  test('BE-005: Core write operation works', async () => {
    const token = await getSmokeUserToken();
    const response = await fetch(`${BASE_URL}/api/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: SMOKE_PRODUCT.id,
        quantity: 1,
      }),
    });
    expect(response.status).toBe(201);
  });
});
```

## Critical Path Coverage

Identify the top 3-5 user journeys that would cause the most business impact if broken:

| Journey | Business Impact | Smoke Test Count |
|---------|----------------|------------------|
| User login | Complete loss of access | 1-2 |
| Product search/view | No revenue if broken | 1-2 |
| Add to cart | No purchases possible | 1-2 |
| Checkout (simplified) | Revenue critical | 2-3 |
| API health | All dependent services affected | 1 |

## Deployment Health Checks

### Health Endpoint Pattern

```json
// GET /health
{
  "status": "healthy",
  "version": "3.2.0-rc.1",
  "uptime": 342,
  "checks": {
    "database": { "status": "healthy", "latency_ms": 4 },
    "redis": { "status": "healthy", "latency_ms": 1 },
    "payment_gateway": { "status": "degraded", "latency_ms": 1200 },
    "queue": { "status": "healthy", "depth": 8 }
  },
  "timestamp": "2026-05-24T10:30:00Z"
}
```

### Health Check Tiers

| Tier | Checks | Failure Action |
|------|--------|---------------|
| L0 (Critical) | HTTP 200, process alive | Immediate rollback |
| L1 (Major) | DB connection, cache, auth service | Block traffic to instance |
| L2 (Minor) | Background job, CDN, external API | Alert, don't block |
| L3 (Info) | Uptime, version, metrics | Log only |

## Canary Smoke Tests

Canary deployments route a small percentage of traffic to the new version. Smoke tests validate the canary before full rollout.

### Canary Test Flow

```
1. Deploy to 1% of instances
2. Run BVT smoke tests against canary instances
   ├── Pass → Increase to 5%, run BVT again
   ├── Fail  → Rollback canary, alert
   └── Degraded → Hold at 1%, investigate
3. 5% BVT passes → Increase to 25%
4. 25% BVT passes → Increase to 100%
```

### Canary Health Check Script

```bash
#!/bin/bash
# canary-smoke.sh
CANARY_URL="$1"
EXPECTED_VERSION="$2"

echo "Running smoke tests against canary: $CANARY_URL"
echo "Expected version: $EXPECTED_VERSION"

# Test 1: HTTP 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CANARY_URL/health")
if [ "$STATUS" != "200" ]; then
  echo "FAIL: Health endpoint returned $STATUS"
  exit 1
fi
echo "PASS: Health endpoint returns 200"

# Test 2: Version matches
VERSION=$(curl -s "$CANARY_URL/health" | jq -r '.version')
if [ "$VERSION" != "$EXPECTED_VERSION" ]; then
  echo "FAIL: Version mismatch. Expected: $EXPECTED_VERSION, Got: $VERSION"
  exit 1
fi
echo "PASS: Version $VERSION matches expected"

# Test 3: Dependencies healthy
DEP_STATUS=$(curl -s "$CANARY_URL/health" | jq -r '.checks.database.status')
if [ "$DEP_STATUS" != "healthy" ]; then
  echo "FAIL: Database health check: $DEP_STATUS"
  exit 1
fi
echo "PASS: Database connection healthy"

echo "All smoke tests passed!"
exit 0
```

## BVT Failure Response

| Failure | Likely Cause | Action | Triage |
|---------|-------------|--------|--------|
| All tests fail | Deployment failed, env down | Rollback immediately | DevOps |
| Auth fails | Session/SSO config, JWT secret | Rollback immediately | Dev + DevOps |
| Read path fails | Database, API, CDN | Rollback | Dev |
| Write path fails | Database write permissions, API | Rollback or feature flag | Dev |
| Single test fails | Specific feature regression | Rollback if critical, investigate otherwise | QA + Dev |

## BVT Timing Budget

```
Total budget: 5 minutes
├── Health check:           30s  (6%)
├── Auth test:              45s  (15%)
├── Core read test:         60s  (20%)
├── Core write test:        60s  (20%)
├── Critical journey 1:     75s  (25%)
├── Critical journey 2:     30s  (10%)
└── Overhead/buffer:        60s  (4%)
```

## Environment-Specific Smoke Suites

| Environment | Tests | Criticality |
|-------------|-------|-------------|
| Development | Health check | Low (fast feedback) |
| Staging | Full smoke: health, auth, read, write | High (gate to production) |
| Production canary | Health, version match, dependency check | Critical (user-facing) |
| Production full | Health, auth, core read (read-only) | Critical (monitoring) |
