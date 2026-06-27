---
name: data-science-experimentation
description: >
  Use this skill when designing experiments, A/B tests, multi-armed bandits, randomized controlled trials, statistical hypothesis tests, sample size calculations, experiment design, power analysis, or causal inference for product changes. This skill enforces: rigorous experiment design with pre-registered hypotheses, proper sample size calculations, statistical significance testing, multiple comparison corrections, guardrail metrics, and result interpretation. Do NOT use for: observational causal inference (see causal-inference skill), general statistical analysis (see statistical-analysis), or ML model evaluation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data-science, experimentation, stats, phase-7]
---

# Experimentation

## Purpose
Design and analyze rigorous A/B tests and experiments. Enforce proper sample size planning, pre-registration, statistical methods, guardrail monitoring, and decision frameworks.

## Agent Protocol

### Trigger
Exact user phrases: "A/B test", "experiment", "randomized trial", "sample size", "power analysis", "hypothesis test", "p-value", "multiple testing", "guardrail metric", "experiment design", "treatment effect", "H0", "alternative hypothesis", "statistical significance", "practical significance", "MDE", "minimum detectable effect".

### Input Context
- Experiment type (A/B, multivariate, MAB, switchback)
- Primary metric(s) and their baseline values
- Minimum detectable effect (MDE) in absolute or relative terms
- Traffic volume and expected experiment duration
- Unit of randomization (user, session, cluster)
- Guardrail metrics and acceptable thresholds
- Regulatory and ethical considerations
- Existing experiment platform and tooling

### Output Artifact
Experiment design with sample size calculation, analysis plan, and decision criteria.

### Response Format
```
## Experiment Design
Hypothesis: {H0 and H1}
Primary Metric: {name, baseline, MDE}
Sample Size: {N per variant, total N}
Duration: {days} at {traffic allocation}
Analysis: {test type, corrections, covariates}

## Analysis Results
Treatment Effect: {estimate, CI, p-value}
Practical Significance: {effect size, decision}
Guardrails: {√ or ✗ per metric}
```

### Completion Criteria
- [ ] Pre-registered hypothesis with H0 and H1
- [ ] Sample size calculated for desired power (80%+)
- [ ] Randomization method selected (simple, stratified, cluster)
- [ ] Primary metric defined with baseline and MDE
- [ ] Guardrail metrics defined with thresholds
- [ ] Statistical test selected (t-test, chi-square, etc.)
- [ ] Multiple testing correction applied
- [ ] Decision criteria: ship, iterate, or kill

## Workflow

### Step 1: Hypothesis Development
Formulate clear, falsifiable hypotheses. H0 (null): no effect. H1 (alternative): effect exists in specified direction. A good hypothesis: "Changing the checkout button color from blue to green will increase purchase conversion rate by at least 0.5 percentage points." Pre-register on experiment platform or in documentation before launch. Include rationale, prior evidence, and expected mechanism of action.

### Step 2: Metric Selection

#### Primary Metric (OEC)
Define one overall evaluation criterion. Must be: sensitive to the change, reliable (low measurement variance), timely (can be measured during experiment window), and directional (higher or lower is clearly better). Examples: purchase conversion rate, revenue per user, retention rate (day 7), task completion rate.

#### Secondary Metrics
Related success indicators that might be affected. Examples: average order value, session duration, pages per session. Secondary metrics are reported but not used for the go/no-go decision.

#### Guardrail Metrics
Metrics that MUST NOT degrade even if primary metric improves. Examples: page load time, error rate, unsubscribes, support ticket volume, latency p99. Set acceptable thresholds upfront. A treatment that improves the primary metric but degrades a guardrail is usually not shipped.

#### Metric Standardization
Define metrics once in a central repository (SQL or Python). Store: metric name, SQL definition, owner, expected range, seasonality, guardrail assignment. Version control definitions. Consistent definitions across experiments enable comparability.

### Step 3: Sample Size Calculation

#### Input Parameters
Baseline conversion rate (p0): current value of the metric. Minimum detectable effect (MDE): smallest effect worth detecting. Significance level (α): probability of false positive, typically 0.05. Statistical power (1-β): probability of detecting true effect, target ≥ 0.80. Allocation ratio: 1:1 (most efficient).

#### Formula for Proportions
n = (Z_(α/2) + Z_β)² × (p1(1-p1) + p2(1-p2)) / (p1 - p2)²

For continuous metrics: n = 2 × (Z_(α/2) + Z_β)² × σ² / δ²

#### Practical Examples
| Baseline | MDE (relative) | α | Power | N per variant |
|---|---|---|---|---|
| 5% | 10% (0.5pp) | 0.05 | 0.80 | ~13,500 |
| 5% | 20% (1.0pp) | 0.05 | 0.80 | ~3,600 |
| 10% | 10% (1.0pp) | 0.05 | 0.80 | ~3,400 |
| 10% | 5% (0.5pp) | 0.05 | 0.80 | ~13,800 |
| 20% | 10% (2.0pp) | 0.05 | 0.80 | ~2,500 |

### Step 4: Randomization

#### Randomization Methods
Simple: each unit assigned independently. Stratified: block by important covariates (country, platform, segment) to reduce variance. Cluster: group-level randomization when network effects exist (markets, regions). Re-randomization: reject unbalanced allocations (if used, must adjust inference).

#### Sample Ratio Mismatch (SRM)
Monitor daily: chi-square test on observed vs expected allocation ratio. p < 0.05 indicates SRM. Common causes: assignment code bug, caching layers, bot filtering, ad blockers. SRM found → experiment is invalid. Do not analyze primary metric. Fix root cause, re-launch.

### Step 5: Statistical Analysis

#### Frequentist Analysis
Two-sample t-test for continuous metrics. Chi-square test for proportions. Report: point estimate, confidence interval, p-value, effect size (Cohen's d or lift %). Pre-specified analysis plan prevents p-hacking.

#### Bayesian Analysis
Beta-Binomial for proportions (Beta prior + Binomial data → Beta posterior). Normal-Normal for continuous outcomes. Report: posterior mean, credible interval (HDI), probability of direction P(effect > 0), probability of practical significance P(effect > MDE).

#### Multiple Testing Correction
FWER (Bonferroni, Holm): use when false positive is catastrophic. FDR (Benjamini-Hochberg): use when discovering true effects is important. Pre-register which corrections apply. Report all tests performed, not just significant ones.

### Step 6: Heterogeneity Analysis
Pre-specified subgroups only (region, platform, user segment). Test via interaction model: Y = β0 + β1×T + β2×S + β3×T×S. Post-hoc discovery uses causal forest or BART but acknowledge inflated false discovery rate.

### Step 7: Experiment Governance

#### Phases of an Experiment
1. Design: hypothesis, metrics, sample size, randomization plan
2. Launch: traffic allocation, AA test validation
3. Monitor: daily dashboard, SRM checks, guardrail alerts
4. Analyze: after power reached, run pre-registered analysis
5. Decide: ship, iterate, or kill — based on primary metric + guardrails
6. Document: results, learnings, follow-up experiments

#### Experiment Calendar
Coordinate overlapping experiments. Namespace via MD5 hash partitions. Maximum simultaneous experiments per user: 5-10. Conflict resolution: last-writer-wins or explicit priority assignment.

## Decision Trees

### Metric Selection
```
What question are we answering?
├── Did conversion increase?
│   └── Primary: conversion rate (proportion)
├── Did revenue increase?
│   └── Primary: revenue per user (continuous)
├── Did retention improve?
│   └── Primary: D7 retention rate (proportion)
└── Did user engagement change?
    └── Primary: sessions per user (count)
```

### Statistical Test Selection
```
Data type?
├── Binary (conversion, click)
│   ├── Two groups → Chi-square or z-test
│   ├── Multiple groups → Chi-square or logistic regression
│   └── Paired → McNemar's test
├── Continuous (revenue, time)
│   ├── Normal, two groups → t-test
│   ├── Normal, multiple groups → ANOVA
│   ├── Non-normal, two groups → Mann-Whitney U
│   └── Non-normal, multiple groups → Kruskal-Wallis
├── Count (sessions, clicks)
│   ├── Low variance → Poisson test
│   └── Overdispersed → Negative binomial
└── Ordinal (rating, tier)
    └── Mann-Whitney U or ordered logit
```

### CUPED (Controlled Experiment Using Pre-Experiment Data)

#### Variance Reduction with Pre-Experiment Covariates
CUPED uses pre-experiment data to explain metric variance, reducing required sample size. Formula: Y_cv = Y - θ × (X - μ_X). θ = Cov(Y, X) / Var(X). Variance reduction = Corr(Y, X)². Typical reduction: 20-50% for metrics with strong pre-experiment correlation.

```python
def cuped_adjust(treatment_metric, control_metric, pre_treatment, pre_control):
    # Pool pre-experiment data (both variants before treatment)
    pre_pooled = np.concatenate([pre_treatment, pre_control])
    post_pooled = np.concatenate([treatment_metric, control_metric])
    
    # Calculate theta
    theta = np.cov(pre_pooled, post_pooled)[0, 1] / np.var(pre_pooled)
    
    # Adjust metrics, variance_reduction = corr(pre, post)^2
    mu_x = np.mean(pre_pooled)
    treatment_adjusted = treatment_metric - theta * (pre_treatment - mu_x)
    control_adjusted = control_metric - theta * (pre_control - mu_x)
    
    return treatment_adjusted, control_adjusted

# CUPED with multiple covariates
# Y_cv = Y - Σ(θ_i × (X_i - μ_i))
# Use pre-period metric, user-level features, segment indicators
```

#### When CUPED Works Best
High correlation between pre/post metric (r > 0.5). Stable user behavior (don't use for completely new features). Metric measured at same unit level (user-level metric → user-level covariate). Less effective for: rare events (conversion < 1%), metrics with high individual volatility.

### Sequential Testing (Always Valid Inference)

#### Mixture of Sequential Probability Ratio Test (mSPRT)
Allows continuous monitoring without inflating false positive rate. Uses a mixing distribution over effect sizes. Decision boundary widens over time, maintaining valid type I error at any stopping time.

```python
# mSPRT for normal data (continuous metrics)
def msprt_normal(treatment_data, control_data, variance=None):
    n = len(treatment_data)
    m = len(control_data)
    theta_hat = np.mean(treatment_data) - np.mean(control_data)
    se = np.sqrt(np.var(treatment_data)/n + np.var(control_data)/m) if variance is None else variance
    
    # Log-likelihood ratio integrated over normal prior N(0, tau²)
    tau = 0.2 * se  # Mixing variance (tune based on MDE)
    z = theta_hat / se
    lrt = (tau**2 / (se**2 + tau**2)) * np.exp(
        (z**2 * tau**2) / (2 * (se**2 + tau**2))
    )
    
    # Reject H0 when LRT crosses threshold (typically 1/e ≈ 0.368)
    return lrt > np.exp(-1)
```

#### Implementation in Practice
Use sequential testing for: long-running experiments, high-traffic products, safety-critical changes. Configure: expected effect size, alpha spending function, maximum sample size. Tools: Google's CORE, Optimizely Sequential, custom mSPRT implementation.

### Python Power Calculation

```python
def sample_size_proportion(p0, mde_relative, alpha=0.05, power=0.80, ratio=1.0):
    p1 = p0 * (1 + mde_relative)
    z_alpha = stats.norm.ppf(1 - alpha/2)
    z_beta = stats.norm.ppf(power)
    p_bar = (p0 + p1 * ratio) / (1 + ratio)
    n = ((z_alpha * np.sqrt(p_bar * (1 - p_bar) * (1 + 1/ratio))
          + z_beta * np.sqrt(p0 * (1 - p0) / ratio + p1 * (1 - p1)))**2
         / (p1 - p0)**2)
    return int(np.ceil(n))

def sample_size_continuous(mu, sigma, mde_absolute, alpha=0.05, power=0.80):
    z_alpha = stats.norm.ppf(1 - alpha/2)
    z_beta = stats.norm.ppf(power)
    n = 2 * (z_alpha + z_beta)**2 * sigma**2 / mde_absolute**2
    return int(np.ceil(n))

# Example: baseline 10%, MDE 5% relative (0.5pp), α=0.05, power=0.80
# sample_size_proportion(0.10, 0.05) → ~13,800 per variant
```

### Ratio Metrics and the Delta Method

#### Delta Method for Variance
Ratio metrics (revenue per user, CTR = clicks/impressions) need special variance estimation. Delta method: Var(R) ≈ (μ_y/μ_x)² × (Var(y)/μ_y² + Var(x)/μ_x² - 2Cov(x,y)/(μ_x·μ_y))

```python
def delta_method_variance(a, b):
    # For ratio metric R = a / b (e.g., revenue per session)
    mu_a, mu_b = np.mean(a), np.mean(b)
    n = len(a)
    var_a = np.var(a, ddof=1)
    var_b = np.var(b, ddof=1)
    cov_ab = np.cov(a, b, ddof=1)[0, 1]
    
    r = mu_a / mu_b
    var_r = (r**2) * (var_a/mu_a**2 + var_b/mu_b**2 - 2*cov_ab/(mu_a*mu_b))
    se_r = np.sqrt(var_r / n)
    
    ci_lower = r - 1.96 * se_r
    ci_upper = r + 1.96 * se_r
    return r, se_r, ci_lower, ci_upper
```

#### Bootstrap for Ratio Metrics
When delta method assumptions fail (small samples, skewed distributions): resample (user, sessions, revenue) units with replacement, compute ratio per resample, use percentile CI. Minimum 1000 bootstrap replicates for stable CI.

### Multi-Armed Bandit (MAB)

#### When to Use MAB
Explore/exploit when: opportunity cost of exploration is real (revenue per impression), many variants (>5), metric is immediate (clicks, not retention). Don't use MAB: small sample sizes, delayed metrics, need hypothesis testing.

#### Thompson Sampling
```python
def thompson_sample(clicks, impressions, n_samples=1000):
    # Beta-Binomial: prior Beta(1,1), posterior Beta(1+clicks, 1+impressions-clicks)
    posteriors = [stats.beta(1+c, 1+i-c).rvs(n_samples)
                  for c, i in zip(clicks, impressions)]
    # Choose variant with highest sampled value
    return np.argmax(np.mean(posteriors, axis=1))
```

### Experiment Platform Architecture

```yaml
experiment_platform:
  components:
    - assignment_service:
        description: "Deterministic variant assignment via consistent hashing"
        implementation: "MD5(user_id + experiment_id) % 1000 → variant"
        features:
          - "Sticky assignment across sessions"
          - "Stratified randomization by segments"
          - "Exclusion/inclusion rules"
    
    - event_pipeline:
        description: "Capture and process experiment events"
        components:
          - "Client-side SDK (web, mobile, server)"
          - "Event ingestion (Kafka/Kinesis)"
          - "Stream processing (Flink/Spark) for real-time metrics"
          - "Batch processing (daily/hourly) for final metrics"
    
    - metric_calculation:
        description: "Compute experiment metrics from raw events"
        requirements:
          - "Standardize metric definitions in SQL"
          - "Compute per-user metric deltas"
          - "CUPED adjustment layer"
          - "Ratio metric calculation with delta method"
    
    - analysis_service:
        description: "Statistical analysis and reporting"
        features:
          - "Frequentist + Bayesian analysis"
          - "Sequential testing (mSPRT)"
          - "SRM detection (chi-square)"
          - "Multiple testing correction"
          - "Heterogeneity analysis (CATE estimation)"
    
    - results_dashboard:
        description: "Self-serve experiment results"
        features:
          - "Primary metric: point estimate + CI + p-value"
          - "Guardrail metrics: pass/warn/fail status"
          - "Sample size tracker: actual vs target"
          - "Experiment timeline and decision log"
          - "Signals: SRM alerts, guardrail breaches"
```

### Experiment Logging and Data Warehouse

```yaml
experiment_events_schema:
  # Core experiment assignment table
  experiment_assignments:
    columns:
      - experiment_id: STRING
      - variant_id: STRING
      - user_id: STRING
      - assignment_timestamp: TIMESTAMP
      - stratification_factors: MAP<STRING, STRING>
      - is_control: BOOLEAN
    partition: "(event_date)"
    clustering: "(experiment_id)"
  
  # Metric events joined with assignments
  experiment_metrics:
    columns:
      - event_id: STRING
      - user_id: STRING
      - experiment_id: STRING
      - variant_id: STRING
      - metric_name: STRING
      - metric_value: FLOAT
      - metric_timestamp: TIMESTAMP
    partition: "(event_date)"
    clustering: "(experiment_id, metric_name)"

  # Analysis results table
  experiment_results:
    columns:
      - experiment_id: STRING
      - run_timestamp: TIMESTAMP
      - metric_name: STRING
      - variant_id: STRING
      - treatment_effect: FLOAT
      - confidence_interval: STRUCT<lower FLOAT, upper FLOAT>
      - p_value: FLOAT
      - effect_size: FLOAT
      - sample_size: INT
      - is_guardrail: BOOLEAN
      - guardrail_passed: BOOLEAN
      - srm_p_value: FLOAT
```

### Decision Trees (continued)

#### Variance Reduction Method
```
Metric variability too high to detect MDE?
├── Pre-experiment data available for same metric
│   └── CUPED (reduces variance by correlation^2)
├── Pre-experiment data available for covariates
│   └── CUPED with multiple covariates
├── Stratification feasible (country, platform, segment)
│   └── Stratified randomization + stratified analysis
├── ML model predicting the metric available
│   └── CUPED with model predictions as covariates
└── Sequential monitoring needed
    └── mSPRT (always valid inference at any stopping time)
```

#### Experiment Duration Decision
```
When can we stop the experiment?
├── Sample size reached AND minimum duration elapsed
│   └── If using fixed-horizon test → run full analysis
├── Sequential test boundary crossed
│   └── Stop early — result is valid (mSPRT)
├── Bayesian probability of success > 95%
│   └── Consider stopping if opportunity cost is high
├── Guardrail metric breached
│   └── Stop experiment — roll back treatment
└── SRM detected
    └── Stop experiment — invalid data, investigate root cause
```

## Rules
- Pre-register hypothesis, primary metric, and analysis plan before launch
- Calculate sample size for 80% power, specify MDE upfront
- Use one primary metric, multiple secondary metrics with clear hierarchy
- Always include guardrail metrics with pre-specified thresholds
- Monitor SRM daily — invalid experiments are not analyzed
- Use stratified randomization or CUPED for variance reduction
- Apply FDR correction for secondary metrics, FWER for primary
- Never peek at results without sequential testing boundaries
- Report effect size + CI, not just p-value
- Document all experiment decisions with rationale in experiment log
- Use delta method or bootstrap for ratio metric variance estimation
- Apply CUPED when pre-experiment metric correlation > 0.5
- Prefer sequential testing (mSPRT) for long-running or high-traffic experiments
- Log experiment assignments and metrics to data warehouse for meta-analysis

## References
  - references/experimentation-fundamentals.md — Experimentation Fundamentals
  - references/experimentation-advanced.md — Experimentation Advanced Topics

## Architecture Decision Trees

```
Experimentation Design
├── Traffic volume?
│   ├── High (> 100k users/day) → Classic A/B test (frequentist)
│   ├── Medium → Bayesian A/B test (prior-informed)
│   └── Low (< 10k users/day) → Sequential testing (mSPRT)
├── Number of variants?
│   ├── 2 → A/B test (simplest, highest power)
│   ├── 3-5 → A/B/n with Bonferroni correction
│   └── > 5 → Multi-armed bandit (MAB) with Thompson sampling
├── Metric type?
│   ├── Ratio (revenue/user) → Delta method or bootstrap
│   ├── Binary (conversion) → Chi-squared / Fisher's exact
│   └── Continuous (session time) → t-test / Welch's test
└── CUPED implementation?
    ├── Available pre-experiment data → CUPED (30%+ variance reduction)
    └── No pre-experiment data → Classic frequentist
```

**Decision criteria**: Balance statistical power, traffic allocation, and operational complexity.

## Implementation Patterns

### Frequentist A/B Test Analysis
```python
# experimentation/frequentist_ab_test.py
import numpy as np
from scipy import stats

class ABTestAnalyzer:
    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha

    def analyze_conversion(self, control: np.ndarray, treatment: np.ndarray) -> dict:
        n_c, x_c = len(control), control.sum()
        n_t, x_t = len(treatment), treatment.sum()
        p_c, p_t = x_c / n_c, x_t / n_t
        se = np.sqrt(p_c * (1 - p_c) / n_c + p_t * (1 - p_t) / n_t)
        z = (p_t - p_c) / se
        p_value = 2 * (1 - stats.norm.cdf(abs(z)))
        ci = (p_t - p_c) + np.array([-1, 1]) * stats.norm.ppf(1 - self.alpha / 2) * se
        return {
            "lift": p_t - p_c,
            "relative_lift": (p_t - p_c) / p_c,
            "p_value": p_value,
            "ci_95": ci.tolist(),
            "significant": p_value < self.alpha
        }
```

### Bayesian A/B Test
```python
# experimentation/bayesian_ab_test.py
import pymc as pm

class BayesianABTest:
    def run(self, control: list[int], treatment: list[int]):
        with pm.Model():
            p_c = pm.Beta("p_c", alpha=1, beta=1)
            p_t = pm.Beta("p_t", alpha=1, beta=1)
            obs_c = pm.Binomial("obs_c", n=len(control), p=p_c, observed=sum(control))
            obs_t = pm.Binomial("obs_t", n=len(treatment), p=p_t, observed=sum(treatment))
            lift = pm.Deterministic("lift", p_t - p_c)
            trace = pm.sample(2000, tune=1000)
        prob_lift = (trace["lift"] > 0).mean()
        return {"prob_treatment_winning": float(prob_lift), "trace": trace}
```

## Production Considerations

- **Sample ratio mismatch (SRM)**: Run SRM check (chi-squared) daily; p < 0.01 → investigate.
- **Sequential testing**: Implement mSPRT peeking boundaries; stop early only if boundary crossed.
- **Guardrail metrics**: Define and monitor guardrail metrics with pre-specified thresholds.
- **Experiment logging**: Log all assignment, exposure, and metric events to warehouse for offline analysis.
- **Power analysis**: Pre-compute required sample size; extend experiment if underpowered.
- **Multiple testing correction**: FDR (Benjamini-Hochberg) for secondary metrics; FWER (Bonferroni) for primary.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Peeking without sequential boundaries | Inflated false positive rate | Use mSPRT or fixed-horizon test |
| Ignoring SRM check | Invalid experiment results | Daily SRM check, stop experiment if failing |
| Analyzing all users (not just exposed) | Diluted treatment effect | Filter to exposed users by assignment |
| Multiple primary metrics | Cherry-picking significant ones | Pre-register single primary metric |
| Novelty effect bias | Early positive effect reverses | Run for minimum 2 full business cycles |

## Performance Optimization

- **CUPED**: Apply CUPED when pre-experiment metric correlation > 0.5; can reduce required sample size by 30%.
- **Stratified randomization**: Stratify by known high-variance dimensions (country, device) for variance reduction.
- **Delta method**: Use delta method for ratio metrics (revenue/user) instead of bootstrapping for speed.
- **Power analysis automation**: Automate sample size estimation in CI; flag underpowered experiments early.
- **Bayesian acceleration**: Use conjugate priors (Beta-Binomial, Normal-Normal) instead of MCMC for speed.

## Security Considerations

- **Unbiased assignment**: Ensure experiment assignment is deterministic and unforgeable (HMAC-signed user IDs).
- **Data privacy**: Strip PII from experiment logs; use anonymized user IDs in analysis datasets.
- **Access control**: Restrict experiment creation and analysis to authorized team members; audit all changes.
- **Guardrail thresholds**: Pre-specify guardrail metric thresholds; auto-stop experiment if guardrails breached.
- **Reproducibility**: Version all experiment configurations and analysis code; archive for 2 years for compliance.

## Handoff
`analytics-engineering` for downstream metric pipeline
`ml-modeling` for model-based personalization experiments
