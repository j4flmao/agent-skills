# Data Patterns

## Database per Service

### Rules
1. No service accesses another service's database directly (not even read-only)
2. No shared tables across services
3. Data duplication is expected and managed

### Private vs Shared Data

| Data Type | Ownership | Example |
|---|---|---|
| **Private** | Owned exclusively by one service | Order lines in order-service |
| **Reference** | Read-only copy of another service's data | Customer name cached in order-service |
| **Shared** | Owned by a dedicated service | Product catalog in product-service |

### Reference Data Caching

```python
class OrderService:
    def create_order(self, customer_id: str, items: list):
        # Fetch reference data from owning service
        customer = self.customer_client.get_customer(customer_id)
        products = self.product_client.get_products([i.product_id for i in items])

        # Use reference data for validation, but don't store it
        order = Order(customer_id=customer_id, total=calculate_total(products, items))
        self.order_repository.save(order)
        return order
```

## CQRS (Command Query Responsibility Segregation)

### When to Apply
- Read and write workloads have different characteristics (reads >> writes)
- Read model needs different shape than write model
- Performance requirements differ for reads vs writes

### Simple CQRS (Same Database)

```python
# Command side (write)
class CreateOrderHandler:
    def handle(self, command: CreateOrder):
        order = Order(customer_id=command.customer_id)
        for item in command.items:
            order.add_item(ProductId(item.product_id), item.quantity)
        self.db.orders.insert(order.to_db_row())

# Query side (read)
class GetOrderQueryHandler:
    def handle(self, query: GetOrder):
        row = self.db.orders.find_by_id(query.order_id)
        return OrderDto(
            id=row['id'],
            customer_name=row['customer_name'],  # denormalized
            total=row['total'],
            items=row['items']  # stored as JSON
        )
```

### Full CQRS (Separate Read Database)

```
Command Side (write DB)    →     Sync Mechanism     →    Query Side (read DB)
PostgreSQL normalized             Event Bus / CDC           Elasticsearch denormalized

write_model.order.create()  →  "OrderCreated" event  →  read_model.order.index()
```

**Sync options**:
- **Eventual consistency**: Publish events from write side, consume on read side
- **Change Data Capture (CDC)**: Debezium captures DB changes, streams to read store
- **Batch sync**: Periodic ETL (acceptable only for analytics)

## Event Sourcing

### Core Concept
Store events instead of current state. Current state = fold over events.

```python
class OrderEventSourced:
    def __init__(self):
        self.events = []
        self.status = None
        self.items = []

    def apply_event(self, event):
        if event.type == 'OrderCreated':
            self.status = 'pending'
            self.items = event.items
        elif event.type == 'OrderApproved':
            self.status = 'approved'
        elif event.type == 'OrderShipped':
            self.status = 'shipped'
        # ...

    def create(self, items):
        event = {'type': 'OrderCreated', 'items': items, 'timestamp': utcnow()}
        self.events.append(event)
        self.apply_event(event)

    def get_state(self):
        # Rebuild state from events
        state = {}
        for e in self.events:
            apply_event_to_state(state, e)
        return state
```

### Event Store Schema

```sql
CREATE TABLE events (
    aggregate_id   UUID NOT NULL,
    version        INT NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    payload        JSONB NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aggregate_id, version)
);
```

### Snapshotting

When event count exceeds threshold (e.g., 100), take a snapshot:

```python
class OrderWithSnapshot:
    def __init__(self):
        self.snapshot = None      # latest snapshot
        self.pending_events = []  # events after snapshot

    def get_state(self):
        state = self.snapshot.state if self.snapshot else {}
        for e in self.pending_events:
            apply_event_to_state(state, e)
        return state

    def save(self):
        if len(self.pending_events) >= 100:
            self.persist_snapshot(self.get_state())
            self.pending_events = []
```

## Consistency Models

| Model | Description | Latency | Data Loss Risk |
|---|---|---|---|
| **Strong** | All reads see latest write | Highest | None |
| **Eventual** | Reads eventually see writes | Lowest | Low (window) |
| **Causal** | Related operations ordered | Medium | Low |
| **Read-your-writes** | Read sees own writes | Medium | None for writer |

### Distributed Transaction Approaches

| Approach | Consistency | Complexity | Throughput |
|---|---|---|---|
| **Two-Phase Commit (2PC)** | Strong | High | Low |
| **Saga** | Eventual | Medium | High |
| **Outbox + Eventual** | Eventual | Low | Highest |

## Data Duplication Guidelines

### Acceptable Duplication
- Customer name/email in order-service (for order history display)
- Product name/price in order-service (frozen at time of order)
- User roles in each service (for authorization decisions)

### Unacceptable Duplication
- Customer addresses in order-service (should reference customer-service)
- Business rules in multiple services (should be in one service or shared library)

### Duplication Management
- Mark duplicated fields with `@source: service-name.field`
- Batch sync jobs at scheduled intervals for reference data
- Use event-driven updates to refresh cached reference data
