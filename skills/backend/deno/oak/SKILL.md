---
name: oak-backend
description: >
  Use this skill when building Oak backend applications — Deno native HTTP framework, middleware context, composable middleware. This skill enforces: middleware composition, proper context usage, Deno permissions, type-safe routing. Do NOT use for: Node.js Express projects, Hono on Deno, traditional Node.js backends.
version: "1.0.0"
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
Define Oak backend application architecture: Deno-native HTTP server, middleware composition, router pattern, and context management.

## Agent Protocol

### Trigger
User request includes: `oak`, `oak backend`, `deno oak`, `oak middleware`, `oak router`, `deno http`, `oak context`, `oak typescript`.

### Input Context
- Deno version (1.40+)
- Oak version (13.x)
- Language (TypeScript)
- Database (Deno KV, MongoDB via deno_mongo, PostgreSQL via deno_postgres)
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
- Testing (Deno.test, superdeno)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Router separates route definitions from app setup
- Middleware pipeline composed with app.use()
- Error middleware catches all exceptions
- State typed via OakMiddleware type parameter
- Tests use superdeno or fetch-based requests

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
# Create project directory
mkdir -p order-service/src
cd order-service

# Initialize
deno init

# Add oak dependency (import_map.json or deno.json)
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
└── import_map.json
```

### Step 3: App Initialization
```typescript
// src/app.ts
import { Application } from 'oak'
import { errorMiddleware } from './middleware/error.ts'
import { loggerMiddleware } from './middleware/logger.ts'
import { router } from './router/index.ts'

export function createApp(): Application {
  const app = new Application()

  // State
  app.state.startTime = Date.now()

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
import { Router } from 'oak'
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
import type { RouterContext } from 'oak'
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
    const body = await ctx.request.body().value
    const order = await orderService.create(body)
    ctx.response.status = 201
    ctx.response.body = order
  }
}
```

### Step 5: Middleware
```typescript
// src/middleware/error.ts
import type { Middleware } from 'oak'

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.response.status = err.status ?? 500
    ctx.response.body = {
      success: false,
      error: {
        code: err.code ?? 'INTERNAL_ERROR',
        message: err.message ?? 'Unexpected error',
      },
    }
    ctx.response.type = 'json'
  }
}

// src/middleware/logger.ts
import type { Middleware } from 'oak'

export const loggerMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms`)
}
```

### Step 6: Testing
```typescript
// tests/orders_test.ts
import { createApp } from '../src/app.ts'
import { assertEquals } from 'std/testing/asserts.ts'

Deno.test('POST /api/orders creates order', async () => {
  const app = createApp()
  const listener = app.listen({ port: 0 })

  const port = (await listener).port
  const res = await fetch(`http://localhost:${port}/api/orders`, {
    method: 'POST',
    body: JSON.stringify(validPayload),
    headers: { 'Content-Type': 'application/json' },
  })
  assertEquals(res.status, 201)

  listener.close()
})
```

## Rules
- TypeScript strict mode — all files .ts extension.
- Router instances separate from Application — never inline routes.
- Middleware pipeline: error → logger → auth → router.
- Context state for per-request data (user, requestId).
- Oak Router prefix for route grouping — never manual path concatenation.
- Deno.env for all configuration — never hardcoded values.
- deno.json for imports — import_map.json for legacy projects.

## References
  - references/deno-runtime-guide.md — Deno Runtime Guide
  - references/oak-middleware.md — Oak Middleware
  - references/oak-performance.md — Oak Performance Optimization
  - references/oak-routing-deployment.md — Oak Routing and Deployment
  - references/oak-setup.md — Oak Setup Guide
  - references/oak-testing.md — Oak Testing
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
