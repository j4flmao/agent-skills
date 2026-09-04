# Multi-Agent Systems (MAS)

## 1. Skill Context
**Focus**: Designing systems where multiple autonomous AI agents collaborate, argue, or sequentialize tasks to solve complex problems that a single LLM prompt cannot handle.
**Triggers**: multi-agent, swarm, langgraph, autogen, orchestration, state-machine.

## 2. The Multi-Agent Philosophy
A single LLM acting as a "God Agent" with 50 tools will eventually fail. The context window becomes polluted, and the model forgets its original objective.
**Multi-Agent Systems (MAS)** solve this by specializing. You create a `CoderAgent`, a `ReviewerAgent`, and a `QA_Agent`, each with distinct system prompts and narrowly scoped tools.

## 3. Orchestration Architectures

### A. State Graphs (Deterministic Routing)
*Frameworks: LangGraph*
The system is explicitly modeled as a Directed Cyclic Graph (DCG). 
- **Nodes**: Represent the Agents (or python functions).
- **Edges**: Represent the conditional logic routing the flow from one agent to another.
- **Pros**: Highly predictable, easy to debug, guarantees the workflow will eventually terminate or follow business rules.
- **Cons**: Rigid. If the user asks for something outside the predefined graph flow, the system cannot adapt dynamically.

### B. Swarm Intelligence (Dynamic Orchestration)
*Frameworks: AutoGen, OpenAI Swarm*
Agents act autonomously without a hardcoded graph. 
- A user submits a complex request.
- The **Manager Agent** broadcasts the request to a pool of specialized agents.
- Agents dynamically volunteer to handle parts of the task, pass messages directly to each other, and decide organically when the task is complete.
- **Pros**: Incredibly flexible. Can solve novel problems the developer never anticipated.
- **Cons**: Prone to infinite conversational loops ("No, you do it", "No, you do it") and hallucinations. Extremely difficult to debug in an enterprise production environment.

## 4. References
- `references/communication-protocols.md` — How agents share data (Blackboard vs. Actor Model).
- `references/human-in-the-loop.md` — Pausing agent execution for human approval.
