# Test Automation Maintenance

## Overview

Test automation requires ongoing maintenance to remain reliable, fast, and valuable. Without active maintenance, automation suites degrade: tests become flaky, execution times grow, and false positives erode trust.

## Page Object Maintenance

### Page Object Pattern

```javascript
// checkout-page.js
class CheckoutPage {
  constructor(page) {
    this.page = page;
    this.cartItems = page.locator('[data-testid="cart-item"]');
    this.couponInput = page.locator('[data-testid="coupon-input"]');
    this.couponApplyBtn = page.locator('[data-testid="apply-coupon"]');
    this.discountLine = page.locator('[data-testid="discount-amount"]');
    this.totalLine = page.locator('[data-testid="cart-total"]');
    this.checkoutBtn = page.locator('[data-testid="checkout-button"]');
  }

  async applyCoupon(code) {
    await this.couponInput.fill(code);
    await this.couponApplyBtn.click();
    await this.page.waitForResponse(/api\/coupon\/apply/);
  }

  async getDiscount() {
    return this.discountLine.textContent();
  }

  async getTotal() {
    return this.totalLine.textContent();
  }

  async proceedToCheckout() {
    await this.checkoutBtn.click();
    await this.page.waitForURL(/\/checkout\//);
  }
}
```

### Maintenance Rules

| Rule | Frequency | Action |
|------|-----------|--------|
| Review selectors | Every sprint | Update data-testid, CSS, or XPath selectors |
| Remove dead locators | Monthly | Delete locators for removed UI elements |
| Split large pages | Quarterly | Break 500+ line page objects into smaller units |
| Audit methods | Monthly | Remove unused methods, update outdated behavior |

## Locator Strategies

### Prioritization (Best to Worst)

| Strategy | Example | Stability | Speed |
|----------|---------|-----------|-------|
| `data-testid` | `[data-testid="checkout-btn"]` | ★★★★★ | ★★★★★ |
| Text content | `text="Submit Order"` | ★★★★ | ★★★★ |
| ARIA label | `[aria-label="Checkout"]` | ★★★★ | ★★★★ |
| Role + name | `role="button" name="Submit"` | ★★★★ | ★★★ |
| CSS selector | `.checkout-button.primary` | ★★★ | ★★★★★ |
| XPath | `//button[@class="checkout"]` | ★★ | ★★★ |
| Index-based | `:nth-child(2)` | ★ | ★★★★★ |

### Best Practices

```javascript
// GOOD: data-testid (stable, intentional)
const submitBtn = page.locator('[data-testid="order-submit"]');

// GOOD: role + accessible name (resilient)
const submitBtn = page.getByRole('button', { name: 'Submit Order' });

// GOOD: text content for dynamic content
const errorMessage = page.getByText('Coupon code is invalid');

// AVOID: fragile CSS class chain
const submitBtn = page.locator('.btn.btn-primary.btn-large.submit-order');

// AVOID: XPath with structural dependencies
const submitBtn = page.locator('//div[3]/form/div[2]/button[1]');
```

### Automatic Locator Health Checks

```javascript
// Run nightly to detect stale locators
async function checkLocatorHealth(page, locators) {
  const results = [];
  for (const [name, locator] of Object.entries(locators)) {
    try {
      await locator.waitFor({ timeout: 2000 });
      results.push({ name, status: 'ok' });
    } catch {
      results.push({ name, status: 'stale' });
    }
  }
  return results;
}
```

## Retry Logic

### When to Retry

| Scenario | Retry? | Strategy |
|----------|--------|----------|
| Network timeout | Yes | 3 retries with exponential backoff |
| Element not found immediately | Yes | 5s polling wait (built-in) |
| Assertion failure due to race condition | No — fix the test | — |
| Feature flag disabled | No — skip conditionally | — |
| Database inconsistency | Yes — reseed and retry | 2 retries max |

### Retry Implementation

```javascript
// retry-helper.js
async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    expectedError = null,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      if (expectedError && !error.message.includes(expectedError)) throw error;

      console.warn(`Attempt ${attempt} failed, retrying...`);
      await sleep(delay * Math.pow(backoff, attempt - 1));
    }
  }
}

// Usage
await withRetry(() => page.locator('[data-testid="notification"]').waitFor(), {
  retries: 3,
  delay: 500,
  backoff: 2,
});
```

### Retry Policy by Test Type

| Test Type | Retries | Rationale |
|-----------|---------|-----------|
| Smoke | 0 | Must be deterministic |
| Critical path | 1 | Flakiness is expensive |
| Full regression | 2 | Balance speed vs reliability |
| UI visual | 1 | Rendering differences on first load |
| API | 0 | Should be deterministic |

## Parallel Execution

### Worker Allocation Strategy

```javascript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : 2,
  fullyParallel: true,
  projects: [
    {
      name: 'critical',
      testMatch: '**/critical/**',
      workers: 2,  // Isolate critical path
    },
    {
      name: 'regression',
      testMatch: '**/regression/**',
      workers: 4,  // Maximize throughput
    },
  ],
});
```

### Test Splitting

```bash
# Split tests by file for balanced workers
npx playwright test --shard=1/4  # Files A-D
npx playwright test --shard=2/4  # Files E-H
npx playwright test --shard=3/4  # Files I-L
npx playwright test --shard=4/4  # Files M-Z
```

### Shared State in Parallel Execution

| State Type | Strategy |
|-----------|----------|
| Database | Isolated schemas or test containers |
| Authentication | Per-worker tokens, rotated on 401 |
| File uploads | Temp directories per worker |
| API mocks | Worker-level mock servers |
| Feature flags | Set in beforeAll per-worker |

## Test Data Management

### Data Strategies

| Strategy | Best For | Maintenance |
|----------|----------|-------------|
| API seeding | Fast, independent tests | Seed scripts per suite |
| Database fixtures | Complex data relationships | Version-controlled SQL/JSON |
| UI creation | End-to-end flows | Slow but realistic |
| Synthetic generators | Randomized data | Need seed for reproducibility |
| Production anonymized | Realistic scenarios | Anonymization pipeline |

### Seeding Best Practice

```javascript
// test-data/seeds/checkout-seed.js
export async function seedCheckoutData(db) {
  // Create user
  const user = await db.user.create({
    email: 'test-checkout@example.com',
    name: 'Test User',
    address: {
      street: '123 Test St',
      city: 'Portland',
      state: 'OR',
      zip: '97201',
    },
  });

  // Create products in stock
  const product = await db.product.create({
    name: 'Regression Test Product',
    price: 29.99,
    inventory: 100,
  });

  // Apply coupon
  const coupon = await db.coupon.create({
    code: 'TEST10',
    type: 'percentage',
    value: 10,
    minPurchase: 20,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return { user, product, coupon };
}
```

### Data Cleanup

```javascript
afterAll(async () => {
  // Clean up test data
  await db.user.deleteMany({ where: { email: { contains: 'test-' } } });
  await db.product.deleteMany({ where: { name: { contains: 'Regression Test' } } });
  await db.coupon.deleteMany({ where: { code: { startsWith: 'TEST' } } });
});
```

## Automation Maintenance Sprint Cycle

| Week | Activity |
|------|----------|
| 1 | Run full suite audit — identify slow, flaky, redundant tests |
| 2 | Fix top 5 flaky tests, update stale locators, remove dead code |
| 3 | Optimize 3 slowest tests, improve data seeding, add retry logic |
| 4 | Review and update page objects, run coverage analysis, report metrics |

## Common Maintenance Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| "Just add wait" | Tests slow, flaky | Use proper wait strategies (waitFor, not sleep) |
| Copy-paste locators | Duplicate, inconsistent locators | Centralize in page objects |
| One giant test file | Hard to maintain, slow to execute | Split by feature |
| Too many retries | False confidence, slow execution | Fix root cause, don't mask with retries |
| No test data cleanup | Leaking state across tests | Isolate data per test |
| Ignoring flaky tests | Noise drowns real failures | Quarantine immediately |
