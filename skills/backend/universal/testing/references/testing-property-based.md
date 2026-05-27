# Property-Based Testing

Property-based testing verifies that code behaves correctly across a wide range of inputs by testing invariant properties.

## Core Concept

Instead of example-based tests (`expect(add(2, 2)).toBe(4)`), property-based tests define invariants that should hold for all inputs:

```typescript
import * as fc from 'fast-check';

describe('add', () => {
  it('should be commutative', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(add(a, b)).toBe(add(b, a));
      })
    );
  });

  it('should be associative', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), fc.integer(), (a, b, c) => {
        expect(add(add(a, b), c)).toBe(add(a, add(b, c)));
      })
    );
  });

  it('should have identity element (0)', () => {
    fc.assert(
      fc.property(fc.integer(), (a) => {
        expect(add(a, 0)).toBe(a);
        expect(add(0, a)).toBe(a);
      })
    );
  });
});
```

## Common Properties

| Property | Description | Example |
|----------|-------------|---------|
| Idempotence | Running twice produces same result | `sort(sort(arr))` === `sort(arr)` |
| Invariance | Output structure doesn't change | `reverse(arr).length` === `arr.length` |
| Round-trip | Serialize then deserialize returns original | `decode(encode(data))` === `data` |
| Metamorphic | Related inputs produce related outputs | `upperCase(a + b)` contains `upperCase(a)` |
| Oracle | Compare against simpler implementation | `fastSort(arr)` matches `slowSort(arr)` |

## Round-Trip Testing (Serialization)

```typescript
describe('JSON serialization', () => {
  it('should round-trip any valid user object', () => {
    fc.assert(
      fc.property(userArbitrary(), (user) => {
        const json = serializeUser(user);
        const parsed = deserializeUser(json);
        expect(parsed).toEqual(user);
      })
    );
  });
});

function userArbitrary(): fc.Arbitrary<User> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress(),
    age: fc.integer({ min: 0, max: 150 }),
    roles: fc.array(fc.constantFrom('admin', 'user', 'moderator'), { maxLength: 5 }),
  });
}
```

## Stateful Testing

Verify that state transitions are consistent:

```typescript
describe('Counter', () => {
  it('should maintain invariant that count >= 0', () => {
    fc.assert(
      fc.asyncProperty(fc.array(fc.constantFrom('increment', 'decrement', 'reset')), async (commands) => {
        const counter = new Counter();

        for (const cmd of commands) {
          switch (cmd) {
            case 'increment': await counter.increment(); break;
            case 'decrement':
              const before = counter.count;
              await counter.decrement();
              // After decrement, count should be max(0, before - 1)
              expect(counter.count).toBe(Math.max(0, before - 1));
              break;
            case 'reset': await counter.reset(); break;
          }
        }

        expect(counter.count).toBeGreaterThanOrEqual(0);
      })
    );
  });
});
```

## Custom Arbitraries

Create domain-specific generators:

```typescript
function orderArbitrary(): fc.Arbitrary<Order> {
  return fc.record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    items: fc.array(
      fc.record({
        productId: fc.uuid(),
        quantity: fc.integer({ min: 1, max: 100 }),
        price: fc.float({ min: 0.01, max: 9999.99 }),
      }),
      { minLength: 1, maxLength: 20 }
    ),
    couponCode: fc.option(fc.string({ minLength: 3, maxLength: 20 })),
    shippingAddress: fc.record({
      street: fc.string(),
      city: fc.string(),
      zipCode: fc.string().filter(s => /^\d{5}$/.test(s)),
    }),
  });
}

describe('Order total calculation', () => {
  it('should equal sum of item totals plus tax', () => {
    fc.assert(
      fc.property(orderArbitrary(), (order) => {
        const itemTotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        const tax = computeTax(itemTotal);
        const total = computeOrderTotal(order);
        expect(total).toBeCloseTo(itemTotal + tax, 2);
      })
    );
  });
});
```

## Shrinking

Property-based test frameworks automatically shrink failing inputs to minimal reproduction:

```typescript
// If test fails on a large input, framework shrinks it to minimal case
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    expect(isSorted(sort(arr))).toBe(true);
  })
);

// Example failure output:
// Counterexample: [3, 1, 2]
// Shrunk 15 times to: [2, 1]  ← minimal failing case
```

## Key Points
- Define invariant properties that always hold (commutativity, associativity, idempotence)
- Use round-trip testing for serialization/deserialization
- Test stateful systems with command sequences
- Create domain-specific arbitraries for complex objects
- Use filtering (`filter`) for constrained inputs
- Let the framework shrink failures to minimal reproduction cases
- Combine with example-based tests for known edge cases
- Run property tests with sufficient iterations (default 100, increase to 1000 for critical code)
