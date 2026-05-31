---
name: nodejs-architecture
description: >
  Use this skill when designing Node.js backend architecture — Express, Fastify, Hono. Project structure, middleware pipeline, routing, error handling, validation. This skill enforces: separation of concerns, correct middleware ordering, global error handling, Zod/Joi validation integration. Do NOT use for: frontend architecture, database schema design, DevOps configuration.
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

# Node.js Architecture

## Purpose
Define and enforce Node.js backend architecture, framework selection, and middleware pipeline conventions.

## Agent Protocol

### Trigger
User request includes: `node.js`, `nodejs`, `express`, `fastify`, `hono`, `node backend`, `node project structure`, `middleware`, `node.js routing`.

### Input Context
- Framework (Express, Fastify, Hono)
- Runtime (Node.js v18+, Bun, Deno)
- Language (JavaScript, TypeScript)
- Project type (REST API, GraphQL, BFF)

### Output Artifact
A markdown document containing:
- Project structure
- Middleware pipeline ordering
- Routing conventions
- Error handling strategy
- Validation setup (Zod, Joi)
- Dependency injection pattern
- Testing setup

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Project structure follows separation of concerns
- Middleware pipeline ordered by responsibility
- Error handler catches all exceptions
- Validation integrated with schema library

### Max Response Length
4096 tokens

## Workflow

### Step 1: Select Framework

| Framework | Performance | Ecosystem | TypeScript | When |
|---|---|---|---|---|
| **Express** | Moderate | Largest | Manual setup | Large ecosystem, legacy, most devs know it |
| **Fastify** | High | Large | Native | Performance-critical, JSON schema validation |
| **Hono** | Very High | Growing | Native | Edge, Bun, minimal footprint |

### Step 2: Set Up Project Structure
```
src/
+-- modules/
|   +-- orders/
|   |   +-- order.controller.ts
|   |   +-- order.service.ts
|   |   +-- order.repository.ts
|   |   +-- order.schema.ts        # Zod validation
|   |   +-- order.routes.ts
|   |   +-- order.test.ts
|   |   +-- order.mapper.ts
|   +-- products/
|   |   +-- ...
|   +-- users/
|       +-- ...
+-- common/
|   +-- middleware/
|   |   +-- auth.ts
|   |   +-- error-handler.ts
|   |   +-- request-logger.ts
|   |   +-- rate-limiter.ts
|   |   +-- request-id.ts
|   |   +-- validate.ts
|   +-- errors/
|   |   +-- app-error.ts
|   |   +-- not-found.ts
|   +-- types/
|   |   +-- index.ts
|   |   +-- express.d.ts
+-- config/
|   +-- database.ts
|   +-- env.ts
|   +-- redis.ts
|   +-- logger.ts
+-- app.ts              # Express/Fastify app setup
+-- server.ts           # Entry point
```

### Step 3: Order Middleware Pipeline (Express)
```typescript
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { requestLogger } from './common/middleware/request-logger';
import { rateLimiter } from './common/middleware/rate-limiter';
import { notFoundHandler } from './common/middleware/not-found';
import { errorHandler } from './common/middleware/error-handler';
import { requestId } from './common/middleware/request-id';
import { routes } from './routes';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId);
app.use(requestLogger);
app.use(rateLimiter);
app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);
```

For Fastify:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.CORS_ORIGIN });
await app.register(helmet);
await app.register(compress);
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(routes, { prefix: '/api/v1' });

app.setNotFoundHandler((req, reply) => {
  reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.setErrorHandler((err, req, reply) => {
  const status = err.statusCode || 500;
  reply.status(status).send({ success: false, error: { code: err.code || 'INTERNAL', message: err.message } });
});
```

### Step 4: Implement Error Handling
```typescript
// common/errors/app-error.ts
export interface ErrorDetails {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(404, 'NOT_FOUND', `${entity} with id ${id} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(errors: unknown) {
    super(400, 'VALIDATION', 'Validation failed', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

// common/middleware/error-handler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn({ err, requestId: req.id, path: req.path }, 'Operational error');
    res.status(err.statusCode).json({
      success: false,
      error: err.toJSON(),
    });
    return;
  }

  logger.error({ err, requestId: req.id, path: req.path }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
}
```

### Step 5: Validation with Zod
```typescript
// modules/orders/order.schema.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1, 'At least one item required'),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.string().length(2),
  }),
  couponCode: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// common/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/app-error';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (result.success) {
      req[source] = result.data;
      next();
    } else {
      next(new ValidationError(result.error.issues));
    }
  };
}

// Usage in route
router.post('/', validate(createOrderSchema), orderController.create);
```

### Step 6: Routing and Controller Pattern
```typescript
// modules/orders/order.routes.ts
import { Router } from 'express';
import { OrderController } from './order.controller';
import { validate } from '../../common/middleware/validate';
import { createOrderSchema, updateOrderSchema } from './order.schema';
import { authenticate } from '../../common/middleware/auth';

const router = Router();
const controller = new OrderController();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createOrderSchema), controller.create);
router.put('/:id', validate(updateOrderSchema), controller.update);
router.delete('/:id', controller.delete);

export { router as orderRoutes };

// modules/orders/order.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service';

export class OrderController {
  constructor(private readonly orderService = new OrderService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.orderService.findAll(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.orderService.findById(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.orderService.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.orderService.update(req.params.id, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.orderService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
```

### Step 7: Configuration Management
```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.issues);
    process.exit(1);
  }
  env = result.data;
  return env;
}

export function getEnv(): Env {
  if (!env) return loadEnv();
  return env;
}
```

### Step 8: Dependency Injection Container
```typescript
// config/container.ts
import { OrderService } from '../modules/orders/order.service';
import { OrderRepository } from '../modules/orders/order.repository';
import { PaymentService } from '../modules/payments/payment.service';
import { NotificationService } from '../modules/notifications/notification.service';
import { Database } from './database';

export class Container {
  private static instance: Container;
  private readonly db: Database;
  private readonly services = new Map<string, unknown>();

  private constructor() {
    this.db = new Database();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  getOrderRepository(): OrderRepository {
    if (!this.services.has('orderRepository')) {
      this.services.set('orderRepository', new OrderRepository(this.db));
    }
    return this.services.get('orderRepository') as OrderRepository;
  }

  getOrderService(): OrderService {
    if (!this.services.has('orderService')) {
      this.services.set('orderService', new OrderService(
        this.getOrderRepository(),
        this.getPaymentService(),
        this.getNotificationService(),
      ));
    }
    return this.services.get('orderService') as OrderService;
  }

  getPaymentService(): PaymentService {
    if (!this.services.has('paymentService')) {
      this.services.set('paymentService', new PaymentService());
    }
    return this.services.get('paymentService') as PaymentService;
  }

  getNotificationService(): NotificationService {
    if (!this.services.has('notificationService')) {
      this.services.set('notificationService', new NotificationService());
    }
    return this.services.get('notificationService') as NotificationService;
  }
}
```

### Step 9: Testing Setup
```typescript
// modules/orders/order.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { OrderService } from './order.service';

vi.mock('./order.service');

describe('Orders API', () => {
  let app: Express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp('test');
  });

  describe('POST /api/v1/orders', () => {
    it('creates order successfully', async () => {
      const mockOrder = { id: '123', customerId: 'cust-1', items: [] };
      vi.mocked(OrderService.prototype.create).mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2, unitPrice: 19.99 }],
          shippingAddress: { street: '123 Main', city: 'NYC', zipCode: '10001', country: 'US' },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('123');
    });

    it('returns 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({ customerId: 'invalid' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('returns 404 for non-existent order', async () => {
      vi.mocked(OrderService.prototype.findById).mockRejectedValue(
        new NotFoundError('Order', '999')
      );

      await request(app)
        .get('/api/v1/orders/999')
        .expect(404);
    });
  });
});
```

## Architecture Decision Trees

### Framework Selection
```
Need high performance?
  +-- Yes -> Need edge runtime?
  |   +-- Yes -> Hono (Bun, Deno, Cloudflare Workers)
  |   +-- No  -> Fastify (JSON schema validation, high throughput)
  +-- No  -> Need largest ecosystem?
      +-- Yes -> Express (most middleware, community packages)
      +-- No  -> Hono (modern, lightweight, good DX)
```

### Request Validation Strategy
```
TypeScript project?
  +-- Yes -> Zod (type inference, composable schemas)
  +-- No  -> Joi (mature, expressive API)
```

### Project Structure Decision
```
Monorepo with shared types?
  +-- Yes -> Use Nx or Turborepo, shared packages for types/schemas
  +-- No  -> Flat modules/ structure with domain grouping
```

### Error Handling Approach
```
Single service deployment?
  +-- Yes -> Centralized AppError hierarchy with status codes
  +-- No  -> Add correlation IDs, distributed tracing headers
```

## Common Pitfalls

1. **Middleware ordering wrong**: Rate limiter before JSON parser causes body read issues. Security middleware (helmet, cors) must come first, before any body parsing.

2. **Swallowing async errors**: Express does not catch async promise rejections automatically. Always use `express-async-errors` or wrap async handlers. Fastify handles this natively.

3. **Blocking the event loop**: CPU-heavy operations in request handlers (JSON.stringify on large objects, crypto operations, image processing). Offload to worker threads or queue tasks.

4. **No request body size limits**: Attackers send gigantic payloads to exhaust memory. Always set `express.json({ limit: '1mb' })` or equivalent.

5. **Exposing stack traces in production**: Never include `err.stack` in production error responses. Use structured logging instead.

6. **Zod schema duplication**: Defining validation both in Zod schemas and TypeScript interfaces. Use `z.infer<typeof schema>` to derive types.

7. **Global state in request handlers**: Mutating module-level variables across requests leads to race conditions. Use DI container or request-scoped services.

8. **Circular dependencies**: Common in barrel exports. Keep imports explicit and avoid `index.ts` re-exports that create cycles.

9. **Missing HTTP header security**: Not setting `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`. Helmet handles this.

10. **Database connection pool exhaustion**: Creating connections per request instead of using a connection pool. Always use `pg.Pool` or Prisma's built-in pooling.

## Best Practices

1. **Controller methods never call `next(err)` directly with non-Error values**. Always wrap in AppError or equivalent typed error class.

2. **Use repository pattern for data access abstracted behind interfaces**. Enables unit testing without a database.

3. **Keep route handlers thin**. Route file defines URL structure and middleware. Controller handles request/response. Service contains business logic.

4. **Use async event emitters or message queues for side effects**. Sending emails, push notifications, webhooks should not block the response.

5. **Structured logging with correlation IDs**. Attach a unique request ID to every log line for debugging distributed traces.

6. **Rate limit by user ID, not just IP**. For authenticated endpoints, rate-limit by userId to prevent one user exhausting another's quota.

7. **Graceful shutdown**: Handle SIGTERM, stop accepting connections, drain existing requests, close database connections.

8. **Compression before rate limiting**. Compress responses first, then apply rate limits to reduce bandwidth usage for limited users.

9. **Health check endpoints**: `/health` (liveness) and `/ready` (readiness) for Kubernetes probes. DB connection check in readiness.

10. **Use `.env` files with validation at startup**. Fail fast if required variables missing.

## Compared With

| Feature | Express | Fastify | Hono |
|---|---|---|---|
| Request validation | Manual (Zod/Joi) | Built-in (JSON Schema) | Manual (Zod) |
| Performance | 15k req/s | 35k req/s | 50k req/s |
| Plugin ecosystem | 5000+ | 200+ | 50+ |
| TypeScript DX | Manual types | Auto-generated | Native |
| Edge compatibility | No | Limited | Yes |
| OpenAPI generation | Third-party | Built-in plugin | Third-party |
| WebSocket | Via library | Via plugin | Built-in |
| Testing supertest | Yes | inject() method | Built-in test client |
| Middleware model | Sequential | Encapsulated | Sequential |
| Error handling | Manual async wrap | Auto async catch | Auto async catch |

## Performance

- **Connection pooling**: Reuse database connections across requests. Prisma: 10-15 connections per CPU core. Knex: use `pool.min` and `pool.max`.
- **Response compression**: Gzip/Brotli reduces payload by 60-80%. Use `compression` (Express), `@fastify/compress` (Fastify).
- **Redis caching**: Cache expensive query results with TTL. Use `node-cache-manager` with Redis store.
- **Cluster mode**: Use Node.js `cluster` module or PM2 cluster mode to utilize all CPU cores.
- **HTTP/2**: Enable for multiplexing. Fastify supports natively. Express needs `spdy` or a reverse proxy.
- **Keep-alive connections**: Disable `Connection: close`. Reduces TCP handshake overhead.
- **Body parser limit**: Set to minimum required. Default 100KB in Express, configurable.
- **Memory monitoring**: Use `--max-old-space-size` flag. Monitor heap usage with `process.memoryUsage()`.

## Tooling

| Tool | Purpose |
|---|---|
| **Zod** | Runtime schema validation with TypeScript inference |
| **Vitest** | Unit and integration testing (fast, ESM-native) |
| **Supertest** | HTTP assertion testing |
| **Pino** | Structured JSON logging (used by Fastify) |
| **Winston** | Alternative logging with transports |
| **tsx / ts-node** | TypeScript execution in development |
| **PM2** | Production process manager with clustering |
| **Docker** | Containerization for consistent environments |
| **ESLint** | Code quality with `@typescript-eslint` |
| **Prettier** | Consistent code formatting |
| **Husky + lint-staged** | Pre-commit hooks |
| **Nodemon / tsx watch** | Auto-restart on file changes |
| **Dotenv** | Environment variable loading |

## Rules

- Framework selected by performance needs and ecosystem requirements.
- Modules grouped by domain feature, not by technical layer.
- Middleware ordered: security -> parsing -> logging -> rate-limit -> routes -> 404 -> error.
- All errors handled by central error handler — no try/catch in controllers.
- Validation via Zod/Fastify schema — never manual checks.
- TypeScript strict mode for all new projects.
- No business logic in route handlers or controllers.
- Repository interfaces in domain, implementations in infrastructure.
- Async handlers must be wrapped for Express (use express-async-errors).
- Error classes carry HTTP status code, error code, and optional details.
- Environment variables validated at startup with Zod schema.
- Database migrations for all schema changes — never raw DDL in production.
- Logging with structured JSON format for log aggregation.
- Health and readiness endpoints required for container orchestration.
- Rate limiting applied per-route or per-client, never global-only.
- Secrets managed via environment variables or secrets manager, never in code.

## References
  - references/nodejs-architecture-patterns.md — Node.js Architecture Patterns
  - references/nodejs-module-system-di.md — Node.js Module System and DI
  - references/express-setup.md — Express Setup Reference
  - references/fastify-setup.md — Fastify Setup
  - references/nodejs-clustering.md — Node.js Clustering
  - references/nodejs-event-loop.md — Node.js Event Loop
  - references/nodejs-middleware.md — Node.js Middleware Architecture Reference
  - references/nodejs-security.md — Node.js Security Reference

## Handoff
Hand off to `backend/nodejs/patterns/SKILL.md` for Node.js-specific patterns.
