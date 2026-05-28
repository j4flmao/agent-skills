# Statistical Methods for A/B Testing

## Overview
Statistical methods provide the mathematical foundation for designing, analyzing, and interpreting A/B tests. This reference covers the essential statistical techniques — from frequentist hypothesis testing to Bayesian methods, sequential analysis, and multiple comparison corrections — that enable rigorous experiment-driven decision-making.

## Frequentist Hypothesis Testing

### Core Concepts
Frequentist inference treats probability as the long-run frequency of events. In A/B testing, it answers: "If there is truly no difference between variants (null hypothesis is true), what is the probability of observing data as extreme as what we collected?"

Null hypothesis (H0): the treatment has no effect. The metric mean is equal between control and treatment. µ_T = µ_C.

Alternative hypothesis (Ha): the treatment has an effect. µ_T ≠ µ_C (two-tailed) or µ_T > µ_C / µ_T < µ_C (one-tailed).

Test statistic: a standardized value calculated from sample data that measures the difference between variants relative to the variability of the data. Common test statistics: z-statistic (large samples, known variance), t-statistic (unknown variance, estimated from data).

p-value: the probability of observing a test statistic as extreme as the one observed (or more extreme) assuming the null hypothesis is true. A small p-value (typically < 0.05) indicates that the observed data would be unlikely under H0, providing evidence against the null.

Significance level (α): the threshold below which the p-value leads to rejecting H0. α = 0.05 means a 5% chance of rejecting H0 when it is actually true (Type I error). The choice of α reflects the tolerance for false positives.

### Choosing the Right Test

#### Two-Sample Z-Test
Appropriate for: large sample sizes (n > 30 per group), comparing proportions (conversion rates, click-through rates), known or well-estimated variance.

Assumptions: observations are independent, sample sizes are large enough for the Central Limit Theorem to apply, the sampling distribution of the difference in proportions is approximately normal.

Formula:
z = (p_T - p_C) / sqrt(p_hat * (1 - p_hat) * (1/n_T + 1/n_C))

Where p_hat is the pooled proportion: (x_T + x_C) / (n_T + n_C).

#### Two-Sample T-Test
Appropriate for: comparing means (average order value, time on site, revenue per user), unknown variance estimated from data.

Assumptions: observations are independent within and between groups, the metric is approximately normally distributed (or sample sizes are large enough for CLT), equal variances between groups (for Student's t-test; Welch's t-test does not assume equal variance).

Welch's t-test (unequal variance):
t = (mean_T - mean_C) / sqrt(var_T/n_T + var_C/n_C)

Degrees of freedom calculated using Welch-Satterthwaite equation.

#### Chi-Squared Test
Appropriate for: contingency table analysis, testing association between categorical variables, sample ratio mismatch detection.

Assumptions: expected frequency in each cell is at least 5, observations are independent.

Formula:
χ² = sum((observed - expected)² / expected)

#### Mann-Whitney U Test (Non-parametric)
Appropriate for: ordinal metrics, non-normal distributions with small samples, metrics with many outliers.

No normality assumption. Tests whether one group tends to have larger values than the other. Less powerful than t-test when normality holds.

#### Delta Method for Ratios
Appropriate for: ratio metrics where numerator and denominator are both random variables (revenue per user, time per session, click-through rate).

Uses Taylor series approximation to estimate variance of the ratio. Requires covariance between numerator and denominator.

### Effect Size Estimation

Point estimate: the observed difference between treatment and control means or proportions. This is the best single estimate of the true effect.

Confidence interval: a range of values that, with a specified level of confidence (typically 95%), contains the true effect size. A 95% CI means that if we repeated the experiment many times, 95% of the CIs would contain the true effect.

Confidence interval for difference in means:
CI = (mean_T - mean_C) ± t_(α/2, df) * SE

Confidence interval for difference in proportions:
CI = (p_T - p_C) ± z_(α/2) * SE

Interpretation: the CI communicates both the magnitude and precision of the effect. A wide CI indicates high uncertainty (small sample or high variance). A CI that does not include zero indicates statistical significance at the corresponding α level.

### Standardized Effect Sizes

Cohen's d: (mean_T - mean_C) / pooled_standard_deviation. Expresses effect size in standard deviation units. d = 0.2 (small), d = 0.5 (medium), d = 0.8 (large). Useful for comparing effect sizes across different metrics and experiments.

Relative effect: (mean_T - mean_C) / mean_C. Expresses effect as a percentage of baseline. More interpretable for business stakeholders but can be misleading if baseline is small. Always report alongside absolute effect.

Number Needed to Treat (NNT): 1 / (p_T - p_C) for proportions. Number of users who need to be exposed to the treatment for one additional conversion. Useful for communicating operational impact.

### Assumption Checking

Normality: check using Q-Q plots, histogram of residuals, Shapiro-Wilk test (for small samples), Kolmogorov-Smirnov test (for large samples). For large samples (n > 30 per group), CLT ensures the test statistic is approximately normal even if the underlying data are not.

Equal variance (homoscedasticity): check using Levene's test, F-test of variances, visual inspection of residual plots. If violated, use Welch's t-test (which does not assume equal variance) instead of Student's t-test.

Independence: observations must be independent within and between groups. Violations occur when: one user appears in both groups (assignment leakage), user actions are clustered (one user contributes multiple events), time series dependence (metrics drift over experiment period). Use cluster-robust standard errors or hierarchical models for non-independent data.

Sample ratio mismatch: use chi-squared test to check if observed sample sizes match expected proportions. A significant SRM indicates randomization failure and invalidates the experiment.

## Bayesian A/B Testing

### Core Concepts
Bayesian inference treats probability as a degree of belief, updated in light of observed data. In A/B testing, it produces a probability distribution for the true effect size, enabling direct statements like "There is a 92% probability that the treatment improves conversion."

Prior distribution: P(θ) — initial belief about the effect before seeing data. Can be informative (based on prior experiments, domain knowledge) or uninformative (flat prior, no strong prior belief). The choice of prior affects results, especially with small samples.

Likelihood: P(data | θ) — the probability of observing the data given a particular value of the treatment effect. The likelihood function updates our belief about θ.

Posterior distribution: P(θ | data) — updated belief about the effect after incorporating data. Post = Prior × Likelihood. The posterior is the complete description of uncertainty about the treatment effect.

### Conjugate Prior Models

Beta-Binomial model: for conversion rates and proportions. Prior: Beta(a, b). Likelihood: Binomial(n, x). Posterior: Beta(a + x, b + n - x). The parameters a and b encode prior beliefs: Beta(1, 1) is uniform (uninformative), Beta(100, 900) encodes a strong prior belief of 10% conversion rate.

Normal-Normal model: for continuous metrics (revenue, time). Prior: Normal(µ₀, σ₀²). Likelihood: Normal(µ, σ²/n). Posterior: Normal(µ_posterior, σ_posterior²) where posterior mean is a weighted average of prior mean and sample mean.

### Bayesian Decision Rules

Probability of superiority: Pr(µ_T > µ_C | data). The posterior probability that the treatment is better than control. A value of 0.95 means 95% probability that treatment outperforms control. Not the same as a p-value — it answers a fundamentally different question.

Expected loss: the expected cost of making a wrong decision. For each possible decision (implement, roll back, iterate), calculate the expected loss given the posterior distribution. Choose the decision with minimum expected loss.

Region of practical equivalence (ROPE): an interval of effect sizes too small to be practically meaningful. If the posterior 95% credible interval lies entirely outside the ROPE, the effect is practically significant. If the posterior overlaps substantially with the ROPE, the effect is negligible regardless of statistical significance.

### Bayesian vs. Frequentist Comparison

Interpretability: Bayesian produces directly interpretable probabilities (probability that treatment is better). Frequentist p-values are indirect (probability of data under H0).

Prior information: Bayesian can incorporate prior experiments, domain expertise. Frequentist uses only current data.

Sequential monitoring: Bayesian naturally handles continuous monitoring (posterior updates as data arrives, no correction needed). Frequentist requires sequential testing adjustments.

Sample size: Bayesian can make probabilistic statements with any sample size (though precision increases with sample). Frequentist requires pre-specified sample size for valid inference.

Computational complexity: Frequentist is simpler computationally. Bayesian may require MCMC sampling for non-conjugate models.

Organizational acceptance: Frequentist is more widely understood and accepted. Bayesian may require stakeholder education.

## Sequential Testing Methods

### Why Sequential Testing
Traditional (fixed-horizon) testing requires pre-specifying sample size and not peeking at results. In practice, teams want to monitor experiments continuously — to stop early if results are clear or to catch problems quickly. Sequential testing methods allow this while controlling error rates.

### Group Sequential Design
Pre-specify K interim analyses at evenly spaced information times (e.g., after 25%, 50%, 75%, and 100% of planned sample size). At each analysis, compute the test statistic and compare against adjusted critical values that maintain the overall Type I error rate at α.

Alpha spending function: a function α(t) that specifies how much of the total α is spent by information time t. The function increases from 0 to α over the course of the experiment. Common spending functions:

Pocock: constant boundary at each analysis. Easier to stop early. Critical value at each analysis ≈ z_(α/2) / √K. More conservative early adjustments.

O'Brien-Fleming: very conservative early boundaries (hard to stop early), less conservative final boundary (close to unadjusted). Critical values decrease over time. Preferred when early stopping should require very strong evidence.

Haybittle-Peto: fixed boundary for early analyses (z = 3), final analysis at z = 1.96. Nearly identical to fixed-horizon for final analysis. Very hard to stop early.

### Continuous Monitoring (Always Valid Inference)
Group sequential designs require pre-specified analysis times. Continuous monitoring methods allow checking at any time without losing validity:

Mixture Sequential Probability Ratio Test (MSPRT): extends SPRT to two-sided tests. Always valid under optional stopping. Slightly less powerful than group sequential for most scenarios.

Confidence sequences: time-varying confidence intervals that remain valid under continuous monitoring. A 95% confidence sequence contains the true effect at all times with 95% probability. Wider than fixed-horizon CIs but allow continuous monitoring.

### Stopping Rules

Stop for superiority: when the test statistic exceeds the upper boundary. Treatment is clearly better than control. Calculate how many users were exposed to the inferior variant unnecessarily.

Stop for futility: when the conditional power (probability of detecting the MDE given current data) falls below a threshold (typically 10-20%). The experiment is unlikely to show significance even if continued to full sample. Frees up traffic for other experiments. Requires pre-specifying the futility threshold.

Stop for harm: when a guardrail metric shows significant degradation. Pre-specify which metrics trigger harm stopping and the threshold. Stop immediately — no experiment is worth causing user harm.

### Practical Considerations
Sequential testing requires more planning: specifying analysis times, choosing spending functions, and defining stopping rules before launch.

Sequential testing typically requires 5-15% larger sample sizes than fixed-horizon testing for the same power, because the adjusted boundaries are more conservative.

Sequential testing is not optional stopping: you cannot peek at any time without penalty. Pre-specified sequential boundaries define when it is valid to look.

Document all sequential design choices before experiment launch. Changes during the experiment invalidate error rate controls.

## Multiple Comparison Corrections

### Why Corrections Are Needed
When testing multiple hypotheses simultaneously (multiple metrics, multiple variants, multiple segments), the probability of at least one false positive increases. With 20 independent tests at α = 0.05, the probability of at least one false positive is 1 - (0.95)^20 = 64%. Without correction, the familywise error rate (FWER) is uncontrolled.

### Familywise Error Rate (FWER) Control
Controls the probability of making at least one Type I error across all tests.

Bonferroni correction: divide α by the number of tests (m). Each test uses α/m as its significance threshold. Simplest and most conservative. Works for any dependency structure. Power decreases as m increases. Best for 2-5 comparisons where false positives are very costly.

Holm-Bonferroni (step-down): less conservative than Bonferroni while still controlling FWER. Sort p-values ascending. Reject H1 if p1 < α/m. If rejected, reject H2 if p2 < α/(m-1). Continue until first non-rejection.

Šidák correction: 1 - (1 - α)^(1/m). Slightly less conservative than Bonferroni. Requires independence or positive dependence.

### False Discovery Rate (FDR) Control
Controls the expected proportion of rejected hypotheses that are false positives. Less conservative than FWER. More power at the cost of accepting some false positives. Better for many tests (segment analysis, secondary metrics) where some false positives are acceptable.

Benjamini-Hochberg procedure: sort p-values ascending (p1 ≤ p2 ≤ ... ≤ pm). Find the largest k such that pk ≤ (k/m) × q where q is the desired FDR (typically 0.10 or 0.20). Reject all H1...Hk. Requires independence or non-negative correlation.

Benjamini-Yekutieli: extends BH to any dependency structure. More conservative. Use when dependency is unknown or complex.

Storey's q-value: estimates the proportion of true null hypotheses (π0) and adjusts FDR calculation. More powerful than BH when π0 < 1 (some hypotheses are truly significant).

### Hierarchical Testing
Test the overall null hypothesis first. Only if the overall test is significant, test individual hypotheses. Different procedures allow different levels of hierarchy.

Closed testing: test every intersection hypothesis. Reject a hypothesis H only if all intersection hypotheses containing H are rejected. Strong control of FWER without Bonferroni conservatism. Computationally intensive for many hypotheses.

Gatekeeping: define ordered families of hypotheses. Test family 1 at α. Only if all hypotheses in family 1 are rejected can family 2 be tested. Common in clinical trials. Useful for primary/secondary metric hierarchies.

### Application Guidelines
Pre-specify the correction method and what is being corrected before experiment launch.

Primary metric: no correction needed — one metric, one test. The primary metric is the single decision criterion.

Secondary metrics: apply FDR control (Benjamini-Hochberg) for exploratory understanding. Flag interesting findings for follow-up but do not make decisions based on secondary metrics alone.

Multiple variants: if comparing multiple treatments to a single control, use Dunnett's test (compares each treatment to control only, not treatments to each other) or Bonferroni correction.

Segment analysis: apply FDR control. Interpret results cautiously due to reduced power in smaller segment samples. Pre-specify segments to avoid cherry-picking.

Multiple experiments: no correction across independent experiments. Each experiment stands alone. However, if multiple experiments share the same control group, corrections may be needed.

## Power Analysis and Sample Size Calculation

### Statistical Power
Power = 1 - β = P(reject H0 | H0 is false). The probability of detecting an effect of a specified size when it truly exists. Power depends on: effect size (larger effects are easier to detect), sample size (larger samples increase power), significance level (higher α increases power), variance (lower variance increases power).

Conventional power targets: 0.80 (standard), 0.90 (high-stakes decisions), 0.95 (mission-critical, expensive Type II errors).

### Sample Size Formula (Two-Sample Proportion Test)
n = (z_(α/2) + z_β)² × (p1 × (1-p1) + p2 × (1-p2)) / (p2 - p1)²

Where:
n = sample size per variant
z_(α/2) = critical value for two-tailed test (1.96 for α=0.05)
z_β = critical value for power (0.84 for β=0.20)
p1 = baseline conversion rate
p2 = expected conversion rate (p1 + MDE)

For one-tailed test, use z_α instead of z_(α/2).

### Sample Size Formula (Two-Sample Mean Test)
n = (z_(α/2) + z_β)² × 2σ² / (µ2 - µ1)²

Where:
σ² = variance of the metric
µ2 - µ1 = minimum detectable difference

The required variance σ² is often the biggest unknown. Use historical data to estimate. Consider log-transforming skewed metrics (revenue, time) to reduce variance and required sample size.

### Factors Affecting Sample Size

Baseline rate: for proportion metrics, the required sample size is highest when baseline is near 50%. Very high or very low baselines require smaller samples. For a 5% MDE relative: 50% baseline → ~3,200 per variant. 10% baseline → ~14,000 per variant.

Minimum detectable effect: sample size increases approximately quadratically as MDE decreases. Halving the MDE requires 4x the sample size. Trade off MDE against traffic and time constraints.

Variance: for continuous metrics, higher variance requires larger samples. Identify and control sources of variance through stratification, covariate adjustment (CUPED), or focusing on more homogeneous segments.

Number of variants: each additional variant increases total sample size linearly (n per variant × k variants). Use Bonferroni correction which increases n per variant.

### Using CUPED (Controlled Experiments Using Pre-Experiment Data)
CUPED reduces variance by controlling for pre-experiment covariates correlated with the outcome metric. Can reduce required sample size by 30-50%.

Method: measure the outcome metric and pre-experiment covariates for each user. Regress outcome on covariates. Use residuals as the adjusted metric. The adjusted metric has lower variance (the variance explained by the covariate is removed).

Formula:
Y_adj = Y - θ × (X - mean(X))

Where θ = Cov(Y, X) / Var(X) is the optimal adjustment coefficient (estimated from data). The variance reduction depends on the correlation between Y and X: Var(Y_adj) = (1 - ρ²) × Var(Y).

CUPED implementation: requires pre-experiment data for all users in the experiment. For repeat users, use pre-experiment period of the same metric (e.g., pre-experiment revenue to adjust revenue). For new users, use available covariates (acquisition source, device, region).

### Variance Reduction Techniques

CUPED: control for pre-experiment covariates. Most widely used. Reduces variance by 30-50% in typical applications.

Stratification: divide users into homogeneous strata (by region, plan, device). Randomize within each stratum. Reduces variance by removing between-stratum variation. Requires pre-specifying strata and ensuring sufficient sample per stratum.

Post-stratification: similar to stratification but applied after randomization. Adjust treatment effect estimates using stratum weights. Less efficient than pre-stratification but does not require pre-specifying strata.

Inverse propensity weighting: weight observations by the inverse of the probability of receiving treatment. Reduces bias from imbalanced randomization. Mostly used for observational studies, not A/B tests with proper randomization.

## Non-Standard Metrics

### Ratio Metrics
Metrics defined as a ratio of two random variables: revenue per user, time per session, click-through rate. The numerator and denominator are both stochastic with covariance.

Statistical inference: use the delta method or Fieller's theorem. The delta method uses Taylor expansion to approximate variance. Fieller's theorem provides exact confidence intervals for ratios of normally distributed variables.

Implementation: track both numerator and denominator events. Calculate ratio and its standard error accounting for covariance. Report CI using delta method or bootstrapping.

### Count Metrics
Metrics that are counts per user: number of orders, number of sessions, number of support tickets. Often zero-inflated (many users have zero) and right-skewed (few users have many).

Methods: negative binomial regression for overdispersed count data. Zero-inflated models when zeros come from two processes (users who never engage and users who engage but have no events). Quantile regression for understanding effects at different points in the distribution.

### Retention and Engagement Metrics
Metrics defined over long time periods: 7-day retention, DAU/MAU, weekly active users. Users may enter and leave the experiment during the measurement period.

Methods: survival analysis for time-to-event metrics (time to churn, time to next purchase). Repeated measures models for engagement metrics. Cohort-based analysis, not individual user analysis, for retention metrics.

### Revenue Metrics
Highly right-skewed, with a few users generating most of the revenue. Very high variance, requiring large sample sizes.

Methods: log transformation to reduce skew (but changes interpretation to multiplicative effects). Winsorization (capping extreme values) to reduce variance. Quantile regression to understand effects at different revenue percentiles. Bootstrap for CI estimation.

## Sensitivity Analysis

### Robustness Checks
To ensure experiment conclusions are trustworthy, run sensitivity analyses:

Remove outliers: re-run analysis excluding users with extreme values. If conclusions change, the result is driven by outliers.

Alternative test methods: re-run using non-parametric test. If conclusions differ, parametric assumptions may not hold.

Different time windows: re-run using slightly different experiment start/end times. If conclusions change at different cutoffs, the result is time-dependent.

Segment exclusion: re-run excluding each major segment one at a time. If a single segment drives the result, the effect is not general.

Winsorization: cap extreme values at the 1st and 99th percentiles. If conclusions change, the result is driven by extremes.

### Pre-registration and Replication
Pre-register analysis plan before experiment launch. Include: primary metric, secondary metrics, statistical method, sample size, stopping rules, segment analyses, exclusion criteria.

After pre-registered analysis, run exploratory analyses. Label them clearly as exploratory. Pre-registered results take priority for decision-making.

Replicate critical experiments before implementing large-scale changes. Replication across time (same experiment at different times) or across populations (different user segments) increases confidence.

## Key Points
- Choose the statistical test based on metric type (proportion vs. mean), sample size, and assumptions.
- Always check assumptions (normality, variance, independence, SRM) before interpreting results.
- Report confidence intervals alongside p-values — they communicate effect magnitude and precision.
- Use sequential testing with pre-specified boundaries when continuous monitoring is needed.
- Apply FDR control (Benjamini-Hochberg) for segment and secondary metric analysis.
- Use CUPED and stratification to reduce variance and required sample sizes by 30-50%.
- Bayesian methods produce directly interpretable probabilities and handle sequential monitoring naturally.
- Pre-register experiment design and analysis plan — pre-registered results take priority.
- Run sensitivity analyses to confirm results are robust to analytical choices.
- Replicate critical experiments before large-scale implementation.
