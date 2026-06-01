# AI Agents Fundamentals

## What Is an AI Agent?

An AI agent is an autonomous system that uses a language model to perceive its environment, reason about goals, and take actions through tools. Unlike a standard LLM call (input → output), an agent operates in a **perception-action loop**: observe state, reason about next action, execute action, observe new state, repeat until goal completion.

### Core Properties

| Property | Description | Absence Means |
|----------|-------------|---------------|
| Agency | Autonomous decision-making within bounds | Just a chatbot |
| Tool Use | Ability to call external functions/APIs | Purely conversational |
| Memory | Retention of past interactions and state | Each turn is stateless |
| Planning | Decomposition of goals into steps | Reactive only, no strategy |
| Adaptation | Response to intermediate results | Fixed pipeline, not agentic |

### Agent vs. Non-Agent

```
LLM Call:    Input → [LLM] → Output                    (stateless, single turn)
Chain:       Input → [LLM] → [Transform] → [LLM] → Output  (fixed pipeline)
Agent:       Input → [Reason → Act → Observe]^n → Output (adaptive loop)
```

## Perception-Action Loop

The fundamental building block of all agent architectures:

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent Loop                              │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────┐   │
│  │ Perceive │───→│  Reason  │───→│   Act    │───→│Observe│   │
│  │ (Input)  │    │ (Think)  │    │ (Tool)   │    │(Result)│  │
│  └──────────┘    └──────────┘    └──────────┘    └───┬──┘   │
│       ↑                                               │     │
│       └───────────────────────────────────────────────┘     │
│                                                              │
│  When goal achieved: Output Final Answer                     │
└─────────────────────────────────────────────────────────────┘
```

### Loop Termination Conditions

| Condition | Trigger | Behavior |
|-----------|---------|----------|
| Success | Goal criteria met | Output final answer, clean up |
| Max Iterations | Turn count exceeded | Output best-effort, log warning |
| Loop Detection | Repeated action pattern | Terminate, escalate |
| Budget Exceeded | Token/dollar threshold | Graceful degradation |
| Error Threshold | Consecutive failures | Escalate to human |
| Human Interrupt | User cancellation | Rollback, cleanup |

## Tool-Use Paradigm

Tools are the mechanism by which agents interact with external systems. The model does not execute code directly — it declares intent via structured function calls, and the runtime executes them safely.

### Tool Contract

```
[Agent] ──tool_call(name, params)──→ [Runtime] ──execute()──→ [External System]
                                                                    │
         [Agent] ←──tool_result(data, error)─── [Runtime] ←────────┘
```

### Tool Schema Anatomy

```json
{
  "name": "search_documents",
  "description": "Search knowledge base for relevant documents. Use when you need information about policies, products, or procedures. Do NOT use for real-time data or personal information.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query (2-5 keywords for best results)"
      },
      "max_results": {
        "type": "integer",
        "description": "Number of results (1-20)",
        "default": 5
      },
      "category": {
        "type": "string",
        "enum": ["policy", "product", "procedure", "all"],
        "description": "Filter by category"
      }
    },
    "required": ["query"]
  }
}
```

Critical elements:
- **Name**: snake_case, unique, descriptive
- **Description**: Must include both when-to-use AND when-not-to-use
- **Parameters**: Enums with descriptions per value, sensible defaults
- **Required**: Minimum viable set (more required = more failure modes)

## Agency Spectrum

Not all agent problems require full autonomy. Classify along the agency spectrum:

```
Level 0: Direct Call     — LLM generates text, no tools, no loop
Level 1: Tool-Use        — LLM selects tool, single call, no reasoning trace
Level 2: ReAct           — LLM reasons + acts in loop, adaptive
Level 3: Plan-Execute    — LLM plans, then executes, with re-planning
Level 4: Multi-Agent     — Multiple specialized agents coordinate
Level 5: Autonomous      — Self-directed goal pursuit, minimal human input
```

Choose the minimum level that solves the problem. Higher levels increase cost, latency, and failure modes.

## Memory Fundamentals

### Why Agents Need Memory

Without memory, an agent treats each turn as an independent problem. Memory enables:
- **Coherence**: Consistent behavior across conversation turns
- **Learning**: Adaptation based on past interactions
- **State**: Tracking progress in multi-step tasks
- **Context**: Referencing earlier information without re-processing

### Memory Types

| Type | Storage | Lookup | Capacity | Cost |
|------|---------|--------|----------|------|
| Buffered | In-memory list | Sequential scan | Context window | Free |
| Summary | LLM-generated text | Included in prompt | 1-5 summaries | Low (per-summary) |
| Key-Value | Redis/DynamoDB | Exact match | Unlimited | Low |
| Vector | Pinecone/Qdrant | Semantic search | Unlimited | Medium |
| Graph | Neo4j | Traversal | Unlimited | Medium |

### Retention Policies

- **TTL-based**: Drop entries older than N hours/days
- **Capacity-based**: Drop oldest when buffer full
- **Relevance-based**: Drop lowest-scored on semantic retrieval
- **Importance-based**: Keep high-importance (user preferences, critical facts)

## Multi-Agent Fundamentals

### Why Multiple Agents?

| Reason | Single Agent Limitation | Multi-Agent Solution |
|--------|------------------------|---------------------|
| Specialization | One model must excel at everything | Each agent optimized for one domain |
| Tool overload | Too many tools confuse selection | Tools grouped by agent role |
| Context limits | Single context window insufficient | Distributed context across agents |
| Failure isolation | One bug breaks everything | Agents can retry/reroute |
| Parallelism | Sequential processing | Concurrent subtask execution |

### Communication Patterns

- **Direct Call**: Agent A calls Agent B's API (tight coupling)
- **Message Queue**: Agents publish/consume from queues (async, decoupled)
- **Shared Memory**: Agents read/write to shared state (coordination)
- **Blackboard**: Structured workspace agents contribute to (collaboration)

## Key Points

- AI agents operate on a perception-action loop, not single-turn generation
- Choose the minimum agency level that solves the problem
- Tool descriptions are the primary mechanism for correct tool selection
- Memory strategy must match retention requirements (session vs. permanent)
- Multi-agent systems require explicit communication and termination protocols
- Every agent needs bounded iteration, error handling, and escalation paths
- Safety guardrails must constrain tool access and detect runaway behavior
- Logging and tracing are essential for debugging agent behavior
- Agent evaluation requires both component-level and system-level testing
- The agency spectrum helps match architecture to actual problem complexity
