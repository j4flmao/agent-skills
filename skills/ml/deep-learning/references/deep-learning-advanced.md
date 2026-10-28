# Deep Learning Advanced Topics: Compilation, Attention Kernels, Memory and Stability

Advanced PyTorch techniques for getting large models to train fast and stably on a fixed hardware budget: `torch.compile`, scaled dot-product attention kernels, activation checkpointing, memory profiling, low-precision formats, numerical stability, input pipeline performance and profiling. Distributed data/model parallelism (DDP, FSDP) and AMP basics are in `training-optimization.md`.

## torch.compile

```python
model = MyModel().to(device)
model = torch.compile(model)                     # default mode
# model = torch.compile(model, mode="max-autotune")   # longer compile, tuned kernels, CUDA graphs
```

- TorchDynamo captures Python bytecode into graphs; TorchInductor generates fused Triton (GPU) or C++ (CPU) kernels.
- First iterations are slow (compilation). Measure steady-state throughput.
- **Graph breaks** (unsupported Python, `.item()`, data-dependent control flow, printing) split graphs and reduce gains. Inspect with `TORCH_LOGS="graph_breaks"` or `torch._dynamo.explain(model)(inputs)`.
- **Recompilations** happen when shapes change; mark dynamic dims (`torch._dynamo.mark_dynamic(x, 0)`) or pad/bucket sequence lengths.
- Compile the model (or the hot submodules), not the whole training script. With FSDP, compile per transformer block.
- Regional compilation (`torch.compile` on a repeated block) cuts compile time for deep models.

## Attention: Scaled Dot-Product Attention (SDPA)

```python
import torch.nn.functional as F

out = F.scaled_dot_product_attention(q, k, v, attn_mask=None, dropout_p=0.0, is_causal=True)
```

- Dispatches to FlashAttention, memory-efficient attention, cuDNN attention or a math fallback depending on hardware, dtype and masks.
- Force or inspect a backend with `torch.nn.attention.sdpa_kernel([SDPBackend.FLASH_ATTENTION])`.
- Fused kernels need fp16/bf16 and supported head dimensions; arbitrary dense masks may force a slower backend. Prefer `is_causal=True` over a materialized causal mask.
- `torch.nn.attention.flex_attention` supports custom score modifications (sliding window, document masking, ALiBi) with compiled fused kernels.

## Memory: Where It Goes

| Component | Scales with |
|-----------|-------------|
| Parameters | #params x bytes/param |
| Gradients | Same as parameters (trainable) |
| Optimizer state | AdamW: 2 extra fp32 tensors per parameter (plus fp32 master weights under mixed precision) |
| Activations | Batch x sequence x hidden x layers; usually dominant for long sequences |
| Temporary buffers / fragmentation | Kernel workspaces, allocator caching |

Rule of thumb for AdamW with mixed precision: roughly 16 bytes per parameter for weights, gradients and optimizer state before activations.

### Activation Checkpointing

```python
from torch.utils.checkpoint import checkpoint

class Block(nn.Module):
    def forward(self, x):
        return checkpoint(self._forward, x, use_reentrant=False)
```

Trades extra forward compute (roughly one more forward pass per checkpointed region) for much lower activation memory. Selective checkpointing (only attention or only MLP) balances cost.

### Memory Debugging

```python
torch.cuda.memory._record_memory_history(max_entries=100_000)
run_some_steps()
torch.cuda.memory._dump_snapshot("mem.pickle")   # inspect at pytorch.org/memory_viz
print(torch.cuda.max_memory_allocated() / 2**30, "GiB peak")
```

- `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` reduces fragmentation for variable shapes.
- Out-of-memory at the first optimizer step usually means optimizer state was not budgeted.

## Low-Precision Formats

| Format | Range/precision | Notes |
|--------|-----------------|-------|
| fp32 | Full | Baseline; master weights |
| TF32 | fp32 range, 10-bit mantissa for matmul | Ampere+; enable with `torch.backends.cuda.matmul.allow_tf32 = True` or `torch.set_float32_matmul_precision("high")` |
| bf16 | fp32 range, 7-bit mantissa | Preferred autocast dtype on Ampere+/TPU; no loss scaling needed |
| fp16 | Narrow range | Needs `torch.amp.GradScaler` |
| fp8 (E4M3/E5M2) | Very narrow | Hopper/Blackwell-class GPUs; via Transformer Engine or torchao float8 training with per-tensor/row scaling |

Validate convergence when lowering precision: compare loss curves against a bf16 baseline for a meaningful number of steps.

## Numerical Stability

- Compute softmax/log-softmax and losses in fp32 (autocast does this for many ops).
- Use `logsumexp` instead of `log(sum(exp(x)))`.
- Large-scale transformer stability aids: pre-norm (or QK-norm), learning-rate warmup, gradient clipping, z-loss on logits, lower Adam beta2 (0.95) for large models, careful init scaling.
- Watch for loss spikes: log gradient norm per step; spikes preceding divergence suggest LR or data issues (skip bad batches, lower LR, restart from checkpoint).

## Input Pipeline Performance

```python
loader = DataLoader(
    dataset,
    batch_size=64,
    num_workers=8,
    pin_memory=True,
    persistent_workers=True,
    prefetch_factor=4,
)
```

- GPU utilization dips between steps indicate data loading bottlenecks.
- Pre-tokenize/pre-decode data; use streaming formats (WebDataset, MosaicML Streaming, Arrow/Parquet) for large datasets.
- Do augmentation on GPU (e.g. torchvision v2 transforms on tensors, DALI) when CPU-bound.
- Sequence packing for language models reduces padding waste; use attention masking (document masking) so packed sequences do not attend across boundaries.

## Profiling

```python
from torch.profiler import profile, ProfilerActivity, schedule, tensorboard_trace_handler

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=schedule(wait=1, warmup=2, active=3),
    on_trace_ready=tensorboard_trace_handler("./prof"),
    record_shapes=True,
    profile_memory=True,
) as prof:
    for step, batch in enumerate(loader):
        train_step(batch)
        prof.step()
        if step >= 6:
            break
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=15))
```

Key ratios: GPU busy time vs step time, time in data loading, kernel launch overhead (many tiny kernels suggest compilation or CUDA graphs help), communication time in distributed runs. Model FLOPs Utilization (MFU) compares achieved FLOPs to hardware peak.

## Fine-Tuning Efficiently

- Parameter-efficient fine-tuning (LoRA, QLoRA) via Hugging Face PEFT trains small adapters; combine with 4-bit quantized base weights for memory-limited GPUs.
- Freeze embeddings or early layers for small datasets.
- Use a lower learning rate than pretraining; evaluate for catastrophic forgetting on general benchmarks if relevant.

## Checklist

- [ ] Steady-state throughput measured with and without `torch.compile`; graph breaks reviewed
- [ ] SDPA/flex attention used instead of hand-written attention
- [ ] Memory budget computed; checkpointing applied where activations dominate
- [ ] bf16 autocast (fp16 with GradScaler only when bf16 unavailable)
- [ ] Gradient norm and loss spikes logged
- [ ] DataLoader tuned; GPU never waits on data
- [ ] Profiler trace reviewed before scaling out
