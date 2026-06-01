# LLM Ops Fundamentals

## Overview
LLM Ops is the discipline of managing large language models in production. Unlike traditional MLOps (training, deployment, monitoring of predictive models), LLMOps must handle non-deterministic outputs, prompt sensitivity, context window constraints, token-based cost models, and unique failure modes (hallucination, refusal, drift). This reference covers fundamental concepts required to operate LLMs reliably at scale.

## Core Concepts

### LLM Lifecycle
```
Data Collection -> Training/FT -> Evaluation -> Deployment -> Monitoring -> Iteration
                               ^                                       |
                               +---------- Drift Detection ------------+
```

Each stage is an operational concern:
- Data: quality, deduplication, leakage prevention, format standardization
- Training: compute orchestration, checkpoint management, experiment tracking
- Evaluation: golden datasets, LLM-as-judge, human eval, regression testing
- Deployment: serving infrastructure, scaling, caching, routing
- Monitoring: quality, cost, latency, safety, drift
- Iteration: prompt tuning, fine-tuning, model swap, architecture change

### What Makes LLMOps Different from MLOps
| Aspect | Traditional MLOps | LLMOps |
|--------|------------------|--------|
| Output | Deterministic (classification, regression) | Non-deterministic (generation) |
| Cost Model | Compute time + storage | Tokens (input + output) x price |
| Monitoring | Accuracy, precision, recall | Faithfulness, hallucination, safety, refusal |
| Failure Mode | Model degradation | Hallucination, drift, prompt injection |
| Versioning | Model version only | Model + prompt + template version |
| Serving | CPU batch inference | GPU with KV cache, batching |
| Cold Start | Instant | Minutes (model load), seconds (cache warmup) |
| A/B Testing | Model comparison | Model + prompt comparison (2D) |

### Model Selection Fundamentals
**Open vs Closed:**
- Closed API: minimal ops overhead, per-token pricing, rate limits, data privacy concerns, provider dependency
- Open self-host: full control, fixed GPU cost at scale, operational overhead, requires ops expertise

**Size vs Cost:**
- 7B models: 1 GPU, ~2000 tok/s, good for simple/structured tasks
- 70B models: 4-8 GPUs, ~500 tok/s, required for complex reasoning
- 200B+ models: 8+ GPUs, highest quality, highest latency and cost

**Latency vs Quality:**
- Every 2x model size -> ~2x latency -> ? quality gain (diminishing returns)
- Distillation: train small model on large model outputs. ~90% quality at ~10% cost.

### Serving Fundamentals
**Hardware:**
- GPU memory must hold model weights + KV cache + overhead. Rule: 2x model size in GB for FP16 inference.
- Quantization: FP16 (2 bytes/param), INT8 (1 byte/param), FP4 (0.5 byte/param). Each reduces memory 2x but may degrade quality.
- KV cache per request: 2 x layers x hidden_dim x sequence_length x 2 bytes. At 8192 context with 70B model: ~4-8 GB per concurrent request.

**Batching:**
- Wait for N requests or T ms, then forward as batch. Higher batch = higher throughput = higher latency.
- Continuous batching (vLLM/TGI): add/remove requests mid-generation. No need to wait for slowest request.

**Quantization:**
- AWQ: activation-aware weight quantization. Best quality for INT4. Pre-compute scales offline.
- GPTQ: post-training quantization. Good INT4 quality. Slightly slower than AWQ for batch=1.
- FP8: native hardware support on H100. No re-calibration needed. Best quality.
- GGUF (llama.cpp): CPU-friendly quantization. Ops count scales well on CPU.

### Prompt Ops Fundamentals
Prompts are code. They require version control, testing, CI/CD, and monitoring.

**Template Structure:**
- System prompt: sets behavior, never user-modifiable
- Context: retrieved documents, dynamic per-query
- Instructions: task specification, output format
- Few-shot examples: input-output pairs for in-context learning

**Versioning:**
- File per prompt: YAML with template, params, model config, test refs
- VCS: Git with PR review, semantic versions, environment tags
- Registry: service that serves prompt by name+version at runtime

**Testing:**
- Golden dataset: curated input-output pairs with expected behavior
- Edge cases: empty input, very long context, adversarial prompts, PII in input
- Regression: run on previous production dataset, compare metrics
- Safety: toxicity, bias, refusal boundaries

### Monitoring Fundamentals
**LLM-Specific Metrics:**
- Time-to-first-token (TTFT): time to first output token. Proxy for user-perceived latency.
- Tokens-per-output-token (TPOT): time per output token. Determines streaming speed.
- Faithfulness: does output agree with provided context? LLM-as-judge score.
- Hallucination rate: outputs with claims not supported by context or knowledge.
- Refusal rate: appropriate (safety) vs inappropriate (over-refusal) rejections.
- Response length: consistent with expectations? Drift indicates prompt issue.

**Tiered Observability:**
```
L1 Infrastructure: GPU util, VRAM, TTFT, TPOT, queue depth, error rate
L2 Cost: tokens/request, cost/query, daily spend, cost/user
L3 Quality: faithfulness, hallucination rate, safety score, user satisfaction
L4 Drift: input embedding distance, output length shift, topic shift
```

### Cost Fundamentals
**Token Accounting:**
- 1 token ~ 0.75 words for English. Varies by language (CJK: 1 token ~ 1 char).
- Input/output ratio varies by use case: Q&A ~5:1, summarization ~1:5, agent ~10:1.

**Pricing Models:**
- API: input tokens x price_in + output tokens x price_out. Output is 3-5x cost of input.
- Self-host: GPU rental x hours + storage + networking + ops labor. Fixed per month.
- Break-even: compare API monthly cost vs self-host TCO. Self-host wins at sufficient volume.

**Cost Levers (in order of impact):**
1. Model selection: switch to more efficient model (2-10x savings)
2. Model routing: cheap model for simple queries (40-70% savings)
3. Prompt optimization: shorter prompts = fewer input tokens (10-30% savings)
4. Caching: exact-match + semantic cache (20-50% hit rate savings)
5. Batch size: larger batches = better GPU utilization per token
6. Quantization: FP8/INT4 vs FP16 (2x throughput, no quality loss with FP8)

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Version prompts as code | YAML in Git, PR reviews, semantic versions | High |
| Test prompts before deploy | Golden dataset with automated eval gates | High |
| Tiered monitoring | L1 infra -> L2 cost -> L3 quality -> L4 drift | High |
| Model routing | Cheaper model for simple queries | High |
| Cache responses | Exact-match first, semantic second | High |
| Budget alerts | Warn at 75%, block at 100% | High |
| Canary prompt deploys | 5% -> 25% -> 50% -> 100% with auto-rollback | High |
| Track cost per query | Know unit economics per feature/user | Medium |
| Quantize for inference | FP16 or lower, never FP32 | Medium |
| Measure drift | Embedding distance, output distribution | Medium |
| LLM-as-judge eval | Automated quality scoring in CI | Medium |

## Common Pitfalls

### Pitfall 1: One Model for Everything
Using the largest model for every query. A query classifier routing to GPT-4o-mini for simple Q&A saves 40-70% with no user-facing quality difference.

### Pitfall 2: No Prompt Versioning
"Which prompt is deployed in production?" becomes an investigation. Manual edits in production DB/code create unreproducible states. Fix: Git-based prompt registry with runtime API.

### Pitfall 3: Ignoring Cost Per Query
Tracking total spend but not cost per query. Without unit economics, you cannot predict how scaling affects budget, or attribute cost to features/teams.

### Pitfall 4: Vanity Monitoring
Tracking only latency and uptime. Hallucination rate could double without any infrastructure alert. Must track quality metrics as first-class SLOs.

### Pitfall 5: Deploying Without Eval
"Looks good to me" prompt changes cause silent quality regressions. Automated eval on golden dataset must be a CI gate.

### Pitfall 6: Neglecting Context Window
Production context lengths drift upward over time as use cases expand. Monitor P95 context length. 128K context on models with 8192 training = quality degradation at length.

### Pitfall 7: No Rollback Plan
Every deploy should have a tested rollback path. Rollback by: feature flag toggle (<1s), traffic rebalance (immediate), Git revert + deploy (~2min).

## Key Points
- LLMOps differs fundamentally from MLOps: non-deterministic, token-based, prompt-sensitive
- Prompts are code: version, test, CI/CD -- cannot be repeated enough
- Model routing is the highest-impact cost lever: match model to query complexity
- Cache everything: exact-match, semantic, prefix KV cache
- Monitor in tiers: infra -> cost -> quality -> drift
- Cost per query is the unit economics of LLM operations
- Test prompts on golden dataset before every deployment
- Every deployment must have a tested rollback path
- Context window monitoring prevents silent quality degradation
- Quantize for inference: never serve FP32
