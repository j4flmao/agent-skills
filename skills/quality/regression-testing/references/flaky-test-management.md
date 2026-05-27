# Flaky Test Management

## Overview

Flaky tests are tests that non-deterministically pass and fail without code changes. They erode confidence in the test suite, hide real bugs, and waste developer time. This reference covers identification, root causes, quarantine workflows, and systematic fixes for flaky tests.

## Flaky Test Identification

### Automated Flaky Detection

```typescript
// Run tests multiple times to detect flakiness
// vitest-flaky-reporter.config.ts
export default {
  // Run each test N times
  flaky: {
    retries: 10,
    // Mark as flaky if fails at least once
    threshold: 1,
    // Report only flaky tests
    reportOnly: true,
  },
}
```

```bash
# CI flaky detection job
npx vitest --reporter=flaky --retry=0 --repeat-each=5

# Detect flaky tests in last 10 CI runs
npx flaky-detector --ci-runs=10 --token=$GITHUB_TOKEN --repo=myorg/myrepo
```

### CI Flaky Test Tracking

```yaml
# .github/workflows/flaky-detection.yml
name: Flaky Test Detection
on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run tests with repeat
        run: npx vitest --reporter=flaky --repeat-each=10 --retry=0
      - name: Report flaky tests
        if: always()
        run: |
          echo "## Flaky Test Report" >> $GITHUB_STEP_SUMMARY
          cat flaky-report.json >> $GITHUB_STEP_SUMMARY
```

### Metrics for Identification

| Metric | How to Measure | Threshold for Concern |
|--------|---------------|----------------------|
| Pass rate over last 10 runs | `passes / total_runs` | < 90% |
| Consecutive failures | Number of runs with different results | Any alternation |
| Duration variance | Standard deviation of test duration | > 2x mean duration |
| CI failure rate | % of CI runs with unrelated test failures | > 5% |
| Test quarantine rate | Tests in quarantine per sprint | Increasing trend |

## Root Causes

### Timing Issues

```typescript
// FLAKY: Race condition — assumes async operation completes immediately
it('should show notification after save', async () => {
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  // BUG: No wait — notification might not appear yet
  expect(screen.getByText(/saved/i)).toBeInTheDocument()
})

// FIXED: Proper async wait
it('should show notification after save', async () => {
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(await screen.findByText(/saved/i)).toBeInTheDocument()
})
```

### Test Ordering Dependencies

```typescript
// FLAKY: Test relies on state set by previous test
describe('UserDashboard', () => {
  let savedUser: User

  it('should create user', async () => {
    savedUser = await createUser({ name: 'Alice' })
    expect(savedUser.id).toBeDefined()
  })

  it('should display user dashboard', () => {
    // BUG: Depends on savedUser from previous test!
    render(<UserDashboard userId={savedUser.id} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
```

### Shared State

```typescript
// FLAKY: Tests modify shared mutable state
const testDb = new InMemoryDatabase()

beforeEach(() => {
  // BUG: Not resetting between tests
})

it('should create user', async () => {
  await testDb.createUser({ name: 'Alice' })
  expect(testDb.count()).toBe(1)
})

it('should create another user', async () => {
  // Fails if previous test already created a user
  await testDb.createUser({ name: 'Bob' })
  expect(testDb.count()).toBe(1) // Actual: 2
})
```

### Async Operations

```typescript
// FLAKY: Unhandled promise rejections
it('should handle API error', () => {
  // BUG: Missing await — test passes before promise settles
  expect(async () => {
    await fetchUser(999)
  }).toThrow()
})
```

### Environment-Specific

```typescript
// FLAKY: Depends on specific environment
it('should resolve to localhost in dev', () => {
  // BUG: Depends on process.env.NODE_ENV
  const url = getApiUrl()
  expect(url).toContain('localhost')
})

// FIXED: Mock environment
it('should resolve to localhost in dev', () => {
  vi.stubEnv('NODE_ENV', 'development')
  const url = getApiUrl()
  expect(url).toContain('localhost')
  vi.unstubAllEnvs()
})
```

### Test Data Collisions

```typescript
// FLAKY: Tests use same data without cleanup
const USER_EMAIL = 'test@example.com'

it('should register new user', async () => {
  await registerUser({ email: USER_EMAIL })
  expect(await findUser(USER_EMAIL)).toBeDefined()
})

it('should login existing user', async () => {
  // BUG: May or may not exist depending on test order
  const result = await login(USER_EMAIL, 'password')
  expect(result.success).toBe(true)
})
```

## Quarantine Workflow

### Quarantine Process

```
Test identified as flaky
    ↓
Flag in test report (auto-detected or manual report)
    ↓
Move to quarantine suite (within 48 hours)
    ↓
Investigate root cause (assigned to team)
    ↓
Fix identified?
    ├── Yes → Fix and verify in quarantine for 5 runs
    └── No → Document known flakiness, add retry as last resort
    ↓
Fix verified (5 consecutive green runs)?
    ├── Yes → Return to main suite
    └── No → Keep in quarantine, reassign
    ↓
Clean up if unfixable after 30 days → Remove test
```

### Quarantine Implementation

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.quarantine.test.ts'],
  },
})
```

```yaml
# Quarantine workflow
name: Quarantine Tests
on:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  quarantine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run quarantined tests
        continue-on-error: true
        run: npx vitest run --include='**/*.quarantine.test.ts'
      - name: Check if tests have been stable
        run: |
          # If quarantined tests pass 5x in a row, create PR to unquarantine
          if [ "${{ steps.run-tests.outcome }}" == "success" ]; then
            echo "Tests stable — ready for unquarantine review"
          fi
```

### Quarantine Tag

```typescript
// Use tags for quarantine
describe('Payment Processing', { tags: ['quarantine'] }, () => {
  it('should process refund', async () => {
    // Flaky test waiting for fix
  })
})
```

## Flaky Test Dashboard

### Dashboard Metrics

```typescript
interface FlakyTestRecord {
  testName: string
  filePath: string
  firstDetected: Date
  lastSeen: Date
  passRate: number  // Percentage over last 20 runs
  totalRuns: number
  failures: number
  rootCause?: string
  status: 'investigating' | 'fixing' | 'fixed' | 'quarantined' | 'removed'
  assignee?: string
  daysInQueue: number
}
```

### Sample Dashboard Data

```json
{
  "flakyTests": [
    {
      "testName": "should process refund notification",
      "filePath": "src/payments/refund.test.ts",
      "passRate": 65,
      "totalRuns": 20,
      "failures": 7,
      "rootCause": "timing_async",
      "status": "investigating",
      "assignee": "alice@example.com",
      "daysInQueue": 3
    },
    {
      "testName": "should load user dashboard",
      "filePath": "src/users/dashboard.test.ts",
      "passRate": 82,
      "totalRuns": 20,
      "failures": 3,
      "rootCause": "shared_state",
      "status": "quarantined",
      "assignee": "bob@example.com",
      "daysInQueue": 5
    }
  ],
  "summary": {
    "totalFlaky": 12,
    "quarantined": 5,
    "investigating": 4,
    "fixed": 2,
    "removed": 1,
    "avgDaysInQueue": 4.5,
    "flakyRate": "3.2%"
  }
}
```

### CI Gate Configuration

```yaml
# Allow flaky test failures to pass CI
# but track and report them
jobs:
  test:
    steps:
      - run: npm test
        continue-on-error: true  # Don't block PR for flaky tests
      - name: Report flaky tests
        if: always()
        run: |
          node scripts/report-flaky-tests.js
```

## Fixing Strategies

### Fix Timing Issues

```typescript
// FLAKY: Fixed timeout assumptions
it('should load data within timeout', async () => {
  // BUG: Hardcoded timeout might not be enough
  await new Promise((r) => setTimeout(r, 100))
  expect(screen.getByText(/data/i)).toBeInTheDocument()
})

// FIXED: Use waitFor with proper timeout
it('should load data within timeout', async () => {
  await waitFor(() => {
    expect(screen.getByText(/data/i)).toBeInTheDocument()
  }, { timeout: 5000 })
})

// OR use findBy queries which include built-in waiting
it('should load data', async () => {
  expect(await screen.findByText(/data/i)).toBeInTheDocument()
})
```

### Fix Async Issues

```typescript
// FLAKY: Promise not properly awaited
it('should complete async operation', async () => {
  const promise = doAsyncWork()
  // BUG: Not awaiting the promise
  promise.then((result) => {
    expect(result).toBe('done')
  })
})

// FIXED: Proper async/await
it('should complete async operation', async () => {
  const result = await doAsyncWork()
  expect(result).toBe('done')
})
```

### Fix Shared State

```typescript
// FIXED: Isolate test state
describe('UserOperations', () => {
  let testDb: InMemoryDatabase

  beforeEach(() => {
    testDb = new InMemoryDatabase() // Fresh instance per test
  })

  it('should create user', async () => {
    await testDb.createUser({ name: 'Alice' })
    expect(testDb.count()).toBe(1)
  })

  it('should create another user', async () => {
    await testDb.createUser({ name: 'Bob' })
    expect(testDb.count()).toBe(1) // Works — fresh DB
  })
})
```

### Fix Test Isolation

```typescript
// FIXED: Each test creates its own data
describe('UserProfile', () => {
  it('should display user name', () => {
    render(<UserProfile user={{ id: 1, name: 'Alice' }} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('should handle missing user', () => {
    render(<UserProfile user={null} />)
    expect(screen.getByText(/user not found/i)).toBeInTheDocument()
  })
})
```

### Fix Network Mocking

```typescript
// FIXED: Proper MSW handler isolation
import { server } from '../mocks/server'

afterEach(() => {
  server.resetHandlers() // Reset to global handlers
})

it('should handle API error', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  render(<UserList />)
  expect(await screen.findByText(/error/i)).toBeInTheDocument()
})
```

### Fix External Dependency Mocking

```typescript
// FIXED: Mock external time-dependent calls
it('should calculate relative time', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-26T12:00:00Z'))

  const result = getRelativeTime(new Date('2026-05-26T11:00:00Z'))
  expect(result).toBe('1 hour ago')

  vi.useRealTimers()
})
```

## Retries as Last Resort

### Configuring Retries

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    retry: 0, // Default: no retries. Only add for specific cases.
  },
})
```

```typescript
// Per-test retry (last resort)
it('should eventually succeed', { retry: 3 }, async () => {
  // Only use retries if the root cause cannot be fixed
  // Document why retry is needed
})
```

### Retry Rules

1. **Retries are not a fix** — they mask the underlying problem
2. **Document the reason** for every retried test
3. **Set a maximum retry budget** (e.g., < 5% of tests may have retries)
4. **Track retried tests** separately in flaky dashboard
5. **Retries are a temporary measure** — set a 30-day deadline to fix

### Retry Budget

| Metric | Threshold | Action |
|--------|-----------|--------|
| % of tests with retries | < 5% | Warn if exceeded |
| Total retry count per CI run | < 20 | Flag for review |
| Tests needing retries for > 30 days | 0 | Force remove or fix |
| Retry success rate | > 50% | If retries rarely help, remove retry |

## CI Flaky Test Gates

### Flaky Gate Configuration

```yaml
# CI pipeline with flaky gate
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
      - name: Flaky Gate
        if: always()
        run: |
          # Block PR if flaky test count exceeds threshold
          FLAKY_COUNT=$(node scripts/count-flaky.js)
          MAX_FLAKY=5
          if [ "$FLAKY_COUNT" -gt "$MAX_FLAKY" ]; then
            echo "Too many flaky tests ($FLAKY_COUNT > $MAX_FLAKY)"
            exit 1
          fi
```

### Flaky Test PR Comment

When a PR introduces or re-introduces a flaky test, auto-comment:

```
⚠️ **Flaky Test Detected**

The following test(s) in this PR appear to be flaky:
- `should process refund` (pass rate: 65% over last 10 runs)

**Action required:** Please investigate and fix before merging.
If this is a pre-existing flaky test, it will be quarantined automatically.
```

## Flaky Test Budget

### Budget Allocation

| Team Size | Max Flaky Tests | Max Retry Rate | Quarantine SLA |
|-----------|----------------|----------------|----------------|
| Small (< 10 engineers) | 5 | 2% | 48 hours |
| Medium (10-50 engineers) | 20 | 3% | 48 hours |
| Large (> 50 engineers) | 50 | 5% | 48 hours |

### Enforcement

```yaml
# If flaky budget exceeded, block deployments
name: Flaky Budget Check
on: [deployment]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          FLAKY_COUNT=$(curl -s https://dashboard/metrics/flaky-count)
          MAX_FLAKY=20
          if [ "$FLAKY_COUNT" -gt "$MAX_FLAKY" ]; then
            echo "Flaky budget exceeded - deployment blocked"
            exit 1
          fi
```

## Flaky Test Reporting

### Weekly Report Template

```markdown
## Flaky Test Report — Week of [Date]

### Summary
- Total flaky tests: [N] ([trend: ↑↓→])
- Quarantined: [N]
- Fixed this week: [N]
- Newly detected: [N]
- Average time to fix: [N] days

### Top Flaky Tests
| Test | Pass Rate | Root Cause | Status | Owner |
|------|-----------|------------|--------|-------|
| test name | 65% | timing | investigating | @alice |
| test name | 72% | shared state | quarantined | @bob |

### Flaky Rate by Team
| Team | Flaky Tests | Total Tests | Flaky Rate |
|------|-------------|-------------|------------|
| Payments | 5 | 200 | 2.5% |
| Users | 3 | 150 | 2.0% |

### Recommendations
1. Schedule a flaky test fix session
2. Review async patterns in payment tests
3. Add test isolation review to PR checklist
```

## Preventing Flaky Tests

### Code Review Checklist

```
[ ] Test does not depend on test execution order
[ ] Test uses await/async correctly (no unhandled promises)
[ ] Test uses findBy/waitFor for async elements (not getBy)
[ ] No shared mutable state between tests
[ ] Each test creates its own test data
[ ] Mock/API handlers are reset between tests
[ ] No hardcoded timeouts — use waitFor instead
[ ] No dependencies on specific environment variables
[ ] Tests are idempotent — can run multiple times
[ ] No Math.random(), Date.now() without mocking
```

### Automated Prevention

```typescript
// ESLint plugin for flaky test patterns
// eslint-plugin-no-flaky
module.exports = {
  rules: {
    'no-flaky/no-get-by-without-await': 'error',
    'no-flaky/no-shared-state': 'warn',
    'no-flaky/no-hardcoded-timeout': 'warn',
    'no-flaky/require-after-each-reset': 'error',
  },
}
```

## Key Points

- Flaky tests erode confidence, hide real bugs, and waste time
- Common root causes: timing, shared state, async, test ordering, environment
- Quarantine flaky tests within 48 hours — never leave them in the main suite
- Use automated detection with repeated test execution in CI
- Fix root causes: proper async waiting, isolated state, reset mocks
- Retries are a last resort and must be documented — they mask problems
- Track flaky tests in a dashboard with pass rates, root causes, and owners
- Set a flaky test budget and enforce it at the CI gate
- Weekly reporting keeps the team accountable
- Prevention through code review checks and automated lint rules is most effective
