---
name: data-science-statistical-analysis
description: >
  Use this skill when performing statistical analysis, hypothesis testing, regression analysis, time series forecasting, Bayesian inference, descriptive statistics, data exploration, or any general statistical modeling. This skill enforces: proper data exploration before modeling, assumption checking, effect size reporting, confidence intervals alongside p-values, robust methods when assumptions violated, and reproducible analysis workflows. Do NOT use for: A/B testing (see experimentation skill), causal inference (see causal-inference skill), or ML model building.
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
Perform rigorous statistical analysis: descriptive statistics, hypothesis testing, regression, time series, Bayesian inference, and reproducible reporting.

## Agent Protocol

### Trigger
Exact user phrases: "statistical analysis", "hypothesis test", "t-test", "ANOVA", "chi-square", "regression", "linear regression", "logistic regression", "time series", "ARIMA", "forecast", "Bayesian", "confidence interval", "p-value", "effect size", "power analysis", "data exploration", "descriptive statistics", "correlation", "outlier detection".

### Input Context
- Analysis goal (exploration, inference, prediction, forecasting)
- Data structure (rows, columns, types, missingness)
- Question to answer: what decision depends on this analysis?
- Assumptions about data (independence, distribution, measurement scale)
- Audience: technical or business stakeholders
- Reproducibility requirements (notebook, script, report)

### Output Artifact
Statistical analysis results with interpretation, assumptions checked, and business implications.

### Response Format
```
## Analysis Summary
Question: {what was asked}
Data: {N rows, N features, time period}
Method: {test/model, software, parameters}
Results: {estimate, CI, p-value, effect size}
Assumptions Checked: {normality, independence, homoscedasticity}
Interpretation: {what the result means}
Business Implication: {what to do about it}
```

### Completion Criteria
- [ ] Data explored and cleaned (missingness, outliers, distributions)
- [ ] Appropriate test/model selected based on data and question
- [ ] Assumptions checked and violations addressed
- [ ] Results reported with effect size and confidence interval
- [ ] Interpretation translated to business context
- [ ] Reproducible code/notebook provided

## Workflow

### Step 1: Data Exploration
Summarize data: shape, types, missing values, summary statistics. Visualize: univariate distributions (histograms, box plots), bivariate relationships (scatter plots, correlation heatmaps), multivariate structure (pair plots, PCA). Check data quality: range violations, duplicates, logical inconsistencies, timestamp ordering.

### Step 2: Question Mapping

#### Question Types
| Question Type | Statistical Approach | Example |
|---|---|---|
| Comparison | Hypothesis test (t-test, chi-square, ANOVA) | Is revenue different between groups? |
| Association | Correlation, regression | Does ad spend predict sales? |
| Prediction | Regression, time series forecast | What will next quarter's revenue be? |
| Classification | Logistic regression, discriminant analysis | Will this customer churn? |
| Clustering | K-means, hierarchical, DBSCAN | What customer segments exist? |
| Dimensionality reduction | PCA, t-SNE, UMAP | What are the key drivers of variation? |

#### Question Refinement
Map vague business question to statistical formulation. "Are we doing better?" → "Is the mean conversion rate in period B higher than period A?" or "Is the trend slope positive and significant?"

### Step 3: Model Selection

#### Method Selection Decision Tree
```
Data type of outcome (Y)?
├── Continuous (revenue, time, score)
│   ├── Normally distributed → Linear regression, t-test, ANOVA
│   ├── Skewed-positive → Log-transform + linear, or Gamma GLM
│   └── Bounded [0,1] → Beta regression, logit transform
├── Binary (converted, churned, clicked)
│   ├── Logistic regression (logit link)
│   └── Probit regression (normal CDF link)
├── Count (sessions, purchases, errors)
│   ├── Equidispersed → Poisson regression
│   └── Overdispersed → Negative binomial, quasi-Poisson
├── Ordinal (rating 1-5, tier A-B-C)
│   ├── Ordered logit (proportional odds)
│   └── Ordered probit
├── Categorical (brand choice, region)
│   ├── Multinomial logistic regression
│   └── Discriminant analysis
└── Time-to-event (survival, churn time)
    ├── Cox proportional hazards
    └── Kaplan-Meier + log-rank test
```

### Step 4: Assumption Checking

#### Key Assumptions by Method

| Method | Assumptions | Diagnostic |
|---|---|---|
| t-test | Normality, independence, equal variance | Shapiro-Wilk, Levene's test, Q-Q plot |
| Linear regression | Linearity, independence, homoscedasticity, normality | Residuals vs fitted, Q-Q plot, Breusch-Pagan, Durbin-Watson |
| Logistic regression | Linearity of logit, independence, no multicollinearity | Box-Tidwell test, VIF, residual deviance |
| ANOVA | Normality, independence, equal variance | Shapiro-Wilk, Levene's, residual plot |
| Poisson regression | Mean = variance (equidispersion) | Dispersion parameter, Pearson chi-square |

#### Handling Violations
Non-normal data: transform (log, Box-Cox, Yeo-Johnson) or use non-parametric alternative. Heteroscedasticity: use robust standard errors (HC0-HC4, Huber-White). Non-independence: use mixed effects models, clustered standard errors, or GEE. Outliers: robust regression (Huber, quantile), or trimmed estimators.

### Step 5: Analysis and Reporting

#### Complete Report Structure
1. Question: what was asked and why
2. Data description: source, sample size, time period, preprocessing
3. Exploratory analysis: relevant visualizations and summary statistics
4. Model specification: chosen method, formula, assumptions
5. Results: estimate, SE, CI, test statistic, p-value, effect size
6. Diagnostics: assumption checks, sensitivity analysis
7. Interpretation: what the result means in business terms
8. Limitations: what could affect validity of conclusions

#### Reporting Best Practices
Round appropriately (2-3 significant digits for estimates). Use consistent terminology. State both statistical and practical significance. Include visualizations for key findings. Report uncertainty (CIs, prediction intervals) not just point estimates.

### Step 6: Effect Sizes

| Test | Effect Size | Interpretation |
|---|---|---|
| t-test (independent) | Cohen's d = (M1-M2)/SD_pooled | 0.2=small, 0.5=medium, 0.8=large |
| t-test (paired) | d_z = t/√n | Same scale |
| ANOVA | η² = SS_effect/SS_total | 0.01=small, 0.06=medium, 0.14=large |
| Chi-square | Cramér's V = √(χ²/(n×(k-1))) | 0.1=small, 0.3=medium, 0.5=large |
| Correlation | r | 0.1=small, 0.3=medium, 0.5=large |
| Regression | R², f² = R²/(1-R²) | 0.02=small, 0.15=medium, 0.35=large |

### Step 7: Reproducibility

#### Workflow Requirements
Script everything: analysis is code, not manual operations. Version control: analysis code + processed data. Dependency management: pinned package versions. Seed random generators for replicable sampling. Output pinning: save processed data and results.

#### Documentation
Document data sources and extraction queries. Document inclusion/exclusion criteria and filtering steps. Describe handling of missing data, outliers, and transformations. Justify modeling decisions.

## Decision Trees

### Hypothesis Test Selection
```
How many groups?
├── One group
│   ├── Compare to known value → One-sample t-test
│   └── Compare to distribution → Kolmogorov-Smirnov
├── Two groups
│   ├── Independent → Two-sample t-test or Mann-Whitney
│   ├── Paired/matched → Paired t-test or Wilcoxon signed-rank
│   └── Time-to-event → Log-rank test
└── Three+ groups
    ├── Independent → ANOVA or Kruskal-Wallis
    ├── Repeated measures → Repeated measures ANOVA or Friedman
    └── Time-to-event → Cox regression
```

### Regression Type Selection
```
Outcome type?
├── Continuous
│   ├── Simple linear → Linear regression (OLS)
│   ├── With mixed effects → Mixed linear model (LMM)
│   └── Quantile of interest → Quantile regression
├── Binary → Logistic regression
├── Count → Poisson or negative binomial
├── Time-to-event → Cox proportional hazards
└── Multivariate → MANOVA or multivariate regression
```

### Python Implementation Examples

#### Hypothesis Tests

```python
import numpy as np
import pandas as pd
from scipy import stats

# Two-sample t-test (continuous, normal)
def two_sample_test(treatment, control, equal_var=True):
    t_stat, p_value = stats.ttest_ind(treatment, control, equal_var=equal_var)
    d = (np.mean(treatment) - np.mean(control)) / np.sqrt(
        (np.var(treatment, ddof=1) + np.var(control, ddof=1)) / 2
    )
    return {"statistic": t_stat, "p_value": p_value, "effect_size": d}

# Chi-square test (categorical)
def chi_square_test(observed, expected=None):
    if expected is None:
        chi2, p_value, dof, expected = stats.chi2_contingency(observed)
    else:
        chi2, p_value = stats.chisquare(observed, expected)
    # Cramér's V
    n = np.sum(observed)
    k = min(observed.shape)
    v = np.sqrt(chi2 / (n * (k - 1))) if n * (k - 1) > 0 else 0
    return {"statistic": chi2, "p_value": p_value, "effect_size": v}

# Mann-Whitney U (non-parametric two-group)
def mann_whitney_test(treatment, control):
    u_stat, p_value = stats.mannwhitneyu(treatment, control, alternative='two-sided')
    # Rank-biserial correlation as effect size
    n1, n2 = len(treatment), len(control)
    r = 1 - (2 * u_stat) / (n1 * n2)
    return {"statistic": u_stat, "p_value": p_value, "effect_size": r}

# ANOVA
def anova_test(*groups):
    f_stat, p_value = stats.f_oneway(*groups)
    # Eta-squared
    all_data = np.concatenate(groups)
    grand_mean = np.mean(all_data)
    ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)
    ss_total = sum((x - grand_mean)**2 for x in all_data)
    eta_sq = ss_between / ss_total
    return {"statistic": f_stat, "p_value": p_value, "effect_size": eta_sq}
```

#### Linear Regression with Diagnostics

```python
import statsmodels.api as sm

def regression_with_diagnostics(X, y):
    X = sm.add_constant(X)
    model = sm.OLS(y, X).fit()
    
    # Diagnostics
    residuals = model.resid
    fitted = model.fittedvalues
    
    # Homoscedasticity: Breusch-Pagan test
    bp_test = sm.stats.diagnostic.het_breuschpagan(residuals, X)
    
    # Normality: Jarque-Bera test
    jb_test = sm.stats.jarque_bera(residuals)
    
    # Multicollinearity: VIF
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    vif = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
    
    # Durbin-Watson (autocorrelation)
    dw = sm.stats.durbin_watson(residuals)
    
    return {
        "model": model,
        "r_squared": model.rsquared,
        "adj_r_squared": model.rsquared_adj,
        "coeff": model.params,
        "p_values": model.pvalues,
        "dw_statistic": dw,
        "bp_pvalue": bp_test[1],
        "jb_pvalue": jb_test[1],
        "max_vif": max(vif),
        "significant": model.pvalues.iloc[1:].lt(0.05).any()
    }
```

### Time Series Analysis

#### Components and Decomposition

```python
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import adfuller, acf, pacf

# Decompose time series into trend + seasonal + residual
def decompose_series(series, period=7):
    result = seasonal_decompose(series, model='additive', period=period)
    return {
        "trend": result.trend,
        "seasonal": result.seasonal,
        "residual": result.resid,
        "strength_trend": 1 - np.var(result.resid.dropna()) / np.var(result.trend.dropna()),
        "strength_seasonality": 1 - np.var(result.resid.dropna()) / np.var(result.seasonal.dropna())
    }

# Stationarity test: ADF
def check_stationarity(series):
    result = adfuller(series.dropna(), autolag='AIC')
    return {
        "adf_statistic": result[0],
        "p_value": result[1],
        "critical_values": result[4],
        "is_stationary": result[1] < 0.05
    }
```

#### ARIMA Model Selection

```yaml
arima_workflow:
  step_1_check_stationarity:
    - "Run ADF test on series"
    - "If non-stationary: difference once, re-test"
    - "If still non-stationary: log transform + difference"
    - "d = number of differences needed"
  
  step_2_identify_p_and_q:
    - "Plot ACF: significant spikes at lags → p component"
    - "Plot PACF: significant spikes at lags → q component"
    - "If ACF decays gradually, PACF cuts off after p → AR(p)"
    - "If PACF decays gradually, ACF cuts off after q → MA(q)"
    - "Seasonal: use seasonal differencing, inspect seasonal lags"
  
  step_3_fit_and_evaluate:
    - "Fit candidate models (p-1, p, p+1) × (q-1, q, q+1)"
    - "Compare AIC / BIC — lower is better"
    - "Check residuals: should be white noise (Ljung-Box test)"
    - "Residuals should have no significant ACF spikes"
  
  step_4_forecast:
    - "Generate point forecasts with prediction intervals"
    - "Evaluate out-of-sample: rolling window CV or holdout"
    - "Metrics: MAE, RMSE, MAPE, MASE"
```

```python
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.stats.diagnostic import acorr_ljungbox

def fit_and_diagnose_arima(series, order, seasonal_order=None):
    model = ARIMA(series, order=order, seasonal_order=seasonal_order)
    fitted = model.fit()
    
    # Residual diagnostics
    residuals = fitted.resid
    lb_test = acorr_ljungbox(residuals, lags=[10, 20, 30], return_df=True)
    
    return {
        "model": fitted,
        "aic": fitted.aic,
        "bic": fitted.bic,
        "residuals_white_noise": lb_test['lb_pvalue'].gt(0.05).all(),
        "forecast": fitted.get_forecast(steps=30)
    }
```

### Bayesian Inference

#### Bayesian A/B Test with PyMC

```python
import pymc as pm

def bayesian_ab_test(clicks_a, impressions_a, clicks_b, impressions_b):
    with pm.Model() as ab_model:
        # Priors
        p_a = pm.Beta("p_a", alpha=1, beta=1)
        p_b = pm.Beta("p_b", alpha=1, beta=1)
        
        # Likelihood
        obs_a = pm.Binomial("obs_a", n=impressions_a, p=p_a, observed=clicks_a)
        obs_b = pm.Binomial("obs_b", n=impressions_b, p=p_b, observed=clicks_b)
        
        # Derived quantities
        lift = pm.Deterministic("lift", (p_b - p_a) / p_a)
        effect_greater_0 = pm.Deterministic("prob_positive", pm.math.gt(lift, 0))
        
        # Sample
        trace = pm.sample(2000, tune=1000, chains=4, random_seed=42)
    
    return {
        "p_a_posterior": trace.posterior.p_a.values.flatten(),
        "p_b_posterior": trace.posterior.p_b.values.flatten(),
        "lift_posterior": trace.posterior.lift.values.flatten(),
        "prob_better_than_a": np.mean(trace.posterior.lift.values > 0),
        "hdi_lift": pm.hdi(trace.posterior.lift, hdi_prob=0.94)
    }
```

#### Bayesian Linear Regression

```python
def bayesian_regression(X, y):
    with pm.Model() as reg_model:
        # Priors
        alpha = pm.Normal("alpha", mu=0, sigma=10)
        beta = pm.Normal("beta", mu=0, sigma=5, shape=X.shape[1])
        sigma = pm.HalfNormal("sigma", sigma=5)
        
        # Linear model
        mu = alpha + pm.math.dot(X, beta)
        
        # Likelihood
        likelihood = pm.Normal("y", mu=mu, sigma=sigma, observed=y)
        
        # Sample
        trace = pm.sample(2000, tune=1000, chains=4, random_seed=42)
    
    return {
        "alpha_samples": trace.posterior.alpha.values.flatten(),
        "beta_samples": trace.posterior.beta.values,
        "sigma_samples": trace.posterior.sigma.values.flatten(),
        "r2_samples": pm.r2_score(y, trace.posterior.alpha + 
                                   pm.math.dot(X, trace.posterior.beta.T)).values
    }
```

### Dimensionality Reduction and Clustering

#### PCA Implementation

```python
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

def pca_analysis(X, n_components=None, standardize=True):
    if standardize:
        X_scaled = StandardScaler().fit_transform(X)
    else:
        X_scaled = X
    
    pca = PCA(n_components=n_components or min(X.shape[0], X.shape[1], 50))
    X_pca = pca.fit_transform(X_scaled)
    
    # Scree plot data
    explained_var = pca.explained_variance_ratio_
    cumulative_var = np.cumsum(explained_var)
    n_for_90pct = np.argmax(cumulative_var >= 0.90) + 1
    n_for_95pct = np.argmax(cumulative_var >= 0.95) + 1
    
    # Feature loadings
    loadings = pd.DataFrame(
        pca.components_.T,
        index=X.columns,
        columns=[f"PC{i+1}" for i in range(pca.n_components_)]
    )
    
    return {
        "explained_variance_ratio": explained_var,
        "cumulative_variance": cumulative_var,
        "n_components_90pct": n_for_90pct,
        "n_components_95pct": n_for_95pct,
        "loadings": loadings,
        "transformed": X_pca
    }
```

#### K-Means with Optimal K Selection

```python
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

def optimal_kmeans(X, k_range=(2, 15), random_state=42):
    inertias = []
    silhouettes = []
    
    for k in range(k_range[0], k_range[1] + 1):
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=random_state)
        labels = kmeans.fit_predict(X)
        inertias.append(kmeans.inertia_)
        silhouettes.append(silhouette_score(X, labels))
    
    # Elbow point (rate of change)
    deltas = np.diff(inertias)
    delta_deltas = np.diff(deltas)
    elbow_k = np.argmax(delta_deltas) + k_range[0] + 1
    
    # Best silhouette
    best_k = np.argmax(silhouettes) + k_range[0]
    
    return {"inertias": inertias, "silhouettes": silhouettes, 
            "elbow_k": elbow_k, "best_silhouette_k": best_k}
```

### Missing Data Handling

#### Missing Data Mechanisms

| Type | Description | Example | Handling |
|---|---|---|---|
| MCAR | Missing completely at random | Sensor randomly fails | Listwise deletion (if few), mean imputation |
| MAR | Missing at random (conditional on observed) | Men more likely to skip income question | MICE, regression imputation, EM algorithm |
| MNAR | Missing not at random (depends on missing value) | High earners hide income | Selection models, pattern-mixture models, sensitivity analysis |

#### MICE (Multiple Imputation by Chained Equations)

```python
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
from sklearn.ensemble import RandomForestRegressor

def mice_imputation(df, n_imputations=5, max_iter=10):
    imputer = IterativeImputer(
        estimator=RandomForestRegressor(n_estimators=100, n_jobs=-1),
        max_iter=max_iter,
        random_state=42,
        sample_posterior=True,  # Add noise for proper multiple imputation
        initial_strategy='median'
    )
    
    # Generate multiple imputed datasets
    imputed_datasets = []
    for i in range(n_imputations):
        imputed = imputer.fit_transform(df)
        imputed_datasets.append(pd.DataFrame(imputed, columns=df.columns))
    
    return imputed_datasets

# Pooling results (Rubin's rules)
def pool_estimates(estimates, variances):
    # Within-imputation variance
    m = len(estimates)
    w = np.mean(variances)
    # Between-imputation variance
    b = np.var(estimates, ddof=1)
    # Total variance
    total_var = w + (1 + 1/m) * b
    return np.mean(estimates), np.sqrt(total_var)
```

### Bootstrapping

```python
def bootstrap_ci(data, statistic=np.mean, n_bootstrap=10000, ci_level=0.95):
    n = len(data); stats = np.zeros(n_bootstrap)
    for i in range(n_bootstrap):
        stats[i] = statistic(np.random.choice(data, size=n, replace=True))
    alpha = 1 - ci_level
    return {"statistic": statistic(data),
            "ci": (np.percentile(stats, 100*alpha/2), np.percentile(stats, 100*(1-alpha/2))),
            "se": np.std(stats)}
```

### Decision Trees (continued)

#### Missing Data Strategy
```
Missing data mechanism?
├── MCAR (< 5% missing)
│   └── Listwise deletion (simple, unbiased)
├── MCAR (5-15% missing)
│   ├── Numeric → Median imputation
│   └── Categorical → Mode imputation
├── MAR
│   ├── < 10% variables missing → MICE (5-10 imputations)
│   ├── Time series → Forward fill / interpolation
│   └── ML prediction → Regression imputation
└── MNAR
    ├── Sensitivity analysis (bounds for missing values)
    └── Pattern-mixture models (stratify by missing pattern)
```

#### Time Series Forecasting Method
```
Data characteristics?
├── Strong trend, no seasonality
│   ├── Linear trend → Holt's linear (double exponential smoothing)
│   └── Exponential trend → Holt-Winters (triple, no season)
├── Trend + seasonality
│   ├── Stable seasonality → Holt-Winters additive
│   └── Growing seasonality → Holt-Winters multiplicative
├── No clear pattern, many data points
│   ├── Univariate → ARIMA/SARIMA (auto-arima for selection)
│   └── Multivariate → VAR, Prophet, or LSTM
└── Irregular events, holidays
    └── Prophet (handles holidays, changepoints, outliers)
```

## Rules
- Explore data before modeling — summary stats + visualizations first
- Check assumptions before choosing a test — wrong test gives wrong answer
- Report effect sizes and confidence intervals, not just p-values
- Address missing data explicitly — document method and rationale
- Use robust methods when assumptions are violated (robust SEs, non-parametric)
- Script everything for reproducibility — no manual steps
- Visualize results for stakeholders — tables are for reference, charts tell the story
- Document data inclusion/exclusion criteria
- Run sensitivity analyses to test robustness of conclusions
- Limit conclusions to what the data and method can support
- Validate stationarity before fitting time series models
- Use ACF/PACF for ARIMA order selection — avoid p-hacking orders
- Apply Rubin's rules for pooling multiple imputation results
- Prefer cross-validation over single train/test split for model evaluation
- Use bootstrap for non-standard metrics or small samples
- Diagnose residuals — a good model has white-noise residuals

## References
  - references/statistical-analysis-fundamentals.md — Statistical Analysis Fundamentals
  - references/statistical-analysis-advanced.md — Statistical Analysis Advanced Topics
