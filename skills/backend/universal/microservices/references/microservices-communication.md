# Microservices Communication

## Communication Patterns

| Pattern | Protocol | Coupling | Latency | Delivery Guarantee |
|---------|----------|----------|---------|-------------------|
| Synchronous Request-Response | HTTP/gRPC | Temporal | Low | Best-effort |
| Async Messaging | Message Queue | Temporal + Spatial | Medium | At-least-once |
| Event-Driven | Pub/Sub | Spatial only | Medium | At-least-once |
| Command Message | Message Queue | Temporal | Medium | Exactly-once (with outbox) |
| Document Message | Message Queue | Temporal | Medium | At-least-once |
| Request-Reply (async) | Message Queue | Temporal | Medium | At-least-once |

## Synchronous Communication (gRPC)

```protobuf
// order.proto
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (GetOrderResponse);
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
}

message GetOrderRequest {
  string order_id = 1;
}

message GetOrderResponse {
  string order_id = 1;
  string status = 2;
  double total = 3;
  repeated OrderItem items = 4;
}
```

```typescript
// Client implementation
class OrderServiceClient {
  private client: OrderServiceClient;

  constructor() {
    this.client = new OrderServiceClient(
      'order-service:50051',
      grpc.credentials.createInsecure(),
    );
  }

  async getOrder(orderId: string, timeout: number = 5000): Promise<Order> {
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setMilliseconds(deadline.getMilliseconds() + timeout);

      this.client.getOrder(
        { order_id: orderId },
        { deadline },
        (error, response) => {
          if (error) reject(error);
          else resolve(this.mapResponse(response));
        },
      );
    });
  }
}
```

## Asynchronous Communication (Message Queue)

```typescript
// Producer
class OrderEventProducer {
  constructor(private messageBus: MessageBus) {}

  async orderPlaced(order: Order): Promise<void> {
    await this.messageBus.publish('orders.events', {
      type: 'OrderPlaced',
      payload: {
        orderId: order.id,
        customerId: order.customerId,
        items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        total: order.total,
      },
      metadata: {
        correlationId: order.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Consumer
class InventoryEventConsumer {
  constructor(
    private messageBus: MessageBus,
    private inventoryService: InventoryService,
  ) {}

  async start(): Promise<void> {
    await this.messageBus.consume('orders.events', async (message) => {
      if (message.type === 'OrderPlaced') {
        try {
          await this.inventoryService.reserveItems(
            message.payload.orderId,
            message.payload.items,
          );
          await message.ack();
        } catch (err) {
          await message.nack(); // Will be retried
        }
      }
    });
  }
}
```

## Service Discovery

```yaml
# Kubernetes-native service discovery
service_discovery:
  kubernetes:
    dns: "{service}.{namespace}.svc.cluster.local"
    port: 80
    example: "order-service.prod.svc.cluster.local:80"

  consul:
    dns: "{service}.service.consul"
    health_check: "/v1/health/service/{service}"

  eureka:
    url: "http://eureka:8761/eureka"
    register: "/apps/{service}"
    health: "/actuator/health"
```

## Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30 seconds

  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (this.state === 'half-open') {
        this.state = 'open';
        this.lastFailureTime = Date.now();
      }
      return fallback();
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.lastFailureTime = Date.now();
    }
  }
}
```

## Communication Decision Matrix

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| Query current state | HTTP/gRPC sync | Need immediate response |
| Notify of state change | Async event | No response needed |
| Execute cross-service operation | Saga | Distributed transaction |
| Stream large dataset | gRPC streaming | Memory efficiency |
| Real-time updates | WebSocket/SSE | Bidirectional, low latency |
| Batch processing | Message queue | Buffering, retry |
| File transfer | Async with reference | Large payload, decoupled |

## Event Schemas

```json
{
  "event": {
    "id": "evt_abc123",
    "type": "OrderPlaced",
    "version": 1,
    "occurredAt": "2026-05-25T10:30:00Z",
    "producer": "order-service",
    "correlationId": "corr_456",
    "causationId": "cmd_789",
    "data": {
      "orderId": "ord_123",
      "customerId": "cust_456",
      "items": [
        { "productId": "prod_789", "quantity": 2, "price": 19.99 }
      ],
      "total": 39.98
    }
  }
}
```

## Error Handling

```typescript
class CommunicationErrorHandler {
  async handleError(error: Error, context: CommunicationContext): Promise<void> {
    switch (error.constructor) {
      case TimeoutError:
        await this.handleTimeout(context);
        break;
      case ServiceUnavailableError:
        await this.handleUnavailable(context);
        break;
      case InvalidResponseError:
        await this.handleInvalidResponse(context);
        break;
      default:
        await this.handleUnknownError(context, error);
    }
  }

  private async handleTimeout(context: CommunicationContext): Promise<void> {
    logger.warn({ service: context.targetService }, 'Request timed out');
    // Retry with backoff
    if (context.attempt < 3) {
      await sleep(Math.pow(2, context.attempt) * 1000);
      return context.retry();
    }
    // Fallback
    return context.fallback();
  }

  private async handleUnavailable(context: CommunicationContext): Promise<void> {
    logger.error({ service: context.targetService }, 'Service unavailable');
    // Circuit breaker
    await circuitBreaker.recordFailure(context.targetService);
    return context.fallback();
  }
}
```

## Communication Rules

| Rule | Rationale |
|------|-----------|
| Prefer async over sync | Loose coupling, better fault isolation |
| Always set timeouts | Prevent cascading failures |
| Use idempotency keys | Safe retries across service boundaries |
| Version all event schemas | Backward compatibility for consumers |
| Include correlation ID | End-to-end tracing across services |
| Never share databases | Tight coupling, single point of failure |
| Use circuit breakers | Fail fast, prevent cascade |
| Implement backpressure | Protect downstream services |
