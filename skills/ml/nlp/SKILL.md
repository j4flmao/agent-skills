---
name: ml-nlp
description: >
  Use this skill when building NLP pipelines, applying spaCy for tokenization/NER/POS, using HuggingFace Transformers for text classification/sentiment/summarization/QA, or fine-tuning transformer models.
  This skill enforces: NLP pipeline design (tokenization, normalization, POS, NER, parsing), framework selection (spaCy vs HuggingFace vs NLTK), model selection by task, fine-tuning strategy (full vs PEFT/LoRA), inference optimization.
  Do NOT use for: audio/speech processing, computer vision with text (use ml-computer-vision), traditional ML on text features (use ml-classical-ml), or prompt engineering (use ai-prompt-engineering).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, nlp, text, phase-11]
---

# ML NLP

## Quick Start
```python
from transformers import pipeline
classifier = pipeline("sentiment-analysis")
result = classifier("I loved this movie!")
print(result)
```

## Purpose
Design NLP pipelines for text processing and transformer-based models with appropriate framework selection, model architecture, fine-tuning strategy, and inference setup.

## Architecture/Decision Trees

### Model Architecture Selection
```
NLP task type
  ├── Understanding tasks (classify, tag, extract)
  │   ├── Text classification, sentiment → BERT, RoBERTa, DeBERTa
  │   ├── NER, POS tagging → BERT, RoBERTa + CRF head
  │   ├── Extractive QA → BERT, RoBERTa, ALBERT
  │   ├── Sentence similarity → SBERT, RoBERTa (SentenceTransformers)
  │   └── Few-shot classification → SetFit (sentence transformers + logistic)
  ├── Generation tasks (generate, summarize, translate)
  │   ├── Summarization → BART, T5, Pegasus
  │   ├── Translation → MarianMT, NLLB-200, mT5
  │   ├── Generic generation → GPT-2, Llama, Mistral
  │   └── Code generation → CodeLlama, StarCoder
  └── Sequence-to-sequence
      ├── Table-to-text → T5, BART
      ├── Grammar correction → T5, BART
      └── Dialogue → T5, FLAN-T5
```

### Model Size Selection
```
Dataset size and accuracy needs
  ├── Classification / NER
  │   ├── <1K examples → DistilBERT / ALBERT (small, less overfitting)
  │   ├── 1K-10K → BERT-base / RoBERTa-base
  │   ├── 10K-100K → RoBERTa-large / DeBERTa-base
  │   └── >100K → DeBERTa-large / ELECTRA
  ├── Summarization / Translation
  │   ├── <10K → BART-base / T5-small (smaller models generalize better)
  │   ├── 10K-100K → BART-large / T5-base
  │   └── >100K → Pegasus / T5-large / NLLB
  └── LLM (>1B params)
      ├── <10K examples → LoRA with 7B model (QLoRA for single GPU)
      ├── 10K-100K → LoRA with 13B-70B model
      └── >100K → Full fine-tune 7B-13B model
```

### Fine-Tuning Strategy Decision Tree
```
Compute budget (GPU memory)
  ├── <12GB (consumer GPU: RTX 3060, 2080)
  │   ├── <1B model → Full fine-tune (batch_size=8, grad_accum=4)
  │   ├── 1-7B model → QLoRA (4-bit quantization + LoRA)
  │   └── >7B model → QLoRA with gradient checkpointing
  ├── 12-24GB (RTX 3090, 4080)
  │   ├── <3B model → Full fine-tune or LoRA
  │   ├── 3-13B model → LoRA / QLoRA (8-bit)
  │   └── >13B model → QLoRA (4-bit)
  ├── 24-48GB (A10G, A100 40GB)
  │   ├── <7B model → Full fine-tune
  │   ├── 7-13B model → LoRA (full precision) or full fine-tune with FSDP
  │   └── >13B model → LoRA / QLoRA
  └── >48GB (A100 80GB, H100)
      ├── <13B model → Full fine-tune with FSDP
      ├── 13-70B → FSDP / DeepSpeed ZeRO-3
      └── >70B → DeepSpeed ZeRO-3 + CPU offloading
```

## Agent Protocol

### Trigger
User request includes: NLP, natural language processing, NLTK, spaCy, HuggingFace, BERT, text classification, NER, sentiment analysis, summarization, tokenization, embedding, transformer, fine-tuning.

### Input Context
Before activating, verify:
- NLP task type (classification, NER, sentiment, summarization, QA, translation, generation).
- Language(s) involved (monolingual, multilingual, low-resource).
- Dataset size for fine-tuning (few-shot, hundreds, thousands, millions).
- Deployment constraints (latency, throughput, memory, device).
- Budget for compute (CPU inference, GPU fine-tuning, cloud TPU).

### Output Artifact
NLP pipeline with framework selection, model choice, training strategy, inference setup.

### Response Format
```
## NLP Pipeline
### Task
{classification / NER / sentiment / summarization / QA / translation / generation}
Model: {model_name} | Size: {base / large / xl}

### Preprocessing
Tokenization: {wordpiece / BPE / sentencepiece}
Max Length: {N} | Truncation: {left / right}

### Training
Strategy: {full / LoRA / prefix tuning / adapter}
Learning Rate: {value} | Schedule: {linear / cosine}
Precision: {fp32 / fp16 / bf16}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Task and language identified with appropriate framework.
- [ ] Preprocessing pipeline defined (tokenization, normalization, max length).
- [ ] Model architecture selected by task and compute budget.
- [ ] Fine-tuning strategy matched to compute budget.
- [ ] Evaluation metrics selected for the task (F1, BLEU, ROUGE, perplexity).
- [ ] Inference optimization configured (quantization, ONNX, batching).

## Workflow

### Step 1: Task & Framework Selection
Text classification: HuggingFace Transformers (BERT, RoBERTa). Production: spaCy with transformer wrapper. NER: spaCy (production pipeline, entity merging). Summarization: BART (best quality-size), T5 (flexible), Pegasus (SOTA). QA: BERT (extractive), T5/BART (generative). Translation: MarianMT (per-language pairs), NLLB-200 (many languages).

```python
# Framework comparison
def select_framework(task, production=False, latency_sensitive=False):
    if task in ["classification", "sentiment"]:
        return "spacy" if production else "transformers"
    elif task == "ner":
        return "spacy" if production else "transformers"
    elif task in ["summarization", "translation"]:
        return "transformers"
    elif task == "qa":
        return "transformers"
```

### Step 2: Preprocessing
Tokenization: WordPiece (BERT, 30k), BPE (GPT, RoBERTa, 50k), SentencePiece (T5, unigram). Normalization: lowercase for sentiment/classification, preserve case for NER. Max sequence length: 128 (binary classif), 256 (topic classif), 384 (NER), 512 (extractive QA), 1024+ (summarization). Dynamic padding via DataCollatorWithPadding.

```python
from transformers import AutoTokenizer, DataCollatorWithPadding

def setup_tokenizer(model_name="bert-base-uncased", max_length=512):
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    return tokenizer

def tokenize_function(examples, tokenizer, max_length=512):
    return tokenizer(
        examples["text"],
        truncation=True,
        padding=False,  # Dynamic padding in collator
        max_length=max_length,
    )

# Data collator for dynamic padding
data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
```

### Step 3: Model Selection
Encoder-only (BERT, RoBERTa, DeBERTa): bidirectional attention, best for understanding. Decoder-only (GPT, Llama, Mistral): causal attention, best for generation. Encoder-decoder (T5, BART, MarianMT): best for seq2seq. Multilingual: mBERT (104 languages), XLM-R (100 languages), NLLB (200 languages).

```python
def select_model(task, size="base"):
    models = {
        "classification": {"base": "bert-base-uncased", "large": "roberta-large"},
        "ner": {"base": "bert-base-uncased", "large": "roberta-large"},
        "summarization": {"base": "facebook/bart-base", "large": "facebook/bart-large"},
        "translation": {"base": "Helsinki-NLP/opus-mt-en-es", "large": "facebook/nllb-200-distilled-600M"},
        "qa": {"base": "bert-base-uncased", "large": "deepset/roberta-large-squad2"},
        "sentence-similarity": {"base": "sentence-transformers/all-MiniLM-L6-v2"},
    }
    return models.get(task, {}).get(size, "bert-base-uncased")
```

### Step 4: Fine-Tuning
Full fine-tuning: update all params. Best quality, highest compute. LoRA: train low-rank matrices (rank 8-64) in attention layers. ~0.1-1% params trainable. Near full FT quality. QLoRA: 4-bit NormalFloat + LoRA. Train 7B-13B on single 24GB GPU.

```python
# Full fine-tuning with Trainer
from transformers import AutoModelForSequenceClassification, TrainingArguments, Trainer

model = AutoModelForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=2)

training_args = TrainingArguments(
    output_dir="./results",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=64,
    num_train_epochs=3,
    weight_decay=0.01,
    warmup_ratio=0.1,
    logging_steps=100,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    fp16=True,
    gradient_accumulation_steps=2,
    metric_for_best_model="f1",
    load_best_model_at_end=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)
trainer.train()

# LoRA fine-tuning
from peft import LoraConfig, get_peft_model, TaskType

lora_config = LoraConfig(
    task_type=TaskType.SEQ_CLS,
    r=8,
    lora_alpha=32,
    lora_dropout=0.1,
    target_modules=["query", "value"],
)

model = AutoModelForSequenceClassification.from_pretrained("roberta-base", num_labels=2)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~0.5% of params

# QLoRA (4-bit)
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)
model = AutoModelForSequenceClassification.from_pretrained(
    "roberta-large", num_labels=2,
    quantization_config=bnb_config,
    device_map="auto",
)
model = get_peft_model(model, lora_config)
```

### Step 5: Inference Optimization
Quantization: FP16 (2x GPU), INT8 (4x CPU/GPU), INT4 (8x with GPTQ/AWQ). ONNX Runtime: 2-5x CPU speedup. vLLM: PagedAttention for efficient generation. KV caching for autoregressive models.

```python
from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

# ONNX export and runtime
model_id = "bert-base-uncased"
ort_model = ORTModelForSequenceClassification.from_pretrained(model_id, export=True)
tokenizer = AutoTokenizer.from_pretrained(model_id)

import torch
with torch.no_grad():
    inputs = tokenizer("example text", return_tensors="pt")
    outputs = ort_model(**inputs)
    predictions = outputs.logits.argmax(-1)
```

### Step 6: Evaluation
Classification: F1 (macro/weighted), ROC AUC. NER: exact match F1, span F1. Summarization: ROUGE-1/2/L, BERTScore. Translation: BLEU, chrF, COMET. Generation: perplexity. QA: exact match, F1.

```python
from datasets import load_metric

def compute_metrics(eval_pred, task="classification"):
    predictions, labels = eval_pred
    if task == "classification":
        predictions = predictions.argmax(-1)
        return {
            "accuracy": (predictions == labels).mean(),
            "f1": f1_score(labels, predictions, average="weighted"),
        }
    elif task == "summarization":
        rouge = load_metric("rouge")
        return rouge.compute(predictions=predictions, references=labels)
```

## Anti-Patterns

- **Wrong tokenizer for model**: Always use tokenizer matching pretrained model.
- **max_length too short**: 128 for classification, 512 for NER/QA, 1024+ for summarization.
- **No padding/truncation**: Causes shape mismatches in batches.
- **LR too high for fine-tuning**: 2e-5 to 5e-5 for full FT, 1e-4 to 1e-3 for LoRA.
- **No gradient clipping**: Gradients explode, especially in generation.
- **BLEU alone for summarization**: BLEU poorly correlated with human judgment for summaries.
- **Training too many epochs**: Fine-tuning typically needs 2-5 epochs.
- **Overtraining small datasets**: Use early stopping, evaluation every epoch.

## Production Considerations

### Monitoring
- Inference latency (p50/p95/p99) per model endpoint.
- Prediction confidence distribution drift.
- Vocabulary coverage — increasing OOV rate signals distribution shift.
- Per-class F1 over time for classification.
- Input text hash + prediction + confidence + latency logging.

### Deployment
- Export to ONNX for CPU-optimized inference.
- Containerize model with tokenizer and preprocessing.
- Set max sequence length to bound latency.
- Implement request-level caching for frequent queries.
- A/B testing for staged rollout.
- Pin model and tokenizer versions.

## Rules
- Prefer pretrained over training from scratch.
- Set max length by task.
- Always use gradient clipping (max_norm=1.0).
- LR: 2e-5 to 5e-5 (AdamW), 1e-4 to 1e-3 (LoRA).
- Use cosine schedule with linear warmup (10%).
- Never use test data for validation decisions.
- Mixed precision (fp16/bf16) for 2x speedup.
- Evaluate on multiple seeds (3-5) for small datasets.
- Save best checkpoint by validation metric.

## References
  - references/huggingface-transformers.md — HuggingFace Transformers
  - references/nlp-advanced.md — NLP Advanced Topics
  - references/nlp-fundamentals.md — NLP Fundamentals
  - references/nlp-model-training.md — NLP Model Training
  - references/nlp-pipeline.md — NLP Pipeline
  - references/nlp-production.md — NLP Production Deployment
  - references/prompt-engineering.md — Prompt Engineering for NLP
  - references/text-processing.md — NLP Text Processing
## Handoff
Hand off to ml-experiment-tracking for training runs. For LLM-specific optimization (prompting, RAG), hand off to ai-prompt-engineering.
