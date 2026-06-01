---
name: ai-rag-patterns
description: >
  Build and optimize Retrieval-Augmented Generation systems — from chunking strategies and embedding selection through advanced patterns (Self-RAG, Corrective RAG, Fusion RAG), indexing pipelines, query enhancement, and production deployment.
  This skill enforces: chunking strategy documentation, embedding model specification, retrieval configuration, re-ranking pipeline, context budget tracking, evaluation plan.
  Do NOT use for: prompt engineering, fine-tuning, model evaluation, vector database operations alone.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, rag, phase-10]
---

# RAG Patterns Agent

## Purpose
Design retrieval-augmented generation pipelines with optimal chunking, embedding selection, retrieval strategy, context integration, evaluation, and production hardening.

## Agent Protocol

### Trigger
User request includes: RAG, retrieval-augmented, embedding, vector search, chunking, hybrid search, re-ranker, context window, dense retrieval, sparse retrieval, Self-RAG, Corrective RAG, Fusion RAG, Adaptive RAG, HyDE, query rewriting.

### Protocol
1. **Clarify scope**: document type, corpus size, latency requirements, LLM context window, precision vs recall needs.
2. **Select RAG architecture**: Naive → Advanced → Modular based on requirements.
3. **Design indexing pipeline**: ingestion → chunking → embedding → indexing with metadata.
4. **Choose retrieval strategy**: dense, sparse, hybrid; decision tree driven.
5. **Apply query enhancement**: rewriting, HyDE, multi-query as needed.
6. **Configure re-ranking**: cross-encoder or lightweight based on latency budget.
7. **Assemble context**: within LLM token budget with overflow strategy.
8. **Plan evaluation**: retrieval metrics, generation metrics, end-to-end scores.
9. **Document anti-patterns avoided**: explicit reasoning for each.

## Decision Trees

### Retrieval Strategy Decision Tree
```
Does the corpus have varied content types (code, prose, tables)?
  ├── Yes → Does precision above top-5 matter?
  │         ├── Yes → Hybrid + re-ranker
  │         └── No  → Hybrid search (RRF fusion)
  └── No  → Is the content primarily factual/keyword-heavy?
            ├── Yes → Sparse (BM25/SPLADE)
            └── No  → Dense (semantic embedding)
                   → Is latency critical?
                      ├── Yes → Lightweight model (MiniLM, 384d)
                      └── No  → High-quality model (E5-large, 1024d)
```

### Chunking Strategy Decision Tree
```
What is the document structure?
  ├── Unstructured prose (articles, papers)
  │     └── Semantic chunking (topic boundary detection)
  ├── Semi-structured (HTML, Markdown)
  │     └── Recursive chunking by heading hierarchy
  ├── Factual content (legal, medical, FAQ)
  │     └── Sentence chunking (N-sentence windows)
  └── Code / dense data
        └── Token chunking (fixed-size windows)
```
```
Is chunk coherence critical for retrieval quality?
  ├── Yes → Semantic chunking (higher compute cost)
  └── No  → Recursive chunking (simpler, deterministic)
```
```
What is the embedding model max token limit?
  ├── 512 tokens → chunk size 256-450
  ├── 8192 tokens → chunk size 512-2048 (BERT-length models)
  └── N/A (BM25 only) → chunk size by document structure
```

### Embedding Model Decision Tree
```
What is the corpus language?
  ├── English only → text-embedding-3-small/large, BGE, E5
  ├── Multilingual → multilingual-e5-large, Cohere embed-multilingual-v3
  └── Code-heavy  → code-search-ada, starencoder
```
```
What is the latency requirement for indexing?
  ├── Real-time → small model (<500MB, <5ms/doc)
  ├── Batch     → large model (any, GPU preferred)
  └── API-based → text-embedding-3, Cohere (managed)
```
```
What is the retrieval precision requirement?
  ├── Maximum precision → text-embedding-3-large (3072d), E5-mistral
  ├── Balanced         → BGE-large (1024d), text-embedding-3-small (512d)
  └── Speed critical   → MiniLM (384d), intfloat/e5-small-v2 (384d)
```

### Re-ranking Decision Tree
```
Is latency budget < 200ms total?
  ├── Yes → Skip re-ranking; use top-5 from retrieval
  └── No  → Is precision above top-5 required?
            ├── Yes → Cross-encoder re-ranker (BGE-reranker, Cohere)
            │        → Candidate pool: top 20-100
            │        → Output: top 3-10
            └── No  → Lightweight re-ranking or RRF only
```

## Architecture Progression

### Naive RAG (Baseline)
```
Query → Dense Retrieval → Concatenate Chunks → LLM Generate
```
- Single-shot retrieval, no query rewriting, no re-ranking.
- Best for: prototypes, small corpora (<10k docs), simple Q&A.
- Limitations: no handling of complex queries, no retrieval feedback, no multi-hop.

### Advanced RAG
```
Query → Query Rewrite → Hybrid Retrieval → Re-Rank → Context Assembly → LLM
                                  ↑
                           (optional) Self-RAG / Corrective feedback
```
- Pre-retrieval: query rewriting, expansion, HyDE.
- Post-retrieval: re-ranking, filtering, compression.
- Best for: production systems with varied query types and quality requirements.

### Modular RAG
```
                     ┌── Query Analysis ──┐
                     │   (routing,        │
                     │    decomposition)  │
                     └────────┬───────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          ┌──────────────┐      ┌──────────────────┐
          │ Retrieve     │      │ Retrieve (alt DB) │
          │ (vector DB)  │      │ (SQL, graph, web) │
          └──────┬───────┘      └────────┬─────────┘
                 │                       │
                 └──────────┬────────────┘
                            ▼
                     ┌──────────────┐
                     │ Fusion /     │
                     │ Re-rank      │
                     └──────┬───────┘
                            ▼
                     ┌──────────────┐
                     │ LLM Generate │
                     └──────────────┘
```
- Pluggable components: any retrieval source, any fusion strategy.
- Query routing: classify intent → route to appropriate retriever.
- Query decomposition: break complex questions into sub-queries.
- Best for: complex pipelines, multi-source retrieval, enterprise search.

## Advanced Patterns

### Self-RAG (Self-Reflective RAG)
LLM generates and reflects on its own output, deciding whether retrieval is needed and whether the generated text is supported.
```
Query → [Retrieve? Yes/No] → Retrieve if needed → Generate → [Is supported?] → Revise or output
        ↑                                                                           │
        └────────────────────────── Reflection tokens ──────────────────────────────┘
```
- Reflection tokens: `<retrieve>`, `<relevant>`, `<supported>`, `<useful>`.
- Training: fine-tune LLM to emit reflection tokens during generation.
- Key benefit: reduces hallucination by self-verifying against retrieved context.
- Implementation requires: fine-tuned model with retrieval/reflection heads.

### Corrective RAG (CRAG)
Evaluates retrieval quality and triggers corrective action when retrieval is insufficient.
```
Query → Retrieve → Evaluate relevance → [Confidence > threshold?]
  ├── Yes → Generate with retrieved context
  ├── Low  → Web search fallback + retrieve → Generate from combined
  └── No  → Web search → Generate from web results
```
- Relevance evaluator: lightweight T5 or cross-encoder scoring retrieved chunks.
- Fallback: query web search API or a secondary knowledge source.
- Decomposition: break into sub-queries if retrieval quality is marginal.
- Key benefit: graceful degradation when vector DB lacks coverage.

### Adaptive RAG
Dynamically adjusts retrieval strategy based on query complexity.
```
Query → Complexity Classifier → [Simple/Factual] → BM25 / sparse
                              → [Complex/Reasoning] → Dense + multi-hop
                              → [Ambiguous/Broad] → Query rewrite → Hybrid
```
- Query classifier: small LLM or logistic regression on query features (length, entities, question type).
- Strategy switching: per-query configuration of top-K, retrieval method, chunk size.
- Key benefit: optimal retrieval per query type instead of one-size-fits-all.

### Fusion RAG (FRAG)
Combines results from multiple retrieval strategies and sources into a unified result set.
```
Query → [Dense, Sparse, KB, Web] → Multi-source Fusion → Re-rank → Generate
```
- Multi-source: vector DB, BM25 index, knowledge graph, web search API.
- Fusion: RRF (no training needed) or learned ranker (LambdaMART).
- Context selection: select diverse sources to maximize coverage.
- Key benefit: maximum recall across heterogeneous knowledge sources.

### HyDE (Hypothetical Document Embeddings)
Generates a hypothetical ideal document from the query, then retrieves using its embedding.
```
Query → LLM → Hypothetical document → Embed → Retrieve using this embedding
```
- Advantages: bridges query-document vocabulary gap without training.
- When to use: queries are short/generic, documents are long/detailed.
- Caveat: LLM must understand the domain to generate realistic hypotheticals.

## Indexing Pipeline Architecture

### Full Ingestion Pipeline
```
Raw Documents
     │
     ▼
┌─────────────┐
│ Document    │  Load, parse, normalize, detect language
│ Loader      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Text        │  Strip markup, extract structure (headings, tables, lists)
│ Preprocess  │  Normalize whitespace, handle special characters
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Chunking    │  Strategy selected by document type (see Decision Tree)
│ Engine      │  Output: list of chunk objects with text + metadata
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Embedding   │  Batch encode chunks, normalize vectors
│ Service     │  Handle rate limits, retry on failure
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Index       │  Store vectors + metadata in vector DB
│ Writer      │  Build HNSW/IVF index, create metadata filters
└──────┬──────┘
       │
       ▼
  Index Ready
```

### Ingestion Code Example
```python
class IngestionPipeline:
    def __init__(self, loader, chunker, embedder, index_writer):
        self.loader = loader
        self.chunker = chunker
        self.embedder = embedder
        self.writer = index_writer

    async def run(self, source: str, batch_size: int = 100) -> dict:
        stats = {"docs": 0, "chunks": 0, "errors": 0}

        async for doc in self.loader.load(source):
            try:
                chunks = self.chunker.chunk(doc)
                texts = [c.text for c in chunks]
                metadatas = [c.metadata for c in chunks]

                embeddings = await self.embedder.encode_async(texts)

                await self.writer.upsert_batch(
            ids=[c.id for c in chunks],
            vectors=embeddings,
            metadatas=metadatas,
                )

                stats["docs"] += 1
                stats["chunks"] += len(chunks)
            except Exception as e:
                stats["errors"] += 1
                log.error(f"Failed to ingest {doc.id}: {e}")

        await self.writer.commit()
        return stats
```

### Chunk Metadata Schema
```json
{
  "id": "chunk_uuid",
  "doc_id": "source_doc_uuid",
  "index": 3,
  "text": "chunk content...",
  "tokens": 412,
  "source": "https://example.com/doc",
  "title": "Document Title",
  "section": "Section Heading",
  "page": 42,
  "embedding_model": "text-embedding-3-small",
  "embedding_dimensions": 512,
  "created_at": "2026-05-31T10:00:00Z",
  "checksum": "sha256-of-text"
}
```

## Query Enhancement Strategies

### Query Rewriting
LLM rewrites user query for better alignment with indexed documents.
```python
class QueryRewriter:
    def __init__(self, llm):
        self.llm = llm

    async def rewrite(self, query: str, history: list[str] | None = None) -> str:
        prompt = f"""Rewrite this search query to maximize retrieval quality.
- Expand abbreviations and acronyms
- Fix typos and grammatical errors
- Add missing context from conversation history
- Use terminology consistent with the knowledge base

Original query: {query}
"""
        if history:
            prompt += f"Conversation history: {' | '.join(history[-3:])}\n"

        prompt += "Rewritten query:"
        result = await self.llm.ainvoke(prompt)
        return result.content.strip()
```

### HyDE (Hypothetical Document Embeddings)
```python
class HyDERetriever:
    def __init__(self, llm, embedder, vector_db):
        self.llm = llm
        self.embedder = embedder
        self.db = vector_db

    async def retrieve(self, query: str, top_k: int = 10) -> list[dict]:
        prompt = f"""Generate a hypothetical document that would perfectly answer this query.
Write in the style and vocabulary of the target knowledge base.
Query: {query}
Hypothetical document:"""
        hypothetical = await self.llm.ainvoke(prompt)
        hyde_embedding = await self.embedder.encode_async(hypothetical.content)
        results = await self.db.search_async(hyde_embedding, top_k)
        return results
```

### Multi-Query Search
```python
class MultiQueryRetriever:
    def __init__(self, llm, retriever, n_variants: int = 3):
        self.llm = llm
        self.retriever = retriever
        self.n = n_variants

    async def retrieve(self, query: str, top_k: int = 10) -> list[dict]:
        prompt = f"""Generate {self.n} distinct search queries that capture different aspects of:
Query: {query}
Return as a numbered list."""
        response = await self.llm.ainvoke(prompt)
        variants = [line.split(". ", 1)[1] for line in response.content.strip().split("\n") if line.strip()]

        all_results = []
        seen_ids = set()
        for q in [query] + variants:
            results = await self.retriever.retrieve(q, top_k)
            for r in results:
                if r["id"] not in seen_ids:
                    all_results.append(r)
                    seen_ids.add(r["id"])

        return all_results[:top_k]
```

### Step-Back Prompting
For complex questions, first generate a broader "step-back" question, retrieve for both.
```python
async def step_back_retrieve(query: str, llm, retriever):
    step_back_prompt = f"""What broader or more fundamental question does this depend on?
Original: {query}
Step-back question:"""
    step_back = await llm.ainvoke(step_back_prompt)
    step_back_results = await retriever.retrieve(step_back.content)
    direct_results = await retriever.retrieve(query)
    return merge_results(step_back_results, direct_results)
```

## RAG Pipeline Implementation (Python)

### Full Synchronous Pipeline
```python
class RAGPipeline:
    def __init__(self, embedder, vector_db, llm, reranker=None):
        self.embedder = embedder
        self.vector_db = vector_db
        self.reranker = reranker
        self.llm = llm

    def retrieve(self, query: str, top_k: int = 10) -> list[dict]:
        query_vec = self.embedder.encode(query)
        results = self.vector_db.search(query_vec, top_k * 2)
        if self.reranker:
            results = self.reranker.rerank(query, results, top_k)
        return results[:top_k]

    def generate(self, query: str, context: list[dict]) -> str:
        prompt = self._build_prompt(query, context)
        return self.llm.generate(prompt)

    def query(self, query: str) -> dict:
        context = self.retrieve(query)
        answer = self.generate(query, context)
        return {"answer": answer, "sources": [c["metadata"] for c in context]}

    def _build_prompt(self, query: str, context: list[dict]) -> str:
        ctx_text = "\n\n".join(
            f"[Source: {c['metadata'].get('title', 'unknown')}]\n{c['text']}"
            for c in context
        )
        return f"""Answer the question based on the provided context.

Context:
{ctx_text}

Question: {query}

Answer:"""
```

### Async Pipeline with Streaming
```python
class AsyncRAGPipeline:
    def __init__(self, embedder, vector_db, llm, reranker=None):
        self.embedder = embedder
        self.vector_db = vector_db
        self.reranker = reranker
        self.llm = llm

    async def stream_query(self, query: str):
        yield {"type": "status", "content": "embedding query..."}
        query_vec = await self.embedder.encode_async(query)

        yield {"type": "status", "content": "searching..."}
        results = await self.vector_db.search_async(query_vec, 20)

        if self.reranker:
            yield {"type": "status", "content": "re-ranking..."}
            results = await self.reranker.rerank_async(query, results, 5)

        yield {"type": "sources", "content": [r["id"] for r in results]}

        yield {"type": "status", "content": "generating..."}
        prompt = self._build_prompt(query, results)
        async for chunk in self.llm.stream_async(prompt):
            yield {"type": "token", "content": chunk}

        yield {"type": "done"}

    def _build_prompt(self, query: str, context: list[dict]) -> str:
        ctx_lines = []
        for i, c in enumerate(context, 1):
            src = c["metadata"].get("source", "unknown")
            ctx_lines.append(f"[{i}] ({src}) {c['text']}")
        return f"""Context:\n{chr(10).join(ctx_lines)}\n\nQuestion: {query}\nAnswer:"""
```

## Anti-Patterns

### 1. RAG as a Silver Bullet
- **Problem**: Assuming RAG solves all LLM limitations (factuality, recency, domain knowledge).
- **Reality**: RAG fails when the corpus has no relevant information, retrieval is poor, or the query requires multi-step reasoning.
- **Mitigation**: Always have a fallback strategy (web search, structured KB, explicit "I don't know").

### 2. Ignoring Chunk Boundary Issues
- **Problem**: Information needed to answer a query is split across chunk boundaries.
- **Example**: A paragraph about "learning rate scheduling" is split — half in chunk N, half in chunk N+1. The retrieval finds chunk N but chunk N+1 has the critical detail.
- **Mitigation**: Use overlap (10-20%), include adjacent chunk IDs in metadata, consider sliding window at query time.

### 3. Wrong Chunk Size
- **Problem**: Chunks too small → missing context. Chunks too large → diluted signal, exceeds embedding model limits.
- **Impact**: Small chunks (50 tokens) → high precision, low recall. Large chunks (1000+ tokens) → high recall, low precision.
- **Mitigation**: Match chunk size to the granularity of expected answers. For QA on specific facts: 128-256 tokens. For summarization: 512-1024 tokens.

### 4. No Evaluation Plan
- **Problem**: Deploying RAG without measuring retrieval quality or generation faithfulness.
- **Impact**: Silent degradation, undetected hallucinations, no data for optimization decisions.
- **Mitigation**: Establish baseline metrics (Recall@K, faithfulness) before production. Monitor continuously.

### 5. Ignoring Latency Budget
- **Problem**: Adding re-ranking, multi-query expansion, and large context without latency budgets.
- **Impact**: P95 latency balloons from 200ms to 2000ms+.
- **Mitigation**: Define latency budget upfront. Use async pipeline. Cache aggressively.

### 6. Treating All Queries the Same
- **Problem**: Same retrieval strategy (top-K=10, hybrid, re-rank) for every query.
- **Impact**: Simple lookups are over-engineered (slow). Complex queries are under-served.
- **Mitigation**: Adaptive retrieval based on query complexity classification.

### 7. No Metadata Filtering
- **Problem**: Searching entire corpus without date, source, or category filters.
- **Impact**: Stale or irrelevant results rank above timely, relevant ones.
- **Mitigation**: Always store metadata. Apply pre-filtering before vector search.

### 8. Embedding Model Token Limit Ignorance
- **Problem**: Chunking beyond the embedding model's max input tokens, causing silent truncation.
- **Impact**: Lost tail information in every chunk, degrading retrieval quality.
- **Mitigation**: Always truncate chunks to fit model's max tokens (typically 512).

## Production Considerations

### Latency Budget Allocation
```
Component          Target      Max
────────────────────────────────────
Query rewrite      10-30ms     50ms
Embedding          10-50ms     100ms  (API: 50ms, local: 5ms)
Vector search      5-100ms     150ms
Re-ranking         50-300ms    500ms
Context assembly   <1ms        5ms
LLM generation     500ms+      varies
────────────────────────────────────
Total (no re-rank) 100-200ms   300ms
Total (with re-rank) 300-700ms 1000ms
```

### Caching Architecture
```
Layer 1: In-memory cache (query → response)
  - TTL: 5 minutes
  - Eviction: LRU
  - Hit rate target: 20-30%

Layer 2: Embedding cache (query → vector)
  - TTL: 1 hour
  - Key: SHA256 of query text
  - Hit rate target: 40-50%

Layer 3: Search cache (query → results)
  - TTL: 10 minutes
  - Invalidated on index update
  - Hit rate target: 30-40%
```

### Evaluation Framework
```python
class RAGEvaluator:
    def __init__(self, judge_llm):
        self.judge = judge_llm

    async def evaluate_retrieval(self, queries, relevant_docs, retriever, k=10):
        results = {"recall": [], "precision": [], "mrr": []}
        for q, relevant in zip(queries, relevant_docs):
            retrieved = await retriever.retrieve(q, k)
            retrieved_ids = {r["id"] for r in retrieved}
            relevant_set = set(relevant)

            recall = len(retrieved_ids & relevant_set) / max(len(relevant_set), 1)
            precision = len(retrieved_ids & relevant_set) / k
            mrr = 0.0
            for i, r in enumerate(retrieved):
                if r["id"] in relevant_set:
                    mrr = 1.0 / (i + 1)
                    break

            results["recall"].append(recall)
            results["precision"].append(precision)
            results["mrr"].append(mrr)

        return {
            k: sum(v) / len(v) for k, v in results.items()
        }

    async def evaluate_generation(self, queries, contexts, answers):
        faithfulness = []
        relevancy = []
        for q, ctx, a in zip(queries, contexts, answers):
            f = await self._judge_faithfulness(a, ctx)
            r = await self._judge_relevancy(a, q)
            faithfulness.append(f)
            relevancy.append(r)
        return {
            "faithfulness": sum(faithfulness) / len(faithfulness),
            "relevancy": sum(relevancy) / len(relevancy),
        }

    async def _judge_faithfulness(self, answer, context):
        prompt = f"""Context: {context}\nAnswer: {answer}\n\nScore 0-1: Is every claim in the answer supported by the context? Score:"""
        return float((await self.judge.ainvoke(prompt)).content.strip())
```

### Monitoring Dashboard Metrics
```
Query volume      → Rate (req/s) + P50/P95/P99 latency
Retrieval metrics → Recall@10, Precision@5, MRR over sliding window
Generation        → Faithfulness score, answer relevancy
System health     → Embedding service latency, Vector DB CPU, Re-ranker queue depth
Cache performance → Hit rate per layer, memory usage
Error rates       → Retrieval failures, LLM timeouts, embedding errors
Data freshness     → Time since last index update, stale chunk ratio
```

### A/B Testing Framework
```python
class RAGExperiment:
    def __init__(self, control_pipeline, variant_pipeline):
        self.control = control_pipeline
        self.variant = variant_pipeline

    async def run(self, test_queries: list[str], n_runs: int = 3):
        control_answers = []
        variant_answers = []
        for query in test_queries:
            for _ in range(n_runs):
                control_answers.append(await self.control.query(query))
                variant_answers.append(await self.variant.query(query))
        return {
            "control": control_answers,
            "variant": variant_answers,
        }
```
Compare on: faithfulness, relevancy, latency P50/P95, retrieval Recall@10.

## Output

### Response Format
```
## RAG Pipeline Configuration
### Chunking
Strategy: {semantic/recursive/sentence/token}
Chunk Size: {tokens} | Overlap: {tokens} | Max Chunks per Doc: {N}
Chunk Metadata: {fields tracked}

### Embedding
Model: {name} | Dimensions: {N}
Distance: {cosine/euclidean/dot} | Batch Size: {N} | Normalize: {true/false}

### Retrieval
Method: {dense/sparse/hybrid} | Top-K: {N} | Score Threshold: {value}
Hybrid Weights: {dense:N, sparse:N} | Query Enhancement: {rewrite/HyDE/multi-query/none}

### Re-Ranking
Model: {name} | Candidates: {N} | Top-N: {N}
Score Type: {reciprocal rank fusion / cross-encoder / none}

### Context Assembly
Max Chunks: {N} | Max Tokens: {N}
Format: {concatenated / structured / summary-first}
Overflow: {truncate / summarize / fail}

### Advanced Patterns
Pattern: {naive/advanced/modular/self-rag/crag/adaptive}
Query Routing: {none / classifier-based / llm-based}
Fallback Strategy: {none / web-search / kb-query}

### Evaluation Plan
Retrieval Metrics: {Recall@K, Precision@K, MRR}
Generation Metrics: {faithfulness, relevancy}
E2E Score: {RAG quality composite}
Monitoring: {dashboard / alerts / drift detection}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Chunking strategy matches document structure and retrieval goals.
- [ ] Embedding model selected with dimensionality and metric justified.
- [ ] Retrieval method configured (dense/sparse/hybrid) with top-k and threshold.
- [ ] Query enhancement strategy selected (rewrite/HyDE/multi-query) or explicitly skipped.
- [ ] Re-ranker specified if precision above top-5 is required.
- [ ] Context assembly respects LLM token budget with overflow strategy.
- [ ] Advanced pattern considered (Self-RAG, CRAG, Adaptive) or explicitly ruled out.
- [ ] Anti-patterns reviewed: chunk boundary, chunk size, latency budget, evaluation plan.
- [ ] Pipeline latency budget documented and achievable.
- [ ] Evaluation plan specified with metrics and monitoring.

## Workflow

### Step 1: Document Analysis
Classify documents: unstructured text (markdown, PDF), semi-structured (HTML, JSON), structured (tables, code). Measure average doc length and corpus size. Note hierarchical structure that chunking must preserve. Identify special handling needs (code blocks, multi-column layouts, mixed languages).

### Step 2: Architecture Selection
Choose RAG architecture level (Naive → Advanced → Modular) based on:
- Query complexity distribution
- Required precision vs. latency
- Multi-source retrieval needs
- Self-correction requirements

### Step 3: Chunking Strategy
Apply decision tree. Configure chunk size, overlap, metadata. Test chunk quality on sample documents.

### Step 4: Embedding Model Selection
Apply decision tree. Consider quality, speed, multilingual needs. Test on representative queries.

### Step 5: Retrieval Configuration
- Dense: best for semantic similarity. Use cosine distance. Matryoshka dimension reduction if needed.
- Sparse (BM25): best for keyword/entity matching. Tune k1 (1.2-2.0) and b (0.75).
- Hybrid: weighted combination. Default 0.5/0.5. Tune on validation set.
- MMR: diversify results for broad queries (λ=0.5 balanced, λ=0.7 relevance-focused).

### Step 6: Query Enhancement
Select enhancement strategy based on query characteristics:
- Short/ambiguous queries → rewrite
- Generic queries with specific docs → HyDE
- Multi-faceted queries → multi-query
- Complex reasoning → step-back

### Step 7: Re-Ranking
Apply cross-encoder to top 20-100 results. Skip re-ranking for simple factual queries or when latency budget < 200ms.

### Step 8: Context Assembly
Build context within LLM token limit (max 50% of window). Prioritize highest-scoring chunks. Track source metadata per chunk. Format as structured section with citations. Handle overflow by truncating lowest-score chunks or summarizing.

### Step 9: Evaluation
Establish baseline before optimization. Measure retrieval (Recall@K, Precision@K, MRR) and generation (faithfulness, relevancy). A/B test configuration changes.

### Step 10: Production Hardening
Add caching, async pipeline, streaming, monitoring dashboard, alerts, circuit breakers.

## Rules
- Chunk size must fit within embedding model token limit (typically 512 tokens, verify explicitly).
- Overlap must be at least 10% of chunk size to preserve boundary context.
- Hybrid search with RRF always beats pure dense or pure sparse on varied corpora.
- Re-ranking is mandatory when precision above top-5 matters and latency budget allows.
- Context assembly must never exceed 50% of LLM context window.
- Track full provenance (doc ID, chunk index, source URL, title, section) per chunk.
- Always evaluate retrieval quality before generation quality — retrieval caps generation.
- Never deploy RAG without a fallback strategy for out-of-coverage queries.
- Cache at minimum two levels: embedding cache and response cache.
- Monitor faithfulness score continuously — a drop > 0.05 triggers investigation.
- Metadata pre-filtering should precede vector search, not follow it.
- Chunk boundary tests: verify that 10% of test queries don't span chunk boundaries.

## References
  - references/chunking-strategies.md — Chunking Strategies
  - references/rag-evaluation-metrics.md — RAG Evaluation Metrics
  - references/rag-hybrid.md — Hybrid RAG
  - references/rag-patterns-advanced.md — RAG Advanced Patterns Deep Dive
  - references/rag-patterns-fundamentals.md — RAG Fundamentals
  - references/rag-production-deployment.md — RAG Production Deployment
  - references/retrieval-optimization.md — Retrieval Optimization
  - references/retrieval-techniques.md — Retrieval Techniques
  - references/rag-query-enhancement.md — Query Enhancement Strategies
  - references/rag-advanced-patterns-deep.md — Self-RAG, CRAG, Adaptive RAG Deep Dive
  - references/rag-indexing-pipeline.md — Indexing Pipeline Architecture

## Handoff
For vector database deployment, hand off to `ai-vector-databases`. For prompt integration with retrieved context, hand off to `ai-prompt-engineering`. For fine-tuning embedding models, hand off to `ai-fine-tuning`.
