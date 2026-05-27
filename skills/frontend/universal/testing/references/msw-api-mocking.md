# MSW API Mocking

## Overview

MSW (Mock Service Worker) intercepts network requests at the Service Worker level, enabling realistic API mocking without modifying application code. It works in both browser and Node.js environments, making it ideal for component tests, integration tests, Storybook, and Playwright.

## Setup

### Installation

```bash
npm install msw --save-dev
# or
yarn add msw --dev
# or
pnpm add msw --save-dev
```

### Service Worker Registration (Browser)

For browser-based testing and Storybook:

```bash
npx msw init public/ --save
```

This generates a `mockServiceWorker.js` file in the `public/` directory.

### Vitest Setup (Node)

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  }),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 3, ...body }, { status: 201 })
  }),
]
```

```typescript
// vitest.setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './src/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
  },
})
```

## Handler Patterns

### REST Handlers

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET with URL parameters
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id: Number(id),
      name: 'Alice',
      email: 'alice@example.com',
    })
  }),

  // GET with query parameters
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '10'
    return HttpResponse.json({
      data: [],
      total: 0,
      page: Number(page),
      limit: Number(limit),
    })
  }),

  // POST with request body
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: Date.now(), ...(body as object) },
      { status: 201 }
    )
  }),

  // PUT (full update)
  http.put('/api/users/:id', async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: Number(params.id),
      ...(body as object),
    })
  }),

  // PATCH (partial update)
  http.patch('/api/users/:id', async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: Number(params.id),
      updated: true,
      ...(body as object),
    })
  }),

  // DELETE
  http.delete('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      deletedId: Number(params.id),
    })
  }),
]
```

### GraphQL Handlers

```typescript
import { graphql, HttpResponse } from 'msw'

export const handlers = [
  // GraphQL query
  graphql.query('GetUser', ({ variables }) => {
    const { id } = variables
    return HttpResponse.json({
      data: {
        user: {
          id,
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    })
  }),

  // GraphQL mutation
  graphql.mutation('CreateUser', async ({ variables }) => {
    const { name, email } = variables
    return HttpResponse.json({
      data: {
        createUser: {
          id: '3',
          name,
          email,
        },
      },
    })
  }),

  // GraphQL with errors
  graphql.query('GetUser', () => {
    return HttpResponse.json({
      errors: [
        {
          message: 'User not found',
          extensions: { code: 'NOT_FOUND' },
        },
      ],
    })
  }),
]
```

### Request Handler with Custom Logic

```typescript
import { http, HttpResponse } from 'msw'

interface User {
  id: number
  name: string
  email: string
}

const db: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

export const handlers = [
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('q')?.toLowerCase()
    if (search) {
      const filtered = db.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      )
      return HttpResponse.json(filtered)
    }
    return HttpResponse.json(db)
  }),

  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as Partial<User>
    const newUser: User = {
      id: db.length + 1,
      name: body.name ?? '',
      email: body.email ?? '',
    }
    db.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),
]
```

## Browser vs Node Integration

### Browser Testing

In browser tests, register the service worker:

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

```typescript
// In your app entry or test setup
async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}

enableMocking()
```

### Node Testing

In Node.js (Vitest, Jest, Playwright):

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

## Test Isolation (Per-Test Handlers)

### Global Handlers + Per-Test Overrides

```typescript
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

describe('UserList', () => {
  it('should display users', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([
          { id: 1, name: 'Custom Alice' },
        ])
      })
    )

    render(<UserList />)
    expect(await screen.findByText('Custom Alice')).toBeInTheDocument()
  })

  it('should handle empty state', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([])
      })
    )

    render(<UserList />)
    expect(await screen.findByText(/no users/i)).toBeInTheDocument()
  })
})
```

### Conditional Handlers

```typescript
it('should handle pagination', async () => {
  const page1 = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
  }))

  server.use(
    http.get('/api/users', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page'))
      if (page === 1) {
        return HttpResponse.json({ data: page1, total: 25 })
      }
      return HttpResponse.json({
        data: [{ id: 11, name: 'User 11' }],
        total: 25,
      })
    })
  )

  render(<UserList />)
  expect(await screen.findByText('User 10')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /next/i }))
  expect(await screen.findByText('User 11')).toBeInTheDocument()
})
```

## Network Error Simulation

### Server Errors

```typescript
it('should show error state on 500', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  render(<UserList />)
  expect(await screen.findByText(/server error/i)).toBeInTheDocument()
})
```

### Client Errors

```typescript
it('should show 404 error message', async () => {
  server.use(
    http.get('/api/users/:id', () => {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    })
  )

  render(<UserProfile userId={999} />)
  expect(await screen.findByText(/user not found/i)).toBeInTheDocument()
})
```

### Network Failures

```typescript
it('should handle network failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.error()
    })
  )

  render(<UserList />)
  expect(await screen.findByText(/network error/i)).toBeInTheDocument()
})
```

### Rate Limiting

```typescript
it('should handle rate limit', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      })
    })
  )

  render(<UserList />)
  expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
})
```

## Loading States

### Deferred Responses (Loading State)

```typescript
it('should show loading state while fetching', async () => {
  let resolvePromise!: (value: unknown) => void
  const deferredPromise = new Promise((resolve) => {
    resolvePromise = resolve
  })

  server.use(
    http.get('/api/users', async () => {
      await deferredPromise
      return HttpResponse.json([{ id: 1, name: 'Alice' }])
    })
  )

  render(<UserList />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  resolvePromise(undefined)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
})
```

### Timeout Simulation

```typescript
it('should show timeout error after timeout', async () => {
  server.use(
    http.get('/api/users', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000))
      return HttpResponse.json([])
    })
  )

  render(<UserList timeout={5000} />)
  expect(await screen.findByText(/request timed out/i)).toBeInTheDocument()
})
```

## MSW Lifecycle (Setup/Teardown in Vitest)

### Lifecycle Hooks

```typescript
// vitest.setup.ts — Global setup
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './src/mocks/server'

// Start MSW before all tests
beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'warn',
  })
)

// Reset handlers after each test (restores global handlers, removes overrides)
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())
```

### Lifecycle Flow

```
Test Suite Start
    ↓
server.listen() — Start intercepting requests
    ↓
Test 1
    ├── server.use(customHandler) — Override for this test
    ├── Test makes requests → MSW intercepts
    └── server.resetHandlers() — Restore global handlers
    ↓
Test 2
    ├── Uses default handlers again
    ├── Test makes requests → MSW intercepts
    └── server.resetHandlers()
    ↓
Test N
    └── ...
    ↓
server.close() — Stop intercepting, restore fetch
```

## Mocking External APIs in Storybook

### Storybook Setup

```typescript
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon'
import { handlers } from '../src/mocks/handlers'

initialize()

export const loaders = [mswLoader]

export const parameters = {
  msw: {
    handlers,
  },
}
```

### Story with Custom Handlers

```typescript
// UserList.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { http, HttpResponse } from 'msw'
import { UserList } from './UserList'

const meta: Meta<typeof UserList> = {
  component: UserList,
}

export default meta

type Story = StoryObj<typeof UserList>

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ])
        }),
      ],
    },
  },
}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([])
        }),
      ],
    },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return new Promise(() => {}) // Never resolves — infinite loading
        }),
      ],
    },
  },
}

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
```

## Mocking in Playwright

### Playwright Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
  },
})
```

### Playwright Route Interception (Alternative to MSW)

Playwright has built-in route mocking:

```typescript
// tests/e2e/user-list.spec.ts
import { test, expect } from '@playwright/test'

test('should display users from mocked API', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Mocked Alice' },
      ]),
    })
  })

  await page.goto('/users')
  await expect(page.getByText('Mocked Alice')).toBeVisible()
})

test('should handle API error', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Server error' }),
    })
  })

  await page.goto('/users')
  await expect(page.getByText(/server error/i)).toBeVisible()
})
```

## Request Assertion in Tests

### Asserting Request Details

```typescript
import { http, HttpResponse } from 'msw'

it('should send correct request body', async () => {
  let capturedBody: unknown

  server.use(
    http.post('/api/users', async ({ request }) => {
      capturedBody = await request.json()
      return HttpResponse.json({ id: 1 }, { status: 201 })
    })
  )

  await userEvent.type(screen.getByLabelText(/name/i), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))

  expect(capturedBody).toEqual({ name: 'Alice' })
})
```

### Asserting Request Headers

```typescript
it('should send authorization header', async () => {
  let capturedHeaders: Headers

  server.use(
    http.get('/api/users', ({ request }) => {
      capturedHeaders = request.headers
      return HttpResponse.json([])
    })
  )

  render(<UserList token="test-token" />)
  await screen.findByText(/no users/i)

  expect(capturedHeaders.get('Authorization')).toBe('Bearer test-token')
})
```

## Mocking File Uploads

```typescript
it('should upload file successfully', async () => {
  server.use(
    http.post('/api/upload', async ({ request }) => {
      const formData = await request.formData()
      const file = formData.get('file')
      expect(file).toBeInstanceOf(File)
      return HttpResponse.json({
        url: 'https://cdn.example.com/uploads/test.pdf',
        filename: (file as File).name,
      })
    })
  )

  const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
  const input = screen.getByLabelText(/upload/i)
  await userEvent.upload(input, file)
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))

  expect(await screen.findByText(/uploaded successfully/i)).toBeInTheDocument()
})
```

## Streaming Responses

```typescript
it('should handle streaming response', async () => {
  server.use(
    http.get('/api/stream', () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"progress": 50}\n\n'))
          controller.enqueue(encoder.encode('data: {"progress": 100}\n\n'))
          controller.close()
        },
      })
      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      })
    })
  )

  render(<StreamProgress />)
  expect(await screen.findByText(/50%/)).toBeInTheDocument()
  expect(await screen.findByText(/100%/)).toBeInTheDocument()
})
```

## Pagination with MSW

```typescript
it('should paginate through users', async () => {
  const allUsers = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
  }))

  server.use(
    http.get('/api/users', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') || '1')
      const limit = Number(url.searchParams.get('limit') || '10')
      const start = (page - 1) * limit
      const end = start + limit
      return HttpResponse.json({
        data: allUsers.slice(start, end),
        total: allUsers.length,
        page,
        limit,
        totalPages: Math.ceil(allUsers.length / limit),
      })
    })
  )

  render(<UserList />)
  expect(await screen.findByText('User 1')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /next/i }))
  expect(await screen.findByText('User 11')).toBeInTheDocument()
})
```

## Best Practices

1. **One handler file per domain**: `users.ts`, `products.ts`, `payments.ts`
2. **Use `server.resetHandlers()` after each test** to ensure isolation
3. **Avoid sharing mutable data** between tests — recreate state per test
4. **Use `onUnhandledRequest: 'warn'`** in development to catch missing handlers
5. **Type request and response bodies** for type safety
6. **Mock at the network boundary** — do not mock individual modules alongside MSW
7. **Test error states thoroughly**: 4xx, 5xx, network failure, timeout, rate limit
8. **Use deferred promises** for loading state testing
9. **Keep handlers in a central location** for reuse across test files
10. **Use Storybook's MSW addon** for component-driven development with real API shapes

## Key Points

- MSW intercepts at the Service Worker level, no application code changes needed
- `server.listen()` in `beforeAll`, `server.resetHandlers()` in `afterEach`, `server.close()` in `afterAll`
- Use `server.use()` for per-test handler overrides — automatically cleaned up by `resetHandlers()`
- Test every state: loading, empty, success, error (4xx, 5xx, network failure, timeout, rate limit)
- MSW works in Vitest, Storybook, Playwright, and browser tests
- REST and GraphQL handlers are both supported
- File uploads, streaming responses, and deferred responses are all testable
- Request assertions verify headers, body, and query parameters were sent correctly
- Playwright has built-in route interception as an alternative to MSW in E2E tests
- Centralize handlers for reuse, use per-test overrides for specific scenarios
