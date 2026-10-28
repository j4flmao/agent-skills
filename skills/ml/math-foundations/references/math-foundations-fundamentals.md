# Floating-Point Arithmetic and Numerical Precision for ML

How numbers are represented on hardware, where precision is lost, and the stable formulations ML code relies on (log-sum-exp, stable sigmoid/BCE, Welford variance, compensated summation, mixed precision). Many "NaN loss" and "results differ between runs" problems trace back to these fundamentals.

## Formats

| Format | Sign/exponent/mantissa bits | Machine epsilon (2^-mantissa) | Max finite | Typical use |
|---|---|---|---|---|
| FP64 | 1 / 11 / 52 | ≈ 2.2e-16 | ≈ 1.8e308 | Scientific computing, gradient checks |
| FP32 | 1 / 8 / 23 | ≈ 1.19e-7 | ≈ 3.4e38 | Default training precision, master weights |
| TF32 (tensor cores) | 1 / 8 / 10 | ≈ 9.8e-4 | ≈ 3.4e38 | Matmul inputs on NVIDIA Ampere+ when enabled |
| BF16 | 1 / 8 / 7 | ≈ 7.8e-3 | ≈ 3.4e38 | Training/inference on modern accelerators |
| FP16 | 1 / 5 / 10 | ≈ 9.8e-4 | 65504 | Inference, training with loss scaling |
| FP8 E4M3 | 1 / 4 / 3 | 0.125 | 448 | Forward activations/weights on FP8-capable hardware |
| FP8 E5M2 | 1 / 5 / 2 | 0.25 | 57344 | Gradients (more range, less precision) |

Key distinctions:
- BF16 has FP32's range but very low precision: overflow is rare, rounding error is large.
- FP16 has more precision than BF16 but tiny range: small gradients underflow to zero, large activations overflow to `inf`.
- Relative spacing between representable numbers is roughly epsilon × |x|: adding a small number to a large one can do nothing.

```python
import numpy as np

np.float32(1.0) + np.float32(1e-8) == np.float32(1.0)    # True: increment below FP32 resolution
np.finfo(np.float16).max, np.finfo(np.float32).eps        # (65504.0, 1.1920929e-07)
```

## Sources of Error

| Problem | Example | Remedy |
|---|---|---|
| Overflow | `exp(1000)` → `inf` | Shift by max (log-sum-exp), work in log space |
| Underflow | Product of many probabilities → 0 | Sum log-probabilities |
| Catastrophic cancellation | `1 - cos(x)` for small x; `E[x²] - E[x]²` | Algebraic reformulation, `expm1`, `log1p`, Welford |
| Absorption | Summing many small values into a large accumulator | Pairwise or Kahan summation, higher-precision accumulators |
| Non-associativity | `(a + b) + c != a + (b + c)` | Accept small differences; deterministic reduction order when reproducibility matters |

## Stable Formulations

Log-sum-exp:

```python
def logsumexp(x: np.ndarray) -> float:
    m = np.max(x)
    return float(m + np.log(np.sum(np.exp(x - m))))
```

Softmax: `softmax(x) = exp(x - max(x)) / sum(exp(x - max(x)))`; log-softmax as `x - logsumexp(x)`.

Sigmoid without overflow:

```python
def sigmoid(x: np.ndarray) -> np.ndarray:
    out = np.empty_like(x, dtype=np.float64)
    pos = x >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-x[pos]))
    ex = np.exp(x[~pos])
    out[~pos] = ex / (1.0 + ex)
    return out
```

Binary cross-entropy from logits z (never compute `log(sigmoid(z))` naively):

```
BCE(z, y) = max(z, 0) - z·y + log(1 + exp(-|z|))
```

This is what `torch.nn.functional.binary_cross_entropy_with_logits` and `tf.nn.sigmoid_cross_entropy_with_logits` implement; likewise use `cross_entropy` on logits rather than softmax + log.

Small-argument functions: `np.log1p(x)` for log(1 + x) and `np.expm1(x)` for exp(x) − 1 when |x| is small.

## Variance and Summation

Welford's online algorithm avoids cancellation in `E[x²] − E[x]²`:

```python
def welford(xs):
    n, mean, m2 = 0, 0.0, 0.0
    for x in xs:
        n += 1
        delta = x - mean
        mean += delta / n
        m2 += delta * (x - mean)
    return mean, (m2 / (n - 1) if n > 1 else float("nan"))
```

Kahan (compensated) summation keeps a running error term; NumPy's `sum` already uses pairwise summation, which bounds error growth to O(log n) · eps instead of O(n) · eps for naive loops. Accumulate reductions (sums, norms, softmax denominators) in FP32 even when inputs are BF16/FP16.

## Mixed Precision Training (PyTorch)

```python
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
use_fp16 = device.type == "cuda" and not torch.cuda.is_bf16_supported()
amp_dtype = torch.float16 if use_fp16 else torch.bfloat16
scaler = torch.amp.GradScaler(device.type, enabled=use_fp16)   # loss scaling only needed for FP16

for batch in loader:
    optimizer.zero_grad(set_to_none=True)
    with torch.autocast(device_type=device.type, dtype=amp_dtype):
        loss = model(batch["x"].to(device)).float().mean()
    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)                     # so clipping sees true gradient norms
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    scaler.step(optimizer)
    scaler.update()
```

- Autocast runs matmuls/convolutions in low precision and keeps precision-sensitive ops (reductions, softmax, losses) in FP32.
- Optimizer states and master weights stay FP32 (unless using specialized low-precision optimizers deliberately).
- Loss scaling multiplies the loss so FP16 gradients do not underflow; BF16 does not need it.
- TF32 for FP32 matmuls on NVIDIA: `torch.backends.cuda.matmul.allow_tf32` / `torch.set_float32_matmul_precision("high")` — faster, lower precision.

## Conditioning

The condition number κ(A) = ‖A‖‖A⁻¹‖ bounds how much relative input error can amplify in solving `Ax = b`: roughly, you lose log10(κ) digits. Practical consequences:
- Do not form `XᵀX` and invert it for least squares (squares the condition number); use QR, SVD or `np.linalg.lstsq`.
- Add regularization (ridge, jitter on covariance diagonals) to improve conditioning.
- Standardize features; badly scaled inputs produce ill-conditioned problems and slow optimization.

## Reproducibility

- GPU reductions with atomics may be nondeterministic because float addition is not associative.
- PyTorch: `torch.use_deterministic_algorithms(True)` (raises on ops without deterministic implementations), fixed seeds, and `CUBLAS_WORKSPACE_CONFIG=:4096:8` for deterministic cuBLAS on CUDA ≥ 10.2.
- Expect bitwise differences across hardware, library versions and batch sizes; compare results with tolerances (`torch.testing.assert_close`, `np.allclose` with explicit `rtol`/`atol`).

## Debugging NaN/Inf

| Check | Tool |
|---|---|
| Where NaN first appears | `torch.autograd.set_detect_anomaly(True)` (slow; debugging only) |
| Overflowing activations | Log max abs value per layer; look for FP16 values near 65504 |
| Exploding gradients | Gradient norm logging; clipping |
| log/sqrt/div of zero or negative | Add epsilons deliberately (`eps` sized for the dtype), clamp inputs |
| Learning rate too high | NaN after a few steps; reduce or warm up |

## Checklist
- [ ] Losses computed from logits with fused stable functions
- [ ] Reductions and accumulators in FP32 or higher
- [ ] BF16 preferred over FP16 where supported; GradScaler only for FP16
- [ ] Least squares via QR/SVD/lstsq, not normal-equation inversion
- [ ] Comparisons use explicit tolerances
- [ ] Determinism settings applied when reproducibility is required
