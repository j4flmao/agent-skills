---
name: ai-model-training
description: >
  Use this skill when fine-tuning LLMs: LoRA, QLoRA, RLHF, DPO, SFT, instruction tuning, preference tuning, PEFT, prompt tuning, adapter training, training data preparation, multi-GPU training.
  This skill enforces: fine-tuning strategy selection, training data preparation with chat templates, preference pair construction, evaluation before/during/after training, training configuration documentation.
  Do NOT use for: feature store training, embedding model training (see ai-embeddings), RAG pipeline tuning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, training, fine-tuning, phase-11]
---

# Model Training Agent

## Purpose
Design model training plans for LLM fine-tuning: strategy selection, data preparation, training configuration, distributed training setup, and evaluation.

## Agent Protocol

### Trigger
User request includes: fine-tuning, LoRA, QLoRA, RLHF, DPO, PPO, training LLM, model training, instruction tuning, preference tuning, SFT, prompt tuning, adapter, PEFT, Supervised Fine-Tuning.

### Protocol
1. Clarify base model, task type, data volume, and compute budget.
2. Select fine-tuning strategy: full fine-tune vs PEFT (LoRA/QLoRA/Adapter).
3. Prepare training data: instruction format, chat template, preference pairs.
4. Configure training: hyperparameters, optimizer, learning rate schedule.
5. Set up distributed training: FSDP, DeepSpeed, multi-GPU.
6. Define evaluation: pre-training baseline, in-training metrics, post-training benchmarks.

## Output
Model training plan with fine-tuning strategy, data prep, training config, evaluation.

### Response Format
```
## Model Training Plan
### Strategy
Base Model: {name} | Parameters: {N}B
Method: {full / LoRA / QLoRA / Adapter}
LoRA Rank: {r} | Alpha: {alpha} | Target Modules: {modules}
Precision: {FP16 / BF16 / FP32}

### Data
Dataset: {name} | Size: {N} samples
Format: {instruction / chat / preference pairs}
Split: {train / eval} = {80/20}
Chat Template: {template name}

### Training Config
Epochs: {N} | Batch Size: {per_device} x {gradient_accum}
Learning Rate: {lr} | Scheduler: {cosine / linear}
Warmup: {N} steps | Weight Decay: {value}
Max Length: {tokens} | Packing: {true/false}

### Distributed Training
Framework: {FSDP / DeepSpeed / single GPU}
GPUs: {N} | Per GPU Batch: {N}
Zero Stage: {1/2/3} | CPU Offload: {true/false}

### Evaluation
Baseline: {pre-trained accuracy}
In-Training: {eval loss, accuracy}
Post-Training: {benchmark scores}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Fine-tuning strategy selected with parameter budget justification.
- [ ] Training data prepared with correct chat template and formatting.
- [ ] Training configuration documented with full hyperparameter spec.
- [ ] Distributed training setup configured for available hardware.
- [ ] Evaluation plan covers baseline, in-training, and post-training metrics.
- [ ] Training cost estimated (compute hours, API costs).

## Workflow

### Step 1: Select Fine-Tuning Strategy
- **Full Fine-Tune**: All parameters updated. Best for large distribution shifts. Requires most compute.
- **LoRA**: Low-rank adapters. ~1% of parameters. Best for task adaptation. Default choice.
- **QLoRA**: Quantized LoRA (4-bit NF4). ~0.5% of parameters. Best for limited GPU memory.
- **Adapters**: Bottleneck layers between transformer sublayers. Best for multi-task setups.

### Step 2: Prepare Training Data
```python
# Instruction format
from datasets import Dataset

data = [
    {"instruction": "Translate to French", "input": "Hello world", "output": "Bonjour le monde"},
    {"instruction": "Summarize", "input": "Long text...", "output": "Short summary..."}
]

# Chat template format (for chat models)
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct")
messages = [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
]
formatted = tokenizer.apply_chat_template(messages, tokenize=False)
```

### Step 3: Configure Training with LoRA
```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, TrainingArguments, Trainer

model = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-v0.1")

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~1.2% trainable
```

### Step 4: Training Arguments
```python
training_args = TrainingArguments(
    output_dir="./checkpoints",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    warmup_steps=100,
    num_train_epochs=3,
    logging_steps=25,
    evaluation_strategy="steps",
    eval_steps=200,
    save_strategy="steps",
    save_steps=500,
    fp16=True,
    gradient_checkpointing=True,
    report_to="wandb",
)
```

### Step 5: Distributed Training
```bash
# DeepSpeed ZeRO-3
deepspeed --num_gpus=8 train.py \
    --deepspeed ds_config.json

# ds_config.json
{
    "zero_optimization": {
        "stage": 3,
        "offload_optimizer": {"device": "cpu"},
        "offload_param": {"device": "cpu"}
    },
    "bf16": {"enabled": true},
    "gradient_accumulation_steps": 8
}
```

## Rules
- LoRA rank 8-64 depending on task complexity. Higher rank for harder tasks.
- QLoRA uses 4-bit NF4 quantization with double quantization for memory efficiency.
- Chat template must match base model's training format exactly.
- Training data deduplicated and filtered for quality — garbage in, garbage out.
- Evaluation at three stages: pre-training baseline, in-training (eval loss), post-training (benchmarks).
- Gradient checkpointing enabled for models > 7B parameters.
- Learning rate: 1e-4 to 5e-5 for LoRA, 5e-5 to 2e-5 for full fine-tune.
- Batch size maximized for GPU memory — larger batches improve training stability.
- Watch for catastrophic forgetting — use replay data from original distribution.
- Training run logged with all hyperparameters, metrics, and model checkpoints.

## References
- `references/fine-tuning-strategies.md` — Full fine-tune vs PEFT, LoRA/QLoRA, SFT, data preparation
- `references/rlhf-dpo.md` — RLHF reward model, PPO, DPO, preference data, scaling with DeepSpeed/FSDP

## Handoff
For model evaluation and testing, hand off to `ai-ai-testing`. For serving the fine-tuned model, hand off to `ml-model-serving`. For embedding model training, hand off to `ai-embeddings`.
