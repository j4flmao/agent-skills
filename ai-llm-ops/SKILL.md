---
name: ai-llm-ops
description: >
  Deeply audits and enhances AI operations, handling
  distributed training, DeepSpeed, Megatron, and CUDA optimizations.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, llm, cuda, deepspeed]
---

# AI LLM Ops Skill

## Purpose
This skill provides comprehensive operational capabilities for managing, auditing, and optimizing Large Language Models, including distributed training topologies, custom CUDA kernel management, and advanced latency reduction strategies.

## Core Principles
1. Maximize compute utilization and minimize idle cycles.
2. Minimize memory bandwidth bottlenecks via kernel fusion.
3. Optimize collective communications for distributed setups.
4. Exploit pipeline and tensor parallelism effectively.
5. Guarantee deterministic distributed execution at scale.

## Agent Protocol
- Triggers: User requests for LLM optimization.
- Input Context Required: Model architecture, hardware topology.
- Output Artifact: Optimization report.
- Response Formats: JSON payload.
```json
{"status": "optimized", "throughput": "500 TFLOPS"}
```

## Decision Matrix
```text
[Start]
  |
  +-- Needs compute optimization? -> [Apply FlashAttention]
  |
  +-- Memory bound? -> [DeepSpeed ZeRO-3]
```

## Detailed Architectural Overview
```text
  +-------------+       +---------------+
  | Data Parallel| <---> | Tensor Parallel|
  +-------------+       +---------------+
          |
   [Lifecycle Phase]
```

## Workflow Steps
1. Initial profiling
   1. Analyze Nsight Compute logs
   2. Measure arithmetic intensity
   3. Baseline latency
   4. Identify kernel bounds
2. Parallelism Strategy
   1. Decide Tensor Parallelism degree
   2. Decide Pipeline Parallelism degree
   3. Decide Data Parallelism degree
   4. Configure Megatron-LM
3. Memory Optimization
   1. Enable ZeRO stage 3
   2. Offload optimizer states
   3. Quantize KV cache
   4. Gradient checkpointing
4. Compute Optimization
   1. Integrate Triton kernels
   2. Fuse layernorm + gelu
   3. Optimize flash attention
   4. Kernel autotuning
5. Communication
   1. Optimize NCCL rings
   2. Set IB environment variables
   3. Handle NVLink topologies
   4. Overlap compute and comm
6. Deployment
   1. Compile with TensorRT-LLM
   2. Benchmark final throughput
   3. Update SLA guarantees
   4. Continuous monitoring

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| OOM | Batch size too large | Reduce micro-batch size |
| Straggler | Unbalanced pipeline | Adjust PP boundaries |
| NCCL Timeout | Fabric error | Check IB links |
| High Latency | Memory bandwidth | Use fused kernels |
| Low MFU | Bad overlap | Enable sequence parallel |
| Loss Spike | BF16 instability | Check gradient clipping |

## Complete Execution Scenario
```text
[User] -> [Agent] -> [Profile] -> [Optimize] -> [Report]
```

## Rules and Guidelines
1. Always baseline before optimizing.
2. Do not mix DP and ZeRO-3 carelessly.
3. Respect memory constraints strictly.
4. Validate numerics on custom kernels.
5. Use relative paths for references.

## Reference Guides
1. [CUDA Optimizations](references/cuda_optim.md)
2. [DeepSpeed Setup](references/deepspeed.md)
3. [Megatron Layouts](references/megatron.md)
4. [Latency Math](references/latency.md)
5. [Topology Math](references/topology.md)
6. [Triton Examples](references/triton.md)
7. [TensorRT Guide](references/tensorrt.md)
8. [NCCL Tuning](references/nccl.md)

## Handoff
Refer to `hardware-ops` skill for cluster-level issues.

<!-- compression footer html comment -->
