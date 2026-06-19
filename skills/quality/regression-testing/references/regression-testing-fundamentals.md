# Regression Testing Fundamentals

## Overview
Regression testing verifies that recent code changes haven't broken existing functionality. Every time a change is made — new feature, bug fix, refactor, dependency update — regression tests ensure the system still works as expected. Effective regression testing balances coverage against execution time.

## Core Concepts

### Concept 1: Regression Test Selection
Running the full test suite on every change is impractical. Selection strategies:
- **Full suite**: Run everything (nightly or pre-release, not on every commit)
- **Impact analysis**: Run tests related to changed code (module-level, dependency graph)
- **Risk-based**: Prioritize tests for high-risk areas (critical features, recent changes, known fragile code)
- **Time-window**: Run tests based on last successful run age
- **Machine learning**: Model predicts which tests are likely to fail based on change patterns

### Concept 2: Test Suite Optimization
A healthy regression suite balances speed and coverage. Optimize by: removing redundant tests, converting slow E2E tests to fast API tests, breaking large suites into parallelizable shards, and retiring tests that never fail. Target: regression suite completes within 30 minutes.

### Concept 3: Flaky Test Management
Flaky tests (non-deterministic pass/fail) erode trust in the regression suite. Detect flaky tests by running multiple times, tracking pass rates, and flagging inconsistent results. Quarantine flaky tests within 24 hours and fix them within one sprint.

### Concept 4: Regression Test Automation
Automated regression testing runs on every PR, on merge to main, and on scheduled cadence. CI pipeline stages: unit regression (fast, every commit), integration regression (on PR merge), E2E regression (nightly, pre-release). Each stage has different scope and time budget.

## Implementation Guide

### Step 1: Categorize Tests by Risk
```yaml
regression_suite:
  tier_1_critical:
    description: "Run on every PR — must complete in < 5 min"
    tests:
      - "Core checkout flow"
      - "User authentication"
      - "Payment processing"
      - "Search functionality"
    allowed_failures: 0

  tier_2_high:
    description: "Run on merge to main — complete in < 15 min"
    tests:
      - "All API endpoints smoke tests"
      - "Database migration tests"
      - "Cross-feature integration tests"
    allowed_failures: "1 failure allowed, must be fixed within 24h"

  tier_3_full:
    description: "Run nightly — complete in < 60 min"
    tests:
      - "Full E2E suite"
      - "Visual regression suite"
      - "Performance regression suite"
      - "All integration tests"
    allowed_failures: "Quarantine flaky tests, fix within sprint"
```

### Step 2: Write Regression Tests
```python
# tests/regression/test_checkout_regression.py
"""Regression tests for checkout — run on every PR."""
import pytest
from httpx import AsyncClient

class TestCheckoutRegression:
    """Critical path tests — must pass for any PR merge."""

    async def test_complete_checkout_flow(self, client: AsyncClient):
        """Regression: full checkout flow should complete successfully."""
        # Add item to cart
        await client.post("/api/cart", json={"product_id": 1, "quantity": 1})
        # Checkout
        response = await client.post("/api/checkout")
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data["status"] == "confirmed"

    async def test_checkout_with_empty_cart(self, client: AsyncClient):
        """Regression: checkout with empty cart returns 400."""
        response = await client.post("/api/checkout")
        assert response.status_code == 400
        assert "empty" in response.json()["error"].lower()

    async def test_checkout_idempotency(self, client: AsyncClient):
        """Regression: same idempotency key returns same order."""
        await client.post("/api/cart", json={"product_id": 1, "quantity": 1})
        resp1 = await client.post("/api/checkout", headers={"Idempotency-Key": "key-1"})
        await client.post("/api/cart", json={"product_id": 2, "quantity": 1})
        resp2 = await client.post("/api/checkout", headers={"Idempotency-Key": "key-1"})
        assert resp1.json()["order_id"] == resp2.json()["order_id"]
```

### Step 3: CI Regression Pipeline
```yaml
# .github/workflows/regression.yml
name: Regression Tests
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 4 * * 1-5"  # Nightly full suite

jobs:
  tier-1:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Tier 1 — Critical path regression
        run: npx vitest run --project=tier-1

  tier-2:
    needs: tier-1
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Tier 2 — Integration regression
        run: npx vitest run --project=tier-2

  tier-3:
    needs: [tier-1, tier-2]
    runs-on: ubuntu-latest
    timeout-minutes: 60
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Tier 3 — Full regression suite
        run: npx vitest run --project=tier-3
```

### Step 4: Impact Analysis for Test Selection
```python
# scripts/select_regression_tests.py
import subprocess
import json

def get_changed_files(branch: str) -> list[str]:
    """Get files changed in the current branch vs main."""
    result = subprocess.run(
        ["git", "diff", "--name-only", f"origin/main...{branch}"],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.strip().split("\n")

def get_affected_tests(changed_files: list[str]) -> list[str]:
    """Map changed files to potentially affected test files."""
    module_tests = {
        "src/pricing": ["tests/integration/test_pricing.py", "tests/unit/test_pricing.py"],
        "src/checkout": ["tests/integration/test_checkout.py"],
        "src/user": ["tests/unit/test_user.py", "tests/integration/test_auth.py"],
    }
    affected = set()
    for changed in changed_files:
        for module, tests in module_tests.items():
            if changed.startswith(module):
                affected.update(tests)
    return list(affected)

if __name__ == "__main__":
    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    changed = get_changed_files(branch)
    tests = get_affected_tests(changed)
    print(f"::set-output name=test-files::{','.join(tests)}")
```

## Best Practices
- Tier regression tests by criticality and execution time
- Always run critical path tests on every PR
- Use impact analysis to select relevant tests for the change
- Quarantine flaky tests immediately — don't let them block CI
- Track regression suite health: pass rate, execution time, flakiness
- Convert slow E2E regression tests to faster API-level tests
- Regular test suite cleanup: remove redundant tests, retire never-failing tests
- Use test sharding for parallel execution in CI
- Monitor regression test coverage — ensure new features get regression tests
- Automate regression test selection based on code change analysis

## Common Pitfalls
- Running the full regression suite on every commit (too slow, blocks development)
- Ignoring flaky tests (erodes trust, masks real failures)
- No test selection strategy (wastes time on unrelated tests)
- Only adding, never removing tests (suite grows unbounded)
- E2E-heavy regression suite (brittle, slow, expensive)
- No coverage tracking (can't tell if new features are covered)
- Tests dependent on test order (fragile, hard to debug)
- Regression tests that duplicate lower-level tests (wasted effort)

## Key Points
- Regression testing prevents existing functionality from breaking
- Tier tests by criticality: critical on every PR, full suite nightly
- Use impact analysis to select relevant tests for each change
- Manage flaky tests: detect, quarantine, fix
- Optimize suite to fit within time budgets
- Track suite health metrics: pass rate, execution time, flakiness
- Convert slow tests to faster alternatives
- Clean up the suite regularly — remove redundant tests
