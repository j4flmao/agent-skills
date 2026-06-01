# Jest Skill

## Overview
Jest is a JavaScript testing framework with built-in mocking, coverage, and assertions. This skill covers testing patterns, mocking strategies, code coverage, configuration, and performance optimization.

## Decision Tree: Testing Strategy

### What to Test
```
What kind of code am I testing?
├── Pure utility functions → Test inputs and outputs exhaustively
├── React/Vue/Svelte component → Render + interaction + snapshot tests
├── API route / handler → Request → response integration tests
├── Business logic / service layer → Mock data sources, test all branches
├── Side effects (DB, filesystem, network) → Mock the I/O, test the logic
├── Configuration / constants → Test only if logic depends on values
└── Third-party library → Do NOT test (trust the library; test your integration)
```

### Test Type Decision
```
Is this testing a...
├── Single function in isolation → Unit test
├── Component with children → Integration test (shallow + mount)
├── Full feature flow → Integration test
├── User journey across pages → E2E test (use Playwright/Cypress, not Jest)
└── Visual appearance → Snapshot or visual regression test
```

## Mocking Patterns

### Function Mocks
```typescript
// Module mock
jest.mock('../services/api', () => ({
  fetchUser: jest.fn(),
  updateUser: jest.fn(),
}));

import { fetchUser } from '../services/api';

// Mock return value
(fetchUser as jest.Mock).mockResolvedValue({ id: 1, name: 'Alice' });

// Mock implementation
(fetchUser as jest.Mock).mockImplementation((id: number) => {
  if (id < 0) throw new Error('Invalid ID');
  return { id, name: 'User ' + id };
});

// Mock once
(fetchUser as jest.Mock).mockResolvedValueOnce({ id: 1 })
  .mockResolvedValueOnce({ id: 2 })
  .mockRejectedValueOnce(new Error('Network error'));
```

### Partial Mocking
```typescript
// Mock only specific exports
jest.mock('../utils/helpers', () => ({
  ...jest.requireActual('../utils/helpers'),
  getUUID: jest.fn(() => 'mock-uuid-123'),
}));
```

### Timer Mocking Patterns
```typescript
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

// Pattern: Advance to next timer only
jest.advanceTimersToNextTimer();

// Pattern: Run all pending timers
jest.runAllTimers();

// Pattern: Run only pending timers (not newly created ones)
jest.runOnlyPendingTimers();

// Pattern: Mock Date
jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
```

### Mock Module with Factory
```typescript
// __mocks__/fs.ts — manual mock
const fs = jest.createMockFromModule('fs') as typeof fs;
const mockFiles = new Map<string, string>();

fs.readFileSync = (path: string) => mockFiles.get(path) || '';
fs.writeFileSync = (path: string, data: string) => mockFiles.set(path, data);

export default fs;

// Test uses mock automatically
jest.mock('fs');
```

## Configuration

### Performance Optimization
```javascript
// jest.config.js
module.exports = {
  // Parallelize tests
  maxWorkers: '50%',  // Use 50% of CPUs
  // or: maxWorkers: 4  // Fixed number

  // Cache for speed
  cache: true,
  cacheDirectory: '.jest-cache',

  // Only collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],

  // Watch mode optimization
  watchPathIgnorePatterns: ['node_modules', 'dist'],

  // Transform speed
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
};
```

### Module Resolution
```javascript
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|png|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
```

## Code Coverage

### Coverage Configuration
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/shared/utils/**/*.ts': {
      branches: 95,
      functions: 100,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
};
```

### Coverage Anti-Patterns
- **100% coverage target**: Diminishing returns; 80% line + 80% branch is practical
- **Ignoring uncovered lines**: Use `/* istanbul ignore next */` sparingly
- **Test-to-cover-coverage-only**: Tests that assert nothing meaningful
- **Skipping branch coverage**: Branch coverage catches logic errors line coverage misses
- **Not running coverage in CI**: Enforce minimum thresholds in CI pipeline

### Coverage Debugging
```bash
# Find uncovered lines
npx jest --coverage
open coverage/lcov-report/index.html

# Check specific file
npx jest --collectCoverageFrom="src/components/Button.tsx" --coverage
```

## Advanced Test Patterns

### Data-Driven Tests
```typescript
describe('validateEmail', () => {
  test.each([
    ['user@example.com', true],
    ['user.name@example.co.uk', true],
    ['no-at-sign', false],
    ['@missing-local', false],
    ['', false],
    ['a@b.c', true],
  ])('validateEmail("%s") returns %s', (input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });
});
```

### Test Organization Pattern
```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockDb: jest.Mocked<Database>;

  beforeAll(() => {
    // One-time setup (expensive operations)
  });

  beforeEach(() => {
    // Reset mocks and create fresh instances
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    userService = new UserService(mockDb);
  });

  describe('getUser', () => {
    it('returns user when found', async () => {
      mockDb.findById.mockResolvedValue({ id: 1, name: 'Alice' });
      const result = await userService.getUser(1);
      expect(result).toEqual({ id: 1, name: 'Alice' });
    });

    it('throws when user not found', async () => {
      mockDb.findById.mockResolvedValue(null);
      await expect(userService.getUser(999)).rejects.toThrow('User not found');
    });

    it('handles database error', async () => {
      mockDb.findById.mockRejectedValue(new Error('DB connection lost'));
      await expect(userService.getUser(1)).rejects.toThrow('DB connection lost');
    });
  });

  describe('createUser', () => {
    // Group related tests
  });
});
```

### Async Patterns
```typescript
// Pattern: Promise resolve/reject
await expect(asyncFn()).resolves.toEqual(expected);
await expect(asyncFn()).rejects.toThrow(errorMessage);

// Pattern: Multiple concurrent assertions
await expect(Promise.all([
  asyncFn1(),
  asyncFn2(),
])).resolves.toEqual([result1, result2]);

// Pattern: Assert function not called during async
const fn = jest.fn();
await someAsyncOperation();
expect(fn).not.toHaveBeenCalled();
```

## Snapshot Testing Patterns

### When to Use Snapshots
```
Should I use snapshots?
├── UI component rendering → YES (but keep snapshots small)
├── Configuration object → YES (version-control config changes)
├── Large API response → NO (too brittle; test specific fields)
├── Frequently changing UI → NO (use inline snapshots or toMatchObject)
└── Error messages → NO (hard to read diffs)
```

### Snapshot Best Practices
```typescript
// GOOD: Property matchers for dynamic values
expect(user).toMatchSnapshot({
  id: expect.any(Number),
  createdAt: expect.any(Date),
});

// GOOD: Inline snapshots for small values
expect(config).toMatchInlineSnapshot(`
  Object {
    "host": "localhost",
    "port": 3000,
  }
`);

// BAD: Large snapshot of data
expect(largeApiResponse).toMatchSnapshot();  // Brittle!

// GOOD: Targeted assertions instead
expect(largeApiResponse.data.users).toHaveLength(3);
expect(largeApiResponse.meta.total).toBe(100);
```

## Performance Optimization

### Slow Test Detection
```bash
# Find slowest tests
npx jest --verbose --no-cache 2>&1 | grep "●"

# Use --detectOpenHandles for async issues
npx jest --detectOpenHandles
```

### Optimization Techniques
- **Use `--onlyChanged`** during development to test only changed files
- **Avoid `beforeAll` with expensive setup** for every test file
- **Mock heavy dependencies** like database, file system, network
- **Use `jest.isolateModules()`** for module-level state testing
- **Avoid `toMatchSnapshot`** for frequently changing large objects
- **Run tests in band** (`--runInBand`) when tests are I/O heavy
- **Set `testTimeout`** appropriately per test, not per suite

## Key Anti-Patterns

### Testing Implementation Details
```typescript
// BAD: Testing private implementation
expect(component.instance().state.count).toBe(1);

// GOOD: Testing public behavior
fireEvent.click(screen.getByText('Increment'));
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### Flaky Tests
```typescript
// BAD: Time-dependent test
test('flaky test', async () => {
  await new Promise(r => setTimeout(r, 100));  // Never use setTimeout in tests!
  expect(something).toBe(true);
});

// GOOD: Use fake timers or waitFor
test('stable test', async () => {
  await waitFor(() => {
    expect(something).toBe(true);
  });
});
```

### Too Many Assertions
```typescript
// BAD: Testing everything in one test
test('everything', () => {
  expect(user.name).toBe('Alice');
  expect(user.email).toBe('alice@example.com');
  expect(user.role).toBe('admin');
  expect(user.createdAt).toBeDefined();
  // Hard to know what failed
});

// GOOD: One logical assertion per test
test('sets user name from input', () => { /* ... */ });
test('sets user email from input', () => { /* ... */ });
test('assigns admin role by default', () => { /* ... */ });
```

### Improper Mock Setup
```typescript
// BAD: Mock across tests without reset
jest.mock('../api');
// Test 1 modifies mock...
// Test 2 inherits modified state — flaky!

// GOOD: Reset between tests
beforeEach(() => {
  jest.resetAllMocks();  // or jest.clearAllMocks()
});
```

## Custom Reporter Integration
```javascript
// jest.config.js — combining multiple reporters
module.exports = {
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml' }],
    ['jest-html-reporter', { outputPath: 'reports/test-report.html' }],
  ],
};
```

## Debugging Tests
```bash
# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
npx jest --testNamePattern="should handle edge case" --runInBand

# Verbose output for setup/teardown issues
npx jest --verbose --detectOpenHandles
```
