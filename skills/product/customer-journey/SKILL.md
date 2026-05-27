---
name: product-customer-journey
description: >
  Use this skill when analyzing customer journeys: journey mapping, service blueprinting, journey analytics, and journey optimization.
  This skill enforces: lifecycle stage mapping, touchpoint identification, service blueprint creation, funnel analysis methodology.
  Do NOT use for: persona development, user research interviews, usability testing, feature prioritization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, customer-journey, phase-8]
---

# Customer Journey Agent

## Purpose
Analyzes and optimizes customer journeys through journey mapping, service blueprinting, quantitative funnel analysis, and experimentation to improve end-to-end customer experience.

## Agent Protocol

### Trigger
Exact user phrases: customer journey, journey map, service blueprint, touchpoint mapping, funnel analysis, journey analytics, journey optimization, omnichannel, moment of truth.

### Input Context
- What is the customer lifecycle stage or scope of the journey?
- What touchpoints and channels are involved?
- What quantitative data exists (funnel, drop-off, CSAT)?
- What are the known pain points and moments of truth?
- What business goals is the journey tied to?

### Output Artifact
Customer journey analysis with journey map, service blueprint, funnel analytics, and optimization recommendations.

### Response Format
```
## Customer Journey Analysis
### Journey Scope
{lifecycle stages covered} | {channels}
### Key Findings
1. {finding} (evidence: {source})
2. {finding} (evidence: {source})
### Pain Points
{stage}: {pain point} | Severity: {H/M/L}
### Opportunities
{stage}: {opportunity} | Impact: {H/M/L}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Journey scope defined with lifecycle stages
- [ ] Current-state journey map created with touchpoints
- [ ] Service blueprint with frontstage/backstage actions
- [ ] Funnel analysis with drop-off rates per step
- [ ] Moments of truth identified and assessed
- [ ] Pain points prioritized by severity and frequency
- [ ] Optimization recommendations with expected impact
- [ ] Measurement plan for journey improvements

### Max Response Length
7000 tokens

## Workflow

### Step 1: Scope Definition
Define the customer journey boundaries: which lifecycle stages (awareness through advocacy), which channels (web, mobile, in-person), which customer segments. Align scope with business goals and available data. Determine if this is current-state mapping or future-state vision.

### Step 2: Journey Mapping
Map the current-state journey across lifecycle stages. Identify all touchpoints (where customer interacts with brand), channels (medium of interaction), and actions (what customer does). Add emotional journey timeline showing satisfaction highs and lows. Mark moments of truth — critical touchpoints that disproportionately impact overall experience perception.

### Step 3: Service Blueprinting
Layer operational reality over the journey map. Define frontstage actions (customer-facing interactions), backstage actions (invisible support), and support processes (systems, tools, third parties). Draw line of interaction (customer vs provider), line of visibility (seen vs unseen), and line of internal interaction (core team vs support teams). Identify fail points and process gaps.

### Step 4: Journey Analytics
Quantify journey performance using funnel analysis. Measure step completion rates and drop-off percentages. Calculate time-to-value per journey. Segment by customer attributes (plan, tenure, source). Correlate journey experience with CSAT and NPS scores at each stage. Identify where customers deviate from ideal path.

### Step 5: Optimization Recommendations
Prioritize optimization opportunities by pain point severity and business impact. Propose experiments for each opportunity (A/B test touchpoint, add personalization, remove friction). Design abandonment recovery mechanisms (email, push, retargeting). Ensure omnichannel consistency across touchpoints. Define success metrics for each change.

## Rules
- Journeys must be mapped from customer perspective, not internal processes.
- Moments of truth must be validated with customer research.
- Funnel analysis requires event-level tracking data.
- Service blueprints must include at least one support process layer.
- Pain points must be ranked by severity AND frequency.
- Optimization recommendations must include measurement criteria.
- Omnichannel analysis must cover all touchpoints, not just digital.

## References
  - references/customer-journey-advanced.md — Customer Journey Advanced Topics
  - references/customer-journey-fundamentals.md — Customer Journey Fundamentals
  - references/journey-analytics.md — Journey Analytics
  - references/journey-mapping.md — Journey Mapping
  - references/journey-optimization.md — Journey Optimization
  - references/service-blueprint.md — Service Blueprinting
## Handoff
For persona insights to inform journey stages, hand off to `product-persona-development`. For analytics event tracking, hand off to `product-analytics`. For user research validation, hand off to `product-user-research`.
