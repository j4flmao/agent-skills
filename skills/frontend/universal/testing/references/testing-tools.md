# Testing Tools Guide

## Testing Frameworks

| Tool | Type | Best For |
|------|------|----------|
| Vitest | Test runner | Vite projects, fast, ESM-native |
| Jest | Test runner | React projects (CRA), mature ecosystem |
| Playwright | E2E | Cross-browser, modern API, auto-wait |
| Cypress | E2E/Component | Interactive debugging, time travel |
| Testing Library | Utilities | Component testing by user behavior |
| MSW | API mocking | Network-level mocking, no module mocks |

## Vitest Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'json', 'html'], thresholds: { branches: 80, functions: 80, lines: 80 } },
  },
})
```

## Playwright Setup

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
})
```

## Mock Service Worker (MSW)

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])
  }),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: '3', ...body }, { status: 201 })
  }),
]
```

```typescript
// tests/setup.ts
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Coverage Targets

| Type | Coverage | What It Covers |
|------|----------|---------------|
| Unit/Component | 80%+ lines | Individual components, hooks, utils |
| Integration | 50%+ flows | Multi-component interaction |
| E2E | 100% critical paths | User journeys |
| Accessibility | 100% components | axe-core assertions |
