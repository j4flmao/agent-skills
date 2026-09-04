# Agentic Workflows & Multi-Agent Orchestration

## 1. Skill Context
**Focus**: Designing autonomous AI agents capable of reasoning, planning, executing tools, and correcting their own mistakes over long-running tasks.
**Triggers**: ai-agents, agentic-workflows, react, langgraph, autogen, multi-agent, planning.

## 2. The Evolution of Prompting
Standard LLM interactions rely on Zero-Shot or Few-Shot prompting, where the model generates a final answer immediately. 
**Agentic Workflows** wrap the LLM in a control loop (a state machine) that allows it to interact with the external world (via APIs, code execution, or databases) before returning an answer.

## 3. Core Agent Architectures

### A. ReAct (Reason + Act)
The foundational agentic loop. The agent iterates through a strict cycle:
1. **Thought**: The LLM reasons about what to do next based on the user prompt and current state.
2. **Action**: The LLM requests to call a specific Tool (e.g., `search_web`, `read_file`).
3. **Observation**: The system executes the tool and feeds the raw result back to the LLM.
*(The loop repeats until the LLM's "Thought" decides the final answer is reached).*

### B. Plan-and-Solve (Planner-Executor)
ReAct struggles with massive, multi-step goals because the LLM loses focus or gets stuck in rabbit holes.
**Plan-and-Solve** splits the brain:
- **Planner Agent**: Looks at the user request and generates a rigid Markdown checklist of steps. (It does not execute tools).
- **Executor Agent(s)**: Takes one step from the checklist, executes it using ReAct, and returns the result. 
- *Benefit*: The Planner maintains the high-level context, ensuring the system doesn't drift.

### C. Multi-Agent Orchestration (LangGraph / AutoGen)
Complex enterprise tasks require multiple specialized agents working together.
- **Supervisor Pattern**: A routing agent (Supervisor) receives the task, decides which sub-agent is best suited (e.g., the `Database_Agent` or the `Frontend_Agent`), routes the request, evaluates the response, and then routes to the next agent.
- **Hierarchical Teams**: Structuring agents like a human company. A `Tech_Lead_Agent` reviews the code produced by the `Coder_Agent`. If the code fails tests written by the `QA_Agent`, the `Tech_Lead_Agent` sends it back to the `Coder_Agent` with feedback.

## 4. Architectural Anti-Patterns
- **Infinite Tool Loops**: The agent calls `read_file("wrong_path.txt")`, gets an error, and blindly repeats the exact same action 50 times, burning through API credits. *Fix: Implement hard limits (max_iterations) and prompt the agent to explicitly change its strategy on failure.*
- **Hallucinated Tools**: The LLM tries to call a tool that isn't in its JSON schema. *Fix: Strict system prompts and rigid function-calling (JSON mode) enforcement.*
