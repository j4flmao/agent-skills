# LLM Agent Cost Tracking and Optimization

Agents multiply LLM cost: one user request can trigger many model calls, retries, tool loops and sub-agents. This reference covers attributing cost per request, user, tenant and feature; recording token usage with OpenTelemetry GenAI conventions; budgets and alerts; and the optimizations that reliably reduce spend.

## What to Record per Model Call

| Field | Source | OTel GenAI attribute |
|-------|--------|---------------------|
| Provider, model (requested and actual) | Request/response | `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model` |
| Input tokens | Response usage | `gen_ai.usage.input_tokens` |
| Output tokens | Response usage | `gen_ai.usage.output_tokens` |
| Cached input tokens (read / write) | Provider-specific usage fields | Custom attribute until standardized (e.g. `app.usage.cache_read_tokens`) |
| Operation | chat, embeddings, tool execution | `gen_ai.operation.name` |
| Agent / step | Your orchestrator | `gen_ai.agent.name`, custom `app.agent.step` |
| Tenant, user (pseudonymous), feature | Request context | Custom attributes; never raw PII |

Earlier semantic-convention versions used `gen_ai.system` instead of `gen_ai.provider.name`; pin the semconv version your collector and dashboards expect.

Always read token counts from the provider's response, not from a local tokenizer estimate; providers count tool definitions, system prompts and images in ways local counts miss.

## Computing Cost

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True, slots=True)
class Price:
    input_per_mtok: Decimal
    output_per_mtok: Decimal
    cache_read_per_mtok: Decimal
    cache_write_per_mtok: Decimal

def call_cost(p: Price, inp: int, out: int, cache_read: int = 0, cache_write: int = 0) -> Decimal:
    m = Decimal(1_000_000)
    return (
        Decimal(inp) * p.input_per_mtok
        + Decimal(out) * p.output_per_mtok
        + Decimal(cache_read) * p.cache_read_per_mtok
        + Decimal(cache_write) * p.cache_write_per_mtok
    ) / m
```

- Keep prices in a versioned config table (model, effective date, currency), loaded at runtime; providers change prices and add tiers (batch discounts, long-context pricing, priority tiers).
- Check whether the provider reports `input_tokens` inclusive or exclusive of cached tokens; formulas differ by provider.
- Compute cost in the pipeline (collector processor or warehouse job) rather than in every service, so price changes apply consistently.

## Attribution Model

```
trace (user request)
 └─ invoke_agent planner        cost = sum(children)
     ├─ chat model-a            $0.0042
     ├─ execute_tool search     (tool cost: API fees, compute)
     ├─ invoke_agent researcher
     │   ├─ chat model-b        $0.0110
     │   └─ chat model-b        $0.0094
     └─ chat model-a            $0.0031
```

Roll up by trace for per-request cost, then aggregate by tenant, feature and agent version. Include non-LLM tool costs (search APIs, code sandboxes) to get true cost per task.

## Metrics and Dashboards

| Metric | Type | Use |
|--------|------|-----|
| `gen_ai.client.token.usage` | Histogram (by `gen_ai.token.type` = input/output) | Token distributions per model/operation |
| Cost per request / per successful task | Derived | Unit economics |
| Cost per tenant per day | Derived | Billing, abuse detection |
| Calls per request (loop length) | Histogram | Detect runaway loops |
| Cache hit ratio (cached input / total input) | Derived | Prompt caching effectiveness |
| Retry rate | Counter | Hidden cost from failures |

"Cost per successful task" matters more than cost per call: a cheaper model that fails more often may cost more overall.

## Budgets and Guardrails

- **Per-request budget**: maximum tokens or cost per agent run; stop and return a partial result when exceeded.
- **Loop bounds**: max steps and max tool calls per run.
- **Per-tenant quotas**: daily/monthly spend caps with soft (alert) and hard (block or degrade) thresholds.
- **Anomaly alerts**: spend per tenant/feature compared against its own baseline (see `anomaly-detection-agents.md`).

```python
class BudgetExceeded(Exception):
    pass

class RunBudget:
    def __init__(self, max_cost: Decimal, max_steps: int) -> None:
        self.max_cost, self.max_steps = max_cost, max_steps
        self.cost, self.steps = Decimal(0), 0

    def charge(self, cost: Decimal) -> None:
        self.cost += cost
        self.steps += 1
        if self.cost > self.max_cost or self.steps > self.max_steps:
            raise BudgetExceeded(f"run exceeded budget: cost={self.cost} steps={self.steps}")
```

## Optimization Levers (in typical order of payoff)

| Lever | Mechanism | Watch out for |
|-------|-----------|---------------|
| Prompt caching | Stable prefix (system prompt, tools, documents) reused across calls at reduced input price | Put volatile content after the cached prefix; cache entries expire |
| Model routing | Small model for classification/extraction, large model for hard reasoning | Measure quality per route with evals |
| Context trimming | Summarize or drop old turns, retrieve fewer, better chunks | Quality regressions on long tasks |
| Output limits | `max_tokens`, concise output instructions, structured outputs | Truncated answers |
| Batch APIs | Asynchronous batch endpoints at discounted rates for offline jobs | Latency of hours |
| Fewer tool round trips | Parallel tool calls, better tool descriptions, combined tools | Tool overload reduces accuracy |
| Semantic/result caching | Reuse answers for identical or near-identical requests | Stale or cross-tenant leakage; key caches by tenant |
| Early stopping | Stop when goal satisfied; avoid redundant verification loops | Missed checks |

Validate every optimization with an offline eval set before and after; track cost and quality together.

## Reporting

- Daily cost report by model, feature, tenant; week-over-week deltas.
- Per-release comparison: agent version N vs N-1 cost per successful task.
- Top-N most expensive traces with links for inspection.

## Pitfalls

- Estimating tokens locally instead of using provider usage data.
- Ignoring retries and failed calls in cost totals.
- Hardcoding prices in application code.
- Optimizing cost per call while cost per successful task rises.
- Logging prompts with PII into cost analytics stores.

## Checklist

- [ ] Every model call records provider, model, input/output/cached tokens and context attributes
- [ ] Prices versioned in config; cost computed centrally
- [ ] Per-run step and cost budgets enforced
- [ ] Tenant quotas with alerts
- [ ] Cost per successful task tracked per agent version
- [ ] Optimizations validated with evals
