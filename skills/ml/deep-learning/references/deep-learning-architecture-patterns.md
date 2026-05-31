# Deep Learning Architecture Patterns

## Overview

This reference provides a comprehensive deep dive into deep learning architecture patterns, covering CNN variants, transformer architectures, state space models, mixture of experts, autoencoders, GANs, diffusion models, and emerging architectures. Each section includes implementation guidance, trade-offs, and decision criteria for selecting the right architecture for a given problem.

## Convolutional Neural Networks

### ResNet Family

ResNet introduced residual connections that enabled training of very deep networks by addressing the vanishing gradient problem. The core idea: learn residual functions with reference to the layer input, instead of learning unreferenced functions.

```
Standard: F(x) = output
Residual: F(x) = H(x) - x, output = F(x) + x
```

ResNet variants and their trade-offs:

| Variant | Layers | Params | Top-1 ImageNet | MACs | Best For |
|---|---|---|---|---|---|
| ResNet-18 | 18 | 11.7M | 69.8% | 1.8G | Mobile, fast inference |
| ResNet-34 | 34 | 21.8M | 73.3% | 3.7G | General purpose |
| ResNet-50 | 50 | 25.6M | 76.0% | 4.1G | Best accuracy/compute |
| ResNet-101 | 101 | 44.7M | 77.4% | 7.9G | High accuracy |
| ResNet-152 | 152 | 60.2M | 78.3% | 11.6G | Maximum accuracy |
| Wide ResNet | 50 | 68.9M | 78.5% | 22.8G | Wide layers > deep |
| ResNeXt | 101 | 83.5M | 79.3% | 31.5G | Grouped convolutions |

Implementation of a residual block:

```python
import torch.nn as nn

class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1, downsample=None):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3,
                               stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3,
                               stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.downsample = downsample

    def forward(self, x):
        identity = x
        if self.downsample is not None:
            identity = self.downsample(x)

        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out += identity
        return self.relu(out)
```

### EfficientNet Family

EfficientNet uses compound scaling — simultaneously scaling depth, width, and resolution by a compound coefficient. The key insight: network depth, width, and resolution are not independent; scaling one dimension requires scaling others for optimal performance.

Compound scaling formula: depth = alpha^phi, width = beta^phi, resolution = gamma^phi, where alpha*beta^2*gamma^2 ≈ 2.

| Variant | Params | FLOPs | Top-1 | Speed (ms) |
|---|---|---|---|---|
| EfficientNet-B0 | 5.3M | 0.4B | 77.1% | 5.0 |
| EfficientNet-B1 | 7.8M | 0.7B | 79.1% | 7.5 |
| EfficientNet-B2 | 9.2M | 1.0B | 80.1% | 8.2 |
| EfficientNet-B3 | 12M | 1.8B | 81.6% | 11.5 |
| EfficientNet-B4 | 19M | 4.2B | 82.9% | 19.5 |
| EfficientNet-B5 | 30M | 9.9B | 83.6% | 35.0 |
| EfficientNet-B6 | 43M | 19.0B | 84.0% | 55.0 |
| EfficientNet-B7 | 66M | 37.0B | 84.3% | 85.0 |
| EfficientNetV2-S | 21.5M | 8.4B | 83.9% | 8.0 |
| EfficientNetV2-M | 54.1M | 24.7B | 85.1% | 13.0 |
| EfficientNetV2-L | 119.5M | 56.3B | 85.7% | 22.0 |

EfficientNetV2 improvements: Fused-MBConv (replaces depthwise conv with regular conv in early stages), progressive learning (increasing image size during training), and improved training recipes.

### ConvNeXt

ConvNeXt modernizes ResNet with design choices from Vision Transformers: patchify stem (4x4 conv with stride 4), LayerNorm instead of BatchNorm, GELU activation, inverted bottleneck (hidden_dim = 4 * in_dim), and larger kernel sizes (7x7).

```python
class ConvNeXtBlock(nn.Module):
    def __init__(self, dim, drop_path=0.0, layer_scale_init_value=1e-6):
        super().__init__()
        self.dwconv = nn.Conv2d(dim, dim, kernel_size=7, padding=3, groups=dim)
        self.norm = nn.LayerNorm(dim, eps=1e-6)
        self.pwconv1 = nn.Linear(dim, 4 * dim)
        self.act = nn.GELU()
        self.pwconv2 = nn.Linear(4 * dim, dim)
        self.gamma = nn.Parameter(
            layer_scale_init_value * torch.ones(dim),
            requires_grad=True
        ) if layer_scale_init_value > 0 else None
        self.drop_path = DropPath(drop_path) if drop_path > 0. else nn.Identity()

    def forward(self, x):
        input = x
        x = self.dwconv(x)
        x = x.permute(0, 2, 3, 1)
        x = self.norm(x)
        x = self.pwconv1(x)
        x = self.act(x)
        x = self.pwconv2(x)
        if self.gamma is not None:
            x = self.gamma * x
        x = x.permute(0, 3, 1, 2)
        x = input + self.drop_path(x)
        return x
```

## Transformer Architecture Patterns

### Multi-Head Attention

The core of transformer architectures. Multi-head attention runs multiple attention operations in parallel, allowing the model to attend to information from different representation subspaces.

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, nhead, dropout=0.1):
        super().__init__()
        assert d_model % nhead == 0
        self.d_model = d_model
        self.nhead = nhead
        self.d_k = d_model // nhead

        self.w_q = nn.Linear(d_model, d_model)
        self.w_k = nn.Linear(d_model, d_model)
        self.w_v = nn.Linear(d_model, d_model)
        self.w_o = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)

        Q = self.w_q(query).view(batch_size, -1, self.nhead, self.d_k).transpose(1, 2)
        K = self.w_k(key).view(batch_size, -1, self.nhead, self.d_k).transpose(1, 2)
        V = self.w_v(value).view(batch_size, -1, self.nhead, self.d_k).transpose(1, 2)

        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)

        attn = torch.softmax(scores, dim=-1)
        attn = self.dropout(attn)

        out = torch.matmul(attn, V)
        out = out.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        return self.w_o(out)
```

### Transformer Encoder-Decoder Families

| Family | Architecture | Key Innovation | Primary Use |
|---|---|---|---|
| Transformer (Vaswani 2017) | Encoder-Decoder | Self-attention, positional encoding | Seq2Seq, translation |
| BERT (Devlin 2018) | Encoder-only | Masked LM, next sentence prediction | NLU, classification, QA |
| GPT (Radford 2018) | Decoder-only | Autoregressive, causal masking | Text generation |
| T5 (Raffel 2019) | Encoder-Decoder | Text-to-text unified framework | All NLP tasks |
| BART (Lewis 2019) | Encoder-Decoder | Denoising autoencoder | Generation + comprehension |
| XLNet (Yang 2019) | Encoder-only | Permutation language modeling | NLU (beats BERT) |
| ALBERT (Lan 2019) | Encoder-only | Parameter sharing, factorized embedding | Efficient BERT |
| RoBERTa (Liu 2019) | Encoder-only | Optimized BERT training | Improved BERT |
| Longformer (Beltagy 2020) | Encoder-only | Sliding window + global attention | Long documents |
| BigBird (Zaheer 2020) | Encoder-only | Random + window + global attention | Very long sequences |
| ELECTRA (Clark 2020) | Encoder-only | Discriminator + generator | Efficient pretraining |

### BERT Architecture In Detail

BERT uses an encoder-only transformer with two pretraining objectives:
1. Masked Language Model (MLM): randomly mask 15% of tokens, predict them
2. Next Sentence Prediction (NSP): predict if sentence B follows sentence A

BERT input: token embeddings + segment embeddings + position embeddings.

BERT variants:

| Variant | Layers | Hidden | Heads | Params | Max Seq |
|---|---|---|---|---|---|
| BERT-Tiny | 2 | 128 | 2 | 4.4M | 512 |
| BERT-Mini | 4 | 256 | 4 | 11.7M | 512 |
| BERT-Small | 4 | 512 | 8 | 29.1M | 512 |
| BERT-Medium | 8 | 512 | 8 | 41.7M | 512 |
| BERT-Base | 12 | 768 | 12 | 110M | 512 |
| BERT-Large | 24 | 1024 | 16 | 340M | 512 |

### GPT Architecture In Detail

GPT uses a decoder-only transformer with causal (autoregressive) masking. Each token can only attend to previous tokens, making it suitable for generation.

Key architectural details:
- LayerNorm is applied before each sub-layer (pre-norm), unlike original transformer (post-norm)
- GPT-2 increased context to 1024 tokens
- GPT-3 introduced sparse attention patterns
- GPT-4 uses mixture of experts

| Generation | Parameters | Layers | Hidden | Heads | Context |
|---|---|---|---|---|---|
| GPT-1 | 117M | 12 | 768 | 12 | 512 |
| GPT-2 Small | 124M | 12 | 768 | 12 | 1024 |
| GPT-2 Medium | 355M | 24 | 1024 | 16 | 1024 |
| GPT-2 Large | 774M | 36 | 1280 | 20 | 1024 |
| GPT-2 XL | 1.5B | 48 | 1600 | 25 | 1024 |
| GPT-3 | 175B | 96 | 12288 | 96 | 2048 |
| GPT-4 | ~1.8T (MoE) | - | - | - | 32K-128K |

### Vision Transformer (ViT)

ViT applies transformer architecture to images by splitting them into 16x16 patches. Each patch is linearly projected to a sequence of embeddings, preserving spatial information through positional encodings.

```python
class ViT(nn.Module):
    def __init__(self, image_size=224, patch_size=16, num_classes=1000,
                 dim=768, depth=12, heads=12, mlp_dim=3072, dropout=0.1):
        super().__init__()
        num_patches = (image_size // patch_size) ** 2
        patch_dim = 3 * patch_size ** 2

        self.patch_embed = nn.Linear(patch_dim, dim)
        self.pos_embed = nn.Parameter(torch.randn(1, num_patches + 1, dim))
        self.cls_token = nn.Parameter(torch.randn(1, 1, dim))
        self.dropout = nn.Dropout(dropout)

        encoder_layer = nn.TransformerEncoderLayer(dim, heads, mlp_dim, dropout)
        self.transformer = nn.TransformerEncoder(encoder_layer, depth)
        self.mlp_head = nn.Sequential(
            nn.LayerNorm(dim),
            nn.Linear(dim, num_classes)
        )

    def forward(self, x):
        B, C, H, W = x.shape
        p = int((H * W) ** 0.5 / ((self.pos_embed.size(1) - 1) ** 0.5))
        x = x.unfold(2, p, p).unfold(3, p, p)
        x = x.contiguous().view(B, C, -1, p, p)
        x = x.permute(0, 2, 1, 3, 4).contiguous().view(B, -1, C * p * p)
        x = self.patch_embed(x)
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat((cls_tokens, x), dim=1)
        x = x + self.pos_embed
        x = self.dropout(x)
        x = self.transformer(x)
        return self.mlp_head(x[:, 0])
```

### Swin Transformer

Swin Transformer introduces hierarchical feature maps and shifted windows for efficient attention. Instead of global attention, it computes attention within non-overlapping local windows, then shifts the window partition between consecutive layers.

Key features:
- Hierarchical feature maps (like CNNs) — good for dense prediction tasks
- Linear complexity in image size (unlike ViT's quadratic)
- Shifted window partitioning enables cross-window connections
- Built for segmentation, detection, and classification

Swin-T (tiny): 28M params, 4.5G FLOPs, 81.3% ImageNet top-1
Swin-S (small): 50M params, 8.7G FLOPs, 82.3%
Swin-B (base): 88M params, 15.4G FLOPs, 83.3%
Swin-L (large): 197M params, 34.5G FLOPs, 84.5%

## State Space Models (SSMs)

State space models represent an alternative to transformers for sequence modeling, offering linear complexity in sequence length compared to transformers' quadratic complexity.

### S4 (Structured State Space)

S4 introduces structured state space models with HiPPO initialization for long-range dependency capture. Key property: can handle sequences up to 16K+ tokens with linear complexity.

### Mamba

Mamba (2023) introduces a selective state space model where the state transition matrices are input-dependent. This allows the model to selectively propagate or forget information based on the input, similar to attention's ability to focus on relevant tokens.

Mamba key innovation: input-dependent selectivity in SSMs. Previous SSMs had fixed transition matrices. Mamba makes them functions of the input, enabling content-aware reasoning.

Mamba-2 (2024) improves with SSD (State Space Dual) formulation, achieving 2x speedup. Jamba (2024) combines Mamba layers with attention layers for best-of-both-worlds performance.

## Mixture of Experts (MoE)

MoE layers route each input to a subset of expert networks, enabling larger model capacity without proportional compute increase. Sparse MoE activates only top-k experts per token.

```python
class SparseMoE(nn.Module):
    def __init__(self, d_model, num_experts=8, top_k=2):
        super().__init__()
        self.num_experts = num_experts
        self.top_k = top_k
        self.gate = nn.Linear(d_model, num_experts)
        self.experts = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, 4 * d_model),
                nn.GELU(),
                nn.Linear(4 * d_model, d_model),
            ) for _ in range(num_experts)
        ])

    def forward(self, x):
        B, S, D = x.shape
        gates = self.gate(x)
        gates = torch.softmax(gates, dim=-1)

        top_k_gates, top_k_indices = torch.topk(gates, self.top_k, dim=-1)
        top_k_gates = top_k_gates / top_k_gates.sum(dim=-1, keepdim=True)

        output = torch.zeros_like(x)
        for i in range(self.num_experts):
            mask = (top_k_indices == i).any(dim=-1)
            if mask.any():
                expert_out = self.experts[i](x[mask])
                gate_vals = top_k_gates[mask][top_k_indices[mask] == i]
                output[mask] += expert_out * gate_vals.unsqueeze(-1)

        return output
```

Key MoE architectures:

| Model | Total Params | Active Params | Experts | Top-K |
|---|---|---|---|---|
| Switch Transformer | 1.6T | ~7B | 2048 | 1 |
| GShard | 600B | ~12B | 2048 | 2 |
| ST-MoE | 269B | ~27B | 32 | 2 |
| Mixtral 8x7B | 46.7B | 12.9B | 8 | 2 |
| DeepSeek-V2 | 236B | 21B | - | - |
| GPT-4 (rumored) | ~1.8T | ~280B | 16 | 2 |

Load balancing loss is critical for MoE: it encourages uniform token distribution across experts. Without it, the gate network collapses to routing all tokens to the same few experts.

## Autoencoders and Variational Autoencoders

Autoencoders learn compressed representations by reconstructing the input through a bottleneck layer.

### Vanilla Autoencoder

```python
class Autoencoder(nn.Module):
    def __init__(self, input_dim, encoding_dim):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, encoding_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 256),
            nn.ReLU(),
            nn.Linear(256, input_dim),
            nn.Sigmoid(),
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded
```

### Variational Autoencoder (VAE)

VAEs learn a probabilistic latent space. The encoder outputs mean and log_variance of the latent distribution. KL divergence between the learned distribution and a standard normal prior is added to the loss.

```python
class VAE(nn.Module):
    def __init__(self, input_dim, latent_dim):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
        )
        self.mu = nn.Linear(128, latent_dim)
        self.log_var = nn.Linear(128, latent_dim)
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 256),
            nn.ReLU(),
            nn.Linear(256, input_dim),
            nn.Sigmoid(),
        )

    def reparameterize(self, mu, log_var):
        std = torch.exp(0.5 * log_var)
        eps = torch.randn_like(std)
        return mu + eps * std

    def forward(self, x):
        h = self.encoder(x)
        mu, log_var = self.mu(h), self.log_var(h)
        z = self.reparameterize(mu, log_var)
        return self.decoder(z), mu, log_var

def vae_loss(recon_x, x, mu, log_var):
    recon_loss = F.binary_cross_entropy(recon_x, x, reduction='sum')
    kl_loss = -0.5 * torch.sum(1 + log_var - mu.pow(2) - log_var.exp())
    return recon_loss + kl_loss
```

VAE variants: Beta-VAE (beta * KL for disentanglement), VQ-VAE (vector quantization for discrete latents), VQ-VAE-2 (hierarchical VQ-VAE for images).

## Generative Adversarial Networks

GANs consist of a generator that creates fake data and a discriminator that distinguishes real from fake. They play a minimax game.

```python
class Generator(nn.Module):
    def __init__(self, latent_dim=100, img_channels=3):
        super().__init__()
        self.main = nn.Sequential(
            nn.ConvTranspose2d(latent_dim, 512, 4, 1, 0, bias=False),
            nn.BatchNorm2d(512),
            nn.ReLU(True),
            nn.ConvTranspose2d(512, 256, 4, 2, 1, bias=False),
            nn.BatchNorm2d(256),
            nn.ReLU(True),
            nn.ConvTranspose2d(256, 128, 4, 2, 1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(True),
            nn.ConvTranspose2d(128, 64, 4, 2, 1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(True),
            nn.ConvTranspose2d(64, img_channels, 4, 2, 1, bias=False),
            nn.Tanh(),
        )

    def forward(self, x):
        return self.main(x)


class Discriminator(nn.Module):
    def __init__(self, img_channels=3):
        super().__init__()
        self.main = nn.Sequential(
            nn.Conv2d(img_channels, 64, 4, 2, 1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(64, 128, 4, 2, 1, bias=False),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(128, 256, 4, 2, 1, bias=False),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(256, 512, 4, 2, 1, bias=False),
            nn.BatchNorm2d(512),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(512, 1, 4, 1, 0, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.main(x).view(-1, 1)
```

GAN variants: DCGAN (convolutional), StyleGAN (style-based, best quality), CycleGAN (unpaired image translation), Pix2Pix (paired translation), BigGAN (large-scale GAN), StyleGAN-XL (largest GAN, now surpassed by diffusion).

## Diffusion Models

Diffusion models learn to denoise data by reversing a gradual noising process. They consist of a forward process that adds noise to data and a reverse process that learns to remove noise.

Training: given an image x0, sample noise epsilon at timestep t, predict the noise component.

```python
def diffusion_loss(model, x0, timesteps, noise_scheduler):
    batch_size = x0.size(0)
    t = torch.randint(0, timesteps, (batch_size,), device=x0.device)
    noise = torch.randn_like(x0)
    alpha_cumprod = noise_scheduler.alphas_cumprod[t].view(-1, 1, 1, 1)
    xt = torch.sqrt(alpha_cumprod) * x0 + torch.sqrt(1 - alpha_cumprod) * noise
    noise_pred = model(xt, t)
    return F.mse_loss(noise_pred, noise)
```

Sampling: start from pure noise xT, iteratively denoise to get x0.

```python
def sample(model, noise_scheduler, timesteps, shape, device):
    x = torch.randn(shape, device=device)
    for t in reversed(range(timesteps)):
        t_tensor = torch.full((shape[0],), t, device=device, dtype=torch.long)
        noise_pred = model(x, t_tensor)
        alpha = noise_scheduler.alphas[t]
        alpha_cumprod = noise_scheduler.alphas_cumprod[t]
        beta = noise_scheduler.betas[t]

        if t > 0:
            noise = torch.randn_like(x)
        else:
            noise = 0

        x = (1 / torch.sqrt(alpha)) * (
            x - (beta / torch.sqrt(1 - alpha_cumprod)) * noise_pred
        ) + torch.sqrt(beta) * noise

    return x
```

Diffusion model families:

| Model | Year | Key Innovation | Best For |
|---|---|---|---|
| DDPM | 2020 | Denoising diffusion probabilistic models | Foundation |
| DDIM | 2020 | Deterministic, faster sampling | Faster generation |
| Improved DDPM | 2021 | Learned variance, cosine schedule | Better quality |
| Guided Diffusion | 2021 | Classifier guidance | Conditional generation |
| Latent Diffusion (Stable Diffusion) | 2022 | Diffusion in latent space | Image generation, inpainting |
| DALL-E 3 | 2023 | Text-conditional diffusion | Text-to-image |
| Imagen | 2022 | Cascaded diffusion + super-resolution | High-res text-to-image |
| Sora | 2024 | Diffusion for video | Video generation |
| Consistency Models | 2023 | Single-step generation | Fast sampling |
| Rectified Flow | 2023 | Straight-line probability paths | Fast, high quality |

## Graph Neural Networks

GNNs operate on graph-structured data. Core operation: message passing between connected nodes.

### Graph Convolutional Network (GCN)

```python
class GCNLayer(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.weight = nn.Parameter(torch.Tensor(in_features, out_features))
        self.bias = nn.Parameter(torch.Tensor(out_features))
        nn.init.xavier_uniform_(self.weight)
        nn.init.zeros_(self.bias)

    def forward(self, x, adj):
        support = torch.mm(x, self.weight)
        output = torch.spmm(adj, support)
        return output + self.bias
```

GNN variants: GCN (spectral), GAT (attention on neighbors), GraphSAGE (sampling neighbors), GIN (maximally powerful), MPNN (general message passing), and EdgeConv (point clouds).

## Architecture Selection Guide

### Problem-Aware Selection

```
Problem type:
  ├── Image classification
  │   ├── < 1M images → ResNet (transfer learning)
  │   ├── > 1M images, compute constrained → EfficientNet
  │   ├── > 10M images, best accuracy → ViT / Swin
  │   └── Mobile / edge → MobileNet / EfficientNet-Lite
  ├── Object detection
  │   ├── Real-time → YOLO (v8+), RT-DETR
  │   ├── High accuracy → DETR, Mask R-CNN
  │   └── Open-vocabulary → Grounding DINO
  ├── Image segmentation
  │   ├── Medical → U-Net, nnU-Net
  │   ├── General → DeepLabV3+, Mask2Former
  │   └── Panoptic → Panoptic FPN, Mask2Former
  ├── Text classification
  │   ├── Small data (< 10K) → Logistic regression + embeddings
  │   ├── Medium data → BERT-base / RoBERTa
  │   └── Large data, latency constrained → DistilBERT / TinyBERT
  ├── Text generation
  │   ├── General → GPT, LLaMA, Mistral
  │   ├── Code → CodeGen, StarCoder, CodeLlama
  │   ├── Translation → NLLB, M2M-100
  │   └── Summarization → Pegasus, LongT5
  ├── Time-series
  │   ├── Short → LSTM, GRU, Transformer
  │   ├── Long → Informer, Autoformer, PatchTST
  │   └── Very long → TimesNet, Mamba
  ├── Graph learning
  │   ├── Node classification → GCN, GAT
  │   ├── Graph classification → GIN, DiffPool
  │   └── Link prediction → SEAL, GNN + heuristics
  └── Generative (images)
      ├── Highest quality → Diffusion (Stable Diffusion, DALL-E)
      ├── Real-time → GANs (StyleGAN, GANcraft)
      └── Latent manipulation → StyleGAN / VAE
```

### Compute-Constrained Selection

| Budget (FLOPs) | Image Model | Text Model | GenAI Model |
|---|---|---|---|
| < 1G | MobileNetV3-Small | DistilBERT | TinyGAN |
| 1-5G | EfficientNet-B0 | BERT-Tiny | - |
| 5-20G | ResNet-50 | BERT-Base | Lightweight SD |
| 20-100G | EfficientNet-B4 | RoBERTa-Base | Stable Diffusion |
| 100-500G | ViT-L | LLaMA-7B | 2x compute SD |
| > 500G | Swin-L | LLaMA-65B+ | SDXL, DALL-E 3 |

### Memory-Constrained Selection

| GPU Memory | Max Model Size | Techniques |
|---|---|---|
| 8 GB (RTX 3070) | 2-3B params | LoRA, 8-bit quant, gradient checkpointing |
| 16 GB (RTX 4080) | 7-13B params | QLoRA, 4-bit quant, LoRA + checkpointing |
| 24 GB (RTX 4090) | 13-30B params | 4-bit quant, LoRA, offloading |
| 40 GB (A100) | 40-70B params | FSDP, 4-bit quant |
| 80 GB (A100 80GB) | 70-130B params | FSDP, offloading |
| Multi-GPU | 130B+ params | FSDP + tensor parallelism |

## Emerging Architectures (2024-2026)

### Mamba and Selective SSMs

Mamba offers a compelling alternative to transformers for long sequences:
- Linear complexity in sequence length (vs quadratic for transformers)
- Hardware-efficient parallel scan algorithm
- 5x higher throughput than Transformers on long sequences
- Quality matches Transformers on language, beats on long-range tasks

Limitations: less effective on tasks requiring global attention (certain reasoning tasks), less ecosystem support, smaller community.

### Jamba (AI21)

Jamba hybridizes Mamba layers with attention layers:
- Mamba layers: efficient long-range processing
- Attention layers: global context and reasoning
- Result: 3x context length of comparable transformers at same compute
- Outperforms both pure Mamba and pure attention baselines

### Griffin (Google DeepMind 2024)

Griffin combines gated linear recurrences with local attention:
- Recurrent blocks for efficient long-range modeling
- Local attention for precise token interactions
- Used in Gemma 2 architecture
- Strong performance on long-context tasks

### Mixture of Depth (Google 2024)

MoD routes each token through a subset of transformer layers, reducing inference cost while maintaining quality. Tokens with low information content skip intermediate layers.

### Liquid Networks (MIT 2023-24)

Liquid neural networks use dynamical systems instead of fixed activation functions. The weights are replaced by ODE solvers, enabling continuous-time processing. Key advantage: much smaller models (19 neurons vs 100K+ for comparable tasks) trained on fewer samples.

## Architecture Component Design Patterns

### Normalization Pattern

```
Post-LN (original transformer): LayerNorm → residual → sublayer → LayerNorm
  Prone to training instability with deep models

Pre-LN (GPT, BERT): LayerNorm → sublayer → residual
  More stable, standard in modern architectures

Sandwich-LN: LayerNorm → sublayer → LayerNorm → residual
  Used in some large models for extra stability
```

### Feed-Forward Patterns

```
Standard FFN: Linear → ReLU → Linear (d_model -> 4*d_model -> d_model)
Gated FFN (PaLM, LLaMA): Linear → SiLU → * (element-wise multiply) → Linear
Gated FFN (GPT-J): Linear → GeLU → * with gate → Linear
SwiGLU (LLaMA): Linear → SiLU → * → Linear (d_model -> 8/3*d_model)
```

### Positional Encoding Patterns

```
Absolute (original transformer): sin/cos embeddings added to input
Learnable (BERT): learned position matrix added to input
Relative (T5): bias added to attention scores based on relative position
Rotary (RoPE, GPT-NeoX, LLaMA): rotate query/key by position angle
AliBi (GPT-NeoX-20B, MPT): linear bias on attention scores
No positional encoding (some SSMs): position encoded in state dynamics
```

## References
- Vaswani et al. "Attention Is All You Need" (2017)
- Devlin et al. "BERT: Pre-training of Deep Bidirectional Transformers" (2018)
- He et al. "Deep Residual Learning for Image Recognition" (2015)
- Tan and Le. "EfficientNet: Rethinking Model Scaling" (2019)
- Dosovitskiy et al. "An Image is Worth 16x16 Words: Transformers for Image Recognition" (2020)
- Ho et al. "Denoising Diffusion Probabilistic Models" (2020)
- Gu and Dao. "Mamba: Linear-Time Sequence Modeling with Selective State Spaces" (2023)
- Fedus et al. "Switch Transformers: Scaling to Trillion Parameter Models" (2021)
- Touvron et al. "LLaMA: Open and Efficient Foundation Language Models" (2023)
- Raffel et al. "Exploring the Limits of Transfer Learning with T5" (2019)
