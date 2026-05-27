---
name: product-analytics
description: >
  Use this skill when implementing product analytics: event tracking, funnel analysis, retention cohorts, and metric frameworks.
  This skill enforces: event taxonomy, funnel analysis methodology, retention cohort design, North Star metric definition.
  Do NOT use for: data pipeline engineering, database analytics, BI dashboard creation, ad-hoc SQL queries.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, analytics, phase-8]
---

# Product Analytics Agent

## Purpose
Designs and implements product analytics frameworks including event tracking, funnel analysis, retention cohorts, and metric definitions.

## Agent Protocol

### Trigger
Exact user phrases: product analytics, event tracking, Amplitude, Mixpanel, funnel analysis, retention, cohort, North Star metric, AARRR.

### Input Context
- What analytics platform is used (Amplitude, Mixpanel, PostHog, custom)?
- What user actions are currently tracked?
- What are the key user journeys to analyze?
- What is the North Star metric for the product?
- What event naming conventions exist?

### Output Artifact
Event taxonomy specification, funnel analysis templates, retention cohort design, and metric framework documentation.

### Response Format
```
## Product Analytics Framework
### Event Taxonomy
{domain}.{entity}.{action}_{context}
### Funnels
{funnel name}: {step 1} → {step 2} → {step 3} (drop-off rates)
### Retention Cohorts
{period}: Day {N} retention = {X%}, Weekly {N} retention = {Y%}
### North Star Metric
{metric} | Current: {value} | Target: {value}
### AARRR Framework
Acquisition → Activation → Retention → Revenue → Referral
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Event taxonomy defined with naming convention
- [ ] Key funnels identified and tracked
- [ ] Retention cohorts configured with proper time windows
- [ ] North Star metric defined and instrumented
- [ ] AARRR metrics mapped to tracked events
- [ ] Event property schema documented
- [ ] Data quality checks implemented
- [ ] Dashboard with key metrics created

### Max Response Length
7000 tokens

## Workflow

### Step 1: Event Taxonomy Design
Define naming convention: {domain}.{entity}.{action}_{context} (e.g., billing.subscription.upgraded_from_trial). Categorize events: user actions (click, view, submit), system events (error, sync, notification), session events (start, end, duration). Document event properties and data types.

### Step 2: Funnel Analysis
Map critical user journeys as funnels. Identify drop-off points between each step. Calculate conversion rate at each step. Segment funnels by user attributes (cohort, plan, source). Set benchmark conversion rates and alert on regression.

### Step 3: Retention Cohorts
Define retention periods (daily for first week, weekly for first month, monthly for long-term). Calculate Day 1/7/30 retention rates. Compare cohorts by acquisition channel, plan tier, and user segment. Identify power user patterns and their activation triggers.

### Step 4: North Star Metric Definition
Define the single metric that best captures customer value. Ensure it correlates with long-term retention. Instrument tracking across the full user journey. Set current baseline and quarterly targets.

### Step 5: AARRR Framework
Map each AARRR stage to tracked events. Acquisition: signups by source, channel attribution. Activation: first value event within 24h. Retention: Day 7/30 return rate. Revenue: ARPU, LTV, conversion rate. Referral: invite sent, invite accepted, K-factor.

## Rules
- Event names must follow noun_verb naming convention consistently.
- Every event must include user ID, timestamp, session ID, and version.
- Funnels must have no more than 7 steps to remain actionable.
- Retention calculations must define the action window precisely.
- North Star metric must be a leading indicator of retention.
- PII must never be sent as event properties.
- Data quality checks must run daily for event volume anomalies.
- AARRR metrics must be reviewable in a single dashboard.

## References
  - references/analytics-advanced.md — Analytics Advanced Topics
  - references/analytics-fundamentals.md — Analytics Fundamentals
  - references/event-taxonomy.md — Event Taxonomy
  - references/event-tracking.md — Event Tracking Implementation
  - references/funnel-analysis.md — Funnel Analysis
  - references/metric-frameworks.md — Metric Frameworks
## Handoff
For A/B testing statistical analysis, hand off to `product-ab-testing`. For user research insights, hand off to `product-user-research`.
