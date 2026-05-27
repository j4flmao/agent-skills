---
name: hono-backend
description: >
  Use this skill when building Hono backend applications — ultra-fast, edge-ready, multi-runtime (Cloudflare Workers, Deno, Bun, Node.js). This skill enforces: middleware pipeline ordering, typed routes with Zod, proper context management, runtime-agnostic patterns. Do NOT use for: Express projects, Fastify applications, traditional Node.js-only backends.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, deno, bun, edge, phase-4]
---

# Hono Backend

## Purpose
Define Hono backend application architecture: multi-runtime setup, middleware pipeline, typed routing, edge deployment patterns, and validation integration.

## Agent Protocol

### Trigger
User request includes: `hono`, `hono backend`, `hono cloudflare`, `hono edge`, `hono middleware`, `hono routing`, `hono bun`, `hono deno`, `ultra-fast api`.

### Input Context
- Runtime (Cloudflare Workers, Deno, Bun, Node.js)
- Language (TypeScript, JavaScript)
- Validation library (Zod, Valibot, TypeBox)
- Deployment target (Workers, Deno Deploy, Bun server, Node.js)
- API style (REST, Hono RPC)

### Output Artifact
A markdown document containing:
- Project structure
- App initialization per runtime
- Middleware pipeline ordering
- Route grouping and typed routes
- Zod validation integration
- Error handling patterns
- RPC client setup (with hono/client)
- Testing (vitest, hono/test)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- App initializes correctly for target runtime
- Middleware pipeline ordered by responsibility
- Routes validate inputs with Zod schemas
- Error handler catches all exceptions
- Tests use hono/test utilities

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup by Runtime

| Runtime | Init command |
|---|---|
| **Node.js** | `npm create hono@latest` |
| **Bun** | `bun create hono@latest` |
| **Cloudflare Workers** | `npm create hono@latest -- --template cloudflare-workers` |
| **Deno** | `deno run -A npm:create-hono@latest` |

### Step 2: Project Structure
```
src/
├── index.ts              # Runtime entry point
├── app.ts                # Hono app factory
├── modules/
│   ├── orders/
│   │   ├── order.routes.ts
│   │   ├── order.service.ts
│   │   └── order.schema.ts
│   ├── products/
│   │   └── product.routes.ts
│   └── users/
│       └── user.routes.ts
├── middleware/
│   ├── auth.ts
│   ├── error-handler.ts
│   └── request-id.ts
└── lib/
    ├── env.ts
    └── types.ts
```

### Step 3: App Initialization
```typescript
// src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from './middleware/error-handler'
import { orderRoutes } from './modules/orders/order.routes'
import type { AppEnv } from './lib/types'

const app = new Hono<AppEnv>()

app.use('*', cors())
app.use('*', logger())
app.use('*', errorHandler)

app.route('/api/orders', orderRoutes)
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

### Step 4: Typed Routes with Validation
```typescript
// src/modules/orders/order.schema.ts
import { z } from 'zod'

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
})

export const OrderParamsSchema = z.object({
  id: z.string().uuid(),
})

// src/modules/orders/order.routes.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateOrderSchema, OrderParamsSchema } from './order.schema'
import * as orderService from './order.service'

export const orderRoutes = new Hono()

orderRoutes.post('/', zValidator('json', CreateOrderSchema), async (c) => {
  const data = c.req.valid('json')
  const order = await orderService.create(data)
  return c.json(order, 201)
})

orderRoutes.get('/:id', zValidator('param', OrderParamsSchema), async (c) => {
  const { id } = c.req.valid('param')
  const order = await orderService.findById(id)
  if (!order) return c.json({ error: 'Not found' }, 404)
  return c.json(order)
})
```

### Step 5: Error Handling
```typescript
// src/middleware/error-handler.ts
import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof HTTPException) {
      return c.json({ code: 'HTTP_ERROR', message: err.message }, err.status)
    }
    if (err instanceof ZodError) {
      return c.json({ code: 'VALIDATION', errors: err.errors }, 400)
    }
    console.error('Unhandled:', err)
    return c.json({ code: 'INTERNAL', message: 'Internal error' }, 500)
  }
}
```

### Step 6: Testing
```typescript
// src/modules/orders/order.test.ts
import { describe, expect, it } from 'vitest'
import app from '../../app'

describe('Order Routes', () => {
  it('POST /api/orders creates order', async () => {
    const res = await app.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(201)
  })

  it('POST /api/orders validates body', async () => {
    const res = await app.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
  })
})
```

## Rules
- Runtime-agnostic core logic — runtime-specific code only in entry point.
- Zod validation via zValidator middleware for all inputs.
- Error handler catches HTTPException and ZodError globally.
- RPC client type inference preferred over manual client generation.
- Middleware order: cors → logger → auth → routes → error.
- No global state — use c.env and c.set for per-request context.

## References
  - references/hono-custom-middleware.md — Hono Custom Middleware
  - references/hono-deployment.md — Hono Deployment
  - references/hono-middleware.md — Hono Middleware Guide
  - references/hono-rpc.md — Hono RPC Reference
  - references/hono-setup.md — Hono Setup Guide
  - references/hono-testing.md — Hono Testing Reference
## Handoff
Hand off to `backend/nodejs/architecture/SKILL.md` for full Node.js architecture.
