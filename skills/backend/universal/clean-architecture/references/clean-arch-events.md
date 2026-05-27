# Clean Architecture Domain Events

## Overview
Implement domain events within clean architecture: define events in the domain layer, handle them in the application layer, and dispatch them through infrastructure.

## Domain Event Definition

```typescript
// Domain layer — pure domain events, no infrastructure concerns
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  occurredAt: Date;
  version: number;
}

abstract class DomainEventBase implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly version: number = 1;

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly eventType: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

class OrderPlacedEvent extends DomainEventBase {
  constructor(
    aggregateId: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly total: Money
  ) {
    super(aggregateId, 'order', 'order.placed');
  }
}

class OrderConfirmedEvent extends DomainEventBase {
  constructor(
    aggregateId: string,
    public readonly confirmedAt: Date
  ) {
    super(aggregateId, 'order', 'order.confirmed');
  }
}
```

## Domain Event Publisher — Port

```typescript
// Domain layer — port interface
interface IDomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

// Domain layer — aggregate root with event collection
abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public clearEvents(): void {
    this.domainEvents = [];
  }

  public getEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }
}

class Order extends AggregateRoot {
  private constructor(
    public readonly id: OrderId,
    private customerId: string,
    private items: OrderItem[],
    private status: OrderStatus
  ) {
    super();
  }

  static create(customerId: string, items: OrderItem[]): Order {
    const order = new Order(
      OrderId.create(),
      customerId,
      items,
      OrderStatus.PENDING
    );

    order.addDomainEvent(new OrderPlacedEvent(
      order.id.getValue(),
      customerId,
      items,
      order.calculateTotal()
    ));

    return order;
  }

  confirm(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new IllegalStateError('Can only confirm pending orders');
    }
    this.status = OrderStatus.CONFIRMED;
    this.addDomainEvent(new OrderConfirmedEvent(this.id.getValue(), new Date()));
  }
}
```

## Application Layer — Event Handling

```typescript
// Application layer — event handlers process after use case completes
interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

class OrderPlacedHandler implements IDomainEventHandler<OrderPlacedEvent> {
  constructor(
    private emailService: IEmailService,
    private logger: ILogger
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    this.logger.info('Handling order placed event', {
      orderId: event.aggregateId,
      customerId: event.customerId,
    });

    await this.emailService.sendOrderConfirmation({
      orderId: event.aggregateId,
      customerId: event.customerId,
      items: event.items,
      total: event.total,
    });
  }
}

// Application layer — use case with event dispatching
class PlaceOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private unitOfWork: IUnitOfWork
  ) {}

  async execute(command: PlaceOrderCommand): Promise<Result<OrderResponse>> {
    return this.unitOfWork.execute(async () => {
      const order = Order.create(command.customerId, command.items);
      const saved = await this.orderRepo.save(order);

      // Events are collected in aggregate root
      // They will be dispatched after successful persistence
      return {
        success: true,
        data: OrderResponse.fromDomain(saved),
        events: order.getEvents(),
      };
    });
  }
}
```

## Infrastructure Layer — Event Dispatching

```typescript
// Infrastructure layer — concrete event bus implementation
class DomainEventDispatcher {
  private handlers: Map<string, IDomainEventHandler<any>[]> = new Map();

  register<T extends DomainEvent>(
    eventType: string,
    handler: IDomainEventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventType) || [];
      await Promise.allSettled(
        handlers.map(h =>
          h.handle(event).catch(error => {
            console.error(`Handler failed for ${event.eventType}:`, error);
            // Log and continue — event handlers should not break the main flow
          })
        )
      );
    }
  }
}

// Composition Root wiring
class OrderModule {
  static configure(container: Container, eventDispatcher: DomainEventDispatcher): void {
    // Register use case
    container.register('PlaceOrderUseCase', {
      useClass: PlaceOrderUseCase,
      deps: ['OrderRepository', 'UnitOfWork'],
    });

    // Register event handlers
    eventDispatcher.register('order.placed', new OrderPlacedHandler(
      container.resolve('EmailService'),
      container.resolve('Logger')
    ));

    eventDispatcher.register('order.placed', new InventoryReservationHandler(
      container.resolve('InventoryService'),
      container.resolve('Logger')
    ));
  }
}
```

## Unit of Work with Event Dispatching

```typescript
class UnitOfWork {
  constructor(
    private db: DatabaseConnection,
    private eventDispatcher: DomainEventDispatcher
  ) {}

  async execute<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
    const transaction = await this.db.beginTransaction();

    try {
      const result = await work();

      if (result.success) {
        await transaction.commit();
        // Dispatch events AFTER successful commit
        if (result.events?.length) {
          await this.eventDispatcher.dispatch(result.events);
        }
        return result;
      } else {
        await transaction.rollback();
        return result;
      }
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

## Key Points
- Define domain events in the domain layer as pure constructs
- Aggregate roots collect events during command execution
- Application layer handlers process events (email, notifications, integrations)
- Infrastructure layer provides concrete event bus implementation
- Events are dispatched AFTER successful transaction commit, not before
- Event handler failures are logged but don't break the main use case flow
