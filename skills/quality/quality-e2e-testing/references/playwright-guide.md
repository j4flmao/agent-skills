# Playwright Guide

## Installation

```bash
npm init playwright@latest
# or
pnpm create playwright@latest
# or
npx playwright install
```

## Project Structure

```
e2e/
├── fixtures/
│   └── auth.fixture.ts
├── pages/
│   ├── login.page.ts
│   └── dashboard.page.ts
├── specs/
│   ├── login.spec.ts
│   └── dashboard.spec.ts
├── helpers/
│   └── db.ts
└── playwright.config.ts
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
```

## Page Object Pattern

```typescript
// pages/login.page.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorMessage = page.getByTestId("error-message");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}
```

## Auth Fixture

```typescript
// fixtures/auth.fixture.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

type AuthFixtures = {
  authedPage: import("@playwright/test").Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("test@example.com", "password123");
    await page.waitForURL("/dashboard");
    await use(page);
  },
});

export { expect } from "@playwright/test";
```

## Test Examples

```typescript
// specs/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

test.describe("Login", () => {
  test("successful login redirects to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("user@example.com", "correct-password");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("wrong@example.com", "wrong-password");
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText("Invalid credentials");
  });

  test("prevents brute force after 5 attempts", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    for (let i = 0; i < 5; i++) {
      await loginPage.login("user@example.com", "wrong-password");
    }
    await expect(page.getByText("Account locked. Try again in 15 minutes.")).toBeVisible();
  });
});
```

```typescript
// specs/dashboard.spec.ts
import { test, expect } from "../fixtures/auth.fixture";

test.describe("Dashboard", () => {
  test("displays user metrics", async ({ authedPage }) => {
    await expect(authedPage.getByTestId("revenue-card")).toBeVisible();
    await expect(authedPage.getByTestId("active-users-card")).toBeVisible();
  });

  test("navigation works", async ({ authedPage }) => {
    await authedPage.getByRole("link", { name: "Settings" }).click();
    await expect(authedPage).toHaveURL(/\/settings/);
  });
});
```

## API Testing

```typescript
// specs/api.spec.ts
import { test, expect } from "@playwright/test";

test.describe("API", () => {
  test("GET /api/users returns paginated results", async ({ request }) => {
    const response = await request.get("/api/users?page=1&limit=10");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toHaveLength(10);
    expect(body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: expect.any(Number),
    });
  });

  test("unauthenticated request returns 401", async ({ request }) => {
    const response = await request.get("/api/users");
    expect(response.status()).toBe(401);
  });
});
```

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [deployment_status]
jobs:
  e2e:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          BASE_URL: ${{ github.event.deployment_status.environment_url }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Common Patterns

| Pattern | Code |
|---------|------|
| Wait for network idle | `await page.waitForLoadState("networkidle")` |
| Intercept API | `await page.route("**/api/**", route => route.fulfill({...}))` |
| Test file download | `const [download] = await Promise.all([page.waitForEvent("download"), page.getByText("Export").click()])` |
| Multi-tab | `const [newPage] = await Promise.all([context.waitForEvent("page"), page.getByText("Open link").click()])` |
| Geolocation | `await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522 })` |
| Accessibility | `const snapshot = await page.accessibility.snapshot()` |
