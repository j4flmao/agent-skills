---
name: data-science-experimentation
description: >
  Use this skill when asked about experiment design, A/B testing, randomized controlled trials, sample size calculation, power analysis, randomization, stratification, blocking, factorial designs, A/A tests, sequential testing, multiple testing correction, metric selection, north star metrics, guardrail metrics, experimentation platforms, feature flagging, traffic allocation, statistical engines, or self-serve experimentation. This skill enforces: experiment design (randomization, control groups, sample size, stratification, blocking, factorial, A/A), statistical methods (frequentist vs Bayesian, sequential testing, multiple testing correction, delta method), metric selection (north star, guardrail, proxy, success, diagnostic, ratio metrics), and platform architecture (feature flags, traffic allocation, metric computation, statistical engine, results delivery). Do NOT use for: general statistical analysis (use statistical-analysis skill), causal inference (use causal-inference skill), or ML model evaluation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data-science, experimentation, ab-testing, phase-7]
---

# Experimentation

## Purpose
Design, analyze, and operationalize experiments (A/B tests) with rigorous statistical methodology: experiment design (randomization units, control groups, sample size calculation, stratification, blocking, factorial designs, A/A tests), statistical methods (frequentist vs Bayesian frameworks, sequential testing, multiple testing correction with Bonferroni and FDR, delta method for ratio metrics), metric selection (north star, guardrail, proxy, success and diagnostic metrics, metric sensitivity, ratio metrics), and experimentation platform architecture (feature flagging, traffic allocation, metric computation pipelines, statistical engines, results delivery, self-serve experimentation).

## Agent Protocol

### Trigger
Exact user phrases: "experiment design", "A/B test", "AB test", "randomized trial", "sample size calculation", "power analysis", "stratification", "blocking", "factorial design", "A/A test", "sequential testing", "multiple testing correction", "Bonferroni", "FDR", "delta method", "metric selection", "north star metric", "guardrail metric", "proxy metric", "ratio metric", "experimentation platform", "feature flag", "traffic allocation", "statistical engine", "self-serve experiment", "experiment results", "treatment effect", "lift calculation".

### Input Context
Before activating, verify:
- Experiment type (A/B, multivariate, factorial, bandit)
- Randomization unit (user, session, event, device)
- Metric taxonomy (success, guardrail, diagnostic, proxy)
- Traffic volume and expected effect size
- Platform infrastructure (feature flag system, data pipeline, stats engine)
- Duration constraints and ramp schedule
- Regulatory/compliance considerations (GDPR, HIPAA)

### Output Artifact
Experiment design document with randomization scheme, sample size justification, metric definitions, statistical analysis plan, and platform configuration.

### Response Format
```python
# Analysis code, power calculation, metric computation
```
```yaml
# Experiment configuration, feature flag setup, metric definitions
```
```text
# Results: lift, confidence interval, p-value, decision
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Experiment design with randomization unit and method specified
- [ ] Sample size calculation with power, significance, and MDE
- [ ] Metric selection with success, guardrail, and diagnostic metrics
- [ ] Statistical analysis plan (frequentist or Bayesian, corrections)
- [ ] Platform configuration (feature flags, traffic allocation, ramp plan)
- [ ] A/A test validation before launch
- [ ] Results analysis with correct statistical method
- [ ] Decision framework (launch, iterate, kill) documented

### Max Response Length
400 lines of code and configuration.

## Workflow

### Step 1: Experiment Design
Randomization unit most common: user_id or cookie_id.

```python
def assign_treatment(user_id, experiment_id, traffic_pct=0.5, strata=None):
    import hashlib
    key = f"{experiment_id}:{user_id}"
    hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16) / 2**128
    return "treatment" if hash_val < traffic_pct else "control"
```

Sample size calculation:
```python
from scipy import stats

def sample_size_per_variant(baseline_rate, mde, alpha=0.05, power=0.8):
    """Minimum sample size per variant for proportion metric."""
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    p_pooled = baseline_rate + baseline_rate * (1 + mde) / 2
    var = 2 * p_pooled * (1 - p_pooled)
    effect = (baseline_rate * mde) ** 2
    n = int(np.ceil(var * (z_alpha + z_beta) ** 2 / effect))
    return n
```

### Step 2: A/A Validation
Run A/A test to validate statistical properties:
- Type I error rate at nominal alpha
- No systematic bias between two control groups
- Metric variance matches expectation

```python
def aa_test_validation(control_a, control_b, alpha=0.05, n_simulations=1000):
    false_positives = 0
    for _ in range(n_simulations):
        sample_a = np.random.choice(control_a, size=len(control_a), replace=True)
        sample_b = np.random.choice(control_b, size=len(control_b), replace=True)
        _, p = stats.ttest_ind(sample_a, sample_b)
        if p < alpha:
            false_positives += 1
    fpr = false_positives / n_simulations
    return {"fpr": fpr, "nominal_alpha": alpha, "valid": abs(fpr - alpha) < 0.01}
```

### Step 3: Two-Sample Test
```python
def experiment_analysis(treatment, control, metric_type="proportion"):
    if metric_type == "proportion":
        n_t, n_c = len(treatment), len(control)
        p_t, p_c = np.mean(treatment), np.mean(control)
        p_pool = (p_t * n_t + p_c * n_c) / (n_t + n_c)
        se = np.sqrt(p_pool * (1 - p_pool) * (1/n_t + 1/n_c))
        z = (p_t - p_c) / se
        p_value = 2 * (1 - stats.norm.cdf(abs(z)))
        lift = (p_t - p_c) / p_c if p_c > 0 else 0
        ci = (p_t - p_c) - 1.96 * se, (p_t - p_c) + 1.96 * se
    elif metric_type == "continuous":
        n_t, n_c = len(treatment), len(control)
        m_t, m_c = np.mean(treatment), np.mean(control)
        v_t, v_c = np.var(treatment, ddof=1), np.var(control, ddof=1)
        se = np.sqrt(v_t/n_t + v_c/n_c)
        z = (m_t - m_c) / se
        p_value = 2 * (1 - stats.norm.cdf(abs(z)))
        lift = (m_t - m_c) / m_c if m_c > 0 else 0
        ci = (m_t - m_c) - 1.96 * se, (m_t - m_c) + 1.96 * se
    return {"lift_pct": lift * 100, "p_value": p_value, "ci": ci, "significant": p_value < 0.05}
```

### Step 4: Sequential Testing
```python
def sequential_test(treatment, control, alpha=0.05, beta=0.2, delta=0.01):
    """Group sequential design with O'Brien-Fleming boundary."""
    from scipy.stats import norm
    n_total = len(treatment) + len(control)
    looks = min(5, n_total // 1000)
    boundaries = [norm.ppf(1 - alpha / (2 * looks)) for _ in range(looks)]
    for look in range(1, looks + 1):
        split = n_total * look // looks // 2
        t_slice = treatment[:split]
        c_slice = control[:split]
        z = (np.mean(t_slice) - np.mean(c_slice)) / \
            np.sqrt(np.var(t_slice, ddof=1)/len(t_slice) + np.var(c_slice, ddof=1)/len(c_slice))
        if abs(z) > boundaries[look - 1]:
            return {"decision": "stop_early", "look": look, "z": z, "boundary": boundaries[look-1]}
    return {"decision": "no_effect", "looks": looks}
```

### Step 5: Multiple Testing Correction
```python
def bonferroni_correction(p_values, alpha=0.05):
    n = len(p_values)
    adjusted = [min(p * n, 1.0) for p in p_values]
    significant = [a < alpha for a in adjusted]
    return {"adjusted_p": adjusted, "significant": significant}

def fdr_bh(p_values, alpha=0.05):
    n = len(p_values)
    sorted_idx = np.argsort(p_values)
    sorted_p = np.array(p_values)[sorted_idx]
    ranks = np.arange(1, n + 1)
    thresholds = ranks / n * alpha
    max_k = np.max(np.where(sorted_p <= thresholds)[0]) + 1 if np.any(sorted_p <= thresholds) else 0
    significant = np.zeros(n, dtype=bool)
    significant[sorted_idx[:max_k]] = True
    return {"significant": significant.tolist(), "rejected_count": max_k}
```

### Step 6: Delta Method for Ratio Metrics
```python
def delta_method_ci(numerator_t, denominator_t, numerator_c, denominator_c, alpha=0.05):
    n_t, n_c = len(numerator_t), len(denominator_t)
    mu_nt, mu_nc = np.mean(numerator_t), np.mean(numerator_c)
    mu_dt, mu_dc = np.mean(denominator_t), np.mean(denominator_c)
    ratio_t = mu_nt / mu_dt if mu_dt != 0 else 0
    ratio_c = mu_nc / mu_dc if mu_dc != 0 else 0
    # Covariance estimation
    cov_t = np.cov(numerator_t, denominator_t)
    var_ratio_t = (1/mu_dt**2) * cov_t[0,0] + (mu_nt**2/mu_dt**4) * cov_t[1,1] - 2*(mu_nt/mu_dt**3)*cov_t[0,1]
    cov_c = np.cov(numerator_c, denominator_c)
    var_ratio_c = (1/mu_dc**2) * cov_c[0,0] + (mu_nc**2/mu_dc**4) * cov_c[1,1] - 2*(mu_nc/mu_dc**3)*cov_c[0,1]
    se = np.sqrt(var_ratio_t/n_t + var_ratio_c/n_c)
    diff = ratio_t - ratio_c
    ci = (diff - 1.96*se, diff + 1.96*se)
    return {"ratio_treatment": ratio_t, "ratio_control": ratio_c, "lift": diff/ratio_c*100, "ci": ci}
```

### Step 7: Experimentation Platform Config
```yaml
# statsig / evi / launchdarkly-style experiment config
experiment:
  name: signup_flow_v2
  randomization_unit: user_id
  traffic_allocation: 0.10  # 10% of users
  variants:
    control: { weight: 0.50 }
    treatment: { weight: 0.50 }
  metrics:
    primary:
      - name: conversion_rate
        type: proportion
        direction: increase
    secondary:
      - name: revenue_per_user
        type: continuous
        direction: increase
    guardrails:
      - name: p50_latency_ms
        type: continuous
        direction: <= control
      - name: error_rate
        type: proportion
        direction: <= control
  statistical:
    engine: frequentist
    correction: bonferroni
    sequential: false
    alpha: 0.05
    power: 0.80
  ramp:
    initial: 0.01
    steps: [0.01, 0.05, 0.10]
    cooldown_hours: 24
  duration_days: 14
```

## Rules
- Randomization unit must be at or above the unit of analysis
- Always run A/A test to validate experiment infrastructure
- Pre-compute sample size and duration; never peek without correction
- Guardrail metrics must be monitored for negative impact
- Use delta method for ratio metrics (revenue per user, CTR)
- Correct for multiple comparisons across all metrics
- Sequential testing requires pre-registered stopping boundaries
- Ramp traffic gradually with cooldown between increments
- Launch decisions require statistical significance AND practical significance
- Document preriod: exclude first N hours for novelty/primacy effects

## References
- `references/experiment-design.md` — Randomization, control groups, sample size, stratification, blocking, factorial, A/A tests
- `references/statistical-methods.md` — Frequentist vs Bayesian, sequential testing, multiple testing correction, delta method
- `references/metric-selection.md` — North star, guardrail, proxy, success vs diagnostic, sensitivity, ratio metrics
- `references/experimentation-platform.md` — Feature flagging, traffic allocation, metric computation, statistical engine, results delivery

## Handoff
`data-science-statistical-analysis` for foundational statistical methods
`data-science-causal-inference` for causal effect estimation in observational settings
`data-science-analytics-engineering` for metric pipeline and data modeling
