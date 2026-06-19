# Smoke Testing Fundamentals

## Overview
Smoke testing (also called build verification testing or BVT) runs a minimal set of critical tests to validate that the system is functional enough for further testing. Smoke tests are fast, shallow, and check the most important paths. They act as a gate — if smoke tests fail, the build is rejected without further testing.

## Core Concepts

### Concept 1: Smoke Test Characteristics
- **Fast**: Complete in under 5 minutes (ideally under 2 minutes)
- **Critical**: Test only the most important user flows
- **Shallow**: Verify top-level functionality, not detailed behavior
- **Stable**: Non-flaky, deterministic, run on every deploy
- **Early**: Run first in the CI/CD pipeline, before other tests

### Concept 2: Build Verification Testing (BVT)
BVT validates that a new build is functional enough to deploy. BVT checks: service starts successfully, health endpoints respond, database migrations run, core API returns 200, and static assets load. BVT runs before any other testing.

### Concept 3: Deployment Health Checks
Post-deployment smoke tests verify the deployed system is healthy. These run after deployment completes and before traffic is routed. Health checks include: HTTP 200 on health endpoint, database connectivity, message queue connectivity, external service connectivity, TLS certificate validity.

### Concept 4: Canary Smoke Tests
In canary deployments, smoke tests run against the canary instance before promoting to full production. Canary tests verify: new version handles requests correctly, no increase in error rate, response times within thresholds, and no data integrity issues.

## Framework Selection

| Feature | Custom script | Playwright | k6 | curl + bash |
|---------|--------------|-----------|-----|-------------|
| Speed | Fast (< 1s) | Moderate (2-5s per page) | Fast (< 1s per request) | Fastest |
| Depth | Basic HTTP | Full browser | HTTP/gRPC | Basic HTTP |
| Maintainability | Medium | High | High | Low |
| Reporting | Custom | Built-in | Built-in | Parse output |
| CI integration | Custom | Native | Native | Native |
| Best for | Simple health checks | Full UI smoke | API smoke | Quick ad-hoc checks |

## Implementation Guide

### Step 1: Define Smoke Test Scope
Critical paths that should always work:
```yaml
smoke_tests:
  health:
    - "GET /health — returns 200"
    - "GET /health/ready — indicates database connectivity"
    - "GET /health/live — indicates service is alive"
  core_api:
    - "POST /api/auth/login — authentication works"
    - "GET /api/products — product catalog loads"
    - "POST /api/checkout — checkout initializes"
    - "GET /api/health/db — database migrations complete"
  static:
    - "GET / — homepage loads without errors"
    - "GET /favicon.ico — static assets served"
    - "GET /robots.txt — basic routing works"
```

### Step 2: Write Smoke Tests
```python
# tests/smoke/test_deployment_smoke.py
"""Smoke tests — run immediately after deployment."""
import httpx
import pytest

class TestDeploymentSmoke:
    """Fast health and availability checks."""

    BASE_URL = "https://staging.example.com"

    async def test_health_endpoint(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/health", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "version" in data

    async def test_database_connectivity(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/health/db", timeout=5)
            assert response.status_code == 200
            assert response.json()["db_connected"] is True

    async def test_core_api_response(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/api/products?limit=1", timeout=5)
            assert response.status_code == 200
            assert "products" in response.json()

    async def test_homepage_loads(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/", timeout=5)
            assert response.status_code == 200
            assert "text/html" in response.headers["content-type"]
```

### Step 3: Playwright UI Smoke Test
```typescript
// tests/smoke/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Deployment smoke tests', () => {
  test('homepage loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toHaveLength(0);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="nav-bar"]')).toBeVisible();
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });
});
```

### Step 4: CI Pipeline Integration
```yaml
name: CI
on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  smoke-test:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Start application
        run: npm start &
      - name: Wait for app to be ready
        run: timeout 30 bash -c 'while ! curl -s http://localhost:3000/health; do sleep 1; done'
      - name: Run smoke tests
        run: npx playwright test --project=smoke
        env:
          BASE_URL: http://localhost:3000

  full-test-suite:
    needs: smoke-test
    runs-on: ubuntu-latest
    steps:
      - run: npm test  # Only runs if smoke tests pass
```

## Best Practices
- Keep smoke tests under 5 minutes total execution time
- Test only the most critical paths (less than 10 scenarios)
- Run smoke tests before integration, E2E, or regression tests
- Include health endpoint, database connectivity, and core API
- Use fast HTTP-level tests, not full browser tests for basic health
- Add UI smoke tests for critical page renders
- Fail the pipeline immediately if any smoke test fails
- Monitor smoke test execution time — increases indicate problems
- Run post-deployment smoke tests in production on deployed instances
- Include version verification in smoke tests

## Common Pitfalls
- Smoke tests that take too long (> 10 minutes defeats the purpose)
- Testing implementation details instead of functionality
- Including flaky or non-deterministic checks in the smoke suite
- Not testing database connectivity (migrations can fail silently)
- Over-testing — smoke tests are shallow by design
- Ignoring smoke test failures (they should be critical alarms)
- No version verification (deployed the wrong build)
- Running smoke tests after other tests (defeats the gating purpose)

## Smoke Testing Anti-Patterns

### The Drifting Smoke Suite
Smoke tests that gradually accumulate scenarios until they take 30+ minutes. Keep the smoke suite ruthlessly minimal. When you find yourself adding "just one more" scenario, ask: "Is this truly a build-blocker?"

### The Brittle Health Check
Health endpoints that require database, cache, queue, and 5 external services all to be healthy. In distributed systems, transient failures on non-critical dependencies shouldn't fail the build. Health checks should report dependency status without necessarily failing.

### The Post-Deployment Blind Spot
Deployments that pass CI smoke tests but fail in production because of production-specific configuration (environment variables, secrets, service discovery). Run smoke tests against the actual deployed instances, not just CI artifacts.

## Key Points
- Smoke tests validate the build is functional enough for further testing
- Complete in under 5 minutes with fewer than 10 critical scenarios
- Run first in CI/CD pipeline — gate for all further testing
- Include health endpoint, database connectivity, core API, and basic UI
- Run post-deployment smoke tests against actual deployed instances
- Keep the smoke suite minimal — resist scope creep
- Smoke test failures are build-blocking and require immediate attention
- Use fast HTTP-level checks for speed; add browser checks selectively
