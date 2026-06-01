# Model Training: Advanced Distributed & Scaling Topics

## Overview
Advanced model training topics cover distributed training across multiple GPUs and nodes, memory optimization for large models, communication strategies, profiling, and scaling to 100B+ parameter models. These techniques are essential when a single GPU is insufficient for the model or dataset size.

## FSDP (Fully Sharded Data Parallel)

### How FSDP Works
FSDP shards model parameters, gradients, and optimizer states across GPUs. During forward/backward, it gathers parameters on-demand (all-gather) and then discards them (reshard).

```
Standard DDP:    Each GPU has full model copy.
FSDP FULL_SHARD: Parameters spread across GPUs.
                 GPU 0: layers 0-9  (shard 1)
                 GPU 1: layers 10-19 (shard 2)
                 GPU 2: layers 20-29 (shard 3)
                 GPU 3: layers 30-39 (shard 4)

Memory per GPU (70B model, BF16):
  DDP:              70B * 2 bytes = 140 GB (won't fit on A100 80GB)
  FSDP FULL_SHARD:  140 GB / 8 GPUs = 17.5 GB (fits with room)
```

### FSDP Sharding Strategies
| Strategy | Shard Params | Shard Grads | Shard Optim | Memory | Communication |
|----------|:---:|:---:|:---:|--------|--------------|
| `NO_SHARD` (DDP) | No | No | No | Highest | Lowest |
| `SHARD_GRAD_OP` | No | Yes | Yes | Medium | Medium |
| `FULL_SHARD` (ZeRO-3) | Yes | Yes | Yes | Lowest | Highest |
| `HYBRID_SHARD` | Within-node shard + inter-node replicate | Hybrid | Medium-High |

### FSDP Configuration
```python
from torch.distributed.fsdp import (
    FullyShardedDataParallel as FSDP,
    MixedPrecision,
    BackwardPrefetch,
    ShardingStrategy,
    CPUOffload,
)
from torch.distributed.fsdp.wrap import transformer_auto_wrap_policy
import torch.nn as nn

# Configure mixed precision
mp_policy = MixedPrecision(
    param_dtype=torch.bfloat16,
    reduce_dtype=torch.bfloat16,
    buffer_dtype=torch.bfloat16,
)

# Auto-wrap policy: wrap each transformer layer in FSDP
auto_wrap_policy = partial(
    transformer_auto_wrap_policy,
    transformer_layer_cls={LlamaDecoderLayer, MistralDecoderLayer, GemmaDecoderLayer},
)

model = FSDP(
    model,
    sharding_strategy=ShardingStrategy.FULL_SHARD,
    mixed_precision=mp_policy,
    auto_wrap_policy=auto_wrap_policy,
    backward_prefetch=BackwardPrefetch.BACKWARD_PRE,
    cpu_offload=CPUOffload(offload_params=False),
    limit_all_gathers=True,
    device_id=torch.cuda.current_device(),
)
```

### FSDP Tuning Tips
- Set `forward_prefetch=False` (default) — prefetch often hurts throughput
- Set `backward_prefetch=BACKWARD_PRE` to overlap gradient computation with all-gather
- Set `limit_all_gathers=True` to avoid OOM from in-flight all-gathers
- Wrap only transformer layers, not embeddings or LM head
- Use `SHARD_GRAD_OP` for small models (≤7B) and `FULL_SHARD` for large models (≥13B)
- For multi-node: prefer `HYBRID_SHARD` to reduce inter-node communication

## DeepSpeed ZeRO Stages

### ZeRO Stage Overview
| Stage | Params | Grads | Optim States | Memory Savings | Comm Volume |
|-------|:------:|:-----:|:------------:|:--------------:|:-----------:|
| ZeRO-1 (stage 1) | Replicated | Replicated | Partitioned | 4x | Base |
| ZeRO-2 (stage 2) | Replicated | Partitioned | Partitioned | 8x | ~1.5x |
| ZeRO-3 (stage 3) | Partitioned | Partitioned | Partitioned | Linear with N GPUs | ~3x |

### Memory Breakdown (7B Model, BF16)
```
Component                     No ZeRO    ZeRO-2    ZeRO-3
Parameters (BF16)             14 GB      14 GB      14/N GB
Gradients (BF16)              14 GB      14/N GB    14/N GB
Optimizer States (Adam, FP32) 56 GB      56/N GB    56/N GB
Total per GPU                 84 GB      14+70/N    84/N GB
With N=8:                     84 GB      22.8 GB    10.5 GB
```

### DeepSpeed ZeRO-3 Config (Production)
```json
{
    "zero_optimization": {
        "stage": 3,
        "offload_optimizer": {
            "device": "cpu",
            "pin_memory": true,
            "ratio": 0.5
        },
        "offload_param": {
            "device": "cpu",
            "pin_memory": true,
            "ratio": 0.5
        },
        "overlap_comm": true,
        "contiguous_gradients": true,
        "reduce_bucket_size": 5e8,
        "stage3_prefetch_bucket_limit": 5e8,
        "stage3_param_persistence_threshold": 1e6,
        "stage3_max_live_parameters": 1e9,
        "sub_group_size": 1e9,
        "allgather_bucket_size": 5e8,
        "round_robin_gradients": true
    },
    "bf16": {"enabled": true},
    "gradient_clipping": 1.0,
    "gradient_accumulation_steps": 8,
    "train_batch_size": 256,
    "train_micro_batch_size_per_gpu": 4,
    "wall_clock_breakdown": false,
    "steps_per_print": 10
}
```

### ZeRO-Offload (CPU & NVMe)
| Offload Type | Use Case | Memory Saved | Speed Impact |
|-------------|----------|:-----------:|:-----------:|
| CPU optimizer offload | ZeRO-2 on consumer GPU | ~28 GB (Adam states) | 20-40% slower |
| CPU param offload | ZeRO-3 with limited VRAM | Parameter memory | 30-50% slower |
| NVMe offload | Bleeding-edge largest models | Almost all VRAM | 5-10x slower |

## Tensor Parallelism (Megatron-LM)

### How It Works
Tensor parallelism shards individual tensor operations (e.g., attention QKV projection, FFN) across GPUs. Each GPU computes part of the operation, then communicates to combine results.

```
Without TP: One GPU computes full attention: Q, K, V from hidden.
With TP (N=2):
  GPU 0: Q_0, K_0, V_0  (first half of heads)
  GPU 1: Q_1, K_1, V_1  (second half of heads)
  All-reduce to combine outputs
```

### When to Use TP
- Required for models > 70B where FSDP alone is insufficient
- Typically combined with PP and DP (3D parallelism)
- Best with intra-node high-bandwidth connectivity (NVLink, NVSwitch)
- Scaling: good up to 8 GPUs within a node; beyond that, communication overhead dominates

### Megatron-LM Style TP
```python
# Conceptual: column-parallel linear splits output dimension
# Row-parallel linear splits input dimension and all-reduces
# Combined with sequence parallelism to distribute seq dim too
```

## Pipeline Parallelism

### Pipeline schedules
GPipe: Equal micro-batches, flush pipeline. Bubble overhead = (P-1)/M where P = pipeline stages, M = micro-batches.

1F1B (One-Forward-One-Backward): Better memory efficiency. Schedule forward then backward passes step-by-step.

Interleaved 1F1B: Each device handles multiple stages, halves the bubble.

```
GPipe (P=4, M=8):
F0 F1 F2 F3 F4 F5 F6 F7 | B7 B6 B5 B4 B3 B2 B1 B0
                    Bubble = 3/8 = 37.5%

1F1B (P=4, M=8):
F0 F1 F2 F3 B0 F4 B1 F5 B2 F6 B3 F7 B4 B5 B6 B7
                    Bubble = 3/16 = 18.75%
```

## 3D Parallelism (Megatron-DeepSpeed)

### Combining Techniques
```
DP=2, TP=4, PP=2 → total 16 GPUs

Data Parallel groups: replicate across 2 groups
Tensor Parallel groups: shard within 4 GPUs (strong scaling)
Pipeline Parallel groups: split layers across 2 stages

GPU Layout (2 nodes x 8 GPUs):
Node 0: [TP0,PP0] [TP1,PP0] [TP2,PP0] [TP3,PP0] [TP0,PP1] [TP1,PP1] [TP2,PP1] [TP3,PP1]
Node 1: [TP0,PP0] [TP1,PP0] [TP2,PP0] [TP3,PP0] [TP0,PP1] [TP1,PP1] [TP2,PP1] [TP3,PP1]

Communication:
- TP: all-reduce within TP group (high bandwidth, intra-node)
- PP: P2P communication across PP stages
- DP: all-reduce for gradients (can be overlapped)
```

### Scaling Rules of Thumb
| Model Size | Recommendation |
|-----------|--------------|
| ≤7B | Single GPU, DDP, or FSDP SHARD_GRAD_OP |
| 7B-13B | FSDP FULL_SHARD, DS ZeRO-3 |
| 13B-70B | FSDP + CPU offload, or DeepSpeed ZeRO-3 |
| 70B-175B | 3D parallelism (TP=4/8, PP=2/4, DP=N) |
| 175B+ | 3D parallelism + NVMe offload + sequence parallelism |

## Sequence Parallelism

Distributes the sequence dimension across GPUs in addition to the hidden dimension. Used together with tensor parallelism to handle long contexts (128K+ tokens).

- Works with Megatron-LM's TP: each GPU processes a chunk of the sequence
- No additional all-reduce needed (attention outputs already reduced)
- Scales linearly with sequence length for memory

## Flash Attention

```python
# Flash Attention: IO-aware exact attention
# 2-4x faster, linear VRAM scaling with sequence length (vs quadratic)
# Supported in PyTorch 2.0+ natively

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    attn_implementation="flash_attention_2",
    torch_dtype=torch.bfloat16,
)
```

### Memory Comparison (7B, BF16, batch=1)
| Sequence Length | Standard Attention | Flash Attention |
|:---------------:|:-----------------:|:---------------:|
| 2K | 16 GB | 14 GB |
| 8K | 32 GB | 16 GB |
| 32K | OOM (120 GB) | 24 GB |
| 128K | OOM | 48 GB |

## Activation Recomputation (Checkpointing)

```python
# Full vs selective recomputation:
# - Full: recompute all activations in backward. Max memory saving.
# - Selective: recompute only expensive ops (attention softmax, FFN activation).
#   Better compute/memory trade-off.

from torch.utils.checkpoint import checkpoint

# Selective checkpoint example:
class CheckpointedAttention(nn.Module):
    def forward(self, x, mask):
        # Don't checkpoint the projection (cheap)
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        # Checkpoint the expensive attention computation
        attn_output = checkpoint(self._attention, q, k, v, mask, use_reentrant=False)
        return self.out_proj(attn_output)
```

### Recomputation Strategies
| Strategy | Memory | Compute Overhead | Best For |
|----------|--------|:----------------:|----------|
| None | 100% | 0% | Small models, lots of VRAM |
| Selective | ~60% | ~10% | Default for most training runs |
| Full | ~30% | ~20-30% | Large models, limited VRAM |
| Full + CPU offload | ~15% | ~50-80% | Bleeding edge, pre-training at scale |

## Communication Optimization

### Overlap Computation with Communication
```python
# FSDP: overlap gradient all-gather with backward computation
fsdp_config = {
    "backward_prefetch": BackwardPrefetch.BACKWARD_PRE,
    "forward_prefetch": False,
}

# DeepSpeed: overlap_comm in ZeRO config
# "overlap_comm": true  # overlaps all-reduce with backward

# Gradient bucketing: controls granularity of communication
# Larger bucket = better bandwidth utilization = more memory
# "reduce_bucket_size": 5e8  # 500M elements per bucket
```

### NCCL Tuning
```bash
# Environment variables for NCCL optimization
export NCCL_IB_TIMEOUT=22
export NCCL_IB_RETRY_CNT=13
export NCCL_IB_GID_INDEX=3
export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1  # InfiniBand interfaces
export NCCL_SOCKET_IFNAME=eth0          # Ethernet for bootstrap
export NCCL_DEBUG=INFO                   # Debug: WARN during training
export NCCL_ALGO=Ring                    # Ring or Tree
export NCCL_PROTO=Simple                 # or LL (low-latency)
export NCCL_NET_GDR_LEVEL=2              # GPU Direct RDMA
```

### Network Topology Impact
| Topology | BW per GPU | Scaling Efficiency (256 GPUs) |
|----------|:----------:|:---------------------------:|
| 1G Ethernet | 1 GB/s | ~20% |
| 25G Ethernet | 3 GB/s | ~40% |
| 100G Ethernet | 12 GB/s | ~60% |
| HDR InfiniBand (200G) | 25 GB/s | ~80% |
| NDR InfiniBand (400G) | 50 GB/s | ~90% |
| NVSwitch (DGX H100) | 450 GB/s | ~95% |

## Profiling & Debugging

```python
# PyTorch Profiler for identifying bottlenecks
from torch.profiler import profile, record_function, ProfilerActivity

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    record_shapes=True,
    profile_memory=True,
    with_stack=True,
) as prof:
    for step in range(5):
        loss = training_step(model, batch, optimizer, scheduler, scaler)
        prof.step()

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=20))
prof.export_chrome_trace("trace.json")  # View in chrome://tracing
```

### What to Profile
| Metric | Target | Action if Bad |
|--------|--------|--------------|
| GPU utilization | > 80% | Increase batch size, num_workers |
| Data loading time | < 10% of step time | Increase num_workers, use prefetch |
| Communication time | < 20% of step time | Tune NCCL, check topology |
| Computation time | > 70% of step time | Good — optimize kernels (Flash Attn, torch.compile) |
| Memory fragmentation | < 5% waste | Use expandable_segments, checkpointing |

### `torch.compile`
```python
# JIT-compile model for 10-30% throughput improvement
model = torch.compile(model, mode="reduce-overhead")
# Modes: "default" (balance), "reduce-overhead" (small models), "max-autotune" (large models)
# First step will be slow (compilation). Subsequent steps are faster.
# Compatible with FSDP, but not all ops (check torch dynamo issues).
```

## KV Cache Efficient Training

### Multi-Query Attention (MQA) / Grouped-Query Attention (GQA)
```
Standard:   num_kv_heads = num_q_heads
MQA:        num_kv_heads = 1
GQA:        num_kv_heads < num_q_heads (e.g., 8 q heads, 2 kv heads)

Used in: Llama 2 (GQA), Falcon (MQA), Mistral (GQA)
Benefits: Smaller KV cache during inference, faster decoding
Training: No change needed — models are trained with GQA/MQA architecture
```

## Mixture of Experts (MoE) Training

### Architecture
```python
# MoE replaces FFN layers with multiple "expert" FFNs
# Router selects top-k experts for each token
# Loss: standard LM loss + auxiliary load-balancing loss

class MoELayer(nn.Module):
    def __init__(self, num_experts=8, top_k=2, d_model=4096):
        self.experts = nn.ModuleList([FFN(d_model) for _ in range(num_experts)])
        self.router = nn.Linear(d_model, num_experts)

    def forward(self, x):
        routing_weights = self.router(x).softmax(dim=-1)
        top_k_weights, top_k_indices = routing_weights.topk(self.top_k, dim=-1)
        # Dispatch tokens to selected experts
        output = torch.zeros_like(x)
        for i, expert in enumerate(self.experts):
            mask = (top_k_indices == i).any(dim=-1)
            if mask.any():
                output[mask] += expert(x[mask]) * top_k_weights[mask][:, top_k_indices[mask] == i].mean(dim=-1, keepdim=True)
        return output
```

### MoE Training Considerations
- All-to-all communication for expert dispatch/gather
- Load balancing loss prevents "rich get richer" phenomenon
- Batch size must be large enough that all experts receive tokens
- FP32 for router weights (more precision needed for routing decisions)
- Sequence length must be long enough for expert utilization
- DeepSpeed-MoE or Megatron + Tutel for production MoE

## Long Context Training

### Ring Attention
```python
# Extend Flash Attention to arbitrary sequence lengths
# Split sequence across devices in a ring
# Each device computes partial attention, passes KV blocks around ring
# N devices = up to Nx longer context
# Communication: P2P send/recv in ring topology
```

### Positional Extensions for Long Context
```python
# Extending RoPE for longer sequences than pre-training
# Methods:
from transformers import DynamicNTKScalingRotaryEmbedding

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    rope_scaling={"type": "dynamic", "factor": 2.0},  # NTK-aware scaling
)
```

### Long Context Memory Optimization
| Technique | Max Context (7B, 80GB) | Overhead |
|-----------|:---------------------:|:--------:|
| Standard | 4K-8K | 0% |
| Flash Attn 2 | 32K-64K | ~5% slower |
| Flash Attn + Ring | 128K-512K | ~20% slower |
| Flash Attn + Ring + Sequence Parallelism | 1M+ | ~50% slower |

## Checkpointing Strategies for Large Models

```python
# For large models, saving/loading checkpoints dominates wall time
# Strategies:

# 1. Sharded state dict (FSDP/DeepSpeed)
# trainer.save_state()  # Already sharded per GPU, fast
# torch.distributed.barrier()

# 2. Consolidated checkpoint (combine shards, slow)
# merge_sharded_checkpoints()

# 3. Async checkpointing
# Save to a separate process/thread so training continues
# W&B Artifacts or S3 async upload

# 4. Distributed checkpoint with PyTorch DCP
from torch.distributed.checkpoint import save_state_dict, load_state_dict

# Save (non-blocking with async)
# Uses planner to distribute I/O across ranks
# Supports resharding (save with N GPUs, load with M GPUs)
```

## Key Points
- FSDP FULL_SHARD (ZeRO-3 equivalent) is the default for HuggingFace distributed training
- 3D parallelism (DP + TP + PP) needed for models > 70B
- Flash Attention is essential for long contexts — always enable it
- Communication overhead dominates at scale: overlap, tune NCCL, use high-BW interconnects
- Profile before optimizing: GPU utilization is the primary metric
- `torch.compile` provides free speedup but must verify correctness
- Sharded checkpointing saves time; consolidated checkpoints for portability
- Ring attention + parallelism enables training on million-token contexts
- MoE requires large batches and load-balancing regularization
- DF32/TF32 on A100+ provides FP32 accuracy with FP16 speed
