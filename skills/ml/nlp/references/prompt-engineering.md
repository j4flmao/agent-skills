# Prompt Engineering for NLP

## Prompt Engineering Techniques

| Technique | Description | When |
|-----------|-------------|------|
| Zero-shot | Task description + input | Simple tasks, no examples |
| Few-shot | N examples + input | Complex tasks, variable output |
| Chain-of-thought | Step-by-step reasoning | Multi-step, math, logic |
| Tree-of-thought | Multiple reasoning paths | Exploration, creative tasks |
| ReAct | Reasoning + acting (tools) | Agentic tasks, tool use |
| Instruction-tuned | System prompt + constraints | Production, safety |

## Prompt Structure

```
## System
You are a {role} specializing in {domain}. Follow these constraints:
{constraints}

## Task
{task_description}

## Context
{background_information}

## Examples
Input: {example_1_input}
Output: {example_1_output}

Input: {example_2_input}
Output: {example_2_output}

## Input
{current_input}

## Output
```

## Parameter Tuning

| Parameter | Range | Effect |
|-----------|-------|--------|
| temperature | 0.0 - 1.0 | Lower = deterministic, higher = creative |
| top_p | 0.0 - 1.0 | Nucleus sampling, narrower = focused |
| top_k | 10 - 100 | Consider top K tokens only |
| max_tokens | N | Limit response length |
| presence_penalty | -2.0 - 2.0 | Penalize repeated tokens |
| frequency_penalty | -2.0 - 2.0 | Penalize frequent tokens |
| stop | ["\n", "User:"] | Stop sequences |

```
import openai

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain transformers in 3 sentences."},
    ],
    temperature=0.3,
    max_tokens=150,
    top_p=0.95,
    frequency_penalty=0.1,
)
```

## Prompt Optimization

### Iterative Refinement

| Iteration | Prompt | Result |
|-----------|--------|--------|
| 1 | "Summarize this text" | Generic, misses key points |
| 2 | "Summarize this text in 2-3 sentences focusing on actionable insights" | Better structure |
| 3 | "Summarize this text in 2-3 sentences. Focus on: (1) main finding, (2) actionable insight, (3) key metric" | Consistent output |

### Prompt Templates

```
TEMPLATES = {
    "classification": """
Classify the following text into exactly one category:
Categories: {categories}
Text: {text}
Category:
""",
    "extraction": """
Extract the following fields from the text:
Fields: {fields}
Text: {text}
Output as JSON:
""",
    "summarization": """
Summarize the following text in {sentences} sentences.
Focus on {focus_area}.
Text: {text}
""",
}
```

## Evaluation

| Metric | How | When |
|--------|-----|------|
| Exact match | Output == expected | Structured output |
| ROUGE-L | Longest common subsequence | Summarization |
| BERTScore | Semantic similarity | Open-ended generation |
| Human eval | Rating scale (1-5) | Quality, coherence |
| Task accuracy | % correct on test set | Classification, extraction |
| Latency | Time to first token | Production |

## Safety & Guardrails

```
# Output validation
def validate_output(output: str, constraints: dict) -> bool:
    if constraints.get("max_length") and len(output) > constraints["max_length"]:
        return False
    if constraints.get("no_pii") and contains_pii(output):
        return False
    if constraints.get("allowed_categories"):
        if not any(cat in output for cat in constraints["allowed_categories"]):
            return False
    return True
```

| Technique | Purpose |
|-----------|---------|
| Input sanitization | Remove injection attempts |
| Output filtering | Block harmful content |
| Constraint enforcement | JSON schema, length limits |
| Content moderation | Toxicity, PII, bias checks |
| Human-in-the-loop | Flag uncertain cases |

## Best Practices

- Always include system prompt with constraints for production use
- Use temperature=0 for deterministic outputs (classification, extraction)
- Use temperature=0.3-0.7 for creative tasks (summarization, generation)
- Structure few-shot examples consistently — delimit input/output clearly
- Validate all model outputs before returning to users
- Log prompts and responses for debugging and improvement
- Version prompt templates in git alongside code
- Test prompts with edge cases (empty input, adversarial input)
- Monitor cost per prompt — longer prompts cost more
- Use token counting to ensure prompts fit within context window
