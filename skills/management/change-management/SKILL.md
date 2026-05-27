---
name: management-change-management
description: >
  Use this skill when managing organizational change: ADKAR, Kotter 8-Step, stakeholder impact analysis, adoption metrics.
  This skill enforces: ADKAR assessment per stakeholder, Kotter 8-Step framework, stakeholder mapping, adoption measurement.
  Do NOT use for: project management, team communication, agile transformation, culture initiatives without defined scope.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, change-management, phase-10]
---

# Change Management Agent

## Purpose
Drives organizational change using ADKAR, Kotter 8-Step, and stakeholder impact analysis frameworks with measurable adoption outcomes.

## Agent Protocol

### Trigger
Exact user phrases: change management, ADKAR, Kotter, organizational change, adoption, change readiness, stakeholder impact, resistance, transformation, culture change.

### Input Context
- What is the change being introduced (process, tool, structure, strategy)?
- Who is affected and what is the scope?
- What is the timeline and who is sponsoring the change?
- What is the current state and desired future state?
- What resistance is anticipated or observed?

### Output Artifact
Change management plan with ADKAR assessment, Kotter 8-Step timeline, stakeholder impact analysis, and adoption metrics framework.

### Response Format
```
## Change Management Plan
### Change: {name}
ADKAR Assessment: A={score}/5 | D={score}/5 | K={score}/5 | A={score}/5 | R={score}/5
### Stakeholder Impact
High Impact + Low Readiness: {groups} — focus change effort
High Impact + High Readiness: {groups} — leverage as champions
### Adoption Target
Adoption Rate: {target}% by {date} | Proficiency: {target}%
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Change defined with current state, future state, and rationale
- [ ] ADKAR assessment completed per stakeholder group
- [ ] Kotter 8-Step timeline created with action items
- [ ] Stakeholder impact analysis with power/interest grid
- [ ] Change readiness assessment per stakeholder
- [ ] Resistance management strategies documented
- [ ] Communication plan per stakeholder group
- [ ] Training needs assessment and plan created
- [ ] Adoption metrics defined with targets and measurement method

### Max Response Length
7000 tokens

## Workflow

### Step 1: Change Definition
Define the change clearly: what is changing, what is staying the same, and what is the rationale. Document current state (how things work today), future state (how things will work after change), and the gap between them. Identify the sponsor (who has authority to make the change stick). Quantify the benefit of making the change and the cost of not making it.

### Step 2: ADKAR Assessment
Assess each stakeholder group on five ADKAR elements. Awareness: Do they understand why the change is needed? (score 1-5). Desire: Do they want to participate and support the change? (score 1-5). Knowledge: Do they know how to change? (score 1-5). Ability: Can they implement the change day-to-day? (score 1-5). Reinforcement: Are there mechanisms to sustain the change? (score 1-5). Scores below 3 indicate a gap that needs intervention.

### Step 3: Kotter 8-Step Plan
Create urgency (why now?), build guiding coalition (who leads?), form strategic vision (what will it look like?), enlist volunteer army (who helps?), enable action by removing barriers (what's in the way?), generate short-term wins (quick credibility), sustain acceleration (build momentum), institute change (make it stick).

### Step 4: Stakeholder Impact Analysis
Map all affected groups on a power/interest grid. Assess change readiness for each group (1-5). Identify resistance sources and strategies. Plan communications per group. Assess training needs and design learning path.

### Step 5: Adoption Measurement
Define adoption metrics per stakeholder group. Set targets and measurement intervals. Track time-to-adoption and proficiency. Measure NPS/eNPS for change satisfaction. Create feedback loops for course correction.

## Rules
- ADKAR must be assessed per stakeholder group, not organization-wide.
- Kotter steps must be executed in order — skipping steps causes failure.
- Resistance is data, not a problem — understand its root cause.
- Quick wins must be visible within the first 90 days.
- Communication must be two-way, not just broadcast.
- Training must include hands-on practice, not just documentation.
- Adoption metrics must be tracked for at least 6 months post-launch.
- Sponsor must be visibly active throughout the change.

## References
  - references/adkar-model.md — ADKAR Model
  - references/adoption-metrics.md — Adoption Metrics
  - references/change-management-advanced.md — Change Management Advanced Topics
  - references/change-management-fundamentals.md — Change Management Fundamentals
  - references/kotter-8step.md — Kotter 8-Step Change Model
  - references/stakeholder-impact.md — Stakeholder Impact Analysis
## Handoff
For stakeholder communication execution, hand off to `management-stakeholder`. For OKR alignment with change goals, hand off to `management-okr-kpi`. For team-level change impact, hand off to `management-team-topology`.
