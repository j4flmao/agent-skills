---
name: backend-cqrs-patterns
description: >
  Use this skill when the user says 'CQRS', 'command query segregation', 'separate read write model', 'command model', 'query model', 'read model', 'write model', 'materialized view', 'command handler', 'query handler'. This skill enforces: strict command/query separation, write model optimized for consistency, read model optimized for performance, eventual consistency between models, command validation before execution. Applies to any backend stack. Do NOT use for: simple CRUD applications, event sourcing (use event-sourcing skill), or microservices decomposition (use microservices skill).
version: "1.0.0"
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
    this.state = { status: 'pending', items: command.items, total: this.calculateTotal(command.items) };
    return new OrderPlacedEvent({ orderId: this.state.id, total: this.state.total });
  }

  private validateItems(items: OrderItem[]) {
    if (items.length === 0) throw new Error('Order must have at least one item');
    if (items.some(i => i.quantity <= 0)) throw new Error('Item quantity must be positive');
  }
}
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

For separate read/write stores, update the read model when write model changes:

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
      createdAt: event.occurredAt
    });
  }

  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readDb.update(event.data.orderId, { status: 'shipped' });
  }
}
```

## Rules
- Commands never return data. They return success or failure. Queries never cause side effects.
- Write model enforces business rules and invariants. Read model is a dumb projection.
- If using separate stores, the read model is eventually consistent. Design for staleness.
- Command validation happens before command execution, not during. Validation = can this command be formed correctly? Execution = does it violate business rules?
- Queries can join, aggregate, and denormalize freely. Commands access only their aggregate.
- Do NOT apply CQRS to simple CRUD — it adds complexity without benefit. Use CQRS when read and write shapes are significantly different.
- Eventual consistency delay must be documented and acceptable to product stakeholders.

## References
- `references/cqrs-fundamentals.md` — CQRS core concepts, when to apply, common pitfalls
- `references/read-model-strategies.md` — Read model projections, materialized views, caching
- `references/command-validation.md` — Command validation patterns, preconditions, invariants
- `references/cqrs-testing.md` — CQRS testing pyramid, command/query handler tests, projection tests

## Handoff
No artifact produced.
Next skill: event-sourcing — if events are the source of truth for the write model.
Carry forward: command/query separation, read model projections, synchronization mechanism.
