---
name: ai-llm-ops
description: >
  Use this skill when deploying, serving, fine-tuning, or monitoring LLMs in production: model serving (vLLM, TGI, Ollama, Triton), fine-tuning (LoRA, QLoRA, full), cost tracking, model evaluation, prompt versioning, A/B testing.
  This skill enforces: serving infrastructure specification, fine-tuning parameter documentation, cost model calculation, monitoring and alerting setup.
  Do NOT use for: prompt engineering, RAG pipeline design, data labeling, ML infrastructure outside LLMs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, llm-ops, phase-10]
---

# LLMOps Agent

## Purpose
Designs production LLM deployment plans covering serving infrastructure, fine-tuning configuration, cost modeling, monitoring, and prompt version management.

## Agent Protocol

### Trigger
User request includes: LLMOps, model serving, fine-tuning, model deployment, token cost, model monitoring, prompt versioning, A/B test, vLLM, TGI, Ollama, Triton, LoRA, QLoRA.

### Protocol
1. Clarify model size, traffic pattern, latency SLA, and budget constraints.
2. Design serving infrastructure with hardware spec and scaling plan.
3. Specify fine-tuning approach if applicable (LoRA vs QLoRA vs full).
4. Build cost model covering compute, API, storage, and monitoring.
5. Design monitoring dashboard with key metrics and alert thresholds.
6. Configure prompt versioning and deployment rollout strategy.

## Output
LLM deployment plan with serving config, cost model, monitoring setup.

### Response Format
```
## LLM Deployment Plan
### Serving Configuration
Framework: {vLLM/TGI/Ollama/Triton}
Model: {name} | Quantization: {none/FP16/INT8/AWQ/GPTQ}
Hardware: {GPU type × count}
Scaling: {min/max replicas, trigger metric}
Throughput: {tokens/s} | Latency P99: {ms}

### Fine-Tuning (if applicable)
Method: {LoRA/QLoRA/Full}
Rank: {r} | Alpha: {value} | Target Modules: {modules}
Dataset: {size, source} | Epochs: {N} | Learning Rate: {value}

### Cost Model
Compute: ${N}/mo | API: ${N}/mo | Storage: ${N}/mo
Total: ${N}/mo | Breakeven: {tokens/month}
Per-Token Cost: ${value}

### Monitoring
Metrics: {TTFT, TPOT, latency, throughput, error rate, cost}
Alert on: {latency P99 > 5s, error rate > 1%, cost spike > 20%}
Dashboard: {tool}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Serving framework selected and configured for model size and traffic.
- [ ] Hardware spec justified against throughput and latency requirements.
- [ ] Fine-tuning method specified with rank, target modules, training params.
- [ ] Cost model itemizes compute, API, storage with per-token breakdown.
- [ ] Monitoring covers performance, cost, errors, and drift.
- [ ] Prompt versioning strategy with rollout and rollback plan.

## Workflow

### Step 1: Requirements Gathering
Determine: model size (parameters), context length, expected requests/minute, peak traffic multiplier, latency P99 target, available GPU budget.

### Step 2: Serving Framework Selection
- vLLM: best throughput for open-source LLMs. PagedAttention, continuous batching, tensor parallelism.
- TGI: Hugging Face ecosystem, good for smaller models, seamless HF integration.
- Ollama: local dev and small-scale deployment, simplest setup, limited scaling.
- Triton Inference Server: multi-model serving, model ensembles, GPU optimization.

### Step 3: Fine-Tuning Configuration
- LoRA: r=8-64, alpha=16-128, target q_proj/k_proj/v_proj/o_proj. Requires full precision base in memory.
- QLoRA: 4-bit NF4 quantization + LoRA. Train on single GPU. Slightly lower quality than LoRA.
- Full fine-tune: highest quality, highest cost. Requires multi-GPU with FSDP/DeepSpeed ZeRO-3.

### Step 4: Cost Modeling
- Compute: GPU hours × instance cost. A100-80GB: ~$2/hr, H100: ~$4/hr.
- API cost: input tokens × price + output tokens × price for hosted models.
- Storage: model weights + LoRA adapters + cached embeddings.
- Break-even: compare monthly API cost vs. self-hosted TCO.

### Step 5: Monitoring Setup
- Performance: time-to-first-token (TTFT), tokens-per-output-token (TPOT), request latency, throughput.
- Cost: tokens per request, cost per user, daily spend.
- Quality: response rejection rate, user feedback score, hallucination rate.
- Alerts: P99 latency breach, error rate spike, cost anomaly, model drift.

### Step 6: Prompt Versioning
- Store prompts in VCS with semantic versioning.
- A/B test prompt variants with traffic splitting (10% canary → 50% → 100%).
- Track prompt-to-model mapping per deployment environment.
- Rollback: revert to previous prompt version on metric regression.

## Rules
- Never deploy unquantized FP32 models — always use FP16 or quantization.
- LoRA adapters are additive: deploy multiple adapters on one base model.
- P50 latency matters for UX, P99 latency matters for SLOs.
- Self-hosting breaks even at ~10M+ tokens/day vs. API.
- Always A/B test prompt changes with a 10% canary before full rollout.
- Monitor for drift: input distribution, output length, refusal rate.

## References
  - references/deployment-patterns.md — LLM Deployment Patterns
  - references/fine-tuning.md — Fine-Tuning
  - references/llm-ops-advanced.md — Llm Ops Advanced Topics
  - references/llm-ops-cost-management.md — LLM Ops Cost Management
  - references/llm-ops-fundamentals.md — Llm Ops Fundamentals
  - references/llm-ops-incident-management.md — LLM Ops Incident Management
  - references/model-serving.md — Model Serving Frameworks
  - references/prompt-management.md — Prompt Management
## Handoff
For serving infrastructure scaling, hand off to `ai-vector-databases`. For evaluation after deployment, hand off to `ai-evals`.
