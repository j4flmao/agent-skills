# Anti-Patterns & Troubleshooting

## Overview
LLM training is fragile. Small mistakes in data, configuration, or code can waste thousands of GPU-hours. This reference catalogs common anti-patterns, their symptoms, detection methods, and fixes.

## Anti-Pattern 1: Overfitting

### Symptoms
- Training loss decreases but eval loss increases (divergence)
- Eval loss starts increasing after N steps while train loss continues down
- Training accuracy approaches 100% while eval accuracy stalls or drops
- Model generates training-data-like responses verbatim

### Detection
```python
def detect_overfitting(train_losses, eval_losses, window=5):
    if len(eval_losses) < window:
        return False, 0.0
    recent_eval = eval_losses[-window:]
    recent_train = train_losses[-window:]
    eval_trend = recent_eval[-1] - recent_eval[0]
    train_trend = recent_train[-1] - recent_train[0]
    gap = eval_losses[-1] - train_losses[-1]
    return eval_trend > 0 and train_trend < 0, gap

# Track overfitting_risk = max(0, eval_loss_trend)
# Alert when risk > 0.02 for 3+ consecutive checks
```

### Root Causes
| Cause | Probability | Fix |
|-------|:----------:|------|
| Too many epochs | High | Reduce epochs, early stopping |
| Too much model capacity | Medium | Lower LoRA rank (16→8) |
| Too little data | High | Add data, augment, synthesize |
| Too little regularization | Medium | Increase dropout (0.05→0.2), weight decay (0.01→0.1) |
| Data leakage | Medium | Check train/eval separation |
| Learning rate too high | Medium | Reduce LR |

### Fixes
```python
FIXES = {
    "early_stopping": {
        "action": "Stop training when eval loss plateaus for N evaluations",
        "code": "training_args = TrainingArguments(load_best_model_at_end=True, metric_for_best_model='eval_loss')",
    },
    "regularization": {
        "action": "Increase LoRA dropout and weight decay",
        "code": "LoraConfig(lora_dropout=0.2) and TrainingArguments(weight_decay=0.1)",
    },
    "data_augmentation": {
        "action": "Add synthetic variations of training data",
        "code": "def augment(example): return {'input': rephrase(example['input']), 'output': example['output']}",
    },
    "replay_data": {
        "action": "Mix in 10-30% general-domain data",
        "code": "train_dataset = ConcatDataset([task_data, general_data_30pct])",
    },
}
```

## Anti-Pattern 2: Underfitting

### Symptoms
- Both train and eval losses are high and flat
- Loss barely decreases after warmup
- Training accuracy is low (close to random)
- Model output is incoherent or degenerate

### Detection
```python
def detect_underfitting(train_losses, expected_loss_baseline, warmup_steps=100):
    if len(train_losses) < warmup_steps:
        return False, 0.0
    recent_loss = statistics.mean(train_losses[-50:])
    relative_gap = (recent_loss - expected_loss_baseline) / expected_loss_baseline
    return relative_gap > 0.5, relative_gap

# Expected baseline:
# Perplexity 10 → loss = ln(10) = 2.3
# Perplexity 100 → loss = ln(100) = 4.6
# Random on 32K vocab → loss = ln(32000) = 10.4
```

### Root Causes
| Cause | Probability | Fix |
|-------|:----------:|------|
| Learning rate too low | High | Increase LR (5e-5→2e-4 for LoRA) |
| LoRA rank too low | Medium | Increase rank (8→32) |
| Not enough training steps | Medium | Increase epochs |
| Wrong data format | Medium | Verify chat template, tokenization |
| Tokenizer mismatch | High | Use base model's exact tokenizer |
| Excessive dropout/decay | Medium | Reduce dropout (0.2→0.05), weight decay (0.1→0.01) |
| Model not training | Low | Check gradient norms (> 0) and parameter updates |

### One-Batch Overfit Test
```python
# Run this before full training to verify the model can learn
def one_batch_overfit_test(model, tokenizer, device):
    """Model should overfit one batch to near-zero loss."""
    batch = next(iter(train_dataloader))
    batch = {k: v.to(device) for k, v in batch.items()}
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)

    for step in range(50):
        optimizer.zero_grad()
        outputs = model(**batch)
        loss = outputs.loss
        loss.backward()
        optimizer.step()
        if step % 10 == 0:
            print(f"Step {step}: loss = {loss.item():.4f}")
            if loss.item() < 0.1:
                print("✅ Model can overfit a batch. Training setup is correct.")
                return True
    print("❌ Model cannot overfit a batch. Check model, data, or optimizer.")
    return False
```

## Anti-Pattern 3: Data Leakage

### Symptoms
- Eval/test metrics are unrealistically high (> 95%)
- Model performs well on benchmarks but fails in production
- Training loss is suspiciously low from the first step
- Exact matches from training data appear in model outputs during eval

### Types of Data Leakage
```python
LEAKAGE_TYPES = {
    "temporal_leakage": {
        "description": "Future data appears in training set",
        "example": "Training on 2025 data, evaluating on 2024 data",
        "fix": "Split by timestamp, not randomly",
        "detection": "Check timestamps — are future dates in training?",
    },
    "feature_leakage": {
        "description": "Eval-only features available during training",
        "example": "Target variable included in input features",
        "fix": "Remove target-derived features from input",
        "detection": "Check feature-target correlations",
    },
    "duplicate_leakage": {
        "description": "Identical or near-identical samples in train and eval",
        "example": "Random split of deduplicated data still has near-duplicates",
        "fix": "Deduplicate across all splits, not within each split",
        "detection": "Hash-based dedup across train/eval",
    },
    "benchmark_contamination": {
        "description": "Public benchmark data leaked into training corpus",
        "example": "MMLU questions in web crawl used for pre-training",
        "fix": "Check benchmark data against training corpus; deduplicate",
        "detection": "n-gram overlap analysis",
    },
    "llm_generated_eval": {
        "description": "Using same LLM to generate both training data and eval data",
        "example": "GPT-4 generated training data evaluated by GPT-4",
        "fix": "Use different model for eval, or human evaluation",
        "detection": "Check data sources for eval set",
    },
    "prompt_leakage": {
        "description": "Eval prompt format seen during training",
        "example": "Same chat template and system prompt in training and eval",
        "fix": "Use distinct system prompts, vary format slightly",
        "detection": "Check for eval-specific patterns in training data",
    },
}
```

### Deduplication Across Splits
```python
def detect_data_leakage(train_data, eval_data, test_data):
    """Check for overlap between train and eval/test."""
    def hash_example(ex):
        content = str(ex.get("input", "")) + str(ex.get("output", ""))
        return hashlib.sha256(content.encode()).hexdigest()

    train_hashes = set(hash_example(ex) for ex in train_data)
    eval_leaks = [ex for ex in eval_data if hash_example(ex) in train_hashes]
    test_leaks = [ex for ex in test_data if hash_example(ex) in train_hashes]

    return {
        "train_eval_overlap": len(eval_leaks) / len(eval_data) * 100,
        "train_test_overlap": len(test_leaks) / len(test_data) * 100,
        "eval_leak_examples": eval_leaks[:3],
        "test_leak_examples": test_leaks[:3],
    }
```

## Anti-Pattern 4: Compute Waste

### Symptoms
- GPU utilization < 50%
- Training takes longer than expected for dataset size
- DataLoader prefetch is the bottleneck in profiling
- Excessive checkpoint saving slows training

### Detection
```python
def profile_compute_efficiency(profiler_output):
    """Check GPU utilization and bottleneck identification."""
    checks = {
        "gpu_util_low": {
            "condition": profiler_output.get("gpu_util", 0) < 70,
            "fix": "Increase batch size, increase dataloader_num_workers, check for CPU bottleneck",
        },
        "data_loading_slow": {
            "condition": profiler_output.get("data_load_time_pct", 0) > 20,
            "fix": "Increase num_workers (4-8), enable prefetch, use memory mapping",
        },
        "checkpoint_freq_high": {
            "condition": profiler_output.get("checkpoint_time_pct", 0) > 10,
            "fix": "Reduce save_steps, use async save, save to faster storage",
        },
        "eval_freq_high": {
            "condition": profiler_output.get("eval_time_pct", 0) > 15,
            "fix": "Reduce eval_steps, evaluate on subset (500 samples) during training",
        },
        "padding_waste": {
            "condition": profiler_output.get("padding_ratio", 0) > 0.3,
            "fix": "Use packing or longest-batch padding, not max_length padding",
        },
    }
    return {k: v for k, v in checks.items() if v["condition"]}
```

### Common Waste Sources
| Waste Source | Impact | Fix |
|-------------|:------:|------|
| `num_workers=2` instead of `num_workers=8` | 20-40% slower | Increase to 4-8 |
| `max_length` padding to 2048 with avg 300 tokens | 85% waste on padding | Use `padding=True` (to longest) or pack sequences |
| Saving every 100 steps | 30%+ time on save | Save every 500-1000 steps |
| Evaluating on full eval set every 100 steps | 40%+ time on eval | Evaluate on subset, run full eval at end |
| CPU offload with slow RAM | 50-80% slower | Use faster RAM, reduce offload ratio |
| No Flash Attention | 20-30% slower | Enable `attn_implementation="flash_attention_2"` |
| Not using `torch.compile` | 10-20% slower | `model = torch.compile(model)` |

## Anti-Pattern 5: Training Instability

### Symptoms
- Loss spikes to 10x+ normal values
- NaN loss after a spike
- Gradient norm spikes to 100x baseline
- Model output becomes gibberish after a spike

### Detection
```python
def monitor_training_stability(step_metrics, window=10):
    """Check for instability indicators."""
    alerts = []
    losses = step_metrics.get("train_loss", [])
    grad_norms = step_metrics.get("grad_norm", [])

    if len(losses) > 1:
        # Check for loss spikes
        recent_median = statistics.median(losses[-window:])
        if losses[-1] > 5 * recent_median and recent_median > 0.01:
            alerts.append(("LOSS_SPIKE", f"Loss {losses[-1]:.2f} vs median {recent_median:.2f}"))

    if len(grad_norms) > 1:
        # Check for gradient explosion
        recent_median = statistics.median(grad_norms[-window:])
        if grad_norms[-1] > 10 * recent_median and recent_median > 0:
            alerts.append(("GRAD_SPIKE", f"Grad norm {grad_norms[-1]:.2f} vs median {recent_median:.2f}"))

    if any(math.isnan(l) for l in losses[-5:]):
        alerts.append(("NAN_LOSS", "NaN detected in loss — training will diverge"))

    return alerts
```

### Fixes
| Issue | Immediate Fix | Long-Term Fix |
|-------|---------------|---------------|
| Loss spike | Restore from last good checkpoint, reduce LR | Gradient clipping (1.0), slower warmup |
| NaN loss | Stop training, check for NaN in inputs/outputs | Use BF16 (doesn't overflow), gradient clipping |
| Gradient explosion | Clip gradients at lower value (0.3-1.0) | Reduce LR, increase warmup |
| Oscillation | Reduce LR, increase batch size | Cosine schedule, gradient clipping |
| Loss not decreasing | Check LR is not too low | Verify optimizer is stepping, check grads |

### NaN Debugging Checklist
```python
NAN_DEBUG = [
    "1. Check input data for NaN/inf values: torch.isnan(input_ids).any()",
    "2. Check model weights: any(torch.isnan(p).any() for p in model.parameters())",
    "3. Check logits: torch.isnan(outputs.logits).any()",
    "4. Check loss: torch.isnan(loss).any()",
    "5. Verify precision: FP16 is prone to overflow. Switch to BF16.",
    "6. Verify loss scaling: GradScaler enabled for FP16?",
    "7. Check optimizer: AdamW eps=1e-8 (too small?)",
    "8. Check for divide-by-zero: attention mask, layer norm epsilon",
    "9. Check gradient checkpointing: use_reentrant=False for newer PyTorch",
    "10. Reduce batch size: large batches can cause instability at LR boundaries",
]
```

## Anti-Pattern 6: Catastrophic Forgetting

### Symptoms
- General task performance drops after fine-tuning on specific task
- MMLU score drops by > 5% after fine-tuning
- Model loses ability to follow general instructions
- Previously correct responses become incorrect

### Detection
```python
def detect_forgetting(post_training_metrics, pre_training_baseline, forgetting_threshold=0.05):
    """Compare post-training metrics to pre-training baseline."""
    forgotten_tasks = []
    for task, baseline_score in pre_training_baseline.items():
        post_score = post_training_metrics.get(task, {}).get("score", 0)
        delta = post_score - baseline_score
        if delta < -forgetting_threshold:
            forgotten_tasks.append({
                "task": task,
                "baseline": baseline_score,
                "post_training": post_score,
                "delta": delta,
            })
    return forgotten_tasks
```

### Prevention
```python
FORGETTING_PREVENTION = {
    "replay_data": {
        "description": "Mix general data with task data during fine-tuning",
        "ratio": "Task data : General data = 70:30 to 90:10",
        "implementation": "ConcatDataset([task_dataset, general_dataset scaled to 30%])",
    },
    "lower_lr": {
        "description": "Slower learning rate reduces representational shift",
        "lora_lr": "5e-5 to 1e-4 (vs default 2e-4)",
        "full_ft_lr": "1e-5 to 2e-5 (vs default 2e-5)",
    },
    "ewc": {
        "description": "Elastic Weight Consolidation: penalty on important weights",
        "lambda": "0.1 to 1.0",
        "implementation": "Add penalty: lambda * sum(F_i * (theta_i - theta_base_i)^2)",
    },
    "lora_rank_limit": {
        "description": "Lower LoRA rank limits representational capacity change",
        "rank": "8-16 for forgetting-sensitive tasks",
        "rationale": "Lower rank = less deviation from base model",
    },
    "multi_task_learning": {
        "description": "Train on task + general benchmarks simultaneously",
        "ratio": "1:1 task:general",
        "implementation": "Alternate batches from task and general datasets",
    },
}

# EWC loss implementation
def ewc_loss(model, fisher_matrix, optimal_params, lambda_reg=0.1):
    ewc_loss = 0.0
    for name, param in model.named_parameters():
        if name in fisher_matrix:
            ewc_loss += (fisher_matrix[name] * (param - optimal_params[name]) ** 2).sum()
    return lambda_reg * ewc_loss
```

## Anti-Pattern 7: Reward Hacking (RLHF/DPO)

### Symptoms
- Reward model score increases but human evaluation shows no improvement or regression
- Model learns to generate long, repetitive responses (exploiting length bias)
- Model uses formatting tricks that score well but are meaningless
- DPO: chosen/rejected log-probability ratio diverges (overfitting to preference data)

### Detection
```python
def detect_reward_hacking(metrics, threshold=0.95):
    """Detect common reward hacking patterns."""
    alerts = []

    # Check for mode collapse: low response diversity
    if metrics.get("response_distinct_ngrams", 1) < 0.1:
        alerts.append("Mode collapse: responses lack diversity")

    # Check for length exploitation
    if metrics.get("response_length_ratio", 1) > 3:
        alerts.append("Reward hacking: responses much longer than expected")

    # Check for reward over-optimization
    if metrics.get("reward_model_score", 0) > threshold:
        if metrics.get("human_eval_score", 0) < 0.5:
            alerts.append("Reward hacking: RM score high but human eval low")

    # DPO: check log-probability ratio divergence
    if metrics.get("dpo_log_ratio", 0) > 5:
        alerts.append("DPO overfit: chosen/rejected log-ratio too large")

    return alerts
```

### Fixes
```python
FIX_REWARD_HACKING = {
    "kl_penalty": {
        "action": "Increase KL penalty coefficient",
        "dpo_beta": "0.1 → 0.5",
        "ppo_kl_coef": "0.2 → 0.5",
    },
    "reference_model": {
        "action": "Ensure reference model is frozen and used correctly",
        "note": "KL divergence computed against reference model prevents drift",
    },
    "response_penalties": {
        "action": "Add length penalty and repetition penalty",
        "code": "repetition_penalty=1.2, length_penalty=-1.0",
    },
    "diversity_sampling": {
        "action": "Sample multiple responses, select best by human preference",
        "code": "num_return_sequences=4, temperature=0.8",
    },
    "human_in_loop": {
        "action": "Validate RM scores with human evaluation regularly",
        "frequency": "Every 100 PPO steps or every DPO epoch",
    },
    "regularization": {
        "action": "Add entropy bonus to encourage exploration in PPO",
        "code": "entropy_coef=0.01 in PPO config",
    },
}
```

## Anti-Pattern 8: Benchmark Contamination

### Symptoms
- Benchmarks show unrealistic performance on specific datasets
- Model outputs match benchmark answer patterns
- Fine-tuned on data that includes benchmark questions
- Training corpus contains near-exact matches to benchmark samples

### Detection
```python
def check_benchmark_contamination(model, tokenizer, benchmarks, training_corpus, ngram_n=8):
    """Check n-gram overlap between training corpus and benchmarks."""
    from collections import Counter

    corpus_ngrams = set()
    for doc in training_corpus:
        tokens = tokenizer.tokenize(doc)
        for i in range(len(tokens) - ngram_n + 1):
            corpus_ngrams.add(tuple(tokens[i:i+ngram_n]))

    results = {}
    for benchmark_name, benchmark_data in benchmarks.items():
        overlap_count = 0
        total = 0
        for sample in benchmark_data:
            tokens = tokenizer.tokenize(sample["question"] + " " + sample.get("answer", ""))
            sample_ngrams = set()
            for i in range(len(tokens) - ngram_n + 1):
                sample_ngrams.add(tuple(tokens[i:i+ngram_n]))
            if sample_ngrams & corpus_ngrams:
                overlap_count += 1
            total += 1
        results[benchmark_name] = {
            "overlap_ratio": overlap_count / max(total, 1) * 100,
            "contaminated": overlap_count / max(total, 1) > 0.1,
        }
    return results
```

## General Debugging Methodology

### Step-by-Step Debug Sequence
```python
DEBUG_SEQUENCE = [
    "1. CHECK DATA: Can the model see the data? Verify batch contents.",
    "   → Print batch['input_ids'].shape, decode a few samples: tokenizer.decode(batch['input_ids'][0])",
    "",
    "2. CHECK FORWARD: Does the forward pass produce valid output?",
    "   → Run one batch: outputs = model(**batch). Check outputs.loss is finite.",
    "",
    "3. CHECK BACKWARD: Do gradients flow?",
    "   → loss.backward(); check grad_norm > 0 for all parameters.",
    "   → For LoRA: only LoRA params should have gradients.",
    "",
    "4. ONE-BATCH OVERFIT: Can model memorize one batch?",
    "   → Train on single batch for 50 steps. Loss should approach 0.",
    "",
    "5. CHECK SCHEDULE: Is LR following expected schedule?",
    "   → Print LR values at each step. Verify warmup and decay.",
    "",
    "6. CHECK CONVERGENCE: Is loss decreasing on training set?",
    "   → If loss is flat after warmup, increase LR or check model capacity.",
    "",
    "7. COMPARE TO BASELINE: Does the base model produce reasonable output?",
    "   → Run base model (no LoRA) on eval samples. Check output quality.",
    "",
    "8. ABLATION: Remove complexity one piece at a time.",
    "   → Disable: gradient checkpointing, Flash Attention, packing, distributed."
    "   → If loss drops: the disabled feature has a bug or incompatibility.",
    "",
    "9. CHECK RANDOM SEED: Is the run deterministic?",
    "   → Same seed should produce same results. If not, find nondeterministic op.",
    "",
    "10. GRADIENT STATISTICS: Log mean, max, min, std of gradients per layer.",
    "    → Vanishing gradients: last layers have much larger grads than first layers.",
    "    → Exploding gradients: some layers have grads 100x larger than others.",
    "    → Dead layers: zero gradients for specific layers."
]
```

## Key Points
- Overfitting: train loss ↓, eval loss ↑. Fix: early stopping, regularization, more data.
- Underfitting: both losses high. Fix: increase LR, model capacity, verify data format.
- Data leakage: unrealistically high metrics. Fix: temporal split, dedup across splits.
- Compute waste: low GPU util. Fix: tune DataLoader, reduce save/eval frequency, Flash Attention.
- Training instability: spikes, NaN. Fix: gradient clipping, BF16, LR reduction.
- Catastrophic forgetting: general benchmark drops. Fix: replay data, lower LR, LoRA rank limit.
- Reward hacking: RM score high, human eval low. Fix: KL penalty, diversity sampling.
- Benchmark contamination: unrealistically good benchmarks. Fix: dedup training data vs benchmarks.
- Always run one-batch overfit test before full training.
- Debug in order: data → forward → backward → one-batch overfit → schedule → convergence.
- Log gradient statistics per layer for deep debugging.
