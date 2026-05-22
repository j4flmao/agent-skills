# Retrieval Techniques

## Dense Retrieval

Uses neural embeddings to search by semantic similarity. Converts queries and documents into dense vectors, then finds nearest neighbors.

### How It Works
```
Query → Embedding Model → Query Vector (768d)
Documents → Embedding Model → Document Vectors (768d)
Score = cosine_similarity(query_vector, doc_vector)
Top-K documents by score
```

### Models

| Model | Dimensions | Quality | Speed | Max Tokens |
|-------|-----------|---------|-------|------------|
| text-embedding-3-large | 256-3072 | Highest | Medium | 8191 |
| text-embedding-3-small | 512-1536 | High | Fast | 8191 |
| Cohere embed-english-v3 | 1024 | High | Fast | 512 |
| intfloat/e5-mistral-7b-instruct | 4096 | Highest | Slow | 4096 |
| BGE-large-en-v1.5 | 1024 | High | Medium | 512 |
| sentence-transformers/all-MiniLM-L6-v2 | 384 | Medium | Fastest | 256 |

### Configuration
- Index type: HNSW for <10M, IVF for >10M, DiskANN for billion-scale.
- Distance metric: cosine for normalized vectors, dot for inner product training.
- Normalization: always normalize unit vectors for cosine distance.

### Matryoshka Representation Learning
Train embedding model to support multiple dimensions from the same vector:
```
3072d → 1024d → 512d → 256d → 64d
```
Use lower dimensions for faster search, higher for maximum accuracy. Trade 2-3% accuracy for 10x speed improvement.

### Pros and Cons
- Pros: semantic understanding, handles synonyms and paraphrasing, no exact keyword match needed.
- Cons: out-of-vocabulary terms, rare entities, requires GPU for indexing large corpora, training data bias.

## Sparse Retrieval (BM25)

Keyword-based retrieval using term frequency and inverse document frequency. No neural component.

### BM25 Scoring
```
score(Q, D) = Σ (IDF(t) · TF(t, D) · (k1 + 1)) / (TF(t, D) + k1 · (1 - b + b · |D| / avgdl))
```
Where: k1=1.2-2.0 (term saturation), b=0.75 (length normalization), avgdl=average document length.

### Variants
- BM25+ with t=1: adds a term frequency floor to handle very long documents.
- BM25L: variant for documents with very non-uniform lengths.
- BM25F: handles documents with multiple fields (title, body, tags) with per-field weights.

### Pros and Cons
- Pros: fast, no GPU needed, works well for keyword-heavy queries, interpretable scoring, no training.
- Cons: no semantic understanding, exact term matching only, high-dimensional sparse vectors, sensitive to vocabulary mismatch.

### When to Use
- As complement to dense retrieval in hybrid search.
- For domains with precise terminology (legal, medical, technical).
- When query contains proper nouns, IDs, or exact phrases.

## Hybrid Search

Combines dense and sparse retrieval scores to get the best of both.

### Fusion Methods

#### Weighted Sum
```
final_score = α · dense_score + (1-α) · sparse_score
```
Default α=0.5. Tune on validation set. Dense-heavy for semantic queries, sparse-heavy for keyword queries.

#### Reciprocal Rank Fusion (RRF)
```
score(d) = Σ 1 / (k + rank_i(d))
```
Where rank_i(d) is the rank of document d in retrieval method i, k=60 (constant). No score normalization needed.

### Implementation
```python
def hybrid_search(query, alpha=0.5, top_k=10):
    dense_results = dense_search(query, top_k=top_k * 2)
    sparse_results = sparse_search(query, top_k=top_k * 2)
    
    # Normalize scores to [0, 1]
    dense_scores = normalize(dense_results.scores)
    sparse_scores = normalize(sparse_results.scores)
    
    # Combine
    combined = {}
    for doc in set(dense_results.ids + sparse_results.ids):
        dense_score = dense_scores.get(doc, 0)
        sparse_score = sparse_scores.get(doc, 0)
        combined[doc] = alpha * dense_score + (1 - alpha) * sparse_score
    
    return sorted(combined, key=combined.get, reverse=True)[:top_k]
```

### RRF Alternative
```python
def rrf_fusion(dense_results, sparse_results, k=60):
    scores = {}
    for rank, doc in enumerate(dense_results):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank + 1)
    for rank, doc in enumerate(sparse_results):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)
```

### Pros and Cons
- Pros: best overall performance on varied corpora, robust to query type, compensates for each method's weaknesses.
- Cons: two retrieval pipelines = 2x infrastructure, tuning α requires validation set, latency additive.

### When to Use
- Default for production RAG systems.
- Mixed corpora with both semantic and keyword-relevant content.
- When you don't know query characteristics in advance.

## Re-Ranking

Applying a more expensive, more accurate model to the top-K results from a cheaper retrieval step.

### Two-Stage Pipeline
```
Stage 1 (Retrieval): top-100 results from hybrid search (fast, approximate)
Stage 2 (Re-ranking): cross-encoder scores each query-doc pair (slow, accurate)
Output: top-5 to top-10 from re-ranker
```

### Cross-Encoder vs Bi-Encoder
| Property | Bi-Encoder (Retrieval) | Cross-Encoder (Re-ranking) |
|----------|----------------------|---------------------------|
| Speed | Fast (batch, pre-computed) | Slow (pairwise, compute per query) |
| Accuracy | Good | Excellent |
| Pre-compute | Yes (index in DB) | No (per query) |
| Complexity | O(N) indexed | O(K · N) per query |

### Re-Ranking Models
| Model | Quality | Speed | Context |
|-------|---------|-------|---------|
| Cohere Rerank v3 | Excellent | Fast (API) | 512 tokens |
| BGE-reranker-v2-m3 | Excellent | Medium | 8192 tokens |
| cross-encoder/ms-marco-MiniLM-L6-v2 | Good | Fast | 512 tokens |
| BAAI/bge-reranker-v2-gemma | Highest | Slow | 8192 tokens |

### Implementation
```python
def re_rank(query, candidates, model, top_n=5):
    pairs = [[query, doc.text] for doc in candidates]
    scores = model.predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in ranked[:top_n]]
```

### When to Use Re-Ranking
- Precision-critical applications (legal, medical, finance).
- When retrieved results need fine-grained ordering.
- Context assemblies with limited slots (re-ranker ensures best chunks fill them).

## Maximum Marginal Relevance (MMR)

Diversifies retrieved results by penalizing similarity to already-selected items.

### Algorithm
```
MMR = argmax [ λ · sim(query, doc_i) - (1-λ) · max sim(doc_i, doc_j) ]
                       relevance          diversity penalty
```

### Lambda Tuning
- λ=1.0: pure relevance (no diversity). Same as standard retrieval.
- λ=0.5: balanced relevance and diversity.
- λ=0.3: high diversity. Best for covering multiple aspects of a query.

### When to Use MMR
- Summarization over multiple perspectives.
- Exploratory search (user doesn't know exactly what they need).
- When top results are all about the same subtopic.

## Performance Tuning

### Latency Budget
```
100ms:    HNSW search (dense) + BM25 (sparse) + simple fusion
200ms:    + Cross-encoder re-ranking of top-20
500ms:    + Full re-ranking of top-100
1000ms+:  + Multiple rounds of retrieval + feedback loops
```

### Caching
- Cache embedding results for frequent queries (exact match).
- Cache re-ranking scores for query-doc pairs (temporary, invalidate on index update).
- Cache LLM responses for identical RAG prompts.

### Vector Search Parameters
| Index Type | Build Time | Search Speed | Memory | Recall@10 |
|-----------|-----------|-------------|--------|-----------|
| Flat (brute) | None | Slow (O(N)) | High | 1.0 |
| HNSW (ef=512, M=32) | Medium | Fast (log N) | High | 0.99 |
| IVF (nlist=4096, nprobe=64) | Fast | Medium | Medium | 0.95 |
| DiskANN | Slow | Medium | Low | 0.97 |
