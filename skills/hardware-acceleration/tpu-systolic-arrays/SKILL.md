---
name: tpu-systolic-arrays
description: >
  Use this skill when the user says 'tpu', 'systolic array', 'mxu', 'matrix multiply unit', 'xla on tpu', 'jax tpu', 'pallas', 'tpu performance', 'tpu padding', 'weight stationary'. Explains Google TPU architecture (systolic MXU, vector/scalar units, HBM, interconnect) and turns it into concrete rules for writing fast JAX / PyTorch-XLA code: shapes, dtypes, static compilation, sharding and custom Pallas kernels. Do NOT use for: NVIDIA GPU kernels (cuda-programming, triton-kernels), GPU multi-node fabrics (rdma-roce), framework-agnostic distributed training on GPUs (distributed-training).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, tpu, systolic-array, xla, jax, pallas]
---

# TPU Systolic Arrays

## Purpose
A TPU spends most of its silicon on systolic matrix-multiply units (MXUs) fed by on-chip memory and HBM, controlled by a compiler (XLA) rather than by thousands of hardware threads. Performance comes from giving XLA large, static, well-aligned matrix multiplies in bfloat16 and from sharding across chips over the inter-chip interconnect. Understanding the systolic data flow explains the shape and dtype rules.

## Agent Protocol

### Trigger
"tpu", "systolic array", "mxu", "xla tpu", "jax tpu", "pallas", "tpu utilization", "tpu padding", "weight stationary", "pod slice".

### Input Context
- TPU generation and slice topology, framework (JAX, PyTorch/XLA, Keras), model shapes and dtypes.
- Profiler trace (XProf / TensorBoard profile) if diagnosing.

### Output Artifact
Shape/dtype/sharding recommendations + code + profiling steps. No file unless requested.

### Response Format
```
Bottleneck: {MXU-bound|HBM-bound|host/input-bound|recompilation|communication}
Evidence: {profile metric}
Change: {shape padding|dtype|sharding|kernel}
Expected: {metric to re-check}
```

### Completion Criteria
- [ ] No repeated recompilations in steady state.
- [ ] Matmul dimensions aligned to MXU tiles; bf16 inputs with f32 accumulation.
- [ ] Input pipeline keeps up (device not idle waiting on host).
- [ ] Profile confirms MXU utilization improved.

## How a Systolic Array Multiplies
Weight-stationary design (as described for TPU v1):
1. A tile of the weight matrix is loaded into the grid of multiply-accumulate (MAC) cells and held there.
2. Activations enter from one edge, staggered in time, and move one cell per cycle across the array.
3. Each cell multiplies its stationary weight by the passing activation and adds the partial sum arriving from its neighbor, passing the result onward.
4. Completed dot products exit the far edge into accumulators.

Each operand is read from memory once and reused across a whole row/column of cells, so an N x N array performs N² MACs per cycle with little register-file or memory traffic. The cost: work that is not a large dense matmul (or that leaves the array partly empty) runs at a fraction of peak.

## Architecture by Generation (high level)
| Generation | Notes |
|------------|-------|
| TPU v1 (inference) | 256x256 8-bit MAC array, 32-bit accumulators, large on-chip unified buffer, DDR3 weight memory, instructions sent by host over PCIe. |
| TPU v2 / v3 | Training: bfloat16 multiplies with FP32 accumulation, 128x128 MXUs, HBM, inter-chip interconnect forming pods. |
| TPU v4 / v5e / v5p | More MXUs per core, SparseCores for embeddings (v4, v5p), optically reconfigurable pod interconnect (v4). |
| TPU v6e (Trillium) and later | Larger MXUs (256x256) and higher HBM bandwidth; check current Cloud TPU docs for per-chip specs. |

Each TensorCore also has a vector unit (elementwise ops, activations, reductions) and a scalar unit (control, addresses). XLA schedules all of them statically.

## Rules for Fast TPU Code
1. **Use bfloat16** for weights/activations; keep accumulation and sensitive reductions in float32 (`preferred_element_type=jnp.float32`).
2. **Align shapes**: make matmul dimensions multiples of 128 (256 helps on 256x256-MXU chips). XLA tiles arrays on their last two dimensions (typically 8 x 128 for 32-bit types), so a trailing dim of 129 wastes almost half a tile.
3. **Static shapes**: every new shape triggers an XLA compile. Pad/bucket variable sequence lengths; avoid Python-side shape-dependent control flow inside `jit`.
4. **Large batches per core** keep the MXU full; tiny per-core batches are dominated by weight loads.
5. **Fuse elementwise work** by keeping it inside one `jit` so XLA fuses it into matmul epilogues instead of round-tripping HBM.
6. **Feed the device**: use `tf.data`/Grain with prefetching; host input pipelines are a frequent bottleneck.
7. **Shard explicitly** across chips with `jax.sharding` meshes (data + model axes) and let XLA's GSPMD insert collectives.

## JAX Example: Sharded, bf16, Aligned Matmul
```python
import jax
import jax.numpy as jnp
import numpy as np
from jax.sharding import Mesh, NamedSharding, PartitionSpec as P

devices = np.array(jax.devices()).reshape(-1, 1)        # (data, model) mesh
mesh = Mesh(devices, axis_names=("data", "model"))

@jax.jit
def dense(x, w):
    return jnp.dot(x, w, preferred_element_type=jnp.float32).astype(jnp.bfloat16)

batch, d_in, d_out = 1024, 4096, 4096                   # multiples of 128
x = jax.device_put(jnp.ones((batch, d_in), jnp.bfloat16), NamedSharding(mesh, P("data", None)))
w = jax.device_put(jnp.ones((d_in, d_out), jnp.bfloat16), NamedSharding(mesh, P(None, "model")))
y = dense(x, w)
y.block_until_ready()
```

## Custom Kernels with Pallas
When XLA fusion is insufficient (e.g. custom attention, ragged ops), Pallas (`jax.experimental.pallas`, with TPU-specific `pallas.tpu`) lets you write blocked kernels that explicitly move tiles between HBM and on-chip VMEM. Block shapes should respect the same 8 x 128 tiling. Prefer existing kernels (e.g. JAX's Pallas flash-attention for TPU) before writing new ones.

## Profiling
```python
jax.profiler.start_trace("/tmp/tpu-trace")
y = dense(x, w); y.block_until_ready()
jax.profiler.stop_trace()      # open with TensorBoard profile plugin / XProf
```
Check: step time breakdown (device vs host idle), MXU/FLOPs utilization, HBM bandwidth, top HLO ops, and the count of compilations (`jax.config.update("jax_log_compiles", True)`).

## TPU vs GPU in One Table
| Aspect | TPU | NVIDIA GPU |
|--------|-----|------------|
| Compute core | Few large systolic MXUs per core | Many SMs with tensor cores, SIMT threads |
| Scheduling | Static, compiler (XLA) | Dynamic hardware warp scheduling |
| Programming | JAX / PyTorch-XLA / TF, Pallas | CUDA, Triton, PyTorch eager + compilers |
| Strength | Large dense matmuls, big pods, static shapes | Flexibility, dynamic shapes, custom kernels, ecosystem |

## Anti-Patterns
- Dynamic shapes per batch causing constant recompilation.
- Odd dimensions (e.g. hidden size 1000) leaving MXU tiles partly empty.
- float32 everywhere (much lower MXU throughput, double memory).
- Host-side Python loops calling small jitted functions per step element.
- Gathering a full sharded array to host for logging every step.

## References
- Jouppi et al., "In-Datacenter Performance Analysis of a Tensor Processing Unit" (ISCA 2017); "TPU v4" (ISCA 2023).
- Cloud TPU system architecture docs, JAX sharding and Pallas docs.
- Related: `../distributed-training/SKILL.md`.
