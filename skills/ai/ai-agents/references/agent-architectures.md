# Agent Architectures

## ReAct (Reasoning + Acting)

### Core Loop
```
1. Observation: receive input from user or tool
2. Thought: reason about current state and what to do next
3. Action: call a tool or produce partial output
4. Observation: receive tool result
5. Repeat until goal is reached
6. Final Answer: produce final response
```

### Implementation
```python
class ReActAgent:
    def __init__(self, llm, tools, max_iterations=10):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
        self.max_iterations = max_iterations

    def run(self, task):
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.append({"role": "user", "content": task})

        for i in range(self.max_iterations):
            response = self.llm.invoke(messages)
            messages.append(response)

            if response.is_final:
                return response.content

            action = self.parse_action(response)
            if action.name in self.tools:
                result = self.tools[action.name].execute(**action.params)
                messages.append({"role": "tool", "content": result, "tool": action.name})
            else:
                messages.append({"role": "tool", "content": "Error: tool not found"})

        return "Max iterations reached."
```

### System Prompt Template
```
You are a helpful assistant with access to the following tools:

{tool_descriptions}

For each step, you must output:
Thought: your reasoning about the current state
Action: the tool name and arguments, or "Final Answer: your response"

You must always include "Thought:" before "Action:".
When you have enough information, output "Final Answer:" with your complete response.
```

### When to Use
- Multi-step tasks requiring external information.
- Tasks where reasoning trace matters (debugging, auditing).
- Default architecture for most single-agent systems.

### Limitations
- Linear: no branching or parallel exploration.
- Token cost: every thought and tool result adds tokens.
- Error propagation: one wrong action can derail the entire chain.
- Loop detection: can get stuck in repeated action patterns.

## Plan-and-Execute

### Decomposition Strategy
```
Task → Planner → [Subtask 1, Subtask 2, ..., Subtask N]
                    ↓           ↓               ↓
                Executor    Executor        Executor
                    ↓           ↓               ↓
                Result 1    Result 2       Result N
                    ↓           ↓               ↓
                      Synthesizer → Final Output
```

### Planner Prompt
```
You are a task planner. Given a complex task, break it down into
sequential subtasks. Each subtask should be:
1. Self-contained (can be executed independently)
2. Observable (has a clear completion condition)
3. Order-dependent when necessary

Task: {task}

Output subtasks as a numbered list. For each subtask, specify:
- What to do
- What input it needs
- What output it produces
```

### Executor Configuration
```python
class PlanAndExecuteAgent:
    def __init__(self, planner, executor, synthesizer):
        self.planner = planner
        self.executor = executor
        self.synthesizer = synthesizer

    def run(self, task):
        plan = self.planner.create_plan(task)
        results = []

        for subtask in plan.subtasks:
            result = self.executor.execute(subtask, context=results)
            results.append(result)

        return self.synthesizer.synthesize(task, results)
```

### When to Use
- Complex tasks with 5+ sequential dependencies.
- Tasks that benefit from explicit planning before execution.
- Scenarios where intermediate results must be verified before proceeding.

### Limitations
- Plan may be incorrect (require re-planning).
- Overhead of planning phase even for simple tasks.
- Rigid: doesn't handle unexpected results mid-plan well.
- Doesn't explore alternatives.

## Reflection

### Self-Critique Loop
```
1. Generate initial output
2. Critique the output against criteria
3. Revise based on critique
4. Repeat until criteria met or max iterations
```

### Reflection Prompt (Critique)
```
You are a critic evaluating the following output against these criteria:
{criteria}

Output:
{generated_output}

Evaluate each criterion and explain what needs to change:
```

### Reflection Prompt (Revise)
```
You are a writer revising your output based on feedback.

Original output:
{original_output}

Critique:
{critique}

Write an improved version that addresses all critique points:
```

### Iteration Control
```python
class ReflectionAgent:
    def __init__(self, generator, critic, max_reflections=3, quality_threshold=0.9):
        self.generator = generator
        self.critic = critic
        self.max_reflections = max_reflections
        self.quality_threshold = quality_threshold

    def run(self, task):
        output = self.generator.generate(task)

        for i in range(self.max_reflections):
            score = self.critic.evaluate(output, criteria)
            if score >= self.quality_threshold:
                return output
            critique = self.critic.critique(output)
            output = self.generator.revise(output, critique)

        return output  # best effort after max iterations
```

### When to Use
- Code generation (generate → compile → fix loop).
- Writing and editing tasks.
- Analysis and reasoning tasks needing verification.
- Any task where self-consistency improves quality.

### Limitations
- 2-5x token cost depending on iterations.
- Can over-optimize or introduce new errors in revision.
- Requires clear, objective evaluation criteria.
- Diminishing returns after 2-3 reflections.

## Tool-Use (Function Calling)

### Structured Tool Schema
```json
{
  "name": "search_documents",
  "description": "Search the knowledge base for relevant documents. Use when you need information about company policies, products, or procedures.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query (2-5 keywords for best results)"
      },
      "max_results": {
        "type": "integer",
        "description": "Number of results to return (1-10)",
        "default": 5
      },
      "filter_category": {
        "type": "string",
        "enum": ["policy", "product", "procedure", "all"],
        "description": "Category to filter results"
      }
    },
    "required": ["query"]
  }
}
```

### Tool Definition Best Practices
- Name: snake_case, short but unique. E.g., `get_weather`, `send_email`, `calculate_total`.
- Description: Include when to use AND when NOT to use. "Use for X. Do NOT use for Y."
- Parameters: descriptive with examples. "query (str): Search terms. 'Q4 2024 revenue'"
- Enums: provide exhaustive list with descriptions per value.
- Required fields: only truly required parameters. More required = more failures.
- Return type: describe what the tool returns so the model can interpret results.

### Tool Execution Safety
```python
class Tool:
    def execute(self, **kwargs):
        # Validate all parameters against schema
        self.validate(kwargs)

        # Check idempotency for safe retry
        if not self.idempotent:
            self.check_duplicate_call(self.get_signature(kwargs))

        # Execute with timeout
        with timeout(seconds=30):
            result = self._execute(kwargs)

        # Log every call
        logger.info(f"Tool call: {self.name}, args={kwargs}, result={truncate(result)}")

        # Return structured result
        return {
            "success": True,
            "data": result,
            "tool": self.name
        }
```

### When to Use
- Simple tool orchestration (API gateway pattern).
- When the model primarily needs to call external systems.
- Classification or routing tasks with tool-based actions.
- Tasks where reasoning trace is not needed.

## Architecture Selection Guide

| Condition | Recommended Architecture |
|-----------|------------------------|
| Single tool call per query | Tool-Use |
| Multi-step with reasoning | ReAct |
| Complex with clear subtasks | Plan-and-Execute |
| Need quality improvement | Reflection |
| User wants to see reasoning | ReAct or Plan-and-Execute |
| Latency critical | Tool-Use (no reasoning overhead) |
| Token budget constrained | Tool-Use (fewer tokens per turn) |

## Hybrid Approaches

### ReAct + Reflection
Use ReAct for tool-use, then run Reflection on the final answer to catch mistakes.

### Plan-and-Execute + ReAct
Planner creates subtasks, each subtask executed via ReAct loop for flexible tool use.

### Tool-Use + Reflection
Generate via tool calls, then run Reflection on the assembled result for quality.

### Tree-of-Thought + ReAct
Generate multiple ReAct trajectories, evaluate each, select best path.
