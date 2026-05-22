# HuggingFace Transformers

## Pipeline API
```
from transformers import pipeline

# Sentiment
classifier = pipeline("sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english")
classifier("I love this product!")  # [{"label": "POSITIVE", "score": 0.999}]

# NER
ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
ner("Apple is looking at buying U.K. startup for $1 billion")

# QA
qa = pipeline("question-answering",
    model="distilbert-base-cased-distilled-squad")
qa(question="What is the capital of France?",
   context="Paris is the capital of France.")

# Summarization
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
summarizer(long_text, max_length=130, min_length=30)

# Translation
translator = pipeline("translation", model="Helsinki-NLP/opus-mt-en-es")
translator("Hello, how are you?")
```

| Pipeline | Typical Model | Output |
|----------|--------------|--------|
| sentiment-analysis | DistilBERT, RoBERTa | Label + score |
| text-classification | BERT, DeBERTa | Label + score |
| token-classification (NER) | BERT, RoBERTa | Entities with positions |
| question-answering | BERT, RoBERTa | Answer span |
| summarization | BART, T5, Pegasus | Generated summary |
| translation | MarianMT, NLLB, mT5 | Translated text |
| text-generation | GPT-2, Llama, Mistral | Generated tokens |
| fill-mask | BERT, RoBERTa | Masked predictions |
| zero-shot-classification | BART, DeBERTa | Label scores |

## Tokenizers
```
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
tokens = tokenizer("Hello, world!", padding=True, truncation=True,
                   max_length=128, return_tensors="pt")

# Batch
batch = tokenizer(["First.", "Second longer."], padding=True,
                   truncation=True, max_length=128, return_tensors="pt")

# Special tokens
print(tokenizer.cls_token_id, tokenizer.sep_token_id, tokenizer.pad_token_id)
decoded = tokenizer.decode(tokens.input_ids[0], skip_special_tokens=True)
```

WordPiece (BERT), BPE (GPT/RoBERTa), SentencePiece (T5/ALBERT). Always set max_length and truncation=True.

## Models
```
from transformers import AutoModelForSequenceClassification

model = AutoModelForSequenceClassification.from_pretrained(
    "bert-base-uncased", num_labels=2,
    id2label={0:"NEGATIVE",1:"POSITIVE"},
    label2id={"NEGATIVE":0, "POSITIVE":1})
```

BERT (encoder, 110M), RoBERTa (125M), DistilBERT (66M, 60% speed, 95% quality), DeBERTa (SOTA), GPT-2 (decoder, 124M-1.5B), T5 (encoder-decoder, 220M-11B), BART (encoder-decoder, 140M-400M).

## Trainer API
```
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, DataCollatorWithPadding)
from datasets import Dataset

train_ds = Dataset.from_dict({"text": texts, "label": labels})
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
train_ds = train_ds.map(lambda x: tokenizer(x["text"], padding=False,
    truncation=True, max_length=128), batched=True)

args = TrainingArguments(
    output_dir="./results", learning_rate=2e-5,
    per_device_train_batch_size=16, num_train_epochs=3,
    weight_decay=0.01, evaluation_strategy="epoch",
    save_strategy="epoch", fp16=True, warmup_ratio=0.1,
    lr_scheduler_type="cosine", load_best_model_at_end=True)

trainer = Trainer(model=model, args=args, train_dataset=train_ds,
    eval_dataset=eval_ds, tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer))
trainer.train()
```

## PEFT / LoRA
```
from peft import LoraConfig, get_peft_model, TaskType

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf", load_in_4bit=True)
lora_config = LoraConfig(task_type=TaskType.CAUSAL_LM, r=8,
    lora_alpha=32, lora_dropout=0.1, target_modules=["q_proj","v_proj"])
model = get_peft_model(model, lora_config)
trainer.train()
model = model.merge_and_unload()
```

LoRA rank r=8-16 (most tasks), r=64 (more capacity). QLoRA: 4-bit + LoRA, train 7B on single 24GB GPU. target_modules: q_proj+v_proj for GPT, query+value for T5.

## Inference Optimization
```
from transformers import pipeline
import torch

model = AutoModelForSequenceClassification.from_pretrained("model",
    torch_dtype=torch.float16).to("cuda")
classifier = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer, device=0)
results = classifier(batch_texts, batch_size=32)

# ONNX
from optimum.onnxruntime import ORTModelForSequenceClassification
ort_model = ORTModelForSequenceClassification.from_pretrained("model", export=True)
```

## Model Selection Guide
| Task | Budget | Model | Params |
|------|--------|-------|--------|
| Classification | Low | DistilBERT | 66M |
| Classification | High | DeBERTa-v3-large | 435M |
| NER | Any | BERT-base | 110M |
| Summarization | Medium | BART-large | 400M |
| Translation | Medium | MarianMT | 80-300M |
| QA | Medium | RoBERTa-base | 125M |
| Generation | Low | GPT-2 medium | 355M |

## Best Practices
- Always set max_length and truncation=True.
- Use DataCollatorWithPadding for dynamic batching.
- fp16/bf16 gives ~2x speedup with minimal quality loss.
- Warmup ratio 10% prevents early instability.
- Use gradient checkpointing for models >1B parameters.
- DeepSpeed ZeRO-2 or 3 for multi-GPU training.
