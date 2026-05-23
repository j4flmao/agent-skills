# Retrieval Optimization

## Latency Budget

### Retrieval Breakdown
```
Embed query: 10-50ms (API) or 2-5ms (local)
Vector search: 5-100ms (depends on index type)
BM25 search: 2-10ms
Fusion: <1ms
Re-ranking: 50-500ms per 100 candidates
Total target: <200ms (simple), <500ms (with re-ranking)
```

### Optimization Levers

| Optimization | Impact | Effort | Latency Reduction |
|-------------|--------|--------|-------------------|
| Reduce top-K | High | Low | 10-30% |
| Use HNSW instead of Flat | High | Medium | 50-90% |
| Quantize vectors | High | Medium | 30-50% |
| Cache frequent queries | High | Low | 20-40% |
| Async retrieval | Medium | Medium | 10-20% |
| Pre-filter metadata | Medium | Low | 10-30% |

## Query Optimization

### Query Rewriting
```python
def rewrite_query(raw_query, llm):
    """Rewrite user query for better retrieval."""
    prompt = f"""Rewrite this search query to be more effective
for vector search. Expand abbreviations, fix typos, add context.

Original: {raw_query}
Rewritten:"""
    return llm.invoke(prompt).content
```

### Query Expansion
- Generate N query variations
- Retrieve for each variation
- Union or weighted merge results
- N=3 balances recall vs latency

## Embedding Optimization

### Batch Embedding
```python
def batch_embed(texts, batch_size=100):
    """Embed texts in batches for throughput."""
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embeddings = model.encode(batch)
        all_embeddings.extend(embeddings)
    return all_embeddings
```

### Dimension Reduction
- Use Matryoshka embeddings (truncate to 256d for 4x speed)
- PCA projection on stored vectors
- Trade: -2% recall for 4x speed improvement

## Caching Strategy

### Multi-Level Cache
```
Level 1 (in-memory): Exact query match, TTL=5min
Level 2 (Redis): Near-exact match (hash), TTL=1hr  
Level 3 (DB): Query → result, TTL=24hr
```

### Cache Invalidation
- Index update → invalidate affected entries
- Model change → full cache clear
- Time-based: per-entry TTL
- LRU eviction for memory limits

## Index Maintenance

### Re-indexing Schedule
```
Full re-index: Weekly (off-peak)
Incremental update: Real-time (new documents)
Optimization: Daily (merge segments, rebuild IVF)
```

### Monitoring
| Metric | Warning | Critical |
|--------|---------|----------|
| Index size | >80% budget | >95% budget |
| Query latency P95 | >200ms | >500ms |
| Recall@10 | <0.90 | <0.80 |
| Index freshness | >1hr stale | >4hr stale |

## Hybrid Search Tuning

### Alpha Tuning
```python
def tune_alpha(validation_set, alpha_range=[0.0, 0.25, 0.5, 0.75, 1.0]):
    best_alpha = 0.5
    best_score = 0
    for alpha in alpha_range:
        score = evaluate_hybrid(validation_set, alpha)
        if score > best_score:
            best_score = score
            best_alpha = alpha
    return best_alpha
```

### Query-Dependent Alpha
- Factual/keyword queries → higher BM25 weight (α=0.3)
- Semantic/conceptual queries → higher dense weight (α=0.7)
- Classify query type → use appropriate α

## Re-Ranking Optimization

### Candidate Count
```
Retrieve 100 candidates → Re-rank top-20 → Final top-5
vs
Retrieve 20 candidates → Final top-5 (no re-ranking)

Trade-off: 10% accuracy gain vs 200ms latency increase
```

### Early Termination
- Stop re-ranking when score drops below threshold
- Skip re-ranking for simple factual queries
- Re-rank only when confidence < 0.9
