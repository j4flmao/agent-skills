# Playwright Network Mocking

## 1. Why Mock in E2E?
E2E tests that hit real third-party APIs (Stripe, Twilio, Github) are slow, cost money, and cause flakiness when the third-party goes down. 
We use Playwright's `page.route()` to intercept and mock these calls at the browser's network layer.

## 2. Basic API Interception
```typescript
test('mocks the fruit API', async ({ page }) => {
  // Intercept the network request
  await page.route('**/api/v1/fruits', async route => {
    const json = [{ name: 'Strawberry', id: 21 }];
    await route.fulfill({ json });
  });

  await page.goto('https://demo.playwright.dev/api-mocking');
  await expect(page.getByText('Strawberry')).toBeVisible();
});
```

## 3. Advanced: Modifying Real Responses
Sometimes you want to let the real API respond, but modify a specific field (e.g., forcing an admin flag).
```typescript
await page.route('**/api/user', async route => {
  const response = await route.fetch(); // Let the real request go through
  const json = await response.json();
  json.isAdmin = true; // Modify the payload
  await route.fulfill({ response, json });
});
```
