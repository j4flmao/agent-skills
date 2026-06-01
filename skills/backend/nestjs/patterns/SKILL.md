---
name: nestjs-patterns
description: >
  Use this skill when implementing NestJS patterns — CQRS with @nestjs/cqrs, guards/interceptors/pipes/filters, event sourcing, custom decorators, microservices, and provider patterns. This skill enforces: ExecutionContext-based guards, RxJS in interceptors, decorator composition, typed event payloads. Requires @nestjs/core. Do NOT use for: Module structure, project setup, or non-NestJS applications.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nestjs, phase-6]
---

# NestJS Patterns

## Purpose
Implement NestJS-specific patterns — CQRS, guards/interceptors, event sourcing, custom decorators, microservices transport, and advanced provider patterns.

## Agent Protocol

### Trigger
User request includes: `NestJS guard`, `NestJS interceptor`, `NestJS pipe`, `NestJS filter`, `NestJS CQRS`, `NestJS event sourcing`, `NestJS microservice`, `NestJS decorator`, `NestJS provider`.

### Input Context
- Pattern needed (Guard, Interceptor, Pipe, Filter, CQRS, Microservice)
- Transport type for microservices (TCP, Redis, RabbitMQ, Kafka)
- Module structure and DDD approach

### Output Artifact
Code examples for the requested patterns — guard implementation, interceptor chain, CQRS handler, etc.

### Response Format
Code-first output. Pattern name, problem, types, implementation, usage. No preamble.

### Completion Criteria
- Guard uses ExecutionContext and returns boolean
- Interceptor uses Observable and RxJS operators
- Pipe transforms value or throws
- Filter catches specific exception types
- CQRS with command/query separation
- Microservice with transport strategy

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Guard vs Interceptor vs Middleware

| Aspect | Guard | Interceptor | Middleware |
|--------|-------|-------------|------------|
| Decision | Allow/deny request | Transform response/request | Pre-processing |
| Execution context | Full (route, args) | Full (call handler) | Limited (request/response) |
| RxJS access | No | Yes (Observable) | No |
| DI scope | Module providers | Module providers | Globally registered |
| Use case | Auth, roles, permissions | Caching, logging, mapping | CORS, session, compression |

Decision: Gate (allow/deny) → Guard. Transform (in/out) → Interceptor. Pre-route (no Nest context) → Middleware.

### Transport Strategy for Microservices

| Transport | Pros | Cons | Best For |
|-----------|------|------|----------|
| TCP | Simple, no broker | Point-to-point only | Internal microservices |
| Redis | Pub/sub, fast | Requires Redis | Broadcast, real-time |
| RabbitMQ | Reliable, DLQ, routing | Heavier ops | Complex workflows, async |
| Kafka | High throughput, replay | Complex setup | Event streaming, audit logs |
| gRPC | Strong contracts, perf | Limited ecosystem | Cross-language |

Decision: Simple internal → TCP. Pub/sub + real-time → Redis. Reliable async → RabbitMQ. High-volume streaming → Kafka. Cross-language contracts → gRPC.

## Workflow

### Step 1: Advanced Guards

```typescript
// guards/roles.guard.ts
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// guards/throttle.guard.ts
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();

  constructor(
    @Inject('THROTTLE_CONFIG')
    private readonly config: { limit: number; ttl: number },
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip;
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    const recent = timestamps.filter(t => now - t < this.config.ttl);
    recent.push(now);
    this.requests.set(key, recent);

    if (recent.length > this.config.limit) {
      throw new HttpException('Too many requests', 429);
    }
    return true;
  }
}

// Usage
@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

### Step 2: Advanced Interceptors

```typescript
// interceptors/cache.interceptor.ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(@Inject('CACHE_TTL') private readonly ttl: number) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.url}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap(data => {
        this.cache.set(key, { data, expiry: Date.now() + this.ttl });
      }),
    );
  }
}

// interceptors/timeout.interceptor.ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(@Inject('TIMEOUT') private readonly timeout: number) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeout),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new HttpException('Request timeout', 408));
        }
        return throwError(() => err);
      }),
    );
  }
}

// interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const duration = Date.now() - startTime;
        this.auditService.log({
          method, url, userId: user?.id, ip, duration,
          statusCode: context.switchToHttp().getResponse().statusCode,
          timestamp: new Date(),
        }).catch(e => this.logger.error('Audit log failed', e));
      }),
    );
  }
}
```

### Step 3: Custom Pipes

```typescript
// pipes/parse-optional-uuid.pipe.ts
@Injectable()
export class ParseOptionalUUIDPipe implements PipeTransform<string, UUID | undefined> {
  transform(value: string): UUID | undefined {
    if (!value) return undefined;
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid UUID: ${value}`);
    }
    return value as UUID;
  }
}

// pipes/validation.pipe.ts
@Injectable()
export class CustomValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        details: result.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}
```

### Step 4: Exception Filters

```typescript
// filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let errorResponse: ErrorResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      errorResponse = {
        success: false,
        error: {
          code: HttpStatus[status] || 'ERROR',
          message: typeof exResponse === 'string' ? exResponse : (exResponse as any).message,
        },
      };
    } else if (exception instanceof ZodValidationError) {
      status = 400;
      errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: exception.errors,
        },
      };
    }

    this.logger.error(`${request.method} ${request.url} ${status}`, exception instanceof Error ? exception.stack : '');

    response.status(status).json(errorResponse);
  }
}
```

### Step 5: CQRS with Sagas

```typescript
import { Saga, ICommand, ofType } from '@nestjs/cqrs';

@Injectable()
export class OrdersSaga {
  @Saga()
  orderCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCreatedEvent),
      delay(1000), // wait for consistency
      map(event => new CheckInventoryCommand(event.orderId)),
    );
  };

  @Saga()
  inventoryChecked = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(InventoryCheckedEvent),
      mergeMap(event =>
        event.inStock
          ? of(new ProcessPaymentCommand(event.orderId))
          : of(new CancelOrderCommand(event.orderId, 'Out of stock')),
      ),
    );
  };
}
```

### Step 6: Microservice Pattern

```typescript
// apps/api/src/main.ts — hybrid app (HTTP + microservice)
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Hybrid: HTTP + TCP microservice
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { port: 3001 },
  });

  // Also connect RabbitMQ for async events
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'orders_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}

// apps/worker/src/worker.module.ts — standalone consumer
@Module({
  imports: [SharedModule, DatabaseModule],
  controllers: [OrdersController],  // Microservice controllers
})
export class WorkerModule {}

// apps/worker/src/orders.controller.ts
@Controller()
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern({ cmd: 'create_order' })
  async createOrder(@Payload() dto: CreateOrderDto): Promise<Order> {
    return this.orderService.create(dto);
  }

  @MessagePattern({ cmd: 'get_order' })
  async getOrder(@Payload() data: { id: string }): Promise<Order> {
    return this.orderService.findById(data.id);
  }

  @EventPattern('order_created')
  async handleOrderCreated(@Payload() data: OrderEvent) {
    // Event handler (fire-and-forget)
    await this.inventoryService.checkStock(data.orderId);
  }
}
```

## Implementation Patterns

### Pattern: Custom Decorator Composition

```typescript
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

export function Auth(...roles: string[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

// Usage
@Controller('admin')
export class AdminController {
  @Get('users')
  @Auth('admin', 'superadmin')
  findAll() {
    return this.userService.findAll();
  }

  @Post('users')
  @Auth('superadmin')
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

### Pattern: Provider Factory

```typescript
// Dynamic value provider
const cacheProvider = {
  provide: 'CACHE',
  useFactory: (config: ConfigService) => {
    return new CacheManager({
      ttl: config.get('cache.ttl'),
      max: config.get('cache.maxItems'),
    });
  },
  inject: [ConfigService],
};

// Async provider
const databaseProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async (config: ConfigService) => {
    const connection = await createConnection(config.get('database'));
    return connection;
  },
  inject: [ConfigService],
};
```

## Production Considerations

### Graceful Shutdown with Microservices
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // ... setup microservices
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal =>
    process.on(signal, async () => {
      await app.close();
      process.exit(0);
    }),
  );
}
```

### Distributed Tracing
Use `nestjs-opentelemetry` or `@opentelemetry/instrumentation-nestjs-core` for automatic tracing of controllers, providers, and guards.

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Business logic in guards | Not testable across transports | Delegate to service |
| `async` interceptors without proper error propagation | Swallowed errors | Use `catchError` RxJS operator |
| `@Catch()` with no argument | Catches everything, hides errors | Catch specific exception types |
| Direct `@Client` usage for microservices | Tight coupling to transport | Use `@nestjs/microservices` ClientProxy |
| Guards checking user in request | Ignores ExecutionContext generics | Use `context.switchToHttp().getRequest()` |

## Security Considerations
- `@nestjs/throttler` for rate limiting at controller level
- Guards can access ExecutionContext for fine-grained auth
- Use `@nestjs/passport` with JWT strategy for auth — never implement JWT verification manually
- RBAC via custom `@Roles('admin')` decorator with `RolesGuard`
- Serialization interceptor to `@Exclude()` sensitive fields (passwords, tokens)
- CORS via `app.enableCors()` — restrict origins in production

## Testing Strategies

```typescript
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when roles match', () => {
    const context = createMockExecutionContext({
      user: { roles: ['admin'] },
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when roles do not match', () => {
    const context = createMockExecutionContext({
      user: { roles: ['user'] },
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(context)).toBe(false);
  });
});
```

Test interceptors by mocking `ExecutionContext` and `CallHandler`. Test pipes with direct invocation and expected transforms.

## Rules
- Guards return boolean or throw. Never modify request/response.
- Interceptors transform using RxJS. Return `Observable<T>`.
- Pipes transform value or throw `BadRequestException`.
- Filters catch `HttpException` subclasses. Last resort for unhandled.
- CQRS: Commands mutate, Queries return data. Events trigger side effects.
- Microservice `@MessagePattern` expects reply, `@EventPattern` is fire-and-forget.
- `@nestjs/testing` `Test.createTestingModule` for all unit tests.

## References
  - references/cqrs-events.md — CQRS and Events
  - references/decorators-metadata.md — Custom Decorators and Metadata
  - references/guards-interceptors.md — Guards and Interceptors
  - references/microservices.md — Microservices with NestJS
  - references/nestjs-guards-interceptors.md — Guards/Interceptors Deep Dive
  - references/nestjs-providers-patterns.md — Provider Patterns
  - references/nestjs-testing.md — Testing NestJS
  - references/pipes-filters.md — Pipes and Filters
## Handoff
Hand off to `backend/nestjs/architecture/SKILL.md` for module structure or `backend/universal/api-response/SKILL.md` for API response formatting.
