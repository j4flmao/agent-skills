# CQRS Advanced Patterns

## Advanced Mediator Pipeline

### Full Pipeline Stack
A production mediator pipeline layers multiple behaviors:

```typescript
class MediatorPipeline<TRequest, TResult> {
  constructor(
    private inner: IRequestHandler<TRequest, TResult>,
    private behaviors: IPipelineBehavior<TRequest, TResult>[],
  ) {}

  async handle(request: TRequest): Promise<TResult> {
    // Compose behaviors into a chain
    const handler = this.behaviors.reduceRight(
      (next, behavior) => ({
        handle: (req: TRequest) => behavior.handle(req, () => next.handle(req)),
      }),
      this.inner,
    );
    return handler.handle(request);
  }
}

// Registration in Composition Root
mediator.register(PlaceOrderCommand, new MediatorPipeline(
  new PlaceOrderHandler(repo, bus),
  [
    new ValidationBehavior([placeOrderValidator]),
    new LoggingBehavior(logger),
    new TransactionBehavior(uow),
    new MetricsBehavior(metrics, 'place-order'),
  ],
));
```

### Behavior Execution Order
```
Request → Validation → Logging → Transaction → Metrics → Handler → Response
                           ↓                          ↑
                      (on error)              (duration recorded)
```

## Multi-Aggregate Commands

### Challenge
A single command may need to modify multiple aggregates atomically. CQRS strictness says one aggregate per transaction.

### Solution: Process Manager
```typescript
// Process Manager coordinates multiple aggregate operations
class SubmitOrderProcessManager {
  constructor(
    private orderRepo: IOrderRepository,
    private paymentRepo: IPaymentRepository,
    private inventoryRepo: IInventoryRepository,
    private eventBus: IEventBus,
  ) {}

  async execute(command: SubmitOrderCommand): Promise<Result> {
    // Step 1: Create order aggregate
    const order = Order.create(command.customerId, command.items);
    
    // Step 2: Reserve inventory (separate aggregate)
    const reservation = InventoryReservation.create(order.items);
    await this.inventoryRepo.save(reservation);
    
    // Step 3: Create payment intent (separate aggregate)
    const payment = PaymentIntent.create(order.total, command.paymentMethod);
    await this.paymentRepo.save(payment);
    
    // Step 4: Save order
    await this.orderRepo.save(order);
    
    // Step 5: Publish events asynchronously
    await this.eventBus.publish([
      order.releaseEvents(),
      reservation.releaseEvents(),
      payment.releaseEvents(),
    ]);
    
    return Result.success({ orderId: order.id, paymentId: payment.id });
  }
}
```

## Read Model Projection Patterns

### Filtered Projection
Only project events relevant to the specific read model:

```typescript
class ActiveOrderProjection {
  // Only processes order events, ignores payment events
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.insert('active_orders', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      itemCount: event.data.items.length,
      status: 'pending',
    });
  }

  async onOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    await this.readDb.delete('active_orders', event.data.orderId);
  }
  
  // Does NOT handle OrderShipped, PaymentFailed, etc.
  // Those events are irrelevant to "active orders"
}
```

### Aggregating Projection
Compute aggregates from the event stream:

```typescript
class DailySalesProjection {
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const dateKey = formatDate(event.occurredAt);
    await this.readDb.increment('daily_sales', dateKey, {
      order_count: 1,
      revenue: event.data.total,
      item_count: event.data.items.length,
    });
  }
}
```

### Projection Versioning
Version projections to allow gradual migration:

```typescript
class OrderProjectionV2 {
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    // V2 adds customer tier data
    const customer = await this.customerService.getCustomer(event.data.customerId);
    await this.readDb.upsert('order_summaries_v2', {
      id: event.data.orderId,
      customerTier: customer.tier,
      discountedTotal: customer.applyDiscount(event.data.total),
      // ... all V1 fields
    });
  }
}
```

## CQRS with Event Sourcing

### Command Flow
```
Command Handler → Load Aggregate from Event Store → Apply Command → 
  Validate → Emit Events → Append to Event Store → Publish Events
```

### Query Flow (from Projections)
```
Query → Read Model (maintained by event projections) → DTO → Response
```

### Benefit
- Write model is an append-only event stream — full audit trail
- Read models are rebuildable from scratch
- Temporal queries ("what was the state at time X?") are free
- Write and read models can evolve independently

## CQRS and Sagas

### Saga Orchestration with CQRS
Sagas coordinate multi-service operations. Each saga step is a command:

```typescript
class OrderSaga {
  @StartSaga
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    // Step 1: Reserve inventory (command to Inventory service)
    await this.mediator.send(new ReserveInventoryCommand(event.data.items));
  }

  @SagaEventHandler(InventoryReservedEvent)
  async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    // Step 2: Process payment (command to Payment service)
    await this.mediator.send(new ProcessPaymentCommand(event.data.orderId, event.data.total));
  }

  @SagaEventHandler(PaymentProcessedEvent)
  async onPaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
    // Step 3: Confirm order
    await this.mediator.send(new ConfirmOrderCommand(event.data.orderId));
  }

  @SagaEventHandler(PaymentFailedEvent)
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    // Compensation: release inventory
    await this.mediator.send(new ReleaseInventoryCommand(event.data.orderId));
  }
}
```

## Performance Optimization

### Batch Projection
Process events in batches for better throughput:

```typescript
class BatchOrderProjection {
  private buffer: OrderPlacedEvent[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    this.buffer.push(event);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 100); // Flush every 100ms
    }
  }

  private async flush(): Promise<void> {
    const batch = this.buffer.splice(0);
    this.flushTimeout = null;
    
    if (batch.length === 0) return;
    
    await this.readDb.batchUpsert('order_summaries', batch.map(event => ({
      id: event.data.orderId,
      customerId: event.data.customerId,
      total: event.data.total,
      status: 'placed',
    })));
  }
}
```

## Security Considerations

### Command Authorization
Every command handler must verify the caller's permission:

```typescript
class CancelOrderHandler {
  async handle(command: CancelOrderCommand, user: UserContext): Promise<Result> {
    // Authorization check
    if (!this.auth.can(user, 'cancel', `order:${command.orderId}`)) {
      return Result.failure(new UnauthorizedError());
    }
    
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) return Result.failure(new NotFoundError());
    
    order.cancel(user.id);
    await this.orderRepo.save(order);
    return Result.success();
  }
}
```

### Query Data Scoping
Queries must respect data access boundaries:

```typescript
class GetOrdersQueryHandler {
  async handle(query: GetOrdersQuery, user: UserContext): Promise<OrderDTO[]> {
    // Only return orders the user is authorized to see
    if (user.role === 'admin') {
      return this.readDb.findAll(query.filters);
    }
    return this.readDb.findByCustomerId(user.customerId, query.filters);
  }
}
```

## Anti-Patterns

### Command Returning Data
Commands must not return data. If the consumer needs the created entity ID, return it as part of a Result type, not as response data.

### Synchronous Read Model Update
Updating the read model in the same transaction as the write defeats the purpose of CQRS. The read model should be eventually consistent.

### One Model to Rule Them All
Using a single, shared model for all read representations. Each consumer should have its own optimized read model.

### Over-Fragmentation
Creating too many read models. Each read model has maintenance cost. Consolidate when shapes are similar.

### Ignoring Idempotency
Commands may be retried. Every command handler must be idempotent.

```typescript
class PlaceOrderHandler {
  async handle(command: PlaceOrderCommand): Promise<Result> {
    // Idempotency check
    const existing = await this.idempotencyRepo.get(command.idempotencyKey);
    if (existing) return Result.success(existing.result);
    
    // Execute
    const result = await this.executeOrder(command);
    
    // Store result
    await this.idempotencyRepo.set(command.idempotencyKey, result);
    return result;
  }
}
```
