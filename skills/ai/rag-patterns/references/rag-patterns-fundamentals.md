# RAG Fundamentals

## Overview
Retrieval-Augmented Generation (RAG) combines a retrieval step with a generation step: given a user query, relevant documents are retrieved from a knowledge base and provided as context to an LLM. This grounds generation in external knowledge, reducing hallucination and enabling up-to-date, domain-specific answers.

## Core Concepts

### Concept 1: The RAG Triad
RAG systems comprise three interconnected components:

| Component | Role | Example |
|-----------|------|---------|
| Indexing | Ingest documents, chunk, embed, store | Ingestion pipeline → Vector DB |
| Retrieval | Find relevant chunks for a query | Embed query → ANN search → Top-K |
| Generation | Produce answer grounded in retrieved context | LLM + context → final answer |

**Key insight**: The weakest link determines overall quality. Poor indexing caps retrieval; poor retrieval caps generation.

### Concept 2: Embedding
Embeddings are dense vector representations of text. Semantically similar texts have vectors close together in embedding space.
- Query embedding: encode user question into a vector.
- Document embedding (pre-computed): encode each chunk and store in vector DB.
- Distance metrics: cosine similarity (most common), dot product, Euclidean.

### Concept 3: Relevance Scoring
Retrieval ranks chunks by relevance to the query.
- **Dense similarity**: cosine(query_embedding, chunk_embedding)
- **Sparse similarity**: BM25 term overlap score
- **Hybrid fusion**: weighted combination of both scores
- **Re-ranker score**: cross-encoder produces a precise relevance score for each query-chunk pair

### Concept 4: Context Window Management
LLMs have finite context. Retrieved chunks compete for this budget with the query, system prompt, and conversation history.
- Rule: context chunks must not exceed 50% of the LLM's total context window.
- Prioritize highest-scoring chunks when budget is tight.
- Track token counts per chunk to enable precise budgeting.

### Concept 5: Grounding and Faithfulness
The central promise of RAG: the LLM's answer should be grounded in the retrieved context.
- **Faithfulness**: every claim in the answer is supported by the context.
- **Citation**: each claim links to its source chunk (doc ID, chunk index, source URL).
- **Hallucination risk**: when context is irrelevant or missing, the LLM may fabricate.

## Architecture Building Blocks

### Query Processing
```
Raw Query
  └── Normalize (lowercase, strip whitespace)
  └── Expand (abbreviations, acronyms) [optional]
  └── Rewrite for retrieval [optional]
  └── Embed (or pass to BM25 tokenizer)
```

### Retrieval
```
Query Vector
  └── ANN Search in Vector DB → Top-K dense results
  └── [Optional] BM25 Search → Top-K sparse results
  └── Hybrid Fusion (RRF or weighted sum)
  └── [Optional] Re-ranking (cross-encoder)
  └── Top-N final results
```

### Context Assembly
```
Retrieved Chunks
  └── Format with source metadata
  └── Sort by score (descending)
  └── Truncate at token budget
  └── Insert into prompt template
```

### Generation
```
System Prompt + Context + Query
  └── LLM generates answer
  └── [Optional] LLM cites sources
  └── Return answer + sources to user
```

## Basic RAG Pipeline Implementation

### Minimal RAG
```python
import numpy as np
from typing import List, Dict

class MinimalRAG:
    def __init__(self, embedder, vector_db, llm):
        self.embedder = embedder
        self.db = vector_db
        self.llm = llm

    def query(self, question: str, top_k: int = 5) -> Dict:
        query_vec = self.embedder.encode(question)
        results = self.db.search(query_vec, k=top_k)
        context = "\n\n".join(r["text"] for r in results)
        prompt = f"""Answer using only the context below.

Context:
{context}

Question: {question}

Answer:"""
        answer = self.llm.generate(prompt)
        return {
            "answer": answer,
            "sources": [
                {"id": r["id"], "source": r["metadata"].get("source")}
                for r in results
            ],
        }
```

### With Hybrid Search
```python
class HybridRAG:
    def __init__(self, embedder, vector_db, bm25_index, llm):
        self.embedder = embedder
        self.vector_db = vector_db
        self.bm25 = bm25_index
        self.llm = llm

    def hybrid_search(self, query: str, top_k: int = 10, alpha: float = 0.5) -> List[Dict]:
        query_vec = self.embedder.encode(query)
        dense_results = self.vector_db.search(query_vec, k=top_k * 2)
        sparse_results = self.bm25.search(query, k=top_k * 2)

        dense_map = {r["id"]: r for r in dense_results}
        sparse_map = {r["id"]: r for r in sparse_results}
        all_ids = set(list(dense_map.keys()) + list(sparse_map.keys()))

        dense_scores = {id: r["score"] for id, r in dense_map.items()}
        sparse_scores = {id: r["score"] for id, r in sparse_map.items()}
        self._normalize(dense_scores)
        self._normalize(sparse_scores)

        combined = []
        for id in all_ids:
            score = alpha * dense_scores.get(id, 0) + (1 - alpha) * sparse_scores.get(id, 0)
            doc = dense_map.get(id) or sparse_map.get(id)
            combined.append({**doc, "score": score})

        combined.sort(key=lambda x: x["score"], reverse=True)
        return combined[:top_k]

    def _normalize(self, scores: Dict[str, float]):
        values = list(scores.values())
        if not values:
            return
        min_v, max_v = min(values), max(values)
        if max_v - min_v > 1e-8:
            for k in scores:
                scores[k] = (scores[k] - min_v) / (max_v - min_v)

    def query(self, question: str) -> Dict:
        results = self.hybrid_search(question)
        context = "\n\n".join(
            f"[{r['metadata'].get('source', '?')}] {r['text']}"
            for r in results[:5]
        )
        prompt = f"""Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"""
        answer = self.llm.generate(prompt)
        return {"answer": answer, "sources": [r["metadata"] for r in results[:5]]}
```

### With Re-Ranking
```python
class RerankedRAG:
    def __init__(self, retriever, reranker, llm):
        self.retriever = retriever
        self.reranker = reranker
        self.llm = llm

    def query(self, question: str) -> Dict:
        candidates = self.retriever.retrieve(question, k=50)
        reranked = self.reranker.rerank(question, candidates, top_n=5)
        context = "\n\n".join(r["text"] for r in reranked)
        prompt = f"""Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"""
        answer = self.llm.generate(prompt)
        return {"answer": answer, "sources": [r["metadata"] for r in reranked]}
```

## Metadata for Traceability
Every retrieved chunk must carry provenance metadata. Without it, debugging retrieval failures is impossible.

```json
{
  "id": "chunk_uuid",
  "doc_id": "parent_doc_uuid",
  "chunk_index": 5,
  "text": "...",
  "token_count": 320,
  "source": "https://docs.example.com/page",
  "title": "Installation Guide",
  "section": "Configuration",
  "page": 12,
  "embedded_at": "2026-05-31T10:00:00Z"
}
```

## Common Evaluation Metrics for Beginners

| Metric | What It Measures | Target | How to Compute |
|--------|-----------------|--------|----------------|
| Recall@K | Fraction of relevant docs in top-K | > 0.9 | Count relevant in top-K / total relevant |
| Precision@K | Fraction of top-K that are relevant | > 0.8 | Count relevant in top-K / K |
| MRR | How early the first relevant doc appears | > 0.8 | 1 / rank of first relevant (avg over queries) |
| Faithfulness | % of answer claims supported by context | > 95% | LLM judge scores each claim |
| Answer Relevancy | How directly the answer addresses the query | > 4/5 | LLM judge or human rating |

## Glossary

| Term | Definition |
|------|------------|
| ANN | Approximate Nearest Neighbor — fast approximate vector search |
| Chunk | A unit of text retrieved and fed to the LLM |
| Cosine Similarity | Dot product of normalized vectors; range [-1, 1] |
| Cross-Encoder | Model that scores a (query, doc) pair jointly (slow, accurate) |
| Dense Retrieval | Search by semantic embedding similarity |
| HNSW | Hierarchical Navigable Small World — popular ANN index |
| HyDE | Hypothetical Document Embeddings — generate a fake doc and use its embedding |
| MMR | Maximum Marginal Relevance — diversify results by penalizing similarity |
| RRF | Reciprocal Rank Fusion — combine rankings without score normalization |
| Sparse Retrieval | Search by keyword/term overlap (BM25) |
| Top-K | Number of results retrieved per query |

## Key Points
- RAG = Retrieval + Generation. Both must be optimized.
- Embedding quality caps retrieval quality. Retrieval quality caps generation quality.
- Chunk size must respect the embedding model's token limit (typically 512 tokens).
- Always store metadata with every chunk: doc ID, source, section, page.
- Use hybrid search (dense + sparse) for production — it beats either alone.
- Context must not exceed 50% of the LLM's total context window.
- Evaluate retrieval separately from generation. Fix retrieval first.
- Faithfulness is the single most important quality metric for RAG output.
- Re-ranking improves precision but adds latency: use only when needed.
- Cache embeddings for frequent queries to reduce latency.
