# Command-Query Separation

## Purpose

Command-Query Separation (CQS) is the principle that every operation should either be a command (changes state) or a query (returns data), but not both. In CQRS, this is taken to the architectural level: separate command and query models, separate handlers, and often separate data stores. This reference covers command bus and query bus implementations, command validation, query optimization, read model projections, and eventual consistency handling.

## Command Bus

### What a Command Bus Does

A command bus receives a command object, routes it to the appropriate handler, and returns a result. It decouples the caller from the handler implementation and can apply middleware (logging, validation, transactions, metrics) transparently.

### Simple Command Bus Implementation

```typescript
interface ICommandHandler<TCommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>
}

class SimpleCommandBus {
  private handlers = new Map<string, ICommandHandler<any>>()
  private middleware: CommandMiddleware[] = []

  register<T>(commandName: string, handler: ICommandHandler<T>): void {
    this.handlers.set(commandName, handler)
  }

  use(middleware: CommandMiddleware): void {
    this.middleware.push(middleware)
  }

  async dispatch<TResult = void>(command: object): Promise<TResult> {
    const commandName = command.constructor.name

    // Build middleware chain
    const handler = this.handlers.get(commandName)
    if (!handler) throw new Error(`No handler registered for ${commandName}`)

    let index = 0
    const execute = async (cmd: object): Promise<TResult> => {
      if (index < this.middleware.length) {
        return this.middleware[index++].execute(cmd, execute as any)
      }
      return handler.handle(cmd)
    }

    return execute(command) as Promise<TResult>
  }
}

// Middleware example
interface CommandMiddleware {
  execute(command: object, next: (cmd: object) => Promise<any>): Promise<any>
}

class ValidationMiddleware implements CommandMiddleware {
  async execute(command: object, next: (cmd: object) => Promise<any>): Promise<any> {
    const errors = await validate(command)
    if (errors.length > 0) throw new ValidationError(errors)
    return next(command)
  }
}

class LoggingMiddleware implements CommandMiddleware {
  constructor(private logger: Logger) {}

  async execute(command: object, next: (cmd: object) => Promise<any>): Promise<any> {
    this.logger.info(`Executing command: ${command.constructor.name}`, command)
    const start = Date.now()
    try {
      const result = await next(command)
      this.logger.info(`Command succeeded: ${command.constructor.name}`, { duration: Date.now() - start })
      return result
    } catch (err) {
      this.logger.error(`Command failed: ${command.constructor.name}`, { error: err, duration: Date.now() - start })
      throw err
    }
  }
}
```

### Transactional Command Bus

```typescript
class TransactionalCommandBus {
  constructor(
    private inner: CommandBus,
    private unitOfWork: UnitOfWork
  ) {}

  async dispatch<TResult>(command: object): Promise<TResult> {
    return this.unitOfWork.execute(async () => {
      return this.inner.dispatch(command)
    })
  }
}
```

### Command Bus with MediatR (C#)

```csharp
public class PlaceOrderCommand : IRequest<Result>
{
    public Guid OrderId { get; set; }
    public Guid CustomerId { get; set; }
    public List<OrderItem> Items { get; set; }
}

public class PlaceOrderHandler : IRequestHandler<PlaceOrderCommand, Result>
{
    private readonly IOrderRepository _orderRepo;
    private readonly IPaymentGateway _paymentGateway;

    public PlaceOrderHandler(IOrderRepository orderRepo, IPaymentGateway paymentGateway)
    {
        _orderRepo = orderRepo;
        _paymentGateway = paymentGateway;
    }

    public async Task<Result> Handle(PlaceOrderCommand request, CancellationToken cancellationToken)
    {
        var order = new Order(request.OrderId, request.CustomerId);
        order.AddItems(request.Items);

        var payment = await _paymentGateway.Charge(order.Total);
        order.ConfirmPayment(payment.TransactionId);

        await _orderRepo.Save(order);
        return Result.Success();
    }
}
```

## Query Bus

### Query Bus Implementation

Queries are separated from commands. A query never causes side effects — it only retrieves data.

```typescript
interface IQueryHandler<TQuery, TResult> {
  handle(query: TQuery): Promise<TResult>
}

interface IQueryBus {
  dispatch<TResult>(query: object): Promise<TResult>
}

class QueryBus implements IQueryBus {
  private handlers = new Map<string, IQueryHandler<any, any>>()

  register<TQuery, TResult>(queryName: string, handler: IQueryHandler<TQuery, TResult>): void {
    this.handlers.set(queryName, handler)
  }

  async dispatch<TResult>(query: object): Promise<TResult> {
    const queryName = query.constructor.name
    const handler = this.handlers.get(queryName) as IQueryHandler<typeof query, TResult>
    if (!handler) throw new Error(`No handler registered for ${queryName}`)
    return handler.handle(query)
  }
}
```

### Query Handler Example

```typescript
class GetOrderByIdQuery {
  constructor(readonly orderId: string) {}
}

interface OrderDetailDTO {
  id: string
  customerName: string
  items: Array<{ product: string; quantity: number; price: number }>
  total: number
  status: string
  createdAt: Date
}

class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery, OrderDetailDTO | null> {
  constructor(private readDb: IOrderReadRepository) {}

  async handle(query: GetOrderByIdQuery): Promise<OrderDetailDTO | null> {
    return this.readDb.findById(query.orderId)
  }
}
```

### Query Bus Middleware

```typescript
class CachingQueryMiddleware implements QueryMiddleware {
  constructor(private cache: CacheService) {}

  async execute(query: object, next: (q: object) => Promise<any>): Promise<any> {
    const cacheKey = `${query.constructor.name}:${JSON.stringify(query)}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached

    const result = await next(query)
    if (result) {
      await this.cache.set(cacheKey, result, { ttl: 30_000 })
    }
    return result
  }
}
```

## Command Validation

### Separate Validation from Execution

Validation runs before the command handler. The command bus middleware validates the command, and if it fails, the handler is never called.

```typescript
// Zod validation schema
import { z } from 'zod'

const PlaceOrderSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    price: z.number().positive(),
  })).min(1),
})

// Validation middleware
class SchemaValidationMiddleware implements CommandMiddleware {
  private schemas = new Map<string, z.ZodSchema>()

  register(commandName: string, schema: z.ZodSchema): void {
    this.schemas.set(commandName, schema)
  }

  async execute(command: object, next: (cmd: object) => Promise<any>): Promise<any> {
    const schema = this.schemas.get(command.constructor.name)
    if (schema) {
      const result = schema.safeParse(command)
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => e.message))
      }
    }
    return next(command)
  }
}

// Usage
const bus = new SimpleCommandBus()
bus.use(new SchemaValidationMiddleware())
// Schema validation is applied to all commands automatically
```

### Business Rule Validation in Handlers

Input validation (format, required fields) goes in middleware. Business rule validation (duplicate email, insufficient balance) goes in the handler or domain entity.

```typescript
class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(private userRepo: UserRepository) {}

  async handle(command: RegisterUserCommand): Promise<Result> {
    // Business rule validation
    const existing = await this.userRepo.findByEmail(command.email)
    if (existing) {
      return Result.failure('Email already registered')
    }

    const user = User.create(command.name, command.email)
    await this.userRepo.save(user)
    return Result.success({ userId: user.id })
  }
}
```

## Query Optimization

### Read Model Design

Queries read from denormalized projections optimized for specific access patterns. Joins are done at projection time, not query time.

```typescript
// Denormalized read model for order listing
interface OrderListProjection {
  orderId: string
  customerName: string
  itemCount: number
  totalAmount: number
  currency: string
  status: string
  createdAt: Date
}

// Optimized query with filtering and pagination
class SearchOrdersHandler implements IQueryHandler<SearchOrdersQuery, PaginatedResult<OrderListProjection>> {
  constructor(private readDb: IOrderReadRepository) {}

  async handle(query: SearchOrdersQuery): Promise<PaginatedResult<OrderListProjection>> {
    const { data, total } = await this.readDb.search({
      status: query.status,
      customerId: query.customerId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
      offset: query.offset,
    })

    return {
      data,
      total,
      page: Math.floor(query.offset / query.limit) + 1,
      pageSize: query.limit,
      totalPages: Math.ceil(total / query.limit),
    }
  }
}
```

### Query-Specific Indexes

Read model databases have indexes tailored to the query patterns, not to the write model's constraints.

```sql
-- Write model index (optimized for uniqueness and lookups by PK)
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Read model index (optimized for search queries)
CREATE INDEX idx_order_projections_customer_status
  ON order_projections(customer_id, status, created_at DESC);
CREATE INDEX idx_order_projections_date
  ON order_projections(created_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_order_projections_fulltext
  ON order_projections USING GIN(to_tsvector('english', customer_name || ' ' || product_names));
```

### Materialized Views

For complex queries with expensive joins, use materialized views refreshed by the projection handler.

```sql
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT
  date_trunc('month', occurred_at) AS month,
  customer_tier,
  sum(amount) AS revenue,
  count(DISTINCT customer_id) AS active_customers
FROM payment_events
WHERE status = 'completed'
GROUP BY 1, 2;

CREATE UNIQUE INDEX idx_monthly_revenue ON monthly_revenue(month, customer_tier);

-- Refresh after events are processed
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;
```

## Read Model Projections

### Projection Handler

Projections subscribe to events and update the read model accordingly.

```typescript
class OrderProjection {
  constructor(
    private readDb: OrderReadDatabase,
    private logger: Logger
  ) {}

  async onOrderPlaced(event: OrderPlaced): Promise<void> {
    await this.readDb.insertOrder({
      orderId: event.data.orderId,
      customerId: event.data.customerId,
      customerName: event.data.customerName,
      itemCount: event.data.items.length,
      totalAmount: event.data.total,
      currency: event.data.currency,
      itemNames: event.data.items.map(i => i.productName).join(', '),
      status: 'pending',
      createdAt: event.occurredAt,
    })
  }

  async onPaymentConfirmed(event: PaymentConfirmed): Promise<void> {
    await this.readDb.updateOrderStatus(event.data.orderId, 'confirmed')
    await this.readDb.insertPayment({
      orderId: event.data.orderId,
      transactionId: event.data.transactionId,
      amount: event.data.amount,
      confirmedAt: event.occurredAt,
    })
  }

  async onOrderShipped(event: OrderShipped): Promise<void> {
    await this.readDb.updateOrder(event.data.orderId, {
      status: 'shipped',
      trackingNumber: event.data.trackingNumber,
      shippedAt: event.occurredAt,
    })
  }
}
```

### Multiple Projections

A single event can update multiple projections. Each projection is a different view of the same data.

```typescript
// Event handler dispatches to all projections
class EventDispatcher {
  private projections: IProjection[] = [
    new OrderListProjection(readDb),
    new CustomerSummaryProjection(readDb),
    new AnalyticsProjection(analyticsDb),
    new SearchIndexProjection(searchIndex),
  ]

  async handle(event: DomainEvent): Promise<void> {
    for (const projection of this.projections) {
      try {
        await projection.handle(event)
      } catch (err) {
        this.logger.error(`Projection ${projection.constructor.name} failed for event ${event.constructor.name}`, err)
        // Individual projection failure should not affect others
      }
    }
  }
}
```

### Projection Rebuilding

Projections are disposable — they can be rebuilt from scratch by replaying all events.

```typescript
class ProjectionRebuilder {
  constructor(
    private eventStore: EventStore,
    private projection: IProjection,
    private batchSize: number = 1000
  ) {}

  async rebuild(): Promise<void> {
    await this.projection.clear()
    let offset = 0
    let processed = 0

    while (true) {
      const events = await this.eventStore.loadBatch(offset, this.batchSize)
      if (events.length === 0) break

      for (const event of events) {
        await this.projection.handle(event)
        processed++
      }
      offset += this.batchSize
      console.log(`Rebuilt ${processed} events...`)
    }
    console.log(`Projection rebuild complete: ${processed} events`)
  }
}
```

## Separate Read/Write Data Stores

### Database Topology

```
Write Store (OLTP)                Read Store (OLAP / Denormalized)
+------------------+              +---------------------------+
| Order            |              | order_projections         |
| - id (PK)        |  event      | - order_id (PK)           |
| - status         | -------->   | - customer_name           |
| - items (JSONB)  |  driven     | - item_count              |
| - total          |              | - total_amount            |
| - customer_id    |              | - status                  |
| - created_at     |              | - tracking_number         |
| - updated_at     |              | - created_at              |
+------------------+              +---------------------------+
  | Normalized                    | Denormalized, flat
  | Constraints, FKs              | No constraints
  | Optimistic locking            | No locking
  | UUID PK                       | UUID PK (from domain)
```

### Synchronization Options

| Method | Latency | Consistency | Complexity |
|--------|---------|-------------|------------|
| Same transaction (dual write) | Immediate | Strong | Low (single DB) |
| Transactional outbox + CDC | Seconds | Eventual | Medium |
| Event-driven projection | Milliseconds | Eventual | Medium |
| Synchronous write-through | Milliseconds | Strong | High (2PC) |

### Transactional Outbox Pattern

```typescript
// Write model publishes events via outbox table
async function placeOrder(command: PlaceOrderCommand): Promise<Result> {
  return this.unitOfWork.execute(async () => {
    const order = new OrderAggregate(command.orderId)
    order.placeOrder(command.items, command.customerId)
    await this.orderRepo.save(order)
    // Events are saved in the same transaction via outbox
    await this.outbox.save(order.getUncommittedChanges())
    return Result.success()
  })
}

// Separate process (or CDC) reads outbox and publishes to event bus
async function processOutbox(): Promise<void> {
  const messages = await this.outbox.getUnprocessed()
  for (const message of messages) {
    try {
      await this.eventBus.publish(message.event)
      await this.outbox.markProcessed(message.id)
    } catch (err) {
      this.logger.error('Failed to publish outbox message', { id: message.id, error: err })
    }
  }
}
```

## Eventual Consistency Handling

### Consistency Expectations

Document for every read model:

```typescript
interface ReadModelConsistency {
  projection: string
  maxStaleness: string  // e.g., "5 seconds", "1 minute"
  typicalLatency: string
  consistencyGuarantee: 'at-most-once' | 'at-least-once' | 'exactly-once'
  tolerance: string  // e.g., "User may not see the latest order immediately"
}

const consistencyDocs: ReadModelConsistency[] = [
  {
    projection: 'order_list',
    maxStaleness: '5 seconds',
    typicalLatency: '<500ms',
    consistencyGuarantee: 'at-least-once',
    tolerance: 'User may not see their order immediately after placing it',
  },
  {
    projection: 'inventory_count',
    maxStaleness: '30 seconds',
    typicalLatency: '<2s',
    consistencyGuarantee: 'at-least-once',
    tolerance: 'Inventory count may show stale values; over-reservation prevented by write model check',
  },
]
```

### Handling Stale Reads

```typescript
// Query handler can check staleness
class GetOrderDetailHandler implements IQueryHandler<GetOrderQuery, OrderDetail | null> {
  async handle(query: GetOrderQuery): Promise<OrderDetail | null> {
    const order = await this.readDb.findById(query.orderId)
    if (!order) {
      // Order might not have propagated yet — check write model as fallback
      const writeOrder = await this.writeDb.findById(query.orderId)
      if (writeOrder) {
        return this.constructFromWriteModel(writeOrder)
      }
    }
    return order
  }

  // Return staleness info to client
  async handleWithMetadata(query: GetOrderQuery): Promise<{ data: OrderDetail | null; staleness: string }> {
    const order = await this.readDb.findById(query.orderId)
    return {
      data: order,
      staleness: order ? `${Date.now() - order.lastUpdatedAt.getTime()}ms stale` : 'not found',
    }
  }
}
```

### UI-Level Consistency

```typescript
// After a command, optimistically update the client-side cache
async function placeOrder(command: PlaceOrderCommand) {
  // Execute command
  const result = await commandBus.dispatch(command)

  // Optimistically update query cache
  queryClient.setQueryData(['orders', command.orderId], {
    id: command.orderId,
    status: 'pending',
    // ... optimistic data
  })

  // Invalidate list query to refetch
  queryClient.invalidateQueries({ queryKey: ['orders'] })
}
```

## Key Points

- Commands change state and return success/failure. Queries return data and never cause side effects.
- Command bus middleware handles cross-cutting concerns: validation, logging, transactions, metrics.
- Query bus supports caching middleware to avoid redundant reads.
- Command validation is split: format validation in middleware, business rule validation in handlers.
- Read models are denormalized projections optimized for specific query patterns.
- Projections are disposable — rebuild them by replaying events from the event store.
- Separate read/write stores use eventual consistency via transactional outbox or event-driven synchronization.
- Document consistency expectations for every read model, including max staleness.
- Use optimistic UI updates to mask eventual consistency from users.
- Never run commands and queries in the same transaction — they have different consistency requirements.
