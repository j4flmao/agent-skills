# NLP Fundamentals: Representations, Tasks, Models and Metrics

Foundational concepts for natural language processing work: how text becomes numbers, the main task families, model architecture families, how to pick an approach, and how to evaluate it. Library usage is in `huggingface-transformers.md`; preprocessing details in `text-processing.md`.

## From Text to Numbers

| Representation | Idea | Strengths | Weaknesses |
|----------------|------|-----------|------------|
| Bag of words / TF-IDF | Sparse counts weighted by rarity | Fast, interpretable, strong baseline for classification and keyword search | No word order or semantics |
| Static word embeddings (word2vec, GloVe, fastText) | One dense vector per word | Captures similarity; fastText handles subwords | Same vector regardless of context |
| Contextual embeddings (BERT-family encoders) | Vector per token depends on sentence | Strong for classification, NER, retrieval | Heavier compute |
| Sentence embeddings (Sentence-Transformers, embedding APIs) | One vector per text | Semantic search, clustering, dedup | Domain shift without fine-tuning |
| LLM prompting | Generative model conditioned on instructions | Few labels needed, flexible | Cost, latency, output variability |

## Tokenization

| Scheme | Used by | Notes |
|--------|---------|-------|
| WordPiece | BERT | Subwords marked with `##` |
| BPE (byte-level) | GPT-family, RoBERTa, Llama 3 | No unknown tokens; bytes as fallback |
| Unigram (SentencePiece) | T5, XLM-R, many multilingual models | Language-agnostic, works without pre-splitting |

Consequences: token counts drive cost and context limits; non-English text and code often take more tokens per word; numbers may be split oddly, which affects arithmetic.

## Task Families

| Family | Examples | Typical approach |
|--------|----------|------------------|
| Text classification | Sentiment, intent, topic, toxicity | Fine-tuned encoder; TF-IDF + linear baseline; zero/few-shot LLM |
| Token classification | NER, PII detection, POS tagging | Encoder + token head (BIO tagging) |
| Span extraction | Extractive QA | Encoder with start/end heads |
| Sequence-to-sequence | Translation, summarization | Encoder-decoder (T5, BART, NLLB) or LLM |
| Generation | Drafting, chat, code | Decoder-only LLM |
| Retrieval / similarity | Semantic search, dedup, RAG | Bi-encoder embeddings + cross-encoder reranker |
| Structured extraction | Fields from documents | LLM with schema-constrained output, or token classification |

## Architecture Families

| Family | Attention | Pretraining objective | Best at |
|--------|-----------|----------------------|---------|
| Encoder-only (BERT, RoBERTa, DeBERTa, ModernBERT) | Bidirectional | Masked language modeling | Understanding: classification, NER, embeddings |
| Decoder-only (GPT, Llama, Qwen, Mistral) | Causal | Next-token prediction | Generation, instruction following |
| Encoder-decoder (T5, BART) | Bidirectional encoder + causal decoder | Denoising / span corruption | Translation, summarization |

Self-attention cost grows quadratically with sequence length in vanilla attention; optimized kernels (FlashAttention) reduce memory but long inputs remain expensive.

## Choosing an Approach

```
Labeled data available (thousands+)? ── yes ──► fine-tune an encoder (cheap, fast inference)
        │ no
        ▼
Can label a few hundred? ── yes ──► SetFit / small fine-tune, or LLM few-shot then distill
        │ no
        ▼
Zero-shot LLM prompting with careful evaluation; collect labels from production for later fine-tuning
```

Always build a simple baseline first (TF-IDF + logistic regression, or keyword rules). If a complex model does not clearly beat it on held-out data, ship the baseline.

## Evaluation Metrics

| Task | Metrics | Notes |
|------|---------|-------|
| Classification | Accuracy, precision, recall, F1 (macro/micro), ROC-AUC | Macro-F1 for imbalanced classes; report per-class metrics |
| NER | Entity-level precision/recall/F1 (`seqeval`) | Exact span match; token-level metrics overstate quality |
| Extractive QA | Exact match, token F1 | |
| Translation | BLEU, chrF, COMET | Learned metrics (COMET) correlate better with humans |
| Summarization | ROUGE, BERTScore, human or LLM-judge rubric | ROUGE rewards overlap, not faithfulness |
| Retrieval | Recall@k, MRR, nDCG | Evaluate before generation in RAG |
| Generation (open-ended) | Rubric-based human or LLM-as-judge, task success | Calibrate judges against human labels |

Use a held-out test set that reflects production distribution; never tune on it. Report confidence intervals or multiple seeds for small test sets.

## Data Considerations

- Label quality: measure inter-annotator agreement (Cohen's kappa) and write annotation guidelines.
- Leakage: deduplicate near-identical texts across train/test splits.
- Class imbalance: stratified splits, class weights, threshold tuning.
- Domain shift: evaluate on recent data; monitor drift in production.
- Language coverage: test each language separately in multilingual systems.
- PII and licensing: check data rights; redact sensitive data before training.

## Common Failure Modes

| Failure | Example | Mitigation |
|---------|---------|------------|
| Spurious correlations | Classifier keys on a template phrase | Error analysis, counterfactual tests |
| Negation and sarcasm | "not bad" misread | Targeted test sets (checklists) |
| Truncation | Important content past token limit | Chunking, long-context models |
| Hallucination | LLM invents facts | Retrieval grounding, citations, faithfulness eval |
| Bias | Different performance across groups | Slice-based evaluation |

## Checklist

- [ ] Task framed in a standard family with a defined metric
- [ ] Simple baseline measured first
- [ ] Representation/model family chosen by data volume and latency needs
- [ ] Clean, deduplicated, representative splits
- [ ] Per-class and per-slice evaluation
- [ ] Error analysis on failures before scaling up
