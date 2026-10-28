# Agent Performance Profiling

Profiling an agent system means finding where time, tokens and compute go across three layers: the orchestration process (Python/Node code), external calls (models, tools, retrieval), and, if self-hosted, the model serving stack. This reference covers profiling tools per layer, benchmark harnesses, and reading the results. Latency optimization tactics are in `latency-analysis-optimization.md`; cost in `cost-tracking-optimization.md`.

## Layers and Tools

| Layer | Question | Tools |
|-------|----------|-------|
| End-to-end | Which steps dominate a run? | Distributed traces (OpenTelemetry, Langfuse, Phoenix, LangSmith) |
| Orchestrator CPU | Is our code slow (parsing, serialization, prompt building)? | py-spy, Scalene, cProfile; Node `--cpu-prof`, clinic.js |
| Async/event loop | Are we blocking the loop? | asyncio debug mode, `loop.slow_callback_duration`; Node `perf_hooks.monitorEventLoopDelay` |
| Memory | Do long sessions leak? | tracemalloc, memray; Node heap snapshots |
| Network | Connection reuse, DNS, TLS overhead | HTTP client metrics, OTel HTTP spans |
| Self-hosted model serving | Throughput, batching, KV-cache pressure | vLLM/SGLang metrics endpoints, Nsight Systems, `nvidia-smi dmon` |

## Instrumenting Runs for Profiling

Every span should carry: span kind (model, tool, retrieval, orchestration), name, duration, token counts, payload sizes, cache hits, retries. Payload size matters: large tool results inflate the next prompt and slow everything downstream.

```python
import json
from opentelemetry import trace
tracer = trace.get_tracer("agent")

async def call_tool(name: str, args: dict) -> dict:
    with tracer.start_as_current_span(f"execute_tool {name}") as span:
        span.set_attribute("gen_ai.operation.name", "execute_tool")
        span.set_attribute("gen_ai.tool.name", name)
        result = await TOOLS[name](**args)
        span.set_attribute("app.tool.result_bytes", len(json.dumps(result)))
        return result
```

## Orchestrator CPU Profiling

```bash
# Sample a running Python agent service without restarting it
py-spy record -o profile.svg --pid <PID> --duration 60
py-spy top --pid <PID>

# Line-level CPU + memory for a benchmark script
scalene --cli --reduced-profile run_benchmark.py

# Node.js
node --cpu-prof --cpu-prof-dir=./prof dist/agent.js
```

Common hotspots:
- Re-tokenizing or re-rendering full prompts each step.
- JSON schema validation of large tool outputs on every call.
- Synchronous logging of full prompts.
- Deep-copying conversation history.
- Regex-heavy output parsing.

## Event Loop Blocking

```python
import asyncio, logging
logging.basicConfig(level=logging.DEBUG)
loop = asyncio.get_running_loop()
loop.set_debug(True)
loop.slow_callback_duration = 0.05   # log callbacks blocking > 50 ms
```

Move CPU-bound work (PDF parsing, embeddings on CPU, large JSON) to worker threads/processes (`asyncio.to_thread`, process pools) or separate services.

## Memory Profiling for Long Sessions

- Conversation state growth: measure bytes of history per turn; enforce trimming/summarization.
- Leaks: caches without bounds, per-session objects kept in global maps.

```bash
memray run -o agent.bin run_long_session.py
memray flamegraph agent.bin
```

## Benchmark Harness

Profile with a fixed, representative task set rather than ad hoc requests.

| Component | Purpose |
|-----------|---------|
| Task set | Real anonymized tasks with expected outcomes |
| Fixed configuration | Model versions, temperature, tool backends (or recorded tool responses) |
| Repetitions | Multiple runs per task to capture variance |
| Outputs | Per-task success, steps, tokens, cost, duration, per-span breakdown |

Recorded tool responses (replay mode) isolate model/orchestrator performance from flaky external services; run a smaller live-tool suite separately.

Report per agent version: success rate, median and p95 duration, median steps, tokens and cost per successful task. Compare against the previous version before release.

## Self-Hosted Model Serving

| Metric | Meaning | Action when bad |
|--------|---------|-----------------|
| TTFT under load | Queueing + prefill | Scale replicas, enable prefix caching, chunked prefill |
| Tokens/s per request and aggregate | Decode throughput | Tune batch size/concurrency, quantization, speculative decoding |
| KV cache utilization | Memory pressure | Reduce max context, increase GPU memory fraction, more replicas |
| Request queue length | Saturation | Autoscale on queue depth |
| GPU utilization / SM occupancy | Hardware efficiency | Profile kernels with Nsight Systems |

vLLM and SGLang expose Prometheus metrics (queue size, cache usage, TTFT histograms). Load-test with realistic prompt/output length distributions; short synthetic prompts overstate throughput.

## Reading Profiles: Decision Table

| Finding | Interpretation | Next step |
|---------|----------------|-----------|
| Model spans > 80% of run time | Model-bound | Fewer/shorter calls, smaller model for some steps, caching |
| Tool spans dominate | Tool-bound | Parallelize, cache, optimize backends |
| Gaps between spans | Orchestrator overhead | CPU profile the orchestrator |
| Rising duration per step within a run | Context growth | Trim/summarize context |
| High variance across repetitions | Nondeterministic paths or provider variance | More repetitions, analyze distributions |

## Checklist

- [ ] Spans carry kind, tokens, payload sizes and cache info
- [ ] Orchestrator CPU and event-loop blocking profiled under load
- [ ] Memory growth per session measured and bounded
- [ ] Benchmark harness with fixed tasks, repetitions and replay mode
- [ ] Per-version performance report gates releases
- [ ] Serving metrics and realistic load tests for self-hosted models
