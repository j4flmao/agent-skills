# Event-Driven Integration

## Overview

Event-driven integration enables systems to communicate through events rather than direct API calls. This reference provides deep technical guidance on event sourcing, CQRS, event notification vs event-carried state transfer, event schema design and versioning, event stores, Kafka for event sourcing, saga patterns, choreography vs orchestration, event-driven microservices, and exactly-once processing.

## Event-Driven Architecture Fundamentals

### Event Types

| Event Type | Description | Example | State Included |
|---|---|---|---|
| Event Notification | Notification that something happened | OrderPlaced | No (reference only) |
| Event-Carried State Transfer | Full state of the changed entity | OrderPlaced | Yes (all order data) |
| Event Sourcing | All changes stored as event sequence | OrderCreated, OrderShipped, OrderCancelled | Yes (complete history) |

### Event Notification Pattern

Pro: Low bandwidth, decoupled, consumer queries for details.
Con: Consumer must call producer for details (temporal coupling).

Flow:
```
[Order Service] -- OrderPlaced (orderId: 123) --> [Notification Service]
                     |
                     v (notification service queries order service)
                Order details via GET /orders/123
```

### Event-Carried State Transfer Pattern

Pro: Consumer has all data immediately, no additional calls.
Con: Larger events, data consistency challenges, more bandwidth.

Flow:
```
[Order Service] -- OrderPlaced (full order JSON) --> [Notification Service]
                                                        |
                                                   All data available
                                                   No additional queries
```

### Event Sourcing Pattern

Pro: Complete audit trail, temporal queries, rebuild state from events.
Con: Complex, requires event store, eventual consistency.

## Event Schema Design

### CloudEvents Specification

CloudEvents is a CNCF specification for describing event data in a common way.

```json
{
  "specversion": "1.0",
  "type": "com.company.order.placed",
  "source": "/orders/order-service",
  "id": "event-123-abc-456-def",
  "time": "2025-03-15T10:00:00Z",
  "datacontenttype": "application/json",
  "subject": "order-789",
  "data": {
    "orderId": "order-789",
    "customerId": "customer-456",
    "totalAmount": 299.99,
    "currency": "USD",
    "items": [
      {
        "productId": "prod-123",
        "quantity": 2,
        "price": 149.995
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Portland",
      "state": "OR",
      "zip": "97201"
    }
  },
  "traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
}
```

### Event Schema Versioning

**Backward-Compatible Evolution Rules**:

1. Add fields only (never remove)
2. New fields must be optional with defaults
3. Never change field types
4. Never rename fields
5. Use enum additions only (no removals)
6. Use wrapper types for nullable fields

**Schema Registry Compatibility**:

```yaml
schema_compatibility:
  backward:
    - New schema can read data written with old schema
    - Consumer running new code can read old events
    - Default compatibility level
  forward:
    - Old schema can read data written with new schema
    - Consumer running old code can read new events
    - Used when consumers upgrade slowly
  full:
    - Both backward and forward compatible
    - Most restrictive, safest
  none:
    - No compatibility checks
    - Schema can change arbitrarily
```

**Avro Schema with Compatibility**:

```json
{
  "type": "record",
  "name": "OrderPlaced",
  "namespace": "com.company.order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "totalAmount", "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "items", "type": {"type": "array", "items": "OrderItem"}},
    {"name": "discountCode", "type": ["null", "string"], "default": null},
    {"name": "shippingMethod", "type": ["null", "string"], "default": null}
  ]
}
```

## Apache Kafka for Event-Driven Architecture

### Topic Design

**Topic Naming Convention**:
```
<domain>.<entity>.<event-type>
<domain>.<entity>.<action>
```

Examples:
```
order.order.placed
order.order.shipped
order.order.cancelled
payment.payment.received
payment.payment.failed
customer.customer.created
customer.customer.updated
```

**Partition Strategy**:

| Key | Characteristic | Use Case |
|---|---|---|
| entity_id (e.g., orderId) | Strict ordering per entity | Event sourcing, sagas |
| random/null | Round-robin distribution | Notifications, load balancing |
| customerId | Collocate related events | Customer 360 view |
| region | Geographic partitioning | Multi-region deployments |

**Retention Policy**:

```yaml
kafka_retention:
  event_sourcing_topics:
    retention: -1 (forever)
    cleanup_policy: compact
    min_cleanable_dirty_ratio: 0.5
  event_notification_topics:
    retention: 7 days
    cleanup_policy: delete
    retention_bytes: 500000000 (500GB)
  stream_intermediate_topics:
    retention: 1 day
    cleanup_policy: delete
```

### Kafka Exactly-Once Semantics

**Producer Configuration**:
```yaml
producer_config:
  enable_idempotence: true
  acks: all
  max_in_flight_requests_per_connection: 5
  retries: 2147483647 (MAX_INT)
```

**Consumer Configuration**:
```yaml
consumer_config:
  isolation_level: read_committed
  enable_auto_commit: false
  auto_offset_reset: earliest
```

**Transactional Processing**:
```java
// Producer side
producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(record1);
    producer.send(record2);
    producer.sendOffsetsToTransaction(offsets, consumerGroup);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}

// Table API
streamTable
  .groupByKey()
  .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
  .aggregate(
      () -> 0L,
      (key, value, aggregate) -> aggregate + value,
      Materialized.as("aggregate-store")
        .withLoggingDisabled() // or enabled for fault tolerance
  );
```

## Event Sourcing

### Event Store Design

```yaml
event_store:
  storage: PostgreSQL or dedicated event store (EventStoreDB)
  table_schema: |
    CREATE TABLE events (
      id BIGSERIAL PRIMARY KEY,
      stream_id VARCHAR(255) NOT NULL,
      stream_version INT NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      event_data JSONB NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (stream_id, stream_version)
    );
    CREATE INDEX idx_stream_id ON events(stream_id, stream_version);
    CREATE INDEX idx_event_type ON events(event_type);
    CREATE INDEX idx_created_at ON events(created_at);
  operations:
    - Append event (optimistic concurrency check on stream_version)
    - Read stream (all events for stream_id, ordered by version)
    - Read stream from version (partial replay)
    - Read all events of type (projection rebuild)
    - Subscribe to new events (change data capture)
```

### Append Event with Optimistic Concurrency

```python
class EventStore:
    def __init__(self, db_connection):
        self.db = db_connection

    def append_event(self, stream_id, events, expected_version):
        with self.db.transaction():
            # Get current stream version
            result = self.db.execute(
                "SELECT MAX(stream_version) FROM events WHERE stream_id = $1",
                stream_id
            )
            current_version = result[0][0] if result else 0

            # Optimistic concurrency check
            if expected_version is not None and current_version != expected_version:
                raise ConcurrencyError(
                    f"Stream {stream_id} expected version {expected_version} "
                    f"but current version is {current_version}"
                )

            # Append events
            for event in events:
                current_version += 1
                self.db.execute(
                    """INSERT INTO events
                       (stream_id, stream_version, event_type, event_data, metadata)
                       VALUES ($1, $2, $3, $4, $5)""",
                    stream_id,
                    current_version,
                    event.type,
                    json.dumps(event.data),
                    json.dumps(event.metadata)
                )
```

### Aggregate Reconstruction from Events

```python
class OrderAggregate:
    def __init__(self):
        self.order_id = None
        self.status = None
        self.items = []
        self.total = 0
        self.shipping_address = None
        self.version = 0

    def apply_event(self, event):
        if event.type == "OrderCreated":
            self.order_id = event.data["orderId"]
            self.status = "CREATED"
            self.items = event.data["items"]
            self.total = event.data["totalAmount"]
            self.shipping_address = event.data.get("shippingAddress")
        elif event.type == "OrderShipped":
            self.status = "SHIPPED"
            self.tracking_number = event.data.get("trackingNumber")
        elif event.type == "OrderDelivered":
            self.status = "DELIVERED"
            self.delivered_at = event.data.get("deliveredAt")
        elif event.type == "OrderCancelled":
            self.status = "CANCELLED"
            self.cancellation_reason = event.data.get("reason")
        self.version += 1

    @staticmethod
    def load_from_history(events):
        aggregate = OrderAggregate()
        for event in events:
            aggregate.apply_event(event)
        return aggregate
```

## CQRS (Command Query Responsibility Segregation)

### CQRS Architecture

```
[Commands] -> [Command Handler] -> [Event Store] -> [Event Bus]
                                                        |
                                                   [Projections]
                                                        |
                                                   [Read Models]
                                                        |
[Queries] -> [Query Handler] -> [Read Database]
```

### Command Side

```python
class PlaceOrderCommand:
    def __init__(self, order_id, customer_id, items, shipping_address):
        self.order_id = order_id
        self.customer_id = customer_id
        self.items = items
        self.shipping_address = shipping_address

class OrderCommandHandler:
    def __init__(self, event_store, event_bus):
        self.event_store = event_store
        self.event_bus = event_bus

    def handle_place_order(self, command):
        # Validate
        if not command.items:
            raise ValidationError("Order must have at least one item")
        if not command.shipping_address:
            raise ValidationError("Shipping address required")

        # Calculate totals
        total = sum(item["price"] * item["quantity"]
                    for item in command.items)

        # Create event
        event = Event(
            type="OrderPlaced",
            stream_id=command.order_id,
            data={
                "orderId": command.order_id,
                "customerId": command.customer_id,
                "items": command.items,
                "totalAmount": total,
                "shippingAddress": command.shipping_address
            },
            metadata={"timestamp": datetime.utcnow()}
        )

        # Store and publish
        self.event_store.append(command.order_id, [event], expected_version=0)
        self.event_bus.publish(event)
```

### Query Side (Projections)

```python
class OrderProjection:
    def __init__(self, read_db):
        self.read_db = read_db

    def handle_event(self, event):
        if event.type == "OrderPlaced":
            self.read_db.orders.insert_one({
                "order_id": event.data["orderId"],
                "customer_id": event.data["customerId"],
                "items": event.data["items"],
                "total_amount": event.data["totalAmount"],
                "status": "PLACED",
                "created_at": event.metadata["timestamp"]
            })
        elif event.type == "OrderShipped":
            self.read_db.orders.update_one(
                {"order_id": event.data["orderId"]},
                {"$set": {
                    "status": "SHIPPED",
                    "tracking_number": event.data.get("trackingNumber"),
                    "shipped_at": event.metadata["timestamp"]
                }}
            )

class OrderQueryHandler:
    def __init__(self, read_db):
        self.read_db = read_db

    def get_order(self, order_id):
        return self.read_db.orders.find_one({"order_id": order_id})

    def get_customer_orders(self, customer_id, status=None):
        query = {"customer_id": customer_id}
        if status:
            query["status"] = status
        return list(self.read_db.orders.find(query).sort("created_at", -1))

    def get_daily_order_summary(self, date):
        pipeline = [
            {"$match": {"created_at": {"$gte": date, "$lt": date + timedelta(days=1)}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total": {"$sum": "$total_amount"}
            }}
        ]
        return list(self.read_db.orders.aggregate(pipeline))
```

## Saga Pattern

### Choreography Saga

Each service emits events and reacts to other services' events.

```
[Order Service] -- OrderPlaced --> [Payment Service]
                                    |
                              [PaymentProcessed]
                                    |
                                    v
                              [Inventory Service]
                                    |
                              [InventoryReserved]
                                    |
                                    v
                              [Shipping Service]
                                    |
                              [OrderShipped]
```

**Compensation Flow**:
```
[Payment Service] -- PaymentFailed --> [Order Service]
                                         |
                                   [OrderCancelled]
                                         |
                                         v
                                   [Inventory Service]
                                         |
                                   [InventoryReleased]
```

### Orchestration Saga

A central orchestrator manages the saga execution.

```
                       [Saga Orchestrator]
                       /        |        \
                      v         v         v
              [Order Svc] [Payment Svc] [Inventory Svc]
                   |
              [Orchestrator sends commands:
               - CreateOrder to Order Service
               - ProcessPayment to Payment Service
               - ReserveInventory to Inventory Service]
```

**Orchestrator Implementation**:

```python
class OrderSagaOrchestrator:
    def __init__(self):
        self.steps = [
            SagaStep("CreateOrder", self.create_order, self.compensate_create_order),
            SagaStep("ProcessPayment", self.process_payment, self.compensate_payment),
            SagaStep("ReserveInventory", self.reserve_inventory, self.compensate_inventory),
            SagaStep("ShipOrder", self.ship_order, self.compensate_ship)
        ]

    def execute(self, saga_data):
        executed_steps = []
        for step in self.steps:
            try:
                result = step.action(saga_data)
                executed_steps.append(step)
            except Exception as e:
                # Compensate all completed steps
                for executed in reversed(executed_steps):
                    executed.compensate(saga_data)
                raise SagaExecutionError(f"Saga failed at {step.name}: {e}")

    def create_order(self, data):
        response = requests.post("http://order-service/orders", json=data)
        response.raise_for_status()
        return response.json()["orderId"]

    def compensate_create_order(self, data):
        requests.post("http://order-service/orders/cancel",
                     json={"orderId": data["orderId"]})
```

## Choreography vs Orchestration

| Aspect | Choreography | Orchestration |
|---|---|---|
| Coordination | Decentralized | Centralized |
| Complexity | Simple initially, complex as services grow | Linear with number of steps |
| Coupling | Event schema coupling | Orchestrator must know all services |
| Visibility | Hard to trace (event log needed) | Easy (single orchestrator) |
| Error handling | Complex (distributed compensation) | Simple (centralized try-catch) |
| Performance | No central bottleneck | Orchestrator can be bottleneck |
| Best for | Simple workflows, independent teams | Complex workflows, strict governance |

**Decision: When to use each**:

| Criteria | Choreography | Orchestration |
|---|---|---|
| Number of services | 2-5 | 5+ |
| Workflow complexity | Simple linear | Complex, branching, conditional |
| Compensation logic | Simple | Complex orchestrated |
| Need for visibility | Low | High |
| Team ownership | Per-team autonomy | Central platform team |

## Event-Driven Microservices

### Service Communication Patterns

```
[Service A] -- Event --> [Message Broker] -- Event --> [Service B]
                                                           |
                                                      [Read Model]
                                                           |
                                                      [Service B's DB]
```

### Transactional Outbox Pattern

Ensures reliable event publishing without distributed transactions.

```yaml
outbox_pattern:
  flow: |
    1. Service receives command
    2. Service writes both business data AND event to outbox table
    3. In same database transaction
    4. Background process reads outbox table
    5. Publishes events to message broker
    6. Deletes or marks processed events
  table: |
    CREATE TABLE outbox (
      id BIGSERIAL PRIMARY KEY,
      aggregate_id VARCHAR(255) NOT NULL,
      aggregate_type VARCHAR(255) NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      event_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    );
```

**Implementation**:

```python
class OrderServiceWithOutbox:
    def __init__(self, db, event_publisher, outbox_poller):
        self.db = db
        self.event_publisher = event_publisher
        self.outbox_poller = outbox_poller

    def place_order(self, command):
        with self.db.transaction():
            # 1. Business logic
            order = Order.create(command)
            self.db.orders.insert(order)

            # 2. Write to outbox (same transaction)
            self.db.outbox.insert({
                "aggregate_id": order.id,
                "aggregate_type": "Order",
                "event_type": "OrderPlaced",
                "event_data": json.dumps(order.to_dict()),
                "created_at": datetime.utcnow()
            })

        # 3. Outbox poller handles publishing asynchronously
        return order

class OutboxPoller:
    def __init__(self, db, event_publisher, poll_interval=1):
        self.db = db
        self.event_publisher = event_publisher
        self.poll_interval = poll_interval

    def start(self):
        while True:
            events = self.db.outbox.find(
                {"processed_at": None},
                order_by="created_at",
                limit=100
            )
            for event in events:
                try:
                    self.event_publisher.publish(
                        event["event_type"],
                        event["event_data"]
                    )
                    self.db.outbox.update(
                        {"id": event["id"]},
                        {"processed_at": datetime.utcnow()}
                    )
                except Exception as e:
                    logger.error(f"Failed to publish event {event['id']}: {e}")
            time.sleep(self.poll_interval)
```

### Idempotent Event Processing

```python
class IdempotentConsumer:
    def __init__(self, db):
        self.db = db
        self.processed_events = set()

    def process_event(self, event):
        # Deduplicate by event ID
        if event["id"] in self.processed_events:
            logger.info(f"Skipping already processed event {event['id']}")
            return

        # Check database
        existing = self.db.processed_events.find_one({"event_id": event["id"]})
        if existing:
            self.processed_events.add(event["id"])
            return

        # Process event
        with self.db.transaction():
            # Business logic processing
            self._apply(event)

            # Record event as processed
            self.db.processed_events.insert({
                "event_id": event["id"],
                "processed_at": datetime.utcnow()
            })

        self.processed_events.add(event["id"])
```

## Event Ordering and Consistency

### Handling Out-of-Order Events

Strategies for dealing with events arriving out of order:

1. **Sequencing**: Include sequence numbers and buffer events until in order
2. **Idempotent processing**: Process events in any order, final state converges
3. **Event versioning**: Events contain entity version, reject stale events
4. **Last-write-wins**: Use timestamps, accept eventual consistency
5. **Coordination**: Use partition keys that guarantee ordering

## Event-Driven Integration Testing

### Testing Strategy

```yaml
testing_strategy:
  unit:
    - Test event handlers in isolation
    - Mock message broker
    - Test projection logic
    
  integration:
    - Test with real message broker (Testcontainers)
    - End-to-end event flow verification
    - Schema compatibility testing
    
  contract:
    - Schema registry validation
    - CloudEvents format compliance
    - Event schema evolution tests
    
  resilience:
    - Network partition scenarios
    - Broker failure and recovery
    - Message redelivery and deduplication
```

## References

- enterprise-integration-architecture.md -- Enterprise Integration Architecture
- integration-patterns-fundamentals.md -- Integration Patterns Fundamentals
- integration-styles.md -- Enterprise Integration Styles
- message-routing.md -- Message Routing Patterns
- integration-architectures.md -- Integration Architectures
- etl-integration.md -- ETL Integration Patterns
