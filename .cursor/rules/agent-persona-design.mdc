---
description: "j4flmao/rules — Standards for designing Agent Personas and Multi-Agent Orchestration"
glob: "*"
---

# Agent Persona Design & Orchestration

Cursor/AI MUST follow these rules when writing code for Multi-Agent systems (LangGraph, AutoGen, CrewAI).

## 1. The Anti-God Agent Rule
- **Rule**: Never create a single Agent loaded with more than 5 tools. 
- **Why**: An LLM with too many tools suffers from "Tool Paralysis" and hallucination. If a workflow requires 15 tools, you MUST design a Multi-Agent system (e.g., a Supervisor routing to 3 specialized sub-agents).

## 2. Principle of Least Privilege
- **Rule**: Agents must only be granted the specific tools required for their narrow scope.
- **Example**: A `ReviewerAgent` must be granted a `read_file` tool, but MUST NOT be granted a `write_file` or `execute_code` tool. Only the `CoderAgent` gets write access.

## 3. Enforce State Structuring (Blackboard)
- **Rule**: When defining the shared state (e.g., `StateGraph` in LangGraph), do not pass raw chat messages as the only state. You MUST define a rigid TypedDict/Pydantic schema representing the specific variables needed (e.g., `current_code`, `linter_errors`, `approval_status`).

## 4. Destructive Action Checkpoints
- **Rule**: If an agent possesses a tool that modifies production state (e.g., `execute_sql`, `deploy_to_aws`, `delete_file`), you MUST implement a Human-in-the-loop (HITL) breakpoint (e.g., `interrupt_before=["deploy_node"]`) before that node executes.
