# MSW (Mock Service Worker) API Mocking

MSW intercepts network requests at the network layer: a Service Worker in the browser, and request interception in Node.js. Application code calls real `fetch`/`axios`/GraphQL clients unchanged, and the same handlers serve unit/integration tests (Vitest, Jest), Storybook, local development and Playwright. This reference targets MSW 2.x (`http`, `HttpResponse`, `graphql` APIs).

## Install

```bash
npm install msw --save-dev
npx msw init public/ --save     # copies mockServiceWorker.js for browser usage
```

## Handlers

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse, graphql, delay } from 'msw';

type User = { id: string; name: string };
const users: User[] = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];

export const handlers = [
  http.get('/api/users', () => HttpResponse.json(users)),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === params.id);
    return user
      ? HttpResponse.json(user)
      : HttpResponse.json({ title: 'Not found' }, { status: 404 });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as Omit<User, 'id'>;
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),

  http.get('/api/search', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return HttpResponse.json(users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())));
  }),

  graphql.query('GetViewer', () => HttpResponse.json({ data: { viewer: { id: '1', name: 'Alice' } } })),

  http.get('/api/slow', async () => {
    await delay(1500);
    return HttpResponse.json({ ok: true });
  }),
];
```

Path matching supports params (`:id`), wildcards (`*`) and absolute URLs (`https://api.example.com/users`). Query parameters are not part of the matching path; read them from `request.url`.

## Node Setup for Vitest/Jest

```typescript
// src/mocks/node.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/node';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] },
});
```

`onUnhandledRequest: 'error'` fails tests that hit unmocked endpoints, preventing accidental real network calls. Jest with jsdom may need polyfills for `fetch`, `TextEncoder` and streams, or use `jest-fixed-jsdom` as the environment; check MSW's Jest guidance for your versions.

## Per-Test Overrides

```typescript
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { server } from '../mocks/node';
import { UserList } from './UserList';

it('shows an error message when the API fails', async () => {
  // Arrange
  server.use(http.get('/api/users', () => HttpResponse.json({ title: 'Server error' }, { status: 500 })));

  // Act
  render(<UserList />);

  // Assert
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load users/i);
});

it('shows an empty state', async () => {
  // Arrange
  server.use(http.get('/api/users', () => HttpResponse.json([]), { once: true }));

  // Act
  render(<UserList />);

  // Assert
  expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
});
```

Overrides added with `server.use()` are prepended and removed by `resetHandlers()`. `{ once: true }` applies a handler to a single request.

## Simulating Network Conditions

```typescript
http.get('/api/users', () => HttpResponse.error());           // network failure (fetch rejects)
http.get('/api/users', async () => { await delay('infinite'); }); // never resolves: test timeouts/loading
http.get('/api/users', () => new HttpResponse(null, { status: 204 }));
http.get('/api/file', () => new HttpResponse(blob, { headers: { 'Content-Type': 'application/pdf' } }));
```

## Asserting Requests

Prefer asserting on UI outcomes. When you must verify what was sent, capture it inside the handler:

```typescript
let received: unknown;
server.use(http.post('/api/users', async ({ request }) => {
  received = await request.json();
  return HttpResponse.json({ id: '9' }, { status: 201 });
}));
// after interaction
expect(received).toEqual({ name: 'Carol' });
```

Life-cycle events (`server.events.on('request:start', ...)`) are also available for debugging.

## Browser Setup (development, Storybook)

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);

// main.tsx
async function enableMocking() {
  if (import.meta.env.MODE !== 'development' || import.meta.env.VITE_MOCKS !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
enableMocking().then(() => createRoot(document.getElementById('root')!).render(<App />));
```

Dynamic import keeps MSW out of production bundles. Storybook: `msw-storybook-addon` with `initialize()` and per-story `parameters.msw.handlers`.

## Playwright

Options:
- Run the app with the browser worker enabled (mocked dev build) for E2E against deterministic data.
- Use Playwright's own `page.route()` for per-test network control.
- Community integrations (e.g. `@msw/playwright`) let tests reuse MSW handlers; verify package maturity before adopting.

## Keeping Mocks Honest

- Type handlers with the same types as the API client, or generate handlers from OpenAPI (`msw-auto-mock`, Orval, Kubb).
- Build response data with factories (`@mswjs/data` or plain factory functions) instead of copy-pasted JSON.
- Pair with contract tests (Pact or schema validation) so mocks do not drift from the real API.

## Migration Notes from MSW 1.x

| 1.x | 2.x |
|-----|-----|
| `rest.get(path, (req, res, ctx) => res(ctx.json(data)))` | `http.get(path, () => HttpResponse.json(data))` |
| `req.body` | `await request.json()` |
| `ctx.status(500)` | `{ status: 500 }` init |
| `ctx.delay()` | `await delay()` |
| `setupWorker` from `msw` | `setupWorker` from `msw/browser` |

MSW 2 requires Node.js 18+ and TypeScript 4.7+.

## Pitfalls

- Forgetting `resetHandlers()`, leaking overrides between tests.
- Relative URLs in Node without a base URL (configure the client's base URL or use absolute handler URLs).
- Leaving `onUnhandledRequest` as `'bypass'` in tests, letting real requests through.
- Shipping the worker in production builds.

## Checklist

- [ ] Shared handlers for tests, Storybook and dev
- [ ] `onUnhandledRequest: 'error'` in tests; handlers reset after each test
- [ ] Error, empty, slow and network-failure states covered via overrides
- [ ] Typed or generated handlers backed by data factories
- [ ] Worker loaded only in development/mock mode
- [ ] Contract tests guard against mock drift
