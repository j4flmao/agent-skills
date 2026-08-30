# AI Agent Architectures

## 1. Skill Context
**Focus**: Designing, evaluating, and implementing Autonomous AI Agents, ReAct loops, planning, and tool use.
**Triggers**: agent architecture, multi-agent systems, react loop, tool calling, autonomous agent

## 2. Advanced Technical Patterns
The agent acts as an AI Architect, specializing in agentic workflows beyond simple RAG or zero-shot generation.

### ReAct (Reason + Act) Loop
- **Mechanics**: The model is prompted to output a "Thought" (reasoning) followed by an "Action" (tool call). It then receives an "Observation" (tool result) and continues.
- **Optimization**: Forcing strict JSON output schemas for tool calls to prevent parsing errors. Pre-filling the assistant message to guide the thought process.

### Multi-Agent Orchestration
- **Hierarchical**: A Router/Manager agent analyzes the task and delegates sub-tasks to specialized worker agents (e.g., Code Writer, Code Reviewer).
- **Sequential (Chain)**: Agent A's output becomes Agent B's input.
- **Debate/Consensus**: Two agents generate different solutions and a third agent acts as a judge to combine the best parts.

### Memory Structures
- **Short-term Memory**: The immediate context window (chat history). Often requires summarization when approaching token limits.
- **Long-term Memory**: Semantic search over past interactions (Vector DBs) or updating a structured user profile (Entity-based memory).

## 3. Output Format
- Provide the system prompt architecture.
- Explain the tool-calling schema (OpenAI format or Anthropic format).
- Use Mermaid sequence diagrams to map out the agent workflow.
