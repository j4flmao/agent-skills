# Model Context Protocol (MCP)

## 1. Skill Context
**Focus**: An open standard (introduced by Anthropic in November 2024) for connecting AI applications to data sources, tools, and environments.
**Triggers**: model-context-protocol, mcp, mcp-server, agentic-protocol.

## 2. The Integration Problem
Before MCP, if you wanted an AI to read your Github, query your Postgres DB, and search your Slack, you had to write custom API wrappers and OAuth flows for every single LLM platform.

## 3. MCP Architecture
MCP uses a client-server model with JSON-RPC 2.0 messages over stdio (local servers) or Streamable HTTP (remote servers; it replaced the older HTTP+SSE transport in the 2025-03-26 spec revision).
- **MCP Host**: The AI application (e.g., Claude Desktop, Cursor).
- **MCP Server**: A lightweight local or remote program connecting to specific data (e.g., an mcp-postgres server).

**Core Capabilities exposed by MCP Servers**:
- **Resources**: Expose raw data (like reading a file or database row) via URIs (`file:///...`, `postgres://...`).
- **Prompts**: Reusable prompt templates defined by the server.
- **Tools**: Executable functions (e.g., `execute_sql`, `git_commit`) that the model can discover and call. Calls are only as safe as the server's own validation, authorization and approval gates; see `.claude/rules/mcp-server-design.md` and the parent SKILL.md.
