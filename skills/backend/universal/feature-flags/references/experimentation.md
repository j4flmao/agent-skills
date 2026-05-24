# A/B Testing and Experimentation Reference

## Traffic Splitting

### Consistent Assignment
Users must be consistently assigned to the same variant throughout an experiment.

```typescript
function assignVariant(userId: string, experimentKey: string, variants: string[]): string {
  const hash = murmur3_32(`${experimentKey}:${userId}`);
  const index = hash % variants.length;
  return variants[index];
}

// Example: 50/50 split
const variant = assignVariant('user-123', 'checkout-redesign', ['control', 'treatment']);
```

### Traffic Allocation Models

| Model | Description | Best For |
|-------|-------------|----------|
| Even split | Equal traffic to each variant | Most experiments |
| Pareto (80/20) | 80% control, 20% treatment | High-risk changes |
| Multi-armed bandit | Dynamic allocation based on performance | Revenue optimization |
| Rollout | Gradual increase (1% → 5% → 25% → 100%) | Release validation |

```yaml
traffic_allocation:
  experiment: "checkout-redesign"
  variants:
    control: 50%
    treatment-a: 25%
    treatment-b: 25%
  sticky: true  # Same user always gets same variant
  ramp:
    day_1: 1%
    day_2: 5%
    day_3: 15%
    day_7: 50%
    day_14: 100%
```

## Statistical Significance

### Frequentist Approach
```python
from scipy import stats
import math

def calculate_significance(control: dict, treatment: dict) -> dict:
    """
    control/treatment: { 'visitors': n, 'conversions': c }
    """
    p1 = control['conversions'] / control['visitors']
    p2 = treatment['conversions'] / treatment['visitors']

    # Pooled standard error
    p_pool = (control['conversions'] + treatment['conversions']) / \
             (control['visitors'] + treatment['visitors'])
    se = math.sqrt(p_pool * (1 - p_pool) * (1/control['visitors'] + 1/treatment['visitors']))

    # Z-score
    z = (p2 - p1) / se

    # P-value (two-tailed)
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))

    # Confidence interval
    z_critical = 1.96  # 95% CI
    ci_lower = (p2 - p1) - z_critical * se
    ci_upper = (p2 - p1) + z_critical * se

    return {
        'lift_pct': (p2 - p1) / p1 * 100,
        'p_value': p_value,
        'significant': p_value < 0.05,
        'ci_95': (ci_lower, ci_upper)
    }
```

### Bayesian Approach
```python
from scipy.stats import beta

def bayesian_analysis(control: dict, treatment: dict, samples=100000):
    # Beta posterior: Beta(alpha + conversions, beta + non-conversions)
    a_prior, b_prior = 1, 1  # Uniform prior

    control_posterior = beta(a_prior + control['conversions'],
                             b_prior + control['visitors'] - control['conversions'])
    treatment_posterior = beta(a_prior + treatment['conversions'],
                               b_prior + treatment['visitors'] - treatment['conversions'])

    # Monte Carlo: probability treatment > control
    control_samples = control_posterior.rvs(samples)
    treatment_samples = treatment_posterior.rvs(samples)
    prob_win = (treatment_samples > control_samples).mean()

    return {
        'prob_control_better': 1 - prob_win,
        'prob_treatment_better': prob_win,
        'expected_lift': (treatment_posterior.mean() - control_posterior.mean()) / control_posterior.mean()
    }
```

## Sample Ratio Mismatch (SRM)

SRM occurs when the actual traffic split differs significantly from the expected split.

### Detection
```python
def check_srm(expected_split: dict, actual_split: dict) -> float:
    """Chi-squared test for sample ratio mismatch."""
    total = sum(actual_split.values())
    chi2 = sum(
        (actual - total * expected)**2 / (total * expected)
        for actual, expected in zip(actual_split.values(), expected_split.values())
    )
    p_value = 1 - stats.chi2.cdf(chi2, df=len(expected_split) - 1)
    return p_value  # p < 0.05 indicates SRM
```

### Common SRM Causes
| Cause | Symptom | Fix |
|-------|---------|-----|
| Bug in assignment code | Consistent SRM across experiments | Review hash function |
| Caching flags | Users get wrong variant | Disable caching for experiment flags |
| Bot traffic | SRM in all experiments | Filter bots before assignment |
| Race conditions | Intermittent SRM | Lock assignment at request level |
| Multiple devices | User counted twice | Deduplicate by user ID, not cookie |

## Multivariate Testing (MVT)

Tests multiple variables simultaneously to measure interaction effects.

```yaml
multivariate_experiment:
  name: "checkout-page-mvt"
  factors:
    - name: "cta_color"
      levels: ["blue", "green", "red"]
    - name: "layout"
      levels: ["single-column", "two-column"]
    - name: "headline"
      levels: ["short", "long", "question"]
  total_variants: 18  # 3 x 2 x 3
  minimum_sample: 500_000  # Per variant (much higher than A/B)
```

### Sample Size Formula (MVT)
```
N per variant ≈ 16 * (baseline_variance / MDE^2) * num_factors
```

## Holdout Groups

A holdout group is a persistent control group that never receives treatment across experiments.

### Purpose
- Measure long-term effects of cumulative changes
- Detect novelty effects (short-term boost that fades)
- Validate that experiments don't harm core metrics over months

```yaml
holdout_group:
  size: 5%  # 5% of users never see any experiment treatment
  assignment: "User ID hash mod 100 >= 95"
  duration: "Permanent (for 6-12 month analysis)"
  metrics: ["retention", "LTV", "churn rate", "support tickets"]
```

### Analysis
```python
def analyze_holdout(experiment_users: pd.DataFrame, holdout_users: pd.DataFrame, metric: str):
    """Compare long-term metric between users who saw any treatment vs holdout."""
    t_stat, p_value = stats.ttest_ind(
        experiment_users[metric],
        holdout_users[metric]
    )
    return {
        'experiment_mean': experiment_users[metric].mean(),
        'holdout_mean': holdout_users[metric].mean(),
        'lift_vs_holdout': (experiment_users[metric].mean() - holdout_users[metric].mean()) / holdout_users[metric].mean(),
        'p_value': p_value,
        'significant': p_value < 0.05
    }
```

## Experiment Design Checklist

- [ ] Primary metric defined and measurable
- [ ] Minimum detectable effect calculated
- [ ] Sample size computed (minimum duration in days)
- [ ] SRM monitoring in place
- [ ] Novelty effect accounted for (minimum 1 week)
- [ ] Guardrail metrics identified (latency, error rate)
- [ ] Holdout group established for long-term measurement
- [ ] Segmentation plan for secondary analysis
- [ ] Stop rules defined (futility, harm, early victory)
- [ ] Communication plan for results distribution
