# Calculus for Machine Learning

Comprehensive reference covering derivatives, gradients, chain rule, automatic differentiation, optimizer derivations, loss function gradients, second-order methods, and constrained optimization. Every concept maps to a specific ML/DL algorithm.

## Derivatives Fundamentals

### Definition

The derivative of f at point a is the instantaneous rate of change:

f'(a) = df/dx|_{x=a} = lim_{h→0} (f(a + h) − f(a)) / h

The derivative exists iff this limit exists. If f is differentiable at all points in its domain, it is a differentiable function.

### Differentiation Rules

| Rule | Formula |
|---|---|
| Constant | (c)' = 0 |
| Power | (xⁿ)' = nx^{n−1} |
| Sum | (f + g)' = f' + g' |
| Product | (fg)' = f'g + fg' |
| Quotient | (f/g)' = (f'g − fg') / g² |
| Chain | (f ∘ g)'(x) = f'(g(x)) · g'(x) |
| Inverse | (f⁻¹)'(y) = 1 / f'(f⁻¹(y)) |

### Common Derivatives

| f(x) | f'(x) |
|---|---|
| eˣ | eˣ |
| aˣ | aˣ ln a |
| ln x | 1/x, x > 0 |
| log_a x | 1/(x ln a) |
| sin x | cos x |
| cos x | −sin x |
| tan x | sec² x |
| σ(x) = 1/(1+e⁻ˣ) | σ(x)(1 − σ(x)) |
| tanh x | 1 − tanh² x |
| ReLU(x) = max(0, x) | 1{x > 0} (subgradient at 0) |

```python
import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def sigmoid_derivative(x):
    s = sigmoid(x)
    return s * (1 - s)

def relu_derivative(x):
    return (x > 0).astype(float)

x = np.array([-2, -1, 0, 1, 2])
print(sigmoid_derivative(x))    # [0.105, 0.197, 0.25, 0.197, 0.105]
print(relu_derivative(x))       # [0., 0., 0., 1., 1.]
```

**ML connection**: The sigmoid derivative σ'(x) = σ(x)(1−σ(x)) emerges naturally in binary cross-entropy backprop. ReLU derivative is 1 for positive inputs — this avoids vanishing gradient (unlike sigmoid which saturates). The chain rule is the backbone of **backpropagation**.

## Partial Derivatives

### Definition

For f: ℝⁿ → ℝ, the partial derivative with respect to xᵢ at **a** = (a₁, ..., aₙ) is:

∂f/∂xᵢ(**a**) = lim_{h→0} (f(a₁, ..., aᵢ + h, ..., aₙ) − f(**a**)) / h

This measures sensitivity of f to changes in xᵢ alone, holding all other variables constant.

### Gradient

The gradient of f at **x** is a column vector of all partial derivatives:

∇f(**x**) = (∂f/∂x₁, ∂f/∂x₂, ..., ∂f/∂xₙ)^T

**Properties**:
- ∇f points in the **direction of steepest ascent** of f
- −∇f points in the **direction of steepest descent**
- ∇f is zero at stationary points (local minima, maxima, saddle points)
- ∇f is orthogonal to level sets of f

### Directional Derivative

Rate of change of f at **x** in direction **v** (unit vector):

D_**v** f(**x**) = ∇f(**x**) · **v** = ⟨∇f, **v**⟩

Maximized when **v** aligns with ∇f, minimized when **v** aligns with −∇f.

```python
import numpy as np

def numerical_gradient(f, x, h=1e-5):
    grad = np.zeros_like(x)
    for i in range(len(x)):
        x_plus = x.copy()
        x_minus = x.copy()
        x_plus[i] += h
        x_minus[i] -= h
        grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)
    return grad

def f(x):
    return x[0]**2 + 3*x[1]**2 + 2*x[0]*x[1]

x = np.array([1.0, 2.0])
grad = numerical_gradient(f, x)
print(f"∇f = {grad}")                     # ≈ [6., 14.]
# Analytical: ∂f/∂x₁ = 2x₁ + 2x₂ = 6, ∂f/∂x₂ = 6x₂ + 2x₁ = 14
```

**ML connection**: The gradient of the loss w.r.t. parameters is what SGD follows. Numerical gradient checking is a debugging technique to verify backprop correctness. Batch normalization uses gradients through the normalization statistics.

## The Chain Rule — The Most Important Rule for ML

### Scalar Chain Rule

If z = f(y) and y = g(x), then:

dz/dx = (dz/dy)(dy/dx) = f'(g(x)) · g'(x)

### Vector Chain Rule

For the composition **z** = **f**(**y**(**x**)), where **f**: ℝᵐ → ℝᵖ and **y**: ℝⁿ → ℝᵐ:

∂**z**/∂**x**^T = (∂**z**/∂**y**^T)(∂**y**/∂**x**^T)  (Jacobian composition)

For scalar z = f(**y**(**x**)):

∇_{**x**} z = (∂**y**/∂**x**)^T ∇_{**y**} z

Where ∂**y**/∂**x** is the m×n Jacobian of **y** w.r.t. **x**.

### Backpropagation

For a feedforward network f = f_L ∘ f_{L−1} ∘ ... ∘ f₁, the loss gradient w.r.t. parameters at layer ℓ is:

∂L/∂θ_ℓ = (∂**h**_{ℓ+1}/∂θ_ℓ)^T (∂L/∂**h**_{ℓ+1})

This is computed recursively from output to input:

δ_ℓ = (∂**h**_{ℓ+1}/∂**h**_ℓ)^T δ_{ℓ+1}

where δ_ℓ = ∂L/∂**h**_ℓ is the "error signal" at layer ℓ, and ∂**h**_{ℓ+1}/∂**h**_ℓ is the Jacobian of layer ℓ's output w.r.t. its input.

**Computation graph**: Forward pass computes function values. Backward pass multiplies Jacobians along reverse edges.

```
Forward:   x → h₁ → h₂ → ... → h_L → L
Backward:  ∇ₓL ← ∇₁L ← ∇₂L ← ... ← ∇_LL
```

### Example 1: MSE Linear Regression

L = (1/n) ‖**y** − **Wx** − **b**‖² = (1/n) Σ (yᵢ − (**Wx** + **b**)ᵢ)²

Let **r** = **y** − **Wx** − **b** (residual vector). Then L = (1/n) **r**^T**r**.

∂L/∂**r** = −(2/n) **r**  (since L = (1/n)‖**r**‖²)

∂**r**/∂**W**ᵢⱼ: rₖ = yₖ − Σⱼ Wₖⱼxⱼ − bₖ → ∂rₖ/∂Wᵢⱼ = −xⱼ if k=i else 0

∂L/∂**W** = ∂L/∂**r** · ∂**r**/∂**W** = −(2/n) **r** (−**x**^T) = (2/n) **r** **x**^T = (2/n) (**y** − **Wx** − **b**) **x**^T

∂L/∂**b** = ∂L/∂**r** · ∂**r**/∂**b** = −(2/n) **r** · (−**1**) = (2/n) **r** = (2/n)(**y** − **Wx** − **b**)

Gradient descent update:

**W** ← **W** − η (2/n)(**ŷ** − **y**) **x**^T  (where **ŷ** = **Wx** + **b**)
**b** ← **b** − η (2/n)(**ŷ** − **y**)

### Example 2: Cross-Entropy with Softmax

L = −Σ yᵢ log pᵢ, where pⱼ = exp(zⱼ) / Σₖ exp(zₖ) (softmax)

Derivative of softmax:

∂pⱼ/∂zₖ = pⱼ(1 − pₖ) if j = k, and −pⱼpₖ if j ≠ k  →  diag(**p**) − **pp**^T

Gradient of loss w.r.t. logits:

∂L/∂zₖ = −Σᵢ yᵢ (1/pᵢ) (∂pᵢ/∂zₖ) = −Σᵢ yᵢ (1/pᵢ) · [i=k] pᵢ(1−pₖ) − Σ_{i≠k} yᵢ (1/pᵢ)(−pᵢpₖ)
       = −yₖ(1−pₖ) + Σ_{i≠k} yᵢ pₖ
       = −yₖ + yₖpₖ + pₖ(1−yₖ)
       = pₖ − yₖ

**Beautiful result**: ∇_{**z**}} L = **p** − **y** — the gradient is simply the difference between predicted probabilities and one-hot labels.

```python
def cross_entropy_softmax_gradient(logits, labels):
    """Compute ∂L/∂logits for softmax + cross-entropy."""
    exps = np.exp(logits - np.max(logits))  # subtract max for numerical stability
    probs = exps / exps.sum()
    return probs - labels  # shape matches logits

logits = np.array([1.0, 2.0, 0.5])
labels = np.array([0.0, 1.0, 0.0])
grad = cross_entropy_softmax_gradient(logits, labels)
print(f"∇logits = {grad}")
```

**ML connection**: Every neural network training loop uses the chain rule. Modern frameworks (PyTorch, JAX, TensorFlow) automate this via autograd, but understanding the chain rule is essential for debugging gradient issues, implementing custom layers, and understanding optimizer behavior.

## Automatic Differentiation

### Forward-Mode Autodiff

Compute f(x) and f'(x) simultaneously using dual numbers: represent each value a + a'ε where ε² = 0.

Evaluate f(x + ε) = f(x) + f'(x)ε. The derivative is the ε-component.

```python
# Toy forward-mode: one sweep computes derivative w.r.t. one input
class Dual:
    def __init__(self, val, der=1.0):
        self.val = val
        self.der = der
    def __add__(self, other):
        return Dual(self.val + other.val, self.der + other.der)
    def __mul__(self, other):
        return Dual(self.val * other.val,
                    self.der * other.val + self.val * other.der)
    def __neg__(self):
        return Dual(-self.val, -self.der)
    def __sub__(self, other):
        return Dual(self.val - other.val, self.der - other.der)

# f(x, y) = x*y + y²  →  ∂f/∂x at (3, 2) = y = 2
x = Dual(3, 1.0)   # ∂x/∂x = 1
y = Dual(2, 0.0)   # ∂y/∂x = 0
result = x * y + y * y
print(f"f = {result.val}, ∂f/∂x = {result.der}")  # f = 10, ∂f/∂x = 2
```

### Reverse-Mode Autodiff (Backpropagation)

Two passes:
1. **Forward pass**: Compute and store all intermediate values
2. **Backward pass**: Compute gradients via chain rule, propagating adjoints (∂L/∂v for each node v)

```
Forward:      v₁ = x          v₂ = y          v₃ = v₁*v₂     v₄ = v₂²      v₅ = v₃ + v₄
Backward:     ∂L/∂v₅ = 1     ∂L/∂v₄ = 1      ∂L/∂v₃ = 1     ∂L/∂v₂ = v₁ + 2v₂
```

### Computational Complexity

| Mode | Cost per input | Cost per output | Best for |
|---|---|---|---|
| Forward | O(n) for n inputs | O(1) for 1 output | Few inputs, many outputs |
| Reverse | O(1) for 1 input | O(m) for m outputs | Many inputs, few outputs |

DL uses reverse-mode: n = millions of parameters, m = 1 (scalar loss).

```python
import torch
import jax
import jax.numpy as jnp
import tensorflow as tf

# PyTorch
x = torch.tensor([2.0, 3.0], requires_grad=True)
y = torch.sum(x ** 2)
y.backward()
print(x.grad)  # [4., 6.]

# JAX
def f(x):
    return jnp.sum(x ** 2)

x = jnp.array([2.0, 3.0])
print(jax.grad(f)(x))  # [4., 6.]

# TensorFlow
x = tf.Variable([2.0, 3.0])
with tf.GradientTape() as tape:
    y = tf.reduce_sum(x ** 2)
print(tape.gradient(y, x).numpy())  # [4., 6.]
```

## Gradient Descent Family — Full Derivations

### Vanilla SGD

**Update rule:**

θ_{t+1} = θ_t − η∇_θ L(θ_t; x^{(i)}, y^{(i)})

where η is the learning rate and ∇_θL is the gradient of loss on minibatch i.

**Derivation context**: To minimize L(θ), we take steps in the direction of steepest descent: −∇L. This is the first-order Taylor approximation:

L(θ + Δ) ≈ L(θ) + ∇L(θ)^T Δ

To decrease L, choose Δ = −η∇L(θ). The optimal η for a quadratic L(θ) = (1/2)θ² is η = 1 (converges in one step).

```python
def sgd_update(params, grads, lr=0.01):
    return [p - lr * g for p, g in zip(params, grads)]
```

### Momentum

**Velocity accumulation**:

v_t = βv_{t−1} + (1−β)∇_θ L(θ_t)

θ_{t+1} = θ_t − η v_t

Default: β ≈ 0.9 (typical decay factor)

**Intuition**: Momentum averages past gradients to dampen oscillations. In ravines (one direction steep, the other shallow), momentum accelerates along the shallow direction while canceling oscillations in the steep direction.

```python
def momentum_update(params, grads, velocities, lr=0.01, beta=0.9):
    new_velocities = []
    new_params = []
    for p, g, v in zip(params, grads, velocities):
        v_new = beta * v + (1 - beta) * g
        p_new = p - lr * v_new
        new_velocities.append(v_new)
        new_params.append(p_new)
    return new_params, new_velocities
```

**Why (1−β) factor**: This makes the update scale invariant: if gradients are constant g, the velocity converges to g (since v_t = βv_{t−1} + (1−β)g → v = g as t → ∞).

### Nesterov Accelerated Gradient (NAG)

**Lookahead gradient**:

Compute gradient at a lookahead position:  θ_t + βv_{t−1}

v_t = βv_{t−1} + η ∇L(θ_t + βv_{t−1})

θ_{t+1} = θ_t − v_t

**Intuition**: Nesterov "looks ahead" before taking a step. If you're about to overshoot a minimum, the lookahead gradient points back toward it, slowing you down. This gives faster convergence (O(1/t²) vs O(1/t) for convex objectives).

```python
def nesterov_update(params, grads_fn, velocities, lr=0.01, beta=0.9):
    """
    grads_fn computes gradients at given params.
    NAG requires re-evaluating at lookahead position.
    """
    new_velocities = []
    new_params = []
    for p, v in zip(params, velocities):
        lookahead = p + beta * v
        g = grads_fn(lookahead)  # re-evaluate at lookahead
        v_new = beta * v + lr * g
        p_new = p - v_new
        new_velocities.append(v_new)
        new_params.append(p_new)
    return new_params, new_velocities
```

### AdaGrad

**Adaptive per-parameter learning rates**:

G_t = Σ_{τ=1}^{t} (∇_θ L_τ)²    (accumulated squared gradients)

θ_{t+1, i} = θ_{t, i} − (η / √(G_{t,i} + ε)) ∇_θ L(θ_{t,i})

where ε ≈ 1e−8 prevents division by zero.

**Intuition**: Parameters with large gradients have their effective learning rate reduced; parameters with small gradients have it increased. The accumulation G grows monotonically, so AdaGrad's learning rate decays to zero (can stop learning prematurely).

```python
def adagrad_update(params, grads, cache, lr=0.01, eps=1e-8):
    new_cache = []
    new_params = []
    for p, g, c in zip(params, grads, cache):
        c_new = c + g ** 2
        p_new = p - (lr / (np.sqrt(c_new) + eps)) * g
        new_cache.append(c_new)
        new_params.append(p_new)
    return new_params, new_cache
```

### RMSProp

**Moving average of squared gradients** (addresses AdaGrad's decay problem):

E[g²]_t = βE[g²]_{t−1} + (1−β)(∇_θ L_t)²

θ_{t+1} = θ_t − (η / √(E[g²]_t + ε)) ∇_θ L_t

Default: β = 0.9

**Intuition**: Unlike AdaGrad (sum of all past squared gradients), RMSProp uses an exponential moving average — recent gradient magnitudes matter more. Learning rate no longer monotonically decays.

```python
def rmsprop_update(params, grads, cache, lr=0.01, beta=0.9, eps=1e-8):
    new_cache = []
    new_params = []
    for p, g, c in zip(params, grads, cache):
        c_new = beta * c + (1 - beta) * g ** 2
        p_new = p - (lr / (np.sqrt(c_new) + eps)) * g
        new_cache.append(c_new)
        new_params.append(p_new)
    return new_params, new_cache
```

### Adam (Adaptive Moment Estimation)

**Combines momentum + RMSProp**:

| Step | Formula | Description |
|---|---|---|
| 1 | m_t = β₁m_{t−1} + (1−β₁)g_t | Biased first moment (mean) |
| 2 | v_t = β₂v_{t−1} + (1−β₂)g_t² | Biased second moment (uncentered variance) |
| 3 | m̂_t = m_t / (1−β₁^t) | Bias-corrected first moment |
| 4 | v̂_t = v_t / (1−β₂^t) | Bias-corrected second moment |
| 5 | θ_{t+1} = θ_t − η m̂_t / (√v̂_t + ε) | Parameter update |

**Defaults**: β₁ = 0.9, β₂ = 0.999, ε = 1e−8

**Bias correction rationale**: m₀ = 0, v₀ = 0, so early estimates are biased toward zero. Dividing by (1−βᵗ) corrects this.

```python
def adam_update(params, grads, m, v, t, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
    new_m = []
    new_v = []
    new_params = []
    for p, g, m_i, v_i in zip(params, grads, m, v):
        m_new = beta1 * m_i + (1 - beta1) * g
        v_new = beta2 * v_i + (1 - beta2) * g ** 2
        m_hat = m_new / (1 - beta1 ** t)
        v_hat = v_new / (1 - beta2 ** t)
        p_new = p - lr * m_hat / (np.sqrt(v_hat) + eps)
        new_m.append(m_new)
        new_v.append(v_new)
        new_params.append(p_new)
    return new_params, new_m, new_v
```

### AdamW (Decoupled Weight Decay)

Same as Adam, but weight decay is applied **separately** from gradient:

θ_{t+1} = θ_t − η ( m̂_t / (√v̂_t + ε) + λ θ_t )

where λ is the weight decay coefficient.

**Key insight**: L₂ regularization adds λθ to the gradient; Adam then adaptively scales it. AdamW decouples them: gradient-based update uses Adam, weight decay is applied directly. This is the default in most modern DL frameworks (e.g., huggingface transformers uses AdamW by default).

```python
def adamw_update(params, grads, m, v, t, lr=0.001, beta1=0.9, beta2=0.999,
                 eps=1e-8, weight_decay=0.01):
    new_m, new_v, new_params = [], [], []
    for p, g, m_i, v_i in zip(params, grads, m, v):
        m_new = beta1 * m_i + (1 - beta1) * g
        v_new = beta2 * v_i + (1 - beta2) * g ** 2
        m_hat = m_new / (1 - beta1 ** t)
        v_hat = v_new / (1 - beta2 ** t)
        p_new = p - lr * m_hat / (np.sqrt(v_hat) + eps) - lr * weight_decay * p
        new_m.append(m_new)
        new_v.append(v_new)
        new_params.append(p_new)
    return new_params, new_m, new_v
```

### Other Notable Optimizers

| Optimizer | Update Rule | Key Feature |
|---|---|---|
| **Nadam** | Adam + Nesterov lookahead | Faster convergence, used in some RNN training |
| **Lion** | θ_{t+1} = θ_t − η(sign(β₁m_{t−1} + (1−β₁)g_t) + λθ_t) | Symbolic discovery, sign-based, simpler |
| **Sophia** | θ_{t+1} = θ_t − η(m̂_t/(√v̂_t + ε) + λθ_t) with Hessian diagonal | Second-order inspired, batch size ×2 |
| **AdaBound** | Clips Adam LR between lower/upper bounds | Smooth transition from Adam to SGD |
| **Ranger** | RAdam + LookAhead | Combines rectified Adam + forward synchronization |
| **LAMB** | Layer-wise adaptive LR scaling | Large-batch training (BERT, 64k batch size) |

## Loss Function Derivatives

### Mean Squared Error (MSE)

L = (1/n) Σ_{i=1}^{n} (yᵢ − ŷᵢ)²

∂L/∂ŷᵢ = (2/n)(ŷᵢ − yᵢ)  (note: sign depends on convention)

**Vector form**: ∇_{ŷ} L = (2/n)(ŷ − **y**)

```python
def mse_gradient(y_pred, y_true):
    return 2 * (y_pred - y_true) / len(y_true)
```

**ML use**: Regression tasks, autoencoder reconstruction loss.

### Mean Absolute Error (MAE)

L = (1/n) Σ |yᵢ − ŷᵢ|

∂L/∂ŷᵢ = (1/n) sign(ŷᵢ − yᵢ)  (undefined at 0; subgradient ∈ [−1/n, 1/n])

**ML use**: Robust regression (less sensitive to outliers than MSE).

### Huber Loss

L_δ(a) = { (1/2) a², if |a| ≤ δ ; δ(|a| − δ/2), otherwise }

where a = ŷ − y.

∂L_δ/∂a = { a, if |a| ≤ δ ; δ · sign(a), otherwise }

**ML use**: Smooth L₁ loss in object detection (Faster R-CNN, YOLO). Combines L₂ behavior near zero (smooth, well-behaved) with L₁ behavior far from zero (robust to outliers).

```python
def huber_gradient(y_pred, y_true, delta=1.0):
    a = y_pred - y_true
    mask = np.abs(a) <= delta
    grad = np.where(mask, a, delta * np.sign(a))
    return grad / len(y_true)
```

### Binary Cross-Entropy (Log Loss)

L = −y ln(p) − (1−y) ln(1−p)

where p ∈ (0,1) is the predicted probability of class 1.

∂L/∂p = −y/p + (1−y)/(1−p) = (p − y) / (p(1−p))

With sigmoid p = σ(z) = 1/(1+e⁻ᶻ), the gradient w.r.t. logit z is:

∂L/∂z = (∂L/∂p)(∂p/∂z) = (p−y)/(p(1−p)) · p(1−p) = p − y

**Same elegant result as softmax**: ∇_z L = σ(z) − y

```python
def bce_sigmoid_gradient(logits, labels):
    probs = 1 / (1 + np.exp(-logits))
    return probs - labels
```

**ML use**: Binary classification (logistic regression, binary classifiers).

### Categorical Cross-Entropy

L = −Σ_{c=1}^{C} y_c ln(p_c)

where p_c = softmax(z_c) = e^{z_c} / Σ_j e^{z_j}

∂L/∂zⱼ = pⱼ − yⱼ

**Proof**: See full derivation in the Chain Rule section above.

**ML use**: Multiclass classification with C > 2 classes. Every classification neural network uses this.

### Focal Loss

L = −(1 − p_t)^γ ln(p_t)

where p_t = p if y=1, and p_t = 1−p if y=0.

∂L/∂p_t = −(1−p_t)^γ (1/p_t − γ ln(p_t)/(1−p_t))

**ML use**: Object detection (RetinaNet). The modulating factor (1−p_t)^γ down-weights easy examples — the model focuses on hard, misclassified examples.

### Hinge Loss (SVM)

L = max(0, 1 − y·ŷ)

where y ∈ {−1, +1} is the true label, ŷ is the raw score.

∂L/∂ŷ = −y if y·ŷ < 1, else 0 (subgradient at y·ŷ = 1)

```python
def hinge_gradient(scores, labels):
    """labels in {-1, 1}"""
    mask = (labels * scores) < 1.0
    return np.where(mask, -labels, 0.0)
```

**ML use**: SVM training, one-class classification, some metric learning objectives.

### Triplet Loss

L = max(‖f(a) − f(p)‖² − ‖f(a) − f(n)‖² + α, 0)

where a = anchor, p = positive (same class), n = negative (different class), α = margin.

∂L/∂f(a) = 2(f(n) − f(p)) if L > 0, else 0
∂L/∂f(p) = 2(f(p) − f(a)) if L > 0, else 0
∂L/∂f(n) = 2(f(a) − f(n)) if L > 0, else 0

```python
def triplet_loss_gradient(anchor, positive, negative, alpha=0.2):
    d_pos = np.sum((anchor - positive) ** 2)
    d_neg = np.sum((anchor - negative) ** 2)
    loss = max(d_pos - d_neg + alpha, 0)

    if loss > 0:
        grad_a = 2 * (negative - positive)
        grad_p = 2 * (positive - anchor)
        grad_n = 2 * (anchor - negative)
    else:
        grad_a = grad_p = grad_n = np.zeros_like(anchor)
    return grad_a, grad_p, grad_n, loss
```

**ML use**: Face recognition (FaceNet), person re-identification, metric learning, Siamese networks, some contrastive representation learning methods.

## Taylor Series and Second-Order Methods

### Scalar Taylor Expansion

f(x) = f(a) + f'(a)(x−a) + (1/2)f''(a)(x−a)² + (1/3!)f'''(a)(x−a)³ + ...

### Vector Taylor Expansion

f(**x**) = f(**x**₀) + ∇f(**x**₀)^T(**x**−**x**₀) + (1/2)(**x**−**x**₀)^T **H**(**x**₀)(**x**−**x**₀) + ...

### Newton's Method

Minimize the second-order approximation of f at **x**ₜ:

**x**_{t+1} = **x**_t − **H**(**x**_t)^{-1} ∇f(**x**_t)

**Pros**: Second-order convergence rate (quadratic near optimum). No learning rate tuning.

**Cons**: Computing **H**⁻¹ is O(n³) and requires O(n²) memory. **H** may not be positive definite (then Newton goes uphill).

**ML connection**: The Hessian in Newton's method captures curvature — it tells you not just which direction is downhill, but how steep the valley is. In flat regions, Newton takes large steps; in sharp valleys, it takes small steps.

### Quasi-Newton (BFGS)

Approximate **H**ₜ⁻¹ using gradient differences, avoiding O(n³) computation:

**H**_{t+1}^{-1} = (**I** − ρₜ**s**ₜ**y**ₜ^T) **H**ₜ^{-1} (**I** − ρₜ**y**ₜ**s**ₜ^T) + ρₜ**s**ₜ**s**ₜ^T

where **s**ₜ = **x**_{t+1} − **x**_t, **y**ₜ = ∇f(**x**_{t+1}) − ∇f(**x**_t), ρₜ = 1/(**y**ₜ^T**s**ₜ)

### L-BFGS

Store only the last m = 10−100 pairs (sₜ, yₜ). Approximate H⁻¹ recursively. O(mn) per iteration instead of O(n²).

```python
from scipy.optimize import minimize

def rosenbrock(x):
    return 100 * (x[1] - x[0]**2)**2 + (1 - x[0])**2

result = minimize(rosenbrock, [0, 0], method='L-BFGS-B')
print(f"Minimum at {result.x}, f = {result.fun}")
```

**ML use**: L-BFGS is the default optimizer for logistic regression (scikit-learn), CRF training, and full-batch optimization when batch size = full dataset.

### XGBoost Connection

XGBoost uses the **second-order Taylor expansion** of the loss function to compute the optimal leaf values:

**Objective** at iteration t:

Obj^{(t)} = Σᵢ [L(yᵢ, ŷᵢ^{(t−1)} + fₜ(**x**ᵢ))] + Ω(fₜ)

**Second-order expansion** around ŷ^{(t−1)}:

Obj^{(t)} ≈ Σᵢ [L(yᵢ, ŷ^{(t−1)}) + gᵢ fₜ(**x**ᵢ) + (1/2) hᵢ fₜ(**x**ᵢ)²] + Ω(fₜ)

where gᵢ = ∂L/∂ŷ^{(t−1)} (gradient), hᵢ = ∂²L/∂(ŷ^{(t−1)})² (hessian)

**Optimal leaf value** for a tree with leaf set Iⱼ:

wⱼ^* = −(Σ_{i∈Iⱼ} gᵢ) / (Σ_{i∈Iⱼ} hᵢ + λ)

```python
# XGBoost uses user-provided gradient and hessian for custom objectives
def custom_objective(y_true, y_pred):
    # MSE
    grad = y_pred - y_true
    hess = np.ones_like(y_true)
    return grad, hess
```

**ML connection**: This second-order approximation is why XGBoost outperforms first-order gradient boosting. The Hessian captures curvature, enabling adaptive step sizes per leaf.

## Gradient Flow and Vanishing/Exploding Gradients

### Continuous-Time View

Gradient descent can be seen as a discretization of the **gradient flow** ODE:

dθ/dt = −∇L(θ)  (continuous-time gradient descent)

As Δt → 0, the discrete update θ_{t+1} = θ_t − η∇L(θ_t) matches the ODE with η = Δt.

### Gradient Propagation in Deep Networks

For an L-layer network **h**_{ℓ+1} = f_ℓ(**h**_ℓ), the gradient of loss w.r.t. **h**₁ is:

∂L/∂**h**₁ = (∂**h**₂/∂**h**₁)^T (∂**h**₃/∂**h**₂)^T ... (∂**h**_L/∂**h**_{L−1})^T (∂L/∂**h**_L)

= (∏_{ℓ=1}^{L−1} **J**_{ℓ+1,ℓ}^T) ∇_{**h**_L} L

where **J**_{ℓ+1,ℓ} = ∂**h**_{ℓ+1}/∂**h**_ℓ is the Jacobian of layer ℓ.

### Vanishing Gradients

If the spectral radius (max |λ|) of each Jacobian ρ(**J**_{ℓ+1,ℓ}) < 1, then:

∏_{ℓ=1}^{L−1} **J**_{ℓ+1,ℓ}^T → **0** as L → ∞

The gradient vanishes. Early layers learn slowly or not at all.

**Classic example**: Sigmoid/tanh networks. The sigmoid derivative ≤ 0.25. Depth L > 30 means gradient scales by ≤ 0.25^{30} ≈ 10^{-18} — effectively zero.

### Exploding Gradients

If ρ(**J**_{ℓ+1,ℓ}) > 1, the product grows exponentially. Weight updates become unstable (NaN, divergence).

**Common in**: RNNs with long sequences. The repeated application of the same weight matrix means eigenvalues > 1 explode, < 1 vanish.

### Solutions

| Technique | What It Does | Why It Works |
|---|---|---|
| **Proper initialization** | Xavier: Var(W) = 1/fan_in; He: Var(W) = 2/fan_in | Keeps activation variance ≈ constant across layers |
| **Batch normalization** | **ẑ** = (z − μ)/σ, **ẑ**_out = γ**ẑ** + β | Jacobian ≈ γI, well-conditioned |
| **Residual connections** | **h**_{ℓ+1} = **h**_ℓ + F(**h**_ℓ) | ∂**h**_{ℓ+1}/∂**h**_ℓ = I + ∂F/∂**h**_ℓ ≈ I |
| **Gradient clipping** | **g** ← **g** · threshold / ‖**g**‖ if ‖**g**‖ > threshold | Caps gradient norm, prevents explosion |
| **LayerNorm / RMSNorm** | Normalize across features | Stable gradient flow in transformers |
| **ReLU / GELU** | Derivative ≈ 0 or 1 | No saturation (unlike sigmoid) |
| **LSTM gates** | Forget gate preserves gradient flow | Constant error carousel prevents vanishing |

```python
def gradient_clipping(grads, max_norm=1.0):
    total_norm = np.sqrt(sum(np.sum(g**2) for g in grads))
    if total_norm > max_norm:
        scale = max_norm / total_norm
        return [g * scale for g in grads]
    return grads
```

**ML connection**: Gradient vanishing killed early deep learning (pre-2010). The combination of ReLU + Xavier init + batch norm + residual connections enabled the modern deep revolution (ResNet, 2015 — 152 layers at the time).

## Lagrange Multipliers and Constrained Optimization

### Problem Statement

Minimize f(**x**) subject to constraints:

| Type | Form | Example |
|---|---|---|
| Equality | gᵢ(**x**) = 0, i = 1,...,m | **Ax** = **b** (linear equality) |
| Inequality | hⱼ(**x**) ≤ 0, j = 1,...,p | ‖**x**‖₁ ≤ λ (L₁ constraint) |

### Lagrangian

L(**x**, λ, **μ**) = f(**x**) + Σᵢ λᵢ gᵢ(**x**) + Σⱼ μⱼ hⱼ(**x**)

where λᵢ and μⱼ are Lagrange multipliers (dual variables).

### KKT Conditions (necessary for optimality)

1. **Stationarity**: ∇f(**x**^*) + Σᵢ λᵢ∇gᵢ(**x**^*) + Σⱼ μⱼ∇hⱼ(**x**^*) = 0
2. **Primal feasibility**: gᵢ(**x**^*) = 0, hⱼ(**x**^*) ≤ 0
3. **Dual feasibility**: μⱼ ≥ 0
4. **Complementary slackness**: μⱼ hⱼ(**x**^*) = 0 (either μⱼ = 0 or hⱼ = 0)

**Intuition**: At the optimum, the gradient of f must be a linear combination of the constraint gradients. For inequality constraints, either the constraint is inactive (μⱼ = 0) or it binds (hⱼ = 0).

### Example: SVM Dual Formulation

**Primal**: minimize (1/2)‖**w**‖² subject to yᵢ(**w**^T**x**ᵢ + b) ≥ 1, ∀i

**Lagrangian**: L = (1/2)‖**w**‖² + Σᵢ αᵢ[1 − yᵢ(**w**^T**x**ᵢ + b)], αᵢ ≥ 0

**Stationarity**: ∂L/∂**w** = **w** − Σᵢ αᵢ yᵢ **x**ᵢ = 0 → **w** = Σᵢ αᵢ yᵢ **x**ᵢ

**Dual**: maximize W(α) = Σᵢ αᵢ − (1/2) Σᵢ Σⱼ αᵢαⱼ yᵢyⱼ **x**ᵢ^T**x**ⱼ

subject to Σᵢ αᵢ yᵢ = 0, αᵢ ≥ 0.

**KKT**: αᵢ[1 − yᵢ(**w**^T**x**ᵢ + b)] = 0. Only support vectors (αᵢ > 0) affect **w**.

```python
from sklearn.svm import SVC

# The dual formulation is solved internally
svm = SVC(kernel='linear', C=1.0)
svm.fit(X, y)
# svm.dual_coef_ gives the Lagrange multipliers αᵢyᵢ
# svm.support_vectors_ are the data points with αᵢ > 0
```

### L₁ Regularization as Constraint

min L(**w**) subject to ‖**w**‖₁ ≤ λ

The Lagrangian: min L(**w**) + λ‖**w**‖₁

KKT: ∇L + λ · sign(**w**) = 0 for w ≠ 0. This is the subgradient condition. The constraint λ corresponds to the Lagrange multiplier (regularization strength) — increasing λ tightens the constraint, forcing more weights to zero.

### Connection to Dual SGD and Fenchel Conjugates

The Lagrange dual connects to convex conjugates (Fenchel duality). The dual of L₁ regularization is a max-norm constraint on the gradients of the loss, which connects to the dual averaging and mirror descent algorithms used in online learning and large-scale optimization.

## Integration Essentials

### Expectation

**Continuous**: 𝔼[X] = ∫_{−∞}^{∞} x f(x) dx, where f is the PDF

**Discrete**: 𝔼[X] = Σᵢ xᵢ p(xᵢ)

### Variance

𝕍[X] = 𝔼[(X − μ)²] = 𝔼[X²] − μ²

### Law of Total Expectation (Tower Property)

𝔼[Y] = 𝔼[𝔼[Y | X]]

**ML connection**: Used in EM algorithm derivation and bias-variance decomposition:

𝔼[(y − ŷ)²] = (𝔼[ŷ] − y)² + 𝔼[(ŷ − 𝔼[ŷ])²] = Bias² + Variance

### Monte Carlo Integration

∫ f(x) dx ≈ (1/N) Σ_{i=1}^{N} f(xᵢ), where xᵢ ∼ p(x)

**ML connection**: Expected loss (generalization error) 𝔼[L], Bayesian inference with intractable integrals, MC dropout for uncertainty estimation, importance sampling for off-policy RL.

```python
# Monte Carlo estimate of ∫₀¹ x² dx = 1/3
N = 100000
x = np.random.uniform(0, 1, N)
estimate = np.mean(x ** 2)
print(f"MC estimate: {estimate:.4f}, True: {1/3:.4f}")

# Importance sampling: estimate E[f] under p using samples from q
def importance_sampling(f, p, q, n_samples=10000):
    x = q.rvs(n_samples)
    weights = p.pdf(x) / q.pdf(x)
    return np.mean(f(x) * weights)
```

### Law of Large Numbers & Central Limit Theorem

**LLN**: (1/N) Σ Xᵢ → 𝔼[X] as N → ∞ (MC converges to true expectation)

**CLT**: √N (X̄ − μ) → N(0, σ²) (MC error ∼ σ/√N)

```python
# MC error: standard deviation of the estimate
sample_means = [np.mean(np.random.uniform(0, 1, 1000)**2) for _ in range(1000)]
print(f"Std of MC estimate: {np.std(sample_means):.4f}")
print(f"Theoretical: σ/√N = {np.std(np.random.uniform(0, 1, 10000)**2) / np.sqrt(1000):.4f}")
```

## Practical ML Calculus Summary

| Concept | Calculus Tool | ML Application |
|---|---|---|
| Training | ∇L(θ) → gradient descent | Every optimizer uses parameter gradients |
| Backprop | Chain rule on computation graph | All neural network training |
| Loss design | ∂L/∂ŷ | Choosing derivative behavior (e.g., Huber) |
| Optimization | First-order (Taylor) → GD, second-order → Newton | Convergence speed and stability |
| Regularization | L₁/L₂ penalty gradients | Sparsity, weight decay |
| Attention | Softmax gradient ∂p/∂z | Transformer training |
| Normalization | ∂BN/∂x, ∂BN/∂γ, ∂BN/∂β | Batch/Layer/RMSNorm backprop |
| Variational inference | ELBO gradient via reparameterization trick | VAEs, Bayesian neural nets |
| Policy gradients | ∇log π(a|s) Q(s,a) | REINFORCE, PPO, A2C |
| Adversarial attacks | ∇ₓ L(f(x), y) | FGSM, PGD, adversarial training |
