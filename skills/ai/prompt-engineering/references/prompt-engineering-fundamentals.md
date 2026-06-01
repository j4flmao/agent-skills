# Prompt Engineering Fundamentals

## Core Concepts

### What Is a Prompt?
A prompt is a structured input to a language model that instructs it to perform a specific task. It encodes the task description, constraints, context, and expected output format. Understanding prompt mechanics requires knowledge of how LLMs process and respond to text.

### Tokenization and Context Windows
LLMs process text as tokens (not characters). A token is roughly 0.75 words for English. The context window is the maximum number of tokens the model can process in a single request.

| Model | Context Window | Typical Use |
|-------|---------------|-------------|
| GPT-4o | 128K tokens | Long documents, multi-turn |
| Claude 3.5 Sonnet | 200K tokens | Extended analysis, large codebases |
| Gemini 1.5 Pro | 1M tokens | Very long contexts |
| Llama 3 70B | 8K-32K tokens | Standard tasks |
| Mistral Large | 32K tokens | Balanced |

**Implication**: Every token in the prompt consumes context window space. Efficient prompt design maximizes task-relevant information per token.

### Message Roles

| Role | Purpose | Typical Use |
|------|---------|-------------|
| System | Sets model behavior, persona, constraints | Role, task, rules, output format |
| User | Represents the human input | Queries, data to process |
| Assistant | Model's response (can be used for few-shot) | Examples, previous turns |

The system message has the strongest influence on model behavior and should appear first in the context.

## Key Parameters

### Temperature
Controls randomness in token selection. Lower values make output more deterministic; higher values increase diversity.

| Range | Determinism | Best For |
|-------|-------------|----------|
| 0.0-0.2 | Maximum | Classification, extraction, code, math |
| 0.3-0.5 | High | Factual QA, summarization, translation |
| 0.6-0.8 | Moderate | Creative writing, chat, generation |
| 0.9-1.0 | Low | Brainstorming, poetry, diverse outputs |

**Rule**: Temperature 0 does not guarantee identical outputs due to GPU nondeterminism and system floating-point variance. Use seed parameter when reproducibility is required.

### Top-P (Nucleus Sampling)
Cumulative probability threshold for token selection. The model considers only tokens whose cumulative probability reaches top-p.

- Top-p = 1.0: Consider all tokens (default, no restriction).
- Top-p = 0.9: Consider the most likely tokens comprising 90% of probability mass.
- Lower top-p increases determinism; combine with temperature for fine control.

### Frequency and Presence Penalties
- **Frequency penalty**: Reduces repetition by penalizing tokens that have already appeared. Range 0-2.0. Useful for reducing word/topic repetition.
- **Presence penalty**: Penalizes tokens that have appeared at all (regardless of frequency). Range 0-2.0. Encourages topic diversity.

### Max Tokens
The maximum number of tokens the model can generate. Set to expected output length + 20% buffer. Overly large max_tokens wastes compute; overly small truncates responses.

### Stop Sequences
Strings that terminate generation when encountered. Useful for structured output:
- Stop at `\n\n` for single-paragraph responses.
- Stop at `}` for JSON objects.
- Stop at `\nUser:` for single-turn responses.

## Prompt Anatomy

### Essential Components
Every prompt should address four questions:

1. **Role**: Who is the model? ("You are a senior data scientist specializing in time series analysis.")
2. **Task**: What should it do? ("Analyze the following sales data and identify quarterly trends.")
3. **Constraints**: What are the boundaries? ("Only use data provided below. Do not make assumptions about missing months.")
4. **Output Format**: What structure should the response follow? ("Respond in three sections: Summary, Trend Analysis, Recommendations. Use markdown headers.")

### Optional Components
- **Context**: Background information or data the model needs.
- **Few-shot examples**: Input-output pairs demonstrating the desired pattern.
- **Chain-of-thought trigger**: "Let's think step by step" for reasoning tasks.
- **Negative constraints**: What to avoid (use sparingly; prefer positive directives).
- **Tone specification**: "Respond in a professional tone suitable for executive audience."

## Output Structure Fundamentals

### Structured Output Types

| Type | Method | Parseability |
|------|--------|--------------|
| JSON | Schema specification + JSON mode | High (json.load) |
| XML | Tag-delimited fields | Medium (XML parser) |
| Markdown | Section headers + formatting | Low (heuristic) |
| Enum | Single label from options list | High (exact match) |
| Code block | Language-specified fences | Medium (AST parse) |

### JSON Output Best Practices
```
Respond with valid JSON matching this schema:
{
  "classification": "billing | technical | account",
  "confidence": 0.0-1.0,
  "explanation": "brief reason for classification"
}
Rules:
- Output ONLY the JSON object.
- No markdown fences, no code blocks, no additional text.
- If you cannot classify, set confidence to 0.0.
```

## Basic Prompt Design Principles

### Positive Directives Over Negative
- **Favor**: "Provide a concise summary under 100 words."
- **Avoid**: "Do not write a long summary."
- **Favor**: "Only use information from the provided context."
- **Avoid**: "Do not make up information."

Models interpret positive instructions more reliably than negative ones. Negative instructions ("don't do X") often cause the model to think about X.

### Specificity Over Vagueness
- **Favor**: "Classify into one of: billing, technical, account, product."
- **Avoid**: "Classify this customer message."
- **Favor**: "Output JSON: {\"intent\": string, \"confidence\": number}"
- **Avoid**: "Tell me what the customer wants."

### Position Matters
- Most important instructions first (beginning of system prompt).
- Output format specification near the end (recency bias).
- Few-shot examples work best placed immediately before the query.
- Constraints repeated at the end (sandwich pattern) improve adherence.

### Context Window Edge Effects
- Information at the very beginning and end of the context window receives the most attention.
- Information in the middle is most likely to be ignored or forgotten ("lost in the middle").
- Place the most critical instructions at the start and end of long prompts.

## Common Pitfalls for Beginners

1. **Assuming the model understands implicit context**: Be explicit about what the model should know and not know.
2. **Overloading the system prompt**: More instructions do not equal better results. Test with minimal versions.
3. **Neglecting output format**: Without explicit format constraints, the model chooses format arbitrarily.
4. **Ignoring model differences**: A prompt that works well on GPT-4o may fail on a smaller model.
5. **One-shot evaluation**: Testing on a single example gives no confidence in prompt quality.

## Key Takeaways
- A prompt has four essential components: role, task, constraints, output format.
- Temperature 0-0.2 for deterministic tasks; 0.7-1.0 for creative tasks.
- Positive directives outperform negative ones.
- The beginning and end of context windows have the strongest influence.
- Always specify output format explicitly.
- Test prompts quantitatively, not anecdotally.
- Prompt quality is measured by consistency across diverse inputs, not peak performance on one input.
