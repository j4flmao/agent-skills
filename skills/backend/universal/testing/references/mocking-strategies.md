# Mocking Strategies

## Mock Categories

| Type | Description | When to Use |
|------|-------------|-------------|
| Dummy | Passed but never used | Fill parameter lists |
| Stub | Returns predefined values | Configure test scenario |
| Spy | Records interactions | Verify calls were made |
| Mock | Pre-programmed expectations | Verify behavior |
| Fake | Lightweight working implementation | In-memory database, fake HTTP server |

## What to Mock

| Mock | Do NOT Mock |
|------|-------------|
| Repository interfaces | Repository implementations |
| External API clients | Domain entities |
| Message bus interfaces | Value objects |
| Time/date providers | Pure functions |
| Configuration | Database operations |

## Mocking by Layer

### Unit Tests (Domain/Application Layer)
```typescript
// Mock only boundary interfaces
const mockRepo = { findById: jest.fn(), save: jest.fn() };
const service = new OrderService(mockRepo);

mockRepo.findById.mockResolvedValue({ id: '123', status: 'pending' });
await service.cancelOrder('123');

expect(mockRepo.save).toHaveBeenCalledWith(
  expect.objectContaining({ status: 'cancelled' })
);
```

### Integration Tests
```typescript
// Use fake/stub for external integrations
const fakePaymentClient = {
  charge: jest.fn().mockResolvedValue({ status: 'success' }),
};

const service = new PaymentService(fakePaymentClient);
const result = await service.processPayment({ amount: 100 });

expect(fakePaymentClient.charge).toHaveBeenCalledWith({ amount: 100 });
expect(result).toEqual({ status: 'success' });
```

## Mocking Anti-Patterns

1. **Mocking domain entities**: Always use real entity instances in tests.
2. **Mocking everything**: Leads to brittle tests that break on refactoring.
3. **Over-specification**: Asserting exact call order or exact parameters when not needed.
4. **Record/playback mocks**: Tests become unreadable and coupled to implementation.
5. **No mock verification**: Not verifying that expected calls actually happened.

## Best Practices

- Mock at the boundary. Domain internals are never mocked.
- Use real objects for domain logic test.
- Verify behavior (was method called?) not implementation (how was it called?).
- Keep mock setup close to the assertion.
- Reset mocks between tests.
- Test one mock interaction per test.
