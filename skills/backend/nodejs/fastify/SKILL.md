---
name: nodejs-fastify
description: >
  Use this skill when building Fastify applications — schema validation, plugin system, hooks, serialization. This skill enforces: JSON Schema validation, plugin encapsulation, schema serializers, Fastify lifecycle hooks. Do NOT use for: Express.js apps, database schema, frontend, or non-Fastify Node backends.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, fastify, phase-10]
---

# Node.js Fastify

## Purpose
Build Fastify applications with schema-first validation, plugin encapsulation, request/response serialization, and lifecycle hooks.

## Agent Protocol

### Trigger
User request includes: `fastify`, `fastify server`, `fastify plugin`, `fastify schema`, `fastify hooks`, `fastify validation`, `fastify serializer`, `TypeBox`, `@fastify/swagger`.

### Input Context
- Fastify version (4.x, 5.x)
- Validation approach (JSON Schema, TypeBox, Zod)
- Plugin set (swagger, cors, jwt, rate-limit)
- Database (TypeORM, Prisma, Knex)

### Output Artifact
Server setup, plugin registration, schema definitions, hook pipeline, route patterns.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Server created with logger and schema validator
- Plugins registered with encapsulation
- Routes defined with JSON Schema validation
- Hooks attached at correct lifecycle points
- Swagger/OpenAPI documentation configured

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Validation: JSON Schema vs TypeBox vs Zod

| Criterion | JSON Schema | TypeBox | Zod |
|-----------|-------------|---------|-----|
| Type inference | Manual | `Static<typeof schema>` | `z.infer<typeof schema>` |
| Code-first | No | Yes | Yes |
| Composition | `$ref` | `Type.Union`, `Type.Intersect` | `z.union`, `z.intersection` |
| Performance | Fast native compilation | Fastest (TypeCode compiler) | Good |
| Ecosystem | Standard, swagger compatible | Fastify-native | Widely used |

Decision: Need OpenAPI/Swagger docs → JSON Schema or TypeBox. Want maximum type safety → TypeBox. Already using Zod in codebase → Zod.

### Plugin vs Register Scope

| Scope | Encapsulation | Use Case |
|-------|--------------|----------|
| Root | Global | cors, rate-limiter, jwt, formbody |
| Plugin-level | Encapsulated within plugin | Feature modules, route groups |
| Child | Nested encapsulation | Sub-plugins within feature |

Decision: Infrastructure cross-cutting → Root. Feature-specific → Plugin. Shared helpers → `fastify-plugin` (bypass encapsulation).

## Workflow

### Step 1: Server Bootstrap

```typescript
// src/server.ts
import Fastify from 'fastify';
import { registerPlugins } from './plugins';
import { config } from './config';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
    ajv: {
      customOptions: { allErrors: true, coerceTypes: 'array' },
    },
  });

  await registerPlugins(server);

  // Health check
  server.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  return server;
}

// src/index.ts
import { buildServer } from './server';

async function main() {
  const server = await buildServer();
  const port = parseInt(process.env.PORT || '3000');

  await server.listen({ port, host: '0.0.0.0' });

  const shutdown = async (signal: string) => {
    server.log.info(`${signal} received. Shutting down...`);
    await server.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

### Step 2: Plugin Registration

```typescript
// src/plugins/index.ts
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import { userModule } from '../modules/users';
import { orderModule } from '../modules/orders';
import { errorHandlerPlugin } from './error-handler';
import { config } from '../config';

export async function registerPlugins(app: FastifyInstance) {
  // Core plugins (global)
  await app.register(cors, { origin: config.CORS_ORIGIN });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: config.JWT_SECRET });

  // Documentation
  await app.register(swagger, {
    openapi: { info: { title: 'API', version: '1.0.0' } },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Error handler
  await app.register(errorHandlerPlugin);

  // Feature modules (encapsulated)
  await app.register(userModule, { prefix: '/api/v1/users' });
  await app.register(orderModule, { prefix: '/api/v1/orders' });
}
```

### Step 3: Schema-First Routes with TypeBox

```typescript
// src/modules/users/schema.ts
import { Type, Static } from '@sinclair/typebox';

export const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  role: Type.Optional(Type.Union([Type.Literal('admin'), Type.Literal('user')])),
});

export const UserResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  role: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const UserParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export type CreateUserDto = Static<typeof CreateUserSchema>;

// src/modules/users/routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userService } from './service';
import { CreateUserSchema, UserResponseSchema, UserParamsSchema } from './schema';

export async function userRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: {
      querystring: Type.Object({
        page: Type.Optional(Type.Number({ default: 1 })),
        limit: Type.Optional(Type.Number({ default: 20 })),
      }),
      response: {
        200: Type.Object({
          data: Type.Array(UserResponseSchema),
          total: Type.Number(),
          page: Type.Number(),
        }),
      },
    },
    handler: async (request, reply) => {
      const { page, limit } = request.query;
      const result = await userService.findAll(page, limit);
      return result;
    },
  });

  app.get<{ Params: Static<typeof UserParamsSchema> }>('/:id', {
    schema: {
      params: UserParamsSchema,
      response: { 200: UserResponseSchema, 404: Type.Object({ error: Type.String() }) },
    },
    handler: async (request, reply) => {
      const user = await userService.findById(request.params.id);
      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }
      return user;
    },
  });

  app.post('/', {
    schema: {
      body: CreateUserSchema,
      response: { 201: UserResponseSchema },
    },
    handler: async (request, reply) => {
      const user = await userService.create(request.body);
      reply.code(201);
      return user;
    },
  });
}
```

### Step 4: Hooks Lifecycle

```typescript
// src/plugins/hooks.ts
import { FastifyInstance } from 'fastify';

export async function registerHooks(app: FastifyInstance) {
  // Pre-validation — transform request
  app.addHook('preValidation', async (request, reply) => {
    // e.g., add request ID
    request.id = request.id || crypto.randomUUID();
  });

  // Pre-handler — auth check
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/v1/auth')) return;
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // On-send — response logging
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Request-Id', request.id as string);
    return payload;
  });

  // On-response — metrics
  app.addHook('onResponse', async (request, reply) => {
    const elapsed = reply.elapsedTime;
    app.log.info({ method: request.method, url: request.url, status: reply.statusCode, elapsed }, 'response');
  });
}
```

### Step 5: Error Handler Plugin

```typescript
// src/plugins/error-handler.ts
import { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode || 500;

    app.log.error({ err: error, requestId: request.id }, error.message);

    if (statusCode === 429) {
      return reply.code(429).send({ error: 'Too many requests', retryAfter: error.message });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: error.validation.map(v => ({
          field: v.instancePath,
          message: v.message,
        })),
      });
    }

    const response = statusCode >= 500
      ? { error: 'Internal Server Error' }
      : { error: error.message };

    return reply.code(statusCode).send(response);
  });
}
```

### Step 6: Graceful Shutdown with Health Check

```typescript
// Graceful shutdown wrapper
async function main() {
  const app = await buildServer();
  await app.listen({ port: 3000 });

  const signals = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`${signal} received, shutting down`);
      await app.close();
      process.exit(0);
    });
  }
}
```

## Implementation Patterns

### Pattern: Encapsulated Plugin Module

```typescript
// src/modules/users/index.ts
import { FastifyInstance } from 'fastify';
import { userRoutes } from './routes';

export async function userModule(app: FastifyInstance) {
  // Auth decorator (encapsulated — only within this plugin)
  app.decorate('userModule', true);

  // Pre-handler specific to this module
  app.addHook('preHandler', async (request, reply) => {
    // Module-level auth
  });

  await app.register(userRoutes);
}
```

### Pattern: Custom Decorator

```typescript
// src/plugins/auth-decorators.ts
import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function (app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
```

## Production Considerations

### Serialization
Fastify serializes responses using compiled schemas. Define `response` schemas for maximum performance. Use `@fastify/response-validation` for development response validation.

### Compression
```typescript
await app.register(import('@fastify/compress'), { global: true, threshold: 1024 });
```

### Trust Proxy
```typescript
const server = Fastify({ trustProxy: true });
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| No schema validation | Manual validation, no serialization benefits | Always define `schema` on routes |
| Global plugins modifying request | Encapsulation violation | Use `fastify-plugin` for shared decorators |
| Reply payload manual JSON.stringify | Breaks serialization optimization | Return object, let Fastify serialize |
| Heavy imports in hot handler | Slows non-related requests | Use `await import()` or separate plugins |
| Async route without error handling | Unhandled promise rejection | Fastify wraps async handlers automatically |

## Security Considerations
- `@fastify/helmet` for security headers — register early
- `@fastify/cors` with explicit origins — never `*` with credentials
- `@fastify/rate-limit` per IP — configure per route for auth endpoints
- `@fastify/csrf` protection for cookie-based auth
- Schema validation strips unknown properties by default (additionalProperties: false)
- JWT via `@fastify/jwt` with `cookie` option for cookie-based auth

## Testing Strategies

```typescript
import { buildServer } from '../src/server';
import { test, expect } from 'vitest';

test('POST /api/v1/users creates user', async () => {
  const app = await buildServer();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    payload: { name: 'Test', email: 'test@test.com' },
  });
  expect(response.statusCode).toBe(201);
  expect(response.json().data).toHaveProperty('id');
});

test('GET /api/v1/users/:id returns 404', async () => {
  const app = await buildServer();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/users/nonexistent',
  });
  expect(response.statusCode).toBe(404);
});
```

Use `app.inject()` for HTTP testing without a server. Use `@fastify/test-helper` for lifecycle tests.

## Rules
- Every route has a `schema` with body/querystring/params/response definitions.
- Schema-first approach with TypeBox for type inference.
- Plugin encapsulation: feature modules register their own routes, hooks, decorators.
- Never use `require` — always `import`. Fastify supports native ESM.
- Lifecycle hooks: `onRequest` → `preParsing` → `preValidation` → `preHandler` → handler → `preSerialization` → `onSend` → `onResponse`.
- `@fastify/swagger` generates OpenAPI docs from route schemas automatically.
- Graceful shutdown via `app.close()` in signal handlers.

## References
  - references/fastify-advanced-plugins.md — Advanced Plugin Patterns
  - references/fastify-hooks.md — Lifecycle Hooks
  - references/fastify-plugins.md — Plugin System
  - references/fastify-setup.md — Setup Guide
  - references/fastify-testing.md — Testing
  - references/fastify-validation.md — Validation and Serialization
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formatting or `backend/nodejs/patterns/SKILL.md` for Node.js patterns.
