---
name: llm-rag-retrieval-internals
description: >
  Use this skill when the user says 'HNSW parameters', 'IVF-PQ', 'ANN index tuning', 'efSearch', 'nprobe', 'recall vs latency', 'Self-RAG', 'DSPy', 'optimize RAG pipeline', 'hybrid search fusion'. Covers retrieval engine internals (HNSW, IVF, PQ), index tuning for recall/latency/memory, hybrid dense+sparse fusion, reranking, and adaptive/optimized RAG pipelines (Self-RAG, DSPy). Do NOT use for: query rewriting and prompt-side RAG design (prompt-engineering/rag-design), agent memory (ai/ai-agents/memory-systems), or choosing a vector database product (ai vector-databases / data skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, rag, retrieval, hnsw, ivf-pq, faiss, hybrid-search, reranking, dspy]
---

# RAG Retrieval Internals

## Purpose
Retrieval quality caps RAG quality: the generator cannot use a passage that was never retrieved. This skill explains how approximate nearest neighbour (ANN) indexes trade recall for speed and memory, how to tune them, and how to build the repo-standard pipeline: hybrid retrieval (dense + BM25), fusion, cross-encoder reranking, and measured end-to-end evaluation.

## Agent Protocol

### Trigger
"HNSW", "IVF", "product quantization", "efSearch", "nprobe", "ANN recall", "hybrid search", "reciprocal rank fusion", "reranker", "Self-RAG", "DSPy".

### Input Context
- Corpus size (vectors), embedding dimension, update rate.
- Latency SLO, memory budget, required recall@k.
- Current pipeline and failure examples (missed passages, wrong answers).

### Output Artifact
Index choice and parameters, hybrid/rerank pipeline, evaluation plan with retrieval and answer metrics.

### Response Format
```
Corpus: {N} vectors × {d} dims  Memory budget: {GB}
Index: {HNSW|IVF-Flat|IVF-PQ|flat} params: {M, efConstruction, efSearch | nlist, nprobe, m, nbits}
Hybrid: dense top-{k1} + BM25 top-{k2} -> RRF(k=60) -> rerank top-{n}
Metrics: recall@{k} vs exact, nDCG@{n}, answer faithfulness
```

### Completion Criteria
- [ ] ANN recall measured against exact (flat) search on a sample.
- [ ] Hybrid retrieval and reranking in place (repo rule).
- [ ] Chunking is structure-aware or parent-child, not blind fixed-size (repo rule).
- [ ] Labeled eval set for retrieval and generation.

## Index Families

| Index | Memory | Build | Query | Updates | Use when |
|---|---|---|---|---|---|
| Flat (exact) | N·d·4 B | None | O(N·d) | Trivial | < ~100k vectors, ground truth |
| HNSW | Vectors + graph (~M·2 links/node at layer 0) | Slow-ish | Sub-linear, empirically ~log N hops | Inserts OK, deletes awkward | Default for low-latency, high recall in RAM |
| IVF-Flat | Vectors + centroids | k-means training | Scans nprobe/nlist of data | Needs retraining on drift | Large corpora, batch updates |
| IVF-PQ | m·nbits/8 bytes per vector | Training | Fast table lookups (ADC) | Retrain on drift | Billion-scale, memory-bound |
| DiskANN-style | Graph on SSD | Slow | Few SSD reads | Varies | Larger than RAM |

### HNSW
A multi-layer proximity graph: upper layers are sparse (nodes promoted with exponentially decreasing probability), layer 0 contains every vector. Search greedily descends from the top entry point, then runs a best-first search with a candidate list of size `efSearch` on layer 0. Neighbour selection uses a diversity heuristic rather than plain k-NN, keeping the graph navigable.

| Param | Effect | Typical |
|---|---|---|
| `M` | Links per node; recall and memory up | 16-48 |
| `efConstruction` | Build-time candidate list; graph quality and build time up | 100-400 |
| `efSearch` | Query-time candidate list; recall and latency up (must be ≥ k) | 50-400, tune per SLO |

### IVF-PQ
- **IVF**: k-means into `nlist` cells; query scans the `nprobe` closest cells, roughly `nprobe/nlist` of the data.
- **PQ**: split each vector into `m` sub-vectors, quantize each to one of `2^nbits` centroids (usually 8 bits → 1 byte per sub-vector). Distances use precomputed query-to-centroid tables (asymmetric distance computation). Re-rank the top candidates with full vectors when memory allows.

## FAISS Examples

```python
import faiss
import numpy as np

d = 1024
xb = np.load("corpus_embeddings.npy").astype("float32")   # normalize for cosine
faiss.normalize_L2(xb)

# HNSW (inner product on normalized vectors = cosine)
hnsw = faiss.IndexHNSWFlat(d, 32, faiss.METRIC_INNER_PRODUCT)
hnsw.hnsw.efConstruction = 200
hnsw.add(xb)
hnsw.hnsw.efSearch = 128

# IVF-PQ for large corpora
nlist, m = 4096, 64                     # d must be divisible by m
quantizer = faiss.IndexFlatIP(d)
ivfpq = faiss.IndexIVFPQ(quantizer, d, nlist, m, 8, faiss.METRIC_INNER_PRODUCT)
ivfpq.train(xb[np.random.choice(len(xb), 200_000, replace=False)])
ivfpq.add(xb)
ivfpq.nprobe = 32

def recall_at_k(index, queries: np.ndarray, k: int = 10) -> float:
    exact = faiss.IndexFlatIP(d)
    exact.add(xb)
    _, gt = exact.search(queries, k)
    _, got = index.search(queries, k)
    return float(np.mean([len(set(g) & set(t)) / k for g, t in zip(got, gt)]))
```

## Hybrid Retrieval + Rerank (repo standard)

```python
from collections import defaultdict


def rrf(rankings: list[list[str]], k: int = 60) -> list[str]:
    """Reciprocal rank fusion: score(d) = sum over lists of 1 / (k + rank)."""
    scores: dict[str, float] = defaultdict(float)
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] += 1.0 / (k + rank)
    return sorted(scores, key=scores.__getitem__, reverse=True)


def retrieve(query: str, top_n: int = 5) -> list[str]:
    dense_ids = dense_search(query, k=50)            # ANN index above
    sparse_ids = bm25_search(query, k=50)            # e.g. Postgres FTS, OpenSearch, Tantivy
    candidates = rrf([dense_ids, sparse_ids])[:50]
    scored = cross_encoder_scores(query, candidates)  # e.g. a bge/Cohere/Jina reranker
    return [doc for doc, _ in sorted(scored, key=lambda x: x[1], reverse=True)[:top_n]]
```

Sparse search rescues exact identifiers (SKUs, error codes, names) that dense embeddings miss; reranking with a cross-encoder fixes ordering at the top where it matters.

## Adaptive and Optimized Pipelines
- **Self-RAG** (Asai et al., 2023): a model fine-tuned to emit reflection tokens deciding whether to retrieve (`Retrieve`) and critiquing relevance (`ISREL`), support (`ISSUP`), and usefulness (`ISUSE`); decoding prefers segments with favourable critiques. Prompted approximations: a cheap "is retrieval needed?" gate plus a groundedness check on the answer.
- **Corrective RAG**: grade retrieved passages; if weak, rewrite the query or fall back to another source.
- **DSPy**: write the pipeline as modules with signatures (`"context, question -> answer"`), then let an optimizer (e.g. `BootstrapFewShot`, `MIPROv2`) search instructions and few-shot demos against your metric on a training set. It optimizes prompts by search and bootstrapped examples, not by gradients through the LLM.

## Evaluation
| Layer | Metric | How |
|---|---|---|
| ANN | recall@k vs exact | `recall_at_k` above on sampled queries |
| Retrieval | hit rate@k, MRR, nDCG | Labeled query → relevant chunk ids |
| Generation | faithfulness, answer correctness | LLM-judge with rubric + human spot checks |
| System | p95 latency, cost/query | Load test |

## Anti-Patterns
- Tuning `efSearch`/`nprobe` without measuring recall against exact search.
- Dense-only retrieval for queries with identifiers.
- Sending 20+ unreranked chunks to the LLM (cost up, answer quality often down).
- Mixing embeddings from different models/versions in one index.
- IVF trained on a tiny or stale sample.

## Checklist
- [ ] Index type matches size/memory/update pattern.
- [ ] Parameters tuned on a recall-latency curve.
- [ ] Hybrid retrieval + RRF + cross-encoder rerank.
- [ ] Structure-aware or parent-child chunking.
- [ ] Embedding model/version stored with every vector.
- [ ] Retrieval and generation evals in CI.

## References
- Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search using HNSW graphs" (TPAMI 2018).
- Jégou et al., "Product Quantization for Nearest Neighbor Search" (TPAMI 2011); FAISS wiki.
- Cormack et al., "Reciprocal Rank Fusion" (SIGIR 2009); Asai et al., "Self-RAG" (ICLR 2024); Khattab et al., "DSPy" (ICLR 2024).
