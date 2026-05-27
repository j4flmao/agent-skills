# Domain-Driven Design Patterns

## Overview
DDD tactical patterns for modeling complex business domains: entities, value objects, aggregates, domain events, repositories, services, and factories.

## Entity vs Value Object

```typescript
// Entity — has identity, mutable lifecycle
class Order {
  constructor(
    public readonly id: OrderId,
    public status: OrderStatus,
    public items: OrderItem[],
    public createdAt: Date
  ) {}

  addItem(product: Product, quantity: number): void {
    const item = new OrderItem(
      OrderItemId.generate(),
      product.id,
      quantity,
      product.price
    );
    this.items.push(item);
    this.addDomainEvent(new ItemAddedEvent(this.id, item));
  }

  private domainEvents: DomainEvent[] = [];
  getDomainEvents(): DomainEvent[] { return [...this.domainEvents]; }
  clearDomainEvents(): void { this.domainEvents = []; }
  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}

// Value Object — immutable, equality by value, no identity
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  static zero(currency: string): Money {
    return new Money(0, currency);
  }
}
```

## Aggregate Design

```typescript
// Aggregate Root — consistency boundary
class Order extends AggregateRoot {
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.PENDING;

  // Invariant: total must match items sum
  get total(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero('USD')
    );
  }

  // Invariant: cannot modify shipped orders
  submit(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot submit empty order');
    }
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Only pending orders can be submitted');
    }
    this.status = OrderStatus.SUBMITTED;
    this.addEvent(new OrderSubmittedEvent(this.id, this.total));
  }

  // Rule: access child entities only through aggregate root
  removeItem(itemId: OrderItemId): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Cannot modify submitted order');
    }
    this.items = this.items.filter(i => !i.id.equals(itemId));
  }
}

// Transaction boundary — all changes within a single transaction
async function submitOrder(
  orderId: OrderId,
  orderRepository: OrderRepository,
  unitOfWork: UnitOfWork
): Promise<void> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.submit();

  await unitOfWork.transaction(async (tx) => {
    await orderRepository.save(order, tx);
    // All events dispatched after successful commit
  });
}
```

## Domain Service

```typescript
// Domain Service — for operations that don't fit in a single entity
class PricingService {
  constructor(
    private readonly taxCalculator: TaxCalculator,
    private readonly discountPolicy: DiscountPolicy
  ) {}

  calculateFinalPrice(order: Order): Money {
    const subtotal = order.total;
    const discount = this.discountPolicy.apply(subtotal, order.customerTier);
    const discounted = subtotal.add(discount.negate());
    const tax = this.taxCalculator.calculate(discounted, order.shippingAddress);
    return discounted.add(tax);
  }
}

// Repository — collection-like interface for aggregates
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  save(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
}

// Factory — encapsulates complex creation logic
class OrderFactory {
  static createFromCart(cart: Cart, customer: Customer): Order {
    const order = new Order(OrderId.generate(), customer.id);

    for (const item of cart.items) {
      order.addItem(item.product, item.quantity);
    }

    return order;
  }

  static createRecurring(
    customer: Customer,
    product: Product,
    schedule: Schedule
  ): Order {
    const order = new Order(OrderId.generate(), customer.id);
    order.makeRecurring(schedule);
    order.addItem(product, 1);
    return order;
  }
}
```

## Domain Events

```typescript
// Domain Event — something that happened in the domain
class OrderSubmittedEvent implements DomainEvent {
  public readonly occurredAt: Date = new Date();
  public readonly eventName = 'order.submitted';

  constructor(
    public readonly orderId: OrderId,
    public readonly total: Money
  ) {}
}

// Event publication from aggregate
abstract class AggregateRoot {
  private events: DomainEvent[] = [];

  protected addEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  getEvents(): DomainEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Event handler
class OrderSubmittedHandler implements IEventHandler<OrderSubmittedEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly inventoryService: InventoryService
  ) {}

  async handle(event: OrderSubmittedEvent): Promise<void> {
    await Promise.all([
      this.emailService.sendConfirmation(event.orderId),
      this.inventoryService.reserveStock(event.orderId),
    ]);
  }
}
```

## Bounded Context Mapping

```typescript
// Context mapping patterns
enum ContextMapRelationship {
  PARTNERSHIP = 'PARTNERSHIP',
  SHARED_KERNEL = 'SHARED_KERNEL',
  CUSTOMER_SUPPLIER = 'CUSTOMER_SUPPLIER',
  CONFORMIST = 'CONFORMIST',
  ANTI_CORRUPTION_LAYER = 'ANTI_CORRUPTION_LAYER',
  OPEN_HOST_SERVICE = 'OPEN_HOST_SERVICE',
  SEPARATE_WAYS = 'SEPARATE_WAYS',
  BIG_BALL_OF_MUD = 'BIG_BALL_OF_MUD',
}

// Anti-Corruption Layer — translates between bounded contexts
class OrderingToBillingTranslator {
  toBillingContext(order: Order): BillingInvoice {
    return new BillingInvoice(
      BillingInvoiceId.generate(),
      order.id.toString(),
      {
        amount: order.total.amount,
        currency: order.total.currency,
      },
      order.customerId.toString(),
      order.shippingAddress
    );
  }

  fromBillingContext(invoice: BillingInvoice): OrderPaymentInfo {
    return {
      orderId: new OrderId(invoice.orderReference),
      paymentId: invoice.paymentId,
      status: this.mapPaymentStatus(invoice.status),
    };
  }
}
```

## Key Points
- Entities have identity (ID); value objects are defined by their attributes
- Aggregate roots define transactional consistency boundaries
- Access child entities only through the aggregate root
- Domain services handle operations that span multiple entities
- Repositories provide collection-like access for aggregates
- Factories encapsulate complex creation logic
- Domain events capture meaningful business occurrences
- Use anti-corruption layer between bounded contexts
- Bounded contexts communicate through context maps
