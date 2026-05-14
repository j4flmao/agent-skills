# Communication Protocol Reference

## Meeting Cadence Templates

### Daily Standup

```
Time: 09:00 - 09:15
Format: Async-first (Slack/Discord thread), sync if blockers present

Each person posts:
- Yesterday: {what was completed}
- Today: {what will be worked on}
- Blockers: {anything blocking progress}

Sync standup called when: 3+ people have blockers
Rules:
- No problem-solving during standup (take it to separate channel/meeting)
- Updates posted by 10:00 for async days
- On-call person gives incident update if applicable
```

### Sprint Planning

```
Time: First day of sprint, 10:00 - 11:00
Attendees: Dev team + PM

Agenda:
1. Review sprint goal (5 min)
2. Capacity check (5 min): vacation, meetings, support duty
3. Story walkthrough (30 min): PM presents priority stories
4. Estimation (15 min): Team estimates using planning poker
5. Commitment (5 min): Team commits to sprint backlog

Ground rules:
- Stories must have acceptance criteria before planning
- Technical spikes estimated separately
- Buffer: 20% of capacity for unplanned work
```

### Sprint Review

```
Time: Last day of sprint, 14:00 - 14:30
Attendees: Dev team + PM + Stakeholders

Format:
- Demo working features (not slides)
- Metrics: velocity, completed vs planned, quality metrics
- Feedback from stakeholders
- No more than 5 min per demo

Rules:
- Only completed stories are demoed
- No scope discussion (that's for planning)
- Technical improvements not shown unless noticeable to users
```

### Retrospective

```
Time: Last day of sprint, 15:00 - 15:45
Attendees: Dev team only (no PM, no stakeholders)

Format:
1. What went well? (5 min silent brainstorm)
2. What could be improved? (5 min silent brainstorm)
3. Group and vote (10 min)
4. Action items for next sprint (10 min)
5. Appreciation round (5 min)

Rules:
- Blameless: focus on process, not people
- Action items must have an owner
- Max 3 action items per sprint
- Previous sprint action items reviewed first
```

## Async Communication Templates

### Decision Request

```
Subject: Decision needed: {topic}

Context:
{2-3 sentences describing the decision needed}

Options:
1. {option A}: {pros/cons}
2. {option B}: {pros/cons}
3. {option C}: {pros/cons}

Deadline: {date} @ {time}
Decision maker: {name}
```

### Status Update

```
Subject: Status: {project/feature} — {date}

Progress:
- {completed items}

Next:
- {next steps}

Blockers:
- {item} (needs: {help needed from whom})

Risks:
- {risk item} (probability: H/M/L, impact: H/M/L)
```

### Incident Report (Quick)

```
## Summary
{one sentence}

## Impact
{users affected, duration, revenue impact}

## Status
{investigating / mitigated / resolved}

## ETA
{expected resolution time if applicable}
```

## Team Communication Norms

### Slack / Discord Channels

| Channel | Purpose | Archive After |
|---|---|---|
| `#general` | Company-wide announcements | 30 days |
| `#team-dev` | Dev team discussions | 90 days |
| `#incidents` | Production issues | Permanent |
| `#pr-reviews` | PR review requests | 7 days |
| `#daily-standup` | Async standup updates | 14 days |
| `#random` | Non-work | 7 days |

### Response Time SLAs

| Message Type | Response Time | Expected Behavior |
|---|---|---|
| @mention urgent | 15 min | Acknowledge, act or escalate |
| PR review request | 4 business hours | Start review or delegate |
| Direct question | 2 business hours | Answer or "I'll get back to you" |
| Channel question | 4 business hours | If you know the answer, respond |
| Email | 24 business hours | Reply or acknowledge receipt |
| Incident alert | Immediate | See incident response protocol |

### Focus Time Rules

- "Do not disturb" blocks: 2 hours per day minimum (announced at standup)
- No meetings during focus blocks
- Slack status = 🎧 Focus mode for deep work
- Urgent matters only during focus time (production issues, P0/P1 only)

## Documentation Standards

### ADR (Architecture Decision Record)

```
# ADR-{number}: {title}

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
{what is the decision about? why is it needed?}

## Decision
{what was decided?}

## Consequences
{what are the trade-offs, implications}

## Alternatives Considered
{other options and why they were rejected}
```

### README Standard

Every repository must have:
```
# Project Name
One-line description

## Quick Start
- Prerequisites
- Installation
- Running locally

## Architecture
Brief description + link to architecture docs

## Development
- Commit convention
- Branch strategy
- Review process

## Deployment
- Environments
- Release process
- Rollback procedure
```
