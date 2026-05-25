---
name: ai-embeddings
description: >
  Use this skill when working with text embeddings: sentence-transformers, OpenAI embeddings, Cohere embeddings, BGE, Instructor, embedding model selection, MTEB evaluation, embedding training, contrastive learning, Matryoshka embeddings, embedding quantization.
  This skill enforces: embedding model selection with MTEB score rationale, dimensionality decision, distance metric choice, quantization strategy for scale, caching and indexing approach.
  Do NOT use for: LLM fine-tuning (see ai-model-training), vector database operations, RAG pipeline configuration (see ai-rag-patterns).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, embeddings, semantic, phase-11]
---

# Embeddings Agent

## Purpose
Design embedding strategies with model selection, training configuration, quality evaluation, and production indexing for semantic search and retrieval.

## Agent Protocol

### Trigger
User request includes: embedding, sentence transformer, text embedding, OpenAI embedding, Cohere embedding, embedding model, all-MiniLM, BGE, instructor, embedding dimension, cosine similarity, semantic search, embedding training, MTEB.

### Protocol
1. Clarify use case: retrieval, classification, clustering, or semantic search.
2. Select embedding model based on quality/speed/size tradeoffs from MTEB.
3. Choose embedding dimension and consider Matryoshka dimensionality reduction.
4. Define distance metric and normalization strategy.
5. Configure indexing and caching for production throughput.
6. If training: design contrastive learning objective with positive/negative pairs.
7. Set up quality evaluation pipeline with MTEB or custom benchmarks.

## Output
Embedding strategy with model selection, training config, indexing approach, quality metrics.

### Response Format
```
## Embedding Configuration
### Model
Model: {name} | Dimensions: {N}
Distance: {cosine / euclidean / dot}
Normalize: {true/false}
Max Tokens: {N} | Pooling: {mean / cls}

### Quality (MTEB)
Classification: {score} | Clustering: {score}
Pair Classification: {score} | Reranking: {score}
Retrieval: {score} | STS: {score}
Avg MTEB: {score}

### Production
Batch Size: {N} | Throughput: {N} docs/s
Quantization: {int8 / binary / none}
Cache: {LRU with {N} capacity, {TTL}s TTL}
Index: {faiss / annoy / hnswlib}

### Training (if applicable)
Method: {contrastive / Matryoshka / distillation}
Loss: {MultipleNegativesRankingLoss / CosineSimilarityLoss}
Data: {N} pairs | Hard Negatives: {yes/no}
Epochs: {N} | Batch: {N} | LR: {lr}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Embedding model selected with MTEB scores and dimensionality justified.
- [ ] Distance metric and normalization specified.
- [ ] Production indexing and caching strategy defined.
- [ ] Training configuration documented if custom embeddings needed.
- [ ] Quality evaluation pipeline with benchmark metrics.
- [ ] Quantization strategy for scale (if needed).

## Workflow

### Step 1: Select Embedding Model
- **all-MiniLM-L6-v2** (384d): Fast, small, good for latency-sensitive apps. MTEB avg ~56.
- **BGE-large-en-v1.5** (1024d): Strong retrieval, good for RAG. MTEB avg ~63.
- **Instructor-XL** (768d): Instruction-aware, task-specific embeddings. MTEB avg ~62.
- **text-embedding-3-large** (3072d): OpenAI, highest quality, pay-per-token. MTEB avg ~64.
- **Cohere embed-english-v3** (1024d): Good quality, 512d truncatable. MTEB avg ~62.

### Step 2: Generate Embeddings
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('BAAI/bge-large-en-v1.5')
embeddings = model.encode(
    ['text1', 'text2', 'text3'],
    normalize_embeddings=True,
    show_progress_bar=True,
)
```

### Step 3: Matryoshka Embeddings
```python
# Adaptive dimensionality
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('nomic-ai/nomic-embed-text-v1')

# Full 768d
embeddings_full = model.encode(texts)

# Truncated to 256d for efficiency
embeddings_256 = model.encode(texts, truncate_dim=256)

# Use smaller dim for retrieval, larger for reranking
```

### Step 4: Train Custom Embeddings
```python
from sentence_transformers import SentenceTransformer, losses, InputExample
from torch.utils.data import DataLoader

model = SentenceTransformer('BAAI/bge-base-en-v1.5')

# Contrastive learning with hard negatives
train_examples = [
    InputExample(texts=['query', 'positive_doc', 'hard_negative_doc']),
    InputExample(texts=['query2', 'positive_doc2', 'hard_negative_doc2']),
]

train_dataloader = DataLoader(train_examples, batch_size=32, shuffle=True)
train_loss = losses.MultipleNegativesRankingLoss(model)

model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=100,
    show_progress_bar=True,
)
```

### Step 5: Quantize and Index
```python
import numpy as np
import faiss

# Quantize to int8
embeddings_f32 = np.array(embeddings).astype(np.float32)
embeddings_quant = (embeddings_f32 * 127).astype(np.int8)

# Build FAISS index
dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # inner product = cosine if normalized
index.add(embeddings)

# Search
D, I = index.search(query_embedding, k=10)
```

## Rules
- Normalize embeddings to unit length for cosine similarity via dot product.
- Matryoshka models preferred when serving multiple latency tiers.
- MTEB leaderboard is ground truth for model selection — not blog posts.
- Hard negatives significantly improve embedding quality in contrastive training.
- Batch embeddings during indexing, never one-by-one.
- Quantization from FP32 to int8 drops <2% accuracy but 4x memory reduction.
- Cache frequent queries — embedding generation is expensive.
- Distance metric must match training: cosine for most sentence transformers.
- Embedding dimension affects downstream storage and search speed — 384d vs 1024d is 2.7x.
- Monitor embedding drift over time — data distribution changes degrade quality.

## References
- `references/embedding-models.md` — Embedding Models
- `references/embedding-training.md` — Embedding Training
- `references/vector-indexing.md` — Vector Indexing
- `references/embedding-optimization.md` — Compression, quantization, caching, batch processing

## Handoff
For RAG pipeline with these embeddings, hand off to `ai-rag-patterns`. For vector database operations, hand off to `ai-vector-databases`. For multimodal embeddings, hand off to `ai-multimodal`.
