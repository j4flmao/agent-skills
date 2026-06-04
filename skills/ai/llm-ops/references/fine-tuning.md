# Fine-Tuning

## Method Comparison

| Method | Trainable Params | Memory | Quality | Speed | GPU Required |
|--------|-----------------|--------|---------|-------|-------------|
| Full Fine-Tune | 100% | Very High | Highest | Slow | 8× A100-80GB (70B) |
| LoRA | 0.1-1% | Low | High | Fast | 1× A100-80GB (70B) |
| QLoRA | 0.1-1% | Very Low | Medium-High | Fast | 1× A100-80GB (70B) |
| Prefix Tuning | ~0.1% | Low | Medium | Fast | 1× A100-80GB |

## LoRA (Low-Rank Adaptation)

### How It Works
Freeze base model weights. Inject trainable rank-decomposition matrices into attention layers. W' = W + BA where B ∈ R^(d×r), A ∈ R^(r×k), r << min(d,k).

### Parameter Configuration
```
r (rank):    8-64. Higher = more capacity, more overfitting risk.
alpha:       16-128. Scaling factor. Typically 2× rank.
dropout:     0.0-0.1. Rarely needed for LoRA.
target_modules: which layers to apply LoRA to.
  Text models: ["q_proj", "k_proj", "v_proj", "o_proj"]
  Code models: add ["gate_proj", "up_proj", "down_proj"]
  Vision models: ["qkv", "proj", "fc1", "fc2"]
```

### Rank Selection Guide
| r | Capacity | Overfitting Risk | Best For |
|---|----------|-----------------|----------|
| 8 | Low | Low | Simple style/tone adaptation |
| 16 | Medium | Medium | Task-specific instruction tuning |
| 32 | High | Medium-High | Domain adaptation (legal, medical) |
| 64 | Very High | High | Complex task learning |

### Training Config
```yaml
# LoRA config for 70B model on single A100-80GB
lora:
  r: 16
  lora_alpha: 32
  target_modules: ["q_proj", "k_proj", "v_proj", "o_proj"]
  lora_dropout: 0.05
  bias: "none"
  task_type: "CAUSAL_LM"

training:
  per_device_train_batch_size: 4
  gradient_accumulation_steps: 4
  learning_rate: 0.0002
  num_train_epochs: 3
  warmup_ratio: 0.03
  lr_scheduler_type: "cosine"
  bf16: true
  max_grad_norm: 0.3
```

### Pros and Cons
- Pros: train on single GPU, fast training (hours not days), no base model copy, switch adapters at inference.
- Cons: limited capacity vs full fine-tune, rank selection requires tuning, slight inference overhead.

### When to Use
- Default choice for most fine-tuning tasks.
- Teaching new formats or styles.
- Adapting to a specific domain with limited data (<10k examples).

## QLoRA

### How It Works
4-bit NormalFloat (NF4) quantization of base model + LoRA adapters on quantized weights. Further reduces memory by ~4x vs FP16 LoRA.

### Additional Config vs LoRA
```yaml
quantization:
  load_in_4bit: true
  bnb_4bit_quant_type: "nf4"
  bnb_4bit_use_double_quant: true
  bnb_4bit_compute_dtype: bfloat16
```

### Memory Savings
| Model | Full FT (FP16) | LoRA (FP16) | QLoRA (NF4) |
|-------|---------------|-------------|-------------|
| 7B | 56 GB | 24 GB | 8 GB |
| 13B | 104 GB | 40 GB | 14 GB |
| 34B | 272 GB | 96 GB | 32 GB |
| 70B | 560 GB | 192 GB | 64 GB |

### Quality Impact
QLoRA achieves ~99% of LoRA quality on most benchmarks. Quality gap widens on tasks requiring precise numerical reasoning or factual recall. Double quantization recovers ~0.5% of lost quality.

### When to Use
- Single GPU training of any model up to 70B.
- Limited GPU budget (consumer GPUs).
- Iterative experimentation with many hyperparameter combinations.

## Distributed Full Fine-Tuning Infrastructure

Full parameter updates of models >=70B require distributing parameters, optimizer states, and gradients across multiple GPUs. This is handled using either DeepSpeed ZeRO-3 or PyTorch FSDP (Fully Sharded Data Parallel).

### 1. Production DeepSpeed ZeRO-3 Configuration
```json
{
  "train_micro_batch_size_per_gpu": 2,
  "gradient_accumulation_steps": 8,
  "bf16": {
    "enabled": true
  },
  "zero_optimization": {
    "stage": 3,
    "offload_optimizer": {
      "device": "cpu",
      "pin_memory": true
    },
    "offload_param": {
      "device": "cpu",
      "pin_memory": true
    },
    "overlap_comm": true,
    "contiguous_gradients": true,
    "sub_group_size": 1e9,
    "reduce_bucket_size": "auto",
    "stage3_prefetch_bucket_size": "auto",
    "stage3_param_persistence_threshold": "auto",
    "stage3_max_live_parameters": 1e9,
    "stage3_max_reuse_distance": 1e9,
    "stage3_gather_16bit_weights_on_model_save": true
  },
  "gradient_clipping": "auto",
  "steps_per_print": 100,
  "wall_clock_breakdown": false
}
```

### 2. Distributed FSDP Fine-Tuning Pipeline
The script below demonstrates initializing PyTorch FSDP with activation checkpointing and sharded state dict savings:

```python
import os
import torch
import torch.distributed as dist
from torch.utils.data import DataLoader
from torch.utils.data.distributed import DistributedSampler
from transformers import AutoModelForCausalLM, AutoTokenizer
from torch.distributed.fsdp import (
    FullyShardedDataParallel as FSDP,
    MixedPrecision,
    ShardingStrategy,
    BackwardPrefetch
)
from torch.distributed.fsdp.wrap import transformer_auto_wrap_policy
from transformers.models.llama.modeling_llama import LlamaDecoderLayer

def setup_distributed():
    dist.init_process_group("nccl")
    torch.cuda.set_device(int(os.environ["LOCAL_RANK"]))

def cleanup():
    dist.destroy_process_group()

def get_fsdp_wrapped_model(model_name: str) -> FSDP:
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.bfloat16
    )
    
    # Define custom wrapping policy based on Llama Decoder Layers
    llama_auto_wrap_policy = transformer_auto_wrap_policy(
        module_classes={LlamaDecoderLayer}
    )
    
    # Configure mixed precision settings (BF16 computation, FP32 buffer)
    mixed_precision_config = MixedPrecision(
        param_dtype=torch.bfloat16,
        reduce_dtype=torch.bfloat16,
        buffer_dtype=torch.float32
    )
    
    # Instantiate FSDP wrapper
    model = FSDP(
        model,
        auto_wrap_policy=llama_auto_wrap_policy,
        mixed_precision=mixed_precision_config,
        sharding_strategy=ShardingStrategy.FULL_SHARD, # ZeRO-3 equivalent
        backward_prefetch=BackwardPrefetch.BACKWARD_PRE,
        device_id=torch.cuda.current_device()
    )
    return model

def train():
    setup_distributed()
    local_rank = int(os.environ["LOCAL_RANK"])
    
    model = get_fsdp_wrapped_model("meta-llama/Llama-3.1-70B")
    
    # Activation Checkpointing to save memory
    from torch.distributed.algorithms._checkpoint.checkpoint_wrapper import (
        apply_activation_checkpointing,
        checkpoint_wrapper,
        CheckpointImpl
    )
    
    non_reentrant_wrapper = checkpoint_wrapper(
        checkpoint_impl=CheckpointImpl.NO_REENTRANT
    )
    
    check_fn = lambda submodule: isinstance(submodule, LlamaDecoderLayer)
    apply_activation_checkpointing(
        model,
        checkpoint_wrapper_fn=non_reentrant_wrapper,
        check_fn=check_fn
    )
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-5)
    
    # Train loop logic goes here...
    
    cleanup()

if __name__ == "__main__":
    # Launch command: 
    # torchrun --nproc_per_node=8 --nnodes=2 --node_rank=0 --master_addr="10.0.0.1" --master_port=1234 train.py
    train()
```

### 3. Execution Commands
To run distributed training across 2 nodes (each with 8x H100 GPUs):
```bash
# Node 0 (IP: 10.0.0.1)
torchrun \
  --nproc_per_node=8 \
  --nnodes=2 \
  --node_rank=0 \
  --master_addr="10.0.0.1" \
  --master_port=29500 \
  fine_tune_distributed.py --dataset_path="/data/train.jsonl"

# Node 1 (IP: 10.0.0.2)
torchrun \
  --nproc_per_node=8 \
  --nnodes=2 \
  --node_rank=1 \
  --master_addr="10.0.0.1" \
  --master_port=29500 \
  fine_tune_distributed.py --dataset_path="/data/train.jsonl"
```

### Cost & Scaling Characteristics
- **Network Bandwidth**: Node interconnect MUST be InfiniBand or RoCEv2 (>= 400Gbps). Standard Ethernet will cause >80% GPU execution time to be wasted on NCCL all-reduce wait loops.
- **Compute Sizing**:
  - Full Fine-Tuning 70B (BF16): Requires 4 nodes (32x H100 GPUs) to achieve a throughput of ~1,800 tokens/sec/GPU without aggressive memory swapping.
  - LoRA/QLoRA 70B (BF16): Can be trained on 1x A100-80GB or 1x H100-80GB with DeepSpeed ZeRO-2 offloading enabled.

## Data Preparation

### Dataset Format
```json
{
  "prompt": "What is the capital of France?",
  "completion": "The capital of France is Paris.",
  "source": "geography_qa",
  "difficulty": "easy",
  "domain": "geography"
}
```

### Chat Template Format
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is the capital of France?"},
    {"role": "assistant", "content": "The capital of France is Paris."}
  ]
}
```

### Quality Checks
- Duplicate detection: remove exact and near-duplicate pairs.
- Format consistency: all examples use the same template.
- Length distribution: plot completion length — trim outliers.
- Answer correctness: spot-check 5% of training set manually.
- Toxicity scan: filter offensive or harmful content.

## Evaluation

### Metrics
- Hold-out test set loss (perplexity): measure of model confidence.
- Task accuracy: downstream task performance.
- Human eval: preference ranking between FT and base model.
- LLM-as-judge: compare FT and baseline outputs.
- Regeneration test: does FT change behavior on unrelated tasks?

### Forgetting / Catastrophic Interference
```
Benchmark score before FT: 85% (MMLU)
Benchmark score after FT:  82% (MMLU — -3% = acceptable)
```
Monitor for degradation on general capabilities. If >5% drop, reduce learning rate, increase data diversity, or add replay data.

## Production Fine-Tuning Checklist

- [ ] Dataset deduplicated and quality-checked.
- [ ] Train/eval split (90/10) with no leakage.
- [ ] Learning rate range tested (1e-5 to 5e-4).
- [ ] LoRA rank validated (r=8, 16, 32 comparison).
- [ ] Eval before FT: baseline metrics recorded.
- [ ] Training loss tracked — no divergence or plateau.
- [ ] Final eval: comparison to baseline on all metrics.
- [ ] Adapter exported and versioned.
- [ ] Inference test: FT adapter loaded with base model.
- [ ] Cost tracked: GPU hours, tokens processed.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive fine-tuning methodologies & configurations)
Strict compliance with distributed PyTorch FSDP training, DeepSpeed stages, and multi-node constraints.
-->

