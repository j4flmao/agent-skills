# Unit Testing: Architecture and System Design

## Overview

Unit testing validates individual components in isolation, providing the fastest feedback loop in the test pyramid. This reference covers the architectural patterns, decision frameworks, and system design considerations for building maintainable, effective unit test suites at scale. Proper unit testing architecture determines whether a test suite accelerates or impedes development velocity.

## Core Architecture Concepts

### Test Isolation Architecture

Unit test isolation operates at multiple levels, each with different guarantees and costs:

```
Level 1: Process Isolation (strongest)
  - Each test runs in its own process
  - Guarantees no state leakage
  - Highest overhead (context switches, startup)
  
Level 2: Module/Worker Isolation
  - Tests run in separate worker threads
  - Module-level state is isolated
  - Moderate overhead

Level 3: Test Case Isolation
  - beforeEach/afterEach reset state
  - Lowest overhead
  - Risk of shared mutable state bugs
```

### Dependency Injection Architecture

Testability is a design concern. Systems designed with dependency injection enable natural test isolation:

```
Production Code:
  class OrderService {
    constructor(
      private repository: OrderRepository,
      private paymentGateway: PaymentGateway,
      private notificationService: NotificationService
    ) {}
  }

Test Code:
  const mockRepo = new MockOrderRepository()
  const mockPayment = new MockPaymentGateway()
  const mockNotification = new MockNotificationService()
  const service = new OrderService(mockRepo, mockPayment, mockNotification)
```

### Mock Architecture

Mocks replace real dependencies with controlled substitutes. The architecture follows a boundary pattern:

```
System Under Test ← calls → Dependency Boundary ← mock → Mock Object
                                      ↑
                              Mock framework intercepts
                              at the boundary, not inside
```

The key architectural principle: mock at the system boundary, not at internal implementation details. This means mocking HTTP clients (network boundary) but not internal service methods.

## Architecture Decision Trees

### Decision 1: Framework Selection

| Criterion | Vitest | Jest | Mocha + Chai | Jasmine |
|-----------|-------|------|--------------|---------|
| Speed | Fast (esbuild) | Moderate | Fast | Moderate |
| TypeScript | Native | Via ts-jest | Plugin | Plugin |
| Mocking | Built-in (vi) | Built-in (jest) | External (sinon) | Built-in |
| Watch mode | Excellent | Good | Good | Good |
| ESM support | Native | Experimental | Good | Limited |
| Test filtering | Tags, patterns | Patterns | grep | grep |

**Decision rule:** Prefer Vitest for TypeScript/ESM projects. Use Jest for existing Jest codebases. Choose Mocha + Chai for Node.js native ESM projects. Avoid Jasmine for new projects.

### Decision 2: Test Double Type Selection

```
Does the dependency have side effects?
├── YES → Is it external to the process?
│   ├── YES → Use Mock (verify behavior) or Fake (simplified impl)
│   └── NO → Is it slow or non-deterministic?
│       ├── YES → Use Stub (return fixed values)
│       └── NO → Use real implementation
└── NO → Is it a pure computation?
    ├── YES → Use real implementation (no test double needed)
    └── NO → Do you need to verify interactions?
        ├── YES → Use Spy
        └── NO → Use Stub
```

### Decision 3: Code Coverage Strategy

| Coverage Level | Use Case | Trade-offs |
|---------------|----------|------------|
| Line > 80% | Standard CI gate | May encourage meaningless tests |
| Branch > 75% | Conditional logic safety | Higher effort for edge cases |
| Function > 85% | API coverage | Misses internal logic gaps |
| Mutation > 60% | Test quality assurance | Computationally expensive |
| No hard threshold | Fast-moving early stage | Risk of untested code |

**Decision rule:** Set line coverage at 80% and branch coverage at 70% as CI gates. Use mutation score as a quality indicator, not a gate. Focus coverage targets on business logic, not infrastructure code.

## Implementation Strategies

### Test Structure Architecture

The AAA (Arrange-Act-Assert) pattern provides a consistent structure across all unit tests:

```
describe('Component/Service Name', () => {
  // Shared setup for the test suite
  let service: ServiceUnderTest
  let mockDependency: MockDependency

  beforeEach(() => {
    // ARRANGE: Set up fresh instances
    mockDependency = new MockDependency()
    service = new ServiceUnderTest(mockDependency)
  })

  it('should do something when something happens', () => {
    // ARRANGE (test-specific): Configure mock behavior
    mockDependency.method.mockReturnValue(expectedValue)
    
    // ACT: Execute the unit under test
    const result = service.method(input)
    
    // ASSERT: Verify the observable outcome
    expect(result).toEqual(expectedValue)
    expect(mockDependency.method).toHaveBeenCalledWith(input)
  })
})
```

### Test Double Implementation Strategy

Each test double type has a specific implementation pattern:

**Stub Pattern** — Return fixed values for method calls:
```typescript
const stub = { getConfig: () => ({ timeout: 5000, retries: 3 }) }
```

**Mock Pattern** — Pre-programmed expectations with behavior verification:
```typescript
const mock = vi.fn().mockResolvedValue({ id: 1, status: 'active' })
```

**Spy Pattern** — Wrap real implementation and record interactions:
```typescript
const spy = vi.spyOn(service, 'validate')
```

**Fake Pattern** — Working simplified implementation:
```typescript
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>()
  async findById(id: string) { return this.users.get(id) ?? null }
  async save(user: User) { this.users.set(user.id, user) }
}
```

**Dummy Pattern** — Placeholder, never actually used:
```typescript
new ServiceUnderTest({} as Config)  // Config is never accessed
```

## Integration Patterns

### Unit Testing in CI/CD

```
Commit Stage:
  - Run unit tests with coverage
  - Fast (entire suite < 5 minutes)
  - Block merge on failure or coverage drop
  - Parallel execution across workers

PR Stage:
  - Run unit tests for changed files
  - Run full suite for merge target
  - Report coverage changes
  - Flag untested new code

Nightly:
  - Run all tests with mutation score
  - Generate coverage trend report
  - Report flaky tests
  - Archive coverage artifacts
```

### Unit Testing and TDD

TDD (Test-Driven Development) integrates unit testing into the development workflow:

```
Red Phase (Write failing test):
  - Define expected behavior through test assertions
  - Test compiles but fails (no implementation yet)
  - Forces design decisions upfront

Green Phase (Make it pass):
  - Write minimal implementation
  - Do not optimize yet
  - Tests pass → implementation is correct

Refactor Phase (Improve quality):
  - Clean up code while tests verify correctness
  - Remove duplication, improve naming
  - Extract abstractions safely
```

### Unit Testing for Legacy Code

Legacy code without tests requires a different approach:

1. **Characterization tests**: Write tests that capture current behavior (even if buggy)
2. **Seam identification**: Find injection points (interfaces, virtual methods)
3. **Sprout method**: Extract testable methods from untestable code
4. **Wrap class**: Create testable wrapper around untestable class
5. **Gradual refactoring**: Improve design while tests verify behavior preservation

## Performance Optimization

### Test Execution Speed

| Optimization | Improvement | Effort |
|-------------|-------------|--------|
| Mock I/O dependencies | 100-1000x | Low |
| Use in-memory DB fakes | 10-100x | Medium |
| Parallel execution | N-cores speedup | Low |
| Test sharding in CI | N-shards speedup | Low |
| Avoid disk writes | 10-100x | Low |
| Reuse expensive setup | 2-5x | Medium |

### Slow Test Patterns

Common causes of slow unit tests and their fixes:

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Real database | Test takes 100ms+ | Use fake or mock |
| File system | Test creates files | Use in-memory fs mock |
| Network calls | Test waits for timeout | Mock at HTTP boundary |
| Thread sleep | Test has hardcoded wait | Use fake timers |
| Large data sets | Test generates 1000+ records | Reduce data volume |
| Complex setup | beforeEach takes 100ms+ | Extract to once-per-suite setup |

## Security Considerations

### Isolation Boundaries

Unit tests must not access production systems. Verify isolation:
- No real database connections in unit tests
- No network calls to external services
- No file system writes outside temp directories
- No environment variable mutations (use stubs)

### Sensitive Data in Test Fixtures

- Never use real credentials, API keys, or PII in test fixtures
- Use fake data generators (Faker.js) for realistic but safe data
- Audit test artifacts for sensitive data leaks
- Keep test secrets out of version control

## Operational Excellence

### Test Suite Health Metrics

Monitor metrics to assess test suite effectiveness:

- **Execution time**: Median and P95 test execution time
- **Flakiness rate**: Percentage of non-deterministic tests
- **Coverage stability**: Coverage variance across runs
- **Maintenance cost**: Tests modified per source change
- **False positive rate**: Tests that fail but code is correct
- **False negative rate**: Bugs that pass through the test suite

### Test Suite Organization

Follow the "one assertion concept" per test: each test should verify one logical behavior. Group related tests in describe blocks:

```
describe('UserService')
  ├── describe('createUser')
  │   ├── it('creates with valid data')
  │   ├── it('rejects duplicate email')
  │   └── it('validates required fields')
  ├── describe('updateUser')
  │   ├── it('updates existing user')
  │   └── it('throws for non-existent user')
  └── describe('deleteUser')
      ├── it('soft deletes user')
      └── it('prevents deletion of admin')
```

## Testing Strategy

### What to Unit Test

| Category | Test? | Rationale |
|----------|-------|-----------|
| Business logic | Always | Core value, most bugs here |
| Complex algorithms | Always | Error-prone, benefit from isolation |
| Data transformations | Always | Easy to test, high value |
| Validation rules | Always | Security-critical |
| Error handling | Always | Edge case coverage |
| Simple getters/setters | Never | Trivial, tested indirectly |
| Framework code | Never | Trust the framework |
| Configuration | Never | Environment-dependent |
| Third-party library wrappers | Integration test | Test with real library |
| Generated code | Never | Trust the generator |

### What NOT to Mock

- Data structures (arrays, maps, sets)
- Pure functions (no side effects)
- Value objects (DTOs, entities)
- Loggers (or use simple stub)
- Internal implementation details (private methods)

## Common Pitfalls

1. **Over-mocking**: Mocking internal details makes tests brittle — mock at system boundaries
2. **Testing implementation**: Tests that break on refactoring are testing the wrong thing
3. **Shared mutable state**: Tests that depend on each other through shared state are unreliable
4. **Brittle assertions**: Asserting exact strings or complex objects creates maintenance burden
5. **Slow tests**: Tests that take > 100ms are not unit tests — they're slow integration tests
6. **Mocking what you don't own**: Mocking third-party library internals creates maintenance burden
7. **Incomplete teardown**: Resources (DB connections, file handles) must be cleaned up
8. **Empty test bodies**: Tests with no assertions provide false confidence
9. **Testing framework internals**: Don't test that mocks were created correctly
10. **Over-specification**: Too many assertions per test makes failure diagnosis harder

## Key Takeaways

- Mock at system boundaries, not implementation internals — this is the single most important rule
- Use the AAA pattern consistently: Arrange, Act, Assert
- Prefer real implementations for pure functions and value objects
- Set coverage gates at 80% line/70% branch for business logic
- Test observable behavior, not implementation details
- Keep tests fast: mock I/O, use in-memory dependencies, avoid sleep
- Structure tests by feature, not by type — feature-based organization scales better
- Each test should verify one logical behavior: one assertion concept per test
- Combine unit tests with TDD for design feedback and regression safety
- Monitor test suite health: execution time, flakiness, maintenance cost
