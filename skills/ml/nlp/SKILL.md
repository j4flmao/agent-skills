---
name: ml-nlp
description: >
  Use this skill when building NLP pipelines, applying spaCy for tokenization/NER/POS, using HuggingFace Transformers for text classification/sentiment/summarization/QA, or fine-tuning transformer models.
  This skill enforces: NLP pipeline design (tokenization, normalization, POS, NER, parsing), framework selection (spaCy vs HuggingFace vs NLTK), model selection by task, fine-tuning strategy (full vs PEFT/LoRA), inference optimization.
  Do NOT use for: audio/speech processing, computer vision with text (use ml-computer-vision), traditional ML on text features (use ml-classical-ml), or prompt engineering (use ai-prompt-engineering).
version: "1.0.0"
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

## Agent Protocol

### Trigger
User request includes: NLP, natural language processing, NLTK, spaCy, HuggingFace, BERT, text classification, NER, sentiment analysis, summarization, tokenization, embedding, transformer, fine-tuning, tokenizer, pretrained model, language model.

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
Language: {language_code}

### Framework
Primary: {spaCy / HuggingFace / NLTK / custom}
Model: {model_name} | Size: {base / large / xl}

### Preprocessing
Tokenization: {wordpiece / BPE / sentencepiece}
Normalization: {lowercase / stem / lemma / none}
Max Length: {N} | Truncation: {left / right}

### Training
Strategy: {full / LoRA / prefix tuning / adapter}
Learning Rate: {value} | Schedule: {linear / cosine}
Batch Size: {N} | Epochs: {N}
Precision: {fp32 / fp16 / bf16}

### Inference
Optimization: {none / quantization / ONNX / distillation}
Batch Size: {N} | Device: {cpu / cuda / tpu}
Caching: {true/false}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Task and language identified with appropriate framework.
- [ ] Preprocessing pipeline defined (tokenization, normalization, max length).
- [ ] Model architecture selected by task requirements and compute budget.
- [ ] Fine-tuning strategy matched to compute budget (full vs LoRA vs adapters).
- [ ] Evaluation metrics selected for the task (F1, BLEU, ROUGE, perplexity).
- [ ] Inference optimization configured for deployment (quantization, ONNX, batching).
- [ ] Tokenizer vocabulary size and truncation strategy documented.

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Task & Framework Selection
Text classification and sentiment analysis: HuggingFace Transformers (BERT, RoBERTa, DistilBERT). For production performance: spaCy with transformer wrapper (spacy-transformers) or distilled models. NER: spaCy has the best production pipeline with built-in entity merging, confidence calibration. HuggingFace for custom entity types with small training data. Summarization: BART (best quality-size tradeoff), T5 (flexible, can multitask), Pegasus (SOTA, larger). Question answering: BERT/RoBERTa for extractive (answer is text span), T5/BART for generative (answer is generated text). Translation: MarianMT (per-language-pair models, fast), NLLB-200 (many languages, larger), mT5 (multilingual T5). Lightweight models for resource-constrained deployment: DistilBERT (97% of BERT, 40% size), TinyBERT, ALBERT, MobileBERT. For GPU-constrained scenarios: DeBERTaV3 (state of the art at base/large sizes).

### Step 2: Preprocessing
Tokenization: WordPiece (BERT, 30k tokens), BPE (GPT, RoBERTa, 50k tokens), SentencePiece (T5, ALBERT, XLNet, unigram language model). Choose tokenizer matching pretrained model — never mix. Normalization: lowercase for sentiment/classification (reduces vocabulary), preserve case for NER (casing signals proper nouns and organization names). Stop word removal: useful for bag-of-words and TF-IDF models, harmful for transformers (attention handles stop words). Lemmatization reduces vocabulary size and standardizes word forms — beneficial for small datasets. Stemming faster but less accurate — use for search indexing, not for transformers. Max sequence length: shorter = faster, longer = more context. Balance: 128 for binary classification, 256 for topic classification, 384 for NER, 512 for extractive QA, 1024+ for summarization. Truncation: right truncation (default for most BERT-style models), left truncation (for text generation where prompt prefix must be preserved). Padding: pad to max length in batch (dynamic padding via DataCollatorWithPadding) is more efficient than padding to global max.

### Step 3: Model Selection
Encoder-only (BERT, RoBERTa, DeBERTa): bidirectional attention, best for understanding tasks — classification, NER, extractive QA, sentence similarity. Base size (110M-125M) works for most tasks; large (340M-435M) for higher accuracy. Decoder-only (GPT-2, Llama, Mistral): causal attention, best for generation — text generation, chat, code generation. Small (125M-350M) for speed, large (7B+) for quality. Encoder-decoder (T5, BART, MarianMT): full architecture, best for sequence-to-sequence — summarization, translation, generative QA, table-to-text. Multilingual: mBERT (104 languages), XLM-R (100 languages, better than mBERT on most tasks), NLLB (200 languages). Choose multilingual when target language has <1M words of training data. Parameter count guideline: base (110M-250M) for up to 100K training examples, large (350M-770M) for 100K-1M, XL (1.5B-7B) for >1M examples or highest accuracy.

### Step 4: Fine-Tuning
Full fine-tuning: update all parameters. Best performance (updates all representations for task), highest compute cost (stores gradients for all parameters). Requires GPU memory ~4x model size. LoRA (Low-Rank Adaptation): train low-rank matrices (rank 8-64) injected into attention layers. ~0.1-1% of parameters trainable. Near full fine-tuning quality at fraction of memory. r=8 for most tasks, r=64 for more capacity. target_modules: q_proj and v_proj for most models, or query and value for T5. Adapters: small bottleneck layers inserted between transformer layers. More parameter efficient than full fine-tuning, slightly lower quality than LoRA. Prefix tuning: learn continuous prefix vectors prepended to input. Fastest to train, lowest quality. QLoRA: 4-bit NormalFloat quantization + LoRA. Train 7B-13B models on single 24-48GB GPU. ~2-bit effective parameter precision from double quantization. Use gradient checkpointing for models >1B parameters. Use DeepSpeed ZeRO-2 or ZeRO-3 for multi-GPU training.

### Step 5: Inference Optimization
Quantization: FP16 (2x speedup on GPU, minimal quality loss), INT8 (4x speedup on GPU/CPU, slight quality loss), INT4 (8x with GPTQ/AWQ for generation, more quality loss). ONNX Runtime: cross-platform optimized inference, graph optimization, operator fusion. ~2-5x speedup on CPU. TorchScript / torch.compile: PyTorch-native optimization. Model distillation: train small student model (e.g., DistilBERT from BERT). 60% speed, 95%+ quality retention. KV caching: crucial for autoregressive generation. Cache key-value pairs from previous tokens. vLLM: PagedAttention for efficient GPU memory in generation. TGI (Text Generation Inference): HuggingFace optimized serving with continuous batching.

### Integration with MLOps Pipeline
Register trained models in model registry with performance metrics and training data hash.
Containerize inference with ONNX runtime for CPU-optimized deployment.
Set up A/B testing framework for comparing model versions in production.
Monitor for data drift using embedding distribution comparison (MMD, cosine distance).
Automate retraining pipeline triggered by drift detection or scheduled cadence.
Export tokenizer along with model for consistent preprocessing in production.
Implement caching for frequent inference requests to reduce latency and cost.

### Step 6: Evaluation
Classification: accuracy (if balanced), macro/weighted F1 (if imbalanced), ROC AUC (if binary with probability output). NER: exact match F1 (strict: boundary + type match), span F1 (relaxed: partial overlap). Summarization: ROUGE-1/2/L (n-gram overlap), BERTScore (embedding-based semantic similarity), METEOR (better correlation with human judgment). Translation: BLEU (n-gram precision with brevity penalty), chrF (character n-gram), COMET (neural, best correlation with human). Generation: perplexity (intrinsic, lower is better), human evaluation (best but expensive). QA: exact match (answer exactly matches reference), F1 (token overlap), SQuAD-style evaluation.

### Common Pitfalls
Using wrong tokenizer for the model — always use the tokenizer that matches the pretrained model.
Setting max_length too short for the task — 128 for classification, 512 for NER/QA, 1024+ for summarization.
Forgetting to set padding and truncation — causes shape mismatches in batches.
Training with too high learning rate for fine-tuning — 2e-5 to 5e-5 for full fine-tuning, 1e-4 to 1e-3 for LoRA.
Not using gradient clipping — gradients can explode, especially in generation tasks.
Evaluating on BLEU alone for summarization — BLEU correlates poorly with human judgment for summarization.
Overlooking mixed precision training — fp16/bf16 gives 2x speedup with negligible quality loss.
Training for too many epochs with small datasets — fine-tuning typically needs only 2-5 epochs.

## Rules
- Prefer pretrained models over training from scratch — always start from a checkpoint.
- Set max sequence length based on task: 128 for classification, 512 for NER/QA, 1024+ for summarization.
- Always use gradient clipping (max_norm=1.0) during fine-tuning.
- Learning rate for fine-tuning: 2e-5 to 5e-5 (AdamW), 1e-4 to 1e-3 for LoRA.
- Use cosine schedule with linear warmup (10% of training steps).
- Never use test data for validation decisions during development.
- Monitor perplexity on held-out validation data for generation tasks.
- For low-resource languages, start with multilingual checkpoint, then continue pretraining on domain data.
- Separate preprocessing from modeling: batch tokenization with dynamic padding, not per-sample.
- Document tokenizer vocabulary size and out-of-vocabulary handling strategy.
- Use mixed precision (fp16/bf16) for 2x training speedup with negligible quality loss.
- Evaluate on multiple seeds (3-5) when fine-tuning small datasets to account for variance.
- Save best checkpoint based on validation metric, not last epoch.

### Production Monitoring
Monitor inference latency (p50/p95/p99) for each model endpoint to detect performance regression.
Track prediction confidence distribution — drift toward lower confidence may indicate data shift.
Monitor vocabulary coverage — increasing OOV token rate signals distribution shift in text data.
Track per-class F1 over time for classification tasks — degradation may be class-specific.
Log input text hash, prediction, confidence, and latency for every production inference.
Set up data drift detection using embedding similarity or feature distribution comparison.
Monitor model retraining frequency and performance improvement per retraining cycle.

### Troubleshooting Guide
Model performing poorly on new data → distribution shift, collect new labeled data, retrain or fine-tune.
Inference too slow → quantize to INT8, use ONNX Runtime, distill to smaller model, reduce max sequence length.
Out of memory during training → reduce batch size, use gradient accumulation, enable gradient checkpointing.
Loss not converging → reduce learning rate, check data quality, increase warmup steps, verify labels.
Overfitting on small dataset → increase regularization, use dropout, early stopping, reduce model size.
Tokenizer producing too many OOV tokens → check preprocessing, consider using different tokenizer, add special tokens.
GPU utilization low → increase batch size, use data loading with multiple workers, enable mixed precision.
Model generating repetitive text → adjust repetition penalty, top-k/top-p sampling parameters for generation tasks.

### Deployment Checklist
Export model to ONNX format for optimized CPU inference in production.
Containerize the model with tokenizer, preprocessing, and post-processing as a single service.
Set max sequence length matching production distribution to bound latency and memory.
Implement request-level caching for identical or near-identical queries.
Set up A/B testing framework for staged rollout of new model versions.
Monitor for adversarial inputs with input length, perplexity, and toxicity checks.
Log model version, inference time, and input metadata for every prediction.
Pin model and tokenizer versions in deployment configuration for reproducibility.

## References
  - references/huggingface-transformers.md — HuggingFace Transformers
  - references/nlp-advanced.md — Nlp Advanced Topics
  - references/nlp-fundamentals.md — Nlp Fundamentals
  - references/nlp-model-training.md — NLP Model Training
  - references/nlp-pipeline.md — NLP Pipeline
  - references/nlp-production.md — NLP Production Deployment
  - references/prompt-engineering.md — Prompt Engineering for NLP
  - references/text-processing.md — NLP Text Processing
## Handoff
Hand off to ml-experiment-tracking for training runs. For LLM-specific optimization (prompting, RAG), hand off to ai-prompt-engineering or ai-rag-patterns.
