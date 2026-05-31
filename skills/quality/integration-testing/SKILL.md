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
