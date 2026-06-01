# LLM Ops Advanced Topics

## Introduction
Advanced LLMOps covers production-grade patterns for multi-model orchestration, caching optimization, safety guardrails, agent operations, RAG quality monitoring, and distributed inference. This reference assumes fundamentals are in place and focuses on optimizing for scale, reliability, and quality.

## Multi-Model Orchestration

### Model Router Architecture
Query classification -> model selection -> fallback chain. Router must be fast (<50ms) and cheap (small classifier model or rule-based).

```
Classifier (7B quantized) or Rule-based (keyword/embedding)
  -> "simple"    -> {model: gpt-4o-mini, max_tokens: 500, temperature: 0.0}
  -> "reasoning" -> {model: gpt-4o, max_tokens: 2000, temperature: 0.3}
  -> "code"      -> {model: claude-3.5-sonnet, max_tokens: 4000, temperature: 0.0}
  -> "creative"  -> {model: claude-3.5-sonnet, max_tokens: 4000, temperature: 0.8}
  -> "unknown"   -> fallback to conservative model + log for classification review
```

**Routing Strategies:**
- Rule-based: keyword/pattern match. Fastest, most transparent.
- Embedding similarity: classify query embedding against predefined cluster centroids.
- LLM classifier: separate small model (GPT-4o-mini) classifies then routes. Best accuracy.
- Cost-aware: route to cheapest model whose quality meets threshold.

**Fallback Chain:**
```
primary -> fallback_1 -> fallback_2 -> error
gpt-4o -> claude-3.5-sonnet -> gpt-4o-mini -> return error with context
```
Each fallback stage tries: same prompt different model -> simplified prompt same model -> simplified prompt different model. Log fallback rate to detect chronic failures.

### Model Ensembles
Combine multiple model outputs for quality improvement:
- Voting: 3+ models, majority answer. Best for factoid QA.
- Re-rank: generate N candidates from M models, re-rank by quality scores.
- Sequential: model A generates, model B verifies/corrects, model C finalizes.

### Speculative Decoding
Use small "draft" model to generate candidate tokens, large "target" model to verify. If target accepts draft tokens, time saved. 2-3x speedup when draft acceptance rate >80%.
- Draft model: 7B-13B, same tokenizer as target
- Target model: 70B+
- Acceptance rate depends on task similarity between draft and target

## Advanced Caching

### Semantic Caching
Cache responses for semantically similar queries, not just exact matches. Embed query, find nearest neighbor in cache. If cosine similarity > threshold (0.92-0.98), return cached response.

```
query -> embed (text-embedding-3-small) -> nearest neighbor in vector DB
  if similarity > 0.95: return cached response (check expiration)
  else: call model, cache response with embedding
```

**Threshold selection:**
- 0.98: high precision, low recall. Safe for most use cases.
- 0.95: moderate both. Good for FAQ/knowledge base QA.
- 0.92: higher recall, risk of semantic mismatch. Use with output validation.

**Cache invalidation:**
- TTL-based: 5min for dynamic, 24h for static, 7d for reference
- Version-bust: new prompt version invalidates all associated cache entries
- Model-bust: model swap invalidates all cache entries

### Predictive Prefill
Pre-compute KV cache for common prompt prefixes. Store prefix KV cache, attach on request. Saves TTFT for shared system prompts or context retrieval prefixes.

```
Prefix: "You are a customer support agent... Context: [DOCUMENT] Question: "
-> Pre-compute KV cache up to "Context: " prefix
-> On request, append per-query KV to pre-computed prefix
-> Saves ~30-50% of TTFT for long system prompts
```

### Prefix Caching (vLLM)
vLLM automatically caches KV cache blocks for shared prompt prefixes. Requests with same prefix reuse cached blocks without recomputation. Most effective when many queries share a long prefix (system prompt + few-shot examples).

## Production Guardrails

### Guardrail Architecture
Three-layer defense: pre-processing -> inference -> post-processing.

```
Pre-processing          Inference              Post-processing
+--------------+    +--------------+    +--------------+
| Input filter |->  |   Model      |->  | Output filter |
| - PII detect |    | (with safety |    | - Toxicity    |
| - Injection  |    |  system      |    | - Factual     |
| - Size limit |    |  prompt)     |    | - Format      |
| - Rate limit |    +--------------+    | - Length      |
+--------------+                        +--------------+
```

### Input Guardrails
**Prompt Injection Detection:**
- Pattern-based: known attack signatures (DAN, jailbreak, role-play)
- Classifier-based: fine-tuned small model for injection classification
- Perplexity-based: injection attempts show high perplexity vs normal input
- Heuristic: unusual token distributions, excessive special chars, encoding tricks

**PII Detection:**
- Regex: emails, phone numbers, SSN, credit cards, API keys
- NER model: names, addresses, organizations
- Redaction policy: mask PII before model sees it (mask) or block request entirely (strict)

### Output Guardrails
**Content Moderation:**
- Toxicity: classify output for hate speech, violence, sexual content
- Safety: output against constitutional AI rules
- Topic restrictions: block outputs on disallowed topics

**Factual Consistency:**
- NLI model: does output contradict provided context? (faithfulness NLI)
- Claim extraction: extract claims from output, verify against knowledge base
- Self-consistency: generate multiple outputs, check for contradictions

### Guardrail Metrics
- Block rate: % of requests blocked at each layer. Expected: 0.1-2%
- False positive rate: blocked requests that were legitimate. Target: <5% of blocks
- False negative rate: harmful outputs that passed. Target: <0.01%
- Guardrail latency: total guardrail overhead. Budget: <50ms per layer

## Evaluation-Driven Observability

### Automated Quality Scoring
Every production response gets a quality score from an LLM-as-judge. Judge model runs asynchronously (or synchronously for critical paths). Score aggregated into dashboards and alerts.

```python
class QualityScorer:
    def score_response(self, prompt: str, context: str, response: str) -> dict:
        judge_prompt = f"""Evaluate this AI response:
Context: {context}
Question: {prompt}
Response: {response}

Rate each (1-5):
- Faithfulness: Does response agree with context?
- Helpfulness: Does response answer the question?
- Harmlessness: Is response safe and appropriate?
- Conciseness: Is response appropriately brief?
"""
        result = self.judge_model.generate(judge_prompt)
        parsed = self._parse_scores(result)
        parsed["overall"] = statistics.mean(parsed.values())
        parsed["flagged"] = any(v < 3 for v in parsed.values())
        return parsed
```

**Scoring latency budget:**
- Online: <500ms added latency, uses small judge (GPT-4o-mini), samples 10% of traffic
- Offline: batch score all responses asynchronously, updates dashboards with 5min delay
- Critical path: score every response on safety metrics synchronously

### Drift Detection

**Input Distribution Drift:**
Embed incoming queries, compare against baseline distribution. Metric: cosine distance between running average embedding and baseline centroid. Alert when distance exceeds threshold (typically 0.15-0.30 cosine distance).

```python
class DriftDetector:
    def __init__(self):
        self.baseline_centroid = None
        self.baseline_std = None

    def compute_drift(self, queries_24h: list[str], embedder) -> dict:
        embeddings = embedder.embed(queries_24h)
        current_centroid = np.mean(embeddings, axis=0)
        distance = np.linalg.norm(current_centroid - self.baseline_centroid)
        z_score = distance / max(self.baseline_std, 0.01)
        return {"distance": distance, "z_score": z_score, "drifted": z_score > 3}
```

**Output Distribution Drift:**
- Average response length: increases may indicate prompt degradation
- Refusal rate: decreases may mean safety erosion, increases may mean over-refusal
- Token distribution: shift in output tokens (more uncommon words, different language)
- Topic distribution: queries shift to new domains the model handles poorly

### Golden Dataset Evaluation
Maintain a curated set of 500-5000 test cases covering all use cases. Run on every prompt change and periodically (daily) to detect regression.

```yaml
golden_dataset:
  version: "v12"
  total_cases: 2500
  categories:
    factoid_qa: { count: 500, weight: 0.2 }
    reasoning: { count: 500, weight: 0.2 }
    summarization: { count: 300, weight: 0.15 }
    code_generation: { count: 300, weight: 0.15 }
    safety_edge_cases: { count: 500, weight: 0.2 }
    format_adherence: { count: 400, weight: 0.1 }
  pass_threshold: 0.95
  regression_threshold: 0.03
  schedule: "every 6 hours"
```

## Agent Ops

### Managing LLM-as-Agent
Agents introduce complexity: tool calls, loops, state, and unbounded cost.

**Key Metrics:**
- Turns per task: average number of LLM calls per completed task. Target: 3-5.
- Tool call success rate: % of tool calls that succeed on first attempt.
- Loop detection: agent stuck in repeated tool calls. Detect by: same tool+params repeated N times.
- Cost per task: total cost of all LLM calls for one task. Budget per task type.
- Completion rate: % of tasks completed successfully. Track by task type.

**Loop Prevention:**
- Max turns: hard limit (typically 10-25). Return partial result on limit.
- Dedup tool calls: if agent requests same tool+params twice, block and notify.
- Timeout per turn: agent must respond within N seconds per turn.
- Escalation path: if completion rate < threshold, fallback to human.

## RAG Ops

### Retrieval Quality Monitoring
**Retrieval Metrics:**
- Hit rate: does retrieved context contain the answer? Manual or LLM-judged on sample.
- MRR (Mean Reciprocal Rank): position of first relevant document.
- NDCG: ranking quality across all retrieved docs.
- Context relevance: cosine similarity between query and retrieved embedding.

**Context Utilization:**
- % of retrieved context actually used in generation (measured by token attention or summary overlap).
- If utilization <50%, retrieval is noisy -> reduce top_k or add re-ranker.
- Context window waste: monitor % of context window filled by retrieved docs. 80%+ means need larger window or better retrieval.

**RAG Failure Modes:**
```
No relevant context retrieved: fallback to "I don't know" or broader retrieval
Context contradicts model knowledge: faithfulness score drops, add NLI verification
Context too long/irrelevant: truncate or re-rank before feeding to generator
Context has conflicting answers: highlight disagreement, ask for clarification
```

## Scaling Strategies

### Distributed Inference
**Tensor Parallelism (TP):** split tensors across GPUs. Each GPU holds 1/TP of each layer. All GPUs compute simultaneously, all-reduce after each layer. Required for models >1 GPU memory. Overhead: ~10-20% inter-GPU communication.

**Pipeline Parallelism (PP):** split layers across GPUs. Lower communication overhead than TP but higher latency. Best combined with TP: TP within node, PP across nodes.

**Data Parallelism (DP):** full model replica on each GPU, split batch across GPUs. Simple, effective for small models.

**Combined: 3D Parallelism:** TP within node -> PP across nodes -> DP across nodes.

### Speculative Decoding
Deploy small draft model + large target model in same process. Draft generates K tokens, target verifies in single forward pass. 2-3x throughput for same quality.
Requires: draft and target share tokenizer. Draft acceptance rate >60% to be worthwhile. Best for: latency-sensitive applications where model quality must be high.

## Production Rollout Patterns

### Shadow Deployment
Run new model/prompt in parallel with production. Mirror real traffic but do not serve shadow outputs to users. Compare shadow vs production quality metrics asynchronously. Zero user risk. Use to validate quality before canary.

### Staged Rollout
```
Week 1 (Shadow): mirror 5% traffic, no user impact, gather quality metrics
Week 2 (1% Canary): route 1% real traffic, close monitoring, user feedback
Week 3 (10% Rollout): route 10%, watch for subtle regression, monitor drift
Week 4 (50% Rollout): route 50%, check for systemic issues at scale
Week 5 (100% Rollout): full traffic, archive old version, monitor 1 week post-rollout
```

### Cost-Aware Model Selection
When multiple models meet quality requirements, choose the cheapest. Maintain a cost-quality matrix updated monthly.

| Task | Model | Quality Score | Cost per Query | Selection |
|------|-------|--------------|----------------|-----------|
| Simple QA | GPT-4o-mini | 92% | $0.0003 | Default |
| Simple QA | Claude Haiku | 91% | $0.00025 | Cost-winner |
| Simple QA | Gemini Flash | 90% | $0.000075 | Budget option |
| Reasoning | GPT-4o | 97% | $0.015 | |
| Reasoning | Claude Sonnet | 96% | $0.015 | |
| Reasoning | DeepSeek-V3 | 94% | $0.0022 | Best value |

## Key Points
- Multi-model routing is the highest-leverage optimization: right model for each query
- Semantic caching requires careful threshold tuning: precision over recall
- Guardrails must be multi-layer: pre-processing, inference, post-processing
- LLM-as-judge scoring enables quality monitoring at production scale
- Drift detection requires continuous embedding-based monitoring
- Agent ops must enforce turn limits, loop detection, and cost per task
- RAG quality is bottlenecked by retrieval, not generator capability
- Speculative decoding gives 2-3x speedup with no quality loss
- Shadow deployments validate quality without user impact
- Cost-aware model selection should be reviewed monthly as pricing changes
- 3D parallelism (TP+PP+DP) is the standard for >70B model serving
- Evaluation-driven observability closes the loop between quality and operations
