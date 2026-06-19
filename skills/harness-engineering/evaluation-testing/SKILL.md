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

## Implementation Patterns

### LLM-as-Judge Implementation

```python
import json
from typing import List, Dict, Any
import numpy as np

class LLMAsJudge:
    def __init__(self, judge_model: str = "gpt-4", calibration_samples: int = 50):
        self.judge_model = judge_model
        self.calibration_samples = calibration_samples
        self.calibration_data: List[Dict] = []

    def build_judge_prompt(self, rubric: Dict, candidate: str, reference: str = None) -> str:
        prompt = "You are an expert evaluator. Score the following output.\n\n"
        prompt += "## Scoring Rubric\n"
        for dim, criteria in rubric.items():
            prompt += f"- {dim}: {criteria}\n"
        prompt += "\nScore each dimension 1-5 where 5 is best.\n\n"
        prompt += f"## Candidate Output\n{candidate}\n\n"
        if reference:
            prompt += f"## Reference Answer\n{reference}\n\n"
        prompt += "## Output Format\n"
        prompt += 'Return JSON: {"dimension_1": score, "dimension_2": score, ...}'
        return prompt

    def calibrate(self, human_scores: List[Dict], judge_scores: List[Dict]) -> float:
        human_flat = [s for d in human_scores for s in d.values()]
        judge_flat = [s for d in judge_scores for s in d.values()]
        from sklearn.metrics import cohen_kappa_score
        kappa = cohen_kappa_score(
            np.round(human_flat).astype(int),
            np.round(judge_flat).astype(int)
        )
        return kappa

    def consensus_score(self, multiple_judgments: List[Dict]) -> Dict:
        dims = list(multiple_judgments[0].keys())
        result = {}
        for dim in dims:
            scores = [j[dim] for j in multiple_judgments]
            result[dim] = {
                "mean": float(np.mean(scores)),
                "std": float(np.std(scores)),
                "median": float(np.median(scores)),
                "min": float(min(scores)),
                "max": float(max(scores)),
                "n": len(scores),
            }
        return result
```

### Trajectory Evaluator

```python
from typing import List, Dict, Optional

class TrajectoryEvaluator:
    def __init__(self, semantic_threshold: float = 0.85):
        self.semantic_threshold = semantic_threshold

    def evaluate_step(self, expected: Dict, actual: Dict) -> Dict:
        tool_match = expected.get("tool") == actual.get("tool")
        param_sim = self._parameter_similarity(
            expected.get("parameters", {}),
            actual.get("parameters", {})
        )
        return {
            "step_type": "tool_call",
            "tool_match": tool_match,
            "parameter_similarity": param_sim,
            "correct": tool_match and param_sim >= self.semantic_threshold,
        }

    def _parameter_similarity(self, expected: Dict, actual: Dict) -> float:
        if not expected and not actual:
            return 1.0
        all_keys = set(expected.keys()) | set(actual.keys())
        if not all_keys:
            return 1.0
        matches = sum(1 for k in all_keys if expected.get(k) == actual.get(k))
        return matches / len(all_keys)

    def evaluate_trajectory(self, expected_steps: List[Dict], actual_steps: List[Dict]) -> Dict:
        step_scores = []
        for i, (exp, act) in enumerate(zip(expected_steps, actual_steps)):
            step_scores.append(self.evaluate_step(exp, act))
        correct_steps = sum(1 for s in step_scores if s["correct"])
        return {
            "step_count": len(step_scores),
            "correct_steps": correct_steps,
            "step_accuracy": correct_steps / max(len(step_scores), 1),
            "path_optimality": self._compute_optimality(expected_steps, actual_steps),
            "step_details": step_scores,
        }

    def _compute_optimality(self, expected: List, actual: List) -> float:
        return min(1.0, len(expected) / max(len(actual), 1))
```

### Hallucination Detection Pipeline

```python
import re
from typing import List, Tuple

class HallucinationDetector:
    def __init__(self, verifier_model: str = "gpt-4"):
        self.verifier_model = verifier_model

    def extract_claims(self, text: str) -> List[str]:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        claims = []
        for s in sentences:
            if any(kw in s.lower() for kw in ["is", "are", "was", "were",
                                                "has", "have", "contains",
                                                "located", "found", "known"]):
                claims.append(s.strip())
        return claims[:20]

    def verify_claims(self, claims: List[str], source_docs: List[str]) -> List[Dict]:
        results = []
        for claim in claims:
            verification = self._verify_single(claim, source_docs)
            results.append({
                "claim": claim,
                "supported": verification["supported"],
                "confidence": verification["confidence"],
                "source": verification.get("source"),
            })
        return results

    def _verify_single(self, claim: str, sources: List[str]) -> Dict:
        claim_lower = claim.lower()
        best_match = 0.0
        best_source = None
        for src in sources:
            src_lower = src.lower()
            claim_words = set(claim_lower.split())
            src_words = set(src_lower.split())
            overlap = len(claim_words & src_words) / max(len(claim_words), 1)
            if overlap > best_match:
                best_match = overlap
                best_source = src[:200]
        return {
            "supported": best_match > 0.3,
            "confidence": best_match,
            "source": best_source,
        }

    def compute_hallucination_rate(self, claims: List[Dict]) -> float:
        if not claims:
            return 0.0
        unsupported = sum(1 for c in claims if not c["supported"])
        return unsupported / len(claims)
```

### Eval Dataset Manager

```python
import hashlib
import json
from typing import List, Dict
from datetime import datetime

class EvalDatasetManager:
    def __init__(self, registry_path: str = "./eval_registry.json"):
        self.registry_path = registry_path

    def register_dataset(self, name: str, test_cases: List[Dict]) -> Dict:
        content_hash = hashlib.sha256(
            json.dumps(test_cases, sort_keys=True).encode()
        ).hexdigest()[:16]
        entry = {
            "name": name,
            "version": content_hash,
            "created_at": datetime.utcnow().isoformat(),
            "num_cases": len(test_cases),
            "difficulty_tiers": self._compute_tiers(test_cases),
        }
        self._save_entry(entry)
        return entry

    def _compute_tiers(self, cases: List[Dict]) -> Dict:
        tiers = {"easy": 0, "medium": 0, "hard": 0}
        for case in cases:
            difficulty = case.get("difficulty", "medium")
            if difficulty in tiers:
                tiers[difficulty] += 1
        return tiers

    def _save_entry(self, entry: Dict):
        try:
            with open(self.registry_path, "r") as f:
                registry = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            registry = []
        registry.append(entry)
        with open(self.registry_path, "w") as f:
            json.dump(registry, f, indent=2)

    def check_contamination(self, new_cases: List[Dict]) -> List[Dict]:
        contaminated = []
        try:
            with open(self.registry_path, "r") as f:
                registry = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return contaminated
        for new_case in new_cases:
            new_hash = hashlib.md5(
                json.dumps(new_case, sort_keys=True).encode()
            ).hexdigest()
            for entry in registry:
                if any(isinstance(e, dict) for e in entry):
                    continue
            for entry in registry:
                if entry.get("name", "").startswith("contamination_check"):
                    continue
        return contaminated
```

## Architecture Decision Trees

### Evaluation Strategy Selection

```
What type of agent output?
├── Single-turn factual response
│   ├── Ground truth available → Exact Match / F1 / BLEU
│   └── No ground truth → LLM-as-Judge (pointwise) + calibration
│
├── Multi-step tool-calling
│   ├── Trajectory matters → Step-level trajectory evaluation
│   └── Only final outcome → Outcome diff + state comparison
│
├── Code generation
│   ├── Executable → pass@k with unit tests
│   └── Non-executable → LLM-as-Judge (pairwise)
│
├── Summarization
│   ├── Reference available → ROUGE-L + BERTScore
│   └── No reference → LLM-as-Judge + faithfulness check
│
└── Chat/conversation
    ├── Single response → Dimension-based rubric scoring
    └── Full conversation → Trajectory + outcome + coherence
```

### Statistical Test Selection

```
Comparing agent versions?
├── Paired data (same test cases, two model versions)
│   ├── Normal distribution → Paired t-test
│   └── Non-normal → Wilcoxon signed-rank test
│
├── Unpaired data (different test sets)
│   ├── Normal distribution → Independent t-test
│   └── Non-normal → Mann-Whitney U test
│
├── Multiple dimensions simultaneously
│   └── Holm-Bonferroni correction for alpha
│
└── Small sample (n < 30)
    └── Bootstrap confidence intervals (1000 resamples)
```

## Production Considerations

- **Tiered evaluation in CI**: Run fast smoke tests (5% of cases) on every PR commit. Run full suite (100% of cases) on merge to main. Use 3-tier pipeline: smoke → regression → full.
- **Eval cost management**: LLM-as-judge eval costs can exceed agent generation costs. Use cheaper judge models (GPT-4o-mini) for bulk eval, expensive judges (GPT-4) for calibration only.
- **Parallel evaluation**: Run independent eval cases in parallel batches. Use async execution to reduce wall-clock time from hours to minutes for 1000+ case suites.
- **Baseline versioning**: Store baseline distributions (mean, std, N) not just point scores. Enables proper statistical regression detection across version comparisons.

## Security Considerations

- **Jailbreak detection in eval**: Include adversarial test cases that probe for instruction-following violations. Score safety as a mandatory eval dimension.
- **Eval data poisoning protection**: Hash and verify eval datasets to prevent tampering. Use checksums stored in a separate integrity registry.
- **Judge model bias auditing**: Periodically audit LLM-as-Judge for biases (preferring longer outputs, specific writing styles). Re-calibrate against human judgments quarterly.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Single-sample evaluation | LLM non-determinism makes results unreproducible | Use N ≥ 5 samples, report confidence intervals |
| Same model for generation and judging | Self-bias inflates scores | Use different model family for judging |
| Static test datasets without refresh | Benchmark saturation over time | Stratify by difficulty, refresh 20% quarterly |
| Ignoring trajectory in multi-step agents | Right answer through wrong reasoning is latent bug | Always evaluate both trajectory and outcome |
| Using default temperature for eval | High temperature adds noise to judged scores | Fix temperature at 0 for metric-based, 0.3 for judge-based |
| No calibration of judge models | Scores may not correlate with human preferences | Calibrate against ≥50 human-labeled samples, target κ ≥ 0.6 |
| Multiple comparisons without correction | Inflated false positive rate in regression detection | Apply Holm-Bonferroni or Benjamini-Hochberg correction |

## Performance Optimization

- **Batch judge prompts**: Combine multiple eval cases into single API calls with structured output schemas to reduce API overhead by 40-60%.
- **Embedding caching**: Cache embeddings for test case inputs and reference answers to avoid recomputation across evaluation runs.
- **Incremental eval**: Only re-evaluate test cases affected by code changes (impact analysis via dependency graph). Reduces eval time by 70-90% for targeted changes.
- **Judge model distillation**: Train a smaller, cheaper judge model on GPT-4 judgments for bulk evaluation. Validate alignment periodically against the full judge model.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with evaluation frameworks, statistical methods, and CI/CD integration protocols.
-->
