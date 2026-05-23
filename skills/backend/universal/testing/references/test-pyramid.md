# Test Pyramid

## Structure
```
         /\
        /e2e\          5-10 per service
       /------\
      /integr.\        1-2 per adapter
     /----------\
    / unit tests \     Cover all domain + application logic
   /--------------\
```

## Unit Tests
- **Scope**: Domain entities, value objects, domain services, use case logic
- **Dependencies**: None (mock repository interfaces)
- **Speed**: < 1ms per test
- **Naming**: `should_{expected}_when_{condition}`
- **Framework**: Jest, pytest, Go test, cargo test, JUnit
- **Coverage target**: 90%+ for domain, 70%+ for application services
- **Structure**: One test file per source file, mirror source tree

## Integration Tests
- **Scope**: Repository implementations, external API clients, message consumers
- **Dependencies**: Real database (testcontainers), real message broker
- **Speed**: < 100ms per test
- **Setup**: Use test lifecycle hooks for container management
- **Database**: Test per repository; truncate tables between tests, not recreate schema

## E2E Tests
- **Scope**: Critical user journeys through the full stack
- **Dependencies**: Real services (staging environment)
- **Speed**: < 10s per test
- **Number**: Keep under 10 per service
- **Tooling**: Playwright, Cypress, k6 for API-level E2E

## Testing Matrix

| Layer | What to test | What NOT to test |
|-------|-------------|------------------|
| Domain | Business rules, invariants, value object equality | Database, HTTP, framework behavior |
| Application | Use case orchestration, authz checks | Implementation details of adapters |
| Adapters | Request parsing, DB queries, external API mapping | Domain logic duplication |
| Framework | Middleware chain, error mapping | Routing mechanics (framework authors test this) |

## Contract Testing (Pact)
- Consumer-driven: consumer publishes expectations, provider verifies against real API
- Run in CI on both consumer and provider pipelines
- Store pacts in a shared repository or PactFlow

## Test Doubles Decision
- **Stub**: provide canned answers (for queries)
- **Mock**: verify expected interactions (for commands)
- **Fake**: lightweight working implementation (in-memory DB)
- **Dummy**: passed but never used (null objects)
- **Spy**: record calls for verification (assert on interaction count)

Prefer fakes and stubs over mocks for domain testing. Use mocks only for adapter boundaries.

## CI Integration
```
commit → lint → unit tests (3s) → build → integration tests (30s) → E2E (2min) → deploy
```
Fail fast: stop pipeline on unit test failure before running slower tests.
