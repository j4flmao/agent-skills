---
name: ai-mcp-patterns
description: >
  Use this skill when working with Model Context Protocol: MCP server, MCP client, tool server, MCP resources, MCP prompts, remote MCP, stdio transport, SSE transport.
  This skill enforces: transport selection, tool/resource/prompt design, security boundaries, client integration patterns, authentication model.
  Do NOT use for: building LangChain agents (use ai-langchain-patterns), generic API design, REST API development, non-MCP tool servers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, mcp, protocol, phase-11]
---

# MCP Patterns Agent

## Purpose
Designs Model Context Protocol servers and clients with proper transport, tool/resources/prompts, security, and agent integration patterns.

## Agent Protocol

### Trigger
User request includes: MCP, Model Context Protocol, MCP server, MCP client, tool server, MCP resources, MCP prompts, remote MCP, stdio transport, SSE transport.

### Protocol
1. Identify use case (tool server, resource provider, prompt template) and host environment.
2. Select transport (stdio for local, SSE for remote).
3. Design tools with schemas, descriptions, and error handling.
4. Define resources (static, dynamic, file-based) with URI scheme.
5. Design prompt templates with argument interpolation.
6. Configure security (authentication, authorization, scope).
7. Plan client integration with agent framework.

## Output
MCP architecture with server design, transport selection, security model, agent integration.

### Response Format
```
## MCP Architecture
### Server
Name: {server-name}
Transport: {stdio/SSE/remote}
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
Auth: {none/api-key/oauth}
Scope: {tool list}
Rate Limit: {requests/second}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Transport selected based on deployment context (stdio vs SSE).
- [ ] Tool schemas have descriptions, input JSON Schema, and error strategy.
- [ ] Resources use consistent URI scheme with MIME types.
- [ ] Prompts define arguments and template structure.
- [ ] Security measures match sensitivity of tools/resources.
- [ ] Client integration documented with connection lifecycle.
- [ ] Authentication and authorization scoped to least privilege.

## Workflow

### Step 1: Transport Selection
- **stdio**: Server runs as subprocess. Fast, secure (no network). Best for local CLI tools, desktop apps.
- **SSE (Server-Sent Events)**: Server as HTTP endpoint. Supports remote access, multiple clients. Use for web apps, multi-tenant.
- **Remote MCP**: SSE + authentication. Add API keys or OAuth. For production multi-user.

### Step 2: Server Structure
Standard MCP server lifecycle: initialize resources/tools/prompts → start transport → handle requests → cleanup.

```python
# Python example with FastMCP
from mcp.server.fastmcp import FastMCP
server = FastMCP("my-server", transport="stdio")

@server.tool()
def my_tool(query: str) -> str:
    """Description for LLM routing."""
    return process(query)

@server.resource("config://app/settings")
def get_settings() -> str:
    return read_config()

@server.prompt()
def my_prompt(context: str) -> str:
    return f"Process this: {context}"
```

### Step 3: Tool Design
Each tool needs: name (snake_case), description (critical for LLM routing), input JSON Schema (typed parameters), output (string or structured), error handling. Use `@server.tool()` decorator or schema dict. Return errors as structured error objects, not exceptions.

### Step 4: Resources
Resources expose data via URI schemes: `file://`, `db://`, `api://`, `config://`. Static resources return fixed content. Dynamic resources accept URI parameters. Include MIME type for content negotiation.

### Step 5: Prompts
Prompt templates with `{{argument}}` interpolation. Define arguments: name, type (string/number), required flag, description. Prompts are server-side templates that produce messages.

### Step 6: Security
- **No auth**: Local stdio only.
- **API key**: Header or query param. Use for SSE.
- **OAuth 2.0**: For multi-tenant remote MCP.
- **Scope tools**: Restrict available tools per client. Implement authorization checks per tool invocation.

### Step 7: Client Integration
MCP clients connect to servers, list available tools/resources/prompts, and invoke them. Lifecycle: initialize → list → call → shutdown. Handle connection errors with retry.

```python
# Client example
from mcp import Client
client = Client("my-server", transport="stdio")
await client.connect()
tools = await client.list_tools()
result = await client.call_tool("my_tool", {"query": "test"})
```

## Rules
- Always include descriptions on every tool — LLMs use them for routing.
- Tool names must be snake_case, no spaces or special chars.
- Error responses must be structured, not raw exceptions.
- Resources must define URI scheme and MIME type.
- Never expose secrets in tool parameters or resource URIs.
- SSE transport requires readiness to handle reconnection.

## References
  - references/mcp-architecture.md — MCP Architecture & Protocol
  - references/mcp-client-integration.md — MCP Client Integration
  - references/mcp-patterns-advanced.md — Mcp Patterns Advanced Topics
  - references/mcp-patterns-fundamentals.md — Mcp Patterns Fundamentals
  - references/mcp-security-patterns.md — MCP Security Patterns
  - references/mcp-servers.md — Building MCP Servers & Client Integration
  - references/server-implementation.md — MCP Server Implementation Guide
  - references/transport-options.md — MCP Transport Options
## Handoff
For LangChain agent integration with MCP tools, hand off to `ai-langchain-patterns`. For observability setup, hand off to `ai-ai-observability`.
