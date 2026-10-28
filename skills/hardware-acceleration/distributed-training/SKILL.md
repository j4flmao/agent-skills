---
name: distributed-training
description: >
  Use this skill when the user says 'distributed training', 'multi-gpu training', 'DDP', 'FSDP', 'ZeRO', 'DeepSpeed', 'all-reduce', 'tensor parallel', 'pipeline parallel', 'torchrun', 'NCCL'. Chooses and configures a parallelism strategy (data, sharded data, tensor, pipeline, context) for PyTorch training, sizes memory, and debugs collective-communication performance. Do NOT use for: inference serving (paged-attention, tensorrt-optimization), network fabric internals (rdma-roce), single-kernel optimization (cuda-programming), experiment tracking (ml-experiment-tracking).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, distributed-training, pytorch, fsdp, deepspeed, nccl]
---

# Distributed Training

## Purpose
Train models that are too slow or too large for one GPU by splitting data, optimizer state, parameters, or layers across devices. The right strategy follows from a memory budget and the interconnect topology; communication cost, not FLOPs, usually decides scaling efficiency.

## Agent Protocol

### Trigger
"distributed training", "multi-gpu", "multi-node", "DDP", "FSDP", "ZeRO", "DeepSpeed", "Megatron", "all-reduce", "tensor parallel", "pipeline parallel", "torchrun", "NCCL".

### Input Context
- Model size (parameters), sequence length, micro-batch size, precision.
- GPU type/memory, GPUs per node, node count, intra-node (NVLink/PCIe) and inter-node (InfiniBand/RoCE) links.
- Framework (PyTorch native, DeepSpeed, Megatron-Core, Accelerate, Lightning).

### Output Artifact
Parallelism plan + launch command + config. No file unless requested.

### Response Format
```
Memory/GPU: params {GB} + grads {GB} + optimizer {GB} + activations {GB}
Strategy: {DDP|FSDP/ZeRO-n|TP=x PP=y DP=z}
Launch: {torchrun/deepspeed command}
Watch: {MFU, step time, comm/compute overlap}
```

### Completion Criteria
- [ ] Per-GPU memory estimate fits with headroom.
- [ ] Global batch = micro_batch x grad_accum x data_parallel_size documented.
- [ ] Checkpointing works with the sharding scheme (sharded/distributed checkpoint).
- [ ] Scaling efficiency measured (throughput at 1 node vs N nodes).

## Memory Model
Mixed-precision Adam needs ~16 bytes/parameter before activations: 2 (BF16 weights) + 2 (BF16 grads) + 12 (FP32 master weights, momentum, variance). A 7B model therefore needs ~112 GB of model state, more than one 80 GB GPU.

| Scheme | Model-state bytes/param per GPU (N data-parallel ranks) |
|--------|-----------------------------------------------------|
| DDP | 16 |
| ZeRO-1 (shard optimizer) | 4 + 12/N |
| ZeRO-2 (+ shard gradients) | 2 + 14/N |
| ZeRO-3 / FSDP full shard (+ shard params) | 16/N |

Activations scale with micro-batch x sequence x hidden x layers; reduce with activation checkpointing (recompute) and smaller micro-batches.

## Choosing a Strategy
```
Model state fits on one GPU?
├── Yes → DDP (simplest, fastest per-byte)
└── No → FSDP / ZeRO-3 within and across nodes
          Still too large or too slow (layer > GPU, poor overlap)?
          └── Add tensor parallel (TP) inside a node (needs NVLink)
              + pipeline parallel (PP) across nodes
              + context/sequence parallel for very long sequences
```
Rule of thumb: TP traffic is per-layer and latency-sensitive, so keep TP within an NVLink domain; DP/FSDP traffic tolerates the slower inter-node fabric.

## Collectives
- **All-reduce (DDP)**: ring algorithm sends 2(N-1)/N x size bytes per GPU, independent of N in the limit. NCCL also uses tree and NVLS (NVLink SHARP) algorithms depending on topology.
- **Reduce-scatter + all-gather (FSDP/ZeRO-3)**: params all-gathered before each layer's forward/backward, grads reduce-scattered after backward; same total volume as all-reduce plus the param gathers (~1.5x DDP traffic).
- Overlap is everything: DDP buckets gradients (`bucket_cap_mb`) and all-reduces during backward; FSDP prefetches the next layer's params.

## PyTorch DDP
```python
import os
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler

def main() -> None:
    dist.init_process_group(backend="nccl")
    local_rank = int(os.environ["LOCAL_RANK"])
    torch.cuda.set_device(local_rank)

    model = build_model().cuda(local_rank)          # build_model: user-defined
    model = DDP(model, device_ids=[local_rank])
    sampler = DistributedSampler(dataset, shuffle=True)  # dataset: user-defined
    loader = DataLoader(dataset, batch_size=8, sampler=sampler, num_workers=4, pin_memory=True)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)

    for epoch in range(10):
        sampler.set_epoch(epoch)                     # different shuffle each epoch
        for batch in loader:
            with torch.autocast("cuda", dtype=torch.bfloat16):
                loss = model(**batch).loss
            loss.backward()
            opt.step()
            opt.zero_grad(set_to_none=True)
    dist.destroy_process_group()

if __name__ == "__main__":
    main()
```
```bash
# single node, 8 GPUs
torchrun --standalone --nproc_per_node=8 train.py
# multi node (run on every node)
torchrun --nnodes=4 --nproc_per_node=8 --rdzv_backend=c10d --rdzv_endpoint=$HEAD:29500 train.py
```

## PyTorch FSDP2 (`fully_shard`)
```python
from torch.distributed.fsdp import fully_shard, MixedPrecisionPolicy

mp = MixedPrecisionPolicy(param_dtype=torch.bfloat16, reduce_dtype=torch.float32)
for block in model.layers:            # shard each transformer block separately
    fully_shard(block, mp_policy=mp)
fully_shard(model, mp_policy=mp)      # root module last
```
Wrap per transformer block so only one block's full params are materialized at a time. Save with `torch.distributed.checkpoint` (DCP), not `torch.save(model.state_dict())` on rank 0.

## DeepSpeed ZeRO Config
```json
{
  "train_micro_batch_size_per_gpu": 4,
  "gradient_accumulation_steps": 8,
  "bf16": { "enabled": true },
  "zero_optimization": {
    "stage": 3,
    "overlap_comm": true,
    "contiguous_gradients": true,
    "stage3_gather_16bit_weights_on_model_save": true
  },
  "gradient_clipping": 1.0
}
```
`offload_optimizer` / `offload_param` (CPU or NVMe) trade large slowdowns for capacity; use only when GPUs are insufficient.

## Diagnostics
```bash
export NCCL_DEBUG=INFO          # prints chosen transport (NVLink/P2P, IB, Socket) and algorithms
export TORCH_NCCL_ASYNC_ERROR_HANDLING=1
```
- "NET/Socket" in NCCL logs on an InfiniBand/RoCE cluster means RDMA is not used: check drivers, `NCCL_IB_HCA`, `NCCL_SOCKET_IFNAME`.
- Benchmark the fabric with `nccl-tests` (`all_reduce_perf -b 8 -e 4G -f 2 -g 8`) before blaming the model.
- Track MFU (model FLOPs utilization): achieved FLOPs / peak FLOPs. Compare against your own single-node baseline.

## Anti-Patterns
- Forgetting `sampler.set_epoch()` (same order every epoch) or using a non-distributed sampler (every rank sees the same data).
- Rank-0-only `torch.save` of an FSDP model (gathers everything on one GPU, OOM).
- TP across nodes over Ethernet/InfiniBand without measuring; it is usually communication bound.
- Changing world size without rescaling learning rate / global batch.
- Hangs from rank-dependent control flow (one rank skips a collective).

## References
- PyTorch distributed docs (DDP, FSDP2, DCP), DeepSpeed ZeRO docs, ZeRO paper (Rajbhandari et al., 2020).
- Related: `../rdma-roce/SKILL.md` (fabric), `../flash-attention/SKILL.md` (activation memory).
