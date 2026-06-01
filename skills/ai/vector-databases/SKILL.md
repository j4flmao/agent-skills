---
name: ai-vector-databases
description: >
  Use this skill when deploying or managing vector databases: index type selection (HNSW, IVF, DiskANN, SCANN), distance metrics, sharding/replication, hybrid search, metadata filtering, ANN search, production operations, cost optimization, evaluation benchmarking.
  This skill enforces: index configuration documentation, distance metric justification, scaling plan specification, operations checklist, recall evaluation, cost analysis.
  Do NOT use for: RAG pipeline design, embedding model selection, prompt engineering, general-purpose databases.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, vector-database, phase-10, production]
---

# Vector Database Agent

## Purpose
Designs, deploys, and operates vector database systems with optimal index configuration, scaling strategy, cost-efficient production architecture, and rigorous evaluation. Covers the full lifecycle: selection → configuration → deployment → monitoring → optimization.

## Agent Protocol

### Trigger
User request includes: vector database, Pinecone, Chroma, Qdrant, Milvus, Weaviate, pgvector, FAISS, LanceDB, embedding index, ANN search, HNSW, IVF, IVF+PQ, DiskANN, SCANN, distance metric, hybrid search, metadata filter, vector quantization, recall evaluation, vector scaling, ANN benchmark.

### Protocol
1. Clarify vector dimension, dataset size, write/read ratio, latency requirements, recall target, budget, deployment model.
2. Select index type based on recall-latency trade-off, dataset scale, memory budget, and query pattern.
3. Configure distance metric aligned with embedding model training objective.
4. Design sharding and replication strategy for scale, HA, and cost.
5. Configure hybrid search if combining vector + metadata filtering.
6. Choose deployment model: managed (Pinecone, Qdrant Cloud) vs self-hosted (Milvus, Qdrant) vs embedded (Chroma) vs library (FAISS).
7. Evaluate recall, latency, throughput against requirements.
8. Document operations checklist: backup, monitoring, scaling, migration, cost tracking.

## Output
Vector DB schema with index config, scaling plan, cost estimate, evaluation results, operations checklist.

### Response Format
```
## Vector Database Configuration
### Schema
Collection: {name} | Dimensions: {N}
Distance Metric: {cosine/euclidean/dot}
Metadata: {field:type, ...}

### Index
Type: {HNSW/IVF/IVF+PQ/DiskANN}
Parameters:
  HNSW: M={N}, efConstruction={N}, efSearch={N}
  IVF: nlist={N}, nprobe={N}
  PQ: M_subvectors={N}, nbits={N}
  DiskANN: beamwidth={N}, search_list_size={N}

### Scaling
Shards: {N} | Replicas: {N}
Partition Key: {field}
Nodes: {count × instance type}
Estimated RAM: {N GB}

### Hybrid Search
Filter Strategy: {post-filter / pre-filter / adaptive}
Metadata Index: {fields with indexes}
Oversampling Factor: {N}x

### Evaluation
Expected Recall@10: {0.XX}
P50/P99 Latency: {Nms / Nms}
Estimated QPS: {N}
Index Build Time: {N} minutes

### Cost (Monthly)
Compute: ${N}
Storage: ${N}
Total: ${N}

### Operations
Backup: {frequency, method}
Monitoring: {metrics, alerts}
Scaling Trigger: {CPU > 80%, latency > P99 target}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Index type selected and parameters configured for dataset and recall target.
- [ ] Distance metric matches embedding model training criteria.
- [ ] Sharding strategy distributes data evenly across nodes.
- [ ] Replication factor ensures availability during node failure.
- [ ] Hybrid search configured with metadata index and filter strategy.
- [ ] Operational runbooks for backup, resize, and recovery documented.
- [ ] Cost estimate provided with monthly projection.
- [ ] Evaluation expected: recall, latency, throughput.

## Decision Trees

### Vector Database Selection

```
Deployment preference?
├── Zero ops, managed
│   ├── <1M vectors, prototyping → Chroma (local dev) → Pinecone (prod)
│   ├── 1M-100M, simple search → Pinecone (simplest API)
│   ├── Need hybrid search (dense+sparse) → Weaviate Cloud or Qdrant Cloud
│   └── >100M, enterprise → Qdrant Cloud or Milvus Cloud
├── Self-hosted
│   ├── <1M vectors, simple → pgvector (PostgreSQL extension)
│   ├── 1M-10M, general → Qdrant (fast, Rust, easy ops)
│   ├── 10M-100M, advanced → Milvus (most features, Kubernetes-native)
│   ├── >100M, billion-scale → Milvus or custom FAISS cluster
│   └── Edge/local, offline → Chroma (SQLite-based, portable)
└── Library (no server)
    ├── Maximum speed, single-node → FAISS (C++ with Python bindings)
    ├── Graph-based, research → HNSWlib
    └── GPU-accelerated → RAFT (cuVS)
```

### Index Type Selection

```
Dataset size?
├── <10K → Flat (brute-force, 100% recall, no index)
├── 10K-10M
│   ├── Memory not constrained → HNSW (best speed/recall)
│   └── Memory constrained → IVF (40-60% less RAM)
├── 10M-100M
│   ├── Recall target >0.95 → HNSW (needs sufficient RAM)
│   ├── Recall target 0.90-0.95 → IVF (nlist=sqrt(N))
│   └── Recall target 0.85-0.90 → IVF+PQ (aggressive compression)
└── >100M (1B+)
    ├── RAM budget <10 GB → DiskANN (SSD-backed)
    ├── RAM budget moderate → IVF+PQ
    ├── Need fastest search → HNSW (only if RAM available)
    └── Google-scale, SIMD → SCANN (ADC with PQ)

Memory budget per 1M 768-dim vectors:
  HNSW (M=16): ~6 GB (vectors + graph)
  IVF (nlist=4096): ~3.2 GB (vectors + centroids)
  IVF+PQ (M=96): ~0.4 GB (compressed vectors)
  DiskANN: ~0.02 GB (graph metadata, vectors on SSD)
```

### Latency Budget Decision

```
P99 latency requirement?
├── <5ms → HNSW (M=8, efSearch=64) or IVF+Flat (high nlist)
├── <10ms → HNSW (M=16, efSearch=128) or IVF (nprobe=32)
├── <50ms → HNSW (M=16, efSearch=256) or IVF (nprobe=64)
├── <100ms → HNSW (M=32, efSearch=512) or DiskANN
└── <500ms → DiskANN or brute-force with GPU
```

### Recall Target Decision

```
Recall@10 target?
├── 0.99+ → HNSW (M=32, efConstruction=400, efSearch=512) or Flat
├── 0.95-0.99 → HNSW (M=16, efConstruction=200, efSearch=256)
├── 0.90-0.95 → IVF (nlist=4×sqrt(N), nprobe=sqrt(nlist))
├── 0.85-0.90 → IVF+PQ (M=dim/16, nbits=8)
└── <0.85 → PQ or binary quantization (coarse search only)
```

### Filter Strategy Decision

```
Queries include metadata filters?
├── No filters → standard ANN search, no filter overhead
├── Filters remove <50% of data
│   ├── Simple filter fields → post-filter (search 2-5× K)
│   └── Complex multi-field filters → post-filter with oversampling
├── Filters remove 50-90% of data → pre-filter (requires metadata index)
└── Filters remove >90% of data → pre-filter (filter-first approach)
    ├── Cardinality <1000 → bitmap index on filter field
    └── High cardinality → B-tree or inverted index on filter field
```

## Architectural Patterns

### Hot-Warm-Cold Tiered Indexing

```
Layer     | Index Type  | Storage   | Query %  | Latency
Hot (20%) | HNSW        | RAM/SSD   | 80%      | <5ms
Warm (30%)| IVF+PQ      | SSD       | 15%      | 10-50ms
Cold (50%)| DiskANN     | HDD/Object| 5%       | <200ms
```

Most queries hit frequently accessed vectors. Separate tiers by access frequency.

### Partitioned Searching

```
Query → Partition Router → [Shard 1: tenants A-F]
                            [Shard 2: tenants G-L]
                            [Shard 3: tenants M-R]
                            [Shard 4: tenants S-Z]
                          → Merge top-K per shard → Final top-K
```

Partition by tenant, category, date range, or geographic region. Enables targeted search and data isolation.

### Streaming Ingestion Pipeline

```
Data Source → Embedding Service → Buffer Queue (Kafka/RabbitMQ)
                                  → Vector DB (batched upsert)
                                  → Index Optimizer (periodic compaction)
```

- Buffer decouples embedding speed from DB write speed
- Batch writes in 100-1000 vector chunks
- Periodic optimization for index health

### Cached ANN Pattern

```
Query → Cache (LRU, TTL-based)
         ├── Cache HIT → return cached results
         └── Cache MISS → ANN search → store in cache → return
```

Cache identical/near-identical queries. Effective for high-repeat-query workloads.

### Multi-Modal Index

```
Single index storing:
  text_vectors (from text encoder)
  image_vectors (from image encoder)
  audio_vectors (from audio encoder)

Search with any modality, retrieve all modalities.
```

Requires unified embedding space (CLIP, ImageBind, etc.).

## Production Architecture

### Node Roles

| Role | Responsibility | Scaling |
|------|---------------|---------|
| Router | Query routing, result merging | Stateless, add for throughput |
| Index Node | Stores index shard, serves queries | Stateful, add for capacity |
| Data Node | Manages raw vectors and metadata | Stateful, add for storage |
| Coordinator | Cluster management, DDL operations | Stateless, 1-3 for HA |
| Monitor | Metrics, alerts, auto-scaling decisions | Stateless, 1 node |

Milvus separates these roles. Qdrant and Weaviate combine them in homogeneous nodes.

### Sharding Topology

```
Collection → [Shard 0: vectors 0-1M]
              [Shard 1: vectors 1M-2M]
              [Shard 2: vectors 2M-3M]

Each shard → [Replica 0: primary]
              [Replica 1: secondary]
              [Replica 2: secondary]
```

### Shard Sizing Guidelines

```
Target: 500K - 5M vectors per shard
Max:    10M vectors per shard
Rebuild time at 10M vectors: 30-60 min
```

### Replication Strategy

```
Replication factor 2: survive 1 node failure
Replication factor 3: survive 2 node failures
Read replicas: add for QPS scaling without increasing shard count
```

### Monitoring Stack

```
Metrics Collector → Time-Series DB (Prometheus, VictoriaMetrics)
                  → Alert Manager (Alertmanager, PagerDuty)
                  → Dashboard (Grafana)

Key panels:
- Query latency P50/P95/P99/P99.9 (heatmap + timeseries)
- QPS by collection and node
- Recall rate (from golden query set)
- Memory/CPU/Disk per node
- Index build queue depth
- Replication lag
- Filter selectivity distribution
```

### Backup Architecture

```
Daily full snapshot → Object storage (S3/GCS/Azure Blob)
Hourly WAL archive → Object storage (near-real-time)
Monthly DR test → Restore to staging cluster, validate recall
```

## Comparative Analysis

### Feature Comparison

| Feature | Pinecone | Qdrant | Weaviate | Milvus | pgvector | Chroma |
|---------|----------|--------|----------|--------|----------|--------|
| Type | Managed | Self/Cloud | Self/Cloud | Self/Cloud | Extension | Embedded |
| Language | Proprietary | Rust | Go | Go/C++ | C | Python |
| Index types | HNSW | HNSW, IVF | HNSW, IVF | IVF, HNSW, PQ, DiskANN | HNSW, IVF | HNSW |
| Hybrid search | No | Yes (SPLADE) | Yes (BM25) | Yes (BM25) | No | No |
| Multi-tenancy | Namespaces | Collections | Classes | Partitions | Schema | Collections |
| Filtering | Pre-filter | Pre/post | Pre/post | Pre/post | SQL WHERE | Metadata |
| Consistency | Eventual | Configurable | Eventual | Configurable | Strong | Strong |
| GPU support | No | No | No | Yes | No | No |
| CRUD | Full | Full | Full | Full | Full | Basic |
| Cloud-native | Yes | Yes | Yes | Yes | N/A | No |
| Backup | Auto 7-day | Snapshot API | S3 module | milvus-backup | pg_dump | File copy |
| Max scale | 100M+ | 100M+ | 50M+ | 1B+ | 10M | 1M |

### Performance (1M vectors, 768-dim, HNSW)

| DB | P50 | P99 | Build | QPS (single node) |
|----|-----|-----|-------|-------------------|
| Pinecone | 15ms | 35ms | 5min | ~500 |
| Qdrant | 12ms | 28ms | 6min | ~800 |
| Weaviate | 25ms | 55ms | 8min | ~300 |
| Milvus | 18ms | 40ms | 10min | ~600 |
| Chroma | 15ms | N/A | 8min | ~100 |
| pgvector | 20ms | 60ms | 15min | ~200 |
| FAISS | 8ms | 20ms | 5min | N/A |

### Pricing (2026, 1M vectors/month)

| DB | Free Tier | Entry | Production | Cost/Month |
|----|-----------|-------|------------|------------|
| Pinecone | 100K vectors | $70/mo | $500+/mo | ~$150 |
| Qdrant Cloud | 1M vectors | $50/mo | $300+/mo | ~$80 |
| Weaviate Cloud | 500K vectors | $25/mo | $200+/mo | ~$100 |
| Milvus Cloud | N/A | $100/mo | $500+/mo | ~$150 |
| pgvector (RDS) | N/A | $15/mo | $100+/mo | ~$50 |
| Chroma | Unlimited | Free | Free (self-host) | $0 |

### When to Choose Each

| Database | Best For | Avoid If |
|----------|----------|----------|
| **Pinecone** | Zero-ops, quick prototyping, managed simplicity | Need hybrid search, tight budget, data residency |
| **Qdrant** | Fast filtered search, Rust performance, self-hosted simple | Need BM25 hybrid, GPU acceleration |
| **Weaviate** | Hybrid search (dense+sparse), multi-modal, GraphQL | Highest throughput, very large scale |
| **Milvus** | Billion-scale, GPU acceleration, most index options | Simple setups, small teams, low ops maturity |
| **pgvector** | Already use PostgreSQL, need JOINs with vectors, ACID | Very large scale (>10M), low-latency requirements |
| **Chroma** | Prototyping, local dev, lightweight embedded | Production scale, high availability, advanced features |
| **FAISS** | Maximum performance, custom pipeline, GPU | Persistence, CRUD, networking, multi-node |

## Code Examples

### Python CRUD (Qdrant)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue

client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="products",
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
)

# Insert vectors
client.upsert(
    collection_name="products",
    points=[
        PointStruct(id=1, vector=[0.1]*768, payload={"name": "laptop", "price": 999}),
        PointStruct(id=2, vector=[0.2]*768, payload={"name": "phone", "price": 599}),
    ],
)

# Similarity search
results = client.search(
    collection_name="products",
    query_vector=[0.15]*768,
    limit=10,
)

# Filtered search
results = client.search(
    collection_name="products",
    query_vector=[0.15]*768,
    query_filter=Filter(
        must=[FieldCondition(key="price", range=Range(gte=500, lte=2000))]
    ),
    limit=10,
)

# Update metadata
client.set_payload(
    collection_name="products",
    payload={"price": 899},
    points=[1],
)

# Delete
client.delete(
    collection_name="products",
    points_selector=Filter(must=[FieldCondition(key="name", match=MatchValue(value="laptop"))]),
)

# Scroll (list all)
records = client.scroll(
    collection_name="products",
    limit=100,
)
```

### Python CRUD (Pinecone)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="...")
pc.create_index(
    name="products",
    dimension=768,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-west-2"),
)

index = pc.Index("products")

# Insert
index.upsert(
    vectors=[
        ("id1", [0.1]*768, {"name": "laptop", "price": 999}),
        ("id2", [0.2]*768, {"name": "phone", "price": 599}),
    ]
)

# Query with filter
results = index.query(
    vector=[0.15]*768,
    top_k=10,
    filter={"price": {"$gte": 500, "$lte": 2000}},
)

# Fetch by ID
result = index.fetch(ids=["id1"])

# Delete
index.delete(ids=["id1"])
index.delete(filter={"price": {"$lt": 100}})

# Update
index.update(id="id1", values=[0.3]*768, set_metadata={"price": 799})
```

### Python CRUD (pgvector)

```python
import psycopg2
from pgvector.psycopg2 import register_vector

conn = psycopg2.connect(database="vectordb")
register_vector(conn)
cur = conn.cursor()

# Create table with vector column
cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
cur.execute("""
    CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name TEXT,
        price NUMERIC,
        embedding VECTOR(768)
    )
""")

# Insert
cur.execute(
    "INSERT INTO products (name, price, embedding) VALUES (%s, %s, %s)",
    ("laptop", 999, [0.1]*768),
)

# ANN search
cur.execute(
    "SELECT id, name, price, embedding <=> %s::vector AS distance FROM products ORDER BY distance LIMIT 10",
    ([0.15]*768,),
)

# Filtered search
cur.execute(
    """
    SELECT id, name, price, embedding <=> %s::vector AS distance
    FROM products
    WHERE price BETWEEN 500 AND 2000
    ORDER BY distance LIMIT 10
    """,
    ([0.15]*768,),
)

# Create index for ANN
cur.execute("CREATE INDEX ON products USING hnsw (embedding vector_cosine_ops)")
```

### Hybrid Search (Weaviate)

```python
import weaviate

client = weaviate.Client("http://localhost:8080")

# Define class with both vectorizer and BM25
class_obj = {
    "class": "Document",
    "vectorizer": "text2vec-openai",
    "moduleConfig": {
        "bm25": {"enabled": True},
    },
}
client.schema.create_class(class_obj)

# Hybrid search (dense + sparse)
results = client.query.get(
    "Document", ["title", "content"]
).with_hybrid(
    query="machine learning transformers",
    alpha=0.5,  # 0 = only BM25, 1 = only vector
    vector=query_vector,  # optional: pre-computed vector
).with_limit(10).do()
```

### Hybrid Search (Qdrant with SPLADE)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    NamedVector, NamedSparseVector, SparseVector,
    hybrid_search, Distance, VectorParams, SparseVectorParams,
)

client = QdrantClient("localhost", 6333)

# Create collection with sparse + dense
client.create_collection(
    "hybrid_collection",
    vectors_config={"dense": VectorParams(size=768, distance=Distance.COSINE)},
    sparse_vectors_config={"sparse": SparseVectorParams()},
)

# Insert with both dense and sparse vectors
client.upsert(
    "hybrid_collection",
    points=[
        PointStruct(
            id=1,
            vector={
                "dense": [0.1]*768,
                "sparse": SparseVector(indices=[1, 5, 10], values=[0.5, 0.3, 0.2]),
            },
            payload={"text": "machine learning tutorial"},
        ),
    ],
)

# Hybrid search with RRF
results = client.query_points(
    "hybrid_collection",
    query=hybrid_search(
        dense=NamedVector(name="dense", vector=[0.15]*768),
        sparse=NamedSparseVector(name="sparse", vector=SparseVector(...)),
        fusion=Quantization(quantization=QuantizationType.RRF),
        k=10,
    ),
)
```

## Anti-Patterns

### Wrong Index Type for Data Scale

```
Anti-pattern: Using HNSW for 100M vectors on a single 16GB RAM node
Result: Out-of-memory crashes, swapping, unusable latency
Fix: Use IVF+PQ (compressed) or switch to DiskANN

Anti-pattern: Using Flat index for 100K vectors
Result: Unnecessary full scan, 50ms latency when HNSW would be 5ms
Fix: Always use ANN for >10K vectors, even if "it fits in memory"
```

### Ignoring Filter Performance

```
Anti-pattern: Building a vector index but no metadata index
Query: "find similar to X where category='expensive'"
Result: Full scan of all vectors, or post-filter removes all top-K results
Fix: Index filter fields used in >10% of queries

Anti-pattern: Using post-filter when filter removes 90% of data
Query: search 1M vectors, filter by tenant (each tenant has 10K vectors)
Result: Top-10 results likely all belong to wrong tenant
Fix: Switch to pre-filter with metadata index
```

### Over-Filtering

```
Anti-pattern: Applying 5+ filter conditions with no metadata index
Result: DB falls back to full scan or returns 0 results
Fix: Limit to 2-3 indexed filters per query, defer rest to application layer
```

### Production Blind Spots

```
Anti-pattern: No evaluation before deployment
Result: Recall is 0.75 (unacceptable), discovered during user complaints
Fix: Evaluate recall against ground truth before going live

Anti-pattern: No backup strategy for self-hosted
Result: Data loss on node failure; no recovery path
Fix: Daily snapshots + hourly WAL backup, test restore monthly

Anti-pattern: Single-node production deployment
Result: Outage during maintenance, no HA
Fix: Minimum 3-node cluster with replication factor 3

Anti-pattern: Ignoring data distribution for sharding
Result: Shard 1 has 10K vectors, shard 2 has 10M vectors
Fix: Use consistent hashing or tenant-aware sharding
```

### Cost Blowups

```
Anti-pattern: Oversized HNSW M parameter (M=64 for 10M vectors)
Result: 4× memory usage for <1% recall gain
Fix: M=16 default, only increase if recall target >0.99

Anti-pattern: No compression on large datasets
Result: 10M vectors × 768 dim = 30GB RAM, expensive cluster needed
Fix: Enable SQ8 (→7.5GB) or PQ compression (→3.75GB)

Anti-pattern: Keeping unused collections/indexes around
Result: Paying for storage of obsolete data
Fix: Archive or delete cold collections, automate cleanup
```

## Evaluation: Recall, Latency, Throughput

### Recall Evaluation

```python
import numpy as np
from sklearn.neighbors import NearestNeighbors

def evaluate_recall(vectors, queries, ann_search_fn, k=10):
    # Ground truth (exact search)
    exact = NearestNeighbors(n_neighbors=k, metric="cosine")
    exact.fit(vectors)
    exact_results = [set(exact.kneighbors([q], return_distance=False)[0]) for q in queries]

    # ANN results
    ann_results = [set(ann_search_fn(q, k=k)) for q in queries]

    # Recall@K
    recalls = [len(ann & ext) / k for ann, ext in zip(ann_results, exact_results)]
    return float(np.mean(recalls))
```

### Benchmark Methodology

```python
import time
import statistics

def benchmark(
    index,
    queries,
    ground_truth=None,
    k=10,
    warmup=10,
    measurements=100,
    batch_size=1,
):
    # Warmup
    for q in queries[:warmup]:
        index.search(q, k=k)

    # Latency measurement
    latencies = []
    for q in queries[:measurements]:
        start = time.perf_counter()
        index.search(q, k=k)
        latencies.append((time.perf_counter() - start) * 1000)

    # Throughput (batched)
    batch_latencies = []
    for i in range(0, len(queries), batch_size):
        batch = queries[i:i+batch_size]
        start = time.perf_counter()
        for q in batch:
            index.search(q, k=k)
        batch_latencies.append((time.perf_counter() - start) * 1000 / len(batch))

    return {
        "p50_latency_ms": statistics.median(latencies),
        "p95_latency_ms": sorted(latencies)[int(len(latencies)*0.95)],
        "p99_latency_ms": sorted(latencies)[int(len(latencies)*0.99)],
        "mean_latency_ms": statistics.mean(latencies),
        "qps_single": 1000 / statistics.mean(latencies),
        "qps_batch": 1000 / statistics.mean(batch_latencies) * batch_size,
    }
```

### Suggested Evaluation Suite

| Test | What It Validates |
|------|-------------------|
| Recall@10 on golden queries | Index quality on known good queries |
| Recall@100 | Quality for retrieval-heavy use cases (RAG) |
| P50/P99/P99.9 latency | User experience and tail performance |
| QPS at target latency | Throughput capacity |
| Filtered recall | Quality when filters applied |
| Index build time | Operational feasibility for rebuilds |
| Memory usage | Capacity planning |
| Scale test (2×, 5×, 10× data) | Linear scaling expectation |

### Performance Targets by Use Case

| Use Case | Recall | P50 Latency | P99 Latency | QPS per Node |
|----------|--------|-------------|-------------|--------------|
| RAG retrieval | >0.95 | <50ms | <200ms | >100 |
| Product search | >0.95 | <20ms | <100ms | >500 |
| Recommendations | >0.90 | <10ms | <50ms | >1000 |
| Anomaly detection | >0.90 | <50ms | <200ms | >200 |
| Deduplication | >0.99 | <100ms | <500ms | >50 |

## Cost Optimization

### Index-Related Costs

| Strategy | Savings | Recall Impact | Complexity |
|----------|---------|---------------|------------|
| Scalar Quantization (SQ8) | 4× less memory | -1-3% | None (built-in) |
| Product Quantization (PQ) | 8-16× less memory | -5-15% | Low (config param) |
| Binary Quantization | 32× less memory | -15-30% | None (built-in) |
| Reduce HNSW M (16→8) | 30% less memory | -1-2% | None (rebuild) |
| IVF instead of HNSW | 40-60% less memory | -2-5% | Config change |
| DiskANN (SSD) | 95% less RAM | -2-3% | Medium (ops) |

### Storage Tiering

```
Tier 1 (Hot): recent 20% of vectors, HNSW, in-memory → lowest cost/query
Tier 2 (Warm): next 30%, IVF+PQ, SSD → medium cost/query
Tier 3 (Cold): oldest 50%, DiskANN or object store → highest latency, lowest $$$
```

Move vectors between tiers based on access recency. Automate with TTL or access-count triggers.

### Compute Cost Reduction

```
Strategy 1: Right-size instance type
- Start with CPU-optimized, add RAM as needed
- GPU only needed for >100M vectors or <5ms requirement

Strategy 2: Use spot/preemptible instances
- For index build (fault-tolerant, can restart)
- For read replicas (replace if reclaimed)

Strategy 3: Batch queries
- Throughput increases linearly with batch size
- 10× batch = 5-8× throughput on same hardware

Strategy 4: Cache hot queries
- LRU cache with 1-hour TTL
- 50% hit rate = 2× effective QPS with zero latency
```

### Build Cost Optimization

```
Full rebuild cost: CPU-hours × node count
Optimization:
1. Incremental updates instead of full rebuild
2. Parallel build across shards
3. Schedule rebuild during lowest-traffic hours
4. Use 80% index build quality (efConstruction=100), fine-tune at query time
```

### Managed DB Cost Comparison

| Scenario | Pinecone | Qdrant Cloud | Weaviate Cloud | Self-hosted (3 nodes) |
|----------|----------|--------------|------------------|----------------------|
| 1M vectors, 10 QPS | ~$150/mo | ~$80/mo | ~$100/mo | ~$50/mo (3×$15 VMs) |
| 10M vectors, 100 QPS | ~$500/mo | ~$300/mo | ~$400/mo | ~$150/mo (3×$50 VMs) |
| 100M vectors, 500 QPS | ~$2000/mo | ~$1200/mo | ~$1500/mo | ~$500/mo (6×$80 VMs) |

Self-hosted costs include compute only. Add: storage, networking, backup storage, ops labor (0.25-1 FTE).

## Workflow

### Step 1: Requirements Collection
Determine: vector dimension, number of vectors, inserts/second, queries/second, recall target (0.9-0.99), P99 latency target (ms), consistency model (eventual/strong), budget, deployment model (managed/self-hosted), filter usage patterns, data growth projection.

### Step 2: Database and Index Selection
Use decision trees above. Document rationale for each choice.

### Step 3: Distance Metric Selection
- Cosine: default for most text embeddings (normalized vectors). Range [0,2].
- Euclidean (L2): use when embedding model outputs unnormalized vectors.
- Dot product: use when embeddings trained with dot product loss (e.g., Cohere).
- Inner product: for normalized vectors, equivalent to cosine.

### Step 4: Sharding and Replication
- Shard by partition key (tenant ID, document category) for targeted queries.
- Aim for 500K-5M vectors per shard for balanced performance.
- Replication factor of 2-3 for production (read availability + failover).
- Use consistent hashing for even data distribution across shards.

### Step 5: Hybrid Search Setup
- Post-filter: run ANN search, then filter by metadata. Good when metadata is selective.
- Pre-filter: apply metadata filter first, then search within filtered set. Required for high-selectivity filters.
- Index frequently filtered metadata fields (tenant_id, category, date_range, status).
- TiDB or Elasticsearch-style inverted index for text metadata.

### Step 6: Evaluation
- Run recall evaluation on golden query set (100-1000 queries).
- Measure P50/P95/P99 latency under expected QPS.
- Verify filtered search quality.
- Document results before production deployment.

### Step 7: Operations
- Backup: snapshot every 6h for production, test restoration monthly.
- Monitoring: QPS, P50/P99 latency, recall rate, memory usage, disk IO.
- Alert: recall < 0.9, latency > P99 target × 1.5, disk > 80%.
- Scaling: add nodes when CPU > 70% sustained or latency regresses.

### Step 8: Cost Tracking
- Track $ per million vectors per month.
- Monitor index-to-vector memory ratio.
- Evaluate compression options quarterly.
- Archive unused collections.

## Rules

1. HNSW for <10M vectors is optimal. Above 10M, consider IVF, IVF+PQ, or DiskANN.
2. Distance metric must match the embedding model's training loss function.
3. Cosine is default for OpenAI, Cohere, and Sentence-Transformer embeddings.
4. Never use post-filter if metadata filter removes >50% of candidates.
5. Index metadata fields that appear in >10% of queries.
6. Replication != backup — always have separate backup strategy.
7. Test ANN recall on your data distribution, not synthetic.
8. Always benchmark with representative query distribution, not random.
9. Start with M=16, efConstruction=200 for HNSW; tune from baseline.
10. For managed DBs, estimate monthly cost before choosing vendor.
11. Document golden query set and recall baseline for regression detection.
12. Use SQ8 or PQ compression before scaling horizontally.
13. Batch writes in chunks of 100-1000 for optimal throughput.
14. Monitor shard balance — rebalance when ratio exceeds 2:1.
15. Test restore procedure at least quarterly for self-hosted deployments.

## References
  - references/index-types.md — Vector Index Types
  - references/indexing-strategies.md — Indexing Strategies
  - references/operations.md — Vector Database Operations
  - references/vector-databases-advanced.md — Vector Databases Advanced Topics
  - references/vector-databases-fundamentals.md — Vector Databases Fundamentals
  - references/vector-db-comparison.md — Vector Database Comparison
  - references/vector-db-scaling.md — Vector Database Scaling
  - references/vector-db-security.md — Vector Database Security
  - references/anti-patterns.md — Vector Database Anti-Patterns
  - references/evaluation-benchmarking.md — Evaluation and Benchmarking
  - references/cost-optimization.md — Vector Database Cost Optimization
  - references/code-examples.md — Code Examples for Vector Databases

## Handoff
For embedding model selection before index creation, hand off to `ai-rag-patterns`. For ML infrastructure around vector DB, hand off to `ai-llm-ops`. For security hardening, hand off to `ai-security`.
