# Deep Learning Fundamentals

Core concepts needed to build and debug neural networks: tensors and autograd, layers and activations, initialization, normalization, loss functions, optimizers, regularization, and a correct PyTorch training loop. Architectures are covered in `architectures.md`; scaling and mixed precision in `training-optimization.md`.

## Tensors, Autograd and the Computational Graph

- A model is a differentiable function `f(x; θ)`. Training minimizes a loss `L(f(x; θ), y)` averaged over data with gradient-based optimization.
- PyTorch records operations on tensors with `requires_grad=True` and computes gradients by reverse-mode automatic differentiation (`loss.backward()`).
- Gradients accumulate in `.grad`; call `optimizer.zero_grad(set_to_none=True)` each step.

```python
import torch

w = torch.randn(3, requires_grad=True)
x = torch.tensor([1.0, 2.0, 3.0])
loss = (w @ x - 4.0) ** 2
loss.backward()
print(w.grad)          # d loss / d w = 2 * (w·x - 4) * x
```

## Layers

| Layer | Use | Key parameters |
|-------|-----|----------------|
| `nn.Linear` | Dense projection | in/out features |
| `nn.Conv2d` | Local spatial patterns, weight sharing | kernel size, stride, padding, channels |
| `nn.Embedding` | Map token IDs to vectors | vocabulary size, dimension |
| `nn.LSTM` / `nn.GRU` | Sequential state (now mostly replaced by attention for long sequences) | hidden size, layers |
| `nn.MultiheadAttention` / SDPA | Attention over sequences | heads, dimension |
| Pooling | Downsample, invariance | kernel, stride |

## Activations

| Activation | Formula / note | Typical use |
|------------|----------------|-------------|
| ReLU | `max(0, x)` | CNN default; can produce dead units |
| GELU | Smooth ReLU-like | Transformers |
| SiLU / Swish | `x * sigmoid(x)` | Modern CNNs, gated MLPs (SwiGLU) |
| Sigmoid | `1/(1+e^-x)` | Binary output probabilities, gates |
| Tanh | Range (-1, 1) | RNN states |
| Softmax | Normalizes logits to probabilities | Multi-class output (usually folded into the loss) |

## Initialization

- Poor initialization causes vanishing/exploding activations and gradients.
- Kaiming (He) initialization for ReLU-family layers, Xavier (Glorot) for tanh/sigmoid. PyTorch layers have sensible defaults; override for custom layers.
- Residual networks: zero-initialize or scale the last layer of each residual branch so blocks start near identity.

## Normalization

| Method | Normalizes over | Where |
|--------|-----------------|-------|
| BatchNorm | Batch (and spatial) dims per channel | CNNs with reasonable batch sizes; behaves differently in train vs eval |
| LayerNorm | Features per example | Transformers, RNNs |
| RMSNorm | Features, no mean subtraction | Many recent LLMs |
| GroupNorm | Channel groups per example | Small-batch vision |

Always call `model.train()` for training and `model.eval()` for evaluation; BatchNorm and Dropout depend on it.

## Loss Functions

| Task | Loss | PyTorch | Note |
|------|------|---------|------|
| Multi-class classification | Cross-entropy | `nn.CrossEntropyLoss` | Takes raw logits; supports `label_smoothing` |
| Binary / multi-label | Binary cross-entropy | `nn.BCEWithLogitsLoss` | Takes logits; `pos_weight` for imbalance |
| Regression | MSE / MAE / Huber | `nn.MSELoss`, `nn.L1Loss`, `nn.HuberLoss` | Huber is robust to outliers |
| Language modeling | Token-level cross-entropy | `CrossEntropyLoss(ignore_index=-100)` | Mask padding |
| Metric learning | Contrastive / triplet / InfoNCE | custom, `nn.TripletMarginLoss` | |

Do not apply softmax/sigmoid before the "with logits" losses; it breaks numerical stability.

## Optimizers and Learning Rate

| Optimizer | Notes |
|-----------|-------|
| SGD + momentum (0.9) | Strong for CNNs with a tuned schedule |
| AdamW | Default for transformers and most new work; decoupled weight decay |
| Adam | Weight decay implemented as L2 in gradients; prefer AdamW |

- Learning rate is the most important hyperparameter. Use warmup (linear for a few hundred to thousands of steps) followed by cosine or linear decay for transformers.
- Do not apply weight decay to biases and normalization parameters.
- Gradient clipping (`clip_grad_norm_(params, 1.0)`) stabilizes training of deep and recurrent models.

## Regularization

- Weight decay, dropout, data augmentation (images: random crops, flips, RandAugment; text: noise is task-specific), label smoothing, early stopping on validation metrics, and stochastic depth for deep residual nets.
- More data and better augmentation usually beat more regularization knobs.

## A Correct Training Loop

```python
import torch
from torch import nn
from torch.utils.data import DataLoader

device = (
    torch.device("cuda") if torch.cuda.is_available()
    else torch.device("mps") if torch.backends.mps.is_available()
    else torch.device("cpu")
)

model = MyModel().to(device)
decay, no_decay = [], []
for n, p in model.named_parameters():
    (no_decay if p.ndim < 2 else decay).append(p)
optimizer = torch.optim.AdamW(
    [{"params": decay, "weight_decay": 0.01}, {"params": no_decay, "weight_decay": 0.0}], lr=3e-4
)
scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=3e-4, total_steps=num_steps)
criterion = nn.CrossEntropyLoss()

for epoch in range(num_epochs):
    model.train()
    for x, y in train_loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)
        loss = criterion(model(x), y)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

    model.eval()
    correct = total = 0
    with torch.inference_mode():
        for x, y in val_loader:
            logits = model(x.to(device))
            correct += (logits.argmax(1).cpu() == y).sum().item()
            total += y.numel()
    print(f"epoch {epoch} val_acc={correct / total:.4f}")
```

## Data Splits and Evaluation

- Train/validation/test splits defined before any tuning; test set used once at the end.
- Split by entity/time when examples are correlated (same user, same patient, time series) to avoid leakage.
- Track training and validation loss curves together to diagnose under/overfitting.

## Diagnosing Training

| Symptom | Likely cause | Check |
|---------|--------------|-------|
| Loss is NaN/inf | LR too high, bad data, log(0) | Lower LR, `torch.autograd.set_detect_anomaly(True)` briefly, validate inputs |
| Loss does not decrease | Bug in labels/loss, LR too low, frozen params | Overfit a single small batch first |
| Train good, val bad | Overfitting or leakage differences | Regularize, augment, check split |
| Both poor | Underfitting | Bigger model, longer training, better features |
| Val metric noisy | Small val set | Larger val set, multiple seeds |

"Overfit one batch" is the fastest sanity check: a correct model and loop drive loss near zero on a handful of examples.

## Reproducibility

```python
import random, numpy as np
torch.manual_seed(0); np.random.seed(0); random.seed(0)
torch.use_deterministic_algorithms(True)   # may require CUBLAS_WORKSPACE_CONFIG=:4096:8 on CUDA
```

Report results over multiple seeds; single-seed differences are often noise.

## Checklist

- [ ] Loss takes logits; no double softmax
- [ ] `train()`/`eval()` toggled; `inference_mode()` for evaluation
- [ ] AdamW with warmup + decay; no decay on norms/biases
- [ ] Gradient clipping for deep/sequence models
- [ ] Single-batch overfit test passes
- [ ] Leak-free splits; multiple seeds for comparisons
