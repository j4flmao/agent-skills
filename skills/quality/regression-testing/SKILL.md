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
