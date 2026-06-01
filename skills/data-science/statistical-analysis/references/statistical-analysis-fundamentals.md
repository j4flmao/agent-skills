# Statistical Analysis Fundamentals

## Overview
Statistical analysis provides the mathematical foundation for extracting insights from data, quantifying uncertainty, and making data-driven decisions. This reference covers descriptive and inferential statistics, hypothesis testing, regression modeling, time series analysis, and practical considerations for production data analysis.

## Descriptive Statistics

### Measures of Central Tendency
Mean (arithmetic average): sensitive to outliers, appropriate for symmetric distributions. Median (50th percentile): robust to outliers, appropriate for skewed distributions (income, latency). Mode: most frequent value, used for categorical data. Trimmed mean removes extreme percentiles (5% each side) for a compromise between mean and median.

### Measures of Dispersion
Variance: average squared deviation from mean, σ² = Σ(xᵢ - μ)² / n. Standard deviation: square root of variance, same units as data. IQR: Q3 - Q1, robust measure of spread. MAD (Median Absolute Deviation): median of |xᵢ - median(x)|, robust alternative to SD. Range: max - min, highly sensitive to outliers. Coefficient of variation: σ/μ, useful for comparing variability across different scales.

### Distribution Moments
First moment: mean (location). Second moment: variance (spread). Third moment: skewness (asymmetry) — positive skew (right tail), negative skew (left tail), zero (symmetric). Fourth moment: kurtosis (tail thickness) — mesokurtic (normal), leptokurtic (heavy tails, fat tails risk), platykurtic (light tails). Jarque-Bera and D'Agostino-Pearson tests for normality based on skewness and kurtosis.

### Data Visualization
Histogram: bin counts for distribution shape (choose bins via Sturges' rule, Scott's rule, or FD estimator). Box plot: median, IQR, whiskers (1.5×IQR), outliers as points. Violin plot: box plot + KDE density. Q-Q plot: theoretical vs sample quantiles for distribution comparison. ECDF: empirical cumulative distribution function — no binning artifacts.

## Probability Distributions

### Discrete Distributions
Bernoulli: single trial, success/failure, parameter p. Binomial: n Bernoulli trials, parameters (n, p). Poisson: count of events in fixed interval, parameter λ (mean = variance). Negative Binomial: count of failures before r successes, handles overdispersion (variance > mean). Geometric: trials until first success.

### Continuous Distributions
Normal: symmetric bell curve, parameters (μ, σ), CLT, ubiquitous. Student's t: heavier tails than normal, used for small samples, parameter df. Chi-square: sum of squared standard normals, goodness-of-fit, variance tests. F: ratio of two chi-squares, ANOVA and model comparison. Exponential: time between Poisson events, memoryless property. Beta: bounded [0,1], prior for proportions, parameters (α, β). Log-normal: ln(X) is normal, positive skew, multiplicative processes. Weibull: time-to-event, flexible hazard shapes (increasing, decreasing, constant).

## Inferential Statistics

### Sampling Distributions
CLT: sample mean of i.i.d. variables with finite variance is approximately normal for large n (n ≥ 30 rule of thumb, but depends on underlying distribution skewness). Standard error: SD of sampling distribution, SE = σ/√n. Bootstrap: resample with replacement B times (B=1000+), compute statistic each time, use empirical distribution for inference.

### Confidence Intervals
CI = estimate ± critical_value × SE. z-based: normal distribution (known σ, large n). t-based: t distribution (unknown σ, small n), t_df. Wilson score interval: better coverage for binomial proportions than normal approximation. Bootstrap percentile CI: 2.5th and 97.5th percentiles of bootstrap distribution for 95% CI. Bootstrapped BCa (bias-corrected accelerated): adjusts for skewness and bias. CI interpretation: 95% of such intervals will contain the true parameter — NOT "95% probability parameter is in this interval" (frequentist).

### Hypothesis Testing Structure
Define H₀ (null: no effect, difference = 0) and H₁ (alternative: effect exists). Choose α (Type I error rate, typically 0.05). Calculate test statistic and p-value. p-value = P(data or more extreme | H₀). Reject H₀ if p < α. Report: test statistic, df, p-value, CI, effect size. Never conclude "accept H₀" — fail to reject. Pre-register analysis to prevent p-hacking.

### Common Hypothesis Tests

| Test | Purpose | Assumptions |
|---|---|---|
| One-sample t-test | Mean vs known value | Normality, independence |
| Two-sample t-test | Compare two independent means | Normality, equal variance, independence |
| Paired t-test | Compare two dependent means (pre/post) | Normality of differences |
| Welch's t-test | Two means, unequal variances | Normality, independence |
| One-way ANOVA | Compare ≥3 means | Normality, equal variance, independence |
| Chi-square test | Association between categorical variables | Expected count ≥5, independence |
| Fisher's exact | Small contingency tables | Fixed margins, independence |
| Mann-Whitney U | Compare two distributions (non-parametric) | Same shape, independence |
| Wilcoxon signed-rank | Paired comparison (non-parametric) | Symmetry of differences |
| Kolmogorov-Smirnov | Compare two distributions | Continuous data |
| Shapiro-Wilk | Test normality | N < 5000 |

## Regression Analysis

### Linear Regression
Model: Y = β₀ + β₁X₁ + ... + βₚXₚ + ε, where ε ~ N(0, σ²). OLS minimizes sum of squared residuals. R² = 1 - SS_res / SS_tot, proportion of variance explained. Adjusted R² penalizes for number of predictors. F-test: overall model significance. t-tests: individual coefficients. Interpretation: βⱼ is change in Y for one-unit change in Xⱼ holding others constant. Standardize predictors (z-scores) for comparing effect magnitudes.

### Logistic Regression
Model: log(p/(1-p)) = β₀ + β₁X₁ + ... + βₚXₚ. Estimates log-odds. Exponentiate for odds ratios: exp(βⱼ). Interpretation: one-unit increase in Xⱼ multiplies odds by exp(βⱼ). Fit via maximum likelihood (iteratively reweighted least squares). Deviance: -2 × log-likelihood, analogous to SS_res. AIC/BIC for model selection. Hosmer-Lemeshow test for calibration. ROC-AUC for discrimination.

### Regression Assumptions
Linearity: relationship between X and Y is linear (partial residual plots). Independence: errors are independent. Homoscedasticity: constant variance of errors (Breusch-Pagan test, residual-vs-fitted plot). Normality of errors: Q-Q plot, Shapiro-Wilk (robust with large n). No perfect multicollinearity: VIF > 5-10 indicates collinearity concern. No autocorrelation: Durbin-Watson test for time-ordered data.

### Regularized Regression
Ridge (L2): adds λ×Σβⱼ² to loss — shrinks coefficients toward zero, no variable selection. Lasso (L1): adds λ×Σ|βⱼ| to loss — shrinks to zero for variable selection. Elastic Net: combines L1 and L2 — α balances mix. Tuning λ via cross-validation. Standardize predictors first. Best for: high-dimensional data, correlated predictors, automatic feature selection.

## Time Series Analysis

### Components
Trend: long-term direction (upward, downward, stable). Seasonality: periodic patterns (hourly, daily, weekly, yearly). Cyclical: longer-term non-fixed cycles (economic cycles). Residual: irregular component after removing trend and seasonality. Decomposition: additive (Y = T + S + R) or multiplicative (Y = T × S × R). STL decomposition: robust, seasonal-trend decomposition using LOESS.

### Stationarity
Weak stationarity: constant mean, constant variance, autocovariance depends only on lag. Strong stationarity: full joint distribution is time invariant. Unit root tests: Augmented Dickey-Fuller (H₀: unit root/non-stationary), KPSS (H₀: stationary). Differencing: ∇Y_t = Y_t - Y_{t-1}, apply d times for I(d) process.

### ARIMA Models
AR(p): Y_t = c + φ₁Y_{t-1} + ... + φₚY_{t-p} + ε_t. MA(q): Y_t = c + ε_t + θ₁ε_{t-1} + ... + θ_qε_{t-q}. ARIMA(p,d,q): AR on d-differenced data + MA. ACF plot: identifies MA order (cuts after q). PACF plot: identifies AR order (cuts after p). AIC/BIC for model selection among candidates. Seasonal ARIMA SARIMA(p,d,q)(P,D,Q)_s adds seasonal terms.

### Forecasting Evaluation
Training/test split (temporal order maintained). Rolling window or expanding window cross-validation. Metrics: MAE, RMSE (same units as data), MAPE (scale-independent, undefined for zeros), MASE (scales by naive forecast). Forecast vs actuals plots. Prediction intervals not just point forecasts. Diebold-Mariano test for comparing forecast accuracy of two methods.

## Effect Sizes and Practical Significance

### Common Effect Sizes
Cohen's d: (μ₁ - μ₂) / σ_pooled — standardized mean difference (small=0.2, medium=0.5, large=0.8). Pearson's r: correlation strength. Odds ratio: odds in group 1 / odds in group 2. Risk ratio: P(event | group 1) / P(event | group 2). Hedges' g: Cohen's d with small sample correction. Glass's Δ: (μ₁ - μ₂) / σ_control when variances differ.

### Practical vs Statistical Significance
Statistical significance: p < α (did the effect occur?). Practical significance: effect size > minimum meaningful threshold (does it matter?). A large sample can make trivial effects statistically significant. Always report both p-value and effect size with CI. Cost-benefit analysis: is implementing the change worth the resources?

## Bayesian Statistics

### Bayes Theorem
P(θ | data) = P(data | θ) × P(θ) / P(data). Posterior = likelihood × prior / evidence. Prior: beliefs before seeing data (informative, weakly informative, uninformative). Conjugate priors: prior and posterior from same family (Beta-Binomial, Normal-Normal, Gamma-Poisson). MCMC: Markov Chain Monte Carlo for non-conjugate models (Metropolis-Hastings, Gibbs, NUTS in Stan/PyMC).

### Bayesian Analysis Workflow
1. Model specification: likelihood, prior, generative model
2. Prior predictive check: simulate from prior — does it generate plausible data?
3. MCMC sampling: 4 chains × 2000 iterations (keep 1000 per chain after warmup)
4. Convergence diagnostics: R-hat < 1.01, ESS > 400, trace plots well-mixed
5. Posterior predictive check: simulate from posterior — does it replicate observed data?
6. Report: posterior mean, 94% HDI (highest density interval), probability of direction

## Statistical Assumptions and Robustness

### Robust Alternatives
When normality fails: Mann-Whitney (instead of t-test), Kruskal-Wallis (instead of ANOVA), Spearman rank correlation (instead of Pearson). When variances unequal: Welch's t-test, heteroskedasticity-consistent SEs (HC0-HC4). When outliers present: trimmed means, Huber-White robust regression, quantile regression. Transformations: log(y) for positive skew, Box-Cox for optimizing normality.

### Multiple Testing
Family-wise error rate (FWER): Bonferroni (α/m), Holm-Bonferroni. False discovery rate (FDR): Benjamini-Hochberg, Benjamini-Yekutieli. Control for: post-hoc comparisons, multiple outcomes, subgroup analyses, sequential testing. Pre-registration and clear boundaries matter. Report all tests performed, not just significant ones.

## Data Quality for Analysis

### Missing Data Mechanisms
MCAR (Missing Completely at Random): missingness independent of all variables — listwise deletion OK (reduces power). MAR (Missing at Random): missingness depends on observed data — multiple imputation (MICE, predictive mean matching). MNAR (Missing Not at Random): missingness depends on unobserved data — pattern mixture models, selection models, sensitivity analysis. Report missingness rates and handle transparently.

### Outlier Detection
Z-score: |z| > 3 flags outlier (parametric). IQR: below Q1 - 1.5×IQR or above Q3 + 1.5×IQR (standard box plot rule). Isolation Forest: tree-based anomaly detection for high dimensions. DBSCAN: density-based clustering with noise points. Domain-specific thresholds are preferred. Always investigate outliers before removing.

### Data Transformations
Log: positive data, multiplicative effects become additive, reduces right skew. Square root: count data, Poisson-like. Box-Cox: (x^λ - 1)/λ for λ ≠ 0, log(x) for λ = 0 — finds optimal normality-enhancing transformation. Yeo-Johnson: handles zero and negative values. Standardization (z-score): (x - μ)/σ for comparing coefficients. Normalization (min-max): (x - min)/(max - min), range [0,1].

## Statistical Computing Best Practices

### Reproducibility
Seed random number generators (set.seed in R, np.random.seed in Python). Version control data processing and analysis code. Use literate programming (Jupyter with clear markdown, R Markdown, Quarto). Dependency management: requirements.txt, renv, conda environment.yml. Output pinning: save processed datasets and results (avoid re-running from scratch).

### Software

| Tool | Strengths | Use Case |
|---|---|---|
| R | Comprehensive stats packages, R Markdown | Academic research, exploratory analysis |
| Python (SciPy, statsmodels) | ML integration, production deployment | Production stats, ML pipelines |
| Python (scikit-learn) | ML-focused, regression, clustering | Predictive modeling |
| JASP | GUI-based, Bayesian and frequentist | Non-coders, education |
| SPSS/SAS | GUI, enterprise, regulatory | Regulated industries (pharma, clinical) |
| Stan/PyMC | Bayesian modeling, MCMC | Custom Bayesian models |
| Stata | Panel data, econometrics | Social science, economics |

## Best Practices
- Visualize data before any statistical testing
- Check assumptions before choosing a test
- Power analysis should precede data collection
- Pre-register analysis plan to prevent specification searching
- Report effect sizes and CIs, not just p-values
- Document data inclusion/exclusion criteria
- Use robust standard errors when assumptions are uncertain
- Replicate findings on holdout samples
- Version control analysis code and outputs
- Always run sensitivity analyses to test assumptions