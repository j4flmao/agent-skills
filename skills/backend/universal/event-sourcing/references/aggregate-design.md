# Aggregate Design

## Aggregate Boundaries

An aggregate is a consistency boundary. All invariants within an aggregate are enforced atomically.

### Rules for Aggregate Design

1. **One aggregate = one transaction boundary**. Everything within an aggregate is strongly consistent.
2. **Aggregates communicate via events**. Never via direct calls or shared state.
3. **Keep aggregates small**. A large aggregate reduces concurrency and increases contention.
4. **Reference other aggregates by ID**. Never by reference.

### Example: Order Aggregate

```
Order Aggregate:
  - Order (root entity)
  - OrderItems (child entities)
  - ShippingAddress (value object)
  - PaymentInfo (value object)
  
Invariants enforced by Order:
  - Total must equal sum of item prices
  - Cannot add items after payment
  - Cannot ship before payment
  - Status transitions: pending -> paid -> shipped -> delivered
```

## Event-Sourced Aggregate Implementation

```typescript
class OrderAggregate {
  private state: OrderState;

  constructor(state?: OrderState) {
    this.state = state ?? { status: OrderStatus.PENDING, items: [], total: 0, version: 0 };
  }

  // Load from event stream
  static load(events: DomainEvent[]): OrderAggregate {
    const aggregate = new OrderAggregate();
    for (const event of events) {
      aggregate.apply(event);
    }
    return aggregate;
  }

  // Command handler — validate and return events
  addItem(productId: string, quantity: number, price: number): ItemAddedToOrder {
    if (this.state.status !== OrderStatus.PENDING) {
      throw new Error('Cannot add items to a non-pending order');
    }
    return {
      eventType: 'ItemAddedToOrder',
      version: 1,
      data: { orderId: this.state.id, productId, quantity, price },
    };
  }

  // Apply event to mutate state
  private applyEvent(event: ItemAddedToOrder): void {
    this.state.items.push({ productId: event.data.productId, quantity: event.data.quantity, price: event.data.price });
    this.state.total += event.data.quantity * event.data.price;
    this.state.version++;
  }
}
```

## Invariant Enforcement

Invariants are checked in command handlers BEFORE emitting events:

- Check state validity (e.g., order is in correct status).
- Check business rules (e.g., credit limit not exceeded).
- Check concurrency (optimistic locking via version check).

## Concurrency

Use optimistic concurrency: check that the aggregate version in the database matches the version loaded by the command handler before appending new events.

```sql
-- Append only if version matches
INSERT INTO events (aggregate_type, aggregate_id, version, ...)
SELECT $1, $2, $3, ...
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE aggregate_type = $1 AND aggregate_id = $2 AND version >= $3
);
```

If no row inserted, a concurrent operation modified the aggregate — retry the command.
