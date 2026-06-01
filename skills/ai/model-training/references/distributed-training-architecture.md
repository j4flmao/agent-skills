# Distributed Training Architecture

## Overview
Distributed training architectures partition model parameters, data, or computations across multiple GPUs and nodes to train models that exceed single-device memory or to accelerate training through parallelism. Modern LLM training combines multiple parallelism strategies.

## Parallelism Taxonomy

### Data Parallelism (DP)
Each GPU holds a complete copy of the model and processes different micro-batches of data. Gradients are all-reduced across GPUs after each step.
```
GPU 0: [batch_0] → forward → backward → gradients
GPU 1: [batch_1] → forward → backward → gradients
GPU 2: [batch_2] → forward → backward → gradients
GPU 3: [batch_3] → forward → backward → gradients
              → all_reduce(gradients) →
              → optimizer step (all GPUs have same update)
```
| Variant | Memory per GPU | Communication | Notes |
|---------|:--------------:|:-------------:|-------|
| DDP | Full model | All-reduce grads | Simple, good for small models |
| FSDP SHARD_GRAD_OP | Full params, shard grads+opt | All-reduce grads | Good for ≤7B |
| FSDP FULL_SHARD | Shard params+grads+opt | All-gather + all-reduce | Good for ≥13B |
| DeepSpeed ZeRO-1 | Full params+grads, shard opt | All-reduce grads | 4x optimizer memory saving |
| DeepSpeed ZeRO-2 | Full params, shard grads+opt | All-reduce grads | 8x total memory saving |
| DeepSpeed ZeRO-3 | Shard params+grads+opt | All-gather + all-reduce | Linear memory scaling |

### Tensor Parallelism (TP)
Each GPU holds a shard of each tensor (e.g., columns of weight matrix). Forward/backward requires communication between TP-group GPUs for each operation.
```
Without TP:
  x → W (12288 x 12288) → output (12288)

With TP (2 GPUs):
  GPU 0: x → W_0 (12288 x 6144) → output_0 (6144)
  GPU 1: x → W_1 (12288 x 6144) → output_1 (6144)
  all_reduce(output_0 + output_1) → output (12288)
```
| TP Size | Communication | Best For | Overhead |
|:-------:|:-------------:|----------|:--------:|
| 2 | All-reduce per op | 13B-30B models | ~5% |
| 4 | All-reduce per op | 30B-70B models | ~10% |
| 8 | All-reduce per op | 70B-175B models | ~15% |

TP requires high intra-node bandwidth (NVLink/NVSwitch). Do not use TP across nodes.

### Pipeline Parallelism (PP)
Model layers are split across GPUs/stages. Each GPU holds a contiguous subset of layers. Micro-batches flow through the pipeline.
```
PP=4, micro-batches=8 (F=forward, B=backward):
Time →
GPU 0: F0 F1 F2 F3 F4 F5 F6 F7 B0 B1 B2 B3 B4 B5 B6 B7
GPU 1:    F0 F1 F2 F3 F4 F5 F6 F7 B0 B1 B2 B3 B4 B5 B6 B7
GPU 2:       F0 F1 F2 F3 F4 F5 F6 F7 B0 B1 B2 B3 B4 B5 B6 B7
GPU 3:          F0 F1 F2 F3 F4 F5 F6 F7 B0 B1 B2 B3 B4 B5 B6 B7

Bubble (idle time) = (PP-1) / micro_batches
Micro-batches=8, PP=4: bubble = 3/8 = 37.5%
Micro-batches=32, PP=4: bubble = 3/32 = 9.4%
```
| Schedule | Memory | Bubble | Complexity |
|----------|:------:|:------:|:----------:|
| GPipe | High | High | Low |
| 1F1B | Low | Same | Medium |
| Interleaved 1F1B | Medium | 2x lower | High |

### 3D Parallelism (DP + TP + PP)

```
Example: 64 GPUs organized as DP=4, TP=4, PP=4

GPU Index Mapping:
  DP group 0: GPUs 0-15  (train on micro-batch 0)
    TP group 0: GPUs 0-3    (tensor parallel: layer shard)
    TP group 1: GPUs 4-7    (tensor parallel: layer shard)
    PP stage 0: GPUs 0-7    (pipeline: layers 0-8)
    PP stage 1: GPUs 8-15   (pipeline: layers 9-16)
  DP group 1: GPUs 16-31 (train on micro-batch 1)
  DP group 2: GPUs 32-47 (train on micro-batch 2)
  DP group 3: GPUs 48-63 (train on micro-batch 3)

Communication:
  - Within TP group: all-reduce (intra-node, NVSwitch)
  - Between PP stages: P2P send/recv (inter-node, InfiniBand)
  - Between DP groups: all-reduce grads (inter-node, InfiniBand)
```

## Communication Patterns

### Collective Operations
| Operation | Description | Cost (Ring) |
|-----------|-------------|:-----------:|
| All-reduce | Sum across ranks, result on all ranks | 2 * (N-1)/N * data |
| All-gather | Gather all shards to all ranks | (N-1)/N * data |
| Reduce-scatter | Sum and shard across ranks | (N-1)/N * data |
| Broadcast | Send from one rank to all | data |
| P2P send/recv | Between two ranks | point-to-point |

### Bandwidth Requirements
```
All-reduce time = 2 * message_size / bandwidth * (N-1)/N
For 70B model, BF16 = 140 GB:
  All-reduce 140 GB at:
    25G Ethernet (3 GB/s): 93 seconds per step!
    200G InfiniBand (25 GB/s): 11 seconds per step
    NVSwitch (450 GB/s): 0.6 seconds per step (intra-node)
```

## NCCL (NVIDIA Collective Communications Library)

### NCCL Algorithms
```bash
export NCCL_ALGO=Ring    # Ring all-reduce: good for large messages
export NCCL_ALGO=Tree    # Tree all-reduce: good for small messages
export NCCL_ALGO=NVLS    # NVLink SHARP: DGX-specific, fastest
```

### NCCL Important Variables
```bash
export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1   # InfiniBand HCAs
export NCCL_SOCKET_IFNAME=eth0          # TCP interface for bootstrap
export NCCL_IB_GID_INDEX=3              # RoCE v2 GID index
export NCCL_IB_TIMEOUT=22               # IB timeout (2200 ms)
export NCCL_IB_RETRY_CNT=13             # IB retry count
export NCCL_IB_QPS_PER_CONNECTION=8     # QPs per connection
export NCCL_NET_GDR_LEVEL=2             # GPU Direct RDMA (0=off, 2=P2P)
export NCCL_P2P_LEVEL=NVL               # P2P via NVLink only
export NCCL_DEBUG=WARN                  # Verbosity: FATAL, WARN, INFO, VERSION
export NCCL_MIN_NCHANNELS=16            # Minimum channels for bandwidth
```

### NCCL Topology Detection
```bash
# Check NCCL topology
nccl-topo-dumper.sh  # or use nvidia-smi topo -m

# Expected output for DGX H100:
# GPU0  GPU1  GPU2  GPU3  GPU4  GPU5  GPU6  GPU7  NIC0  NIC1
# GPU0  NV8   NV8   NV8   NV8   NV8   NV8   NV8   NV8   NODE  NODE
# NV8 = NVSwitch (600 GB/s)
# NODE = through CPU (25-50 GB/s)
```

## Memory Management Across Parallelism Strategies

### Memory Breakdown (per GPU, 70B Model)
| Strategy | Parameters | Gradients | Optimizer | Activations | Total |
|----------|:----------:|:---------:|:---------:|:-----------:|:-----:|
| DDP (8 GPUs) | 140 GB | 140 GB | 280 GB | 40 GB | 600 GB ❌ |
| FSDP FULL_SHARD (8) | 17.5 GB | 17.5 GB | 35 GB | 40 GB | 110 GB ❌ |
| FSDP + Act CKPT (8) | 17.5 GB | 17.5 GB | 35 GB | 5 GB | 75 GB ✅ |
| FSDP + Act CKPT (16) | 8.75 GB | 8.75 GB | 17.5 GB | 5 GB | 40 GB ✅ |
| TP=8, PP=4, DP=2 | 17.5 GB | 17.5 GB | 35 GB | 5 GB | 75 GB ✅ |
| 3D: TP=8, PP=8, DP=4 | 2.2 GB | 2.2 GB | 4.4 GB | 5 GB | 13.8 GB ✅ |

## Node Architecture

### Single Node (DGX-Style)
```
8 GPUs connected via NVSwitch (NVLink fully connected)
  - All-to-all bandwidth: 600-900 GB/s (depends on generation)
  - No need for TP across nodes
  - FSDP HYBRID_SHARD: shard within node, replicate across nodes
```

### Multi-Node Cluster
```
Node 0: [GPU0 GPU1 GPU2 GPU3 GPU4 GPU5 GPU6 GPU7]
          |    |    |    |    |    |    |    |
         NIC0 NIC1 ... (200/400G InfiniBand or 100/200G Ethernet)
          |    |    |    |    |    |    |    |
         NIC0 NIC1 ...
Node 1: [GPU0 GPU1 GPU2 GPU3 GPU4 GPU5 GPU6 GPU7]

Inter-node: 200-400 Gbps per GPU (HDR/NDR InfiniBand)
Intra-node: 600-900 GB/s NVSwitch
Ratio: intra-node is 20-50x faster than inter-node
```

### Hierarchical Communication
```
All-reduce on 256 GPUs (2-level hierarchy):
  1. Intra-node all-reduce: 8 GPUs via NVSwitch (fast)
  2. Inter-node all-reduce: 32 nodes via InfiniBand (slow)
  3. Combine: reduce-scatter within node, all-reduce across nodes, all-gather within node
```

## Scaling Efficiency

### Strong Scaling (fixed total workload)
```python
# Time to convergence vs GPU count
# Ideal: double GPUs → half time
# Reality: communication overhead limits scaling

# Amdahl's Law for distributed training:
# Speedup = 1 / ((1 - P) + P/N)
# where P = parallelizable fraction, N = GPUs

# Typical scaling efficiency:
# N=8:   95% (7.6x speedup)
# N=64:  85% (54x speedup)
# N=256: 70% (180x speedup)
# N=1024: 50% (512x speedup)
```

### Weak Scaling (fixed work per GPU)
```python
# Total workload grows with GPU count
# Goal: 1.0x speedup for doubling GPUs
# More common for pre-training (larger batch = faster convergence)

# Scaling efficiency:
# N=8:   98%
# N=64:  92%
# N=256: 85%
# N=1024: 70%
```

## Recommended Configurations by Model Size

| Model Size | GPUs | Memory per GPU | Strategy | Notes |
|:----------:|:----:|:--------------:|----------|-------|
| 1B-3B | 1-2 | 24 GB | DDP or single GPU | Fit on consumer GPUs |
| 7B | 1-8 | 24-80 GB | FSDP SHARD_GRAD_OP or ZeRO-2 | 1x A100 or 2-4x 4090 |
| 13B | 4-16 | 80 GB | FSDP FULL_SHARD or ZeRO-3 | 4-8x A100 recommended |
| 34B | 8-32 | 80 GB | FSDP FULL_SHARD + act ckpt | 8x A100 minimum |
| 70B | 16-64 | 80 GB | FSDP FULL_SHARD or TP=8+PP=2+DP | 32x A100 recommended |
| 175B | 64-256 | 80 GB | 3D: TP=8, PP=8, DP=N | Megatron-DeepSpeed |
| 405B | 128-512 | 80-141 GB | 3D: TP=8, PP=16, DP=N | H100/H200 required |

## Key Points
- Data parallelism alone is insufficient for models > 13B — need FSDP or ZeRO
- Tensor parallelism only within a node (NVLink required)
- Pipeline parallelism reduces peak memory but introduces idle time (bubble)
- 3D parallelism (DP + TP + PP) scales to 1000+ GPUs
- Communication bandwidth is the primary bottleneck at scale
- InfiniBand preferred over Ethernet for multi-node training
- Always overlap communication with computation
- Profile before optimizing: measure GPU utilization, communication time, data loading time
- Scaling efficiency drops with GPU count — budget for 70-90% efficiency depending on cluster
- Use HYBRID_SHARD for multi-node FSDP, FULL_SHARD for single-node
