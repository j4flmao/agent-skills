# E2E Anti-Patterns

## 1. Testing Third-Party UIs
**Anti-Pattern**: Logging into Google, clicking the Stripe checkout button, or testing the Github OAuth flow.
**Why**: Their UI changes frequently. Your tests will break.
**Solution**: Mock the OAuth callback API endpoint, or use API contexts to set the authentication cookies directly.

## 2. Using XPath or Brittle CSS Selectors
**Anti-Pattern**: `page.locator('div > div:nth-child(3) > button')`
**Why**: Any layout change breaks the test.
**Solution**: Use user-facing locators. Test what the user sees.
```typescript
// GOOD
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByTestId('submit-btn').click();
```

## 3. Shared State Between Tests
**Anti-Pattern**: Test A creates a user, Test B deletes the user.
**Why**: If Test A fails, Test B crashes. Tests cannot be run in parallel.
**Solution**: Every test must be 100% isolated. Use `test.beforeEach` to set up fresh state or use unique randomly generated IDs per test.
