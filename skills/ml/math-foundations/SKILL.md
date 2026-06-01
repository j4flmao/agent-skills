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
