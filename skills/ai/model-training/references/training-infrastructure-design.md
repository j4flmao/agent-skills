# Training Infrastructure Design

## Overview
Training infrastructure encompasses the compute, storage, networking, and software stack required to train LLMs. Design decisions directly impact training throughput, maximum model size, cost, and team productivity.

## Compute Selection

### GPU Comparison
| GPU | VRAM | VRAM BW | FP16/BF16 TFLOPS | Interconnect | Best For |
|:---:|:----:|:-------:|:-----------------:|:------------:|----------|
| RTX 4090 | 24 GB | 1.0 TB/s | 82 | PCIe 4.0 x16 | LoRA/QLoRA, ≤7B, prototyping |
| RTX 6000 Ada | 48 GB | 0.96 TB/s | 91 | PCIe 4.0 x16 | LoRA ≤13B, small full FT |
| A10G | 24 GB | 0.6 TB/s | 62 | PCIe 4.0 | Budget cloud option |
| L40S | 48 GB | 0.86 TB/s | 183 | PCIe 4.0 | Moderate training, inference |
| A100 80GB | 80 GB | 2.0 TB/s | 312 | NVLink 600 GB/s | Standard LLM training |
| H100 80GB | 80 GB | 3.35 TB/s | 989 | NVLink 900 GB/s | High-end training |
| H200 141GB | 141 GB | 4.8 TB/s | 989 | NVLink 900 GB/s | Large model training |
| B200 | 192 GB | 8 TB/s | 2250 | NVLink 1.8 TB/s | Frontier training |
| MI300X | 192 GB | 5.3 TB/s | 653 | Infinity Fabric | AMD ecosystem |

### GPU Selection Decision Tree
```
Q: What VRAM do you need per GPU?
├── ≤ 24 GB → Consumer GPUs (RTX 4090) or A10G
│   Model limit: ≤7B with QLoRA, ≤2B with full FT
│
├── 24-48 GB → RTX 6000 Ada, L40S, A40
│   Model limit: ≤13B with LoRA, ≤7B with full FT
│
├── 48-80 GB → A100 80GB
│   Model limit: ≤70B with FSDP/LoRA, ≤13B with full FT
│
└── > 80 GB → H200, MI300X, B200
    Model limit: ≤405B with 3D parallelism
```

### CPU & RAM Requirements
```
Rule of thumb: 64 GB system RAM per GPU minimum, 128 GB recommended

CPU-GPU ratio:
- 8 CPU cores per GPU (data loading + preprocessing)
- 16 CPU cores per GPU (with CPU offload in ZeRO-3)
- 2 threads per core for data loading parallelism

Example configurations:
  1x RTX 4090: 8 cores, 64 GB RAM, 1 TB NVMe
  8x A100 DGX: 128 cores, 2 TB RAM, 4x 3.84 TB NVMe
  64x H100 cluster: 1024 cores, 16 TB RAM total, shared FS
```

## Storage Architecture

### Storage Tiers
| Tier | Medium | Latency | Bandwidth | Capacity | Cost/GB | Best For |
|:----:|:------:|:-------:|:---------:|:--------:|:-------:|----------|
| L1 | Local NVMe | 5-10 µs | 3-7 GB/s | 1-30 TB | $0.10-0.20 | Model checkpoints, tokenized cache |
| L2 | Local SSD | 50-100 µs | 0.5-1 GB/s | 1-30 TB | $0.05-0.10 | Dataset cache, intermediate outputs |
| L3 | Network NAS | 1-5 ms | 1-10 GB/s | 100 TB+ | $0.02-0.05 | Shared dataset storage, final artifacts |
| L4 | Object Store | 10-100 ms | 0.5-5 GB/s | Unlimited | $0.01-0.02 | Model registry, backup, long-term |

### Storage Requirements by Phase
```python
# Storage needs breakdown (70B model, BF16):
PHASE_STORAGE = {
    "dataset_raw": {
        "size": "50-500 GB",
        "tier": "NAS or Object Store (L3/L4)",
        "notes": "Raw JSONL/Parquet. Compressed. Immutable.",
    },
    "dataset_tokenized": {
        "size": "50-500 GB",
        "tier": "Local NVMe (L1) during training",
        "notes": "Tokenized + cached. High random-access throughput needed.",
    },
    "checkpoints": {
        "size": "140 GB per checkpoint (model) + 420 GB per checkpoint (opt states)",
        "tier": "Local NVMe (L1) during training, copied to Object Store (L4) after",
        "notes": "3-5 checkpoints simultaneously → 1-3 TB local space needed.",
    },
    "logs_metrics": {
        "size": "1-10 GB",
        "tier": "NAS or Object Store (L3/L4)",
        "notes": "Training logs, TensorBoard events, W&B cache.",
    },
    "final_model": {
        "size": "140 GB (BF16) or variable (quantized)",
        "tier": "Object Store (L4) + local copy",
        "notes": "Multiple versions stored in model registry.",
    },
    "evaluation_results": {
        "size": "1-10 GB",
        "tier": "Object Store (L4)",
        "notes": "Benchmark results, generated samples, comparison reports.",
    },
}
```

### Filesystem Recommendations
| Setup | Filesystem | Pros | Cons |
|-------|-----------|------|------|
| Single node | ext4 / XFS | Simple, fast | Not shared |
| Multi-node, shared | GPFS / Lustre | High perf, shared | Expensive, complex |
| Multi-node, cloud | NFS (EFS/Filestore) | Simple, managed | Slower, cost at scale |
| Multi-node, cloud (alt) | Object store + local NVMe | Cheaper, scalable | Needs data staging |
| DGX cluster | WEKA / VAST / Pure | Extreme perf | Vendor lock-in |

## Networking Design

### Intra-Node Networking
| Technology | BW per GPU | Topology | Latency |
|:----------:|:----------:|:--------:|:-------:|
| NVLink 3 (A100) | 600 GB/s | Fully connected | ~1 µs |
| NVLink 4 (H100) | 900 GB/s | Fully connected | ~1 µs |
| PCIe 4.0 x16 | 32 GB/s | Through CPU | ~3 µs |
| PCIe 5.0 x16 | 64 GB/s | Through CPU | ~2 µs |

### Inter-Node Networking
| Technology | BW per Port | Effective per GPU | Relative Cost |
|:----------:|:----------:|:-----------------:|:-------------:|
| 1G Ethernet | 0.125 GB/s | 0.02 GB/s | 1x |
| 25G Ethernet | 3.1 GB/s | 0.4 GB/s | 2x |
| 100G Ethernet | 12.5 GB/s | 1.6 GB/s | 4x |
| 200G HDR IB | 25 GB/s | 3.1 GB/s | 8x |
| 400G NDR IB | 50 GB/s | 6.25 GB/s | 12x |
| 800G XDR IB | 100 GB/s | 12.5 GB/s | 20x |

### Network Topology for GPU Clusters
```
Fat-Tree (recommended):
  Leaf switches: connect to GPUs
  Spine switches: connect leafs
  Full bisection bandwidth at each level

  Example: 64 GPU cluster
  - 8 nodes × 8 GPUs
  - 8 leaf switches (4 uplinks each → 32 uplinks total)
  - 8 spine switches (32 downlinks total)
  - Oversubscription ratio: 1:1

Dragonfly (HPC):
  - Groups of switches fully connected
  - Low diameter (3 hops max)
  - Better for irregular communication patterns
  - Common in HPC (Cray, HPE)
```

### Network Design Rules
1. Intra-node bandwidth should be 20-50x inter-node bandwidth
2. Oversubscription ratio should be ≤ 2:1 for training clusters
3. RDMA (RoCE v2 or InfiniBand) required for multi-node training
4. Dedicate separate networks for storage and training traffic
5. Use NCCL ordering of NICs to match GPU topology
6. Place GPUs and NICs on same PCIe root complex when possible

## Cloud vs On-Premise Decision Matrix

| Factor | Cloud | On-Premise |
|--------|-------|------------|
| Upfront cost | Low (pay-as-you-go) | High (cap ex) |
| GPU availability | Scarce (H100 waitlists) | Available if purchased |
| Scaling flexibility | Instant (up to limit) | Hard (procurement cycles) |
| Interconnect quality | Variable (shared) | Controlled (dedicated IB) |
| Storage bandwidth | Variable (shared) | Predictable |
| Data egress costs | High | None |
| Maintenance | None required | Staff needed |
| Security/compliance | Shared responsibility | Full control |
| Spot/preemptible | Available (70% cheaper) | N/A |
| Vendor lock-in | Possible (specialized infra) | Low |

### Cloud Strategies

#### Spot/Preemptible Training
```python
# Use spot instances for cost savings with fault tolerance:
STRATEGIES = {
    "checkpoint_resume": {
        "type": "Save every N steps to persistent storage. Resume on new spot instance.",
        "cost_savings": "60-80%",
        "overhead": "5-10% for checkpoint saves, resume time",
    },
    "fault_tolerant_training": {
        "type": "Use frameworks like TorchX or AWS SageMaker with automatic node replacement.",
        "cost_savings": "50-70%",
        "overhead": "10-20% for node replacement overhead",
    },
    "hybrid_spot_on_demand": {
        "type": "Use spot for most workers, on-demand for critical nodes (e.g., master).",
        "cost_savings": "50-70%",
        "overhead": "Minimal if spot preemption is rare",
    },
}

# Spot interruption best practices:
# - Save checkpoints every 10-30 minutes
# - Use checkpointSharder for fast save/load
# - Monitor spot termination notices (2-minute warning on AWS)
# - Use node pools with diversity (multiple instance types)
```

#### Cloud Provider Comparison
| Provider | GPU Options | Interconnect | Managed Training | Cost (1x A100/hr) |
|----------|:----------:|:------------:|:----------------:|:-----------------:|
| AWS | A100, H100 | EFA (up to 400G) | SageMaker | ~$3.00 |
| GCP | A100, H100, TPU | GPUDirect-TCPX | Vertex AI | ~$3.50 |
| Azure | A100, H100, MI300X | InfiniBand (ND series) | Azure ML | ~$3.50 |
| Lambda | A100, H100 | InfiniBand | No | ~$1.50 |
| CoreWeave | A100, H100 | InfiniBand | No | ~$2.00 |
| Vast.ai | Mixed | Variable | No | ~$0.50-$1.00 |
| Together | H100 | InfiniBand | Yes | API-based |

## Cluster Scheduler

### Slurm Job Script
```bash
#!/bin/bash
#SBATCH --job-name=llm-ft
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=8
#SBATCH --gpus-per-node=8
#SBATCH --cpus-per-task=8
#SBATCH --mem=1000GB
#SBATCH --time=72:00:00
#SBATCH --partition=training
#SBATCH --exclusive

# Environment
export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
export NCCL_DEBUG=WARN
export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1
export NCCL_SOCKET_IFNAME=ib0
export OMP_NUM_THREADS=8

# Node list for torchrun
MASTER_ADDR=$(scontrol show hostnames $SLURM_JOB_NODELIST | head -n 1)
MASTER_PORT=29500

torchrun \
    --nnodes=$SLURM_NNODES \
    --nproc_per_node=$SLURM_GPUS_PER_NODE \
    --rdzv_id=$SLURM_JOB_ID \
    --rdzv_backend=c10d \
    --rdzv_endpoint=$MASTER_ADDR:$MASTER_PORT \
    train.py \
    --config config.yaml \
    --dataset /shared/data/train.jsonl
```

### Kubernetes for Training
```yaml
# Volcano or Kubeflow for ML workloads on K8s
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
spec:
  tasks:
    - replicas: 4
      name: worker
      template:
        spec:
          containers:
            - name: trainer
              image: training-image:latest
              resources:
                limits:
                  nvidia.com/gpu: 8
              command: ["torchrun", "--nnodes=4", "--nproc_per_node=8", "train.py"]
              volumeMounts:
                - name: shared-data
                  mountPath: /data
                - name: checkpoints
                  mountPath: /checkpoints
      policies:
        - event: TaskCompleted
          action: "CompleteJob"
  schedulingPolicy:
    minAvailable: 4
    queue: training
```

## Power & Cooling

| GPU | TDP (Watts) | Cooling | Power per Node (8 GPUs) |
|:---:|:-----------:|:-------:|:----------------------:|
| RTX 4090 | 450 | Air | ~4,000W |
| A100 80GB | 400 | Air/ Liquid | ~6,500W |
| H100 80GB | 700 | Air/ Liquid | ~10,000W |
| H200 141GB | 700 | Liquid | ~10,200W |
| B200 | 1000 | Liquid | ~12,000W |

```python
# Power estimation for a training run
def estimate_power(gpu_type, gpu_count, hours):
    tdps = {"RTX-4090": 450, "A100-80GB": 400, "H100": 700, "H200": 700, "B200": 1000}
    system_overhead = 1.3  # CPU, RAM, networking, cooling overhead
    gpu_tdp = tdps.get(gpu_type, 400)
    kw = gpu_count * gpu_tdp * system_overhead / 1000
    kwh = kw * hours
    co2_kg = kwh * 0.4  # average grid CO2 intensity
    cost_power = kwh * 0.12  # $0.12/kWh average
    return {"kw": round(kw, 1), "kwh": round(kwh), "co2_kg": round(co2_kg), "cost_power": round(cost_power, 2)}

# Examples:
# 8x A100 for 24h: 4.2 kW, 100 kWh, 40 kg CO2, $12 power cost
# 256x H100 for 30d: 233 kW, 167,900 kWh, 67,160 kg CO2, $20,148 power cost
```

## Cost Estimation Framework

```python
def estimate_total_cost(config):
    compute_cost = config.gpu_count * config.gpu_hours * config.gpu_hourly_rate
    storage_cost = (
        config.dataset_storage_gb * config.dataset_storage_hours
        + config.checkpoint_storage_gb * config.checkpoint_storage_hours
    ) * 0.0001  # $0.0001/GB-hour approximate
    data_transfer_cost = config.data_egress_gb * 0.09  # $0.09/GB egress
    power_cost = config.kwh * 0.12  # $0.12/kWh
    personnel_cost = config.engineer_hours * 150  # $150/hr loaded cost

    return {
        "compute": compute_cost,
        "storage": storage_cost,
        "data_transfer": data_transfer_cost,
        "power": power_cost,
        "personnel": personnel_cost,
        "total": compute_cost + storage_cost + data_transfer_cost + power_cost + personnel_cost,
    }

# LoRA 7B: 1x A100, 4h: Compute=$12, Total≈$37 (incl setup/personnel)
# Full FT 70B: 32x A100, 48h: Compute=$4,608, Total≈$7,500
# Pre-train 8B: 256x H100, 720h (30d): Compute=$921,600, Total≈$950,000
```

## Key Points
- GPU memory is the primary constraint: match GPU to model size
- Local NVMe storage is essential for checkpoint I/O during training
- Network bandwidth between nodes directly determines scaling efficiency
- InfiniBand strongly preferred for multi-node; 25G+ Ethernet minimum
- Cloud offers flexibility but watch for GPU scarcity and data egress costs
- Spot instances reduce costs 60-80% but require fault-tolerant training
- Power and cooling are significant costs at scale — factor into total cost
- Shared filesystem (GPFS/Lustre) for multi-node; local NVMe + object store for cloud
- NVLink/NVSwitch within node, InfiniBand between nodes
- Budget 3-5x model size in storage for checkpoints during training
