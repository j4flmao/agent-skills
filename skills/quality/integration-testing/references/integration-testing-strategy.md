# Integration Testing: Strategy and Workflow Patterns

## Overview

This reference provides tactical guidance for planning, executing, and maintaining integration test strategies. It covers environment management, test data strategies, container lifecycle decisions, and workflow patterns that ensure integration tests provide maximum value with minimum maintenance burden.

## Core Architecture Concepts

### Integration Test Strategy Architecture

A complete integration test strategy spans multiple dimensions:

```
Environment Dimension:
  ┌─────────────┬──────────────┬──────────────┬──────────────┐
  │ Developer   │ CI Pipeline  │ Staging      │ Production-  │
  │ Workstation │              │              │ like         │
  ├─────────────┼──────────────┼──────────────┼──────────────┤
  │ Local       │ Shared       │ Persistent   │ Persistent   │
  │ containers  │ containers   │ infra        │ infra        │
  ├─────────────┼──────────────┼──────────────┼──────────────┤
  │ Fast        │ Moderate     │ Slow         │ Slow         │
  │ (5 min)     │ (15 min)     │ (30 min)     │ (30 min)     │
  └─────────────┴──────────────┴──────────────┴──────────────┘

Coverage Dimension:
  Database → Message Queue → API → External Service → File System

Depth Dimension:
  Smoke Integration → Core Integration → Full Integration → Contract Verification
```

### Test Data Architecture

Integration test data flows through multiple systems:

```
Data Flow:
  Factory (generate) → Seeder (insert) → Test (use) → Asserter (verify) → Cleaner (remove)

Data Categories:
  - Baseline: Always-present data (configs, reference codes)
  - Scenario-specific: Created per test case
  - Generated: Factory-created with random but valid values
  - Seeded: Pre-loaded for multi-step scenarios
```

### Environment Configuration Architecture

Configuration must be environment-aware:

```typescript
// config/integration.ts
interface IntegrationConfig {
  database: { host: string; port: number; name: string }
  messageBroker: { host: string; port: number }
  externalServices: Record<string, string>
  tempDirectory: string
  timeouts: { connection: number; operation: number }
}

const configs: Record<string, IntegrationConfig> = {
  local: {
    database: { host: 'localhost', port: 5432, name: 'test_' + process.env.USER },
    // ...
  },
  ci: {
    database: { host: 'postgres', port: 5432, name: 'ci_' + process.env.CI_JOB_ID },
    // ...
  },
}
```

## Architecture Decision Trees

### Decision Tree 1: Test Depth Selection

```
Is this a new feature?
├── YES → What's the integration surface?
│   ├── Database only → Repository integration tests
│   ├── API only → HTTP endpoint integration tests
│   ├── Message queue → Producer/consumer integration tests
│   └── Multiple surfaces → Full integration test suite
└── NO → Is this a bug fix?
    ├── YES → Write integration test that reproduces the bug
    └── NO → Is this a refactoring?
        ├── YES → Run existing integration tests
        └── NO → Consider if integration test needed
```

### Decision Tree 2: Container Management

```
How many services does this test need?
├── 1 service → Single container (direct start)
├── 2-3 services → Multiple containers (parallel start)
├── 4-6 services → Docker Compose (coordinated startup)
└── 7+ services → Consider if this should be an E2E test

How often do services change?
├── Never (stable) → Reuse container across suites
├── Occasionally → Per-suite containers
└── Frequently → Per-test containers (or E2E)
```

### Decision Tree 3: External Service Strategy

```
Do you control the external service?
├── YES → Use real instance (containerized)
└── NO → Can you use a sandbox/test account?
    ├── YES → Use sandbox with controlled test data
    └── NO → Is there a contract/API spec?
        ├── YES → Simulate with WireMock based on spec
        └── NO → Record and replay real traffic
```

## Implementation Strategies

### Database Integration Strategy

Strategy for testing database interactions:

```typescript
class DatabaseIntegrationStrategy {
  // Level 1: CRUD operations
  // Test that create, read, update, delete work correctly
  
  // Level 2: Query operations
  // Test complex queries, joins, aggregations, filtering
  
  // Level 3: Constraint enforcement
  // Test unique constraints, foreign keys, check constraints
  
  // Level 4: Transaction behavior
  // Test commit, rollback, isolation levels
  
  // Level 5: Migration compatibility
  // Test that schema migrations preserve data and query behavior
  
  // Level 6: Performance baselines
  // Test that query performance meets thresholds
}
```

### API Integration Strategy

Strategy for testing HTTP APIs:

```typescript
class ApiIntegrationStrategy {
  // Level 1: Endpoint contract
  // Test that each endpoint exists and returns correct status codes
  
  // Level 2: Request validation
  // Test that invalid requests return proper validation errors
  
  // Level 3: Authentication/Authorization
  // Test that auth is enforced and role-based access works
  
  // Level 4: Business logic
  // Test that the API triggers correct business operations
  
  // Level 5: Error handling
  // Test that errors (404, 500, timeout) return proper responses
  
  // Level 6: Pagination and filtering
  // Test list endpoints with query parameters
}
```

### Messaging Integration Strategy

Strategy for testing message queues:

```typescript
class MessagingIntegrationStrategy {
  // Level 1: Produce and consume
  // Test that a message sent is received by the consumer
  
  // Level 2: Message ordering
  // Test that messages are processed in correct order
  
  // Level 3: Retry and error handling
  // Test that transient errors trigger retries and permanent errors go to DLQ
  
  // Level 4: Idempotency
  // Test that duplicate messages are handled correctly
  
  // Level 5: Schema evolution
  // Test that new message schema is compatible with old consumers
  
  // Level 6: Throughput
  // Test that the system handles expected message volume
}
```

## Integration Patterns

### Test Environment Isolation Pattern

```
┌─────────────────────────────────────────────┐
│           CI Runner                          │
│  ┌───────────────────┐  ┌─────────────────┐ │
│  │ Test Worker 1     │  │ Test Worker 2    │ │
│  │ ┌───────────────┐ │  │ ┌───────────────┐│ │
│  │ │ Postgres      │ │  │ │ Postgres      ││ │
│  │ │ (port dynamic)│ │  │ │ (port dynamic) ││ │
│  │ └───────────────┘ │  │ └───────────────┘│ │
│  └───────────────────┘  └─────────────────┘ │
│  ┌───────────────────┐                       │
│  │ Docker Network    │                       │
│  └───────────────────┘                       │
└─────────────────────────────────────────────┘
```

### Predicate-Based Wait Strategy

Containers must be ready before tests run:

```typescript
async function waitForDatabase(container: StartedPostgreSqlContainer) {
  const maxRetries = 30
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new Client({ connectionString: container.getConnectionUri() })
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      return  // Database is ready
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error('Database did not become ready')
}
```

## Performance Optimization

### Container Startup Optimization

```
Strategy 1: Reuse containers
  - Start once per test suite (beforeAll)
  - Share across test files in the same worker
  - Risk: state leaks between test suites

Strategy 2: Parallel container startup
  - Start all containers concurrently (Promise.all)
  - Saves 30-60 seconds per suite
  - Requires sufficient Docker resources

Strategy 3: Lazy container startup
  - Only start containers when tests need them
  - Avoids starting unused services
  - Requires container availability tracking

Strategy 4: Image pre-pulling
  - Pull images before test execution
  - Avoids network wait during test startup
  - Works well with CI image caching
```

### Test Execution Optimization

| Technique | Speedup | Effort | Risk |
|-----------|---------|--------|------|
| Parallel test classes | N-cores | Low | Resource contention |
| Shared containers | 10-30s saved | Low | State leakage |
| Transaction rollback | 100-500ms/test | Low | Can't test commits |
| Selective test execution | Variable | Medium | Missing tests |
| Test suite sharding | N-shards | Medium | Shard imbalance |
| Cached container images | 10-30s saved | Low | Stale images |

## Security Considerations

### Credential Management

- Use test-only credentials with limited permissions
- Rotate test database passwords per CI run
- Never use production credentials in CI
- Store test secrets in CI secrets, not code
- Audit test database access logs

### Data Sanitization

Integration tests may generate data that resembles real data:
- Use clearly fake data (test-user-001, not real usernames)
- Mask any data that could identify real users
- Clean up test databases after each CI run
- Never persist test data beyond the test run

## Operational Excellence

### CI Pipeline Integration

```yaml
stages:
  - lint
  - unit-test
  - integration-test    # ← Integration tests here
  - e2e-test
  - deploy

integration-test:
  stage: integration-test
  services:
    - docker:dind
  script:
    # Pre-pull images
    - docker pull postgres:16
    - docker pull redis:7
    
    # Run integration tests
    - npx vitest --config vitest.integration.config.ts
    
    # Generate report
    - npx vitest --reporter=junit --outputFile=reports/integration.xml
  artifacts:
    reports:
      junit: reports/integration.xml
    paths:
      - reports/
```

### Test Health Monitoring

Monitor key metrics for integration test health:
- **Execution time trend**: Suite getting slower? Profile slow tests
- **Flakiness rate**: > 1% flakiness needs investigation
- **Container start failures**: Infrastructure issues
- **Data cleanup failures**: Tests leaving residue
- **Coverage gaps**: Untested integration points

## Testing Strategy

### Integration Test Prioritization

Prioritize integration tests by risk and impact:

```
P0 (Critical — always run):
  - Database CRUD for core entities
  - Main API endpoints
  - Primary message flows
  - Authentication/authorization

P1 (High — run on feature branch):
  - Secondary API endpoints
  - Error paths for P0
  - Database migrations
  - External service integrations

P2 (Medium — run nightly):
  - Performance baselines
  - Schema evolution scenarios
  - Batch processing flows
  - Edge case combinations

P3 (Low — run pre-release):
  - All error paths
  - Resource exhaustion scenarios
  - Security boundary testing
```

### Integration Test Data Lifecycle

```
Design Phase:
  - Identify data dependencies
  - Design factory functions
  - Plan cleanup strategies

Implementation Phase:
  - Create test data factories
  - Implement seeders
  - Set up cleanup hooks

Execution Phase:
  - Generate data per test
  - Assert data state
  - Clean up test data

Maintenance Phase:
  - Review data setup complexity
  - Optimize slow data setup
  - Remove unused factories
```

## Common Pitfalls

1. **In-memory database substitutes**: H2 for PostgreSQL, SQLite for MySQL — these have different SQL dialects, constraint behaviors, and isolation semantics
2. **State leakage**: Tests that modify shared database state without cleanup cause non-deterministic failures in subsequent tests
3. **Orchestration spaghetti**: Integration tests that require pages of setup code become unmaintainable
4. **Too many dependencies**: A test that depends on database + message queue + external API + file system is brittle and slow
5. **Ignoring async behavior**: Testing message queues without proper awaits leads to races in assertions
6. **Hardcoded ports/URLs**: Tests fail when run in parallel due to port conflicts
7. **No retry strategy**: Tests that fail due to transient infrastructure issues should be fixed, not retried
8. **Over-verification**: Asserting too many details (exact timestamps, auto-generated IDs) creates brittle tests
9. **Missing teardown**: Tests that leave data, containers, or connections behind cause resource leaks

## Key Takeaways

- Use a multi-level strategy: smoke integration (fast), core integration (medium), full integration (slow)
- Choose container strategy based on trade-offs: per-suite for speed, per-class for isolation
- Test data lifecycle: generate → seed → test → assert → clean — automate all five steps
- Prioritize integration tests: P0 on every commit, P1 on branches, P2 nightly, P3 pre-release
- Use parallel container startup and shared containers for performance
- Never use in-memory database substitutes — always use real containers
- Monitor execution time, flakiness, and container reliability as health metrics
- Clean up test data and containers after each run to prevent resource leaks
- Combine integration tests with contract tests for external dependencies
- Use transaction rollback for speed when commit behavior is not under test
