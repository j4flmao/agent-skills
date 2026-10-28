---
description: "j4flmao/rules — Standards for designing Agent Personas and Multi-Agent Orchestration"
glob: "*"
---

# Agent Persona Design & Orchestration

Cursor/AI MUST follow these rules when writing code for agent and multi-agent systems (LangGraph, AutoGen, CrewAI, OpenAI Agents SDK, Claude Agent SDK).

## 1. Start Simple, Split on Evidence (Anti-God Agent)
- **Rule**: Begin with the simplest design that works: one agent with a small, cohesive toolset. Keep each agent's tools focused on one domain with distinct, non-overlapping names and descriptions. As a heuristic, consider splitting once an agent needs more than ~10–15 tools, or fewer for small/local models.
- **Why**: Tool-selection accuracy drops as tool count and overlap grow, and every tool schema consumes context. Multi-agent systems add token cost, latency, and coordination failures, so split into a supervisor + specialists only when evaluation shows the single agent confusing tools or domains.

## 2. Principle of Least Privilege
- **Rule**: Agents get only the tools their narrow scope requires.
- **Example**: A `ReviewerAgent` gets `read_file` but not `write_file` or `execute_code`. Only the `CoderAgent` gets write access, scoped to the workspace.

## 3. Enforce State Structuring (Blackboard)
- **Rule**: Shared state (e.g. LangGraph `StateGraph`) must not be only a chat transcript. Define a typed schema (TypedDict/Pydantic) for the variables the workflow depends on (e.g. `current_code`, `linter_errors`, `approval_status`) next to the message list, so routing decisions read fields, not prose.

## 4. Destructive Action Checkpoints
- **Rule**: If an agent has a tool that changes production state (e.g. `execute_sql`, `deploy_to_aws`, `delete_file`), add a human-in-the-loop approval before it runs. In LangGraph, use `interrupt_before=["deploy_node"]` at compile time or call `interrupt()` inside the node; both require a checkpointer.
- **Rule**: Treat tool outputs and retrieved content as untrusted data. They must never be able to grant permissions or trigger destructive tools without approval (prompt-injection defense).

## 5. Bound the Loop
- **Rule**: Every agent loop has a maximum step/recursion limit, a token or cost budget, and per-tool timeouts. Log each tool call (name, args, result size, latency) for evaluation.
