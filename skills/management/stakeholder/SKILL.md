---
name: management-stakeholder
description: >
  Use this skill when the user says 'stakeholder management', 'stakeholder mapping', 'communication plan', 'RACI', 'influence matrix', 'status reporting', 'expectation management', 'stakeholder analysis', 'power influence grid', 'stakeholder engagement', 'escalation management', 'communication cadence', 'stakeholder matrix', 'stakeholder register', 'stakeholder personas'. This skill enforces: stakeholder mapping by power/influence and salience model, structured communication plans with defined cadence and channels per stakeholder group, RACI matrix for decision accountability, regular status reporting with RAG status and risk logs, escalation management with clear paths and triggers, proactive expectation setting with scope guardrails, feedback loops, and stakeholder persona creation. Do NOT use for: team communication (that is internal), project management scheduling (use create-roadmap), or organizational change management.
version: "1.1.0"
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

#### Engagement Strategy Decision Tree
```
Stakeholder identified
├── Power ≥ 4 AND Interest ≥ 4 → MANAGE CLOSELY
│   ├── Weekly 1:1, involve in steering committee
│   ├── Named relationship owner assigned
│   ├── Proactive risk and decision updates
│   └── Invite to demos and milestone reviews
├── Power ≥ 4 AND Interest < 4 → KEEP SATISFIED
│   ├── Monthly executive summary, milestone briefings
│   ├── One-page dashboards with RAG status
│   ├── Surface issues before they escalate
│   └── Engage at decision points only
├── Power < 4 AND Interest ≥ 4 → KEEP INFORMED
│   ├── Weekly newsletter or group email
│   ├── Bi-weekly demos and show-and-tell
│   ├── Respond to feedback within 24 hours
│   └── Leverage as quality feedback source
└── Power < 4 AND Interest < 4 → MONITOR
    ├── Quarterly newsletter or update
    ├── Check power/interest quarterly
    └── Reassess on org changes or milestones
```

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

#### Stakeholder Persona Template
```
Name: {individual or group}
Role: {relationship to project}
Power: {1-5}, Interest: {1-5}, Influence: {1-5}
Quadrant: {manage closely / keep satisfied / keep informed / monitor}
Communication preference: {channel, frequency, format}
Key concerns: {budget, timeline, quality, compliance, resources}
Resistance risk: {LOW / MED / HIGH} — {root cause}
Engagement approach: {1:1s, reports, demos, newsletters, workshops}
Escalation contact: {who to contact if this stakeholder escalates}
Triggers for re-engagement: {what prompts changing their level}
```

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

#### Communication Intensity by Phase
```
Phase          | Cadence        | Format                  | Participants
Kickoff        | Daily          | Kickoff deck, intros    | All stakeholders
Execution      | Per matrix     | Status reports, demos   | Per matrix
Go-live        | Daily + war room | Standup, briefings   | Core + executives
Close          | Weekly         | Final report, handoff   | Sponsor + client
Crisis/SEV     | Hourly         | War room, exec brief    | Core + C-suite
```

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

#### RACI Anti-Patterns
```
Over-Consulted: 7+ Cs on a decision → analysis paralysis
                Fix: limit Cs to 3 max per row, use Informed instead
No-Accountability: all R, no A → decisions never made
                Fix: assign exactly one A per decision
Ghost-Roles: roles in RACI but never engaged → RACI is fiction
                Fix: validate each role exists with real person
Static-RACI: created once at kickoff, never updated → always stale
                Fix: review at every phase transition + monthly
```

### Step 4: Design Status Reporting
Standard sections:
Period covered, accomplishments (measurable),
next period priorities, blockers with escalation,
key metrics versus targets, risks with PxI score,
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
Risk log: description, PxI score, owner, mitigation, status.

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

#### Escalation Flow Decision Tree
```
Issue detected
├── Can PM resolve within 3 days? → YES → Track, resolve, report
│   └── NO → Escalate to L1 (Sponsor)
│       ├── Can Sponsor resolve? → YES → Document decision
│       └── NO → Escalate to L2 (Executive)
│           ├── Can Executive resolve? → YES → Strategic decision
│           └── NO → Escalate to L3 (C-suite)
└── Is issue a SEV1 or strategic risk?
    └── YES → Skip levels, go direct to L3
```

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

#### Expectation Setting Checklist
- [ ] Project charter signed with explicit assumptions
- [ ] Out-of-scope items documented and agreed
- [ ] Change control process defined and communicated
- [ ] Tradeoff framing template prepared ("X costs Y in timeline")
- [ ] Delivery timeline with confidence range (not single date)
- [ ] Communication response SLAs defined
- [ ] Escalation path shared with all stakeholders
- [ ] Decision authority levels documented

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

### Step 8: Stakeholder Conflict Resolution

#### Conflict Resolution Decision Tree
```
Stakeholder conflict arises
├── Is it a misunderstanding? → Clarify facts, restate positions
├── Is it a priority disagreement? → Reference charter, escalate to shared goal
├── Is it a resource conflict? → Present tradeoffs, let sponsor decide
├── Is it a personality conflict? → Separate people from problem, mediate 1:1
└── Is it a values/principle conflict? → Document positions, escalate to executive
```

#### Conflict Resolution Pattern
1. Acknowledge: validate each party's perspective without taking sides.
2. Separate: distinguish positions (what they say) from interests (what they need).
3. Reframe: restate as shared problem: "How do we achieve X while addressing Y?"
4. Options: generate 2-3 alternatives with tradeoffs for each.
5. Commit: document agreement with owner and deadline.
6. Follow-up: check both parties accepted resolution within 1 week.

#### Negotiation Tactics for Stakeholders
```
Tactic            | Use When                    | Approach
BATNA awareness   | Stakeholder has leverage    | Know your best alternative if no deal
Anchoring         | Stakeholder makes 1st demand| Counter with data-backed position
Tradeoff matrix   | Multiple competing demands  | "If we do X, we cannot do Y — which matters more?"
Silence           | Stakeholder makes demand    | Pause, let them fill the silence with rationale
Timeout           | Conflict escalates          | "Let me research this and get back to you in 24 hours"
Shared principles | Values disagreement         | "We both want what's best for the customer — explore solutions from there"
```

### Step 9: Stakeholder Health Metrics

#### Stakeholder Health Dashboard
```
Metric                    | Target    | How to Measure
Satisfaction score        | ≥ 4.0/5  | Monthly survey
Response SLA adherence    | ≥ 95%    | Time to reply to stakeholder queries
Escalation response time  | < SLA    | Time from escalation to decision
RAG accuracy              | ≥ 90%    | Post-hoc validation of RAG against actual outcomes
Feedback closure rate     | ≥ 80%    | % of feedback items with communicated action
Stakeholder engagement    | ≥ 3.5/5  | Participation rate in meetings, surveys
Communication clarity     | ≥ 4.0/5  | Survey question: "Communication is clear"
Decision turnaround       | < 48 hr  | Time from decision request to RACI approval
Conflict resolution time  | < 5 days | Time from conflict report to resolution
```

#### Stakeholder Health Scorecard
```
Score: {metric score × weight} ÷ total weight

Weights:
Satisfaction: 25%
Response SLA: 20%
Clarity: 15%
Engagement: 15%
Feedback closure: 15%
Decision turnaround: 10%

Thresholds:
≥ 85: Healthy — maintain current approach
70-84: At risk — investigate weak areas
< 70: Unhealthy — restructure engagement plan
```

### Step 10: Virtual and Remote Stakeholder Management

#### Remote Engagement Best Practices
```
Challenge              | Solution
Low engagement on calls | Send materials 24h ahead, require camera-on
Time zone differences  | Rotate meeting times, use async-first for non-urgent
Missing body language  | Over-communicate reactions, ask for confirmation
Cultural differences   | Research communication norms, adapt style
Decision delays        | Set explicit async decision deadlines
Relationship building  | Schedule 1:1 coffee chats without agenda
Information asymmetry  | Single source of truth wiki, recorded meetings
```

## Anti-Patterns

### Anti-Pattern 1: One-Size-Fits-All Communication
Sending the same status report to all stakeholders regardless
of their quadrant. Executives get buried in detail; end users
are overwhelmed with budget data.
Fix: tailor format, depth, and channel per stakeholder group.

### Anti-Pattern 2: Stakeholder Map as a One-Time Exercise
Created at kickoff, never revisited. Stakeholder power and
interest change as the project evolves — the stale map misses
new influencers and misreads current dynamics.
Fix: review and update stakeholder map monthly.

### Anti-Pattern 3: RAG Status Optimism Bias
Reporting Green when risks are emerging. PMs avoid delivering
bad news, leading to surprise escalations. Stakeholders lose
trust when they discover hidden issues.
Fix: RAG must reflect current reality, not desired state.
Celebrate accurate Amber/Red reporting.

### Anti-Pattern 4: Escalation Hoarding
PM tries to resolve everything alone, escalating too late.
By the time issues reach sponsors, options are limited and
cost of delay is high.
Fix: escalate early with data. Escalation is coordination, not
failure. Set explicit triggers and escalate on threshold.

### Anti-Pattern 5: Feedback Loop Without Closure
Collecting stakeholder feedback but never communicating what
changed. Stakeholders stop providing input when they don't
see impact.
Fix: always close the loop — publish "You said, We did" summary
after every survey and interview cycle.

### Anti-Pattern 6: RACI with No Accountability
Decisions have multiple Responsible but no single Accountable.
Result: decisions stall, no one owns the outcome.
Fix: every RACI row must have exactly one A. Enforce in review.

### Anti-Pattern 7: Communication Black Hole
Stakeholders submit questions or requests and hear nothing until
the next scheduled meeting. Trust erodes quickly.
Fix: acknowledge within 4 hours with expected response time.
Even "I'm looking into this" counts.

### Anti-Pattern 8: Ignoring Low-Power Stakeholders
Focusing only on executives while end users and support teams
feel excluded. These stakeholders escalate to higher power, or
worse, actively work against the project.
Fix: minimum monthly touchpoint even for Monitor stakeholders.
Check their power hasn't changed.

## Stakeholder Maturity Model

### Level 1: Ad Hoc
No stakeholder map. Communication is reactive and inconsistent.
RACI doesn't exist. Escalations are fire drills.
No feedback collection. Stakeholders are frustrated.

### Level 2: Defined
Stakeholder map exists but may be stale. Communication matrix
defined but not always followed. RACI exists for major decisions.
Status reports go out on schedule. Basic escalation paths documented.

### Level 3: Managed
Stakeholder map reviewed monthly with fresh scores. Communication
plan actively managed with intensity adjustments per phase. RACI
reviewed quarterly with decision audits. Escalation triggers
monitored and enforced. Feedback loops active with closure reporting.

### Level 4: Optimized
Stakeholder health dashboard with trend analysis and leading
indicators. Predictive engagement — anticipating stakeholder
needs before they arise. RACI optimized for decision velocity.
Escalation data used to improve project governance. Satisfaction
scores consistently above 4.0/5.

## Key Metrics

| Metric | Target | Leading Indicator |
|--------|--------|-------------------|
| Stakeholder satisfaction | ≥ 4.0/5 | Feedback closure rate |
| Communication SLA adherence | ≥ 95% | Missed report deadlines |
| Escalation response time | Within SLA | Escalation frequency trend |
| RAG accuracy | ≥ 90% | Surprise escalations |
| Decision turnaround time | ≤ 48 hours | RACI clarity score |
| Engagement participation | ≥ 80% | Meeting attendance trend |
| Feedback loop closure | ≥ 80% | Open feedback items |

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
- Acknowledge stakeholder input within 4 hours
- Remap stakeholders on any org change or major milestone

## References
  - references/communication-plan.md — Communication Plan
  - references/stakeholder-advanced.md — Stakeholder Advanced Topics
  - references/stakeholder-fundamentals.md — Stakeholder Fundamentals
  - references/stakeholder-management.md — Stakeholder Management
  - references/stakeholder-mapping.md — Stakeholder Mapping
  - references/status-report-template.md — Status Report Template
## Handoff
`management/risk-management` for stakeholder-related risks
`planning/create-roadmap` for roadmap adjustments
