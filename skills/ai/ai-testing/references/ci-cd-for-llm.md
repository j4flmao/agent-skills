# CI/CD for LLM Testing

## Pipeline with Quality Gates

```yaml
name: LLM Tests
on:
  pull_request:
    branches: [main]
    paths:
      - 'prompts/**'
      - 'models/**'
      - 'config/**'
      - 'tests/**'
  push:
    branches: [main]

jobs:
  fast-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run fast validation
        run: |
          pytest tests/llm/fast/ -v --junitxml=fast-results.xml
      - name: Gate check (all P0 must pass)
        run: |
          python scripts/check_gates.py \
            --results fast-results.xml \
            --p0-pass-required 1.0

  full-suite:
    needs: fast-tests
    runs-on: [self-hosted, gpu]
    steps:
      - name: Deploy model candidate
        run: |
          python scripts/deploy_candidate.py \
            --model ${{ github.head_ref || github.ref_name }}
      - name: Run full test suite
        run: |
          pytest tests/llm/full/ -v --junitxml=full-results.xml
      - name: Generate evaluation report
        run: |
          python scripts/generate_report.py \
            --results full-results.xml \
            --output eval-report.md
      - name: Quality gates
        run: |
          python scripts/check_gates.py \
            --results full-results.xml \
            --p0-pass-required 1.0 \
            --p1-pass-required 0.9 \
            --latency-max 5.0

  regression-check:
    needs: full-suite
    runs-on: ubuntu-latest
    steps:
      - name: Compare with baseline
        run: |
          python scripts/model_comparison.py \
            --baseline production \
            --candidate ${{ github.head_ref || github.ref_name }} \
            --dataset golden.json \
            --threshold 0.95

  deploy-staging:
    needs: regression-check
    if: success()
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Promote to staging
        run: |
          python scripts/promote.py \
            --model ${{ github.head_ref || github.ref_name }} \
            --environment staging
      - name: Canary test (10%)
        run: |
          python scripts/canary.py \
            --endpoint staging.api.example.com \
            --traffic 10 \
            --duration 30
```

## Quality Gate Script

```python
import xml.etree.ElementTree as ET
import sys

class QualityGate:
    def __init__(self, results_file):
        self.tree = ET.parse(results_file)
        self.root = self.tree.getroot()

    def check_gates(self, config):
        failures = []

        # Check by priority
        for testcase in self.root.iter('testcase'):
            priority = testcase.get('classname', '').split('.')[-1]
            if priority not in config:
                continue

            threshold = config[priority]['pass_required']
            failures_el = testcase.find('failure')
            is_failure = failures_el is not None

            if is_failure:
                failures.append({
                    "name": testcase.get('name'),
                    "priority": priority,
                    "message": failures_el.get('message') if failures_el is not None else "unknown",
                })

        # Calculate pass rates
        total_by_priority = {}
        for priority in config:
            tests = [t for t in self.root.iter('testcase') if t.get('classname', '').endswith(priority)]
            total_by_priority[priority] = {
                "total": len(tests),
                "failed": len([t for t in tests if t.find('failure') is not None]),
            }

        # Enforce gates
        gates_passed = True
        for priority, stats in total_by_priority.items():
            pass_rate = (stats["total"] - stats["failed"]) / stats["total"] if stats["total"] > 0 else 1.0
            required = config[priority]['pass_required']
            if pass_rate < required:
                print(f"FAIL: {priority} pass rate {pass_rate:.1%} < required {required:.0%}")
                gates_passed = False

        return gates_passed, failures


if __name__ == "__main__":
    gate = QualityGate(sys.argv[1])
    config = {
        "P0": {"pass_required": 1.0},
        "P1": {"pass_required": 0.9},
    }
    passed, failures = gate.check_gates(config)
    if not passed:
        print(f"Quality gate failed: {len(failures)} failures")
        sys.exit(1)
    print("All quality gates passed")
```

## Model Comparison

```python
class ModelComparator:
    def __init__(self, golden_dataset):
        self.dataset = golden_dataset

    def compare(self, baseline_model, candidate_model):
        baseline_scores = self.evaluate(baseline_model)
        candidate_scores = self.evaluate(candidate_model)

        regression = False
        report = {"summary": {}, "details": {}}

        for category in baseline_scores:
            base = baseline_scores[category]
            cand = candidate_scores[category]

            ratio = cand / base if base > 0 else 1.0
            report["details"][category] = {
                "baseline": base,
                "candidate": cand,
                "ratio": ratio,
            }

            if ratio < 0.95:
                regression = True
                report["details"][category]["regression"] = True

        report["summary"] = {
            "has_regression": regression,
            "baseline_total": sum(baseline_scores.values()),
            "candidate_total": sum(candidate_scores.values()),
        }

        return report

    def evaluate(self, model):
        scores = {"factuality": 0, "safety": 0, "format": 0, "consistency": 0}
        counts = {"factuality": 0, "safety": 0, "format": 0, "consistency": 0}

        for test in self.dataset:
            category = test.get("category", "other")
            if category not in scores:
                continue

            output = model.generate(test["prompt"])
            passed = self.check_assertions(output, test)
            if passed:
                scores[category] += 1
            counts[category] += 1

        return {k: scores[k] / counts[k] for k in scores if counts[k] > 0}
```

## Prompt Versioning

```yaml
# prompt_registry.yaml
prompts:
  qa_template_v1:
    template: "Answer the following question concisely: {{question}}"
    tests:
      - test_id: fact-001
      - test_id: fact-002
    version: 1
    created: 2024-01-01

  qa_template_v2:
    template: |
      You are a helpful assistant that answers questions factually.
      If you don't know, say you don't know.
      Question: {{question}}
      Answer:
    tests:
      - test_id: fact-001
      - test_id: fact-002
      - test_id: safe-001
    version: 2
    created: 2024-03-01
    supersedes: qa_template_v1
```

## Monitoring Dashboard

```python
# Track metrics over time
class LLMMonitor:
    def __init__(self, db):
        self.db = db

    def record_eval(self, model_version, metrics):
        self.db.insert({
            "timestamp": datetime.now(),
            "model_version": model_version,
            "accuracy": metrics["accuracy"],
            "safety_pass_rate": metrics["safety_pass_rate"],
            "latency_p99": metrics["latency_p99"],
            "cost_per_query": metrics["cost_per_query"],
        })

    def get_trend(self, metric="accuracy", days=30):
        data = self.db.query(f"SELECT * FROM evals WHERE timestamp > NOW() - {days}d")
        return data

    def alert_on_degradation(self):
        recent = self.get_trend("accuracy", days=1)
        historical = self.get_trend("accuracy", days=30)

        recent_avg = sum(r["accuracy"] for r in recent) / len(recent)
        historical_avg = sum(r["accuracy"] for r in historical) / len(historical)

        if recent_avg < historical_avg * 0.95:
            print(f"ALERT: accuracy degraded to {recent_avg:.3f} from {historical_avg:.3f}")
```
