---
name: management-stakeholder
description: >
  Use this skill when the user says 'stakeholder management', 'stakeholder mapping', 'communication plan', 'RACI', 'influence matrix', 'status reporting', 'expectation management', 'stakeholder analysis', 'power influence grid', 'stakeholder engagement', 'escalation management', 'communication cadence', 'stakeholder matrix', 'stakeholder register', 'stakeholder personas'. This skill enforces: stakeholder mapping by power/influence and salience model, structured communication plans with defined cadence and channels per stakeholder group, RACI matrix for decision accountability, regular status reporting with RAG status and risk logs, escalation management with clear paths and triggers, proactive expectation setting with scope guardrails, feedback loops, and stakeholder persona creation. Do NOT use for: team communication (that is internal), project management scheduling (use create-roadmap), or organizational change management.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, communication, phase-10]
---

# Stakeholder Management

## Purpose
Develop a stakeholder management strategy that maps influence
and interest (power/influence grid, salience model), establishes
clear communication cadences with per-group channels, assigns
decision accountability via RACI matrix, manages expectations
through structured reporting (status dashboards, highlight
reports, risk logs) and escalation paths, and builds feedback
loops for continuous improvement.

## Agent Protocol

### Trigger
"stakeholder management", "stakeholder mapping",
"communication plan", "RACI", "influence matrix",
"status reporting", "expectation management",
"stakeholder analysis", "power influence grid",
"stakeholder engagement", "escalation management",
"communication cadence", "stakeholder matrix",
"stakeholder register", "stakeholder personas",
"stakeholder communication", "RACI matrix".

### Input Context
- Project scope, goals, and timeline
- Organizational structure (teams, departments, leadership)
- Key individuals and their roles relative to project
- Previous stakeholder friction or communication gaps
- Reporting requirements (executive, team, client, regulatory)
- Decision-making authority boundaries
- Stakeholder sensitivity (regulatory, public visibility)

### Output Artifact
Stakeholder management plan with mapping grid,
communication matrix, RACI chart, reporting templates,
and escalation procedures.

### Response Format
```
Stakeholder Plan: {project}
Stakeholders: {n}
├── High Power/High Interest: {names} — manage closely
├── High Power/Low Interest: {names} — keep satisfied
├── Low Power/High Interest: {names} — keep informed
└── Low Power/Low Interest: {names} — monitor
Communication: {daily/weekly/monthly} × {channel}
RACI: {n} decisions × {n} roles
Escalation: {n} levels with {triggers}
```
No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Stakeholder map with power, influence, interest scores
- [ ] Communication plan per stakeholder group
- [ ] RACI matrix for key project decisions
- [ ] Status report template with format and distribution
- [ ] Escalation path defined with triggers and contacts
- [ ] Expectation management guidelines documented
- [ ] Feedback loops established (surveys, interviews, pulses)
- [ ] Stakeholder personas for key individuals

### Max Response Length
400 lines

## Workflow

### Step 1: Identify and Map Stakeholders
List all individuals and groups affected by or able to affect
the project. Include internal (team, leadership) and external
(clients, regulators, partners, vendors).

Score each on three dimensions:
Power: ability to influence outcomes (1-5).
Interest: level of concern about project (1-5).
Influence: ability to shape others' opinions (1-5).

Plot on power/influence grid:

High Power + High Interest = Manage Closely.
Frequent deep engagement, involve in decisions.
One-on-one meetings, invite to reviews.
Danger: they can block the project if neglected.
Examples: executive sponsor, key client.

High Power + Low Interest = Keep Satisfied.
Periodic engagement focused on outcomes.
Executive summaries, milestone updates.
Danger: lose interest, become blockers later.
Examples: C-suite not directly involved.

Low Power + High Interest = Keep Informed.
Regular updates with adequate detail.
Newsletters, group emails, demos.
Danger: escalate to higher power if excluded.
Examples: end users, SMEs, support teams.

Low Power + Low Interest = Monitor.
Minimal engagement. Quarterly newsletters.
Check periodically that status hasn't changed.
Danger: emerge as unexpected blockers.

Salience model: assess Power, Legitimacy, Urgency.
Stakeholders with 2+ attributes need active management.
All three attributes means definitive — prioritize.

Create persona for each key individual:
Name, role, scores, quadrant, communication preference,
key concerns, resistance risk, engagement approach.

### Step 2: Build Communication Plan
Per stakeholder group define:

Channel:
Meeting for decisions, alignment, conflict resolution.
Email for formal communication and records.
Slack for quick updates and informal coordination.
Dashboard for real-time metrics and status.
Document for detailed specs and plans.

Cadence:
Daily standup for the project team.
Weekly status for project team and client.
Biweekly steering committee.
Monthly executive sponsor.
Quarterly all hands for entire org.

Content focus:
Dev team: blockers and technical decisions.
Executives: metrics, milestones, and risks.
Clients: progress, demos, and timelines.
Engineering: architecture changes.

Owner: who is responsible for each communication.
Map intensity to project phase.
Higher risk phases need more frequent updates.

### Step 3: Create RACI Matrix
For each key decision assign:
Responsible: does the work (may be multiple).
Accountable: approves (exactly one per row).
Consulted: input before decision (two-way).
Informed: notified after decision (one-way).

Common decisions:
Scope change: Sponsor A, PM R.
Tech stack: Architect R, Tech Lead C.
Release date: Sponsor A, PM R.
Bug priority: PM A, Dev Lead R.
Vendor selection: Sponsor A, PM C, Procurement R.

Rules:
Exactly one Accountable per row.
Shared accountability means no accountability.
Too many Rs with no A means decisions stall.
Too many Cs means analysis paralysis.
Empty rows or columns mean missing coverage.
Review RACI at every project phase transition.

### Step 4: Design Status Reporting
Standard sections:
Period covered, accomplishments (measurable),
next period priorities, blockers with escalation,
key metrics versus targets, risks with P×I score,
changes to plan, decisions needed.

RAG status:
Green: on track, no issues requiring attention.
Amber: at risk with mitigation plan (explain risk and fix).
Red: off track with no resolution — must be escalated.
Never mark amber or red without specific explanation.

Format: one-page executive summary with detailed appendix.
Distribute 24 hours before status meeting.
Read before attending, not during.

Dashboard: real-time RAG, milestone progress,
budget burn, risk register, action items.

Highlight report: notable achievements, decisions needed.
Risk log: description, P×I score, owner, mitigation, status.

### Step 5: Define Escalation Path
L1 — Project Manager:
Trigger: blocker over 3 days, budget variance 5-10%.
Target: sponsor. Response: 1 business day.

L2 — Sponsor:
Trigger: missed milestone, scope dispute, budget over 10%.
Target: executive. Response: 1 business day.

L3 — Executive:
Trigger: strategic risk, budget overrun over 15%, SEV1.
Target: C-suite. Response: 4 hours.

Escalation format:
What happened (factual), impact (quantified),
what has been done, what is needed, who decides.

Triggers: missed milestone over 1 week, budget over 10%,
new risk score over 15, blocker over 3 days,
security incident, stakeholder complaint escalation.

### Step 6: Expectation Management
Set realistic timelines from the start.
Underpromise and overdeliver on communication.

Document assumptions and constraints in charter.
Frame tradeoffs explicitly: "Adding X delays Y by Z weeks."

Change log: requestor, date, impact assessment, decision.

Regular re-baselining:
Communicate updated forecast with clear reasons.

Scope guardrails:
In scope: clearly defined and agreed.
Out of scope: explicitly listed to prevent creep.
Change request: requires formal approval process.

Bad news does not improve with age.
Escalate issues immediately on discovery.

### Step 7: Feedback Loops
Monthly satisfaction survey:
Rate 1-5 on timeliness, clarity, relevance, frequency.
Three open-ended: what's working, what's not, what's missing.
Keep to 5 questions max for higher completion.

Quarterly stakeholder interviews:
30-minute structured conversations.
5-7 questions on relationship, information, expectations.
Document and share themes with the project team.

Post-decision pulse:
"Was communication around decision X clear and timely?"
One question after major decisions.
Declining satisfaction is a leading indicator.

Close the loop:
Communicate changes made based on feedback.
"Last month you said X was unclear — we added Y."
Actioned feedback encourages more participation.

## Rules
- High-power stakeholders get their preferred channel, not yours
- Every RACI has exactly one Accountable per decision
- Status reports include RAG with specific reasons
- Escalation is not failure — waiting too long is failure
- Stakeholder map is a living document — review monthly
- Bad news does not improve with age — escalate immediately
- Underpromise, overdeliver on communication
- Feedback loops must close — show what changed
- Every meeting has agenda and outcome notes

## References
- `references/stakeholder-mapping.md`
- `references/communication-plan.md`
- `references/status-report-template.md`
- `references/stakeholder-management.md`
  Cadence design, channel selection, status reports,
  escalation triggers, feedback loops, surveys

## Handoff
`management/risk-management` for stakeholder-related risks
`planning/create-roadmap` for roadmap adjustments
