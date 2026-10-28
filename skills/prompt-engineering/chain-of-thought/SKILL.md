---
name: prompt-chain-of-thought
description: >
  Use this skill when the user says 'chain of thought', 'CoT', 'think step by step', 'reasoning prompt', 'self-consistency', 'make the model reason', 'extended thinking', 'reasoning model prompting'. Decides when explicit step-by-step reasoning helps, how to elicit it (zero-shot, few-shot, structured scratchpads, self-consistency), how to work with native reasoning models, and how to keep reasoning out of user-facing or parsed output. Do NOT use for: search over multiple reasoning branches (prompt-engineering/tree-of-thoughts), choosing demonstrations (prompt-engineering/few-shot-prompting), or agent planning loops (ai/ai-agents/core-architectures).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [prompt-engineering, chain-of-thought, reasoning, self-consistency, llm]
---

# Chain-of-Thought Prompting

## Purpose
Autoregressive models spend a fixed amount of computation per generated token. Asking the model to write intermediate steps before the answer gives it more tokens, and therefore more computation, conditioned on its own partial work. This reliably helps on multi-step arithmetic, logic, and planning, does little for simple lookup or classification, and is largely built in for reasoning models that think before answering.

## Agent Protocol

### Trigger
"chain of thought", "CoT", "let's think step by step", "reasoning steps", "self-consistency", "majority vote answers", "extended thinking", "reasoning effort".

### Input Context
- Task type and examples of failures.
- Model type: standard chat model or reasoning model (with thinking/reasoning-effort controls).
- Output consumer: human or parser; latency and cost budget.

### Output Artifact
Prompt template with reasoning section and answer extraction, plus decision on sampling (single vs self-consistency) and an eval comparison.

### Response Format
```
Use CoT: {yes|no|native reasoning} because {task property}
Template: {zero-shot|few-shot CoT|structured scratchpad}
Extraction: answer in <answer> tags / JSON field
Sampling: {greedy|self-consistency n={k}, temperature={t}}
Eval: accuracy with vs without CoT on {n} items; token cost delta
```

### Completion Criteria
- [ ] CoT benefit measured against a direct-answer baseline.
- [ ] Final answer separable from reasoning by a deterministic parser.
- [ ] Reasoning not exposed where it could leak policy or confuse users.
- [ ] Reasoning models given goals and constraints, not micromanaged steps.

## When It Helps
| Task | CoT effect |
|---|---|
| Multi-step math / word problems | Large gains (the original CoT results) |
| Symbolic/logic puzzles, multi-hop QA | Gains |
| Code with tricky logic | Gains when paired with tests |
| Simple classification, extraction, lookup | Little or none; costs tokens and latency |
| Very small models | Gains appear mainly at larger scale |

## Techniques

**Zero-shot CoT** (Kojima et al., 2022): add an instruction to reason before answering.

**Few-shot CoT** (Wei et al., 2022): demonstrations that include worked reasoning, not only answers.

**Structured scratchpad**: separate reasoning and answer with tags so code can parse the result.

```text
Solve the problem. First reason inside <thinking> tags: list the known quantities,
the unknown, and each calculation. Then give only the final number inside <answer> tags.

Problem: A warehouse ships 340 boxes per day for 6 days, then 25% more per day
for the next 4 days. How many boxes in total?
```

```python
import re

def extract_answer(text: str) -> str:
    m = re.search(r"<answer>\s*(.*?)\s*</answer>", text, re.DOTALL)
    if m is None:
        raise ValueError(f"no <answer> tag in model output: {text[-200:]!r}")
    return m.group(1)
```

**Self-consistency** (Wang et al., 2022): sample several reasoning paths at non-zero temperature and take the majority answer. Improves accuracy on tasks with a single checkable answer at k× cost.

```python
from collections import Counter

def self_consistent_answer(ask, prompt: str, k: int = 5, temperature: float = 0.7) -> tuple[str, float]:
    answers = [extract_answer(ask(prompt, temperature=temperature)) for _ in range(k)]
    best, votes = Counter(answers).most_common(1)[0]
    return best, votes / k      # agreement rate doubles as a confidence signal
```

**Decomposition variants**: least-to-most (solve sub-questions in order), plan-and-solve (write a plan, then execute), program-of-thought (have the model write code and run it for exact arithmetic).

## Reasoning Models
Models with native reasoning (e.g. Claude with extended thinking, OpenAI o-series/GPT-5 reasoning, DeepSeek-R1) generate their own internal reasoning.
- Control the budget through the API (thinking budget / reasoning effort) rather than "think step by step" text.
- Give high-level goals, constraints, and success criteria; prescriptive step lists often help less than with standard models.
- Do not try to parse or rely on hidden reasoning content; follow provider rules for passing thinking blocks back in multi-turn tool use.
- Measure: for easy tasks a low reasoning setting is often as accurate and much cheaper.

## Faithfulness and Safety
- Written reasoning is not guaranteed to reflect how the model actually reached its answer; do not treat it as an explanation for audits.
- A plausible chain can still end in a wrong answer; verify with tools (calculators, code execution, tests, retrieval).
- Do not show raw reasoning to end users when it may include internal instructions or speculative content.

## Anti-Patterns
- Adding CoT to every prompt by default (cost and latency with no gain on easy tasks).
- Parsing the answer from free text without delimiters.
- Asking for reasoning *after* the answer (the answer is already committed).
- Using self-consistency for open-ended text where answers cannot be compared.
- Treating fluent reasoning as verification.

## Checklist
- [ ] Baseline vs CoT accuracy and cost on a labeled set.
- [ ] Reasoning precedes the answer; answer delimited.
- [ ] Self-consistency only for discrete, comparable answers.
- [ ] Reasoning models: budget/effort tuned, prompts goal-oriented.
- [ ] External verification for arithmetic/code where possible.

## References
- Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (NeurIPS 2022).
- Kojima et al., "Large Language Models are Zero-Shot Reasoners" (NeurIPS 2022).
- Wang et al., "Self-Consistency Improves Chain of Thought Reasoning" (ICLR 2023).
- Turpin et al., "Language Models Don't Always Say What They Think" (NeurIPS 2023).
