# Regression Detection

## Foundations of Agent Behavior Regression

Regression detection for LLM agents identifies cases where a new agent version, model update, or prompt change causes degradation in previously working capabilities. Unlike traditional software regression testing that checks deterministic outputs, agent regression detection must account for stochastic behavior, semantic equivalence, and multi-dimensional quality metrics.

### Core Regression Types

```
+-------------------------------------------------------------------+
|                    REGRESSION TAXONOMY                             |
+-------------------------------------------------------------------+
|                                                                   |
|  Functional Regression                                            |
|  ├── Task completion rate drops                                   |
|  ├── Tool usage errors increase                                   |
|  ├── Output format violations                                     |
|  └── Instruction following failures                               |
|                                                                   |
|  Quality Regression                                               |
|  ├── Response coherence degradation                               |
|  ├── Factual accuracy decrease                                    |
|  ├── Reasoning depth reduction                                    |
|  └── Citation quality decline                                     |
|                                                                   |
|  Performance Regression                                           |
|  ├── Latency increase                                             |
|  ├── Token usage inflation                                        |
|  ├── Step count increase                                          |
|  └── Cost per task increase                                       |
|                                                                   |
|  Safety Regression                                                |
|  ├── Guardrail bypass increase                                    |
|  ├── Hallucination rate increase                                  |
|  ├── Harmful content generation                                   |
|  └── PII leakage incidents                                        |
|                                                                   |
+-------------------------------------------------------------------+
```

### Formal Regression Definition

Given a baseline agent version $A_b$ and a candidate version $A_c$, a regression exists on metric $m$ if:

$$\Delta_m = m(A_c) - m(A_b) < -\epsilon_m$$

Where $\epsilon_m$ is the minimum detectable effect size for metric $m$. For metrics where higher is worse (e.g., error rate), the sign is reversed.

---

## Baseline Comparison Framework

### Establishing Baselines

A baseline is a fixed snapshot of agent performance metrics against a canonical evaluation set. Baselines must be versioned, reproducible, and tied to specific agent configurations.

```python
import json
import hashlib
import statistics
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from enum import Enum


class MetricDirection(Enum):
    """Whether higher values are better or worse."""
    HIGHER_IS_BETTER = "higher_is_better"
    LOWER_IS_BETTER = "lower_is_better"


@dataclass
class MetricDefinition:
    """Defines a metric for regression tracking."""
    name: str
    direction: MetricDirection
    threshold: float  # minimum change to flag as regression
    critical: bool = False  # if True, any regression blocks deployment
    weight: float = 1.0  # importance weight for composite scoring


@dataclass
class BaselineSnapshot:
    """Immutable record of agent performance at a point in time."""
    baseline_id: str
    agent_version: str
    model_version: str
    prompt_hash: str
    timestamp: str
    eval_set_id: str
    eval_set_hash: str
    metrics: Dict[str, float]
    per_task_scores: Dict[str, Dict[str, float]]
    config: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)

    @classmethod
    def from_json(cls, data: str) -> "BaselineSnapshot":
        return cls(**json.loads(data))


class BaselineManager:
    """
    Manages baseline snapshots for agent regression detection.
    Supports creating, storing, comparing, and promoting baselines.
    """

    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._metrics_registry: Dict[str, MetricDefinition] = {}

    def register_metric(self, metric: MetricDefinition) -> None:
        """Register a metric definition for regression tracking."""
        self._metrics_registry[metric.name] = metric

    def create_baseline(
        self,
        agent_version: str,
        model_version: str,
        prompt_text: str,
        eval_set_id: str,
        eval_results: List[Dict[str, Any]],
        config: Dict[str, Any] = None
    ) -> BaselineSnapshot:
        """
        Creates a new baseline snapshot from evaluation results.

        Args:
            agent_version: Semantic version of the agent
            model_version: Model identifier (e.g., gpt-4o-2024-08-06)
            prompt_text: Full system prompt text for hashing
            eval_set_id: Identifier for the evaluation dataset
            eval_results: List of per-task evaluation results
            config: Agent configuration parameters

        Returns:
            Frozen BaselineSnapshot
        """
        prompt_hash = hashlib.sha256(prompt_text.encode()).hexdigest()[:16]
        eval_hash = hashlib.sha256(
            json.dumps(eval_results, sort_keys=True).encode()
        ).hexdigest()[:16]

        # Aggregate metrics across all tasks
        metrics = self._aggregate_metrics(eval_results)

        # Store per-task scores for drill-down analysis
        per_task = {}
        for result in eval_results:
            task_id = result.get("task_id", f"task-{len(per_task)}")
            per_task[task_id] = {
                k: v for k, v in result.items()
                if isinstance(v, (int, float)) and k != "task_id"
            }

        timestamp = datetime.now(timezone.utc).isoformat()
        baseline_id = f"bl-{agent_version}-{timestamp[:10]}-{prompt_hash[:8]}"

        snapshot = BaselineSnapshot(
            baseline_id=baseline_id,
            agent_version=agent_version,
            model_version=model_version,
            prompt_hash=prompt_hash,
            timestamp=timestamp,
            eval_set_id=eval_set_id,
            eval_set_hash=eval_hash,
            metrics=metrics,
            per_task_scores=per_task,
            config=config or {}
        )

        # Persist
        path = self.storage_dir / f"{baseline_id}.json"
        path.write_text(snapshot.to_json())

        return snapshot

    def _aggregate_metrics(
        self, eval_results: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Aggregates per-task metrics into summary statistics."""
        metric_values: Dict[str, List[float]] = {}

        for result in eval_results:
            for key, value in result.items():
                if isinstance(value, (int, float)) and key != "task_id":
                    metric_values.setdefault(key, []).append(float(value))

        aggregated = {}
        for name, values in metric_values.items():
            aggregated[f"{name}_mean"] = statistics.mean(values)
            aggregated[f"{name}_median"] = statistics.median(values)
            aggregated[f"{name}_std"] = (
                statistics.stdev(values) if len(values) > 1 else 0.0
            )
            aggregated[f"{name}_min"] = min(values)
            aggregated[f"{name}_max"] = max(values)
            aggregated[f"{name}_p5"] = sorted(values)[max(0, int(len(values) * 0.05))]
            aggregated[f"{name}_p95"] = sorted(values)[min(len(values) - 1, int(len(values) * 0.95))]

        return aggregated

    def compare_to_baseline(
        self,
        baseline: BaselineSnapshot,
        candidate_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compares candidate evaluation results against a baseline snapshot.

        Returns:
            Regression report with per-metric comparisons and overall verdict.
        """
        candidate_metrics = self._aggregate_metrics(candidate_results)

        comparisons = []
        has_critical_regression = False
        regression_count = 0
        improvement_count = 0

        for metric_name, definition in self._metrics_registry.items():
            base_key = f"{metric_name}_mean"
            if base_key not in baseline.metrics or base_key not in candidate_metrics:
                continue

            base_val = baseline.metrics[base_key]
            cand_val = candidate_metrics[base_key]
            delta = cand_val - base_val

            # Determine if this is a regression
            if definition.direction == MetricDirection.HIGHER_IS_BETTER:
                is_regression = delta < -definition.threshold
                is_improvement = delta > definition.threshold
            else:
                is_regression = delta > definition.threshold
                is_improvement = delta < -definition.threshold

            if is_regression:
                regression_count += 1
                if definition.critical:
                    has_critical_regression = True

            if is_improvement:
                improvement_count += 1

            comparisons.append({
                "metric": metric_name,
                "baseline_value": base_val,
                "candidate_value": cand_val,
                "delta": delta,
                "relative_change_pct": (delta / base_val * 100) if base_val != 0 else float('inf'),
                "threshold": definition.threshold,
                "is_regression": is_regression,
                "is_improvement": is_improvement,
                "is_critical": definition.critical,
                "direction": definition.direction.value
            })

        verdict = "PASS"
        if has_critical_regression:
            verdict = "FAIL_CRITICAL"
        elif regression_count > 0:
            verdict = "FAIL_REGRESSION"

        return {
            "verdict": verdict,
            "baseline_id": baseline.baseline_id,
            "regression_count": regression_count,
            "improvement_count": improvement_count,
            "total_metrics": len(comparisons),
            "comparisons": comparisons,
            "has_critical_regression": has_critical_regression
        }

    def load_baseline(self, baseline_id: str) -> BaselineSnapshot:
        """Load a baseline snapshot from storage."""
        path = self.storage_dir / f"{baseline_id}.json"
        return BaselineSnapshot.from_json(path.read_text())

    def get_latest_baseline(
        self, agent_version_prefix: str = None
    ) -> Optional[BaselineSnapshot]:
        """Get the most recent baseline, optionally filtered by version prefix."""
        baselines = []
        for path in self.storage_dir.glob("bl-*.json"):
            snapshot = BaselineSnapshot.from_json(path.read_text())
            if agent_version_prefix is None or snapshot.agent_version.startswith(agent_version_prefix):
                baselines.append(snapshot)

        if not baselines:
            return None

        return max(baselines, key=lambda b: b.timestamp)
```

---

## A/B Testing for Agent Versions

### Experimental Design

A/B testing for agents requires careful design to isolate the effect of changes from confounding factors like input distribution shifts, time-of-day effects, and model provider variability.

```
+-------------------------------------------------------------------+
|                  A/B TEST ARCHITECTURE                            |
+-------------------------------------------------------------------+
|                                                                   |
|  User Requests                                                    |
|       │                                                           |
|       ▼                                                           |
|  ┌─────────────┐                                                  |
|  │  Router /    │                                                  |
|  │  Splitter    │                                                  |
|  └──────┬──────┘                                                  |
|         │                                                         |
|    ┌────┴────┐                                                    |
|    │         │                                                    |
|    ▼         ▼                                                    |
|  ┌─────┐  ┌─────┐                                                |
|  │  A  │  │  B  │   ◄── Same inputs, different agent versions     |
|  │Base │  │Cand │                                                 |
|  └──┬──┘  └──┬──┘                                                |
|     │        │                                                    |
|     ▼        ▼                                                    |
|  ┌──────────────┐                                                 |
|  │   Evaluator  │   ◄── Blind evaluation (judge doesn't know      |
|  │   (Blind)    │       which version produced which output)      |
|  └──────┬───────┘                                                 |
|         │                                                         |
|         ▼                                                         |
|  ┌──────────────┐                                                 |
|  │  Statistical │                                                 |
|  │  Analysis    │                                                 |
|  └──────────────┘                                                 |
|                                                                   |
+-------------------------------------------------------------------+
```

### A/B Test Runner

```python
import random
import uuid
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Any, Optional, Tuple
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics
import math


class VariantAssignment(Enum):
    CONTROL = "control"
    TREATMENT = "treatment"


@dataclass
class ABTestConfig:
    """Configuration for an A/B test between agent versions."""
    test_id: str
    control_version: str
    treatment_version: str
    traffic_split: float = 0.5  # fraction going to treatment
    min_samples: int = 100
    max_samples: int = 10000
    primary_metric: str = "task_success"
    significance_level: float = 0.05  # alpha
    minimum_detectable_effect: float = 0.05  # MDE
    sequential_testing: bool = True  # allow early stopping
    metrics_to_track: List[str] = field(default_factory=lambda: [
        "task_success", "output_quality", "latency_ms", "token_count"
    ])


@dataclass
class ABTestResult:
    """Result from a single A/B test trial."""
    trial_id: str
    test_id: str
    variant: VariantAssignment
    input_hash: str
    metrics: Dict[str, float]
    raw_output: str = ""
    error: Optional[str] = None


class ABTestRunner:
    """
    Runs A/B tests between two agent versions with statistical rigor.
    Supports sequential testing for early stopping.
    """

    def __init__(
        self,
        control_fn: Callable[[Dict], Dict],
        treatment_fn: Callable[[Dict], Dict],
        evaluator_fn: Callable[[Dict, Dict], Dict[str, float]],
        config: ABTestConfig
    ):
        self.control_fn = control_fn
        self.treatment_fn = treatment_fn
        self.evaluator_fn = evaluator_fn
        self.config = config
        self.results: List[ABTestResult] = []

    def assign_variant(self, input_hash: str) -> VariantAssignment:
        """
        Deterministic variant assignment based on input hash.
        Ensures the same input always goes to the same variant.
        """
        hash_val = int(hashlib.sha256(input_hash.encode()).hexdigest()[:8], 16)
        threshold = int(self.config.traffic_split * 0xFFFFFFFF)
        if hash_val < threshold:
            return VariantAssignment.TREATMENT
        return VariantAssignment.CONTROL

    def run_trial(self, test_input: Dict[str, Any]) -> ABTestResult:
        """Run a single A/B test trial."""
        input_str = json.dumps(test_input, sort_keys=True)
        input_hash = hashlib.sha256(input_str.encode()).hexdigest()[:16]
        variant = self.assign_variant(input_hash)

        try:
            if variant == VariantAssignment.CONTROL:
                output = self.control_fn(test_input)
            else:
                output = self.treatment_fn(test_input)

            metrics = self.evaluator_fn(test_input, output)
        except Exception as e:
            return ABTestResult(
                trial_id=str(uuid.uuid4())[:8],
                test_id=self.config.test_id,
                variant=variant,
                input_hash=input_hash,
                metrics={},
                error=str(e)
            )

        result = ABTestResult(
            trial_id=str(uuid.uuid4())[:8],
            test_id=self.config.test_id,
            variant=variant,
            input_hash=input_hash,
            metrics=metrics,
            raw_output=str(output)[:500]
        )
        self.results.append(result)
        return result

    def run_batch(
        self,
        inputs: List[Dict[str, Any]],
        max_workers: int = 4
    ) -> List[ABTestResult]:
        """Run A/B test over a batch of inputs with parallel execution."""
        batch_results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.run_trial, inp): inp
                for inp in inputs[:self.config.max_samples]
            }
            for future in as_completed(futures):
                result = future.result()
                batch_results.append(result)

                # Sequential testing: check if we can stop early
                if self.config.sequential_testing:
                    if len(batch_results) >= self.config.min_samples:
                        analysis = self.analyze()
                        if analysis.get("can_stop_early", False):
                            # Cancel remaining futures
                            for f in futures:
                                f.cancel()
                            break

        return batch_results

    def analyze(self) -> Dict[str, Any]:
        """
        Analyze accumulated A/B test results.
        Returns statistical comparison for each tracked metric.
        """
        control_results = [
            r for r in self.results
            if r.variant == VariantAssignment.CONTROL and r.error is None
        ]
        treatment_results = [
            r for r in self.results
            if r.variant == VariantAssignment.TREATMENT and r.error is None
        ]

        if len(control_results) < 2 or len(treatment_results) < 2:
            return {"error": "Insufficient samples", "can_stop_early": False}

        analyses = {}
        for metric in self.config.metrics_to_track:
            control_vals = [
                r.metrics[metric] for r in control_results if metric in r.metrics
            ]
            treatment_vals = [
                r.metrics[metric] for r in treatment_results if metric in r.metrics
            ]

            if not control_vals or not treatment_vals:
                continue

            analysis = self._compare_metric(
                control_vals, treatment_vals, metric
            )
            analyses[metric] = analysis

        # Overall verdict based on primary metric
        primary = analyses.get(self.config.primary_metric, {})
        verdict = "INCONCLUSIVE"
        can_stop = False

        if primary.get("p_value", 1.0) < self.config.significance_level:
            can_stop = True
            if primary.get("effect_size", 0) > 0:
                verdict = "TREATMENT_WINS"
            else:
                verdict = "CONTROL_WINS"

        # Check if we have enough power to detect MDE
        total_n = len(control_results) + len(treatment_results)
        if total_n >= self.config.max_samples:
            can_stop = True
            if verdict == "INCONCLUSIVE":
                verdict = "NO_SIGNIFICANT_DIFFERENCE"

        return {
            "verdict": verdict,
            "can_stop_early": can_stop,
            "control_n": len(control_results),
            "treatment_n": len(treatment_results),
            "total_trials": len(self.results),
            "error_rate": len([r for r in self.results if r.error]) / max(len(self.results), 1),
            "metric_analyses": analyses
        }

    def _compare_metric(
        self,
        control: List[float],
        treatment: List[float],
        metric_name: str
    ) -> Dict[str, Any]:
        """
        Performs Welch's t-test between control and treatment groups.
        """
        n_c, n_t = len(control), len(treatment)
        mean_c = statistics.mean(control)
        mean_t = statistics.mean(treatment)
        std_c = statistics.stdev(control) if n_c > 1 else 0.001
        std_t = statistics.stdev(treatment) if n_t > 1 else 0.001

        # Welch's t-statistic
        se = math.sqrt((std_c ** 2 / n_c) + (std_t ** 2 / n_t))
        if se == 0:
            t_stat = 0.0
        else:
            t_stat = (mean_t - mean_c) / se

        # Welch-Satterthwaite degrees of freedom
        numerator = ((std_c ** 2 / n_c) + (std_t ** 2 / n_t)) ** 2
        denominator = (
            (std_c ** 2 / n_c) ** 2 / (n_c - 1) +
            (std_t ** 2 / n_t) ** 2 / (n_t - 1)
        )
        df = numerator / denominator if denominator > 0 else 1

        # Approximate p-value using normal distribution for large samples
        # For production, use scipy.stats.t.sf
        p_value = self._approx_p_value(abs(t_stat))

        # Effect size (Cohen's d)
        pooled_std = math.sqrt(
            ((n_c - 1) * std_c ** 2 + (n_t - 1) * std_t ** 2) / (n_c + n_t - 2)
        )
        cohens_d = (mean_t - mean_c) / pooled_std if pooled_std > 0 else 0.0

        # Confidence interval for the difference
        margin = 1.96 * se  # 95% CI
        ci_lower = (mean_t - mean_c) - margin
        ci_upper = (mean_t - mean_c) + margin

        return {
            "metric": metric_name,
            "control_mean": mean_c,
            "treatment_mean": mean_t,
            "effect_size": mean_t - mean_c,
            "relative_effect_pct": ((mean_t - mean_c) / mean_c * 100) if mean_c != 0 else 0,
            "cohens_d": cohens_d,
            "t_statistic": t_stat,
            "degrees_of_freedom": df,
            "p_value": p_value,
            "ci_95_lower": ci_lower,
            "ci_95_upper": ci_upper,
            "is_significant": p_value < self.config.significance_level,
            "control_n": n_c,
            "treatment_n": n_t
        }

    @staticmethod
    def _approx_p_value(z: float) -> float:
        """Approximate two-tailed p-value from z-score using Abramowitz & Stegun."""
        if z > 8:
            return 0.0
        t = 1.0 / (1.0 + 0.2316419 * z)
        d = 0.3989422804014327
        p = d * math.exp(-z * z / 2.0) * (
            t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
        )
        return 2 * p  # two-tailed
```

---

## Statistical Significance for Agent Evaluation

### Why Standard Tests Are Insufficient

Agent evaluations have unique statistical challenges:

1. **Non-normal distributions**: Task success is binary, quality scores are bounded
2. **High variance**: LLM non-determinism creates substantial within-condition variance
3. **Multiple comparisons**: Testing many metrics simultaneously inflates Type I error
4. **Dependent observations**: Multiple tasks may share underlying capabilities

### Bootstrap Confidence Intervals

For non-parametric comparison of agent metrics, bootstrap confidence intervals are more robust than parametric tests:

```python
import numpy as np
from typing import List, Tuple


def bootstrap_comparison(
    baseline_scores: List[float],
    candidate_scores: List[float],
    n_bootstrap: int = 10000,
    confidence_level: float = 0.95,
    paired: bool = False
) -> Dict[str, Any]:
    """
    Computes bootstrap confidence interval for the difference
    between candidate and baseline scores.

    Args:
        baseline_scores: Scores from baseline agent version
        candidate_scores: Scores from candidate agent version
        n_bootstrap: Number of bootstrap iterations
        confidence_level: Confidence level for the interval
        paired: If True, compute paired differences (requires same length)

    Returns:
        Bootstrap analysis with CI, p-value, and effect size
    """
    baseline = np.array(baseline_scores)
    candidate = np.array(candidate_scores)

    if paired:
        assert len(baseline) == len(candidate), "Paired comparison requires equal lengths"
        observed_diff = np.mean(candidate - baseline)

        # Bootstrap the paired differences
        diffs = candidate - baseline
        boot_diffs = np.array([
            np.mean(np.random.choice(diffs, size=len(diffs), replace=True))
            for _ in range(n_bootstrap)
        ])
    else:
        observed_diff = np.mean(candidate) - np.mean(baseline)

        # Bootstrap each group independently
        boot_diffs = np.array([
            np.mean(np.random.choice(candidate, size=len(candidate), replace=True)) -
            np.mean(np.random.choice(baseline, size=len(baseline), replace=True))
            for _ in range(n_bootstrap)
        ])

    # Confidence interval
    alpha = 1 - confidence_level
    ci_lower = float(np.percentile(boot_diffs, 100 * alpha / 2))
    ci_upper = float(np.percentile(boot_diffs, 100 * (1 - alpha / 2)))

    # Bootstrap p-value (two-tailed)
    # Under H0, the difference is centered at 0
    centered = boot_diffs - np.mean(boot_diffs)
    p_value = float(np.mean(np.abs(centered) >= abs(observed_diff)))

    # Effect size
    pooled_std = np.sqrt(
        (np.var(baseline) + np.var(candidate)) / 2
    )
    cohens_d = float(observed_diff / pooled_std) if pooled_std > 0 else 0.0

    return {
        "observed_difference": float(observed_diff),
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "confidence_level": confidence_level,
        "p_value": p_value,
        "cohens_d": cohens_d,
        "n_bootstrap": n_bootstrap,
        "is_significant": p_value < (1 - confidence_level),
        "regression_detected": ci_upper < 0,  # entire CI below zero
        "improvement_detected": ci_lower > 0,  # entire CI above zero
        "baseline_mean": float(np.mean(baseline)),
        "candidate_mean": float(np.mean(candidate)),
        "baseline_std": float(np.std(baseline)),
        "candidate_std": float(np.std(candidate))
    }


def multiple_comparison_correction(
    p_values: Dict[str, float],
    method: str = "bonferroni"
) -> Dict[str, Dict[str, Any]]:
    """
    Corrects for multiple comparisons when testing many metrics simultaneously.

    Args:
        p_values: Dict mapping metric names to their raw p-values
        method: Correction method ('bonferroni', 'holm', 'fdr_bh')

    Returns:
        Dict with corrected p-values and significance decisions
    """
    n_tests = len(p_values)
    metrics = list(p_values.keys())
    raw_ps = [p_values[m] for m in metrics]

    if method == "bonferroni":
        corrected = [min(p * n_tests, 1.0) for p in raw_ps]

    elif method == "holm":
        # Holm-Bonferroni step-down method
        sorted_indices = sorted(range(n_tests), key=lambda i: raw_ps[i])
        corrected = [0.0] * n_tests
        cumulative_max = 0.0
        for rank, idx in enumerate(sorted_indices):
            adjusted = raw_ps[idx] * (n_tests - rank)
            cumulative_max = max(cumulative_max, adjusted)
            corrected[idx] = min(cumulative_max, 1.0)

    elif method == "fdr_bh":
        # Benjamini-Hochberg FDR control
        sorted_indices = sorted(range(n_tests), key=lambda i: raw_ps[i])
        corrected = [0.0] * n_tests
        cumulative_min = 1.0
        for rank in range(n_tests - 1, -1, -1):
            idx = sorted_indices[rank]
            adjusted = raw_ps[idx] * n_tests / (rank + 1)
            cumulative_min = min(cumulative_min, adjusted)
            corrected[idx] = min(cumulative_min, 1.0)
    else:
        raise ValueError(f"Unknown method: {method}")

    results = {}
    for i, metric in enumerate(metrics):
        results[metric] = {
            "raw_p_value": raw_ps[i],
            "corrected_p_value": corrected[i],
            "is_significant_corrected": corrected[i] < 0.05,
            "correction_method": method
        }

    return results
```

---

## Regression Test Suites

### Designing Effective Regression Suites

A regression test suite for agents should cover:

1. **Core capabilities**: Tasks that test fundamental agent skills
2. **Edge cases**: Inputs that previously triggered bugs
3. **Known failure modes**: Tasks that exposed issues in past versions
4. **Distribution coverage**: Representative sample of production input distribution

```
+-------------------------------------------------------------------+
|              REGRESSION SUITE ARCHITECTURE                        |
+-------------------------------------------------------------------+
|                                                                   |
|  ┌──────────────────────────────────────────────────────────┐     |
|  │                REGRESSION TEST SUITE                      │     |
|  │                                                          │     |
|  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │     |
|  │  │  Core       │  │  Edge       │  │  Historical │     │     |
|  │  │  Capability │  │  Cases      │  │  Failures   │     │     |
|  │  │  Tests      │  │             │  │             │     │     |
|  │  │  (40%)      │  │  (20%)      │  │  (15%)      │     │     |
|  │  └─────────────┘  └─────────────┘  └─────────────┘     │     |
|  │                                                          │     |
|  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │     |
|  │  │  Production │  │  Safety     │  │  Performance│     │     |
|  │  │  Sample     │  │  Boundary   │  │  Benchmark  │     │     |
|  │  │  Mirror     │  │  Tests      │  │  Tests      │     │     |
|  │  │  (10%)      │  │  (10%)      │  │  (5%)       │     │     |
|  │  └─────────────┘  └─────────────┘  └─────────────┘     │     |
|  │                                                          │     |
|  └──────────────────────────────────────────────────────────┘     |
|                                                                   |
+-------------------------------------------------------------------+
```

### Regression Suite Implementation

```python
from dataclasses import dataclass
from typing import List, Dict, Any, Callable, Optional
from enum import Enum
import json
import time


class TestPriority(Enum):
    CRITICAL = "critical"  # blocks deployment
    HIGH = "high"          # triggers investigation
    MEDIUM = "medium"      # logged and monitored
    LOW = "low"            # informational only


class TestCategory(Enum):
    CORE_CAPABILITY = "core_capability"
    EDGE_CASE = "edge_case"
    HISTORICAL_FAILURE = "historical_failure"
    PRODUCTION_MIRROR = "production_mirror"
    SAFETY_BOUNDARY = "safety_boundary"
    PERFORMANCE_BENCHMARK = "performance_benchmark"


@dataclass
class RegressionTestCase:
    """A single test case in the regression suite."""
    test_id: str
    name: str
    description: str
    category: TestCategory
    priority: TestPriority
    input_data: Dict[str, Any]
    expected_behavior: Dict[str, Any]
    evaluator: str  # name of the evaluator function to use
    timeout_seconds: float = 60.0
    retries: int = 3  # retry to account for non-determinism
    pass_threshold: float = 0.7  # fraction of retries that must pass
    tags: List[str] = None
    added_in_version: str = ""
    related_bug: str = ""

    def __post_init__(self):
        if self.tags is None:
            self.tags = []


@dataclass
class TestResult:
    """Result from running a single regression test case."""
    test_id: str
    passed: bool
    score: float
    attempts: int
    passed_attempts: int
    latency_ms: float
    error: Optional[str] = None
    details: Dict[str, Any] = None

    def __post_init__(self):
        if self.details is None:
            self.details = {}


class RegressionSuiteRunner:
    """
    Executes regression test suites against agent versions
    with retry logic and aggregate reporting.
    """

    def __init__(self):
        self._evaluators: Dict[str, Callable] = {}
        self._test_cases: List[RegressionTestCase] = []

    def register_evaluator(self, name: str, fn: Callable) -> None:
        """Register an evaluator function by name."""
        self._evaluators[name] = fn

    def add_test_case(self, test: RegressionTestCase) -> None:
        """Add a test case to the suite."""
        self._test_cases.append(test)

    def load_suite(self, suite_path: str) -> None:
        """Load test cases from a JSON file."""
        with open(suite_path, "r") as f:
            suite_data = json.load(f)
        for tc in suite_data.get("test_cases", []):
            self._test_cases.append(RegressionTestCase(
                test_id=tc["test_id"],
                name=tc["name"],
                description=tc.get("description", ""),
                category=TestCategory(tc["category"]),
                priority=TestPriority(tc["priority"]),
                input_data=tc["input_data"],
                expected_behavior=tc["expected_behavior"],
                evaluator=tc["evaluator"],
                timeout_seconds=tc.get("timeout_seconds", 60),
                retries=tc.get("retries", 3),
                pass_threshold=tc.get("pass_threshold", 0.7),
                tags=tc.get("tags", []),
                added_in_version=tc.get("added_in_version", ""),
                related_bug=tc.get("related_bug", "")
            ))

    def run_suite(
        self,
        agent_fn: Callable[[Dict], Dict],
        categories: List[TestCategory] = None,
        priorities: List[TestPriority] = None,
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """
        Run the full regression suite (or filtered subset).
        """
        filtered = self._filter_tests(categories, priorities, tags)
        results: List[TestResult] = []

        for tc in filtered:
            result = self._run_single_test(agent_fn, tc)
            results.append(result)

        return self._generate_report(results, filtered)

    def _filter_tests(
        self,
        categories: List[TestCategory] = None,
        priorities: List[TestPriority] = None,
        tags: List[str] = None
    ) -> List[RegressionTestCase]:
        """Filter test cases by category, priority, and tags."""
        filtered = self._test_cases

        if categories:
            filtered = [t for t in filtered if t.category in categories]
        if priorities:
            filtered = [t for t in filtered if t.priority in priorities]
        if tags:
            tag_set = set(tags)
            filtered = [t for t in filtered if tag_set.intersection(t.tags)]

        return filtered

    def _run_single_test(
        self,
        agent_fn: Callable,
        test_case: RegressionTestCase
    ) -> TestResult:
        """Run a single test case with retries."""
        evaluator = self._evaluators.get(test_case.evaluator)
        if evaluator is None:
            return TestResult(
                test_id=test_case.test_id,
                passed=False,
                score=0.0,
                attempts=0,
                passed_attempts=0,
                latency_ms=0,
                error=f"Evaluator '{test_case.evaluator}' not registered"
            )

        scores = []
        latencies = []
        errors = []
        pass_count = 0

        for attempt in range(test_case.retries):
            start = time.time()
            try:
                output = agent_fn(test_case.input_data)
                elapsed = (time.time() - start) * 1000

                score = evaluator(
                    test_case.input_data,
                    output,
                    test_case.expected_behavior
                )

                scores.append(score)
                latencies.append(elapsed)

                if score >= test_case.pass_threshold:
                    pass_count += 1

            except Exception as e:
                elapsed = (time.time() - start) * 1000
                latencies.append(elapsed)
                errors.append(str(e))
                scores.append(0.0)

        mean_score = statistics.mean(scores) if scores else 0.0
        pass_rate = pass_count / test_case.retries
        passed = pass_rate >= test_case.pass_threshold

        return TestResult(
            test_id=test_case.test_id,
            passed=passed,
            score=mean_score,
            attempts=test_case.retries,
            passed_attempts=pass_count,
            latency_ms=statistics.mean(latencies) if latencies else 0,
            error="; ".join(errors) if errors else None,
            details={
                "all_scores": scores,
                "pass_rate": pass_rate,
                "all_latencies": latencies
            }
        )

    def _generate_report(
        self,
        results: List[TestResult],
        test_cases: List[RegressionTestCase]
    ) -> Dict[str, Any]:
        """Generate aggregate regression report."""
        tc_map = {tc.test_id: tc for tc in test_cases}

        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed

        # Group failures by priority
        critical_failures = [
            r for r in results
            if not r.passed and tc_map[r.test_id].priority == TestPriority.CRITICAL
        ]
        high_failures = [
            r for r in results
            if not r.passed and tc_map[r.test_id].priority == TestPriority.HIGH
        ]

        # Determine overall verdict
        if critical_failures:
            verdict = "BLOCKED"
        elif high_failures:
            verdict = "AT_RISK"
        elif failed > 0:
            verdict = "DEGRADED"
        else:
            verdict = "CLEAR"

        # Category breakdown
        category_results = {}
        for result in results:
            tc = tc_map[result.test_id]
            cat = tc.category.value
            if cat not in category_results:
                category_results[cat] = {"total": 0, "passed": 0, "failed": 0}
            category_results[cat]["total"] += 1
            if result.passed:
                category_results[cat]["passed"] += 1
            else:
                category_results[cat]["failed"] += 1

        return {
            "verdict": verdict,
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": passed / total if total > 0 else 0,
            "critical_failures": [r.test_id for r in critical_failures],
            "high_failures": [r.test_id for r in high_failures],
            "category_breakdown": category_results,
            "mean_latency_ms": statistics.mean([r.latency_ms for r in results]) if results else 0,
            "results": [
                {
                    "test_id": r.test_id,
                    "name": tc_map[r.test_id].name,
                    "passed": r.passed,
                    "score": r.score,
                    "category": tc_map[r.test_id].category.value,
                    "priority": tc_map[r.test_id].priority.value,
                    "latency_ms": r.latency_ms,
                    "error": r.error
                }
                for r in results
            ]
        }
```

---

## Canary Deployments for Agents

### Canary Architecture

Canary deployments route a small fraction of production traffic to a new agent version while monitoring for regressions in real-time. If regression is detected, traffic is automatically rolled back.

```
+-------------------------------------------------------------------+
|              CANARY DEPLOYMENT PIPELINE                           |
+-------------------------------------------------------------------+
|                                                                   |
|  Production Traffic                                               |
|       │                                                           |
|       ▼                                                           |
|  ┌──────────────┐                                                 |
|  │  Load        │                                                 |
|  │  Balancer    │                                                 |
|  └──────┬───────┘                                                 |
|         │                                                         |
|    ┌────┴─────────────────┐                                       |
|    │ 95%                5% │                                       |
|    ▼                     ▼                                        |
|  ┌──────┐          ┌──────┐                                       |
|  │Stable│          │Canary│                                       |
|  │v2.3.0│          │v2.4.0│                                       |
|  └──┬───┘          └──┬───┘                                       |
|     │                 │                                           |
|     └────────┬────────┘                                           |
|              │                                                    |
|              ▼                                                    |
|     ┌──────────────┐                                              |
|     │  Metrics     │                                              |
|     │  Collector   │                                              |
|     └──────┬───────┘                                              |
|            │                                                      |
|            ▼                                                      |
|     ┌──────────────┐     ┌──────────────┐                         |
|     │  Anomaly     │────►│  Rollback    │                         |
|     │  Detector    │     │  Controller  │                         |
|     └──────────────┘     └──────────────┘                         |
|                                                                   |
+-------------------------------------------------------------------+
```

### Canary Controller

```python
from dataclasses import dataclass
from typing import Dict, List, Callable, Optional
from enum import Enum
from datetime import datetime, timezone, timedelta
import statistics
import math


class CanaryPhase(Enum):
    PENDING = "pending"
    RAMPING = "ramping"
    MONITORING = "monitoring"
    PROMOTED = "promoted"
    ROLLED_BACK = "rolled_back"


@dataclass
class CanaryConfig:
    """Configuration for canary deployment."""
    canary_version: str
    stable_version: str
    initial_traffic_pct: float = 5.0
    max_traffic_pct: float = 50.0
    ramp_increment_pct: float = 5.0
    ramp_interval_minutes: int = 15
    monitoring_window_minutes: int = 30
    min_requests_per_phase: int = 50
    metrics_to_monitor: List[str] = None
    regression_threshold: float = 0.05  # 5% degradation triggers rollback
    auto_rollback: bool = True

    def __post_init__(self):
        if self.metrics_to_monitor is None:
            self.metrics_to_monitor = [
                "task_success_rate",
                "error_rate",
                "latency_p95",
                "hallucination_rate"
            ]


class CanaryAnalyzer:
    """
    Analyzes canary vs stable metrics in real-time to detect regressions.
    Uses sequential hypothesis testing for early detection.
    """

    def __init__(self, config: CanaryConfig):
        self.config = config
        self.stable_metrics: Dict[str, List[float]] = {m: [] for m in config.metrics_to_monitor}
        self.canary_metrics: Dict[str, List[float]] = {m: [] for m in config.metrics_to_monitor}

    def record_stable(self, metrics: Dict[str, float]) -> None:
        """Record metrics from stable version."""
        for name, value in metrics.items():
            if name in self.stable_metrics:
                self.stable_metrics[name].append(value)

    def record_canary(self, metrics: Dict[str, float]) -> None:
        """Record metrics from canary version."""
        for name, value in metrics.items():
            if name in self.canary_metrics:
                self.canary_metrics[name].append(value)

    def should_rollback(self) -> Dict[str, Any]:
        """
        Determines whether the canary should be rolled back.
        Uses CUSUM (Cumulative Sum) change detection.
        """
        rollback_reasons = []
        metric_reports = {}

        for metric_name in self.config.metrics_to_monitor:
            stable = self.stable_metrics.get(metric_name, [])
            canary = self.canary_metrics.get(metric_name, [])

            if len(stable) < 10 or len(canary) < 10:
                metric_reports[metric_name] = {"status": "insufficient_data"}
                continue

            stable_mean = statistics.mean(stable)
            canary_mean = statistics.mean(canary)

            if stable_mean == 0:
                relative_diff = 0
            else:
                relative_diff = (canary_mean - stable_mean) / abs(stable_mean)

            # For error rates and latency, higher is worse
            is_worse = False
            if metric_name in ("error_rate", "latency_p95", "hallucination_rate"):
                is_worse = relative_diff > self.config.regression_threshold
            else:
                is_worse = relative_diff < -self.config.regression_threshold

            # CUSUM change detection
            cusum_alert = self._cusum_detect(stable, canary, metric_name)

            if is_worse and cusum_alert:
                rollback_reasons.append({
                    "metric": metric_name,
                    "stable_mean": stable_mean,
                    "canary_mean": canary_mean,
                    "relative_diff_pct": relative_diff * 100,
                    "cusum_alert": True
                })

            metric_reports[metric_name] = {
                "stable_mean": stable_mean,
                "canary_mean": canary_mean,
                "relative_diff_pct": relative_diff * 100,
                "is_regression": is_worse,
                "cusum_alert": cusum_alert
            }

        should_rollback = len(rollback_reasons) > 0

        return {
            "should_rollback": should_rollback,
            "rollback_reasons": rollback_reasons,
            "metric_reports": metric_reports,
            "stable_sample_sizes": {k: len(v) for k, v in self.stable_metrics.items()},
            "canary_sample_sizes": {k: len(v) for k, v in self.canary_metrics.items()}
        }

    def _cusum_detect(
        self,
        baseline: List[float],
        candidate: List[float],
        metric_name: str,
        sensitivity: float = 4.0
    ) -> bool:
        """
        CUSUM (Cumulative Sum) change detection algorithm.
        Detects if the candidate distribution has shifted from the baseline.
        """
        target_mean = statistics.mean(baseline)
        target_std = statistics.stdev(baseline) if len(baseline) > 1 else 0.001
        threshold = sensitivity * target_std

        cusum_pos = 0.0
        cusum_neg = 0.0

        for val in candidate:
            normalized = (val - target_mean) / target_std if target_std > 0 else 0
            cusum_pos = max(0, cusum_pos + normalized - 0.5)
            cusum_neg = max(0, cusum_neg - normalized - 0.5)

            if cusum_pos > threshold or cusum_neg > threshold:
                return True

        return False
```

---

## Regression Detection Configuration Schema

```yaml
regression_detection:
  version: "1.0.0"

  baseline:
    storage_backend: "s3"
    storage_path: "s3://eval-baselines/agent-v2/"
    retention_days: 90
    auto_promote_on_deploy: true

  metrics:
    - name: "task_success_rate"
      direction: "higher_is_better"
      threshold: 0.02
      critical: true

    - name: "output_quality"
      direction: "higher_is_better"
      threshold: 0.05
      critical: false

    - name: "latency_p95_ms"
      direction: "lower_is_better"
      threshold: 500
      critical: false

    - name: "hallucination_rate"
      direction: "lower_is_better"
      threshold: 0.01
      critical: true

    - name: "token_usage_mean"
      direction: "lower_is_better"
      threshold: 100
      critical: false

    - name: "error_rate"
      direction: "lower_is_better"
      threshold: 0.005
      critical: true

  regression_suite:
    path: "eval/regression_suite.json"
    run_on: ["pull_request", "pre_deploy", "nightly"]
    retry_count: 3
    timeout_minutes: 60
    required_pass_rate: 0.95

  ab_testing:
    min_samples: 200
    max_samples: 5000
    significance_level: 0.05
    sequential_testing: true
    primary_metric: "task_success_rate"

  canary:
    initial_traffic_pct: 5
    max_traffic_pct: 50
    ramp_increment_pct: 5
    ramp_interval_minutes: 15
    monitoring_window_minutes: 30
    auto_rollback: true

  alerting:
    channels: ["slack", "pagerduty"]
    critical_regression: "pagerduty"
    non_critical_regression: "slack"
    report_frequency: "per_run"
```

---

## Best Practices and Anti-Patterns

### Best Practices

1. **Establish baselines before making changes**: Always create a baseline before modifying prompts, models, or tools.
2. **Use paired comparisons when possible**: Running both versions on the same inputs reduces variance and increases statistical power.
3. **Account for LLM non-determinism**: Run each test case multiple times with the same input to separate signal from noise.
4. **Track regressions longitudinally**: Plot metrics over time to detect gradual degradation that single-point comparisons miss.
5. **Include both automated and human evaluation**: Automated metrics catch gross regressions; human evaluation catches subtle quality shifts.
6. **Gate deployments on critical metrics**: Define a clear set of critical metrics that must not regress to proceed with deployment.

### Anti-Patterns

1. **Comparing single runs**: A single evaluation run per version is insufficient due to LLM stochasticity.
2. **Ignoring multiple comparison correction**: Testing 20 metrics at α=0.05 guarantees ~1 false positive.
3. **Using only aggregate metrics**: Overall scores can hide regression in specific task categories. Always examine per-category results.
4. **Hard-coding thresholds**: Regression thresholds should be calibrated based on the metric's natural variance.
5. **Skipping canary for "small changes"**: Even minor prompt edits can cause unexpected behavior shifts.

---

## TypeScript Regression Detector

```typescript
interface RegressionCheckResult {
  metric: string;
  baselineValue: number;
  candidateValue: number;
  delta: number;
  relativeDeltaPct: number;
  threshold: number;
  isRegression: boolean;
  isCritical: boolean;
}

interface RegressionReport {
  verdict: "PASS" | "FAIL_CRITICAL" | "FAIL_REGRESSION";
  regressions: RegressionCheckResult[];
  improvements: RegressionCheckResult[];
  unchanged: RegressionCheckResult[];
  summary: {
    totalMetrics: number;
    regressionCount: number;
    improvementCount: number;
    criticalRegressionCount: number;
  };
}

interface MetricConfig {
  name: string;
  direction: "higher_is_better" | "lower_is_better";
  threshold: number;
  critical: boolean;
}

class RegressionDetector {
  private metricsConfig: MetricConfig[];

  constructor(metricsConfig: MetricConfig[]) {
    this.metricsConfig = metricsConfig;
  }

  check(
    baseline: Record<string, number>,
    candidate: Record<string, number>
  ): RegressionReport {
    const regressions: RegressionCheckResult[] = [];
    const improvements: RegressionCheckResult[] = [];
    const unchanged: RegressionCheckResult[] = [];

    for (const config of this.metricsConfig) {
      const baseVal = baseline[config.name];
      const candVal = candidate[config.name];

      if (baseVal === undefined || candVal === undefined) continue;

      const delta = candVal - baseVal;
      const relativePct =
        baseVal !== 0 ? (delta / Math.abs(baseVal)) * 100 : 0;

      let isRegression = false;
      let isImprovement = false;

      if (config.direction === "higher_is_better") {
        isRegression = delta < -config.threshold;
        isImprovement = delta > config.threshold;
      } else {
        isRegression = delta > config.threshold;
        isImprovement = delta < -config.threshold;
      }

      const result: RegressionCheckResult = {
        metric: config.name,
        baselineValue: baseVal,
        candidateValue: candVal,
        delta,
        relativeDeltaPct: relativePct,
        threshold: config.threshold,
        isRegression,
        isCritical: config.critical,
      };

      if (isRegression) {
        regressions.push(result);
      } else if (isImprovement) {
        improvements.push(result);
      } else {
        unchanged.push(result);
      }
    }

    const criticalCount = regressions.filter((r) => r.isCritical).length;

    let verdict: RegressionReport["verdict"] = "PASS";
    if (criticalCount > 0) {
      verdict = "FAIL_CRITICAL";
    } else if (regressions.length > 0) {
      verdict = "FAIL_REGRESSION";
    }

    return {
      verdict,
      regressions,
      improvements,
      unchanged,
      summary: {
        totalMetrics: regressions.length + improvements.length + unchanged.length,
        regressionCount: regressions.length,
        improvementCount: improvements.length,
        criticalRegressionCount: criticalCount,
      },
    };
  }
}

// --- Usage ---
const detector = new RegressionDetector([
  { name: "task_success", direction: "higher_is_better", threshold: 0.02, critical: true },
  { name: "error_rate", direction: "lower_is_better", threshold: 0.005, critical: true },
  { name: "latency_p95", direction: "lower_is_better", threshold: 500, critical: false },
  { name: "quality_score", direction: "higher_is_better", threshold: 0.05, critical: false },
]);

const report = detector.check(
  { task_success: 0.92, error_rate: 0.03, latency_p95: 1200, quality_score: 0.85 },
  { task_success: 0.89, error_rate: 0.04, latency_p95: 1100, quality_score: 0.87 }
);

console.log(JSON.stringify(report, null, 2));
```

---

## Integration with CI/CD Pipelines

### GitHub Actions Regression Check

```yaml
name: Agent Regression Check
on:
  pull_request:
    paths:
      - "prompts/**"
      - "agent/**"
      - "tools/**"

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load Baseline
        run: |
          aws s3 cp s3://eval-baselines/latest.json baseline.json

      - name: Run Evaluation Suite
        run: |
          python -m eval.run_suite \
            --config eval/regression_config.yaml \
            --output candidate_results.json

      - name: Compare Against Baseline
        run: |
          python -m eval.regression_check \
            --baseline baseline.json \
            --candidate candidate_results.json \
            --output regression_report.json

      - name: Gate Deployment
        run: |
          python -c "
          import json
          report = json.load(open('regression_report.json'))
          if report['verdict'] in ('FAIL_CRITICAL', 'BLOCKED'):
              print('::error::Critical regression detected!')
              exit(1)
          elif report['verdict'] == 'FAIL_REGRESSION':
              print('::warning::Non-critical regression detected')
          "

      - name: Post Results to PR
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const report = require('./regression_report.json');
            const body = `## Regression Report: ${report.verdict}
            - Regressions: ${report.regression_count}
            - Improvements: ${report.improvement_count}
            - Pass Rate: ${(report.pass_rate * 100).toFixed(1)}%`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```
