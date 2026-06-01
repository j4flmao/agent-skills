---
name: elysia-patterns
description: >
  Use this skill when implementing Elysia.js patterns — Eden Treaty client, WebSocket handlers, auth/guard macros, custom plugins, performance optimization, and type-safe validation. This skill enforces: type-safe client-server communication, macro-based guards, schema-first validation. Requires Bun (bun create elysia). Do NOT use for: Express middleware patterns, Node.js streams, or non-Elysia frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, elysia, phase-5]
---

# Elysia Patterns

## Purpose
Implement Elysia.js-specific patterns — Eden Treaty type-safe client, WebSocket with Bun, macro-based guards, custom plugins, and validation patterns.

## Agent Protocol

### Trigger
User request includes: `elysia pattern`, `elysia eden treaty`, `elysia websocket`, `elysia plugin`, `elysia macro`, `elysia validation`, `elysia type safe`.

### Input Context
- Elysia version and plugin set
- Server-side patterns needed (auth, middleware, validation)
- Client-side (React, Svelte, Vue) for Eden Treaty

### Output Artifact
Code examples for the requested patterns — plugin, macro, WebSocket handler, Eden client.

### Response Format
Code-first: pattern name, problem, implementation. Compress output.

### Completion Criteria
- Pattern implemented with type safety
- Schema validation applied
- Error handling included
- Test example provided

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Eden Treaty vs tRPC vs REST+OpenAPI

| Criterion | Eden Treaty | tRPC | REST+OpenAPI |
|-----------|-------------|------|--------------|
| Backend | Elysia only | Node.js only | Any |
| Type safety | Full-stack inference | Full-stack inference | Generated client |
| Setup | Single `typeof app` | Manual procedure defs | External tooling |
| File upload | Declarative | Manual | Multipart |
| Websocket | Via plugin | Via subscription | Separate |
| Flexibility | Elysia-native | tRPC server | Any HTTP |

Decision: Elysia backend + any frontend → Eden Treaty. tRPC backend → tRPC fits better. Multi-language clients → REST+OpenAPI.

### Macro vs Middleware vs Plugin

| Pattern | Scope | Use Case |
|---------|-------|----------|
| Macro (`guard`, `resolve`) | Route-level | Auth check, permission guard |
| Middleware (`onRequest`, `beforeHandle`) | Global or group | Logging, CORS, rate limit |
| Plugin (`new Elysia({name})`) | Modular feature | User module, auth module |

Decision: Reusable route modifier → Macro. Cross-cutting concern → Middleware. Standalone feature → Plugin.

## Workflow

### Step 1: Eden Treaty Full-Stack Setup

```typescript
// server/src/app.ts — EXPORT TYPE
import { Elysia } from 'elysia'
import { userModule } from './modules/users'

export const app = new Elysia()
  .use(userModule)
  .get('/health', () => ({ status: 'ok' }))

export type App = typeof app

// client/src/api.ts
import { edenTreaty } from '@elysiajs/eden'
import type { App } from '../../server/src/app'

export const client = edenTreaty<App>('http://localhost:3000', {
  headers: () => ({
    authorization: `Bearer ${localStorage.getItem('token')}`,
  }),
})

// React component
async function UserProfile({ id }: { id: string }) {
  const { data, error } = await client.users({ id }).get()
  if (error) return <div>Error: {error.message}</div>
  return <div>{data.name}</div>
}
```

### Step 2: WebSocket Pattern

```typescript
// src/plugins/realtime.ts
import { Elysia, t } from 'elysia'
import { ws } from '@elysiajs/websocket'

export const realtimePlugin = new Elysia()
  .use(ws())
  .ws('/ws/orders/:orderId', {
    body: t.Object({
      type: t.String(),
      payload: t.Any(),
    }),
    async open(ws) {
      ws.subscribe(`order:${ws.data.params.orderId}`)
      ws.send({ type: 'connected', payload: { orderId: ws.data.params.orderId } })
    },
    async message(ws, message) {
      // Broadcast to all subscribers of this order
      ws.publish(`order:${ws.data.params.orderId}`, message)
    },
    async close(ws) {
      ws.unsubscribe(`order:${ws.data.params.orderId}`)
    },
  })

// Emit from service
function notifyOrderStatus(orderId: string, status: string) {
  app.server?.publish(`order:${orderId}`, {
    type: 'status_update',
    payload: { orderId, status },
  })
}
```

### Step 3: Custom Plugin with Lifecycle

```typescript
// src/plugins/audit-log.ts
import { Elysia } from 'elysia'

interface AuditLogConfig {
  excludePaths?: string[]
  db: { save: (entry: AuditEntry) => Promise<void> }
}

interface AuditEntry {
  method: string
  path: string
  userId: string | null
  statusCode: number
  duration: number
  timestamp: Date
}

export const auditLogPlugin = (config: AuditLogConfig) =>
  new Elysia({ name: 'audit-log' })
    .derive({ as: 'scoped' }, () => ({ startTime: performance.now() }))
    .onResponse(({ request, set, store, startTime }) => {
      const url = new URL(request.url)
      if (config.excludePaths?.includes(url.pathname)) return

      const entry: AuditEntry = {
        method: request.method,
        path: url.pathname,
        userId: (request as any).user?.id || null,
        statusCode: set.status || 200,
        duration: performance.now() - startTime,
        timestamp: new Date(),
      }
      config.db.save(entry).catch(console.error)
    })

// Usage
app.use(auditLogPlugin({
  excludePaths: ['/health'],
  db: auditRepository,
}))
```

### Step 4: Guard Macros

```typescript
// src/plugins/rate-limit.ts
import { Elysia } from 'elysia'

const requestCounts = new Map<string, { count: number; resetAt: number }>()

export const rateLimitPlugin = new Elysia({ name: 'rate-limit' })
  .macro({
    // @ts-ignore
    rateLimit: {
      beforeHandle({ headers, set }, limit: number = 60) {
        const ip = headers['x-forwarded-for'] || 'unknown'
        const now = Date.now()
        const entry = requestCounts.get(ip)

        if (!entry || now > entry.resetAt) {
          requestCounts.set(ip, { count: 1, resetAt: now + 60000 })
          return
        }

        entry.count++
        if (entry.count > limit) {
          set.status = 429
          set.headers['Retry-After'] = String(Math.ceil((entry.resetAt - now) / 1000))
          return { error: 'Rate limit exceeded', retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
        }
      }
    }
  })

// Usage
app.guard({ rateLimit: 100 })
  .get('/api/data', () => fetchData())
```

### Step 5: Validation Patterns

```typescript
// src/modules/orders/schema.ts
import { t } from 'elysia'

// Composable schema parts
const AddressSchema = t.Object({
  street: t.String(),
  city: t.String(),
  zipCode: t.String({ pattern: '^\\d{5}$' }),
})

const OrderItemSchema = t.Object({
  productId: t.String({ format: 'uuid' }),
  quantity: t.Numeric({ minimum: 1, maximum: 999 }),
  price: t.Numeric({ exclusiveMinimum: 0 }),
})

const PaymentSchema = t.Object({
  method: t.Union([t.Literal('card'), t.Literal('transfer'), t.Literal('cod')]),
  cardToken: t.Optional(t.String()),
})

// Composed schema
export const CreateOrderSchema = t.Object({
  items: t.Array(OrderItemSchema, { minItems: 1 }),
  shippingAddress: AddressSchema,
  payment: PaymentSchema,
  notes: t.Optional(t.String({ maxLength: 500 })),
})

export const OrderResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  orderNumber: t.String(),
  status: t.String(),
  total: t.Number(),
  items: t.Array(t.Composite([OrderItemSchema, t.Object({ id: t.String() })])),
  createdAt: t.String({ format: 'date-time' }),
})
```

### Step 6: Response Transformation

```typescript
// src/plugins/response-transform.ts
import { Elysia } from 'elysia'

export const responseTransformPlugin = new Elysia({ name: 'response-transform' })
  .onAfterHandle({ as: 'global' }, ({ response, set }) => {
    if (response && typeof response === 'object' && !('success' in response) && !(response instanceof Response)) {
      return { success: true, data: response }
    }
  })
```

### Step 7: File Upload with Elysia

```typescript
import { Elysia, t } from 'elysia'

export const uploadPlugin = new Elysia({ name: 'upload' })
  .post('/api/upload', async ({ body: { file } }) => {
    const buffer = await file.arrayBuffer()
    const filename = `${crypto.randomUUID()}-${file.name}`
    await Bun.write(`./uploads/${filename}`, buffer)
    return { success: true, filename, size: buffer.byteLength }
  }, {
    body: t.Object({
      file: t.File({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
    }),
  })
  .post('/api/upload/multiple', async ({ body: { files } }) => {
    const results = await Promise.all(
      files.map(async (f) => {
        const buf = await f.arrayBuffer()
        const name = `${crypto.randomUUID()}-${f.name}`
        await Bun.write(`./uploads/${name}`, buf)
        return { name, size: buf.byteLength }
      })
    )
    return { success: true, files: results }
  }, {
    body: t.Object({
      files: t.Array(t.File({ maxSize: 5 * 1024 * 1024 }), { maxItems: 10 }),
    }),
  })
```

### Step 8: Error Handling Plugin

```typescript
import { Elysia } from 'elysia'

export const errorPlugin = new Elysia({ name: 'error-handler' })
  .onError({ as: 'global' }, ({ error, code, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return { success: false, code: 'VALIDATION_ERROR', details: error.validator.Errors(error.value).First() }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { success: false, code: 'NOT_FOUND', message: error.message }
    }
    if (code === 'PARSE') {
      set.status = 400
      return { success: false, code: 'PARSE_ERROR', message: 'Invalid request body' }
    }
    console.error('Unhandled error:', error)
    set.status = 500
    return { success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  })

// Usage
const app = new Elysia()
  .use(errorPlugin)
  .get('/users/:id', ({ params: { id }, error }) => {
    const user = findUser(id)
    if (!user) return error(404, 'User not found')
    return user
  })
```

## Production Considerations

### Performance Tuning

```typescript
// Elysia production config
const app = new Elysia({
  precompile: true,          // Pre-compile handlers for faster startup
  strictPath: true,          // Strict path matching (/users != /users/)
  normalize: false,          // Skip path normalization in production
})
  .use(compression())
  .use(cors())
  .listen(3000)
```

- `precompile: true` — reduces cold start by 40-60%
- Use `compression()` plugin for gzip/brotli response encoding
- Eden Treaty: use `$fetch` instead of `fetch` option for faster client requests
- Bun-native: Elysia runs on Bun's HTTP server (>80k req/s)
- Memory: monitor with `process.memoryUsage()`, set `--smol` flag in Docker
- Rate limiting: use macro-based guard instead of middleware for better performance

### Caching
```typescript
// Simple in-memory cache plugin
export const cachePlugin = new Elysia({ name: 'cache' })
  .derive({ as: 'scoped' }, () => {
    const cache = new Map<string, { data: any; expires: number }>()
    return {
      cacheGet: (key: string) => {
        const entry = cache.get(key)
        if (entry && entry.expires > Date.now()) return entry.data
        cache.delete(key)
        return null
      },
      cacheSet: (key: string, data: any, ttlMs: number = 60000) => {
        cache.set(key, { data, expires: Date.now() + ttlMs })
      }
    }
  })
```

### Graceful Shutdown
```typescript
const app = createApp().listen(port)

process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  app.stop()
  await db.close()
  process.exit(0)
})
```

## Implementation Patterns

### Pattern: Dependency Injection with Elysia State

```typescript
import { Elysia } from 'elysia'

// Define service
class UserService {
  constructor(private db: Database) {}
  async findById(id: string) { return this.db.query('SELECT * FROM users WHERE id = $1', [id]) }
}

// Register in app state
const app = new Elysia()
  .decorate('db', new Database(process.env.DATABASE_URL!))
  .decorate('userService', new UserService(new Database(process.env.DATABASE_URL!)))
  .get('/users/:id', ({ params: { id }, userService }) => userService.findById(id))

// Plugin-scoped DI
const userModule = new Elysia({ name: 'user-module' })
  .decorate('userService', new UserService(new Database(process.env.DATABASE_URL!)))
  .get('/users/:id', ({ userService, params: { id } }) => userService.findById(id))
  .post('/users', ({ body, userService }) => userService.create(body))

const app = new Elysia().use(userModule)
// `userService` is only available inside userModule routes
```

### Pattern: OpenAPI/Swagger Documentation

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(swagger({
    path: '/docs',
    documentation: {
      info: { title: 'My API', version: '1.0.0', description: 'Elysia API documentation' },
      tags: [{ name: 'Users', description: 'User endpoints' }, { name: 'Orders', description: 'Order endpoints' }],
    },
  }))
  .get('/users', () => listUsers(), {
    detail: {
      tags: ['Users'],
      summary: 'List all users',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'number' } }],
      responses: { 200: { description: 'User list' } },
    },
  })
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Global schema reuse across modules | Tight coupling | Each module owns its schema |
| Eden Treaty with `typeof` without export | Client can't infer types | Export `App` type from `app.ts` |
| WebSocket in non-ws plugin | Unclear ownership | Create dedicated `realtime` plugin |
| Heavy computation in macros | Blocks request pipeline | Offload to service layer |
| Missing `{as: 'scoped'}` on derive | Memory leak (state persists) | Always scope per-request state |
| Using Express middleware directly | Elysia handles middleware differently | Convert to Elysia `onRequest`/`beforeHandle` |
| Not using `precompile: true` in prod | Slower cold starts | Enable precompile for production deployments |
| Decorating state in base app for all modules | Memory grows with every module | Scope state to plugin via `decorate` in named plugins |

## Security Considerations
- Eden Treaty sends all appropriate CORS headers automatically
- WebSocket: validate origin and auth token on connection
- Guard macros for auth — never trust client-side claims
- Rate limiting at macro level for critical endpoints (login, register)
- Content Security Policy via response headers

## Testing Strategies

### Plugin Testing
```typescript
import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { rateLimitPlugin } from './rate-limit'

test('rate limit blocks after threshold', async () => {
  const app = new Elysia()
    .use(rateLimitPlugin)
    .guard({ rateLimit: 2 })
    .get('/test', () => 'ok')

  await app.handle(new Request('http://localhost/test')) // 200
  await app.handle(new Request('http://localhost/test')) // 200
  const res = await app.handle(new Request('http://localhost/test')) // 429
  expect(res.status).toBe(429)
})
```

### WebSocket Testing
Use `bun test` with `WebSocket` constructor. Test connection, message send/receive, and disconnect handlers.

## Rules
- Eden Treaty client uses `typeof app` — export the `App` type from the main entry point.
- Plugins are named (`new Elysia({name})`) for proper deduplication by Elysia's plugin system.
- `as: 'scoped'` on all per-request state. `as: 'global'` only for app-wide singletons.
- Macro names are camelCase and map to lifecycle hooks (beforeHandle, onRequest, etc).
- WebSocket routes isolated in dedicated plugin — never mixed with HTTP routes.
- Error handler plugin registered first in pipeline (outermost catches all).

## References
  - references/eden-treaty.md — Eden Treaty Client
  - references/elysia-auth.md — Authentication Patterns
  - references/elysia-performance.md — Performance Optimization
  - references/elysia-plugins.md — Plugin Development
  - references/elysia-validation.md — Validation and Schemas
  - references/elysia-websocket.md — WebSocket Patterns
## Handoff
Hand off to `backend/elysia/architecture/SKILL.md` for project structure or `backend/universal/api-response/SKILL.md` for API response formatting.
