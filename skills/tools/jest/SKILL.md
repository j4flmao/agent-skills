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

## Advanced Patterns

### Test Structure Decision Tree
```
What are you testing?
├── Unit (single function/module)
│   ├── Pure function: test(input → expected output)
│   ├── Side-effect: spy on calls, test interactions
│   │   └── jest.spyOn(service, 'sendEmail').mockResolvedValue(true)
│   └── Error handling: test throws/rejects
│       └── expect(() => parse(null)).toThrow('Invalid input')
├── Integration (module + dependencies)
│   ├── Database: use testcontainers or in-memory DB
│   │   └── Setup DB connection in beforeAll, teardown in afterAll
│   ├── HTTP API: use supertest
│   │   └── request(app).post('/users').send(body).expect(201)
│   └── File system: use memfs or temp dirs
│       └── mkdtempSync, write in test, cleanup in afterEach
├── Component (React/Vue component)
│   ├── Render test: snapshots or screen queries
│   ├── Interaction: fireEvent → assert DOM change
│   ├── Async: waitFor, findBy queries
│   └── Error state: test fallback UI
└── E2E (whole system)
    ├── Use Cypress/Playwright, not Jest
    └── Jest unit tests for business logic, e2e for user flows
```

### Snapshot Testing Best Practices
```javascript
// Good: small, focused snapshots
test('renders user avatar', () => {
  const { container } = render(<Avatar user={mockUser} />);
  expect(container.firstChild).toMatchSnapshot();
});

// Bad: large, comprehensive snapshots hiding real bugs
test('renders entire dashboard', () => {
  const { container } = render(<Dashboard />);
  expect(container).toMatchSnapshot(); // 2000+ line snapshot
});

// Inline snapshots (no external file needed)
test('formats date correctly', () => {
  expect(formatDate('2024-01-15')).toMatchInlineSnapshot(`"Jan 15, 2024"`);
});

// Property-based snapshots — match only specific attributes
test('button has correct variant', () => {
  const { container } = render(<Button variant="primary" />);
  expect(container.querySelector('button')).toMatchSnapshot({
    className: expect.stringMatching(/btn-primary/)
  });
});
```

### Mocking Strategies by Context

**API calls**:
```javascript
// Mock at module level (automatic)
jest.mock('../api/users');
import { fetchUsers } from '../api/users';

// Mock return value
fetchUsers.mockResolvedValue([{ id: 1, name: 'Alice' }]);

// Mock implementation once
fetchUsers.mockImplementationOnce(() =>
  Promise.resolve([{ id: 2, name: 'Bob' }])
);

// Mock module partially
jest.mock('../api/config', () => ({
  ...jest.requireActual('../api/config'),
  API_KEY: 'test-key',
}));
```

**Timers (setTimeout, setInterval)**:
```javascript
jest.useFakeTimers();

test('debounce delays execution', () => {
  const fn = jest.fn();
  debounce(fn, 300)();
  expect(fn).not.toHaveBeenCalled();

  jest.advanceTimersByTime(300);
  expect(fn).toHaveBeenCalledTimes(1);
});

// If your code uses Date.now():
jest.setSystemTime(new Date('2024-06-15T10:00:00Z'));
```

**Network requests (nock)** — for HTTP-level mocking:
```javascript
const nock = require('nock');

afterEach(() => nock.cleanAll());

test('handles 503 from payment gateway', async () => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(503, { error: 'service_unavailable' });

  await expect(processPayment({ amount: 100 }))
    .rejects
    .toThrow('Payment service unavailable');
});
```

### Parameterized Tests
```javascript
// Data-driven tests with test.each
test.each([
  [1, 1, 2],
  [2, 3, 5],
  [5, 7, 12],
])('add(%i, %i) = %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});

// Named test table
test.each([
  { input: 'racecar', expected: true },
  { input: 'hello',   expected: false },
  { input: '',        expected: true },
])('isPalindrome("$input") returns $expected', ({ input, expected }) => {
  expect(isPalindrome(input)).toBe(expected);
});

// Only + skip variants
test.each([1, 2, 3])('value is %i', (val) => {
  expect(val).toBeGreaterThan(0);
});
```

### CI Integration Patterns

**GitHub Actions** (parallel sharding for speed):
```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx jest --shard=${{ matrix.shard }}/4

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx jest --config jest.lint.config.js --coverage
```

**CircleCI** (test splitting by timing):
```yaml
- run: npx jest --listTests --json > test_files.json
- run: npx jest --shard=$(circleci tests split test_files.json)
```

**Coverage thresholds** in `jest.config.js`:
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/core/**/*.js': {
      branches: 95,
      functions: 95,
    },
    './src/legacy/**/*.js': {
      branches: 60, // legacy code
    },
  },
};
```

### Debugging Failing Tests

**Common failures and fixes:**

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Test passes locally, fails in CI | Environment differences | Check Node version, locale, timezone. Use `--ci` flag. |
| `Cannot find module` | Module resolution mismatch | Check `moduleNameMapper` in config. Verify import paths. |
| `received: serializes to the same string` | Snapshot updated intentionally | `npx jest --updateSnapshot` or `-u` flag. Commit new snapshots. |
| Test timeout (5000ms) | Async not completing | Check `done()` called, no missing `await`, no unhandled promise rejections. Increase timeout with `jest.setTimeout(10000)`. |
| `jest.mock` doesn't work | Hoisting issue or wrong scope | `jest.mock` calls are hoisted to top of file. Can't use variables — use `jest.fn()` instead. |
| Memory leak in tests | Unclosed handles in test | Use `--detectOpenHandles` to find unclosed DB/network connections. Add `afterAll(cleanup)`. |

**Running specific test subsets:**
```bash
# By file pattern
npx jest --testPathPattern="auth|user" --coverage

# By test name
npx jest --testNamePattern="(integration|e2e)" --runInBand

# Changed files only (needs jest-changed-files or lint-staged)
npx jest --onlyChanged
npx jest --changedSince=origin/main

# Fail fast on first error
npx jest --bail

# Run tests in order without concurrency
npx jest --runInBand

# Repeat tests to find flaky ones
npx jest --repeatEach 10 --testNamePattern="flaky-test"
```

### Custom Jest Matchers (jest-extended alternatives)
```javascript
// Custom matcher for array order
expect.extend({
  toBeSortedBy(received, field, order = 'asc') {
    const sorted = [...received].sort((a, b) =>
      order === 'asc'
        ? a[field] > b[field] ? 1 : -1
        : a[field] < b[field] ? 1 : -1
    );
    const pass = JSON.stringify(received.map(r => r[field]))
                === JSON.stringify(sorted.map(r => r[field]));
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} to be sorted by ${field} ${order}`,
    };
  },
});

test('users sorted by age ascending', () => {
  expect(users).toBeSortedBy('age', 'asc');
});
```

### Performance Testing with Jest
```javascript
// Measure execution time (from Jest 27+)
test('processes 10k records under 100ms', () => {
  const start = performance.now();
  processRecords(generateMockData(10000));
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(100);
});

// Benchmark mode with jest-bench
// jest.config.js
{
  testMatch: ['**/benchmarks/**/*.bench.js'],
}
```

### Migrating from Other Test Frameworks

| Framework | Jest Equivalent | Migration Notes |
|-----------|----------------|-----------------|
| Mocha + Chai | Built-in `describe/it/expect` | Use `jest-codemods` for auto-migration |
| Jasmine | Built-in | Direct replacement — same API |
| AVA | `test.each` + `jest.fn()` | Parallel execution by default in Jest too |
| Tape | `test()` + `t.plan()` | Jest auto-detects assertion count |
| Sinon | `jest.fn()` / `jest.spyOn()` | Built-in mocking — no sinon needed |
