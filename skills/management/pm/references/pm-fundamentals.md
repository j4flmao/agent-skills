# PM Fundamentals

## Overview
Project management (PM) is the application of knowledge, skills, tools, and techniques to project activities to meet requirements. This reference covers fundamental concepts, lifecycle phases, planning techniques, and control processes.

## Core Concepts

### Concept 1: What is a Project?

A temporary endeavor undertaken to create a unique product, service, or result.

**Project characteristics**:
- Temporary: definite start and end
- Unique: not a routine operation
- Progressive elaboration: details emerge over time
- Resource-constrained: budget, time, people limited

**Operations vs Projects**: operations are ongoing and repetitive; projects are temporary and unique. Different management approaches needed.

### Concept 2: The Triple Constraint

Scope + Time + Cost = Quality

Change one, at least one other must adjust:
- Increase scope → more time or cost needed
- Reduce time → reduce scope or increase cost
- Reduce cost → reduce scope or extend time

**Modern view**: add Risk and Resources to make five constraints. All interconnected. Tradeoffs are explicit decisions, not surprises.

### Concept 3: Project Lifecycle

**Predictive (Waterfall)**: requirements defined upfront, phases executed sequentially.
- Ideal for: regulated, well-understood, low-uncertainty projects
- Phases: Initiate → Plan → Execute → Monitor → Close

**Adaptive (Agile)**: requirements evolve, delivered iteratively.
- Ideal for: uncertain, innovative, fast-changing environments
- Phases: multiple iterations with build-measure-learn cycles

**Hybrid**: predictive for stable elements, adaptive for uncertain ones.

### Concept 4: Project Charter

The document that formally authorizes a project. Issued by sponsor.

**Essential elements**:
- Project purpose and business case
- High-level scope and deliverables
- Key milestones and timeline
- Budget summary
- Key stakeholders (sponsor, PM, team)
- Success criteria and acceptance criteria
- Assumptions and constraints

Charter is the project's "birth certificate." No charter = no formal authority to spend resources.

### Concept 5: Work Breakdown Structure (WBS)

Hierarchical decomposition of project work into manageable chunks.

**Rules**:
- 100% Rule: WBS captures 100% of scope
- Each level decomposes parent into child elements
- Lowest level = work package (assignable to team)
- Not a schedule or budget — it's a scope decomposition

**Format**: outline or tree diagram. WBS dictionary defines each element (description, owner, deliverables, acceptance criteria).

### Concept 6: Critical Path Method (CPM)

The longest sequence of dependent tasks that determines minimum project duration.

**Key terms**:
- Early Start / Early Finish: earliest a task can start/finish
- Late Start / Late Finish: latest a task can start/finish without delaying project
- Float (Slack): amount of schedule flexibility (Late Start - Early Start)
- Critical Path: tasks with zero float — any delay = project delay

**Managing critical path**: monitor closely, assign best resources, add contingency, compress schedule if needed.

### Concept 7: Risk Management Basics

**Risk**: uncertain event that, if occurs, affects project objectives.

**Process**: Identify → Assess (Probability × Impact) → Plan Response → Monitor

**Risk register**: ID, Description, Probability, Impact, Score, Response Strategy, Owner, Status.

**Response strategies**: Avoid, Transfer, Mitigate, Accept (for threats); Exploit, Share, Enhance, Accept (for opportunities).

### Concept 8: Earned Value Management (EVM)

Integrates scope, schedule, and cost to measure project performance.

**Key metrics**:
- Planned Value (PV): budgeted cost of work scheduled
- Earned Value (EV): budgeted cost of work performed
- Actual Cost (AC): actual cost of work performed

**Performance indices**:
- Schedule Performance Index (SPI) = EV / PV (> 1.0 = ahead)
- Cost Performance Index (CPI) = EV / AC (> 1.0 = under budget)

**Forecasting**:
- Estimate at Completion (EAC) = BAC / CPI
- Estimate to Complete (ETC) = EAC - AC

### Concept 9: Communication Management

PM spends 80-90% of time communicating.

**Communication plan elements**:
- Stakeholder: who needs information
- Information: what do they need
- Channel: how will they receive it
- Cadence: how often
- Owner: who delivers

**Status reporting**: accomplishments, next priorities, risks, decisions needed, RAG status.

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Define Done | Clear acceptance criteria before work starts | High |
| Baseline Early | Scope, schedule, cost baselines before execution | High |
| Update Regularly | Status reporting has consistent cadence | High |
| Manage Risks Proactively | Risk register reviewed at every status check | High |
| Celebrate Milestones | Recognize completion, maintain momentum | Medium |
| Lessons Learned | Capture what worked and what didn't | High |
| Close Properly | Formal close includes handoff, archive, release | High |

## Common Pitfalls

### Pitfall 1: Scope Creep
Uncontrolled changes to project scope without adjusting time or cost. Project expands beyond original charter.
Fix: formal change control process. Every scope change requires impact assessment and stakeholder approval.

### Pitfall 2: Optimistic Scheduling
Underestimating task durations. Assuming everything goes right. No contingency for delays.
Fix: use three-point estimates (optimistic, likely, pessimistic). Add 15-20% contingency buffer. Use historical data.

### Pitfall 3: Micromanagement
PM tracks every detail, makes all decisions, bypasses team expertise. Team disengagement and turnover.
Fix: define decision levels. Empower team for L1 decisions. PM focuses on L2/L3 decisions and removing blockers.

### Pitfall 4: Communication Gaps
Stakeholders not informed of changes, delays, or issues. Surprises erode trust. Escalations become emergencies.
Fix: communication plan with defined cadence and channels. Bad news early. No surprises in status meetings.

### Pitfall 5: Ignoring Lessons Learned
Lessons captured at project end, filed away, never used. Same mistakes repeated on next project.
Fix: capture lessons at every phase transition. Share across organization. Action items with owners.

## Tooling Ecosystem

### Planning Tools
- Microsoft Project: full-featured scheduling
- Jira: agile project management
- Asana / Monday: team task management
- Smartsheet: spreadsheet-based PM
- Notion: flexible project wiki

### Diagram Tools
- Lucidchart: WBS, network diagrams
- Miro: collaborative planning boards
- Draw.io: free diagramming

## Key Points
- Charter authorizes the project — never start without it
- Triple constraint: scope, time, cost are interconnected
- WBS decomposes scope into manageable work packages
- Critical path determines project duration — protect it
- EVM integrates scope, schedule, and cost measurement
- Risk register is a living document — update monthly
- Communication is 80-90% of PM work — plan it
- Formal change control prevents scope creep
- Lessons learned captured and shared prevent repeated mistakes
- Close includes handoff, archive, release, and celebration
