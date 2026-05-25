---
name: product-persona-development
description: >
  Use this skill when developing user personas: persona creation, empathy mapping, persona-driven feature prioritization.
  This skill enforces: data-driven persona creation, empathy mapping methodology, persona-to-feature connection, user story mapping.
  Do NOT use for: user research interviews, quantitative segmentation, market sizing, customer journey mapping.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, persona, phase-8]
---

# Persona Development Agent

## Purpose
Creates data-driven user personas with empathy maps and connects them to feature decisions, enabling user-centered product design and prioritization.

## Agent Protocol

### Trigger
Exact user phrases: persona, user persona, persona development, empathy map, persona creation, user archetype, target user, user profile, persona-based design.

### Input Context
- What user segments or target audiences exist?
- What research data is available (interviews, surveys, analytics)?
- What product or feature area are personas being created for?
- What decisions will personas inform (design, prioritization, marketing)?
- What is the expected number of personas?

### Output Artifact
Persona set with empathy maps, persona profiles, and feature mapping with prioritization based on persona fit.

### Response Format
```
## Persona Development
### Personas Created
1. {name}: {role} | {key goal} | {primary pain point}
2. {name}: {role} | {key goal} | {primary pain point}

### Feature-to-Persona Mapping
| Feature | Primary Persona | Fit Score | Priority |
|---------|----------------|-----------|----------|
| {feature} | {persona} | {score} | P0-P3 |

### Design Recommendations
{persona-driven design guidance}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Research data analyzed for persona patterns
- [ ] Primary persona defined with demographics, goals, behaviors, pain points
- [ ] Secondary persona defined with distinct characteristics
- [ ] Anti-persona identified (explicitly not target)
- [ ] Empathy map created for each persona
- [ ] Persona-to-feature mapping completed
- [ ] Feature scoring by persona fit calculated
- [ ] Design recommendations documented per persona
- [ ] Persona validation plan created

### Max Response Length
7000 tokens

## Workflow

### Step 1: Data Collection and Analysis
Gather all available user data: research interviews, surveys, analytics, support tickets, sales notes. Identify patterns across demographics, behaviors, goals, and pain points. Look for clusters of users with similar characteristics. Triangulate findings from multiple data sources. Aim for 3-5 distinct persona clusters based on meaningful behavioral differences.

### Step 2: Persona Creation
Define primary persona (main target, design decisions serve this user first). Define secondary persona (important but may have conflicting needs). Define anti-persona (explicitly not the target — prevents scope creep). Use persona template: name, tagline, demographics, goals, behaviors, pain points, context, quote. Write narrative paragraph describing a day in their life with the product.

### Step 3: Empathy Mapping
Create empathy map per persona: Says (quotes from research), Thinks (unspoken beliefs), Does (actions and behaviors), Feels (emotional state). Identify pains (fears, frustrations, obstacles) and gains (desired outcomes, aspirations). Validate empathy map against research data. Review with stakeholders and update based on feedback.

### Step 4: Persona-to-Feature Mapping
Score each feature by persona fit: how well does it serve each persona's goals and alleviate their pain points? Prioritize features that serve primary persona best. Identify features that serve all personas (platform investments) and features serving only anti-persona (consider cutting). Use scoring: 3=essential, 2=helpful, 1=neutral, 0=irrelevant, -1=harmful.

### Step 5: User Story Mapping with Personas
Map user stories by persona on a story map. Arrange by persona journey order. Identify gaps where persona needs have no stories. Flag over-investment in low-priority persona features. Ensure each sprint has stories serving the primary persona.

## Rules
- Personas must be based on research data, not stereotypes or assumptions.
- Each persona must be grounded in data from at least 3 research participants.
- Empathy maps must differentiate between says and thinks (stated vs unstated).
- Anti-persona must be explicitly documented to prevent scope creep.
- Feature scoring must prioritize primary persona needs.
- Persona count should be 3-5 — more than 5 dilutes focus.
- Personas must be validated with stakeholders and updated as product evolves.
- Every design decision should reference which persona it serves.

## References
- `references/empathy-mapping.md` — Empathy Mapping
- `references/persona-creation-guide.md` — Persona Creation Guide
- `references/persona-creation.md` — Persona Creation
- `references/persona-to-feature.md` — Persona To Feature

## Handoff
For journey mapping with persona context, hand off to `product-customer-journey`. For user research to validate personas, hand off to `product-user-research`. For feature prioritization using persona scores, hand off to `product-feature-prioritization`.
