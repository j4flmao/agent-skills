# MCP Server Implementation Guide

## Server Setup Patterns

### FastMCP (Python, Recommended)
```python
from mcp.server.fastmcp import FastMCP

server = FastMCP(
    "knowledge-base",
    transport="stdio",
    version="1.0.0",
    description="Knowledge base MCP server"
)

@server.tool(description="Search documents by query")
def search(query: str, limit: int = 10) -> str:
    """Search indexed documents."""
    results = vectorstore.similarity_search(query, k=limit)
    return "\n\n".join(doc.page_content for doc in results)

if __name__ == "__main__":
    server.run()
```

### Low-Level SDK (Python)
```python
from mcp.server import Server
import mcp.server.stdio
from mcp.types import Tool, TextContent

server = Server("knowledge-base")

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    return [Tool(
        name="search",
        description="Search documents",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "default": 10}
            },
            "required": ["query"]
        }
    )]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "search":
        results = vectorstore.similarity_search(
            arguments["query"],
            k=arguments.get("limit", 10)
        )
        text = "\n\n".join(doc.page_content for doc in results)
        return [TextContent(type="text", text=text)]
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with mcp.server.stdio.stdio_server() as (read, write):
        await server.run(read, write)
```

### TypeScript/Node.js
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "knowledge-base", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "search",
    description: "Search documents",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 10 }
      },
      required: ["query"]
    }
  }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Resource Implementation

### Static Resources
```python
@server.resource("config://app/settings")
def get_settings() -> str:
    """Return application configuration."""
    return read_file("config/settings.json")
```

### Dynamic Resources
```python
@server.resource("docs://{path}")
def get_document(path: str) -> str:
    """Read document by path. Prevents directory traversal."""
    safe_path = os.path.normpath(os.path.join("docs", path))
    if not safe_path.startswith("docs"):
        raise ValueError("Invalid path")
    return read_file(safe_path)
```

## Prompt Templates

```python
@server.prompt()
def qa_template(context: str, question: str) -> str:
    """QA prompt template with context injection."""
    return f"Context:\n{context}\n\nQuestion:\n{question}\n\nAnswer:"
```

## Error Handling

```python
@server.tool()
def fragile_operation(input_data: str) -> str:
    """Handle errors gracefully."""
    try:
        if not input_data:
            return "Error: input_data is required"
        result = process(input_data)
        return json.dumps({"success": True, "data": result})
    except ValueError as e:
        return json.dumps({"success": False, "error": str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return json.dumps({"success": False, "error": "Internal server error"})
```

## Testing

### Unit Test with Mock Transport
```python
async def test_search_tool():
    transport = MockTransport()
    server = create_server()
    await server.connect(transport)
    result = await server.call_tool("search", {"query": "test"})
    assert result is not None
    assert len(result) > 0
```

### Integration Test
```bash
# Using MCP inspector
npx @modelcontextprotocol/inspector python server.py

# Manual test via stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | python server.py
```

## Deployment

### stdio Deployment
- Package as pip/npm package
- Install in target environment
- Host app launches as subprocess
- No network configuration needed

### SSE Deployment
- Deploy as web service
- Behind reverse proxy (nginx)
- Enable HTTPS in production
- Add rate limiting middleware
- Health check endpoint at /health

### Docker Deployment
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY server.py .
EXPOSE 8000
CMD ["python", "server.py"]
```
