# Embedding Deployment

## Overview
Deploying embedding models in production requires attention to latency, throughput, memory, scaling, and monitoring. Embedding inference differs from LLM inference — it's typically faster, runs on CPU, and benefits from batching.

## Serving Architecture

### API Server
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import time
import asyncio

app = FastAPI()

class EmbeddingModel:
    def __init__(self, model_name: str, device: str = "cpu"):
        self.model = SentenceTransformer(model_name, device=device)
        self.dimension = self.model.get_sentence_embedding_dimension()
        self.batch_size = 64
        self.request_queue = asyncio.Queue()
        self.workers = []

    async def start_workers(self, n: int = 2):
        for _ in range(n):
            worker = asyncio.create_task(self._process_queue())
            self.workers.append(worker)

    async def _process_queue(self):
        while True:
            batch = []
            while len(batch) < self.batch_size:
                try:
                    item = await asyncio.wait_for(self.request_queue.get(), timeout=0.05)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            if batch:
                texts = [item["text"] for item in batch]
                embeds = self.model.encode(texts, normalize_embeddings=True)
                for item, embed in zip(batch, embeds):
                    item["future"].set_result(embed.tolist())

    async def encode_async(self, text: str) -> list[float]:
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        await self.request_queue.put({"text": text, "future": future})
        return await future

model = EmbeddingModel("BAAI/bge-base-en-v1.5")

class EmbeddingRequest(BaseModel):
    text: str
    normalize: bool = True

class BatchEmbeddingRequest(BaseModel):
    texts: list[str]
    normalize: bool = True

@app.post("/embed")
async def embed_single(req: EmbeddingRequest):
    start = time.monotonic()
    embedding = await model.encode_async(req.text)
    duration = time.monotonic() - start
    return {
        "embedding": embedding,
        "dimension": len(embedding),
        "duration_ms": round(duration * 1000, 1),
    }

@app.post("/embed/batch")
async def embed_batch(req: BatchEmbeddingRequest):
    start = time.monotonic()
    embeddings = model.model.encode(req.texts, normalize_embeddings=req.normalize)
    duration = time.monotonic() - start

    return {
        "embeddings": embeddings.tolist(),
        "count": len(req.texts),
        "dimension": embeddings.shape[1],
        "duration_ms": round(duration * 1000, 1),
        "throughput": round(len(req.texts) / duration, 1),
    }

@app.on_event("startup")
async def startup():
    await model.start_workers(n=2)
```

## Performance Optimization

### ONNX Runtime
```python
from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import AutoTokenizer
import numpy as np

class ONNXEmbeddingModel:
    def __init__(self, model_id: str):
        self.model = ORTModelForFeatureExtraction.from_pretrained(model_id, export=True)
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)

    def encode(self, texts: list[str], normalize: bool = True) -> np.ndarray:
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
        outputs = self.model(**inputs)
        embeddings = outputs.last_hidden_state.mean(dim=1).numpy()

        if normalize:
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / norms

        return embeddings
```

### Caching Layer
```python
import hashlib
import diskcache

class CachedEmbeddingModel:
    def __init__(self, model, cache_dir: str = "./embedding_cache", cache_size: int = 100000):
        self.model = model
        self.cache = diskcache.Cache(cache_dir, size_limit=cache_size * 512 * 4)

    def encode(self, texts: list[str], normalize: bool = True) -> np.ndarray:
        results = [None] * len(texts)
        uncached_indices = []
        uncached_texts = []

        for i, text in enumerate(texts):
            key = self._make_key(text, normalize)
            if key in self.cache:
                results[i] = self.cache[key]
            else:
                uncached_indices.append(i)
                uncached_texts.append(text)

        if uncached_texts:
            new_embeds = self.model.encode(uncached_texts, normalize=normalize)
            for idx, text, embed in zip(uncached_indices, uncached_texts, new_embeds):
                key = self._make_key(text, normalize)
                self.cache[key] = embed
                results[idx] = embed

        return np.array(results)

    def _make_key(self, text: str, normalize: bool) -> str:
        return hashlib.sha256(f"{text}:{normalize}".encode()).hexdigest()
```

## Scaling

### Horizontal Scaling
```python
import redis
from flask import Flask, request, jsonify

app = Flask(__name__)
redis_client = redis.StrictRedis(host="redis", port=6379)

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    text = data["text"]

    # Check Redis cache first
    cache_key = f"embed:{hashlib.sha256(text.encode()).hexdigest()}"
    cached = redis_client.get(cache_key)
    if cached:
        return jsonify({"embedding": json.loads(cached), "cached": True})

    # Compute embedding
    embedding = model.encode([text], normalize_embeddings=True)[0].tolist()
    redis_client.setex(cache_key, 3600, json.dumps(embedding))

    return jsonify({"embedding": embedding, "cached": False})

# Kubernetes HorizontalPodAutoscaler
# targetCPUUtilizationPercentage: 70
# minReplicas: 2
# maxReplicas: 10
```

## Monitoring

```python
from prometheus_client import Histogram, Counter, Gauge

EMBEDDING_DURATION = Histogram(
    "embedding_duration_seconds",
    "Time to compute embeddings",
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
    labelnames=["model"],
)

EMBEDDING_REQUESTS = Counter(
    "embedding_requests_total",
    "Total embedding requests",
    labelnames=["model", "status"],
)

BATCH_SIZE = Histogram(
    "embedding_batch_size",
    "Batch size for embedding requests",
    buckets=[1, 2, 4, 8, 16, 32, 64, 128],
)

CACHE_HIT_RATIO = Gauge("embedding_cache_hit_ratio", "Cache hit ratio for embeddings")

class MonitoredEmbeddingModel:
    def __init__(self, model, model_name: str):
        self.model = model
        self.model_name = model_name
        self.cache_hits = 0
        self.cache_misses = 0

    def encode(self, texts: list[str], normalize: bool = True) -> np.ndarray:
        start = time.monotonic()
        BATCH_SIZE.observe(len(texts))

        try:
            result = self.model.encode(texts, normalize=normalize)
            duration = time.monotonic() - start
            EMBEDDING_DURATION.labels(model=self.model_name).observe(duration)
            EMBEDDING_REQUESTS.labels(model=self.model_name, status="success").inc()
            return result
        except Exception as e:
            EMBEDDING_REQUESTS.labels(model=self.model_name, status="error").inc()
            raise
```

## Deployment Configurations

| Strategy | Latency | Throughput | Cost | Complexity |
|----------|---------|------------|------|------------|
| Single CPU | 50-100ms | 100 QPS | Low | Minimal |
| CPU + ONNX | 20-50ms | 300 QPS | Low | Low |
| GPU (T4) | 5-15ms | 1000 QPS | Medium | Medium |
| GPU Cluster | 5-10ms | 5000+ QPS | High | High |
| Serverless | 100-500ms | Variable | Pay/use | Minimal |

## Key Points
- Embedding models run efficiently on CPU — GPU only needed at high throughput
- Batch requests to maximize throughput (64-128 per batch)
- Cache embeddings aggressively (90%+ hit rate achievable)
- Monitor P50/P99 latency, throughput, and cache hit ratio
- Use ONNX Runtime for 2-4x speedup on CPU
- Horizontal scaling with Kubernetes for high volume
- Set max request size to prevent OOM (text length limits)
- Warm cache with frequent queries on deployment
- Embedding dimension affects storage and search cost
- Normalize embeddings at inference time for cosine compatibility
