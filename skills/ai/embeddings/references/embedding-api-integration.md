# Embedding API Integration

## Overview

Integrating embedding models into production systems requires careful consideration of API patterns, batch processing, caching strategies, error handling, and rate limiting. This reference covers integration patterns for popular embedding APIs, batch processing pipelines, caching layers, and production-hardening techniques.

## API Integration Patterns

### OpenAI Embeddings

```python
from openai import OpenAI, APIError, RateLimitError
from typing import List, Dict, Optional, Union
import asyncio
import time

class OpenAIEmbeddingClient:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small", dimensions: Optional[int] = None):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.dimensions = dimensions

    def embed(self, text: str) -> List[float]:
        kwargs = {"model": self.model, "input": text}
        if self.dimensions:
            kwargs["dimensions"] = self.dimensions
        response = self.client.embeddings.create(**kwargs)
        return response.data[0].embedding

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        kwargs = {"model": self.model, "input": texts}
        if self.dimensions:
            kwargs["dimensions"] = self.dimensions
        response = self.client.embeddings.create(**kwargs)
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [d.embedding for d in sorted_data]

    def embed_batch_with_retry(self, texts: List[str], max_retries: int = 3) -> List[List[float]]:
        for attempt in range(max_retries):
            try:
                return self.embed_batch(texts)
            except RateLimitError:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise
            except APIError as e:
                if "capacity" in str(e).lower() and attempt < max_retries - 1:
                    time.sleep(5)
                else:
                    raise
```

### Async OpenAI Client

```python
import asyncio
from openai import AsyncOpenAI

class AsyncOpenAIEmbeddingClient:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small", max_retries: int = 3):
        self.client = AsyncOpenAI(api_key=api_key, max_retries=max_retries)
        self.model = model
        self.semaphore = asyncio.Semaphore(10)

    async def embed(self, text: str) -> List[float]:
        async with self.semaphore:
            response = await self.client.embeddings.create(
                model=self.model, input=text
            )
            return response.data[0].embedding

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        async with self.semaphore:
            response = await self.client.embeddings.create(
                model=self.model, input=texts
            )
            sorted_data = sorted(response.data, key=lambda x: x.index)
            return [d.embedding for d in sorted_data]

    async def embed_many(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_results = await self.embed_batch(batch)
            results.extend(batch_results)
        return results
```

### Sentence Transformers (Local)

```python
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Optional

class LocalEmbeddingModel:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", device: str = "cpu"):
        self.model = SentenceTransformer(model_name, device=device)
        self.dimension = self.model.get_sentence_embedding_dimension()

    def embed(self, text: str, normalize: bool = True) -> List[float]:
        embedding = self.model.encode(text, normalize_embeddings=normalize)
        return embedding.tolist()

    def embed_batch(self, texts: List[str], batch_size: int = 64, normalize: bool = True) -> List[List[float]]:
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=normalize,
            show_progress_bar=False,
        )
        return embeddings.tolist()

    def embed_with_pooling(self, texts: List[str], pooling_strategy: str = "mean") -> List[List[float]]:
        if pooling_strategy == "cls":
            embeddings = self.model.encode(texts, output_value="token_embeddings")
            return [e[:, 0, :].tolist() for e in embeddings]
        return self.embed_batch(texts)
```

### Cohere Embeddings

```python
import cohere
from typing import List, Optional

class CohereEmbeddingClient:
    def __init__(self, api_key: str, model: str = "embed-english-v3.0", input_type: str = "search_document"):
        self.client = cohere.Client(api_key)
        self.model = model
        self.input_type = input_type

    def embed(self, text: str) -> List[float]:
        response = self.client.embed(
            texts=[text],
            model=self.model,
            input_type=self.input_type,
        )
        return response.embeddings[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        response = self.client.embed(
            texts=texts,
            model=self.model,
            input_type=self.input_type,
        )
        return response.embeddings

    def embed_query(self, text: str) -> List[float]:
        response = self.client.embed(
            texts=[text],
            model=self.model,
            input_type="search_query",
        )
        return response.embeddings[0]
```

## Batch Processing Pipeline

### Efficient Batch Processing

```python
from typing import List, Dict, Any, Callable
from collections import deque
import threading

class BatchProcessor:
    def __init__(self, embed_fn: Callable, batch_size: int = 64, max_queue_size: int = 10000):
        self.embed_fn = embed_fn
        self.batch_size = batch_size
        self.queue = deque(maxlen=max_queue_size)
        self.results: Dict[int, Any] = {}
        self._counter = 0
        self._lock = threading.Lock()

    def submit(self, text: str) -> int:
        with self._lock:
            task_id = self._counter
            self._counter += 1
            self.queue.append((task_id, text))
        return task_id

    def get_result(self, task_id: int, timeout: float = 30.0) -> Optional[List[float]]:
        start = time.time()
        while task_id not in self.results:
            if time.time() - start > timeout:
                raise TimeoutError(f"Task {task_id} timed out")
            time.sleep(0.01)
        with self._lock:
            return self.results.pop(task_id)

    def process_all(self):
        while self.queue:
            batch = []
            batch_ids = []
            while self.queue and len(batch) < self.batch_size:
                task_id, text = self.queue.popleft()
                batch.append(text)
                batch_ids.append(task_id)
            if batch:
                embeddings = self.embed_fn(batch)
                with self._lock:
                    for tid, emb in zip(batch_ids, embeddings):
                        self.results[tid] = emb
```

### Async Pipeline with Progress Tracking

```python
import asyncio
from tqdm.asyncio import tqdm

class AsyncEmbeddingPipeline:
    def __init__(self, embedder, batch_size: int = 100, concurrency: int = 5):
        self.embedder = embedder
        self.batch_size = batch_size
        self.semaphore = asyncio.Semaphore(concurrency)

    async def process(self, texts: List[str], show_progress: bool = True) -> List[List[float]]:
        async def process_batch(batch: List[str]) -> List[List[float]]:
            async with self.semaphore:
                return await self.embedder.embed_batch(batch)

        batches = [
            texts[i:i + self.batch_size]
            for i in range(0, len(texts), self.batch_size)
        ]
        tasks = [process_batch(b) for b in batches]

        if show_progress:
            results = []
            for coro in tqdm.as_completed(tasks, total=len(tasks), desc="Embedding"):
                result = await coro
                results.extend(result)
            return results
        else:
            batch_results = await asyncio.gather(*tasks)
            return [emb for batch in batch_results for emb in batch]

    async def process_stream(self, texts: List[str]) -> asyncio.AsyncIterator[List[float]]:
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            async with self.semaphore:
                embeddings = await self.embedder.embed_batch(batch)
            for emb in embeddings:
                yield emb
```

## Caching Strategies

### Embedding Cache

```python
import hashlib
import json
from typing import Dict, Optional, List
from collections import OrderedDict

class LRUEmbeddingCache:
    def __init__(self, capacity: int = 10000, ttl: int = 86400):
        self.cache: OrderedDict = OrderedDict()
        self.capacity = capacity
        self.ttl = ttl
        self.hits = 0
        self.misses = 0

    def _key(self, text: str, model: str) -> str:
        return hashlib.md5(f"{model}:{text}".encode()).hexdigest()

    def get(self, text: str, model: str) -> Optional[List[float]]:
        key = self._key(text, model)
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry["timestamp"] < self.ttl:
                self.cache.move_to_end(key)
                self.hits += 1
                return entry["embedding"]
            else:
                del self.cache[key]
        self.misses += 1
        return None

    def set(self, text: str, model: str, embedding: List[float]):
        key = self._key(text, model)
        self.cache[key] = {
            "embedding": embedding,
            "timestamp": time.time(),
        }
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    def clear(self):
        self.cache.clear()
        self.hits = 0
        self.misses = 0


class PersistentEmbeddingCache:
    def __init__(self, db_path: str = "embedding_cache.db"):
        import sqlite3
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                model TEXT,
                embedding BLOB,
                created_at REAL
            )
        """)
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_model ON cache(model)"
        )

    def _key(self, text: str, model: str) -> str:
        return hashlib.sha256(f"{model}:{text}".encode()).hexdigest()

    def get(self, text: str, model: str) -> Optional[List[float]]:
        key = self._key(text, model)
        cursor = self.conn.execute(
            "SELECT embedding FROM cache WHERE key = ?", (key,)
        )
        row = cursor.fetchone()
        if row:
            import numpy as np
            return np.frombuffer(row[0], dtype=np.float32).tolist()
        return None

    def set(self, text: str, model: str, embedding: List[float]):
        key = self._key(text, model)
        import numpy as np
        blob = np.array(embedding, dtype=np.float32).tobytes()
        self.conn.execute(
            "INSERT OR REPLACE INTO cache (key, model, embedding, created_at) VALUES (?, ?, ?, ?)",
            (key, model, blob, time.time()),
        )
        self.conn.commit()
```

## Error Handling and Resilience

### Robust Embedding Client

```python
import asyncio
from typing import List, Optional

class RobustEmbeddingClient:
    def __init__(self, primary, fallback=None, max_retries: int = 3):
        self.primary = primary
        self.fallback = fallback
        self.max_retries = max_retries
        self.circuit_open = False
        self.failure_count = 0
        self.circuit_threshold = 5
        self.circuit_reset_time = 60.0
        self.last_failure = 0.0

    async def embed(self, text: str) -> List[float]:
        if self.circuit_open:
            if time.time() - self.last_failure > self.circuit_reset_time:
                self.circuit_open = False
                self.failure_count = 0
            elif self.fallback:
                return await self.fallback.embed(text)
            else:
                raise RuntimeError("Circuit breaker open, no fallback available")

        for attempt in range(self.max_retries):
            try:
                result = await self.primary.embed(text)
                self.failure_count = 0
                return result
            except Exception as e:
                self.failure_count += 1
                self.last_failure = time.time()
                if self.failure_count >= self.circuit_threshold:
                    self.circuit_open = True
                    if self.fallback:
                        return await self.fallback.embed(text)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if self.circuit_open and self.fallback:
            return await self.fallback.embed_batch(texts)
        try:
            return await self.primary.embed_batch(texts)
        except Exception:
            if self.fallback:
                return await self.fallback.embed_batch(texts)
            raise
```

## Key Points

- Use batch embedding APIs for throughput; send multiple texts per API call.
- Use asynchronous clients to overlap I/O and improve throughput.
- Use local embedding models (Sentence Transformers) for latency-sensitive or offline applications.
- Implement LRU or persistent caches to avoid redundant embedding computations.
- Use semaphores to rate-limit concurrent API calls and avoid rate limiting.
- Implement circuit breakers with fallback models for production resilience.
- Use retry with exponential backoff for transient API errors.
- Match input_type parameter to usage (search_query vs search_document) for Cohere.
- Normalize embeddings to unit length for cosine similarity comparisons.
- Process embeddings in streams for memory-efficient handling of large datasets.
- Monitor cache hit rate as a key performance indicator.
- Store embeddings as binary blobs in databases for compact storage.
- Always set dimensions parameter explicitly when using Matryoshka models.
- Test both synchronous and async paths for consistent error handling.
- Profile embedding latency per model to set appropriate timeout values.
- Version your embedding model in cache keys to prevent stale results after model updates.
