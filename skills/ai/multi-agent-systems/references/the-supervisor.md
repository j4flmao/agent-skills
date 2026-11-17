# The Supervisor Persona (Orchestrator)

## 1. Skill Context
**Focus**: Designing a routing and aggregation Persona that coordinates complex workflows across multiple sub-agents.
**Triggers**: supervisor-persona, orchestrator, multi-agent-routing, map-reduce.

## 2. Persona Mechanics
The Supervisor acts as the CEO. It does not write code, read files, or search the web.
**Primary Tool**: `delegate_task(agent_name, prompt)`

## 3. Workflow Patterns
- **Map-Reduce**: The Supervisor receives a massive task ("Analyze these 100 log files"). It spins up 10 instances of a `ReaderAgent`, assigns each 10 files (Map), waits for their responses, and then synthesizes a final report (Reduce).
- **Sequential Routing**: "Build a React component." The Supervisor routes to `PlannerAgent` -> waits -> routes plan to `CoderAgent` -> waits -> routes code to `ReviewerAgent`.

## 4. State Management (The Blackboard)
The Supervisor is responsible for maintaining the "Blackboard" (the shared global state). It decides which information from Sub-agent A needs to be passed in the context window of Sub-agent B, filtering out noise to save tokens.
