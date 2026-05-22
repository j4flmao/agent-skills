---
name: ai-evals
description: >
  Use this skill when evaluating LLM outputs: faithfulness, relevance, precision, recall, hallucination detection, RAGAS metrics, BLEU, ROUGE, human eval, automated eval with LLMs, regression testing.
  This skill enforces: metric selection justification, dataset creation protocol, pipeline configuration, CI integration specification.
  Do NOT use for: prompt engineering, model fine-tuning, serving infrastructure, data labeling at scale.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, evals, phase-10]
---

# AI Evaluation Agent

## Purpose
Designs evaluation frameworks for LLM systems with defined metrics, curated datasets, automated pipelines, and CI integration for regression detection.

## Agent Protocol

### Trigger
User request includes: AI evaluation, LLM eval, benchmark, hallucination check, RAGAS, BLEU, ROUGE, faithfulness, relevance, context precision, ground truth, eval dataset, regression test, LLM-as-judge.

### Protocol
1. Clarify what is being evaluated (generation, RAG, agent, classification) and which failure modes matter.
2. Select evaluation metrics matching task type and failure modes.
3. Design evaluation dataset with golden answers and edge cases.
4. Configure eval pipeline with LLM-as-judge or reference-based scoring.
5. Set up CI integration for regression testing on every change.
6. Define pass/fail thresholds and performance budgets.

## Output
Evaluation framework with metrics, dataset, pipeline configuration.

### Response Format
```
## Evaluation Framework
### Task Type
{generation / RAG / agent / classification / summarization}
Model: {name} | Version: {version}

### Metrics
Metric: {name} | Type: {reference-based / LLM-judge / hybrid}
Target: {> value} | Weight: {importance 1-5}
Metric: {name} | Type: {reference-based / LLM-judge / hybrid}
Target: {> value} | Weight: {importance 1-5}

### Dataset
Size: {N} | Split: {train:N / test:N / edge:N}
Sources: {golden / synthetic / user-sampled / adversarial}

### Pipeline
Tool: {RAGAS / LangFuse / Arize / custom}
LLM Judge: {model} | Judge Prompt: {reference}
Batch Size: {N} | Parallel: {true/false}

### CI Integration
Trigger: {on PR / daily / on release}
Blocking: {metrics below threshold}
Reporting: {PR comment / dashboard / Slack}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Task type identified and metrics selected for each failure mode.
- [ ] Evaluation dataset created with golden, edge, and adversarial samples.
- [ ] LLM-as-judge prompt designed and validated for consistency.
- [ ] Eval pipeline configured with proper batching and parallelism.
- [ ] CI integration specified with trigger, blocking metrics, and reporting.
- [ ] Pass/fail thresholds defined for all metrics.

## Workflow

### Step 1: Task Classification
Map task to eval categories: generation (quality, coherence), RAG (faithfulness, context relevance, answer relevance), agent (tool selection accuracy, task completion rate), classification (accuracy, F1), summarization (conciseness, coverage).

### Step 2: Metric Selection
- Faithfulness: does the output contradict the provided context? LLM-as-judge or NLI model.
- Answer Relevance: is the output relevant to the question? Embedding cosine similarity or LLM judge.
- Context Precision: what fraction of retrieved chunks are relevant? RAGAS metric.
- Context Recall: does the retrieval cover all needed information? RAGAS metric.
- BLEU/ROUGE: n-gram overlap with reference. Use for translation/summarization only.
- Tool Call Accuracy: did the agent select the correct tool with correct params?
- Hallucination Rate: % of claims not supported by context. LLM-as-judge per claim.

### Step 3: Dataset Creation
- Golden set: 50-200 hand-curated examples with expert-written answers. Highest quality, highest cost.
- Synthetic set: 200-1000 LLM-generated Q&A pairs. Medium quality, low cost. Validate manually.
- User-sampled: 100-500 real user queries sampled from production logs. Most representative.
- Adversarial: 20-50 edge cases designed to break the system. Missing context, ambiguous queries, out-of-scope.
- Maintain held-out test set that never influences prompt or model changes.

### Step 4: LLM-as-Judge Configuration
- Use a stronger model to evaluate a weaker one (e.g., GPT-4 evaluates Llama-3).
- Write judge prompt with: role (evaluator), task (score this output), rubric (explicit scoring criteria), examples (scored examples).
- Extract structured scores: 1-5 Likert or binary pass/fail per criterion.
- Validate judge consistency: run 10 samples twice, expect >80% agreement.
- Mitigate position bias: randomize response order in pairwise comparisons.

### Step 5: Pipeline Setup
- Run eval as batch job, not inline. Separate eval compute from serving compute.
- Use eval frameworks: RAGAS for RAG, LangFuse for production traces, Arize for observability.
- Cache LLM judge responses to avoid re-evaluating unchanged outputs.
- Track eval results over time with versioned datasets.

### Step 6: CI Integration
- Run fast evals (<5 min) on every PR: reduced dataset, subset of metrics.
- Run full eval suite nightly or on release candidate.
- Block PR if any critical metric drops below threshold.
- Report results as PR comment with before/after comparison.
- Track metric trends over time for regression detection.

## Rules
- Faithfulness is the single most important metric for RAG systems.
- BLEU/ROUGE alone are insufficient for evaluating LLMs — they miss semantic quality.
- LLM-as-judge must be validated against human annotations (target >80% agreement).
- Eval dataset must include edge cases, not just happy path.
- Never use the same model as both the generator and the judge.
- Metrics without thresholds are opinions, not evaluations.
- Automate eval runs but require human review for regression in critical metrics.

## References
- `references/eval-metrics.md` — Faithfulness, relevance, answer relevance, context precision, RAGAS, custom metrics
- `references/eval-pipeline.md` — Dataset creation, automated eval, regression, CI integration

## Handoff
For prompt optimization to improve eval scores, hand off to `ai-prompt-engineering`. For RAG pipeline changes evaluated by this skill, hand off to `ai-rag-patterns`.
