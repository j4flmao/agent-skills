# Communication Plan

## Overview
A communication plan defines who communicates what to whom, through which channel, and at what cadence. It ensures stakeholders get the right information at the right level of detail.

## Cadence Design

| Stakeholder Group | Cadence | Channel | Content | Owner |
|---|---|---|---|---|
| Executive sponsors | Monthly | Slide deck + meeting | Budget, milestones, risks, strategic decisions | PM |
| Project team | Daily | Standup (15 min) | Blockers, progress, plan for day | Tech lead |
| Client stakeholders | Weekly | Email + optional call | Progress, demos, timeline, blockers | PM |
| Engineering | Weekly | Slack / email | Technical decisions, architecture changes | Tech lead |
| All hands | Quarterly | Town hall | Project status, wins, roadmap | Sponsor |

## Channel Selection Guidelines
- **Meetings**: for decisions, alignment, conflict resolution — always have an agenda
- **Email**: for formal communication, records, stakeholders who prefer async
- **Slack/Teams**: for quick updates, questions, informal coordination
- **Dashboard**: for real-time metrics, RAG status, always-available reference
- **Document**: for detailed specs, plans, reports — link to in other channels

## Status Report Template

### Executive Summary (1 Page)
```
Project: {name}
Period: {dates}
Overall Status: {GREEN / AMBER / RED}

Accomplishments:
- {what was completed this period}

Next Period Priorities:
- {what will be done next}

Blockers (with escalation status):
- {blocker} — escalated to {owner} on {date}

Key Metrics:
- {metric}: {value} vs target {target}

Risks (score > 10):
- {risk} — score {PxI}, owner: {name}
```

## Escalation Procedure

| Level | Trigger | Target | Response Time |
|---|---|---|---|
| L1: PM | Blocker >3 days, budget variance 5-10% | Sponsor | 1 business day |
| L2: Sponsor | Missed milestone, scope dispute, budget variance >10% | Executive | 1 business day |
| L3: Executive | Strategic risk, budget overrun >15%, SEV1 incident | C-suite | 4 hours |

Escalation should include: what happened, impact, what has been done, what is needed, who needs to decide.

## Feedback Loops
- Monthly stakeholder satisfaction survey (1-5 rating, 3 open-ended questions)
- Quarterly stakeholder interviews (30 min, structured questions)
- Post-decision pulse check: "Was the communication around decision X clear and timely?"
- Use feedback to adjust plan — escalating dissatisfaction is a leading indicator

## Key Points
- Cadence and channel must match stakeholder preference, not project team preference
- Status reports are read by executives in 30 seconds — put the most important thing first
- Escalation is not failure — not escalating is the failure
- Every meeting should have a published agenda and outcome notes
- Communication plan is a living document — review and update when stakeholders change
