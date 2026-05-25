# Integration Testing

## Integration Test Types

| Type | What It Tests | Dependencies | Speed | Tools |
|------|-------------|--------------|-------|-------|
| Database | Repository queries, migrations, data integrity | Real database (Testcontainers) | Fast (100ms) | Testcontainers, docker-compose |
| API Client | HTTP request/response, serialization, error mapping | WireMock or real server | Fast (50ms) | WireMock, nock, MockServer |
| Message Queue | Publish/consume, retry, DLQ | Real broker (Testcontainers) | Medium (200ms) | Testcontainers for Kafka/RabbitMQ |
| File System | File read/write, formats, encoding | Temp directory | Fast (10ms) | tmpfs, tempdir |
| Cache | Cache hit/miss, TTL, eviction | Real Redis (Testcontainers) | Fast (20ms) | Testcontainers for Redis |

## Database Integration Tests

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

describe('PostgresOrderRepository', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repo: PostgresOrderRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);
    repo = new PostgresOrderRepository(pool);
  }, 60000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE orders, order_items CASCADE');
  });

  it('persists new order', async () => {
    const order = Order.create('cust-1', [
      new OrderItem('prod-1', new Money(10, 'USD'), 2),
    ]);
    await repo.save(order);
    const found = await repo.findById(order.id);
    expect(found).not.toBeNull();
    expect(found?.totalAmount).toEqual(new Money(20, 'USD'));
  });

  it('returns null for nonexistent order', async () => {
    const found = await repo.findById(OrderId.generate());
    expect(found).toBeNull();
  });

  it('handles concurrent saves correctly', async () => {
    const order = Order.create('cust-1', [new OrderItem('p1', new Money(5, 'USD'), 1)]);
    await Promise.all([
      repo.save(order),
      repo.save(order),
    ]);
    const found = await repo.findById(order.id);
    expect(found).not.toBeNull();
  });
});
```

## External API Integration Tests

```typescript
import { WireMockServer } from 'wiremock';

describe('PaymentGatewayClient', () => {
  let wiremock: WireMockServer;
  let client: PaymentGatewayClient;

  beforeAll(async () => {
    wiremock = await WireMockServer.create();
    await wiremock.start();
    client = new PaymentGatewayClient(wiremock.url());
  });

  afterAll(async () => {
    await wiremock.stop();
  });

  beforeEach(async () => {
    await wiremock.resetMappings();
  });

  it('successfully processes payment', async () => {
    await wiremock.stubFor({
      method: 'POST',
      url: '/charge',
      request: {
        bodyPatterns: [{ equalToJson: { amount: 100, currency: 'USD' } }],
      },
      response: {
        status: 200,
        jsonBody: { transactionId: 'txn_123', status: 'success' },
      },
    });

    const result = await client.charge(100, 'USD');
    expect(result.transactionId).toBe('txn_123');
    expect(result.status).toBe('success');
  });

  it('handles payment declined', async () => {
    await wiremock.stubFor({
      method: 'POST',
      url: '/charge',
      response: {
        status: 402,
        jsonBody: { error: 'card_declined', message: 'Card declined' },
      },
    });

    await expect(client.charge(100, 'USD')).rejects.toThrow('Payment declined');
  });

  it('retries on 5xx errors', async () => {
    let attempt = 0;
    await wiremock.stubFor({
      method: 'POST',
      url: '/charge',
      response: (request) => {
        attempt++;
        if (attempt <= 2) return { status: 503 };
        return { status: 200, jsonBody: { transactionId: 'txn_456', status: 'success' } };
      },
    });

    const result = await client.charge(100, 'USD');
    expect(result.transactionId).toBe('txn_456');
    expect(attempt).toBe(3); // 2 retries + 1 success
  });

  it('maps 400 validation errors', async () => {
    await wiremock.stubFor({
      method: 'POST',
      url: '/charge',
      response: {
        status: 400,
        jsonBody: { error: 'invalid_amount', message: 'Amount must be positive' },
      },
    });

    await expect(client.charge(-1, 'USD')).rejects.toThrow('Validation error');
  });
});
```

## Message Queue Integration Tests

```typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';

describe('OrderEventConsumer with Kafka', () => {
  let kafka: StartedKafkaContainer;
  let producer: KafkaProducer;
  let consumer: OrderEventConsumer;

  beforeAll(async () => {
    kafka = await new KafkaContainer('confluent:7.6').start();
    producer = new KafkaProducer(kafka.getBootstrapServers());
    consumer = new OrderEventConsumer(
      new InventoryService(new InMemoryInventoryRepository()),
      new EmailService(new InMemoryEmailRepository()),
    );
    await producer.connect();
  }, 120000);

  afterAll(async () => {
    await producer.disconnect();
    await kafka.stop();
  });

  it('consumes order placed event and reserves inventory', async () => {
    const receivedEvents: any[] = [];
    await consumer.start(async (event) => {
      receivedEvents.push(event);
    });

    await producer.publish('orders', {
      eventType: 'OrderPlaced',
      data: { orderId: 'ord-1', items: [{ productId: 'p1', quantity: 1 }] },
    });

    await delay(5000);
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].data.orderId).toBe('ord-1');
  });
});
```

## Testcontainers Configuration

```typescript
// Shared container setup for test suites
class TestDatabase {
  private static container: StartedPostgreSqlContainer;
  private static pool: Pool;

  static async start(): Promise<void> {
    if (this.pool) return; // Reuse across test files

    this.container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    this.pool = new Pool({
      connectionString: this.container.getConnectionUri(),
      max: 20,
    });

    await this.runMigrations();
  }

  static async stop(): Promise<void> {
    await this.pool?.end();
    await this.container?.stop();
  }

  static getPool(): Pool {
    return this.pool;
  }

  static async truncateAll(): Promise<void> {
    const tables = await this.pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    for (const { tablename } of tables.rows) {
      await this.pool.query(`TRUNCATE TABLE ${tablename} CASCADE`);
    }
  }
}
```

## Test Data Fixtures

```typescript
// Reusable test fixtures
class OrderFixtures {
  static validOrder(): CreateOrderCommand {
    return {
      customerId: 'cust-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress: {
        street: '123 Test St',
        city: 'Testville',
        zip: '12345',
      },
    };
  }

  static invalidOrder(): CreateOrderCommand {
    return { customerId: '', items: [] };
  }

  static persistedOrder(overrides: Partial<Order> = {}): Order {
    return Order.create(
      overrides.customerId || 'cust-1',
      overrides.items || [new OrderItem('p1', new Money(10, 'USD'), 1)],
    );
  }
}
```

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Use Testcontainers, not in-memory substitutes | Real behavior, catches production issues |
| Truncate between tests, not drop schema | Faster, maintains schema state |
| Parallel test execution per container | Separate containers prevent interference |
| Use factories/builders for test data | Reduces duplication, improves readability |
| Test error paths as thoroughly as success | Covers production failure scenarios |
| Use WireMock for external APIs | Fast, deterministic, reproducible |
| Test transactional boundaries | Verify commit and rollback behavior |
| Clean up containers in global teardown | Prevent resource leaks in CI |
