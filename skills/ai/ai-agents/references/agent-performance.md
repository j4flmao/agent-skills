# Agent Performance Optimization

## Latency Optimization

### Agent Call Latency Breakdown

```
Total Agent Response Time = 
  LLM Inference Time + 
  Tool Execution Time + 
  Context Building Time + 
  Post-Processing Time

Typical breakdown:
- LLM Inference: 60-80% (500ms - 5s per call)
- Tool Execution: 10-30% (50ms - 2s per call)
- Context Building: 5-10% (10ms - 100ms per turn)
- Post-Processing: 5-10% (10ms - 100ms per turn)
```

### LLM Inference Optimization

| Technique | Latency Impact | Quality Impact | Implementation |
|-----------|---------------|----------------|----------------|
| Smaller model for subtasks | -40-60% | Variable | Route simple subtasks to cheaper model |
| Speculative decoding | -20-30% | None | Use draft model + target model |
| Prompt caching | -30-50% (cold start) | None | Cache processed prompts per session |
| Batch tool results | -10-20% | None | Collect multiple tool calls in one LLM call |
| Streaming responses | Perceived faster | None | Stream tokens as they're generated |
| Flash attention | -15-25% | None | Use flash-attention kernels |
| Quantization (INT8/FP8) | -20-40% | Minimal | Use quantized model variants |

### Tool Execution Optimization

```python
class OptimizedToolExecutor:
    def __init__(self):
        self.cache = TTLCache(maxsize=1000, ttl=300)  # 5-min cache
        self.semaphore = asyncio.Semaphore(10)

    async def execute(self, tool_name: str, params: dict) -> dict:
        # Check cache for idempotent tools
        if self._is_cacheable(tool_name):
            cache_key = f"{tool_name}:{hash_params(params)}"
            if cache_key in self.cache:
                return self.cache[cache_key]

        # Rate-limited execution
        async with self.semaphore:
            result = await self._call_tool(tool_name, params)

        # Cache result
        if self._is_cacheable(tool_name):
            self.cache[cache_key] = result

        return result

    def _is_cacheable(self, tool_name: str) -> bool:
        return tool_name in IDEMPOTENT_TOOLS  # Read-only tools
```

### Parallel Tool Execution

When an agent identifies multiple independent tool calls, execute them concurrently:

```python
class ParallelExecutor:
    async def execute_batch(self, tool_calls: list[ToolCall]) -> list[dict]:
        # Group independent calls
        groups = self._group_independent(tool_calls)
        results = {}

        for group in groups:
            batch = [self._execute_single(tc) for tc in group]
            group_results = await asyncio.gather(*batch, return_exceptions=True)
            for tc, result in zip(group, group_results):
                results[tc.call_id] = result

        return results

    def _group_independent(self, calls: list[ToolCall]) -> list[list[ToolCall]]:
        # Simple heuristic: calls to different tools are independent
        # More sophisticated: dependency graph analysis
        groups = []
        seen_tools = set()
        current_group = []

        for call in calls:
            if call.tool_name in seen_tools:
                groups.append(current_group)
                current_group = [call]
                seen_tools = {call.tool_name}
            else:
                current_group.append(call)
                seen_tools.add(call.tool_name)

        if current_group:
            groups.append(current_group)

        return groups
```

## Cost Optimization

### Token Reduction Strategies

| Strategy | Savings | Technique |
|----------|---------|-----------|
| System prompt compression | 20-40% | Remove redundancy, use concise language |
| Conversation windowing | 30-50% | Only include recent N turns + summaries |
| Tool description pruning | 10-20% | Remove rarely-used tools from prompt |
| Result truncation | Variable | Cap tool results at 10K chars |
| Few-shot minimization | 10-30% | 1-2 examples max per scenario |
| Output length control | 10-40% | Set max_tokens appropriately |

### Cost Budgeting

```python
class AgentBudget:
    def __init__(self, max_tokens_per_session=50000, max_cost_per_session=0.50):
        self.max_tokens = max_tokens_per_session
        self.max_cost = max_cost_per_session
        self.tokens_used = 0
        self.cost_incurred = 0.0

    def check(self, estimated_tokens: int) -> bool:
        if self.tokens_used + estimated_tokens > self.max_tokens:
            return False
        if self.cost_incurred + self._estimate_cost(estimated_tokens) > self.max_cost:
            return False
        return True

    def spend(self, tokens: int):
        self.tokens_used += tokens
        self.cost_incurred += self._estimate_cost(tokens)

    def _estimate_cost(self, tokens: int) -> float:
        return tokens * 3e-6  # ~$3/M tokens for typical model

    @property
    def utilization(self) -> float:
        return max(self.tokens_used / self.max_tokens, self.cost_incurred / self.max_cost)
```

### Model Tiering

Route different parts of agent execution to appropriately priced models:

```python
class ModelRouter:
    def __init__(self, models: dict):
        self.models = models  # {"cheap": model, "balanced": model, "powerful": model}

    def select(self, task_type: str, complexity: str) -> str:
        matrix = {
            "planning":     {"low": "balanced",  "medium": "powerful", "high": "powerful"},
            "tool_selection": {"low": "cheap",   "medium": "balanced", "high": "powerful"},
            "summarization": {"low": "cheap",    "medium": "cheap",    "high": "balanced"},
            "code_gen":     {"low": "balanced",  "medium": "powerful", "high": "powerful"},
            "classification": {"low": "cheap",   "medium": "cheap",    "high": "balanced"},
        }
        return self.models[matrix.get(task_type, {}).get(complexity, "balanced")]
```

## Memory Optimization

### Context Window Management

```python
class ContextManager:
    def __init__(self, max_tokens: int = 128000):
        self.max_tokens = max_tokens
        self.current_tokens = 0

    def build_context(self, turns: list[dict], summaries: list[str], entities: dict, semantic: list[dict]) -> list[dict]:
        context = {"system": self._build_system_prompt(), "messages": []}

        # Always include system prompt (counted first)
        remaining = self.max_tokens - count_tokens(context["system"])

        # Prioritize: semantic results > recent turns > summaries > entities
        for item in semantic:
            tokens = count_tokens(item)
            if tokens <= remaining:
                context["messages"].append(item)
                remaining -= tokens
            else:
                break

        for turn in reversed(turns[-10:]):  # Recent 10 turns
            tokens = count_tokens(turn)
            if tokens <= remaining:
                context["messages"].insert(0, turn)  # Maintain order
                remaining -= tokens
            else:
                break

        if summaries and remaining > 500:
            summary_block = {"role": "system", "content": f"Session summaries: {' '.join(summaries[-3:])}"}
            context["messages"].insert(0, summary_block)

        return context["messages"]
```

## Throughput Optimization

### Connection Pooling

```python
class LLMConnectionPool:
    def __init__(self, max_connections=10, provider="anthropic"):
        self.pool = asyncio.Queue(max_connections)
        for _ in range(max_connections):
            self.pool.put_nowait(self._create_client())

    async def acquire(self) -> Client:
        return await self.pool.get()

    async def release(self, client: Client):
        await self.pool.put(client)

    async def execute(self, request: dict) -> dict:
        client = await self.acquire()
        try:
            return await client.messages.create(**request)
        finally:
            await self.release(client)
```

## Key Points

- LLM inference is the dominant cost (60-80% of latency, 80-90% of cost)
- Prompt caching reduces cold-start latency by 30-50%
- Parallel tool execution reduces wall-clock time for independent calls
- Model tiering routes simple tasks to cheaper models for 40-60% cost reduction
- Context window management prioritizes critical content within budget
- Token budgeting per session prevents runaway costs
- Tool result caching with appropriate TTL reduces duplicate execution
- Connection pooling enables high-throughput agent deployments
- Streaming makes agents feel faster even with same total latency
- Always measure before optimizing: profile actual latency/cost breakdown

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

