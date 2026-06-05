# CI/CD Eval Integration

## Foundations of Continuous Evaluation

Integrating agent evaluations into CI/CD pipelines transforms evaluation from a manual, ad-hoc process into an automated deployment gate. Every code change that affects agent behavior — prompt modifications, model upgrades, tool additions, or system prompt changes — must pass through automated evaluation before reaching production.

The core principle: **No agent change ships without passing eval gates.**

```
+-------------------------------------------------------------------+
|                    CI/CD EVAL PIPELINE                              |
+-------------------------------------------------------------------+
|                                                                     |
|  [PR Created] ──► [Smoke Eval] ──► [PR Review]                    |
|                                          │                          |
|  [Merge to Main] ──► [Full Eval Suite] ──► [Gate Check]            |
|                                                │                    |
|                                          Pass? │                    |
|                                          ┌─────┴─────┐             |
|                                          │           │             |
|                                        [Yes]       [No]            |
|                                          │           │             |
|                                     [Deploy]    [Block +           |
|                                                  Alert]            |
+-------------------------------------------------------------------+
```

---

## Tiered Evaluation Strategy

### Tier 1: PR Smoke Tests (< 5 minutes)

Run on every pull request. Fast, cheap, catches obvious regressions.

- **Dataset Size**: 20-50 representative test cases
- **Eval Methods**: Deterministic metrics only (F1, exact match, schema validation)
- **Judge Calls**: None (too slow)
- **Pass Criteria**: All critical metrics ≥ baseline - ε (tolerance margin)

### Tier 2: Merge Evaluation (< 30 minutes)

Run when PR is merged to main branch. Comprehensive evaluation.

- **Dataset Size**: 200-500 stratified test cases
- **Eval Methods**: Deterministic metrics + LLM-as-judge (3 samples per item)
- **Judge Calls**: Yes, limited to key dimensions
- **Pass Criteria**: Statistical regression test against baseline (p < 0.05)

### Tier 3: Pre-Release Full Suite (< 2 hours)

Run before production releases. Complete evaluation.

- **Dataset Size**: Full evaluation dataset (1000+ cases)
- **Eval Methods**: All methods including trajectory eval, hallucination scoring
- **Judge Calls**: Yes, multi-model consensus (5 samples)
- **Pass Criteria**: All dimensions pass with Holm-Bonferroni correction

```
                    Cost ↑
                         │
              Tier 3 ●   │  Full Suite (1000+ cases, 2h)
                         │
                         │
              Tier 2 ●   │  Merge Eval (200-500 cases, 30m)
                         │
                         │
              Tier 1 ●   │  Smoke Test (20-50 cases, 5m)
                         │
                         └───────────────────────────► Frequency
                    Every PR         Merge        Release
```

---

## GitHub Actions Configuration

### Complete Workflow File

```yaml
# .github/workflows/agent-eval.yml
name: Agent Evaluation Pipeline

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'agents/**'
      - 'tools/**'
      - 'config/agent-*.yml'
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      eval_tier:
        description: 'Evaluation tier (1=smoke, 2=merge, 3=full)'
        required: true
        default: '2'

env:
  EVAL_DATASET_REGISTRY: ${{ secrets.EVAL_DATASET_REGISTRY }}
  JUDGE_API_KEY: ${{ secrets.JUDGE_API_KEY }}
  BASELINE_STORE: ${{ secrets.BASELINE_STORE }}

jobs:
  # Tier 1: Smoke test on every PR
  smoke-eval:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install -r requirements-eval.txt
      
      - name: Pull smoke test dataset
        run: |
          python -m eval.dataset pull \
            --tier smoke \
            --output ./eval-data/smoke.jsonl
      
      - name: Run agent on test cases
        run: |
          python -m eval.runner \
            --dataset ./eval-data/smoke.jsonl \
            --output ./eval-results/smoke-outputs.jsonl \
            --model-version ${{ github.sha }} \
            --temperature 0.0 \
            --seed 42
      
      - name: Score outputs (deterministic only)
        run: |
          python -m eval.scorer \
            --outputs ./eval-results/smoke-outputs.jsonl \
            --metrics exact_match f1 schema_valid \
            --output ./eval-results/smoke-scores.json
      
      - name: Check regression
        id: regression
        run: |
          python -m eval.regression \
            --scores ./eval-results/smoke-scores.json \
            --baseline-ref main \
            --tolerance 0.02 \
            --output ./eval-results/smoke-verdict.json
      
      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const scores = JSON.parse(fs.readFileSync('./eval-results/smoke-scores.json'));
            const verdict = JSON.parse(fs.readFileSync('./eval-results/smoke-verdict.json'));
            
            const status = verdict.passed ? '✅ PASS' : '❌ FAIL';
            const body = `## Agent Eval: Smoke Test ${status}
            
            | Metric | Score | Baseline | Delta |
            |--------|-------|----------|-------|
            ${Object.entries(scores.metrics).map(([k, v]) => 
              `| ${k} | ${v.current.toFixed(3)} | ${v.baseline.toFixed(3)} | ${v.delta >= 0 ? '+' : ''}${v.delta.toFixed(3)} |`
            ).join('\n')}
            
            **Verdict**: ${verdict.message}
            **Model**: \`${scores.model_version.substring(0, 8)}\`
            `;
            
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
      
      - name: Fail if regression detected
        if: steps.regression.outputs.passed == 'false'
        run: exit 1
      
      - name: Upload eval artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-eval-results
          path: ./eval-results/
          retention-days: 30

  # Tier 2: Full eval on merge to main
  merge-eval:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      
      - name: Install dependencies
        run: pip install -r requirements-eval.txt
      
      - name: Pull merge eval dataset
        run: |
          python -m eval.dataset pull \
            --tier merge \
            --output ./eval-data/merge.jsonl
      
      - name: Run agent on test cases
        run: |
          python -m eval.runner \
            --dataset ./eval-data/merge.jsonl \
            --output ./eval-results/merge-outputs.jsonl \
            --model-version ${{ github.sha }} \
            --temperature 0.0 \
            --seed 42 \
            --parallel 4
      
      - name: Score outputs (metrics + judge)
        run: |
          python -m eval.scorer \
            --outputs ./eval-results/merge-outputs.jsonl \
            --metrics exact_match f1 schema_valid bertscore \
            --judge-dimensions correctness helpfulness \
            --judge-model gpt-4o \
            --judge-samples 3 \
            --output ./eval-results/merge-scores.json
      
      - name: Statistical regression test
        id: regression
        run: |
          python -m eval.regression \
            --scores ./eval-results/merge-scores.json \
            --baseline-ref latest \
            --test paired_ttest \
            --alpha 0.05 \
            --correction holm_bonferroni \
            --output ./eval-results/merge-verdict.json
      
      - name: Update baseline if improved
        if: steps.regression.outputs.improved == 'true'
        run: |
          python -m eval.baseline update \
            --scores ./eval-results/merge-scores.json \
            --version ${{ github.sha }}
      
      - name: Upload eval artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: merge-eval-results
          path: ./eval-results/
          retention-days: 90
      
      - name: Alert on regression
        if: steps.regression.outputs.passed == 'false'
        run: |
          python -m eval.alert \
            --verdict ./eval-results/merge-verdict.json \
            --channel slack \
            --severity warning
```

---

## Python Eval Pipeline Framework

```python
import json
import time
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics

@dataclass
class EvalConfig:
    tier: str  # "smoke", "merge", "full"
    dataset_path: Path
    output_dir: Path
    model_version: str
    metrics: List[str]
    judge_dimensions: List[str] = field(default_factory=list)
    judge_model: str = "gpt-4o"
    judge_samples: int = 3
    max_parallel: int = 4
    temperature: float = 0.0
    seed: int = 42
    baseline_ref: str = "latest"
    alpha: float = 0.05
    correction: str = "holm_bonferroni"

class EvalPipeline:
    """
    End-to-end evaluation pipeline for CI/CD integration.
    """
    
    def __init__(self, config: EvalConfig, agent_runner, scorer, judge=None):
        self.config = config
        self.agent_runner = agent_runner
        self.scorer = scorer
        self.judge = judge
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
    
    def run(self) -> Dict[str, Any]:
        """Execute the full eval pipeline."""
        pipeline_start = time.time()
        
        # Phase 1: Load dataset
        dataset = self._load_dataset()
        print(f"[EVAL] Loaded {len(dataset)} test cases from {self.config.dataset_path}")
        
        # Phase 2: Generate agent outputs
        outputs = self._generate_outputs(dataset)
        print(f"[EVAL] Generated {len(outputs)} agent outputs")
        
        # Phase 3: Score outputs
        scores = self._score_outputs(outputs, dataset)
        print(f"[EVAL] Scored across {len(scores)} dimensions")
        
        # Phase 4: Regression test
        verdict = self._check_regression(scores)
        
        pipeline_duration = time.time() - pipeline_start
        
        report = {
            "config": asdict(self.config) if hasattr(self.config, '__dataclass_fields__') else {},
            "dataset_size": len(dataset),
            "scores": scores,
            "verdict": verdict,
            "duration_seconds": pipeline_duration,
            "timestamp": time.time()
        }
        
        # Save report
        report_path = self.config.output_dir / "eval-report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)
        
        return report
    
    def _load_dataset(self) -> List[Dict[str, Any]]:
        """Load eval dataset from JSONL file."""
        dataset = []
        with open(self.config.dataset_path) as f:
            for line in f:
                if line.strip():
                    dataset.append(json.loads(line))
        return dataset
    
    def _generate_outputs(self, dataset: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run agent on all test cases in parallel."""
        outputs = []
        
        with ThreadPoolExecutor(max_workers=self.config.max_parallel) as executor:
            futures = {}
            for item in dataset:
                future = executor.submit(
                    self.agent_runner.run,
                    input=item["input"],
                    temperature=self.config.temperature,
                    seed=self.config.seed
                )
                futures[future] = item
            
            for future in as_completed(futures):
                item = futures[future]
                try:
                    result = future.result(timeout=120)
                    outputs.append({
                        "task_id": item["task_id"],
                        "input": item["input"],
                        "expected": item.get("expected"),
                        "actual": result,
                        "model_version": self.config.model_version
                    })
                except Exception as e:
                    outputs.append({
                        "task_id": item["task_id"],
                        "input": item["input"],
                        "expected": item.get("expected"),
                        "actual": None,
                        "error": str(e),
                        "model_version": self.config.model_version
                    })
        
        return outputs
    
    def _score_outputs(
        self,
        outputs: List[Dict[str, Any]],
        dataset: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Score all outputs across configured metrics and dimensions."""
        scores = {}
        
        # Deterministic metrics
        for metric_name in self.config.metrics:
            metric_scores = []
            for output in outputs:
                if output.get("error"):
                    metric_scores.append(0.0)
                    continue
                score = self.scorer.score(
                    metric=metric_name,
                    actual=output["actual"],
                    expected=output.get("expected")
                )
                metric_scores.append(score)
            
            scores[metric_name] = {
                "mean": statistics.mean(metric_scores),
                "std": statistics.stdev(metric_scores) if len(metric_scores) > 1 else 0.0,
                "min": min(metric_scores),
                "max": max(metric_scores),
                "n": len(metric_scores),
                "scores": metric_scores
            }
        
        # LLM-as-judge dimensions
        if self.judge and self.config.judge_dimensions:
            for dim_name in self.config.judge_dimensions:
                dim_scores = []
                for output in outputs:
                    if output.get("error"):
                        dim_scores.append(0.0)
                        continue
                    result = self.judge.evaluate_pointwise(
                        output=str(output["actual"]),
                        dimension=dim_name,
                        task_description=output["input"]
                    )
                    dim_scores.append(result.final_score)
                
                scores[f"judge_{dim_name}"] = {
                    "mean": statistics.mean(dim_scores),
                    "std": statistics.stdev(dim_scores) if len(dim_scores) > 1 else 0.0,
                    "min": min(dim_scores),
                    "max": max(dim_scores),
                    "n": len(dim_scores),
                    "scores": dim_scores
                }
        
        return scores
    
    def _check_regression(self, scores: Dict[str, Any]) -> Dict[str, Any]:
        """Check for regressions against baseline."""
        # Load baseline (simplified - in production, load from registry)
        baseline_path = self.config.output_dir / "baseline.json"
        if not baseline_path.exists():
            return {
                "passed": True,
                "message": "No baseline found - first run establishes baseline",
                "is_first_run": True
            }
        
        with open(baseline_path) as f:
            baseline = json.loads(f.read())
        
        regressions = []
        for metric, current in scores.items():
            if metric in baseline:
                delta = current["mean"] - baseline[metric]["mean"]
                # Simple z-test (in production, use proper paired t-test)
                pooled_std = (current["std"]**2/current["n"] + baseline[metric]["std"]**2/baseline[metric]["n"])**0.5
                z_score = delta / pooled_std if pooled_std > 0 else 0
                p_value = 2 * (1 - min(abs(z_score)/3, 0.9999))  # Rough approximation
                
                if delta < 0 and p_value < self.config.alpha:
                    regressions.append({
                        "metric": metric,
                        "current": current["mean"],
                        "baseline": baseline[metric]["mean"],
                        "delta": delta,
                        "p_value": p_value
                    })
        
        return {
            "passed": len(regressions) == 0,
            "regressions": regressions,
            "message": f"Found {len(regressions)} regressions" if regressions else "No regressions detected"
        }
```

---

## GitLab CI Configuration

```yaml
# .gitlab-ci.yml
stages:
  - smoke-eval
  - merge-eval
  - deploy

smoke-eval:
  stage: smoke-eval
  image: python:3.12
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - prompts/**
        - agents/**
  script:
    - pip install -r requirements-eval.txt
    - python -m eval.pipeline --tier smoke --output ./results
  artifacts:
    reports:
      junit: results/junit-report.xml
    paths:
      - results/
    expire_in: 30 days
  timeout: 10 minutes

merge-eval:
  stage: merge-eval
  image: python:3.12
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - pip install -r requirements-eval.txt
    - python -m eval.pipeline --tier merge --output ./results
    - python -m eval.regression --scores results/scores.json --fail-on-regression
  artifacts:
    paths:
      - results/
    expire_in: 90 days
  timeout: 45 minutes
```

---

## Eval Artifact Management

### Artifact Structure

```
eval-results/
├── smoke-eval-results/
│   ├── smoke-outputs.jsonl          # Raw agent outputs
│   ├── smoke-scores.json            # Computed scores
│   └── smoke-verdict.json           # Regression verdict
├── merge-eval-results/
│   ├── merge-outputs.jsonl
│   ├── merge-scores.json
│   ├── merge-verdict.json
│   └── judge-traces/               # Individual judge responses
│       ├── item-001-correctness.json
│       └── item-001-helpfulness.json
├── baselines/
│   ├── baseline-v2.3.0.json
│   ├── baseline-v2.3.1.json
│   └── latest.json -> baseline-v2.3.1.json
└── eval-report.json                 # Summary report
```

### Baseline Version Schema

```json
{
  "version": "baseline-v2.3.1",
  "created_at": "2026-06-04T09:00:00Z",
  "model_version": "agent-v2.3.1",
  "commit_sha": "a1b2c3d4",
  "dataset_hash": "sha256:e5f6g7h8",
  "metrics": {
    "exact_match": { "mean": 0.85, "std": 0.12, "n": 200 },
    "f1": { "mean": 0.91, "std": 0.08, "n": 200 },
    "judge_correctness": { "mean": 4.2, "std": 0.6, "n": 200 },
    "judge_helpfulness": { "mean": 4.1, "std": 0.7, "n": 200 }
  }
}
```

---

## Best Practices

1. **Pin eval dataset versions**: Never modify datasets in-place. Use content hashes to detect drift.
2. **Cache agent outputs**: If the agent code hasn't changed, reuse outputs from previous runs.
3. **Use deterministic generation for evals**: Set temperature=0 and fix random seeds during eval runs.
4. **Separate eval costs from production**: Use dedicated API keys and billing accounts for eval judge calls.
5. **Alert on eval infrastructure failures**: Pipeline failures (not agent regressions) should trigger separate alerts.
6. **Store eval artifacts for at least 90 days**: You'll need historical comparisons for trend analysis.

---

## Handoff & Related References
- Regression Detection: [regression-detection.md](regression-detection.md)
- Benchmark Design: [benchmark-design.md](benchmark-design.md)
- Eval Dataset Management: [eval-dataset-management.md](eval-dataset-management.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive CI/CD integration configurations & pipeline code preserved)
-->
