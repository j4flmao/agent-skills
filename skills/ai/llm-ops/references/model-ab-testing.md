# A/B Testing for Models

## Overview
A/B testing for LLMs is more complex than traditional A/B because outputs are non-deterministic, quality assessment requires LLM-as-judge or human eval, and both models AND prompts are variable dimensions. This reference covers statistical frameworks, experiment design, metric selection, and operational workflows for model and prompt experimentation.

## Experiment Types

### Prompt Experiment
Isolate prompt effect: same model, different prompt. Control = production prompt, treatment = candidate prompt.

### Model Experiment
Isolate model effect: same prompt, different model. Control = current model, treatment = candidate model.

### Full Factorial
Both model and prompt change simultaneously. Requires 2D experiment design (2x2 matrix). Use when you cannot disentangle model and prompt changes.

```
            Prompt A (control)    Prompt B (treatment)
Model X     Cell 1 (control)      Cell 3
Model Y     Cell 2                 Cell 4 (treatment)
```

Compare Cell 3 vs Cell 1 for prompt effect. Cell 2 vs Cell 1 for model effect. Cell 4 vs Cell 1 for overall treatment effect.

## Statistical Framework

### Sample Size Calculation

For binary metrics (accuracy, safety, refusal rate):
```
n = (Z_alpha/2 x sqrt(2p_bar(1-p_bar)) + Z_beta x sqrt(p1(1-p1) + p2(1-p2)))^2 / (p2 - p1)^2

Z_alpha/2 = 1.96 (alpha=0.05, two-tailed)
Z_beta = 0.84 (beta=0.20, power=80%)
p_bar = (p1 + p2) / 2
```

Quick reference (power=80%, alpha=0.05):
| Baseline | Min Detectable Effect | Sample Size per Arm |
|----------|----------------------|-------------------|
| 90%      | 1% (->91%)           | ~3,500 |
| 90%      | 2% (->92%)           | ~900 |
| 90%      | 5% (->95%)           | ~150 |
| 95%      | 1% (->96%)           | ~5,500 |
| 99%      | 0.5% (->99.5%)       | ~14,000 |

For continuous metrics (latency, cost, response length):
```
n = 2 x (Z_alpha/2 + Z_beta)^2 x sigma^2 / delta^2
sigma = standard deviation, delta = minimum detectable effect
```

### Statistical Test Selection

| Metric Type | Distribution | Test |
|-------------|-------------|------|
| Binary (accuracy, safety) | Binomial | z-test for proportions |
| Ordinal (ratings 1-5) | Ordinal | Mann-Whitney U |
| Continuous (latency, cost) | Log-normal | t-test on log-transformed |
| Continuous (response length) | Skewed | Bootstrap percentile |
| Time-to-event | Weibull/exponential | Log-rank test |

### Multiple Comparison Correction

When testing multiple metrics, adjust significance threshold:
- Bonferroni: alpha/n where n = number of metrics. Conservative, high false negative.
- Benjamini-Hochberg: control false discovery rate (FDR). Use for LLM experiments with 3-8 metrics.

```python
import numpy as np

class ABTestAnalyzer:
    def __init__(self, significance=0.05):
        self.significance = significance

    def analyze_binary_metric(self, control_successes, control_total, treatment_successes, treatment_total):
        from statsmodels.stats.proportion import proportions_ztest
        successes = [treatment_successes, control_successes]
        totals = [treatment_total, control_total]
        z_stat, p_value = proportions_ztest(successes, totals)
        control_rate = control_successes / control_total
        treatment_rate = treatment_successes / treatment_total
        return {
            "control_rate": control_rate,
            "treatment_rate": treatment_rate,
            "lift": (treatment_rate - control_rate) / max(control_rate, 0.001),
            "z_stat": z_stat,
            "p_value": p_value,
            "significant": p_value < self.significance,
        }

    def analyze_continuous_metric(self, control_values, treatment_values):
        from scipy.stats import ttest_ind
        control_log = np.log(control_values[control_values > 0])
        treatment_log = np.log(treatment_values[treatment_values > 0])
        t_stat, p_value = ttest_ind(treatment_log, control_log)
        return {
            "control_mean": np.mean(control_values),
            "treatment_mean": np.mean(treatment_values),
            "lift": (np.mean(treatment_values) - np.mean(control_values)) / max(np.mean(control_values), 0.001),
            "t_stat": t_stat,
            "p_value": p_value,
            "significant": p_value < self.significance,
        }

    def analyze_with_fdr(self, metrics_results: list[dict]) -> list[dict]:
        p_values = np.array([m["p_value"] for m in metrics_results])
        sorted_idx = np.argsort(p_values)
        m = len(p_values)
        for rank, idx in enumerate(sorted_idx, 1):
            threshold = (rank / m) * self.significance
            metrics_results[idx]["fdr_significant"] = p_values[idx] < threshold
            metrics_results[idx]["fdr_threshold"] = threshold
        return metrics_results
```

## Bayesian A/B Testing

Bayesian methods are better for LLM experiments because they naturally handle sequential testing (no need to pre-determine sample size) and express results as probabilities rather than p-values.

### Beta-Bernoulli Model (Binary Metrics)

Prior ~ Beta(1, 1) (uniform). Posterior ~ Beta(alpha + successes, beta + failures).
Probability treatment > control: Monte Carlo samples from both posteriors, count P(treatment > control).

```python
class BayesianABTest:
    def analyze_binary(self, control: dict, treatment: dict) -> dict:
        c_alpha = 1 + control["successes"]
        c_beta = 1 + control["failures"]
        t_alpha = 1 + treatment["successes"]
        t_beta = 1 + treatment["failures"]

        c_samples = np.random.beta(c_alpha, c_beta, 100_000)
        t_samples = np.random.beta(t_alpha, t_beta, 100_000)

        p_win = np.mean(t_samples > c_samples)
        expected_lift = np.mean((t_samples - c_samples) / c_samples)

        return {
            "control_posterior": {"alpha": c_alpha, "beta": c_beta, "mean": c_alpha / (c_alpha + c_beta)},
            "treatment_posterior": {"alpha": t_alpha, "beta": t_beta, "mean": t_alpha / (t_alpha + t_beta)},
            "p_win": p_win,
            "expected_lift": expected_lift,
            "decision": "promote" if p_win > 0.95 else "continue" if p_win > 0.5 else "reject",
        }

    def analyze_continuous(self, control: list[float], treatment: list[float]) -> dict:
        control_log = np.log(control)
        treatment_log = np.log(treatment)
        c_posterior = {"mu": np.mean(control_log), "sigma": np.std(control_log) / np.sqrt(len(control_log))}
        t_posterior = {"mu": np.mean(treatment_log), "sigma": np.std(treatment_log) / np.sqrt(len(treatment_log))}
        c_samples = np.random.normal(c_posterior["mu"], c_posterior["sigma"], 100_000)
        t_samples = np.random.normal(t_posterior["mu"], t_posterior["sigma"], 100_000)
        c_geo_mean = np.exp(c_samples)
        t_geo_mean = np.exp(t_samples)
        p_win = np.mean(t_geo_mean < c_geo_mean)
        return {
            "p_win": p_win,
            "expected_ratio": np.mean(t_geo_mean / c_geo_mean),
            "decision": "promote" if p_win > 0.95 else "continue" if p_win > 0.5 else "reject",
        }
```

## Multi-Armed Bandit

Bandits dynamically allocate traffic to better-performing variants, converging faster than fixed-split A/B tests.

### Thompson Sampling

```python
class ThompsonSamplingBandit:
    def __init__(self, variant_names: list[str]):
        self.variants = {name: {"alpha": 1, "beta": 1, "trials": 0, "wins": 0}
                         for name in variant_names}

    def select_variant(self) -> str:
        samples = {name: np.random.beta(v["alpha"], v["beta"])
                   for name, v in self.variants.items()}
        return max(samples, key=samples.get)

    def update(self, variant: str, rewarded: bool):
        v = self.variants[variant]
        v["trials"] += 1
        if rewarded:
            v["wins"] += 1
            v["alpha"] += 1
        else:
            v["beta"] += 1

    def get_report(self):
        return {
            name: {
                "trials": v["trials"],
                "wins": v["wins"],
                "win_rate": v["wins"] / max(v["trials"], 1),
                "posterior_mean": v["alpha"] / (v["alpha"] + v["beta"]),
            }
            for name, v in self.variants.items()
        }
```

**When to use bandit vs A/B:**
- A/B test: need to measure effect size precisely, have sufficient traffic, fixed duration
- Bandit: want to minimize regret (cost of poor variants), limited traffic, need adaptive allocation

## Metric Design

### Metrics Categories

**Quality Metrics (more is better):**
- Faithfulness: does output match context? LLM-judged 1-5 or binary
- Accuracy: factual correctness for known-answer queries
- Relevance: output addresses the users question
- Safety: output does not contain harmful content
- Instruction following: output follows format instructions

**Cost Metrics (less is better):**
- Cost per query: total cost of all model calls for the request
- Tokens per output: generation length efficiency
- Cache hit rate: lower cost per query when caching is enabled
- Fallback rate: % of queries requiring more expensive model

**Experience Metrics (less is better):**
- Latency P50/P95/P99
- TTFT (time to first token)
- TPOT (time per output token)
- Error rate

### Composite Metrics
Combine multiple metrics into a single score for decision-making:

```
composite_score = w1 x faithfulness + w2 x (1 - cost_normalized) + w3 x (1 - latency_normalized)

w1 = 0.5 (quality is most important)
w2 = 0.3 (cost matters)
w3 = 0.2 (latency matters)
cost_normalized = cost_per_query / target_cost
latency_normalized = latency_p50 / target_latency
```

## Experiment Operationalization

### Experiment Registration
```yaml
experiment:
  name: "model-switch-gpt4o-to-sonnet-v2"
  owner: "team-platform"
  hypothesis: "Claude Sonnet matches GPT-4o on faithfulness with 40% lower cost"
  start_date: "2026-04-01"
  duration_days: 14
  min_samples_per_arm: 5000

  variants:
    control:
      model: gpt-4o
      prompt_version: "qa-v3.2.1"
      traffic: 50
    treatment:
      model: claude-3.5-sonnet
      prompt_version: "qa-v3.2.1"
      traffic: 50

  metrics:
    primary:
      - name: faithfulness
        type: continuous
        direction: higher_is_better
        baseline: 0.95
        min_detectable_effect: 0.02
    secondary:
      - name: cost_per_query
        type: continuous
        direction: lower_is_better
      - name: latency_p50
        type: continuous
        direction: lower_is_better
      - name: hallucination_rate
        type: binary
        direction: lower_is_better

  decision_criteria:
    type: "primary_metric_significant"
    rule: "treatment non-inferior on faithfulness (delta=0.02) AND superior on cost (delta=20%)"
    promote_if: "all criteria met"

  auto_stop:
    enabled: true
    min_duration_hours: 48
    condition: "p_win > 0.99 on primary metric"
```

### Traffic Assignment
Deterministic split (hash-based):
```python
class TrafficSplitter:
    def assign_variant(self, user_id: str, experiment: dict) -> str:
        hash_input = f"{user_id}:{experiment['name']}"
        hash_val = int(hashlib.md5(hash_input.encode()).hexdigest()[:8], 16)
        pct = hash_val % 100
        cumulative = 0
        for variant in experiment["variants"]:
            cumulative += variant["traffic"]
            if pct < cumulative:
                return variant["name"]
        return experiment["variants"][-1]["name"]
```

Ensures: consistent assignment per user, reproducible split, balanced assignment.

### Experiment Lifecycle
```
Register -> Traffic split -> Data collection -> Analysis -> Decision -> Cleanup
```
Minimum 24h to account for diurnal patterns. Minimum 7d including a full weekend.

## Common Pitfalls

### Pitfall 1: Peeking
Checking results repeatedly and stopping as soon as p<0.05. Inflates false positive rate dramatically. Solution: pre-register sample size or use Bayesian sequential testing.

### Pitfall 2: Carryover Effects
User sees variant A, then variant B in same session. First experience biases the second. Solution: user-level assignment (same user always sees same variant).

### Pitfall 3: Metric Pollution
A/B test for model quality but evaluation uses same model (LLM-as-judge with the new model being tested). Solution: hold out a separate judge model not in tested variants.

### Pitfall 4: Ignoring Cost
Treatment model has higher quality (+2%) but costs 3x more. Solution: include cost as a primary metric, not secondary.

### Pitfall 5: Short Duration
Running experiments for only hours misses day-of-week patterns. Monday queries differ from Sunday. Solution: minimum 7 days including at least one full weekend.

### Pitfall 6: Simpson's Paradox
Overall, treatment looks worse, but within every segment it wins. Segments have different base rates. Solution: stratified analysis by user segment, query type, time of day.

## Key Points
- Use z-test for binary metrics, t-test on log-transformed for continuous metrics
- Bayesian A/B testing handles sequential monitoring naturally
- Thompson sampling bandits minimize regret vs fixed-split A/B
- Minimum sample size depends on baseline rate and minimum detectable effect
- Pre-register sample size to avoid peeking bias
- Hash-based traffic assignment ensures consistent per-user experience
- Include cost as a primary metric, not secondary
- Run experiments minimum 7 days, including weekends
- Stratify analysis by segment to avoid Simpson's Paradox
- Composite metrics weighted by business priorities simplify decision-making
- Auto-stop experiments when p_win > 0.99 on primary metrics (Bayesian)
