# Communication Patterns

## Synchronous Communication

### HTTP/REST
```javascript
// Service A calls Service B
const response = await fetch('http://order-service/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
});
```

**Pros**: Simple, universal, well-understood.
**Cons**: Couples services at call time, latency accumulates, partial failure risk.

**Best for**: Queries, commands requiring immediate ACK, low-latency internal calls.

### gRPC
```protobuf
service OrderService {
    rpc GetOrder(OrderRequest) returns (OrderResponse);
    rpc StreamOrderUpdates(OrderRequest) returns (stream OrderEvent);
}
```

**Pros**: Strongly typed, streaming, binary efficient, HTTP/2.
**Cons**: Browser support limited, contract management overhead.

**Best for**: Internal service-to-service, high-throughput, streaming.

## Asynchronous Communication

### Message Queue (RabbitMQ / Amazon SQS)

```python
# Publisher
channel.basic_publish(
    exchange='order.events',
    routing_key='order.created',
    body=json.dumps(order.to_dict())
)

# Consumer (in notification service)
def callback(ch, method, properties, body):
    event = json.loads(body)
    if event['type'] == 'order.created':
        send_email(event['customer_email'])
```

**Pros**: Decoupled, buffered, retry/dead-letter.
**Cons**: Eventual consistency, message ordering complexity.

**Best for**: Cross-service notifications, background processing.

### Event Stream (Kafka / Redpanda)

```python
# Producer
producer.produce(
    topic='orders',
    value=order.to_json(),
    key=str(order.id)
)

# Consumer group (multiple services each consume)
consumer.subscribe(['orders'])
for msg in consumer:
    process_order(msg.value)
```

**Pros**: Persistent log, replayable, partitioned ordering.
**Cons**: Operational complexity, higher latency than MQ.

**Best for**: Event sourcing, audit logs, streaming analytics.

## Saga Pattern

### Choreography Saga

```
Order Service → emits "OrderCreated"
                ↓
Payment Service → listens, processes payment → emits "PaymentProcessed" or "PaymentFailed"
                ↓
Inventory Service → listens, reserves stock → emits "StockReserved" or "StockFailed"
                ↓
Shipping Service → listens, creates shipment → emits "ShipmentCreated"
```

**Compensation flow (on PaymentFailed after StockReserved)**:
```
Inventory Service → listens to "PaymentFailed" → releases stock → emits "StockReleased"
```

**Implementation**:
```python
class OrderService:
    def create_order(self, data):
        order = Order.create(data)
        self.event_publisher.publish("OrderCreated", order.to_event())
        return order

class InventoryService:
    def on_order_created(self, event):
        try:
            self.reserve_stock(event.items)
            self.event_publisher.publish("StockReserved", event)
        except Exception:
            self.event_publisher.publish("StockFailed", event)

    def on_payment_failed(self, event):
        self.release_stock(event.items)  # compensation
```

### Orchestration Saga

```
                    ┌──────────────────────┐
                    │  OrderSagaOrchestrator │
                    └──────┬───────────┬────┘
                           │           │
                    ┌──────┘           └──────┐
                    ▼                         ▼
            Order Service              Payment Service
            ┌──────────────┐          ┌──────────────┐
            │ 1. Create    │          │ 2. Process    │
            │    Order     │─────────>│    Payment    │
            └──────────────┘          └──────┬───────┘
                                              │
                                     ┌────────┴────────┐
                                     ▼                 ▼
                              Inventory Service   Shipping Service
                              ┌──────────────┐   ┌──────────────┐
                              │ 3. Reserve   │   │ 4. Ship      │
                              │    Stock     │──>│              │
                              └──────────────┘   └──────────────┘
```

**Implementation**:
```csharp
class OrderSagaOrchestrator
{
    public async Task<OrderResult> ExecuteSaga(CreateOrderRequest request)
    {
        var order = await _orderClient.CreateOrder(request);        // Step 1
        var payment = await _paymentClient.ProcessPayment(order);   // Step 2
        if (!payment.Success)
        {
            await _orderClient.CancelOrder(order.Id);               // Compensate 1
            return OrderResult.Failed(payment.Error);
        }
        var inventory = await _inventoryClient.ReserveStock(order); // Step 3
        if (!inventory.Success)
        {
            await _paymentClient.RefundPayment(payment.Id);         // Compensate 2
            await _orderClient.CancelOrder(order.Id);               // Compensate 1
            return OrderResult.Failed(inventory.Error);
        }
        // ...continue
    }
}
```

## Transactional Outbox

**Problem**: Atomic dual-write (DB + message broker).

**Solution**: Write event to same DB as business data.

```csharp
async Task CreateOrder(OrderData data)
{
    using var tx = await _db.Database.BeginTransactionAsync();
    var order = Order.Create(data);
    _db.Orders.Add(order);
    _db.OutboxMessages.Add(new OutboxMessage
    {
        Id = Guid.NewGuid(),
        Type = "OrderCreated",
        Payload = JsonSerializer.Serialize(order),
        CreatedAt = DateTime.UtcNow,
        ProcessedAt = null
    });
    await _db.SaveChangesAsync();
    await tx.CommitAsync();
}
```

**Outbox processor** (background worker):
```csharp
class OutboxProcessor : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var messages = await _db.OutboxMessages
                .Where(m => m.ProcessedAt == null)
                .OrderBy(m => m.CreatedAt)
                .Take(100)
                .ToListAsync(ct);

            foreach (var msg in messages)
            {
                await _publisher.PublishAsync(msg.Type, msg.Payload);
                msg.ProcessedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync(ct);
            await Task.Delay(1000, ct);
        }
    }
}
```

## Communication Pattern Selection

| Scenario | Pattern | Rationale |
|---|---|---|
| Query product details | HTTP/gRPC sync | Need immediate response |
| Notify user of order update | Async event (MQ) | Not time-critical, decoupled |
| Complete 5-step order flow | Orchestration Saga | Multiple services, complex compensation |
| Log all domain events | Event stream (Kafka) | Auditing, replay, multiple consumers |
| Guarantee event delivery | Transactional Outbox | Avoid dual-write inconsistency |
| Update search index after data change | Async event (CDC) | Debezium + Kafka for DB change capture |
