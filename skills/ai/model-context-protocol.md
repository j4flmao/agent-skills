# Model Context Protocol (MCP)

## 1. Skill Context
**Focus**: An open standard (developed by Anthropic) for securely connecting AI assistants to local data sources, tools, and environments.
**Triggers**: model-context-protocol, mcp, mcp-server, agentic-protocol.

## 2. The Integration Problem
Before MCP, if you wanted an AI to read your Github, query your Postgres DB, and search your Slack, you had to write custom API wrappers and OAuth flows for every single LLM platform.

## 3. MCP Architecture
MCP uses a standardized Client-Server model (via JSON-RPC over stdio or SSE).
- **MCP Host**: The AI application (e.g., Claude Desktop, Cursor).
- **MCP Server**: A lightweight local or remote program connecting to specific data (e.g., an mcp-postgres server).

**Core Capabilities exposed by MCP Servers**:
- **Resources**: Expose raw data (like reading a file or database row) via custom URIs (ile:///... or postgres://...).
- **Prompts**: Reusable prompt templates defined by the server.
- **Tools**: Executable functions (e.g., xecute_sql, git_commit) that the LLM can discover and call securely.
