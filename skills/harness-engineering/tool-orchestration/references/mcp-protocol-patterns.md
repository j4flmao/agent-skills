# MCP Protocol Patterns

## Model Context Protocol Overview

The Model Context Protocol (MCP) is the standardized communication layer between AI agents (clients) and external tool providers (servers). It defines a JSON-RPC 2.0 based message format for tool discovery, capability negotiation, tool invocation, and result streaming. This reference covers the complete MCP lifecycle from transport selection through capability exchange to production-grade server and client implementations.

```
+-------------------+                    +-------------------+
|                   |   JSON-RPC 2.0     |                   |
|    MCP Client     | ◄────────────────► |    MCP Server     |
|  (Agent Runtime)  |                    |  (Tool Provider)  |
|                   |   Transport:       |                   |
|  - Claude Code    |   - stdio          |  - File System    |
|  - Cursor         |   - HTTP+SSE       |  - Database       |
|  - Custom Agent   |   - Streamable HTTP|  - API Gateway    |
+-------------------+                    +-------------------+
```

---

## Transport Layer Selection

MCP supports multiple transport mechanisms. The choice depends on deployment topology, latency requirements, and security constraints.

### Transport Comparison Matrix

| Transport | Use Case | Latency | Security | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **stdio** | Local processes, IDE extensions | Lowest (~1ms) | Process isolation | Low |
| **HTTP+SSE** | Remote servers, cloud-hosted tools | Medium (~50ms) | TLS, auth headers | Medium |
| **Streamable HTTP** | Stateless deployments, serverless | Medium (~50ms) | TLS, auth headers | Medium |

### stdio Transport

The simplest transport: the MCP client spawns the server as a child process and communicates via stdin/stdout pipes. Each JSON-RPC message is delimited by newlines.

```python
import subprocess
import json
import sys
from typing import Any, Optional


class StdioMCPTransport:
    """
    Manages a stdio-based MCP transport connection.
    
    The client spawns the server process and sends JSON-RPC messages
    via stdin, reading responses from stdout. stderr is captured for
    diagnostics.
    """

    def __init__(self, server_command: list[str], env: Optional[dict] = None):
        self.server_command = server_command
        self.env = env
        self.process: Optional[subprocess.Popen] = None
        self._request_id = 0

    def connect(self) -> None:
        """Spawn the MCP server process."""
        self.process = subprocess.Popen(
            self.server_command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=self.env,
            text=True,
            bufsize=1  # Line-buffered
        )
        print(f"[MCP] Server spawned: PID={self.process.pid}", file=sys.stderr)

    def send_message(self, method: str, params: Optional[dict] = None) -> dict:
        """Send a JSON-RPC request and read the response."""
        if not self.process or self.process.poll() is not None:
            raise ConnectionError("MCP server process is not running")

        self._request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
        }
        if params:
            request["params"] = params

        request_line = json.dumps(request) + "\n"
        self.process.stdin.write(request_line)
        self.process.stdin.flush()

        response_line = self.process.stdout.readline()
        if not response_line:
            raise ConnectionError("MCP server closed stdout")

        response = json.loads(response_line.strip())
        if "error" in response:
            raise RuntimeError(
                f"MCP error {response['error']['code']}: {response['error']['message']}"
            )

        return response.get("result", {})

    def close(self) -> None:
        """Terminate the server process gracefully."""
        if self.process:
            self.process.stdin.close()
            self.process.wait(timeout=5)
            print(f"[MCP] Server terminated: PID={self.process.pid}", file=sys.stderr)


# Usage example
if __name__ == "__main__":
    transport = StdioMCPTransport(
        server_command=["node", "dist/mcp-server.js"],
        env={"NODE_ENV": "production"}
    )
    transport.connect()

    # Initialize handshake
    init_result = transport.send_message("initialize", {
        "protocolVersion": "2025-03-26",
        "capabilities": {
            "tools": {"listChanged": True}
        },
        "clientInfo": {
            "name": "my-agent",
            "version": "1.0.0"
        }
    })
    print(f"Server capabilities: {json.dumps(init_result, indent=2)}")

    # Send initialized notification
    transport.send_message("notifications/initialized")

    transport.close()
```

### HTTP+SSE Transport

For remote MCP servers, the client connects via HTTP for sending requests and Server-Sent Events (SSE) for receiving responses and notifications.

```typescript
import { EventSource } from "eventsource";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class HttpSseMCPTransport {
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >();
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authToken = authToken;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sseUrl = `${this.baseUrl}/sse`;
      this.eventSource = new EventSource(sseUrl, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      } as any);

      this.eventSource.addEventListener("message", (event: MessageEvent) => {
        const response: JsonRpcResponse = JSON.parse(event.data);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          if (response.error) {
            pending.reject(
              new Error(`MCP error ${response.error.code}: ${response.error.message}`)
            );
          } else {
            pending.resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      });

      this.eventSource.addEventListener("open", () => {
        console.log("[MCP] SSE connection established");
        resolve();
      });

      this.eventSource.addEventListener("error", (err: Event) => {
        console.error("[MCP] SSE connection error", err);
        reject(new Error("SSE connection failed"));
      });
    });
  }

  async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    this.requestId++;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.requestId,
      method,
      params,
    };

    const promise = new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(this.requestId, { resolve, reject });

      // Set timeout for pending requests
      setTimeout(() => {
        if (this.pendingRequests.has(this.requestId)) {
          this.pendingRequests.delete(this.requestId);
          reject(new Error(`Request ${this.requestId} timed out after 30s`));
        }
      }, 30_000);
    });

    const response = await fetch(`${this.baseUrl}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return promise;
  }

  close(): void {
    this.eventSource?.close();
    this.pendingRequests.clear();
    console.log("[MCP] Transport closed");
  }
}
```

---

## Capability Negotiation

The MCP handshake establishes which features both client and server support. This prevents runtime failures from calling unsupported methods.

### Initialization Sequence

```
Client                                    Server
  │                                         │
  │── initialize ──────────────────────────►│
  │   {protocolVersion, capabilities,       │
  │    clientInfo}                           │
  │                                         │
  │◄─────────────────────── result ─────────│
  │   {protocolVersion, capabilities,       │
  │    serverInfo}                           │
  │                                         │
  │── notifications/initialized ───────────►│
  │                                         │
  │   [Session is now active]               │
  │                                         │
```

### Capability Schema

```json
{
  "protocolVersion": "2025-03-26",
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "subscribe": true,
      "listChanged": true
    },
    "prompts": {
      "listChanged": true
    },
    "logging": {}
  },
  "serverInfo": {
    "name": "my-tool-server",
    "version": "2.1.0"
  }
}
```

### Capability Negotiation Logic

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MCPCapabilities:
    """Represents negotiated MCP capabilities."""
    tools: bool = False
    tools_list_changed: bool = False
    resources: bool = False
    resources_subscribe: bool = False
    prompts: bool = False
    logging: bool = False


@dataclass
class MCPSession:
    """Manages an active MCP session after handshake."""
    protocol_version: str = ""
    server_name: str = ""
    server_version: str = ""
    capabilities: MCPCapabilities = field(default_factory=MCPCapabilities)
    initialized: bool = False

    def negotiate(self, server_response: dict) -> None:
        """Parse server initialization response and set capabilities."""
        self.protocol_version = server_response.get("protocolVersion", "unknown")

        server_info = server_response.get("serverInfo", {})
        self.server_name = server_info.get("name", "unknown")
        self.server_version = server_info.get("version", "0.0.0")

        caps = server_response.get("capabilities", {})

        if "tools" in caps:
            self.capabilities.tools = True
            self.capabilities.tools_list_changed = caps["tools"].get("listChanged", False)

        if "resources" in caps:
            self.capabilities.resources = True
            self.capabilities.resources_subscribe = caps["resources"].get("subscribe", False)

        if "prompts" in caps:
            self.capabilities.prompts = True

        if "logging" in caps:
            self.capabilities.logging = True

        self.initialized = True
        print(f"[MCP] Session negotiated with {self.server_name} v{self.server_version}")
        print(f"[MCP] Protocol: {self.protocol_version}")
        print(f"[MCP] Tools: {self.capabilities.tools}, "
              f"Resources: {self.capabilities.resources}, "
              f"Prompts: {self.capabilities.prompts}")

    def assert_capability(self, capability: str) -> None:
        """Raise an error if a required capability is not available."""
        if not getattr(self.capabilities, capability, False):
            raise RuntimeError(
                f"MCP server '{self.server_name}' does not support capability: {capability}"
            )
```

---

## Tool Listing and Discovery

After initialization, the client queries the server for available tools using `tools/list`.

### Tool List Response Schema

```json
{
  "tools": [
    {
      "name": "file_read",
      "description": "Read the contents of a file from the filesystem",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Absolute path to the file to read"
          },
          "encoding": {
            "type": "string",
            "enum": ["utf-8", "ascii", "base64"],
            "default": "utf-8"
          }
        },
        "required": ["path"],
        "additionalProperties": false
      }
    },
    {
      "name": "file_write",
      "description": "Write content to a file on the filesystem",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Absolute path to the file to write"
          },
          "content": {
            "type": "string",
            "description": "Content to write to the file"
          },
          "createDirectories": {
            "type": "boolean",
            "default": false,
            "description": "Whether to create parent directories if they don't exist"
          }
        },
        "required": ["path", "content"],
        "additionalProperties": false
      }
    }
  ]
}
```

### Tool Discovery Client

```python
import json
from typing import Any


class MCPToolRegistry:
    """
    Maintains a local cache of tools discovered from an MCP server.
    Supports lookup by name, capability filtering, and schema retrieval.
    """

    def __init__(self):
        self._tools: dict[str, dict[str, Any]] = {}
        self._version_map: dict[str, str] = {}

    def load_from_server(self, transport: "StdioMCPTransport") -> int:
        """
        Query the MCP server for available tools and cache them locally.
        Returns the number of tools discovered.
        """
        result = transport.send_message("tools/list")
        tools = result.get("tools", [])

        self._tools.clear()
        for tool in tools:
            name = tool["name"]
            self._tools[name] = {
                "description": tool.get("description", ""),
                "inputSchema": tool.get("inputSchema", {}),
                "annotations": tool.get("annotations", {}),
            }

        print(f"[MCP Registry] Loaded {len(self._tools)} tools: {list(self._tools.keys())}")
        return len(self._tools)

    def get_tool(self, name: str) -> dict[str, Any]:
        """Retrieve a tool definition by name."""
        if name not in self._tools:
            raise KeyError(f"Tool '{name}' not found in registry. "
                           f"Available: {list(self._tools.keys())}")
        return self._tools[name]

    def get_input_schema(self, name: str) -> dict:
        """Get the JSON Schema for a tool's input parameters."""
        tool = self.get_tool(name)
        return tool.get("inputSchema", {})

    def list_tools(self) -> list[str]:
        """Return names of all registered tools."""
        return list(self._tools.keys())

    def has_tool(self, name: str) -> bool:
        """Check if a tool is available in the registry."""
        return name in self._tools

    def get_annotations(self, name: str) -> dict:
        """
        Get tool annotations (MCP 2025-03-26+).
        Annotations provide metadata about tool behavior for client-side
        decisions without requiring invocation.
        """
        tool = self.get_tool(name)
        return tool.get("annotations", {})
```

---

## Tool Invocation Protocol

Tool calls use the `tools/call` method with the tool name and validated arguments.

### Request/Response Flow

```
Client                                    Server
  │                                         │
  │── tools/call ──────────────────────────►│
  │   {name: "file_read",                   │
  │    arguments: {path: "/app/config.yaml"}}│
  │                                         │
  │◄─────────────────────── result ─────────│
  │   {content: [                           │
  │     {type: "text", text: "db:\n..."}    │
  │   ], isError: false}                    │
  │                                         │
```

### Tool Call Executor

```python
import hashlib
import time
import json
from typing import Any, Optional
from dataclasses import dataclass


@dataclass
class ToolCallResult:
    """Represents the result of a tool invocation."""
    tool_name: str
    call_id: str
    success: bool
    content: list[dict[str, Any]]
    error_message: Optional[str] = None
    duration_ms: float = 0.0
    idempotency_key: Optional[str] = None


class MCPToolExecutor:
    """
    Executes tool calls against an MCP server with validation,
    timing, and structured result handling.
    """

    def __init__(self, transport: "StdioMCPTransport", registry: MCPToolRegistry):
        self.transport = transport
        self.registry = registry
        self._call_counter = 0

    def _generate_call_id(self) -> str:
        """Generate a unique call identifier."""
        self._call_counter += 1
        timestamp = int(time.time() * 1000)
        return f"tc_{timestamp}_{self._call_counter}"

    def _validate_arguments(self, tool_name: str, arguments: dict) -> list[str]:
        """
        Validate arguments against the tool's input schema.
        Returns a list of validation errors (empty if valid).
        """
        schema = self.registry.get_input_schema(tool_name)
        errors = []

        # Check required fields
        required = schema.get("required", [])
        for field in required:
            if field not in arguments:
                errors.append(f"Missing required field: '{field}'")

        # Check property types
        properties = schema.get("properties", {})
        for key, value in arguments.items():
            if key in properties:
                expected_type = properties[key].get("type")
                if expected_type == "string" and not isinstance(value, str):
                    errors.append(f"Field '{key}' must be string, got {type(value).__name__}")
                elif expected_type == "integer" and not isinstance(value, int):
                    errors.append(f"Field '{key}' must be integer, got {type(value).__name__}")
                elif expected_type == "boolean" and not isinstance(value, bool):
                    errors.append(f"Field '{key}' must be boolean, got {type(value).__name__}")

                # Check enum constraints
                allowed_values = properties[key].get("enum")
                if allowed_values and value not in allowed_values:
                    errors.append(
                        f"Field '{key}' must be one of {allowed_values}, got '{value}'"
                    )

            elif schema.get("additionalProperties") is False:
                errors.append(f"Unknown field: '{key}' (additionalProperties=false)")

        return errors

    def call_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        idempotency_key: Optional[str] = None,
        timeout_ms: int = 30_000,
    ) -> ToolCallResult:
        """
        Execute a tool call with validation, timing, and error handling.
        """
        call_id = self._generate_call_id()
        start_time = time.monotonic()

        # Validate tool exists
        if not self.registry.has_tool(tool_name):
            return ToolCallResult(
                tool_name=tool_name,
                call_id=call_id,
                success=False,
                content=[],
                error_message=f"Tool '{tool_name}' not found in registry",
            )

        # Validate arguments against schema
        validation_errors = self._validate_arguments(tool_name, arguments)
        if validation_errors:
            return ToolCallResult(
                tool_name=tool_name,
                call_id=call_id,
                success=False,
                content=[],
                error_message=f"Validation failed: {'; '.join(validation_errors)}",
            )

        # Execute the call
        try:
            result = self.transport.send_message("tools/call", {
                "name": tool_name,
                "arguments": arguments,
            })

            duration = (time.monotonic() - start_time) * 1000
            is_error = result.get("isError", False)

            return ToolCallResult(
                tool_name=tool_name,
                call_id=call_id,
                success=not is_error,
                content=result.get("content", []),
                error_message=result.get("content", [{}])[0].get("text") if is_error else None,
                duration_ms=duration,
                idempotency_key=idempotency_key,
            )

        except Exception as e:
            duration = (time.monotonic() - start_time) * 1000
            return ToolCallResult(
                tool_name=tool_name,
                call_id=call_id,
                success=False,
                content=[],
                error_message=str(e),
                duration_ms=duration,
                idempotency_key=idempotency_key,
            )
```

---

## MCP Server Implementation

### TypeScript MCP Server

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";

// Create server instance
const server = new Server(
  { name: "filesystem-tools", version: "1.0.0" },
  {
    capabilities: {
      tools: { listChanged: false },
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "file_read",
      description: "Read the contents of a file",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Absolute file path to read",
          },
          encoding: {
            type: "string",
            enum: ["utf-8", "ascii", "base64"],
            default: "utf-8",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      name: "file_write",
      description: "Write content to a file",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Absolute file path to write",
          },
          content: {
            type: "string",
            description: "Content to write",
          },
          createDirectories: {
            type: "boolean",
            default: false,
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "file_list",
      description: "List files in a directory",
      inputSchema: {
        type: "object" as const,
        properties: {
          directory: {
            type: "string",
            description: "Directory path to list",
          },
          recursive: {
            type: "boolean",
            default: false,
          },
        },
        required: ["directory"],
        additionalProperties: false,
      },
    },
  ],
}));

// Handle tool invocations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "file_read": {
      const filePath = args?.path as string;
      const encoding = (args?.encoding as BufferEncoding) || "utf-8";

      try {
        const content = await fs.readFile(filePath, { encoding });
        return {
          content: [{ type: "text", text: content }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading file: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "file_write": {
      const filePath = args?.path as string;
      const content = args?.content as string;
      const createDirs = args?.createDirectories as boolean;

      try {
        if (createDirs) {
          await fs.mkdir(path.dirname(filePath), { recursive: true });
        }
        await fs.writeFile(filePath, content, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                path: filePath,
                bytesWritten: Buffer.byteLength(content, "utf-8"),
                status: "created",
              }),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error writing file: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "file_list": {
      const dirPath = args?.directory as string;
      const recursive = args?.recursive as boolean;

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const fileList = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
          path: path.join(dirPath, entry.name),
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(fileList, null, 2) }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing directory: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP Server] Filesystem tools server running on stdio");
}

main().catch(console.error);
```

---

## Production Patterns

### Connection Health Monitoring

```python
import asyncio
import time
from dataclasses import dataclass
from enum import Enum


class ConnectionState(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DEGRADED = "degraded"
    FAILED = "failed"


@dataclass
class HealthMetrics:
    """Tracks MCP connection health."""
    total_requests: int = 0
    failed_requests: int = 0
    last_success_time: float = 0.0
    last_failure_time: float = 0.0
    avg_latency_ms: float = 0.0
    state: ConnectionState = ConnectionState.DISCONNECTED

    @property
    def failure_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.failed_requests / self.total_requests

    @property
    def is_healthy(self) -> bool:
        return self.state == ConnectionState.CONNECTED and self.failure_rate < 0.1


class MCPHealthMonitor:
    """
    Monitors the health of an MCP connection and triggers
    reconnection when degradation is detected.
    """

    def __init__(self, max_failure_rate: float = 0.3, check_interval_s: float = 30.0):
        self.metrics = HealthMetrics()
        self.max_failure_rate = max_failure_rate
        self.check_interval = check_interval_s
        self._latency_samples: list[float] = []

    def record_success(self, latency_ms: float) -> None:
        """Record a successful tool call."""
        self.metrics.total_requests += 1
        self.metrics.last_success_time = time.time()
        self._latency_samples.append(latency_ms)

        # Keep rolling window of last 100 samples
        if len(self._latency_samples) > 100:
            self._latency_samples = self._latency_samples[-100:]

        self.metrics.avg_latency_ms = sum(self._latency_samples) / len(self._latency_samples)
        self.metrics.state = ConnectionState.CONNECTED

    def record_failure(self, error: str) -> None:
        """Record a failed tool call."""
        self.metrics.total_requests += 1
        self.metrics.failed_requests += 1
        self.metrics.last_failure_time = time.time()

        if self.metrics.failure_rate > self.max_failure_rate:
            self.metrics.state = ConnectionState.DEGRADED
            print(f"[MCP Health] Connection DEGRADED: "
                  f"failure_rate={self.metrics.failure_rate:.2%}, "
                  f"error='{error}'")

    def should_reconnect(self) -> bool:
        """Determine if a reconnection attempt should be made."""
        if self.metrics.state == ConnectionState.DEGRADED:
            return True
        if self.metrics.state == ConnectionState.FAILED:
            return True
        return False
```

### Multi-Server MCP Router

```python
from typing import Any


class MCPRouter:
    """
    Routes tool calls to the appropriate MCP server when
    multiple servers are configured.
    """

    def __init__(self):
        self._server_map: dict[str, "StdioMCPTransport"] = {}
        self._tool_to_server: dict[str, str] = {}

    def register_server(
        self, server_name: str, transport: "StdioMCPTransport", tools: list[str]
    ) -> None:
        """Register an MCP server and its tool mappings."""
        self._server_map[server_name] = transport
        for tool in tools:
            if tool in self._tool_to_server:
                print(f"[MCP Router] WARNING: Tool '{tool}' already registered "
                      f"with server '{self._tool_to_server[tool]}', "
                      f"overwriting with '{server_name}'")
            self._tool_to_server[tool] = server_name

    def route_tool_call(self, tool_name: str, arguments: dict[str, Any]) -> dict:
        """Route a tool call to the correct MCP server."""
        if tool_name not in self._tool_to_server:
            raise KeyError(
                f"No server registered for tool '{tool_name}'. "
                f"Known tools: {list(self._tool_to_server.keys())}"
            )

        server_name = self._tool_to_server[tool_name]
        transport = self._server_map[server_name]

        print(f"[MCP Router] Routing '{tool_name}' to server '{server_name}'")
        return transport.send_message("tools/call", {
            "name": tool_name,
            "arguments": arguments,
        })

    def list_all_tools(self) -> dict[str, str]:
        """Return a mapping of tool names to their server names."""
        return dict(self._tool_to_server)
```

---

## Configuration Templates

### MCP Client Configuration (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["dist/mcp-filesystem-server.js", "/workspace"],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "database": {
      "command": "python",
      "args": ["-m", "mcp_database_server"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/mydb",
        "MCP_LOG_LEVEL": "info"
      }
    },
    "remote-api": {
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_API_TOKEN}"
      }
    }
  }
}
```

### Server Manifest Template

```json
{
  "server": {
    "name": "my-tool-server",
    "version": "1.0.0",
    "description": "Custom tool server for project-specific operations",
    "transport": "stdio",
    "protocol_version": "2025-03-26"
  },
  "tools": [
    {
      "name": "tool_name",
      "description": "What this tool does",
      "inputSchema": {},
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      }
    }
  ]
}
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
| :--- | :--- | :--- |
| Hardcoding tool schemas in client | Breaks when server updates tools | Discover schemas dynamically via `tools/list` |
| Skipping `initialize` handshake | Server may not be ready; capabilities unknown | Always complete full init sequence |
| Ignoring `isError` in tool results | Silent failures corrupt agent state | Check `isError` and propagate structured errors |
| Single global transport for all servers | One server failure takes down all tools | Dedicated transport per server with isolation |
| Not setting request timeouts | Hung server blocks agent loop indefinitely | Set explicit timeouts with circuit breakers |

---

## Handoff & Related References
- Tool Schema Definitions: [tool-schema-definitions.md](tool-schema-definitions.md)
- Tool Discovery & Routing: [tool-discovery-routing.md](tool-discovery-routing.md)
- Tool Error Handling: [tool-error-handling.md](tool-error-handling.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with MCP protocol specification and JSON-RPC 2.0 standards.
-->
