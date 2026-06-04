---
name: ai-mcp-patterns
description: >
  Use this skill when working with Model Context Protocol: MCP server, MCP client, tool server, MCP resources, MCP prompts, remote MCP, stdio transport, SSE transport.
  This skill enforces: transport selection, tool/resource/prompt design, security boundaries, client integration patterns, authentication model.
  Do NOT use for: building LangChain agents (use ai-langchain-patterns), generic API design, REST API development, non-MCP tool servers.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, mcp, protocol, phase-11]
---

# MCP Patterns Agent

## Purpose
Designs Model Context Protocol servers and clients with proper transport, tool/resources/prompts, security, and agent integration patterns. Covers the full lifecycle from transport selection through production operations.

## Agent Protocol

### Trigger
User request includes: MCP, Model Context Protocol, MCP server, MCP client, tool server, MCP resources, MCP prompts, remote MCP, stdio transport, SSE transport.

### Protocol
1. Identify use case (tool server, resource provider, prompt template) and host environment.
2. Select transport (stdio for local, SSE for remote, WebSocket for streaming).
3. Design tools with schemas, descriptions, and error handling.
4. Define resources (static, dynamic, file-based) with URI scheme.
5. Design prompt templates with argument interpolation.
6. Configure security (authentication, authorization, scope).
7. Plan client integration with agent framework.
8. Plan production operations (scaling, monitoring, health checks).

## Output
MCP architecture with server design, transport selection, security model, agent integration.

### Response Format
```
## MCP Architecture
### Server
Name: {server-name}
Transport: {stdio/SSE/WebSocket}
Endpoint: {url or command}

### Tools
- {name}: {description}
  Input: {JSON schema}
  Output: {type}
  Error Handling: {strategy}

### Resources
- {uri-scheme}://{path}: {description}
  Type: {static/dynamic}
  MIME: {mime-type}

### Prompts
- {name}: {description}
  Arguments: [{name, type, required}]
  Template: {template string}

### Security
Auth: {none/api-key/oauth/mtls}
Scope: {tool list}
Rate Limit: {requests/second}

### Operations
Scaling: {horizontal/vertical/none}
Monitoring: {metrics endpoint}
Health: {/health endpoint}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Transport selected based on deployment context (stdio vs SSE vs WebSocket).
- [ ] Tool schemas have descriptions, input JSON Schema, and error strategy.
- [ ] Resources use consistent URI scheme with MIME types.
- [ ] Prompts define arguments and template structure.
- [ ] Security measures match sensitivity of tools/resources.
- [ ] Client integration documented with connection lifecycle.
- [ ] Authentication and authorization scoped to least privilege.
- [ ] Production readiness: health checks, monitoring, scaling strategy.

---

## Workflow

### Step 1: Use Case & Environment Analysis

Classify the MCP server by use case and environment:

| Use Case | Primary Capability | Typical Transport |
|----------|-------------------|-------------------|
| Local CLI tool | Tools | stdio |
| IDE extension | Tools, Resources | stdio |
| Knowledge base | Resources | SSE |
| API gateway | Tools | SSE |
| Data pipeline | Resources, Tools | SSE or WebSocket |
| Real-time monitor | Notifications | WebSocket |
| Multi-tenant SaaS | Tools, Resources | SSE + auth |

**Decision Tree: Transport Selection**
```
Q: Is the server co-located with the client on the same machine?
├── YES → Q: Is only one client needed at a time?
│   ├── YES → stdio (fastest, most secure)
│   └── NO  → Is bidirectional streaming required?
│       ├── YES → WebSocket (multi-client local)
│       └── NO  → SSE over localhost
└── NO  → Q: Is the server behind a corporate proxy/firewall?
    ├── YES → SSE (HTTP-only, no WebSocket upgrade needed)
    └── NO  → Q: Do you need bidirectional streaming?
        ├── YES → WebSocket (real-time push, low latency)
        └── NO  → SSE (simpler, HTTP-native)

**Decision Tree: Security Model**
```
Q: What transport was selected?
├── stdio → No auth needed (process isolation, no network)
├── SSE → Q: Is this single-tenant or multi-tenant?
│   ├── Single-tenant → API key (Bearer token in header)
│   └── Multi-tenant → OAuth 2.0 (client credentials or auth code)
└── WebSocket → Q: What security level?
    ├── Standard → JWT token on connect
    └── High-security → mTLS (mutual TLS with client certs)

**Decision Tree: Scaling Strategy**
```
Q: What transport was selected?
├── stdio → Vertical scaling only (bigger machine). One process per client.
│   Spawn multiple server processes for multiple clients.
├── SSE → Q: Expected concurrent clients?
│   ├── <100 → Single instance, async workers
│   ├── 100-1000 → Horizontal scaling behind load balancer
│   └── >1000 → Horizontal + connection pooling + caching layer
└── WebSocket → Horizontal scaling with sticky sessions or shared state store
```

### Step 2: Server Architecture Patterns

**Pattern A: Monolithic Server**
Single server providing all capabilities (tools, resources, prompts). Best for small projects, local tools, single-domain servers.

```
MCP Server
├── Tools: search, summarize, translate
├── Resources: docs://, data://
└── Prompts: qa_template, summary_template
```
Pro: Simple deployment, single transport. Con: Coupled concerns, harder to scale.

**Pattern B: Domain-Oriented Server**
Separate servers per domain, each with focused capabilities. Best for multi-domain systems, team ownership.

```
MCP Server: Knowledge
├── Tools: search, index, query
└── Resources: docs://, kb://

MCP Server: Analytics
├── Tools: analyze, aggregate, report
└── Resources: metrics://, reports://

MCP Server: System
├── Tools: execute, deploy, monitor
└── Resources: config://, logs://
```
Pro: Independent scaling, clear ownership, isolated security boundaries. Con: Multiple transports to manage.

**Pattern C: Layered Server**
Gateway server routes to backend MCP servers. Best for complex systems needing aggregation.

```
Client → MCP Gateway → Knowledge Server
                    → Analytics Server
                    → System Server
```
Pro: Single endpoint, cross-server orchestration. Con: Added latency, gateway is SPOF.

**Pattern D: Hybrid (stdio+SSE)**
Local agent tools via stdio, remote resources via SSE. Best for IDE integrations with cloud backends.

```
Agent → stdio → Local Tool Server (filesystem, shell)
     → SSE  → Remote Resource Server (knowledge base, APIs)
```

### Step 3: Tool Design Patterns

**Tool Structure Pattern**
Every tool requires four elements:
1. **Name**: snake_case, descriptive, unique within server
2. **Description**: 1-2 sentence natural language — LLMs use this for routing
3. **Input Schema**: JSON Schema with typed, validated parameters
4. **Error Strategy**: Structured error responses, not exceptions

**Tool Design Patterns Table**

| Pattern | When to Use | Example |
|---------|------------|---------|
| CRUD Tool | Standard create/read/update/delete | `create_document`, `read_document` |
| Query Tool | Search/filter operations | `search_knowledge_base` |
| Transform Tool | Data processing pipelines | `summarize_text`, `translate` |
| Affordance Tool | System actions | `execute_shell`, `read_file` |
| Aggregate Tool | Combine multiple operations | `analyze_repository` |
| Chain Tool | Multi-step workflows | `deploy_service` (validate → build → deploy) |

**Tool Schema Best Practices**
- Use `description` on every parameter — LLMs use them to infer correct values
- Mark required parameters with `required` array
- Set sensible defaults for optional parameters
- Use constraints: `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`
- Limit parameter count to ≤7 parameters per tool
- For complex inputs, use a single structured object parameter

```json
{
  "name": "search_documents",
  "description": "Search the knowledge base for relevant documents. Returns ranked results with snippets.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language search query"
      },
      "max_results": {
        "type": "integer",
        "description": "Maximum results to return (1-50)",
        "default": 10,
        "minimum": 1,
        "maximum": 50
      },
      "filter_category": {
        "type": "string",
        "description": "Optional category filter",
        "enum": ["api", "guide", "tutorial", "reference"]
      }
    },
    "required": ["query"]
  }
}
```

**Error Handling Pattern**
```python
@server.tool()
def safe_tool(input_data: str) -> str:
    """Handle errors gracefully — never propagate raw exceptions to client."""
    try:
        if not input_data:
            return json.dumps({
                "success": False,
                "error": "input_data is required",
                "code": "MISSING_PARAMETER"
            })
        result = process(input_data)
        return json.dumps({"success": True, "data": result})
    except PermissionError:
        return json.dumps({
            "success": False,
            "error": "Insufficient permissions for this operation",
            "code": "PERMISSION_DENIED"
        })
    except ValueError as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "code": "VALIDATION_ERROR"
        })
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return json.dumps({
            "success": False,
            "error": "Internal server error",
            "code": "INTERNAL_ERROR"
        })
```

Error response codes to standardize:
- `MISSING_PARAMETER` — Required parameter not provided
- `VALIDATION_ERROR` — Parameter fails constraints
- `PERMISSION_DENIED` — Client not authorized
- `RATE_LIMITED` — Too many requests
- `NOT_FOUND` — Resource or tool not found
- `INTERNAL_ERROR` — Unexpected server failure
- `TIMEOUT` — Operation exceeded deadline

### Step 4: Resource Patterns

**URI Scheme Convention**
```
{scheme}://{authority}/{path}
```
Standard schemes: `file://`, `db://`, `api://`, `config://`, `docs://`, `data://`, `log://`, `metrics://`

**Resource Type Decision Tree**
```
Q: Does the resource content change between calls?
├── NO → Static resource (fixed path URI)
│   Example: config://app/settings
└── YES → Q: Can the content be computed from URI parameters?
    ├── YES → Dynamic resource (URI template)
    │   Example: docs://{path}/content
    └── NO → Resource template + handler
        Example: data://search/{query}
```

**Static Resource Pattern**
```python
@server.resource("config://app/settings")
def get_settings() -> str:
    """Return application configuration. Content never changes between calls."""
    return json.dumps(load_settings())
```

**Dynamic Resource Pattern**
```python
@server.resource("docs://{category}/{slug}")
def get_document(category: str, slug: str) -> str:
    """Fetch a documentation page by category and slug.
    Prevents directory traversal via path normalization."""
    safe_path = os.path.normpath(os.path.join("docs", category, f"{slug}.md"))
    if not safe_path.startswith("docs"):
        return "Error: Invalid path"
    if not os.path.exists(safe_path):
        return "Error: Document not found"
    return read_file(safe_path)
```

**Resource Template with Handler**
```python
@server.resource("data://{resource_type}/{resource_id}")
def get_data_resource(resource_type: str, resource_id: str) -> str:
    """Generic resource handler with type-based routing."""
    handlers = {
        "users": lambda id: fetch_user(id),
        "projects": lambda id: fetch_project(id),
        "reports": lambda id: generate_report(id),
    }
    handler = handlers.get(resource_type)
    if not handler:
        return "Error: Unknown resource type"
    try:
        return json.dumps(handler(resource_id))
    except Exception as e:
        return f"Error: {e}"
```

**Resource Content Negotiation**
```python
@server.resource("docs://{path}")
def get_document(path: str, mime_type: str = "text/markdown") -> str:
    """Return document in requested format."""
    if mime_type == "text/markdown":
        return read_raw_markdown(path)
    elif mime_type == "text/plain":
        return strip_markdown(read_raw_markdown(path))
    elif mime_type == "application/json":
        return json.dumps(parse_markdown_to_json(path))
    return "Error: Unsupported MIME type"
```

### Step 5: Prompt Template Patterns

**Prompt Template Architecture**
```python
@server.prompt()
def qa_with_context(context: str, question: str) -> str:
    """QA template: provides context then asks a question.

    Args:
        context: Background information for answering
        question: The specific question to answer

    Returns:
        Formatted prompt string with {{argument}} interpolation
    """
    return f"""You are a helpful assistant. Use the following context to answer the question.

Context:
{context}

Question:
{question}

Instructions:
- Answer based solely on the provided context
- If the context does not contain the answer, say so
- Cite specific parts of the context when possible

Answer:"""
```

**Prompt Pattern Catalog**

| Pattern | Use Case | Template Structure |
|---------|----------|-------------------|
| QA | Answer questions from context | Context → Question → Answer |
| Summarize | Condense content | Content → Length → Summary |
| Extract | Structured data extraction | Content → Fields → Output format |
| Transform | Convert between formats | Input → Target format → Output |
| Analyze | Deep analysis | Data → Analysis type → Findings |
| Compare | Compare entities | Entity A → Entity B → Criteria → Comparison |
| Generate | Create content | Prompt → Constraints → Output |

**Multi-Message Prompt Pattern**
```python
@server.prompt()
def code_review(diff: str, language: str = "python") -> list[dict]:
    """Code review prompt returning multiple messages."""
    return [
        {"role": "system", "content": "You are an expert code reviewer."},
        {"role": "user", "content": f"Review this {language} code diff:\n\n{diff}"},
        {"role": "assistant", "content": "I will review the code for bugs, style issues, and security problems."},
    ]
```

### Step 6: Security Patterns

**Security Decision Tree by Transport**

```
Transport: stdio
├── Auth: None (process isolation)
├── Risks: OS-level (who can spawn the process)
└── Mitigation: Run as least-privilege OS user

Transport: SSE (local network)
├── Auth: Optional (if on localhost)
├── Risks: Internal network access
└── Mitigation: Bind to 127.0.0.1 only; API key if exposed

Transport: SSE (remote/Internet)
├── Auth: Required (API key or OAuth 2.0)
├── Risks: Internet exposure, injection, DDoS
└── Mitigation: TLS, rate limiting, input validation, audit logging

Transport: WebSocket
├── Auth: Required (JWT on connect or mTLS)
├── Risks: Persistent connection, message injection
└── Mitigation: Token validation per message, message size limits
```

**Authentication Implementation Patterns**

API Key Pattern (SSE):
```python
from fastapi import FastAPI, Header, HTTPException, Depends

app = FastAPI()

API_KEYS = {
    "sk-mcp-client-abc123": {"client": "client-a", "role": "admin"},
    "sk-mcp-client-def456": {"client": "client-b", "role": "viewer"},
}

async def verify_auth(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Must use Bearer scheme")
    key_info = API_KEYS.get(token)
    if not key_info:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key_info

@app.post("/messages")
async def handle_mcp(key_info: dict = Depends(verify_auth)):
    # key_info available for authorization checks
    return await mcp_server.handle_request()
```

JWT Pattern (WebSocket):
```python
import jwt

async def authenticate_websocket(websocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4001, reason="Token expired")
        return None
    except jwt.InvalidTokenError:
        await websocket.close(code=4001, reason="Invalid token")
        return None
```

**Authorization Patterns**

Role-Based Access Control:
```python
ROLES = {
    "admin": {"tools": "*", "resources": "*"},
    "operator": {"tools": ["read_*", "search_*", "write_*"], "resources": ["data://*"]},
    "viewer": {"tools": ["read_*", "search_*"], "resources": ["data://public/*"]},
}

def authorize_tool_call(client_role: str, tool_name: str) -> bool:
    permissions = ROLES.get(client_role, {})
    patterns = permissions.get("tools", [])
    return any(match_pattern(tool_name, p) for p in patterns)

def match_pattern(name: str, pattern: str) -> bool:
    if pattern == "*":
        return True
    if pattern.endswith("*"):
        return name.startswith(pattern[:-1])
    return name == pattern
```

Permission-Based Access:
```python
class PermissionRegistry:
    def __init__(self):
        self.grants = {}  # client_id -> {tool_name -> [operations]}

    def grant(self, client_id: str, tool: str, operations: list[str]):
        self.grants.setdefault(client_id, {})[tool] = operations

    def check(self, client_id: str, tool: str, operation: str = "call") -> bool:
        client_grants = self.grants.get(client_id, {})
        tool_grants = client_grants.get(tool, client_grants.get("*", []))
        return operation in tool_grants or "*" in tool_grants
```

**Input Validation Patterns**

Validate all tool parameters before execution:
```python
from pydantic import BaseModel, validator, Field

class DatabaseQueryParams(BaseModel):
    query: str = Field(..., description="SQL query")
    max_rows: int = Field(default=100, ge=1, le=10000)

    @validator("query")
    def prevent_destructive_operations(cls, v):
        dangerous = ["DROP", "DELETE", "ALTER", "TRUNCATE", "CREATE", "INSERT", "UPDATE"]
        upper = v.upper()
        blocked = [kw for kw in dangerous if kw in upper]
        if blocked:
            raise ValueError(f"Destructive operations not allowed: {', '.join(blocked)}")
        return v

class FilePathParams(BaseModel):
    path: str = Field(..., description="File path")

    @validator("path")
    def prevent_traversal(cls, v):
        normalized = os.path.normpath(v)
        if normalized.startswith("..") or normalized.startswith("/"):
            raise ValueError("Path traversal detected")
        if ".." in normalized:
            raise ValueError("Relative path traversal not allowed")
        return normalized
```

### Step 7: Client Integration Patterns

**Client Lifecycle**
```
1. Connect: Establish transport → send initialize handshake
2. Discover: List tools/resources/prompts available
3. Cache: Store discovered capabilities locally
4. Invoke: Call tools, read resources, get prompts
5. Monitor: Periodic health checks
6. Reconnect: On disconnect, retry with backoff
7. Shutdown: Graceful disconnect, cleanup resources
```

**Python Client Implementation**
```python
from mcp import Client, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client
import asyncio
import logging

logger = logging.getLogger(__name__)

class MCPClient:
    def __init__(self, name: str, transport_config: dict):
        self.name = name
        self.transport_config = transport_config
        self.session = None
        self.client = None
        self.transport = None
        self._tools_cache = None
        self._resources_cache = None

    async def connect(self):
        transport_type = self.transport_config.get("type", "stdio")
        if transport_type == "stdio":
            params = StdioServerParameters(
                command=self.transport_config["command"],
                args=self.transport_config.get("args", []),
                env=self.transport_config.get("env"),
            )
            transport = await stdio_client(params)
        elif transport_type == "sse":
            transport = await sse_client(
                url=self.transport_config["url"],
                headers=self.transport_config.get("headers", {}),
            )
        else:
            raise ValueError(f"Unsupported transport: {transport_type}")

        self.transport = transport
        async with transport as (read, write):
            self.client = Client()
            self.session = await self.client.connect(read, write)

    async def disconnect(self):
        if self.client:
            await self.client.close()
            self.client = None
            self.session = None
            self._tools_cache = None
            self._resources_cache = None

    async def list_tools(self, force_refresh: bool = False):
        if self._tools_cache is not None and not force_refresh:
            return self._tools_cache
        result = await self.session.list_tools()
        self._tools_cache = result.tools
        return self._tools_cache

    async def call_tool(self, tool_name: str, arguments: dict):
        try:
            result = await self.session.call_tool(tool_name, arguments)
            return result
        except Exception as e:
            logger.error(f"Tool call failed: {tool_name} - {e}")
            raise

    async def list_resources(self, force_refresh: bool = False):
        if self._resources_cache is not None and not force_refresh:
            return self._resources_cache
        result = await self.session.list_resources()
        self._resources_cache = result.resources
        return self._resources_cache

    async def read_resource(self, uri: str):
        result = await self.session.read_resource(uri)
        return result.contents
```

**Connection Pool for Multi-Server**
```python
class MCPConnectionPool:
    def __init__(self, max_size: int = 10):
        self.pool = {}
        self.max_size = max_size

    async def get_or_create(self, name: str, transport_config: dict) -> MCPClient:
        if name in self.pool:
            client = self.pool[name]
            if await self._is_healthy(client):
                return client
            await self.remove(name)

        client = MCPClient(name, transport_config)
        await client.connect()
        self.pool[name] = client
        return client

    async def remove(self, name: str):
        if name in self.pool:
            await self.pool[name].disconnect()
            del self.pool[name]

    async def _is_healthy(self, client: MCPClient) -> bool:
        try:
            await client.list_tools()
            return True
        except Exception:
            return False

    async def close_all(self):
        for name in list(self.pool.keys()):
            await self.remove(name)
```

**Retry with Exponential Backoff**
```python
class MCPRetryHandler:
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 30.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    async def call_with_retry(self, client: MCPClient, tool_name: str, arguments: dict):
        last_error = None
        for attempt in range(self.max_retries):
            try:
                return await client.call_tool(tool_name, arguments)
            except (ConnectionError, TimeoutError) as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    delay = min(self.base_delay * (2 ** attempt), self.max_delay)
                    logger.warning(f"Retry {attempt+1}/{self.max_retries} in {delay}s: {e}")
                    await asyncio.sleep(delay)
                    continue
            except Exception as e:
                if self._is_retryable(e):
                    last_error = e
                    if attempt < self.max_retries - 1:
                        delay = min(self.base_delay * (2 ** attempt), self.max_delay)
                        await asyncio.sleep(delay)
                        continue
                raise
        raise RuntimeError(f"All retries exhausted for {tool_name}: {last_error}")

    def _is_retryable(self, error: Exception) -> bool:
        return isinstance(error, (ConnectionError, TimeoutError, OSError))
```

**Tool Discovery & Routing**
```python
class MCPToolRouter:
    def __init__(self):
        self.tools = {}         # tool_name -> ToolDef
        self.server_map = {}    # tool_name -> server_name
        self.pool = None

    async def discover_all(self, pool: MCPConnectionPool, servers: dict):
        self.pool = pool
        for name, config in servers.items():
            client = await pool.get_or_create(name, config)
            server_tools = await client.list_tools()
            for tool in server_tools:
                self.tools[tool.name] = tool
                self.server_map[tool.name] = name

    async def route_call(self, tool_name: str, arguments: dict):
        server = self.server_map.get(tool_name)
        if not server:
            raise ValueError(f"Unknown tool: {tool_name}")
        client = self.pool.pool.get(server)
        if not client:
            raise RuntimeError(f"Server not connected: {server}")
        return await client.call_tool(tool_name, arguments)

    def find_tools(self, query: str):
        query = query.lower()
        return [
            {"name": n, "server": self.server_map[n], "description": t.description}
            for n, t in self.tools.items()
            if query in n.lower() or query in (t.description or "").lower()
        ]
```

### Step 8: Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **Monolithic Server** | One server does everything: tools, resources, prompts for unrelated domains | Split into domain-oriented servers |
| **Ignoring Error Handling** | Raw exceptions propagate to client, causing crashes or information leaks | Structured error responses with codes |
| **Sync-Only Design** | Blocking operations starve the event loop in async environments | Use async handlers; offload CPU work to thread pool |
| **Description-less Tools** | No description or "TODO" — LLM doesn't know when to use the tool | Always write 1-2 sentence descriptions |
| **Secret Leakage** | API keys, passwords in tool parameters or resource URIs | Validate and redact sensitive parameters |
| **Cached-forever Discovery** | Never refreshing tool/resource lists; stale capabilities | Cache with TTL; support force-refresh |
| **No Input Validation** | Assuming LLM always passes valid parameters | Validate every parameter against schema |
| **Empty Error Messages** | `return "Error"` with no context | Include error code, message, and suggested fix |
| **Overly Permissive Auth** | Single API key for all operations | Scope keys to least-privilege role |
| **No Rate Limiting** | Single client can exhaust server resources | Implement per-client and global rate limits |
| **Ignoring Transport Failures** | stdio: child process crashes silently. SSE: connection drops unhandled | Implement health checks, reconnect with backoff |
| **Too Many Parameters** | 10+ required tool parameters — LLM struggles | Reduce to ≤7; group complex inputs |
| **Missing Content Types** | All resources return `text/plain` regardless of content | Set appropriate MIME types per resource |

### Step 9: Production Operations

**Health Check Patterns**

stdio transport:
```python
@server.tool()
def health_check() -> str:
    """Return server health status. Call periodically to verify liveness."""
    return json.dumps({
        "status": "healthy",
        "uptime_seconds": time.time() - start_time,
        "tools_count": len(registered_tools),
        "memory_mb": get_memory_usage(),
        "version": "1.0.0",
    })
```

SSE transport (HTTP health endpoint):
```python
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "uptime": time.time() - start_time,
        "connected_clients": len(active_sessions),
        "tools_available": len(tool_registry),
        "memory_mb": get_memory_usage(),
    }

@app.get("/health/ready")
async def readiness():
    """True readiness check — verifies all dependencies are reachable."""
    deps = {
        "database": await check_db(),
        "vector_store": await check_vectorstore(),
        "cache": await check_cache(),
    }
    all_healthy = all(deps.values())
    return {
        "status": "ready" if all_healthy else "not_ready",
        "dependencies": deps,
    }
```

**Monitoring Metrics**
```python
class MCPMetrics:
    def __init__(self):
        self.tool_calls = Counter("mcp_tool_calls_total", "Total tool calls", ["tool", "status"])
        self.tool_duration = Histogram("mcp_tool_duration_ms", "Tool call duration", ["tool"])
        self.resource_reads = Counter("mcp_resource_reads_total", "Total resource reads", ["resource"])
        self.active_connections = Gauge("mcp_active_connections", "Active client connections")
        self.errors = Counter("mcp_errors_total", "Total errors", ["type"])

    def record_tool_call(self, tool: str, status: str, duration_ms: float):
        self.tool_calls.labels(tool=tool, status=status).inc()
        self.tool_duration.labels(tool=tool).observe(duration_ms)

    def record_error(self, error_type: str):
        self.errors.labels(type=error_type).inc()
```

**Scaling MCP Servers**

| Transport | Scaling Strategy | Considerations |
|-----------|-----------------|----------------|
| stdio | Vertical (more CPU/RAM). Multiple processes for multiple clients | No shared state; each process independent |
| SSE | Horizontal (more instances behind load balancer) | Stateless design; shared DB for state; sticky sessions optional |
| WebSocket | Horizontal with session affinity or shared state store | Redis pub/sub for broadcasting; state synchronization |

**Production Checklist**
- [ ] Health check endpoint (liveness + readiness)
- [ ] Rate limiting per client
- [ ] Request timeout configuration
- [ ] Structured logging (JSON format)
- [ ] Metrics exporter (Prometheus or OpenTelemetry)
- [ ] Graceful shutdown handler (SIGTERM/SIGINT)
- [ ] Resource limits (max request size, max concurrent calls)
- [ ] Audit logging for all tool invocations
- [ ] TLS/HTTPS for remote transports
- [ ] Startup dependency verification

**SSE Production Configuration**
```yaml
mcp_server:
  transport: sse
  host: 0.0.0.0
  port: 8000
  tls:
    enabled: true
    cert: /etc/certs/server.crt
    key: /etc/certs/server.key
  rate_limiting:
    default: 100/minute
    burst: 20
  timeouts:
    request: 30s
    idle_connection: 300s
  cors:
    origins: ["https://app.example.com"]
  logging:
    level: INFO
    format: json
    audit: true
  health:
    liveness: /health
    readiness: /health/ready
```

### Step 10: Transport Layer Deep Dive

**stdio Transport — Full Implementation**
```python
# server.py
from mcp.server.fastmcp import FastMCP
import sys

server = FastMCP("local-tools", transport="stdio")

@server.tool()
def echo(message: str) -> str:
    return f"Echo: {message}"

if __name__ == "__main__":
    # Graceful shutdown on SIGTERM/SIGINT
    try:
        server.run()
    except KeyboardInterrupt:
        server.cleanup()
        sys.exit(0)
```

```python
# client.py — Manual stdio integration
import subprocess
import json
import sys

class StdioMCPClient:
    def __init__(self, command: str, args: list[str] | None = None):
        self.process = subprocess.Popen(
            [command] + (args or []),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line-buffered
        )
        self.request_id = 0

    def _send(self, method: str, params: dict | None = None):
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params or {},
        }
        self.process.stdin.write(json.dumps(request) + "\n")
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            stderr = self.process.stderr.read()
            raise ConnectionError(f"Server process died: {stderr}")
        return json.loads(line)

    def list_tools(self):
        return self._send("tools/list").get("result", {}).get("tools", [])

    def call_tool(self, name: str, arguments: dict):
        return self._send("tools/call", {"name": name, "arguments": arguments})

    def close(self):
        self.process.terminate()
        self.process.wait(timeout=5)
```

**SSE Transport — Full Production Setup**
```python
# server.py — SSE with Uvicorn
from mcp.server.fastmcp import FastMCP
import uvicorn

server = FastMCP("production-server", transport="sse")

@server.tool()
def search(query: str) -> str:
    return perform_search(query)

app = server.create_app()  # FastAPI app for wrapping

# Add middleware: auth, rate limiting, CORS
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    process_time = time.time() - start
    response.headers["X-Process-Time"] = str(process_time)
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**WebSocket Transport — Full Implementation**
```python
import asyncio
import json
import websockets
from mcp.server import Server
from mcp.server.models import InitializationOptions

server = Server("ws-server")

# Define tools/resources as usual
@server.list_tools()
async def list_tools():
    return [...]

async def handler(websocket):
    # Authenticate on connect
    token = websocket.query_params.get("token")
    if not validate_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    async for message in websocket:
        try:
            request = json.loads(message)
            response = await server.handle_request(request)
            await websocket.send(json.dumps(response))
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error"}
            }))

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # Run forever

asyncio.run(main())
```

## Rules
- Always include descriptions on every tool — LLMs use them for routing.
- Tool names must be snake_case, no spaces or special chars.
- Error responses must be structured, not raw exceptions.
- Resources must define URI scheme and MIME type.
- Never expose secrets in tool parameters or resource URIs.
- SSE transport requires readiness to handle reconnection.
- Always validate tool parameters before execution.
- Use least-privilege authorization for all operations.
- Implement rate limiting for all remote transports.
- Never hardcode secrets — use environment variables or vault.
- Cache tool/resource discovery with TTL, support force-refresh.
- Always implement graceful shutdown for clean resource cleanup.
- Log all security-relevant events (auth failures, permission denials).
- Use structured error codes, not free-text error messages.

## References
  - references/mcp-architecture.md — MCP Architecture & Protocol
  - references/mcp-client-integration.md — MCP Client Integration
  - references/mcp-patterns-advanced.md — MCP Scaling, Operations & Advanced Patterns
  - references/mcp-patterns-fundamentals.md — MCP Pattern Fundamentals: Transport, Tools, Resources, Prompts
  - references/mcp-security-patterns.md — MCP Security Patterns
  - references/mcp-servers.md — Building MCP Servers & Client Integration
  - references/mcp-production-operations.md — MCP Production Operations & Scaling
  - references/mcp-antipatterns.md — MCP Anti-Patterns & Common Mistakes
  - references/server-implementation.md — MCP Server Implementation Guide
  - references/transport-options.md — MCP Transport Options

## Handoff
For LangChain agent integration with MCP tools, hand off to `ai-langchain-patterns`. For observability setup, hand off to `ai-observability`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive Model Context Protocol architecture & patterns)
Strict compliance with MCP server design, transport layers, security profiles, and tool execution.
-->

