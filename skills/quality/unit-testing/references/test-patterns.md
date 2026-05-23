# Unit Test Patterns

## Naming Conventions
| Pattern | Example |
|---------|---------|
| Method_StateUnderTest_ExpectedBehavior | dd_positiveNumbers_returnsSum |
| Given_When_Then | given_validEmail_when_validate_then_returnsTrue |
| Should_When | shouldReturnSum_whenAddingPositiveNumbers |

## Test Structure Patterns
| Pattern | Description |
|---------|-------------|
| AAA | Arrange, Act, Assert |
| Given-When-Then | BDD style, same as AAA |
| Four-Phase | Setup, Exercise, Verify, Teardown |

## What NOT to Test
- Framework code (assume it works)
- Simple getters/setters
- Configuration
- Third-party library behavior
- Generated code
