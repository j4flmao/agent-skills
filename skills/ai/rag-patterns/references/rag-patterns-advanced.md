# RAG Advanced Patterns Deep Dive

## Overview
This reference covers sophisticated RAG patterns that go beyond simple retrieve-and-generate: self-reflection, corrective retrieval, adaptive strategies, fusion, and routing architectures. These patterns address the core failure modes of Naive RAG — missed retrieval, hallucination, irrelevant context, and rigid one-size-fits-all strategies.

## Self-RAG (Self-Reflective RAG)

### Concept
Self-RAG trains or prompts the LLM to emit special **reflection tokens** during generation, controlling whether to retrieve and whether its output is supported by retrieved context. This makes the RAG process self-aware and self-correcting.

### Reflection Tokens
| Token | Meaning | Effect |
|-------|---------|--------|
| `<retrieve>` | Retrieval needed | Triggers retrieval step |
| `<no_retrieve>` | No retrieval needed | Uses parametric knowledge only |
| `<relevant>` | Retrieved context is relevant | Proceed with generation |
| `<irrelevant>` | Context not relevant | Re-retrieve or skip |
| `<supported>` | Generated text supported by context | Output as-is |
| `<unsupported>` | Text contradicts context | Revise generation |
| `<useful>` | Output is useful for the query | Keep output |
| `<not_useful>` | Output is not useful | Re-generate |

### Implementation Sketch
```python
class SelfRAG:
    def __init__(self, model, retriever, tokenizer):
        self.model = model  # fine-tuned for reflection tokens
        self.retriever = retriever
        self.tokenizer = tokenizer

    async def generate(self, query: str) -> str:
        reflection = await self.model.generate(f"Query: {query}\n<retrieve>")
        if "<retrieve>" in reflection:
            chunks = await self.retriever.retrieve(query)
            context = "\n".join(chunks)

            draft = await self.model.generate(
                f"Query: {query}\nContext: {context}\nDraft:"
            )

            support_check = await self.model.generate(
                f"Query: {query}\nDraft: {draft}\n<supported> or <unsupported>?"
            )

            if "<unsupported>" in support_check:
                draft = await self.model.generate(
                    f"Query: {query}\nContext: {context}\nRevise draft: {draft}\nImproved:"
                )

            return draft
        else:
            return await self.model.generate(f"Query: {query}\nAnswer:")
```

### When to Use Self-RAG
- Applications where hallucination is unacceptable (medical, legal, finance).
- When the model must decide whether to retrieve (saving cost for simple queries).
- Systems with a clear preference for grounded over fluent but unsupported output.

### Limitations
- Requires fine-tuning or specialized prompting for reflection tokens.
- Increases token usage (multiple generation calls per query).
- More complex to evaluate (need to track reflection quality).

---

## Corrective RAG (CRAG)

### Concept
CRAG introduces a **retrieval evaluator** that scores the quality of retrieved documents. When retrieval quality is low, CRAG triggers corrective actions: web search fallback, query decomposition, or alternative retrieval strategies.

### Architecture
```
Query
  │
  ▼
Retrieve from Vector DB
  │
  ▼
Retrieval Evaluator (cross-encoder scoring)
  │
  ├── High confidence (> threshold)
  │     └── Generate with retrieved context
  │
  ├── Low confidence (marginal)
  │     ├── Query decomposition → sub-queries
  │     ├── Retrieve for each sub-query
  │     └── Generate from combined results
  │
  └── Low confidence (no relevant results)
        ├── Web search or fallback KB
        ├── Combine web + vector DB results
        └── Generate from combined results
```

### Retrieval Evaluator
```python
class RetrievalEvaluator:
    def __init__(self, scoring_model, threshold_high=0.7, threshold_low=0.3):
        self.model = scoring_model
        self.threshold_high = threshold_high
        self.threshold_low = threshold_low

    async def evaluate(self, query: str, chunks: list[dict]) -> str:
        scores = []
        for chunk in chunks:
            score = await self.model.score(query, chunk["text"])
            scores.append(score)

        avg_score = sum(scores) / max(len(scores), 1)
        max_score = max(scores) if scores else 0

        if max_score >= self.threshold_high:
            return "high", chunks
        elif avg_score >= self.threshold_low:
            return "low", chunks
        else:
            return "none", chunks
```

### Corrector
```python
class CRAGCorrector:
    def __init__(self, vector_retriever, web_search, llm, evaluator):
        self.vector_retriever = vector_retriever
        self.web_search = web_search
        self.llm = llm
        self.evaluator = evaluator

    async def query(self, query: str) -> dict:
        chunks = await self.vector_retriever.retrieve(query, k=10)
        level, chunks = await self.evaluator.evaluate(query, chunks)

        if level == "high":
            context = self._format_chunks(chunks)
        elif level == "low":
            sub_queries = await self._decompose_query(query)
            all_chunks = list(chunks)
            for sq in sub_queries:
                more = await self.vector_retriever.retrieve(sq, k=5)
                all_chunks.extend(more)
            context = self._format_chunks(all_chunks)
        else:
            web_results = await self.web_search.search(query, k=5)
            context = self._format_web_results(web_results)

        prompt = f"""Context:\n{context}\n\nQuestion: {query}\n\nAnswer with citations:"""
        answer = await self.llm.ainvoke(prompt)
        return {"answer": answer, "strategy": level}

    async def _decompose_query(self, query: str) -> list[str]:
        prompt = f"""Break this question into 2-3 simpler sub-questions for better retrieval:
Query: {query}
Sub-questions:"""
        result = await self.llm.ainvoke(prompt)
        return [line.strip() for line in result.content.strip().split("\n") if line.strip() and ". " in line[:4]]
```

### When to Use CRAG
- Heterogeneous query distribution (some simple, some complex).
- Knowledge base has coverage gaps (CRAG handles gracefully).
- Production systems requiring consistent quality across query types.

### Limitations
- Adds latency (evaluator + corrective action).
- Web search fallback may surface low-quality or conflicting information.
- Determining evaluator thresholds requires calibration.

---

## Adaptive RAG

### Concept
Adaptive RAG uses a **query complexity classifier** to route each query to the optimal retrieval strategy. Simple factual queries use fast BM25; complex reasoning queries use dense + multi-hop; ambiguous queries use rewrite + hybrid.

### Query Complexity Classifier
```python
class QueryComplexityClassifier:
    def __init__(self, llm):
        self.llm = llm

    async def classify(self, query: str) -> str:
        prompt = f"""Classify this query into one of:
- simple: factual lookup, short query, single entity
- complex: multi-step reasoning, comparison, analysis
- ambiguous: vague terms, multiple interpretations

Query: {query}
Classification:"""
        result = await self.llm.ainvoke(prompt)
        label = result.content.strip().lower()
        if "complex" in label:
            return "complex"
        elif "ambigu" in label:
            return "ambiguous"
        return "simple"
```

### Adaptive Router
```python
class AdaptiveRAG:
    def __init__(self, classifier, bm25_retriever, dense_retriever, hyrid_retriever, llm):
        self.classifier = classifier
        self.retrievers = {
            "simple": bm25_retriever,
            "complex": dense_retriever,
            "ambiguous": hyrid_retriever,
        }
        self.llm = llm

    async def query(self, query: str) -> dict:
        query_type = await self.classifier.classify(query)
        retriever = self.retrievers[query_type]

        top_k = {"simple": 3, "complex": 10, "ambiguous": 15}[query_type]
        chunks = await retriever.retrieve(query, k=top_k)

        system_prompt = f"You are answering a {query_type} query. Be {'concise and factual' if query_type == 'simple' else 'thorough with reasoning' if query_type == 'complex' else 'comprehensive covering multiple angles'}."

        context = "\n\n".join(c["text"] for c in chunks)
        prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {query}\n\nAnswer:"
        answer = await self.llm.ainvoke(prompt)
        return {"answer": answer, "query_type": query_type, "retrieval_strategy": query_type}
```

### Strategy Configuration Table
| Query Type | Retriever | Top-K | Re-rank | LLM Mode |
|-----------|-----------|-------|---------|----------|
| Simple/Factual | BM25 | 3-5 | No | Concise |
| Complex/Reasoning | Dense (multi-query) | 10-15 | Yes | Detailed with reasoning |
| Ambiguous/Broad | Hybrid (RRF) | 15-20 | Yes | Comprehensive, covering angles |

### When to Use Adaptive RAG
- Production systems with diverse user queries.
- Cost optimization: cheap retrieval for simple queries, expensive for complex ones.
- When user satisfaction depends on matching query difficulty to answer depth.

---

## Fusion RAG (FRAG)

### Concept
Fusion RAG retrieves from multiple heterogeneous knowledge sources and combines results before generation. Sources may include vector DB, BM25 index, knowledge graph, SQL database, and web search.

### Multi-Source Fuser
```python
class MultiSourceFuser:
    def __init__(self):
        self.sources = {}

    def register_source(self, name: str, retriever, weight: float = 1.0):
        self.sources[name] = {"retriever": retriever, "weight": weight}

    async def retrieve_all(self, query: str, top_k_per_source: int = 10) -> list[dict]:
        all_results = []

        for name, source in self.sources.items():
            results = await source["retriever"].retrieve(query, k=top_k_per_source)
            for r in results:
                r["_source"] = name
                r["_weight"] = source["weight"]
                all_results.append(r)

        return all_results

    async def fusion_rrf(self, query: str, top_k: int = 10, k_rrf: int = 60) -> list[dict]:
        source_rankings = {}
        for name in self.sources:
            source_rankings[name] = await self.sources[name]["retriever"].retrieve(query, k=top_k * 2)

        scores = {}
        docs = {}
        for name, results in source_rankings.items():
            for rank, doc in enumerate(results):
                doc_id = doc["id"]
                scores[doc_id] = scores.get(doc_id, 0) + 1 / (k_rrf + rank + 1)
                if doc_id not in docs:
                    docs[doc_id] = doc

        sorted_ids = sorted(scores, key=scores.get, reverse=True)[:top_k]
        return [docs[id] for id in sorted_ids]
```

### When to Use Fusion RAG
- Enterprise search across multiple document repositories.
- Combining internal knowledge base with real-time web data.
- When different sources cover complementary aspects of the knowledge domain.

---

## Advanced Query Routing

### Intent-Based Routing
```python
class IntentRouter:
    def __init__(self, llm, routers: dict):
        self.llm = llm
        self.routers = routers  # intent -> retriever config

    async def route(self, query: str) -> tuple:
        prompt = f"""Route this query to one of: {list(self.routers.keys())}
Query: {query}
Route:"""
        intent = (await self.llm.ainvoke(prompt)).content.strip()
        return intent, self.routers.get(intent, self.routers.get("default"))
```

| Intent | Retriever | Source | Strategy |
|--------|-----------|--------|----------|
| factual | BM25 | Internal wiki | Exact match |
| troubleshooting | Dense + Re-rank | Docs + forum | Semantic similarity |
| comparison | Multi-query | Multiple sources | Coverage |
| creative | Dense (low temp) | General corpus | Broad retrieval |
| recent | Web search | Internet | Freshness |

---

## Pattern Selection Guide

| Pattern | Best For | Latency Impact | Complexity | Quality Gain |
|---------|----------|---------------|------------|--------------|
| Naive RAG | Prototypes, simple QA | Low | Low | Baseline |
| Advanced RAG (rewrite + re-rank) | Production, general | Medium | Medium | +15-25% |
| Self-RAG | Hallucination-critical | High | High | +5-10% faithfulness |
| Corrective RAG | Coverage gaps | Medium-High | High | +10-20% robustness |
| Adaptive RAG | Diverse query types | Medium | Medium-High | +10-15% per-query quality |
| Fusion RAG | Multi-source knowledge | High | High | +15-30% recall |
| HyDE | Short/generic queries | Medium | Low | +5-15% recall |

---

## Implementation Considerations for Advanced Patterns

### Self-RAG: Token Efficiency
- Self-RAG may double or triple token usage per query.
- Mitigation: cache reflection decisions; batch reflection checks.

### CRAG: Evaluator Calibration
- Test evaluator on held-out queries with known retrieval quality.
- Track precision/recall of the evaluator itself (meta-evaluation).

### Adaptive RAG: Classification Accuracy
- Misclassifying a complex query as simple produces low-quality answers.
- Use a classifier with confidence threshold: if uncertain, default to expensive path.

### Fusion RAG: Source Freshness
- Different sources have different update cadences.
- Tag each result with its source timestamp. Fuse with recency bias.

---

## Key Points
- Advanced patterns address specific failure modes: Self-RAG for hallucination, CRAG for coverage gaps, Adaptive for query diversity, Fusion for multi-source.
- Every advanced pattern adds latency. Budget accordingly or use async parallelism.
- Pattern selection depends on query distribution, latency requirements, and failure tolerance.
- Evaluators and classifiers within advanced patterns need their own evaluation and calibration.
- Start with Naive RAG, add complexity only when metrics show a clear gap.
- Document the specific failure mode each pattern addresses and how you validate it's working.
- Advanced patterns can be combined: Adaptive-CRAG routes queries and handles failures; Fusion with Self-RAG verifies multi-source output.
