# Communication Plan

## Overview
A communication plan defines who communicates what to whom,
through which channel, and at what cadence. It ensures stakeholders
get the right information at the right level of detail without
overwhelming or neglecting anyone.

## Cadence Design

### Communication Matrix
| Group | Cadence | Channel | Content | Owner |
|---|---|---|---|---|
| Executive sponsors | Monthly | Slide deck + meeting | Budget, milestones, risks | PM |
| Project team | Daily | Standup (15 min) | Blockers, progress, plan | Tech lead |
| Client stakeholders | Weekly | Email + optional call | Progress, demos, timeline | PM |
| Engineering | Weekly | Slack / email digest | Technical decisions, architecture | Tech lead |
| All hands | Quarterly | Town hall | Status, wins, roadmap | Sponsor |
| Regulatory | Per milestone | Formal report | Compliance, audit readiness | Compliance lead |

### Intensity by Phase
Kickoff: high — daily updates, kickoff meeting, introductions.
Execution: standard cadence per matrix.
Go-live: high — daily standups, war room, executive briefings.
Close: transition — final report, lessons learned, handoff docs.

## Channel Selection

### Meeting
Best for: decisions, alignment, conflict resolution, brainstorming.
Requires: published agenda, needed attendees only, timeboxed to 60 min.
Outcome notes within 24 hours. No agenda = no meeting.

### Email
Best for: formal communication, records, async preference.
Requires: clear subject with project prefix, key info first,
action items marked, attachments as PDF.
No lengthy threads — use document with summary.

### Slack/Teams
Best for: quick updates, informal questions, real-time coordination.
Requires: channels (not DMs) for project topics.
Pin important messages. Use threads for discussions.
No critical decisions in chat — move to documented decision.

### Dashboard
Best for: real-time metrics, RAG status, always-available reference.
Requires: auto-updating, mobile-friendly, clear RAG indicators.
No context in dashboards — pair with status report.

### Document
Best for: detailed specs, plans, reports, reference material.
Requires: version control, single source of truth, link from other channels.
No duplication — always link instead of repeating content.

## Status Report Template

### Executive Summary
Project: {name}
Period: {dates}
Overall Status: {GREEN / AMBER / RED}

Accomplishments:
- What was completed this period with measurable outcomes

Next Period Priorities:
- What will be done next, prioritized

Blockers (with escalation status):
- Blocker, escalated to owner on date, status: resolved/pending

Key Metrics:
- Metric: value vs target vs previous period

Risks (score > 10):
- Risk description, score PxI, owner, mitigation plan

Changes to Plan:
- Scope, timeline, resource changes approved this period

### RAG Status
Green: on track, no issues requiring attention.
Amber: at risk with mitigation plan — explain risk and fix.
Red: off track with no resolution — must be escalated.
Never mark amber or red without explanation.

## Escalation Procedure

### Levels
| Level | Trigger | Target | Response Time |
|---|---|---|---|
| L1: PM | Blocker >3 days, budget variance 5-10% | Sponsor | 1 business day |
| L2: Sponsor | Missed milestone, scope dispute, budget variance >10% | Executive | 1 business day |
| L3: Executive | Strategic risk, budget overrun >15%, SEV1 | C-suite | 4 hours |

### Format
Every escalation includes:
What happened (factual), impact (quantified in dollars/days/customers),
what has been done (actions taken), what is needed (specific ask),
who needs to decide (name and deadline).

### Triggers
Missed milestone >1 week, budget variance >10%,
new risk score >15, unresolved blocker >3 days,
security or compliance incident, stakeholder complaint.
Escalate as soon as trigger will be hit — never wait for threshold.

## Feedback Loops

### Monthly Survey
Rate 1-5 on timeliness, clarity, relevance, frequency.
Three open-ended: what's working, what's not, what's missing.
Keep to 5 questions max for higher completion rate.

### Quarterly Interviews
30-minute structured conversations with 5-7 questions.
Focus on relationship quality, information needs, expectations.
Document and share themes with project team.

### Pulse Checks
Post-decision: "Was communication around X clear and timely?"
One question after major decisions.
Declining satisfaction is a leading indicator of trouble.

### Close the Loop
Communicate changes made based on feedback.
"Last month you said X was unclear — we added Y."
Stakeholders who see actioned feedback provide more input.

## Key Points
Cadence and channel match stakeholder preference, not team preference.
Executives read status reports in 30 seconds — lead with the important part.
Escalation is not failure — not escalating is the failure.
Every meeting has published agenda and outcome notes.
Communication plan is a living document — review when stakeholders change.
Bad news does not improve with age — escalate immediately.
