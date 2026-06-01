---
name: nestjs-architecture
description: >
  Use this skill when structuring NestJS applications — module-based architecture, dependency injection, provider scopes, dynamic modules, and monorepo structure. This skill enforces: one module per domain, provider encapsulation, module boundary enforcement, global vs scoped providers. Requires @nestjs/core. Do NOT use for: Express-only projects, React/Vue frontend, or non-NestJS Node.js frameworks.
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

# NestJS Architecture

## Purpose
Structure NestJS applications with module-based architecture — domain modules, shared modules, dynamic modules, monorepo projects, and provider scoping.

## Agent Protocol

### Trigger
User request includes: `NestJS module structure`, `NestJS architecture`, `NestJS project layout`, `NestJS DI`, `NestJS modules`, `NestJS monorepo`, `NestJS providers`.

### Input Context
- NestJS version (10+)
- Architecture style (modular, monorepo, microservices)
- Database (TypeORM, Prisma, MikroORM, Mongoose)
- Transport (HTTP, WebSocket, TCP, RabbitMQ)

### Output Artifact
Module structure, provider registration, module exports, monorepo layout, DI setup.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Root module imports feature modules
- Each domain has its own module with controllers, services, repositories
- Modules export only what other modules need
- Global modules registered sparingly (shared infra only)
- Dynamic modules configured with forRoot/forFeature

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Module Organization: Feature vs Shared vs Core

| Module Type | Contains | Export Strategy | Example |
|-------------|----------|----------------|---------|
| Feature | Controllers, Services, Repositories | Only what others need | UsersModule, OrdersModule |
| Shared | Reusable utilities, guards, filters | Everything | CommonModule |
| Core | Singletons (DB, config, logger) | Global | DatabaseModule, ConfigModule |

Decision: Domain logic → Feature Module. Cross-cutting concern → Shared Module. Infrastructure singleton → Global Core Module.

### Provider Scope Decision

| Scope | Lifetime | Use Case |
|-------|----------|----------|
| DEFAULT (singleton) | One per app | Services, repositories, DB connections |
| TRANSIENT | New per injection | Stateful validators, per-request cache |
| REQUEST | New per HTTP request | Request-scoped data (tenant, user) |

Decision: Stateless service → DEFAULT. Stateful per-instance → TRANSIENT. Per-request data → REQUEST.

## Workflow

### Step 1: Project Structure

```
src/
  main.ts                              # Bootstrap
  app.module.ts                        # Root module
  app.controller.ts                    # Health check
  common/
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
    guards/
      auth.guard.ts
      roles.guard.ts
    filters/
      http-exception.filter.ts
    interceptors/
      logging.interceptor.ts
      transform.interceptor.ts
    pipes/
      validation.pipe.ts
    interfaces/
      user-request.interface.ts
  modules/
    users/
      user.module.ts
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.entity.ts
      dto/
        create-user.dto.ts
        update-user.dto.ts
    orders/
      order.module.ts
      order.controller.ts
      order.service.ts
      order.entity.ts
      dto/
  config/
    database.config.ts
    app.config.ts
```

### Step 2: Feature Module

```typescript
// modules/users/user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UsersModule {}

// modules/users/user.controller.ts
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.delete(id);
  }
}

// modules/users/user.service.ts
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.userRepository.save(dto.toEntity());
    this.eventEmitter.emit('user.created', user);
    return user;
  }
}
```

### Step 3: Common Module (Shared)

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// common/guards/auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => this.logger.log(`${method} ${url} ${Date.now() - now}ms`)),
    );
  }
}
```

### Step 4: Dynamic Module Pattern

```typescript
// config/database.config.ts
export interface DatabaseModuleOptions {
  type: 'postgres' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      imports: [
        TypeOrmModule.forRoot({
          type: options.type,
          host: options.host,
          port: options.port,
          username: options.username,
          password: options.password,
          database: options.database,
          autoLoadEntities: true,
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
        }),
      ],
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
      ],
      exports: ['DATABASE_OPTIONS'],
    };
  }

  static forFeature(models: EntityClassOrSchema[]): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(models)],
      exports: [TypeOrmModule],
    };
  }
}

// Usage in app.module.ts
@Module({
  imports: [
    DatabaseModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    }),
    UsersModule,
    OrdersModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

### Step 5: Monorepo Structure

```
apps/
  api/
    src/
      main.ts
      app.module.ts
  admin/
    src/
      main.ts
      admin.module.ts
  worker/
    src/
      main.ts
      worker.module.ts
libs/
  common/
    src/
      decorators/
      guards/
      interceptors/
      filters/
      common.module.ts
  database/
    src/
      database.module.ts
      entities/
      repositories/
shared/
  types/
  interfaces/
nest-cli.json
```

```typescript
// nest-cli.json (monorepo)
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "monorepo": true,
  "root": "apps/api",
  "projects": {
    "api": { "type": "application", "root": "apps/api", "entryFile": "main" },
    "admin": { "type": "application", "root": "apps/admin", "entryFile": "main" },
    "worker": { "type": "application", "root": "apps/worker", "entryFile": "main" },
    "common": { "type": "library", "root": "libs/common" },
    "database": { "type": "library", "root": "libs/database" }
  }
}
```

### Step 6: Config Module

```typescript
// config/app.config.ts
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
  },
}));

// Usage in service
@Injectable()
export class AppService {
  constructor(
    @InjectConfig() private readonly appConfig: ConfigType<typeof appConfig>,
  ) {}

  getPort(): number {
    return this.appConfig.port;
  }
}
```

## Implementation Patterns

### Pattern: CQRS with @nestjs/cqrs

```typescript
// Create command
export class CreateUserCommand {
  constructor(public readonly dto: CreateUserDto) {}
}

// Command handler
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const { dto } = command;
    return this.userRepository.save(dto.toEntity());
  }
}

// Controller dispatches
@Post()
async create(@Body() dto: CreateUserDto) {
  return this.commandBus.execute(new CreateUserCommand(dto));
}
```

### Pattern: Events and Event Handlers

```typescript
// Event
export class UserCreatedEvent {
  constructor(public readonly user: User) {}
}

// Event handler
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async handle(event: UserCreatedEvent) {
    await Promise.all([
      this.emailService.sendWelcome(event.user),
      this.analyticsService.track('user.created', event.user.id),
    ]);
  }
}
```

## Production Considerations

### Graceful Shutdown
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({ origin: process.env.CORS_ORIGIN });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
```

### OpenTelemetry
```typescript
// Register OpenTelemetry SDK
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const otelSDK = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
otelSDK.start();
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Circular module imports | DI fails at runtime | Use shared module or forwardRef |
| All providers in root module | No encapsulation, poor reusability | Per-feature modules with exports |
| Global guards registered inline | Can't test without full module | Use `APP_GUARD` token in providers |
| Services with multiple repo injections | SRP violation | Split into smaller services |
| Directly importing TypeORM module in feature | Tight coupling to ORM | Use repository pattern via DI |

## Security Considerations
- Guards for auth, not middleware (Guards have ExecutionContext context)
- `ValidationPipe` with `whitelist: true` to strip unknown properties
- `ParseUUIDPipe` on all ID params to prevent injection
- Helmet: `app.use(helmet())` at bootstrap
- Rate limiting: `@nestjs/throttler` module
- CSRF: use `csurf` middleware for cookie-based auth
- Serialization: `@Exclude()` / `@ClassSerializerInterceptor` to hide sensitive fields

## Testing Strategies

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockType<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useFactory: repositoryMockFactory },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(UserRepository);
  });

  it('should throw on duplicate email', async () => {
    repository.findByEmail.mockResolvedValue({ email: 'test@test.com' });
    await expect(service.create({ email: 'test@test.com', name: 'Test' }))
      .rejects.toThrow(ConflictException);
  });
});
```

Use `@nestjs/testing` for unit tests. Use `supertest` with `createNestApplication` for e2e tests. Use `TestContainers` for database integration tests.

## Rules
- One module per domain/bounded context. No mega-modules.
- Modules export only what is needed by other modules — keep the public API small.
- Feature modules import TypeOrmModule.forFeature, never directly import database connection.
- `APP_*` tokens (APP_GUARD, APP_INTERCEPTOR, APP_FILTER, APP_PIPE) in root module only.
- All injections via constructor — no `@Inject()` on properties.
- Services are `@Injectable()`, controllers are `@Controller()`, both in module `providers`/`controllers`.
- Pipes for validation, Guards for authorization, Interceptors for transformation, Filters for error handling.

## References
  - references/ddd-nestjs.md — DDD with NestJS
  - references/module-structure.md — Module Structure Guidelines
  - references/nestjs-cqrs.md — CQRS with NestJS
  - references/nestjs-deployment.md — NestJS Deployment
  - references/nestjs-modules.md — NestJS Modules Deep Dive
  - references/nestjs-testing.md — NestJS Testing
## Handoff
Hand off to `backend/nestjs/patterns/SKILL.md` for NestJS-specific patterns or `backend/universal/api-response/SKILL.md` for API response formatting.
