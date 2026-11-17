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

## 3. ReAct Today
The text format above is the original (2022) prompt-only form. With native tool calling, the API returns structured tool-call blocks, so parse those instead of `Action:` lines (see the parent SKILL.md). The useful idea that remains is reasoning before acting: let the model write a short rationale (or use a reasoning model's thinking budget) before it picks a tool. In the ReAct paper this interleaving improved results over acting without reasoning on several benchmarks, but it does not by itself prevent loops or invented tool calls; step caps, duplicate-call detection and schema validation do that.
