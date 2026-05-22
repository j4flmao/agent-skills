# App Structure

## Folder Organization

```
express-app/
  src/
    app.ts                  # Express app factory, middleware registration
    server.ts               # Entry point, graceful shutdown
    config/
      env.ts                # Typed env variables with Zod validation
      database.ts           # Prisma/Drizzle client singleton
      redis.ts              # Redis client setup
      logger.ts             # Pino/Winston logger config
    modules/
      auth/
        auth.controller.ts
        auth.service.ts
        auth.repository.ts
        auth.validation.ts  # Zod schemas
        auth.routes.ts
        auth.test.ts
      users/
        user.controller.ts
        user.service.ts
        user.repository.ts
        user.validation.ts
        user.routes.ts
        user.test.ts
      orders/
        order.controller.ts
        order.service.ts
        order.repository.ts
        order.validation.ts
        order.routes.ts
        order.test.ts
    common/
      middleware/
        authenticate.ts     # JWT verification
        authorize.ts        # Role-based access control
        error-handler.ts    # Global error handler
        request-logger.ts   # Request/response logging
        rate-limiter.ts     # Rate limiting
        validate.ts         # Zod validation middleware
        async-handler.ts    # Async error wrapper
      errors/
        app-error.ts        # Custom error class
        not-found.ts
      types/
        index.ts            # Shared type definitions
        pagination.ts       # Pagination types
        express.d.ts        # Express type augmentation
    shared/
      logger.ts             # Shared logger instance
      pagination.ts         # Pagination helper
      constants.ts          # App-wide constants
  tests/
    integration/
      auth.test.ts
      orders.test.ts
    e2e/
      api.test.ts
  prisma/
    schema.prisma
    migrations/
    seed.ts
  package.json
  tsconfig.json
  .env
  .env.example
  .env.test
  docker-compose.yml
  Dockerfile
  .gitignore
  nodemon.json
```

## Route Separation Pattern

Each module exports its own router, mounted at app level:

```typescript
// modules/routes.ts
import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import orderRoutes from './orders/order.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);

export default router;
```

```typescript
// app.ts
import routes from './modules/routes';
app.use('/api/v1', routes);
```

## Controller Pattern

Controllers are thin — parse request, call service, format response:

```typescript
export const orderController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const dto: CreateOrderDto = req.body;
    const order = await orderService.create(dto);
    res.status(201).json(ok(order));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');
    res.json(ok(order));
  }),
};
```

## Service Layer

Services contain business logic. Stateless, dependency injection via constructor:

```typescript
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    this.logger.info('Creating order', { customerId: dto.customerId });

    const order = Order.create({
      customerId: dto.customerId,
      items: dto.items,
    });

    for (const item of order.items) {
      const available = await this.inventoryService.checkStock(item.productId, item.quantity);
      if (!available) throw new AppError(400, 'INSUFFICIENT_STOCK', `Insufficient stock for product ${item.productId}`);
    }

    const saved = await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(saved));
    return saved;
  }
}

// Composition root
const orderService = new OrderService(
  orderRepo,
  inventoryService,
  eventBus,
  logger,
);
```

## Repository Pattern

Abstract data access behind interface:

```typescript
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string, options: PaginationOptions): Promise<PaginatedResult<Order>>;
  save(order: Order): Promise<Order>;
  update(id: string, data: Partial<Order>): Promise<Order>;
  delete(id: string): Promise<void>;
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Order | null> {
    const entity = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    return entity ? OrderMapper.toDomain(entity) : null;
  }

  async save(order: Order): Promise<Order> {
    const data = OrderMapper.toPersistence(order);
    const entity = await this.prisma.order.create({
      data,
      include: { items: true },
    });
    return OrderMapper.toDomain(entity);
  }
}
```

## Config Module

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${nodeEnv}` });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  BODY_LIMIT: z.string().default('1mb'),
  RATE_LIMIT_WINDOW: z.coerce.number().default(15),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
```

## Logger Setup

```typescript
// shared/logger.ts
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});
```

## Startup Sequence

```typescript
// server.ts
import { createApp } from './app';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './shared/logger';
import { env } from './config/env';

async function bootstrap() {
  // 1. Validate env (already done at import)
  // 2. Connect to databases
  await prisma.$connect();
  logger.info('Database connected');

  if (env.REDIS_URL) {
    await redis.connect();
    logger.info('Redis connected');
  }

  // 3. Create Express app
  const app = createApp();

  // 4. Start HTTP server
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`Server running on http://${env.HOST}:${env.PORT}`);
  });

  // 5. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      if (env.REDIS_URL) await redis.quit();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
```

## Health Check Endpoint

```typescript
// modules/health/health.routes.ts
import { Router } from 'express';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';

const router = Router();

router.get('/health', async (_req, res) => {
  const checks = {
    database: false,
    redis: false,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {}
  try {
    if (redis) await redis.ping();
    checks.redis = true;
  } catch {}

  const status = checks.database ? 'healthy' : 'degraded';
  res.status(checks.database ? 200 : 503).json({
    status,
    checks,
  });
});

export default router;
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "typeRoots": ["./node_modules/@types", "./src/common/types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```
