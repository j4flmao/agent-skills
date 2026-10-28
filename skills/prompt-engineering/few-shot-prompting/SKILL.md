---
name: prompt-few-shot
description: >
  Use this skill when the user says 'few-shot', 'in-context examples', 'add examples to the prompt', 'example selection', 'demonstrations', 'one-shot', 'model ignores the format', 'dynamic few-shot'. Designs in-context demonstrations: how many, which ones (static vs retrieved), ordering, formatting, label balance, and how they interact with context length and prompt caching. Do NOT use for: reasoning elicitation (prompt-engineering/chain-of-thought), fine-tuning on examples (ai/llm-finetuning), or retrieval of knowledge documents (prompt-engineering/rag-design).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [prompt-engineering, few-shot, in-context-learning, demonstrations, prompt-caching]
---

# Few-Shot Prompting

## Purpose
Demonstrations in the prompt show the model the task format, label space, and style without changing its weights (in-context learning). They are the fastest fix for format drift and ambiguous instructions, but they cost tokens on every call and introduce biases (ordering, majority label, copying surface features). Choose, order, and format them deliberately and verify with evals.

## Agent Protocol

### Trigger
"few-shot", "one-shot", "in-context learning", "examples in prompt", "demonstrations", "dynamic examples", "example selection", "output format keeps breaking".

### Input Context
- Task, instructions, and current failure examples.
- Pool of labeled examples (and whether inputs vary widely).
- Token/latency budget; whether provider prompt caching is used.

### Output Artifact
Prompt template with example block, selection strategy (static or retrieved), and an eval comparing 0/k-shot variants.

### Response Format
```
Shots: {k} {static|retrieved by similarity}  Format: {tagged blocks|chat turns}
Coverage: {labels/edge cases represented}  Order: {randomized|similar-last}
Placement: {after instructions, before input}  Cacheable prefix: {yes/no}
Eval: zero-shot vs {k}-shot on {n} items: {metric}
```

### Completion Criteria
- [ ] Examples match the real input distribution and output format exactly.
- [ ] Label/edge-case coverage balanced; no accidental majority bias.
- [ ] Examples clearly delimited from the live input.
- [ ] Measured gain over zero-shot with clear instructions.

## What the Research Says (and Doesn't)
- Few-shot ability emerges with scale (Brown et al., 2020, GPT-3).
- Format, input distribution, and label space in demonstrations matter a lot; exact label correctness mattered less than expected in some classification settings (Min et al., 2022). Do not rely on that: wrong labels still hurt on many tasks.
- Performance is sensitive to example order (Lu et al., 2022) and biased toward frequent and recent labels (Zhao et al., 2021).
- Selecting examples semantically similar to the input usually beats random examples (Liu et al., 2022).
- Explanations of in-context learning as implicit gradient descent are research hypotheses for simplified settings, not established behaviour of production models.

## Design Rules
1. **Instructions first, examples second**: examples illustrate; they do not replace a clear task statement.
2. **Exact format parity**: examples use the same delimiters, field names, and output schema you parse.
3. **Diversity and coverage**: include edge cases and every label; avoid near-duplicates.
4. **Balance**: roughly equal labels unless you deliberately want a prior.
5. **Delimit**: wrap in tags (`<example>`, `<input>`, `<output>`) so the model never confuses examples with the real input.
6. **Few, high quality**: 2-8 examples typically; more only if evals show gains.
7. **Avoid leaking test items** into the example pool.

## Template

```text
You classify support tickets into exactly one category:
billing, bug, feature_request, account_access.
Return JSON: {"category": "...", "confidence": "high|low"}.

<examples>
<example>
<input>I was charged twice for March.</input>
<output>{"category": "billing", "confidence": "high"}</output>
</example>
<example>
<input>The export button does nothing on Safari.</input>
<output>{"category": "bug", "confidence": "high"}</output>
</example>
<example>
<input>Can't log in and also want dark mode.</input>
<output>{"category": "account_access", "confidence": "low"}</output>
</example>
</examples>

<input>{{ticket_text}}</input>
```

## Dynamic (Retrieved) Few-Shot

```python
from __future__ import annotations

import random

import numpy as np


def select_examples(query_vec: np.ndarray, pool_vecs: np.ndarray, pool: list[dict],
                    k: int = 4, per_label_cap: int = 2, seed: int = 0) -> list[dict]:
    """Nearest examples by cosine similarity, capped per label to avoid majority bias."""
    if len(pool) != len(pool_vecs):
        raise ValueError("pool and pool_vecs length mismatch")
    sims = pool_vecs @ query_vec / (np.linalg.norm(pool_vecs, axis=1) * np.linalg.norm(query_vec) + 1e-9)
    chosen, per_label = [], {}
    for idx in np.argsort(-sims):
        ex = pool[int(idx)]
        if per_label.get(ex["label"], 0) >= per_label_cap:
            continue
        chosen.append(ex)
        per_label[ex["label"]] = per_label.get(ex["label"], 0) + 1
        if len(chosen) == k:
            break
    random.Random(seed).shuffle(chosen)   # reduce recency bias toward one label
    return chosen
```

Trade-off: retrieved examples change per request, which breaks prompt-prefix caching. Keep a static, cacheable block (instructions + core examples) first and append a small dynamic block after it if both are needed.

## Cost and Context
- Every example is re-sent on every call; long example blocks raise latency and cost and dilute attention on long inputs.
- Provider prompt caching and serving-engine prefix caching make a stable prefix cheap; put examples before the variable input and keep them byte-identical.
- If you need dozens of examples for good quality, compare against fine-tuning a smaller model.

## Anti-Patterns
- Examples whose format differs subtly from what the parser expects.
- All examples sharing one label or length; the model copies the pattern.
- Real customer data with PII in static examples.
- Examples contradicting the instructions.
- Adding examples instead of fixing ambiguous instructions.

## Checklist
- [ ] Zero-shot baseline with clear instructions measured first.
- [ ] Examples delimited, format-identical, diverse, label-balanced.
- [ ] Order randomized or deliberately chosen; sensitivity checked.
- [ ] Static prefix cache-friendly; dynamic examples appended after.
- [ ] Example pool versioned and kept out of the eval set.

## References
- [Context Window Management](references/context-window-management.md)
- [Evaluation and Testing Strategies](references/evaluation-and-testing-strategies.md)
- [Hallucination and Error Handling](references/hallucination-and-error-handling.md)
- [Prompt Deployment Pipelines](references/prompt-deployment-pipelines.md)
- [Prompt Injection Prevention](references/prompt-injection-prevention.md)
- [Prompt Library Organization](references/prompt-library-organization.md)
- [Prompt Performance Optimization](references/prompt-performance-optimization.md)
- Papers: Brown et al. 2020; Min et al. 2022; Lu et al. 2022; Zhao et al. 2021; Liu et al. 2022.
