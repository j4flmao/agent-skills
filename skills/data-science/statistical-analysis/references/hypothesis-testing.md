# Hypothesis Testing Reference

## Framework

### Null and Alternative Hypotheses
```
H₀: Null hypothesis — no effect, no difference (innocent until proven guilty)
H₁: Alternative hypothesis — there IS an effect/difference (what we want to detect)

Example:
  H₀: μ_treatment = μ_control   (no difference between groups)
  H₁: μ_treatment ≠ μ_control   (two-sided, difference exists)
  H₁: μ_treatment > μ_control   (one-sided, treatment increases mean)
  H₁: μ_treatment < μ_control   (one-sided, treatment decreases mean)
```

One-sided tests have more power but require directional hypothesis pre-specified. Default to two-sided unless strong a priori justification.

### Error Types
```
              H₀ True    H₀ False
Reject H₀     Type I      ✓ (Power)
Fail Reject     ✓        Type II

Type I (α): False positive — rejecting true null
Type II (β): False negative — failing to reject false null
Power = 1 - β: Probability of detecting a true effect

Common α = 0.05, β = 0.20 (power = 0.80)
```

### Decision Framework
```python
def test_decision(p_value, alpha=0.05):
    if p_value < alpha:
        return ["Reject H₀", "Statistically significant evidence for H₁"]
    else:
        return ["Fail to reject H₀", "Insufficient evidence to conclude H₁"]
```

Statistical significance ≠ practical significance. Always report effect size.

## P-Values

### Definition
P-value = P(observed or more extreme test statistic | H₀ is true). The probability of seeing data this extreme if the null hypothesis is true.

### Misconceptions
- Not the probability H₀ is true
- Not the probability the result is due to chance
- Not 1 - probability of replication
- Not the effect size

### Best Practices
```python
def report_p_value(p):
    if p < 0.001:
        return "p < 0.001"
    elif p < 0.01:
        return f"p = {p:.3f}"
    else:
        return f"p = {p:.3f}"
```

Report exact p-values (not just thresholds). Never write "p = 0.000" — use "p < 0.001". Include effect sizes and confidence intervals.

## Parametric Tests

### One-Sample t-test
Tests if sample mean differs from known population mean μ₀.

```python
from scipy import stats

def one_sample_ttest(data, mu_0=0):
    t_stat, p_value = stats.ttest_1samp(data, mu_0)
    n = len(data)
    df = n - 1
    ci = stats.t.interval(0.95, df, loc=np.mean(data), scale=stats.sem(data))
    d = (np.mean(data) - mu_0) / np.std(data, ddof=1)  # Cohen's d
    return {"t": t_stat, "df": df, "p": p_value, "ci": ci, "d": d}
```

Assumptions: independence, normality (robust for n>30), no outliers.

### Independent Two-Sample t-test
```python
def independent_ttest(group1, group2, equal_var=True):
    if equal_var:
        t_stat, p = stats.ttest_ind(group1, group2)
    else:
        t_stat, p = stats.ttest_ind(group1, group2, equal_var=False)  # Welch's
    n1, n2 = len(group1), len(group2)
    df = n1 + n2 - 2
    # Pooled SD for Cohen's d
    sp = np.sqrt(((n1-1)*np.var(group1, ddof=1) + (n2-1)*np.var(group2, ddof=1)) / df)
    d = (np.mean(group1) - np.mean(group2)) / sp
    # Hedges' g (corrected for small samples)
    g = d * (1 - 3/(4*(n1+n2) - 9))
    return {"t": t_stat, "p": p, "d_cohen": d, "g_hedges": g}
```

Welch's t-test does not assume equal variance — use by default. Levene's test can check variance equality.

### Paired t-test
```python
def paired_ttest(before, after):
    t_stat, p = stats.ttest_rel(before, after)
    n = len(before)
    diff = np.array(after) - np.array(before)
    d = np.mean(diff) / np.std(diff, ddof=1)  # Dz
    ci = stats.t.interval(0.95, n-1, loc=np.mean(diff), scale=stats.sem(diff))
    return {"t": t_stat, "df": n-1, "p": p, "d_z": d, "ci_diff": ci}
```

More powerful than independent when paired (same subject measured twice). Assumes normality of differences.

### ANOVA (One-Way)
```python
def one_way_anova(*groups):
    f_stat, p = stats.f_oneway(*groups)
    n_total = sum(len(g) for g in groups)
    k = len(groups)
    grand_mean = np.mean(np.concatenate(groups))
    ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)
    ss_within = sum(sum((x - np.mean(g))**2 for x in g) for g in groups)
    ss_total = ss_between + ss_within
    eta_sq = ss_between / ss_total
    omega_sq = (ss_between - (k-1) * (ss_within / (n_total - k))) / (ss_total + ss_within / (n_total - k))
    return {"F": f_stat, "df1": k-1, "df2": n_total-k, "p": p,
            "eta_sq": eta_sq, "omega_sq": omega_sq}
```

Post-hoc tests (Tukey HSD, Bonferroni) after significant ANOVA:
```python
from statsmodels.stats.multicomp import pairwise_tukeyhsd
tukey = pairwise_tukeyhsd(all_data, group_labels, alpha=0.05)
```

### Two-Way ANOVA
```python
import statsmodels.api as sm
from statsmodels.formula.api import ols

model = ols("value ~ C(factor_a) * C(factor_b)", data=df).fit()
anova_table = sm.stats.anova_lm(model, typ=2)
# typ=2: type II SS (tests main effects after removing other main effects)
# typ=3: type III SS (tests each effect after all others, requires orthogonal coding)
```

## Non-Parametric Tests

### Mann-Whitney U (Wilcoxon Rank-Sum)
Alternative to independent t-test. Tests if one group tends to have larger values.

```python
u_stat, p = stats.mannwhitneyu(group1, group2, alternative="two-sided")

# Effect size: rank-biserial correlation
n1, n2 = len(group1), len(group2)
r = 1 - 2 * u_stat / (n1 * n2)
```

### Wilcoxon Signed-Rank
Alternative to paired t-test.

```python
w_stat, p = stats.wilcoxon(before, after)
```

### Kruskal-Wallis H
Alternative to one-way ANOVA.

```python
h_stat, p = stats.kruskal(*groups)
```

### Chi-Square Test of Independence
```python
def chi_square_test(observed, correction=True):
    chi2, p, dof, expected = stats.chi2_contingency(observed, correction=correction)
    n = observed.sum()
    # Effect sizes
    phi2 = chi2 / n
    r, k = observed.shape
    cramer_v = np.sqrt(phi2 / min(k-1, r-1))
    # Contingency coefficient
    cc = np.sqrt(chi2 / (chi2 + n))
    return {"chi2": chi2, "df": dof, "p": p, "cramer_v": cramer_v, "cc": cc}
```

Expected cell counts should be ≥5 (Fisher's exact test for smaller samples).

## Power Analysis

```python
from scipy.stats import nct, ncf, ncx2, norm

def power_ttest(n, effect_size, alpha=0.05, alternative="two-sided"):
    df = 2 * n - 2
    if alternative == "two-sided":
        t_crit = stats.t.ppf(1 - alpha/2, df)
        power = 1 - nct.cdf(t_crit, df, effect_size * np.sqrt(n/2)) + \
                nct.cdf(-t_crit, df, effect_size * np.sqrt(n/2))
    else:
        t_crit = stats.t.ppf(1 - alpha, df)
        power = 1 - nct.cdf(t_crit, df, effect_size * np.sqrt(n/2))
    return power

def sample_size(power=0.8, effect_size=0.5, alpha=0.05, ratio=1):
    n = 10
    while power_ttest(n, effect_size, alpha) < power:
        n += 1
    # Adjust for unequal groups
    n1 = int(np.ceil(n * 2 * ratio / (1 + ratio)))
    n2 = int(np.ceil(n * 2 / (1 + ratio)))
    return {"n_total": n1 + n2, "n1": n1, "n2": n2}
```

### Factors Affecting Power
- Effect size ↑ → Power ↑
- Sample size ↑ → Power ↑
- Alpha ↑ → Power ↑
- Variance ↓ → Power ↑
- One-sided test ↑ → Power ↑

## Multiple Testing Correction

### Bonferroni
```python
def bonferroni(p_values, alpha=0.05):
    m = len(p_values)
    adjusted = [min(p * m, 1.0) for p in p_values]
    rejected = [a < alpha for a in adjusted]
    return adjusted, rejected
```

Most conservative. Controls FWER. Use when few tests and false positives are costly.

### Benjamini-Hochberg (FDR)
```python
def benjamini_hochberg(p_values, alpha=0.05):
    m = len(p_values)
    sorted_idx = np.argsort(p_values)
    sorted_p = np.array(p_values)[sorted_idx]
    thresholds = (np.arange(1, m+1) / m) * alpha
    # Find largest k where p_k <= threshold_k
    rejections = np.where(sorted_p <= thresholds)[0]
    max_k = rejections[-1] if len(rejections) > 0 else -1
    rejected = np.zeros(m, dtype=bool)
    rejected[sorted_idx[:max_k+1]] = True
    return rejected
```

Less conservative. Controls FDR. Use for many tests (e.g., genomics, multiple metrics).

### Holm-Bonferroni
```python
def holm_bonferroni(p_values, alpha=0.05):
    m = len(p_values)
    sorted_idx = np.argsort(p_values)
    sorted_p = np.array(p_values)[sorted_idx]
    rejected = np.zeros(m, dtype=bool)
    for i, p in enumerate(sorted_p):
        if p < alpha / (m - i):
            rejected[sorted_idx[i]] = True
        else:
            break
    return rejected
```

More powerful than Bonferroni, same FWER control.

## Effect Size Interpretation

| Test | Effect Size | Small | Medium | Large |
|------|-------------|-------|--------|-------|
| t-test | Cohen's d | 0.2 | 0.5 | 0.8 |
| ANOVA | η² | 0.01 | 0.06 | 0.14 |
| Chi-square | Cramer's V (df=1) | 0.10 | 0.30 | 0.50 |
| Chi-square | Cramer's V (df=2) | 0.07 | 0.21 | 0.35 |
| Correlation | Pearson r | 0.10 | 0.30 | 0.50 |

## Test Selection Flowchart
```
1 outcome variable:
  Continuous, normal, independent groups → t-test / ANOVA
  Continuous, non-normal, independent groups → Mann-Whitney / Kruskal-Wallis
  Continuous, paired → Paired t-test / Wilcoxon Signed-Rank
  Binary → Chi-square / Fisher's exact / proportion z-test
  Count (discrete) → Poisson / Negative binomial regression
  Time-to-event → Log-rank test / Cox regression
  Ordinal → Mann-Whitney / Ordinal logistic regression

2+ outcome variables:
  MANOVA (multivariate normal)
  Mixed models (repeated measures)
  Multiple comparison correction
```
