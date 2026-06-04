# Agent Orchestration

## Topology Comparison

| Topology | Scalability | Complexity | Failure Handling | Best For |
|----------|-------------|------------|-----------------|----------|
| Single-Agent | Low | Low | Retry only | Simple tool-use tasks |
| Sequential | Medium | Low | Cascade failure | Data pipelines |
| Supervisor | High | Medium | Supervisor re-delegates | Heterogeneous tasks |
| Hierarchical | High | High | Isolated per branch | Large enterprise workflows |
| Debate | Medium | High | Consensus requirement | Fact-checking, analysis |

## Single-Agent

### Structure
```
User → Agent → Tools
```

One agent with full tool access. Simplest pattern, lowest overhead.

### Configuration
```yaml
agent:
  llm: gpt-4o
  max_iterations: 15
  tools: [search, calculator, send_email, read_file]
  memory: conversation_window_20
  termination:
    max_tokens: 4000
    max_time_seconds: 120
```

### Pros and Cons
- Pros: simple, no orchestration overhead, easy to debug.
- Cons: agent must handle everything, limited context for large tool sets, single point of failure.

### When to Use
- Well-scoped tasks with 3-5 tools.
- Prototyping and MVPs.
- User-facing chat with limited tool access.

## Sequential Chain

### Structure
```
User → Agent 1 → Agent 2 → Agent 3 → User
         ↓         ↓         ↓
        Tool A    Tool B    Tool C
```

Each agent passes its output as input to the next. Like a pipeline.

### Configuration
```yaml
pipeline:
  stages:
    - agent: extractor
      role: Extract structured data from raw input
      tools: [parse_document, classify]
      output: structured_record

    - agent: analyzer
      role: Analyze structured data for insights
      tools: [search_db, calculate_metrics]
      output: analysis_report

    - agent: formatter
      role: Format analysis into user-facing response
      tools: [template_renderer]
      output: final_response
```

### Pros and Cons
- Pros: clear separation of concerns, each agent has focused context, easy to debug per stage.
- Cons: latency = sum of all agents, cascade failure (one failure breaks chain), no feedback between stages.

### When to Use
- Document processing pipelines (extract → analyze → format).
- Data transformation workflows.
- ETL-like agent tasks.

### Error Handling
- Each stage validates output schema before passing to next.
- Failed stage returns error to user with partial results.
- Retry with backoff for transient tool failures.
- Fallback to simpler processing if primary agent fails.

## Supervisor

### Structure
```
          Supervisor Agent
         /       |        \
    Worker A  Worker B   Worker C
      ↓          ↓          ↓
    Tool A     Tool B     Tool C
```

Supervisor delegates work, monitors progress, and aggregates results. Workers are specialized agents.

### Supervisor Prompt
```
You are a supervisor agent. Your role:
1. Understand the user's request
2. Break it down into sub-tasks
3. Delegate each sub-task to the appropriate worker agent
4. Review worker results for quality
5. Combine results into a final response
6. Handle worker errors by retrying or escalating

Available workers:
{worker: role: description}
```

### Worker Registration
```yaml
workers:
  researcher:
    role: "Finds and summarizes information"
    tools: [web_search, read_url, summarize]
    max_iterations: 8
    context_limit: 6000

  analyst:
    role: "Analyzes data and produces insights"
    tools: [query_database, calculate, chart]
    max_iterations: 5
    context_limit: 4000

  writer:
    role: "Produces polished output"
    tools: [format_text, check_grammar]
    max_iterations: 3
    context_limit: 2000
```

### Handoff Protocol
```
Supervisor → Worker:
{
  "task": "Summarize Q3 financial report",
  "context": { "report_url": "..." },
  "constraints": {
    "max_tokens": 1000,
    "focus_areas": ["revenue", "costs", "outlook"]
  },
  "callback": "on_researcher_complete"
}

Worker → Supervisor:
{
  "status": "completed",
  "result": { "summary": "...", "key_figures": {...} },
  "metrics": {
    "tokens_used": 1500,
    "tools_called": ["web_search", "read_url"],
    "latency_ms": 4500
  }
}
```

### Pros and Cons
- Pros: specialized workers, controlled context per worker, supervisor handles routing and aggregation.
- Cons: supervisor is bottleneck and single point of failure, complex delegation logic, context overhead for supervisor.

### When to Use
- Heterogeneous tasks requiring different expertise.
- Enterprise workflows with clearly defined roles.
- Quality control workflows (supervisor reviews worker output).

## Hierarchical

### Structure
```
             Top Supervisor
            /               \
    Supervisor A          Supervisor B
      /        \           /        \
  Worker A1  Worker A2  Worker B1  Worker B2
```

Multi-level supervision. Each supervisor manages a group of workers or sub-supervisors.

### Configuration
```yaml
hierarchy:
  top_supervisor:
    role: "Orchestrates overall task"
    children:
      - data_supervisor
      - analysis_supervisor
      - output_supervisor

  data_supervisor:
    role: "Manages data collection and validation"
    children:
      - web_scraper
      - database_query_agent
      - file_reader

  analysis_supervisor:
    role: "Coordinates analysis and insight generation"
    children:
      - statistical_analyzer
      - trend_detector
      - risk_assessor

  output_supervisor:
    role: "Manages output formatting and delivery"
    children:
      - report_writer
      - visualizer
      - email_dispatcher
```

### Pros and Cons
- Pros: massive scalability, isolated failure domains, natural organizational mapping.
- Cons: high latency (depth multiplies), complex debugging, significant cost.

### When to Use
- Enterprise-scale automation covering multiple departments.
- Complex workflows with 20+ distinct tasks.
- Organizational mirroring (each team gets its own supervisor).

## Debate / Multi-Perspective

### Structure
```
          User Question
               ↓
    ┌──────────────────────┐
    │  Moderator Agent     │
    │  - frames question   │
    │  - controls turns    │
    │  - manages consensus │
    └──────────────────────┘
         /     |     \
    Agent A  Agent B  Agent C
    (pro)    (con)    (neutral)
         \     |     /
    ┌──────────────────────┐
    │  Synthesis Agent     │
    │  - identifies common │
    │  - highlights diff   │
    │  - produces summary  │
    └──────────────────────┘
               ↓
         Final Answer
```

### Consensus Protocol
```yaml
debate:
  rounds: 3
  agents:
    - role: "Proponent — argues in favor"
    - role: "Opponent — argues against"
    - role: "Analyst — provides neutral evidence"

  consensus:
    type: majority
    threshold: 3  # all agents agree
    fallback: moderator_decides

  output_modes:
    - unanimous: "single consensus answer"
    - majority: "majority view + minority report"
    - no_consensus: "all perspectives with moderator analysis"
```

### Pros and Cons
- Pros: reduces hidden bias, surfaces multiple valid perspectives, improves factual correctness.
- Cons: expensive (multiple full agent runs), slow, can reinforce incorrect positions.

### When to Use
- Fact-checking and verification.
- Strategic decision-making.
- Complex analysis where single-perspective is insufficient.
- High-stakes outputs requiring multiple viewpoints.

## Memory Management

### Memory Types Per Topology

| Topology | Recommended Memory | Strategy |
|----------|-------------------|----------|
| Single-Agent | Conversation window + summary | Store full conversation, summarize after N turns |
| Sequential | Pass results only | No shared memory across stages |
| Supervisor | Supervisor: summary + results | Workers have short-term, supervisor has long-term |
| Hierarchical | Per-node conversation | Supervisors summarize children's state |
| Debate | All transcripts | Moderator stores full debate, synthesis per round |

### Shared Memory (Multi-Agent)
```python
class SharedMemory:
    def __init__(self, storage_backend="redis"):
        self.short_term = deque(maxlen=50)  # Recent messages
        self.long_term = {}  # Persistent summaries

    def add_observation(self, agent_id, observation):
        self.short_term.append({
            "agent": agent_id,
            "timestamp": time.now(),
            "content": observation
        })
        if len(self.short_term) >= 50:
            summary = self.summarize(self.short_term)
            self.long_term[time.now()] = summary

    def get_context(self, agent_id, lookback=10):
        recent = list(self.short_term)[-lookback:]
        return [m for m in recent if m["agent"] != agent_id]
```

## Termination and Error Handling

### Termination Conditions
```yaml
termination:
  # Normal
  - goal_achieved: true
  - max_iterations_reached: 15

  # Error
  - consecutive_failures: 3
  - tool_error_rate: "> 50%"
  - context_overflow: true

  # Cost
  - max_tokens_reached: 100000
  - max_cost_reached: "$5.00"
  - max_time_reached: "300s"

  # Safety
  - detected_loop: true
  - guardrail_triggered: true
```

### Error Propagation Rules
| Topology | Error Handling |
|----------|---------------|
| Single-Agent | Retry → fallback → inform user |
| Sequential | Stop chain, return partial results |
| Supervisor | Re-delegate to alternate worker |
| Hierarchical | Isolate to sub-tree, report to parent |
| Debate | Exclude failing agent, continue with remaining |

## Orchestration Framework Selection

| Framework | Topologies | Ease of Setup | Production Ready | Monitoring |
|-----------|-----------|---------------|-----------------|------------|
| LangGraph | Sequential, Supervisor, Hierarchical | Medium | Yes | LangSmith |
| CrewAI | Sequential, Supervisor, Hierarchical | Easy | Mostly | Limited |
| AutoGen | Debate, Supervisor | Medium | Yes | Custom |
| Semantic Kernel | Sequential, Supervisor | Medium | Yes | Azure Monitor |
| Custom (lightweight) | Any | Hard | Depends | Whatever you build |

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

