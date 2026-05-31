# Node.js Architecture Patterns

## Overview

This reference covers architecture patterns for Node.js backend applications: monolithic modular, microservices, event-driven, and layered architectures. Each pattern includes trade-offs, implementation guidance, and migration paths.

## Table of Contents

1. Modular Monolith
2. Microservices
3. Event-Driven Architecture
4. Layered Architecture
5. Hexagonal Architecture
6. CQRS
7. Saga Pattern
8. Strangler Fig Pattern
9. Backend for Frontend
10. Pattern Selection Guide

---

## 1. Modular Monolith

### When to Use
- Team size: 3-15 developers
- Application complexity: Moderate to high
- Deployment: Single unit
- Scaling: Vertical or read-replica

### Structure
```
src/
+-- modules/
|   +-- orders/
|   |   +-- domain/
|   |   +-- application/
|   |   +-- infrastructure/
|   |   +-- presentation/
|   +-- users/
|   +-- payments/
+-- shared/
    +-- kernel/
    +-- infrastructure/
```

### Implementation
```typescript
// modules/orders/application/OrderService.ts
import { OrderRepository } from '../domain/OrderRepository';
import { EventBus } from '../../shared/infrastructure/EventBus';

export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<Order> {
    const order = Order.create(command);
    await this.repo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
    return order;
  }
}

// modules/orders/infrastructure/OrderRouter.ts
import { Router } from 'express';
import { OrderController } from '../presentation/OrderController';

export function createOrderRouter(controller: OrderController): Router {
  const router = Router();
  router.post('/', controller.create.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  return router;
}
```

### Benefits
- Simple deployment (single unit)
- Shared code without duplication
- No network overhead between modules
- Transactional consistency across modules
- Easy refactoring within boundaries

### Drawbacks
- Single deployment risk (all or nothing)
- Scaling entire application (not per-module)
- Tight coupling risk without discipline
- Build time increases with codebase size

### Migration Path to Microservices
```typescript
// Step 1: Define bounded contexts
// Step 2: Extract shared kernel
// Step 3: Add anti-corruption layer
// Step 4: Extract into separate services

// Anti-corruption layer example
class OrderAntiCorruptionLayer {
  async getCustomer(customerId: string): Promise<CustomerDto> {
    // In monolith: direct call
    // In microservices: HTTP call
    if (process.env.USE_MICROSERVICES) {
      return this.httpClient.get(`/users/${customerId}`);
    }
    return this.userModule.getCustomer(customerId);
  }
}
```

---

## 2. Microservices

### When to Use
- Team size: 15+ developers
- Application complexity: High
- Deployment: Independent services
- Scaling: Per-service

### Service Boundaries
```
order-service:
  GET    /api/orders
  POST   /api/orders
  GET    /api/orders/:id
  POST   /api/orders/:id/cancel

payment-service:
  POST   /api/payments
  GET    /api/payments/:id

notification-service:
  POST   /api/notifications/send
```

### Inter-Service Communication
```typescript
// Synchronous HTTP (request/response)
class OrderServiceClient {
  async getOrder(orderId: string): Promise<Order> {
    const response = await axios.get(`http://order-service/api/orders/${orderId}`, {
      timeout: 2000,
      headers: { 'X-Request-Id': uuid() },
    });
    return response.data;
  }
}

// Asynchronous messaging (events)
class PaymentEventHandler {
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    await this.orderService.updateStatus(event.orderId, 'paid');
    await this.eventBus.publish(new OrderConfirmedEvent(event.orderId));
  }
}
```

### Service Discovery
```typescript
// Simple DNS-based discovery
const SERVICE_REGISTRY = {
  'order-service': { host: 'order-service.svc.cluster.local', port: 3000 },
  'payment-service': { host: 'payment-service.svc.cluster.local', port: 3001 },
  'notification-service': { host: 'notification-service.svc.cluster.local', port: 3002 },
};

class ServiceDiscovery {
  getUrl(serviceName: string): string {
    const service = SERVICE_REGISTRY[serviceName];
    return `http://${service.host}:${service.port}`;
  }
}
```

---

## 3. Event-Driven Architecture

### Components
```
Event Producers -> Event Bus -> Event Consumers
                                   |
                              Event Store (optional)
```

### Event Bus Implementation
```typescript
import { EventEmitter } from 'events';

// In-process event bus (for monoliths)
class InProcessEventBus extends EventEmitter {
  async publish(event: DomainEvent): Promise<void> {
    this.emit(event.type, event);
  }

  subscribe<T extends DomainEvent>(type: string, handler: (event: T) => Promise<void>): void {
    this.on(type, handler);
  }
}

// Redis-backed event bus (for distributed systems)
class RedisEventBus {
  constructor(private readonly redis: Redis) {}

  async publish(topic: string, event: DomainEvent): Promise<void> {
    await this.redis.publish(topic, JSON.stringify(event));
  }

  async subscribe(topic: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(topic, (message) => {
      handler(JSON.parse(message));
    });
  }
}
```

### Event Sourcing Basics
```typescript
// Event store
interface StoredEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
  timestamp: Date;
}

class EventStore {
  async save(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.db.query(
        'INSERT INTO events (id, aggregate_id, aggregate_type, event_type, data, version, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [event.id, event.aggregateId, event.aggregateType, event.type, event.data, event.version, event.timestamp]
      );
    }
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    const result = await this.db.query(
      'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY version ASC',
      [aggregateId]
    );
    return result.rows;
  }
}
```

---

## 4. Layered Architecture

### Structure
```
Presentation Layer -> Application Layer -> Domain Layer -> Infrastructure Layer
```

### Implementation
```typescript
// Presentation Layer (HTTP)
class OrderController {
  constructor(private readonly orderService: OrderApplicationService) {}

  async create(req: Request, res: Response): Promise<void> {
    const command = new CreateOrderCommand(req.body);
    const result = await this.orderService.handle(command);
    res.status(201).json(result);
  }
}

// Application Layer (use cases)
class OrderApplicationService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: CreateOrderCommand): Promise<OrderDto> {
    const order = Order.create(command.customerId, command.items);
    await this.repo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
    return OrderDto.fromDomain(order);
  }
}

// Domain Layer (entities, value objects)
class Order {
  constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
    public readonly items: OrderItem[],
    public status: OrderStatus,
  ) {}

  static create(customerId: string, items: OrderItemInput[]): Order {
    const id = OrderId.generate();
    const orderItems = items.map(i => new OrderItem(i.productId, i.quantity, i.price));
    return new Order(id, new CustomerId(customerId), orderItems, OrderStatus.PENDING);
  }
}

// Infrastructure Layer (DB, external services)
class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly pool: Pool) {}

  async save(order: Order): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO orders (id, customer_id, status) VALUES ($1, $2, $3)',
        [order.id.value, order.customerId.value, order.status]
      );
      for (const item of order.items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [order.id.value, item.productId, item.quantity, item.price]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
```

---

## 5. Hexagonal Architecture (Ports and Adapters)

### Structure
```
                     +---> Inbound Port (Interface) <--- Adapter (Controller)
Application Core ---+
                     +---> Outbound Port (Interface) ---> Adapter (Repository)
```

### Implementation
```typescript
// Domain Port
interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
}

// Domain Port
interface PaymentGateway {
  charge(amount: Money, customerId: CustomerId): Promise<PaymentResult>;
}

// Domain Service (application core, no framework imports)
class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<Order> {
    const order = Order.create(command.customerId, command.items);
    const savedOrder = await this.orderRepo.save(order);

    const paymentResult = await this.paymentGateway.charge(
      order.totalAmount,
      order.customerId
    );

    if (paymentResult.success) {
      savedOrder.confirm();
      await this.orderRepo.save(savedOrder);
    }

    return savedOrder;
  }
}

// Infrastructure Adapter (Postgres)
class PostgresOrderAdapter implements OrderRepository {
  async save(order: Order): Promise<Order> {
    // Implementation
    return order;
  }

  async findById(id: OrderId): Promise<Order | null> {
    // Implementation
    return null;
  }
}

// Infrastructure Adapter (Stripe)
class StripePaymentAdapter implements PaymentGateway {
  async charge(amount: Money, customerId: CustomerId): Promise<PaymentResult> {
    // Implementation
    return { success: true, transactionId: 'txn_123' };
  }
}
```

---

## 6. CQRS (Command Query Responsibility Segregation)

### Structure
```
Command Side (Write)          Query Side (Read)
+-------------------+         +-------------------+
| Command Handler   |         | Query Handler     |
| -> Validate       |         | -> Read from      |
| -> Execute        |         |    read-optimized  |
| -> Publish Event  |         |    denormalized DB |
+--------+----------+         +--------+----------+
         |                              ^
         v                              |
    [Event Bus] ------------------------+
```

### Implementation
```typescript
// Command
class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: OrderItemDto[],
  ) {}
}

// Command Handler
class CreateOrderHandler {
  constructor(
    private readonly repo: OrderWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: CreateOrderCommand): Promise<OrderId> {
    const order = Order.create(command.customerId, command.items);
    await this.repo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
    return order.id;
  }
}

// Query
class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}

// Query Handler
class GetOrderHandler {
  constructor(private readonly readRepo: OrderReadRepository) {}

  async handle(query: GetOrderQuery): Promise<OrderReadModel | null> {
    return this.readRepo.findById(query.orderId);
  }
}

// Read model updater (subscribes to events)
class OrderReadModelUpdater {
  constructor(private readonly readRepo: OrderReadRepository) {}

  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const orderData = await this.fetchFromWriteSide(event.orderId);
    await this.readRepo.saveDenormalized(orderData);
  }

  private async fetchFromWriteSide(orderId: OrderId): Promise<OrderReadModel> {
    // In practice, event carries enough data or read side queries write side
    return {
      id: orderId.value,
      customerId: 'cust-1',
      status: 'pending',
      itemCount: 3,
      totalAmount: 59.97,
      createdAt: new Date(),
    };
  }
}
```

---

## 7. Saga Pattern (Distributed Transactions)

### Choreography-Based Saga
```typescript
// Each service publishes events and listens for compensating events
class OrderService {
  async createOrder(command: CreateOrderCommand): Promise<void> {
    const order = Order.create(command);
    await this.repo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
  }

  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const order = await this.repo.findById(event.orderId);
    order.cancel('Payment failed');
    await this.repo.save(order);
  }
}

class PaymentService {
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.processPayment(event.orderId);
      await this.eventBus.publish(new PaymentCompletedEvent(event.orderId));
    } catch (error) {
      await this.eventBus.publish(new PaymentFailedEvent(event.orderId, error.message));
    }
  }
}
```

### Orchestration-Based Saga
```typescript
// Central orchestrator coordinates the saga
class OrderSagaOrchestrator {
  async execute(orderId: string): Promise<void> {
    const saga = new Saga(orderId);

    try {
      // Step 1: Reserve inventory
      await saga.step('inventory.reserve', () =>
        this.inventoryClient.reserve(orderId));

      // Step 2: Process payment
      await saga.step('payment.process', () =>
        this.paymentClient.charge(orderId));

      // Step 3: Confirm order
      await saga.step('order.confirm', () =>
        this.orderClient.confirm(orderId));

      await saga.complete();
    } catch (error) {
      // Compensate in reverse order
      await saga.compensate();
      throw error;
    }
  }
}

class Saga {
  private readonly executedSteps: Step[] = [];

  async step(name: string, action: () => Promise<void>, compensate?: () => Promise<void>): Promise<void> {
    await action();
    this.executedSteps.push({ name, compensate });
  }

  async compensate(): Promise<void> {
    for (const step of this.executedSteps.reverse()) {
      if (step.compensate) {
        try {
          await step.compensate();
        } catch (error) {
          logger.error(`Compensation failed for ${step.name}`, error);
        }
      }
    }
  }
}
```

---

## 8. Strangler Fig Pattern

### Migration Strategy
```typescript
// Proxy that routes traffic to old or new system
class MigrationProxy {
  private readonly migratedFeatures = new Set<string>();

  async handleRequest(req: Request): Promise<Response> {
    if (this.isMigrated(req.path)) {
      return this.forwardToNew(req);
    }
    return this.forwardToOld(req);
  }

  async migrateFeature(feature: string): Promise<void> {
    this.migratedFeatures.add(feature);
    // Start dual-write mode
    await this.startDualWrite(feature);
    // Verify data consistency
    await this.verifyConsistency(feature);
    // Switch reads to new system
    await this.switchReads(feature);
    // Remove old code
    await this.removeOldCode(feature);
  }

  private async startDualWrite(feature: string): Promise<void> {
    // Write to both old and new systems
  }

  private async verifyConsistency(feature: string): Promise<void> {
    // Compare data between old and new
  }

  private async switchReads(feature: string): Promise<void> {
    // Update migration proxy routing
  }
}
```

---

## 9. Backend for Frontend (BFF)

### BFF Structure
```typescript
// Web BFF
class WebBffService {
  async getDashboard(userId: string): Promise<WebDashboardResponse> {
    const [profile, orders, notifications] = await Promise.all([
      this.userService.getProfile(userId),
      this.orderService.getRecentOrders(userId, 5),
      this.notificationService.getUnread(userId),
    ]);

    return {
      userName: profile.name,
      recentOrders: orders.map(o => ({
        id: o.id,
        date: o.createdAt.toLocaleDateString(),
        total: formatCurrency(o.total),
        status: o.status,
      })),
      notificationCount: notifications.length,
      _links: {
        orders: '/api/web/orders',
        profile: '/api/web/profile',
      },
    };
  }
}

// Mobile BFF
class MobileBffService {
  async getDashboard(userId: string): Promise<MobileDashboardResponse> {
    const [profile, orders] = await Promise.all([
      this.userService.getProfile(userId),
      this.orderService.getRecentOrders(userId, 3),
    ]);

    return {
      userName: profile.firstName,
      orderCount: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + o.total, 0),
    };
  }
}
```

---

## 10. Pattern Selection Guide

```
Team size < 10, application complexity moderate?
  +-- Yes -> Modular Monolith + Event-Driven within boundaries
  +-- No  -> Microservices

Need high write throughput with different read models?
  +-- Yes -> CQRS + Event Sourcing
  +-- No  -> Standard CRUD

Require distributed transaction across services?
  +-- Yes -> Saga Pattern (choreography or orchestration)
  +-- No  -> Eventual consistency

Migrating monolith to microservices?
  +-- Yes -> Strangler Fig + Anti-Corruption Layer
  +-- No  -> Build from scratch

Multiple distinct client types (web, mobile, IoT)?
  +-- Yes -> BFF per client type
  +-- No  -> Single API

Need to swap infrastructure (DB, external services) independently?
  +-- Yes -> Hexagonal Architecture (Ports and Adapters)
  +-- No  -> Layered Architecture
```

### Complexity Trade-offs

| Pattern | Complexity | Flexibility | Performance | Testability |
|---|---|---|---|---|
| Modular Monolith | Low | Medium | High | High |
| Microservices | High | High | Medium | Medium |
| Event-Driven | Medium | High | Medium | Medium |
| Layered | Low | Low | High | High |
| Hexagonal | Medium | High | High | Very High |
| CQRS | High | High | Very High | Medium |
| Saga | High | Medium | Medium | Low |
| BFF | Medium | High | High | High |

### Recommended Library Stack

| Pattern | Libraries |
|---|---|
| Modular Monolith | Express/Fastify, Zod, Vitest |
| Microservices | Fastify, Axios, nats/node-redis |
| Event-Driven | EventEmitter2, amqplib, kafkajs |
| CQRS | Sequelize/Prisma (write), Couchbase/Redis (read) |
| Saga | Temporary (in-memory), camunda-external-task (distributed) |
| BFF | Fastify, Redis, opossum (circuit breaker) |

---

## References

- Node.js Design Patterns by Mario Casciaro
- Building Microservices by Sam Newman
- Domain-Driven Design by Eric Evans
- Implementing Domain-Driven Design by Vaughn Vernon
- Monolith to Microservices by Sam Newman
- Enterprise Integration Patterns by Gregor Hohpe
