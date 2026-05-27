---
name: product-feature-prioritization
description: >
  Use this skill when prioritizing product features: framework selection, RICE scoring, Kano model, MoSCoW, and opportunity scoring.
  This skill enforces: prioritization framework selection, quantitative scoring, stakeholder alignment, output documentation.
  Do NOT use for: sprint planning, task estimation, roadmap timeline creation, resource allocation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, prioritization, phase-8]
---

# Feature Prioritization Agent

## Purpose
Facilitates feature prioritization using RICE, Kano, MoSCoW, and Opportunity scoring frameworks to make data-informed product decisions.

## Agent Protocol

### Trigger
Exact user phrases: prioritization, RICE, ICE, Kano model, MoSCoW, backlog prioritization, impact effort.

### Input Context
- What features or initiatives need prioritization?
- What data is available for scoring (user impact, effort estimates)?
- Who are the stakeholders and what are their perspectives?
- What is the current product strategy and OKRs?
- What constraints exist (time, resources, dependencies)?

### Output Artifact
Prioritized feature list with scoring framework, rationale, and stakeholder alignment documentation.

### Response Format
```
## Feature Prioritization
### Framework: {RICE / Kano / MoSCoW / Opportunity}

### Scoring Results
| Feature | Score | Priority | Rationale |
|---------|-------|----------|-----------|
| {feature A} | {score} | P0 | {reason} |
| {feature B} | {score} | P1 | {reason} |

### Priority Buckets
P0 (Must Have): {features} — ship within current cycle
P1 (Should Have): {features} — next cycle
P2 (Nice to Have): {features} — future consideration
P3 (Won't Do): {features} — explicit no

### Stakeholder Alignment
{Agreed: list} | {Disagreements: list} | {Escalated: list}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Prioritization framework selected with justification
- [ ] All features scored using chosen framework
- [ ] Priority buckets assigned (P0-P3)
- [ ] Scoring rationale documented per feature
- [ ] Stakeholder alignment achieved or disagreements noted
- [ ] Quick wins identified (high impact, low effort)
- [ ] Long-term strategic items identified
- [ ] Output ready for roadmap integration

### Max Response Length
7000 tokens

## Workflow

### Step 1: Framework Selection
Choose framework based on context: RICE (best when reach and effort data available, quantitative), Kano (best for differentiating features by customer satisfaction impact), MoSCoW (best when stakeholder alignment needed, simple), Opportunity (best when solving pain points is primary goal). Align framework with team maturity and data availability.

### Step 2: RICE Scoring
Score each feature on four dimensions: Reach (how many users affected per time period, e.g., 1000 users/month), Impact (conversion, retention, revenue — scale 1-5), Confidence (how confident in estimates — scale 0.2-1.0), Effort (total engineering time in person-months). Calculate RICE = (Reach × Impact × Confidence) / Effort.

### Step 3: Kano Model Classification
Classify features into: Basic needs (table stakes, must have, dissatisfaction if absent), Performance needs (linear satisfaction, more is better, explicit requests), Delightful needs (unexpected, high satisfaction, not expected). Prioritize: Basic > Performance > Delightful. Avoid investing in basic beyond threshold.

### Step 4: Opportunity Scoring
Score each feature by importance of the problem (how many users affected, how painful) and satisfaction with current solution. Calculate opportunity = importance + max(importance - satisfaction, 0). Focus on high importance + low satisfaction = highest opportunity.

### Step 5: Prioritization Output
Sort features by score within chosen framework. Assign priority buckets: P0 = ship now (top 20%), P1 = next cycle (next 30%), P2 = future (next 30%), P3 = explicitly won't do (bottom 20%). Document rationale for each score dimension. Flag dependencies between items. Identify quick wins (high score, low effort).

## Rules
- Framework must be selected before scoring begins.
- RICE requires effort estimates from engineering.
- Kano classification requires user research validation.
- MoSCoW requires stakeholder participation in classification.
- All scores must include confidence level.
- Priority buckets must be mutually exclusive.
- "Won't do" items must be explicitly documented, not ignored.
- Re-prioritization must happen quarterly or when strategy changes.

## References
  - references/feature-prioritization-advanced.md — Feature Prioritization Advanced Topics
  - references/feature-prioritization-fundamentals.md — Feature Prioritization Fundamentals
  - references/prioritization-frameworks.md — Prioritization Frameworks
  - references/prioritization-matrix.md — Prioritization Matrix
  - references/roadmap-planning.md — Roadmap Planning
  - references/scoring-models.md — Scoring Models
## Handoff
For analytics data to inform prioritization, hand off to `product-analytics`. For user research to validate priorities, hand off to `product-user-research`.
