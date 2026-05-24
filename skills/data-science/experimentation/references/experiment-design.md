# Experiment Design Reference

## Randomization

### Randomization Units
```
User-level    → most common, stable unit identity
Session-level → for session-scoped features
Device-level  → when feature tied to device
Event-level   → risky — SUTVA violation likely (same unit sees both variants)
Account-level → SaaS, multi-user accounts
```

### Assignment Mechanisms
```python
import hashlib, numpy as np

def deterministic_assignment(unit_id, experiment_id, n_variants=2):
    """Deterministic hash-based assignment. Same unit always gets same variant."""
    key = f"{experiment_id}:{unit_id}"
    hash_hex = hashlib.md5(key.encode()).hexdigest()
    hash_int = int(hash_hex, 16)
    return hash_int % n_variants

def stratified_assignment(unit_id, experiment_id, strata, traffic_pct=0.5):
    """Randomize within strata to ensure balanced representation."""
    key = f"{experiment_id}:{unit_id}:{strata}"
    hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16) / 2**128
    return "treatment" if hash_val < traffic_pct else "control"
```

### SUTVA Assumption
Stable Unit Treatment Value Assumption:
- No interference between units (treatment of one doesn't affect another)
- No hidden variation of treatment (same treatment for all)

Network effects, marketplaces, and social features violate SUTVA. Solutions: cluster randomization, network exposure models.

## Control Groups

### Standard Control
No treatment, same process as treatment group. Enables counterfactual estimation.

### Negative Control
Population known to be unaffected by treatment (placebo test). If significant effect found → systematic bias.

### Holdout Group
Permanent control group, never receives treatment. Used for long-term effects and cumulative impact measurement.

### A/A Test
```python
def aa_test(data, n_simulations=1000):
    """Split control into two groups, verify no statistically significant difference."""
    half = len(data) // 2
    results = []
    for _ in range(n_simulations):
        np.random.shuffle(data)
        a, b = data[:half], data[half:]
        _, p = stats.ttest_ind(a, b)
        results.append(p)
    false_positive_rate = np.mean([p < 0.05 for p in results])
    # Should be ≈ 0.05 (within margin of simulation error)
    return false_positive_rate
```

## Sample Size Calculation

### Proportion Metric
```python
from scipy import stats

def sample_size_proportion(baseline, mde, alpha=0.05, power=0.8, alternative="two-sided"):
    p1 = baseline
    p2 = baseline * (1 + mde)
    p_pooled = (p1 + p2) / 2
    z_alpha = stats.norm.ppf(1 - alpha/2) if alternative == "two-sided" else stats.norm.ppf(1 - alpha)
    z_beta = stats.norm.ppf(power)
    n = (z_alpha * np.sqrt(2 * p_pooled * (1 - p_pooled)) +
         z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2)))**2 / (p2 - p1)**2
    return int(np.ceil(n))
```

### Continuous Metric
```python
def sample_size_continuous(mean, std, mde_absolute, alpha=0.05, power=0.8):
    # mde_absolute = minimum detectable effect in original units
    delta = mde_absolute
    z_alpha = stats.norm.ppf(1 - alpha/2)
    z_beta = stats.norm.ppf(power)
    n = 2 * (z_alpha + z_beta)**2 * std**2 / delta**2
    return int(np.ceil(n))
```

### Minimum Detectable Effect
```
MDE = (z_α/2 + z_β) * √(2σ²/n)   # Two-sample, equal n, two-sided
MDE decreases as n increases
```

### Experiment Duration
```python
def required_duration(n_per_variant, daily_traffic_per_variant):
    days = np.ceil(n_per_variant / daily_traffic_per_variant)
    # Account for day-of-week effects (7+ days minimum)
    return max(days, 7)
```

## Stratification

Stratified sampling: divide population into homogeneous strata, randomize within each.

```python
def stratified_sample(df, strata_col, treatment_col, seed=42):
    """Stratified split ensuring equal treatment/control within each stratum."""
    np.random.seed(seed)
    df["assignment"] = np.nan
    for stratum in df[strata_col].unique():
        mask = df[strata_col] == stratum
        idx = df[mask].index
        n = len(idx)
        n_treatment = n // 2
        treatment_idx = np.random.choice(idx, n_treatment, replace=False)
        df.loc[treatment_idx, "assignment"] = "treatment"
        df.loc[df["assignment"].isna() & mask, "assignment"] = "control"
    return df
```

Benefits: reduces variance of treatment effect estimator, ensures balance on important covariates, improves power. Common strata: country, device type, user segment, browser.

## Blocking

Similar to stratification but treats strata as blocks and randomizes within block. Key difference: blocking is for nuisance factors (design control), stratification is for precision.

```python
import random

def block_randomize(units, blocks, seed=42):
    """Randomize treatment within each block."""
    random.seed(seed)
    assignments = {}
    for block in set(blocks.values()):
        block_units = [u for u, b in blocks.items() if b == block]
        random.shuffle(block_units)
        mid = len(block_units) // 2
        for u in block_units[:mid]:
            assignments[u] = "treatment"
        for u in block_units[mid:]:
            assignments[u] = "control"
    return assignments
```

## Factorial Designs

### 2×2 Factorial Design
Two factors, each with two levels. Tests main effects and interaction.

```
              Factor B Off    Factor B On
Factor A Off   Control        B only
Factor A On    A only         A + B
```

```python
import statsmodels.api as sm
from statsmodels.formula.api import ols

def analyze_factorial(df, outcome, factor_a, factor_b):
    model = ols(f"{outcome} ~ C({factor_a}) * C({factor_b})", data=df).fit()
    # Main effects: C(factor_a), C(factor_b)
    # Interaction: C(factor_a):C(factor_b)
    anova = sm.stats.anova_lm(model, typ=2)
    return model, anova
```

Fractional factorial designs: run subset of all combinations when full factorial is too expensive. Aliasing structure must be understood.

## A/A Tests

Validate experiment infrastructure before running real experiments.

### What A/A Tests Detect
- Systematic bias in assignment algorithm
- Metric distribution differences (should be identical under null)
- Type I error rate inflation
- Data pipeline errors
- SRM (Sample Ratio Mismatch): chi-square test on assignment counts

```python
def srm_check(control_count, treatment_count, expected_ratio=0.5):
    """Sample Ratio Mismatch test."""
    n = control_count + treatment_count
    expected_control = n * expected_ratio
    expected_treatment = n * (1 - expected_ratio)
    chi2 = ((control_count - expected_control)**2 / expected_control +
            (treatment_count - expected_treatment)**2 / expected_treatment)
    p = stats.chi2.sf(chi2, 1)
    return {"chi2": chi2, "p": p, "srm": p < 0.05}
```

### A/A Test Power
Run multiple A/A tests (100+). Count false positives at α=0.05. Expected: 5% false positive rate. Binomial CI on false positive rate should contain 0.05.

## Pre-Registration

Document before experiment starts:
```
- Primary hypothesis and key secondary hypotheses
- Primary metric and secondary metrics
- Randomization unit
- Sample size and power justification
- Analysis method (frequentist/Bayesian, test, corrections)
- Stopping rules
- Exclusions criteria (users, sessions, outliers)
- Stratification variables
```

## Novelty and Primacy Effects

### Novelty Effect
Treatment effect decays as users become familiar with the feature. Longer duration needed.

### Primacy Effect
Treatment effect increases as users learn the feature. Longer duration needed.

### Mitigation
```python
def exclude_preriod(data, hours=24):
    """Exclude first N hours to mitigate novelty/primacy effects."""
    cutoff = data["timestamp"].min() + pd.Timedelta(hours=hours)
    return data[data["timestamp"] >= cutoff]

def time_trend_check(data, metric, timestamp):
    """Plot metric over time for treatment and control."""
    daily = data.groupby([pd.Grouper(key=timestamp, freq='D'), "variant"])[metric].mean()
    # Treatment effect should be stable over time
    # Converging → novelty, diverging → primacy, stable → true effect
```

## Experiment Design Checklist
```
☐ Randomization unit defined and appropriate
☐ SUTVA assumption holds (no interference)
☐ Sample size calculated with power analysis
☐ Experiment duration ≥ 7 days (full week cycle)
☐ Stratification variables identified
☐ A/A test validates infrastructure
☐ Multiple testing corrections planned
☐ Novelty/primacy effects considered
☐ Pre-registration document created
☐ Guardrail metrics defined
☐ Stopping rules pre-specified
```
