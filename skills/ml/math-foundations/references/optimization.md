# Optimization for Machine Learning

## First-Order Optimization — Gradient Descent

Gradient descent is the foundation of optimization in machine learning. The core idea: move parameters in the direction of steepest descent of the loss function.

```
θ_{t+1} = θ_t - η∇L(θ_t)
```

where ∇L(θ_t) is the gradient of the loss L with respect to parameters θ at step t.

**Convergence rates:**
- Smooth convex: O(1/t) — after t iterations, error ≤ C/t
- Strongly convex: O(e^{-μt/L}) — linear/exponential convergence
- Stochastic (SGD) convex: O(1/√t) — slower due to variance
- Stochastic strongly convex: O(1/t)

**Learning rate selection:**
- Too large → divergence (parameter updates overshoot the minimum)
- Too small → slow convergence (waste of computation)
- Optimal: balance between speed and stability

**Line search:** Find optimal η along the gradient direction by solving η* = argmin_η L(θ_t - η∇L(θ_t)). Exact line search is expensive; backtracking line search (Armijo condition) is practical.

**Variants by data usage:**

**Batch GD:**
- Uses the full dataset per update step
- Accurate gradient direction, deterministic
- Impractical for large datasets (O(n) per step)
- Can use large, stable learning rates

**Mini-batch GD:**
- Uses a random subset of size m (typically 32-512) per step
- Gradient is a noisy estimate of the true gradient
- η must be lower than batch GD due to noise
- Default choice for deep learning

**Stochastic GD (SGD):**
- One sample per update
- Maximum noise, maximum update frequency
- Can escape sharp minima due to noise
- Requires careful learning rate scheduling

### Gradient Descent Variants

```
Standard:       θ_{t+1} = θ_t - ηg_t
SGD (single):   θ_{t+1} = θ_t - η∇L(θ_t; x_i, y_i)
Mini-batch:     θ_{t+1} = θ_t - η·(1/m)Σ∇L(θ_t; x_i, y_i)
```

### Tradeoffs

| Method | Gradient Cost/Step | Variance | Convergence (Smooth Convex) |
|--------|-------------------|----------|---------------------------|
| Batch GD | O(n) | 0 | O(1/t) |
| Mini-batch | O(m) | O(1/m) | O(1/t + σ²/ηt) |
| SGD | O(1) | O(1) | O(1/√t) |

## Momentum Methods

Plain SGD oscillates in ravines (directions of high curvature). Momentum dampens oscillations by accumulating a velocity vector.

**SGD with Momentum:**

```
v_t = βv_{t-1} + g_t
θ_{t+1} = θ_t - ηv_t
```

Alternative formulation (PyTorch-style, with learning rate inside momentum):

```
v_t = βv_{t-1} + (1-β)g_t
θ_{t+1} = θ_t - ηv_t
```

**Physics intuition:** The parameter θ is a ball rolling downhill. v_t is velocity, β is friction (1-β). Larger β means less friction, faster accumulation, but more overshooting risk.

**β values:**
- β = 0: standard SGD (no momentum)
- β = 0.9: strong momentum (default)
- β = 0.99: very strong momentum (near-frictionless)
- β → 1: unstable, velocity grows unbounded

**Effect on convergence:**
- Accelerates in low-curvature directions
- Dampens oscillations in high-curvature directions
- Speedup factor: ~1/(1-β) in consistent directions

**Nesterov Accelerated Gradient (NAG):**

NAG computes the gradient at a lookahead position, giving the optimizer foresight:

```
lookahead = θ_t + βv_{t-1}
g_t = ∇L(lookahead)
v_t = βv_{t-1} + ηg_t
θ_{t+1} = θ_t - v_t
```

**Why NAG works:**
Standard momentum: compute gradient at current position, then update
NAG: look ahead, compute gradient there, correct if overshooting

NAG achieves optimal convergence rate O(1/t²) for smooth convex optimization — matching the theoretical lower bound. Standard momentum is O(1/t) in the worst case.

```
θ_{t+1} = θ_t - η∇L(θ_t + βv_{t-1}) + βv_{t-1}
```

**On sparse gradients:** NAG helps more than standard momentum because the lookahead reveals where gradients change sign.

## Adaptive Learning Rate Methods

Standard SGD uses the same learning rate for all parameters. Adaptive methods adjust per-parameter learning rates based on gradient history.

**AdaGrad (Duchi et al., 2011):**

```
G_t = G_{t-1} + g_t²             # cumulative sum of squared gradients
θ_{t+1,i} = θ_{t,i} - η/√(G_{t,i} + ε) · g_{t,i}
```

Key insight: frequently updated parameters get smaller learning rates; infrequent parameters get larger ones.

Advantage: no manual LR tuning for sparse features (e.g., word embeddings, one-hot features).
Disadvantage: G_t grows monotonically → learning rate → 0, training effectively stops.

```
g_t = [0.1, 0.01, 10.0]          # sparse gradients
G_t = [0.01, 0.0001, 100.0]      # accumulated squares
η_eff = η/√(G_t+ε)               # ≈ [η/0.1, η/0.01, η/10.0]
# Third parameter (active) has small LR, first two (inactive) have large LR
```

**RMSProp (Hinton, 2012):**

Fixes AdaGrad's monotonic decay by using an exponentially weighted moving average instead of a cumulative sum:

```
E[g²]_t = βE[g²]_{t-1} + (1-β)g_t²
θ_{t+1} = θ_t - η/√(E[g²]_t + ε) · g_t
```

β = 0.9, ε = 1e-8

Old gradient magnitudes get exponentially decayed, so the learning rate doesn't shrink to zero. This is crucial for non-stationary objectives (e.g., deep learning with changing data distributions).

```
#!/usr/bin/env python3
import numpy as np

class RMSProp:
    def __init__(self, lr=1e-3, beta=0.9, eps=1e-8):
        self.lr = lr
        self.beta = beta
        self.eps = eps
        self.cache = None

    def step(self, params, grads):
        if self.cache is None:
            self.cache = np.zeros_like(params)
        self.cache = self.beta * self.cache + (1 - self.beta) * grads**2
        return params - self.lr * grads / (np.sqrt(self.cache) + self.eps)
```

**Adam — Most Widely Used:**

Adam combines momentum (RMSProp-like scaling) + adaptive LR (momentum-like velocity):

```
g_t = ∇_θL(θ_t)                              # gradient at step t
m_t = β₁m_{t-1} + (1-β₁)g_t                  # biased first moment estimate
v_t = β₂v_{t-1} + (1-β₂)g_t²                  # biased second moment estimate
m̂_t = m_t / (1 - β₁^t)                        # bias correction for m
v̂_t = v_t / (1 - β₂^t)                        # bias correction for v
θ_{t+1} = θ_t - η · m̂_t / (√v̂_t + ε)          # parameter update
```

Hyperparameters:
- β₁ = 0.9 (momentum decay)
- β₂ = 0.999 (RMS decay)
- ε = 1e-8 (numerical stability)
- η = 1e-3 (default learning rate)

**Why bias correction matters:**

At t=1: m₁ = 0.9·0 + 0.1·g₁ = 0.1·g₁ (biased toward 0)
Without correction: m₁ = 0.1g₁, step magnitude ≈ 0.1g₁/(√v₁) — too small
With correction: m̂₁ = 0.1g₁/(1-0.9) = g₁ — correct magnitude

As t → ∞, (1-β₁^t) → 1, correction becomes negligible.

```
#!/usr/bin/env python3
import numpy as np

class Adam:
    def __init__(self, lr=1e-3, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.b1 = beta1
        self.b2 = beta2
        self.eps = eps
        self.m = None
        self.v = None
        self.t = 0

    def step(self, params, grads):
        if self.m is None:
            self.m = np.zeros_like(params)
            self.v = np.zeros_like(params)
        self.t += 1
        self.m = self.b1 * self.m + (1 - self.b1) * grads
        self.v = self.b2 * self.v + (1 - self.b2) * grads**2
        m_hat = self.m / (1 - self.b1**self.t)
        v_hat = self.v / (1 - self.b2**self.t)
        return params - self.lr * m_hat / (np.sqrt(v_hat) + self.eps)
```

**AdamW (Decoupled Weight Decay):**

Standard Adam applies weight decay as L2 regularization: L = L_data + (λ/2)‖θ‖². The gradient becomes g_t = ∇L_data + λθ_t. The λθ_t term gets divided by √v̂_t in the update, coupling weight decay with the adaptive LR.

AdamW decouples them:

```
m_t = β₁m_{t-1} + (1-β₁)g_t                  # same momentum as Adam
v_t = β₂v_{t-1} + (1-β₂)g_t²                  # same RMS as Adam
m̂_t = m_t/(1-β₁^t)
v̂_t = v_t/(1-β₂^t)
θ_{t+1} = θ_t - η(m̂_t/(√v̂_t + ε) + λθ_t)      # weight decay SEPARATE from adaptive LR
```

Recommended: λ = 0.01-0.1 for vision, λ = 0.1-1.0 for language models.

**Nadam (Nesterov Adam):**

Nadam replaces Adam's momentum with Nesterov's lookahead:

```
m_t = β₁m_{t-1} + (1-β₁)g_t
m̂_t = m_t/(1-β₁^t)
# Nesterov lookahead gradient
g_t_nesterov = β₁m̂_t + (1-β₁)g_t/(1-β₁^t)
θ_{t+1} = θ_t - η·g_t_nesterov/(√v̂_t + ε)
```

The bias-corrected momentum m̂_t is projected forward one step, mimicking NAG's lookahead within the Adam framework.

**Lion (Google, 2023 — discovered by symbolic search):**

Lion was discovered by evolving optimization algorithms with a genetic program. It is remarkably simple:

```
m_t = β₁m_{t-1} + (1-β₁)g_t
θ_{t+1} = θ_t - η(sign(β₂m_{t-1} + (1-β₂)g_t) + λθ_t)
```

No squared gradients, no bias correction, uses sign instead of magnitude. The sign operation makes it extremely memory-light and computationally cheap.

Properties:
- Needs η ~ 1e-4 to 1e-5 (much smaller than Adam's 1e-3)
- Larger weight decay λ ~ 0.1-1.0
- Tends to find flatter minima than Adam
- Controversial: works well for vision transformers, less tested for LLMs

**Sophia (2023 — Second-order Clipped):**

Sophia uses a diagonal Hessian estimate from a Hutchinson trace estimator:

```
g_t = ∇L(θ_t)                                  # gradient
h_t = Hutchinson_diag_Hessian(θ_t)              # diagonal Hessian estimate
θ_{t+1} = θ_t - η·clip(g_t / max(h_t, ε), ρ)   # clip prevents extreme updates
```

ρ = clipping threshold (typically 1). The gradient is divided by the curvature estimate, giving larger steps in low-curvature regions and smaller steps in high-curvature regions — like a second-order method but O(d) per step.

Sophia achieves 2x faster pretraining of LLMs compared to Adam.

**Comparison of Adaptive Methods:**

| Method | Momentum | Per-param LR | Bias Corr | Weight Decay | Special |
|--------|----------|-------------|-----------|-------------|---------|
| SGD | No | No | No | L2 only | Baseline |
| Adam | Yes | Yes | Yes | L2 only | Default |
| AdamW | Yes | Yes | Yes | Decoupled | Better gen. |
| Nadam | Nesterov | Yes | Yes | L2 only | Combines NAG |
| Lion | Sign-based | No | No | Decoupled | Memory-light |
| Sophia | No | Curvature | No | L2 only | 2nd-order |

## Learning Rate Schedules

The learning rate schedule defines how η changes over time. The choice of schedule can significantly affect final performance.

**Step Decay:**

```
η_t = η₀ · γ^{⌊t / step_size⌋}
```

γ ≈ 0.1-0.5 (decay factor), step_size = number of steps per epoch or fixed interval.

Example: η₀ = 0.1, decay by 0.1 every 30 epochs: η = [0.1]×30, [0.01]×30, [0.001]×...

Common in: ResNet training, traditional CV models.

**Exponential Decay:**

```
η_t = η₀ · e^{-k·t}
```

k controls decay rate. Smooth decay, never reaches zero asymptotically.

**Cosine Annealing:**

```
η_t = η_min + 0.5(η₀ - η_min)(1 + cos(t·π/T))
```

T = total number of steps (or epochs), η₀ = initial LR, η_min = minimum LR.

The learning rate starts at η₀, smoothly decreases following a cosine curve, and reaches η_min at t = T. The smooth decay avoids the abrupt drops of step decay.

```
#!/usr/bin/env python3
import numpy as np

def cosine_annealing(t, T, eta0=0.1, eta_min=1e-6):
    return eta_min + 0.5 * (eta0 - eta_min) * (1 + np.cos(t * np.pi / T))

# Example schedule
T = 100
lrs = [cosine_annealing(t, T, 0.1, 1e-6) for t in range(T)]
```

**Cosine with Warm Restarts (SGDR — Loshchilov & Hutter):**

```
η_t = η_min + 0.5(η_{peak} - η_min)(1 + cos(t·π/T_i))
```

Each restart: T_i increments (typically T_i = T_0 · factor^i, factor = 2), η_{peak} resets to η₀.

The learning rate cycles between η₀ and η_min. Each cycle gets longer. This allows the optimizer to escape sharp minima and find flatter ones.

**OneCycleLR (Smith & Topin, 2019):**

Three-phase schedule:
1. Warmup: η increases from η_min to η_max (first ~30% of steps)
2. Annealing: η decreases from η_max to η_min or lower
3. Fine-tuning: very small LR for remaining steps

```
η_max ≈ 10× η_min
η_t = η_min + (η_max - η_min) · t/t_warmup   for t < t_warmup
η_t = η_max - (η_max - η_min) · (t-t_warmup)/T_rest
```

Additionally: momentum does the opposite (high → low → high), providing stability during high LR periods.

**ReduceLROnPlateau:**

Reduces LR when validation loss stops improving:

```
if val_loss hasn't improved for patience epochs:
    η = η · factor
```

fractor = 0.1-0.5, patience = 5-10 epochs. Adaptive — doesn't follow a fixed schedule, responds to training dynamics.

**Linear Warmup:**

```
η_t = η₀ · (t / t_warm)   for t < t_warm
η_t = schedule(t)          for t ≥ t_warm
```

Essential for: large batch training, Transformers, Adam optimizer. Without warmup, early steps can diverge because the optimizer hasn't accumulated enough gradient statistics.

**Inverse Square Root (Transformer schedule):**

```
η_t = d_model^{-0.5} · min(t^{-0.5}, t · warmup_steps^{-1.5})
```

Used in the original Transformer paper (Vaswani et al., 2017). Combines linear warmup with inverse sqrt decay. The learning rate grows linearly for warmup_steps, then decays as 1/√t.

## Second-Order Methods

First-order methods use only gradient information. Second-order methods use curvature (Hessian) to take more informed steps.

**Newton's Method:**

```
θ_{t+1} = θ_t - H(θ_t)^{-1}∇L(θ_t)
```

where H(θ_t) is the Hessian matrix of second partial derivatives: H_{ij} = ∂²L/∂θ_i∂θ_j.

**Advantages:**
- Quadratic convergence rate near the optimum (doubles correct digits each step)
- No learning rate hyperparameter (the Hessian provides the optimal step size)
- Handles ill-conditioned problems naturally

**Disadvantages:**
- Memory: H is O(n²) for n parameters (impossible for n > 10⁴)
- Computation: H^{-1} is O(n³) (impossible for modern networks with 10⁷+ parameters)
- Hessian can be non-positive-definite away from the optimum (saddle points)

**Newton's method vs GD (1D intuition):**

```
Quadratic approximation: L(θ) ≈ L(θ_t) + g(θ-θ_t) + ½H(θ-θ_t)²
GD: θ_{t+1} = θ_t - ηg
Newton: θ_{t+1} = θ_t - g/H
```

Newton jumps directly to the minimum of the quadratic approximation in one step. If L is truly quadratic, Newton converges in 1 step.

**BFGS — Broyden-Fletcher-Goldfarb-Shanno:**

BFGS approximates the inverse Hessian H^{-1} iteratively using gradient differences, avoiding the O(n³) inversion:

```
B_{t+1} = (I - ρ_ts_ty_t^T)B_t(I - ρ_ty_ts_t^T) + ρ_ts_ts_t^T
```

where:
- s_t = θ_{t+1} - θ_t (parameter change)
- y_t = ∇L(θ_{t+1}) - ∇L(θ_t) (gradient change)
- ρ_t = 1/(y_t^T s_t)
- B_t ≈ H_t^{-1} (inverse Hessian approximation)

BFGS maintains O(n²) memory for B_t — still prohibitive for large neural networks.

**L-BFGS — Limited Memory BFGS:**

Instead of storing the full O(n²) matrix, L-BFGS stores only the last m pairs (s_t, y_t):

- Memory: O(mn) — m ~ 10-100
- The matrix-vector product B_tg_t is computed using a two-loop recursion over the stored pairs

**Two-loop recursion for computing the search direction:**

```
q = g_t  # start with gradient
for i in reversed(range(m)):
    α_i = ρ_i · s_i^T q
    q = q - α_i · y_i

r = H_0 · q  # initial Hessian estimate
for i in range(m):
    β = ρ_i · y_i^T r
    r = r + (α_i - β) · s_i

# r = B_t · g_t ≈ H_t^{-1} · g_t
# search direction: d_t = -r
```

**When L-BFGS works well:**
- Logistic regression, linear models, SVMs
- Small to medium datasets
- Full-batch (not stochastic) — L-BFGS requires accurate gradients

**When it fails:**
- Deep neural networks
- Stochastic/mini-batch settings
- Non-convex objectives with many saddle points

## Learning Rate Warmup and Batch Size Scaling

**Linear Scaling Rule (Goyal et al., 2017):**

When batch size B increases by a factor of k, scale the learning rate η by k:

```
η_new = k · η_original
```

Rationale: SGD update with batch B:
θ_{t+1} = θ_t - η·(1/B)Σ∇L_i

Under the central limit theorem, the variance of the gradient estimate scales as O(1/B). The gradient magnitude scales as O(B). To keep the effective update magnitude similar, scale η proportionally to B.

**Gradual Warmup:**

Start with a small LR (e.g., η = 10^{-6}) and linearly increase to η_target over the first few epochs:

```
η_t = η_target · t / t_warmup   for t = 1, 2, ..., t_warmup
```

Typical: t_warmup = 5 epochs for ImageNet training.

**Why warmup is needed with large batches:**

Large batches give low-variance gradients. Early in training, the parameters are random and the gradient direction changes rapidly. With a large learning rate and accurate gradient, the model can diverge immediately. Warmup lets the model find a reasonable region of parameter space before applying large updates.

**Batch size effect on generalization:**

Empirical finding (Keskar et al., 2016):
- Large batch sizes → sharp minima → worse generalization
- Small batch sizes → flat minima → better generalization

Hypothesis: SGD noise (from small batches) acts as implicit regularization, biasing toward flat minima. Large batches reduce this noise, which may converge to sharp minima.

Practical guidance:
- Batch size: 32-512 for most tasks
- Scale LR linearly with batch size up to some point, then sub-linearly
- LR warmup becomes essential for batch sizes > 1024

## Regularization — Math Perspective

Regularization modifies the objective to prefer simpler models, reducing overfitting.

**L1 Regularization (Lasso):**

```
L_total = L_data + λ‖θ‖₁ = L_data + λΣ|θᵢ|
```

Gradient (subgradient at 0):
```
∂L_total/∂θᵢ = ∂L_data/∂θᵢ + λ·sign(θᵢ)
∂/∂θᵢ(|θᵢ|) = sign(θᵢ) for θᵢ ≠ 0, [-1, 1] for θᵢ = 0
```

Update with SGD:
```
θᵢ ← θᵢ - η(∂L_data/∂θᵢ + λ·sign(θᵢ))
θᵢ ← (θᵢ - η∂L_data/∂θᵢ) - ηλ·sign(θᵢ)
```

The ηλ·sign(θᵢ) term pushes each parameter toward zero. If a parameter crosses zero, sign(θᵢ) flips, potentially pinning it exactly at zero (sparsity).

**Probabilistic interpretation:** L1 regularization = MAP estimation with a Laplace prior:
p(θ) ∝ exp(-λ‖θ‖₁)

**Subgradient descent for L1 at θᵢ = 0:**

The subdifferential at 0 is [-λ, λ]. The update becomes:
```
if |∂L_data/∂θᵢ| < λ:
    θᵢ stays at 0  (dead zone)
```

**L2 Regularization (Ridge / Weight Decay):**

```
L_total = L_data + (λ/2)‖θ‖₂² = L_data + (λ/2)Σθᵢ²
```

Gradient:
```
∂L_total/∂θᵢ = ∂L_data/∂θᵢ + λ·θᵢ
```

Update:
```
θᵢ ← θᵢ - η(∂L_data/∂θᵢ + λ·θᵢ)
θᵢ ← (1 - ηλ)θᵢ - η∂L_data/∂θᵢ   # weight decay form
```

The (1 - ηλ) factor is multiplicative shrinkage — each parameter is shrunk toward 0 before the gradient step.

**Probabilistic interpretation:** L2 regularization = MAP estimation with a Gaussian prior:
p(θ) ∝ exp(-(λ/2)‖θ‖²)

**L2 does NOT produce sparsity.** The gradient λθ is proportional to θ, so as θ → 0, the regularization force also → 0. Parameters approach 0 asymptotically but never reach it exactly.

**L1 vs L2 comparison:**

| Property | L1 | L2 |
|----------|----|----|
| Regularization term | λΣ|θ| | (λ/2)Σθ² |
| Gradient | λ·sign(θ) | λ·θ |
| Solution sparsity | Yes (exact zeros) | No (shrinkage only) |
| Prior | Laplace | Gaussian |
| Stability | Less stable (discontinuous gradient) | More stable |
| Invariance | Not rotationally invariant | Rotationally invariant |

```
#!/usr/bin/env python3
import numpy as np

def sgd_with_l1(params, grads, lr=0.01, lam=0.001):
    return params - lr * (grads + lam * np.sign(params))

def sgd_with_l2(params, grads, lr=0.01, lam=0.001):
    decay = 1 - lr * lam
    return decay * params - lr * grads
```

**Elastic Net (Zou & Hastie, 2005):**

```
L_total = L_data + λ₁‖θ‖₁ + (λ₂/2)‖θ‖₂²
```

Combines L1 sparsity with L2 stability. When features are correlated, L1 picks one arbitrarily; elastic net picks groups.

**Sparsity diagram:**

Consider the constraint view (unit ball in 2D):
- L1 (diamond): corners at (0, ±1), (±1, 0) → sparsity at axes
- L2 (circle): no corners → no sparsity
- Elastic net (rounded diamond): corners blunted but still present

**Dropout (Srivastava et al., 2014):**

During training, randomly drop neurons with probability p:

```
r ∼ Bernoulli(1-p)              # mask (keep probability = 1-p)
h̃ = (r · h) / (1-p)             # inverted dropout — scale during training
```

The division by (1-p) ensures that the expected value matches inference: E[h̃] = h.

**Inverted dropout (standard in modern frameworks):**
- Training: randomly set neurons to 0, scale survivors by 1/(1-p)
- Inference: use all neurons, no scaling (the weights already compensate)

**Why dropout works — ensemble interpretation:**

Each binary mask defines a different sub-network. With n neurons, there are 2^n possible sub-networks. Training with dropout approximates training an ensemble of all sub-networks with weight sharing.

**Bayesian interpretation:** Dropout approximates Bayesian inference over the weights (Gal & Ghahramani, 2016). The randomness in dropout corresponds to sampling from an approximate posterior over network weights. Monte Carlo dropout (keeping dropout at inference, running multiple forward passes) gives uncertainty estimates.

**Early Stopping:**

Stop training when validation loss stops decreasing (or starts increasing).

**Connection to L2 regularization:**
- L2 penalizes parameters from moving too far from 0
- Early stopping penalizes parameters from moving too far from initialization
- Both restrict the effective parameter space
- The effective λ for early stopping is approximately T/(2η) where T is early stopping time

**Data Augmentation:**

Generate virtual training examples by applying label-preserving transformations:
- Images: rotation, translation, scaling, flipping, color jitter, CutOut, MixUp
- Text: back-translation, word dropout, synonym replacement
- Audio: noise addition, time stretching, pitch shifting

Data augmentation enforces invariances in the learned representation. It is a form of regularization because it expands the effective training set.

**Connection to tangent propagation (Simard et al., 1998):**
Data augmentation approximates tangent propagation, where the loss is regularized to be invariant to input transformations. Rather than computing tangents explicitly (expensive), we generate transformed examples.

## Constrained Optimization

Many ML problems have constraints on the parameters.

**Equality constraints: g(x) = 0:**

The Lagrangian converts a constrained problem into an unconstrained one:

```
minimize f(x)  subject to  g(x) = 0
L(x, λ) = f(x) + λg(x)
```

**First-order optimality conditions (for convex problems):**
```
∇_xL(x*, λ*) = ∇f(x*) + λ*∇g(x*) = 0  (stationarity)
∇_λL(x*, λ*) = g(x*) = 0                (feasibility)
```

λ is the Lagrange multiplier. It measures how much the constraint "costs" at the optimum.

**Sensitivity interpretation:** df(x*)/dg = -λ*. If the constraint is relaxed by ε, the objective changes by approximately -λ*ε.

**Inequality constraints: h(x) ≤ 0:**

```
minimize f(x)  subject to  h(x) ≤ 0
L(x, μ) = f(x) + μh(x)  for μ ≥ 0
```

**KKT (Karush-Kuhn-Tucker) Conditions:**

1. Stationarity: ∇f(x*) + μ*∇h(x*) = 0
2. Primal feasibility: h(x*) ≤ 0
3. Dual feasibility: μ* ≥ 0
4. Complementary slackness: μ*·h(x*) = 0

**Complementary slackness intuition:**
- If constraint is active (h(x) = 0): μ can be > 0 (constraint matters)
- If constraint is inactive (h(x) < 0): μ = 0 (constraint doesn't matter)

**Connection to SVM:**

Primal problem:
```
minimize (1/2)‖w‖²
subject to yᵢ(w·xᵢ + b) ≥ 1 for all i
```

Lagrangian:
```
L(w, b, α) = (1/2)‖w‖² - Σαᵢ[yᵢ(w·xᵢ + b) - 1]
```

αᵢ ≥ 0 are Lagrange multipliers. Minimizing over w, b and maximizing over α gives the dual:

```
maximize Σαᵢ - (1/2)ΣΣαᵢαⱼyᵢyⱼ(xᵢ·xⱼ)
subject to αᵢ ≥ 0, Σαᵢyᵢ = 0
```

The dual is a quadratic program. The KKT condition αᵢ[yᵢ(w·xᵢ + b) - 1] = 0 means only support vectors (points on the margin) have αᵢ > 0.

**Projected Gradient Descent:**

For constraints that aren't easily Lagrangian-ized, project onto the feasible set after each step:

```
θ_{t+1} = Π_C(θ_t - η∇L(θ_t))
```

where Π_C projects onto the constraint set C (e.g., L2 ball: Π(θ) = θ·min(1, R/‖θ‖)).

## Convex vs Non-Convex Optimization

**Convex functions:**

A function f is convex if:
```
f(θx + (1-θ)y) ≤ θf(x) + (1-θ)f(y)   for all θ ∈ [0,1]
```

Equivalently: the line segment between any two points lies above the function.

**Properties of convex optimization:**
- Any local minimum is a global minimum
- The set of minima is convex
- No saddle points (every stationary point is a global minimum)
- All sublevel sets {x: f(x) ≤ c} are convex

**Subgradient optimality condition:**
x* is optimal iff 0 ∈ ∂f(x*) (0 is in the subdifferential at x*)

**Examples in ML:**
- Linear regression (MSE): convex
- Logistic regression: convex
- SVMs with convex loss: convex
- Least squares: convex

**Convergence rates (convex, smooth with L-Lipschitz gradient):**
- GD: f(x_t) - f(x*) ≤ O(L‖x₀ - x*‖² / t)
- NAG: f(x_t) - f(x*) ≤ O(L‖x₀ - x*‖² / t²)
- Strongly convex (μ-strong): f(x_t) - f(x*) ≤ O(L‖x₀ - x*‖² · (1 - μ/L)^t)

**Non-convex functions (deep learning):**

Most deep learning problems are non-convex:
- Multiple local minima
- Saddle points (especially problematic in high dimensions)
- Plateaus
- Symmetries in parameter space (permutation of neurons)

**Saddle points in high dimensions:**

At a saddle point, the Hessian has both positive and negative eigenvalues. For a d-dimensional problem:
- Probability that a random critical point is a local minimum: O(2^{-d})
- The vast majority of critical points are saddle points
- SGD with noise can escape saddle points by adding gradient perturbations

**Why deep learning works despite non-convexity:**

1. **Most local minima are good:** In overparameterized networks, local minima often have near-zero loss
2. **SGD noise helps escape bad regions:** The inherent noise in stochastic gradients provides the perturbation needed to escape saddle points
3. **Overparameterization makes optimization easier:** The loss landscape becomes nearly convex near the global minimum (the Hessian is positive semidefinite in the full parameter space)
4. **Implicit bias:** SGD prefers solutions that generalize well (e.g., minimum norm, flat minima)

## Gradient Clipping

Gradient clipping prevents the gradient norm from becoming too large, which is especially critical for RNNs.

**Global norm clipping:**

```
if ‖g‖ > threshold:
    g = g · threshold / ‖g‖
```

The update direction stays the same, but the step size is limited. Typical threshold: 0.25-1.0.

**Value clipping:**

```
gᵢ = clip(gᵢ, -threshold, threshold)
```

Limits each gradient component independently. Threshold: 0.5-5.0.

```
#!/usr/bin/env python3
import numpy as np

def clip_grad_norm(grads, max_norm=1.0):
    total_norm = np.sqrt(sum(np.sum(g**2) for g in grads.values()))
    if total_norm > max_norm:
        scale = max_norm / (total_norm + 1e-6)
        return {k: v * scale for k, v in grads.items()}
    return grads

def clip_grad_value(grads, clip_value=1.0):
    return {k: np.clip(v, -clip_value, clip_value) for k, v in grads.items()}
```

**Why RNNs need gradient clipping:**

In backpropagation through time (BPTT), the gradient involves repeated multiplication by the recurrent weight matrix W:

```
∂L/∂W ∝ Π_{k=t}^{T} diag(σ'(h_k)) · W
```

If the spectral radius ρ(W) < 1: gradients vanish (gradient → 0 for long sequences)
If ρ(W) > 1: gradients explode (gradient → ∞ for long sequences)

Gradient clipping prevents the latter. Gradient vanishing is addressed by LSTMs, GRUs, or residual connections.

**Connection to trust region:** Clipping can be seen as a simple trust region method — we don't trust large gradient updates because the first-order Taylor approximation is only locally valid.

## Batch Size and Gradient Noise

The relationship between batch size and gradient noise is fundamental to understanding SGD behavior.

**Gradient noise model:**

```
g_B(θ) = ∇L(θ) + ε(θ)
```

where g_B is the mini-batch gradient and ε is the noise:
- E[ε] = 0 (unbiased estimator)
- Cov(ε) = (1/B)·Σ(θ) where Σ(θ) is the per-sample gradient covariance

**Variance scales as 1/B:**

```
Var(g_B) ∝ σ²/B    where σ² = Var(∇L_i(θ))
```

**Effect of noise on convergence (convex case):**

The asymptotic excess risk is:
```
E[L(θ_t) - L(θ*)] ≈ ησ²/(2Bμ)
```

where μ is the strong convexity parameter. Large B → small excess risk but expensive per step.

**Critical batch size:**

The batch size at which the gradient noise has equal magnitude to the gradient itself:

```
B_crit ≈ σ² / ‖∇L(θ)‖²
```

Below B_crit: noise-dominated (SGD regime), must shrink η
Above B_crit: signal-dominated (GD regime), diminishing returns from larger B

**Sharp vs flat minima:**

- **Sharp minima:** large positive curvature (high eigenvalues of Hessian), high sensitivity to parameter perturbations
- **Flat minima:** small positive curvature, low sensitivity

**Why small batch sizes generalize better:**
1. SGD noise helps escape sharp minima (which generalize poorly)
2. Finding flat minima ≈ finding a solution with low sensitivity to distribution shift
3. Large batch GD converges to the nearest minimum, which may be sharp

**Scale of gradient noise:**
```
‖ε‖ ≈ σ/√B    where σ² = E[‖∇Lᵢ - ∇L‖²]
```

This is a Central Limit Theorem result: averaging B i.i.d. samples reduces the standard deviation of the mean by √B.

---

**References:**

- Duchi, J., Hazan, E., & Singer, Y. (2011). Adaptive subgradient methods for online learning and stochastic optimization.
- Kingma, D. P., & Ba, J. (2015). Adam: A method for stochastic optimization.
- Loshchilov, I., & Hutter, F. (2019). Decoupled weight decay regularization.
- Loshchilov, I., & Hutter, F. (2017). SGDR: Stochastic gradient descent with warm restarts.
- Smith, L. N., & Topin, N. (2019). Super-convergence: Very fast training of neural networks using large learning rates.
- Goyal, P., et al. (2017). Accurate, large minibatch SGD: training ImageNet in 1 hour.
- Keskar, N. S., et al. (2016). On large-batch training for deep learning: generalization gap and sharp minima.
- Chen, X., et al. (2023). Symbolic discovery of optimization algorithms.
- Liu, H., et al. (2023). Sophia: A scalable stochastic second-order optimizer for language model pre-training.
