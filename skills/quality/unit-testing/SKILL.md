---
name: quality-unit-testing
description: >
  Use when the user asks about unit testing, test doubles, mocking, stubbing, test-driven development (TDD), FIRST principles, code coverage, test structure (AAA), or unit test patterns. Do NOT use for: integration testing (quality-integration-testing), E2E testing (quality-e2e-testing), or frontend testing (frontend-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, unit-testing, phase-3]
---

# Unit Testing

## Purpose
Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. Ensure test quality, maintainability, and meaningful coverage of business logic. This skill covers test architecture, isolation strategies, mock/stub decisions, CI integration, and test suite health monitoring.

## Agent Protocol

### Trigger
User mentions unit testing, test doubles, mocking, stubbing, TDD, FIRST principles, code coverage, test structure (AAA), or unit test patterns.

### Input Context
- Modules or functions under test
- Dependency graph and injection points
- Existing test suite structure
- Coverage targets and CI constraints
- Language and test framework in use

### Output Artifact
Unit test suite with proper isolation, test doubles, and CI integration.

### Response Format
Test file(s) with:
1. Proper AAA structure and descriptive naming
2. Mock/stub/fake definitions at system boundaries
3. Coverage configuration and CI pipeline integration
4. Test organization strategy (co-located or centralized)

### Completion Criteria
- All identified functions have unit tests covering happy path, error paths, and edge cases
- Test doubles used only at system boundaries
- Tests are fast (< 100ms per test, < 5 min for suite)
- Coverage meets agreed thresholds (line > 80%, branch > 70%)
- CI integration configured with coverage reporting and sharding

## Workflow

1. **Analyze the unit**: Identify the function/module, its dependencies, and its observable behavior (not implementation)
2. **Determine isolation needs**: Map dependencies to test double types (mock at boundaries, real for pure functions)
3. **Design test scenarios**: List happy path, error paths, edge cases (empty, null, boundary values)
4. **Create test structure**: Write describe blocks for organization, it blocks per scenario following AAA/Given-When-Then
5. **Implement mocks**: Configure mock responses at dependency boundaries. Use vi.mock/jest.mock for module mocks, vi.spyOn for method spies
6. **Write assertions**: Assert observable behavior (return values, state changes, side effects). Avoid asserting internal implementation
7. **Run and verify**: Execute tests. Verify coverage meets thresholds. Check test execution time
8. **Refactor tests**: Improve test code quality, remove duplication, extract test helpers and factories
9. **Integrate CI**: Configure CI with parallel execution, sharding, coverage reporting, and quality gates
10. **Monitor suite health**: Track execution time, flakiness, coverage stability. Fix flaky tests immediately

## Architecture / Decision Trees

### Test Double Selection

```
Dependency type?
├── External HTTP/network → Mock (MSW/WireMock)
├── Database → Fake (in-memory repo) or Mock at repository boundary
├── File system → Mock (memfs) or in-memory implementation
├── Time (Date, setTimeout) → Fake timers (vi.useFakeTimers)
├── Random/UUID → Stub with fixed values
├── Logger → Stub (no-op or spy)
├── Pure function → Real implementation
└── Internal service → Real implementation or Spy
```

### Framework Selection

```
Project language?
├── TypeScript/JavaScript
│   ├── New project + ESM → Vitest
│   └── Existing Jest → Jest
├── Java → JUnit 5 + Mockito
├── Python → pytest + pytest-mock
├── Go → testing + testify
├── Rust → cargo test
└── C# → xUnit + Moq/NSubstitute
```

## Common Pitfalls

1. **Over-mocking**: Mocking internal details creates brittle tests that break on refactoring. Mock only at module/system boundaries
2. **Testing implementation, not behavior**: Tests that assert internal method calls or private state break during refactoring
3. **Shared mutable state across tests**: Tests that depend on earlier tests' side effects are unreliable and order-dependent
4. **Slow tests**: Tests using real databases, network calls, or filesystem are integration tests, not unit tests
5. **Mocking dependencies you don't own**: Mocking third-party library internals creates tight coupling to library details
6. **Empty assertions**: Tests without proper assertions (expect(true).toBe(true)) provide false confidence
7. **Brittle string matching**: Asserting exact error messages or rendered output makes tests fragile
8. **Granularity mismatch**: Testing too large (entire service) or too small (private helpers) a unit
9. **Skipping error paths**: Only testing the happy path misses the majority of potential bugs
10. **Coverage chasing**: Targeting 100% coverage encourages meaningless tests. Focus on business logic

## Best Practices

1. Follow the AAA pattern (Arrange-Act-Assert) consistently across all tests
2. Use descriptive test names: "should [expected] when [scenario]"
3. Mock at system boundaries (network, persistence, time), not implementation internals
4. Use real implementations for pure functions and value objects
5. Keep tests fast: mock I/O, use in-memory dependencies, avoid real timers
6. One assertion concept per test — multiple assertions are fine if they test one behavior
7. Use factory functions for test data creation with sensible defaults and overrides
8. Clean up after tests: restore mocks, reset timers, clear state
9. Write tests alongside or before production code (TDD) for complex logic
10. Run tests in watch mode during development for fast feedback

## Compared With

| Aspect | Unit Testing | Integration Testing | E2E Testing |
|--------|-------------|-------------------|-------------|
| Scope | Single function/module | Component interactions | Full user workflows |
| Isolation | Full (mocked deps) | Partial (real deps) | None (real system) |
| Speed | Milliseconds | Seconds | Minutes |
| Debugging | Easy (isolated) | Medium | Hard |
| Brittleness | Low | Medium | High |
| Confidence | Low (isolated) | Medium | High |
| When | Every commit | On feature completion | Pre-release |

## Performance Considerations

- Individual tests should complete in < 100ms; suites under 5 minutes
- Mock I/O to reduce test time from seconds to microseconds
- Use test sharding in CI to parallelize across workers
- Configure `mockReset` and `restoreMocks` for automatic cleanup
- Use `it.concurrent` for independent tests within the same describe block
- Avoid beforeEach/afterEach for expensive setup — use beforeAll/afterAll for shared resources
- Watch mode skips unchanged files for fast feedback during development

## Rules

1. Every test must follow AAA or Given-When-Then structure — no unstructured test bodies
2. Mock only at system boundaries (network, persistence, filesystem, time). Internal dependencies use real implementations
3. Tests must not share mutable state — each test must be independently runnable and order-independent
4. Test names must describe behavior, not implementation: `should return sorted array when called with unsorted input`
5. Each test must assert at least one observable outcome — no assertions-only-in-catch or empty tests
6. Coverage thresholds: line >= 80%, branch >= 70% for business logic code. Exclude generated code
7. No test may make real network calls, access real databases, or write to the real filesystem outside temp
8. Time-dependent code must use fake timers (vi.useFakeTimers) for deterministic execution
9. All mocks must be reset between tests (use mockReset: true in config or afterEach restoreAllMocks)
10. Skipped tests (it.skip) must not be committed — use test.todo for planned tests instead
11. At least one negative/error test must accompany every positive/happy path test
12. Test data must use factories or fixtures with sensible defaults — no copy-pasted test data
13. PRs must not decrease coverage below configured thresholds without documented exception
14. Flaky tests (non-deterministic failures) must be quarantined within 24 hours and fixed within one sprint
15. Private methods are tested only through public interface — never expose privates for testing
16. Test files must be co-located with source files for unit tests, centralized for integration/E2E

## References
- references/mocking-strategies.md — Mocking Strategies
- references/tdd-guide.md — TDD Guide
- references/test-doubles.md — Test Doubles Guide
- references/test-organization.md — Test Organization
- references/test-patterns.md — Unit Test Patterns
- references/unit-testing-advanced.md — Unit Testing Advanced Topics
- references/unit-testing-architecture.md — Unit Testing Architecture and System Design
- references/unit-testing-fundamentals.md — Unit Testing Fundamentals
- references/unit-testing-patterns.md — Unit Testing Patterns
- references/unit-testing-workflow-strategies.md — Unit Testing Workflow Strategies and Decision Frameworks

## Handoff
After unit testing, hand off to:
- `quality-integration-testing` — for verifying component interactions with real dependencies
- `quality-property-based-testing` — for adding property-based invariants to complement examples
- `quality-regression-testing` — for regression suite execution and maintenance
- `quality-smoke-testing` — for BVT smoke test definition on tested components
