# Prompt Engineering Advanced Topics

## Dynamic Prompt Construction at Scale

### Runtime Prompt Assembly
Production systems assemble prompts at runtime from multiple sources: system templates, user input, retrieved context, conversation history, and dynamic instructions.

```python
class DynamicPromptAssembler:
    def __init__(self, registry: dict):
        self.registry = registry  # prompt_id -> template + metadata

    def assemble(self, prompt_id: str, context: dict,
                 history: list | None = None) -> list[dict]:
        template = self.registry[prompt_id]
        system = template["system"].format(**context)
        messages = [{"role": "system", "content": system}]

        if history:
            for msg in history[-template.get("max_history_turns", 10):]:
                messages.append(msg)

        if template.get("retrieval"):
            retrieved = self._retrieve_context(context["query"])
            messages.append({"role": "user",
                             "content": f"Context:\n{retrieved}\n\nQuestion: {context['query']}"})
        else:
            messages.append({"role": "user", "content": context["query"]})

        return messages

    def _retrieve_context(self, query: str, top_k: int = 5):
        # Embedding-based retrieval from vector store
        pass
```

### Conditional Prompt Components
Include or exclude prompt sections based on input characteristics:

```python
def build_conditional_prompt(query: str, user_role: str, language: str) -> str:
    parts = [f"You are a helpful assistant. Respond in {language}."]
    if user_role == "admin":
        parts.append("You have access to system configuration data.")
    if len(query.split()) < 5:
        parts.append("The user's query is brief. Ask clarifying questions if needed.")
    else:
        parts.append("Provide a thorough response based on the detailed query.")
    parts.append(f"User: {query}")
    return "\n".join(parts)
```

### Variable Injection Safety
Always sanitize user-provided variables before injection into prompt templates:
- Strip delimiter-like patterns from user input.
- Validate against expected types and lengths.
- Use safe_substitute (Python) or autoescape (Jinja2).
- Never allow user input to control instruction-level content.

## Meta-Prompting

### Prompts That Write Prompts
Meta-prompting uses one model instance to generate or optimize prompts for another model instance or for itself.

```python
class MetaPrompter:
    def __init__(self, generator_model, evaluator_model):
        self.generator = generator_model
        self.evaluator = evaluator_model

    def optimize_prompt(self, task_description: str,
                        test_cases: list[dict], iterations: int = 5) -> str:
        prompt_template = """
        Write a system prompt for the following task:
        Task: {task}
        The prompt should include: role, task, constraints, and output format.
        Previous version (if any): {previous_version}
        Previous score: {previous_score}
        Make the prompt concise and specific. Output only the prompt.
        """

        current_prompt = ""
        current_score = 0

        for i in range(iterations):
            meta_prompt = prompt_template.format(
                task=task_description,
                previous_version=current_prompt or "none",
                previous_score=current_score
            )
            current_prompt = self.generator(meta_prompt)
            current_score = self._evaluate_prompt(current_prompt, test_cases)

        return current_prompt

    def _evaluate_prompt(self, prompt: str, test_cases: list[dict]) -> float:
        scores = []
        for case in test_cases:
            output = self.generator(prompt.format(**case))
            score = case.get("eval_fn", lambda x: 0)(output)
            scores.append(score)
        return statistics.mean(scores)
```

### Self-Improving Prompts
A prompt can instruct the model to critique and improve its own output:
```
Generate a response, then review it against these criteria:
1. Did you answer the specific question asked?
2. Is every claim supported by the provided context?
3. Is the response concise (under 150 words)?
4. Does the output follow the specified format?

If any criterion fails, rewrite the response to fix it.
```

## Multi-Agent Prompt Architectures

### Debate Protocol
Multiple model instances (or the same model with different prompts) generate independent responses, then a synthesizer produces the final answer.

```
Phase 1: N agents generate independent responses with different prompts/personas.
Phase 2: Each agent reviews all other agents' responses.
Phase 3: Agents update their responses based on peer review.
Phase 4: Synthesizer combines final responses into a single output.
```

**When**: Controversial topics, tasks requiring diverse perspectives, high-stakes decisions.

### Critic-Reviewer Pattern
A generator creates output; a critic evaluates it against criteria; feedback is looped back.

```
Generator: Create a response to: {query}
Critic: Evaluate the above response against: accuracy, completeness, format compliance, tone.
Critic output: {feedback + pass/fail per criterion}
If failed: Generator revises based on feedback.
Loop until all criteria pass or max iterations reached.
```

### Ensemble Aggregation
Generate N independent responses (same prompt, temperature > 0 for diversity), then aggregate:
- **Majority vote**: For classification/enum tasks.
- **Rank aggregation**: For ranked outputs.
- **Similarity clustering**: For free text — cluster responses, select centroid.

## Automated Prompt Optimization

### DSPy Framework
DSPy treats prompt engineering as a program optimization problem. Instead of hand-tuning prompts, you define a program structure and DSPy optimizes the prompts automatically.

Key concepts:
- **Signatures**: Type-annotated function signatures defining inputs/outputs.
- **Modules**: Prompting strategies (ChainOfThought, ReAct, etc.) as composable components.
- **Optimizers (Teleprompters)**: Algorithms that search for optimal prompt configurations.
- **Metrics**: Evaluation functions that measure output quality.

```python
# DSPy-style pseudocode
class ClassificationProgram(dspy.Module):
    def __init__(self):
        self.classify = dspy.ChainOfThought("query -> label, confidence")

    def forward(self, query):
        return self.classify(query=query)

program = ClassificationProgram()
optimizer = dspy.BootstrapFewShot(metric=accuracy_metric)
optimized = optimizer.compile(program, trainset=training_data)
```

### OPRO (Optimization by Prompting)
Uses the LLM itself to iteratively refine prompts. The LLM is given previous prompt versions and their scores and asked to generate improved versions.

### Textual Inversion / Prompt Embeddings
For models that support soft prompts, learn continuous prompt embeddings through gradient descent on a task dataset. These learned prompts often outperform hand-written prompts on specific tasks.

## Prompt Compression Techniques

### Lossless Compression
Remove tokens without changing meaning:
- Replace "please", "kindly", "you should" with nothing.
- Replace verbose phrases with concise equivalents ("in order to" → "to").
- Remove redundant constraint statements.
- Use abbreviations for common terms.

### Lossy Compression
Trade some accuracy for significant token savings:
- Summarize long context before injection.
- Use top-k retrieval instead of full context.
- Compress few-shot examples by removing redundant formatting.
- Use model-generated summaries of conversation history.

```python
class PromptCompressor:
    def compress_context(self, text: str, target_ratio: float = 0.5) -> str:
        """Compress by removing least informative sentences."""
        sentences = nltk.sent_tokenize(text)
        if len(sentences) <= 3:
            return text

        # Score sentences by information density (unique tokens / length)
        scored = []
        for s in sentences:
            tokens = set(s.lower().split())
            density = len(tokens) / max(len(s.split()), 1)
            scored.append((density, s))

        scored.sort(reverse=True)
        target_count = max(3, int(len(sentences) * target_ratio))
        selected = [s for _, s in scored[:target_count]]
        return " ".join(selected)
```

### Compressed Few-Shot Examples
Instead of full input-output pairs, use abbreviated format:
```
Full: Input: "I want to cancel my subscription" → Output: cancellation
Compressed: "cancel subscription" → cancellation
```

## Cross-Model Prompt Adaptation

### Model-Specific Considerations

| Factor | Frontier Models | Mid-Range Models | Small Models |
|--------|----------------|------------------|--------------|
| Instruction following | Strong | Moderate | Weak |
| Context window | 128K-200K+ | 8K-32K | 2K-8K |
| CoT effectiveness | High | Medium | Low (noise) |
| JSON mode | Native | Prompt-based | Unreliable |
| Few-shot sensitivity | Low | Medium | High |
| Temperature sensitivity | Gradual | Stepped | Binary (low/high) |

### Adaptation Strategy
When moving a prompt between model families:
1. Test baseline performance on the target model.
2. Simplify instructions for smaller models (shorter sentences, fewer constraints).
3. Add more few-shot examples for weaker instruction followers.
4. Reduce temperature range — smaller models have narrower effective ranges.
5. Use more explicit output formatting (models with weaker structured output support need stronger hints).
6. Account for tokenization differences (tiktoken vs sentencepiece vs tokenizers).

## Long-Context Window Strategies

### Position Optimization
In very long contexts (50K+ tokens), model attention degrades for middle content. Strategies:
- Place critical instructions at the very beginning or very end of the context.
- Use structured markers for mid-context retrieval: `[SECTION: financial_data]`.
- Repeat key instructions near the end for recency benefit.
- For RAG, place the most relevant documents first and last.

### Progressive Context Loading
For tasks that need more context than fits in one window:
1. Load initial context and process.
2. Summarize the current state.
3. Load next context chunk.
4. Continue processing with summary + new context.

### Context Refresh
In long multi-turn conversations, periodically re-inject key system instructions:
```
[System refresh: Remember you are a financial analyst assistant.
Your analysis must be based only on provided data.
Do not make predictions about future stock performance.]
```

## Self-Consistency and Ensemble Methods

### Self-Consistency
Generate N reasoning chains (same prompt, temperature > 0), then aggregate:
- For multiple-choice: majority vote across chains.
- For numeric answers: median or trimmed mean.
- For free-text: cluster by semantic similarity, select cluster centroid.

**Optimal N**: 5-20 chains. Diminishing returns beyond 20.
**Cost**: N × base cost. Trade off accuracy improvement vs. latency/cost.

### Prompt Ensembles
Different prompts for the same input, outputs combined:
- Persona ensemble: Different role assignments for each prompt.
- Format ensemble: Different output structure requirements.
- Constraint ensemble: Different constraint sets.
- Aggregation: Voting, scoring, or synthesis model.

## Key Takeaways
- Dynamic prompt construction requires careful variable handling and security.
- Meta-prompting enables automated prompt generation and optimization.
- Multi-agent architectures improve reliability but increase latency and cost.
- DSPy and OPRO automate prompt optimization through program search.
- Prompt compression reduces token usage by 30-50% with minimal quality loss.
- Cross-model adaptation requires systematic testing — never assume portability.
- Long-context windows create new challenges (lost in the middle) requiring position optimization.
- Self-consistency and ensembles improve reliability through redundancy.
