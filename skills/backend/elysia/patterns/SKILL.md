---
name: elysia-patterns
description: >
  Use this skill when the user says 'elysia pattern', 'elysia eden treaty', 'elysia websocket', 'elysia macro', 'elysia validation', 'elysia file upload', 'elysia custom plugin'. Implements Elysia recipes: Eden Treaty clients, built-in WebSocket pub/sub, parameterized macros, custom plugins with lifecycle hooks, TypeBox validation, uploads, error mapping and DI via decorate. Do NOT use for: overall project structure and lifecycle order (elysia-architecture), Express middleware, non-Elysia frameworks.
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
| Backend | Elysia only | TypeScript servers (Node, Bun, Deno, edge adapters) | Any |
| Type safety | Full-stack inference | Full-stack inference | Generated client |
| Setup | Single `typeof app` | Manual procedure defs | External tooling |
| File upload | Declarative | Manual | Multipart |
| Websocket | Via plugin | Via subscription | Separate |
| Flexibility | Elysia-native | tRPC server | Any HTTP |

Decision: Elysia backend + any frontend → Eden Treaty. tRPC backend → tRPC fits better. Multi-language clients → REST+OpenAPI.

### Macro vs Middleware vs Plugin

| Pattern | Scope | Use Case |
|---------|-------|----------|
| Macro (`.macro()`, enabled per route or `guard`) | Route-level | Auth check, permission guard |
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
import { treaty } from '@elysiajs/eden' // Eden Treaty 2
import type { App } from '../../server/src/app'

export const client = treaty<App>('localhost:3000', {
  headers: () => ({
    authorization: `Bearer ${localStorage.getItem('token')}`,
  }),
})

// Usage (e.g. inside a data-fetching hook)
export async function loadUser(id: string) {
  const { data, error } = await client.users({ id }).get()
  if (error) throw new Error(`Failed to load user ${id}: HTTP ${error.status}`)
  return data
}
```

### Step 2: WebSocket Pattern

```typescript
// src/plugins/realtime.ts — WebSocket support is built into Elysia (Bun's uWebSockets), no plugin needed
import { Elysia, t } from 'elysia'

export const realtimePlugin = new Elysia({ name: 'realtime' })
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

// Emit from service code (app = the listening Elysia instance)
function notifyOrderStatus(orderId: string, status: string) {
  app.server?.publish(`order:${orderId}`, JSON.stringify({
    type: 'status_update',
    payload: { orderId, status },
  }))
}
// Pub/sub is per process; fan out through Redis/NATS when running several instances.
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
    .derive({ as: 'global' }, () => ({ startTime: performance.now() }))
    .onAfterResponse({ as: 'global' }, (ctx) => {
      const { request, set, startTime } = ctx
      const url = new URL(request.url)
      if (config.excludePaths?.includes(url.pathname)) return

      const entry: AuditEntry = {
        method: request.method,
        path: url.pathname,
        userId: (ctx as { user?: { id: string } }).user?.id ?? null, // set by auth plugin if present
        statusCode: typeof set.status === 'number' ? set.status : 200,
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

// Single-instance demo only: per-process memory, no eviction. Use Redis for real deployments.
export const rateLimitPlugin = new Elysia({ name: 'rate-limit' })
  .macro({
    // parameterized macro: { rateLimit: 100 } on a route or guard
    rateLimit(limit: number) {
      return {
        beforeHandle({ request, server, set }) {
          const ip = server?.requestIP(request)?.address ?? 'unknown'
          const now = Date.now()
          const entry = requestCounts.get(ip)

          if (!entry || now > entry.resetAt) {
            requestCounts.set(ip, { count: 1, resetAt: now + 60_000 })
            return
          }

          entry.count++
          if (entry.count > limit) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
            set.status = 429
            set.headers['retry-after'] = String(retryAfter)
            return { error: 'Rate limit exceeded', retryAfter }
          }
        },
      }
    },
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
      return { success: false, code: 'VALIDATION_ERROR', details: error.all }
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
  precompile: true,   // compile routes/validators at startup: slower boot, faster first requests
  strictPath: true,   // /users and /users/ are different routes
})
  .use(cors({ origin: ['https://app.example.com'] }))
  .listen(3000)
```

- `precompile` trades startup time for first-request latency; leave it off for serverless cold starts.
- `normalize` (default on) strips properties not in the schema; keep it on so unexpected fields never reach handlers.
- Response compression: usually done by the reverse proxy/CDN; community plugins exist if needed in-process.
- Memory-constrained containers: run Bun with `--smol`.
- Benchmark your own routes; framework micro-benchmarks rarely reflect database-bound workloads.

### Caching
```typescript
// Simple in-memory cache plugin (one Map per process, shared by all requests)
const cache = new Map<string, { data: unknown; expires: number }>()

export const cachePlugin = new Elysia({ name: 'cache' })
  .decorate({
    cacheGet: (key: string) => {
      const entry = cache.get(key)
      if (entry && entry.expires > Date.now()) return entry.data
      cache.delete(key)
      return null
    },
    cacheSet: (key: string, data: unknown, ttlMs: number = 60000) => {
      cache.set(key, { data, expires: Date.now() + ttlMs })
    },
  })
```

### Graceful Shutdown
```typescript
const app = createApp().listen(port)

process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  await app.stop()   // stop accepting connections, let in-flight requests finish
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

// One shared connection pool, injected into services
const db = new Database(process.env.DATABASE_URL!)

// Plugin-scoped DI
const userModule = new Elysia({ name: 'user-module' })
  .decorate('userService', new UserService(db))
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
| Expecting a plugin's hooks to apply to the parent app | Hooks are `local` by default | Set `{ as: 'scoped' }` or `{ as: 'global' }` explicitly |
| Using Express middleware directly | Incompatible request model | Convert to Elysia `onRequest`/`beforeHandle` |
| Unnamed plugins used many times | Hooks registered repeatedly | Give reusable plugins a `name` (and `seed` if configurable) for deduplication |
| Per-request `derive` creating caches/clients | New object per request, no sharing | `decorate`/`state` for singletons |

## Security Considerations
- CORS is a server concern: configure `@elysiajs/cors` with explicit origins; Eden does not change CORS behavior
- WebSocket: validate origin and auth token on connection
- Guard macros for auth — never trust client-side claims
- Rate limiting for critical endpoints (login, register), backed by a shared store when running multiple instances
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
- Choose hook scope deliberately: `local` (default, plugin only), `scoped` (plugin + direct parent), `global` (everything).
- Macro names are camelCase and map to lifecycle hooks (beforeHandle, onRequest, etc).
- WebSocket routes isolated in dedicated plugin — never mixed with HTTP routes.
- Register the error handler plugin before routes; hooks only apply to routes registered after them.

## References
  - references/eden-treaty.md — Eden Treaty Client
  - references/elysia-auth.md — Authentication Patterns
  - references/elysia-performance.md — Performance Optimization
  - references/elysia-plugins.md — Plugin Development
  - references/elysia-validation.md — Validation and Schemas
  - references/elysia-websocket.md — WebSocket Patterns
## Handoff
Hand off to `backend/elysia/architecture/SKILL.md` for project structure or `backend/universal/api-response/SKILL.md` for API response formatting.
