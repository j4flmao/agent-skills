---
name: statistical-mechanics
description: >
  Use this skill when the user says 'diffusion model math', 'score matching', 'DDPM', 'Langevin dynamics', 'reverse SDE', 'probability flow ODE', 'Boltzmann distribution', 'energy-based model', 'classifier-free guidance', 'flow matching', 'noise schedule'. Explains the statistical-mechanics view of generative modeling (Boltzmann distributions, Langevin dynamics, forward/reverse diffusion SDEs, score functions) and implements a correct DDPM training and sampling loop. Do NOT use for: using pretrained image generators (ai/genai-vision), information-theoretic losses (fundamental-truths/information-theory), or physics simulation in games.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [fundamental-truths, statistical-mechanics, diffusion, score-matching, langevin, energy-based-models]
---

# Statistical Mechanics & Diffusion Models

## Purpose
Diffusion and score-based models borrow directly from statistical physics: data is gradually corrupted by Gaussian noise (a forward diffusion process), and a network learns the score ∇ₓ log pₜ(x) needed to run the process backwards. Softmax temperature, energy-based models, and Langevin sampling share the same Boltzmann foundations. This skill gives the exact equations, how they map to code, and the practical knobs (schedules, parameterization, guidance, samplers).

## Agent Protocol

### Trigger
"diffusion math", "DDPM", "DDIM", "score matching", "score function", "Langevin", "reverse SDE", "probability flow ODE", "noise schedule", "classifier-free guidance", "flow matching", "energy-based model", "Boltzmann".

### Input Context
- Goal: understanding, implementing from scratch, or debugging training/sampling.
- Data type and resolution; compute budget.
- Existing code (if debugging): parameterization (ε, x₀, v), schedule, sampler.

### Output Artifact
Derivation summary with the governing equations and a minimal correct implementation or a diagnosis.

### Response Format
```
Forward: q(x_t|x_0) = N(√ᾱ_t x_0, (1−ᾱ_t) I)  schedule={linear|cosine}, T={n}
Parameterization: {ε|x0|v}-prediction  Loss: {MSE on target}
Sampler: {ancestral DDPM|DDIM|DPM-Solver|ODE}  steps={n}
Guidance: CFG w={value} (p_uncond={x} in training)
Diagnosis: {issue -> fix}
```

### Completion Criteria
- [ ] Forward process and parameterization consistent between training and sampling.
- [ ] Schedule/ᾱ indexing verified (off-by-one is the classic bug).
- [ ] Sampler matches the trained parameterization.

## Boltzmann Foundations
- Boltzmann distribution: p(x) = exp(−E(x)/kT) / Z. High-energy states are exponentially unlikely; temperature T flattens or sharpens the distribution.
- Softmax with temperature is exactly a Boltzmann distribution over logits with E = −logit.
- **Score**: ∇ₓ log p(x) = −∇ₓ E(x)/kT; it does not depend on the intractable normalizer Z, which is why score-based learning is practical.
- **Langevin dynamics** samples p using only the score: xₖ₊₁ = xₖ + (ε/2) ∇ₓ log p(xₖ) + √ε · zₖ, zₖ ~ N(0, I). As ε → 0 and steps → ∞ (with Metropolis correction or annealing for finite steps) it converges to p.

## Forward and Reverse Processes
**Discrete (DDPM, Ho et al. 2020)**: with variance schedule βₜ, αₜ = 1 − βₜ, ᾱₜ = ∏ₛ≤ₜ αₛ,
```
q(x_t | x_0) = N( √ᾱ_t · x_0 , (1 − ᾱ_t) I )      ⇒  x_t = √ᾱ_t x_0 + √(1−ᾱ_t) ε
```
**Continuous (Song et al. 2021)**: forward SDE dx = f(x,t) dt + g(t) dw. Its time reversal (Anderson 1982) is
```
dx = [ f(x,t) − g(t)² ∇ₓ log p_t(x) ] dt + g(t) dw̄
```
and the **probability flow ODE** dx = [ f − ½ g² ∇ₓ log p_t(x) ] dt has the same marginals, enabling deterministic sampling (DDIM is a discretization of this view) and likelihood computation.

**Denoising score matching**: predicting the added noise ε is equivalent to learning the score, since ∇ log q(xₜ|x₀) = −ε / √(1−ᾱₜ).

## Minimal DDPM (PyTorch)

```python
from __future__ import annotations

import math

import torch
import torch.nn.functional as F


def cosine_alpha_bar(T: int, s: float = 0.008) -> torch.Tensor:
    t = torch.linspace(0, T, T + 1, dtype=torch.float64) / T
    f = torch.cos((t + s) / (1 + s) * math.pi / 2) ** 2
    alpha_bar = (f / f[0])[1:]                       # ᾱ_1..ᾱ_T
    return alpha_bar.clamp(1e-5, 1.0).float()


class DDPM:
    def __init__(self, model: torch.nn.Module, T: int = 1000) -> None:
        self.model, self.T = model, T
        self.alpha_bar = cosine_alpha_bar(T)
        prev = torch.cat([torch.ones(1), self.alpha_bar[:-1]])
        self.alpha = self.alpha_bar / prev
        self.beta = (1 - self.alpha).clamp(max=0.999)

    def loss(self, x0: torch.Tensor) -> torch.Tensor:
        b = x0.shape[0]
        t = torch.randint(0, self.T, (b,), device=x0.device)
        ab = self.alpha_bar.to(x0.device)[t].view(b, *([1] * (x0.dim() - 1)))
        eps = torch.randn_like(x0)
        xt = ab.sqrt() * x0 + (1 - ab).sqrt() * eps
        return F.mse_loss(self.model(xt, t), eps)    # ε-prediction

    @torch.inference_mode()
    def sample(self, shape: tuple[int, ...], device: torch.device) -> torch.Tensor:
        x = torch.randn(shape, device=device)
        for i in reversed(range(self.T)):
            t = torch.full((shape[0],), i, device=device, dtype=torch.long)
            a, ab, beta = (v.to(device)[i] for v in (self.alpha, self.alpha_bar, self.beta))
            eps = self.model(x, t)
            mean = (x - beta / (1 - ab).sqrt() * eps) / a.sqrt()
            x = mean + beta.sqrt() * torch.randn_like(x) if i > 0 else mean
        return x
```

`model(x_t, t)` is typically a U-Net or transformer with timestep embedding. For speed, use DDIM or DPM-Solver samplers (20-50 steps) on the same trained model.

## Practical Knobs
| Knob | Options | Notes |
|---|---|---|
| Schedule | Linear (DDPM), cosine (Nichol & Dhariwal 2021) | Cosine avoids destroying information too early at low resolution |
| Parameterization | ε, x₀, v = √ᾱ ε − √(1−ᾱ) x₀ | v-prediction is stable across noise levels |
| Guidance | Classifier-free: ε̃ = ε_uncond + w(ε_cond − ε_uncond) | Train with condition dropped ~10-20% of the time; larger w = more prompt adherence, less diversity |
| Latent diffusion | Diffuse in a VAE latent space | Main reason high-res generation is affordable (Stable Diffusion) |
| Flow matching / rectified flow | Learn a velocity field along straight paths noise→data | Used by SD3 and FLUX; fewer sampling steps |

## Debugging
| Symptom | Likely cause |
|---|---|
| Pure noise samples | Sampler/parameterization mismatch or ᾱ index off by one |
| Washed-out, gray samples | Missing final denoise, wrong data scaling (expect [−1, 1]) |
| Oversaturated with CFG | Guidance scale too high; try guidance rescaling |
| Loss fine, samples bad | Evaluating EMA vs raw weights inconsistently; use EMA weights for sampling |

## Anti-Patterns
- Treating physics metaphors ("Maxwell's demon", "negentropy") as explanations of model behaviour; the math above is what matters.
- Mixing ε-trained models with x₀ samplers.
- Comparing FID across different sample counts or preprocessing.

## Checklist
- [ ] Data scaled to [−1, 1]; schedule and indices unit-tested.
- [ ] Parameterization consistent across train/sample.
- [ ] EMA weights for sampling.
- [ ] Fast sampler validated against ancestral baseline.
- [ ] Guidance trained (condition dropout) before used.

## References
- Sohl-Dickstein et al., "Deep Unsupervised Learning using Nonequilibrium Thermodynamics" (ICML 2015).
- Ho, Jain & Abbeel, "Denoising Diffusion Probabilistic Models" (NeurIPS 2020).
- Song et al., "Score-Based Generative Modeling through Stochastic Differential Equations" (ICLR 2021).
- Ho & Salimans, "Classifier-Free Diffusion Guidance" (2022); Lipman et al., "Flow Matching for Generative Modeling" (ICLR 2023).
