---
name: data-vector-databases
description: >
  Use this skill when the user says 'vector database', 'vector db', 'pgvector', 'qdrant', 'milvus', 'pinecone', 'weaviate', 'hnsw', 'ivf', 'product quantization', 'ann search', 'similarity search', 'embeddings storage', 'hybrid search'. Chooses a vector store, designs collections/schemas and metadata filtering, tunes ANN indexes (HNSW, IVF, PQ) for recall vs latency vs memory, and sets up hybrid (dense + keyword) retrieval with evaluation. Do NOT use for: RAG prompt/answer design and chunking strategy (ai rag-architecture, prompt-engineering rag-design), full-text search engines alone (data-search-engine), recommender modeling (ml-recommendation-systems).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [data, vector-database, ann, hnsw, pgvector, embeddings, hybrid-search]
---

# Vector Databases

## Purpose
Store embedding vectors with metadata and return the nearest neighbors of a query vector fast enough for interactive use. Exact search compares the query with every vector (O(N·d)); approximate nearest neighbor (ANN) indexes trade a measurable amount of recall for large speedups. The work is choosing the store, the index and its parameters, and proving recall on your own data.

## Agent Protocol

### Trigger
"vector database", "vector db", "pgvector", "qdrant", "milvus", "pinecone", "weaviate", "hnsw", "ivfflat", "ivf-pq", "ann", "similarity search", "store embeddings", "hybrid search", "recall@k".

### Input Context
- Number of vectors now and in 12 months, dimensions, embedding model, update rate.
- Query latency SLO and QPS, filter requirements (tenant, ACL, dates), existing database.
- Accuracy target (recall@k vs exact search).

### Output Artifact
Store choice + schema + index parameters + evaluation plan. No file unless requested.

### Response Format
```
Scale: {N vectors} x {d dims} {dtype} ≈ {GB raw}
Store: {pgvector|Qdrant|Milvus|managed...} because {reason}
Index: {HNSW m/ef_construction/ef_search | IVF nlist/nprobe | +PQ/quantization}
Filtering: {pre/in-index/post}
Eval: recall@{k} vs exact on {n} queries, p95 latency
```

### Completion Criteria
- [ ] Distance metric matches how the embedding model was trained (cosine / dot / L2).
- [ ] Recall@k measured against exact (brute-force) results on a sample of real queries.
- [ ] Filters applied inside the query, with a check that filtered queries still return k results.
- [ ] Re-embedding plan when the model changes (never mix models in one index).

## Embeddings Basics
- Embedding models map text/images to fixed-length float vectors; similar meaning → nearby vectors. Dimensions depend on the model (e.g. OpenAI `text-embedding-3-small` defaults to 1536 and can be shortened with its `dimensions` parameter).
- Normalize vectors to unit length to make cosine similarity equal to dot product (faster in most engines).
- Memory: N x d x 4 bytes for float32. 10M x 1536 ≈ 61 GB raw, before index overhead.

## Why Approximate Search
- Exact k-NN is perfectly feasible for small collections (up to roughly a few hundred thousand vectors on CPU, more on GPU, e.g. FAISS flat index) and is the ground truth for evaluation.
- For random high-dimensional data, distances concentrate (nearest and farthest neighbors become similar), which defeats space-partitioning trees such as k-d trees. Real embeddings have lower intrinsic dimension, which is why graph and clustering indexes work well on them.

## Index Types
| Index | How | Tune | Trade-offs |
|-------|-----|------|------------|
| Flat (exact) | Scan all vectors | none | Perfect recall; linear cost |
| HNSW | Multi-layer proximity graph; greedy search from top layer | `M` (links/node), `ef_construction`, `ef_search` | High recall at low latency; high memory; slow builds; deletes leave tombstones |
| IVF (ivfflat) | k-means clusters; search `nprobe` nearest clusters | `nlist` (~√N to 4√N), `nprobe` | Less memory, fast build; needs training data; recall drops at cluster boundaries |
| PQ / IVF-PQ | Compress vectors into sub-vector codes | `m` sub-quantizers, bits | 10-60x smaller; lower recall, rerank with full vectors |
| Scalar / binary quantization | int8 or 1-bit per dimension | rescoring factor | Large memory savings; rescore top candidates with original vectors |
| DiskANN-style | Graph on SSD, compressed vectors in RAM | beam width | Billion-scale on one node; SSD latency |

## Choosing a Store
| Situation | Choice |
|-----------|--------|
| Already on PostgreSQL, < tens of millions of vectors, need joins/transactions | pgvector |
| Dedicated, high QPS, rich payload filtering, self-hosted | Qdrant, Milvus, Weaviate |
| No ops team, pay per usage | Managed (Pinecone, cloud-hosted variants of the above) |
| Search engine already in place with keyword search | OpenSearch / Elasticsearch k-NN |
| Offline/batch similarity, research | FAISS library (not a database) |

## pgvector Example
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id  BIGINT NOT NULL,
    content    TEXT NOT NULL,
    embedding  vector(1536) NOT NULL
);

-- HNSW with cosine distance; build after bulk load for speed
CREATE INDEX documents_embedding_hnsw ON documents
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX documents_tenant ON documents (tenant_id);

-- query: <=> cosine distance, <-> L2 distance, <#> negative inner product
SET hnsw.ef_search = 100;               -- higher = better recall, slower
SELECT id, content, embedding <=> $1 AS distance
FROM documents
WHERE tenant_id = $2
ORDER BY embedding <=> $1
LIMIT 10;
```
Filtered HNSW queries can return fewer than `LIMIT` rows when the filter is selective, because the index returns `ef_search` candidates before filtering. pgvector 0.8+ offers iterative index scans (`SET hnsw.iterative_scan = relaxed_order;`); otherwise raise `ef_search`, use partial indexes per large tenant, or partition. The `vector` type supports HNSW/IVFFlat indexes up to 2,000 dimensions; `halfvec` (float16) allows up to 4,000 and halves memory.

## Hybrid Search (dense + keyword)
Dense vectors miss exact tokens (product codes, error IDs, rare names). Run BM25/full-text and vector search, then fuse with Reciprocal Rank Fusion:
```python
def rrf(result_lists: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

fused = rrf([dense_ids, bm25_ids])[:50]   # then rerank top candidates with a cross-encoder
```
Qdrant, Weaviate, Milvus, OpenSearch and Elasticsearch provide built-in hybrid queries; in PostgreSQL combine pgvector with `tsvector` full-text search.

## Evaluating Recall
```python
import numpy as np

def recall_at_k(ann_ids: list[list[int]], exact_ids: list[list[int]], k: int) -> float:
    hits = [len(set(a[:k]) & set(e[:k])) / k for a, e in zip(ann_ids, exact_ids)]
    return float(np.mean(hits))
```
Compute `exact_ids` with a flat scan on a sample of real queries; sweep `ef_search`/`nprobe` and plot recall vs p95 latency. Also measure end-task retrieval quality (did the right document come back), which depends on the embedding model more than the index.

## Operations
- Bulk load, then build the index; tune build memory (`maintenance_work_mem` for pgvector).
- Updates/deletes degrade HNSW graphs over time; schedule reindex/optimize per engine docs.
- Store `model_name` and `model_version` with each vector; changing the model means re-embedding everything into a new index and switching atomically.
- Back up vectors with their source text so they can be regenerated.

## Anti-Patterns
- Reporting latency without recall (an index with ef_search=1 is fast and wrong).
- Post-filtering a small top-k result set and returning nearly empty pages.
- Mixing embeddings from different models or versions in one index.
- Using a separate vector DB for 50k vectors when the existing PostgreSQL would do.
- Dense-only retrieval for queries dominated by identifiers.

## References
- `references/indexing-algorithms.md` — HNSW and IVF-PQ internals.
- `references/advanced-rag-chunking.md` — preparing chunks before embedding.
- Malkov & Yashunin, HNSW (arXiv:1603.09320); Jégou et al., Product Quantization (IEEE TPAMI 2011); pgvector README.
