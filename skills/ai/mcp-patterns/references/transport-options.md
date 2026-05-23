# MCP Transport Options

## Transport Comparison

| Transport | Latency | Security | Client Count | Network | Best For |
|-----------|---------|----------|--------------|---------|----------|
| stdio | Lowest | Highest | 1 | No | Local tools, CLI |
| SSE | Low-Medium | Medium | Many | Yes | Remote services |
| WebSocket | Low | Medium | Many | Yes | Bidirectional streaming |
| HTTP Long Poll | Medium | Medium | Many | Yes | Restricted networks |

## stdio Transport

### Architecture
```
Host App ──stdin──→ MCP Server (child process)
         ←──stdout──
```

### Implementation
```python
# Server side
server = FastMCP("my-server", transport="stdio")

# Client side (host app)
import subprocess
import json

process = subprocess.Popen(
    ["python", "mcp_server.py"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True
)

def send_request(method, params=None):
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }
    process.stdin.write(json.dumps(request) + "\n")
    process.stdin.flush()
    response = process.stdout.readline()
    return json.loads(response)
```

### Security Properties
- No network exposure
- Process-level isolation
- OS user permissions apply
- No authentication needed
- Cannot be accessed remotely

### Limitations
- Single client per server process
- Local machine only
- Process lifecycle management required
- No horizontal scaling

## SSE (Server-Sent Events) Transport

### Architecture
```
Client ──POST /message──→ MCP Server
       ←───SSE /sse──────
```

### Server Implementation
```python
from mcp.server.fastmcp import FastMCP

server = FastMCP("my-server", transport="sse", host="0.0.0.0", port=8000)
```

### Client Connection
```python
import httpx
import sseclient

async def connect_sse(server_url: str):
    async with httpx.AsyncClient() as client:
        # Connect to SSE stream
        async with client.stream("GET", f"{server_url}/sse") as stream:
            events = sseclient.SSEClient(stream)
            for event in events:
                if event.event == "message":
                    yield event.data

    # Send requests via POST
    response = await client.post(
        f"{server_url}/messages",
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
    )
```

### Authentication
```python
# API Key validation middleware
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

@app.post("/messages")
async def handle_message(
    body: dict,
    authorization: str = Header(None)
):
    if not validate_api_key(authorization):
        raise HTTPException(status_code=401)
    # Forward to MCP server
    return await mcp_server.handle_request(body)
```

### Production Configuration
```yaml
server:
  transport: "sse"
  host: "0.0.0.0"
  port: 8000
  ssl:
    enabled: true
    cert_path: "/etc/certs/server.crt"
    key_path: "/etc/certs/server.key"
  rate_limiting:
    enabled: true
    max_requests_per_minute: 1000
  cors:
    allowed_origins: ["https://app.example.com"]
```

## WebSocket Transport

### When to Use
- Bidirectional streaming needed
- Persistent connection required
- Real-time notifications
- Lower latency than SSE

### Implementation Sketch
```python
import asyncio
import websockets

async def handle_websocket(websocket, path):
    async for message in websocket:
        request = json.loads(message)
        response = await mcp_server.handle_request(request)
        await websocket.send(json.dumps(response))
```

## Transport Selection Guide

| Scenario | Recommended Transport |
|----------|---------------------|
| Local CLI tool | stdio |
| VS Code extension | stdio |
| Web application | SSE |
| Mobile client | SSE with auth |
| Real-time streaming | WebSocket |
| Corporate proxy | SSE (HTTP only) |
| High-security env | stdio (no network) |
| Multi-tenant SaaS | SSE with rate limiting |

## Handling Disconnections

### stdio
- Process crashes → restart with backoff
- Host app crash → server processes die
- Implement graceful shutdown signal handling

### SSE
- Client disconnect → server detects via closed connection
- Reconnect with exponential backoff
- Maintain session state for reconnection
- Implement heartbeat/ping every 30s
