# Deploying Tree-of-Thoughts Systems

Running ToT search in production: service shape (sync vs async jobs), configuration and prompt versioning, CI evaluation gates, rollout, observability and cost controls.

## Service Shapes

| Shape | Latency budget | Use |
|---|---|---|
| Inline in request (sync) | seconds | Small trees (≤ ~20 calls), interactive features |
| Async job (queue + worker) | minutes | Larger searches, batch problem sets, planning tasks |
| Offline batch (provider batch APIs) | hours | Dataset generation, evaluations, precomputation |

Async job API:

```
POST /v1/tot/jobs        {problem, config_id}            -> 202 {job_id}
GET  /v1/tot/jobs/{id}   -> {status: queued|running|succeeded|failed|budget_exhausted, result?, cost}
```

Workers pull jobs, checkpoint the frontier (see `thought-node-state-management.md`), and enforce per-job limits. Idempotency key on POST prevents duplicate searches on client retries.

## Configuration as Versioned Artifacts

```yaml
# configs/tot/game24-v7.yaml
id: game24-v7
search: beam
depth: 3
breadth: 5
proposals: 8
evaluator:
  type: llm_value
  samples: 3
  threshold: 0.5
models:
  generator: <generator-model-id>
  evaluator: <evaluator-model-id>
prompts:
  propose: prompts/game24/propose@v4
  value: prompts/game24/value@v3
limits:
  max_calls: 60
  max_tokens: 150000
  max_seconds: 90
```

Model IDs are left as fields to fill with pinned, dated model identifiers from your provider; never use floating aliases in production configs because evaluation results would not be reproducible.

Store prompts as files with versions; the config references exact versions. Every result records `config_id`.

## CI Pipeline

| Stage | Check |
|---|---|
| Unit tests | Search logic with mocked generator/evaluator (deterministic) |
| Schema tests | Prompts produce valid structured output on a small fixture set |
| Offline eval | Accuracy, calls, cost, p95 latency on the eval set vs current production config |
| Security tests | Prompt-injection red-team set (see `prompt-injection-security-practices.md`) |
| Gate | Block merge if accuracy drops beyond tolerance or cost rises beyond budget |

```yaml
# .github/workflows/tot-eval.yml (excerpt)
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync --locked
      - run: uv run pytest -q tests/unit
      - run: uv run python -m tot.eval --config configs/tot/game24-v7.yaml --baseline configs/tot/game24-v6.yaml --out eval.json
        env:
          LLM_API_KEY: ${{ secrets.LLM_API_KEY_EVAL }}
      - run: uv run python -m tot.gate eval.json --max-accuracy-drop 0.02 --max-cost-increase 0.10
```

Eval runs cost money: use a representative sample on PRs and the full set nightly or before release.

## Rollout

1. Shadow: run the new config on a copy of live traffic; compare results and cost offline, do not serve them.
2. Canary: serve to a small percentage, monitor quality signals and cost.
3. Full rollout with the previous config kept for instant rollback (config switch, no redeploy).

Feature flags select `config_id` per tenant or request class.

## Observability

Per job/request:
- Calls, tokens (input/output), cost, latency per level and total.
- Nodes generated, pruned (by rule), expanded; depth reached; termination reason.
- Solution validated by checker (yes/no) and evaluator score of the returned answer.

Per provider call: model, prompt version, latency, status, retries (OpenTelemetry GenAI span attributes or your tracing tool).

Alerts: cost per job above budget, budget-exhausted rate rising, provider error rate, p95 latency regression.

## Cost Controls

- Hard per-job limits enforced in the worker (calls, tokens, wall time).
- Per-tenant daily spend caps and rate limits.
- Cache evaluation results; batch evaluations per level.
- Degrade gracefully: under load, switch to a cheaper config (smaller beam) or to single-call reasoning, flagged in the response.

## Reliability

- Provider failover only to models validated with the same config on the eval set.
- Timeouts per call shorter than the job's remaining wall time.
- Checkpointed frontiers allow worker restarts without losing progress or budget accounting.

## Pitfalls
- Shipping prompt edits without re-running evaluation.
- Floating model aliases changing behavior silently.
- Sync ToT in request paths with unbounded depth.
- No per-tenant cost attribution.

## Checklist
- [ ] Service shape matches latency budget; async for large searches
- [ ] Configs and prompts versioned; results tagged with config ID
- [ ] CI eval gate on accuracy and cost; security tests included
- [ ] Shadow and canary rollout with config-switch rollback
- [ ] Per-job metrics, traces and cost alerts
- [ ] Hard limits and tenant spend caps
