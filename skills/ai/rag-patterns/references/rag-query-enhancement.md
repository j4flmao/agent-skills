# Query Enhancement Strategies

## Overview
Query enhancement transforms the user's raw query into one or more search queries that are better aligned with the indexed document corpus. Enhancement happens **pre-retrieval** and can significantly improve recall and precision.

## Strategy Decision Tree
```
Is the query short (< 5 words) or ambiguous?
  ├── Yes → Query Rewriting (expand, disambiguate)
  │         └── Also consider: HyDE if documents are long/detailed
  └── No  → Is the query multi-faceted (multiple sub-topics)?
            ├── Yes → Multi-Query (generate variants)
            └── No  → Does the query require reasoning?
                      ├── Yes → Step-Back + direct retrieval
                      └── No  → No enhancement needed
```

## Strategy Comparison

| Strategy | Use Case | Recall Impact | Latency Cost | Complexity |
|----------|----------|---------------|--------------|------------|
| Query Rewriting | Short, ambiguous, typo-ridden queries | +10-20% | 10-30ms | Low |
| HyDE | Short queries vs long documents | +5-15% | 50-200ms (LLM gen + embed) | Low |
| Multi-Query | Multi-faceted queries | +15-25% | 3x-5x retrieval | Medium |
| Step-Back | Complex reasoning questions | +10-20% | 2x retrieval | Medium |
| Query Expansion (terms) | Keyword-deficient queries | +5-10% | Negligible | Low |

---

## Query Rewriting

### Purpose
Transforms a user query into a form more likely to match indexed documents. Expands abbreviations, fixes typos, adds context, and rephrases for vector search.

### Implementation
```python
class QueryRewriter:
    def __init__(self, llm, examples: list[tuple[str, str]] | None = None):
        self.llm = llm
        self.examples = examples or [
            ("what's RAG", "What is Retrieval-Augmented Generation"),
            ("how to chunk PDFs", "How to split PDF documents into chunks for RAG retrieval"),
            ("best emb model 2026", "Best performing embedding models in 2026 for text retrieval"),
        ]

    async def rewrite(self, query: str, history: list[str] | None = None) -> str:
        prompt = "Rewrite these search queries for optimal retrieval.\n\n"
        for raw, rewritten in self.examples:
            prompt += f"Original: {raw}\nRewritten: {rewritten}\n\n"
        prompt += f"Original: {query}\nRewritten:"

        result = await self.llm.ainvoke(prompt)
        return result.content.strip()

    async def rewrite_with_history(self, query: str, history: list[str]) -> str:
        context = " | ".join(history[-3:])
        prompt = f"""Conversation: {context}
Current query: {query}

Rewrite the query for vector search, incorporating relevant conversation context.
Rewritten:"""
        result = await self.llm.ainvoke(prompt)
        return result.content.strip()
```

### Prompt Templates by Query Type

| Query Type | Rewrite Instruction |
|-----------|-------------------|
| Definition | "Expand acronyms and use full terminology" |
| How-to | "Use imperative + noun phrase format matching documentation titles" |
| Comparison | "Rephrase as 'difference between X and Y' or 'X vs Y'" |
| Troubleshooting | "Extract error code and component name; format as 'error CODE when doing ACTION'" |

### When to Skip Rewriting
- Query is already well-formed and domain-aligned.
- Query contains code snippets or precise identifiers (these degrade with rewrites).
- Latency budget cannot accommodate the extra LLM call.

---

## HyDE (Hypothetical Document Embeddings)

### Concept
Instead of embedding the query directly, generate a hypothetical ideal document that would contain the answer, then embed that document and use it for retrieval. This bridges the distribution gap between short queries and long documents.

### Why HyDE Works
- Short queries (5-10 words) produce poor embeddings for document retrieval.
- LLM-generated hypothetical documents (50-200 words) produce embeddings in document space.
- Document-space embeddings match stored chunk embeddings better.

### Implementation
```python
class HyDE:
    def __init__(self, llm, embedder, vector_db, domain_prompt: str = ""):
        self.llm = llm
        self.embedder = embedder
        self.db = vector_db
        self.domain_prompt = domain_prompt

    async def retrieve(self, query: str, top_k: int = 10) -> list[dict]:
        prompt = f"""{self.domain_prompt}
Generate a passage that would answer this question perfectly.
Write in the style of a textbook or technical documentation.
Be specific and detailed.

Question: {query}
Passage:"""

        hypothetical = await self.llm.ainvoke(prompt)
        hyde_embedding = await self.embedder.encode_async(hypothetical.content)
        results = await self.db.search_async(hyde_embedding, top_k)
        return results

    async def retrieve_with_fallback(self, query: str, top_k: int = 10) -> list[dict]:
        hyde_results = await self.retrieve(query, top_k)
        direct_embedding = await self.embedder.encode_async(query)
        direct_results = await self.db.search_async(direct_embedding, top_k)

        seen = set()
        combined = []
        for r in hyde_results + direct_results:
            if r["id"] not in seen:
                combined.append(r)
                seen.add(r["id"])

        return combined[:top_k]
```

### Domain Prompt Templates
```python
DOMAIN_PROMPTS = {
    "medical": "Generate a clinical passage written in medical terminology as found in PubMed abstracts.",
    "legal": "Generate a legal analysis paragraph written in the style of case law and statutes.",
    "code": "Generate a code documentation snippet with function signatures, parameters, and usage examples.",
    "finance": "Generate a financial analysis paragraph with metrics, benchmarks, and market context.",
    "general": "Generate a Wikipedia-style informative paragraph with definitions, examples, and context.",
}
```

### HyDE Caveats
- Quality depends on LLM's domain knowledge — a poor hypothetical degrades retrieval.
- Adds latency: one LLM call + one embedding call per query.
- Best when queries are 1-10 words and documents are 100+ words.
- Not useful when the query is already document-like in style and length.

---

## Multi-Query Search

### Concept
Generate multiple distinct query variations from the original query, retrieve for each, and merge results. Each variant captures a different aspect or framing of the information need.

### Implementation
```python
class MultiQuerySearch:
    def __init__(self, llm, retriever, n_variants: int = 3):
        self.llm = llm
        self.retriever = retriever
        self.n = n_variants

    async def generate_variants(self, query: str) -> list[str]:
        prompt = f"""Generate {self.n} distinct search queries that explore different aspects of:
Query: {query}

Requirements:
- Each query should use different wording
- Capture different facets or perspectives
- Useful for finding relevant documents in a knowledge base

Queries:"""
        result = await self.llm.ainvoke(prompt)
        lines = [l.strip() for l in result.content.strip().split("\n") if l.strip()]
        queries = []
        for line in lines:
            cleaned = line
            for prefix in ["1.", "2.", "3.", "4.", "5.", "-", "*"]:
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):].strip()
                    break
            if cleaned:
                queries.append(cleaned)
        return queries[:self.n]

    async def retrieve(self, query: str, top_k: int = 10) -> list[dict]:
        variants = await self.generate_variants(query)
        all_queries = [query] + variants
        all_results = []
        seen_ids = set()

        for q in all_queries:
            results = await self.retriever.retrieve(q, top_k=top_k // 2)
            for r in results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    all_results.append(r)

        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return all_results[:top_k]

    async def retrieve_weighted(self, query: str, top_k: int = 10) -> list[dict]:
        variants = await self.generate_variants(query)
        all_queries = [query] + variants
        doc_scores = {}

        for q in all_queries:
            results = await self.retriever.retrieve(q, top_k=top_k)
            for rank, r in enumerate(results):
                score = 1.0 / (60 + rank + 1)  # RRF-style
                if r["id"] in doc_scores:
                    doc_scores[r["id"]]["score"] += score
                    doc_scores[r["id"]]["count"] += 1
                else:
                    doc_scores[r["id"]] = {"doc": r, "score": score, "count": 1}

        ranked = sorted(doc_scores.values(), key=lambda x: x["score"], reverse=True)
        return [item["doc"] for item in ranked[:top_k]]
```

### Configuration Guidelines
| Corpus Size | N Variants | Top-K per Variant |
|-------------|-----------|-------------------|
| < 10k docs | 2-3 | 5-10 |
| 10k-100k | 3-4 | 10-15 |
| > 100k | 3-5 | 10-20 |

### When Multi-Query Hurts
- Query is already narrow and specific (no diversity to capture).
- Corpus is homogeneous (all documents cover the same topic — variants produce the same results).
- Latency is critical (3x-5x retrieval cost).

---

## Step-Back Prompting

### Concept
For questions requiring reasoning, first retrieve for a broader "step-back" question, then combine with direct retrieval. The step-back question captures foundational knowledge.

### Implementation
```python
class StepBackRAG:
    def __init__(self, llm, retriever):
        self.llm = llm
        self.retriever = retriever

    async def generate_step_back(self, query: str) -> str:
        prompt = f"""What broader concept or principle is this question really about?
Provide a step-back question that would help answer the original.

Original: {query}
Step-back question:"""
        result = await self.llm.ainvoke(prompt)
        return result.content.strip()

    async def retrieve(self, query: str, top_k: int = 10) -> list[dict]:
        step_back_q = await self.generate_step_back(query)
        sb_results = await self.retriever.retrieve(step_back_q, top_k // 2)
        direct_results = await self.retriever.retrieve(query, top_k // 2)

        seen = set()
        combined = []
        for r in sb_results + direct_results:
            if r["id"] not in seen:
                combined.append(r)
                seen.add(r["id"])
        return combined[:top_k]
```

### Example
```
Original: "What causes gradient explosion in deep transformers?"
Step-back: "What are the fundamental causes of vanishing and exploding gradients in neural networks?"
```
The step-back retrieves foundational content; the direct retrieval catches transformer-specific details.

---

## Query Expansion (Term-Level)

### Purpose
Add relevant terms to the query to improve term matching, especially for sparse (BM25) retrieval.

### Implementation
```python
class QueryExpander:
    def __init__(self, llm):
        self.llm = llm

    async def expand_terms(self, query: str) -> str:
        prompt = f"""Add 3-5 relevant search terms or synonyms to this query.
Return the original query plus additional terms separated by spaces.

Query: {query}
Expanded:"""
        result = await self.llm.ainvoke(prompt)
        return result.content.strip()

    def expand_from_thesaurus(self, query: str, thesaurus: dict) -> str:
        words = query.split()
        expanded = set(words)
        for word in words:
            if word.lower() in thesaurus:
                expanded.update(thesaurus[word.lower()][:3])
        return " ".join(expanded)
```

---

## Quality Monitoring for Query Enhancement

| Signal | What It Detects | Action |
|--------|----------------|--------|
| Rewrite edit distance near 0 | LLM returned original unchanged | Check prompt or LLM quality |
| Rewrite adds > 50% more tokens | Over-expansion, may drift | Limit rewrite length |
| Multi-query variant overlap > 80% | Variants not diverse | Increase temperature |
| HyDE answer is empty/gibberish | LLM failure | Fall back to direct query |
| Step-back is same as original | LLM didn't abstract | Improve step-back prompt |
| Retrieval Recall drops after enhancement | Enhancement is harmful | Disable for this query type |

## Key Points
- Query enhancement is pre-retrieval optimization — it adds latency but can significantly improve recall.
- Start with query rewriting (lowest cost, highest ROI). Add HyDE, Multi-Query, Step-Back only when metrics show a gap.
- Measure retrieval recall before and after each enhancement to confirm value.
- Different query types benefit from different enhancement strategies — classify first, then enhance.
- Cache enhancement results: repeated queries with the same rewrite skip the LLM call.
- Enhancement interacts with the retriever — test end-to-end, not component in isolation.
- Consider a no-enhancement fast path: simple queries skip enhancement entirely.
