---
name: multi-agent-coordination
description: >
  Use this skill to design, implement, and operate multi-agent systems (MAS) where multiple AI agents collaborate, delegate, and coordinate to solve complex tasks.
  This skill enforces: orchestrator pattern selection, supervisor-worker hierarchy design, inter-agent communication protocols, DAG-based task decomposition, shared state management, compounding failure rate mitigation, role specialization matrices, and consensus mechanisms.
  Do NOT use for: single-agent prompt engineering, model training pipelines, or non-agent distributed systems architecture.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, multi-agent, coordination, orchestration, dag, consensus, agent-protocols]
---

# Multi-Agent Coordination Skill

## Purpose
Provides a production-grade framework for designing and operating multi-agent systems (MAS) where two or more AI agents collaborate to decompose, execute, and synthesize complex tasks. This skill defines orchestration topologies (centralized, decentralized, hierarchical), inter-agent communication standards, DAG-based workflow decomposition, shared state architectures, compounding failure rate mitigation strategies, agent role specialization patterns, and consensus/conflict resolution protocols. The framework ensures that multi-agent deployments maintain coherence, avoid redundant work, handle partial failures gracefully, and produce synthesized outputs that exceed what any single agent could achieve alone.

---

## Core Principles
1. **Explicit Task Decomposition**: Every complex task must be decomposed into a directed acyclic graph (DAG) of subtasks before delegation. Never allow agents to self-decompose without orchestrator validation.
2. **Bounded Agent Autonomy**: Each agent operates within a defined capability envelope. Agents must not exceed their role boundaries or invoke tools outside their authorized scope.
3. **Failure Isolation**: A failing agent must not cascade failures to sibling or parent agents. Circuit breakers, timeouts, and retry budgets must be enforced at every agent boundary.
4. **State Convergence**: All agents must converge on a single consistent view of shared state. Conflicts are resolved through deterministic merge strategies, not last-write-wins.
5. **Observable Coordination**: Every inter-agent message, delegation, and result must be logged with correlation IDs for end-to-end tracing across the agent graph.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Tasks that require multiple specialized capabilities (e.g., code generation + security review + documentation).
- Workflows that benefit from parallel execution across independent subtask branches.
- Systems where a supervisor agent must delegate, monitor, and synthesize results from worker agents.
- Scenarios requiring consensus among multiple agents before committing a decision.
- Architectures involving agent-to-agent communication, message passing, or shared blackboard state.

### Input Context Required
- **Task Specification**: A clear description of the top-level goal to be decomposed.
- **Agent Registry**: The available agent pool with their capabilities, tool access, and resource limits.
- **Coordination Topology**: The selected orchestration pattern (centralized, hierarchical, peer-to-peer).
- **State Backend Configuration**: Connection details for the shared state store (Redis, PostgreSQL, in-memory).
- **Failure Budget**: Maximum allowed failure rate and retry limits per agent.

### Output Artifact
- **Execution DAG**: A structured graph of subtasks with dependencies, assignments, and status tracking.
- **Synthesized Result**: The merged output from all agent contributions.
- **Coordination Log**: A complete trace of all inter-agent messages, delegations, and state transitions.

### Response Formats
For programmatic coordination, the execution state must follow this schema:

```json
{
  "dag_id": "task-2026-q3-analysis",
  "status": "in_progress",
  "topology": "supervisor-worker",
  "nodes": [
    {
      "id": "node-001",
      "task": "Extract financial data from Q3 reports",
      "assigned_agent": "data-extraction-agent",
      "status": "completed",
      "dependencies": [],
      "result_ref": "s3://results/node-001.json"
    },
    {
      "id": "node-002",
      "task": "Analyze revenue trends",
      "assigned_agent": "analysis-agent",
      "status": "running",
      "dependencies": ["node-001"],
      "result_ref": null
    },
    {
      "id": "node-003",
      "task": "Generate executive summary",
      "assigned_agent": "writing-agent",
      "status": "pending",
      "dependencies": ["node-001", "node-002"],
      "result_ref": null
    }
  ],
  "failure_budget": { "max_retries": 3, "current_failures": 0 },
  "correlation_id": "corr-7a3f-b291"
}
```

---

## Decision Matrix

```
Task Complexity Assessment
├── Single Capability Required
│   → Use single-agent execution. No coordination needed.
│
├── Multiple Capabilities, Sequential Dependencies
│   ├── < 5 Steps
│   │   → Use Pipeline Pattern (linear chain of specialized agents).
│   └── ≥ 5 Steps
│       → Use Supervisor-Worker with sequential delegation.
│
├── Multiple Capabilities, Parallel Independent Branches
│   ├── Homogeneous Agents (same capability)
│   │   → Use Fan-Out/Fan-In with load balancing.
│   └── Heterogeneous Agents (different capabilities)
│       → Use DAG Orchestrator with parallel branch execution.
│
├── Requires Consensus or Conflict Resolution
│   ├── Binary Decision (approve/reject)
│   │   → Use Voting Protocol (majority or unanimous).
│   └── Complex Synthesis (merge multiple perspectives)
│       → Use Debate Pattern with arbiter agent.
│
└── Dynamic Task Discovery (subtasks emerge during execution)
    ├── Bounded Depth
    │   → Use Recursive Decomposition with depth limits.
    └── Unbounded
        → Use Autonomous Agent Swarm with budget constraints.
```

---

## Detailed Architectural Overview

The multi-agent coordination system consists of orchestration, communication, state management, and monitoring layers.

```
+------------------+     +---------------------+     +------------------+
| Task Intake      | ──► | DAG Decomposer      | ──► | Agent Router     |
+------------------+     +---------------------+     +------------------+
                                                            │
                         ┌──────────────────────────────────┼──────────────────────────────────┐
                         │                                  │                                  │
                    +----▼-----+                       +----▼-----+                       +----▼-----+
                    | Agent A  |                       | Agent B  |                       | Agent C  |
                    | (Code)   |                       | (Review) |                       | (Docs)   |
                    +----┬-----+                       +----┬-----+                       +----┬-----+
                         │                                  │                                  │
                         └──────────────────────────────────┼──────────────────────────────────┘
                                                            │
                                                       +----▼-----+
                                                       | Result   |
                                                       | Merger   |
                                                       +----┬-----+
                                                            │
                                                       +----▼-----+
                                                       | Final    |
                                                       | Output   |
                                                       +----------+
```

### Coordination Lifecycle

```
[Task Specification]
       │
       ├──► (A) DAG Planner ──► Decomposes task into nodes with dependency edges
       │
       ├──► (B) Agent Matcher ──► Maps each node to the best-fit agent by capability score
       │
       ├──► (C) Scheduler ──► Topological sort → determines execution order and parallelism
       │
       ├──► (D) Executor ──► Dispatches subtasks, monitors heartbeats, enforces timeouts
       │
       ├──► (E) State Manager ──► Maintains shared context, merges partial results
       │
       └──► (F) Synthesizer ──► Combines agent outputs into coherent final deliverable
```

---

## Workflow Steps

### Phase 1: Task Decomposition
1. **Parse Task Specification**: Extract the top-level goal, constraints, quality requirements, and deadline.
2. **Identify Capability Requirements**: Map the task to required capabilities (e.g., code generation, data analysis, writing).
3. **Build Dependency Graph**: Construct a DAG where nodes are subtasks and edges represent data dependencies.
4. **Validate DAG Properties**: Confirm the graph is acyclic, all nodes are reachable, and no orphaned subtasks exist.

### Phase 2: Agent Selection & Routing
1. **Query Agent Registry**: Retrieve available agents with their capability vectors, current load, and health status.
2. **Compute Fitness Scores**: For each subtask-agent pair, calculate a fitness score based on capability match, availability, and historical performance.
3. **Resolve Contention**: When multiple subtasks compete for the same agent, apply priority-based scheduling or clone the agent.
4. **Assign and Notify**: Bind each subtask to its selected agent and dispatch the assignment message with full context.

### Phase 3: Parallel Execution & Monitoring
1. **Dispatch Independent Branches**: Launch all subtasks with zero unmet dependencies in parallel.
2. **Monitor Heartbeats**: Each agent emits periodic heartbeat signals. Detect stalled agents within the timeout window.
3. **Enforce Timeout Budgets**: Kill agents that exceed their allocated execution time and trigger fallback strategies.
4. **Cascade Completions**: When a subtask completes, unblock dependent downstream subtasks and dispatch them.

### Phase 4: State Synchronization
1. **Collect Partial Results**: As agents complete subtasks, store their outputs in the shared state backend.
2. **Merge Shared Context**: Apply deterministic merge strategies (CRDT-based or timestamp-ordered) to resolve concurrent updates.
3. **Broadcast State Updates**: Notify dependent agents of newly available context from completed upstream tasks.
4. **Checkpoint Progress**: Persist the current DAG execution state for crash recovery.

### Phase 5: Failure Handling & Recovery
1. **Detect Failures**: Identify agent crashes, timeout violations, and malformed output errors.
2. **Apply Retry Policy**: Retry failed subtasks up to the configured retry budget with exponential backoff.
3. **Activate Circuit Breakers**: If an agent fails repeatedly, mark it as unhealthy and reroute its subtasks to alternative agents.
4. **Compute Cascade Impact**: Assess which downstream subtasks are blocked by the failure and update the DAG status.

### Phase 6: Result Synthesis & Delivery
1. **Collect All Terminal Outputs**: Gather results from all leaf nodes and merge nodes in the DAG.
2. **Apply Synthesis Strategy**: Use the configured merge strategy (concatenation, summarization, or structured aggregation).
3. **Run Quality Checks**: Validate the synthesized output against the original task specification's quality requirements.
4. **Deliver and Archive**: Return the final result to the requester and archive the complete execution trace.

---

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **Cascading Agent Failures** | A critical upstream agent fails, blocking all downstream dependents. | Implement redundant agent pools for critical path nodes and enable automatic failover routing. |
| **State Divergence Between Agents** | Concurrent writes to shared state without conflict resolution. | Use CRDTs or vector clocks for shared state merges. Never use last-write-wins in production. |
| **Deadlocked DAG Execution** | Circular dependency introduced by dynamic subtask creation. | Validate DAG acyclicity after every dynamic node insertion. Reject cycles immediately. |
| **Agent Overloading** | Too many subtasks routed to a single high-capability agent. | Implement load-aware routing with queue depth limits and agent cloning for horizontal scaling. |
| **Inconsistent Synthesized Output** | Agents use different assumptions or context versions. | Pin context versions at delegation time. Include context hash in subtask assignments. |
| **Excessive Coordination Overhead** | Fine-grained decomposition creates too many inter-agent messages. | Coarsen the DAG granularity. Merge small subtasks into larger batches to reduce message volume. |
| **Stale Agent Registry** | Unhealthy agents remain in the registry, receiving subtask assignments. | Implement health-check heartbeats with automatic deregistration after 3 consecutive failures. |

---

## Complete Execution Scenario

```
[Task: "Analyze Q3 codebase for security vulnerabilities and generate a report"]
       │
       ▼
[DAG Decomposer]
  ├── Node 1: "Clone repository and index files" ──► assigned: infra-agent
  ├── Node 2: "Run SAST scanner" ──► depends: [1] ──► assigned: security-agent
  ├── Node 3: "Run dependency audit" ──► depends: [1] ──► assigned: security-agent
  ├── Node 4: "Analyze code complexity" ──► depends: [1] ──► assigned: analysis-agent
  ├── Node 5: "Synthesize findings" ──► depends: [2, 3, 4] ──► assigned: writing-agent
  └── Node 6: "Format final report" ──► depends: [5] ──► assigned: writing-agent
       │
       ▼
[Execution Timeline]
  t=0s   ──► Node 1 starts (infra-agent clones repo)
  t=12s  ──► Node 1 completes ──► Nodes 2, 3, 4 start in parallel
  t=30s  ──► Node 4 completes (analysis-agent finishes)
  t=45s  ──► Node 3 completes (dependency audit done)
  t=60s  ──► Node 2 completes (SAST scan done)
  t=61s  ──► Node 5 starts (all dependencies met)
  t=90s  ──► Node 5 completes ──► Node 6 starts
  t=105s ──► Node 6 completes ──► Final report delivered
       │
       ▼
[Result Merger] ──► Combines SAST results + dependency audit + complexity analysis
       │
       ▼
[Final Report] ──► Delivered to requester with full audit trail
```

---

## Rules and Guidelines
- **Rule 1**: Every multi-agent deployment must have a single designated orchestrator or supervisor. Leaderless topologies require explicit consensus protocols.
- **Rule 2**: Inter-agent messages must be serializable, versioned, and include correlation IDs for distributed tracing.
- **Rule 3**: Agent execution time limits must be enforced at the orchestrator level, not self-reported by agents.
- **Rule 4**: Shared state must never be mutated directly by worker agents. All state updates flow through the state manager with conflict resolution.
- **Rule 5**: The total failure rate of a multi-agent pipeline must be monitored as a compound probability: $P_{fail} = 1 - \prod_{i=1}^{n}(1 - p_i)$ where $p_i$ is the individual agent failure rate.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, protocols, code implementations, and best practices for multi-agent coordination:

- [orchestrator-patterns.md](references/orchestrator-patterns.md)
  Covers centralized and decentralized orchestration topologies, router-based dispatch, and orchestrator lifecycle management.
- [supervisor-worker-hierarchies.md](references/supervisor-worker-hierarchies.md)
  Details hierarchical agent structures, delegation protocols, result aggregation, and supervisor decision loops.
- [inter-agent-protocols.md](references/inter-agent-protocols.md)
  Defines agent-to-agent communication standards, message schemas, serialization formats, and protocol versioning.
- [dag-task-decomposition.md](references/dag-task-decomposition.md)
  Explains DAG-based workflow decomposition, topological sorting, critical path analysis, and dynamic subtask insertion.
- [state-sharing-mechanisms.md](references/state-sharing-mechanisms.md)
  Covers shared state architectures including blackboard systems, CRDTs, event sourcing, and distributed caches.
- [failure-rate-mitigation.md](references/failure-rate-mitigation.md)
  Details compounding failure rate mathematics, circuit breaker patterns, retry strategies, and graceful degradation.
- [role-specialization-patterns.md](references/role-specialization-patterns.md)
  Explains agent role design, capability matrices, dynamic role assignment, and specialization vs. generalization trade-offs.
- [consensus-coordination.md](references/consensus-coordination.md)
  Covers consensus protocols, voting mechanisms, conflict resolution strategies, and arbiter-based decision making.

---

## Handoff
For context management within individual agents, hand off to `context-engineering`. For guardrail enforcement across agent boundaries, hand off to `guardrails-safety`. For observability and distributed tracing of multi-agent systems, hand off to `ai-observability`. For prompt engineering within individual agents, hand off to `prompt-engineering`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with multi-agent coordination protocols, DAG execution, and distributed state management.
-->
