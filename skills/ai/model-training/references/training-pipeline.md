# Training Pipeline

## Pipeline Architecture

```
Data Collection → Preprocessing → Tokenization → Training → Evaluation → Export
       │               │              │             │           │           │
       ▼               ▼              ▼             ▼           ▼           ▼
  Raw data      Clean JSON     Token IDs      Checkpoints    Metrics    Adapter/Model
```

## Data Processing

### Collection Sources
- User interactions (production logs, anonymized)
- Human-annotated data (labeling platform)
- Synthetic generation (LLM-generated + validated)
- Public datasets (filtered and formatted)

### Preprocessing Steps
```python
def preprocess_pipeline(raw_data):
    # 1. Deduplicate
    data = deduplicate(raw_data, threshold=0.85)
    
    # 2. Filter quality
    data = [d for d in data if quality_score(d) > 0.7]
    
    # 3. Anonymize
    data = [anonymize(d) for d in data]
    
    # 4. Format
    data = [format_messages(d) for d in data]
    
    # 5. Split
    train, eval, test = split(data, ratios=[0.8, 0.1, 0.1])
    
    return train, eval, test
```

### Tokenization
```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B")

def tokenize_dataset(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=2048,
        padding="max_length",
    )
```

## Training Execution

### Configuration
```yaml
model:
  base: "meta-llama/Llama-3.1-8B"
  method: "lora"

training:
  output_dir: "./checkpoints"
  num_train_epochs: 3
  per_device_train_batch_size: 4
  gradient_accumulation_steps: 8
  learning_rate: 2e-4
  warmup_ratio: 0.03
  lr_scheduler_type: "cosine"
  bf16: true
  logging_steps: 10
  save_steps: 500
  eval_steps: 500
  save_total_limit: 3

logging:
  - wandb: true
  - tensorboard: true
```

### Running the Pipeline
```bash
python train.py --config configs/llama-lora.yaml \
  --dataset data/training.jsonl \
  --output-dir ./models/my-ft-v1
```

### Distributed Training
```bash
torchrun --nproc_per_node=8 train.py \
  --model meta-llama/Llama-3.1-70B \
  --method lora \
  --deepspeed configs/ds-zero2.json
```

## Checkpoint Management

### Save Strategy
- Save every N steps (configurable)
- Keep last N checkpoints (rollback support)
- Save optimizer state for training resume
- Export adapter separately from base model

### Checkpoint Selection
- Best by eval loss
- Best by task metric
- Last checkpoint (if no overfitting)
- Ensemble of top-3

## Evaluation Pipeline

### During Training
```python
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    compute_metrics=compute_metrics,
)

trainer.evaluate()
```

### Post-Training
```bash
python evaluate.py \
  --model ./models/my-ft-v1 \
  --dataset eval-suite.jsonl \
  --metrics accuracy faithfulness
```

## Export & Versioning

### Export Formats
```python
# LoRA adapter only (recommended)
model.save_pretrained("./export/lora-adapter-v1")
tokenizer.save_pretrained("./export/lora-adapter-v1")

# Merged model (optional)
merged = model.merge_and_unload()
merged.save_pretrained("./export/merged-model-v1")
```

### Versioning
```yaml
model_version:
  id: "ft-llama-8b-v3"
  base_model: "meta-llama/Llama-3.1-8B"
  method: "lora"
  rank: 16
  dataset:
    name: "support-qa-v5"
    size: 15000
  training:
    epochs: 3
    learning_rate: 2e-4
    batch_size: 32
  metrics:
    eval_loss: 0.45
    task_accuracy: 0.94
```
