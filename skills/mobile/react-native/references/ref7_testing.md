# React Native Testing Recipes

Concrete recipes for the hard parts of React Native testing: Jest configuration, mocking native modules and navigation, network mocking with MSW, async UI assertions, and E2E with Maestro and Detox. The overall strategy (pyramid, coverage targets) is in `testing.md`.

## Jest Setup

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',               // or 'react-native' for bare apps
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@shopify/flash-list))',
  ],
};
```

```ts
// test/setup.ts
import 'react-native-gesture-handler/jestSetup';
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
```

React Native Testing Library (RNTL) v12.4+ ships built-in Jest matchers (`toBeOnTheScreen`, `toHaveTextContent`, `toBeDisabled`), so `@testing-library/jest-native` is no longer needed.

## Render Helper with Providers

```tsx
// test/render.tsx
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
```

Create a new `QueryClient` per test so cache never leaks between tests.

## Component Test (AAA)

```tsx
import { screen, userEvent } from '@testing-library/react-native';

it('submits the login form with entered credentials', async () => {
  // Arrange
  const onSubmit = jest.fn();
  const user = userEvent.setup();
  renderWithProviders(<LoginForm onSubmit={onSubmit} />);

  // Act
  await user.type(screen.getByLabelText('Email'), 'a@example.com');
  await user.type(screen.getByLabelText('Password'), 'pw-for-test');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));

  // Assert
  expect(onSubmit).toHaveBeenCalledWith({ email: 'a@example.com', password: 'pw-for-test' });
});

it('shows a validation error for an empty email', async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm onSubmit={jest.fn()} />);

  await user.press(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByText('Email is required')).toBeOnTheScreen();
});
```

Query priority: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`. Role queries double as accessibility checks.

## Network Mocking with MSW

```ts
// test/server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('https://api.example.com/orders', () =>
    HttpResponse.json([{ id: 'o1', status: 'paid', total_cents: 1200, currency: 'EUR' }])),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```tsx
it('renders an error state when the API fails', async () => {
  server.use(http.get('https://api.example.com/orders', () => new HttpResponse(null, { status: 500 })));
  renderWithProviders(<OrdersScreen />);
  expect(await screen.findByText('Could not load orders')).toBeOnTheScreen();
});
```

MSW 2 intercepts Node's global `fetch` (Node 18+). If your HTTP client or Jest environment uses a different transport, check the MSW docs for the matching interceptor setup.

## Mocking Native Modules

```ts
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    deleteItemAsync: jest.fn(async (k: string) => { store.delete(k); }),
  };
});
```

Wrap native modules behind your own service (e.g. `shared/lib/secureStorage.ts`) and mock that instead of every library.

## Navigation

- Expo Router: `renderRouter` from `expo-router/testing-library` with a mock file map, then assert `expect(screen).toHavePathname('/orders/1')`.
- React Navigation: render the real navigator inside `NavigationContainer` for integration tests; for unit tests pass a mocked `navigation` prop or mock `useNavigation`.

## Timers and Async

- Prefer `findBy*` / `waitFor` over manual timers.
- With `jest.useFakeTimers()`, pass `advanceTimers: jest.advanceTimersByTime` to `userEvent.setup`.
- Do not wrap RNTL calls in `act` manually; the library does it.

## Hooks

```ts
import { renderHook, waitFor } from '@testing-library/react-native';

const { result } = renderHook(() => useOrders('paid'), { wrapper: QueryWrapper });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

## E2E with Maestro

```yaml
# .maestro/login.yaml
appId: com.example.app
---
- launchApp:
    clearState: true
- tapOn: "Email"
- inputText: "e2e@example.com"
- tapOn: "Password"
- inputText: ${E2E_PASSWORD}
- tapOn: "Sign in"
- assertVisible: "Orders"
```

Run: `maestro test .maestro/` (pass secrets with `-e E2E_PASSWORD=...` from CI secrets). Maestro is black-box and tolerant of timing; add `testID`/`accessibilityLabel` for stable selectors.

## E2E with Detox

Detox synchronises with the RN JS thread, network and animations (gray-box), which reduces flakes for complex apps.

```ts
describe('Login', () => {
  beforeAll(async () => { await device.launchApp({ newInstance: true }); });

  it('signs in', async () => {
    await element(by.id('email')).typeText('e2e@example.com');
    await element(by.id('password')).typeText(process.env.E2E_PASSWORD!);
    await element(by.id('sign-in')).tap();
    await expect(element(by.text('Orders'))).toBeVisible();
  });
});
```

Build release-like binaries for Detox in CI (`detox build -c android.emu.release`).

## Flake Control

- Seed test data through the API before each E2E flow; never depend on previous tests.
- Disable animations on emulators (`adb shell settings put global animator_duration_scale 0`, plus window/transition scales).
- Retries are a diagnostic tool; track flaky tests and fix them.

## Checklist

- [ ] Jest preset and `transformIgnorePatterns` handle RN packages
- [ ] Fresh QueryClient per test; MSW with `onUnhandledRequest: 'error'`
- [ ] Native modules mocked via service wrappers
- [ ] Tests follow Arrange-Act-Assert and query by role/label
- [ ] Error, empty and loading states tested, not only happy paths
- [ ] E2E flows on release builds in CI with seeded data
