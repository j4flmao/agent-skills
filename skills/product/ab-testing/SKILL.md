---
name: product-ab-testing
description: >
  Use this skill when designing and analyzing A/B tests: hypothesis formation, experiment design, statistical analysis, and decision framework.
  This skill enforces: hypothesis structure, sample size calculation, statistical significance, AA test validation.
  Do NOT use for: multivariate testing, bandit algorithms, personalization engines, survey analysis.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, ab-testing, phase-8]
---

# A/B Testing Agent

## Purpose
Designs and analyzes A/B tests with rigorous hypothesis formation, experiment design, statistical frameworks, and decision criteria.

## Agent Protocol

### Trigger
Exact user phrases: A/B test, split test, experiment, hypothesis testing, statistical significance, sample size, AA test.

### Input Context
- What is the business question being tested?
- What is the primary metric and its current baseline?
- What is the minimum detectable effect (MDE)?
- What is the expected traffic volume and duration?
- What segments should be analyzed?

### Output Artifact
Experiment design document with hypothesis, sample size calculation, statistical framework, analysis plan, and decision criteria.

### Response Format
```
## A/B Test Design
### Hypothesis
If {change} then {effect} because {rationale}

### Variants
Control: {current state}
Treatment: {change description}

### Statistical Framework
α = {0.05}, β = {0.20}, Power = {0.80}, MDE = {X%}
Sample Size: {N per variant}, Duration: {days}

### AA Test Validation
Result: {passed/failed} | p-value: {value}

### Decision
{implement / roll back / iterate} | Confidence: {level}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Hypothesis defined with If/Then/Because structure
- [ ] Primary and secondary metrics selected
- [ ] Sample size calculated with α, β, MDE specified
- [ ] AA test completed and validated
- [ ] Experiment launched with proper randomization
- [ ] Results analyzed with statistical rigor
- [ ] Decision made with clear rationale
- [ ] Learnings documented for future tests

### Max Response Length
7000 tokens

## Workflow

### Step 1: Hypothesis Formation
Structure hypothesis as If/Then/Because. If {change}, then {metric} will {direction} by {effect size}, because {mechanism}. Define null hypothesis (no effect) and alternative hypothesis (effect exists). Identify primary metric (one decision metric) and secondary metrics (guardrails).

### Step 2: Experiment Design
Define variants: control (current experience) and treatment(s) (proposed change). Calculate required sample size based on α=0.05, β=0.20, MDE. Ensure proper randomization (user-level for UX changes, session-level for funnel changes). Set minimum experiment duration for full business cycle.

### Step 3: Statistical Framework
Configure significance level α=0.05 (5% false positive risk). Set statistical power β=0.80 (80% chance to detect MDE). Calculate MDE based on business impact and traffic constraints. Use two-tailed test for directional uncertainty. Apply sequential testing for continuous monitoring.

### Step 4: AA Test Validation
Run AA test before main experiment. Split traffic equally between two identical variants. Verify no statistically significant difference. Check that p-value distribution is uniform. Confirm system is not biased.

### Step 5: Launch and Analysis
Randomize users with consistent assignment. Monitor guardrail metrics daily. Run analysis at predetermined end time. Check assumptions: normality, equal variance, independence. Calculate p-value and confidence interval. Segment results by device, source, plan.

### Step 6: Decision Framework
Implement if p<α and effect size > MDE. Roll back if any guardrail metric degrades. Iterate if results are inconclusive. Consider secondary metrics and segment analysis in decision.

## Rules
- Never peek at results before predetermined sample size is reached.
- AA test must pass before any treatment experiment.
- Primary metric must be defined before experiment launch.
- Guardrail metrics must be monitored to prevent negative impact.
- Multiple treatments require Bonferroni correction.
- Experiment duration must cover at least one full business cycle.
- Segment analysis requires sufficient power per segment.
- Results must be reproducible with shared analysis code.

## References
- `references/ab-testing-statistics.md` — Ab Testing Statistics
- `references/experiment-design.md` — Experiment Design
- `references/statistical-analysis.md` — Statistical Analysis
- `references/statistical-methods.md` — Statistical Methods

## Handoff
For product analytics event tracking, hand off to `product-analytics`. For user research insights to inform hypotheses, hand off to `product-user-research`.
