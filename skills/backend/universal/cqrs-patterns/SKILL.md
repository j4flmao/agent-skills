---
name: backend-cqrs-patterns
description: >
  Use this skill when the user says 'CQRS', 'command query segregation', 'separate read write model', 'command model', 'query model', 'read model', 'write model', 'materialized view', 'command handler', 'query handler'. This skill enforces: strict command/query separation, write model optimized for consistency, read model optimized for performance, eventual consistency between models, command validation before execution. Applies to any backend stack. Do NOT use for: simple CRUD applications, event sourcing (use event-sourcing skill), or microservices decomposition (use microservices skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, cqrs, patterns, architecture]
---

# Backend CQRS Patterns

## Purpose
Separate read and write models so each can be optimized independently — write side for consistency and validation, read side for query performance and projection flexibility.

## Agent Protocol

### Trigger
Exact user phrases: "CQRS", "command query segregation", "separate read write", "command model", "query model", "read model", "write model", "materialized view", "command handler", "query handler", "command bus", "query bus".

### Input Context
- Whether the system is greenfield or existing.
- Current data access pattern (CRUD, repository, ORM).
- Read-to-write ratio and query complexity.
- Consistency requirements (strong vs eventual).

### Output Artifact
CQRS design as text. No file unless requested.

### Response Format
```
Command: {name}
Handler: {class/module}
Validation: {rules}
Write model: {storage}

Query: {name}
Handler: {class/module}
Read model: {storage/projection}
```

### Completion Criteria
- [ ] Commands and queries are in separate model classes.
- [ ] Commands return success/failure, never data.
- [ ] Queries return data, never cause side effects.
- [ ] Write model uses transactional consistency.
- [ ] Read model tolerates eventual consistency.
- [ ] Command validation is separate from command execution.
- [ ] Synchronization mechanism defined (if separate stores).

### Max Response Length
Per command/query: 6 lines. Full design: 30 lines.

## Architecture Decision Tree

### Should I Use CQRS?

```
Are read and write data shapes significantly different?
  ├── Yes → CQRS candidate
  └── No → Is the read-to-write ratio > 10:1?
            ├── Yes → Consider CQRS for read optimization
            └── No → Is query complexity causing write model compromises?
                      ├── Yes → CQRS may help separate concerns
                      └── No → Simple CRUD is sufficient — skip CQRS
```

### Same Database vs Separate Databases?

```
Do queries require different storage technology than writes?
  ├── Yes → Separate databases (e.g., PG for writes, Elasticsearch for reads)
  └── No → Can you use materialized views or same-DB projections?
            ├── Yes → Same database, different models (simpler)
            └── No → Separate databases
```

## Workflow

### Step 1: Identify Command vs Query Boundaries

| Aspect | Command (Write) | Query (Read) |
|--------|----------------|--------------|
| Intent | Change state | Return state |
| Return | void/success | data |
| Side effects | Yes | No |
| Validation | Business rules | None |
| Consistency | Strong (transactional) | Eventual |
| Model | Domain entities | Projections/DTOs |
| Optimized for | Write throughput, consistency | Read performance, flexibility |

Commands are named with imperative verb: `PlaceOrder`, `UpdateUserEmail`, `CancelInvoice`.
Queries are named with question or noun: `GetOrderById`, `SearchProducts`, `OrderHistory`.

### Step 2: Define Command Model

```typescript
// Write model — domain entities, rich behavior
class OrderAggregate {
  constructor(private state: OrderState) {}

  placeOrder(command: PlaceOrderCommand): OrderPlacedEvent {
    this.validateItems(command.items);
    this.validateCustomer(command.customerId);
    this.state = {
      status: 'pending',
      items: command.items,
      total: this.calculateTotal(command.items),
    };
    return new OrderPlacedEvent({
      orderId: this.state.id,
      total: this.state.total,
    });
  }

  private validateItems(items: OrderItem[]) {
    if (items.length === 0) throw new Error('Order must have at least one item');
    if (items.some(i => i.quantity <= 0)) throw new Error('Item quantity must be positive');
  }
}
```

```python
# Python write model
@dataclass
class OrderAggregate:
    state: OrderState

    def place_order(self, command: PlaceOrderCommand) -> OrderPlacedEvent:
        if not command.items:
            raise BusinessRuleError("Order must have at least one item")
        if command.customer_id is None:
            raise BusinessRuleError("Customer ID is required")
        self.state = OrderState(
            status=OrderStatus.PENDING,
            items=command.items,
            total=self._calculate_total(command.items),
        )
        return OrderPlacedEvent(
            order_id=self.state.id,
            total=self.state.total,
        )
```

### Step 3: Define Read Model

```typescript
// Read model — flat projections optimized for queries
interface OrderSummary {
  id: string;
  customerName: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: Date;
}

interface OrderDetail {
  id: string;
  customer: { id: string; name: string; email: string };
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  status: string;
  timeline: Array<{ event: string; timestamp: Date }>;
}
```

### Step 4: Implement Command Handler

```typescript
class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    private repository: IOrderRepository,
    private eventBus: IEventBus
  ) {}

  async handle(command: PlaceOrderCommand): Promise<Result> {
    const aggregate = new OrderAggregate(OrderState.create(command.orderId));
    const event = aggregate.placeOrder(command);
    await this.repository.save(aggregate);
    await this.eventBus.publish(event);
    return Result.success();
  }
}
```

### Step 5: Implement Query Handler

```typescript
class GetOrderQueryHandler implements IQueryHandler<GetOrderQuery, OrderDetail> {
  constructor(private readDb: IOrderReadRepository) {}

  async handle(query: GetOrderQuery): Promise<OrderDetail | null> {
    return this.readDb.findById(query.orderId);
  }
}
```

### Step 6: Synchronize Read Model

```typescript
class OrderProjection {
  constructor(private readDb: IOrderReadRepository) {}

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.insert({
      id: event.data.orderId,
      customerName: event.data.customerName,
      itemCount: event.data.items.length,
      total: event.data.total,
      status: 'pending',
      createdAt: event.occurredAt,
    });
  }

  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readDb.update(event.data.orderId, { status: 'shipped' });
  }
}
```

## Mediator Pattern

### Why a Mediator?
A mediator decouples command/query senders from handlers. Instead of injecting each handler individually, inject a mediator that routes requests to the correct handler.

```typescript
// Mediator interface
interface IMediator {
  send<TCommand, TResult>(command: TCommand): Promise<TResult>;
  query<TQuery, TResult>(query: TQuery): Promise<TResult>;
}

// Implementation
class Mediator implements IMediator {
  private handlers = new Map<string, ICommandHandler<any, any>>();

  register(commandName: string, handler: ICommandHandler<any, any>): void {
    this.handlers.set(commandName, handler);
  }

  async send<TCommand, TResult>(command: TCommand): Promise<TResult> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) throw new Error(`No handler for ${command.constructor.name}`);
    return handler.handle(command);
  }

  async query<TQuery, TResult>(query: TQuery): Promise<TResult> {
    const handler = this.handlers.get(query.constructor.name);
    if (!handler) throw new Error(`No handler for ${query.constructor.name}`);
    return handler.handle(query);
  }
}

// Usage — controller depends only on mediator
class OrderController {
  constructor(private mediator: IMediator) {}

  async createOrder(req: Request, res: Response) {
    const command = new PlaceOrderCommand(req.body);
    const result = await this.mediator.send(command);
    res.status(201).json(result);
  }

  async getOrder(req: Request, res: Response) {
    const query = new GetOrderQuery(req.params.id);
    const order = await this.mediator.query(query);
    res.status(200).json(order);
  }
}
```

### Mediator Pipeline Behaviors
Add cross-cutting concerns as pipeline behaviors that wrap command/query execution:

```typescript
interface IPipelineBehavior<TRequest, TResult> {
  handle(request: TRequest, next: () => Promise<TResult>): Promise<TResult>;
}

// Logging behavior
class LoggingBehavior<TRequest, TResult> implements IPipelineBehavior<TRequest, TResult> {
  constructor(private logger: ILogger) {}
  async handle(request: TRequest, next: () => Promise<TResult>): Promise<TResult> {
    this.logger.info(`Handling ${request.constructor.name}`, { request });
    const result = await next();
    this.logger.info(`Handled ${request.constructor.name}`);
    return result;
  }
}

// Validation behavior
class ValidationBehavior<TRequest, TResult> implements IPipelineBehavior<TRequest, TResult> {
  constructor(private validators: IValidator<TRequest>[]) {}
  async handle(request: TRequest, next: () => Promise<TResult>): Promise<TResult> {
    for (const validator of this.validators) {
      const errors = await validator.validate(request);
      if (errors.length > 0) throw new ValidationError(errors);
    }
    return next();
  }
}

// Transaction behavior
class TransactionBehavior<TRequest, TResult> implements IPipelineBehavior<TRequest, TResult> {
  constructor(private unitOfWork: IUnitOfWork) {}
  async handle(request: TRequest, next: () => Promise<TResult>): Promise<TResult> {
    if (request instanceof ICommand) {
      return this.unitOfWork.execute(() => next());
    }
    return next(); // No transaction for queries
  }
}
```

## Command Validation Patterns

### Separate Validation from Execution
Validation checks two things:
1. **Input validity**: Is the command well-formed? (handled by Presentation layer)
2. **Business validity**: Does the command violate business rules? (handled in Command Handler)

```typescript
// Step 1: Input validation — Presentation layer
import { z } from 'zod';

const placeOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1).max(50),
});

type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

// Step 2: Business validation — in Command Handler
class PlaceOrderHandler {
  async handle(command: PlaceOrderCommand): Promise<Result> {
    const customer = await this.customerRepo.findById(command.customerId);
    if (!customer) return Result.failure('Customer not found');
    if (customer.status === 'suspended') return Result.failure('Customer suspended');
    
    for (const item of command.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) return Result.failure(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) return Result.failure(`Insufficient stock for ${product.name}`);
    }
    
    // All validations passed — execute command
    const aggregate = new OrderAggregate(OrderState.create(uuid()));
    const event = aggregate.placeOrder(command);
    await this.repository.save(aggregate);
    await this.eventBus.publish(event);
    return Result.success({ orderId: aggregate.state.id });
  }
}
```

## Read Model Optimization

### Projection Types

| Projection | Performance | Complexity | Freshness | Use Case |
|---|---|---|---|---|
| Same-DB view | Medium | Low | Real-time | Simple denormalization |
| Materialized view | High | Low | Configurable | Periodic aggregations |
| Event-driven table | High | Medium | Near real-time | Cross-service data |
| Cache-aside | Very high | Low | On-demand | Hot data |
| Search index | High | High | Near real-time | Full-text search |

### Event-Driven Projection with Transactional Outbox
```typescript
// Write model publishes event → outbox → projection → read model update
class OrderProjection {
  constructor(
    private readDb: IReadRepository,
    private logger: ILogger,
  ) {}

  async handleEvent(event: OrderPlacedEvent): Promise<void> {
    try {
      await this.readDb.upsert('order_summaries', {
        id: event.data.orderId,
        customer_id: event.data.customerId,
        item_count: event.data.items.length,
        total: event.data.total,
        status: 'placed',
        created_at: event.occurredAt,
      });
    } catch (error) {
      this.logger.error('Projection failed', { eventId: event.eventId, error });
      throw error; // Let the message broker retry
    }
  }

  async handleEvent(event: OrderShippedEvent): Promise<void> {
    await this.readDb.update('order_summaries', event.data.orderId, {
      status: 'shipped',
      tracking_number: event.data.trackingNumber,
    });
  }
}
```

## Event Sourcing Integration

### CQRS + Event Sourcing
When CQRS is combined with event sourcing, the write model becomes an event stream and the read model is built from event projections.

```
Command → Aggregate → Validate → Emit Events → Append to Event Store → Publish Events → Update Read Model
```

See the `event-sourcing` skill for details on event store design and aggregate reconstruction.

## Testing Strategies

### Command Handler Tests
```typescript
describe('PlaceOrderHandler', () => {
  let handler: PlaceOrderHandler;
  let mockRepo: jest.Mocked<IOrderRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    mockRepo = { save: jest.fn() };
    mockEventBus = { publish: jest.fn() };
    handler = new PlaceOrderHandler(mockRepo, mockEventBus);
  });

  it('saves aggregate and publishes event on success', async () => {
    const result = await handler.handle(validCommand);
    expect(result.isSuccess()).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.any(OrderAggregate));
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(OrderPlacedEvent));
  });

  it('fails on invalid items', async () => {
    const result = await handler.handle(invalidCommand);
    expect(result.isSuccess()).toBe(false);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

### Query Handler Tests
```typescript
describe('GetOrderQueryHandler', () => {
  let handler: GetOrderQueryHandler;
  let mockReadDb: jest.Mocked<IOrderReadRepository>;

  it('returns order detail', async () => {
    mockReadDb.findById.mockResolvedValue(orderDetailFixture);
    const result = await handler.handle(new GetOrderQuery('order-1'));
    expect(result).toEqual(orderDetailFixture);
  });

  it('returns null for non-existent order', async () => {
    mockReadDb.findById.mockResolvedValue(null);
    const result = await handler.handle(new GetOrderQuery('non-existent'));
    expect(result).toBeNull();
  });
});
```

## Production Considerations

### Performance
- Read model queries are typically < 10ms (denormalized, indexed)
- Command handlers are typically 20-100ms (validation, aggregate load, save)
- Projection lag should be < 1 second for near-real-time systems
- Use Redis or similar for cache-aside read models

### Anti-Patterns
1. **Shared model**: Using same class for command input and query output
2. **No separation at all**: Having read/write in same service with no model separation
3. **Forcing eventual consistency where strong is needed**: Document acceptance of staleness
4. **Over-engineering**: Applying CQRS to simple CRUD operations
5. **Synchronous projection updates**: Blocking the write path to update read models

### Trade-Offs
| Decision | Benefit | Cost |
|---|---|---|
| Separate read/write databases | Independent optimization, scaling | Data synchronization complexity |
| Same database, different models | Simpler operations, strong consistency | Shared contention, less optimization |
| Mediator pattern | Decoupled handlers, pipeline behaviors | Indirect dispatch, framework overhead |
| Event-driven projections | Scalable, resilient | Eventual consistency, projection delay |
| Combined CQRS + ES | Full audit trail, temporal queries | Complex event store management |

## Rules
- Commands never return data. They return success or failure. Queries never cause side effects.
- Write model enforces business rules and invariants. Read model is a dumb projection.
- If using separate stores, the read model is eventually consistent. Design for staleness.
- Command validation happens before command execution, not during.
- Queries can join, aggregate, and denormalize freely. Commands access only their aggregate.
- Do NOT apply CQRS to simple CRUD — it adds complexity without benefit.
- Eventual consistency delay must be documented and acceptable to product stakeholders.
- Every projection must be rebuildable from scratch.
- Mediator pipeline behaviors are for cross-cutting concerns (logging, validation, tx), not business logic.

## References
  - references/command-query-separation.md — Command-Query Separation
  - references/command-validation.md — Command Validation
  - references/cqrs-fundamentals.md — CQRS Fundamentals
  - references/cqrs-advanced.md — CQRS Advanced Patterns
  - references/cqrs-monitoring.md — CQRS Monitoring
  - references/cqrs-sync-strategies.md — CQRS Synchronization Strategies
  - references/cqrs-testing.md — CQRS Testing
  - references/event-sourcing.md — Event Sourcing
  - references/mediator-patterns.md — Mediator Patterns for CQRS
  - references/read-model-strategies.md — Read Model Strategies
## Handoff
No artifact produced.
Next skill: event-sourcing — if events are the source of truth for the write model.
Carry forward: command/query separation, read model projections, synchronization mechanism.
