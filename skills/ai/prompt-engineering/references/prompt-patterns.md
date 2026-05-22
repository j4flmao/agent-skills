# Prompt Design Patterns

## Zero-Shot Prompting

The model receives only a task description with no examples. Best for well-defined tasks the model was trained on.

### Template
```
You are {role}. Your task is to {task description}.

Input: {user input}
Output: {format specification}
```

### When to Use
- Classification tasks with clear labels
- Simple extraction or formatting
- Sentiment analysis
- Language translation
- Tasks the base model performs well on

### Limitations
- Struggles with nuanced or ambiguous tasks
- No guidance on output style or reasoning pattern
- Sensitive to wording changes in the instruction

## Few-Shot Prompting

Provide 2-5 input-output examples before the real query. The examples implicitly define the task, style, and output format.

### Template
```
Task: {description}

Example 1:
Input: {input}
Output: {output}

Example 2:
Input: {input}
Output: {output}

Real query:
Input: {query}
Output:
```

### Selection Heuristics
- Choose examples that span the input distribution (diversity > similarity).
- Include edge cases to teach boundary behavior.
- Ensure examples are correct — mistakes propagate.
- 3-5 examples is the sweet spot for most tasks. More than 10 rarely helps.
- Order examples from easiest to hardest.

### Limitations
- Token cost increases linearly with example count.
- Sensitive to example ordering (recency bias toward last example).
- Cannot teach entirely new capabilities — only patterns the model already knows.

## Chain-of-Thought (CoT)

The model reasons step by step before producing the final answer. Improves performance on arithmetic, logic, and multi-step reasoning tasks by 10-30%.

### Zero-Shot CoT
Append "Let's think step by step." to the prompt. Model generates reasoning then answer.

```
Q: {question}
A: Let's think step by step.
```

### Few-Shot CoT
Provide examples that include the reasoning steps, not just input/output.

```
Q: {question}
A: {step-by-step reasoning} Therefore, {answer}
```

### Variants
| Variant | Description | Best For |
|---------|-------------|----------|
| Zero-shot CoT | "Let's think step by step" | Quick reasoning boost |
| Few-shot CoT | Examples with reasoning | Consistent reasoning format |
| Auto-CoT | LLM generates its own CoT examples | No manual example writing |
| Self-Consistency | Sample N chains, majority vote | Improving reliability |
| Structured CoT | Numbered steps, explicit substeps | Complex multi-branch reasoning |

### When to Use
- Math word problems
- Logical deduction
- Multi-hop QA
- Code debugging
- Planning and scheduling

## Tree-of-Thought (ToT)

Explores multiple reasoning branches simultaneously, evaluating each branch before committing. More powerful than CoT but requires more tokens and orchestration.

### Process
1. Decompose problem into intermediate steps.
2. At each step, generate K candidate next thoughts.
3. Evaluate each candidate with a heuristic (LLM-evaluated or rule-based).
4. Prune low-scoring branches, expand high-scoring ones.
5. Select final path or combine multiple branches.

### Config
```
Branches per step: 3-5
Depth limit: 5-10 steps
Evaluation: LLM scores 1-5 or pass/fail
Pruning: keep top 50% of branches
Selection: highest-scoring complete path
```

### When to Use
- Creative writing (plot planning)
- Puzzle solving (crosswords, Sudoku)
- Strategy games
- Multi-step decision making

## ReAct (Reasoning + Acting)

Interleaves reasoning traces with tool-use actions. The model thinks, then acts, then observes, then thinks again. Foundation for agentic systems.

### Cycle
```
Thought: {reasoning about current state}
Action: {tool call with arguments}
Observation: {result from tool}
Thought: {update reasoning based on observation}
... (repeat until goal reached)
Final Answer: {response}
```

### Components
- Thought traces: model's reasoning chain. Provides interpretability and debugging.
- Actions: structured tool calls. Must have clear name and parameter schema.
- Observations: tool outputs appended to context. Can be truncated if large.
- Termination: model outputs "Final Answer" when goal is reached or task is impossible.

### When to Use
- Multi-step research questions
- Code generation with execution feedback
- Database querying and analysis
- Any task requiring external information

## Prompt Structure Best Practices

### Sandwich Defense
```
System: {role and task}
User: {===USER INPUT===} {user input} {===END USER INPUT===}
System: Remember: {constraint reminder}
```

### Positive vs Negative Directives
- Favor: "Provide a concise summary under 100 words."
- Avoid: "Do not write a long summary."
- Favor: "Only use information from the provided context."
- Avoid: "Do not make up information."

### Output Format Specification
```
Respond in JSON format:
{
  "answer": "string",
  "confidence": 0.0-1.0,
  "sources": ["string"]
}
Always output valid JSON. No markdown. No code fences.
```
