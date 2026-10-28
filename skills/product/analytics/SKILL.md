---
name: product-analytics
description: >
  Use this skill when the user says 'product analytics', 'tracking plan', 'event taxonomy', 'retention curve', 'cohort analysis', 'funnel', 'DAU/MAU', 'north star metric', 'activation metric', 'amplitude', 'mixpanel', 'posthog'. It defines metrics, a tracking plan and event schema, implements instrumentation, and analyzes funnels, retention and engagement. Do NOT use for: experiment design and significance (use product/ab-testing or data-science/experimentation), mobile SDK specifics (use mobile-analytics), warehouse modeling (use data-science-analytics-engineering).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [product, analytics, metrics, retention, funnel, tracking-plan]
---

# Product Analytics

## Purpose
Turn user behaviour into decisions: pick a small set of metrics tied to value, instrument a consistent event taxonomy that answers them, and analyze funnels, cohorts and retention without the classic traps (vanity metrics, broken identity, unversioned events).

## Agent Protocol

### Trigger
"product analytics", "tracking plan", "event naming", "retention", "cohort", "funnel", "DAU/MAU", "stickiness", "north star", "activation", "amplitude", "mixpanel", "posthog", "segment".

### Input Context
- Product type (B2C app, B2B SaaS, marketplace) and value moment.
- Analytics stack (Amplitude, Mixpanel, PostHog, GA4, Segment/RudderStack, warehouse).
- Questions the team must answer this quarter.

### Output Artifact
Metric tree + tracking plan table; SQL or tool configuration on request.

### Response Format
```
North Star: {metric} — why it reflects delivered value
Inputs: {3-5 drivers}
Events: {event_name: required properties}
Analyses: {funnel/retention/cohort definitions}
Owner + review cadence: {team, weekly}
```

## Metric Design

| Layer | Example (B2B SaaS) | Example (consumer app) |
|-------|--------------------|------------------------|
| North Star | Weekly active teams completing ≥1 workflow | Weekly listeners with ≥3 sessions |
| Activation | Team invites 2+ members and completes first workflow within 7 days | Completes onboarding + first playlist |
| Engagement | Workflows per active team per week | Sessions per user per week |
| Retention | Week-4 team retention | D30 user retention |
| Monetization | Net revenue retention | Trial-to-paid conversion |

Rules: every metric has a precise definition (numerator, denominator, time window, filters), an owner, and a reason it predicts revenue or retention. Totals that only grow (cumulative signups) are vanity metrics.

## Core Definitions
- **DAU/MAU (stickiness)**: average DAU in the period ÷ MAU. Meaningful only for products meant for daily use; use WAU/MAU for weekly-use products.
- **N-day retention**: % of a cohort active on exactly day N. **Unbounded (rolling) retention**: % active on day N or later. State which one you report.
- **Cohort**: users grouped by first-action date (or signup), tracked over time — compare cohorts to see if product changes improve retention.
- **Funnel conversion**: ordered steps within a conversion window (e.g., 7 days); report step-to-step and overall.

## Tracking Plan

| Event | Trigger | Required properties | Owner |
|-------|---------|---------------------|-------|
| `signup_completed` | Account created (server) | `method`, `plan`, `referrer` | Growth |
| `project_created` | Project saved (server) | `project_id`, `template_used` | Core |
| `invite_sent` | Invite email queued | `invitee_role`, `team_size` | Collaboration |
| `checkout_completed` | Payment confirmed (server) | `order_id`, `value`, `currency` | Revenue |

Naming conventions (pick one, enforce everywhere): `object_action` in past tense, snake_case; properties snake_case; no PII (emails, names) in properties; IDs instead.

## Instrumentation

```typescript
import posthog from 'posthog-js';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, { api_host: 'https://us.i.posthog.com' });

export function onLogin(user: { id: string; plan: string }) {
  posthog.identify(user.id, { plan: user.plan }); // link anonymous pre-login events to the user
}

export function trackProjectCreated(projectId: string, templateUsed: boolean) {
  posthog.capture('project_created', { project_id: projectId, template_used: templateUsed });
}
```
- Send business-critical events (signup, payment) from the server — ad blockers drop a sizable share of client events.
- Call `reset()` on logout so shared devices do not merge users.
- Group analytics (account/company level) is required for B2B metrics.

## Retention Query (warehouse SQL, weekly cohorts)

```sql
WITH firsts AS (
  SELECT user_id, DATE_TRUNC('week', MIN(event_time)) AS cohort_week
  FROM events WHERE event_name = 'signup_completed' GROUP BY user_id
), activity AS (
  SELECT DISTINCT user_id, DATE_TRUNC('week', event_time) AS active_week
  FROM events WHERE event_name IN ('project_created', 'workflow_completed')
)
SELECT f.cohort_week,
       DATE_DIFF('week', f.cohort_week, a.active_week) AS week_n,  -- dialect-specific: DATEDIFF / date_diff
       COUNT(DISTINCT a.user_id) AS active_users
FROM firsts f JOIN activity a ON a.user_id = f.user_id AND a.active_week >= f.cohort_week
GROUP BY 1, 2 ORDER BY 1, 2;
```
Divide by cohort size for the retention %. A curve that flattens indicates product-market fit for that segment; one that decays to zero does not.

## Data Quality
- Version the tracking plan in Git; review new events in PRs.
- Use schema validation (Segment Protocols, Amplitude Data, PostHog/warehouse tests) to block unplanned events.
- Monitor event volume anomalies; a sudden drop usually means a broken release, not users leaving.
- Respect consent: gate client tracking on consent where GDPR/ePrivacy applies.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Track everything "just in case" | Tracking plan driven by questions |
| Inconsistent names (`Signup`, `signed_up`) | One convention + validation |
| Averages hiding segments | Break down by cohort, plan, platform |
| Correlation read as causation | Run an experiment |
| Client-only revenue events | Server-side for money events |

## Checklist
- [ ] North Star + 3–5 input metrics defined precisely
- [ ] Tracking plan versioned and owned
- [ ] Identity: identify on login, reset on logout, group for B2B
- [ ] Critical events server-side
- [ ] Retention definition (N-day vs unbounded) stated

## References
- `references/metric-frameworks.md`
- `references/event-taxonomy.md`
- `references/event-tracking.md`
- `references/funnel-analysis.md`
- `references/product-analytics-framework.md`
- `references/product-analytics-tools-implementation.md`
- `references/analytics-fundamentals.md`
- `references/analytics-advanced.md`
