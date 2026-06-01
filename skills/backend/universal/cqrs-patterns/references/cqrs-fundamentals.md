# CQRS Fundamentals

## Core Definition

CQRS (Command Query Responsibility Segregation) is a pattern that separates read and write operations into distinct models. The principle: **a method either changes state (command) or returns state (query), never both**.

This is a direct application of the Command-Query Separation (CQS) principle at the architecture level. While CQS applies at the method level, CQRS extends it to the model and data store level.

## When to Apply CQRS

### Justification Criteria
CQRS adds complexity. Apply it only when:

1. **Read and write shapes differ** — The data structure needed for reading is significantly different from the structure used for writing. Example: writing an order as normalized entities, reading it as a denormalized summary with computed fields.

2. **High read-to-write ratio** — When reads significantly outnumber writes (>10:1), optimizing the read path independently provides clear benefits.

3. **Complex write-side business logic** — When the write side has rich domain rules, validations, and workflows that should not be compromised by read optimizations.

4. **Multiple read representations** — When the same data needs different shapes for different consumers (dashboard, mobile API, reporting, search).

### When NOT to Apply CQRS
- Simple CRUD applications where the same data shape serves both read and write
- Teams unfamiliar with eventual consistency concepts
- Prototypes or early-stage products where simplicity outweighs optimization
- Fewer than 3 distinct query patterns per aggregate

## Core Patterns

### Level 1: Method-Level CQS (same model)
```typescript
class OrderService {
  // Command — changes state, returns void
  async placeOrder(command: PlaceOrderCommand): Promise<void> { ... }
  // Query — returns state, no side effects
  async getOrder(id: string): Promise<OrderDTO> { ... }
}
```

### Level 2: Separate Models (same database)
Maintain separate command and query model classes, even if they map to the same database tables.

```typescript
// Write-side model — rich behavior, enforces invariants
class OrderWriteModel {
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.PENDING;
  
  addItem(product: Product, qty: number): void {
    if (this.status !== OrderStatus.PENDING) throw new Error('Order locked');
    if (qty > 10) throw new Error('Max 10 per item');
    this.items.push(new OrderItem(product.id, product.price, qty));
  }
  
  submit(): void {
    if (this.items.length === 0) throw new Error('Empty order');
    this.status = OrderStatus.SUBMITTED;
  }
}

// Read-side model — flattened, query-optimized
interface OrderReadModel {
  id: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}
```

### Level 3: Separate Databases (optimized for each)
Write database (PostgreSQL — normalized, ACID) and read database (Elasticsearch, Redis, DynamoDB — denormalized, indexed).

```sql
-- Write DB: normalized
CREATE TABLE orders (id UUID PRIMARY KEY, customer_id UUID, status TEXT, created_at TIMESTAMPTZ);
CREATE TABLE order_items (id UUID PRIMARY KEY, order_id UUID REFERENCES orders(id), product_id UUID, price NUMERIC, quantity INT);

-- Read DB: denormalized
{
  "id": "uuid",
  "customer_name": "John Doe",
  "item_count": 3,
  "total": 149.99,
  "status": "shipped",
  "created_at": "2026-05-14T10:30:00Z"
}
```

## Consistency Models

### Strong Consistency (same database)
| Aspect | Behavior |
|--------|----------|
| Write visibility | Instant — read sees write immediately |
| Implementation | Same DB, materialized views |
| Trade-off | No read optimization, write contention |

### Eventual Consistency (separate databases)
| Aspect | Behavior |
|--------|----------|
| Write visibility | Delayed — read may see stale data |
| Implementation | Event-driven projections |
| Trade-off | Stale reads, projection complexity |

### Read-Your-Writes Consistency
| Aspect | Behavior |
|--------|----------|
| Write visibility | User sees own writes; others see eventual |
| Implementation | Session-based routing to write DB |
| Trade-off | Session affinity, routing complexity |

## Synchronization Mechanisms

| Method | Latency | Complexity | Use Case |
|--------|---------|------------|----------|
| Same-DB view | 0 (sync) | Low | Simple denormalization |
| Transactional outbox | < 1s | Medium | Reliable event publishing |
| CDC (Debezium) | < 1s | High | Legacy systems, no app changes |
| Scheduled batch | Minutes | Low | Reporting, analytics |
| Saga | Seconds | High | Distributed write coordination |

## Testing Strategy

### Command Tests
- Verify state changes and invariant enforcement
- Mock only repository ports
- Test both success and validation failure paths
- Test idempotency (double submission)

### Query Tests
- Verify correct data returned for various filters
- Test pagination, sorting, and field selection
- Test empty state and not-found cases

### Projection Tests
- Verify read model updates when events arrive
- Test out-of-order event handling
- Test projection rebuild from scratch
- Test idempotent event processing

## Operational Considerations

### Read Model Freshness SLA
Document the acceptable staleness for each read model:

| Read Model | Max Staleness | Refresh Mechanism |
|---|---|---|
| Dashboard | 1 minute | Event-driven projection |
| Search index | 5 minutes | Batch sync |
| Reporting | 1 hour | Scheduled materialized view |
| Hot product data | 0 (strong) | Same-DB query |

### Monitoring
- Track projection lag (time between event publication and read model update)
- Alert on projection failures after 3 retries
- Monitor write model load and read model query performance separately
- Track read-to-write ratio over time to validate CQRS decision

## Common Pitfalls

1. **Over-engineering**: CQRS adds complexity. Use it only when read and write shapes are genuinely different.
2. **Shared DTOs**: Using the same class for command input and query output — they are separate concerns.
3. **Same storage, no optimization**: If using separate models but the same table/indexes, you get none of the optimization benefits.
4. **Ignoring eventual consistency**: Read models lag behind write models. Design UI to handle stale data.
5. **CQRS without event sourcing**: CQRS works perfectly with traditional persistence. Event sourcing is optional.
6. **Synchronous projection**: Updating the read model synchronously in the command handler defeats the purpose.
