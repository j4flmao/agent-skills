---
name: nodejs-express-skill
description: >
  Use this skill when building Express.js apps — app setup, middleware chain, routing, error handling, validation. This skill enforces: proper middleware ordering, global error handler, Zod/Joi validation, module-based routing, environment config. Do NOT use for: database schema design, frontend, DevOps, non-Express Node backends (Fastify/Hono).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, express, phase-10]
---

# Node.js Express

## Purpose
Structure Express.js applications with clean middleware pipeline, error handling, route separation, and validation.

## Agent Protocol

### Trigger
User request includes: `express`, `express.js`, `middleware`, `router`, `next.js error handling`, `express app`, `express setup`, `express routing`, `express validation`.

### Input Context
- App scope (REST API, GraphQL BFF, SSR)
- TypeScript or JavaScript
- Database (Prisma, Mongoose, raw)
- Auth strategy (JWT, session, OAuth)

### Output Artifact
Project structure, middleware order, route layout, error handler, validation setup.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Middleware pipeline ordered security -> parsing -> logging -> rate-limit -> routes -> 404 -> error
- Global error handler catches sync + async errors
- All input validated via schema library
- Routes organized by domain module

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Express vs Fastify vs Hono (within Node.js)

| Criterion | Express | Fastify | Hono |
|-----------|---------|---------|------|
| Performance | ~30k req/s | ~50k req/s | ~60k req/s |
| Plugin ecosystem | Largest | Growing | Small |
| TypeScript | Manual annotations | Schema-first (TypeBox/Zod) | Full (TypeBox) |
| Serialization | JSON.stringify | Fast JSON serialization | Built-in |
| Middleware model | Callback chain | Plugin registration | Express-like |
| Validation | Manual middleware | Schema-compiled serializer | Middleware-based |

Decision: Largest ecosystem / wide support → Express. Performance + schema-first → Fastify. Edge/Cloudflare Workers → Hono.

### Middleware Order Decision

| Layer | Middleware | Position |
|-------|-----------|----------|
| Security | Helmet, CORS, CSP | 1st (before any body) |
| Parsing | JSON, URL-encoded | 2nd |
| Observability | Logger, request ID | 3rd |
| Protection | Rate limiter | 4th |
| Auth | JWT/Session check | 5th |
| Routes | Domain routers | 6th |
| Fallback | 404 handler | 7th |
| Error | Global error handler | Last |

## Workflow

### Step 1: Project Bootstrap
```
express-app/
  src/
    app.ts                    # Express app factory
    server.ts                 # HTTP server entry
    config/
      env.ts                  # Typed env vars
      database.ts
      redis.ts
    modules/
      users/
        user.controller.ts
        user.service.ts
        user.repository.ts
        user.validation.ts
        user.routes.ts
        user.test.ts
      orders/
        ...
    common/
      middleware/
        auth.ts
        error-handler.ts
        request-logger.ts
        rate-limiter.ts
        validate.ts
      errors/
        app-error.ts
        not-found.ts
      types/
        express.d.ts
        index.ts
    shared/
      logger.ts
      pagination.ts
  package.json
  tsconfig.json
  .env.example
```

### Step 2: App Factory Pattern
```typescript
// app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { requestLogger } from './common/middleware/request-logger';
import { rateLimiter } from './common/middleware/rate-limiter';
import { notFoundHandler } from './common/middleware/not-found';
import { errorHandler } from './common/middleware/error-handler';
import { routes } from './modules/routes';

export function createApp() {
  const app = express();

  // Security
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(helmet());
  app.use(compression());

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Observability
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter);

  // Routes
  app.use('/api/v1', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

### Step 3: Graceful Server Startup
```typescript
// server.ts
import { createApp } from './app';
import { logger } from './shared/logger';

async function main() {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
```

### Step 4: Environment Configuration
```typescript
// config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

### Step 5: Module Route Setup
```typescript
// modules/users/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { asyncHandler } from '../../common/middleware/async-handler';

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.findAll(req.query);
    res.json({ success: true, data: users });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(req.params.id);
    res.json({ success: true, data: user });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.update(req.params.id, req.body);
    res.json({ success: true, data: user });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await userService.remove(req.params.id);
    res.status(204).send();
  }),
};

// modules/users/user.routes.ts
import { Router } from 'express';
import { userController } from './user.controller';
import { validate } from '../../common/middleware/validate';
import { createUserSchema, updateUserSchema } from './user.validation';
import { authenticate } from '../../common/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.post('/', validate(createUserSchema), userController.create);
router.put('/:id', validate(updateUserSchema), userController.update);
router.delete('/:id', userController.remove);

export default router;
```

### Step 6: Validation Middleware
```typescript
// common/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', err.errors));
      } else {
        next(err);
      }
    }
  };
}
```

### Step 7: Error Handling
```typescript
// common/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../../shared/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

// common/middleware/async-handler.ts
import { Request, Response, NextFunction } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// common/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### Step 8: Auth Middleware
```typescript
// common/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

export interface AuthPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token'));
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Token expired or invalid'));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
}
```

## Implementation Patterns

### Pattern: Dependency Injection Container (awilix)

```typescript
// shared/container.ts
import { createContainer, asClass, asValue, Lifetime } from 'awilix';
import { PrismaClient } from '@prisma/client';

const container = createContainer();

container.register({
  prisma: asValue(new PrismaClient()),
  userService: asClass(UserService).scoped(Lifetime.SCOPED),
  userController: asClass(UserController).scoped(Lifetime.SCOPED),
});

export { container };

// app.ts — DI middleware
app.use((req, res, next) => {
  req.container = container.createScope();
  next();
});
```

### Pattern: Health Check Endpoint

```typescript
// modules/health/health.controller.ts
export const healthController = {
  check: asyncHandler(async (req: Request, res: Response) => {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
      uptime: process.uptime(),
    };
    const healthy = Object.values(checks).every(c => c.status === 'ok');
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      checks,
    });
  }),
};
```

## Production Considerations

### Performance
- Enable `trust proxy` behind nginx/ELB: `app.set('trust proxy', 1)`
- Use response compression: `compression()` middleware
- Limit body size: `express.json({ limit: '1mb' })`
- Cluster mode: `pm2 start app.js -i max`
- Memory: monitor with `node --heapsnapshot-signal=SIGUSR2`

### Security Headers
```typescript
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `app.listen` in app module | Can't test app without starting server | App factory pattern |
| Naked `try/catch` in controllers | Duplicated error handling | `asyncHandler` wrapper |
| Direct `req.body` without validation | Security vulnerability | Zod schema in middleware |
| Multiple `res.json` calls in one handler | `ERR_HTTP_HEADERS_SENT` | Single code path |
| Sync `crypto.randomBytes` in request | Blocks event loop | Use `crypto.randomBytes` callback or async |

## Security Considerations
- Helmet sets security headers — always include first in middleware chain
- CORS with explicit origin list — never `*` with credentials
- Rate limiting per IP per route group
- JWT: validate algorithm, set short expiration (15m access + 7d refresh)
- SQL injection: use parameterized queries via Prisma/Knex — never raw string concat
- CSRF: `csurf` middleware for cookie/session auth
- Input validation: Zod with `.strip()` (default) — remove unknown properties

## Testing Strategies

```typescript
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('POST /api/v1/users', () => {
  it('should create user with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'John', email: 'john@test.com' })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'John', email: 'invalid' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

Use `testcontainers` for DB integration. Mock HTTP with `nock`. Use `jest` with `--detectOpenHandles` for unclosed connections.

## Rules
- Middleware order: security -> parsing -> logging -> rate-limit -> routes -> 404 -> error. Never deviate.
- All async handlers wrapped with asyncHandler. No try/catch in controllers.
- Input validation via Zod schema in middleware. Never trust raw req.body.
- App factory pattern (createApp function) for testability. No top-level app.listen.
- Environment config validated at startup with Zod. Fail fast on missing vars.
- Each domain module gets own router, controller, service, validation.
- Services stateless. Dependencies injected via constructor or module-level composition root.
- @types/express augmented for custom properties (req.user).
- Graceful shutdown on SIGTERM/SIGINT. Close server + DB connections.

## References
  - references/app-structure.md — App Structure
  - references/express-error-handling.md — Express Error Handling Reference
  - references/express-security.md — Express Security Reference
  - references/middleware-patterns.md — Middleware Patterns
  - references/performance-optimization.md — Express Performance Optimization
  - references/testing-strategies.md — Express Testing Strategies
## Handoff
Hand off to `backend/nodejs/prisma/SKILL.md` for database integration or `backend/nodejs/patterns/SKILL.md` for advanced Express patterns.
