# E2E Test Flakiness Management

## What is Flakiness
A flaky test is one that passes and fails without code changes — it's non-deterministic. Flakiness erodes trust in the test suite, wastes developer time, and can mask real bugs.

## Common Flakiness Causes
| Cause | Symptom | Fix |
|-------|---------|-----|
| Timing | Test fails intermittently on CI | Replace sleep with auto-waiting |
| Race condition | Async operations not awaited | Always await async operations |
| Test pollution | Tests pass in sequence, fail alone | Isolate test data per test |
| Network variability | API response time varies | Mock external APIs |
| Browser rendering | Element not visible yet | Wait for visibility, not existence |
| Floating assertions | Assertion depends on previous test | Never share state between tests |
| Environment differences | Local passes, CI fails | Match CI env locally with Docker |

## Flakiness Detection
```typescript
// Playwright retry configuration
import { defineConfig } from '@playwright/test';
export default defineConfig({
  retries: 2,  // Retry failed tests up to 2 times
  // Or configure per-CI:
  // retries: process.env.CI ? 2 : 0,
});
```

## Flakiness Quarantine Strategy
```
Flaky test detected (> 2 failures in 10 runs)
  ↓
Flag as flaky in test reporter
  ↓
Create ticket with failure evidence
  ↓
Quarantine: skip with @flaky tag, track in dashboard
  ↓
Root cause analysis (within 1 sprint)
  ↓
Fix and verify
  ↓
Re-enable test
```

## Flakiness Monitoring
```yaml
flakiness_dashboard:
  metrics:
    - total_test_runs
    - flaky_tests_count
    - flakiness_rate: "< 0.5% target"
    - quarantine_rate: "< 1% of suite"
    - mean_time_to_diagnose: "< 24 hours"
  alerts:
    - flakiness_rate > 1%
    - more_than_5_flaky_tests_in_suite
    - same_test_flaky_3_days_in_row
```

## Key Points
- Auto-waiting eliminates most timing-related flakiness
- Isolate test data between every test
- Mock external APIs for deterministic behavior
- Retry flaky tests but track and fix them
- Quarantine persistently flaky tests
- Monitor flakiness rate and alert on increases
