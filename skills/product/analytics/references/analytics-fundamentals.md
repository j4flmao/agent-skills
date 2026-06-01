# Analytics Fundamentals

## Overview
Product analytics transforms raw user behavior data into actionable product decisions. By systematically tracking events, measuring funnels, and analyzing retention, teams understand how users interact with their product, identify friction points, and quantify product-market fit. Analytics is the measurement foundation for data-informed product development.

## Core Concepts

### Concept 1: Event-Driven Measurement
Every user interaction is an event. Events are the atomic unit of product analytics — a click, a page view, a feature use, an error. Events have properties (metadata about the event) and users have properties (attributes about the person). Event-driven measurement enables teams to answer specific questions about user behavior rather than relying on aggregate page views or downloads.

### Concept 2: The Metric Hierarchy
Metrics exist in layers: company OKRs at the top, North Star Metric (single metric capturing customer value), input metrics (leading indicators that drive the North Star), counter metrics (guardrails against negative behavior), and diagnostic metrics (deep-dive specifics). Each lower layer explains performance of the layer above. This hierarchy prevents metric fixation — optimizing one metric at the expense of overall product health.

### Concept 3: Funnel Analysis
Funnels track users through sequential steps toward a goal. Each step is a user action, and the conversion rate between steps reveals where users drop off. Funnels must be timeboxed (conversion within a specific period), segmented (by user attributes), and limited to 5-7 steps for actionability. The biggest drop-off is the highest-priority optimization target.

### Concept 4: Retention as the North Star
Retention is the most reliable indicator of product-market fit. If users return, the product delivers ongoing value. Measure retention by cohort (users who signed up in the same period) and by time window (Day 1, 7, 30). Compare retention across segments to identify which user behaviors correlate with long-term engagement.

### Concept 5: AARRR Framework (Pirate Metrics)
Acquisition: how users discover the product. Activation: users experience core value for the first time. Retention: users return. Revenue: users pay. Referral: users invite others. Each stage has specific metrics that diagnose the health of the user lifecycle. Growth efforts should focus on the weakest stage.

## Event Taxonomy

### Naming Convention
Use hierarchical naming: `{domain}.{entity}.{action}_{context}`. Examples: `billing.subscription.upgraded_from_trial`, `onboarding.step_completed_profile`, `search.performed_empty_results`. Hierarchical names enable wildcard queries (`billing.*`) and are readable without documentation. Every event must include: user ID, timestamp, session ID, and version.

### Event Categories
- **User actions:** clicks, views, submissions, navigations — represent user intent
- **System events:** errors, sync completions, notifications sent — represent system state
- **Session events:** start, end, duration — represent visit boundaries

### Event Properties
- **User properties:** plan tier, account age, region, role — attributes of the user
- **Event properties:** value, currency, error type, source screen — context of the specific event
- **Session properties:** UTM source, campaign, referrer, device type — context of the visit

## Funnel Analysis

### Funnel Construction
Define the goal first (what user outcome), then the steps required. Each step is a single user action. Set a timebox for conversion (e.g., within 7 days). Calculate absolute conversion (total users at each step) and relative conversion (% progressing between steps). Identify the step with highest absolute drop-off — that is the highest-impact optimization target.

### Funnel Types by Product Stage
- Growth: Acquisition → Signup → Activation
- Engagement: Visit → Key action → Return
- Monetization: Trial → Subscribe → Retain
- Retention: Active → Re-engage → Power user

### Segmentation Mandatory
Always segment funnels by user attributes: acquisition channel, plan tier, company size, device type. Aggregate funnels hide segment-specific patterns. A feature that converts well for power users may fail for new users. Segment first, optimize second.

## Retention Metrics

### Retention Types
- **Classic retention:** users return and perform an action within a time window. Best for engagement-heavy products.
- **Rolling retention:** users ever returned after signup (unbounded time). Best for infrequent-use products.
- **Bracket retention:** users active in period X after signup (e.g., month 3). Best for subscription benchmarks.

### Cohort Analysis
Group users by signup week or month. Track their retention over time. Compare cohorts to detect trends: improving retention means product changes are working; declining retention means product or market issues. Minimum 100 users per cohort for statistical validity.

## AARRR Framework

### Stage Definitions
| Stage | Top Metric | What It Measures |
|-------|------------|-----------------|
| Acquisition | CAC by channel | Cost and volume of user acquisition |
| Activation | Activation rate | % of users who reach core value |
| Retention | D7/D30 retention rate | % of users who return |
| Revenue | ARPU, LTV | Average revenue per user |
| Referral | K-factor | Viral growth efficiency |

### Activation Definition
Activation is the moment a user experiences core value for the first time. It must be defined by a specific user action, not time elapsed. Validate: users who reach this action have significantly higher retention and LTV than those who don't. Track activation rate as a weekly leading indicator.

## Metric Framework Principles

### Data-Informed vs Data-Driven
Data-informed: metrics guide decisions but qualitative context is also considered. Data-driven: metrics directly determine decisions. Use data-informed for strategic decisions (where judgment and context matter) and data-driven for tactical optimizations (where the metric directly measures success).

### Leading vs Lagging Indicators
Leading indicators predict future outcomes (engagement trend, feature adoption, session frequency, support volume). Lagging indicators confirm past outcomes (churn rate, revenue retention, LTV, NPS). Track both: leading tells you what to do now, lagging tells you if it worked.

### Counter Metrics
Every metric needs a counter metric — a guardrail that detects when optimizing one metric harms another. If you optimize for session duration, track task completion (longer sessions might mean confusion). If you optimize for conversion, track support volume (aggressive conversion may create confused users).

## Tool Selection

### Tool Comparison
| Tool | Best For | Limitations |
|------|----------|-------------|
| Amplitude | Product analytics, behavioral cohorts, experimentation | Complex SQL limited |
| Mixpanel | Event tracking, funnel analysis, retention | Limited DW integration |
| PostHog | Self-hosted, session recording, feature flags | Smaller community |
| Heap | Auto-capture, retroactive analysis | Less naming control |
| Google Analytics 4 | Web analytics, acquisition | Limited product analytics |
| Pendo | Product analytics + in-app guides | Heavier integration |

## Key Points
- Events are the atomic unit of analytics — track purposefully, not everything
- Funnels must be timeboxed, segmented, and limited to 5-7 steps
- Retention is the best indicator of product-market fit
- AARRR maps the full user lifecycle with clear metrics per stage
- Every metric needs a counter metric to prevent sub-optimization
- Leading indicators predict; lagging indicators confirm
- Segment everything — aggregate metrics hide critical patterns
- Activate before acquiring: fix a leaky bucket before pouring more water
- North Star metric must correlate with long-term retention
- Event naming must be hierarchical, consistent, and versioned
- Analytics maturity progresses from vanity to prescriptive
- Tool selection depends on product maturity, team size, and budget
