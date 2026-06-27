# React Testing Strategies

A robust testing strategy ensures application stability, reduces regressions, and improves maintainability.

## Table of Contents
1. [Testing Pyramid in React](#testing-pyramid)
2. [React Testing Library (RTL) Best Practices](#react-testing-library)
3. [Accessibility Testing (jest-axe)](#accessibility-testing)
4. [Mocking API Calls (MSW)](#mocking-api-calls-msw)
5. [E2E Testing (Playwright/Cypress)](#e2e-testing)
6. [Visual Regression Testing](#visual-regression-testing)
7. [Snapshot Testing Pros/Cons](#snapshot-testing)

---

## 1. Testing Pyramid in React

- **Unit Tests:** Test pure functions, custom hooks, and isolated UI components.
- **Integration Tests:** Test how components interact with state management, context, and mocked APIs. (Most critical layer for React).
- **E2E Tests:** Test critical user journeys in a real browser against a real or staged backend.

---

## 2. React Testing Library (RTL) Best Practices

RTL encourages testing the application as a user would interact with it, rather than testing implementation details.

### Best Practices:
1. **Query by Accessibility:** Prefer `getByRole`, `getByLabelText`, and `getByText`. Avoid `getByTestId` unless necessary.
2. **Avoid Testing Internal State:** Do not test `state` variables directly; test the UI output that results from state changes.
3. **Use `userEvent` over `fireEvent`:** `userEvent` simulates real browser interactions (like typing, which triggers focus, keydown, keyup, etc.).

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

test('submits the form with user credentials', async () => {
  const mockSubmit = jest.fn();
  render(<LoginForm onSubmit={mockSubmit} />);

  // Setup user event
  const user = userEvent.setup();

  // Find elements by their accessible roles/labels
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const submitBtn = screen.getByRole('button', { name: /log in/i });

  // Simulate user actions
  await user.type(emailInput, 'test@example.com');
  await user.type(passwordInput, 'Password123!');
  await user.click(submitBtn);

  // Assertions
  expect(mockSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'Password123!'
  });
});
```

---

## 3. Accessibility Testing (jest-axe)

Automated accessibility testing catches common a11y violations (e.g., missing ARIA labels, poor contrast).

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Button from './Button';

expect.extend(toHaveNoViolations);

test('Button should not have basic accessibility violations', async () => {
  const { container } = render(<Button aria-label="Close">X</Button>);
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 4. Mocking API Calls (MSW)

Mock Service Worker (MSW) intercepts network requests at the network level (using Service Workers or Node interceptors), allowing you to mock APIs without altering your application code.

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/user', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ id: '1', name: 'John Doe' })
    );
  }),
];

// setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 5. E2E Testing (Playwright / Cypress)

E2E testing validates critical user flows in a real browser environment. Playwright is preferred for its multi-browser support and speed.

```typescript
// example.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test('User can complete checkout', async ({ page }) => {
  await page.goto('http://localhost:3000/products');

  // Add item to cart
  await page.getByRole('button', { name: 'Add to Cart' }).first().click();

  // Navigate to cart
  await page.getByRole('link', { name: 'Cart (1)' }).click();

  // Proceed to checkout
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Assert URL changed
  await expect(page).toHaveURL(/.*checkout/);
  await expect(page.getByText('Order Summary')).toBeVisible();
});
```

---

## 6. Visual Regression Testing

Tools like Chromatic (for Storybook) or Playwright's visual comparisons catch unintended CSS or structural changes.

```typescript
// Playwright Visual Comparison
import { test, expect } from '@playwright/test';

test('Homepage visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixels: 100 });
});
```

---

## 7. Snapshot Testing: Pros and Cons

Snapshot testing captures the serialized DOM of a component and compares it in future runs.

### Pros:
- Extremely fast to write.
- Good for catching unexpected structural changes in heavily used core components (e.g., Icon sets, Buttons).

### Cons:
- Prone to false positives (tests fail on minor, expected changes).
- Developers often blindly update snapshots (`npm test -u`) without verifying the change.
- Does not test behavior or accessibility.

**Recommendation:** Use snapshots sparingly. Prefer RTL behavior-driven tests.

*End of Document*
