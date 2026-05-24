# Regression Metrics

## Overview

Regression metrics provide visibility into test suite health, execution efficiency, defect detection, and overall return on automation investment. Without metrics, regression testing is a black box.

## Core Metrics

### 1. Pass/Fail Rate

Track the percentage of tests passing in each regression run.

```python
pass_rate = (tests_passed / total_tests) * 100
fail_rate = (tests_failed / total_tests) * 100
skip_rate = (tests_skipped / total_tests) * 100
```

**Targets:**
- Smoke suite: 100% pass rate
- Critical path: > 99% pass rate
- Full regression: > 97% pass rate (excluding flaky)
- Flaky tests: < 2% of total suite

**Trend monitoring:**
```
Week   Pass Rate   Fail Rate   Flaky Rate
W20    98.2%       1.2%        0.6%
W21    97.8%       1.5%        0.7%
W22    96.5%       2.3%        1.2%  ← Alert: dropping
W23    97.1%       1.9%        1.0%
```

### 2. Execution Time Trends

Track how long regression takes to run.

```python
avg_test_time = total_execution_time / number_of_tests
suite_growth = (current_suite_size - previous_suite_size) / previous_suite_size * 100
```

**Example dashboard:**
```
Suite Execution Time — Last 30 Days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Smoke:    3.2 min  (+0.1 min vs last week)  ✓
Critical: 18.7 min (-1.3 min vs last week)  ✓ (optimized)
Full:     2h 14m    (+12 min vs last week)   ⚠ (new tests added)

Tests added this month: 24
Tests removed this month: 3
Net growth: +21 tests
```

**Action triggers:**
- Smoke > 10 min → Optimize or split
- Critical > 30 min → Review for redundancy
- Full > 4 hours → Add parallelization or reduce scope

### 3. Defect Leakage

Defects that escape regression and are found in production.

```python
leakage_rate = (defects_found_in_production / total_defects) * 100
regression_effectiveness = 1 - (leakage_rate / 100)
```

**Sources of leakage data:**
- Production incidents traced to missed regression
- Customer-reported bugs not caught by tests
- Post-mortem analysis of regression gaps

**Root cause categories:**
| Category | % of Leakage | Action |
|----------|-------------|--------|
| Missing test coverage | 45% | Add tests for uncovered scenarios |
| Test data mismatch | 25% | Improve data realism |
| Environment difference | 15% | Stage-prod parity audit |
| Flaky test masking | 10% | Fix or quarantine flaky tests |
| Human error in selection | 5% | Improve test selection process |

### 4. Coverage Gaps

Identify code areas not covered by regression tests.

**Coverage metrics:**
```python
line_coverage = (lines_covered / total_lines) * 100
branch_coverage = (branches_covered / total_branches) * 100
function_coverage = (functions_covered / total_functions) * 100
```

**Coverage by risk area:**
```
Area                Line Coverage  Branch Coverage  Risk
Auth & SSO          92%            85%              High ✓
Checkout            88%            79%              High ✓
Search              65%            54%              High ⚠
Admin Panel         45%            38%              Medium ⚠
Reporting           22%            18%              Low ⚠⚠
Notifications       55%            48%              Medium ⚠
```

### 5. Automation ROI

Measure the return on investment of test automation.

```python
# Cost
automation_cost = (hours_to_create + hours_to_maintain) * hourly_rate
manual_cost = manual_test_hours_per_run * hourly_rate * runs_per_year

# Benefit
time_saved = manual_cost - (automation_execution_hours * hourly_rate)
roi = (time_saved - automation_cost) / automation_cost * 100
```

**Example calculation:**
```
Manual testing cost per regression: 40 hours × $50/hr = $2,000
Regression runs per year: 52 (weekly)
Annual manual cost: $104,000

Automation exec time: 3 hours × $50/hr = $150
Annual automation exec cost: $7,800

Automation creation: 200 hours × $50/hr = $10,000 (year 1, amortized)
Automation maintenance: 100 hours × $50/hr = $5,000/year

Year 1 ROI: ($104k - $7.8k - $10k - $5k) / ($10k + $5k) × 100 = 541%
Year 2+ ROI: ($104k - $7.8k - $5k) / $5k × 100 = 1,824%
```

### 6. Flaky Rate

Proportion of tests that are unreliable.

```python
flaky_rate = (flaky_test_instances / total_test_runs) * 100
```

**Flaky rate targets:**
| Suite | Max Flaky Rate | Action if Exceeded |
|-------|---------------|-------------------|
| Smoke | 0% | Stop deployment, fix immediately |
| Critical | < 0.5% | Quarantine any flaky test within 24 hours |
| Full regression | < 2% | Quarantine within 48 hours |

**Flaky test report:**
```
Flaky Test Report — May 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total flaky instances: 47
Unique flaky tests: 14
Flaky rate: 1.3% (target: < 2%) ✓

Top 5 flaky tests:
1. checkout.spec:109 — "applies coupon correctly"
   Failures: 12 | Root cause: Race condition in animation
   Status: Fixed (PR #4321)

2. search.spec:234 — "pagination shows correct page"
   Failures: 8 | Root cause: Network-dependent timing
   Status: Quarantined (Issue #4455)

3. login.spec:56 — "SSO redirect preserves return URL"
   Failures: 6 | Root cause: OAuth provider timeout
   Status: Under investigation
```

## Dashboard Template

```
┌─────────────────────────────────────────────────────────────┐
│  REGRESSION DASHBOARD — Week 21, 2026                      │
├─────────────────────────────────────────────────────────────┤
│ Suite Health                     │ Execution                │
│ Smoke:    48/48  (100%)    ✓     │ Smoke:    3.2 min       │
│ Critical: 184/186 (98.9%)  ✓     │ Critical: 18.7 min      │
│ Full:     823/850 (96.8%)  ⚠    │ Full:     2h 14m        │
│                                  │                          │
│ Coverage                         │ Flaky                    │
│ Line:      76%              ⚠    │ Active:    12 tests      │
│ Branch:    68%              ⚠    │ Rate:      1.4%     ✓   │
│ Critical:  88%              ✓    │ Quarantined: 8           │
│                                  │                          │
│ Defects                          │ ROI                      │
│ Found:     12               ✓    │ Hours saved: 1,872/yr    │
│ Leaked:    2 (to prod)      ⚠   │ Cost saved: $93,600/yr   │
│ Rate:      14.3%            ⚠   │ ROI:        +1,824%      │
└─────────────────────────────────────────────────────────────┘
```

## Metric Collection

### Automated Collection

```javascript
// metric-collector.js
async function collectRegressionMetrics(runResults) {
  return {
    timestamp: new Date().toISOString(),
    total: runResults.total,
    passed: runResults.passed,
    failed: runResults.failed,
    flaky: runResults.flaky,
    passRate: (runResults.passed / runResults.total) * 100,
    duration: runResults.duration,
    lastRun: runResults.lastRun,
    coverage: await getCoverageData(),
    defects: await getDefectData(),
  };
}
```

### Storage (Time-Series)

```sql
CREATE TABLE regression_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  suite_name VARCHAR(100) NOT NULL,
  total_tests INT NOT NULL,
  passed_tests INT NOT NULL,
  failed_tests INT NOT NULL,
  flaky_tests INT NOT NULL,
  duration_seconds INT NOT NULL,
  coverage_line DECIMAL(5,2),
  coverage_branch DECIMAL(5,2)
);

-- Weekly trend query
SELECT
  date_trunc('week', timestamp) AS week,
  suite_name,
  AVG(pass_rate) AS avg_pass_rate,
  AVG(duration_seconds) AS avg_duration
FROM regression_metrics
GROUP BY 1, 2
ORDER BY 1 DESC;
```

## Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Pass rate drop (weekly) | > 3% drop | > 5% drop |
| Execution time increase | > 20% | > 50% |
| Flaky rate increase | > 2% | > 5% |
| Defect leakage | > 10% | > 20% |
| Coverage drop | > 5% | > 10% |
