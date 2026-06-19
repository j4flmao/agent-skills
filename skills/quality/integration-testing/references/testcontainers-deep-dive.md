# Testcontainers Deep Dive

## What is Testcontainers
Testcontainers is a library that provides disposable Docker containers for integration testing. It supports Java, Python, Node.js, Go, .NET, and Rust. Containers are started before tests and torn down after, providing production-like dependencies without managing infrastructure.

## Supported Containers
- **Databases**: PostgreSQL, MySQL, MariaDB, MSSQL, Oracle, CockroachDB, Yugabyte
- **NoSQL**: MongoDB, Redis, Elasticsearch, Neo4j, Cassandra, DynamoDB Local
- **Message Queues**: Kafka, Redpanda, RabbitMQ, ActiveMQ, Pulsar
- **Service Virtualization**: WireMock, LocalStack (AWS), Azurite (Azure)
- **Browser**: Selenium, Playwright
- **Custom**: Any Docker image via `GenericContainer`

## Python Example
```python
from testcontainers.postgres import PostgresContainer
from testcontainers.kafka import KafkaContainer
from testcontainers.redis import RedisContainer

class TestIntegration:
    @pytest.fixture(scope="class")
    def postgres(self):
        with PostgresContainer("postgres:16-alpine") as pg:
            yield pg

    @pytest.fixture(scope="class")
    def kafka(self):
        with KafkaContainer("confluentinc/cp-kafka:latest") as kc:
            yield kc
```

## Node.js Example
```javascript
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { KafkaContainer } = require('@testcontainers/kafka');

describe('Order Repository', () => {
  let container;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .start();
    process.env.DATABASE_URL = container.getConnectionUri();
  }, 30000);  // 30s timeout for container startup

  afterAll(async () => {
    await container.stop();
  });

  it('should create and find an order', async () => {
    const repo = new OrderRepository();
    const order = await repo.create({ customerId: 'c1', total: 99.99 });
    const found = await repo.findById(order.id);
    expect(found.customerId).toBe('c1');
  });
});
```

## Performance Tips
- Reuse containers across test suites with `scope="session"` or `@ClassRule`
- Use `tmpfs` for database storage (in-memory, faster, auto-cleans)
- Pre-pull container images in CI to avoid download time
- Use Ryuk container for automatic cleanup (prevents orphan containers)
- Set generous timeouts for first container start (pulls images)

## Key Points
- Testcontainers provides disposable, production-like test infrastructure
- Supports databases, message queues, and service virtualization
- Reuse containers across test suites for performance
- Use tmpfs for database speed
- Pre-pull Docker images in CI pipeline
