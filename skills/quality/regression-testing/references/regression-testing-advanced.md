# Regression Testing Advanced Topics

## Introduction
Advanced regression testing covers ML-driven test selection, regression prediction using code metrics, automated flaky test root cause analysis, visual regression pipelines, and regression testing in microservice deployments with canary releases.

## ML-Driven Test Selection
Machine learning models predict which tests are likely to fail based on code change patterns:

```python
# scripts/ml_test_selection.py
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer

class TestFailurePredictor:
    """Predict which regression tests are likely to fail for a given change."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000)
        self.model = RandomForestClassifier(n_estimators=100)

    def train(self, historical_changes: list[dict], historical_failures: list[list[str]]):
        """Train on historical change → failure data."""
        # Features: changed files, author, day of week, lines changed
        features = []
        for change in historical_changes:
            feature_vector = self._extract_features(change)
            features.append(feature_vector)
        # Labels: which tests failed
        X = np.array(features)
        y = historical_failures  # Multi-label
        self.model.fit(X, y)

    def predict_risky_tests(self, change: dict) -> list[str]:
        """Return tests likely to fail for this change."""
        features = self._extract_features(change)
        probabilities = self.model.predict_proba([features])
        # Return tests with > 30% failure probability
        return [
            test for test, prob in zip(self.model.classes_, probabilities[0])
            if prob > 0.3
        ]
```

## Flaky Test Root Cause Analysis
```python
class FlakyTestAnalyzer:
    """Analyze flaky test patterns to identify root causes."""

    def analyze_timing(self, test_name: str, run_history: list[dict]) -> dict:
        """Check if test flakiness correlates with CI runner load."""
        times = [r["duration_ms"] for r in run_history if r["passed"]]
        failed_times = [r["duration_ms"] for r in run_history if not r["passed"]]
        if failed_times and max(failed_times) > np.percentile(times, 95):
            return {"root_cause": "timing_sensitive", "p_value": 0.01}
        return {"root_cause": "unknown"}

    def detect_test_pollution(self, test_name: str, suite_results: dict) -> list[str]:
        """Detect if test fails due to state left by previous tests."""
        pollution_candidates = []
        for other_test, results in suite_results.items():
            if other_test == test_name:
                continue
            # Check if this test only fails when preceded by other_test
            if self._test_fails_after_only(test_name, other_test, results):
                pollution_candidates.append(other_test)
        return pollution_candidates
```

## Visual Regression Regression Pipeline
```typescript
// Playwright visual regression in regression suite
test('homepage — visual regression', async ({ page }) => {
  await page.goto('https://app.example.com');
  await page.waitForLoadState('networkidle');

  // Full-page screenshot comparison
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 500,
    threshold: 0.2,
    stylePath: './visual-hide-annotations.css',
  });
});
```

## Regression Testing for Microservice Deployments
```yaml
# Kubernetes post-deployment regression check
apiVersion: v1
kind: Pod
metadata:
  name: post-deploy-regression
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
spec:
  containers:
    - name: regression-runner
      image: regression-runner:latest
      env:
        - name: TARGET_URL
          value: "https://new-deploy.example.com"
      command: ["/bin/sh", "-c"]
      args:
        - |
          npm run regression:tier-1 &&
          npm run regression:tier-2
  restartPolicy: Never
```

## Canary Regression Gates
```yaml
canary_gates:
  - name: "regression_pass_rate"
    description: "All tier-1 regression tests must pass before canary promotion"
    check: "regression_suite_pass_rate == 100%"
    action: "block_promotion"

  - name: "performance_regression"
    description: "p95 latency must not increase by more than 10%"
    check: "p95_latency_diff < 10%"
    action: "rollback_canary"
```

## Key Points
- ML-driven test selection reduces regression suite execution time
- Analyze flaky test root causes systematically (timing, pollution, environment)
- Visual regression detects UI changes beyond functional assertions
- Run regression tests on canary deployments before promoting to full production
- Use post-deployment regression checks in Kubernetes for continuous validation
- Track regression suite metrics: precision, recall, execution time, flakiness rate
