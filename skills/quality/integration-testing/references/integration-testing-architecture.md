# Integration Testing: Architecture and System Design

## Overview

Integration testing verifies that components work together correctly. Unlike unit tests which isolate individual modules, integration tests exercise real interactions between components — databases, message queues, HTTP services, and other infrastructure. This reference covers the architectural patterns, decision frameworks, and system design considerations for building robust integration test suites.

## Core Architecture Concepts

### Integration Test System Architecture

An integration test system comprises several interconnected layers:

```
Test Orchestration Layer
  ├── Test runner (Vitest, JUnit, pytest)
  ├── Lifecycle management (beforeAll/afterAll)
  └── Parallel execution coordination

Infrastructure Layer
  ├── Container management (TestContainers)
  ├── Service virtualization (WireMock, MockServer)
  └── Network isolation (Docker networks)

Data Layer
  ├── Test data setup (seeders, factories)
  ├── Database state management
  └── Cleanup strategies

Verification Layer
  ├── Response validation (assertions)
  ├── Contract verification
  └── State inspection (database queries, message inspection)
```

### The Integration Test Boundary

Integration tests sit between unit tests and E2E tests in the test pyramid:

```
       /\
      /  \         E2E (whole system, slow)
     / I  \        Integration (component interactions, medium)
    / I I I\
   / U U U U \     Unit (isolated, fast)
  /___________\
```

The key architectural distinction: integration tests verify that components work together correctly, using real (or realistically simulated) infrastructure.

### Service Virtualization Architecture

Service virtualization replaces real external services with simulated versions:

```
System Under Test → Service Adapter → WireMock/MockServer
                                          ↓
                                   Stubbed Response (from contract)
```

The virtualization layer must:
- Match request patterns (URL, method, headers, body)
- Return realistic responses (status codes, headers, body)
- Simulate error conditions (timeouts, 500s, connection resets)
- Record interactions for verification

## Architecture Decision Trees

### Decision 1: Real vs Simulated Dependencies

| Dependency Type | Integration Strategy | Rationale |
|----------------|---------------------|-----------|
| Your database | Real (TestContainers) | SQL dialects, constraints, transactions are hard to fake |
| Third-party API | Simulated (WireMock) | Cost, rate limits, unavailability in test env |
| Message queue | Real (embedded/container) | Delivery guarantees, ordering, exactly-once semantics |
| Cache (Redis) | Real (TestContainers) | Cache behavior (eviction, TTL) differs by implementation |
| Object storage | Real (MinIO) or cloud emulator | API compatibility, eventual consistency |
| Auth provider | Simulated (test tokens) | Security, credential management |
| Search engine | Real (ES/MeiliSearch container) | Query behavior, indexing differences |

**Decision rule:** Use real infrastructure via containers for your own databases and infrastructure. Use simulated services for external systems you don't control.

### Decision 2: Container Lifecycle Strategy

| Strategy | Startup Time | Isolation | Maintenance |
|----------|-------------|-----------|-------------|
| Per test class | 30-60s | Complete | Simple |
| Per test suite | 30-60s (shared) | Per suite | Moderate |
| Per worker process | 30-60s per worker | Per worker | Complex |
| Global singleton | Once | Shared (state leaks) | Simple but risky |
| Docker Compose | 60-120s | Complete | Complex |

**Decision rule:** Use per-test-suite for most projects (balances isolation and speed). Use global singleton pattern only when tests are read-only. Use Docker Compose for multi-service integration tests.

### Decision 3: Database State Management

| Strategy | Speed | Isolation | Complexity |
|----------|-------|-----------|------------|
| Transaction rollback | Fastest | Per-test | Low |
| Truncate tables | Moderate | Complete | Low |
| Delete by run ID | Fast | Complete | Medium |
| Fresh container per class | Slow | Complete | Low |
| Snapshot restore | Moderate | Complete | High |

**Decision rule:** Use transaction rollback when tests don't need to verify commit behavior. Use truncation for read-committed scenarios. Use fresh containers for maximum isolation (slow but safe).

## Implementation Strategies

### Test Structure for Integration Tests

Integration tests follow the same AAA pattern as unit tests but add infrastructure setup:

```typescript
describe('OrderService Integration', () => {
  let container: StartedPostgreSqlContainer
  let repository: OrderRepository
  let service: OrderService

  // Suite-level setup: start containers once
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start()
    const pool = new Pool({ connectionString: container.getConnectionUri() })
    await runMigrations(pool)
    repository = new OrderRepository(pool)
    service = new OrderService(repository)
  }, 120_000)

  // Test-level setup: clean state
  beforeEach(async () => {
    await repository.truncateAll()
  })

  // Suite-level teardown: stop containers
  afterAll(async () => {
    await container.stop()
  })

  it('should persist and retrieve order', async () => {
    // Arrange
    const order = new Order('ORD-001', 150.00, 'PENDING')

    // Act
    await service.createOrder(order)
    const retrieved = await service.getOrder('ORD-001')

    // Assert
    expect(retrieved).toBeDefined()
    expect(retrieved.total).toBe(150.00)
    expect(retrieved.status).toBe('PENDING')
  })
})
```

### Mocking External Services Strategy

Use WireMock for third-party HTTP services with contract-based stubbing:

```
Example: Payment Gateway Integration
  ┌──────────────┐    HTTP     ┌──────────────┐
  │ OrderService │ ──────────→ │ WireMock      │
  │  (SUT)       │ ←────────── │  (Virtual)    │
  └──────────────┘    Response └──────────────┘
                                ↓
                          Contract definition
                          (from payment provider docs
                           or consumer-driven pact)

Stub categories:
  - Happy path: 200 OK with valid body
  - Error path: 400/500 with error body
  - Timeout: Delayed response (> timeout threshold)
  - Network error: Connection refused/reset
```

## Integration Patterns

### Database Integration Pattern

```
Test Database:
  - Always use a real database (containerized)
  - Never use H2 or SQLite as PostgreSQL substitute
  - Run migrations before each test suite
  - Clean data between tests (truncation)
  - Use test-specific database names

Connection management:
  - Connection pool with limited size (2-5 connections)
  - Close connections in afterAll
  - Test connection timeout and pool exhaustion
```

### Messaging Integration Pattern

```
Test Message Queue:
  - Use embedded or containerized broker
  - Create unique topics/queues per test run
  - Test both produce and consume
  - Test retry and dead letter paths
  - Test ordering guarantees

Pattern:
  Producer → Topic/Queue → Consumer
     ↓                        ↓
  Assert send success      Assert receive + process
```

### REST API Integration Pattern

```
Test Framework: supertest (Node.js), REST-assured (Java)
  - Start application with test configuration
  - Send real HTTP requests
  - Assert response status, headers, body
  - Include auth tokens in headers
  - Test database state after mutation endpoints
```

## Performance Optimization

### Integration Test Speed

| Bottleneck | Typical Impact | Solution |
|------------|---------------|----------|
| Container start | 30-60s | Reuse across suites, parallel startup |
| Database migration | 5-30s | Run once per suite, not per test |
| Data setup | 100ms-5s per test | Minimize setup, use factories |
| Network calls | 10-100ms per call | Mock external services |
| Teardown | 100ms-1s per test | Batch cleanup operations |

### Parallel Execution Strategy

```typescript
// vitest.config.ts — integration test optimization
export default defineConfig({
  test: {
    // Use forks for process-level isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        // Ensure each worker gets its own resources
        singleFork: false,
      },
    },
    // Max parallel containers
    maxConcurrency: 2,  // Limited by container resources
  },
})
```

## Security Considerations

### Test Data Security

- Never use production data in integration tests
- Generate synthetic data with factories
- Mask or obfuscate any data that resembles PII
- Use test-specific credentials and API keys
- Rotate test secrets regularly
- Audit test database for sensitive data

### Network Isolation

Integration tests must not access production:
- Use dedicated test environment (staging)
- Container networking for isolation
- Block outbound network access when possible
- Validate that tests connect to test, not production endpoints

## Operational Excellence

### Environment Management

```
Multiple environments for integration testing:

Developer workstation:
  - Local containers (TestContainers)
  - Fast feedback (< 5 min suite)
  - Limited service coverage

CI pipeline:
  - Shared container infrastructure
  - Moderate speed (< 15 min suite)
  - Full service coverage

Staging:
  - Real infrastructure
  - Slower (environment setup)
  - Smoke integration tests

Production-like:
  - Full replica of production
  - Used for pre-release validation
  - All integration scenarios
```

### CI Integration Strategy

```yaml
integration-tests:
  runs-on: ubuntu-latest
  services:
    docker: docker:dind
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx vitest --config vitest.integration.config.ts
    - name: Upload test report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        path: reports/integration/
```

## Testing Strategy

### What to Integration Test

| Component | Example | Test? |
|-----------|---------|-------|
| Repository | Database queries | Always |
| API endpoint | HTTP handler | Always |
| Message consumer | Queue processing | Always |
| External integration | Third-party API | Simulated, then contract |
| Batch job | Scheduled processing | Usually |
| Cache layer | Redis interaction | Usually |
| File processing | Upload/download | Usually |

### Integration Test Coverage Goals

- All repository methods tested against real database
- All API endpoints tested with real HTTP
- All message consumers tested with real broker
- All external integrations tested with simulated service + contract verification
- Coverage of error paths: timeouts, retries, circuit breakers, validation failures

## Common Pitfalls

1. **Using in-memory databases as substitutes**: H2 is not PostgreSQL — different SQL, constraints, behaviors
2. **No cleanup between tests**: Shared state causes non-deterministic failures
3. **Over-mocking external services**: Too much mocking defeats the purpose of integration testing
4. **Ignoring container startup time**: Tests time out because containers aren't ready
5. **Testing with production data**: Risk of data corruption and compliance violations
6. **Brittle assertions**: Asserting exact data that changes per test run
7. **Missing error path tests**: Only testing happy paths misses the most common integration issues
8. **Orchestration complexity**: Integration tests that require too much setup become maintenance burden
9. **Flaky tests from shared infrastructure**: Tests that depend on shared databases or services

## Key Takeaways

- Integration tests use real (containerized) infrastructure, not mocks or in-memory substitutes
- Use TestContainers for managing container lifecycle in tests
- Mock external services you don't control; use real infrastructure for your own services
- Each test must clean up after itself — no shared mutable state across tests
- Container startup is the slowest part: reuse across suites, start in parallel
- Test error paths: timeouts, retries, validation failures, network errors
- Use transaction rollback for speed, truncation for isolation, fresh containers for maximum isolation
- Never use production data — generate synthetic test data with factories
- Run migrations once per suite, not once per test
- Combine integration tests with contract tests for external dependency verification
