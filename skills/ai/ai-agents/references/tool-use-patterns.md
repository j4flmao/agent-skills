# Tool-Use Patterns

## Tool Schema Design

### Parameter Guidelines
- Name: snake_case, unique, describes action
- Description: include when to use AND when NOT to use
- Required params: minimum viable set
- Enums: exhaustive with descriptions

### Schema Template
```json
{
  "name": "search_knowledge_base",
  "description": "Search documents. Use for factual queries. Do NOT use for general chat.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string", "description": "Search terms (2-5 keywords)"},
      "top_k": {"type": "integer", "description": "Results to return", "default": 5},
      "filter": {"type": "string", "enum": ["all", "docs", "code"], "default": "all"}
    },
    "required": ["query"]
  }
}
```

## Parallel Tool Execution

Execute independent tools concurrently to reduce latency.

```python
import asyncio

async def parallel_tool_call(tools, shared_context):
    tasks = {}
    for tool_name, params in tools.items():
        if not depends_on(tool_name, shared_context):
            tasks[tool_name] = asyncio.create_task(execute(tool_name, params))

    results = {}
    for name, task in tasks.items():
        results[name] = await task

    return results
```

### Dependency Graph
```
                    ┌──────────┐
                    │  Search  │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌──────┐ ┌──────────┐
        │ Read Doc │ │Fetch │ │Get Author│
        └──────────┘ │Meta  │ └──────────┘
                     └──────┘
```

Dependent tool calls wait for their prerequisites, independent calls execute in parallel.

## Sequential Tool Chaining

### Pattern
```
Tool A → Parse(A) → Tool B(A_result) → Parse(B) → Tool C(B_result) → Final
```

### Router Pattern
```python
def route_tool_call(response):
    if response.get("requires_search"):
        return "search", response["search_query"]
    elif response.get("requires_code"):
        return "execute_code", response["code"]
    return "final_answer", response["content"]
```

## Tool Output Handling

### Structured Response
```python
{
    "success": True,
    "data": { ... },
    "metadata": {
        "tool": "search",
        "latency_ms": 145,
        "source_count": 3
    }
}
```

### Truncation Strategy
- Truncate tool output to token budget (e.g., 2000 tokens max)
- Surface metadata separately from content
- Provide summary when full output exceeds limit

## Error Recovery

### Retry with Backoff
```python
async def tool_with_retry(tool_fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await tool_fn()
        except RateLimitError:
            wait = 2 ** attempt
            await asyncio.sleep(wait)
        except TemporaryError:
            await asyncio.sleep(1)
        except PermanentError:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "max retries exceeded"}
```

### Fallback Tools
Define alternative tools for common failures:
- Search fails → try cached results
- API fails → try degraded mode (cached data)
- DB fails → try read replica

## Tool Selection Heuristics

| Query Characteristic | Tool Strategy |
|---------------------|---------------|
| Factual question | Single search call |
| Multi-part query | Parallel independent searches |
| Requires computation | Search then calculate |
| Creative task | No tools needed |
| User provides data | Parse and process |

## Security Patterns

### Input Sanitization
```python
def sanitize_tool_input(params, schema):
    for key, value in params.items():
        if key not in schema["properties"]:
            del params[key]
        elif schema["properties"][key].get("type") == "string":
            params[key] = sanitize_string(value)
    return params
```

### Authorization Check
```python
def authorize_tool_call(tool_name, user_context):
    allowed = user_context.get("allowed_tools", [])
    if tool_name not in allowed:
        return {"success": False, "error": "unauthorized"}
    return None
```
