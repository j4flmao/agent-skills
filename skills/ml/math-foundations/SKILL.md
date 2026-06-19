---
name: ml-math-foundations
description: >
  Use this skill when you need to understand, derive, or debug the mathematical foundations behind ML/DL algorithms — linear algebra, calculus, probability, information theory, optimization, loss functions, and deep learning math. This skill enforces: correct notation, rigorous derivations, and mapping from math concepts to ML implementations. Do NOT use for: implementing ML algorithms with libraries (use ml/classical-ml or ml/deep-learning), data preprocessing (use data/), or general statistics (use data/data-quality).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, math, foundations, phase-11]
---

# ML/DL Mathematical Foundations

## Purpose
Provide rigorous, implementation-focused reference for all mathematical concepts underpinning machine learning and deep learning. Each reference file bridges theory ↔ practice with derivations, NumPy/SciPy code, and direct mapping to ML algorithms.

## Agent Protocol

### Trigger
User request includes: prove, derive, gradient, backprop, SVD, eigenvalue, eigendecomposition, chain rule, loss function derivative, optimization convergence, KL divergence, entropy, information theory, kernel trick, PCA math, Bayesian inference, EM algorithm, Taylor expansion, attention math, normalization math, initialization math.

### Input Context
- Specific math concept or derivation needed
- Algorithm context (e.g., "derivation of Adam", "XGBoost objective", "transformer attention math")
- Current understanding level (conceptual, formula-level, implementation-level)

### Output
- Clear mathematical derivation with step-by-step reasoning
- Mapping to ML/DL algorithm application
- NumPy/SciPy demonstration code
- Common pitfalls and numerical stability considerations

### Response Format
Provide the mathematical content directly. Use standard mathematical notation. No preamble. No postamble. No filler.

### Completion Criteria
- Derivation is complete and self-contained
- Mapping to ML algorithm is explicit
- Numerical considerations are documented
- Code demonstration is provided where applicable

## Decision Guide: Which Math Concept to Use

```
What math do you need?
  ├── Linear Algebra
  │   ├── Vectors, matrices, operations → linear-algebra.md
  │   ├── SVD, eigendecomposition → linear-algebra.md (PCA, matrix factorization)
  │   ├── Norms, distances → linear-algebra.md (regularization, KNN, clustering)
  │   └── Linear transformations → linear-algebra.md (neural network layers)
  ├── Calculus
  │   ├── Derivatives, gradients → calculus.md (gradient descent basics)
  │   ├── Chain rule, backpropagation → calculus.md (neural network training)
  │   ├── Partial derivatives, Jacobians → calculus.md (multi-variable optimization)
  │   └── Taylor series, Hessians → calculus.md (second-order optimization)
  ├── Probability & Statistics
  │   ├── Distributions, MLE, MAP → probability-statistics.md (loss functions, priors)
  │   ├── Bayes theorem, Bayesian inference → probability-statistics.md (Bayesian ML)
  │   ├── Bias-variance tradeoff → probability-statistics.md (model selection)
  │   └── Hypothesis testing, confidence intervals → probability-statistics.md (A/B testing)
  ├── Information Theory
  │   ├── Entropy, cross-entropy → information-theory.md (classification losses)
  │   ├── KL divergence → information-theory.md (VAEs, distillation)
  │   ├── Mutual information → information-theory.md (feature selection)
  │   └── Fisher information → information-theory.md (natural gradient)
  ├── Optimization
  │   ├── Gradient descent, SGD → optimization.md (training algorithms)
  │   ├── Adam, RMSprop, momentum → optimization.md (deep learning optimizers)
  │   ├── Learning rate schedules → optimization.md (training convergence)
  │   ├── Regularization (L1, L2, elastic net) → optimization.md (preventing overfitting)
  │   └── Constrained optimization, Lagrange multipliers → optimization.md (SVMs, duals)
  ├── Loss Functions
  │   ├── MSE, MAE, Huber → loss-functions.md (regression)
  │   ├── Cross-entropy, focal loss → loss-functions.md (classification)
  │   ├── Contrastive, triplet loss → loss-functions.md (embeddings, Siamese networks)
  │   └── Custom loss design → loss-functions.md (domain-specific objectives)
  ├── Deep Learning Math
  │   ├── Backprop through CNN → deep-learning-math.md (convolution gradients)
  │   ├── Attention mechanism math → deep-learning-math.md (transformer)
  │   ├── Normalization (Batch, Layer, Group) → deep-learning-math.md (training stability)
  │   └── Initialization strategies → deep-learning-math.md (Xavier, Kaiming, orthogonal)
  └── ML Algorithm Math
      ├── SVM, kernel trick → ml-algorithms.md (dual formulation, RBF kernel)
      ├── Decision trees, XGBoost → ml-algorithms.md (gain, Newton boosting)
      ├── PCA, SVD → ml-algorithms.md (dimensionality reduction)
      ├── EM algorithm → ml-algorithms.md (GMM, missing data)
      ├── Matrix factorization → ml-algorithms.md (recommender systems)
      └── Gaussian processes → ml-algorithms.md (Bayesian optimization)
```

## Rules
- Every formula must include its mapping to an ML algorithm or concept.
- Provide NumPy/SciPy demonstration code for non-trivial computations.
- Always note numerical stability concerns (e.g., log-sum-exp trick, softmax overflow, catastrophic cancellation).
- Distinguish between scalar, vector, matrix, and tensor operations with explicit notation.
- For optimization algorithms, show the update rule with all hyperparameters.
- Cross-reference related concepts across files (e.g., KL divergence in information-theory ↔ loss-functions).
- Derive from first principles when possible to build intuition.
- Include dimensionality annotations for all matrix operations (e.g., `X ∈ ℝ^{n×d}`).

## Workflow

### Step 1: Identify the Mathematical Core
Decompose the user's ML problem into its mathematical components. For example:
- "Train a neural network" → forward pass (linear algebra), backprop (calculus chain rule), optimization (SGD/Adam)
- "Why does my GAN not converge?" → game theory (Nash equilibrium), gradient dynamics, JS divergence vs Wasserstein
- "Explain attention" → scaled dot-product (linear algebra), softmax (probability), multi-head (parallel linear transforms)
- "Derive XGBoost" → second-order Taylor expansion (calculus), greedy tree building (optimization), regularization (norm penalty)

### Step 2: Provide Rigorous Derivation
Start from the fundamental equation and build step by step. Show every algebraic manipulation. Define all variables. For example, the gradient of MSE loss:
```
L(θ) = (1/n) Σ_i (y_i - ŷ_i)²   where ŷ_i = w^T x_i + b
∂L/∂w_j = (2/n) Σ_i (y_i - w^T x_i - b)(-x_ij)
        = -(2/n) Σ_i (y_i - ŷ_i) x_ij
∂L/∂b = -(2/n) Σ_i (y_i - ŷ_i)
```
Always include the final vectorized form: `∇_w L = -(2/n) X^T (y - ŷ)`.

### Step 3: Provide NumPy/SciPy Implementation
```python
import numpy as np

def mse_gradient(X, y, w, b):
    """Vectorized gradient of MSE loss.
    
    Args:
        X: (n, d) input features
        y: (n,) target values  
        w: (d,) weights
        b: scalar bias
    Returns:
        dw: (d,) gradient w.r.t. weights
        db: scalar gradient w.r.t. bias
    """
    n = X.shape[0]
    y_pred = X @ w + b
    error = y - y_pred  # (n,)
    dw = -(2.0 / n) * X.T @ error  # (d,)
    db = -(2.0 / n) * np.sum(error)
    return dw, db
```

### Step 4: Map to ML Algorithm
Connect the math to practical ML. Example for MSE gradient → mini-batch SGD:
```python
def sgd_step(X_batch, y_batch, w, b, lr=0.01):
    dw, db = mse_gradient(X_batch, y_batch, w, b)
    w -= lr * dw
    b -= lr * db
    return w, b
```

### Step 5: Note Numerical Stability
Always document numerical issues:
- Softmax: subtract max before exp to prevent overflow
- Log-sum-exp: `log Σ exp(x_i) = c + log Σ exp(x_i - c)` where c = max(x_i)
- Variance: use two-pass algorithm or Welford's online algorithm
- SVD: use `np.linalg.svd` with `full_matrices=False` for memory efficiency

## Algorithm-Math Mapping Table

| ML Algorithm | Math Foundation | Key Equation | Implementation |
|---|---|---|---|
| Linear Regression | Linear algebra, calculus | w = (X^T X)^{-1} X^T y | np.linalg.solve |
| Logistic Regression | Probability, optimization | P(y=1|x) = σ(w^T x), CE loss | log-loss gradient |
| SVM | Constrained optimization, duality | L = ||w||²/2 + C Σ max(0, 1 - y_i f(x_i)) | SMO, QP solver |
| PCA | Linear algebra (SVD) | X = UΣV^T, project onto top-k V | np.linalg.svd |
| Neural Networks | Chain rule, linear algebra | δ^l = (W^{l+1})^T δ^{l+1} ⊙ σ'(z^l) | autograd |
| Attention | Linear algebra, softmax | A = softmax(QK^T / √d_k) V | torch.matmul |
| XGBoost | Taylor expansion, optimization | obj = Σ [g_i f_t(x_i) + ½ h_i f_t(x_i)²] + Ω(f_t) | 2nd-order approx |
| VAE | Probability, information theory | ELBO = E_q[log p(x|z)] - KL(q(z|x) || p(z)) | reparameterization |
| GANs | Game theory, divergences | min_G max_D V(D,G) = E[log D(x)] + E[log(1-D(G(z)))] | adversarial training |
| k-Means | Distance metrics, optimization | min Σ_k Σ_{i∈C_k} ||x_i - μ_k||² | Lloyd's algorithm |

## Common Anti-Patterns

- **Assuming numerical stability**: catastrophic cancellation when subtracting close numbers, softmax overflow without max subtraction, log of negative values after floating point rounding
- **Confusing covariance and correlation**: covariance depends on units, correlation is normalized to [-1,1]; PCA on unstandardized data gives misleading results
- **Ignoring multicollinearity in linear models**: X^T X is ill-conditioned when features are correlated, leading to unstable coefficient estimates
- **Misapplying the chain rule**: forgetting that loss depends on parameters through multiple computation paths — backprop must sum over all paths
- **Forgetting bias term in vectorization**: the bias term adds a column of ones to the design matrix; forgetting it means the hyperplane must pass through the origin
- **Confusing MLE and MAP**: MLE maximizes P(data|θ), MAP maximizes P(θ|data) = P(data|θ)P(θ); they differ by the prior
- **Misinterpreting eigenvalues**: in PCA, eigenvalues represent variance explained along each principal component — the ratio λ_i / Σλ_j is the proportion of variance explained
- **Ignoring the log-determinant in MVN**: multivariate normal density has a log|Σ| term that dominates in high dimensions
- **Using wrong gradient for cross-entropy with softmax**: the combined gradient is simply ŷ - y (prediction minus target), much simpler than computing them separately
- **Overlooking the bias-variance decomposition**: total error = bias² + variance + irreducible error; complex models reduce bias but increase variance

## Numerical Stability Pattern Library

```python
# Softmax: subtract max to prevent overflow
def stable_softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

# Log-sum-exp: numerically stable log of sum of exponentials
def log_sum_exp(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    return x_max + np.log(np.sum(np.exp(x - x_max), axis=axis, keepdims=True))

# Cross-entropy: combine log and softmax to avoid log(0)
def stable_cross_entropy(logits, labels):
    # logits: (n, c), labels: (n,) class indices
    n = logits.shape[0]
    log_probs = logits - log_sum_exp(logits, axis=1)
    return -np.mean(log_probs[np.arange(n), labels])

# Log variance: use log1p for small values
def log1p_exp(x):
    """log(1 + exp(x)) computed stably."""
    return np.where(x > 0, x + np.log1p(np.exp(-x)), np.log1p(np.exp(x)))

# Welford's online algorithm for variance
def online_variance(values):
    count = 0
    mean = 0.0
    M2 = 0.0
    for x in values:
        count += 1
        delta = x - mean
        mean += delta / count
        M2 += delta * (x - mean)
    return mean, M2 / count  # variance
```

## Expert-Level Patterns

### Pattern 1: Gradient Checking
When implementing custom gradients, verify with finite differences:
```python
def gradient_check(f, grad_f, x, epsilon=1e-7):
    """Numerically verify gradient computation."""
    analytical = grad_f(x)
    numerical = np.zeros_like(x)
    for i in range(len(x)):
        x_plus = x.copy()
        x_plus[i] += epsilon
        x_minus = x.copy()
        x_minus[i] -= epsilon
        numerical[i] = (f(x_plus) - f(x_minus)) / (2 * epsilon)
    diff = np.linalg.norm(analytical - numerical) / (np.linalg.norm(analytical) + 1e-12)
    assert diff < 1e-6, f"Gradient check failed: diff={diff}"
    return True
```

### Pattern 2: Coordinate-Free Derivations
Derive gradients without expanding to components:
- `∇_X tr(AX) = A^T` — trace derivative
- `∇_x (x^T A x) = (A + A^T)x` — quadratic form derivative
- `∇_X ||X||_F² = 2X` — Frobenius norm derivative

### Pattern 3: Common Derivative Recipes for ML
- Softmax + cross-entropy gradient: `∂L/∂z_i = p_i - y_i` (prediction minus target)
- Log-likelihood of Gaussian: `∂/∂μ = (x - μ) / σ²`
- ELBO gradient (VAE): reparameterization trick — sample ε ~ N(0,1), then z = μ + σ⊙ε
- Attention gradient: `∂L/∂Q = (∂L/∂A) (K^T / √d) ⊙ softmax'(QK^T/√d)`

## Production Considerations

### Numerical Precision
- Default float64 for research, float32 for production inference (2x memory, 2x speed)
- Mixed precision (float16 compute, float32 master weights) for GPU training
- Use `np.errstate(divide='raise')` to catch division by zero during development

### Computational Complexity
- Matrix multiplication O(n³) naive, O(n^2.807) Strassen, O(n^2.376) theoretical lower bound
- SVD: O(min(n d², d n²)) for matrix of size n × d
- Eigenvalue decomposition: O(n³) for n × n matrix
- Cholesky decomposition: O(n³/3) for solving linear systems

### Library Selection
- NumPy: general-purpose, CPU only, BLAS-optimized
- SciPy: sparse matrices, special functions, linear algebra (LAPACK)
- PyTorch/TensorFlow: GPU-accelerated, auto-differentiation, distributed
- JAX: XLA-compiled, functional transformations (grad, jit, vmap, pmap)

## Tooling/Methodology

| Tool | Purpose | When to Use |
|---|---|---|
| NumPy | Array ops, linear algebra, random | Every ML project baseline |
| SciPy | Sparse matrices, optimization, stats | Large sparse systems, hypothesis tests |
| SymPy | Symbolic math, derivative derivation | Checking analytic gradients |
| Matplotlib | Visualization of math concepts | Debugging loss landscapes, convergence |
| PyTorch autograd | Automatic differentiation | Checking hand-derived gradients |
| JAX | Function transformations, XLA | High-performance custom math |
| Wolfram Alpha | Symbolic computation | Complex derivations and integrals |

## Loss Function Catalog — Mathematical Reference

### Regression Losses
```
MSE: L = (1/n) * sum((y_i - y_hat_i)^2)
  Use: Standard regression, Gaussian errors
  Property: Penalizes outliers heavily (quadratic)

MAE: L = (1/n) * sum(|y_i - y_hat_i|)
  Use: Robust regression, Laplace errors
  Property: Less sensitive to outliers

Huber: L = (1/n) * sum(huber_loss(y_i, y_hat_i))
  huber_loss(d) = 0.5*d^2 for |d| <= delta
  huber_loss(d) = delta*(|d| - 0.5*delta) for |d| > delta
  Use: Robust regression with smooth gradient
  Property: Quadratic near 0, linear in tails

Log-Cosh: L = (1/n) * sum(log(cosh(y_i - y_hat_i)))
  Use: Similar to Huber but twice differentiable everywhere
  Property: Smooth approximation to MAE

Quantile Loss: L = (1/n) * sum(rho_tau(y_i - y_hat_i))
  rho_tau(e) = tau * max(e, 0) + (1-tau) * max(-e, 0)
  Use: Quantile regression, prediction intervals
  Property: Asymmetric — penalizes over/under differently
```

### Classification Losses
```
Binary Cross-Entropy: L = -(1/n) * sum(y_i*log(p_i) + (1-y_i)*log(1-p_i))
  Use: Binary classification
  Property: Strictly proper — calibrated probabilities

Categorical Cross-Entropy: L = -(1/n) * sum(sum(y_ij*log(p_ij)))
  Use: Multi-class classification
  Property: Generalization of BCE

Focal Loss: L = -(1/n) * sum(alpha*(1-p_t)^gamma*log(p_t))
  Use: Imbalanced classification
  Property: Down-weights easy examples, focuses on hard ones

Hinge Loss: L = (1/n) * sum(max(0, 1 - y_i * f(x_i)))
  Use: SVM, max-margin classification
  Property: Only penalizes misclassified + margin violators

Kullback-Leibler Divergence: D_KL(P||Q) = sum(P(x)*log(P(x)/Q(x)))
  Use: Distribution matching, VAE, knowledge distillation
  Property: Asymmetric! D_KL(P||Q) != D_KL(Q||P)
```

### Ranking Losses
```
Pairwise Hinge: L = (1/n) * sum(max(0, 1 - (s_pos - s_neg)))
  Use: Learning to rank, implicit feedback
  Property: Positive items scored higher than negative by margin

BPR (Bayesian Personalized Ranking):
  L = -(1/n) * sum(log(sigmoid(s_pos - s_neg)))
  Use: Implicit feedback ranking
  Property: Differentiable approximation to AUC

ListNet / ListMLE:
  L = -sum(P(y|rel) * log(P(y_hat|rel)))
  Use: Listwise ranking
  Property: Considers entire ranked list
```

### Regularization Terms
```
L1 (Lasso): lambda * sum(|w_i|)
  Effect: Sparse weights (feature selection)
  Gradient: lambda * sign(w_i)

L2 (Ridge): lambda * sum(w_i^2)
  Effect: Shrinks weights uniformly
  Gradient: 2 * lambda * w_i

ElasticNet: lambda_1 * sum(|w_i|) + lambda_2 * sum(w_i^2)
  Effect: Combines L1 sparsity with L2 stability

Entropy Regularization (RL):
  H(pi) = -sum(pi(a|s) * log(pi(a|s)))
  Effect: Encourages exploration in policy gradient
```

## Common Derivations — Step by Step

### Linear Regression: Normal Equations
```
Given: X (n x d), y (n x 1), find w minimizing ||Xw - y||^2

L(w) = (Xw - y)^T (Xw - y)
     = w^T X^T X w - 2 y^T X w + y^T y

dL/dw = 2 X^T X w - 2 X^T y = 0
X^T X w = X^T y
w = (X^T X)^{-1} X^T y    ← Normal Equations

Note: (X^T X) must be invertible (full rank)
If not invertible: use pseudo-inverse or ridge regression
```

### Logistic Regression: Gradient
```
P(y=1|x) = sigma(w^T x) = 1 / (1 + exp(-w^T x))

L(w) = -(1/n) * sum(y_i * log(sigma_i) + (1-y_i) * log(1-sigma_i))

dL/dw_j = (1/n) * sum((sigma_i - y_i) * x_ij)

Gradient descent update:
w_j := w_j - alpha * (1/n) * sum((sigma_i - y_i) * x_ij)
```

### Neural Network Backpropagation (Single Neuron)
```
Forward:
z = w^T x + b
a = sigma(z)
L = (1/2) * (a - y)^2

Backward (chain rule):
dL/da = (a - y)
da/dz = sigma'(z) = sigma(z) * (1 - sigma(z))  [for sigmoid]
dz/dw = x
dz/db = 1

dL/dw = dL/da * da/dz * dz/dw = (a - y) * sigma'(z) * x
dL/db = dL/da * da/dz * dz/db = (a - y) * sigma'(z)
```

### Softmax + Cross-Entropy Gradient
```
Softmax: p_j = exp(z_j) / sum_k(exp(z_k))
Cross-entropy: L = -sum(y_j * log(p_j))  where y is one-hot

dL/dz_i = p_i - y_i

Proof:
dL/dz_i = d/dz_i [-sum(y_j * log(p_j))]
  {simplify using identity: d(log(p_j))/dz_i = (delta_ij - p_j)}
  = -sum(y_j * (delta_ij - p_j))
  = -(y_i - p_i * sum(y_j))    since sum(y_j) = 1
  = p_i - y_i

This is why softmax + cross-entropy gradient is so simple!
```

### PCA: Covariance Eigendecomposition
```
Given: centered data matrix X (n x d)

Covariance: Sigma = (1/n) * X^T X
Goal: find v such that Var(Xv) = v^T Sigma v is maximized, with ||v||=1

Lagrangian: L(v, lambda) = v^T Sigma v - lambda(v^T v - 1)

dL/dv = 2 Sigma v - 2 lambda v = 0
Sigma v = lambda v    ← Eigenvalue problem

lambda_i = explained variance of component i
v_i = principal component direction

Fraction of variance explained by k components:
sum(lambda_1..lambda_k) / sum(lambda_1..lambda_d)
```

## Common Distributions in ML

| Distribution | PDF / PMF | Parameters | Uses in ML |
|-------------|-----------|------------|------------|
| Bernoulli | P(X=1) = p, P(X=0) = 1-p | p in [0,1] | Binary classification, binary features |
| Binomial | C(n,k)*p^k*(1-p)^(n-k) | n, p | A/B testing, count outcomes |
| Gaussian (Normal) | 1/(sqrt(2*pi*sigma^2))*exp(-(x-mu)^2/(2*sigma^2)) | mu, sigma^2 | Regression errors, embeddings |
| Multivariate Normal | (1/((2*pi)^(d/2)*det(Sigma)^(1/2)))*exp(-0.5*(x-mu)^T Sigma^(-1)(x-mu)) | mu, Sigma | GMM, VAE prior, Mahalanobis |
| Exponential | lambda*exp(-lambda*x) | lambda > 0 | Waiting times, survival analysis |
| Poisson | lambda^k*exp(-lambda)/k! | lambda > 0 | Count data, rare events |
| Uniform | 1/(b-a) for x in [a,b] | a, b | Random initialization, dropout |
| Beta | x^(alpha-1)*(1-x)^(beta-1)/B(alpha,beta) | alpha, beta | Prior for probabilities, Thompson sampling |
| Dirichlet | Dir(alpha) — generalization of Beta | alpha vector | Topic models (LDA), mixture weights |

## Key Optimization Algorithms — Visual Summary

```
SGD: w = w - lr * grad
  Use: Large datasets, simple convergence
  Issue: Noisy gradient, slow near optimum

Momentum: v = beta*v + (1-beta)*grad; w = w - lr*v
  Use: Escapes local minima, accelerates along shallow directions

Adam: m = beta1*m + (1-beta1)*grad; v = beta2*v + (1-beta2)*grad^2
       m_hat = m/(1-beta1^t); v_hat = v/(1-beta2^t)
       w = w - lr * m_hat/(sqrt(v_hat) + eps)
  Use: Default optimizer for deep learning
  Tuning: lr=3e-4 (AdamW for Transformers)

Newton's Method: w = w - H^(-1)*grad
  Use: Fast convergence near optimum
  Issue: O(d^3) per step (Hessian inverse)
  Approx: L-BFGS for quasi-Newton

Conjugate Gradient: H * p = -grad, solve iteratively
  Use: Large linear systems, kernel methods
  Property: Exact in d steps for d x d SPD matrix
```

## References
  - references/calculus.md — Calculus for Machine Learning
  - references/deep-learning-math.md — Deep Learning Mathematics
  - references/information-theory.md — Information Theory for Machine Learning
  - references/linear-algebra.md — Linear Algebra for Machine Learning
  - references/loss-functions.md — Loss Functions for Machine Learning
  - references/math-foundations-advanced.md — Math Foundations Advanced Topics
  - references/math-foundations-fundamentals.md — Math Foundations Fundamentals
  - references/ml-algorithms.md — Machine Learning Algorithms — Mathematical Derivations
  - references/notation-reference.md — Notation Reference for Machine Learning Mathematics
  - references/optimization.md — Optimization for Machine Learning
  - references/probability-statistics.md — Probability and Statistics for Machine Learning
## Handoff
Hand off to `ml/classical-ml/SKILL.md` if the user needs implementation rather than mathematical understanding. Hand off to `ml/deep-learning/SKILL.md` for DL-specific implementation patterns.
