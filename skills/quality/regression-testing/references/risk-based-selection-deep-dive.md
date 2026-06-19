# Risk-Based Regression Test Selection

## Risk Assessment Matrix
```yaml
risk_assessment:
  criteria:
    business_criticality:
      - "Revenue impact: checkout, pricing, payment"
      - "User trust: authentication, data privacy"
      - "Compliance: audit trails, data retention"
    change_frequency:
      - "High: modules changed in last 5 commits"
      - "Medium: modules changed in last 20 commits"
      - "Low: modules unchanged for > 20 commits"
    complexity:
      - "High: > 10 dependencies, multiple states"
      - "Medium: 3-10 dependencies"
      - "Low: < 3 dependencies, stateless"
    failure_history:
      - "High: failed > 3 times in last 100 runs"
      - "Medium: failed 1-3 times"
      - "Low: never failed"
```

## Selection Formula
```
Test Priority = (Business Criticality × 3) + (Change Frequency × 2) + (Complexity × 1) + (Failure History × 2)

Priority scoring:
- >= 20: Must-run on every PR
- 10-19: Run on merge to main
- < 10: Run nightly or pre-release
```

## Impact Analysis Automation
```bash
# Git-based test selection
changed_files=$(git diff --name-only origin/main...HEAD)
risk_tests=()

for file in $changed_files; do
  # Check if changed file has associated test files
  test_file=$(grep -l "from $file" tests/ --include="*.py" || true)
  if [ -n "$test_file" ]; then
    risk_tests+=("$test_file")
  fi

  # Check if changed file is a test helper (affects all tests)
  if [[ $file == tests/conftest.py || $file == tests/fixtures/* ]]; then
    risk_tests=("ALL")  # Run full suite
    break
  fi
done
```

## Key Points
- Score tests by business criticality, change frequency, complexity, and failure history
- Run high-risk tests on every PR, medium on merge, low nightly
- Automate impact analysis with git diff to select relevant tests
- Re-evaluate risk scores quarterly as code evolves
