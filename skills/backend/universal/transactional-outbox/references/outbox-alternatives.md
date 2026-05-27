# Outbox Pattern Alternatives

Compare the transactional outbox pattern with alternative approaches for reliable event publishing.

## Alternatives Overview

| Approach | Consistency | Complexity | Throughput | Use Case |
|----------|-------------|------------|------------|----------|
| Transactional Outbox | Strong (DB) | Medium | High | General purpose reliable publishing |
| Two-Phase Commit (2PC) | Strong (distributed) | High | Low-Moderate | Short-lived distributed transactions |
| Change Data Capture (CDC) | Eventual | Medium | Very High | High-throughput event pipelines |
| Event Sourcing | Strong | High | High | Audit trail, temporal queries |
| Idempotent Producer | Best-effort | Low | Very High | At-least-once with dedup consumer |
| SAGA | Eventual | High | Moderate | Multi-service distributed operations |

## Two-Phase Commit (2PC)

```
Phase 1: Prepare — all participants must agree
Phase 2: Commit/Rollback — execute the decision

Coordinator -> DB:     Prepare to insert order
Coordinator -> Queue:  Prepare to publish event
DB:                    Ready (lock acquired)
Queue:                 Ready (lock acquired)
Coordinator -> Both:   Commit
```

```typescript
// 2PC via XA transactions (Java/JTA)
@Transactional
public void placeOrder(Order order) {
    jdbcTemplate.update("INSERT INTO orders ...", order);
    jmsTemplate.convertAndSend("order.events", new OrderPlacedEvent(order));
    // Both succeed or both fail — coordinated by transaction manager
}
```

**Trade-offs**: Blocking protocol, requires all participants to support 2PC, increased latency, single point of failure (coordinator).

## Change Data Capture (CDC)

```
Application -> PostgreSQL WAL -> Debezium -> Kafka -> Consumer

Application writes to business table only (no outbox needed)
Debezium reads WAL and publishes changes to Kafka
```

```typescript
// Application just writes business data
async function placeOrder(order: Order): Promise<void> {
  await db.orders.insert(order); // That's it — Debezium captures the insert
}

// Debezium configuration
// debezium-connector.json
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.dbname": "shop",
    "table.include.list": "public.orders",
    "topic.prefix": "cdc",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState"
  }
}
```

**Trade-offs**: Adds operational complexity (Debezium, Kafka), eventual consistency only, schema changes require connector restart.

## Idempotent Producer

Publish events directly but make the consumer handle duplicates:

```typescript
async function publishOrderEvent(order: Order): Promise<void> {
  const event = {
    id: uuid(), // unique event ID
    type: 'OrderPlaced',
    aggregateId: order.id,
    data: order,
    createdAt: new Date().toISOString(),
  };

  try {
    await eventBus.publish('orders', event);
  } catch (err) {
    // Log and retry — consumer must deduplicate
    logger.error({ eventId: event.id }, 'Failed to publish event');
    await retry(() => eventBus.publish('orders', event));
  }
}

// Consumer: deduplicate by event ID
async function handleOrderPlaced(event: OrderEvent): Promise<void> {
  const processed = await checkProcessed(event.id);
  if (processed) return;
  await processOrder(event.data);
  await markProcessed(event.id);
}
```

**Trade-offs**: Risk of inconsistent state if application crashes after DB write but before event publish. Requires idempotent consumers.

## Event Sourcing

Store events as the primary record, not current state:

```typescript
// Write: append event (single write)
async function placeOrder(command: PlaceOrderCommand): Promise<void> {
  await eventStore.append('Order', command.orderId, [
    new OrderCreatedEvent(command.orderId, command.customerId, command.items),
  ]);
}

// Read: project from events
class OrderProjection {
  async getOrder(orderId: string): Promise<Order> {
    const events = await eventStore.read('Order', orderId);
    return events.reduce((order, event) => this.apply(order, event), new Order());
  }

  private apply(order: Order, event: DomainEvent): Order {
    if (event instanceof OrderCreatedEvent) {
      return Order.create(event.orderId, event.customerId, event.items);
    }
    if (event instanceof OrderShippedEvent) {
      return order.markShipped(event.trackingNumber);
    }
    return order;
  }
}
```

**Trade-offs**: Event store is the source of truth (different philosophy), higher storage requirements, eventual consistency for projections, learning curve.

## Decision Guide

```yaml
Choose transactional outbox when:
  - You need strong consistency between DB writes and event publishing
  - You already use a relational database
  - Moderate throughput (< 10k events/sec)

Choose CDC when:
  - You need very high throughput (> 10k events/sec)
  - You already have Kafka in your infrastructure
  - You can tolerate eventual consistency

Choose 2PC when:
  - You need strong consistency across heterogeneous systems
  - All participants support XA/JTA transactions
  - Throughput is not a concern

Choose event sourcing when:
  - You need a complete audit trail of all changes
  - Temporal queries are important
  - You're building a new system from scratch

Choose idempotent producer when:
  - Occasional inconsistency is acceptable
  - You want minimal infrastructure complexity
  - Consumers are designed for idempotent processing
```

## Key Points
- Transactional outbox is the safest default for reliable event publishing
- CDC offers higher throughput but adds operational complexity
- 2PC is appropriate only for short-lived, low-throughput distributed transactions
- Event sourcing provides full audit trail but represents a different architecture paradigm
- Idempotent producer is simplest but risks inconsistency on crash
- Consider consistency, complexity, throughput, and operational overhead when choosing
