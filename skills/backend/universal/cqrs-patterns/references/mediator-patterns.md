# Mediator Patterns for CQRS

## Purpose

The mediator pattern decouples command/query senders from their handlers. Instead of injecting each handler directly into a controller, the controller depends only on the mediator interface. The mediator routes requests to the correct handler.

## Mediator Interface

```typescript
interface IMediator {
  send<TCommand extends ICommand, TResult>(command: TCommand): Promise<TResult>;
  query<TQuery extends IQuery, TResult>(query: TQuery): Promise<TResult>;
  publish<TEvent>(event: TEvent): Promise<void>;
}
```

### Send vs Publish
- `send()` → routes to exactly ONE handler (commands, queries)
- `publish()` → routes to ZERO OR MORE handlers (events, notifications)

## Implementation Patterns

### Simple Mediator
```typescript
class SimpleMediator implements IMediator {
  private commandHandlers = new Map<string, ICommandHandler<any, any>>();
  private queryHandlers = new Map<string, IQueryHandler<any, any>>();
  private eventHandlers = new Map<string, IEventHandler<any>[]>();

  registerCommand<T>(name: string, handler: ICommandHandler<T, any>): void {
    this.commandHandlers.set(name, handler);
  }

  registerQuery<T>(name: string, handler: IQueryHandler<T, any>): void {
    this.queryHandlers.set(name, handler);
  }

  registerEvent<T>(name: string, handler: IEventHandler<T>): void {
    const handlers = this.eventHandlers.get(name) || [];
    handlers.push(handler);
    this.eventHandlers.set(name, handlers);
  }

  async send<TCommand, TResult>(command: TCommand): Promise<TResult> {
    const name = command.constructor.name;
    const handler = this.commandHandlers.get(name);
    if (!handler) throw new Error(`No command handler registered for ${name}`);
    return handler.handle(command);
  }

  async query<TQuery, TResult>(query: TQuery): Promise<TResult> {
    const name = query.constructor.name;
    const handler = this.queryHandlers.get(name);
    if (!handler) throw new Error(`No query handler registered for ${name}`);
    return handler.handle(query);
  }

  async publish<TEvent>(event: TEvent): Promise<void> {
    const name = event.constructor.name;
    const handlers = this.eventHandlers.get(name) || [];
    await Promise.allSettled(
      handlers.map(h => h.handle(event).catch(e => console.error(`Event handler failed: ${e}`)))
    );
  }
}
```

### Decorator-Based Mediator (TypeScript)
```typescript
// Decorator-based handler registration
const COMMAND_HANDLERS = Symbol('command_handlers');

function CommandHandler(commandName: string) {
  return function (target: any) {
    Reflect.defineMetadata(COMMAND_HANDLERS, commandName, target);
  };
}

@CommandHandler('PlaceOrderCommand')
class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand, Result> {
  async handle(command: PlaceOrderCommand): Promise<Result> { ... }
}

// Auto-registration
class AutoMediator implements IMediator {
  constructor() {
    // Auto-discover and register all handlers
    for (const handler of discoverHandlers()) {
      const commandName = Reflect.getMetadata(COMMAND_HANDLERS, handler.constructor);
      if (commandName) {
        this.registerCommand(commandName, handler);
      }
    }
  }
}
```

### Mediator with Pipeline (Production)
```typescript
class PipelineMediator implements IMediator {
  private handlers = new Map<string, IRequestHandler<any, any>>();
  private behaviors: IPipelineBehavior[] = [];

  addBehavior(behavior: IPipelineBehavior): void {
    this.behaviors.push(behavior);
  }

  async send<TRequest, TResult>(request: TRequest): Promise<TResult> {
    const name = request.constructor.name;
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`No handler for ${name}`);

    // Build pipeline chain
    let next = () => handler.handle(request);
    for (const behavior of this.behaviors.reverse()) {
      const currentNext = next;
      const currentBehavior = behavior;
      next = () => currentBehavior.handle(request, currentNext);
    }
    return next();
  }
}
```

## Mediator vs Direct Injection

| Aspect | Mediator | Direct Injection |
|--------|----------|-----------------|
| Coupling | Controller depends only on mediator | Controller depends on N handlers |
| Cross-cutting | Pipeline behaviors (centralized) | Decorators or AOP |
| Testability | Swap mediator mock | Swap individual handler mocks |
| Discovery | Auto-registration possible | Manual wiring |
| Complexity | One more abstraction | Simpler, more explicit |
| Performance | Single dispatch overhead | Direct method call |

### When to Use Mediator
- Many commands/queries (10+) in the same controller
- Cross-cutting concerns (logging, validation, metrics) need centralized application
- Handlers are registered by different modules at composition root
- You want auto-discovery of handlers

### When to Use Direct Injection
- Fewer than 5 commands/queries
- Handlers have very different dependencies (making mediator registration verbose)
- Maximum performance is critical (microseconds matter)
- Simplicity is preferred over extensibility

## Mediator and NestJS

NestJS has native CQRS support with the `@nestjs/cqrs` package:

```typescript
import { CommandBus, QueryBus, EventBus } from '@nestjs/cqrs';

@Controller('orders')
class OrderController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.commandBus.execute(new PlaceOrderCommand(dto));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.queryBus.execute(new GetOrderQuery(id));
  }
}

// Command definition
class PlaceOrderCommand {
  constructor(public readonly dto: CreateOrderDto) {}
}

// Handler
@CommandHandler(PlaceOrderCommand)
class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
  ) {}
  async execute(command: PlaceOrderCommand): Promise<Order> { ... }
}
```

## Mediator Pipeline Behavior Examples

### Validation
```typescript
class ValidationBehavior<TRequest> implements IPipelineBehavior<TRequest, any> {
  constructor(private validator: IValidator<TRequest>) {}
  async handle(request: TRequest, next: () => Promise<any>): Promise<any> {
    const errors = await this.validator.validate(request);
    if (errors.length > 0) throw new ValidationException(errors);
    return next();
  }
}
```

### Caching (Queries Only)
```typescript
class CachingBehavior<TQuery, TResult> implements IPipelineBehavior<TQuery, TResult> {
  constructor(private cache: ICacheService) {}
  async handle(query: TQuery, next: () => Promise<TResult>): Promise<TResult> {
    if (query instanceof IQuery) {
      const key = `${query.constructor.name}:${JSON.stringify(query)}`;
      const cached = await this.cache.get<TResult>(key);
      if (cached) return cached;
      const result = await next();
      await this.cache.set(key, result, 300); // 5 min TTL
      return result;
    }
    return next(); // Don't cache commands
  }
}
```

### Performance Monitoring
```typescript
class MonitoringBehavior<TRequest, TResult> implements IPipelineBehavior<TRequest, TResult> {
  constructor(private metrics: IMetricsService) {}
  async handle(request: TRequest, next: () => Promise<TResult>): Promise<TResult> {
    const start = Date.now();
    const type = request instanceof ICommand ? 'command' : 'query';
    try {
      const result = await next();
      this.metrics.recordDuration(`${type}.${request.constructor.name}`, Date.now() - start);
      this.metrics.incrementSuccess(`${type}.${request.constructor.name}`);
      return result;
    } catch (error) {
      this.metrics.incrementFailure(`${type}.${request.constructor.name}`);
      throw error;
    }
  }
}
```
