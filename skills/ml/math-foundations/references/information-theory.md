# Information Theory for Machine Learning

Information theory quantifies uncertainty, information content, and the cost of representing and transmitting data. It underpins loss functions, model selection, and representation learning in ML.

---

## Entropy — Uncertainty Measure

### Definition

For a discrete random variable X with PMF p(x):

H(X) = - Σ_{x} p(x) log₂ p(x)  (bits)

H(X) = - Σ_{x} p(x) ln p(x)     (nats)

**Interpretation**:
- Average information content (surprise) of X
- Expected number of bits needed to optimally encode X
- Uncertainty about X before observing it

### Binary Entropy

For X ∼ Bernoulli(p):

H₂(p) = -p log₂ p - (1-p) log₂(1-p)

H₂(0) = H₂(1) = 0 (no uncertainty — outcome is certain)
H₂(0.5) = 1 bit (maximum uncertainty, one bit needed)

```python
import numpy as np
from scipy.stats import entropy as scipy_entropy

def binary_entropy(p):
    """Binary entropy in bits."""
    p = np.clip(p, 1e-12, 1 - 1e-12)
    return -p * np.log2(p) - (1 - p) * np.log2(1 - p)

# Verify: H(0.5) = 1 bit
print(f"H₂(0.5) = {binary_entropy(0.5):.4f} bits")
```

### Properties

1. **Non-negativity**: H(X) ≥ 0 (equality iff X is deterministic)
2. **Maximum at uniform**: H(X) ≤ log |X|, equality iff p(x) = 1/|X| for all x
3. **Invariance**: H(X) depends only on the distribution, not the actual values
4. **Additivity for independent**: H(X, Y) = H(X) + H(Y) iff X ⟂ Y

### Joint Entropy

H(X, Y) = - Σ_{x} Σ_{y} p(x, y) log p(x, y)

- Measures uncertainty about the pair (X, Y)
- H(X, Y) ≤ H(X) + H(Y) (equality iff X ⟂ Y)
- H(X, Y) ≥ max(H(X), H(Y))

### Conditional Entropy

H(Y | X) = Σ_{x} p(x) H(Y | X = x) = - Σ_{x} Σ_{y} p(x, y) log p(y | x)

- Expected uncertainty about Y after observing X
- H(Y | X) = H(X, Y) - H(X)
- H(Y | X) ≤ H(Y) (information never hurts — conditioning reduces or maintains entropy)
- H(Y | X) = 0 iff Y is a function of X

### Chain Rule for Entropy

H(X₁, X₂, ..., X_n) = Σ_{i=1}^{n} H(Xᵢ | X₁, ..., X_{i-1})

```python
def entropy(probs, base=2):
    """Compute entropy H(X) in given base."""
    probs = np.asarray(probs, dtype=np.float64)
    probs = probs[probs > 0]
    return -np.sum(probs * np.log(probs)) / np.log(base)

def joint_entropy(joint_probs, base=2):
    """Compute joint entropy H(X,Y)."""
    return entropy(joint_probs.flatten(), base)

def conditional_entropy(joint_probs, base=2):
    """Compute H(Y|X) from joint probability matrix P(X,Y)."""
    joint = np.asarray(joint_probs, dtype=np.float64)
    marginal_x = joint.sum(axis=1)
    # H(Y|X) = H(X,Y) - H(X)
    h_joint = joint_entropy(joint, base)
    h_x = entropy(marginal_x, base)
    return h_joint - h_x

# Example
pxy = np.array([[0.25, 0.1], [0.15, 0.5]])
print(f"H(X,Y) = {joint_entropy(pxy):.4f}")
print(f"H(Y|X) = {conditional_entropy(pxy):.4f}")
print(f"Verify: {scipy_entropy(pxy.flatten(), base=2):.4f}")
```

---

## Cross-Entropy — Expected Code Length Under Wrong Model

### Definition

H(p, q) = - Σ_{x} p(x) log q(x) = H(p) + D_KL(p ‖ q)

- p = true distribution, q = estimated/approximate distribution
- Expected number of bits needed to encode data from p using code optimized for q

### Properties

- H(p, q) ≥ H(p) (equality iff p = q)
- Not symmetric: H(p, q) ≠ H(q, p)
- Minimizing cross-entropy = minimizing KL divergence (since H(p) is constant w.r.t. q)

### Connection to Classification

**Binary classification**: For true label y ∈ {0, 1} and predicted probability p = ℙ(Y = 1):

BCE = -y log p - (1 - y) log(1 - p)

**Multi-class classification**: For one-hot label y and predicted probabilities p:

CCE = - Σ_{i=1}^{K} yᵢ log pᵢ

**Cross-entropy loss = Negative log-likelihood** under Bernoulli/Categorical models.

```python
def cross_entropy(p, q, base=2):
    """H(p, q) = -Σ p(x) log q(x)."""
    p = np.asarray(p, dtype=np.float64)
    q = np.asarray(q, dtype=np.float64)
    q = np.clip(q, 1e-12, 1)  # avoid log(0)
    return -np.sum(p * np.log(q)) / np.log(base)

def binary_cross_entropy(y_true, y_pred):
    """Binary cross-entropy loss."""
    y_pred = np.clip(y_pred, 1e-12, 1 - 1e-12)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))

def categorical_cross_entropy(y_true, y_pred):
    """Categorical cross-entropy loss."""
    y_pred = np.clip(y_pred, 1e-12, 1)
    return -np.mean(np.sum(y_true * np.log(y_pred), axis=1))

# Example: true distribution vs model prediction
p_true = np.array([0.5, 0.3, 0.2])
q_model = np.array([0.4, 0.4, 0.2])
print(f"Cross-entropy: {cross_entropy(p_true, q_model):.4f} bits")
print(f"True entropy:  {entropy(p_true):.4f} bits")
print(f"KL divergence: {cross_entropy(p_true, q_model) - entropy(p_true):.4f} bits")

# Binary cross-entropy demo
y = np.array([1, 0, 1, 1, 0])
p = np.array([0.9, 0.2, 0.8, 0.7, 0.1])
print(f"BCE: {binary_cross_entropy(y, p):.4f}")
```

---

## KL Divergence — How One Distribution Differs from Another

### Definition

D_KL(p ‖ q) = Σ_{x} p(x) log(p(x) / q(x)) = Σ p(x) log p(x) - Σ p(x) log q(x)

### Properties

1. **Non-negativity**: D_KL(p ‖ q) ≥ 0 (Gibbs' inequality), equality iff p = q almost everywhere
2. **Not a metric**: Not symmetric (D_KL(p‖q) ≠ D_KL(q‖p)), does not satisfy triangle inequality
3. **Chain rule**: D_KL(p(x,y) ‖ q(x,y)) = D_KL(p(x) ‖ q(x)) + D_KL(p(y|x) ‖ q(y|x))

### Forward vs Reverse KL

**Forward KL D_KL(p ‖ q) — mean-seeking**:
- Averaging (moment matching) behavior — q averages across modes of p
- Used when q is the approximation (VI ELBO derivation)
- q(x) > 0 wherever p(x) > 0 (zero-avoiding)

**Reverse KL D_KL(q ‖ p) — mode-seeking**:
- q concentrates on a single mode of p
- q(x) = 0 wherever p(x) = 0 (zero-forcing)
- Used in variational inference (approximate q to match p)

```python
def kl_divergence(p, q, base=2):
    """D_KL(p ‖ q)."""
    p = np.asarray(p, dtype=np.float64)
    q = np.asarray(q, dtype=np.float64)
    p = p[p > 0]
    q = q[p > 0]  # align after filtering
    q = np.clip(q, 1e-12, 1)
    return np.sum(p * np.log(p / q)) / np.log(base)

# Compare forward and reverse KL
p_dist = np.array([0.9, 0.05, 0.05])  # peaked
q_dist = np.array([0.4, 0.3, 0.3])    # spread

print(f"Forward KL:  D_KL(p‖q) = {kl_divergence(p_dist, q_dist):.4f}")
print(f"Reverse KL:  D_KL(q‖p) = {kl_divergence(q_dist, p_dist):.4f}")
```

### Connection to ML

| Method | KL Term | Direction |
|---|---|---|
| VAE loss | D_KL(q(z|x) ‖ p(z)) | Reverse KL (mode-seeking) |
| Variational inference | D_KL(q(θ) ‖ p(θ|X)) | Reverse KL |
| Model distillation | D_KL(p_teacher ‖ p_student) | Forward KL |
| Maximum likelihood | min D_KL(p_data ‖ p_model) | Forward KL |

---

## Mutual Information — Shared Information Between Variables

### Definition

I(X; Y) = D_KL(p(x, y) ‖ p(x) p(y))
         = Σ_{x} Σ_{y} p(x, y) log(p(x, y) / (p(x) p(y)))

### Equivalent Forms

I(X; Y) = H(X) - H(X | Y)   (uncertainty reduction about X from knowing Y)
I(X; Y) = H(Y) - H(Y | X)   (uncertainty reduction about Y from knowing X)
I(X; Y) = H(X) + H(Y) - H(X, Y)

### Properties

1. **Non-negativity**: I(X; Y) ≥ 0, equality iff X ⟂ Y (independent)
2. **Symmetry**: I(X; Y) = I(Y; X)
3. **Self-information**: I(X; X) = H(X) (information is uncertainty)
4. **Data processing inequality**: If X → Y → Z (Markov chain), then I(X; Y) ≥ I(X; Z)

### Chain Rule for Mutual Information

I(X₁, X₂; Y) = I(X₁; Y) + I(X₂; Y | X₁)

```python
def mutual_information(joint_probs, base=2):
    """I(X;Y) from joint probability matrix P(X,Y)."""
    joint = np.asarray(joint_probs, dtype=np.float64)
    marginal_x = joint.sum(axis=1, keepdims=True)   # p(x)
    marginal_y = joint.sum(axis=0, keepdims=True)   # p(y)
    product = marginal_x @ marginal_y                # p(x)p(y)
    # Only entries where joint > 0
    mask = joint > 0
    result = np.sum(joint[mask] * np.log(joint[mask] / product[mask]))
    return result / np.log(base)

def mutual_info_continuous(x, y, bins=20, base=2):
    """Estimate I(X;Y) for continuous variables via histogram binning."""
    joint_hist, _, _ = np.histogram2d(x, y, bins=bins, density=True)
    return mutual_information(joint_hist, base)

# Example
pxy = np.array([[0.3, 0.05], [0.05, 0.6]])
print(f"I(X;Y) = {mutual_information(pxy):.4f} bits")
print(f"H(X)   = {entropy(pxy.sum(axis=1)):.4f} bits")
print(f"H(Y)   = {entropy(pxy.sum(axis=0)):.4f} bits")
print(f"H(X,Y) = {joint_entropy(pxy):.4f} bits")
print(f"I = H(X)+H(Y)-H(X,Y) = {entropy(pxy.sum(axis=1)) + entropy(pxy.sum(axis=0)) - joint_entropy(pxy):.4f} bits")

# Independence test
rng = np.random.default_rng(42)
x = rng.normal(0, 1, 1000)
y_corr = 0.7 * x + 0.3 * rng.normal(0, 1, 1000)  # correlated
y_indep = rng.normal(0, 1, 1000)                    # independent
print(f"I(correlated):    {mutual_info_continuous(x, y_corr):.4f} bits")
print(f"I(independent):   {mutual_info_continuous(x, y_indep):.4f} bits")
```

### Connection to ML

| Application | MI Role |
|---|---|
| Feature selection | Maximize I(feature; target), minimize I(features) |
| Decision trees | Information gain = ΔI(split; label) = H(parent) - Σ weighted H(child) |
| InfoGAN | Maximize I(latent code; generated data) |
| Representation learning | InfoNCE loss maximizes MI between views (contrastive learning) |
| Mutual information neural estimation (MINE) | Train network to estimate I(X;Y) |

---

## Jensen-Shannon Divergence

### Definition

D_JS(p ‖ q) = ½ D_KL(p ‖ m) + ½ D_KL(q ‖ m), where m = (p + q) / 2

### Properties

1. **Symmetric**: D_JS(p ‖ q) = D_JS(q ‖ p)
2. **Bounded**: 0 ≤ D_JS(p ‖ q) ≤ ln 2 (or log₂ 2 = 1 bit)
3. **Square root of JS** is a metric (satisfies triangle inequality)
4. **Smoother**: Unlike KL, JS divergence is finite even when supports are disjoint

```python
def js_divergence(p, q, base=2):
    """Jensen-Shannon divergence D_JS(p‖q)."""
    p = np.asarray(p, dtype=np.float64)
    q = np.asarray(q, dtype=np.float64)
    m = 0.5 * (p + q)
    return 0.5 * kl_divergence(p, m, base) + 0.5 * kl_divergence(q, m, base)

# Compare KL vs JS on disjoint supports
p = np.array([1.0, 0.0, 0.0])
q = np.array([0.0, 0.0, 1.0])
print(f"D_KL(p‖q) = {kl_divergence(p, q):.4f}  (infinite if any zero)")
print(f"D_JS(p‖q) = {js_divergence(p, q):.4f}  (always finite)")
```

### Connection to ML

| Application | JS Usage |
|---|---|
| Original GAN | Minimize JS divergence between p_data and p_gen |
| GAN training issues | JS is constant on disjoint supports → vanishing gradients |
| WGAN | Replaces JS with Wasserstein distance for stability |

---

## Wasserstein Distance — Earth Mover's Distance

### Definition

W(P, Q) = inf_{γ ∈ Π(P, Q)} 𝔼_{(x, y) ∼ γ} [‖x - y‖]

- Π(P, Q) = set of all joint distributions with marginals P and Q
- Intuition: minimum cost to transform distribution P into Q by moving probability mass

### Kantorovich-Rubinstein Duality

For 1-Wasserstein (P, Q on ℝ with finite first moment):

W₁(P, Q) = sup_{‖f‖_L ≤ 1} 𝔼_{x ∼ P}[f(x)] - 𝔼_{y ∼ Q}[f(y)]

Where ‖f‖_L ≤ 1 means f is 1-Lipschitz.

### Properties

1. **Symmetric**: W(P, Q) = W(Q, P)
2. **Metric**: satisfies triangle inequality
3. **Finite on disjoint supports** (unlike KL)
4. **Continuous in parameters**: W(𝒩(μ₁, σ₁²), 𝒩(μ₂, σ₂²)) = |μ₁ - μ₂| + |σ₁ - σ₂|

```python
import numpy as np
from scipy.stats import wasserstein_distance

# 1D Wasserstein distance
rng = np.random.default_rng(42)
p_samples = rng.normal(0, 1, 1000)
q_samples = rng.normal(0.5, 1.5, 1000)

w_dist = wasserstein_distance(p_samples, q_samples)
print(f"W₁(P, Q) = {w_dist:.4f}")

# For Gaussian distributions parameterized by (μ, σ):
# W₁(𝒩(μ₁,σ₁²), 𝒩(μ₂,σ₂²)) = |μ₁ - μ₂| + |σ₁ - σ₂|
w_theory = abs(0 - 0.5) + abs(1.0 - 1.5)
print(f"Theoretical: {w_theory:.4f}")

# Compare supports
p_far = rng.normal(-10, 1, 1000)
print(f"W₁(far apart) = {wasserstein_distance(p_far, q_samples):.4f}")
print(f"KL would be undefined / infinite for disjoint supports")
```

### Connection to ML

| Application | Wasserstein Usage |
|---|---|
| WGAN | Wasserstein-1 distance as GAN objective |
| WGAN-GP | Gradient penalty to enforce 1-Lipschitz |
| Sliced Wasserstein | Efficient approximation for high dimensions |
| Optimal transport | Domain adaptation, color transfer, barycenters |

---

## AIC and BIC — Model Selection Criteria

### Akaike Information Criterion

AIC = 2k - 2 ln(L̂)

- k = number of model parameters
- L̂ = maximum likelihood value
- Lower AIC is better
- Derived from KL divergence approximation

### Bayesian Information Criterion

BIC = k ln(n) - 2 ln(L̂)

- n = number of observations
- k = number of parameters
- Lower BIC is better
- Derived from approximate Bayesian posterior

### Comparison

| Criterion | Penalty | When to use |
|---|---|---|
| AIC | 2k per parameter | Prediction-focused, smaller penalty |
| BIC | k ln(n) per parameter | Consistent model selection, larger penalty for n > 7 |
| Both | AIC = BIC when n = exp(2) ≈ 7.4 | — |

```python
def aic(nll, n_params):
    """AIC = 2k - 2ln(L̂) = 2k + 2 * NLL."""
    return 2 * n_params + 2 * nll

def bic(nll, n_params, n_samples):
    """BIC = k·ln(n) - 2ln(L̂) = k·ln(n) + 2 * NLL."""
    return n_params * np.log(n_samples) + 2 * nll

# Example: compare models with different complexity
models = [
    {"name": "Linear", "nll": 100, "k": 2},
    {"name": "Quadratic", "nll": 85, "k": 3},
    {"name": "Degree-10 poly", "nll": 70, "k": 11},
    {"name": "Degree-20 poly", "nll": 68, "k": 21},
]
n = 100

for m in models:
    a = aic(m["nll"], m["k"])
    b = bic(m["nll"], m["k"], n)
    print(f"{m['name']:15s}  AIC={a:.1f}  BIC={b:.1f}")
```

---

## Fisher Information — Cramér-Rao Bound

### Definition

For a parametric family f(x; θ):

I(θ) = 𝔼[ (∂/∂θ log f(X; θ))² ] = -𝔼[ ∂²/∂θ² log f(X; θ) ]

The second equality holds under regularity conditions (interchange of integration and differentiation).

### Cramér-Rao Lower Bound

For any unbiased estimator θ̂ of θ:

𝕍[θ̂] ≥ 1 / I(θ)

- MLE asymptotically achieves this bound
- Fisher Information Matrix (FIM): I(θ)_{ij} = -𝔼[ ∂²/∂θᵢ∂θⱼ log f(X; θ) ]

### Examples

| Distribution | Fisher Information I(θ) | CRLB |
|---|---|---|
| 𝒩(μ, σ²) — mean known σ² | n / σ² | σ² / n |
| 𝒩(μ, σ²) — variance known μ | n / (2σ⁴) | 2σ⁴ / n |
| Bernoulli(p) | n / (p(1-p)) | p(1-p) / n |
| Poisson(λ) | n / λ | λ / n |

### Connection to ML

| Application | Fisher Info Role |
|---|---|
| Natural gradient descent | ∇_nat = I(θ)^{-1} ∇_std — invariant to reparameterization |
| Laplace approximation | Posterior approximated as 𝒩(θ_MAP, I(θ_MAP)^{-1}) |
| Variational inference | FIM used in gradient preconditioning |
| Bayesian optimal experiment design | Maximize I(θ) to design informative experiments |

---

## Differential Entropy (Continuous Variables)

### Definition

For a continuous random variable X with PDF f(x):

h(X) = - ∫ f(x) log f(x) dx

### Important Differences from Discrete Entropy

1. **Can be negative**: PDF can exceed 1, making h(X) < 0
2. **Not invariant**: h(g(X)) ≠ h(X) + 𝔼[log |g'(X)|] under transformation
3. **No absolute meaning**: only relative differences (mutual information) are meaningful

### Gaussian Differential Entropy

If X ∼ 𝒩(μ, σ²):

h(X) = ½ ln(2πe σ²)

- Increasing with σ² (more spread = more entropy)
- Independent of μ (location does not affect entropy)

### Maximum Entropy Distributions

| Constraint | Max-Ent Distribution |
|---|---|
| Support [a, b], no other constraints | Uniform(a, b) |
| ℝ, given 𝔼[X] = μ, 𝕍[X] = σ² | 𝒩(μ, σ²) |
| ℝ₊, given 𝔼[X] = μ | Exponential(1/μ) |
| ℝ, given 𝔼[|X|] = μ | Laplace(0, μ) |
| ℝ₊, given 𝔼[ln X] = μ | Log-normal |

**Principle**: Among all distributions satisfying given constraints, the maximum entropy distribution is the least informative (most uncertain).

```python
def differential_entropy_gaussian(sigma_sq, base=np.e):
    """Differential entropy of 𝒩(μ, σ²) in specified base."""
    return 0.5 * np.log(2 * np.pi * np.e * sigma_sq) / np.log(base)

def differential_entropy_uniform(a, b, base=np.e):
    """Differential entropy of Uniform(a,b)."""
    return np.log(b - a) / np.log(base)

from scipy.stats import differential_entropy as scipy_de

# Estimate from samples
rng = np.random.default_rng(42)
samples = rng.normal(0, 2, 10000)
h_estimated = scipy_de(samples, base=2)
h_theoretical = differential_entropy_gaussian(4, base=2)
print(f"Estimated h(X): {h_estimated:.4f} bits")
print(f"Theoretical:     {h_theoretical:.4f} bits")
```

---

## Applications in ML

### Classification — Cross-Entropy Minimization

- **Logistic regression**: minimize BCE = -Σ[y log p + (1-y) log(1-p)]
- **Softmax classifier**: minimize CCE = -Σ yᵢ log pᵢ
- Cross-entropy minimization = maximum likelihood estimation
- Gradient of cross-entropy for logistic regression: ∇L = X^T(p - y)

### Decision Trees — Information Gain

Information gain at a node:

IG(T, X) = H(T) - Σ_{v ∈ values(X)} ℙ(X = v) · H(T | X = v)

```python
def information_gain(y, feature):
    """Information gain from splitting y on a categorical feature."""
    n = len(y)
    parent_entropy = binary_entropy(y.mean())

    weighted_child_entropy = 0.0
    for value in np.unique(feature):
        mask = feature == value
        n_child = mask.sum()
        p_child = y[mask].mean()
        weighted_child_entropy += (n_child / n) * binary_entropy(p_child)

    return parent_entropy - weighted_child_entropy
```

### Variational Autoencoder (VAE)

ELBO = 𝔼_{z ∼ q(z|x)} [log p(x | z)] - D_KL(q(z | x) ‖ p(z))

- Reconstruction loss = 𝔼[log p(x|z)] (cross-entropy or MSE)
- KL term = D_KL(q(z|x) ‖ p(z)) acts as regularizer
- q(z|x) ≈ 𝒩(μ(x), σ²(x)I), p(z) = 𝒩(0, I)
- KL closed form: D_KL = ½ Σ (μ² + σ² - log σ² - 1)

```python
def kl_gaussian(mu, logvar):
    """KL divergence for VAE: D_KL(𝒩(μ, σ²) ‖ 𝒩(0, 1))."""
    return -0.5 * np.sum(1 + logvar - mu**2 - np.exp(logvar))

# Example
mu = np.array([0.1, -0.2, 0.5])
logvar = np.array([-1.0, -0.5, 0.0])
print(f"VAE KL term: {kl_gaussian(mu, logvar):.4f}")
```

### Generative Adversarial Networks (GANs)

Original GAN: minimize JS divergence between p_data and p_gen
WGAN: minimize Wasserstein-1 distance

The discriminator/critic estimates the divergence, the generator minimizes it:
- GAN: max_D 𝔼[log D(x)] + 𝔼[log(1 - D(G(z)))]
- WGAN: max_{critic, 1-Lipschitz} 𝔼[critic(x)] - 𝔼[critic(G(z))]

### Knowledge Distillation

Minimize D_KL(p_teacher ‖ p_student):

L_distill = α · H(y_true, p_student) + β · D_KL(p_teacher/τ ‖ p_student/τ)

Where τ is the temperature parameter that softens the distributions.

```python
def distillation_loss(student_logits, teacher_logits, y_true, tau=3.0, alpha=0.7):
    """Knowledge distillation loss."""
    # Soften with temperature
    p_student = np.exp(student_logits / tau)
    p_student /= p_student.sum()
    p_teacher = np.exp(teacher_logits / tau)
    p_teacher /= p_teacher.sum()

    # Distillation loss (KL)
    kl = kl_divergence(p_teacher, p_student, base=np.e)
    return alpha * kl + (1 - alpha) * categorical_cross_entropy(y_true, p_student)
```

### Contrastive Learning — InfoNCE

Maximizes mutual information between positive pairs (augmented views of same sample):

L_InfoNCE = -𝔼[log exp(sim(zᵢ, zⱼ)/τ) / Σ_{k ≠ i} exp(sim(zᵢ, z_k)/τ)]

InfoNCE is a lower bound on mutual information: I(X; Y) ≥ log(K) - L_InfoNCE

### Summary Table

| ML Task | Information Theory Concept |
|---|---|
| Classification | Cross-entropy loss = MLE |
| Regression | MSE = Gaussian NLL |
| Decision trees | Information gain = Δ entropy |
| VAE | KL divergence in ELBO |
| GAN | JS divergence / Wasserstein distance |
| Knowledge distillation | KL(teacher ‖ student) |
| Contrastive learning | InfoNCE ≈ Mutual information |
| Feature selection | Max I(feature; label) |
| Natural gradient | Fisher Information Matrix |
| Bayesian inference | KL variational objective |

---

## Quick Reference

| Quantity | Formula | Range |
|---|---|---|
| Entropy H(X) | -Σ p(x) log p(x) | [0, log|X|] |
| Joint entropy H(X,Y) | -ΣΣ p(x,y) log p(x,y) | [max(H(X),H(Y)), H(X)+H(Y)] |
| Conditional entropy H(Y|X) | -ΣΣ p(x,y) log p(y|x) | [0, H(Y)] |
| Cross-entropy H(p,q) | -Σ p(x) log q(x) | [H(p), ∞) |
| KL divergence D_KL(p‖q) | Σ p(x) log(p(x)/q(x)) | [0, ∞) |
| JS divergence D_JS(p‖q) | ½KL(p‖m) + ½KL(q‖m) | [0, ln 2] |
| Mutual information I(X;Y) | ΣΣ p(x,y) log(p(x,y)/(p(x)p(y))) | [0, min(H(X),H(Y))] |
| Wasserstein W₁ | inf_{γ} 𝔼[‖X-Y‖] | [0, ∞) |
| Differential entropy h(X) | -∫ f(x) log f(x) dx | (-∞, ∞) |

---

## Python Library Mapping

| Operation | NumPy | SciPy |
|---|---|---|
| Entropy from counts | — | `scipy.stats.entropy` |
| Differential entropy (estimate) | — | `scipy.stats.differential_entropy` |
| KL divergence | — | `scipy.stats.entropy(p, q)` |
| Mutual information (discrete) | — | Manual from joint histogram |
| Mutual information (continuous) | — | `sklearn.feature_selection.mutual_info_classif/regression` |
| Wasserstein distance (1D) | — | `scipy.stats.wasserstein_distance` |
| Energy distance | — | `scipy.stats.energy_distance` |
| Contingency/MI | — | `scipy.stats.contingency.association` |
| AIC/BIC | Manual from NLL | — |
| Cross-entropy loss | Manual | `sklearn.metrics.log_loss` |
