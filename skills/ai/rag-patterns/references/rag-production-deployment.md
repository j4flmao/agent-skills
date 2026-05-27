# RAG Production Deployment

## Overview
Deploying RAG systems to production requires attention to latency, scalability, freshness, monitoring, and cost. Unlike simple LLM calls, RAG systems have multiple components (embedding, vector DB, retrieval, re-ranking, generation) that must each be optimized and monitored.

## Architecture

### Production RAG Pipeline
```
User Query
    │
    ▼
┌─────────────┐
│ Query       │  Query understanding, rewriting, expansion
│ Processing  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Embedding   │  Encode query into vector
│ Service     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Vector DB   │  ANN search + metadata filter
│ Search      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Re-ranker   │  Cross-encoder scoring of top-N
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Context     │  Format, prioritize, truncate
│ Assembly    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ LLM         │  Generate response with context
│ Generation  │
└──────┬──────┘
       │
       ▼
    Response
```

### Async Pipeline
```python
import asyncio
from dataclasses import dataclass

@dataclass
class RAGRequest:
    query: str
    user_id: str
    top_k: int = 10
    max_context_tokens: int = 3000

@dataclass
class RAGResponse:
    answer: str
    sources: list[dict]
    latency_ms: float
    tokens_used: dict

class AsyncRAGPipeline:
    def __init__(self, embedder, vector_db, reranker, llm):
        self.embedder = embedder
        self.vector_db = vector_db
        self.reranker = reranker
        self.llm = llm

    async def process(self, request: RAGRequest) -> RAGResponse:
        start = time.monotonic()

        query_embed, results, reranked, context, answer = await asyncio.gather(
            self.embedder.encode_async(request.query),
            self._search(request),
            asyncio.sleep(0),
            asyncio.sleep(0),
            asyncio.sleep(0),
        )

        results = await self.vector_db.search_async(query_embed, request.top_k)

        reranked = await self.reranker.rerank_async(request.query, results)

        context = self._assemble_context(reranked, request.max_context_tokens)

        answer = await self.llm.generate_async(
            self._build_prompt(request.query, context)
        )

        duration = time.monotonic() - start

        return RAGResponse(
            answer=answer,
            sources=[{"id": r["id"], "score": r["score"], "source": r.get("metadata", {}).get("source")} for r in reranked[:3]],
            latency_ms=round(duration * 1000, 1),
            tokens_used={"prompt": len(context), "completion": len(answer)},
        )
```

## Performance Optimization

### Caching Layers
```python
class RAGCache:
    def __init__(self):
        self.query_cache = {}  # exact query match
        self.embedding_cache = {}  # query -> embedding
        self.search_cache = {}  # embedding hash -> results

    async def get_or_compute(self, request: RAGRequest, pipeline_fn) -> RAGResponse:
        cache_key = hashlib.sha256(request.query.encode()).hexdigest()

        if cache_key in self.query_cache:
            return self.query_cache[cache_key]

        if cache_key in self.embedding_cache:
            query_embed = self.embedding_cache[cache_key]
        else:
            query_embed = await pipeline_fn.embedder.encode_async(request.query)
            self.embedding_cache[cache_key] = query_embed

        embed_hash = hashlib.sha256(query_embed.tobytes()).hexdigest()
        if embed_hash in self.search_cache:
            results = self.search_cache[embed_hash]
        else:
            results = await pipeline_fn.vector_db.search_async(query_embed, request.top_k)
            self.search_cache[embed_hash] = results

        answer = await self._generate(request.query, results)
        self.query_cache[cache_key] = answer

        return answer
```

### Streaming Responses
```python
class StreamingRAGPipeline:
    def __init__(self, embedder, vector_db, llm):
        self.embedder = embedder
        self.vector_db = vector_db
        self.llm = llm

    async def stream(self, request: RAGRequest):
        yield {"type": "status", "content": "searching..."}

        query_embed = await self.embedder.encode_async(request.query)
        results = await self.vector_db.search_async(query_embed, request.top_k)

        yield {"type": "sources", "content": [r["id"] for r in results[:3]]}
        yield {"type": "status", "content": "generating..."}

        context = self._format_context(results)
        prompt = self._build_prompt(request.query, context)

        async for chunk in self.llm.stream_async(prompt):
            yield {"type": "token", "content": chunk}

        yield {"type": "done"}
```

## Data Freshness

### Index Update Strategies
```python
class IndexUpdater:
    def __init__(self, vector_db, embedding_model):
        self.db = vector_db
        self.model = embedding_model

    async def incremental_update(self, documents: list[dict]):
        for doc in documents:
            embedding = await self.model.encode_async(doc["text"])
            await self.db.upsert(
                id=doc["id"],
                vector=embedding,
                metadata=doc.get("metadata", {}),
            )

    async def batch_reindex(self, all_documents: list[dict], batch_size: int = 100):
        for i in range(0, len(all_documents), batch_size):
            batch = all_documents[i:i + batch_size]
            texts = [d["text"] for d in batch]
            embeddings = await self.model.encode_async(texts)

            await self.db.delete_by_filter({"source": batch[0].get("metadata", {}).get("source")})
            await self.db.upsert_batch(
                ids=[d["id"] for d in batch],
                vectors=embeddings,
                metadatas=[d.get("metadata", {}) for d in batch],
            )

    async def schedule_updates(self, interval_hours: int = 24):
        while True:
            new_docs = await self.fetch_new_documents()
            if new_docs:
                await self.batch_reindex(new_docs)
            await asyncio.sleep(interval_hours * 3600)
```

## Monitoring

```python
class RAGMonitor:
    def __init__(self):
        self.pipeline_duration = Histogram("rag_pipeline_duration_seconds", ["component"])
        self.retrieval_scores = Histogram("rag_retrieval_score", ["type"])
        self.cache_hits = Counter("rag_cache_hits_total", ["layer"])
        self.error_rate = Counter("rag_errors_total", ["component", "error_type"])

    def observe_pipeline(self, component: str, duration: float):
        self.pipeline_duration.labels(component=component).observe(duration)

    def observe_retrieval(self, score_type: str, score: float):
        self.retrieval_scores.labels(type=score_type).observe(score)

    def record_error(self, component: str, error_type: str):
        self.error_rate.labels(component=component, error_type=error_type).inc()
```

## Key Points
- Deploy RAG as async pipeline with independent component optimization
- Cache at multiple levels: query, embedding, search results
- Stream responses for better UX (sources first, then generation)
- Update indexes incrementally for freshness; batch reindex periodically
- Monitor per-component latency to identify bottlenecks
- Set timeouts per component to prevent cascading failures
- Implement circuit breakers for downstream dependencies
- Scale vector DB and embedding service independently
- Warm caches with frequent queries on deployment
- A/B test RAG configuration changes (chunk size, top-k, reranker)
- Embedding and retrieval typically dominate latency
