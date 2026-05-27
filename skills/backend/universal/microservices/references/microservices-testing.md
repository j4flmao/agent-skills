# Microservices Testing

## Overview
Test microservices: contract testing, integration testing, end-to-end testing, service virtualization, and chaos testing.

## Consumer-Driven Contract Tests

```typescript
// Provider-side contract test (Pact)
import { Pact } from '@pact-foundation/pact';

describe('Order Service contract', () => {
  const provider = new Pact({
    consumer: 'payment-service',
    provider: 'order-service',
    port: 4000,
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('GET /orders/:id', () => {
    beforeEach(() => {
      provider.addInteraction({
        state: 'an order exists',
        uponReceiving: 'a request for an order',
        withRequest: {
          method: 'GET',
          path: '/orders/123',
          headers: { Accept: 'application/json' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: '123',
            status: 'pending',
            total: 99.99,
            items: Pact.eachLike({
              productId: 'p1',
              quantity: 1,
              price: 99.99,
            }),
          },
        },
      });
    });

    it('returns order details', async () => {
      const response = await fetch('http://localhost:4000/orders/123', {
        headers: { Accept: 'application/json' },
      });
      expect(response.status).toBe(200);
    });
  });
});
```

```typescript
// Consumer-side Pact test
describe('Payment Service consumer', () => {
  it('processes order placed event correctly', async () => {
    // Verify the contract is still valid
    const pact = new Pact({
      consumer: 'payment-service',
      provider: 'order-service',
    });

    await pact.verify('order-service', (provider) => {
      // Test that payment service correctly consumes the order events
      return fetch(`${provider.url}/orders/123`);
    });
  });
});
```

## Integration Tests

```typescript
import { GenericContainer } from 'testcontainers';

describe('Order Service Integration', () => {
  let postgres: StartedTestContainer;
  let kafka: StartedTestContainer;
  let app: Server;

  beforeAll(async () => {
    // Start dependencies
    postgres = await new GenericContainer('postgres:16')
      .withEnvironment({
        POSTGRES_DB: 'orders',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .start();

    kafka = await new GenericContainer('confluentinc/cp-kafka:latest')
      .withExposedPorts(9092)
      .start();

    // Start service with real dependencies
    process.env.DATABASE_URL = `postgres://postgres:test@localhost:${postgres.getMappedPort(5432)}/orders`;
    process.env.KAFKA_BROKERS = `localhost:${kafka.getMappedPort(9092)}`;
    app = await startServer();
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await kafka?.stop();
    await postgres?.stop();
  });

  it('creates order and publishes event', async () => {
    const response = await fetch('http://localhost:3000/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 2 }],
      }),
    });

    expect(response.status).toBe(201);
    const order = await response.json();

    // Verify database
    const dbOrder = await db.query('SELECT * FROM orders WHERE id = $1', [order.id]);
    expect(dbOrder.rows[0].status).toBe('created');

    // Verify event published to Kafka
    const events = await consumeKafkaEvent('order.created');
    expect(events[0].orderId).toBe(order.id);
  });
});
```

## End-to-End Tests

```typescript
describe('Checkout Flow (E2E)', () => {
  it('completes full checkout across services', async () => {
    // 1. Browse products (product service)
    const products = await fetch(`${PRODUCT_SERVICE}/api/products?limit=1`).then(r => r.json());
    const product = products.data[0];

    // 2. Add to cart (cart service)
    const cart = await fetch(`${CART_SERVICE}/api/cart`, {
      method: 'POST',
      body: JSON.stringify({ userId: 'test-user', productId: product.id, quantity: 1 }),
    }).then(r => r.json());

    // 3. Place order (order service -> publishes event)
    const order = await fetch(`${ORDER_SERVICE}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({ cartId: cart.id }),
    }).then(r => r.json());
    expect(order.status).toBe('pending');

    // 4. Process payment (payment service -> consumes event)
    await waitForEvent('payment.processed', 10000);
    const updatedOrder = await fetch(`${ORDER_SERVICE}/api/orders/${order.id}`).then(r => r.json());
    expect(updatedOrder.status).toBe('confirmed');

    // 5. Verify inventory updated (inventory service -> consumes event)
    const inventory = await fetch(`${INVENTORY_SERVICE}/api/inventory/${product.id}`).then(r => r.json());
    expect(inventory.quantity).toBe(product.stock - 1);
  }, 30000);
});
```

## Service Virtualization

```typescript
class MockServiceRegistry {
  private mocks: Map<string, MockService> = new Map();

  // Create mock for downstream service
  registerMock(serviceName: string, responses: MockResponse[]): void {
    const server = http.createServer((req, res) => {
      const matched = responses.find(r =>
        req.method === r.method && req.url?.startsWith(r.path)
      );
      if (matched) {
        res.writeHead(matched.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(matched.body));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.mocks.set(serviceName, { server, port: this.getPort(serviceName) });
    server.listen(this.getPort(serviceName));
  }

  async startAll(): Promise<void> {
    this.registerMock('payment-service', [
      { method: 'POST', path: '/api/charges', status: 200, body: { id: 'ch_123', status: 'succeeded' } },
    ]);
    this.registerMock('inventory-service', [
      { method: 'GET', path: '/api/inventory', status: 200, body: { quantity: 100 } },
      { method: 'POST', path: '/api/inventory/reserve', status: 200, body: { reserved: true } },
    ]);
  }

  async stopAll(): Promise<void> {
    for (const [, mock] of this.mocks) {
      mock.server.close();
    }
  }
}
```

## Chaos Testing

```typescript
describe('Resilience Chaos Tests', () => {
  it('handles downstream service failure gracefully', async () => {
    // Simulate payment service failure
    await chaos.injectFault('payment-service', {
      type: 'http_error',
      status: 500,
      duration: 30000,
    });

    // Order placement should still work (queue for retry)
    const response = await fetch(`${ORDER_SERVICE}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', items: [{ productId: 'p1', qty: 1 }] }),
    });
    expect(response.status).toBe(202); // Accepted (queued)

    // Clean up fault
    await chaos.removeFault('payment-service');
  });

  it('handles database latency spike', async () => {
    // Inject 2s latency to database
    await chaos.injectLatency('database', 2000, 60000);

    const start = Date.now();
    const response = await fetch(`${ORDER_SERVICE}/api/orders?limit=10`);
    const duration = Date.now() - start;

    // Should still respond (with increased latency)
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(10000); // Should not hang forever

    await chaos.removeLatency('database');
  });

  it('recovers from Kafka broker restart', async () => {
    await chaos.restartService('kafka');

    // Wait for reconnection
    await new Promise(r => setTimeout(r, 15000));

    // Service should continue processing
    const response = await fetch(`${ORDER_SERVICE}/api/orders/123`);
    expect(response.status).toBe(200);
  });
});
```

## Key Points
- Use consumer-driven contract tests (Pact) for service-to-service contracts
- Integration test with real dependencies using Testcontainers
- Run end-to-end tests across all services in a staging environment
- Use service virtualization to mock downstream services in tests
- Run chaos tests: service failure, latency spikes, broker restart
- Verify graceful degradation under failure conditions
- Test sagas end-to-end: verify compensation on failure
- Monitor test results for contract breaches across deployments
