---
name: ai-ai-cost-optimization
description: >
  Use this skill when reducing AI inference costs: token optimization, prompt compression, caching for LLM, semantic cache, KV cache, quantization, model routing, cost optimization, batching, token counting, context window management.
  This skill enforces: token budget tracking, cache strategy with hit ratio targets, quantization selection, model routing rules, batching configuration, cost monitoring setup.
  Do NOT use for: model training cost optimization, infrastructure cost optimization (see devops), embedding storage cost.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, cost, optimization, phase-11]
---

# AI Cost Optimization Agent

## Purpose
Design cost optimization strategies for LLM inference: token optimization, semantic caching, inference optimization, model routing, and batching to minimize per-query cost while maintaining quality.

## Agent Protocol

### Trigger
User request includes: AI cost, token cost, LLM cost, prompt compression, caching for LLM, semantic cache, KV cache, quantization, model routing, cost optimization, batching, token counting, inference cost, context window.

### Protocol
1. Measure current cost profile: tokens per query, model used, daily volume.
2. Apply token optimization: prompt compression, system prompt reduction, context window management.
3. Configure semantic cache: embedding model, similarity threshold, TTL.
4. Apply inference optimization: quantization, KV cache tuning, Flash Attention.
5. Set up model routing: cheap model for simple queries, expensive for complex.
6. Configure batching: dynamic batching, continuous batching.
7. Implement cost monitoring and alerting on budget thresholds.

## Output
AI cost optimization strategy with token optimization, caching, inference tuning, model routing.

### Response Format
```
## AI Cost Optimization Plan
### Baseline
Model: {name} | Avg Tokens/Query: {N} | Daily Queries: {N}
Monthly Cost: ${N} | Cost/Query: ${N}

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
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Baseline cost measured with token count and daily volume.
- [ ] Token optimization applied: prompt compression, system prompt trim.
- [ ] Semantic cache configured with hit rate targets and estimated savings.
- [ ] Inference optimization selected (quantization, Flash Attention).
- [ ] Model routing rules defined with query classification.
- [ ] Batching strategy configured with latency budget.
- [ ] Cost monitoring with budget alerts.

## Workflow

### Step 1: Measure Baseline
```python
# Track token usage per query
class CostTracker:
    def __init__(self, model_pricing):
        self.model_pricing = model_pricing  # $/1K tokens

    def log_query(self, model, input_tokens, output_tokens):
        cost = (
            input_tokens * self.model_pricing[model]['input']
            + output_tokens * self.model_pricing[model]['output']
        ) / 1000
        return cost
```

### Step 2: Token Optimization
```python
# Prompt compression
from llmlingua import PromptCompressor

compressor = PromptCompressor()
compressed_prompt = compressor.compress(
    prompt,
    rate=0.5,  # compress to 50% of original
    condition_compare=True,
    condition_in_question="",
)

# System prompt optimization
# Before: 450 tokens
system_prompt = """
You are a helpful AI assistant that answers questions accurately.
You should provide concise, factual responses based on your training data.
If you don't know the answer, say so. Do not make up information.
Always be polite and professional in your responses.
"""

# After: 120 tokens (optimized)
system_prompt = "Answer concisely and factually. Say if unsure. Be professional."
```

### Step 3: Semantic Cache
```python
import hashlib
import numpy as np
from sentence_transformers import SentenceTransformer

class SemanticCache:
    def __init__(self, similarity_threshold=0.92):
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.cache = {}  # embedding_hash -> response
        self.threshold = similarity_threshold

    def get(self, query):
        query_embed = self.encoder.encode(query, normalize_embeddings=True)
        for cached_embed, cached_response in self.cache.items():
            similarity = np.dot(query_embed, cached_embed)
            if similarity > self.threshold:
                return cached_response
        return None

    def set(self, query, response):
        embed = self.encoder.encode(query, normalize_embeddings=True)
        self.cache[embed.tobytes()] = response
```

### Step 4: Model Routing
```python
class ModelRouter:
    def __init__(self):
        self.routes = [
            {"model": "gpt-4o-mini", "cost": 0.00015, "complexity": "simple"},
            {"model": "gpt-4o", "cost": 0.0025, "complexity": "complex"},
            {"model": "o1", "cost": 0.01, "complexity": "reasoning"},
        ]

    def classify_query(self, query):
        if len(query.split()) < 20:
            return "simple"
        if any(kw in query for kw in ["math", "code", "reason", "explain"]):
            return "reasoning"
        return "complex"

    def route(self, query):
        complexity = self.classify_query(query)
        return next(r for r in self.routes if r["complexity"] == complexity)
```

### Step 5: Batching
```python
# Dynamic batching
from queue import Queue
import asyncio

class BatchInference:
    def __init__(self, model, max_batch=16, max_wait_ms=100):
        self.model = model
        self.max_batch = max_batch
        self.max_wait = max_wait_ms / 1000
        self.queue = Queue()

    async def process_batch(self):
        while True:
            batch = []
            wait_start = time.time()
            while len(batch) < self.max_batch:
                timeout = self.max_wait - (time.time() - wait_start)
                if timeout <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            if batch:
                results = self.model.generate([b["query"] for b in batch])
                for b, r in zip(batch, results):
                    b["future"].set_result(r)
```

## Rules
- Prompt compression target: 40-60% of original without quality degradation.
- Semantic cache threshold: 0.90-0.95 cosine similarity — lower increases cache hit but may return irrelevant.
- System prompt under 150 tokens for optimized deployments.
- Quantize to FP16 first (zero quality loss), measure before trying INT8/INT4.
- Model routing saves 40-70% — simple queries use cheap model, only route complex to expensive.
- Cache hit rate target: > 30% for significant cost reduction.
- Batch queries within latency budget — never exceed user-perceptible delay.
- Continuous batching for LLM servers: batches across concurrent requests.
- Monitor cost per query and cost per user for anomaly detection.
- Simulate savings before deploying — compare with/without optimization on historical data.

## References
- `references/token-optimization.md` — Prompt compression, context window management, token budget, streaming
- `references/inference-optimization.md` — Semantic cache, quantization, Flash Attention, model routing, batching

## Handoff
For model selection for routing, hand off to `ml-model-serving`. For embedding model for semantic cache, hand off to `ai-embeddings`. For testing cost-quality tradeoffs, hand off to `ai-ai-testing`.
