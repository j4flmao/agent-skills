# Building MCP Servers & Client Integration

## Server Implementation

### Python with FastMCP

```python
from mcp.server.fastmcp import FastMCP

server = FastMCP("my-server", transport="stdio")

@server.tool(description="Search the knowledge base")
def search(query: str, limit: int = 10) -> str:
    """Search indexed documents by query text."""
    results = vectorstore.similarity_search(query, k=limit)
    return "\n\n".join([r.page_content for r in results])

@server.resource("docs://{path}")
def get_doc(path: str) -> str:
    """Read a documentation file."""
    return read_file(f"docs/{path}.md")

@server.prompt()
def qa_template(context: str, question: str) -> str:
    return f"Context: {context}\n\nQuestion: {question}\n\nAnswer:"
```

### Python with Low-Level SDK

```python
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio

server = Server("my-server")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [types.Tool(
        name="my_tool",
        description="Tool description",
        inputSchema={"type": "object", "properties": {...}}
    )]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    result = process(arguments)
    return [types.TextContent(type="text", text=result)]
```

### TypeScript/Node.js

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "my-server", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "search", description: "...", inputSchema: {...} }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Security

### Authentication Levels
- **None**: stdio only. No network exposure.
- **API Key**: Header `Authorization: Bearer <key>`. For SSE transport.
- **OAuth 2.0**: Client credentials flow for machine-to-machine. Authorization code flow for user-facing.

### Authorization
Scope tools per client. Tools array whitelist per API key. Implement `authorize_tool(client_id, tool_name)` check before execution.

### Input Validation
Validate all inputs against JSON Schema before execution. Sanitize file paths in resource URIs. Prevent path traversal.

## Client Integration

### Python Client

```python
from mcp import Client

client = Client("my-server", transport="stdio")
await client.connect()
tools = await client.list_tools()
result = await client.call_tool("search", {"query": "hello", "limit": 5})
await client.disconnect()
```

### Integration with LangChain

```python
from langchain_mcp import MCPTool

# Load tools from MCP server
mcp_tools = await MCPTool.from_server("my-server", transport="stdio")

# Use in LangChain agent
agent = create_tool_calling_agent(llm, mcp_tools, prompt)
```

### Integration with OpenAI

```python
import json

# List tools from MCP and convert to OpenAI format
mcp_tools_response = await client.list_tools()
openai_tools = [{
    "type": "function",
    "function": {
        "name": t.name,
        "description": t.description,
        "parameters": t.inputSchema
    }
} for t in mcp_tools_response.tools]
```

## Testing

Use `mcp-cli` for testing:
```bash
npx @modelcontextprotocol/inspector my-server
```

Write unit tests with mock transport. Test error scenarios. Validate schema conformance.

## Deployment

- **stdio**: Package as CLI tool, install globally
- **SSE**: Deploy as web service behind reverse proxy (nginx). Add rate limiting. Enable HTTPS.
- **Docker**: Multi-stage build, minimal base image, non-root user
- **Kubernetes**: Deploy SSE server with horizontal autoscaling

## Monitoring

Add health check endpoint for SSE. Log all tool invocations with metadata. Export metrics (calls, latency, errors) for observability platform integration.
