# E2E Testing with Playwright

## Purpose
Write fast, non-flaky end-to-end tests with Playwright Test: each test runs in an isolated browser context, actions auto-wait for actionability, and assertions retry until a timeout. Structure suites so they stay maintainable and parallelize in CI.

Reference for the `quality-e2e-testing` skill (entry point: [../SKILL.md](../SKILL.md)), which owns E2E strategy, flake policy and CI gating. This file keeps Playwright core concepts, test-data rules and CI sharding.

## Key Concepts
- **Browser context**: lightweight, isolated (cookies, storage) — a fresh one per test by default, so tests do not leak state.
- **Auto-waiting**: actions wait for the element to be attached, visible, stable, enabled and receiving events.
- **Web-first assertions**: `await expect(locator).toBeVisible()` retries until the expect timeout (5 s default). Never use `page.waitForTimeout()` for synchronization.

## Config
Same `playwright.config.ts` as [merged-frontend-playwright-testing.md](merged-frontend-playwright-testing.md#config) (setup project + `storageState`, `trace: 'on-first-retry'`, retries 2 in CI, `webServer`).

## Authentication Once, Reused

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```
Add `playwright/.auth` to `.gitignore`; use dedicated test accounts from CI secrets.

## Locator Priority
1. `getByRole('button', { name: 'Checkout' })` — mirrors accessibility tree
2. `getByLabel`, `getByPlaceholder`, `getByText`
3. `getByTestId('cart-total')` (`data-testid`) for elements without accessible names
4. CSS/XPath — last resort; brittle

## Test with Fixture and Mocked Dependency

```typescript
import { test as base, expect } from '@playwright/test';

class CartPage {
  constructor(private readonly page: import('@playwright/test').Page) {}
  async open() { await this.page.goto('/cart'); }
  total() { return this.page.getByTestId('cart-total'); }
  checkout() { return this.page.getByRole('button', { name: 'Checkout' }); }
}

const test = base.extend<{ cart: CartPage }>({
  cart: async ({ page }, use) => { await use(new CartPage(page)); },
});

test('shows shipping estimate from API', async ({ page, cart }) => {
  await page.route('**/api/shipping-estimate', (route) =>
    route.fulfill({ json: { amount: 4.99, currency: 'USD' } }),
  );
  await cart.open();
  await expect(cart.total()).toContainText('$4.99');
  await expect(cart.checkout()).toBeEnabled();
});
```

## Test Data
- Seed via API (`request` fixture) in `beforeEach`/fixtures rather than through the UI.
- Make data unique per test (`test.info().workerIndex`, UUID suffix) so parallel workers do not collide.
- Mock only third parties you do not control; keep at least one journey running against the real backend.

## Debugging
- `npx playwright test --ui` (UI mode), `--debug` (Inspector), `npx playwright codegen <url>`.
- `npx playwright show-trace trace.zip` or the HTML report: DOM snapshots, network, console per step.

## CI Sharding

```yaml
# GitHub Actions matrix
strategy:
  fail-fast: false
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with: { node-version: 22 }
  - run: npm ci
  - run: npx playwright install --with-deps
  - run: npx playwright test --shard=${{ matrix.shard }}
```
Merge shard reports with the `blob` reporter and `npx playwright merge-reports`.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| `waitForTimeout(3000)` | Web-first assertions |
| `expect(await loc.isVisible()).toBe(true)` | `await expect(loc).toBeVisible()` (retries) |
| CSS chains tied to layout | Role/label/test-id locators |
| Logging in through UI in every test | Setup project + `storageState` |
| Tests depending on order | Isolated data per test |
| Retrying to hide flakiness | Inspect traces of retried tests; fix root cause |

## Checklist
- [ ] Critical journeys only (E2E is the top of the pyramid)
- [ ] Auth via setup project
- [ ] No hard waits; web-first assertions
- [ ] Traces on first retry, reports uploaded in CI
- [ ] Sharded/parallel in CI with isolated data

## References
- [E2E skill entry point](../SKILL.md) — E2E strategy and tool selection
- [Visual testing skill](../../visual-testing/SKILL.md) — screenshot comparison
