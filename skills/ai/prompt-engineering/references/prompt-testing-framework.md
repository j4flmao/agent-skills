# Prompt Testing Framework

## Overview
Prompt testing ensures prompts produce consistent, high-quality outputs across inputs and model versions. A structured testing framework covers unit tests, regression tests, edge case validation, and A/B testing.

## Test Types

### Unit Tests
Test individual prompt components in isolation.

```python
class PromptUnitTest:
    def __init__(self, model_fn):
        self.model = model_fn

    def test_output_format(self, prompt: str, expected_format: str) -> bool:
        output = self.model(prompt)
        if expected_format == "json":
            try:
                json.loads(output)
                return True
            except json.JSONDecodeError:
                return False
        elif expected_format == "list":
            lines = [l.strip() for l in output.split("\n") if l.strip()]
            return all(l.startswith(("- ", "* ", "1. ")) for l in lines[:3])
        return True

    def test_instruction_following(self, prompt: str, constraints: list[str]) -> dict:
        output = self.model(prompt)
        results = {}
        for constraint in constraints:
            if constraint == "under_100_words":
                results[constraint] = len(output.split()) <= 100
            elif constraint == "no_markdown":
                results[constraint] = not any(c in output for c in ["```", "# ", "**"])
            elif constraint == "positive_tone":
                negative_words = ["bad", "terrible", "awful", "hate", "worst"]
                results[constraint] = sum(1 for w in negative_words if w in output.lower()) == 0
        return results

    def test_robustness(self, prompt_template: str, test_inputs: list[str], expected_pattern: str) -> list[dict]:
        results = []
        for test_input in test_inputs:
            prompt = prompt_template.format(input=test_input)
            output = self.model(prompt)
            results.append({
                "input": test_input,
                "output": output,
                "matches_expected": bool(re.search(expected_pattern, output)),
            })
        return results
```

### Regression Test Suite
```python
class PromptRegressionSuite:
    def __init__(self, model_fn, baseline: dict | None = None):
        self.model = model_fn
        self.baseline = baseline or {}
        self.test_cases = []

    def add_test_case(self, name: str, prompt: str, expected: str, metric: str = "exact"):
        self.test_cases.append({
            "name": name,
            "prompt": prompt,
            "expected": expected,
            "metric": metric,
        })

    def run(self) -> dict:
        results = []
        for case in self.test_cases:
            output = self.model(case["prompt"])
            match = self._check_match(output, case["expected"], case["metric"])
            results.append({**case, "actual": output, "passed": match})

        passed = sum(1 for r in results if r["passed"])
        return {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "pass_rate": passed / max(len(results), 1),
            "details": results,
            "regression": self._check_regression(results),
        }

    def _check_regression(self, results: list[dict]) -> list[dict]:
        regressions = []
        for r in results:
            if r["name"] in self.baseline:
                if self.baseline[r["name"]] and not r["passed"]:
                    regressions.append({"test": r["name"], "was_passing": True, "now_failing": True})
        return regressions
```

## A/B Testing

```python
class PromptABTest:
    def __init__(self, model_fn, traffic_split: float = 0.1):
        self.model = model_fn
        self.split = traffic_split
        self.results = {"control": [], "variant": []}

    def run_test(self, control_prompt: str, variant_prompt: str, test_inputs: list[str], evaluator_fn) -> dict:
        for input_text in test_inputs:
            is_variant = hash(input_text) % 100 < self.split * 100
            prompt = variant_prompt if is_variant else control_prompt
            output = self.model(prompt.format(input=input_text))

            score = evaluator_fn(output, input_text)
            group = "variant" if is_variant else "control"
            self.results[group].append({
                "input": input_text,
                "output": output,
                "score": score,
            })

        return self._analyze()

    def _analyze(self) -> dict:
        control_scores = [r["score"] for r in self.results["control"]]
        variant_scores = [r["score"] for r in self.results["variant"]]

        from scipy import stats
        t_stat, p_value = stats.ttest_ind(control_scores, variant_scores)

        return {
            "control_mean": statistics.mean(control_scores) if control_scores else 0,
            "variant_mean": statistics.mean(variant_scores) if variant_scores else 0,
            "improvement": (statistics.mean(variant_scores) - statistics.mean(control_scores)) if variant_scores else 0,
            "p_value": p_value,
            "significant": p_value < 0.05,
            "control_samples": len(control_scores),
            "variant_samples": len(variant_scores),
            "control_std": statistics.stdev(control_scores) if len(control_scores) > 1 else 0,
            "variant_std": statistics.stdev(variant_scores) if len(variant_scores) > 1 else 0,
        }
```

## Version Testing

```python
class PromptVersionTester:
    def __init__(self, model_fn, versions: dict):
        self.model = model_fn
        self.versions = versions

    def test_all_versions(self, eval_set: list[dict]) -> dict:
        results = {}
        for version_name, prompt_template in self.versions.items():
            version_results = []
            for item in eval_set:
                prompt = prompt_template.format(**item)
                output = self.model(prompt)
                score = self._evaluate(output, item)
                version_results.append(score)

            results[version_name] = {
                "mean": statistics.mean(version_results),
                "std": statistics.stdev(version_results) if len(version_results) > 1 else 0,
                "samples": len(version_results),
            }
        return results

    def find_best_version(self, results: dict) -> str:
        return max(results, key=lambda v: results[v]["mean"])
```

## Key Points
- Unit test output format, instruction following, and robustness
- Run regression tests on every prompt change
- A/B test prompt variants with statistical significance (p<0.05)
- Version control all prompts for traceability
- Test on diverse inputs including edge cases
- Track pass rate over time for regression detection
- Automate prompt tests in CI/CD pipeline
- Evaluate on quality and latency metrics
- Set minimum pass rate thresholds for deployment
- Document test coverage for each prompt version
