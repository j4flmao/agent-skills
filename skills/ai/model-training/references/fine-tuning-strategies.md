# Fine-Tuning Strategies

## Full Fine-Tune vs PEFT

| Aspect | Full Fine-Tune | LoRA | QLoRA | Adapters |
|---|---|---|---|---|
| Trainable params | 100% | ~1% | ~0.5% | ~2% |
| Memory (7B model) | ~56GB | ~16GB | ~8GB | ~20GB |
| Training speed | 1x | ~1.5x | ~2x | ~1.3x |
| Quality | Best | Near-full | Near-full | Good |
| Multi-task | No | Yes (swap adapters) | Yes | Yes |
| Best for | Major domain shift | Task adaptation | Limited GPU | Multi-task |

## LoRA Configuration

```python
from peft import LoraConfig, get_peft_model, TaskType
from transformers import AutoModelForCausalLM
import torch

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

# Configure LoRA
lora_config = LoraConfig(
    r=16,                     # rank - higher = more capacity
    lora_alpha=32,            # scaling factor (alpha / r)
    target_modules=[          # which modules to apply LoRA
        "q_proj",
        "v_proj",
        "k_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~1.2% of params
```

## QLoRA Configuration

```python
from transformers import BitsAndBytesConfig

# 4-bit quantization config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",           # NormalFloat4
    bnb_4bit_use_double_quant=True,      # Double quantization
    bnb_4bit_compute_dtype=torch.bfloat16,
)

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    quantization_config=bnb_config,
    device_map="auto",
)

# Then apply LoRA on top of quantized model
model = get_peft_model(model, lora_config)
# QLoRA: 4-bit base model + LoRA adapters in FP16/BF16
```

## SFT (Supervised Fine-Tuning)

```python
from transformers import TrainingArguments, Trainer
from datasets import Dataset
import json

# Instruction dataset
data = [
    {
        "instruction": "Write a poem about AI",
        "output": "Silicon dreams awake,\nLearning patterns in the data lake...",
    },
]
dataset = Dataset.from_list(data)

# Format as chat
def format_instruction(example):
    return {
        "text": f"### Instruction:\n{example['instruction']}\n\n### Response:\n{example['output']}"
    }

dataset = dataset.map(format_instruction)

# Training arguments
training_args = TrainingArguments(
    output_dir="./sft-checkpoints",
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
    remove_unused_columns=False,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    tokenizer=tokenizer,
    data_collator=lambda data: tokenizer.pad(
        [{"input_ids": d["input_ids"], "attention_mask": d["attention_mask"]} for d in data],
        return_tensors="pt",
    ),
)

trainer.train()
```

## Data Preparation for Instruction Tuning

```python
# Chat template formatting
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct-v0.2")
tokenizer.pad_token = tokenizer.eos_token

# Format messages with chat template
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is the capital of France?"},
    {"role": "assistant", "content": "The capital of France is Paris."},
]

formatted = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=False,
)

# Tokenize
tokenized = tokenizer(
    formatted,
    truncation=True,
    max_length=2048,
    padding="max_length",
    return_tensors="pt",
)

# For training, mask user input in labels
def mask_user_labels(batch, tokenizer):
    labels = batch["input_ids"].clone()
    # Find assistant response start
    assistant_token = tokenizer.encode("[/INST]", add_special_tokens=False)[0]
    assistant_start = (batch["input_ids"] == assistant_token).nonzero()[:, 1]
    # Mask user tokens with -100
    for i, start in enumerate(assistant_start):
        labels[i, :start] = -100
    batch["labels"] = labels
    return batch
```

## Hyperparameter Guidelines

| Parameter | Full Fine-Tune | LoRA | QLoRA |
|---|---|---|---|
| Learning rate | 1e-5 - 5e-5 | 1e-4 - 5e-4 | 1e-4 - 5e-4 |
| Batch size | 16-128 | 16-128 | 8-64 |
| Epochs | 2-5 | 3-10 | 3-10 |
| Warmup steps | 100-500 | 50-200 | 50-200 |
| Weight decay | 0.01-0.1 | 0.01-0.1 | 0.01-0.1 |
| LoRA rank | N/A | 8-64 | 8-64 |
| LoRA alpha | N/A | 16-128 | 16-128 |
| Precision | BF16 | BF16/FP16 | NF4 + BF16 |
