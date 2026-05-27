---
name: backend-testing
description: >
  Use this skill when the user says 'testing', 'unit test', 'integration test', 'e2e test', 'test coverage', 'mock', 'stub', 'test structure', 'what to test', or when writing or reviewing tests. This skill enforces: test pyramid (many unit, medium integration, few e2e), behavior testing (not implementation), test naming conventions (should_expected_when_condition), and mocking rules (mock at boundaries only). Applies to any testing framework (Jest, pytest, Go test, cargo test, JUnit). Do NOT use for: frontend testing, performance testing, or manual QA processes.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, testing, phase-2, universal]
---

# Backend Testing

## Purpose
Write tests that verify behavior, not implementation. Unit test domain logic. Integration test infrastructure adapters. E2E test critical journeys. Every test has one assertion per behavior.

## Agent Protocol

### Trigger
Exact user phrases: "testing", "unit test", "integration test", "e2e test", "test coverage", "mock", "stub", "test structure", "what to test", "write tests", "test plan".

### Input Context
Before activating, verify:
- The testing framework is known (Jest, pytest, Go test, cargo test, JUnit).
- The layer being tested is known (domain, application, infrastructure).
- The feature or module being tested is described.

### Output Artifact
No file output. Produces test plan as text.

### Response Format
Test plan:
```
## Test Plan: {feature}
| Layer | File | Scope | Tests |
|-------|------|-------|-------|
| Unit | {path} | {scope} | {n} |
| Integration | {path} | {scope} | {n} |
| E2E | {path} | {scope} | {n} |
```

Test code: show only the test function, no imports. Follow naming: should_{expected}_when_{condition}.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Test pyramid is balanced: many unit, fewer integration, few e2e.
- [ ] Every test has a single behavior assertion.
- [ ] Tests use user-facing queries, not implementation details.
- [ ] Mocks are used only at boundary interfaces (repository, external API).
- [ ] Integration tests use real infrastructure (testcontainers), not in-memory substitutes.
- [ ] Test names follow: should_{expected}_when_{condition}.
- [ ] No snapshot tests.
- [ ] No Thread.sleep() or setTimeout in tests.

### Max Response Length
Test plan: unlimited (table). Test code: 15 lines per test maximum.

## Workflow

### Step 1: Classify the Test
| Layer | What to Test | Dependencies | Speed |
|-------|-------------|--------------|-------|
| Unit | Domain entities, value objects, domain services | None | <1ms |
| Unit | Use case logic | Mocked repository interfaces | <5ms |
| Integration | Repository implementations | Real database (testcontainers) | <100ms |
| Integration | External API client | Real API or WireMock | <100ms |
| E2E | Critical user journeys | Full stack | <10s |

### Step 2: Write Unit Tests
Test behavior, not implementation. A unit test should be:
- Testing one behavior (one scenario, one assertion).
- Using real domain objects, not mocks.
- Testing edge cases (null, empty, boundary values).

```typescript
describe('Order', () => {
  it('should calculate total with tax when items are added', () => {
    const order = Order.create({ customerId: 'uuid' })
    order.addItem(Product.create({ price: 100 }), 2)
    expect(order.total).toBe(220)  // 200 + 10% tax
  })

  it('should reject item when order is already paid', () => {
    const order = Order.create({ customerId: 'uuid' })
    order.markAsPaid()
    expect(() => order.addItem(Product.create({ price: 50 }), 1))
      .toThrow('Cannot add items to a paid order')
  })
})
```

### Step 3: Write Integration Tests
Integration tests verify that infrastructure adapters work correctly with real dependencies.

```typescript
describe('PostgresUserRepository', () => {
  let repo: PostgresUserRepository
  let testDb: TestDatabase

  beforeAll(async () => {
    testDb = await TestDatabase.start()  // testcontainer
    repo = new PostgresUserRepository(testDb.pool)
  })

  afterAll(async () => {
    await testDb.stop()
  })

  it('should persist and retrieve a user', async () => {
    const user = User.create({ email: 'test@example.com' })
    await repo.save(user)
    const found = await repo.findById(user.id)
    expect(found?.email).toBe('test@example.com')
  })

  it('should return null when user does not exist', async () => {
    const found = await repo.findById(UUID.generate())
    expect(found).toBeNull()
  })
})
```

### Step 4: Determine Coverage Targets
| Metric | Target | Notes |
|--------|--------|-------|
| Line coverage | >= 80% | Domain + Application layers |
| Branch coverage | >= 70% | Conditional logic |
| Mutation score | >= 60% | Tests catch real bugs |

### Step 5: Mocking Rules
| Mock | Do NOT Mock |
|------|-------------|
| Repository interfaces (in unit tests) | Repository implementations |
| External HTTP APIs | Database operations |
| Message broker clients | Domain entities |
| Time/date | Value objects |
| Configuration | Framework internals |

## Rules
- Test behavior, not implementation. A test should not break when you refactor.
- No mocking of domain entities or value objects. They are pure logic that must be real in tests.
- One assertion per behavior. A test should verify exactly one thing.
- Every test is deterministic. Same input always produces the same output.
- No Thread.sleep() or setTimeout to wait for async operations. Use proper wait/retry.
- No snapshot tests. They break on irrelevant changes and hide meaningful differences.
- Test names are sentences: "should return error when email is invalid" — not "test_email_validation".

## References
  - references/integration-test-patterns.md — Integration Test Patterns
  - references/mocking-fakes.md — Mocking and Test Doubles
  - references/mocking-strategies.md — Mocking Strategies
  - references/test-naming-coverage.md — Test Naming and Coverage
  - references/test-pyramid.md — Test Pyramid
  - references/testing-contract.md — Contract Testing
  - references/testing-integration.md — Integration Testing
  - references/testing-property-based.md — Property-Based Testing
## Handoff
No artifact produced.
Next skill: stack-specific skill (nestjs-architecture, golang-architecture, etc.)
Carry forward: testing framework chosen, test structure conventions, coverage targets.
