# Probability and Statistics for Machine Learning

## Probability Fundamentals

### Sample Space, Events, and Probability Measure

- **Sample space Ω**: set of all possible outcomes of an experiment
- **Event A**: subset of Ω, A ⊆ Ω
- **Probability measure ℙ**: function ℙ: ℱ → [0,1] where ℱ is a σ-algebra on Ω

### Kolmogorov Axioms

1. ℙ(A) ≥ 0 for all events A
2. ℙ(Ω) = 1
3. ℙ(∪_{i=1}^{∞} Aᵢ) = Σ_{i=1}^{∞} ℙ(Aᵢ) for pairwise disjoint events Aᵢ

Consequences: ℙ(∅) = 0, ℙ(A^c) = 1 - ℙ(A), ℙ(A ∪ B) = ℙ(A) + ℙ(B) - ℙ(A ∩ B)

### Joint, Conditional, and Marginal Probabilities

- **Joint**: ℙ(A, B) — probability both A and B occur
- **Conditional**: ℙ(A | B) = ℙ(A ∩ B) / ℙ(B), provided ℙ(B) > 0
- **Marginal**: ℙ(A) = Σᵢ ℙ(A, Bᵢ) for discrete B, or ℙ(A) = ∫ ℙ(A, B) dB for continuous

Law of Total Probability: ℙ(A) = Σᵢ ℙ(A | Bᵢ) ℙ(Bᵢ)

### Chain Rule (Product Rule)

ℙ(X₁, X₂, ..., X_n) = ℙ(X₁) · ℙ(X₂ | X₁) · ℙ(X₃ | X₁, X₂) · ... · ℙ(X_n | X₁, ..., X_{n-1})

More compactly: ℙ(X₁,...,X_n) = ℙ(X₁) ∏_{k=2}^{n} ℙ(X_k | X₁,...,X_{k-1})

### Independence

- **Unconditional independence**: ℙ(A, B) = ℙ(A) ℙ(B) — equivalent to ℙ(A|B) = ℙ(A)
- **Conditional independence**: ℙ(A, B | C) = ℙ(A | C) ℙ(B | C) — equivalently ℙ(A | B, C) = ℙ(A | C)
- Notation: A ⟂ B | C means A is conditionally independent of B given C

### Probability Rules Summary

| Rule | Formula |
|------|---------|
| Complement | ℙ(A^c) = 1 - ℙ(A) |
| Union | ℙ(A ∪ B) = ℙ(A) + ℙ(B) - ℙ(A ∩ B) |
| Intersection | ℙ(A ∩ B) = ℙ(A) ℙ(B | A) |
| Bayes | ℙ(A | B) = ℙ(B | A) ℙ(A) / ℙ(B) |
| Total prob. | ℙ(A) = Σᵢ ℙ(A | Bᵢ) ℙ(Bᵢ) |

---

## Random Variables

A random variable X: Ω → ℝ maps outcomes to real numbers.

### Discrete Random Variables

- **Probability Mass Function (PMF)**: p(x) = ℙ(X = x)
  - Properties: p(x) ≥ 0, Σ_x p(x) = 1
- **Cumulative Distribution Function (CDF)**: F(x) = ℙ(X ≤ x) = Σ_{t ≤ x} p(t)
  - Properties: non-decreasing, right-continuous, lim_{x→-∞} F(x) = 0, lim_{x→∞} F(x) = 1

### Continuous Random Variables

- **Probability Density Function (PDF)**: f(x) — not a probability, area under curve is probability
  - Properties: f(x) ≥ 0, ∫_{-∞}^{∞} f(x) dx = 1
- **CDF**: F(x) = ℙ(X ≤ x) = ∫_{-∞}^{x} f(t) dt
  - f(x) = d/dx F(x) (where derivative exists)

### Expectation

- **Discrete**: 𝔼[X] = Σ_x x · p(x)
- **Continuous**: 𝔼[X] = ∫_{-∞}^{∞} x · f(x) dx
- **Linearity**: 𝔼[aX + b] = a𝔼[X] + b, 𝔼[X + Y] = 𝔼[X] + 𝔼[Y]
- **Function of RV**: 𝔼[g(X)] = Σ g(x) p(x) (discrete) or ∫ g(x) f(x) dx (continuous)
- **Conditional expectation**: 𝔼[Y | X = x] = ∫ y f(y|x) dy; 𝔼[𝔼[Y|X]] = 𝔼[Y] (law of total expectation)

### Variance and Standard Deviation

- **Variance**: 𝕍[X] = 𝔼[(X - μ)²] = 𝔼[X²] - μ² where μ = 𝔼[X]
- **Standard deviation**: σ = √𝕍[X]
- **Properties**: 𝕍[aX + b] = a² 𝕍[X], 𝕍[X + Y] = 𝕍[X] + 𝕍[Y] + 2Cov(X,Y)

### Covariance and Correlation

- **Covariance**: Cov(X, Y) = 𝔼[(X - μ_X)(Y - μ_Y)] = 𝔼[XY] - μ_X μ_Y
- **Correlation coefficient**: ρ_{XY} = Cov(X, Y) / (σ_X σ_Y)
  - Properties: -1 ≤ ρ ≤ 1, ρ = ±1 iff Y = aX + b (linear relationship)
  - ρ = 0 does NOT imply independence, only lack of linear relationship
- **Covariance matrix**: Σ_{ij} = Cov(Xᵢ, Xⱼ) for random vector X

### Law of Large Numbers (LLN)

Let X₁, X₂, ..., X_n be i.i.d. with 𝔼[Xᵢ] = μ. Define sample mean X̄_n = (1/n) Σ_{i=1}^{n} Xᵢ.

- **Weak LLN**: X̄_n → μ in probability as n → ∞
  - lim_{n→∞} ℙ(|X̄_n - μ| > ε) = 0 for any ε > 0
- **Strong LLN**: X̄_n → μ almost surely as n → ∞
  - ℙ(lim_{n→∞} X̄_n = μ) = 1

### Central Limit Theorem (CLT)

Let X₁, ..., X_n be i.i.d. with 𝔼[Xᵢ] = μ and 𝕍[Xᵢ] = σ² < ∞. Then:

√n (X̄_n - μ) / σ → 𝒩(0, 1) in distribution as n → ∞

Equivalently: X̄_n ≈ 𝒩(μ, σ²/n) for large n

**Importance**: CLT justifies why Normal distributions appear everywhere — sums/averages of many independent random variables converge to Normal regardless of the original distribution.

```python
import numpy as np
from scipy import stats

def clt_demo(distribution="exponential", n_samples=1000, n_trials=10000):
    """Demonstrate CLT: sample means converge to Normal."""
    rng = np.random.default_rng(42)
    means = np.empty(n_trials)
    for i in range(n_trials):
        if distribution == "exponential":
            sample = rng.exponential(scale=2.0, size=n_samples)
        elif distribution == "uniform":
            sample = rng.uniform(0, 1, size=n_samples)
        elif distribution == "bernoulli":
            sample = rng.binomial(1, 0.3, size=n_samples)
        means[i] = sample.mean()

    # Compare to theoretical Normal
    mu = means.mean()
    sigma = means.std()
    print(f"Sample mean of means: {mu:.4f} (expected: {mu:.4f})")
    print(f"Sample std of means:  {sigma:.4f}")
    # QQ-plot would show straight line if Normal
    return means
```

---

## Important Probability Distributions

### Discrete Distributions

#### Bernoulli(p)

Models a single binary trial (coin flip).

- **PMF**: ℙ(X = 1) = p, ℙ(X = 0) = 1 - p
- **Parameters**: p ∈ [0, 1]
- **𝔼[X] = p**, **𝕍[X] = p(1 - p)**
- **MGF**: M(t) = 1 - p + p e^{t}
- **Connection**: Binary classification (logistic regression predicts p = ℙ(Y=1|x))

```python
from scipy.stats import bernoulli
p = 0.3
rv = bernoulli(p)
print(rv.pmf(1))   # 0.3
print(rv.rvs(10))  # 10 samples
```

#### Binomial(n, p)

Sum of n independent Bernoulli(p) trials. Number of successes in n trials.

- **PMF**: ℙ(X = k) = C(n, k) p^{k} (1 - p)^{n - k}, where C(n,k) = n!/(k!(n-k)!)
- **Parameters**: n ∈ ℕ, p ∈ [0, 1]
- **𝔼[X] = np**, **𝕍[X] = np(1 - p)**
- **Connection**: Accuracy score (number of correct predictions out of n)

```python
from scipy.stats import binom
n, p = 10, 0.5
rv = binom(n, p)
print(rv.pmf(5))    # ℙ(X=5)
print(rv.cdf(7))    # ℙ(X ≤ 7)
```

#### Categorical(π₁, ..., π_K)

Generalization of Bernoulli to K outcomes (single trial with K possibilities).

- **PMF**: ℙ(X = k) = π_k, with π_k ≥ 0, Σ_{k=1}^{K} π_k = 1
- **Parameters**: probability vector π ∈ Δ^{K-1} (simplex)
- **𝔼[1_{X=k}] = π_k**, **𝕍[1_{X=k}] = π_k(1 - π_k)**
- **Connection**: Multi-class classification, softmax output

```python
from scipy.stats import multinomial
# Single trial = categorical
probs = [0.2, 0.5, 0.3]
rv = multinomial(1, probs)  # n=1 for categorical
print(rv.rvs(5))  # shape (5, 3)
```

#### Poisson(λ)

Models count of rare events in a fixed interval.

- **PMF**: ℙ(X = k) = e^{-λ} λ^{k} / k!, k = 0, 1, 2, ...
- **Parameters**: λ > 0 (rate parameter)
- **𝔼[X] = λ**, **𝕍[X] = λ**
- **Connection**: Count data modeling, rare event prediction, neural network with Poisson loss

```python
from scipy.stats import poisson
lam = 3.0
rv = poisson(lam)
print(rv.pmf(2))   # ℙ(X=2)
print(rv.rvs(10))  # 10 samples
```

#### Geometric(p)

Number of trials until the first success.

- **PMF**: ℙ(X = k) = (1 - p)^{k-1} p, k = 1, 2, 3, ...
- **Parameters**: p ∈ (0, 1]
- **𝔼[X] = 1/p**, **𝕍[X] = (1 - p)/p²**
- **Connection**: Waiting time problems, survival analysis, hitting time in reinforcement learning

### Continuous Distributions

#### Normal (Gaussian) 𝒩(μ, σ²)

The most important distribution in statistics and ML. Central limit theorem ensures it emerges everywhere.

- **PDF**: f(x) = 1 / (σ √{2π}) · exp(-(x - μ)² / (2σ²))
- **Parameters**: μ ∈ ℝ (mean), σ > 0 (standard deviation)
- **𝔼[X] = μ**, **𝕍[X] = σ²**
- **Standard Normal**: 𝒩(0, 1), PDF φ(x) = (1/√{2π}) e^{-x²/2}, CDF Φ(x)
- **Connection**: MSE loss = -log 𝒩(y; ŷ, σ²) + const, linear regression assumes Gaussian errors, VAE latent prior, initialization schemes

```python
from scipy.stats import norm
mu, sigma = 0, 1
rv = norm(mu, sigma)
print(rv.pdf(0))     # φ(0) = 0.3989
print(rv.cdf(1.96))  # Φ(1.96) ≈ 0.975
print(rv.ppf(0.975)) # inverse CDF ≈ 1.96
print(rv.rvs(1000))  # 1000 samples
```

#### Multivariate Normal 𝒩(μ, Σ)

- **PDF**: f(x) = 1 / √{(2π)^{k} |Σ|} · exp(-½ (x - μ)^{T} Σ^{-1} (x - μ))
- **Parameters**: μ ∈ ℝ^{k} (mean vector), Σ ∈ ℝ^{k×k} (covariance matrix, PSD)
- **Mahalanobis distance**: (x - μ)^{T} Σ^{-1} (x - μ)
- **Connection**: Gaussian processes, VAE prior, factor analysis, linear discriminant analysis, Kalman filters

```python
from scipy.stats import multivariate_normal
import numpy as np
mu = np.array([0, 0])
Sigma = np.array([[1, 0.8], [0.8, 1]])
rv = multivariate_normal(mu, Sigma)
print(rv.pdf(np.array([0, 0])))
print(rv.rvs(5))
```

#### Exponential(λ)

Models waiting time between events in a Poisson process.

- **PDF**: f(x) = λ e^{-λ x}, x ≥ 0
- **CDF**: F(x) = 1 - e^{-λ x}
- **Parameters**: λ > 0 (rate parameter)
- **𝔼[X] = 1/λ**, **𝕍[X] = 1/λ²**
- **Memoryless property**: ℙ(X > s + t | X > t) = ℙ(X > s) — unique continuous distribution with this property
- **Connection**: Waiting times, survival analysis, stochastic processes

```python
from scipy.stats import expon
lam = 2.0
rv = expon(scale=1/lam)  # scale = 1/λ
print(rv.rvs(10))
```

#### Beta(α, β)

Distribution over [0, 1], flexible shapes depending on parameters.

- **PDF**: f(x) = x^{α-1} (1 - x)^{β-1} / B(α, β), where B(α, β) = Γ(α)Γ(β)/Γ(α+β)
- **Parameters**: α > 0, β > 0 (shape parameters)
- **𝔼[X] = α / (α + β)**, **𝕍[X] = αβ / ((α+β)²(α+β+1))**
- **Connection**: Conjugate prior for Bernoulli, Bayesian A/B testing, Thompson sampling, Bayesian optimization

```python
from scipy.stats import beta
a, b = 2, 5
rv = beta(a, b)
print(rv.mean())    # α/(α+β)
print(rv.rvs(1000))
```

#### Gamma(α, β)

Generalization of Exponential to sum of α exponentials.

- **PDF**: f(x) = β^{α} x^{α-1} e^{-βx} / Γ(α), x ≥ 0
- **Parameters**: α > 0 (shape), β > 0 (rate)
- **𝔼[X] = α/β**, **𝕍[X] = α/β²**
- **Special cases**: α = 1 → Exponential(β), α = n/2, β = 1/2 → χ²_n
- **Connection**: Conjugate prior for precision (1/σ²) of Normal distribution, Bayesian linear regression

```python
from scipy.stats import gamma
alpha, beta_rate = 2, 1
rv = gamma(alpha, scale=1/beta_rate)
print(rv.rvs(10))
```

#### Dirichlet(α₁, ..., α_K)

Multivariate generalization of Beta, distribution over probability simplex.

- **PDF**: f(x) = (1/B(α)) ∏_{i=1}^{K} x_i^{α_i - 1}, where x ∈ Δ^{K-1}
- **Parameters**: α_i > 0 (concentration parameters)
- **𝔼[X_i] = α_i / Σ α_j**
- **Connection**: Conjugate prior for Categorical, topic models (LDA), Dirichlet process mixtures

```python
from scipy.stats import dirichlet
alpha = [1, 2, 3]
rv = dirichlet(alpha)
print(rv.rvs(5))  # rows sum to 1
```

#### Laplace(μ, b)

Double-sided exponential, heavier tails than Normal.

- **PDF**: f(x) = (1 / 2b) exp(-|x - μ| / b)
- **Parameters**: μ ∈ ℝ (location), b > 0 (scale)
- **𝔼[X] = μ**, **𝕍[X] = 2b²**
- **Connection**: L1 regularization (Lasso) = Laplace prior MAP estimation

```python
from scipy.stats import laplace
mu, b = 0, 1
rv = laplace(mu, b)
print(rv.rvs(10))
```

#### Cauchy(μ, γ)

Heavy-tailed distribution. No finite moments (mean and variance undefined).

- **PDF**: f(x) = 1 / (πγ [1 + ((x-μ)/γ)²])
- **Parameters**: μ (location), γ > 0 (scale)
- **Connection**: Robust regression (heavy tails accommodate outliers), Bayesian robustness, ratio of Normals is Cauchy

```python
from scipy.stats import cauchy
rv = cauchy(0, 1)
print(rv.rvs(10))
```

### Distribution Cheat Sheet

| Distribution | Support | 𝔼[X] | 𝕍[X] | ML Connection |
|---|---|---|---|---|
| Bernoulli(p) | {0, 1} | p | p(1-p) | Binary classification |
| Binomial(n, p) | {0,...,n} | np | np(1-p) | Accuracy |
| Categorical(π) | {1,...,K} | π | — | Multi-class |
| Poisson(λ) | ℕ₀ | λ | λ | Count data |
| 𝒩(μ, σ²) | ℝ | μ | σ² | MSE, linear regression |
| Exponential(λ) | ℝ₊ | 1/λ | 1/λ² | Survival, waiting times |
| Beta(α, β) | [0, 1] | α/(α+β) | — | A/B testing, priors |
| Laplace(μ, b) | ℝ | μ | 2b² | L1 regularization |

---

## Bayes' Theorem

ℙ(A | B) = ℙ(B | A) ℙ(A) / ℙ(B)

### Bayesian Inference

ℙ(θ | X) = ℙ(X | θ) ℙ(θ) / ℙ(X)

```
Posterior ∝ Likelihood × Prior
```

Where ℙ(X) = ∫ ℙ(X | θ) ℙ(θ) dθ is the marginal likelihood (evidence), a normalizing constant.

- **Prior** ℙ(θ): beliefs about θ before seeing data
- **Likelihood** ℙ(X | θ): how probable is data given parameters
- **Posterior** ℙ(θ | X): updated beliefs after seeing data

### Conjugate Priors

When prior and posterior belong to the same distribution family.

| Likelihood | Conjugate Prior | Posterior |
|---|---|---|
| Bernoulli(p) | Beta(α, β) | Beta(α + Σxᵢ, β + n - Σxᵢ) |
| Binomial(n, p) | Beta(α, β) | Beta(α + Σxᵢ, β + Σ(nᵢ - xᵢ)) |
| 𝒩(μ | σ² known) | 𝒩(μ₀, σ₀²) | 𝒩((μ₀/σ₀² + Σxᵢ/σ²) / (1/σ₀² + n/σ²), 1/(1/σ₀² + n/σ²)) |
| Poisson(λ) | Gamma(α, β) | Gamma(α + Σxᵢ, β + n) |
| Exponential(λ) | Gamma(α, β) | Gamma(α + n, β + Σxᵢ) |
| Categorical(π) | Dirichlet(α) | Dirichlet(α + counts) |
| 𝒩(0, 1/τ) (precision τ) | Gamma(α, β) | Gamma(α + n/2, β + ½Σxᵢ²) |

### MAP Estimation

Maximum a Posteriori:

θ_MAP = argmax_θ ℙ(θ | X) = argmax_θ [log ℙ(X | θ) + log ℙ(θ)]

Connection to regularization:
- **L2 regularization** (weight decay) → Gaussian prior on weights
- **L1 regularization** (Lasso) → Laplace prior on weights (sharper at 0, encourages sparsity)

```python
import numpy as np
from scipy.stats import beta as beta_dist
import matplotlib.pyplot as plt

def bayesian_beta_bernoulli(prior_alpha=1, prior_beta=1, observations=None):
    """Beta-Bernoulli conjugate: update beliefs about coin bias."""
    if observations is None:
        observations = [1, 1, 0, 1, 0, 0, 1, 1, 1, 0]
    n = len(observations)
    heads = sum(observations)

    posterior_alpha = prior_alpha + heads
    posterior_beta = prior_beta + n - heads

    posterior = beta_dist(posterior_alpha, posterior_beta)
    print(f"Prior: Beta({prior_alpha}, {prior_beta})")
    print(f"Likelihood: {heads} heads in {n} tosses")
    print(f"Posterior: Beta({posterior_alpha}, {posterior_beta})")
    print(f"Posterior mean: {posterior.mean():.4f}")
    print(f"Posterior 95% CI: {posterior.ppf(0.025):.4f} to {posterior.ppf(0.975):.4f}")
    return posterior

bayesian_beta_bernoulli()
```

---

## Maximum Likelihood Estimation (MLE)

θ_MLE = argmax_θ ℙ(X | θ) = argmax_θ log ℙ(X | θ)

Maximizing likelihood = minimizing negative log-likelihood (NLL).

### MLE and Loss Functions

| Model | Likelihood | NLL ⇔ Loss |
|---|---|---|
| Linear regression | 𝒩(y; ŷ, σ²) | MSE / 2σ² + const |
| Logistic regression | Bernoulli(y; p) | Binary cross-entropy |
| Softmax classifier | Categorical(y; π) | Categorical cross-entropy |
| Poisson regression | Poisson(y; λ) | Poisson loss |

### MLE Examples

**Gaussian**: X₁, ..., X_n ∼ 𝒩(μ, σ²)
- μ_MLE = (1/n) Σ xᵢ
- σ²_MLE = (1/n) Σ (xᵢ - μ_MLE)² (biased — divide by n-1 for unbiased)

**Bernoulli**: X₁, ..., X_n ∼ Bernoulli(p)
- p_MLE = (1/n) Σ yᵢ = proportion of successes

**Categorical**: X₁, ..., X_n ∼ Categorical(π)
- π_k_MLE = count_k / n

```python
import numpy as np
from scipy.stats import norm

def mle_gaussian(data):
    """MLE for Gaussian parameters."""
    mu_hat = data.mean()
    sigma2_hat = ((data - mu_hat) ** 2).mean()  # MLE (biased)
    sigma2_unbiased = ((data - mu_hat) ** 2).sum() / (len(data) - 1)
    return mu_hat, sigma2_hat, sigma2_unbiased

def mle_bernoulli(data):
    """MLE for Bernoulli parameter."""
    return data.mean()

# Demo
rng = np.random.default_rng(42)
true_mu, true_sigma = 5.0, 2.0
data = rng.normal(true_mu, true_sigma, 1000)
mu_hat, s2_hat, s2_unb = mle_gaussian(data)
print(f"True μ={true_mu}, MLE μ̂={mu_hat:.4f}")
print(f"True σ²={true_sigma**2}, MLE σ̂²={s2_hat:.4f}, Unbiased σ²={s2_unb:.4f}")
```

---

## Hypothesis Testing

### Framework

- **Null hypothesis H₀**: default assumption (no effect, no difference)
- **Alternative hypothesis H₁**: what we want to prove
- **Test statistic**: computed from data
- **p-value**: ℙ(data at least as extreme | H₀ true) — probability of observing data this extreme if H₀ is true
- **Significance level α**: threshold for rejecting H₀ (typically 0.05)

### Errors

| Decision | H₀ True | H₁ True |
|---|---|---|
| Reject H₀ | Type I error (false positive) | Correct! |
| Fail to reject H₀ | Correct! | Type II error (false negative) |

- Type I error rate = α (significance level)
- Power = 1 - β where β = Type II error rate

### Common Tests

#### t-test (Student's t)

Compare means of two groups. Assumes approximately Normal data.

t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)

- **Independent t-test**: two independent groups
- **Paired t-test**: same subjects measured twice
- **One-sample t-test**: sample mean vs population mean

```python
from scipy.stats import ttest_ind, ttest_rel

rng = np.random.default_rng(42)
group_a = rng.normal(100, 15, 50)
group_b = rng.normal(108, 15, 50)

t_stat, p_value = ttest_ind(group_a, group_b)
print(f"t = {t_stat:.4f}, p = {p_value:.4f}")
print("Significant" if p_value < 0.05 else "Not significant")
```

#### χ²-test

Tests independence of categorical variables.

χ² = Σᵢⱼ (Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ

Where Oᵢⱼ = observed count, Eᵢⱼ = row_total × col_total / grand_total

```python
from scipy.stats import chi2_contingency

# Contingency table
observed = np.array([[30, 10], [20, 40]])
chi2, p, dof, expected = chi2_contingency(observed)
print(f"χ² = {chi2:.4f}, p = {p:.4f}")
print(f"Expected frequencies:\n{expected}")
```

#### ANOVA

Compare means across multiple groups simultaneously.

- **F-statistic**: F = (between-group variance) / (within-group variance)
- **One-way ANOVA**: one categorical factor
- **Two-way ANOVA**: two categorical factors + interaction

```python
from scipy.stats import f_oneway

rng = np.random.default_rng(42)
g1 = rng.normal(100, 15, 30)
g2 = rng.normal(105, 15, 30)
g3 = rng.normal(110, 15, 30)

F, p = f_oneway(g1, g2, g3)
print(f"F = {F:.4f}, p = {p:.4f}")
```

### Hypothesis Testing in ML

- **A/B testing**: two-sample t-test on conversion rates
- **Feature selection**: χ² test for independence between feature and target
- **Model comparison**: McNemar's test for paired classification results
- **ANOVA for feature importance**: compare model performance with/without feature

---

## Bias-Variance Decomposition

### Decomposition

For estimator ŷ(x) trained on random dataset D, with true function y = f(x) + ε, where 𝔼[ε] = 0 and 𝕍[ε] = σ²:

𝔼_D[(y - ŷ_D(x))²] = (Bias[ŷ(x)])² + 𝕍[ŷ(x)] + σ²

Where:
- **Bias[ŷ(x)]** = 𝔼_D[ŷ_D(x)] - f(x) — how wrong the model is on average
- **𝕍[ŷ(x)]** = 𝔼_D[(ŷ_D(x) - 𝔼_D[ŷ_D(x)])²] — how much predictions vary across training sets
- **σ²** = irreducible error (Bayes error rate)

### Interpretation

| Regime | Bias | Variance | Model |
|---|---|---|---|
| Underfitting | High | Low | Too simple (e.g., linear on nonlinear data) |
| Overfitting | Low | High | Too complex (e.g., deep tree on small data) |

**Tradeoff**: Increasing model complexity reduces bias but increases variance. Optimal complexity minimizes total error.

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

def bias_variance_demo(n_datasets=500, n_train=50, degree=3):
    """Demonstrate bias-variance tradeoff with polynomial regression."""
    rng = np.random.default_rng(42)
    x_true = np.linspace(-3, 3, 200)
    f_true = np.sin(x_true)

    # Generate many datasets and fit a model to each
    x_train_full = np.linspace(-3, 3, n_train)
    predictions = np.zeros((n_datasets, len(x_true)))

    for i in range(n_datasets):
        y_train = np.sin(x_train_full) + rng.normal(0, 0.3, n_train)
        model = make_pipeline(
            PolynomialFeatures(degree, include_bias=False),
            LinearRegression()
        )
        model.fit(x_train_full.reshape(-1, 1), y_train)
        predictions[i] = model.predict(x_true.reshape(-1, 1))

    # Decompose
    expected_y = predictions.mean(axis=0)
    bias_squared = (expected_y - f_true) ** 2
    variance = predictions.var(axis=0, ddof=1)
    total_error = bias_squared + variance + 0.3**2

    print(f"Degree {degree}:")
    print(f"  Avg bias²:    {bias_squared.mean():.4f}")
    print(f"  Avg variance: {variance.mean():.4f}")
    print(f"  Avg total err: {total_error.mean():.4f}")

    return bias_squared.mean(), variance.mean(), total_error.mean()

for d in [1, 3, 10]:
    bias_variance_demo(degree=d)
```

### Reducing Error

| Method | Effect | Technique |
|---|---|---|
| Regularization | Reduces variance, increases bias | L1/L2 weight penalty |
| Ensembling (Bagging) | Reduces variance | Random Forest, Bootstrap aggregating |
| Ensembling (Boosting) | Reduces bias | Gradient Boosting, AdaBoost |
| More data | Reduces variance | Data augmentation |
| Feature selection | Reduces variance | Removing irrelevant features |

---

## Statistical Inference

### Point Estimation

Single best guess for parameter θ:
- **MLE**: maximize likelihood
- **MAP**: maximize posterior = MLE + prior
- **Method of moments**: equate sample moments to population moments
- **Bayesian estimator**: posterior mean, median, or mode

### Confidence Intervals

Range [L, U] that contains the true parameter with probability 1 - α across repeated sampling.

For sample mean X̄ ∼ 𝒩(μ, σ²/n):
CI = X̄ ± z_{α/2} · σ / √n

- **Frequentist interpretation**: 95% of CIs constructed this way contain the true μ
- **t-interval**: use t_{n-1, α/2} when σ² is unknown (use sample std s)

```python
from scipy.stats import norm, t as t_dist

def confidence_interval(data, alpha=0.05):
    """Compute confidence interval for the mean."""
    n = len(data)
    mu = data.mean()
    se = data.std(ddof=1) / np.sqrt(n)
    z = norm.ppf(1 - alpha/2)
    return mu - z * se, mu + z * se

def t_confidence_interval(data, alpha=0.05):
    """t-interval when σ is unknown."""
    n = len(data)
    mu = data.mean()
    se = data.std(ddof=1) / np.sqrt(n)
    t_val = t_dist.ppf(1 - alpha/2, df=n-1)
    return mu - t_val * se, mu + t_val * se
```

### Bayesian Credible Intervals

ℙ(θ ∈ [a, b] | X) = 1 - α

- **Interpretation**: There is a 1 - α probability that θ lies in [a, b] given the observed data
- Conceptually different from confidence intervals (which are about the procedure, not the specific interval)

### Bootstrap

Non-parametric method to estimate sampling distribution by resampling with replacement from observed data.

```python
def bootstrap_ci(data, statistic=np.mean, n_bootstrap=10000, alpha=0.05):
    """Bootstrap confidence interval for any statistic."""
    rng = np.random.default_rng(42)
    n = len(data)
    boot_stats = np.empty(n_bootstrap)
    for i in range(n_bootstrap):
        sample = rng.choice(data, size=n, replace=True)
        boot_stats[i] = statistic(sample)

    # Percentile interval
    lower = np.percentile(boot_stats, 100 * alpha / 2)
    upper = np.percentile(boot_stats, 100 * (1 - alpha / 2))
    return lower, upper, boot_stats

# Demo
rng = np.random.default_rng(42)
data = rng.exponential(scale=2, size=100)
ci_low, ci_high, stats = bootstrap_ci(data, statistic=np.median)
print(f"Median: {np.median(data):.4f}")
print(f"95% Bootstrap CI: [{ci_low:.4f}, {ci_high:.4f}]")
```

---

## Sampling and Monte Carlo

### Inverse Transform Sampling

Generate samples from any continuous distribution given its CDF F.

1. Sample U ∼ Uniform(0, 1)
2. Return X = F^{-1}(U)

```python
def inverse_transform_sampling(n=1000):
    """Sample from Exponential(λ=1) via inverse transform."""
    rng = np.random.default_rng(42)
    u = rng.uniform(0, 1, n)
    # For Exponential(1): F^{-1}(u) = -ln(1-u)
    return -np.log(1 - u)
```

### Rejection Sampling

Sample from f(x) using proposal distribution q(x) with M such that f(x) ≤ M·q(x).

1. Sample x ∼ q(x)
2. Sample u ∼ Uniform(0, 1)
3. Accept x if u < f(x) / (M·q(x))

```python
def rejection_sampling(n=1000, target_pdf=None, proposal=None, M=2.0):
    """Rejection sampling from arbitrary PDF."""
    if target_pdf is None:
        target_pdf = lambda x: 0.5 * np.exp(-np.abs(x))  # Laplace(0,1)
    if proposal is None:
        proposal = lambda n: np.random.default_rng().normal(0, 2, n)

    rng = np.random.default_rng(42)
    samples = []
    while len(samples) < n:
        x_candidates = proposal(n * 2)
        u = rng.uniform(0, 1, len(x_candidates))
        q_vals = np.exp(-0.5 * (x_candidates / 2) ** 2) / np.sqrt(8 * np.pi)
        accept = u < target_pdf(x_candidates) / (M * q_vals)
        samples.extend(x_candidates[accept].tolist())
    return np.array(samples[:n])
```

### Importance Sampling

Estimate 𝔼_{x∼p}[f(x)] using samples from a different distribution q.

𝔼_{x∼p}[f(x)] ≈ (1/N) Σ_{i=1}^{N} f(xᵢ) · p(xᵢ) / q(xᵢ), where xᵢ ∼ q

```python
def importance_sampling(f, p_pdf, q_pdf, q_sampler, n=10000):
    """Estimate 𝔼_{x∼p}[f(x)] using IS."""
    rng = np.random.default_rng(42)
    x = q_sampler(n)
    weights = p_pdf(x) / q_pdf(x)
    estimate = (f(x) * weights).mean()
    # Effective sample size
    ess = n / (1 + np.var(weights) / np.mean(weights)**2)
    return estimate, ess
```

### Markov Chain Monte Carlo (MCMC)

#### Metropolis-Hastings

1. Initialize θ₀
2. For t = 1, ..., T:
   - Propose θ* ∼ q(θ* | θ_{t-1})
   - Compute acceptance: α = min(1, p(θ* | X) · q(θ_{t-1} | θ*) / (p(θ_{t-1} | X) · q(θ* | θ_{t-1})))
   - Accept θ* with probability α, else θ_t = θ_{t-1}

```python
def metropolis_hastings(log_posterior, n_samples=10000, proposal_std=0.5,
                        initial=0.0):
    """Metropolis-Hastings MCMC sampler."""
    rng = np.random.default_rng(42)
    samples = np.zeros(n_samples)
    current = initial
    log_current = log_posterior(current)
    n_accepted = 0

    for i in range(n_samples):
        proposal = current + rng.normal(0, proposal_std)
        log_proposal = log_posterior(proposal)

        log_alpha = log_proposal - log_current
        if np.log(rng.uniform()) < log_alpha:
            current = proposal
            log_current = log_proposal
            n_accepted += 1

        samples[i] = current

    accept_rate = n_accepted / n_samples
    return samples, accept_rate

# Demo: sample from 𝒩(3, 1) using MH
def log_posterior_normal(x):
    return -0.5 * (x - 3)**2

samples, rate = metropolis_hastings(log_posterior_normal)
print(f"Acceptance rate: {rate:.3f}")
print(f"Estimated mean: {samples.mean():.3f} (true: 3)")
```

### Connection to ML

| Method | ML Application |
|---|---|
| Inverse transform | Sampling from any parametric distribution |
| Rejection sampling | Sampling from truncated distributions |
| Importance sampling | Off-policy RL, rare event simulation |
| MCMC (HMC) | Bayesian neural network inference, probabilistic programming (Pyro, Stan) |
| Gibbs sampling | Topic models (LDA), graphical model inference |

---

## Key Formulas Quick Reference

| Concept | Formula |
|---|---|
| Expectation | 𝔼[X] = Σ x p(x) or ∫ x f(x) dx |
| Variance | 𝕍[X] = 𝔼[(X - μ)²] = 𝔼[X²] - μ² |
| Covariance | Cov(X,Y) = 𝔼[(X - μ_X)(Y - μ_Y)] |
| Correlation | ρ = Cov(X,Y) / (σ_X σ_Y) |
| Bayes theorem | ℙ(θ|X) = ℙ(X|θ)ℙ(θ) / ℙ(X) |
| CLT | √n(X̄ - μ)/σ → 𝒩(0, 1) |
| Bias-variance | Error = Bias² + Variance + σ² |
| MLE | θ̂ = argmax log ℙ(X|θ) |
| Bernoulli MLE | p̂ = (1/n) Σ yᵢ |
| Gaussian MLE | μ̂ = (1/n) Σ xᵢ, σ̂² = (1/n) Σ (xᵢ - μ̂)² |

---

## Python Library Mapping

| Operation | NumPy | SciPy |
|---|---|---|
| Random samples | `np.random.Generator` | `scipy.stats.distribution.rvs` |
| PDF/PMF | — | `scipy.stats.distribution.pmf/pdf` |
| CDF | — | `scipy.stats.distribution.cdf` |
| Quantile (inverse CDF) | — | `scipy.stats.distribution.ppf` |
| Parameter estimation | — | `scipy.stats.distribution.fit` |
| t-test | — | `scipy.stats.ttest_ind` |
| χ² test | — | `scipy.stats.chi2_contingency` |
| Correlation | `np.corrcoef` | `scipy.stats.pearsonr` |
| Covariance | `np.cov` | — |
| Distribution statistics | — | `scipy.stats.describe` |
| Empirical CDF | — | `scipy.stats.ecdf` |
