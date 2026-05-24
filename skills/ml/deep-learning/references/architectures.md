# Modern Deep Learning Architectures

## Transformer Evolution

| Architecture | Year | Key Innovation | Use Case |
|-------------|------|---------------|----------|
| Transformer (Vaswani) | 2017 | Self-attention, multi-head | Seq2Seq, text |
| BERT | 2018 | Encoder-only, masked LM | NLU, classification |
| GPT series | 2018-23 | Decoder-only, autoregressive | Generation, chat |
| ViT | 2020 | Patch embedding + transformer | Image classification |
| Swin Transformer | 2021 | Hierarchical, shifted windows | Dense prediction |
| Perceiver IO | 2021 | Cross-attention, any modality | Multi-modal |
| Gopher/Chinchilla | 2022 | Scaling laws, compute-optimal | LLM training |
| GPT-4 / Gemini | 2023 | Multi-modal, MoE | General AI |

## State Space Models

| Model | Year | Advantage | Limitation |
|-------|------|-----------|------------|
| S4 | 2021 | Long-range (16K+), linear complexity | Complex initialization |
| Mamba | 2023 | Selective SSM, hardware-efficient | No quadratic attention benefits |
| Mamba-2 | 2024 | SSD (State Space Dual), 2x faster | Newer, less adoption |
| Jamba | 2024 | Mamba + Attention hybrid | Best of both worlds |
| Griffin (Gemma 2) | 2024 | Recurrent + local attention | Google-specific |

```python
# Mamba block (simplified)
import torch.nn.functional as F

class MambaBlock(nn.Module):
    def __init__(self, d_model, d_state=16, d_conv=4):
        super().__init__()
        self.norm = nn.LayerNorm(d_model)
        self.proj_in = nn.Linear(d_model, d_model * 2)
        self.conv1d = nn.Conv1d(d_model, d_model, d_conv, groups=d_model)
        self.ssm = SelectiveSSM(d_model, d_state)
        self.proj_out = nn.Linear(d_model, d_model)

    def forward(self, x):
        residual = x
        x = self.norm(x)
        x = self.proj_in(x)
        x, gate = x.chunk(2, dim=-1)
        x = self.conv1d(x.transpose(-1, -2)).transpose(-1, -2)
        x = self.ssm(F.silu(x))
        x = x * F.silu(gate)
        return self.proj_out(x) + residual
```

## Mixture of Experts

```python
class MoELayer(nn.Module):
    def __init__(self, d_model, num_experts=8, top_k=2):
        super().__init__()
        self.experts = nn.ModuleList([
            FeedForward(d_model) for _ in range(num_experts)
        ])
        self.gate = nn.Linear(d_model, num_experts)
        self.top_k = top_k

    def forward(self, x):
        # Gate scores: [batch, seq_len, num_experts]
        gate_logits = self.gate(x)
        weights, indices = torch.topk(
            F.softmax(gate_logits, dim=-1), self.top_k, dim=-1
        )
        # Route to top-k experts
        output = torch.zeros_like(x)
        for i in range(self.top_k):
            expert_idx = indices[..., i]
            weight = weights[..., i:i+1]
            # Dispatch to experts
            output += weight * self.experts[expert_idx](x)
        return output
```

## Diffusion Models

| Model | Type | Step Count | Use Case |
|-------|------|-----------|----------|
| DDPM | Pixel diffusion | 1000 | Image generation |
| DDIM | Pixel diffusion | 50-100 | Faster sampling |
| Stable Diffusion | Latent diffusion | 50-100 | Text-to-image |
| Sora | Video diffusion | Variable | Text-to-video |
| Flow Matching | Continuous flow | ~50-100 | Straight trajectory, simpler |

## Hyperparameter Guide

| Architecture | LR | Batch Size | Warmup | Weight Decay |
|-------------|-----|-----------|--------|-------------|
| Transformer (base) | 3e-4 | 0.5M tokens | 4000 steps | 0.1 |
| ViT (large) | 1e-3 | 4096 | 500 steps | 0.3 |
| Mamba (base) | 1e-3 | 256K tokens | 500 steps | 0.1 |
| Diffusion | 1e-4 | 256 | 1000 steps | 0.01 |
