---
name: agile-scrum
description: >
  Use this skill when the user says 'set up scrum', 'sprint planning', 'sprint goal', 'daily scrum', 'sprint review', 'definition of done', 'story points', 'scrum events', 'scrum roles', 'sprint length'. It sets up and runs Scrum per the 2020 Scrum Guide (accountabilities, events with time-boxes, artifacts and commitments) plus common complementary practices (estimation, capacity planning). Do NOT use for: Scrum vs Kanban selection, flow metrics and WIP limits (use agile-scrum-kanban), running a retrospective in depth (use sprint-retro), OKRs (use okr-kpi).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [management, agile, scrum, sprint, estimation]
---

# Agile Scrum

## Purpose
Run Scrum as defined by the 2020 Scrum Guide — a lightweight framework of 3 accountabilities, 5 events and 3 artifacts — and add only the complementary practices the team needs (estimation, capacity, refinement). Distinguish what Scrum requires from what is optional convention.

## Agent Protocol

### Trigger
"scrum", "sprint planning", "sprint goal", "daily scrum", "standup", "sprint review", "definition of done", "story points", "velocity", "sprint length", "product owner", "scrum master".

### Input Context
- Team size, product, current cadence and pain points.
- Who acts as Product Owner; stakeholder availability.
- Existing tooling (Jira, Linear, Azure Boards).

### Output Artifact
Scrum setup (calendar, DoD, backlog conventions) or a facilitation plan for one event.

### Response Format
```
Sprint length: {1-4 weeks}
Events: {event: day/time, time-box}
Sprint Goal (template): {objective + why}
Definition of Done: {checklist}
Estimation: {story points|counts|none} -> forecast method
```

## Scrum Guide 2020 — What Is Required

| Element | Facts |
|---------|-------|
| Scrum Team | One Product Owner, one Scrum Master, Developers; typically 10 or fewer people |
| Product Owner | Accountable for maximizing value; orders the Product Backlog; one person, not a committee |
| Scrum Master | Accountable for Scrum's effectiveness; coaches team and organization |
| Developers | Create the Increment; own the Sprint Backlog |
| Sprint | Fixed length, one month or less; contains all other events |

| Event | Time-box (for a one-month Sprint; usually shorter for shorter Sprints) |
|-------|----------------------|
| Sprint Planning | Max 8 hours — answers Why (Sprint Goal), What (selected items), How (plan) |
| Daily Scrum | 15 minutes, for Developers; inspect progress toward the Sprint Goal |
| Sprint Review | Max 4 hours — inspect outcome with stakeholders, adapt backlog |
| Sprint Retrospective | Max 3 hours — improve quality and effectiveness |

| Artifact | Commitment |
|----------|-----------|
| Product Backlog | Product Goal |
| Sprint Backlog | Sprint Goal |
| Increment | Definition of Done |

Backlog refinement is an ongoing activity, not a formal event. Story points, velocity, user stories, burndown charts and the "three questions" stand-up are optional complementary practices — not part of Scrum.

## Choosing Sprint Length

| Situation | Length |
|-----------|--------|
| High uncertainty, fast feedback needed | 1 week |
| Default for most product teams | 2 weeks |
| Heavy integration/hardware, stable domain | 3–4 weeks |
Keep it constant; changing length every sprint breaks forecasting.

## Sprint Planning Recipe (2-week sprint, ~2–4 h)
1. PO proposes how the product could increase value; team crafts the Sprint Goal (one sentence, outcome-oriented).
2. Developers pull ordered items that serve the goal, sized against capacity.
3. Developers decompose the first days of work into tasks (≤1 day each).
4. Confirm the goal is achievable without heroics; leave ~10–20% slack for unplanned work.

Sprint Goal example: "Returning customers can reorder a past purchase in two clicks, so we can measure repeat-purchase lift."

## Estimation & Forecasting
- Relative sizing with a modified Fibonacci scale (1, 2, 3, 5, 8, 13); split anything ≥13.
- Velocity is a team-internal forecasting tool — never compare teams or use it as a performance target.
- Forecast with a range: use the last 3–6 sprints (min–max or average ± variation), not a single number.
- Alternative: count items (after splitting to similar size) or Monte Carlo on throughput.

Capacity:
```
capacity = sum(person_days_available) * focus_factor
# person_days excludes PTO, holidays, on-call; focus_factor often 0.6–0.8, calibrate from history
```

## Definition of Done (starter)
- [ ] Code reviewed and merged to main
- [ ] Automated tests written and passing in CI
- [ ] Acceptance criteria verified
- [ ] Docs/changelog updated where user-visible
- [ ] Deployed to staging (or production behind a flag)
- [ ] No new high-severity security findings
Work that does not meet the DoD returns to the Product Backlog; it is not shown as done at the Review.

## Daily Scrum
Focus on the Sprint Goal and the board (walk the board right-to-left: closest-to-done first). Detailed problem solving happens after, with only the needed people.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Sprint Goal = list of tickets | One outcome sentence; items serve it |
| Status-report stand-up to a manager | Developers plan their next 24h toward the goal |
| Velocity as a KPI | Use outcomes; velocity only for forecasting |
| Carry-over every sprint | Plan to historic throughput, split stories smaller |
| PO absent until Review | PO available daily for questions |
| Skipping retros when busy | Retro is where the process gets fixed |

## Checklist
- [ ] Accountabilities named (PO, SM, Developers)
- [ ] Sprint length fixed; calendar with time-boxes
- [ ] Product Goal stated; backlog ordered
- [ ] DoD written and visible
- [ ] Sprint Goal set every planning

## References
- `skills/management/agile-scrum-kanban/SKILL.md` — framework selection, Kanban flow metrics
- `skills/management/sprint-retro/SKILL.md` — retrospective formats and facilitation
