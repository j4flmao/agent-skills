---
name: ai-ai-safety
description: >
  Use this skill when implementing AI safety measures: red teaming, guardrails, bias detection, alignment, RLHF safety, content moderation, prompt injection defense, jailbreak prevention, output filtering, model alignment.
  This skill enforces: red teaming protocol documentation, guardrail configuration, bias evaluation across demographic groups, alignment technique selection, content moderation integration, monitoring and logging.
  Do NOT use for: model training (see ai-model-training), general security auditing, compliance documentation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, safety, security, phase-11]
---

# AI Safety Agent

## Purpose
Design AI safety framework with red teaming protocols, guardrail configuration, bias detection, alignment techniques, and content moderation for production LLM systems.

## Agent Protocol

### Trigger
User request includes: AI safety, red teaming, guardrails, bias detection, alignment, RLHF safety, content moderation, prompt injection, jailbreak, output filtering, model alignment, constitutional AI.

### Protocol
1. Identify threat model: prompt injection, jailbreak, toxic output, bias, data leakage.
2. Design red teaming protocol with attack taxonomy and test cases.
3. Configure guardrails: input/output validation, topic restriction, rate limiting.
4. Implement bias detection pipeline with standard benchmarks.
5. Select alignment technique: RLHF, DPO, or Constitutional AI.
6. Set up monitoring: safety metric logging, alerting on violation spikes.

## Output
AI safety framework with red teaming protocol, guardrail config, bias detection, alignment approach.

### Response Format
```
## AI Safety Framework
### Threat Model
- {threat}: {likelihood} | {severity} | {mitigation}
- {threat}: {likelihood} | {severity} | {mitigation}

### Guardrails
Input: {allowed topics} | {blocked patterns} | {rate limit}
Output: {filtered categories} | {toxicity threshold}
Moderation: {OpenAI Moderation / Perspective API / custom}

### Red Teaming
Attack Types: {jailbreak / prompt injection / role-play / many-shot}
Frequency: {per release / weekly / continuous}
Automation: {garak / promptfoo / manual}

### Bias Evaluation
Benchmarks: {WinoBias / BBQ / StereoSet / Toxicity}
Protected Groups: {race / gender / age / religion}
Threshold: {max disparity < 5% across groups}

### Alignment
Method: {RLHF / DPO / Constitutional AI}
Reward Model: {name} | Preference Data: {N} pairs
Constitutional Principles: {list of principles}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Threat model documented with likelihood, severity, and mitigations.
- [ ] Guardrails configured for input and output with moderation API.
- [ ] Red teaming protocol with automated attack suite defined.
- [ ] Bias evaluation on standard benchmarks with disparity thresholds.
- [ ] Alignment technique selected with data and training approach.
- [ ] Monitoring and alerting for safety metric violations.

## Workflow

### Step 1: Define Threat Model

| Threat | Example | Severity |
|---|---|---|
| Prompt injection | "Ignore previous instructions..." | Critical |
| Jailbreak | "Act as DAN..." | High |
| Toxic output | Hate speech, harassment | Critical |
| Bias | Stereotyping demographic groups | High |
| Data leakage | Extracting training data | Critical |
| Denial of service | Many-shot jailbreak | Medium |

### Step 2: Configure Guardrails with NeMo
```python
# NeMo Guardrails example
from nemoguardrails import LLMRails, RailsConfig

config = RailsConfig.from_path("./guardrails-config")
rails = LLMRails(config)

# Define guardrails in config.yml
"""
rails:
  input:
    flows:
      - check jailbreak patterns
      - check prompt injection
      - check topic restrictions
  output:
    flows:
      - check toxicity
      - check sensitive content
      - check factual consistency
"""
response = rails.generate(messages=[{"role": "user", "content": user_input}])
```

### Step 3: Red Teaming Automation
```python
# Using garak for automated red teaming
import garak
from garak import harness

# Run automated attack suite
results = harness.run(
    model_name="my-llm",
    probe_types=["jailbreak", "prompt_injection", "data_leakage"],
    generations=100,
)

# Analyze results
for probe in results:
    if probe.success_rate > 0.05:
        print(f"VULNERABILITY: {probe.name} - {probe.success_rate:.1%} success")
```

### Step 4: Bias Evaluation
```python
# WinoBias evaluation
class BiasEvaluator:
    def __init__(self, model):
        self.model = model
        self.benchmarks = {
            "winobias": WinoBiasDataset(),
            "bbq": BBQDataset(),
            "stereoset": StereoSetDataset(),
        }

    def evaluate(self):
        results = {}
        for name, dataset in self.benchmarks.items():
            scores = dataset.evaluate(self.model)
            results[name] = {
                "overall": scores.accuracy,
                "bias_score": scores.bias,
                "max_disparity": scores.disparity,
            }
            if scores.disparity > 0.05:
                print(f"BIAS DETECTED: {name} disparity={scores.disparity:.2%}")
        return results
```

### Step 5: Alignment with DPO
```python
from trl import DPOTrainer

dpo_trainer = DPOTrainer(
    model=model,
    ref_model=ref_model,
    beta=0.1,  # KL penalty
    args=training_args,
    train_dataset=preference_dataset,
    tokenizer=tokenizer,
)
dpo_trainer.train()

# Preference dataset format
# {"prompt": "text", "chosen": "good response", "rejected": "bad response"}
```

## Rules
- Guardrails run on every user message and model response — not sampled.
- Red teaming executed before every release — automated suite + manual probing.
- Bias evaluation covers race, gender, age, religion — minimum 4 demographic axes.
- Maximum disparity threshold: 5% across any demographic group.
- Rate limiting per user: N requests/minute — prevents abuse.
- Prompt injection patterns maintained as blocklist + LLM-based detection.
- Output toxicity filter with threshold < 0.8 on OpenAI Moderation API.
- Alignment technique documented with preference data source and size.
- Safety incidents logged with full context for post-mortem analysis.
- Regular red teaming schedule: monthly automated, quarterly manual penetration test.

## References
- `references/red-teaming-guardrails.md` — Jailbreak types, prompt injection, NeMo Guardrails, moderation
- `references/bias-alignment.md` — Bias evaluation (WinoBias, BBQ, toxicity), RLHF, DPO, Constitutional AI

## Handoff
For model training with alignment, hand off to `ai-model-training`. For testing safety measures, hand off to `ai-ai-testing`. For cost-optimized guardrail deployment, hand off to `ai-ai-cost-optimization`.
