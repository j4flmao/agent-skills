# Cache Optimization Patterns

## Overview
Caching reduces LLM API costs by serving previously computed responses for similar queries. Effective caching can reduce costs by 30-70% depending on query diversity. Patterns range from exact-match caches to semantic similarity caches.

## Cache Architecture

### Exact-Match Cache
Simplest form. Hash the prompt and cache the response. Zero risk of incorrect matches but low hit rate.

```python
import hashlib
import redis
import json

class ExactMatchCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.client = redis_client
        self.ttl = ttl
        self.hits = 0
        self.misses = 0

    def _make_key(self, messages: list[dict], model: str, params: dict) -> str:
        content = json.dumps(
            {"messages": messages, "model": model, "params": params},
            sort_keys=True,
            separators=(",", ":"),
        )
        return f"llm_cache:{hashlib.sha256(content.encode()).hexdigest()}"

    def get(self, messages: list[dict], model: str, params: dict) -> str | None:
        key = self._make_key(messages, model, params)
        result = self.client.get(key)
        if result:
            self.hits += 1
            return json.loads(result)
        self.misses += 1
        return None

    def set(self, messages: list[dict], model: str, params: dict, response: str):
        key = self._make_key(messages, model, params)
        self.client.setex(key, self.ttl, json.dumps(response))

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": self.hits / max(total, 1),
            "saved_calls": self.hits,
        }
```

### Prefix Cache
Cache responses for common prefixes. Useful when many queries share the same system prompt prefix.

```python
class PrefixCache:
    def __init__(self, ttl: int = 3600):
        self.cache = {}
        self.ttl = ttl

    def find_prefix(self, messages: list[dict], min_match: int = 50) -> str | None:
        key = json.dumps(messages, separators=(",", ":"))
        now = time.time()

        for prefix, entry in sorted(
            self.cache.items(), key=lambda x: -len(x[0])
        ):
            if now - entry["timestamp"] > self.ttl:
                continue
            if key.startswith(prefix) and len(prefix) >= min_match:
                return entry["response"]

        return None

    def store_prefix(self, messages: list[dict], response: str):
        key = json.dumps(messages, separators=(",", ":"))[:200]
        self.cache[key] = {
            "response": response,
            "timestamp": time.time(),
            "length": len(key),
        }

    def cleanup(self):
        now = time.time()
        expired = [
            k for k, v in self.cache.items()
            if now - v["timestamp"] > self.ttl
        ]
        for k in expired:
            del self.cache[k]
```

### Semantic Cache
Uses embeddings to find semantically similar queries. Higher hit rate but risk of incorrect matches.

```python
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class SemanticCache:
    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        threshold: float = 0.92,
        max_cache: int = 10000,
    ):
        self.encoder = SentenceTransformer(model_name)
        self.threshold = threshold
        self.max_cache = max_cache
        self.queries: list[str] = []
        self.embeddings: list[np.ndarray] = []
        self.responses: list[str] = []
        self.hits = 0
        self.misses = 0

    def get(self, query: str) -> str | None:
        query_embed = self.encoder.encode(query, normalize_embeddings=True)

        if not self.embeddings:
            self.misses += 1
            return None

        similarities = cosine_similarity(
            [query_embed], np.stack(self.embeddings)
        )[0]

        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]

        if best_score >= self.threshold:
            self.hits += 1
            return self.responses[best_idx]

        self.misses += 1
        return None

    def set(self, query: str, response: str):
        embed = self.encoder.encode(query, normalize_embeddings=True)
        self.queries.append(query)
        self.embeddings.append(embed)
        self.responses.append(response)

        if len(self.queries) > self.max_cache:
            self._evict_oldest()

    def _evict_oldest(self):
        self.queries.pop(0)
        self.embeddings.pop(0)
        self.responses.pop(0)

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": self.hits / max(total, 1),
            "cache_size": len(self.queries),
            "threshold": self.threshold,
        }

    def tune_threshold(self, eval_set: list[tuple[str, str]]) -> float:
        best_threshold = self.threshold
        best_f1 = 0

        for thresh in np.arange(0.8, 0.99, 0.01):
            tp = fp = fn = 0
            for q1, q2 in eval_set:
                embed1 = self.encoder.encode(q1, normalize_embeddings=True)
                embed2 = self.encoder.encode(q2, normalize_embeddings=True)
                sim = cosine_similarity([embed1], [embed2])[0][0]
                is_match = q1 == q2

                if sim >= thresh and is_match:
                    tp += 1
                elif sim >= thresh and not is_match:
                    fp += 1
                elif sim < thresh and is_match:
                    fn += 1

            precision = tp / max(tp + fp, 1)
            recall = tp / max(tp + fn, 1)
            f1 = 2 * precision * recall / max(precision + recall, 1e-6)

            if f1 > best_f1:
                best_f1 = f1
                best_threshold = thresh

        self.threshold = best_threshold
        return best_threshold
```

### Hybrid Cache
Combines exact-match, prefix, and semantic caches. Queries checked in order of precision.

```python
class HybridCache:
    def __init__(self, semantic_threshold: float = 0.92, ttl: int = 3600):
        self.exact = ExactMatchCache(redis.Redis(), ttl)
        self.prefix = PrefixCache(ttl)
        self.semantic = SemanticCache(threshold=semantic_threshold)
        self.stats = {"exact_hits": 0, "prefix_hits": 0, "semantic_hits": 0, "misses": 0}

    def get(self, messages: list[dict], model: str, params: dict) -> str | None:
        result = self.exact.get(messages, model, params)
        if result:
            self.stats["exact_hits"] += 1
            return result

        result = self.prefix.find_prefix(messages)
        if result:
            self.stats["prefix_hits"] += 1
            return result

        query_text = messages[-1]["content"] if messages else ""
        result = self.semantic.get(query_text)
        if result:
            self.stats["semantic_hits"] += 1
            return result

        self.stats["misses"] += 1
        return None

    def set(self, messages: list[dict], model: str, params: dict, response: str):
        self.exact.set(messages, model, params, response)
        self.prefix.store_prefix(messages, response)
        query_text = messages[-1]["content"] if messages else ""
        self.semantic.set(query_text, response)
```

## Cache Invalidation

### Time-Based
```python
class TTLManager:
    def __init__(self):
        self.ttls = {
            "system_prompt": 86400,
            "factual_qa": 604800,
            "creative_content": 3600,
            "conversation": 300,
        }

    def get_ttl(self, cache_type: str, content_category: str) -> int:
        return self.ttls.get(content_category, 3600)

    def should_invalidate(self, entry: dict, reason: str) -> bool:
        invalidation_rules = {
            "model_update": lambda e: True,
            "prompt_change": lambda e: e.get("prompt_version") != CURRENT_PROMPT_VERSION,
            "data_refresh": lambda e: time.time() - e["data_timestamp"] > 86400,
            "forced": lambda e: True,
        }
        return invalidation_rules.get(reason, lambda e: False)(entry)
```

### Version-Based
```python
class VersionedCache:
    def __init__(self, cache, current_version: str = "1.0"):
        self.cache = cache
        self.current_version = current_version

    def get(self, key: str) -> str | None:
        entry = self.cache.get(key)
        if entry and entry.get("version") == self.current_version:
            return entry["response"]
        return None

    def set(self, key: str, response: str):
        self.cache.set(key, {
            "response": response,
            "version": self.current_version,
            "timestamp": time.time(),
        })

    def invalidate_old_versions(self):
        for key in self.cache.scan():
            entry = self.cache.get(key)
            if entry and entry.get("version") != self.current_version:
                self.cache.delete(key)
```

## Monitoring

```python
class CacheMonitor:
    def __init__(self):
        self.metrics = {
            "requests": 0,
            "hits": 0,
            "misses": 0,
            "latency_saved": 0,
            "cost_saved": 0,
        }

    def record_request(self, hit: bool, llm_latency: float):
        self.metrics["requests"] += 1
        if hit:
            self.metrics["hits"] += 1
            self.metrics["latency_saved"] += llm_latency
            self.metrics["cost_saved"] += llm_latency * 0.0001
        else:
            self.metrics["misses"] += 1

    def report(self) -> dict:
        hit_rate = self.metrics["hits"] / max(self.metrics["requests"], 1)
        return {
            "hit_rate": hit_rate,
            "total_saved": self.metrics["cost_saved"],
            "latency_saved_minutes": self.metrics["latency_saved"] / 60,
            "requests_cached": self.metrics["hits"],
        }
```

## Key Points
- Exact match cache: zero risk, low hit rate. Use as first layer.
- Semantic cache: 30-50% hit rate, tune threshold carefully (0.90-0.95).
- Prefix cache: effective when many queries share system prompts.
- Hybrid cache combines all three for maximum coverage.
- Tune semantic threshold on your specific query distribution.
- Cache invalidation: TTL for most content, version key for prompts.
- Monitor hit rate, latency savings, and cost savings.
- Semantic cache embedding model should match your production model.
- Consider PII in cached responses — never cache sensitive data.
- Warm cache with common queries during deployment.
