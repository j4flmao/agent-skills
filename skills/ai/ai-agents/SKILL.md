---
name: ai-agents
description: >
  Use this skill when designing AI agent systems: agent architecture (ReAct, Plan-and-Execute, Reflection, Tool-Use), tool definition and schema design, memory configuration (conversation, summary, entity, vector), multi-agent orchestration, function calling, agent observability, and agent safety.
  This skill enforces: architecture pattern selection with decision trees, tool schema specification with validation rules, memory tier selection based on retention needs, orchestration topology documentation, and termination protocol design.
  Do NOT use for: prompt engineering for single-turn LLM calls, RAG pipeline design, model fine-tuning, function calling for non-agentic workflows, chatbot without tool-use, simple classification tasks.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, agents, agentic-systems, orchestration, phase-10]
---

# AI Agents

## Purpose
Designs production-grade AI agent systems with formally defined architectures, tool interfaces, memory hierarchies, multi-agent orchestration topologies, observability instrumentation, and safety guardrails.

## Agent Protocol

### Trigger
User request includes: AI agent, agentic system, tool-use, function calling, LangChain agent, CrewAI, AutoGen, multi-agent, agent memory, ReAct, Plan-and-Execute, agent orchestration, agent observability, agent safety, agent handoff, agent evaluation.

### Input Context
- Task scope: single-turn vs. multi-turn vs. continuous operation
- Available tools and their APIs (REST, SDK, DB, shell)
- Number of agents and their roles
- Latency requirements (real-time vs. async)
- Token budget and cost constraints
- Existing infrastructure (LLM provider, vector DB, message queue)
- Security requirements (human-in-the-loop, data isolation)

### Output Artifact
Agent system design document specifying architecture pattern, tool schemas, memory topology, orchestration protocol, error handling, and observability configuration.

### Response Format
```
## Agent System Design

### Architecture Decision
Problem: {task description}
Selected Pattern: {ReAct | Plan-and-Execute | Reflection | Tool-Use | Hybrid}
Rationale: {why this pattern fits}
LLM: {model} | Provider: {provider} | Max Iterations: {N}
Temperature: {T} | Stop Conditions: {conditions}

### Tool Definitions
{tool_name}
  Description: {when to use / when NOT to use}
  Schema: {OpenAI / Anthropic tool format}
  Parameters: {name, type, required, description, enum}
  Returns: {type, structure}
  Safety: {validation rules, rate limit, idempotency}
  Error Handling: {retry strategy, fallback}

### Memory Architecture
Ephemeral: {conversation window N turns}
Working: {summary frequency, compression strategy}
Long-Term: {entity extraction | vector store | hybrid}
Persistence Layer: {Redis | PostgreSQL | Pinecone | custom}
Retention Policy: {TTL, max tokens, archival strategy}

### Orchestration Topology
Topology: {single-agent | supervisor | sequential | hierarchical | debate | mesh}
Agent Roles: [{name: primary responsibility, tools: [...]}]
Communication: {direct call | message queue | event bus | shared memory}
Handoff Protocol: {condition -> target agent, data contract}
Synchronization: {lock-step | async | event-driven}
Termination: {max rounds | consensus | human approval | error threshold}

### Error Handling
Transient Failures: {exponential backoff | immediate retry | circuit breaker}
Tool Errors: {return error to agent | skip | retry with modified args}
Agent Loops: {max iterations N, semantic dedup detection, entropy monitoring}
Escalation: {human handoff condition, fallback response}
Degradation: {partial results | cached response | simplified workflow}

### Observability
Tracing: {OpenTelemetry | Langfuse | custom}
Metrics: {latency p50/p95/p99, token usage, tool call count, error rate, loop count}
Logging: {structured JSON, agent_id, trace_id, turn_id}
Alerting: {anomaly detection, budget threshold, degradation events}

### Safety & Guardrails
Tool Access Control: {RBAC | allowlist | parameter constraints}
Input Validation: {prompt injection detection | parameter sanitization}
Rate Limiting: {calls/min, tokens/min, concurrent sessions}
Human Oversight: {destructive actions, high-cost operations, escalation path}
Audit Trail: {full action log, immutable storage, retention period}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Architecture pattern selected and justified via decision tree.
- [ ] Tool schemas fully specified with validation rules and error handling.
- [ ] Memory tier architecture defined with retention policy.
- [ ] Orchestration topology documented with handoff protocol and termination conditions.
- [ ] Error handling covers transient failures, tool errors, loops, and escalation.
- [ ] Observability instrumentation specified (tracing, metrics, logging).
- [ ] Safety guardrails defined (access control, input validation, rate limiting, audit).
- [ ] Termination conditions prevent infinite execution and runaway costs.

## Architecture Decision Framework

### Decision Tree: Pattern Selection
```
Task requires external tool calls?
├── No → Is output quality the primary concern?
│   ├── Yes → Is the task iterative in nature (code, writing, analysis)?
│   │   ├── Yes → REFLECTION
│   │   └── No → STANDARD LLM CALL (not an agent problem)
│   └── No → STANDARD LLM CALL (not an agent problem)
└── Yes → How many sequential tool dependencies?
    ├── 0-1 → Is reasoning trace required for audit/debug?
    │   ├── Yes → ReAct
    │   └── No → TOOL-USE (function calling without reasoning)
    ├── 2-5 → Are sub-steps independently executable?
    │   ├── Yes → REACT (implicit planning in reasoning loop)
    │   └── No → REACT with explicit sub-goal decomposition
    └── >5 → Does the task decompose into independent subtasks?
        ├── Yes → PLAN-AND-EXECUTE
        └── No → HYBRID (Planner → ReAct per subtask)
```

### Decision Tree: Memory Tier Selection
```
Agent needs to retain info across sessions?
├── No → How many turns in single session?
│   ├── <10 → CONVERSATION WINDOW (no external memory)
│   ├── 10-50 → CONVERSATION + SUMMARY MEMORY
│   └── >50 → CONVERSATION + SUMMARY + VECTOR MEMORY
└── Yes → What type of cross-session recall?
    ├── Facts about user → ENTITY MEMORY (extract + store attributes)
    ├── Past conversation context → VECTOR MEMORY (semantic retrieval)
    ├── Both → HYBRID (entity + vector)
    └── Task progress → WORKING MEMORY (structured state machine)
```

### Decision Tree: Multi-Agent Topology Selection
```
How many agents are needed?
├── 1 → SINGLE-AGENT (all tools to one agent)
├── 2-5 → Do agents perform different functions?
│   ├── No → DEBATE (same goal, different perspectives)
│   └── Yes → Do tasks have sequential dependency?
│       ├── Yes → SEQUENTIAL (pipeline)
│       └── No → SUPERVISOR (delegator pattern)
└── >5 → Do you need nested specialization?
    ├── Yes → HIERARCHICAL (supervisor of supervisors)
    └── No → MESH (peer-to-peer, any agent can route to any other)
```

## Architectural Patterns

### Pattern 1: ReAct (Reasoning + Acting)
The foundational agent pattern where the model interleaves reasoning (Thought) with action (Tool call) in a loop until a final answer is produced.

```
Core Loop: Observation → Thought → Action → Observation → ... → Final Answer
```

**Implementation Strategy:**
- System prompt defines the Thought/Action/Observation format
- Each iteration appends the full turn to the message list
- Action is parsed from structured output (JSON) or text format
- Tool result is injected as a tool-response message

**When to Use:**
- Multi-step tasks requiring external data retrieval
- Tasks where audit trail of reasoning is required
- Default pattern for most single-agent systems
- Situations where the model must adapt its plan based on intermediate results

**When NOT to Use:**
- Single tool call (use Tool-Use pattern, cheaper)
- Tasks with >10 sequential dependencies (use Plan-and-Execute)
- Latency-critical applications (each reasoning step adds 500-2000ms)

**Anti-Patterns:**
- Letting the agent loop without semantic termination detection
- Overly permissive tool access leads to hallucinated tool calls
- Missing structured output parsing causes fragile action extraction

**Code Implementation:**
```python
class ReActAgent:
    def __init__(self, llm, tools, max_iterations=15, loop_detector=None):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
        self.max_iterations = max_iterations
        self.loop_detector = loop_detector or SemanticLoopDetector(window=5)
        self.trace = []

    def run(self, task: str, context: dict = None) -> dict:
        messages = _build_system_messages(self.tools)
        messages.append({"role": "user", "content": task})
        if context:
            messages.append({"role": "system", "content": f"Context: {json.dumps(context)}"})

        for turn in range(self.max_iterations):
            response = self.llm.invoke(messages)
            messages.append(response)

            if response.stop_reason == "end_turn":
                return {"result": response.content, "turns": turn + 1, "trace": self.trace}

            action = self._parse_action(response)
            if action is None:
                continue

            self.trace.append({"turn": turn, "thought": action.thought, "tool": action.name, "args": action.args})

            if self.loop_detector.detect(self.trace):
                return {"result": "Loop detected. Returning best effort.", "turns": turn + 1, "trace": self.trace}

            if action.name in self.tools:
                try:
                    result = self.tools[action.name].execute(**action.args)
                    messages.append({"role": "tool", "content": truncate(str(result), 10000), "tool_call_id": action.call_id})
                except Exception as e:
                    messages.append({"role": "tool", "content": f"Error: {str(e)}", "tool_call_id": action.call_id})
            else:
                messages.append({"role": "tool", "content": f"Error: Tool '{action.name}' not found.", "tool_call_id": action.call_id})

        return {"result": "Max iterations reached.", "turns": self.max_iterations, "trace": self.trace}

    def _parse_action(self, response):
        if response.content and "Final Answer:" in response.content:
            return None  # Will be caught by stop_reason check in production
        try:
            return ToolCall.parse(response.tool_calls[0]) if response.tool_calls else None
        except (IndexError, KeyError):
            return None
```

**Advanced ReAct Variants:**
- **ReAct with Reflection**: After each action-result pair, the agent reflects on whether the result makes sense before proceeding
- **ReAct with Verification**: After the final answer, a separate verification step checks correctness
- **Tree-of-ReAct**: Multiple ReAct trajectories run in parallel, best path selected at the end

---

### Pattern 2: Plan-and-Execute
Decomposes complex tasks into a plan of independent subtasks, executes each, then synthesizes results.

```
Flow: Task → Planner → [Subtask 1, Subtask 2, ..., Subtask N] → Executor Pool → Synthesizer → Final Output
```

**Planner Design:**
```python
class Planner:
    def create_plan(self, task: str, max_subtasks: int = 10) -> Plan:
        prompt = f"""
        Break this task into sequential subtasks. Each subtask must be:
        1. Self-contained (executable independently)
        2. Observable (clear completion signal)
        3. Order-specified (dependencies declared)

        Task: {task}

        Output as JSON array:
        [{{"id": 1, "description": "...", "depends_on": [], "tools_needed": [...]}}, ...]
        """
        response = self.llm.invoke(prompt)
        return Plan.parse(response.content)
```

**Re-Planning Strategy:**
When a subtask fails, the planner can either:
- Retry the same subtask with modified parameters
- Re-plan remaining subtasks accounting for the failure
- Abort and escalate if the failure is unrecoverable

**Executor Pool Architecture:**
```python
class ExecutorPool:
    def __init__(self, max_concurrent=3):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def execute_all(self, plan: Plan, context: dict) -> list:
        results = {}
        async def run_subtask(st):
            async with self.semaphore:
                result = await self._execute_single(st, context, results)
                results[st.id] = result
                return result

        # Topological execution respecting dependencies
        ready = [st for st in plan.subtasks if not st.depends_on]
        pending = {st.id: st for st in plan.subtasks if st.depends_on}

        while ready:
            batch = [run_subtask(st) for st in ready]
            completed = await asyncio.gather(*batch, return_exceptions=True)
            ready = []
            for st_id, st in list(pending.items()):
                if all(dep in results for dep in st.depends_on):
                    ready.append(st)
                    del pending[st_id]

        return results
```

**Synthesizer Patterns:**
- **Concatenation**: Simple ordered assembly (for linear workflows)
- **Template Filling**: Insert results into a structured template (for reports)
- **Semantic Merge**: LLM merges results into coherent output (for complex synthesis)
- **Voting**: Multiple approaches, best selected by quality metric

**When to Use:**
- Tasks with 5+ sequential dependencies
- Complex workflows where planning cost is justified
- Scenarios requiring intermediate verification before proceeding
- Parallelizable subtasks benefit from executor pool

**When NOT to Use:**
- Simple 1-3 step tasks (ReAct overhead is lower)
- Dynamic tasks where the plan must change based on results (use ReAct)
- Latency-critical applications (planning phase adds 2-5 seconds)

---

### Pattern 3: Reflection
The agent generates output, critiques it against criteria, and revises iteratively.

```
Loop: Generate → Critique → Revise → ... → Score >= Threshold → Final
```

**Critic Configurations:**
- **Same Model Self-Critique**: Most common, no additional cost for separate model
- **Different Model Critique**: Stronger model reviews weaker model's output
- **Rule-Based Critique**: Check output against formal constraints (schema, length, format)
- **Multi-Aspect Critique**: Different critics for different quality dimensions

```python
class ReflectionAgent:
    def __init__(self, generator, critic, max_rounds=3, threshold=0.8):
        self.generator = generator
        self.critic = critic
        self.max_rounds = max_rounds
        self.threshold = threshold

    def run(self, task: str, criteria: list[str]) -> dict:
        output = self.generator.generate(task)
        rounds = 0

        for i in range(self.max_rounds):
            score = self.critic.evaluate(output, criteria)
            if score >= self.threshold:
                return {"output": output, "rounds": i + 1, "final_score": score}

            critique = self.critic.critique(output, criteria)
            output = self.generator.revise(output, critique)
            rounds = i + 1

        final_score = self.critic.evaluate(output, criteria)
        return {"output": output, "rounds": rounds, "final_score": final_score, "threshold_not_met": final_score < self.threshold}
```

**When to Use:**
- Code generation (generate → compile → fix loop)
- Writing and editing tasks (content quality improvement)
- Analysis requiring verification (financial, legal, medical)
- Structured output that must match schema exactly

**Anti-Patterns:**
- Unlimited reflection loops (always set max_rounds and budget)
- Same-as-generator critic that rubber-stamps (use different prompt or model)
- Vague criteria that don't constrain the critique

---

### Pattern 4: Tool-Use (Function Calling)
Direct tool invocation without explicit reasoning trace. The model identifies the correct tool and parameters in a single step.

```
Pattern: Query → Model selects tool → Execute → Return result
```

**When to Use:**
- Simple information retrieval (weather, stock price, DB lookup)
- Classification/routing tasks
- Latency-critical applications where reasoning overhead is unacceptable
- High-throughput scenarios where token cost per call must be minimal

**When NOT to Use:**
- Multi-step reasoning is required
- Audit trail of decision-making is needed
- Task requires adapting to intermediate results

---

### Hybrid Patterns

| Hybrid | Composition | Use Case |
|--------|-------------|----------|
| ReAct + Reflection | ReAct for tool-use, Reflection on final answer | Data analysis with quality check |
| Plan-and-Execute + ReAct | Planner decomposes, each subtask uses ReAct | Complex research with tool dependencies |
| Supervisor + ReAct Workers | Supervisor delegates to specialized ReAct agents | Customer support with multiple systems |
| ReAct + Verification | ReAct generates, separate verifier checks | Code generation with test-based verification |
| Ensemble ReAct | N parallel ReAct agents, voting on final | High-stakes decisions requiring consensus |

## Memory Architecture

### Memory Tier Reference

| Tier | Scope | Retention | Latency | Cost | Implementation |
|------|-------|-----------|---------|------|----------------|
| Ephemeral | Current turn | None | 0ms | Free | LLM context window |
| Working | Current session | Turns 1-N | 0ms | Free | Context window + sliding window |
| Conversation | Session history | N recent turns | ~5ms | Low | In-memory ring buffer |
| Summary | Session compression | Summarized past | ~50ms | Medium | Periodic LLM summarization |
| Entity | Cross-session facts | Named entities | ~10ms | Low | KV store (Redis, SQLite) |
| Vector | Semantic recall | Chunks + embeddings | ~100ms | High | Vector DB (Pinecone, Qdrant) |
| State Machine | Task progress | Structured state | ~5ms | Low | State DB (PostgreSQL, DynamoDB) |

### Hybrid Memory Strategy

For production systems, combine tiers:

```python
class AgentMemory:
    def __init__(self, config: MemoryConfig):
        self.ephemeral = EphemeralBuffer(window=config.conversation_window)
        self.summarizer = Summarizer(interval=config.summary_interval)
        self.entity_store = EntityStore(backend=config.entity_backend)
        self.vector_store = VectorStore(connection=config.vector_conn)

    def add_turn(self, turn: Turn):
        self.ephemeral.add(turn)
        if self.summarizer.should_summarize(self.ephemeral):
            summary = self.summarizer.summarize(self.ephemeral.pop_old())
            self.ephemeral.inject_summary(summary)
        for entity in extract_entities(turn):
            self.entity_store.upsert(entity)
        if turn.requires_semantic_retention:
            self.vector_store.upsert(embed(turn.content), metadata={"turn_id": turn.id})

    def build_context(self, query: str) -> list[Message]:
        context = []
        context.extend(self.ephemeral.get_recent())
        semantic = self.vector_store.search(embed(query), k=5)
        if semantic:
            context.append({"role": "system", "content": f"Relevant past context: {semantic}"})
        entities = self.entity_store.get_relevant(query)
        if entities:
            context.append({"role": "system", "content": f"Known entities: {entities}"})
        return context
```

## Multi-Agent Orchestration

### Topology Reference

| Topology | Agents | Communication | Coordination | Fault Tolerance |
|----------|--------|---------------|--------------|-----------------|
| Single-Agent | 1 | N/A | N/A | None |
| Supervisor | N+1 | Direct call | Centralized | Single point of failure |
| Sequential | N | Message passing | Chain | Break on any failure |
| Hierarchical | N+M | Tree routing | Multi-level | Partial |
| Debate | N | Shared context | Consensus | Majority voting |
| Mesh | N | Peer-to-peer | Distributed | High (redundant paths) |
| Blackboard | N | Shared workspace | Tuple-space | High (decoupled agents) |

### Handoff Protocol Design

```python
@dataclass
class AgentHandoff:
    source_agent: str
    target_agent: str
    context: dict  # Carry-forward data
    handoff_reason: str  # Why this handoff is happening
    priority: int  # 1-5, for queue ordering
    timeout_ms: int
    retry_policy: RetryPolicy

class HandoffProtocol:
    def __init__(self, registry: AgentRegistry):
        self.registry = registry

    def route(self, handoff: AgentHandoff) -> Future:
        target = self.registry.get(handoff.target_agent)
        if not target:
            return self._handle_routing_failure(handoff)
        return target.dispatch(handoff.context, source=handoff.source_agent)

    def validate_contract(self, handoff: AgentHandoff) -> bool:
        # Verify source can produce what target expects
        source_schema = self.registry.get_output_schema(handoff.source_agent)
        target_schema = self.registry.get_input_schema(handoff.target_agent)
        return schema_compatible(source_schema, target_schema)
```

## Observability & Monitoring

### Critical Metrics

| Metric | What It Detects | Threshold | Action |
|--------|----------------|-----------|--------|
| Turns per task | Task complexity, loop issues | >15 | Alert, investigate agent |
| Token cost per task | Budget overruns | >$0.50 | Optimize, reduce iterations |
| Tool error rate | Broken tools, wrong params | >10% | Fix tool implementations |
| Loop detection | Agent stuck in repetition | >3 repeated actions | Terminate, escalate |
| Handoff errors | Misrouted tasks | >5% | Fix routing logic |
| Latency p95 | User experience | >10s | Optimize model or tools |
| Semantic drift | Degrading output quality | Score drop >20% | Trigger full eval |
| Concurrent sessions | Resource contention | >100 | Scale horizontally |

### Tracing Implementation

```python
class AgentTracer:
    def __init__(self, exporter: SpanExporter):
        self.tracer = TracerProvider().get_tracer("ai-agents")
        self.exporter = exporter

    @contextmanager
    def agent_span(self, agent_id: str, task_type: str):
        with self.tracer.start_as_current_span(f"agent.{task_type}") as span:
            span.set_attribute("agent.id", agent_id)
            span.set_attribute("agent.task_type", task_type)
            yield span

    def record_tool_call(self, span, tool_name: str, params: dict, result: str, latency_ms: int, success: bool):
        span.add_event("tool_call", {
            "tool": tool_name,
            "params": json.dumps(truncate_params(params)),
            "latency_ms": latency_ms,
            "success": success,
            "result_size": len(result)
        })
```

## Security & Governance

### Threat Model for Agent Systems

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Prompt injection via tool input | Agent executes attacker commands | Input sanitization, parameterized tool calls |
| Tool misuse (e.g., shell exec) | System compromise | Tool allowlist, argument validation |
| Data exfiltration via tool output | Data leak | Output filtering, PII detection |
| Runaway agent (infinite loop) | Cost explosion | Max iterations, budget tracking, circuit breaker |
| Agent-to-agent injection | Cross-agent contamination | Context isolation, handoff sanitization |
| Model jailbreak | Inappropriate responses | Guardrails, output classification, human review |

### Guardrail Implementation

```python
class AgentGuardrail:
    def __init__(self, rules: list[GuardRule]):
        self.rules = rules

    def check_input(self, messages: list[dict]) -> GuardResult:
        for rule in self.rules:
            result = rule.evaluate(messages)
            if not result.passed:
                return result
        return GuardResult(passed=True)

    def check_tool_call(self, tool_name: str, params: dict) -> GuardResult:
        if tool_name in DESTRUCTIVE_TOOLS and not self._has_human_approval():
            return GuardResult(passed=False, reason=f"Destructive tool {tool_name} requires human approval")
        if tool_name in ALLOWLIST:
            return GuardResult(passed=True)
        return GuardResult(passed=False, reason=f"Tool {tool_name} not in allowlist")

    def check_output(self, response: str) -> GuardResult:
        if contains_sensitive_data(response):
            return GuardResult(passed=False, reason="Output contains sensitive data")
        return GuardResult(passed=True)
```

## Rules

### Architecture Rules
- ReAct is default. Only use Plan-and-Execute for tasks with >5 sequential dependencies.
- Never use Tool-Use when reasoning trace is required for audit (use ReAct).
- Reflection must have bounded iterations with diminishing returns check (stop after 3 if score not improving).
- Hybrid patterns require explicit interface contracts between components.

### Tool Definition Rules
- Tool descriptions must include when-to-use AND when-not-to-use guidance.
- Parameters: minimum required fields (more required = more failure modes).
- All tool inputs must be validated against schema before execution.
- Destructive tools (write, delete, execute) require human-in-the-loop confirmation.
- Every tool must define its idempotency characteristics for safe retry.

### Memory Rules
- Match memory persistence to agent lifetime (session vs. long-running).
- Vector memory requires periodic re-indexing when embeddings model changes.
- Entity memory needs deduplication and staleness checks.
- Summary memory must balance compression ratio with information preservation.

### Safety Rules
- Never give an agent a tool it can use to harm the system (shell exec, DB write without validation, admin API).
- Implement circuit breaker: kill agent session if cost exceeds N tokens or M dollars.
- Log every tool call with input, output, latency, and token cost.
- Multi-agent systems require termination protocol to prevent infinite delegation.
- Human-in-the-loop for: destructive actions, high-cost operations (>$X), confidence below Y%.

### Performance Rules
- Max iterations = task complexity + 2 as buffer, never exceed budget.
- Tool timeouts prevent agent hanging on slow operations.
- Batch independent tool calls where supported by the provider.
- Cache deterministic tool results with TTL.

## References
- [Agent Architectures](references/agent-architectures.md) — Full pattern reference with code examples for ReAct, Plan-and-Execute, Reflection, Tool-Use, and hybrid patterns
- [Memory Patterns](references/agent-memory-patterns.md) — Memory tier architecture, hybrid strategies, and persistence implementations
- [Multi-Agent Systems](references/agent-multi-agent.md) — Topologies, handoff protocols, synchronization, and conflict resolution
- [Agent Observability](references/agent-observability.md) — Tracing, metrics, logging, alerting, and cost tracking
- [Agent Planning Strategies](references/agent-planning-strategies.md) — Planner design, re-planning, decomposition strategies, and task scheduling
- [Agent Testing & Evaluation](references/agent-testing-evaluation.md) — Unit testing, integration testing, evals, benchmarks, and regression detection
- [AI Agents Fundamentals](references/ai-agents-fundamentals.md) — Core concepts: agency, perception-action loop, tool-use paradigm
- [AI Agents Advanced](references/ai-agents-advanced.md) — Production agent systems, complex orchestration, safety at scale
- [Orchestration](references/orchestration.md) — Multi-agent coordination, routing, and lifecycle management
- [Tool-Use Patterns](references/tool-use-patterns.md) — Schema design, execution patterns, error handling, and safety patterns
- [Security & Governance](references/agent-security-governance.md) — Threat modeling, guardrails, access control, and compliance
- [Performance Optimization](references/agent-performance.md) — Latency optimization, cost optimization, caching strategies, throughput tuning

## Handoff
For tool implementation details, hand off to `backend-api-client-generator`. For agent evaluation, hand off to `ai-evals`. For agent observability infrastructure, hand off to `ai-observability`. For security review, hand off to `security-api-security`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
