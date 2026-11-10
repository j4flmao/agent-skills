# GPU Kernel & Inference Engineer

**Who this is for:** You write or tune CUDA/Triton kernels and LLM serving performance.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`cuda-programming`](../../skills/hardware-acceleration/cuda-programming/SKILL.md) | `hardware-acceleration/cuda-programming` | Write correct, fast CUDA C++ kernels for NVIDIA GPUs. |
| [`triton-kernels`](../../skills/hardware-acceleration/triton-kernels/SKILL.md) | `hardware-acceleration/triton-kernels` | Triton is a Python DSL and compiler for GPU kernels. |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`flash-attention`](../../skills/hardware-acceleration/flash-attention/SKILL.md) | `hardware-acceleration/flash-attention` | Compute exact softmax attention without materializing the N x N score matrix in GPU HBM. |
| [`paged-attention`](../../skills/hardware-acceleration/paged-attention/SKILL.md) | `hardware-acceleration/paged-attention` | During autoregressive decoding every request keeps Keys and Values for all past tokens. |
| [`tensorrt-optimization`](../../skills/hardware-acceleration/tensorrt-optimization/SKILL.md) | `hardware-acceleration/tensorrt-optimization` | TensorRT compiles a network (usually ONNX) into an engine optimized for one GPU model and TensorRT version: it fuses layers, selects the fastest… |
| [`extreme-quantization-mastery`](../../skills/hardware-acceleration/extreme-quantization/SKILL.md) | `hardware-acceleration/extreme-quantization` | Shrink LLM weights, activations and KV cache to 8, 4 or fewer bits so models fit in less memory and run faster. |
| [`llm-kv-cache-paged-attention`](../../skills/ai/llm-engineering/kv-cache/SKILL.md) | `ai/llm-engineering/kv-cache` | During decoding each new token attends to the keys and values of all previous tokens. |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ptx-assembly`](../../skills/hardware-acceleration/ptx-assembly/SKILL.md) | `hardware-acceleration/ptx-assembly` | PTX (Parallel Thread Execution) is NVIDIA's virtual, forward-compatible ISA. |
| [`sass-machine-code`](../../skills/hardware-acceleration/sass-machine-code/SKILL.md) | `hardware-acceleration/sass-machine-code` | SASS is the architecture-specific machine code that the SM actually executes, produced by ptxas from PTX. |
| [`tpu-systolic-arrays`](../../skills/hardware-acceleration/tpu-systolic-arrays/SKILL.md) | `hardware-acceleration/tpu-systolic-arrays` | A TPU spends most of its silicon on systolic matrix-multiply units (MXUs) fed by on-chip memory and HBM, controlled by a compiler (XLA) rather… |
| [`rdma-roce`](../../skills/hardware-acceleration/rdma-roce/SKILL.md) | `hardware-acceleration/rdma-roce` | RDMA lets a NIC read and write registered memory on a remote host without involving the remote CPU or the kernel in the data path. |
| [`distributed-training`](../../skills/hardware-acceleration/distributed-training/SKILL.md) | `hardware-acceleration/distributed-training` | Train models that are too slow or too large for one GPU by splitting data, optimizer state, parameters, or layers across devices. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill cuda-programming --skill triton-kernels --skill ml-inference-optimization
```

**Level 1 + 2 (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill cuda-programming --skill triton-kernels --skill ml-inference-optimization --skill flash-attention --skill paged-attention --skill tensorrt-optimization --skill extreme-quantization-mastery --skill llm-kv-cache-paged-attention
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`gpu-hpc`](../bundles.md#gpu-hpc) | 14 | GPU and high-performance computing: CUDA, Triton, PTX/SASS, attention kernels, quantization, distributed training, RDMA |

## Combine with

- [ML & AI Engineer](ml-ai.md)
- [MLOps Engineer](mlops.md)

## Watch out

PTX/SASS skills are for profiling-driven work; most teams stop at Triton or vendor libraries.
