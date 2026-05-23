# Regression Testing for LLMs

## Regression Detection

### What Constitutes a Regression
- Metric drops below defined threshold (e.g., faithfulness < 0.85)
- Statistically significant decline vs baseline (p < 0.05)
- New failure mode in golden dataset
- Behavioral change on unrelated tasks (catastrophic forgetting)
- Latency increase >20% on P95

### Baseline Management
```yaml
baseline:
  model: "llama-3.1-70b-v1"
  dataset: "golden-v3.2.0"
  date: "2026-03-01"
  metrics:
    faithfulness: 0.93
    answer_relevance: 0.88
    context_precision: 0.82
    latency_p95_ms: 1800
```

## CI Integration

### PR Gate Pipeline
```yaml
name: LLM Regression Check
on: pull_request
jobs:
  regression:
    runs-on: [self-hosted]
    steps:
      - name: Run eval on PR branch
        run: eval-runner --dataset golden-v3 --candidate HEAD --output results.json

      - name: Compare with baseline
        run: |
          python compare.py \
            --baseline production-baseline.json \
            --candidate results.json \
            --threshold 0.95

      - name: Post results
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: regression-report.md

      - name: Block on regression
        if: failure()
        run: exit 1
```

### Comparison Script
```python
def detect_regression(baseline, candidate, threshold=0.95):
    regressions = []
    for metric in baseline["metrics"]:
        base_val = baseline["metrics"][metric]
        cand_val = candidate["metrics"][metric]
        ratio = cand_val / base_val if base_val > 0 else 1.0
        if ratio < threshold:
            regressions.append({
                "metric": metric,
                "baseline": base_val,
                "candidate": cand_val,
                "ratio": ratio,
            })
    return regressions
```

## Test Selection Strategy

### Fast vs Full Regression
```
Fast (every PR, ~2 min, ~$0.05):
  - 50 samples: golden + adversarial
  - Metrics: faithfulness, safety
  - Models: current candidate only

Full (nightly, ~15 min, ~$2.00):
  - 750 samples: all datasets
  - Metrics: all
  - Models: candidate vs production

Release (per deployment, ~30 min, ~$5.00):
  - Full dataset + human review
  - All metrics + manual spot-check
  - Summary sent to stakeholders
```

## Change Categorization

| Change Type | Regression Tests | Risk Level |
|-------------|-----------------|------------|
| Prompt update | Full eval | Low |
| Model swap (same tier) | Full eval | Medium |
| Model swap (different tier) | Full eval + human review | High |
| RAG pipeline change | Retrieval + full eval | Medium |
| Guardrail change | Safety + adversarial | Low |
| Infrastructure (latency) | Latency benchmarks | Medium |

## Root Cause Analysis

### When Regression Detected
```python
def analyze_regression(regressions, changelog):
    causes = []
    for reg in regressions:
        # Check timing
        related_changes = [
            c for c in changelog
            if c["timestamp"] > reg["first_detected"]
        ]
        causes.append({
            "metric": reg["metric"],
            "related_deployments": related_changes,
            "suspected_cause": isolate_cause(reg, related_changes),
        })
    return causes
```

### Common Root Causes
- Prompt template change introduced ambiguity
- Model update changed output style
- Embedding model update shifted retrieval results
- Chunking parameter change reduced context quality
- Guardrail update changed output verification

## Reporting

### Regression Report Template
```markdown
## Regression Report: PR #423

### Summary
- Baseline: production (v2.1.0)
- Candidate: PR #423 (model update)
- Dataset: golden-v3 (200 samples)

### Metrics Comparison
| Metric | Baseline | Candidate | Delta | Status |
|--------|----------|-----------|-------|--------|
| Faithfulness | 0.93 | 0.91 | -2.1% | ✅ Pass |
| Safety | 1.00 | 1.00 | 0% | ✅ Pass |
| Latency P95 | 1800ms | 2100ms | +16.7% | ⚠️ Warn |
| Format Compliance | 0.97 | 0.95 | -2.1% | ✅ Pass |

### Regressions Detected
- Latency P95 increased 16.7% (warning threshold: 20%)

### Recommendations
- Latency increase acceptable for quality improvement
- Proceed with deployment, monitor latency in production
```

## Monitoring Dashboard

Track these over time:
- Regression rate per deployment (rolling 30 days)
- Metrics trend lines with deployment annotations
- Model version comparison matrix
- Cost per regression test run
