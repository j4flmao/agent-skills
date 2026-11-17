# E2E & Component Testing with Playwright

## Purpose
Playwright drives Chromium, Firefox and WebKit with auto-waiting locators and web-first assertions, which removes most sources of flaky tests. This skill writes tests that interact like users (roles, labels, text), isolate state per test, mock only the network edges you do not own, and run fast in CI.

Reference for the `quality-e2e-testing` skill (entry point: [../SKILL.md](../SKILL.md)), which owns E2E strategy, flake policy and CI gating. This file covers Playwright config, auth via setup project, locators, network mocking, fixtures and component testing.

## Config

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## Auth Once, Reuse Everywhere

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const user = process.env.E2E_USER;
  const password = process.env.E2E_PASSWORD;
  if (!user || !password) throw new Error('E2E_USER and E2E_PASSWORD must be set');
  await page.goto('/login');
  await page.getByLabel('Email').fill(user);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```
Add `playwright/.auth` to `.gitignore`.

## A Resilient Test

```ts
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('user can add a product to the cart and see the total', async ({ page }) => {
  // Arrange
  await page.goto('/products/blue-mug');

  // Act
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: /cart/i }).click();

  // Assert
  const row = page.getByRole('row', { name: /Blue mug/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell', { name: '$12.00' })).toBeVisible();
  await expect(page.getByTestId('cart-total')).toHaveText('$12.00');
});
```

## Locator Priority
1. `getByRole(role, { name })` — mirrors accessibility tree; also tests a11y.
2. `getByLabel`, `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`.
3. `getByTestId` (`data-testid`, configurable via `testIdAttribute`) for elements without accessible names.
4. CSS/XPath only as a last resort; never auto-generated class names.

Use `expect(locator).toHaveText/toBeVisible/toHaveURL` (auto-retrying) instead of `expect(await locator.textContent())`. Never use `page.waitForTimeout()` to fix flakiness.

## Network Mocking

```ts
test('shows an error banner when the API fails', async ({ page }) => {
  await page.route('**/api/recommendations', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('could not load recommendations');
});
```
Mock third-party and failure scenarios; keep happy-path journeys hitting the real backend (seeded test environment) at least in one CI stage.

## Fixtures for Test Data

```ts
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';

type Fixtures = { task: { id: string; title: string } };

export const test = base.extend<Fixtures>({
  task: async ({ request }, use) => {
    const res = await request.post('/api/tasks', { data: { title: `task-${Date.now()}` } });
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    await use(task);
    await request.delete(`/api/tasks/${task.id}`); // teardown
  },
});
export { expect };
```

## Component Testing
Playwright component testing (`@playwright/experimental-ct-react`, `-vue`, `-svelte`) is still **experimental**. For component-level tests most teams use Vitest Browser Mode or Testing Library + Vitest/Jest, and keep Playwright for E2E.

```tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('increments on click', async ({ mount }) => {
  const component = await mount(<Counter initial={1} />);
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component.getByRole('status')).toHaveText('2');
});
```

## CI
```yaml
# .github/workflows/e2e.yml (excerpt)
- run: npx playwright install --with-deps
- run: npx playwright test --shard=${{ matrix.shard }}/4
- uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with: { name: playwright-report-${{ matrix.shard }}, path: playwright-report/ }
```
Merge sharded reports with the `blob` reporter and `npx playwright merge-reports`.

## Debugging
- `npx playwright test --ui` (UI mode), `--debug` (inspector), `npx playwright show-trace trace.zip`.
- `npx playwright codegen <url>` to bootstrap locators, then clean them up.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| `page.waitForTimeout(3000)` | Web-first assertions / `waitForResponse` |
| CSS selectors tied to styling classes | Role/label/test-id locators |
| Logging in through UI in every test | Setup project + `storageState` |
| Tests depending on each other's data | Per-test fixtures, unique data |
| Mocking your own backend everywhere | Real backend in at least one suite |
| Retries hiding real flakiness | Track flaky tests, fix root causes |

## Checklist
- [ ] Critical journeys covered across Chromium + WebKit (and Firefox if supported).
- [ ] Auth via setup project and storageState.
- [ ] Only role/label/test-id locators; no fixed sleeps.
- [ ] Traces on first retry; reports uploaded in CI.
- [ ] Tests isolated and parallel-safe.
