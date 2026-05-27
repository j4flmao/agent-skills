# Model Comparison and Regression Detection

## Overview

Comparing LLM outputs across model versions, prompt variants, and configuration changes is essential for maintaining quality. Model comparison reveals regressions before they reach production, identifies improvements, and provides data-driven justification for model updates. This reference covers comparison methodologies, statistical testing, regression detection, A/B testing frameworks, and automated reporting.

## Comparison Methodologies

### Side-by-Side Evaluation

```python
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass, field
import asyncio

@dataclass
class ComparisonResult:
    query: str
    response_a: str
    response_b: str
    winner: Optional[str] = None  # "A", "B", "TIE"
    scores_a: Dict[str, float] = field(default_factory=dict)
    scores_b: Dict[str, float] = field(default_factory=dict)
    explanations: Dict[str, str] = field(default_factory=dict)

class ModelComparator:
    def __init__(self, model_a: Callable, model_b: Callable, evaluator=None):
        self.model_a = model_a
        self.model_b = model_b
        self.evaluator = evaluator

    async def compare_single(self, query: str, context: Optional[str] = None) -> ComparisonResult:
        response_a = await self.model_a(query)
        response_b = await self.model_b(query)
        result = ComparisonResult(query=query, response_a=response_a, response_b=response_b)
        if self.evaluator:
            score_a = await self.evaluator.evaluate(query, response_a, context)
            score_b = await self.evaluator.evaluate(query, response_b, context)
            result.scores_a = score_a if isinstance(score_a, dict) else {"overall": score_a}
            result.scores_b = score_b if isinstance(score_b, dict) else {"overall": score_b}
            overall_a = result.scores_a.get("overall_score", result.scores_a.get("overall", 0))
            overall_b = result.scores_b.get("overall_score", result.scores_b.get("overall", 0))
            if isinstance(overall_a, dict):
                overall_a = overall_a.get("score", 0)
            if isinstance(overall_b, dict):
                overall_b = overall_b.get("score", 0)
            if overall_a > overall_b:
                result.winner = "A"
            elif overall_b > overall_a:
                result.winner = "B"
            else:
                result.winner = "TIE"
        return result

    async def compare_batch(self, queries: List[str], batch_size: int = 10) -> List[ComparisonResult]:
        results = []
        for i in range(0, len(queries), batch_size):
            batch = queries[i:i + batch_size]
            batch_results = await asyncio.gather(*[
                self.compare_single(q) for q in batch
            ])
            results.extend(batch_results)
        return results

    def summary(self, results: List[ComparisonResult]) -> Dict:
        total = len(results)
        wins_a = sum(1 for r in results if r.winner == "A")
        wins_b = sum(1 for r in results if r.winner == "B")
        ties = sum(1 for r in results if r.winner == "TIE")
        return {
            "total": total,
            "model_a_wins": wins_a,
            "model_b_wins": wins_b,
            "ties": ties,
            "model_a_win_rate": wins_a / total if total > 0 else 0,
            "model_b_win_rate": wins_b / total if total > 0 else 0,
            "preferred": "A" if wins_a > wins_b else "B" if wins_b > wins_a else "TIE",
            "significant": abs(wins_a - wins_b) > total * 0.1,
        }
```

### Pairwise Elo Rating

```python
import math
from collections import defaultdict

class EloComparator:
    def __init__(self, initial_rating: float = 1500, k_factor: int = 32):
        self.ratings = defaultdict(lambda: initial_rating)
        self.k = k_factor
        self.history: List[Dict] = []

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))

    def update(self, model_a: str, model_b: str, winner: Optional[str]):
        rating_a = self.ratings[model_a]
        rating_b = self.ratings[model_b]
        expected_a = self.expected_score(rating_a, rating_b)
        expected_b = 1.0 - expected_a
        if winner == "A":
            score_a, score_b = 1.0, 0.0
        elif winner == "B":
            score_a, score_b = 0.0, 1.0
        else:
            score_a, score_b = 0.5, 0.5
        self.ratings[model_a] = rating_a + self.k * (score_a - expected_a)
        self.ratings[model_b] = rating_b + self.k * (score_b - expected_b)
        self.history.append({
            "model_a": model_a,
            "model_b": model_b,
            "winner": winner,
            "ratings_after": {
                model_a: self.ratings[model_a],
                model_b: self.ratings[model_b],
            },
        })

    def rank(self) -> List[tuple]:
        return sorted(self.ratings.items(), key=lambda x: -x[1])

    def compare_versions(self, version_a: str, version_b: str, num_comparisons: int = 100) -> Dict:
        results = []
        import random
        queries = [f"Query {i}: Test input {i}" for i in range(num_comparisons)]
        for query in queries:
            winner = random.choice(["A", "B", "TIE"])
            self.update(version_a, version_b, winner)
            results.append(winner)
        wins_a = results.count("A")
        wins_b = results.count("B")
        return {
            "version_a": version_a,
            "version_b": version_b,
            "rating_a": self.ratings[version_a],
            "rating_b": self.ratings[version_b],
            "win_rate_a": wins_a / num_comparisons,
            "win_rate_b": wins_b / num_comparisons,
        }
```

## Regression Detection

### Statistical Regression Testing

```python
import statistics
from typing import List, Dict, Optional

class RegressionDetector:
    def __init__(self, baseline_results: Dict[str, float], significance_threshold: float = 0.05):
        self.baseline = baseline_results
        self.significance_threshold = significance_threshold

    def check_regression(self, current_results: Dict[str, float]) -> List[Dict]:
        regressions = []
        for metric, baseline_val in self.baseline.items():
            current_val = current_results.get(metric)
            if current_val is None:
                continue
            diff = current_val - baseline_val
            pct_change = diff / baseline_val if baseline_val != 0 else float("inf")
            if pct_change < -self.significance_threshold:
                regressions.append({
                    "metric": metric,
                    "baseline": baseline_val,
                    "current": current_val,
                    "change": diff,
                    "pct_change": pct_change,
                    "type": "regression",
                    "severity": "critical" if pct_change < -0.1 else "warning",
                })
            elif pct_change > self.significance_threshold:
                regressions.append({
                    "metric": metric,
                    "baseline": baseline_val,
                    "current": current_val,
                    "change": diff,
                    "pct_change": pct_change,
                    "type": "improvement",
                })
        return regressions

    def format_report(self, regressions: List[Dict]) -> str:
        lines = ["Regression Analysis Report", "=" * 40, ""]
        critical = [r for r in regressions if r.get("severity") == "critical"]
        warnings = [r for r in regressions if r.get("severity") == "warning"]
        improvements = [r for r in regressions if r["type"] == "improvement"]
        if critical:
            lines.append(f"CRITICAL REGRESSIONS ({len(critical)}):")
            for r in critical:
                lines.append(f"  {r['metric']}: {r['baseline']:.3f} -> {r['current']:.3f} ({r['pct_change']:.1%})")
        if warnings:
            lines.append(f"WARNINGS ({len(warnings)}):")
            for r in warnings:
                lines.append(f"  {r['metric']}: {r['baseline']:.3f} -> {r['current']:.3f} ({r['pct_change']:.1%})")
        if improvements:
            lines.append(f"IMPROVEMENTS ({len(improvements)}):")
            for r in improvements:
                lines.append(f"  {r['metric']}: {r['baseline']:.3f} -> {r['current']:.3f} (+{r['pct_change']:.1%})")
        return "\n".join(lines)
```

### Automated Per-Commit Testing

```python
from pathlib import Path
import json
import time

class CommitRegressionChecker:
    def __init__(self, baseline_dir: str = "baselines"):
        self.baseline_dir = Path(baseline_dir)
        self.baseline_dir.mkdir(exist_ok=True)

    def save_baseline(self, suite_name: str, results: Dict):
        path = self.baseline_dir / f"{suite_name}.json"
        with open(path, "w") as f:
            json.dump({
                "results": results,
                "timestamp": time.time(),
                "version": results.get("_version", "unknown"),
            }, f, indent=2)

    def load_baseline(self, suite_name: str) -> Optional[Dict]:
        path = self.baseline_dir / f"{suite_name}.json"
        if path.exists():
            with open(path) as f:
                return json.load(f)
        return None

    def check_commit(self, suite_name: str, current_results: Dict) -> Dict:
        baseline = self.load_baseline(suite_name)
        if baseline is None:
            self.save_baseline(suite_name, current_results)
            return {"status": "baseline_created", "regressions": []}
        detector = RegressionDetector(
            baseline["results"],
            significance_threshold=current_results.get("_threshold", 0.05),
        )
        regressions = detector.check_regression(current_results)
        if not regressions:
            self.save_baseline(suite_name, current_results)
        return {
            "status": "checked",
            "baseline_version": baseline.get("version", "unknown"),
            "current_version": current_results.get("_version", "unknown"),
            "regressions": regressions,
            "has_regression": any(r["type"] == "regression" for r in regressions),
        }
```

## A/B Testing Framework

### Production A/B Testing

```python
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable

class ABTestConfig:
    def __init__(self, name: str, traffic_pct: float = 50, min_sample: int = 1000):
        self.name = name
        self.traffic_pct = traffic_pct  # percentage to experiment model
        self.min_sample = min_sample
        self.start_time = datetime.now()

class ABTestResult:
    def __init__(self, config: ABTestConfig):
        self.config = config
        self.control_results: List[Dict] = []
        self.experiment_results: List[Dict] = []
        self.metrics: Dict = {}

    def add_observation(self, model: str, metrics: Dict):
        if model == "control":
            self.control_results.append(metrics)
        else:
            self.experiment_results.append(metrics)

    def compute_metrics(self):
        control_avg = {}
        experiment_avg = {}
        for key in self.control_results[0] if self.control_results else {}:
            control_avg[key] = sum(r.get(key, 0) for r in self.control_results) / len(self.control_results)
            experiment_avg[key] = sum(r.get(key, 0) for r in self.experiment_results) / len(self.experiment_results)
        self.metrics = {
            "control": control_avg,
            "experiment": experiment_avg,
            "improvements": {
                k: experiment_avg.get(k, 0) - control_avg.get(k, 0)
                for k in set(list(control_avg.keys()) + list(experiment_avg.keys()))
            },
        }

    def is_significant(self, metric: str) -> bool:
        if metric not in self.metrics.get("improvements", {}):
            return False
        improvement = self.metrics["improvements"][metric]
        return abs(improvement) > 0.05  # 5% threshold

    def should_rollout(self) -> bool:
        if len(self.experiment_results) < self.config.min_sample:
            return False
        self.compute_metrics()
        critical_metrics = ["error_rate", "toxicity", "latency_p99"]
        for m in critical_metrics:
            imp = self.metrics.get("improvements", {}).get(m, 0)
            if imp > 0.02:
                return False
        positive_metrics = ["feedback_score", "success_rate", "relevance"]
        positive_count = sum(
            1 for m in positive_metrics
            if self.metrics.get("improvements", {}).get(m, 0) > 0
        )
        return positive_count >= len(positive_metrics) * 0.5


class ABTestRunner:
    def __init__(self, control_model: Callable, experiment_model: Callable):
        self.control = control_model
        self.experiment = experiment_model
        self.active_tests: Dict[str, ABTestResult] = {}

    def start_test(self, config: ABTestConfig) -> ABTestResult:
        result = ABTestResult(config)
        self.active_tests[config.name] = result
        return result

    async def route_request(self, query: str, test_name: str) -> tuple:
        test = self.active_tests.get(test_name)
        if test is None:
            return await self.control(query), "control"
        if random.random() * 100 < test.config.traffic_pct:
            response = await self.experiment(query)
            return response, "experiment"
        else:
            response = await self.control(query)
            return response, "control"

    def end_test(self, test_name: str) -> ABTestResult:
        test = self.active_tests.pop(test_name)
        test.compute_metrics()
        return test
```

## Visualization and Reporting

### Comparison Report Generation

```python
class ComparisonReport:
    def __init__(self, comparator: ModelComparator):
        self.comparator = comparator

    def generate_text_report(self, results: List[ComparisonResult]) -> str:
        summary = self.comparator.summary(results)
        lines = [
            "Model Comparison Report",
            "=" * 50,
            f"Tested {summary['total']} queries",
            f"A wins: {summary['model_a_wins']} ({summary['model_a_win_rate']:.1%})",
            f"B wins: {summary['model_b_wins']} ({summary['model_b_win_rate']:.1%})",
            f"Ties: {summary['ties']}",
            f"Preferred: Model {summary['preferred']}",
            "",
            "Details:",
        ]
        for i, r in enumerate(results[:20], 1):
            lines.append(f"  [{i}] Q: {r.query[:50]}...")
            lines.append(f"      Winner: {r.winner}")
        if len(results) > 20:
            lines.append(f"  ... and {len(results) - 20} more")
        return "\n".join(lines)

    def generate_markdown_table(self, results: List[ComparisonResult]) -> str:
        summary = self.comparator.summary(results)
        lines = [
            f"## Model Comparison: {summary['total']} Queries",
            "",
            f"| Metric | Value |",
            f"|---|---|",
            f"| Model A Wins | {summary['model_a_wins']} ({summary['model_a_win_rate']:.1%}) |",
            f"| Model B Wins | {summary['model_b_wins']} ({summary['model_b_win_rate']:.1%}) |",
            f"| Ties | {summary['ties']} |",
            f"| Winner | Model {summary['preferred']} |",
            "",
            "### Top Disagreements",
        ]
        disagreements = [r for r in results if r.winner != "TIE"]
        for r in disagreements[:5]:
            lines.append(f"- **Q:** {r.query[:80]}")
            lines.append(f"  - A: {r.response_a[:100]}...")
            lines.append(f"  - B: {r.response_b[:100]}...")
            lines.append(f"  - Winner: {r.winner}")
        return "\n".join(lines)
```

## Key Points

- Run side-by-side comparisons on a fixed evaluation dataset for reproducible results.
- Use Elo ratings for continuous model ranking across multiple comparisons.
- Detect regressions statistically by comparing against stored baselines.
- Run per-commit regression checks in CI to catch quality drops before deployment.
- Use A/B testing in production for real-world validation of model improvements.
- Require minimum sample sizes before making rollout decisions from A/B tests.
- Monitor both quality metrics and operational metrics (latency, cost) in comparisons.
- Report comparison results with both aggregate statistics and individual examples.
- Automate regression detection in CI/CD pipelines as a quality gate.
- Version baseline results alongside model and prompt versions.
- Include tie rates in analysis — high tie rates indicate models are functionally equivalent.
- Track comparison results over time to measure improvement velocity.
- Consider user feedback as a complementary signal to automated evaluation.
- Always check for regressions on safety and accuracy metrics before any other dimension.
- Use pairwise human evaluation periodically to validate automated comparison results.
- Store all comparison raw data for audit and retrospective analysis.
