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

## Full Fine-Tuning

### Requirements
- All model weights are trainable and updated.
- Requires multi-GPU with model parallelism.
- Needs FSDP (Fully Sharded Data Parallel) or DeepSpeed ZeRO-3.

### DeepSpeed ZeRO-3 Config
```yaml
zero_optimization:
  stage: 3
  offload_optimizer:
    device: cpu
  offload_param:
    device: cpu
  reduce_bucket_size: 5e8
  allgather_bucket_size: 5e8
```

### When to Use
- Pre-training continuation or domain-adaptive pre-training.
- When LoRA/QLoRA capacity is insufficient.
- When highest possible quality is required regardless of cost.
- Training from scratch or substantial architecture changes.

### Cost
- 70B model, 1000 examples, 3 epochs:
  - Full FT: ~$500-1000 (8× A100, 2-4 days)
  - LoRA: ~$30-50 (1× A100, 2-4 hours)
  - QLoRA: ~$15-25 (1× A100, 2-4 hours)

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
