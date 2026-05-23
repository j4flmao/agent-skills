# Hono Middleware Guide

## Middleware Pipeline

### Built-in Middleware

| Middleware | Import | Purpose |
|---|---|---|
| **cors** | `hono/cors` | CORS headers |
| **logger** | `hono/logger` | HTTP request logging |
| **etag** | `hono/etag` | ETag header |
| **pretty-json** | `hono/pretty-json` | Pretty-printed JSON |
| **secure-headers** | `hono/secure-headers` | Security headers |
| **timeout** | `hono/timeout` | Request timeout |
| **compress** | `hono/compress` | Gzip/brotli compression |
| **csrf** | `hono/csrf` | CSRF protection |
| **ip-restriction** | `hono/ip-restriction` | IP whitelist/blacklist |
| **jwt** | `hono/jwt` | JWT verification |

### Custom Middleware

```typescript
import { createMiddleware } from 'hono/factory'
import type { MiddlewareHandler } from 'hono'

// Request ID middleware
export const requestId: MiddlewareHandler = async (c, next) => {
  const id = crypto.randomUUID()
  c.set('requestId', id)
  c.header('X-Request-Id', id)
  await next()
}

// Timing middleware
export const timing: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  c.header('X-Response-Time', `${ms}ms`)
}
```

### Pipeline Ordering

Recommended order:
1. `cors` — CORS headers before everything
2. `secure-headers` — security headers
3. `requestId` — request identification
4. `logger` — HTTP logging
5. `timeout` — request timeout
6. `auth` — authentication (custom)
7. `errorHandler` — global error handler

```typescript
app.use('*', cors())
app.use('*', secureHeaders())
app.use('*', requestId)
app.use('*', logger())
app.use('*', timeout(30000))
app.use('/api/*', authMiddleware)
app.onError(errorHandler)
```

### Per-Route Middleware

```typescript
// Middleware applied to specific routes
app.get('/admin', adminOnly, (c) => c.text('Admin'))
app.post('/api/orders', validateOrder, rateLimit, createOrder)

// Group middleware
const api = new Hono()
api.use('*', authMiddleware)
api.use('*', rateLimit)
app.route('/api', api)
```

## Validation (Zod)

### Basic Validation

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const OrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
})

app.post('/orders', zValidator('json', OrderSchema), async (c) => {
  const data = c.req.valid('json')
  return c.json(data, 201)
})
```

### Validation Targets

| Target | Validator | description |
|---|---|---|
| `'json'` | `zValidator('json', schema)` | Request body |
| `'query'` | `zValidator('query', schema)` | Query parameters |
| `'param'` | `zValidator('param', schema)` | Path parameters |
| `'header'` | `zValidator('header', schema)` | Headers |
| `'cookie'` | `zValidator('cookie', schema)` | Cookies |
| `'form'` | `zValidator('form', schema)` | Form data |

### Multiple Validators

```typescript
app.patch(
  '/orders/:id',
  zValidator('param', OrderParamsSchema),
  zValidator('json', PartialOrderSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    return c.json(await updateOrder(id, data))
  }
)
```

### Validation Error Handling

```typescript
import { z } from 'zod'
import type { ValidationTargets } from 'hono'
import { zValidator } from '@hono/zod-validator'

export function zValidatorSafe<T extends ZodSchema>(
  target: keyof ValidationTargets,
  schema: T
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({
        code: 'VALIDATION_ERROR',
        errors: result.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        }))
      }, 400)
    }
  })
}
```

## RPC (Remote Procedure Call)

### Server Setup

```typescript
// src/routes/orders.ts
import { Hono } from 'hono'

const orderRoutes = new Hono()
  .post('/', async (c) => {
    const order = await createOrder(await c.req.json())
    return c.json(order, 201)
  })
  .get('/:id', async (c) => {
    const order = await findOrder(c.req.param('id'))
    return order ? c.json(order) : c.json({ error: 'Not found' }, 404)
  })

export type OrderRoutesType = typeof orderRoutes
```

### Client Usage

```typescript
// Client (separate package/service)
import { hc } from 'hono/client'
import type { OrderRoutesType } from '../server/routes/orders'

const client = hc<OrderRoutesType>('http://localhost:3000')

// Type-safe API calls
const res = await client.api.orders.$post({
  json: { customerId: '...', items: [...] }
})
const order = await res.json() // Fully typed
```

### RPC with Validation

```typescript
const routes = new Hono()
  .post(
    '/api/orders',
    zValidator('json', CreateOrderSchema),
    async (c) => {
      const data = c.req.valid('json')
      const order = await createOrder(data)
      return c.json(order, 201)
    }
  )

type AppType = typeof routes
const client = hc<AppType>('/')
```

## Testing

### Unit Tests

```typescript
import { describe, expect, it } from 'vitest'
import app from '../app'

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
```

### Authenticated Tests

```typescript
describe('POST /api/orders', () => {
  it('creates order with valid auth', async () => {
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(validPayload),
    })
    expect(res.status).toBe(201)
  })
})
```

### Using Test Client

```typescript
import { testClient } from 'hono/testing'
import app from '../app'

it('test with testClient', async () => {
  const res = await testClient(app).api.orders.$get()
  expect(res.status).toBe(200)
})
```

## Context Management

```typescript
// Define environment types
type Env = {
  Bindings: {
    DB: D1Database
    JWT_SECRET: string
  }
  Variables: {
    userId: string
    requestId: string
  }
}

const app = new Hono<Env>()
app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
})
```

## Error Handling

```typescript
import { HTTPException } from 'hono/http-exception'

// Throw typed exceptions
app.get('/admin', async (c) => {
  const user = await authenticate(c)
  if (!user) throw new HTTPException(401, { message: 'Unauthorized' })
  if (!user.isAdmin) throw new HTTPException(403, { message: 'Forbidden' })
  return c.json({ secret: 'data' })
})

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ code: err.status, message: err.message }, err.status)
  }
  console.error(err)
  return c.json({ code: 500, message: 'Internal Server Error' }, 500)
})
```
