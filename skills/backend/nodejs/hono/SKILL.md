---
name: nodejs-hono
description: >
  Use this skill when building Hono applications — lightweight web framework, edge-ready, Zod validation, RPC client. This skill enforces: Hono app factory pattern, Zod validation middleware, RPC type-safe client, middleware composition, edge deployment readiness. Do NOT use for: Express.js apps, NestJS projects, or non-Hono frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, hono, phase-10]
---

# Node.js Hono

## Purpose
Build Hono applications — lightweight, edge-ready web framework with Zod validation, RPC client, and cross-runtime (Node, Bun, Deno, Cloudflare Workers) support.

## Agent Protocol

### Trigger
User request includes: `hono`, `hono app`, `hono middleware`, `hono rpc`, `hono zod`, `hono cloudflare`, `hono bun`, `ultralightweight`, `edge backend`.

### Input Context
- Runtime (Node.js, Bun, Deno, Cloudflare Workers)
- Hono version (4.x)
- Validation (Zod, TypeBox)
- Database (Drizzle, Prisma, D1)
- Auth (JWT, session, OAuth)

### Output Artifact
App setup, route patterns, middleware chain, RPC client config, validation setup.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Hono app created with correct runtime adapter
- Routes with Zod validation middleware
- RPC client configured for frontend type safety
- Middleware pipeline ordered correctly
- CORS and auth middleware registered

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Hono vs Express vs Fastify (for Node.js)

| Criterion | Hono | Express | Fastify |
|-----------|------|---------|---------|
| Performance | ~60k req/s | ~30k req/s | ~50k req/s |
| Bundle size | ~14KB | ~150KB | ~200KB |
| Edge support | Cloudflare, Deno, Bun, Lambda | Node only | Node + AWS Lambda |
| RPC type safety | Built-in (hono/client) | None | None |
| Validation | Zod/TypeBox middleware | Manual | Schema-first |
| Ecosystem | Small, growing | Largest | Medium |

Decision: Edge deployment or ultra-light → Hono. Full ecosystem → Express. Performance + schema → Fastify.

### Runtime Selection

| Runtime | Adapter | Best For |
|---------|---------|----------|
| Node.js | `@hono/node-server` | Existing Node ecosystem |
| Cloudflare Workers | `hono` (native) | Edge compute, D1, KV |
| Bun | `hono` (native) | Fast startup, TypeScript native |
| Deno | `hono` (npm/JSR) | Deno Deploy, permissions |
| Vercel | `@hono/vercel` | Serverless, Next.js BFF |
| AWS Lambda | `@hono/aws-lambda` | Lambda + API Gateway |

## Workflow

### Step 1: Project Bootstrap

```typescript
// src/index.ts (Node.js)
import { serve } from '@hono/node-server';
import { createApp } from './app';

const app = createApp();
const port = parseInt(process.env.PORT || '3000');

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on port ${info.port}`);
});

// src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { userModule } from './modules/users';
import { errorHandler } from './middleware/error-handler';

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', cors({ origin: process.env.CORS_ORIGIN }));
  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', errorHandler);

  // Routes
  app.route('/api/v1/users', userModule);

  // Health
  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}
```

### Step 2: Module Routes with Zod Validation

```typescript
// src/modules/users/index.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as userService from './service';

export const userModule = new Hono()
  .get('/', zValidator('query', z.object({
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(20),
  })), async (c) => {
    const { page, limit } = c.req.valid('query');
    const result = await userService.findAll(page, limit);
    return c.json(result);
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await userService.findById(id);
    if (!user) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: user });
  })
  .post('/', zValidator('json', z.object({
    name: z.string().min(2),
    email: z.string().email(),
  })), async (c) => {
    const body = c.req.valid('json');
    const user = await userService.create(body);
    return c.json({ data: user }, 201);
  })
  .put('/:id', zValidator('json', z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
  })), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const user = await userService.update(id, body);
    return c.json({ data: user });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await userService.delete(id);
    return c.body(null, 204);
  });
```

### Step 3: Auth Middleware (JWT)

```typescript
// src/middleware/auth.ts
import { Hono, Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';

// Type augmentation for context
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userRole: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : getCookie(c, 'token');

  if (!token) throw new HTTPException(401, { message: 'Unauthorized' });

  try {
    const payload = await verify(token, process.env.JWT_SECRET!);
    c.set('userId', payload.sub as string);
    c.set('userRole', payload.role as string);
    await next();
  } catch {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
}

// Usage
app.use('/api/v1/admin/*', authMiddleware);
app.get('/api/v1/admin/users', authMiddleware, async (c) => {
  const userId = c.get('userId');
  return c.json({ userId });
});
```

### Step 4: Error Handler

```typescript
// src/middleware/error-handler.ts
import { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  console.error(`[${c.req.method}] ${c.req.url}:`, err.message);

  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: { code: err.status, message: err.message },
    }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 400,
        message: 'Validation Error',
        details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      },
    }, 400);
  }

  return c.json({
    success: false,
    error: { code: 500, message: 'Internal Server Error' },
  }, 500);
};
```

### Step 5: RPC Client

```typescript
// src/client.ts (frontend or BFF)
import { hc } from 'hono/client';
import type { AppType } from '../server/app';

const client = hc<AppType>('http://localhost:3000');

// Type-safe API calls
async function getUsers() {
  const res = await client.api.v1.users.$get({
    query: { page: '1', limit: '10' },
  });
  if (res.ok) {
    const data = await res.json();
    return data;
  }
  throw new Error('Failed to fetch');
}

// Export for frontend usage
export { client };

// Server-side RPC export
// app.ts
export type AppType = typeof app;
```

### Step 6: Static File Serving

```typescript
import { serveStatic } from '@hono/node-server/serve-static';

// Production static file serving
app.use('/static/*', serveStatic({ root: './public' }));

// In development, use:
// import { serveStatic } from 'hono/serve-static'
```

## Implementation Patterns

### Pattern: Scoped Middleware Group

```typescript
// Admin routes with auth + audit middleware
const admin = new Hono()
  .use('*', authMiddleware)
  .use('*', auditMiddleware)
  .get('/users', async (c) => {
    const users = await adminService.listUsers();
    return c.json(users);
  })
  .post('/config', async (c) => {
    const body = await c.req.json();
    await adminService.updateConfig(body);
    return c.json({ success: true });
  });

app.route('/api/admin', admin);
```

### Pattern: Bearer Auth Helper

```typescript
import { bearerAuth } from 'hono/bearer-auth';

const token = process.env.API_TOKEN!;
app.use('/api/admin/*', bearerAuth({ token }));
```

## Production Considerations

### Edge Deployment (Cloudflare Workers)

```typescript
// src/worker.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';

const app = new Hono();

app.use('*', etag());
app.use('*', cors());

// D1 database binding
app.get('/users', async (c) => {
  const db = c.env.DB as D1Database;
  const result = await db.prepare('SELECT * FROM users').all();
  return c.json(result.results);
});

export default app;
```

### Performance
- Hono's `c.json()` auto-sets Content-Type for JSON strings
- Use `c.newResponse()` for custom headers and streaming
- Streaming: `c.stream()` for SSE and large responses
- Avoid `await c.req.parseBody()` in hot paths — use `zValidator('form')` instead

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Missing validation middleware | Manual parsing, security risk | Use `zValidator` on every mutation route |
| RPC without exported types | Client has no type inference | Export `AppType` from app entry point |
| Heavy sync initialization | Blocks startup, hurts cold start | Lazy init or `c.env` bindings |
| `c.req.json()` + separate validation | Duplicate parsing | Single `zValidator('json', schema)` |
| Direct `c.env` access (non-CF) | Not portable between runtimes | Abstract behind adapter/service |

## Security Considerations
- Hono's `secureHeaders()` sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Auth via `bearerAuth` or custom JWT middleware
- Zod validation strips unknown properties (`.strip()` by default)
- CORS with explicit origin — never `*` in production
- CSRF protection via token in headers for cookie-based auth
- Rate limiting at gateway/CDN for edge deployments

## Testing Strategies

```typescript
import { Hono } from 'hono';
import { test, describe, expect } from 'vitest';

const app = createApp();

test('POST /api/v1/users creates user', async () => {
  const res = await app.request('/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', email: 'test@test.com' }),
  });
  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.data.name).toBe('Test');
});

test('GET /api/v1/users/:id returns 404', async () => {
  const res = await app.request('/api/v1/users/nonexistent');
  expect(res.status).toBe(404);
});
```

Use `app.request()` for HTTP testing without a server — works in Node, Bun, Deno, Workers. Use `vitest` with `happy-dom` for edge runtime tests.

## Rules
- App factory pattern: `createApp()` returns Hono instance — testable without server.
- Every mutation route uses `zValidator` for input validation.
- Error handler registered globally via `app.onError()`.
- Auth middleware uses `c.set()` / `c.get()` for typed context variables.
- RPC client uses `hc<AppType>` for full type inference.
- Module routes created with `new Hono()` and `app.route()` on the main app.
- Middleware registered with `'*'` pattern for global, or specific path prefix.
- No `app.use` on individual route handlers — compose in module or use middleware function.

## References
  - references/hono-custom-middleware.md — Custom Middleware
  - references/hono-deployment.md — Deployment Guide
  - references/hono-middleware.md — Middleware Reference
  - references/hono-rpc.md — RPC Client
  - references/hono-setup.md — Setup Guide
  - references/hono-testing.md — Testing Patterns
## Handoff
Hand off to `backend/nodejs/drizzle/SKILL.md` for Drizzle ORM or `backend/nodejs/patterns/SKILL.md` for advanced Node patterns.
