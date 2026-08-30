# Agent Planning Strategies

Autonomous agents require planning to break down complex tasks.

## 1. Chain of Thought (CoT)
Prompting the model to "think step-by-step" before answering. This consumes more output tokens but significantly increases reasoning accuracy.

## 2. Tree of Thoughts (ToT)
Instead of a single linear path, the agent explores multiple reasoning paths, evaluating the viability of each step, and backtracking if a path leads to a dead end. Requires multiple API calls per step.

## 3. Plan-and-Solve
The agent explicitly generates a numbered plan first, then executes the plan sequentially.
- **Prompt Structure**: "First, create a step-by-step plan. Then, execute the plan."
- **Benefit**: Prevents the agent from getting lost in a long ReAct loop by giving it a static roadmap.

## 4. LLM Compiler
An approach inspired by traditional compilers. The agent parses the user request into a DAG (Directed Acyclic Graph) of tool calls that can be executed in parallel, massively speeding up execution time compared to sequential ReAct.
