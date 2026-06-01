# Agile Scrum Kanban Advanced Topics

## Introduction
Advanced Agile, Scrum, and Kanban topics cover scaling frameworks, flow optimization, evidence-based management, technical practices, and organizational transformation. This reference builds on fundamentals for experienced practitioners.

## Scaling Frameworks

### SAFe (Scaled Agile Framework)

SAFe provides structured guidance for enterprises with 50-500+ people.

**Configuration levels**:
- Essential SAFe: team + program level (ART: Agile Release Train)
- Large Solution SAFe: adds solution level for complex systems
- Portfolio SAFe: adds strategic investment and lean governance
- Full SAFe: all levels

**Key constructs**:
- ART (Agile Release Train): 5-12 teams, 50-125 people, aligned to a value stream
- PI Planning (Program Increment): 2-day planning event every 8-12 weeks
- System Demo: integrated demo from all ART teams every 2 weeks
- Inspect and Adapt: PI-level retrospective with problem-solving workshop

**Strengths**: comprehensive, role definitions, enterprise alignment, large organization track record.
**Weaknesses**: heavy ceremony, expensive certification, can feel bureaucratic, top-down implementation risk.
**Best for**: large regulated enterprises, organizations with existing PMO structures, 100+ person product groups.

### LeSS (Large-Scale Scrum)

LeSS applies Scrum principles to multiple teams working on one product.

**Two configurations**:
- LeSS: 2-8 teams (up to 50 people)
- LeSS Huge: 8+ teams organized by customer area

**Key differences from Scrum**:
- One Product Backlog for all teams
- One Product Owner for all teams
- One Sprint for all teams (same cadence)
- Sprint Planning Part 1 (all teams) + Part 2 (per team)
- Overall Retrospective for cross-team improvement
- End-to-end feature teams (not component teams)

**Strengths**: true to Scrum principles, empirical process, focus on simplicity, emphasizes systems thinking.
**Weaknesses**: requires high team maturity, limited guidance for non-product contexts, harder organizational change.
**Best for**: mature Scrum organizations scaling beyond single team, products where teams can own features end-to-end.

### Scrum of Scrums

Lightweight coordination for 3-5 Scrum teams.

**Format**: representatives from each team meet 2-3 times per week.
- What did your team do since last meeting?
- What will your team do before next meeting?
- Any blockers or dependencies needing cross-team resolution?

**Strengths**: minimal overhead, works with existing Scrum, flexible.
**Weaknesses**: doesn't solve systemic scaling challenges, information loss through representatives.

### Framework Selection Decision Tree

```
How many teams?
├── 1 team → Standard Scrum or Kanban
├── 2-8 teams
│   ├── Same product, one backlog → LeSS
│   ├── Different products, coordinated → Scrum of Scrums
│   └── High regulation or 100+ people → SAFe Essential
├── 8-12 teams
│   ├── Same product, feature teams → LeSS Huge
│   ├── Multiple products, aligned → SAFe with multiple ARTs
│   └── Low ceremony preferred → Nexus (Scrum.org)
└── 12+ teams
    ├── Enterprise with PMO → SAFe Full or Large Solution
    └── Multiple independent products → Per-product frameworks with coordination
```

## Flow Metrics and Analytics

### Core Flow Metrics

| Metric | Definition | Target | Leading Indicator |
|--------|-----------|--------|-------------------|
| Cycle Time | Time work item is actively worked | < 3 days | WIP age distribution |
| Lead Time | Request to delivery | < 10 days | Queue size before start |
| Throughput | Items delivered per week | Stable or improving | WIP level |
| WIP | Items in progress | < team size × 2 | Blocked item count |
| Flow Efficiency | Active time / total time | > 50% | Wait time % |

### Little's Law

**Formula**: `Throughput = WIP / Cycle Time`

Practical implications:
- Reducing WIP is the fastest way to reduce cycle time
- Increasing throughput requires either increasing WIP or reducing cycle time
- If cycle time is too high, reduce WIP (don't push team to go faster)

### Aging Charts

Track how long each work item has been in its current state:
```
Items in "In Progress" column:
┌─────────┬──────────────┬──────────┐
│ Item    │ Age (days)   │ Status   │
├─────────┼──────────────┼──────────┤
│ F-123   │ 12           │ ⚠️ Stale │
│ F-124   │ 5            │ Active   │
│ F-125   │ 2            │ Active   │
│ F-126   │ 1            │ Active   │
└─────────┴──────────────┴──────────┘
```
Stale items (> 2x average cycle time) need attention: swarm, split, or kill.

### Cumulative Flow Diagram (CFD)

Visualizes all work states over time. Key patterns:
- Widening bands = increasing WIP (bottleneck forming)
- Horizontal bands = no throughput (blocked)
- Parallel bands = stable flow
- Narrow bands at end = constrained process step

## Estimation and Forecasting

### Evidence-Based Management (EBM)

Replace estimation with data-driven forecasting:

1. Track historical cycle time for different work types
2. Use Monte Carlo simulation to forecast delivery dates
3. Update forecast as new data arrives
4. Report completion probability ranges, not single dates

```
Example forecast:
"We have 85% confidence of delivering by April 15,
95% confidence by May 1, and 99% confidence by May 15."
```

### Monte Carlo Simulation for Delivery Forecasting

1. Collect last 20-50 cycle times for similar work
2. Randomly sample with replacement, sum until backlog empty
3. Repeat 10,000 times
4. Plot distribution of completion dates

Tools: Actionable Agile, TargetProcess, custom scripts.

### Cycle Time Scatterplot

Plot cycle time of each completed item over time:
- Horizontal line: median cycle time
- Upper percentile line: 85th or 95th percentile
- Identify outliers and investigate root cause
- Trend line reveals if process is improving

## Ceremony Effectiveness Optimization

### Sprint Planning Anti-Patterns
- **Planning as Estimation**: spending 90% of planning time estimating, 10% agreeing on scope
- **No Capacity Check**: committing without accounting for PTO, support, ceremonies
- **Everything is P1**: backlog items lack real priority differentiation
- **Waterfall Planning**: front-loading analysis across entire sprint

### Daily Standup Anti-Patterns
- **Status to Manager**: standup becomes report to PM, not team coordination
- **Problem-Solving Trap**: 15 minutes becomes 45 minutes debating one issue
- **Show-and-Tell**: reading tickets aloud instead of meaningful coordination
- **Too Large**: 12+ people in standup — break into smaller teams

### Retrospective Anti-Patterns
- **Same Format Every Sprint**: participants go through motions
- **No Actionable Outcomes**: discussion without commitments
- **Action Item Overload**: 10+ action items, none completed
- **Blamestorming**: retro becomes finger-pointing session

## Technical Practices for Agile Teams

### Continuous Integration
- Merge to main multiple times per day
- Automated build + test runs on every commit
- Broken build fixed within 10 minutes or revert
- Feature flags for incomplete work

### Test Automation Pyramid
```
     /\
    /E2E\        Few: critical user journeys
   /------\
  /Integration\  Some: service/API tests
 /--------------\
/ Unit / Component \  Many: fast, reliable, isolated
```

### Trunk-Based Development
- Short-lived feature branches (< 2 days)
- Main always deployable
- Feature flags instead of long-running branches
- Pair programming for complex changes

## Organizational Change Patterns

### Agile Transformation Anti-Patterns
- **Big Bang**: flip entire organization to agile overnight
- **Agile in Name Only**: daily standups without process change
- **Framework Dogma**: forcing SAFe/Scrum without adapting to context
- **Management Bypass**: executives not changing their behavior
- **Team Reorganization Churn**: restructuring teams every quarter

### Successful Transformation Patterns
- **Pilot Team**: prove value with one team first (3-6 months)
- **Executive Sponsorship**: active, visible support from leadership
- **Bottom-Up Energy**: empower teams to drive change
- **Systems Thinking**: address organizational impediments, not just team process
- **Metrics Over Opinion**: use flow data to demonstrate improvement
- **Patience**: genuine transformation takes 18-36 months

## Key Points
- Choose scaling framework based on team count, product structure, and regulation level
- Flow metrics (cycle time, throughput, WIP) reveal process health better than velocity
- Monte Carlo forecasting replaces estimation with data-driven probability
- Ceremony effectiveness depends on avoiding anti-patterns more than following templates
- Technical practices (CI, trunk-based, test automation) enable agile, they don't follow from it
- Agile transformation is organizational change, not process adoption — requires 18-36 months
- Evidence-based management moves teams from opinion-driven to data-driven decisions
- Inspect and adapt applies at every level: team, program, portfolio
