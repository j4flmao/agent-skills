---
name: quality-integration-testing
description: >
  Use when the user asks about integration testing, component testing, API testing, database testing, test containers, wiremock, contract testing, or service-level testing. Do NOT use for: unit testing (quality-unit-testing), E2E testing (quality-e2e-testing), or contract testing (quality-contract-testing).
version: "1.0.0"
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
Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and test containers for realistic environments.

## Workflow

### Test Pyramid (Integration Layer)
```
     /\           E2E (slow, brittle, high confidence)
    /  \
   /    \         Integration (medium, balanced)
  /______\
 /________\       Unit (fast, reliable, low confidence)
```

### Integration Test Types
| Type | What It Tests | Tooling |
|------|---------------|---------|
| API test | HTTP endpoints, request/response | Supertest, REST-assured |
| Database test | Repositories, queries, migrations | TestContainers, H2 |
| Message test | Queue producers/consumers | Embedded broker, TestContainers |
| External service | HTTP client with real calls | WireMock, MockServer |

### TestContainers Pattern
```java
@Testcontainers
class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Test
    void shouldSaveAndFindUser() {
        // Uses real PostgreSQL, cleaned up automatically
    }
}
```

### Integration Test Best Practices
- Use real databases (containerized), not in-memory substitutes
- Clear data between tests (truncate tables, not drop)
- Test error paths: network timeouts, auth failures, validation errors
- Keep tests independent — shared state causes flakiness
- Use dedicated test configuration, not production config

## References
- `references/api-testing.md` — API integration testing patterns
- `references/test-containers.md` — TestContainers setup and patterns
- `references/external-services.md` — Mocking external services with WireMock
