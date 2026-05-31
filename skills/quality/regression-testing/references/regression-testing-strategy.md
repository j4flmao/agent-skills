# Regression Testing: Strategy and Decision Frameworks

## Overview

This reference provides tactical guidance on regression test strategy, including test selection decision frameworks, prioritization models, flaky test management workflows, and optimization patterns. It complements the architecture reference by focusing on practical day-to-day decisions for regression test management.

## Core Architecture Concepts

### Regression Decision Flow

Every regression test decision follows a structured flow:

```
Code Change Occurs
  │
  ├── What changed? (files, modules, features)
  ├── How risky is the change? (risk assessment)
  ├── What is affected? (impact analysis)
  ├── What should we test? (test selection)
  ├── In what order? (prioritization)
  ├── How much time? (time budget)
  ├── Did we miss anything? (coverage gap analysis)
  └── What did we learn? (feedback loop)
```

### Risk Model Architecture

The risk model is the core decision engine for regression testing:

```
Risk = f(ChangeImpact, BusinessCriticality, HistoricalFailureRate, Complexity, MaintenanceArea)

Components:
  ChangeImpact:
    - Files modified count
    - Module centrality (number of dependents)
    - Change type (new feature, bug fix, refactor, dependency update)

  BusinessCriticality:
    - Revenue impact if broken
    - User impact (number of affected users)
    - Regulatory/compliance impact

  HistoricalFailureRate:
    - Number of bugs found in this area
    - Test failure frequency
    - Production incident frequency

  Complexity:
    - Cyclomatic complexity of changed code
    - Number of branches/paths
    - Dependencies count

  MaintenanceArea:
    - Age of code (newer = riskier)
    - Number of authors
    - Recent change frequency
```

### Suite Composition Architecture

The regression suite is composed of tests from different sources:

```
Regression Suite = Selected Unit Tests +
                   Selected Integration Tests +
                   Selected E2E Tests +
                   Historical Bug Regression Tests +
                   Security Regression Tests +
                   Performance Regression Tests

Each with different:
  - Selection criteria
  - Priority model
  - Execution cadence
  - Time budget allocation
```

## Architecture Decision Trees

### Decision Tree 1: What to Regress

```
Does the change modify production code?
├── YES → Impact analysis
│   ├── Does it change a core business function?
│   │   ├── YES → Full regression of that function's tests
│   │   └── NO → Targeted regression of changed modules
│   ├── Does it change infrastructure?
│   │   ├── YES → Database/infrastructure regression
│   │   └── NO → Skip infrastructure regression
│   └── Does it add new functionality?
│       ├── YES → Full regression + new functionality tests
│       └── NO → Focused regression only
└── NO → Does it change tests or config only?
    ├── YES → Run only affected test files
    └── NO → No regression needed
```

### Decision Tree 2: Time-Boxed Regression

```
Available time for regression?
├── < 5 minutes → Smoke tests only
│   └── Critical path, authentication, main workflows
├── 5-30 minutes → Core regression
│   ├── Smoke tests (guaranteed to run)
│   └── Highest-risk integration tests
├── 30-120 minutes → Extended regression
│   ├── Core regression
│   ├── All integration tests
│   └── Targeted E2E tests
└── 2+ hours → Full regression
    ├── All unit tests
    ├── All integration tests
    ├── E2E tests
    └── Performance baselines
```

### Decision Tree 3: Flaky Test Handling

```
Is the test flaky (non-deterministic)?
├── YES → Is the flakiness rate > 5%?
│   ├── YES → Immediate quarantine
│   └── NO → Monitor for 1 week
│       ├── Flakiness persists → Quarantine
│       └── Resolved → Keep in suite
└── NO → Is it a new failure?
    ├── YES → Is it caused by the recent change?
    │   ├── YES → Block the change
    │   └── NO → Investigate environmental issue
    └── NO → Keep monitoring
```

## Implementation Strategies

### Test Selection Implementation Strategy

```typescript
// Strategy pattern for test selection
interface TestSelectionStrategy {
  name: string
  selectTests(changedFiles: string[], allTests: TestDef[]): TestDef[]
}

class AllTestsStrategy implements TestSelectionStrategy {
  name = 'run-all'
  selectTests(_, allTests) { return allTests }
}

class DependencyGraphStrategy implements TestSelectionStrategy {
  name = 'dependency-graph'
  private graph: DependencyGraph

  selectTests(changedFiles: string[], allTests: TestDef[]) {
    const affectedFiles = this.graph.findAffected(changedFiles)
    const affectedModules = new Set(affectedFiles)
    return allTests.filter(t =>
      t.coveredFiles.some(f => affectedModules.has(f))
    )
  }
}

class RiskBasedStrategy implements TestSelectionStrategy {
  name = 'risk-based'
  private riskModel: RiskModel

  selectTests(changedFiles: string[], allTests: TestDef[]) {
    const scored = allTests.map(t => ({
      test: t,
      risk: this.riskModel.calculateRisk(t, changedFiles)
    }))
    const threshold = this.calculateThreshold(scored)
    return scored
      .filter(s => s.risk >= threshold)
      .map(s => s.test)
  }
}
```

### Prioritization Implementation

```typescript
// Multi-factor prioritization
interface PriorityFactors {
  risk: number           // 0-1
  criticality: number    // 0-1
  speed: number          // 0-1 (higher = faster)
  failureRate: number    // 0-1
  coverage: number       // 0-1
}

function calculatePriority(factors: PriorityFactors): number {
  return (
    factors.risk * 0.3 +
    factors.criticality * 0.25 +
    factors.failureRate * 0.2 +
    factors.speed * 0.15 +
    factors.coverage * 0.1
  )
}

function prioritizeTests(
  tests: TestDef[],
  timeBudget: number
): TestDef[] {
  const scored = tests.map(t => ({
    test: t,
    priority: calculatePriority(t.priorityFactors)
  }))

  // Sort by priority descending
  scored.sort((a, b) => b.priority - a.priority)

  // Respect time budget
  let elapsed = 0
  const selected: TestDef[] = []
  for (const { test, priority } of scored) {
    if (elapsed + test.estimatedTime <= timeBudget) {
      selected.push(test)
      elapsed += test.estimatedTime
    }
  }

  return selected
}
```

## Integration Patterns

### CI Integration Pattern

```yaml
regression:
  stage: test
  script:
    # Step 1: Detect changes
    - git diff --name-only HEAD~1 > changed-files.txt

    # Step 2: Select tests
    - node scripts/select-regression-tests.js \
        --changed-files changed-files.txt \
        --output selected-tests.txt

    # Step 3: Run selected tests
    - npx vitest --testPathPattern=$(cat selected-tests.txt | tr '\n' '|')

    # Step 4: Check for flaky tests
    - node scripts/check-flakiness.js --run-id=$CI_RUN_ID

    # Step 5: Report results
    - node scripts/report-regression.js
```

### Historical Data Integration

Regression decisions improve with historical data:

```typescript
interface HistoricalData {
  failures: Record<string, {
    count: number
    lastFailure: Date
    firstFailure: Date
    relatedChanges: string[]
  }>
  executionTimes: Record<string, number[]>
  flakiness: Record<string, number>  // per-test flakiness rate
  coverage: Record<string, string[]>  // test → covered files
}

function updateHistoricalData(testRun: TestRunResult) {
  for (const test of testRun.results) {
    if (test.failed) {
      historicalData.failures[test.name] ??= {
        count: 0, lastFailure: new Date(),
        firstFailure: new Date(), relatedChanges: []
      }
      historicalData.failures[test.name].count++
      historicalData.failures[test.name].lastFailure = new Date()
      historicalData.failures[test.name].relatedChanges.push(
        ...testRun.changedFiles
      )
    }
    historicalData.executionTimes[test.name].push(test.duration)
  }
}
```

## Performance Optimization

### Execution Time Reduction

| Strategy | Reduction | Implementation |
|----------|-----------|----------------|
| Deduplicate tests | 10-30% | Remove tests covering same logic |
| Consolidate test data setup | 20-40% | Share fixtures across tests |
| Parallel execution | N-cores | Shard across workers |
| Remove obsolete tests | 5-20% | Audit dead test coverage |
| Reduce test data volume | 10-30% | Fewer records per test |
| Use incremental compilation | 20-50% | Cache compiled test output |

### Flaky Test Budget

Allocate sprint capacity for flaky test management:
- Sprint 1-2: 10% capacity for flaky test fixes
- Sprint 3+: 5% capacity for ongoing flaky test management
- Zero-tolerance for critical path flaky tests
- Monthly flaky test review and cleanup

## Security Considerations

### Regression Security

- Regression test selection must not exclude security tests for security-sensitive changes
- Security regression tests should run even for unrelated changes (defense in depth)
- Regression test reports must not expose vulnerability details
- Historical failure data must be protected from unauthorized access

### Safe Rollback Validation

Regression tests should validate that rollbacks work:
- Test that rollback scripts execute successfully
- Test that data integrity is preserved after rollback
- Test that the system is operational after rollback
- Include rollback in regression suite for database migrations

## Operational Excellence

### Regression Runbook

Standard operating procedure for regression failures:

```
1. Regression test fails
2. Identify if failure is real or flaky:
   a. Re-run the failing test 3 times
   b. All 3 fail → real failure
   c. Any pass → flaky test
3. If real failure:
   a. Correlate with recent changes
   b. Identify root cause
   c. Block deployment or rollback
   d. Commit fix with regression test
4. If flaky:
   a. Quarantine the test
   b. Create ticket for investigation
   c. Fix within current sprint
5. Update regression database
```

### Dashboard Metrics

Key metrics for regression testing dashboards:
- Regression pass rate over time
- Suite execution time trend
- Test selection efficiency (selected / total)
- Flaky test count and trend
- Risk coverage percentage
- False negative rate (bugs found in released code)

## Testing Strategy

### Regression Test Addition Protocol

When adding a new test to the regression suite:

1. Verify it tests a unique scenario (no existing test covers it)
2. Ensure it is deterministic (same result every time)
3. Measure its execution time (< 5 seconds or justify)
4. Add it to the appropriate layer (smoke, core, full)
5. Assign a risk score based on the feature's criticality
6. Map it to the covered source files for test selection
7. Run it 10 times to verify it's not flaky
8. Add to CI and monitor for 1 week

### Regression Test Retirement Protocol

When removing a test from the regression suite:

1. Verify the tested functionality no longer exists or is no longer relevant
2. Confirm no other test covers the same scenario
3. Check historical data — has this test caught any bugs recently?
4. Document the retirement rationale
5. Archive the test in a separate branch (not deleted)
6. Update test selection coverage maps
7. Run full regression to confirm nothing breaks

## Common Pitfalls

1. **Running all tests always**: As the suite grows, running everything takes too long. Invest in test selection early
2. **Ignoring historical data**: Past failures are the best predictor of future failures. Use the data
3. **No risk-based prioritization**: Every test is treated equally, so critical tests may not run under time constraints
4. **Flaky test accumulation**: Allowing flaky tests to remain in the suite creates noise and erodes trust
5. **No quarantine process**: Flaky tests should be quarantined, not just retried automatically
6. **Test selection without recall tracking**: If you never check what was missed, you don't know what risks you're taking
7. **Brittle selection rules**: Selection based on hardcoded file lists breaks as the codebase evolves
8. **Ignoring test maintenance**: Tests that are never reviewed become obsolete or misleading
9. **Manual regression processes**: Manual regression is slow, expensive, and error-prone
10. **No feedback loop**: Without measuring regression effectiveness, you can't improve it

## Key Takeaways

- Regression testing is risk management: invest effort proportional to risk
- Use test selection to focus on the highest-risk areas within time constraints
- Prioritize tests by risk score (business criticality + failure probability + change impact)
- Quarantine flaky tests immediately with a fix-it ticket in the current sprint
- Track regression metrics: pass rate, execution time, flakiness, risk coverage
- Base test selection on dependency graphs and historical failure data
- Use time budgets with priority ordering for constrained execution windows
- Add regression tests for every bug fix to prevent re-introduction
- Regularly audit the regression suite for obsolete, redundant, or dead tests
- Create a feedback loop: analyze missed bugs and improve test selection
