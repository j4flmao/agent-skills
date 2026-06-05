---
name: evaluation-testing
description: >
  Use this skill to design and execute evaluation frameworks for LLM agents, implement trajectory testing, deploy LLM-as-judge patterns, build automated eval pipelines, and integrate agent testing into CI/CD workflows.
  This skill enforces: structured behavioral assertions, trajectory-vs-outcome evaluation matrices, verifier agent topologies, regression detection baselines, hallucination scoring engines, and benchmark dataset lifecycle management.
  Do NOT use for: unit testing traditional software, load/performance testing infrastructure, or model fine-tuning data preparation.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, evaluation-testing, agent-frameworks, llm-judge, ci-cd, benchmarks]
---

# Evaluation Testing Skill

## Purpose
Provides a production-grade evaluation and testing framework for LLM agent systems. Enables teams to measure agent correctness across behavioral dimensions, detect regressions in multi-step reasoning chains, score hallucination severity, and embed automated evaluation gates into deployment pipelines. This system handles the fundamental non-determinism of LLM outputs by combining trajectory-level analysis, outcome-level assertions, and LLM-as-judge consensus protocols into a unified testing harness.

---

## Core Principles
1. **Trajectory Over Outcome**: Evaluate the reasoning path, not just the final answer. An agent that reaches the correct output through flawed reasoning is a latent failure.
2. **Statistical Significance Over Single Runs**: Agent evaluations must use repeated sampling ($N \ge 5$) and report confidence intervals, never single-shot pass/fail assertions.
3. **Human-Aligned Judging**: LLM-as-judge evaluators must be calibrated against human preference baselines using Cohen's Kappa ($\kappa \ge 0.60$) before deployment.
4. **Regression Baselines Are Sacred**: Every eval suite must maintain versioned baseline snapshots. Regressions are detected against these baselines, not arbitrary thresholds.
5. **Eval Datasets Are Living Assets**: Test datasets must be versioned, deduplicated, stratified by difficulty, and refreshed on a scheduled cadence to prevent benchmark overfitting.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Agent output quality assessments requiring structured scoring rubrics.
- Multi-step trajectory evaluations for tool-calling or chain-of-thought agents.
- CI/CD pipeline gates that must block deployments on eval regressions.
- Hallucination detection across factual claims, code generation, or document summarization.
- Benchmark design for comparing agent architectures or prompt strategies.
- Dataset curation for evaluation test suites.

### Input Context Required
- **Agent Outputs**: Raw completions, tool call traces, or conversation transcripts to evaluate.
- **Evaluation Rubric**: A structured scoring guide defining dimensions (correctness, helpfulness, safety, coherence).
- **Baseline Metrics**: Historical eval scores from the previous accepted version.
- **Ground Truth Dataset**: Labeled examples with expected outputs or acceptable output ranges.
- **Target Confidence Level ($\alpha$)**: The statistical significance threshold (typically 0.05).

### Output Artifact
- **Evaluation Report**: JSON document containing per-dimension scores, aggregate metrics, and statistical tests.
- **Regression Verdict**: Binary pass/fail with confidence intervals and effect sizes.
- **Hallucination Audit Log**: Itemized list of factual claims with verification status and source attributions.

### Response Formats
For programmatic integration, evaluation results must be delivered in this format:

```json
{
  "eval_run_id": "eval-2026-06-04-001",
  "model_version": "agent-v2.3.1",
  "dimensions": {
    "correctness": { "mean": 0.87, "ci_lower": 0.82, "ci_upper": 0.92, "n": 200 },
    "helpfulness": { "mean": 0.91, "ci_lower": 0.87, "ci_upper": 0.95, "n": 200 },
    "safety": { "mean": 0.99, "ci_lower": 0.97, "ci_upper": 1.00, "n": 200 }
  },
  "regression_detected": false,
  "hallucination_rate": 0.034,
  "verdict": "PASS",
  "baseline_comparison": {
    "previous_version": "agent-v2.3.0",
    "delta_correctness": +0.02,
    "p_value": 0.12
  }
}
```

---

## Decision Matrix for Evaluation Strategy

```
What kind of agent output are you evaluating?
├── Single-Turn Q&A / Factual Responses
│   ├── Ground truth available?
│   │   ├── Yes → Exact Match / F1 / BLEU + Hallucination Scoring
│   │   └── No  → LLM-as-Judge (Pointwise) + Human Calibration
│   │
├── Multi-Step Tool-Calling Chains
│   ├── Trajectory matters?
│   │   ├── Yes → Trajectory Evaluation (step-level scoring)
│   │   └── No  → Outcome-Only Evaluation (final state diff)
│   │
├── Code Generation
│   ├── Executable test cases available?
│   │   ├── Yes → Execution-Based Pass@k Scoring
│   │   └── No  → LLM-as-Judge (Pairwise Comparison)
│   │
└── Long-Form Content / Summarization
    ├── Reference summaries available?
    │   ├── Yes → ROUGE-L + BERTScore + Faithfulness Check
    │   └── No  → LLM-as-Judge (Rubric-Based) + Hallucination Audit
```

---

## Detailed Architectural Overview

The evaluation testing framework operates as a pipeline from agent output collection through scoring, aggregation, and regression analysis.

```
+----------------+     +-----------------+     +------------------+     +-------------------+
| Agent Runtime  | ──► | Trace Collector | ──► | Eval Dispatcher  | ──► | Scoring Engines   |
| (completions)  |     | (trajectories)  |     | (routes by type) |     | (judge/metric/exec)|
+----------------+     +-----------------+     +------------------+     +-------------------+
                                                                                  │
                                                                                  ▼
+----------------+                                                       +-------------------+
| CI/CD Gateway  | ◄─────────────────────────────────────────────────── | Aggregator &      |
| (pass/fail)    |                                                       | Regression Tester |
+----------------+                                                       +-------------------+
```

### Evaluation Lifecycle

```
[Agent Produces Output]
       │
       ├──► (A) Trace Collection ──► Captures tool calls, reasoning steps, final output
       │
       ├──► (B) Eval Routing ──► Matches output type to scoring strategy (judge/metric/exec)
       │
       ├──► (C) Multi-Dimensional Scoring ──► $S_d = \frac{1}{N}\sum_{i=1}^{N} J_d(o_i, r_i)$
       │
       ├──► (D) Statistical Aggregation ──► Computes means, CIs, effect sizes (Cohen's d)
       │
       └──► (E) Regression Test ──► Two-sample t-test against baseline: $t = \frac{\bar{X}_1 - \bar{X}_2}{s_p\sqrt{2/n}}$
```

---

## Workflow Steps

### Phase 1: Trace Collection & Dataset Preparation
1. **Instrument Agent Runtime**: Attach trace collectors to capture every tool call, reasoning step, and final output in structured format.
2. **Load Evaluation Dataset**: Pull versioned test cases from the dataset registry with stratified sampling by difficulty tier.
3. **Generate Agent Outputs**: Execute the agent against all test cases with temperature fixed and random seed locked for reproducibility.
4. **Serialize Trajectories**: Store complete execution traces (inputs, intermediate states, outputs) in JSONL format.

### Phase 2: Scoring Engine Selection
1. **Classify Output Type**: Determine whether each test case requires metric-based, execution-based, or judge-based evaluation.
2. **Load Rubric Definitions**: Bind dimension-specific scoring rubrics (correctness, helpfulness, safety, coherence) to the eval dispatcher.
3. **Configure Judge Models**: Initialize LLM-as-judge instances with calibrated system prompts and few-shot examples.
4. **Set Sampling Parameters**: Configure $N$ judge samples per item for consensus scoring.

### Phase 3: Multi-Dimensional Evaluation
1. **Execute Metric Evaluations**: Run deterministic metrics (F1, BLEU, ROUGE-L, BERTScore) on applicable test cases.
2. **Execute Judge Evaluations**: Route subjective dimensions through LLM-as-judge with structured output schemas.
3. **Execute Trajectory Evaluations**: Score step-by-step reasoning chains against golden trajectories.
4. **Run Hallucination Detection**: Extract factual claims and verify against source documents.

### Phase 4: Statistical Aggregation
1. **Compute Dimension Means**: Calculate per-dimension score averages with bootstrap confidence intervals.
2. **Compute Effect Sizes**: Calculate Cohen's d between current and baseline score distributions.
3. **Run Normality Tests**: Apply Shapiro-Wilk test to determine appropriate statistical comparison method.
4. **Generate Score Distributions**: Plot histograms and box plots for each evaluation dimension.

### Phase 5: Regression Detection
1. **Load Baseline Snapshots**: Retrieve the most recent accepted baseline from the eval registry.
2. **Execute Statistical Tests**: Run paired t-tests or Wilcoxon signed-rank tests comparing current vs. baseline.
3. **Apply Holm-Bonferroni Correction**: Correct for multiple comparisons across evaluation dimensions.
4. **Render Regression Verdict**: Emit PASS/FAIL based on corrected p-values and minimum effect size thresholds.

### Phase 6: CI/CD Integration & Reporting
1. **Publish Eval Report**: Write structured JSON report to the CI artifact store.
2. **Update Baseline Registry**: If verdict is PASS and metrics improve, promote current scores to the new baseline.
3. **Gate Deployment**: Block or allow deployment based on regression verdict and mandatory dimension thresholds.
4. **Alert on Degradations**: Send notifications for statistically significant regressions exceeding alert thresholds.

---

## Extended Troubleshooting Guide

When implementing evaluation testing frameworks, you may encounter the following common failure modes:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **High variance in LLM-as-judge scores** | Judge prompt is underspecified or lacks calibration examples. | Add 3-5 few-shot examples covering edge cases and re-calibrate against human labels. |
| **False regression alerts on every run** | Baseline was captured from a single run without confidence intervals. | Re-capture baseline using $N \ge 50$ samples and store distribution parameters. |
| **Hallucination scorer flags correct outputs** | Verification source documents are incomplete or outdated. | Expand source corpus and add a confidence threshold ($\tau \ge 0.8$) before flagging. |
| **CI pipeline times out during eval** | Full eval suite runs against entire dataset on every commit. | Implement tiered eval: fast smoke tests on PR, full suite on merge to main. |
| **Judge model agrees with itself (self-bias)** | Same model used for generation and judging. | Use a different model family for judging or implement cross-model consensus. |
| **Eval scores plateau despite agent improvements** | Benchmark saturation — test cases are too easy. | Refresh dataset with adversarial examples targeting known failure modes. |
| **Trajectory eval misses semantic equivalence** | Step comparison uses exact string matching. | Use semantic similarity (cosine $\ge 0.85$) for step-level comparison instead. |

---

## Complete Evaluation Pipeline Scenario

Below is a typical end-to-end evaluation execution for a code-generation agent:

```
[PR Opened] ──► CI Trigger fires
                    │
[Stage 1] ──► Load 50-case smoke test dataset ──► Run agent on all cases
                                                        │
[Stage 2] ──► Route: 30 exec-based (pass@1) + 20 judge-based (correctness)
                    │                                    │
[Stage 3] ──► pass@1 = 0.83 (baseline: 0.81)    judge_mean = 4.2/5 (baseline: 4.1/5)
                    │                                    │
[Stage 4] ──► Paired t-test: p=0.23 (not significant)   p=0.34 (not significant)
                    │
[Stage 5] ──► Verdict: PASS ──► Merge allowed ──► Full eval queued on main branch
```

---

## Rules and Guidelines
- **Rule 1**: Never evaluate agent outputs with a single sample. All eval dimensions must use $N \ge 5$ samples with reported confidence intervals.
- **Rule 2**: LLM-as-judge prompts must include explicit scoring rubrics with level definitions (e.g., 1=incorrect, 3=partially correct, 5=fully correct).
- **Rule 3**: Trajectory evaluations must score both the correctness of individual steps AND the optimality of the overall path.
- **Rule 4**: Eval datasets must be versioned using content hashes and must never be modified in-place. Create new versions instead.
- **Rule 5**: Regression detection must use family-wise error rate correction (Holm-Bonferroni) when testing across multiple dimensions simultaneously.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, data schemas, code implementations, and integration patterns used in this evaluation testing framework:

- [trajectory-evaluation.md](references/trajectory-evaluation.md)
  Covers step-by-step trajectory scoring algorithms, golden trajectory comparison, semantic step matching, and trajectory optimality metrics.
- [llm-as-judge-patterns.md](references/llm-as-judge-patterns.md)
  Details LLM-as-judge architectures including pointwise scoring, pairwise comparison, reference-guided judging, consensus protocols, and calibration techniques.
- [verifier-agent-patterns.md](references/verifier-agent-patterns.md)
  Defines dedicated verification agent topologies, cross-model verification, execution-based verification, and multi-agent debate protocols.
- [cicd-eval-integration.md](references/cicd-eval-integration.md)
  Provides CI/CD pipeline configurations for GitHub Actions, GitLab CI, and Jenkins with tiered eval stages, artifact management, and deployment gates.
- [regression-detection.md](references/regression-detection.md)
  Outlines statistical regression detection methods, baseline management, effect size calculations, and alerting threshold configurations.
- [benchmark-design.md](references/benchmark-design.md)
  Explains benchmark dataset design principles, difficulty stratification, contamination prevention, and saturation detection algorithms.
- [hallucination-scoring.md](references/hallucination-scoring.md)
  Covers hallucination detection and scoring pipelines, claim extraction, source verification, faithfulness metrics, and severity classification.
- [eval-dataset-management.md](references/eval-dataset-management.md)
  Defines dataset versioning schemas, content-hash registries, stratified sampling strategies, and dataset refresh lifecycle management.

---

## Handoff
For projects requiring prompt optimization before evaluation, hand off to `context-engineering`. For systems implementing architectural constraints on agent behavior, hand off to `architectural-constraints`. For agent failure recovery during evaluation runs, hand off to `error-recovery`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with evaluation frameworks, statistical methods, and CI/CD integration protocols.
-->
