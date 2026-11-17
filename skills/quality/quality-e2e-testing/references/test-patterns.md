# Test Patterns

## Page Object Pattern

```typescript
// e2e/pages/checkout.page.ts
import { Page, Locator } from "@playwright/test";

export class CheckoutPage {
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;

  constructor(private page: Page) {
    this.cartItems = page.locator('[data-testid="cart-item"]');
    this.checkoutButton = page.locator('[data-testid="checkout"]');
  }

  async goto() { await this.page.goto("/checkout"); }

  async getItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }
}
```

## Data Fixtures

```typescript
// e2e/fixtures/users.ts
export const users = {
  standard: { email: "user@example.com", password: "Password123!" },
  admin: { email: "admin@example.com", password: "AdminPass456!" },
  noPermissions: { email: "viewer@example.com", password: "Viewer789!" },
};
```

```typescript
// e2e/fixtures/orders.ts
export function createOrder(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    items: [{ productId: "prod-1", quantity: 2 }],
    total: 49.99,
    status: "pending",
    ...overrides,
  };
}
```

## Test Isolation Strategy

| Strategy | Speed | Isolation | Use Case |
|----------|-------|-----------|----------|
| Database reset per suite | Fast | Moderate | Read-only tests |
| Database reset per test | Slow | Full | Write tests |
| API seeding per test | Moderate | Full | Recommended |
| State cleanup in afterEach | Fast | Fragile | Last resort |

Recommended: use `test.beforeEach` to seed data via API calls, then test against that state.

## Parallel Execution Config

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true, // all tests in parallel
  workers: process.env.CI ? 4 : undefined, // 4 workers in CI
});
```

Sharding in CI:
```bash
# Shard 1 of 4
npx playwright test --shard=1/4
```

## Retry Strategy

```typescript
// In config
retries: process.env.CI ? 2 : 0,

// Per test — only when unavoidable
test("flaky test", {
  retries: 3,
  // TODO: fix flakiness — track with issue #123
}, async ({ page }) => { ... });

// Mark known failures
test.fixme("broken feature", async ({ page }) => { ... });
```

## CI Integration (GitHub Actions)

```yaml
e2e-tests:
  timeout-minutes: 15
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job-total }}
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report-shard-${{ matrix.shard }}
        path: playwright-report/
```
