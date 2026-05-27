---
name: ai-agents
description: >
  Use this skill when designing AI agent systems: agent architecture (ReAct, Plan-and-Execute), tool definition, memory (conversation, summary, entity), multi-agent orchestration, function calling.
  This skill enforces: architecture pattern selection, tool schema specification, memory configuration, orchestration topology documentation.
  Do NOT use for: prompt engineering for single-turn LLM calls, RAG pipeline design, model fine-tuning, function calling for non-agentic workflows.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, agents, phase-10]
---

# AI Agents Agent

## Purpose
Designs agent-based AI systems with defined architectures, tool interfaces, memory strategies, and multi-agent orchestration patterns.

## Agent Protocol

### Trigger
User request includes: AI agent, agentic, tool-use, function calling, LangChain, CrewAI, AutoGen, multi-agent, memory, ReAct, Plan-and-Execute.

### Protocol
1. Clarify agent goal, available tools, number of agents, and interaction pattern.
2. Select agent architecture based on task complexity and tool dependencies.
3. Define tool schemas with name, description, parameters, and return type.
4. Configure memory system for conversation, summary, and entity retention.
5. Design orchestration topology for multi-agent systems.
6. Document error handling, handoff, and termination conditions.

## Output
Agent system design with architecture, tools, memory, orchestration plan.

### Response Format
```
## Agent System Design
### Architecture
Pattern: {ReAct / Plan-and-Execute / Reflection / Tool-Use}
LLM: {model} | Max Iterations: {N}

### Tools
{tool_name}: {description} | Params: {schema}
{tool_name}: {description} | Params: {schema}

### Memory
Short-Term: {conversation window}
Long-Term: {summarization / entity extraction / vector store}
Persistence: {in-memory / Redis / SQLite / PostgreSQL}

### Orchestration
Topology: {single-agent / supervisor / sequential / hierarchical}
Agents: [{name: role}]
Handoff: {condition → target agent}

### Error Handling
Retry: {strategy} | Max Retries: {N}
Fallback: {behavior}
Termination: {condition}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Architecture pattern selected and justified for task complexity.
- [ ] Tool schemas defined with name, description, parameter types, required fields.
- [ ] Memory strategy covers conversation, summary/entity extraction, and persistence.
- [ ] Multi-agent orchestration topology documented with handoff rules.
- [ ] Error handling strategy defined (retry, fallback, escalation).
- [ ] Termination conditions specified (max iterations, success, failure).

## Workflow

### Step 1: Architecture Selection
- ReAct: reasoning + acting loop. Best for single-agent tool-use tasks. Observe → Think → Act → Observe.
- Plan-and-Execute: decompose into subtasks, execute each. Best for complex multi-step tasks.
- Reflection: agent critiques its own output. Best for code generation, writing, analysis.
- Tool-Use: model selects and calls tools without reasoning step. Best for simple API orchestration.

### Step 2: Tool Definition
Each tool needs: name (snake_case), description (what it does, when to use), parameters (name, type, required, description, enum if applicable), returns (type and description). Keep descriptions detailed — they're the primary way the model understands when to use each tool.

### Step 3: Memory Configuration
- Conversation memory: last N turns. Simple, low cost, limited retention.
- Summary memory: periodically summarize older conversation. Balances cost and recall.
- Entity memory: extract and store named entities with their attributes.
- Vector memory: store conversation chunks + retrieve semantically. Most capable, highest cost.
- Persist to Redis for short-term, PostgreSQL for long-term, vector DB for semantic search.

### Step 4: Multi-Agent Topology
- Single-agent: one agent, all tools. Simplest, single point of failure.
- Supervisor: manager delegates to worker agents. Best for heterogeneous tasks.
- Sequential: chain of agents, each passes output to next. Best for pipelines.
- Hierarchical: nested supervisor pattern. Best for complex enterprise workflows.
- Debate: multiple agents discuss, reach consensus. Best for fact-checking, analysis.

### Step 5: Error Handling
- Transient errors: retry with exponential backoff (max 3 retries).
- Tool failures: return error to agent, let it decide next action.
- Agent loop detection: max iterations limit, detect repeated action patterns.
- Fallback: default response or human escalation when confidence low.
- Graceful degradation: reduce ambition, return partial results.

### Step 6: Safety and Guardrails
- Limit tool access based on agent role.
- Validate all tool arguments before execution.
- Log all agent actions for audit.
- Require human-in-the-loop for destructive actions.
- Set explicit termination conditions to prevent runaway costs.

## Rules
- ReAct is default. Only use Plan-and-Execute for tasks with >5 sequential dependencies.
- Tool descriptions must include when-to-use and when-not-to-use guidance.
- Never give an agent a tool it can use to harm the system (shell exec, DB write without validation).
- Memory persistence must match agent lifetime (session vs. long-running).
- Max iterations should be proportional to task complexity + 2 as buffer.
- Log every tool call with input, output, latency, and token cost.
- Multi-agent systems require a termination protocol to avoid infinite delegation.

## References
  - references/agent-architectures.md — Agent Architectures
  - references/agent-memory-patterns.md — Agent Memory Patterns
  - references/agent-multi-agent.md — Multi-Agent Systems
  - references/agent-observability.md — Agent Observability
  - references/agent-planning-strategies.md — Agent Planning Strategies
  - references/agent-testing-evaluation.md — Agent Testing and Evaluation
  - references/ai-agents-advanced.md — Ai Agents Advanced Topics
  - references/ai-agents-fundamentals.md — Ai Agents Fundamentals
  - references/orchestration.md — Agent Orchestration
  - references/tool-use-patterns.md — Tool-Use Patterns
## Handoff
For tool implementation details, hand off to `backend-api-client-generator`. For agent evaluation, hand off to `ai-evals`.
