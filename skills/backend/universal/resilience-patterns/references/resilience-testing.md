# Resilience Testing

Resilience testing verifies that fault-tolerance patterns work correctly under failure conditions.

## Chaos Testing for Dependencies

Inject failures into external dependencies:

```typescript
class ChaosInterceptor {
  private rules: ChaosRule[] = [];

  addRule(rule: ChaosRule): void {
    this.rules.push(rule);
  }

  async intercept<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const rule = this.rules.find(r => r.dependency === name && r.active);
    if (rule && rule.shouldInject()) {
      rule.inject(); // throw timeout, error, or delay
    }
    return fn();
  }
}

// Usage in tests
it('should open circuit breaker after 5 failures', async () => {
  const chaos = new ChaosInterceptor();
  chaos.addRule({
    dependency: 'payment-service',
    active: true,
    shouldInject: () => true,
    inject: () => { throw new Error('Service unavailable'); },
  });

  const wrapped = chaos.intercept('payment-service', paymentService.charge);
  for (let i = 0; i < 6; i++) {
    await expect(wrapped(validRequest)).rejects.toThrow();
  }
  // Circuit breaker should now be OPEN
  await expect(wrapped(validRequest)).rejects.toThrow('Circuit breaker open');
});
```

## Fault Injection Matrix

Test all combinations of failures:

```typescript
const FAULT_SCENARIOS = [
  { name: 'timeout', inject: () => delay(30000), expected: 'Timeout' },
  { name: 'error_500', inject: () => { throw new HttpError(500); }, expected: 'Server error' },
  { name: 'error_503', inject: () => { throw new HttpError(503); }, expected: 'Service unavailable' },
  { name: 'connection_refused', inject: () => { throw new Error('ECONNREFUSED'); }, expected: 'Connection refused' },
  { name: 'slow_response', inject: () => delay(5000), expected: 'Timeout' },
];

describe('Resilience to all fault types', () => {
  FAULT_SCENARIOS.forEach(({ name, inject, expected }) => {
    it(`should handle ${name} gracefully`, async () => {
      mockExternalService.mockImplementation(inject);
      const result = await resilientCall();
      expect(result).toMatchObject({ fallback: true, reason: expected });
    });
  });
});
```

## Retry Behavior Verification

Test retry count, backoff, and jitter:

```typescript
describe('Retry behavior', () => {
  it('should retry exactly 3 times on transient failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('transient'));
    await expect(
      retry(fn, { maxAttempts: 3 })
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 4xx errors', async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(400));
    await expect(
      retry(fn, { maxAttempts: 3 })
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff with jitter', async () => {
    const timestamps: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      throw new Error('transient');
    });
    await expect(retry(fn, { maxAttempts: 4, baseDelay: 100 })).rejects.toThrow();

    const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);
    // Expected: ~200, ~400, ~800 with jitter
    expect(intervals[0]).toBeGreaterThan(50);
    expect(intervals[0]).toBeLessThan(350);
    expect(intervals[1]).toBeGreaterThan(200);
    expect(intervals[2]).toBeGreaterThan(400);
  });
});
```

## Circuit Breaker State Transitions

Verify state machine behavior:

```typescript
describe('Circuit breaker state machine', () => {
  it('should transition CLOSED -> OPEN -> HALF_OPEN -> CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, successThreshold: 2, waitDuration: 1000 });

    expect(cb.state).toBe('CLOSED');
    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow();
    }
    expect(cb.state).toBe('OPEN');

    await delay(1200); // wait for half-open
    expect(cb.state).toBe('HALF_OPEN');

    await cb.call(successFn);
    expect(cb.state).toBe('HALF_OPEN'); // need 2 successes

    await cb.call(successFn);
    expect(cb.state).toBe('CLOSED');
  });
});
```

## Fallback Verification

Test that fallbacks return correct degraded responses:

```typescript
describe('Fallback behavior', () => {
  it('should return stale data when service is down', async () => {
    const staleData = { id: 1, name: 'cached-product' };
    cache.set('product:1', staleData);

    mockApi.rejectOnce(new Error('down'));
    const result = await getProductWithFallback(1);

    expect(result).toEqual(staleData);
    expect(result._metadata).toMatchObject({ source: 'cache', stalenessMs: expect.any(Number) });
  });
});
```

## Key Points
- Use chaos interceptors to inject failures in tests
- Test all fault types: timeout, 5xx, connection errors
- Verify retry count, backoff intervals, and non-retryable errors
- Test circuit breaker state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
- Verify fallback returns correct degraded responses
- Test timeout propagation through nested calls
- Verify bulkhead isolation prevents cascading failures
