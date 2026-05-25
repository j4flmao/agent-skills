# Hybrid RAG

## Hybrid Search Architecture

```
Query
  ├── Dense retrieval (embedding similarity)
  │     └── Top-K dense results
  ├── Sparse retrieval (BM25 / SPLADE)
  │     └── Top-K sparse results
  └── Fusion (RRF / weighted sum)
        └── Re-ranked final results
```

### Fusion Methods

| Method | Formula | Best For |
|--------|---------|----------|
| Reciprocal Rank Fusion | score = 1 / (k + rank) | Fixed k=60, balanced |
| Weighted sum | score = w1*dense + w2*sparse | Tuned per corpus |
| Convex combination | score = α * norm(dense) + (1-α) * norm(sparse) | Smooth density control |
| Learning to rank | LambdaMART model | Large training data |

```python
def reciprocal_rank_fusion(dense_results, sparse_results, k=60):
    scores = {}
    for rank, doc_id in enumerate(dense_results):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    for rank, doc_id in enumerate(sparse_results):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

## Re-Ranking

| Re-Ranker | Speed | Quality | Use Case |
|-----------|-------|---------|----------|
| Cross-encoder (BGE-reranker) | 50ms/doc | Best | Precision-critical |
| Cohere Rerank | 30ms/doc | Excellent | API-based |
| MonoBERT | 100ms/doc | Very good | Academic |
| Lightweight bi-encoder | 5ms/doc | Good | Latency-sensitive |

## RAG Evaluation

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Recall@K | Fraction of relevant docs retrieved | > 0.9 |
| MRR | Mean reciprocal rank of first relevant | > 0.8 |
| NDCG@K | Rank-weighted relevance | > 0.85 |
| Faithfulness | % claims supported by context | > 95% |
| Answer relevance | How well answer addresses query | > 4.0/5.0 |

## Production Optimization

| Optimization | Impact | Effort |
|-------------|--------|--------|
| Query expansion (2-3 variants) | +5-10% recall | Low |
| Hybrid search | +10-20% overall quality | Medium |
| Re-ranking top 50 → top 5 | +15-25% precision | Medium |
| Index pruning | -30% storage | Low |
| Embedding quantization | -75% storage, < 2% quality drop | Medium |

### Query Expansion
```python
async def expand_query(query, llm):
    prompt = f"""Generate 3 search query variants for: {query}
    Each variant should capture a different aspect.
    Return as comma-separated list."""
    response = await llm.ainvoke(prompt)
    variants = [v.strip() for v in response.content.split(",")]
    return [query] + variants
```

## Context Assembly

| Strategy | Description | Best For |
|----------|-------------|----------|
| Concatenated flat | Top-K chunks concatenated in order | Simple Q&A |
| Structured sections | Grouped by source document with headers | Multi-document queries |
| Summary-first | Summary of all docs, then top chunks | Large contexts |
| Hierarchical | Chunks + parent document summaries | Deep retrieval |

### Context Budget Management
```python
class ContextBuilder:
    def __init__(self, max_tokens=4000):
        self.max_tokens = max_tokens

    def build_context(self, chunks, query):
        selected = []
        token_count = 0
        for chunk in sorted(chunks, key=lambda c: c.score, reverse=True):
            chunk_tokens = self.count_tokens(chunk.text)
            if token_count + chunk_tokens <= self.max_tokens:
                selected.append(chunk)
                token_count += chunk_tokens
        return {
            "tokens_used": token_count,
            "chunks": selected,
            "overflow": len(chunks) - len(selected),
        }

    def count_tokens(self, text):
        return len(text.split()) * 1.3  # approximate
```

## Production Pipeline
```
Documents → Chunking → Embedding → Index → Hybrid Search
                                                ↓
Query → Query Expansion → Dense + Sparse → Fusion → Re-rank
                                                       ↓
                                              Context Assembly
                                                       ↓
                                              LLM Generation
```
