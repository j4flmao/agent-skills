---
name: ai-embeddings
description: >
  Use this skill when working with text embeddings: sentence-transformers, OpenAI embeddings, Cohere embeddings, BGE, Instructor, embedding model selection, MTEB evaluation, embedding training, contrastive learning, Matryoshka embeddings, embedding quantization, chunking strategies, hybrid search, multi-modal embeddings, vector indexing (HNSW/IVF/PQ), embedding deployment, embedding evaluation.
  This skill enforces: embedding model selection with MTEB score rationale, dimensionality decision via Matryoshka, distance metric choice with normalization strategy, chunking strategy matched to retrieval granularity, vector index selection based on corpus size and recall requirements, quantization strategy for scale, caching and indexing approach, training config with hard negative mining.
  Do NOT use for: LLM fine-tuning (see ai-model-training), vector database operations (see ai-vector-databases), RAG pipeline configuration (see ai-rag-patterns), general ML pipeline (see ai-ml-pipeline).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, embeddings, semantic, phase-11]
---

# Embeddings Agent

## Purpose
Design embedding strategies with model selection, chunking design, training configuration, quality evaluation, vector indexing, and production deployment for semantic search, retrieval, classification, clustering, and recommendation.

## Agent Protocol

### Trigger
User request includes: embedding, sentence transformer, text embedding, OpenAI embedding, Cohere embedding, BGE, instructor, Nomic, Voyage, Jina, embedding dimension, cosine similarity, semantic search, embedding training, MTEB, chunking strategy, chunk overlap, semantic chunking, hybrid search, dense-sparse fusion, CLIP, multi-modal embedding, HNSW, IVF, PQ, vector index, DiskANN, embedding quantization, Matryoshka, hard negative mining, contrastive learning, embedding drift, re-indexing, embedding cache, cross-encoder, bi-encoder, knowledge distillation, embedding evaluation, retrieval benchmark, cross-lingual retrieval, multilingual embedding.

### Protocol
1. Clarify use case: retrieval, classification, clustering, semantic search, recommendation, deduplication, or anomaly detection.
2. Determine language requirements: monolingual (en/zh/ja/de/fr), multilingual (single model covers many languages), or cross-lingual (query in language A retrieves documents in language B).
3. Select embedding model via decision tree: quality vs speed vs size vs language coverage vs cost.
4. Choose embedding dimension: consider Matryoshka truncation, storage budget (RAM for index), search latency, and recall requirements.
5. Define distance metric and normalization strategy — must be consistent between training and inference.
6. Select chunking strategy based on document type (code, prose, tables), length distribution, and retrieval granularity (passage-level vs document-level).
7. Design the embedding pipeline: tokenization, preprocessing, batching, normalization, caching, quantization.
8. Choose vector index type: Flat for exact (<10K), HNSW for high-recall (<10M), IVF for large-scale (>1M), PQ for memory-constrained (>100M), DiskANN for billion-scale.
9. Configure production indexing: update frequency, incremental vs batch rebuild, tombstone handling for deletes.
10. If training: design contrastive learning objective with hard negative mining strategy (BM25, model-based, iterative).
11. Set up quality evaluation pipeline with MTEB or domain-specific benchmarks with statistical significance testing.

## Output
Embedding strategy with model selection, chunking config, training config, index type, quality metrics, and production deployment plan.

### Response Format
```
## Embedding Configuration
### Model
Model: {name} | Dimensions: {N} (Matryoshka: {min}-{max})
Distance: {cosine / euclidean / dot}
Normalize: {true/false}
Max Tokens: {N} | Pooling: {mean / cls / weighted}
Truncation: {left / right} | Language: {monolingual-en}

### Chunking
Strategy: {fixed / semantic / recursive / document-aware}
Chunk Size: {N} tokens | Overlap: {N} tokens ({%})
Max Chunks per Doc: {N} | Min Chunk Size: {N}

### Quality (MTEB)
Classification: {score} | Clustering: {score}
Pair Classification: {score} | Reranking: {score}
Retrieval: {score} | STS: {score}
Avg MTEB: {score}

### Index
Type: {HNSW / IVF / PQ / Flat / DiskANN}
Parameters: M={N} efSearch={N} / nlist={N} nprobe={N}
Memory: {N} GB for {N} vectors
Recall@10: {score} | Query Latency: {N}ms

### Production
Batch Size: {N} | Throughput: {N} docs/s
Quantization: {int8 / binary / fp16 / none}
Storage: {N} bytes/vector
Cache: {LRU with {N} capacity, {TTL}s TTL}
Re-index Cadence: {daily / weekly / on data change}

### Training (if applicable)
Method: {contrastive / Matryoshka / distillation / multi-task}
Loss: {MultipleNegativesRankingLoss / CachedMultipleNegativesRankingLoss / CosEntLoss}
Hard Negatives: {random / BM25 / model-based / iterative}
Data: {N} pairs | Negatives per Query: {N}
Epochs: {N} | Batch: {N} | LR: {lr} | Warmup: {N} steps
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Embedding model selected with MTEB scores, dimensionality, and language coverage justified.
- [ ] Chunking strategy chosen with size, overlap, and rationale matched to retrieval use case.
- [ ] Distance metric and normalization specified and consistent with training.
- [ ] Vector index type selected with parameters tuned for corpus size and recall target.
- [ ] Production indexing, caching, and re-indexing strategy defined.
- [ ] Training configuration documented if custom embeddings needed (loss, hard negatives, data).
- [ ] Quality evaluation pipeline with benchmark metrics and drift monitoring.
- [ ] Quantization strategy for scale (if needed) with quality impact assessment.

## Embedding Model Selection Decision Tree

```
Determine language coverage
├── Monolingual English
│   ├── Latency-critical (<5ms, CPU)?
│   │   └── all-MiniLM-L6-v2 (384d, MTEB 56.1, 80MB, 5000 docs/s CPU)
│   ├── General RAG, balanced?
│   │   ├── BGE-base-en-v1.5 (768d, MTEB 62.3, 330MB, 1500 docs/s CPU)
│   │   └── nomic-embed-text-v1.5 (768d, MTEB 64.1, Matryoshka 64-768)
│   ├── High-quality retrieval?
│   │   ├── BGE-large-en-v1.5 (1024d, MTEB 63.5, 670MB, 800 docs/s CPU)
│   │   └── intfloat/e5-mistral-7b-instruct (4096d, MTEB 66.6, 14GB, GPU needed)
│   ├── API preferred (no self-hosting)?
│   │   ├── Budget < $X/month → text-embedding-3-small (512d, MTEB 62.0, $0.02/1M)
│   │   ├── Best quality → text-embedding-3-large (3072d, MTEB 64.6, $0.13/1M)
│   │   ├── Truncatable dims → Cohere embed-english-v3 (1024→512d, MTEB 62.0, $0.10/1M)
│   │   └── 8K context → Jina Embeddings v3 (1024d, 8192 tokens)
│   └── Task-specific / instruction-aware?
│       └── Instructor-XL (768d, MTEB 62.5, 1.3GB, instruction-prefixed)
│
├── Multilingual (single model, many languages)
│   ├── Best all-around → intfloat/multilingual-e5-large (1024d, MTEB 65.4, 100 langs)
│   ├── Strong retrieval → BGE-m3 (1024d, dense+sparse+ ColBERT, 100+ langs)
│   ├── API → Cohere embed-multilingual-v3 (1024d, 100+ langs, $0.10/1M)
│   ├── Japanese-focused → intfloat/multilingual-e5-small (384d, ja + en)
│   └── Chinese-focused → BAAI/bge-large-zh-v1.5 (1024d, zh + en)
│
└── Cross-lingual (query in A, docs in B)
    └── LaBSE (768d, 109 langs, cross-lingual alignment)
    └── sentence-transformers/use-cmlm-multilingual (768d, 16 langs)
    └── intfloat/multilingual-e5-large with "query:" / "passage:" prefix

Dimensionality decision (after model selection):
├── Matryoshka capable?
│   ├── Use 768d for storage and search
│   ├── Truncate to 128-256d for latency-critical serving
│   └── Keep full dim for reranking stage
├── Fixed dimension?
│   ├── 384d: 1.5GB/1M vecs (FP32), fastest search, good for <10M vectors
│   ├── 768d: 3GB/1M vecs, balanced, good for <5M vectors
│   ├── 1024d: 4GB/1M vecs, high quality, needs approximate index at scale
│   └── 3072d: 12GB/1M vecs, API-only, needs PQ or dim reduction
└── Storage budget limited?
    ├── Quantize (int8 → 4x reduction, <2% quality drop)
    ├── Binary quantize (32x reduction, 5-15% quality drop)
    └── PCA to 256d (measure quality impact on downstream task)
```

## Chunking Strategy Decision Tree

```
What are you chunking?
├── Code
│   ├── Per function/class (AST-based)
│   │   └── Chunk size: bounded by function length, overlap: 0
│   └── Per line group (indentation-based)
│       └── Chunk size: 20-50 lines, overlap: 3-5 lines
├── Prose (articles, docs, books)
│   ├── Retrieval granularity = passage-level (~1 paragraph)?
│   │   └── Semantic chunking (embedding similarity splits)
│   │       Chunk size: 128-256 tokens, overlap: 16-32 tokens (12-25%)
│   ├── Retrieval granularity = section-level?
│   │   └── Recursive chunking (split on headers first, then paragraphs)
│   │       Max chunk: 512 tokens, overlap: 64 tokens (12.5%)
│   └── Retrieval granularity = document-level?
│       └── No chunking needed, embed entire document
│           Max tokens: model max (512 for MiniLM, 8192 for Jina)
├── Structured documents (PDFs, HTML)
│   ├── Document-aware (preserve heading hierarchy)
│   │   ├── Split on h1/h2/h3 boundaries
│   │   ├── Propagate section context into child chunks
│   │   └── Chunk size: 256-512 tokens, overlap: header text (10-20%)
│   └── Sliding window (ignore structure)
│       └── Chunk size: 256 tokens, overlap: 64 tokens (25%)
└── Tables / structured data
    └── Row-level with column headers as context
        Chunk: header + row, token budget: model max

Fixed-size chunking:
├── Pros: Simple, deterministic, fast, reproducible
├── Cons: Splits mid-sentence, loses semantic boundaries
├── Chunk size guidelines:
│   ├── 128 tokens: fine-grained retrieval, good for Q&A
│   ├── 256 tokens: balanced, most common (default)
│   ├── 512 tokens: coarse, good for summarization
│   └── Token budget must account for overlap
└── Overlap guidelines:
    ├── 0-10%: minimal redundancy, higher risk of context loss
    ├── 10-20%: balanced, recommended (default: 15%)
    └── 25-50%: high redundancy, better coverage, more tokens

Semantic chunking:
├── How it works: embed sentences, split at cosine distance peaks
├── Pros: Respects semantic boundaries, better coherence
├── Cons: Slower (requires sentence-level embeddings), variable chunk sizes
├── Implementation:
│   1. Split text into sentences (spaCy, nltk, tiktoken)
│   2. Embed each sentence with lightweight model
│   3. Compute pairwise cosine distance between adjacent sentences
│   4. Split where distance exceeds threshold (0.3-0.5)
│   5. Merge small chunks into nearest neighbor
└── Threshold tuning:
    ├── 0.3: very fine-grained, many chunks
    ├── 0.4: balanced (default)
    └── 0.5: coarse-grained, fewer chunks
```

## Architectural Patterns

### Pattern 1: Text Embedding Pipeline
```
[Raw Documents]
    │
    ▼
[Preprocessing]
    ├── Strip HTML/markdown
    ├── Normalize whitespace
    ├── Unescape HTML entities
    └── Handle encoding (UTF-8)
    │
    ▼
[Chunking]
    ├── Strategy from decision tree
    ├── Apply overlap
    └── Assign metadata (doc_id, chunk_id, source)
    │
    ▼
[Tokenization]
    ├── Use model's tokenizer
    ├── Truncate to max_length (right or left — depends on task)
    ├── Set overflow_to_sample for long docs
    └── Count tokens for cost estimation (API models)
    │
    ▼
[Embedding Generation]
    ├── Batch: 32-128 documents per batch (tune for GPU memory)
    ├── Normalize: always L2-normalize for cosine use
    ├── Show progress bar for indexing runs
    └── Cache: deduplicate exact text matches via hash
    │
    ▼
[Post-processing]
    ├── Dimension reduction (Matryoshka truncate or PCA)
    ├── Quantization (FP32 → FP16 → int8 → binary)
    └── Validate: check for NaN, zero vectors, uniform values
    │
    ▼
[Storage / Indexing]
    ├── Vector index (HNSW, IVF, PQ, Flat)
    ├── Metadata store (doc_id, chunk positions)
    └── Embedding cache for frequent queries
```

### Pattern 2: Hybrid Search
```
[Query]
    │
    ├──→ [Dense Retrieval Path]
    │       ├── Embed query with same model as index
    │       ├── L2 normalize
    │       └── Search vector index → dense scores
    │
    ├──→ [Sparse Retrieval Path]
    │       ├── BM25 / SPLADE / Learned sparse
    │       ├── Tokenize and match
    │       └── Compute sparse scores
    │
    └──→ [Fusion]
            ├── Normalize both score distributions (min-max or z-score)
            ├── Weight: dense_weight (0.3-0.7) + sparse_weight (1 - dense_weight)
            │   ├── dense_weight=0.7: semantic-heavy (good for synonyms, paraphrases)
            │   └── dense_weight=0.3: keyword-heavy (good for exact terms, IDs, codes)
            ├── RRF alternative: score = 1/(60 + rank_dense) + 1/(60 + rank_sparse)
            └── Return top-K fused results
```

### Pattern 3: Multi-Modal Embeddings
```
[Modality-Specific Encoders]
    ├── Text: sentence-transformer or CLIP text encoder
    ├── Image: CLIP vision encoder or ViT
    ├── Audio: CLAP, Whisper encoder, or HuBERT
    └── Video: timestamp-sampled frames through CLIP + temporal aggregation

[Fusion Strategies]
    ├── Early fusion: concat features before projection
    │   └── embed = projection(concat([text_feat, image_feat]))
    ├── Late fusion: separate embeddings + joint loss
    │   └── similarity(text_embed, image_embed) via contrastive loss
    └── Hybrid: late fusion with cross-attention
        └── ImageBind-style: image as bridge across modalities

[Cross-Modal Retrieval]
    ├── Text→Image: embed query text, search image index
    ├── Image→Text: embed query image, search text index
    └── Unified: all modalities in shared embedding space
```

## Vector Index Selection

### Index Type Comparison Table
```
| Index   | Build Time | Search Speed | Memory         | Recall@10 | Best For                     |
|---------|-----------|-------------|----------------|-----------|------------------------------|
| Flat    | None      | O(N)        | d×4 bytes/vec  | 1.0       | <10K vectors, exact          |
| IVF     | Fast      | O(log N)    | d×4 + overhead | 0.92-0.98 | >100K vectors, good recall   |
| HNSW    | Slow      | O(log N)    | d×4× (1+2M)    | 0.98-0.99 | <10M vectors, high recall    |
| PQ      | Medium    | Fast        | M×code_size    | 0.80-0.90 | >100M, memory-constrained    |
| IVFPQ   | Medium    | Fast        | M×code_size    | 0.85-0.95 | >10M, balanced               |
| DiskANN | Very Slow | Medium      | Low (disk)     | 0.95-0.97 | >10M vectors, limited RAM    |
```

### HNSW Parameters
```
M (connections per layer): 16-64
  - 16: lower memory (~2GB for 1M 768d), lower recall
  - 32: balanced (default, ~4GB for 1M 768d)
  - 64: high recall (~8GB for 1M 768d), slower build
  Memory ≈ d × 4 × (1 + M × 2) × N

efConstruction (build quality): 100-500
  - 100: fast build, adequate recall
  - 200: balanced (default)
  - 400+: high recall, slow build (5-10x slower)

efSearch (search breadth): 50-500
  - 50: fast search, may miss results
  - 100: balanced (default)
  - 200+: high recall, 2-4x slower search
```

### IVF Parameters
```
nlist (clusters): sqrt(N) to 4×sqrt(N)
  - N=10K → nlist=100-400
  - N=100K → nlist=316-1265
  - N=1M → nlist=1000-4000
  Higher nlist = slower build, finer partitioning

nprobe (clusters searched): 10-100
  - Rule: recall ≈ 1 - (1 - nprobe/nlist)^k
  - Start with nprobe = nlist/10, tune up for recall
  - Search time = O(nprobe × nlist_size)
```

### PQ Parameters
```
M (sub-quantizers): dimension / code_size
  - M=96 for 768d → 96 bytes/vec (32x compression)
  - M=48 for 768d → 48 bytes/vec (64x compression)
  - Higher M = better recall, more memory

code_size (bytes per sub-vector): 4-8
  - 4: 16 centroids per sub-quantizer
  - 8: 256 centroids (default, good quality)

Memory = M × code_size bytes per vector
  - Original 768d FP32: 3072 bytes/vec
  - PQ M=96, code_size=8: 96 bytes/vec (32x)
  - PQ M=48, code_size=8: 48 bytes/vec (64x)
```

### Selection by Scale
```
<10K vectors: IndexFlatIP (or FlatL2). Exact search, 1ms latency.
10K-100K: IVF with nlist=sqrt(N), nprobe=10. 2-5ms latency.
100K-1M: HNSW with M=32, efSearch=100. <5ms latency, 0.99 recall.
1M-10M: IVF with nlist=4×sqrt(N), nprobe=20-50. 5-20ms latency.
10M-100M: IVFPQ or HNSW with PQ compression. 10-50ms latency.
>100M: DiskANN or distributed IVF. 50-200ms latency.
```

## Code Examples

### Embedding Generation Pipeline
```python
from sentence_transformers import SentenceTransformer
import numpy as np

def embed_pipeline(
    texts: list[str],
    model_name: str = "BAAI/bge-base-en-v1.5",
    batch_size: int = 64,
    normalize: bool = True,
    truncate_dim: int | None = None,
    device: str = "cpu",
) -> np.ndarray:
    """End-to-end embedding generation with batching and normalization."""
    model = SentenceTransformer(model_name, device=device)

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=normalize,
        truncate_dim=truncate_dim,
        show_progress_bar=True,
    )
    return np.array(embeddings)

# Usage: 100K docs in batches
embeddings = embed_pipeline(
    texts=all_docs,
    model_name="BAAI/bge-base-en-v1.5",
    batch_size=128,
    normalize=True,
    truncate_dim=256,  # Matryoshka to 256d for faster search
)
```

### Chunking Strategies
```python
from typing import Iterator

def fixed_size_chunks(
    text: str,
    chunk_size: int = 256,
    overlap: int = 38,
    tokenizer=None,
) -> Iterator[str]:
    """Fixed-size token-based chunking with overlap."""
    tokens = tokenizer.encode(text)
    if len(tokens) <= chunk_size:
        yield text
        return

    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        yield tokenizer.decode(chunk_tokens)
        start += chunk_size - overlap

def semantic_chunks(
    text: str,
    threshold: float = 0.4,
    min_chunk_tokens: int = 50,
) -> list[str]:
    """Semantic chunking based on embedding distance between sentences."""
    import spacy
    nlp = spacy.load("en_core_web_sm")
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeds = model.encode(sentences, normalize_embeddings=True)

    splits = [0]
    for i in range(1, len(sentences)):
        sim = float(np.dot(embeds[i - 1], embeds[i]))
        if 1 - sim > threshold:  # cosine distance > threshold
            splits.append(i)
    splits.append(len(sentences))

    chunks = []
    for i in range(len(splits) - 1):
        chunk = " ".join(sentences[splits[i]:splits[i + 1]])
        chunks.append(chunk)
    return chunks

def recursive_chunks(text: str, max_tokens: int = 512) -> list[str]:
    """Recursive chunking: split on headers, then paragraphs, then sentences."""
    import re
    # Level 1: split on headers
    sections = re.split(r"\n#{1,3}\s+", text)
    chunks = []
    for section in sections:
        # Level 2: split on double newlines (paragraphs)
        paragraphs = re.split(r"\n\s*\n", section)
        chunk = ""
        for para in paragraphs:
            if len(chunk + para) < max_tokens:
                chunk += para + "\n"
            else:
                if chunk.strip():
                    chunks.append(chunk.strip())
                if len(para) > max_tokens:
                    # Level 3: split long paragraphs by sentences
                    for sent in re.split(r"(?<=[.!?])\s+", para):
                        chunks.append(sent)
                else:
                    chunk = para + "\n"
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks
```

### FAISS Indexing with Multiple Index Types
```python
import faiss
import numpy as np

def build_index(embeddings: np.ndarray, index_type: str = "hnsw"):
    """Build vector index with configurable type."""
    d = embeddings.shape[1]
    embeddings = embeddings.astype(np.float32)
    faiss.normalize_L2(embeddings)

    if index_type == "flat":
        index = faiss.IndexFlatIP(d)

    elif index_type == "hnsw":
        index = faiss.IndexHNSWFlat(d, M=32)
        index.hnsw.efConstruction = 200

    elif index_type == "ivf":
        nlist = int(4 * np.sqrt(embeddings.shape[0]))
        quantizer = faiss.IndexFlatIP(d)
        index = faiss.IndexIVFFlat(quantizer, d, nlist, faiss.METRIC_INNER_PRODUCT)
        index.train(embeddings)
        index.nprobe = 20

    elif index_type == "ivfpq":
        nlist = int(np.sqrt(embeddings.shape[0]))
        quantizer = faiss.IndexFlatIP(d)
        m = d // 8
        index = faiss.IndexIVFPQ(quantizer, d, nlist, m, 8)
        index.train(embeddings)
        index.nprobe = 20

    else:
        raise ValueError(f"Unknown index type: {index_type}")

    index.add(embeddings)
    return index

def search_index(index, query_embed: np.ndarray, k: int = 10):
    """Search with proper normalization."""
    query = query_embed.astype(np.float32).reshape(1, -1)
    faiss.normalize_L2(query)
    distances, indices = index.search(query, k)
    return distances[0], indices[0]
```

### Hybrid Search (Dense + Sparse)
```python
from rank_bm25 import BM25Okapi

def hybrid_search(
    query: str,
    dense_embeddings: np.ndarray,
    documents: list[str],
    query_embed: np.ndarray,
    model,
    dense_weight: float = 0.5,
    alpha: float = 60,
    top_k: int = 10,
) -> list[dict]:
    """Hybrid search with configurable fusion strategy."""

    # Dense scores
    dense_scores = dense_embeddings @ query_embed

    # Sparse scores (BM25)
    tokenized_docs = [doc.split() for doc in documents]
    bm25 = BM25Okapi(tokenized_docs)
    bm25_scores = bm25.get_scores(query.split())

    # Normalize both to [0, 1]
    def normalize(scores):
        mn, mx = scores.min(), scores.max()
        return (scores - mn) / (mx - mn) if mx > mn else scores

    dense_norm = normalize(dense_scores)
    sparse_norm = normalize(bm25_scores.astype(float))

    # Fusion method 1: weighted linear
    combined = dense_weight * dense_norm + (1 - dense_weight) * sparse_norm

    # Fusion method 2: RRF (alternative)
    def rrf_fusion(dense_scores, bm25_scores, alpha=60):
        dense_ranks = np.argsort(np.argsort(-dense_scores))
        bm25_ranks = np.argsort(np.argsort(-bm25_scores))
        rrf = 1 / (alpha + dense_ranks) + 1 / (alpha + bm25_ranks)
        return rrf

    rrf_scores = rrf_fusion(dense_scores, bm25_scores, alpha)
    top_indices = np.argsort(-combined)[:top_k]

    return [
        {"doc": documents[i], "score": float(combined[i]), "dense": float(dense_scores[i]), "sparse": float(bm25_scores[i])}
        for i in top_indices
    ]
```

## Anti-Patterns

### Wrong Dimensionality for Downstream Task
Using full 3072d from text-embedding-3-large for a real-time search index with 50M vectors.
- Impact: 12GB/1M vectors → 600GB RAM. Search latency 50ms+.
- Fix: Truncate via Matryoshka to 256d or use PCA reduction. Quantize to int8.

### Ignoring Normalization Consistency
Training with cosine distance but not normalizing at inference, or normalizing documents but not queries.
- Impact: Arbitrary score ranges, incorrect ranking, undefined behavior with inner product search.
- Fix: Always `normalize_embeddings=True` in encode(). Normalize stored vectors in index. Normalize every query.

### Inconsistent Chunking Between Indexing and Retrieval
Indexing with chunk_size=512 but retrieving with chunk_size=128.
- Impact: Embeddings from different token contexts are incomparable.
- Fix: Use identical tokenizer, chunk_size, overlap, and truncation settings at index and query time.

### Average Embeddings (AKA "Embedding Arithmetic" Fallacy)
Averaging embeddings of two sentences does not produce a meaningful "combined" embedding for retrieval.
- Impact: Semantic cancellation, degraded retrieval. A + B - C ≠ semantic vector arithmetic.
- Fix: Use the original text directly. If combination is needed, use late interaction (ColBERT) or multi-vector retrieval.

### Embedding Every Token Without Truncation
Sending 10K token documents to a 512-token context model.
- Impact: Truncation destroys tail content silently. Retrieval misses relevant tail sections.
- Fix: Chunk documents first, embed each chunk separately. Use models with longer context (Jina 8K, E5-Mistral 32K).

### Single Vector for Long Documents
Representing a 100-page PDF with one 768d embedding.
- Impact: Semantic overload, query touches any part → same embedding. Low retrieval precision.
- Fix: Chunk to 256-512 token passages, embed each, retrieve at passage level.

### Training Without Hard Negatives
Using only (query, positive) pairs in contrastive learning.
- Impact: Model learns trivial separation, poor discrimination between similar but irrelevant results.
- Fix: Include hard negatives curated via BM25 retrieval or model-in-the-loop mining.

### Using Unnormalized Embeddings with Inner Product
Building FAISS index with IndexFlatIP on unnormalized vectors.
- Impact: Inner product ≠ cosine similarity. Magnitude dominates over direction. Biased toward long documents.
- Fix: Always L2-normalize before adding to IP index, or use IndexFlatL2 with cosine distance.

## Production Considerations

### Embedding Update Strategies
```
Batch rebuild (zero-downtime):
  1. Embed all documents with new model
  2. Build new index
  3. Swap index reference atomically
  4. Keep old index for in-flight queries
  Good for: model version upgrades, schema changes
  Bad for: high-velocity data

Incremental update (HNSW/IVF):
  - HNSW supports online insertion (index.add())
  - IVF supports online insertion AFTER training
  - PQ does NOT support online insertion (need batch rebuild)
  - Deletion: not supported natively — use tombstone filter
  Strategy:
    1. Maintain a deletion bitmask
    2. Filter out tombstoned IDs after search
    3. Periodically rebuild to reclaim space (>20% tombstones)

Two-index pattern (hot/warm):
  - Hot index: recent N days, updated hourly, small, fast
  - Warm index: everything older, rebuilt nightly
  - Query both, merge results with RRF
  - Reduces rebuild cost by 10x for append-heavy workloads
```

### Re-indexing
```
Trigger events:
├── Model version upgrade (new MTEB SOTA)
├── Embedding drift detected (>10% mean shift from reference distribution)
├── Data distribution shift (new domains, languages, document types)
├── Chunking strategy change (size, overlap, method)
├── Index fragmentation (>20% tombstones)
└── Scheduled (monthly for stable corpora, weekly for dynamic)

Process:
  1. Snapshot current documents with metadata
  2. Generate new embeddings in parallel batches
  3. Build new index on separate infrastructure
  4. Validate: sample 1K queries, compare recall@10 against old index
  5. Canary deploy: route 5% traffic to new index, monitor latency & recall
  6. Full swap when validation passes
  7. Decomission old index after TTL (allow in-flight queries to drain)
```

### Cost Optimization
```
Storage cost (1M vectors, 768d):
  ┌──────────────────────┬───────────┬───────────┐
  │ Storage              │ Memory    │ Cost/mo   │
  ├──────────────────────┼───────────┼───────────┤
  │ FP32 + HNSW M=32     │ 5400 MB   │ $135      │
  │ FP16 + HNSW M=32     │ 2700 MB   │ $68       │
  │ int8 + HNSW M=32     │ 1350 MB   │ $34       │
  │ FP32 + IVF nlist=2K  │ 3100 MB   │ $78       │
  │ PQ M=96, code=8      │ 96 MB     │ $3        │
  │ Binary               │ 96 MB     │ $3        │
  └──────────────────────┴───────────┴───────────┘

API cost (1M documents, ~200 tokens each):
  ┌─────────────────────────────┬──────────┬──────────┐
  │ Model                       │ Cost     │ Batch    │
  ├─────────────────────────────┼──────────┼──────────┤
  │ text-embedding-3-small      │ $4       │ 2048     │
  │ text-embedding-3-large      │ $26      │ 2048     │
  │ Cohere embed-english-v3     │ $20      │ 96       │
  └─────────────────────────────┴──────────┴──────────┘

Reduce costs:
  ├── Deduplicate texts before embedding (cache hits)
  ├── Use smaller dims for initial retrieval, re-rank with full
  ├── Batch API calls to max batch size (reduce HTTP overhead)
  ├── Quantize stored embeddings (int8: 4x storage reduction)
  ├── Use self-hosted models for high-volume workloads
  └── Monitor embedding cache hit rate (target >40%)
```

## Evaluation

### Embedding Quality Metrics
```
Task              │ Metrics                          │ Key Consideration
──────────────────┼──────────────────────────────────┼─────────────────────────
Retrieval         │ MRR@K, Recall@K, NDCG@K          │ Top-ranked relevance
Classification    │ Accuracy, F1, Macro-F1            │ Label balance
Clustering        │ ARI, NMI, V-Measure, Silhouette  │ Ground truth available?
STS               │ Spearman ρ, Pearson r             │ Human correlation
Reranking         │ MAP, NDCG                         │ Ordering precision
Pair Classification│ F1, Accuracy                     │ Binary relevance

MTEB categories: Classification, Clustering, PairClassification, Reranking, Retrieval, STS, Summarization.
Use MTEB to benchmark against leaderboard, but always validate on domain-specific test set.
```

### Retrieval Quality Evaluation Pipeline
```python
class RetrievalEval:
    def __init__(self, embedder, index, documents):
        self.embedder = embedder
        self.index = index
        self.documents = documents

    def evaluate(self, queries: list[str], relevant: list[list[int]], k: int = 10):
        metrics = {"mrr": [], "recall": [], "ndcg": []}
        for q, rels in zip(queries, relevant):
            q_emb = self.embedder.encode([q], normalize_embeddings=True)
            _, indices = self.index.search(np.array(q_emb), k)
            retrieved = set(indices[0])
            relevant_set = set(rels)

            recall = len(retrieved & relevant_set) / max(len(relevant_set), 1)
            metrics["recall"].append(recall)

            for rank, idx in enumerate(indices[0]):
                if idx in relevant_set:
                    metrics["mrr"].append(1.0 / (rank + 1))
                    break
            else:
                metrics["mrr"].append(0.0)

        return {
            "recall@k": np.mean(metrics["recall"]),
            "mrr@k": np.mean(metrics["mrr"]),
        }
```

### Statistical Significance
- Compare two embedding models: paired bootstrap test on query-level metrics
- Minimum 500 queries for reliable comparison
- Report confidence intervals (95% CI via bootstrap)
- A/B test in production: interleave results from old vs new model, measure implicit feedback (click-through)

## Rules
- Normalize embeddings to unit length for cosine similarity via dot product — always, without exception.
- Distance metric must match training: cosine for most sentence transformers, euclidean for some specialized models.
- Chunking parameters (size, overlap, method) must be identical at index and query time.
- MTEB leaderboard is ground truth for model selection — not blog posts, not vendor benchmarks.
- Hard negatives significantly improve embedding quality in contrastive training (5-15% MRR lift).
- Batch embeddings during indexing (batch_size=64-128), never one-by-one.
- Quantization from FP32 to int8 drops <2% accuracy but 4x memory reduction; binary drops 5-15%.
- Cache frequent queries — embedding generation is the bottleneck, not search.
- Embedding dimension directly affects storage (linear) and search speed (polynomial for exhaustive).
- Monitor embedding drift monthly — data distribution changes degrade retrieval quality silently.
- Tokenization affects embeddings: ensure same tokenizer, truncation side, and max_length at all stages.
- Matryoshka models preferred when serving multiple latency tiers with one deployment.
- Never average embeddings of separate texts — embed the combined text directly if needed.
- Vector index choice is a 3-way tradeoff: recall × latency × memory. Optimize for your constraint.
- Re-index when model changes, chunking changes, or drift exceeds threshold — never run stale embeddings.
- For API embedding services, batch to max allowed size and cache aggressively.
- Evaluate on your data, not just MTEB — domain-specific performance varies significantly.
- Use FP16 inference for 2x speedup with zero quality loss on compatible hardware.

## References
  - references/embeddings-fundamentals.md — Embedding Fundamentals (vector spaces, metrics, pooling, tokenization)
  - references/embeddings-advanced.md — Advanced Embedding Topics (contrastive learning theory, distillation, hard negatives)
  - references/embedding-models.md — Embedding Models Comparison
  - references/embedding-training.md — Embedding Training (code-focused)
  - references/embedding-use-cases.md — Embedding Use Cases
  - references/embedding-optimization.md — Embedding Optimization
  - references/embedding-evaluation.md — Embedding Evaluation
  - references/embedding-deployment.md — Embedding Deployment
  - references/embedding-api-integration.md — Embedding API Integration
  - references/vector-indexing.md — Vector Indexing
  - references/chunking-strategies.md — Chunking Strategies for Retrieval
  - references/hybrid-search.md — Hybrid Search: Dense + Sparse Fusion
  - references/multi-modal-embeddings.md — Multi-Modal Embeddings

## Handoff
For RAG pipeline with these embeddings, hand off to `ai-rag-patterns`. For vector database operations, hand off to `ai-vector-databases`. For multi-modal embedding training, hand off to `ai-multimodal`. For embedding model fine-tuning at scale, hand off to `ai-model-training`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

