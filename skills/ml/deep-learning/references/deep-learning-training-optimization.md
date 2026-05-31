# Deep Learning Training Optimization

## Overview

This reference covers advanced deep learning training optimization techniques: distributed training strategies (DDP, FSDP, DeepSpeed), mixed precision training, gradient accumulation and checkpointing, learning rate scheduling, optimizer selection, data pipeline optimization, profiling and debugging, model parallelism, and large-model training strategies.

## Distributed Data Parallel (DDP)

DDP is the standard approach for multi-GPU training when the model fits in single GPU memory. Each GPU holds a complete model copy, processes a different subset of data, and synchronizes gradients via all-reduce.

### How DDP Works

1. Each process loads its own model copy on its own GPU
2. DistributedSampler ensures each process sees different data
3. Forward pass computed independently per GPU
4. Backward pass computes local gradients
5. Gradient all-reduce: gradients are averaged across all GPUs
6. Each GPU applies the averaged gradients to its model copy

Key parameters:
- `bucket_cap_mb`: gradient bucket size for communication (default 25 MB). Larger buckets = fewer but larger all-reduce operations. Tune for network bandwidth.
- `find_unused_parameters`: set True if model has unused params (e.g., dynamic networks). Adds overhead, avoid if possible.
- `gradient_as_bucket_view`: reduces memory by reusing bucket memory. Set True for memory-constrained scenarios.

### DDP Implementation

```python
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel
from torch.utils.data.distributed import DistributedSampler
import os

def setup(rank, world_size):
    os.environ['MASTER_ADDR'] = 'localhost'
    os.environ['MASTER_PORT'] = '12355'
    dist.init_process_group('nccl', rank=rank, world_size=world_size)
    torch.cuda.set_device(rank)

def cleanup():
    dist.destroy_process_group()

def train(rank, world_size):
    setup(rank, world_size)
    model = MyModel().to(rank)
    model = DistributedDataParallel(
        model,
        device_ids=[rank],
        output_device=rank,
        find_unused_parameters=False,
        gradient_as_bucket_view=True,
        bucket_cap_mb=50,
    )
    sampler = DistributedSampler(dataset, num_replicas=world_size, rank=rank, shuffle=True)
    loader = DataLoader(dataset, batch_size=64, sampler=sampler, num_workers=4, pin_memory=True)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4 * world_size)

    for epoch in range(10):
        sampler.set_epoch(epoch)
        for batch in loader:
            optimizer.zero_grad()
            loss = model(batch)
            loss.backward()
            optimizer.step()

    cleanup()
```

### Launching DDP

```bash
# torchrun (recommended for PyTorch 1.10+)
torchrun --nproc_per_node=4 --nnodes=1 train_ddp.py

# Multi-node
torchrun --nproc_per_node=8 --nnodes=2 --node_rank=0 \
  --master_addr=192.168.1.100 --master_port=12355 train_ddp.py
```

### DDP Scaling Efficiency

| GPUs | Scaling Efficiency (strong) | Typical Speedup | Bottleneck |
|---|---|---|---|
| 2 | 95-98% | 1.9x | Negligible |
| 4 | 90-95% | 3.6-3.8x | Gradient sync |
| 8 | 85-92% | 6.8-7.4x | Gradient sync |
| 16 | 80-88% | 12.8-14x | Network bandwidth |
| 32 | 75-85% | 24-27x | Network + data loading |
| 64 | 65-80% | 42-51x | All-reduce overhead |
| 128 | 55-75% | 70-96x | Communication dominates |

Scaling efficiency depends on: model size (larger models scale better), batch size per GPU, network bandwidth (NVLink > InfiniBand > Ethernet), gradient computation to communication ratio.

### Gradient Compression for DDP

Techniques to reduce communication overhead:

```python
# PowerSGD — gradient compression via low-rank approximation
from torch.distributed.algorithms.ddp_comm_hooks import powerSGD_hook
ddp_model.register_comm_hook(
    state=powerSGD_hook.PowerSGDState(rank=rank, matrix_approximation_rank=1),
    hook=powerSGD_hook.powerSGD_hook,
)
```

## Fully Sharded Data Parallel (FSDP)

FSDP shards model parameters, gradients, and optimizer states across GPUs. Each GPU stores only a fraction of the total model, enabling training of models much larger than single GPU memory.

### FSDP vs DDP

| Aspect | DDP | FSDP |
|---|---|---|
| Parameters per GPU | Full copy | Sharded (1/N) |
| Gradients per GPU | Full (reduced) | Sharded (1/N) |
| Optimizer states per GPU | Full copy | Sharded (1/N) |
| Max model size | Single GPU memory | N * single GPU memory |
| Communication | All-reduce gradients | Scatter/gather parameters |
| Overhead | Low | Medium (gather/scatter) |
| Memory savings | None | 2-8x (model dependent) |

### FSDP Implementation

```python
from torch.distributed.fsdp import (
    FullyShardedDataParallel as FSDP,
    MixedPrecision,
    BackwardPrefetch,
    ShardingStrategy,
    CPUOffload,
)
from torch.distributed.fsdp.wrap import (
    transformer_auto_wrap_policy,
    size_based_auto_wrap_policy,
)
import functools

# Define auto-wrap policy for transformer blocks
auto_wrap_policy = functools.partial(
    transformer_auto_wrap_policy,
    transformer_layer_cls={TransformerBlock},
)

# Mixed precision policy
mp_policy = MixedPrecision(
    param_dtype=torch.bfloat16,
    reduce_dtype=torch.bfloat16,
    buffer_dtype=torch.bfloat16,
)

model = FSDP(
    model,
    auto_wrap_policy=auto_wrap_policy,
    mixed_precision=mp_policy,
    backward_prefetch=BackwardPrefetch.BACKWARD_PRE,
    sharding_strategy=ShardingStrategy.FULL_SHARD,
    cpu_offload=CPUOffload(offload_params=False),
    limit_all_gathers=True,
    device_id=torch.cuda.current_device(),
)
```

### FSDP Sharding Strategies

| Strategy | Memory | Communication | Best For |
|---|---|---|---|
| FULL_SHARD (default) | Lowest (shard everything) | Highest | Large models, limited GPUs |
| SHARD_GRAD_OP | Medium (params unsharded) | Medium | Balanced memory/comm |
| NO_SHARD | Highest (like DDP) | Lowest (like DDP) | Model fits in GPU memory |
| HYBRID_SHARD | Configurable | Configurable | Multi-node (shard within node, replicate across) |

### FSDP Tuning Guide

```
FSDP tuning checklist:
  1. Use transformer_auto_wrap_policy for transformer models
  2. Set mixed_precision to bfloat16 (if supported) or float16
  3. Enable backward_prefetch for throughput
  4. Set limit_all_gathers=True to prevent OOM
  5. Use SHARD_GRAD_OP if FULL_SHARD causes too much communication overhead
  6. Use HYBRID_SHARD for multi-node training
  7. Set forward_prefetch=True for sequential models
  8. Use CPUOffload only when GPU memory is extremely constrained
```

## DeepSpeed Integration

DeepSpeed provides ZeRO (Zero Redundancy Optimizer) stages, offering finer-grained control than FSDP.

| ZeRO Stage | Memory Savings | Communication | When to Use |
|---|---|---|---|
| ZeRO-1 | Optimizer states sharded | Low | Baseline distributed |
| ZeRO-2 | Optimizer + gradients sharded | Medium | Most models |
| ZeRO-3 | Params + gradients + optimizer states sharded | High | Very large models |
| ZeRO-Infinity | Offload to CPU/NVMe | Very High | Extreme scale |

```python
import deepspeed

# DeepSpeed configuration
ds_config = {
    "train_batch_size": 256,
    "gradient_accumulation_steps": 4,
    "fp16": {
        "enabled": True,
        "auto_cast": True,
        "loss_scale": 0,
        "initial_scale_power": 16,
    },
    "zero_optimization": {
        "stage": 3,
        "offload_optimizer": {"device": "cpu", "pin_memory": True},
        "offload_param": {"device": "cpu", "pin_memory": True},
        "overlap_comm": True,
        "contiguous_gradients": True,
        "reduce_bucket_size": "auto",
        "stage3_prefetch_bucket_size": "auto",
        "stage3_param_persistence_threshold": "auto",
    },
    "gradient_clipping": 1.0,
    "steps_per_print": 100,
    "wall_clock_breakdown": False,
}

model_engine, optimizer, _, _ = deepspeed.initialize(
    model=model,
    model_parameters=model.parameters(),
    config=ds_config,
)

for epoch in range(num_epochs):
    for batch in dataloader:
        loss = model_engine(batch)
        model_engine.backward(loss)
        model_engine.step()
```

### DeepSpeed ZeRO-3 Memory Comparison

| Model Size | DDP (no quant) | ZeRO-2 | ZeRO-3 | ZeRO-3 + Offload |
|---|---|---|---|---|
| 7B | 4x80GB A100 | 2x80GB A100 | 1x80GB A100 | 1x80GB A100 |
| 13B | 8x80GB A100 | 4x80GB A100 | 2x80GB A100 | 1x80GB A100 |
| 30B | 16x80GB A100 | 8x80GB A100 | 4x80GB A100 | 2x80GB A100 |
| 70B | - | 16x80GB A100 | 8x80GB A100 | 4x80GB A100 |
| 130B | - | 32x80GB A100 | 16x80GB A100 | 8x80GB A100 |

## Mixed Precision Training (AMP)

Mixed precision training uses float16 (or bfloat16) for most operations while keeping critical operations in float32. This enables faster training (1.5-3x) and reduced memory usage.

### Precision Formats

| Format | Exponent Bits | Mantissa Bits | Range | Precision |
|---|---|---|---|---|
| float32 | 8 | 23 | 1.4e-45 to 3.4e38 | ~7 decimal digits |
| float16 | 5 | 10 | 5.96e-8 to 6.55e4 | ~3 decimal digits |
| bfloat16 | 8 | 7 | 1.18e-38 to 3.39e38 | ~2 decimal digits |
| float8 (E4M3) | 4 | 3 | 0 to 448 | Low |
| float8 (E5M2) | 5 | 2 | Wide range | Very low |

bfloat16 is preferred for training because it has the same range as float32 (reducing overflow risk) at the cost of slightly lower precision.

### Automatic Mixed Precision (PyTorch)

```python
scaler = torch.amp.GradScaler('cuda')

for batch in dataloader:
    optimizer.zero_grad()

    with torch.amp.autocast('cuda'):
        outputs = model(batch)
        loss = criterion(outputs, targets)

    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    scaler.step(optimizer)
    scaler.update()
```

### AMP Guidelines

```
When to use AMP:
  - NVIDIA Volta (V100), Turing (T4), Ampere (A100), Hopper (H100): always
  - Older GPUs (Pascal, Maxwell): minimal benefit
  - CPU training: no benefit

AMP tuning:
  - If loss scales drop to minimum (2^-24), float16 gradients are overflowing
  - Switch to bfloat16 if available (A100+)
  - Disable AMP for loss-critical operations (log_softmax, cross_entropy)
  - Keep master weights in float32 for optimizer updates

Operations that benefit:
  - Matrix multiplications (linear, conv): 2-4x speedup
  - Convolutions: 2-3x speedup
  - Normalization: minimal benefit
  - Reductions: slower in fp16
```

## Gradient Accumulation

Gradient accumulation simulates larger batch sizes by accumulating gradients over multiple forward/backward passes before performing an optimizer step.

```python
accumulation_steps = 4  # effective batch_size = per_gpu_batch * gpus * accumulation

optimizer.zero_grad()
for i, batch in enumerate(dataloader):
    loss = model(batch)
    loss = loss / accumulation_steps  # normalize
    loss.backward()

    if (i + 1) % accumulation_steps == 0:
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        optimizer.zero_grad()
        scheduler.step()
```

Benefits:
- Train with effective batch sizes larger than GPU memory allows
- Smoother gradient updates with larger batch
- Enables training on smaller GPUs

Drawbacks:
- Slower per-step throughput (reduced parallelism)
- Batch normalization statistics differ (use sync_bn or group norm)

## Gradient Checkpointing

Gradient checkpointing trades compute for memory by not storing intermediate activations during forward pass and recomputing them during backward pass.

```python
# Apply to specific modules
class TransformerBlock(nn.Module):
    def forward(self, x):
        x = self.self_attention(x)
        x = torch.utils.checkpoint.checkpoint(self.ffn, x)
        return x

# Or wrap the whole model forward
def forward_with_checkpoint(model, x):
    return torch.utils.checkpoint.checkpoint(model, x)
```

Memory savings:
- Without checkpointing: O(L * N * H) where L = layers, N = sequence, H = hidden
- With checkpointing: O(N * H) — only one layer's activations stored
- Typical savings: 1.5-2x memory reduction
- Compute overhead: 15-25% additional computation

### Selective Checkpointing

Checkpoint every Nth layer instead of all layers for a memory/compute trade-off:

```python
class CheckpointedModel(nn.Module):
    def __init__(self, layers, checkpoint_every_n=2):
        super().__init__()
        self.layers = nn.ModuleList(layers)
        self.checkpoint_every_n = checkpoint_every_n

    def forward(self, x):
        for i, layer in enumerate(self.layers):
            if i % self.checkpoint_every_n == 0:
                x = torch.utils.checkpoint.checkpoint(layer, x)
            else:
                x = layer(x)
        return x
```

## Optimizer Selection and Tuning

### Optimizer Comparison

| Optimizer | Memory (params) | Memory (states) | Convergence | Best For |
|---|---|---|---|---|
| SGD + momentum | 1x | 2x (momentum + velocity) | Slower, better generalization | Large batch, CV |
| Adam | 1x | 4x (mom + var) | Fast, robust | NLP, transformers |
| AdamW | 1x | 4x (mom + var) | Fast, better weight decay | Transformers (default) |
| AdamW + decoupled WD | 1x | 4x | Best for transformers | LLaMA, GPT, BERT |
| AdaFactor | 1x | 2x (factorized) | Good, saves memory | Memory-constrained |
| Lion | 1x | 1x (momentum) | Fast, less memory | Emerging, promising |
| Sophia | 1x | 4x | 2x faster than Adam | Large models |
| LAMB | 1x | 4x | Good for large batch | Large batch training |
| Shampoo | 1x | O(d^2) | Best for ill-conditioned | Small models |

### Learning Rate Scheduling

```python
import torch.optim.lr_scheduler as scheduler

# Cosine annealing (standard for transformers)
cosine_scheduler = scheduler.CosineAnnealingLR(optimizer, T_max=num_epochs)

# Cosine with warmup (recommended)
warmup_steps = int(0.1 * total_steps)
def warmup_cosine(step):
    if step < warmup_steps:
        return step / warmup_steps
    return 0.5 * (1 + math.cos(math.pi * (step - warmup_steps) / (total_steps - warmup_steps)))

scheduler = scheduler.LambdaLR(optimizer, lr_lambda=warmup_cosine)

# OneCycle (fast convergence)
scheduler = scheduler.OneCycleLR(
    optimizer, max_lr=1e-3,
    total_steps=total_steps,
    pct_start=0.1, anneal_strategy='cos',
)

# ReduceLROnPlateau (adaptive)
scheduler = scheduler.ReduceLROnPlateau(
    optimizer, mode='min', factor=0.5,
    patience=5, threshold=1e-4,
)
```

### Learning Rate Scaling Rules

When scaling batch size, scale learning rate:

| Rule | Formula | When |
|---|---|---|
| Linear scaling | lr = lr_base * (batch / batch_base) | batch < 2048 |
| Square root scaling | lr = lr_base * sqrt(batch / batch_base) | batch > 2048 |
| No scaling | lr stays the same | Very large batch (> 65536) |

## Data Pipeline Optimization

The data pipeline is often the bottleneck in distributed training. GPU utilization drops when the CPU can't feed data fast enough.

### PyTorch DataLoader Optimization

```python
train_loader = DataLoader(
    dataset,
    batch_size=64,
    shuffle=True,
    num_workers=8,           # rule of thumb: 4-8 per GPU
    pin_memory=True,         # faster CPU->GPU transfer
    prefetch_factor=2,       # prefetch batches
    persistent_workers=True, # keep workers alive between epochs
    timeout=60,              # worker timeout
)
```

### Advanced Data Loading

```python
# Use DALI for GPU-accelerated data loading (images, video)
import nvidia.dali as dali
import nvidia.dali.plugin.pytorch as dali_pytorch

@pipeline_def
def dali_pipeline():
    images = dali.fn.readers.file(file_root=data_path)
    images = dali.fn.decoders.image(images, device='mixed')
    images = dali.fn.resize(images, size=(224, 224))
    images = dali.fn.crop_mirror_normalize(
        images, dtype=dali.types.FLOAT,
        mean=[0.485*255, 0.456*255, 0.406*255],
        std=[0.229*255, 0.224*255, 0.225*255],
    )
    return images

train_loader = dali_pytorch.DALIGenericDataLoader(
    dali_pipeline(batch_size=64, num_threads=4, device_id=0),
    size=dataset_size,
)
```

### WebDataset for Large Datasets

WebDataset shards data into tar files for efficient streaming from cloud storage. No local storage needed — data is streamed directly from S3/GCS.

```python
import webdataset as wds

url = "https://storage.googleapis.com/my-bucket/data-{000000..001000}.tar"
dataset = wds.WebDataset(url, shardshuffle=True) \
    .decode("pil") \
    .to_tuple("jpg", "cls") \
    .map(transform) \
    .batched(64, collation_fn=collate_fn)

loader = wds.WebLoader(dataset, num_workers=4, batch_size=None)
```

### Profiling Data Pipeline

```python
# Use PyTorch Profiler to find bottlenecks
with torch.profiler.profile(
    activities=[torch.profiler.ProfilerActivity.CPU, torch.profiler.ProfilerActivity.CUDA],
    schedule=torch.profiler.schedule(wait=1, warmup=2, active=3),
    record_shapes=True,
    profile_memory=True,
) as prof:
    for batch in dataloader:
        train_step(batch)
        prof.step()

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=20))
```

## Model Parallelism

### Tensor Parallelism

Tensor parallelism splits individual operations across GPUs. Used for very large linear layers where the weight matrix doesn't fit in single GPU memory.

```
Without TP: Y = X @ W         # W on one GPU, compute on one GPU
With TP:    Y = concat(Y1, Y2) # Y1 = X @ W1, Y2 = X @ W2 (W split column-wise)
```

Implemented in Megatron-LM for transformer models:
- Self-attention: split heads across GPUs
- FFN: split intermediate dimension across GPUs
- Communication: all-reduce after each TP operation

### Pipeline Parallelism

Pipeline parallelism splits model layers across GPUs. Each GPU computes a subset of layers.

```python
# Manual pipeline partitioning
layer_partition = [model.layers[:12], model.layers[12:24], model.layers[24:36], model.layers[36:]]

# Each GPU gets one partition
model_partition = layer_partition[rank].to(rank)

# Micro-batching for pipeline efficiency
micro_batches = 4
for micro_batch in chunks(batch, micro_batches):
    if rank == 0:
        output = model_partition(micro_batch)
    elif rank == world_size - 1:
        output = model_partition(inputs[rank - 1])
    else:
        output = model_partition(inputs[rank - 1])
        send_output(output, rank + 1)
```

Pipeline bubble overhead: 1 - 1/(M + P - 1) where M = micro-batches, P = pipeline stages. With 4 stages and 32 micro-batches: bubble = 1 - 1/(32 + 4 - 1) = 1 - 1/35 ≈ 3%.

### 3D Parallelism (Megatron)

Combine all three for maximum scale:

| Parallelism | Dimension | When | Communication |
|---|---|---|---|
| Data (DDP/FSDP) | Batch | Always | Gradient all-reduce |
| Tensor | Hidden | Model doesn't fit single GPU | Attention/FFN all-reduce |
| Pipeline | Layers | Model very deep | Activations P2P |

```
3D parallelism for 1T+ parameter models:
  DP=64 (data parallel), TP=8 (tensor parallel), PP=4 (pipeline parallel)
  Total GPUs = 64 * 8 * 4 = 2048 GPUs
```

## Training at Scale: Best Practices

### Memory Optimization Checklist

```
1. Enable mixed precision (AMP)
2. Use gradient checkpointing for large models
3. Reduce batch size (then use gradient accumulation)
4. Use FSDP or DeepSpeed ZeRO
5. Enable activation checkpointing in transformers
6. Freeze embeddings for large vocabularies
7. Use parameter-efficient fine-tuning (LoRA, QLoRA)
8. Offload optimizer states to CPU
9. Use 4-bit/8-bit quantization
10. Avoid unnecessary tensor creation (inplace ops)
```

### Common Training Issues and Fixes

| Issue | Symptom | Likely Cause | Fix |
|---|---|---|---|
| Loss not decreasing | Stuck at random | LR too high/low | Try LR range test |
| Loss diverges | Goes to NaN/inf | LR too high, gradient explosion | Clip gradients, reduce LR |
| Loss plateau | Flat for 10+ epochs | LR too low, model too small | Increase LR, increase capacity |
| OOM | CUDA out of memory | Batch too large | Reduce batch, use checkpointing |
| Slow training | GPU util < 80% | Data pipeline bottleneck | Increase num_workers, prefetch |
| Slow convergence | Loss decreasing slowly | Data not shuffled | Check data order |
| Overfitting | Train > val gap grows | Too much capacity | Increase dropout, weight decay |
| Underfitting | Train = val, both poor | Too little capacity | Increase model size |
| Mode collapse (GAN) | Generator always same output | Training instability | Use spectral norm, TTUR |
| Gradient vanishing | Early layers don't change | Deep network, bad init | Use residual connections, proper init |

### Memory Benchmarking

```python
def measure_memory(model, input_shape, device='cuda'):
    model = model.to(device)
    model.train()

    # Measure forward memory
    torch.cuda.reset_peak_memory_stats(device)
    x = torch.randn(input_shape, device=device)
    y = model(x)
    forward_memory = torch.cuda.max_memory_allocated(device)

    # Measure backward memory
    torch.cuda.reset_peak_memory_stats(device)
    loss = y.sum()
    loss.backward()
    total_memory = torch.cuda.max_memory_allocated(device)

    return {
        'forward': forward_memory / 1e9,
        'total': total_memory / 1e9,
        'params': sum(p.numel() for p in model.parameters()) * 4 / 1e9,
        'gradients': sum(p.numel() for p in model.parameters() if p.grad is not None) * 4 / 1e9,
    }
```

## Fine-Tuning and Parameter-Efficient Methods

### Full Fine-Tuning vs PEFT

| Method | Trainable Params | Memory | Performance | Speed |
|---|---|---|---|---|
| Full fine-tune | 100% | Full model | Best | Normal |
| Adapters | 1-5% | ~5% overhead | Near-full | Faster |
| Prefix tuning | 0.1-1% | Negligible | -1-2% | Fastest |
| LoRA | 0.1-2% | Negligible | Near-full | Fastest |
| (IA)^3 | 0.01-0.1% | Negligible | -2-5% | Fastest |
| AdaLoRA | 0.1-2% (adaptive) | Negligible | Near-full | Fast |

### LoRA (Low-Rank Adaptation)

```python
import torch.nn as nn

class LoRALayer(nn.Module):
    def __init__(self, original_linear, rank=8, alpha=16):
        super().__init__()
        self.original = original_linear
        in_features = original_linear.in_features
        out_features = original_linear.out_features
        self.lora_A = nn.Parameter(torch.zeros(rank, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))
        self.scaling = alpha / rank
        nn.init.kaiming_uniform_(self.lora_A, a=math.sqrt(5))

        # Freeze original weights
        for param in self.original.parameters():
            param.requires_grad = False

    def forward(self, x):
        return self.original(x) + (x @ self.lora_A.T @ self.lora_B.T) * self.scaling
```

### QLoRA (Quantized LoRA)

QLoRA combines 4-bit NormalFloat quantization with LoRA, enabling fine-tuning of 65B models on a single 48GB GPU. The base model weights are quantized to 4-bit NF4 format. LoRA adapters are trained in float16. Double quantization reduces memory further by quantizing the quantization constants.

```python
# Using bitsandbytes + peft
from transformers import BitsAndBytesConfig
from peft import LoraConfig, get_peft_model

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-70b-hf",
    quantization_config=bnb_config,
    device_map="auto",
)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
```

## Training Stabilization Techniques

### Gradient Clipping

```python
# By value
torch.nn.utils.clip_grad_value_(model.parameters(), clip_value=1.0)

# By norm (preferred for transformers)
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0, norm_type=2.0)

# Adaptive clipping for transformers
max_grad_norm = model.config.max_grad_norm or 1.0
```

### Label Smoothing

```python
class LabelSmoothingCrossEntropy(nn.Module):
    def __init__(self, smoothing=0.1):
        super().__init__()
        self.smoothing = smoothing
        self.confidence = 1.0 - smoothing

    def forward(self, pred, target):
        log_probs = F.log_softmax(pred, dim=-1)
        nll_loss = -log_probs.gather(dim=-1, index=target.unsqueeze(1))
        nll_loss = nll_loss.squeeze(1)
        smooth_loss = -log_probs.mean(dim=-1)
        loss = self.confidence * nll_loss + self.smoothing * smooth_loss
        return loss.mean()
```

### Warmup and Annealing

```python
def get_cosine_schedule_with_warmup(
    optimizer, num_warmup_steps, num_training_steps, min_lr_ratio=0.1
):
    def lr_lambda(current_step):
        if current_step < num_warmup_steps:
            return float(current_step) / float(max(1, num_warmup_steps))
        progress = float(current_step - num_warmup_steps) / float(
            max(1, num_training_steps - num_warmup_steps)
        )
        return max(min_lr_ratio, 0.5 * (1.0 + math.cos(math.pi * progress)))

    return scheduler.LambdaLR(optimizer, lr_lambda)
```

### Weight Decay (AdamW)

```python
# Apply weight decay only to non-bias/norm parameters
no_decay = ["bias", "LayerNorm.weight", "layer_norm.weight"]

optimizer_grouped_parameters = [
    {
        "params": [p for n, p in model.named_parameters()
                   if not any(nd in n for nd in no_decay)],
        "weight_decay": 0.01,
    },
    {
        "params": [p for n, p in model.named_parameters()
                   if any(nd in n for nd in no_decay)],
        "weight_decay": 0.0,
    },
]
optimizer = torch.optim.AdamW(optimizer_grouped_parameters, lr=5e-5)
```

## Evaluation and Checkpointing

### Best Practice Checkpoint Strategy

```python
best_val_loss = float('inf')
patience_counter = 0
early_stop_patience = 5

for epoch in range(num_epochs):
    train_loss = train_epoch(model, loader, optimizer, scaler)
    val_loss = validate(model, val_loader, criterion)

    if val_loss < best_val_loss:
        best_val_loss = val_loss
        patience_counter = 0
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'scheduler_state_dict': scheduler.state_dict(),
            'scaler_state_dict': scaler.state_dict(),
            'best_val_loss': best_val_loss,
            'config': model_config,
        }
        torch.save(checkpoint, 'best_model.pt')
    else:
        patience_counter += 1
        if patience_counter >= early_stop_patience:
            print(f"Early stopping at epoch {epoch}")
            break

    # Periodic checkpoint for resume
    if epoch % 5 == 0:
        torch.save(checkpoint, f'checkpoint_epoch_{epoch}.pt')
```

## References
- PyTorch DDP Documentation: https://pytorch.org/docs/stable/ddp.html
- PyTorch FSDP Documentation: https://pytorch.org/docs/stable/fsdp.html
- DeepSpeed Documentation: https://www.deepspeed.ai/
- Shoeybi et al. "Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism" (2019)
- Rajbhandari et al. "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models" (2020)
- Micikevicius et al. "Mixed Precision Training" (2017)
- Hu et al. "LoRA: Low-Rank Adaptation of Large Language Models" (2021)
- Dettmers et al. "QLoRA: Efficient Finetuning of Quantized Language Models" (2023)
- Vaswani et al. "Attention Is All You Need" (2017)
- Loshchilov and Hutter. "Decoupled Weight Decay Regularization" (2017)
- Smith and Topin. "Super-Convergence: Very Fast Training of Neural Networks" (2017)
- Goyal et al. "Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour" (2017)
