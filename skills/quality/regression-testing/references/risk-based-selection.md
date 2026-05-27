# Risk-Based Test Selection

## Overview

Risk-based test selection (RBTS) optimizes regression testing by prioritizing tests based on the risk of defects in changed code. Instead of running the entire test suite on every change, RBTS selects a subset of tests most likely to detect regressions, balancing coverage against execution time.

## Core Concepts

### Risk-Based Selection Framework

```
Code Change → Impact Analysis → Risk Assessment → Test Selection → Execution → Feedback
     ↑                                                                        │
     └───────────────────────── Risk Model Update ←──────────────────────────┘
```

### Key Principles

1. **Not all changes are equal**: A configuration change has lower risk than a core algorithm rewrite
2. **Not all tests are equal**: Tests covering critical paths are more important than edge-case tests
3. **Risk changes over time**: Code that was recently changed is more likely to have bugs
4. **Coverage has diminishing returns**: The first 80% of coverage catches most bugs

## Impact Analysis

### Code Change Mapping

```typescript
interface CodeChange {
  file: string
  linesChanged: number[]
  type: 'added' | 'modified' | 'deleted'
  component: string
  riskScore: number // 1-10
}

interface ImpactMap {
  change: CodeChange
  affectedTests: string[]
  affectedFeatures: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}
```

### Change Types and Risk Levels

| Change Type | Risk Level | Description | Coverage Required |
|-------------|------------|-------------|-------------------|
| Configuration change | Low | Env vars, feature flags, constants | Smoke tests only |
| Test-only change | Low | New/updated tests, test data | None (just the test) |
| Documentation | None | Comments, README, docs | No tests needed |
| Refactoring (no behavior change) | Low | Renaming, extraction, restructuring | Core logic tests |
| Bug fix | Medium | Fixing incorrect behavior | Tests for the bug + related |
| New feature | Medium-High | Adding new functionality | All new feature tests + smoke |
| Core logic change | High | Algorithms, business rules | Full regression |
| Dependency update | Medium-High | Library/framework version bump | Integration tests |
| Database migration | High | Schema changes, data migration | Full regression + data tests |
| Security fix | Critical | Auth, encryption, access control | All security tests + full regression |
| Infrastructure change | High | Deployment, networking, scaling | Smoke + health checks |

### Dependency Graph Analysis

```typescript
interface DependencyGraph {
  nodes: Map<string, {
    type: 'file' | 'component' | 'service'
    dependencies: string[]  // What this node depends on
    dependents: string[]    // What depends on this node
    testFiles: string[]
  }>
}

// Example: Change to payment service affects:
// - Payment service tests (direct)
// - Checkout flow tests (indirect — depends on payment)
// - Order confirmation tests (indirect)
// - Invoice generation tests (indirect)
```

## Test Prioritization by Risk

### Risk Scoring Model

```typescript
function calculateTestPriority(test: Test, change: CodeChange): number {
  let score = 0

  // Direct coverage
  if (test.coversFile(change.file)) {
    score += 50
  }

  // Feature criticality
  score += test.featureCriticality * 10  // 1-5 scale

  // Historical failure rate
  score += test.historicalFailureRate * 20  // 0-1 scale

  // Change frequency of covered code
  score += change.frequencyScore * 5

  // Time since last test execution
  if (daysSince(lastRun) > 7) {
    score += 10
  }

  // Integration test bonus
  if (test.type === 'integration') {
    score += 15
  }

  return score
}
```

### Prioritization Matrix

| Priority | Score Range | Action | Example Tests |
|----------|-------------|--------|---------------|
| P0 (Must run) | 80-100 | Always run, block pipeline | Critical path E2E, security tests |
| P1 (Should run) | 60-79 | Run if time permits | Core feature tests, changed module tests |
| P2 (Nice to run) | 30-59 | Run in background | Integration tests, edge cases |
| P3 (Skip) | 0-29 | Skip for this change | Unchanged module tests, cosmetic tests |

### Decision Matrix for Test Inclusion

```
Is test in changed module?
├── Yes → P0 (must run)
└── No → Does test cover shared dependency?
    ├── Yes → Does dependency have high change frequency?
    │   ├── Yes → P0/P1
    │   └── No → P1/P2
    └── No → Is feature critical (revenue, security)?
        ├── Yes → P1
        └── No → P2/P3 (consider skipping)
```

## Coverage Analysis

### Coverage Mapping

```typescript
// Track which tests cover which code paths
interface CoverageMap {
  // File-level coverage
  files: Map<string, {
    lines: number[]
    branches: number[]
    functions: string[]
    tests: string[]  // Tests that cover this file
  }>

  // Feature-level coverage
  features: Map<string, {
    files: string[]
    services: string[]
    tests: string[]
    criticality: 1 | 2 | 3 | 4 | 5
  }>
}

// Incremental coverage — only coverage of changed lines
function getChangedLineCoverage(change: CodeChange): string[] {
  const coverageMap = loadCoverageMap()
  const changedLines = new Set(change.linesChanged)

  return coverageMap.files
    .get(change.file)
    ?.tests.filter((testId) => {
      const testCoverage = coverageMap.tests.get(testId)
      return testCoverage?.lines.some((line) => changedLines.has(line))
    }) ?? []
}
```

### Coverage Thresholds

| Risk Level | Line Coverage Required | Branch Coverage Required |
|------------|----------------------|-------------------------|
| Low | 50% | 40% |
| Medium | 70% | 60% |
| High | 85% | 75% |
| Critical | 95% | 90% |

## Execution Time Optimization

### Time Budget Allocation

```typescript
interface TimeBudget {
  total: number        // Total regression window (e.g., 30 minutes)
  critical: number     // Time for P0 tests (e.g., 15 minutes)
  high: number         // Time for P1 tests (e.g., 10 minutes)
  medium: number       // Time for P2 tests (e.g., 5 minutes)
  low: number          // Remaining time
}
```

### Test Selection Algorithm

```typescript
function selectTests(
  allTests: Test[],
  changes: CodeChange[],
  timeBudget: number
): Test[] {
  // 1. Score all tests for the given changes
  const scored = allTests.map((test) => ({
    test,
    score: calculateTestPriority(test, changes),
    executionTime: test.estimatedDuration,
  }))

  // 2. Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // 3. Select tests until time budget is consumed
  const selected: Test[] = []
  let totalTime = 0

  for (const item of scored) {
    if (totalTime + item.executionTime <= timeBudget) {
      selected.push(item.test)
      totalTime += item.executionTime
    } else if (selected.length === 0) {
      // Always include at least the highest priority test
      selected.push(item.test)
      break
    }
  }

  return selected
}
```

### Execution Order Optimization

```typescript
// Run fastest tests first for early feedback
function optimizeExecutionOrder(tests: Test[]): Test[] {
  return [...tests].sort((a, b) => {
    const aScore = calculateTestPriority(a)
    const bScore = calculateTestPriority(b)

    // Same priority: faster test first
    if (aScore === bScore) {
      return a.estimatedDuration - b.estimatedDuration
    }

    // Different priority: higher priority first
    return bScore - aScore
  })
}
```

## Machine Learning for Test Selection

### ML-Based Prediction

```typescript
interface MLPrediction {
  testId: string
  failureProbability: number  // 0-1
  confidence: number          // 0-1
  features: {
    codeChurn: number
    authorHistory: number
    dependencyChange: number
    historicalFailures: number
    testAge: number
  }
}

// Feature engineering for ML model
function extractFeatures(
  test: Test,
  change: CodeChange,
  history: TestHistory
): number[] {
  return [
    change.linesChanged.length / 1000,             // Code churn
    history.authorFailureRate(change.author),       // Author's history
    change.dependenciesAffected.length,             // Dependency impact
    history.failureRateLast30Days(test.id),         // Recent flakiness
    test.coverageOverlap(change),                   // Coverage overlap
    daysSinceLastChange(change.file),               // Code stability
  ]
}
```

### Feature Importance

| Feature | Importance | Description |
|---------|------------|-------------|
| Code churn | High | Lines changed / total lines in file |
| Test-to-code ratio | Medium | How many tests cover the changed code |
| Historical defect density | High | Past bugs in the same module |
| Developer experience | Medium | How familiar the author is with the module |
| Time since last test run | Low | Stale tests may need re-execution |
| Dependency depth | Medium | How many layers depend on changed code |

## Regression Selection Algorithms

### Change-Based Selection

```
For each changed file:
  1. Find all tests that cover this file (direct coverage)
  2. Find all tests that cover files that depend on this file (transitive)
  3. Find all integration tests that exercise this service
  4. Combine and deduplicate
```

### History-Based Selection

```typescript
function historyBasedSelection(
  changes: CodeChange[],
  history: TestExecution[]
): Test[] {
  // Tests that failed in last 5 runs for similar changes
  const frequentlyFailing = history
    .filter((run) => run.changesSimilarTo(changes))
    .flatMap((run) => run.failedTests)
    .filter((test, i, arr) => arr.indexOf(test) === i) // Deduplicate

  // Tests that haven't run in the last N commits
  const staleTests = history
    .filter((run) => run.tests.ran)
    .filter((test) => test.lastRun < commitsAgo(10))

  return [...frequentlyFailing, ...staleTests]
}
```

### Combined Selection

```typescript
function combinedSelection(changes: CodeChange[]): Test[] {
  const changeBased = changeBasedSelection(changes)
  const historyBased = historyBasedSelection(changes)
  const randomSample = randomSampleOf(allTests, 0.05) // 5% random for safety net

  return deduplicate([
    ...changeBased,     // Direct coverage
    ...historyBased,    // Historical insight
    ...randomSample,    // Safety net — unexpected regressions
  ])
}
```

## Test Suite Minimization

### Identifying Redundant Tests

```typescript
interface TestCoverageMatrix {
  tests: string[]           // Test names
  coverage: Set<string>[]   // Coverage vectors per test
}

function findRedundantTests(matrix: TestCoverageMatrix): string[] {
  const redundant: string[] = []

  for (let i = 0; i < matrix.tests.length; i++) {
    let isCovered = false

    for (let j = 0; j < matrix.tests.length; j++) {
      if (i !== j) {
        // Check if test j covers everything test i covers
        const diff = new Set(matrix.coverage[i])
        matrix.coverage[j].forEach((item) => diff.delete(item))

        if (diff.size === 0) {
          isCovered = true
          break
        }
      }
    }

    if (isCovered) {
      redundant.push(matrix.tests[i])
    }
  }

  return redundant
}
```

### Minimization Rules

1. Remove tests whose coverage is a subset of other, faster tests
2. Keep at least one test per unique code path
3. Keep all tests for critical/security features regardless of redundancy
4. Remove end-to-end tests that duplicate integration test coverage
5. Remove snapshot tests (they add coverage but low signal)

## Safety Net Preservation

### Safety Net Definition

The safety net is the minimum set of tests that must always run to ensure the system is not critically broken:

```typescript
const SAFETY_NET = {
  // Always run these regardless of risk assessment
  tests: [
    'health-check',
    'critical-path-login',
    'critical-path-checkout',
    'security-authentication',
    'database-connection',
    'api-gateway-routing',
  ],

  // Must complete within
  maxDuration: 5 * 60 * 1000,  // 5 minutes

  // Must achieve
  minCoverage: {
    criticalPaths: 100,
    securityControls: 100,
    coreDomains: 80,
  },
}
```

### Safety Net Violations

| Scenario | Action |
|----------|--------|
| Safety net test fails | Block deployment immediately |
| Safety net coverage drops | Flag for review within 24 hours |
| Safety net duration exceeds limit | Investigate performance regression |
| New critical path not in safety net | Add within the sprint |

## Regression Testing Workflow

### CI Integration

```yaml
# .github/workflows/regression.yml
name: Risk-Based Regression
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  impact-analysis:
    runs-on: ubuntu-latest
    outputs:
      risk-level: ${{ steps.analyze.outputs.risk-level }}
      selected-tests: ${{ steps.analyze.outputs.selected-tests }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for change analysis
      - name: Analyze changes
        id: analyze
        run: |
          node scripts/risk-based-selection.js \
            --base=${{ github.event.pull_request.base.sha }} \
            --head=${{ github.event.pull_request.head.sha }} \
            --output=selected-tests.json

  regression:
    needs: impact-analysis
    runs-on: ubuntu-latest
    steps:
      - run: |
          SELECTED=$(cat selected-tests.json | jq -r '.tests | join(" ")')
          npx vitest run $SELECTED --reporter=default
```

## Risk Assessment Report

### Report Template

```markdown
## Risk-Based Test Selection Report

### Change Summary
- Files changed: [N]
- Lines added: [N]
- Lines removed: [N]
- Components affected: [Component A], [Component B]
- Risk level: **High**

### Impact Analysis
| Component | Risk | Tests Affected |
|-----------|------|----------------|
| Payment processing | High | 12 |
| Checkout flow | High | 8 |
| Notification service | Medium | 3 |

### Selected Tests
- Total tests in suite: 1,200
- Tests selected: [N] ([N]% of suite)
- Estimated execution time: [N] minutes
- Coverage of changed code: [N]%

### Excluded Tests
| Reason | Count | Risk of Exclusion |
|--------|-------|-------------------|
| Unchanged module | 800 | Low |
| Low priority test | 200 | Low (tracked) |
| Coverage redundancy | 50 | Low |

### Safety Net
- Safety net tests: 12 (all passing ✓)
- Safety net coverage: 100%
```

## Key Points

- Risk-based test selection optimizes regression by prioritizing tests most likely to detect regressions
- Impact analysis maps code changes to affected tests and features
- Risk scoring considers: change type, feature criticality, historical failure rate, dependency impact
- P0 tests always run; P3 tests are skipped for low-risk changes
- Coverage analysis ensures changed code is adequately tested by selected tests
- Time budget allocation ensures regression completes within available window
- ML-based prediction improves selection accuracy over time using failure history
- Safety net tests always run regardless of risk assessment
- Redundant test identification reduces suite size without sacrificing coverage
- Selection decisions must be documented with risk rationale for auditability
