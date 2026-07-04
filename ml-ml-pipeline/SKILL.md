---
name: ml-ml-pipeline
description: >
  Advanced machine learning pipeline execution and orchestration.
  Supports DeepSpeed and CUDA optimizations.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, pipeline, deepspeed, cuda]
---
# ML Pipeline Optimization

## Purpose
Comprehensive description of the ML pipeline skill, optimizing DeepSpeed training and custom CUDA kernel integration.

## Core Principles
1. Maximize GPU utilization.
2. Minimize memory bandwidth bottlenecks.
3. Scale efficiently across multi-node topologies.
4. Exploit mixed precision where numerically stable.
5. Profile aggressively using NSight Systems.

## Agent Protocol
- Triggers: User requests ML training optimization.
- Input Context Required: Model architecture, dataset size, hardware topology.
- Output Artifact: Optimized DeepSpeed config and CUDA extensions.
- Response Formats: 
```json
{
  "status": "optimized",
  "throughput_tflops": 150.5
}
```

## Decision Matrix
```text
[Start] --> (Is model > 10B params?)
  |-- Yes --> [Use DeepSpeed ZeRO-3]
  |-- No --> [Use DeepSpeed ZeRO-2]
```

## Detailed Architectural Overview
```text
+-------------+      +--------------+
| Data Loader | ---> | CUDA Kernels |
+-------------+      +--------------+
```
Lifecycle: Init -> Forward -> Backward -> Step

## Workflow Steps
Phase 1: Setup
1. Init distributed environment.
2. Load dataset.
3. Allocate tensors.
4. Warmup CUDA cache.
Phase 2: Execution
1. Forward pass.
2. Loss computation.
3. Backward pass.
4. Optimizer step.
Phase 3: Profiling
1. Capture traces.
2. Analyze latency.
3. Identify bottlenecks.
4. Tune hyperparameters.
Phase 4: Checkpointing
1. Sync ranks.
2. Save weights.
3. Save optimizer state.
4. Upload to remote storage.
Phase 5: Validation
1. Run eval loop.
2. Compute metrics.
3. Log to WandB.
4. Check early stopping.
Phase 6: Teardown
1. Flush buffers.
2. Destroy process group.
3. Release memory.
4. Exit safely.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---|---|---|
| OOM | Batch size too large | Reduce micro-batch size |
| Slow Epochs | Dataloader bottleneck | Increase num_workers |
| NaN Loss | High learning rate | Clip gradients, lower LR |
| NCCL Timeout | Network issue | Check InfiniBand interfaces |
| Low GPU Util | CPU bound | Move preprocessing to GPU |
| CUDA error | Illegal memory access | Check tensor indices |

## Complete Execution Scenario
```text
User -> Agent: Optimize model
Agent -> DeepSpeed: Generate config
DeepSpeed -> GPU: Train
GPU -> Agent: Return metrics
```

## Rules and Guidelines
1. Always use flash attention for transformers.
2. Prefer bfloat16 over fp16.
3. Enable gradient checkpointing for large models.
4. Overlap compute and communication.
5. Keep global batch size consistent.

## Reference Guides
- [CUDA Optimizations 1](references/ref1.md)
- [DeepSpeed Latency 2](references/ref2.md)
- [Kernel Fusion 3](references/ref3.md)
- [Memory Management 4](references/ref4.md)
- [Distributed Training 5](references/ref5.md)
- [ZeRO Stages 6](references/ref6.md)
- [Hardware Topology 7](references/ref7.md)
- [Profiling Tools 8](references/ref8.md)

## Handoff
Refer to `data-preprocessing` skill for upstream tasks.

<!-- COMPRESSION FOOTER -->
