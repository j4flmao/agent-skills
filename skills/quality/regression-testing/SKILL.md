---
name: quality-regression-testing
description: >
  Use when the user asks about regression testing, test selection, regression suite design, automation maintenance, flaky tests, or regression metrics. Do NOT use for: smoke/BVT testing (quality-smoke-testing), acceptance testing (quality-acceptance-testing), or exploratory testing (quality-exploratory-testing).
version: "1.0.0"
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
Ensure that new code changes do not break existing functionality through effective test selection, suite design, automation maintenance, and metric-driven optimization.

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
1. Impact analysis summary (changed areas → affected tests)
2. Selected test list with justification
3. Prioritization within the selection (critical path first)
4. Risk assessment of excluded tests
5. Execution time estimate

### Completion Criteria
- Regression test selection produced and justified AND
- Risk coverage meets agreed threshold AND
- Execution time fits within available window AND
- Flaky tests identified and flagged

## Workflow

1. **Impact analysis**: Map code changes to affected features and test suites
2. **Test selection**: Choose tests based on risk, coverage, and time constraints
3. **Prioritization**: Order tests by criticality, failure probability, execution speed
4. **Execution**: Run selected regression, monitor results, flag flaky tests
5. **Analysis**: Review results, identify new failures, correlate with changes
6. **Optimization**: Remove redundant tests, update brittle ones, retire obsolete suites

## Rules
1. Every change must have at least a smoke test pass before regression is considered
2. Do NOT run full regression on every commit — select based on risk
3. Flaky tests must be quarantined within 48 hours — no false signals
4. Regression suite must complete within the available deployment window
5. Test selection decisions must be documented with risk rationale
6. Coverage gaps identified during regression must be tracked for new test creation

## References
  - references/automation-maintenance.md — Test Automation Maintenance
  - references/flaky-test-management.md — Flaky Test Management
  - references/regression-metrics.md — Regression Metrics
  - references/regression-suites.md — Regression Suite Design
  - references/regression-testing-advanced.md — Regression Testing Advanced Topics
  - references/regression-testing-fundamentals.md — Regression Testing Fundamentals
  - references/risk-based-selection.md — Risk-Based Test Selection
  - references/test-selection.md — Regression Test Selection
## Handoff
After regression testing, hand off to:
- `quality-smoke-testing` — for BVT smoke suite updates on new critical paths
- `quality-acceptance-testing` — if acceptance criteria gaps were uncovered
- `quality-e2e-testing` — for end-to-end coverage of newly identified risk areas
