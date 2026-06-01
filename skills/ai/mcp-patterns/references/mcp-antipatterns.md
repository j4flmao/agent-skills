# MCP Anti-Patterns & Common Mistakes

## Overview
This reference catalogs common MCP anti-patterns — designs that seem reasonable but cause problems in practice. Each entry describes the anti-pattern, why it's harmful, how to detect it, and the correct approach.

---

## Anti-Pattern 1: Monolithic Server

### Description
One MCP server implements everything: tools for search, database access, file system operations, email, analytics, system administration — all in a single process with a single transport.

```python
# BAD — Monolithic server
server = FastMCP("do-everything", transport="sse")

@server.tool()
def search_docs(query: str): ...

@server.tool()
def delete_user(user_id: str): ...

@server.tool()
def send_email(to: str, subject: str, body: str): ...

@server.tool()
def shutdown_server(): ...
```

### Why It's Harmful
- **Security**: One compromised tool exposes all capabilities. No isolation between sensitive and benign operations.
- **Scaling**: All tools share the same resources. A CPU-heavy search impacts email sending latency.
- **Ownership**: No clear team ownership. Changes to one tool risk breaking others.
- **Deployment**: Single deploy process for all tools. One bug blocks all releases.
- **Discovery**: LLMs see dozens of unrelated tools, making routing harder.

### Detection
- Server has > 10 tools spanning unrelated domains
- Tool list includes both read-only and destructive operations
- Mix of local (filesystem) and remote (email, API) tools
- Team has "MCP server" on-call instead of per-domain ownership

### Fix: Domain-Oriented Servers
```python
# GOOD — Domain-specific servers
search_server = FastMCP("search-server", transport="stdio")
@search_server.tool()
def search_docs(query: str): ...

admin_server = FastMCP("admin-server", transport="stdio")
@admin_server.tool()
def delete_user(user_id: str): ...

email_server = FastMCP("email-server", transport="stdio")
@email_server.tool()
def send_email(to: str, subject: str, body: str): ...
```

Each server has ≤ 7 tools, a single domain focus, and independent security/access controls.

---

## Anti-Pattern 2: Ignoring Error Handling

### Description
Tools propagate raw exceptions to the client, causing unhelpful errors or crashes.

```python
# BAD — Raw exception propagation
@server.tool()
def divide(a: float, b: float) -> float:
    return a / b  # ZeroDivisionError propagates to client!

@server.tool()
def read_file(path: str) -> str:
    with open(path) as f:  # FileNotFoundError, PermissionError propagate!
        return f.read()
```

### Why It's Harmful
- **Crashes client**: Unhandled exceptions can crash or hang the MCP client.
- **Information leakage**: Stack traces reveal internal paths, versions, and architecture.
- **LLM confusion**: LLM receives a protocol error, not useful feedback about what went wrong.
- **No recovery**: Client doesn't know whether to retry, fix input, or abort.

### Detection
- Tool handler has no try/except
- Error responses contain stack traces
- Client receives protocol-level errors instead of structured responses
- Server logs show unhandled exceptions in tool handlers

### Fix: Structured Error Responses
```python
# GOOD — Structured error handling
@server.tool()
def divide(a: float, b: float) -> str:
    if b == 0:
        return json.dumps({
            "success": False,
            "error": "Cannot divide by zero. Provide a non-zero divisor.",
            "code": "DIVISION_BY_ZERO"
        })
    return json.dumps({"success": True, "result": a / b})

@server.tool()
def read_file(path: str) -> str:
    try:
        content = read_file_safe(path)
        return json.dumps({"success": True, "content": content})
    except FileNotFoundError:
        return json.dumps({
            "success": False,
            "error": f"File not found: {path}",
            "code": "NOT_FOUND"
        })
    except PermissionError:
        return json.dumps({
            "success": False,
            "error": "Permission denied reading file",
            "code": "PERMISSION_DENIED"
        })
```

---

## Anti-Pattern 3: Sync-Only Design

### Description
All tool handlers are synchronous blocking calls, even when the server runs in an async event loop.

```python
# BAD — Sync-only blocks the event loop
@server.tool()
def search(query: str) -> str:
    # Blocking call starves the event loop
    results = some_blocking_api_call(query)
    return format_results(results)

@server.tool()
def process_large(data: str) -> str:
    # CPU-bound work blocks all other tool calls
    result = cpu_intensive_computation(data)
    return result
```

### Why It's Harmful
- **Blocks all clients**: One slow synchronous call blocks the entire server (in single-threaded async runtime).
- **Poor throughput**: Server cannot handle concurrent requests.
- **Timeout cascades**: Blocked requests accumulate, causing timeouts on unrelated tools.

### Detection
- `asyncio` warnings about slow callbacks
- One slow tool causes timeouts on unrelated tools
- Server cannot handle concurrent clients
- High p99 latency despite low p50

### Fix: Async + Thread Pool
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

@server.tool()
async def search(query: str) -> str:
    """Run blocking I/O in thread pool to avoid blocking event loop."""
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(
        executor, some_blocking_api_call, query
    )
    return format_results(results)

@server.tool()
async def process_large(data: str) -> str:
    """Run CPU-bound work in thread pool."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor, cpu_intensive_computation, data
    )
    return result
```

---

## Anti-Pattern 4: Descriptionless Tools

### Description
Tool definitions have empty or generic descriptions, making it impossible for LLMs to route correctly.

```python
# BAD — No descriptions
@server.tool()
def t1(q: str) -> str:
    return search(q)

@server.tool()
def t2(q: str) -> str:
    return analyze(q)

# BAD — Generic descriptions
TOOLS = [
    {"name": "search", "description": "A tool for searching"},
    {"name": "analyze", "description": "Analyzes things"},
]
```

### Why It's Harmful
- **LLM can't route**: Without descriptions, the LLM doesn't know what tools do or when to call them.
- **Wrong tool selected**: LLM guesses based on name alone, leading to incorrect tool calls.
- **Reduced agent capability**: LLM may not use tools at all if unsure what they do.

### Detection
- Tool descriptions are empty, "TODO", or generic ("A tool")
- Parameter descriptions are missing
- LLM frequently calls wrong tool or asks for clarification
- Low tool usage rate despite tools being available

### Fix: Detailed Descriptions
```python
# GOOD — Detailed, action-oriented descriptions
@server.tool(description=(
    "Search the company knowledge base for documents matching the query. "
    "Returns ranked results with title, snippet, and relevance score. "
    "Use this when the user asks about internal documentation, policies, "
    "or technical guides."
))
def search_knowledge_base(
    query: str = Field(description="Natural language search query describing what to find"),
    max_results: int = Field(default=5, description="Maximum number of results to return")
) -> str:
    ...

# Parameter descriptions are equally important
TOOLS = [{
    "name": "search_knowledge_base",
    "description": "Search the company knowledge base. Use for internal docs, policies, guides.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language search query describing what information to find"
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum results to return (1-20)",
                "default": 5
            }
        },
        "required": ["query"]
    }
}]
```

---

## Anti-Pattern 5: Secret Leakage

### Description
Sensitive data (API keys, passwords, tokens) appears in tool parameters, resource URIs, or log output.

```python
# BAD — Secret in tool parameter
@server.tool()
def call_external_api(endpoint: str, api_key: str) -> str:
    # api_key is passed by LLM, logged by MCP protocol!
    return requests.post(endpoint, headers={"Authorization": f"Bearer {api_key}"})

# BAD — Secret in resource URI
@server.resource("data://users/{token}/profile")
def get_profile(token: str) -> str:
    # token appears in URI, logged everywhere
    return fetch_profile(token)

# BAD — Secret in error message
@server.tool()
def connect_db(connection_string: str) -> str:
    try:
        db.connect(connection_string)
    except Exception as e:
        return f"Error connecting with {connection_string}: {e}"  # Leaks creds!
```

### Why It's Harmful
- **Credential exposure**: Secrets appear in audit logs, MCP protocol traces, client logs, and error outputs.
- **LLM persistence**: LLM may include secrets in conversation history, context windows, or training data.
- **Violates compliance**: PCI DSS, SOC 2, HIPAA all prohibit credential logging.
- **Irrevocable**: Rotating exposed secrets is expensive and time-consuming.

### Detection
- Tool parameters named `api_key`, `password`, `token`, `secret`
- Resource URIs containing credentials
- Error messages echoing full input parameters
- Audit logs showing credential values

### Fix: Server-Side Credential Management
```python
# GOOD — Server manages its own credentials
import os

API_KEY = os.environ["EXTERNAL_API_KEY"]  # Server reads from env

@server.tool()
def call_external_api(endpoint: str) -> str:
    """Call external API. Credentials managed server-side."""
    headers = {"Authorization": f"Bearer {API_KEY}"}
    try:
        response = requests.post(endpoint, headers=headers, timeout=10)
        return json.dumps({"success": True, "status": response.status_code})
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": "External API call failed",
            "code": "EXTERNAL_API_ERROR"
        })

# GOOD — Use short-lived credentials
class CredentialProvider:
    def __init__(self):
        self._cache = {}

    def get_credential(self, service: str) -> str:
        """Get short-lived credential, cached until near expiry."""
        if service in self._cache and not self._is_expiring(self._cache[service]):
            return self._cache[service]["value"]

        credential = self._fetch_new_credential(service)
        self._cache[service] = credential
        return credential["value"]
```

---

## Anti-Pattern 6: Stale Discovery Cache

### Description
Client caches tool/resource lists forever and never refreshes, leading to stale capability views.

```python
# BAD — Cache forever, never refresh
class MCPClient:
    def __init__(self):
        self.tools = None

    async def list_tools(self):
        if self.tools is not None:
            return self.tools  # Never refreshes!
        self.tools = await self.session.list_tools()
        return self.tools
```

### Why It's Harmful
- **Missing tools**: If the server adds new tools, clients never see them.
- **Stale schemas**: Updated tool schemas are ignored — LLM uses old parameter definitions.
- **Removed tools**: Client calls tools that no longer exist, getting errors.

### Detection
- Tools exist on server but client never calls them
- Client uses old parameter names/values
- "Tool not found" errors despite tool being registered

### Fix: TTL-Based Caching
```python
# GOOD — Cache with TTL, support force refresh
class CachedDiscovery:
    def __init__(self, ttl_seconds: int = 60):
        self.cache = {}
        self.ttl = ttl_seconds

    async def list_tools(self, session, force: bool = False):
        cache_key = "tools"
        now = time.time()

        if not force and cache_key in self.cache:
            entry = self.cache[cache_key]
            if (now - entry["timestamp"]) < self.ttl:
                return entry["data"]

        result = await session.list_tools()
        self.cache[cache_key] = {
            "data": result.tools,
            "timestamp": now,
        }
        return result.tools

    def invalidate(self):
        self.cache.clear()
```

---

## Anti-Pattern 7: No Input Validation

### Description
Tool handlers assume LLM-generated parameters are always valid, leading to injection attacks or runtime errors.

```python
# BAD — No input validation
@server.tool()
def execute_query(sql: str) -> str:
    cursor.execute(sql)  # SQL injection!
    return json.dumps(cursor.fetchall())

@server.tool()
def delete_file(path: str) -> str:
    os.remove(path)  # Path traversal! Any file can be deleted.
    return f"Deleted {path}"
```

### Why It's Harmful
- **SQL injection**: Malicious queries can read/modify/delete database contents.
- **Command injection**: Shell commands can be injected through parameters.
- **Path traversal**: `../../etc/passwd` — access any server file.
- **Resource exhaustion**: `max_rows=999999999` — crash the database.

### Detection
- Tool handler passes parameters directly to database or shell
- No validation or sanitization of string parameters
- File paths used without normalization or bounds checking

### Fix: Validate Everything
```python
# GOOD — Validate all inputs
from pydantic import BaseModel, validator, Field

class QueryParams(BaseModel):
    sql: str = Field(..., description="SQL query")
    max_rows: int = Field(default=100, ge=1, le=10000)

    @validator("sql")
    def allow_read_only(cls, v):
        forbidden = ["DROP", "DELETE", "ALTER", "TRUNCATE", "CREATE",
                     "INSERT", "UPDATE", "EXEC", "EXECUTE"]
        upper = v.upper().strip()
        for kw in forbidden:
            if upper.startswith(kw) or f" {kw} " in f" {upper} ":
                raise ValueError(f"Operation not allowed: {kw}")
        return v

class FileParams(BaseModel):
    path: str = Field(..., description="File path relative to data directory")

    @validator("path")
    def prevent_traversal(cls, v):
        # Normalize and check path
        normalized = os.path.normpath(v)
        # Reject absolute paths
        if os.path.isabs(normalized):
            raise ValueError("Absolute paths not allowed")
        # Reject traversal beyond root
        if normalized.startswith(".."):
            raise ValueError("Path traversal detected")
        return normalized

@server.tool()
def execute_query(sql: str, max_rows: int = 100) -> str:
    try:
        params = QueryParams(sql=sql, max_rows=max_rows)
        cursor.execute(params.sql)
        rows = cursor.fetchmany(params.max_rows)
        return json.dumps({"success": True, "rows": rows, "count": len(rows)})
    except ValueError as e:
        return json.dumps({"success": False, "error": str(e), "code": "VALIDATION_ERROR"})
```

---

## Anti-Pattern 8: Empty Error Messages

### Description
Error responses contain no useful information for the LLM to recover.

```python
# BAD — Useless error messages
return "Error"

return "Something went wrong"

return json.dumps({"error": "failed"})
```

### Why It's Harmful
- **LLM can't fix**: Without error details, LLM doesn't know what to change.
- **Degraded experience**: User receives "An error occurred" with no path forward.
- **Hard to debug**: Operations has no context about what failed.

### Detection
- Error messages are static strings with no context
- No error code/category for programmatic handling
- LLM repeats the same failed call because it doesn't know what's wrong

### Fix: Structured, Informative Errors
```python
# GOOD — Structured error with context
return json.dumps({
    "success": False,
    "error": "Query rejected: DROP TABLE statements are not allowed. Use DELETE FROM instead for safe row removal.",
    "code": "VALIDATION_ERROR",
    "suggestion": "Use DELETE FROM table_name WHERE condition instead of DROP TABLE"
})

return json.dumps({
    "success": False,
    "error": "Search timed out after 10 seconds. Try narrowing your query or adding filters.",
    "code": "TIMEOUT",
    "suggestion": "Add a 'category' filter or reduce the date range"
})
```

---

## Anti-Pattern 9: Overly Permissive Authorization

### Description
All clients share the same API key with access to all tools, regardless of need.

```python
# BAD — One key for everything
API_KEY = "sk-mcp-super-secret"
ALL_TOOLS = ["search", "delete_user", "send_email", "execute_shell",
             "shutdown_server", "read_file", "write_file"]

def verify_key(key: str) -> bool:
    return key == API_KEY  # Any client with this key can do everything
```

### Why It's Harmful
- **No access control**: A CLI tool client can delete users or execute shell commands.
- **No audit trail**: Cannot determine which client performed which action.
- **No revocation granularity**: If one client is compromised, all clients are compromised.
- **No least privilege**: Every client gets maximum permissions.

### Detection
- Single API key for all clients
- No per-tool authorization checks
- All tools accessible to all authenticated clients
- Cannot disable specific tools for specific clients

### Fix: Scoped Keys with Role-Based Access
```python
# GOOD — Scoped keys with RBAC
KEY_REGISTRY = {
    "sk-mcp-search-client": {
        "client": "search-ui",
        "tools": ["search_*", "read_*"],
    },
    "sk-mcp-admin-client": {
        "client": "admin-panel",
        "tools": ["search_*", "read_*", "write_*", "delete_*"],
    },
    "sk-mcp-viewer-client": {
        "client": "readonly-app",
        "tools": ["search_*", "read_*"],
    },
}

def authorize(api_key: str, tool_name: str) -> bool:
    entry = KEY_REGISTRY.get(api_key)
    if not entry:
        return False
    return any(
        fnmatch.fnmatch(tool_name, pattern)
        for pattern in entry["tools"]
    )
```

---

## Anti-Pattern 10: No Rate Limiting

### Description
Remote MCP servers have no rate limiting, allowing any single client to exhaust resources.

```python
# BAD — Unlimited access
server = FastMCP("unlimited-server", transport="sse", host="0.0.0.0", port=8000)
# No rate limiting — one client can DoS the server
```

### Why It's Harmful
- **Resource exhaustion**: One aggressive client can saturate CPU, memory, or database connections.
- **Denial of service**: Other clients experience timeouts and failures.
- **Cost explosion**: Pay-per-request backends (LLM APIs, cloud services) incur unbounded costs.
- **Unfair usage**: A few power users degrade service for everyone.

### Detection
- Single client makes hundreds of requests per second
- Server CPU/memory spikes correlate with specific clients
- Database connection pool exhaustion
- External API costs far exceed expectations

### Fix: Multi-Level Rate Limiting
```python
# GOOD — Rate limiting at multiple levels
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# Global limit
@app.post("/messages")
@limiter.limit("100/minute")
async def handle_message(request: Request):
    ...

# Per-tool limits (stricter for expensive tools)
@server.tool()
@limiter.limit("10/minute")
def expensive_operation(data: str) -> str:
    ...

# Per-client tracking with token bucket
class PerClientRateLimiter:
    def __init__(self):
        self.clients = {}

    async def check(self, client_id: str, cost: int = 1) -> bool:
        now = time.monotonic()
        if client_id not in self.clients:
            self.clients[client_id] = {"tokens": 10, "last": now}
        client = self.clients[client_id]
        elapsed = now - client["last"]
        client["tokens"] = min(10, client["tokens"] + elapsed * (10 / 60))
        client["last"] = now
        if client["tokens"] >= cost:
            client["tokens"] -= cost
            return True
        return False
```

---

## Anti-Pattern 11: Ignoring Transport Failures

### Description
No handling for transport-level failures — process crashes, connection drops, or network timeouts.

```python
# BAD — Assume transport never fails
client = MCPClient("my-server", transport="stdio")
await client.connect()
result = await client.call_tool("search", {"query": "test"})
# If server process crashed, this hangs forever
```

### Why It's Harmful
- **Hung clients**: Tool call blocks indefinitely when server dies.
- **User frustration**: No feedback about connection issues.
- **Resource leaks**: Orphaned connections and processes accumulate.
- **No automatic recovery**: Manual restart required.

### Detection
- Tool calls hang indefinitely without timeout
- Error messages: "Connection reset" or "Broken pipe"
- Increasing number of zombie processes

### Fix: Timeouts, Health Checks, Reconnection
```python
# GOOD — Robust transport handling
class RobustMCPClient:
    def __init__(self, command: str, timeout: int = 30):
        self.command = command
        self.timeout = timeout
        self.client = None

    async def connect_with_retry(self, max_retries: int = 3):
        for attempt in range(max_retries):
            try:
                await self._connect()
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)

    async def call_tool_with_timeout(self, tool: str, args: dict):
        try:
            result = await asyncio.wait_for(
                self.client.call_tool(tool, args),
                timeout=self.timeout
            )
            return result
        except asyncio.TimeoutError:
            # Attempt reconnection on timeout
            await self._reconnect()
            raise TimeoutError(f"Tool {tool} timed out after {self.timeout}s")

    async def _reconnect(self):
        await self.disconnect()
        await self.connect_with_retry()
```

---

## Anti-Pattern 12: Too Many Parameters

### Description
Tool definitions with 10+ required parameters that LLMs struggle to populate correctly.

```python
# BAD — Too many parameters
@server.tool()
def create_report(
    title: str,
    author: str,
    department: str,
    category: str,
    tags: str,
    format: str,
    template: str,
    include_charts: bool,
    include_tables: bool,
    page_size: str,
    orientation: str,
    font: str,
    margin: float,
    header_text: str,
    footer_text: str,
) -> str:
    ...
```

### Why It's Harmful
- **LLM overload**: LLMs struggle to correctly populate > 7 parameters.
- **High error rate**: Most calls return validation errors.
- **Poor UX**: Users asked to provide too many details.
- **Abandonment**: LLM may skip the tool entirely.

### Detection
- Tool has > 7 parameters
- Most tool calls return validation errors for missing/incorrect parameters
- LLM frequently asks user for parameter values
- Low invocation rate for a useful tool

### Fix: Reduce Parameters, Group Complex Input
```python
# GOOD — Reduced parameters, structured input
@server.tool()
def create_report(
    title: str,
    content: str,
    config: str = "{}",  # JSON string for advanced options
) -> str:
    """Create a formatted report.

    Use config JSON for advanced options:
    {"format": "pdf", "template": "standard", "include_charts": true}
    """
    config_obj = json.loads(config)
    # Sensible defaults
    format = config_obj.get("format", "pdf")
    template = config_obj.get("template", "standard")
    include_charts = config_obj.get("include_charts", True)
    ...

# Alternative: Separate tool for configuration
@server.tool()
def create_report_simple(title: str, content: str) -> str:
    """Create a report with default settings."""
    return generate_report(title, content, config=DEFAULT_CONFIG)

@server.tool()
def create_report_advanced(config_json: str) -> str:
    """Create a report with full configuration options."""
    config = json.loads(config_json)
    return generate_report(config["title"], config["content"], config=config)
```

---

## Anti-Pattern 13: Missing Content Types

### Description
All resources return `text/plain` regardless of actual content type, breaking content negotiation.

```python
# BAD — Everything is text/plain
@server.resource("docs://api/reference")
def get_api_docs() -> str:
    return "# API Reference\n..."  # Actually markdown, but no MIME type set

@server.resource("data://users/export")
def export_users() -> str:
    return "id,name,email\n1,Alice,alice@..."  # Actually CSV, but no MIME type
```

### Why It's Harmful
- **Lost formatting**: Markdown resources rendered as plain text.
- **Broken parsing**: CSV, JSON resources not parsed as structured data.
- **Poor display**: LLM can't render content appropriately.

### Detection
- All resources return `text/plain`
- Rich content displayed without formatting
- Structured data returned as unformatted text

### Fix: Set Correct MIME Types
```python
# GOOD — Correct MIME types
@server.resource("docs://api/reference", mime_type="text/markdown")
def get_api_docs() -> str:
    return "# API Reference\n..."

@server.resource("data://users/export", mime_type="text/csv")
def export_users() -> str:
    return "id,name,email\n1,Alice,alice@..."

@server.resource("data://dashboard", mime_type="application/json")
def get_dashboard() -> str:
    return json.dumps({"users": 150, "active": 42})

# MIME type reference for MCP resources:
# text/plain        — Plain text
# text/markdown     — Markdown formatted text
# text/html         — HTML content
# text/csv          — CSV data
# application/json  — JSON data
# application/xml   — XML data
# application/pdf   — PDF document
# image/png         — PNG image
# image/jpeg        — JPEG image
```

---

## Quick Reference: Anti-Pattern Detection

| Anti-Pattern | Red Flag | Fix |
|-------------|---------|-----|
| Monolithic Server | >10 tools, unrelated domains | Split into domain servers |
| Ignoring Errors | No try/except in handlers | Structured error responses |
| Sync-Only | Blocking calls in async handlers | Thread pool + async |
| No Descriptions | Empty or "TODO" descriptions | Detailed 1-2 sentence descriptions |
| Secret Leakage | API keys in parameters | Server-side credential management |
| Stale Cache | `if cache: return cache` | TTL-based caching |
| No Validation | Direct SQL/file/path operations | Validate and sanitize all inputs |
| Empty Errors | `return "Error"` | Structured errors with codes |
| Overly Permissive | Single key for all tools | Scoped keys + RBAC |
| No Rate Limiting | Unlimited remote access | Token bucket + middleware |
| Transport Failures | No timeouts or reconnection | Timeouts + health checks + retry |
| Too Many Params | >7 required parameters | Reduce or group into config object |
| Missing Content Types | All resources text/plain | Set appropriate MIME types |

## Key Points
- Monolithic servers violate security, scaling, and ownership boundaries — decompose by domain
- Always wrap tool handlers in try/except with structured error responses
- Offload blocking operations to thread pools in async servers
- Write detailed descriptions for every tool and parameter
- Never pass secrets through tool parameters — manage server-side
- Cache tool/resource discovery with TTL, support force-refresh
- Validate and sanitize all inputs before execution
- Include context, codes, and suggestions in error messages
- Scope API keys to least-privilege tool sets
- Rate limit both globally and per-client for remote servers
- Handle transport failures with timeouts, health checks, and reconnection
- Keep tool parameters to ≤7; group complex inputs into config objects
- Set correct MIME types for resources to enable content negotiation
