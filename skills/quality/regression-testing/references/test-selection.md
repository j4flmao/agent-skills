# Regression Test Selection

## Overview

Not all tests need to run for every change. Intelligent test selection balances risk coverage against execution time, ensuring critical paths are validated while keeping feedback loops fast.

## Selection Strategies

### 1. Impact Analysis

Map code changes to affected tests through dependency analysis.

**Approach:**
```python
# Pseudocode for impact-based selection
def select_tests_by_impact(changed_files, dependency_graph):
    affected_tests = set()
    for file in changed_files:
        # Find all test files that depend on this file
        tests = dependency_graph.get_affected_tests(file)
        affected_tests.update(tests)
        # Find all integration paths that pass through this file
        paths = dependency_graph.get_affected_flows(file)
        affected_tests.update(paths)
    return affected_tests
```

**Implementation techniques:**
- **Static analysis**: Trace method calls and imports to find affected tests
- **Code coverage mapping**: Track which lines each test covers, select tests covering changed lines
- **Git-based analysis**: `git diff` to find changed files, map to tests via historical correlation
- **Build dependency graph**: Use module/package dependency tree to determine blast radius

### 2. Risk-Based Selection

Assign risk scores to tests and select based on change risk profile.

**Risk factors for test selection:**

| Factor | Weight | Example |
|--------|--------|---------|
| Changed module | High | Payment gateway integration |
| Changed module dependency | Medium | Checkout → Payment |
| Historical failure rate | High | This module fails 15% of the time |
| Business criticality | High | Login flow, checkout |
| Time since last test | Medium | Feature not tested in 3 weeks |
| Developer confidence | Low | "Small refactor, safe change" — trust but verify |

**Risk scoring:**
```python
def risk_score(changed_module, all_modules):
    score = 0
    score += 3 if changed_module.is_critical else 0
    score += 2 if changed_module.historical_failure_rate > 0.1 else 0
    score += 1 if changed_module.has_recent_changes else 0
    score += 2 if len(changed_module.dependents) > 5 else 0
    score += 1 if changed_module.days_since_last_test > 14 else 0
    return score
```

### 3. Test Case Prioritization

Order selected tests to maximize early fault detection.

**Prioritization criteria (highest to lowest):**

| Priority | Criteria | Rationale |
|----------|----------|-----------|
| P0 | Critical path + directly changed | Catch showstoppers first |
| P1 | Critical path + indirectly affected | Core flows that might break |
| P2 | Non-critical + directly changed | Feature-level impact |
| P3 | Non-critical + indirectly affected | Edge cases and secondary flows |
| P4 | All others in risk radius | Full coverage if time permits |
| P5 | Historical flaky tests | Run last — low signal-to-noise |

**Time-boxed execution:**
```
Total budget: 30 minutes
P0 (5 tests × 30s = 2.5 min) → run first
P1 (12 tests × 45s = 9 min) → run second
P2 (8 tests × 30s = 4 min) → run if time allows
P3 (15 tests × 60s = 15 min) → run if time allows
```

### 4. AI/ML-Based Selection

Use historical data to predict which tests are likely to fail.

**Input features:**
- Files changed and their change frequency
- Test failure history per file
- Time-based patterns (Monday failures? Post-deploy?)
- Developer identity (some devs introduce more regressions)
- Code complexity metrics of changed files

**Simple ML approach:**
```python
# Training data: historical changes + which tests failed
features = [
    # [files_changed, complexity, historical_fail_rate, ...]
    [5, 42, 0.15, ...],  # Change A → tests 1, 3, 7 failed
    [2, 12, 0.02, ...],  # Change B → no failures
]

# Predict: given a new change, which tests have >X% failure probability
prediction = model.predict_proba(new_change_features)
selected_tests = [
    test for test, prob in prediction.items()
    if prob > THRESHOLD  # e.g., 0.05 = 5% failure probability
]
```

**Threshold tuning:**

| Threshold | Selection Size | Missed Failures | Best For |
|-----------|---------------|-----------------|----------|
| 1% | 70% of suite | Very low | High-risk releases |
| 5% | 40% of suite | Low | Normal CI runs |
| 10% | 20% of suite | Medium | Fast feedback commits |

## Selection Timing

| Trigger | Selection Strategy | Max Duration |
|---------|-------------------|--------------|
| Every commit | Diff-based + critical path | 5 min |
| Every PR | Impact analysis + risk-based | 15 min |
| Nightly | Full critical suite + changed areas | 60 min |
| Pre-release | Full regression | 4-8 hours |

## Selection Decision Framework

```python
def select_regression_tests(changes, test_suite, time_budget):
    # Step 1: Impact analysis
    directly_affected = find_tests_touching_files(changes.files, test_suite)
    indirectly_affected = find_dependent_tests(directly_affected, dependency_graph)

    # Step 2: Risk scoring
    scored_tests = {}
    for test in directly_affected | indirectly_affected:
        scored_tests[test] = risk_score_for_test(test, changes)

    # Step 3: Prioritize
    prioritized = sorted(scored_tests.items(), key=lambda x: x[1], reverse=True)

    # Step 4: Time-box
    selected = []
    elapsed = 0
    for test, score in prioritized:
        if elapsed + test.estimated_duration <= time_budget:
            selected.append(test)
            elapsed += test.estimated_duration

    return selected, elapsed, len(test_suite) - len(selected)
```

## Avoiding Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Missing tests that touch shared infrastructure | Include integration tests for shared libraries |
| Over-selecting based on broad dependencies | Use fine-grained dependency mapping |
| Ignoring configuration changes | Include config validation tests |
| Not selecting any tests (false confidence) | Always include smoke/critical path minimum |
| Selection too slow to compute | Cache dependency graph, compute incrementally |
