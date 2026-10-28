---
name: oak-backend
description: >
  Use this skill when the user says 'oak', 'oak backend', 'deno oak', 'oak middleware', 'oak router', 'oak context'. Structures Oak (jsr:@oak/oak) applications on Deno: router modules, middleware pipeline, typed context state, body parsing, error handling and handler-level testing. Do NOT use for: general Deno setup and permissions (deno), Hono on Deno (nodejs-hono), Express on Node.js (nodejs-express-skill).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, deno, phase-4]
---

# Oak Backend

## Purpose
Define Oak backend application architecture: Deno-native HTTP server, middleware composition, router pattern, and context management with typed state, composable middleware pipeline, and type-safe routing.

## Agent Protocol

### Trigger
User request includes: `oak`, `oak backend`, `deno oak`, `oak middleware`, `oak router`, `deno http`, `oak context`, `oak typescript`.

### Input Context
- Deno version (2.x assumed)
- Oak version (17.x on JSR: `jsr:@oak/oak`; v13+ changed the body API)
- Language (TypeScript)
- Database (Deno KV, PostgreSQL via `npm:pg` or `jsr:@db/postgres`, MongoDB via `npm:mongodb`)
- Templating (eta, deno mustache)
- Deployment (Deno Deploy, self-hosted)

### Output Artifact
A markdown document containing:
- Project structure
- Router setup (Router class)
- Middleware composition (use, compose)
- Context (c.state, c.cookies, c.send)
- Error handling middleware
- State management (context state)
- Environment configuration (Deno.env)
- Testing (Deno.test with `app.handle()`, or superoak)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Router separates route definitions from app setup
- Middleware pipeline composed with app.use()
- Error middleware catches all exceptions
- State typed via OakMiddleware type parameter
- Tests call `app.handle(new Request(...))` or use superoak
- Lockfile generated and committed

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Oak vs Hono vs std/http

| Criterion | Oak | Hono | std/http |
|-----------|-----|------|----------|
| Middleware ecosystem | Rich (cors, auth, rate-limit, static) | Growing (cors, etag, jwt) | Manual |
| TypeScript context typing | Generic `State` param | `c.req.valid()` | Manual |
| Router pattern | `Router({ prefix })` | Chained `.get().post()` | Switch/match |
| File upload | `await ctx.request.body.formData()` | `c.req.parseBody()` | `req.formData()` |
| WebSocket | `ctx.upgrade()` | `upgradeWebSocket` from `hono/deno` | `Deno.upgradeWebSocket` |
| Multi-runtime | Deno first (also Node/Bun) | Deno, Node, Bun, Workers | Deno only |

Decision: existing Koa-style middleware stack → Oak. Typed validation and multi-runtime portability → Hono. Tiny single-purpose service → `Deno.serve`.

### Route Organization Strategy

| Scale | Pattern | Structure |
|-------|---------|-----------|
| Small (<10 routes) | Single router file | `src/router.ts` |
| Medium (10-50 routes) | Resource modules | `src/routes/{resource}.ts` |
| Large (50+ routes) | Versioned sub-routers | `src/routes/v1/{resource}.ts` |
| Micro (3-5 routes) | Inline in app.ts | `app.use(router.routes())` |

## Workflow

### Step 1: Project Setup
```bash
# Create project directory
mkdir -p order-service/src
cd order-service

# Initialize
deno init

# Add oak (writes to deno.json imports)
deno add jsr:@oak/oak jsr:@std/assert npm:zod
```

### Step 2: Project Structure
```
order-service/
├── src/
│   ├── main.ts
│   ├── app.ts
│   ├── router/
│   │   ├── index.ts
│   │   ├── orders.ts
│   │   └── health.ts
│   ├── middleware/
│   │   ├── error.ts
│   │   ├── logger.ts
│   │   └── auth.ts
│   ├── controllers/
│   │   └── order.controller.ts
│   ├── services/
│   │   └── order.service.ts
│   ├── models/
│   │   └── order.ts
│   └── types/
│       └── index.ts
├── tests/
│   ├── app_test.ts
│   └── orders_test.ts
├── deno.json
└── deno.lock
```

### Step 3: App Initialization
```typescript
// src/app.ts
import { Application } from '@oak/oak'
import { errorMiddleware } from './middleware/error.ts'
import { loggerMiddleware } from './middleware/logger.ts'
import { router } from './router/index.ts'
import type { AppState } from './types/index.ts'

export function createApp(): Application<AppState> {
  // state: initial app-wide state; each request gets a copy in ctx.state
  const app = new Application<AppState>({ state: {} as AppState })

  // Middleware pipeline (order matters)
  app.use(errorMiddleware)
  app.use(loggerMiddleware)
  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}

// src/main.ts
import { createApp } from './app.ts'

const app = createApp()
const port = parseInt(Deno.env.get('PORT') ?? '8080')
console.log(`Server running on port ${port}`)
await app.listen({ port })
```

### Step 4: Router and Controller
```typescript
// src/router/orders.ts
import { Router } from '@oak/oak'
import { OrderController } from '../controllers/order.controller.ts'

const router = new Router({ prefix: '/api/orders' })
const controller = new OrderController()

router.get('/', controller.list)
router.get('/:id', controller.getById)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.deleteById)

export { router as orderRouter }

// src/controllers/order.controller.ts
import type { RouterContext } from '@oak/oak'
import * as orderService from '../services/order.service.ts'

export class OrderController {
  async list(ctx: RouterContext<'/'>) {
    const orders = await orderService.findAll()
    ctx.response.body = orders
  }

  async getById(ctx: RouterContext<'/:id'>) {
    const id = ctx.params.id!
    const order = await orderService.findById(id)
    if (!order) {
      ctx.response.status = 404
      ctx.response.body = { error: 'Order not found' }
      return
    }
    ctx.response.body = order
  }

  async create(ctx: RouterContext<'/'>) {
    const body = await ctx.request.body.json() // Oak v13+ body API
    const order = await orderService.create(body)
    ctx.response.status = 201
    ctx.response.body = order
  }
}
```

### Step 5: Middleware Pipeline
```typescript
// src/middleware/error.ts
import { isHttpError, type Middleware } from '@oak/oak'

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    if (isHttpError(err) && err.expose) {
      ctx.response.status = err.status
      ctx.response.body = { success: false, error: { code: err.name, message: err.message } }
    } else {
      console.error(`unhandled error on ${ctx.request.method} ${ctx.request.url.pathname}`, err)
      ctx.response.status = 500
      ctx.response.body = { success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }
    }
    ctx.response.type = 'json'
  }
}

// src/middleware/logger.ts
import type { Middleware } from '@oak/oak'

export const loggerMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms`)
}
```

### Step 6: Typed State Management

```typescript
// src/types/index.ts
export interface AppState {
  userId: string
  role: 'admin' | 'user'
  requestId: string
}

// src/middleware/auth.ts
import type { Middleware } from '@oak/oak'
import type { AppState } from '../types/index.ts'

export const authMiddleware: Middleware<AppState> = async (ctx, next) => {
  const token = ctx.request.headers.get('Authorization')?.slice(7)
  if (!token) {
    ctx.response.status = 401
    ctx.response.body = { error: 'Unauthorized' }
    return
  }
  const payload = await verifyJwt(token)
  ctx.state.userId = payload.sub
  ctx.state.role = payload.role
  ctx.state.requestId = crypto.randomUUID()
  await next()
}
```

### Step 7: Validation with Zod

```typescript
// src/middleware/validate.ts
import { z } from 'zod'
import type { Middleware } from '@oak/oak'

export function validate(schema: z.ZodSchema): Middleware {
  return async (ctx, next) => {
    if (!ctx.request.hasBody) ctx.throw(400, 'Request body required')
    const result = schema.safeParse(await ctx.request.body.json())
    if (!result.success) {
      ctx.response.status = 400
      ctx.response.body = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: result.error.issues,
        },
      }
      return
    }
    ctx.state.validatedBody = result.data
    await next()
  }
}
```

### Step 8: Testing
```typescript
// tests/orders_test.ts
import { createApp } from '../src/app.ts'
import { assertEquals } from '@std/assert'

const validPayload = { customerId: 'c-1', items: [{ sku: 'A', qty: 1 }] }

// app.handle() runs the middleware stack on a Request without opening a port
Deno.test('POST /api/orders creates order', async () => {
  const app = createApp()
  const res = await app.handle(new Request('http://localhost/api/orders', {
    method: 'POST',
    body: JSON.stringify(validPayload),
    headers: { 'Content-Type': 'application/json' },
  }))
  assertEquals(res?.status, 201)
})

Deno.test('GET /api/orders/:id returns 404 for missing', async () => {
  const app = createApp()
  const res = await app.handle(new Request('http://localhost/api/orders/nonexistent'))
  assertEquals(res?.status, 404)
})
```

## Implementation Patterns

### Pattern: Composite Router (Versioned API)

```typescript
// src/router/index.ts
import { Router } from '@oak/oak'
import { orderRouter } from './orders.ts'
import { userRouter } from './users.ts'
import { healthRouter } from './health.ts'

const api = new Router({ prefix: '/api/v1' })
api.use('/orders', orderRouter.routes(), orderRouter.allowedMethods())
api.use('/users', userRouter.routes(), userRouter.allowedMethods())

const router = new Router()
router.use('/health', healthRouter.routes(), healthRouter.allowedMethods())
router.use('/api/v1', api.routes(), api.allowedMethods())

export { router }
```

### Pattern: Static File Serving

```typescript
// Serve static files (send() rejects paths escaping root)
router.get('/static/:path+', async (ctx) => {
  await ctx.send({
    path: ctx.params.path!,
    root: `${Deno.cwd()}/public`,
    maxage: 86400,
  })
})
```

### Pattern: CORS with Dynamic Origins

```typescript
const allowedOrigins = ['https://app.example.com', 'https://admin.example.com']

app.use(async (ctx, next) => {
  const origin = ctx.request.headers.get('Origin')
  if (origin && allowedOrigins.includes(origin)) {
    ctx.response.headers.set('Access-Control-Allow-Origin', origin)
    ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  if (ctx.request.method === 'OPTIONS') {
    ctx.response.status = 204
    return
  }
  await next()
})
```

## Production Considerations

### Error Visibility
- Log all 5xx errors with full stack traces to stderr
- Use `ctx.response.type = 'json'` before setting body to ensure content-type
- Add `X-Request-Id` header to every response for tracing
- Structure error responses consistently: `{ success: false, error: { code, message, details? } }`

### Performance Tuning
- Oak routers match routes in registration order (path-to-regexp patterns); register hot routes first and avoid huge numbers of routes on one router
- Setting `ctx.response.body` to an object serializes it to JSON once; avoid extra stringify/parse in middleware
- Use `ctx.send()` for files so they stream instead of being read into memory
- Size the DB connection pool to the database's limits divided by instance count
- Memory cap: `--v8-flags=--max-old-space-size=512` on `deno run`/`deno compile`

### Deployment
- Deno Deploy: `app.listen()` works; set no fixed hostname
- Docker: `denoland/deno` image pinned to a version, `USER deno`, `--cached-only`
- Self-hosted VM: systemd service with `Restart=always`

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Inline routes in app.ts | Not testable, violates SRP | Separate router files |
| Mixing state and middleware | State is per-request, not app-wide | Use app.state for startup info only |
| `ctx.request.body()` multiple reads | Body stream is consumed once | Call once, store in context state |
| Missing `allowedMethods()` | Returns 404 instead of 405 on wrong method | Always add `router.allowedMethods()` |
| Hardcoded CORS origins | Security issue in production | Read from env var or config |
| No type on Application | `ctx.state` is loosely typed | Parameterize `Application<AppState>` |
| `ctx.request.body()` (pre-v13 API) | Removed in Oak v13+ | `ctx.request.body.json()` / `.formData()` / `.text()` |

## Security Considerations
- Always validate `Content-Type` header — reject unexpected types
- Run with exact `--allow-*` flags per deployment (see the deno skill)
- Use `secure: true` on cookies in production (HTTPS only)
- Rate limit by IP or token — store counters in Deno KV
- Sanitize `ctx.params` — Oak does not auto-escape/validate path params
- CORS: never `*` with credentials; use explicit origin list or regex matching

## Testing Strategies

### Unit Testing Services
```typescript
Deno.test('calculateOrderTotal', () => {
  const result = calculateTotal([{ price: 10, qty: 2 }, { price: 5, qty: 3 }])
  assertEquals(result, 35)
})
```

### Integration Testing with Database
Use in-memory KV (`Deno.openKv(':memory:')`) for test isolation. Mock external HTTP calls with `stub` from `@std/testing/mock`. Test error paths explicitly — validation errors, auth failures, 404s, 500s.

## Rules
- TypeScript strict mode — all files .ts extension.
- Router instances separate from Application — never inline routes.
- Middleware pipeline: error → logger → auth → router.
- Context state for per-request data (user, requestId).
- Oak Router prefix for route grouping — never manual path concatenation.
- Deno.env for all configuration — never hardcoded values.
- deno.json `imports` for dependencies (`jsr:@oak/oak`).
- Always add `router.allowedMethods()` after each router.
- Never read `ctx.request.body` more than once per request.

## References
  - references/deno-runtime-guide.md — Deno Runtime Guide
  - references/oak-middleware.md — Oak Middleware
  - references/oak-performance.md — Oak Performance Optimization
  - references/oak-routing-deployment.md — Oak Routing and Deployment
  - references/oak-setup.md — Oak Setup Guide
  - references/oak-testing.md — Oak Testing
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
