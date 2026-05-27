# MCP Client Integration

## Overview
MCP clients connect to servers to discover and invoke tools, access resources, and use prompt templates. Proper client integration covers connection management, error handling, caching, and lifecycle management.

## Client Architecture

### Basic Client
```python
from mcp import Client, StdioServerParameters
from mcp.client.stdio import stdio_client

class MCPClient:
    def __init__(self, server_command: str, server_args: list[str] | None = None):
        self.params = StdioServerParameters(
            command=server_command,
            args=server_args or [],
        )
        self.client = None
        self.session = None

    async def connect(self):
        transport = await stdio_client(self.params)
        self.client = Client(transport)
        self.session = await self.client.connect()
        return self.session

    async def list_tools(self) -> list[dict]:
        if not self.session:
            raise RuntimeError("Not connected")
        result = await self.session.list_tools()
        return result.tools

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        if not self.session:
            raise RuntimeError("Not connected")
        result = await self.session.call_tool(tool_name, arguments)
        return result

    async def list_resources(self) -> list[dict]:
        if not self.session:
            raise RuntimeError("Not connected")
        result = await self.session.list_resources()
        return result.resources

    async def read_resource(self, uri: str) -> str:
        if not self.session:
            raise RuntimeError("Not connected")
        result = await self.session.read_resource(uri)
        return result.contents

    async def disconnect(self):
        if self.client:
            await self.client.close()
```

### Connection Pool
```python
class MCPConnectionPool:
    def __init__(self, server_configs: list[dict], max_connections: int = 10):
        self.configs = server_configs
        self.max_connections = max_connections
        self.connections = {}
        self.lock = asyncio.Lock()

    async def get_client(self, server_name: str) -> MCPClient:
        async with self.lock:
            if server_name not in self.connections:
                config = next(c for c in self.configs if c["name"] == server_name)
                client = MCPClient(config["command"], config.get("args"))
                await client.connect()
                self.connections[server_name] = client
            return self.connections[server_name]

    async def close_all(self):
        for client in self.connections.values():
            await client.disconnect()
        self.connections.clear()

    async def health_check(self) -> dict:
        results = {}
        for name, client in self.connections.items():
            try:
                await client.list_tools()
                results[name] = "healthy"
            except Exception as e:
                results[name] = f"unhealthy: {e}"
        return results
```

## Tool Discovery and Caching

### Tool Registry
```python
class MCPToolRegistry:
    def __init__(self):
        self.tools = {}
        self.server_map = {}

    def register_server(self, server_name: str, tools: list[dict]):
        for tool in tools:
            self.tools[tool["name"]] = tool
            self.server_map[tool["name"]] = server_name

    async def discover_all(self, pool: MCPConnectionPool, server_names: list[str]):
        for name in server_names:
            try:
                client = await pool.get_client(name)
                tools = await client.list_tools()
                self.register_server(name, tools)
            except Exception as e:
                logger.error(f"Failed to discover {name}: {e}")

    def get_tool(self, name: str) -> dict | None:
        return self.tools.get(name)

    def get_server_for_tool(self, name: str) -> str | None:
        return self.server_map.get(name)

    def search_tools(self, query: str) -> list[dict]:
        query = query.lower()
        return [
            tool for tool in self.tools.values()
            if query in tool["name"].lower() or query in tool.get("description", "").lower()
        ]
```

## Error Handling

### Retry Logic
```python
class MCPRetryClient:
    def __init__(self, client: MCPClient, max_retries: int = 3, base_delay: float = 1.0):
        self.client = client
        self.max_retries = max_retries
        self.base_delay = base_delay

    async def call_tool_with_retry(self, tool_name: str, arguments: dict) -> dict:
        last_error = None
        for attempt in range(self.max_retries):
            try:
                return await self.client.call_tool(tool_name, arguments)
            except ConnectionError as e:
                last_error = e
                await self._reconnect()
            except TimeoutError as e:
                last_error = e
            except Exception as e:
                last_error = e
                if not self._is_retryable(e):
                    raise

            if attempt < self.max_retries - 1:
                delay = self.base_delay * (2 ** attempt)
                logger.warning(f"Retry {attempt + 1}/{self.max_retries} for {tool_name} in {delay}s")
                await asyncio.sleep(delay)

        raise RuntimeError(f"All retries exhausted for {tool_name}: {last_error}")

    async def _reconnect(self):
        try:
            await self.client.disconnect()
        except Exception:
            pass
        await self.client.connect()
```

## Agent Integration

### LangChain Integration
```python
from langchain_core.tools import BaseTool

class MCPToolAdapter(BaseTool):
    mcp_client: MCPClient
    mcp_tool_name: str

    def _run(self, **kwargs) -> str:
        raise NotImplementedError("Use async")

    async def _arun(self, **kwargs) -> str:
        result = await self.mcp_client.call_tool(self.mcp_tool_name, kwargs)
        return self._format_result(result)

    def _format_result(self, result: dict) -> str:
        if isinstance(result, dict):
            return json.dumps(result, indent=2)
        return str(result)

# Integration with LangChain agent
async def create_mcp_agent(mcp_clients: dict, llm):
    from langchain.agents import AgentExecutor, create_openai_functions_agent
    from langchain_core.prompts import ChatPromptTemplate

    tools = []
    for server_name, client in mcp_clients.items():
        server_tools = await client.list_tools()
        for tool_info in server_tools:
            tool = MCPToolAdapter(
                name=tool_info["name"],
                description=tool_info.get("description", ""),
                mcp_client=client,
                mcp_tool_name=tool_info["name"],
            )
            tools.append(tool)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant with access to MCP tools."),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    agent = create_openai_functions_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True)
```

## Lifecycle Management

```python
class MCPClientManager:
    def __init__(self):
        self.clients = {}
        self.health_status = {}

    async def start_server(self, name: str, command: str, args: list[str] | None = None):
        if name in self.clients:
            await self.stop_server(name)

        client = MCPClient(command, args)
        await client.connect()
        self.clients[name] = client
        self.health_status[name] = "connected"

    async def stop_server(self, name: str):
        if name in self.clients:
            await self.clients[name].disconnect()
            del self.clients[name]
        self.health_status[name] = "disconnected"

    async def restart_server(self, name: str):
        await self.stop_server(name)
        config = self.get_config(name)
        await self.start_server(name, config["command"], config.get("args"))

    async def health_check_loop(self, interval: int = 30):
        while True:
            for name, client in list(self.clients.items()):
                try:
                    await client.list_tools()
                    self.health_status[name] = "healthy"
                except Exception as e:
                    self.health_status[name] = f"error: {e}"
                    await self.restart_server(name)
            await asyncio.sleep(interval)
```

## Key Points
- Use StdioServerParameters for process-based MCP servers
- Maintain connection pools for multi-server setups
- Cache tool discovery results to avoid repeated listing
- Implement retry with exponential backoff for transient errors
- Reconnect on connection errors automatically
- Adapt MCP tools to LangChain tool interface for agent integration
- Register all tools in a central registry for routing
- Monitor server health with periodic checks
- Implement graceful shutdown for all connections
- Version MCP protocol for compatibility checking
