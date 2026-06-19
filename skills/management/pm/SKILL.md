---
name: pm
description: >
  Use this skill when the user says 'project management', 'sprint planning',
  'estimate', 'story points', 't-shirt sizing', 'risk register', 'stakeholder',
  'status report', 'blocker', 'retrospective', 'velocity', 'burndown', 'capacity
  planning', or needs project management guidance. Covers: agile ceremonies,
  estimation techniques, risk management, stakeholder communication, and status
  reporting. Do NOT use for: writing technical specs, coding, testing, or
  requirements analysis (use ba).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, pm, process]
---

# Project Management

## Purpose
Provide structured project management workflows covering agile ceremonies, estimation, risk management, stakeholder communication, and status reporting.

## Agent Protocol

### Trigger
Exact user phrases: "project management", "sprint planning", "estimate", "story points", "t-shirt sizing", "risk register", "stakeholder", "status report", "blocker", "retrospective", "velocity", "burndown", "capacity planning", "sprint retrospective", "daily standup", "backlog grooming", "sprint review".

### Input Context
Before activating, verify:
- The project context is known (team size, sprint length, methodology).
- The current sprint/iteration state is available (backlog, in-progress, done).
- The specific need is clear: planning, estimation, risk, or reporting.

### Output Artifact
No file output. This skill produces text guidance, templates, or structured plans.

### Response Format
Answer in the format matching the request:
- **Sprint Plan**: Sprint goal + committed stories + capacity.
- **Estimation**: Story points or t-shirt size with justification.
- **Risk Register**: Risk + likelihood + impact + mitigation.
- **Status Report**: What was done + what's blocked + what's next.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
This skill is complete when:
- [ ] The user's request is addressed with a concrete output (plan, estimate, register, report).
- [ ] Risk items include both impact and mitigation.
- [ ] Estimations include confidence level or range.

### Max Response Length
Sprint plan: 20 lines. Risk register: 15 lines. Status report: 10 lines.

## Workflow

### Step 1: Sprint Planning
Given sprint length (default 2 weeks) and team capacity:

1. Calculate capacity:
   - Team members sprint days hours/day focus factor (0.6-0.8)
   - Subtract ceremonies, PTO, support rotation
2. Select backlog items by priority:
   - Top stories that fit within capacity
   - Include buffer for unknowns (15-20%)
3. Break down stories into tasks with hourly estimates
4. Define sprint goal (one sentence)
5. Identify risks specific to this sprint

```
Sprint Goal: {one sentence}
Capacity: {n} story points / {n} hours
Committed: STORY-1, STORY-2, STORY-3
Buffer: {n} points for unknowns
Risks: {list}
```

### Step 2: Estimation

| Technique | When | Output |
|---|---|---|
| Planning Poker | Story-level, team consensus | Fibonacci (1,2,3,5,8,13,21) |
| T-shirt Sizing | Epic-level, quick triage | XS, S, M, L, XL, XXL |
| Three-Point | Task-level, high accuracy | Optimistic + Most Likely + Pessimistic |
| Affinity Mapping | Large backlog, batch | Relative sizing by comparison |

```
Story: STORY-42 (User login with MFA)
Estimate: 5 points
Confidence: Medium (MFA integration is new)
Breakdown:
  - Backend: JWT + TOTP validation (2d)
  - Frontend: MFA setup flow (1d)
  - Tests: Unit + integration + E2E (1d)
  - Buffer (1d)
```

### Step 3: Risk Management

```
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Third-party API rate limit | High | High | Implement caching + fallback | Dev lead |
| Team member PTO mid-sprint | Medium | Medium | Cross-train on critical paths | PM |
| Performance regression | Low | High | Benchmark gate in CI | QA lead |
```

### Step 4: Status Report
```
## Sprint {n} Status
Period: YYYY-MM-DD to YYYY-MM-DD
Velocity: {n} / {n} points (on track / at risk / behind)

### Done
- STORY-42: User login with MFA
- STORY-43: Password reset flow

### In Progress
- STORY-44: Dashboard widgets (50%, blocked)

### Blocked
- STORY-44: Waiting on design review
  - Unblock plan: Escalate to design lead by EOD

### Next
- STORY-45: Export to PDF
- STORY-46: Audit log viewer
```

### Step 5: Retrospective
1. What went well? (keep doing)
2. What went wrong? (stop doing)
3. What to improve? (start doing)
4. Action items with owners and deadlines

```
## Sprint {n} Retro
### Keep Doing
- Daily standups are focused and under 15min
- PR reviews completed within 4h
### Stop Doing
- Committing stories without proper acceptance criteria
- Last-minute scope changes mid-sprint
### Start Doing
- Write acceptance criteria before development
- Add QA review column to board
### Action Items
- [ ] Define acceptance criteria template (BA lead, by Wed)
- [ ] Configure board with QA review column (PM, by Fri)
```

### Step 6: Dependency Management
Identify and track dependencies between teams, systems, and external parties. Categorize each dependency: hard (blocking — must be resolved before work can proceed), soft (sequential — Team A must finish before Team B starts), informational (need to know, not blocking). For each dependency: assign an owner, define the deliverable and due date, track status weekly at Scrum of Scrums. Escalate unresolved dependencies immediately.

### Step 7: Stakeholder Communication Plan
Define per-stakeholder communication: frequency (daily/weekly/monthly), format (email/Slack/dashboard/meeting), content focus (technical details for dev team, metrics for executives, progress for clients), and owner. Map communication intensity to project phase (more frequent during high-risk periods). Maintain a distribution list and calendar of communications.

### Step 8: Capacity Planning Across Sprints
Use historical velocity to forecast future capacity. Calculate the rolling average of the last 3-5 sprints. Apply focus factor adjustments for known leaves and ceremonies. Maintain a capacity calendar showing planned vs available person-days per sprint. Use this data during sprint planning to set realistic commitments.

### Step 9: Project Health Dashboard
Define and track key project health indicators: schedule (planned vs actual milestone dates), budget (planned vs actual spend), quality (defect metrics, test coverage), risk (open risk count and score), team health (squad health check, turnover rate). Display on a single dashboard visible to all stakeholders. Update weekly. Flag items in red immediately.

### Step 10: Escalation and Issue Resolution
Define escalation path for different issue types: technical (architect -> engineering manager -> CTO), schedule (PM -> sponsor -> executive), resource (PM -> department head -> HR), external (PM -> legal -> executive). For each escalation, document the trigger condition, the responsible person at each level, the target response time, and the escalation format (what happened, impact, proposed resolution).

## Agile at Scale Frameworks

### Framework Selection

```yaml
agile_at_scale:
  team_of_teams:
    structure: "2-5 teams, each with own Scrum, weekly sync between leads"
    ceremonies: "Weekly Scrum of Scrums, cross-team backlog refinement, joint review"
    best_for: "15-50 engineers, single product, moderate cross-team dependencies"

  scaled_agile_framework:
    structure: "ART — 5-12 teams, 8-12 week PI cadence"
    ceremonies: "PI Planning every 8-12 weeks, system demo, Inspect and Adapt"
    best_for: "50-200 engineers, multiple products, enterprise compliance"
    trade_offs: "Heavy process overhead, requires dedicated RTE"

  lean_agile:
    structure: "Value stream teams with end-to-end ownership"
    practices: "Kanban with WIP limits, SLAs, flow metrics"
    best_for: "Maintenance-heavy work, operations teams, continuous delivery"

  shape_up:
    structure: "6-week cycles / 2-week cooldown"
    practices: "Pitch documents, vertical slicing, no daily standups"
    best_for: "Small teams (3-8), product-focused, high autonomy"
```

### Estimation Framework Decision Tree

```yaml
estimation_framework:
  question_1_precision_needed:
    "Do you need high precision (budgeting, contractual)?":
      yes: "Three-point estimation (PERT)"
      no:
        question_2_artifact_level:
          "What level are you estimating?":
            epic: "T-shirt sizing (XS-XXL) or affinity mapping"
            story: "Planning Poker with Fibonacci sequence"
            task: "Hours or half-days"

  question_3_team_familiarity:
    "Is the team familiar with the work domain?":
      yes: "Relative estimation (story points)"
      no: "T-shirt sizing with wide ranges"

  question_4_audience:
    "Who needs the estimate?":
      leadership: "T-shirt sizing + quarter-level ranges"
      product: "Story points for prioritization"
      engineering: "Hours for sprint capacity"
```

### Delivery Risk Management

```yaml
delivery_risk:
  risk_categories:
    technical:
      - "Integration complexity with existing systems"
      - "Performance/scaling unknowns"
      - "Data migration complexity"
      - "Third-party API limitations"
    process:
      - "Unclear requirements or acceptance criteria"
      - "Dependency on external teams"
      - "Stakeholder availability for feedback"
    resource:
      - "Team member availability (PTO, turnover, sickness)"
      - "Skill gaps in critical areas"
    external:
      - "Regulatory changes mid-project"
      - "Vendor or partner delays"

  risk_response_strategies:
    mitigate: "Reduce likelihood or impact"
    avoid: "Change approach to eliminate risk"
    transfer: "Shift risk to third party"
    accept: "Acknowledge and monitor"
```

## Common Pitfalls

1. **Estimates treated as deadlines**: Estimates are ranges, not promises. Never treat estimates as deadlines.
2. **No buffer in planning**: Teams commit to 100% capacity leaving no room for unknowns. Always include 15-20% buffer.
3. **Velocity as performance metric**: Velocity is a planning tool, not a performance metric. Never use it to evaluate individuals.
4. **Status reports without actions**: Reports that state facts but don't flag issues or propose solutions.
5. **Stakeholders not identified early**: Missing stakeholders cause late-stage surprises.
6. **No dependency tracking**: Dependencies are discovered mid-sprint causing delays.
7. **Sprint goal forgotten**: Team completes stories but loses sight of the sprint objective.
8. **Scope creep mid-sprint**: Adding work after sprint commitment without adjusting scope.
9. **Risk register not updated**: Risks created at project start and never reviewed again.
10. **One-size-fits-all communication**: Same status update for dev team, executives, and clients.

## Best Practices

- Estimates are ranges, not promises — never treat estimates as deadlines
- Velocity is a planning tool, not a performance metric
- Every risk must have both a likelihood AND an impact rating
- Status reports must include blockers with unblock plans
- Retrospectives produce action items with owners
- Sprint goal must be achievable within the sprint
- Choose agile-at-scale framework based on team count and dependency complexity
- Estimation precision should match the audience
- Risk register must be reviewed at least every sprint planning
- Communicate bad news immediately, do not wait for the next status report

## Compared With

| Approach | Strengths | Weaknesses |
|---|---|---|
| Waterfall PM | Clear phases, predictable, documented | Rigid, late feedback |
| Agile PM (this skill) | Adaptive, fast feedback, iterative | Requires stakeholder availability |
| PRINCE2 | Governance, roles, controlled | Heavy process |
| Critical Path Method | Schedule optimization | Requires detailed task breakdown |
| Lean PM | Waste reduction, value focus | Less structure for planning |
| Extreme PM | High uncertainty projects | Chaotic for stable projects |

## Templates and Tools

### Capacity Planning Template
```
Sprint: {n} | Start: {date} | End: {date}
Team Members: {n} | Working Days: {n}
Total Capacity: {n} hours
  - Ceremonies: {n} hours ({n}%)
  - Support: {n} hours ({n}%)
  - PTO: {n} hours ({n}%)
  - Available: {n} hours ({n}%)
Focus Factor: {n}%
Effective Capacity: {n} points (at {n} points/person-sprint)
```

### Dependency Tracking Template
```
ID | Type | Description | Depends On | Owner | Due Date | Status
D-01 | Hard | Auth service API | Team Auth | Alice | Sprint 5 | On track
D-02 | Soft | Design system components | Team Design | Bob | Sprint 6 | At risk
D-03 | Info | Migration timeline | Ops | Carol | Sprint 7 | Not started
```

## Rules
- Estimates are ranges, not promises — never treat estimates as deadlines
- Velocity is a planning tool, not a performance metric
- Every risk must have both a likelihood AND an impact rating
- Status reports must include blockers with unblock plans
- Retrospectives produce action items with owners
- Sprint goal must be achievable within the sprint — not aspirational
- Choose agile-at-scale framework based on team count and dependency complexity
- Estimation precision should match the audience
- Risk register must be reviewed at least every sprint planning
- Communicate bad news immediately, do not wait for the next status report
- Dependencies must be tracked and assigned owners
- Stakeholder communication must be tailored per group
- Capacity planning must account for ceremonies, support, and PTO
- Sprint buffer of 15-20% for unknowns is mandatory

## Estimation Techniques — Deep Dive

### Planning Poker — Detailed Protocol
```
When: Sprint planning, backlog refinement
Duration: 30-60 min (depending on item count)
Scale: Modified Fibonacci (1, 2, 3, 5, 8, 13, 21) or T-shirt sizes (XS, S, M, L, XL)

Process:
1. PO presents backlog item with acceptance criteria
2. Team discusses the item (2-5 min per item)
3. Each member privately selects a card/estimate
4. All cards revealed simultaneously
5. If consensus (all within 1-2 values), proceed
6. If wide disparity, high and low estimators explain reasoning
7. Discuss and re-vote (max 2 rounds per item)
8. Record final estimate after consensus or majority

Facilitation rules:
  - No anchoring — don't state estimates before voting
  - Discuss assumptions uncovered during voting
  - Items estimated > 13 must be split
  - Timebox at 5 min per item — unknowns go to spike
```

### Affinity Estimation — Detailed Protocol
```
When: Large backlog, multiple teams, need speed
Scale: T-shirt sizes (XS, S, M, L, XL) or numeric buckets

Process:
1. Items are written on cards (one per card)
2. Without talking, team members place cards into size buckets on a wall
3. When someone moves a card, they can discuss: "I think this is L not XL because..."
4. Continue until all cards are placed
5. Review each bucket for consistency (30 sec per bucket)
6. Convert T-shirt sizes to points using a conversion chart

Conversion:
  XS = 1, S = 2, M = 3, L = 5, XL = 8, XXL = 13 (must split)

Best for: Backlog prioritization, initial sizing of 50+ items in < 1 hour.
```

### Three-Point Estimation — Detailed Protocol
```
When: High uncertainty, complex deliverables, need confidence intervals
Scale: Hours or days (not story points)

Process per item:
  Optimistic (O): Best case — everything goes right
  Most Likely (M): Normal case — typical blockers
  Pessimistic (P): Worst case — everything goes wrong

Expected (E) = (O + 4M + P) / 6
Standard Deviation (SD) = (P - O) / 6

Confidence intervals:
  P50: E ± 0.67 × SD
  P80: E ± 1.28 × SD (recommended for commitment)
  P95: E ± 1.96 × SD (for high-certainty critical path items)

Example:
  O = 2 days, M = 5 days, P = 14 days
  E = (2 + 20 + 14) / 6 = 6 days
  SD = (14 - 2) / 6 = 2 days
  P80 = 6 + 1.28(2) = 8.6 days (use for commitment)
```

### Bucket Estimation — Detailed Protocol
```
When: Cross-team estimation, 20-50 items, 60 min
Team size: 6-10 people

Process:
1. Create buckets with point values: 1, 2, 3, 5, 8, 13, 20
2. Place a reference item in each bucket (known-sized items)
3. Distribute cards among team (each person gets 2-3 unknowns)
4. Round 1: Each person places their items in the appropriate bucket (silent)
5. Round 2: Group review — if a card has multiple votes in different buckets, discuss
6. Round 3: Adjustments based on discussion
7. Record all final bucket assignments

Best for: Rapid sizing of features where absolute precision is unnecessary.
```

## Status Report Templates

### Daily Standup Report
```
Team: {name} | Date: {date}

Since last standup:
  ✅ {completed item}
  ✅ {completed item}

Next steps:
  🔄 {next work item}
  🔄 {next work item}

Blockers:
  🚫 {blocker description} → Unblock plan: {action} | Owner: {name} | By: {date/time}

Metrics snapshot:
  Sprint remaining: {n} days
  Sprint velocity: {n} pts / {n} pts committed
  Blocked count: {n}
```

### Weekly Status Report (for Stakeholders)
```
## Weekly Status: {Project/Team Name}
Week Ending: {date} | Sprint {n} of {n}

### Health
Overall: {Green | Yellow | Red}
Schedule: {G/Y/R} | Quality: {G/Y/R} | Budget: {G/Y/R} | Risks: {G/Y/R}

### Accomplishments This Week
1. {deliverable} — {team}
2. {deliverable} — {team}
3. {deliverable} — {team}

### Next Week Commitments
1. {deliverable} — {team}
2. {deliverable} — {team}
3. {deliverable} — {team}

### Blockers & Risks
| ID | Description | Impact | Owner | Status |
|----|-------------|--------|-------|--------|
| B-1 | {description} | {schedule/cost/quality} | {name} | {open/resolved} |
| R-1 | {risk description} | P:{n}, I:{n} → Score: {n} | {name} | {open/mitigated} |

### Metrics
- Velocity (last 3 sprints): {pts}, {pts}, {pts}
- Throughput: {n} items/week
- Cycle time (P50/P95): {n}/{n} days
- Escaped defects: {n}

### Decisions Needed
- {decision to make} — Deadline: {date} — By: {owner}
- {decision to make} — Deadline: {date} — By: {owner}
```

### Executive Status Report (1-page)
```
## Executive Highlight: {Project Name}
Date: {date} | Phase: {phase name}

### Overall Status: {G/Y/R}
{One-sentence summary of project health}

### Key Milestones
| Milestone | Due | Status | Confidence |
|-----------|-----|--------|------------|
| {milestone} | {date} | {completed/on track/at risk/delayed} | {High/Med/Low} |
| {milestone} | {date} | {completed/on track/at risk/delayed} | {High/Med/Low} |

### Top 3 Risks
1. {risk} — {impact if not addressed}
2. {risk} — {impact if not addressed}
3. {risk} — {impact if not addressed}

### Budget Status
Spent to date: ${n} of ${n} budget ({n}%)
Forecast at completion: ${n}

### Escalations
{n} items requiring executive attention
```

## Retrospective Action Item Tracking Template

```
Sprint: {n} | Date: {date} | Retro Format: {format}

# | Action Item | Owner | Due Date | Success Criteria | Status
1 | {action} | {name} | {date} | {measurable outcome} | {Not started/In progress/Done/Verified}
2 | {action} | {name} | {date} | {measurable outcome} | {Not started/In progress/Done/Verified}
3 | {action} | {name} | {date} | {measurable outcome} | {Not started/In progress/Done/Verified}

Review at next retro:
- {n}/{n} actions completed
- {n}/{n} actions had measurable impact
- {n} actions carried over from previous sprint
```

## Dependency Management Playbook

```
Dependency Type Definitions:
  Hard: Team A cannot start/finish until Team B delivers
  Soft: Team A could work around it but with significant cost
  Information: Team A needs decision/guidance from Team B

Dependency Resolution Strategies:
  Hard: Negotiate scope, adjust timeline, provide shared resources
  Soft: Evaluate workaround cost; negotiate preference
  Information: Set decision deadline; escalate if missed

Dependency Tracking Matrix:
| ID | Type | Description | Source Team | Target Team | Due | Owner | Status |
|----|------|-------------|-------------|-------------|-----|-------|--------|
| D01 | Hard | Auth API | FE Team | BE Team | Sprint 5 | Alice | On track |

Dependency Health Check:
  - % of hard dependencies met on time
  - Dependency lead time (from identification to resolution)
  - Number of dependencies added mid-sprint
```

## References
  - references/ceremony-guide.md — Agile Ceremony Guide
  - references/estimation-guide.md — Estimation Guide
  - references/estimation-techniques.md — Estimation Techniques
  - references/pm-advanced.md — Pm Advanced Topics
  - references/pm-fundamentals.md — Pm Fundamentals
  - references/risk-register-template.md — Risk Register Template

## Handoff
After completing this skill:
- Next skill: **ba** — to elaborate requirements for planned stories
- Pass context: sprint plan, estimated stories, risk register, team capacity
