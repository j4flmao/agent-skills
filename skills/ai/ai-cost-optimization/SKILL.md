---
name: ai-cost-optimization
description: >
  Use this skill when reducing AI inference costs: token optimization, prompt compression, caching for LLM, semantic cache, KV cache, quantization, model routing, cost optimization, batching, token counting, context window management, model distillation, budget governance, chargeback, cost monitoring, FinOps for AI.
  This skill enforces: token budget tracking, cache strategy with hit ratio targets, quantization selection, model routing rules, batching configuration, cost monitoring setup, budget enforcement with fallback, cost allocation per team/user.
  Do NOT use for: model training cost optimization (see ai-training), infrastructure/GPU cost optimization (see devops-finops), embedding storage cost at scale (see ai-embeddings).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, cost, optimization, inference, finops, phase-11]
---

# AI Cost Optimization

## Purpose
Design and implement cost optimization strategies for LLM inference: token optimization, semantic caching, inference optimization, model routing, batching, distillation, and budget governance to minimize per-query cost while maintaining output quality. Provide production-ready patterns for cost monitoring, chargeback, and automated budget enforcement.

## Agent Protocol

### Trigger
User request includes: AI cost, token cost, LLM cost, prompt compression, caching for LLM, semantic cache, KV cache, quantization, model routing, cost optimization, batching, token counting, inference cost, context window, budget, chargeback, showback, cost allocation, FinOps, model distillation, speculative decoding.

### Input Context
Required for a full optimization plan:
- Model(s) currently in use and pricing ($/1K tokens)
- Average tokens per query (input + output)
- Daily/monthly query volume
- Current cache setup (if any)
- Latency requirements (SLA in ms)
- Monthly budget and cost to date
- Number of users/teams for cost allocation

### Output Artifact
A complete AI cost optimization plan covering: baseline measurement, token optimization, caching architecture, inference tuning, model routing, batching strategy, budget governance, monitoring setup, and projected savings.

### Response Format
```
## AI Cost Optimization Plan
### Baseline
Model: {name} | Avg Tokens/Query: {N} | Daily Queries: {N}
Monthly Cost: ${N} | Cost/Query: ${N} | Budget: ${N}

### Token Optimization
- Prompt Compression: {method} | {savings: X%}
- System Prompt: {current tokens} → {optimized tokens}
- Context Window: {max tokens} → {reduced to N}
- Streaming: {enabled/disabled}

### Semantic Cache
Storage: {Redis / Momento / in-memory}
Embedding Model: {name} | Threshold: {similarity}
TTL: {duration} | Hit Rate Target: {X%}
Estimated Savings: {X%} | ${N}/month

### Inference Optimization
Quantization: {FP16 / INT8 / INT4 / none}
Flash Attention: {enabled/disabled}
KV Cache: {on/off} | Batch Size: {N}

### Model Routing
| Query Type | Model | Cost/Query | Allocation |
|---|---|---|---|
| Simple | {cheap model} | ${N} | {X%} |
| Complex | {expensive model} | ${N} | {Y%} |
| Reasoning | {reasoning model} | ${N} | {Z%} |

### Budget Governance
Daily Budget: ${N} | Monthly: ${N}
Soft Limit: {X%} | Hard Limit: {Y%}
Fallback Model: {name} on budget exceed
Chargeback: {per-team / per-user / none}

### Monitoring
Metrics Export: {Prometheus / Datadog / custom}
Alerts: {threshold / anomaly / model shift}
Dashboard: {Grafana / custom}
```
No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Baseline cost measured: tokens per query, model pricing, daily volume.
- [ ] Token optimization applied: prompt compression target 40-60%, system prompt under 150 tokens.
- [ ] Semantic cache configured with embedding model, similarity threshold, TTL, hit rate target >30%.
- [ ] Inference optimization selected: quantization level, Flash Attention, KV cache tuning.
- [ ] Model routing rules defined with query classification and per-model cost.
- [ ] Batching strategy configured with max batch size, max wait, latency budget.
- [ ] Cost monitoring with Prometheus metrics, budget alerts, anomaly detection.
- [ ] Budget governance with soft/hard limits and automatic fallback model.
- [ ] Chargeback/showback allocation per team or user if multi-tenant.
- [ ] Optimization ROI tracked with before/after cost comparison.

## Architecture Decision Framework

### Decision Tree: Cost Optimization Strategy Selection

```
What is your primary constraint?
├── Cost reduction priority (reduce spend)
│   ├── Query volume < 10K/day
│   │   ├── Apply prompt compression (40-60% savings)
│   │   ├── Add semantic cache (20-35% hit rate)
│   │   └── Route simple queries to cheap model
│   ├── Query volume 10K-100K/day
│   │   ├── Implement tiered cache (exact + semantic)
│   │   ├── Dynamic batching with max 100ms wait
│   │   ├── Model cascade: cheap → expensive fallback
│   │   └── Quantize to FP16 (zero quality loss)
│   └── Query volume > 100K/day
│       ├── Continuous batching (vLLM/TensorRT-LLM)
│       ├── INT8 quantization with calibration
│       ├── Self-host for >100M tokens/day
│       ├── Prefix caching (shared prompts)
│       └── Model distillation pipeline
│
├── Latency constraint (response time SLA)
│   ├── SLA < 500ms
│   │   ├── No batching (or minimal, <50ms wait)
│   │   ├── Fast model (GPT-4o-mini, Claude Haiku)
│   │   ├── Semantic cache with low TTL
│   │   └── Streaming with early stopping
│   ├── SLA 500ms-2s
│   │   ├── Dynamic batching with 100-200ms wait
│   │   ├── Model routing: fast path for simple
│   │   └── Flash Attention enabled
│   └── SLA > 2s (offline/batch)
│       ├── Large batch sizes (32-64)
│       ├── Continuous batching
│       ├── Prompt caching
│       └── Use cheapest acceptable model
│
├── Quality constraint (output quality must equal frontier)
│   ├── Use frontier model as primary
│   ├── Cascade: cheap model first, verify, upgrade on low confidence
│   ├── Semantic cache with high threshold (0.95+)
│   └── No quantization below FP16
│
└── Budget constraint (fixed monthly spend)
    ├── Set hard daily budget per model
    ├── Budget enforcement: fallback to cheaper on limit
    ├── Cost-aware router: downgrade model when budget tight
    ├── Chargeback per team to drive accountability
    └── Monthly cost review with optimization iteration
```

### Decision Tree: Cache Architecture Selection

```
What is your query diversity?
├── Low diversity (<100 unique queries/day)
│   └── Exact-match cache (Redis, 10-20% hit rate)
├── Medium diversity (100-10K unique queries/day)
│   ├── Semantic cache with cosine similarity
│   ├── Threshold: 0.92 (balanced precision/recall)
│   └── TTL: 1 hour for general, 1 week for factual
└── High diversity (>10K unique queries/day)
    ├── Hybrid cache: exact + prefix + semantic
    ├── Embedding model: all-MiniLM-L6-v2 (<100K), BGE-large (>100K)
    ├── LRU eviction with max capacity
    └── Cache warming for common queries
```

### Decision Tree: Model Routing Strategy

```
What is your query complexity distribution?
├── >70% simple queries
│   ├── Route simple → GPT-4o-mini / Claude Haiku ($0.15/M tokens)
│   ├── Route complex → GPT-4o / Claude Sonnet ($2.50/M tokens)
│   └── Estimated savings: 50-70%
├── 40-70% simple queries
│   ├── Three-tier routing: simple → cheap, medium → mid, hard → frontier
│   ├── Use classifier (ML or heuristic) for routing
│   └── Estimated savings: 30-50%
└── <40% simple queries
    ├── Use frontier model as default
    ├── Apply prompt compression aggressively
    ├── Cache aggressively
    └── Distill a small model for the simple subset
```

## Architectural Patterns

### Pattern 1: Inference Optimization Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Query   │ →  │  Cache   │ →  │  Router  │ →  │  Model   │ →  │ Response │
│  Input   │    │  Check   │    │  Select  │    │  Infer   │    │  Output  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                      ↑                                ↑
                 Cache Miss                       Model options:
                 → Semantic                        - Cheap (simple)
                 → Exact match                     - Mid (general)
                 → Prefix                          - Frontier (complex)
```

```python
import time
import hashlib
import json
import asyncio
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Callable, Awaitable
from collections import defaultdict

@dataclass
class ModelConfig:
    name: str
    input_price_per_1k: float
    output_price_per_1k: float
    max_tokens: int = 4096

@dataclass
class CostRecord:
    timestamp: float
    model: str
    input_tokens: int
    output_tokens: int
    total_cost: float
    cache_hit: bool = False
    latency_ms: float = 0.0
    user_id: Optional[str] = None
    route: Optional[str] = None

class InferencePipeline:
    def __init__(
        self,
        models: dict[str, ModelConfig],
        llm_call: Callable[..., Awaitable[str]],
        embedder: Optional[Callable[[str], list[float]]] = None,
    ):
        self.models = models
        self.llm_call = llm_call
        self.cache = {}  # key: hash, value: (response, embedding, timestamp)
        self.cache_hits = 0
        self.cache_misses = 0
        self.cost_records: list[CostRecord] = []
        self.embedder = embedder
        self.threshold = 0.92
        self.ttl = 3600

    def _make_exact_key(self, prompt: str, model: str) -> str:
        return hashlib.sha256(f"{prompt}:{model}".encode()).hexdigest()

    def _estimate_tokens(self, text: str) -> int:
        return len(text) // 4

    def _compute_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        cfg = self.models[model]
        return (input_tokens * cfg.input_price_per_1k + output_tokens * cfg.output_price_per_1k) / 1000

    async def _classify_query(self, prompt: str) -> str:
        word_count = len(prompt.split())
        if word_count < 20 and "?" in prompt:
            return "simple"
        if any(kw in prompt.lower() for kw in ["math", "code", "reason", "analyze", "explain why", "compare"]):
            return "complex"
        if any(kw in prompt.lower() for kw in ["write", "create", "design", "architecture", "implement"]):
            return "complex"
        return "simple"

    def _select_model(self, classification: str) -> str:
        routing = {
            "simple": "gpt-4o-mini",
            "complex": "gpt-4o",
        }
        return routing.get(classification, "gpt-4o-mini")

    async def semantic_search(self, query_embed: np.ndarray) -> Optional[str]:
        now = time.time()
        best_score = self.threshold
        best_response = None
        expired_keys = []
        for key, (response, embed, ts) in self.cache.items():
            if now - ts > self.ttl:
                expired_keys.append(key)
                continue
            score = float(np.dot(query_embed, embed))
            if score > best_score:
                best_score = score
                best_response = response
        for k in expired_keys:
            del self.cache[k]
        return best_response

    async def infer(self, prompt: str, user_id: Optional[str] = None) -> tuple[str, float]:
        start = time.time()
        exact_key = self._make_exact_key(prompt, "")  # check across models
        if exact_key in self.cache:
            self.cache_hits += 1
            response, _, _ = self.cache[exact_key]
            latency = (time.time() - start) * 1000
            self.cost_records.append(CostRecord(
                timestamp=start, model="cache", input_tokens=0,
                output_tokens=0, total_cost=0, cache_hit=True,
                latency_ms=latency, user_id=user_id, route="cache"
            ))
            return response, 0.0

        if self.embedder:
            query_embed = np.array(self.embedder(prompt))
            cached = await self.semantic_search(query_embed)
            if cached:
                self.cache_hits += 1
                latency = (time.time() - start) * 1000
                self.cost_records.append(CostRecord(
                    timestamp=start, model="cache", input_tokens=0,
                    output_tokens=0, total_cost=0, cache_hit=True,
                    latency_ms=latency, user_id=user_id, route="semantic_cache"
                ))
                return cached, 0.0

        self.cache_misses += 1
        classification = await self._classify_query(prompt)
        model_name = self._select_model(classification)
        response = await self.llm_call(model=model_name, prompt=prompt)
        latency = (time.time() - start) * 1000
        output_tokens = self._estimate_tokens(response)
        input_tokens = self._estimate_tokens(prompt)
        cost = self._compute_cost(model_name, input_tokens, output_tokens)
        self.cost_records.append(CostRecord(
            timestamp=start, model=model_name, input_tokens=input_tokens,
            output_tokens=output_tokens, total_cost=cost, cache_hit=False,
            latency_ms=latency, user_id=user_id, route=classification
        ))
        if self.embedder:
            query_embed = np.array(self.embedder(prompt))
            self.cache[exact_key] = (response, query_embed, time.time())
        return response, cost

    def cost_summary(self, days: int = 30) -> dict:
        cutoff = time.time() - days * 86400
        recent = [r for r in self.cost_records if r.timestamp >= cutoff]
        total = sum(r.total_cost for r in recent)
        by_model = defaultdict(float)
        by_user = defaultdict(float)
        for r in recent:
            by_model[r.model] += r.total_cost
            if r.user_id:
                by_user[r.user_id] += r.total_cost
        total_calls = len(recent)
        return {
            "period_days": days,
            "total_cost": round(total, 2),
            "total_calls": total_calls,
            "avg_cost_per_call": round(total / max(total_calls, 1), 6),
            "cache_hit_rate": round(self.cache_hits / max(self.cache_hits + self.cache_misses, 1), 3),
            "cost_by_model": dict(by_model),
            "cost_by_user": dict(by_user),
        }
```

### Pattern 2: Semantic Cache with Embedding Selection

```python
class EmbeddingCache:
    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        threshold: float = 0.92,
        ttl_seconds: int = 3600,
        max_entries: int = 50000,
        storage_backend: str = "memory",
        redis_client=None,
    ):
        if storage_backend == "memory":
            self.store = {}
        elif storage_backend == "redis":
            self.store = redis_client
        else:
            raise ValueError(f"Unknown storage: {storage_backend}")
        self.model_name = model_name
        self.threshold = threshold
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self.hits = 0
        self.misses = 0
        self._init_embedder()

    def _init_embedder(self):
        from sentence_transformers import SentenceTransformer
        self.encoder = SentenceTransformer(self.model_name)

    def _embed(self, text: str) -> np.ndarray:
        return self.encoder.encode(text, normalize_embeddings=True)

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b))

    def get(self, query: str) -> Optional[str]:
        query_embed = self._embed(query)
        now = time.time()
        expired_keys = []
        best_match = None
        best_score = self.threshold
        for key, entry in self.store.items():
            if now - entry["ts"] > self.ttl:
                expired_keys.append(key)
                continue
            score = self._cosine_similarity(query_embed, entry["embed"])
            if score > best_score:
                best_score = score
                best_match = entry["response"]
        for k in expired_keys:
            del self.store[k]
        if best_match:
            self.hits += 1
            return best_match
        self.misses += 1
        return None

    def set(self, query: str, response: str):
        if len(self.store) >= self.max_entries:
            oldest = min(self.store.keys(), key=lambda k: self.store[k]["ts"])
            del self.store[oldest]
        embed = self._embed(query)
        key = hashlib.md5(query.encode()).hexdigest()
        self.store[key] = {
            "embed": embed,
            "response": response,
            "ts": time.time(),
        }

    def tune_threshold(self, eval_pairs: list[tuple[str, str, bool]]) -> float:
        best_f1 = 0
        best_thresh = self.threshold
        for thresh_pct in range(80, 99):
            t = thresh_pct / 100.0
            tp = fp = fn = tn = 0
            for q1, q2, should_match in eval_pairs:
                e1 = self._embed(q1)
                e2 = self._embed(q2)
                sim = self._cosine_similarity(e1, e2)
                predicted = sim >= t
                if predicted and should_match:
                    tp += 1
                elif predicted and not should_match:
                    fp += 1
                elif not predicted and should_match:
                    fn += 1
                else:
                    tn += 1
            precision = tp / max(tp + fp, 1)
            recall = tp / max(tp + fn, 1)
            f1 = 2 * precision * recall / max(precision + recall, 1e-6)
            if f1 > best_f1:
                best_f1 = f1
                best_thresh = t
        self.threshold = best_thresh
        return best_thresh

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(self.hits / max(total, 1), 3),
            "size": len(self.store),
            "threshold": self.threshold,
            "ttl": self.ttl,
            "model": self.model_name,
        }
```

### Pattern 3: Model Cascade with Budget Enforcement

```python
@dataclass
class CascadeTier:
    model: str
    cost_per_call: float
    max_retries: int = 0
    fallback_on_error: bool = True

class ModelCascade:
    def __init__(
        self,
        llm_call: Callable,
        tiers: list[CascadeTier],
        daily_budget: float = 100.0,
    ):
        self.llm_call = llm_call
        self.tiers = tiers
        self.daily_spend = 0.0
        self.daily_budget = daily_budget
        self.monthly_budget = daily_budget * 30
        self.monthly_spend = 0.0
        self.cascade_stats: dict[str, int] = defaultdict(int)

    def _check_budget(self, estimated_cost: float) -> bool:
        if self.daily_spend + estimated_cost > self.daily_budget:
            return False
        if self.monthly_spend + estimated_cost > self.monthly_budget:
            return False
        return True

    def _get_cheapest_tier(self) -> CascadeTier:
        return min(self.tiers, key=lambda t: t.cost_per_call)

    async def execute(self, prompt: str, min_quality: str = "simple") -> tuple[str, str, float]:
        for tier in self.tiers:
            est_cost = tier.cost_per_call
            if not self._check_budget(est_cost):
                fallback = self._get_cheapest_tier()
                result = await self.llm_call(model=fallback.model, prompt=prompt)
                cost = fallback.cost_per_call
                self.daily_spend += cost
                self.monthly_spend += cost
                self.cascade_stats["budget_fallback"] += 1
                return result, fallback.model, cost

            try:
                result = await self.llm_call(model=tier.model, prompt=prompt)
                cost = tier.cost_per_call
                self.daily_spend += cost
                self.monthly_spend += cost
                self.cascade_stats[tier.model] += 1
                return result, tier.model, cost
            except Exception as e:
                if tier.fallback_on_error and tier != self.tiers[-1]:
                    continue
                raise

        fallback = self._get_cheapest_tier()
        result = await self.llm_call(model=fallback.model, prompt=prompt)
        cost = fallback.cost_per_call
        self.daily_spend += cost
        self.monthly_spend += cost
        return result, fallback.model, cost

    def budget_status(self) -> dict:
        return {
            "daily_budget": self.daily_budget,
            "daily_spend": round(self.daily_spend, 2),
            "daily_remaining": round(self.daily_budget - self.daily_spend, 2),
            "monthly_budget": self.monthly_budget,
            "monthly_spend": round(self.monthly_spend, 2),
            "monthly_remaining": round(self.monthly_budget - self.monthly_spend, 2),
            "cascade_distribution": dict(self.cascade_stats),
        }
```

### Pattern 4: Token Optimization Pipeline

```python
class TokenOptimizer:
    def __init__(self, encoding_model: str = "cl100k_base"):
        import tiktoken
        self.enc = tiktoken.get_encoding(encoding_model)
        self.original_tokens = 0
        self.optimized_tokens = 0

    def count(self, text: str) -> int:
        return len(self.enc.encode(text))

    def compress_system_prompt(self, prompt: str) -> str:
        rules = {
            "You are a helpful AI assistant": "",
            "You are an AI assistant": "",
            "You should provide": "Provide",
            "You should always": "Always",
            "Please": "",
            "that is": "",
            "that are": "",
        }
        result = prompt
        for old, new in rules.items():
            result = result.replace(old, new)
        return result.strip()

    def truncate_by_score(self, documents: list[dict], max_tokens: int) -> list[dict]:
        scored = sorted(documents, key=lambda d: d.get("score", 0), reverse=True)
        selected = []
        total = 0
        for doc in scored:
            tokens = self.count(doc["content"])
            if total + tokens <= max_tokens:
                selected.append(doc)
                total += tokens
            else:
                remaining = max_tokens - total
                if remaining > 50:
                    doc["content"] = self._truncate_to_tokens(doc["content"], remaining)
                    selected.append(doc)
                break
        return selected

    def _truncate_to_tokens(self, text: str, max_tokens: int) -> str:
        tokens = self.enc.encode(text)
        if len(tokens) <= max_tokens:
            return text
        return self.enc.decode(tokens[:max_tokens])

    def sliding_window(self, conversation: list[dict], window_tokens: int = 4000) -> list[dict]:
        total = 0
        window = []
        for msg in reversed(conversation):
            tokens = self.count(msg.get("content", ""))
            if total + tokens > window_tokens:
                break
            window.insert(0, msg)
            total += tokens
        return window

    def optimize(self, system_prompt: str, context_docs: list[dict], max_context_tokens: int) -> dict:
        before_sys = self.count(system_prompt)
        sys_opt = self.compress_system_prompt(system_prompt)
        after_sys = self.count(sys_opt)
        context_opt = self.truncate_by_score(context_docs, max_context_tokens)
        total_before = before_sys + sum(self.count(d["content"]) for d in context_docs)
        total_after = after_sys + sum(self.count(d["content"]) for d in context_opt)
        self.original_tokens += total_before
        self.optimized_tokens += total_after
        return {
            "system_prompt": {"before": before_sys, "after": after_sys, "savings": before_sys - after_sys},
            "context_docs": {"before": len(context_docs), "after": len(context_opt)},
            "total": {"before": total_before, "after": total_after, "savings_pct": round((1 - total_after / max(total_before, 1)) * 100, 1)},
            "optimized_system": sys_opt,
            "optimized_context": context_opt,
        }

    def savings_report(self, price_per_1k: float = 0.01) -> dict:
        saved_tokens = self.original_tokens - self.optimized_tokens
        return {
            "original_tokens": self.original_tokens,
            "optimized_tokens": self.optimized_tokens,
            "tokens_saved": saved_tokens,
            "cost_saved": round(saved_tokens / 1000 * price_per_1k, 4),
            "compression_ratio": round(self.optimized_tokens / max(self.original_tokens, 1), 3),
        }
```

### Pattern 5: Continuous Batching for Self-Hosted Models

```python
import asyncio
import time
from typing import Callable

class ContinuousBatchProcessor:
    def __init__(
        self,
        model_generate: Callable,
        max_batch_size: int = 32,
        max_wait_ms: int = 200,
        max_queue_depth: int = 500,
    ):
        self.model = model_generate
        self.max_batch = max_batch_size
        self.max_wait = max_wait_ms / 1000.0
        self.queue = asyncio.Queue(maxsize=max_queue_depth)
        self._running = False
        self.stats = {"batches": 0, "queries": 0, "avg_batch_size": 0}

    async def submit(self, prompt: str, max_tokens: int = 256) -> str:
        future = asyncio.get_event_loop().create_future()
        await self.queue.put({
            "prompt": prompt,
            "max_tokens": max_tokens,
            "future": future,
            "arrived": time.monotonic(),
        })
        return await future

    async def _batch_loop(self):
        self._running = True
        while self._running:
            batch = []
            deadline = time.monotonic() + self.max_wait
            try:
                first = await asyncio.wait_for(self.queue.get(), timeout=self.max_wait)
                batch.append(first)
            except asyncio.TimeoutError:
                continue
            while len(batch) < self.max_batch:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break
            self.stats["batches"] += 1
            self.stats["queries"] += len(batch)
            self.stats["avg_batch_size"] = (
                self.stats["avg_batch_size"] * (self.stats["batches"] - 1) + len(batch)
            ) / self.stats["batches"]
            asyncio.create_task(self._execute_batch(batch))

    async def _execute_batch(self, batch: list[dict]):
        prompts = [b["prompt"] for b in batch]
        max_tokens_list = [b["max_tokens"] for b in batch]
        try:
            results = await self.model(prompts, max_tokens_list)
            for item, result in zip(batch, results):
                item["future"].set_result(result)
        except Exception as e:
            for item in batch:
                item["future"].set_exception(e)

    async def start(self, workers: int = 2):
        for _ in range(workers):
            asyncio.create_task(self._batch_loop())

    def stop(self):
        self._running = False
```

### Pattern 6: Cost-Aware Rate Limiter

```python
import asyncio
import time

class CostAwareRateLimiter:
    def __init__(self, max_daily_cost: float, model_costs: dict[str, float]):
        self.max_daily = max_daily_cost
        self.model_costs = model_costs
        self.daily_spend = 0.0
        self.hourly_budget = max_daily_cost / 24
        self.hourly_spend = 0.0
        self.last_reset = time.time()
        self._lock = asyncio.Lock()

    def _reset_if_needed(self):
        now = time.time()
        if now - self.last_reset >= 3600:
            self.hourly_spend = 0.0
            self.last_reset = now
        if time.gmtime(now).tm_hour == 0 and time.gmtime(self.last_reset).tm_hour != 0:
            self.daily_spend = 0.0

    async def acquire(self, model: str) -> tuple[bool, str]:
        async with self._lock:
            self._reset_if_needed()
            cost = self.model_costs.get(model, 0)
            if self.daily_spend + cost > self.max_daily:
                return False, f"Daily budget ${self.max_daily} exceeded"
            self.daily_spend += cost
            self.hourly_spend += cost
            return True, "ok"

    def reset_daily(self):
        self.daily_spend = 0.0
        self.hourly_spend = 0.0
```

## Production Considerations

### Monitoring & Observability

Every production AI cost optimization deployment must track:

```python
from prometheus_client import Counter, Gauge, Histogram

llm_cost_total = Counter("llm_cost_total_usd", "Total LLM cost", ["model", "route"])
llm_tokens_total = Counter("llm_tokens_total", "Total tokens", ["model", "type"])
llm_cache_hit_ratio = Gauge("llm_cache_hit_ratio", "Cache hit ratio", ["cache_tier"])
llm_budget_remaining = Gauge("llm_budget_remaining_usd", "Budget remaining", ["window"])
llm_latency = Histogram("llm_latency_ms", "Latency in ms", ["model", "route"])
llm_query_count = Counter("llm_queries_total", "Query count", ["model", "route", "status"])
```

Key metrics to track:
- **Cost per query** (average, P50, P99) — measure across models and routes
- **Cost per user/team** — for chargeback and anomaly detection
- **Cache hit ratio** — by cache tier (exact, semantic, prefix)
- **Cache eviction rate** — high eviction means cache is undersized
- **Token efficiency** — output tokens / input tokens ratio (lower is cheaper)
- **Model utilization** — % of queries per model in routing
- **Budget burn rate** — daily spend vs daily budget, projected monthly spend
- **Cost per quality metric** — e.g., cost per correct answer

Alerting thresholds:
- Daily spend > 80% of daily budget → warning
- Daily spend > 100% of daily budget → critical (enforce fallback)
- Cache hit rate drops > 20% from baseline → investigate
- Cost per query spikes > 3x baseline → anomaly alert
- Model usage shift > 20% in 7 days → review routing
- Monthly spend projected > 90% of budget → planning alert

### Budget Governance Framework

```
Budget Governance Lifecycle:
┌─────────────────────────────────────────────────────────────────┐
│  1. Budget Allocation (annual/quarterly per team + shared)      │
│  2. Monthly Spend Tracking (actual vs budget + forecast)        │
│  3. Threshold Alerts (80% soft, 100% hard + escalation)         │
│  4. Budget Enforcement (auto-downgrade, rate-limit, block)      │
│  5. Cost Review (weekly team review, monthly exec review)       │
│  6. Optimization Iteration (identify, implement, measure ROI)   │
└─────────────────────────────────────────────────────────────────┘
```

Tiered enforcement model:
- **Tier 1 (Soft)**: Alert at 70% — send notification, no action
- **Tier 2 (Warning)**: Alert at 80% — suggest optimization, recommend review
- **Tier 3 (Action)**: Alert at 90% — auto-route to cheaper model, limit expensive features
- **Tier 4 (Hard)**: Alert at 100% — block non-critical queries, escalate to budget owner

### Chargeback / Showback

```python
class CostAllocation:
    def __init__(self):
        self.teams: dict[str, str] = {}  # user_id -> team
        self.projects: dict[str, str] = {}  # user_id -> project

    def allocate(self, record: CostRecord) -> dict:
        return {
            "team": self.teams.get(record.user_id or "", "unallocated"),
            "project": self.projects.get(record.user_id or "", "unallocated"),
            "cost": record.total_cost,
            "model": record.model,
            "queries": 1,
            "tokens": record.input_tokens + record.output_tokens,
        }

    def team_summary(self, records: list[CostRecord]) -> dict:
        by_team = defaultdict(lambda: {"cost": 0.0, "queries": 0, "tokens": 0})
        for r in records:
            alloc = self.allocate(r)
            t = alloc["team"]
            by_team[t]["cost"] += alloc["cost"]
            by_team[t]["queries"] += alloc["queries"]
            by_team[t]["tokens"] += alloc["tokens"]
        return dict(by_team)
```

### Optimization ROI Tracking

```python
class ROITracker:
    def __init__(self):
        self.optimizations: list[dict] = []

    def record(self, name: str, before_daily: float, after_daily: float, implementation_cost: float):
        daily_savings = before_daily - after_daily
        annual_savings = daily_savings * 365
        payback_days = implementation_cost / max(daily_savings, 0.01)
        self.optimizations.append({
            "name": name,
            "before_daily": before_daily,
            "after_daily": after_daily,
            "daily_savings": daily_savings,
            "annual_savings": annual_savings,
            "implementation_cost": implementation_cost,
            "payback_days": round(payback_days, 1),
            "roi_pct": round((annual_savings - implementation_cost) / max(implementation_cost, 1) * 100, 1),
        })

    def summary(self) -> dict:
        total_daily = sum(o["daily_savings"] for o in self.optimizations)
        total_annual = sum(o["annual_savings"] for o in self.optimizations)
        total_cost = sum(o["implementation_cost"] for o in self.optimizations)
        return {
            "optimizations": self.optimizations,
            "total_daily_savings": round(total_daily, 2),
            "total_annual_savings": round(total_annual, 2),
            "total_implementation_cost": total_cost,
            "net_annual_benefit": round(total_annual - total_cost, 2),
            "payback_days": round(total_cost / max(total_daily, 0.01), 1),
        }
```

## Security & Governance for Cost Management

### Access Control
- Budget modification requires approval from cost owner (not self-service)
- Model routing rules are read-only for most roles, write for admin
- Cost data access: team leads see their team, finance sees all

### Audit Trail
```python
class CostAuditLog:
    def __init__(self):
        self.entries: list[dict] = []

    def log(self, action: str, actor: str, resource: str, details: dict):
        self.entries.append({
            "timestamp": time.time(),
            "action": action,
            "actor": actor,
            "resource": resource,
            "details": details,
        })

    def query(self, actor: Optional[str] = None, action: Optional[str] = None) -> list[dict]:
        results = self.entries
        if actor:
            results = [e for e in results if e["actor"] == actor]
        if action:
            results = [e for e in results if e["action"] == action]
        return results[-100:]
```

### Cost Anomaly Detection
- Monitor for unusual token consumption (10x normal for same user)
- Detect new model usage that wasn't approved
- Flag repeated failed queries costing money with no response
- Monitor for cache poisoning attempts (queries designed to miss cache)

### Compliance Considerations
- PII data in cached responses: never cache responses containing PII without explicit approval
- Data residency: cache storage must comply with data location requirements
- Retention: cached responses must follow data retention policies
- Audit: all cost allocation and budget enforcement actions logged

## Anti-Patterns

### 1. Caching Everything Without TTL
Stale responses accumulate, memory grows unbounded, users get outdated information.
**Fix**: Set TTL per content category. Factual Q&A: 7 days. Creative: 1 hour. Conversational: 5 minutes.

### 2. Single Model for All Queries
Using GPT-4o for "what's the weather?" costs 20x more than needed.
**Fix**: Route simple queries to cheap models. Reserve frontier models for tasks requiring reasoning.

### 3. Obsessing Over Token Optimization Before Caching
Saving 100 tokens per query matters less than a 30% cache hit rate.
**Fix**: Implement caching FIRST, then optimize tokens. Caching addresses the structural cost.

### 4. Neglecting Output Token Cost
Most pricing models charge 3-4x more for output tokens than input. Long verbose responses dominate cost.
**Fix**: Set max_tokens aggressively. Use stop sequences. Monitor output/input token ratio.

### 5. Batching Without Latency Budget
Waiting for a full batch delays every request, degrading user experience.
**Fix**: Dynamic batching with max_wait_ms. Never exceed SLA. Priority queue for critical requests.

### 6. Quantizing Before Establishing Baseline
INT4 looks great on paper but may degrade quality in ways you can't measure without a baseline.
**Fix**: Measure FP16 quality first. Quantize one step at a time. A/B test quality before full rollout.

### 7. Budget Enforcement Without Fallback
Hard-blocking queries when budget exceeds degrades user experience.
**Fix**: Always configure a cheaper fallback model or graceful degradation before hard blocks.

### 8. Ignoring Embedding Cache Cost
Running embeddings for every cache miss adds latency and API cost that can negate savings.
**Fix**: Two-level cache: exact match THEN semantic. Cache embeddings locally. Batch embed operations.

### 9. Over-Optimizing Before Understanding Usage Pattern
Applying every optimization without data leads to complexity with diminishing returns.
**Fix**: Measure for 1 week. Identify top 3 cost drivers. Apply targeted optimizations. Measure again.

### 10. No Chargeback, No Accountability
Without allocating costs, teams have no incentive to optimize.
**Fix**: Implement per-team cost tracking. Share reports weekly. Let teams see their own spend.

## Cost Optimization ROI Estimates

| Optimization | Typical Savings | Implementation Effort | Risk | Payback Period |
|---|---|---|---|---|
| System prompt compression | 5-15% | Low (hours) | None | Immediate |
| Semantic cache | 20-35% | Medium (days) | Low | 1-2 weeks |
| Model routing | 40-70% | Medium (days) | Low | 1-2 weeks |
| Prompt compression (LLMLingua) | 30-50% | Low (hours) | Medium | Immediate |
| Dynamic batching | 30-50% | Medium (days) | Low | 1 week |
| Continuous batching | 40-60% | High (weeks) | Low | 2-4 weeks |
| INT8 quantization | 50-75% memory | Medium (days) | Low | 1-2 weeks |
| INT4 quantization | 75-87% memory | Medium (days) | Medium | 1-2 weeks |
| Model distillation | 90-98% | High (months) | High | 1-3 months |
| Prefix caching (API) | 10-50% | Low (hours) | None | Immediate |
| Budget enforcement | Prevents overruns | Low (days) | Low | Immediate |

## Rules
- Prompt compression target: 40-60% of original without quality degradation. Always A/B test.
- Semantic cache threshold: 0.90-0.95 cosine similarity. Lower increases hit rate, may return irrelevant.
- System prompt under 150 tokens for optimized deployments.
- Quantize to FP16 first (zero quality loss), measure before trying INT8/INT4.
- Model routing saves 40-70% — simple queries use cheap model, only route complex to expensive.
- Cache hit rate target: > 30% for significant cost reduction. Below 20% means cache is ineffective.
- Batch queries within latency budget — never exceed user-perceptible delay.
- Continuous batching for LLM servers: batches across concurrent requests.
- Monitor cost per query and cost per user for anomaly detection.
- Simulate savings before deploying — compare with/without optimization on historical data.
- Always configure budget enforcement with fallback model, never hard-block.
- Cost allocation per team/user for accountability and chargeback.
- Never cache responses containing PII without explicit data governance approval.
- Review cost optimization ROI monthly — retire optimizations that no longer save.
- Track all cache invalidations and budget enforcement actions for audit.
- When self-hosting, target GPU memory utilization > 80% for cost efficiency.
- Embedding model for semantic cache should match production token distribution.
- Warm cache with frequent queries during deployment to avoid cold-start misses.

## References
  - references/ai-cost-optimization-fundamentals.md — Token economics, cost components, measurement fundamentals
  - references/ai-cost-optimization-advanced.md — Speculative decoding, KV cache, multi-model strategies, enterprise governance
  - references/batching-throughput.md — Batching and Throughput Optimization
  - references/budget-monitoring-alerting.md — Budget Monitoring and Alerting
  - references/cache-optimization-patterns.md — Cache Optimization Patterns
  - references/cost-optimization-patterns.md — Cost Optimization Patterns
  - references/inference-optimization.md — Inference Optimization
  - references/model-selection-guide.md — Model Selection Guide
  - references/model-distillation-cost-strategies.md — Model Distillation and Fine-Tuning for Cost Reduction
  - references/enterprise-cost-governance.md — Enterprise Cost Governance Framework
  - references/prompt-compression-strategies.md — Prompt Compression Strategies
  - references/token-optimization.md — Token Optimization

## Handoff
For model selection for routing, hand off to `ml-model-serving`. For embedding model for semantic cache, hand off to `ai-embeddings`. For testing cost-quality tradeoffs, hand off to `ai-ai-testing`. For self-hosted model deployment, hand off to `ai-inference-serving`. For training distillation models, hand off to `ai-training`.
