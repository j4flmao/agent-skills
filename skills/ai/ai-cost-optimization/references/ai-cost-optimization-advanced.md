# AI Cost Optimization Advanced Topics

## Introduction
Advanced AI cost optimization extends beyond basic caching and routing into sophisticated techniques: speculative decoding, KV cache optimization, multi-model strategies with dynamic routing, model distillation pipelines, and enterprise-grade cost governance with chargeback. This reference assumes mastery of fundamentals and addresses production systems processing >100K queries/day.

## Advanced Inference Optimization

### Speculative Decoding
Speculative decoding uses a cheap draft model to generate candidate tokens, which are then verified by the target model in parallel. This reduces the number of sequential target model calls.

```
How it works:
1. Draft model (e.g., 7B) generates K candidate tokens cheaply
2. Target model (e.g., 70B) verifies all K tokens in one forward pass
3. Accepted tokens are used; rejected tokens trigger re-generation

Speedup: 2-3x for large models
Cost impact: DRAFT_COST + (VERIFICATION_COST / K) vs FULL_COST per token
- Net savings: 40-60% when draft/target size ratio > 10x
```

```python
class SpeculativeDecoder:
    def __init__(self, draft_model, target_model, num_speculations: int = 5):
        self.draft = draft_model
        self.target = target_model
        self.K = num_speculations
        self.draft_cost_per_token = 0.000001  # example: $/token
        self.target_cost_per_token = 0.00001

    async def generate(self, prompt: str, max_tokens: int = 256) -> tuple[str, float]:
        generated = []
        total_cost = 0.0
        while len(generated) < max_tokens:
            prefix = prompt + "".join(generated)
            draft_tokens = self.draft.generate(prefix, max_new_tokens=self.K)
            draft_cost = len(draft_tokens) * self.draft_cost_per_token
            verified = self.target.verify(prefix, draft_tokens)
            target_cost = self.target_cost_per_token * len(verified)
            total_cost += draft_cost + target_cost
            n_accepted = self._count_accepted(draft_tokens, verified)
            generated.extend(verified[:n_accepted])
            if n_accepted < self.K:
                generated.append(verified[-1])
        return "".join(generated), total_cost

    def _count_accepted(self, draft: list[str], verified: list[str]) -> int:
        return sum(1 for d, v in zip(draft, verified) if d == v)
```

**Trade-offs:**
- Requires running two models simultaneously (draft + target)
- Speedup depends on acceptance rate (typically 60-90%)
- Best for latency-sensitive applications where cost is secondary
- Complex to implement; requires custom inference server

### KV Cache Optimization

The KV cache stores key-value vectors from the attention computation during autoregressive generation. For long sequences, it dominates GPU memory usage.

```
KV Cache Memory Formula:
  memory_bytes = 2 × batch_size × num_layers × num_heads × head_dim × seq_len × precision_bytes
    × 2 (for keys + values)

Example: Llama-2-70B, batch=1, seq=4096, FP16
  = 2 × 1 × 80 × 64 × 128 × 4096 × 2 × 2 = 21.5 GB per sequence
```

```python
class KVMemoryEstimator:
    def estimate(self, layers: int, heads: int, head_dim: int, seq_len: int,
                 batch: int = 1, precision_bytes: int = 2) -> dict:
        kv_bytes = 2 * batch * layers * heads * head_dim * seq_len * precision_bytes * 2
        return {
            "total_bytes": kv_bytes,
            "total_gb": round(kv_bytes / (1024**3), 2),
            "batch_size": batch,
            "sequence_length": seq_len,
            "per_sequence_gb": round(kv_bytes / batch / (1024**3), 2),
        }
```

**KV Cache Optimization Techniques:**

| Technique | Memory Reduction | Latency Impact | Implementation |
|---|---|---|---|
| PagedAttention | 60-80% | Minimal | Use vLLM |
| Prefix caching | 30-50% (shared prefixes) | None | vLLM `enable_prefix_caching` |
| KV cache quantization (INT8) | 50% | < 1% overhead | KIVI, Atom |
| KV cache eviction (budget) | 40-60% | 1-5% accuracy drop | StreamingLLM, H2O |
| Multi-query attention (MQA) | 75-87% | < 2% quality loss | Model architecture choice |
| Grouped query attention (GQA) | 50-75% | < 1% quality loss | Llama 2/3, Mistral |
| Window attention | Sequence-dependent | Quality drop on long context | Sliding window |
| Cache pruning (H2O) | 20-40% | 1-3% accuracy drop | Heavy Hitter Oracle |

```python
class PagedAttentionOptimizer:
    def __init__(self, block_size: int = 16, gpu_memory_gb: float = 80.0,
                 model_memory_gb: float = 35.0):
        self.block_size = block_size
        self.available = gpu_memory_gb * 1024 - model_memory_gb * 1024 - 1024

    def max_concurrent_sequences(self, avg_seq_len: int, kv_per_block_mb: float = 0.5) -> int:
        kv_per_seq = (avg_seq_len / self.block_size) * kv_per_block_mb
        return int(self.available / (kv_per_seq * 1024))

    def recommend_block_size(self, avg_seq_len: int) -> int:
        if avg_seq_len < 256:
            return 8
        elif avg_seq_len < 2048:
            return 16
        return 32

    def memory_utilization(self, num_sequences: int, avg_seq_len: int) -> float:
        kv_per_seq = (avg_seq_len / self.block_size) * 0.5
        used = num_sequences * kv_per_seq * 1024 + 1024  # +1GB overhead
        return used / (self.available + 1024) * 100
```

### Flash Attention

Flash Attention computes exact attention with O(n) memory vs O(n²). It tiles the attention computation to fit in fast SRAM, avoiding large memory allocations.

```python
# Without Flash Attention: O(n²) memory, O(n²) time
# With Flash Attention: O(n) memory, 2-4x faster for long sequences

# Using Hugging Face Transformers
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-chat-hf",
    torch_dtype=torch.float16,
    attn_implementation="flash_attention_2",
    device_map="auto",
)

# Benefits:
# - 2-4x faster for sequences > 1K tokens
# - No quality loss (exact computation, just memory-optimized)
# - Enables larger batch sizes or longer contexts
```

**When to use Flash Attention:**
- Sequences > 512 tokens: significant speedup
- High-throughput serving: enables larger batches
- Memory-constrained GPUs: reduces peak memory
- Always: there is zero quality impact

### Continuous Batching with vLLM

```python
from vllm import LLM, SamplingParams

# Initialize with optimal settings for cost
llm = LLM(
    model="meta-llama/Llama-2-7b-chat-hf",
    tensor_parallel_size=1,
    gpu_memory_utilization=0.90,
    max_num_batched_tokens=4096,
    max_num_seqs=256,
    enable_prefix_caching=True,
    trust_remote_code=True,
)

sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=256,
    stop=["\n\n"],
)

# Batch inference
prompts = ["Query 1", "Query 2", "Query 3"]
outputs = llm.generate(prompts, sampling_params)
```

**Cost impact of continuous batching:**
- GPU utilization: 30-50% → 80-95%
- Throughput: 3-5x increase on same hardware
- Cost per token: 60-80% reduction
- Latency impact: +20-100ms per request (acceptable for most use cases)

## Multi-Model Cost Strategies

### Dynamic Model Routing

Advanced routing goes beyond simple heuristic classification to use:
1. **ML-based classifier**: Train a small model to predict query complexity
2. **Cost-aware routing**: Factor in remaining budget when selecting model
3. **Confidence-based escalation**: Use smaller model first, escalate if confidence low
4. **Adaptive routing**: Monitor quality metrics and adjust routing thresholds

```python
import numpy as np
from typing import Callable, Optional

class DynamicRouter:
    def __init__(self, budget_per_day: float = 100.0):
        self.models = {
            "cheap": {"model": "gpt-4o-mini", "cost_per_query": 0.0002},
            "mid": {"model": "gpt-4o", "cost_per_query": 0.003},
            "expensive": {"model": "o1", "cost_per_query": 0.015},
        }
        self.budget = budget_per_day
        self.spent_today = 0.0
        self.routing_stats = {"cheap": 0, "mid": 0, "expensive": 0}
        self.classifier: Optional[Callable] = None

    def set_classifier(self, clf: Callable[[str], dict]):
        self.classifier = clf

    def classify(self, query: str) -> str:
        if self.classifier:
            result = self.classifier(query)
            return result.get("tier", "mid")
        word_count = len(query.split())
        if word_count < 15:
            return "cheap"
        if word_count > 100 or any(kw in query.lower() for kw in ["reason", "math", "code", "analyze"]):
            return "expensive"
        return "mid"

    def select_model(self, query: str) -> tuple[str, str]:
        tier = self.classify(query)
        if self.spent_today >= self.budget * 0.95:
            tier = "cheap"
        elif self.spent_today >= self.budget * 0.8:
            if tier == "expensive":
                tier = "mid"
        self.routing_stats[tier] += 1
        config = self.models[tier]
        self.spent_today += config["cost_per_query"]
        return config["model"], tier

    def reset_daily(self):
        self.spent_today = 0.0
        self.routing_stats = {"cheap": 0, "mid": 0, "expensive": 0}

    def route_summary(self) -> dict:
        total = sum(self.routing_stats.values())
        return {
            "distribution": {k: round(v / max(total, 1) * 100, 1) for k, v in self.routing_stats.items()},
            "spent_today": round(self.spent_today, 2),
            "budget": self.budget,
            "remaining": round(self.budget - self.spent_today, 2),
        }
```

### Model Cascade Strategy

Cascade routing tries progressively more expensive models, stopping when quality is sufficient.

```python
class ConfidenceCascade:
    def __init__(self, llm_call: Callable, confidence_fn: Callable[[str], float]):
        self.tiers = [
            {"model": "gpt-4o-mini", "cost": 0.0002, "confidence_threshold": 0.9},
            {"model": "gpt-4o", "cost": 0.003, "confidence_threshold": 0.95},
            {"model": "o1", "cost": 0.015, "confidence_threshold": 1.0},
        ]
        self.llm = llm_call
        self.confidence = confidence_fn

    async def execute(self, prompt: str, max_cost: Optional[float] = None) -> tuple[str, str, float]:
        for tier in self.tiers:
            if max_cost and tier["cost"] > max_cost:
                continue
            result = await self.llm(model=tier["model"], prompt=prompt)
            confidence = self.confidence(result)
            if confidence >= tier["confidence_threshold"]:
                return result, tier["model"], tier["cost"]
        last_tier = self.tiers[-1] if not max_cost else min(self.tiers, key=lambda t: t["cost"])
        result = await self.llm(model=last_tier["model"], prompt=prompt)
        return result, last_tier["model"], last_tier["cost"]
```

**Expected cascade savings**: 50-80% vs always using frontier model, with < 1% quality degradation.

### Model Distillation Pipeline

Distillation trains a small "student" model to replicate the behavior of a large "teacher" model. This is the most aggressive cost optimization, reducing per-token cost by 10-100x.

```
Pipeline:
1. Collect teacher outputs: Run 10K-100K queries through frontier model
   Cost: $500-$5,000 (one-time)
2. Train student model: Fine-tune small model (e.g., Llama-3-8B) on teacher outputs
   Cost: $100-$1,000 (one-time GPU)
3. Deploy student model: Self-hosted, 90-98% cheaper per query
   Cost: $0.000002-0.00001 per token (vs $0.00001-0.0001 for API)
```

```python
class DistillationPipeline:
    def __init__(self, teacher_model: str, student_model: str):
        self.teacher = teacher_model
        self.student = student_model

    def collect_training_data(self, queries: list[str], output_path: str):
        pairs = []
        for q in queries:
            response = self.llm_call(model=self.teacher, prompt=q)
            pairs.append({"input": q, "output": response})
        with open(output_path, "w") as f:
            json.dump(pairs, f)

    def calculate_roi(self, queries_per_day: int, teacher_cost_per_query: float,
                      student_cost_per_query: float, distillation_cost: float) -> dict:
        daily_savings = queries_per_day * (teacher_cost_per_query - student_cost_per_query)
        payback_days = distillation_cost / max(daily_savings, 0.01)
        return {
            "teacher_cost_per_day": queries_per_day * teacher_cost_per_query,
            "student_cost_per_day": queries_per_day * student_cost_per_query,
            "daily_savings": daily_savings,
            "distillation_cost": distillation_cost,
            "payback_days": round(payback_days, 1),
            "annual_savings": round(daily_savings * 365, 2),
        }
```

**When to distill:**
- > 100K queries/day with consistent task focus
- Task quality requirements are well-defined
- You have ML engineering resources for fine-tuning
- The task domain is specific (customer support, code review, classification)

**When NOT to distill:**
- Task diversity is high (general-purpose assistant)
- Query volume < 10K/day (payback period too long)
- Quality requirements demand frontier-level performance consistently
- No ML infrastructure for training and evaluation

## Enterprise Cost Governance

### Chargeback and Showback Models

**Showback**: Inform teams of their AI costs without charging them.
- Pros: Increases awareness, low friction
- Cons: No accountability, teams may ignore
- Best for: Initial rollout, < 5 teams

**Chargeback**: Deduct AI costs from team budgets.
- Pros: Direct accountability, drives optimization
- Cons: Can cause friction, requires accurate allocation
- Best for: > 5 teams, cost-conscious organizations

```python
class ChargebackSystem:
    def __init__(self):
        self.allocation_rules: dict[str, Callable] = {}
        self.team_budgets: dict[str, float] = {}
        self.team_spend: dict[str, float] = defaultdict(float)

    def add_rule(self, team: str, matcher: Callable[[dict], bool]):
        self.allocation_rules[team] = matcher

    def allocate(self, cost_record: dict) -> str:
        for team, matcher in self.allocation_rules.items():
            if matcher(cost_record):
                self.team_spend[team] += cost_record.get("cost", 0)
                return team
        self.team_spend["unallocated"] += cost_record.get("cost", 0)
        return "unallocated"

    def team_summary(self) -> list[dict]:
        return [
            {"team": team, "spend": round(spend, 2),
             "budget": self.team_budgets.get(team, float("inf")),
             "utilization": round(spend / max(self.team_budgets.get(team, 1), 0.01) * 100, 1)
             if team in self.team_budgets else None}
            for team, spend in sorted(self.team_spend.items(), key=lambda x: -x[1])
        ]

    def set_team_budget(self, team: str, monthly_budget: float):
        self.team_budgets[team] = monthly_budget
```

### Budget Governance Lifecycle

```
Monthly Cycle:
Week 1: Budget allocation review (finance + team leads)
Week 2: Mid-month spend check, anomaly investigation
Week 3: Optimization review (what's working, what's not)
Week 4: Month-end reconciliation, chargeback reports, next month adjustments
```

**Cost Review Board Composition:**
- Engineering lead (owns model usage decisions)
- Finance/FinOps (owns budget and chargeback)
- Product manager (owns feature cost trade-offs)
- ML engineer (owns optimization implementation)
- Executive sponsor (resolves budget escalations)

### Budget Enforcement Policies

| Policy | Description | User Impact | Best For |
|---|---|---|---|
| Soft cap | Alert at threshold, no action | None | Awareness phase |
| Auto-fallback | Route to cheaper model when budget tight | Minor (slower/simpler responses) | Most organizations |
| Rate limiting | Throttle expensive model calls | Slight delay | High-volume systems |
| Feature gating | Disable non-critical AI features | Major | Emergency cost control |
| Hard block | Reject all non-critical queries | Severe | Budget hard stop |

### Cost Optimization Maturity Model

| Level | Name | Characteristics | Savings |
|---|---|---|---|
| 1 | Ad-hoc | No tracking, manual review, reactive | 0% |
| 2 | Aware | Basic cost tracking, monthly reports | 10-20% |
| 3 | Managed | Cache + routing, budget alerts, per-team tracking | 30-50% |
| 4 | Optimized | Automated enforcement, cascade routing, continuous batching | 50-70% |
| 5 | Automated | Real-time optimization, ML-driven routing, distillation, auto-scaling | 70-90% |

## Real-World Case Studies

### Case 1: SaaS Platform Reducing Costs by 65%

**Context**: Customer support chatbot handling 50K queries/day
**Baseline**: GPT-4, $7,500/month, $0.005/query

**Optimizations Applied:**
1. Semantic cache with 0.92 threshold → 28% hit rate
2. Three-tier routing: simple → GPT-4o-mini, medium → GPT-4o, complex → GPT-4
3. System prompt compression: 350 → 95 tokens
4. Dynamic batching with 150ms max wait

**Results:**
- Monthly cost: $7,500 → $2,625
- Cache hit rate: 28% (target exceeded)
- Simple queries (65%) → GPT-4o-mini: $0.00015/query
- Complex queries (10%) → GPT-4: $0.005/query
- Average cost: $0.00175/query
- Latency impact: +85ms P50 (within SLA)
- Quality: < 1% degradation on user satisfaction score

**Key Lesson**: Routing was 70% of savings. Cache was 25%. Token optimization was 5%.

### Case 2: Enterprise Document Processing at Scale

**Context**: Legal document analysis, 10K documents/day, 200K tokens per document
**Baseline**: Claude Opus, $180,000/month

**Optimizations Applied:**
1. Selective context: Only include relevant sections (reduced from 200K to 30K tokens avg)
2. LLMLingua compression at 0.45 rate
3. Cascade: Claude Sonnet for 80%, Claude Opus for 20% (complex clauses)
4. Prompt caching (Anthropic API): 40% reduction in input token cost
5. Structured output to reduce output tokens

**Results:**
- Monthly cost: $180,000 → $28,800 (84% reduction)
- Average tokens per document: 200K → 30K (input), 2000 → 800 (output)
- Cascade distribution: 80% Sonnet, 20% Opus
- Quality: 3% improvement in clause detection accuracy (prompt engineering side effect)

**Key Lesson**: Context selection is the most powerful lever for long-document workloads. Reducing input tokens by 85% dominated savings.

### Case 3: Self-Hosted Model Serving

**Context**: Real-time code completion, 500K requests/day
**Baseline**: GPT-4o-mini API, $22,500/month

**Decision**: Self-host Llama-3-8B with INT4 quantization on 2x A10 GPUs

**Optimizations Applied:**
1. Self-hosted Llama-3-8B with vLLM
2. INT4 quantization (AWQ): 6GB VRAM per model copy
3. Prefix caching: 35% hit rate on shared code contexts
4. Continuous batching: 200 concurrent requests per GPU
5. Speculative decoding: 2x throughput with 7B draft → 8B target

**Results:**
- Monthly cost: $22,500 → $1,200 (GPU rental + ops)
- Throughput: 1500 tokens/s per GPU
- Latency P50: 120ms (vs API 200ms)
- Quality: Comparable for code completion (main task)
- Payback period: 3 days (infra setup costs)
- Annual savings: ~$255,000

**Key Lesson**: Self-hosting with quantization is transformative at high volume. Break-even was 3 days.

## Advanced Trade-offs

### Optimization Diminishing Returns

```
First 50% savings: Easy (cache + routing + compression)
Next 25% savings: Moderate (quantization + batching)
Next 15% savings: Hard (distillation + speculative decoding)
Last 10% savings: Very hard (custom hardware + architecture changes)
```

### Cost-Quality Pareto Frontier

When optimizing, the Pareto frontier describes the optimal trade-off between cost and quality. Any point on the frontier is optimal — you cannot improve cost without sacrificing quality, or vice versa.

```python
class ParetoAnalyzer:
    def __init__(self):
        self.points: list[dict] = []

    def add_config(self, name: str, cost_per_query: float, quality_score: float):
        self.points.append({"name": name, "cost": cost_per_query, "quality": quality_score})

    def pareto_frontier(self) -> list[dict]:
        sorted_pts = sorted(self.points, key=lambda p: p["cost"])
        frontier = []
        max_quality = 0
        for pt in sorted_pts:
            if pt["quality"] > max_quality:
                frontier.append(pt)
                max_quality = pt["quality"]
        return frontier

    def recommend(self, min_quality: float, max_cost: float) -> Optional[dict]:
        feasible = [p for p in self.points if p["quality"] >= min_quality and p["cost"] <= max_cost]
        if not feasible:
            return None
        return min(feasible, key=lambda p: p["cost"])
```

### Model Selection Maturity

| Stage | Approach | Cost vs Frontier |
|---|---|---|
| 1 | Single frontier model | 1x (baseline) |
| 2 | Two-tier routing (cheap/frontier) | 0.3-0.5x |
| 3 | Three-tier routing (cheap/mid/frontier) | 0.2-0.4x |
| 4 | Cascade with confidence checking | 0.15-0.3x |
| 5 | ML-driven routing with adaptation | 0.1-0.2x |
| 6 | Distilled model for primary, frontier for edge cases | 0.02-0.1x |
| 7 | Speculative decoding + distilled + routing | 0.01-0.05x |

## Key Points
- Speculative decoding: 2-3x speedup with draft model verification
- KV cache optimization can reduce memory 40-80% with minimal quality impact
- Flash Attention: always use if available (zero quality loss, 2-4x faster long sequences)
- ML-driven routing beats heuristic routing by 10-20% on cost-quality tradeoff
- Cascade strategy: 50-80% savings with < 1% quality degradation
- Model distillation: 10-100x cost reduction for high-volume, focused tasks
- Enterprise governance requires chargeback/showback, budget enforcement, and cost reviews
- Self-hosting break-even: ~5M tokens/day for 7B models, ~50M for 70B models
- The Pareto frontier defines optimal cost-quality trade-offs
- Diminishing returns: first 50% savings is easy, next 25% moderate, final 25% hard
- Track cost per query and cost per unit of quality (e.g., $ per correct answer)
- Implement budget governance before you need it — reactive enforcement causes friction
- Monthly cost review with optimization iteration prevents cost creep
- Embedding costs compound with scale — batch and cache all embedding operations
- Continuous batching is the single highest-impact optimization for self-hosted inference
