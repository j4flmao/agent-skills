# Loss Functions for Machine Learning

## Regression Losses

Regression losses measure the discrepancy between continuous predictions ŷ and targets y.

**Mean Squared Error (MSE / L2):**

```
L = (1/n) Σ (yᵢ - ŷᵢ)²
```

Gradient:
```
∂L/∂ŷᵢ = (2/n)(ŷᵢ - yᵢ)
```

Probabilistic interpretation: MSE is the negative log-likelihood under a Gaussian noise model:
```
-log 𝒩(y; ŷ, σ²) = (1/(2σ²))(y - ŷ)² + log(σ√{2π}) + const
```

MLE (Maximum Likelihood Estimation) under Gaussian noise with fixed variance σ² is equivalent to minimizing MSE.

Properties:
- Convex in ŷ
- C∞ smooth (infinitely differentiable)
- Sensitive to outliers: squared penalty amplifies large errors
- Unbounded above

**Mean Absolute Error (MAE / L1):**

```
L = (1/n) Σ |yᵢ - ŷᵢ|
```

Gradient (subgradient at 0):
```
∂L/∂ŷᵢ = (1/n) · sign(ŷᵢ - yᵢ)
```

Subgradient at 0: any value in [-1/n, 1/n]

Probabilistic interpretation: MAE is the negative log-likelihood under a Laplace noise model:
```
-log Laplace(y; ŷ, b) = |y - ŷ|/b + log(2b)
```

Properties:
- Convex in ŷ
- C¹ smooth (first derivative is piecewise constant, discontinuous at 0)
- Robust to outliers: constant gradient magnitude regardless of error size
- No preferential direction for small errors

**MSE vs MAE tradeoff:**

| Aspect | MSE | MAE |
|--------|-----|-----|
| Sensitivity to outliers | High | Low |
| Gradient near 0 | Linear (gentle) | Constant (abrupt) |
| Differentiability | C∞ | Not at 0 |
| Convexity | Strongly convex | Convex |
| Optimal for | Gaussian noise | Laplace noise |

**Huber Loss:**

Huber loss is a hybrid: L2 near 0, L1 far from 0. The transition point δ controls the crossover.

```
L_δ(a) = { (1/2)a²              if |a| ≤ δ
         { δ(|a| - (1/2)δ)      if |a| > δ

where a = y - ŷ
```

Gradient:
```
∂L/∂a = { a                    if |a| ≤ δ
        { δ · sign(a)          if |a| > δ
```

Second derivative (piecewise):
```
∂²L/∂a² = { 1                  if |a| ≤ δ
          { 0                  if |a| > δ
```

Limits:
- δ → 0: Huber approaches MAE (with a factor of 0 at 0)
- δ → ∞: Huber approaches MSE

Huber is C² smooth (first derivative is Lipschitz). The L2 region near 0 gives stable, smooth convergence for small errors. The L1 tail gives robustness to outliers.

```
#!/usr/bin/env python3
import numpy as np

def huber_loss(y_true, y_pred, delta=1.0):
    a = y_true - y_pred
    is_small = np.abs(a) <= delta
    loss = np.where(
        is_small,
        0.5 * a**2,
        delta * (np.abs(a) - 0.5 * delta)
    )
    return np.mean(loss)

def huber_grad(y_true, y_pred, delta=1.0):
    a = y_true - y_pred
    is_small = np.abs(a) <= delta
    grad = np.where(is_small, -a, -delta * np.sign(a))
    return grad / len(y_true)

def huber_both(y, y_pred, delta=1.0):
    a = y - y_pred
    is_small = np.abs(a) <= delta
    loss = np.where(is_small, 0.5*a**2, delta*(np.abs(a)-0.5*delta))
    grad = np.where(is_small, -a, -delta*np.sign(a))
    return np.mean(loss), grad/len(y)
```

**Log-Cosh Loss:**

```
L = log(cosh(ŷ - y))
```

Log-cosh is a smooth approximation to Huber that is twice differentiable everywhere.

```
log(cosh(a)) ≈ { a²/2          for small |a| (|a| → 0)
               { |a| - log 2   for large |a| (|a| → ∞)
```

Properties:
- C∞ smooth (unlike Huber's C²)
- Behaves like MSE near 0, like MAE in the tail
- The log-cosh gradient:
  ```
  ∂L/∂ŷ = tanh(ŷ - y)
  ```

```
#!/usr/bin/env python3
import numpy as np

def logcosh_loss(y_true, y_pred):
    a = y_true - y_pred
    return np.mean(np.log(np.cosh(a)))

def logcosh_grad(y_true, y_pred):
    a = y_true - y_pred
    return -np.tanh(a) / len(y_true)
```

**Quantile Loss (Pinball Loss):**

Quantile regression predicts a specific quantile τ of the target distribution, not just the mean.

```
L_τ(y, ŷ) = { τ(y - ŷ)           if y ≥ ŷ
            { (1 - τ)(ŷ - y)     if y < ŷ
```

Compact form:
```
L_τ(y, ŷ) = (y - ŷ)(τ - 𝟙_{y < ŷ})
```

where 𝟙_{y < ŷ} = 1 if y < ŷ, else 0.

Gradient:
```
∂L_τ/∂ŷ = (τ - 1) if y < ŷ, else τ
```

Special cases:
- τ = 0.5: median regression (equivalent to MAE)
- τ = 0.1: predicts 10th percentile (lower bound)
- τ = 0.9: predicts 90th percentile (upper bound)

```
#!/usr/bin/env python3
import numpy as np

def quantile_loss(y_true, y_pred, tau=0.5):
    diff = y_true - y_pred
    loss = np.where(diff >= 0, tau * diff, (tau - 1) * diff)
    return np.mean(loss)

def quantile_grad(y_true, y_pred, tau=0.5):
    diff = y_true - y_pred
    return -np.where(diff >= 0, tau, tau - 1) / len(y_true)
```

## Classification Losses

Classification losses measure the discrepancy between predicted probabilities and true class labels.

**Binary Cross-Entropy (BCE / Log Loss):**

```
L = -y log p - (1 - y) log(1 - p)
```

where y ∈ {0, 1} is the true label and p ∈ (0, 1) is the predicted probability.

With sigmoid activation: p = σ(z) = 1 / (1 + e^{-z})

```
L(z, y) = -y log σ(z) - (1 - y) log(1 - σ(z))
        = -y log(1/(1+e^{-z})) - (1-y) log(e^{-z}/(1+e^{-z}))
        = y log(1+e^{-z}) + (1-y)(z + log(1+e^{-z}))
        = (1-y)z + log(1+e^{-z})
```

**Remarkably simple gradient:**

```
∂L/∂z = σ(z) - y = p - y
```

This is the same form as MSE gradient (ŷ - y), but with the sigmoid providing the nonlinearity.

**Numerical stability concern:**

Computing log(p) directly when p → 0 or p → 1 causes log(0) = -∞. Solution: compute using the logit z directly.

```
#!/usr/bin/env python3
import numpy as np

def binary_crossentropy_loss(y_true, y_pred_logits):
    # y_pred_logits = z (before sigmoid)
    z = y_pred_logits
    # stable: max(z, 0) - z*y + log(1 + exp(-|z|))
    loss = np.maximum(z, 0) - z * y_true + np.log(1 + np.exp(-np.abs(z)))
    return np.mean(loss)

def binary_crossentropy_grad(y_true, y_pred_logits):
    p = 1 / (1 + np.exp(-y_pred_logits))
    return (p - y_true) / len(y_true)

# Alternative: compute probabilities first with clipping
def binary_crossentropy_simple(y_true, y_pred_probs, eps=1e-15):
    p = np.clip(y_pred_probs, eps, 1 - eps)
    loss = -y_true * np.log(p) - (1 - y_true) * np.log(1 - p)
    return np.mean(loss)
```

**Categorical Cross-Entropy (CCE):**

For multi-class classification with K classes:

```
L = -Σ_{k=1}^{K} y_k log p_k
```

y is a one-hot vector: y_k = 1 for the correct class, 0 otherwise.
p comes from softmax: pⱼ = e^{zⱼ} / Σ_{k=1}^{K} e^{z_k}

**Softmax gradient (full derivation):**

Let sⱼ = e^{zⱼ} (unnormalized). Then:

```
pⱼ = sⱼ / S    where S = Σ_k s_k

∂pⱼ/∂z_k = ∂/∂z_k (sⱼ/S)
         = (∂sⱼ/∂z_k · S - sⱼ · ∂S/∂z_k) / S²
         = (δ_{jk} · e^{zⱼ} · S - sⱼ · e^{z_k}) / S²
         = (δ_{jk} · e^{zⱼ})/S - (sⱼ · e^{z_k})/S²
         = pⱼ · δ_{jk} - pⱼ · p_k
         = pⱼ(δ_{jk} - p_k)
```

where δ_{jk} = 1 if j = k, else 0 (Kronecker delta).

Now compute ∂L/∂zⱼ:

```
L = -Σ_k y_k log p_k

∂L/∂zⱼ = -Σ_k y_k · (1/p_k) · ∂p_k/∂zⱼ
       = -Σ_k y_k · (1/p_k) · p_k(δ_{kj} - pⱼ)
       = -Σ_k y_k(δ_{kj} - pⱼ)
       = -(yⱼ - pⱼ · Σ_k y_k)
       = -(yⱼ - pⱼ)        # because Σ_k y_k = 1 (one-hot)
       = pⱼ - yⱼ
```

**Same elegant form!** ∂L/∂zⱼ = pⱼ - yⱼ — identical to binary cross-entropy.

```
#!/usr/bin/env python3
import numpy as np

def log_softmax(z):
    z_shifted = z - np.max(z, axis=-1, keepdims=True)  # numerical stability
    log_sum_exp = np.log(np.sum(np.exp(z_shifted), axis=-1, keepdims=True))
    return z_shifted - log_sum_exp

def categorical_crossentropy_loss(y_true, y_pred_logits):
    # y_true is one-hot (or integer labels)
    log_probs = log_softmax(y_pred_logits)
    if y_true.ndim == 1:  # sparse labels
        n = len(y_true)
        loss = -log_probs[np.arange(n), y_true]
    else:  # one-hot
        loss = -np.sum(y_true * log_probs, axis=-1)
    return np.mean(loss)

def categorical_crossentropy_grad(y_true, y_pred_logits):
    # y_true is one-hot
    exp_z = np.exp(y_pred_logits - np.max(y_pred_logits, axis=-1, keepdims=True))
    p = exp_z / np.sum(exp_z, axis=-1, keepdims=True)
    return (p - y_true) / len(y_true)
```

**Log-sum-exp trick for numerical stability:**

Naive logsumexp: log(Σ e^{z_k}) can overflow if any z_k is large (e.g., z = [1000, 999]).

Stable version:
```
logsumexp(z) = max(z) + log(Σ e^{z_k - max(z)})
```

The largest term is factored out, keeping all exponentials ≤ 1:
```
z = [1000, 999, 998]
max(z) = 1000
z - 1000 = [0, -1, -2]
exp = [1, 0.368, 0.135]
logsumexp = 1000 + log(1 + 0.368 + 0.135) = 1000 + 0.407
```

**Focal Loss (Lin et al., 2017 — RetinaNet):**

Focal loss down-weights well-classified examples, focusing training on hard examples.

```
FL(p_t) = -(1 - p_t)^γ · log(p_t)
```

where p_t = p if y = 1, else 1 - p.

γ ≥ 0 is the focusing parameter:
- γ = 0: standard cross-entropy
- γ > 0: down-weights easy examples
- γ = 2 (typical): a well-classified example with p = 0.9 gets loss ≈ 0.01× CE

**Gradient:**
```
∂FL/∂p_t = -(1-p_t)^γ (1/p_t - γ log(p_t)/(1-p_t))
```

```
#!/usr/bin/env python3
import numpy as np

def focal_loss(y_true, y_pred_probs, gamma=2.0, eps=1e-15):
    p = np.clip(y_pred_probs, eps, 1 - eps)
    p_t = y_true * p + (1 - y_true) * (1 - p)
    loss = -((1 - p_t) ** gamma) * np.log(p_t)
    return np.mean(loss)
```

**Effect of γ on example weighting:**

| p_t (confidence) | γ = 0 (CE) | γ = 1 | γ = 2 |
|------------------|-----------|-------|-------|
| 0.1 (hard) | 2.30 | 2.07 | 1.86 |
| 0.5 (medium) | 0.69 | 0.35 | 0.17 |
| 0.9 (easy) | 0.10 | 0.01 | 0.001 |

Easy examples (p_t ≈ 0.9) have their loss reduced by 100× when γ = 2. This is crucial for class imbalance (e.g., object detection: 100k background boxes vs 10 foreground objects).

**Hinge Loss (SVM):**

Hinge loss is used in support vector machines. It penalizes predictions that are not correctly classified with a margin.

```
L(y, ŷ) = max(0, 1 - y·ŷ)
```

where y ∈ {-1, +1} and ŷ ∈ ℝ is the raw output (before any activation).

Gradient:
```
∂L/∂ŷ = { -y    if y·ŷ < 1
        { 0     if y·ŷ ≥ 1
```

**Squared hinge:** max(0, 1 - y·ŷ)² — differentiable variant with smoother gradient.

**Hinge vs cross-entropy:**
- Hinge: no probabilistic interpretation, focuses on margin maximization
- Cross-entropy: probabilistic, focuses on likelihood maximization
- Hinge: only penalizes misclassifications within the margin
- Cross-entropy: always penalizes, even if prediction is correct but not certain enough

```
#!/usr/bin/env python3
import numpy as np

def hinge_loss(y_true, y_pred_raw):
    # y_true ∈ {-1, 1}
    margin = y_true * y_pred_raw
    loss = np.maximum(0, 1 - margin)
    return np.mean(loss)

def hinge_grad(y_true, y_pred_raw):
    margin = y_true * y_pred_raw
    grad = np.where(margin < 1, -y_true, 0.0)
    return grad / len(y_true)
```

## Embedding / Ranking Losses

These losses operate on distances between embeddings, useful for metric learning, face recognition, and retrieval.

**Triplet Loss (Schroff et al., 2015 — FaceNet):**

The triplet loss pulls an anchor closer to a positive example (same class) and pushes it away from a negative example (different class).

```
L = max(‖f(a) - f(p)‖² - ‖f(a) - f(n)‖² + α, 0)
```

- a: anchor embedding
- p: positive embedding (same identity as anchor)
- n: negative embedding (different identity)
- α: margin (minimum separation between positive and negative distances)

**Gradient intuition:**
- If the constraint is violated (‖a-p‖² - ‖a-n‖² + α > 0):
  - Push a and p closer: ∇(‖a-p‖²) = 2(a-p)
  - Push a and n apart: ∇(‖a-n‖²) = -2(a-n)
  - Also adjust a by both forces: ∇_a = 2(n-p)
- If the constraint is satisfied (margin already met): gradient = 0

```
#!/usr/bin/env python3
import numpy as np

def triplet_loss(anchor, positive, negative, alpha=0.2):
    pos_dist = np.sum((anchor - positive)**2)
    neg_dist = np.sum((anchor - negative)**2)
    loss = np.maximum(pos_dist - neg_dist + alpha, 0)
    return loss
```

**Triplet mining strategies:**

The choice of negatives dramatically affects training quality.

**Easy negatives:** ‖a-n‖² > ‖a-p‖² + α (already outside margin, loss = 0, no gradient)
**Hard negatives:** ‖a-n‖² < ‖a-p‖² (closer than positive, most informative)
**Semi-hard negatives:** ‖a-p‖² < ‖a-n‖² < ‖a-p‖² + α (within margin, good training signal)

**Contrastive Loss (Chopra et al., 2005):**

```
L = (1/2) · y · D² + (1/2) · (1 - y) · max(0, m - D)²
```

- D = ‖f(x₁) - f(x₂)‖ (Euclidean distance between embeddings)
- y = 1 if x₁ and x₂ are from the same class, 0 if different
- m = margin (minimum desired separation for different classes)

**Behavior:**
- Same class (y = 1): minimize D² → pull representations together
- Different class (y = 0): push apart if D < m, ignore if D ≥ m

```
#!/usr/bin/env python3
import numpy as np

def contrastive_loss(x1, x2, y, margin=1.0):
    D = np.sqrt(np.sum((x1 - x2)**2))
    loss = 0.5 * y * D**2 + 0.5 * (1 - y) * max(0, margin - D)**2
    return loss
```

**InfoNCE (Noise Contrastive Estimation) — used in SimCLR, CLIP, MoCo:**

InfoNCE is the most widely used loss in self-supervised and contrastive representation learning.

```
L = -log( exp(q·k₊/τ) / Σ_{i=0}^{K} exp(q·kᵢ/τ) )
```

- q: query embedding (e.g., augmented view of an image)
- k₊: positive key (e.g., another augmented view of the same image)
- kᵢ: all keys (1 positive + K negatives)
- τ: temperature parameter (controls concentration)

**Temperature τ:**
- Low τ (< 0.1): very peaked softmax, focuses on hardest negatives
- High τ (> 0.5): smoother distribution, uniform treatment of negatives
- τ = 1: standard cross-entropy scaling

**Connection to mutual information:**
InfoNCE maximizes a lower bound on the mutual information between q and k₊:
```
I(q; k₊) ≥ log(K) - L_InfoNCE
```

As the number of negatives K → ∞, the bound tightens.

```
#!/usr/bin/env python3
import numpy as np

def infonce_loss(q, k_pos, k_neg, tau=0.1):
    # q: (d,) query embedding
    # k_pos: (d,) positive key
    # k_neg: (K, d) negative keys
    pos_logit = np.dot(q, k_pos) / tau
    neg_logits = np.dot(q, k_neg.T) / tau
    logits = np.concatenate([[pos_logit], neg_logits])
    log_probs = logits - np.log(np.sum(np.exp(logits)))
    return -log_probs[0]  # negative log-prob of positive
```

## Probabilistic / Generative Losses

**KL Divergence as Loss (Variational Inference):**

KL divergence measures how one probability distribution diverges from another.

```
D_KL(q(z)‖p(z)) = ∫ q(z) · log(q(z)/p(z)) dz = E_{z∼q}[log q(z) - log p(z)]
```

**Asymmetric behavior:**
- KL(q‖p) = E_{q}[log q - log p]: penalizes q placing mass where p has low density → q is "mode-seeking"
- KL(p‖q) = E_{p}[log p - log q]: penalizes q missing mass where p has mass → q is "mean-seeking"

**Mean-seeking (forward KL) vs mode-seeking (reverse KL):**

Forward KL (KL(p‖q)): q must cover all modes of p. If p is multimodal, q spreads across modes (high variance, high entropy).

Reverse KL (KL(q‖p)): q chooses one mode of p to concentrate on (low variance, low entropy). Used in variational inference because we can evaluate p(z) but not sample from it easily.

**ELBO (Evidence Lower Bound) — Variational Autoencoders:**

The ELBO is the standard objective for variational autoencoders:

```
ELBO = E_{z∼q}[log p(x|z)] - D_KL(q(z|x)‖p(z))
```

VAE loss = -ELBO = reconstruction loss + KL regularization.

**Reconstruction term:**
- For continuous data (images, audio): MSE or L1
- For discrete data (binary pixels): BCE

**KL term (Gaussian case):**

For q(z|x) = 𝒩(μ, σ²) and p(z) = 𝒩(0, 1):

```
D_KL(𝒩(μ, σ²)‖𝒩(0, 1)) = (1/2) Σ (μ² + σ² - log σ² - 1)
```

```
#!/usr/bin/env python3
import numpy as np

def kl_gaussian(mu, logvar):
    # mu: (batch, latent_dim)
    # logvar: (batch, latent_dim)  — log of variance
    kl = -0.5 * np.sum(1 + logvar - mu**2 - np.exp(logvar), axis=-1)
    return np.mean(kl)

def vae_loss(x, x_recon, mu, logvar):
    recon_loss = np.mean(np.sum((x - x_recon)**2, axis=-1))
    kl_loss = kl_gaussian(mu, logvar)
    return recon_loss + kl_loss
```

**VLB for Diffusion Models (Ho et al., 2020 — DDPM):**

The simplified variational lower bound for denoising diffusion probabilistic models:

```
L_simple = E_{t, x₀, ε} [‖ε - ε_θ(x_t, t)‖²]
```

where:
- ε ∼ 𝒩(0, I): noise added to data
- x_t = √(ᾱ_t) · x₀ + √(1 - ᾱ_t) · ε: noisy image at timestep t
- ε_θ(x_t, t): neural network predicting the added noise
- ᾱ_t = Π_{s=1}^{t} α_s, with α_t = 1 - β_t (β_t is the noise schedule)

**Why L_simple works:**
The full VLB has different weights at different timesteps. L_simple sets all weights to 1, which emphasizes denoising at all timesteps equally. Empirically, this gives better sample quality than the weighted VLB.

```
#!/usr/bin/env python3
import numpy as np

def diffusion_simple_loss(noise, noise_pred):
    # noise: true noise added ε
    # noise_pred: predicted noise ε_θ
    return np.mean((noise - noise_pred)**2)

def forward_diffusion(x0, t, alpha_bar):
    # x0: clean data
    # t: timestep
    # alpha_bar: ᾱ_t (cumulative product)
    noise = np.random.randn(*x0.shape)
    xt = np.sqrt(alpha_bar[t]) * x0 + np.sqrt(1 - alpha_bar[t]) * noise
    return xt, noise
```

**Wasserstein Loss (WGAN-GP — Gulrajani et al., 2017):**

Wasserstein GAN with Gradient Penalty uses a critic D (discriminator) to approximate the Wasserstein-1 distance:

```
L = E_{x∼ℙ_r}[D(x)] - E_{x∼ℙ_g}[D(x)] + λ · E_{x̂∼ℙ_x̂}[(‖∇_x̂ D(x̂)‖₂ - 1)²]
```

- E_{x∼ℙ_r}[D(x)]: average critic score on real data (maximized by critic)
- E_{x∼ℙ_g}[D(x)]: average critic score on generated data (minimized by critic)
- GP term: enforces 1-Lipschitz constraint by penalizing gradient norm deviating from 1
- ℙ_x̂: uniform interpolation between real and generated samples

**Why WGAN-GP instead of standard GAN:**
Standard GAN loss saturates (discriminator wins too easily, vanishing gradient for generator). Wasserstein loss gives a meaningful distance metric that doesn't saturate.

```
#!/usr/bin/env python3
import numpy as np

def wasserstein_gp_loss(d_real, d_fake, grad_penalty, lam=10.0):
    # d_real: critic output on real data
    # d_fake: critic output on generated data
    w_distance = np.mean(d_real) - np.mean(d_fake)
    loss_critic = -w_distance + lam * grad_penalty  # critic wants to maximize W-distance
    loss_generator = -np.mean(d_fake)               # generator wants to fool critic
    return loss_critic, loss_generator

def gradient_penalty(critic, real, fake):
    batch_size = real.shape[0]
    eps = np.random.uniform(0, 1, size=(batch_size, 1, 1, 1))
    interp = eps * real + (1 - eps) * fake
    with np.GradientTape() as tape:
        tape.watch(interp)
        d_interp = critic(interp)
    grads = tape.gradient(d_interp, interp)
    grad_norm = np.sqrt(np.sum(grads.reshape(batch_size, -1)**2, axis=-1))
    gp = np.mean((grad_norm - 1)**2)
    return gp
```

## Loss Function Properties

Understanding fundamental properties helps choose the right loss for the task.

**Symmetric vs Asymmetric:**
- Symmetric (pay equal attention to over- and under-prediction): MSE, MAE, Huber, Log-Cosh
- Asymmetric: Quantile Loss, Pinball Loss

**Bounded vs Unbounded:**
- Bounded below by 0: MSE, MAE, Huber, BCE, CCE, Hinge
- Unbounded above: MSE (for large errors), BCE (when p → 0 and y = 1)
- Bounded both sides: focal loss (approaches 0 for easy examples)

**Smoothness (differentiability class):**
- C∞: MSE, Log-Cosh
- C²: Huber (piecewise)
- C¹: MAE (not differentiable at 0)
- C⁰: Quantile Loss

**Outlier Sensitivity:**
- MSE > Huber > Log-Cosh > MAE
- MSE: squared error → outliers dominate the loss
- MAE: absolute error → each point contributes equally

**Convexity:**
- Convex: MSE, MAE, Huber, Hinge, BCE, CCE
- Non-convex: Focal Loss (with γ > 0), Triplet Loss (near zero when satisfied)

**Strict Properness (classification):**

A loss is proper if its expected value is minimized by the true conditional probability.

- Log loss (BCE, CCE): strictly proper
- Hinge loss: not proper (not a probabilistic loss)
- Exponential loss (Boosting): proper but not strictly

**Gradient behavior comparison:**

| Loss | Gradient magnitude (small error) | Gradient magnitude (large error) | Shape |
|------|--------------------------------|--------------------------------|-------|
| MSE | O(a) | O(a) — linear, unbounded | Quadratic |
| MAE | O(1) | O(1) — constant | V-shaped |
| Huber | O(a) | O(δ) — clipped | Quadratic + Linear |
| BCE | O(y-p) | O(1) for p→0 | Log-shaped |

**Plotting losses for comparison:**

```
#!/usr/bin/env python3
import numpy as np

# Comparison of regression losses over a range of residuals
a = np.linspace(-5, 5, 1000)  # residual = y - ŷ

mse = 0.5 * a**2
mae = np.abs(a)
huber = np.where(np.abs(a) <= 1, 0.5*a**2, np.abs(a) - 0.5)
logcosh = np.log(np.cosh(a))

# Comparison of classification losses over logits
z = np.linspace(-5, 5, 1000)

# BCE for y=1: -log(σ(z))
bce_y1 = np.log(1 + np.exp(-z))  # simplified: -log(σ(z))
# BCE for y=0: -log(1-σ(z))
bce_y0 = np.log(1 + np.exp(z))   # simplified: -log(1-σ(z))
# Hinge for y=1
hinge = np.maximum(0, 1 - z)

# Gradient comparison
def sigmoid(x):
    return 1 / (1 + np.exp(-x))

bce_grad_y1 = sigmoid(z) - 1  # = -(1-p) = -(1-σ(z))
bce_grad_y0 = sigmoid(z)      # = p = σ(z)
```

---

**References:**

- Lin, T. Y., et al. (2017). Focal loss for dense object detection.
- Schroff, F., et al. (2015). FaceNet: A unified embedding for face recognition and clustering.
- Chopra, S., et al. (2005). Learning a similarity metric discriminatively, with application to face verification.
- Ho, J., et al. (2020). Denoising diffusion probabilistic models.
- Gulrajani, I., et al. (2017). Improved training of Wasserstein GANs.
- Oord, A. van den, et al. (2018). Representation learning with contrastive predictive coding.
- Kingma, D. P., & Welling, M. (2014). Auto-encoding variational Bayes.
