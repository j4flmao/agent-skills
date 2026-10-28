# Agent Latency Analysis and Optimization

Agent latency is the sum of sequential model calls, tool executions, retrieval and orchestration overhead. Users experience time to first visible progress and total task time; both need measurement and different fixes. This reference covers latency metrics, trace-based critical-path analysis and the optimizations that work for agent workloads.

## Latency Metrics

| Metric | Definition | Why it matters |
|--------|------------|----------------|
| Time to first token (TTFT) | Request sent to first streamed token | Perceived responsiveness of chat |
| Time per output token (TPOT) / output tokens per second | Generation speed after first token | Long answers |
| Model call duration | Full call | Sum along the critical path |
| Tool duration | Each tool execution | Often dominates (search, DB, browser) |
| Time to first progress event | Request to first user-visible update (plan, status, partial) | Agents doing multi-step work |
| End-to-end task time | Request to final answer | SLO for task completion |
| Steps per task | Number of model calls/tool calls | Driver of total latency |

OTel GenAI metrics: `gen_ai.client.operation.duration` (histogram) and, for streaming, server-side `gen_ai.server.time_to_first_token` / `gen_ai.server.time_per_output_token` when exposed by the serving layer. Record your own client-side TTFT as a histogram too.

Report percentiles (p50, p90, p99), not averages; agent latency distributions are long-tailed.

## Critical Path Analysis From Traces

```
invoke_agent (12.4 s)
├─ chat plan            2.1 s
├─ execute_tool search  3.8 s   <- critical
├─ execute_tool fetch   1.2 s   (parallel with search)
├─ chat synthesize      4.9 s   <- critical (1,800 output tokens)
└─ chat verify          1.4 s
```

Process:
1. Pick slow traces (p95+) and compute the critical path: the chain of spans that determines end-to-end time.
2. Classify time: model (TTFT vs generation), tools, retrieval, queueing/rate-limit waits, orchestration gaps (time between spans).
3. Aggregate across many traces: which span names contribute most to p95?

Gaps between spans often reveal hidden work (serialization, synchronous logging, cold starts).

## Where Time Goes and Fixes

| Source | Symptom | Fix |
|--------|---------|-----|
| Sequential tool calls | Tool spans back to back | Parallel tool calls; `asyncio.gather` / concurrent execution of independent tools |
| Too many steps | Long chains of small calls | Better instructions and tool design, plan-then-execute, combine tools |
| Long outputs | Generation time dominates | Constrain output, structured outputs, summarise for user then expand on demand |
| Large prompts | High TTFT | Prompt caching of stable prefix; smaller context; retrieval of fewer chunks |
| Big model for easy steps | Slow routing/classification | Smaller/faster model for simple steps |
| Slow tools | Search/browser/DB latency | Timeouts, caching, pagination, faster backends |
| Rate limits (429) | Retry waits | Client-side rate limiting, provisioned throughput/priority tiers, spread load across deployments |
| Cold starts | First-request spikes | Warm pools for sandboxes/functions |
| Verification loops | Extra calls at the end | Verify only when risk warrants; cheaper verifier model |

## Streaming and Progressive UX

- Stream tokens to the user for final answers.
- Emit progress events for long agent runs (plan, current step, tool being used) so time to first progress is low even when total time is high.
- Show partial results (first sources found) as they arrive.

## Parallelism Pattern

```python
import asyncio

async def run_tools(calls: list[ToolCall], timeout_s: float = 20.0) -> list[ToolResult]:
    async def one(call: ToolCall) -> ToolResult:
        try:
            return await asyncio.wait_for(execute_tool(call), timeout=timeout_s)
        except asyncio.TimeoutError:
            logger.warning("tool timed out", extra={"tool": call.name, "timeout_s": timeout_s})
            return ToolResult.error(call, "timeout")
    return await asyncio.gather(*(one(c) for c in calls))
```

Return timeouts as tool errors so the model can recover instead of the whole run failing.

## Timeouts and Deadlines

- Every model and tool call has a timeout; the agent run has an overall deadline.
- Propagate the remaining deadline to sub-agents and tools so inner calls finish before the outer deadline.
- On deadline, return the best partial result with a clear status.

## Speculative and Precomputed Work

- Start retrieval or warm-up calls in parallel with the planning call when the next step is predictable.
- Precompute embeddings and summaries offline.
- Cache tool results for idempotent lookups with short TTLs.

## Latency Budgets

| Workload | Example budget split |
|----------|----------------------|
| Chat answer with retrieval | Retrieval + rerank, TTFT, streaming generation |
| Multi-step research agent | First progress event quickly; total task time measured in minutes; per-step budgets |

Define budgets per step type, alert when a step's p95 exceeds its budget, and fail CI performance tests when a new agent version regresses p95 task time on a benchmark set.

## Measurement Hygiene

- Use monotonic clocks for durations.
- Separate client-side network time from provider processing when possible.
- Tag spans with model version, region/deployment and agent version for comparisons.
- Benchmark with realistic prompts and tool behaviour; synthetic short prompts underestimate latency.

## Checklist

- [ ] TTFT, call duration, tool duration and end-to-end time recorded as histograms
- [ ] Critical-path analysis on p95 traces
- [ ] Independent tool calls executed in parallel with timeouts
- [ ] Streaming and progress events for long runs
- [ ] Deadlines propagated; partial results on timeout
- [ ] Latency regressions checked per agent version on a benchmark set
