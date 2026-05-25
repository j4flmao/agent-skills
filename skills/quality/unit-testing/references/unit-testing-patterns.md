# Unit Testing Patterns

## Arrange-Act-Assert

### Basic Pattern
```typescript
describe('OrderService', () => {
  it('calculates total with tax', () => {
    // Arrange
    const service = new OrderService()
    const order = new Order([{ price: 100, qty: 2 }])

    // Act
    const total = service.calculateTotal(order)

    // Assert
    expect(total).toBe(216) // 200 + 8% tax
  })
})
```

### Given-When-Then (BDD Style)
```typescript
describe('Discount calculation', () => {
  it('applies 10% discount for orders over $100', () => {
    given.orderTotal(150)
    when.calculateDiscount()
    then.discountShouldBe(15)
  })
})
```

## Test Double Patterns

### Mock
```typescript
const mockRepository = {
  findById: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  save: jest.fn().mockResolvedValue(true),
}
```

### Stub
```typescript
// Returns fixed value for testing
const stubPaymentGateway = {
  charge: () => ({ status: 'success', transactionId: 'txn_123' }),
}
```

### Fake
```typescript
// Working implementation but simpler than real
class InMemoryRepository {
  private store = new Map()
  async findById(id) { return this.store.get(id) }
  async save(entity) { this.store.set(entity.id, entity) }
}
```

### Spy
```typescript
const loggerSpy = {
  info: jest.fn(),
  error: jest.fn(),
}
expect(loggerSpy.error).toHaveBeenCalledWith('Payment failed', expect.any(Error))
```

## Naming Conventions

### Test Method Names
```typescript
// Pattern: [method]_[scenario]_[expected behavior]
it('calculateTotal_withEmptyCart_returnsZero')
it('calculateTotal_withCoupon_appliesDiscount')
it('calculateTotal_withExpiredCoupon_throwsError')

// Or: should_[expected]_when_[scenario]
it('should_return_zero_when_cart_is_empty')
it('should_apply_discount_when_coupon_is_valid')
```

### File Names
- `*.test.ts` or `*.spec.ts`
- Mirror source file structure
- Group by feature or module

## Test Organization

### Inside a Test File
```typescript
describe('ModuleName', () => {
  describe('success cases', () => {
    it('handles basic scenario', () => {})
    it('handles edge case', () => {})
  })

  describe('error cases', () => {
    it('throws on invalid input', () => {})
    it('handles missing dependency', () => {})
  })
})
```

## Coverage Guidelines

| Metric | Target | Notes |
|--------|--------|-------|
| Line coverage | > 80% | Not all files need 100% |
| Branch coverage | > 70% | Focus on conditional logic |
| Mutation score | > 60% | Tests kill mutants reliably |
| Test-to-code ratio | 1:3 | 1 test file per 3 source files |

## Anti-Patterns

- Testing implementation details instead of behavior
- Too many mocks making tests brittle
- Testing the framework/library code
- Flaky tests due to shared state
- Slow tests that discourage running
- Assertions that never fail (tautologies)
- Over-specification (too many assertions)
- Testing private methods directly
