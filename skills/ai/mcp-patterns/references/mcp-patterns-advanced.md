# MCP Scaling, Operations & Advanced Patterns

## Overview
Advanced MCP patterns cover production-grade implementations, multi-server architectures, performance optimization, security hardening, and operational excellence for MCP deployments. This reference builds on the fundamentals of transport, tools, resources, and prompts.

## Multi-Server Architecture Patterns

### Pattern 1: Domain-Oriented Microservers
Decompose functionality into focused MCP servers, each owned by a team:

```
┌──────────────────────────────────────────────────┐
│                   Client/Agent                    │
└──────┬──────────┬──────────┬──────────┬─────────┘
       │          │          │          │
┌──────▼──┐ ┌─────▼────┐ ┌──▼──────┐ ┌─▼────────┐
│Search   │ │Analytics │ │Storage  │ │Security  │
│Server   │ │Server    │ │Server   │ │Server    │
│- search │ │- analyze │ │- read   │ │- audit   │
│- index  │ │- forecast│ │- write  │ │- verify  │
└─────────┘ └──────────┘ └─────────┘ └──────────┘
```

**Design rules for microservers:**
- Each server has ≤7 tools (focused scope)
- Each server uses a single transport type
- Resources are local to each server
- Authentication is per-server (different keys per domain)
- Teams independently deploy and version their servers

### Pattern 2: Gateway/Router Server
Single entry point routes to backend servers:

```
Client → Gateway Server → Search Server
                       → Analytics Server
                       → Storage Server
```

**Gateway responsibilities:**
- Single SSE endpoint for all clients
- Route tool calls to correct backend
- Aggregate tool lists from all backends
- Cross-server request orchestration
- Centralized auth and rate limiting
- Health aggregation

```
Gateway implementation pattern:
1. Gateway connects to backend servers (stdio or internal SSE)
2. Gateway lists tools from all backends on startup
3. Gateway exposes combined tool list to external clients
4. On tool call, gateway routes to the correct backend
5. Gateway handles retry, timeout, and error aggregation
```

### Pattern 3: Layered Architecture
Separate concerns across layers:

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│      (prompt templates, formatting)     │
├─────────────────────────────────────────┤
│           Business Logic Layer          │
│       (tools, orchestration, rules)     │
├─────────────────────────────────────────┤
│           Data Access Layer             │
│       (resources, database access)      │
└─────────────────────────────────────────┘
```

Each layer can be a separate MCP server or combined. The data layer exposes resources. The business layer exposes tools. The presentation layer exposes prompts.

### Pattern 4: Hybrid Transport Server
Server that exposes both stdio and SSE depending on deployment:

```python
class HybridMCPServer:
    def __init__(self, name: str):
        self.server = Server(name)
        self.tools = {}

    def run_stdio(self):
        """Run as local stdio server."""
        from mcp.server.stdio import stdio_server
        async def _run():
            async with stdio_server() as (read, write):
                await self.server.run(read, write)
        asyncio.run(_run())

    def run_sse(self, host: str = "0.0.0.0", port: int = 8000):
        """Run as remote SSE server."""
        import uvicorn
        from mcp.server.sse import SseServerTransport
        from starlette.applications import Starlette
        from starlette.routing import Route

        sse = SseServerTransport("/messages")

        async def handle_sse(request):
            async with sse.connect_sse(
                request.scope, request.receive, request._send
            ) as (read, write):
                await self.server.run(read, write)

        app = Starlette(routes=[
            Route("/sse", endpoint=handle_sse),
            Route("/messages", endpoint=sse.handle_post_message, methods=["POST"]),
        ])

        uvicorn.run(app, host=host, port=port)
```

## Advanced Tool Patterns

### Pattern: Tool Chaining
One tool calls another internally — useful for composite operations:

```python
class ToolChain:
    def __init__(self):
        self.steps = []

    def add_step(self, tool_name: str, input_mapper, output_mapper):
        self.steps.append({
            "tool": tool_name,
            "map_input": input_mapper,
            "map_output": output_mapper,
        })

    async def execute(self, initial_input: dict, server):
        current_data = initial_input
        for step in self.steps:
            tool_input = step["map_input"](current_data)
            result = await server.call_tool(step["tool"], tool_input)
            current_data = step["map_output"](result)
        return current_data

# Example: deploy_service = validate → build → deploy
deploy_chain = ToolChain()
deploy_chain.add_step(
    "validate_config",
    input_mapper=lambda data: {"config": data["config"]},
    output_mapper=lambda result: {"valid": result["valid"], "config": result["config"]},
)
deploy_chain.add_step(
    "build_artifact",
    input_mapper=lambda data: {"config": data["config"]},
    output_mapper=lambda result: {"artifact_url": result["url"]},
)
deploy_chain.add_step(
    "deploy",
    input_mapper=lambda data: {"artifact_url": data["artifact_url"]},
    output_mapper=lambda result: {"deployment_id": result["id"]},
)
```

### Pattern: Streaming Tool Responses
For long-running operations, stream progress back:

```python
import asyncio

@server.tool()
async def long_running_operation(params: str) -> str:
    """Execute a long-running operation with progress updates.

    Uses notifications to stream progress while the tool runs.
    """
    steps = ["validating", "processing", "analyzing", "finalizing"]
    results = []

    for i, step in enumerate(steps):
        # Do the work
        step_result = await execute_step(step, params)
        results.append(step_result)

        # Notify client of progress
        await server.request_context.session.send_notification(
            "notifications/progress",
            {
                "progress": (i + 1) / len(steps),
                "step": step,
                "partial_result": step_result[:100] if step_result else None,
            }
        )

    return json.dumps({"steps_completed": len(steps), "results": results})
```

### Pattern: Batched Tool Operations
Process multiple items in a single tool call:

```python
@server.tool()
def batch_process(items: list[str], operation: str = "summarize") -> str:
    """Process multiple items in a single call.

    Args:
        items: Array of items to process (max 25)
        operation: Operation type: summarize, classify, extract

    Returns:
        Array of per-item results
    """
    if len(items) > 25:
        return json.dumps({
            "error": "Maximum 25 items per batch",
            "code": "VALIDATION_ERROR"
        })

    results = []
    for item in items:
        try:
            result = process_item(item, operation)
            results.append({"item": item, "success": True, "result": result})
        except Exception as e:
            results.append({"item": item, "success": False, "error": str(e)})

    return json.dumps({
        "operation": operation,
        "total": len(items),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results,
    })
```

## Advanced Resource Patterns

### Pattern: Paginated Resources
For large datasets, implement pagination:

```python
@server.resource("data://{resource_type}")
def list_resources(
    resource_type: str,
    page: int = 1,
    page_size: int = 50,
    filter_query: str | None = None
) -> str:
    """List resources with pagination support.

    Args:
        resource_type: Type of resource to list
        page: Page number (1-indexed)
        page_size: Items per page (max 200)
        filter_query: Optional search filter
    """
    all_items = get_items(resource_type)
    if filter_query:
        all_items = [i for i in all_items if filter_query.lower() in i["name"].lower()]

    total = len(all_items)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_items[start:end]

    return json.dumps({
        "items": page_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }
    })
```

### Pattern: Computed/Cached Resources
Resources that compute on first access, cache subsequent:

```python
class CachedResource:
    def __init__(self, ttl_seconds: int = 300):
        self.cache = {}
        self.ttl = ttl_seconds

    def get_or_compute(self, uri: str, compute_fn):
        now = time.time()
        cached = self.cache.get(uri)
        if cached and (now - cached["timestamp"]) < self.ttl:
            return cached["data"]

        data = compute_fn()
        self.cache[uri] = {"data": data, "timestamp": now}
        return data

cache = CachedResource(ttl_seconds=60)

@server.resource("analytics://dashboard/summary")
def get_dashboard_summary() -> str:
    """Dashboard summary, cached for 60 seconds."""
    return cache.get_or_compute(
        "analytics://dashboard/summary",
        lambda: json.dumps(compute_dashboard())
    )
```

### Pattern: Resource Change Notifications
Notify clients when resource content changes:

```python
class ResourceNotifier:
    def __init__(self):
        self.subscribers = {}  # client_id -> set of URIs

    def subscribe(self, client_id: str, resource_uri: str):
        self.subscribers.setdefault(client_id, set()).add(resource_uri)

    def unsubscribe(self, client_id: str, resource_uri: str):
        if client_id in self.subscribers:
            self.subscribers[client_id].discard(resource_uri)

    async def notify_change(self, resource_uri: str, session):
        """Send notification to subscribed clients about a resource change."""
        for client_id, uris in self.subscribers.items():
            if resource_uri in uris:
                await session.send_notification(
                    "notifications/resources/list_changed",
                    {"uris": [resource_uri]}
                )

notifier = ResourceNotifier()

# Call this when resource content changes
async def on_resource_updated(uri: str):
    await notifier.notify_change(uri, server.request_context.session)
```

## Advanced Prompt Patterns

### Pattern: Dynamic Prompt Composition
Build prompts from multiple sources:

```python
@server.prompt()
def complex_analysis(data_sources: list[str], analysis_type: str) -> str:
    """Compose a prompt from multiple data sources dynamically.

    Args:
        data_sources: List of data sources to include (e.g., metrics, logs, config)
        analysis_type: Type of analysis to perform
    """
    sections = []

    for source in data_sources:
        if source == "metrics":
            metrics = fetch_recent_metrics()
            sections.append(f"## Metrics\n{json.dumps(metrics, indent=2)}")
        elif source == "logs":
            logs = fetch_recent_logs()
            sections.append(f"## Logs\n{logs}")
        elif source == "config":
            config = fetch_current_config()
            sections.append(f"## Configuration\n{json.dumps(config, indent=2)}")

    analysis_instructions = {
        "root_cause": "Identify the root cause of any issues.",
        "performance": "Analyze performance trends and bottlenecks.",
        "security": "Identify security concerns and vulnerabilities.",
    }

    return f"""Analyze the following data. {analysis_instructions.get(analysis_type, '')}

{chr(10).join(sections)}

## Analysis
Provide a structured analysis with findings and recommendations.

## Summary
"""
```

### Pattern: Few-Shot Prompt Templates
Include examples in prompt templates:

```python
@server.prompt()
def classification_prompt(
    text: str,
    categories: list[str],
    examples: list[dict] | None = None
) -> str:
    """Classify text with optional few-shot examples.

    Args:
        text: Text to classify
        categories: Available categories
        examples: Optional list of {"text": str, "category": str} examples
    """
    prompt = f"""Classify the following text into one of these categories: {', '.join(categories)}.

"""
    if examples:
        prompt += "Examples:\n"
        for ex in examples:
            prompt += f'Text: "{ex["text"]}" → Category: {ex["category"]}\n'
        prompt += "\n"

    prompt += f'Text: "{text}"\nCategory:'
    return prompt
```

## Performance Optimization

### Connection Pool Tuning
```python
class TunedConnectionPool(MCPConnectionPool):
    def __init__(self, max_size: int = 10, idle_timeout: int = 300):
        super().__init__(max_size)
        self.idle_timeout = idle_timeout
        self._last_used = {}

    async def _evict_idle(self):
        now = time.time()
        idle = [
            name for name, last in self._last_used.items()
            if (now - last) > self.idle_timeout
        ]
        for name in idle:
            await self.remove(name)
```

### Tool Discovery Caching
```python
class CachedToolDiscovery:
    def __init__(self, ttl: int = 60):
        self.cache = {}
        self.ttl = ttl

    async def discover_with_cache(self, session, force: bool = False):
        cache_key = id(session)
        now = time.time()

        if not force and cache_key in self.cache:
            entry = self.cache[cache_key]
            if (now - entry["timestamp"]) < self.ttl:
                return entry["tools"]

        tools = await session.list_tools()
        self.cache[cache_key] = {
            "tools": tools.tools,
            "timestamp": now,
        }
        return tools.tools
```

### Request Batching (SSE)
Batch multiple requests to reduce HTTP round trips:
```python
async def batch_tool_calls(session, calls: list[tuple[str, dict]]):
    """Execute multiple independent tool calls concurrently."""
    async def single_call(tool_name, args):
        try:
            result = await session.call_tool(tool_name, args)
            return {"tool": tool_name, "success": True, "result": result}
        except Exception as e:
            return {"tool": tool_name, "success": False, "error": str(e)}

    tasks = [single_call(name, args) for name, args in calls]
    return await asyncio.gather(*tasks)
```

## Advanced Security Patterns

### Mutual TLS (mTLS) for WebSocket
```python
import ssl

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain("server.crt", "server.key")
ssl_context.load_verify_locations("ca.crt")
ssl_context.verify_mode = ssl.CERT_REQUIRED  # Require client cert

# Pass to WebSocket server
async def main():
    async with websockets.serve(
        handler,
        "localhost",
        8765,
        ssl=ssl_context,
    ):
        await asyncio.Future()
```

### Tool-Scoped API Keys
Generate keys with specific tool permissions:
```python
import secrets
import hashlib

class ScopedKeyManager:
    def __init__(self):
        self.key_hashes = {}  # hash -> {client, tools, resources}

    def create_key(self, client: str, tools: list[str], resources: list[str]) -> str:
        raw_key = f"mcp_{secrets.token_hex(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        self.key_hashes[key_hash] = {
            "client": client,
            "tools": tools,       # ["search_*", "read_*"]
            "resources": resources,  # ["data://public/*"]
        }
        return raw_key

    def validate_key(self, raw_key: str) -> dict | None:
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return self.key_hashes.get(key_hash)

    def check_tool_access(self, raw_key: str, tool_name: str) -> bool:
        key_info = self.validate_key(raw_key)
        if not key_info:
            return False
        return any(match_pattern(tool_name, p) for p in key_info["tools"])
```

### Request Signing (HMAC)
For server-to-server MCP, sign requests:
```python
import hmac
import hashlib
import time

def sign_request(secret: bytes, method: str, params: dict) -> str:
    timestamp = str(int(time.time()))
    message = f"{timestamp}.{method}.{json.dumps(params, sort_keys=True)}"
    signature = hmac.new(secret, message.encode(), hashlib.sha256).hexdigest()
    return f"t={timestamp},s={signature}"

def verify_request(secret: bytes, auth_header: str, method: str, params: dict) -> bool:
    try:
        parts = dict(p.split("=") for p in auth_header.split(","))
        timestamp = parts["t"]
        signature = parts["s"]

        # Reject requests older than 30 seconds
        if abs(int(time.time()) - int(timestamp)) > 30:
            return False

        expected = hmac.new(
            secret,
            f"{timestamp}.{method}.{json.dumps(params, sort_keys=True)}".encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)
    except Exception:
        return False
```

## Notification Patterns

### Pattern: Resource Change Broadcasting
```python
@server.tool()
def update_document(path: str, content: str) -> str:
    """Update a document and notify subscribers."""
    full_path = os.path.join(BASE_DIR, path)
    write_file(full_path, content)

    # Notify subscribers of change
    uri = f"docs://{path}"
    # Implementation sends notification via session
    return json.dumps({"success": True, "updated_uri": uri})
```

### Pattern: Heartbeat/Ping
```python
import asyncio

async def heartbeat_loop(session, interval: int = 30):
    """Send periodic ping to keep connection alive."""
    while True:
        try:
            await asyncio.sleep(interval)
            await session.send_ping()
        except Exception:
            break
```

## Testing Advanced Patterns

### Integration Test with Real Transport
```python
async def test_sse_server():
    """Test server running over SSE transport."""
    import uvicorn
    import threading

    # Start server in background thread
    server_thread = threading.Thread(
        target=lambda: uvicorn.run(app, host="127.0.0.1", port=0),
        daemon=True
    )
    server_thread.start()
    await asyncio.sleep(1)

    # Connect client
    async with sse_client(url="http://127.0.0.1:8000/sse") as (read, write):
        client = Client()
        session = await client.connect(read, write)

        # Test tool call
        result = await session.call_tool("search", {"query": "test"})
        assert result is not None

        # Test resource read
        content = await session.read_resource("config://app/settings")
        assert content is not None
```

### Load Testing with Concurrent Clients
```python
async def load_test_server(num_clients: int = 10, calls_per_client: int = 5):
    """Run load test with concurrent clients."""
    async def client_workload(client_id: int):
        results = {"success": 0, "failure": 0}
        for _ in range(calls_per_client):
            try:
                async with sse_client(url=SERVER_URL) as (read, write):
                    client = Client()
                    session = await client.connect(read, write)
                    await session.call_tool("search", {"query": f"test_{client_id}"})
                    results["success"] += 1
            except Exception:
                results["failure"] += 1
        return results

    tasks = [client_workload(i) for i in range(num_clients)]
    all_results = await asyncio.gather(*tasks)

    total_success = sum(r["success"] for r in all_results)
    total_failure = sum(r["failure"] for r in all_results)
    print(f"Load test complete: {total_success} success, {total_failure} failures")
```

## Key Points
- Decompose monolithic MCP servers into focused domain-oriented servers
- Use gateway/routing pattern for complex multi-server deployments
- Implement tool chaining for composite operations spanning multiple tools
- Cache resources with TTL to reduce computation on repeated reads
- Use pagination for resource endpoints returning large datasets
- Implement dynamic prompt composition for flexible prompt generation
- Optimize connection pools with idle timeout and eviction
- Use scoped API keys with specific tool/resource permissions
- Implement request signing (HMAC) for server-to-server MCP
- Load test with concurrent clients to validate production readiness
