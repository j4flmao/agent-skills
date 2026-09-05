---
description: "j4flmao/rules — Mandatory testing requirements when generating code"
glob: "*"
---

# Testing Requirements

Cursor/AI MUST follow these rules regarding tests.

## 1. Zero-Prompt Testing
When generating a new business logic function or class, you must proactively generate (or update) the corresponding unit test without waiting for the user to explicitly say "write tests for this".

## 2. The Arrange-Act-Assert (AAA) Pattern
All tests must strictly follow the AAA pattern for readability. Do not mix assertions with setup code.

```javascript
// BAD
expect(calculator.add(2, 2)).toBe(4);

// GOOD
it('should return the sum of two positive numbers', () => {
    // Arrange
    const calc = new Calculator();
    const a = 2;
    const b = 2;

    // Act
    const result = calc.add(a, b);

    // Assert
    expect(result).toBe(4);
});
```

## 3. Test Edge Cases, Not Just Happy Paths
Do not only test the optimal scenario. You must include tests for:
- Null, undefined, or empty inputs.
- Out-of-bounds values (negative numbers, extreme lengths).
- Expected exception throwing (e.g., `expect(() => fn(null)).toThrow()`).

## 4. Mocking Boundaries
If the function interacts with a Database, File System, or external API, you MUST mock that dependency in the unit test. Do not write unit tests that perform real HTTP requests.
