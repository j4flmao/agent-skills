# Vector Indexing

## Index Types Comparison

| Index | Build Time | Search Speed | Memory | Recall@10 | Best For |
|-------|-----------|-------------|--------|-----------|----------|
| Flat (Brute Force) | None | O(N) | High | 1.0 | <10K vectors, exact search |
| IVF | Fast | O(log N) | Medium | 0.92-0.98 | >100K vectors, good recall |
| HNSW | Slow | O(log N) | High | 0.98-0.99 | <10M vectors, high recall |
| DiskANN | Very Slow | Medium | Low | 0.95-0.97 | >10M vectors, limited RAM |
| PQ (Product Quantization) | Medium | Fast | Very Low | 0.80-0.90 | >100M, memory constrained |

## HNSW (Hierarchical Navigable Small World)

### Parameters
```
M (connections per layer): 16-64
  Higher = better recall, more memory, slower build
  Default: 16

ef_construction (build quality): 100-500
  Higher = better recall, slower build
  Default: 200

ef_search (search breadth): 50-500
  Higher = better recall, slower search
  Default: 100
```

### FAISS Implementation
```python
import faiss
import numpy as np

dimension = 768
index = faiss.IndexHNSWFlat(dimension, M=32)
index.hnsw.efConstruction = 200

# Normalize for cosine similarity
embeddings = np.random.rand(100000, dimension).astype(np.float32)
faiss.normalize_L2(embeddings)
index.add(embeddings)

# Search
index.hnsw.efSearch = 100
query = np.random.rand(1, dimension).astype(np.float32)
faiss.normalize_L2(query)
distances, indices = index.search(query, k=10)
```

### Memory Calculation
```
Memory ≈ dimension × 4 bytes × (1 + M × 2) × num_vectors
Example: 768d, M=32, 1M vectors
  = 768 × 4 × 65 × 1,000,000 ≈ 200 GB
```

## IVF (Inverted File Index)

### Parameters
```
nlist (clusters): sqrt(N) to 4×sqrt(N)
  Example: N=1M → nlist=1000-4000

nprobe (clusters to search): 10-100
  Higher = better recall, slower search
```

### Implementation
```python
nlist = int(4 * np.sqrt(len(embeddings)))
quantizer = faiss.IndexFlatIP(dimension)
index = faiss.IndexIVFFlat(quantizer, dimension, nlist, faiss.METRIC_INNER_PRODUCT)
index.train(embeddings)
index.add(embeddings)
index.nprobe = 20
```

## Product Quantization (PQ)

### Memory Reduction
```
Original: dimension × 4 bytes per vector
PQ: M × code_size bytes per vector

Example: 768d → PQ with M=96, code_size=8
  Original: 3072 bytes per vector
  PQ: 96 bytes per vector (32x reduction)
```

### IndexIVFPQ
```python
m = dimension // 8  # sub-quantizers
index = faiss.IndexIVFPQ(quantizer, dimension, nlist, m, 8)
index.train(embeddings)
index.add(embeddings)
index.nprobe = 20
```

## DiskANN (Disk-Based)

### When to Use
- Index does not fit in RAM
- Billion-scale vector search
- Lower recall (90-95%) acceptable

### Configuration
- Build on machine with sufficient RAM
- Store index on SSD (NVMe preferred)
- Use Vamana graph algorithm
- Trade memory for I/O bandwidth

## Multi-Tenant Indexing

### Partitioned Index
```python
class TenantIndex:
    def __init__(self):
        self.tenant_indices = {}

    def add_vectors(self, tenant_id, vectors):
        if tenant_id not in self.tenant_indices:
            dim = vectors.shape[1]
            self.tenant_indices[tenant_id] = faiss.IndexHNSWFlat(dim, 32)
        self.tenant_indices[tenant_id].add(vectors)

    def search(self, tenant_id, query, k=10):
        if tenant_id not in self.tenant_indices:
            return []
        return self.tenant_indices[tenant_id].search(query, k)
```

### Filtered Search (Metadata Pre-filter)
Use metadata filtering before vector search for shared indices with tenant column.

## Index Maintenance

### Operations
```
Add vectors: Online for HNSW/IVF, batch rebuild for PQ
Delete vectors: Not supported by most index types (use tombstone)
Update vectors: Delete + re-add
Rebuild: Required after 20% churn or monthly
```

### Monitoring
- Index size vs memory budget
- Query latency P50/P95
- Recall against ground truth (sampled daily)
- Build time and success rate
