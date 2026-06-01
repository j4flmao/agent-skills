---
name: backend-testing
description: >
  Use this skill when the user says 'testing', 'unit test', 'integration test', 'e2e test', 'test coverage', 'mock', 'stub', 'test structure', 'what to test', or when writing or reviewing tests. This skill enforces: test pyramid (many unit, medium integration, few e2e), behavior testing (not implementation), test naming conventions (should_expected_when_condition), and mocking rules (mock at boundaries only). Applies to any testing framework (Jest, pytest, Go test, cargo test, JUnit). Do NOT use for: frontend testing, performance testing, or manual QA processes.
version: "2.0.0"
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

## Decision Tree

### What to Test?

```
What layer are you testing?
  ├── Domain logic (entities, value objects, domain services)
  │   └── Unit test — pure logic, no mocks, no I/O
  ├── Application / Use Case
  │   ├── Uses repository → mock at repository boundary
  │   └── Has complex orchestration → integration test the real flow
  ├── Infrastructure adapter (DB, queue, HTTP client)
  │   └── Integration test — real DB, real API (testcontainers/WireMock)
  └── Full user journey
      └── E2E test — only critical paths, keep count low
```

### Which Test Double?

```
What dependency are you replacing?
  ├── Returns hardcoded data, never fails → Stub
  ├── Records calls for verification → Spy
  ├── Expects specific calls, throws on unexpected → Mock
  ├── Works but is slow/side-effect-ful → Fake (in-memory DB)
  └── Full real instance → Integration (testcontainer)
```

### How Many Tests?

```
How important is this code?
  ├── Core domain logic (pricing, validation, state machine)
  │   └── Full coverage: happy path + every error + every edge case + parameterized
  ├── Standard use case (orchestration, CRUD)
  │   └── Happy path + top 3 error cases
  ├── Glue code (simple delegation, config wiring)
  │   └── 1 integration test
  └── Generated code, trivial getters/setters
      └── Skip — tested through callers
```

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

  it('should reject item when quantity exceeds stock', () => {
    const order = Order.create({ customerId: 'uuid' })
    expect(() => order.addItem(Product.create({ price: 50, stock: 0 }), 1))
      .toThrow('Insufficient stock')
  })

  it('should apply discount when coupon code is valid', () => {
    const order = Order.create({ customerId: 'uuid' })
    order.addItem(Product.create({ price: 100 }), 1)
    order.applyCoupon('SAVE10')
    expect(order.total).toBe(90)  // 100 - 10% discount
    expect(order.discount).toBe(10)
  })
})
```

### Step 3: Write Use Case Tests (with Mocks)
Only mock at the boundary (repository, API gateway, publisher). Use real domain objects.

```typescript
describe('PlaceOrderUseCase', () => {
  it('should save order and publish event when order is placed', async () => {
    const repo = mock<OrderRepository>()
    const publisher = mock<EventPublisher>()
    const useCase = new PlaceOrderUseCase(repo, publisher)

    when(repo.save(any())).thenResolve()
    when(publisher.publish(any())).thenResolve()

    const result = await useCase.execute({ customerId: 'c1', items: [{ productId: 'p1', qty: 2 }] })

    expect(result.isOk()).toBe(true)
    verify(repo).save(any())
    verify(publisher).publish(match(e => e.type === 'order.placed'))
  })

  it('should return failure when inventory check fails', async () => {
    const repo = mock<OrderRepository>()
    const publisher = mock<EventPublisher>()
    const useCase = new PlaceOrderUseCase(repo, publisher)

    when(repo.save(any())).thenReject(new Error('Insufficient stock'))

    const result = await useCase.execute({ customerId: 'c1', items: [{ productId: 'p1', qty: 999 }] })

    expect(result.isErr()).toBe(true)
    expect(result.error.message).toContain('Insufficient stock')
    verify(publisher, never()).publish(any())
  })
})
```

### Step 4: Write Integration Tests
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

  beforeEach(async () => {
    await testDb.clear()  // clean state between tests
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

  it('should update existing user when saving with same id', async () => {
    const user = User.create({ email: 'original@example.com' })
    await repo.save(user)
    user.updateEmail('updated@example.com')
    await repo.save(user)
    const found = await repo.findById(user.id)
    expect(found?.email).toBe('updated@example.com')
  })

  it('should delete user by id', async () => {
    const user = User.create({ email: 'delete@example.com' })
    await repo.save(user)
    await repo.delete(user.id)
    const found = await repo.findById(user.id)
    expect(found).toBeNull()
  })
})
```

### Step 5: Write E2E Tests
Critical paths only (login, purchase, signup). E2E tests are slow and fragile — minimize them.

```typescript
describe('Purchase flow E2E', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await bootstrapTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should complete full purchase when user has valid payment', async () => {
    const token = await login(app, { email: 'user@test.com', password: 'pass123' })
    const product = await addToCart(app, token, { productId: 'p1', quantity: 1 })
    const order = await checkout(app, token, { paymentMethod: 'card' })
    expect(order.status).toBe('confirmed')
    expect(order.total).toBeGreaterThan(0)
  })

  it('should reject purchase when payment fails', async () => {
    const token = await login(app, { email: 'user@test.com', password: 'pass123' })
    const product = await addToCart(app, token, { productId: 'p1', quantity: 1 })
    const order = await checkout(app, token, { paymentMethod: 'expired_card' })
    expect(order.status).toBe('payment_failed')
    expect(order.error).toContain('card_declined')
  })
})
```

### Step 6: Determine Coverage Targets
| Metric | Target | Notes |
|--------|--------|-------|
| Line coverage | >= 80% | Domain + Application layers |
| Branch coverage | >= 70% | Conditional logic |
| Mutation score | >= 60% | Tests catch real bugs |

### Step 7: Mocking Rules
| Mock | Do NOT Mock |
|------|-------------|
| Repository interfaces (in unit tests) | Repository implementations |
| External HTTP APIs | Database operations |
| Message broker clients | Domain entities |
| Time/date | Value objects |
| Configuration | Framework internals |

### Step 8: Test Data Factories
Use factories for test data to keep tests readable and maintainable.

```typescript
// Factory pattern for test data
function buildUser(overrides: Partial<UserProps> = {}): User {
  return User.create({
    id: overrides.id ?? UUID.generate(),
    email: overrides.email ?? 'default@test.com',
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'customer',
    createdAt: overrides.createdAt ?? new Date(),
  })
}

function buildOrder(overrides: Partial<OrderProps> = {}): Order {
  return Order.create({
    id: overrides.id ?? UUID.generate(),
    customerId: overrides.customerId ?? 'customer-1',
    items: overrides.items ?? [buildOrderItem()],
    status: overrides.status ?? 'pending',
    createdAt: overrides.createdAt ?? new Date(),
  })
}

it('should calculate shipping for heavy orders', () => {
  const order = buildOrder({
    items: [buildOrderItem({ weight: 50 }), buildOrderItem({ weight: 30 })],
  })
  expect(order.shippingCost).toBe(15.00)
})
```

### Step 9: Parameterized / Table-Driven Tests
Cover many inputs with minimal code.

```typescript
// Jest — test.each
describe('validateEmail', () => {
  it.each([
    ['test@example.com', true],
    ['user@co.uk', true],
    ['not-an-email', false],
    ['@missing-user.com', false],
    ['', false],
    [null, false],
  ])('should return %p when email is %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected)
  })
})
```

```python
# pytest — parametrize
@pytest.mark.parametrize("email,expected", [
    ("test@example.com", True),
    ("user@co.uk", True),
    ("not-an-email", False),
    ("", False),
])
def test_validate_email(email: str, expected: bool):
    assert validate_email(email) == expected
```

### Step 10: Async Test Patterns
Test proper timeout handling, cancellation, and race conditions.

```typescript
describe('Timeout handling', () => {
  it('should return fallback when external API times out', async () => {
    const client = new ExternalApiClient({ timeoutMs: 100 })
    const result = await client.fetchWithFallback('data')
    expect(result).toEqual({ source: 'cache', data: expect.any(Object) })
  })

  it('should cancel in-flight request when new one arrives', () => {
    const abort = new AbortController()
    const promise = fetch('/api/data', { signal: abort.signal })
    abort.abort()
    return expect(promise).rejects.toThrow('AbortError')
  })
})
```

### Step 11: Flaky Test Prevention
| Cause | Fix |
|-------|-----|
| Shared mutable state | Reset in beforeEach, not beforeAll |
| Time-dependent logic | Inject clock, freeze with fake timers |
| Async race conditions | Use proper await, avoid setTimeout |
| Environment differences | Use testcontainers, not local DB |
| Order-dependent tests | Never rely on test execution order |
| Random data | Use seeded PRNG for deterministic tests |
| Network flakiness | Retry with backoff, or use WireMock |

```typescript
// Flaky: depends on time
it('should expire after 24 hours', () => {
  const token = Token.create()
  expect(token.isExpired()).toBe(false)
  // This breaks if test runs at midnight boundary
})

// Deterministic: inject clock
it('should expire after 24 hours', () => {
  jest.useFakeTimers()
  const now = new Date('2025-01-15T10:00:00Z')
  jest.setSystemTime(now)
  const token = Token.create({ createdAt: now })

  jest.advanceTimersByTime(23 * 60 * 60 * 1000)
  expect(token.isExpired()).toBe(false)

  jest.advanceTimersByTime(2 * 60 * 60 * 1000)
  expect(token.isExpired()).toBe(true)

  jest.useRealTimers()
})
```

## Test Structure Patterns

### Arrange-Act-Assert (AAA)
Every test has three clear sections separated by blank lines:
```typescript
it('should apply senior discount for users over 60', () => {
  // Arrange
  const user = buildUser({ age: 65 })
  const order = buildOrder({ user })

  // Act
  const total = order.calculateTotal()

  // Assert
  expect(total).toBe(order.subtotal * 0.9)  // 10% senior discount
})
```

### Given-When-Then (BDD style)
```typescript
describe('Transfer money', () => {
  it('should deduct from sender and add to receiver when balance is sufficient', () => {
    // Given: two accounts with sufficient balance
    const sender = Account.create({ balance: 500 })
    const receiver = Account.create({ balance: 100 })

    // When: transferring 200
    sender.transferTo(receiver, 200)

    // Then: balances are updated correctly
    expect(sender.balance).toBe(300)
    expect(receiver.balance).toBe(300)
  })
})
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Test speed | Unit < 1ms, Integration < 100ms, E2E < 10s |
| CI time | Target < 10 min total. Split: unit always, integration on PR, e2e on main merge |
| Test flakiness | Automatic retry in CI for known flaky (max 2 retries), file bug for persistent flaky |
| Secrets in tests | Use env vars or .env.test, never commit real secrets |
| DB state | Fresh migration per test suite, clean data between tests |
| Parallel execution | Unit tests parallel=true, Integration serial per DB, E2E serial |

## Security Testing Considerations

| Type | What to Test | Example |
|------|-------------|---------|
| Input validation | SQL injection, XSS, command injection | `test("should reject SQL injection in email")` |
| Auth bypass | Unauthenticated access to protected endpoints | `test("should return 401 when no token")` |
| Authorization | User A accessing User B's data | `test("should reject cross-user access")` |
| Rate limiting | Excessive requests within window | `test("should return 429 after N requests")` |
| File upload | Malicious file types, zip bombs, path traversal | `test("should reject executable files")` |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Testing implementation details | Tests break on refactor | Test behavior via public API |
| Multiple assertions per test | First failure hides later bugs | One assertion per test |
| Shared mutable fixtures | Tests affect each other | Reset state in beforeEach |
| Mocking everything | Fragile tests, false confidence | Mock only at boundaries |
| Snapshot tests | Hide meaningful diffs in noise | Explicit assertions |
| Sleeping for async | Slow, flaky | Use wait/retry or fake timers |
| Testing private methods | Tests couple to internals | Test through public API |
| Over-mocking | Tests pass but system fails | Integration test real adapters |

## Rules
- Test behavior, not implementation. A test should not break when you refactor.
- No mocking of domain entities or value objects. They are pure logic that must be real in tests.
- One assertion per behavior. A test should verify exactly one thing.
- Every test is deterministic. Same input always produces the same output.
- No Thread.sleep() or setTimeout to wait for async operations. Use proper wait/retry.
- No snapshot tests. They break on irrelevant changes and hide meaningful differences.
- Test names are sentences: "should return error when email is invalid" — not "test_email_validation".
- Use factories for test data, never real production data.
- Keep test data minimal — only fields relevant to the test case.
- Every use case must have at least: happy path + error path + edge case.
- Integration tests must clean state between runs (fresh migrations or truncate).
- Never mock what you don't own (third-party libraries, framework classes).
- Never share fixtures between test files — only within a describe block.

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
