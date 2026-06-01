# Jest Advanced Matchers

## Overview
Jest provides extensive matchers beyond basic equality checks. Advanced matchers handle asymmetric patterns, custom matchers, snapshot testing, timers, and error handling. This reference covers Jest's full matcher API.

## Custom Matchers

### Creating Custom Matchers
```typescript
// jest.custom-matchers.ts
import { expect } from '@jest/globals';

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${floor} - ${ceiling}`
          : `Expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be a valid email`
          : `Expected "${received}" to be a valid email`,
    };
  },

  toHaveBeenCalledOnceWith(received: jest.Mock, ...expected: unknown[]) {
    const pass = received.mock.calls.length === 1 &&
      this.equals(received.mock.calls[0], expected);

    return {
      pass,
      message: () => {
        if (received.mock.calls.length !== 1) {
          return `Expected function to be called once, but was called ${received.mock.calls.length} times`;
        }
        return `Expected function to be called with ${this.utils.printExpected(expected)}, but was called with ${this.utils.printReceived(received.mock.calls[0])}`;
      },
    };
  },
});

// Usage in tests
test('custom matcher usage', () => {
  expect(5).toBeWithinRange(1, 10);
  expect('user@example.com').toBeValidEmail();
  const fn = jest.fn();
  fn('hello', 42);
  expect(fn).toHaveBeenCalledOnceWith('hello', 42);
});
```

## Asymmetric Matchers

### Partial Matching
```typescript
test('asymmetric matchers', () => {
  const user = {
    id: 123,
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: '2024-01-15T10:30:00Z',
    roles: ['admin', 'user'],
    metadata: {
      lastLogin: '2024-01-14T08:00:00Z',
      loginCount: 42,
    },
  };

  // Match any value
  expect(user).toEqual({
    id: expect.any(Number),
    name: expect.any(String),
    email: expect.stringMatching(/^[\w.]+@\w+\.\w+$/),
    createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
    roles: expect.arrayContaining(['admin']),
    metadata: expect.objectContaining({
      loginCount: expect.any(Number),
    }),
  });

  // Close to (for floating point)
  expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
});
```

## Snapshot Testing

### Inline Snapshots
```typescript
test('inline snapshot', () => {
  const config = {
    host: 'localhost',
    port: 8080,
    timeout: 5000,
    retries: 3,
  };

  expect(config).toMatchInlineSnapshot(
    { port: expect.any(Number) },
    `
    Object {
      "host": "localhost",
      "port": Any<Number>,
      "timeout": 5000,
      "retries": 3,
    }
  `
  );
});
```

### Property Matchers
```typescript
test('snapshot with dynamic values', () => {
  const user = {
    id: 123,
    name: 'Alice',
    createdAt: new Date('2024-01-15'),
    token: crypto.randomUUID(),
  };

  expect(user).toMatchSnapshot({
    id: expect.any(Number),
    createdAt: expect.any(Date),
    token: expect.any(String),
  });
});
```

## Timer Matchers

### Fake Timers
```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('timer control', () => {
  const fn = jest.fn();

  // Schedule
  setTimeout(() => fn('timeout'), 1000);
  setInterval(() => fn('interval'), 500);

  // Fast-forward time
  jest.advanceTimersByTime(500);
  expect(fn).toHaveBeenCalledWith('interval');

  jest.advanceTimersByTime(500);
  expect(fn).toHaveBeenCalledWith('timeout');
  expect(fn).toHaveBeenCalledTimes(3); // 2 intervals + 1 timeout

  // Run all pending timers
  jest.runAllTimers();
});

test('date mocking', () => {
  jest.setSystemTime(new Date('2024-06-15'));
  expect(new Date().toISOString()).toContain('2024-06-15');
});
```

## Error Matchers

### Exception Testing
```typescript
test('error matching', () => {
  // Basic error throw
  expect(() => {
    throw new Error('Invalid input');
  }).toThrow();

  // Match error message
  expect(() => {
    throw new Error('Invalid input');
  }).toThrow('Invalid input');

  // Regex matching
  expect(() => {
    throw new Error('User with id 123 not found');
  }).toThrow(/not found/);

  // Match error class
  expect(() => {
    throw new ValidationError('Name is required');
  }).toThrow(ValidationError);

  // Async error
  await expect(Promise.reject(new Error('API Error'))).rejects.toThrow('API Error');

  // Specific async pattern
  await expect(async () => {
    await api.fetchUser(999);
  }).rejects.toThrow(/user/i);
});
```

## Array and Object Matchers

### Collection Matchers
```typescript
test('collection matchers', () => {
  const items = [1, 2, 3, 4, 5];
  const users = [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'admin' },
  ];

  // Array containment
  expect(items).toContain(3);
  expect(items).not.toContain(10);

  // Array length
  expect(items).toHaveLength(5);

  // Array matching
  expect(items).toEqual(expect.arrayContaining([1, 2, 3]));

  // Object in array
  expect(users).toContainEqual({ id: 2, name: 'Bob', role: 'user' });

  // Object properties
  expect(users[0]).toHaveProperty('name');
  expect(users[0]).toHaveProperty('name', 'Alice');

  // Nested property matching
  expect(users).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ role: 'admin' }),
    ])
  );
});
```

## String Matchers

### String Pattern Matching
```typescript
test('string matchers', () => {
  const text = 'Hello, World! This is a test string.';

  // Contains
  expect(text).toContain('World');
  expect(text).not.toContain('Goodbye');

  // Length
  expect(text).toHaveLength(36);

  // Regex
  expect(text).toMatch(/^Hello/);
  expect(text).toMatch(/test/);
  expect(text).toMatch(/string\.$/);

  // Match specific patterns
  expect('user@example.com').toMatch(/^[\w.]+@\w+\.\w+$/);
  expect('2024-01-15').toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect('https://example.com').toMatch(/^https?:\/\/.+/);
});
```

## Snapshot Testing Best Practices

### When to Use Snapshots
- **UI Components**: Verify rendered output doesn't change unexpectedly
- **Configuration Objects**: Track configuration changes in version control
- **Error Messages**: Ensure error formatting is consistent
- **NOT for**: Large API responses, frequently changing data, or trivial values

### Property Matcher Pattern
```typescript
// Always use property matchers for dynamic values
expect(user).toMatchSnapshot({
  id: expect.any(Number),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  token: expect.any(String),
});
```

### Inline Snapshot Pattern
```typescript
test('configuration', () => {
  expect(getDefaultConfig()).toMatchInlineSnapshot(`
    Object {
      "host": "localhost",
      "port": 3000,
      "timeout": 5000,
    }
  `);
});
```

## Custom Matcher Patterns

### Matcher with Context
```typescript
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => {
        const not = pass ? 'not ' : '';
        return `${this.utils.matcherHint('toBeWithinRange')}

Received: ${this.utils.printReceived(received)}
Expected: ${not}within range ${this.utils.printExpected(`${floor} - ${ceiling}`)}`;
      },
      // Optional: provide actual/expected for diff view
      actual: received,
      expected: `Range: ${floor} - ${ceiling}`,
    };
  },
});
```

### Async Custom Matcher
```typescript
expect.extend({
  async toResolveWithin(received, maxMs) {
    const start = Date.now();
    try {
      await received;
      const elapsed = Date.now() - start;
      const pass = elapsed <= maxMs;
      return {
        pass,
        message: () =>
          pass
            ? `Expected promise to resolve within ${maxMs}ms, resolved in ${elapsed}ms`
            : `Expected promise to resolve within ${maxMs}ms, but it took ${elapsed}ms`,
      };
    } catch {
      return {
        pass: false,
        message: () => 'Expected promise to resolve, but it rejected',
      };
    }
  },
});
```

## Matcher Selection Decision Tree
```
What am I asserting?
├── Exact value equality → toBe (primitives), toEqual (objects)
├── Deep equality with type checking → toStrictEqual
├── Floating point → toBeCloseTo (avoid precision issues)
├── Object shape (partial match) → expect.objectContaining()
├── Array contents → expect.arrayContaining()
├── Any type → expect.any(Number), expect.any(String)
├── String pattern → toMatch (/regex/) or expect.stringMatching()
├── Error thrown → toThrow(ErrorClass), toThrow("message"), toThrow(/regex/)
├── Promise rejected → rejects.toThrow()
├── Promise resolved → resolves.toEqual()
├── Spy/mock called → toHaveBeenCalledWith(), toHaveBeenCalledTimes()
├── DOM element presence → toBeInTheDocument() (@testing-library/jest-dom)
└── Snapshot → toMatchSnapshot(), toMatchInlineSnapshot()
```

## Advanced Timer Patterns

### Date/Time Mocking
```typescript
beforeEach(() => {
  jest.useFakeTimers({
    now: new Date('2025-06-01T12:00:00Z'),
    advanceTimers: false,  // Don't auto-advance
    doNotFake: ['nextTick'],  // Don't mock process.nextTick
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.setSystemTime();  // Reset system time
});

test('specific date check', () => {
  jest.setSystemTime(new Date('2025-12-25'));
  expect(isChristmas()).toBe(true);
});

test('advance with tick', () => {
  const fn = jest.fn();
  setInterval(fn, 1000);
  jest.advanceTimersByTime(5000);
  expect(fn).toHaveBeenCalledTimes(5);
});
```

### Performance Timer Mock
```typescript
test('performance.now mock', () => {
  jest.spyOn(performance, 'now').mockImplementation(() => 1000);
  const start = performance.now();
  jest.advanceTimersByTime(500);
  performance.now.mockReturnValue(1500);
  const end = performance.now();
  expect(end - start).toBe(500);
});
```

## Key Points
- expect.extend() creates custom matchers with pass/message return
- Asymmetric matchers (expect.any, expect.objectContaining) enable partial matching
- toBeCloseTo handles floating point precision (avoid === for floats)
- toMatchInlineSnapshot embeds snapshots in test files
- Property matchers in snapshots handle dynamic values
- jest.useFakeTimers controls time-dependent code
- jest.setSystemTime mocks the current date/time
- toThrow matches exception types and messages
- toContain and toContainEqual check array membership
- toHaveProperty checks object property existence and value
- toBeInstanceOf checks constructor/class
- toMatch uses regex for string pattern matching
- toHaveLength checks array/string length
- toBeGreaterThan/toBeLessThan for numeric comparisons
- toStrictEqual deep equality with type checking
- toBeUndefined/toBeDefined for existence checks
- toBeNull/toBeNaN for specific primitive checks
- toBeTruthy/toBeFalsy for boolean coercion
- Custom matchers include diff output for debugging
- Snapshot property matchers ignore volatile fields
- Timer mocks support both legacy and modern modes
- Assertion message customization improves test failure diagnosis
- Custom matchers should provide both pass and fail messages
- Use `this.utils.printReceived` and `this.utils.printExpected` for consistent formatting
- Custom matchers can be async for promise-based assertions
- Matchers can access `this.equals` for deep equality checks
- Snapshots should be committed and reviewed like source code
