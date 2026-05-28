# QA Test Automation Framework

## Overview

A test automation framework is a set of guidelines, tools, libraries, and best practices that enable efficient creation, execution, and maintenance of automated tests. This reference covers framework architecture, tool selection, design patterns, CI/CD integration, and maintenance strategies for building robust test automation.

## Framework Architecture

### Layered Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       TEST LAYER                                    │
│  Test Cases (data-driven, parameterized)                           │
│  ├── Smoke Tests (critical paths, fast)                           │
│  ├── Functional Tests (feature-level)                             │
│  ├── Integration Tests (service interactions)                     │
│  ├── E2E Tests (user journeys)                                    │
│  └── Regression Tests (full suite, nightly)                       │
├────────────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                                   │
│  Page Objects / API Clients / Service Wrappers                     │
│  └── Encapsulates interaction logic with system under test        │
│      ├── Web: Page Object Model (Playwright/Selenium)             │
│      ├── API: Request builders, response validators               │
│      └── Mobile: Screen Objects (Appium/Detox)                    │
├────────────────────────────────────────────────────────────────────┤
│                      UTILITY LAYER                                  │
│  Test Helpers, Data Factories, Custom Assertions                    │
│  ├── Data generators (faker, factory_bot)                         │
│  ├── Custom matchers and assertions                               │
│  ├── Test data management utilities                               │
│  └── Environment configuration                                    │
├────────────────────────────────────────────────────────────────────┤
│                    FRAMEWORK LAYER                                  │
│  Test Runner, Reporting, Parallel Execution                        │
│  ├── Test runner (Playwright, Pytest, Jest)                       │
│  ├── Reporting (Allure, Playwright reporter)                      │
│  ├── Parallel execution engine                                    │
│  └── CI/CD integration plugins                                    │
├────────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                              │
│  CI Pipeline, Test Environment, Test Data Store                    │
│  ├── CI runners (GitHub Actions, Jenkins)                         │
│  ├── Test containers (Docker, Testcontainers)                     │
│  ├── Test data store (databases, fixtures)                        │
│  └── Artifact storage (test reports, screenshots, logs)           │
└────────────────────────────────────────────────────────────────────┘
```

### Framework Design Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| Maintainability | Tests should be easy to update when the system changes | Page objects, service wrappers, centralized selectors |
| Readability | Tests should read like documentation | BDD-style names, clear assertions, descriptive test data |
| Reliability | Tests should produce consistent results | Proper waits, data isolation, retry logic for flakiness |
| Speed | Tests should execute quickly | Parallel execution, efficient selectors, minimal setup |
| Independence | Tests should not depend on other tests | Each test creates its own data, no shared state |
| Traceability | Tests should map to requirements | Test IDs matching requirement IDs, requirement annotations |
| Debuggability | Failures should be easy to diagnose | Screenshots on failure, video recording, detailed logs |

## Tool Selection Framework

### Decision Matrix

| Requirement | Playwright | Cypress | Selenium | Puppeteer |
|-------------|------------|---------|----------|-----------|
| Browser support | Chromium, Firefox, WebKit | Chromium only | All major | Chromium only |
| Language support | JS, TS, Python, Java | JS, TS | Java, Python, JS, C#, Ruby | JS, TS |
| Parallel execution | Built-in | Paid plan | Third-party | Built-in |
| Network interception | Yes | Yes | Via proxy | Yes |
| Mobile browser | Yes (emulation) | Limited | Yes | Via emulation |
| API testing | Built-in | Via plugin | Separate | Separate |
| Component testing | Yes | Yes | No | No |
| Visual testing | Built-in | Via plugin | Via plugin | Via plugin |
| Auto-waiting | Yes | Yes | Manual | Manual |
| Iframe support | Yes | Limited | Yes | Yes |
| Multi-tab support | Yes | No | Yes | Yes |
| Shadow DOM | Yes | Yes | Yes | Yes |
| CI integration | Excellent | Good | Excellent | Good |
| Community size | Large | Very large | Very large | Large |

### Framework Recommendation by Use Case

| Use Case | Recommended Framework | Rationale |
|----------|----------------------|-----------|
| Modern web app (React/Vue/Angular) | Playwright | Best cross-browser support, auto-waiting, network control |
| Angular app | Cypress or Playwright | Both have excellent Angular support |
| Electron app | Playwright | Built-in Electron support |
| API-heavy testing | Pytest + Requests / Playwright API | Playwright handles both API and UI |
| Mobile web | Playwright | Device emulation, Chrome DevTools Protocol |
| Cross-browser testing | Playwright | WebKit, Firefox, Chromium support |
| Component testing | Playwright or Cypress | Both support component isolation |
| Legacy app with iframes | Selenium or Playwright | Both handle iframes well |
| Performance testing | k6 or Playwright | Playwright has performance APIs |

### Tool Stack Template

```yaml
tool_stack:
  web_automation:
    framework: Playwright
    language: TypeScript
    version: latest
    runner: Playwright Test Runner
    reporters:
      - allure: For rich HTML reports
      - playwright-html: Built-in HTML reporter
      - junit: For CI integration
  api_testing:
    framework: Playwright API / Supertest
    language: TypeScript
    assertions: Chai / built-in expect
  mobile_testing:
    framework: Detox (React Native) / Appium (Native)
    language: JavaScript / Java
    device_farm: BrowserStack / Sauce Labs
  performance:
    framework: k6
    language: JavaScript
    executors: ramping-vus, per-vu-iterations
  test_management:
    tool: TestRail / Xray
    integration: API-based sync
  ci_integration:
    provider: GitHub Actions
    parallel_workers: 4
    test_splitting: Shard by test file
  reporting:
    tool: Allure Framework
    history: Tracked per build
```

## Framework Implementation

### Project Structure

```yaml
test_project:
  root:
    src:
      tests:
        smoke:
          - login.spec.ts
          - checkout.spec.ts
        functional:
          - order-creation.spec.ts
          - order-search.spec.ts
          - payment-processing.spec.ts
        integration:
          - api-contracts.spec.ts
          - database.spec.ts
        e2e:
          - full-purchase-journey.spec.ts
      pages:
        - LoginPage.ts
        - CheckoutPage.ts
        - OrderHistoryPage.ts
        - ProductCatalogPage.ts
      api:
        clients:
          - OrderApiClient.ts
          - PaymentApiClient.ts
        models:
          - OrderRequest.ts
          - OrderResponse.ts
      components:
        - HeaderComponent.ts
        - SearchBarComponent.ts
        - CartSummaryComponent.ts
      data:
        factories:
          - CustomerFactory.ts
          - OrderFactory.ts
          - ProductFactory.ts
        fixtures:
          - customers.json
          - products.json
      utils:
        - DatabaseHelper.ts
        - DataGenerator.ts
        - EmailHelper.ts
        - TestConfig.ts
      assertions:
        - CustomMatchers.ts
        - ResponseValidators.ts
    config:
      - playwright.config.ts
      - test.config.ts
    reports:
      - allure-results/
      - html-report/
    scripts:
      - setup-test-data.sh
      - teardown-env.sh
```

### Page Object Pattern

```typescript
// src/pages/CheckoutPage.ts
import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  private readonly page: Page;
  private readonly emailInput: Locator;
  private readonly nameInput: Locator;
  private readonly addressInput: Locator;
  private readonly cityInput: Locator;
  private readonly zipInput: Locator;
  private readonly countrySelect: Locator;
  private readonly paymentIframe: Locator;
  private readonly submitButton: Locator;
  private readonly orderConfirmation: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#checkout-email');
    this.nameInput = page.locator('#checkout-name');
    this.addressInput = page.locator('#checkout-address');
    this.cityInput = page.locator('#checkout-city');
    this.zipInput = page.locator('#checkout-zip');
    this.countrySelect = page.locator('#checkout-country');
    this.paymentIframe = page.frameLocator('#payment-iframe');
    this.submitButton = page.locator('#submit-order');
    this.orderConfirmation = page.locator('.order-confirmation');
    this.errorMessage = page.locator('.error-message');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/checkout');
  }

  async fillShippingDetails(details: {
    email: string;
    name: string;
    address: string;
    city: string;
    zip: string;
    country: string;
  }): Promise<void> {
    await this.emailInput.fill(details.email);
    await this.nameInput.fill(details.name);
    await this.addressInput.fill(details.address);
    await this.cityInput.fill(details.city);
    await this.zipInput.fill(details.zip);
    await this.countrySelect.selectOption(details.country);
  }

  async fillPaymentDetails(cardNumber: string, expiry: string, cvv: string): Promise<void> {
    await this.paymentIframe.locator('#card-number').fill(cardNumber);
    await this.paymentIframe.locator('#card-expiry').fill(expiry);
    await this.paymentIframe.locator('#card-cvv').fill(cvv);
  }

  async submitOrder(): Promise<void> {
    await this.submitButton.click();
  }

  async getOrderConfirmationText(): Promise<string | null> {
    return this.orderConfirmation.textContent();
  }

  async isErrorDisplayed(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  async getErrorMessage(): Promise<string | null> {
    return this.errorMessage.textContent();
  }
}
```

### API Client Pattern

```typescript
// src/api/clients/OrderApiClient.ts
import { APIRequestContext, expect } from '@playwright/test';

export interface OrderRequest {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
}

export interface OrderResponse {
  orderId: string;
  status: 'confirmed' | 'pending' | 'rejected';
  totalAmount: number;
  estimatedDelivery: string;
}

export class OrderApiClient {
  private readonly request: APIRequestContext;
  private readonly baseUrl: string;
  private authToken: string;

  constructor(request: APIRequestContext, baseUrl: string) {
    this.request = request;
    this.baseUrl = baseUrl;
    this.authToken = '';
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.authToken}`,
    };
  }

  async createOrder(orderData: OrderRequest): Promise<OrderResponse> {
    const response = await this.request.post(`${this.baseUrl}/api/v2/orders`, {
      headers: this.getHeaders(),
      data: orderData,
    });
    expect(response.status()).toBe(201);
    return response.json() as Promise<OrderResponse>;
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    const response = await this.request.get(
      `${this.baseUrl}/api/v2/orders/${orderId}`,
      { headers: this.getHeaders() }
    );
    expect(response.status()).toBe(200);
    return response.json() as Promise<OrderResponse>;
  }

  async listOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<OrderResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const response = await this.request.get(
      `${this.baseUrl}/api/v2/orders?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );
    expect(response.status()).toBe(200);
    return response.json() as Promise<OrderResponse[]>;
  }

  async cancelOrder(orderId: string): Promise<OrderResponse> {
    const response = await this.request.post(
      `${this.baseUrl}/api/v2/orders/${orderId}/cancel`,
      { headers: this.getHeaders() }
    );
    expect(response.status()).toBe(200);
    return response.json() as Promise<OrderResponse>;
  }
}
```

### Data Factory Pattern

```typescript
// src/data/factories/OrderFactory.ts
import { faker } from '@faker-js/faker';

export interface OrderRequest {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
}

export class OrderFactory {
  static createValidOrder(overrides?: Partial<OrderRequest>): OrderRequest {
    return {
      customerId: faker.string.uuid(),
      items: [
        {
          productId: faker.string.alphanumeric(8),
          quantity: faker.number.int({ min: 1, max: 5 }),
        },
      ],
      shippingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
      },
      paymentMethod: 'credit_card',
      ...overrides,
    };
  }

  static createOrderWithMultipleItems(
    itemCount: number = 3
  ): OrderRequest {
    return {
      ...this.createValidOrder(),
      items: Array.from({ length: itemCount }, () => ({
        productId: faker.string.alphanumeric(8),
        quantity: faker.number.int({ min: 1, max: 3 }),
      })),
    };
  }

  static createInvalidOrder(invalidField: keyof OrderRequest): OrderRequest {
    const order = this.createValidOrder();
    switch (invalidField) {
      case 'customerId':
        order.customerId = '';
        break;
      case 'items':
        order.items = [];
        break;
      case 'shippingAddress':
        order.shippingAddress = {
          ...order.shippingAddress,
          zipCode: '',
        };
        break;
    }
    return order;
  }
}
```

### Test Implementation

```typescript
// src/tests/e2e/full-purchase-journey.spec.ts
import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { ProductCatalogPage } from '../../pages/ProductCatalogPage';
import { OrderHistoryPage } from '../../pages/OrderHistoryPage';
import { OrderFactory } from '../../data/factories/OrderFactory';

test.describe('Full Purchase Journey', () => {
  let checkoutPage: CheckoutPage;
  let catalogPage: ProductCatalogPage;
  let orderHistoryPage: OrderHistoryPage;

  test.beforeEach(async ({ page }) => {
    checkoutPage = new CheckoutPage(page);
    catalogPage = new ProductCatalogPage(page);
    orderHistoryPage = new OrderHistoryPage(page);
  });

  test('should complete purchase with valid order', async ({ page }) => {
    const order = OrderFactory.createValidOrder();

    await catalogPage.navigate();
    await catalogPage.searchProduct('wireless mouse');
    await catalogPage.addProductToCart(0);
    await catalogPage.goToCheckout();

    await checkoutPage.fillShippingDetails({
      email: order.customerId + '@test.com',
      name: 'Test User',
      address: order.shippingAddress.street,
      city: order.shippingAddress.city,
      zip: order.shippingAddress.zipCode,
      country: order.shippingAddress.country,
    });

    await checkoutPage.fillPaymentDetails('4111111111111111', '12/28', '123');
    await checkoutPage.submitOrder();

    const confirmation = await checkoutPage.getOrderConfirmationText();
    expect(confirmation).toContain('Order Confirmed');

    const orderId = confirmation?.match(/Order #(\w+)/)?.[1];
    expect(orderId).toBeTruthy();

    await orderHistoryPage.navigate();
    const orderInHistory = await orderHistoryPage.findOrder(orderId!);
    expect(orderInHistory).toBeTruthy();
    expect(await orderInHistory?.getStatus()).toBe('Confirmed');
  });

  test('should show error for invalid payment', async ({ page }) => {
    const order = OrderFactory.createValidOrder();

    await catalogPage.navigate();
    await catalogPage.addProductToCart(0);
    await catalogPage.goToCheckout();

    await checkoutPage.fillShippingDetails({
      email: 'test@test.com',
      name: 'Test User',
      address: order.shippingAddress.street,
      city: order.shippingAddress.city,
      zip: order.shippingAddress.zipCode,
      country: order.shippingAddress.country,
    });

    await checkoutPage.fillPaymentDetails('0000000000000000', '01/20', '000');
    await checkoutPage.submitOrder();

    const hasError = await checkoutPage.isErrorDisplayed();
    expect(hasError).toBeTruthy();

    const errorMessage = await checkoutPage.getErrorMessage();
    expect(errorMessage).toContain('declined');
  });
});
```

### API Test Implementation

```typescript
// src/tests/integration/api-contracts.spec.ts
import { test, expect } from '@playwright/test';
import { OrderApiClient } from '../../api/clients/OrderApiClient';
import { OrderFactory } from '../../data/factories/OrderFactory';

test.describe('Order API Contracts', () => {
  let apiClient: OrderApiClient;

  test.beforeAll(async ({ request }) => {
    apiClient = new OrderApiClient(request, process.env.API_BASE_URL!);
    apiClient.setAuthToken(process.env.AUTH_TOKEN!);
  });

  test('POST /api/v2/orders returns 201 with valid order', async () => {
    const orderData = OrderFactory.createValidOrder();
    const response = await apiClient.createOrder(orderData);

    expect(response.orderId).toBeDefined();
    expect(response.status).toBe('confirmed');
    expect(response.totalAmount).toBeGreaterThan(0);
    expect(response.estimatedDelivery).toBeDefined();
  });

  test('POST /api/v2/orders returns 400 with empty items', async () => {
    const orderData = OrderFactory.createInvalidOrder('items');
    
    await expect(async () => {
      await apiClient.createOrder(orderData);
    }).rejects.toThrow();
  });

  test('GET /api/v2/orders returns paginated results', async () => {
    const orders = await apiClient.listOrders({ page: 1, limit: 10 });
    expect(Array.isArray(orders)).toBeTruthy();
    expect(orders.length).toBeLessThanOrEqual(10);
  });

  test('POST /api/v2/orders/:id/cancel returns updated order', async () => {
    const orderData = OrderFactory.createValidOrder();
    const created = await apiClient.createOrder(orderData);
    const cancelled = await apiClient.cancelOrder(created.orderId);

    expect(cancelled.status).toBe('cancelled');
  });

  test('GET /api/v2/orders/:id returns 404 for non-existent order', async () => {
    await expect(async () => {
      await apiClient.getOrder('non-existent-id');
    }).rejects.toThrow();
  });
});
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-integration-reports
          path: test-reports/

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test --shard=${{ matrix.shard }}/3
        env:
          API_BASE_URL: ${{ vars.API_BASE_URL }}
          AUTH_TOKEN: ${{ secrets.AUTH_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-report-shard-${{ matrix.shard }}
          path: |
            test-results/
            playwright-report/

  api-contracts:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:api-contracts
        env:
          API_BASE_URL: ${{ vars.API_BASE_URL }}
          AUTH_TOKEN: ${{ secrets.AUTH_TOKEN }}

  report:
    needs: [unit-and-integration, e2e, api-contracts]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
      - name: Generate Allure Report
        uses: simple-elf/allure-report-action@v1
        with:
          allure_results: allure-results
          allure_history: allure-history
      - name: Deploy report to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: allure-history
```

### Docker Test Runner

```dockerfile
# Dockerfile.test
FROM mcr.microsoft.com/playwright:v1.45.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx playwright install chrome firefox

ENV NODE_ENV=test
ENV CI=true

CMD ["npx", "playwright", "test", "--reporter=html"]
```

### Parallel Execution Strategy

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['allure-playwright'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'api',
      testDir: './src/tests/integration',
      use: { baseURL: process.env.API_BASE_URL },
    },
  ],
});
```

## Test Maintenance Strategy

### Flaky Test Management

```
Flaky Test Lifecycle:
  1. Detection: CI failure that passes on retry
  2. Isolation: Quarantine — move to separate flaky test suite
  3. Analysis: Root cause investigation (race condition, timing, data dependency)
  4. Fix: Address root cause
  5. Recovery: Move back to main suite after verification period (7 days without flake)
  6. Prevention: Implement guard against similar patterns

Common Flakiness Root Causes:
  - Shared mutable test data (80% of flaky tests)
  - Timing/race conditions (incorrect waits, async operations)
  - Environment dependency (external service unavailability)
  - Test ordering dependency (tests assume prior test state)
  - Browser/device specific issues
  - Dynamic content without proper waits

Flaky Test Tracking:
  - Maintain a flaky test register
  - Tag flaky tests in the framework
  - Track flake rate per test, per suite, per environment
  - Target: < 1% flake rate across entire suite
  - Quarantine limit: Fix or remove within 1 sprint
```

### Test Review Process

```
Test Code Review Checklist:
  [ ] Test names describe the scenario (Given_When_Then style)
  [ ] Tests are independent (no shared state)
  [ ] No hardcoded values (use data factories or config)
  [ ] Proper waits and assertions (not sleep(), no assert true)
  [ ] Error messages are descriptive
  [ ] No test logic duplication (extract helpers)
  [ ] Selectors are resilient (data-testid preferred)
  [ ] Tests clean up their data
  [ ] Test data is realistic but not PII
  [ ] Edge cases are covered (empty, null, boundary)
  [ ] Performance test data is appropriately scaled
  [ ] No commented-out code or skipped tests without reason
```

### Test Refactoring Guidelines

```
When to Refactor:
  - Test is flaky (intermittent failures)
  - Test is slow (> 30s for a single test)
  - Test is fragile (breaks with minor UI changes)
  - Test is duplicated (similar logic in multiple tests)
  - Test is unreadable (developer can't understand intent)

Refactoring Patterns:
  - Extract repeated setup into fixtures
  - Extract page interactions into page objects
  - Replace hardcoded waits with assertions
  - Replace brittle selectors with data-testid
  - Combine redundant tests into parameterized tests
  - Split large tests into focused single-purpose tests

After Refactoring:
  - Run full suite to verify no regression
  - Monitor flake rate post-refactoring
  - Update documentation if behavior changed
```

## Performance Testing Integration

### Performance Test Framework

```javascript
// performance/k6-scripts/order-api-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderCreationTime = new Trend('order_creation_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'],
    order_creation_time: ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';

export default function () {
  group('Order API Performance', () => {
    const payload = JSON.stringify({
      customerId: `perf-test-${__VU}-${__ITER}`,
      items: [
        { productId: 'PROD-001', quantity: 2 },
        { productId: 'PROD-002', quantity: 1 },
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        zipCode: '12345',
        country: 'US',
      },
      paymentMethod: 'credit_card',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.AUTH_TOKEN}`,
      },
    };

    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/v2/orders`, payload, params);
    const duration = Date.now() - startTime;

    orderCreationTime.add(duration);
    errorRate.add(response.status !== 201);

    check(response, {
      'status is 201': (r) => r.status === 201,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
      'has order ID': (r) => JSON.parse(r.body).orderId !== undefined,
    });

    if (response.status === 201) {
      const orderId = JSON.parse(response.body).orderId;
      const getResponse = http.get(
        `${BASE_URL}/api/v2/orders/${orderId}`,
        params
      );
      check(getResponse, {
        'get order status is 200': (r) => r.status === 200,
        'order is confirmed': (r) =>
          JSON.parse(r.body).status === 'confirmed',
      });
    }
  });

  sleep(1);
}
```

## Reporting and Analytics

### Allure Report Integration

```typescript
// allure.config.ts
import { allure } from 'allure-playwright';

export const allureConfig = {
  environment: process.env.TEST_ENV || 'local',
  labels: {
    epic: (feature: string) => allure.epic(feature),
    feature: (story: string) => allure.feature(story),
    severity: (level: string) => allure.severity(level),
  },
  attachments: {
    screenshot: async (page: any) => {
      allure.attachment(
        'screenshot',
        await page.screenshot(),
        'image/png'
      );
    },
    log: (content: string) => {
      allure.attachment('log', content, 'text/plain');
    },
  },
};
```

### Custom HTML Reporter

```typescript
// reporters/CustomReporter.ts
import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class CustomReporter implements Reporter {
  private results: Array<{
    title: string;
    status: string;
    duration: number;
    error?: string;
    project: string;
  }> = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    this.results.push({
      title: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      project: test.parent?.project()?.name || 'unknown',
    });
  }

  onEnd(result: FullResult): void {
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const total = this.results.length;

    const summary = `
Test Run Summary:
  Duration: ${result.duration}
  Total: ${total}
  Passed: ${passed}
  Failed: ${failed}
  Skipped: ${skipped}
  Pass Rate: ${((passed / total) * 100).toFixed(1)}%
    `;

    console.log(summary);
  }
}

export default CustomReporter;
```

## References

- Playwright Documentation — https://playwright.dev/docs/intro
- Cypress Documentation — https://docs.cypress.io/
- Selenium Documentation — https://www.selenium.dev/documentation/
- Allure Framework — https://docs.qameta.io/allure-report/
- Martin Fowler — PageObject pattern description
- Test Automation University — https://testautomationu.applitools.com/
- Google Testing Blog — Best practices for test automation
- k6 Documentation — https://k6.io/docs/
- Docker Documentation — Test containers and CI
- GitHub Actions Documentation — Test workflow patterns
- ISTQB — Test Automation Engineer syllabus
- Fewster & Graham — Software Test Automation
- Crispin & Gregory — Agile Testing
- CODECEPT — Testing framework design patterns
- Applitools — Visual testing best practices
