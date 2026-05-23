# Linear Algebra for Machine Learning

Comprehensive reference for vectors, matrices, decompositions, and their applications in ML/DL. Every concept includes NumPy/SciPy code and explicit mapping to algorithms.

## Vectors and Vector Spaces

### Vector Operations

A vector **x** ∈ ℝⁿ is an ordered n-tuple of real numbers. Vectors form a **vector space** under two operations:

| Operation | Definition | Notation |
|---|---|---|
| Addition | (x + y)ᵢ = xᵢ + yᵢ | **x + y** |
| Scalar multiplication | (αx)ᵢ = αxᵢ | α**x** |

**Dot product** (inner product):

⟨**a**, **b**⟩ = **a**·**b** = Σ_{i=1}^{n} aᵢbᵢ = **a**^T**b**

**Cross product** (3D only):

**a** × **b** = (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁)

**Outer product:**

(**a** ⊗ **b**)ᵢⱼ = aᵢbⱼ, equivalently **a****b**^T = [aᵢbⱼ] ∈ ℝ^{m×n}

```python
import numpy as np

a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

dot = np.dot(a, b)        # 32
cross = np.cross(a, b)    # [-3, 6, -3]
outer = np.outer(a, b)    # [[4, 5, 6], [8, 10, 12], [12, 15, 18]]
```

**ML connection**: Dot products measure similarity between feature vectors (cosine similarity in NLP) and compute weighted sums in neural network layers **z** = **Wx** + **b**. Outer products build covariance matrices and attention matrices.

### Geometric Interpretation

**Dot product and angle:**

⟨**a**, **b**⟩ = ‖**a**‖‖**b**‖cos(θ)  →  cos(θ) = ⟨**a**, **b**⟩/(‖**a**‖‖**b**‖)

**Projection** of **b** onto **a**:

projₐ(**b**) = (⟨**a**, **b**⟩/⟨**a**, **a**⟩) **a**

**Orthogonality**: **a** ⟂ **b** iff ⟨**a**, **b**⟩ = 0. Orthogonal vectors have zero similarity — decorrelated features in representation learning.

**ML connection**: Word embeddings use cosine similarity for semantic closeness. In self-attention, query–key dot products determine attention weights. PCA finds orthogonal directions of maximum variance.

### Norms

| Norm | Definition | ML Use |
|---|---|---|
| L₁ (Manhattan) | ‖**x**‖₁ = Σ|xᵢ| | Lasso regularization, sparsity |
| L₂ (Euclidean) | ‖**x**‖₂ = √Σxᵢ² | Ridge, weight decay, distance metrics |
| L∞ (Max) | ‖**x**‖_∞ = maxᵢ|xᵢ| | Adversarial perturbation bounds |
| Lₚ | ‖**x**‖_ₚ = (Σ|xᵢ|ᵖ)^{1/p} | Generalized regularization |

```python
x = np.array([3, -1, 2])

l1 = np.linalg.norm(x, ord=1)    # 6.0
l2 = np.linalg.norm(x, ord=2)    # 3.742
linf = np.linalg.norm(x, ord=np.inf)  # 3.0
lp = np.linalg.norm(x, ord=3)    # 3.302
```

**L₁ vs L₂ geometry**: The L₁ ball is diamond-shaped (corners on axes). L₁ regularization drives weights exactly to zero (sparsity) because the constraint region has corners where coordinates vanish. L₂ ball is spherical — it shrinks weights but doesn't zero them.

**ML connection**: L₁ used in Lasso (feature selection), L₂ in weight decay (∇_(**w**)(‖**w**‖²) = 2**w**), L∞ in adversarial training (PGD attacks bounded by ε in L∞ norm).

## Matrices and Linear Transformations

### Matrix Operations

A matrix **A** ∈ ℝ^{m×n} defines a linear transformation **y** = **Ax** mapping ℝⁿ → ℝᵐ.

| Operation | Definition | Shape Constraint |
|---|---|---|
| Multiplication | (**AB**)ᵢⱼ = Σₖ AᵢₖBₖⱼ | A: m×n, B: n×p |
| Transpose | (**A**^T)ᵢⱼ = Aⱼᵢ | flips m×n → n×m |
| Inverse | **A**^{-1}**A** = **I** = **A****A**^{-1} | square, full rank |
| Trace | tr(**A**) = Σᵢ A_{ii} | square |
| Determinant | det(**A**) = volume scaling factor | square |

**Column interpretation**: **Ax** is a linear combination of columns of **A**: **Ax** = x₁**a_{:1}** + x₂**a_{:2}** + ... + xₙ**a_{:n}**. The output lives in the column space of **A**.

```python
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

C = np.matmul(A, B)            # [[19, 22], [43, 50]]
AT = A.T                       # [[1, 3], [2, 4]]
A_inv = np.linalg.inv(A)       # [[-2.0, 1.0], [1.5, -0.5]]
tr = np.trace(A)               # 5
det = np.linalg.det(A)         # -2.0
```

### Special Matrices

| Matrix | Property | ML Use |
|---|---|---|
| Identity **I** | I_{ij} = δ_{ij} (Kronecker) | Baseline, residual connections |
| Diagonal **D** | D_{ij} = 0 for i ≠ j | Scaling, per-parameter learning rates |
| Symmetric **A** | **A** = **A**^T | Covariance, kernel, Gram matrices |
| Orthogonal **Q** | **Q**^T**Q** = **I** | Stable gradients, Householder reflections |
| Positive Definite **M** | **x**^T**Mx** > 0, ∀**x** ≠ 0 | Covariance must be PSD, Hessian at minimum |
| Gram **G** | G_{ij} = ⟨**x**ᵢ, **x**ⱼ⟩ | Kernel methods, inner products in feature space |

```python
# Construct a symmetric positive definite matrix
M = np.array([[3, 1], [1, 2]])
evals = np.linalg.eigvals(M)   # both positive → PSD

# Gram matrix of data matrix X (n_samples × n_features)
X = np.random.randn(100, 10)
G = X @ X.T                    # 100×100 Gram matrix

# Orthogonal matrix (QR decomposition)
Q, R = np.linalg.qr(np.random.randn(5, 5))
print(Q.T @ Q)                 # ≈ I (up to numerical precision)
```

**ML connection**: Covariance matrices are symmetric PSD. Orthogonal weight matrices (semi-orthogonal initialization) preserve gradient norm in deep nets. Gram matrices define kernel methods and style transfer (neural style loss uses Gram matrices of feature maps). Positive definiteness of the Hessian ensures a local minimum in optimization.

## Systems of Linear Equations

### The Problem **Ax** = **b**

Three regimes based on matrix rank and dimensions:

| Regime | Rank Condition | Solution Type |
|---|---|---|
| Full rank, square | rank(**A**) = m = n | Unique: **x** = **A**^{-1}**b** |
| Underdetermined | rank(**A**) = m < n | Infinite solutions, need regularization |
| Overdetermined | rank(**A**) = n < m | No exact solution → least squares |

### Least Squares Solution

Minimize the residual L₂ norm:

**x̂** = argmin_{**x**} ‖**Ax** − **b**‖₂² = argmin_{**x**} (**Ax** − **b**)^T(**Ax** − **b**)

Expand the objective:

‖**Ax** − **b**‖² = (**Ax**)^T(**Ax**) − 2(**Ax**)^T**b** + **b**^T**b** = **x**^T**A**^T**Ax** − 2**b**^T**Ax** + ‖**b**‖²

Take gradient and set to zero:

∇_{**x**} = 2**A**^T**Ax** − 2**A**^T**b** = 0  →  **A**^T**Ax̂** = **A**^T**b** (normal equations)

**Normal equations solution** (when **A** is full column rank):

**x̂** = (**A**^T**A**)^{-1}**A**^T**b**

### Moore-Penrose Pseudoinverse

**A**⁺ = (**A**^T**A**)^{-1}**A**^T  (full column rank case)

General definition: **A**⁺ satisfies: (1) **AA**⁺**A** = **A**, (2) **A**⁺**AA**⁺ = **A**⁺, (3) (**AA**⁺)^T = **AA**⁺, (4) (**A**⁺**A**)^T = **A**⁺**A**.

```python
# Overdetermined system: 50 equations, 10 unknowns
A = np.random.randn(50, 10)
b = np.random.randn(50)

# Method 1: lstsq (recommended — numerically stable via SVD)
x_lstsq, residuals, rank, sv = np.linalg.lstsq(A, b, rcond=None)

# Method 2: pseudoinverse
x_pinv = np.linalg.pinv(A) @ b

# Method 3: normal equations (less stable for ill-conditioned A)
x_normal = np.linalg.inv(A.T @ A) @ A.T @ b

print(np.allclose(x_lstsq, x_pinv))   # True
print(np.allclose(x_lstsq, x_normal)) # True (for well-conditioned A)
```

**ML connection**: Linear regression **ŷ** = **Xw** is exactly this: **ŵ** = (**X**^T**X**)^{-1}**X**^T**y**. Ridge regression adds λ**I** for numerical stability: **ŵ** = (**X**^T**X** + λ**I**)^{-1}**X**^T**y**. The pseudoinverse solves the minimal-norm least squares solution — used in linear autoencoders and PCA.

## Eigendecomposition

### Fundamentals

For a square matrix **A** ∈ ℝ^{n×n}, **λ** is an eigenvalue and **x** is its corresponding eigenvector if:

**Ax** = λ**x**, **x** ≠ 0

The eigenvalues satisfy the **characteristic polynomial**:

det(**A** − λ**I**) = 0

The eigenvectors span the invariant subspaces of **A**: applying **A** stretches/compresses **x** by λ without changing direction.

### Diagonalization

If **A** has n linearly independent eigenvectors, it is diagonalizable:

**A** = **PΛP**^{-1}

where columns of **P** are eigenvectors and **Λ** = diag(λ₁, ..., λₙ).

### Spectral Theorem (Symmetric Matrices)

For symmetric **A** = **A**^T, the eigendecomposition becomes:

**A** = **QΛQ**^T

where **Q** is orthogonal (**Q**^T**Q** = **I**). This means: (1) eigenvalues are real, (2) eigenvectors are orthogonal, (3) the matrix is orthogonally diagonalizable.

### PCA Connection

Given centered data matrix **X** ∈ ℝ^{n×d} (n samples, d features):

**Covariance**: **C** = (1/(n−1)) **X**^T**X**  (symmetric PSD)

Eigendecompose **C** = **VΛV**^T. Then:

- Columns of **V** = principal component directions (eigenvectors)
- Diagonal of **Λ** = variance along each PC (eigenvalues λᵢ)
- **V**^T**x** projects **x** onto PC coordinates
- **Explained variance ratio** = λᵢ / Σⱼλⱼ

```python
from sklearn.decomposition import PCA
import numpy as np

X = np.random.randn(100, 5)          # 100 samples, 5 features
X_centered = X - X.mean(axis=0)

# Manual PCA via eigendecomposition of covariance
C = X_centered.T @ X_centered / (99)
evals, evecs = np.linalg.eigh(C)     # eigh for symmetric → eigenvalues ascending

# Sort descending
idx = np.argsort(evals)[::-1]
evals = evals[idx]
evecs = evecs[:, idx]

explained_var_ratio = evals / evals.sum()
print(f"Explained variance: {explained_var_ratio}")
print(f"First 2 PCs capture {explained_var_ratio[:2].sum():.1%} of variance")

# Via sklearn (uses SVD internally)
pca = PCA(n_components=2)
X_pca = pca.fit_transform(X)  # projects to 2D
```

**Connection to SVD**: PCA via SVD of **X** = **USV**^T gives **C** = **V**(**S**²/(n−1))**V**^T. Right singular vectors **V** = eigenvectors of **C**. Singular values σᵢ = √(λᵢ(n−1)).

### Power Iteration

Find the **dominant eigenvalue-eigenvector pair** iteratively:

**v**_{k+1} = **Av**ₖ / ‖**Av**ₖ‖

Rayleigh quotient: λ ≈ **v**^T**Av** / **v**^T**v**

```python
def power_iteration(A, n_iter=100):
    v = np.random.randn(A.shape[1])
    for _ in range(n_iter):
        v = A @ v
        v = v / np.linalg.norm(v)
    eigenvalue = (v @ A @ v) / (v @ v)  # Rayleigh quotient
    return eigenvalue, v

A = np.array([[3, 1], [1, 2]])
lam, v = power_iteration(A)
print(f"Dominant eigenvalue: {lam:.4f}, vector: {v}")
```

**ML connection**: Power iteration is used in spectral clustering (normalized cut), PageRank (Google's original algorithm — eigenvector centrality), and GAN training (spectral normalization constrains spectral norm of weight matrices). Deflation (subtract λ**vv**^T) finds subsequent eigenvalues.

## Singular Value Decomposition (SVD)

### Definition

**Any** matrix **A** ∈ ℝ^{m×n} (m ≥ n without loss) can be factored as:

**A** = **UΣV**^T

| Component | Size | Meaning |
|---|---|---|
| **U** | m×m | Left singular vectors (columns), orthogonal |
| **Σ** | m×n | Diagonal: σ₁ ≥ σ₂ ≥ ... ≥ σ_r > 0, r = rank(**A**) |
| **V**^T | n×n | Right singular vectors (rows of V^T = columns of V), orthogonal |

In the complex case: **A** = **UΣV**^*, where **V**^* denotes conjugate transpose.

### Connection to Eigendecomposition

**A**^T**A** = **VΣ**^T**U**^T**UΣV**^T = **V**(**Σ**^T**Σ**)**V**^T = **VΛ**ₙ**V**^T

**AA**^T = **UΣV**^T**VΣ**^T**U**^T = **U**(**ΣΣ**^T)**U**^T = **UΛ**ₘ**U**^T

So the right singular vectors **V** are eigenvectors of **A**^T**A**, and σᵢ² = λᵢ. The left singular vectors **U** are eigenvectors of **AA**^T.

### Truncated SVD and Eckart-Young Theorem

The best rank-k approximation of **A** (in Frobenius norm) is the truncated SVD:

**A**ₖ = **U**ₖ**Σ**ₖ**V**ₖ^T = Σ_{i=1}^{k} σᵢ **u**ᵢ**v**ᵢ^T

Eckart-Young: ‖**A** − **A**ₖ‖_F = √(Σ_{i=k+1}^{r} σᵢ²) — the error equals the sum of discarded singular values.

```python
from scipy import linalg
from sklearn.decomposition import TruncatedSVD
import numpy as np

A = np.random.randn(50, 20)

# Full SVD
U, s, Vt = np.linalg.svd(A, full_matrices=False)
# U: 50×20, s: 20 singular values, Vt: 20×20

# Rank-5 approximation
k = 5
A_k = U[:, :k] @ np.diag(s[:k]) @ Vt[:k, :]
error = np.linalg.norm(A - A_k, 'fro')
print(f"Truncation error: {error:.4f}")
print(f"Theoretical error: {np.sqrt(np.sum(s[k:]**2)):.4f}")

# Using sklearn
svd = TruncatedSVD(n_components=k)
A_reduced = svd.fit_transform(A)   # U_k @ diag(s_k), shape 50×5
A_reconstructed = svd.inverse_transform(A_reduced)
```

### SVD Applications in ML

| Application | How SVD Is Used |
|---|---|
| **PCA** | SVD of centered **X**: principal components = **V**, scores = **US** |
| **Matrix factorization** | ALS for recommenders: factorize **R** ≈ **PQ**^T via truncated SVD |
| **Collaborative filtering** | FunkSVD: fit **UσV**^T with SGD on observed ratings only |
| **Dimensionality reduction** | Project **X**ₖ = **X****V**ₖ — best linear dimension reduction |
| **Image compression** | Keep top-k singular values, store **U**ₖ, **Σ**ₖ, **V**ₖ (k(m+n) ≪ mn) |
| **Low-rank adaptation (LoRA)** | Fine-tune **W** + **BA** where **B**, **A** are low-rank — SVD-inspired |
| **Spectral normalization** | Constrain ‖**W**‖₂ = σ₁ via power iteration in each step |
| **Numerical stability** | Pseudoinverse via SVD: **A**⁺ = **VΣ**⁺**U**^T, invert only σᵢ > ε |

```python
# Image compression with SVD
import numpy as np
from skimage import data, color

# img = color.rgb2gray(data.camera())  # 512×512
# For demonstration, random matrix:
img = np.random.randn(256, 256)
U, s, Vt = np.linalg.svd(img, full_matrices=False)

compression_ratios = [0.01, 0.05, 0.1, 0.2]
for ratio in compression_ratios:
    k = int(ratio * min(img.shape))
    img_compressed = U[:, :k] @ np.diag(s[:k]) @ Vt[:k, :]
    storage = k * (img.shape[0] + img.shape[1] + 1)
    original = img.shape[0] * img.shape[1]
    print(f"k={k}: compression={storage/original:.2%}")
    # SSIM would go here in practice
```

## Norms and Metric Spaces

### Vector Norms Summary

| Norm | Formula | Geometry | Induces Sparsity? |
|---|---|---|---|
| L₀ | ‖**x**‖₀ = count(xᵢ ≠ 0) | Counting | Yes (direct, but NP-hard) |
| L₁ | ‖**x**‖₁ = Σ|xᵢ| | Diamond | Yes (convex relaxation) |
| L₂ | ‖**x**‖₂ = √Σxᵢ² | Sphere | No |
| Lₚ | ‖**x**‖_ₚ = (Σ|xᵢ|ᵖ)^{1/p} | Interpolates | As p → 1 |
| L∞ | ‖**x**‖_∞ = max|xᵢ| | Hypercube | No |

### Matrix Norms

**Frobenius norm**:

‖**A**‖_F = √(Σᵢⱼ Aᵢⱼ²) = √(tr(**A**^T**A**)) = √(Σₖ σₖ²)

**Spectral norm** (operator norm induced by L₂):

‖**A**‖₂ = σ_max(**A**) = √(λ_max(**A**^T**A**))

```python
A = np.random.randn(10, 5)

frob = np.linalg.norm(A, 'fro')   # Frobenius
spec = np.linalg.norm(A, 2)       # Spectral = largest singular value
nuc = np.linalg.norm(A, 'nuc')    # Nuclear = sum of singular values

# Verify spectral norm equals max singular value
_, s, _ = np.linalg.svd(A)
print(f"Spectral norm: {spec:.4f}, max σ: {s[0]:.4f}")
```

### Important Inequalities

**Cauchy-Schwarz**: |⟨**a**, **b**⟩| ≤ ‖**a**‖‖**b**‖. Equality when **a** and **b** are collinear.

**Triangle inequality**: ‖**a** + **b**‖ ≤ ‖**a**‖ + ‖**b**‖.

**Holder's inequality**: |⟨**a**, **b**⟩| ≤ ‖**a**‖_ₚ ‖**b**‖_q where 1/p + 1/q = 1.

### Dual Norms

The dual norm of ‖·‖ is ‖**z**‖_* = sup_{‖**x**‖ ≤ 1} ⟨**z**, **x**⟩. L₂ is self-dual. L₁ and L∞ are duals of each other.

**ML connection**: L₁ (Lasso) = MAP with Laplace prior: p(w|λ) = (λ/2)exp(−λ|w|). L₂ (Ridge) = MAP with Gaussian prior: p(w|σ²) ∝ exp(−w²/(2σ²)). L₁ produces sparse solutions because the diamond-shaped constraint region has corners on axes where coordinates are zero. L₂ regularization produces weight decay gradient: ∂/∂w(λ‖w‖²) = 2λw.

```python
from sklearn.linear_model import Lasso, Ridge

# L1 regularization (Lasso) — feature selection
lasso = Lasso(alpha=0.1)
lasso.fit(X, y)
print(f"Non-zero coefficients: {np.sum(lasso.coef_ != 0)}/{len(lasso.coef_)}")

# L2 regularization (Ridge) — weight decay
ridge = Ridge(alpha=0.1)
ridge.fit(X, y)
```

## Matrix Calculus

### Gradient of Scalar Function

For f: ℝⁿ → ℝ, the gradient is a column vector:

∇_{**x**} f(**x**) = (∂f/∂x₁, ∂f/∂x₂, ..., ∂f/∂xₙ)^T

### Common Vector/Gradients

| f(**x**) | ∇_{**x**} f(**x**) | ML Context |
|---|---|---|
| **a**^T**x** | **a** | Linear model output |
| **x**^T**Ax** | (**A** + **A**^T)**x** | Quadratic form (if symmetric: 2**Ax**) |
| ‖**x**‖² = **x**^T**x** | 2**x** | L₂ regularization |
| ‖**Ax** − **b**‖² | 2**A**^T(**Ax** − **b**) | MSE gradient |
| log Σᵢ exp(xᵢ) | softmax(**x**) = exp(**x**)/Σⱼexp(xⱼ) | Log-sum-exp, multiclass |

### Jacobian Matrix

For **f**: ℝⁿ → ℝᵐ, the Jacobian is m×n:

**J**(**x**) = ∂**f**/∂**x**^T = [∂fᵢ/∂xⱼ]_{i=1,...,m; j=1,...,n}

### Hessian Matrix

For f: ℝⁿ → ℝ twice differentiable, the Hessian is n×n symmetric:

**H**(**x**) = ∇²f(**x**) = [∂²f/∂xᵢ∂xⱼ]_{i,j=1,...,n}

```python
import jax.numpy as jnp
from jax import grad, jacobian, hessian

def f(x):
    return jnp.sum(x ** 2)

def g(x):
    return jnp.array([x[0]**2 + x[1], x[0] * x[1]])

x = jnp.array([2.0, 3.0])

print(grad(f)(x))                # [4., 6.]
print(jacobian(g)(x))            # [[2., 1.], [3., 2.]]
print(hessian(f)(x))             # [[2., 0.], [0., 2.]]
```

**ML connection**: The gradient ∇L is the direction of steepest ascent; SGD moves opposite. The Hessian determines curvature — if H ≻ 0 (positive definite), the point is a local minimum. Second-order methods (Newton, BFGS) precondition with H^{-1} for faster convergence. In transformers, the Hessian of attention layers relates to the theoretical understanding of in-context learning.

## Special Matrix Products

### Kronecker Product (⊗)

**A** ⊗ **B** replaces each element aᵢⱼ of **A** with the entire matrix aᵢⱼ**B**:

**A** ∈ ℝ^{m×n}, **B** ∈ ℝ^{p×q} → **A** ⊗ **B** ∈ ℝ^{mp×nq}

Properties:
- (**A** ⊗ **B**)(**C** ⊗ **D**) = (**AC**) ⊗ (**BD**)
- (**A** ⊗ **B**)^T = **A**^T ⊗ **B**^T
- (**A** ⊗ **B**)⁻¹ = **A**⁻¹ ⊗ **B**⁻¹ (when invertible)

### Hadamard Product (⊙)

Element-wise multiplication: (**A** ⊙ **B**)ᵢⱼ = Aᵢⱼ · Bᵢⱼ

Same dimensions required. Used in gating mechanisms.

### Khatri-Rao Product

Column-wise Kronecker product: **A** ⊙ **B** = [**a**₁ ⊗ **b**₁, **a**₂ ⊗ **b**₂, ...]

```python
from numpy import kron

A = np.array([[1, 2], [3, 4]])
B = np.array([[0, 5], [6, 7]])

kron_prod = kron(A, B)          # Kronecker, shape 4×4
had_prod = A * B                # Hadamard (element-wise), shape 2×2

print(kron_prod.shape)   # (4, 4)
print(had_prod)           # [[0, 10], [18, 28]]
```

**ML connection**: Kronecker factorization for efficient matrix computation in transformers (partition attention into smaller subspaces). Hadamard product is the core of LSTM/GRU gates: **g** = σ(**Wx** + **b**) ⊙ tanh(**c**). The gate vector modulates information flow. KHATRI-Rao product appears in CP tensor decomposition and some multi-view learning algorithms.

## Matrix Decompositions Reference

### Comparison Table

| Decomposition | Formula | Requirements | Complexity | Best For |
|---|---|---|---|---|
| **LU** | **A** = **LU** | Square, invertible | O(n³) | Solving linear systems |
| **QR** | **A** = **QR** | Any matrix | O(mn²) | LS, numerically stable |
| **Cholesky** | **A** = **LL**^T | Symmetric PD | O(n³/3) | Fastest for PD systems |
| **Eigen** | **A** = **QΛQ**^{-1} | Square | O(n³) | Spectral analysis |
| **SVD** | **A** = **UΣV**^T | Any matrix | O(mn²) | Most general, robust |

### Cholesky Decomposition

For symmetric positive definite **A** ∈ ℝ^{n×n}:

**A** = **LL**^T

where **L** is lower triangular. This is the matrix equivalent of √a.

**Key use**: Sampling from multivariate normal: **x** = **μ** + **Lz** where **z** ∼ N(0, **I**).

```python
# Cholesky for MVN sampling
from scipy.linalg import cholesky

# Covariance matrix
Sigma = np.array([[4, 1], [1, 3]])
L = cholesky(Sigma, lower=True)

# Sample from N(0, Sigma)
z = np.random.randn(2, 10000)
samples = L @ z                 # shape (2, 10000)
print(np.cov(samples))          # ≈ [[4, 1], [1, 3]]
```

**ML connection**: Cholesky is used in Gaussian processes (GPyTorch uses modified Cholesky), Kalman filters, and Natural Gradient Descent where the Fisher Information Matrix must be factorized.

### QR Decomposition

**A** = **QR** where **Q** is orthogonal (m×m or m×n) and **R** is upper triangular.

**Use in least squares**: Solve **Rx** = **Q**^T**b** via back-substitution (avoid normal equations).

```python
A = np.random.randn(50, 10)
b = np.random.randn(50)

Q, R = np.linalg.qr(A)
x_qr = np.linalg.solve(R, Q.T @ b)  # numerically stable LS
x_lstsq = np.linalg.lstsq(A, b, rcond=None)[0]
print(np.allclose(x_qr, x_lstsq))    # True
```

### Choosing the Right Decomposition

| Problem | Recommended Decomposition | Why |
|---|---|---|
| Solve **Ax** = **b** (square) | LU or Cholesky (if PD) | Fast, direct |
| Linear regression (LS) | QR or SVD | Numerically stable |
| PCA / dimensionality reduction | SVD of centered **X** | Works for any **X** |
| Covariance sampling | Cholesky | Fast, O(n³/3) |
| Low-rank approximation | Truncated SVD | Optimal per Eckart-Young |
| Matrix inverse | SVD (via pseudoinverse) | Handles rank deficiency |
| Spectral norm constraint | Power iteration on SVD | O(n²) per iteration |

## Common Vector/Matrix Identities

### Transpose and Inverse

| Identity | Condition |
|---|---|
| (**AB**)^T = **B**^T**A**^T | Always |
| (**AB**)⁻¹ = **B**⁻¹**A**⁻¹ | **A**, **B** invertible |
| (**A**⁻¹)^T = (**A**^T)⁻¹ | **A** invertible |
| (**A** + **B**)^T = **A**^T + **B**^T | Always |

### Trace Identities

| Identity | Condition |
|---|---|
| tr(**ABC**) = tr(**CAB**) = tr(**BCA**) | Cyclic permutation |
| tr(**A** + **B**) = tr(**A**) + tr(**B**) | Same size |
| tr(**A**) = Σᵢ λᵢ | Sum of eigenvalues |
| tr(**A**^T**B**) = vec(**A**)·vec(**B**) | Frobenius inner product |
| tr(**A**^T**A**) = Σₖ σₖ² | Sum of squared singular values |
| tr(**A**) = tr(**Q**^T**AQ**) | Invariant under similarity |

### Determinant Identities

| Identity | Condition |
|---|---|
| det(**AB**) = det(**A**)det(**B**) | Square matrices |
| det(**A**⁻¹) = 1/det(**A**) | **A** invertible |
| det(**Q**) = ±1 | **Q** orthogonal |
| det(**Λ**) = ∏ᵢ λᵢ | Determinant = product of eigenvalues |
| det(**I** + **uv**^T) = 1 + **v**^T**u** | **Matrix determinant lemma** (rank-1 update) |
| det(**A** + **uv**^T) = det(**A**)(1 + **v**^T**A**⁻¹**u**) | General rank-1 update |
| det(c**A**) = cⁿdet(**A**) | Scalar multiplication, n×n matrix |

### Matrix Inversion Identities

**Sherman-Morrison formula** (rank-1 update):

(**A** + **uv**^T)⁻¹ = **A**⁻¹ − (**A**⁻¹**uv**^T**A**⁻¹) / (1 + **v**^T**A**⁻¹**u**)

**Woodbury identity** (general low-rank update):

(**A** + **UCV**)⁻¹ = **A**⁻¹ − **A**⁻¹**U**(**C**⁻¹ + **VA**⁻¹**U**)⁻¹**VA**⁻¹

**ML connection**: Woodbury is used in Gaussian processes for efficient computation: (**K** + σ²**I**)⁻¹**y** where **K** is n×n kernel matrix. When using inducing points, the Nyström approximation makes **K** = **K**_{nm}**K**_{mm}⁻¹**K**_{mn}, and Woodbury reduces complexity from O(n³) to O(m³), m ≪ n.

### Vector Calculus Identities

| Expression | Result | Type |
|---|---|---|
| ∂/∂**x** (**a**^T**x**) | **a** | Vector |
| ∂/∂**x** (**x**^T**x**) | 2**x** | Vector |
| ∂/∂**x** (**x**^T**Ax**) | (**A** + **A**^T)**x** | Vector |
| ∂/∂**x** (**x**^T**A**^T**Ax**) | 2**A**^T**Ax** | Vector (symmetric quadratic) |
| ∂/∂**X** tr(**AX**) | **A**^T | Matrix |
| ∂/∂**X** tr(**X**^T**AX**) | (**A** + **A**^T)**X** | Matrix |
| ∂/∂**X** ‖**X**‖_F² | 2**X** | Matrix |

```python
# Verify identities numerically
x = np.random.randn(5)
a = np.random.randn(5)
A = np.random.randn(5, 5)

# d/dx (a^T x) = a
eps = 1e-6
f_x = a @ x
f_xph = a @ (x + eps * np.eye(5)[0])
numerical = (f_xph - f_x) / eps
print(f"∂/∂x₁ (a^Tx) ≈ {numerical:.4f}, a₁ = {a[0]:.4f}")  # Should match
```

## Practical ML Applications Summary

| ML Task | Linear Algebra Concept | Why It Matters |
|---|---|---|
| Neural network forward pass | Matrix multiplication **Wx** + **b** | Every layer is a linear transform + nonlinearity |
| Backpropagation | Chain rule via Jacobians | Gradients flow through matrix multiplications |
| Self-attention | **QK**^T/√dₖ → softmax → **AV** | Dot products between query-key pairs |
| Word embeddings | Cosine similarity = ⟨**v**, **w**⟩/(‖**v**‖‖**w**‖) | Semantic similarity via inner product |
| Linear regression | Normal equations (**X**^T**X**)⁻¹**X**^T**y** | Closed-form solution via pseudoinverse |
| Regularization | L₁/L₂ norms | Sparsity vs shrinkage |
| PCA | Eigendecomposition of covariance | Unsupervised dimension reduction |
| Recommender systems | Truncated SVD of user-item matrix | Collaborative filtering via low-rank factorization |
| LoRA fine-tuning | **W** + **BA**, rank r ≪ d | Parameter-efficient fine-tuning via low-rank decomposition |
| Gaussian processes | Cholesky decomposition of kernel matrix | Sampling and inference in function space |
| Spectral clustering | Eigendecomposition of graph Laplacian | Unsupervised clustering via spectral embedding |
| Normalizing flows | Jacobian determinant for density change | log det(**J**) = Σ log |diag(**J**)| for triangular flows |
| GANs | Singular value decomposition of weight matrices | Spectral normalization stabilizes training |
