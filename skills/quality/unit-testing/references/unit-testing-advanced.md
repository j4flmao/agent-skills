# Unit Testing Advanced Topics

## Introduction
Advanced unit testing covers mutation testing for test quality, property-based testing integration, testing async/timing-dependent code, test architecture at scale, and integrating unit testing with TDD workflows for complex systems.

## Mutation Testing
Mutation testing evaluates test quality by introducing bugs (mutations) and checking if tests catch them:

```bash
# Python mutation testing with mutmut
pip install mutmut
mutmut run --paths-to-mutate src/
mutmut results
```

```typescript
// JS mutation testing with Stryker
npx stryker run
```

A test suite that kills 90%+ of mutations is effective. Low mutation scores indicate tests that pass without truly validating behavior. Focus on surviving mutations in business logic, not in trivial getters/setters.

## Testing Async Code
### Time-Dependent Code
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SessionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should expire session after 30 minutes', () => {
    const session = new SessionManager('user-123');
    expect(session.isExpired()).toBe(false);

    // Advance time by 31 minutes
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(session.isExpired()).toBe(true);
  });

  it('should refresh session on activity', () => {
    const session = new SessionManager('user-123');
    vi.advanceTimersByTime(25 * 60 * 1000);

    session.refresh();  // Extends session
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(session.isExpired()).toBe(false);  // Not expired yet
  });
});
```

### Testing Concurrent Operations
```typescript
it('should handle concurrent cart updates correctly', async () => {
  const cart = new Cart('cart-123');
  const updates = [
    cart.addItem({ productId: 1, quantity: 1 }),
    cart.addItem({ productId: 2, quantity: 2 }),
    cart.removeItem(1),
    cart.addItem({ productId: 3, quantity: 1 }),
  ];

  await Promise.all(updates);

  expect(cart.getItemCount()).toBe(2);  // Items 2 and 3 remain
  expect(cart.getTotal()).toBe(30);     // Correct total
});
```

## Test Architecture at Scale
### Behavior-Driven Test Structure
```
tests/
├── unit/
│   ├── pricing/
│   │   ├── test_discount_calculation.py
│   │   └── test_tax_calculation.py
│   ├── checkout/
│   │   ├── test_cart_management.py
│   │   └── test_order_creation.py
│   └── user/
│       ├── test_authentication.py
│       └── test_profile_management.py
├── fixtures/
│   ├── factories.py    # Test data factories
│   └── mocks.py        # Shared mock definitions
└── conftest.py          # Shared fixtures and configuration
```

### Test Data Factories
```python
# tests/fixtures/factories.py
import factory
from src.pricing import PriceBreak

class PriceBreakFactory(factory.Factory):
    class Meta:
        model = PriceBreak

    quantity = factory.Sequence(lambda n: (n + 1) * 5)
    discount_percent = factory.Sequence(lambda n: (n + 1) * Decimal("5"))

class OrderFactory(factory.DictFactory):
    customer_id = factory.Sequence(lambda n: f"cust-{n:04d}")
    total = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
    status = "pending"
```

## TDD Workflow Enhancement
### Red-Green-Refactor with Complex Logic
```
1. Write failing test (Red):
   - Define expected behavior with clear assertions
   - Test compiles but fails (feature not implemented)

2. Make test pass (Green):
   - Write minimal code to pass the test
   - No optimization, no refactoring

3. Improve code (Refactor):
   - Clean up implementation
   - Remove duplication
   - Improve naming
   - Tests still pass

4. Repeat for next behavior
```

## Key Points
- Mutation testing validates test quality by introducing controlled bugs
- Use fake timers for time-dependent code — deterministic and fast
- Test concurrent operations with Promise.all or async coordination
- Organize tests behaviorally, not by source file structure
- Use test data factories for clean, reusable test data
- Follow TDD for complex business logic
- Integration test timing-dependent code alongside unit tests
- Aim for > 90% mutation score for critical business logic
