# Unit Testing: Workflow Strategies and Decision Frameworks

## Overview

This reference provides tactical guidance on unit testing workflows, decision frameworks for test design, and strategies for maintaining test suite effectiveness over time. It covers the practical decisions made during test creation, execution, and maintenance, complementing the architectural patterns from the architecture reference.

## Core Architecture Concepts

### The Test Decision Flow

Every unit test creation follows a decision hierarchy:

```
Level 1: What to test?
  ├── Is this business logic? → YES → Unit test
  ├── Is this a complex algorithm? → YES → Unit test
  ├── Is this a simple getter/setter? → NO → Skip
  └── Is this infrastructure code? → Integration test

Level 2: How to isolate?
  ├── Has external dependencies? → Mock/stub at boundary
  ├── Pure computation? → No isolation needed
  └── Time-dependent? → Fake timers

Level 3: What to assert?
  ├── Observable behavior? → Assert result/state
  ├── Side effects? → Assert interactions
  └── Error conditions? → Assert exceptions/rejections

Level 4: How many tests?
  ├── Happy path → 1 test
  ├── Error paths → 1 per error condition
  ├── Edge cases → 1 per boundary value
  └── State transitions → 1 per transition
```

### Test Maintainability Architecture

Tests accumulate maintenance debt. The architectural factors affecting maintainability:

```
High Maintainability:
  - Tests assert behavior, not implementation
  - Minimal mocking (only at boundaries)
  - Shared setup via factories, not global state
  - Descriptive test names (should…when…)
  - One assertion concept per test

Low Maintainability:
  - Tests assert internal calls (spy on privates)
  - Deep mocking chains
  - Shared mutable fixtures
  - Vague test names
  - Multiple assertions per test
```

### Coverage Architecture

Coverage measurement should be strategic, not maximal:

```
Strategic coverage:
  - Business logic: > 90% line coverage
  - Error handling: every catch/throw tested
  - State machines: every transition tested
  - Data transformations: every path tested
  - Infrastructure: < 50% coverage (tested in integration)

Non-strategic coverage:
  - Generated code: excluded
  - Framework configuration: excluded
  - Boilerplate: excluded
  - Type definitions: excluded
```

## Architecture Decision Trees

### Decision Tree 1: Test Double Selection

```
Is the dependency under your control (same codebase)?
├── YES → Is it stateful?
│   ├── YES → Use Fake (simplified implementation)
│   └── NO → Use real implementation (pure function)
└── NO → Is it an external service?
    ├── YES → Is it a network boundary?
    │   ├── YES → Mock with MSW or WireMock
    │   └── NO → Is it a time/random dependency?
    │       ├── YES → Stub with fixed values
    │       └── NO → Is it a file system?
    │           ├── YES → Mock with in-memory fs
    │           └── NO → Mock at dependency boundary
    └── NO → Is it a library with side effects?
        ├── YES → Mock the adapter layer
        └── NO → Use real implementation
```

### Decision Tree 2: When to Write Tests

```
Is this new code?
├── YES → Write tests first (TDD) for complex logic
│   └── Write tests after for simple CRUD
└── NO → Is this a bug fix?
    ├── YES → Write test that reproduces the bug FIRST
    │   └── Fix the code to pass the test
    └── NO → Is this a refactoring?
        ├── YES → Do tests exist?
        │   ├── YES → Run tests before and after
        │   └── NO → Write characterization tests first
        └── NO → Is this a dependency upgrade?
            ├── YES → Run full suite, update changed behavior tests
            └── NO → Consider if test needed
```

### Decision Tree 3: Test Organization

```
How many source files in the module?
├── < 5 → Co-locate tests with source
├── 5-20 → Co-locate or feature-based directory
└── > 20 → Feature-based directories

Is this a shared library?
├── YES → Centralized test directory
└── NO → Co-located tests

Are there integration tests?
├── YES → Hybrid: unit co-located, integration centralized
└── NO → Co-located all tests
```

## Implementation Strategies

### Test Creation Strategy

Use the "Given-When-Then" pattern (BDD equivalent of AAA):

```typescript
describe('OrderService.calculateTotal', () => {
  it('should apply 10% discount for orders over $100', () => {
    // Given
    const order = createOrder({ total: 150 })

    // When
    const total = orderService.calculateTotal(order)

    // Then
    expect(total).toBe(135) // 150 - 15 discount
  })

  it('should not apply discount for orders under $100', () => {
    // Given
    const order = createOrder({ total: 50 })

    // When
    const total = orderService.calculateTotal(order)

    // Then
    expect(total).toBe(50) // no discount
  })
})
```

### Test Data Strategy

Choose the right approach for test data creation:

| Strategy | When to Use | Example |
|----------|------------|---------|
| Inline | Simple tests, 1-2 values | `{ name: 'Alice', age: 30 }` |
| Factory function | Reused across tests | `buildUser({ role: 'admin' })` |
| Fixture file | Complex objects, API responses | JSON files imported |
| Builder pattern | Many optional fields | `UserBuilder().withRole('admin').build()` |
| Faker/generator | Randomized but realistic | `faker.person.fullName()` |

### Mock Verification Strategy

| Verification | What It Checks | When to Use |
|-------------|----------------|-------------|
| toHaveBeenCalled | Method was invoked | Core behavior verification |
| toHaveBeenCalledTimes(n) | Exact invocation count | Idempotency, deduplication |
| toHaveBeenCalledWith | Arguments passed | Correct data flow |
| toHaveReturnedWith | Return value | Stub correctness |
| toHaveLastReturnedWith | Final return | Sequential calls |

## Integration Patterns

### Unit Testing in Microservice Architecture

Each microservice has its own unit test suite. The key integration pattern:

```
Service boundary: Mock at HTTP/RPC client boundary
Database boundary: Fake repository (in-memory)
Message queue boundary: Mock producer/consumer
External API boundary: Mock with MSW
Time dependency: Fake timers
Random/UUID: Stub with fixed values
```

### Unit Testing with Monorepos

Monorepo unit testing requires special consideration:

```
Root-level configuration:
  - Shared vitest.config.ts
  - Workspace-level test scripts
  - Consistent mock setup

Package-level configuration:
  - Package-specific mocks
  - Unique coverage thresholds
  - Custom test setup files

CI considerations:
  - Changed-package test selection
  - Affected-package detection
  - Parallel package testing
```

### Unit Testing and Component Testing

Component tests (testing UI components in isolation) follow similar patterns:

- Mock data fetching at the service boundary
- Stub router and navigation
- Fake browser APIs (localStorage, sessionStorage)
- Use testing-library for behavior-driven queries

## Performance Optimization

### Fast Test Patterns

```
// PATTERN 1: Lazy initialization
// SLOW: Initialize on import
const db = new Database()

// FAST: Initialize on first use
let db: Database
beforeAll(() => { db = new Database() })

// PATTERN 2: Avoid disk I/O
// SLOW: Read fixture files
const data = JSON.parse(readFileSync('./fixture.json'))

// FAST: Inline fixtures
const data = { /* inline data */ }

// PATTERN 3: Reuse across tests
// SLOW: Create service per test
beforeEach(() => { service = new Service(new MockRepo()) })

// FAST: Reset mock state instead
beforeEach(() => { vi.clearAllMocks() })
```

### Watch Mode Optimization

Configure watch mode for rapid feedback during development:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/*.md'],
    },
    // Only test changed files
    changed: true,
  },
})
```

## Security Considerations

### Test Isolation and Security

Unit tests should never have access to:
- Production credentials or API keys
- Real database connections
- Production network endpoints
- Customer PII or sensitive data

Use environment-specific test configuration that is separate from production configuration. Validate that no test connects to production resources.

### Secure Mock Patterns

When mocking security-sensitive components:
- Mock encryption/decryption with test-only keys
- Fake authentication with test-only tokens
- Stub authorization to test specific roles
- Never log actual security tokens in test output

## Operational Excellence

### CI Integration Architecture

```yaml
unit-tests:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx vitest --shard=${{ matrix.shard }}/4 --coverage
    - name: Upload coverage
      uses: actions/upload-artifact@v4
      with:
        name: coverage-${{ matrix.shard }}
        path: coverage/
```

### Test Suite Quality Gates

Define quality gates that must pass before merge:

1. All unit tests pass (zero failures)
2. Line coverage >= 80% (no decrease from target)
3. Branch coverage >= 70%
4. No new flaky tests detected
5. Test suite completes under 5 minutes
6. No new untested source files (threshold: < 20% coverage)

## Testing Strategy

### Regression Prevention Strategy

Unit tests serve as the first line of regression defense:

```
Code Change → Unit Tests → Integration Tests → E2E Tests → Deploy
                  ↓
           If unit test fails → Fix before committing
                  ↓
           Regression captured before it reaches integration
```

### Test Suite Evolution

Track test suite evolution over sprints:

- Sprint 1-2: Coverage 0-50% (core paths only)
- Sprint 3-4: Coverage 50-80% (add error paths)
- Sprint 5+: Coverage 80-90% (edge cases, maintenance)
- Ongoing: Mutation score improvement

## Common Pitfalls

1. **Testing the mock**: Spending more effort on verifying mock interactions than testing actual behavior
2. **Brittle test data**: Tests that depend on exact string matches or specific timestamps
3. **Too many mocks**: A test with 5+ mocks is likely testing too many concerns
4. **AfterEach overkill**: Cleaning state that doesn't need cleaning adds unnecessary execution time
5. **Magic numbers**: Assertions with unexplained values (expect(result).toBe(42))
6. **Missing edge cases**: Only testing the happy path, never the null/empty/error paths
7. **Testing with real time**: Real setTimeout/setInterval makes tests slow and flaky
8. **Mocking everything**: Including simple data structures and pure functions
9. **Skipping tests**: `it.skip` left in committed code creates blind spots
10. **Concurrency bugs**: Tests that pass sequentially but fail in parallel due to shared state

## Key Takeaways

- Use the Given-When-Then pattern for clear test structure
- Mock at system boundaries, not implementation internals
- Use factory functions for reusable test data creation
- Each test verifies one logical behavior with one assertion concept
- Set coverage gates: 80% line, 70% branch for business logic
- Never test: framework code, simple getters/setters, configuration
- Always test: business logic, complex algorithms, validation, error handling
- Keep tests fast: entire suite under 5 minutes, individual tests under 100ms
- Use fake timers for time-dependent code to ensure determinism
- Review and maintain test quality alongside production code
- Prefer real implementations over mocks for pure functions
- Use characterization tests for legacy code before refactoring
