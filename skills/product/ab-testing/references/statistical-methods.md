# Statistical Methods for A/B Testing

## Test Selection Guide

| Metric Type | Example | Statistical Test | Sample Size Needs |
|-------------|---------|-----------------|-------------------|
| Binary (conversion) | Clicked yes/no | Z-test, Chi-squared | Large (10K+) |
| Continuous | Revenue, time | Welch's t-test | Medium |
| Ordinal | Rating 1-5 | Mann-Whitney U | Small-Medium |
| Count | Sessions per user | Poisson regression | Medium |
| Rate | Click-through rate | Z-test (proportions) | Large |

## Power Analysis

### Minimum Detectable Effect
```python
from statsmodels.stats.power import NormalIndPower

def min_sample_size(baseline, mde, alpha=0.05, power=0.8):
    """Calculate required sample size per variant."""
    effect_size = normalized_effect(baseline, baseline + mde)
    analysis = NormalIndPower()
    n = analysis.solve_power(
        effect_size=effect_size,
        alpha=alpha,
        power=power,
        ratio=1.0,
        alternative='two-sided'
    )
    return int(np.ceil(n))
```

### Sample Size Table (α=0.05, β=0.20)
```
Baseline | MDE 1%  | MDE 5%  | MDE 10% | MDE 20%
   1%    | 313,600 | 12,545  |  3,137  |    784
   5%    |   --    | 58,338  | 14,584  |  3,646
  10%    |   --    |110,292  | 27,573  |  6,893
  20%    |   --    |196,140  | 49,035  | 12,259
```

## Sequential Testing

### Always Valid p-Values
```python
import numpy as np

class SequentialTest:
    def __init__(self, alpha=0.05):
        self.alpha = alpha
        self.n = 0
        self.sum_control = 0
        self.sum_treatment = 0

    def add_observation(self, control_outcome, treatment_outcome):
        self.n += 1
        self.sum_control += control_outcome
        self.sum_treatment += treatment_outcome

    def z_score(self):
        p1 = self.sum_control / self.n
        p2 = self.sum_treatment / self.n
        se = np.sqrt(2 * ((p1 + p2) / 2) * (1 - (p1 + p2) / 2) / self.n)
        return (p2 - p1) / se if se > 0 else 0

    def adjusted_boundary(self):
        # Always valid boundary: ~sqrt(2 * n * alpha * (alpha + 1))
        # Simplified: use alpha/2 for continuous monitoring
        return 2.0  # conservative threshold for continuous monitoring
```

### Benefits
- No penalty for peeking at results
- Can stop early if effect is clear
- More efficient use of traffic
- Reduced time to decision

## Bayesian A/B Testing

### Beta-Bernoulli Model
```python
from scipy import stats

def bayesian_ab_test(control_success, control_total, treatment_success, treatment_total):
    # Prior: Beta(1, 1) uniform
    control_posterior = stats.beta(1 + control_success, 1 + control_total - control_success)
    treatment_posterior = stats.beta(1 + treatment_success, 1 + treatment_total - treatment_success)
    
    # Probability treatment is better
    samples_control = control_posterior.rvs(100000)
    samples_treatment = treatment_posterior.rvs(100000)
    prob_treatment_better = np.mean(samples_treatment > samples_control)
    
    # Credible interval
    lower = treatment_posterior.ppf(0.025)
    upper = treatment_posterior.ppf(0.975)
    
    return {
        "prob_better": prob_treatment_better,
        "credible_interval": (lower, upper),
        "control_mean": control_posterior.mean(),
        "treatment_mean": treatment_posterior.mean(),
    }
```

### Decision Rules (Bayesian)
```
Implement if:
  P(treatment > control) > 0.95
  AND expected lift > 1%
  
Continue if:
  0.80 < P(treatment > control) < 0.95
  (needs more data)
  
Stop if:
  P(treatment > control) < 0.80 after 2 weeks
  (likely no effect)
```

## Multiple Testing Correction

### Methods
```
Bonferroni: α / k (most conservative)
  → Use when: testing multiple variants vs same control
  → Risk: too conservative with many tests

Benjamini-Hochberg: Control FDR
  → Use when: many metrics, accept some false discoveries
  → Advantage: more power than Bonferroni

Holm-Bonferroni: Step-wise
  → Use when: moderate number of tests
  → Better power than standard Bonferroni
```

## Common Pitfalls

| Pitfall | Issue | Prevention |
|---------|-------|------------|
| Peeking | Checking results too often causes false positives | Use sequential testing or fixed duration |
| Sample ratio mismatch | Traffic not split evenly | AA test before experiment |
| Simpson's paradox | Overall result reverses in segments | Pre-register segment analysis |
| Novelty effect | Early behavior different from long-term | Run experiment long enough (>1 week) |
| Selection bias | Treatment assigned to different population | Proper randomization |
| Multiple comparisons | Too many metrics → false positives | Pre-register primary metric, correct for multiple tests |
