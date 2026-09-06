# ReAct Pattern (Reason + Act)

## 1. Skill Context
**Focus**: The foundational loop for autonomous agents. Interleaving reasoning traces with external tool usage.
**Triggers**: react, reason-and-act, tool-calling, agent-loop.

## 2. The ReAct Prompt Structure
To enforce the ReAct pattern, the Agent's system prompt must force it into this strict output format:
- **Thought**: The Agent explains what it needs to do next.
- **Action**: The Agent specifies a tool to call (e.g., `search_web`, `read_file`).
- **Action Input**: The JSON payload for the tool.
*(The Agent stops generating and waits for the system)*
- **Observation**: The system injects the result of the tool call back into the context.
- *(Loop continues until the Agent decides on the final answer)*
- **Final Answer**: The final output presented to the user.

## 3. Benefits over purely Tool-Calling
Standard tool-calling (where the LLM just outputs a JSON function call) lacks a reasoning trace. ReAct forces the model to emit a `Thought` block *before* making the tool call. This vastly reduces hallucinated tool calls and infinite loops, because the model mathematically conditions its action on its own written logic.
