---
name: llm-finetuning
description: >
  Use this skill when the user says 'fine-tune an LLM', 'LoRA', 'QLoRA', 'PEFT', 'SFT', 'instruction tuning', 'TRL SFTTrainer', 'DPO', 'train on my data', 'merge adapter'. Decides whether fine-tuning is the right tool, prepares chat-format datasets, configures LoRA/QLoRA with PEFT and TRL, evaluates against the base model, and exports or serves adapters. Do NOT use for: pre-training or full-parameter distributed training (ai model-training skills), post-training quantization for serving (ai/llm-engineering/model-quantization), or prompt-only improvements (prompt-engineering/*).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, llm, fine-tuning, lora, qlora, peft, trl, sft, dpo]
---

# LLM Fine-Tuning (PEFT / LoRA)

## Purpose
Fine-tuning changes model behaviour (format, style, task skill, domain language) from examples. It is the wrong tool for injecting frequently changing facts; use retrieval for that. Parameter-efficient methods such as LoRA train small low-rank adapters on frozen base weights, making single-GPU training of 7-8B models routine and letting one base model serve many adapters.

## Agent Protocol

### Trigger
"fine-tune", "LoRA", "QLoRA", "PEFT", "SFT", "instruction tuning", "DPO", "preference tuning", "adapter", "merge_and_unload".

### Input Context
- Goal and why prompting/RAG is insufficient (with failing examples).
- Dataset: size, source, license, format, PII status.
- Base model and license; GPU type/VRAM; serving target.
- Eval set and success metric.

### Output Artifact
Go/no-go decision, dataset spec, training config, eval plan, export/serving instructions.

### Response Format
```
Decision: {fine-tune|RAG|prompting} because {reason}
Base model: {id} (license {x})  Method: {LoRA|QLoRA|full}  Stage: {SFT|DPO}
Data: {n} examples, chat format, split {train/val/test}
LoRA: r={r} alpha={a} dropout={p} targets={modules}
Train: lr={lr} epochs={e} eff_batch={b} max_len={L}
Eval: base vs tuned on {metric}; regression suite {name}
Export: {adapter|merged} -> {engine}
```

### Completion Criteria
- [ ] Baseline (prompted base model, RAG) measured first.
- [ ] Held-out test set never used for tuning decisions.
- [ ] Chat template of the base model applied consistently in training and inference.
- [ ] Tuned model beats baseline on the target metric without regressions on general checks.

## Should You Fine-Tune?
| Goal | Best tool |
|---|---|
| New/changing facts, citations | RAG |
| Output format, tone, strict schema | Prompting + structured outputs first; SFT if still unreliable |
| Narrow task at lower cost/latency | SFT a smaller model (often distilled from a larger one) |
| Preference (helpfulness, style ranking) | DPO/ORPO after SFT |
| Domain vocabulary/style | SFT (or continued pre-training for large corpora) |

## Dataset
- Use the conversational format and let the tokenizer's chat template render it:
  ```json
  {"messages": [{"role": "system", "content": "You extract invoice fields as JSON."},
                {"role": "user", "content": "<invoice text>"},
                {"role": "assistant", "content": "{\"total\": 129.5, \"currency\": \"EUR\"}"}]}
  ```
- Quality over quantity: a few hundred to a few thousand clean, diverse examples often suffice for format/task tuning.
- Deduplicate (exact + near-duplicate), remove PII/secrets, check licenses, balance classes, and keep a stratified held-out test split.
- Train on assistant tokens only (loss masking of prompts) unless you have a reason not to; TRL supports this via its completion/assistant-only loss options.

## LoRA / QLoRA Training (PEFT + TRL)

```python
from __future__ import annotations

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

BASE = "meta-llama/Llama-3.1-8B-Instruct"
USE_QLORA = True

tokenizer = AutoTokenizer.from_pretrained(BASE)
quant = BitsAndBytesConfig(
    load_in_4bit=True, bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True,
) if USE_QLORA else None

model = AutoModelForCausalLM.from_pretrained(
    BASE,
    dtype=torch.bfloat16,          # transformers >= 4.56; older versions use torch_dtype=
    quantization_config=quant,
    device_map="auto",
)

lora = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
    target_modules="all-linear",   # attention + MLP projections; better than q/v only
    task_type="CAUSAL_LM",
)

data = load_dataset("json", data_files={"train": "train.jsonl", "validation": "val.jsonl"})

args = SFTConfig(
    output_dir="out/invoice-lora",
    num_train_epochs=2,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,       # effective batch 16
    learning_rate=2e-4,                  # LoRA tolerates higher LR than full FT (~1e-5)
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=100,
    save_steps=100,
    report_to="none",
)

trainer = SFTTrainer(
    model=model, args=args, processing_class=tokenizer,
    train_dataset=data["train"], eval_dataset=data["validation"], peft_config=lora,
)
trainer.train()
trainer.save_model("out/invoice-lora/final")   # saves the adapter only
```

TRL and transformers rename arguments between releases (e.g. `tokenizer` → `processing_class`, `max_seq_length` → `max_length`); pin versions in `pyproject.toml` and check the installed release's docs.

## Hyperparameter Guide
| Param | Start | Notes |
|---|---|---|
| `r` | 8-32 | Higher for harder/new skills; diminishing returns |
| `lora_alpha` | 2·r | Effective scale = alpha/r (or alpha/√r with rsLoRA) |
| LR | 1e-4 to 2e-4 (LoRA) | Lower for larger models/datasets |
| Epochs | 1-3 | Watch val loss; more epochs → memorization |
| Max length | Cover p95 of examples | Truncation silently drops labels |

## Evaluation
1. Task metric on the held-out test set: base (best prompt) vs tuned.
2. Regression checks: general instruction following, safety refusals, a few unrelated tasks.
3. Inspect outputs manually; loss curves alone hide format collapse.

## Export & Serving
- **Adapter serving**: vLLM `--enable-lora --lora-modules invoice=out/invoice-lora/final` serves many adapters on one base.
- **Merge**: `PeftModel.from_pretrained(base_bf16, path).merge_and_unload()` then `save_pretrained`. Merge into a bf16 base, not the 4-bit one; quantize afterwards if needed.

## Anti-Patterns
- Fine-tuning to teach facts that change weekly.
- Training on the test set or tuning hyperparameters against it.
- Inconsistent chat templates between training and inference.
- Only targeting `q_proj`/`v_proj` by habit when quality matters.
- Hardcoding `.to("cuda")`; use `device_map="auto"`.
- Ignoring base-model license terms for derivatives.

## Checklist
- [ ] Baseline measured; decision documented.
- [ ] Dataset cleaned, deduped, PII-free, licensed, split.
- [ ] Chat template + assistant-only loss.
- [ ] Config versioned; library versions pinned.
- [ ] Eval: target metric + regressions.
- [ ] Export path tested in the serving engine.

## References
- Hu et al., "LoRA" (ICLR 2022); Dettmers et al., "QLoRA" (NeurIPS 2023); Rafailov et al., "DPO" (NeurIPS 2023).
- Hugging Face PEFT and TRL documentation (SFTTrainer, DPOTrainer).
