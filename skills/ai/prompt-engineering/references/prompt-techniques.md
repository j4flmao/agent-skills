# Prompt Techniques

## Core Techniques

| Technique | When to Use | Effect |
|-----------|-------------|--------|
| Zero-shot | Simple tasks, no examples needed | Fast, lowest cost |
| Few-shot | Need to demonstrate format/pattern | Improves consistency |
| Chain-of-thought | Reasoning, math, logic problems | Improves accuracy on complex tasks |
| Structured output | Need JSON, schema, specific format | Guarantees parseable output |
| Role assignment | Need specific persona or expertise | Sets tone and perspective |
| Negative prompting | Need to avoid certain outputs | Reduces unwanted patterns |

## Chain-of-Thought (CoT)

### Basic CoT
```
Solve this step by step:
John has 5 apples. He gives 2 to Mary and buys 3 more.
How many apples does John have?

Step 1: John starts with 5 apples.
Step 2: He gives 2 away → 5 - 2 = 3 apples remain.
Step 3: He buys 3 more → 3 + 3 = 6 apples.
Answer: 6
```

### Few-Shot CoT
```
Q: A car travels 60 miles in 2 hours. What is its speed?
A: Speed = distance / time = 60 / 2 = 30 mph.

Q: A train travels 240 miles at 80 mph. How long does it take?
A: Time = distance / speed = 240 / 80 = 3 hours.
```

## Structured Output Techniques

### JSON Mode
```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract: John is 25 and lives in NY"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "person",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "number"},
                    "city": {"type": "string"}
                },
                "required": ["name", "age", "city"]
            }
        }
    }
)
```

### Schema Enforcement via Prompt
```
Extract the following fields as a JSON object:
- name (string)
- age (number, must be 0-150)
- email (string, must be valid email format)

Input: John Doe, age 30, email john@example.com
Output: {"name": "John Doe", "age": 30, "email": "john@example.com"}
```

## Decomposition

### Task Breakdown
```
Complex task: "Analyze Q3 financial report"

Subtasks:
1. Extract revenue figures (net, gross, by segment)
2. Compare to Q2 and Q3 last year
3. Identify trends (growth, decline, flat)
4. Highlight anomalies or unexpected changes
5. Summarize key takeaways in 3 bullet points
```

### Decomposition Principles
- Each subtask should be independently verifiable
- Order-dependent subtasks execute sequentially
- Independent subtasks can run in parallel
- Each subtask output feeds into the next

## Prompt Chaining

### Chain Pattern
```
Step 1: Classify query type (support/sales/technical)
Step 2: Route to specialized prompt based on classification
Step 3: Execute domain-specific response generation
Step 4: Format output according to channel requirements
```

## Temperature and Sampling

| Temperature | Creativity | Determinism | Use Case |
|-------------|------------|-------------|----------|
| 0.0-0.2 | Very low | Very high | Extraction, classification, code |
| 0.3-0.5 | Low | High | Factual QA, summarization |
| 0.6-0.8 | Moderate | Medium | Creative writing, brainstorming |
| 0.9-1.0 | High | Low | Poetry, highly creative tasks |

## Constraint Injection

### Format Constraints
```
Format your response as:
- Start with "Summary:" (one paragraph)
- Then "Details:" (bullet points, max 5)
- End with "Action Items:" (numbered, max 3)
```

### Content Constraints
```
Rules:
- Do not mention competitor names
- Use metric units only
- Cite sources when providing statistics
- If unsure, state "I don't know" explicitly
```

## Iterative Refinement

### Generate-Refine Loop
```
Pass 1: Generate initial response
Pass 2: Review against quality checklist
Pass 3: Revise based on identified gaps
Pass 4: Final verification
```

### Self-Critique Prompt
```
Review your response against these criteria:
1. Is every claim supported by the context?
2. Does the response directly answer the question?
3. Is the tone appropriate for the audience?
4. Is the response the right length?

For each criterion, state pass/fail and explain.
```
