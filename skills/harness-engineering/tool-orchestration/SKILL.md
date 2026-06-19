---
name: tool-orchestration
description: >
  Use this skill to implement reliable agent-to-tool communication using Model Context Protocol (MCP), define strict tool contracts with JSON Schema, build idempotent and retry-safe tool invocations, manage tool discovery and routing, enforce permission models, and orchestrate multi-tool chaining pipelines.
  This skill enforces: typed tool schemas, idempotency keys, permission scoping, graceful error propagation, and tool version compatibility checks.
  Do NOT use for: general API design, REST endpoint scaffolding, or model fine-tuning workflows.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, tool-orchestration, mcp, idempotency, agent-tools]
---

# Tool Orchestration Skill

## Purpose
Establishes a production-grade framework for agents to discover, invoke, chain, and recover from failures when interacting with external tools. Covers the full lifecycle from tool schema definition through MCP transport negotiation, permission evaluation, idempotent execution, error handling, and version evolution. This system ensures that every tool call an agent makes is typed, authorized, retry-safe, auditable, and compatible with the target tool's contract version.

---

## Core Principles
1. **Schema-First Contracts**: Every tool must be defined by a strict JSON Schema that specifies input parameters, output types, required fields, and error envelopes before any implementation is written.
2. **Idempotency by Default**: All tool invocations must carry an idempotency key. Repeated calls with the same key and parameters must produce the same side effects exactly once.
3. **Least-Privilege Permissions**: Agents receive the minimum set of tool permissions required for their current task scope. Permission grants are scoped, time-bounded, and auditable.
4. **Graceful Degradation**: Tool failures must never crash the agent loop. Every tool call must have a timeout, a retry policy, and a fallback path defined before execution.
5. **Version-Aware Routing**: Agents must negotiate tool versions at discovery time and refuse to invoke tools whose contract version is incompatible with the agent's expected interface.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Agent loops that invoke external tools (file operations, API calls, database queries, shell commands).
- MCP server/client handshake and capability negotiation sequences.
- Tool pipeline chains where the output of one tool feeds into the input of another.
- Permission grant evaluation, idempotency key management, or tool version migration tasks.
- Error recovery flows involving tool timeout, rate limiting, or partial failure scenarios.

### Input Context Required
- **Tool Registry Manifest**: A JSON document listing available tools, their schemas, versions, and permission scopes.
- **Agent Identity & Scope**: The agent's ID, role, and current task context for permission evaluation.
- **Idempotency Key Source**: A deterministic key generator or client-provided idempotency token.
- **Target MCP Server Endpoint**: The transport URI (stdio, SSE, or HTTP) for the MCP server.

### Output Artifact
- **Tool Invocation Record**: A structured log of the tool call including request, response, timing, and idempotency key.
- **Pipeline Execution Trace**: An ordered sequence of tool calls with dependency edges and intermediate results.
- **Permission Audit Log**: A record of which permissions were evaluated, granted, or denied for each tool call.

### Response Formats
For programmatic integration, the tool invocation result must follow this structure:

```json
{
  "tool_call_id": "tc_a1b2c3d4",
  "idempotency_key": "idem_usr42_task99_step3_v1",
  "tool_name": "file_read",
  "tool_version": "1.2.0",
  "status": "success",
  "input_hash": "sha256:9f86d08...",
  "result": {
    "content": "File contents here...",
    "metadata": { "size_bytes": 4096, "encoding": "utf-8" }
  },
  "timing": {
    "queued_at": "2026-06-04T09:00:00Z",
    "started_at": "2026-06-04T09:00:01Z",
    "completed_at": "2026-06-04T09:00:02Z",
    "duration_ms": 1042
  },
  "permission_grant": {
    "scope": "file:read:/workspace/**",
    "granted_by": "system",
    "expires_at": "2026-06-04T10:00:00Z"
  }
}
```

---

## Decision Matrix for Tool Invocation

```
Agent wants to call a tool?
├── Tool discovered in registry?
│   ├── NO → Query MCP server for capability list → Cache result → Retry lookup.
│   └── YES
│       ├── Version compatible?
│       │   ├── NO → Check compatibility matrix for migration adapter.
│       │   │   ├── Adapter available → Transform request → Proceed.
│       │   │   └── No adapter → ABORT with ToolVersionError.
│       │   └── YES
│       │       ├── Permission granted?
│       │       │   ├── NO → Request elevation or ABORT with PermissionDenied.
│       │       │   └── YES
│       │       │       ├── Idempotency key exists in dedup store?
│       │       │       │   ├── YES → Return cached result (no re-execution).
│       │       │       │   └── NO
│       │       │       │       ├── Execute tool call with timeout.
│       │       │       │       │   ├── SUCCESS → Store result keyed by idem key → Return.
│       │       │       │       │   ├── TRANSIENT FAILURE → Retry with exponential backoff.
│       │       │       │       │   └── PERMANENT FAILURE → Log error → Trigger fallback.
│       │       │       │       └── Pipeline step? → Route output to next tool in chain.
└── No registry configured → Fall back to static tool definitions.
```

---

## Detailed Architectural Overview

Tool orchestration forms the bridge between agent reasoning and real-world side effects. Below is the system architecture mapping how tool calls flow from agent intent through validation, execution, and result propagation.

```
+---------------+      +-----------+      +----------------+      +------------------+
| Agent Planner | ──►  | MCP Client| ──►  | Schema Validator| ──►  | Permission Gate  |
+---------------+      +-----------+      +----------------+      +------------------+
                                                                           │
                                                                           ▼
+---------------+                                                  +------------------+
| Result Cache  | ◄────────────────────────────────────────────── | Idempotent Executor|
+---------------+                                                  +------------------+
       │                                                                   │
       ▼                                                                   ▼
+---------------+      +------------------+      +------------------+     +-----------+
| Agent Memory  | ◄──  | Pipeline Router  | ◄──  | Error Handler    | ◄── | Tool Impl |
+---------------+      +------------------+      +------------------+     +-----------+
```

### Tool Invocation Lifecycle
Below is the execution pipeline for a single tool call:

```
[Agent Intent]
       │
       ├──► (A) Tool Discovery ──► MCP listTools() → Schema + version negotiation
       │
       ├──► (B) Permission Check ──► Evaluate scope grants against tool requirements
       │
       ├──► (C) Input Validation ──► JSON Schema validation of parameters
       │
       ├──► (D) Idempotency Gate ──► Check dedup store for existing result
       │
       ├──► (E) Execution ──► Call tool with timeout $T_{max}$ and circuit breaker
       │
       └──► (F) Result Processing ──► Validate output schema → Route to pipeline or agent
```

---

## Workflow Steps

### Phase 1: Tool Discovery & Registration
1. **Initialize MCP Connection**: Establish transport (stdio pipe, HTTP+SSE, or streamable HTTP) to the MCP server.
2. **Negotiate Capabilities**: Exchange `initialize` messages to determine supported protocol version and server capabilities.
3. **List Available Tools**: Call `tools/list` to retrieve the tool manifest with schemas and version metadata.
4. **Cache Tool Registry**: Store tool definitions locally with TTL-based invalidation for repeated lookups.

### Phase 2: Schema Validation & Contract Enforcement
1. **Parse Input Schema**: Extract the JSON Schema `inputSchema` from the tool definition and compile it into a validator.
2. **Validate Agent Parameters**: Run the agent's proposed parameters through the compiled schema validator.
3. **Enforce Required Fields**: Reject calls missing required parameters before they reach the network layer.
4. **Type Coercion Guards**: Ensure numeric strings are not silently coerced; fail loudly on type mismatches.

### Phase 3: Permission Evaluation
1. **Extract Required Scopes**: Parse the tool's permission requirements from the manifest metadata.
2. **Evaluate Agent Grants**: Check the agent's current permission set against required scopes using glob matching.
3. **Time-Bound Validation**: Verify that permission grants have not expired and refresh tokens if needed.
4. **Audit Log Entry**: Record the permission decision (grant/deny) with timestamp, agent ID, and tool name.

### Phase 4: Idempotent Execution
1. **Generate Idempotency Key**: Derive key from `agent_id + task_id + step_index + param_hash`.
2. **Deduplication Lookup**: Check the idempotency store for an existing result matching the key.
3. **Execute with Timeout**: Invoke the tool with a hard timeout ($T_{max}$) and circuit breaker pattern.
4. **Store Result Atomically**: Write the result to the dedup store keyed by the idempotency key with a TTL.

### Phase 5: Error Handling & Recovery
1. **Classify Error Type**: Distinguish transient errors (timeout, rate limit, 503) from permanent errors (400, 404, schema violation).
2. **Apply Retry Policy**: For transient errors, retry with exponential backoff: $T_{wait} = T_{base} \cdot 2^{n} + \text{jitter}$.
3. **Circuit Breaker Evaluation**: If failure rate exceeds threshold within time window, open the circuit and skip retries.
4. **Fallback Execution**: Invoke the configured fallback tool or return a structured error to the agent planner.

### Phase 6: Pipeline Chaining & Result Propagation
1. **Evaluate Pipeline Graph**: Check if the completed tool is part of a multi-step pipeline DAG.
2. **Transform Intermediate Results**: Apply output-to-input adapters between pipeline stages using JSONPath mappings.
3. **Propagate Errors Downstream**: If a pipeline stage fails, evaluate whether downstream stages can proceed or must abort.
4. **Compile Final Result**: Aggregate results from all pipeline stages into a single structured response for the agent.

---

## Extended Troubleshooting Guide

When implementing tool orchestration, you may encounter the following failure modes:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **MCP handshake timeout** | Server process not spawned or stdio pipe broken. | Verify server binary path and add a 5-second connection timeout with retry. |
| **Schema validation rejects valid input** | Tool schema uses `additionalProperties: false` but agent sends extra fields. | Strip unknown fields before validation or update schema to allow extensions. |
| **Duplicate side effects (double-write)** | Idempotency key not stored before tool execution completes. | Use write-ahead logging: store the key with `pending` status before execution. |
| **Permission denied on previously allowed tool** | Time-bounded permission grant expired mid-pipeline. | Implement grant refresh with 60-second pre-expiry buffer and re-evaluate. |
| **Tool returns 200 but empty result** | Tool version mismatch: response schema changed between versions. | Pin tool version in agent config and add response schema validation. |
| **Pipeline hangs on intermediate step** | Downstream tool waiting for input that upstream tool omitted from output. | Add mandatory output field checks between pipeline stages with clear errors. |
| **Rate limit errors cascade across tools** | Shared API key used by multiple tool instances without coordination. | Implement a global rate limiter with token bucket algorithm per API key. |

---

## Complete Execution Scenario

Below is a multi-tool pipeline scenario where an agent reads a file, transforms its contents, and writes the result:

```
[Agent Planner] ──► "Read config.yaml, extract DB settings, write connection string"
        │
[Step 1] ──► tools/call: file_read(path="config.yaml")
        │       ├── Permission check: file:read:/workspace/** ──► GRANTED
        │       ├── Idempotency: idem_ag1_t5_s1_abc123 ──► NOT FOUND ──► EXECUTE
        │       └── Result: { content: "db:\n  host: pg.local\n  port: 5432" }
        │
[Step 2] ──► tools/call: yaml_parse(input=step1.result.content, path="db")
        │       ├── Input validation: schema check ──► PASS
        │       ├── Idempotency: idem_ag1_t5_s2_def456 ──► NOT FOUND ──► EXECUTE
        │       └── Result: { host: "pg.local", port: 5432 }
        │
[Step 3] ──► tools/call: file_write(path="conn.txt", content="postgresql://pg.local:5432")
        │       ├── Permission check: file:write:/workspace/** ──► GRANTED
        │       ├── Idempotency: idem_ag1_t5_s3_ghi789 ──► NOT FOUND ──► EXECUTE
        │       └── Result: { bytes_written: 28, status: "created" }
        │
[Pipeline Complete] ──► Return aggregated result to agent
```

---

## Rules and Guidelines
- **Rule 1**: Every tool call must include an idempotency key. Calls without keys must be rejected at the orchestration layer.
- **Rule 2**: Tool schemas are the single source of truth. Never infer parameter types from example values; always validate against the published JSON Schema.
- **Rule 3**: Permission checks must occur before input validation. An agent should not learn about a tool's parameter structure if it lacks permission to invoke it.
- **Rule 4**: Pipeline failures must be atomic at the declared transaction boundary. If a pipeline step fails and rollback is configured, all prior steps must be compensated.
- **Rule 5**: Tool version negotiation happens once per session during MCP initialization. Mid-session version changes require a full re-initialization handshake.

---

## Reference Guides
Below are links to the reference guides detailing the protocols, schemas, algorithms, and implementations used in this tool orchestration framework:

- [mcp-protocol-patterns.md](references/mcp-protocol-patterns.md)
  Covers Model Context Protocol lifecycle, transport negotiation (stdio, SSE, HTTP), capability exchange, and server/client implementation patterns.
- [tool-schema-definitions.md](references/tool-schema-definitions.md)
  Defines strict tool contract schemas using JSON Schema, input/output validation, type systems, and schema composition patterns.
- [idempotency-patterns.md](references/idempotency-patterns.md)
  Implements retry-safe tool invocations using idempotency keys, deduplication stores, write-ahead logging, and at-most-once execution guarantees.
- [tool-discovery-routing.md](references/tool-discovery-routing.md)
  Details how agents discover tools dynamically via MCP, maintain tool registries, and route calls based on capability matching.
- [tool-permission-models.md](references/tool-permission-models.md)
  Specifies permission and authorization models for tool access including scope-based grants, time-bounded tokens, and audit logging.
- [tool-chaining-pipelines.md](references/tool-chaining-pipelines.md)
  Describes multi-tool pipeline orchestration with DAG execution, intermediate result transformation, and transactional boundaries.
- [tool-error-handling.md](references/tool-error-handling.md)
  Covers error classification, retry policies, circuit breaker patterns, fallback strategies, and structured error propagation.
- [tool-versioning-compatibility.md](references/tool-versioning-compatibility.md)
  Manages tool version evolution using semantic versioning, compatibility matrices, migration adapters, and deprecation policies.

---

## Handoff
For projects requiring context window optimization when passing tool results, hand off to `context-engineering`. For enforcing architectural constraints on tool implementations, hand off to `architectural-constraints`. For prompt design that structures tool call instructions, hand off to `prompt-engineering`.

## Implementation Patterns

### MCP Client Implementation

```python
import json
import asyncio
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass

@dataclass
class MCPTool:
    name: str
    version: str
    description: str
    input_schema: Dict
    output_schema: Dict

class MCPClient:
    def __init__(self, transport: str = "stdio", endpoint: Optional[str] = None):
        self.transport = transport
        self.endpoint = endpoint
        self.tools: Dict[str, MCPTool] = {}
        self.capabilities: Dict = {}

    async def initialize(self):
        if self.transport == "stdio":
            self.process = await asyncio.create_subprocess_exec(
                *self.endpoint.split() if self.endpoint else ["python", "-m", "mcp_server"],
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        init_msg = self._build_request("initialize", {
            "protocolVersion": "0.1.0",
            "capabilities": {},
            "clientInfo": {"name": "agent-tool-orchestrator", "version": "2.0.0"},
        })
        response = await self._send(init_msg)
        self.capabilities = response.get("capabilities", {})
        return response

    async def list_tools(self) -> Dict[str, MCPTool]:
        msg = self._build_request("tools/list", {})
        response = await self._send(msg)
        tools = {}
        for t in response.get("tools", []):
            tools[t["name"]] = MCPTool(
                name=t["name"],
                version=t.get("version", "1.0.0"),
                description=t.get("description", ""),
                input_schema=t.get("inputSchema", {}),
                output_schema=t.get("outputSchema", {}),
            )
        self.tools = tools
        return tools

    async def call_tool(self, name: str, params: Dict, idempotency_key: str) -> Dict:
        self._validate_params(name, params)
        msg = self._build_request("tools/call", {
            "name": name,
            "arguments": params,
            "meta": {"idempotencyKey": idempotency_key},
        })
        return await self._send(msg)

    def _validate_params(self, tool_name: str, params: Dict):
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        schema = self.tools[tool_name].input_schema
        required = schema.get("required", [])
        for field in required:
            if field not in params:
                raise ValueError(f"Missing required parameter: {field}")

    def _build_request(self, method: str, params: Dict) -> str:
        return json.dumps({
            "jsonrpc": "2.0",
            "id": id(self),
            "method": method,
            "params": params,
        })

    async def _send(self, msg: str) -> Dict:
        if self.transport == "stdio":
            self.process.stdin.write((msg + "\n").encode())
            await self.process.stdin.drain()
            line = await asyncio.wait_for(
                self.process.stdout.readline(), timeout=30
            )
            return json.loads(line)
        return {}
```

### Idempotency Manager

```python
import hashlib
import json
import time
from typing import Dict, Optional, Any

class IdempotencyManager:
    def __init__(self, store: Optional[Dict] = None, ttl: int = 86400):
        self.store = store or {}
        self.ttl = ttl

    def generate_key(self, agent_id: str, task_id: str, step_index: int, params: Dict) -> str:
        param_hash = hashlib.sha256(
            json.dumps(params, sort_keys=True).encode()
        ).hexdigest()[:12]
        return f"idem_{agent_id}_{task_id}_s{step_index}_{param_hash}"

    def get_result(self, key: str) -> Optional[Dict]:
        entry = self.store.get(key)
        if entry is None:
            return None
        if time.time() - entry["timestamp"] > self.ttl:
            del self.store[key]
            return None
        return entry["result"]

    def store_result(self, key: str, result: Dict):
        self.store[key] = {
            "result": result,
            "timestamp": time.time(),
        }

    def cleanup_expired(self):
        now = time.time()
        expired = [k for k, v in self.store.items() if now - v["timestamp"] > self.ttl]
        for k in expired:
            del self.store[k]

class SchemaValidator:
    def __init__(self):
        self.validators = {}

    def compile_schema(self, schema: Dict) -> Callable:
        import jsonschema
        return lambda data: jsonschema.validate(data, schema)

    def validate(self, data: Any, schema: Dict) -> Dict:
        import jsonschema
        try:
            jsonschema.validate(data, schema)
            return {"valid": True, "errors": []}
        except jsonschema.ValidationError as e:
            return {"valid": False, "errors": [str(e)]}
```

### Permission Evaluator

```python
import fnmatch
import time
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class PermissionGrant:
    agent_id: str
    scope: str
    granted_at: float
    expires_at: float

class PermissionEvaluator:
    def __init__(self):
        self.grants: Dict[str, List[PermissionGrant]] = {}

    def grant_permission(self, agent_id: str, scope: str, duration_sec: int = 3600):
        now = time.time()
        grant = PermissionGrant(
            agent_id=agent_id,
            scope=scope,
            granted_at=now,
            expires_at=now + duration_sec,
        )
        if agent_id not in self.grants:
            self.grants[agent_id] = []
        self.grants[agent_id].append(grant)

    def check_permission(self, agent_id: str, required_scope: str) -> Dict:
        now = time.time()
        agent_grants = self.grants.get(agent_id, [])
        active_grants = [g for g in agent_grants if g.expires_at > now]
        for grant in active_grants:
            if fnmatch.fnmatch(required_scope, grant.scope):
                return {
                    "granted": True,
                    "matching_grant": grant.scope,
                    "expires_at": grant.expires_at,
                }
        return {
            "granted": False,
            "required_scope": required_scope,
            "active_grants": [g.scope for g in active_grants],
        }

    def revoke_expired(self):
        now = time.time()
        for agent_id in self.grants:
            self.grants[agent_id] = [g for g in self.grants[agent_id] if g.expires_at > now]
```

### Circuit Breaker

```python
import time
from typing import Dict, Optional
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0

    def record_success(self):
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def allow_request(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True

    def get_state(self) -> Dict:
        return {
            "state": self.state.value,
            "failures": self.failure_count,
            "threshold": self.failure_threshold,
            "remaining_recovery": max(0, self.recovery_timeout - (time.time() - self.last_failure_time)),
        }
```

## Architecture Decision Trees

### Tool Communication Transport Selection

```
What's the deployment context?
├── Local agent (same machine)
│   ├── Low latency needed → stdio transport (pipe)
│   ├── Multiple concurrent tools → SSE transport
│   └── Simple tool set → stdio (easiest to debug)
│
├── Remote agent (different machine)
│   ├── Within same network → SSE over HTTP
│   ├── Across networks → Streamable HTTP with auth
│   └── High throughput needed → gRPC streaming
│
└── Hybrid (some local, some remote)
    ├── Local tools via stdio, remote via SSE
    └── Unified routing layer with transport abstraction
```

### Error Handling Strategy Selection

```
What type of tool failure?
├── Transient (timeout, rate limit, service unavailable)
│   ├── Retry with backoff → Up to N=3 attempts
│   ├── Circuit breaker opens after N failures
│   └── Fallback to cached result if available
│
├── Client error (400, 404, validation error)
│   ├── Is input fixable? → Auto-correct + retry once
│   └── Not fixable → Return structured error to agent
│
├── Auth error (401, 403)
│   ├── Token expired? → Refresh + retry once
│   └── Insufficient scope → Return PermissionDenied
│
└── Server error (500+)
    ├── Retry with backoff (up to 3)
    └── All retries exhausted → Return 503 equivalent to agent
```

## Production Considerations

- **Tool discovery caching**: Cache tool registry responses with a 5-minute TTL. Full re-discovery on every tool call adds 50-500ms latency per call.
- **Idempotency store sizing**: Monitor idempotency store growth. Set TTL based on maximum expected retry window (typically 24-48 hours). Use Redis with eviction policy for automatic pruning.
- **Permission audit frequency**: Batch permission audit log writes (every 100 calls or 5 seconds) to reduce storage I/O. Store in append-only format for compliance.
- **Tool health probes**: Implement tool health check endpoints (/health, /ready) separate from tool invocation. Poll every 30 seconds for availability monitoring.

## Security Considerations

- **Tool parameter injection**: Never pass agent-generated parameters directly to shell commands or eval() functions without strict schema validation and sanitization.
- **Idempotency key reuse attack**: An attacker with access to idempotency keys could replay operations. Include agent authentication in key derivation.
- **Permission scope glob expansion**: Use `**` in scope patterns cautiously. A scope of `file:read:/workspace/**` allows reading all files, while `file:read:/workspace/*` only top-level.
- **MCP transport authentication**: stdio transport inherits the parent process permissions. SSE/HTTP transports must authenticate every request with bearer tokens.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Storing idempotency key after execution completes | Race condition allows duplicate execution on retry | Use write-ahead log: mark as pending before execution |
| Schema validation after permission check | Agent learns parameter structure of unauthorized tools | Check permissions first, deny before revealing parameter schemas |
| Hardcoding timeout values per tool | Different operations need different timeouts | Configure per-tool timeout in tool manifest |
| Ignoring tool output schema validation | Malformed tool outputs crash downstream processing | Validate output against schema before returning to agent |
| Single circuit breaker for all tools | One failing tool isolates all tool access | Per-tool or per-category circuit breakers |
| Not version-pinning MCP protocol | Protocol changes between updates break communication | Negotiate protocol version at init, fail on mismatch |
| Exposing agent ID in MCP responses | Leaks internal agent identity for profiling | Use opaque session IDs for external communication |

## Performance Optimization

- **Idempotency store batching**: Batch idempotency store writes (flush every 50ms or 100 keys) to reduce write overhead on high-throughput systems.
- **Parallel tool discovery**: If multiple MCP servers are configured, discover tools from all servers in parallel using asyncio.gather.
- **Schema compilation caching**: Pre-compile JSON Schemas into validator functions on tool discovery. Avoid re-compiling on every invocation.
- **Transport connection pooling**: For HTTP-based transports, reuse connection pools and keep-alive to avoid TCP handshake overhead on each tool call.
- **Result caching for read-only tools**: Cache results of deterministic read-only tools (file_read, config_get) with TTL. Avoid re-execution when identical parameters are provided.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with MCP protocol, idempotency guarantees, and multi-tool pipeline orchestration.
-->
