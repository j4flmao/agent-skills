---
name: elysia-architecture
description: >
  Use this skill when designing ElysiaJS on Bun backend architecture — plugins, lifecycle, validation with TypeScript-first design. This skill enforces: modular project structure, t validation schemas, lifecycle hook ordering, and Bun-native testing. Do NOT use for: frontend or mobile architecture, non-Elysia Bun scripts.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, elysia, phase-4]
---

# ElysiaJS Architecture

## Purpose
Define and enforce ElysiaJS project structure, plugin setup, validation, and lifecycle patterns.

## Agent Protocol

### Trigger
User request includes: `elysia`, `elysiajs`, `bun`, `elysia architecture`, `bun framework`, `elysia plugin`, `elysia lifecycle`.

### Input Context
- Bun version (latest stable)
- Project scope
- TypeScript configuration

### Output Artifact
A markdown document containing:
- Project structure
- Elysia app setup with plugins
- Route design with schema validation
- Lifecycle hooks (beforeHandle, afterHandle, transform)
- Error handling
- Testing with Bun test runner

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output.

### Max Response Length
4096 tokens

## Architecture / Decision Trees

### Project Structure Options

**Option A: Feature Modules**
```
src/
├── modules/
│   ├── orders/
│   │   ├── order.controller.ts
│   │   ├── order.service.ts
│   │   ├── order.schema.ts
│   │   └── order.routes.ts
│   └── users/
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.schema.ts
│       └── user.routes.ts
├── plugins/
│   ├── auth.ts
│   ├── cors.ts
│   └── logger.ts
├── common/
│   ├── errors.ts
│   └── types.ts
├── index.ts
└── app.ts
```
Best for: medium-to-large projects with clear domain boundaries. Each module is self-contained.

**Option B: Layer-Based Structure**
```
src/
├── controllers/
├── services/
├── schemas/
├── routes/
├── plugins/
└── app.ts
```
Best for: small projects where cross-cutting concerns dominate. Risk of bloated directories.

**Option C: Monolith-in-Modules**
```
src/
├── core/
│   ├── app.ts
│   ├── config.ts
│   └── errors.ts
├── features/
│   ├── orders/
│   └── users/
└── shared/
    ├── middleware/
    └── utils/
```
Best for: projects that will eventually split into microservices. Explicit boundary between core, feature, and shared.

### Plugin Architecture Decision Tree

```
Do you need to share state across routes?
├── Yes → Use plugin with .state() or .decorate()
├── No → Is the logic reusable across projects?
│   ├── Yes → Extract to standalone Elysia plugin package
│   └── No → Keep local in plugins/ directory
```

### Lifecycle Hook Order Decision

```
Request arrives
  ↓
onRequest (raw request, before parsing)
  ↓
transform (modify request before validation)
  ↓
beforeHandle (auth checks, guards)
  ↓
handler (actual route handler)
  ↓
afterHandle (response transformation)
  ↓
onResponse (logging, cleanup)
  ↓
Response sent
```

## Workflow

### Step 1: Set Up Project Structure
Use feature-module structure with self-contained modules. Each module exports its routes as an Elysia instance. Avoid circular dependencies by keeping schema definitions separate from route handlers.

```typescript
// app.ts
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { orderRoutes } from './modules/orders/order.routes';

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(orderRoutes)
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') return { success: false, error: 'Not found' };
    return { success: false, error: error.message };
  })
  .listen(3000);
```

### Step 2: Configure Module Routes
Each module registers its own routes as a plugin. Use guard for shared middleware within a module. Use derive for injecting computed context values.

```typescript
// modules/orders/order.routes.ts
import { Elysia, t } from 'elysia';
import { orderService } from './order.service';
import { createOrderSchema, updateOrderSchema } from './order.schema';

export const orderRoutes = new Elysia({ prefix: '/orders' })
  .derive(({ headers }) => {
    const userId = headers['x-user-id'];
    return { userId };
  })
  .guard({
    beforeHandle: ({ userId, error }) => {
      if (!userId) return error(401, 'Unauthorized');
    }
  })
  .get('/', () => orderService.findAll())
  .get('/:id', ({ params: { id } }) => orderService.findById(id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) })
  })
  .post('/', ({ body, userId }) => orderService.create(body, userId), {
    body: createOrderSchema
  })
  .patch('/:id', ({ params: { id }, body }) => orderService.update(id, body), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: updateOrderSchema
  })
  .delete('/:id', ({ params: { id } }) => orderService.delete(id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) })
  });
```

### Step 3: Add Validation with Elysia t
Elysia t provides runtime validation that generates OpenAPI schema automatically. Define schemas separately from routes for reuse in tests.

```typescript
import { t } from 'elysia';

export const createOrderSchema = t.Object({
  customerId: t.String({ format: 'uuid' }),
  items: t.Array(t.Object({
    productId: t.String({ format: 'uuid' }),
    quantity: t.Integer({ minimum: 1 }),
    unitPrice: t.Number({ minimum: 0 })
  }), { minItems: 1 }),
  shippingAddress: t.Optional(t.Object({
    street: t.String(),
    city: t.String(),
    zipCode: t.String({ pattern: '^[0-9]{5}$' }),
    country: t.String({ minLength: 2, maxLength: 2 })
  })),
  couponCode: t.Optional(t.String())
});

export const updateOrderSchema = t.Partial(
  t.Omit(createOrderSchema, ['customerId', 'items'])
);
```

### Step 4: Implement Lifecycle Hooks
Order hooks from outermost to innermost: onRequest, transform, beforeHandle, handler, afterHandle, onResponse, onError. Use guard for scoped middleware. Use derive for request enrichment. Use resolve for deferred computation after validation.

```typescript
const guard = new Elysia()
  .guard({
    beforeHandle: async ({ headers, error }) => {
      const token = headers.authorization?.split(' ')[1];
      if (!token) return error(401, 'Missing token');
      const payload = await verifyJWT(token);
      return { user: payload };
    }
  })
  .resolve({})
  .onError(({ code, error }) => {
    if (code === 'VALIDATION') return { error: 'Validation failed', details: error.validator.Errors };
  });
```

### Step 5: Error Handling
Centralized error handler catches all error codes. Use typed error classes for business logic errors. Return structured JSON with consistent shape.

```typescript
import { Elysia } from 'elysia';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return { success: false, code: error.code, message: error.message, details: error.details };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { success: false, code: 'NOT_FOUND', message: 'Resource not found' };
    }
    if (code === 'VALIDATION') {
      set.status = 422;
      return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed' };
    }
    set.status = 500;
    return { success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
  });
```

### Step 6: Testing with Bun Test Runner
Use Bun's built-in test runner. Create test instances of Elysia app with `app.modify()`. Use `app.handle()` for HTTP request simulation.

```typescript
import { describe, expect, it } from 'bun:test';
import { app } from '../src/app';

describe('Orders API', () => {
  it('creates an order', async () => {
    const req = new Request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'user-1' },
      body: JSON.stringify({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [{ productId: '660e8400-e29b-41d4-a716-446655440001', quantity: 2, unitPrice: 10 }]
      })
    });
    const res = await app.handle(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('rejects invalid order data', async () => {
    const req = new Request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'user-1' },
      body: JSON.stringify({ customerId: 'invalid', items: [] })
    });
    const res = await app.handle(req);
    expect(res.status).toBe(422);
  });
});
```

### Step 7: Plugin Scoping and Composition
Plugins can be scoped globally or to specific routes. Use local plugins for feature-specific middleware and global plugins for cross-cutting concerns.

```typescript
// Global plugin: applied to all routes
const logger = new Elysia()
  .onRequest(({ request }) => console.log(`→ ${request.method} ${request.url}`))
  .onResponse(({ request, set }) => console.log(`← ${request.method} ${request.url} ${set.status}`));

// Scoped plugin: applied only to admin routes
const adminGuard = new Elysia()
  .guard({
    beforeHandle: ({ headers, error }) => {
      if (headers['x-role'] !== 'admin') return error(403, 'Forbidden');
    }
  });

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(adminGuard)
  .get('/users', () => userService.listAll());
```

## Common Pitfalls

### Pitfall 1: Mutating Shared State Across Plugins
Elysia plugins share the same store instance. Mutating `.state` in one plugin affects all others. Always use `.decorate()` for read-only dependencies and `.state()` for truly global state with clear ownership.

### Pitfall 2: Overusing `derive` for Expensive Operations
`derive` runs on every request. Avoid database calls or crypto operations inside derive. Use `resolve` instead, which runs after validation and can conditionalize on request data.

### Pitfall 3: Ignoring Lifecycle Order
Placing error-prone logic in `transform` before validation means untyped errors. Place auth checks in `beforeHandle`, data transformation in `afterHandle`, logging in `onResponse`.

### Pitfall 4: No TypeScript Strict Mode
Elysia relies heavily on type inference. Without `strict: true` in tsconfig.json, inferred types from `t.Object` schemas may produce incorrect or overly permissive types.

### Pitfall 5: Mixing sync and async in Lifecycle Hooks
Elysia hooks support both sync and async returns. A sync hook that throws will not be caught by onError if it is not wrapped. Always return error responses explicitly from hooks rather than throwing.

### Pitfall 6: Circular Plugin Dependencies
Plugin A depends on state set by Plugin B, and Plugin B depends on state set by Plugin A. This creates runtime undefined state. Resolve by extracting shared state into a common dependency plugin loaded first.

### Pitfall 7: Skipping Schema Validation on Internal Routes
Internal routes that call each other can bypass validation. Always validate at the boundary even for internal endpoints. Use Elysia group with validation schemas to enforce this.

### Pitfall 8: Not Handling WebSocket Cleanup
Elysia supports WebSocket via `ws` plugin. Failing to clean up connections on server shutdown leads to memory leaks. Track connections and close them in `onStop`.

## Best Practices

- Use `t.Object` for all request validation. Never use `any` or manual parsing in route handlers.
- Split schemas into a separate file per module for reuse across routes and tests.
- Use `derive` for lightweight context enrichment (parsing headers) and `resolve` for heavier async operations (loading user from DB).
- Keep plugins stateless. If state is needed, inject it via `.state()` at app level, not inside the plugin.
- Name all routes with `.setName()` for OpenAPI schema generation.
- Use `group` for versioning API groups: `app.group('/v1', (app) => app.use(v1Routes))`.
- Write tests using `bun:test` with `app.handle()` for end-to-end route testing.
- Configure OpenAPI via `@elysiajs/swagger` with explicit tags and descriptions.
- Use `HttpError` from Elysia for standard HTTP errors and custom error classes for domain errors.
- Set up `.env` validation at app bootstrap with `@t3-oss/env-core`.

## Compared With

### Elysia vs Hono
Hono is faster in raw benchmarks but Elysia provides superior TypeScript inference via Eden Treaty. Elysia's plugin system is more structured than Hono's middleware chain. Hono supports more adapters (Cloudflare Workers, Deno). Choose Hono for edge deployments, Elysia for full-featured API servers.

### Elysia vs Express
Express has a massive ecosystem but lacks native TypeScript support and built-in validation. Elysia provides end-to-end type safety with Eden, built-in schema validation, and faster performance via Bun. Express is better for legacy codebases and when migration cost outweighs benefits.

### Elysia vs Fastify
Fastify has superior plugin encapsulation with `register` scoping. Elysia uses a flatter model. Fastify has more production deployment history. Elysia offers better developer experience with TypeScript inference and simpler API. Both support OpenAPI generation.

### Elysia vs Hapi
Hapi provides enterprise-grade configuration and request lifecycle. Elysia is more modern and TypeScript-native. Hapi is heavier and less active in development. Elysia's Bun-native execution gives it performance advantages.

### Elysia vs tRPC
tRPC is for full-stack TypeScript where client and server are in the same monorepo. Elysia with Eden Treaty provides similar end-to-end typing but works with HTTP APIs, making it suitable for third-party clients. Use tRPC for internal full-stack apps, Elysia for public APIs and microservices.

## Performance Considerations

- Bun's HTTP server handles ~60k req/s on a single core. Elysia overhead is ~5-10% over raw Bun.
- Validation with Elysia t is CPU-bound. Use `t.Object` with minimal transforms for high-throughput endpoints.
- Plugin composition adds per-request overhead. Inline middleware for performance-critical paths instead of separate plugins.
- Minimize `derive` usage on hot paths. Each derive call creates a new object merge.
- Use `etag` plugin for response caching on GET endpoints.
- Configure `maxBodySize` to prevent memory exhaustion from large payloads.
- Static file serving should use `@elysiajs/static` with appropriate cache headers.
- For high-concurrency workloads, use Bun's `--smol` flag to reduce memory footprint.
- Database queries inside lifecycle hooks block the event loop. Use connection pooling and async queries.
- Profile with `bun --profile` to identify hot paths. Focus optimization on routes with highest request volume.

## Rules
- Modules grouped by domain feature, not by technical layer.
- All input validation uses Elysia `t` schemas. No manual validation.
- Error handler catches all codes, returns structured JSON with consistent shape.
- Plugins are scoped and reusable across projects.
- TypeScript strict mode enabled in tsconfig.json.
- Lifecycle hooks ordered: transform, beforeHandle, handler, afterHandle.
- Never mutate state across plugin boundaries. Use decorator for read-only access.
- Always validate at route boundary even for internal endpoints.
- Use `bun:test` with `app.handle()` for integration tests.
- Implement `onStop` hook for cleanup (DB connections, WebSocket, file handles).
- Use `.guard()` for grouped middleware instead of repeating in each route.
- Prefer `resolve` over `derive` for async operations that depend on validated data.
- Generate OpenAPI spec with `@elysiajs/swagger` in development.
- Set `maxBodySize` to prevent payload-based DoS.
- Use `@elysiajs/cors` with explicit origin whitelist in production.

## References
- `references/elysia-custom-plugins.md` — Building and publishing reusable Elysia plugins
- `references/elysia-deployment.md` — Deploying Elysia apps to production (Docker, Fly.io, Railway)
- `references/elysia-lifecycle.md` — Lifecycle hook order, guards, derive, and resolve
- `references/elysia-plugins.md` — Official and community plugin ecosystem
- `references/elysia-routing-validation.md` — Route design, validation schemas, OpenAPI
- `references/elysia-testing.md` — Testing patterns with Bun test runner
- `references/elysia-plugins-ecosystem.md` — Deep dive into plugin ecosystem, community plugins, custom plugin development
- `references/elysia-type-safety-patterns.md` — End-to-end type safety with Eden Treaty, type inference patterns

## Handoff
Hand off to `backend/elysia/patterns/SKILL.md` for Elysia patterns.
