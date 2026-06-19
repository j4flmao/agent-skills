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
Designs and implements product analytics frameworks including event tracking, funnel analysis, retention cohorts, and metric definitions. Enables data-driven product decisions through systematic measurement of user behavior, identification of friction points, and quantification of product-market fit.

## Agent Protocol

### Trigger
Exact user phrases: product analytics, event tracking, Amplitude, Mixpanel, funnel analysis, retention, cohort, North Star metric, AARRR.

### Input Context
- What analytics platform is used (Amplitude, Mixpanel, PostHog, custom)?
- What user actions are currently tracked?
- What are the key user journeys to analyze?
- What is the North Star metric for the product?
- What event naming conventions exist?
- What are the current metric baselines?
- Who are the analytics stakeholders and their reporting needs?

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
- [ ] Tracking implementation validated via QA
- [ ] Stakeholder access and permissions configured

### Max Response Length
7000 tokens

## Framework/Methodology

### Analytics Maturity Model

| Level | Name | Characteristics | Tools |
|-------|------|-----------------|-------|
| 1 | Vanity | Page views, downloads, no taxonomy | Google Analytics basic |
| 2 | Descriptive | Event tracking, basic funnels, dashboards | Mixpanel, Amplitude |
| 3 | Diagnostic | Segmentation, cohort analysis, retention | Full analytics suite |
| 4 | Predictive | Forecasting, propensity models, LTV modeling | ML-enabled platform |
| 5 | Prescriptive | Automated experimentation, personalization | AI-driven optimization |

### HEART Framework Integration
Google's HEART framework maps product analytics dimensions:

| Dimension | Example Metric | Event Tracking | Analysis Type |
|-----------|---------------|----------------|---------------|
| Happiness | CSAT, NPS, SUS | Survey responses, feedback events | Satisfaction |
| Engagement | DAU/MAU, session length, actions/session | Active use events | Behavioral |
| Adoption | New user activation rate, feature adoption | First-use events | Conversion |
| Retention | D7/D30 return rate, churn rate | Return visit events | Cohort |
| Task Success | Task completion, error rate, time to complete | Funnel completion | Efficiency |

### Metric Hierarchy

```
Company OKRs
  └── North Star Metric (single metric capturing customer value)
        └── Input Metrics (leading indicators that drive NSM)
              └── Counter Metrics (guardrails against negative behavior)
                    └── Diagnostic Metrics (deep-dive into specific areas)
```

Each lower layer explains performance of the layer above.

### Data-Informed vs Data-Driven
- Data-informed: Metrics guide decisions but qualitative context is also considered
- Data-driven: Metrics directly determine decisions, often automated
- Best practice: Be data-informed for strategic decisions, data-driven for tactical optimizations

## Workflow

### Step 1: Event Taxonomy Design
Define naming convention: {domain}.{entity}.{action}_{context} (e.g., billing.subscription.upgraded_from_trial). Categorize events: user actions (click, view, submit), system events (error, sync, notification), session events (start, end, duration). Document event properties and data types.

Event taxonomy principles:
- Consistent naming: `{domain}.{entity}.{action}_{context}`
- Hierarchical: Enables querying by wildcard (e.g., `billing.*`)
- Readable: Developers and analysts can understand without documentation
- Extensible: Adding new events doesn't break existing conventions
- Versioned: Major changes get version suffix (e.g., `_v2`)

Property categories:
- User properties: plan_tier, account_age_days, region, role
- Event properties: value, currency, error_type, source_screen
- Session properties: utm_source, campaign, referrer, device_type
- Object properties: project_id, document_count, team_size

### Step 2: Funnel Analysis
Map critical user journeys as funnels. Identify drop-off points between each step. Calculate conversion rate at each step. Segment funnels by user attributes (cohort, plan, source). Set benchmark conversion rates and alert on regression.

Key funnels by product stage:

| Product Stage | Primary Funnel | Secondary Funnel |
|---------------|----------------|------------------|
| Growth | Acquisition → Signup → Activation | Invite → Signup → First action |
| Engagement | Visit → Key action → Return | Notification → Open → Action |
| Monetization | Trial → Subscribe → Retain | Free → Pro → Enterprise |
| Retention | Active → Re-engage → Power user | Feature A → Feature B → Feature C |

Funnel analysis rules:
- Limit to 5-7 steps (more makes drop-offs hard to act on)
- Each step must be a single user action
- Timebox funnels (e.g., conversion within 7 days)
- Segment by user attributes to identify differential behavior
- Report both absolute (total users at each step) and relative (% conversion between steps)

### Step 3: Retention Cohorts
Define retention periods (daily for first week, weekly for first month, monthly for long-term). Calculate Day 1/7/30 retention rates. Compare cohorts by acquisition channel, plan tier, and user segment. Identify power user patterns and their activation triggers.

Retention types:

| Type | Definition | Best For | Time Window |
|------|------------|----------|-------------|
| Classic retention | Users who return and perform action | Engagement-heavy products | Daily/Weekly |
| Rolling retention | Users who ever returned after signup | Infrequent-use products | Monthly |
| Bracket retention | Users active in period X after signup | Subscription benchmarks | Monthly/Quarterly |
| Unbounded retention | Users who returned at least once | Social/communication apps | Indefinite |

Cohort analysis template:
```
Cohort | Size | D1 | D3 | D7 | D14 | D30 | D60
2025-01 | 1000 | 45% | 30% | 20% | 15% | 10% | 7%
2025-02 | 1200 | 48% | 32% | 22% | 16% | 11% | 8%
2025-03 | 1100 | 50% | 35% | 25% | 18% | 13% | -
```

### Step 4: North Star Metric Definition
Define the single metric that best captures customer value. Ensure it correlates with long-term retention. Instrument tracking across the full user journey. Set current baseline and quarterly targets.

Criteria for a good North Star metric:
- Captures customer value (not just business value)
- Leading indicator of long-term retention
- Actionable (team can directly influence it)
- Understandable at all levels of the organization
- Measurable with existing instrumentation

Examples by product type:

| Product Type | North Star Metric | Why |
|-------------|-------------------|-----|
| SaaS B2B | Weekly active teams | Team adoption drives retention |
| Social app | Daily messages sent | Core value is communication |
| E-commerce | Orders per buyer per month | Repeat purchase drives LTV |
| Marketplace | Successful transactions | Liquidity drives both sides |
| Content platform | Weekly content consumption | Engagement drives subscription |

### Step 5: AARRR Framework
Map each AARRR stage to tracked events. Acquisition: signups by source, channel attribution. Activation: first value event within 24h. Retention: Day 7/30 return rate. Revenue: ARPU, LTV, conversion rate. Referral: invite sent, invite accepted, K-factor.

Detailed AARRR metrics:

| Stage | Top Metric | Supporting Metrics | Tracking Events |
|-------|------------|-------------------|-----------------|
| Acquisition | CAC by channel | Signup volume, channel mix, traffic source | page_viewed, signup_completed, utm_params |
| Activation | Activation rate | Time-to-activation, % completing setup | onboarding_step_completed, first_value_event |
| Retention | D7/D30 retention | Churn rate, DAU/MAU, session frequency | session_started, key_action_completed |
| Revenue | ARPU, LTV | MRR, conversion rate, upgrade rate | subscription_started, payment_completed |
| Referral | K-factor | Invite-to-signup rate, viral coefficient | invite_sent, invite_accepted |

### Step 6: Dashboard Design
Create dashboards that drive decisions, not vanity metrics:

1. Executive dashboard: North Star metric, key results, trend lines (weekly review)
2. Product dashboard: Funnel conversions, retention cohorts, feature adoption (daily review)
3. Experiment dashboard: A/B test results, statistical significance (per experiment)
4. Health dashboard: Data quality, event volume anomalies, tracking gaps (automated alerts)

Dashboard design principles:
- One screen, no scrolling for primary metrics
- Comparison to baseline (prior period, target, benchmark)
- Sparklines for trend direction
- Annotation of significant events (releases, campaigns, incidents)
- Drill-down capability for investigation

## Advanced Segmentation Methods

### Behavioral Cohorts
Group users by shared behavior patterns, not just acquisition date. Create cohorts around feature adoption, engagement depth, or lifecycle stage. Track each cohort's behavior over time to identify trends. Compare early-stage vs mature product adoption patterns.

**Segmentation dimensions for analytics:**
| Dimension | Example Segments | Analysis Value |
|-----------|-----------------|----------------|
| Usage frequency | Power / Regular / Occasional / Dormant | Identify power user patterns |
| Feature adoption | Feature explorers / Workflow specialists / Minimalists | Guide onboarding and feature discovery |
| Lifecycle stage | New / Active / At-risk / Churned | Trigger interventions at right time |
| Acquisition channel | Organic / Paid / Referral / Direct | Optimize channel mix and CAC |
| Plan tier | Free / Pro / Enterprise | Design upgrade triggers and feature gating |

### Counter Metric Design
Every metric needs a counter metric — a guardrail that detects when optimizing one metric harms another. If you optimize for session duration, counter metric is task completion rate (longer sessions might mean confusion). If you optimize for feature adoption, counter metric is churn in adjacent features. If you optimize for conversion rate, counter metric is support ticket volume (aggressive conversion might create confused users).

**Counter metric framework:**
```
Primary Metric: {metric we want to improve}
Counter Metric 1: {what could be harmed if primary goes up}
  Threshold: {when counter metric deviation triggers alert}
Counter Metric 2: {what else could be harmed}
  Threshold: {when counter metric deviation triggers alert}
Review cadence: {how often to check both primary and counter metrics}
```

## Data Quality Framework

### Tracking Quality Assurance
Every event must pass validation before being trusted for analysis. Implement a tracking QA process:

| Check | Method | Frequency | Alert |
|-------|--------|-----------|-------|
| Event volume | Compare to expected daily volume | Daily | >20% deviation |
| Property validity | Check required properties are non-null | Per event | Missing properties logged |
| Naming consistency | Validate against taxonomy spec | Per deployment | CI pipeline failure |
| Duplicate detection | Check for identical events within 1s | Hourly | >0.01% duplication rate |
| Schema compliance | Validate property types and enums | Per event | Reject invalid events |

### Data Quality SLAs

| SLA | Target | Measurement |
|-----|--------|-------------|
| Event delivery latency | <60s for 99% of events | Event created → received timestamp |
| Data completeness | >99.5% of expected events tracked | Compare to server log count |
| Property population rate | >99% of required properties have values | Null rate per property |
| Tracking bug response time | <4 hours for P0, <24h for P1 | Bug reported → fix deployed |
| Data availability SLA | 99.9% queryable within 2h of event | Query returns ≤2h old data |

### Event Audit Process
Quarterly, audit all tracked events: verify each event still fires correctly, check property schemas haven't drifted, remove events that no longer serve a purpose, consolidate duplicate events, document any schema changes. Publish audit results to analytics stakeholders.

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Vanity metrics | Metrics that look good but don't drive decisions | Focus on actionable metrics that inform specific decisions |
| Event name chaos | Inconsistent naming, duplicate events, missing properties | Enforce taxonomy governance and review process |
| Surfaced-only analysis | Looking at aggregate data without cohort segmentation | Always segment by meaningful user dimensions |
| Confusing correlation with causation | Assuming metric relationships imply cause | Use controlled experiments to establish causality |
| Dashboard overload | Too many metrics, no clear action items | Limit to 5-7 metrics per dashboard, always include owners |
| Sampling bias | Drawing conclusions from non-representative data | Verify sample representativeness before analysis |
| Survivorship bias | Only analyzing active users, ignoring churned | Include churned and inactive users in analysis |
| Metric fixation | Optimizing metrics at expense of user value | Always track counter metrics to detect negative behavior |
| Tracking everything | Too many events causing noise and performance issues | Track purposefully: every event should answer a question |
| Delayed data | Making decisions on stale or incomplete data | Set SLA on data freshness; alert on delays |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Instrument before launch | Capture baseline data from day one; retroactive tracking is hard |
| Document event taxonomy in a shared spec | Prevents naming conflicts and duplication across teams |
| QA tracking in staging before production | Catches bugs before corrupting production data |
| Use property enums where possible | Prevents invalid values and simplifies analysis |
| Regularly prune unused events | Reduces noise and keeps data processing costs manageable |
| Set event volume alerts | Detect sudden drops (tracking bug) or spikes (bot traffic) |
| Version your events | Avoids breaking existing analyses when event definitions change |
| Create a single source of truth for metric definitions | Preents "metric of the month" confusion across teams |
| Align analytics cadence with business rhythms | Daily ops, weekly product reviews, monthly strategy |
| Train team on self-serve analytics | Reduces dependency on data team for common questions |

## Templates & Tools

### Event Specification Template
```
Event Name: {domain}.{entity}.{action}_{context}
Description: {plain English description of when this event fires}
Trigger: {user action or system condition that fires the event}
Category: {user_action / system_event / session_event}

Properties:
| Property | Type | Example | Required | Enum Values |
|----------|------|---------|----------|-------------|
| {prop} | {string/number/boolean} | {example} | {yes/no} | {if applicable} |

Platform: {web / iOS / Android / all}
Version: {since when this event exists}
Owner: {team responsible}
```

### Tool Selection Guide

| Tool | Best For | Pricing | Limitations |
|------|----------|---------|-------------|
| Amplitude | Product analytics, behavioral cohorts, experimentation | Free tier + paid | Complex SQL queries limited |
| Mixpanel | Event tracking, funnel analysis, retention | Free tier + paid | Limited data warehouse integration |
| PostHog | Self-hosted, session recording, feature flags | Open source + paid cloud | Smaller community |
| Heap | Auto-captured events, retroactive analysis | Paid | Event naming less controlled |
| Google Analytics 4 | Web analytics, acquisition, basic funnels | Free | Limited product analytics features |
| Pendo | Product analytics + in-app guides | Paid | Heavier integration |
| Segment | Event collection and routing to downstream tools | Free + paid | Middleware, not analysis tool |

### Funnel Analysis Template
```
Funnel: {funnel name}
Goal: {what we want users to accomplish}
Timebox: {within X days/hours of starting}

Steps:
1. {Step 1 event} → Users in: {N} | Conversion: {X%} | Drop-off: {Y%}
2. {Step 2 event} → Users in: {N} | Conversion: {X%} | Drop-off: {Y%}
3. {Step 3 event} → Users in: {N} | Conversion: {X%} | Drop-off: {Y%}

Biggest drop-off: Step {N} → Step {N+1} ({Y%} loss)
Hypothesis: {why users drop off at this step}
Recommended action: {what to test or fix}
```

## Case Studies

### Case Study 1: Activation Funnel Optimization
A B2B SaaS company identified through funnel analysis that 70% of signups dropped off between account creation and the first data import. Event tracking revealed that users who imported data within 24 hours had 80% D30 retention vs 25% for those who didn't. The team redesigned the import flow, added import templates, and created a guided import wizard. Activation rate increased from 30% to 65%.

Method: Funnel analysis segmented by import completion status
Key metric: Import completion rate increased from 30% to 65%
Impact: D30 retention increased from 25% to 60% for the improved segment

### Case Study 2: Retention Cohort Analysis Revealing Product-Market Fit Issues
A consumer app showed 40% D1 retention but only 5% D30 retention. Cohort analysis segmented by onboarding completion showed that users who completed the full onboarding had 35% D30 retention. The team redesigned onboarding to highlight the core value proposition within the first session, resulting in D30 retention increasing from 5% to 18%.

Method: Cohort analysis segmented by onboarding depth
Key insight: Onboarding completion was the strongest predictor of retention
Impact: D30 retention 3.6x improvement

### Case Study 3: Event Taxonomy Consolidation
A mid-stage startup discovered they had 847 unique event names, many of which were duplicates or unused. An audit found 320 events never fired, 180 were duplicates, and only 347 were actively used. Consolidating the taxonomy to 412 well-documented events reduced data costs by 40% and improved analyst productivity.

Method: Event taxonomy audit using pattern matching
Key finding: 68% of events were unused or duplicated
Impact: 40% cost reduction in data processing, 50% faster query times

## Event Taxonomy Templates

### Standard Event Schema
```json
{
  "event": "noun_verb",
  "properties": {
    "user_id": "string (required)",
    "timestamp": "ISO 8601 (required)",
    "session_id": "string (required)",
    "version": "app_version (required)",
    "platform": "web | ios | android",
    "locale": "en_US"
  },
  "context": {
    "page_url": "string",
    "referrer": "string",
    "device": "desktop | mobile | tablet",
    "connection_type": "wifi | cellular | ethernet"
  }
}
```

### Event Naming Convention
```
Format: {noun}_{past_tense_verb}
Examples:
  user_signed_up
  plan_subscribed
  feature_used
  onboarding_completed
  payment_failed
  session_started

Structure rules:
  noun = the subject (user, plan, payment, session, feature)
  verb = past tense action (signed_up, subscribed, failed, completed)
  Use snake_case, all lowercase
  Max 3 words total (e.g., payment_method_added, not user_added_new_payment_method)
  Version with suffix: feature_used_v2

Property naming:
  camelCase for property names
  snake_case for event names (historical convention)
```

### Event Taxonomy Template
```
## Event: {event_name}
Owner: {team_name}
Purpose: {one-line business question answered}
Trigger: {condition that fires the event}

Properties:
| Name | Type | Example | Required | PII |
|------|------|---------|----------|-----|
| {prop} | string | "premium" | yes | no |
| {prop} | number | 42 | no | no |

Tracking:
  - Implementation status: {not_started / in_dev / testing / live}
  - Dashboard: {link to dashboard}
  - First tracked: {date}
  - Last reviewed: {date}
```

## Cohort Design Patterns

### Pattern 1: Acquisition Cohort (weekly)
```sql
-- Users grouped by signup week, tracked for retention
WITH cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', signup_date) AS cohort_week
  FROM users
),
activity AS (
  SELECT
    c.user_id,
    c.cohort_week,
    DATE_TRUNC('week', a.activity_date) AS activity_week,
    DATE_PART('week', a.activity_date) - DATE_PART('week', c.cohort_week)
      + (DATE_PART('year', a.activity_date) - DATE_PART('year', c.cohort_week)) * 52
      AS week_number
  FROM cohorts c
  JOIN activity_log a ON c.user_id = a.user_id
)
SELECT
  cohort_week,
  week_number,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(DISTINCT user_id) / MAX(COUNT(DISTINCT user_id)) OVER (PARTITION BY cohort_week) AS retention
FROM activity
GROUP BY cohort_week, week_number
ORDER BY cohort_week, week_number
```

### Pattern 2: Behavioral Cohort (by feature adoption)
```sql
-- Users grouped by feature adoption event date
WITH feature_users AS (
  SELECT DISTINCT user_id,
    MIN(event_timestamp) AS first_feature_date
  FROM events
  WHERE event_name = 'feature_used'
  GROUP BY user_id
),
cohorts AS (
  SELECT
    fu.user_id,
    DATE_TRUNC('week', fu.first_feature_date) AS cohort_week
  FROM feature_users fu
)
-- ... rest of retention query as in Pattern 1
```

### Cohort Interpretation Guidelines
```
Retention curve shapes:
  Flat line at high % -> sticky product (e.g., 60% retained at week 12)
  Steep drop then flat -> partial retention (e.g., 80% to 30% by week 4, then stable)
  Continuous decline -> churn problem (fix: improve core value delivery)
  Increasing retention in older cohorts -> product improving over time
  Decreasing retention in newer cohorts -> regression (fix: rollback recent changes)

Sample size minimums:
  100 users per cohort minimum for statistical validity
  30 users minimum per period for any actionable insight
  Below 30: aggregate multiple cohorts or extend period
```

## SQL Templates for Product Analytics

### Funnel Analysis
```sql
WITH step_1 AS (
  SELECT DISTINCT user_id, session_id
  FROM events WHERE event_name = 'page_viewed' AND page = '/signup'
),
step_2 AS (
  SELECT DISTINCT user_id, session_id
  FROM events WHERE event_name = 'form_started'
),
step_3 AS (
  SELECT DISTINCT user_id, session_id
  FROM events WHERE event_name = 'user_signed_up'
)
SELECT
  COUNT(DISTINCT s1.user_id) AS step_1_users,
  COUNT(DISTINCT s2.user_id) AS step_2_users,
  COUNT(DISTINCT s3.user_id) AS step_3_users,
  ROUND(COUNT(DISTINCT s2.user_id) * 100.0 / COUNT(DISTINCT s1.user_id), 1) AS step_1_to_2_pct,
  ROUND(COUNT(DISTINCT s3.user_id) * 100.0 / COUNT(DISTINCT s2.user_id), 1) AS step_2_to_3_pct
FROM step_1 s1
LEFT JOIN step_2 s2 ON s1.session_id = s2.session_id
LEFT JOIN step_3 s3 ON s2.session_id = s3.session_id
```

### User Segmentation for Analysis
```sql
SELECT
  CASE
    WHEN COUNT(DISTINCT e.event_name) >= 10 THEN 'power_user'
    WHEN COUNT(DISTINCT e.event_name) >= 3 THEN 'regular_user'
    WHEN sa.user_id IS NOT NULL THEN 'signed_up_only'
    ELSE 'anonymous'
  END AS user_segment,
  COUNT(DISTINCT e.user_id) AS users,
  COUNT(*) AS total_events,
  ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT e.user_id), 1) AS events_per_user
FROM events e
LEFT JOIN signup_activity sa ON e.user_id = sa.user_id
WHERE e.event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_segment
ORDER BY users DESC
```

## Analytics Anti-Patterns

1. **Vanity metrics on dashboards**: Tracking total users without segmenting
   Fix: Always segment by cohort, acquisition channel, or user type
2. **No event governance**: Uncontrolled event creation leads to taxonomies with 1000+ events
   Fix: Event registry with owner, review quarterly, prune unused
3. **Confusing correlation with causation**: Dashboard shows correlation, team acts on it
   Fix: Run controlled experiments before causal claims
4. **Dashboard overload**: 50+ charts on a single dashboard
   Fix: One metric per chart, max 8 charts per dashboard, hierarchy of dashboards
5. **No data quality monitoring**: Pipeline breaks, wrong data for 2 weeks
   Fix: Daily data quality alerts, event volume anomaly detection

## Rules
- Event names must follow noun_verb naming convention consistently.
- Every event must include user ID, timestamp, session ID, and version.
- Funnels must have no more than 7 steps to remain actionable.
- Retention calculations must define the action window precisely.
- North Star metric must be a leading indicator of retention.
- PII must never be sent as event properties.
- Data quality checks must run daily for event volume anomalies.
- AARRR metrics must be reviewable in a single dashboard.
- Every tracked event must have a documented owner and purpose.
- Do not track events that cannot be analyzed within 30 days.
- Funnel analysis must always be segmented by at least one user attribute.
- Retention cohorts must include minimum 100 users for statistical validity.
- Dashboard metrics must include comparison to prior period.
- Unused events must be pruned quarterly.
- Event property schema changes must be versioned and communicated.

## References
  - references/analytics-advanced.md — Analytics Advanced Topics
  - references/analytics-fundamentals.md — Analytics Fundamentals
  - references/event-taxonomy.md — Event Taxonomy
  - references/event-tracking.md — Event Tracking Implementation
  - references/funnel-analysis.md — Funnel Analysis
  - references/metric-frameworks.md — Metric Frameworks
  - references/product-analytics-framework.md — Product Analytics Framework
  - references/product-analytics-tools-implementation.md — Product Analytics Tools and Implementation
## Handoff
For A/B testing statistical analysis, hand off to `product-ab-testing`. For user research insights, hand off to `product-user-research`.
