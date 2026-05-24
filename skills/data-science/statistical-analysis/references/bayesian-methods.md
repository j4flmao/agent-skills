# Bayesian Methods Reference

## Bayes Theorem

### Core Formula
```
P(θ|D) = P(D|θ) * P(θ) / P(D)

Posterior ∝ Likelihood × Prior

P(θ|D) = posterior probability of parameters θ given data D
P(D|θ) = likelihood of data given parameters
P(θ)   = prior probability of parameters (before seeing data)
P(D)   = marginal likelihood (evidence), normalizing constant

P(D) = ∫ P(D|θ) * P(θ) dθ
```

### Intuitive Interpretation
```
Prior = what we believe before seeing data
Likelihood = how compatible the data is with different parameter values
Posterior = what we believe after updating with data

With infinite data, posterior converges to the MLE regardless of prior.
With limited data, prior has stronger influence.
```

### Bayesian vs Frequentist
| Aspect | Frequentist | Bayesian |
|--------|-------------|----------|
| Probability | Long-run frequency | Degree of belief |
| Parameters | Fixed (unknown) constants | Random variables with distributions |
| Inference | P(data | H₀) | P(H₁ | data) |
| Uncertainty | Confidence intervals | Credible intervals |
| Prior | Not used | Explicitly required |
| Interpretation | "95% CI contains μ in 95% of repeated samples" | "95% probability μ is in this interval" |

## Priors

### Types of Priors

```python
import pymc as pm
import arviz as az
import numpy as np

# Non-informative / flat prior
# Uniform: equal weight to all values (improper if unbounded)
beta_flat = pm.Uniform("beta", lower=-100, upper=100)

# Weakly informative prior
# Provides mild regularization, dominates only when data is scarce
beta_weak = pm.Normal("beta", mu=0, sigma=10)

# Informative prior
# Strong prior from previous studies or domain knowledge
beta_info = pm.Normal("beta", mu=0.5, sigma=0.1)

# Conjugate prior
# Prior and posterior are same family, closed-form update
# Beta prior for Bernoulli likelihood → Beta posterior
```

### Conjugate Prior Pairs

| Likelihood | Conjugate Prior | Posterior Parameters |
|------------|----------------|---------------------|
| Bernoulli / Binomial | Beta(α, β) | Beta(α + k, β + n - k) |
| Poisson | Gamma(α, β) | Gamma(α + Σk, β + n) |
| Normal (known σ²) | Normal(μ₀, σ₀²) | Normal(W*MLE + (1-W)*μ₀, (1/σ₀² + n/σ²)⁻¹) |
| Normal (known μ) | Inverse-Gamma | Inverse-Gamma |
| Exponential | Gamma(α, β) | Gamma(α + n, β + Σx) |
| Multinomial | Dirichlet(α) | Dirichlet(α + counts) |

### Prior Selection Guidelines
- Start with weakly informative priors (e.g., Normal(0, 1) for logistic regression coefficients)
- Use domain knowledge for informative priors
- Perform prior predictive checks to ensure plausibility
- Sensitivity analysis: test multiple prior specifications
- Avoid flat improper priors for variance components

## Bayesian A/B Testing

### Beta-Binomial Model (Proportion Metric)
```python
def bayesian_ab_test(conversions_a, trials_a, conversions_b, trials_b,
                     alpha_prior=1, beta_prior=1, n_simulations=50000):
    # Posterior distributions
    alpha_a_post = alpha_prior + conversions_a
    beta_a_post = beta_prior + trials_a - conversions_a
    alpha_b_post = alpha_prior + conversions_b
    beta_b_post = beta_prior + trials_b - conversions_b

    a_samples = np.random.beta(alpha_a_post, beta_a_post, n_simulations)
    b_samples = np.random.beta(alpha_b_post, beta_b_post, n_simulations)

    prob_b_better = np.mean(b_samples > a_samples)
    expected_loss = np.mean(np.maximum(0, a_samples - b_samples))
    lift = (b_samples / a_samples) - 1
    lift_ci = np.percentile(lift, [2.5, 97.5])

    return {
        "prob_b_better": prob_b_better,
        "expected_loss": expected_loss,
        "lift_mean": np.mean(lift),
        "lift_ci": lift_ci,
        "a_rate_sample_mean": np.mean(a_samples),
        "b_rate_sample_mean": np.mean(b_samples)
    }
```

### Normal Model (Continuous Metric)
```python
def bayesian_continuous(data_a, data_b, mu_prior=0, sigma_prior=100,
                        n_simulations=50000):
    n_a, n_b = len(data_a), len(data_b)
    mean_a, mean_b = np.mean(data_a), np.mean(data_b)
    var_a, var_b = np.var(data_a, ddof=1), np.var(data_b, ddof=1)

    # Semi-conjugate: sample from marginal posterior of variance, then mean
    nu_a, nu_b = n_a - 1, n_b - 1
    sigma2_a = 1 / np.random.gamma(nu_a/2, 2/(nu_a * var_a), n_simulations)
    sigma2_b = 1 / np.random.gamma(nu_b/2, 2/(nu_b * var_b), n_simulations)
    mu_a_sampled = np.random.normal(mean_a, np.sqrt(sigma2_a/n_a))
    mu_b_sampled = np.random.normal(mean_b, np.sqrt(sigma2_b/n_b))

    prob_b_better = np.mean(mu_b_sampled > mu_a_sampled)
    diff = mu_b_sampled - mu_a_sampled
    ci = np.percentile(diff, [2.5, 97.5])
    return {"prob_b_better": prob_b_better, "diff_ci": ci}
```

## MCMC (Markov Chain Monte Carlo)

### Why MCMC?
For most models, the posterior P(θ|D) = P(D|θ)P(θ) / ∫P(D|θ)P(θ)dθ has an intractable denominator. MCMC samples from the posterior without computing the integral.

### Metropolis-Hastings
```python
def metropolis_hastings(log_posterior, init, n_samples=10000, proposal_std=0.5):
    samples = np.zeros((n_samples, len(init)))
    current = np.array(init)
    current_logp = log_posterior(current)
    accepted = 0

    for i in range(n_samples):
        proposal = current + np.random.normal(0, proposal_std, size=len(init))
        proposal_logp = log_posterior(proposal)
        log_accept_ratio = proposal_logp - current_logp

        if np.log(np.random.uniform()) < log_accept_ratio:
            current, current_logp = proposal, proposal_logp
            accepted += 1
        samples[i] = current

    return {"samples": samples, "acceptance_rate": accepted / n_samples}
```

### PyMC Implementation
```python
import pymc as pm

def bayesian_linear_regression(X, y):
    with pm.Model() as model:
        # Priors
        alpha = pm.Normal("alpha", mu=0, sigma=10)
        beta = pm.Normal("beta", mu=0, sigma=5, shape=X.shape[1])
        sigma = pm.HalfNormal("sigma", sigma=5)

        # Linear predictor
        mu = alpha + pm.math.dot(X, beta)

        # Likelihood
        y_obs = pm.Normal("y_obs", mu=mu, sigma=sigma, observed=y)

        # Sampling
        trace = pm.sample(draws=2000, tune=1000, chains=4,
                          target_accept=0.9, return_inferencedata=True)

        # Posterior predictive
        ppc = pm.sample_posterior_predictive(trace, random_seed=42)

    return trace, ppc
```

### Convergence Diagnostics
```python
def check_convergence(trace):
    # R-hat (potential scale reduction factor): should be < 1.01
    rhat = az.rhat(trace)

    # ESS (effective sample size): should be > 400 per chain
    ess = az.ess(trace)

    # Trace plots
    az.plot_trace(trace)

    # Autocorrelation
    az.plot_autocorr(trace)

    # Geweke test
    geweke = az.geweke(trace)

    return {"rhat_max": float(max(rhat.values())), "ess_min": int(min(ess.values()))}
```

### MCMC Best Practices
- Run 4+ chains with dispersed starting values
- Discard warmup/burn-in (first 1000+ samples)
- Target acceptance rate: 0.8 for HMC/NUTS, 0.23 for Random Walk MH
- Check R-hat < 1.01 for all parameters
- Effective sample size > 100 per chain for reliable inference
- Thinning rarely needed (HMC samples are nearly independent)
- Use posterior predictive checks to validate model fit

## Credible vs Confidence Intervals

```python
# Bayesian credible interval: 95% probability parameter is in this range
ci_bayes = az.hdi(trace, hdi_prob=0.95)  # Highest Density Interval

# Equal-tailed interval (2.5th and 97.5th percentiles)
ci_equal = np.percentile(posterior_samples, [2.5, 97.5])

# HPD vs equal-tailed: HPD is narrowest interval containing 95% probability
```

95% credible interval: P(a < θ < b | data) = 0.95 (Bayesian)
95% confidence interval: P(CI contains θ) = 0.95 in repeated sampling (Frequentist)

## Hierarchical Models

```python
def hierarchical_model(data, group_idx):
    """Partial pooling: groups share information via hyperpriors."""
    n_groups = len(np.unique(group_idx))
    with pm.Model() as model:
        # Hyperpriors
        mu_global = pm.Normal("mu_global", mu=0, sigma=5)
        sigma_global = pm.HalfNormal("sigma_global", sigma=2)

        # Group-level parameters (shrinkage toward global mean)
        mu_group = pm.Normal("mu_group", mu=mu_global, sigma=sigma_global,
                             shape=n_groups)

        # Observation-level
        sigma_obs = pm.HalfNormal("sigma_obs", sigma=2)
        y = pm.Normal("y", mu=mu_group[group_idx], sigma=sigma_obs,
                      observed=data)

        trace = pm.sample(draws=2000, tune=1000, chains=4)
    return trace
```

## Model Comparison

### WAIC and LOO-CV
```python
# Widely Applicable Information Criterion
waic = az.waic(trace, model)

# Leave-One-Out Cross-Validation (approximated via PSIS)
loo = az.loo(trace, model)

# Compare multiple models
compare_dict = {"model1": trace1, "model2": trace2}
comparison = az.compare(compare_dict, ic="waic")
```

## Bayesian Decision Theory

```python
def decision_under_uncertainty(posterior_samples, loss_function):
    """Minimize expected loss under posterior distribution."""
    expected_loss = np.mean([loss_function(theta) for theta in posterior_samples])
    return expected_loss

# Example: optimal price under demand uncertainty
def expected_profit(price, demand_posterior):
    demand = demand_posterior  # samples from posterior of demand at this price
    profit = price * demand
    return np.mean(profit)
```

## Key Distributions

```python
# Beta: proportions, probabilities
# α=1, β=1 → Uniform
# α=0.5, β=0.5 → Jeffreys prior (invariant)
beta_dist = pm.Beta.dist(alpha=2, beta=5)

# Gamma: rate parameters, precision, counts
gamma_dist = pm.Gamma.dist(alpha=2, beta=0.5)

# Normal: means, coefficients
normal_dist = pm.Normal.dist(mu=0, sigma=1)

# HalfNormal: standard deviations (positive only)
halfnorm_dist = pm.HalfNormal.dist(sigma=2)

# Student-t: heavy-tailed alternatives
t_dist = pm.StudentT.dist(nu=3, mu=0, sigma=1)

# Dirichlet: categorical probabilities (K categories)
dirichlet_dist = pm.Dirichlet.dist(a=np.ones(5))
```

## Formulas
```
Bayes Theorem: P(θ|D) = P(D|θ)P(θ) / ∫P(D|θ)P(θ)dθ
Posterior Mean (normal-normal): μ_n = (μ₀/σ₀² + n·x̄/σ²) / (1/σ₀² + n/σ²)
Bayesian Point Estimate: minimize posterior expected loss
Bayesian Credible Interval: ∫ from a to b P(θ|D)dθ = 0.95
Bayes Factor: BF = P(D|H₁) / P(D|H₀)
```
