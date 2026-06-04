# Vector Databases Advanced Topics

## Hybrid Search (Dense + Sparse)

### What Hybrid Search Solves
Pure vector search fails on exact keyword matches, rare terms, and out-of-domain queries. Hybrid search combines:
- **Dense retrieval** (vector embeddings) — semantic similarity
- **Sparse retrieval** (BM25, SPLADE, inverted index) — lexical/keyword matching

### Scoring Strategies

#### Reciprocal Rank Fusion (RRF)
```
score(d) = 1 / (k + rank_dense(d)) + 1 / (k + rank_sparse(d))
```
- k=60 is the standard constant
- No score normalization needed — works on ranks alone
- Simple, effective, widely adopted

#### Weighted Sum
```
score(d) = α × dense_score(d) + (1-α) × sparse_score(d)
```
- α requires tuning per domain (0.3-0.7 typical)
- Requires normalized scores (min-max or softmax)
- More flexible than RRF but needs calibration

#### Learned Fusion
- Train a cross-encoder reranker on top of hybrid results
- Highest quality but adds latency (model inference)
- Often applied as a second-stage reranker (retrieve 100, rerank top 10)

### Database Support

| DB | Hybrid Method | BM25 Built-in | RRF Support |
|----|--------------|---------------|-------------|
| Weaviate | Dense + BM25 | Yes | Yes (v1.24+) |
| Qdrant | Dense + Sparse (SPLADE) | No | Yes |
| Milvus | Dense + BM25 | Yes | Yes (v2.4+) |
| Pinecone | Dense only (no hybrid) | No | No |
| Elasticsearch | Dense + BM25 (kNN plugin) | Yes | Custom |
| pgvector | Requires external BM25 | No | Custom |

## Multi-Tenancy Patterns

### Collection per Tenant
```
/collections/tenant_a
/collections/tenant_b
/collections/tenant_c
```
- **Pros**: full isolation, independent index config, easy backup per tenant
- **Cons**: management overhead with many tenants, resource fragmentation
- **Best for**: <100 tenants, varying index configs per tenant

### Shared Collection with Filter
Each vector tagged with `tenant_id`. Every query filters by tenant.
```python
results = client.search(
    vector=query,
    filter={"tenant_id": {"$eq": "tenant_a"}},
    top_k=10,
)
```
- **Pros**: single collection, efficient resource use, easy to manage
- **Cons**: filter overhead grows with tenant count, no per-tenant indexing
- **Best for**: 100-100K tenants, uniform index needs

### Namespace/Partition Isolation
Pinecone namespaces, Qdrant partition-by, Milvus partition key.
```
Index: /products
  Namespace: tenant_a  (isolated index segment)
  Namespace: tenant_b
  Namespace: tenant_c
```
- **Pros**: physical isolation within shared infrastructure, per-tenant config
- **Cons**: namespace count limits (vendor-specific)
- **Best for**: 10-1000 tenants, medium scale

### Shard per Tenant
Each tenant maps to a dedicated shard or shard group.
- **Pros**: strong isolation, predictable performance
- **Cons**: complex rebalancing, hot tenants cause skew
- **Best for**: large tenants (>1M vectors each), enterprise SaaS

## Advanced Filtering Techniques

### Bitmap Indexes for Low-Cardinality Filters
```sql
CREATE BITMAP INDEX idx_status ON vectors(status);
-- Query planner uses bitmap AND/OR for multi-filter queries
```
- Pre-compute bitmaps per filter value
- O(1) lookup per filter value
- Combine multiple filters with bitwise AND/OR
- Best for: categorical fields with <1000 distinct values

### Filter-Aware Search (Qdrant, Milvus)
Modern vector DBs optimize filtered search by:
1. Building separate indexes for high-cardinality filter fields
2. Using filter selectivity to choose pre-filter vs post-filter at query time
3. Applying "oversampling" — retrieve more candidates than K to fill after filtering

### Geo-Spatial Filtering
```python
# Qdrant geo-filter
filter=Filter(
    must=[
        FieldCondition(
            key="location",
            geo_radius=GeoRadius(
                center=GeoPoint(lat=37.77, lon=-122.42),
                radius=5000  # meters
            )
        )
    ]
)
```

### Date Range + Recency Boosting
```python
results = client.search(
    vector=query,
    top_k=100,
    filter={"published_at": {"$gte": "2024-01-01"}},
)

# Recency boost: multiply score by recency factor
boosted = [
    {**r, "score": r.score * recency_factor(r.metadata["published_at"])}
    for r in results
]
boosted.sort(key=lambda x: x["score"], reverse=True)
```

## Performance Tuning

### Query Optimization

| Issue | Fix |
|-------|-----|
| High P99 latency | Reduce efSearch/nprobe, add replicas |
| Low recall | Increase efSearch/nprobe, rebuild with higher efConstruction |
| Index build too slow | Increase parallelism, reduce efConstruction, batch inserts |
| Memory too high | Switch IVF from HNSW, enable PQ compression, reduce M |
| Filtered search slow | Add bitmap index on filter fields, use pre-filter |
| Skewed shards | Rebalance, adjust hash/partition strategy |
| Write contention | Batch inserts, increase shard count, async indexing |

### Batch Sizing for Ingestion
```
100 vectors/batch:  fast, low memory
1000 vectors/batch: balanced (recommended)
10000 vectors/batch: high throughput, may timeout
```
- Match batch size to DB's max payload limit
- Use async/multithreaded ingestion for throughput
- Monitor index build queue — don't overload

### Connection Pooling
```python
# Bad: new connection per request
client = Client(host="...")

# Good: connection pool
pool = ConnectionPool(
    min_size=5,
    max_size=20,
    host="...",
)
```

## Cross-Modal and Multi-Vector Search

### ColBERT-Style Late Interaction
Store multiple vectors per document (one per token). Search matches query tokens against document tokens.
- Higher quality than single-vector for detailed matching
- Higher storage cost (N vectors per document)
- Supported by Qdrant, Milvus (via multi-vector capability)

### Multi-Modal Embeddings
Unified embedding space for text + images + audio (CLIP, ImageBind).
```python
# Same model, same dimension for all modalities
text_vector = model.encode("a red car")
image_vector = model.encode(image)
audio_vector = model.encode(audio)

# Search across all modalities in one index
results = index.search(text_vector, top_k=10)
# Returns relevant text, images, and audio
```

## Graph-Based Index Deep Dive

### HNSW Variants

#### HNSW with Dynamic Pruning
Remove low-quality edges during construction to keep graph sparse while maintaining recall. Reduces memory by 10-30%.

#### HNSW with Multi-Quantization
Store compressed vectors (PQ) for distance estimation during search, full-precision only for refinement. Reduces memory by 60-80% at <1% recall loss.

#### Freshness-Aware HNSW
Prioritize recently inserted vectors in graph edges for time-sensitive applications (news, social feeds). New vectors get more connections initially, decay over time.

### DiskANN vs HNSW at Scale

| | HNSW (in-memory) | DiskANN (SSD) |
|---|---|---|
| Max dataset | ~50M (1TB RAM) | 1B+ (on SSD) |
| P99 latency (1B) | N/A (won't fit) | ~10ms |
| Build time (1B) | N/A | ~20 hours |
| RAM per 1M vectors | ~1.5 GB | ~15 MB |
| Recall@10 | 0.99 | 0.97 |

### SCANN (Scores Composition of Approximate Nearest Neighbors)
Google's production index — asymmetric distance computation (ADC) with PQ.
- Fastest search at high recall for billion-scale
- Requires specialized SIMD/AVX512 instructions
- Build time: hours to days
- Used in: Google Search, YouTube recommendations

## Real-Time vs Batch Indexing

### Real-Time Indexing
Vectors available for search immediately after insert.
- **Trade-off**: higher write latency, potential search quality degradation during build
- **HNSW**: supports inline insertion (graph updated incrementally)
- **IVF**: centroid reassignment needed periodically
- **Best for**: dynamic data, user-generated content, streaming apps

### Batch Indexing
Build/rebuild index periodically from a static dataset.
- **Trade-off**: data freshness lag, but optimal index quality
- **Best for**: nightly rebuilds, curated datasets, stable catalogs
- **Strategy**: build new index while old one serves traffic → swap

### Hybrid Approach
```python
class HybridIndexManager:
    def __init__(self):
        self.main_index = self._load_production_index()
        self.buffer = []  # recent inserts

    def search(self, query, k=10):
        main_results = self.main_index.search(query, k=k)
        buffer_results = self._bruteforce_search(query, self.buffer, k=k)
        return merge_and_rerank(main_results, buffer_results)

    def insert(self, vector_id, vector, metadata):
        self.buffer.append({"id": vector_id, "vector": vector, "metadata": metadata})
        if len(self.buffer) > 10000:
            self._merge_buffer_into_main()

    def rebuild(self, full_dataset):
        new_index = build_index(full_dataset)
        old_index = self.main_index
        self.main_index = new_index
        # old_index can be retired after in-flight queries drain
```

## Consistency Models

### Eventual Consistency
- Writes are propagated asynchronously
- Best search throughput (no sync overhead)
- Stale reads possible (seconds-minutes lag)
- Default in: most vector DBs for search

### Strong Consistency
- Read your own writes immediately
- Higher latency, lower throughput
- Required for: critical updates, compliance-sensitive data
- Supported by: Milvus (configurable), Qdrant (per-request `consistency` param)

### Read-Your-Writes
```python
# Qdrant: per-request consistency
client.search(
    collection="products",
    vector=query,
    consistency=ConsistencyType.ReadYourWrites,
)
```

### Causal Consistency
Readers see writes in causal order. Good balance of performance and correctness for collaborative/multi-user scenarios.

## Disaster Recovery & High Availability

### Multi-Region Deployment

```
Region A (primary)          Region B (replica)
┌────────────────────┐      ┌────────────────────┐
│  Vector DB Cluster  │ ──→  │  Vector DB Cluster  │
│  Writes + Reads     │ async│  Reads only         │
│  Index snapshots    │ sync │  Warm standby       │
└────────────────────┘      └────────────────────┘
```

- Cross-region async replication for DR
- Active-passive: primary handles writes, replica serves reads during failover
- Active-active: both regions accept writes (conflict resolution needed)
- RTO: 5-15 min (failover detection + DNS propagation)
- RPO: 1-60 min (async replication lag)

### Backup Strategies

| Strategy | RPO | RTO | Overhead |
|----------|-----|-----|----------|
| Full snapshot (daily) | 24h | 1h/10M vectors | High |
| Incremental (hourly) | 1h | 1h + 15min/day | Medium |
| WAL streaming | <1s | 30min | Low |
| Multi-region async | 1-60min | 5-15min | Medium |

## Vector Compression Techniques

### Scalar Quantization (SQ)
Convert float32 to int8:
```
Original: [0.12, -0.45, 0.78, ...]  →  4 bytes per dim
SQ8:      [15,   3,    25,   ...]  →  1 byte per dim
``` 
Memory: 4× reduction. Recall loss: 1-3%.
Most databases support SQ8 natively.

### Product Quantization (PQ)
Split vector into M sub-vectors, quantize each to a centroid.
- Compression: 8:1 to 32:1
- Recall loss: 5-15%
- Asymmetric distance computation (ADC) for search speed

### Binary Quantization (BQ)
```
Original: [0.12, -0.45, 0.78, ...]
Binary:   [1,    0,     1,    ...]  → 1 bit per dim
```
- 32× compression
- Recall loss: 15-30%
- Hamming distance search
- Best for: very large scale, coarse pre-filtering

### Mixed Precision
Use full-precision for high-importance vectors (recent, popular), compressed for older/cold vectors. Tiered quantization by access frequency.

## Advanced Observability

### End-to-End Search Quality Monitoring

```python
class SearchQualityMonitor:
    def __init__(self, exact_index, ann_index):
        self.exact = exact_index  # ground truth (small subset)
        self.ann = ann_index

    def evaluate_recall(self, queries, k=10):
        total_recall = 0
        for query in queries:
            exact_results = self.exact.search(query, k=k)
            ann_results = self.ann.search(query, k=k)
            exact_ids = {r["id"] for r in exact_results}
            ann_ids = {r["id"] for r in ann_results}
            total_recall += len(exact_ids & ann_ids) / k
        return total_recall / len(queries)

    def monitor_drift(self):
        # Track score distribution shift over time
        # Alert on sudden drops in average score
        pass

    def track_filter_effectiveness(self):
        # Track what % of queries use filters
        # Track filter selectivity per field
        pass
```

### Golden Query Set
Curate a set of representative queries with known expected results. Run after every deployment. Alert on recall regression:
```python
GOLDEN_QUERIES = [
    ("machine learning tutorial", {"expected": ["doc_1", "doc_5"], "recall": 1.0}),
    ("python async patterns", {"expected": ["doc_3"], "recall": 1.0}),
]
```

## Data Expiration and Lifecycle

### TTL-Based Eviction
```python
# Qdrant: set TTL per point
client.upsert(
    collection="sessions",
    points=[
        PointStruct(id="sess_1", vector=[...], payload={"ttl": 3600})
    ]
)
# Points with expired TTL are automatically removed
```

### Staleness-Based Re-Embedding
Detect when source data changes and re-embed only affected vectors.
```python
class ReEmbedScheduler:
    def __init__(self, source_db, vector_db, embedder):
        self.source = source_db
        self.vector_db = vector_db
        self.embedder = embedder
        self.watchlist = set()

    def on_source_change(self, doc_id):
        self.watchlist.add(doc_id)

    async def batch_reembed(self):
        for doc_id in self.watchlist:
            doc = await self.source.fetch(doc_id)
            new_vector = self.embedder(doc.content)
            await self.vector_db.update(doc_id, vector=new_vector)
        self.watchlist.clear()
```

## When NOT to Use a Vector Database

- **Exact keyword search**: Elasticsearch, PostgreSQL full-text search
- **Small datasets (<1K)**: in-memory brute force is faster and simpler
- **Graph relationships**: Neo4j, ArangoDB (proper graph DB needed)
- **Aggregation/analytics**: ClickHouse, Druid (columnar OLAP)
- **Simple k-NN on numeric data**: scikit-learn, FAISS (lighter)
- **Real-time feature store**: Redis, Cassandra (higher throughput, lower latency)

The best search system often combines vector DB with a traditional search engine (Elasticsearch, Solr) for hybrid retrieval.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
