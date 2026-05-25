---
name: quality-unit-testing
description: >
  Use when the user asks about unit testing, test doubles, mocking, stubbing, test-driven development (TDD), FIRST principles, code coverage, test structure (AAA), or unit test patterns. Do NOT use for: integration testing (quality-integration-testing), E2E testing (quality-e2e-testing), or frontend testing (frontend-testing).
version: "1.0.0"
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
Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. Ensure test quality, maintainability, and meaningful coverage.

## Workflow

### FIRST Principles
| Principle | Meaning |
|-----------|---------|
| Fast | Tests run quickly (milliseconds) |
| Isolated | No shared state, no dependencies |
| Repeatable | Same result every time, anywhere |
| Self-validating | Pass/fail, no manual checking |
| Timely | Written before or with production code |

### AAA Pattern (Arrange-Act-Assert)
```typescript
// Arrange
const calculator = new Calculator();
const a = 2;
const b = 3;

// Act
const result = calculator.add(a, b);

// Assert
expect(result).toBe(5);
```

### Test Double Types
| Type | Description | When to Use |
|------|-------------|-------------|
| Dummy | Passed but not used | Filling parameter lists |
| Stub | Returns fixed values | When you need a specific return |
| Spy | Records calls and arguments | Verifying interactions |
| Mock | Pre-programmed with expectations | Behavior verification |
| Fake | Working but simplified implementation | In-memory database |

### Code Coverage Guidelines
- Line coverage: > 80%
- Branch coverage: > 70%
- Focus on business logic, not infrastructure code
- Don't chase 100% — it's a metric, not a goal

## References
- `references/tdd-guide.md` — Tdd Guide
- `references/test-doubles.md` — Test Doubles
- `references/test-patterns.md` — Test Patterns
- `references/unit-testing-patterns.md` — Unit Testing Patterns
