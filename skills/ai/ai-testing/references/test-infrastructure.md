# Test Infrastructure for LLM Testing

## Architecture Overview

LLM testing infrastructure differs from traditional CI infrastructure:

| Dimension | Traditional CI | LLM Testing CI |
|-----------|---------------|----------------|
| Test execution | Stateless, fast (ms) | Stateful, slow (1-30s per call) |
| Dependencies | Local packages | Remote model APIs + GPU |
| Cost per run | ~$0.001 (compute) | ~$0.01-$5.00 (API tokens) |
| Variance | Deterministic | Non-deterministic, needs retries |
| GPU requirement | Rare | Common for local models |
| Cacheability | High (code rarely changes) | Low (model output varies) |
| Parallelism | Easy (stateless) | Complex (rate limits, cost) |

## Test Pipeline Architecture

### Pipeline Stages

```
Source Change (PR/push)
    │
    ▼
┌─────────────────────────────────────┐
│ Stage 1: Fast Validation           │
│ ─────────────────────────────────   │
│ • 10-50 critical tests             │
│ • temperature=0.0                  │
│ • ~2 min, ~$0.05                   │
│ • Gate: all P0 must pass           │
└─────────────────────────────────────┘
    │ pass
    ▼
┌─────────────────────────────────────┐
│ Stage 2: Full Test Suite           │
│ ─────────────────────────────────   │
│ • 200-1000 tests                   │
│ • Multiple temperatures            │
│ • ~10 min, ~$1.00                  │
│ • Gate: P0=100%, P1≥90%           │
└─────────────────────────────────────┘
    │ pass
    ▼
┌─────────────────────────────────────┐
│ Stage 3: Model Comparison          │
│ ─────────────────────────────────   │
│ • Candidate vs baseline side-by-side│
│ • 500+ samples                     │
│ • ~15 min, ~$2.50                  │
│ • Gate: no regression >5%          │
└─────────────────────────────────────┘
    │ pass
    ▼
┌─────────────────────────────────────┐
│ Stage 4: Deploy + Shadow Eval      │
│ ─────────────────────────────────   │
│ • Deploy to staging                │
│ • 5% shadow traffic for 24h        │
│ • Monitor: latency, safety, quality│
│ • Auto-rollback on drift           │
└─────────────────────────────────────┘
```

### Parallel Test Execution

```python
import asyncio
from typing import Callable, Any
from dataclasses import dataclass, field
import time

@dataclass
class TestConfig:
    name: str
    model_fn: Callable
    assertions: list
    input_data: dict
    priority: str = "P1"
    temperature: float = 0.0
    n_samples: int = 1
    timeout_s: int = 30
    retries: int = 2

@dataclass
class TestResult:
    name: str
    passed: bool
    score: float
    latency_ms: float
    token_usage: dict
    error: str | None = None
    details: dict = field(default_factory=dict)

class ParallelTestExecutor:
    def __init__(self, max_concurrent: int = 10, rate_limit_rps: float = 50):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.rate_limiter = RateLimiter(rps=rate_limit_rps)

    async def execute_batch(self, tests: list[TestConfig]) -> list[TestResult]:
        """Execute tests in parallel with concurrency and rate limiting."""
        async def run_one(test: TestConfig) -> TestResult:
            async with self.semaphore:
                await self.rate_limiter.wait()
                return await self._execute_with_retry(test)

        tasks = [run_one(t) for t in tests]
        return await asyncio.gather(*tasks, return_exceptions=True)

    async def _execute_with_retry(self, test: TestConfig) -> TestResult:
        last_error = None
        for attempt in range(test.retries + 1):
            try:
                start = time.monotonic()
                output = await asyncio.wait_for(
                    test.model_fn(test.input_data),
                    timeout=test.timeout_s,
                )
                elapsed_ms = (time.monotonic() - start) * 1000

                results = []
                for assertion in test.assertions:
                    result = await assertion.evaluate(
                        output=output,
                        expected=test.input_data.get("expected"),
                        context=test.input_data.get("context"),
                    )
                    results.append(result)

                all_passed = all(r.passed for r in results)
                avg_score = sum(r.score for r in results) / len(results) if results else 0

                return TestResult(
                    name=test.name,
                    passed=all_passed,
                    score=avg_score,
                    latency_ms=elapsed_ms,
                    token_usage=self._count_tokens(output),
                    details={"assertion_results": [r.__dict__ for r in results]},
                )

            except (asyncio.TimeoutError, RateLimitError, APIError) as e:
                last_error = str(e)
                if attempt < test.retries:
                    await asyncio.sleep(2 ** attempt)  # exponential backoff
                continue

        return TestResult(
            name=test.name,
            passed=False,
            score=0.0,
            latency_ms=0,
            token_usage={},
            error=last_error,
        )

    def _count_tokens(self, output: str) -> dict:
        return {
            "output_tokens": len(output.split()),
            "characters": len(output),
        }

class RateLimiter:
    def __init__(self, rps: float):
        self.rps = rps
        self.min_interval = 1.0 / rps
        self.last_request = 0.0
        self._lock = asyncio.Lock()

    async def wait(self):
        async with self._lock:
            now = time.monotonic()
            wait_time = self.min_interval - (now - self.last_request)
            if wait_time > 0:
                await asyncio.sleep(wait_time)
            self.last_request = time.monotonic()
```

## Test Result Aggregation

### Aggregation Service

```python
from collections import defaultdict
import statistics

class ResultAggregator:
    def aggregate_results(self, results: list[TestResult]) -> dict:
        by_priority = defaultdict(list)
        by_category = defaultdict(list)

        for r in results:
            pri = r.details.get("assertion_results", [{}])[0].get("priority", "P1")\
                  if r.details else "P1"
            cat = r.details.get("category", "unknown") if r.details else "unknown"
            by_priority[pri].append(r)
            by_category[cat].append(r)

        def compute_stats(group: list[TestResult]) -> dict:
            total = len(group)
            passed = sum(1 for r in group if r.passed)
            latencies = [r.latency_ms for r in group if r.latency_ms > 0]
            return {
                "total": total,
                "passed": passed,
                "failed": total - passed,
                "pass_rate": passed / total if total > 0 else 1.0,
                "avg_latency_ms": statistics.mean(latencies) if latencies else 0,
                "p95_latency_ms": sorted(latencies)[int(len(latencies) * 0.95)] if len(latencies) > 1 else 0,
                "total_cost": sum(
                    r.token_usage.get("output_tokens", 0) * 0.00003
                    for r in group
                ),
            }

        return {
            "overall": compute_stats(results),
            "by_priority": {k: compute_stats(v) for k, v in by_priority.items()},
            "by_category": {k: compute_stats(v) for k, v in by_category.items()},
            "failures": [
                {"name": r.name, "error": r.error, "score": r.score}
                for r in results if not r.passed
            ],
            "timestamp": datetime.utcnow().isoformat(),
        }
```

## CI Integration Patterns

### GitHub Actions with Matrix Strategy

```yaml
name: LLM Test Suite
on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'models/**'
      - 'tests/llm/**'
      - 'golden_datasets/**'

env:
  TEST_BUDGET_USD: 0.50  # Fail-fast if PR exceeds budget
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      prompt_changed: ${{ steps.changes.outputs.prompts }}
      model_changed: ${{ steps.changes.outputs.models }}
      dataset_changed: ${{ steps.changes.outputs.datasets }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - id: changes
        run: |
          echo "prompts=$(git diff --name-only HEAD~1 | grep -c 'prompts/')" >> $GITHUB_OUTPUT
          echo "models=$(git diff --name-only HEAD~1 | grep -c 'models/')" >> $GITHUB_OUTPUT
          echo "datasets=$(git diff --name-only HEAD~1 | grep -c 'golden_datasets/')" >> $GITHUB_OUTPUT

  fast-gate:
    needs: detect-changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run fast validation (P0 only)
        run: |
          pytest tests/llm/fast/ -v --junitxml=fast-results.xml \
            -k "P0" --durations=10
      - name: Quality gate
        run: |
          python scripts/check_gates.py \
            --results fast-results.xml \
            --p0-required 1.0
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: fast-results
          path: fast-results.xml

  full-suite:
    needs: fast-gate
    if: always()
    runs-on: [self-hosted, llm-runner]
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # Split tests across 4 runners
    steps:
      - uses: actions/checkout@v4
      - name: Run full suite (shard ${{ matrix.shard }})
        run: |
          pytest tests/llm/full/ -v --junitxml=full-results-${{ matrix.shard }}.xml \
            --splits 4 --group ${{ matrix.shard }} \
            --durations=20
      - name: Upload shard results
        uses: actions/upload-artifact@v4
        with:
          name: full-results-${{ matrix.shard }}
          path: full-results-${{ matrix.shard }}.xml

  aggregate:
    needs: full-suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          pattern: full-results-*
      - name: Aggregate results
        run: |
          python scripts/aggregate_results.py \
            --inputs full-results-*/full-results-*.xml \
            --output aggregated-report.json \
            --cost-tracking cost-log.json
      - name: Quality gate
        run: |
          python scripts/check_gates.py \
            --results aggregated-report.json \
            --p0-required 1.0 \
            --p1-required 0.9
      - name: Comment PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: llm-test-results
          path: aggregated-report.md
```

## Test Environment Management

### Environment Types

| Environment | Purpose | Model | Dataset | Budget/Day |
|-------------|---------|-------|---------|------------|
| PR Check | Per-PR validation | Fast, cheap model (gpt-4o-mini) | 50 P0 tests | $0.50 |
| Staging | Pre-release validation | Production model (gpt-4o) | Full golden | $5.00 |
| Canary | Live traffic testing | Candidate model | Sampled production | $10.00 |
| Nightly | Deep evaluation | Multiple models | Full + extra | $20.00 |
| Weekly | Comprehensive audit | All candidate models | All datasets | $50.00 |

### Configuration Pattern

```python
@dataclass
class TestEnvironment:
    name: str
    model_config: dict
    dataset_config: dict
    budget_limit_usd: float
    parallel_workers: int
    retry_policy: dict
    notification_channels: list[str]

ENVIRONMENTS = {
    "pr_check": TestEnvironment(
        name="PR Check",
        model_config={"name": "gpt-4o-mini", "temperature": 0.0},
        dataset_config={"version": "golden-v3", "max_tests": 50, "priority_filter": ["P0"]},
        budget_limit_usd=0.50,
        parallel_workers=5,
        retry_policy={"max_retries": 2, "backoff": "exponential"},
        notification_channels=["pr_comment"],
    ),
    "staging": TestEnvironment(
        name="Staging",
        model_config={"name": "gpt-4o", "temperature": 0.0},
        dataset_config={"version": "golden-v3", "max_tests": 500, "priority_filter": ["P0", "P1"]},
        budget_limit_usd=5.00,
        parallel_workers=20,
        retry_policy={"max_retries": 3, "backoff": "exponential"},
        notification_channels=["slack", "email"],
    ),
}
```

## Cost Tracking and Budget Management

### Cost Logging

```python
class CostTracker:
    def __init__(self, budget_file: str = "test-budget.json"):
        self.budget_file = budget_file
        self.current_budget = self._load_budget()

    def _load_budget(self) -> dict:
        import json
        try:
            with open(self.budget_file) as f:
                return json.load(f)
        except FileNotFoundError:
            return {"daily_spend": 0.0, "monthly_spend": 0.0, "runs": []}

    def record_run(self, env_name: str, n_tests: int, model: str,
                    total_tokens: int, cost: float, passed: bool):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "environment": env_name,
            "tests": n_tests,
            "model": model,
            "total_tokens": total_tokens,
            "cost": cost,
            "passed": passed,
        }
        self.current_budget["runs"].append(entry)
        self.current_budget["daily_spend"] += cost
        self.current_budget["monthly_spend"] += cost
        self._save_budget()

        # Alert if approaching budget limits
        daily_limit = 10.0
        monthly_limit = 200.0
        if self.current_budget["daily_spend"] > daily_limit * 0.9:
            logger.warning(f"Daily budget at {self.current_budget['daily_spend']:.2f}/{daily_limit:.2f}")
        if self.current_budget["monthly_spend"] > monthly_limit * 0.9:
            logger.warning(f"Monthly budget at {self.current_budget['monthly_spend']:.2f}/{monthly_limit:.2f}")

    def cost_per_pipeline(self) -> dict:
        pipelines = defaultdict(float)
        for run in self.current_budget["runs"]:
            pipelines[run["environment"]] += run["cost"]
        return dict(pipelines)

    def cost_per_regression_caught(self) -> float:
        failed_runs = [r for r in self.current_budget["runs"] if not r["passed"]]
        if not failed_runs:
            return float("inf")
        total_cost = sum(r["cost"] for r in failed_runs)
        return total_cost / len(failed_runs)
```

## Cache Layer for Test Results

```python
class TestResultCache:
    def __init__(self, cache_ttl_hours: int = 24):
        self.cache: dict[str, dict] = {}
        self.ttl = timedelta(hours=cache_ttl_hours)

    def make_key(self, model_name: str, prompt: str, temperature: float) -> str:
        import hashlib
        raw = f"{model_name}:{prompt}:{temperature}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, model_name: str, prompt: str, temperature: float) -> dict | None:
        key = self.make_key(model_name, prompt, temperature)
        entry = self.cache.get(key)
        if entry and datetime.utcnow() - entry["cached_at"] < self.ttl:
            return entry["result"]
        return None

    def set(self, model_name: str, prompt: str, temperature: float, result: dict):
        key = self.make_key(model_name, prompt, temperature)
        self.cache[key] = {
            "result": result,
            "cached_at": datetime.utcnow(),
        }

    def invalidate_model(self, model_name: str):
        """Invalidate cache entries for a specific model version."""
        keys_to_delete = []
        for key, entry in self.cache.items():
            # Key embeds model_name in the hash, so we need result-level check
            pass  # In practice, store model_name in entry metadata
        for k in keys_to_delete:
            del self.cache[k]
```

## Key Points
- LLM test infrastructure must handle non-determinism, rate limits, and API costs
- Use staged pipelines: fast validation → full suite → model comparison → shadow eval
- Parallel execution requires semaphore-based concurrency control and rate limiting
- Shard test suites across multiple CI runners for sub-10-min full suite times
- Aggregate results across shards before running quality gates
- Track costs per test run, per pipeline, and per regression caught
- Cache identical model+prompt+temperature combinations to reduce redundant API calls
- Use environment-aware configs: different models, datasets, and budgets per stage
- Implement retry with exponential backoff for transient API failures
- Detect change scope (prompts vs models vs datasets) to select appropriate test suite
- Alert on budget thresholds to prevent surprise overruns
- Store test results for trend analysis and regression tracking over time
- Use matrix strategies and test splitting for parallel execution in CI
- Budget tracking enables data-driven decisions about test suite optimization
