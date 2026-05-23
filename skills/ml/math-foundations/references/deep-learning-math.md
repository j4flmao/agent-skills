# Deep Learning Mathematics

## Backpropagation — Full Derivation

### Scalar Chain Rule

For f = g(h(x)):
df/dx = (dg/dh)(dh/dx)

### Vector Chain Rule

For f: ℝᵐ → ℝⁿ → ℝ (scalar output):
∂f/∂x = (∂h/∂x)ᵀ · (∂f/∂h)
where ∂h/∂x is Jacobian matrix (n×m), ∂f/∂h is gradient vector (n×1)

### Computation Graph

nodes = tensors, edges = operations
Forward pass: compute and cache all intermediate values
Backward pass: traverse graph in reverse, apply chain rule at each node

### Fully Connected Layer

h = Wx + b, L = loss(h, y)

∂L/∂W = (∂L/∂h)·xᵀ    (outer product of gradient and input)
∂L/∂b = ∂L/∂h            (gradient passes through directly)
∂L/∂x = Wᵀ·(∂L/∂h)      (backprop to earlier layer)

### Full Backprop Algorithm

For each layer l = L, L-1, ..., 1:
  g_W[l] = a[l-1]ᵀ · δ[l]     (weight gradient = outer product)
  g_b[l] = δ[l]                  (bias gradient)
  δ[l-1] = (W[l]ᵀ · δ[l]) ⊙ f'(z[l-1])  (error backprop)

where δ[l] = ∂L/∂z[l], a[l] = activation(z[l]), f' is activation derivative

### Backprop from Scratch

```python
import numpy as np

def mse_loss(y_true, y_pred):
    return 0.5 * np.mean((y_true - y_pred) ** 2)

def mse_grad(y_true, y_pred):
    return (y_pred - y_true) / y_true.size

class Layer:
    def __init__(self, n_in, n_out):
        self.W = np.random.randn(n_in, n_out) * np.sqrt(2.0 / n_in)
        self.b = np.zeros((1, n_out))
        self.x = None
        self.z = None

    def forward(self, x):
        self.x = x
        self.z = x @ self.W + self.b
        return self.z

    def backward(self, dL_dz, lr=0.01):
        dL_dW = self.x.T @ dL_dz
        dL_db = dL_dz.sum(axis=0, keepdims=True)
        dL_dx = dL_dz @ self.W.T
        self.W -= lr * dL_dW
        self.b -= lr * dL_db
        return dL_dx

class ReLU:
    def forward(self, z):
        self.a = np.maximum(0, z)
        return self.a

    def backward(self, dL_da):
        return dL_da * (self.a > 0).astype(float)

class Softmax:
    def forward(self, z):
        e_z = np.exp(z - z.max(axis=1, keepdims=True))
        self.a = e_z / e_z.sum(axis=1, keepdims=True)
        return self.a

    def backward(self, dL_da):
        # Simplified: assumes cross-entropy loss combined with softmax
        return dL_da

class MLP:
    def __init__(self, dims):
        self.layers = [Layer(dims[i], dims[i+1]) for i in range(len(dims)-1)]
        self.acts = [ReLU() for _ in range(len(dims)-2)] + [Softmax()]

    def forward(self, x):
        for layer, act in zip(self.layers, self.acts):
            z = layer.forward(x)
            x = act.forward(z)
        return x

    def backward(self, dL_da, lr=0.01):
        for layer, act in reversed(list(zip(self.layers, self.acts))):
            dL_dz = act.backward(dL_da)
            dL_da = layer.backward(dL_dz, lr)

    def train_step(self, x, y, lr=0.01):
        y_pred = self.forward(x)
        loss = mse_loss(y, y_pred)
        grad = mse_grad(y, y_pred)
        self.backward(grad, lr)
        return loss
```

## Convolutional Neural Networks (CNN) Math

### Convolution as Matrix Multiply (im2col)

Input: (C_in, H, W), Filter: (C_out, C_in, K, K)
im2col: unfold input patches into columns → matrix of shape (C_in·K·K, H_out·W_out)
Filter matrix: (C_out, C_in·K·K)
Output = filter_matrix @ im2col_matrix → (C_out, H_out·W_out)
Memory cost: im2col is ~K²× larger than input (trade memory for speed)

### Backward Through Conv

∂L/∂W = input_patchesᵀ · ∂L/∂output (same pattern as FC)
∂L/∂input = col2im(Wᵀ · ∂L/∂output) (reverse im2col)

### Output Size

H_out = ⌊(H + 2P - K)/S⌋ + 1
W_out = ⌊(W + 2P - K)/S⌋ + 1
where P = padding, S = stride, K = kernel size

### Receptive Field

RF_l = RF_{l-1} + (K_l - 1)·∏_{i<l} S_i
Dilated conv: K_eff = K + (K-1)(d-1) where d = dilation rate

```python
import numpy as np

def im2col(img, K, S=1, P=0):
    C, H, W = img.shape
    H_out = (H + 2*P - K) // S + 1
    W_out = (W + 2*P - K) // S + 1
    img_pad = np.pad(img, ((0,0),(P,P),(P,P)), mode='constant')
    cols = np.zeros((C*K*K, H_out*W_out))
    for h in range(H_out):
        for w in range(W_out):
            patch = img_pad[:, h*S:h*S+K, w*S:w*S+K].reshape(-1)
            cols[:, h*W_out + w] = patch
    return cols

def conv_forward(img, filters, bias, S=1, P=0):
    C_out, C_in, K, _ = filters.shape
    C, H, W = img.shape
    H_out = (H + 2*P - K) // S + 1
    W_out = (W + 2*P - K) // S + 1
    cols = im2col(img, K, S, P)
    W_flat = filters.reshape(C_out, -1)
    out = W_flat @ cols + bias.reshape(-1, 1)
    return out.reshape(C_out, H_out, W_out)

def conv_backward(dout, img, filters, S=1, P=0):
    C_out, C_in, K, _ = filters.shape
    cols = im2col(img, K, S, P)
    dW_flat = dout.reshape(C_out, -1) @ cols.T
    dW = dW_flat.reshape(C_out, C_in, K, K)
    W_flat = filters.reshape(C_out, -1)
    dcol = W_flat.T @ dout.reshape(C_out, -1)
    dcol = dcol.reshape(C_in*K*K, -1)
    # col2im: scatter-add patches back to original positions
    dimg = np.zeros_like(img)
    H, W = img.shape[1:]
    H_out = dout.shape[1]
    W_out = dout.shape[2]
    for h in range(H_out):
        for w in range(W_out):
            patch = dcol[:, h*W_out + w].reshape(C_in, K, K)
            dimg[:, h*S:h*S+K, w*S:w*S+K] += patch
    return dW, dimg
```

## Recurrent Neural Networks (RNN) Math

### Vanilla RNN

h_t = tanh(W_hh·h_{t-1} + W_xh·x_t + b_h)
y_t = W_hy·h_t + b_y

### Backpropagation Through Time (BPTT)

Unroll RNN for T steps, treat as T-layer feedforward network with shared weights

∂L/∂W_hh = Σ_{t=1}^{T} Σ_{k=1}^{t} (∂L_t/∂h_t)·(∂h_t/∂h_k)·(∂h_k/∂W_hh)

### Vanishing Gradient Problem

∂h_t/∂h_k = ∏_{i=k+1}^{t} diag(f'(h_i))·W_hh

If ‖W_hh‖ < 1: product → 0 exponentially with depth → vanishing
If ‖W_hh‖ > 1: product → ∞ → exploding

### Gradient Clipping

ĝ = g · min(1, θ/‖g‖) where θ is the clip threshold
Preserves direction, caps magnitude. Standard remedy for exploding gradients.

## LSTM — Long Short-Term Memory

### Gates

f_t = σ(W_f·[h_{t-1}, x_t] + b_f)    (forget gate)
i_t = σ(W_i·[h_{t-1}, x_t] + b_i)    (input gate)
o_t = σ(W_o·[h_{t-1}, x_t] + b_o)    (output gate)
c̃_t = tanh(W_c·[h_{t-1}, x_t] + b_c) (candidate cell)

### Cell State and Hidden State

c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t    (cell state update)
h_t = o_t ⊙ tanh(c_t)                 (hidden state)

### Gradient Flow Advantage

∂c_t/∂c_{t-1} = f_t (approximately)
If f_t ≈ 1, gradient flows through cell state without vanishing
This is the key innovation: additive gradient path bypasses the vanishing product issue

### GRU (Gated Recurrent Unit)

z_t = σ(W_z·[h_{t-1}, x_t])         (update gate)
r_t = σ(W_r·[h_{t-1}, x_t])         (reset gate)
h̃_t = tanh(W_h·[r_t ⊙ h_{t-1}, x_t])
h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t

Fewer gates than LSTM (no separate output gate, no cell state). Comparable performance in many tasks.

```python
import numpy as np

class LSTMCell:
    def __init__(self, input_size, hidden_size):
        self.hidden_size = hidden_size
        # Concatenated weight matrices for all gates
        self.W = np.random.randn(input_size + hidden_size, 4 * hidden_size) * 0.01
        self.b = np.zeros((1, 4 * hidden_size))

    def forward(self, x, h_prev, c_prev):
        concat = np.hstack([h_prev, x])
        gates = concat @ self.W + self.b
        f, i, o, c_tilde = np.split(gates, 4, axis=1)
        f = 1 / (1 + np.exp(-f))
        i = 1 / (1 + np.exp(-i))
        o = 1 / (1 + np.exp(-o))
        c_tilde = np.tanh(c_tilde)
        c = f * c_prev + i * c_tilde
        h = o * np.tanh(c)
        return h, c

    def backward(self, dh, dc_next, cache):
        x, h_prev, c_prev, f, i, o, c_tilde, c, h = cache
        concat = np.hstack([h_prev, x])
        do = dh * np.tanh(c)
        dc = dh * o * (1 - np.tanh(c)**2) + dc_next
        df = dc * c_prev * f * (1 - f)
        di = dc * c_tilde * i * (1 - i)
        dc_tilde = dc * i * (1 - c_tilde**2)
        dgates = np.hstack([df, di, do, dc_tilde])
        dW = concat.T @ dgates
        db = dgates.sum(axis=0, keepdims=True)
        dconcat = dgates @ self.W.T
        dx = dconcat[:, self.hidden_size:]
        dh_prev = dconcat[:, :self.hidden_size]
        return dx, dh_prev, df * c_prev

    def update(self, dW, db, lr=0.01):
        self.W -= lr * dW
        self.b -= lr * db
```

## Transformer Math

### Scaled Dot-Product Attention

Attention(Q, K, V) = softmax(QKᵀ/√d_k)V

Q = XW_Q, K = XW_K, V = XW_V   (Q,K,V ∈ ℝ^{n×d_k})

QKᵀ/√d_k: pairwise similarity scores scaled by 1/√d_k (prevents softmax saturation)
Scale factor: 𝕍[q·k] ≈ d_k, so scaling ensures variance ≈ 1
For large d_k, unnormalized scores push softmax into regions with tiny gradients

### Multi-Head Attention

head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)
MultiHead(Q, K, V) = Concat(head₁,...,head_h)W^O

Each head attends to different representation subspaces

### Self-Attention Computational Cost

Time: O(n²·d_k) — quadratic in sequence length n
Memory: O(n²) — store attention matrix for backprop
Linear attention: approximate softmax with kernel feature maps → O(n·d²)

### Attention Forward and Backward

```python
import numpy as np

def attention_forward(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    # Stable softmax
    scores -= scores.max(axis=-1, keepdims=True)
    attn = np.exp(scores)
    attn /= attn.sum(axis=-1, keepdims=True)
    out = attn @ V
    cache = (Q, K, V, attn)
    return out, cache

def attention_backward(dout, cache):
    Q, K, V, attn = cache
    d_k = Q.shape[-1]
    dV = attn.T @ dout
    dattn = dout @ V.T
    # Softmax backward
    dscores = attn * (dattn - (dattn * attn).sum(axis=-1, keepdims=True))
    dscores /= np.sqrt(d_k)
    dQ = dscores @ K
    dK = dscores.T @ Q
    return dQ, dK, dV

def mha_forward(X, W_Q, W_K, W_V, W_O, h):
    n, d = X.shape
    d_k = d // h
    Q = X @ W_Q
    K = X @ W_K
    V = X @ W_V
    # Split into h heads
    Q = Q.reshape(n, h, d_k).transpose(1, 0, 2)
    K = K.reshape(n, h, d_k).transpose(1, 0, 2)
    V = V.reshape(n, h, d_k).transpose(1, 0, 2)
    heads_out = []
    for i in range(h):
        out, _ = attention_forward(Q[i], K[i], V[i])
        heads_out.append(out)
    concat = np.concatenate(heads_out, axis=-1)
    return concat @ W_O
```

### KV Cache (Inference Optimization)

For autoregressive generation, cache K and V from previous tokens:

K_cache = Concat(K_prev, K_new)
V_cache = Concat(V_prev, V_new)

Only compute attention for new token with full cache
Reduces per-token compute from O(n²) to O(n)

```python
def kv_cache_decode(x, W_Q, W_K, W_V, W_O, K_cache, V_cache):
    q = x @ W_Q
    k = x @ W_K
    v = x @ W_V
    K_cache = np.vstack([K_cache, k]) if K_cache is not None else k
    V_cache = np.vstack([V_cache, v]) if V_cache is not None else v
    d_k = q.shape[-1]
    scores = q @ K_cache.T / np.sqrt(d_k)
    scores -= scores.max(axis=-1, keepdims=True)
    attn = np.exp(scores) / np.exp(scores).sum(axis=-1, keepdims=True)
    out = attn @ V_cache
    return out @ W_O, K_cache, V_cache
```

### Flash Attention (I/O-Aware)

Tile Q, K, V into blocks that fit in SRAM
Online softmax: compute softmax incrementally without materializing full attention matrix
Skip backward pass recomputation by recomputing attention from SRAM
2-4× faster, memory linear in n instead of quadratic (from O(n²) to O(n))

```python
def flash_attention_forward(Q, K, V, block_size=128):
    n, d_k = Q.shape
    out = np.zeros_like(Q)
    for i in range(0, n, block_size):
        Qi = Q[i:i+block_size]
        mi = np.full(Qi.shape[0], -np.inf)
        li = np.zeros(Qi.shape[0])
        Oi = np.zeros_like(Qi)
        for j in range(0, n, block_size):
            Kj = K[j:j+block_size]
            Vj = V[j:j+block_size]
            Sij = Qi @ Kj.T / np.sqrt(d_k)
            mij = np.maximum(mi, Sij.max(axis=1))
            Pij = np.exp(Sij - mij[:, None])
            li = li * np.exp(mi - mij) + Pij.sum(axis=1)
            Oi = Oi * np.exp(mi - mij)[:, None] + Pij @ Vj
            mi = mij
        out[i:i+block_size] = Oi / li[:, None]
    return out
```

### Positional Encodings

#### Sinusoidal (Original Transformer)

PE(pos, 2i) = sin(pos/10000^{2i/d_model})
PE(pos, 2i+1) = cos(pos/10000^{2i/d_model})

Each dimension has a different frequency; model can learn relative positions via linear combinations

```python
def sinusoidal_pe(max_len, d_model):
    pe = np.zeros((max_len, d_model))
    pos = np.arange(max_len)[:, None]
    div = 10000 ** (np.arange(0, d_model, 2) / d_model)
    pe[:, 0::2] = np.sin(pos / div)
    pe[:, 1::2] = np.cos(pos / div)
    return pe
```

#### RoPE (Rotary Position Embedding)

Rotate Q and K by angle proportional to position:
(R_Θ,q) · (R_Θ,k) = qᵀR_ΘᵀR_Θk = qᵀR_Θk

where R_Θ is block-diagonal rotation matrix
R_Θ(q)·R_Θ(k) = q·k + Σ_{m=1}^{d/2} (q_{2m}k_{2m+1} - q_{2m+1}k_{2m})(θ_m)
Relative position encoding built in: dot product depends only on relative position

```python
def apply_rope(x, theta_base=10000.0):
    d = x.shape[-1]
    freqs = theta_base ** (-np.arange(0, d, 2) / d)
    pos = np.arange(x.shape[-2])[:, None]
    angles = pos * freqs[None, :]
    cos = np.cos(angles)
    sin = np.sin(angles)
    x_rot = np.zeros_like(x)
    x_rot[..., 0::2] = x[..., 0::2] * cos - x[..., 1::2] * sin
    x_rot[..., 1::2] = x[..., 0::2] * sin + x[..., 1::2] * cos
    return x_rot
```

#### ALiBi (Attention with Linear Biases)

Attention(Q, K, V) = softmax(QKᵀ/√d + m·B)V

B = matrix with -|i-j|·m (linear bias for distance)
No learned positional embeddings, simpler, extrapolates to longer sequences

### Grouped-Query Attention (GQA)

Intermediate between MHA (h key-value heads) and MQA (1 key-value head)
Use g groups of query heads sharing one key-value head
Performance close to MHA, speed close to MQA
Used in LLaMA 2/3, Mistral

### Multi-Query Attention (MQA)

All query heads share single K,V head (K,V ∈ ℝ^{1×d_k})
Much faster KV cache, small quality degradation vs MHA

### Transformer Feed-Forward (FFN)

FFN(x) = W₂·ReLU(W₁·x + b₁) + b₂  (original)
SwiGLU(x) = W₂·(SiLU(W₁·x) ⊙ W₃·x)  (modern, used in LLaMA)
GLU variants multiply a gated signal: output = gate ⊙ value

### LayerNorm Placement

Original (Post-LN): LayerNorm(x + Sublayer(x)) — harder to train, requires warmup
Pre-LN: x + Sublayer(LayerNorm(x)) — more stable, no warmup needed
Sandwich Norm: LayerNorm(x) + Sublayer(x) — used in some architectures

## Normalization Techniques

### Batch Normalization (BatchNorm)

μ_B = (1/m)Σxᵢ, σ²_B = (1/m)Σ(xᵢ - μ_B)²    (mini-batch statistics)
x̂ᵢ = (xᵢ - μ_B)/√(σ²_B + ε)                     (normalize)
yᵢ = γx̂ᵢ + β                                      (scale and shift)

Inference: use running mean/variance instead of batch statistics
Gradient: ∂L/∂xᵢ = (1/m·γ/σ)·(m·δ - Σδ - x̂·Σδ·x̂)  (complex dependency through μ,σ)

```python
class BatchNorm:
    def __init__(self, d, eps=1e-5, momentum=0.9):
        self.gamma = np.ones((1, d))
        self.beta = np.zeros((1, d))
        self.eps = eps
        self.momentum = momentum
        self.running_mean = np.zeros((1, d))
        self.running_var = np.ones((1, d))

    def forward(self, x, training=True):
        if training:
            mu = x.mean(axis=0, keepdims=True)
            var = x.var(axis=0, keepdims=True)
            self.running_mean = self.momentum * self.running_mean + (1 - self.momentum) * mu
            self.running_var = self.momentum * self.running_var + (1 - self.momentum) * var
        else:
            mu = self.running_mean
            var = self.running_var
        x_norm = (x - mu) / np.sqrt(var + self.eps)
        return self.gamma * x_norm + self.beta

    def backward(self, dL_dy, x, mu, var, x_norm):
        m = x.shape[0]
        sigma = np.sqrt(var + self.eps)
        dL_dgamma = (dL_dy * x_norm).sum(axis=0, keepdims=True)
        dL_dbeta = dL_dy.sum(axis=0, keepdims=True)
        dL_dxnorm = dL_dy * self.gamma
        dL_dvar = (dL_dxnorm * (x - mu) * -0.5 * sigma**-3).sum(axis=0, keepdims=True)
        dL_dmu = (dL_dxnorm * -1 / sigma).sum(axis=0, keepdims=True) + dL_dvar * (-2 * (x - mu)).mean(axis=0, keepdims=True)
        dL_dx = dL_dxnorm / sigma + dL_dvar * 2 * (x - mu) / m + dL_dmu / m
        return dL_dx, dL_dgamma, dL_dbeta
```

### Layer Normalization (LayerNorm)

μ_L = (1/d)Σ_{j=1}^{d} xⱼ, σ²_L = (1/d)Σ(xⱼ - μ_L)²   (per sample)
x̂ⱼ = (xⱼ - μ_L)/√(σ²_L + ε)
yⱼ = γx̂ⱼ + β

Applied in Transformers (layer norm before/after attention)
Independent of batch size, same at train and inference

```python
class LayerNorm:
    def __init__(self, d, eps=1e-5):
        self.gamma = np.ones((1, d))
        self.beta = np.zeros((1, d))
        self.eps = eps

    def forward(self, x):
        mu = x.mean(axis=-1, keepdims=True)
        var = x.var(axis=-1, keepdims=True)
        self.x_norm = (x - mu) / np.sqrt(var + self.eps)
        self.std = np.sqrt(var + self.eps)
        return self.gamma * self.x_norm + self.beta

    def backward(self, dL_dy, x):
        dL_dgamma = (dL_dy * self.x_norm).sum(axis=0, keepdims=True)
        dL_dbeta = dL_dy.sum(axis=0, keepdims=True)
        dL_dxnorm = dL_dy * self.gamma
        d = x.shape[-1]
        # Derivation: ∂LN/∂x = (1/σ)(I - 11ᵀ/d - x̂x̂ᵀ/d)
        mean_xnorm = self.x_norm.mean(axis=-1, keepdims=True)
        dL_dx = (1.0 / self.std) * (
            dL_dxnorm
            - dL_dxnorm.mean(axis=-1, keepdims=True)
            - self.x_norm * (dL_dxnorm * self.x_norm).mean(axis=-1, keepdims=True)
        )
        return dL_dx, dL_dgamma, dL_dbeta
```

### RMS Norm

RMS(x) = √((1/d)Σxⱼ²), x̂ⱼ = xⱼ/RMS(x)
Simplified LayerNorm (no mean subtraction), faster to compute
Used in LLaMA, Gemma

```python
class RMSNorm:
    def __init__(self, d, eps=1e-5):
        self.gamma = np.ones((1, d))
        self.eps = eps

    def forward(self, x):
        rms = np.sqrt((x**2).mean(axis=-1, keepdims=True) + self.eps)
        return self.gamma * x / rms
```

### Group Normalization

Split channels into G groups, normalize within each group
G = 1 → LayerNorm, G = C → InstanceNorm
Useful when batch size is small (e.g., video, segmentation)

## Initialization Methods

### Xavier/Glorot Initialization

W ∼ Uniform(-√(6/(n_in + n_out)), √(6/(n_in + n_out)))
or W ∼ 𝒩(0, √(2/(n_in + n_out)))

Goal: maintain variance of activations and gradients across layers
Derivation: Var(y) = n_in·Var(W)·Var(x), want Var(y) = Var(x)

### He/Kaiming Initialization (for ReLU)

W ∼ 𝒩(0, √(2/n_in))

Factor of 2 compensates for ReLU zeroing half the activations
W ∼ Uniform(-√(6/n_in), √(6/n_in))

Goal: Var(y) = Var(x) given ReLU non-linearity

```python
def init_xavier(n_in, n_out):
    limit = np.sqrt(6.0 / (n_in + n_out))
    return np.random.uniform(-limit, limit, (n_in, n_out))

def init_he(n_in, n_out):
    std = np.sqrt(2.0 / n_in)
    return np.random.randn(n_in, n_out) * std

def init_orthogonal(n_in, n_out):
    W = np.random.randn(n_in, n_out)
    Q, R = np.linalg.qr(W)
    # Correct sign for near-square case
    return Q * np.sqrt(n_out / n_in)
```

### Orthogonal Initialization

W = Q where Q is random orthogonal matrix (QQᵀ = I)
Eigenvalues of W all have magnitude 1 → gradient flow neither vanishes nor explodes

### Bias Initialization

Zero initialization for biases: b = 0 (always)
Bias initialization for RNN/LSTM gates: forget gate bias b_f = 1 (close to 1 at init, preserves long-term memory)

## GELU and Modern Activations

### GELU (Gaussian Error Linear Unit)

GELU(x) = x·Φ(x) where Φ is standard Normal CDF
≈ 0.5x(1 + tanh(√(2/π)(x + 0.044715x³)))   (approximation for computation)
Smooth version of ReLU, used in BERT, GPT, ViT
GELU'(x) ≈ Φ(x) + x·𝒩(x;0,1)

```python
def gelu(x):
    return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x**3)))

def gelu_grad(x):
    tanh_in = np.sqrt(2 / np.pi) * (x + 0.044715 * x**3)
    tanh_val = np.tanh(tanh_in)
    sech2 = 1 - tanh_val**2
    dtanh_dx = np.sqrt(2 / np.pi) * (1 + 3 * 0.044715 * x**2)
    return 0.5 * (1 + tanh_val) + 0.5 * x * sech2 * dtanh_dx
```

### Swish / SiLU (Sigmoid Linear Unit)

Swish(x) = x·σ(x) = x/(1 + e^{-x})
Swish'(x) = σ(x) + x·σ(x)·(1-σ(x)) = Swish(x) + σ(x)(1 - Swish(x))
Unbounded above, bounded below, non-monotonic

### Mish

Mish(x) = x·tanh(softplus(x)) = x·tanh(ln(1 + e^x))
Self-gated, smooth, slightly better than Swish in some benchmarks

### Activation Derivatives Reference

| Activation | Derivative |
|---|---|
| sigmoid | σ(x)(1-σ(x)) |
| tanh | 1 - tanh²(x) |
| ReLU | 1 if x > 0, 0 if x ≤ 0 |
| Leaky ReLU | 1 if x > 0, α if x ≤ 0 |
| ELU | 1 if x > 0, αe^x if x ≤ 0 |
| GELU | Φ(x) + x·𝒩(x;0,1) |
| Swish | σ(x) + x·σ(x)(1-σ(x)) |
| Softplus | σ(x) |

## Loss Functions

### Cross-Entropy Loss

L_CE(y, p) = -Σᵢ yᵢ log(pᵢ)
∂L/∂z = p - y  (combined softmax + cross-entropy gradient — elegantly simple)

### Binary Cross-Entropy

L_BCE(y, p) = -y log(p) - (1-y) log(1-p)
∂L/∂z = p - y  (combined sigmoid + BCE)

### KL Divergence

D_KL(P‖Q) = Σ P(x) log(P(x)/Q(x))
Connection: cross-entropy = H(P) + D_KL(P‖Q)
Used in distillation: minimize KL(teacher‖student)

### Contrastive Loss (InfoNCE)

L = -log( exp(sim(q,k⁺)/τ) / Σᵢ exp(sim(q,kᵢ)/τ) )
Gradient pushes q toward positive key, away from negatives
Connection: InfoNCE lower-bounds mutual information I(q,k)

## Loss Surface Geometry

### Sharp vs Flat Minima

Sharp: high curvature (large eigenvalues of Hessian), sensitive to parameter changes
Flat: low curvature, better generalization
Connection: SGD prefers flat minima, large batch SGD can converge to sharp minima

### Hessian and Curvature

H = ∇²L = ∂²L/∂θ²
For a minimum: H must be positive semidefinite (all eigenvalues ≥ 0)
Condition number: κ = λ_max/λ_min — high κ means ill-conditioned optimization

### Neural Tangent Kernel (NTK)

In infinite-width limit, neural network training dynamics are linearized around initialization

K(x,x') = 𝔼[⟨∇_θf(x;θ₀), ∇_θf(x';θ₀)⟩] (kernel defined by gradient features)

Training under MSE: f_t ≈ K·(I - e^{-ηKt})·y (closed form in kernel regime)
Width → ∞: NN becomes Gaussian process

### Linear Regime of Training

For large width, during training:
f_t(x) ≈ f_0(x) - Σ K(x, xᵢ)(K^{-1}(I - e^{-ηKt})y)ᵢ
Kernel remains approximately constant throughout training (lazy training)

## Optimization Algorithms

### Stochastic Gradient Descent (SGD)

θ_{t+1} = θ_t - η·∇L(θ_t)
Convergence rate: O(1/T) for convex, O(1/√T) for nonconvex

### SGD with Momentum

v_{t+1} = βv_t + ∇L(θ_t)
θ_{t+1} = θ_t - ηv_{t+1}
Accelerates along low-curvature directions, dampens oscillations

### Adam (Adaptive Moment Estimation)

m_t = β₁m_{t-1} + (1-β₁)g_t          (biased first moment)
v_t = β₂v_{t-1} + (1-β₂)g_t²         (biased second moment)
m̂_t = m_t / (1 - β₁ᵗ)                 (bias correction)
v̂_t = v_t / (1 - β₂ᵗ)
θ_{t+1} = θ_t - η·m̂_t/(√v̂_t + ε)

Per-parameter adaptive learning rate. Effective in practice despite not converging in some cases.

### AdamW (Adam with Decoupled Weight Decay)

θ_{t+1} = θ_t - η(m̂_t/(√v̂_t + ε) + λθ_t)
Weight decay applied separately from adaptive gradient, unlike L2 in Adam

### Learning Rate Schedules

| Schedule | Formula | Use Case |
|---|---|---|
| Constant | η_t = η₀ | Simple baseline |
| Step decay | η_t = η₀·γ^{⌊t/T⌋} | CNNs, standard practice |
| Cosine | η_t = ½η₀(1 + cos(tπ/T)) | Transformers, modern practice |
| Inverse sqrt | η_t = η₀/√t | RL, some NLP tasks |
| Warmup + decay | η_t = η₀·t/T_warm for t<T_warm, then decay | Transformers, Adam |

### Gradient Descent Variants

| Method | Update | Key Property |
|---|---|---|
| SGD | θ - ηg | Simple, generalizes well |
| Momentum | θ - ηv | Dampens oscillations |
| Nesterov | look-ahead gradient | Better convergence bound |
| AdaGrad | ηg/(√G + ε) | Adaptive, suitable for sparse |
| RMSProp | ηg/(√v + ε) | Fixes AdaGrad aggressive decay |
| Adam | ηm̂/(√v̂ + ε) | Combines momentum + adaptive |
| AdamW | Adam + decoupled decay | Better tuned weight decay |

### Learning Rate Warmup

Essential for Transformer training. Prevents early training instability:
- Initialize Adam with large v_t (second moment estimate is small)
- Without warmup: large effective updates early in training
- Linear warmup: η_t = η₀·t/T_warm for first T_warm steps
- After warmup: cosine decay or step decay

### Gradient Accumulation

Simulate larger batch size by accumulating gradients over micro-batches:
θ_{t+1} = θ_t - η·(1/N)Σ_{i=1}^{N} ∇L_i(θ_t)
Used when batch size is limited by GPU memory. Equivalent to single batch of size N·batch_per_gpu.

## Regularization Techniques

### Dropout

During training: r ∼ Bernoulli(p), y = r ⊙ a / p
During inference: no dropout, y = a
Forward pass expectation: 𝔼[r ⊙ a/p] = a (unbiased at inference)
Effect: prevents co-adaptation of neurons, approximates model averaging

```python
class Dropout:
    def __init__(self, rate=0.5):
        self.rate = rate

    def forward(self, x, training=True):
        if training:
            mask = np.random.binomial(1, 1-self.rate, x.shape) / (1-self.rate)
            self.mask = mask
            return x * mask
        return x

    def backward(self, dL_dy):
        return dL_dy * self.mask
```

### Label Smoothing

y_smooth = (1 - ε)·y_onehot + ε/K  where K = number of classes
Prevents overconfidence, improves calibration

### Weight Decay

L_reg = L + (λ/2)‖W‖²
Gradient: g_W = g_loss + λW
Effectively: W_{t+1} = W_t(1 - ηλ) - ηg_loss  (shrinkage each step)

## Distillation and Quantization Math

### Knowledge Distillation

L = α·L_CE(y, p_teacher) + (1-α)·L_CE(p_teacher/T, p_student/T)·T²

Temperature T: soften distributions (high T → softer)
Teacher provides richer signal than hard labels

```python
def distill_loss(student_logits, teacher_logits, labels, T=4.0, alpha=0.7):
    soft_targets = teacher_logits / T
    soft_targets = np.exp(soft_targets - soft_targets.max(axis=1, keepdims=True))
    soft_targets /= soft_targets.sum(axis=1, keepdims=True)
    student_soft = student_logits / T
    student_soft = np.exp(student_soft - student_soft.max(axis=1, keepdims=True))
    student_soft /= student_soft.sum(axis=1, keepdims=True)
    kl_loss = (soft_targets * np.log(soft_targets / (student_soft + 1e-10))).sum(axis=1).mean()
    # Hard label CE
    n = student_logits.shape[0]
    log_probs = student_logits - student_logits.max(axis=1, keepdims=True)
    log_probs -= np.log(np.exp(log_probs).sum(axis=1, keepdims=True))
    ce_loss = -log_probs[np.arange(n), labels.ravel()].mean()
    return alpha * ce_loss + (1 - alpha) * kl_loss * T**2
```

### Quantization

x_q = round(x/s) - z  where s = (x_max - x_min)/(2^b - 1), z = zero-point
Dequantize: x̂ = (x_q + z)·s
Quantization error: 𝔼[(x - x̂)²] ≈ s²/12 (uniform quantization)

```python
def quantize(x, bits=8):
    x_min, x_max = x.min(), x.max()
    s = (x_max - x_min) / (2**bits - 1)
    z = round(-x_min / s)
    x_q = np.round(x / s + z).clip(0, 2**bits - 1).astype(np.uint8)
    return x_q, s, z

def dequantize(x_q, s, z):
    return (x_q.astype(float) - z) * s
```

### Mixed Precision Training

FP16 weights, FP32 master copy, FP16 matmul with loss scaling

```python
def mixed_precision_step(model, x, y, loss_scaler=2**15):
    # Forward in FP16
    with np.errstate(over='raise'):
        y_pred = model.forward(x.astype(np.float16))
    loss = mse_loss(y.astype(np.float32), y_pred.astype(np.float32))
    # Scale loss to prevent underflow in FP16 gradients
    scaled_loss = loss * loss_scaler
    model.backward(scaled_loss.astype(np.float16))
    # Unscale gradients
    for layer in model.layers:
        layer.W_grad /= loss_scaler
        layer.b_grad /= loss_scaler
    return loss
```

## Normalization Comparison Summary

| Method | Normalizes | Statistics | Batch Dependent | Best For |
|---|---|---|---|---|
| BatchNorm | H,W | across batch | Yes | CNNs with large batch |
| LayerNorm | features | per sample | No | Transformers, RNNs |
| InstanceNorm | H,W | per channel per sample | No | Style transfer |
| GroupNorm | H,W in groups | per group per sample | No | Small batch video/segmentation |
| RMS Norm | features (no mean) | per sample | No | LLaMA, efficient Transformers |

## Common Pitfalls and Debugging

| Problem | Symptom | Likely Cause | Fix |
|---|---|---|---|
| Loss not decreasing | Loss flat | LR too small / init wrong | Increase LR, check init |
| Loss NaN | Loss → NaN | LR too large / numerical | Decrease LR, gradient clipping |
| Loss spikes | Sudden spikes | Exploding gradients | Clip gradients, reduce LR |
| Overfitting | Train ↓, val ↑ | Model too large | Add dropout, regularize |
| Mode collapse | All predictions same | Saturation / dying ReLU | Leaky ReLU, proper init |
| No learning | Loss constant | Wrong gradient / broken graph | Check backward pass numerically |

## Numerical Gradient Checking

```python
def grad_check(f, grad, x, eps=1e-5):
    numerical = np.zeros_like(x)
    for i in range(x.size):
        x_flat = x.ravel()
        x_flat[i] += eps
        loss_plus = f(x.reshape(x.shape))
        x_flat[i] -= 2*eps
        loss_minus = f(x.reshape(x.shape))
        x_flat[i] += eps
        numerical.ravel()[i] = (loss_plus - loss_minus) / (2*eps)
    diff = np.linalg.norm(grad - numerical) / (np.linalg.norm(grad) + np.linalg.norm(numerical))
    return diff  # Should be < 1e-7
```

## Key Formulas Reference

| Concept | Formula |
|---|---|
| Linear layer | h = Wx + b |
| Backprop gradient (weights) | ∂L/∂W = a_prevᵀδ |
| Backprop error signal | δ[l-1] = (W[l]ᵀ·δ[l]) ⊙ f'(z[l-1]) |
| Attention | softmax(QKᵀ/√d_k)V |
| Conv output size | ⌊(H + 2P - K)/S⌋ + 1 |
| BPTT | ∂L/∂W = Σ_tΣ_k(∂L_t/∂h_t)(∂h_t/∂h_k)(∂h_k/∂W) |
| LSTM cell | c_t = f_t⊙c_{t-1} + i_t⊙c̃_t |
| LayerNorm | (x - μ)/σ·γ + β |
| He init | W ∼ 𝒩(0, √(2/n_in)) |
| ADAM | θ_{t+1} = θ_t - η·m̂_t/(√v̂_t + ε) |
| Dropout | y = (r ⊙ a)/p, r∼Bernoulli(p) |
| Label smoothing | y_smooth = (1-ε)y + ε/K |
| Distillation | L = αCE(y, p_T) + (1-α)KL(p_T/T‖p_S/T)·T² |
| Quantization | x_q = round(x/s)-z, s = (x_max-x_min)/(2^b-1) |
