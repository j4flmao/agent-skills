# Elysia Testing

## Test Setup with Bun

```typescript
// test/utils.ts
import { Elysia } from 'elysia'
import { afterAll, beforeAll } from 'bun:test'

let app: Elysia
let baseUrl: string

export async function setupTestApp(router: Elysia) {
  app = router
  const listener = app.listen(0)
  const { port } = listener
  baseUrl = `http://localhost:${port}`
  return { app, baseUrl }
}

export async function teardownTestApp() {
  app?.stop()
}

export { baseUrl }
```

## Unit Testing Routes

```typescript
// test/orders.test.ts
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { setupTestApp, teardownTestApp, baseUrl } from './utils'

const mockApp = new Elysia()
  .get('/api/orders', () => [
    { id: '1', customerId: 'cust-1', total: 99.99 },
  ])
  .post('/api/orders', ({ body }) => body, {
    body: t.Object({
      customerId: t.String(),
      items: t.Array(t.Object({
        sku: t.String(),
        quantity: t.Number(),
      })),
    }),
  })

describe('Orders API', () => {
  beforeAll(async () => {
    await setupTestApp(mockApp)
  })

  afterAll(async () => {
    await teardownTestApp()
  })

  it('GET /api/orders returns order list', async () => {
    const res = await fetch(`${baseUrl}/api/orders`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('customerId')
  })

  it('POST /api/orders creates order', async () => {
    const payload = {
      customerId: 'cust-1',
      items: [{ sku: 'SKU-001', quantity: 2 }],
    }
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.customerId).toBe('cust-1')
  })

  it('POST /api/orders validates body', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(422)
  })
})
```

## Testing with Elysia handle()

```typescript
// Test without server — use handle() directly
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/api/orders', () => [{ id: '1', status: 'pending' }])
  .post('/api/orders', ({ body }) => body, {
    body: t.Object({
      customerId: t.String(),
    }),
  })

describe('Order Routes (direct handle)', () => {
  it('GET returns orders', async () => {
    const req = new Request('http://localhost/api/orders')
    const res = await app.handle(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('POST validates input', async () => {
    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    })
    const res = await app.handle(req)
    expect(res.status).toBe(422)
  })

  it('POST accepts valid input', async () => {
    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: 'cust-1' }),
    })
    const res = await app.handle(req)
    expect(res.status).toBe(200)
  })
})
```

## Testing Error Handling

```typescript
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

const app = new Elysia()
  .onError(({ code, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Resource not found' }
    }
    set.status = 500
    return { error: 'Internal error' }
  })
  .get('/api/orders/:id', ({ params: { id } }) => {
    if (id === 'not-found') {
      throw new Error('NOT_FOUND')
    }
    return { id, status: 'ok' }
  })

describe('Error handling', () => {
  it('returns 404 for not found', async () => {
    const req = new Request('http://localhost/api/orders/not-found')
    const res = await app.handle(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown')
    const res = await app.handle(req)
    expect(res.status).toBe(404)
  })
})
```

## Testing Middleware

```typescript
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

const authMiddleware = (app: Elysia) =>
  app.derive(({ headers, set }) => {
    const token = headers.authorization?.slice(7)
    if (!token) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return { user: { id: 'user-1', role: 'admin' } }
  })

const app = new Elysia()
  .use(authMiddleware)
  .get('/api/protected', ({ user }) => ({ user }))

describe('Auth Middleware', () => {
  it('allows authenticated requests', async () => {
    const req = new Request('http://localhost/api/protected', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await app.handle(req)
    expect(res.status).toBe(200)
  })

  it('rejects unauthenticated requests', async () => {
    const req = new Request('http://localhost/api/protected')
    const res = await app.handle(req)
    expect(res.status).toBe(401)
  })
})
```

## Integration Tests

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'

let app: Elysia
let baseUrl: string

beforeAll(async () => {
  app = new Elysia()
    .use(cors())
    .use(orderRoutes)
    .listen(0)
  baseUrl = `http://localhost:${app.server!.port}`
})

afterAll(() => {
  app.stop()
})

describe('Integration: Full Order Flow', () => {
  it('completes full order lifecycle', async () => {
    // Create order
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderPayload),
    })
    expect(createRes.status).toBe(201)
    const order = await createRes.json()

    // Get order
    const getRes = await fetch(`${baseUrl}/api/orders/${order.id}`)
    expect(getRes.status).toBe(200)

    // Update order status
    const updateRes = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shipped' }),
    })
    expect(updateRes.status).toBe(200)

    // List orders
    const listRes = await fetch(`${baseUrl}/api/orders?page=1&limit=10`)
    expect(listRes.status).toBe(200)
  })
})
```

## Key Points

- Test routes directly with app.handle() for fast tests
- Use dynamic port (0) for parallel test execution
- Test validation, auth, and error handling separately
- Use Bun's built-in test runner with describe/it
- Mock external services with mock functions
- Test both success and error paths for every route
- Use integration tests for full request lifecycle
- Clean up server after each test suite
- Keep test asserts focused on status and response shape
- Test schema validation with invalid inputs
