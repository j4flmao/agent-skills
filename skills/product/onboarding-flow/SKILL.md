---
name: product-onboarding-flow
description: >
  Use this skill when designing user onboarding flows: activation milestones, funnel mapping, progressive disclosure, and drop-off analysis.
  This skill enforces: activation milestone definition, funnel mapping, progressive disclosure patterns, onboarding experimentation.
  Do NOT use for: email drip campaigns, documentation writing, tutorial video production, customer success programs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, onboarding, phase-8]
---

# Onboarding Flow Agent

## Purpose
Designs and optimizes user onboarding flows including activation milestones, funnel mapping, progressive disclosure, and experimentation.

## Agent Protocol

### Trigger
Exact user phrases: onboarding flow, user onboarding, user activation, new user experience, product tour, activation rate.

### Input Context
- What is the Aha moment (core value experience) for users?
- What is the current activation rate and onboarding funnel?
- What steps does a user go through from signup to activation?
- What friction points exist in the current flow?
- What user segments have different onboarding needs?

### Output Artifact
Onboarding flow design with activation milestone, funnel steps, progressive disclosure plan, and experiment framework.

### Response Format
```
## Onboarding Flow Design
### Activation Milestone
{action} within {timeframe} → User activated

### Funnel
Signup → {step 1} → {step 2} → Activation
Current CR: {X%} | Target CR: {Y%}

### Progressive Disclosure
Day 1: {core features shown}
Day 3: {advanced features shown}
Day 7: {power features shown}

### Drop-off Analysis
Step | Drop-off | Root Cause | Action
{step} | {X%} | {cause} | {solution}

### Experiment Pipeline
{hypothesis} | {variant} | {expected lift}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Activation milestone defined and measurable
- [ ] Onboarding funnel mapped with all steps
- [ ] Progressive disclosure schedule designed
- [ ] Drop-off points identified with root causes
- [ ] Onboarding experiments prioritized
- [ ] Time-to-activation measured
- [ ] Success metrics defined for onboarding
- [ ] User segmentation for different onboarding paths

### Max Response Length
7000 tokens

## Workflow

### Step 1: Activation Milestone Definition
Identify the Aha moment — the specific action where users realize the product's core value. Define activation as a measurable event (not time): e.g., created first project, invited team member, completed first workflow. Set target time window (within 24h, within first session). Validate that activated users retain at higher rates.

### Step 2: Funnel Mapping
Map the full onboarding funnel: signup → welcome → setup → first action → activation → engagement. Measure conversion rate at each step. Segment funnel by acquisition channel, plan tier, and user role. Calculate absolute drop-off (most users lost at which step). Identify friction points per step.

### Step 3: Progressive Disclosure
Design a progressive disclosure schedule. Day 1: show only core features needed for activation. Day 3: introduce complementary features that deepen engagement. Day 7: reveal advanced and power-user features. Use tooltips, banners, and checklists. Avoid overwhelming new users.

### Step 4: Drop-off Analysis
Analyze where and why users drop off. Common causes: unclear value proposition, too many steps, technical friction (slow load, broken flow), information overload, no clear next step. Quantify impact of each friction point. Prioritize fixes by impact on activation rate.

### Step 5: Onboarding Experiments
Create experiment pipeline to improve activation. Typical experiments: reduce signup fields, add interactive demo, improve welcome email, change CTAs, add progress indicator, implement checklist. Measure activation rate, time-to-activation, and Day 7 retention. Iterate on winning variants.

## Rules
- Activation must be defined as a user action, not a time period.
- Onboarding funnel must be fully instrumented with analytics.
- Progressive disclosure must never hide the activation path.
- Drop-off analysis must use cohort data, not aggregate.
- Experiments must have clear success criteria before launch.
- Onboarding personalization should match user role and intent.
- Time-to-activation must be measured and optimized.
- Post-activation experience must be designed simultaneously.

## References
- `references/activation-design.md` — Activation milestone and onboarding flow design
- `references/onboarding-experiments.md` — Onboarding experiment ideas and frameworks

## Handoff
For analytics tracking of onboarding metrics, hand off to `product-analytics`. For A/B testing onboarding changes, hand off to `product-ab-testing`.
