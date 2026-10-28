# Advanced Statistical Analysis: Models Beyond OLS, Resampling, Multilevel Data, Power and Robustness

Advanced methods for applied analysis when basic tests and ordinary least squares are not enough: generalized linear models, mixed-effects models for clustered data, robust and quantile regression, bootstrap and permutation inference, multiple comparisons, survival analysis, missing data, and simulation-based power analysis. Fundamentals are in `statistical-analysis-fundamentals.md`; Bayesian methods in `bayesian-methods.md`.

## Generalized Linear Models (GLMs)

| Outcome | Family / link | Example |
|---------|---------------|---------|
| Binary | Binomial / logit | Churned or not |
| Counts | Poisson / log; Negative binomial if overdispersed | Support tickets per account |
| Positive continuous, skewed | Gamma / log | Order value, durations |
| Proportions with known trials | Binomial with weights | Clicks out of impressions |

```python
import numpy as np
import statsmodels.formula.api as smf
import statsmodels.api as sm

m = smf.glm("tickets ~ plan + seats + C(region)", data=df,
            family=sm.families.NegativeBinomial(alpha=1.0), offset=np.log(df["months_active"])).fit()
print(m.summary())
```

- Exponentiated coefficients in log-link models are multiplicative effects (rate ratios, odds ratios).
- Check overdispersion for Poisson (residual deviance much larger than degrees of freedom); estimate the negative binomial dispersion rather than fixing it when possible (`smf.negativebinomial`).
- Use offsets for exposure (time, population).

## Mixed-Effects (Multilevel) Models

Observations clustered within groups (students in schools, sessions within users, repeated measures) violate independence. Options:

| Approach | When |
|----------|------|
| Cluster-robust standard errors | Interest in population-average effect; many clusters |
| Mixed-effects models (random intercepts/slopes) | Model group variation explicitly; partial pooling |
| GEE (generalized estimating equations) | Population-averaged effects for non-normal outcomes |

```python
m = smf.mixedlm("score ~ treatment + baseline", data=df, groups=df["school_id"],
                re_formula="~treatment").fit()
```

In R, `lme4::lmer(score ~ treatment + baseline + (1 + treatment | school_id))`. Few clusters (fewer than roughly 30-50) make cluster-robust errors unreliable; consider wild cluster bootstrap.

## Robust and Quantile Regression

- Heteroscedasticity: use heteroscedasticity-consistent standard errors (`fit(cov_type="HC3")`).
- Outliers: Huber or Tukey M-estimators (`sm.RLM`), or transform the outcome with care.
- Quantile regression models effects on medians or tails (e.g. p90 latency), not just the mean:

```python
q90 = smf.quantreg("latency_ms ~ cache_enabled + payload_kb", df).fit(q=0.9)
```

## Resampling Inference

Bootstrap for confidence intervals when analytic formulas are awkward (medians, ratios, complex estimators):

```python
import numpy as np
rng = np.random.default_rng(42)

def bootstrap_ci(x: np.ndarray, stat=np.median, B: int = 10_000, alpha: float = 0.05):
    boots = np.array([stat(rng.choice(x, size=x.size, replace=True)) for _ in range(B)])
    return np.quantile(boots, [alpha / 2, 1 - alpha / 2])
```

- Resample the independent unit (users, clusters), not individual rows within them.
- BCa intervals (`scipy.stats.bootstrap(method="BCa")`) correct bias and skewness.
- Permutation tests give exact-style p-values under the null of exchangeability: shuffle labels, recompute the statistic, compare.

## Multiple Comparisons

| Method | Controls | Use |
|--------|----------|-----|
| Bonferroni | Family-wise error rate | Few confirmatory tests |
| Holm | FWER, more powerful than Bonferroni | Default FWER choice |
| Benjamini-Hochberg | False discovery rate | Many exploratory tests (genes, segments, metrics) |

```python
from statsmodels.stats.multitest import multipletests
reject, p_adj, _, _ = multipletests(pvals, alpha=0.05, method="fdr_bh")
```

## Survival (Time-to-Event) Analysis

For durations with censoring (churn time, time to failure):
- Kaplan-Meier curves for survival estimates; log-rank test to compare groups.
- Cox proportional hazards for covariate effects (hazard ratios); check the proportional hazards assumption (Schoenfeld residuals).
- Python: `lifelines` (`KaplanMeierFitter`, `CoxPHFitter`); R: `survival`.

Treating censored users as "not churned" or dropping them biases results.

## Missing Data

| Mechanism | Meaning | Implication |
|-----------|---------|-------------|
| MCAR | Missingness unrelated to anything | Complete-case analysis unbiased but less efficient |
| MAR | Depends on observed variables | Multiple imputation or likelihood methods valid |
| MNAR | Depends on unobserved values | Requires sensitivity analysis or modeling the mechanism |

Multiple imputation (e.g. MICE: `statsmodels.imputation.mice`, R `mice`) creates several completed datasets and pools estimates with Rubin's rules. Single mean imputation understates variance.

## Power Analysis by Simulation

When designs are complex (clustered, GLMs, unequal allocation), simulate:

```python
def simulated_power(n_clusters, per_cluster, effect, icc, sims=1000, alpha=0.05):
    hits = 0
    for _ in range(sims):
        df = simulate_clustered(n_clusters, per_cluster, effect, icc, rng)
        p = smf.mixedlm("y ~ treat", df, groups=df["cluster"]).fit().pvalues["treat"]
        hits += p < alpha
    return hits / sims
```

Design effect for cluster randomization: `1 + (m - 1) x ICC`, where m is cluster size; it inflates required sample size.

## Model Diagnostics and Robustness

- Residual plots, leverage and influence (Cook's distance).
- Multicollinearity (variance inflation factors) affects coefficient interpretation, not prediction.
- Specification checks: add plausible covariates, alternative functional forms (splines), and report whether conclusions change.
- Report effect sizes with intervals and practical significance, not only p-values.

## Checklist

- [ ] Model family matches outcome type; overdispersion checked
- [ ] Clustering handled by robust errors, mixed models or GEE
- [ ] Heteroscedasticity-robust or quantile methods where appropriate
- [ ] Resampling at the independent unit level
- [ ] Multiple-comparison correction matched to confirmatory vs exploratory goals
- [ ] Censoring handled with survival methods
- [ ] Missing-data mechanism considered; multiple imputation if MAR
- [ ] Power assessed (simulation for complex designs) before data collection
