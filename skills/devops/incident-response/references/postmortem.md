# Postmortem Process

## Overview
A blameless postmortem identifies what went wrong, why it went wrong, and what systemic improvements prevent recurrence. The goal is learning, not accountability.

## Blameless Culture
- Incidents are caused by system gaps, not individual mistakes
- Postmortems never assign blame to a person or team
- "Human error" is always a symptom of a deeper systemic issue
- Psychological safety enables honest root cause analysis
- Leadership demonstrates blameless culture by participating in postmortems

## Postmortem Structure

### Header
- Incident ID, date, duration, severity, services affected
- IC, scribe, SMEs involved
- Link to incident channel log

### Timeline
```
2024-01-15 14:02:00 UTC — Deploy v2.3.1 to production (99% canary)
2024-01-15 14:07:00 UTC — Error rate spikes to 12% (Datadog alert)
2024-01-15 14:08:00 UTC — SEV2 declared, @alice IC assigned
2024-01-15 14:10:00 UTC — Deploy rolled back to v2.3.0
2024-01-15 14:12:00 UTC — Error rate returns to 0.2% baseline
2024-01-15 14:15:00 UTC — Incident resolved
```
Timeline must be by minute, not by phase. Every entry is a specific action or observation with a precise timestamp.

### Root Cause Analysis
Use 5 Whys or fishbone diagram. Ask "why" recursively until the systemic root cause is found. Example: "Why did error rate spike?" → "Because deployment v2.3.1 introduced a breaking config change." → "Why was the config change not caught?" → "Because integration tests did not cover that config path." → "Why was the config path missing from tests?" → "Because test coverage review is not part of the deployment checklist."

### Impact Assessment
- Users affected: {count}
- Downtime duration: {minutes}
- Revenue loss: ${amount}
- Data loss: {yes/no, extent}
- SLA breach: {yes/no}

### Action Items
| Action | Owner | Type | Due Date | Status |
|---|---|---|---|---|
| Add integration test for config path | @bob | prevent | 2024-01-22 | open |
| Add monitoring for config validation errors | @carol | detect | 2024-01-20 | open |
| Reduce canary from 99% to 10% | @dave | process | 2024-01-18 | done |

Action item types: prevent (systemic fix), detect (monitoring/alerting improvement), process (workflow/policy change), mitigate (reduce impact of recurrence).

### Review Meeting
Present postmortem within timeline: SEV1 within 48 hours, SEV2 within 1 week, SEV3 within next sprint. Meeting agenda: 5min summary → 10min timeline walkthrough → 15min root cause → 10min action items → 5min discussion. Attendees: IC, SMEs, affected team, engineering manager.

## Key Points
- Blameless is not optional — the postmortem fails if anyone feels blamed
- Timeline must be granular enough to identify gaps in detection/response
- Every action item must have a single owner — shared ownership is no ownership
- Track action items to completion in the project management tool
- Share postmortems internally — incidents are learning opportunities for everyone
