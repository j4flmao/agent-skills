# Outbox Implementations

## Database-Specific Implementations

### PostgreSQL

```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0
);

CREATE INDEX idx_outbox_pending ON outbox(created_at) WHERE processed_at IS NULL;
```

### MySQL

```sql
CREATE TABLE outbox (
  id BINARY(16) PRIMARY KEY,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_data JSON NOT NULL,
  metadata JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  processed_at DATETIME(6),
  retry_count INT DEFAULT 0,
  INDEX idx_pending (created_at) USING BTREE
) ENGINE=InnoDB;
```

### SQL Server

```sql
CREATE TABLE outbox (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  aggregate_type NVARCHAR(100) NOT NULL,
  aggregate_id NVARCHAR(100) NOT NULL,
  event_type NVARCHAR(200) NOT NULL,
  event_data NVARCHAR(MAX) NOT NULL,
  metadata NVARCHAR(MAX) NOT NULL DEFAULT '{}',
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  processed_at DATETIME2,
  retry_count INT DEFAULT 0
);

CREATE INDEX IX_outbox_pending ON outbox(created_at) WHERE processed_at IS NULL;
```

## Framework-Specific Implementations

### Spring Boot (Java)

```java
@Component
public class OutboxWriter {
    @Transactional
    public void writeAndSave(Order order, OrderPlacedEvent event) {
        orderRepository.save(order);
        OutboxMessage message = new OutboxMessage();
        message.setAggregateType("order");
        message.setEventType("OrderPlaced");
        message.setEventData(objectMapper.writeValueAsString(event));
        outboxRepository.save(message);
    }
}
```

### NestJS (TypeScript)

```typescript
@Injectable()
export class OutboxService {
  @Transactional()
  async placeOrder(command: PlaceOrderCommand): Promise<void> {
    const order = await this.orderRepo.save(Order.create(command));
    await this.outboxRepo.save({
      aggregateType: 'order',
      aggregateId: order.id,
      eventType: 'OrderPlaced',
      eventData: { orderId: order.id, customerId: command.customerId },
      createdAt: new Date(),
    });
  }
}
```

### Go

```go
func (s *OrderService) PlaceOrder(ctx context.Context, cmd PlaceOrderCommand) error {
    return s.db.WithTransaction(ctx, func(tx *sql.Tx) error {
        if err := s.orderRepo.Save(ctx, tx, order); err != nil {
            return err
        }
        return s.outboxRepo.Save(ctx, tx, OutboxMessage{
            AggregateType: "order",
            EventType:     "OrderPlaced",
            EventData:     cmd,
        })
    })
}
```

### .NET

```csharp
public class OrderService {
    public async Task PlaceOrder(PlaceOrderCommand command) {
        using var transaction = await dbContext.Database.BeginTransactionAsync();
        var order = Order.Create(command);
        dbContext.Orders.Add(order);
        dbContext.OutboxMessages.Add(new OutboxMessage {
            EventType = "OrderPlaced",
            EventData = JsonSerializer.Serialize(order)
        });
        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
```
