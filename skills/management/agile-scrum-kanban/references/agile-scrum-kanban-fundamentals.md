# Agile Scrum Kanban Fundamentals

## Overview
Agile, Scrum, and Kanban are frameworks for delivering value iteratively. This reference covers foundational concepts, roles, ceremonies, artifacts, and when to use each approach.

## Core Concepts

### Concept 1: Agile Manifesto
Four value statements guiding all agile frameworks:
- Individuals and interactions over processes and tools
- Working software over comprehensive documentation
- Customer collaboration over contract negotiation
- Responding to change over following a plan

The 12 Principles behind the Agile Manifesto include: satisfy customer through early delivery, welcome changing requirements, deliver frequently, business and dev work together daily, build around motivated individuals, face-to-face conversation, working software as progress measure, sustainable pace, technical excellence, simplicity, self-organizing teams, and regular reflection.

### Concept 2: Scrum Fundamentals

Scrum is a lightweight framework for complex product delivery:

**Three Pillars (Empiricism)**:
- Transparency: all aspects visible to those responsible
- Inspection: frequent inspection of artifacts and progress
- Adaptation: adjust process when deviations detected

**Five Values**: Commitment, Courage, Focus, Openness, Respect

**Three Roles**:
- Product Owner: maximizes product value, manages backlog, sole decision-maker on priority
- Scrum Master: facilitates process, removes impediments, coaches the team
- Developers: self-organizing, cross-functional, owns sprint delivery

**Five Events**:
- Sprint: timeboxed iteration (1-4 weeks, commonly 2)
- Sprint Planning: what can be delivered and how
- Daily Scrum: 15-min plan for next 24 hours
- Sprint Review: inspect increment and adapt backlog
- Sprint Retrospective: inspect and adapt the process

**Three Artifacts**:
- Product Backlog: ordered list of everything needed
- Sprint Backlog: selected items plus plan for delivery
- Increment: usable product at end of each sprint

### Concept 3: Kanban Fundamentals

Kanban is a flow-based method for managing work:

**Six Practices**:
1. Visualize the workflow (board with columns)
2. Limit Work in Progress (WIP limits)
3. Manage flow (measure and optimize cycle time)
4. Make policies explicit (definition of done per stage)
5. Implement feedback loops (service delivery review, operations review)
6. Improve collaboratively (evolve using data)

**Key Metrics**:
- Cycle Time: time from start to finish
- Lead Time: time from request to delivery
- Throughput: items delivered per time unit
- WIP: work items currently in progress

**WIP Limits**: cap on items in each column. When column is full, no new items enter until something finishes. This reveals bottlenecks and reduces context switching.

### Concept 4: Scrum vs Kanban Decision

```
Decision factor                          | Scrum       | Kanban
-----------------------------------------|-------------|---------------
Delivery cadence                         | Fixed sprint| Continuous
Role requirements                        | 3 roles     | Existing roles
Work item size                           | Sized per sprint | Size varies
Process change tolerance                 | Sprint boundary | Anytime
Predictability need                      | High        | Moderate
Team structure                           | Stable team | Stable or fluid
Incident/ops work                        | Can disrupt | Built-in
```

Use Scrum when: team is stable, work is project-based, predictability is important, sprint boundaries provide useful rhythm.

Use Kanban when: work is unpredictable (support, ops), continuous delivery, team maturity is low (start with board), existing process works but needs visualization.

Use Hybrid (Scrumban) when: sprint-based delivery with ops interruptions, team transitioning from Scrum to Kanban, project has both planned and unplanned work.

### Concept 5: User Stories

Standard format: "As a [role], I want [goal] so that [benefit]."

**INVEST Criteria**:
- Independent: minimal dependencies on other stories
- Negotiable: details emerge through conversation
- Valuable: delivers value to stakeholder or user
- Estimable: team can estimate size
- Small: fits within one sprint
- Testable: clear acceptance criteria

**Epic**: large story that spans multiple sprints, broken down into stories.
**Theme**: collection of related epics or stories.

### Concept 6: Estimation Techniques

| Technique | How It Works | Best For |
|-----------|-------------|----------|
| Planning Poker | Team votes with cards, discuss outliers | New teams, consensus building |
| T-shirt Sizing | S/M/L/XL relative sizing | High-level, early-stage |
| Story Points | Abstract effort unit accounting for complexity, uncertainty | Established teams |
| Ideal Days | Calendar days with no interruptions | External stakeholders |
| Affinity Mapping | Group stories by size simultaneously | Large backlogs |
| #NoEstimates | Historical throughput data replaces estimation | Mature teams with stable flow |

### Concept 7: Definition of Done (DoD)

Shared understanding of what "done" means:
```
[ ] Code written and reviewed
[ ] Tests pass (unit + integration)
[ ] Documentation updated
[ ] Deployed to staging
[ ] Acceptance criteria met
[ ] Product Owner accepts
[ ] No known P0/P1 bugs
```

Team owns DoD. Strengthen over time. Every story meets DoD before counting as complete.

### Concept 8: Definition of Ready (DoR)

Story is ready for sprint when:
```
[ ] Acceptance criteria defined
[ ] Dependencies identified
[ ] Feasibility confirmed (technical)
[ ] Sized/estimated
[ ] Value clear (why this over anything else)
[ ] UX/design complete if needed
```

DoR prevents unfinished work entering sprints. Not all items need DoR — only those pulled into sprint planning.

## Framework Comparison

### Scrum

Strengths: clear roles, prescribed rhythm, built-in inspect/adapt cycles, strong accountability.

Weaknesses: rigid boundaries, overhead of ceremonies, assumes stable team, can feel bureaucratic.

Best for: product development, new teams needing structure, projects with clear goals.

### Kanban

Strengths: flexible, low ceremony, works with existing process, flow visibility, handles interruptions.

Weaknesses: no prescribed roles, less predictability, requires discipline for WIP limits, can lack urgency.

Best for: support/maintenance teams, ops, continuous delivery, unpredictable work.

### Scrumban (Hybrid)

Mix of Scrum ceremonies with Kanban flow. Sprint boundaries with continuous delivery. WIP limits applied within sprint.

Best for: teams transitioning from Scrum to Kanban, product teams with support rotation, mature teams wanting flexibility without losing rhythm.

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Timebox Ceremonies | Strict timeboxes prevent meeting bloat | High |
| Visualize Work | Board must be up-to-date and visible | High |
| Limit WIP | WIP limits reveal bottlenecks | High |
| Refine Backlog | Regular backlog grooming (10% of sprint) | High |
| Retro After Every Sprint | Continuous improvement engine | High |
| Daily Standup | 15 min, no problem-solving | Medium |
| Sprint Goal | Single focus for the sprint | Medium |
| Team First | Stable teams outperform fluid teams | High |

## Common Pitfalls

### Pitfall 1: Scrum But
Doing Scrum "but" changing essential elements. "We do daily standup but skip planning." "We have sprints but scope changes mid-sprint."
Fix: follow framework as-prescribed before customizing. Understand why rules exist.

### Pitfall 2: Waterfall in Sprint
Front-loading analysis, then design, then coding within a sprint. Creates mini-waterfall with late feedback.
Fix: stories should be sliced vertically (end-to-end), not horizontally (by layer).

### Pitfall 3: No WIP Limit Enforcement
WIP limits defined but ignored. Board shows but doesn't control flow.
Fix: enforce WIP limits as hard caps. New work starts only when slot opens. Swarm on blocked items.

### Pitfall 4: Retro Without Change
Same retro format every sprint, same action items, no follow-through. Retro becomes venting session.
Fix: max 3 action items per sprint. Review previous items first. Track closure rate. Rotate retro formats.

### Pitfall 5: Estimation as Commitment
Story points treated as deadlines. Team punished for estimates being wrong.
Fix: estimates are forecasts, not promises. Velocity varies. Use ranges, not single numbers.

### Pitfall 6: Backlog as Dumpster
Product backlog full of unrefined, outdated, duplicate items. No one grooms it.
Fix: regular refinement sessions. Archive items untouched for 3+ sprints. Max backlog size.

## Tooling Ecosystem

### Board Tools
- Jira: full-featured, configurable, enterprise
- Linear: fast, developer-friendly, modern
- Trello: simple, visual, small teams
- GitHub Projects: co-located with code
- Notion: flexible, documentation integrated

### Estimation Tools
- Planning poker apps (Scrum Poker, PlanITPoker)
- Spreadsheet templates for T-shirt sizing
- Velocity tracking in board tool
- Cycle time analytics for Kanban

## Key Points
- Scrum is not the only agile framework — choose based on context
- WIP limits are the most powerful Kanban practice
- Retro is the engine of continuous improvement
- DoD and DoR prevent ambiguity in what's expected
- Estimates are forecasts, not commitments
- Sprint boundaries provide rhythm, not rigidity
- Flow metrics matter more than velocity for improvement
- Stable teams outperform fluid teams
- Ceremonies serve the team, not the other way around
- Inspect and adapt applies to the process itself
