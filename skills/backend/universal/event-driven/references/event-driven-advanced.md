# Event-Driven Advanced Patterns

## Event Ordering and Guarantees

### Strict Ordering with Kafka
Events for the same entity must go to the same partition. The partition key ensures ordering:

```typescript
// Producer ensures ordering by entity ID
async function publishOrderEvent(event: OrderEvent): Promise<void> {
  await producer.send({
    topic: 'order.events',
    messages: [{
      key: event.orderId,  // Same order → same partition → ordered
      value: JSON.stringify(event),
      headers: { 'event-type': event.eventType, 'version': '1' },
    }],
  });
}
```

### Out-of-Order Event Detection
```typescript
class OrderingGuard {
  private lastSequence = new Map<string, number>();

  validate(event: SequencedEvent): boolean {
    const key = `${event.aggregateType}:${event.aggregateId}`;
    const lastSeq = this.lastSequence.get(key) ?? -1;

    if (event.sequenceNumber <= lastSeq) {
      logger.error('Out-of-order event detected', {
        key,
        expected: lastSeq + 1,
        got: event.sequenceNumber,
      });
      return false;
    }
    this.lastSequence.set(key, event.sequenceNumber);
    return true;
  }
}
```

## Saga Patterns

### Choreography-Based Saga
Each service performs its operation and emits events that trigger the next step:

```typescript
// Order Service
class OrderService {
  async createOrder(command: CreateOrderCommand): Promise<void> {
    const order = Order.create(command);
    await this.orderRepo.save(order);
    // Emit event — Payment Service will pick this up
    await this.eventBus.publish(new OrderCreatedEvent(order));
  }

  async onPaymentApproved(event: PaymentApprovedEvent): Promise<void> {
    const order = await this.orderRepo.findById(event.orderId);
    order.confirm();
    await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderConfirmedEvent(order));
  }

  async onPaymentDeclined(event: PaymentDeclinedEvent): Promise<void> {
    const order = await this.orderRepo.findById(event.orderId);
    order.cancel(event.reason);
    await this.orderRepo.save(order);
    // Compensation complete
  }
}
```

### Orchestration-Based Saga
Central orchestrator controls the saga:

```typescript
class OrderSagaOrchestrator {
  async execute(saga: OrderSaga): Promise<void> {
    try {
      await this.step1_createOrder(saga);
      await this.step2_processPayment(saga);
      await this.step3_reserveInventory(saga);
      await this.step4_confirmOrder(saga);
      await this.step5_shipOrder(saga);
      await this.sagaRepo.markCompleted(saga.id);
    } catch (error) {
      await this.compensate(saga);
      await this.sagaRepo.markFailed(saga.id, error);
    }
  }

  private async compensate(saga: OrderSaga): Promise<void> {
    // Reverse in reverse order
    if (saga.shipmentCreated) await this.cancelShipment(saga.orderId);
    if (saga.inventoryReserved) await this.releaseInventory(saga.orderId);
    if (saga.paymentProcessed) await this.refundPayment(saga.orderId);
    if (saga.orderCreated) await this.cancelOrder(saga.orderId);
  }
}
```

## Event-Driven Error Handling Patterns

### Poison Message Handling
```typescript
class PoisonMessageHandler {
  async handle(message: Message, error: Error): Promise<void> {
    const poisonCount = await this.getPoisonCount(message);

    if (poisonCount >= 3) {
      // Move to DLQ — message is poisonous
      await this.sendToDLQ(message, error);
      await this.consumer.commitOffset(message); // Skip so we don't block
    } else {
      await this.incrementPoisonCount(message);
      // Don't commit — let the consumer retry on restart
      throw error;
    }
  }
}
```

### Circuit Breaker for Downstream Dependencies
```typescript
class EventConsumerCircuitBreaker {
  private failureCount = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000; // 30 seconds
  private open = false;
  private openSince: number | null = null;

  async consume(event: IntegrationEvent): Promise<void> {
    if (this.open) {
      if (Date.now() - this.openSince! > this.resetTimeout) {
        this.open = false;
        this.failureCount = 0;
      } else {
        // Circuit is open — reject immediately
        throw new Error('Circuit breaker open');
      }
    }

    try {
      await this.process(event);
      this.failureCount = 0;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.open = true;
        this.openSince = Date.now();
        logger.error('Circuit breaker opened', { eventType: event.eventType });
      }
      throw error;
    }
  }
}
```

## Event Schema Management

### Schema Registry with Compatibility Checks
```typescript
class SchemaRegistry {
  private schemas = new Map<string, number>();

  register(eventType: string, schema: object, version: number): void {
    const existingVersion = this.schemas.get(eventType);

    if (existingVersion && version <= existingVersion) {
      throw new Error(`Version ${version} of ${eventType} already exists`);
    }

    if (existingVersion && !this.isBackwardCompatible(existingVersion, schema)) {
      throw new Error(`Schema ${eventType} v${version} breaks backward compatibility`);
    }

    this.schemas.set(eventType, version);
  }

  private isBackwardCompatible(oldVersion: number, newSchema: object): boolean {
    // Check: new schema has all fields from old schema (maybe as deprecated)
    // Check: no required fields were added
    // Check: no field types changed
    return true; // Simplified — actual implementation uses Avro/Protobuf compatibility checks
  }
}
```

### Multi-Version Consumer
```typescript
class MultiVersionConsumer {
  async handle(event: IntegrationEvent): Promise<void> {
    switch (event.eventVersion) {
      case 1:
        return this.handleV1(event.data as OrderPlacedV1);
      case 2:
        return this.handleV2(event.data as OrderPlacedV2);
      default:
        logger.error('Unknown event version', {
          eventType: event.eventType,
          version: event.eventVersion,
        });
        throw new Error(`Unknown version ${event.eventVersion} for ${event.eventType}`);
    }
  }
}
```

## Event-Driven Testing

### Consumer Test Patterns
```typescript
describe('OrderPlaced consumer', () => {
  it('processes order event idempotently', async () => {
    const event = createOrderPlacedEvent();

    await consumer.handle(event);  // First call
    await consumer.handle(event);  // Duplicate

    expect(orderRepo.save).toHaveBeenCalledTimes(1); // Only once
  });

  it('sends to DLQ after max retries', async () => {
    orderRepo.save.mockRejectedValue(new Error('DB timeout'));
    const event = createOrderPlacedEvent();

    for (let i = 0; i < 3; i++) {
      await expect(consumer.handle(event)).rejects.toThrow('DB timeout');
    }

    expect(dlqPublisher.publish).toHaveBeenCalled();
  });

  it('handles out-of-order events', async () => {
    const eventV2 = createOrderEvent(2);
    const eventV1 = createOrderEvent(1);

    await consumer.handle(eventV2);  // V2 arrives first
    await consumer.handle(eventV1);  // V1 arrives late

    expect(pendingStore.save).toHaveBeenCalledWith(eventV2);
    expect(orderRepo.save).toHaveBeenCalledTimes(1); // After V1 is processed
  });
});
```

## Event Governance

### Event Catalog
Maintain a catalog of all events:
```yaml
events:
  - name: Order.Placed
    version: 2
    producer: order-service
    consumers:
      - payment-service
      - inventory-service
      - notification-service
    schema:
      orderId: uuid
      customerId: uuid
      items: array<OrderItem>
      total: decimal
    compatibility: backward
```

### Event Ownership
- Each event has exactly one producer
- Producers own the event schema
- Consumers must adapt to schema changes
- Breaking changes require consumer notification and coordination
