# MCP Security Patterns

## Overview
MCP (Model Context Protocol) servers expose tools and data to AI agents, creating security challenges around authentication, authorization, input validation, and audit logging. Security must be designed into MCP servers from the start.

## Threat Model

### Threat Categories
```
1. Authentication Bypass
   - Unauthorized clients connecting to MCP server
   - Session hijacking or replay attacks
   - Token leakage through tool parameters

2. Tool Abuse
   - Malicious tool invocations with crafted arguments
   - Resource exhaustion via repeated calls
   - Privilege escalation through tool chaining

3. Data Exposure
   - Sensitive data returned through resource URIs
   - Information leakage through error messages
   - Training data extraction via prompt injection

4. Server Compromise
   - Command injection through tool parameters
   - Path traversal in resource URIs
   - Denial of service through resource exhaustion
```

## Authentication

### API Key Authentication
```python
from fastapi import FastAPI, Header, HTTPException, Depends
from mcp.server.fastmcp import FastMCP

app = FastAPI()
mcp = FastMCP("secure-server")

VALID_API_KEYS = set()

async def verify_api_key(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid auth scheme")

    if token not in VALID_API_KEYS:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return token

@app.post("/mcp")
async def handle_mcp(api_key: str = Depends(verify_api_key)):
    return await mcp.handle_request()

# Key management
class APIKeyManager:
    def __init__(self):
        self.keys = {}

    def generate_key(self, client_name: str, permissions: list[str]) -> str:
        import secrets
        key = f"mcp_{secrets.token_hex(32)}"
        self.keys[key] = {
            "client": client_name,
            "permissions": permissions,
            "created_at": datetime.utcnow().isoformat(),
            "last_used": None,
        }
        return key

    def revoke_key(self, key: str):
        self.keys.pop(key, None)

    def rotate_key(self, old_key: str) -> str:
        client = self.keys.get(old_key, {}).get("client")
        permissions = self.keys.get(old_key, {}).get("permissions", [])
        self.revoke_key(old_key)
        return self.generate_key(client, permissions) if client else None
```

### OAuth 2.0 Integration
```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()

class OAuthMiddleware:
    def __init__(self, provider_url: str, client_id: str, client_secret: str):
        self.oauth = oauth.register(
            "mcp_provider",
            server_metadata_url=f"{provider_url}/.well-known/openid-configuration",
            client_id=client_id,
            client_secret=client_secret,
            client_kwargs={"scope": "openid profile email"},
        )

    async def verify_token(self, token: str) -> dict:
        try:
            user_info = await self.oauth.mcp_provider.parse_id_token(token)
            return {"user": user_info.sub, "email": user_info.email, "authenticated": True}
        except Exception as e:
            return {"authenticated": False, "error": str(e)}
```

## Authorization

### Permission-Based Access
```python
class MCPAuthorization:
    def __init__(self):
        self.permissions = {}

    def grant_permission(self, client_id: str, tool_name: str, operations: list[str]):
        self.permissions.setdefault(client_id, {})
        self.permissions[client_id][tool_name] = operations

    def check_permission(self, client_id: str, tool_name: str, operation: str = "call") -> bool:
        client_perms = self.permissions.get(client_id, {})
        tool_perms = client_perms.get(tool_name, [])
        return operation in tool_perms

    def authorize_tool_call(self, client_id: str, tool_name: str, arguments: dict) -> bool:
        if not self.check_permission(client_id, tool_name):
            return False

        tool = self.get_tool_definition(tool_name)
        for param, value in arguments.items():
            if not self.validate_parameter(tool, param, value, client_id):
                return False

        return True

    def validate_parameter(self, tool: dict, param: str, value: str, client_id: str) -> bool:
        param_def = tool.get("parameters", {}).get(param, {})
        if param_def.get("sensitive") and not self.check_permission(client_id, f"{tool['name']}.{param}", "read_sensitive"):
            return False
        return True
```

### Role-Based Access Control
```python
class MCPRBAC:
    def __init__(self):
        self.roles = {
            "admin": {"tools": ["*"], "resources": ["*"], "prompts": ["*"]},
            "operator": {"tools": ["read_*", "search_*"], "resources": ["data://*"], "prompts": []},
            "viewer": {"tools": ["read_*"], "resources": ["data://public/*"], "prompts": []},
        }

    def authorize(self, client_id: str, action_type: str, action_name: str) -> bool:
        client_role = self.get_client_role(client_id)
        if not client_role:
            return False

        permissions = self.roles.get(client_role, {})
        allowed_patterns = permissions.get(action_type, [])

        return any(self._match_pattern(action_name, pattern) for pattern in allowed_patterns)

    def _match_pattern(self, name: str, pattern: str) -> bool:
        if pattern == "*":
            return True
        if pattern.endswith("*"):
            return name.startswith(pattern[:-1])
        return name == pattern
```

## Input Validation

### Tool Parameter Validation
```python
from pydantic import BaseModel, validator, Field
from typing import Optional

class DatabaseQueryParams(BaseModel):
    query: str = Field(..., description="SQL query to execute")
    max_rows: int = Field(default=100, ge=1, le=1000)
    timeout_ms: int = Field(default=5000, ge=100, le=30000)

    @validator("query")
    def validate_query_safety(cls, v):
        dangerous_keywords = ["DROP", "DELETE", "ALTER", "TRUNCATE", "CREATE", "INSERT", "UPDATE"]
        upper = v.upper()
        for kw in dangerous_keywords:
            if kw in upper:
                raise ValueError(f"Dangerous SQL keyword not allowed: {kw}")
        return v

class FileReadParams(BaseModel):
    path: str = Field(..., description="File path to read")
    max_size_kb: int = Field(default=100, ge=1, le=10240)

    @validator("path")
    def prevent_path_traversal(cls, v):
        import os
        normalized = os.path.normpath(v)
        if normalized.startswith("..") or normalized.startswith("/"):
            raise ValueError("Path traversal detected")
        if ".." in normalized:
            raise ValueError("Path traversal not allowed")
        return normalized
```

### Rate Limiting
```python
import time
from collections import defaultdict

class MCPRateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self.windows = defaultdict(list)

    def check_rate_limit(self, client_id: str) -> bool:
        now = time.time()
        window_start = now - 60

        self.windows[client_id] = [
            t for t in self.windows[client_id]
            if t > window_start
        ]

        if len(self.windows[client_id]) >= self.rpm:
            return False

        self.windows[client_id].append(now)
        return True

    def get_remaining(self, client_id: str) -> int:
        now = time.time()
        window_start = now - 60
        recent = [t for t in self.windows.get(client_id, []) if t > window_start]
        return max(0, self.rpm - len(recent))
```

## Audit Logging

```python
class MCPAuditLogger:
    def __init__(self, log_store):
        self.store = log_store

    def log_tool_call(self, client_id: str, tool_name: str, arguments: dict,
                      result: dict, success: bool, duration_ms: float):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": client_id,
            "action": "tool_call",
            "tool": tool_name,
            "arguments": arguments,
            "result_truncated": str(result)[:500],
            "success": success,
            "duration_ms": duration_ms,
            "ip_address": self.get_client_ip(),
        }
        self.store.append(entry)

    def log_resource_access(self, client_id: str, resource_uri: str):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": client_id,
            "action": "resource_access",
            "resource": resource_uri,
        }
        self.store.append(entry)

    def query_audit_log(self, client_id: str | None = None,
                        tool_name: str | None = None,
                        start_time: str | None = None) -> list[dict]:
        results = self.store
        if client_id:
            results = [r for r in results if r.get("client_id") == client_id]
        if tool_name:
            results = [r for r in results if r.get("tool") == tool_name]
        if start_time:
            results = [r for r in results if r.get("timestamp", "") >= start_time]
        return results[-1000:]
```

## Secure Server Configuration

```python
SECURE_CONFIG = {
    "transport": "sse",
    "auth": {
        "required": True,
        "type": "api_key",
        "rate_limit": 60,
    },
    "tools": {
        "allow_list": ["read_*", "search_*"],
        "block_list": ["execute_*", "delete_*"],
        "max_args_size": 10000,
    },
    "resources": {
        "allowed_schemes": ["file:///data/", "db:///readonly"],
        "blocked_patterns": ["file:///etc/*", "file:///.env*"],
    },
    "logging": {
        "level": "INFO",
        "audit_enabled": True,
        "retention_days": 90,
    },
}
```

## Key Points
- Authenticate all MCP connections (API key, OAuth, mTLS)
- Authorize per-tool with role-based or permission-based access
- Validate all tool parameters with strict schema checking
- Prevent path traversal, command injection, and SQL injection
- Rate limit per client to prevent abuse
- Log all tool calls and resource access for audit
- Sanitize error messages to avoid information leakage
- Use allow lists over block lists for tool security
- Scope resource access to specific URI schemes
- Encrypt sensitive data in transit (TLS for SSE transport)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive MCP security & authentication patterns)
Strict compliance with API key management, OAuth integration, input validation, and audit logs.
-->
