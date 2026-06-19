# Property-Based Testing Fundamentals

## Overview
Property-based testing (PBT) generates random inputs to test invariants — properties that should always hold true. Unlike example-based testing where you write specific input-output pairs, PBT defines properties and lets the computer find counterexamples. It discovers edge cases you didn't think to test.

## Core Concepts

### Concept 1: Properties
A property is a statement that should always be true for any valid input. Property types:
- **Invariant**: A condition that always holds (e.g., `sort(x).length == x.length`)
- **Idempotent**: Applying an operation twice gives the same result (e.g., `uniq(uniq(x)) == uniq(x)`)
- **Round-trip**: Serialize then deserialize returns the original (e.g., `parse(serialize(x)) == x`)
- **Metamorphic**: A relationship between related operations (e.g., `reverse(reverse(x)) == x`)
- **Oracle**: Result compared against a trusted implementation (e.g., `fast_sort(x) == known_good_sort(x)`)

### Concept 2: Generators
Generators produce random values of a specific type with controlled distributions. Built-in generators: integers, strings, arrays, booleans, dates, enums. Custom generators combine and transform built-in ones. Good generators produce valid domain inputs with edge cases (empty, null, extreme values).

### Concept 3: Shrinking
When a property fails, the framework automatically finds the minimal failing input by reducing the counterexample. For example, if a function fails on an array of 1000 elements, shrinking might find it fails on just [0]. Shrinking produces minimal, human-readable counterexamples for debugging.

### Concept 4: Coverage and Statistics
PBT frameworks provide statistics about generated values: how many tests passed, distribution of inputs, and coverage metrics. Use `.examples()` or equivalent to see generated values. Use `assume()` to guide generation toward relevant cases.

## Framework Comparison

| Feature | Hypothesis (Python) | fast-check (JS/TS) | ScalaCheck | jqwik (Java) | FsCheck (.NET) |
|---------|-------------------|-------------------|------------|-------------|----------------|
| Language | Python | JS/TS | Scala | Java | .NET |
| Generators | Strategies | Arbitraries | Gen | Arbitrary | Gen |
| Shrinking | Automatic, optimal | Automatic, default | Automatic | Automatic | Automatic |
| Stateful testing | Yes (stateful) | Yes (commands) | Yes (commands) | Yes | Yes |
| Custom generators | `@composite` | `.map()`, `.chain()` | Gen combinators | `@Provide` | Gen operators |
| Statistics | `.stat()` | `.statistics()` | `.collect()` | `@Statistics` | `label()` |
| Assumptions | `assume()` | `.filter()` | `when()` | `@Assume` | `==>` |
| Integration | pytest | Jest, Vitest | ScalaTest | JUnit 5 | xUnit, NUnit |
| Best for | Python data pipelines | JS/TS validation logic | Scala functional code | Java backend | .NET applications |

## Implementation Guide

### Step 1: Identify Testable Properties
Look for functions with clear invariants:
- **Pure functions**: Same input → same output (most properties apply)
- **Serialization/deserialization**: Round-trip property
- **Validation**: Error cases (throw for bad input, pass for good input)
- **Sorting, filtering, transformation**: Idempotence, length preservation
- **Math/statistics**: Algebraic properties (commutative, associative)

### Step 2: Write Python/Hypothesis Tests
```python
# tests/property/test_pricing.py
from hypothesis import given, assume, strategies as st
from decimal import Decimal
from src.pricing import calculate_discount, calculate_total, PriceBreak

# Strategy for valid price breaks
price_breaks = st.lists(
    st.builds(PriceBreak,
        quantity=st.integers(min_value=1, max_value=100),
        discount_percent=st.decimals(min_value=0, max_value=100, places=2),
    ),
    min_size=1, max_size=10,
)

class TestCalculateDiscount:
    @given(quantity=st.integers(min_value=0, max_value=1000),
           breaks=price_breaks)
    def test_discount_is_non_negative(self, quantity, breaks):
        """Invariant: discount percentage is never negative."""
        result = calculate_discount(quantity, breaks)
        assert result >= Decimal("0")

    @given(quantity=st.integers(min_value=0, max_value=1000),
           breaks=price_breaks)
    def test_discount_never_exceeds_100(self, quantity, breaks):
        """Invariant: discount percentage never exceeds 100%."""
        result = calculate_discount(quantity, breaks)
        assert result <= Decimal("100")

    @given(quantity=st.integers(min_value=0, max_value=1000),
           breaks=price_breaks)
    def test_more_items_never_less_discount(self, quantity, breaks):
        """Monotonic property: more items → discount >= same for fewer items."""
        discount_here = calculate_discount(quantity, breaks)
        if quantity > 0:
            discount_below = calculate_discount(quantity - 1, breaks)
            assert discount_here >= discount_below
```

### Step 3: Write JS/fast-check Tests
```javascript
// tests/property/pricing.test.ts
import * as fc from 'fast-check';
import { calculateDiscount, calculateTotal } from '../src/pricing';

describe('calculateDiscount', () => {
  it('should never return negative discount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.array(
          fc.record({
            quantity: fc.integer({ min: 1, max: 100 }),
            discountPercent: fc.double({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (quantity, breaks) => {
          const result = calculateDiscount(quantity, breaks);
          return result >= 0;
        }
      )
    );
  });

  it('should return 0 when no breaks apply', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.constant([] as PriceBreak[]),
        (quantity, breaks) => {
          const result = calculateDiscount(quantity, breaks);
          return result === 0;
        }
      )
    );
  });
});
```

### Step 4: Write Stateful Tests
```python
# tests/property/test_user_service.py
from hypothesis import given, strategies as st
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class UserServiceStateMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.users = {}

    @rule(name=st.text(min_size=1, max_size=50))
    def add_user(self, name):
        """Adding a user should succeed."""
        user_id = len(self.users) + 1
        self.users[user_id] = {"name": name, "active": True}

    @rule(user_id=st.integers(min_value=1, max_value=10))
    def remove_user(self, user_id):
        """Removing a user removes them from the system."""
        if user_id in self.users:
            del self.users[user_id]

    @invariant()
    def no_duplicate_names(self):
        """Invariant: no two active users have the same name."""
        names = [u["name"] for u in self.users.values() if u["active"]]
        assert len(names) == len(set(names))

    @invariant()
    def user_count_non_negative(self):
        """Invariant: user count is never negative."""
        assert len(self.users) >= 0

TestUserService = UserServiceStateMachine.TestCase
```

## Best Practices
- Start with simple invariants (non-negative, type preservation, length preservation)
- Use `assume()` or `.filter()` to skip invalid inputs (but minimize rejection rate)
- Add failing examples from shrinking as regression tests
- Use custom generators for domain-specific types (valid emails, IP addresses, etc.)
- Profile test execution — PBT can be slow with complex generators
- Combine with example-based tests for known edge cases
- Run PBT with higher iterations in CI (1000+), fewer during development (100)
- Use statistics to understand what values are being generated
- Test pure functions first — stateful testing is more complex
- Save and replay failing seeds for debugging

## Common Pitfalls
- Testing properties that are always true by construction (tautologies)
- Insufficient iteration count — running only 100 tests may miss rare edge cases
- Overly permissive generators producing mostly invalid inputs (high rejection rate)
- Forgetting to shrink — complex generators without good shrink strategies
- Testing side-effectful code without proper isolation
- Not adding shrunk examples as regression tests (losing discovered edge cases)
- Properties that pass with example-based data but fail with random data

## Key Points
- PBT finds edge cases example-based testing misses
- Define properties: invariants, idempotence, round-trips, metamorphic relations
- Hypothesis (Python) and fast-check (JS) are the leading frameworks
- Generators produce random values; shrinking finds minimal counterexamples
- Stateful testing models sequences of operations with invariants
- Save failing seeds as regression tests
- Run more iterations in CI, fewer during development
- Profile PBT execution time and optimize slow generators
