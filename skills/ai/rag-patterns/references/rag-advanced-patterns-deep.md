# Self-RAG, CRAG, Adaptive RAG & Fusion RAG — Deep Reference

## 1. Self-RAG (Self-Reflective RAG)

### Training Requirement
Self-RAG typically requires fine-tuning a model on a dataset where reflection tokens are inserted into training sequences. The model learns to generate tokens like `<retrieve>`, `<relevant>`, and `<supported>` at appropriate points.

### Reflection Token Taxonomy

| Category | Token | Meaning | Trigger Condition |
|----------|-------|---------|-------------------|
| Retrieval Decision | `<retrieve>` | I need external knowledge | Query cannot be answered from parametric memory |
| Retrieval Decision | `<no_retrieve>` | I can answer from knowledge alone | Simple fact, common knowledge |
| Relevance | `<relevant>` | Retrieved context matches query | Cosine similarity > threshold |
| Relevance | `<irrelevant>` | Context does not match query | Cosine similarity < threshold |
| Support | `<supported>` | My output is supported by context | Output claims match context |
| Support | `<unsupported>` | My output contradicts context | Output claims not found in context |
| Utility | `<useful>` | Output addresses the query | Answer is complete and correct |
| Utility | `<not_useful>` | Output does not help | Answer is incomplete or wrong |

### Inference Flow (Detailed)
```
1. Input query + [optional] conversation history
2. Model generates initial response
3. If <retrieve> token emitted:
   a. Call retriever with query
   b. Model evaluates: <relevant> or <irrelevant>
   c. If <relevant>:
      - Generate answer conditioned on context
      - Self-evaluate: <supported> or <unsupported>
      - If <unsupported>: re-generate with explicit grounding instruction
   d. If <irrelevant>:
      - Re-retrieve with rewritten query
      - If still irrelevant: skip retrieval, use parametric knowledge
4. Final output: <supported> + <useful> = emit answer
```

### Parameter-Efficient Implementation
Instead of fine-tuning, approximate Self-RAG behavior with a prompting loop:
```python
class SelfRAGPrompting:
    def __init__(self, llm, retriever):
        self.llm = llm
        self.retriever = retriever

    async def query(self, q: str, max_retries: int = 2) -> str:
        needs_retrieval = await self._decide_retrieval(q)
        if not needs_retrieval:
            return await self.llm.ainvoke(f"Q: {q}\nA:")

        chunks = await self.retriever.retrieve(q)
        context = "\n".join(chunks)

        draft = await self.llm.ainvoke(f"Context:\n{context}\nQ: {q}\nA:")
        is_supported = await self._check_support(draft, context, q, max_retries)
        return is_supported

    async def _decide_retrieval(self, q: str) -> bool:
        resp = await self.llm.ainvoke(
            f"Can you answer this from your training data alone? Q: {q}\nAnswer Yes or No:"
        )
        return "no" in resp.content.strip().lower()

    async def _check_support(self, draft, context, q, retries):
        for attempt in range(retries):
            check = await self.llm.ainvoke(
                f"Context: {context}\nAnswer: {draft}\nIs every claim supported? Yes or No:"
            )
            if "yes" in check.content.strip().lower():
                return draft
            draft = await self.llm.ainvoke(
                f"Revise this answer to only use information from the context.\nContext: {context}\nAnswer: {draft}\nRevised:"
            )
        return draft
```

### Evaluation Metrics for Self-RAG
| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Retrieval decision accuracy | Correctness of `<retrieve>` vs `<no_retrieve>` | > 90% |
| Support detection accuracy | Correctness of `<supported>` vs `<unsupported>` | > 95% |
| Faithfulness | % final claims supported by context | > 98% |
| Answer completeness | All query aspects addressed | > 4/5 |

---

## 2. Corrective RAG (CRAG) — Deep Implementation

### Retrieval Evaluator
The evaluator is a lightweight cross-encoder that scores each (query, chunk) pair.

```python
class RelevanceScorer:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L6-v2"):
        from sentence_transformers import CrossEncoder
        self.model = CrossEncoder(model_name)

    def score(self, query: str, chunks: list[str]) -> list[float]:
        pairs = [[query, c] for c in chunks]
        return self.model.predict(pairs)

    def evaluate_batch(self, query: str, chunks: list[dict],
                       threshold_high: float = 0.5,
                       threshold_low: float = 0.2) -> dict:
        scores = self.score(query, [c["text"] for c in chunks])
        max_score = max(scores) if scores else 0
        avg_score = sum(scores) / max(len(scores), 1)

        if max_score >= threshold_high:
            return {"grade": "A", "max_score": max_score, "scores": scores}
        elif avg_score >= threshold_low:
            return {"grade": "B", "max_score": max_score, "scores": scores}
        else:
            return {"grade": "C", "max_score": max_score, "scores": scores}
```

### Complete CRAG Pipeline
```python
class CorrectiveRAGPipeline:
    def __init__(self, retriever, evaluator, web_searcher, llm):
        self.retriever = retriever
        self.evaluator = evaluator
        self.web = web_searcher
        self.llm = llm

    async def query(self, q: str) -> dict:
        chunks = await self.retriever.retrieve(q, k=20)
        grade = self.evaluator.evaluate_batch(q, chunks)

        if grade["grade"] == "A":
            return await self._generate_from_chunks(q, chunks, grade)
        elif grade["grade"] == "B":
            return await self._decompose_and_retrieve(q, chunks, grade)
        else:
            return await self._web_fallback(q)

    async def _generate_from_chunks(self, q, chunks, grade) -> dict:
        top_chunks = self._select_top_chunks(chunks, grade["scores"], n=5)
        context = "\n\n".join(c["text"] for c in top_chunks)
        answer = await self.llm.ainvoke(
            f"Context:\n{context}\n\nQuestion: {q}\n\nAnswer with citations:"
        )
        return {"answer": answer, "strategy": "direct", "source_count": len(top_chunks)}

    async def _decompose_and_retrieve(self, q, chunks, grade) -> dict:
        sub_queries = await self._decompose(q)
        all_chunks = list(chunks)
        for sq in sub_queries:
            more = await self.retriever.retrieve(sq, k=5)
            all_chunks.extend(more)

        all_scores = self.evaluator.score(q, [c["text"] for c in all_chunks])
        top_chunks = self._select_top_chunks(all_chunks, all_scores, n=8)

        context = "\n\n".join(c["text"] for c in top_chunks)
        answer = await self.llm.ainvoke(
            f"Use multiple sources to answer comprehensively.\n\nContext:\n{context}\n\nQuestion: {q}\n\nAnswer:"
        )
        return {"answer": answer, "strategy": "decomposed", "sub_queries": sub_queries}

    async def _web_fallback(self, q) -> dict:
        web_results = await self.web.search(q)
        context = "\n\n".join(r["snippet"] for r in web_results[:5])
        answer = await self.llm.ainvoke(
            f"Based on web search results:\n\n{context}\n\nQuestion: {q}\n\nAnswer with source URLs:"
        )
        return {"answer": answer, "strategy": "web_search", "sources": web_results[:3]}

    def _select_top_chunks(self, chunks, scores, n: int):
        paired = list(zip(chunks, scores))
        paired.sort(key=lambda x: x[1], reverse=True)
        return [p[0] for p in paired[:n]]

    async def _decompose(self, q: str) -> list[str]:
        resp = await self.llm.ainvoke(
            f"Break this question into sub-questions: {q}\nSub-questions (one per line):"
        )
        return [l.strip() for l in resp.content.strip().split("\n") if l.strip() and len(l) > 5]
```

### CRAG Configuration
| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| threshold_high | 0.5 | 0.3-0.8 | Higher = fewer A-grades, stricter |
| threshold_low | 0.2 | 0.05-0.4 | Lower = fewer web fallbacks |
| decomposition N | 3 | 2-5 | More = better coverage, higher latency |
| web search top-K | 5 | 3-10 | More = better coverage, more noise |

---

## 3. Adaptive RAG — Deep Implementation

### Query Complexity Classifier (Feature-Based)
```python
class FeatureBasedClassifier:
    def __init__(self):
        self.complex_patterns = [
            r"\b(compare|contrast|difference|similarities)\b",
            r"\b(why|how|explain|describe|analyze)\b",
            r"\b(since|because|therefore|causes|leads to)\b",
            r"\b(multiple|several|various|different)\b.*\b(factors|reasons|ways|types)\b",
        ]
        self.ambiguous_patterns = [
            r"\b(it|they|this|that|these|those)\b",
            r"^\w+$",  # single word queries
        ]

    def classify(self, query: str) -> str:
        query_lower = query.lower()

        word_count = len(query.split())
        if word_count <= 2:
            return "ambiguous"

        for pat in self.complex_patterns:
            if __import__("re").search(pat, query_lower):
                return "complex"

        for pat in self.ambiguous_patterns:
            if __import__("re").search(pat, query_lower):
                return "ambiguous"

        return "simple"
```

### LLM-Based Classifier with Confidence
```python
class LLMComplexityClassifier:
    def __init__(self, llm, confidence_threshold: float = 0.8):
        self.llm = llm
        self.confidence_threshold = confidence_threshold

    async def classify(self, query: str) -> tuple[str, float]:
        prompt = f"""Classify this query and rate your confidence (0-1).
Classes: simple (direct fact lookup), complex (multi-step reasoning), ambiguous (vague).

Query: {query}
Class:"""
        result = await self.llm.ainvoke(prompt)
        text = result.content.strip().lower()
        class_ = "simple"
        if "complex" in text:
            class_ = "complex"
        elif "ambigu" in text:
            class_ = "ambiguous"

        confidence_prompt = f"""Rate confidence 0-1 that this query is {class_}:
Query: {query}
Confidence:"""
        conf_result = await self.llm.ainvoke(confidence_prompt)
        try:
            confidence = float(conf_result.content.strip())
        except ValueError:
            confidence = 0.5

        if confidence < self.confidence_threshold:
            class_ = "complex"  # default to expensive path when uncertain

        return class_, confidence
```

### Strategy Profiles
```python
STRATEGY_PROFILES = {
    "simple": {
        "retriever": "bm25",
        "top_k": 3,
        "rerank": False,
        "max_context_tokens": 512,
        "llm_instructions": "Answer concisely and factually.",
        "cache_ttl": 3600,
    },
    "complex": {
        "retriever": "dense_multi_query",
        "top_k": 15,
        "rerank": True,
        "rerank_candidates": 50,
        "max_context_tokens": 3000,
        "llm_instructions": "Provide a detailed, well-reasoned answer with supporting evidence.",
        "cache_ttl": 300,
    },
    "ambiguous": {
        "retriever": "hybrid_rrf",
        "top_k": 20,
        "rerank": True,
        "rerank_candidates": 100,
        "max_context_tokens": 4000,
        "llm_instructions": "Cover multiple possible interpretations and perspectives.",
        "cache_ttl": 60,
    },
}
```

### Adaptive Router with Dynamic Top-K
```python
class AdaptiveRouter:
    def __init__(self, classifier, retrievers, llm, profiles: dict):
        self.classifier = classifier
        self.retrievers = retrievers
        self.llm = llm
        self.profiles = profiles
        self.stats = {"simple": 0, "complex": 0, "ambiguous": 0}

    async def query(self, q: str) -> dict:
        query_type, confidence = await self.classifier.classify(q)
        self.stats[query_type] += 1
        profile = self.profiles[query_type]

        retriever = self.retrievers[profile["retriever"]]
        chunks = await retriever.retrieve(q, k=profile["top_k"] * 2)

        if profile.get("rerank"):
            reranker = self.retrievers.get("reranker")
            if reranker:
                chunks = await reranker.rerank(q, chunks, top_n=profile["top_k"])

        context = self._format_context(chunks, profile["max_context_tokens"])
        answer = await self.llm.ainvoke(
            f"{profile['llm_instructions']}\n\nContext:\n{context}\n\nQuestion: {q}\n\nAnswer:"
        )

        return {
            "answer": answer,
            "query_type": query_type,
            "confidence": confidence,
            "chunks_used": min(len(chunks), profile["top_k"]),
        }

    def _format_context(self, chunks, max_tokens):
        selected = []
        tokens = 0
        for c in sorted(chunks, key=lambda x: x.get("score", 0), reverse=True):
            ct = len(c["text"].split()) * 1.3
            if tokens + ct <= max_tokens:
                selected.append(c)
                tokens += ct
        return "\n\n".join(
            f"[{c['metadata'].get('source', '?')}] {c['text']}" for c in selected
        )
```

---

## 4. Fusion RAG — Deep Implementation

### Source Abstraction
```python
from abc import ABC, abstractmethod

class RetrievalSource(ABC):
    @abstractmethod
    async def retrieve(self, query: str, k: int) -> list[dict]:
        pass

class VectorDBSource(RetrievalSource):
    def __init__(self, embedder, db, name: str = "vector_db"):
        self.embedder = embedder
        self.db = db
        self.name = name

    async def retrieve(self, query: str, k: int) -> list[dict]:
        vec = await self.embedder.encode_async(query)
        results = await self.db.search_async(vec, k)
        for r in results:
            r["_source"] = self.name
        return results

class BM25Source(RetrievalSource):
    def __init__(self, index, name: str = "bm25"):
        self.index = index
        self.name = name

    async def retrieve(self, query: str, k: int) -> list[dict]:
        results = self.index.search(query, k)
        for r in results:
            r["_source"] = self.name
        return results

class KnowledgeGraphSource(RetrievalSource):
    def __init__(self, kg_client, name: str = "kg"):
        self.kg = kg_client
        self.name = name

    async def retrieve(self, query: str, k: int) -> list[dict]:
        entities = await self.kg.extract_entities(query)
        results = await self.kg.query(entities, k)
        for r in results:
            r["_source"] = self.name
        return results

class WebSearchSource(RetrievalSource):
    def __init__(self, web_client, name: str = "web"):
        self.web = web_client
        self.name = name

    async def retrieve(self, query: str, k: int) -> list[dict]:
        results = await self.web.search(query, k)
        for r in results:
            r["_source"] = self.name
        return results
```

### Fusion Engine
```python
class FusionEngine:
    def __init__(self, sources: list[RetrievalSource], method: str = "rrf"):
        self.sources = sources
        self.method = method

    async def retrieve(self, query: str, k: int = 10, k_rrf: int = 60) -> list[dict]:
        if self.method == "rrf":
            return await self._rrf_fusion(query, k, k_rrf)
        elif self.method == "weighted":
            return await self._weighted_fusion(query, k)
        else:
            raise ValueError(f"Unknown fusion method: {self.method}")

    async def _rrf_fusion(self, query: str, k: int, k_rrf: int) -> list[dict]:
        all_rankings = []
        for source in self.sources:
            results = await source.retrieve(query, k=k * 2)
            all_rankings.append(results)

        scores = {}
        docs = {}
        for rankings in all_rankings:
            for rank, doc in enumerate(rankings):
                doc_id = doc["id"]
                scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k_rrf + rank + 1)
                if doc_id not in docs:
                    docs[doc_id] = doc

        sorted_ids = sorted(scores, key=scores.get, reverse=True)[:k]
        return [docs[id_] for id_ in sorted_ids]

    async def _weighted_fusion(self, query: str, k: int) -> list[dict]:
        all_results = []
        weights = {}
        for i, source in enumerate(self.sources):
            results = await source.retrieve(query, k=k)
            all_results.extend(results)
            weight = getattr(source, "weight", 1.0)
            for r in results:
                weights[r["id"]] = weights.get(r["id"], 0) + weight

        seen = set()
        unique_results = []
        for r in sorted(all_results, key=lambda x: weights.get(x["id"], 0), reverse=True):
            if r["id"] not in seen:
                unique_results.append(r)
                seen.add(r["id"])
        return unique_results[:k]
```

### Diverse Context Selection from Fusion Results
```python
class DiverseContextSelector:
    def __init__(self, source_diversity_weight: float = 0.3):
        self.lambda_ = source_diversity_weight

    def select(self, query_vec: list[float], candidates: list[dict], n: int = 10) -> list[dict]:
        selected = []
        candidate_scores = []

        for c in candidates:
            relevance = c.get("score", 0.5)
            if selected:
                max_sim = max(
                    self._cosine_sim(query_vec, s.get("__embedding", query_vec))
                    for s in selected
                )
                diversity_penalty = (1 - self.lambda_) * max_sim
            else:
                diversity_penalty = 0
            final_score = self.lambda_ * relevance - diversity_penalty
            candidate_scores.append((c, final_score))

        candidate_scores.sort(key=lambda x: x[1], reverse=True)
        return [c for c, _ in candidate_scores[:n]]

    def _cosine_sim(self, a, b):
        import numpy as np
        a_np = np.array(a)
        b_np = np.array(b)
        return np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np) + 1e-8)
```

---

## Pattern Composition Guide

### Common Compositions

| Composition | Pattern | Use Case |
|-------------|---------|----------|
| Adaptive → CRAG | Classify query → route → evaluator checks quality → fallback if needed | Production with unknown query distribution |
| Fusion → Self-RAG | Multi-source retrieval → self-verify each source contribution | Multi-source enterprise search |
| Adaptive → Fusion → CRAG | Classify → multi-source retrieve → evaluate → fallback | Full enterprise with diverse data |
| Naive + HyDE | Simple retrieval with hypothetical doc | Quick improvement without pipeline changes |

### Composition Anti-Patterns

| Composition | Problem |
|-------------|---------|
| Self-RAG + Multi-Query | Multiple LLM calls compound: 3x-5x retrieval × 2x-3x reflection = 6x-15x latency |
| CRAG + Web Fallback + Fusion | Too many fallback layers; hard to debug, unpredictable latency |
| All patterns at once | Analysis paralysis + unmanageable complexity; start simple |

---

## Key Points
- Self-RAG improves faithfulness but requires training or careful prompting; use for hallucination-critical apps.
- CRAG handles knowledge base coverage gaps gracefully; essential for production systems with incomplete corpora.
- Adaptive RAG optimizes cost and latency by matching strategy to query; only useful when query distribution is diverse.
- Fusion RAG maximizes recall across heterogeneous sources; use when no single source is comprehensive.
- Compose advanced patterns intentionally — each layer adds latency and complexity.
- Measure the marginal benefit of each pattern: remove it if metrics don't improve.
- Document which failure mode each pattern addresses and how it's triggered.
- Calibrate thresholds (evaluator scores, confidence) on held-out data, not at inference time.
