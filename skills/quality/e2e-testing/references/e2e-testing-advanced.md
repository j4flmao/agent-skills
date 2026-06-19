# E2E Testing Advanced Topics

## Introduction
Advanced E2E testing covers visual regression testing, mobile emulation, network mocking, performance budgets in E2E, cross-browser/cross-device matrix testing, and integrating E2E into feature-flag-driven deployments.

## Visual Regression Testing
Visual regression detects UI changes that functional assertions miss. Playwright has built-in screenshot comparison:

```typescript
// Visual regression with Playwright
test('homepage visual regression check', async ({ page }) => {
  await page.goto('https://app.example.com');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,  // 1% pixel difference allowed
    threshold: 0.2,  // Color difference threshold
    fullPage: true,  // Capture full scrollable page
  });
});
```

## Network Mocking and API Interception
```typescript
// Mock API responses for reliable E2E tests
test('should show empty cart state', async ({ page }) => {
  await page.route('**/api/cart/**', (route) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    });
  });
  await page.goto('https://app.example.com/cart');
  await expect(page.locator('[data-testid="empty-cart"]')).toBeVisible();
});

test('should handle API error gracefully', async ({ page }) => {
  await page.route('**/api/checkout', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });
  await page.goto('https://app.example.com/checkout');
  await page.click('[data-testid="place-order"]');
  await expect(page.locator('[data-testid="error-toast"]')).toContainText('Something went wrong');
});
```

## Mobile Emulation and Responsive Testing
```typescript
// Playwright config for mobile and tablet testing
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Tablet Chrome',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
```

## Performance Budgets in E2E Tests
```typescript
test('checkout should complete under 5 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('https://app.example.com/checkout');
  await page.fill('[data-testid="card-number"]', '4111111111111111');
  await page.click('[data-testid="pay-now"]');
  await page.waitForURL('**/order-confirmation');
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000);
});
```

## Feature Flag-Aware E2E Testing
```typescript
test.describe('Feature-flagged checkout', () => {
  // Enable feature flag via API before testing
  test.beforeEach(async ({ page }) => {
    await page.goto('https://app.example.com/api/flags/checkout-v2');
    await page.evaluate(() => localStorage.setItem('feature-checkout-v2', 'true'));
  });

  test('new checkout flow with feature flag enabled', async ({ page }) => {
    await page.goto('https://app.example.com/checkout');
    await expect(page.locator('[data-testid="new-checkout"]')).toBeVisible();
    const newCheckout = new NewCheckoutPage(page);
    await newCheckout.completePurchase();
    await expect(page.locator('[data-testid="order-confirmed"]')).toBeVisible();
  });
});
```

## Cross-Browser CI Strategy
```yaml
# Run E2E tests in parallel across browsers
name: Cross-browser E2E
on: [pull_request]
jobs:
  e2e-chromium:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=chromium --shard=${{ matrix.shard }}/4
  e2e-firefox:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=firefox --shard=1/1
  e2e-webkit:
    runs-on: macos-latest  # WebKit requires macOS
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=webkit --shard=1/1
```

## E2E Testing Anti-Patterns
### The Iceberg Anti-Pattern
Too many E2E tests and too few unit/integration tests. The test pyramid balances cost vs. confidence. For every E2E test, have 10 integration tests and 100 unit tests.

### The Timeout Tango
Tests passing locally but timing out in CI. Causes: slower CI runners, network latency, database load. Solution: increase timeouts in CI, use retry logic, run against pre-seeded data.

### The State Leak
Tests that pass in sequence but fail in isolation. Each test must set up its own data. Use `test.describe.configure({ mode: 'parallel' })` to enforce isolation.

## Key Points
- Visual regression detects UI changes functional assertions miss
- Mock APIs in E2E tests for reliable, deterministic testing
- Test responsive design with device emulation across mobile, tablet, desktop
- Add performance assertions to prevent UX regressions
- Integrate feature flags for testing in-progress features
- Use the test pyramid: few E2E tests, more integration tests, many unit tests
- Run matrix of browsers in parallel CI jobs
