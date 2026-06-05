# Tool Discovery & Routing

## Dynamic Tool Discovery

Agents operating in complex environments need to discover available tools at runtime rather than relying on hardcoded tool lists. MCP's `tools/list` method provides the foundation, but production systems require caching, capability matching, and intelligent routing across multiple tool servers.

```
+------------------+       +------------------+       +------------------+
| Agent Planner    | ───►  | Tool Discovery   | ───►  | Tool Registry    |
| "I need to       |       | Service           |       | (Cached)         |
|  read a file"    |       |                   |       |                  |
+------------------+       +------------------+       +------------------+
                                    │                          │
                                    ▼                          ▼
                           +------------------+       +------------------+
                           | MCP Server A     |       | MCP Server B     |
                           | (filesystem)     |       | (database)       |
                           +------------------+       +------------------+
```

---

## Tool Registry Architecture

### Registry Data Model

```python
import time
from typing import Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class ToolCategory(Enum):
    """Categories for tool classification and routing."""
    FILESYSTEM = "filesystem"
    DATABASE = "database"
    API = "api"
    COMPUTE = "compute"
    SEARCH = "search"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"
    GENERAL = "general"


@dataclass
class ToolMetadata:
    """Extended metadata for a registered tool."""
    name: str
    description: str
    input_schema: dict[str, Any]
    server_name: str
    version: str = "1.0.0"
    category: ToolCategory = ToolCategory.GENERAL
    annotations: dict[str, Any] = field(default_factory=dict)
    
    # Behavioral hints from MCP annotations
    read_only: bool = False
    destructive: bool = False
    idempotent: bool = False
    open_world: bool = False
    
    # Discovery metadata
    discovered_at: float = field(default_factory=time.time)
    last_used_at: Optional[float] = None
    use_count: int = 0
    avg_latency_ms: float = 0.0

    def matches_capability(self, capability: str) -> bool:
        """Check if this tool matches a capability query."""
        capability_lower = capability.lower()
        return (
            capability_lower in self.name.lower()
            or capability_lower in self.description.lower()
            or capability_lower == self.category.value
        )


@dataclass
class ServerRegistration:
    """Tracks a registered MCP server and its tools."""
    name: str
    transport_type: str  # "stdio", "http+sse", "streamable_http"
    transport_config: dict[str, Any]
    tools: list[str] = field(default_factory=list)
    healthy: bool = True
    last_health_check: float = field(default_factory=time.time)
    protocol_version: str = ""


class ToolRegistry:
    """
    Centralized registry for all discovered tools across MCP servers.
    
    Supports:
    - Multi-server tool registration
    - Capability-based lookup
    - Usage tracking and statistics
    - TTL-based cache invalidation
    """

    def __init__(self, cache_ttl_seconds: int = 300):
        self._tools: dict[str, ToolMetadata] = {}
        self._servers: dict[str, ServerRegistration] = {}
        self._cache_ttl = cache_ttl_seconds
        self._last_refresh: float = 0.0

    def register_server(self, registration: ServerRegistration) -> None:
        """Register an MCP server."""
        self._servers[registration.name] = registration
        print(f"[Registry] Server registered: {registration.name} "
              f"({registration.transport_type})")

    def register_tool(self, tool: ToolMetadata) -> None:
        """Register a tool from a discovered MCP server."""
        self._tools[tool.name] = tool
        
        # Update server's tool list
        if tool.server_name in self._servers:
            server = self._servers[tool.server_name]
            if tool.name not in server.tools:
                server.tools.append(tool.name)

    def lookup(self, tool_name: str) -> Optional[ToolMetadata]:
        """Look up a tool by exact name."""
        tool = self._tools.get(tool_name)
        if tool:
            tool.last_used_at = time.time()
            tool.use_count += 1
        return tool

    def search(self, capability: str) -> list[ToolMetadata]:
        """Search for tools matching a capability description."""
        matches = [
            tool for tool in self._tools.values()
            if tool.matches_capability(capability)
        ]
        # Sort by relevance: exact name match first, then by use count
        matches.sort(key=lambda t: (
            t.name.lower() == capability.lower(),  # Exact match first
            t.use_count,  # More used = more relevant
        ), reverse=True)
        return matches

    def list_by_category(self, category: ToolCategory) -> list[ToolMetadata]:
        """List all tools in a category."""
        return [
            tool for tool in self._tools.values()
            if tool.category == category
        ]

    def list_by_server(self, server_name: str) -> list[ToolMetadata]:
        """List all tools from a specific MCP server."""
        return [
            tool for tool in self._tools.values()
            if tool.server_name == server_name
        ]

    def list_all(self) -> list[str]:
        """List all registered tool names."""
        return list(self._tools.keys())

    def is_cache_stale(self) -> bool:
        """Check if the tool cache needs refreshing."""
        return (time.time() - self._last_refresh) > self._cache_ttl

    def mark_refreshed(self) -> None:
        """Mark the cache as freshly refreshed."""
        self._last_refresh = time.time()

    def get_statistics(self) -> dict[str, Any]:
        """Get registry statistics."""
        return {
            "total_tools": len(self._tools),
            "total_servers": len(self._servers),
            "healthy_servers": sum(
                1 for s in self._servers.values() if s.healthy
            ),
            "categories": {
                cat.value: len(self.list_by_category(cat))
                for cat in ToolCategory
                if self.list_by_category(cat)
            },
            "most_used": sorted(
                self._tools.values(),
                key=lambda t: t.use_count,
                reverse=True,
            )[:5],
            "cache_age_seconds": time.time() - self._last_refresh,
        }
```

---

## Tool Discovery Service

```python
import json
from typing import Any


class ToolDiscoveryService:
    """
    Discovers tools from MCP servers and populates the registry.
    
    Handles:
    - Server initialization handshake
    - Tool list retrieval
    - Annotation parsing
    - Category inference
    - Periodic refresh
    """

    def __init__(self, registry: ToolRegistry):
        self.registry = registry
        self._category_rules: list[tuple[str, ToolCategory]] = [
            ("file", ToolCategory.FILESYSTEM),
            ("directory", ToolCategory.FILESYSTEM),
            ("path", ToolCategory.FILESYSTEM),
            ("database", ToolCategory.DATABASE),
            ("query", ToolCategory.DATABASE),
            ("sql", ToolCategory.DATABASE),
            ("http", ToolCategory.API),
            ("request", ToolCategory.API),
            ("api", ToolCategory.API),
            ("search", ToolCategory.SEARCH),
            ("grep", ToolCategory.SEARCH),
            ("find", ToolCategory.SEARCH),
            ("deploy", ToolCategory.DEPLOYMENT),
            ("release", ToolCategory.DEPLOYMENT),
            ("metric", ToolCategory.MONITORING),
            ("log", ToolCategory.MONITORING),
        ]

    def discover_from_transport(
        self, server_name: str, transport: Any
    ) -> list[ToolMetadata]:
        """
        Discover all tools from an MCP server via its transport.
        
        Performs the full initialization handshake, lists tools,
        parses schemas and annotations, and registers everything.
        """
        # Step 1: Initialize handshake
        init_result = transport.send_message("initialize", {
            "protocolVersion": "2025-03-26",
            "capabilities": {"tools": {"listChanged": True}},
            "clientInfo": {"name": "tool-discovery", "version": "1.0.0"},
        })

        # Register server
        server_reg = ServerRegistration(
            name=server_name,
            transport_type="stdio",
            transport_config={},
            protocol_version=init_result.get("protocolVersion", ""),
        )
        self.registry.register_server(server_reg)

        # Step 2: Send initialized notification
        transport.send_message("notifications/initialized")

        # Step 3: List tools
        list_result = transport.send_message("tools/list")
        raw_tools = list_result.get("tools", [])

        # Step 4: Parse and register each tool
        discovered = []
        for raw_tool in raw_tools:
            tool = self._parse_tool(raw_tool, server_name)
            self.registry.register_tool(tool)
            discovered.append(tool)

        self.registry.mark_refreshed()
        print(f"[Discovery] Found {len(discovered)} tools from '{server_name}': "
              f"{[t.name for t in discovered]}")

        return discovered

    def _parse_tool(self, raw: dict, server_name: str) -> ToolMetadata:
        """Parse a raw MCP tool definition into ToolMetadata."""
        annotations = raw.get("annotations", {})
        
        tool = ToolMetadata(
            name=raw["name"],
            description=raw.get("description", ""),
            input_schema=raw.get("inputSchema", {}),
            server_name=server_name,
            annotations=annotations,
            read_only=annotations.get("readOnlyHint", False),
            destructive=annotations.get("destructiveHint", False),
            idempotent=annotations.get("idempotentHint", False),
            open_world=annotations.get("openWorldHint", False),
            category=self._infer_category(raw["name"], raw.get("description", "")),
        )
        return tool

    def _infer_category(self, name: str, description: str) -> ToolCategory:
        """Infer tool category from name and description."""
        combined = f"{name} {description}".lower()
        for keyword, category in self._category_rules:
            if keyword in combined:
                return category
        return ToolCategory.GENERAL
```

---

## Tool Routing Engine

### Routing Strategies

```
Routing Strategy Selection:
├── Direct Name Match
│   └── Agent specifies exact tool name → Route to registered server
│
├── Capability-Based Routing
│   └── Agent describes needed capability → Search registry → Select best match
│
├── Category-Based Routing
│   └── Agent specifies category → List tools in category → Select by annotations
│
├── Priority-Based Routing
│   └── Multiple servers offer same tool → Route based on:
│       ├── Server health status
│       ├── Average latency
│       ├── Current load
│       └── Priority weight
│
└── Fallback Chain Routing
    └── Primary server unavailable → Try secondary → Try tertiary → Error
```

### Router Implementation

```python
from typing import Any, Optional
from dataclasses import dataclass


@dataclass
class RouteDecision:
    """The result of a routing decision."""
    tool_name: str
    server_name: str
    transport: Any
    confidence: float  # 0.0 to 1.0
    reason: str


class ToolRouter:
    """
    Routes tool calls to the appropriate MCP server based on
    tool name, capabilities, server health, and routing policies.
    """

    def __init__(self, registry: ToolRegistry):
        self.registry = registry
        self._transports: dict[str, Any] = {}
        self._fallback_chains: dict[str, list[str]] = {}

    def register_transport(self, server_name: str, transport: Any) -> None:
        """Register a transport for a server."""
        self._transports[server_name] = transport

    def set_fallback_chain(self, tool_name: str, servers: list[str]) -> None:
        """
        Set the fallback chain for a tool.
        If the primary server is unavailable, try the next one.
        """
        self._fallback_chains[tool_name] = servers

    def route(self, tool_name: str) -> RouteDecision:
        """
        Route a tool call to the appropriate server.
        
        Routing priority:
        1. Direct name match in registry
        2. Fallback chain if primary is unhealthy
        3. Capability search as last resort
        """
        # Direct lookup
        tool = self.registry.lookup(tool_name)
        if tool:
            server = self.registry._servers.get(tool.server_name)
            
            if server and server.healthy:
                transport = self._transports.get(tool.server_name)
                if transport:
                    return RouteDecision(
                        tool_name=tool_name,
                        server_name=tool.server_name,
                        transport=transport,
                        confidence=1.0,
                        reason=f"Direct match on server '{tool.server_name}'",
                    )
            
            # Primary server unhealthy, try fallback chain
            if tool_name in self._fallback_chains:
                for fallback_server in self._fallback_chains[tool_name]:
                    fb_server = self.registry._servers.get(fallback_server)
                    if fb_server and fb_server.healthy:
                        transport = self._transports.get(fallback_server)
                        if transport:
                            return RouteDecision(
                                tool_name=tool_name,
                                server_name=fallback_server,
                                transport=transport,
                                confidence=0.8,
                                reason=f"Fallback to '{fallback_server}' "
                                       f"(primary '{tool.server_name}' unhealthy)",
                            )

        # Capability search
        matches = self.registry.search(tool_name)
        for match in matches:
            server = self.registry._servers.get(match.server_name)
            if server and server.healthy:
                transport = self._transports.get(match.server_name)
                if transport:
                    return RouteDecision(
                        tool_name=match.name,
                        server_name=match.server_name,
                        transport=transport,
                        confidence=0.5,
                        reason=f"Capability match: '{match.name}' on '{match.server_name}'",
                    )

        raise RuntimeError(
            f"No route found for tool '{tool_name}'. "
            f"Available tools: {self.registry.list_all()}"
        )


    def route_by_category(
        self, category: ToolCategory, prefer_read_only: bool = False
    ) -> list[RouteDecision]:
        """Find all routable tools in a category."""
        tools = self.registry.list_by_category(category)
        
        if prefer_read_only:
            tools = [t for t in tools if t.read_only] or tools
        
        decisions = []
        for tool in tools:
            server = self.registry._servers.get(tool.server_name)
            if server and server.healthy:
                transport = self._transports.get(tool.server_name)
                if transport:
                    decisions.append(RouteDecision(
                        tool_name=tool.name,
                        server_name=tool.server_name,
                        transport=transport,
                        confidence=0.9,
                        reason=f"Category match: {category.value}",
                    ))

        return decisions
```

---

## TypeScript Tool Router

```typescript
interface ToolRegistryEntry {
  name: string;
  description: string;
  serverName: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  destructive: boolean;
  idempotent: boolean;
  useCount: number;
  avgLatencyMs: number;
}

interface RoutingResult {
  toolName: string;
  serverName: string;
  confidence: number;
  reason: string;
}

class ToolRouter {
  private registry: Map<string, ToolRegistryEntry> = new Map();
  private serverHealth: Map<string, boolean> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();

  registerTool(entry: ToolRegistryEntry): void {
    this.registry.set(entry.name, entry);
    if (!this.serverHealth.has(entry.serverName)) {
      this.serverHealth.set(entry.serverName, true);
    }
  }

  setServerHealth(serverName: string, healthy: boolean): void {
    this.serverHealth.set(serverName, healthy);
  }

  setFallbackChain(toolName: string, servers: string[]): void {
    this.fallbackChains.set(toolName, servers);
  }

  route(toolName: string): RoutingResult {
    // Direct lookup
    const tool = this.registry.get(toolName);
    if (tool) {
      const healthy = this.serverHealth.get(tool.serverName) ?? false;
      if (healthy) {
        return {
          toolName: tool.name,
          serverName: tool.serverName,
          confidence: 1.0,
          reason: `Direct match on '${tool.serverName}'`,
        };
      }

      // Try fallback chain
      const fallbacks = this.fallbackChains.get(toolName);
      if (fallbacks) {
        for (const server of fallbacks) {
          if (this.serverHealth.get(server)) {
            return {
              toolName,
              serverName: server,
              confidence: 0.8,
              reason: `Fallback to '${server}'`,
            };
          }
        }
      }
    }

    // Fuzzy search by description
    const fuzzyMatches = Array.from(this.registry.values()).filter(
      (t) =>
        t.description.toLowerCase().includes(toolName.toLowerCase()) ||
        t.name.includes(toolName)
    );

    for (const match of fuzzyMatches) {
      if (this.serverHealth.get(match.serverName)) {
        return {
          toolName: match.name,
          serverName: match.serverName,
          confidence: 0.5,
          reason: `Fuzzy match: '${match.name}'`,
        };
      }
    }

    throw new Error(
      `No route found for tool '${toolName}'. ` +
        `Available: ${Array.from(this.registry.keys()).join(", ")}`
    );
  }

  listSafeTools(): ToolRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      (t) => t.readOnly && !t.destructive
    );
  }
}
```

---

## Server Health Checking

```python
import time
import threading
from typing import Any


class ServerHealthChecker:
    """
    Periodically checks MCP server health and updates the registry.
    
    Health is determined by:
    1. Ping response time
    2. Recent failure rate
    3. Tool list consistency
    """

    def __init__(
        self,
        registry: ToolRegistry,
        transports: dict[str, Any],
        check_interval: float = 60.0,
        unhealthy_threshold: float = 5.0,
    ):
        self.registry = registry
        self.transports = transports
        self.check_interval = check_interval
        self.unhealthy_threshold = unhealthy_threshold
        self._running = False
        self._thread: threading.Thread | None = None

    def check_server(self, server_name: str) -> bool:
        """Check if a specific server is healthy."""
        transport = self.transports.get(server_name)
        if not transport:
            return False

        try:
            start = time.monotonic()
            # Use tools/list as a health check ping
            result = transport.send_message("tools/list")
            latency = (time.monotonic() - start) * 1000

            is_healthy = latency < (self.unhealthy_threshold * 1000)

            if server_name in self.registry._servers:
                server = self.registry._servers[server_name]
                server.healthy = is_healthy
                server.last_health_check = time.time()

            print(f"[Health] {server_name}: "
                  f"{'HEALTHY' if is_healthy else 'UNHEALTHY'} "
                  f"(latency={latency:.1f}ms)")
            return is_healthy

        except Exception as e:
            print(f"[Health] {server_name}: UNHEALTHY (error: {e})")
            if server_name in self.registry._servers:
                self.registry._servers[server_name].healthy = False
            return False

    def check_all(self) -> dict[str, bool]:
        """Check health of all registered servers."""
        results = {}
        for server_name in self.registry._servers:
            results[server_name] = self.check_server(server_name)
        return results

    def start_background_checks(self) -> None:
        """Start periodic background health checks."""
        self._running = True
        self._thread = threading.Thread(
            target=self._check_loop, daemon=True
        )
        self._thread.start()

    def stop_background_checks(self) -> None:
        """Stop background health checks."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _check_loop(self) -> None:
        """Background health check loop."""
        while self._running:
            self.check_all()
            time.sleep(self.check_interval)
```

---

## Configuration Patterns

### Multi-Server Discovery Configuration

```json
{
  "discovery": {
    "cache_ttl_seconds": 300,
    "health_check_interval_seconds": 60,
    "auto_refresh": true
  },
  "servers": {
    "filesystem": {
      "transport": "stdio",
      "command": ["node", "dist/filesystem-server.js"],
      "args": ["/workspace"],
      "category_hints": ["filesystem"],
      "priority": 1
    },
    "database": {
      "transport": "stdio",
      "command": ["python", "-m", "db_mcp_server"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      },
      "category_hints": ["database", "query"],
      "priority": 1
    },
    "remote_api": {
      "transport": "http+sse",
      "url": "https://tools.example.com/mcp",
      "auth": {
        "type": "bearer",
        "token_env": "MCP_API_TOKEN"
      },
      "category_hints": ["api"],
      "priority": 2
    }
  },
  "routing": {
    "fallback_chains": {
      "file_read": ["filesystem", "remote_api"],
      "database_query": ["database"]
    },
    "default_timeout_ms": 30000,
    "max_retries": 3
  }
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
| :--- | :--- | :--- |
| Hardcoding tool-to-server mapping | Breaks when servers change | Use dynamic discovery with `tools/list` |
| No health checking | Routes to dead servers | Implement periodic health checks with circuit breakers |
| Single-server deployment | SPOF for all tool calls | Deploy multiple servers with fallback chains |
| Ignoring tool annotations | Agent calls destructive tools carelessly | Parse `readOnlyHint` and `destructiveHint` for routing decisions |
| Refreshing on every call | Excessive overhead from `tools/list` spam | Cache with TTL (5-10 minutes) and refresh on miss |

---

## Handoff & Related References
- MCP Protocol Patterns: [mcp-protocol-patterns.md](mcp-protocol-patterns.md)
- Tool Permission Models: [tool-permission-models.md](tool-permission-models.md)
- Tool Error Handling: [tool-error-handling.md](tool-error-handling.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive discovery, routing, and health check implementations preserved)
Strict compliance with MCP tool discovery protocol and multi-server routing patterns.
-->
