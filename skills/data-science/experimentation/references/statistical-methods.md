# Statistical Methods for Experimentation Reference

## Frequentist vs Bayesian

### Frequentist Framework
```
Hypothesis: H₀: θ_t = θ_c, H₁: θ_t ≠ θ_c
Decision: Reject H₀ if p < α (typically α = 0.05)
Output: p-value, CI, significant/not-significant
Parameters: fixed unknown constants
```

```python
import numpy as np
from scipy import stats

def frequentist_ab_test(conversions_a, trials_a, conversions_b, trials_b):
    p_a = conversions_a / trials_a
    p_b = conversions_b / trials_b
    p_pool = (conversions_a + conversions_b) / (trials_a + trials_b)
    se = np.sqrt(p_pool * (1 - p_pool) * (1/trials_a + 1/trials_b))
    z = (p_b - p_a) / se
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))
    ci = (p_b - p_a - 1.96*se, p_b - p_a + 1.96*se)
    return {"z": z, "p_value": p_value, "ci": ci, "significant": p_value < 0.05}
```

### Bayesian Framework
```
Prior: P(θ) — belief before experiment
Likelihood: P(data|θ) — data generating process
Posterior: P(θ|data) ∝ P(data|θ) × P(θ)
Output: posterior distribution, credible interval, Pr(θ_b > θ_a | data)
```

```python
import pymc as pm, arviz as az

def bayesian_ab_test(conversions_a, trials_a, conversions_b, trials_b,
                     alpha_prior=1, beta_prior=1):
    with pm.Model() as model:
        p_a = pm.Beta("p_a", alpha=alpha_prior + conversions_a,
                      beta=beta_prior + trials_a - conversions_a)
        p_b = pm.Beta("p_b", alpha=alpha_prior + conversions_b,
                      beta=beta_prior + trials_b - conversions_b)
        lift = (p_b - p_a) / p_a
        rel_lift = pm.Deterministic("rel_lift", lift)
        prob_b_better = pm.Deterministic("prob_b_better", pm.math.gt(p_b, p_a))
        trace = pm.sample(draws=5000, tune=2000, chains=4, progressbar=False)
    return trace

# Decision: launch if Pr(better) > threshold (e.g., 0.95)
# Or: launch if expected loss < cost threshold
```

### Comparison Table
| Aspect | Frequentist | Bayesian |
|--------|-------------|----------|
| Philosophy | Long-run frequency | Degree of belief |
| Prior | Not needed | Required (can be weak) |
| Stopping | Fixed sample | Can stop anytime |
| Interpretation | P(data | null) | P(effect | data) |
| Multiple testing | Correction needed | Automatic shrinkage |
| Decision | p < α | Expected loss / threshold |
| Transparency | Harder for non-experts | Intuitive probability |

## Sequential Testing

### Problem with Traditional Tests
Traditional tests require fixed sample size. Peeking (checking results early) inflates Type I error.

```python
def peeking_simulation(true_effect=0, n_max=10000, peek_frequency=500, alpha=0.05):
    """Simulate Type I error inflation from peeking."""
    false_positives = 0
    for _ in range(1000):
        data = np.random.normal(true_effect, 1, n_max)
        for n in range(peek_frequency, n_max + 1, peek_frequency):
            _, p = stats.ttest_1samp(data[:n], 0)
            if p < alpha:
                false_positives += 1
                break
    return false_positives / 1000  # Will be > 0.05 (much higher)
```

### Group Sequential Design
Pre-specified look times with adjusted boundaries.

```python
def obrien_fleming_boundary(k, alpha=0.05):
    """O'Brien-Fleming spending function for K looks."""
    from scipy.stats import norm
    boundaries = []
    for i in range(1, k + 1):
        z_boundary = norm.ppf(1 - alpha / (2 * k))
        boundaries.append(z_boundary / np.sqrt(k / i))
    return boundaries

def sequential_test(treatment, control, n_looks=5, alpha=0.05):
    z_boundaries = obrien_fleming_boundary(n_looks, alpha)
    n_per_look = len(treatment) // n_looks
    for look in range(1, n_looks + 1):
        t_slice = treatment[:look * n_per_look]
        c_slice = control[:look * n_per_look]
        n_t, n_c = len(t_slice), len(c_slice)
        mean_t, mean_c = np.mean(t_slice), np.mean(c_slice)
        var_t, var_c = np.var(t_slice, ddof=1), np.var(c_slice, ddof=1)
        z = (mean_t - mean_c) / np.sqrt(var_t/n_t + var_c/n_c)
        if abs(z) > z_boundaries[look - 1]:
            return {"stopped_early": True, "look": look, "z": z}
    return {"stopped_early": False, "n_looks": n_looks}
```

### Always Valid Inference (Martingale / Mixture)
```python
def always_valid_p_value(data, treatment_indicator, alpha=0.05):
    """Mixture sequential p-value — valid under continuous monitoring."""
    from scipy.stats import norm
    n = len(data)
    z_scores = []
    for t in range(10, n):
        trt = data[treatment_indicator == 1][:t]
        ctrl = data[treatment_indicator == 0][:t]
        if len(trt) < 5 or len(ctrl) < 5:
            continue
        z = (np.mean(trt) - np.mean(ctrl)) / np.sqrt(
            np.var(trt, ddof=1)/len(trt) + np.var(ctrl, ddof=1)/len(ctrl))
        z_scores.append(z)
    # Mixture of normal priors — can stop at any time
    return np.mean([np.exp(z**2/2 - 2) for z in z_scores])  # Simplified
```

## Multiple Testing Correction

### Family-Wise Error Rate (FWER)
Probability of at least one Type I error among all tests.
FWER = 1 - (1 - α)^m ≈ α×m for small α, multiple tests.

### Bonferroni
```python
def bonferroni(p_values, alpha=0.05):
    m = len(p_values)
    adjusted = [min(p * m, 1.0) for p in p_values]
    significant = [a < alpha for a in adjusted]
    return {"adjusted": adjusted, "significant": significant}
```

### Holm-Bonferroni
```python
def holm(p_values, alpha=0.05):
    m = len(p_values)
    sorted_idx = np.argsort(p_values)
    significant = [False] * m
    for i, idx in enumerate(sorted_idx):
        if p_values[idx] < alpha / (m - i):
            significant[idx] = True
        else:
            break
    return significant
```

### Benjamini-Hochberg (FDR)
```python
def benjamini_hochberg(p_values, alpha=0.05):
    m = len(p_values)
    sorted_idx = np.argsort(p_values)
    sorted_p = np.array(p_values)[sorted_idx]
    thresholds = (np.arange(1, m + 1) / m) * alpha
    below = sorted_p <= thresholds
    if not any(below):
        return [False] * m
    max_k = np.max(np.where(below))
    significant = [False] * m
    for i in sorted_idx[:max_k + 1]:
        significant[i] = True
    return significant
```

### Which Correction to Use
- Primary metrics (few): Bonferroni or Holm
- Secondary metrics (many): Benjamini-Hochberg
- Guardrail metrics: Bonferroni (false positive costly)
- Exploratory: Storey's q-value
- Correlated metrics: FDR with dependence adjustment

## Delta Method for Ratio Metrics

### Problem
Ratio metrics (revenue per user, CTR, ARPU) have correlated numerator and denominator. Naive variance estimate is wrong.

```python
def delta_method_var(x, y):
    """Variance of ratio Y/X using delta method."""
    x_bar, y_bar = np.mean(x), np.mean(y)
    n = len(x)
    var_x = np.var(x, ddof=1)
    var_y = np.var(y, ddof=1)
    cov_xy = np.cov(x, y, ddof=1)[0, 1]
    ratio = y_bar / x_bar
    # Var(Y/X) ≈ (1/X̄²)Var(Y) + (Ȳ²/X̄⁴)Var(X) - 2(Ȳ/X̄³)Cov(X,Y)
    var_ratio = (1/x_bar**2) * var_y + (y_bar**2/x_bar**4) * var_x - 2*(y_bar/x_bar**3) * cov_xy
    var_ratio_mean = var_ratio / n
    return var_ratio_mean, ratio

def delta_method_test(numerator_a, denominator_a, numerator_b, denominator_b):
    var_a, ratio_a = delta_method_var(denominator_a, numerator_a)
    var_b, ratio_b = delta_method_var(denominator_b, numerator_b)
    se_diff = np.sqrt(var_a + var_b)
    z = (ratio_b - ratio_a) / se_diff
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    ci = (ratio_b - ratio_a - 1.96*se_diff, ratio_b - ratio_a + 1.96*se_diff)
    return {"ratio_a": ratio_a, "ratio_b": ratio_b, "p": p, "ci": ci}
```

### Bootstrap Alternative
```python
def bootstrap_ratio_ci(numerator, denominator, n_bootstrap=10000):
    ratios = []
    n = len(numerator)
    for _ in range(n_bootstrap):
        idx = np.random.choice(n, n, replace=True)
        ratios.append(np.sum(numerator[idx]) / np.sum(denominator[idx]))
    return np.percentile(ratios, [2.5, 97.5])
```

## Delta Method for Log-Normal Metrics

Revenue, session duration, and latency are often log-normal. Use delta method on log scale.

```python
def log_normal_ab_test(data_a, data_b):
    log_a = np.log(data_a)
    log_b = np.log(data_b)
    mu_a, mu_b = np.mean(log_a), np.mean(log_b)
    var_a, var_b = np.var(log_a, ddof=1), np.var(log_b, ddof=1)
    n_a, n_b = len(data_a), len(data_b)
    # Expectation on original scale: E[Y] = exp(μ + σ²/2)
    # Variance of mean on original scale: Var(Ȳ) = exp(2μ + σ²) * (exp(σ²) - 1) / n
    se = np.sqrt(exp(2*mu_a + var_a)*(exp(var_a)-1)/n_a +
                 exp(2*mu_b + var_b)*(exp(var_b)-1)/n_b)
    diff = exp(mu_b + var_b/2) - exp(mu_a + var_a/2)
    z = diff / se
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    return {"diff": diff, "p": p}
```

## Winsorization and Trimming

### Winsorization
Cap extreme values at specified percentiles to reduce variance.

```python
def winsorize(data, limits=0.01):
    lower = np.percentile(data, limits * 100)
    upper = np.percentile(data, (1 - limits) * 100)
    return np.clip(data, lower, upper)
```

### Trimmed Mean
```python
from scipy import stats
trimmed_mean = stats.trim_mean(data, proportiontocut=0.01)
```

## Variance Reduction

### CUPED (Controlled-experiment Using Pre-Experiment Data)
```python
def cuped_adjustment(post_treatment, post_control, pre_all):
    """CUPED: use pre-experiment data to reduce variance."""
    # Correlation between pre and post
    theta = np.cov(post_all, pre_all)[0, 1] / np.var(pre_all)
    adjusted_treatment = post_treatment - theta * (pre_treatment - np.mean(pre_all))
    adjusted_control = post_control - theta * (pre_control - np.mean(pre_all))
    var_reduction = 1 - np.var(adjusted_treatment) / np.var(post_treatment)
    return adjusted_treatment, adjusted_control, var_reduction
```

### Stratification
Post-stratify on pre-experiment covariates. Reduces variance by explaining outcome variation.

### Regression Adjustment
Include pre-experiment covariates in regression: y = β₀ + β₁·treatment + β₂·x_pre + ε. β₁ is the treatment effect estimate with reduced variance.
