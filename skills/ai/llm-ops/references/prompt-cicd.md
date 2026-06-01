# Prompt CI/CD Pipeline

## Overview
Prompts are production code and require the same CI/CD discipline as application code. A prompt CI/CD pipeline automates: linting, testing, evaluation, approval gating, staged rollout, and rollback. This prevents the #1 LLMOps failure: manual prompt changes to production.

## Pipeline Architecture

### Stage 1: Authoring
Prompts are YAML files in a Git repository. Each file contains: template, parameters, model config, test references, metadata.

```yaml
# prompts/customer-support/qa-v3.yaml
version: "3.0.0"
status: draft
template: |
  You are a support agent for {company}.
  Context: {context}
  Question: {question}
  Answer concisely from context only.
parameters:
  - name: company; type: string; required: true
  - name: context; type: string; required: true
  - name: question; type: string; required: true
model: gpt-4o-mini
temperature: 0.3
max_tokens: 500
tests: [fact-001, fact-002, safe-001, edge-001]
owner: team-customer-support
```

### Stage 2: CI Pipeline (PR Triggered)

**Lint and Validate:**
```yaml
# .github/workflows/prompt-ci.yml
name: Prompt CI
on:
  pull_request:
    paths: ["prompts/**/*.yaml"]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Schema validation
        run: pip install pyyaml && python scripts/validate_prompt_schema.py ${{ github.event.pull_request.changed_files }}
      - name: Parameter validation
        run: python scripts/check_params.py --dir prompts/
      - name: Template parse check
        run: python scripts/check_template_syntax.py --dir prompts/
      - name: Required tests exist
        run: python scripts/check_test_references.py --dir prompts/

  evaluate:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - name: Run golden dataset eval
        run: python scripts/run_eval.py \
          --dataset golden-dataset-v12.json \
          --prompts ${{ github.event.pull_request.changed_files }} \
          --production-prompt current-production.yaml \
          --output eval-report.md
      - uses: actions/upload-artifact@v4
        with:
          name: eval-report
          path: eval-report.md
      - name: Check quality gates
        run: python scripts/check_gates.py \
          --report eval-report.md \
          --min-faithfulness 0.93 \
          --max-regression 0.03 \
          --max-cost-increase 0.15
```

**Diff Report:**
Generated report comparing the candidate prompt against the current production version:

```markdown
## Eval Diff Report: qa-v3.0.0 vs qa-v2.5.1

| Metric | Production (v2.5.1) | Candidate (v3.0.0) | Delta | Gate |
|--------|-------------------|-------------------|-------|------|
| Faithfulness | 0.94 | 0.96 | +0.02 | >0.93 PASS |
| Hallucination Rate | 0.03 | 0.02 | -0.01 | <0.05 PASS |
| Safety Score | 0.98 | 0.97 | -0.01 | >0.95 PASS |
| Refusal Rate | 0.02 | 0.03 | +0.01 | <0.05 PASS |
| Avg Response Length | 245 | 198 | -47 | |
| Cost per Query | $0.008 | $0.006 | -$0.002 | <15% PASS |
| Pass Rate | 94% | 95% | +1% | >93% PASS |

Result: ALL GATES PASSED
Recommendation: Approved for canary deployment
```

### Stage 3: Approval Gate
Human reviews the eval report. PR approved by: team lead for minor changes, engineering manager for major changes, QA/safety for safety-related changes.

- Minor (PATCH version): peer review
- Significant (MINOR version): team lead + QA
- Breaking (MAJOR version): engineering manager + QA + safety team

### Stage 4: CD Pipeline (Merge to Main)

**Deploy to Staging:**
```yaml
name: Prompt CD
on:
  push:
    branches: [main]
    paths: ["prompts/**/*.yaml"]
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy prompts to staging registry
        run: python scripts/deploy_prompts.py --registry https://staging-registry.example.com --prompts ${{ steps.changed-files.outputs.all_changed_files }}
      - name: Run smoke tests
        run: python scripts/smoke_test.py --registry https://staging-registry.example.com --test-cases smoke-tests-v3.json

  shadow:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Enable shadow mode (10% traffic mirror)
        run: python scripts/set_traffic_split.py --prompt ${{ steps.deploy.outputs.prompt_name }} --control current-prod --candidate staging-candidate --shadow 10
      - name: Monitor shadow metrics (15 min)
        run: sleep 900 && python scripts/check_shadow_metrics.py --prompt ${{ steps.deploy.outputs.prompt_name }} --min-samples 1000
```

### Stage 5: Canary Deployment

```yaml
canary:
  stages:
    - traffic: 5%
      duration: 15m
      conditions:
        error_rate: "<1.5x baseline"
        faithfulness: ">0.92"
        latency_p95: "<2x baseline"
    - traffic: 25%
      duration: 1h
      conditions:
        error_rate: "<1.2x baseline"
        faithfulness: ">0.93"
    - traffic: 50%
      duration: 2h
      conditions:
        faithfulness: ">0.93"
        cost_per_query: "<1.1x baseline"
    - traffic: 100%
      prometheus: true
      archives_previous: true
```

**Auto-Rollback Triggers:**
```python
class CanaryRollback:
    def check_rollback(self, stage_metrics: dict, baseline: dict) -> tuple[bool, list[str]]:
        triggers = [
            ("faithfulness", stage_metrics.get("faithfulness", 1) < 0.90),
            ("error_rate", stage_metrics.get("error_rate", 0) > baseline["error_rate"] * 1.5),
            ("latency_p95", stage_metrics.get("latency_p95", 0) > baseline["latency_p95"] * 2),
            ("cost_per_query", stage_metrics.get("cost_per_query", 0) > baseline["cost_per_query"] * 1.2),
            ("hallucination_rate", stage_metrics.get("hallucination_rate", 0) > baseline["hallucination_rate"] * 2),
        ]
        triggered = [name for name, fired in triggers if fired]
        return len(triggered) > 0, triggered
```

### Stage 6: Full Rollout
- Set prompt as active in registry
- Archive previous version as prompt-name/archive/v{previous}
- Trigger cache invalidation for affected prompts
- Send notification with updated prompt, eval results, canary metrics

### Stage 7: Rollback

**Rollback Strategies by Severity:**
```yaml
strategies:
  instant:
    trigger: safety incident (P0)
    action: toggle feature flag to previous prompt version
    time: "<1s"
  quick:
    trigger: quality regression (P1)
    action: traffic rebalance, set previous prompt to 100%
    time: immediate
  standard:
    trigger: non-critical regression (P2+)
    action: git revert prompt commit + deploy reverted version
    time: "~2min"
```

## Integration with Model Registry

Prompts reference models. Model changes can invalidate prompts. Maintain a compatibility matrix:

```yaml
compatibility:
  prompt: qa-v3.0.0
  tested_on: [gpt-4o-mini-2024-07-18, gpt-4o-mini-2025-01-01]
  compatible_with: [gpt-4o-mini-*, gpt-4o-*]
  incompatible_with: [claude-3-haiku]
```

When model version changes (e.g., gpt-4o-mini-2024-07-18 -> 2025-01-01), re-eval all prompt versions compatible with it. Flag any with quality regression.

## Pipeline Metrics

Track pipeline effectiveness:
- Deployment frequency: prompt deploys per week
- Change failure rate: % of deployments that trigger rollback
- Time to detect regression: minutes from canary start to auto-rollback
- Time to rollback: seconds from trigger to traffic rebalance
- Eval pass rate: % of PRs that pass CI eval gates
- False positive rollbacks: canaries rolled back that would have passed

## Key Points
- Prompts require full CI/CD: lint, test, eval, gate, canary, rollout
- Golden dataset eval is the core quality gate in CI
- Eval diff reports compare candidate vs production baseline
- Canary stages: 5% -> 25% -> 50% -> 100% with monitoring at each
- Auto-rollback conditions must be exhaustive and tested
- Rollback strategies by severity: instant (toggle) < quick (rebalance) < standard (git revert)
- Track pipeline metrics (deployment frequency, change failure rate, time to rollback)
- Prompt-model compatibility matrix catches cross-model regressions
