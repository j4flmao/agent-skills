---
name: ai-model-training
description: >
  Use this skill when fine-tuning LLMs: LoRA, QLoRA, RLHF, DPO, SFT, instruction tuning, preference tuning, PEFT, prompt tuning, adapter training, training data preparation, multi-GPU training, distributed training, hyperparameter search, full pre-training, continued pre-training.
  This skill enforces: fine-tuning strategy selection, training data preparation with chat templates, preference pair construction, evaluation before/during/after training, training configuration documentation, distributed setup, experiment tracking.
  Do NOT use for: feature store training, embedding model training (see ai-embeddings), RAG pipeline tuning, inference optimization.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, training, fine-tuning, distributed-training, hpo, experiment-tracking, phase-11]
---

# Model Training Agent

## Purpose
Design and execute model training plans for LLM fine-tuning, continued pre-training, and RLHF alignment: strategy selection, data pipeline, training configuration, distributed setup, hyperparameter optimization, evaluation, and production tracking.

## Agent Protocol

### Trigger
User request includes: fine-tuning, LoRA, QLoRA, RLHF, DPO, PPO, training LLM, model training, instruction tuning, preference tuning, SFT, prompt tuning, adapter, PEFT, Supervised Fine-Tuning, distributed training, hyperparameter search, pre-training, continued pre-training.

### Protocol
1. Clarify: base model, task type, data volume (size + tokens), compute budget (GPU hours, dollars), hardware available.
2. Navigate decision tree to select training approach.
3. Prepare training data: format (instruction / chat / preference pairs), tokenize, split, validate.
4. Configure training: hyperparameters, optimizer, LR schedule, precision, batch size.
5. Design distributed setup: single GPU, FSDP, DeepSpeed, multi-node.
6. Define evaluation: pre-training baseline, in-training metrics, post-training benchmarks, forgetting checks.
7. Set up experiment tracking: metrics logging, checkpoint registry, hyperparameter capture.

### Decision Tree: Training Approach
```
Q: Is this your first time training this model?
├── NO  → Go to "Fine-tuning or continued pre-training?"
└── YES → Go to "Available compute?"

Q: Available compute?
├── < 16 GB VRAM → QLoRA (4-bit NF4, double quant)
│   LoRA rank <= 32, batch size 1-2, gradient checkpointing req.
├── 16-48 GB VRAM → LoRA (BF16 base)
│   LoRA rank 16-64, batch size 2-8
├── 48-160 GB VRAM → Full fine-tune (single node)
│   BF16, gradient checkpointing, DeepSpeed ZeRO-2/3
└── > 160 GB VRAM / multi-node → Full fine-tune (distributed)
    BF16, FSDP or DeepSpeed ZeRO-3, tensor parallelism for 70B+

Q: Fine-tuning or continued pre-training?
├── Task adaptation (< 100K examples)           → LoRA
├── Domain shift / style change (> 100K examples) → Full fine-tune
├── New knowledge / continued pre-training       → Full pre-train or continued pre-train
└── Align model behavior                         → Go to "Alignment method?"

Q: Alignment method?
├── Human preference data available?
│   ├── YES → Ask: KL control importance?
│   │   ├── HIGH → PPO (3-stage: SFT → RM → PPO)
│   │   └── LOW  → DPO (single stage, no reward model)
│   └── NO  → SFT only (instruction tuning)
└── Want to avoid reward model training?
    ├── YES → DPO
    └── NO  → PPO (if compute budget allows 3 stages)

Q: Multi-task / multi-domain?
├── YES → Use LoRA adapters per task with shared base
│   Consider: AdapterFusion, LoRA ensembles
└── NO  → Single adapter or full fine-tune

Q: Data size for instruction tuning?
├── < 1K examples → Use LoRA, start with higher LR (3e-4), more epochs (5-10)
├── 1K-10K examples → LoRA, standard config, 3-5 epochs
├── 10K-100K examples → LoRA or full fine-tune, 2-3 epochs
└── > 100K examples → Full fine-tune preferred, 1-2 epochs
```

## Workflow

### Step 1: Select Training Method
- **Full Pre-training**: Train from scratch. Requires massive data (1T+ tokens), compute, and engineering. Only when no suitable base model exists.
- **Continued Pre-training**: Train on existing base with new domain data (code, biomedical, legal). Use same tokenizer, extend vocab if needed. LR 1e-5 to 5e-5.
- **Full Fine-tune**: All parameters updated. Best for large distribution shifts. Requires most compute. LR 1e-5 to 5e-5.
- **LoRA**: Low-rank adapters. ~1% of parameters. Best for task adaptation. Default choice. LR 1e-4 to 5e-4.
- **QLoRA**: Quantized LoRA (4-bit NF4) with double quantization. ~0.5% of parameters. Best for limited GPU memory. LR 1e-4 to 3e-4.
- **Adapters**: Bottleneck layers between transformer sublayers. Best for multi-task setups.
- **DPO**: Direct Preference Optimization. Single-stage alignment. No reward model needed.
- **PPO**: 3-stage RLHF. SFT → Reward Model → PPO. Most compute but best alignment control.

### Step 2: Prepare Training Data

#### Instruction Format
```python
from datasets import Dataset

data = [
    {"instruction": "Translate to French", "input": "Hello world", "output": "Bonjour le monde"},
    {"instruction": "Summarize", "input": "Long text...", "output": "Short summary..."}
]
```

#### Chat Template Format
```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct")
tokenizer.pad_token = tokenizer.eos_token
messages = [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
]
formatted = tokenizer.apply_chat_template(messages, tokenize=False)
```

#### Preference Pairs (for DPO/RLHF)
```python
preference_data = [
    {
        "prompt": "What is the capital of France?",
        "chosen": "Paris is the capital of France.",
        "rejected": "London is the capital of France."
    }
]
```

#### Tokenization with Label Masking
```python
def tokenize_and_mask(examples, tokenizer, max_length=2048):
    outputs = tokenizer(
        examples["text"],
        truncation=True,
        max_length=max_length,
        padding="max_length",
        return_tensors=None,
    )
    # Copy input_ids to labels, mask user tokens with -100
    outputs["labels"] = outputs["input_ids"].copy()
    return outputs
```

#### Data Splitting & Validation
```python
# Split: train (80%), eval (10%), test (10%)
# Stratify by category if available
from sklearn.model_selection import train_test_split

def prepare_splits(data, stratify_col=None):
    train_val, test = train_test_split(
        data, test_size=0.1, stratify=stratify_col
    )
    train, eval = train_test_split(
        train_val, test_size=0.111, stratify=stratify_col
    )
    return train, eval, test
```

### Step 3: Configure Training with LoRA
```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, TrainingArguments, Trainer
import torch

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
```

### Step 4: Training Arguments
```python
training_args = TrainingArguments(
    output_dir="./checkpoints",
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    num_train_epochs=3,
    logging_steps=10,
    logging_strategy="steps",
    evaluation_strategy="steps",
    eval_steps=200,
    save_strategy="steps",
    save_steps=500,
    save_total_limit=3,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    bf16=True,
    tf32=True,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    optim="adamw_torch",
    weight_decay=0.01,
    max_grad_norm=1.0,
    report_to="wandb",
    run_name=f"lora-ft-{model_name}-{timestamp}",
    remove_unused_columns=False,
    dataloader_num_workers=4,
    ddp_find_unused_parameters=False,
)
```

### Step 5: Trainer Setup
```python
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    tokenizer=tokenizer,
    data_collator=lambda data: tokenizer.pad(
        [{"input_ids": d["input_ids"], "attention_mask": d["attention_mask"], "labels": d["labels"]} for d in data],
        return_tensors="pt",
    ),
    compute_metrics=compute_metrics_fn if eval_task else None,
)
trainer.train()
```

### Step 6: Distributed Training

#### FSDP Configuration
```yaml
# fsdp_config.yaml
compute_environment: LOCAL_MACHINE
distributed_type: FSDP
fsdp_config:
  fsdp_auto_wrap_policy: TRANSFORMER_BASED_WRAP
  fsdp_backward_prefetch: BACKWARD_PRE
  fsdp_cpu_ram_efficient_loading: true
  fsdp_forward_prefetch: false
  fsdp_offload_params: false
  fsdp_sharding_strategy: FULL_SHARD
  fsdp_state_dict_type: SHARDED_STATE_DICT
  fsdp_transformer_layer_cls_to_wrap: LlamaDecoderLayer
  fsdp_use_orig_params: true
machine_rank: 0
main_training_function: main
mixed_precision: bf16
num_machines: 1
num_processes: 8
rdzv_backend: static
same_network: true
tpu_env: []
tpu_use_cluster: false
tpu_use_sudo: false
use_cpu: false
```

#### DeepSpeed ZeRO-3 Configuration
```json
{
    "zero_optimization": {
        "stage": 3,
        "offload_optimizer": {"device": "cpu", "pin_memory": true},
        "offload_param": {"device": "cpu", "pin_memory": true},
        "overlap_comm": true,
        "contiguous_gradients": true,
        "reduce_bucket_size": 5e7,
        "stage3_prefetch_bucket_limit": 5e7,
        "stage3_param_persistence_threshold": 1e6,
        "sub_group_size": 1e9
    },
    "bf16": {"enabled": true},
    "fp16": {"enabled": false},
    "gradient_accumulation_steps": 8,
    "gradient_clipping": 1.0,
    "steps_per_print": 100,
    "train_batch_size": 32,
    "train_micro_batch_size_per_gpu": 4,
    "wall_clock_breakdown": false
}
```

#### Launch Commands
```bash
# DeepSpeed
deepspeed --num_gpus=8 train.py \
    --deepspeed ds_config.json \
    --model_name meta-llama/Llama-2-13b-hf

# FSDP via torchrun
torchrun --nproc_per_node=8 train.py \
    --fsdp full_shard \
    --fsdp_transformer_layer_cls_to_wrap LlamaDecoderLayer

# Multi-node
torchrun --nnodes=4 --nproc_per_node=8 --rdzv_id=101 --rdzv_backend=c10d train.py
```

## Architectural Patterns

### Data Pipeline Architecture
```
Raw Sources (JSONL, Parquet, DB)
  → Data Cleaner (PII removal, dedup, quality scoring)
    → Formatter (chat template, instruction format)
      → Tokenizer (map-style dataset with caching)
        → DataLoader (batching, shuffling, num_workers)
          → Training Loop
```
Key design decisions:
- Use `datasets` library with memory mapping for large datasets (no full RAM load).
- Cache tokenized datasets to disk (`keep_in_memory=False`) between runs.
- Set `dataloader_num_workers=4-8` to avoid GPU starvation.
- Use ` StreamingDataset` for datasets larger than available disk.

### Training Loop Architecture
```python
# Custom training loop (when Trainer is insufficient)
for epoch in range(num_epochs):
    for step, batch in enumerate(train_dataloader):
        batch = {k: v.to(device) for k, v in batch.items()}

        with ctx:  # autocast for mixed precision
            outputs = model(**batch)
            loss = outputs.loss / gradient_accumulation_steps

        loss_scaler.scale(loss).backward()

        if (step + 1) % gradient_accumulation_steps == 0:
            loss_scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
            loss_scaler.step(optimizer)
            loss_scaler.update()
            optimizer.zero_grad()

        if step % logging_steps == 0:
            metrics = compute_metrics(model, eval_loader, device)
            log_to_tracker({"train/loss": loss.item(), **metrics})
```

### Checkpointing Architecture
```python
class CheckpointManager:
    def __init__(self, output_dir, save_every_n_steps, keep_last_k):
        self.dir = output_dir
        self.save_every = save_every_n_steps
        self.keep = keep_last_k
        self.checkpoints = []

    def save(self, model, optimizer, scheduler, step, metrics):
        if step % self.save_every != 0 and not self._is_best(metrics):
            return
        ckpt_path = os.path.join(self.dir, f"step_{step}")
        os.makedirs(ckpt_path, exist_ok=True)
        save_args = {
            "state_dict": model.state_dict(),
            "optimizer": optimizer.state_dict(),
            "scheduler": scheduler.state_dict(),
            "step": step,
            "metrics": metrics,
        }
        torch.save(save_args, os.path.join(ckpt_path, "training_state.pt"))
        model.save_pretrained(ckpt_path)
        self.checkpoints.append((step, metrics.get("eval_loss", float("inf"))))
        self.checkpoints.sort(key=lambda x: x[1])
        while len(self.checkpoints) > self.keep:
            stale_step = self.checkpoints.pop()[0]
            shutil.rmtree(os.path.join(self.dir, f"step_{stale_step}"))
```

### Evaluation Loop Architecture
```python
# In-training evaluation
# Run on a fixed subset of eval data (500-1000 samples) every N steps
# Track: eval_loss, perplexity, task accuracy, gradient norms
#
# Pre-training baseline: run before training starts
# In-training: every N steps on eval subset
# Post-training: full benchmark suite after training
#
# Catastrophic forgetting detection:
# - Maintain a "forgetting set" of diverse tasks
# - Track scores relative to pre-training baseline
# - Alert if any task drops > 5% from baseline

def evaluate_model(model, eval_dataset, tokenizer, device, max_samples=500):
    model.eval()
    total_loss = 0.0
    total_steps = 0
    with torch.no_grad():
        for batch in islice(eval_dataloader, max_samples // batch_size):
            batch = {k: v.to(device) for k, v in batch.items()}
            outputs = model(**batch)
            total_loss += outputs.loss.item()
            total_steps += 1
    return {"eval_loss": total_loss / total_steps, "perplexity": math.exp(total_loss / total_steps)}
```

## Training Infrastructure Design

### Compute
| GPU | VRAM | FP16 TFLOPS | BF16 TFLOPS | Best For |
|-----|------|-------------|-------------|----------|
| RTX 4090 | 24 GB | 82 | N/A | QLoRA, LoRA ≤13B |
| A100 80GB | 80 GB | 312 | 312 | Full FT ≤13B, LoRA ≤70B |
| H100 | 80 GB | 989 | 989 | Full FT ≤70B, pre-training |
| H200 | 141 GB | 989 | 989 | Full FT ≤70B+ |
| MI300X | 192 GB | 653 | 653 | Alternative to H100 |

### Storage Requirements
- **Dataset storage**: NVMe SSD recommended. Tokenized datasets benefit from fast random access.
- **Checkpoint storage**: Large contiguous writes. One 70B checkpoint = ~140 GB (BF16) or ~560 GB (optimizer states + model). Budget 3-5x model size for checkpoint space.
- **Model registry**: Object storage (S3, GCS, Blob) for versioned artifacts.
- **Cache**: HuggingFace cache directory needs 10-100 GB for base models.

### Networking (Multi-Node)
- **Minimum**: 25 Gbps Ethernet. Expect 30-40% scaling efficiency.
- **Recommended**: 200-400 Gbps InfiniBand (HDR/HDR100/NDR). Expect 80-90% scaling efficiency.
- **Topology**: Fat-tree or Dragonfly for GPU clusters.
- **NCCL**: Use `NCCL_IB_HCA`, `NCCL_SOCKET_IFNAME`, tune `NCCL_IB_TIMEOUT` and `NCCL_IB_RETRY_CNT`.

### CPU/RAM Guidelines
- **Per GPU**: Minimum 64 GB system RAM per GPU (128 GB recommended for ZeRO-3 with CPU offload).
- **CPU cores**: At least 8-16 cores per GPU for data loading and preprocessing.

## Hyperparameter Optimization Strategies

### Bayesian Optimization with Optuna
```python
import optuna
from optuna.integration import TransformersPruningCallback

def objective(trial):
    lr = trial.suggest_float("learning_rate", 5e-5, 5e-4, log=True)
    lora_r = trial.suggest_int("lora_r", 8, 64)
    lora_alpha = trial.suggest_int("lora_alpha", 16, 128)
    weight_decay = trial.suggest_float("weight_decay", 0.0, 0.1)
    warmup_ratio = trial.suggest_float("warmup_ratio", 0.01, 0.1)
    dropout = trial.suggest_float("lora_dropout", 0.0, 0.3)

    config = LoraConfig(r=lora_r, lora_alpha=lora_alpha, lora_dropout=dropout)
    model = get_peft_model(base_model, config)

    args = TrainingArguments(
        learning_rate=lr,
        weight_decay=weight_decay,
        warmup_ratio=warmup_ratio,
        num_train_epochs=2,
        report_to="none",
        logging_steps=50,
        save_strategy="no",
    )
    trainer = Trainer(model=model, args=args, train_dataset=train_data, eval_dataset=eval_data)
    trainer.train()
    eval_result = trainer.evaluate()
    return eval_result["eval_loss"]

study = optuna.create_study(direction="minimize", pruner=optuna.pruners.MedianPruner())
study.optimize(objective, n_trials=20)
print(f"Best params: {study.best_params}, best loss: {study.best_value}")
```

### Learning Rate Range Test
```python
# Find optimal LR by running a short training with increasing LR
# Use lr_finder from transformers or implement manually
def lr_range_test(model, dataloader, optimizer_cls, device, min_lr=1e-7, max_lr=1):
    optimizer = optimizer_cls(model.parameters(), lr=min_lr)
    num_batches = len(dataloader)
    lr_mult = (max_lr / min_lr) ** (1 / num_batches)
    losses = []
    lrs = []

    for step, batch in enumerate(dataloader):
        batch = {k: v.to(device) for k, v in batch.items()}
        loss = model(**batch).loss / 1
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()

        losses.append(loss.item())
        lrs.append(optimizer.param_groups[0]["lr"])

        optimizer.param_groups[0]["lr"] *= lr_mult
        if loss.item() > 3 * min(losses):
            break

    return lrs, losses
    # Optimal LR is near the steepest descent point
```

### Key Hyperparameter Rules
| Parameter | SFT LoRA | Full FT | DPO | Pre-training |
|-----------|----------|---------|-----|-------------|
| Learning rate | 1e-4 to 5e-4 | 1e-5 to 5e-5 | 5e-7 to 5e-6 | 1e-4 to 3e-4 |
| LoRA rank | 8-64 | N/A | 16-64 | N/A |
| LoRA alpha | 16-128 | N/A | 16-64 | N/A |
| Batch size (effective) | 16-128 | 32-512 | 16-64 | 512-4096 |
| Warmup ratio | 0.03-0.1 | 0.03-0.1 | 0.05-0.15 | 0.01-0.05 |
| Weight decay | 0.01-0.1 | 0.01-0.1 | 0.0-0.1 | 0.01-0.1 |
| Epochs | 3-10 | 2-5 | 1-3 | 1-3 (tokens) |
| LR scheduler | cosine | cosine | cosine | cosine or warmup-stable-decay |
| Gradient clipping | 1.0 | 1.0 | 1.0 | 1.0 |

## Anti-Patterns & Troubleshooting

### Anti-Pattern 1: Overfitting
**Symptom**: Training loss decreases but eval loss increases (divergence).
**Detection**: Track train_loss - eval_loss gap. If gap > 20% of train_loss for 3+ eval steps.
**Fixes**:
- Reduce epochs (early stopping when eval loss plateaus)
- Increase LoRA dropout (0.05 → 0.2)
- Add weight decay (0.01 → 0.1)
- Increase data (augmentation, synthetic data)
- Reduce model capacity (lower LoRA rank)
- Add replay data from original distribution

### Anti-Pattern 2: Underfitting
**Symptom**: Both train and eval losses are high and flat.
**Detection**: Loss is > 2x expected perplexity baseline.
**Fixes**:
- Increase learning rate
- Increase LoRA rank (16 → 64)
- More training epochs
- Check for data issues (wrong format, mismatched tokenizer)
- Remove excessive dropout or regularization
- Verify model is actually training (check gradient norms)

### Anti-Pattern 3: Data Leakage
**Symptom**: Eval metrics are unrealistically high but model fails in production.
**Types**:
- **Temporal leakage**: Training on future data (time-series). Fix: split by time.
- **Feature leakage**: Eval features present in training. Fix: ensure strict separation.
- **Benchmark contamination**: Test examples leaked into training data. Fix: deduplicate against known benchmarks.
- **LLM-generated eval data**: Using the same LLM for data generation and evaluation.

### Anti-Pattern 4: Compute Waste
**Symptoms**: GPU utilization < 50%, long idle times between steps.
**Fixes**:
- Increase `dataloader_num_workers` to match CPU count per GPU
- Enable `prefetch_factor` in DataLoader
- Profile with `nsys` or PyTorch profiler to find bottlenecks
- Use `padding_free` / unified padding for variable-length sequences
- Reduce evaluation frequency if eval is slow
- Save checkpoints asynchronously (save on separate thread)
- Use Flash Attention if available

### Anti-Pattern 5: Training Instability
**Symptom**: Loss spikes, NaN loss, gradient explosion.
**Detection**: Monitor loss values, gradient norms, max/sum of gradients.
**Fixes**:
- Reduce learning rate
- Enable gradient clipping (1.0)
- Warm up LR more slowly
- Use BF16 instead of FP16 (BF16 doesn't overflow)
- Check for NaN in input data
- Reduce batch size (smaller per-device + fewer accumulation steps)
- Ensure loss scaling is configured correctly

### Anti-Pattern 6: Catastrophic Forgetting
**Symptom**: Performance on general benchmarks drops after fine-tuning.
**Fixes**:
- Include 10-30% general data in training mix
- Use lower learning rate (1e-5 for LoRA)
- Multi-task learning: train task + general data simultaneously
- Elastic Weight Consolidation (EWC)
- Keep LoRA rank low to limit representational shift

### Anti-Pattern 7: DPO Overfitting / Reward Hacking
**Symptom**: Policy exploits reward model rather than learning actual preference.
**Fixes**:
- Increase KL penalty (beta in DPO: 0.1 → 0.5)
- Limit PPO epochs per batch (3-4 max)
- Use reference model for KL regularization
- Monitor response diversity (distinct n-grams)
- Human evaluation alongside automated metrics

## Production: Experiment Tracking & Model Registry

### Experiment Tracking Setup
```python
# Initialize logging to multiple backends
import wandb
from torch.utils.tensorboard import SummaryWriter

# W&B setup
wandb.init(
    project="model-fine-tuning",
    config={
        "model": "Mistral-7B",
        "method": "lora",
        "lora_r": 16,
        "learning_rate": 2e-4,
        "batch_size": 32,
        "epochs": 3,
        "dataset": "support-qa-v5",
        "dataset_size": 15000,
    },
    tags=["experiment", "lora-ft"],
)

# What to log every N steps:
# - train/loss
# - train/grad_norm
# - eval/loss
# - eval/perplexity
# - eval/task_accuracy (if available)
# - train/learning_rate
# - train/epoch

# What to log once:
# - model architecture summary
# - dataset statistics
# - hardware info (GPU type, count, RAM)
# - git commit hash
# - hyperparameter config (full yaml/json dump)
```

### Model Registry (MLflow Style)
```python
# Model versioning schema
model_registry_entry = {
    "model_id": "ft-mistral-7b-v3",
    "base_model": "mistralai/Mistral-7B-v0.1",
    "method": "lora",
    "hyperparameters": {
        "lora_r": 16,
        "lora_alpha": 32,
        "learning_rate": 2e-4,
        "batch_size": 32,
        "epochs": 3,
    },
    "dataset": {
        "name": "support-qa-v5",
        "size": 15000,
        "hash": "sha256:abc123...",
    },
    "metrics": {
        "eval_loss": 0.45,
        "task_accuracy": 0.94,
        "mmlu_before": 0.63,
        "mmlu_after": 0.61,
        "forgetting_delta": -0.02,
    },
    "artifacts": {
        "adapter_path": "s3://models/ft-mistral-7b-v3/adapter/",
        "tokenizer_path": "s3://models/ft-mistral-7b-v3/tokenizer/",
        "config_path": "s3://models/ft-mistral-7b-v3/config.yaml",
        "checkpoints": "s3://models/ft-mistral-7b-v3/checkpoints/",
    },
    "training_metadata": {
        "compute_hours": 48,
        "gpu_type": "A100-80GB",
        "gpu_count": 8,
        "framework": "transformers 4.38 + peft 0.9",
        "start_time": "2025-01-15T10:00:00Z",
        "end_time": "2025-01-17T10:00:00Z",
    },
    "status": "production",  # experimental, staging, production, archived
    "tags": ["fine-tuned", "support-qa"],
}
```

### Training Monitoring Dashboard
```python
# Key panels to include in monitoring dashboard
DASHBOARD_PANELS = [
    ("Training Loss", "train/loss", "line", "Should decrease smoothly, no spikes"),
    ("Eval Loss", "eval/loss", "line", "Should follow train loss, not diverge"),
    ("Perplexity", "eval/perplexity", "line", "exp(eval_loss). < 10 is good for most tasks"),
    ("Gradient Norm", "train/grad_norm", "line", "Should be stable < 5x. Spikes = instability"),
    ("Learning Rate", "train/learning_rate", "line", "Should follow schedule"),
    ("GPU Utilization", "system/gpu_util", "line", "Target > 80%. Lower = data bottleneck"),
    ("GPU Memory", "system/gpu_mem_alloc", "line", "Watch for OOM. Should be stable"),
    ("Throughput", "train/samples_per_sec", "line", "Samples/sec across all GPUs"),
    ("Epoch Progress", "train/epoch", "line", "Progress through epochs"),
    ("Overfitting Delta", "eval/train_eval_gap", "line", "Train loss - eval loss. Widening = overfit"),
]
```

### Cost Estimation
```python
def estimate_training_cost(gpu_type, gpu_count, hours, cloud_rate_per_hour=None):
    rates = {
        "A100-80GB": 3.0,   # on-demand approximate
        "H100": 5.0,
        "RTX-4090": 0.5,
        "L40S": 2.0,
    }
    rate = cloud_rate_per_hour or rates.get(gpu_type, 3.0)
    return gpu_count * hours * rate

# Examples:
# LoRA 7B on 1x A100 for 4 hours: 1 * 4 * 3.0 = $12
# Full FT 70B on 8x H100 for 24 hours: 8 * 24 * 5.0 = $960
# Pre-train 8B on 256x H100 for 30 days: 256 * 720 * 5.0 = $921,600
```

## Rules
- LoRA rank 8-64 depending on task complexity. Higher rank for harder tasks.
- QLoRA uses 4-bit NF4 quantization with double quantization for memory efficiency.
- Chat template must match base model's training format exactly.
- Training data deduplicated and filtered for quality.
- Evaluation at three stages: pre-training baseline, in-training (eval loss), post-training (benchmarks).
- Gradient checkpointing enabled for models > 7B parameters.
- Set `padding=False` in tokenizer and use `DataCollatorWithPadding` for variable-length batches.
- Learning rate: 1e-4 to 5e-5 for LoRA, 5e-5 to 2e-5 for full fine-tune.
- Batch size maximized for GPU memory — larger batches improve training stability.
- Watch for catastrophic forgetting — include 10-30% general data replay.
- Track experiment with all hyperparameters, metrics, and model checkpoints.
- Use `torch.compile` for 10-30% throughput improvement (PyTorch 2.0+).
- Enable Flash Attention 2 (`attn_implementation="flash_attention_2"`) when available.
- For LoRA: target both attention and FFN modules (q, k, v, o, gate, up, down).
- Run a single overfit batch test before full training (model should memorize one batch).
- Log the training config as YAML/JSON artifact for reproducibility.
- Pin environment versions: `torch==2.1.0`, `transformers==4.36.0`, `peft==0.7.0`.

## Completion Criteria
- [ ] Training approach selected using decision tree with justification.
- [ ] Training data prepared with correct chat template and formatting.
- [ ] Training configuration documented with full hyperparameter spec & rationale.
- [ ] Distributed training setup configured for available hardware.
- [ ] Evaluation plan covers baseline, in-training, and post-training metrics.
- [ ] Anti-pattern checks applied: overfitting, underfitting, data leakage, compute waste.
- [ ] Experiment tracking configured (W&B/MLflow/TensorBoard).
- [ ] Training cost estimated (compute hours, cloud costs).
- [ ] Model registry entry drafted for versioning.

## References
- references/fine-tuning-guide.md — Fine-Tuning Guide
- references/fine-tuning-strategies.md — Fine-Tuning Strategies
- references/model-training-advanced.md — Model Training: Advanced Distributed & Scaling Topics
- references/model-training-data-prep.md — Model Training Data Preparation
- references/model-training-evaluation.md — Model Training Evaluation
- references/model-training-fundamentals.md — Model Training: Core Concepts & Training Loop Fundamentals
- references/rlhf-dpo.md — RLHF & DPO
- references/training-pipeline.md — Training Pipeline
- references/hyperparameter-optimization.md — Hyperparameter Optimization
- references/production-experiment-tracking.md — Production Experiment Tracking & Model Registry
- references/distributed-training-architecture.md — Distributed Training Architecture
- references/training-infrastructure-design.md — Training Infrastructure Design
- references/anti-patterns-troubleshooting.md — Anti-Patterns & Troubleshooting

## Handoff
For model evaluation and testing, hand off to `ai-ai-testing`. For serving the fine-tuned model, hand off to `ml-model-serving`. For embedding model training, hand off to `ai-embeddings`. For data labeling / curation, hand off to `ai-data-engineering`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive SFT, LoRA/QLoRA & RLHF/DPO training methodologies)
Strict compliance with distributed data loading, optimization schedules, and loss evaluation.
-->

