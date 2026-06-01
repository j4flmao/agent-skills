---
name: elysia-architecture
description: >
  Use this skill when structuring Elysia.js applications — Bun-native web framework, plugin system, lifecycle hooks, type-safe routing with Eden Treaty. This skill enforces: plugin-based architecture, Elysia lifecycle (state/derive/resolve/onRequest/afterHandle), TypeScript strict mode, Eden Treaty client generation. Requires Bun (bun create elysia). Do NOT use for: Express.js projects, Node.js apps, or non-Elysia Bun projects.
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
- Type-safe schema with Elysia t.policy
- Eden Treaty client generated for frontend
- Environment config with Elysia config plugin

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

| Hook | Purpose | Use Case |
|------|---------|----------|
| `state` | Initialize app state | DB connections, config |
| `derive` | Compute derived state | Request-local cache |
| `resolve` | Resolve dependencies | Auth user from token |
| `onRequest` | Pre-handler | Logging, CORS, rate limit |
| `beforeHandle` | Pre-validation | Auth check, permissions |
| `afterHandle` | Post-handler | Transform response, caching |
| `onError` | Error handler | Global error mapping |
| `onResponse` | After response sent | Metrics, cleanup |

Order matters: `state → derive → resolve → onRequest → beforeHandle → handler → afterHandle → onError/onResponse`.

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
import { swagger } from '@elysiajs/swagger'
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
  .get('/:id', async ({ params }) => {
    const user = await userService.findById(params.id)
    if (!user) return { error: 'Not found', status: 404 }
    return { data: user }
  }, {
    params: UserParamsSchema,
    response: t.Object({ data: UserResponseSchema }),
  })
  .post('/', async ({ body }) => {
    const user = await userService.create(body)
    return { data: user }
  }, {
    body: CreateUserSchema,
    response: t.Object({ data: UserResponseSchema }),
    status: 201,
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

export const envSchema = t.Object({
  PORT: t.Optional(t.String()),
  NODE_ENV: t.Optional(t.Union([t.Literal('development'), t.Literal('production'), t.Literal('test')])),
  DATABASE_URL: t.String(),
  JWT_SECRET: t.String({ minLength: 32 }),
  CORS_ORIGIN: t.Optional(t.String()),
  LOG_LEVEL: t.Optional(t.String()),
})

export type Env = typeof envSchema.static

// Validate on startup
const envCheck = envSchema.safeParse(Bun.env)
if (!envCheck.success) {
  console.error('Invalid environment:', envCheck.error)
  process.exit(1)
}
```

### Step 7: Eden Treaty Client

```typescript
// client/eden.ts (separate frontend package)
import { edenTreaty } from '@elysiajs/eden'
import type { App } from '../server/src/app'

export const client = edenTreaty<App>('http://localhost:3000')

// Usage
const { data, error } = await client.users({ headers: { authorization: `Bearer ${token}` }}).get()
if (error) console.error(error)
else console.log(data)
```

## Implementation Patterns

### Pattern: Scoped State per Request

```typescript
const app = new Elysia()
  .state('db', dbConnection)
  .derive({ as: 'scoped' }, ({ request }) => ({
    requestId: crypto.randomUUID(),
  }))
  .onRequest(({ request, store, requestId }) => {
    console.log(`[${requestId}] ${request.method} ${request.url}`)
  })
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
- Use `t.Object` validation — compile-time schemas, zero runtime overhead
- Avoid `resolve` for every request — prefer `derive` for per-request data
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
```typescript
// Manual rate limiter as derive
app.derive({ as: 'scoped' }, ({ headers, set }) => {
  const ip = headers['x-forwarded-for'] || 'unknown'
  const key = `rate:${ip}`
  const count = parseInt(Bun.env[key] || '0')
  if (count > 100) {
    set.status = 429
    return { rateLimited: true }
  }
  Bun.env[key] = String(count + 1)
  return { rateLimited: false }
})
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Global state mutation | Race conditions | Use scoped derive or resolve |
| Inline schema everywhere | Duplication, hard to maintain | Shared schema files per module |
| Missing `onError` handler | Raw stack traces to client | Global error handler plugin |
| Direct `Bun.env` access | Untyped, missing defaults | Validated env config on startup |
| No `as: 'scoped'` on derive | State leaks between requests | Always scope per-request data |
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
