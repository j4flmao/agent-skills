# Indexing Strategies

## Index Selection by Scale

| Scale | Index Type | Memory | Build Time | Recall |
|-------|-----------|--------|------------|--------|
| <10K | Flat (brute force) | Low | None | 1.0 |
| 10K-1M | HNSW | High | Medium | 0.99 |
| 1M-10M | IVF with HNSW | Medium | Medium | 0.97 |
| 10M-100M | IVF with PQ | Low | High | 0.93 |
| >100M | DiskANN | Very Low | Very High | 0.92 |

## Multi-Stage Indexing

### Two-Tier Approach
```
Hot (frequent queries): HNSW index, high recall, in-memory
  → 20% of data, 80% of queries
Cold (rare queries): IVF+PQ index, memory efficient
  → 80% of data, 20% of queries
```

### Implementation
```python
class MultiTierIndex:
    def __init__(self, hot_threshold=0.2):
        self.hot_index = HNSWIndex()
        self.cold_index = IVFPQIndex()
        self.hot_threshold = hot_threshold

    def add(self, vectors, docs, query_frequencies):
        sorted_pairs = sorted(zip(vectors, docs, query_frequencies),
                              key=lambda x: x[2], reverse=True)
        split = int(len(sorted_pairs) * self.hot_threshold)
        hot_data = sorted_pairs[:split]
        cold_data = sorted_pairs[split:]
        self.hot_index.add([d[0] for d in hot_data], [d[1] for d in hot_data])
        self.cold_index.add([d[0] for d in cold_data], [d[1] for d in cold_data])

    def search(self, query, k=10):
        hot_results = self.hot_index.search(query, k=k // 2)
        cold_results = self.cold_index.search(query, k=k // 2)
        return merge_and_rerank(hot_results, cold_results)
```

## Filter-Aware Indexing

### Pre-Filtering Strategy
- Filter metadata BEFORE vector search
- Requires index per unique filter combination (for speed)
- Use bitmap indexing for low-cardinality filters

### Post-Filtering Strategy
- Vector search first, filter results after
- Acceptable when filter is highly selective (>90% reduction)
- Risk: top-K results may all fail filter

### Hybrid Strategy
```python
def filtered_search(query, filters, k=10):
    # 1. Broad vector search (2x desired K)
    candidates = vector_index.search(query, k=k * 2)
    
    # 2. Apply filters
    filtered = [c for c in candidates if matches_filters(c, filters)]
    
    # 3. Fall back if not enough results
    if len(filtered) < k:
        candidates2 = vector_index.search(query, k=k * 10)
        filtered = [c for c in candidates2 if matches_filters(c, filters)]
    
    return filtered[:k]
```

## Partitioned Indexing

### By Tenant
```python
class TenantAwareIndex:
    def __init__(self):
        self.indices = {}  # tenant_id → index

    def search(self, tenant_id, query, k=10):
        if tenant_id not in self.indices:
            return []
        return self.indices[tenant_id].search(query, k=k)
```

### By Category
```
Index categories:
  /products: product descriptions and specs
  /docs: technical documentation
  /support: customer support articles
  /code: code snippets and examples
  
Route queries to relevant index based on intent classification.
```

## Incremental Indexing

### Online Updates
- HNSW and IVF support vector additions without full rebuild
- Delete as tombstone (not physical deletion)
- Periodic optimization for space reclamation

### Batch Refresh
```python
def refresh_index(full_dataset, incremental_updates):
    if incremental_updates.count > full_dataset.count * 0.2:
        # Threshold exceeded → full rebuild
        return rebuild_full(full_dataset)
    else:
        # Apply incremental updates
        return apply_updates(incremental_updates)
```

## Monitoring Index Health

### Key Metrics
- Query latency: P50/P95/P99
- Recall@K: against ground truth set
- Index size: % of memory budget
- Churn rate: vectors added/deleted per day
- Build/optimization time

### Alert Thresholds
```
Recall@10 < 0.95: Review index configuration
Query P95 > 100ms: Consider index optimization
Memory > 80%: Scale up or reduce dimension
Churn > 10%/day: Consider incremental indexing
Build time > 4hrs: Schedule during maintenance window
```
