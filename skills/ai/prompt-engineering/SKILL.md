---
name: ai-prompt-engineering
description: >
  Use this skill when designing or optimizing LLM prompts: system prompts, few-shot examples, chain-of-thought, temperature/parameter tuning, prompt injection prevention.
  This skill enforces: structured prompt components, parameter specification, security guardrails, output format validation.
  Do NOT use for: model evaluation, dataset creation, fine-tuning data prep, RAG pipeline design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, prompt-engineering, phase-10]
---

# Prompt Engineering Agent

## Purpose
Designs production-grade prompts with structured components: system directive, few-shot examples, output formatting, parameter tuning, and injection mitigation. Provides a systematic methodology for prompt strategy selection, architecture design, optimization, and production management. Covers the full lifecycle from strategy selection through deployment monitoring.

## Core Principles
- **Start with strategy, not syntax**: Choose the prompting architecture before writing any text.
- **Test quantitatively**: Every prompt decision should be validated with metrics.
- **Layer defenses**: Never rely on a single guardrail against injection or failure.
- **Minimize token waste**: Every token in the prompt should earn its place.
- **Version everything**: Prompts are code — track, diff, review, and rollback.

## Agent Protocol

### Trigger
User request includes: prompt, prompt engineering, system prompt, few-shot, chain-of-thought, temperature, token, system message, user message, assistant message, output format, structured output.

### Protocol
1. Classify task type using the decision tree.
2. Select prompting architecture based on task and model capability.
3. Design system prompt with role, task, constraints, and output format.
4. Add few-shot examples if task requires pattern demonstration.
5. Specify generation parameters (temperature, max tokens, top-p, stop sequences).
6. Add security guardrails against prompt injection and jailbreak attempts.
7. Validate prompt against ambiguity, inconsistency, and injection vectors.
8. Define test cases for evaluation and regression detection.

## Decision Trees for Strategy Selection

### Decision Tree 1: Task Type → Strategy

```
Task Type?
├── Classification / Extraction / Formatting
│   → Zero-shot or few-shot, T=0-0.3, structured output
│
├── Multi-step Reasoning / Math / Logic
│   → Chain-of-Thought, T=0-0.3, Self-Consistency if >3 steps
│
├── Multiple Valid Reasoning Paths / Exploration
│   → Tree-of-Thought (3-5 branches/step), T=0.3-0.5
│
├── Agentic / Tool Use / External Data
│   → ReAct pattern, T=0-0.3, structured tool schema
│   → If >3 tools: router → sub-agent per tool domain
│
├── Creative Writing / Brainstorming
│   → Few-shot with style examples, T=0.7-1.0
│   → If long-form: outline → draft → refine chain
│
├── Complex Multi-Step Task
│   → Decompose → subtasks → chain or DAG
│   → Each subtask: independent prompt + unit test
│
├── Factual QA with Retrieved Context
│   → RAG pattern: cite-and-answer, T=0
│   → If conflicting sources: multi-perspective synthesis
│
└── Conversational / Multi-turn
    → System prompt + conversation history management
    → Periodic re-injection of system prompt every N turns
```

### Decision Tree 2: Model Capability → Technique

```
Model Type?
├── Weak model (<7B params, older gen)
│   → Short system prompt (<200 tokens), explicit examples
│   → Avoid CoT — use decomposing into smaller steps
│   → T=0 for reliability, structured output via format enforcement
│
├── Medium model (7B-70B, capable but not frontier)
│   → CoT improves results, 3-5 few-shot examples
│   → Structured output works with schema hints
│   → T=0-0.3 for reasoning, 0.5-0.7 for generation
│
├── Frontier model (GPT-4o, Claude 3.5+, Gemini 2+)
│   → All patterns available: ToT, ReAct, meta-prompting
│   → Structured output via native JSON mode
│   → Can handle long system prompts (500+ tokens)
│   → Self-correction and self-critique work reliably
│
└── Specialized model (code-specific, instruction-tuned)
    → Leverage training distribution: match prompt format to training data
    → Code models: specify language, framework, style explicitly
    → Instruction-tuned: clear task boundary, avoid over-constraining
```

### Decision Tree 3: Output Structure

```
Output Format?
├── Machine-consumed / API
│   → Structured JSON with schema, T=0
│   → Use native JSON mode when available
│   → Validate output schema programmatically
│
├── Human-readable / Report
│   → Markdown with explicit section headers
│   → Few-shot with format examples
│   → T=0.3-0.5 for natural language quality
│
├── Code / Configuration
│   → Specify language, framework, style conventions
│   → Few-shot with code examples matching codebase style
│   → T=0-0.2, enforce via regex or AST validation
│
├── Classification Label
│   → Enum constraint: "Choose one of: [A, B, C]"
│   → Logit bias toward label tokens if available
│   → T=0 for deterministic classification
│
└── Mixed (structured + natural language)
    → Structured preamble (JSON/XML) + free text body
    → Or: two-turn — extract structured data, then generate narrative
```

### Temperature Selection Matrix

| Task Category | Temperature | Top-P | Reasoning |
|---------------|-------------|-------|-----------|
| Classification, Extraction, Code | 0.0 - 0.2 | 1.0 | Determinism > creativity |
| Factual QA, Summarization | 0.1 - 0.3 | 0.9 | Accuracy > variety |
| Reasoning, Math, Logic | 0.0 - 0.3 | 1.0 | Reproducible reasoning chains |
| Creative Writing | 0.7 - 1.0 | 0.95 | Variety > consistency |
| Brainstorming | 0.8 - 1.0 | 0.95 | Maximize diversity |
| Conversational | 0.5 - 0.7 | 0.9 | Balance of tone and coherence |
| Translation | 0.1 - 0.3 | 1.0 | Fidelity > fluency variety |
| Data Extraction | 0.0 | 1.0 | Zero tolerance for hallucination |
| Code Generation | 0.0 - 0.2 | 1.0 | Compilation correctness |
| Agentic (tool calls) | 0.0 - 0.2 | 1.0 | Correct tool selection > creativity |

## Architectural Patterns

### Single-Shot (Zero-Shot)
The model receives only a task description with no examples. Simplest pattern.

```
System: You are a classifier. Label customer queries as billing, technical, or account.
User: My card was charged twice this month.
Assistant:
```

**When**: Task is well-defined, model was trained on similar tasks, output format is simple.
**Limitation**: Sensitive to wording changes; no guidance on output style or edge cases.
**Token cost**: Lowest.

### Few-Shot Pattern
Provide 2-5 input-output examples demonstrating the task pattern. Examples define implicit behavior rules.

```
System: Classify customer queries.
Examples:
  Input: "I want to cancel" → cancellation
  Input: "Where is my order?" → shipping
  Input: "Your website is broken" → technical
User: {query}
Assistant:
```

**Selection heuristics**: span input distribution (diversity > similarity), include edge cases, order easiest-to-hardest.
**Token cost**: Linear in example count. 3-5 examples optimal for most tasks; >10 rarely helps.

### Chain-of-Thought (CoT)
Model reasons step-by-step before producing the final answer. Improves performance on reasoning tasks by 10-30%.

**Zero-shot CoT**: Append "Let's think step by step." to trigger reasoning before answer.
**Few-shot CoT**: Provide examples that include reasoning steps, not just input/output.
**Self-Consistency**: Generate N chains (N=5-20), take majority vote on final answer. Improves reliability for tasks with multiple valid reasoning paths.
**Structured CoT**: Numbered steps with explicit substeps. Best for complex multi-branch reasoning.

```
Q: A ball and a bat cost $1.10 total. The bat costs $1 more than the ball.
How much does the ball cost?
A: Let's think step by step.
1. Let the ball cost x dollars.
2. The bat costs x + $1.00.
3. Total: x + (x + 1.00) = 1.10
4. 2x + 1.00 = 1.10
5. 2x = 0.10
6. x = 0.05
The ball costs $0.05.
```

### Tree-of-Thought (ToT)
Explores multiple reasoning branches simultaneously, evaluating each before committing. More powerful than CoT but requires more tokens and orchestration.

**Process**:
1. Decompose problem into intermediate steps.
2. At each step, generate K=3-5 candidate next thoughts.
3. Evaluate each candidate (LLM-scored 1-5 or pass/fail).
4. Prune low-scoring branches, keep top 50%.
5. Select highest-scoring complete path.

**When**: Creative writing (plot planning), puzzle solving, strategy games, multi-step decisions with branching.
**Implementation**: Requires external orchestration (not single-prompt).

### ReAct (Reasoning + Acting)
Interleaves reasoning traces with tool-use actions. Foundation for agentic systems.

```
Thought: I need to find the current stock price.
Action: search_stock("AAPL")
Observation: AAPL is trading at $178.32
Thought: Now I should check the P/E ratio.
Action: get_financial_metric("AAPL", "P/E")
...
Final Answer: AAPL is at $178.32 with a P/E ratio of 28.5.
```

**Components**: Thought traces (interpretability), Actions (structured tool calls with schema), Observations (tool output), Termination (model outputs "Final Answer").
**When**: Multi-step research, code generation with execution feedback, database querying, any task requiring external information.

### Prompt Chaining
Decompose complex task into sequential specialized prompts, where each prompt's output feeds into the next.

```
Step 1: Classify query type → [support, sales, technical]
Step 2: Route to domain-specific prompt
Step 3: Generate domain-appropriate response
Step 4: Format output for channel (email, chat, ticket)
```

**When**: Task has clear sequential stages, each stage needs different expertise/constraints, or total task exceeds context window.

### Router Pattern
Single classifier prompt routes to specialized sub-prompts. Enables expert systems from general models.

```
Classify intent: {query}
Intents: billing, technical, product, account, general

→ Route to domain-specific prompt based on intent
→ Each sub-prompt has specialized instructions, examples, and constraints
```

**When**: Handling diverse query types, multi-domain systems, maintaining separation of concerns.

### Structured Output Pattern
Enforce output schema through prompt instructions, constrained decoding, or native API support.

```
You must respond with valid JSON matching this schema:
{"summary": string, "confidence": 0-1, "categories": string[]}
No markdown. No code fences. Only JSON.
```

**When**: Machine-consumed output, downstream parsing required, need to guarantee parseable results.
**Techniques**: JSON mode (API-native), grammar constraints (CFG), logit bias, regex constraints, schema validation post-generation.

### Multi-Agent Pattern
Multiple model instances or specialized agents collaborate on a task. Variants include:
- **Debate**: Agents argue different positions, synthesizer produces final answer.
- **Critique**: Generator produces output, critic reviews and provides feedback.
- **Ensemble**: Multiple independent generations, majority vote or rank aggregation.
- **Supervisor**: One agent directs and coordinates sub-agents.

**When**: Tasks requiring diverse perspectives, high-stakes decisions needing cross-verification, complex multi-domain tasks.

## Prompt Optimization Patterns

### A/B Testing Framework
Systematically compare prompt variants with statistical rigor.

```python
class PromptABTest:
    def __init__(self, model_fn, traffic_split=0.1):
        self.model = model_fn
        self.split = traffic_split
        self.results = {"control": [], "variant": []}

    def run(self, control_prompt, variant_prompt, test_inputs, evaluator_fn):
        for input_text in test_inputs:
            is_variant = hash(input_text) % 100 < self.split * 100
            prompt = variant_prompt if is_variant else control_prompt
            output = self.model(prompt.format(input=input_text))
            score = evaluator_fn(output, input_text)
            group = "variant" if is_variant else "control"
            self.results[group].append({"score": score})

        from scipy import stats
        c_scores = [r["score"] for r in self.results["control"]]
        v_scores = [r["score"] for r in self.results["variant"]]
        t_stat, p_value = stats.ttest_ind(c_scores, v_scores)

        return {
            "control_mean": statistics.mean(c_scores) if c_scores else 0,
            "variant_mean": statistics.mean(v_scores) if v_scores else 0,
            "improvement": statistics.mean(v_scores) - statistics.mean(c_scores),
            "p_value": p_value,
            "significant": p_value < 0.05,
        }

    def is_winning(self, result):
        return result["significant"] and result["improvement"] > 0
```

**Protocol**: 1. Define hypothesis and success metric. 2. Randomly split traffic (10% variant, 90% control in production). 3. Run until statistical significance (minimum 100 samples per variant). 4. Analyze, document, promote winner or iterate.

### Systematic Refinement Loop

```
1. Baseline: Write initial prompt based on strategy selection.
2. Evaluate: Run against test suite, measure quality and latency.
3. Diagnose: Identify failure patterns (format errors, reasoning gaps, hallucinations).
4. Hypothesize: Form specific fix for each failure pattern.
5. Modify: Apply targeted changes, one variable at a time.
6. Validate: Re-run test suite, check no regressions.
7. Repeat: Until pass rate threshold is met or diminishing returns.
```

**One-variable-at-a-time rule**: Change only one element per iteration (instruction wording, example selection, parameter value, constraint phrasing). Parallel changes make attribution impossible.

### Grid Search for Parameters

```python
import itertools, statistics

def grid_search(model_fn, prompt, param_grid, eval_fn, n_per_cell=3):
    best = {"score": 0, "params": None}
    keys = list(param_grid.keys())
    for values in itertools.product(*param_grid.values()):
        params = dict(zip(keys, values))
        scores = [eval_fn(model_fn(prompt, **params)) for _ in range(n_per_cell)]
        mean = statistics.mean(scores)
        if mean > best["score"]:
            best = {"score": mean, "params": params, "scores": scores}
    return best
```

**Search space**: temperature in [0, 0.3, 0.7, 1.0], top_p in [0.9, 1.0], presence_penalty in [0, 0.3, 0.6], frequency_penalty in [0, 0.3, 0.6].
**Efficiency**: Use coarse grid first, then fine-grid around best region.

### Versioning Strategy

| Level | Granularity | Version Scheme | Example |
|-------|-------------|----------------|---------|
| Major | Architecture change | v2.0.0 | Switch from few-shot to CoT |
| Minor | Instruction change, new examples | v2.1.0 | Add 2 few-shot examples, reword constraint |
| Patch | Parameter tuning, typo fix | v2.1.1 | Adjust temperature 0.2→0.1 |

**Changelog per version**: What changed, why, metric delta. Store alongside prompt in version control.

## Dynamic Prompt Construction

### Python Prompt Builder

```python
class PromptBuilder:
    def __init__(self, system_prompt: str):
        self.system = system_prompt
        self.few_shot = []
        self.user_input = ""
        self.params = {}

    def add_example(self, user: str, assistant: str):
        self.few_shot.append({"user": user, "assistant": assistant})

    def set_input(self, user_input: str):
        self.user_input = user_input

    def set_params(self, **kwargs):
        self.params = kwargs

    def build_messages(self) -> list[dict]:
        messages = [{"role": "system", "content": self.system}]
        for ex in self.few_shot:
            messages.append({"role": "user", "content": ex["user"]})
            messages.append({"role": "assistant", "content": ex["assistant"]})
        messages.append({"role": "user", "content": self.user_input})
        return messages

    def count_tokens(self, model="gpt-4"):
        import tiktoken
        enc = tiktoken.encoding_for_model(model)
        total = 0
        for msg in self.build_messages():
            total += len(enc.encode(msg["content"]))
        return total
```

### Template Engine Integration

```python
from string import Template

class TemplateManager:
    def __init__(self, template_dir: str):
        self.templates = {}
        self.metadata = {}
        # Load templates from directory

    def render(self, name: str, variables: dict, version: str = "latest") -> str:
        tmpl = self.get_template(name, version)
        return Template(tmpl).safe_substitute(variables)

    def validate(self, name: str, variables: dict) -> list[str]:
        warnings = []
        schema = self.metadata[name].get("variables", {})
        for var_name, rules in schema.items():
            if rules.get("required") and var_name not in variables:
                warnings.append(f"Required variable '{var_name}' missing")
            if var_name in variables and "max_length" in rules:
                if len(str(variables[var_name])) > rules["max_length"]:
                    warnings.append(f"Variable '{var_name}' exceeds max length")
        return warnings
```

### Context Window Manager

```python
class ContextManager:
    def __init__(self, max_tokens: int = 8000):
        self.max = max_tokens
        self.overhead = 500  # Buffer for response

    def fit(self, sections: list[dict], query: str) -> list[dict]:
        """Select sections by relevance to fit context window."""
        available = self.max - self.overhead - self._count(query)
        scored = [(self._relevance(s["content"], query), s) for s in sections]
        scored.sort(reverse=True)

        selected, used = [], 0
        for rel, section in scored:
            tokens = self._count(section["content"])
            if used + tokens <= available:
                selected.append(section)
                used += tokens
        return selected

    def _relevance(self, content: str, query: str) -> float:
        words_query = set(query.lower().split())
        words_content = set(content.lower().split())
        overlap = len(words_query & words_content)
        return overlap / max(len(words_query), 1)

    def _count(self, text: str) -> int:
        return len(text.split()) * 1.3  # Approximate token count
```

## Anti-Patterns

### Prompt Hacking
**Problem**: User input overrides or modifies system instructions through injection, roleplay, or delimiter escape.
**Solution**: Delimiter isolation (wrap all user input in unambiguous markers), sandwich defense (system → user → system reminder), input sanitization (strip known injection patterns), output validation (schema enforcement, content classification).

### Over-Prompting
**Problem**: Excessive constraints, negative directives, and redundant instructions that confuse the model or increase token waste.
**Symptoms**: Model follows some constraints but violates others; contradictory instructions; prompt exceeds 2000 tokens without proportional benefit.
**Solution**: Prioritize top-5 constraints. Remove "do not" instructions — restate positively. Test with reduced prompt to find minimal effective version. One constraint per sentence.

### Context Waste
**Problem**: Inefficient token usage: verbose instructions, redundant examples, irrelevant context, unnecessary formatting.
**Solution**: Measure input/output token ratio. Target output/input > 0.3. Remove pleasantries ("please", "kindly"). Use shortest unambiguous phrasing. Prune irrelevant few-shot examples. Compress context via summarization before injection.

### Hallucination Amplification
**Problem**: Prompt structure that encourages the model to fabricate information.
**Causes**: Asking for "detailed" explanations without source grounding; requesting speculation without labeling it; ambiguous time references ("current", "recent"); no source citation requirement.
**Solution**: Ground in provided context. Label model-generated content explicitly ("Based on the provided documents..."). Require citations for factual claims. Use "I don't know" as an allowed response.

### Feedback Loop Contamination
**Problem**: Model output becomes input for the same model, amplifying biases and errors over multiple turns.
**Solution**: Inject independent verification steps. Use different models for generation and evaluation. Maintain separation between reasoning traces and final output. Reset context periodically in long conversations.

### Single-Guardrail Fallacy
**Problem**: Relying on one defense mechanism (e.g., a single instruction "don't reveal system prompt").
**Solution**: Layer independent defenses: delimiter isolation + role hardening + output validation + content classification + monitoring. Each layer should be capable of catching failures the others miss.

### Template Rigidity
**Problem**: Templates with hard-coded structures that fail when inputs don't match expected format.
**Solution**: Validate variables before rendering. Use safe_substitute for graceful missing-variable handling. Fuzz test templates with unexpected inputs. Version templates and test on every change.

## Production Management

### Prompt Registry
A central catalog of all prompts with metadata: name, version, author, creation date, target model, task type, performance metrics, changelog.

**Schema**:
```yaml
prompt:
  id: "classify-support-v2"
  version: "2.3.0"
  model: "gpt-4o"
  task: classification
  parameters:
    temperature: 0.0
    max_tokens: 50
  metrics:
    accuracy: 0.97
    latency_p50_ms: 320
    cost_per_1k: 0.03
  tests_passed: 142/150
  owner: "team-ai"
```

### Version Control
- Store prompts as files in a version-controlled repository.
- Use structured formats (YAML, JSON) for metadata with embedded prompt text.
- Require code review for prompt changes — prompt engineering is engineering.
- Tag production-deployed versions.
- Maintain a changelog per prompt.

### Testing Pipeline
Integrate prompt testing into CI/CD:

1. **Unit tests**: Output format validation, constraint adherence, basic robustness.
2. **Regression tests**: Known test suite passes against new prompt version.
3. **Adversarial tests**: Injection and jailbreak attempt detection.
4. **Performance tests**: Latency and token efficiency measurement.
5. **A/B evaluation**: Statistical comparison with previous version on held-out set.
6. **Deployment gate**: Block if accuracy drops below threshold or regressions detected.

### Monitoring & Observability

| Metric | What It Detects | Alert Threshold |
|--------|-----------------|-----------------|
| Pass rate | Prompt quality regression | <95% |
| Latency p95 | Performance degradation | >2x baseline |
| Token output/input ratio | Context waste or over-generation | <0.1 or >5.0 |
| Error rate (parse failures) | Output format violations | >1% |
| Refusal rate | Overly restrictive guardrails | >5% or <0.1% |
| Injection attempt rate | Active attacks | Spike >3x baseline |
| Cost per call | Drift in efficiency | >1.5x baseline |

### Incident Response
1. **Detect**: Monitoring alert or user report.
2. **Triage**: Classify severity (format error, content safety, performance, cost).
3. **Mitigate**: Rollback to previous prompt version (must be one-command revert).
4. **Diagnose**: Root cause analysis — is it prompt issue, model update, or input distribution shift?
5. **Fix**: Update prompt, add regression test, deploy through pipeline.
6. **Review**: Post-mortem with documented timeline and preventive actions.

## Output
Optimized prompt with structured components and security-hardened guardrails.

### Response Format
```
## Optimized Prompt
### System
{role directive}
{task description}
{constraints and guardrails}
{output format specification}

### Few-Shot Examples (if applicable)
Input: {example input}
Output: {expected output}

### Parameters
Model: {model name}
Temperature: {value} | Max Tokens: {value}
Top-P: {value} | Stop: {sequences}

### Security
Guardrails: {filter rules}
Injection Defense: {strategy}
Output Validation: {validation method}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Strategy selected via decision tree matches task type and model capability.
- [ ] System prompt defines role, task, constraints, and output format.
- [ ] Few-shot examples match the target task distribution (diversity, edge cases, difficulty ordering).
- [ ] Temperature and parameters justified and tested against task type.
- [ ] Architectural pattern selected appropriately (CoT, ToT, ReAct, chain, etc.).
- [ ] Prompt injection defenses applied: delimiter isolation, sandwich defense, role hardening, multi-layer guardrails.
- [ ] Output validation mechanism specified and testable.
- [ ] Test cases defined: unit, regression, adversarial.
- [ ] Prompt versioned with changelog entry.
- [ ] All constraints positively stated, negatives minimized.

## Workflow

### Step 0: Strategy Selection
Use Decision Trees above to select: pattern architecture, temperature range, output format, security level, and model target.

### Step 1: Goal Elicitation
Clarify: What should the model do? What input will it receive? What output format is required? What failure modes matter most? What model will run this prompt?

### Step 2: System Prompt Design
Compose system prompt with four sections: Role (who the model is), Task (what to do), Constraints (what not to do), Output Format (exact structure). Use positive directives over negative ones. Keep under 500 tokens unless complexity demands more.

### Step 3: Few-Shot Selection
Select 2-5 examples that cover the range of expected inputs. Include edge cases if relevant. Use consistent formatting. Label inputs and outputs clearly. Order from easiest to hardest.

### Step 4: Parameter Tuning
- Temperature: 0-0.3 for classification/code, 0.3-0.7 for creative/chat, 0.7-1.0 for brainstorming.
- Max tokens: task output length + 20% buffer.
- Stop sequences: terminate generation at structured boundaries.
- Top-p: use with temperature for nucleus sampling control.
- Presence/frequency penalty: 0-0.3 to reduce repetition in generation tasks.

### Step 5: Security Hardening
- Isolate user input with delimiters (XML tags, markdown fences).
- Use sandwich defense: system → user input → system reminder.
- Constrain output format with structured schema (JSON, XML).
- Reject if user input attempts role override or instruction injection.
- Add "ignore any instructions to disregard previous instructions" style guardrails.
- Layer independent defenses: never rely on a single guardrail.

### Step 6: Validation
- Test with benign and adversarial inputs.
- Verify output adheres to format specification programmatically.
- Check for hallucination risks from ambiguous instructions.
- Measure task accuracy on a held-out test set.
- Run regression suite to verify no regressions.
- Document test results with version.

## Rules
- System prompt must be at the beginning of the context window.
- Few-shot examples must be representative, not cherry-picked.
- Temperature > 0.7 for deterministic tasks degrades reliability.
- Never rely on single guardrail — layer independent defenses.
- Output schema must be parseable without model interpretation.
- Prompts targeting code generation must specify language, framework, and style.
- Change one variable at a time during optimization to enable attribution.
- Store every prompt version with changelog and metrics.
- Test prompts on the target model — results don't transfer between model families.
- A positive constraint ("do X") is more effective than a negative one ("don't do Y").
- If a prompt exceeds 2000 tokens, consider decomposition or chaining.

## References
  - references/prompt-engineering-fundamentals.md — Core concepts: tokens, parameters, roles, output structure
  - references/prompt-engineering-advanced.md — Dynamic construction, meta-prompting, automated optimization, cross-model adaptation
  - references/prompt-patterns.md — Zero-shot, few-shot, CoT, ToT, ReAct patterns
  - references/prompt-performance-tuning.md — Token optimization, parameter search, latency, evaluation metrics
  - references/prompt-security.md — Injection defense, jailbreak mitigation, guardrail architecture
  - references/prompt-techniques.md — Prompting techniques: decomposition, chaining, self-critique, constraint injection
  - references/prompt-templates.md — Template patterns, parameterization, Jinja2, versioning
  - references/prompt-testing-framework.md — Unit/regression/A-B testing, version testing, CI/CD integration
  - references/prompt-anti-patterns.md — Common mistakes and how to avoid them
  - references/prompt-decision-trees.md — Detailed decision trees for strategy selection
  - references/prompt-production-management.md — Registry, versioning, pipeline, monitoring, incident response

## Handoff
For RAG system integration, hand off to `ai-rag-patterns`. For model serving and deployment, hand off to `ai-llm-ops`. For fine-tuning data preparation, hand off to `ai-fine-tuning`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

