---
name: e2e-testing
description: >
  Use this skill when the user says 'set up e2e tests', 'playwright vs cypress', 'page object model', 'e2e project structure', 'e2e CI pipeline', 'browser tests for user flows'. It implements an E2E suite: framework selection, project layout, page objects, isolation and API seeding, parallel/sharded CI runs and screenshot assertions, with Playwright as the default for new projects. Do NOT use for: E2E strategy, flakiness policy and journey selection (use quality-e2e-testing), deep Playwright-specific APIs (use qa-e2e-playwright), unit tests (use quality/unit-testing), API-only or contract tests (use quality/integration-testing, quality/contract-testing), load testing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, testing, phase-10]
---

# Quality E2E Testing

## Purpose
Configure and write reliable end-to-end browser tests with framework selection, page objects, parallel execution, and CI integration.

## Agent Protocol

### Trigger
Exact user phrases: "E2E test", "end-to-end", "Playwright", "Cypress", "Selenium", "browser test", "integration test", "user flow test", "test automation", "page object", "test isolation".

### Input Context
Before activating, verify:
- Application type (SPA, SSR, static site, mobile web)
- Target browsers (Chromium, Firefox, WebKit)
- CI platform (GitHub Actions, GitLab CI, Jenkins)
- Existing test framework and coverage

### Output Artifact
E2E testing strategy with framework selection, page object patterns, and CI pipeline configuration.

### Response Format
```yaml
# Framework selection with rationale
# Test structure and page object hierarchy
```
```typescript
// Page object example
// CI pipeline configuration
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Framework selected (Playwright recommended for new projects)
- [ ] Page object model defined for all key pages
- [ ] Test isolation strategy established (per-test state reset)
- [ ] Parallel execution configured (sharding or worker pools)
- [ ] CI pipeline with E2E test stage configured
- [ ] Visual assertions set up (screenshot diff)
- [ ] Test data strategy defined (fixtures, API seeding, factories)

### Max Response Length
200 lines of configuration and test patterns.

## Workflow

### Step 1: Framework Selection
Playwright: cross-browser (Chromium, Firefox, WebKit), native async, network mocking, visual diffing, codegen, auto-wait. Cypress: excellent interactive runner with time-travel debugging and component testing; runs Chrome-family browsers, Firefox and (experimental) WebKit, but executes inside the browser, so multi-tab, multi-origin and native-event scenarios are harder. Selenium: last resort — only if legacy compatibility required. Recommendation: Playwright for new projects.

### Step 2: Project Setup
```bash
npm init playwright@latest
```

Directory structure: `e2e/` with `pages/` (page objects), `fixtures/` (test data), `specs/` (test files), `utils/` (helpers, custom assertions). Global setup file for auth state (login once, reuse across tests).

### Step 3: Page Object Model
```typescript
import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}
  async goto() { await this.page.goto("/login"); }
  async fillEmail(email: string) { await this.page.getByLabel("Email").fill(email); }
  async fillPassword(password: string) { await this.page.getByLabel("Password").fill(password); }
  async submit() { await this.page.getByRole("button", { name: "Sign in" }).click(); }
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
```

### Step 4: Test Isolation
Each test starts with a clean state. Reset database before test run (not per-test if slow). Use `test.beforeEach` for auth + navigation. API-mock external services. Never share page or context between tests. Use `test.describe.serial` only when sequential execution is explicitly required (rare).

### Step 5: Parallel Execution
Playwright: worker pool (default: CPU cores). Sharding in CI: `npx playwright test --shard=1/4`. Each shard runs a subset of tests independently. Test retries: 1–2 retries in CI for flaky tests — but target zero flakiness. Mark flaky tests with `test.fixme()` and track.

### Step 6: CI Integration
```yaml
# GitHub Actions example
- name: Run E2E tests
  run: npx playwright test
  env:
    CI: true
    BASE_URL: ${{ secrets.E2E_BASE_URL }}
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

### Step 7: Visual Assertions
```typescript
await expect(page).toHaveScreenshot("homepage.png", {
  maxDiffPixels: 100,
  threshold: 0.2,
});
```
Store baselines in version control. Update baselines intentionally: `npx playwright test --update-snapshots`.

## E2E Test Examples

### Playwright — Complete Test Suite
```typescript
// e2e/specs/checkout.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { CartPage } from "../pages/CartPage";
import { CheckoutPage } from "../pages/CheckoutPage";

test.describe("Checkout Flow", () => {
  let loginPage: LoginPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);
  });

  test("should complete purchase with valid payment", async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs("customer@example.com", "password123");
    await cartPage.addItemToCart("Wireless Keyboard");
    await cartPage.proceedToCheckout();
    await checkoutPage.fillShippingInfo({
      name: "John Doe",
      address: "123 Main St",
      city: "Portland",
      zip: "97201",
    });
    await checkoutPage.selectPaymentMethod("credit_card");
    await checkoutPage.submitOrder();

    await expect(page.getByTestId("order-confirmation")).toBeVisible();
    await expect(page.getByTestId("order-number")).not.toBeEmpty();
  });

  test("should show validation errors for incomplete form", async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs("customer@example.com", "password123");
    await cartPage.addItemToCart("Wireless Keyboard");
    await cartPage.proceedToCheckout();
    await checkoutPage.submitOrder();

    await expect(page.getByTestId("field-error")).toHaveCount(4);
  });
});
```

### Page Object Pattern
```typescript
// e2e/pages/CheckoutPage.ts
import { Page, Locator } from "@playwright/test";

export class CheckoutPage {
  readonly shippingForm: Locator;
  readonly submitButton: Locator;
  readonly orderConfirmation: Locator;

  constructor(private page: Page) {
    this.shippingForm = page.getByTestId("shipping-form");
    this.submitButton = page.getByTestId("submit-order");
    this.orderConfirmation = page.getByTestId("order-confirmation");
  }

  async fillShippingInfo(info: {
    name: string;
    address: string;
    city: string;
    zip: string;
  }) {
    await this.page.getByTestId("shipping-name").fill(info.name);
    await this.page.getByTestId("shipping-address").fill(info.address);
    await this.page.getByTestId("shipping-city").fill(info.city);
    await this.page.getByTestId("shipping-zip").fill(info.zip);
  }

  async selectPaymentMethod(method: string) {
    await this.page.getByTestId(`payment-${method}`).click();
  }

  async submitOrder() {
    await this.submitButton.click();
  }

  async isOrderConfirmed(): Promise<boolean> {
    return this.orderConfirmation.isVisible();
  }
}
```

### API Mocking in E2E Tests
```typescript
test("should handle payment failure gracefully", async ({ page }) => {
  const checkoutPage = new CheckoutPage(page);
  await page.route("**/api/payments", async (route) => {
    await route.fulfill({
      status: 402,
      contentType: "application/json",
      body: JSON.stringify({ error: "insufficient_funds" }),
    });
  });

  await page.goto("/checkout");
  await checkoutPage.submitOrder();
  await expect(page.getByTestId("payment-error")).toHaveText(
    "Insufficient funds. Please try another payment method."
  );
});
```

### Playwright Global Setup for Auth
```typescript
// e2e/global-setup.ts
import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.getByTestId("email").fill("e2e@example.com");
  await page.getByTestId("password").fill(process.env.E2E_PASSWORD!);
  await page.getByTestId("submit").click();
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
```
Newer Playwright versions also support a `setup` project with `dependencies` (see qa-e2e-playwright), which gives traces and fixtures for the login step; prefer it for new suites.

## CI Pipeline Configuration

### GitHub Actions — E2E Tests
```yaml
name: E2E Tests
on:
  pull_request:
    branches: [main]
    paths:
      - "src/**"
      - "e2e/**"

jobs:
  e2e:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Start app
        run: npm start & npx wait-on http://localhost:3000
      - name: Run E2E tests
        run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: http://localhost:3000
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
```

## E2E Testing Anti-Patterns

### Anti-Pattern: Using CSS Classes for Selectors
CSS classes change frequently for styling and are not reliable test targets. Prefer user-facing locators (`getByRole` with accessible name, `getByLabel`) — they double as an accessibility check; use `data-testid` where no stable accessible name exists or copy changes per locale. Avoid XPath and deep CSS chains (brittle to DOM structure changes).

### Anti-Pattern: Tests Dependent on Order
E2E tests that depend on state created by previous tests are fragile and hard to debug. Each test must set up its own state (via API seeding or UI actions). Use `test.describe.serial` only when absolutely necessary (and document why).

### Anti-Pattern: Waiting with Fixed Timeouts
Using `page.waitForTimeout(3000)` creates flaky tests that either waste time or fail intermittently. Use web-first assertions (`await expect(locator).toBeVisible()`) and `page.waitForResponse` for specific network events. Playwright automatically waits for elements to be visible, enabled, and stable.

### Anti-Pattern: Testing Everything as E2E
Writing E2E tests for every single feature creates a slow, brittle, expensive test suite. Use E2E for critical user journeys only (happy path through main workflows). Test edge cases and error paths at lower levels (unit, integration).

### Anti-Pattern: No Test Data Strategy
E2E tests relying on shared test data or production data are non-deterministic and break when data changes. Use API seeding before each test. Clean up test data in `afterEach`. Use factories with unique generated values.

### Anti-Pattern: Tests Too Broad
E2E tests that cover too many steps in a single test are hard to debug when they fail. A test should cover one user journey. If a journey has 10 steps and step 5 fails, you want to know exactly which step broke.

## E2E Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | Manual browser testing | No automation, no test scripts, relies entirely on manual QA |
| 2: Defined | Basic automation | Selenium/Cypress scripts for critical paths, unmaintained page objects, flaky tests accepted |
| 3: Managed | Structured E2E suite | Playwright/Cypress with page objects, data-testid selectors, parallel execution, CI integration |
| 4: Measured | Reliable E2E gates | Test isolation (API seeding), visual regression, flaky test quarantine, < 1% flake rate, 95%+ reliability |
| 5: Optimized | E2E as release confidence gate | Combined functional + visual + accessibility E2E, automatic baseline updates, predictive test selection, self-healing selectors |

## Performance Considerations

- Keep the full suite short enough to gate merges (many teams target under ~15–20 minutes); prune or move non-critical journeys to nightly runs.
- Sharding scales roughly linearly until setup time (install, app start, seeding) dominates — measure per-shard overhead.
- Retries multiply runtime for failing tests; treat every retried-then-passed test as a flake to fix.
- Seed data through APIs in parallel (`Promise.all`) instead of through the UI.
- Browsers are memory-hungry; size CI runners and `workers` from observed memory use, not CPU count alone.

## E2E Test Data Strategy

```typescript
// e2e/fixtures/seed.ts
import { APIRequestContext } from "@playwright/test";

export async function seedTestData(request: APIRequestContext) {
  const user = await request.post("/api/test/users", {
    data: {
      email: `e2e_${crypto.randomUUID()}@example.com`,
      password: process.env.E2E_SEED_PASSWORD,
      role: "customer",
    },
  });
  const { id: userId, token } = await user.json();

  const product = await request.post("/api/test/products", {
    data: { name: "Test Product", price: 29.99, stock: 100 },
  });
  const { id: productId } = await product.json();

  return { userId, token, productId };
}

export async function cleanupTestData(request: APIRequestContext, ids: { userId: string; productId: string }) {
  const responses = await Promise.all([
    request.delete(`/api/test/users/${ids.userId}`),
    request.delete(`/api/test/products/${ids.productId}`),
  ]);
  for (const res of responses) {
    if (!res.ok()) throw new Error(`Test data cleanup failed: ${res.url()} -> ${res.status()}`);
  }
}
```

## Mobile E2E Testing

```typescript
// playwright.config.ts — mobile project
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "chromium-desktop",
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "safari-mobile",
      use: { ...devices["iPhone 13"] }, // WebKit engine; device descriptors already set isMobile/hasTouch
    },
  ],
});
```

## Rules
- Role/label locators first, `data-testid` as fallback — never styling CSS classes
- One assertion per test (logical assertion — not literal expect call)
- Page objects expose business actions, not UI implementations
- Tests are independent and parallelizable by default
- Global setup for auth — per-test setup for data
- Never use `page.waitForTimeout` for synchronization — use web-first assertions
- Screenshot comparisons: keep the default per-pixel `threshold` (0.2) and tune `maxDiffPixels`/`maxDiffPixelRatio` per page
- Retry flaky tests in CI, but flag and fix them
- API seed data before test, clean up after test — never share test state
- Run E2E tests against dedicated test environment with controlled data
- Tag tests by layer: @smoke, @regression, @visual for selective execution
- Mock external services at the network level — never rely on real third-party APIs
- Target mobile + desktop viewports in CI — responsive E2E coverage
- Keep the merge-gating suite fast (shard, prune, move secondary journeys to nightly)

## References
  - references/cypress-guide.md — Cypress Guide
  - references/e2e-testing-advanced.md — E2e Testing Advanced Topics
  - references/e2e-testing-fundamentals.md — E2e Testing Fundamentals
  - references/framework-selection.md — Framework Selection
  - references/playwright-guide.md — Playwright Guide
  - references/test-patterns.md — Test Patterns
## Handoff
`quality-visual-testing` for visual regression setup alongside E2E tests.
`quality-contract-testing` for API contract verification.
Carry forward: test config, page objects, CI pipeline config.
## Architecture Decision Trees

### Framework Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Application type | Web SPA → Playwright/Cypress | Mobile → Detox/Appium | Platform, dev team language |
| Language preference | JavaScript/TypeScript (common) | Python (Playwright + pytest) | Team expertise, existing codebase |
| CI integration | Cloud service (BrowserStack/Sauce) | Self-hosted (Selenium Grid) | Budget, compliance, scale |
| Reporting | Built-in (Playwright HTML) | Third-party (Allure/ReportPortal) | Team preference, existing toolchain |

### Test Priority Strategy
- Critical user journeys → Always run, block deployment on failure
- Secondary flows → Run nightly, alert on failure
- Edge cases → Run weekly or on demand