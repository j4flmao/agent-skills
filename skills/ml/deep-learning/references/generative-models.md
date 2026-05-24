# Generative Models

## GANs

| Architecture | Year | Innovation | Use Case |
|-------------|------|-----------|----------|
| DCGAN | 2015 | Convolutional GAN, architectural guidelines | Image generation |
| CycleGAN | 2017 | Unpaired image translation | Style transfer |
| StyleGAN | 2019 | Style-based generator, controllable synthesis | Face generation |
| StyleGAN2 | 2020 | Improved quality, fewer artifacts | High-res generation |
| StyleGAN3 | 2021 | Alias-free transformation | Video, animation |
| BigGAN | 2018 | Large-scale class-conditional | High-fidelity ImageNet generation |

```python
# Conditional GAN training loop
def train_step(real_images, labels):
    # Train discriminator
    noise = torch.randn(batch_size, latent_dim)
    fake_images = generator(noise, labels)
    
    real_output = discriminator(real_images, labels)
    fake_output = discriminator(fake_images.detach(), labels)
    
    d_loss = F.binary_cross_entropy(real_output, torch.ones_like(real_output)) + \
             F.binary_cross_entropy(fake_output, torch.zeros_like(fake_output))
    d_optimizer.zero_grad()
    d_loss.backward()
    d_optimizer.step()

    # Train generator
    fake_images = generator(noise, labels)
    fake_output = discriminator(fake_images, labels)
    g_loss = F.binary_cross_entropy(fake_output, torch.ones_like(fake_output))
    g_optimizer.zero_grad()
    g_loss.backward()
    g_optimizer.step()
```

## VAEs

| Model | Feature | Use Case |
|-------|---------|----------|
| VAE (standard) | Gaussian prior | Continuous latent, reconstruction |
| β-VAE | Disentangled latents (β > 1) | Representation learning |
| VQ-VAE | Discrete latent codebook | Compression, discrete features |
| VQ-VAE-2 | Hierarchical discrete codes | High-quality generation |
| NVAE | Deep hierarchical VAE | Likelihood-based generation |

## Diffusion Models

```python
# DDPM sampling
def ddpm_sample(model, shape, num_steps=1000):
    x = torch.randn(shape)
    for t in reversed(range(num_steps)):
        t_tensor = torch.full((shape[0],), t, dtype=torch.long)
        predicted_noise = model(x, t_tensor)
        
        if t > 0:
            noise = torch.randn_like(x)
            x = (1 / sqrt(alpha_bar[t])) * (
                x - (1 - alpha_bar[t]) / sqrt(1 - alpha_bar[t]) * predicted_noise
            ) + sqrt(beta[t]) * noise
        else:
            x = (x - (1 - alpha_bar[0]) / sqrt(1 - alpha_bar[0]) * predicted_noise) / sqrt(alpha_bar[0])
    return x
```

## Flow Matching

| Feature | Diffusion | Flow Matching |
|---------|-----------|---------------|
| Trajectory | Curved (diffusion SDE) | Straight (linear ODE) |
| Sampling steps | 50-1000 | 10-50 |
| Training | Predict noise ε | Predict vector field v |
| Likelihood | Approximate | Exact (via ODE) |
| Conditional | CFG | Classifier-free guidance |

## Autoregressive Models

| Model | Architecture | Scale | Mode |
|-------|-------------|-------|------|
| PixelCNN | Masked convolutions | Small (32x32) | Conditional pixel generation |
| PixelSNAIL | Self-attention + causal convs | Small | Improved pixel modeling |
| ImageGPT | Transformer decoder | Up to 6.8B | Image completion, features |
| DALL-E | VQ-VAE + autoregressive transformer | 12B | Text-to-image |
| Parti | ViT-VQGAN + encoder-decoder | 20B | High-quality text-to-image |

## Evaluation Metrics

| Metric | What It Measures | Range | Notes |
|--------|-----------------|-------|-------|
| FID | Realism and diversity | 0 (best) | Most common, correlates with human judgment |
| IS (Inception Score) | Quality + diversity | Higher = better | Can be gamed |
| CLIP Score | Image-text alignment | Higher = better | For text-to-image |
| LPIPS | Perceptual similarity | Lower = better | For reconstruction |
| Recall | Diversity coverage | 0-1 | How much of real distribution is covered |
| Precision | Faithfulness | 0-1 | How many generated samples look real |
