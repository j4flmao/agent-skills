---
name: product-growth-engineering
description: >
  Use this skill when designing growth engineering initiatives: viral loops, activation optimization, referral mechanics, and conversion experiments.
  This skill enforces: growth loop design, activation optimization, viral mechanics, conversion optimization.
  Do NOT use for: paid acquisition, SEO strategy, content marketing, sales funnel optimization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, growth, phase-8]
---

# Growth Engineering Agent

## Purpose
Designs and executes growth engineering initiatives including growth loops, activation optimization, viral mechanics, and experimentation pipelines.

## Agent Protocol

### Trigger
Exact user phrases: growth engineering, viral loop, activation, referral, PLG, growth experiment, conversion optimization.

### Input Context
- What is the current acquisition, activation, retention, and revenue funnel?
- What is the product's core value moment (Aha moment)?
- What referral or sharing mechanics exist?
- What is the current K-factor and viral cycle time?
- What experiments are in the pipeline?

### Output Artifact
Growth loop architecture design, activation optimization plan, viral mechanics specification, and experiment pipeline.

### Response Format
```
## Growth Engineering Plan
### Growth Loop
{acquisition} → {activation} → {revenue} → {referral}

### Activation Optimization
Current TTV: {time-to-value}
Aha Moment: {action} within {timeframe}
Activation Rate: {current} → {target}

### Viral Mechanics
K-factor: {K} | Cycle Time: {hours/days}
Invite Rate: {X%} | Conversion Rate: {Y%}

### Experiment Pipeline
Current: {running} | Queued: {queued} | Backlog: {backlog}

### Conversion Optimization
Funnel: {step} → {step} → {step}
Current CR: {value} | Target CR: {value}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Growth loop defined with all stages mapped
- [ ] Activation milestone (Aha moment) identified
- [ ] Time-to-value measured and documented
- [ ] Viral mechanics designed with K-factor target
- [ ] Conversion funnel analyzed with drop-off points
- [ ] Experiment pipeline established
- [ ] Growth metrics dashboard created
- [ ] PLG motion designed for self-serve funnel

### Max Response Length
7000 tokens

## Workflow

### Step 1: Growth Loop Design
Map the full growth loop: Acquisition → Activation → Revenue → Referral. Identify the input that feeds back into the loop (user invites, content sharing, network effects). Calculate loop cycle time and amplification factor. Design loops for each acquisition channel.

### Step 2: Activation Optimization
Define the Aha moment — the specific action where users experience core value. Measure current time-to-value (TTV). Reduce friction in the activation flow: remove unnecessary steps, prefill data, guide users. Set activation target (e.g., 80% of users activate within 24h).

### Step 3: Viral Mechanics
Implement referral program with clear incentive (two-sided rewards work best). Calculate K-factor = invite rate × conversion rate. Target K > 1.0 for viral growth. Reduce viral cycle time with frictionless sharing. Track viral coefficient per channel and segment.

### Step 4: Conversion Optimization
Map the conversion funnel: signup → explore → activate → subscribe. Analyze drop-off at each step using analytics. Run experiments on pricing page, feature gating, and trial length. Implement urgency and social proof. Track trial-to-paid conversion rate.

### Step 5: Experiment Pipeline
Maintain a running backlog of growth experiments. Prioritize using ICE (Impact, Confidence, Ease). Run experiments sequentially to avoid interaction effects. Document hypotheses, results, and learnings. Pause experiments that don't show promise within 2 weeks.

## Rules
- Activation must be defined by user action, not time elapsed.
- Growth loops must be measurable end-to-end.
- K-factor must account for organic and paid channels separately.
- Experiments must have a single primary metric.
- Referral incentives must align with product value.
- PLG motion must support self-serve signup to paid conversion.
- Growth experiments must include guardrail metrics.
- Learning is success even if hypothesis is invalidated.

## References
- `references/growth-loops.md` — Growth loop types and design patterns
- `references/activation-metrics.md` — Activation measurement and optimization

## Handoff
For analytics tracking of growth metrics, hand off to `product-analytics`. For pricing experiments, hand off to `product-pricing-strategy`.
