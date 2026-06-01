# Eval Infrastructure & Deployment Patterns

## Overview

Eval infrastructure encompasses the compute, storage, networking, and CI/CD systems that support running evaluations at scale. Unlike development evals (single machine, ad hoc), production eval infrastructure must be reliable, cost-effective, observable, and reproducible.

## Infrastructure Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    Eval Orchestrator                      │
│  (AWS Batch / Kubernetes / Airflow / Prefect)            │
└────────────────────┬────────────────────┬───────────────┘
                     │                    │
          ┌──────────▼──────────┐  ┌──────▼────────────┐
          │   Eval Workers      │  │   LLM Judge API   │
          │  (stateless pods)   │  │   (OpenAI, etc.)  │
          └──────────┬──────────┘  └───────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Results Store     │
          │  (S3 + Time-series) │
          └─────────────────────┘
```

### Deployment Options

| Architecture | Best For | Pros | Cons |
|-------------|----------|------|------|
| **Single machine** | Small team, <1K evals/day | Simple, no orchestration | Not scalable, single point of failure |
| **CI runners** | Medium team, <10K evals/day | Already have CI infra | Runner limits, no GPU support |
| **AWS Batch** | Large team, 10K-100K evals/day | Auto-scaling, cost-effective, managed | AWS lock-in, cold starts |
| **Kubernetes** | Enterprise, 100K+ evals/day | Portability, GPU support, rich ecosystem | Operational complexity |
| **Serverless (Lambda)** | Variable workloads, event-driven | No idle cost, auto-scale | Timeout limits (15min), cold starts |
| **Dedicated eval cluster** | Compliance-sensitive, on-prem | Full control, data stays local | High upfront cost, maintenance |

## Compute Configuration

### Worker Specifications

| Workload Type | CPU | Memory | GPU | Instance Suggestion |
|---------------|-----|--------|-----|-------------------|
| Lightweight (lexical metrics) | 1-2 vCPU | 2-4 GB | None | c6i.large |
| Medium (embedding + LLM API calls) | 2-4 vCPU | 4-8 GB | None | c6i.xlarge |
| Heavy (local model eval) | 8-16 vCPU | 32-64 GB | 1x A10G | g5.xlarge |
| Batch (parallel judge calls) | 4-8 vCPU | 8-16 GB | None | c6i.2xlarge |

### Auto-Scaling Configuration

```yaml
scaling:
  metric: "queue_depth"  # Number of pending eval jobs
  target: 10             # Target items per worker
  min_workers: 0         # Scale to zero when idle
  max_workers: 50        # Cap to control cost
  scale_up:
    cooldown: 60s        # Wait 60s before scaling up again
    increment: 5         # Add 5 workers at a time
  scale_down:
    cooldown: 300s       # Wait 5min before scaling down
    decrement: 3         # Remove 3 workers at a time
```

### Cost Optimization by Instance Type

```python
class EvalComputeOptimizer:
    def __init__(self):
        self.instance_pricing = {
            "c6i.large":   {"hourly": 0.085, "vcpu": 2, "mem_gb": 4},
            "c6i.xlarge":  {"hourly": 0.170, "vcpu": 4, "mem_gb": 8},
            "c6i.2xlarge": {"hourly": 0.340, "vcpu": 8, "mem_gb": 16},
            "g5.xlarge":   {"hourly": 1.006, "vcpu": 4, "mem_gb": 16, "gpu": "A10G"},
        }

    def recommend_instance(self, job_type: str, estimated_duration_min: int) -> str:
        if job_type == "llm_judge_api":
            return "c6i.xlarge"  # Network-bound, moderate CPU
        elif job_type == "local_model":
            return "g5.xlarge"   # GPU required
        elif job_type == "embedding":
            return "c6i.large"   # Lightweight
        else:
            return "c6i.xlarge"  # Default

    def estimate_job_cost(self, instance: str, duration_min: int) -> float:
        pricing = self.instance_pricing[instance]
        hourly = pricing["hourly"]
        return hourly * (duration_min / 60)
```

## Storage Architecture

### Dataset Storage

| Storage Type | Best For | Performance | Cost |
|-------------|----------|-------------|------|
| **Object storage** (S3, GCS) | Large datasets, versioning | 100+ MB/s read | $0.023/GB/month |
| **Local SSD** (NVMe) | Hot datasets, fast access | 1+ GB/s read | Included in instance |
| **EFS / NFS** | Shared datasets across workers | 100 MB/s | $0.08/GB/month |
| **DVC (data version control)** | Git-like dataset versioning | Depends on backend | Free (open source) |

### Result Storage Schema

```
s3://evals-results/{environment}/
  runs/
    {run_id}.json              # Full eval run results
    {run_id}_raw/              # Per-example results (for debugging)
      example_001.json
      example_002.json
  baselines/
    {model_name}.json          # Current baseline metrics
    {model_name}_history.json  # Historical metrics for trend analysis
  reports/
    {date}_nightly.md          # Generated report files
    {pr_number}_pr.md
```

### Result Schema

```json
{
  "run_id": "nightly-2026-03-15-001",
  "timestamp": "2026-03-15T06:00:00Z",
  "model": "llama-3.1-8b-instruct",
  "dataset_version": "3.2.0",
  "pipeline_version": "2.1.0",
  "git_hash": "a1b2c3d4",
  "trigger": "schedule",
  "summary": {
    "faithfulness": {"mean": 0.93, "std": 0.04, "min": 0.72, "max": 1.0, "pass_rate": 0.94},
    "answer_relevance": {"mean": 0.87, "std": 0.06, "min": 0.55, "max": 1.0, "pass_rate": 0.88},
    "context_precision": {"mean": 0.78, "std": 0.09, "min": 0.42, "max": 0.95, "pass_rate": 0.82}
  },
  "pass_rates": {
    "p0_critical": 1.0,
    "p1_important": 0.93,
    "p2_nice_to_have": 0.85
  },
  "cost": {"total_usd": 2.47, "judge_calls": 750, "cache_hits": 320},
  "duration_seconds": 843,
  "regressions": [
    {"metric": "context_precision", "z_score": -2.3, "severity": "warning"}
  ]
}
```

## CI/CD Integration Infrastructure

### GitHub Actions Architecture

```yaml
# .github/workflows/eval.yml
name: LLM Evaluation
on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'evals/**'
      - 'config/**'
  push:
    branches: [main]
    paths:
      - 'evals/**'
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:
    inputs:
      model:
        description: 'Model to evaluate'
        required: false
        default: 'production'
      stage:
        description: 'Eval stage'
        required: false
        default: 'pr'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      change_type: ${{ steps.changes.outputs.type }}
      affected_metrics: ${{ steps.changes.outputs.metrics }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: changes
        run: |
          CHANGED=$(git diff --name-only origin/main...HEAD)
          if echo "$CHANGED" | grep -q "^prompts/"; then
            echo "type=prompt" >> $GITHUB_OUTPUT
          elif echo "$CHANGED" | grep -q "^evals/"; then
            echo "type=eval" >> $GITHUB_OUTPUT
          else
            echo "type=system" >> $GITHUB_OUTPUT
          fi

  pr-eval:
    needs: detect-changes
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Cache LLM judge responses
        uses: actions/cache@v4
        with:
          path: .eval_cache
          key: eval-${{ hashFiles('evals/**', 'prompts/**') }}
          restore-keys: |
            eval-
      - name: Run PR eval
        run: |
          python run_evals.py \
            --stage pr \
            --model ${{ vars.DEFAULT_MODEL }} \
            --change-type ${{ needs.detect-changes.outputs.change_type }}
      - name: Check quality gates
        run: python check_gates.py --results results.json --stage pr
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('eval-report.json'));
            const body = formatEvalReport(report);
            github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body
            });

  nightly-eval:
    needs: detect-changes
    if: github.event_name == 'schedule'
    runs-on: [self-hosted, eval]
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
      - name: Run full eval
        run: |
          python run_evals.py \
            --stage nightly \
            --model ${{ vars.DEFAULT_MODEL }} \
            --dataset full
      - name: Update baselines
        run: python update_baselines.py --results results.json
      - name: Regression check
        run: python check_regression.py --baseline baseline.json --current results.json
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: nightly-results
          path: results/
```

### Self-Hosted Runner Configuration

```yaml
# .github/actions/eval-runner/action.yml
name: 'Eval Runner'
description: 'Run evaluation with proper caching and retry'
inputs:
  stage:
    description: 'Eval stage (pr/staging/nightly)'
    required: true
  model:
    description: 'Model name'
    required: true
  dataset:
    description: 'Dataset path'
    required: false
    default: 'evals/datasets/current.jsonl'
runs:
  using: 'composite'
  steps:
    - name: Restore cache
      uses: actions/cache@v4
      with:
        path: ~/.eval_cache
        key: ${{ inputs.stage }}-${{ hashFiles(inputs.dataset) }}
    - name: Run evaluation
      run: |
        python -m evals.runner \
          --stage ${{ inputs.stage }} \
          --model ${{ inputs.model }} \
          --dataset ${{ inputs.dataset }} \
          --cache-dir ~/.eval_cache \
          --parallel 10
      shell: bash
    - name: Save cache
      if: always()
      uses: actions/cache/save@v4
      with:
        path: ~/.eval_cache
        key: ${{ inputs.stage }}-${{ hashFiles(inputs.dataset) }}
```

## Networking and Security

### Network Architecture

```hcl
# Allow eval workers to reach LLM APIs
resource "aws_security_group" "eval_workers" {
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS to LLM APIs"
  }

  egress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.cache_subnet]
    description = "Redis cache"
  }
}

# Private subnet for dataset storage access
resource "aws_vpc_endpoint" "s3" {
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_id       = var.vpc_id
}
```

### API Key Management

```yaml
secrets:
  llm_providers:
    openai:
      key: ${OPENAI_API_KEY}
      org_id: ${OPENAI_ORG_ID}
      rate_limit: 5000  # RPM
    anthropic:
      key: ${ANTHROPIC_API_KEY}
      rate_limit: 1000

  key_rotation:
    frequency: "90d"
    method: "automated_via_vault"
    grace_period: "24h"  # Old key still valid during rotation
```

## Monitoring and Observability

### Metrics to Track

| Category | Metric | Source | Alert Threshold |
|----------|--------|--------|----------------|
| Pipeline | Job duration | Pipeline runner | >30min (warning), >60min (critical) |
| Pipeline | Job failure rate | Pipeline runner | >1% (warning), >5% (critical) |
| Compute | Worker utilization | CloudWatch/Stackdriver | <20% (waste) or >90% (throttling) |
| Compute | Queue depth | Pipeline orchestrator | >1000 (warning), >5000 (critical) |
| API | LLM API error rate | Eval runner | >1% (warning), >5% (critical) |
| API | LLM API latency P95 | Eval runner | >5s (warning), >10s (critical) |
| API | API cost per day | Cost tracker | >2x daily budget |
| Cache | Cache hit rate | Eval runner | <20% (warning — investigate) |
| Results | Regression count | Regression detector | >0 (critical for p0) |
| Results | Data freshness | Dataset store | >7d since last update (info) |

### Dashboard Layout

```
┌───────────────────────┬───────────────────────┐
│    Pipeline Health    │    Eval Results        │
│  ┌─────┬─────┬─────┐  │  ┌─────┬─────┬─────┐  │
│  │Jobs │Fail │Queue│  │  │Faith│Rel  │Prec │  │
│  │ 142 │  2% │  23 │  │  │0.93 │0.87 │0.78 │  │
│  └─────┴─────┴─────┘  │  └─────┴─────┴─────┘  │
├───────────────────────┼───────────────────────┤
│    Cost Tracking       │    Metric Trends       │
│  ┌─────────────────┐   │  ┌─────────────────┐   │
│  │ Daily: $12.40   │   │  │  Faithfulness   │   │
│  │ Weekly: $84.50  │   │  │  ▁▂▃▄▅▆▇██▇▆▅▄▃▂▁ │   │
│  │ Monthly: $342   │   │  │  Last 30 days   │   │
│  └─────────────────┘   │  └─────────────────┘   │
└───────────────────────┴───────────────────────┘
```

## Reproducibility

### Environment Locking

```yaml
reproducibility:
  packages:
    - pip freeze > requirements-eval.txt
    - conda env export > environment.yml
    - Docker image tag pinned to SHA

  dependencies:
    - Python version: 3.12.2
    - PyTorch version: 2.2.1
    - GPU driver: 550.54.15
    - CUDA: 12.4

  data:
    - Dataset version: git-lfs hash
    - Model version: HuggingFace commit hash
    - Judge config: inline in eval config

  config:
    - Complete eval config stored alongside results
    - Git hash of codebase at eval time
```

### Dockerfile for Eval Runner

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-eval.txt .
RUN pip install --no-cache-dir -r requirements-eval.txt

# Copy eval code
COPY evals/ ./evals/
COPY run_evals.py .

# Non-root user for security
RUN useradd -m -u 1000 evaluser && chown -R evaluser: /app
USER evaluser

ENTRYPOINT ["python", "run_evals.py"]
```

## Disaster Recovery

### Failure Scenarios

| Failure | Impact | Recovery |
|---------|--------|----------|
| LLM API outage | Judge calls fail | Retry with backoff, queue for later, fail gracefully |
| Worker crash | Incomplete batch | Retry batch on new worker (stateless workers) |
| Dataset corruption | Wrong results | Revert to previous dataset version |
| Result store down | Results lost | Buffer results locally, retry upload |
| Cost overrun | Budget exceeded | Hard cap on concurrent workers, kill switch |

### Runbook Template

```markdown
## Eval Pipeline Incident Runbook

### Symptom: All evals failing
1. Check LLM API status page
2. Verify API keys in secrets manager
3. Check worker logs for error patterns
4. If API outage: set pipeline to "pause" mode
5. Resume when API recovers

### Symptom: Regression alerts firing
1. Review eval report for affected metrics
2. Check if dataset or configuration changed
3. Compare against model version history
4. If false positive: adjust thresholds
5. If real regression: rollback change

### Symptom: Eval cost spike
1. Check for runaway parallel workers
2. Verify cache hit rate
3. Look for dataset size changes
4. Set temporary worker limit
5. Investigate per-model cost attribution
```

## Key Points

- Choose infrastructure based on eval volume: single machine (<1K), CI runners (<10K), Batch/K8s (10K+).
- Use auto-scaling with scale-to-zero for cost efficiency.
- Cache LLM judge responses aggressively (expect 30-60% hit rate).
- Store results with full context: dataset version, model version, git hash, and config.
- Implement CI/CD integration with smart change detection to select relevant eval subsets.
- Use self-hosted runners for large-scale evals to avoid CI minute costs.
- Pin all dependencies (Python, CUDA, Docker, model versions) for reproducibility.
- Monitor pipeline health, cost, cache hit rate, and regression count.
- Plan for LLM API outages with retry, queue, and graceful degradation.
- Document incident runbooks for common failure scenarios.
