# Advanced NLP: Efficient Adaptation, Long Context, Retrieval, Distillation, Evaluation

Techniques beyond basic fine-tuning: parameter-efficient adaptation, long documents, retrieval and reranking, constrained/structured generation, distillation into small models, multilingual systems, and rigorous evaluation of generative systems.

## Parameter-Efficient Fine-Tuning (PEFT)

| Method | What trains | Notes |
|--------|-------------|-------|
| LoRA | Low-rank matrices added to attention/MLP weights | Small adapters (MBs), mergeable into base weights |
| QLoRA | LoRA on a 4-bit quantized frozen base | Fits larger models on a single GPU |
| DoRA | Weight-decomposed LoRA variant | Sometimes better quality at same rank |
| Prefix/prompt tuning | Virtual tokens | Fewer params; usually weaker than LoRA for large shifts |
| Full fine-tuning | All weights | Highest capacity, highest cost, risk of forgetting |

```python
from peft import LoraConfig, get_peft_model

lora = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora)
model.print_trainable_parameters()
```

Target module names depend on the architecture; inspect `model.named_modules()`. Use TRL `SFTTrainer` for instruction data and `DPOTrainer` (or similar preference methods) for preference alignment.

## Long Documents

| Strategy | When |
|----------|------|
| Chunk + aggregate (classification: max/mean of chunk scores) | Classification of long texts |
| Map-reduce summarization | Very long inputs beyond context |
| Long-context models | Need cross-document reasoning; verify quality at long lengths ("lost in the middle" effects) |
| Retrieval over chunks | QA over large corpora |
| Hierarchical models | Encoders over sections, then over section embeddings |

Chunk on structure (headings, paragraphs) with overlap rather than fixed character counts.

## Retrieval and Reranking

Two-stage retrieval is standard:

1. Candidate generation: hybrid search (BM25 + dense embeddings) fused with Reciprocal Rank Fusion; apply metadata filters in the query.
2. Reranking: cross-encoder scores (query, passage) pairs; keep top few for the generator.

```python
from sentence_transformers import SentenceTransformer, CrossEncoder

bi = SentenceTransformer("BAAI/bge-small-en-v1.5")
ce = CrossEncoder("BAAI/bge-reranker-base")

doc_emb = bi.encode(docs, normalize_embeddings=True)
q_emb = bi.encode([query], normalize_embeddings=True)
cand = (doc_emb @ q_emb.T).ravel().argsort()[::-1][:50]
scores = ce.predict([(query, docs[i]) for i in cand])
top = [docs[cand[i]] for i in scores.argsort()[::-1][:5]]
```

Fine-tune embeddings on in-domain pairs (with hard negatives) when off-the-shelf recall is insufficient. Re-embed the full corpus whenever the embedding model changes.

## Structured and Constrained Generation

- JSON schema/grammar-constrained decoding guarantees parseable output: provider structured-output modes, or open-source tools such as Outlines, XGrammar, or vLLM guided decoding.
- Validate outputs with Pydantic even when constrained; schemas constrain shape, not truth.
- For extraction, include evidence spans in the schema so outputs can be verified against the source.

## Distillation and Small Models

Use a large model to label data, then train a small model for production:

1. Prompt a strong LLM to label a sample of unlabeled production data.
2. Human-review a subset to estimate label quality.
3. Fine-tune a compact encoder (e.g. DeBERTa-v3-small, ModernBERT) or small LLM on the labels.
4. Compare against the teacher on a human-labeled test set; route low-confidence cases to the teacher or humans.

Benefits: lower latency and cost, deterministic behavior, on-prem deployment. SetFit (contrastive fine-tuning of sentence transformers) works well with few labels.

## Multilingual NLP

- Multilingual encoders (XLM-RoBERTa, mDeBERTa) and multilingual embedding models enable cross-lingual transfer: train on one language, apply to others, with some quality loss.
- Evaluate per language; tokenization efficiency and quality vary by script.
- Language identification (fastText `lid.176`, CLD3) before routing.
- Machine translation pipelines (NLLB, MarianMT, LLMs) as an alternative to native multilingual models.

## Inference Optimization

| Technique | Effect |
|-----------|--------|
| Dynamic batching / continuous batching | Throughput (vLLM, TGI, Triton) |
| Quantization (INT8, 4-bit AWQ/GPTQ, FP8 on supported GPUs) | Memory and speed; validate accuracy |
| ONNX Runtime / TensorRT export for encoders | Lower latency for classification/embedding |
| KV cache reuse / prefix caching | Faster repeated prompts |
| Speculative decoding | Faster generation with a draft model |

## Evaluating Generative Systems

- Build a versioned evaluation set of real queries with references or rubrics.
- Separate metrics: retrieval quality (recall@k), faithfulness to sources, answer relevance, format validity, refusal correctness, latency, cost.
- LLM-as-judge: use pairwise or rubric scoring, randomize answer order, calibrate against human labels, and avoid judging with the same model family when possible.
- Track regressions on every prompt, model or retrieval change in CI.
- Slice by user segment, language and query type.

## Safety and Robustness

- Prompt injection via retrieved content: treat documents as data; never let retrieved text trigger tool actions without checks.
- PII detection and redaction (token classification models or Microsoft Presidio) on inputs and logs.
- Toxicity and policy classifiers on outputs where needed.
- Adversarial and perturbation tests (typos, paraphrases, negation).

## Checklist

- [ ] PEFT considered before full fine-tuning
- [ ] Long inputs handled by structured chunking or validated long-context models
- [ ] Hybrid retrieval + cross-encoder reranking with measured recall
- [ ] Structured output constrained and validated
- [ ] Distillation path to small models for high-volume tasks
- [ ] Per-language evaluation for multilingual use
- [ ] Generative eval set with faithfulness and judge calibration
