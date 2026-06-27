---
name: quality-integration-testing
description: >
  Use when the user asks about integration testing, component testing, API testing, database testing, test containers, wiremock, contract testing, or service-level testing. Do NOT use for: unit testing (quality-unit-testing), E2E testing (quality-e2e-testing), or contract testing (quality-contract-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, integration-testing, phase-3]
---

# Integration Testing

## Purpose
Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and containerized infrastructure for realistic environments. This skill covers test architecture, container lifecycle management, data strategies, and CI integration.

## Agent Protocol

### Trigger
User mentions integration testing, component testing, API testing, database testing, TestContainers, WireMock, service-level testing, or inter-component verification.

### Input Context
- Components/services under test and their interaction patterns
- Infrastructure dependencies (databases, message queues, caches)
- External service integrations
- Existing test suite and coverage levels
- CI environment capabilities (Docker availability)

### Output Artifact
Integration test suite with containerized infrastructure, service virtualization, and CI configuration.

### Response Format
Structured integration test files with:
1. Container lifecycle management (start, wait, cleanup)
2. Test data setup and cleanup strategies
3. External service stubs/mocks
4. CI pipeline configuration with parallel execution

### Completion Criteria
- All component interactions tested with real (containerized) infrastructure
- External services simulated with WireMock or similar
- Database state management strategy defined (truncation, rollback, or fresh containers)
- CI integration configured with Docker-in-Docker and parallel execution
- Error paths tested (timeouts, failures, validation errors)

## Workflow

1. **Identify interaction points**: Map all component boundaries (database, API, message queue, external services)
2. **Select integration strategy**: For each dependency, decide real (containerized) vs simulated (WireMock). Use real for your own infrastructure, simulated for external services
3. **Configure containers**: Set up TestContainers with appropriate wait strategies, connection strings, and lifecycle hooks
4. **Design test data**: Create factory functions for test entities. Plan data setup and cleanup strategies
5. **Implement service stubs**: Configure WireMock/MockServer for external services based on contracts
6. **Write integration tests**: Structure with beforeAll (containers), beforeEach (data setup), test (AAA), afterEach (cleanup), afterAll (container stop)
7. **Test error paths**: Include timeouts, network failures, validation errors, auth failures, and resource exhaustion
8. **Optimize execution**: Parallelize container startup, share containers across suites, configure appropriate timeouts
9. **Integrate CI**: Configure Docker-in-Docker, pre-pull images, set generous timeouts, parallelize test execution
10. **Monitor flakiness**: Track flaky tests, investigate infrastructure-related failures, quarantine non-deterministic tests

## Architecture / Decision Trees

### Dependency Strategy Decision Tree

```
Is this dependency your own service/infrastructure?
├── YES → Use real (containerized) for testing
│   ├── Database → TestContainers (PostgreSQL, MySQL, etc.)
│   ├── Message queue → TestContainers (Kafka, RabbitMQ)
│   ├── Cache → TestContainers (Redis)
│   └── Object storage → TestContainers (MinIO)
└── NO → Is it a third-party external service?
    ├── YES → Simulate with WireMock (contract-based stubs)
    └── NO → Is it an infrastructure provider (AWS, GCP)?
        ├── YES → Use LocalStack or similar emulator
        └── NO → Is it a library with side effects?
            ├── YES → Mock at adapter boundary
            └── NO → Real implementation
```

### Container Lifecycle Decision Tree

```
How many test suites share this service?
├── One suite → Start/stop per suite (beforeAll/afterAll)
└── Multiple suites → Can they share?
    ├── YES → Singleton container pattern (shared across suites)
    └── NO → Start/stop per suite

Is state isolation critical?
├── YES → Fresh container per test class
└── NO → Data cleanup between tests (truncation)

Does CI support Docker?
├── YES → TestContainers with DinD
└── NO → Embedded services or mocked infrastructure
```

## Common Pitfalls

1. **In-memory database substitutes**: H2/SQLite are not PostgreSQL/MySQL — different SQL dialect, constraints, and transaction behavior. Always use the real database in a container
2. **No data cleanup**: Tests that leave data behind cause non-deterministic failures in subsequent tests. Implement truncation, delete-by-run-id, or fresh containers
3. **Hardcoded connection parameters**: Hardcoded ports, hosts, or credentials prevent parallel execution. Use dynamic ports and environment-aware configuration
4. **Missing wait strategies**: Tests that access containers before they're ready fail intermittently. Always use proper wait strategies (log message, HTTP health check, port listening)
5. **Over-mocking external services**: Stubbing every possible response creates brittle tests that don't reflect real behavior. Use contracts to define stubs
6. **Ignoring container startup time**: Not setting generous beforeAll timeouts causes test failures in CI. Set timeout to 120s+ for container startup
7. **Testing with production data**: Risk of data corruption, compliance violations, and non-reproducible failures
8. **Shared state across parallel tests**: Multiple workers accessing the same database cause conflicts. Use isolated databases or schemas per worker
9. **No error path testing**: Only testing happy paths misses timeouts, retries, circuit breakers, and validation failures
10. **Resource leaks**: Not stopping containers, closing connections, or cleaning up temp files after tests

## Best Practices

1. Always use real (containerized) databases, not in-memory substitutes
2. Use TestContainers for container lifecycle management with proper wait strategies
3. Mock external services at the HTTP boundary using WireMock with contract-based stubs
4. Clean database state between tests (truncation is preferred for most cases)
5. Set generous timeouts for container startup (120s+ in CI)
6. Start containers in parallel using Promise.all for multi-service tests
7. Use environment-aware configuration (local vs CI) for connection strings
8. Test error paths as thoroughly as happy paths
9. Reuse containers across test suites for speed, but isolate state per test
10. Monitor flakiness and fix non-deterministic tests immediately

## Compared With

| Aspect | Integration Testing | Unit Testing | E2E Testing |
|--------|-------------------|-------------|-------------|
| Scope | Component interactions | Single module | Full user workflow |
| Dependencies | Real (containerized) | Mocked | Real (full system) |
| Speed | Seconds to minutes | Milliseconds | Minutes |
| Confidence | High (real infra) | Low (isolated) | Very High |
| Debugging | Medium | Easy | Hard |
| Infrastructure | Docker/containers | None | Full environment |
| When | After unit tests | Every commit | Pre-release |

## Performance Considerations

- Container startup: 30-60s per container. Start in parallel, reuse across suites
- Database migration: 5-30s per suite. Run once per suite, not per test
- Data cleanup: Truncation (100ms) vs fresh container (30s). Choose based on isolation needs
- Test execution: Aim for < 15 minutes per suite. Use parallel workers, each with its own database
- CI resources: Docker-in-Docker requires privileged mode or dedicated runners. Plan resource allocation
- Network: Container-to-container communication is fast (< 1ms). External service calls add latency

## Integration Test Examples

### Python + TestContainers — Database Integration Test
```python
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text

@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as pg:
        engine = create_engine(pg.get_connection_url())
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL
                )
            """))
        yield pg

@pytest.fixture
def db(postgres_container):
    engine = create_engine(postgres_container.get_connection_url())
    yield engine
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))

class TestUserRepository:
    def test_create_user(self, db):
        with db.begin() as conn:
            result = conn.execute(
                text("INSERT INTO users (email, name) VALUES (:email, :name) RETURNING id"),
                {"email": "test@example.com", "name": "Test User"},
            )
            user_id = result.scalar()
        assert user_id is not None

    def test_find_user_by_email(self, db):
        with db.begin() as conn:
            conn.execute(
                text("INSERT INTO users (email, name) VALUES (:email, :name)"),
                {"email": "find@example.com", "name": "Find Me"},
            )
        with db.begin() as conn:
            result = conn.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": "find@example.com"},
            )
            user = result.fetchone()
        assert user is not None
        assert user.name == "Find Me"

    def test_email_uniqueness(self, db):
        with db.begin() as conn:
            conn.execute(
                text("INSERT INTO users (email, name) VALUES (:email, :name)"),
                {"email": "dup@example.com", "name": "First"},
            )
        with pytest.raises(Exception):
            with db.begin() as conn:
                conn.execute(
                    text("INSERT INTO users (email, name) VALUES (:email, :name)"),
                    {"email": "dup@example.com", "name": "Second"},
                )
```

### Java + TestContainers + WireMock — Service Integration Test
```java
@SpringBootTest
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static WireMockContainer wiremock = new WireMockContainer("wiremock/wiremock:3.5.4");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("payment.service.url", () -> "http://" + wiremock.getHost() + ":" + wiremock.getMappedPort(8080));
    }

    @Autowired
    private OrderService orderService;

    @Test
    void shouldCreateOrderWhenPaymentSucceeds() {
        stubFor(post(urlEqualTo("/api/payments"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(""{"id": "pay_123", "status": "confirmed"}"")));

        Order order = orderService.placeOrder(customerId, cartItems);
        assertThat(order.getStatus()).isEqualTo("CONFIRMED");
        assertThat(order.getPaymentId()).isEqualTo("pay_123");
    }
}
```

### TypeScript + TestContainers — Message Queue Integration Test
```typescript
import { GenericContainer } from "testcontainers";
import { Kafka } from "kafkajs";

describe("Order Event Publisher", () => {
  let kafkaContainer: StartedTestContainer;
  let kafka: Kafka;

  beforeAll(async () => {
    kafkaContainer = await new GenericContainer("confluentinc/cp-kafka:7.6.0")
      .withExposedPorts(9093)
      .withEnvironment({
        KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9093",
      })
      .start();
    kafka = new Kafka({
      clientId: "test",
      brokers: [`localhost:${kafkaContainer.getMappedPort(9093)}`],
    });
  }, 120000);

  afterAll(async () => {
    await kafkaContainer.stop();
  });

  it("should publish order created event", async () => {
    const producer = kafka.producer();
    const consumer = kafka.consumer({ groupId: "test" });
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: "order-events" });

    const messages: any[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        messages.push(JSON.parse(message.value!.toString()));
      },
    });

    await publisher.publishOrderCreated({ orderId: "ord_123" });
    await new Promise((r) => setTimeout(r, 1000));

    expect(messages.length).toBe(1);
    expect(messages[0].orderId).toBe("ord_123");
  });
});
```

## CI Integration for Integration Tests

```yaml
name: Integration Tests
on: pull_request
jobs:
  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      matrix:
        shard: [1, 2]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Pre-pull container images
        run: |
          docker pull postgres:16-alpine
          docker pull confluentinc/cp-kafka:7.6.0
          docker pull wiremock/wiremock:3.5.4
      - name: Run integration tests
        run: npx vitest run --config vitest.integration.config.ts --shard=${{ matrix.shard }}/2
        env:
          CI: true
          TESTCONTAINERS_RYUK_DISABLED: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: integration-logs-${{ matrix.shard }}
          path: logs/
```

## Integration Testing Anti-Patterns

### Anti-Pattern: In-Memory Database Substitutes
Using H2 for PostgreSQL or SQLite for MySQL. In-memory substitutes have different SQL dialects, constraint behaviors, and transaction semantics. Tests pass with H2 but fail with PostgreSQL in production. Always use the real database in a container.

### Anti-Pattern: No Wait Strategy
Accessing containers before they're ready produces non-deterministic failures. Never use fixed `Thread.sleep()`. Use predicate-based wait strategies: wait for log message ("database system is ready to accept connections"), HTTP health check, or port listening.

### Anti-Pattern: Shared Database State
Tests that leave data behind cause failures in subsequent tests. Use truncation between tests (`TRUNCATE ... CASCADE`). For fully isolated tests, use a fresh container per test class. Never rely on test ordering.

### Anti-Pattern: Over-Mocking External Services
Mocking at the HTTP client level (axios mocks, fetch mocks) instead of the network level. WireMock operates at the HTTP protocol level and validates real request/response contracts. HTTP client mocks are brittle and miss protocol-level issues.

### Anti-Pattern: No Error Path Tests
Testing only the happy path (successful database write, successful API response) misses the majority of integration issues. Every happy path must have a corresponding error path: network timeout, HTTP 500, database constraint violation, authentication failure.

### Anti-Pattern: Hardcoded Connection Parameters
Hardcoded ports, hosts, or credentials prevent parallel test execution. Use `withExposedPorts` for dynamic port mapping. Use `@DynamicPropertySource` (Spring) or environment variables to inject connection parameters.

## Integration Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | No integration tests | Unit tests only or manual integration testing, no containerized infrastructure |
| 2: Defined | Basic integration tests | TestContainers for database, basic WireMock stubs, sequential execution, some error path testing |
| 3: Managed | Structured integration suite | Containerized databases + message queues + caches, WireMock for all external services, parallel execution, CI integration with pre-pulled images |
| 4: Measured | Comprehensive integration coverage | Error path parity with happy path, migration testing (forward + rollback), performance-sensitive assertions, < 5% flakiness rate |
| 5: Optimized | Integration as release gates | All integration paths covered, chaos-resilient tests (network partition, resource exhaustion), automatic container layer caching, self-healing connection handling |

## Performance Considerations

- Container startup: 30-60s per container. Start in parallel for multi-service tests.
- Database migration: 5-30s per suite. Run once per suite (beforeAll), not per test.
- Data cleanup: truncation (50-200ms) vs fresh container (30s). Choose based on isolation needs.
- Test execution: target < 15 minutes per suite. Parallel workers each get isolated database.
- CI resources: Docker-in-Docker requires privileged mode or dedicated runners. Use `TESTCONTAINERS_RYUK_DISABLED: true` in CI.
- Container image caching: pre-pull all images in CI to avoid network timeouts. Use `docker pull` in a setup step.
- WireMock startup: < 3s per instance. Reuse across tests within a suite.

## Rules
1. Every integration test must use real (containerized) databases — no H2, SQLite, or in-memory substitutes
2. External services must be simulated using WireMock or MockServer, never mocked at the HTTP client level
3. Database state must be cleaned between tests. Use truncation, delete-by-run-id, or rollback — never rely on test ordering
4. Container waiting must use predicate-based wait strategies (log messages, health checks) — never fixed sleep
5. beforeAll timeouts must be at least 120 seconds for container startup in CI environments
6. Integration tests must not share state across test suites — use isolated databases, topics, or containers
7. Every happy path test must have a corresponding error path test (timeout, 500, validation failure)
8. Test data must use factories with generated values — never use production data or hardcoded IDs
9. Containers must be stopped in afterAll — resource leaks are not acceptable
10. External service mocks must match at least the contract (URL, method, headers, response shape)
11. Integration tests must not access production endpoints or use production credentials
12. Container images must be pre-pulled in CI to prevent network timeouts during test execution
13. Integration test configuration must be environment-aware (local/CI/staging) with no hardcoded parameters
14. Flaky integration tests (non-deterministic) must be quarantined within 24 hours
15. Migration tests must verify both forward and rollback scenarios
16. Performance-sensitive integration tests must include timing assertions with 2x safety margins
17. Parallel database isolation: each worker gets a separate database schema or container
18. WireMock stubs must be verified (at least one request matched) in afterEach

## References
- references/api-testing.md — API Integration Testing Patterns
- references/containerized-testing.md — Containerized Testing
- references/contract-driven.md — Contract-Driven Integration Testing
- references/database-testing.md — Database Integration Testing
- references/integration-testing-advanced.md — Integration Testing Advanced Topics
- references/integration-testing-architecture.md — Integration Testing Architecture and System Design
- references/integration-testing-fundamentals.md — Integration Testing Fundamentals
- references/integration-testing-strategy.md — Integration Testing Strategy and Workflow Patterns
- references/messaging-testing.md — Message Queue Integration Testing
- references/test-containers.md — TestContainers Patterns

## Handoff
After integration testing, hand off to:
- `quality-e2e-testing` — for end-to-end validation of complete workflows
- `quality-contract-testing` — for formal contract verification between services
- `quality-regression-testing` — for regression suite updates
- `quality-smoke-testing` — for BVT smoke test inclusion
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.
## Architecture Decision Trees

### Integration Test Scope
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Dependency type | Internal microservice → Real instance | External API → Mock/stub | Control over service, cost, reliability |
| Database strategy | TestContainers (real DB in container) | In-memory H2/SQLite | Query compatibility, SQL dialect features |
| Message queue | Real broker (TestContainers Kafka) | Mock producer/consumer | Message ordering needs, throughput testing |
| Network complexity | WireMock for HTTP stubs | TestContainer for full service | Need for realistic network behavior |

### Test Granularity
- Single service handling → Test controller + service + repository with real DB
- Two-service interaction → Test REST/gRPC calls between them
- Multi-service workflow → Test orchestration through message queue
- External dependency → Test with WireMock + verify contract