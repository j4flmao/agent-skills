# NestJS DDD Patterns

## Entity
```typescript
export class Order {
  private constructor(
    readonly id: OrderId,
    private _status: OrderStatus,
    readonly items: OrderItem[],
    readonly createdAt: Date,
  ) {}

  static create(items: OrderItem[]): Order {
    return new Order(new OrderId(uuid()), OrderStatus.PENDING, items, new Date())
  }

  get status(): OrderStatus { return this._status }

  confirm(): void {
    if (this._status !== OrderStatus.PENDING) throw new Error('Order must be PENDING to confirm')
    this._status = OrderStatus.CONFIRMED
  }
}
```

## Value Object
```typescript
export class Money {
  private constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new Error('Amount cannot be negative')
    if (currency.length !== 3) throw new Error('Currency must be ISO 4217')
  }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency.toUpperCase())
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch')
    return new Money(this.amount + other.amount, this.currency)
  }
}
```

## Domain Event
```typescript
export class OrderPlacedEvent {
  constructor(
    readonly orderId: string,
    readonly userId: string,
    readonly total: Money,
    readonly occurredAt: Date = new Date(),
  ) {}
}
```

## Rules
- No NestJS decorators in entities or value objects
- No direct DB access — repositories emit events
- Domain services = stateless, operate on entities
- Use factories (`static create`) instead of constructors for validation
