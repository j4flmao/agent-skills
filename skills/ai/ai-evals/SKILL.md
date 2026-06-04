---
name: ai-evals
description: >
  Use this skill when evaluating LLM outputs: faithfulness, relevance, precision, recall, hallucination detection, RAGAS metrics, BLEU, ROUGE, human eval, automated eval with LLMs, regression testing.
  This skill enforces: metric selection justification, dataset creation protocol, pipeline configuration, CI integration specification.
  Do NOT use for: prompt engineering, model fine-tuning, serving infrastructure, data labeling at scale.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, evals, phase-10]
---

# AI Evaluation Agent

## Purpose
Designs evaluation frameworks for LLM systems with defined metrics, curated datasets, automated pipelines, and CI integration for regression detection. Covers the full eval lifecycle: strategy selection → metric design → dataset curation → pipeline architecture → CI/CD integration → production monitoring → continuous improvement.

## Agent Protocol

### Trigger
User request includes: AI evaluation, LLM eval, benchmark, hallucination check, RAGAS, BLEU, ROUGE, faithfulness, relevance, context precision, ground truth, eval dataset, regression test, LLM-as-judge, human eval, eval pipeline, evaluation framework.

### Protocol
1. Classify the task type and failure modes.
2. Select eval strategy via decision tree (task type → eval approach).
3. Define metrics with scoring rubrics and thresholds.
4. Design evaluation dataset with golden, synthetic, production-sampled, and adversarial splits.
5. Configure eval pipeline with LLM-as-judge, reference-based scoring, or human review.
6. Set up CI integration for regression detection on every change.
7. Define pass/fail thresholds, performance budgets, and alerting.
8. Plan for production monitoring and continuous eval improvement.

## Output
Evaluation framework with metrics, dataset, pipeline configuration, CI integration, and monitoring plan.

### Response Format
```
## Evaluation Framework
### Task Type
{generation / RAG / agent / classification / summarization / safety / capability}
Model: {name} | Version: {version}

### Eval Strategy
{LLM-as-Judge / benchmark / human / synthetic / hybrid}
Rationale: {why this strategy fits}

### Metrics
Metric: {name} | Type: {reference-based / LLM-judge / hybrid / lexical}
Target: {> value} | Weight: {importance 1-5} | Category: {p0/p1/p2}

### Dataset
Size: {N} | Split: {train:N / test:N / edge:N}
Sources: {golden / synthetic / user-sampled / adversarial}
Version: {x.y.z}

### Pipeline
Tool: {RAGAS / DeepEval / LangFuse / Arize / custom}
LLM Judge: {model} | Judge Prompt: {reference}
Batch Size: {N} | Parallel: {true/false} | Cache: {true/false}

### CI Integration
Trigger: {on PR / daily / on release}
Stage: {pr / staging / production}
Blocking: {metrics below threshold}
Reporting: {PR comment / dashboard / Slack}

### Monitoring
Dashboard: {url}
Alerting: {Slack / PagerDuty / email}
Cost Tracking: {budget per run}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Task type identified and eval strategy selected via decision tree.
- [ ] Metrics selected for each identified failure mode with explicit thresholds.
- [ ] Evaluation dataset created with golden, edge, and adversarial samples (versioned).
- [ ] LLM-as-judge prompt designed, validated against human annotations (>80% agreement).
- [ ] Position bias mitigation configured for pairwise comparisons.
- [ ] Eval pipeline configured with proper batching, caching, and parallelism.
- [ ] CI integration specified with trigger, blocking metrics, and reporting.
- [ ] Pass/fail thresholds defined with p0/p1/p2 priority levels.
- [ ] Production monitoring plan established with dashboards and alerting.
- [ ] Cost budget defined per eval run.

## Architecture Decision Framework

### Eval Strategy Decision Tree

```
Task Type
├── RAG / Question-Answering
│   ├── Faithfulness critical? → LLM-as-Judge + NLI hybrid
│   ├── Retrieval quality focus → RAGAS (context precision + recall)
│   └── Production monitoring → LangFuse / Arize traces
│
├── Text Generation / Summarization
│   ├── Has reference answer? → Reference-based (ROUGE/BLEU) + LLM judge
│   ├── No reference? → LLM-as-Judge with rubric
│   └── Creative output? → Human eval (preference ranking)
│
├── Classification / Extraction
│   ├── Labeled data available? → Accuracy / F1 / Exact Match
│   ├── No labeled data? → LLM-as-Judge with ground truth extraction
│   └── Multi-label? → Precision@k, Recall@k, mAP
│
├── Agent / Tool-Calling
│   ├── Tool selection accuracy → Ground truth comparison
│   ├── Task completion rate → LLM judge or human review
│   └── Multi-step reasoning → Trajectory-level scoring
│
├── Safety / Harmlessness
│   ├── Known attack vectors → Adversarial benchmark suite
│   ├── Open-ended safety → LLM judge + human review
│   └── Regulatory compliance → Structured audit checklist
│
├── Capability Benchmarking
│   ├── Standard benchmark → MMLU, HumanEval, GSM8K, etc.
│   ├── Custom capability → Synthetic data + LLM judge
│   └── Cross-model comparison → Identical dataset + metrics
│
└── Chat / Conversational
    ├── Single turn → Metric per response
    ├── Multi-turn → Conversation-level coherence + task completion
    └── Preference → Elo rating from pairwise comparisons
```

### Metric Selection Decision Tree

```
Failure Mode
├── Hallucination (claims not in context)
│   → Faithfulness metric (LLM judge per claim or NLI)
│   → Threshold: >0.90, Alert: <0.85
│
├── Irrelevant output (doesn't answer question)
│   → Answer Relevance (embedding cosine sim or LLM judge)
│   → Threshold: >0.80, Alert: <0.70
│
├── Missing information (incomplete answer)
│   → Completeness rubric (LLM judge)
│   → Context Recall (RAGAS)
│   → Threshold: >0.80
│
├── Wrong retrieval (irrelevant chunks)
│   → Context Precision (RAGAS)
│   → Threshold: >0.70
│
├── Verbose / rambling
│   → Conciseness metric (word count ratio or LLM judge)
│   → Threshold: <expected_length * 1.5
│
├── Unsafe / toxic output
│   → Toxicity classifier + LLM safety judge
│   → Threshold: toxicity < 0.01
│
├── Incorrect tool usage
│   → Tool selection accuracy + parameter correctness
│   → Threshold: >0.90
│
└── Slow response
    → Latency P50 / P95 measurement
    → Threshold: P95 < 2s, Alert: P95 > 5s
```

### Evaluation Stage Decision Tree

```
Change Type
├── Prompt change
│   → PR stage: fast (50 samples, faithfulness + format)
│   → Full stage: full dataset, all metrics
│
├── Model swap (e.g., Llama-3-8B → Llama-3-70B)
│   → PR stage: medium (200 samples, all metrics)
│   → Full stage: full dataset + cross-model comparison
│   → Cost analysis stage
│
├── Retrieval / chunking change
│   → PR stage: context precision + recall (100 samples)
│   → Full stage: full RAGAS suite
│
├── System architecture change
│   → PR stage: smoke tests + safety checks
│   → Full stage: full suite + load testing
│
└── New capability / feature
    → PR stage: golden + adversarial
    → Full stage: all datasets + human review of 20 samples
```

## Architectural Patterns

### Pattern 1: LLM-as-Judge Evaluation

#### Context
Need to evaluate LLM outputs at scale where reference answers are unavailable or where semantic quality matters beyond surface-level matching.

#### Solution
Use a stronger LLM (the judge) to evaluate a weaker LLM (the generator) using structured rubrics.

```python
class LLMJudgeEvaluator:
    def __init__(self, judge_model: str, rubric: dict):
        self.judge = judge_model
        self.rubric = rubric

    async def evaluate(self, query: str, response: str, context: str = "") -> dict:
        prompt = self._build_prompt(query, response, context)
        result = await self.judge.generate(prompt, temperature=0.0)
        return self._parse_scores(result)

    def _build_prompt(self, query: str, response: str, context: str) -> str:
        criteria_lines = []
        for name, desc in self.rubric.items():
            criteria_lines.append(f"- {name}: {desc}")
        return f"""
You are an expert evaluator. Score the following response.

Query: {query}
Response: {response}
Context: {context}

Criteria:
{chr(10).join(criteria_lines)}

Return JSON with scores 1-5 per criterion and an overall_score.
"""
```

#### Key Decisions
- **Judge model**: Always use a stronger model (e.g., GPT-4o evaluates Llama-3). Never same model.
- **Temperature**: Always 0.0 for deterministic scoring.
- **Rubric design**: Explicit scoring criteria with behavioral anchors (1-5).
- **Output format**: Structured JSON for automated parsing.
- **Validation**: Validate judge against human annotations before production use.

#### Consequences
- + Scalable, low-cost per evaluation
- + Measures semantic quality, not just surface overlap
- - Judge model cost can be significant at scale
- - Judge bias (position, length, verbosity)
- - Requires ongoing calibration against human judgments

### Pattern 2: Benchmark Evaluation

#### Context
Need to measure model capability against standardized tasks for model selection, regression testing, or public benchmarking.

#### Solution
Run the model against well-known benchmarks with standardized scoring.

```python
class BenchmarkEvaluator:
    benchmarks = {
        "mmlu": {"type": "multiple_choice", "metrics": ["accuracy"], "subjects": 57},
        "human_eval": {"type": "code_generation", "metrics": ["pass@k"], "tasks": 164},
        "gsm8k": {"type": "math_word_problems", "metrics": ["accuracy"], "problems": 8500},
        "truthful_qa": {"type": "qa", "metrics": ["truthfulness", "info"], "questions": 817},
    }

    async def run_benchmark(self, model, benchmark: str, few_shot: int = 5) -> dict:
        config = self.benchmarks[benchmark]
        results = {"benchmark": benchmark, "model": model, "metrics": {}}
        for metric in config["metrics"]:
            score = await self._compute_metric(model, benchmark, metric, few_shot)
            results["metrics"][metric] = score
        return results
```

#### Key Decisions
- **Benchmark selection**: Match benchmarks to task domain. Don't use MMLU for a chatbot.
- **Few-shot configuration**: Use standard shot counts (5-shot for MMLU, 0-shot for GSM8K).
- **Contamination checking**: Verify benchmark data isn't in training set.
- **Statistical significance**: Report confidence intervals, not just point estimates.

#### Consequences
- + Standardized, reproducible, comparable across models
- + Community accepted results
- - Benchmarks can be contaminated (data leakage into training)
- - Benchmark performance ≠ real-world performance
- - Narrow benchmarks miss safety and alignment dimensions

### Pattern 3: Human Evaluation

#### Context
Need gold-standard quality assessment for subjective dimensions (helpfulness, creativity, tone) or when automated evals are unreliable.

#### Solution
Design structured human evaluation protocols with clear rubrics, inter-rater reliability targets, and statistical analysis.

```python
class HumanEvalProtocol:
    def __init__(self, rubric: dict, annotators: int = 3):
        self.rubric = rubric
        self.annotators = annotators

    def design_task(self, samples: list) -> list:
        tasks = []
        for sample in samples:
            tasks.append({
                "id": sample["id"],
                "query": sample["query"],
                "responses": sample["responses"],  # [A, B] for pairwise
                "task_type": "pairwise_preference" if len(sample["responses"]) > 1 else "likert_scoring",
                "criteria": list(self.rubric.keys()),
                "annotators_needed": self.annotators,
            })
        return tasks

    def compute_inter_rater_reliability(self, annotations: list) -> dict:
        from sklearn.metrics import cohen_kappa_score
        pairs = []
        for i in range(len(annotations)):
            for j in range(i + 1, len(annotations)):
                if annotations[i]["task_id"] == annotations[j]["task_id"]:
                    kappa = cohen_kappa_score(
                        annotations[i]["scores"],
                        annotations[j]["scores"]
                    )
                    pairs.append(kappa)
        mean_kappa = statistics.mean(pairs) if pairs else 0
        return {"mean_cohens_kappa": mean_kappa, "sufficient": mean_kappa >= 0.6}
```

#### Key Decisions
- **Annotator pool**: Domain experts for specialized tasks, crowd workers for general tasks.
- **Rubric design**: Clear, unambiguous criteria with example scores.
- **Inter-rater reliability**: Target Cohen's kappa > 0.6 (substantial agreement).
- **Sample size**: Minimum 100 samples per condition for statistical power.
- **Blinding**: Hide condition identity (model name, prompt version) to reduce bias.

#### Consequences
- + Highest quality assessment for subjective dimensions
- + Catches issues automated evals miss
- - Expensive ($1-10 per annotation)
- - Slow (hours to days for results)
- - Annotator fatigue and drift over time

### Pattern 4: Synthetic Evaluation

#### Context
Need large-scale evaluation datasets quickly, or need to evaluate against rare/hard-to-find scenarios.

#### Solution
Generate evaluation data programmatically using LLMs, with validation filters to ensure quality.

```python
class SyntheticDataGenerator:
    def __init__(self, generator_llm, validator_llm=None):
        self.generator = generator_llm
        self.validator = validator_llm or generator_llm

    async def generate_dataset(self, seed_examples: list, target: int, categories: list) -> list:
        dataset = []
        per_category = target // len(categories)
        for category in categories:
            examples = await self._generate_for_category(category, seed_examples, per_category)
            validated = await self._validate_batch(examples)
            dataset.extend(validated)
        return dataset

    async def _generate_for_category(self, category: str, seeds: list, count: int) -> list:
        prompt = f"""Generate {count} {category} QA pairs. Each must be realistic and answerable.
Style guide: {seeds[0] if seeds else 'conversational'}
Output as JSON array of {{"question", "answer", "context", "difficulty", "category": "{category}"}}"""
        result = await self.generator.generate(prompt, temperature=0.7)
        return json.loads(result)

    async def _validate_batch(self, examples: list) -> list:
        valid = []
        for ex in examples:
            score = await self._rate_quality(ex)
            if score >= 0.7:
                valid.append(ex)
        return valid
```

#### Key Decisions
- **Generator model**: Use a capable model (GPT-4o, Claude) with temperature 0.7 for diversity.
- **Validation rate**: Review 10-20% manually to calibrate quality filters.
- **Diversity control**: Vary personas, difficulty levels, and query styles.
- **Contamination check**: Verify generated data doesn't leak into test sets.

#### Consequences
- + Fast and cheap to generate large datasets
- + Can target specific edge cases at scale
- - Quality varies; requires validation layer
- - Generator model biases may propagate
- - Synthetic data may not reflect real user behavior

### Pattern 5: Eval Pipeline Architecture

#### Context
Need to run evaluations reliably, reproducibly, and at scale as part of development workflow.

#### Solution
Multi-stage pipeline with caching, batching, parallel execution, and regression detection.

```python
class EvalPipelineConfig:
    def __init__(self, stages: list):
        self.stages = stages

    def get_stage(self, name: str):
        return next(s for s in self.stages if s["name"] == name)

class EvalRunner:
    def __init__(self, config: EvalPipelineConfig):
        self.config = config

    async def run(self, stage: str, model: str, dataset: list) -> dict:
        stage_config = self.config.get_stage(stage)
        results = []
        for batch in self._batches(dataset, stage_config["batch_size"]):
            batch_results = await self._execute_batch(model, batch, stage_config["metrics"])
            results.extend(batch_results)
        return self._aggregate(results, stage_config)

    def _batches(self, items: list, size: int):
        for i in range(0, len(items), size):
            yield items[i:i + size]

    async def _execute_batch(self, model: str, batch: list, metrics: list) -> list:
        tasks = []
        for item in batch:
            response = await self._call_model(model, item["query"])
            scores = {}
            for metric in metrics:
                scores[metric.name] = await metric.evaluate(item["query"], response, item.get("context"))
            tasks.append({"input": item, "response": response, "scores": scores})
        return tasks

    def _aggregate(self, results: list, stage_config: dict) -> dict:
        aggregated = {"pipeline": stage_config["name"], "results": results}
        metric_scores = {}
        for r in results:
            for name, score in r["scores"].items():
                metric_scores.setdefault(name, []).append(score)
        aggregated["summary"] = {
            name: {
                "mean": statistics.mean(scores),
                "min": min(scores),
                "max": max(scores),
                "std": statistics.stdev(scores) if len(scores) > 1 else 0,
            }
            for name, scores in metric_scores.items()
        }
        aggregated["pass_rate"] = self._compute_pass_rate(results, stage_config["thresholds"])
        return aggregated

    def _compute_pass_rate(self, results: list, thresholds: dict) -> dict:
        passed = {name: 0 for name in thresholds}
        total = len(results)
        for r in results:
            for name, threshold in thresholds.items():
                if r["scores"].get(name, 0) >= threshold:
                    passed[name] += 1
        return {name: count / total for name, count in passed.items()}
```

#### CI Integration Patterns

```python
class CIEvalIntegration:
    def __init__(self, runner: EvalRunner, baseline_store):
        self.runner = runner
        self.baseline = baseline_store

    async def run_pr_check(self, model: str, changed_files: list) -> dict:
        dataset = self._select_dataset_for_change(changed_files)
        results = await self.runner.run("pr", model, dataset)
        regression = await self._check_regression(results, model)
        return {"results": results, "regression": regression}

    async def _check_regression(self, results: dict, model: str) -> dict:
        baseline = await self.baseline.get_latest(model)
        if not baseline:
            return {"regression_detected": False, "message": "No baseline"}
        regressions = {}
        for metric, current in results["summary"].items():
            bl = baseline["summary"].get(metric, {})
            if bl and current["mean"] < bl["mean"] - bl.get("std", 0) * 2:
                regressions[metric] = {
                    "before": bl["mean"],
                    "after": current["mean"],
                    "delta": current["mean"] - bl["mean"],
                }
        return {"regression_detected": len(regressions) > 0, "regressions": regressions}
```

## Code Examples

### Metrics Computation

```python
import statistics
from typing import List, Dict, Callable
from dataclasses import dataclass

@dataclass
class EvalSample:
    query: str
    response: str
    context: str = ""
    ground_truth: str = ""
    metadata: dict = None

class MetricCompositor:
    def __init__(self):
        self.metrics: Dict[str, Callable] = {}

    def register(self, name: str, fn: Callable):
        self.metrics[name] = fn

    def compute_all(self, sample: EvalSample) -> Dict[str, float]:
        return {name: fn(sample) for name, fn in self.metrics.items()}

class FaithfulnessScorer:
    def __call__(self, sample: EvalSample) -> float:
        claims = self._extract_claims(sample.response)
        if not claims:
            return 1.0
        supported = self._check_support(claims, sample.context)
        return supported / len(claims)

    def _extract_claims(self, text: str) -> List[str]:
        return [s.strip() for s in text.split(".") if len(s.strip()) > 10]

    def _check_support(self, claims: List[str], context: str) -> int:
        supported = 0
        for claim in claims:
            if any(self._is_entailed(claim, ctx) for ctx in context.split(".")):
                supported += 1
        return supported

    def _is_entailed(self, claim: str, premise: str) -> bool:
        overlap = len(set(claim.lower().split()) & set(premise.lower().split()))
        return overlap / max(len(set(claim.lower().split())), 1) > 0.3

class BLEUScorer:
    def __call__(self, sample: EvalSample) -> float:
        from nltk.translate.bleu_score import sentence_bleu
        ref = sample.ground_truth.split()
        hyp = sample.response.split()
        return sentence_bleu([ref], hyp)

class ROUGEScorer:
    def __call__(self, sample: EvalSample) -> float:
        from rouge_score import rouge_scorer
        scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
        scores = scorer.score(sample.ground_truth, sample.response)
        return scores["rougeL"].fmeasure
```

### Aggregating Results Across Runs

```python
class EvalResultStore:
    def __init__(self, storage_backend):
        self.storage = storage_backend

    def save_run(self, run_id: str, results: dict):
        record = {
            "run_id": run_id,
            "timestamp": datetime.utcnow().isoformat(),
            "model": results.get("model"),
            "dataset_version": results.get("dataset_version"),
            "metrics": results["summary"],
            "pass_rate": results["pass_rate"],
        }
        self.storage.put(f"runs/{run_id}.json", json.dumps(record))

    def get_trend(self, metric: str, days: int = 30) -> List[Dict]:
        runs = self.storage.list("runs/", days)
        trend = []
        for run_id in sorted(runs):
            data = json.loads(self.storage.get(f"runs/{run_id}"))
            if metric in data["metrics"]:
                trend.append({
                    "date": data["timestamp"][:10],
                    "value": data["metrics"][metric]["mean"],
                    "run_id": run_id,
                })
        return trend

    def detect_regression(self, model: str, metric: str, window: int = 5) -> dict:
        trend = self.get_trend(metric, 30)
        if len(trend) < window:
            return {"regression": False, "message": "Insufficient data"}
        recent = [t["value"] for t in trend[-window:]]
        older = [t["value"] for t in trend[:len(trend) - window]]
        recent_avg = statistics.mean(recent)
        older_avg = statistics.mean(older)
        delta = recent_avg - older_avg
        return {
            "regression": delta < -0.05,
            "recent_avg": recent_avg,
            "older_avg": older_avg,
            "delta": delta,
            "significant": abs(delta) > 0.03,
        }
```

### Cost Tracking

```python
class EvalCostTracker:
    def __init__(self):
        self.costs = []

    def record_call(self, provider: str, model: str, input_tokens: int, output_tokens: int):
        rates = {
            "openai": {"gpt-4o": (0.01, 0.03), "gpt-4o-mini": (0.001, 0.002)},
            "anthropic": {"claude-sonnet": (0.003, 0.015)},
        }
        input_rate, output_rate = rates.get(provider, {}).get(model, (0, 0))
        cost = (input_tokens * input_rate / 1000) + (output_tokens * output_rate / 1000)
        self.costs.append({"cost": cost, "timestamp": datetime.utcnow().isoformat()})

    def total_cost(self) -> float:
        return sum(c["cost"] for c in self.costs)

    def budget_report(self, budget: float) -> dict:
        total = self.total_cost()
        return {
            "total": total,
            "budget": budget,
            "remaining": budget - total,
            "over_budget": total > budget,
        }
```

## Anti-Patterns

### Eval Contamination
Using test data that overlaps with training data, inflating performance metrics.
- **Symptom**: Suspiciously high scores on benchmarks, especially on first attempt.
- **Prevention**: Use benchmarks with known contamination checks. Hold out a truly unseen test set. Rotate eval questions regularly.
- **Detection**: Check n-gram overlap between training data and eval questions. Monitor for score plateaus that are too high.

### Overfitting to Benchmarks
Optimizing model or prompts specifically for benchmark performance rather than real-world quality.
- **Symptom**: High benchmark scores but poor user satisfaction.
- **Prevention**: Use diverse eval datasets including production-sampled queries. Add human eval as a counterbalance.
- **Detection**: Compare benchmark trends vs. user feedback trends. If they diverge, you're overfitting.

### Using Same Model as Judge and Generator
The model evaluates its own output, leading to inflated self-assessment scores.
- **Symptom**: Very high scores with low variance across diverse outputs.
- **Prevention**: Always use a different (stronger) model as judge. Never use the same model.
- **Detection**: Check if scores correlate with model identity, not output quality.

### Using Lexical Metrics Alone
BLEU/ROUGE as primary metrics for generative tasks. These miss semantic quality entirely.
- **Symptom**: Models optimized for n-gram overlap produce bland, repetitive outputs.
- **Prevention**: Use lexical metrics only for constrained tasks (translation, extraction). Combine with semantic metrics.
- **Detection**: Compare BLEU vs. human preference. Low correlation means lexical metrics are misleading.

### Threshold Blindness
Setting thresholds without statistical justification.
- **Symptom**: Frequent false alarms or missed regressions.
- **Prevention**: Derive thresholds from historical data (mean ± 2σ). Review quarterly.
- **Detection**: Monitor false positive/negative rates for eval gates.

### Static Dataset Syndrome
Never updating the eval dataset. The model learns to game the static examples.
- **Symptom**: Performance stays flat or improves on evals but degrades in production.
- **Prevention**: Rotate 20% of eval questions monthly. Maintain a dynamic production-sampled set.
- **Detection**: Track per-example scores. If most examples converge to 1.0, the dataset is stale.

### Ignoring Eval Cost
Running full LLM-as-Judge evaluations on every change without caching or tiered execution.
- **Symptom**: Eval costs grow linearly with team size and change frequency.
- **Prevention**: Cache identical evaluations. Use tiered pipeline (cheap PR checks, expensive full runs).
- **Detection**: Track eval cost per developer per week. Set budgets and alerts.

### Single-Metric Tunnel Vision
Optimizing one metric at the expense of others.
- **Symptom**: One metric improves while others (unmeasured) degrade.
- **Prevention**: Track a balanced scorecard of metrics. Require all p0 metrics to pass.
- **Detection**: Review all metrics together, not in isolation.

### Production Evals Without Drift Monitoring
Running evals only during development, never monitoring in production.
- **Symptom**: Model performs well in CI but degrades in production due to data drift.
- **Prevention**: Implement production eval monitoring with live traffic sampling.
- **Detection**: Compare CI eval scores vs. production shadow eval scores.

## Production Considerations

### Eval at Scale

| Scale | Examples/Day | Infrastructure | Cost/Day | Team Size |
|-------|-------------|----------------|----------|-----------|
| Small | <1,000 | Single machine + LLM API | $1-5 | 1-2 |
| Medium | 1K-10K | CI runners + Redis cache | $5-50 | 2-5 |
| Large | 10K-100K | Dedicated eval cluster + distributed runners | $50-500 | 5-10 |
| Enterprise | 100K+ | Multi-region, GPU cluster, dedicated DB | $500+ | 10+ |

### Cost Optimization Strategies

1. **Caching**: Cache LLM judge responses keyed by (query_hash, response_hash, rubric_hash). Hit rates of 30-60% in practice.
2. **Tiered execution**: Fast PR checks (50 samples, 1 metric) vs. full nightly (full dataset, all metrics).
3. **Judge model selection**: Use GPT-4o-mini for routine evals, GPT-4o for critical metrics only.
4. **Batch processing**: Batch judge calls with shared context to reduce input token costs.
5. **Adaptive sampling**: Run full eval only when relevant files change. Use change detection to select test subsets.
6. **Result reuse**: If nothing changed (same model, same prompt, same dataset), skip the eval run.

### Eval Data Management

1. **Versioning**: Dataset version = major.minor.patch. Pin in config for reproducibility.
2. **Storage**: Object storage (S3, GCS) with versioning enabled. JSONL format for streaming.
3. **Lineage**: Tag each dataset with git hash, model version, prompt version, and creation timestamp.
4. **Access control**: Separate read/write roles. Dataset modifications require review.
5. **Retention**: Keep all historical datasets for reproducibility. Archive after 1 year.
6. **Privacy**: Strip PII from production-sampled data. Review synthetic data for PII leakage.

### Monitoring and Alerting

```yaml
monitoring:
  dashboards:
    - name: "Eval Health"
      panels:
        - metric: pass_rate
          aggregation: 7d_rolling
          alert: < 0.80
        - metric: faithfulness
          aggregation: daily
          alert: < 0.85
        - metric: eval_cost
          aggregation: daily
          alert: > budget * 1.5
        - metric: regression_count
          aggregation: weekly
          alert: > 3

  alerts:
    critical:
      - faithfulness < 0.70 (page)
      - pass_rate drop > 10% in 24h (page)
      - eval pipeline failure (page)
    warning:
      - faithfulness < 0.85 (Slack)
      - cost > 2x daily budget (Slack)
      - dataset drift detected (Slack)
    info:
      - metric trending down 7 days (dashboard)
      - model version change detected (dashboard)
```

### Regression Detection

```python
class RegressionDetector:
    def __init__(self, baseline_period: int = 7):
        self.baseline_period = baseline_period

    def check(self, current: dict, history: list) -> dict:
        regressions = []
        for metric, value in current.items():
            baseline_values = [h[metric] for h in history[-self.baseline_period:]]
            if not baseline_values:
                continue
            baseline_mean = statistics.mean(baseline_values)
            baseline_std = statistics.stdev(baseline_values) if len(baseline_values) > 1 else 0
            z_score = (value - baseline_mean) / max(baseline_std, 0.001)
            if z_score < -2:  # 2 sigma below baseline
                regressions.append({
                    "metric": metric,
                    "current": value,
                    "baseline_mean": baseline_mean,
                    "baseline_std": baseline_std,
                    "z_score": z_score,
                    "severity": "critical" if z_score < -3 else "warning",
                })
        return {"regressions": regressions, "count": len(regressions)}
```

### Cross-Model Comparison

```python
class CrossModelComparator:
    def __init__(self, dataset: list, metrics: list):
        self.dataset = dataset
        self.metrics = metrics

    async def compare(self, models: dict) -> dict:
        results = {}
        for name, model_fn in models.items():
            results[name] = await self._evaluate_model(model_fn)

        comparison = {}
        for metric in self.metrics:
            scores = {name: r["metrics"][metric]["mean"] for name, r in results.items()}
            ranked = sorted(scores.items(), key=lambda x: -x[1])
            comparison[metric] = {
                "ranking": [{"model": name, "score": score} for name, score in ranked],
                "best": ranked[0][0],
                "spread": ranked[0][1] - ranked[-1][1],
            }
        return {"results": results, "comparison": comparison}

    async def _evaluate_model(self, model_fn) -> dict:
        results = []
        for item in self.dataset:
            response = await model_fn(item["query"])
            scores = {}
            for metric in self.metrics:
                scores[metric.name] = await metric.evaluate(
                    item["query"], response, item.get("context")
                )
            results.append(scores)
        aggregated = {}
        for metric in self.metrics:
            values = [r[metric.name] for r in results]
            aggregated[metric.name] = {
                "mean": statistics.mean(values),
                "std": statistics.stdev(values) if len(values) > 1 else 0,
            }
        return {"metrics": aggregated}
```

### Eval Pipeline CI/CD Integration

```yaml
# .github/workflows/eval-pipeline.yml
name: Eval Pipeline
on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'src/**'
      - 'evals/**'
      - 'config/**'
  schedule:
    - cron: '0 6 * * *'

jobs:
  pr-checks:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    outputs:
      pass: ${{ steps.gates.outputs.pass }}
    steps:
      - uses: actions/checkout@v4
      - name: Determine change scope
        id: scope
        run: |
          changed=$(git diff --name-only origin/main...HEAD)
          if echo "$changed" | grep -q "prompts/"; then echo "type=prompt" >> $GITHUB_OUTPUT; fi
          if echo "$changed" | grep -q "src/"; then echo "type=system" >> $GITHUB_OUTPUT; fi
      - name: Run PR eval suite
        run: |
          python run_evals.py \
            --stage pr \
            --model ${{ vars.DEFAULT_MODEL }} \
            --change-type ${{ steps.scope.outputs.type }}
      - name: Check quality gates
        id: gates
        run: python check_gates.py --results results.json
      - name: Post PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const report = require('./eval-report.json');
            const body = formatEvalReport(report);
            github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body
            });
      - name: Block on regression
        if: steps.gates.outputs.pass == 'false'
        run: exit 1

  nightly:
    if: github.event_name == 'schedule'
    runs-on: [self-hosted, eval]
    steps:
      - uses: actions/checkout@v4
      - name: Run full eval suite
        run: |
          python run_evals.py \
            --stage nightly \
            --model ${{ vars.DEFAULT_MODEL }} \
            --dataset full
      - name: Update baselines
        run: python update_baselines.py --results results.json
      - name: Check regression vs baseline
        run: python check_regression.py --baseline baseline.json --current results.json
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: nightly-eval
          path: results/
      - name: Alert on regression
        if: failure()
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            text: "Regression detected in nightly eval"
```

## Rules

1. **Faithfulness is the single most important metric for RAG systems** — without it, nothing else matters.
2. **Always use a stronger model as judge, never the same model** — self-evaluation inflates scores.
3. **Validate LLM judge against human annotations** — target >80% agreement before production use.
4. **Mitigate position bias** — randomize response order, run evaluations both ways.
5. **BLEU/ROUGE alone are insufficient for LLM evaluation** — they miss semantic quality entirely.
6. **Eval datasets must include edge cases and adversarial examples** — happy path only catches happy path bugs.
7. **Every bug fix becomes an eval test case** — regression prevention starts with the first fix.
8. **Metrics without thresholds are opinions, not evaluations** — always define pass/fail criteria.
9. **Pin dataset versions for reproducibility** — never run evals against a moving target.
10. **Separate eval compute from serving compute** — evals should never impact production performance.
11. **Run fast evals on every PR, full evals nightly or on release** — match eval depth to risk level.
12. **Track eval cost per run** — set budgets and alert when exceeded.
13. **Monitor metric trends, not just point-in-time scores** — regression is a trend before it's a failure.
14. **Rotate eval data to prevent overfitting** — static datasets become stale.
15. **Document eval strategy decisions** — why certain metrics were chosen, why thresholds were set.
16. **Never use production user data in evals without anonymization** — PII leakage is a liability.
17. **Test your eval before you trust your eval** — validate every new metric against known examples.
18. **Set alert levels: critical (page), warning (notify), info (dashboard)** — not everything is a fire.
19. **Compare models on identical datasets with identical metrics** — apples-to-apples or don't compare.
20. **Eval is not a one-time activity** — continuous evaluation catches regressions that batch evals miss.

## References
  - references/ai-evals-fundamentals.md — AI Evals Fundamentals
  - references/ai-evals-advanced.md — AI Evals Advanced Topics
  - references/eval-infrastructure.md — Eval Infrastructure & Deployment Patterns
  - references/eval-data-management.md — Eval Data Management Strategies
  - references/eval-datasets.md — Evaluation Datasets
  - references/eval-frameworks.md — Evaluation Frameworks
  - references/eval-metrics.md — Evaluation Metrics
  - references/eval-pipeline.md — Evaluation Pipeline
  - references/eval-quality-assurance.md — Evaluation Quality Assurance
  - references/eval-workflow-automation.md — Evaluation Workflow Automation
  - references/llm-judge-patterns.md — LLM-as-Judge Patterns
  - references/metrics-reference.md — Metrics Quick Reference

## Handoff
For prompt optimization to improve eval scores, hand off to `ai-prompt-engineering`. For RAG pipeline changes evaluated by this skill, hand off to `ai-rag-patterns`. For production deployment of eval infrastructure, hand off to `platform-engineering`. For human eval study design, hand off to `ux-research`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, evaluation pipelines, LLM-as-a-judge, and metrics.
-->
