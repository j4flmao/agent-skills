---
name: quality-regression-testing
description: >
  Use when the user asks about regression testing, test selection, regression suite design, automation maintenance, flaky tests, or regression metrics. Do NOT use for: smoke/BVT testing (quality-smoke-testing), acceptance testing (quality-acceptance-testing), or exploratory testing (quality-exploratory-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, regression-testing, phase-6]
---

# Regression Testing

## Purpose
Ensure that new code changes do not break existing functionality through effective test selection, suite design, automation maintenance, and metric-driven optimization. This skill covers impact analysis, risk-based selection, prioritization, flaky test management, and CI integration.

## Agent Protocol

### Trigger
User mentions regression testing, test selection, regression suite, flaky tests, automation maintenance, or asks what to re-test after a change.

### Input Context
- Code changes (commits, PRs, commits since last regression run)
- Existing test suite composition and execution history
- Risk assessment of changed areas
- Time/resource constraints for regression execution

### Output Artifact
- Regression test selection recommendation
- Optimized regression suite definition
- Flaky test report and remediation plan
- Regression metrics dashboard or report

### Response Format
Structured recommendation with:
1. Impact analysis summary (changed areas to affected tests mapping)
2. Selected test list with risk-based justification
3. Prioritization within the selection (critical path first)
4. Risk assessment of excluded tests (what we're accepting risk on)
5. Execution time estimate and time budget compliance

### Completion Criteria
- Regression test selection produced and justified through risk analysis
- Risk coverage meets agreed threshold (excluded tests documented with rationale)
- Execution time fits within available window via prioritization
- Flaky tests identified, flagged, and quarantined
- Selection recall validated (no regression test gaps identified)

## Workflow

1. **Impact analysis**: Map code changes to affected files, then to test suites via dependency graph and coverage data
2. **Test selection**: Choose tests based on risk model (business criticality, failure history, change proximity). Use dependency graph for precision
3. **Prioritization**: Order selected tests by risk score. Apply time budget if constrained — highest risk tests run first
4. **Execution**: Run selected regression suite. Monitor results in real-time. Record execution times
5. **Flaky detection**: Re-run failed tests up to 3 times. If inconsistent, quarantine immediately. Track flakiness rate
6. **Analysis**: Correlate new failures with recent changes. Distinguish real regressions from environmental issues
7. **Optimization**: Remove redundant tests, consolidate overlapping coverage, retire obsolete suites. Update risk scores based on results
8. **Reporting**: Generate pass/fail summary, risk coverage report, execution time trend, and flaky test log

## Architecture / Decision Trees

### Test Selection Strategy Decision Tree

```
How many tests are in the suite?
├── < 100 → Run all (no selection needed)
├── 100-1000 → Dependency-graph selection
│   ├── Dependency graph available? → Use graph
│   └── No graph → Coverage-based selection
├── 1000-10000 → Risk-based + dependency selection
│   ├── Historical data available? → Add failure rate to risk model
│   └── No history → Coverage + module risk only
└── 10000+ → ML-based selection
    ├── Data available? → Train selection model
    └── No data → Start with risk-based, collect data
```

### Test Layer Decision Tree

```
Layer 1 (Smoke): < 5 min, always run on every deployment
  Critical path tests, auth, main workflow
Layer 2 (Core): < 30 min, run on every merge
  All core business functionality, all integration tests
Layer 3 (Full): < 2 hours, run daily
  Complete suite including edge cases
Layer 4 (Extended): 2-8 hours, run pre-release
  Full suite + performance + chaos + security
```

## Common Pitfalls

1. **Suite bloat without pruning**: Regression suites accumulate dead tests. Review and remove obsolete tests quarterly
2. **Running all tests on every change**: Doesn't scale. Invest in test selection when suite exceeds 100 tests
3. **Flaky test accumulation**: Tests that fail intermittently erode trust. Quarantine within 24 hours
4. **No risk model**: Treating all tests as equally important misses business-critical risks
5. **Ignoring test selection recall**: Not tracking what was missed means you don't know your blind spots
6. **Brittle test selection**: Hardcoded file lists in selection logic break as codebase evolves
7. **Manual regression processes**: Manual regression is slow, error-prone, and doesn't scale
8. **No time-budget management**: Without time constraints, regression suites grow unbounded
9. **Coverage over risk**: 100% coverage is meaningless if it covers the wrong things
10. **No feedback loop**: Without analyzing missed bugs, regression can't improve

## Best Practices

1. Layer the regression suite: smoke (fastest), core (balanced), full (slowest), extended (pre-release)
2. Base test selection on dependency graphs and historical failure data
3. Prioritize tests by risk score: business criticality + failure probability + change proximity
4. Quarantine flaky tests immediately and fix within one sprint
5. Add regression tests for every production bug fix (prevent re-introduction)
6. Regularly audit the regression suite: remove dead tests, consolidate duplicates
7. Use time budgets with priority ordering for constrained execution windows
8. Track regression metrics: pass rate, execution time, flakiness, risk coverage
9. Automate regression selection and execution in CI pipeline
10. Create feedback loops: analyze missed bugs and improve test coverage

## Compared With

| Aspect | Regression Testing | Smoke Testing | Acceptance Testing |
|--------|-------------------|---------------|-------------------|
| Scope | Existing functionality | Critical path | Business requirements |
| Frequency | Every change + scheduled | Every deployment | Per release/story |
| Suite size | 100-10000+ tests | 5-20 tests | 10-100 scenarios |
| Execution time | Minutes to hours | < 5 minutes | Hours to days |
| Selection | Risk-based + selection | Fixed suite | Per-feature planning |
| Focus | Regression detection | Stability check | Requirement validation |
| Automation | Fully automated | Fully automated | Mixed (automated + manual) |

## Performance Considerations

- Test selection can reduce execution time by 60-80% while maintaining 85%+ defect detection
- Dependency graph analysis: < 1 second for most codebases. Pre-compute for large monorepos
- Risk scoring: lightweight (file-level analysis) vs heavy (ML-based scoring for 10000+ tests)
- Parallel execution: N-cores speedup, but consider shared resource contention
- Flaky test re-runs: add 2x execution time for flaky detection. Reduce by quarantining flaky tests
- Time budget: allocate based on pipeline criticality. Commit stage: < 5 min. Merge stage: < 30 min

## Regression Test Selection Examples

### Dependency Graph-Based Selection
```yaml
# .regression/dependency-graph.yml
services:
  - name: "payment-service"
    modules:
      - "src/payment/**"
      - "src/common/transactions/**"
    affected_tests:
      - "tests/payment/**"
      - "tests/integration/checkout/**"
    risk_score: 0.9
    business_criticality: "P0"
  - name: "user-service"
    modules:
      - "src/user/**"
    affected_tests:
      - "tests/user/**"
      - "tests/integration/auth/**"
    risk_score: 0.7
    business_criticality: "P1"
```

### Risk Scoring Matrix
```yaml
risk_scoring:
  factors:
    change_proximity:
      weight: 0.4
      rules:
        - "directly modified file: score 1.0"
        - "imported by modified file: score 0.5"
        - "transitively imported: score 0.2"
    failure_history:
      weight: 0.3
      rules:
        - "failed in last 10 runs: score 1.0"
        - "failed in last 50 runs: score 0.5"
        - "never failed: score 0.1"
    business_criticality:
      weight: 0.3
      rules:
        - "P0 (revenue-critical): score 1.0"
        - "P1 (important): score 0.7"
        - "P2 (standard): score 0.4"
        - "P3 (nice-to-have): score 0.1"
  thresholds:
    run_always: ">= 0.8"
    run_if_budget: ">= 0.4"
    skip: "< 0.4"
```

## CI Integration for Regression Testing

### GitHub Actions — Tiered Regression Pipeline
```yaml
name: Regression Tests
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 2 * * *"  # Daily full regression

jobs:
  smoke-tier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright test --grep @smoke --timeout 30000
        env:
          CI: true
      - if: failure()
        run: echo "Smoke tests failed - blocking merge"
        # Pipeline stops here on failure

  core-tier:
    needs: smoke-tier
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - name: Compute affected tests
        run: |
          CHANGED=$(git diff --name-only origin/main...HEAD)
          node .regression/select-tests.js --changes="$CHANGED" --tier=core
      - run: npx vitest run --shard=${{ matrix.shard }}/3 $(cat test-list.txt)
        env:
          CI: true

  full-regression:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
    steps:
      - uses: actions/checkout@v4
      - run: npx vitest run --shard=${{ matrix.shard }}/8
```

## Regression Testing Anti-Patterns

### Anti-Pattern: Running Everything Every Time
Running the complete regression suite on every commit wastes CI resources and slows feedback. Once a suite exceeds 100 tests, implement test selection. Start with dependency-graph-based selection, add risk scoring as historical data accumulates.

### Anti-Pattern: No Flaky Test Quarantine
Failing to quarantine flaky tests erodes trust in the entire test suite. Developers start ignoring failures, including real regressions. Quarantine flaky tests within 24 hours. Fix within one sprint or delete the test.

### Anti-Pattern: Manual Regression Execution
Running regression tests manually is slow, error-prone, and doesn't scale. Every regression test must be automated. Manual testing has its place (exploratory, UAT) but regression is repetitive by definition.

### Anti-Pattern: Letting Suite Bloat
Regression suites grow without bound as new features are added without removing obsolete tests. A 10,000-test suite that's never pruned has significant dead weight. Audit quarterly: remove tests for removed features, consolidate overlapping tests, retire flaky tests.

### Anti-Pattern: No Time Budget Management
Without time budgets, regression suites grow unbounded. Each sprint adds tests but never removes them. Set a total suite time budget. When the budget is exceeded, prioritize: run highest risk tests first, defer low-risk tests to nightly.

### Anti-Pattern: Ignoring Test Selection Recall
Using test selection without measuring recall means you don't know what you're missing (false negatives). Track bugs that escaped to production and should have been caught by regression. If recall drops below 75%, refine the selection model.

## Regression Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | Manual regression | Testers manually re-test critical paths, no automation, no tracking |
| 2: Defined | Automated regression suite | Full suite automated, run on every merge, basic CI integration |
| 3: Managed | Tiered regression | Smoke/core/full tiers, risk-based selection, test selection by dependency graph |
| 4: Measured | Optimized regression | ML-based selection, flaky test auto-quarantine, regression metrics dashboard, < 60 min full suite |
| 5: Optimized | Predictive regression | AI-driven test selection, mutation-based selection validation, automatic test generation from production failures |

## Regression Metrics Dashboard

```yaml
metrics:
  suite_health:
    total_tests: 4250
    active: 4120
    quarantined: 45
    flaky_rate: 1.1%
    execution_time_avg: "42 minutes"
  selection:
    avg_tests_per_pr: 340
    selection_recall: 87%
    false_negative_rate: 2.3%
    missed_bugs_last_quarter: 3
  quality_gates:
    smoke_pass_rate: 99.8%
    core_pass_rate: 97.5%
    full_pass_rate: 96.2%
    blocking_failures_per_week: 2.1
```

## Flaky Test Management

```yaml
flaky_test_workflow:
  detection:
    - "Auto-detect: test fails in CI but passes re-run (max 3 retries)"
    - "Mark as flaky: quarantine from main suite, notify owner"
    - "Track: flaky rate per test, per suite, per team"
  quarantine:
    - "Move to quarantined suite: excluded from CI gates"
    - "Assign owner: last modifier of test file"
    - "Set SLA: fix within 5 business days or delete"
  investigation:
    steps:
      - "Check test isolation: shared state, timing dependencies"
      - "Check environment: resource contention, network latency"
      - "Check data: non-deterministic fixtures, stale mocks"
      - "Check assertions: race conditions, async timing"
  resolution:
    - "Fix root cause: improve isolation, add retry logic, stabilize data"
    - "Verify: 10 consecutive runs in CI with zero failures"
    - "Re-integrate: move from quarantined back to main suite"
  metrics:
    flaky_rate_target: "< 1% of total suite"
    quarantine_age_target: "< 5 days"
    auto_fix_rate: "> 50% (common patterns: wait strategies, data isolation)"
```

## Regression Test Data Strategy

```yaml
test_data_principles:
  isolation:
    - "Each test run gets its own dataset — no sharing across runs"
    - "Use unique identifiers (timestamp + run ID) to avoid collisions"
    - "Clean up after test: delete-by-run-id in afterAll"
  factories:
    - "Use factory functions with sensible defaults and overrides"
    - "Generate unique values for constrained fields (email, username)"
    - "Never hardcode IDs — they may not exist in test environment"
  seeding:
    - "API-level seeding: POST /api/test/seed with required entities"
    - "Database-level seeding: SQL INSERT for bulk data needs"
    - "Seed in beforeAll, clean in afterAll"
  environments:
    - "CI: fresh seed per run, cleanup guaranteed"
    - "Staging: seeded data with known state, refreshed daily"
    - "Production: never use in regression tests except read-only"
```

## Regression Testing Anti-Patterns (Additional)

### Anti-Pattern: No Post-Release Validation
Running regression tests only before release and not monitoring production after deployment. The pre-release suite may pass while production has problems due to configuration differences, data volume, or real user behavior. Implement production health checks and canary analysis alongside pre-release regression.

### Anti-Pattern: Skipping Security Regression
Security regression tests are skipped to save time in the deployment pipeline. Security vulnerabilities re-emerge when changes inadvertently reintroduce previously fixed issues. Security regression tests must run on every deployment regardless of change scope.

### Anti-Pattern: Manual Regression Sign-Off
Relying on manual testing for regression sign-off. Manual regression is slow, error-prone, and doesn't scale beyond a few tests. Every regression test must be automated. Reserve manual testing for exploratory testing and UAT.

## Rules
1. Every change must have at least a smoke test pass before regression is considered
2. Do NOT run full regression on every commit — select based on risk assessment and time budget
3. Flaky tests must be quarantined within 24 hours of detection — no false signals in main suite
4. Regression suite must complete within the available deployment window. Use prioritization if constrained
5. Test selection decisions must be documented with risk rationale — especially excluded tests
6. Coverage gaps identified during regression must be tracked and resolved within one sprint
7. Every production bug fix must include a regression test that reproduces the bug
8. Regression suite must be audited quarterly: remove dead tests, consolidate duplicates
9. Risk-based selection recall must be measured and maintained above 75%
10. Regression test execution time trend must be monitored — any increase > 20% requires investigation
11. Only deterministic tests belong in the regression suite — no tests with random or time-dependent behavior
12. Regression test failures must block deployment until root cause is identified and fixed
13. Obsolete tests (testing removed functionality) must be removed within one sprint
14. New regression tests must pass 10 consecutive runs before being added to the suite
15. Security regression tests must run even for unrelated changes (defense in depth)
16. Regression test selection must include all tests for security-critical modules regardless of change scope
17. Each regression tier must have a defined time budget and exit criteria
18. False negative rate must be tracked and maintained below 5%
19. Test data must be isolated per run — never share test data across regression runs
20. Flaky tests are quarantined within 24 hours, fixed within 5 days, or deleted

## References
- references/automation-maintenance.md — Test Automation Maintenance
- references/flaky-test-management.md — Flaky Test Management
- references/regression-metrics.md — Regression Metrics
- references/regression-suites.md — Regression Suite Design
- references/regression-testing-advanced.md — Regression Testing Advanced Topics
- references/regression-testing-architecture.md — Regression Testing Architecture and System Design
- references/regression-testing-fundamentals.md — Regression Testing Fundamentals
- references/regression-testing-strategy.md — Regression Testing Strategy and Decision Frameworks
- references/risk-based-selection.md — Risk-Based Test Selection
- references/test-selection.md — Regression Test Selection

## Handoff
After regression testing, hand off to:
- `quality-smoke-testing` — for BVT smoke suite updates on new critical paths
- `quality-acceptance-testing` — if acceptance criteria gaps were uncovered
- `quality-e2e-testing` — for end-to-end coverage of newly identified risk areas
- `quality-integration-testing` — for deeper investigation of regression failures

## Implementation Patterns

### Regression Test Suite Runner

```python
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass
from datetime import datetime
import json
import time

@dataclass
class RegressionTest:
    name: str
    run_fn: Callable
    tier: int  # 1=critical, 2=important, 3=nice-to-have
    module: str
    timeout: int = 30
    retries: int = 0

@dataclass
class TestResult:
    name: str
    passed: bool
    duration_ms: float
    error: Optional[str] = None
    retry_count: int = 0

class RegressionSuite:
    def __init__(self, name: str):
        self.name = name
        self.tests: List[RegressionTest] = []

    def add_test(self, test: RegressionTest):
        self.tests.append(test)

    def run_tier(self, tier: int, parallel: bool = False) -> Dict:
        tests = [t for t in self.tests if t.tier == tier]
        results = []
        start = time.time()

        if parallel:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                futures = {executor.submit(self._run_single, t): t for t in tests}
                for future in concurrent.futures.as_completed(futures):
                    results.append(future.result())
        else:
            for test in tests:
                results.append(self._run_single(test))

        duration = time.time() - start
        passed = [r for r in results if r.passed]
        failed = [r for r in results if not r.passed]

        return {
            "suite": self.name,
            "tier": tier,
            "total": len(results),
            "passed": len(passed),
            "failed": len(failed),
            "duration_seconds": round(duration, 2),
            "results": results,
        }

    def _run_single(self, test: RegressionTest) -> TestResult:
        for attempt in range(test.retries + 1):
            start = time.time()
            try:
                test.run_fn()
                duration = (time.time() - start) * 1000
                return TestResult(
                    name=test.name,
                    passed=True,
                    duration_ms=round(duration, 2),
                    retry_count=attempt,
                )
            except Exception as e:
                if attempt < test.retries:
                    continue
                duration = (time.time() - start) * 1000
                return TestResult(
                    name=test.name,
                    passed=False,
                    duration_ms=round(duration, 2),
                    error=str(e),
                    retry_count=attempt,
                )
        return TestResult(name=test.name, passed=False, duration_ms=0)

    def run_all(self, parallel: bool = False) -> Dict:
        tiers = sorted(set(t.tier for t in self.tests))
        all_results = {}
        for tier in tiers:
            all_results[tier] = self.run_tier(tier, parallel)
        return all_results


class FlakyTestDetector:
    def __init__(self, window_size: int = 10):
        self.history: Dict[str, List[bool]] = {}
        self.window_size = window_size

    def record_result(self, test_name: str, passed: bool):
        if test_name not in self.history:
            self.history[test_name] = []
        self.history[test_name].append(passed)
        if len(self.history[test_name]) > self.window_size:
            self.history[test_name].pop(0)

    def is_flaky(self, test_name: str, threshold: float = 0.2) -> bool:
        if test_name not in self.history:
            return False
        results = self.history[test_name]
        if len(results) < 5:
            return False
        pass_rate = sum(results) / len(results)
        return pass_rate < (1 - threshold) and pass_rate > threshold
```

## Architecture Decision Trees

### Regression Test Scope Selection

```
What changed?
├── New feature added
│   ├── Add tests for new feature
│   ├── Run full regression for affected module
│   └── Run smoke tests for entire system
│
├── Bug fix
│   ├── Add regression test for the fixed bug
│   ├── Run all tests in the affected module
│   └── Run integration tests for dependent modules
│
├── Refactoring (no behavior change)
│   ├── Run full test suite for refactored module
│   ├── Contract tests for API changes
│   └── Compare before/after test coverage
│
├── Dependency update
│   ├── Run full regression suite
│   ├── Run security-focused tests
│   └── Test edge cases in updated dependency
│
└── Configuration / infrastructure change
    ├── Smoke tests for deployment
    ├── Health check tests
    └── Performance benchmark comparison
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| No tiered regression | Full suite too slow for CI feedback | Tier 1 (critical) in 5 min, Tier 2 in 15 min, Tier 3 nightly |
| Ignoring flaky tests | Wasted CI time, distrust in suite | Quarantine flaky tests immediately, fix within 5 days |
| Only adding, never removing | Suite grows unbounded, slow | Remove tests for deleted features, review suite quarterly |
| Determinism not enforced | Random failures from shared state | Isolate test data per run, no shared state |
| No baseline for comparison | Don't know if performance regressed | Store baseline metrics, compare on each run |

## Performance Optimization

- **Impact analysis for test selection**: Use code coverage data to select tests for changed files. Only run tests that cover modified code. Reduces regression run time by 60-80%.
- **Parallel test execution by tier**: Run Tier 1 tests sequentially for fast feedback. Run Tier 2+3 tests in parallel across multiple machines. Total regression time: Tier 1 in 5 min, all tiers in 30 min.
- **Test impact analysis**: Use `git diff` to identify changed files. Map files to test suites. Only run affected suites. Cache unaffected suite results from previous CI run.
