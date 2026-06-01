# Stakeholder Fundamentals

## Overview
Stakeholder management identifies, maps, and engages individuals and groups who can affect or be affected by a project. This reference covers fundamental concepts, stakeholder analysis techniques, communication planning, and engagement strategies.

## Core Concepts

### Concept 1: Who is a Stakeholder?
Anyone who can affect, is affected by, or perceives themselves to be affected by a project decision or activity.

**Internal stakeholders**: executive sponsor, project team, department heads, legal, finance, HR, compliance.
**External stakeholders**: clients, end users, partners, vendors, regulators, industry bodies, community groups.

Stakeholders are not static — new ones emerge, existing ones change power or interest. Reevaluate at every project phase.

### Concept 2: Stakeholder Analysis Dimensions

**Power**: ability to influence project outcomes, allocate resources, enforce decisions. Score 1-5.
**Interest**: level of concern about project activities and outcomes. Score 1-5.
**Influence**: ability to shape opinions of other stakeholders. Score 1-5.
**Legitimacy**: socially accepted relationship to the project.
**Urgency**: need for immediate attention or response.

Salience model: stakeholders with 2+ of Power, Legitimacy, Urgency need active management. All 3 = definitive priority.

### Concept 3: Power/Interest Grid

Four quadrants with distinct engagement strategies:

**Manage Closely** (High Power + High Interest): frequent deep engagement, involve in decisions, one-on-one meetings. Danger: can block project if neglected.

**Keep Satisfied** (High Power + Low Interest): outcome-focused, executive summaries, milestone updates. Danger: become blockers if they lose interest.

**Keep Informed** (Low Power + High Interest): regular updates, demos, newsletters. Danger: escalate concerns to higher power if excluded.

**Monitor** (Low Power + Low Interest): minimal engagement, quarterly check. Danger: emerge as unexpected blockers when circumstances change.

### Concept 4: Stakeholder Register

The single source of truth for all stakeholder data:

```
ID  | Name | Role | Organization | Category | Power | Interest | Influence | Quadrant | Contact | Notes
S01 | Alice| Sponsor | Exec | Internal | 5 | 5 | 4 | Manage Closely | alice@co.com | Budget owner
```

Register fields: ID, Name, Role, Organization, Category (Internal/External), Power, Interest, Influence, Quadrant, Communication Preference, Key Concerns, Resistance Risk, Engagement Approach, Contact, Notes.

### Concept 5: Communication Plan Fundamentals

Define for each stakeholder or group:
- **Channel**: meeting, email, Slack, dashboard, document
- **Cadence**: daily, weekly, biweekly, monthly, quarterly
- **Content focus**: decisions, metrics, blockers, demos, strategy
- **Owner**: who is responsible for delivering

Channel should match stakeholder preference, not team convenience. Executive sponsors get executive summaries on their schedule. Dev teams get daily standups.

### Concept 6: RACI Matrix

Decision accountability framework:
- **R**esponsible: does the work (may be multiple)
- **A**ccountable: approves (exactly one per row)
- **C**onsulted: input before decision (two-way)
- **I**nformed: notified after decision (one-way)

Rules: exactly one A per decision. Too many Cs causes analysis paralysis. Too many Rs with no A means decisions stall.

### Concept 7: Status Reporting Basics

RAG status definitions:
- **Green**: on track, no issues requiring attention
- **Amber**: at risk with mitigation plan — explain risk and fix
- **Red**: off track with no resolution — must be escalated

Standard report sections: accomplishments, next priorities, blockers, key metrics vs targets, risks with PxI score, decisions needed, changes to plan.

### Concept 8: Escalation Paths

Three levels of escalation:
- **L1 — PM**: blocker > 3 days, budget variance 5-10%. Target: sponsor. Response: 1 business day.
- **L2 — Sponsor**: missed milestone, scope dispute. Target: executive. Response: 1 business day.
- **L3 — Executive**: strategic risk, SEV1. Target: C-suite. Response: 4 hours.

Every escalation includes: what happened (factual), impact (quantified), what has been done, what is needed, who decides.

### Concept 9: Stakeholder Persona

Stakeholder persona template:
```
Name: {individual or group}
Role: {relationship to project}
Scores: Power {1-5}, Interest {1-5}, Influence {1-5}
Quadrant: {quadrant}
Communication preference: {channel, format, frequency}
Key concerns: {budget, timeline, quality, compliance}
Resistance risk: {LOW/MED/HIGH} — {why they might resist}
Engagement approach: {1:1s, reports, demos, newsletters}
Triggers for re-engagement: {what changes their needs}
```

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Map Early | Identify stakeholders before kickoff | High |
| Remap Monthly | Power and interest change — keep fresh | High |
| Named Owners | Every key stakeholder has a relationship owner | High |
| Preferred Channel | Stakeholder's preference, not yours | High |
| RAG with Reason | Never mark Amber/Red without explanation | High |
| Escalate Early | Bad news doesn't improve with age | High |
| Close the Loop | Show feedback → action to encourage more input | Medium |

## Common Pitfalls

### Pitfall 1: Stakeholder Map as One-Time Exercise
Created at kickoff, never reviewed. Stakeholder dynamics change as project evolves. Stale map leads to misaligned engagement.
Fix: review and update stakeholder map monthly. Check after org changes, phase transitions, and major decisions.

### Pitfall 2: One-Size-Fits-All Communication
Same status report to all stakeholders. Executives get buried in detail, end users get overwhelmed with budget data.
Fix: tailor format, depth, and channel per stakeholder group. Executive summary for executives, details in appendix.

### Pitfall 3: Neglecting Low-Power Stakeholders
Focusing only on executives while end users feel excluded. Low-power stakeholders can escalate to higher power or work against the project.
Fix: minimum monthly touchpoint even for Monitor quadrant. Check their power hasn't increased.

### Pitfall 4: RAG Optimism Bias
Reporting Green when risks are emerging. PM fears delivering bad news. Stakeholders lose trust when hidden issues surface.
Fix: RAG reflects current reality. Celebrate accurate Amber/Red reporting. Bad news early = more options.

### Pitfall 5: Escalation Hoarding
PM tries to resolve everything alone. By the time issues reach sponsors, options are limited.
Fix: escalate early with data. Escalation is coordination, not failure. Set explicit triggers.

## Tooling Ecosystem

### Stakeholder Tools
- Stakeholder register spreadsheets: simple, universal
- Miro / Mural: visual power/interest grid
- Jira: stakeholder tracking with custom fields
- Smartsheet: collaborative register with sharing
- Notion: stakeholder wiki with personas

### Communication Tools
- Email: formal communication and records
- Slack / Teams: quick updates, coordination
- Zoom / Meet: video calls, demos
- Notion / Confluence: documentation hub
- Geckoboard / Tableau: dashboard metrics

## Key Points
- Stakeholder management is proactive, not reactive
- Power, interest, and influence change — remap monthly
- Every stakeholder has a preferred channel — use it
- Underpromise, overdeliver on communication
- RACI must have exactly one Accountable per decision
- Escalation early is good; waiting too long is failure
- Feedback loops need closure — show what changed
- Stakeholder personas make engagement tangible
- Bad news does not improve with age — escalate immediately
- Stakeholder map is a living document, not a one-time exercise
