# Hugging Face Transformers: Practical API Reference

Current-practice usage of the `transformers` library: pipelines, Auto classes, tokenizers, chat templates, generation, device/dtype handling, and fine-tuning with `Trainer`. Parameter names follow recent releases (`dtype` instead of `torch_dtype`, `eval_strategy` instead of `evaluation_strategy`); check your installed version.

## Install

```bash
uv add transformers accelerate datasets evaluate
uv add torch            # choose the build matching your CUDA/ROCm/CPU platform
```

## Pipelines

```python
from transformers import pipeline

clf = pipeline("text-classification", model="distilbert/distilbert-base-uncased-finetuned-sst-2-english")
clf(["I love this product!", "Terrible support."])
# [{'label': 'POSITIVE', 'score': ...}, {'label': 'NEGATIVE', 'score': ...}]

ner = pipeline("token-classification", model="dslim/bert-base-NER", aggregation_strategy="simple")
qa = pipeline("question-answering", model="distilbert/distilbert-base-cased-distilled-squad")
zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
zs("The invoice is overdue", candidate_labels=["billing", "shipping", "technical"])
summ = pipeline("summarization", model="facebook/bart-large-cnn")
```

| Task string | Typical models | Output |
|-------------|----------------|--------|
| `text-classification` | BERT, RoBERTa, DeBERTa fine-tunes | label + score |
| `token-classification` | BERT-NER | entities with spans |
| `question-answering` | SQuAD fine-tunes | answer span |
| `zero-shot-classification` | NLI models (BART-MNLI, DeBERTa-NLI) | label scores |
| `summarization` / `translation` | BART, T5, Marian, NLLB | text |
| `text-generation` | Decoder LLMs | generated text |
| `fill-mask` | BERT, RoBERTa | token predictions |
| `feature-extraction` | Encoders | hidden states |

Pipelines accept `device` (`"cuda"`, `"mps"`, `0`) or `device_map="auto"`, and batch with `batch_size=`.

## Auto Classes

```python
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_id = "microsoft/deberta-v3-base"
tok = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(model_id, num_labels=3)

device = (
    torch.device("cuda") if torch.cuda.is_available()
    else torch.device("mps") if torch.backends.mps.is_available()
    else torch.device("cpu")
)
model.to(device).eval()

batch = tok(["first text", "second, longer text"], padding=True, truncation=True, max_length=256, return_tensors="pt").to(device)
with torch.inference_mode():
    probs = model(**batch).logits.softmax(dim=-1)
```

Head classes: `AutoModelForSequenceClassification`, `...ForTokenClassification`, `...ForQuestionAnswering`, `...ForCausalLM`, `...ForSeq2SeqLM`, `...ForMaskedLM`, `AutoModel` (no head).

## Tokenizers

```python
enc = tok("Hello, world!", return_offsets_mapping=True)
enc.input_ids, enc.attention_mask, enc["offset_mapping"]
tok.convert_ids_to_tokens(enc.input_ids)
tok.decode(enc.input_ids, skip_special_tokens=True)
```

- Use "fast" (Rust) tokenizers, the default when available; they provide offsets for span tasks.
- Always use the tokenizer that matches the model checkpoint.
- Decoder-only batch generation: set `tok.padding_side = "left"` and ensure `pad_token` is defined (often `tok.pad_token = tok.eos_token`).

## Loading LLMs: dtype and Memory

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

model_id = "Qwen/Qwen2.5-7B-Instruct"
tok = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype=torch.bfloat16,       # never default fp32 for large models
    device_map="auto",          # requires accelerate
)

# 4-bit if VRAM is insufficient
q = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)
model_4bit = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=q, device_map="auto")
```

Weights memory is roughly params x bytes per param (7B in bf16 is about 14 GB) plus KV cache. Some models require `trust_remote_code=True`; only enable it for repositories you have reviewed.

## Chat Templates and Generation

```python
messages = [
    {"role": "system", "content": "You are a concise assistant."},
    {"role": "user", "content": "Summarize: transformers use self-attention."},
]
inputs = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt", return_dict=True).to(model.device)
with torch.inference_mode():
    out = model.generate(**inputs, max_new_tokens=128, do_sample=True, temperature=0.7, top_p=0.9)
print(tok.decode(out[0, inputs["input_ids"].shape[-1]:], skip_special_tokens=True))
```

| Parameter | Effect |
|-----------|--------|
| `max_new_tokens` | Cap on generated tokens (prefer over `max_length`) |
| `do_sample=False` | Greedy decoding (deterministic) |
| `temperature`, `top_p`, `top_k` | Sampling controls |
| `num_beams` | Beam search for seq2seq tasks |
| `repetition_penalty` | Discourage loops |
| `stop_strings` (with `tokenizer=`) | Stop on strings |

For production serving use vLLM, SGLang, TGI or TensorRT-LLM instead of `generate()` in a web handler.

## Fine-Tuning with Trainer

```python
from datasets import load_dataset
from transformers import TrainingArguments, Trainer, DataCollatorWithPadding
import evaluate, numpy as np

ds = load_dataset("imdb")
def tokenize(b): return tok(b["text"], truncation=True, max_length=512)
ds = ds.map(tokenize, batched=True)

acc = evaluate.load("accuracy")
def compute_metrics(p):
    preds = np.argmax(p.predictions, axis=-1)
    return acc.compute(predictions=preds, references=p.label_ids)

args = TrainingArguments(
    output_dir="out/imdb-deberta",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    num_train_epochs=3,
    weight_decay=0.01,
    warmup_ratio=0.06,
    bf16=True,
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    report_to="none",
)
trainer = Trainer(
    model=model, args=args,
    train_dataset=ds["train"], eval_dataset=ds["test"],
    processing_class=tok,                      # replaces deprecated tokenizer= argument
    data_collator=DataCollatorWithPadding(tok),
    compute_metrics=compute_metrics,
)
trainer.train()
```

For LLM supervised fine-tuning and preference tuning, use TRL (`SFTTrainer`, `DPOTrainer`) with PEFT LoRA adapters.

## Saving and Sharing

```python
model.save_pretrained("artifacts/model", safe_serialization=True)  # safetensors
tok.save_pretrained("artifacts/model")
# model.push_to_hub("org/model-name", private=True)
```

Prefer safetensors over pickle-based `.bin` files; loading untrusted pickles can execute code.

## Pitfalls

- Loading LLMs in fp32 by default and running out of memory.
- Forgetting `model.eval()` and `torch.inference_mode()` at inference.
- Right-padding decoder-only models for batched generation.
- Mismatched tokenizer and model checkpoints.
- Truncating silently: long documents need chunking or long-context models.
- Hard-coding `cuda:0`.

## Checklist

- [ ] Explicit `dtype` and `device_map` for large models
- [ ] Device selected dynamically
- [ ] Chat template used for instruct models
- [ ] Current argument names (`dtype`, `eval_strategy`, `processing_class`)
- [ ] Safetensors for saved weights; `trust_remote_code` only after review
- [ ] Serving via an inference engine, not raw `generate()` per request
