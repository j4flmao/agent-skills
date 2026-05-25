---
name: fastify-backend
description: >
  Use this skill when building Fastify backend applications — fast, low overhead, schema-based JSON validation, plugin architecture. This skill enforces: schema-driven serialization, plugin encapsulation, proper hook ordering, logger integration. Do NOT use for: Express projects, Hono edge applications, NestJS projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, phase-4]
---

# Fastify Backend

## Purpose
Define Fastify backend application architecture: schema-based serialization, plugin encapsulation, hook lifecycle, and high-performance request handling.

## Agent Protocol

### Trigger
User request includes: `fastify`, `fastify backend`, `fastify plugin`, `fastify schema`, `fastify hooks`, `fastify validation`, `fastify typescript`, `fastify serialization`.

### Input Context
- Runtime (Node.js 18+, Bun)
- Language (TypeScript, JavaScript)
- Validation library (JSON Schema, TypeBox, Zod)
- Serialization (fast-json-stringify, custom)
- Project type (REST API, GraphQL, WebSocket)

### Output Artifact
A markdown document containing:
- Project structure
- Plugin encapsulation pattern
- Schema validation and serialization
- Hook lifecycle ordering
- Error handling with custom error formatter
- TypeBox integration for typed schemas
- Testing (tap, vitest, fastify.inject)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Schemas defined with TypeBox or JSON Schema for all routes
- Plugins encapsulated with proper prefix and dependencies
- Hooks ordered: onRequest → preParsing → preValidation → preHandler
- Custom error formatter returns consistent error envelope
- Tests use fastify.inject for HTTP-less testing

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
npm init fastify
# or manually
npm install fastify @fastify/cors @fastify/helmet
npm install @sinclair/typebox    # typed schema builder
npm install vitest               # testing
```

### Step 2: Project Structure
```
src/
├── app.ts
├── server.ts
├── plugins/
│   ├── cors.ts
│   ├── swagger.ts
│   └── auth.ts
├── modules/
│   ├── orders/
│   │   ├── order.routes.ts
│   │   ├── order.service.ts
│   │   ├── order.schema.ts      # TypeBox schemas
│   │   └── order.test.ts
│   ├── products/
│   │   └── product.routes.ts
│   └── health/
│       └── health.routes.ts
├── lib/
│   ├── errors.ts
│   └── env.ts
└── types/
    └── index.ts
```

### Step 3: App Initialization
```typescript
// src/app.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { orderRoutes } from './modules/orders/order.routes'
import { healthRoutes } from './modules/health/health.routes'
import { AppError } from './lib/errors'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: '*' })

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message },
      })
    }
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION', message: 'Invalid request', details: error.validation },
      })
    }
    request.log.error(error)
    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL', message: 'Internal server error' },
    })
  })

  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(orderRoutes, { prefix: '/api/orders' })

  return app
}
```

### Step 4: Schema Validation with TypeBox
```typescript
// src/modules/orders/order.schema.ts
import { Type, Static } from '@sinclair/typebox'

export const CreateOrderSchema = Type.Object({
  customerId: Type.String({ format: 'uuid' }),
  items: Type.Array(Type.Object({
    sku: Type.String({ minLength: 1 }),
    quantity: Type.Integer({ minimum: 1 }),
    price: Type.Number({ minimum: 0 }),
  }), { minItems: 1 }),
})

export type CreateOrderRequest = Static<typeof CreateOrderSchema>

export const OrderResponseSchema = Type.Object({
  id: Type.String(),
  customerId: Type.String(),
  status: Type.String(),
  totalAmount: Type.Number(),
  createdAt: Type.String(),
})

// src/modules/orders/order.routes.ts
import { FastifyPluginAsync } from 'fastify'
import { CreateOrderSchema, OrderResponseSchema } from './order.schema'
import * as orderService from './order.service'

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', {
    schema: {
      body: CreateOrderSchema,
      response: { 201: OrderResponseSchema },
    },
  }, async (request, reply) => {
    const order = await orderService.create(request.body)
    return reply.status(201).send(order)
  })

  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      response: { 200: OrderResponseSchema },
    },
  }, async (request, reply) => {
    const order = await orderService.findById(request.params.id)
    if (!order) return reply.status(404).send({ error: 'Not found' })
    return order
  })
}
```

### Step 5: Hook Lifecycle
```typescript
app.addHook('onRequest', async (request, reply) => {
  // Security headers, request ID
})

app.addHook('preParsing', async (request, reply, payload) => {
  // Body parsing modifications
})

app.addHook('preValidation', async (request, reply) => {
  // Auth check before schema validation
})

app.addHook('preHandler', async (request, reply) => {
  // Rate limiting, audit log
})

app.addHook('onSend', async (request, reply, payload) => {
  // Response transformation
})

app.addHook('onResponse', async (request, reply) => {
  // Metrics, cleanup
})
```

### Step 6: Testing with inject
```typescript
// src/modules/orders/order.test.ts
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../app'

describe('Order Routes', () => {
  it('POST / creates order', async () => {
    const app = await buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: validPayload,
    })
    expect(response.statusCode).toBe(201)
  })

  it('POST / validates body', async () => {
    const app = await buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })
})
```

## Rules
- Schema validation + serialization for all routes — never manual JSON.stringify.
- Plugins encapsulated with register — avoid app-level global state.
- Hook ordering: onRequest → preParsing → preValidation (auth) → preHandler → onSend → onResponse.
- Custom error formatter defined globally with setErrorHandler.
- TypeBox preferred over raw JSON Schema for TypeScript projects.
- fastify.inject for tests — no HTTP server needed.

## References

### Reference Files
- `references/fastify-setup.md` — Fastify setup, configuration, hooks
- `references/fastify-plugins.md` — Plugin architecture, encapsulation, ecosystem
- `references/fastify-validation.md` — Schema validation, TypeBox, serialization, AJV config
- `references/fastify-advanced-plugins.md` — Advanced plugins, decorators, hooks, encapsulation

### Related Skills
- `backend/nodejs/architecture/SKILL.md` — Node.js architecture
- `backend/nodejs/hono/SKILL.md` — Hono alternative
- `backend/universal/api-response/SKILL.md` — API response envelope

## Handoff
Hand off to `backend/nodejs/architecture/SKILL.md` for full Node.js architecture.
