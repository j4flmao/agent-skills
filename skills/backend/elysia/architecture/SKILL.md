---
name: elysia-architecture
description: >
  Use this skill when the user says 'elysia app structure', 'elysia project layout', 'elysia plugin', 'elysia lifecycle', 'elysia architecture', 'eden treaty', 'elysia folder structure'. Structures Elysia (Bun) applications: plugin/module layout, lifecycle hook order, TypeBox schemas, auth macros, error handling, environment validation and Eden Treaty clients. Do NOT use for: individual Elysia recipes such as rate limiting or WebSockets (elysia-patterns), plain Bun.serve apps (bun), Express/Node.js projects.
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

# Elysia Architecture

## Purpose
Structure Elysia.js applications with plugin-based architecture — lifecycle hooks, type-safe schema, Eden Treaty client generation, and production middleware configuration.

## Agent Protocol

### Trigger
User request includes: `elysia app structure`, `elysia project layout`, `elysia plugin`, `elysia lifecycle`, `elysia architecture`, `elysia folder structure`, `elysia config`.

### Input Context
- Bun version (1.0+)
- Elysia version (1.x)
- Plugins used (cors, swagger, websocket, auth)
- Database (Bun SQLite, Drizzle, Prisma)

### Output Artifact
Project structure, plugin layout, lifecycle hook order, configuration, Eden Treaty client setup.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging.

### Completion Criteria
- Plugin-based architecture with clear separation
- Lifecycle hooks in correct order
- Type-safe schemas with Elysia `t` (TypeBox) for body, query, params and response
- Eden Treaty client typed from the exported `App` type
- Environment validated at startup

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Plugin Architecture vs Monolithic

| Criterion | Plugin Architecture | Monolithic |
|-----------|-------------------|------------|
| Feature count | 5+ features | 1-3 features |
| Team size | 2+ developers | Solo |
| Reuse | Multiple apps share plugins | Single app |
| Testing | Isolated per plugin | End-to-end |
| Bundle size | Lazy-loaded plugins | Single bundle |

Decision: Multi-feature app or shared modules → Plugin Architecture. Simple CRUD → Monolithic.

### Lifecycle Hook Strategy

| Hook / API | Runs | Use Case |
|------|---------|----------|
| `state` / `decorate` | Once at setup (not per request) | DB clients, config, singletons |
| `onRequest` | First, before routing | Request ID, rate limiting, CORS preflight |
| `onParse` | Body parsing | Custom content types |
| `onTransform` / `derive` | Before validation | Add context values from headers (derive runs in the transform phase) |
| (validation) | Schema check of body/query/params/headers | TypeBox schemas |
| `resolve` | After validation, before `beforeHandle` | Values that need validated input, e.g. load user from verified token |
| `beforeHandle` | Before handler; returning a value short-circuits | Auth guards, permission checks |
| `afterHandle` / `mapResponse` | After handler | Transform or wrap response |
| `onError` | On any thrown error | Global error mapping |
| `onAfterResponse` | After response is sent (named `onResponse` before 1.1) | Metrics, logging |

Order: `onRequest → onParse → onTransform/derive → validation → resolve → beforeHandle → handler → afterHandle → mapResponse → onAfterResponse` (`onError` whenever something throws). Hooks apply only to routes registered after them.

## Workflow

### Step 1: Project Structure

```
src/
  index.ts                    # Entry point — create app, register plugins
  app.ts                      # Elysia app factory
  config/
    env.ts                    # Environment config
    database.ts               # DB connection
  plugins/
    auth.ts                   # Auth plugin (resolve user, guard)
    cors.ts                   # CORS config plugin
    swagger.ts                # Swagger/OpenAPI plugin
    error-handler.ts          # Global error handler
  modules/
    users/
      index.ts                # User module plugin
      routes.ts               # User routes
      schema.ts               # Validation schemas
      service.ts              # Business logic
      repository.ts           # Data access
    orders/
      index.ts
      routes.ts
      schema.ts
      service.ts
  shared/
    response.ts               # Response helpers
    logger.ts                 # Logger setup
    pagination.ts             # Pagination types
```

### Step 2: App Factory

```typescript
// src/app.ts
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger' // newer projects: @elysiajs/openapi
import { authPlugin } from './plugins/auth'
import { errorHandlerPlugin } from './plugins/error-handler'
import { userModule } from './modules/users'
import { orderModule } from './modules/orders'

export const createApp = () => new Elysia()
  .use(cors({ origin: Bun.env.CORS_ORIGIN }))
  .use(swagger({ path: '/docs' }))
  .use(errorHandlerPlugin)
  .use(authPlugin)
  .use(userModule)
  .use(orderModule)
  .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))

export type App = ReturnType<typeof createApp> // consumed by Eden Treaty

// src/index.ts
import { createApp } from './app'

const app = createApp()
const port = parseInt(Bun.env.PORT || '3000')
app.listen(port, () => console.log(`Server running on port ${port}`))
```

### Step 3: Auth Plugin (Resolver Pattern)

```typescript
// src/plugins/auth.ts
import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'

export const authPlugin = new Elysia({ name: 'auth' })
  .use(jwt({ secret: Bun.env.JWT_SECRET! }))
  .derive({ as: 'scoped' }, async ({ jwt, headers }) => {
    const token = headers.authorization?.slice(7)
    if (!token) return { user: null }
    const payload = await jwt.verify(token)
    return { user: payload as { id: string; role: string } | null }
  })
  .macro({
    // @ts-ignore
    isAuthenticated: {
      beforeHandle({ user, error }) {
        if (!user) return error(401, { message: 'Unauthorized' })
      }
    },
    hasRole: (roles: string[]) => ({
      beforeHandle({ user, error }) {
        if (!user || !roles.includes(user.role))
          return error(403, { message: 'Forbidden' })
      }
    })
  })

// Usage in routes
app
  .guard({ isAuthenticated: true })
  .get('/users/me', ({ user }) => user)
  .guard({ hasRole: ['admin'] })
  .delete('/users/:id', ({ params }) => deleteUser(params.id))
```

### Step 4: Module Pattern

```typescript
// src/modules/users/schema.ts
import { t } from 'elysia'

export const CreateUserSchema = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: 'email' }),
  role: t.Optional(t.Union([t.Literal('admin'), t.Literal('user')])),
})

export const UserResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  role: t.String(),
})

export const UserParamsSchema = t.Object({
  id: t.String(),
})

// src/modules/users/routes.ts
import { Elysia, t } from 'elysia'
import { CreateUserSchema, UserResponseSchema, UserParamsSchema } from './schema'
import * as userService from './service'

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', async ({ query }) => {
    const users = await userService.findAll(query)
    return { data: users }
  }, {
    query: t.Object({ page: t.Optional(t.Numeric()), limit: t.Optional(t.Numeric()) }),
  })
  .get('/:id', async ({ params, set }) => {
    const user = await userService.findById(params.id)
    if (!user) {
      set.status = 404
      return { error: 'Not found' }
    }
    return { data: user }
  }, {
    params: UserParamsSchema,
    response: {
      200: t.Object({ data: UserResponseSchema }),
      404: t.Object({ error: t.String() }),
    },
  })
  .post('/', async ({ body, set }) => {
    const user = await userService.create(body)
    set.status = 201
    return { data: user }
  }, {
    body: CreateUserSchema,
    response: { 201: t.Object({ data: UserResponseSchema }) },
  })

// src/modules/users/index.ts
import { Elysia } from 'elysia'
import { userRoutes } from './routes'

export const userModule = new Elysia().use(userRoutes)
```

### Step 5: Error Handler Plugin

```typescript
// src/plugins/error-handler.ts
import { Elysia } from 'elysia'

export const errorHandlerPlugin = new Elysia({ name: 'error-handler' })
  .onError({ as: 'global' }, ({ code, error, set }) => {
    console.error(`[${code}] ${error.message}`)

    switch (code) {
      case 'VALIDATION':
        set.status = 400
        return { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } }
      case 'NOT_FOUND':
        set.status = 404
        return { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } }
      case 'INTERNAL_SERVER_ERROR':
        set.status = 500
        return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }
      default:
        set.status = 500
        return { success: false, error: { code: 'UNKNOWN', message: error.message } }
    }
  })
```

### Step 6: Environment Config

```typescript
// src/config/env.ts
import { t } from 'elysia'
import { Value } from '@sinclair/typebox/value'

export const envSchema = t.Object({
  PORT: t.Optional(t.String()),
  NODE_ENV: t.Optional(t.Union([t.Literal('development'), t.Literal('production'), t.Literal('test')])),
  DATABASE_URL: t.String(),
  JWT_SECRET: t.String({ minLength: 32 }),
  CORS_ORIGIN: t.Optional(t.String()),
  LOG_LEVEL: t.Optional(t.String()),
})

export type Env = typeof envSchema.static

// Validate on startup (TypeBox has no safeParse; use Value.Check / Value.Errors)
if (!Value.Check(envSchema, Bun.env)) {
  const problems = [...Value.Errors(envSchema, Bun.env)].map((e) => `${e.path}: ${e.message}`)
  throw new Error(`Invalid environment configuration: ${problems.join('; ')}`)
}
export const env = Bun.env as unknown as Env
```

### Step 7: Eden Treaty Client

```typescript
// client/eden.ts (separate frontend package)
import { treaty } from '@elysiajs/eden' // Eden Treaty 2
import type { App } from '../server/src/app'

export const client = treaty<App>('localhost:3000')

// Usage: path segments become properties, dynamic params become calls
const { data, error } = await client.users({ id: '42' }).get({
  headers: { authorization: `Bearer ${token}` },
})
if (error) console.error(error.status, error.value)
else console.log(data)
```

## Implementation Patterns

### Pattern: Scoped State per Request

```typescript
const app = new Elysia()
  .state('db', dbConnection)                 // app-wide, set once
  .derive(({ headers }) => ({                // per request, before validation
    requestId: headers['x-request-id'] ?? crypto.randomUUID(),
  }))
  .onAfterResponse(({ request, requestId, set }) => {
    console.log(`[${requestId}] ${request.method} ${new URL(request.url).pathname} ${set.status}`)
  })
// onRequest runs before derive, so it cannot read requestId
```

### Pattern: Type-Safe Response

```typescript
const app = new Elysia()
  .get('/orders/:id', ({ params }) => {
    return {
      id: params.id,
      items: [],
      total: 0
    }
  }, {
    response: t.Object({
      id: t.String(),
      items: t.Array(t.Object({
        product: t.String(),
        price: t.Number(),
        qty: t.Number(),
      })),
      total: t.Number(),
    })
  })
```

## Production Considerations

### Performance
- Elysia uses Bun's HTTP server (native, fast) — no `node:http` overhead
- Keep handlers async to leverage Bun's I/O multiplexing
- `t` schemas are validated at runtime by TypeBox's compiled validators (fast, not free); keep response schemas on hot routes lean
- Use `derive` for values from raw headers; use `resolve` only when you need validated input
- Static files via `@elysiajs/static` plugin (Bun.file for custom serving)

### CORS Configuration
```typescript
app.use(cors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
```

### Rate Limiting
Use a maintained plugin (e.g. `elysia-rate-limit`) for single-instance limits, or a Redis-backed limiter in `onRequest` for multi-instance deployments (see `skills/backend/universal/rate-limiting/SKILL.md`). Never keep counters in `process.env`/`Bun.env` or unbounded in-memory maps.

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Global state mutation | Race conditions | Use scoped derive or resolve |
| Inline schema everywhere | Duplication, hard to maintain | Shared schema files per module |
| Missing `onError` handler | Raw stack traces to client | Global error handler plugin |
| Direct `Bun.env` access | Untyped, missing defaults | Validated env config on startup |
| Wrong hook scope in plugins | Plugin hooks default to `local`, so a plugin's `derive`/guards do not apply to the parent app | Use `{ as: 'scoped' }` (parent) or `{ as: 'global' }` deliberately |
| Heavy logic in guards | Routes hard to test | Extract to service layer |

## Security Considerations
- Elysia's `t.Object` with `format: 'email'` and `minLength` for input validation
- JWT via `@elysiajs/jwt` — algorithm defaults to `HS256`, never `none`
- Rate limiting at proxy/reverse proxy level for production (nginx, cloudflare)
- CORS with explicit origins — never `*` in production
- Helmet-like headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
- Auth plugin uses resolve/derive — tokens verified before handler runs

## Testing Strategies

### Unit Testing Services
```typescript
import { describe, expect, test } from 'bun:test'

test('user service creates valid user', async () => {
  const user = await userService.create({ name: 'Test', email: 'test@test.com' })
  expect(user.id).toBeString()
  expect(user.email).toBe('test@test.com')
})
```

### Integration Testing with Elysia
```typescript
import { describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'

const app = createApp()

test('POST /users creates user', async () => {
  const res = await app.handle(
    new Request('http://localhost/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@test.com' }),
    })
  )
  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.data.name).toBe('Test')
})

test('GET /users/:id returns 404', async () => {
  const res = await app.handle(new Request('http://localhost/users/nonexistent'))
  expect(res.status).toBe(404)
})
```

## Rules
- Plugins registered before modules. Global plugins (cors, swagger, error handler) before domain plugins.
- Each module is an Elysia instance with `{ prefix }` — no inline route registration in `app.ts`.
- Validation schemas defined per module, not globally. Reused via `t.Object` exports.
- All environment vars validated at startup — fail fast on missing config.
- `derive` for per-request data (user, requestId), `state` for app-wide data (db, config).
- Error handler as global `onError` — never try/catch in handlers.
- Eden Treaty client generated from server type exports for full-stack type safety.

## References
  - references/elysia-custom-plugins.md — Custom Plugin Development
  - references/elysia-deployment.md — Deployment Guide
  - references/elysia-lifecycle.md — Lifecycle Hooks
  - references/elysia-plugins-ecosystem.md — Plugin Ecosystem
  - references/elysia-plugins.md — Elysia Plugins
  - references/elysia-routing-validation.md — Routing and Validation
  - references/elysia-testing.md — Testing Patterns
  - references/elysia-type-safety-patterns.md — Type Safety with Eden
## Handoff
Hand off to `backend/elysia/patterns/SKILL.md` for Elysia-specific patterns or `backend/universal/api-response/SKILL.md` for API response formatting.
