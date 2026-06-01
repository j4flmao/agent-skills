# Hybrid Search Patterns

## Overview

Hybrid search combines dense (embedding-based) and sparse (lexical/keyword-based) retrieval to get the best of both approaches: semantic understanding from dense, exact matching from sparse.

## Why Hybrid Search

```
Aspect           │ Dense Retrieval               │ Sparse Retrieval (BM25)
─────────────────┼───────────────────────────────┼─────────────────────────────
Semantic matching│ Excellent (synonyms, concepts) │ Poor (exact tokens only)
Exact matching   │ Poor ("C++", "C#", version numbers) │ Excellent
Rare terms       │ Poor (not seen in training)    │ Excellent (matches any token)
Long docs        │ Biased (magnitude if unnorm)  │ Unbiased (term frequency aware)
Query speed      │ Fast (ANN index)               │ Fast (inverted index)
Storage          │ Large (vectors)                │ Small (inverted lists)
Cold start       │ Needs training data            │ Works out of the box
Domain adaptation│ Needs fine-tuning              │ No adaptation needed

Hybrid = Dense × semantic + Sparse × exact = better than either alone
```

## Fusion Strategies

### Reciprocal Rank Fusion (RRF)

RRF combines ranked lists from multiple systems without relying on score normalization.

```python
import numpy as np

def rrf_fusion(
    dense_results: list[list[int]],
    sparse_results: list[list[int]],
    k: int = 60,
    top_n: int = 10,
) -> list[list[int]]:
    """Reciprocal Rank Fusion.

    RRF formula: score(d) = Σ 1 / (k + rank_j(d))
    where rank_j(d) is the rank of document d in system j's results.

    k: rank smoothing constant (typical: 60)
       Lower k = more weight on top ranks
       Higher k = more weight on consensus across systems
    """
    fused = []
    for q_dense, q_sparse in zip(dense_results, sparse_results):
        scores = {}
        for rank, doc_id in enumerate(q_dense):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
        for rank, doc_id in enumerate(q_sparse):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
        ranked = sorted(scores.items(), key=lambda x: -x[1])
        fused.append([doc_id for doc_id, _ in ranked[:top_n]])
    return fused
```

### Linear Weighted Fusion

Combine normalized scores from each system with a learned or tuned weight.

```python
def linear_fusion(
    dense_scores: list[float],
    sparse_scores: list[float],
    dense_weight: float = 0.5,
    normalize: str = "minmax",
) -> list[float]:
    """Weighted linear combination of dense and sparse scores.

    dense_weight: weight for dense scores (0.0 = sparse only, 1.0 = dense only)
    normalize: method for score normalization:
      - "minmax": scale to [0, 1]
      - "zscore": zero-mean unit-variance
      - "rank": use rank position instead of score
    """
    def minmax(scores):
        mn, mx = min(scores), max(scores)
        return [(s - mn) / (mx - mn) if mx > mn else 0.5 for s in scores]

    def zscore(scores):
        mu, std = np.mean(scores), np.std(scores)
        return [(s - mu) / (std + 1e-10) for s in scores]

    if normalize == "minmax":
        dense_norm = minmax(dense_scores)
        sparse_norm = minmax(sparse_scores)
    elif normalize == "zscore":
        dense_norm = zscore(dense_scores)
        sparse_norm = zscore(sparse_scores)
    else:
        dense_norm = dense_scores
        sparse_norm = sparse_scores

    return [
        dense_weight * d + (1 - dense_weight) * s
        for d, s in zip(dense_norm, sparse_norm)
    ]
```

### Score Distribution Normalization

Critical: dense and sparse scores have very different distributions.

```
Distribution Characteristics:
  Dense scores (cosine): range [0.3, 1.0], concentrated near 0.6-0.8
  Sparse scores (BM25):  range [0, 20+], skewed, unbounded upper tail

Without normalization, BM25 scores dominate in magnitude.
Always normalize before fusion.

Best practice: quantile normalization (rank-based) or min-max per query.
Per-query normalization handles queries of varying difficulty better than global normalization.
```

## Learned Sparse Retrieval (SPLADE)

SPLADE learns to predict term weights for sparse retrieval, combining dense training with sparse inference.

```python
# SPLADE: Dense training → sparse inference
# Doc:         "machine learning is transforming industries"
# SPLADE terms: machine:2.3, learning:3.1, transform:1.8, industry:1.5
#              (includes expansion: "ML", "AI", "deep learning")

# Benefits over BM25:
# - Query expansion (matches synonyms)
# - Term weighting (learned, not just TF-IDF)
# - No vocabulary mismatch (model fills gaps)

# When to use SPLADE:
# - Domain-specific vocabulary not in BM25
# - When inverted index storage is preferred over vector index
# - When exact-match interpretability is needed

# Example: HuggingFace + SPLADE
from transformers import AutoModelForMaskedLM, AutoTokenizer

def splade_encode(texts: list[str], model_name: str = "naver/splade-cocondenser-ensembledistil"):
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForMaskedLM.from_pretrained(model_name)

    tokens = tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
    with torch.no_grad():
        logits = model(**tokens).logits
    # SPLADE: take log(1 + ReLU(logits)) over vocab → sparse term vector
    term_weights = torch.log(1 + torch.relu(logits))
    # Aggregate over sequence length (max pooling per term)
    sparse_embeddings = torch.max(term_weights * tokens.attention_mask.unsqueeze(-1), dim=1).values
    return sparse_embeddings  # sparse vectors over full vocabulary
```

### Comparison of Sparse Methods

```
Method │ Quality (MS MARCO) │ Index Size │ Query Latency │ Training Need
───────┼────────────────────┼────────────┼───────────────┼───────────────
BM25   │ MRR@10: 0.184     │ Small      │ <5ms          │ None
SPLADE  │ MRR@10: 0.380     │ Medium     │ <10ms         │ Requires fine-tune
SPLADE-v2│ MRR@10: 0.395    │ Medium     │ <10ms         │ Requires fine-tune
unicoil │ MRR@10: 0.350     │ Small      │ <5ms          │ Light fine-tune
```

## BM25 + Dense Hybrid Pipeline

```python
from rank_bm25 import BM25Okapi
import numpy as np

class HybridRetriever:
    """Full hybrid retrieval pipeline with configurable fusion."""

    def __init__(
        self,
        embedder,
        documents: list[str],
        dense_weight: float = 0.5,
        fusion: str = "linear",
        rrf_k: int = 60,
        top_k: int = 10,
    ):
        self.embedder = embedder
        self.documents = documents
        self.dense_weight = dense_weight
        self.fusion = fusion
        self.rrf_k = rrf_k
        self.top_k = top_k

        # Build BM25 index
        tokenized_docs = [doc.split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized_docs)

        # Build dense index
        self.dense_embeddings = embedder.encode(documents, normalize_embeddings=True)

    def search(self, query: str) -> list[dict]:
        # Dense scores
        query_embed = self.embedder.encode([query], normalize_embeddings=True)[0]
        dense_scores = self.dense_embeddings @ query_embed

        # Sparse scores
        sparse_scores = self.bm25.get_scores(query.split())

        # Fusion
        if self.fusion == "linear":
            combined = self._linear_fusion(dense_scores, sparse_scores)
        elif self.fusion == "rrf":
            combined = self._rrf_fusion(dense_scores, sparse_scores)
        else:
            raise ValueError(f"Unknown fusion: {self.fusion}")

        top_indices = np.argsort(-combined)[:self.top_k]
        return [
            {
                "doc": self.documents[i],
                "score": float(combined[i]),
                "dense_score": float(dense_scores[i]),
                "sparse_score": float(sparse_scores[i]),
            }
            for i in top_indices
        ]

    def _linear_fusion(self, dense_scores, sparse_scores):
        def norm(scores):
            mn, mx = scores.min(), scores.max()
            return (scores - mn) / (mx - mn) if mx > mn else scores
        dense_norm = norm(dense_scores)
        sparse_norm = norm(sparse_scores)
        return self.dense_weight * dense_norm + (1 - self.dense_weight) * sparse_norm

    def _rrf_fusion(self, dense_scores, sparse_scores):
        dense_ranks = np.argsort(np.argsort(-dense_scores))
        sparse_ranks = np.argsort(np.argsort(-sparse_scores))
        return 1.0 / (self.rrf_k + dense_ranks) + 1.0 / (self.rrf_k + sparse_ranks)
```

## Performance Impact

```
Dataset    │ Dense Only │ Sparse Only │ Hybrid (Linear) │ Hybrid (RRF)
───────────┼────────────┼─────────────┼─────────────────┼──────────────
MS MARCO   │ 0.358      │ 0.184       │ 0.398            │ 0.395
Natural Questions│ 0.523 │ 0.251       │ 0.561            │ 0.558
TriviaQA   │ 0.612      │ 0.382       │ 0.641            │ 0.637
FiQA (finance)│ 0.354   │ 0.361       │ 0.412            │ 0.408

Observation: Hybrid consistently beats either alone, especially when one mode is weak
(e.g., BM25 on semantic-heavy FiQA questions, or dense on code/ID queries).
```

### When Each Fusion Strategy Wins

```
Fusion   │ Best When                          │ Tuning
─────────┼────────────────────────────────────┼────────────────────
Linear   │ Score distributions are stable     │ dense_weight (0.3-0.7)
RRF      │ Score distributions are unstable   │ k (10-100, default 60)
Cascade  │ One system is much faster          │ Threshold for handoff
Learning │ Labeled query-doc pairs available  │ Learned fusion weight
```

## BGE-M3: Unified Dense + Sparse + ColBERT

BGE-M3 is a single model that supports all three retrieval modes simultaneously:

```
Mode       │ Embedding Type │ Index       │ Scoring
───────────┼────────────────┼─────────────┼─────────────────────
Dense      │ 1024d vector   │ Vector index│ Cosine similarity
Sparse     │ Lexical weights│ Inverted idx│ Term overlap
ColBERT    │ Token vectors  │ Token index │ Late interaction (MaxSim)

Fusion: All three scores combined via RRF or learned weights.
```

## Optimizing Hybrid Weight

### Grid Search

```python
def tune_hybrid_weight(
    retriever: HybridRetriever,
    queries: list[str],
    relevant: list[list[int]],
    weights: list[float] = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
) -> tuple[float, float]:
    """Grid search for optimal dense_weight.

    Returns: (best_weight, best_mrr)
    """
    best_weight = 0.5
    best_mrr = 0.0

    for w in weights:
        retriever.dense_weight = w
        mrr_scores = []
        for q, rels in zip(queries, relevant):
            results = retriever.search(q)
            for rank, r in enumerate(results):
                if r["doc"] in rels:
                    mrr_scores.append(1.0 / (rank + 1))
                    break
            else:
                mrr_scores.append(0.0)
        mrr = np.mean(mrr_scores)
        if mrr > best_mrr:
            best_mrr = mrr
            best_weight = w

    return best_weight, best_mrr
```

### Query-Dependent Weight

Some queries benefit more from dense (semantic queries) and others from sparse (exact match queries). Use a classifier to predict weight per query.

```python
def predict_hybrid_weight(query: str) -> float:
    """Predict optimal dense weight based on query characteristics.

    Returns 0.0-1.0, higher = more weight on dense retrieval.
    """
    # Heuristics:
    has_code = bool(re.search(r'[{}()\[\];:<>]', query))
    has_numbers = bool(re.search(r'\d+\.?\d*', query))
    has_quotes = '"' in query
    is_long = len(query.split()) > 10

    if has_quotes:
        return 0.2  # exact phrase match → sparse
    if has_code or has_numbers:
        return 0.3  # prefer exact match
    if is_long:
        return 0.7  # long queries are more semantic
    return 0.5  # balanced
```

## Key Points
- Hybrid search consistently outperforms dense-only or sparse-only across all standard benchmarks.
- RRF is the simplest fusion — no score normalization needed, works with any ranker.
- Linear fusion with per-query min-max normalization gives fine-grained control.
- Always normalize scores before linear fusion — mismatched distributions bias results.
- SPLADE offers learned sparse retrieval with query expansion built in.
- BM25 is the standard sparse baseline — upgrade to SPLADE for domain-specific vocabulary.
- Tune fusion weight (0.3-0.7) on your validation set — there is no universal best weight.
- Query-dependent weights improve over static weights for heterogeneous query distributions.
- Prefer RRF when score distributions are unstable or not comparable across systems.
- Use BGE-M3 for a single-model hybrid system that supports dense, sparse, and ColBERT.
- Hybrid search doubles index storage (vectors + inverted index) — plan capacity accordingly.
- Cascade fusion (fast sparse first, then dense re-rank) is most cost-effective at large scale.
