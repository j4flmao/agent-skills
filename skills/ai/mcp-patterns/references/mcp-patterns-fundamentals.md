# MCP Pattern Fundamentals: Transport, Tools, Resources, Prompts

## Overview
Model Context Protocol (MCP) is a JSON-RPC 2.0-based protocol for communication between LLM applications and external tools, resources, and prompt templates. This reference covers the fundamental building blocks of MCP server and client design.

## Core Concepts

### JSON-RPC 2.0 Message Format
Every MCP message follows JSON-RPC 2.0 structure:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

Error response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {...}
  }
}
```

### Protocol Lifecycle

**Server Lifecycle:**
1. **Initialize**: Create server instance, register capabilities
2. **Transport Start**: Open transport (stdio process, SSE listener, WebSocket)
3. **Handle Requests**: Listen for and respond to client requests
4. **Notifications**: Optionally send resource/tool change notifications
5. **Shutdown**: Clean up resources, close transport

**Client Lifecycle:**
1. **Connect**: Establish transport, send `initialize` with protocol version and capabilities
2. **Discover**: Call `tools/list`, `resources/list`, `prompts/list` to discover server capabilities
3. **Cache**: Store discovered capabilities locally with TTL
4. **Invoke**: Call tools, read resources, get prompts as needed
5. **Reconnect**: On disconnect, retry with exponential backoff
6. **Shutdown**: Send graceful disconnect, clean up

### Capabilities
Servers advertise capabilities during initialization:
- `tools`: Server exposes callable tools
- `resources`: Server exposes readable resources
- `prompts`: Server exposes prompt templates
- `notifications`: Server supports change notifications

## Transport Layer

### stdio Transport

**Architecture:**
```
Host App (Client) ←stdout── MCP Server (child process)
                 ──stdin──→
```

**Characteristics:**
- Fastest transport (process-level IPC, no network overhead)
- Most secure (no network exposure, OS-level isolation)
- Single client per server process
- Local machine only
- No authentication needed

**Server (Python/FastMCP):**
```python
from mcp.server.fastmcp import FastMCP

server = FastMCP("my-server", transport="stdio")

@server.tool()
def my_tool(query: str) -> str:
    return process_query(query)

if __name__ == "__main__":
    server.run()
```

**Server (Python/Low-Level SDK):**
```python
from mcp.server import Server
import mcp.server.stdio
from mcp.types import Tool, TextContent

server = Server("my-server")

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    return [Tool(
        name="my_tool",
        description="Process a query",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query to process"}
            },
            "required": ["query"]
        }
    )]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "my_tool":
        result = process_query(arguments["query"])
        return [TextContent(type="text", text=result)]
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with mcp.server.stdio.stdio_server() as (read, write):
        await server.run(read, write)
```

**Server (TypeScript/Node.js):**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "my-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "my_tool",
    description: "Process a query",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Query to process" }
      },
      required: ["query"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "my_tool") {
    const result = processQuery(request.params.arguments?.query);
    return { content: [{ type: "text", text: result }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Client:**
```python
from mcp import Client, StdioServerParameters
from mcp.client.stdio import stdio_client

params = StdioServerParameters(
    command="python",
    args=["server.py"],
)

async with stdio_client(params) as (read, write):
    client = Client()
    session = await client.connect(read, write)

    tools = await session.list_tools()
    result = await session.call_tool("my_tool", {"query": "hello"})
```

### SSE Transport

**Architecture:**
```
Client ──POST /message──→ MCP Server (HTTP)
       ←───SSE /sse──────
```

**Characteristics:**
- Remote access over HTTP
- Multiple concurrent clients
- Server-to-client push via SSE
- Client-to-server via HTTP POST
- Requires authentication in production

**Server:**
```python
from mcp.server.fastmcp import FastMCP
import uvicorn

server = FastMCP("my-server", transport="sse", host="0.0.0.0", port=8000)

@server.tool()
def search(query: str) -> str:
    return perform_search(query)

if __name__ == "__main__":
    uvicorn.run(server.create_app(), host="0.0.0.0", port=8000)
```

**Client:**
```python
from mcp.client.sse import sse_client

async with sse_client(url="http://localhost:8000/sse") as (read, write):
    client = Client()
    session = await client.connect(read, write)
    tools = await session.list_tools()
    result = await session.call_tool("search", {"query": "test"})
```

### WebSocket Transport

**Architecture:**
```
Client ←──WebSocket──→ MCP Server
       bidirectional
```

**Characteristics:**
- Full bidirectional streaming
- Lower latency than SSE
- Persistent connection
- Good for real-time notifications
- Requires custom implementation (not in SDK natively)

### Transport Selection Matrix

| Criteria | stdio | SSE | WebSocket |
|----------|-------|-----|-----------|
| Latency | Lowest | Low-Medium | Low |
| Security | Highest (no network) | Medium (needs auth) | Medium (needs auth) |
| Concurrent clients | 1 | Many | Many |
| Network required | No | Yes | Yes |
| Bidirectional | No (request-response) | Partial (SSE + POST) | Yes (full duplex) |
| Reconnection | Process restart | SSE built-in | Custom |
| Proxy-friendly | N/A | Yes (HTTP) | Sometimes blocked |
| SDK support | Native | Native | Custom |
| Best for | Local tools, CLI, IDE | Web apps, remote APIs | Real-time streaming |

## Tool Design Fundamentals

### Tool Registration

**FastMCP decorator pattern:**
```python
@server.tool(description="Search documents by query text")
def search_documents(
    query: str,
    max_results: int = 10,
    category: str | None = None
) -> str:
    """Search the indexed document collection.

    Args:
        query: Natural language search phrase
        max_results: Number of results to return (1-50)
        category: Optional filter category

    Returns:
        Formatted search results with relevance scores
    """
    results = vectorstore.similarity_search(query, k=max_results)
    return format_results(results)
```

**Low-level registration pattern:**
```python
TOOL_DEFINITIONS = {
    "search_documents": {
        "name": "search_documents",
        "description": "Search documents by query text",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language search phrase"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of results (1-50)",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 50
                }
            },
            "required": ["query"]
        }
    }
}

async def handle_call_tool(name: str, arguments: dict):
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return [TextContent(type="text", text=json.dumps({
            "error": f"Unknown tool: {name}",
            "code": "NOT_FOUND"
        }))]
    try:
        result = await handler(**arguments)
        return [TextContent(type="text", text=result)]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({
            "error": str(e),
            "code": "EXECUTION_ERROR"
        }))]
```

### Tool Schema Requirements
Every tool definition must include:
1. **name**: snake_case, unique within server, descriptive of function
2. **description**: 1-2 sentences. Critical — LLMs use this to decide when to call the tool
3. **inputSchema**: JSON Schema object with typed, validated properties
4. **output**: Return structured content (JSON string recommended for complex data)

### Parameter Design Rules
- 1-2 required parameters. Add optional params with defaults.
- Use `description` on every parameter — LLMs read them.
- Use `enum` for constrained string values.
- Use `minimum`/`maximum` for numeric bounds.
- Use `pattern` for string format validation.
- Use `default` for optional parameters.
- Never use sensitive data (passwords, tokens) as tool parameters.

### Error Handling Fundamentals

Always return structured errors — never throw raw exceptions:

```python
@server.tool()
def divide(dividend: float, divisor: float) -> str:
    """Divide two numbers."""
    if divisor == 0:
        return json.dumps({
            "success": False,
            "error": "Cannot divide by zero",
            "code": "DIVISION_BY_ZERO"
        })
    return json.dumps({
        "success": True,
        "result": dividend / divisor
    })
```

Standard error codes:
| Code | Meaning | When |
|------|---------|------|
| `MISSING_PARAMETER` | Required arg not provided | Before execution |
| `VALIDATION_ERROR` | Arg fails constraints | Before execution |
| `PERMISSION_DENIED` | Client not authorized | Before execution |
| `RATE_LIMITED` | Too many requests | Before execution |
| `NOT_FOUND` | Tool/resource not found | During lookup |
| `EXECUTION_ERROR` | Operation failed | During execution |
| `TIMEOUT` | Operation timed out | During execution |
| `INTERNAL_ERROR` | Unexpected server failure | During execution |

## Resource Design Fundamentals

### URI Scheme Convention
```
{scheme}://{authority}/{path}
```

Standard schemes: `file://`, `db://`, `api://`, `config://`, `docs://`, `data://`, `log://`, `metrics://`

### Static Resources
Content is fixed — same value every time it's read:
```python
@server.resource("config://app/settings")
def get_settings() -> str:
    return json.dumps(read_config_file())
```

### Dynamic Resources
Content depends on URI parameters:
```python
@server.resource("docs://{path}")
def get_document(path: str) -> str:
    safe_path = os.path.normpath(os.path.join(BASE_DIR, path))
    if not safe_path.startswith(BASE_DIR):
        return "Error: Invalid path"
    if not os.path.exists(safe_path):
        return "Error: Document not found"
    return read_file(safe_path)
```

### Resource Templates
URI templates with multiple parameters:
```python
@server.resource("api://{version}/{resource}/{id}")
def get_api_resource(version: str, resource: str, id: str) -> str:
    data = fetch_from_api(version, resource, id)
    return json.dumps(data)
```

### MIME Types
Always specify the MIME type for content negotiation:
```python
@server.resource("data://report/{id}")
def get_report(id: str) -> str:
    return json.dumps(generate_report(id))

# MIME type defaults:
# - .json → application/json
# - .md → text/markdown
# - .txt → text/plain
# - .html → text/html
# - .csv → text/csv
```

## Prompt Template Fundamentals

### Template Structure
Prompts are server-side templates that produce messages for the LLM:

```python
@server.prompt()
def qa_template(context: str, question: str) -> str:
    """QA prompt with context injection.

    Args:
        context: Background information
        question: The question to answer

    Returns:
        Formatted prompt string
    """
    return f"""Using the following context, answer the question.

Context:
{context}

Question:
{question}

Instructions:
- Answer based only on the provided context
- If the context doesn't contain the answer, say so
- Be concise and specific

Answer:"""
```

### Multi-Message Prompt Pattern
Return a list of message dicts for structured conversations:
```python
@server.prompt()
def review_prompt(code: str, language: str) -> list[dict]:
    """Code review prompt with system and user messages."""
    return [
        {
            "role": "system",
            "content": f"You are an expert {language} code reviewer. "
                        "Focus on bugs, security, and best practices."
        },
        {
            "role": "user",
            "content": f"Review this {language} code:\n\n```{language}\n{code}\n```"
        }
    ]
```

### Argument Definition Pattern
Arguments are defined by name, type, required flag, and description:
```python
@server.prompt()
def summarize(content: str, max_length: int = 200, format: str = "paragraph") -> str:
    """Summarization prompt.

    Args:
        content: Text to summarize (required)
        max_length: Maximum summary length in words (optional, default 200)
        format: Output format: paragraph, bullet_points, or json (optional)
    """
    format_instructions = {
        "paragraph": "Write a coherent paragraph.",
        "bullet_points": "Use bullet points.",
        "json": "Return a JSON object with 'summary' and 'key_points' fields.",
    }
    return f"""Summarize the following text in at most {max_length} words.

{format_instructions.get(format, format_instructions["paragraph"])}

Text:
{content}

Summary:"""
```

## Response Content Types

### Text Content
```python
from mcp.types import TextContent

return [TextContent(type="text", text="Plain text result")]
```

### Resource Content
Embed another resource in the response:
```python
from mcp.types import EmbeddedResource

return [EmbeddedResource(
    type="resource",
    resource={
        "uri": "file://result.txt",
        "mimeType": "text/plain",
        "text": "Resource content"
    }
)]
```

### Combined Content
Return multiple content items:
```python
@server.tool()
def analyze(text: str) -> list:
    """Analyze text and return both analysis and reference."""
    return [
        TextContent(type="text", text=json.dumps(analyze_text(text))),
        EmbeddedResource(type="resource", resource={
            "uri": "docs://analysis-guide",
            "mimeType": "text/markdown",
            "text": "# Analysis Guide\n..."})
    ]
```

## Notification Fundamentals

Servers can send unsolicited notifications to clients:
- `notifications/resources/list_changed` — Resource list updated
- `notifications/tools/list_changed` — Tool list updated  
- `notifications/prompts/list_changed` — Prompt list updated

Use cases:
- Resource content changes (re-fetch on notification)
- Tool availability changes
- Server state transitions

## Key Points
- MCP uses JSON-RPC 2.0 for all message exchange
- Transport selection determines security, latency, and concurrency profile
- Always include descriptions on every tool, parameter, resource, and prompt
- Return structured errors with codes — never raw exceptions
- Resources use URI schemes with consistent naming and MIME types
- Prompts are server-side templates that produce LLM messages
- Cache discovered capabilities client-side to reduce round trips
- Validate all inputs before execution
- Handle transport disconnections with reconnection logic
