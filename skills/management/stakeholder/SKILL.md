---
name: management-stakeholder
description: >
  Use this skill when the user says 'stakeholder management', 'stakeholder mapping', 'communication plan', 'RACI', 'influence matrix', 'status reporting', 'expectation management', 'stakeholder analysis', 'power influence grid', 'stakeholder engagement', 'escalation management', 'communication cadence'. This skill enforces: stakeholder mapping by power and influence, structured communication plans with defined cadence and channels per stakeholder group, RACI matrix for decision accountability, regular status reporting with actionable content, escalation management with clear paths and triggers, and proactive expectation setting with scope guardrails. Do NOT use for: team communication (that is internal), project management scheduling (use create-roadmap), or organizational change management.
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
Develop a stakeholder management strategy that maps influence and interest, establishes clear communication cadences, assigns decision accountability via RACI, and proactively manages expectations through structured reporting and escalation paths.

## Agent Protocol

### Trigger
"stakeholder management", "stakeholder mapping", "communication plan", "RACI", "influence matrix", "status reporting", "expectation management", "stakeholder analysis", "power influence grid", "stakeholder engagement", "escalation management", "communication cadence", "stakeholder matrix", "stakeholder register".

### Input Context
- Project scope, goals, and timeline
- Organizational structure (teams, departments, leadership hierarchy)
- Key individuals and their roles relative to the project
- Previous stakeholder friction points or communication gaps
- Reporting requirements (executive, team, client, regulatory)
- Decision-making authority boundaries

### Output Artifact
Stakeholder management plan with mapping grid, communication matrix, RACI chart, reporting templates, and escalation procedures.

### Response Format
```
Stakeholder Plan: {project}
Stakeholders: {n}
├── High Power/High Interest: {names} — {manage closely}
├── High Power/Low Interest: {names} — {keep satisfied}
├── Low Power/High Interest: {names} — {keep informed}
└── Low Power/Low Interest: {names} — {monitor}
Communication: {daily/weekly/monthly} × {channel}
RACI: {n} decisions × {n} roles
Escalation: {n} levels with {triggers}
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Stakeholder map completed with power, influence, and interest scores
- [ ] Communication plan defined per stakeholder group (channel, cadence, content)
- [ ] RACI matrix created for key project decisions
- [ ] Status report template created with format and distribution list
- [ ] Escalation path defined with triggers and contact information
- [ ] Expectation management guidelines documented

### Max Response Length
400 lines

## Workflow

### Step 1: Identify and Map Stakeholders
List all individuals and groups affected by or able to affect the project. Score each on power (ability to influence project outcomes, 1-5) and interest (level of concern about project, 1-5). Plot on power/influence grid: high power + high interest = manage closely, high power + low interest = keep satisfied, low power + high interest = keep informed, low power + low interest = monitor. Create stakeholder personas: name, role, interests, communication preferences, potential resistance points.

### Step 2: Build Communication Plan
Per stakeholder group, define: communication channel (email, Slack, meetings, dashboard), cadence (daily standup, weekly status, monthly review, quarterly business review), content focus (blockers for dev team, metrics for execs, timelines for clients), and owner. Map to project phases — communication intensity should match project risk level (higher risk = more frequent communication).

### Step 3: Create RACI Matrix
For each key decision or deliverable, assign: Responsible (does the work), Accountable (makes the decision, one person only), Consulted (provides input before decision), Informed (notified after decision). Rule: only one Accountable per decision — shared accountability is no accountability. Use RACI to identify gaps: too many Rs and no one A means decisions stall; too many Cs means analysis paralysis.

### Step 4: Design Status Reporting
Standard status report sections: period, accomplishments, next period priorities, blockers (with escalation status), key metrics, risks (with risk score). Format: one-page executive summary with detailed appendix. Distribution: 24h before status meeting so stakeholders read before attending. RAG status: green (on track), amber (at risk with mitigation), red (off track with escalation).

### Step 5: Define Escalation Path
First escalation: stakeholder → project manager (unresolved blocker). Second: project manager → sponsor (resource conflict, scope issue). Third: sponsor → executive (strategic risk, budget overrun). Escalation triggers: missed milestone >1 week, budget variance >10%, new risk with score >15, unresolved blocker >3 days.

## Rules
- High-power stakeholders get a communication channel that matches their preference, not yours
- Every RACI decision must have exactly one Accountable — shared A means no one owns the decision
- Status reports must include RAG status with specific reasons, not just colors
- Escalation is not failure — waiting too long to escalate is a failure
- Stakeholder map is a living document — review and update monthly
- Bad news does not improve with age — escalate issues immediately on discovery
- Manage expectations below actual delivery — underpromise, overdeliver on communication

## References
- `references/stakeholder-mapping.md` — Power/influence grid methodology, salience model, RACI matrix construction, stakeholder persona creation, engagement strategy per quadrant
- `references/communication-plan.md` — Communication cadence design, channel selection guide, status report templates, escalation triggers and procedure, feedback loops and surveys

## Handoff
`management/risk-management` for stakeholder-related risks integrated into the risk register
`planning/create-roadmap` for stakeholder-driven roadmap adjustments and milestone communication
