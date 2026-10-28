# Elysia Testing

Testing Elysia apps with Bun's built-in runner: in-process tests via `app.handle()`, type-safe tests via Eden Treaty, plugin/guard tests, error-handler tests, and real-server integration tests. Examples target Elysia 1.x on Bun.

## Choosing a Level

| Level | Tool | Network | Use for |
|-------|------|---------|---------|
| Route unit | `app.handle(new Request(...))` | none | status codes, validation, handlers |
| Typed route | Eden Treaty `treaty(app)` | none (calls `handle`) | contract-level checks with inferred types |
| Plugin | mount plugin on a throwaway `new Elysia()` | none | derive/resolve/guards/hooks |
| Integration | `app.listen(0)` + `fetch` | loopback | CORS, streaming, WebSocket, real DB |

`app.handle` requires a fully qualified URL: `new Request('http://localhost/orders')`, not `'/orders'`.

## App Factory (dependency injection for tests)

Build the app in a function so tests can inject fakes instead of module-level singletons.

```ts
// src/app.ts
import { Elysia, t } from 'elysia'

export interface OrderRepo {
  list(): Promise<Array<{ id: string; customerId: string; total: number }>>
  get(id: string): Promise<{ id: string; customerId: string; total: number } | null>
  create(input: { customerId: string; items: { sku: string; quantity: number }[] }): Promise<{ id: string; customerId: string }>
}

export const createApp = (repo: OrderRepo) =>
  new Elysia({ prefix: '/api' })
    .get('/orders', () => repo.list())
    .get('/orders/:id', async ({ params: { id }, status }) => {
      const order = await repo.get(id)
      if (!order) return status(404, { error: 'Order not found' })
      return order
    })
    .post(
      '/orders',
      async ({ body, set }) => {
        set.status = 201
        return repo.create(body)
      },
      {
        body: t.Object({
          customerId: t.String({ minLength: 1 }),
          items: t.Array(t.Object({ sku: t.String(), quantity: t.Integer({ minimum: 1 }) }), { minItems: 1 }),
        }),
      },
    )

export type App = ReturnType<typeof createApp>
```

`status(code, body)` is the context helper for typed non-2xx responses in current Elysia; older 1.x releases exposed the same thing as `error(code, body)`.

## Route Tests with `app.handle`

```ts
// test/orders.test.ts
import { describe, expect, it, mock } from 'bun:test'
import { createApp, type OrderRepo } from '../src/app'

const fakeRepo = (): OrderRepo => ({
  list: mock(async () => [{ id: '1', customerId: 'cust-1', total: 99.99 }]),
  get: mock(async (id: string) => (id === '1' ? { id: '1', customerId: 'cust-1', total: 99.99 } : null)),
  create: mock(async (input) => ({ id: 'new-1', customerId: input.customerId })),
})

const json = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('orders routes', () => {
  it('lists orders', async () => {
    // Arrange
    const app = createApp(fakeRepo())
    // Act
    const res = await app.handle(new Request('http://localhost/api/orders'))
    // Assert
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: '1', customerId: 'cust-1', total: 99.99 }])
  })

  it('returns 404 for a missing order', async () => {
    const app = createApp(fakeRepo())
    const res = await app.handle(new Request('http://localhost/api/orders/missing'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Order not found' })
  })

  it('creates an order with 201', async () => {
    const repo = fakeRepo()
    const app = createApp(repo)
    const res = await app.handle(json('/api/orders', { customerId: 'cust-1', items: [{ sku: 'A', quantity: 2 }] }))
    expect(res.status).toBe(201)
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['empty body', {}],
    ['zero quantity', { customerId: 'c', items: [{ sku: 'A', quantity: 0 }] }],
    ['no items', { customerId: 'c', items: [] }],
  ])('rejects %s with 422', async (_name, payload) => {
    const repo = fakeRepo()
    const app = createApp(repo)
    const res = await app.handle(json('/api/orders', payload))
    expect(res.status).toBe(422)
    expect(repo.create).not.toHaveBeenCalled()
  })
})
```

Elysia answers schema validation failures with 422 and unknown routes with 404 without any custom handler.

## Typed Tests with Eden Treaty

```ts
// test/orders.eden.test.ts
import { describe, expect, it } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { createApp } from '../src/app'

const api = treaty(createApp({
  list: async () => [],
  get: async () => null,
  create: async (i) => ({ id: 'x', customerId: i.customerId }),
}))

describe('orders via eden', () => {
  it('creates', async () => {
    const { data, error, status } = await api.api.orders.post({
      customerId: 'c1',
      items: [{ sku: 'A', quantity: 1 }],
    })
    expect(error).toBeNull()
    expect(status).toBe(201)
    expect(data?.id).toBe('x')
  })

  it('surfaces 404 as error', async () => {
    const { error } = await api.api.orders({ id: 'nope' }).get()
    expect(error?.status).toBe(404)
  })
})
```

Passing the app instance (not a URL) makes Eden call `app.handle` directly, so no port is opened. A renamed route or changed body schema becomes a type error in the test file.

## Testing Error Handlers

Custom errors need a registered code so `onError` can match them.

```ts
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

class PaymentDeclined extends Error {
  constructor(public reason: string) { super('Payment declined') }
}

const app = new Elysia()
  .error({ PaymentDeclined })
  .onError(({ code, error, set }) => {
    if (code === 'PaymentDeclined') {
      set.status = 402
      return { error: error.message, reason: error.reason }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Route not found' }
    }
  })
  .post('/pay', () => { throw new PaymentDeclined('insufficient_funds') })
  .get('/boom', () => { throw new Error('unexpected') })

describe('error handling', () => {
  it('maps a domain error to 402', async () => {
    const res = await app.handle(new Request('http://localhost/pay', { method: 'POST' }))
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: 'Payment declined', reason: 'insufficient_funds' })
  })

  it('maps unknown routes to 404', async () => {
    const res = await app.handle(new Request('http://localhost/nope'))
    expect(res.status).toBe(404)
  })

  it('returns 500 for unhandled errors', async () => {
    const res = await app.handle(new Request('http://localhost/boom'))
    expect(res.status).toBe(500)
  })
})
```

Throwing a plain `new Error('NOT_FOUND')` does not set `code` to `NOT_FOUND`; use `NotFoundError` from `elysia`, `status(404)`, or a registered custom error.

## Testing Auth Plugins

A `derive` that only sets `set.status = 401` does not stop the handler. Short-circuit in `beforeHandle` (or a `resolve` that returns `status(...)`), and export the plugin with a scope so it applies to the parent.

```ts
// src/auth.ts
import { Elysia } from 'elysia'

export const auth = (verify: (token: string) => Promise<{ id: string; role: string } | null>) =>
  new Elysia({ name: 'auth' })
    .resolve({ as: 'scoped' }, async ({ headers }) => {
      const header = headers.authorization
      const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
      return { user: token ? await verify(token) : null }
    })
    .onBeforeHandle({ as: 'scoped' }, ({ user, status }) => {
      if (!user) return status(401, { error: 'Unauthorized' })
    })
```

```ts
// test/auth.test.ts
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { auth } from '../src/auth'

const app = new Elysia()
  .use(auth(async (t) => (t === 'good' ? { id: 'u1', role: 'admin' } : null)))
  .get('/me', ({ user }) => user)

const get = (headers: Record<string, string> = {}) =>
  app.handle(new Request('http://localhost/me', { headers }))

describe('auth plugin', () => {
  it('passes a valid token', async () => {
    const res = await get({ authorization: 'Bearer good' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'u1', role: 'admin' })
  })

  it.each([[{}], [{ authorization: 'Bearer bad' }], [{ authorization: 'Basic abc' }]])(
    'rejects %o with 401',
    async (headers) => {
      expect((await get(headers)).status).toBe(401)
    },
  )
})
```

Without `{ as: 'scoped' }` (or `'global'`), lifecycle hooks registered inside a named plugin stay local to that plugin instance and never run for the parent's routes.

## Integration Tests with a Real Server

```ts
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { cors } from '@elysiajs/cors'
import { createApp } from '../src/app'
import { createPgRepo } from '../src/pg-repo'

let app: ReturnType<typeof createApp>
let baseUrl: string

beforeAll(() => {
  const dbUrl = process.env.TEST_DATABASE_URL
  if (!dbUrl) throw new Error('TEST_DATABASE_URL is required for integration tests')
  app = createApp(createPgRepo(dbUrl)).use(cors({ origin: 'https://app.example.com' }))
  app.listen(0) // random free port
  baseUrl = `http://localhost:${app.server!.port}`
})

afterAll(async () => {
  await app.stop()
})

describe('order lifecycle', () => {
  it('creates then reads an order', async () => {
    const created = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId: 'c1', items: [{ sku: 'A', quantity: 1 }] }),
    })
    expect(created.status).toBe(201)
    const { id } = await created.json()

    const read = await fetch(`${baseUrl}/api/orders/${id}`)
    expect(read.status).toBe(200)
  })

  it('answers CORS preflight', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'OPTIONS',
      headers: { origin: 'https://app.example.com', 'access-control-request-method': 'POST' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com')
  })
})
```

Run each integration file against an isolated schema or a disposable container (Testcontainers, a per-run database) and truncate between tests.

## Bun Test Runner Notes

| Need | Bun feature |
|------|-------------|
| Mocks/spies | `mock()`, `spyOn()` from `bun:test` |
| Module mocking | `mock.module('./path', () => ({ ... }))` |
| Table tests | `it.each([...])` |
| Coverage | `bun test --coverage` |
| Watch | `bun test --watch` |
| Filter | `bun test -t "orders"` |
| Global setup | `preload` in `bunfig.toml` `[test]` section |

## Pitfalls

- Missing `import { t } from 'elysia'` in schema examples.
- Sharing one app instance with mutable fakes across tests; build a fresh app per test or reset mocks.
- Asserting only status codes; also assert body shape and that side effects did (or did not) happen.
- Leaving servers open: always `await app.stop()` in `afterAll`.
- Testing a plugin without the scope it ships with; tests then pass while production routes are unprotected.

## Checklist

- [ ] App built by a factory with injected dependencies
- [ ] Validation, 404, 401/403 and 5xx paths covered
- [ ] Eden Treaty tests for public contracts
- [ ] Plugin hooks tested through a parent app
- [ ] Integration tests use port 0, isolated data and `stop()`
