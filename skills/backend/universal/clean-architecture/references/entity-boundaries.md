# Entity Boundaries and Aggregate Design

## Aggregate Root Pattern

An Aggregate is a cluster of domain objects treated as a single unit for data changes. Each aggregate has a root entity that is the only entry point for all operations.

### Rules
1. **One aggregate per transaction** — never modify multiple aggregates in a single transaction
2. **Reference by ID** — aggregates reference each other by ID, never by direct object reference
3. **Consistency boundary** — the aggregate root enforces all invariants for the entire cluster
4. **Persistence boundary** — the entire aggregate is loaded and saved as a unit

```typescript
// Aggregate Root — Order is the single entry point
class Order extends AggregateRoot {
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.PENDING;

  addItem(productId: ProductId, price: Money, quantity: number): void {
    if (this.status !== OrderStatus.PENDING) throw new Error('Order locked');
    this.items.push(new OrderItem(productId, price, quantity));
    this.addDomainEvent(new ItemAddedEvent(this.id, productId, quantity));
  }

  submit(): void {
    if (this.items.length === 0) throw new Error('Cannot submit empty order');
    this.status = OrderStatus.SUBMITTED;
    this.addDomainEvent(new OrderSubmittedEvent(this.id, this.total));
  }

  get total(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal), Money.ZERO);
  }
}

// Value Object — no identity, immutable
class OrderItem {
  constructor(
    readonly productId: ProductId,  // reference to other aggregate by ID
    readonly price: Money,
    readonly quantity: number,
  ) {}

  get subtotal(): Money {
    return new Money(this.price.amount * this.quantity, this.price.currency);
  }
}
```

## Aggregate Size Decision Tree

```
How many entities are naturally modified together in a single operation?
  ├── 1 → Single-entity aggregate (simplest, best concurrency)
  ├── 2-5 → Small aggregate (good balance)
  ├── 5-15 → Medium aggregate (caution — concurrency bottleneck)
  └── 15+ → Too large. Can you split into smaller aggregates?
              ├── Yes → Split. Reference between aggregates by ID.
              └── No → Reconsider model. Large aggregates are hard to scale.
```

## Identifying Aggregate Boundaries

### Signs of Correct Boundary
- All invariants can be checked within the aggregate
- Business operations modify one aggregate at a time
- Changes to the aggregate are atomic (all or nothing)
- The aggregate root has a clear name that matches the business concept

### Signs of Wrong Boundary
- Operations frequently need two aggregates in one transaction → merge them
- Aggregate contains unrelated entities that change independently → split them
- Aggregate root is constantly being locked by concurrent operations → too large
- You need to load hundreds of entities to validate one invariant → too large

## Repository Interface Design

### Aggregate-Specific Repositories
Each aggregate root gets its own repository interface:

```typescript
// Domain — repository interface per aggregate root
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
}

// Return the aggregate, not individual entities
// The caller should not need to manage OrderItems separately
```

### Repository Method Rules
- Methods accept and return domain objects, never ORM entities
- Save is UPSERT — the repository handles insert vs update
- Find returns the full aggregate (root + children)
- No generic `Repository<T>` — each aggregate has its own interface with meaningful method names

## Value Object Guidelines

### When to Create a Value Object
- Concept has validation rules (Email, PhoneNumber, SSN)
- Concept has behavior (Money.add(), DateRange.overlaps())
- Concept is composed of multiple primitive fields (Address, FullName)
- Concept has domain-specific constraints (OrderStatus transitions)

```typescript
// GOOD: Value object with behavior
class DateRange {
  constructor(readonly start: Date, readonly end: Date) {
    if (start >= end) throw new Error('Start must be before end');
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  overlaps(other: DateRange): boolean {
    return this.start < other.end && this.end > other.start;
  }

  duration(): number {
    return this.end.getTime() - this.start.getTime();
  }
}

// BAD: Primitive obsession — pass raw values
function isInRange(date: Date, start: Date, end: Date): boolean { ... }
```

### Value Object Rules
- Immutable — all properties are readonly
- Compared by value, not identity — implement equals()
- Self-validating — constructor enforces invariants
- No ORM annotations — persistence mapping is Infrastructure concern
