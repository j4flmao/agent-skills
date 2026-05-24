---
name: data-science-statistical-analysis
description: >
  Use this skill when asked about statistical analysis, descriptive statistics, hypothesis testing, Bayesian methods, regression analysis, A/B testing statistics, power analysis, confidence intervals, p-values, t-tests, chi-square tests, ANOVA, effect size, sample size calculation, or statistical modeling. This skill enforces: descriptive statistics (central tendency, dispersion, distribution shapes, outliers), hypothesis testing (null/alternative, p-values, significance levels, parametric vs non-parametric), Bayesian methods (Bayes theorem, priors/posteriors, MCMC, credible intervals), and regression analysis (linear, logistic, assumptions, diagnostics, regularization). Do NOT use for: machine learning model training (use ML skills), experiment design (use experimentation skill), or causal inference (use causal-inference skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data-science, statistics, analysis, phase-7]
---

# Statistical Analysis

## Purpose
Provide foundational statistical analysis capabilities covering descriptive statistics (mean, median, mode, variance, standard deviation, IQR, distribution shapes, outlier detection), hypothesis testing (null/alternative hypotheses, p-values, significance levels, t-tests, chi-square, ANOVA, parametric vs non-parametric, power analysis), Bayesian methods (Bayes theorem, priors/posteriors, conjugate priors, MCMC, Bayesian A/B testing, credible intervals), and regression analysis (linear regression, logistic regression, assumptions, diagnostics, regularization techniques).

## Agent Protocol

### Trigger
Exact user phrases: "statistical analysis", "descriptive statistics", "hypothesis test", "p-value", "t-test", "chi-square", "ANOVA", "Bayesian", "posterior", "prior", "MCMC", "regression analysis", "linear regression", "logistic regression", "power analysis", "sample size calculation", "effect size", "confidence interval", "credible interval", "statistical significance", "correlation", "covariance", "normality test", "homoscedasticity", "multicollinearity", "VIF", "regularization", "ridge regression", "lasso", "elastic net".

### Input Context
Before activating, verify:
- Data structure (numeric, categorical, time series, survival)
- Sample size and dimensionality
- Analysis goal (description, inference, prediction, causal)
- Assumptions about data generating process
- Domain constraints (clinical, financial, web analytics)
- Regulatory requirements (p-value reporting, multiplicity correction)

### Output Artifact
Statistical analysis report with methodology justification, assumption checks, test results, effect sizes, visualizations, and actionable conclusions.

### Response Format
```python
# Python code for analysis
```
```r
# R code for analysis
```
```text
# Results: test statistic, p-value, effect size, CI
# Interpretation with practical significance
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data explored with descriptive statistics and visualizations
- [ ] Distribution shape and assumptions verified
- [ ] Appropriate statistical test selected and justified
- [ ] Effect size and practical significance reported alongside p-values
- [ ] Model diagnostics performed (residuals, multicollinearity, influence)
- [ ] Results interpreted in domain context
- [ ] Limitations and potential confounds documented
- [ ] Reproducible analysis code or configuration produced

### Max Response Length
400 lines of code and output.

## Workflow

### Step 1: Exploratory Data Analysis
Compute descriptive statistics for all variables.

Central tendency: mean for symmetric, median for skewed.
Dispersion: SD for symmetric, IQR for skewed.
Shape: skewness, kurtosis, quantile-quantile plots.

```python
import numpy as np, pandas as pd, scipy.stats as stats

def describe(df, col):
    data = df[col].dropna()
    return {
        "n": len(data), "missing": df[col].isna().sum(),
        "mean": np.mean(data), "median": np.median(data),
        "std": np.std(data, ddof=1),
        "iqr": np.percentile(data, 75) - np.percentile(data, 25),
        "skew": stats.skew(data), "kurtosis": stats.kurtosis(data, fisher=True),
        "min": np.min(data), "max": np.max(data),
        "q1": np.percentile(data, 25), "q3": np.percentile(data, 75)
    }
```

### Step 2: Assumption Checking
Before hypothesis tests or regression, verify assumptions.

Normality: Shapiro-Wilk for n<5000, Kolmogorov-Smirnov otherwise.
Homoscedasticity: Levene's test, Breusch-Pagan for regression.
Independence: Durbin-Watson for time series, design check for experiments.
Linearity: scatterplot matrix, partial regression plots.

```python
def normality_check(data):
    if len(data) < 5000:
        stat, p = stats.shapiro(data)
        test = "Shapiro-Wilk"
    else:
        stat, p = stats.kstest(data, "norm", args=(np.mean(data), np.std(data, ddof=1)))
        test = "Kolmogorov-Smirnov"
    return {"test": test, "statistic": stat, "p_value": p, "normal": p > 0.05}
```

### Step 3: Hypothesis Testing
Select test based on data type and question.

| Question | Predictor | Outcome | Test |
|----------|-----------|---------|------|
| Difference between 2 groups | Binary | Continuous | Independent t-test |
| Difference between 2 paired | Binary paired | Continuous | Paired t-test |
| Difference between 3+ groups | Categorical | Continuous | ANOVA |
| Association | Categorical | Categorical | Chi-square |
| Correlation | Continuous | Continuous | Pearson/Spearman |
| Difference from reference | None | Continuous | One-sample t-test |
| Rank difference | Binary | Ordinal | Mann-Whitney U |

```python
def two_sample_test(group1, group2, paired=False, equal_var=True):
    if paired:
        stat, p = stats.ttest_rel(group1, group2)
        test = "Paired t-test"
    elif equal_var:
        stat, p = stats.ttest_ind(group1, group2)
        test = "Independent t-test (equal var)"
    else:
        stat, p = stats.ttest_ind(group1, group2, equal_var=False)
        test = "Welch's t-test"
    # Effect size: Cohen's d
    n1, n2 = len(group1), len(group2)
    s1, s2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
    sp = np.sqrt(((n1-1)*s1 + (n2-1)*s2) / (n1+n2-2))
    d = (np.mean(group1) - np.mean(group2)) / sp
    return {"test": test, "statistic": stat, "p_value": p,
            "effect_size": d, "effect_label": cohens_d_label(d)}

def cohens_d_label(d):
    if abs(d) < 0.2: return "negligible"
    if abs(d) < 0.5: return "small"
    if abs(d) < 0.8: return "medium"
    return "large"
```

### Step 4: ANOVA
```python
def anova_analysis(groups):
    f_stat, p_value = stats.f_oneway(*groups)
    # Effect size: eta-squared
    ss_between = sum(len(g)*(np.mean(g)-np.mean(np.concatenate(groups)))**2 for g in groups)
    ss_total = sum(sum((x-np.mean(np.concatenate(groups)))**2 for x in g) for g in groups)
    eta_sq = ss_between / ss_total
    return {"test": "One-way ANOVA", "F": f_stat, "p_value": p_value,
            "eta_squared": eta_sq, "df": (len(groups)-1, sum(len(g) for g in groups)-len(groups))}
```

### Step 5: Chi-square Test
```python
def chi_square_test(contingency_table):
    chi2, p, dof, expected = stats.chi2_contingency(contingency_table)
    n = contingency_table.sum()
    # Cramer's V
    phi2 = chi2 / n
    r, k = contingency_table.shape
    v = np.sqrt(phi2 / min(k-1, r-1))
    return {"chi2": chi2, "p_value": p, "dof": dof,
            "cramers_v": v, "expected": expected}
```

### Step 6: Power Analysis
```python
from scipy.stats import nct, ncf, ncx2

def power_t_test(d, n, alpha=0.05, alternative="two-sided"):
    df = n - 1
    t_crit = stats.t.ppf(1 - alpha/2, df) if alternative == "two-sided" else stats.t.ppf(1 - alpha, df)
    ncp = d * np.sqrt(n)
    power = 1 - nct.cdf(t_crit, df, ncp) + (nct.cdf(-t_crit, df, ncp) if alternative == "two-sided" else 0)
    return power

def sample_size_from_power(d, power=0.8, alpha=0.05, alternative="two-sided"):
    n = 10
    while power_t_test(d, n, alpha, alternative) < power:
        n += 1
    return n
```

### Step 7: Regression Analysis
```python
import statsmodels.api as sm

def linear_regression(X, y):
    X = sm.add_constant(X)
    model = sm.OLS(y, X).fit()
    return {
        "coefs": model.params,
        "p_values": model.pvalues,
        "r_squared": model.rsquared,
        "adj_r_squared": model.rsquared_adj,
        "f_stat": model.fvalue, "f_p": model.f_pvalue,
        "aic": model.aic, "bic": model.bic,
        "residuals": model.resid,
        "diagnostics": {
            "omnibus": model.diagn.get("omnibus"),
            "jb": model.diagn.get("jarque_bera"),
            "dw": model.diagn.get("dw"),
            "breusch_pagan_p": model.diagn.get("bp_pvalue"),
        }
    }
```

### Step 8: Regularization
```python
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

def regularized_regression(X, y, alpha=1.0, l1_ratio=0.5):
    models = {
        "ridge": Ridge(alpha=alpha),
        "lasso": Lasso(alpha=alpha),
        "elastic_net": ElasticNet(alpha=alpha, l1_ratio=l1_ratio)
    }
    results = {}
    for name, model in models.items():
        pipe = Pipeline([("scaler", StandardScaler()), ("model", model)])
        pipe.fit(X, y)
        results[name] = {
            "coefs": pipe.named_steps["model"].coef_,
            "intercept": pipe.named_steps["model"].intercept_,
            "n_features_used": np.sum(pipe.named_steps["model"].coef_ != 0)
        }
    return results
```

### Step 9: Bayesian Estimation
```python
import pymc as pm

def bayesian_linear_regression(X, y, draws=2000):
    with pm.Model() as model:
        alpha = pm.Normal("alpha", mu=0, sigma=10)
        beta = pm.Normal("beta", mu=0, sigma=5, shape=X.shape[1])
        sigma = pm.HalfNormal("sigma", sigma=5)
        mu = alpha + pm.math.dot(X, beta)
        likelihood = pm.Normal("y", mu=mu, sigma=sigma, observed=y)
        trace = pm.sample(draws=draws, tune=1000, chains=4, target_accept=0.95)
    return trace
```

## Rules
- Always report effect size and confidence intervals alongside p-values
- Verify normality before parametric tests; use non-parametric alternatives when violated
- Check for multiple comparisons and apply correction (Bonferroni, FDR)
- Regression requires residual diagnostics (normality, homoscedasticity, independence)
- Never dichotomize continuous variables without strong justification
- Report exact p-values (not just p<0.05) for transparency
- Document all assumption checks and violations
- Prefer Bayesian methods when prior information is available
- Use Welch's t-test by default (do not assume equal variance)
- Sample size must be justified with power analysis for inferential studies

## References
- `references/descriptive-stats.md` — Central tendency, dispersion, distribution shapes, outliers, visualization
- `references/hypothesis-testing.md` — Null/alternative, p-values, t-tests, chi-square, ANOVA, power analysis
- `references/bayesian-methods.md` — Bayes theorem, priors/posteriors, MCMC, Bayesian A/B testing
- `references/regression-analysis.md` — Linear/logistic regression, assumptions, diagnostics, regularization

## Handoff
`data-science-experimentation` for experiment design and A/B testing
`data-science-causal-inference` for causal effect estimation
`data-science-analytics-engineering` for production analytics pipelines
