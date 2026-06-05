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

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with MCP protocol, idempotency guarantees, and multi-tool pipeline orchestration.
-->
