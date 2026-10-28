---
name: information-theory
description: >
  Use this skill when the user says 'entropy', 'cross-entropy loss', 'KL divergence', 'perplexity', 'bits per byte', 'mutual information', 'compression is prediction', 'manifold hypothesis', 'intrinsic dimension', 'ELBO'. Explains the information-theoretic quantities behind ML training and evaluation and applies them: interpreting losses and perplexity, KL in distillation/RLHF/VAEs, calibration, and measuring intrinsic dimension of embeddings. Do NOT use for: diffusion/score-based generative math (fundamental-truths/statistical-mechanics), classical statistics and hypothesis tests (data-science/statistical-analysis), or embedding search systems (ai/llm-engineering/rag-architecture).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [fundamental-truths, information-theory, entropy, kl-divergence, perplexity, manifold-hypothesis]
---

# Information Theory for ML

## Purpose
Language-model training minimizes cross-entropy, distillation and RLHF use KL divergence, VAEs maximize an ELBO, and perplexity and bits-per-byte are information measures. Knowing exactly what these quantities mean prevents common errors: comparing perplexities across tokenizers, mixing nats and bits, using KL in the wrong direction, or over-reading the manifold hypothesis.

## Agent Protocol

### Trigger
"entropy", "cross-entropy", "KL divergence", "forward vs reverse KL", "perplexity", "bits per byte", "mutual information", "ELBO", "manifold hypothesis", "intrinsic dimension".

### Input Context
- The model/loss in question and its units (nats vs bits).
- Tokenizer details when comparing language models.
- Data samples or embeddings if measuring.

### Output Artifact
Explanation with the exact formula, numeric interpretation, and code to compute the quantity correctly.

### Response Format
```
Quantity: {name} = {formula}  Units: {nats|bits}
Interpretation: {what the number means here}
Pitfall: {common mistake}
Compute: {code snippet / library call}
```

### Completion Criteria
- [ ] Units stated and conversions explicit (1 nat = 1/ln 2 ≈ 1.4427 bits).
- [ ] Direction of KL stated and justified.
- [ ] Cross-model comparisons normalized (bits per byte/character) when tokenizers differ.

## Core Quantities
| Quantity | Definition | Notes |
|---|---|---|
| Entropy | H(X) = −Σ p(x) log p(x) | Lower bound on average code length (Shannon source coding) |
| Cross-entropy | H(p, q) = −Σ p(x) log q(x) = H(p) + KL(p‖q) | The LM training loss with p = data, q = model |
| KL divergence | KL(p‖q) = Σ p(x) log (p(x)/q(x)) ≥ 0 | Asymmetric; zero iff p = q |
| Mutual information | I(X;Y) = H(X) − H(X∣Y) = KL(p(x,y)‖p(x)p(y)) | Dependence measure; ≥ 0 |
| Differential entropy | h(X) = −∫ f log f | Can be negative; not invariant to reparameterization |

Data processing inequality: for a Markov chain X → Y → Z, I(X;Z) ≤ I(X;Y). Processing cannot create information about X.

## Losses and Metrics in Practice
- **Cross-entropy loss** in PyTorch (`F.cross_entropy`) uses natural log: values are in nats per token.
- **Perplexity** = exp(mean token cross-entropy in nats) = 2^(bits per token). It depends on the tokenizer; never compare perplexities of models with different vocabularies.
- **Bits per byte (BPB)** = total nats / (ln 2 × number of UTF-8 bytes): tokenizer-independent comparison.
- **Compression = prediction**: a model with cross-entropy L bits/symbol can drive an arithmetic coder to ~L bits/symbol, which is why LM loss and compression ratio are interchangeable views.

```python
from __future__ import annotations

import math

import numpy as np


def entropy(p: np.ndarray, base: float = 2.0) -> float:
    p = np.asarray(p, dtype=float)
    if np.any(p < 0) or not math.isclose(p.sum(), 1.0, rel_tol=1e-6):
        raise ValueError("p must be a probability vector")
    nz = p[p > 0]
    return float(-(nz * np.log(nz)).sum() / math.log(base))


def kl(p: np.ndarray, q: np.ndarray, base: float = 2.0) -> float:
    p, q = np.asarray(p, float), np.asarray(q, float)
    mask = p > 0
    if np.any(q[mask] == 0):
        return math.inf                      # q assigns zero mass where p has mass
    return float((p[mask] * np.log(p[mask] / q[mask])).sum() / math.log(base))


def perplexity_and_bpb(total_nll_nats: float, n_tokens: int, n_bytes: int) -> tuple[float, float]:
    if n_tokens <= 0 or n_bytes <= 0:
        raise ValueError("token and byte counts must be positive")
    return math.exp(total_nll_nats / n_tokens), total_nll_nats / (math.log(2) * n_bytes)
```

## KL Direction Matters
| Objective | Behaviour | Where used |
|---|---|---|
| Forward KL(p‖q), minimize over q | Mass-covering: q spreads to cover all modes of p | Maximum likelihood / cross-entropy training; standard distillation on teacher soft labels |
| Reverse KL(q‖p), minimize over q | Mode-seeking: q concentrates on high-p regions | Variational inference (ELBO), on-policy distillation |
| KL penalty to reference policy | Keeps a fine-tuned policy near the base model | RLHF (PPO with KL term), DPO's implicit constraint |

**ELBO**: log p(x) = ELBO(q) + KL(q(z∣x) ‖ p(z∣x)), with ELBO = E_q[log p(x∣z)] − KL(q(z∣x) ‖ p(z)). Since the KL term is ≥ 0, maximizing the ELBO both raises a lower bound on log-likelihood and pulls q toward the true posterior.

## Temperature and Sampling
Softmax with temperature T: q_T(i) ∝ exp(z_i / T). Lower T reduces entropy (sharper, more deterministic); higher T increases it. Measuring the entropy of the next-token distribution is a cheap uncertainty signal, though not a calibrated probability of correctness.

## The Manifold Hypothesis
High-dimensional natural data (images, audio, text embeddings) is believed to concentrate near lower-dimensional structures. Evidence: intrinsic-dimension estimates far below ambient dimension, and the success of low-dimensional latent models. It is a hypothesis about typical data, not a theorem, and the structure may be a union of manifolds with varying dimension.

Estimate intrinsic dimension instead of assuming it:
```python
import numpy as np
from sklearn.neighbors import NearestNeighbors


def two_nn_intrinsic_dim(x: np.ndarray) -> float:
    """TwoNN estimator (Facco et al., 2017): uses ratio of 2nd to 1st neighbour distances."""
    dists, _ = NearestNeighbors(n_neighbors=3).fit(x).kneighbors(x)
    r1, r2 = dists[:, 1], dists[:, 2]
    mu = r2[r1 > 0] / r1[r1 > 0]
    return float(len(mu) / np.sum(np.log(mu)))
```
Also check PCA explained variance; a sharp elbow suggests a few dominant directions (linear structure only).

## Anti-Patterns
- Comparing perplexity across tokenizers.
- Reporting loss without units (nats vs bits).
- Treating low entropy as correctness (models can be confidently wrong).
- Claiming "hallucination = leaving the manifold" as an established mechanism; it is a metaphor.
- Using KL where q has zeros on p's support (infinite) without smoothing.

## Checklist
- [ ] Units stated; conversions correct.
- [ ] Tokenizer-independent metric (BPB) for cross-model comparisons.
- [ ] KL direction chosen deliberately.
- [ ] Intrinsic dimension measured, not assumed.

## References
- Cover & Thomas, "Elements of Information Theory" (2nd ed., 2006).
- MacKay, "Information Theory, Inference, and Learning Algorithms" (2003, free online).
- Kingma & Welling, "Auto-Encoding Variational Bayes" (2014); Facco et al., "Estimating the intrinsic dimension of datasets by a minimal neighborhood information" (Sci. Rep. 2017).
