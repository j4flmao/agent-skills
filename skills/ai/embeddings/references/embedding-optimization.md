# Embedding Optimization

## Embedding Compression

| Method | Size Reduction | Quality Impact | Use Case |
|--------|---------------|----------------|----------|
| FP32 → FP16 | 50% | None | General storage |
| FP32 → INT8 | 75% | < 2% drop | Large-scale retrieval |
| FP32 → Binary | 97% | 5-15% drop | Approximate retrieval |
| PCA reduction | Variable | Depends on dims | Fixed-dim reduction |
| Matryoshka truncation | 25-67% | < 3% drop | Adaptive quality/speed |

### Quantization Example
```python
import numpy as np

def quantize_to_int8(embeddings):
    embeddings_f32 = np.array(embeddings, dtype=np.float32)
    scale = 127.0 / np.max(np.abs(embeddings_f32), axis=1, keepdims=True)
    quantized = (embeddings_f32 * scale).astype(np.int8)
    return quantized, scale

def dequantize(quantized, scale):
    return quantized.astype(np.float32) / scale
```

## Caching Strategy

| Cache Level | Capacity | TTL | Eviction |
|-------------|----------|-----|----------|
| L1: LRU cache | 10,000 entries | 5 min | LRU |
| L2: Semantic cache | 100,000 entries | 1 hour | LFU |
| L3: Persistent | Unlimited | 7 days | TTL expiry |

### LRU Embedding Cache
```python
from collections import OrderedDict

class EmbeddingCache:
    def __init__(self, capacity=10000, ttl=300):
        self.cache = OrderedDict()
        self.capacity = capacity
        self.ttl = ttl

    def get(self, text_hash):
        if text_hash not in self.cache:
            return None
        entry = self.cache[text_hash]
        if time.time() - entry["timestamp"] > self.ttl:
            del self.cache[text_hash]
            return None
        self.cache.move_to_end(text_hash)
        return entry["embedding"]

    def set(self, text_hash, embedding):
        if len(self.cache) >= self.capacity:
            self.cache.popitem(last=False)
        self.cache[text_hash] = {
            "embedding": embedding,
            "timestamp": time.time()
        }
```

## Batch Processing

```python
def batch_encode(model, texts, batch_size=64):
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = model.encode(
            batch,
            normalize_embeddings=True,
            show_progress_bar=False
        )
        embeddings.extend(batch_embeddings)
    return np.array(embeddings)
```

## Optimization Checklist
- [ ] Quantization: FP16 first, test INT8 if memory-constrained
- [ ] Cache frequently accessed embeddings (hit rate target > 30%)
- [ ] Batch all encoding operations (never one-by-one)
- [ ] Use Matryoshka models for multi-tier latency requirements
- [ ] Monitor embedding drift monthly
- [ ] Compress storage: 384d INT8 = 384 bytes vs 3072d FP32 = 12KB per vector

## Performance Benchmarks

| Model | Dimensions | Encoding Speed (docs/s) | MTEB Score | Size per 1M vectors |
|-------|-----------|----------------------|------------|-------------------|
| all-MiniLM-L6-v2 | 384 | 14,000 | 56.3 | 1.5 GB (FP32) |
| BGE-base-en-v1.5 | 768 | 5,000 | 61.5 | 3 GB (FP32) |
| BGE-large-en-v1.5 | 1024 | 2,500 | 63.2 | 4 GB (FP32) |
| text-embedding-3-large | 3072 | 1,000 (API) | 64.1 | 12 GB (FP32) |

## Memory vs Quality Tradeoffs
```python
def select_embedding_config(corpus_size, latency_budget_ms, quality_min):
    configs = [
        {"model": "all-MiniLM-L6-v2", "dims": 384, "speed": 14000, "mteb": 56.3},
        {"model": "BGE-base-en-v1.5", "dims": 768, "speed": 5000, "mteb": 61.5},
        {"model": "BGE-large-en-v1.5", "dims": 1024, "speed": 2500, "mteb": 63.2},
    ]
    viable = [c for c in configs if c["speed"] >= corpus_size / latency_budget_ms
              and c["mteb"] >= quality_min]
    return min(viable, key=lambda c: c["dims"]) if viable else configs[-1]
```
