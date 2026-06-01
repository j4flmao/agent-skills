# Model Training: Core Concepts & Training Loop Fundamentals

## Overview
LLM training fundamentals cover the core mechanics of gradient-based optimization for transformer language models: loss functions, optimizers, backward pass mechanics, precision strategies, normalization, regularization, and the training loop itself. These fundamentals apply to both pre-training and fine-tuning.

## Training Loop Anatomy

### Basic Training Step
```python
def training_step(model, batch, optimizer, scheduler, scaler, gradient_accumulation_steps=1):
    # 1. Forward pass: compute logits and loss
    with torch.autocast(device_type="cuda", dtype=torch.bfloat16, enabled=True):
        outputs = model(
            input_ids=batch["input_ids"],
            attention_mask=batch["attention_mask"],
            labels=batch["labels"],
        )
        loss = outputs.loss / gradient_accumulation_steps

    # 2. Backward pass: compute gradients
    scaler.scale(loss).backward()

    # 3. Optimizer step (after accumulating gradients)
    if (step + 1) % gradient_accumulation_steps == 0:
        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad()
        if scheduler is not None:
            scheduler.step()

    return loss.detach()
```

### Full Training Loop
```python
def train(model, train_dataloader, eval_dataloader, optimizer, scheduler, scaler, config):
    model.train()
    global_step = 0
    best_eval_loss = float("inf")

    for epoch in range(config.num_epochs):
        for step, batch in enumerate(train_dataloader):
            batch = {k: v.to(config.device) for k, v in batch.items()}
            loss = training_step(model, batch, optimizer, scheduler, scaler, config.gradient_accumulation_steps)
            global_step += 1

            if global_step % config.logging_steps == 0:
                log_metrics({"train/loss": loss.item() * config.gradient_accumulation_steps, "step": global_step})

            if global_step % config.eval_steps == 0:
                eval_metrics = evaluate(model, eval_dataloader, config.device)
                log_metrics({f"eval/{k}": v for k, v in eval_metrics.items()})
                if eval_metrics["eval_loss"] < best_eval_loss:
                    best_eval_loss = eval_metrics["eval_loss"]
                    save_checkpoint(model, optimizer, scheduler, global_step, eval_metrics, config.output_dir)
                model.train()
```

## Loss Functions

### Causal Language Modeling (CLM) Loss
```python
# Cross-entropy loss on next-token prediction
# Labels: input_ids shifted left by 1
# Loss computed only on non-padding, non-input tokens (masked with -100)
def clm_loss(logits, labels):
    # logits: (batch, seq_len, vocab_size)
    # labels: (batch, seq_len) with -100 for ignored positions
    shift_logits = logits[..., :-1, :].contiguous()
    shift_labels = labels[..., 1:].contiguous()
    loss_fct = torch.nn.CrossEntropyLoss()
    return loss_fct(shift_logits.view(-1, shift_logits.size(-1)), shift_labels.view(-1))
```

### DPO Loss
```python
# DPO loss directly optimizes policy from preference pairs
def dpo_loss(policy_chosen_logps, policy_rejected_logps, ref_chosen_logps, ref_rejected_logps, beta=0.1):
    policy_log_ratios = policy_chosen_logps - policy_rejected_logps
    ref_log_ratios = ref_chosen_logps - ref_rejected_logps
    logits = policy_log_ratios - ref_log_ratios
    loss = -F.logsigmoid(beta * logits).mean()
    return loss
```

### PPO / Reward Model Loss (Bradley-Terry)
```python
# Reward model: maximize log(sigmoid(reward_chosen - reward_rejected))
# PPO policy: maximize reward - KL(ref || policy)
def bradley_terry_loss(reward_chosen, reward_rejected):
    return -F.logsigmoid(reward_chosen - reward_rejected).mean()

def ppo_policy_loss(log_probs, ref_log_probs, advantages, kl_coef=0.2):
    ratio = torch.exp(log_probs - ref_log_probs)
    pg_loss = -advantages * ratio
    kl_loss = (log_probs - ref_log_probs).mean()
    return pg_loss.mean() + kl_coef * kl_loss
```

## Optimizers

### AdamW (Standard)
```python
from transformers import get_cosine_schedule_with_warmup

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=2e-4,
    betas=(0.9, 0.999),
    eps=1e-8,
    weight_decay=0.01,
)

# 8-bit optimizer for memory savings
# import bitsandbytes as bnb
# optimizer = bnb.optim.AdamW8bit(model.parameters(), lr=2e-4)
```

### Parameter Groups with Different LR / Decay
```python
# Apply weight decay only to non-bias, non-norm parameters
def configure_optimizer(model, lr, weight_decay):
    decay_params = []
    no_decay_params = []
    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue
        if "bias" in name or "layernorm" in name.lower() or "layer_norm" in name.lower():
            no_decay_params.append(param)
        else:
            decay_params.append(param)
    return torch.optim.AdamW([
        {"params": decay_params, "weight_decay": weight_decay},
        {"params": no_decay_params, "weight_decay": 0.0},
    ], lr=lr, betas=(0.9, 0.999))
```

### Lion Optimizer
```python
# Lion: memory-efficient alternative to AdamW (only tracks one momentum)
# Often yields better generalization, especially for pre-training
# optimizer = lion_pytorch.Lion(model.parameters(), lr=1e-4, weight_decay=0.01)
```

## Learning Rate Schedules

### Schedule Comparison
| Schedule | Best For | Behavior |
|----------|----------|----------|
| Cosine | Fine-tuning, continued pre-training | Warmup then cosine decay to 0 |
| Linear | Quick fine-tuning | Warmup then linear decay to 0 |
| Warmup-Stable-Decay | Pre-training | Warmup, constant LR, cosine decay |
| Constant | Short LoRA runs | Warmup then constant |
| Inverse Square Root | Large-scale pre-training | Slow decay, follows scaling laws |

### Implementation
```python
# Common schedules from transformers
from transformers import (
    get_cosine_schedule_with_warmup,
    get_linear_schedule_with_warmup,
    get_constant_schedule_with_warmup,
)

num_training_steps = len(train_dataloader) * num_epochs // gradient_accumulation_steps
num_warmup_steps = int(0.03 * num_training_steps)

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=num_warmup_steps,
    num_training_steps=num_training_steps,
)
```

### Warmup-Stable-Decay (Pre-training)
```python
def get_warmup_stable_decay_schedule(optimizer, num_warmup, num_stable, num_decay):
    def lr_lambda(current_step):
        if current_step < num_warmup:
            return float(current_step) / float(max(1, num_warmup))
        elif current_step < num_warmup + num_stable:
            return 1.0
        else:
            progress = float(current_step - num_warmup - num_stable) / max(1, num_decay)
            return max(0.0, 0.5 * (1.0 + math.cos(math.pi * progress)))
    return torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
```

## Precision & Mixed Precision Training

### Precision Types
| Precision | Bits | Range | Use Case |
|-----------|------|-------|----------|
| FP32 | 32 | 1e-38 to 3e38 | Reference, loss scaling |
| FP16 | 16 | 6e-5 to 6e4 | Older GPUs, high throughput |
| BF16 | 16 | 1e-38 to 3e38 | Modern GPUs (A100+, H100), stable |
| FP8 | 8 | Varies | H100-native, frontier |
| NF4 (QLoRA) | 4 | Quantized | Memory-limited fine-tuning |
| INT8 | 8 | Quantized | Inference, LoRA on quantized |

### Mixed Precision with GradScaler
```python
# FP16 requires dynamic loss scaling to prevent underflow
scaler = torch.cuda.amp.GradScaler()

# BF16 doesn't need scaling but may need more tokens for same quality
# For A100/H100: use BF16 if supported, otherwise FP16 + scaler

# In the training loop:
with torch.amp.autocast(device_type="cuda", dtype=torch.bfloat16):
    outputs = model(**batch)
    loss = outputs.loss / gradient_accumulation_steps
scaler.scale(loss).backward()
```

### TF32 (A100+)
```python
# TF32 uses FP32 mantissa precision for matrix math on A100+
# Free speedup with minimal quality impact
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
```

## Normalization

### Layer Norm (Standard Transformer)
```python
# Applied after each sublayer (attention, FFN)
# Normalizes across hidden dimension
# x_norm = (x - mean) / sqrt(var + eps) * weight + bias
```

### RMS Norm (Llama-style)
```python
# Simplified LayerNorm without centering
# Used in Llama, Mistral, Gemma
# x_norm = x / sqrt(mean(x^2) + eps) * weight
```

### Pre-Norm vs Post-Norm
```
Pre-Norm (modern): LayerNorm → Sublayer → Residual
  - More stable training, no warmup needed in many cases
  - Default in Llama, Mistral, GPT-NeoX, OPT

Post-Norm (original): Sublayer → LayerNorm → Residual
  - Requires careful warmup and initialization
  - Used in original GPT, BERT, T5
```

## Regularization

### Dropout
```python
# During training: randomly zero elements
# During inference: identity
# Typical values:
#   - Embedding dropout: 0.0-0.1
#   - Attention dropout: 0.0-0.1
#   - FFN dropout: 0.0-0.2 (LoRA default: 0.05)
# Higher dropout = more regularization = more data needed
```

### Weight Decay
```python
# L2 regularization on weights (not bias, not norm params)
# Typical: 0.01-0.1 for fine-tuning
# 0.1 for pre-training (Chinchilla scaling)
# Not applied to: bias, LayerNorm weights, embedding matrices
```

### Label Smoothing
```python
# Softens hard targets, improves calibration
# loss = (1 - epsilon) * CE + epsilon * uniform_CE
# Typical epsilon: 0.1
```

### Gradient Clipping
```python
# Prevent gradient explosion
# Clip gradient norm to max_norm
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
# Typical values: 0.3-1.0 for LLM training
# Too low: impedes learning. Too high: doesn't prevent spikes.
```

## Gradient Checkpointing (Activation Checkpointing)

```python
# Trade compute for memory: don't store all activations
# Recompute them during backward pass
# Memory: O(L) → O(sqrt(L)) or O(1) depending on strategy
# Speed: ~20-30% slower but 2-3x memory reduction

model.gradient_checkpointing_enable()
# Or in Trainer:
# TrainingArguments(gradient_checkpointing=True)
```
| Strategy | Memory | Recomputation |
|----------|--------|---------------|
| No checkpointing | 100% | None |
| Selective (default) | ~60% | Some layers |
| Full (every layer) | ~30% | All layers |

## Sequence Packing & Attention Masking

```python
# Pack multiple sequences into one sample to avoid padding waste
# Common in pre-training where samples are variable-length

class DataCollatorForSeq2SeqPacking:
    """Pack sequences to max_length with 1D attention mask."""
    def __call__(self, features):
        input_ids = [f["input_ids"] for f in features]
        # Concatenate and split at max_length boundaries
        concat = torch.cat([torch.tensor(ids) for ids in input_ids])
        num_chunks = math.ceil(len(concat) / self.max_length)
        chunks = torch.split(concat[:num_chunks * self.max_length], self.max_length)
        # Pad last chunk if needed
        batch = torch.stack([F.pad(c, (0, self.max_length - len(c)), value=self.pad_id) for c in chunks])
        return {"input_ids": batch, "attention_mask": (batch != self.pad_id).long(), "labels": batch.clone()}
```

## Tokenization Strategies for Training

### Padding Strategies
| Strategy | Description | Use Case |
|----------|-------------|----------|
| `max_length` | Pad/crop all to fixed length | Simple, wastes tokens |
| `longest` | Pad to longest in batch | Flexible, variable batch size |
| `padding_free` | Pack sequences, no padding | Most efficient, requires special attention |

### Vocabulary Considerations
```python
# Extending vocabulary for domain-specific tokens
# Add new tokens, resize embeddings, re-initialize
special_tokens = ["[CUSTOM_TOKEN_1]", "[CUSTOM_TOKEN_2]"]
tokenizer.add_tokens(special_tokens)
model.resize_token_embeddings(len(tokenizer))
# New embeddings are initialized randomly (requires fine-tuning)
```

## Key Points
- Training step: forward → loss → backward (gradients) → optimizer step → scheduler step
- Loss: cross-entropy on next-token prediction, masking non-predicted positions with -100
- AdamW is the default optimizer; 8-bit variant saves memory
- Cosine schedule with 3% warmup is the default configuration
- BF16 preferred over FP16 for stable training on modern GPUs
- Gradient checkpointing trades compute for memory, essential for models > 7B
- Pre-norm (LayerNorm/RMSNorm before sublayer) is the modern standard
- Weight decay applies to weights, not bias/norm parameters
- Gradient clipping at 1.0 prevents training instability
- Data padding wastes compute; prefer packing or longest-batch strategies
- New tokens require embedding resizing and fine-tuning
