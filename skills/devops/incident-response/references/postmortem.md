# Postmortem Process

## Overview
A blameless postmortem identifies what went wrong, why it went wrong, and what systemic improvements prevent recurrence. The goal is learning, not accountability. Postmortems drive organizational improvement by turning incidents into actionable insights.

## Blameless Culture
- Incidents are caused by system gaps, not individual mistakes
- Postmortems never assign blame to a person or team
- "Human error" is always a symptom of a deeper systemic issue
- Psychological safety enables honest root cause analysis
- Leadership demonstrates blameless culture by participating in postmortems
- Language matters: say "the deploy caused" not "Bob caused"
- All engineers are empowered to stop the line and declare an incident
- Postmortems shared broadly — incidents are learning opportunities for everyone

## Postmortem Structure

### Header
- Incident ID, date, duration, severity, services affected
- IC, scribe, SMEs involved
- Link to incident channel log and timeline document
- Detection method (alert, user report, automated)

### Timeline
```text
2026-01-15 14:02:00 UTC — Deploy v2.3.1 to production (99% canary)
2026-01-15 14:07:00 UTC — Error rate spikes to 12% (Datadog alert)
2026-01-15 14:08:00 UTC — SEV2 declared, @alice IC assigned
2026-01-15 14:10:00 UTC — Deploy rolled back to v2.3.0
2026-01-15 14:12:00 UTC — Error rate returns to 0.2% baseline
2026-01-15 14:15:00 UTC — Incident resolved
```
Timeline must be by minute, not by phase. Every entry is a specific action or observation with a precise timestamp. Include detection gaps, delayed responses, and successful mitigations equally.

### Root Cause Analysis
Use 5 Whys or fishbone diagram. Ask "why" recursively until the systemic root cause is found. Example: "Why did error rate spike?" -> "Because deployment v2.3.1 introduced a breaking config change." -> "Why was the config change not caught?" -> "Because integration tests did not cover that config path." -> "Why was the config path missing from tests?" -> "Because test coverage review is not part of the deployment checklist." -> "Why is coverage review not in the checklist?" -> "Because the deployment checklist was last updated 18 months ago."

### Impact Assessment
- Users affected: {count or percentage}
- Downtime duration: {minutes}
- Revenue loss: ${amount} (estimated)
- Data loss: {yes/no, extent}
- SLA breach: {yes/no}
- Customer support tickets created: {count}

### Action Items
| Action | Owner | Type | Due Date | Status |
|---|---|---|---|---|
| Add integration test for config path | @bob | prevent | 2026-01-22 | open |
| Add monitoring for config validation errors | @carol | detect | 2026-01-20 | open |
| Reduce canary from 99% to 10% | @dave | process | 2026-01-18 | done |

Action item types: prevent (systemic fix), detect (monitoring/alerting improvement), process (workflow/policy change), mitigate (reduce impact of recurrence). Every action item has exactly one owner and one due date.

### Lessons Learned
- What went well: (e.g., rapid detection, good IC handoff, clear communication)
- What went wrong: (e.g., missing runbook, slow rollback, unclear escalation)
- What to improve: (e.g., better canary strategy, additional dashboards, runbook drills)
- Surprises: (e.g., unexpected dependency, cascading failure, silent degradation)

### Review Meeting
Present postmortem within timeline: SEV1 within 48 hours, SEV2 within 1 week, SEV3 within next sprint. Meeting agenda: 5min summary -> 10min timeline walkthrough -> 15min root cause -> 10min action items -> 5min discussion -> 5min grading. Attendees: IC, SMEs, affected team, engineering manager, adjacent teams.

## Timeline Best Practices
Granularity: entries at minute-level granularity, not phase-level. Each entry includes: precise timestamp (UTC), who took the action, what was done, outcome observed. Sources: incident channel messages, time-stamped deployment logs, monitoring alert timestamps, page/acknowledgment timestamps. Gaps: note any periods with no entries — these indicate gaps in communication or observability. Common gaps: time between detection and IC assignment, time between investigation start and mitigation, time between mitigation and verification. Fill gaps by questioning: "what happened between these two entries?"

## Root Cause Analysis Methods
5 Whys: start with the incident symptom, ask "why" five times or until systemic root cause is identified. Each answer builds on the previous. Example: "Payment API returned 500 errors" -> "Because database connection pool exhausted" -> "Because connection leak from unclosed transactions" -> "Because error handling path does not close connections on timeout" -> "Because code review checklist does not include resource cleanup patterns" -> "Because team onboarding does not cover resource management patterns." Fishbone diagram: categorize possible causes into categories (people, process, technology, environment, data, measurement) branching from the spine (incident outcome). Use for complex incidents with multiple contributing factors.

## Action Item Management
Each action item has: unique ID, description, owner (one person), due date, type (prevent: systemic fix to prevent recurrence, detect: improve monitoring/alerting to detect earlier, mitigate: reduce impact if recurrence occurs, process: improve workflow/policy). Action item status: open, in-progress, done, blocked, cancelled. Tracking tool integration: Jira, Linear, Asana, or any project management tool. Review cadence: weekly standup review until all items closed. Reporting: action item closure rate tracked as team KPI, target >90% closure within 30 days.
Grade each postmortem on: timeline completeness (are all actions timestamped?), root cause depth (did we reach systemic cause?), action item quality (are they specific, owned, dated?), and blameless tone (no blame language). Grades shared quarterly to drive improvement in postmortem quality.

## Postmortem Metrics
- Postmortem completion rate (target: 100% within SLA)
- Action item closure rate (target: 90% within 30 days)
- Mean time to postmortem (target: SEV1 < 48h)
- Repeat incidents (incidents with same root cause — target: 0)

## Postmortem Submission and Review Workflow
1. IC drafts postmortem within 24h of incident (or 48h for SEV2) using template
2. Scribe validates timeline accuracy against incident channel log
3. SMEs review technical accuracy of root cause analysis
4. Action items assigned to owners with due dates during review meeting
5. Postmortem published to internal wiki/confluence for organization-wide access
6. Postmortem presented at weekly engineering all-hands for key learnings
7. Action items tracked weekly in standup until closure
8. Postmortem quality grade assigned by engineering manager
9. Quarterly postmortem trends report shared with leadership
10. Repeat incidents flagged for systemic improvement program

## Postmortem Metrics and Reporting
Postmortem completion rate: target 100% within SLA window (48h SEV1, 1 week SEV2). Action item closure rate: target >90% within 30 days. Mean time to postmortem: average days from incident resolution to postmortem publication. Repeat incident rate: percentage of incidents with same root cause as previous incident within 90 days — target <5%. Incident distribution by severity: tracked monthly to identify trend shifts. Action item types breakdown: prevent vs detect vs mitigate vs process — drives investment decisions.

## Common Postmortem Anti-Patterns
Blaming individuals: "Bob made a mistake" instead of "the deployment checklist missed the config validation step." Superficial root cause: stopping at "human error" without digging into systemic factors. Vague action items: "improve testing" instead of "add integration test for config path with specific assertion." No owner: "team will fix" instead of a single named owner. Action items without dates: no deadline means no urgency. Skipping postmortem for SEV3/4: every incident has learning value, even minor ones. Postmortem not shared: learning is lost if only the incident team sees it. Overly long postmortems: keep to 1-2 pages — brevity forces clarity. 

## Key Points
- Blameless is not optional — the postmortem fails if anyone feels blamed
- Timeline must be granular enough to identify gaps in detection/response
- Every action item must have a single owner — shared ownership is no ownership
- Track action items to completion in the project management tool
- Share postmortems internally — incidents are learning opportunities for everyone
- Postmortem quality matters — grade them to drive improvement
- Prevent repeat incidents by tracking root cause categories over time
- Involve adjacent teams in postmortem review — cascading failures cross boundaries
- Postmortem is a process, not a document — the review meeting is as important as the written report
- Action item closure rate tracked as team KPI with visible dashboard
