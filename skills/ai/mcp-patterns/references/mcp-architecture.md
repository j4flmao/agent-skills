# MCP Architecture & Protocol

## Overview

Model Context Protocol (MCP) is a standard protocol for communication between LLM applications and external tools/resources/prompts. It defines a server-client architecture with a JSON-RPC message format.

## Protocol Structure

MCP uses JSON-RPC 2.0 over a transport layer. Messages are structured as:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

### Server Lifecycle
1. **Initialize**: Client sends `initialize` with protocol version and capabilities
2. **List**: Client calls `tools/list`, `resources/list`, `prompts/list` to discover capabilities
3. **Call**: Client calls `tools/call`, `resources/read`, `prompts/get` for operations
4. **Shutdown**: Clean disconnect

### Client Lifecycle
1. **Connect**: Establish transport and send initialize
2. **Discover**: Fetch available tools, resources, prompts
3. **Invoke**: Call specific tools/resources/prompts
4. **Disconnect**: Graceful shutdown

## Transports

### stdio Transport
Server runs as a child process. Communication via stdin/stdout. Fast, secure (no network exposure).

```python
# Server side
server = FastMCP("my-server", transport="stdio")

# Client side
client = Client("my-server", transport="stdio")
```

Pros: simplest, no auth needed, lowest latency. Cons: local only, one client.

### SSE (Server-Sent Events) Transport
Server exposes HTTP endpoints. Client connects via SSE for server-to-client messages and HTTP POST for client-to-server.

```
GET /sse  → SSE stream (server → client)
POST /messages → JSON-RPC messages (client → server)
```

Pros: remote access, multiple clients. Cons: network latency, needs auth in production.

### Remote MCP Transport
SSE + authentication layer. Adds API key validation or OAuth 2.0 flow. Endpoint discovery via well-known URL.

```python
server = FastMCP("my-server", transport="sse", host="0.0.0.0", port=8000)
```

## Capabilities

### Tools
Functions that LLMs can invoke. Defined by:
- name: snake_case identifier
- description: natural language description for LLM routing
- inputSchema: JSON Schema defining parameters
- output: string or structured content

CLI-based MCP servers let the LLM control local tools (shell, filesystem, database).

### Resources
Data exposed to LLMs via URI scheme. Two types:
- **Static**: Fixed content at a URI (`config://app/settings`)
- **Dynamic**: URI template with parameters (`db://{table}/schema`)

Resources have MIME types for content negotiation.

### Prompts
Server-side prompt templates with argument interpolation. Arguments defined by: name, type (string/number), required flag, description. Template uses `{{argument}}` syntax.

## Response Types

All tool/resource/prompts responses use `Content` types:

```json
{
  "content": [
    {"type": "text", "text": "result"},
    {"type": "resource", "resource": {"uri": "file://result.txt", "text": "content"}}
  ],
  "isError": false
}
```

## Error Handling

Errors return structured response with `isError: true` and descriptive message. Never return raw exceptions.

```json
{
  "content": [{"type": "text", "text": "Error: tool failed - insufficient permissions"}],
  "isError": true
}
```

## Notifications

Server can send notifications to client without request. Used for: resource updates, tool list changes, prompt updates. Client subscribes to specific resources for change notifications.

## Rate Limiting

SSE/remote servers should implement rate limiting. Per-client or global limits. Return 429 or structured error on limit exceeded.
