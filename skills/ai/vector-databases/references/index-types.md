# Vector Index Types

## Index Comparison

| Index | Recall@10 | Build Speed | Search Speed | Memory | Dataset Scale |
|-------|-----------|-------------|--------------|--------|---------------|
| Flat (brute) | 1.0 | None | O(N) | High | <10k |
| HNSW | 0.99 | Medium | O(log N) | High | <10M |
| IVF | 0.95 | Fast | O(log N) | Medium | <100M |
| DiskANN | 0.97 | Slow | O(log N) | Low | 1B+ |
| PQ (Product Quantization) | 0.85 | Slow | Fast | Very Low | 1B+ |

## HNSW (Hierarchical Navigable Small World)

### How It Works
Multi-layer graph where upper layers are sparse with long-range edges, lower layers are dense with short-range edges. Search starts at the top layer and descends, narrowing the candidate set at each level.

### Parameters

#### M (max connections per node)
Controls graph density. Higher M = more connected graph = higher recall, more memory.
- Default: 16
- Range: 8-64
- Tuning: double M to increase recall by ~1%, memory by ~50%.
- Rule: M = 2 × sqrt(dim) is a good starting point.

#### efConstruction (build-time search width)
Controls how many candidates are evaluated during graph construction. Higher = better quality, slower build.
- Default: 200
- Range: 100-500
- Tuning: efConstruction = 2 × M × log(N) for large datasets.
- Build time scales linearly with efConstruction.

#### efSearch (query-time search width)
Controls how many candidates are evaluated during search. Trade-off between recall and latency.
- Default: query-time configurable (not fixed at build time).
- Range: 50-1000.
- Tuning: double efSearch = ~2x latency, ~2-5% recall gain.

### Configuration Examples

```yaml
# Balanced: general purpose
hnsw:
  M: 16
  efConstruction: 200
  efSearch: 256  # query-time

# High recall (recall > 0.99)
hnsw:
  M: 32
  efConstruction: 400
  efSearch: 512

# Low latency (P99 < 10ms)
hnsw:
  M: 8
  efConstruction: 100
  efSearch: 64
```

### Memory Usage
```
Memory = 1.5 × N × dim × 4 (float32) + N × M × 2 × 12 (graph overhead)
```
Example: 1M vectors, 768 dim, M=16 ≈ 6GB.

### When to Use
- Default index for most vector databases.
- <10M vectors, recall target >0.95.
- Balanced requirements for speed and accuracy.

## IVF (Inverted File Index)

### How It Works
K-means clustering of the vector space. Each cluster (Voronoi cell) has a centroid. Search only visits the nearest N clusters.

### Parameters

#### nlist (number of clusters)
Controls granularity of the partition. More clusters = smaller cells = faster search, lower recall.
- Default: sqrt(N) where N is dataset size.
- Range: 100-100000.
- Rule: nlist = 4 × sqrt(N) for balanced performance.

#### nprobe (number of cells to search)
How many nearest clusters are visited during search. Higher = better recall, slower.
- Default: 10.
- Range: 1-100.
- Tuning: nprobe = sqrt(nlist) for balanced recall/latency.

### Configuration Examples

```yaml
# Balanced
ivf:
  nlist: 4096
  nprobe: 64

# High recall
ivf:
  nlist: 1000
  nprobe: 100

# Fast search
ivf:
  nlist: 100000
  nprobe: 10
```

### Memory Usage
```
Memory = N × dim × 4 (float32) + nlist × dim × 4 (centroids)
```
About 40-60% less memory than HNSW. No graph overhead.

### When to Use
- >10M vectors where memory is constrained.
- Recall target >0.9 is sufficient.
- Build speed matters (IVF is faster to build than HNSW).

## DiskANN

### How It Works
SSD-based index that uses a Vamana graph (similar to HNSW but optimized for disk). Graph and vectors are memory-mapped from disk.

### Parameters

#### beamwidth
Controls BFS width during graph construction.
- Default: 4
- Range: 2-16
- Higher = better quality, more memory.

#### search_list_size (L)
Size of candidate list during search. Analogous to efSearch in HNSW.
- Default: 128
- Range: 64-512

#### pq_dist_budget
Number of PQ distances to compute per query.
- Default: 0 (compute all)
- Higher = faster, less accurate.

### Memory Usage
```
RAM: ~1-2 GB for graph metadata (1B vectors).
SSD: N × dim × 0.25 (compressed) + graph overhead.
```

### When to Use
- Billion-scale datasets (100M-1B+ vectors).
- Dataset does not fit in RAM.
- Recall target >0.95 acceptable at higher latency.

## Product Quantization (PQ)

### How It Works
Compresses vectors by splitting into sub-vectors and quantizing each to a codebook. M sub-vectors, each quantized to a byte.

### Parameters

#### M (number of sub-vectors)
Controls compression ratio. Higher M = more compression, lower recall.
- Default: dim / 8
- Range: 4-64
- 8 bytes per sub-vector, so total compressed size = M bytes.

#### nbits (bits per codebook entry)
Controls granularity of quantization.
- Default: 8 (256 centroids per sub-vector)
- Range: 4-8

### Compression Ratios
| dim | M | Compressed Size | Compression |
|-----|---|----------------|-------------|
| 768 | 96 | 96 bytes | 8:1 |
| 768 | 48 | 48 bytes | 16:1 |
| 1536 | 192 | 192 bytes | 8:1 |

### When to Use
- Extreme memory constraints.
- Combined with IVF (IVF+PQ) for large-scale approximate search.
- When recall >0.9 is acceptable with aggressive compression.

## Distance Metrics

### Cosine Similarity
```
d = 1 - (A · B) / (|A| × |B|)
```
Range: [0, 2]. 0 = identical direction, 2 = opposite direction.
Use when: embedding model outputs normalized vectors. Default for text embeddings.
Normalize vectors first if the index doesn't support cosine natively (use inner product on normalized vectors).

### Euclidean Distance (L2)
```
d = sqrt(Σ (A_i - B_i)^2)
```
Range: [0, ∞). 0 = identical.
Use when: embedding model outputs unnormalized vectors, spatial data.
Sensitive to vector scale — normalize if scale is arbitrary.

### Dot Product (IP)
```
d = A · B = Σ A_i × B_i
```
Range: (-∞, ∞). Higher = more similar.
Use when: embedding model trained with inner product loss (Cohere, some recommendation models).
On normalized vectors, equivalent to cosine similarity.

### Metric Selection Rule
Always use the distance metric that matches the embedding model's training objective. If unsure:
- OpenAI embeddings: cosine.
- Cohere embeddings: dot product (IP).
- Sentence Transformers: cosine.
- BGE embeddings: cosine.
- Custom embeddings: check the training loss function.

## Index Selection Flowchart

```
Dataset size?
├── <10k → Flat (brute force, 100% recall)
├── 10k-10M → HNSW (best speed/recall trade-off)
├── 10M-100M → IVF (memory-efficient)
│   └── Need >0.95 recall? → HNSW (with sufficient RAM)
└── >100M → DiskANN (SSD-backed)
    └── Memory constrained? → IVF + PQ

Recall target?
├── >0.99 → HNSW (M=32, efConstruction=400)
├── >0.95 → HNSW (M=16, efConstruction=200)
└── >0.90 → IVF (nlist=sqrt(N), nprobe=64)

Latency budget (P99)?
├── <10ms → HNSW (M=8, efSearch=64) or IVF with high nlist
├── <50ms → HNSW (M=16, efSearch=256)
└── <200ms → HNSW (M=32, efSearch=512) or DiskANN
```

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
