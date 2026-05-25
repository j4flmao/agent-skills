# Event-Driven Testing

## Test Pyramid for Event-Driven Systems

```
         ╱╲
        ╱  ╲         E2E (full event flow across services)
       ╱    ╲
      ╱────────╲
     ╱          ╲      Integration (real broker, real DB)
    ╱            ╲
   ╱──────────────╲
  ╱                ╲   Consumer Tests (real handler, mocked dependencies)
 ╱                  ╲
╱────────────────────╲  Domain Event Tests (event creation, schema, versioning)
```

## Domain Event Testing

```typescript
describe('OrderPlacedEvent', () => {
  it('creates event with required fields', () => {
    const event = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 10,
    });

    expect(event.eventType).toBe('OrderPlaced');
    expect(event.eventVersion).toBe(1);
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('supports schema versioning', () => {
    // v1 schema
    const v1Event = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 10,
    });

    // v2 schema adds optional discount field
    const v2Event = new OrderPlacedEventV2({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 8,  // discounted
      discount: 2,
    });

    // v1 consumer should handle v2 event (backward compatible)
    const consumerV1 = new OrderConsumerV1();
    expect(() => consumerV1.handle(v2Event)).not.toThrow();
  });

  it('serializes and deserializes correctly', () => {
    const original = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 10,
    });

    const json = JSON.stringify(original.toJSON());
    const parsed = OrderPlacedEvent.fromJSON(JSON.parse(json));

    expect(parsed.eventId).toBe(original.eventId);
    expect(parsed.data.orderId).toBe('ord-1');
    expect(parsed.data.total).toBe(10);
  });
});
```

## Consumer Testing

```typescript
describe('OrderEventConsumer', () => {
  let consumer: OrderEventConsumer;
  let inventoryService: jest.Mocked<InventoryService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    inventoryService = {
      reserveItems: jest.fn().mockResolvedValue({ success: true }),
    };
    emailService = {
      sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    };
    consumer = new OrderEventConsumer(inventoryService, emailService);
  });

  it('processes OrderPlaced event successfully', async () => {
    const event = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 10,
    });

    await consumer.handleOrderPlaced(event);

    expect(inventoryService.reserveItems).toHaveBeenCalledWith(
      'ord-1', [{ productId: 'p1', quantity: 1 }]
    );
    expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith(
      'cust-1', 'ord-1'
    );
  });

  it('handles idempotency — duplicate events are skipped', async () => {
    const event = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 10,
    });

    // First call
    await consumer.handleOrderPlaced(event);
    expect(inventoryService.reserveItems).toHaveBeenCalledTimes(1);

    // Duplicate delivery
    await consumer.handleOrderPlaced(event);
    expect(inventoryService.reserveItems).toHaveBeenCalledTimes(1); // Not called again
  });

  it('moves to DLQ after exhausting retries', async () => {
    inventoryService.reserveItems.mockRejectedValue(new Error('Inventory timeout'));

    const event = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      total: 10,
    });

    // Consumer should eventually move to DLQ
    for (let i = 0; i < 4; i++) {
      try {
        await consumer.handleOrderPlaced(event);
      } catch {
        // Expected
      }
    }

    expect(consumer.isInDeadLetter(event.eventId)).toBe(true);
  });

  it('handles event version migration', async () => {
    // Consumer should handle events with version 1 or 2
    const v1Event = { eventType: 'OrderPlaced', eventVersion: 1, data: { orderId: '1' } };
    const v2Event = { eventType: 'OrderPlaced', eventVersion: 2, data: { orderId: '1', discount: 5 } };

    await expect(consumer.handleOrderPlaced(v1Event)).resolves.not.toThrow();
    await expect(consumer.handleOrderPlaced(v2Event)).resolves.not.toThrow();
  });
});
```

## Producer Testing

```typescript
describe('OrderEventProducer', () => {
  let producer: OrderEventProducer;
  let eventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    eventBus = { publish: jest.fn() };
    producer = new OrderEventProducer(eventBus);
  });

  it('publishes event on order creation', async () => {
    const order = Order.create('cust-1', [validItem]);
    await producer.orderPlaced(order);

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'OrderPlaced',
        data: expect.objectContaining({
          orderId: order.id,
          customerId: 'cust-1',
        }),
      }),
    );
  });

  it('includes metadata in event envelope', async () => {
    const order = Order.create('cust-1', [validItem]);
    const correlationId = 'corr-123';

    await producer.orderPlaced(order, { correlationId });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          correlationId: 'corr-123',
        }),
      }),
    );
  });
});
```

## Integration Testing with Real Broker

```typescript
describe('Event Integration', () => {
  let container: StartedKafkaContainer;
  let producer: KafkaEventBus;
  let consumer: KafkaEventBus;

  beforeAll(async () => {
    container = await new KafkaContainer('confluent:7.6')
      .withNetwork(NETWORK)
      .start();

    producer = new KafkaEventBus(container.getBootstrapServers(), 'producer');
    consumer = new KafkaEventBus(container.getBootstrapServers(), 'consumer');

    await producer.connect();
    await consumer.connect();
  }, 120000);

  afterAll(async () => {
    await producer.disconnect();
    await consumer.disconnect();
    await container.stop();
  });

  it('publishes and consumes event end-to-end', async () => {
    const receivedEvents: any[] = [];
    const topic = 'test-events';

    await consumer.subscribe(topic, async (event) => {
      receivedEvents.push(event);
    });

    await producer.publish(topic, {
      eventType: 'TestEvent',
      data: { message: 'hello' },
    });

    // Wait for async delivery
    await delay(3000);

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].data.message).toBe('hello');
  });

  it('survives consumer restart and replays from last offset', async () => {
    // Implementation depends on specific broker
  });
});
```

## Testing Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| In-memory event bus | Fake implementation for fast tests | `InMemoryEventBus` with publish/subscribe |
| Test fixtures | Pre-built events for common scenarios | `buildOrderPlacedEvent()` |
| Event recording | Capture all published events during test | `eventBus.getPublishedEvents()` |
| Consumer spy | Verify consumer was called with correct args | `jest.spyOn(consumer, 'handle')` |
| Time travel | Simulate past/future events | `event.occurredAt = mockedDate` |
| DLQ assertion | Verify failed events land in DLQ | `expect(dlq.count).toBe(1)` |

## Idempotency Testing

```typescript
describe('Consumer Idempotency', () => {
  it('processes duplicate event only once', async () => {
    const consumer = new OrderEventConsumer(deps);
    const dedupStore = new InMemoryDedupStore();
    consumer.setDedupStore(dedupStore);

    const event = createOrderPlacedEvent('ord-1');
    await consumer.handle(event);
    await consumer.handle(event); // duplicate

    // Verify side effects happened only once
    expect(deps.inventoryService.reserveItems).toHaveBeenCalledTimes(1);
    expect(deps.emailService.sendConfirmation).toHaveBeenCalledTimes(1);
  });

  it('handles out-of-order events', async () => {
    const consumer = new OrderEventConsumer(deps);

    // Ship event arrives before place event
    const shipEvent = createOrderShippedEvent('ord-1');
    const placeEvent = createOrderPlacedEvent('ord-1');

    await consumer.handle(shipEvent); // Should not throw
    // State should handle missing dependency gracefully

    await consumer.handle(placeEvent);
    // Both events processed correctly
  });
});
```
