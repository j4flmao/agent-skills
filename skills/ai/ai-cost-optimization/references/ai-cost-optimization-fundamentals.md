# AI Cost Optimization Fundamentals

## Overview
AI Cost Optimization is the discipline of minimizing expenses associated with LLM inference and API calls while maintaining acceptable output quality, latency, and reliability. Unlike general cloud cost optimization (which focuses on compute/storage), AI cost optimization centers on token economics — the cost of processing language at scale through large language models.

## Token Economics

### The Core Pricing Model
Every LLM API call has a cost determined by:
```
cost = (input_tokens × input_price_per_1k + output_tokens × output_price_per_1k) / 1000
```

This means cost is a function of four variables:
- **Input tokens**: prompt, system message, context, retrieved documents
- **Output tokens**: the model's generated response
- **Input price**: typically $0.15-$30 per 1M tokens depending on model
- **Output price**: typically 2-4x more expensive than input per token

### Asymmetric Pricing
Most providers charge 3-4x more for output tokens than input. This is because generating tokens requires sequential computation (autoregressive decoding), while input tokens are processed in parallel during the attention pass. For example:

| Model | Input ($/1M) | Output ($/1M) | Ratio |
|---|---|---|---|
| GPT-4o-mini | $0.15 | $0.60 | 4x |
| GPT-4o | $2.50 | $10.00 | 4x |
| Claude Sonnet 4 | $3.00 | $15.00 | 5x |
| Claude Opus 4 | $15.00 | $75.00 | 5x |
| Gemini 2.0 Pro | $2.50 | $10.00 | 4x |

**Implication**: Reducing output length provides 3-4x more cost savings per token than reducing input length.

### Inference Costs vs Training Costs
AI cost optimization focuses exclusively on **inference** costs — the cost of running a trained model on user queries. This is distinct from **training** costs (GPU hours for pre-training and fine-tuning). For most production applications, inference costs dominate the ongoing operational budget:

| Phase | Cost Character | Optimization Focus |
|---|---|---|
| Pre-training | One-time capital expense | GPU utilization, data efficiency |
| Fine-tuning | Periodic expense | LoRA, QLoRA, dataset curation |
| Inference | Recurring operational expense | Token optimization, caching, routing |

For production SaaS applications serving >10K queries/day, inference costs typically exceed training costs within the first month of deployment.

## Cost Components

### 1. API Call Costs
Direct per-call charges from LLM providers. This is typically 70-90% of total AI spend.

| Component | Cost Driver | Optimization |
|---|---|---|
| Prompt tokens | System prompt length, RAG context, conversation history | Compression, truncation, sliding window |
| Output tokens | Verbose responses, chain-of-thought | Max tokens, stop sequences, structured output |
| Per-call overhead | Minimum charge, batching inefficiency | Batch multiple requests |

### 2. Embedding Costs
Semantic search and cache operations require embedding models:

| Embedding Model | Cost/1M tokens | Dimensions | Use Case |
|---|---|---|---|
| text-embedding-3-small | $0.02 | 512 | High volume, cost-sensitive |
| text-embedding-3-large | $0.13 | 3072 | High accuracy, low volume |
| BGE-base-en-v1.5 | Free (self-host) | 768 | Self-hosted, high volume |
| all-MiniLM-L6-v2 | Free (self-host) | 384 | Local cache, fast |

**Embedding cost trap**: Running embeddings on every cache miss can cost more than the LLM call itself at scale. Always cache embedding results and batch embed operations.

### 3. Storage Costs
For caching and context management:

| Storage Type | Cost/GB/month | Use Case |
|---|---|---|
| Redis/Memcached (in-memory) | $0.50-1.50 | Semantic cache, low latency |
| PostgreSQL | $0.10-0.30 | Cache with persistence |
| S3/object storage | $0.01-0.03 | Long-term cache, CDN |
| Vector DB (Pinecone, etc.) | $0.10-1.00 | Vector search for semantic cache |

### 4. Self-Hosted Inference Costs
When running models on your own GPU infrastructure:

| GPU | Cost/hr | Models | Throughput (tokens/s) |
|---|---|---|---|
| A10 (24GB) | $0.70-1.00 | 7B-13B models | 800-2000 |
| A100 (80GB) | $1.50-3.00 | 13B-70B models | 1500-4000 |
| H100 (80GB) | $3.00-5.00 | 70B+ models | 3000-8000 |
| L4 (24GB) | $0.50-0.80 | 7B models, embeddings | 600-1500 |

**Break-even analysis**: Self-hosting becomes cheaper than API calls at approximately:
- 7B model: ~5M tokens/day (API cost ~$750/month vs self-host ~$500/month)
- 70B model: ~50M tokens/day (API cost ~$75,000/month vs self-host ~$2000/month at A100 pricing)

## Basic Optimization Strategies

### Strategy 1: Cache Repetitive Queries
Caching is the highest-impact, lowest-effort optimization. For most applications, 20-40% of queries are repeats or near-repeats.

**Approach:**
1. Measure current query diversity (unique queries / total queries)
2. Implement exact-match cache first (low risk, immediate savings)
3. Layer semantic cache on top (higher hit rate, moderate risk)
4. Target > 30% cache hit rate for significant cost impact

**Expected savings**: 20-40% reduction in API calls

### Strategy 2: Compress Prompts
Reduce token count per query without losing task-relevant information.

**Approach:**
1. Reduce system prompt to essential instructions only (< 150 tokens)
2. Compress few-shot examples to the minimum viable set
3. Use selective context: only include relevant document chunks
4. Apply LLMLingua or similar compression for long contexts

**Expected savings**: 30-50% reduction in input tokens

### Strategy 3: Route by Complexity
Not every query needs a frontier model. Classify queries and route accordingly.

**Approach:**
1. Classify queries as simple / medium / complex
2. Route simple to cheap model (GPT-4o-mini, Claude Haiku, Llama-3-8B)
3. Route complex to expensive model only when necessary
4. Implement cascade: try cheap, fall back to expensive on low confidence

**Expected savings**: 40-70% reduction in per-query cost

### Strategy 4: Batch Process Requests
Group multiple requests into a single batch to amortize overhead.

**Approach:**
1. Group requests by arrival time (dynamic batching)
2. Use constant batching for real-time serving (vLLM)
3. Set max wait time to balance latency and throughput
4. Batch sizes of 4-16 typically give best cost-latency tradeoff

**Expected savings**: 30-50% per-batch cost reduction

### Strategy 5: Quantize Models
Reduce model precision to decrease memory and compute requirements.

| Precision | Memory Reduction | Quality Impact | GPU Requirement |
|---|---|---|---|
| FP16 | 2x vs FP32 | None | Most modern GPUs |
| INT8 | 4x vs FP32 | < 1% loss | A100, H100, RTX 4090 |
| INT4 | 8x vs FP32 | 1-3% loss | H100, some A100 |

**Approach:**
1. Start with FP16 (always safe, always beneficial)
2. Measure quality metrics with INT8
3. Only move to INT4 if quality impact is acceptable
4. Never quantize below INT4 for production systems

**Expected savings**: 50-75% memory reduction, enabling larger batch sizes and lower cost per token

## Cost Measurement Fundamentals

### Essential Metrics

```
Cost per Query (CPQ) = total_spend / total_queries
Cost per Token (CPT) = total_spend / total_tokens
Token Efficiency = output_tokens / input_tokens
Cache Hit Rate (CHR) = cache_hits / (cache_hits + cache_misses)
Model Utilization = queries_per_model / total_queries
Daily Burn Rate = spend_per_day
Monthly Projected = daily_burn_rate × 30
```

### Baseline Measurement

```python
import time
from datetime import datetime
from collections import defaultdict

class BaselineMeasurer:
    def __init__(self):
        self.records = []

    def record_call(self, model: str, input_tokens: int, output_tokens: int, cost: float):
        self.records.append({
            "timestamp": time.time(),
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost": cost,
        })

    def summary(self, days: int = 30) -> dict:
        cutoff = time.time() - days * 86400
        recent = [r for r in self.records if r["timestamp"] >= cutoff]
        if not recent:
            return {"error": "No data"}
        total_cost = sum(r["cost"] for r in recent)
        total_tokens = sum(r["total_tokens"] for r in recent)
        by_model = defaultdict(lambda: {"calls": 0, "cost": 0.0, "tokens": 0})
        for r in recent:
            m = by_model[r["model"]]
            m["calls"] += 1
            m["cost"] += r["cost"]
            m["tokens"] += r["total_tokens"]
        return {
            "period_days": days,
            "total_calls": len(recent),
            "total_cost": round(total_cost, 2),
            "avg_cost_per_call": round(total_cost / len(recent), 6),
            "cost_per_1k_tokens": round(total_cost / total_tokens * 1000, 6) if total_tokens > 0 else 0,
            "cost_by_model": {
                m: {"calls": v["calls"], "cost": round(v["cost"], 2), "tokens": v["tokens"]}
                for m, v in sorted(by_model.items(), key=lambda x: -x[1]["cost"])
            },
            "daily_avg": round(total_cost / days, 2),
        }
```

### Savings Calculation

When evaluating an optimization, compute:

```python
def optimize_savings(baseline_cpq: float, optimized_cpq: float, daily_queries: int) -> dict:
    daily_savings = (baseline_cpq - optimized_cpq) * daily_queries
    monthly_savings = daily_savings * 30
    annual_savings = daily_savings * 365
    savings_pct = (1 - optimized_cpq / baseline_cpq) * 100 if baseline_cpq > 0 else 0
    return {
        "baseline_cpq": baseline_cpq,
        "optimized_cpq": optimized_cpq,
        "savings_per_query": baseline_cpq - optimized_cpq,
        "savings_pct": round(savings_pct, 1),
        "daily_savings": round(daily_savings, 2),
        "monthly_savings": round(monthly_savings, 2),
        "annual_savings": round(annual_savings, 2),
    }
```

### Benchmarking Methodology

To establish reliable cost baselines:
1. **Sample size**: Minimum 1,000 queries per model/route combination
2. **Duration**: 7 days minimum to capture weekly patterns
3. **Exclude outliers**: Remove calls with >100K tokens (they skew averages)
4. **Segment by route**: Measure cost per simple, medium, complex query separately
5. **Track daily variance**: A "spiky" workload needs different optimization than steady-state
6. **Include latency**: Cost optimization that degrades latency >20% may need different approach
7. **Normalize by use case**: Don't compare cost/query across different tasks

## Key Points
- Token economics is the foundation: understand input vs output pricing asymmetry
- Inference costs dominate ongoing AI spend, not training
- Caching is the highest ROI optimization (20-40% savings, low effort)
- Output tokens cost 3-5x more than input tokens — prioritize output reduction
- Measure baseline for 7 days before any optimization
- Track cost per query, cost per token, cache hit rate, and model utilization
- Combine multiple strategies for multiplicative savings
- Self-hosting break-even depends on volume and model size
- Embedding costs can negate cache savings if not managed
- Always track cost impact on quality metrics, not just raw spend
- Implement cost monitoring before optimization, not after
- 80% of cost typically comes from 20% of use cases — target those first

## Quick Reference: Cost Optimization by Volume

| Daily Queries | Recommended First Actions | Expected Monthly Savings |
|---|---|---|
| < 1,000 | Prompt compression, system prompt optimization | $10-100 |
| 1K-10K | Semantic cache, model routing | $100-1,000 |
| 10K-100K | Tiered cache, dynamic batching, quantization | $1K-10K |
| 100K-1M | Continuous batching, self-hosting evaluation, distillation | $10K-100K |
| > 1M | Full pipeline: cache + routing + batching + quantization + distillation + self-host | $100K+ |
