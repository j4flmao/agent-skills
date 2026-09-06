# Flaky Test Mitigation

## 1. The Root Cause of Flakiness
Flaky tests pass locally but fail in CI. Causes include:
- Relying on `setTimeout()` instead of DOM events.
- Network latency inconsistencies.
- Animation timings.
- Database state bleeding between tests.

## 2. Auto-Waiting (The Golden Rule)
NEVER use hardcoded waits like `await page.waitForTimeout(5000);`.
Playwright has built-in auto-waiting. It automatically waits for an element to be visible, stable, and receive events before clicking.
```typescript
// BAD: Prone to flakiness
await page.waitForTimeout(2000);
await page.locator('#submit').click();

// GOOD: Playwright waits until the button is ready
await page.locator('#submit').click();
```

## 3. Retries & Trace Viewer
In your `playwright.config.ts`, configure retries for CI and enable the Trace Viewer to debug failures.
```typescript
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'retain-on-failure', // Captures DOM snapshots and network logs on failure
    video: 'on-first-retry',
  },
});
```
