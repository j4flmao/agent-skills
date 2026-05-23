# Machine Learning Algorithms — Mathematical Derivations

## Support Vector Machines (SVM)

### Primal Form (Hard Margin)

minimize (1/2)‖w‖² subject to yᵢ(w·xᵢ + b) ≥ 1 for all i

Margin = 2/‖w‖ (distance between support vectors)

### Primal Form (Soft Margin)

minimize (1/2)‖w‖² + CΣξᵢ subject to yᵢ(w·xᵢ + b) ≥ 1 - ξᵢ, ξᵢ ≥ 0
C controls penalty on margin violations (large C → hard margin)

### Dual Form

Convert to Lagrangian:
L(w,b,ξ,α,r) = (1/2)‖w‖² + CΣξᵢ - Σαᵢ[yᵢ(w·xᵢ + b) - 1 + ξᵢ] - Σrᵢξᵢ

KKT conditions:
∂L/∂w = 0 → w = Σαᵢyᵢxᵢ
∂L/∂b = 0 → Σαᵢyᵢ = 0
∂L/∂ξᵢ = 0 → C - αᵢ - rᵢ = 0

Substitute into Lagrangian → dual:
maximize Σαᵢ - ½ΣΣαᵢαⱼyᵢyⱼ(xᵢ·xⱼ)
subject to 0 ≤ αᵢ ≤ C, Σαᵢyᵢ = 0

αᵢ > 0 only for support vectors (points on or inside margin)

### SVM Dual via NumPy (SMO Simplified)

```python
import numpy as np

class SVM:
    def __init__(self, C=1.0, kernel='linear', gamma=None):
        self.C = C
        self.kernel = kernel
        self.gamma = gamma
        self.alpha = None
        self.b = 0
        self.support_vectors = None
        self.support_labels = None

    def _kernel_fn(self, X1, X2):
        if self.kernel == 'linear':
            return X1 @ X2.T
        elif self.kernel == 'rbf':
            X1_norm = np.sum(X1**2, axis=1, keepdims=True)
            X2_norm = np.sum(X2**2, axis=1, keepdims=True)
            dist2 = X1_norm + X2_norm.T - 2 * X1 @ X2.T
            return np.exp(-self.gamma * np.maximum(dist2, 0))
        elif self.kernel == 'poly':
            return (X1 @ X2.T + 1) ** self.gamma

    def fit(self, X, y, max_iter=1000, tol=1e-3):
        n = X.shape[0]
        self.alpha = np.zeros(n)
        self.b = 0
        K = self._kernel_fn(X, X)
        for _ in range(max_iter):
            alpha_prev = self.alpha.copy()
            for i in range(n):
                E_i = np.sum(self.alpha * y * K[:, i]) + self.b - y[i]
                if (y[i] * E_i < -tol and self.alpha[i] < self.C) or \
                   (y[i] * E_i > tol and self.alpha[i] > 0):
                    j = np.random.choice([x for x in range(n) if x != i])
                    E_j = np.sum(self.alpha * y * K[:, j]) + self.b - y[j]
                    alpha_i_old, alpha_j_old = self.alpha[i], self.alpha[j]
                    if y[i] == y[j]:
                        L = max(0, self.alpha[j] + self.alpha[i] - self.C)
                        H = min(self.C, self.alpha[j] + self.alpha[i])
                    else:
                        L = max(0, self.alpha[j] - self.alpha[i])
                        H = min(self.C, self.C + self.alpha[j] - self.alpha[i])
                    if L == H:
                        continue
                    eta = 2 * K[i, j] - K[i, i] - K[j, j]
                    if eta >= 0:
                        continue
                    self.alpha[j] -= y[j] * (E_i - E_j) / eta
                    self.alpha[j] = np.clip(self.alpha[j], L, H)
                    if abs(self.alpha[j] - alpha_j_old) < 1e-5:
                        continue
                    self.alpha[i] += y[i] * y[j] * (alpha_j_old - self.alpha[j])
                    b1 = self.b - E_i - y[i] * (self.alpha[i] - alpha_i_old) * K[i, i] \
                         - y[j] * (self.alpha[j] - alpha_j_old) * K[i, j]
                    b2 = self.b - E_j - y[i] * (self.alpha[i] - alpha_i_old) * K[i, j] \
                         - y[j] * (self.alpha[j] - alpha_j_old) * K[j, j]
                    if 0 < self.alpha[i] < self.C:
                        self.b = b1
                    elif 0 < self.alpha[j] < self.C:
                        self.b = b2
                    else:
                        self.b = (b1 + b2) / 2
            diff = np.linalg.norm(self.alpha - alpha_prev)
            if diff < tol:
                break
        sv_idx = self.alpha > 1e-5
        self.support_vectors = X[sv_idx]
        self.support_labels = y[sv_idx]
        self.alpha_sv = self.alpha[sv_idx]
        self.b = -0.5 * (np.max(np.sum(self.alpha * y * K[:, y == -1], axis=0) + self.b)
                         + np.min(np.sum(self.alpha * y * K[:, y == 1], axis=0) + self.b))

    def predict(self, X):
        K = self._kernel_fn(X, self.support_vectors)
        return np.sign(K @ (self.alpha_sv * self.support_labels) + self.b)
```

### Kernel Trick

Replace xᵢ·xⱼ with K(xᵢ, xⱼ) = φ(xᵢ)·φ(xⱼ) (feature map φ)

**Common kernels:**
- Linear: K(xᵢ,xⱼ) = xᵢ·xⱼ
- Polynomial: K(xᵢ,xⱼ) = (xᵢ·xⱼ + c)^d
- RBF/Gaussian: K(xᵢ,xⱼ) = exp(-γ‖xᵢ - xⱼ‖²), γ = 1/(2σ²)
- Sigmoid: K(xᵢ,xⱼ) = tanh(κxᵢ·xⱼ + c)

### Mercer's Theorem

A symmetric function K(x,z) is a valid kernel iff the Gram matrix K(xᵢ,xⱼ) is positive semidefinite for any set of points. Equivalently: ΣᵢΣⱼcᵢcⱼK(xᵢ,xⱼ) ≥ 0 for any coefficients cᵢ.

### SMO (Sequential Minimal Optimization)

At each step, select two αᵢ, αⱼ and optimize analytically
Much faster than general QP solver

### SVM Decision Function

f(x) = Σᵢ αᵢyᵢK(xᵢ, x) + b
Only support vectors (αᵢ > 0) contribute — sparsity inherent in the solution

## Decision Trees

### Entropy

H(S) = -Σ_{k=1}^{K} p_k log₂ p_k where p_k = proportion of class k in set S

### Gini Impurity

G(S) = 1 - Σ_{k=1}^{K} p_k² = Σ_{k≠l} p_kp_l (probability of misclassification)

### Information Gain

IG(S, A) = H(S) - Σ_{v∈Values(A)} (|S_v|/|S|)·H(S_v)
Split on attribute A that maximizes IG

### Gain Ratio (C4.5)

SplitInfo(S, A) = -Σ(|S_v|/|S|)·log₂(|S_v|/|S|)
GainRatio = IG(S, A) / SplitInfo(S, A)
Prevents bias toward attributes with many values

### CART (Classification and Regression Trees)

Binary splits only. Regression: minimize Σ(yᵢ - ȳ_left)² + Σ(yⱼ - ȳ_right)²
Pruning: cost-complexity pruning, minimize Σ(yᵢ - ŷᵢ)² + α|T|

```python
import numpy as np

class DecisionTreeRegressor:
    def __init__(self, max_depth=5, min_samples_split=2):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree = None

    def _mse(self, y):
        return np.var(y) * len(y)

    def _best_split(self, X, y):
        best_gain, best_col, best_thresh = -1, None, None
        parent_mse = self._mse(y)
        n = X.shape[0]
        for col in range(X.shape[1]):
            sorted_idx = np.argsort(X[:, col])
            for i in range(1, n):
                if X[sorted_idx[i], col] == X[sorted_idx[i-1], col]:
                    continue
                thresh = (X[sorted_idx[i], col] + X[sorted_idx[i-1], col]) / 2
                left_idx = X[:, col] <= thresh
                right_idx = ~left_idx
                if left_idx.sum() < self.min_samples_split or right_idx.sum() < self.min_samples_split:
                    continue
                gain = parent_mse - self._mse(y[left_idx]) - self._mse(y[right_idx])
                if gain > best_gain:
                    best_gain = gain
                    best_col = col
                    best_thresh = thresh
        return best_col, best_thresh

    def _build_tree(self, X, y, depth=0):
        if depth >= self.max_depth or len(y) < self.min_samples_split or np.var(y) < 1e-7:
            return {'value': np.mean(y)}
        col, thresh = self._best_split(X, y)
        if col is None:
            return {'value': np.mean(y)}
        left_idx = X[:, col] <= thresh
        return {
            'col': col, 'thresh': thresh,
            'left': self._build_tree(X[left_idx], y[left_idx], depth + 1),
            'right': self._build_tree(X[~left_idx], y[~left_idx], depth + 1)
        }

    def fit(self, X, y):
        self.tree = self._build_tree(X, y)

    def _predict_one(self, x, node):
        if 'value' in node:
            return node['value']
        if x[node['col']] <= node['thresh']:
            return self._predict_one(x, node['left'])
        return self._predict_one(x, node['right'])

    def predict(self, X):
        return np.array([self._predict_one(x, self.tree) for x in X])
```

## Ensemble Methods

### Bagging (Bootstrap Aggregating)

Train models on B bootstrap samples (sample with replacement)
Average predictions (regression) or majority vote (classification)
Variance reduction: Var(ensemble) = ρσ² + (1-ρ)σ²/B where ρ is model correlation
If models are independent (ρ=0), variance = σ²/B. In practice ρ > 0, but still reduces variance

### Random Forest

Bagging + random feature selection at each split (√p features for classification, p/3 for regression)
Further decorrelates trees → lower ρ → lower ensemble variance

```python
class RandomForestRegressor:
    def __init__(self, n_trees=100, max_depth=5, max_features='sqrt'):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.max_features = max_features
        self.trees = []

    def fit(self, X, y):
        n, p = X.shape
        self.trees = []
        if self.max_features == 'sqrt':
            m = int(np.sqrt(p))
        elif self.max_features == 'log2':
            m = int(np.log2(p)) + 1
        else:
            m = p
        for _ in range(self.n_trees):
            boot_idx = np.random.choice(n, n, replace=True)
            X_boot = X[boot_idx]
            y_boot = y[boot_idx]
            tree = DecisionTreeRegressor(max_depth=self.max_depth)
            # Random feature subset at each split is handled in _best_split
            # by restricting columns to a random subset
            tree.X_subset = lambda: np.random.choice(p, m, replace=False)
            tree.fit(X_boot, y_boot)
            self.trees.append(tree)

    def predict(self, X):
        preds = np.array([t.predict(X) for t in self.trees])
        return preds.mean(axis=0)
```

### Boosting (AdaBoost)

Initialize weights wᵢ⁽¹⁾ = 1/n for all i
For m = 1 to M:
  Fit classifier G_m(x) to weighted data
  ε_m = Σwᵢ⁽ᵐ⁾·𝟙(yᵢ ≠ G_m(xᵢ)) / Σwᵢ⁽ᵐ⁾ (weighted error)
  α_m = ln((1-ε_m)/ε_m)  (classifier weight)
  wᵢ⁽ᵐ⁺¹⁾ = wᵢ⁽ᵐ⁾·exp(α_m·𝟙(yᵢ ≠ G_m(xᵢ)))  (update weights)
Final: G(x) = sign(Σα_m·G_m(x))

```python
class AdaBoost:
    def __init__(self, n_estimators=50):
        self.n_estimators = n_estimators
        self.alphas = []
        self.classifiers = []

    def fit(self, X, y):
        n = X.shape[0]
        w = np.ones(n) / n
        for _ in range(self.n_estimators):
            stump = DecisionTreeRegressor(max_depth=1)
            stump.fit(X, y)
            pred = stump.predict(X)
            pred_bin = np.where(pred > 0, 1, -1)
            err = w[pred_bin != y].sum() / w.sum()
            if err >= 0.5:
                break
            alpha = 0.5 * np.log((1 - err) / max(err, 1e-10))
            w = w * np.exp(-alpha * y * pred_bin)
            w /= w.sum()
            self.alphas.append(alpha)
            self.classifiers.append(stump)

    def predict(self, X):
        preds = np.zeros(X.shape[0])
        for alpha, clf in zip(self.alphas, self.classifiers):
            preds += alpha * clf.predict(X)
        return np.sign(preds)
```

### Gradient Boosting (GBM)

For m = 1 to M:
  r_im = -[∂L(yᵢ, F(xᵢ))/∂F(xᵢ)]_{F=F_{m-1}}  (pseudo-residuals = negative gradient)
  Fit regression tree h_m(x) to residuals r_im
  ρ_m = argmin_ρ ΣL(yᵢ, F_{m-1}(xᵢ) + ρh_m(xᵢ))  (line search)
  F_m(x) = F_{m-1}(x) + νρ_mh_m(x)  (ν = learning rate)

```python
class GradientBoostingRegressor:
    def __init__(self, n_estimators=100, lr=0.1, max_depth=3):
        self.n_estimators = n_estimators
        self.lr = lr
        self.max_depth = max_depth
        self.trees = []

    def fit(self, X, y):
        n = X.shape[0]
        self.F0 = y.mean()
        F = np.full(n, self.F0)
        for _ in range(self.n_estimators):
            residuals = y - F
            tree = DecisionTreeRegressor(max_depth=self.max_depth)
            tree.fit(X, residuals)
            h = tree.predict(X)
            # Line search for optimal step size
            rho = np.dot(residuals, h) / np.dot(h, h)
            F += self.lr * rho * h
            self.trees.append((rho, tree))

    def predict(self, X):
        pred = np.full(X.shape[0], self.F0)
        for rho, tree in self.trees:
            pred += self.lr * rho * tree.predict(X)
        return pred
```

## XGBoost — Mathematical Derivation

### Objective

L^{(t)} = Σ_{i=1}^{n} l(yᵢ, ŷᵢ^{(t-1)} + f_t(xᵢ)) + Ω(f_t)
where Ω(f) = γT + ½λ‖w‖² (regularization: T = leaves, w = leaf weights)

### Second-Order Taylor Expansion

L^{(t)} ≈ Σ[l(yᵢ, ŷ^{(t-1)}) + gᵢf_t(xᵢ) + ½hᵢf_t(xᵢ)²] + Ω(f_t)
where gᵢ = ∂_{ŷ^{(t-1)}} l(yᵢ, ŷ^{(t-1)}), hᵢ = ∂²_{ŷ^{(t-1)}} l(yᵢ, ŷ^{(t-1)})

### Remove Constant Term, For Each Leaf j

Let Iⱼ = {i | q(xᵢ) = j} (instances in leaf j)

L^{(t)} = Σ_{j=1}^{T} [Gⱼwⱼ + ½(Hⱼ + λ)wⱼ²] + γT
where Gⱼ = Σ_{i∈Iⱼ} gᵢ, Hⱼ = Σ_{i∈Iⱼ} hᵢ

### Optimal Leaf Weight (Closed Form)

wⱼ* = -Gⱼ/(Hⱼ + λ)

### Optimal Objective Value

L* = -½Σ(Gⱼ²/(Hⱼ + λ)) + γT

### Split Gain Formula

Gain = ½[G_L²/(H_L + λ) + G_R²/(H_R + λ) - (G_L+G_R)²/(H_L+H_R+λ)] - γ
First two terms: left + right gain. Third: parent gain (no split). γ: split penalty.
Only split if Gain > 0.

### XGBoost Gain Calculation

```python
import numpy as np

def xgb_split_gain(g_left, h_left, g_right, h_right, lam=1.0, gamma=0.0):
    left = g_left**2 / (h_left + lam)
    right = g_right**2 / (h_right + lam)
    parent = (g_left + g_right)**2 / (h_left + h_right + lam)
    gain = 0.5 * (left + right - parent) - gamma
    return gain

def xgb_leaf_weight(G, H, lam=1.0):
    return -G / (H + lam)

def xgb_find_best_split(X, y, F_prev, lam=1.0, gamma=0.0):
    n = X.shape[0]
    g = F_prev - y  # gradient for squared error
    h = np.ones(n)  # hessian for squared error
    best_gain = -np.inf
    best_col, best_thresh = None, None
    for col in range(X.shape[1]):
        idx = np.argsort(X[:, col])
        G_total = g.sum()
        H_total = h.sum()
        G_left, H_left = 0.0, 0.0
        for i in range(n - 1):
            G_left += g[idx[i]]
            H_left += h[idx[i]]
            G_right = G_total - G_left
            H_right = H_total - H_left
            if H_left < 1e-8 or H_right < 1e-8:
                continue
            gain = xgb_split_gain(G_left, H_left, G_right, H_right, lam, gamma)
            if gain > best_gain:
                best_gain = gain
                best_col = col
                best_thresh = (X[idx[i], col] + X[idx[i+1], col]) / 2
    return best_col, best_thresh, best_gain
```

### Column Block for Parallel Learning

Pre-sort features, store in compressed column (CSC) format
Each block fits in memory, parallel scanning for best split

### XGBoost vs GBM

| Feature | GBM | XGBoost |
|---|---|---|
| Gradient order | First-order only | First + second order (Newton) |
| Regularization | None built-in | γT + ½λ‖w‖² |
| Split finding | Greedy, no sparsity handling | Weighted quantile sketch |
| Missing values | Needs imputation | Learned direction |
| Hardware | Single-core | Parallel column blocks |

### LightGBM Differences

GOSS (Gradient-based One-Side Sampling): keep large-gradient instances, randomly sample small-gradient ones
EFB (Exclusive Feature Bundling): bundle mutually exclusive features to reduce dimensionality
Leaf-wise (not level-wise) tree growth: deeper trees, more efficient but can overfit

### CatBoost Differences

Ordered boosting: use ordered target statistics to prevent target leakage
Symmetric trees: both children at same depth, faster inference
Oblivious trees: same split condition across all nodes at same level

## PCA — Principal Component Analysis

### Maximize Variance Formulation

Find w with ‖w‖ = 1 maximizing Var(wᵀX) = wᵀΣw

Lagrangian: L(w, λ) = wᵀΣw - λ(wᵀw - 1)
∂L/∂w = 2Σw - 2λw = 0 → Σw = λw → w is eigenvector of Σ, λ is eigenvalue
Var(projection) = wᵀΣw = λ → λ is variance explained

### Minimize Reconstruction Error

minimize 𝔼[‖X - wwᵀX‖²] subject to ‖w‖ = 1
Same solution: w is top eigenvector

### SVD Equivalence

PCA of centered X: X = UΣVᵀ
Principal components: XV = UΣ (scores)
Loading vectors: V (eigenvectors)
Variance explained: σᵢ²/Σσⱼ² (σᵢ from SVD diagonal)

### PCA via SVD

```python
import numpy as np

class PCA:
    def __init__(self, n_components=None):
        self.n_components = n_components
        self.components = None
        self.mean = None
        self.explained_variance_ratio = None
        self.singular_values = None

    def fit(self, X):
        self.mean = X.mean(axis=0)
        X_centered = X - self.mean
        # SVD is more numerically stable than eigendecomposition of X^T X
        U, s, Vt = np.linalg.svd(X_centered, full_matrices=False)
        self.singular_values = s
        self.components = Vt
        total_var = np.sum(s**2)
        self.explained_variance_ratio = s**2 / total_var
        if self.n_components:
            self.components = self.components[:self.n_components]
            self.explained_variance_ratio = self.explained_variance_ratio[:self.n_components]
        return self

    def transform(self, X):
        X_centered = X - self.mean
        return X_centered @ self.components.T

    def fit_transform(self, X):
        self.fit(X)
        return self.transform(X)

    def inverse_transform(self, X_reduced):
        return X_reduced @ self.components + self.mean

# Scree plot helper
def scree_plot(explained_variance_ratio):
    cumulative = np.cumsum(explained_variance_ratio)
    n_95 = np.searchsorted(cumulative, 0.95) + 1
    return n_95, cumulative
```

### Choosing Number of Components

| Method | Rule |
|---|---|
| Explained variance threshold | Keep until cumulative variance > 0.9 or 0.95 |
| Kaiser rule | Keep eigenvalues > 1 (for correlation matrix) |
| Scree plot (elbow) | Find elbow in eigenvalue curve |
| Cross-validation | Minimize reconstruction error on held-out data |

### PCA Connections

PCA → SVD: most numerically stable implementation
PCA → Autoencoder: linear autoencoder learns PCA subspace
PCA → Whitening: ZCA whitening = PCA whitening rotated back to original basis
PCA → KPCA: kernel PCA applies the kernel trick before PCA

## K-Means

### Objective

minimize Σ_{k=1}^{K} Σ_{x∈C_k} ‖x - μ_k‖² where μ_k = (1/|C_k|)Σ_{x∈C_k} x

### Algorithm (Lloyd's)

1. Initialize K centroids μ₁,...,μ_K
2. Assign: cᵢ = argmin_k ‖xᵢ - μ_k‖² (E-step)
3. Update: μ_k = (1/|C_k|)Σ_{x∈C_k} x (M-step)
4. Converges when assignments don't change

Monotonically decreases objective. Converges to local minimum.

### K-Means++ Initialization

Choose first centroid uniformly at random
For each subsequent centroid, choose x with probability proportional to D(x)² where D(x) = min_k ‖x - μ_k‖
Guarantees O(log K) approximation to optimal clustering

```python
import numpy as np

class KMeans:
    def __init__(self, n_clusters=8, max_iter=300, init='kmeans++'):
        self.n_clusters = n_clusters
        self.max_iter = max_iter
        self.init = init
        self.centroids = None

    def _initialize(self, X):
        n = X.shape[0]
        if self.init == 'random':
            idx = np.random.choice(n, self.n_clusters, replace=False)
            return X[idx]
        # k-means++
        centroids = [X[np.random.randint(n)]]
        for _ in range(1, self.n_clusters):
            dist2 = np.array([min(np.sum((x - c)**2) for c in centroids) for x in X])
            probs = dist2 / dist2.sum()
            centroids.append(X[np.random.choice(n, p=probs)])
        return np.array(centroids)

    def fit(self, X):
        self.centroids = self._initialize(X)
        for _ in range(self.max_iter):
            dists = np.linalg.norm(X[:, None] - self.centroids[None], axis=2)
            labels = np.argmin(dists, axis=1)
            new_centroids = np.array([X[labels == k].mean(axis=0) for k in range(self.n_clusters)])
            if np.allclose(self.centroids, new_centroids):
                break
            self.centroids = new_centroids
        self.labels_ = labels
        self.inertia_ = sum(np.min(dists, axis=1)**2)
        return self

    def predict(self, X):
        dists = np.linalg.norm(X[:, None] - self.centroids[None], axis=2)
        return np.argmin(dists, axis=1)
```

### Choosing K

| Method | Description |
|---|---|
| Elbow method | Plot inertia vs K, find elbow |
| Silhouette score | (b - a)/max(a,b), measure of cluster cohesion vs separation |
| Gap statistic | Compare inertia to null reference distribution |
| Stability | Cross-validate cluster assignments |

## EM Algorithm (Expectation-Maximization)

### General Formulation

For latent variable model with data X, latent Z, parameters θ:
log ℙ(X|θ) = log Σ_Z ℙ(X,Z|θ)

E-step: Q(θ|θ^{(t)}) = 𝔼_{Z|X,θ^{(t)}}[log ℙ(X,Z|θ)]
M-step: θ^{(t+1)} = argmax_θ Q(θ|θ^{(t)})

### Gaussian Mixture Model (GMM)

Parameters: π_k (mixing), μ_k (mean), Σ_k (covariance)

E-step: γ(z_{nk}) = π_k𝒩(x_n|μ_k,Σ_k) / Σⱼπⱼ𝒩(x_n|μⱼ,Σⱼ)   (responsibility)

M-step:
N_k = Σγ(z_{nk})
μ_k^{(new)} = (1/N_k)Σγ(z_{nk})x_n
Σ_k^{(new)} = (1/N_k)Σγ(z_{nk})(x_n - μ_k^{(new)})(x_n - μ_k^{(new)})ᵀ
π_k^{(new)} = N_k/N

### EM for GMM

```python
from scipy.stats import multivariate_normal

class GMM:
    def __init__(self, n_components=3, max_iter=100, tol=1e-4):
        self.n_components = n_components
        self.max_iter = max_iter
        self.tol = tol
        self.means = None
        self.covs = None
        self.weights = None

    def fit(self, X):
        n, d = X.shape
        # Initialize
        kmeans = KMeans(n_clusters=self.n_components)
        kmeans.fit(X)
        self.means = kmeans.centroids
        self.covs = np.array([np.eye(d) for _ in range(self.n_components)])
        self.weights = np.ones(self.n_components) / self.n_components
        log_likelihood = -np.inf
        for iteration in range(self.max_iter):
            # E-step: compute responsibilities
            resp = np.zeros((n, self.n_components))
            for k in range(self.n_components):
                resp[:, k] = self.weights[k] * multivariate_normal.pdf(X, self.means[k], self.covs[k])
            resp /= resp.sum(axis=1, keepdims=True)
            Nk = resp.sum(axis=0)
            # M-step
            for k in range(self.n_components):
                self.weights[k] = Nk[k] / n
                self.means[k] = (resp[:, k:k+1] * X).sum(axis=0) / Nk[k]
                diff = X - self.means[k]
                self.covs[k] = (resp[:, k:k+1] * diff).T @ diff / Nk[k]
                self.covs[k] += 1e-6 * np.eye(d)
            # Check convergence
            new_ll = np.log(resp.sum(axis=1)).sum()
            if abs(new_ll - log_likelihood) < self.tol:
                break
            log_likelihood = new_ll
        self.responsibilities_ = resp
        self.n_iter_ = iteration + 1
        return self

    def predict(self, X):
        resp = np.zeros((X.shape[0], self.n_components))
        for k in range(self.n_components):
            resp[:, k] = self.weights[k] * multivariate_normal.pdf(X, self.means[k], self.covs[k])
        return np.argmax(resp, axis=1)

    def predict_proba(self, X):
        resp = np.zeros((X.shape[0], self.n_components))
        for k in range(self.n_components):
            resp[:, k] = self.weights[k] * multivariate_normal.pdf(X, self.means[k], self.covs[k])
        resp /= resp.sum(axis=1, keepdims=True)
        return resp
```

### EM vs K-Means

K-Means is a hard-assignment limit of GMM: as Σ → εI (all spherical, equal variance), GMM responsibilities → one-hot, and M-step centroid update equals K-Means.

### EM Algorithm Properties

| Property | Detail |
|---|---|
| Monotonicity | log-likelihood increases at each step |
| Convergence | To local maximum of likelihood |
| Initialization | Sensitive to initialization (use k-means) |
| Speed | Linear in iterations but each M-step can be expensive |
| Missing data | Natural framework for handling missing values |

## Bayesian Linear Regression

### Model

p(w) = 𝒩(0, α^{-1}I)  (prior on weights)
p(y|X,w) = 𝒩(y|Xw, β^{-1}I)  (likelihood)

### Posterior

p(w|X,y) = 𝒩(w|m_N, S_N)  (posterior)
m_N = βS_NXᵀy
S_N^{-1} = αI + βXᵀX  (posterior precision)

### Predictive Distribution

p(y*|x*, X, y) = 𝒩(βx*ᵀS_NXᵀy, 1/β + x*ᵀS_Nx*)

```python
class BayesianLinearRegression:
    def __init__(self, alpha=1.0, beta=1.0):
        self.alpha = alpha  # prior precision on weights
        self.beta = beta    # observation noise precision
        self.m_N = None     # posterior mean
        self.S_N = None     # posterior covariance

    def fit(self, X, y):
        n, d = X.shape
        # Precision matrix
        S_N_inv = self.alpha * np.eye(d) + self.beta * X.T @ X
        self.S_N = np.linalg.inv(S_N_inv)
        self.m_N = self.beta * self.S_N @ X.T @ y
        return self

    def predict(self, X, return_std=True):
        y_mean = X @ self.m_N
        if return_std:
            var = 1.0 / self.beta + np.sum(X @ self.S_N * X, axis=1)
            return y_mean, np.sqrt(var)
        return y_mean

    def predictive_log_likelihood(self, X, y):
        y_mean, y_std = self.predict(X)
        return -0.5 * np.log(2 * np.pi * y_std**2) - (y - y_mean)**2 / (2 * y_std**2)

    def marginal_log_likelihood(self, X, y):
        n, d = X.shape
        S_N_inv = self.alpha * np.eye(d) + self.beta * X.T @ X
        _, logdet = np.linalg.slogdet(S_N_inv)
        E_N = self.beta * np.sum((y - X @ self.m_N)**2) + self.alpha * np.sum(self.m_N**2)
        return 0.5 * (d * np.log(self.alpha) + n * np.log(self.beta) - n * np.log(2 * np.pi)
                      - logdet - E_N)
```

### Bayesian vs Frequentist Linear Regression

| Aspect | Frequentist (OLS) | Bayesian |
|---|---|---|
| Parameter view | Fixed unknown | Random variable with distribution |
| Estimate | Single point (MLE) | Posterior distribution |
| Uncertainty | Confidence intervals (sampling) | Credible intervals (posterior quantiles) |
| Prior | None | Required |
| Regularization | Ridge (explicit penalty) | Automatic via prior |
| Prediction | Point estimate | Full predictive distribution |

### Relation to Ridge Regression

Ridge minimizes: ‖y - Xw‖² + λ‖w‖² with λ = α/β
Bayesian posterior mean: m_N = (XᵀX + (α/β)I)^{-1}Xᵀy
Same as Ridge with regularization strength λ = α/β

## Algorithm Comparison Summary

| Algorithm | Type | Bias | Variance | Pros | Cons |
|---|---|---|---|---|---|
| Linear Regression | Parametric | High | Low | Interpretable | Limited capacity |
| SVM | Margin-based | Med | Med | Kernel trick, sparse | O(n²) memory |
| Decision Tree | Nonparametric | Low | High | Interpretable | Prone to overfitting |
| Random Forest | Ensemble | Med | Low | Robust, parallel | Hard to interpret |
| Gradient Boosting | Ensemble | Low | Med | State-of-art tabular | Prone to overfit |
| K-Means | Clustering | — | — | Simple, scalable | Spherical clusters only |
| GMM | Clustering | — | — | Soft assignments | Local minima |
| PCA | Dimensionality reduction | — | — | Linear, closed form | Assumes linearity |

## Key Formulas Reference

| Algorithm | Formula |
|---|---|
| SVM dual | max Σαᵢ - ½ΣΣαᵢαⱼyᵢyⱼK(xᵢ,xⱼ) s.t. 0≤αᵢ≤C, Σαᵢyᵢ=0 |
| SVM decision | f(x) = ΣαᵢyᵢK(xᵢ,x) + b |
| Entropy | H(S) = -Σp_k log₂ p_k |
| Gini impurity | G(S) = 1 - Σp_k² |
| AdaBoost update | wᵢ ← wᵢexp(α·𝟙(yᵢ≠G(xᵢ))) |
| GBM residual | r_im = -∂L/∂F(xᵢ) at F_{m-1} |
| XGBoost gain | ½[G_L²/(H_L+λ) + G_R²/(H_R+λ) - (G_L+G_R)²/(H_L+H_R+λ)] - γ |
| XGBoost leaf weight | wⱼ* = -Gⱼ/(Hⱼ+λ) |
| PCA objective | max wᵀΣw s.t. ‖w‖=1 → Σw = λw |
| K-Means objective | min Σ‖x - μ_k‖² |
| GMM E-step | γ_{nk} = π_k𝒩(x_n|μ_k,Σ_k)/Σ_jπ_j𝒩(x_n|μ_j,Σ_j) |
| GMM M-step | μ_k = Σγ_{nk}x_n/N_k |
| Bayesian posterior | p(w|X,y) = 𝒩(βS_NXᵀy, S_N), S_N^{-1}=αI+βXᵀX |
| Bayesian predictive | p(y*|x*,D) = 𝒩(βx*ᵀS_NXᵀy, 1/β+x*ᵀS_Nx*) |
