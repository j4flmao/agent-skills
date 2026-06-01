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
Designs and governs production LLM systems across the entire lifecycle: model selection, serving infrastructure, fine-tuning, prompt management, deployment pipelines, monitoring, cost governance, and incident response. Produces actionable deployment plans with quantified tradeoffs between latency, throughput, cost, and quality.

## Decision Trees

### Scale-Based Stack Selection

```
<1K req/day:
  -> Serverless API (OpenAI, Anthropic, together.ai)
  -> No GPU infra, usage-based pricing
  -> Retry/fallback to secondary provider

1K-100K req/day:
  -> vLLM or TGI on 1-4 GPUs
  -> Single-instance or nginx load-balanced
  -> Self-host or Modal/Replicate/banana.dev
  -> Spot GPU instances for cost savings

100K-1M req/day:
  -> vLLM cluster with LB + HPA auto-scaling
  -> Tensor parallelism for models >30B
  -> Prefix caching + continuous batching enabled
  -> Spot GPU for burst, reserved for baseline

>1M req/day:
  -> Multi-region vLLM fleet with global LB
  -> Triton for multi-model ensembles (embedding -> reranker -> LLM)
  -> Custom CUDA kernels, FlashAttention-3, FP8 inference
  -> Dedicated GPU clusters with reserved/on-demand mix
  -> Model distillation pipeline (large teacher -> small student)
```

### Budget-Based Stack Selection

```
<$500/mo:
  -> API only: GPT-4o-mini, Claude Haiku, Gemini Flash
  -> Single-layer response cache (Redis, in-memory)
  -> No fine-tuning, prompt optimization only
  -> Manual cost review weekly

$500-$5,000/mo:
  -> Mix API + self-host small models (7-8B)
  -> vLLM on spot GPUs (1x A10G/A100)
  -> QLoRA fine-tuning on consumer GPU (RTX 4090)
  -> Multi-layer caching: exact-match + semantic
  -> Simple model routing: cheap model for simple queries

$5,000-$50,000/mo:
  -> Self-host primary models (70B+) on reserved GPUs
  -> vLLM cluster with prefix caching + speculative decoding
  -> LoRA fine-tuning pipeline with experiment tracking
  -> Dedicated eval infrastructure (golden datasets, LLM-as-judge)
  -> Cost allocation per team/model/endpoint

>$50,000/mo:
  -> Multi-model fleet: small for classification, large for reasoning
  -> Triton + vLLM hybrid with custom model parallelism
  -> Custom quantization (FP8, INT4) and kernel fusion
  -> Dedicated MLOps/platform engineering team
  -> Multi-region HA with active-active traffic steering
  -> FinOps team with showback/chargeback to business units
```

### Compliance-Based Stack Selection

```
HIPAA:
  -> API: OpenAI HIPAA Tier, Anthropic HIPAA, or self-host exclusively
  -> Inference on private VPC with zero egress logging
  -> BAA executed with all providers
  -> Audit logging: every prompt, response, and model invocation
  -> Encryption at rest (AES-256) + in transit (TLS 1.3)
  -> Access logging with minimum 6yr retention

GDPR:
  -> Data residency: deploy in EU region only
  -> Self-host or use EU-region API endpoints
  -> Prompt retention: auto-delete after 30d unless required for audit
  -> Right to deletion API: purge user data from logs, caches, models
  -> DPA signed with all subprocessors

SOC 2:
  -> RBAC for prompt registry: editor/reviewer/deployer/admin roles
  -> Change management: every prompt change requires PR + approval
  -> CI/CD pipeline with immutable deployment artifacts
  -> All deployments logged with actor, timestamp, diff
  -> Quarterly access review for all LLM infrastructure

ITAR/EAR (Export Control):
  -> Self-host exclusively, no API calls to external providers
  -> Air-gapped or restricted VPC with no internet egress
  -> Open-source models only: Llama, Mistral, DeepSeek, Qwen
  -> Model weights scanned for export-controlled knowledge
  -> All data stays within controlled environment boundary
```

## Architectural Patterns

### Prompt Management Architecture
Centralized prompt registry with Git-based storage, PR-based review workflow, semantic versioning, and environment promotion (dev -> staging -> production). Prompts are YAML files containing template, parameters, model config, test references, and metadata.

```
+---------+   +----------+   +-----------+   +-----------+
| Author  |-> | Git Repo |   |  CI/CD    |   |  Registry |
| (YAML)  |   | (branch) |-> | (test+eval)-> | (serving) |
+---------+   +----------+   +-----------+   +-----------+
                                                   |
                                                   v
                                            +--------------+
                                            | Inference API |
                                            | (reads reg)  |
                                            +--------------+
```

Registry serves prompt by name+version at runtime. Inference service fetches prompt template on cold start, caches hot prompts in memory.

### Version Control Architecture
Prompts stored as versioned files in Git (one file per prompt). Semantic versioning: MAJOR (breaking template change), MINOR (new parameter or behavior change), PATCH (minor wording/tone). Each version records model_id, temperature, max_tokens, stop_sequences. Production deployments are Git tags. Rollback = checkout previous tag + deploy.

### Deployment Pipeline Architecture
```
CI:
  lint YAML schema -> validate required params -> test suite on golden dataset -> diff against production baseline -> generate eval report -> fail if regression >threshold
CD:
  deploy staging -> shadow traffic (mirror 1% real) -> eval quality -> human approval gate -> canary 5% x 15m -> ramp 25% x 1h -> ramp 100% -> archive previous version

Production Gate:
  faithfulness drop >3% -> block
  error rate >1% -> block
  cost per query >1.2x -> warn
  latency P99 >2x -> block
```

### Monitoring Architecture
Prometheus/Grafana for infrastructure metrics + evaluation-driven observability. Every model response scored for quality, safety, and relevance. Alerts on drift, cost anomaly, and SLO breach.

```
Metrics layers:
  L1 (Infra): GPU util, VRAM, TTFT, TPOT, queue depth, error rate
  L2 (Cost): tokens per request, cost per query, daily spend by model/user
  L3 (Quality): faithfulness, hallucination rate, refusal rate, user satisfaction
  L4 (Drift): input distribution, output length shift, topic distribution change
```

## LLM Deployment Patterns

### Serverless
Providers: AWS Bedrock, GCP Vertex AI, Azure OpenAI, together.ai, Fireworks.
Tradeoffs: zero infra management, pay per token, ~1-3s cold start for custom models, concurrency limits (soft 100-1000 RPM), best for variable/unpredictable traffic, no GPU ops overhead.

### Dedicated GPU
Frameworks: vLLM, TGI, Triton, TensorRT-LLM.
Infra: EC2 (p4d/p5), GKE/AKS with GPU node pools, bare-metal (Lambda Labs, CoreWeave).
Tradeoffs: full control over batching and scheduling, predictable cost at scale, GPU management overhead, 4-8hr provisioning for new nodes, best >10M tokens/day.

### Edge
Frameworks: Ollama, llama.cpp, MLC-LLM, ExecuTorch.
Hardware: Apple M-series, RTX 4090, Jetson Orin, mobile NPU.
Tradeoffs: zero latency (local inference), offline capable, limited to quantized 7B-13B models, no data leaves device, update distribution overhead.

### Hybrid
Edge handles classification/routing + simple generation; cloud handles complex reasoning, long context, specialized models. Cache cloud responses at edge.

```
Client -> Edge (3B class.) -> "simple" -> Edge (7B gen)
                            -> "complex" -> Cloud (70B gen)
                            -> "unknown" -> Cloud with fallback
```

## A/B Testing for LLM Prompts and Models

### Statistical Framework
Frequentist: z-test for proportions (accuracy, safety rate), t-test for continuous metrics (latency, cost, length). Minimum sample size: n = (Z^2 x p(1-p)) / E^2 where Z=1.96 (95% CI), p=baseline metric, E=margin of error. For accuracy p=0.90, E=0.01 -> n=3457 per arm.

Bayesian: Beta-Bernoulli model for binary metrics, Normal-Normal for continuous. Log-normal for latency/cost. Thompson sampling for multi-armed bandit.

### Prompt A/B Testing
```
experiment:
  name: "tone-v2-production"
  variants:
    control: { prompt: "qa-v3.2.1", traffic: 50, model: "gpt-4o-mini" }
    treatment: { prompt: "qa-v3.3.0", traffic: 50, model: "gpt-4o-mini" }
  metrics: [faithfulness, hallucination_rate, user_satisfaction, cost_per_query]
  duration: "7d"
  min_samples: 10000
  significance_level: 0.05
  decision_rule: "treatment must win on >=3 of 4 metrics with p<0.05"
```

### Model A/B Testing
Test model swap, not just prompt. Control = current model+prompt. Treatment = new model + same prompt. Isolate model effect from prompt effect.

```
stages:
  offline: run eval suite on golden dataset, compare accuracy/cost
  shadow: mirror 5% traffic to new model, no user-facing output, compare quality scores
  canary: route 5% real traffic, monitor latency, cost, user feedback
  full: roll out to 100% if all gates pass
```

### Multi-Armed Bandit
Thompson sampling: for each request, sample from posterior distribution of each variant's reward. Select variant with highest sampled value. Automatically shifts traffic to better variant. ~50% faster convergence than equal-split A/B.

```
For each arm i (control, treatment):
  sample theta_i ~ Beta(alpha_i + wins_i, beta_i + losses_i)
  select argmax theta_i
Update: win = user_satisfied OR correct_answer; loss = otherwise
```

## CI/CD for Prompts

### Pipeline Architecture
```
1. Author edits prompt YAML in feature branch
2. PR created -> automated checks trigger:
   - YAML lint + schema validation (required params, no unused)
   - Test suite: run on golden dataset (500-5000 examples)
   - Diff report: faithfulness, safety, cost vs production prompt
   - Check: param schema backward-compatible
3. Human review: approve PR with eval report
4. Merge to main -> auto-deploy to staging
5. Staging accepts shadow traffic (10% mirrored) -> eval quality
6. Canary: 5% -> 25% -> 50% -> 100% with auto-rollback at each step
7. Archive previous version as v{N-1}
```

### Canary Configuration
```yaml
deployment:
  strategy: incremental
  stages:
    - traffic_percent: 5
      duration_minutes: 15
      auto_rollback:
        error_rate_increase: 1.5x
        faithfulness_drop: 0.03
        cost_per_query_increase: 1.2x
        latency_p95_increase: 1.5x
    - traffic_percent: 25
      duration_minutes: 60
    - traffic_percent: 50
      duration_minutes: 120
    - traffic_percent: 100
      duration_minutes: 0
```

### Rollback Strategies
```
Instant rollback (feature flag): toggle active prompt version -> <1s
Git revert: git revert HEAD -> deploy reverted version -> ~2min
Traffic rebalance: send 100% back to previous prompt -> immediate
Shadow rollback: send traffic to old version but continue monitoring new
Post-rollback: post-mortem why regression wasnt caught in CI
```

## Cost Governance

### Budget Model
```yaml
allocation:
  production_inference: 60%
  development_testing: 15%
  evaluation: 10%
  fine_tuning: 10%
  monitoring_tooling: 5%
```

### Controls
- Per-team/month budget with soft cap (warn) and hard cap (block)
- Cost allocation tags: model, endpoint, team, environment, user_segment
- Daily anomaly detection: cost for any model >2x trailing 7d average -> alert
- Monthly optimization review: identify top-5 cost drivers, plan reductions
- Model routing policy: simple queries to cheap model (GPT-4o-mini), complex queries only if classifier confidence > threshold
- Caching SLA: minimum 20% cache hit rate enforced via alert if below

### Self-Host vs API Break-Even
| Daily Tokens | API (GPT-4o) | API (GPT-4o-mini) | Self-Host (Llama-70B) | Self-Host (Llama-8B) |
|-------------|-------------|------------------|----------------------|---------------------|
| 1M          | $2,500      | $150             | $180 (1x A100)       | $45 (1x A10G) |
| 10M         | $25,000     | $1,500           | $600 (4x A100)       | $180 (2x A10G) |
| 100M        | $250,000    | $15,000          | $3,000 (cluster)     | $900 (cluster) |

Self-hosting breaks even at ~5-10M tokens/day for large models, ~1-2M for small models.

## Code Examples

### Prompt Registry Client
```python
class PromptRegistry:
    def __init__(self, repo_path: str):
        self.cache: dict[str, dict] = {}
        self.repo_path = repo_path

    def get(self, name: str, version: str | None = None) -> dict:
        cache_key = f"{name}:{version or 'latest'}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        if version is None:
            versions = sorted(
                Path(self.repo_path, name).glob("v*.yaml"),
                key=lambda p: parse_version(p.stem),
            )
            version = versions[-1].stem if versions else None
        prompt = yaml.safe_load(Path(self.repo_path, name, f"{version}.yaml").read_text())
        self.cache[cache_key] = prompt
        return prompt

    def render(self, name: str, params: dict, version: str | None = None) -> str:
        prompt = self.get(name, version)
        template = string.Template(prompt["template"])
        return template.safe_substitute(**params)
```

### Canary Deploy Controller
```python
class CanaryController:
    def __init__(self, registry_client, monitor_client):
        self.registry = registry_client
        self.monitor = monitor_client
        self.active_canaries: dict[str, dict] = {}

    def start_canary(self, prompt_name: str, candidate_version: str, stages: list[dict]):
        canary = {
            "prompt": prompt_name,
            "candidate": candidate_version,
            "control": self.registry.get_active(prompt_name),
            "stages": iter(stages),
            "current_stage": None,
            "traffic_split": 0,
            "started_at": time.time(),
        }
        self.active_canaries[prompt_name] = canary
        self._advance_stage(prompt_name)

    def _advance_stage(self, prompt_name: str):
        canary = self.active_canaries[prompt_name]
        try:
            stage = next(canary["stages"])
            canary["current_stage"] = stage
            canary["traffic_split"] = stage["traffic_percent"]
            self.registry.set_traffic_split(prompt_name, canary["candidate"], stage["traffic_percent"])
            threading.Timer(stage["duration_minutes"] * 60, self._evaluate_stage, args=[prompt_name]).start()
        except StopIteration:
            self._finalize(prompt_name)

    def _evaluate_stage(self, prompt_name: str):
        canary = self.active_canaries[prompt_name]
        stage = canary["current_stage"]
        rollback = stage.get("auto_rollback", {})
        metrics = self.monitor.get_canary_metrics(prompt_name, window="5m")
        for condition, threshold in rollback.items():
            if metrics.get(condition, 0) > threshold:
                self._rollback(prompt_name, f"{condition} breached: {metrics[condition]} > {threshold}")
                return
        self._advance_stage(prompt_name)

    def _rollback(self, prompt_name: str, reason: str):
        canary = self.active_canaries[prompt_name]
        self.registry.set_traffic_split(prompt_name, canary["control"], 100)
        del self.active_canaries[prompt_name]

    def _finalize(self, prompt_name: str):
        canary = self.active_canaries[prompt_name]
        self.registry.set_active(prompt_name, canary["candidate"])
        del self.active_canaries[prompt_name]
```

### A/B Test Analyzer
```python
import numpy as np
from scipy import stats

class ABTestAnalyzer:
    def analyze_binary_metric(self, control: list[bool], treatment: list[bool]) -> dict:
        c_successes = sum(control)
        t_successes = sum(treatment)
        c_total = len(control)
        t_total = len(treatment)
        c_rate = c_successes / c_total
        t_rate = t_successes / t_total
        z_score, p_value = stats.proportions_ztest(
            [t_successes, c_successes],
            [t_total, c_total],
        )
        return {
            "control_rate": c_rate,
            "treatment_rate": t_rate,
            "lift": (t_rate - c_rate) / c_rate,
            "z_score": z_score,
            "p_value": p_value,
            "significant": p_value < 0.05,
            "required_sample_size": self._min_sample(c_rate, 0.02),
        }

    def analyze_continuous_metric(self, control: list[float], treatment: list[float]) -> dict:
        t_stat, p_value = stats.ttest_ind(treatment, control)
        return {
            "control_mean": np.mean(control),
            "treatment_mean": np.mean(treatment),
            "lift": (np.mean(treatment) - np.mean(control)) / max(np.mean(control), 0.01),
            "t_stat": t_stat,
            "p_value": p_value,
            "significant": p_value < 0.05,
        }

    def _min_sample(self, baseline_rate: float, min_effect: float, alpha: float = 0.05, power: float = 0.8) -> int:
        z_alpha = stats.norm.ppf(1 - alpha / 2)
        z_beta = stats.norm.ppf(power)
        return int((z_alpha * np.sqrt(2 * baseline_rate * (1 - baseline_rate)) + z_beta * np.sqrt(baseline_rate * (1 - baseline_rate) + (baseline_rate * (1 + min_effect)) * (1 - baseline_rate * (1 + min_effect))))**2 / (baseline_rate * min_effect)**2)
```

## Anti-Patterns

1. **Manual prompt changes in production** -- engineer edits prompt directly in production DB/code. No audit trail, no rollback path, no diff available. Fix: all prompts in Git, promotion through CI/CD only.

2. **No prompt versioning** -- "Which prompt is deployed for endpoint X?" requires reading code. No history of changes. Fix: semantic versioned registry queried at runtime.

3. **Ignoring drift** -- input distribution shifts silently degrade output quality. Token length creeps up, refusal rate increases, topic distribution changes. Fix: daily embedding distance check + weekly eval on golden set.

4. **One model for everything** -- GPT-4o for all queries regardless of complexity. 10x cost over necessary. Fix: model router with classifier, cheap model for simple queries.

5. **No cost monitoring** -- first sign of cost problem is end-of-month bill shock. Fix: real-time per-query cost tracking, daily budget alerts, per-model cost breakdowns.

6. **Deploy prompts without eval** -- "Looks good to me" then quality regression in production. Fix: automated test suite on golden dataset required in CI, quality gate blocks deployment.

7. **No rollback plan** -- deployment breaks, response is "fix forward" while users suffer. Fix: each deploy has an instant rollback path, tested in staging.

8. **Vanity metrics** -- tracking latency and uptime but not quality. Hallucination rate could triple without detection. Fix: quality metrics (faithfulness, safety, relevance) as first-class SLOs.

9. **Full-blast canary** -- deploy new prompt to 100% traffic without gradual ramp. Fix: staged canary (5% -> 25% -> 50% -> 100%) with monitoring at each step.

10. **Hardcoded model configs** -- model name, temperature, max_tokens embedded in application code. Changing any parameter requires full deploy. Fix: externalize model config to registry/env, deploy config changes independently.

## Agent Protocol

### Trigger
User request includes any: LLMOps, model serving, fine-tuning, model deployment, token cost, model monitoring, prompt versioning, A/B test, vLLM, TGI, Ollama, Triton, LoRA, QLoRA, model routing, canary deployment, cost governance, LLM incident, prompt CI/CD, model drift.

### Protocol
1. Clarify model size, traffic pattern, latency SLA, budget constraints, and compliance requirements.
2. Apply decision tree for stack selection based on scale, budget, and compliance.
3. Design serving infrastructure: framework, hardware, scaling, caching.
4. Specify fine-tuning approach: method (LoRA/QLoRA/Full), rank, target modules, training hyperparameters.
5. Build cost model: compute, API, storage, monitoring. Include break-even analysis for self-host vs API.
6. Design monitoring dashboard: L1 infra, L2 cost, L3 quality, L4 drift.
7. Configure prompt versioning: registry, CI/CD pipeline, canary stages, rollback triggers.
8. Define A/B testing plan if applicable: metrics, sample size, duration, decision rule.
9. Establish cost governance: budget allocation, anomaly detection, optimization cadence.

## Output
LLM deployment plan with quantified tradeoffs across serving, cost, monitoring, quality, and governance.

### Response Format
```
## LLM Deployment Plan
### Stack Selection
Scale: {X req/day} | Budget: ${Y}/mo | Compliance: {Z}
Recommendation: {serverless/dedicated/hybrid} with {framework}

### Serving Configuration
Framework: {vLLM/TGI/Ollama/Triton}
Model: {name} | Quantization: {none/FP16/INT8/AWQ/GPTQ/FP8}
Hardware: {GPU type x count} | TP: {degree}
Scaling: {min/max replicas, trigger metric, cooldown}
Throughput: {tokens/s} | Latency P50/P95/P99: {ms}
Caching: {type, expected hit rate, TTL}

### Fine-Tuning (if applicable)
Method: {LoRA/QLoRA/Full}
Rank: {r} | Alpha: {value} | Target Modules: {modules}
Dataset: {size, source} | Epochs: {N} | Learning Rate: {value}
Training Cost: ${N} | Est. Quality Gain: {metric}

### Cost Model
Compute: ${N}/mo | API: ${N}/mo | Storage: ${N}/mo
Total: ${N}/mo | Per-Token Cost: ${value}
Break-Even: {tokens/month} vs API
Budget Allocation: prod {N}% | dev {N}% | eval {N}% | training {N}% | tooling {N}%

### Monitoring
Infra: {TTFT, TPOT, latency, GPU util, queue depth, error rate}
Cost: {cost per query, daily spend, anomaly threshold}
Quality: {faithfulness, hallucination rate, refusal rate, user satisfaction}
Drift: {embedding distance, output length, topic shift}
Alert on: {conditions and thresholds}
Dashboard: {tool and link}

### Prompt Versioning
Registry: {prompt storage location}
CI/CD: {pipeline tool, stages}
Canary: {5%->25%->50%->100%, duration per stage}
Rollback: {strategy, expected time to rollback}

### A/B Test (if applicable)
Variants: {control vs treatment}
Metrics: {primary, secondary}
Sample Size: {per arm} | Duration: {days}
Decision Rule: {criteria for promotion}
```

### Completion Criteria
- [ ] Stack selection justified by scale, budget, and compliance requirements
- [ ] Serving framework selected and configured for model size and traffic pattern
- [ ] Hardware spec justified against throughput and latency targets with quantization strategy
- [ ] Caching strategy defined with expected hit rate per query type
- [ ] Cost model itemizes compute, API, storage with per-token breakdown and break-even analysis
- [ ] Monitoring covers L1 infra, L2 cost, L3 quality, and L4 drift layers
- [ ] Prompt versioning strategy with CI/CD pipeline, canary stages, and rollback triggers
- [ ] A/B testing plan with statistical framework, sample size, duration, and decision rule
- [ ] Cost governance with budget allocation, anomaly detection, and optimization cadence
- [ ] Anti-patterns explicitly avoided or mitigated

## Workflow

### Step 1: Requirements Gathering
Determine: model size (parameters), context length, expected requests/minute (baseline + peak), latency P50/P95/P99 target, available GPU budget, compliance requirements (HIPAA/GDPR/SOC2/ITAR), team size and MLOps maturity, existing infrastructure.

### Step 2: Serving Framework Selection
- vLLM: best throughput for open-source LLMs. PagedAttention, continuous batching, tensor parallelism, prefix caching, multi-LoRA. Default choice for most production deployments.
- TGI: Hugging Face ecosystem, good for smaller models, seamless HF integration. Choose when HF tools are already in stack.
- Ollama: local dev and small-scale deployment, simplest setup, limited scaling. Choose for prototyping and edge deployment.
- Triton Inference Server: multi-model serving, model ensembles, GPU optimization. Choose for complex pipelines (embedding -> reranker -> LLM).

Framework Decision: vLLM for LLM serving, Triton for multi-model ensembles, Ollama for dev/edge. TGI as secondary if HF ecosystem dependency.

### Step 3: Fine-Tuning Configuration
- LoRA: r=8-64, alpha=16-128, target q_proj/k_proj/v_proj/o_proj (code models: add gate/up/down). Requires full precision base in memory. Best for domain adaptation.
- QLoRA: 4-bit NF4 quantization + LoRA. Train on single GPU. Slightly lower quality (~1%) than LoRA. Best for single GPU training of models up to 70B.
- Full fine-tune: highest quality, highest cost. Requires multi-GPU with FSDP/DeepSpeed ZeRO-3. Best for pre-training continuation or when LoRA capacity is insufficient.

Rank selection: r=8 for style adaptation, r=16 for task-specific, r=32 for domain adaptation, r=64 for complex task learning. Higher rank = more capacity + more overfitting risk.

### Step 4: Cost Modeling
- Compute: GPU hours x instance cost. Spot: 60-70% discount. Reserved: 30-40% discount.
- API: input tokens x price + output tokens x price. Use model routing to reduce average cost.
- Storage: model weights + LoRA adapters + cached embeddings + eval datasets.
- Break-even: compare monthly API cost vs self-hosted TCO. Self-host wins at ~5-10M tokens/day for 70B, ~1-2M for 7B.
- Monitoring/tooling: LangSmith, W&B, Datadog, Grafana Cloud. Budget 5% of total LLM spend.

### Step 5: Monitoring Setup
- L1 Infrastructure: TTFT, TPOT, request latency, throughput, GPU utilization, VRAM, queue depth, batch size.
- L2 Cost: tokens per request (input + output), cost per user/endpoint, daily spend by model, cost/query trends.
- L3 Quality: response rejection rate, user feedback score, hallucination rate (LLM-as-judge), faithfulness score, safety score.
- L4 Drift: input embedding distance vs baseline distribution, output length distribution shift, topic/domain classification shift, refusal rate change.
- Alerts: P99 latency breach (>5s), error rate (>1%), cost spike (>2x daily average), faithfulness drop (>3%), hallucination rate increase (>2x baseline).

### Step 6: Prompt Versioning
- Store prompts as YAML in VCS with semantic versioning.
- CI/CD: lint -> validate -> eval -> diff -> gate -> deploy staging -> shadow -> canary -> full.
- A/B test prompt variants with traffic splitting (10% canary -> 25% -> 100%).
- Track prompt-to-model mapping per deployment environment.
- Rollback: revert to previous prompt version on metric regression. Target rollback <1 minute.

### Step 7: Incident Response Setup
- Classify incidents: availability (P0, 15min), quality (P1, 1hr), safety (P0, 5min), cost (P2, 4hr), latency (P2, 2hr), drift (P3, 1wk).
- Runbooks: model degradation -> fallback to backup model. Safety incident -> quarantine outputs -> block prompt -> implement hotfix.
- Post-mortem: every P0/P1 incident, track TTD/TTM/TTR, update playbooks.

### Step 8: Cost Governance
- Set per-team/month budgets with soft and hard caps.
- Tag all costs by model, endpoint, team, environment.
- Configure daily anomaly detection alerts.
- Monthly optimization review: top-5 cost drivers, plan reductions.
- Self-host vs API break-even analysis quarterly.

## Rules
- Never deploy unquantized FP32 models. Always FP16, INT8, AWQ, GPTQ, or FP8.
- LoRA adapters are additive: deploy multiple adapters on one base model.
- P50 latency matters for UX, P99 latency matters for SLOs.
- Self-hosting breaks even at ~5-10M tokens/day (70B) or ~1-2M tokens/day (7B) vs API.
- Always A/B test prompt changes with staged canary before full rollout.
- Prompt changes must go through CI/CD -- no direct production edits.
- Monitor for drift: input distribution, output length, refusal rate, topic shift.
- Cache aggressively: exact-match for deterministic, semantic for similar queries.
- Route simple queries to cheap models, complex to capable models.
- Set budgets with soft caps (warn) and hard caps (block) per team.
- Every metric needs an alert. Every alert needs a runbook.
- Track both token-level and dollar-level cost per query.
- Quality eval before deploy: golden dataset test must pass >=95%.
- Rollback capability must exist before every deployment.
- Incident classification determines response SLA -- classify correctly.

## References
- references/deployment-patterns.md -- LLM Deployment Strategies
- references/fine-tuning.md -- Fine-Tuning Methods
- references/llm-ops-advanced.md -- LLM Ops Advanced Topics
- references/llm-ops-cost-management.md -- Cost Management
- references/llm-ops-fundamentals.md -- LLM Ops Fundamentals
- references/llm-ops-incident-management.md -- Incident Management
- references/model-serving.md -- Model Serving Frameworks
- references/prompt-management.md -- Prompt Management
- references/prompt-cicd.md -- Prompt CI/CD Pipeline
- references/model-ab-testing.md -- A/B Testing for Models
- references/llm-ops-guardrails.md -- Production Guardrails

## Handoff
For serving infrastructure scaling (HPA, node pools, cluster management), hand off to `ai-vector-databases`. For evaluation pipelines and LLM-as-judge infrastructure, hand off to `ai-evals`. For data labeling and training dataset curation, hand off to `ai-data-engineering`.
